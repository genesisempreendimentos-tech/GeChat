import type { Lead, LeadActivity, LeadStats, LeadStatus } from '@/types/lead';

const STATUSES: LeadStatus[] = ['novo', 'contato', 'qualificado', 'negociacao', 'ganho', 'perdido'];

const SOURCES = ['linkedin', 'google_ads', 'indicacao', 'evento', 'direto', 'facebook_ads', 'webinar'] as const;

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio', 'Gabriela', 'Henrique', 'Isabela', 'Juliano',
  'Karina', 'Lucas', 'Marina', 'Nicolas', 'Olivia', 'Paulo', 'Renata', 'Samuel', 'Tatiana', 'Vitor',
];

const LAST_NAMES = [
  'Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Ferreira', 'Gomes', 'Henrique', 'Ibrahim', 'Junqueira',
  'Klein', 'Lima', 'Mendes', 'Nascimento', 'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Silva', 'Teixeira',
];

const COMPANIES = [
  'TechCorp Brasil', 'InovaTech', 'Startup XYZ', 'Grupo Sul', 'Agência Flux', 'RetailMax', 'ConsultPro',
  'Logística Express', 'Nova Era Digital', 'Prime Vendas', 'Atlas Comercial', 'Horizon Labs',
];

function daysAgo(n: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function todayMorning(): string {
  const d = new Date();
  d.setHours(9, 30, 0, 0);
  return d.toISOString();
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Gera leads sintéticos distribuídos nos últimos 90 dias para gráficos do dashboard. */
function generateDashboardLeadsExtension(): Lead[] {
  const out: Lead[] = [];
  let seq = 0;

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const dailyCount = 1 + (dayOffset % 4);
    for (let i = 0; i < dailyCount; i++) {
      seq += 1;
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const status = pick(STATUSES);
      const source = pick(SOURCES);
      const createdAt = daysAgo(dayOffset, 8 + (i * 3) % 10, (seq * 7) % 60);
      const gender = seq % 2 === 0 ? 'female' : 'male';

      out.push({
        id: `lead-gen-${String(seq).padStart(4, '0')}`,
        name: `${first} ${last}`,
        gender,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${seq}@exemplo.com`,
        phone: `(11) 9${String(8000 + seq).slice(-4)}-${String(1000 + seq).slice(-4)}`,
        company: pick(COMPANIES),
        source,
        campaign: source === 'indicacao' || source === 'direto' ? null : `Campanha ${2024 + (seq % 2)}`,
        status,
        notes: null,
        assignedTo: null,
        createdBy: 'mock-user',
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  return out;
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

/** Leads demo + série sintética de 90 dias para gráficos e planilha do dashboard. */
export const DASHBOARD_LEADS: Lead[] = [...MOCK_LEADS, ...generateDashboardLeadsExtension()];

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
