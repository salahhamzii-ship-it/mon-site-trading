#!/usr/bin/env python3
"""
Bridge Receiver — tourne sur le VPS (port 8767)
Reçoit les données de sc_bridge.py (Windows) via HTTP POST /update
Les sert à Vercel via HTTP GET /data
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading

_data: bytes = b'{}'
_lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[{self.address_string()}] {fmt % args}")

    def do_POST(self):
        if self.path == '/update':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            # Valide que c'est du JSON
            try:
                json.loads(body)
            except Exception:
                self.send_response(400)
                self.end_headers()
                return
            with _lock:
                global _data
                _data = body
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == '/data':
            with _lock:
                payload = _data
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(payload)
        elif self.path == '/health':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    port = 8767
    server = HTTPServer(('0.0.0.0', port), Handler)
    print(f'Bridge receiver démarré sur port {port}')
    print(f'  POST /update  — reçoit données de sc_bridge.py')
    print(f'  GET  /data    — sert données à Vercel')
    server.serve_forever()
