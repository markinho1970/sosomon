"""
Scout Agent — Daily token screening for SoSoMon indexes.

Fonte de dados: SoSoValue SSI + SoDEX (sem CoinGecko).
- SSI constituents são o universo de candidatos (pré-qualificados pela SoSoValue)
- SoDEX enriquece com preços on-chain e momentum para tokens listados
- Blacklist + cooldown filtram tokens indesejados
- Gemini gera rationale baseado nos dados disponíveis
"""

import os
import json
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from loguru import logger
from services.llm import generate

from database import SessionLocal
from models import AlphaIndex, IndexConstituent, AgentActivityLog, ScoutReport, RebalanceProposal
from services import sosovalue
from services.sosovalue import get_macro_context
from services.sodex import get_all_tickers, get_markets, get_candles


# Tokens permanentemente excluídos de todos os índices.
TOKEN_BLACKLIST_SYMBOLS: set = {
    "FARTCOIN",
    "PIEVERSE",
    "SKYAI",
}


async def run_all_indexes():
    """Main entry point — roda o Scout para todos os índices ativos.

    Macro context e currency cache são buscados uma única vez e compartilhados
    entre temas para minimizar chamadas à API SoSoValue (20 req/min).
    """
    db = SessionLocal()
    try:
        # Pre-warm currency cache (1 chamada) + macro context (4 chamadas paralelas)
        # Feito aqui para não repetir por tema
        await sosovalue._ensure_currency_cache()
        logger.info("Scout: buscando contexto macro SoSoValue...")
        macro = await get_macro_context()

        indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
        for i, idx in enumerate(indexes):
            if i > 0:
                logger.info("Scout: aguardando 8s entre temas (rate limit SoSoValue)")
                await asyncio.sleep(8)
            await run_scout_for_index(idx.id, idx.theme, db, macro=macro)
    finally:
        db.close()


