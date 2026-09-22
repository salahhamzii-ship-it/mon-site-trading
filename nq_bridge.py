#!/usr/bin/env python3
"""
nq_bridge.py — Bridge HTTP local NQ Futures
Écoute sur localhost:8766, expose GET /data et GET /health
Compatible avec nq-live.html (poll toutes les 3s).

Lancement : python nq_bridge.py
"""

import json
import os
import time
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "localhost"
PORT = 8766

# Dossier du script — pour localiser nq-live.html
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────────────────────────────────────
# SOURCE DE DONNÉES
# Remplacer get_nq_data() par la vraie lecture (Sierra Chart, API, fichier CSV…)
# ─────────────────────────────────────────────────────────────────────────────

def get_nq_data() -> dict:
    """
    Retourne le snapshot NQ actuel.

    TODO — brancher la vraie source :
      Option A — Fichier CSV Sierra Chart (export time & sales ou Quote Manager) :
        import csv, glob
        SC_DATA = r"C:\\SierraChart\\Data"
        files = sorted(glob.glob(SC_DATA + "\\NQZ26.scid_*.csv"))
        with open(files[-1]) as f:
            last_row = list(csv.DictReader(f))[-1]
        last  = float(last_row['Last'])

      Option B — Fichier texte Sierra Chart (Custom Quote) :
        SC_QUOTE = r"C:\\SierraChart\\Data\\quotes.txt"
        with open(SC_QUOTE) as f:
            data = json.load(f)

      Option C — API broker / datafeed (IB, Rithmic, Tradovate...) :
        import requests
        resp = requests.get("http://localhost:PORT/snapshot")
        data = resp.json()

      Option D — Lecture fichier sc_bridge_log.txt si sc_bridge.js tourne en parallele
    """

    # ── VALEURS DE TEST — remplacer par la vraie source ──────────────────────
    t = time.time()
    last   = 20_450.25 + 10 * (t % 60 - 30) / 30   # oscillation lente ±10 pts
    vwap   = 20_420.00
    sd1h   = 20_580.00
    sd1l   = 20_260.00
    sd2h   = 20_740.00
    sd2l   = 20_100.00

    # Champs optionnels (J-1, OVN, ALN, patterns)
    return {
        "last":      round(last, 2),
        "vwap":      vwap,
        "sd1h":      sd1h,
        "sd1l":      sd1l,
        "sd2h":      sd2h,
        "sd2l":      sd2l,
        # J-1 RTH
        "j1_high":   20_620.50,
        "j1_settle": 20_390.25,
        "j1_low":    20_180.75,
        # Value Area J-1
        "vah":       20_550.00,
        "poc":       20_410.00,
        "val":       20_270.00,
        # OVN
        "ovn_high":  20_480.00,
        "ovn_low":   20_310.00,
        # ALN (Asia / London)
        "asia_high": 20_470.00,
        "asia_low":  20_320.00,
        "lon_high":  20_510.00,
        "lon_low":   20_290.00,
        # Signaux AVWAP / LAF / LBF
        "avwap_side": "above",   # 'above' | 'below'
        "laf_sd2":    False,
        "lbf_sd2":    False,
    }
    # ── FIN VALEURS DE TEST ───────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
# HANDLER HTTP
# ─────────────────────────────────────────────────────────────────────────────

class BridgeHandler(BaseHTTPRequestHandler):

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def _serve_html(self):
        # Cherche nq-live.html dans le même dossier que le script, puis dans ./public/
        candidates = [
            os.path.join(SCRIPT_DIR, "nq-live.html"),
            os.path.join(SCRIPT_DIR, "public", "nq-live.html"),
        ]
        html_path = next((p for p in candidates if os.path.isfile(p)), None)
        if html_path is None:
            msg = "404 - nq-live.html introuvable. Placez-le dans le meme dossier que nq_bridge.py".encode("utf-8")
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(msg)
            return
        with open(html_path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/")

        if path in ("", "/nq-live.html", "/index.html"):
            self._serve_html()

        elif path == "/health":
            body = json.dumps({"status": "ok", "ts": time.time()}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(body)

        elif path == "/data":
            try:
                data = get_nq_data()
                # Format encapsulé compatible nq-live.html (accepte aussi la racine plate)
                body = json.dumps({"NQ": data}, separators=(",", ":")).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._cors_headers()
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                err = json.dumps({"error": str(e)}).encode()
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self._cors_headers()
                self.end_headers()
                self.wfile.write(err)

        else:
            self.send_response(404)
            self._cors_headers()
            self.end_headers()

    def log_message(self, fmt, *args):
        # Filtre les polls /data pour ne pas spammer le terminal
        if "/data" in (args[0] if args else ""):
            return
        print(f"[{self.log_date_time_string()}] {fmt % args}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    server = ThreadingHTTPServer((HOST, PORT), BridgeHandler)
    print(f"NQ Bridge démarré")
    print(f"  → HTML    : http://{HOST}:{PORT}/")
    print(f"  → Data    : http://{HOST}:{PORT}/data")
    print(f"  → Health  : http://{HOST}:{PORT}/health")
    print("Ctrl+C pour arrêter\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du bridge.")
        server.shutdown()


if __name__ == "__main__":
    main()
