"""
Migration: cria tabela announcements.

Uso:
  python3 migrate_announcements.py          # aplica (up)
  python3 migrate_announcements.py --down   # reverte (rollback)
"""

import sys
import sqlite3

DB = "alphagrid.db"


def up(con: sqlite3.Connection):
    con.execute("""
        CREATE TABLE IF NOT EXISTS announcements (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            source        VARCHAR NOT NULL DEFAULT 'sodex',
            external_id   VARCHAR,
            title         TEXT NOT NULL,
            body          TEXT,
            labels        JSON DEFAULT '[]',
            severity      VARCHAR NOT NULL DEFAULT 'info',
            affects_symbols JSON DEFAULT '[]',
            action_deadline DATETIME,
            published_at  DATETIME,
            is_active     BOOLEAN NOT NULL DEFAULT 1,
            created_at    DATETIME NOT NULL DEFAULT (datetime('now'))
        )
    """)
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_announcements_external_id ON announcements(source, external_id) WHERE external_id IS NOT NULL")
    con.commit()
    print("✅ Tabela 'announcements' criada.")


def down(con: sqlite3.Connection):
    con.execute("DROP TABLE IF EXISTS announcements")
    con.commit()
    print("✅ Tabela 'announcements' removida (rollback completo).")


if __name__ == "__main__":
    con = sqlite3.connect(DB)
    if "--down" in sys.argv:
        down(con)
    else:
        up(con)
    con.close()
