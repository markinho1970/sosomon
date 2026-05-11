"""
SoDEX API Service — Integração real com mainnet-gw.sodex.dev

Autenticação EIP-712:
  Headers: X-API-Key, X-API-Sign, X-API-Nonce
  chainId mainnet: 286623

Endpoints base:
  Spot:  https://mainnet-gw.sodex.dev/api/v1/spot
  Perps: https://mainnet-gw.sodex.dev/api/v1/perps
"""

import os
import json
import uuid
import httpx
from typing import Optional, Dict, Any, List
from loguru import logger

from utils.eip712 import get_public_headers, get_signed_headers
from utils.crypto import get_private_key

SODEX_API_KEY    = os.getenv("SODEX_API_KEY", "")
SODEX_WALLET_ADDR = os.getenv("SODEX_WALLET_ADDRESS", "")
SODEX_ACCOUNT_ID  = os.getenv("SODEX_ACCOUNT_ID", "0")
USE_TESTNET       = os.getenv("SODEX_USE_TESTNET", "false").lower() == "true"

_NET      = "testnet" if USE_TESTNET else "mainnet"
BASE_SPOT = f"https://{_NET}-gw.sodex.dev/api/v1/spot"
TIMEOUT   = 15

_PUB  = lambda: get_public_headers(SODEX_API_KEY)
_SIGN = lambda p: get_signed_headers(SODEX_API_KEY, p, get_private_key(), USE_TESTNET)


def _configured() -> bool:
    return bool(SODEX_API_KEY)


def _can_trade() -> bool:
    try:
        return bool(SODEX_API_KEY and get_private_key() and SODEX_WALLET_ADDR)
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════════════════
#  MARKET DATA  (público)
# ═══════════════════════════════════════════════════════════════════════════════

async def get_markets() -> List[Dict]:
    """Todos os símbolos spot com regras de trading."""
    if not _configured():
        return []
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{BASE_SPOT}/markets/symbols", headers=_PUB())
            r.raise_for_status()
            data = r.json().get("data", [])
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"SoDEX get_markets: {e}")
        return []


async def get_all_tickers() -> Dict[str, Dict]:
    """Tickers de todos os mercados (24h stats). Retorna dict keyed por symbol name."""
    if not _configured():
        return {}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{BASE_SPOT}/markets/tickers", headers=_PUB())
            r.raise_for_status()
            items = r.json().get("data", [])
            if isinstance(items, list):
                return {i.get("s", i.get("symbol", "")): i for i in items}
            return {}
    except Exception as e:
        logger.error(f"SoDEX get_all_tickers: {e}")
        return {}


async def get_ticker(symbol: str) -> Optional[Dict]:
    """Ticker de um símbolo específico (ex: BTC-USDC)."""
    if not _configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{BASE_SPOT}/markets/tickers",
                            headers=_PUB(), params={"symbol": symbol})
            r.raise_for_status()
            data = r.json().get("data", [])
            return data[0] if isinstance(data, list) and data else data
    except Exception as e:
        logger.error(f"SoDEX get_ticker({symbol}): {e}")
        return None


async def get_orderbook(symbol: str, depth: int = 20) -> Optional[Dict]:
    """Orderbook de um mercado."""
    if not _configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{BASE_SPOT}/markets/{symbol}/orderbook",
                            headers=_PUB(), params={"limit": depth})
            r.raise_for_status()
            return r.json().get("data")
    except Exception as e:
        logger.error(f"SoDEX get_orderbook({symbol}): {e}")
        return None


async def get_candles(symbol: str, interval: str = "1D", limit: int = 30) -> List[Dict]:
    """Candles OHLCV. Intervals: 1m, 5m, 15m, 1h, 4h, 1D."""
    if not _configured():
        return []
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{BASE_SPOT}/markets/{symbol}/klines",
                            headers=_PUB(),
                            params={"interval": interval, "limit": limit})
            r.raise_for_status()
            data = r.json().get("data", [])
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"SoDEX get_candles({symbol}): {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════════
#  ACCOUNT  (autenticado — GET com X-API-Key + assinatura)
# ═══════════════════════════════════════════════════════════════════════════════

