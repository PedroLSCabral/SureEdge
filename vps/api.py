"""FastAPI server exposing market statistics from the opportunities DB."""

import sqlite3
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import DB_PATH, init_db, count_opportunities

app = FastAPI(title="SureEdge Market API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def get_conn() -> sqlite3.Connection:
    """One connection per request (lightweight for SQLite)."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    conn = get_conn()
    total = count_opportunities(conn)
    conn.close()
    return {"status": "ok", "count": total}


# ── Stats: Casas (individual frequency) ──────────────────────────────────────
@app.get("/stats/casas")
def stats_casas():
    conn = get_conn()
    rows = conn.execute("""
        SELECT casa, SUM(cnt) as total FROM (
            SELECT casa1 AS casa, COUNT(*) AS cnt FROM opportunities GROUP BY casa1
            UNION ALL
            SELECT casa2 AS casa, COUNT(*) AS cnt FROM opportunities GROUP BY casa2
        ) GROUP BY casa ORDER BY total DESC
    """).fetchall()
    conn.close()
    return [{"casa": r["casa"], "count": r["total"]} for r in rows]


# ── Stats: Horários (hora × dia da semana) ───────────────────────────────────
@app.get("/stats/horarios")
def stats_horarios():
    conn = get_conn()
    rows = conn.execute("""
        SELECT
            CAST(strftime('%%w', received_at) AS INTEGER) AS dia,
            CAST(strftime('%%H', received_at) AS INTEGER) AS hora,
            COUNT(*) AS count
        FROM opportunities
        GROUP BY dia, hora
        ORDER BY dia, hora
    """).fetchall()
    conn.close()
    return [{"dia": r["dia"], "hora": r["hora"], "count": r["count"]} for r in rows]


# ── Stats: ROI médio por casa ─────────────────────────────────────────────────
@app.get("/stats/roi")
def stats_roi():
    conn = get_conn()
    rows = conn.execute("""
        SELECT casa, AVG(roi) as avg_roi, COUNT(*) as count FROM (
            SELECT casa1 AS casa, roi FROM opportunities
            UNION ALL
            SELECT casa2 AS casa, roi FROM opportunities
        ) GROUP BY casa ORDER BY avg_roi DESC
    """).fetchall()
    conn.close()
    return [{"casa": r["casa"], "avg_roi": round(r["avg_roi"], 2), "count": r["count"]} for r in rows]


# ── Stats: Esportes ───────────────────────────────────────────────────────────
@app.get("/stats/esportes")
def stats_esportes():
    conn = get_conn()
    rows = conn.execute("""
        SELECT esporte, COUNT(*) AS count
        FROM opportunities
        WHERE esporte IS NOT NULL AND esporte != ''
        GROUP BY esporte
        ORDER BY count DESC
    """).fetchall()
    conn.close()
    return [{"esporte": r["esporte"], "count": r["count"]} for r in rows]


# ── Startup: ensure DB exists ─────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
