import type { VendasDonutSlice } from '@/components/vendas/VendasDonutCard';
import { VendasDonutCard } from '@/components/vendas/VendasDonutCard';
import type { VendasDesdobramentoBalde, VendasTotais } from '@/types/vendas';
import {
  VENDAS_DESDOBRAMENTO_SECTIONS,
  VENDAS_DONUT_COLORS,
  type VendasDesdobramentoSectionId,
} from '@/lib/vendasDesdobramento';

type VendasRoscasSectionProps = {
  totais: VendasTotais | null;
  loading?: boolean;
};

type RoscaCardConfig = {
  section: VendasDesdobramentoSectionId;
  title: string;
  infoTooltip: string;
  centerLabel: string;
  slices: VendasDonutSlice[];
  countTotal: number;
  financialTotal: number;
  emptyMessage: string;
};

function sliceFromBalde(
  key: string,
  label: string,
  color: VendasDonutSlice['color'],
  balde: VendasDesdobramentoBalde,
  infoTooltip: string,
): VendasDonutSlice {
  return {
    key,
    label,
    color,
    countValue: balde.qtd,
    financialValue: balde.valor,
    countWithValue: balde.qtd_com_valor,
    infoTooltip,
  };
}

function buildDesdobramentoReservasSlices(totais: VendasTotais | null): VendasDonutSlice[] {
  const d = totais?.desdobramento?.reservas;
  const fallback = (qtd: number, valor: number): VendasDesdobramentoBalde => ({
    qtd,
    valor,
    qtd_com_valor: 0,
  });

  return [
    sliceFromBalde(
      'vendas_efetuadas',
      'Vendas efetuadas',
      VENDAS_DONUT_COLORS.green500,
      d?.vendas_efetuadas ??
        fallback(totais?.vendas_efetuadas ?? 0, totais?.valor_vendas_efetuadas ?? 0),
      'Reservas com data de venda preenchida — chegaram a fechar negócio no CV.',
    ),
    sliceFromBalde(
      'reservas_andamento',
      'Reservas em andamento',
      VENDAS_DONUT_COLORS.blue500,
      d?.reservas_andamento ??
        fallback(totais?.reservas_andamento ?? 0, totais?.valor_reservas_andamento ?? 0),
      'Ainda sem venda e fora das perdas explícitas — reservas em aberto que podem evoluir.',
    ),
    sliceFromBalde(
      'reservas_perdidas',
      'Reservas perdidas',
      VENDAS_DONUT_COLORS.pink500,
      d?.reservas_perdidas ??
        fallback(totais?.reservas_perdidas ?? 0, totais?.valor_reservas_perdidas ?? 0),
      'Nunca venderam — situação Vencida ou Cancelada antes da data de venda.',
    ),
  ];
}

function buildDesdobramentoVendasSlices(totais: VendasTotais | null): VendasDonutSlice[] {
  const d = totais?.desdobramento?.vendas;
  const dur = totais?.durabilidade;
  const fallback = (qtd: number, valor: number): VendasDesdobramentoBalde => ({
    qtd,
    valor,
    qtd_com_valor: 0,
  });

  return [
    sliceFromBalde(
      'consolidada',
      'Vendas consolidadas',
      VENDAS_DONUT_COLORS.teal600,
      d?.consolidadas ?? fallback(dur?.vendida ?? 0, dur?.valor_vendida ?? 0),
      'Status Vendida no CV — a venda foi efetuada e já está consolidada, sem pendências de trâmite pós-venda.',
    ),
    sliceFromBalde(
      'em_andamento',
      'Vendas em andamento',
      VENDAS_DONUT_COLORS.sky500,
      d?.em_andamento ??
        fallback(
          (dur?.contrato_gerado ?? 0) + (dur?.envio_sienge ?? 0),
          (dur?.valor_contrato_gerado ?? 0) + (dur?.valor_envio_sienge ?? 0),
        ),
      'Soma Contrato de Compra e Venda Gerado e Envio Sienge — já vendeu, mas ainda em trâmite pós-venda no CV.',
    ),
    sliceFromBalde(
      'revertida',
      'Vendas revertidas',
      VENDAS_DONUT_COLORS.red500,
      d?.revertidas ??
        fallback(
          (dur?.distrato ?? 0) + (dur?.cancelada ?? 0),
          (dur?.valor_distrato ?? 0) + (dur?.valor_cancelada ?? 0),
        ),
      'Soma Distrato e Cancelada após a venda — a venda foi efetuada e depois revertida no CV.',
    ),
  ];
}

