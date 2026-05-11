"""
CoinGecko Pro API service.
Handles token price data, market cap, volume, and OHLCV.
"""

import os
import httpx
from typing import Optional, Dict, Any, List
from loguru import logger

BASE_URL = "https://pro-api.coingecko.com/api/v3"
API_KEY = os.getenv("COINGECKO_API_KEY", "")

HEADERS = {"x-cg-pro-api-key": API_KEY}


async def get_token_data(coingecko_id: str) -> Optional[Dict[str, Any]]:
    """Fetch full market data for a single token."""
    url = f"{BASE_URL}/coins/{coingecko_id}"
    params = {
        "localization": "false",
        "tickers": "false",
        "market_data": "true",
        "community_data": "false",
        "developer_data": "false",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, headers=HEADERS, params=params)
            r.raise_for_status()
            d = r.json()
            md = d.get("market_data", {})
            return {
                "id": d["id"],
                "symbol": d["symbol"].upper(),
                "name": d["name"],
                "current_price_usd": md.get("current_price", {}).get("usd", 0),
                "market_cap_usd": md.get("market_cap", {}).get("usd", 0),
                "volume_24h_usd": md.get("total_volume", {}).get("usd", 0),
                "price_change_7d": md.get("price_change_percentage_7d", 0),
                "price_change_30d": md.get("price_change_percentage_30d", 0),
                "price_change_24h": md.get("price_change_percentage_24h", 0),
                "ath_usd": md.get("ath", {}).get("usd", 0),
            }
    except Exception as e:
        logger.error(f"CoinGecko fetch error for {coingecko_id}: {e}")
        return None


async def get_market_data_batch(coingecko_ids: List[str]) -> Dict[str, Dict]:
    """
    Batch fetch market data for multiple tokens.
    Returns dict keyed by coingecko_id.
    """
    ids_str = ",".join(coingecko_ids)
    url = f"{BASE_URL}/coins/markets"
    params = {
        "vs_currency": "usd",
        "ids": ids_str,
        "order": "market_cap_desc",
        "per_page": 250,
        "page": 1,
        "price_change_percentage": "7d,30d",
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(url, headers=HEADERS, params=params)
            r.raise_for_status()
            results = r.json()
            return {
                item["id"]: {
                    "symbol": item["symbol"].upper(),
                    "name": item["name"],
                    "current_price_usd": item.get("current_price", 0),
                    "market_cap_usd": item.get("market_cap", 0),
                    "volume_24h_usd": item.get("total_volume", 0),
                    "price_change_7d": item.get("price_change_percentage_7d_in_currency", 0),
                    "price_change_30d": item.get("price_change_percentage_30d_in_currency", 0),
                }
                for item in results
            }
    except Exception as e:
        logger.error(f"CoinGecko batch fetch error: {e}")
        return {}


async def screen_tokens_for_theme(
    theme_token_ids: List[str],
    min_market_cap_usd: float = 50_000_000,
    min_volume_24h_usd: float = 500_000,
) -> List[Dict[str, Any]]:
    """
    Filter tokens by liquidity and market cap thresholds.
    Returns qualified tokens sorted by market cap descending.
    """
    data = await get_market_data_batch(theme_token_ids)

    qualified = []
    for token_id, token in data.items():
        if token["market_cap_usd"] < min_market_cap_usd:
            logger.debug(f"EXCLUDED {token['symbol']}: market cap ${token['market_cap_usd']:,.0f} < threshold")
            continue
        if token["volume_24h_usd"] < min_volume_24h_usd:
            logger.debug(f"EXCLUDED {token['symbol']}: 24h volume ${token['volume_24h_usd']:,.0f} < threshold")
            continue
        token["coingecko_id"] = token_id
        qualified.append(token)

    qualified.sort(key=lambda x: x["market_cap_usd"], reverse=True)
    logger.info(f"Screened {len(theme_token_ids)} tokens → {len(qualified)} qualified")
    return qualified
