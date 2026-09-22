#!/usr/bin/env python3
"""
tests/test_bridge.py — Smoke tests NQ Bridge
Démarre le bridge en sous-processus, teste les endpoints, arrête.

Usage :
  python tests/test_bridge.py          # silencieux si tout OK
  python tests/test_bridge.py -v       # verbeux

Dépendances : stdlib uniquement (subprocess, urllib, threading, json, time)
"""

import json
import os
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────

BRIDGE_PORT    = 8766
BRIDGE_HOST    = "localhost"
BASE_URL       = f"http://{BRIDGE_HOST}:{BRIDGE_PORT}"
SCRIPT_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIDGE_SCRIPT  = os.path.join(SCRIPT_DIR, "nq_bridge.py")
PYTHON         = sys.executable
STARTUP_WAIT   = 2.5   # secondes pour que le bridge démarre
VERBOSE        = "-v" in sys.argv or "--verbose" in sys.argv

# ── Helpers ───────────────────────────────────────────────────────────────────

_pass = 0
_fail = 0
_errors = []

def log(msg):
    if VERBOSE:
        print(msg)

def ok(name):
    global _pass
    _pass += 1
    log(f"  ✓ {name}")

def fail(name, reason):
    global _fail
    _fail += 1
    msg = f"  ✗ {name}: {reason}"
    _errors.append(msg)
    print(msg)

def get(path, timeout=5):
    url = BASE_URL + path
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:
        raise ConnectionError(f"GET {path} failed: {e}") from e

def assert_status(name, path, expected_code):
    try:
        code, body, _ = get(path)
        if code == expected_code:
            ok(name)
        else:
            fail(name, f"HTTP {code} (attendu {expected_code})")
    except Exception as e:
        fail(name, str(e))

def assert_json(name, path, check_fn=None):
    try:
        code, body, headers = get(path)
        if code not in (200, 503):
            fail(name, f"HTTP {code}"); return
        ct = headers.get("Content-Type", "")
        if "application/json" not in ct:
            fail(name, f"Content-Type inattendu: {ct}"); return
        data = json.loads(body)
        if check_fn:
            err = check_fn(data)
            if err:
                fail(name, err); return
        ok(name)
    except Exception as e:
        fail(name, str(e))

def assert_header(name, path, header, expected_value=None):
    try:
        _, _, headers = get(path)
        val = headers.get(header) or headers.get(header.lower())
        if val is None:
            fail(name, f"Header '{header}' absent"); return
        if expected_value and val != expected_value:
            fail(name, f"Header '{header}'={val!r} (attendu {expected_value!r})"); return
        ok(name)
    except Exception as e:
        fail(name, str(e))

def assert_redirect(name, path, expected_location):
    try:
        req = urllib.request.Request(BASE_URL + path)
        # Ne pas suivre les redirections
        opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler())
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **kw): return None
        opener = urllib.request.build_opener(NoRedirect())
        try:
            opener.open(req, timeout=5)
            fail(name, "Pas de redirect reçu"); return
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 303, 307, 308):
                loc = e.headers.get("Location", "")
                if expected_location in loc:
                    ok(name)
                else:
                    fail(name, f"Location={loc!r} (attendu contient '{expected_location}')")
            else:
                fail(name, f"HTTP {e.code}")
        except Exception as e2:
            fail(name, str(e2))
    except Exception as e:
        fail(name, str(e))

# ── Tests ─────────────────────────────────────────────────────────────────────

