#!/bin/bash
# ============================================================
#  deploy_vps.sh — Déploie le site + configure nginx
#  Lance : bash /root/sierra-bridge/deploy_vps.sh
# ============================================================
set -euo pipefail

REPO_DIR="/root/sierra-bridge"
SITE_DIR="/var/www/sierra"
VPS_IP=$(curl -s --max-time 3 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "══════════════════════════════════════════"
echo "  Déploiement site + nginx"
echo "══════════════════════════════════════════"

# ── 1. Node.js ────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "[1/4] Installation Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
else
  echo "[1/4] Node.js $(node -v) déjà installé"
fi

# ── 2. Build du site ──────────────────────────────────────
echo "[2/4] Build du site..."
cd "$REPO_DIR"
npm ci --silent
npm run build
echo "       OK — dist/ prêt"

# ── 3. Copier dist → nginx root ───────────────────────────
echo "[3/4] Déploiement fichiers..."
apt-get install -y -qq nginx >/dev/null 2>&1
mkdir -p "$SITE_DIR"
cp -r dist/. "$SITE_DIR/"
echo "       OK — $SITE_DIR"

# ── 4. Config nginx ───────────────────────────────────────
echo "[4/4] Configuration nginx..."
cat > /etc/nginx/sites-available/sierra << EOF
server {
    listen 80 default_server;
    server_name _;
    root $SITE_DIR;
    index index.html;

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
EOF

ln -sf /etc/nginx/sites-available/sierra /etc/nginx/sites-enabled/sierra
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx

echo ""
echo "══════════════════════════════════════════"
echo "  DÉPLOIEMENT TERMINÉ"
echo "  Site   → http://$VPS_IP"
echo "  Bridge → ws://$VPS_IP:8765"
echo "══════════════════════════════════════════"
