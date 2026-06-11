import type { LeadRow } from '@/lib/leadRow';
import { resolveEmpreendimentoPagina } from '@/lib/leadEmpreendimento';
import { computeLeadQualificacao } from '@/rules/qualifyLead';
import type { Lead } from '@/types/lead';

export function mapLeadToRow(lead: Lead): LeadRow {
  const email = (lead.email ?? '').trim();
  const phone = (lead.phone ?? '').trim();
  const base = {
    id: lead.id,
    codigo: lead.codigo ?? null,
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
    status: lead.status ?? 'novo',
    cvcrm_lead_id: lead.cvcrm_lead_id ?? null,
    cvcrm_sync_status: lead.cvcrm_sync_status ?? 'pending',
    cvcrm_is_sold: lead.cvcrm_is_sold === true,
    cvcrm_status: lead.cvcrm_status ?? null,
    cvcrm_situation: lead.cvcrm_situation ?? null,
    cvcrm_stage: lead.cvcrm_stage ?? null,
    dataPrimeiroAtendimento: lead.dataPrimeiroAtendimento ?? null,
    dataVisitaAgendada: lead.dataVisitaAgendada ?? null,
    dataVisitaRealizada: lead.dataVisitaRealizada ?? null,
    dataAnaliseCreditoInicio: lead.dataAnaliseCreditoInicio ?? null,
    dataAnaliseCreditoFim: lead.dataAnaliseCreditoFim ?? null,
    dataProposta: lead.dataProposta ?? null,
    dataVenda: lead.dataVenda ?? null,
    dataPerdido: lead.dataPerdido ?? null,
    motivoPerda: lead.motivoPerda ?? null,
    _table: lead._table ?? '',
  };

  return {
    ...base,
    pagina: resolveEmpreendimentoPagina(base),
    qualificacao: computeLeadQualificacao(base),
  };
}
