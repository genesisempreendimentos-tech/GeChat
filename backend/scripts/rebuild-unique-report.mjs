/**
 * Rebuild all_leads_unique + top-10 por signup_count.
 * Uso: node backend/scripts/rebuild-unique-report.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import { rebuildAllLeadsUnique } from '../src/services/allLeadsUnique.mjs';

const GARBAGE_EMAILS = new Set(['não sei', 'nao sei', 'não tenho', 'nao tenho', '.']);

async function main() {
  const url = process.env.NEON_LEADS_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    const result = await rebuildAllLeadsUnique(client);

    const { rows: top10 } = await client.query(
      `SELECT person_id, signup_count, email, phone, source_table, empreendimento_interesse
       FROM all_leads_unique
       ORDER BY signup_count DESC
       LIMIT 10`,
    );

    console.log('\n=== TOTAIS ===');
    console.log(`all_leads: ${result.all_leads}`);
    console.log(`all_leads_unique: ${result.unique}`);
    console.log(`merges: ${result.merges}`);

    console.log('\n=== TOP-10 signup_count ===');
    let garbageInTop = false;
    for (const row of top10) {
      const emails = (row.email ?? []).map((e) => String(e).trim().toLowerCase());
      const hasGarbage = emails.some((e) => GARBAGE_EMAILS.has(e));
      if (hasGarbage) garbageInTop = true;
      console.log(
        JSON.stringify({
          signup_count: row.signup_count,
          email: row.email,
          phone: row.phone,
          source_table: row.source_table,
        }),
      );
    }

    if (garbageInTop) {
      console.error('\nFALHA: top-10 contém email lixo (não sei / não tenho / .)');
      process.exit(1);
    }

    if (result.unique <= 3506) {
      console.error(`\nFALHA: esperado unique > 3506, obteve ${result.unique}`);
      process.exit(1);
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
