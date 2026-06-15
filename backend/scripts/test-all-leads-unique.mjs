/**
 * Testa all_leads_unique (1 linha por pessoa via union-find).
 * Uso: node backend/scripts/test-all-leads-unique.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import { syncLeadsFromSources } from '../src/services/leadSourceSync.mjs';
import { normalizePersonEmail, normalizePersonPhone } from '../src/services/allLeadsUnique.mjs';

async function findMergedExample(client) {
  const { rows } = await client.query(
    `SELECT
       COALESCE(NULLIF(lower(trim(email)), ''), NULL) AS norm_email,
       regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') AS norm_phone,
       array_agg(DISTINCT source_table) AS sources,
       COUNT(*)::int AS signup_count
     FROM all_leads
     WHERE (email IS NOT NULL AND trim(email) <> '')
        OR (phone IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') <> '')
     GROUP BY 1, 2
     HAVING COUNT(DISTINCT source_table) > 1
     ORDER BY signup_count DESC
     LIMIT 1`,
  );

  if (rows.length === 0) return null;

  const hit = rows[0];
  const normEmail = hit.norm_email;
  const normPhone = hit.norm_phone;

  const { rows: signups } = await client.query(
    `SELECT id, source_table, name, email, phone, empreendimento_interesse, created_at
     FROM all_leads
     WHERE ($1::text IS NOT NULL AND lower(trim(email)) = $1)
        OR ($2::text IS NOT NULL AND $2 <> '' AND regexp_replace(phone, '\\D', '', 'g') = $2)
     ORDER BY created_at ASC`,
    [normEmail, normPhone],
  );

  const lookupEmail = normEmail || normalizePersonEmail(signups[0]?.email);
  const lookupPhone = normPhone || normalizePersonPhone(signups[0]?.phone);

  let uniqueRow = null;
  if (lookupEmail) {
    const res = await client.query(
      `SELECT * FROM all_leads_unique WHERE $1 = ANY(email) LIMIT 1`,
      [lookupEmail],
    );
    uniqueRow = res.rows[0] ?? null;
  }
  if (!uniqueRow && lookupPhone) {
    const res = await client.query(
      `SELECT * FROM all_leads_unique WHERE $1 = ANY(phone) LIMIT 1`,
      [lookupPhone],
    );
    uniqueRow = res.rows[0] ?? null;
  }

  return { signups, uniqueRow, normEmail: lookupEmail, normPhone: lookupPhone };
}

async function main() {
  const url = process.env.NEON_LEADS_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  console.log('Rodando consolidação + rebuild all_leads_unique...');
  const syncResult = await syncLeadsFromSources({ force: true });
  console.log('Sync unique:', JSON.stringify(syncResult.unique, null, 2));

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    const { rows: totals } = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM all_leads) AS all_leads,
         (SELECT COUNT(*)::int FROM all_leads_unique) AS all_leads_unique`,
    );
    const { all_leads: allLeadsTotal, all_leads_unique: uniqueTotal } = totals[0];

    console.log('\n=== TOTAIS ===');
    console.log(`all_leads: ${allLeadsTotal}`);
    console.log(`all_leads_unique: ${uniqueTotal}`);
    console.log(`merges: ${allLeadsTotal - uniqueTotal}`);

    if (uniqueTotal >= allLeadsTotal) {
      console.error('FALHA: all_leads_unique deveria ser menor que all_leads');
      process.exitCode = 1;
    }

    const example = await findMergedExample(client);
    if (example?.uniqueRow) {
      console.log('\n=== EXEMPLO MESCLADO ===');
      console.log(`email normalizado: ${example.normEmail ?? '—'}`);
      console.log(`telefone normalizado: ${example.normPhone ?? '—'}`);
      console.log(`signups em all_leads: ${example.signups.length}`);
      for (const s of example.signups) {
        console.log(
          `  - ${s.source_table}: ${s.name} | ${s.empreendimento_interesse ?? '—'} | ${s.email ?? '—'} | ${s.phone ?? '—'}`,
        );
      }
      console.log(`person_id: ${example.uniqueRow.person_id}`);
      console.log(`signup_count: ${example.uniqueRow.signup_count}`);
      console.log(`source_table[]: ${JSON.stringify(example.uniqueRow.source_table)}`);
      console.log(
        `empreendimento_interesse[]: ${JSON.stringify(example.uniqueRow.empreendimento_interesse)}`,
      );
    } else {
      console.warn('\nNenhum exemplo multi-fonte encontrado para spot-check.');
    }
  } finally {
    await client.end().catch(() => {});
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
