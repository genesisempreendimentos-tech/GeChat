/**
 * Sinais de interesse (a) form, (b) site de origem, (c) atribuição CV — sem reserva.
 */
import { materializeEmpreendimentoInteresse } from './empreendimentoInteresseNull.mjs';
import {
  classifyAliasStatus,
  extractEmpreendimentoParts,
} from './normalizeEmpreendimento.mjs';
import { interesseNormFromSiteTable } from './siteTableEmpreendimento.mjs';

const CV_EMPREENDIMENTO_PAYLOAD_KEYS = [
  'empreendimento_ultimo',
  'empreendimento_primeiro',
  'empreendimento',
  'empreendimento_nome',
  'empreendimento_interesse',
];

/** Qualquer valor normalizado não vazio conta como sinal de interesse (inclui Não sei, Outros, etc.). */
export function isInteresseInformado(valorNorm) {
  if (!valorNorm) return false;
  return classifyAliasStatus(valorNorm) !== 'nao_informado';
}

/** (a) Multi-select do formulário — split ';', filtra vazio / não sei. */
export function extractFormInteresseNorms(raw) {
  const norms = [];
  const seen = new Set();
  const materialized = materializeEmpreendimentoInteresse(raw);
  for (const { valorNorm } of extractEmpreendimentoParts(materialized)) {
    if (!isInteresseInformado(valorNorm) || seen.has(valorNorm)) continue;
    seen.add(valorNorm);
    norms.push(valorNorm);
  }
  return norms;
}

function parseCvcrmPayload(payload) {
  if (payload == null) return null;
  if (typeof payload === 'object') return payload;
  try {
    return JSON.parse(String(payload));
  } catch {
    return null;
  }
}

/** (c) Empreendimento atribuído no CV (payload + coluna quando informativa). */
export function extractCvInteresseNorms(cvcrmPayload, empreendimentoInteresseColumn = null) {
  const norms = [];
  const seen = new Set();

  const addRaw = (raw) => {
    for (const norm of extractFormInteresseNorms(raw)) {
      if (seen.has(norm)) continue;
      seen.add(norm);
      norms.push(norm);
    }
  };

  if (empreendimentoInteresseColumn != null && String(empreendimentoInteresseColumn).trim()) {
    for (const norm of extractFormInteresseNorms(empreendimentoInteresseColumn)) {
      if (!seen.has(norm)) {
        seen.add(norm);
        norms.push(norm);
      }
    }
  }

  const payload = parseCvcrmPayload(cvcrmPayload);
  if (!payload || typeof payload !== 'object') return norms;

  for (const key of CV_EMPREENDIMENTO_PAYLOAD_KEYS) {
    const value = payload[key];
    if (value == null) continue;
    if (typeof value === 'object' && value !== null) {
      addRaw(value.nome ?? value.name ?? value.label ?? value.titulo);
      continue;
    }
    addRaw(value);
  }

  return norms;
}

/** (b) Site de origem — automático quando a tabela mapeia. */
export function extractSiteInteresseNorm(sourceTable) {
  return interesseNormFromSiteTable(sourceTable);
}

/**
 * União (a)+(b)+(c) para um cadastro — dedupe local por empreendimento_norm.
 * @returns {string[]}
 */
export function collectInteresseNormsForCadastro(row) {
  const seen = new Set();
  const out = [];

  const push = (norm) => {
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    out.push(norm);
  };

  for (const norm of extractFormInteresseNorms(
    materializeEmpreendimentoInteresse(row.empreendimento_interesse),
  )) push(norm);
  push(extractSiteInteresseNorm(row.source_table));
  for (const norm of extractCvInteresseNorms(row.cvcrm_payload, null)) push(norm);

  return out;
}

export function isFormInteresseEmpty(raw) {
  return extractFormInteresseNorms(raw).length === 0;
}
