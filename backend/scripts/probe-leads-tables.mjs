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
       WHERE table_schema = 'public' AND table_name LIKE 'leads%'
       ORDER BY 1`,
    );
    console.log(`${name} tables:`, r.rows.map((x) => x.table_name).join(', ') || '(none)');
    for (const t of ['leads_solar_bosque', 'leads_solar_do_bosque', 'leads']) {
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
