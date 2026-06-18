/**
 * Verifica timeline de Leads sem bucket "Outros" e com resolução canônica.
 * Uso: node backend/scripts/verify-empreendimento-timeline.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLeadsOverviewCharts } from '../src/services/leadsOverviewService.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

async function main() {
  const charts = await getLeadsOverviewCharts({ periodo: 'todos' });
  const series = charts.timeline?.series ?? [];
  const names = series.map((item) => (typeof item === 'string' ? item : item.name));

  const hasOutros = names.some((name) => name === 'Outros');
  if (hasOutros) {
    console.error('FALHA: timeline ainda contém série "Outros"');
    process.exit(1);
  }

  const porEmp = charts.distribuicao?.por_empreendimento ?? [];
  const empHasOutros = porEmp.some((row) => row.empreendimento === 'Outros');
  if (empHasOutros) {
    console.error('FALHA: distribuição por_empreendimento contém "Outros"');
    process.exit(1);
  }

  console.log('=== Verificação empreendimentos canônicos ===');
  console.log(`Séries na timeline: ${names.length}`);
  console.log(`Contém "Outros": ${hasOutros ? 'sim' : 'não'} ✓`);
  console.log('');
  console.log('Top séries (timeline):');
  for (const name of names.slice(0, 15)) {
    console.log(`  - ${name}`);
  }
  console.log('');
  console.log('por_empreendimento (top 10):');
  for (const row of porEmp.slice(0, 10)) {
    console.log(`  ${row.cadastros.toString().padStart(5)} cad / ${row.pessoas.toString().padStart(5)} pess — ${row.empreendimento}`);
  }

  const hasAClassificar = names.includes('A classificar') || porEmp.some((r) => r.empreendimento === 'A classificar');
  const hasNaoInformado = names.includes('Não informado') || porEmp.some((r) => r.empreendimento === 'Não informado');
  console.log('');
  console.log(`Bucket "A classificar": ${hasAClassificar ? 'presente' : 'ausente'}`);
  console.log(`Bucket "Não informado": ${hasNaoInformado ? 'presente' : 'ausente'}`);
  if (hasAClassificar || hasNaoInformado) {
    console.error('FALHA: gráficos ainda contêm buckets de alias não mapeados');
    process.exit(1);
  }
  console.log('');
  console.log('OK — timeline apenas com empreendimentos Genesis.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
