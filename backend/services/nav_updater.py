"""
NAV Updater — fecha o ciclo de rentabilidade real do SoSoMon.

A cada hora:
1. Busca preços atuais de todos os constituintes via CoinGecko (batch)
2. Busca posições reais da conta SoDEX (tokens comprados pelo Rebalancer)
3. Busca saldo USDC da fund wallet na rede Base
4. Recalcula NAV de cada índice: AUM real ÷ total de tokens emitidos
5. Atualiza current_value_usd de todos os portfolios de investidores
6. Atualiza métricas de retorno (total, 7d, 30d) e high-water mark

Resultado: investidores veem P&L real no dashboard.
"""

import logging
from datetime import datetime, timezone

from database import SessionLocal
from models import AlphaIndex, IndexConstituent, SubscriberPortfolio

logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _fetch_prices() -> dict:
    """Busca preços de todos os constituintes ativos via CoinGecko (1 chamada batch)."""
    from services import coingecko
    from models import IndexConstituent

    db = SessionLocal()
    try:
        constituents = db.query(IndexConstituent).filter(
            IndexConstituent.coingecko_id.isnot(None),
            IndexConstituent.is_stablecoin == False,
        ).all()
        ids = list({c.coingecko_id for c in constituents if c.coingecko_id})
    finally:
        db.close()

    if not ids:
        return {}

    prices = await coingecko.get_market_data_batch(ids)
    logger.info(f"NAV Updater: preços CoinGecko obtidos para {len(prices)}/{len(ids)} tokens")
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
    """Posições reais na conta SoDEX (tokens comprados pelo Rebalancer)."""
    try:
        from services import sodex
        snapshot = await sodex.get_portfolio_snapshot()
        return snapshot
    except Exception as e:
        logger.warning(f"NAV Updater: erro ao buscar portfolio SoDEX: {e}")
        return {"total_usd": 0.0, "positions": [], "configured": False}


def _weighted_return_from_prices(
    constituents: list, prices: dict, old_nav: float
) -> tuple[float, float, float]:
    """
    Calcula retorno ponderado com base nos preços novos vs. preços anteriores.

    Retorna: (new_nav, return_7d_pct, return_30d_pct)
    """
    weighted_change = 0.0
    return_7d = 0.0
    return_30d = 0.0
    total_non_stable_weight = 0.0

    for c in constituents:
        weight_frac = (c.weight or 0) / 100.0

        if c.is_stablecoin:
            # Stablecoin: contribuição zero para variação de preço
            continue

        total_non_stable_weight += weight_frac

        if not c.coingecko_id or c.coingecko_id not in prices:
            continue

        data = prices[c.coingecko_id]
        new_price = data.get("current_price_usd") or 0
        old_price = c.current_price_usd or 0

        if old_price > 0 and new_price > 0:
            price_change = (new_price - old_price) / old_price
            weighted_change += weight_frac * price_change

        return_7d  += weight_frac * (data.get("price_change_7d")  or 0)
        return_30d += weight_frac * (data.get("price_change_30d") or 0)

    new_nav = round(old_nav * (1 + weighted_change), 6)
    return max(new_nav, 0.0001), round(return_7d, 2), round(return_30d, 2)


def _update_constituent_prices(constituents: list, prices: dict):
    """Aplica preços novos nos registros de constituintes (em-memória, db.commit fora)."""
    for c in constituents:
        if c.is_stablecoin or not c.coingecko_id:
            continue
        data = prices.get(c.coingecko_id)
        if not data:
            continue
        c.current_price_usd = data.get("current_price_usd", c.current_price_usd)
        c.market_cap_usd    = data.get("market_cap_usd",    c.market_cap_usd)
        c.volume_24h_usd    = data.get("volume_24h_usd",    c.volume_24h_usd)
        c.price_change_7d   = data.get("price_change_7d",   c.price_change_7d)
        c.price_change_30d  = data.get("price_change_30d",  c.price_change_30d)


async def _btc_30d_return(prices: dict) -> float:
    """Retorno 30d do BTC (benchmark). Usa dado já no batch se disponível."""
    btc_data = prices.get("bitcoin")
    if btc_data:
        return round(btc_data.get("price_change_30d") or 0, 2)
    # Fallback: chamada individual
    try:
        from services.coingecko import get_token_data
        data = await get_token_data("bitcoin")
        return round((data or {}).get("price_change_30d") or 0, 2)
    except Exception:
        return 0.0


# ─── Job principal ────────────────────────────────────────────────────────────

