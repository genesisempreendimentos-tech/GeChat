import { useEffect, useImperativeHandle, useMemo, useState, forwardRef, type ReactNode } from 'react';
import { leadIrisVariantQualificacao } from '@/lib/leadQualificacaoIris';
import { AnimatePresence, motion } from 'framer-motion';
import { Iris, type IrisVariant } from '@/components/ui/Iris';
import {
  leadRespondeuFormularioPerfil,
  parseIdadeAnosFromDataNascimentoPtBr,
  type LeadQualificacao,
} from '@/rules/qualifyLead';
import type {
  LeadInvestimento,
  LeadPerfilTipo,
  LeadRelacionamento,
  LeadRow,
} from '@/lib/leadRow';
import { useLeadsData } from '@/hooks/useLeadsData';
import { LeadsLoadingProgress } from '@/components/LeadsLoadingProgress';
import { cn } from '@/lib/utils';
import { formatLeadDateTime, formatLeadDateCreated } from '@/lib/formatDateTime';
import { getLeadDisplayId, parseLeadSequentialNumber } from '@/lib/leadDisplayId';
import { formatLeadParametroDisplay } from '@/lib/leadParametro';
import { profileDataFillRatio } from '@/lib/motionPresets';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TabButtons } from '@/components/ui/tab-buttons';
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadDisplayIdBadge } from '@/components/leads/LeadDisplayIdBadge';
import { LeadParametroCell } from '@/components/leads/LeadParametroCell';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  ArrowDown,
  ArrowUp,
  Copy,
  User,
  MonitorCog,
  RefreshCw,
} from 'lucide-react';
import {
  LayoutGroup,
  MotionFlipListItem,
  MotionFlipNumber,
  MotionReveal,
} from '@/components/motion/AppMotion';
import { useAppMotion } from '@/hooks/useAppMotion';


/** Linhas por página nas tabelas das subabas Leads e Acessos. */
const LEADS_SUBTAB_TABLE_PAGE_SIZE = 50;
const PAGE_SIZE = LEADS_SUBTAB_TABLE_PAGE_SIZE;
const LEADS_PAGE_SIZE = LEADS_SUBTAB_TABLE_PAGE_SIZE;
const ACESSOS_PAGINA_PAGE_SIZE = LEADS_SUBTAB_TABLE_PAGE_SIZE;

/** Lead com questionário de perfil considerado completo — regra partilhada com `qualifyLead.ts`. */
function leadPerfilCompleto(row: LeadRow): boolean {
  return leadRespondeuFormularioPerfil(row);
}

type LeadsTableTab = 'detalhes' | 'perfil' | 'cvCrm';

type LeadsPaginaRow = {
  id: string;
  nome: string;
  leads: number;
  ultimoLeadIso: string;
  /** Percentual 0–100 (perfil completo / leads da página). */
  perfilPct: number;
  /** Percentual 0–100 (leads qualificados / leads da página). */
  qualificacaoPct: number;
};

type LeadsPaginaSortKey = 'nome' | 'leads' | 'ultimoLead' | 'perfilPct' | 'qualificacaoPct';

type LeadSortKey =
  | 'codigo'
  | 'dataHora'
  | 'nome'
  | 'email'
  | 'telefone'
  | 'origem'
  | 'canal'
  | 'parametro'
  | 'empreendimento'
  | 'cvcrm'
  | 'responsavel'
  | 'qualificacao'
  | 'relacionamento'
  | 'investimento'
  | 'cidadeResidencia'
  | 'dataNascimento'
  | 'perfilLead'
  | 'perfilOutrasRespostas';

function leadContatoIsForm(contato: string): boolean {
  return contato.includes('@');
}

const LEADS_TAB_BUTTON_ITEMS = [
  { value: 'detalhes' as const, label: 'Detalhes', Icon: FileText },
  { value: 'perfil' as const, label: 'Perfil', Icon: User },
  { value: 'cvCrm' as const, label: 'CV-CRM', Icon: MonitorCog },
];

const LEAD_MODAL_TAB_ORDER: Record<LeadsTableTab, number> = {
  detalhes: 0,
  perfil: 1,
  cvCrm: 2,
};

const leadsTabPanelVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 18 : dir < 0 ? -18 : 0,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -18 : dir < 0 ? 18 : 0,
  }),
};

const LEADS_PAGINAS_COLS: { key: LeadsPaginaSortKey; label: string }[] = [
  { key: 'leads', label: 'Leads' },
  { key: 'perfilPct', label: 'Perfil' },
  { key: 'qualificacaoPct', label: 'Qualificação' },
  { key: 'ultimoLead', label: 'Último lead' },
];

