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

    constituents = db.query(IndexConstituent).filter(
        IndexConstituent.index_id == idx.id
    ).all()

    if not constituents:
        logger.warning(f"Rebalancer: no constituents for {idx.id}")
        return

    # Refresh prices via SoDEX + SoSoValue klines (sem CoinGecko)
    try:
        from services import sosovalue as _sv
        await _sv._ensure_currency_cache()
        _tickers = await get_all_tickers()
        for c in constituents:
            if c.is_stablecoin:
                continue
            sym = c.symbol
            _t = _tickers.get(f"{sym}-USD") or _tickers.get(f"{sym}-USDC")
            if _t:
                _p = float(_t.get("lastPrice", _t.get("c", 0)) or 0)
                if _p > 0:
                    c.current_price_usd = _p
                    c.volume_24h_usd = float(_t.get("volume24h", _t.get("v", 0)) or 0)
            _cid = _sv._CURRENCY_CACHE.get(sym.upper())
            if _cid:
                _klines = await _sv.get_currency_klines(_cid, limit=8)
                if _klines:
                    _closes = [float(k.get("close", k.get("c", 0)) or 0) for k in _klines]
                    _closes = [v for v in _closes if v > 0]
                    if len(_closes) >= 2:
                        c.price_change_7d = round((_closes[-1] - _closes[0]) / _closes[0] * 100, 2)
                    if c.current_price_usd <= 0 and _closes:
                        c.current_price_usd = _closes[-1]
        db.flush()
    except Exception as _e:
        logger.warning(f"Rebalancer: erro ao refreshar preços: {_e}")

    # Check risk overrides
    emergencies = _check_emergency_ejections(constituents)

    # Check drift
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

    # Generate rebalance proposal using Claude
    proposal_changes = await _generate_proposal(
        idx=idx,
        constituents=constituents,
        trigger=trigger,
        emergencies=emergencies,
        scout_changes=scout_changes,
        target_buffer=target_buffer,
        sentiment_score=sentiment_score,
        db=db,
    )

    if proposal_changes:
        _save_proposal(idx.id, trigger, proposal_changes, db)


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
    """Check if any constituent has drifted more than DRIFT_THRESHOLD from target weight."""
    non_stable = [c for c in constituents if not c.is_stablecoin]
    if not non_stable:
        return []

    usable = 100 - target_buffer
    target_weight = usable / len(non_stable)

    violations = []
    for c in non_stable:
        drift = abs(c.weight - target_weight)
        if drift > DRIFT_THRESHOLD:
            violations.append({
                "symbol": c.symbol,
                "current_weight": c.weight,
                "target_weight": round(target_weight, 1),
                "drift": round(drift, 1),
            })
    return violations


def _is_weekly_rebalance_due(idx: AlphaIndex) -> bool:
    """Check if more than 7 days since last rebalance."""
    if not idx.last_rebalanced_at:
        return True
    return (datetime.utcnow() - idx.last_rebalanced_at) >= timedelta(days=7)


async def _generate_proposal(
    idx, constituents, trigger, emergencies, scout_changes, target_buffer, sentiment_score, db
) -> Optional[List[Dict]]:
    """Use Claude to generate the rebalancing proposal with full rationale."""

    current_state = "\n".join([
        f"- {c.symbol}: {c.weight:.1f}% weight, "
        f"price ${c.current_price_usd:.4f}, "
        f"7d {c.price_change_7d:+.1f}%, "
        f"vol ${c.volume_24h_usd/1e6:.1f}M"
        for c in constituents
    ])

    scout_summary = json.dumps(scout_changes, indent=2)
    emergency_summary = json.dumps(emergencies, indent=2) if emergencies else "None"

    prompt = f"""You are the Rebalancer agent for AlphaGrid, managing the "{idx.name}" index.

TRIGGER: {trigger.upper()}

CURRENT INDEX STATE:
{current_state}

EMERGENCY EJECTIONS (execute immediately, no review needed):
{emergency_summary}

SCOUT AGENT RECOMMENDATIONS (from last daily screening):
{scout_summary}

CONSTRAINTS:
- Target stablecoin buffer: {target_buffer:.0f}% (based on sentiment score {sentiment_score}/100)
- Max single token weight: {MAX_SINGLE_WEIGHT}%
- Base equal weight after buffer: {(100 - target_buffer) / max(len([c for c in constituents if not c.is_stablecoin]), 1):.2f}% per token ({len([c for c in constituents if not c.is_stablecoin])} non-stable tokens in index)
- CRITICAL: all new_weight values MUST sum to exactly 100.0% — verify before responding
- Momentum boost: +20% weight for tokens with positive 30d price trend

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

        # Validação: pesos devem somar 100%. Se não, normaliza proporcionalmente.
        total = sum(c.get("new_weight", 0) for c in changes)
        if total > 0 and abs(total - 100.0) > 0.5:
            logger.warning(
                f"Rebalancer [{idx.id}]: pesos somam {total:.2f}% — normalizando para 100%"
            )
            for c in changes:
                c["new_weight"] = round(c.get("new_weight", 0) * 100.0 / total, 2)
            # Ajuste de arredondamento no maior peso
            total2 = sum(c.get("new_weight", 0) for c in changes)
            if changes and abs(total2 - 100.0) > 0.01:
                biggest = max(changes, key=lambda x: x.get("new_weight", 0))
                biggest["new_weight"] = round(biggest["new_weight"] + (100.0 - total2), 2)

        return changes

    except Exception as e:
        logger.error(f"Rebalancer Claude call failed: {e}")
        return None


def _save_proposal(index_id: str, trigger: str, changes: List[Dict], db):
    """Save rebalance proposal to DB for founder review."""
    proposal = RebalanceProposal(
        index_id=index_id,
        proposed_at=datetime.utcnow(),
        status="pending",
        trigger=trigger,
        changes=changes,
        ai_rationale=f"Proposed by Rebalancer agent. Trigger: {trigger}. {len(changes)} changes.",
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
        # 1. Snapshot atual do portfolio no SoDEX
        snapshot = await get_portfolio_snapshot()
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
        )

        logger.info(f"Rebalancer: {len(executed_orders)} ordens {'simuladas' if dry_run else 'executadas'} no SoDEX")

        # Salva as ordens executadas (com order IDs) no banco como evidência
        proposal.execution_orders = executed_orders

        # 4. Atualiza pesos dos constituents no banco
        for change in proposal.changes:
            constituent = db.query(IndexConstituent).filter(
                IndexConstituent.index_id == proposal.index_id,
                IndexConstituent.symbol == change["symbol"],
            ).first()
            if constituent and change["action"] != "remove":
                constituent.weight = change["new_weight"]
            elif constituent and change["action"] == "remove":
                db.delete(constituent)

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
