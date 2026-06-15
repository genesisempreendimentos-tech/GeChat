import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const email = String(process.env.CVCRM_EMAIL ?? '').trim().replace(/^["']|["']$/g, '');
const token = String(process.env.CVCRM_TOKEN ?? '').trim().replace(/^["']|["']$/g, '');
if (!email || !token) {
  console.error('Credenciais ausentes');
  process.exit(1);
}

const base = 'https://genesis.cvcrm.com.br/api/v1/cvdw/reservas';
const url = `${base}?a_partir_data_referencia=2024-01-01&registros_por_pagina=3`;
const headers = { accept: 'application/json', email, token };

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

function flag(keys, patterns) {
  const lower = [...keys].map((k) => k.toLowerCase());
  return patterns.some((p) =>
    lower.some((k) => k === p || k.endsWith(`.${p}`) || k.includes(p)),
  );
}

const res = await fetch(url, { method: 'GET', headers });
const text = await res.text();
let body = null;
try {
  body = text ? JSON.parse(text) : null;
} catch {
  body = { _raw: text?.slice(0, 300) };
}

let optionsMethods = null;
if (res.status === 404 || res.status === 405) {
  const opt = await fetch(base, { method: 'OPTIONS', headers });
  optionsMethods =
    opt.headers.get('access-control-allow-methods') ||
    opt.headers.get('Allow') ||
    '(ausente)';
}

let pag = null;
let keys = [];
if (res.status === 200 && body && typeof body === 'object') {
  pag = {
    pagina: body.pagina,
    registros: body.registros,
    total_de_registros: body.total_de_registros,
    total_de_paginas: body.total_de_paginas,
    topLevel: Object.keys(body).filter((k) => k !== 'dados'),
  };
  const dados = Array.isArray(body.dados) ? body.dados : [];
  if (dados[0]) keys = [...deepKeys(dados[0])].sort();
}

const flags = {
  idlead: flag(keys, ['idlead']),
  idcliente: flag(keys, ['idcliente']),
  idreserva: flag(keys, ['idreserva']),
  idcorretor: flag(keys, ['idcorretor']),
  valor: flag(keys, ['valor', 'valor_contrato']),
  unidade: flag(keys, ['unidade']),
  empreendimento: flag(keys, ['empreendimento']),
  contrato: flag(keys, ['contrato']),
  situacao: flag(keys, ['situacao']),
  data: flag(keys, ['data_venda', 'data']),
};

console.log('STATUS:', res.status);
if (optionsMethods) console.log('OPTIONS methods:', optionsMethods);
console.log('PAGINACAO:', JSON.stringify(pag));
console.log('CHAVES 1o registro:', keys.join(', ') || '(vazio)');
console.log('FLAGS:', JSON.stringify(flags));

const sim = Object.entries(flags)
  .filter(([, v]) => v)
  .map(([k]) => k);
const nao = Object.entries(flags)
  .filter(([, v]) => !v)
  .map(([k]) => k);
console.log(
  `TABELA: /api/v1/cvdw/reservas | ${res.status} | sim: ${sim.join(',') || 'nenhum'} | nao: ${nao.join(',')}`,
);
