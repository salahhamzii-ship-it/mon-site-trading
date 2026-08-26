#!/usr/bin/env python3
"""
SC Bridge — WebSocket server ws://localhost:8765
Lit les fichiers CSV Sierra Chart → diffuse JSON enrichi toutes les REFRESH_S secondes.

Format envoyé :
{
  "NQ": {
    "last": "30148.00",
    "j1_high": "30200.00", "j1_low": "29950.00",
    "j1_open": "29900.00", "j1_settle": "30100.00",
    "poc": "30100.00", "vah": "30150.00", "val": "30050.00",
    "bars_today": [{"time":"09:30","open":"...","high":"...","low":"...","close":"...","vwap":"...","sd1h":"...","sd1l":"...","sd2h":"...","sd2l":"..."}, ...],
    "bars_j1":    [...]
  },
  "ES": { ... }, "GC": { ... }, "CL": { ... }
}

Installation : pip install websockets pytz
Lancement   : python sc_bridge.py
"""

import asyncio
import json
import re
import sys
from datetime import date as date_t, timedelta
from pathlib import Path

try:
    import websockets
    from websockets.server import WebSocketServerProtocol
except ImportError:
    print("Manque : pip install websockets")
    sys.exit(1)

from datetime import datetime
def now_et(): return datetime.now()   # PC déjà en heure New York

# ─── CONFIG — CHEMINS DES FICHIERS CSV ────────────────────────────────────────
FILES = {
    'NQ': r"C:\SierraChart_CME\Data\NQ.csv.txt",
    'ES': r"C:\SierraChart_CME\Data\ESU26_FUT_CME[M]  30 Min  #15_GraphData.txt",
    'GC': r"C:\SierraChart_CME\Data\GC.csv.txt",
    'CL': r"C:\SierraChart_CME\Data\CL.csv.txt",
}

# Fenêtre RTH par instrument (ET) — début inclus, fin exclue
RTH_START = {'NQ': '09:30', 'ES': '09:30', 'GC': '08:20', 'CL': '09:00'}
RTH_END   = {'NQ': '16:00', 'ES': '16:00', 'GC': '13:30', 'CL': '14:30'}

WS_HOST   = 'localhost'
WS_PORT   = 8765
REFRESH_S = 10          # rafraîchissement CSV (secondes)

CLIENTS: set = set()

# ─── UTILITAIRES TEMPS ────────────────────────────────────────────────────────

def t2m(t: str) -> int:
    """'HH:MM' → minutes depuis minuit."""
    try:
        h, m = t.split(':')[:2]
        return int(h) * 60 + int(m)
    except Exception:
        return -1

def extract_time(s: str) -> str:
    """Extrait HH:MM depuis n'importe quel format Sierra Chart."""
    s = s.strip()
    if ' ' in s:
        s = s.split(' ')[-1]
    m = re.match(r'^(\d{1,2}):(\d{2})', s)
    if m:
        return f"{int(m.group(1)):02d}:{m.group(2)}"
    m = re.match(r'^(\d{1,2})[Hh](\d{2})', s)
    if m:
        return f"{int(m.group(1)):02d}:{m.group(2)}"
    m = re.match(r'^(\d{2})(\d{2})$', s)
    if m:
        return f"{m.group(1)}:{m.group(2)}"
    return ''

def parse_sc_date(s: str):
    """Parse 'YYYY-M-D' ou 'YYYY-MM-DD' Sierra Chart → objet date. None si échec."""
    try:
        parts = s.strip().split('-')
        return date_t(int(parts[0]), int(parts[1]), int(parts[2]))
    except Exception:
        return None

extract_date = parse_sc_date   # alias pour compatibilité

# ─── PARSING CSV ──────────────────────────────────────────────────────────────