def run_tests():
    print("=" * 50)
    print("  NQ Bridge — Smoke Tests")
    print(f"  Base URL : {BASE_URL}")
    print("=" * 50)

    # ── Redirections ──────────────────────────────────────────────────────────
    print("\n[Redirections]")
    assert_redirect("GET / → /cockpit",           "/",          "/cockpit")
    assert_redirect("GET /suivi-sd → /tracker",   "/suivi-sd",  "/tracker")
    assert_redirect("GET /suivi_sd_nq.html → /tracker", "/suivi_sd_nq.html", "/tracker")

    # ── Pages HTML ────────────────────────────────────────────────────────────
    print("\n[Pages HTML]")
    for path, name in [
        ("/cockpit",    "GET /cockpit"),
        ("/cockpit-v3", "GET /cockpit-v3"),
        ("/nq-live",    "GET /nq-live"),
        ("/tracker",    "GET /tracker"),
        ("/status-page","GET /status-page"),
    ]:
        try:
            code, body, headers = get(path)
            if code == 200 and b"<html" in body.lower():
                ok(name)
            elif code == 200:
                ok(f"{name} (200, non-HTML)")
            else:
                fail(name, f"HTTP {code}")
        except Exception as e:
            fail(name, str(e))

    # ── 404 ───────────────────────────────────────────────────────────────────
    print("\n[404]")
    assert_status("GET /inexistant → 404",        "/inexistant",       404)
    assert_status("GET /static/nope → 404",       "/static/nope.html", 404)

    # ── /health ───────────────────────────────────────────────────────────────
    print("\n[/health]")
    assert_json("/health JSON", "/health", lambda d: None if d.get("status") == "ok" else f"status={d.get('status')!r}")

    # ── /data ─────────────────────────────────────────────────────────────────
    print("\n[/data]")
    def check_data(d):
        if "NQ" not in d:
            return "champ 'NQ' absent"
        nq = d["NQ"]
        for k in ("last", "vwap"):
            if k not in nq:
                return f"champ '{k}' absent dans NQ"
        return None

    assert_json("/data JSON structure",      "/data",             check_data)
    assert_json("/api/bridge-data (alias)",  "/api/bridge-data",  check_data)

    # ── /status JSON ──────────────────────────────────────────────────────────
    print("\n[/status JSON]")
    def check_status(d):
        for k in ("version", "uptime", "port", "source"):
            if k not in d:
                return f"champ '{k}' absent"
        return None

    assert_json("/status JSON structure", "/status", check_status)

    # ── Headers ───────────────────────────────────────────────────────────────
    print("\n[Headers]")
    assert_header("X-Bridge-Version présent sur /data",   "/data",   "X-Bridge-Version")
    assert_header("X-Bridge-Version présent sur /health", "/health", "X-Bridge-Version")
    assert_header("CORS header sur /data",                "/data",   "Access-Control-Allow-Origin")

    # ── CORS OPTIONS ──────────────────────────────────────────────────────────
    print("\n[CORS OPTIONS]")
    try:
        req = urllib.request.Request(BASE_URL + "/data", method="OPTIONS")
        with urllib.request.urlopen(req, timeout=5) as r:
            if r.status == 204:
                ok("OPTIONS /data → 204")
            else:
                fail("OPTIONS /data → 204", f"HTTP {r.status}")
    except urllib.error.HTTPError as e:
        if e.code == 204:
            ok("OPTIONS /data → 204")
        else:
            fail("OPTIONS /data → 204", f"HTTP {e.code}")
    except Exception as e:
        fail("OPTIONS /data", str(e))

# ── Main ──────────────────────────────────────────────────────────────────────

def wait_for_bridge(timeout=10):
    """Attend que le bridge réponde sur /health."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            code, _, _ = get("/health", timeout=1)
            if code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.3)
    return False


def main():
    print(f"Démarrage bridge : {BRIDGE_SCRIPT}")
    proc = subprocess.Popen(
        [PYTHON, BRIDGE_SCRIPT],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=SCRIPT_DIR,
    )
    try:
        print(f"Attente démarrage bridge (max {STARTUP_WAIT:.0f}s)…")
        if not wait_for_bridge(timeout=int(STARTUP_WAIT) + 3):
            print("[ERREUR] Bridge n'a pas démarré dans les temps.")
            proc.terminate()
            sys.exit(2)

        run_tests()

    finally:
        proc.terminate()
        proc.wait(timeout=5)

    print()
    print("=" * 50)
    total = _pass + _fail
    if _fail == 0:
        print(f"  RÉSULTAT : {_pass}/{total} tests OK  ✓")
    else:
        print(f"  RÉSULTAT : {_pass}/{total} OK — {_fail} ÉCHEC(S)")
        for e in _errors:
            print(e)
    print("=" * 50)
    sys.exit(0 if _fail == 0 else 1)


if __name__ == "__main__":
    main()
