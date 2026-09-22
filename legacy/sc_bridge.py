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
import threading
from datetime import date as date_t, timedelta
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

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
    'NQ': r"C:\SierraChart_CME\Data\nq 30 mn.txt",
    'ES': r"C:\SierraChart_CME\Data\ESU26_FUT_CME[M]  30 Min  #17_GraphData.txt",
    'GC': r"C:\SierraChart_CME\Data\GC.csv.txt",
    'CL': r"C:\SierraChart_CME\Data\CL.csv.txt",
}

# Fenêtre RTH par instrument (ET) — début inclus, fin exclue
RTH_START = {'NQ': '09:30', 'ES': '09:30', 'GC': '08:20', 'CL': '09:00'}
RTH_END   = {'NQ': '16:00', 'ES': '16:00', 'GC': '13:30', 'CL': '14:30'}

WS_HOST   = '0.0.0.0'
WS_PORT   = 8765
HTTP_PORT = 8766
REFRESH_S = 10

# Dossier de réception des CSV envoyés par send_csv.bat depuis Windows
import sys as _sys, os as _os
if _sys.platform != 'win32':
    _UPLOAD_DIR = '/tmp/sc-bridge'
    _os.makedirs(_UPLOAD_DIR, exist_ok=True)
    FILES = {k: f"{_UPLOAD_DIR}/{k}.csv" for k in ('NQ','ES','GC','CL')}
del _sys, _os

CLIENTS: set = set()
LAST_MSG: str = '{}'    # dernier payload JSON (partagé WS + HTTP)

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

