"""Telethon userbot — listens to @greensurebet_bot DMs and stores opportunities."""

import asyncio
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient, events

load_dotenv(Path(__file__).parent / ".env")

from database import init_db, insert_opportunity
from parser import parse_message

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("sureedge")

# ── Config via env vars ───────────────────────────────────────────────────────
API_ID = os.environ.get("TELEGRAM_API_ID")
API_HASH = os.environ.get("TELEGRAM_API_HASH")
SESSION_FILE = os.environ.get("TELEGRAM_SESSION", "sureedge_session")
PHONE        = os.environ.get("TELEGRAM_PHONE")   # opcional, ex: +5511999887766
BOT_USERNAME = "greensurebet18_bot"

if not API_ID or not API_HASH:
    sys.exit("Set TELEGRAM_API_ID and TELEGRAM_API_HASH environment variables.")

client = TelegramClient(SESSION_FILE, int(API_ID), API_HASH)
conn = init_db()


@client.on(events.NewMessage(from_users=BOT_USERNAME))
async def handler(event):
    """Process each new message from the surebet bot."""
    text = event.raw_text
    if not text:
        return

    data = parse_message(text)
    if data is None:
        log.warning("Could not parse message: %s", text[:80])
        return

    inserted = insert_opportunity(conn, data)
    if inserted:
        log.info("NEW  roi=%.2f%%  %s  %s", data["roi"], data["casas"], data["evento"][:50])
    else:
        log.debug("DUP  %s", data["dedup_key"][:16])


async def main():
    await client.start()
    me = await client.get_me()
    log.info("Logged in as %s (id=%d)", me.username or me.first_name, me.id)
    log.info("Listening for messages from @%s …", BOT_USERNAME)
    await client.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())