function buildDesdobramentoPerdasSlices(totais: VendasTotais | null): VendasDonutSlice[] {
  const d = totais?.desdobramento?.perdas;
  const dur = totais?.durabilidade;
  const fallback = (qtd: number, valor: number): VendasDesdobramentoBalde => ({
    qtd,
    valor,
    qtd_com_valor: 0,
  });
  const vendasEmAndamentoQtd = (dur?.contrato_gerado ?? 0) + (dur?.envio_sienge ?? 0);
  const vendasEmAndamentoValor = (dur?.valor_contrato_gerado ?? 0) + (dur?.valor_envio_sienge ?? 0);

  return [
    sliceFromBalde(
      'vendas_revertidas',
      'Vendas revertidas',
      VENDAS_DONUT_COLORS.red600,
      d?.vendas_revertidas ??
        fallback(totais?.vendas_perdidas ?? 0, totais?.valor_vendas_perdidas ?? 0),
      'Vendeu e depois reverteu — Distrato ou Cancelada após a data de venda no CV.',
    ),
    sliceFromBalde(
      'ativos_em_andamento',
      'Ativos em andamento',
      VENDAS_DONUT_COLORS.cyan500,
      d?.ativos_em_andamento ??
        fallback(
          (totais?.reservas_andamento ?? 0) + vendasEmAndamentoQtd,
          (totais?.valor_reservas_andamento ?? 0) + vendasEmAndamentoValor,
        ),
      'Ainda em curso — reservas sem venda em aberto somadas às vendas efetuadas em trâmite (Contrato ou Envio Sienge).',
    ),
    sliceFromBalde(
      'reservas_perdidas',
      'Reservas perdidas',
      VENDAS_DONUT_COLORS.pink500,
      d?.reservas_perdidas ??
        fallback(totais?.reservas_perdidas ?? 0, totais?.valor_reservas_perdidas ?? 0),
      'Nunca chegou a vender — situação Vencida ou Cancelada antes da data de venda.',
    ),
  ];
}

function sumSliceCounts(slices: VendasDonutSlice[]): number {
  return slices.reduce((acc, slice) => acc + slice.countValue, 0);
}

function buildRoscaCards(totais: VendasTotais | null): RoscaCardConfig[] {
  const perdasSlices = buildDesdobramentoPerdasSlices(totais);
  const desd = totais?.desdobramento;

  return [
    {
      section: VENDAS_DESDOBRAMENTO_SECTIONS.RESERVAS,
      title: 'Desdobramento das reservas',
      infoTooltip:
        'Distribuição de toda a carteira de reservas: o que virou venda, o que ainda está em aberto e o que se perdeu antes de vender.',
      centerLabel: 'reservas totais',
      slices: buildDesdobramentoReservasSlices(totais),
      countTotal: totais?.reservas_totais ?? 0,
      financialTotal: desd?.reservas.valor_total ?? totais?.valor_reservas_totais ?? 0,
      emptyMessage: 'Sem reservas para desdobrar.',
    },
    {
      section: VENDAS_DESDOBRAMENTO_SECTIONS.VENDAS,
      title: 'Desdobramento das vendas',
      infoTooltip:
        'Situação atual no CV das vendas já efetuadas: consolidadas, em trâmite pós-venda ou revertidas após a venda.',
      centerLabel: 'vendas efetuadas',
      slices: buildDesdobramentoVendasSlices(totais),
      countTotal: totais?.vendas_efetuadas ?? 0,
      financialTotal: desd?.vendas.valor_total ?? totais?.valor_vendas_efetuadas ?? 0,
      emptyMessage: 'Sem vendas efetuadas para analisar.',
    },
    {
      section: VENDAS_DESDOBRAMENTO_SECTIONS.PERDAS,
      title: 'Desdobramento das perdas',
      infoTooltip:
        'Carteira fora da venda consolidada: reversões pós-venda, perdas na reserva e posições ainda em curso (vendas revertidas + reservas perdidas + ativos em andamento).',
      centerLabel: 'perdas totais',
      slices: perdasSlices,
      countTotal: sumSliceCounts(perdasSlices),
      financialTotal: desd?.perdas.valor_total ?? totais?.valor_perdas_totais ?? 0,
      emptyMessage: 'Sem perdas ou ativos em andamento neste recorte.',
    },
  ];
}

export function VendasRoscasSection({ totais, loading }: VendasRoscasSectionProps) {
  const cards = buildRoscaCards(totais);

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <VendasDonutCard
          key={card.section}
          title={card.title}
          infoTooltip={card.infoTooltip}
          centerLabel={card.centerLabel}
          slices={card.slices}
          countTotal={card.countTotal}
          financialTotal={card.financialTotal}
          loading={loading}
          emptyMessage={card.emptyMessage}
          showViewToggle
        />
      ))}
    </div>
  );
}
