"""
Announcement Fetcher — busca anúncios da SoDEX e salva no DB.
Roda a cada 2h via scheduler. Suporta entrada manual via admin API.
"""

import re
import json
import httpx
from datetime import datetime
from loguru import logger
from sqlalchemy.orm import Session
from models import Announcement

SODEX_ANNOUNCEMENTS_URL = "https://mainnet-gw.sodex.dev/api/v1/announcements"

# Mapeamento de label SoDEX → severidade interna
_LABEL_SEVERITY = {
    "delistings": "critical",
    "listings":   "warning",
    "updates":    "info",
    "campaigns":  "info",
}

# Símbolos conhecidos no SoDEX — usados para extração automática do título
_KNOWN_SYMBOLS = {
    "AAVE", "ADA", "ARB", "AVAX", "BNB", "BTC", "CAKE", "DOGE", "ENA",
    "ETH", "HYPE", "JUP", "LINK", "LTC", "MORPHO", "ONDO", "PEPE", "SHIB",
    "SKY", "SOL", "SUI", "TON", "UNI", "USDT", "WSOSO", "XAUt", "XLM",
    "XRP", "ZEC", "DEFIssi", "MAG7ssi", "MEMEssi", "USSIssi",
}


def _severity_from_labels(labels: list[str]) -> str:
    for label in labels:
        sev = _LABEL_SEVERITY.get(label.lower())
        if sev:
            return sev
    return "info"


def _extract_symbols(title: str) -> list[str]:
    found = []
    for sym in _KNOWN_SYMBOLS:
        # word boundary para evitar falsos positivos (ex: "LINK" em "UNLINK")
        if re.search(rf"\b{re.escape(sym)}\b", title, re.IGNORECASE):
            found.append(sym.upper() if sym not in ("XAUt", "DEFIssi", "MAG7ssi", "MEMEssi", "USSIssi") else sym)
    return sorted(set(found))


async def fetch_sodex_articles() -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(SODEX_ANNOUNCEMENTS_URL)
            resp.raise_for_status()
            return resp.json().get("data", {}).get("articles", [])
    except Exception as e:
        logger.warning(f"AnnouncementFetcher: erro ao buscar SoDEX — {e}")
        return []


async def sync_announcements(db: Session) -> dict:
    articles = await fetch_sodex_articles()
    new_count = 0
    skip_count = 0

    for article in articles:
        ext_id = str(article.get("id", ""))
        if not ext_id:
            continue

        # Dedup: já existe?
        exists = db.query(Announcement).filter_by(source="sodex", external_id=ext_id).first()
        if exists:
            skip_count += 1
            continue

        labels = article.get("label_names") or []
        title = article.get("title") or ""
        created_ts = article.get("createdAt")
        published_at = datetime.utcfromtimestamp(created_ts) if created_ts else None

        ann = Announcement(
            source="sodex",
            external_id=ext_id,
            title=title,
            labels=labels,
            severity=_severity_from_labels(labels),
            affects_symbols=_extract_symbols(title),
            published_at=published_at,
            is_active=True,
        )
        db.add(ann)
        new_count += 1

    db.commit()
    logger.info(f"AnnouncementFetcher: {new_count} novos, {skip_count} já existentes")
    return {"new": new_count, "skipped": skip_count, "total_fetched": len(articles)}
