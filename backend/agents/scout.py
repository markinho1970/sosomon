"""
Scout Agent — Daily token screening for AlphaGrid indexes.

Responsabilidades:
- Busca mercados disponíveis no SoDEX (dados reais on-chain)
- Complementa com CoinGecko Pro para tokens fora do SoDEX
- Aplica critérios de inclusão/exclusão (market cap, volume, momentum)
- Usa GPT-4o para gerar rationale de cada token
- Salva recomendações na tabela ScoutReport
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any
from loguru import logger
from services.llm import generate

from database import SessionLocal
from models import AlphaIndex, IndexConstituent, AgentActivityLog, ScoutReport
from services.coingecko import screen_tokens_for_theme
from services import sosovalue
from services.sosovalue import get_macro_context
from services.sodex import get_all_tickers, get_markets, get_candles


# ─── Token Universe per Theme ─────────────────────────────────────────────────
# CoinGecko IDs for each thematic universe (top 30 candidates per theme)

THEME_UNIVERSE: Dict[str, List[str]] = {
    "ai-crypto": [
        "render-token", "bittensor", "fetch-ai", "the-graph", "singularitynet",
        "ocean-protocol", "numeraire", "akash-network", "human-protocol", "alethea-artificial-liquid-intelligence-token",
        "cortex", "matrix-ai-network", "deep-brain-chain", "effect-network", "vectorspace-ai",
        "oraichain-token", "velas", "artificial-superintelligence-alliance",
    ],
    "rwa": [
        "ondo-finance", "maker", "centrifuge", "truefi", "clearpool",
        "maple", "dusk-network", "realio-network", "propchain", "artfi",
        "goldfinch", "backed-finance", "matrixdock", "ondo-us-dollar-yield",
    ],
    "depin": [
        "helium", "helium-mobile", "helium-iot", "iotex", "power-ledger",
        "dimo", "geodnet", "silencio", "wicrypt", "pollen-mobile",
        "planetwatch", "weatherxm", "hivemapper", "grass", "natix-network",
    ],
}

# Tokens permanentemente excluídos de todos os índices, independente de market cap/volume.
# Adicionar símbolo em maiúsculas para bloquear.
TOKEN_BLACKLIST_SYMBOLS: set = {
    "FARTCOIN",   # meme token — sem utilidade real nos temas
    "PIEVERSE",   # meme/gaming token — sem fundamentos DePIN/AI/RWA
    "SKYAI",      # meme token — sem utilidade real no tema AI
}


async def run_all_indexes():
    """Main entry point — runs Scout for all active indexes."""
    db = SessionLocal()
    try:
        indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
        for idx in indexes:
            if idx.theme in THEME_UNIVERSE:
                await run_scout_for_index(idx.id, idx.theme, db)
    finally:
        db.close()


async def run_scout_for_index(index_id: str, theme: str, db):
    """Run Scout screening for a single index theme."""
    logger.info(f"Scout: starting run for index={index_id}, theme={theme}")

    universe = THEME_UNIVERSE.get(theme, [])
    if not universe:
        logger.warning(f"Scout: no universe defined for theme={theme}")
        return

    # 1. Fetch macro context (dados reais SoSoValue)
    macro = await get_macro_context()
    sentiment_score = macro["sosovalue_sentiment_score"]

    # 2. Busca constituents reais do index SoSoValue como universo primário
    ssi_constituents = await sosovalue.get_ssi_constituents_for_theme(theme)
    ssi_symbols = {c.get("symbol", "").upper() for c in ssi_constituents}
    if ssi_symbols:
        logger.info(f"Scout: {len(ssi_symbols)} tokens no index SSI para {theme}: {ssi_symbols}")

    # Complementa universo estático com tokens do SSI
    ssi_cg_ids = [c.get("symbol", "").lower() for c in ssi_constituents if c.get("symbol")]
    combined_universe = list(set(universe + ssi_cg_ids))

    # 3. Notícias temáticas reais da SoSoValue
    theme_news = await sosovalue.get_news_for_theme(theme, limit=3)
    news_summary = "; ".join([n.get("title", "") or "" for n in theme_news[:3] if n]) if theme_news else ""
    if news_summary:
        logger.info(f"Scout: notícias {theme}: {news_summary[:120]}...")

    # 4. Benchmark performance do index SoSoValue
    benchmark = await sosovalue.get_benchmark_for_theme(theme)
    if benchmark:
        logger.info(f"Scout: benchmark {benchmark.get('ssi_ticker')} → 30d: {benchmark.get('1month_roi', 0)*100:.1f}%")

    # 5. Busca mercados e preços reais do SoDEX
    sodex_tickers = await get_all_tickers()
    sodex_markets  = await get_markets()
    sodex_symbols  = {m.get("baseCurrency", m.get("base", "")).upper() for m in sodex_markets}
    logger.info(f"Scout: {len(sodex_symbols)} mercados disponíveis no SoDEX mainnet")

    # 6. Screen tokens via CoinGecko (market cap, volume, histórico)
    qualified_tokens = await screen_tokens_for_theme(
        theme_token_ids=combined_universe,
        min_market_cap_usd=50_000_000,
        min_volume_24h_usd=500_000,
    )

    # Remove blacklisted tokens (meme/irrelevantes) antes de qualquer analise
    _blacklisted = [t for t in qualified_tokens if t.get("symbol", "").upper() in TOKEN_BLACKLIST_SYMBOLS]
    if _blacklisted:
        logger.info(f"Scout [{theme}]: blacklist removeu {[t['symbol'] for t in _blacklisted]}")
        qualified_tokens = [t for t in qualified_tokens if t.get("symbol", "").upper() not in TOKEN_BLACKLIST_SYMBOLS]

    if not qualified_tokens:
        logger.warning(f"Scout: no tokens qualified for {theme}")
        return

    # 4. Enriquece com dados on-chain reais do SoDEX quando disponível
    for token in qualified_tokens:
        sym = token["symbol"].upper()
        market_key = f"{sym}-USD"
        if market_key in sodex_tickers:
            t = sodex_tickers[market_key]
            # Sobrescreve preço e volume com dado real do SoDEX
            token["current_price_usd"] = float(t.get("lastPrice", t.get("price", token["current_price_usd"])))
            token["volume_24h_usd"]    = float(t.get("volume24h", t.get("volume", token["volume_24h_usd"])))
            token["on_sodex"]          = True
            # Calcula momentum 30d real via candles SoDEX
            candles = await get_candles(market_key, resolution="1D", limit=30)
            if len(candles) >= 2:
                first = float(candles[0].get("close", candles[0].get("c", 0)))
                last  = float(candles[-1].get("close", candles[-1].get("c", 0)))
                if first > 0:
                    token["price_change_30d"] = round(((last - first) / first) * 100, 2)
        else:
            token["on_sodex"] = False  # token não listado no SoDEX ainda

    # 5. Get current constituents for comparison
    current_constituents = db.query(IndexConstituent).filter(
        IndexConstituent.index_id == index_id
    ).all()
    current_symbols = {c.symbol: c for c in current_constituents}

    # 4. Apply momentum filter
    scored_tokens = _apply_momentum_scoring(qualified_tokens)

    # 5. Generate AI rationale for top candidates
    top_candidates = scored_tokens[:12]  # screen top 12, pick 10
    candidates_with_rationale = await _generate_ai_rationale(
        top_candidates, theme, sentiment_score,
        news_context=news_summary,
        benchmark=benchmark,
    )

    # 6. Determine inclusions / exclusions / weight changes
    inclusions, exclusions, weight_changes = _compute_changes(
        candidates=candidates_with_rationale,
        current_symbols=current_symbols,
        sentiment_score=sentiment_score,
    )

    # 7. Save ScoutReport
    report = ScoutReport(
        index_id=index_id,
        run_at=datetime.utcnow(),
        tokens_screened=len(universe),
        tokens_qualified=len(qualified_tokens),
        inclusions=inclusions,
        exclusions=exclusions,
        weight_changes=weight_changes,
        raw_output=json.dumps(candidates_with_rationale, indent=2),
    )
    db.add(report)

    # 8. Log agent activity
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
        f"Scout complete: theme={theme} | screened={len(universe)} | "
        f"qualified={len(qualified_tokens)} | +{len(inclusions)} -{len(exclusions)}"
    )


def _apply_momentum_scoring(tokens: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Score tokens by momentum:
    - +20% score boost if price > 30d MA (positive momentum, approximated by price_change_30d > 0)
    - -20% score reduction if TVL declining (proxy: volume declining)
    Base score = market_cap_usd (normalized)
    """
    max_cap = max(t["market_cap_usd"] for t in tokens) if tokens else 1

    for token in tokens:
        base_score = token["market_cap_usd"] / max_cap

        # Momentum modifier
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
    """Gemini gera rationale para cada token usando dados reais da SoSoValue."""

    token_summaries = "\n".join([
        f"- {t['symbol']} ({t['name']}): "
        f"MCap ${t['market_cap_usd']/1e6:.1f}M, "
        f"24h vol ${t['volume_24h_usd']/1e6:.1f}M, "
        f"7d {t.get('price_change_7d', 0):+.1f}%, "
        f"30d {t.get('price_change_30d', 0):+.1f}%"
        + (" [on SoDEX]" if t.get("on_sodex") else "")
        for t in tokens
    ])

    benchmark_line = ""
    if benchmark:
        roi_30 = benchmark.get("1month_roi", 0)
        roi_7  = benchmark.get("7day_roi", 0)
        ticker = benchmark.get("ssi_ticker", "")
        benchmark_line = f"\nSoSoValue {ticker} benchmark: 7d {roi_7*100:+.1f}%, 30d {roi_30*100:+.1f}%"

    news_line = f"\nLatest news signals: {news_context}" if news_context else ""

    prompt = f"""You are a crypto analyst managing an AI-powered thematic index: {theme.upper()}.

Market sentiment: {sentiment_score}/100 ({_sentiment_label(sentiment_score)}){benchmark_line}{news_line}

Top candidate tokens (passed quantitative screening):
{token_summaries}

For each token, write ONE sentence (max 20 words) explaining why it belongs in this index.
Focus on: role in the theme, momentum, and edge vs benchmark.

Respond ONLY with a JSON array:
[
  {{"symbol": "RNDR", "rationale": "..."}},
  ...
]"""

    try:
        content = await generate(prompt, max_tokens=512, temperature=0.0)
        # Extract JSON array from response
        start = content.find("[")
        end = content.rfind("]") + 1
        parsed_list = json.loads(content[start:end]) if start >= 0 else []
        rationale_map = {
            item["symbol"]: item["rationale"]
            for item in parsed_list
            if isinstance(item, dict) and "symbol" in item
        }
    except Exception as e:
        logger.error(f"Gemini rationale generation failed: {e}")
        rationale_map = {}

    for token in tokens:
        token["ai_rationale"] = rationale_map.get(
            token["symbol"],
            f"Qualifies for {theme} index based on market cap and volume thresholds."
        )

    return tokens


