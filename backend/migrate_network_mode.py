"""
Migration: adiciona coluna network_mode na tabela portfolios.
Registros existentes recebem 'mainnet' como default.
Executar uma vez: python3 migrate_network_mode.py
"""
import sqlite3
import glob
import os

db_files = glob.glob("/opt/alphagrid/backend/*.db") or glob.glob("*.db")
if not db_files:
    print("Banco de dados nao encontrado")
    exit(1)

db_path = db_files[0]
print(f"Migrando: {db_path}")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("PRAGMA table_info(portfolios)")
cols = [row[1] for row in cur.fetchall()]

if "network_mode" in cols:
    print("Coluna network_mode ja existe — nada a fazer")
else:
    cur.execute("ALTER TABLE portfolios ADD COLUMN network_mode VARCHAR DEFAULT 'mainnet'")
    cur.execute("UPDATE portfolios SET network_mode = 'mainnet' WHERE network_mode IS NULL")
    conn.commit()
    print("OK: coluna network_mode adicionada, todos os registros existentes = 'mainnet'")

conn.close()
