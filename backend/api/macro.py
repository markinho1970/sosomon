from fastapi import APIRouter, Query
from schemas import ApiResponse
from services import sosovalue

router = APIRouter(prefix="/api/macro", tags=["macro"])


@router.get("")
async def get_macro():
    """Contexto macro completo: sector flows, ETF, eventos, stance dos agents."""
    macro = await sosovalue.get_macro_context()
    return ApiResponse(data=macro)


@router.get("/etf")
async def get_etf_flow(symbol: str = "BTC", country_code: str = "US"):
    """Fluxo de ETF spot (BTC, ETH, SOL) com histórico 7 dias."""
    data = await sosovalue.get_btc_etf_flow_summary() if symbol == "BTC" else \
           await sosovalue.get_etf_summary(symbol, country_code, 7)
    return ApiResponse(data=data)


@router.get("/news")
async def get_news(limit: int = Query(default=10, le=50)):
    """Notícias crypto em tempo real da SoSoValue."""
    data = await sosovalue.get_hot_news(limit=limit)
    return ApiResponse(data=data)


@router.get("/news/theme/{theme}")
async def get_theme_news(theme: str, limit: int = Query(default=5, le=20)):
    """Notícias filtradas por tema: ai-crypto, rwa, depin."""
    data = await sosovalue.get_news_for_theme(theme, limit)
    return ApiResponse(data=data)


@router.get("/indexes")
async def get_ssi_indexes():
    """Lista todos os indexes SoSoValue como benchmark (ssiAI, ssiRWA, ssiDePIN, etc.)."""
    indexes = await sosovalue.get_all_ssi_indexes()
    result = []
    for ticker in indexes:
        snap = await sosovalue.get_index_snapshot(ticker)
        if snap:
            result.append({"ticker": ticker, **snap})
    return ApiResponse(data=result)


@router.get("/indexes/{ticker}")
async def get_ssi_index_detail(ticker: str):
    """Detalhes de um index SoSoValue: snapshot + constituents + histórico."""
    snap = await sosovalue.get_index_snapshot(ticker)
    constituents = await sosovalue.get_index_constituents(ticker)
    klines = await sosovalue.get_index_klines(ticker, limit=30)
    return ApiResponse(data={
        "ticker": ticker,
        "snapshot": snap,
        "constituents": constituents,
        "klines": klines,
    })


@router.get("/calendar")
async def get_macro_calendar():
    """Calendário de eventos macro: CPI, NFP, FOMC, etc."""
    data = await sosovalue.get_macro_events()
    return ApiResponse(data=data)


@router.get("/sectors")
async def get_sector_flows():
    """Performance 24h de cada setor cripto com market cap dominance."""
    data = await sosovalue.get_sector_spotlight()
    return ApiResponse(data=data)
