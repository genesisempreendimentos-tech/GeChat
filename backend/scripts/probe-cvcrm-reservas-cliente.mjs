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
  return patterns.some((p) => lower.some((k) => k === p || k.endsWith(`.${p}`) || k.includes(p)));
}

async function fetchJson(url) {
  const res = await fetch(url, { method: 'GET', headers });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _raw: text?.slice(0, 300) };
  }
  return { status: res.status, body };
}

// 1) Reservas com filtro de data
const reservasUrl =
  'https://genesis.cvcrm.com.br/api/v1/comercial/reservas?a_partir_de=2024-01-01&pagina=1&registros_por_pagina=3';
const reservas = await fetchJson(reservasUrl);

let reservasKeys = [];
let reservasPag = null;
let firstReserva = null;

if (reservas.status === 200 && reservas.body && typeof reservas.body === 'object') {
  reservasPag = {
    pagina: reservas.body.pagina,
    registros: reservas.body.registros,
    total_de_registros: reservas.body.total_de_registros,
    total_de_paginas: reservas.body.total_de_paginas,
    topLevel: Object.keys(reservas.body).filter((k) => k !== 'dados'),
  };
  const dados = Array.isArray(reservas.body.dados) ? reservas.body.dados : [];
  firstReserva = dados[0] ?? null;
  if (firstReserva) reservasKeys = [...deepKeys(firstReserva)].sort();
}

// 2) Buscar CPF real em cvdw/leads
const today = new Date().toISOString().slice(0, 10);
let cpfTestado = null;
let idleadOrigem = null;

for (let pagina = 1; pagina <= 5; pagina += 1) {
  const leadsUrl = `https://genesis.cvcrm.com.br/api/v1/cvdw/leads?a_partir_data_referencia=2024-01-01&pagina=${pagina}&registros_por_pagina=500`;
  const leadsRes = await fetchJson(leadsUrl);
  if (leadsRes.status !== 200) break;
  const dados = Array.isArray(leadsRes.body?.dados) ? leadsRes.body.dados : [];
  const found = dados.find((l) => {
    const doc = String(l.documento_cliente ?? '').replace(/\D/g, '');
    return doc.length >= 11;
  });
  if (found) {
    cpfTestado = String(found.documento_cliente).replace(/\D/g, '');
    idleadOrigem = found.idlead;
    break;
  }
  const totalPages = Number(leadsRes.body?.total_de_paginas) || 1;
  if (pagina >= totalPages) break;
}

let clienteStatus = null;
let clienteKeys = [];

if (cpfTestado) {
  const clienteUrl = `https://genesis.cvcrm.com.br/api/cvio/cliente?cpf=${encodeURIComponent(cpfTestado)}`;
  const cliente = await fetchJson(clienteUrl);
  clienteStatus = cliente.status;
  if (cliente.body && typeof cliente.body === 'object') {
    const payload = cliente.body.dados ?? cliente.body.cliente ?? cliente.body.data ?? cliente.body;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      clienteKeys = [...deepKeys(payload)].sort();
    } else if (Array.isArray(payload) && payload[0]) {
      clienteKeys = [...deepKeys(payload[0])].sort();
    } else {
      clienteKeys = [...deepKeys(cliente.body)].sort();
    }
  }
} else {
  clienteStatus = 'SKIP (sem documento_cliente em cvdw/leads)';
}

// Saída
console.log('=== RESERVAS ===');
console.log('status:', reservas.status);
console.log('paginacao:', JSON.stringify(reservasPag));
console.log('chaves 1o registro:', reservasKeys.join(', ') || '(vazio)');
console.log(
  'flags:',
  JSON.stringify({
    idlead: flag(reservasKeys, ['idlead']),
    idcliente: flag(reservasKeys, ['idcliente']),
    idreserva: flag(reservasKeys, ['idreserva']),
    idcorretor: flag(reservasKeys, ['idcorretor']),
    valor: flag(reservasKeys, ['valor']),
    unidade: flag(reservasKeys, ['unidade']),
    empreendimento: flag(reservasKeys, ['empreendimento']),
    contrato: flag(reservasKeys, ['contrato']),
    situacao: flag(reservasKeys, ['situacao']),
    data: flag(reservasKeys, ['data']),
  }),
);

console.log('=== CLIENTE ===');
console.log('cpf_testado_digits:', cpfTestado ? `${cpfTestado.slice(0, 3)}***${cpfTestado.slice(-2)}` : null);
console.log('idlead_origem:', idleadOrigem);
console.log('status:', clienteStatus);
console.log('chaves retorno:', clienteKeys.join(', ') || '(vazio)');
console.log(
  'flags:',
  JSON.stringify({
    idlead: flag(clienteKeys, ['idlead']),
    cep: flag(clienteKeys, ['cep']),
    genero_sexo: flag(clienteKeys, ['genero', 'sexo']),
    endereco: flag(clienteKeys, ['endereco', 'logradouro']),
    cidade: flag(clienteKeys, ['cidade']),
    estado: flag(clienteKeys, ['estado']),
  }),
);

console.log('=== TABELA ===');
const resFlags = [
  flag(reservasKeys, ['idlead']) ? 'idlead' : null,
  flag(reservasKeys, ['idcliente']) ? 'idcliente' : null,
  flag(reservasKeys, ['idreserva']) ? 'idreserva' : null,
  flag(reservasKeys, ['idcorretor']) ? 'idcorretor' : null,
  flag(reservasKeys, ['valor']) ? 'valor' : null,
  flag(reservasKeys, ['unidade']) ? 'unidade' : null,
  flag(reservasKeys, ['empreendimento']) ? 'empreendimento' : null,
  flag(reservasKeys, ['contrato']) ? 'contrato' : null,
  flag(reservasKeys, ['situacao']) ? 'situacao' : null,
  flag(reservasKeys, ['data']) ? 'data' : null,
].filter(Boolean);

const cliFlags = [
  flag(clienteKeys, ['idlead']) ? 'idlead' : null,
  flag(clienteKeys, ['cep']) ? 'cep' : null,
  flag(clienteKeys, ['genero', 'sexo']) ? 'genero/sexo' : null,
  flag(clienteKeys, ['endereco', 'logradouro']) ? 'endereco' : null,
  flag(clienteKeys, ['cidade']) ? 'cidade' : null,
  flag(clienteKeys, ['estado']) ? 'estado' : null,
].filter(Boolean);

console.log(
  `/api/v1/comercial/reservas?a_partir_de=... | ${reservas.status} | ${resFlags.join(',') || 'nenhum'} | flags: ${resFlags.length ? 'sim' : 'nao'}`,
);
console.log(
  `/api/cvio/cliente?cpf=... | ${clienteStatus} | ${clienteKeys.slice(0, 12).join(',')}${clienteKeys.length > 12 ? ',...' : ''} | flags: ${cliFlags.join(',') || 'nenhum'}`,
);
