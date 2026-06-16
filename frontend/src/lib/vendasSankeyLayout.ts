import type { VendasSankeyData, VendasSankeyLink, VendasSankeyNode } from '@/lib/vendasSankey';

export type LayoutSankeyNode = VendasSankeyNode & {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
};

export type LayoutSankeyLink = VendasSankeyLink & {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  linkWidth: number;
};

export type LayoutSankeyData = {
  nodes: LayoutSankeyNode[];
  links: LayoutSankeyLink[];
  total: number;
  width: number;
  height: number;
};

function computeNodeValues(nodeCount: number, links: VendasSankeyLink[]): number[] {
  const values = Array.from({ length: nodeCount }, () => 0);
  for (let i = 0; i < nodeCount; i++) {
    const inflow = links.filter((l) => l.target === i).reduce((s, l) => s + l.value, 0);
    const outflow = links.filter((l) => l.source === i).reduce((s, l) => s + l.value, 0);
    values[i] = Math.max(inflow, outflow);
  }
  return values;
}

/** Layout em 4 colunas fixas (depth 0–3) para preservar a hierarquia completa. */
export function layoutVendasSankey(
  data: VendasSankeyData,
  width: number,
  height: number,
): LayoutSankeyData {
  const margin = { top: 16, right: 200, bottom: 16, left: 12 };
  const nodeWidth = 16;
  const nodePadding = 14;
  const minNodeHeight = 3;
  const maxDepth = 3;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const colStep = maxDepth > 0 ? innerW / maxDepth : innerW;
  const values = computeNodeValues(data.nodes.length, data.links);

  const byDepth = new Map<number, number[]>();
  data.nodes.forEach((node, index) => {
    const list = byDepth.get(node.depth) ?? [];
    list.push(index);
    byDepth.set(node.depth, list);
  });

  const layoutNodes: LayoutSankeyNode[] = data.nodes.map((node, index) => ({
    ...node,
    index,
    value: values[index],
    x: margin.left + node.depth * colStep,
    y: 0,
    width: nodeWidth,
    height: 0,
  }));

  // Escala global única: o mesmo valor tem a mesma altura em QUALQUER nível.
  // Limitada pela coluna mais restritiva (mais padding acumulado para o seu total).
  let scale = Infinity;
  for (let depth = 0; depth <= maxDepth; depth++) {
    const indices = byDepth.get(depth) ?? [];
    if (!indices.length) continue;
    const colTotal = indices.reduce((s, i) => s + values[i], 0);
    if (colTotal <= 0) continue;
    const available = innerH - nodePadding * (indices.length - 1);
    scale = Math.min(scale, available / colTotal);
  }
  if (!Number.isFinite(scale) || scale <= 0) scale = 0;

  // Posiciona cada coluna com a escala global, centralizando verticalmente.
  for (let depth = 0; depth <= maxDepth; depth++) {
    const indices = byDepth.get(depth) ?? [];
    if (!indices.length) continue;

    const heights = indices.map((i) => Math.max(values[i] * scale, minNodeHeight));
    const colHeight =
      heights.reduce((s, h) => s + h, 0) + nodePadding * (indices.length - 1);
    let y = margin.top + Math.max(0, (innerH - colHeight) / 2);

    indices.forEach((index, k) => {
      const node = layoutNodes[index];
      node.y = y;
      node.height = heights[k];
      y += node.height + nodePadding;
    });
  }

  const sourceOffsets = new Map<number, number>();
  const targetOffsets = new Map<number, number>();

  const layoutLinks: LayoutSankeyLink[] = data.links.map((link) => {
    const source = layoutNodes[link.source];
    const target = layoutNodes[link.target];
    const linkWidth = link.value * scale;

    const sy = (sourceOffsets.get(link.source) ?? 0) + linkWidth / 2;
    sourceOffsets.set(link.source, (sourceOffsets.get(link.source) ?? 0) + linkWidth);

    const ty = (targetOffsets.get(link.target) ?? 0) + linkWidth / 2;
    targetOffsets.set(link.target, (targetOffsets.get(link.target) ?? 0) + linkWidth);

    const sourceX = source.x + source.width;
    const targetX = target.x;

    return {
      ...link,
      sourceX,
      sourceY: source.y + sy,
      targetX,
      targetY: target.y + ty,
      linkWidth: Math.max(linkWidth, 1),
    };
  });

  return {
    nodes: layoutNodes,
    links: layoutLinks,
    total: data.total,
    width,
    height,
  };
}
