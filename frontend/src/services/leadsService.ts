import { MOCK_LEADS, computeLeadStats } from '@/mock/leadsData';
import type { Lead, LeadStats, LeadStatus } from '@/types/lead';

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const leadsService = {
  async list(status?: LeadStatus) {
    let data = [...MOCK_LEADS].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (status) data = data.filter((l) => l.status === status);
    return delay({ data, error: null as string | null });
  },

  async getStats() {
    const stats: LeadStats = computeLeadStats(MOCK_LEADS);
    return delay({ data: stats, error: null as string | null });
  },

  async getById(id: string) {
    const lead = MOCK_LEADS.find((l) => l.id === id) ?? null;
    return delay({ data: lead, error: lead ? null : 'Lead não encontrado.' });
  },
};