async def get_balances() -> Dict[str, Any]:
    """Saldos da fund wallet."""
    if not _can_trade():
        logger.warning("SoDEX: credenciais não configuradas")
        return {}
    try:
        payload = {"accountID": SODEX_ACCOUNT_ID}
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(
                f"{BASE_SPOT}/accounts/{SODEX_WALLET_ADDR}/balances",
                headers=_SIGN(payload),
                params={"accountID": SODEX_ACCOUNT_ID},
            )
            r.raise_for_status()
            data = r.json().get("data", [])
            # Converte lista para dict keyed por coin symbol
            if isinstance(data, list):
                return {b.get("coin", b.get("id", "")): b for b in data}
            return data
    except Exception as e:
        logger.error(f"SoDEX get_balances: {e}")
        return {}


async def get_open_orders(symbol: Optional[str] = None) -> List[Dict]:
    """Ordens abertas da fund wallet."""
    if not _can_trade():
        return []
    try:
        payload = {"accountID": SODEX_ACCOUNT_ID}
        params = {"accountID": SODEX_ACCOUNT_ID}
        if symbol:
            params["symbol"] = symbol
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(
                f"{BASE_SPOT}/accounts/{SODEX_WALLET_ADDR}/orders",
                headers=_SIGN(payload),
                params=params,
            )
            r.raise_for_status()
            data = r.json().get("data", [])
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"SoDEX get_open_orders: {e}")
        return []


async def get_trade_history(symbol: Optional[str] = None, limit: int = 50) -> List[Dict]:
    """Histórico de trades executados."""
    if not _can_trade():
        return []
    try:
        payload = {"accountID": SODEX_ACCOUNT_ID}
        params = {"accountID": SODEX_ACCOUNT_ID, "limit": limit}
        if symbol:
            params["symbol"] = symbol
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(
                f"{BASE_SPOT}/accounts/{SODEX_WALLET_ADDR}/trades",
                headers=_SIGN(payload),
                params=params,
            )
            r.raise_for_status()
            data = r.json().get("data", [])
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"SoDEX get_trade_history: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════════
#  TRADING  (autenticado — POST com assinatura EIP-712)
# ═══════════════════════════════════════════════════════════════════════════════

