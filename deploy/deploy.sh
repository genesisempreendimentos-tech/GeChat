#!/usr/bin/env bash
# Atualização na VPS (git pull + rebuild + restart).
# Uso: bash deploy/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

REMOTE="${GELEADS_REMOTE:-geleads}"
BRANCH="${GELEADS_BRANCH:-main}"

echo "==> git pull ${REMOTE} ${BRANCH}"
git pull "${REMOTE}" "${BRANCH}"

echo "==> npm install"
npm install

echo "==> Build"
bash deploy/build-prod.sh

echo "==> PM2 restart"
if pm2 describe geleads >/dev/null 2>&1; then
  pm2 restart geleads
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save
echo "==> Deploy concluído."
