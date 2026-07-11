"""
Rebalancer Agent — Portfolio maintenance using Claude Sonnet.

Responsabilidades:
- Lê relatórios do Scout para obter mudanças recomendadas
- Verifica drift (>5% do peso alvo dispara rebalanceamento)
- Aplica overrides de risco (buffer de stablecoin baseado em sentiment)
- Ejeta tokens com perda >40% em 7 dias (emergency override)
- Gera propostas de rebalanceamento para revisão do founder
- Executa ordens REAIS no SoDEX via API (EIP-712)
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from loguru import logger
from services.llm import generate

from database import SessionLocal
from models import AlphaIndex, IndexConstituent, AgentActivityLog, ScoutReport, RebalanceProposal
from services.sosovalue import get_macro_context, get_stablecoin_buffer_from_sentiment
from services.sodex import (
    get_all_tickers,
    get_portfolio_snapshot,
    execute_rebalance_trades,
)


DRIFT_THRESHOLD = 5.0        # % deviation from target weight that triggers rebalance
EJECTION_THRESHOLD = -40.0   # % 7-day loss that triggers emergency ejection
MAX_SINGLE_WEIGHT = 25.0     # no single token > 25%
DRIFT_COOLDOWN_HOURS = 48    # horas de cooldown após execução antes de novo drift trigger


async def check_and_propose_rebalances():
    """Main entry — check all active indexes for rebalance needs."""
    db = SessionLocal()
    try:
        macro = await get_macro_context()
        sentiment_score = macro["sosovalue_sentiment_score"]
        target_buffer = get_stablecoin_buffer_from_sentiment(sentiment_score)

        indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
        for idx in indexes:
            await _process_index(idx, sentiment_score, target_buffer, db)
    finally:
        db.close()


async def _process_index(idx: AlphaIndex, sentiment_score: float, target_buffer: float, db):
    """Evaluate a single index for rebalance needs."""
    logger.info(f"Rebalancer: evaluating index={idx.id}")

    # Não processa índices sem AUM — evita alterar cestas sem investidores ativos
    if not (idx.aum_usd or 0) > 0:
        logger.info(f"Rebalancer: skipping {idx.id} — AUM=$0 (sem investidores ativos)")
        return

    # CRÍTICO: apenas tokens DA CESTA ATIVA em mainnet.
    # Candidatos (in_basket=False) e tokens testnet NÃO entram na análise.
    constituents = db.query(IndexConstituent).filter(
        IndexConstituent.index_id == idx.id,
        IndexConstituent.in_basket == True,
        IndexConstituent.network_mode == "mainnet",
    ).all()

    if not constituents:
        logger.warning(f"Rebalancer: no basket constituents for {idx.id} mainnet")
        return

    # Refresh prices via SoDEX tickers
    try:
        _tickers = await get_all_tickers()
        for c in constituents:
            if c.is_stablecoin:
                continue
            sym = c.symbol
            for key in (f"{sym}-USD", f"{sym}-USDC", f"v{sym}-USDC", f"v{sym}-vUSDC"):
                _t = _tickers.get(key)
                if _t:
                    _p = float(_t.get("lastPrice", _t.get("c", 0)) or 0)
                    if _p > 0:
                        c.current_price_usd = _p
                        c.volume_24h_usd = float(_t.get("volume24h", _t.get("v", 0)) or 0)
                    break
        db.flush()
    except Exception as _e:
        logger.warning(f"Rebalancer: erro ao refreshar preços: {_e}")

    # Busca status HALT/TRADING do SoDEX mainnet para informar o LLM
    halt_tokens: set = set()
    try:
        from services.sodex import get_markets
        markets = await get_markets(testnet=False)
        for m in markets:
            status = m.get("status", m.get("tradingStatus", "")).upper()
            if status == "HALT":
                base = m.get("baseCoin", m.get("displayName", "")).replace("v", "").replace("V", "").split("/")[0]
                halt_tokens.add(base.upper())
        logger.debug(f"Rebalancer: HALT tokens mainnet = {halt_tokens}")
    except Exception as _e:
        logger.warning(f"Rebalancer: não foi possível verificar status HALT: {_e}")

    # Check risk overrides
    emergencies = _check_emergency_ejections(constituents)

    # Check drift (usando pesos-alvo reais, não peso igual)
    drift_violations = _check_drift(constituents, target_buffer)

    # Get latest scout report
    latest_scout = db.query(ScoutReport).filter(
        ScoutReport.index_id == idx.id
    ).order_by(ScoutReport.run_at.desc()).first()

    scout_changes = {
        "inclusions": latest_scout.inclusions if latest_scout else [],
        "exclusions": latest_scout.exclusions if latest_scout else [],
        "weight_changes": latest_scout.weight_changes if latest_scout else [],
    }

    # Whitelist de tokens permitidos para adição: somente o que o Scout validou via on_sodex=True
    # O Scout já verificou contra get_all_tickers() — é a fonte confiável, não get_markets()
    # (get_markets() usa campo "baseCoin" que tem prefixo "V" diferente dos símbolos candidatos)
    scout_validated_additions = {
        inc["symbol"].upper()
        for inc in scout_changes.get("inclusions", [])
        if inc.get("symbol")
    }

    # Determine if rebalance is needed
    trigger = None
    if emergencies:
        trigger = "risk_override"
    elif drift_violations:
        trigger = "drift"
    elif _is_weekly_rebalance_due(idx):
        trigger = "weekly"

    if not trigger:
        _log_no_action(idx.id, db)
        return

    # Skip if there is already a pending proposal for this index (except emergencies)
    if trigger != 'risk_override':
        existing = db.query(RebalanceProposal).filter(
            RebalanceProposal.index_id == idx.id,
            RebalanceProposal.status == 'pending',
        ).first()
        if existing:
            logger.info(f'Rebalancer: skipping {idx.id} — pending proposal #{existing.id} already exists')
            return

    # Cooldown de drift: não gerar nova proposta por drift dentro de DRIFT_COOLDOWN_HOURS
    # após a última execução. Evita re-trigger imediato quando um token se valoriza após rebalance.
    # risk_override e weekly ignoram o cooldown.
    if trigger == 'drift' and idx.last_rebalanced_at:
        hours_since = (datetime.utcnow() - idx.last_rebalanced_at).total_seconds() / 3600
        if hours_since < DRIFT_COOLDOWN_HOURS:
            logger.info(
                f"Rebalancer [{idx.id}]: drift ignorado — cooldown ativo "
                f"({hours_since:.1f}h desde último rebalance, mínimo {DRIFT_COOLDOWN_HOURS}h)"
            )
            _log_no_action(idx.id, db)
            return

    # Para trigger de DRIFT: ajustar pesos somente, nunca substituir tokens.
    # Exclusões do Scout são ignoradas — drift = preço saiu do peso-alvo,
    # não significa que o token deva ser removido.
    # Inclusions também são ignoradas — nova entrada só via weekly ou risk_override.
    if trigger == "drift":
        basket_syms = {c.symbol for c in constituents}
        scout_exclusions = scout_changes.get("exclusions", [])
        basket_exclusions = [e for e in scout_exclusions if e.get("symbol") in basket_syms]

        # Se Scout quer excluir tokens da cesta em um drift trigger, há contradição:
        # drift ajusta pesos, não remove tokens. Bloqueia.
        if basket_exclusions:
            logger.warning(
                f"Rebalancer [{idx.id}]: drift trigger bloqueado — Scout recomenda excluir "
                f"{[e['symbol'] for e in basket_exclusions]} mas drift só ajusta pesos, "
                "não substitui tokens. Ignorando exclusões do Scout para drift."
            )

        # Drift usa somente weight_changes do Scout; exclusions e inclusions são zeradas.
        scout_changes = {
            "inclusions": [],
            "exclusions": [],
            "weight_changes": scout_changes.get("weight_changes", []),
        }

        # Sem dados de peso do Scout e sem violações reais de drift: nada a fazer.
        if not scout_changes["weight_changes"] and not drift_violations:
            _log_no_action(idx.id, db)
            return

    # Generate rebalance proposal using LLM
    proposal_changes = await _generate_proposal(
        idx=idx,
        constituents=constituents,
        trigger=trigger,
        emergencies=emergencies,
        scout_changes=scout_changes,
        target_buffer=target_buffer,
        sentiment_score=sentiment_score,
        scout_validated_additions=scout_validated_additions,
        halt_tokens=halt_tokens,
        db=db,
    )

    if proposal_changes:
        _save_proposal(idx.id, trigger, proposal_changes, db, network_mode="mainnet")


def _check_emergency_ejections(constituents: List[IndexConstituent]) -> List[Dict]:
    """Find tokens that lost >40% in 7 days — immediate ejection required."""
    ejections = []
    for c in constituents:
        if not c.is_stablecoin and c.price_change_7d <= EJECTION_THRESHOLD:
            ejections.append({
                "symbol": c.symbol,
                "reason": f"Emergency ejection: {c.price_change_7d:.1f}% loss in 7 days (threshold: {EJECTION_THRESHOLD}%)",
                "old_weight": c.weight,
                "new_weight": 0,
                "action": "eject",
            })
            logger.warning(f"EMERGENCY EJECTION queued: {c.symbol} ({c.price_change_7d:.1f}% 7d)")
    return ejections


def _check_drift(constituents: List[IndexConstituent], target_buffer: float) -> List[Dict]:
    """
    Verifica se algum token drifou do seu peso-ALVO real (c.weight).

    Estima o peso de mercado atual a partir de variações de preço 7d:
      valor_estimado_i = peso_alvo_i * (1 + price_change_7d_i / 100)
      peso_atual_i = valor_estimado_i / total * (100 - buffer)

    O drift é comparado contra o peso-alvo de CADA token (não peso igual).
    """
    non_stable = [c for c in constituents if not c.is_stablecoin]
    if not non_stable:
        return []

    # Peso estimado de mercado baseado em variação de preço 7d
    est_values = {
        c.symbol: c.weight * (1 + (c.price_change_7d or 0) / 100)
        for c in non_stable
    }
    total_est = sum(est_values.values()) or 1.0
    usable = 100.0 - target_buffer

    violations = []
    for c in non_stable:
        est_current = est_values[c.symbol] / total_est * usable
        drift = abs(est_current - c.weight)
        if drift > DRIFT_THRESHOLD:
            violations.append({
                "symbol":         c.symbol,
                "current_weight": round(est_current, 1),
                "target_weight":  round(c.weight, 1),
                "drift":          round(drift, 1),
            })
    return violations


def _is_weekly_rebalance_due(idx: AlphaIndex) -> bool:
    """Check if more than 7 days since last rebalance."""
    if not idx.last_rebalanced_at:
        return True
    return (datetime.utcnow() - idx.last_rebalanced_at) >= timedelta(days=7)


async def _generate_proposal(
    idx, constituents, trigger, emergencies, scout_changes, target_buffer, sentiment_score,
    scout_validated_additions: set, halt_tokens: set, db
) -> Optional[List[Dict]]:
    """Use LLM to generate the rebalancing proposal with full rationale."""

    # Apenas tokens da cesta ativa (in_basket=True) são incluídos no estado atual
    basket = [c for c in constituents if getattr(c, "in_basket", True)]
    current_state = "\n".join([
        f"- {c.symbol}: TARGET={c.weight:.1f}%, "
        f"price ${c.current_price_usd:.4f}, "
        f"7d {c.price_change_7d:+.1f}%, "
        f"SoDEX={'HALT ⚠️' if c.symbol.upper().lstrip('V') in halt_tokens else 'TRADING'}"
        for c in basket
    ])

    halt_warning = ""
    if halt_tokens:
        halt_warning = f"\nHALT TOKENS ON SoDEX MAINNET (cannot trade): {', '.join(sorted(halt_tokens))}\nDo NOT propose increase/add for HALT tokens — orders will be rejected by the exchange.\n"

    scout_summary = json.dumps(scout_changes, indent=2)
    emergency_summary = json.dumps(emergencies, indent=2) if emergencies else "None"

    # Tokens permitidos para adição: somente o que o Scout validou no SoDEX via on_sodex=True
    # Exclui tokens já na cesta e WSOSO (governance token)
    current_symbols = {c.symbol.upper() for c in constituents}
    allowed_additions = sorted(scout_validated_additions - current_symbols - {"WSOSO"})
    allowed_additions_str = ", ".join(allowed_additions) if allowed_additions else "none — keep existing basket unchanged"

    prompt = f"""You are the Rebalancer agent for SoSoMon, managing the "{idx.name}" index.