def parse_csv(filepath: str, diag: bool = False) -> list:
    """Retourne [] silencieusement si le fichier est absent.
    diag=True : affiche les headers détectés et les indices de colonnes.
    """
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

    if diag:
        print(f"  [DIAG] Séparateur détecté : {repr(sep)}")
        print(f"  [DIAG] Headers bruts      : {split(hdr)}")
        print(f"  [DIAG] Headers normalisés : {hdrs}")

    def find(*names):
        """Cherche par nom exact (insensible casse + espaces) ou sous-chaîne partielle."""
        for n in names:
            nc = n.replace(' ', '').lower()
            # 1) correspondance exacte
            for i, h in enumerate(hdrs):
                if h == n.lower() or h.replace(' ', '') == nc:
                    return i
            # 2) correspondance partielle (le header contient le terme)
            for i, h in enumerate(hdrs):
                if nc in h.replace(' ', ''):
                    return i
        return -1

    idx_date = find('date')
    idx_time = find('time', 'heure', 'date/time', 'datetime', 'timestamp', 'dateheure')
    idx_open = find('open', 'ouverture', 'ouvr')
    idx_high = find('high', 'haut', 'plus haut')
    idx_low  = find('low', 'bas', 'plus bas')
    idx_last = find('last', 'close', 'clôture', 'cloture', 'dernier', 'cloture')
    idx_vol  = find('volume', 'vol', 'totalvolume', 'total volume')
    idx_vwap = find('vwap', 'vwap(daily)', 'dailyvwap', 'vwap daily')
    idx_sp1  = find('sd+1', 'sd +1', 'vwap sd+1', '+1sd', 'upper1', 'upper band 1', 'upperband1', 'bande+1', 'bande +1')
    idx_sm1  = find('sd-1', 'sd -1', 'vwap sd-1', '-1sd', 'lower1', 'lower band 1', 'lowerband1', 'bande-1', 'bande -1')
    idx_sp2  = find('sd+2', 'sd +2', 'vwap sd+2', '+2sd', 'upper2', 'upper band 2', 'upperband2', 'bande+2', 'bande +2')
    idx_sm2  = find('sd-2', 'sd -2', 'vwap sd-2', '-2sd', 'lower2', 'lower band 2', 'lowerband2', 'bande-2', 'bande -2')
    idx_poc  = find('tpo poc', 'poc', 'pointofcontrol', 'point of control')
    idx_vah  = find('tpo vah', 'vah', 'valuearehigh', 'value area high')
    idx_val  = find('tpo val', 'val', 'valuearealow', 'value area low')

    # Fallback positionnel Sierra Chart standard : Date,Time,Open,High,Low,Last,...
    # Si OHLC non trouvés par nom mais que date+time sont col 0+1, tenter positions fixes
    _sc_std = (idx_date == 0 and idx_time == 1
               and idx_open < 0 and idx_high < 0 and idx_low < 0 and idx_last < 0
               and len(hdrs) >= 6)
    if _sc_std:
        idx_open = 2; idx_high = 3; idx_low = 4; idx_last = 5
        if diag:
            print("  [DIAG] OHLC non trouvés par nom → fallback positionnel SC (col 2-5)")

    # Volume : fallback positionnel même quand OHLC trouvé par nom (col 6 = Volume en SC standard)
    if idx_vol < 0 and idx_date == 0 and idx_time == 1 and len(hdrs) >= 7:
        idx_vol = 6

    # VWAP/SD positional fallback pour exports Sierra Chart multi-études (40+ colonnes)
    # Sierra Chart : col 14 = VWAP session cumulatif 18h, cols 15-18 = SD ±1/±2
    if idx_vwap < 0 and idx_date == 0 and idx_time == 1 and len(hdrs) >= 15:
        idx_vwap = 14
        if diag:
            print("  [DIAG] VWAP non trouvé par nom → fallback positionnel col 14")
    if idx_sp1 < 0 and idx_date == 0 and idx_time == 1 and len(hdrs) >= 16:
        idx_sp1 = 15
    if idx_sm1 < 0 and idx_date == 0 and idx_time == 1 and len(hdrs) >= 17:
        idx_sm1 = 16
    if idx_sp2 < 0 and idx_date == 0 and idx_time == 1 and len(hdrs) >= 18:
        idx_sp2 = 17
    if idx_sm2 < 0 and idx_date == 0 and idx_time == 1 and len(hdrs) >= 19:
        idx_sm2 = 18

    if diag:
        print(f"  [DIAG] idx_date={idx_date}  idx_time={idx_time}  "
              f"idx_open={idx_open}  idx_high={idx_high}  idx_low={idx_low}  idx_last={idx_last}")
        print(f"  [DIAG] idx_vwap={idx_vwap}  idx_sp1={idx_sp1}  idx_sm1={idx_sm1}  "
              f"idx_sp2={idx_sp2}  idx_sm2={idx_sm2}")
        print(f"  [DIAG] idx_poc={idx_poc}  idx_vah={idx_vah}  idx_val={idx_val}")
        # Affiche la première ligne de données brute
        if len(lines) > 1:
            print(f"  [DIAG] 1ère ligne données : {lines[1]}")
            print(f"  [DIAG] 1ère ligne colonnes: {split(lines[1])}")

    time_col = idx_time if idx_time >= 0 else idx_date
    if time_col < 0:
        print(f"[WARN] Colonne horaire introuvable dans {filepath}")
        if diag:
            print(f"  [DIAG] Aucune colonne 'date/time/heure' trouvée — parsing impossible.")
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
            'vol':     get(cols, idx_vol),
            'vwap':    get(cols, idx_vwap),
            'sd1h':    get(cols, idx_sp1),
            'sd1l':    get(cols, idx_sm1),
            'sd2h':    get(cols, idx_sp2),
            'sd2l':    get(cols, idx_sm2),
            'tpo_poc': get(cols, idx_poc),
            'tpo_vah': get(cols, idx_vah),
            'tpo_val': get(cols, idx_val),
        })

    if diag and rows:
        print(f"  [DIAG] 1ère barre parsée   : date={rows[0]['date']}  time={rows[0]['time']}  "
              f"open={rows[0]['open']}  high={rows[0]['high']}  low={rows[0]['low']}  close={rows[0]['close']}")
        print(f"  [DIAG] Total lignes parsées: {len(rows)}")

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

def compute_vwap(bars: list) -> str:
    """VWAP ancré au début de la liste : Σ(typical_price × volume) / Σ(volume).
    Si pas de volume, utilise le VWAP Sierra Chart exporté (dernière barre avec valeur non nulle).
    """
    cum_pv = 0.0
    cum_v  = 0.0
    sc_vwap = ''
    for r in bars:
        try:
            h = float(r['high']); l = float(r['low']); c = float(r['close'])
            v = float(r.get('vol', '') or 0)
            tp = (h + l + c) / 3
            if v > 0:
                cum_pv += tp * v
                cum_v  += v
        except (ValueError, TypeError):
            pass
        vv = r.get('vwap', '') or ''
        try:
            if vv and float(vv) > 0:
                sc_vwap = f"{float(vv):.2f}"
        except (ValueError, TypeError):
            pass
    if cum_v > 0:
        return f"{cum_pv / cum_v:.2f}"
    return sc_vwap   # fallback : VWAP exporté par Sierra Chart

