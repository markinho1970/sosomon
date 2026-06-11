"""
SoSoValue API Service — Integração real com openapi.sosovalue.com
Base URL: https://openapi.sosovalue.com/openapi/v1
Auth: x-soso-api-key header
Rate limit: 20 req/min, 100k/mês
"""

import os
import httpx
from typing import Optional, Dict, Any, List
from loguru import logger

BASE_URL = "https://openapi.sosovalue.com/openapi/v1"
API_KEY  = os.getenv("SOSOVALUE_API_KEY", "")
HEADERS  = {"x-soso-api-key": API_KEY}
TIMEOUT  = 15


def _d(response: dict) -> Any:
    """Extrai data da resposta padrão {code, message, data}."""
    if isinstance(response, dict) and "data" in response:
        return response["data"]
    return response


async def _get(path: str, params: dict = None) -> Any:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(f"{BASE_URL}{path}", headers=HEADERS, params=params)
            r.raise_for_status()
            return _d(r.json())
    except Exception as e:
        logger.warning(f"SoSoValue GET {path} failed: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
#  CURRENCIES
# ═══════════════════════════════════════════════════════════════════════════════

async def get_currencies() -> List[Dict]:
    """Lista todos os tokens disponíveis."""
    data = await _get("/currencies")
    return data if isinstance(data, list) else []


async def get_currency_market_snapshot(currency_id: str) -> Optional[Dict]:
    """Snapshot de mercado de um token: preço, 24h change, ATH, mcap, volume."""
    return await _get(f"/currencies/{currency_id}/market-snapshot")


async def get_currency_klines(currency_id: str, limit: int = 30) -> List[Dict]:
    """Histórico diário OHLCV de um token (últimos 3 meses, interval=1d)."""
    data = await _get(f"/currencies/{currency_id}/klines", {"interval": "1d", "limit": limit})
    return data if isinstance(data, list) else []


async def get_sector_spotlight() -> Dict:
    """
    Retorna performance 24h de cada setor (AI, DeFi, RWA, DePIN, Layer2, etc.)
    e destaque dos spotlights.
    """
    data = await _get("/currencies/sector-spotlight")
    if data:
        return data
    # Fallback
    return {"sector": [], "spotlight": []}


async def search_currency_by_symbol(symbol: str) -> Optional[str]:
    """Busca currency_id pelo símbolo (ex: 'BTC' → '1673723677362319866')."""
    if symbol.upper() in _CURRENCY_CACHE:
        return _CURRENCY_CACHE[symbol.upper()]
    await _ensure_currency_cache()
    return _CURRENCY_CACHE.get(symbol.upper())

_CURRENCY_CACHE: Dict[str, str] = {}     # ticker → currency_id
_CURRENCY_ID_CACHE: Dict[str, str] = {}  # currency_id → ticker


async def _ensure_currency_cache() -> None:
    """Popula ambos os caches (lazy, executa apenas uma vez)."""
    if _CURRENCY_CACHE:
        return
    currencies = await get_currencies()
    for c in currencies:
        sym = c.get("symbol", "").upper()
        cid = str(c.get("currency_id", ""))
        if sym and cid:
            _CURRENCY_CACHE[sym] = cid
            _CURRENCY_ID_CACHE[cid] = sym


async def resolve_ticker(currency_id: str, fallback: str = "") -> str:
    """Resolve currency_id para ticker (ex: '16737...' → 'FET'). Usa fallback se não encontrar."""
    await _ensure_currency_cache()
    return _CURRENCY_ID_CACHE.get(str(currency_id), fallback.upper())


async def get_ssi_candidates_for_theme(theme: str) -> List[Dict]:
    """
    Retorna constituents do SSI com tickers resolvidos via get_currencies().
    Substitui THEME_UNIVERSE + CoinGecko no Scout.
    [{symbol, name, currency_id, ssi_weight}]
    """
    raw = await get_ssi_constituents_for_theme(theme)
    if not raw:
        return []
    await _ensure_currency_cache()
    result = []
    for c in raw:
        cid = str(c.get("currency_id", ""))
        slug = c.get("symbol", "")
        ticker = _CURRENCY_ID_CACHE.get(cid) or slug.upper().replace("-", "")
        if ticker:
            result.append({
                "symbol": ticker,
                "name": ticker,
                "currency_id": cid,
                "ssi_weight": float(c.get("weight", 0)),
            })
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  SSI INDEXES (SoSoValue próprios — benchmark)
# ═══════════════════════════════════════════════════════════════════════════════

# Mapeamento dos nossos temas para os indexes da SoSoValue
THEME_INDEX_MAP = {
    "ai-crypto": "ssiAI",
    "rwa":        "ssiRWA",
    "depin":      "ssiDePIN",
}

async def get_all_ssi_indexes() -> List[str]:
    """Lista todos os indexes SoSoValue disponíveis."""
    data = await _get("/indices")
    return data if isinstance(data, list) else []


async def get_index_constituents(index_ticker: str) -> List[Dict]:
    """Tokens e pesos de um index SoSoValue (ex: ssiAI, ssiRWA, ssiDePIN)."""
    data = await _get(f"/indices/{index_ticker}/constituents")
    return data if isinstance(data, list) else []


async def get_index_snapshot(index_ticker: str) -> Optional[Dict]:
    """
    Performance de um index SoSoValue:
    price, 24h_change_pct, 7day_roi, 1month_roi, 3month_roi, 1year_roi, ytd
    """
    return await _get(f"/indices/{index_ticker}/market-snapshot")


async def get_index_klines(index_ticker: str, limit: int = 30) -> List[Dict]:
    """Histórico diário de preço de um index SoSoValue."""
    data = await _get(f"/indices/{index_ticker}/klines", {"interval": "1d", "limit": limit})
    return data if isinstance(data, list) else []


async def get_benchmark_for_theme(theme: str) -> Optional[Dict]:
    """
    Retorna snapshot do index benchmark correspondente ao nosso tema.
    ai-crypto → ssiAI, rwa → ssiRWA, depin → ssiDePIN
    """
    ticker = THEME_INDEX_MAP.get(theme)
    if not ticker:
        return None
    snap = await get_index_snapshot(ticker)
    if snap:
        snap["ssi_ticker"] = ticker
    return snap


async def get_ssi_constituents_for_theme(theme: str) -> List[Dict]:
    """Retorna os constituents do index SoSoValue para o tema."""
    ticker = THEME_INDEX_MAP.get(theme)
    if not ticker:
        return []
    return await get_index_constituents(ticker)


# ═══════════════════════════════════════════════════════════════════════════════
#  ETF FLOWS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_etf_summary(symbol: str = "BTC", country_code: str = "US", limit: int = 7) -> List[Dict]:
    """
    Fluxo diário de ETFs spot (ex: BTC ETF US).
    Retorna: date, total_net_inflow, total_net_assets, cum_net_inflow
    """
    data = await _get("/etfs/summary-history", {
        "symbol": symbol,
        "country_code": country_code,
        "limit": limit,
    })
    return data if isinstance(data, list) else []


async def get_etf_snapshot(ticker: str = "IBIT") -> Optional[Dict]:
    """Snapshot de um ETF específico (IBIT, FBTC, ARKB, etc.)."""
    return await _get(f"/etfs/{ticker}/market-snapshot")


async def get_btc_etf_flow_summary() -> Dict:
    """
    Resumo consolidado do fluxo ETF BTC para o Narrator.
    Retorna inflow/outflow dos últimos 7 dias + IBIT snapshot.
    """
    history = await get_etf_summary("BTC", "US", 7)
    ibit = await get_etf_snapshot("IBIT")

    total_7d_inflow = sum(d.get("total_net_inflow", 0) for d in history[:7]) if history else 0
    latest_net_assets = history[0].get("total_net_assets", 0) if history else 0
    cum_inflow = history[0].get("cum_net_inflow", 0) if history else 0

    return {
        "total_7d_inflow_usd": round(total_7d_inflow, 0),
        "total_net_assets_usd": round(latest_net_assets, 0),
        "cumulative_inflow_usd": round(cum_inflow, 0),
        "ibit_price": ibit.get("mkt_price") if ibit else None,
        "ibit_net_inflow_today": ibit.get("net_inflow") if ibit else None,
        "daily_history": history[:7],
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  NEWS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_hot_news(limit: int = 10, language: str = "en") -> List[Dict]:
    """Notícias quentes em tempo real."""
    data = await _get("/news/hot", {"page": 1, "page_size": limit, "language": language})
    if isinstance(data, dict):
        return data.get("list", [])
    return []


async def get_featured_news(limit: int = 5) -> List[Dict]:
    """Notícias editoriais curadas."""
    data = await _get("/news/featured", {"page": 1, "page_size": max(20, limit)})
    if isinstance(data, dict):
        items = data.get("list", [])
        return items[:limit]
    return []


async def search_news(keyword: str, limit: int = 5) -> List[Dict]:
    """Busca notícias por keyword para um tema específico."""
    data = await _get("/news/search", {"keyword": keyword, "page": 1, "page_size": limit})
    if isinstance(data, dict):
        inner = data.get("data", data)
        if isinstance(inner, dict):
            return inner.get("list", [])
        return inner if isinstance(inner, list) else []
    return []


async def get_news_for_theme(theme: str, limit: int = 5) -> List[Dict]:
    """Busca notícias relevantes para cada tema do SoSoMon."""
    keywords = {
        "ai-crypto": "AI crypto artificial intelligence",
        "rwa":        "real world assets tokenization RWA",
        "depin":      "DePIN decentralized physical infrastructure",
    }
    kw = keywords.get(theme, theme)
    return await search_news(kw, limit)


# ═══════════════════════════════════════════════════════════════════════════════
#  MACRO
# ═══════════════════════════════════════════════════════════════════════════════

async def get_macro_events() -> List[Dict]:
    """Calendário de eventos macro: CPI, NFP, FOMC, etc."""
    data = await _get("/macro/events")
    return data if isinstance(data, list) else []


async def get_macro_event_history(event: str, limit: int = 10) -> List[Dict]:
    """Histórico de um evento macro (actual vs forecast vs previous)."""
    data = await _get(f"/macro/events/{event}/history", {"limit": limit})
    return data if isinstance(data, list) else []


# ═══════════════════════════════════════════════════════════════════════════════
#  ANALYSIS CHARTS
# ═══════════════════════════════════════════════════════════════════════════════

async def get_available_charts() -> List[Dict]:
    """Lista todos os charts de análise disponíveis."""
    data = await _get("/analyses")
    return data if isinstance(data, list) else []


async def get_chart_data(chart_name: str, limit: int = 30) -> List[Dict]:
    """Dados de um chart específico (ex: stablecoin_total_market_cap)."""
    data = await _get(f"/analyses/{chart_name}", {"limit": limit})
    return data if isinstance(data, list) else []


async def get_stablecoin_dominance() -> Optional[Dict]:
    """
    Retorna o market cap total de stablecoins (proxy de liquidez/risk-off).
    Usado pelo Scout como sinal macro adicional.
    """
    data = await get_chart_data("stablecoin_total_market_cap", limit=2)
    if data:
        latest = data[0]
        return {
            "total_mcap": latest.get("mcap"),
            "usdt": latest.get("usdt"),
            "usdc": latest.get("usdc"),
            "timestamp": latest.get("timestamp"),
        }
    return None


# ═══════════════════════════════════════════════════════════════════════════════
#  MACRO CONTEXT (usado pelos Agents)
# ═══════════════════════════════════════════════════════════════════════════════

async def get_macro_context() -> Dict[str, Any]:
    """
    Agrega dados macro reais da SoSoValue para os agents:
    - Sector flows (24h performance por setor)
    - ETF flows BTC (sentimento institucional)
    - Eventos macro próximos
    - Stablecoin dominance
    Deriva sentiment_score e macro_stance a partir dos dados reais.
    """
    # Busca dados em paralelo usando httpx
    import asyncio
    spotlight, etf_flow, macro_events, stable = await asyncio.gather(
        get_sector_spotlight(),
        get_btc_etf_flow_summary(),
        get_macro_events(),
        get_stablecoin_dominance(),
        return_exceptions=True,
    )

    # Calcula sentiment score a partir dos dados reais
    score = _derive_sentiment_score(spotlight, etf_flow)
    label = _score_to_label(score)

    # Determina macro stance
    stance, reason = _derive_stance(score, etf_flow, macro_events)

    # Formata sector flows
    sector_flows = []
    if isinstance(spotlight, dict) and "sector" in spotlight:
        for s in spotlight["sector"]:
            pct = s.get("change_pct_24h", 0) * 100
            sector_flows.append({
                "sector": s.get("name"),
                "flow_7d": "inflow" if pct > 0 else ("outflow" if pct < 0 else "neutral"),
                "change_pct": round(pct, 2),
                "marketcap_dom": round(s.get("marketcap_dom", 0) * 100, 2),
            })

    # Próximos eventos macro (só próximos 7 dias)
    upcoming_events = []
    if isinstance(macro_events, list):
        upcoming_events = macro_events[:5]

    return {
        "sosovalue_sentiment_score": score,
        "sentiment_label": label,
        "sector_flows": sector_flows,
        "macro_stance": stance,
        "macro_stance_reason": reason,
        "etf_flow": etf_flow if isinstance(etf_flow, dict) else {},
        "stablecoin_dominance": stable if isinstance(stable, dict) else {},
        "upcoming_macro_events": upcoming_events,
    }


def _derive_sentiment_score(spotlight: Any, etf_flow: Any) -> float:
    """
    Deriva sentiment score (0–100) a partir de dados reais.
    - Base: média ponderada do 24h change dos setores principais
    - Boost/penalty: fluxo ETF BTC (institucional)
    """
    base = 50.0  # neutro como fallback

    if isinstance(spotlight, dict) and "sector" in spotlight:
        sectors = spotlight["sector"]
        if sectors:
            changes = [s.get("change_pct_24h", 0) for s in sectors]
            avg_change = sum(changes) / len(changes)
            # Normaliza: +10% change → score ~75, -10% → score ~25
            base = 50 + (avg_change * 250)  # 1% change = 2.5 pontos
            base = max(5, min(95, base))

    # Ajuste por fluxo ETF (institucional signal)
    if isinstance(etf_flow, dict):
        inflow_7d = etf_flow.get("total_7d_inflow_usd", 0)
        if inflow_7d > 1_000_000_000:   # >$1B inflow
            base = min(95, base + 8)
        elif inflow_7d > 0:
            base = min(95, base + 3)
        elif inflow_7d < -1_000_000_000:  # >$1B outflow
            base = max(5, base - 8)
        elif inflow_7d < 0:
            base = max(5, base - 3)

    return round(base, 1)


def _derive_stance(score: float, etf_flow: Any, macro_events: Any) -> tuple:
    """Deriva macro_stance e reason a partir do score e dados reais."""
    # Verifica se há evento macro crítico próximo
    critical_upcoming = ""
    if isinstance(macro_events, list):
        for ev in macro_events[:3]:
            events_list = ev.get("events", [])
            critical = [e for e in events_list if any(k in e for k in ["CPI", "FOMC", "NFP", "Nonfarm"])]
            if critical:
                critical_upcoming = f" Upcoming macro: {', '.join(critical)} on {ev.get('date', '?')}."
                break

    etf_note = ""
    if isinstance(etf_flow, dict):
        inflow = etf_flow.get("total_7d_inflow_usd", 0)
        if inflow != 0:
            sign = "+" if inflow > 0 else ""
            etf_note = f" BTC ETF 7d flow: {sign}${inflow/1e9:.2f}B."

    if score <= 25:
        return "risk-off", f"Sentiment at {score}/100 (Extreme Fear). High risk-off. Stablecoin buffer 20%.{etf_note}{critical_upcoming}"
    elif score <= 45:
        return "risk-off", f"Sentiment at {score}/100 (Fear). Cautious. Buffer 10%.{etf_note}{critical_upcoming}"
    elif score <= 60:
        return "risk-neutral", f"Sentiment at {score}/100 (Neutral). Baseline allocation.{etf_note}{critical_upcoming}"
    elif score <= 75:
        return "risk-on", f"Sentiment at {score}/100 (Greed). Full allocation, minimal buffer.{etf_note}{critical_upcoming}"
    else:
        return "risk-on", f"Sentiment at {score}/100 (Extreme Greed). Peak momentum — watch for reversal.{etf_note}{critical_upcoming}"


def get_stablecoin_buffer_from_sentiment(score: float) -> float:
    if score <= 15:  return 30.0
    elif score <= 25: return 20.0
    elif score <= 40: return 10.0
    elif score <= 60: return 5.0
    else:             return 0.0


def _score_to_label(score: float) -> str:
    if score <= 20:  return "Extreme Fear"
    elif score <= 40: return "Fear"
    elif score <= 60: return "Neutral"
    elif score <= 80: return "Greed"
    else:             return "Extreme Greed"
