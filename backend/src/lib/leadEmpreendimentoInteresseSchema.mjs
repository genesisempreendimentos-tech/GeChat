import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ENSURE_LEAD_EMPREENDIMENTO_INTERESSE_SQL = readFileSync(
  join(__dirname, '../../migrations/neon-lead-empreendimento-interesse.sql'),
  'utf8',
);

export async function ensureLeadEmpreendimentoInteresseSchema(client) {
  await client.query(ENSURE_LEAD_EMPREENDIMENTO_INTERESSE_SQL);
}
