const LEAD_STATUSES = ['novo', 'contato', 'qualificado', 'negociacao', 'ganho', 'perdido'];

const MOCK_LEADS = [
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
    notes: 'Interessada em plano anual.',
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
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
    notes: null,
    assignedTo: null,
    createdBy: 'mock-user',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export async function listLeads(_supabaseUrl, _supabaseAnonKey, _accessToken, filters = {}) {
  let data = [...MOCK_LEADS].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  if (filters.status) data = data.filter((l) => l.status === filters.status);
  return data;
}

export async function getLeadStats() {
  const leads = await listLeads();
  const byStatus = LEAD_STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newToday = leads.filter((l) => new Date(l.createdAt) >= today).length;
  return { total: leads.length, byStatus, newToday };
}

export async function getLeadById(_supabaseUrl, _supabaseAnonKey, _accessToken, leadId) {
  return MOCK_LEADS.find((l) => l.id === leadId) ?? null;
}

export { LEAD_STATUSES };
