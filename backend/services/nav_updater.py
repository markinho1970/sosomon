"""
NAV Updater — fecha o ciclo de rentabilidade real do SoSoMon.

Fontes de preço: SoDEX (primário) + SoSoValue klines (fallback). Sem CoinGecko.

A cada hora:
1. Busca preços de todos os constituintes via SoDEX spot + SoSoValue klines
2. Calcula variação 7d/30d a partir do histórico de candles
3. Recalcula NAV de cada índice
4. Atualiza current_value_usd de todos os portfolios
5. Atualiza métricas de retorno e high-water mark
"""

import logging
from datetime import datetime, timezone

from database import SessionLocal
from models import AlphaIndex, IndexConstituent, SubscriberPortfolio

logger = logging.getLogger(__name__)


async def _fetch_prices() -> dict:
    """
    Busca preços de todos os constituintes ativos.
    1º: SoDEX spot (preço + volume)
    2º: SoSoValue klines (preço + variação 7d/30d)
    Retorna dict keyed por símbolo: {current_price_usd, volume_24h_usd, price_change_7d, price_change_30d}
    """
    from services.sodex import get_all_tickers
    from services import sosovalue

    db = SessionLocal()
    try:
        constituents = db.query(IndexConstituent).filter(
            IndexConstituent.is_stablecoin == False,
        ).all()
        symbols = list({c.symbol for c in constituents if c.symbol})
    finally:
        db.close()

    if not symbols:
        return {}

    prices: dict = {}

    # ── 1. SoDEX spot prices ──────────────────────────────────────────────────
    try:
        tickers = await get_all_tickers()
        for sym in symbols:
            t = tickers.get(f"{sym}-USD") or tickers.get(f"{sym}-USDC")
            if t:
                price = float(t.get("lastPrice", t.get("c", 0)) or 0)
                if price > 0:
                    prices[sym] = {
                        "current_price_usd": price,
                        "volume_24h_usd": float(t.get("volume24h", t.get("v", 0)) or 0),
                        "price_change_7d": 0.0,
                        "price_change_30d": 0.0,
                    }
    except Exception as e:
        logger.warning(f"NAV Updater: erro SoDEX tickers: {e}")

    # ── 2. SoSoValue klines (preço e histórico para todos os símbolos) ────────
    try:
        await sosovalue._ensure_currency_cache()
        for sym in symbols:
            cid = sosovalue._CURRENCY_CACHE.get(sym.upper())
            if not cid:
                continue
            try:
                klines = await sosovalue.get_currency_klines(cid, limit=31)
                if not klines:
                    continue
                closes = []
                for k in klines:
                    v = k.get("close") or k.get("c") or k.get("closePrice") or 0
                    try:
                        v = float(v)
                    except Exception:
                        v = 0.0
                    if v > 0:
                        closes.append(v)
                if not closes:
                    continue
                current_price = closes[-1]
                change_7d = round((closes[-1] - closes[-8]) / closes[-8] * 100, 2) if len(closes) >= 8 else 0.0
                change_30d = round((closes[-1] - closes[0]) / closes[0] * 100, 2) if len(closes) >= 30 else 0.0

                if sym in prices:
                    # Complementa SoDEX com dados de momentum
                    prices[sym]["price_change_7d"] = change_7d
                    prices[sym]["price_change_30d"] = change_30d
                    if prices[sym]["current_price_usd"] <= 0:
                        prices[sym]["current_price_usd"] = current_price
                else:
                    prices[sym] = {
                        "current_price_usd": current_price,
                        "volume_24h_usd": 0.0,
                        "price_change_7d": change_7d,
                        "price_change_30d": change_30d,
                    }
            except Exception as e:
                logger.warning(f"NAV Updater: klines {sym}: {e}")
    except Exception as e:
        logger.warning(f"NAV Updater: erro SoSoValue klines: {e}")

    logger.info(f"NAV Updater: preços obtidos para {len(prices)}/{len(symbols)} tokens (SoDEX + SoSoValue)")
    return prices


async def _fetch_fund_usdc() -> float:
    """Saldo USDC da fund wallet na rede Base."""
    try:
        from services.deposit_monitor import NETWORKS, _configured, _usdc_balance
        net = NETWORKS["mainnet"]
        if not _configured(net):
            return 0.0
        return await _usdc_balance("mainnet", net["usdc"], net["fund_wallet"])
    except Exception as e:
        logger.warning(f"NAV Updater: erro ao buscar saldo fund wallet: {e}")
        return 0.0


async def _fetch_sodex_portfolio() -> dict:
    """Posições reais na conta SoDEX."""
    try:
        from services import sodex
        return await sodex.get_portfolio_snapshot()
    except Exception as e:
        logger.warning(f"NAV Updater: erro portfolio SoDEX: {e}")
        return {"total_usd": 0.0, "positions": [], "configured": False}