TRIGGER: {trigger.upper()}

CURRENT BASKET STATE (only these {len(basket)} tokens exist in the basket — do NOT reference any other token):
{current_state}
{halt_warning}
EMERGENCY EJECTIONS (execute immediately):
{emergency_summary}

SCOUT AGENT RECOMMENDATIONS (from last daily screening):
{scout_summary}

ALLOWED TOKENS FOR ADDITION (HARD RULE — you may ONLY add symbols from this list):
{allowed_additions_str}
DO NOT invent token symbols. DO NOT use any symbol not in the basket or in the allowed list above.

CONSTRAINTS:
- The TARGET weight shown for each token is its designed allocation — DO NOT change weights without a specific reason (drift, emergency, or Scout recommendation).
- DRIFT ONLY adjusts tokens that have actually drifted. If a token is near its target weight, set action="maintain" and keep old_weight == new_weight.
- ANCHOR TOKENS (NEVER remove, never reduce below their target): MAG7ssi, DEFIssi, USSIssi, WSOSO. These are the thematic pillars. Removing them would destroy the index thesis.
- Target stablecoin buffer: {target_buffer:.0f}% (sentiment {sentiment_score}/100)
- Max single token weight: {MAX_SINGLE_WEIGHT}%
- HARD LIMIT: basket must have EXACTLY {idx.target_constituents} non-stablecoin tokens after rebalance.
- CRITICAL: new_weight of all non-remove tokens must sum to exactly 100.0%.
- CONSERVATIVE: ONLY remove a token if it is in EMERGENCY EJECTIONS or Scout explicitly recommended removal. Do NOT restructure the basket without cause.
- STABLE CORE: prefer small weight adjustments over full replacements.
- HALT tokens listed above CANNOT be traded — do NOT propose add/increase for them.
- If ALLOWED TOKENS FOR ADDITION is "none", do NOT add any new token. Maintain the existing basket exactly.

