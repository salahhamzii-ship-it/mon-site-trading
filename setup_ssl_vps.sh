#!/bin/bash
# ============================================================
#  setup_ssl_vps.sh
#  Installe SSL + nginx + déploie le site + proxy wss://
#  Lance UNE FOIS : bash /root/sierra-bridge/setup_ssl_vps.sh
# ============================================================
set -euo pipefail

DOMAIN="2-29-3-199.nip.io"
REPO_DIR="/root/sierra-bridge"
SITE_DIR="/var/www/sierra"
EMAIL="salahhamzii@gmail.com"

echo ""
echo "══════════════════════════════════════════════"
echo "  Setup SSL + Site + Bridge proxy"
echo "  Domaine : $DOMAIN"
echo "══════════════════════════════════════════════"

# ── 1. Paquets ────────────────────────────────────────────
echo "[1/5] Paquets..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

# ── 2. Node.js + build site ───────────────────────────────
echo "[2/5] Build du site..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs
fi
cd "$REPO_DIR"
git pull --ff-only --quiet
npm ci --silent
npm run build
mkdir -p "$SITE_DIR"
cp -r dist/. "$SITE_DIR/"

# ── 3. nginx HTTP (pour certbot challenge) ────────────────
echo "[3/5] nginx config HTTP..."
cat > /etc/nginx/sites-available/sierra << EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $SITE_DIR;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/sierra /etc/nginx/sites-enabled/sierra
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx

# ── 4. Certificat Let's Encrypt ───────────────────────────
echo "[4/5] Certificat SSL..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

# ── 5. nginx HTTPS + proxy wss:// ─────────────────────────
echo "[5/5] nginx HTTPS + proxy WebSocket..."
cat > /etc/nginx/sites-available/sierra << 'EOF'
server {
    listen 80;
    server_name 2-29-3-199.nip.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 2-29-3-199.nip.io;

    ssl_certificate     /etc/letsencrypt/live/2-29-3-199.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/2-29-3-199.nip.io/privkey.pem;

    root /var/www/sierra;
    index index.html;

    # SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket bridge → wss://domain/ws
    location /ws {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
}
EOF

nginx -t && systemctl reload nginx

echo ""
echo "══════════════════════════════════════════════"
echo "  TERMINÉ"
echo "  Site   → https://2-29-3-199.nip.io"
echo "  Bridge → wss://2-29-3-199.nip.io/ws"
echo "══════════════════════════════════════════════"
