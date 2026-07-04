"""
Migration: adiciona is_anchor a IndexConstituent e marca tokens âncora.

Tokens âncora = nunca removíveis pelo Scout automaticamente:
  - vMAG7.ssi / MAG7ssi  → AI & Tech Index (40%)
  - WSOSO                 → AI & Tech Index (15%) + Real Assets (15%)
  - vUSSI  / USSIssi      → Real Assets Index (35%)
  - vDEFI.ssi / DEFIssi   → DeFi Infrastructure (40%)

Seguro para rodar múltiplas vezes.
"""

import sqlite3
import os

DB_PATH = os.getenv("DATABASE_URL", "alphagrid.db").replace("sqlite:///", "")
print(f"[migration] Conectando a: {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

# 1. Adiciona coluna se não existir
cur.execute("PRAGMA table_info(constituents)")
existing = {row[1] for row in cur.fetchall()}
if "is_anchor" not in existing:
    cur.execute("ALTER TABLE constituents ADD COLUMN is_anchor INTEGER NOT NULL DEFAULT 0")
    print("[migration] ✅ constituents.is_anchor — adicionado")
else:
    print("[migration] ℹ️  constituents.is_anchor — já existia")

# 2. Marca tokens âncora por símbolo (case-insensitive)
ANCHOR_SYMBOLS = {
    "MAG7ssi", "vMAG7.ssi",    # SSI SoSoValue AI
    "USSIssi", "vUSSIssi",      # SSI SoSoValue RWA
    "DEFIssi", "vDEFIssi",      # SSI SoSoValue DeFi
    "WSOSO",                    # Token ecossistema SoSoValue
}

cur.execute("SELECT id, symbol, index_id FROM constituents")
rows = cur.fetchall()
marked = 0
for row_id, symbol, index_id in rows:
    if symbol in ANCHOR_SYMBOLS:
        cur.execute("UPDATE constituents SET is_anchor=1 WHERE id=?", (row_id,))
        print(f"[migration] ✅ Âncora marcado: {symbol} (index={index_id})")
        marked += 1

if marked == 0:
    print("[migration] ⚠️  Nenhum token âncora encontrado — verifique os símbolos no DB")
    # Lista todos para diagnóstico
    cur.execute("SELECT symbol, index_id, in_basket FROM constituents WHERE in_basket=1")
    basket = cur.fetchall()
    print("[migration] Tokens in_basket=True no banco:")
    for sym, idx, ib in basket:
        print(f"  {sym} ({idx})")

conn.commit()
conn.close()
print(f"\n[migration] ✅ Concluído — {marked} token(s) âncora marcados")
print("Próximo passo: pm2 restart alphagrid-backend")
