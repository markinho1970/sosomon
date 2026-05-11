#!/bin/bash
# ============================================================
# AlphaGrid — Instalador para Ubuntu 20.04 / 22.04
# Uso: chmod +x install.sh && sudo ./install.sh
# ============================================================

set -e  # Para na primeira falha

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

INSTALL_DIR="/opt/alphagrid"
APP_USER="admin"   # usuário dono dos arquivos

echo ""
echo "=================================================="
echo "  AlphaGrid — Instalação no Ubuntu"
echo "=================================================="
echo ""

# ── 1. Sistema base ───────────────────────────────────────
log "Atualizando lista de pacotes..."
apt update -qq
# apt upgrade removido — evita atualização de kernel que quebra drivers Hyper-V

log "Instalando dependências do sistema..."
apt install -y -qq \
    curl wget git unzip \
    build-essential \
    software-properties-common \
    ca-certificates \
    gnupg \
    lsb-release \
    nginx \
    certbot python3-certbot-nginx

# ── 2. Python 3.12 (padrão Ubuntu 24.04 — sem PPA) ──────
log "Instalando Python 3.12..."
apt install -y -qq python3.12 python3.12-venv python3.12-dev python3-pip

# ── 3. Node.js 20 ────────────────────────────────────────
log "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt install -y -qq nodejs
npm install -g pm2 > /dev/null 2>&1

log "Versões instaladas:"
echo "  Node: $(node --version)"
echo "  NPM:  $(npm --version)"
echo "  Python: $(python3.12 --version)"

# ── 4. Backend ────────────────────────────────────────────
log "Configurando backend Python..."
cd "$INSTALL_DIR/backend"

python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

if [ ! -f ".env" ]; then
    cp .env.example .env
    warn "Arquivo .env criado. EDITE com suas API keys: nano $INSTALL_DIR/backend/.env"
fi

mkdir -p generated_content
mkdir -p data

deactivate

# ── 5. Frontend ───────────────────────────────────────────
log "Instalando dependências do frontend..."
cd "$INSTALL_DIR/frontend"

npm install --silent

if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    warn "Arquivo .env.local criado. Edite se necessário: nano $INSTALL_DIR/frontend/.env.local"
fi

log "Buildando frontend..."
npm run build

# ── 6. PM2 — Gerenciador de processos ─────────────────────
log "Configurando PM2..."
cd "$INSTALL_DIR"

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "alphagrid-backend",
      cwd: "/opt/alphagrid/backend",
      interpreter: "/opt/alphagrid/backend/venv/bin/python",
      script: "/opt/alphagrid/backend/venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 8000",
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "alphagrid-frontend",
      cwd: "/opt/alphagrid/frontend",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER | tail -1 | bash

# ── 7. Nginx reverse proxy ────────────────────────────────
log "Configurando Nginx..."

cat > /etc/nginx/sites-available/alphagrid << 'EOF'
server {
    listen 80;
    server_name _;  # Aceita qualquer host (teste). Troque por seu domínio em prod.

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend docs (Swagger)
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
EOF

ln -sf /etc/nginx/sites-available/alphagrid /etc/nginx/sites-enabled/alphagrid
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# ── 8. Firewall ───────────────────────────────────────────
log "Firewall: mantendo configuração existente (UFW não alterado)"
# ufw desabilitado no install para evitar perda de conectividade em servidor de teste
# Para habilitar manualmente após confirmar acesso SSH:
#   ufw allow OpenSSH
#   ufw allow 'Nginx Full'
#   ufw --force enable

# ── 9. Permissões ─────────────────────────────────────────
log "Ajustando permissões..."
chown -R $APP_USER:$APP_USER "$INSTALL_DIR"

# ── Done ──────────────────────────────────────────────────
echo ""
echo "=================================================="
echo -e "${GREEN}  Instalação concluída!${NC}"
echo "=================================================="
echo ""
echo "  Frontend:  http://$(curl -s ifconfig.me)"
echo "  API docs:  http://$(curl -s ifconfig.me)/docs"
echo "  API health:http://$(curl -s ifconfig.me)/health"
echo ""
echo -e "${YELLOW}  PRÓXIMO PASSO OBRIGATÓRIO:${NC}"
echo "  Edite o .env com suas API keys:"
echo "  nano $INSTALL_DIR/backend/.env"
echo ""
echo "  Depois reinicie o backend:"
echo "  pm2 restart alphagrid-backend"
echo ""
echo "  Ver logs em tempo real:"
echo "  pm2 logs"
echo ""
