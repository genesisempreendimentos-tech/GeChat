#!/usr/bin/env bash
# Instalação inicial do GêNovo na VPS (Ubuntu/Debian).
#
# Variáveis opcionais:
#   GENOVO_REPO=https://github.com/genesisempreendimentos-tech/GeNovo.git
#   GENOVO_DIR=/var/www/genovo
#   GENOVO_BRANCH=main
#   DEPLOY_USER=www-data

GENOVO_REPO="${GENOVO_REPO:-https://github.com/genesisempreendimentos-tech/GeNovo.git}"
GENOVO_DIR="${GENOVO_DIR:-/var/www/genovo}"
GENOVO_BRANCH="${GENOVO_BRANCH:-main}"
DEPLOY_USER="${DEPLOY_USER:-$USER}"

set -euo pipefail

echo "==> Dependências do sistema (Node 20+, git, nginx, pm2)"
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y git nginx curl
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Instale Node.js 20+ antes de continuar."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

echo "==> Pasta ${GENOVO_DIR}"
mkdir -p "$(dirname "${GENOVO_DIR}")"
mkdir -p "${GENOVO_DIR}/logs"

if [[ ! -d "${GENOVO_DIR}/.git" ]]; then
  echo "==> Clonando ${GENOVO_REPO}"
  git clone --branch "${GENOVO_BRANCH}" "${GENOVO_REPO}" "${GENOVO_DIR}"
else
  echo "==> Repositório já existe em ${GENOVO_DIR} — pulando clone"
fi

cd "${GENOVO_DIR}"

if [[ -n "${DEPLOY_USER}" ]] && [[ "$(id -un)" == "root" ]]; then
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${GENOVO_DIR}"
fi

echo "==> npm install"
npm install

if [[ ! -f backend/.env ]]; then
  cp .env.example backend/.env
  echo "IMPORTANTE: edite ${GENOVO_DIR}/backend/.env com suas chaves Supabase."
fi

if [[ ! -f frontend/.env ]]; then
  cp .env.example frontend/.env
  echo "IMPORTANTE: edite ${GENOVO_DIR}/frontend/.env (VITE_SUPABASE_* e VITE_GENOVO_AUDIT_SLUG)."
fi

echo "==> build produção"
npm run build:prod

pm2 start deploy/ecosystem.config.cjs || pm2 restart genovo
pm2 save

echo ""
echo "Próximos passos:"
echo "  sudo cp ${GENOVO_DIR}/deploy/nginx-genovo.conf /etc/nginx/sites-available/genovo"
echo "  sudo ln -sf /etc/nginx/sites-available/genovo /etc/nginx/sites-enabled/genovo"
echo "  sudo nginx -t && sudo systemctl reload nginx"
