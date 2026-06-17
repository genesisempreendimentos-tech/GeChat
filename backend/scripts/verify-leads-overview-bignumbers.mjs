import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { getLeadsOverview } from '../src/services/leadsOverviewService.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();
const { rows: [db] } = await client.query(`
  SELECT
    (SELECT COUNT(*)::int FROM all_leads) AS all_leads,
    (SELECT COUNT(*)::int FROM all_leads_unique) AS all_leads_unique
`);
await client.end();

const overview = await getLeadsOverview({});
const bn = overview.bignumbers;

console.log('DB direto (sem filtro):', db);
console.log('Overview default (sem query params):', {
  leads_totais: bn.leads_totais.count,
  leads_unicos: bn.leads_unicos.count,
  duplicados: bn.duplicados.count,
  conversao_reserva: bn.converteram_reserva.count,
  conversao_venda: bn.viraram_venda.count,
  sem_fonte: bn.sem_fonte_marketing.count,
});
console.log('Match leads_totais:', bn.leads_totais.count === db.all_leads ? 'OK' : 'FAIL');
console.log('Match leads_unicos:', bn.leads_unicos.count === db.all_leads_unique ? 'OK' : 'FAIL');
console.log(
  'Match duplicados:',
  bn.duplicados.count === db.all_leads - db.all_leads_unique ? 'OK' : 'FAIL',
);
