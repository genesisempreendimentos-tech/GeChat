import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ENSURE_HISTORICO_SQL = readFileSync(
  join(__dirname, '../../migrations/neon-historico-movimentacoes.sql'),
  'utf8',
);

export async function ensureHistoricoSchema(client) {
  await client.query(ENSURE_HISTORICO_SQL);
}
