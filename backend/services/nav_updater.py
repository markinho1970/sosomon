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

import asyncio
import logging
from datetime import datetime, timezone

from database import SessionLocal
from models import AlphaIndex, IndexConstituent, SubscriberPortfolio, PortfolioSnapshot, IndexHolding

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
            IndexConstituent.network_mode == 'mainnet',
        ).all()
        symbols = list({c.symbol for c in constituents if c.symbol})
    finally:
        db.close()

    if not symbols:
        return {}

    prices: dict = {}

    # ── 1. SoDEX spot prices ──────────────────────────────────────────────────
    try:
        # NAV sempre usa preços mainnet — decisão arquitetural.
        # Ganhos/perdas testnet são calculados sobre preços reais mainnet.
        tickers = await get_all_tickers(testnet=False)
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
                await asyncio.sleep(3.5)  # 20 req/min rate limit — 3.5s gap
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
    """
    Calcula retorno ponderado usando price_at_nav_ref como referência anterior.
    price_at_nav_ref é atualizado EXCLUSIVAMENTE aqui — scripts externos não o tocam.
    Isso garante que correções manuais de preço nunca contaminem o cálculo de NAV.
    """
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
        # Usa price_at_nav_ref como baseline — isolado de atualizações externas.
        # Fallback para current_price_usd apenas se ref ainda não foi populado.
        ref_price = c.price_at_nav_ref or c.current_price_usd or 0
        if ref_price > 0 and new_price > 0:
            weighted_change += weight_frac * ((new_price - ref_price) / ref_price)
        # Fallback para valor armazenado no constituent quando SoSoValue retorna 401
        ch_7d  = data.get("price_change_7d")  or (c.price_change_7d  or 0)
        ch_30d = data.get("price_change_30d") or (c.price_change_30d or 0)
        return_7d  += weight_frac * ch_7d
        return_30d += weight_frac * ch_30d

    new_nav = round(old_nav * (1 + weighted_change), 6)
    return max(new_nav, 0.0001), round(return_7d, 2), round(return_30d, 2)


def _update_constituent_prices(constituents: list, prices: dict):
    """
    Atualiza current_price_usd (exibição) E price_at_nav_ref (baseline de cálculo).
    Ambos avançam juntos a cada ciclo — garantindo que o próximo ciclo
    calcule apenas o delta desde a última atualização, não desde o início.
    """
    for c in constituents:
        if c.is_stablecoin:
            continue
        data = prices.get(c.symbol)
        if not data:
            continue
        new_price = data.get("current_price_usd") or 0
        if new_price > 0:
            c.current_price_usd = new_price
            c.price_at_nav_ref  = new_price   # avança o baseline para o próximo ciclo
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


# ─── Helpers de cálculo de NAV ───────────────────────────────────────────────

def _nav_from_holdings(index_id: str, prices: dict, mainnet_tokens: float, db) -> float:
    """
    Calcula NAV usando quantidades reais armazenadas em index_holdings.
    Usado como segunda fonte de verdade quando SoDEX get_balances() está indisponível.

    Retorna 0.0 se não há holdings registrados ou se mainnet_tokens <= 0.
    """
    holdings = db.query(IndexHolding).filter(
        IndexHolding.index_id == index_id,
        IndexHolding.network_mode == 'mainnet',
        IndexHolding.quantity > 0,
    ).all()
    if not holdings or mainnet_tokens <= 0:
        return 0.0
    total_value = 0.0
    for h in holdings:
        sym_norm = h.symbol.replace('.', '').lower()
        # Busca preço: tenta símbolo exato, depois normalizado
        price_data = prices.get(h.symbol) or next(
            (pd for s, pd in prices.items() if s.replace('.', '').lower() == sym_norm), None
        )
        if price_data:
            price = price_data.get('current_price_usd', 0)
            total_value += h.quantity * price
    if total_value > 0:
        return round(total_value / mainnet_tokens, 6)
    return 0.0


# ─── Job principal ────────────────────────────────────────────────────────────

