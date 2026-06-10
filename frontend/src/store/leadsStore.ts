import { create } from 'zustand';
import type { LeadRow } from '@/lib/leadRow';
import { isIgnoredLeadRow } from '@/lib/ignoredLeadSources';
import { mapLeadToRow } from '@/lib/mapLeadToRow';
import type { Lead } from '@/types/lead';
import { leadsService } from '@/services/leadsService';

/**
 * Cache global de leads: carrega uma vez por sessão e compartilha entre as
 * páginas (Dashboard, Análise, Leads, Relatórios). Navegar não recarrega.
 *
 * O progresso é fiel: mede os bytes realmente baixados da resposta contra o
 * Content-Length (ou contra o tamanho da última carga, salvo em localStorage,
 * quando o servidor não informa o total).
 */

const LAST_PAYLOAD_BYTES_KEY = 'geleads_leads_payload_bytes';

function readLastPayloadBytes(): number {
  try {
    return Number(localStorage.getItem(LAST_PAYLOAD_BYTES_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveLastPayloadBytes(bytes: number) {
  try {
    localStorage.setItem(LAST_PAYLOAD_BYTES_KEY, String(bytes));
  } catch {
    /* noop */
  }
}

interface LeadsState {
  rows: LeadRow[];
  /** true depois da primeira carga bem-sucedida da sessão. */
  loaded: boolean;
  loading: boolean;
  /** 0–100, proporcional aos bytes baixados. */
  progress: number;
  syncing: boolean;
  error: string | null;
  fetchLeads: (opts?: { force?: boolean }) => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useLeadsStore = create<LeadsState>((set, get) => ({
  rows: [],
  loaded: false,
  loading: false,
  progress: 0,
  syncing: false,
  error: null,

  fetchLeads: async ({ force = false } = {}) => {
    if (get().loaded && !force) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      set({ loading: true, progress: 0, error: null });
      try {
        const response = await fetch('/api/leads', { credentials: 'include' });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}) as { error?: string });
          throw new Error(payload?.error ?? 'Erro ao carregar leads.');
        }

        const contentLength = Number(response.headers.get('content-length')) || 0;
        const expectedBytes = contentLength || readLastPayloadBytes();

        let text = '';
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let received = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.byteLength;
            text += decoder.decode(value, { stream: true });
            if (expectedBytes > 0) {
              // 99% no máximo durante o download; 100% só com os dados na tela.
              set({ progress: Math.min(99, Math.round((received / expectedBytes) * 100)) });
            }
          }
          text += decoder.decode();
          saveLastPayloadBytes(received);
        } else {
          text = await response.text();
        }

        const payload = JSON.parse(text) as { leads?: Lead[] };
        set({
          rows: (payload.leads ?? [])
            .map(mapLeadToRow)
            .filter((row) => !isIgnoredLeadRow(row)),
          loaded: true,
          progress: 100,
          error: null,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Erro ao carregar leads.',
          progress: 0,
        });
      } finally {
        set({ loading: false });
        inFlight = null;
      }
    })();

    return inFlight;
  },

  refreshFromDatabase: async () => {
    set({ syncing: true });
    const { error } = await leadsService.sync();
    set({ syncing: false });

    if (error) {
      set({ error: typeof error === 'string' ? error : 'Erro ao sincronizar leads.' });
      return;
    }

    await get().fetchLeads({ force: true });
  },
}));
