import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const email = String(process.env.CVCRM_EMAIL ?? '').trim().replace(/^["']|["']$/g, '');
const token = String(process.env.CVCRM_TOKEN ?? '').trim().replace(/^["']|["']$/g, '');
if (!email || !token) {
  console.error('CVCRM_EMAIL / CVCRM_TOKEN ausentes no .env');
  process.exit(1);
}

const BASE = 'https://genesis.cvcrm.com.br/api/v1/cvdw/leads';

const CASES = [
  {
    label: 'A',
    desc: 'só data',
    query: 'a_partir_data_referencia=2026-06-11&registros_por_pagina=3',
  },
  {
    label: 'B',
    desc: 'data + hora (espaço)',
    query: 'a_partir_data_referencia=2026-06-11%2014:00:00&registros_por_pagina=3',
  },
  {
    label: 'C1',
    desc: 'a_partir_data_referencia ISO T',
    query: 'a_partir_data_referencia=2026-06-11T14:00:00&registros_por_pagina=3',
  },
  {
    label: 'C2',
    desc: 'data_inicio',
    query: 'data_inicio=2026-06-11%2014:00:00&registros_por_pagina=3',
  },
  {
    label: 'C3',
    desc: 'alterado_a_partir',
    query: 'alterado_a_partir=2026-06-11%2014:00:00&registros_por_pagina=3',
  },
  {
    label: 'C4',
    desc: 'data_ultima_alteracao',
    query: 'data_ultima_alteracao=2026-06-11&registros_por_pagina=3',
  },
];

const ALTERATION_KEYS = [
  'data_ultima_alteracao',
  'referencia_data',
  'data_modificacao',
  'data_ultima_alteracao_situacao',
  'cvcrm_last_update',
];

function pickAlterationFields(row) {
  if (!row || typeof row !== 'object') return null;
  const out = {};
  for (const k of ALTERATION_KEYS) {
    if (row[k] != null && row[k] !== '') out[k] = row[k];
  }
  if (Object.keys(out).length === 0) {
    const dateLike = Object.fromEntries(
      Object.entries(row).filter(([key, val]) => {
        if (val == null || val === '') return false;
        return /data|alterac|modific|referencia/i.test(key);
      }),
    );
    return Object.keys(dateLike).length ? dateLike : null;
  }
  return out;
}

async function probe(testCase) {
  const url = `${BASE}?${testCase.query}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json', email, token },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  const total = body?.total_de_registros ?? body?.total ?? null;
  const first = Array.isArray(body?.dados) ? body.dados[0] : null;
  const alteration = pickAlterationFields(first);

  return {
    label: testCase.label,
    desc: testCase.desc,
    query: testCase.query,
    url,
    status: res.status,
    total_de_registros: total,
    registros_pagina: body?.registros ?? null,
    primeiro_idlead: first?.idlead ?? first?.id ?? null,
    campos_alteracao_primeiro: alteration,
    erro: body && !Array.isArray(body?.dados) && body?.erro ? body.erro : null,
    body_preview: !body && text ? text.slice(0, 200) : null,
  };
}

const results = [];
for (const c of CASES) {
  results.push(await probe(c));
}

const totalA = results.find((r) => r.label === 'A')?.total_de_registros;

console.log('=== SONDAGEM cvdw/leads — granularidade do filtro ===\n');
console.log(`Baseline A (só data): total_de_registros = ${totalA}\n`);

for (const r of results) {
  console.log(`--- ${r.label}: ${r.desc} ---`);
  console.log(`query: ${r.query}`);
  console.log(`status: ${r.status}`);
  console.log(`total_de_registros: ${r.total_de_registros}`);
  if (r.erro) console.log(`erro API: ${JSON.stringify(r.erro)}`);
  if (r.body_preview) console.log(`body (preview): ${r.body_preview}`);

  if (r.label !== 'A' && totalA != null && r.total_de_registros != null) {
    if (r.total_de_registros < totalA) {
      console.log(`vs A: REDUZIU (${r.total_de_registros} < ${totalA}) → filtro por hora provavelmente respeitado`);
    } else if (r.total_de_registros === totalA) {
      console.log(`vs A: IGUAL (${r.total_de_registros}) → ignora hora ou mesmo conjunto do dia`);
    } else {
      console.log(`vs A: MAIOR (${r.total_de_registros} > ${totalA}) → param diferente ou sem filtro de data`);
    }
  }

  if (r.campos_alteracao_primeiro) {
    console.log(`1º registro (idlead=${r.primeiro_idlead ?? '—'}) campos data/alteração:`);
    console.log(JSON.stringify(r.campos_alteracao_primeiro, null, 2));
  } else if (r.status >= 200 && r.status < 300) {
    console.log('1º registro: sem dados ou sem campo de alteração identificado');
  }
  console.log('');
}
