import type { LeadRow } from '@/lib/leadRow';
import { computeLeadQualificacao } from '@/rules/qualifyLead';
import type { Lead } from '@/types/lead';

export function mapLeadToRow(lead: Lead): LeadRow {
  const email = (lead.email ?? '').trim();
  const phone = (lead.phone ?? '').trim();
  const base = {
    id: lead.id,
    dataHora: lead.dataHora || lead.createdAt,
    nome: lead.nome || lead.name,
    contato: lead.contato || email || phone || '',
    pagina: lead.pagina ?? '',
    origem: lead.origem || lead.source || '',
    canal: lead.canal || lead.campaign || '',
    email,
    telefone: phone,
    relacionamento: (lead.relacionamento ?? '') as LeadRow['relacionamento'],
    investimento: (lead.investimento ?? '') as LeadRow['investimento'],
    cidadeResidencia: lead.cidadeResidencia ?? '',
    dataNascimento: lead.dataNascimento ?? '',
    perfilLead: (lead.perfilLead ?? '') as LeadRow['perfilLead'],
    perfilOutrasRespostas: lead.perfilOutrasRespostas ?? '',
    dispositivo: lead.dispositivo ?? '',
    pagamentoPreferencia: lead.pagamentoPreferencia ?? '',
    empreendimento: lead.empreendimento ?? '',
    responsavel: lead.responsavel ?? '',
    parametro: lead.parametro ?? '',
    status: lead.status,
    cvcrmLeadId: (lead as Lead & { cvcrmLeadId?: string | null }).cvcrmLeadId ?? null,
    cvcrmSyncStatus:
      (lead as Lead & { cvcrmSyncStatus?: string }).cvcrmSyncStatus ?? 'pending',
    cvcrm_is_sold: lead.cvcrm_is_sold === true,
    _table: lead._table ?? '',
  };

  return {
    ...base,
    qualificacao: computeLeadQualificacao(base),
  };
}