async def run_scout_for_index(index_id: str, theme: str, db, macro: dict = None):
    """Roda o Scout para um índice: SSI → filtros → rationale → relatório."""
    logger.info(f"Scout [{theme}]: iniciando run index={index_id}")

    # 1. Contexto macro (compartilhado via run_all_indexes; fallback se chamado isolado)
    if macro is None:
        macro = await get_macro_context()
    sentiment_score = macro["sosovalue_sentiment_score"]

    # 2. Candidatos do SSI com tickers resolvidos (substitui THEME_UNIVERSE + CoinGecko)
    candidates = await sosovalue.get_ssi_candidates_for_theme(theme)
    if not candidates:
        logger.warning(f"Scout [{theme}]: SoSoValue SSI sem dados, abortando")
        return

    logger.info(f"Scout [{theme}]: {len(candidates)} candidatos do SSI: {[c['symbol'] for c in candidates]}")

    # 3. Notícias temáticas e benchmark
    theme_news = await sosovalue.get_news_for_theme(theme, limit=3)
    news_summary = "; ".join([n.get("title", "") or "" for n in theme_news[:3] if n]) if theme_news else ""

    benchmark = await sosovalue.get_benchmark_for_theme(theme)
    if benchmark:
        logger.info(f"Scout [{theme}]: benchmark {benchmark.get('ssi_ticker')} → 30d: {benchmark.get('1month_roi', 0)*100:.1f}%")

    # 4. Mercados SoDEX (enriquecimento on-chain)
    sodex_tickers = await get_all_tickers()
    sodex_markets = await get_markets()
    sodex_symbols = {m.get("baseCurrency", m.get("base", "")).upper() for m in sodex_markets}
    logger.info(f"Scout [{theme}]: {len(sodex_symbols)} mercados SoDEX disponíveis")

    # 5. Aplica blacklist
    blacklisted = [t for t in candidates if t["symbol"] in TOKEN_BLACKLIST_SYMBOLS]
    if blacklisted:
        logger.info(f"Scout [{theme}]: blacklist removeu {[t['symbol'] for t in blacklisted]}")
    candidates = [t for t in candidates if t["symbol"] not in TOKEN_BLACKLIST_SYMBOLS]

    if not candidates:
        logger.warning(f"Scout [{theme}]: nenhum candidato restou após blacklist")
        return

    # 6. Aplica cooldown pós-ejeção (90 dias a partir de propostas executadas)
    _cutoff = datetime.utcnow() - timedelta(days=90)
    _executed = db.query(RebalanceProposal).filter(
        RebalanceProposal.index_id == index_id,
        RebalanceProposal.status == "executed",
        RebalanceProposal.proposed_at >= _cutoff,
    ).all()
    _ejected_symbols: set = set()
    for _p in _executed:
        for _ch in (_p.changes or []):
            if _ch.get("action") in ("remove", "eject"):
                _sym = (_ch.get("symbol") or "").upper()
                if _sym:
                    _ejected_symbols.add(_sym)
    _current_syms = {
        c.symbol.upper() for c in
        db.query(IndexConstituent).filter(IndexConstituent.index_id == index_id).all()
    }
    _ejected_symbols -= _current_syms
    if _ejected_symbols:
        _cooling = [t["symbol"] for t in candidates if t["symbol"].upper() in _ejected_symbols]
        if _cooling:
            logger.info(f"Scout [{theme}]: cooldown 90d bloqueou {_cooling}")
        candidates = [t for t in candidates if t["symbol"].upper() not in _ejected_symbols]

    # 7. Inicializa campos de mercado
    for token in candidates:
        token.setdefault("current_price_usd", 0.0)
        token.setdefault("volume_24h_usd", 0.0)
        token.setdefault("price_change_7d", 0.0)
        token.setdefault("price_change_30d", 0.0)
        token.setdefault("market_cap_usd", 0.0)
        token.setdefault("on_sodex", False)

    # 8. Enriquece com dados on-chain do SoDEX
    for token in candidates:
        sym = token["symbol"]
        market_key = f"{sym}-USD"
        if market_key in sodex_tickers:
            t = sodex_tickers[market_key]
            token["current_price_usd"] = float(t.get("lastPrice", t.get("price", 0)) or 0)
            token["volume_24h_usd"] = float(t.get("volume24h", t.get("volume", 0)) or 0)
            token["on_sodex"] = True
            # Momentum 30d via candles SoDEX
            candles = await get_candles(market_key, resolution="1D", limit=30)
            if len(candles) >= 2:
                first = float(candles[0].get("close", candles[0].get("c", 0)) or 0)
                last = float(candles[-1].get("close", candles[-1].get("c", 0)) or 0)
                if first > 0:
                    token["price_change_30d"] = round(((last - first) / first) * 100, 2)

    # 9. Constituintes atuais do índice
    current_constituents = db.query(IndexConstituent).filter(
        IndexConstituent.index_id == index_id
    ).all()
    current_symbols = {c.symbol: c for c in current_constituents}

    # 10. Scoring por peso SSI + momentum SoDEX
    scored_tokens = _apply_momentum_scoring(candidates)

    # 11. Rationale AI para top candidatos
    top_candidates = scored_tokens[:12]
    candidates_with_rationale = await _generate_ai_rationale(
        top_candidates, theme, sentiment_score,
        news_context=news_summary,
        benchmark=benchmark,
    )

    # 12. Calcula inclusões / exclusões / mudanças de peso
    inclusions, exclusions, weight_changes = _compute_changes(
        candidates=candidates_with_rationale,
        current_symbols=current_symbols,
        sentiment_score=sentiment_score,
        theme=theme,
    )

    # 13. Salva ScoutReport
    report = ScoutReport(
        index_id=index_id,
        run_at=datetime.utcnow(),
        tokens_screened=len(candidates),
        tokens_qualified=len(candidates),
        inclusions=inclusions,
        exclusions=exclusions,
        weight_changes=weight_changes,
        raw_output=json.dumps(candidates_with_rationale, indent=2),
    )
    db.add(report)

    # 14. Log de atividade
    summary = _build_activity_summary(inclusions, exclusions, weight_changes)
    activity = AgentActivityLog(
        id=str(uuid.uuid4()),
        index_id=index_id,
        agent="scout",
        action="rebalance" if (inclusions or exclusions) else "no_action",
        description=summary,
        timestamp=datetime.utcnow(),
        data={"inclusions": len(inclusions), "exclusions": len(exclusions), "weight_changes": len(weight_changes)},
    )
    db.add(activity)
    db.commit()

    logger.success(
        f"Scout [{theme}]: completo | candidatos={len(candidates)} | "
        f"+{len(inclusions)} -{len(exclusions)} peso_changes={len(weight_changes)}"
    )


