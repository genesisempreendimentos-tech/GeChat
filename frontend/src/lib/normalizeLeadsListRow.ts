import { getLeadDisplayId } from '@/lib/leadDisplayId';
import type { LeadsListRow, LeadsQualificacaoStatus } from '@/types/leadsList';

const QUALIFICACOES = new Set<LeadsQualificacaoStatus>([
  'Indefinida',
  'N/A',
  'Baixa',
  'Média',
  'Alta',
]);

function strOrNull(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

function str(value: unknown, fallback = ''): string {
  return strOrNull(value) ?? fallback;
}

function parseQualificacao(value: unknown): LeadsQualificacaoStatus {
  const q = String(value ?? '').trim() as LeadsQualificacaoStatus;
  return QUALIFICACOES.has(q) ? q : 'Indefinida';
}

/** Normaliza payload novo ou legado de /api/leads/list. */
export function normalizeLeadsListRow(raw: Record<string, unknown>): LeadsListRow {
  const personId = String(raw.person_id ?? raw.id ?? '');
  const codigo = strOrNull(raw.codigo);
  const idAmigavel = strOrNull(raw.id_amigavel) ?? getLeadDisplayId({ id: personId, codigo });

  const contato = strOrNull(raw.contato);
  const email = strOrNull(raw.email) ?? (contato?.includes('@') ? contato : null);
  const telefone = strOrNull(raw.telefone) ?? (contato && !contato.includes('@') ? contato : null);

  const canalBucket = str(raw.canal_bucket ?? raw.canal, 'Outros');
  const canalRaw = str(raw.canal_raw ?? raw.origem ?? raw.canal, canalBucket);

  const cvcrmLeadId = strOrNull(raw.cvcrm_lead_id);

  const createdAt = str(raw.created_at ?? raw.entrada, new Date(0).toISOString());

  return {
    person_id: personId,
    id_amigavel: idAmigavel,
    codigo,
    nome: str(raw.nome, 'Sem nome'),
    email,
    telefone,
    empreendimento_interesse: strOrNull(raw.empreendimento_interesse ?? raw.empreendimento),
    canal_bucket: canalBucket,
    canal_raw: canalRaw,
    parameter: strOrNull(raw.parameter ?? raw.parametro),
    cvcrm_lead_id: cvcrmLeadId,
    status_qualificacao: parseQualificacao(raw.status_qualificacao),
    birth_date: strOrNull(raw.birth_date ?? raw.data_nascimento),
    relacionamento: strOrNull(raw.relacionamento),
    investimento: strOrNull(raw.investimento),
    cidade: strOrNull(raw.cidade ?? raw.cidade_residencia),
    perfil_tipo: strOrNull(raw.perfil_tipo ?? raw.perfil_lead),
    children_status: strOrNull(raw.children_status),
    observacoes: strOrNull(raw.observacoes ?? raw.perfil_outras ?? raw.children_status),
    responsavel: strOrNull(raw.responsavel),
    created_at: createdAt,
  };
}

export function normalizeLeadsListResponse(payload: {
  rows?: unknown[];
  total?: number;
  page?: number;
  pageSize?: number;
}): { rows: LeadsListRow[]; total: number; page: number; pageSize: number } {
  return {
    rows: (payload.rows ?? []).map((row) =>
      normalizeLeadsListRow((row ?? {}) as Record<string, unknown>),
    ),
    total: Number(payload.total ?? 0),
    page: Number(payload.page ?? 1),
    pageSize: Number(payload.pageSize ?? 25),
  };
}
