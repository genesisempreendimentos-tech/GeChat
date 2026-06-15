import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const email = String(process.env.CVCRM_EMAIL ?? '').trim().replace(/^["']|["']$/g, '');
const token = String(process.env.CVCRM_TOKEN ?? '').trim().replace(/^["']|["']$/g, '');
if (!email || !token) {
  console.error('Credenciais CVCRM ausentes');
  process.exit(1);
}

const routes = [
  'https://genesis.cvcrm.com.br/api/v1/comercial/reservas',
  'https://genesis.cvcrm.com.br/api/cvio/cliente',
  'https://genesis.cvcrm.com.br/api/cvio/reserva',
  'https://genesis.cvcrm.com.br/api/v1/cvdw/clientes',
  'https://genesis.cvcrm.com.br/api/v1/cvdw/corretores',
  'https://genesis.cvcrm.com.br/api/v1/cvdw/imobiliarias',
];

function deepKeys(obj, prefix = '') {
  const keys = new Set();
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return keys;
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    keys.add(full);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of deepKeys(v, full)) keys.add(sub);
    }
  }
  return keys;
}

function matchFlags(keys) {
  const lower = [...keys].map((k) => k.toLowerCase());
  const has = (patterns) =>
    patterns.some((p) => lower.some((k) => k === p || k.endsWith(`.${p}`) || k.includes(p)));
  return {
    idlead: has(['idlead']),
    idcliente: has(['idcliente']),
    venda: has([
      'idreserva',
      'idcorretor',
      'idimobiliaria',
      'documento',
      'cpf',
      'valor',
      'unidade',
      'empreendimento',
      'contrato',
    ]),
  };
}

async function probe(baseUrl) {
  const url = `${baseUrl}?registros_por_pagina=3`;
  const headers = { accept: 'application/json', email, token };
  let getStatus = null;
  let optionsMethods = null;
  let pagination = null;
  let firstKeys = [];

  try {
    const res = await fetch(url, { method: 'GET', headers });
    getStatus = res.status;
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (getStatus === 405) {
      const opt = await fetch(baseUrl, { method: 'OPTIONS', headers });
      optionsMethods =
        opt.headers.get('access-control-allow-methods') ||
        opt.headers.get('Allow') ||
        '(ausente)';
    }

    if (getStatus === 200 && body && typeof body === 'object') {
      pagination = {
        pagina: body.pagina,
        registros: body.registros,
        total_de_registros: body.total_de_registros,
        total_de_paginas: body.total_de_paginas,
        topLevel: Object.keys(body).filter((k) => k !== 'dados'),
      };
      const dados = Array.isArray(body.dados)
        ? body.dados
        : Array.isArray(body.data)
          ? body.data
          : [];
      const first = dados[0] ?? null;
      if (first) firstKeys = [...deepKeys(first)].sort();
    }
  } catch {
    getStatus = 'ERR';
  }

  return {
    url: baseUrl,
    getStatus,
    optionsMethods,
    pagination,
    firstKeys,
    flags: matchFlags(firstKeys),
  };
}

const results = [];
for (const route of routes) {
  results.push(await probe(route));
}

for (const r of results) {
  console.log('---DETALHE---');
  console.log('ROTA:', r.url);
  console.log('STATUS:', r.getStatus);
  if (r.getStatus === 405) console.log('OPTIONS methods:', r.optionsMethods);
  if (r.getStatus === 200) {
    console.log('PAGINACAO:', JSON.stringify(r.pagination));
    console.log('CHAVES 1o registro:', r.firstKeys.join(', ') || '(vazio)');
    console.log('FLAGS:', JSON.stringify(r.flags));
  }
}

console.log('---TABELA---');
console.log('rota | status | idlead | idcliente | campos venda');
for (const r of results) {
  const short = r.url.replace('https://genesis.cvcrm.com.br', '');
  console.log(
    [
      short,
      r.getStatus,
      r.flags.idlead ? 'sim' : 'nao',
      r.flags.idcliente ? 'sim' : 'nao',
      r.flags.venda ? 'sim' : 'nao',
    ].join(' | '),
  );
}