Generate a rebalancing proposal. Respond ONLY with valid JSON:
{{
  "changes": [
    {{
      "symbol": "TOKEN",
      "action": "add|remove|increase|decrease|maintain",
      "old_weight": 0.0,
      "new_weight": 0.0,
      "rationale": "one sentence"
    }}
  ],
  "summary": "2-3 sentence summary of this rebalance",
  "risk_notes": "any risk considerations"
}}"""

    try:
        content = await generate(prompt, max_tokens=1024, temperature=0.0)
        # Extract JSON from model output
        start = content.find("{")
        end = content.rfind("}") + 1
        parsed = json.loads(content[start:end])

        # Log activity
        activity = AgentActivityLog(
            id=str(uuid.uuid4()),
            index_id=idx.id,
            agent="rebalancer",
            action="rebalance",
            description=parsed.get("summary", "Rebalance proposal generated."),
            timestamp=datetime.utcnow(),
            data={"trigger": trigger, "changes_count": len(parsed.get("changes", []))},
        )
        db.add(activity)
        db.commit()

        changes = parsed.get("changes", [])

        # Valida: tokens em "add" devem ter sido validados pelo Scout via SoDEX
        # Se Scout não recomendou nenhuma inclusão, nenhum "add" é permitido
        invalid_adds = [
            c["symbol"] for c in changes
            if c.get("action") == "add"
            and c["symbol"].upper() not in scout_validated_additions
        ]
        if invalid_adds:
            logger.warning(
                f"Rebalancer [{idx.id}]: proposta adiciona tokens não validados pelo Scout: "
                f"{invalid_adds} — descartando proposta"
            )
            return None

        # Rejeita WSOSO como constituinte — é o token do SoDEX
        changes = [c for c in changes if not (c.get("action") in ("add", "maintain") and c.get("symbol") == "WSOSO")]

        # Garante que o número de tokens adicionados não ultrapassa target_constituents
        adds = [c for c in changes if c.get("action") in ("add", "maintain", "increase", "decrease")]
        if len(adds) > idx.target_constituents:
            logger.warning(
                f"Rebalancer [{idx.id}]: {len(adds)} tokens propostos, target={idx.target_constituents} — truncando"
            )
            keep_symbols = {c["symbol"] for c in sorted(adds, key=lambda x: x.get("new_weight", 0), reverse=True)[:idx.target_constituents]}
            changes = [c for c in changes if c.get("action") == "remove" or c.get("symbol") in keep_symbols]

        # Rejeita proposta se há menos tokens ativos que o target
        active_check = [c for c in changes if c.get("action") != "remove"]
        if len(active_check) < idx.target_constituents:
            logger.warning(
                f"Rebalancer [{idx.id}]: apenas {len(active_check)} tokens ativos, target={idx.target_constituents} — rejeitando proposta"
            )
            return None

        # Validação: pesos de tokens não-removidos devem somar 100%. Normaliza se necessário.
        active = [c for c in changes if c.get("action") != "remove"]
        total = sum(c.get("new_weight", 0) for c in active)
        if total > 0 and abs(total - 100.0) > 0.5:
            logger.warning(
                f"Rebalancer [{idx.id}]: pesos somam {total:.2f}% — normalizando para 100%"
            )
            for c in active:
                c["new_weight"] = round(c.get("new_weight", 0) * 100.0 / total, 2)
            total2 = sum(c.get("new_weight", 0) for c in active)
            if active and abs(total2 - 100.0) > 0.01:
                biggest = max(active, key=lambda x: x.get("new_weight", 0))
                biggest["new_weight"] = round(biggest["new_weight"] + (100.0 - total2), 2)

        return changes

    except Exception as e:
        logger.error(f"Rebalancer Claude call failed: {e}")
        return None


def _save_proposal(index_id: str, trigger: str, changes: List[Dict], db, network_mode: str = "mainnet"):
    """Save rebalance proposal to DB for founder review."""
    proposal = RebalanceProposal(
        index_id=index_id,
        proposed_at=datetime.utcnow(),
        status="pending",
        trigger=trigger,
        changes=changes,
        ai_rationale=f"Proposed by Rebalancer agent. Trigger: {trigger}. {len(changes)} changes.",
        network_mode=network_mode,
    )
    db.add(proposal)
    db.commit()
    logger.success(f"Rebalancer: proposal saved for index={index_id}, trigger={trigger}, changes={len(changes)}")


def _log_no_action(index_id: str, db):
    """Log that no rebalance was needed."""
    activity = AgentActivityLog(
        id=str(uuid.uuid4()),
        index_id=index_id,
        agent="rebalancer",
        action="no_action",
        description="Drift check complete. All positions within 5% threshold. No rebalance needed.",
        timestamp=datetime.utcnow(),
    )
    db.add(activity)
    db.commit()


async def apply_proposal(proposal_id: int, db, dry_run: bool = False):
    """
    Executa proposta aprovada de rebalanceamento via SoDEX API.
    Chamado pelo founder após revisar e aprovar a proposta no admin UI.

    Args:
        proposal_id: ID da proposta no banco
        dry_run: True = simula sem executar ordens reais no SoDEX
    """
    proposal = db.query(RebalanceProposal).filter(
        RebalanceProposal.id == proposal_id,
        RebalanceProposal.status == "approved",
    ).first()

    if not proposal:
        raise ValueError(f"Proposal {proposal_id} not found or not approved")

    try:
        # Determina a rede da proposta (move para cima para usar em todas as chamadas SoDEX)
        network_mode = proposal.network_mode or "mainnet"
        _use_testnet = (network_mode == "testnet")

        # 1. Snapshot atual do portfolio no SoDEX (gateway correto por rede)
        snapshot = await get_portfolio_snapshot(testnet=_use_testnet)
        logger.info(
            f"Rebalancer: portfolio snapshot — "
            f"total ${snapshot['total_usd']:,.2f} | "
            f"{len(snapshot['positions'])} posições | "
            f"rede: {snapshot['network']}"
        )

        # 2. Monta mapa de pesos alvo a partir das mudanças aprovadas
        target_weights = {
            c["symbol"]: c["new_weight"]
            for c in proposal.changes
            if c.get("action") != "remove"
        }

        # 3. Executa ordens reais no SoDEX (ou simula se dry_run=True)
        executed_orders = await execute_rebalance_trades(
            target_weights=target_weights,
            dry_run=dry_run,
            testnet=_use_testnet,
        )

        logger.info(f"Rebalancer: {len(executed_orders)} ordens {'simuladas' if dry_run else 'executadas'} no SoDEX")

        # Salva as ordens executadas (com order IDs) no banco como evidência
        proposal.execution_orders = executed_orders

        # 4. Busca preços ao vivo para inicializar price_at_nav_ref de novos tokens
        live_tickers = await get_all_tickers()

        # 5. Atualiza constituents no banco
        for change in proposal.changes:
            # Filtra por network_mode para evitar atualizar a rede errada
            constituent = db.query(IndexConstituent).filter(
                IndexConstituent.index_id == proposal.index_id,
                IndexConstituent.symbol == change["symbol"],
                IndexConstituent.network_mode == network_mode,
            ).first()

            if change["action"] == "remove":
                if constituent:
                    # Marca como fora da cesta (mantém histórico de preços)
                    constituent.weight = 0.0
                    constituent.in_basket = False

            else:
                # Entrada ou reweight
                if constituent:
                    # Token já existe (cesta ou candidato) — atualiza peso e promove para cesta
                    constituent.weight = change["new_weight"]
                    constituent.in_basket = True
                else:
                    # Token novo — cria constituinte no banco
                    ticker = live_tickers.get(change["symbol"]) or live_tickers.get(change["symbol"] + "-USDC")
                    live_price = 0.0
                    if ticker:
                        try:
                            live_price = float(ticker.get("lastPrice") or 0)
                        except Exception:
                            live_price = 0.0

                    constituent = IndexConstituent(
                        index_id=proposal.index_id,
                        symbol=change["symbol"],
                        name=change.get("name") or change["symbol"],
                        weight=change["new_weight"],
                        current_price_usd=live_price,
                        price_at_nav_ref=live_price,   # inicializa com preço ao vivo
                        market_cap_usd=0.0,
                        volume_24h_usd=0.0,
                        price_change_7d=0.0,
                        price_change_30d=0.0,
                        ai_rationale=change.get("rationale") or "",
                        is_stablecoin=False,
                        network_mode=network_mode,
                        in_basket=True,
                    )
                    db.add(constituent)
                    logger.info(
                        f"Rebalancer: novo token {change['symbol']} criado no banco "
                        f"(price_at_nav_ref=${live_price:.4f}, rede={network_mode})"
                    )

        proposal.status = "executed" if not dry_run else "dry_run"
        proposal.executed_at = datetime.utcnow()

        # Update index last_rebalanced_at
        idx = db.query(AlphaIndex).filter(AlphaIndex.id == proposal.index_id).first()
        if idx:
            idx.last_rebalanced_at = datetime.utcnow()
            idx.rebalance_summary = proposal.ai_rationale

        db.commit()
        logger.success(f"Proposal {proposal_id} executed successfully")

    except Exception as e:
        logger.error(f"Proposal execution failed: {e}")
        proposal.status = "failed"
        proposal.execution_error = str(e)
        db.commit()
        raise
