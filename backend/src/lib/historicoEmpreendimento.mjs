import { normalizeEmpreendimento } from './normalizeEmpreendimento.mjs';
import {
  LABEL_A_CLASSIFICAR,
  LABEL_NAO_INFORMADO,
  resolveEmpreendimentoPartGenesis,
  resolveEmpreendimentoPart,
} from '../services/empreendimentoResolver.mjs';

export const HISTORICO_EMPREENDIMENTO_CLASSIFICAR = 'Classificar';

/** Normaliza empreendimento para exibição/filtro no histórico. */
export function resolveHistoricoEmpreendimentoNorm(raw) {
  const norm = normalizeEmpreendimento(raw);
  if (!norm) return HISTORICO_EMPREENDIMENTO_CLASSIFICAR;

  const genesis = resolveEmpreendimentoPartGenesis(norm);
  if (genesis) return genesis;

  const label = resolveEmpreendimentoPart(norm);
  if (label === LABEL_NAO_INFORMADO || label === LABEL_A_CLASSIFICAR) {
    return HISTORICO_EMPREENDIMENTO_CLASSIFICAR;
  }
  return label;
}

export function resolveHistoricoEmpreendimentoCru(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  return s || null;
}
