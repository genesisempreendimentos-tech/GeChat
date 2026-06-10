#!/usr/bin/env bash
# Instalação inicial do GêLeads na VPS (Ubuntu/Debian).
# Uso (como root ou com sudo):
#   sudo bash deploy/install.sh
#
# Variáveis opcionais:
#   GELEADS_REPO=https://github.com/genesisempreendimentos-tech/GeLeads.git
#   GELEADS_DIR=/var/www/geleads
#   GELEADS_BRANCH=main

set -euo pipefail

GELEADS_REPO="${GELEADS_REPO:-https://github.com/genesisempreendimentos-tech/GeLeads.git}"
GELEADS_DIR="${GELEADS_DIR:-/var/www/geleads}"
GELEADS_BRANCH="${GELEADS_BRANCH:-main}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute com sudo: sudo bash deploy/install.sh"
  exit 1
fi

echo "==> Dependências do sistema"
apt-get update -qq
apt-get install -y -qq git curl ca-certificates nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
  echo "==> Instalando Node.js 20 LTS"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Instalando PM2"
  npm install -g pm2
fi

echo "==> Pasta ${GELEADS_DIR}"
mkdir -p "$(dirname "${GELEADS_DIR}")"
mkdir -p "${GELEADS_DIR}/logs"

if [[ ! -d "${GELEADS_DIR}/.git" ]]; then
  echo "==> Clonando repositório"
  git clone --branch "${GELEADS_BRANCH}" "${GELEADS_REPO}" "${GELEADS_DIR}"
else
  echo "==> Repositório já existe em ${GELEADS_DIR} — pulando clone"
fi

cd "${GELEADS_DIR}"

DEPLOY_USER="${SUDO_USER:-root}"
if [[ "${DEPLOY_USER}" != "root" ]]; then
  echo "==> Permissões para ${DEPLOY_USER}"
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${GELEADS_DIR}"
fi

if [[ ! -f backend/.env ]]; then
  echo "==> Criando backend/.env a partir do exemplo"
  cp .env.example backend/.env
  sed -i 's/NODE_ENV=development/NODE_ENV=production/' backend/.env
  echo ""
  echo "IMPORTANTE: edite ${GELEADS_DIR}/backend/.env com suas chaves Supabase e Neon."
fi

if [[ ! -f frontend/.env ]]; then
  echo "==> Criando frontend/.env a partir do exemplo"
  grep '^VITE_' .env.example > frontend/.env || true
  echo ""
  echo "IMPORTANTE: edite ${GELEADS_DIR}/frontend/.env (VITE_SUPABASE_* e VITE_GELEADS_AUDIT_SLUG)."
fi

echo "==> npm install"
npm install

echo "==> Build de produção"
bash deploy/build-prod.sh

echo "==> PM2 (utilizador ${DEPLOY_USER})"
if [[ "${DEPLOY_USER}" != "root" ]]; then
  sudo -u "${DEPLOY_USER}" pm2 start deploy/ecosystem.config.cjs
  sudo -u "${DEPLOY_USER}" pm2 save
  sudo -u "${DEPLOY_USER}" pm2 startup systemd -u "${DEPLOY_USER}" --hp "/home/${DEPLOY_USER}" 2>/dev/null || true
else
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup
fi

echo ""
echo "==> Nginx"
echo "Copie e ative o site:"
echo "  sudo cp ${GELEADS_DIR}/deploy/nginx-geleads.conf /etc/nginx/sites-available/geleads"
echo "  sudo ln -sf /etc/nginx/sites-available/geleads /etc/nginx/sites-enabled/geleads"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "SSL (após DNS apontar para o VPS):"
echo "  sudo certbot --nginx -d seu-dominio.com.br"
echo ""
SERVER_PORT="$(grep -E '^SERVER_PORT=' backend/.env 2>/dev/null | cut -d= -f2- | tr -d '\r' || echo 3001)"
echo "Instalação base concluída. API em http://127.0.0.1:${SERVER_PORT} (via PM2)."
echo "Teste: curl -s http://127.0.0.1:${SERVER_PORT}/api/health"
echo ""
echo "Auditoria: execute frontend/src/services/migration-geleads-app.sql no Supabase (slug geleads)."