def _apply_momentum_scoring(tokens: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Score = peso SSI (ranking da SoSoValue) ajustado por momentum SoDEX.
    Tokens com SoDEX têm boost/penalty por price_change_30d.
    """
    max_weight = max(t.get("ssi_weight", 0) for t in tokens) if tokens else 1.0
    if max_weight == 0:
        max_weight = 1.0

    for token in tokens:
        base_score = token.get("ssi_weight", 0) / max_weight
        if token.get("price_change_30d", 0) > 0:
            base_score *= 1.20
        elif token.get("price_change_30d", 0) < -15:
            base_score *= 0.80
        token["scout_score"] = base_score

    tokens.sort(key=lambda x: x["scout_score"], reverse=True)
    return tokens


async def _generate_ai_rationale(
    tokens: List[Dict[str, Any]],
    theme: str,
    sentiment_score: float,
    news_context: str = "",
    benchmark: dict = None,
) -> List[Dict[str, Any]]:
    """Gemini gera rationale usando dados SSI + SoDEX."""

    token_summaries = "\n".join([
        f"- {t['symbol']}: SSI weight {t.get('ssi_weight', 0)*100:.1f}%"
        + (f", price ${t['current_price_usd']:.4f}" if t.get("current_price_usd") else "")
        + (f", 24h vol ${t['volume_24h_usd']/1e6:.1f}M" if t.get("volume_24h_usd") else "")
        + f", 30d {t.get('price_change_30d', 0):+.1f}%"
        + (" [listed on SoDEX]" if t.get("on_sodex") else "")
        for t in tokens
    ])

    benchmark_line = ""
    if benchmark:
        ticker = benchmark.get("ssi_ticker", "")
        roi_30 = benchmark.get("1month_roi", 0)
        roi_7 = benchmark.get("7day_roi", 0)
        benchmark_line = f"\nSoSoValue {ticker} benchmark: 7d {roi_7*100:+.1f}%, 30d {roi_30*100:+.1f}%"

    news_line = f"\nLatest news: {news_context}" if news_context else ""

    prompt = f"""You are a crypto analyst managing a thematic index: {theme.upper()}.
All candidates are pre-qualified by SoSoValue's SSI index — a trusted institutional crypto index.

Market sentiment: {sentiment_score}/100 ({_sentiment_label(sentiment_score)}){benchmark_line}{news_line}

Candidates (ranked by SSI weight + momentum):
{token_summaries}

For each token, write ONE sentence (max 20 words) explaining why it belongs in this index.
Focus on: role in the theme, momentum, and institutional recognition by SoSoValue SSI.

Respond ONLY with a JSON array:
[
  {{"symbol": "RENDER", "rationale": "..."}},
  ...
]"""

    try:
        content = await generate(prompt, max_tokens=512, temperature=0.0)
        start = content.find("[")
        end = content.rfind("]") + 1
        parsed_list = json.loads(content[start:end]) if start >= 0 else []
        rationale_map = {
            item["symbol"]: item["rationale"]
            for item in parsed_list
            if isinstance(item, dict) and "symbol" in item
        }
    except Exception as e:
        logger.error(f"Scout [{theme}]: geração de rationale falhou: {e}")
        rationale_map = {}

    for token in tokens:
        token["ai_rationale"] = rationale_map.get(
            token["symbol"],
            f"Constituent of SoSoValue {theme} SSI index with {token.get('ssi_weight', 0)*100:.1f}% weight.",
        )

    return tokens


MAX_WEIGHT_PCT = 25.0  # cap por token — evita concentração excessiva


def _compute_changes(
    candidates: List[Dict],
    current_symbols: Dict,
    sentiment_score: float,
    theme: str = "",
) -> tuple:
    """Determina inclusões/exclusões/mudanças de peso vs composição atual.
    Cap de MAX_WEIGHT_PCT por token para evitar concentração.
    """
    from services.sosovalue import get_stablecoin_buffer_from_sentiment

    top_10 = candidates[:10]
    top_10_symbols = {t["symbol"] for t in top_10}
    current_symbol_set = set(current_symbols.keys()) - {"USDC", "USDT"}

    inclusions = [
        {"symbol": t["symbol"], "name": t["name"], "rationale": t.get("ai_rationale", "")}
        for t in top_10
        if t["symbol"] not in current_symbol_set
    ]

    exclusions = [
        {"symbol": sym, "reason": f"Removed from SoSoValue SSI {theme} index"}
        for sym in current_symbol_set
        if sym not in top_10_symbols
    ]

    # Pesos SSI normalizados com cap de MAX_WEIGHT_PCT
    target_buffer = get_stablecoin_buffer_from_sentiment(sentiment_score)
    usable_pct = 100.0 - target_buffer
    total_ssi = sum(t.get("ssi_weight", 1.0) for t in top_10) or 1.0

    raw_weights = {
        t["symbol"]: (t.get("ssi_weight", 1.0) / total_ssi) * usable_pct
        for t in top_10
    }
    # Aplica cap iterativamente redistribuindo excesso
    for _ in range(5):
        excess = sum(max(0, w - MAX_WEIGHT_PCT) for w in raw_weights.values())
        if excess < 0.01:
            break
        uncapped = {s: w for s, w in raw_weights.items() if w < MAX_WEIGHT_PCT}
        uncapped_total = sum(uncapped.values()) or 1.0
        for s in raw_weights:
            if raw_weights[s] >= MAX_WEIGHT_PCT:
                raw_weights[s] = MAX_WEIGHT_PCT
            else:
                raw_weights[s] += excess * (raw_weights[s] / uncapped_total)

    weight_changes = []
    for token in top_10:
        new_w = round(raw_weights[token["symbol"]], 1)
        current = current_symbols.get(token["symbol"])
        if current and abs(new_w - current.weight) > 2:
            weight_changes.append({
                "symbol": token["symbol"],
                "old_weight": current.weight,
                "new_weight": new_w,
            })

    return inclusions, exclusions, weight_changes


def _build_activity_summary(inclusions, exclusions, weight_changes) -> str:
    parts = []
    if inclusions:
        parts.append(f"Inclusions: {', '.join(i['symbol'] for i in inclusions)}")
    if exclusions:
        parts.append(f"Exclusions: {', '.join(e['symbol'] for e in exclusions)}")
    if weight_changes:
        changes = [f"{w['symbol']} {w['old_weight']}%→{w['new_weight']}%" for w in weight_changes[:3]]
        parts.append(f"Weight changes: {', '.join(changes)}")
    if not parts:
        return "Scout screening complete. No changes recommended. All positions within thresholds."
    return "Scout screening complete. " + " | ".join(parts)


def _sentiment_label(score: float) -> str:
    if score <= 20: return "Extreme Fear"
    if score <= 40: return "Fear"
    if score <= 60: return "Neutral"
    if score <= 80: return "Greed"
    return "Extreme Greed"
