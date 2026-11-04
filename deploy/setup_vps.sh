#!/usr/bin/env bash
set -e

echo "=== Implantando e-Sigma Agape (agape.e-sigma.app) na porta 8007 ==="

APP_DIR="/var/www/agape"

# 1. Backend Python venv + dependencias
cd "$APP_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# 2. Frontend React build
cd "$APP_DIR/frontend"
npm install
npm run build

# 3. Systemd Service (agape-api na porta 8007)
cp "$APP_DIR/deploy/agape-api.service" /etc/systemd/system/agape-api.service
systemctl daemon-reload
systemctl enable agape-api
systemctl restart agape-api

# 4. Nginx VirtualHost (preserva configuracao SSL do Certbot se ja existir)
if [ ! -f "/etc/nginx/sites-available/agape.e-sigma.app" ]; then
    cp "$APP_DIR/deploy/agape.e-sigma.app.nginx.conf" /etc/nginx/sites-available/agape.e-sigma.app
    ln -sf /etc/nginx/sites-available/agape.e-sigma.app /etc/nginx/sites-enabled/agape.e-sigma.app
    nginx -t && systemctl reload nginx
fi

echo "=== Agape ativo em https://agape.e-sigma.app (Porta interna 8007) ==="