def _compute_changes(
    candidates: List[Dict],
    current_symbols: Dict,
    sentiment_score: float,
) -> tuple:
    """Determine what should change vs current index composition."""
    from services.sosovalue import get_stablecoin_buffer_from_sentiment

    top_10_symbols = {t["symbol"] for t in candidates[:10]}
    current_symbol_set = set(current_symbols.keys()) - {"USDC", "USDT"}

    inclusions = [
        {"symbol": t["symbol"], "name": t["name"], "rationale": t.get("ai_rationale", "")}
        for t in candidates[:10]
        if t["symbol"] not in current_symbol_set
    ]

    exclusions = [
        {"symbol": sym, "reason": "No longer in top 10 qualified candidates after screening"}
        for sym in current_symbol_set
        if sym not in top_10_symbols
    ]

    # Weight changes: simple equal weight with momentum boost
    target_buffer = get_stablecoin_buffer_from_sentiment(sentiment_score)
    usable_pct = 100 - target_buffer
    base_weight = usable_pct / 10  # 10 tokens

    weight_changes = []
    for token in candidates[:10]:
        momentum_adj = 1.20 if token.get("price_change_30d", 0) > 0 else 1.0
        raw_weight = base_weight * momentum_adj
        # Normalize later — for now, just flag large changes
        current = current_symbols.get(token["symbol"])
        if current:
            diff = abs(raw_weight - current.weight)
            if diff > 2:
                weight_changes.append({
                    "symbol": token["symbol"],
                    "old_weight": current.weight,
                    "new_weight": round(raw_weight, 1),
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
