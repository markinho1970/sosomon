"""
Migração: adiciona in_basket + insere tokens do universo temático (não-cesta)

Execução: python migrate_add_in_basket.py
"""
import sqlite3
from datetime import datetime

DB_PATH = "alphagrid.db"
NOW = datetime.utcnow().isoformat()

# Tokens universo por índice (além dos já existentes na cesta)
# Formato: (index_id, symbol, name, network_mode)
UNIVERSE_TOKENS = [
    # ── AI & Crypto Infrastructure ─────────────────────────────────────────────
    ("ai-crypto-infrastructure", "BTC",   "Bitcoin",          "mainnet"),
    ("ai-crypto-infrastructure", "BTC",   "Bitcoin",          "testnet"),
    ("ai-crypto-infrastructure", "SUI",   "Sui",              "mainnet"),
    ("ai-crypto-infrastructure", "SUI",   "Sui",              "testnet"),
    ("ai-crypto-infrastructure", "HYPE",  "Hyperliquid",      "mainnet"),
    ("ai-crypto-infrastructure", "HYPE",  "Hyperliquid",      "testnet"),
    ("ai-crypto-infrastructure", "LINK",  "Chainlink",        "mainnet"),
    ("ai-crypto-infrastructure", "LINK",  "Chainlink",        "testnet"),
    ("ai-crypto-infrastructure", "AVAX",  "Avalanche",        "mainnet"),
    ("ai-crypto-infrastructure", "AVAX",  "Avalanche",        "testnet"),
    # ── Real World Assets ──────────────────────────────────────────────────────
    ("real-world-assets-top10",  "ETH",   "Ethereum",         "mainnet"),
    ("real-world-assets-top10",  "ETH",   "Ethereum",         "testnet"),
    ("real-world-assets-top10",  "SOL",   "Solana",           "mainnet"),
    ("real-world-assets-top10",  "SOL",   "Solana",           "testnet"),
    ("real-world-assets-top10",  "TON",   "Toncoin",          "mainnet"),
    ("real-world-assets-top10",  "TON",   "Toncoin",          "testnet"),
    ("real-world-assets-top10",  "XLM",   "Stellar",          "mainnet"),
    ("real-world-assets-top10",  "XLM",   "Stellar",          "testnet"),
    ("real-world-assets-top10",  "XRP",   "XRP",              "mainnet"),
    ("real-world-assets-top10",  "XRP",   "XRP",              "testnet"),
    ("real-world-assets-top10",  "BNB",   "BNB",              "mainnet"),
    ("real-world-assets-top10",  "BNB",   "BNB",              "testnet"),
    # ── DeFi Infrastructure ────────────────────────────────────────────────────
    ("depin-momentum",           "ETH",   "Ethereum",         "mainnet"),
    ("depin-momentum",           "ETH",   "Ethereum",         "testnet"),
    ("depin-momentum",           "WSOSO", "SoSo (WSOSO)",     "mainnet"),
    ("depin-momentum",           "WSOSO", "SoSo (WSOSO)",     "testnet"),
    ("depin-momentum",           "ADA",   "Cardano",          "mainnet"),
    ("depin-momentum",           "ADA",   "Cardano",          "testnet"),
    ("depin-momentum",           "ARB",   "Arbitrum",         "mainnet"),
    ("depin-momentum",           "ARB",   "Arbitrum",         "testnet"),
    ("depin-momentum",           "AVAX",  "Avalanche",        "mainnet"),
    ("depin-momentum",           "AVAX",  "Avalanche",        "testnet"),
]

def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Adiciona coluna in_basket se não existir
    cols = [row[1] for row in cur.execute("PRAGMA table_info(constituents)")]
    if "in_basket" not in cols:
        cur.execute("ALTER TABLE constituents ADD COLUMN in_basket INTEGER DEFAULT 1")
        print("✓ Coluna in_basket adicionada")
    else:
        print("– Coluna in_basket já existe")

    # 2. Garante que todos os existentes tenham in_basket=1
    cur.execute("UPDATE constituents SET in_basket = 1 WHERE in_basket IS NULL")
    print(f"✓ Tokens existentes marcados como in_basket=1")

    # 3. Insere tokens universo (somente se ainda não existirem)
    inserted = 0
    skipped = 0
    for idx_id, symbol, name, network_mode in UNIVERSE_TOKENS:
        cur.execute(
            "SELECT id FROM constituents WHERE index_id=? AND symbol=? AND network_mode=?",
            (idx_id, symbol, network_mode)
        )
        if cur.fetchone():
            skipped += 1
            continue
        cur.execute(
            """INSERT INTO constituents
               (index_id, symbol, name, weight, current_price_usd, price_at_nav_ref,
                market_cap_usd, volume_24h_usd, price_change_7d, price_change_30d,
                ai_rationale, added_at, is_stablecoin, network_mode, in_basket)
               VALUES (?, ?, ?, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, '', ?, 0, ?, 0)""",
            (idx_id, symbol, name, NOW, network_mode)
        )
        inserted += 1

    conn.commit()
    conn.close()
    print(f"✓ {inserted} tokens universo inseridos, {skipped} já existiam")
    print("Migração concluída.")

if __name__ == "__main__":
    run()
