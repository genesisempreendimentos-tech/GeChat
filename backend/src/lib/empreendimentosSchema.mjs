import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = [
  readFileSync(join(__dirname, '../../migrations/neon-empreendimentos-canonical.sql'), 'utf8'),
  readFileSync(join(__dirname, '../../migrations/neon-empreendimentos-cor-logo.sql'), 'utf8'),
  readFileSync(join(__dirname, '../../migrations/neon-empreendimentos-is-trojan.sql'), 'utf8'),
  readFileSync(join(__dirname, '../../migrations/neon-empreendimentos-unidades.sql'), 'utf8'),
].join('\n');

export const ENSURE_EMPREENDIMENTOS_SQL = MIGRATION_SQL;

export async function ensureEmpreendimentosSchema(client) {
  await client.query(ENSURE_EMPREENDIMENTOS_SQL);
}