async def update_all_navs():
    """Job principal — chamado pelo scheduler a cada hora."""
    logger.info("NAV Updater: iniciando ciclo de atualização")

    prices         = await _fetch_prices()
    fund_usdc      = await _fetch_fund_usdc()
    sodex_snapshot = await _fetch_sodex_portfolio()
    sodex_total    = sodex_snapshot.get("total_usd", 0.0)
    # sodex_ok só é True quando recebemos posições reais — "configured" apenas indica
    # que as credenciais estão setadas, não que get_balances retornou dados válidos.
    sodex_ok       = sodex_snapshot.get("configured", False) and len(sodex_snapshot.get("positions", [])) > 0

    if not prices:
        logger.warning("NAV Updater: nenhum preço obtido — abortando")
        return

    btc_30d = await _btc_30d_return(prices)

    db = SessionLocal()
    try:
        indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
        if not indexes:
            return

        for index in indexes:
            try:
                old_nav = index.nav_usd or 1.0
                constituents = db.query(IndexConstituent).filter(
                    IndexConstituent.index_id == index.id,
                    IndexConstituent.network_mode == 'mainnet',
                ).all()

                # Retorno ponderado por preços (delta incremental desde último ciclo)
                nav_price, ret_7d, ret_30d = _weighted_return_from_prices(constituents, prices, old_nav)

                portfolios = db.query(SubscriberPortfolio).filter(
                    SubscriberPortfolio.index_id == index.id
                ).all()
                mainnet_portfolios = [p for p in portfolios if getattr(p, 'network_mode', 'mainnet') == 'mainnet']
                mainnet_tokens     = sum(p.index_tokens_held or 0 for p in mainnet_portfolios)

                # ── NAV via SoDEX (ground truth mainnet) ──────────────────────────
                # Calcula valor dos investidores somando preço × quantidade de cada
                # token da cesta no SoDEX — resolve o bug de vDEFI.ssi retornar
                # usd_value=0 na API de portfolio; exclui posições admin (USDC, ETH)
                nav_sodex = 0.0
                if sodex_ok and mainnet_tokens > 0:
                    basket_norm = {
                        c.symbol.replace('.', '').lower()
                        for c in constituents
                        if not c.is_stablecoin and (c.weight or 0) > 0
                    }
                    investor_sodex = 0.0
                    for pos in sodex_snapshot.get('positions', []):
                        raw_asset  = pos.get('asset', '')
                        asset      = raw_asset[1:] if raw_asset.startswith('v') else raw_asset
                        asset_norm = asset.replace('.', '').lower()
                        if asset_norm not in basket_norm:
                            continue
                        amount  = float(pos.get('amount', 0))
                        usd_val = float(pos.get('usd_value', 0))
                        if usd_val == 0 and amount > 0:
                            # API não retornou preço — calcular via preços obtidos
                            price_data = prices.get(asset) or next(
                                (pd for sym, pd in prices.items()
                                 if sym.replace('.', '').lower() == asset_norm),
                                None
                            )
                            if price_data:
                                usd_val = amount * price_data.get('current_price_usd', 0)
                        investor_sodex += usd_val
                    if investor_sodex > 0:
                        nav_sodex = investor_sodex / mainnet_tokens
                        logger.info(
                            f"NAV [{index.name}]: SoDEX investor=${investor_sodex:.4f} / "
                            f"tokens={mainnet_tokens:.4f} → nav_sodex=${nav_sodex:.6f}"
                        )

                # Prioridade: 1) SoDEX API (ground truth)  2) index_holdings  3) price-based
                if nav_sodex > 0:
                    new_nav = round(nav_sodex, 6)
                else:
                    nav_holdings = _nav_from_holdings(index.id, prices, mainnet_tokens, db)
                    if nav_holdings > 0:
                        new_nav = nav_holdings
                        logger.info(f"NAV [{index.name}]: holdings → ${nav_holdings:.6f}")
                    else:
                        nav_change_pct = abs((nav_price - old_nav) / old_nav * 100) if old_nav > 0 else 0
                        if nav_change_pct > 5.0:
                            logger.error(
                                f"NAV Updater [{index.name}]: BLOQUEADO — variação de {nav_change_pct:.2f}% "
                                f"sem dados SoDEX. NAV mantido em ${old_nav:.4f}."
                            )
                            new_nav = old_nav
                        else:
                            new_nav = nav_price

                all_tokens = sum(p.index_tokens_held or 0 for p in portfolios)
                index.nav_usd           = new_nav
                index.aum_usd           = round((mainnet_tokens if mainnet_tokens > 0 else all_tokens) * new_nav, 2)
                # total_return_pct relativo ao NAV de entrada dos investidores mainnet,
                # não de 1.0 (que era o NAV hipotético de inception paper trading).
                inception_nav = (
                    min(p.nav_at_first_deposit for p in mainnet_portfolios if (p.nav_at_first_deposit or 0) > 0)
                    if mainnet_portfolios else (old_nav or 1.0)
                )
                index.total_return_pct  = round((new_nav - inception_nav) / inception_nav * 100, 2)
                index.return_7d_pct     = ret_7d
                index.return_30d_pct    = ret_30d
                index.btc_benchmark_30d = btc_30d

                _update_constituent_prices(constituents, prices)

                for p in portfolios:
                    p_mode = getattr(p, 'network_mode', 'mainnet')
                    p_nav  = new_nav if p_mode == 'mainnet' else nav_price
                    p.current_value_usd = round((p.index_tokens_held or 0) * p_nav, 4)
                    p.last_updated_at   = datetime.now(timezone.utc)
                    if p.first_invested_at:
                        delta = datetime.now(timezone.utc) - p.first_invested_at.replace(tzinfo=timezone.utc)
                        p.days_invested = max(delta.days, 0)
                    if p.current_value_usd > (p.high_water_mark_usd or 0):
                        p.high_water_mark_usd = p.current_value_usd

                    try:
                        snapshot = PortfolioSnapshot(
                            portfolio_id=p.id,
                            index_id=p.index_id,
                            network_mode=p_mode,
                            snapshot_at=datetime.now(timezone.utc),
                            value_usd=p.current_value_usd,
                            deposited_usd=p.deposited_usd,
                            nav_per_token=p_nav,
                        )
                        db.add(snapshot)
                    except Exception:
                        pass

                nav_chg = (new_nav - old_nav) / old_nav * 100 if old_nav > 0 else 0
                logger.info(
                    f"NAV Updater [{index.name}]: "
                    f"NAV {old_nav:.4f} → {new_nav:.4f} ({nav_chg:+.3f}%) | "
                    f"30d: {ret_30d:+.2f}% | "
                    f"Mainnet: {len(mainnet_portfolios)}/{len(portfolios)} portfolios"
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
