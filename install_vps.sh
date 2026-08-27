#!/bin/bash
# Sierra Bridge — VPS Install (Debian/Ubuntu)
# Usage : curl -fsSL https://raw.githubusercontent.com/salahhamzii-ship-it/mon-site-trading/main/install_vps.sh | bash
set -euo pipefail

REPO_URL="https://github.com/salahhamzii-ship-it/mon-site-trading"
BRIDGE_DIR="/root/mon-site-trading"
SERVICE="sc-bridge"

echo "══════════════════════════════════"
echo "  Sierra Bridge — Install VPS"
echo "══════════════════════════════════"

# Paquets
echo "[1/4] Paquets..."
apt-get update -qq
apt-get install -y -qq git python3 python3-pip curl

# Dépendances Python
echo "[2/4] websockets..."
pip3 install -q websockets

# Repo
echo "[3/4] Dépôt..."
if [ -d "$BRIDGE_DIR/.git" ]; then
  git -C "$BRIDGE_DIR" fetch --quiet origin
  git -C "$BRIDGE_DIR" reset --hard origin/main --quiet
  echo "       → mis à jour"
else
  rm -rf "$BRIDGE_DIR"
  git clone --quiet "$REPO_URL" "$BRIDGE_DIR"
  echo "       → cloné"
fi

mkdir -p /tmp/sc-bridge

# Service systemd
echo "[4/4] Service systemd..."
cat > /etc/systemd/system/${SERVICE}.service << EOF
[Unit]
Description=Sierra Chart Bridge HTTP :8766
After=network.target

[Service]
Type=simple
WorkingDirectory=${BRIDGE_DIR}
ExecStart=/usr/bin/python3 ${BRIDGE_DIR}/sc_bridge.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICE"
sleep 3

STATUS=$(systemctl is-active "$SERVICE" 2>/dev/null || echo "unknown")
HEALTH=$(curl -s --max-time 3 http://localhost:8766/health 2>/dev/null || echo "no response")
echo ""
echo "══════════════════════════════════"
echo "  Service : $STATUS"
echo "  Health  : $HEALTH"
echo "  Logs    : journalctl -fu $SERVICE"
echo "══════════════════════════════════"
