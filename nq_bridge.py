#!/usr/bin/env python3
"""
nq_bridge.py v2.0.0 — Bridge HTTP local NQ Futures
Seul bridge actif sur port 8766 (remplace sc_bridge.py et sc_bridge.js).

Routes :
  GET /               → 302 vers /cockpit
  GET /cockpit        → cockpit-camel.html   (étude Salah, page principale)
  GET /cockpit-v3     → cockpit-v3.html      (cockpit complet SD/AVWAP)
  GET /nq-live        → nq-live.html         (dashboard NQ live)
  GET /tracker        → tracker.html         (tracker sessions)
  GET /suivi-sd       → 302 vers /tracker    (alias archivé)
  GET /data           → JSON snapshot NQ
  GET /api/bridge-data → alias de /data
  GET /health         → {"status":"ok"}
  GET /status         → JSON diagnostic complet
  GET /static/<file>  → fichier statique (public/ ou racine)
  GET /<file.ext>     → fallback statique générique

Lancement : python nq_bridge.py
"""

import json
import os
import time
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

HOST    = "localhost"
PORT    = 8766

# Dossier du script — base pour la résolution des fichiers
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

_VERSION      = "2.0.0"
_SERVER_START = time.time()

# État partagé (thread-safe via GIL sur lectures/écritures simples)
_last_data_ts : float | None = None
_last_error   : str | None   = None


def _find_asset(name: str) -> str | None:
    """Cherche <name> dans : racine → public/ → static/ (premier trouvé)."""
    for base in (SCRIPT_DIR,
                 os.path.join(SCRIPT_DIR, "public"),
                 os.path.join(SCRIPT_DIR, "static")):
        p = os.path.join(base, name)
        if os.path.isfile(p):
            return p
    return None


# ─────────────────────────────────────────────────────────────────────────────
# SOURCE DE DONNÉES
# Remplacer get_nq_data() par la vraie lecture (Sierra Chart, API, fichier CSV…)
# ─────────────────────────────────────────────────────────────────────────────

def get_nq_data() -> dict:
    """
    Retourne le snapshot NQ actuel.

    TODO — brancher la vraie source (lire config.json → source.type) :
      "csv"  : lire le dernier fichier CSV Sierra Chart (Option A)
      "file" : lire un fichier JSON exporté par Sierra Chart (Option B)
      "api"  : appeler l'API broker (IB, Rithmic, Tradovate…) (Option C)
    """

    # ── VALEURS DE TEST — remplacer par la vraie source ──────────────────────
    t    = time.time()
    last = 20_450.25 + 10 * (t % 60 - 30) / 30   # oscillation lente ±10 pts
    vwap = 20_420.00
    return {
        "last":       round(last, 2),
        "vwap":       vwap,
        "sd1h":       20_580.00,
        "sd1l":       20_260.00,
        "sd2h":       20_740.00,
        "sd2l":       20_100.00,
        # J-1 RTH
        "j1_high":    20_620.50,
        "j1_settle":  20_390.25,
        "j1_low":     20_180.75,
        # Value Area J-1
        "vah":        20_550.00,
        "poc":        20_410.00,
        "val":        20_270.00,
        # OVN
        "ovn_high":   20_480.00,
        "ovn_low":    20_310.00,
        # ALN
        "asia_high":  20_470.00,
        "asia_low":   20_320.00,
        "lon_high":   20_510.00,
        "lon_low":    20_290.00,
        # Signaux
        "avwap_side": "above",
        "laf_sd2":    False,
        "lbf_sd2":    False,
    }
    # ── FIN VALEURS DE TEST ───────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
# HANDLER HTTP
# ─────────────────────────────────────────────────────────────────────────────