def atr_auto(all_rows: list, instr: str, n: int = 10) -> str:
    """Moyenne des ranges RTH des n dernières sessions (High - Low)."""
    dates = sorted({r['date'] for r in all_rows if r['date'] is not None}, reverse=True)
    ranges = []
    for d in dates:
        rth = filter_rth([r for r in all_rows if r['date'] == d], instr)
        if not rth:
            continue
        try:
            h = max(float(r['high']) for r in rth if r.get('high'))
            l = min(float(r['low'])  for r in rth if r.get('low') and float(r['low']) > 0)
            if h > l:
                ranges.append(h - l)
        except (ValueError, TypeError):
            pass
        if len(ranges) >= n:
            break
    return f"{sum(ranges)/len(ranges):.2f}" if ranges else ''

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
        # OVN : Asie (J-1 18h→today 02h) + Londres (today 02h→08h)
        asia_j1     = [r for r in all_rows if r['date'] == j1_d and t2m(r['time']) >= t2m('18:00')]
        asia_today  = [r for r in all_rows if r['date'] == today  and t2m(r['time']) <  t2m('02:00')]
        bars_asia   = asia_j1 + asia_today
        bars_london = [r for r in all_rows if r['date'] == today
                       and t2m('02:00') <= t2m(r['time']) < t2m('08:00')]
        # Pré-RTH : 08h→09h30 (NQ/ES)
        bars_pre    = [r for r in all_rows if r['date'] == today
                       and t2m('08:00') <= t2m(r['time']) < t2m(RTH_START[instr])]
    else:
        today_rows, j1_rows = session_split(all_rows, instr)
        today_all = today_rows
        bars_asia = bars_london = bars_pre = []

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

    # OVN VWAP ancré à 18h : calculé depuis les barres OVN via OHLCV
    all_ovn = bars_asia + bars_london + bars_pre
    ovn_vwap = compute_vwap(all_ovn) if all_ovn else compute_vwap(today_all)

    # Asia High/Low pour envoi direct
    asia_hs = [float(r['high']) for r in bars_asia if r.get('high')]
    asia_ls = [float(r['low'])  for r in bars_asia if r.get('low') and float(r['low'])>0]
    asia_high  = f"{max(asia_hs):.2f}" if asia_hs else ''
    asia_low   = f"{min(asia_ls):.2f}" if asia_ls else ''
    asia_close = bars_asia[-1]['close'] if bars_asia else ''

    # London High/Low
    lon_hs = [float(r['high']) for r in bars_london if r.get('high')]
    lon_ls = [float(r['low'])  for r in bars_london if r.get('low') and float(r['low'])>0]
    lon_high  = f"{max(lon_hs):.2f}" if lon_hs else ''
    lon_low   = f"{min(lon_ls):.2f}" if lon_ls else ''
    lon_close = bars_london[-1]['close'] if bars_london else ''

    # OVN agrégat (Asia + London + Pré-RTH)
    ovn_hs  = [float(r['high']) for r in all_ovn if r.get('high')]
    ovn_ls  = [float(r['low'])  for r in all_ovn if r.get('low') and float(r['low']) > 0]
    ovn_high  = f"{max(ovn_hs):.2f}"  if ovn_hs  else ''
    ovn_low   = f"{min(ovn_ls):.2f}"  if ovn_ls  else ''
    ovn_close = all_ovn[-1]['close']   if all_ovn else ''

    # OVN POC/VAH/VAL : dernière barre OVN avec valeur non nulle
    def _last_nonempty(bars, key):
        for r in reversed(bars):
            v = (r.get(key) or '').strip()
            try:
                if v and float(v) > 0: return f"{float(v):.2f}"
            except (ValueError, TypeError):
                pass
        return ''

    ovn_poc  = _last_nonempty(all_ovn, 'tpo_poc')
    ovn_vah  = _last_nonempty(all_ovn, 'tpo_vah')
    ovn_val  = _last_nonempty(all_ovn, 'tpo_val')
    ovn_sd1h = _last_nonempty(all_ovn, 'sd1h')
    ovn_sd1l = _last_nonempty(all_ovn, 'sd1l')
    ovn_sd2h = _last_nonempty(all_ovn, 'sd2h')
    ovn_sd2l = _last_nonempty(all_ovn, 'sd2l')

    return {
        'last':       last_val,
        # J-1 aggregates
        'j1_high':    agg_high(j1_rows),
        'j1_low':     agg_low(j1_rows),
        'j1_open':    first_j1.get('open', ''),
        'j1_settle':  last_j1.get('close', ''),
        'poc':        last_j1.get('tpo_poc', ''),
        'vah':        last_j1.get('tpo_vah', ''),
        'val':        last_j1.get('tpo_val', ''),
        # OVN calculés
        'ovn_vwap':   ovn_vwap,
        'atr_auto':   atr_auto(all_rows, instr),
        'asia_high':  asia_high,
        'asia_low':   asia_low,
        'asia_close': asia_close,
        'lon_high':   lon_high,
        'lon_low':    lon_low,
        'lon_close':  lon_close,
        # OVN agrégat
        'ovn_high':   ovn_high,
        'ovn_low':    ovn_low,
        'ovn_close':  ovn_close,
        'ovn_poc':    ovn_poc,
        'ovn_vah':    ovn_vah,
        'ovn_val':    ovn_val,
        'ovn_sd1h':   ovn_sd1h,
        'ovn_sd1l':   ovn_sd1l,
        'ovn_sd2h':   ovn_sd2h,
        'ovn_sd2l':   ovn_sd2l,
        # Barres détaillées
        'bars_today':  [bar_dict(r) for r in sorted(today_rows, key=lambda r: t2m(r['time']))],
        'bars_j1':     [bar_dict(r) for r in sorted(j1_rows,    key=lambda r: t2m(r['time']))],
        'bars_asia':   [bar_dict(r) for r in bars_asia],
        'bars_london': [bar_dict(r) for r in bars_london],
    }