def parse_csv(filepath: str) -> list:
    """Retourne [] silencieusement si le fichier est absent."""
    rows = []
    try:
        content = Path(filepath).read_text(encoding='utf-8-sig')
    except FileNotFoundError:
        return rows          # silencieux — GC/CL optionnels
    except Exception as e:
        print(f"[WARN] Lecture échouée {filepath}: {e}")
        return rows

    content = content.replace('\r\n', '\n').replace('\r', '\n')
    lines = [l for l in content.split('\n') if l.strip()]
    if len(lines) < 2:
        return rows

    hdr = lines[0]
    sep = (';' if hdr.count(';') > hdr.count(',') and hdr.count(';') > hdr.count('\t')
           else '\t' if hdr.count('\t') > hdr.count(',') else ',')

    def split(l):
        return [c.strip().strip('"') for c in l.split(sep)]

    hdrs = [h.lower().strip() for h in split(hdr)]

    def find(*names):
        for n in names:
            nc = n.replace(' ', '')
            for i, h in enumerate(hdrs):
                if h == n or h.replace(' ', '') == nc:
                    return i
        return -1

    idx_date = find('date')
    idx_time = find('time', 'heure', 'date/time', 'datetime', 'timestamp')
    idx_open = find('open')
    idx_high = find('high')
    idx_low  = find('low')
    idx_last = find('last', 'close', 'clôture', 'cloture')
    idx_vwap = find('vwap')
    idx_sp1  = find('sd+1', 'sd +1', 'vwap sd+1', '+1sd')
    idx_sm1  = find('sd-1', 'sd -1', 'vwap sd-1', '-1sd')
    idx_sp2  = find('sd+2', 'sd +2', 'vwap sd+2', '+2sd')
    idx_sm2  = find('sd-2', 'sd -2', 'vwap sd-2', '-2sd')
    idx_poc  = find('tpo poc')
    idx_vah  = find('tpo vah')
    idx_val  = find('tpo val')

    time_col = idx_time if idx_time >= 0 else idx_date
    if time_col < 0:
        print(f"[WARN] Colonne horaire introuvable dans {filepath}")
        return rows

    def get(cols, j):
        if j < 0 or j >= len(cols):
            return ''
        return cols[j].strip()

    for line in lines[1:]:
        cols = split(line)
        raw = get(cols, time_col)
        if not raw:
            continue

        # Date + heure
        if idx_date >= 0 and idx_time >= 0:
            date_obj = extract_date(get(cols, idx_date))
            time_s = extract_time(get(cols, idx_time))
        elif ' ' in raw:
            parts = raw.split(' ', 1)
            date_obj = extract_date(parts[0])
            time_s = extract_time(parts[1])
        else:
            date_obj = None
            time_s = extract_time(raw)

        if not time_s:
            continue

        rows.append({
            'date':    date_obj,
            'time':    time_s,
            'open':    get(cols, idx_open),
            'high':    get(cols, idx_high),
            'low':     get(cols, idx_low),
            'close':   get(cols, idx_last),
            'vwap':    get(cols, idx_vwap),
            'sd1h':    get(cols, idx_sp1),
            'sd1l':    get(cols, idx_sm1),
            'sd2h':    get(cols, idx_sp2),
            'sd2l':    get(cols, idx_sm2),
            'tpo_poc': get(cols, idx_poc),
            'tpo_vah': get(cols, idx_vah),
            'tpo_val': get(cols, idx_val),
        })

    return rows

# ─── CALCUL PAYLOAD ───────────────────────────────────────────────────────────

def filter_rth(rows: list, instr: str) -> list:
    s, e = t2m(RTH_START[instr]), t2m(RTH_END[instr])
    return [r for r in rows if s <= t2m(r['time']) < e]

def agg_high(rows):
    vals = [float(r['high']) for r in rows if r.get('high')]
    return f"{max(vals):.2f}" if vals else ''

def agg_low(rows):
    vals = [float(r['low']) for r in rows if r.get('low') and float(r['low']) > 0]
    return f"{min(vals):.2f}" if vals else ''

def bar_dict(r: dict) -> dict:
    return {
        'time':  r['time'],
        'open':  r['open'],
        'high':  r['high'],
        'low':   r['low'],
        'close': r['close'],
        'vwap':  r.get('vwap', ''),
        'sd1h':  r.get('sd1h', ''),
        'sd1l':  r.get('sd1l', ''),
        'sd2h':  r.get('sd2h', ''),
        'sd2l':  r.get('sd2l', ''),
    }

def session_split(rows: list, instr: str) -> tuple:
    """
    Si les lignes n'ont pas de date (CSV intraday sans date explicite),
    on détecte les sessions par reset de l'heure.
    Retourne (today_rows, j1_rows).
    """
    rth = filter_rth(rows, instr)
    sessions = []
    cur = []
    for r in rth:
        if cur and t2m(r['time']) < t2m(cur[-1]['time']):
            sessions.append(cur)
            cur = [r]
        else:
            cur.append(r)
    if cur:
        sessions.append(cur)
    today = sessions[-1] if sessions else []
    j1    = sessions[-2] if len(sessions) >= 2 else []
    return today, j1

