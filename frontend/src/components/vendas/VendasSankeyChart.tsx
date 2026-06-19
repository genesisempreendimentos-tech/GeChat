import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Info, Layers, Megaphone } from 'lucide-react';
import type { VendasFluxoCrosstab, VendasTotais } from '@/types/vendas';
import { buildVendasSankeyData } from '@/lib/vendasSankey';
import { layoutVendasSankey } from '@/lib/vendasSankeyLayout';
import type { LayoutSankeyLink, LayoutSankeyNode } from '@/lib/vendasSankeyLayout';
import { formatVendasCount, formatVendasPercent } from '@/lib/vendasFormat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { INFOBOX_TOOLTIP_CONTENT_CLASS } from '@/components/ui/infoboxes';
import { TabButton, type TabButtonItem } from '@/components/ui/tab-buttons';
import { useThemeStore } from '@/store/themeStore';

type SankeyFonteFilter = 'total' | 'marketing' | 'externo';

const SANKEY_FONTE_TAB_ITEMS: ReadonlyArray<TabButtonItem<SankeyFonteFilter>> = [
  { value: 'total', label: 'Total', Icon: Layers },
  { value: 'marketing', label: 'Marketing', Icon: Megaphone },
  { value: 'externo', label: 'Externo', Icon: Globe },
];

type VendasSankeyChartProps = {
  totais: VendasTotais | null;
  fluxoCrosstab: VendasFluxoCrosstab | null;
  loading?: boolean;
};

type HoverTip = {
  x: number;
  y: number;
  source: string;
  target: string;
  value: number;
};

function linkPath(link: LayoutSankeyLink): string {
  const midX = (link.sourceX + link.targetX) / 2;
  return `M${link.sourceX},${link.sourceY} C${midX},${link.sourceY} ${midX},${link.targetY} ${link.targetX},${link.targetY}`;
}

function LeafInfoButton({ label, infoTooltip }: { label: string; infoTooltip: string }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Status no CV: ${label}`}
        >
          <Info className="size-3" strokeWidth={2.25} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={6}
        collisionPadding={16}
        className={INFOBOX_TOOLTIP_CONTENT_CLASS}
      >
        {infoTooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function SankeyNodeLabel({ node }: { node: LayoutSankeyNode }) {
  const label = `${node.name} · ${formatVendasCount(node.value)}`;

  return (
    <div
      className="absolute z-10 flex -translate-y-1/2 items-center gap-1"
      style={{ left: node.x + node.width + 8, top: node.y + node.height / 2 }}
    >
      <span className="whitespace-nowrap text-[10px] font-medium text-foreground md:text-[11px]">
        {label}
      </span>
      {node.isLeaf && node.infoTooltip ? (
        <LeafInfoButton label={node.name} infoTooltip={node.infoTooltip} />
      ) : null}
    </div>
  );
}

function SankeyHoverTooltip({
  tip,
  total,
  isDark,
}: {
  tip: HoverTip;
  total: number;
  isDark: boolean;
}) {
  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] rounded-lg border px-3 py-2 text-xs shadow-md"
      style={{
        left: tip.x + 14,
        top: tip.y + 14,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        color: isDark ? '#f3f4f6' : '#111827',
      }}
    >
      <p className="font-medium">
        {tip.source} → {tip.target}
      </p>
      <p className="mt-1 tabular-nums">
        {formatVendasCount(tip.value)}{' '}
        <span className="opacity-70">({formatVendasPercent(tip.value, total)} do total)</span>
      </p>
    </div>,
    document.body,
  );
}

export function VendasSankeyChart({ totais, fluxoCrosstab, loading }: VendasSankeyChartProps) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || theme === 'full-dark';
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [fonteFilter, setFonteFilter] = useState<SankeyFonteFilter>('total');
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 960, height: 520 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 720);
      setSize({ width: w, height: 520 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sankeyData = useMemo(() => {
    if (!totais) return null;
    return buildVendasSankeyData(totais, fluxoCrosstab);
  }, [totais, fluxoCrosstab]);

  const layout = useMemo(() => {
    if (!sankeyData) return null;
    return layoutVendasSankey(sankeyData, size.width, size.height);
  }, [sankeyData, size.width, size.height]);

  const onLinkHover = useCallback(
    (link: LayoutSankeyLink, index: number, e: React.MouseEvent, active: boolean) => {
      if (!active) {
        setHoveredLink(null);
        setHoverTip(null);
        return;
      }
      setHoveredLink(index);
      setHoverTip({
        x: e.clientX,
        y: e.clientY,
        source: link.sourceName,
        target: link.targetName,
        value: link.value,
      });
    },
    [],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Fluxo de reservas</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Quatro níveis: total → ramo → balde → status real do CV. Use ℹ️ nas folhas para ver o
            nome original.
          </p>
        </div>
        <TabButton value={fonteFilter} items={SANKEY_FONTE_TAB_ITEMS} onChange={setFonteFilter} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[520px] w-full rounded-xl" />
        ) : !layout ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem reservas para montar o fluxo.
          </p>
        ) : (
          <div ref={containerRef} className="relative -mx-1 min-h-[520px] w-full overflow-x-auto">
            <div className="relative min-w-[720px]" style={{ width: layout.width, height: layout.height }}>
              <svg
                width={layout.width}
                height={layout.height}
                className="block"
                aria-label="Fluxo de reservas"
              >
                {layout.links.map((link, i) => (
                  <path
                    key={`link-${i}`}
                    d={linkPath(link)}
                    fill="none"
                    stroke={link.fill}
                    strokeWidth={link.linkWidth}
                    strokeOpacity={hoveredLink === i ? 0.7 : 0.28}
                    className="transition-[stroke-opacity] duration-150"
                    onMouseEnter={(e) => onLinkHover(link, i, e, true)}
                    onMouseMove={(e) => onLinkHover(link, i, e, true)}
                    onMouseLeave={(e) => onLinkHover(link, i, e, false)}
                  />
                ))}
                {layout.nodes.map((node) => (
                  <rect
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    fill={node.fill}
                    rx={2}
                  />
                ))}
              </svg>
              {layout.nodes.map((node) => (
                <SankeyNodeLabel key={`label-${node.id}`} node={node} />
              ))}
            </div>
          </div>
        )}
        {hoverTip && layout ? (
          <SankeyHoverTooltip tip={hoverTip} total={layout.total} isDark={isDark} />
        ) : null}
      </CardContent>
    </Card>
  );
}
