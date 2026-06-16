/**
 * Backfill: normaliza nome/imobiliária em cvcrm_corretores e cvcrm_imobiliarias.
 * Não altera payload.
 *
 * Uso: node backend/scripts/backfill-cadastros-title-case.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/services/cvcrmBatchSync.mjs';
import { toTitleCasePtBr, toTitleCaseImobiliaria } from '../src/lib/toTitleCasePtBr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

async function backfillCorretores(client) {
  const { rows } = await client.query(
    `SELECT idcorretor, nome, imobiliaria FROM cvcrm_corretores`,
  );

  let updated = 0;
  for (const row of rows) {
    const nome = row.nome != null ? toTitleCasePtBr(row.nome) : null;
    const imobiliaria = row.imobiliaria != null ? toTitleCaseImobiliaria(row.imobiliaria) : null;

    if (nome === row.nome && imobiliaria === row.imobiliaria) continue;

    await client.query(
      `UPDATE cvcrm_corretores
       SET nome = $2, imobiliaria = $3
       WHERE idcorretor = $1`,
      [row.idcorretor, nome, imobiliaria],
    );
    updated += 1;
  }

  return { scanned: rows.length, updated };
}

async function backfillImobiliarias(client) {
  const { rows } = await client.query(
    `SELECT idimobiliaria, nome FROM cvcrm_imobiliarias`,
  );

  let updated = 0;
  const examples = [];

  for (const row of rows) {
    const before = row.nome;
    const nome = before != null ? toTitleCaseImobiliaria(before) : null;
    if (nome === before) continue;

    await client.query(
      `UPDATE cvcrm_imobiliarias SET nome = $2 WHERE idimobiliaria = $1`,
      [row.idimobiliaria, nome],
    );
    updated += 1;
    if (examples.length < 10) {
      examples.push({ before, after: nome });
    }
  }

  return { scanned: rows.length, updated, examples };
}

async function main() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    const corretores = await backfillCorretores(client);
    const imobiliarias = await backfillImobiliarias(client);

    console.log('Backfill Title Case concluído:');
    console.log(
      `  cvcrm_corretores: ${corretores.updated}/${corretores.scanned} linha(s) atualizada(s)`,
    );
    console.log(
      `  cvcrm_imobiliarias: ${imobiliarias.updated}/${imobiliarias.scanned} linha(s) atualizada(s)`,
    );
    console.log(
      `  total: ${corretores.updated + imobiliarias.updated} linha(s) alterada(s)`,
    );

    if (imobiliarias.examples.length) {
      console.log('\nExemplos imobiliária (antes → depois):');
      for (const ex of imobiliarias.examples) {
        console.log(`  • ${JSON.stringify(ex.before)} → ${JSON.stringify(ex.after)}`);
      }
    }
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