const LEADS_COL_DETALHES: { key: LeadSortKey; label: string }[] = [
  { key: 'codigo', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'qualificacao', label: 'Status' },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'canal', label: 'Canal' },
  { key: 'parametro', label: 'Parâmetro' },
  { key: 'empreendimento', label: 'Empreendimento' },
  { key: 'cvcrm', label: 'CVCRM' },
  { key: 'dataHora', label: 'Criado em' },
];

const LEADS_COL_PERFIL: { key: LeadSortKey; label: string }[] = [
  { key: 'codigo', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'relacionamento', label: 'Relacionamento' },
  { key: 'investimento', label: 'Investimento' },
  { key: 'cidadeResidencia', label: 'Cidade' },
  { key: 'dataNascimento', label: 'Idade' },
  { key: 'perfilLead', label: 'Perfil' },
];

const LEADS_COL_CVCRM: { key: LeadSortKey; label: string }[] = [
  { key: 'codigo', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'canal', label: 'Canal' },
  { key: 'origem', label: 'Origem' },
  { key: 'perfilOutrasRespostas', label: 'Observações' },
  { key: 'qualificacao', label: 'Status' },
  { key: 'dataHora', label: 'Criado em' },
];

const LEAD_QUALIFICACAO_ORDER: Record<LeadQualificacao, number> = {
  Indefinida: 0,
  'N/A': 1,
  Baixa: 2,
  Média: 3,
  Alta: 4,
};

const LEAD_RELACIONAMENTO_ORDER: Record<LeadRelacionamento, number> = {
  'Solteiro(a)': 0,
  Namorando: 1,
  'Noivo(a)': 2,
  'União estável / Casado(a)': 3,
};

const LEAD_INVESTIMENTO_ORDER: Record<LeadInvestimento, number> = {
  'Entre R$1000 e R$1700': 0,
  'Entre R$1701 e R$2500': 1,
  'Entre R$2501 e R$3500': 2,
  'Acima de R$3500': 3,
};

const LEAD_PERFIL_TIPO_ORDER: Record<LeadPerfilTipo, number> = {
  Morador: 0,
  Investidor: 1,
  Corretor: 2,
};

function LeadQualificacaoCell({ value }: { value: LeadQualificacao }) {
  return <Iris text={value} variant={leadIrisVariantQualificacao(value)} className="max-w-[12rem]" />;
}

function leadIrisVariantPerfilTipo(p: LeadPerfilTipo): IrisVariant {
  if (p === 'Morador') return 'iris6';
  if (p === 'Investidor') return 'iris11';
  return 'iris14';
}

function LeadPerfilTipoCell({ value }: { value: LeadPerfilTipo | '' }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={value} variant={leadIrisVariantPerfilTipo(value)} className="max-w-[10rem]" />;
}

/** Solteiro → vermelho; Namorando → amarelo; Casado / Noivo → verde. */
function leadIrisVariantRelacionamento(r: LeadRelacionamento): IrisVariant {
  switch (r) {
    case 'Solteiro(a)':
      return 'iris1';
    case 'Namorando':
      return 'iris4';
    case 'Noivo(a)':
    case 'União estável / Casado(a)':
      return 'iris6';
    default:
      return 'iris6';
  }
}

function LeadRelacionamentoCell({ value }: { value: LeadRelacionamento | '' }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={value} variant={leadIrisVariantRelacionamento(value)} className="max-w-[14rem]" />;
}

function leadIrisVariantInvestimento(i: LeadInvestimento): IrisVariant {
  switch (i) {
    case 'Entre R$1000 e R$1700':
      return 'iris1';
    case 'Entre R$1701 e R$2500':
      return 'iris2';
    case 'Entre R$2501 e R$3500':
      return 'iris4';
    case 'Acima de R$3500':
      return 'iris6';
    default:
      return 'iris6';
  }
}

function LeadInvestimentoCell({ value }: { value: LeadInvestimento | '' }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={value} variant={leadIrisVariantInvestimento(value)} className="max-w-[16rem]" />;
}

/** Cidade: neutro claro/escuro conforme o tema (IRIS). */
function LeadCidadeIrisCell({ cidade }: { cidade: string }) {
  const t = cidade.trim();
  if (!t) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={t} variant="iris23" className="max-w-[16rem]" />;
}

