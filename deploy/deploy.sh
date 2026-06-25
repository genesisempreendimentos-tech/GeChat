#!/usr/bin/env bash
# Deploy na VPS — pull, build, restart PM2
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="${GENOVO_REMOTE:-origin}"
BRANCH="${GENOVO_BRANCH:-main}"

echo "==> git fetch ${REMOTE} ${BRANCH}"
git fetch "${REMOTE}" "${BRANCH}"
git checkout "${BRANCH}"
git pull "${REMOTE}" "${BRANCH}"

echo "==> npm install"
npm install

echo "==> build produção"
npm run build:prod

if pm2 describe genovo >/dev/null 2>&1; then
  pm2 restart genovo
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save
echo "==> Deploy concluído"
