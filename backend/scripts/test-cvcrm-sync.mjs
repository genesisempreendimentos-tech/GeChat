import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { sendLeadToCvcrm } from '../src/services/cvcrmService.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const neonUrl = process.env.NEON_LEADS_DATABASE_URL;
if (!neonUrl) {
  console.error('NEON_LEADS_DATABASE_URL não configurada.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });

try {
  await client.connect();

  const { rows } = await client.query(
    `SELECT *
     FROM leads_solar_bosque
     WHERE cvcrm_sync_status = 'pending'
     ORDER BY created_at ASC
     LIMIT 1`,
  );

  if (!rows[0]) {
    console.log('Nenhum lead com cvcrm_sync_status = \'pending\' encontrado.');
    process.exit(0);
  }

  const lead = rows[0];
  console.log('Lead selecionado:', {
    id: lead.id,
    nome: lead.nome,
    email: lead.email,
    whatsapp: lead.whatsapp,
    cvcrm_sync_status: lead.cvcrm_sync_status,
  });

  const result = await sendLeadToCvcrm({ ...lead, source_table: 'leads_solar_bosque' });
  console.log('Resposta completa:');
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Erro:', err);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