def build_payload(instr: str, all_rows: list) -> dict:
    now    = now_et()
    today  = now.date()
    # J-1 : vendredi si lundi, sinon hier
    delta  = 3 if today.weekday() == 0 else 1
    j1_d   = today - timedelta(days=delta)

    has_dates = any(r['date'] is not None for r in all_rows[:20])

    if has_dates:
        today_all  = [r for r in all_rows if r['date'] == today]   # OVN + RTH
        today_rows = filter_rth(today_all, instr)                   # RTH only
        j1_rows    = filter_rth([r for r in all_rows if r['date'] == j1_d], instr)
        # OVN sessions pour ALN : Asia (J-1 18h → today 02h), London (today 02h-08h)
        asia_j1     = [r for r in all_rows if r['date'] == j1_d and t2m(r['time']) >= t2m('18:00')]
        asia_today  = [r for r in all_rows if r['date'] == today  and t2m(r['time']) <  t2m('02:00')]
        bars_asia   = asia_j1 + asia_today
        bars_london = [r for r in all_rows if r['date'] == today
                       and t2m('02:00') <= t2m(r['time']) < t2m('08:00')]
    else:
        today_rows, j1_rows = session_split(all_rows, instr)
        today_all = today_rows
        bars_asia = bars_london = []

    last_j1  = j1_rows[-1]  if j1_rows  else {}
    first_j1 = j1_rows[0]   if j1_rows  else {}

    # last= : barre RTH today → barre OVN today → dernière barre J-1 RTH
    if today_rows:
        last_val = today_rows[-1]['close']
    elif today_all:
        last_val = today_all[-1]['close']        # cours OVN avant ouverture RTH
    elif j1_rows:
        last_val = j1_rows[-1]['close']
    else:
        last_val = all_rows[-1]['close'] if all_rows else ''

    return {
        'last':      last_val,
        # J-1 aggregates
        'j1_high':   agg_high(j1_rows),
        'j1_low':    agg_low(j1_rows),
        'j1_open':   first_j1.get('open', ''),
        'j1_settle': last_j1.get('close', ''),
        'poc':       last_j1.get('tpo_poc', ''),
        'vah':       last_j1.get('tpo_vah', ''),
        'val':       last_j1.get('tpo_val', ''),
        # Barres détaillées
        'bars_today':  [bar_dict(r) for r in sorted(today_rows, key=lambda r: t2m(r['time']))],
        'bars_j1':     [bar_dict(r) for r in sorted(j1_rows,    key=lambda r: t2m(r['time']))],
        # OVN sessions pour ALN (Asia garde l'ordre chronologique J-1→today)
        'bars_asia':   [bar_dict(r) for r in bars_asia],
        'bars_london': [bar_dict(r) for r in bars_london],
    }

def build_message() -> str:
    from datetime import date as _date
    now    = now_et()
    today  = now.date()
    delta  = 3 if today.weekday() == 0 else 1
    j1_d   = today - __import__('datetime').timedelta(days=delta)
    print(f"\n  today = {today.year}-{today.month}-{today.day}  (j1 = {j1_d.year}-{j1_d.month}-{j1_d.day})")

    data = {}
    for instr, filepath in FILES.items():
        rows = parse_csv(filepath)
        if not rows:
            # fichier absent ou vide → instrument omis du JSON
            continue

        # Debug : dernière date lue dans le CSV
        dated = [r['date'] for r in rows if r['date'] is not None]
        if dated:
            last_csv_date = max(dated)
            print(f"  {instr}: dernière date CSV = {last_csv_date.year}-{last_csv_date.month}-{last_csv_date.day}  match={last_csv_date == today}")
        else:
            print(f"  {instr}: aucune date parsée dans le CSV (vérifier format colonne Date)")

        data[instr] = build_payload(instr, rows)
        bt = data[instr]['bars_today']
        bj = data[instr]['bars_j1']
        print(f"  {instr}: {len(bt)} barres today / {len(bj)} barres J-1  last={data[instr]['last']}")
    return json.dumps(data)

# ─── SERVEUR WEBSOCKET ────────────────────────────────────────────────────────

async def handler(ws: WebSocketServerProtocol) -> None:
    CLIENTS.add(ws)
    print(f"[+] Client connecté ({len(CLIENTS)} actif(s))")
    try:
        msg = build_message()
        await ws.send(msg)
        async for _ in ws:
            pass
    except Exception:
        pass
    finally:
        CLIENTS.discard(ws)
        print(f"[-] Client déconnecté ({len(CLIENTS)} actif(s))")

async def broadcast_loop() -> None:
    while True:
        await asyncio.sleep(REFRESH_S)
        if not CLIENTS:
            continue
        print(f"\n[{now_et().strftime('%H:%M:%S')}] Rafraîchissement ({len(CLIENTS)} client(s))...")
        try:
            msg = build_message()
            results = await asyncio.gather(
                *[ws.send(msg) for ws in list(CLIENTS)],
                return_exceptions=True
            )
            for r in results:
                if isinstance(r, Exception):
                    print(f"  [WARN] Envoi échoué : {r}")
        except Exception as e:
            print(f"  [ERR] broadcast: {e}")

async def main() -> None:
    print(f"SC Bridge ws://{WS_HOST}:{WS_PORT}  (rafraîchissement {REFRESH_S}s)")
    print("Fichiers configurés :")
    for k, v in FILES.items():
        exists = Path(v).exists()
        status = "OK" if exists else "absent (ignoré)"
        print(f"  {k}: {v}  [{status}]")
    print()
    async with websockets.serve(handler, WS_HOST, WS_PORT):
        await broadcast_loop()

if __name__ == '__main__':
    asyncio.run(main())
