#!/usr/bin/env python3
"""
alarm_service.py — Alarme nocturne NQ, indépendante du navigateur.
Surveille /data du bridge toutes les 3s.
Entre 18h-06h NY : popup modale + son en boucle si NQ touche un band SD.

Usage :
  python alarm_service.py              # service continu
  python alarm_service.py --test-sound    # test son 5s
  python alarm_service.py --test-popup    # test popup
  python alarm_service.py --test-trigger  # simule déclenchement SD immédiat
"""

import ctypes
import datetime
import json
import logging
import logging.handlers
import math
import os
import struct
import sys
import threading
import time
import urllib.error
import urllib.request
import wave

# ── Config ─────────────────────────────────────────────────────────────────

_DIR        = os.path.dirname(os.path.abspath(__file__))
BRIDGE_URL  = "http://localhost:8766/data"
BANDS       = ["sd1h", "sd2h", "sd1l", "sd2l"]
POLL_SEC    = 3
TOLERANCE   = 15.0       # points — zone de touch autour du band
NIGHT_START = 18         # heure NY inclusive (18:00)
NIGHT_END   = 6          # heure NY exclusive (06:00)
BRIDGE_DEAD = 120        # secondes sans réponse → popup bridge mort
ACK_COOLDOWN = 60        # secondes avant ré-armement du même band
LOG_FILE    = os.path.join(_DIR, "alarm.log")
WAV_FILE    = os.path.join(_DIR, "alarm.wav")

# ── Windows constants ───────────────────────────────────────────────────────

ES_CONTINUOUS       = 0x80000000
ES_SYSTEM_REQUIRED  = 0x00000001
ES_DISPLAY_REQUIRED = 0x00000002

MB_OK          = 0x0000
MB_ICONWARNING = 0x0030
MB_SYSTEMMODAL = 0x1000
MB_TOPMOST     = 0x00040000

SND_FILENAME  = 0x00020000
SND_ASYNC     = 0x0001
SND_LOOP      = 0x0008
SND_NODEFAULT = 0x0002
SND_PURGE     = 0x0040

# ── Logging ─────────────────────────────────────────────────────────────────

def _setup_logging():
    fmt = logging.Formatter("%(asctime)s %(levelname)-8s %(message)s", "%Y-%m-%d %H:%M:%S")
    fh = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=2, encoding="utf-8"
    )
    fh.setFormatter(fmt)
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(fh)
    try:
        if sys.stdout and sys.stdout.isatty():
            sh = logging.StreamHandler(sys.stdout)
            sh.setFormatter(fmt)
            root.addHandler(sh)
    except Exception:
        pass

log = logging.getLogger(__name__)

# ── WAV (pur stdlib) ────────────────────────────────────────────────────────

def _generate_wav(path: str, freq: int = 1200, duration: float = 1.0, rate: int = 44100):
    """Génère un bip strident sans aucune dépendance externe."""
    n = int(rate * duration)
    fade = int(rate * 0.005)   # 5 ms fade in/out pour éviter le clic
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        data = bytearray()
        for i in range(n):
            env = 1.0
            if i < fade:
                env = i / fade
            elif i > n - fade:
                env = (n - i) / fade
            s = int(32767 * env * math.sin(2 * math.pi * freq * i / rate))
            data += struct.pack("<h", max(-32768, min(32767, s)))
        wf.writeframes(bytes(data))

def ensure_wav():
    if not os.path.exists(WAV_FILE):
        _generate_wav(WAV_FILE)
        log.info(f"alarm.wav généré : {WAV_FILE}")

# ── Audio (winmm via ctypes) ────────────────────────────────────────────────

def _play_loop():
    try:
        winmm = ctypes.WinDLL("winmm")
        flags = SND_FILENAME | SND_ASYNC | SND_LOOP | SND_NODEFAULT
        winmm.PlaySoundW(WAV_FILE, None, flags)
    except Exception as e:
        log.error(f"PlaySound : {e}")

def _stop_sound():
    try:
        winmm = ctypes.WinDLL("winmm")
        winmm.PlaySoundW(None, None, SND_PURGE)
    except Exception as e:
        log.error(f"StopSound : {e}")

# ── Popup Windows ───────────────────────────────────────────────────────────

def _popup(title: str, msg: str) -> int:
    utype = MB_OK | MB_ICONWARNING | MB_SYSTEMMODAL | MB_TOPMOST
    try:
        return ctypes.windll.user32.MessageBoxW(0, msg, title, utype)
    except Exception as e:
        log.error(f"MessageBoxW : {e}")
        return 0

# ── Sleep prevention ────────────────────────────────────────────────────────

def _prevent_sleep():
    try:
        ctypes.windll.kernel32.SetThreadExecutionState(
            ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
        )
        log.info("Sleep Windows inhibé (mode nuit actif)")
    except Exception as e:
        log.warning(f"SetThreadExecutionState : {e}")

def _allow_sleep():
    try:
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)
        log.info("Sleep Windows autorisé (mode jour)")
    except Exception as e:
        log.warning(f"Allow sleep : {e}")

# ── Heure NY ────────────────────────────────────────────────────────────────

def _ny_now() -> datetime.datetime:
    """Heure NY = UTC − 5h (EST) ou UTC − 4h (EDT)."""
    utc = datetime.datetime.utcnow()
    y = utc.year
    # 2e dimanche de mars = début DST
    mar8  = datetime.datetime(y, 3, 8)
    dst_s = mar8 + datetime.timedelta(days=(6 - mar8.weekday()) % 7)
    # 1er dimanche de novembre = fin DST
    nov1  = datetime.datetime(y, 11, 1)
    dst_e = nov1 + datetime.timedelta(days=(6 - nov1.weekday()) % 7)
    offset = -4 if dst_s <= utc < dst_e else -5
    return utc + datetime.timedelta(hours=offset)

