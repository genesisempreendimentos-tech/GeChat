/**
 * Backfill completo cvcrm_comissoes + cvcrm_comissao_pagamentos via CVDW.
 * Uso: node backend/scripts/backfill-cvcrm-comissoes.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/services/cvcrmBatchSync.mjs';
import {
  backfillCvcrmComissoesFromCvdw,
  ensureCvcrmComissoesSchema,
  runComissoesDiagnostics,
} from '../src/services/cvcrmComissoesSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

async function main() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    await ensureCvcrmComissoesSchema(client);

    const beforeComissoes = await client.query(`SELECT COUNT(*)::int AS n FROM cvcrm_comissoes`);
    const beforePagamentos = await client.query(
      `SELECT COUNT(*)::int AS n FROM cvcrm_comissao_pagamentos`,
    );
    console.log(`Antes: comissões=${beforeComissoes.rows[0]?.n ?? 0}, pagamentos=${beforePagamentos.rows[0]?.n ?? 0}`);

    const result = await backfillCvcrmComissoesFromCvdw(client, {
      sinceBrt: '2000-01-01 00:00:00',
    });
    console.log('Backfill:', JSON.stringify(result, null, 2));

    const diagnostics = await runComissoesDiagnostics(client);
    const afterComissoes = await client.query(`SELECT COUNT(*)::int AS n FROM cvcrm_comissoes`);
    const afterPagamentos = await client.query(
      `SELECT COUNT(*)::int AS n FROM cvcrm_comissao_pagamentos`,
    );

    console.log(`\n=== COUNT final: comissões=${afterComissoes.rows[0].n}, pagamentos=${afterPagamentos.rows[0].n} ===`);
    console.log('\n=== DIAGNÓSTICO ===');
    console.log(JSON.stringify(diagnostics, null, 2));
  } finally {
    await client.end().catch(() => {});
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
