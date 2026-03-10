"""Seed the local DB with sample opportunities for testing market.html.

Usage:
  python seed.py           — insert sample data (skips duplicates)
  python seed.py --reset   — wipe DB, then insert sample data
"""

import sys
from pathlib import Path

from database import DB_PATH, init_db, insert_opportunity
from parser import parse_message


def reset_db():
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"Deleted {DB_PATH}")
    else:
        print("No DB found, nothing to delete.")

MESSAGES = [
    """🏘 Casas: Betfast x Pinnacle
💰 LUCRO: 3.31%
➡ Cadenasso, Gianluca - Monteiro, Thiago
🏆 Tênis / Challenger. Santiago, Chile
⏰ Data: 10/03 12:20
🟡 Betfast: @1.71  - Link direto
✅ Aposta: AH1 (+4.5)
🟡 Pinnacle: @2.61  - Link direto
✅ Aposta: AH2 (-4.5)""",

    """🏘 Casas: Sportingbet x Pinnacle
💰 LUCRO: 2.85%
➡ Real Madrid - Barcelona
🏆 Futebol / La Liga
⏰ Data: 10/03 21:00
🟡 Sportingbet: @2.10  - Link direto
✅ Aposta: 1X2 Casa
🟡 Pinnacle: @1.95  - Link direto
✅ Aposta: 1X2 Fora""",

    """🏘 Casas: Betano x Bet365
💰 LUCRO: 4.12%
➡ Djokovic, Novak - Alcaraz, Carlos
🏆 Tênis / ATP Masters 1000
⏰ Data: 10/03 15:00
🟡 Betano: @1.85  - Link direto
✅ Aposta: ML Casa
🟡 Bet365: @2.20  - Link direto
✅ Aposta: ML Fora""",

    """🏘 Casas: Betfast x Sportingbet
💰 LUCRO: 2.20%
➡ Lakers - Celtics
🏆 Basquete / NBA
⏰ Data: 11/03 02:30
🟡 Betfast: @1.91  - Link direto
✅ Aposta: ML Casa
🟡 Sportingbet: @2.05  - Link direto
✅ Aposta: ML Fora""",

    """🏘 Casas: Pinnacle x Betano
💰 LUCRO: 3.75%
➡ Sinner, Jannik - Zverev, Alexander
🏆 Tênis / ATP 500
⏰ Data: 10/03 18:00
🟡 Pinnacle: @1.62  - Link direto
✅ Aposta: AH1 (+1.5)
🟡 Betano: @2.80  - Link direto
✅ Aposta: AH2 (-1.5)""",

    """🏘 Casas: Bet365 x Pinnacle
💰 LUCRO: 2.50%
➡ Manchester City - Arsenal
🏆 Futebol / Premier League
⏰ Data: 11/03 17:30
🟡 Bet365: @2.40  - Link direto
✅ Aposta: Over 2.5
🟡 Pinnacle: @1.72  - Link direto
✅ Aposta: Under 2.5""",

    """🏘 Casas: Betfast x Betano
💰 LUCRO: 5.01%
➡ Tsitsipas, Stefanos - Medvedev, Daniil
🏆 Tênis / ATP Masters 1000
⏰ Data: 09/03 20:00
🟡 Betfast: @1.55  - Link direto
✅ Aposta: ML Casa
🟡 Betano: @2.98  - Link direto
✅ Aposta: ML Fora""",

    """🏘 Casas: Sportingbet x Bet365
💰 LUCRO: 2.98%
➡ Santos - Flamengo
🏆 Futebol / Brasileirão
⏰ Data: 09/03 19:00
🟡 Sportingbet: @3.10  - Link direto
✅ Aposta: 1X2 Casa
🟡 Bet365: @1.44  - Link direto
✅ Aposta: 1X2 Fora""",
]

if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset_db()

    conn = init_db()
    inserted = 0
    skipped = 0

    for msg in MESSAGES:
        data = parse_message(msg)
        if data is None:
            print("PARSE FAIL:", msg[:60])
            continue
        ok = insert_opportunity(conn, data)
        if ok:
            inserted += 1
            print(f"OK  {data['casas']:<35} roi={data['roi']}%  {data['evento'][:40]}")
        else:
            skipped += 1
            print(f"DUP {data['casas']}")

    print(f"\n{inserted} inserted, {skipped} skipped (duplicates)")
