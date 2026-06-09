import type { Lead, LeadActivity, LeadStats, LeadStatus } from '@/types/lead';

const STATUSES: LeadStatus[] = ['novo', 'contato', 'qualificado', 'negociacao', 'ganho', 'perdido'];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function todayMorning(): string {
  const d = new Date();
  d.setHours(9, 30, 0, 0);
  return d.toISOString();
}

export const MOCK_LEADS: Lead[] = [
  {
    id: 'lead-001',
    name: 'Ana Paula Mendes',
    gender: 'female',
    email: 'ana.mendes@techcorp.com.br',
    phone: '(11) 98765-4321',
    company: 'TechCorp Brasil',
    source: 'linkedin',
    campaign: 'Q2 Enterprise',
    status: 'qualificado',
    notes: 'Interessada em plano anual. Reunião agendada para quinta.',
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: daysAgo(12),
    updatedAt: daysAgo(1),
  },
  {
    id: 'lead-002',
    name: 'Carlos Eduardo Silva',
    gender: 'male',
    email: 'carlos.silva@inovatech.com',
    phone: '(21) 99876-5432',
    company: 'InovaTech',
    source: 'google_ads',
    campaign: 'Campanha Performance',
    status: 'negociacao',
    notes: 'Aguardando aprovação do orçamento.',
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: daysAgo(8),
    updatedAt: daysAgo(2),
  },
  {
    id: 'lead-003',
    name: 'Mariana Costa',
    gender: 'female',
    email: 'mariana@startupxyz.io',
    phone: '(31) 97654-3210',
    company: 'Startup XYZ',
    source: 'indicacao',
    campaign: null,
    status: 'ganho',
    notes: 'Contrato assinado em março.',
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: daysAgo(45),
    updatedAt: daysAgo(30),
  },
  {
    id: 'lead-004',
    name: 'Roberto Almeida',
    gender: 'male',
    email: 'roberto.almeida@gruposul.com.br',
    phone: '(51) 99123-4567',
    company: 'Grupo Sul',
    source: 'evento',
    campaign: 'Feira Digital 2026',
    status: 'contato',
    notes: 'Primeiro contato realizado. Enviar material comercial.',
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(3),
  },
  {
    id: 'lead-005',
    name: 'Fernanda Lima',
    gender: 'female',
    email: 'fernanda.lima@agenciaflux.com',
    phone: '(41) 98888-7777',
    company: 'Agência Flux',
    source: 'direto',
    campaign: null,
    status: 'novo',
    notes: null,
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: todayMorning(),
    updatedAt: todayMorning(),
  },
  {
    id: 'lead-006',
    name: 'João Pedro Santos',
    gender: 'male',
    email: 'jp.santos@retailmax.com',
    phone: '(85) 97777-6666',
    company: 'RetailMax',
    source: 'facebook_ads',
    campaign: 'Campanha Varejo',
    status: 'perdido',
    notes: 'Optou por concorrente.',
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: daysAgo(20),
    updatedAt: daysAgo(15),
  },
  {
    id: 'lead-007',
    name: 'Luciana Ferreira',
    gender: 'female',
    email: 'luciana@consultpro.com.br',
    phone: '(62) 96666-5555',
    company: 'ConsultPro',
    source: 'webinar',
    campaign: 'Webinar CRM',
    status: 'novo',
    notes: 'Participou do webinar ontem.',
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: todayMorning(),
    updatedAt: todayMorning(),
  },
  {
    id: 'lead-008',
    name: 'Pedro Henrique Oliveira',
    gender: 'male',
    email: 'pedro.oliveira@logisticaexpress.com',
    phone: '(19) 95555-4444',
    company: 'Logística Express',
    source: 'linkedin',
    campaign: 'Q2 Enterprise',
    status: 'qualificado',
    notes: 'Necessita integração com ERP.',
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
  },
];

export const MOCK_ACTIVITIES: LeadActivity[] = [
  {
    id: 'act-001',
    leadId: 'lead-001',
    userId: 'mock-user',
    type: 'nota',
    description: 'Lead qualificado após call de descoberta.',
    createdAt: daysAgo(1),
  },
  {
    id: 'act-002',
    leadId: 'lead-002',
    userId: 'mock-user',
    type: 'nota',
    description: 'Proposta enviada por e-mail.',
    createdAt: daysAgo(2),
  },
];

export function computeLeadStats(leads: Lead[]): LeadStats {
  const byStatus = STATUSES.reduce(
    (acc, s) => {
      acc[s] = leads.filter((l) => l.status === s).length;
      return acc;
    },
    {} as Record<LeadStatus, number>,
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newToday = leads.filter((l) => new Date(l.createdAt) >= today).length;
  return { total: leads.length, byStatus, newToday };
}
