/**
 * Aplica migração NULL → 'Null' em all_leads e tabelas-fonte; refresh aliases + projeção.
 * Uso: node backend/scripts/apply-empreendimento-interesse-null.mjs
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { refreshEmpreendimentoAliasesFromAllLeads } from '../src/services/refreshEmpreendimentoAliasesFromAllLeads.mjs';
import { rebuildLeadEmpreendimentoInteresse } from '../src/services/leadEmpreendimentoInteresseProjection.mjs';
import { rebuildAllLeadsUnique } from '../src/services/allLeadsUnique.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const sql = readFileSync(
  path.join(__dirname, '..', 'migrations', 'neon-empreendimento-interesse-null.sql'),
  'utf8',
);

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

try {
  const { rows: [before] } = await client.query(`
    SELECT COUNT(*) FILTER (
      WHERE empreendimento_interesse IS NULL OR TRIM(empreendimento_interesse) = ''
    )::int AS vazios
    FROM all_leads
  `);
  console.log(`all_leads vazios/NULL antes: ${before.vazios}`);

  await client.query(sql);

  const { rows: [after] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE empreendimento_interesse = 'Null')::int AS null_label,
      COUNT(*) FILTER (
        WHERE empreendimento_interesse IS NULL OR TRIM(empreendimento_interesse) = ''
      )::int AS ainda_vazios
    FROM all_leads
  `);
  console.log(`all_leads com 'Null': ${after.null_label}, ainda vazios: ${after.ainda_vazios}`);

  const aliasResult = await refreshEmpreendimentoAliasesFromAllLeads(client);
  console.log('aliases refresh:', aliasResult);

  const uniqueResult = await rebuildAllLeadsUnique(client);
  console.log('all_leads_unique rebuild:', uniqueResult);
} finally {
  await client.end().catch(() => {});
}
