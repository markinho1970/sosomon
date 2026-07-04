"""
Migration: adiciona tabelas deposit_transactions e redemption_transactions,
e 4 colunas de auditoria de cotas em portfolios.

Execução: python3 migrate_deposit_redemption_transactions.py
Seguro para rodar múltiplas vezes (IF NOT EXISTS / verificação prévia de colunas).
"""

import sqlite3
import os
import sys

DB_PATH = os.getenv("DATABASE_URL", "alphagrid.db").replace("sqlite:///", "")

print(f"[migration] Conectando a: {DB_PATH}")
conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Tabela deposit_transactions
# ─────────────────────────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS deposit_transactions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id       TEXT    NOT NULL REFERENCES subscribers(id),
    portfolio_id        INTEGER REFERENCES portfolios(id),
    index_id            TEXT    NOT NULL REFERENCES indexes(id),
    tx_hash             TEXT    NOT NULL UNIQUE,
    amount_usd          REAL    NOT NULL,
    nav_at_purchase     REAL    NOT NULL,
    shares_issued       REAL    NOT NULL,
    cost_basis_per_share REAL   NOT NULL,
    buy_confirmed       INTEGER NOT NULL DEFAULT 0,
    buy_orders_placed   INTEGER NOT NULL DEFAULT 0,
    buy_skipped_usd     REAL    NOT NULL DEFAULT 0.0,
    network_mode        TEXT    NOT NULL DEFAULT 'mainnet',
    created_at          TEXT    NOT NULL
)
""")
print("[migration] ✅ deposit_transactions — criada ou já existia")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Tabela redemption_transactions
# ─────────────────────────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS redemption_transactions (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id           TEXT    NOT NULL REFERENCES subscribers(id),
    portfolio_id            INTEGER REFERENCES portfolios(id),
    index_id                TEXT    NOT NULL REFERENCES indexes(id),
    tx_hash                 TEXT,
    amount_usd              REAL    NOT NULL,
    shares_burned           REAL    NOT NULL,
    nav_at_redemption       REAL    NOT NULL,
    net_usd                 REAL    NOT NULL,
    management_fee_usd      REAL    NOT NULL DEFAULT 0.0,
    performance_fee_usd     REAL    NOT NULL DEFAULT 0.0,
    gas_fee_usd             REAL    NOT NULL DEFAULT 0.0,
    pnl_usd                 REAL    NOT NULL DEFAULT 0.0,
    pnl_pct                 REAL    NOT NULL DEFAULT 0.0,
    cost_basis_proportional REAL    NOT NULL DEFAULT 0.0,
    is_simulated            INTEGER NOT NULL DEFAULT 0,
    network_mode            TEXT    NOT NULL DEFAULT 'mainnet',
    created_at              TEXT    NOT NULL
)
""")
print("[migration] ✅ redemption_transactions — criada ou já existia")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Colunas de auditoria em portfolios (add-if-not-exists via PRAGMA)
# ─────────────────────────────────────────────────────────────────────────────
cur.execute("PRAGMA table_info(portfolios)")
existing_cols = {row[1] for row in cur.fetchall()}

new_cols = [
    ("nav_at_first_deposit",      "REAL NOT NULL DEFAULT 1.0"),
    ("avg_cost_basis_per_share",  "REAL NOT NULL DEFAULT 1.0"),
    ("total_shares_deposited",    "REAL NOT NULL DEFAULT 0.0"),
    ("total_shares_redeemed",     "REAL NOT NULL DEFAULT 0.0"),
]

for col_name, col_def in new_cols:
    if col_name not in existing_cols:
        cur.execute(f"ALTER TABLE portfolios ADD COLUMN {col_name} {col_def}")
        print(f"[migration] ✅ portfolios.{col_name} — adicionado")
    else:
        print(f"[migration] ℹ️  portfolios.{col_name} — já existia, ignorado")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Backfill: portfolios existentes com avg_cost_basis_per_share = 0 ou NULL
#    → atribuir NAV atual como custo base aproximado (conservador)
# ─────────────────────────────────────────────────────────────────────────────
cur.execute("""
UPDATE portfolios
SET avg_cost_basis_per_share = COALESCE(
        (SELECT i.nav_usd FROM indexes i WHERE i.id = portfolios.index_id), 1.0
    ),
    nav_at_first_deposit = COALESCE(
        (SELECT i.nav_usd FROM indexes i WHERE i.id = portfolios.index_id), 1.0
    ),
    total_shares_deposited = COALESCE(portfolios.index_tokens_held, 0.0)
WHERE (avg_cost_basis_per_share IS NULL OR avg_cost_basis_per_share = 0.0)
  AND (deposited_usd IS NOT NULL AND deposited_usd > 0)
""")
backfill_count = cur.rowcount
if backfill_count > 0:
    print(f"[migration] ✅ Backfill: {backfill_count} portfolio(s) com custo base aproximado do NAV atual")
else:
    print("[migration] ℹ️  Backfill: nenhum portfolio precisava de correção")

conn.commit()
conn.close()

print("[migration] ✅ Concluído com sucesso!")
print()
print("Próximo passo — reiniciar o backend:")
print("  pm2 restart alphagrid-backend")