function leadIrisVariantIdadeAnos(age: number | null): IrisVariant {
  if (age == null || !Number.isFinite(age)) return 'iris21';
  if (age < 20) return 'iris1';
  if (age <= 30) return 'iris4';
  return 'iris6';
}

/** Idade (anos) a partir de `dd/mm/aaaa` para cor do IRIS na coluna Idade. */
function LeadIdadeIrisCell({ dataNascimento }: { dataNascimento: string }) {
  const t = dataNascimento.trim();
  if (!t) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const age = parseIdadeAnosFromDataNascimentoPtBr(t);
  const variant = leadIrisVariantIdadeAnos(age);
  return <Iris text={t} variant={variant} className="max-w-[10rem] tabular-nums" />;
}

function leadCampoVazio(valor: string): string {
  const t = valor.trim();
  return t.length > 0 ? t : '—';
}

function formatPct0to100(v: number): string {
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Gera bloco de código Markdown com limite de cercas para conteúdo arbitrário. */
function leadMdFence(body: string): string {
  const normalized = body.replace(/\r\n/g, '\n');
  let fence = '```';
  while (normalized.includes(fence)) {
    fence += '`';
  }
  return `${fence}\n${normalized}\n${fence}`;
}

/** Linha de lista com rótulo em negrito; valores multilinha viram bloco de código. */
function leadMdBullet(label: string, raw: string): string {
  const display = leadCampoVazio(raw);
  if (display.includes('\n')) {
    return `- **${label}:**\n\n${leadMdFence(display)}`;
  }
  return `- **${label}:** ${display}`;
}

/** Resumo completo do lead em Markdown (abas Detalhes + Perfil + CV-CRM). */
function leadResumoMarkdown(row: LeadRow): string {
  const capturado = formatLeadDateTime(row.dataHora);
  const codigo = getLeadDisplayId(row);
  const blocos: string[] = [
    '# Resumo do Lead',
    '',
    `> **${codigo}** · **${row.nome}** · capturado em ${capturado}`,
    '',
    '---',
    '',
    '## Detalhes',
    '',
    leadMdBullet('ID', codigo),
    leadMdBullet('Nome', row.nome),
    leadMdBullet('Status', row.qualificacao),
    leadMdBullet('E-mail', row.email),
    leadMdBullet('Telefone', row.telefone),
    leadMdBullet('Canal', row.canal),
    leadMdBullet('Parâmetro', formatLeadParametroDisplay(row.parametro)),
    leadMdBullet('Empreendimento', row.empreendimento),
    '',
    '---',
    '',
    '## Perfil',
    '',
    leadMdBullet('Relacionamento', row.relacionamento),
    leadMdBullet('Investimento', row.investimento),
    leadMdBullet('Cidade', row.cidadeResidencia),
    leadMdBullet('Idade', row.dataNascimento),
    leadMdBullet('Perfil', row.perfilLead),
    '',
    '---',
    '',
    '## CV-CRM',
    '',
    leadMdBullet('Observações', row.perfilOutrasRespostas),
    leadMdBullet('Preferência de pagamento', row.pagamentoPreferencia),
    leadMdBullet('Dispositivo', row.dispositivo),
    '',
  ];
  return blocos.join('\n');
}

function leadColMinWidthClass(key: LeadSortKey): string {
  if (key === 'codigo') return 'min-w-[5.5rem]';
  if (key === 'nome') return 'min-w-[140px]';
  if (key === 'email' || key === 'telefone') return 'min-w-[160px]';
  if (key === 'qualificacao') return 'min-w-[7.5rem]';
  if (key === 'empreendimento') return 'min-w-[10rem]';
  if (key === 'cvcrm') return 'min-w-[5rem]';
  if (key === 'parametro') return 'min-w-[10rem]';
  if (key === 'responsavel') return 'min-w-[9rem]';
  if (key === 'relacionamento') return 'min-w-[10rem]';
  if (key === 'investimento') return 'min-w-[11rem]';
  if (key === 'cidadeResidencia') return 'min-w-[120px]';
  if (key === 'dataNascimento') return 'min-w-[6.5rem]';
  if (key === 'perfilLead') return 'min-w-[6.5rem]';
  if (key === 'perfilOutrasRespostas') return 'min-w-[12rem]';
  if (key === 'dataHora') return 'min-w-[10.5rem]';
  return '';
}

function leadTdClassName(col: LeadSortKey): string {
  const base = 'px-4 py-3.5 align-top';
  if (col === 'codigo') return cn(base);
  if (col === 'dataHora')
    return cn(base, 'whitespace-nowrap text-xs tabular-nums text-muted-foreground/80');
  if (col === 'nome') return cn(base, 'font-medium');
  if (col === 'origem' || col === 'canal') return cn(base, 'text-xs');
  if (col === 'parametro') return cn(base, 'text-xs');
  if (col === 'email' || col === 'telefone') return cn(base, 'text-xs');
  if (col === 'empreendimento' || col === 'responsavel' || col === 'cvcrm') return cn(base, 'text-xs');
  if (col === 'qualificacao') return cn(base);
  if (col === 'relacionamento' || col === 'investimento' || col === 'perfilLead') return cn(base, 'text-xs');
  if (col === 'cidadeResidencia' || col === 'dataNascimento') return cn(base, 'text-xs');
  if (col === 'perfilOutrasRespostas')
    return cn(base, 'max-w-[18rem] text-xs text-muted-foreground line-clamp-2');
  return base;
}

function leadCellContent(row: LeadRow, col: LeadSortKey): ReactNode {
  switch (col) {
    case 'codigo':
      return <LeadDisplayIdBadge id={row.id} />;
    case 'dataHora':
      return formatLeadDateCreated(row.dataHora);
    case 'nome':
      return row.nome;
    case 'email':
      return leadCampoVazio(row.email);
    case 'telefone':
      return leadCampoVazio(row.telefone);
    case 'origem':
      return row.origem;
    case 'canal':
      return row.canal;
    case 'parametro':
      return <LeadParametroCell value={row.parametro} />;
    case 'empreendimento':
      return leadCampoVazio(row.empreendimento);
    case 'cvcrm': {
      const synced = row.cvcrm_sync_status === 'synced';
      const leadId = row.cvcrm_lead_id;
      return (
        <span
          className="inline-flex flex-col leading-tight"
          title={synced && leadId ? `cvcrm_lead_id: ${leadId}` : undefined}
        >
          <span>{synced ? 'Sim' : 'Não'}</span>
          {synced && leadId ? (
            <span className="text-[10px] text-muted-foreground tabular-nums">#{leadId}</span>
          ) : null}
        </span>
      );
    }
    case 'responsavel':
      return leadCampoVazio(row.responsavel);
    case 'qualificacao':
      return <LeadQualificacaoCell value={row.qualificacao} />;
    case 'relacionamento':
      return <LeadRelacionamentoCell value={row.relacionamento} />;
    case 'investimento':
      return <LeadInvestimentoCell value={row.investimento} />;
    case 'cidadeResidencia':
      return <LeadCidadeIrisCell cidade={row.cidadeResidencia} />;
    case 'dataNascimento':
      return <LeadIdadeIrisCell dataNascimento={row.dataNascimento} />;
    case 'perfilLead':
      return <LeadPerfilTipoCell value={row.perfilLead} />;
    case 'perfilOutrasRespostas':
      return leadCampoVazio(row.perfilOutrasRespostas);
  }
}

function leadsPaginaColMinWidth(key: LeadsPaginaSortKey): string {
  if (key === 'nome') return 'min-w-[100px]';
  if (key === 'ultimoLead') return 'min-w-[11rem]';
  return '';
}

function leadsPaginaTdClass(col: LeadsPaginaSortKey): string {
  const base = 'px-4 py-3.5 align-top';
  if (col === 'nome') return cn(base, 'font-medium');
  if (col === 'leads') return cn(base, 'tabular-nums');
  if (col === 'ultimoLead')
    return cn(base, 'whitespace-nowrap text-xs tabular-nums text-muted-foreground text-right');
  if (col === 'perfilPct' || col === 'qualificacaoPct') return cn(base, 'tabular-nums');
  return base;
}

function leadsPaginaCellContent(row: LeadsPaginaRow, col: LeadsPaginaSortKey): ReactNode {
  switch (col) {
    case 'nome':
      return row.nome;
    case 'leads':
      return <MotionFlipNumber value={row.leads.toLocaleString('pt-BR')} />;
    case 'ultimoLead':
      return formatLeadDateTime(row.ultimoLeadIso);
    case 'perfilPct':
      return <MotionFlipNumber value={formatPct0to100(row.perfilPct)} />;
    case 'qualificacaoPct':
      return <MotionFlipNumber value={formatPct0to100(row.qualificacaoPct)} />;
  }
}

function LeadModalCampo({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card/80 p-4 shadow-sm ring-1 ring-black/[0.03] dark:bg-card/50 dark:ring-white/[0.04]',
        className,
      )}
    >
      <p className="text-[11px] font-semibold leading-tight text-muted-foreground">{label}</p>
      <div className="mt-2 min-h-[1.25rem] text-sm leading-snug text-foreground">{children}</div>
    </div>
  );
}

