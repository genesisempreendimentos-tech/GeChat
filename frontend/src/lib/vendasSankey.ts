import type { VendasFluxoCrosstab, VendasTotais } from '@/types/vendas';

const VENDAS_PERDIDAS_SITUACOES = new Set(['Distrato', 'Cancelada']);
const RESERVAS_PERDIDAS_SITUACOES = new Set(['Vencida', 'Cancelada']);

const COLORS = {
  root: '#64748b',
  andamento: '#94a3b8',
  reservasPerdidas: '#f59e0b',
  efetuadas: '#0d9488',
  vendasPerdidas: '#f97316',
  vendasAprovadas: '#0f766e',
  andamentoLeaves: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#64748b'],
  reservaPerdidaLeaves: ['#fbbf24', '#fb7185', '#f97316', '#f59e0b'],
  vendaPerdidaLeaves: ['#f59e0b', '#fb7185', '#f97316'],
  aprovadaLeaves: ['#0d9488', '#2dd4bf', '#5eead4', '#99f6e4', '#64748b'],
} as const;

export type SankeyLeafBucket = 'andamento' | 'reserva_perdida' | 'venda_perdida' | 'aprovada';

export type VendasSankeyNode = {
  id: string;
  name: string;
  fill: string;
  category: string;
  depth: number;
  infoTooltip?: string;
  situacaoReal?: string;
  isLeaf?: boolean;
};

export type VendasSankeyLink = {
  source: number;
  target: number;
  value: number;
  fill: string;
  sourceName: string;
  targetName: string;
};

export type VendasSankeyData = {
  nodes: VendasSankeyNode[];
  links: VendasSankeyLink[];
  total: number;
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase();
}

export function getSankeyLeafMeta(situacao: string, bucket: SankeyLeafBucket): {
  label: string;
  infoTooltip: string;
} {
  const cv = situacao.trim();

  if (bucket === 'aprovada' && cv === 'Vendida') {
    return { label: 'Venda Consolidada', infoTooltip: 'No CV/Sienge: Vendida' };
  }
  if (bucket === 'reserva_perdida' && cv === 'Vencida') {
    return { label: 'Reserva Vencida', infoTooltip: 'No CV: Vencida' };
  }
  if (bucket === 'reserva_perdida' && cv === 'Cancelada') {
    return { label: 'Reserva Cancelada', infoTooltip: 'No CV: Cancelada, sem venda' };
  }
  if (bucket === 'venda_perdida' && cv === 'Cancelada') {
    return { label: 'Cancelada Pós-Venda', infoTooltip: 'No CV: Cancelada, após venda' };
  }
  if (bucket === 'aprovada' && cv === 'Contrato de Compra e Venda Gerado') {
    return { label: 'Contrato Gerado', infoTooltip: 'No CV: Contrato de Compra e Venda Gerado' };
  }

  return { label: cv, infoTooltip: `No CV: ${cv}` };
}

function leafColor(bucket: SankeyLeafBucket, index: number): string {
  const palettes = {
    andamento: COLORS.andamentoLeaves,
    reserva_perdida: COLORS.reservaPerdidaLeaves,
    venda_perdida: COLORS.vendaPerdidaLeaves,
    aprovada: COLORS.aprovadaLeaves,
  };
  return palettes[bucket][index % palettes[bucket].length];
}

function leafDepth(bucket: SankeyLeafBucket, depthOffset = 0): number {
  const base = bucket === 'venda_perdida' || bucket === 'aprovada' ? 3 : 2;
  return base + depthOffset;
}

type ArvoreMetrics = {
  reservas_andamento: number;
  reservas_perdidas: number;
  vendas_efetuadas: number;
  vendas_perdidas: number;
  vendas_ativas: number;
};

