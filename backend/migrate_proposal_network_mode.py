"""
migrate_proposal_network_mode.py
Adiciona coluna network_mode na tabela rebalance_proposals.
Executar uma vez: python3 migrate_proposal_network_mode.py
"""
import sqlite3, os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()

DB_PATH = os.getenv("DATABASE_URL", "alphagrid.db").replace("sqlite:///", "")
conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

cols = [r[1] for r in cur.execute("PRAGMA table_info(rebalance_proposals)").fetchall()]
if "network_mode" in cols:
    print("Coluna network_mode já existe em rebalance_proposals — nada a fazer")
else:
    cur.execute("ALTER TABLE rebalance_proposals ADD COLUMN network_mode VARCHAR DEFAULT 'mainnet'")
    cur.execute("UPDATE rebalance_proposals SET network_mode = 'mainnet' WHERE network_mode IS NULL")
    conn.commit()
    print("OK: coluna network_mode adicionada em rebalance_proposals")

conn.close()
