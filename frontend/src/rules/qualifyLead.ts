export type LeadQualificacao = 'Indefinida' | 'N/A' | 'Baixa' | 'Média' | 'Alta';

type LeadLike = {
  email?: string;
  telefone?: string;
  contato?: string;
  relacionamento?: string;
  investimento?: string;
  cidadeResidencia?: string;
  dataNascimento?: string;
  perfilLead?: string;
};

export function leadRespondeuFormularioPerfil(row: LeadLike): boolean {
  return Boolean(
    row.relacionamento?.trim() &&
      row.investimento?.trim() &&
      row.cidadeResidencia?.trim() &&
      row.dataNascimento?.trim() &&
      row.perfilLead?.trim(),
  );
}

export function parseIdadeAnosFromDataNascimentoPtBr(value: string): number | null {
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const md = now.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function computeLeadQualificacao(row: LeadLike): LeadQualificacao {
  const hasContact = Boolean(row.email?.trim() || row.telefone?.trim() || row.contato?.trim());
  if (!hasContact) return 'N/A';

  if (!leadRespondeuFormularioPerfil(row)) return 'Indefinida';

  const inv = row.investimento?.trim() ?? '';
  if (inv === 'Acima de R$3500') return 'Alta';
  if (inv === 'Entre R$2501 e R$3500') return 'Média';
  if (inv === 'Entre R$1701 e R$2500') return 'Média';
  if (inv === 'Entre R$1000 e R$1700') return 'Baixa';
  return 'Indefinida';
}