function appendReservaArvore(
  b: SankeyBuilder,
  parentId: string,
  depthOffset: number,
  metrics: ArvoreMetrics,
  rows: VendasFluxoCrosstab['por_situacao'],
) {
  const d1 = 1 + depthOffset;
  const d2 = 2 + depthOffset;
  const leafOff = depthOffset;

  b.addNode('andamento', 'Reservas em Andamento', COLORS.andamento, 'andamento', d1);
  b.addNode('reservas_perdidas', 'Reservas Perdidas', COLORS.reservasPerdidas, 'reservas_perdidas', d1);
  b.addNode('efetuadas', 'Vendas Efetuadas', COLORS.efetuadas, 'efetuadas', d1);

  b.addLink(parentId, 'andamento', metrics.reservas_andamento);
  b.addLink(parentId, 'reservas_perdidas', metrics.reservas_perdidas);
  b.addLink(parentId, 'efetuadas', metrics.vendas_efetuadas);

  b.addLeaves(
    'andamento',
    'andamento',
    collectLeaves(rows, (row) => {
      const s = row.situacao?.trim() ?? '';
      if (row.sem_venda <= 0 || RESERVAS_PERDIDAS_SITUACOES.has(s)) return 0;
      return row.sem_venda;
    }),
    leafOff,
  );

  b.addLeaves(
    'reservas_perdidas',
    'reserva_perdida',
    collectLeaves(rows, (row) => {
      const s = row.situacao?.trim() ?? '';
      if (row.sem_venda <= 0 || !RESERVAS_PERDIDAS_SITUACOES.has(s)) return 0;
      return row.sem_venda;
    }),
    leafOff,
  );

  b.addNode('vendas_perdidas', 'Vendas Perdidas', COLORS.vendasPerdidas, 'vendas_perdidas', d2);
  b.addNode('vendas_aprovadas', 'Vendas Aprovadas', COLORS.vendasAprovadas, 'vendas_aprovadas', d2);

  b.addLink('efetuadas', 'vendas_perdidas', metrics.vendas_perdidas);
  b.addLink('efetuadas', 'vendas_aprovadas', metrics.vendas_ativas);

  b.addLeaves(
    'vendas_perdidas',
    'venda_perdida',
    collectLeaves(rows, (row) => {
      const s = row.situacao?.trim() ?? '';
      if (row.com_venda <= 0 || !VENDAS_PERDIDAS_SITUACOES.has(s)) return 0;
      return row.com_venda;
    }),
    leafOff,
  );

  b.addLeaves(
    'vendas_aprovadas',
    'aprovada',
    collectLeaves(rows, (row) => {
      const s = row.situacao?.trim() ?? '';
      if (row.com_venda <= 0 || VENDAS_PERDIDAS_SITUACOES.has(s)) return 0;
      return row.com_venda;
    }),
    leafOff,
  );
}

class SankeyBuilder {
  private nodes: VendasSankeyNode[] = [];
  private links: VendasSankeyLink[] = [];
  private indexById = new Map<string, number>();

  addNode(
    id: string,
    name: string,
    fill: string,
    category: string,
    depth: number,
    meta?: Pick<VendasSankeyNode, 'infoTooltip' | 'situacaoReal' | 'isLeaf'>,
  ): number {
    const existing = this.indexById.get(id);
    if (existing != null) return existing;
    const index = this.nodes.length;
    this.indexById.set(id, index);
    this.nodes.push({ id, name, fill, category, depth, ...meta });
    return index;
  }

  addLink(sourceId: string, targetId: string, value: number) {
    if (value <= 0) return;
    const source = this.indexById.get(sourceId);
    const target = this.indexById.get(targetId);
    if (source == null || target == null) return;
    this.links.push({
      source,
      target,
      value,
      fill: this.nodes[source].fill,
      sourceName: this.nodes[source].name,
      targetName: this.nodes[target].name,
    });
  }

  addLeaves(
    parentId: string,
    bucket: SankeyLeafBucket,
    leaves: { situacao: string; value: number }[],
    depthOffset = 0,
  ) {
    const sorted = [...leaves].filter((l) => l.value > 0).sort((a, b) => b.value - a.value);
    sorted.forEach((leaf, i) => {
      const { label, infoTooltip } = getSankeyLeafMeta(leaf.situacao, bucket);
      const id = `${parentId}_folha_${slugify(leaf.situacao)}`;
      this.addNode(id, label, leafColor(bucket, i), `folha_${bucket}`, leafDepth(bucket, depthOffset), {
        infoTooltip,
        situacaoReal: leaf.situacao,
        isLeaf: true,
      });
      this.addLink(parentId, id, leaf.value);
    });
  }

  build(): Omit<VendasSankeyData, 'total'> {
    return { nodes: this.nodes, links: this.links };
  }
}

function collectLeaves(
  rows: VendasFluxoCrosstab['por_situacao'],
  pickValue: (row: { situacao: string; com_venda: number; sem_venda: number }) => number,
): { situacao: string; value: number }[] {
  const leaves: { situacao: string; value: number }[] = [];
  for (const row of rows) {
    const situacao = row.situacao?.trim() ?? '';
    if (!situacao) continue;
    const value = pickValue(row);
    if (value > 0) leaves.push({ situacao, value });
  }
  return leaves;
}

export function buildVendasSankeyData(
  totais: VendasTotais,
  fluxo: VendasFluxoCrosstab | null | undefined,
): VendasSankeyData | null {
  const rows = fluxo?.por_situacao ?? [];
  const total = totais.reservas_totais;
  if (total <= 0) return null;

  const b = new SankeyBuilder();

  b.addNode('totais', 'Reservas Totais', COLORS.root, 'root', 0);
  appendReservaArvore(
    b,
    'totais',
    0,
    {
      reservas_andamento: totais.reservas_andamento,
      reservas_perdidas: totais.reservas_perdidas,
      vendas_efetuadas: totais.vendas_efetuadas,
      vendas_perdidas: totais.vendas_perdidas,
      vendas_ativas: totais.vendas_ativas,
    },
    rows,
  );

  const data = b.build();
  return { ...data, total };
}
