/**
 * Resolver read-time: valor_norm → label canônico (cache em memória).
 */
import {
  extractEmpreendimentoParts,
  normalizeEmpreendimento,
} from '../lib/normalizeEmpreendimento.mjs';
import { normalizeEmpreendimentoTailwindColor } from '../lib/empreendimentoColor.mjs';

export const LABEL_NAO_INFORMADO = 'Não informado';
export const LABEL_A_CLASSIFICAR = 'A classificar';

/** @type {Map<string, { status: string, empreendimento_id: number|null, nome: string|null }>} */
let aliasMap = new Map();
/** @type {Set<string>} */
let genesisNameSet = new Set();
/** @type {Map<string, string>} nome canônico → classe Tailwind (bg-*-500) */
let genesisColorByName = new Map();
/** @type {Set<string>} */
let genesisTrojanNameSet = new Set();
let loadedAt = 0;
const CACHE_TTL_MS = 60_000;

export function invalidateEmpreendimentoResolver() {
  aliasMap = new Map();
  genesisNameSet = new Set();
  genesisColorByName = new Map();
  genesisTrojanNameSet = new Set();
  loadedAt = 0;
}

export async function loadEmpreendimentoResolver(client, { force = false } = {}) {
  if (!force && aliasMap.size > 0 && Date.now() - loadedAt < CACHE_TTL_MS) {
    return aliasMap;
  }

  const { rows } = await client.query(`
    SELECT
      a.valor_norm,
      a.status,
      a.empreendimento_id,
      g.nome
    FROM empreendimento_aliases a
    LEFT JOIN empreendimentos_genesis g ON g.id = a.empreendimento_id
  `);

  const next = new Map();
  for (const row of rows) {
    next.set(row.valor_norm, {
      status: row.status,
      empreendimento_id: row.empreendimento_id,
      nome: row.nome,
    });
  }

  let genesisNames = new Set();
  let genesisColors = new Map();
  try {
    const { rows: genesisRows } = await client.query(`
      SELECT nome, cor, is_trojan FROM empreendimentos_genesis ORDER BY nome
    `);
    const trojanNames = new Set();
    for (const row of genesisRows) {
      const name = String(row.nome ?? '').trim();
      if (!name) continue;
      genesisNames.add(name);
      genesisColors.set(name, normalizeEmpreendimentoTailwindColor(row.cor));
      if (row.is_trojan) trojanNames.add(name);
    }
    genesisTrojanNameSet = trojanNames;
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }

  aliasMap = next;
  genesisNameSet = genesisNames;
  genesisColorByName = genesisColors;
  loadedAt = Date.now();
  return aliasMap;
}

export function resolveEmpreendimentoPart(valorNorm) {
  const norm = normalizeEmpreendimento(valorNorm);
  if (!norm) return LABEL_NAO_INFORMADO;

  const entry = aliasMap.get(norm);
  if (!entry) return LABEL_A_CLASSIFICAR;

  if (entry.status === 'mapeado' && entry.nome) return entry.nome;
  if (entry.status === 'nao_informado') return LABEL_NAO_INFORMADO;
  return LABEL_A_CLASSIFICAR;
}

/** Retorna o nome canônico Genesis quando o alias está mapeado; caso contrário, null. */
export function resolveEmpreendimentoPartGenesis(valorNorm) {
  const norm = normalizeEmpreendimento(valorNorm);
  if (!norm) return null;

  const entry = aliasMap.get(norm);
  if (!entry || entry.status !== 'mapeado' || !entry.nome) return null;
  if (!genesisNameSet.has(entry.nome)) return null;

  return entry.nome;
}

/** Split ';', normaliza e resolve cada parte; dedupe preservando ordem. */
export function resolveEmpreendimentoInteresse(raw) {
  const parts = extractEmpreendimentoParts(raw);
  if (!parts.length) return [];

  const labels = [];
  const seen = new Set();
  for (const { valorNorm } of parts) {
    const label = resolveEmpreendimentoPart(valorNorm);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

/** Como resolveEmpreendimentoInteresse, mas só empreendimentos mapeados em empreendimentos_genesis. */
export function resolveEmpreendimentoInteresseGenesis(raw) {
  const parts = extractEmpreendimentoParts(raw);
  if (!parts.length) return [];

  const labels = [];
  const seen = new Set();
  for (const { valorNorm } of parts) {
    const label = resolveEmpreendimentoPartGenesis(valorNorm);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

/** Agrega contagens por label a partir de valores brutos (cadastro escalar ou array de pessoa). */
export function aggregateEmpreendimentoLabels(rawValues) {
  const map = new Map();
  for (const raw of rawValues) {
    let labels;
    if (Array.isArray(raw)) {
      labels = [];
      for (const item of raw) {
        labels.push(...resolveEmpreendimentoInteresse(item));
      }
    } else {
      labels = resolveEmpreendimentoInteresse(raw);
    }
    if (!labels.length) labels = [LABEL_NAO_INFORMADO];

    const unique = [...new Set(labels)];
    for (const label of unique) {
      map.set(label, (map.get(label) ?? 0) + 1);
    }
  }
  return map;
}

/** Agrega apenas empreendimentos canônicos Genesis (aliases mapeados). */
export function aggregateGenesisEmpreendimentoLabels(rawValues) {
  const map = new Map();
  for (const raw of rawValues) {
    let labels;
    if (Array.isArray(raw)) {
      labels = [];
      for (const item of raw) {
        labels.push(...resolveEmpreendimentoInteresseGenesis(item));
      }
    } else {
      labels = resolveEmpreendimentoInteresseGenesis(raw);
    }
    if (!labels.length) continue;

    const unique = [...new Set(labels)];
    for (const label of unique) {
      map.set(label, (map.get(label) ?? 0) + 1);
    }
  }
  return map;
}

/** Ordena séries: totais DESC, buckets especiais ao final. */
export function orderEmpreendimentoSeries(totalsByLabel) {
  const special = new Set([LABEL_A_CLASSIFICAR, LABEL_NAO_INFORMADO]);
  const ranked = [...totalsByLabel.entries()]
    .filter(([name]) => !special.has(name))
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const tail = [];
  if (totalsByLabel.has(LABEL_A_CLASSIFICAR)) tail.push(LABEL_A_CLASSIFICAR);
  if (totalsByLabel.has(LABEL_NAO_INFORMADO)) tail.push(LABEL_NAO_INFORMADO);

  return [...ranked, ...tail];
}

/** Ordena séries apenas com nomes de empreendimentos_genesis. */
export function orderGenesisEmpreendimentoSeries(totalsByLabel) {
  return [...totalsByLabel.entries()]
    .filter(([name]) => genesisNameSet.has(name))
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

/** Classe Tailwind da cor de marca (ex.: bg-teal-500). */
export function resolveGenesisEmpreendimentoColor(nome) {
  return genesisColorByName.get(nome) ?? 'bg-teal-500';
}

/** Empreendimento canônico marcado como Tróia (is_trojan). */
export function isGenesisEmpreendimentoTrojan(nome) {
  return genesisTrojanNameSet.has(String(nome ?? '').trim());
}