async def update_all_navs():
    """
    Job principal — chamado pelo scheduler a cada hora.
    Atualiza preços, NAV e portfolios de todos os índices ativos.
    """
    logger.info("NAV Updater: iniciando ciclo de atualização")

    # ── 1. Dados externos (paralelo conceptualmente, sequencial aqui) ──────────
    prices          = await _fetch_prices()
    fund_usdc       = await _fetch_fund_usdc()
    sodex_snapshot  = await _fetch_sodex_portfolio()
    sodex_total_usd = sodex_snapshot.get("total_usd", 0.0)
    sodex_configured = sodex_snapshot.get("configured", False)

    if not prices:
        logger.warning("NAV Updater: nenhum preço obtido do CoinGecko — abortando")
        return

    btc_30d = await _btc_30d_return(prices)

    db = SessionLocal()
    try:
        indexes = db.query(AlphaIndex).filter(AlphaIndex.is_active == True).all()
        if not indexes:
            logger.info("NAV Updater: nenhum índice ativo")
            return

        # AUM total de todos os índices (para distribuição proporcional do SoDEX)
        total_aum_all = sum(i.aum_usd or 0 for i in indexes) or 1.0

        for index in indexes:
            try:
                old_nav = index.nav_usd or 1.0

                constituents = db.query(IndexConstituent).filter(
                    IndexConstituent.index_id == index.id
                ).all()

                # ── 2. Recalcula NAV pelo retorno ponderado dos preços ─────────
                new_nav, ret_7d, ret_30d = _weighted_return_from_prices(
                    constituents, prices, old_nav
                )

                # ── 3. Se SoDEX está ativo, incorpora AUM real ────────────────
                # Distribui o portfolio SoDEX proporcionalmente ao peso de cada índice
                portfolios = db.query(SubscriberPortfolio).filter(
                    SubscriberPortfolio.index_id == index.id
                ).all()

                total_tokens = sum(p.index_tokens_held or 0 for p in portfolios)

                if sodex_configured and sodex_total_usd > 0 and total_tokens > 0:
                    # Parcela do SoDEX + fund wallet atribuída a este índice
                    index_share = (index.aum_usd or 0) / total_aum_all
                    real_total  = sodex_total_usd + fund_usdc
                    index_aum_real = real_total * index_share

                    # NAV real = AUM real ÷ tokens emitidos
                    nav_from_real_aum = index_aum_real / total_tokens

                    # Blend: 70% preço-ponderado (mais estável) + 30% AUM real SoDEX
                    new_nav = round(0.70 * new_nav + 0.30 * nav_from_real_aum, 6)
                    new_nav = max(new_nav, 0.0001)

                    logger.info(
                        f"NAV Updater [{index.name}]: "
                        f"SoDEX AUM share ${index_aum_real:.2f} | "
                        f"NAV real: {nav_from_real_aum:.4f} | "
                        f"NAV blended: {new_nav:.4f}"
                    )

                # ── 4. Atualiza métricas do índice ────────────────────────────
                index.nav_usd          = new_nav
                index.aum_usd          = round(total_tokens * new_nav, 2)
                index.total_return_pct = round((new_nav - 1.0) * 100, 2)
                index.return_7d_pct    = ret_7d
                index.return_30d_pct   = ret_30d
                index.btc_benchmark_30d = btc_30d

                # ── 5. Atualiza preços dos constituintes ──────────────────────
                _update_constituent_prices(constituents, prices)

                # ── 6. Atualiza portfolios dos investidores ───────────────────
                updated = 0
                for portfolio in portfolios:
                    new_value = round((portfolio.index_tokens_held or 0) * new_nav, 4)
                    portfolio.current_value_usd = new_value
                    portfolio.last_updated_at   = datetime.now(timezone.utc)

                    # Atualiza days_invested
                    if portfolio.first_invested_at:
                        delta = datetime.now(timezone.utc) - portfolio.first_invested_at.replace(tzinfo=timezone.utc)
                        portfolio.days_invested = max(delta.days, 0)

                    # Atualiza HWM se valor atual é o maior histórico
                    if new_value > (portfolio.high_water_mark_usd or 0):
                        portfolio.high_water_mark_usd = new_value

                    updated += 1

                nav_change_pct = (new_nav - old_nav) / old_nav * 100 if old_nav > 0 else 0
                logger.info(
                    f"NAV Updater [{index.name}]: "
                    f"NAV {old_nav:.4f} → {new_nav:.4f} ({nav_change_pct:+.3f}%) | "
                    f"AUM: ${index.aum_usd:,.2f} | "
                    f"Retorno total: {index.total_return_pct:+.2f}% | "
                    f"30d: {ret_30d:+.2f}% | "
                    f"Portfolios: {updated}"
                )

            except Exception as e:
                logger.error(f"NAV Updater: erro no índice {index.name}: {e}", exc_info=True)
                continue

        db.commit()
        logger.info(f"NAV Updater: {len(indexes)} índices atualizados — fund USDC: ${fund_usdc:.2f}")

    except Exception as e:
        logger.error(f"NAV Updater: erro geral: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
