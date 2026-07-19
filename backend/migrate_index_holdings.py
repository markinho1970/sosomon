"""
Migration: cria tabela index_holdings e popula seed do depin-momentum mainnet real.

Tabela rastreia quantidade de cada token que o fundo detém no SoDEX por índice/rede.
Permite calcular NAV via quantidade×preço quando get_balances() está indisponível.

Executar no servidor:
    cd /opt/alphagrid/backend && python3 migrate_index_holdings.py
"""

import sqlite3
from datetime import datetime, timezone

DB_PATH = "alphagrid.db"

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS index_holdings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    index_id     TEXT NOT NULL,
    network_mode TEXT NOT NULL DEFAULT 'mainnet',
    symbol       TEXT NOT NULL,
    quantity     REAL NOT NULL DEFAULT 0.0,
    updated_at   DATETIME NOT NULL,
    UNIQUE(index_id, network_mode, symbol)
)
"""

# Quantidades reais confirmadas no SoDEX (portfolio #5, depin-momentum, 2026-07-11)
# DEFIssi → símbolo limpo de vDEFI.ssi (lstrip v + replace . '')
SEED = [
    ("depin-momentum", "mainnet", "DEFIssi", 26.36077),
    ("depin-momentum", "mainnet", "LINK",    0.699755),
    ("depin-momentum", "mainnet", "UNI",     1.349527),
    ("depin-momentum", "mainnet", "AAVE",    0.05095),
]


def run():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Cria tabela
    cur.execute(CREATE_TABLE)
    conn.commit()
    print("✓ Tabela index_holdings criada (ou já existia).")

    # Verifica se já há dados para evitar duplicata
    cur.execute("SELECT COUNT(*) FROM index_holdings")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"  Tabela já tem {count} linha(s) — seed ignorado.")
    else:
        for index_id, network_mode, symbol, quantity in SEED:
            cur.execute(
                """
                INSERT OR IGNORE INTO index_holdings
                    (index_id, network_mode, symbol, quantity, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (index_id, network_mode, symbol, quantity, now),
            )
        conn.commit()
        print(f"✓ Seed inserido: {len(SEED)} tokens do depin-momentum mainnet.")
        for index_id, network_mode, symbol, qty in SEED:
            print(f"  {symbol}: {qty}")

    conn.close()
    print("Migração concluída.")


if __name__ == "__main__":
    run()