def _is_night() -> bool:
    h = _ny_now().hour
    return h >= NIGHT_START or h < NIGHT_END

def _ny_str() -> str:
    return _ny_now().strftime("%H:%M:%S")

# ── Bridge ──────────────────────────────────────────────────────────────────

def _fetch() -> dict | None:
    try:
        with urllib.request.urlopen(BRIDGE_URL, timeout=5) as r:
            return json.loads(r.read())
    except Exception:
        return None

# ── Alarme state ────────────────────────────────────────────────────────────

_alarm_lock   = threading.Lock()
_alarm_active = False
_acked: dict[str, float] = {}   # band → timestamp dernier ACK

def _fire_alarm(title: str, msg: str, band: str | None = None):
    global _alarm_active
    with _alarm_lock:
        if _alarm_active:
            return False
        _alarm_active = True

    def _run():
        global _alarm_active
        log.warning(f"ALARME : {title} | {msg.splitlines()[0]}")
        ensure_wav()
        _play_loop()
        _popup(title, msg)
        _stop_sound()
        if band:
            _acked[band] = time.time()
            log.info(f"ACK : {band} — cooldown {ACK_COOLDOWN}s")
        with _alarm_lock:
            _alarm_active = False

    threading.Thread(target=_run, daemon=True).start()
    return True

def _check(data: dict):
    nq = data.get("NQ", {})
    last = nq.get("last")
    if not isinstance(last, (int, float)):
        return
    for band in BANDS:
        level = nq.get(band)
        if not isinstance(level, (int, float)):
            continue
        if abs(last - level) > TOLERANCE:
            continue
        # Cooldown ACK
        if band in _acked and time.time() - _acked[band] < ACK_COOLDOWN:
            continue
        direction = "↑" if last >= level else "↓"
        _fire_alarm(
            "⚠ ALERTE NQ — SD TOUCHÉ",
            f"NQ = {last:.2f}  {direction}  {band.upper()} = {level:.2f}\n"
            f"NY {_ny_str()}\n\n"
            f"Cliquez OK pour arrêter l'alarme.",
            band=band,
        )
        break   # une seule alarme à la fois

# ── Service principal ───────────────────────────────────────────────────────

def run_service():
    _setup_logging()
    log.info("=" * 48)
    log.info("  alarm_service.py démarré")
    log.info(f"  Bridge : {BRIDGE_URL}")
    log.info(f"  Bands  : {BANDS}")
    log.info(f"  Plage  : {NIGHT_START}h–{NIGHT_END}h NY")
    log.info("=" * 48)
    ensure_wav()

    last_ok    = time.time()
    night_mode = False
    dead_alerted = False

    while True:
        try:
            night = _is_night()

            if night and not night_mode:
                _prevent_sleep()
                night_mode = True
                dead_alerted = False
            elif not night and night_mode:
                _allow_sleep()
                night_mode = False

            data = _fetch()

            if data:
                last_ok = time.time()
                dead_alerted = False
                if night:
                    _check(data)
            else:
                gap = time.time() - last_ok
                if night and gap > BRIDGE_DEAD and not dead_alerted:
                    dead_alerted = True
                    _fire_alarm(
                        "⚠ BRIDGE MORT",
                        f"Aucune réponse depuis {int(gap)}s.\n"
                        "Vérifier : nq_bridge.py est-il lancé ?\n\n"
                        "Cliquez OK pour continuer la surveillance.",
                    )

            time.sleep(POLL_SEC)

        except Exception as e:
            log.error(f"Boucle principale : {e}", exc_info=True)
            time.sleep(POLL_SEC)

# ── Modes test ──────────────────────────────────────────────────────────────

def test_sound():
    _setup_logging()
    ensure_wav()
    print(f"[TEST-SOUND] Lecture 5s — {WAV_FILE}")
    print("            Si vous n'entendez rien, vérifiez le volume Windows.")
    _play_loop()
    time.sleep(5)
    _stop_sound()
    print("[TEST-SOUND] Terminé.")

def test_popup():
    _setup_logging()
    print("[TEST-POPUP] Affichage popup — vérifiez qu'elle reste au premier plan...")
    _popup(
        "⚠ ALERTE NQ — SD TOUCHÉ [TEST]",
        "NQ = 29780.00  ↑  SD2H = 29800.00\n"
        "NY 01:23:45\n\n"
        "Ceci est un TEST. La popup doit rester au premier plan.\n"
        "Cliquez OK pour fermer.",
    )
    print("[TEST-POPUP] Terminé.")

def test_trigger():
    _setup_logging()
    ensure_wav()
    print("[TEST-TRIGGER] Son + popup simultanés — cliquez OK pour arrêter le son.")
    _play_loop()
    _popup(
        "⚠ ALERTE NQ — SD TOUCHÉ [TEST TRIGGER]",
        "NQ = 29800.00  ↑  SD2H = 29800.00\n"
        "NY 01:00:00\n\n"
        "Simulation de déclenchement réel.\n"
        "Cliquez OK pour arrêter le son.",
    )
    _stop_sound()
    print("[TEST-TRIGGER] Terminé.")

# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--test-sound" in sys.argv:
        test_sound()
    elif "--test-popup" in sys.argv:
        test_popup()
    elif "--test-trigger" in sys.argv:
        test_trigger()
    else:
        run_service()
