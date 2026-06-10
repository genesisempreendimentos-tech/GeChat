#!/usr/bin/env bash
# Build do frontend e cópia para backend/dist (servido pelo Express).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f frontend/.env ]]; then
  echo "Erro: crie frontend/.env antes do build (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)."
  exit 1
fi

echo "==> Build frontend"
npm run build --prefix frontend

echo "==> Copiando frontend/dist -> backend/dist"
rm -rf backend/dist
cp -r frontend/dist backend/dist

echo "==> Build de produção OK ($(du -sh backend/dist | cut -f1))"