def _weighted_return_from_prices(constituents: list, prices: dict, old_nav: float) -> tuple:
    """Calcula retorno ponderado com base nos preços novos vs anteriores."""
    weighted_change = 0.0
    return_7d = 0.0
    return_30d = 0.0

    for c in constituents:
        if c.is_stablecoin:
            continue
        weight_frac = (c.weight or 0) / 100.0
        data = prices.get(c.symbol)
        if not data:
            continue
        new_price = data.get("current_price_usd") or 0
        old_price = c.current_price_usd or 0
        if old_price > 0 and new_price > 0:
            weighted_change += weight_frac * ((new_price - old_price) / old_price)
        return_7d  += weight_frac * (data.get("price_change_7d")  or 0)
        return_30d += weight_frac * (data.get("price_change_30d") or 0)

    new_nav = round(old_nav * (1 + weighted_change), 6)
    return max(new_nav, 0.0001), round(return_7d, 2), round(return_30d, 2)


def _update_constituent_prices(constituents: list, prices: dict):
    """Aplica preços novos nos registros de constituintes."""
    for c in constituents:
        if c.is_stablecoin:
            continue
        data = prices.get(c.symbol)
        if not data:
            continue
        if data.get("current_price_usd"):
            c.current_price_usd = data["current_price_usd"]
        if data.get("volume_24h_usd"):
            c.volume_24h_usd = data["volume_24h_usd"]
        if data.get("price_change_7d"):
            c.price_change_7d = data["price_change_7d"]
        if data.get("price_change_30d"):
            c.price_change_30d = data["price_change_30d"]


async def _btc_30d_return(prices: dict) -> float:
    """Retorno 30d do BTC como benchmark."""
    btc = prices.get("BTC") or prices.get("WBTC")
    if btc:
        return round(btc.get("price_change_30d") or 0, 2)
    try:
        from services import sosovalue
        await sosovalue._ensure_currency_cache()
        cid = sosovalue._CURRENCY_CACHE.get("BTC")
        if cid:
            klines = await sosovalue.get_currency_klines(cid, limit=31)
            if klines:
                closes = [float(k.get("close", k.get("c", 0)) or 0) for k in klines]
                closes = [c for c in closes if c > 0]
                if len(closes) >= 30:
                    return round((closes[-1] - closes[0]) / closes[0] * 100, 2)
    except Exception:
        pass
    return 0.0


# ─── Job principal ────────────────────────────────────────────────────────────

async def update_all_navs():
    """Job principal — chamado pelo scheduler a cada hora."""
    logger.info("NAV Updater: iniciando ciclo de atualização")

    prices         = await _fetch_prices()
    fund_usdc      = await _fetch_fund_usdc()
    sodex_snapshot = await _fetch_sodex_portfolio()
    sodex_total    = sodex_snapshot.get("total_usd", 0.0)
    sodex_ok       = sodex_snapshot.get("configured", False)

    if not prices:
        logger.warning("NAV Updater: nenhum preço obtido — abortando")
        return

    btc_30d = await _btc_30d_return(prices)

    db = SessionLocal()
    try:
        indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
        if not indexes:
            return

        total_aum_all = sum(i.aum_usd or 0 for i in indexes) or 1.0

        for index in indexes:
            try:
                old_nav = index.nav_usd or 1.0
                constituents = db.query(IndexConstituent).filter(
                    IndexConstituent.index_id == index.id
                ).all()

                new_nav, ret_7d, ret_30d = _weighted_return_from_prices(constituents, prices, old_nav)

                portfolios = db.query(SubscriberPortfolio).filter(
                    SubscriberPortfolio.index_id == index.id
                ).all()
                total_tokens = sum(p.index_tokens_held or 0 for p in portfolios)

                if sodex_ok and sodex_total > 0 and total_tokens > 0:
                    index_share = (index.aum_usd or 0) / total_aum_all
                    real_total  = sodex_total + fund_usdc
                    nav_real    = (real_total * index_share) / total_tokens
                    new_nav     = round(0.70 * new_nav + 0.30 * nav_real, 6)
                    new_nav     = max(new_nav, 0.0001)

                index.nav_usd           = new_nav
                index.aum_usd           = round(total_tokens * new_nav, 2)
                index.total_return_pct  = round((new_nav - 1.0) * 100, 2)
                index.return_7d_pct     = ret_7d
                index.return_30d_pct    = ret_30d
                index.btc_benchmark_30d = btc_30d

                _update_constituent_prices(constituents, prices)

                for p in portfolios:
                    p.current_value_usd = round((p.index_tokens_held or 0) * new_nav, 4)
                    p.last_updated_at   = datetime.now(timezone.utc)
                    if p.first_invested_at:
                        delta = datetime.now(timezone.utc) - p.first_invested_at.replace(tzinfo=timezone.utc)
                        p.days_invested = max(delta.days, 0)
                    if p.current_value_usd > (p.high_water_mark_usd or 0):
                        p.high_water_mark_usd = p.current_value_usd

                nav_chg = (new_nav - old_nav) / old_nav * 100 if old_nav > 0 else 0
                logger.info(
                    f"NAV Updater [{index.name}]: "
                    f"NAV {old_nav:.4f} → {new_nav:.4f} ({nav_chg:+.3f}%) | "
                    f"30d: {ret_30d:+.2f}% | "
                    f"Portfolios: {len(portfolios)}"
                )

            except Exception as e:
                logger.error(f"NAV Updater: erro em {index.name}: {e}", exc_info=True)

        db.commit()
        logger.info(f"NAV Updater: {len(indexes)} índices atualizados — fund USDC: ${fund_usdc:.2f}")

    except Exception as e:
        logger.error(f"NAV Updater: erro geral: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
