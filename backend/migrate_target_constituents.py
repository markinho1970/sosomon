"""
Migration: adiciona coluna target_constituents em indexes.
Valores: AI & Tech = 5, Real Assets = 4, DeFi = 4
"""
import sqlite3
import os

DB_PATH = os.environ.get("DATABASE_URL", "alphagrid.db").replace("sqlite:///", "")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Adiciona coluna se não existir
try:
    cur.execute("ALTER TABLE indexes ADD COLUMN target_constituents INTEGER DEFAULT 5")
    print("Coluna target_constituents adicionada.")
except sqlite3.OperationalError:
    print("Coluna já existe, apenas atualizando valores.")

# Define valores por índice
targets = {
    "ai-crypto-infrastructure": 5,
    "real-world-assets-top10":  4,
    "depin-momentum":           4,
}

for slug, n in targets.items():
    cur.execute("UPDATE indexes SET target_constituents = ? WHERE slug = ?", (n, slug))
    print(f"  {slug}: target_constituents = {n}")

conn.commit()

# Verificação
rows = cur.execute("SELECT slug, target_constituents FROM indexes").fetchall()
print("\nEstado atual:")
for row in rows:
    print(f"  {row[0]}: {row[1]}")

conn.close()
print("\nMigration concluída.")
