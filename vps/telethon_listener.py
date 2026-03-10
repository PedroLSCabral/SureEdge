"""Telethon userbot — listens to @greensurebet18_bot DMs and stores opportunities.

First run:  prompts for phone + code → saves .session file
Next runs:  reconnects silently using saved session
Ctrl+C:     clean shutdown, session state preserved
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError

from database import init_db, insert_opportunity
from parser import parse_message

# ── Config ────────────────────────────────────────────────────────────────────
API_ID       = os.environ.get("TELEGRAM_API_ID")
API_HASH     = os.environ.get("TELEGRAM_API_HASH")
SESSION_FILE = os.environ.get("TELEGRAM_SESSION", "sureedge_session")
PHONE        = os.environ.get("TELEGRAM_PHONE")
BOT_USERNAME = "greensurebet18_bot"

if not API_ID or not API_HASH:
    sys.exit("Set TELEGRAM_API_ID and TELEGRAM_API_HASH environment variables.")

# Suppress telethon internal warnings ("very new message", etc.)
logging.getLogger("telethon").setLevel(logging.ERROR)

CONNECT_TIMEOUT = 15  # seconds — if connect hangs longer, session is stale


def out(msg):
    """print + flush — guarantees immediate output on Windows cmd."""
    print(f"[sureedge] {msg}", flush=True)


async def try_connect(client):
    """Connect with timeout. Returns True on success."""
    try:
        await asyncio.wait_for(client.connect(), timeout=CONNECT_TIMEOUT)
        return True
    except (asyncio.TimeoutError, OSError):
        return False


async def main():
    conn = init_db()

    session_path = Path(SESSION_FILE + ".session")
    client = TelegramClient(SESSION_FILE, int(API_ID), API_HASH)

    # ── Connect (with stale-session self-healing) ─────────────────────────
    out("Connecting…")

    if not await try_connect(client):
        out(f"Connection timed out — deleting stale session ({session_path.name})")
        await client.disconnect()
        if session_path.exists():
            session_path.unlink()
        # Recreate client with fresh session
        client = TelegramClient(SESSION_FILE, int(API_ID), API_HASH)
        await client.connect()

    out("Connected to Telegram.")

    # ── Auth ──────────────────────────────────────────────────────────────
    if not await client.is_user_authorized():
        out("No saved session — starting login.")
        phone = PHONE or input("Phone number (e.g. +5511999887766): ")
        await client.send_code_request(phone)
        code = input("Enter the code you received: ")
        try:
            await client.sign_in(phone, code)
        except SessionPasswordNeededError:
            pw = input("Two-factor password: ")
            await client.sign_in(password=pw)

    me = await client.get_me()
    out(f"Logged in as {me.username or me.first_name} (id={me.id})")

    # ── Handler ───────────────────────────────────────────────────────────
    @client.on(events.NewMessage(from_users=BOT_USERNAME))
    async def handler(event):
        text = event.raw_text
        if not text:
            return
        data = parse_message(text)
        if data is None:
            out(f"WARN  could not parse: {text[:80]}")
            return
        inserted = insert_opportunity(conn, data)
        if inserted:
            out(f"NEW  roi={data['roi']:.2f}%  {data['casas']}  {data['evento'][:50]}")

    out(f"Listening for messages from @{BOT_USERNAME} …")

    try:
        await client.run_until_disconnected()
    finally:
        await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[sureedge] Stopped.", flush=True)