function LeadModalDetalhesPanel({ row }: { row: LeadRow }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {LEADS_COL_DETALHES.map((col) => (
        <LeadModalCampo key={col.key} label={col.label}>
          <div className="text-xs sm:text-sm">{leadCellContent(row, col.key)}</div>
        </LeadModalCampo>
      ))}
    </div>
  );
}

function LeadModalPerfilPanel({ row }: { row: LeadRow }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {LEADS_COL_PERFIL.map((col) => (
        <LeadModalCampo key={col.key} label={col.label}>
          <div className="text-xs sm:text-sm">{leadCellContent(row, col.key)}</div>
        </LeadModalCampo>
      ))}
    </div>
  );
}

function LeadModalCvCrmPanel({ row }: { row: LeadRow }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {LEADS_COL_CVCRM.map((col) => (
        <LeadModalCampo
          key={col.key}
          label={col.label}
          className={col.key === 'perfilOutrasRespostas' ? 'col-span-2' : undefined}
        >
          <div className="text-xs sm:text-sm">{leadCellContent(row, col.key)}</div>
        </LeadModalCampo>
      ))}
    </div>
  );
}

function AnimatedTabPanel({
  viewKey,
  direction,
  children,
  className,
}: {
  viewKey: string;
  direction: number;
  children: ReactNode;
  className?: string;
}) {
  const motionCfg = useAppMotion();

  if (!motionCfg.enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={viewKey}
        custom={direction}
        layout
        className={className}
        variants={leadsTabPanelVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          opacity: motionCfg.pageTransition,
          x: motionCfg.pageTransition,
          layout: motionCfg.springSoft,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function LeadModalTabPanels({
  tab,
  row,
  direction,
}: {
  tab: LeadsTableTab;
  row: LeadRow;
  direction: number;
}) {
  const panel =
    tab === 'detalhes' ? (
      <LeadModalDetalhesPanel row={row} />
    ) : tab === 'perfil' ? (
      <LeadModalPerfilPanel row={row} />
    ) : (
      <LeadModalCvCrmPanel row={row} />
    );

  return (
    <AnimatedTabPanel viewKey={tab} direction={direction}>
      {panel}
    </AnimatedTabPanel>
  );
}

export function buildLeadsExportRows(rows: LeadRow[]) {
  return rows.map((row) => ({
    id: getLeadDisplayId(row),
    data_hora: formatLeadDateTime(row.dataHora),
    nome: row.nome,
    status: row.qualificacao,
    contato: row.contato,
    pagina: row.pagina,
    origem: row.origem,
    canal: row.canal,
    parametro: formatLeadParametroDisplay(row.parametro),
    empreendimento: row.empreendimento,
    responsavel: row.responsavel,
    email: row.email,
    telefone: row.telefone,
    relacionamento: row.relacionamento,
    investimento: row.investimento,
    cidade: row.cidadeResidencia,
    data_nascimento: row.dataNascimento,
    perfil: row.perfilLead,
    perfil_questionario_completo: leadPerfilCompleto(row) ? 'Sim' : 'Não',
    observacoes: row.perfilOutrasRespostas,
    dispositivo: row.dispositivo,
    pagamento_preferencia: row.pagamentoPreferencia,
  }));
}

export type LeadsExportRef = {
  getExportRows: () => ReturnType<typeof buildLeadsExportRows>;
};

export type LeadsOperacionalViewProps = Record<string, never>;

export const LeadsOperacionalView = forwardRef<LeadsExportRef, LeadsOperacionalViewProps>(
  function LeadsOperacionalView(_props, ref) {
  const {
    rows: allLeadsRows,
    loading: leadsLoading,
    progress: leadsProgress,
    syncing: leadsSyncing,
    error: leadsError,
    refreshFromDatabase,
  } = useLeadsData();

  const [leadsSortKey, setLeadsSortKey] = useState<LeadSortKey>('codigo');
  const [leadsSortDirection, setLeadsSortDirection] = useState<'asc' | 'desc'>('desc');
  const [leadsSearchQuery, setLeadsSearchQuery] = useState('');
  const [leadsPage, setLeadsPage] = useState(0);
  /** Lead cuja linha foi clicada — abre modal de resumo. */
  const [leadResumoSelecionado, setLeadResumoSelecionado] = useState<LeadRow | null>(null);
  /** Tela ativa dentro do modal de resumo (Perfil: questionário além da captura). */
  const [leadModalTela, setLeadModalTela] = useState<LeadsTableTab>('detalhes');
  /** Direção da troca de aba no modal (-1 = Perfil→Origem, 1 = Origem→Perfil). */
  const [leadModalTabDirection, setLeadModalTabDirection] = useState(0);
  const [leadsTableTab, setLeadsTableTab] = useState<LeadsTableTab>('detalhes');
  /** Direção da troca de visualização na tabela principal. */
  const [leadsTableViewDirection, setLeadsTableViewDirection] = useState(0);
  /** Abre em tabela; o usuário pode alternar para cards na sessão. */
  const [leadsViewMode, setLeadsViewMode] = useState<ViewMode>('table');

  const leadsTableColumns = useMemo(() => {
    if (leadsTableTab === 'detalhes') return LEADS_COL_DETALHES;
    if (leadsTableTab === 'perfil') return LEADS_COL_PERFIL;
    return LEADS_COL_CVCRM;
  }, [leadsTableTab]);

  const filteredLeadsRows = useMemo(() => {
    const q = leadsSearchQuery.trim().toLowerCase();
    if (!q) return allLeadsRows;
    return allLeadsRows.filter((row) =>
      [
        getLeadDisplayId(row),
        row.nome,
        row.contato,
        row.pagina,
        row.origem,
        row.canal,
        row.qualificacao,
        row.email,
        row.telefone,
        row.empreendimento,
        row.responsavel,
        row.parametro,
        row.relacionamento,
        row.investimento,
        row.perfilOutrasRespostas,
        row.perfilLead,
        row.dispositivo,
        row.cidadeResidencia,
        row.dataNascimento,
        row.pagamentoPreferencia,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [leadsSearchQuery, allLeadsRows]);

  const sortedLeadsRows = useMemo(() => {
    const sorted = [...filteredLeadsRows].sort((a, b) => {
      if (leadsSortKey === 'codigo') {
        return parseLeadSequentialNumber(a.id) - parseLeadSequentialNumber(b.id);
      }
      if (leadsSortKey === 'dataHora') {
        return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
      }
      if (leadsSortKey === 'qualificacao') {
        return LEAD_QUALIFICACAO_ORDER[a.qualificacao] - LEAD_QUALIFICACAO_ORDER[b.qualificacao];
      }
      if (leadsSortKey === 'relacionamento') {
        const ar = a.relacionamento ? LEAD_RELACIONAMENTO_ORDER[a.relacionamento] : -1;
        const br = b.relacionamento ? LEAD_RELACIONAMENTO_ORDER[b.relacionamento] : -1;
        return ar - br;
      }
      if (leadsSortKey === 'investimento') {
        const ai = a.investimento ? LEAD_INVESTIMENTO_ORDER[a.investimento] : -1;
        const bi = b.investimento ? LEAD_INVESTIMENTO_ORDER[b.investimento] : -1;
        return ai - bi;
      }
      if (leadsSortKey === 'perfilLead') {
        const ap = a.perfilLead ? LEAD_PERFIL_TIPO_ORDER[a.perfilLead] : -1;
        const bp = b.perfilLead ? LEAD_PERFIL_TIPO_ORDER[b.perfilLead] : -1;
        return ap - bp;
      }
      if (leadsSortKey === 'cvcrm') {
        const av = a.cvcrm_sync_status === 'synced' ? 1 : 0;
        const bv = b.cvcrm_sync_status === 'synced' ? 1 : 0;
        return av - bv;
      }
      const av = a[leadsSortKey];
      const bv = b[leadsSortKey];
      return String(av).localeCompare(String(bv), 'pt-BR', { sensitivity: 'base', numeric: true });
    });
    return leadsSortDirection === 'asc' ? sorted : sorted.reverse();
  }, [filteredLeadsRows, leadsSortDirection, leadsSortKey]);

  const totalLeadsSectionPages = useMemo(
    () => Math.max(1, Math.ceil(sortedLeadsRows.length / LEADS_PAGE_SIZE)),
    [sortedLeadsRows.length],
  );

  const paginatedLeadsRows = useMemo(() => {
    const start = leadsPage * LEADS_PAGE_SIZE;
    return sortedLeadsRows.slice(start, start + LEADS_PAGE_SIZE);
  }, [leadsPage, sortedLeadsRows]);

  const leadResumoFillRatio = useMemo(() => {
    const row = leadResumoSelecionado;
    if (!row) return 0.4;
    return profileDataFillRatio([
      row.nome,
      row.email,
      row.telefone,
      row.contato,
      row.pagina,
      row.origem,
      row.canal,
      row.relacionamento,
      row.investimento,
      row.cidadeResidencia,
      row.dataNascimento,
      row.perfilLead,
      row.perfilOutrasRespostas,
      row.qualificacao,
    ]);
  }, [leadResumoSelecionado]);

  const handleLeadsSort = (key: LeadSortKey) => {
    if (leadsSortKey === key) {
      setLeadsSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setLeadsSortKey(key);
    setLeadsSortDirection(key === 'codigo' || key === 'dataHora' ? 'desc' : 'asc');
  };

  const leadsTableViewKey = `leads-${leadsTableTab}`;

  const handleLeadsTableTabChange = (tab: LeadsTableTab) => {
    if (tab === leadsTableTab) return;
    setLeadsTableViewDirection(
      LEAD_MODAL_TAB_ORDER[tab] - LEAD_MODAL_TAB_ORDER[leadsTableTab],
    );
    setLeadsTableTab(tab);
  };

  useEffect(() => {
    setLeadsPage(0);
  }, [leadsSearchQuery]);

  useEffect(() => {
    if (leadsTableTab === 'detalhes') {
      setLeadsSortKey('codigo');
      setLeadsSortDirection('desc');
    } else if (leadsTableTab === 'perfil') {
      setLeadsSortKey('nome');
      setLeadsSortDirection('asc');
    } else {
      setLeadsSortKey('dataHora');
      setLeadsSortDirection('desc');
    }
  }, [leadsTableTab]);

  useEffect(() => {
    setLeadModalTela('detalhes');
    setLeadModalTabDirection(0);
  }, [leadResumoSelecionado?.id]);

  const handleLeadModalTabChange = (next: LeadsTableTab) => {
    if (next === leadModalTela) return;
    setLeadModalTabDirection(LEAD_MODAL_TAB_ORDER[next] - LEAD_MODAL_TAB_ORDER[leadModalTela]);
    setLeadModalTela(next);
  };

  useEffect(() => {
    setLeadsPage((p) => Math.min(p, totalLeadsSectionPages - 1));
  }, [totalLeadsSectionPages]);

  useImperativeHandle(
    ref,
    () => ({
      getExportRows: () => buildLeadsExportRows(sortedLeadsRows),
    }),
    [sortedLeadsRows],
  );

  if (leadsLoading) {
    return <LeadsLoadingProgress progress={leadsProgress} minHeightClassName="min-h-[16rem]" />;
  }

  if (leadsError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
        {leadsError}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <MotionReveal index={0} className="space-y-5">
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3 sm:gap-5">
          <div className={cn('flex flex-wrap items-center gap-3 sm:justify-self-start')}>
            <TabButtons
              value={leadsTableTab}
              onChange={handleLeadsTableTabChange}
              items={LEADS_TAB_BUTTON_ITEMS}
            />
          </div>
          <div className="w-full sm:justify-self-center sm:max-w-md">
            <Input
              value={leadsSearchQuery}
              onChange={(e) => setLeadsSearchQuery(e.target.value)}
              placeholder="Busca por ID, nome, telefone, e-mail..."
              className="h-10 rounded-xl"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:justify-self-end">
            <ViewModeToggle
              viewMode={leadsViewMode}
              onViewModeChange={setLeadsViewMode}
              tableLabel="Planilha"
              cardsLabel="Cards"
            />
            <div className="inline-flex items-center gap-1 rounded-full border border-input bg-background/50 p-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                disabled={leadsPage <= 0}
                onClick={() => setLeadsPage((p) => Math.max(0, p - 1))}
              >
                {'<'}
              </Button>
              <span className="inline-flex h-8 min-w-[4rem] items-center justify-center rounded-full px-3 text-sm font-medium leading-none text-muted-foreground">
                <MotionFlipNumber value={`${leadsPage + 1}/${totalLeadsSectionPages}`} />
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                disabled={leadsPage >= totalLeadsSectionPages - 1}
                onClick={() => setLeadsPage((p) => Math.min(totalLeadsSectionPages - 1, p + 1))}
              >
                {'>'}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              disabled={leadsLoading || leadsSyncing}
              onClick={() => void refreshFromDatabase()}
              aria-label="Recarregar leads do banco"
            >
              <RefreshCw className={cn('h-4 w-4', leadsSyncing && 'animate-spin')} />
            </Button>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {leadsViewMode === 'table' ? (
            <motion.div
              key="leads-table"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden rounded-xl border border-border bg-muted/40 dark:bg-card"
            >
              <div className="overflow-x-auto">
                <AnimatedTabPanel viewKey={leadsTableViewKey} direction={leadsTableViewDirection}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                        {leadsTableColumns.map((col) => {
                          const isActive = leadsSortKey === col.key;
                          const SortIcon = leadsSortDirection === 'asc' ? ArrowUp : ArrowDown;
                          const minWidthClass = leadColMinWidthClass(col.key);
                          return (
                            <th key={col.key} className={cn('whitespace-nowrap px-4 py-3.5 font-medium', minWidthClass)}>
                              <button
                                type="button"
                                onClick={() => handleLeadsSort(col.key)}
                                className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground"
                              >
                                <span>{col.label}</span>
                                {isActive ? <SortIcon className="h-3.5 w-3.5 text-foreground" /> : null}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <LayoutGroup id="leads-rows">
                      <tbody>
                        <AnimatePresence initial={false}>
                          {paginatedLeadsRows.map((row) => (
                            <MotionFlipListItem
                              key={row.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Abrir resumo do lead ${getLeadDisplayId(row)} · ${row.nome}`}
                              className="cursor-pointer border-b border-border/60 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              onClick={() => setLeadResumoSelecionado(row)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setLeadResumoSelecionado(row);
                                }
                              }}
                            >
                              {leadsTableColumns.map((col) => (
                                <td key={col.key} className={leadTdClassName(col.key)}>
                                  {leadCellContent(row, col.key)}
                                </td>
                              ))}
                            </MotionFlipListItem>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </LayoutGroup>
                  </table>
                </AnimatedTabPanel>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="leads-cards"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <AnimatedTabPanel viewKey={leadsTableViewKey} direction={leadsTableViewDirection}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {paginatedLeadsRows.map((row, index) => (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="h-full"
                    >
                      <LeadCard
                        row={row}
                        tab={leadsTableTab}
                        onClick={() => setLeadResumoSelecionado(row)}
                        className="h-full min-h-[15.5rem]"
                      />
                    </motion.div>
                  ))}
                </div>
              </AnimatedTabPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionReveal>
      <Dialog
          open={leadResumoSelecionado !== null}
          onOpenChange={(open) => {
            if (!open) setLeadResumoSelecionado(null);
          }}
        >
          <DialogContent
            entranceFillRatio={leadResumoFillRatio}
            className="flex max-h-[min(90vh,48rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          >
            <DialogHeader className="space-y-2 border-b border-border/80 bg-muted/30 px-6 py-5 text-left pr-14">
              <DialogTitle className="text-xl font-semibold tracking-tight">Resumo do Lead</DialogTitle>
              {leadResumoSelecionado ? (
                <DialogDescription className="text-sm text-muted-foreground">
                  <LeadDisplayIdBadge id={leadResumoSelecionado.id} className="mr-2 align-middle" />
                  <span className="font-medium text-foreground">{leadResumoSelecionado.nome}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · criado em {formatLeadDateCreated(leadResumoSelecionado.dataHora)}
                  </span>
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">Detalhes do lead selecionado.</DialogDescription>
              )}
            </DialogHeader>

            <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-muted/15 to-background px-6 py-5">
              {leadResumoSelecionado ? (
                <LeadModalTabPanels
                  tab={leadModalTela}
                  row={leadResumoSelecionado}
                  direction={leadModalTabDirection}
                />
              ) : null}
            </div>

            <DialogFooter className="flex flex-col gap-3 border-t border-border/80 bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <TabButtons
                  value={leadModalTela}
                  onChange={handleLeadModalTabChange}
                  items={LEADS_TAB_BUTTON_ITEMS}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="shrink-0"
                title="Copiar resumo em Markdown"
                aria-label="Copiar resumo em Markdown"
                onClick={async () => {
                  const row = leadResumoSelecionado;
                  if (!row) return;
                  const md = leadResumoMarkdown(row);
                  try {
                    await navigator.clipboard.writeText(md);
                    toast.success('Resumo copiado em Markdown.');
                  } catch {
                    toast.error('Não foi possível copiar. Tente novamente.');
                  }
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
});

/** @deprecated Use LeadsOperacionalView */
export const LeadsView = LeadsOperacionalView;
