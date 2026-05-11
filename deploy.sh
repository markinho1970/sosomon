#!/bin/bash
# ============================================================
# AlphaGrid — Deploy / Update (roda após o install.sh)
# Uso: ./deploy.sh
# ============================================================

set -e

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[✓]${NC} $1"; }

INSTALL_DIR="/opt/alphagrid"

log "Rebuild frontend..."
cd "$INSTALL_DIR/frontend"
npm install --silent
npm run build

log "Reiniciando serviços..."
pm2 restart alphagrid-backend
pm2 restart alphagrid-frontend

log "Status:"
pm2 status

echo ""
echo "Deploy concluído!"
