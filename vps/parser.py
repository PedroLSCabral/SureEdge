"""Parse Telegram bot messages into opportunity dicts."""

import hashlib
import re
import unicodedata
from datetime import datetime


def normalize_text(s: str) -> str:
    """Lowercase, strip accents and punctuation."""
    s = s.strip().lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")  # strip accents
    s = re.sub(r"[^\w\s]", "", s)  # remove punctuation
    return re.sub(r"\s+", " ", s).strip()


def make_dedup_key(
    casa1: str, casa2: str, evento: str, data_evento: str, odd1: float, odd2: float
) -> str:
    """SHA-256 canonical key for deduplication."""
    casas = "|".join(sorted([casa1.strip().lower(), casa2.strip().lower()]))
    raw = f"{casas}|{normalize_text(evento)}|{data_evento}|{odd1}|{odd2}"
    return hashlib.sha256(raw.encode()).hexdigest()


def parse_message(text: str) -> dict | None:
    """Extract fields from a GreenSurebet bot message. Returns dict or None."""

    # ── Casas ─────────────────────────────────────────────────────────────
    m_casas = re.search(r"🏘\s*Casas:\s*(.+?)\s*x\s*(.+)", text)
    if not m_casas:
        return None
    casa1, casa2 = m_casas.group(1).strip(), m_casas.group(2).strip()

    # ── ROI ───────────────────────────────────────────────────────────────
    m_roi = re.search(r"💰\s*LUCRO:\s*([\d.,]+)%", text)
    roi = float(m_roi.group(1).replace(",", ".")) if m_roi else 0.0

    # ── Evento (primeira linha ➡) ─────────────────────────────────────────
    m_evento = re.search(r"➡\s*(.+)", text)
    evento = m_evento.group(1).strip() if m_evento else ""

    # ── Esporte + Competição (primeira linha 🏆) ──────────────────────────
    m_esporte = re.search(r"🏆\s*(.+)", text)
    esporte, competicao = "", ""
    if m_esporte:
        parts = m_esporte.group(1).split("/", 1)
        esporte = parts[0].strip()
        competicao = parts[1].strip() if len(parts) > 1 else ""

    # ── Data evento (primeira linha ⏰) ───────────────────────────────────
    m_data = re.search(r"⏰\s*Data:\s*([\d/]+\s+[\d:]+)", text)
    data_evento = m_data.group(1).strip() if m_data else ""

    # ── Odds (🟡 linhas) ──────────────────────────────────────────────────
    odds = re.findall(r"🟡\s*.+?@([\d.,]+)", text)
    odd1 = float(odds[0].replace(",", ".")) if len(odds) > 0 else 0.0
    odd2 = float(odds[1].replace(",", ".")) if len(odds) > 1 else 0.0

    # ── Mercados (✅ Aposta: linhas) ──────────────────────────────────────
    mercados = re.findall(r"✅\s*Aposta:\s*(.+)", text)
    mercado1 = mercados[0].strip() if len(mercados) > 0 else ""
    mercado2 = mercados[1].strip() if len(mercados) > 1 else ""

    # ── Hora de chegada ───────────────────────────────────────────────────
    now = datetime.now()

    dedup = make_dedup_key(casa1, casa2, evento, data_evento, odd1, odd2)

    return {
        "received_at": now.isoformat(timespec="seconds"),
        "casas": f"{casa1} x {casa2}",
        "casa1": casa1,
        "casa2": casa2,
        "roi": roi,
        "esporte": esporte,
        "competicao": competicao,
        "evento": evento,
        "data_evento": data_evento,
        "odd1": odd1,
        "odd2": odd2,
        "mercado1": mercado1,
        "mercado2": mercado2,
        "hora_chegada": now.strftime("%H:%M:%S"),
        "dedup_key": dedup,
    }