class BridgeHandler(BaseHTTPRequestHandler):

    # ── En-têtes communs ────────────────────────────────────────────────────

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Bridge-Version", _VERSION)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _redirect(self, location: str):
        self.send_response(302)
        self.send_header("Location", location)
        self._cors_headers()
        self.end_headers()

    def _send_404(self, detail: str = ""):
        msg = f"404 — {detail or 'ressource introuvable'}".encode("utf-8")
        self.send_response(404)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(msg)

    def _serve_file(self, filename: str):
        """Cherche <filename> via _find_asset et l'envoie."""
        file_path = _find_asset(filename)
        if file_path is None:
            self._send_404(filename)
            return
        ext = os.path.splitext(filename)[1].lower()
        ctype = {
            ".html": "text/html; charset=utf-8",
            ".js":   "application/javascript; charset=utf-8",
            ".css":  "text/css; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg":  "image/svg+xml",
            ".ico":  "image/x-icon",
            ".png":  "image/png",
            ".jpg":  "image/jpeg",
            ".woff2":"font/woff2",
        }.get(ext, "application/octet-stream")
        with open(file_path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _serve_data(self):
        """GET /data et /api/bridge-data — snapshot NQ au format {NQ:{...}}."""
        global _last_data_ts, _last_error
        try:
            data = get_nq_data()
            body = json.dumps({"NQ": data}, separators=(",", ":")).encode()
            _last_data_ts = time.time()
            _last_error   = None
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            _last_error = str(exc)
            err = json.dumps({"error": str(exc)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(err)

    def _serve_health(self):
        """GET /health — ping simple."""
        body = json.dumps({"status": "ok", "ts": time.time()}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _serve_status(self):
        """GET /status — diagnostic JSON complet."""
        now     = time.time()
        uptime  = int(now - _SERVER_START)
        h, rem  = divmod(uptime, 3600)
        m, s    = divmod(rem, 60)
        age     = int(now - _last_data_ts) if _last_data_ts else None
        payload = {
            "version":        _VERSION,
            "uptime":         f"{h}h {m:02d}m {s:02d}s",
            "uptime_seconds": uptime,
            "port":           PORT,
            "host":           HOST,
            "source":         "test",
            "last_data_ts":   _last_data_ts,
            "last_data_age_s": age,
            "last_error":     _last_error,
            "pages": {
                "cockpit":   f"http://{HOST}:{PORT}/cockpit",
                "cockpit_v3": f"http://{HOST}:{PORT}/cockpit-v3",
                "nq_live":   f"http://{HOST}:{PORT}/nq-live",
                "tracker":   f"http://{HOST}:{PORT}/tracker",
            },
        }
        body = json.dumps(payload, indent=2).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    # ── Routeur principal ────────────────────────────────────────────────────

    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/")

        # ── Redirections ──────────────────────────────────────────────
        if path in ("", "/index.html"):
            self._redirect("/cockpit")

        elif path == "/suivi-sd":
            self._redirect("/tracker")

        # ── URLs propres (sans extension) ─────────────────────────────
        elif path == "/cockpit":
            self._serve_file("cockpit-camel.html")

        elif path == "/cockpit-v3":
            self._serve_file("cockpit-v3.html")

        elif path == "/nq-live":
            self._serve_file("nq-live.html")

        elif path == "/tracker":
            self._serve_file("tracker.html")

        # ── Legacy : URLs avec .html (compat) ─────────────────────────
        elif path == "/cockpit-camel.html":
            self._serve_file("cockpit-camel.html")

        elif path == "/cockpit-v3.html":
            self._serve_file("cockpit-v3.html")

        elif path == "/nq-live.html":
            self._serve_file("nq-live.html")

        elif path == "/tracker.html":
            self._serve_file("tracker.html")

        elif path == "/suivi_sd_nq.html":
            # Doublon archivé — rediriger vers tracker
            self._redirect("/tracker")

        # ── Données & diagnostics ─────────────────────────────────────
        elif path in ("/data", "/api/bridge-data"):
            self._serve_data()

        elif path == "/health":
            self._serve_health()

        elif path == "/status":
            self._serve_status()

        # ── Fichiers statiques : /static/<fichier> ─────────────────────
        elif path.startswith("/static/"):
            fname = os.path.basename(path)
            if fname and "." in fname:
                self._serve_file(fname)
            else:
                self._send_404(path)

        # ── Fallback générique pour tout fichier avec une extension ────
        elif "." in os.path.basename(path):
            self._serve_file(os.path.basename(path))

        else:
            self._send_404(path)

    def log_message(self, fmt, *args):
        # Silencer les polls /data (toutes les 3s) pour ne pas spammer le terminal
        if args and "/data" in str(args[0]):
            return
        print(f"[{self.log_date_time_string()}] {fmt % args}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    server = ThreadingHTTPServer((HOST, PORT), BridgeHandler)
    print(f"NQ Bridge v{_VERSION} — port {PORT}")
    print(f"  → Cockpit      : http://{HOST}:{PORT}/cockpit")
    print(f"  → Cockpit v3   : http://{HOST}:{PORT}/cockpit-v3")
    print(f"  → NQ Live      : http://{HOST}:{PORT}/nq-live")
    print(f"  → Tracker      : http://{HOST}:{PORT}/tracker")
    print(f"  → Data JSON    : http://{HOST}:{PORT}/data")
    print(f"  → API Bridge   : http://{HOST}:{PORT}/api/bridge-data")
    print(f"  → Health       : http://{HOST}:{PORT}/health")
    print(f"  → Status       : http://{HOST}:{PORT}/status")
    print("Ctrl+C pour arrêter\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du bridge.")
        server.shutdown()


if __name__ == "__main__":
    main()
