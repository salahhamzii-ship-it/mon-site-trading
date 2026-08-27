#!/bin/bash
# ============================================================
#  Sierra Bridge — VPS Install  (Debian/Ubuntu)
#  curl -fsSL https://raw.githubusercontent.com/salahhamzii-ship-it/mon-site-trading/main/install_vps.sh | bash
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/salahhamzii-ship-it/mon-site-trading"
BRIDGE_DIR="/root/sierra-bridge"
SERVICE="sierra-bridge"
PY_BIN="$BRIDGE_DIR/.venv/bin/python"

echo ""
echo "══════════════════════════════════════════════════"
echo "  Sierra Bridge — Installation VPS"
echo "══════════════════════════════════════════════════"

# ── 1. Paquets système ─────────────────────────────────────
echo "[1/5] Paquets système..."
apt-get update -qq
apt-get install -y -qq git python3 python3-pip python3-venv curl

# ── 2. Cloner / mettre à jour le dépôt ────────────────────
echo "[2/5] Dépôt GitHub..."
if [ -d "$BRIDGE_DIR/.git" ]; then
  git -C "$BRIDGE_DIR" fetch --quiet origin
  git -C "$BRIDGE_DIR" reset --hard origin/main --quiet
  echo "       → mis à jour"
else
  git clone --quiet "$REPO_URL" "$BRIDGE_DIR"
  echo "       → cloné dans $BRIDGE_DIR"
fi

# ── 3. Environnement Python + dépendances ─────────────────
echo "[3/5] Environnement Python..."
cd "$BRIDGE_DIR"
python3 -m venv .venv --quiet
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q websockets

# ── 4. Service systemd ────────────────────────────────────
echo "[4/5] Service systemd ($SERVICE)..."

cat > /etc/systemd/system/${SERVICE}.service << EOF
[Unit]
Description=Sierra Chart Bridge — WebSocket NQ/ES/GC/CL
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=root
WorkingDirectory=${BRIDGE_DIR}
ExecStart=${PY_BIN} ${BRIDGE_DIR}/sc_bridge.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICE"
sleep 2
STATUS=$(systemctl is-active "$SERVICE" 2>/dev/null || echo "unknown")
echo "       → service : $STATUS"

# ── 5. Script update ──────────────────────────────────────
echo "[5/5] Script de mise à jour..."
cat > /usr/local/bin/update-bridge << 'EOF2'
#!/bin/bash
set -e
cd /root/sierra-bridge
git fetch --quiet origin
git reset --hard origin/main --quiet
.venv/bin/pip install -q websockets
systemctl restart sierra-bridge
sleep 1
echo "✓ Bridge mis à jour — $(systemctl is-active sierra-bridge)"
EOF2
chmod +x /usr/local/bin/update-bridge

# ── Résumé ────────────────────────────────────────────────
PUBLIC_IP=$(curl -s --max-time 3 ifconfig.me 2>/dev/null || echo "?")
echo ""
echo "══════════════════════════════════════════════════"
echo "  INSTALLATION TERMINÉE"
echo "══════════════════════════════════════════════════"
echo ""
echo "  Bridge WebSocket  →  ws://$PUBLIC_IP:8765"
echo "  Logs              →  journalctl -fu $SERVICE"
echo "  Mise à jour       →  update-bridge"
echo "  Statut            →  systemctl status $SERVICE"
echo ""
echo "  IMPORTANT : sc_bridge.py lit les CSV de Sierra Chart."
echo "  Il doit AUSSI tourner sur ton PC Windows (bridge local)."
echo "  Ce service VPS sert de relay/backup WebSocket."
echo "══════════════════════════════════════════════════"
