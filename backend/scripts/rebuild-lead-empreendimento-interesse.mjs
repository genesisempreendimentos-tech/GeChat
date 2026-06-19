/**
 * Rebuild isolado da projeção lead_empreendimento_interesse.
 * Uso: node backend/scripts/rebuild-lead-empreendimento-interesse.mjs
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { rebuildLeadEmpreendimentoInteresse } from '../src/services/leadEmpreendimentoInteresseProjection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();
try {
  const result = await rebuildLeadEmpreendimentoInteresse(client);
  console.log('OK', result);
} finally {
  await client.end().catch(() => {});
}
