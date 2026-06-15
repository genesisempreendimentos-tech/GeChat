import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const TABLES = [
  'campanha_niver_208_anos_friburgo', 'campanha_blackgenesis', 'site_flow', 'site_gesite',
  'site_kastell', 'site_nature', 'site_oasis_i', 'site_oasis_ii', 'leads_antigos',
  'site_solar_bellavista', 'site_solar_bosque', 'site_solar_flores', 'site_vita', 'leads_cvcrm',
];

const CANON = [
  'id', 'created_at', 'updated_at', 'name', 'email', 'phone', 'gender', 'birth_date',
  'current_city', 'relationship_status', 'monthly_investment', 'profile_type',
  'profile_completed', 'whatsapp_clicked', 'canal', 'empreendimento_interesse', 'parameter',
  'codigo', 'cvcrm_lead_id', 'cvcrm_status', 'cvcrm_situation', 'cvcrm_stage',
  'cvcrm_is_sold', 'cvcrm_sale_value', 'cvcrm_sale_date', 'cvcrm_last_update',
  'cvcrm_payload', 'cvcrm_sync_status', 'cvcrm_sync_error', 'cvcrm_last_synced_at',
];

function effectiveColumns(have) {
  const s = new Set(have);
  if (s.has('empreendimento')) s.add('empreendimento_interesse');
  if (s.has('nome')) s.add('name');
  if (s.has('whatsapp')) s.add('phone');
  if (s.has('sexo')) s.add('gender');
  if (s.has('completed')) s.add('profile_completed');
  return s;
}

const url = process.env.NEON_LEADS_DATABASE_URL || process.env.NEON_GELEADS_DATABASE_URL;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

for (const table of TABLES) {
  const r = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  const have = r.rows.map((x) => x.column_name);
  const eff = effectiveColumns(have);
  const missing = CANON.filter((col) => !eff.has(col));
  const nonCanon = have.filter((col) => !CANON.includes(col) && col !== 'empreendimento' && col !== 'nome' && col !== 'whatsapp' && col !== 'sexo' && col !== 'completed' && col !== 'interesse' && col !== 'ormetain' && col !== 'nascimento' && col !== 'idade' && col !== 'data_entrada' && col !== 'pontos' && col !== 'emoji');
  const bd = r.rows.find((x) => x.column_name === 'birth_date');
  console.log(JSON.stringify({ table, missing, nonCanonPendingDrop: nonCanon, birth_date_type: bd?.data_type ?? null }));
}

await client.end();
process.exit(0);
