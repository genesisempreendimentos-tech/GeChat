import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const urls = {
  geteams: process.env.NEON_GETEAMS_DATABASE_URL,
  leads: process.env.NEON_LEADS_DATABASE_URL || process.env.DATABASE_URL,
};

for (const [name, url] of Object.entries(urls)) {
  if (!url) {
    console.log(`${name}: not set`);
    continue;
  }
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const r = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND (
           table_name LIKE 'leads%'
           OR table_name LIKE 'site_%'
           OR table_name LIKE 'campanha_%'
           OR table_name = 'all_leads'
           OR table_name = 'all_leads_unique'
         )
       ORDER BY 1`,
    );
    console.log(`${name} tables:`, r.rows.map((x) => x.table_name).join(', ') || '(none)');

    const legacy = r.rows.find((x) => x.table_name === 'leads');
    if (legacy) {
      console.warn(`${name} AVISO: tabela legada "leads" ainda existe — execute neon-drop-legacy-leads.sql`);
    }

    for (const t of ['site_solar_bosque', 'all_leads', 'all_leads_unique']) {
      try {
        const c = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
        console.log(`${name} ${t} count:`, c.rows[0].n);
        const sample = await client.query(`SELECT * FROM ${t} ORDER BY created_at DESC LIMIT 1`);
        if (sample.rows[0]) {
          console.log(`${name} ${t} sample keys:`, Object.keys(sample.rows[0]).join(', '));
        }
      } catch {
        // table missing
      }
    }
  } catch (e) {
    console.log(`${name} error:`, e.message);
  } finally {
    await client.end().catch(() => {});
  }
}
