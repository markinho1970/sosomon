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

from utils.eip712 import get_public_headers, get_signed_headers, ACTION_BATCH_NEW_ORDER, ACTION_BATCH_CANCEL_ORDER
from utils.crypto import get_private_key

SODEX_API_KEY    = os.getenv("SODEX_API_KEY", "")
SODEX_WALLET_ADDR = os.getenv("SODEX_WALLET_ADDRESS", "")
SODEX_ACCOUNT_ID  = os.getenv("SODEX_ACCOUNT_ID", "0")
USE_TESTNET       = os.getenv("SODEX_USE_TESTNET", "false").lower() == "true"

_NET      = "testnet" if USE_TESTNET else "mainnet"
BASE_SPOT = f"https://{_NET}-gw.sodex.dev/api/v1/spot"  # leitura de preços (mesmo valor em ambas as redes)
TIMEOUT   = 15


def _spot_url(testnet: bool | None = None) -> str:
    """URL do gateway SoDEX para operações de conta/trading.
    testnet=None → usa env var SODEX_USE_TESTNET (padrão).
    testnet=True/False → força o gateway correto independente do env.
    """
    use_test = USE_TESTNET if testnet is None else testnet
    net = "testnet" if use_test else "mainnet"
    return f"https://{net}-gw.sodex.dev/api/v1/spot"

# Lê API key em runtime (não no import) para suportar scripts com load_dotenv tardio
def _api_key() -> str:
    return os.getenv("SODEX_API_KEY", "") or SODEX_API_KEY

_PUB = lambda: get_public_headers(_api_key())

def _sign(payload: dict, testnet: bool | None = None, action_type: str = ACTION_BATCH_NEW_ORDER) -> dict:
    """Assina payload com o chainId correto para a rede alvo.
    testnet=None usa SODEX_USE_TESTNET do env; True/False força a rede.
    """
    use_test = USE_TESTNET if testnet is None else testnet
    return get_signed_headers(_api_key(), payload, get_private_key(), use_test, action_type)


def _strip_decimal(s: str) -> str:
    """Remove trailing zeros de string decimal. '1800.000' -> '1800', '0.00300' -> '0.003'."""
    if "." in s:
        return s.rstrip("0").rstrip(".")
    return s


def _configured() -> bool:
    # Endpoints públicos funcionam sem key — usados apenas para account/trading
    return True


def _can_trade() -> bool:
    try:
        return bool(_api_key() and get_private_key() and (os.getenv("SODEX_WALLET_ADDRESS","") or SODEX_WALLET_ADDR))
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════════════════
#  MARKET DATA  (público)
# ═══════════════════════════════════════════════════════════════════════════════

async def get_markets(testnet: bool | None = None) -> List[Dict]:
    """Todos os símbolos spot com regras de trading. testnet=None usa env var."""
    if not _configured():
        return []
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{_spot_url(testnet)}/markets/symbols", headers=_PUB())
            r.raise_for_status()
            data = r.json().get("data", [])
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"SoDEX get_markets: {e}")
        return []