async def place_order(
    symbol: str,
    symbol_id: int,
    side: str,        # "BUY" | "SELL"
    order_type: str,  # "LIMIT" | "MARKET"
    quantity: str,
    price: str = None,
    client_order_id: str = None,
    time_in_force: str = "GTC",
) -> Optional[Dict]:
    """
    Coloca uma ordem no SoDEX via batch endpoint.

    Args:
        symbol: ex "BTC-USDC"
        symbol_id: ID numérico do símbolo (obtido via get_markets)
        side: "BUY" ou "SELL"
        order_type: "LIMIT" ou "MARKET"
        quantity: string decimal ex "0.001"
        price: string decimal, obrigatório para LIMIT
        client_order_id: ID único do cliente (gerado automaticamente se omitido)
    """
    if not _can_trade():
        logger.error("SoDEX: não é possível colocar ordens sem credenciais")
        return None

    clord_id = client_order_id or str(uuid.uuid4())[:36]

    order = {
        "symbolID": symbol_id,
        "clOrdID":  clord_id,
        "side":     side,
        "type":     order_type,
        "timeInForce": time_in_force,
        "quantity": quantity,
    }
    if price and order_type == "LIMIT":
        order["price"] = price

    payload = {
        "accountID": int(SODEX_ACCOUNT_ID),
        "orders": [order],
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post(
                f"{BASE_SPOT}/trade/orders/batch",
                headers=_SIGN(payload),
                content=json.dumps(payload, separators=(",", ":")),
            )
            r.raise_for_status()
            result = r.json()
            logger.success(f"SoDEX order placed: {side} {quantity} {symbol} @ {price or 'market'}")
            return result
    except Exception as e:
        logger.error(f"SoDEX place_order({symbol}): {e}")
        return None


async def cancel_orders(symbol: str, symbol_id: int, order_ids: List[str]) -> bool:
    """Cancela ordens pelo ID do cliente."""
    if not _can_trade():
        return False
    try:
        payload = {
            "accountID": int(SODEX_ACCOUNT_ID),
            "orders": [{"symbolID": symbol_id, "clOrdID": oid} for oid in order_ids],
        }
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.request(
                "DELETE",
                f"{BASE_SPOT}/trade/orders/batch",
                headers=_SIGN(payload),
                content=json.dumps(payload, separators=(",", ":")),
            )
            r.raise_for_status()
            logger.info(f"SoDEX: {len(order_ids)} ordens canceladas em {symbol}")
            return True
    except Exception as e:
        logger.error(f"SoDEX cancel_orders({symbol}): {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS para os Agents
# ═══════════════════════════════════════════════════════════════════════════════

async def get_portfolio_snapshot() -> Dict[str, Any]:
    """
    Snapshot do portfolio: saldos + valor USD de cada posição.
    Usado pelo Rebalancer para calcular pesos atuais.
    """
    balances = await get_balances()
    tickers  = await get_all_tickers()

    positions = []
    total_usd = 0.0

    for coin, bal in balances.items():
        available = float(bal.get("total", 0)) - float(bal.get("locked", 0))
        if coin in ("USDC", "USDT", "USD"):
            usd_value = available
        else:
            sym    = f"{coin}-USDC"
            ticker = tickers.get(sym, {})
            price  = float(ticker.get("c", ticker.get("price", 0)))
            usd_value = available * price

        positions.append({
            "asset":     coin,
            "amount":    available,
            "usd_value": usd_value,
        })
        total_usd += usd_value

    for p in positions:
        p["weight_pct"] = round((p["usd_value"] / total_usd * 100) if total_usd > 0 else 0, 2)

    return {
        "positions":          positions,
        "total_usd":          total_usd,
        "network":            _NET,
        "wallet":             SODEX_WALLET_ADDR,
        "configured":         _can_trade(),
    }


async def get_symbol_id(symbol: str) -> Optional[int]:
    """Busca o symbolID numérico necessário para ordens."""
    markets = await get_markets()
    for m in markets:
        if m.get("name") == symbol or m.get("displayName") == symbol:
            return m.get("id")
    return None


async def execute_rebalance_trades(
    target_weights: Dict[str, float],
    dry_run: bool = True,
) -> List[Dict]:
    """
    Executa rebalanceamento para atingir pesos alvo via SoDEX.
    dry_run=True apenas loga sem executar.
    """
    snapshot  = await get_portfolio_snapshot()
    total_usd = snapshot["total_usd"]
    current   = {p["asset"]: p for p in snapshot["positions"]}
    tickers   = await get_all_tickers()

    orders = []

    for asset, target_pct in target_weights.items():
        if asset in ("USDC", "USDT", "USD"):
            continue

        target_usd  = total_usd * (target_pct / 100)
        current_usd = current.get(asset, {}).get("usd_value", 0)
        diff_usd    = target_usd - current_usd

        if abs(diff_usd) < 10:
            continue

        sym    = f"{asset}-USDC"
        ticker = tickers.get(sym, {})
        price  = float(ticker.get("c", ticker.get("price", 0)))

        if price <= 0:
            logger.warning(f"SoDEX rebalance: sem preço para {sym}")
            continue

        size      = abs(diff_usd) / price
        side      = "BUY" if diff_usd > 0 else "SELL"
        qty_str   = f"{size:.8f}"
        price_str = f"{price:.2f}"

        order_info = {
            "symbol":    sym,
            "side":      side,
            "quantity":  qty_str,
            "price":     price_str,
            "usd_value": abs(diff_usd),
            "reason":    f"{asset} {current.get(asset, {}).get('weight_pct', 0):.1f}% → {target_pct:.1f}%",
        }

        if dry_run:
            logger.info(f"[DRY RUN] {side} {qty_str} {sym} @ ${price_str}")
            order_info["status"] = "dry_run"
        else:
            sym_id = await get_symbol_id(sym)
            if sym_id:
                result = await place_order(sym, sym_id, side, "LIMIT", qty_str, price_str)
                order_info["status"] = "placed" if result else "failed"
            else:
                logger.warning(f"SoDEX: symbolID não encontrado para {sym}")
                order_info["status"] = "no_symbol"

        orders.append(order_info)

    return orders