_DIAG_DONE: set = set()   # instruments déjà diagnostiqués (une seule fois)

def build_message() -> str:
    from datetime import date as _date
    now    = now_et()
    today  = now.date()
    delta  = 3 if today.weekday() == 0 else 1
    j1_d   = today - __import__('datetime').timedelta(days=delta)
    print(f"\n  today = {today.year}-{today.month}-{today.day}  (j1 = {j1_d.year}-{j1_d.month}-{j1_d.day})")

    data = {}
    for instr, filepath in FILES.items():
        diag = instr not in _DIAG_DONE
        if diag:
            print(f"\n  [DIAG] ── {instr} ─── {filepath}")
        rows = parse_csv(filepath, diag=diag)
        if diag:
            _DIAG_DONE.add(instr)
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

# ─── SERVEUR HTTP (proxy Vercel) ──────────────────────────────────────────────

class _HttpHandler(BaseHTTPRequestHandler):
    INSTRUMENTS = {'NQ', 'ES', 'GC', 'CL'}

    def do_GET(self):
        if self.path == '/data':
            body = LAST_MSG.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == '/health':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        # /upload/NQ, /upload/ES, /upload/GC, /upload/CL
        parts = self.path.strip('/').split('/')
        if len(parts) == 2 and parts[0] == 'upload' and parts[1].upper() in self.INSTRUMENTS:
            instr = parts[1].upper()
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                import tempfile, shutil
                dest = FILES.get(instr, f'/tmp/sc-bridge/{instr}.csv')
                Path(dest).parent.mkdir(parents=True, exist_ok=True)
                # Écriture atomique via fichier temporaire
                tmp = dest + '.tmp'
                Path(tmp).write_bytes(body)
                shutil.move(tmp, dest)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
                print(f"  [upload] {instr} {len(body)} octets")
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(f'{{"error":"{e}"}}'.encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args): pass

def _start_http():
    server = HTTPServer(('0.0.0.0', HTTP_PORT), _HttpHandler)
    print(f"SC Bridge HTTP http://0.0.0.0:{HTTP_PORT}/data")
    server.serve_forever()

# ─── SERVEUR WEBSOCKET ────────────────────────────────────────────────────────

async def handler(ws: WebSocketServerProtocol) -> None:
    global LAST_MSG
    CLIENTS.add(ws)
    print(f"[+] Client connecté ({len(CLIENTS)} actif(s))")
    try:
        msg = build_message()
        LAST_MSG = msg
        await ws.send(msg)
        async for _ in ws:
            pass
    except Exception:
        pass
    finally:
        CLIENTS.discard(ws)
        print(f"[-] Client déconnecté ({len(CLIENTS)} actif(s))")

async def broadcast_loop() -> None:
    global LAST_MSG
    while True:
        await asyncio.sleep(REFRESH_S)
        print(f"\n[{now_et().strftime('%H:%M:%S')}] Rafraîchissement ({len(CLIENTS)} client(s))...")
        try:
            msg = build_message()
            LAST_MSG = msg
            if not CLIENTS:
                continue
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
    threading.Thread(target=_start_http, daemon=True).start()
    async with websockets.serve(handler, WS_HOST, WS_PORT):
        await broadcast_loop()

if __name__ == '__main__':
    asyncio.run(main())