async def get_all_tickers(testnet: bool | None = None) -> Dict[str, Dict]:
    """
    Tickers de todos os mercados (24h stats).
    Retorna dict com múltiplos aliases por símbolo para facilitar lookup:
      "BTC-USDC", "BTC-USD", "vBTC_vUSDC" todos apontam para o mesmo ticker.
    Campos normalizados: lastPx -> lastPrice, volume -> volume24h
    testnet=None usa env var; True/False força o gateway correto.
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{_spot_url(testnet)}/markets/tickers", headers=_PUB())
            r.raise_for_status()
            items = r.json().get("data", [])
            if not isinstance(items, list):
                return {}
        result = {}
        for item in items:
            raw_sym = item.get("symbol", "")  # ex: "vBTC_vUSDC"
            # Normaliza para campos conhecidos
            normalized = dict(item)
            normalized["lastPrice"] = item.get("lastPx") or item.get("lastPrice") or item.get("c") or "0"
            normalized["volume24h"] = item.get("quoteVolume") or item.get("volume24h") or item.get("v") or "0"
            normalized["change24h"] = item.get("changePct") or item.get("change24h") or 0
            # Remove prefixo "v" e converte underscore para dash: vBTC_vUSDC -> BTC-USDC
            clean = raw_sym.replace("_vUSDC","").replace("_USDC","").lstrip("v")
            # Trata casos especiais: vDEFIssi -> DEFIssi, WSOSO -> SOSO
            if clean.endswith("ssi"):
                clean = clean  # mantém: DEFIssi, MAG7ssi, MEMEssi
            # Registra aliases
            result[raw_sym] = normalized           # vBTC_vUSDC
            result[clean + "-USDC"] = normalized   # BTC-USDC
            result[clean + "-USD"] = normalized    # BTC-USD
            result[clean] = normalized             # BTC
        return result
    except Exception as e:
        logger.error(f"SoDEX get_all_tickers: {e}")
        return {}


async def get_ticker(symbol: str, testnet: bool | None = None) -> Optional[Dict]:
    """Ticker de um símbolo específico (ex: BTC-USDC). testnet=None usa env var."""
    if not _configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{_spot_url(testnet)}/markets/tickers",
                            headers=_PUB(), params={"symbol": symbol})
            r.raise_for_status()
            data = r.json().get("data", [])
            return data[0] if isinstance(data, list) and data else data
    except Exception as e:
        logger.error(f"SoDEX get_ticker({symbol}): {e}")
        return None


async def get_orderbook(symbol: str, depth: int = 20, testnet: bool | None = None) -> Optional[Dict]:
    """Orderbook de um mercado. testnet=None usa env var."""
    if not _configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{_spot_url(testnet)}/markets/{symbol}/orderbook",
                            headers=_PUB(), params={"limit": depth})
            r.raise_for_status()
            return r.json().get("data")
    except Exception as e:
        logger.error(f"SoDEX get_orderbook({symbol}): {e}")
        return None


async def get_candles(symbol: str, interval: str = "1D", limit: int = 30, testnet: bool | None = None) -> List[Dict]:
    """Candles OHLCV. Intervals: 1m, 5m, 15m, 1h, 4h, 1D."""
    if not _configured():
        return []
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{_spot_url(testnet)}/markets/{symbol}/klines",
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

async def get_balances(testnet: bool | None = None) -> Dict[str, Any]:
    """Saldos da fund wallet. testnet=None usa env var; True/False força o gateway."""
    if not _can_trade():
        logger.warning("SoDEX: credenciais não configuradas")
        return {}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(
                f"{_spot_url(testnet)}/accounts/{SODEX_WALLET_ADDR}/balances",
                headers=_PUB(),
            )
            r.raise_for_status()
            data = r.json().get("data", {})
            # SoDEX retorna {"blockTime":..., "blockHeight":..., "balances":[...]}
            if isinstance(data, dict) and "balances" in data:
                balances_list = data["balances"]
            elif isinstance(data, list):
                balances_list = data
            else:
                balances_list = []
            return {b.get("coin", b.get("id", "")): b for b in balances_list if isinstance(b, dict)}
    except Exception as e:
        logger.error(f"SoDEX get_balances: {e}")
        return {}


async def get_open_orders(symbol: Optional[str] = None, testnet: bool | None = None) -> List[Dict]:
    """Ordens abertas da fund wallet. testnet=None usa env var."""
    if not _can_trade():
        return []
    try:
        params = {}
        if symbol:
            params["symbol"] = symbol
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(
                f"{_spot_url(testnet)}/accounts/{SODEX_WALLET_ADDR}/orders",
                headers=_PUB(),
                params=params,
            )
            r.raise_for_status()
            data = r.json().get("data", [])
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"SoDEX get_open_orders: {e}")
        return []


async def get_trade_history(symbol: Optional[str] = None, limit: int = 50, testnet: bool | None = None) -> List[Dict]:
    """Histórico de trades executados. testnet=None usa env var."""
    if not _can_trade():
        return []
    try:
        params = {"limit": limit}
        if symbol:
            params["symbol"] = symbol
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(
                f"{_spot_url(testnet)}/accounts/{SODEX_WALLET_ADDR}/trades",
                headers=_PUB(),
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
    testnet: bool | None = None,
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

    # SoDEX espera inteiros para side/type/timeInForce
    _side_map = {"BUY": 1, "SELL": 2}
    _type_map = {"LIMIT": 1, "MARKET": 2}
    _tif_map  = {"GTC": 1, "IOC": 2, "FOK": 3}

    clord_id = client_order_id or str(uuid.uuid4())[:36]

    # Ordem dos campos deve ser identica ao Go struct BatchNewOrderItem:
    # symbolID, clOrdID, side, type, timeInForce, price (omitempty), quantity (omitempty)
    order: Dict[str, Any] = {
        "symbolID":    symbol_id,
        "clOrdID":     clord_id,
        "side":        _side_map.get(side.upper(), 1),
        "type":        _type_map.get(order_type.upper(), 1),
        "timeInForce": _tif_map.get(time_in_force.upper(), 1),
    }
    if price and order_type.upper() == "LIMIT":
        order["price"] = _strip_decimal(price)  # price antes de quantity (Go struct order)
    order["quantity"] = _strip_decimal(quantity)

    payload = {
        "accountID": int(SODEX_ACCOUNT_ID),
        "orders": [order],
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post(
                f"{_spot_url(testnet)}/trade/orders/batch",
                headers=_sign(payload, testnet, ACTION_BATCH_NEW_ORDER),
                content=json.dumps(payload, separators=(",", ":")),
            )
            r.raise_for_status()
            result = r.json()
            if result.get("code", 0) != 0:
                err = result.get("error") or result.get("msg") or str(result)
                logger.error(f"SoDEX place_order({symbol}): API error code={result.get('code')} — {err}")
                return None
            logger.success(f"SoDEX order placed: {side} {quantity} {symbol} @ {price or 'market'}")
            return result
    except Exception as e:
        logger.error(f"SoDEX place_order({symbol}): {e}")
        return None


async def cancel_orders(symbol: str, symbol_id: int, order_ids: List[str], testnet: bool | None = None) -> bool:
    """Cancela ordens pelo ID do cliente. testnet=None usa env var."""
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
                f"{_spot_url(testnet)}/trade/orders/batch",
                headers=_sign(payload, testnet, ACTION_BATCH_CANCEL_ORDER),
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

async def get_portfolio_snapshot(testnet: bool | None = None) -> Dict[str, Any]:
    """
    Snapshot do portfolio: saldos + valor USD de cada posição.
    Usado pelo Rebalancer para calcular pesos atuais.
    testnet=None usa env var; True/False força o gateway correto.
    """
    balances = await get_balances(testnet=testnet)
    tickers  = await get_all_tickers(testnet=testnet)

    positions = []
    total_usd = 0.0

    STABLE = {"USDC", "USDT", "USD", "vUSDC", "vUSDT"}
    for coin, bal in balances.items():
        available = float(bal.get("total", 0)) - float(bal.get("locked", 0))
        if coin in STABLE:
            usd_value = available
        else:
            # coin pode ser "vETH" → tenta "vETH-USDC", "vETH-vUSDC", "ETH-USDC"
            base = coin.lstrip("v")
            for sym in (f"{coin}-USDC", f"{coin}-vUSDC", f"{base}-USDC"):
                ticker = tickers.get(sym, {})
                price  = float(ticker.get("lastPrice") or ticker.get("lastPx") or ticker.get("c") or 0)
                if price:
                    break
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
        "network":            "testnet" if (USE_TESTNET if testnet is None else testnet) else "mainnet",
        "wallet":             SODEX_WALLET_ADDR,
        "configured":         _can_trade(),
    }


async def get_symbol_id(symbol: str, testnet: bool | None = None) -> Optional[int]:
    """Busca o symbolID numérico necessário para ordens.
    Tenta múltiplos formatos: 'ETH-USDC' → 'vETH_vUSDC', 'WSOSO_vUSDC', etc.
    """
    markets = await get_markets(testnet=testnet)
    base = symbol.replace("-USDC", "").replace("-USD", "")
    for m in markets:
        name    = m.get("name", "")
        display = m.get("displayName", "")
        if (name == symbol
                or name == f"v{base}_vUSDC"
                or name == f"{base}_vUSDC"
                or display == symbol.replace("-", "/")
                or display == f"{base}/USDC"):
            return m.get("id")
    return None


async def execute_rebalance_trades(
    target_weights: Dict[str, float],
    dry_run: bool = True,
    testnet: bool | None = None,
) -> List[Dict]:
    """
    Executa rebalanceamento para atingir pesos alvo via SoDEX.
    dry_run=True apenas loga sem executar.
    testnet=None usa env var; True/False força o gateway correto.
    """
    snapshot  = await get_portfolio_snapshot(testnet=testnet)
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
        price  = float(ticker.get("lastPrice") or ticker.get("lastPx") or ticker.get("c") or 0)

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
                result = await place_order(sym, sym_id, side, "LIMIT", qty_str, price_str, testnet=testnet)
                order_info["status"] = "placed" if result else "failed"
            else:
                logger.warning(f"SoDEX: symbolID não encontrado para {sym}")
                order_info["status"] = "no_symbol"

        orders.append(order_info)

    return orders


async def execute_buy_for_deposit(
    amount_usd: float,
    constituents: list,          # lista de IndexConstituent (in_basket=True)
    dry_run: bool = True,
    testnet: bool | None = None,
) -> Dict[str, Any]:
    """
    Compra tokens no SoDEX proporcional aos pesos da cesta após um depósito.

    - Cada constituinte recebe amount_usd * weight/100 de USDC.
    - Tokens abaixo de $5 ou sem preço são pulados (viram stablecoin buffer).
    - testnet=True força gateway testnet; testnet=False força mainnet;
      testnet=None usa SODEX_USE_TESTNET do env.
    - dry_run=True loga sem colocar ordens reais.

    Retorna dict com ordens e total alocado.
    """
    MIN_ORDER_USD = 5.0

    tickers = await get_all_tickers(testnet=testnet)
    orders        = []
    skipped_usd   = 0.0
    allocated_usd = 0.0

    for c in constituents:
        symbol     = c.symbol
        weight_pct = c.weight or 0.0
        alloc_usd  = amount_usd * (weight_pct / 100.0)

        if alloc_usd < MIN_ORDER_USD:
            logger.info(f"execute_buy_for_deposit: {symbol} pulado — ${alloc_usd:.2f} < mínimo ${MIN_ORDER_USD}")
            skipped_usd += alloc_usd
            orders.append({"symbol": symbol, "status": "skipped_below_minimum", "usd_value": alloc_usd})
            continue

        # SoDEX retorna tickers sem prefixo "v" e sem ponto (vETH→ETH, vMAG7.ssi→MAG7ssi)
        clean_sym = symbol.lstrip("v").replace(".", "")
        sym_key = f"{clean_sym}-USDC"
        ticker  = (tickers.get(sym_key)
                   or tickers.get(f"{symbol}-USDC")
                   or tickers.get(f"v{symbol}_vUSDC")
                   or {})
        price   = float(ticker.get("lastPrice") or ticker.get("lastPx") or ticker.get("c") or 0)

        if price <= 0:
            logger.warning(f"execute_buy_for_deposit: {symbol} sem preço no SoDEX — pulando")
            skipped_usd += alloc_usd
            orders.append({"symbol": symbol, "status": "skipped_no_price", "usd_value": alloc_usd})
            continue

        qty     = alloc_usd / price
        qty_str = f"{qty:.8f}"
        px_str  = f"{price:.6f}"

        order_info = {
            "symbol":    symbol,
            "side":      "BUY",
            "quantity":  qty_str,
            "price":     px_str,
            "usd_value": round(alloc_usd, 4),
            "status":    None,
        }

        if dry_run:
            logger.info(f"[DRY RUN] BUY {qty_str} {sym_key} @ ${px_str} (${alloc_usd:.2f})")
            order_info["status"] = "dry_run"
        else:
            sym_id = await get_symbol_id(sym_key, testnet=testnet)
            if not sym_id:
                sym_id = await get_symbol_id(f"{symbol}-USDC", testnet=testnet)
            if sym_id:
                result = await place_order(sym_key, sym_id, "BUY", "LIMIT", qty_str, px_str, testnet=testnet)
                order_info["status"] = "placed" if result else "failed"
                order_info["raw"]    = result
            else:
                logger.warning(f"execute_buy_for_deposit: symbolID não encontrado para {sym_key}")
                order_info["status"] = "no_symbol"
                skipped_usd += alloc_usd

        allocated_usd += alloc_usd
        orders.append(order_info)

    return {
        "orders":        orders,
        "allocated_usd": round(allocated_usd, 4),
        "skipped_usd":   round(skipped_usd, 4),
        "dry_run":       dry_run,
        "testnet":       USE_TESTNET if testnet is None else testnet,
    }


async def execute_sell_for_withdrawal(
    amount_usd: float,
    constituents: list,          # lista de IndexConstituent (in_basket=True)
    dry_run: bool = True,
    testnet: bool | None = None,
) -> Dict[str, Any]:
    """
    Vende tokens no SoDEX proporcionalmente ao valor sacado.

    Usa os pesos da cesta para calcular quanto vender de cada token:
      sell_usd[token] = amount_usd * (weight / 100)
      sell_qty[token] = sell_usd[token] / current_price

    Coloca ordens LIMIT ao preço de mercado atual para execução imediata.
    dry_run=True loga sem colocar ordens reais.
    """
    MIN_SELL_USD = 1.0

    tickers = await get_all_tickers(testnet=testnet)
    orders        = []
    recovered_usd = 0.0
    skipped_usd   = 0.0

    for c in constituents:
        symbol     = c.symbol
        weight_pct = c.weight or 0.0
        sell_usd   = amount_usd * (weight_pct / 100.0)

        if sell_usd < MIN_SELL_USD:
            logger.info(f"execute_sell_for_withdrawal: {symbol} pulado — ${sell_usd:.2f} < mínimo ${MIN_SELL_USD}")
            skipped_usd += sell_usd
            orders.append({"symbol": symbol, "status": "skipped_below_minimum", "usd_value": sell_usd})
            continue

        clean_sym = symbol.lstrip("v").replace(".", "")
        sym_key   = f"{clean_sym}-USDC"
        ticker    = (tickers.get(sym_key)
                     or tickers.get(f"{symbol}-USDC")
                     or tickers.get(f"v{symbol}_vUSDC")
                     or {})
        price = float(ticker.get("lastPrice") or ticker.get("lastPx") or ticker.get("c") or 0)

        if price <= 0:
            logger.warning(f"execute_sell_for_withdrawal: {symbol} sem preço no SoDEX — pulando")
            skipped_usd += sell_usd
            orders.append({"symbol": symbol, "status": "skipped_no_price", "usd_value": sell_usd})
            continue

        qty     = sell_usd / price
        qty_str = f"{qty:.8f}"
        px_str  = f"{price:.6f}"

        order_info = {
            "symbol":    symbol,
            "side":      "SELL",
            "quantity":  qty_str,
            "price":     px_str,
            "usd_value": round(sell_usd, 4),
            "status":    None,
        }

        if dry_run:
            logger.info(f"[DRY RUN] SELL {qty_str} {sym_key} @ ${px_str} (${sell_usd:.2f})")
            order_info["status"] = "dry_run"
        else:
            sym_id = await get_symbol_id(sym_key, testnet=testnet)
            if not sym_id:
                sym_id = await get_symbol_id(f"{symbol}-USDC", testnet=testnet)

            if sym_id:
                result = await place_order(sym_key, sym_id, "SELL", "LIMIT", qty_str, px_str, testnet=testnet)
                order_info["status"] = "placed" if result else "failed"
                order_info["raw"]    = result
            else:
                logger.warning(f"execute_sell_for_withdrawal: symbolID não encontrado para {sym_key}")
                order_info["status"] = "no_symbol"
                skipped_usd += sell_usd

        recovered_usd += sell_usd
        orders.append(order_info)

    return {
        "orders":        orders,
        "recovered_usd": round(recovered_usd, 4),
        "skipped_usd":   round(skipped_usd, 4),
        "dry_run":       dry_run,
        "testnet":       USE_TESTNET if testnet is None else testnet,
    }
