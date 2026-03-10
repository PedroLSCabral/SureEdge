"""SQLite wrapper for SureEdge market opportunities."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "sureedge.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS opportunities (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at  DATETIME NOT NULL,
    casas        TEXT NOT NULL,
    casa1        TEXT NOT NULL,
    casa2        TEXT NOT NULL,
    roi          REAL NOT NULL,
    esporte      TEXT,
    competicao   TEXT,
    evento       TEXT,
    data_evento  TEXT,
    odd1         REAL,
    odd2         REAL,
    mercado1     TEXT,
    mercado2     TEXT,
    hora_chegada TEXT,
    dedup_key    TEXT UNIQUE
);
"""


def init_db(path: str | Path | None = None) -> sqlite3.Connection:
    """Create DB and table if needed, return connection."""
    db = Path(path) if path else DB_PATH
    conn = sqlite3.connect(str(db))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(SCHEMA)
    conn.commit()
    return conn


def insert_opportunity(conn: sqlite3.Connection, data: dict) -> bool:
    """Insert opportunity if dedup_key is new. Returns True if inserted."""
    sql = """
    INSERT OR IGNORE INTO opportunities
        (received_at, casas, casa1, casa2, roi, esporte, competicao, evento,
         data_evento, odd1, odd2, mercado1, mercado2, hora_chegada, dedup_key)
    VALUES
        (:received_at, :casas, :casa1, :casa2, :roi, :esporte, :competicao, :evento,
         :data_evento, :odd1, :odd2, :mercado1, :mercado2, :hora_chegada, :dedup_key)
    """
    cur = conn.execute(sql, data)
    conn.commit()
    return cur.rowcount == 1


def count_opportunities(conn: sqlite3.Connection) -> int:
    """Return total row count."""
    return conn.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0]
