import { useEffect, useImperativeHandle, useMemo, useState, forwardRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Iris, type IrisVariant } from '@/components/ui/Iris';
import {
  computeGesiteLeadQualificacao,
  gesiteLeadRespondeuFormularioPerfil,
  parseIdadeAnosFromDataNascimentoPtBr,
  type GesiteLeadQualificacao,
} from '@/rules/qualifyGesiteLead';
import { cn } from '@/lib/utils';
import { profileDataFillRatio } from '@/lib/motionPresets';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TabButtons } from '@/components/ui/tab-buttons';
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle';
import { GesiteLeadCard } from '@/components/gesite/GesiteLeadCard';
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
  Globe,
  ArrowDown,
  ArrowUp,
  Copy,
  User,
} from 'lucide-react';
import {
  LayoutGroup,
  MotionFlipListItem,
  MotionFlipNumber,
  MotionReveal,
} from '@/components/motion/AppMotion';
import { useAppMotion } from '@/hooks/useAppMotion';


/** Linhas por página nas tabelas das subabas Leads e Acessos (GêSite). */
const GESITE_SUBTAB_TABLE_PAGE_SIZE = 50;
const PAGE_SIZE = GESITE_SUBTAB_TABLE_PAGE_SIZE;
const LEADS_PAGE_SIZE = GESITE_SUBTAB_TABLE_PAGE_SIZE;
const ACESSOS_PAGINA_PAGE_SIZE = GESITE_SUBTAB_TABLE_PAGE_SIZE;

/** Opções de múltipla escolha — relacionamento. */
type GesiteLeadRelacionamento =
  | 'Solteiro(a)'
  | 'Namorando'
  | 'Noivo(a)'
  | 'União estável / Casado(a)';

/** Opções de múltipla escolha — faixa de investimento (valores mensais). */
type GesiteLeadInvestimento =
  | 'Entre R$1000 e R$1700'
  | 'Entre R$1701 e R$2500'
  | 'Entre R$2501 e R$3500'
  | 'Acima de R$3500';

/** Perfil do interesse (múltipla escolha). */
type GesiteLeadPerfilTipo = 'Morador' | 'Investidor' | 'Corretor';

type GesiteLeadMockRow = {
  id: string;
  dataHora: string;
  nome: string;
  contato: string;
  pagina: string;
  origem: string;
  canal: string;
  qualificacao: GesiteLeadQualificacao;
  email: string;
  telefone: string;
  /** Resposta «Relacionamento» (vazio = não preenchido). */
  relacionamento: GesiteLeadRelacionamento | '';
  /** Resposta «Investimento» (vazio = não preenchido). */
  investimento: GesiteLeadInvestimento | '';
  /** Cidade — texto livre. */
  cidadeResidencia: string;
  /** Data de nascimento no formato dd/mm/aaaa. */
  dataNascimento: string;
  /** Perfil: Morador / Investidor / Corretor (vazio = não preenchido). */
  perfilLead: GesiteLeadPerfilTipo | '';
  /** Demais respostas do formulário de perfil (texto livre agregado). */
  perfilOutrasRespostas: string;
  dispositivo: string;
  pagamentoPreferencia: string;
};

/** Lead com questionário de perfil considerado completo — regra partilhada com `qualifyGesiteLead.ts`. */
function gesiteLeadPerfilCompleto(row: GesiteLeadMockRow): boolean {
  return gesiteLeadRespondeuFormularioPerfil(row);
}

type GesiteLeadsTableTab = 'fonte' | 'perfil';

type GesiteLeadsPaginaRow = {
  id: string;
  nome: string;
  leads: number;
  ultimoLeadIso: string;
  /** Percentual 0–100 (perfil completo / leads da página). */
  perfilPct: number;
  /** Percentual 0–100 (leads qualificados / leads da página). */
  qualificacaoPct: number;
};

type GesiteLeadsPaginaSortKey = 'nome' | 'leads' | 'ultimoLead' | 'perfilPct' | 'qualificacaoPct';

type GesiteLeadSortKey =
  | 'dataHora'
  | 'nome'
  | 'email'
  | 'telefone'
  | 'pagina'
  | 'origem'
  | 'canal'
  /** Na view Fonte: questionário de perfil preenchido (Sim/Não). */
  | 'perfilQuestionario'
  | 'qualificacao'
  | 'relacionamento'
  | 'investimento'
  | 'cidadeResidencia'
  | 'dataNascimento'
  | 'perfilLead';

export const GESITE_LEADS_INFOBOX_MOCK = {
  leads: 248,
  forms: 162,
  whatsapp: 86,
  taxaConversaoPct: 11.8,
  pontuacao: 72,
  vendas: 12,
  visitasAgendadas: 18,
  atendimentoCorretor: 29,
  analiseCredito: 21,
};

function createGesiteLeadsTimeSeriesMock(reference: Date = new Date()): GesiteLeadMockRow[] {
  const pages = ['/home', '/flores', '/sac', '/trabalhe-conosco', '/fornecedores', '/lancamentos', '/empreendimentos'];
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const out: GesiteLeadMockRow[] = [];
  let n = 1;
  const rels: GesiteLeadRelacionamento[] = [
    'Solteiro(a)',
    'Namorando',
    'Noivo(a)',
    'União estável / Casado(a)',
  ];
  const invs: GesiteLeadInvestimento[] = [
    'Entre R$1000 e R$1700',
    'Entre R$1701 e R$2500',
    'Entre R$2501 e R$3500',
    'Acima de R$3500',
  ];
  const perfis: GesiteLeadPerfilTipo[] = ['Morador', 'Investidor', 'Corretor'];
  const cidades = ['São Paulo — SP', 'Rio de Janeiro — RJ', 'Curitiba — PR', ''];
  const pagamentos = ['PIX', 'Financiamento', 'Cartão / parcelado', 'Transferência'];
  for (let d = 0; d < 400; d++) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);
    const count = 1 + (d % 4);
    for (let j = 0; j < count; j++) {
      const dt = new Date(day);
      dt.setHours(9 + (j % 8), (j * 11 + d) % 55, 0, 0);
      const pagina = pages[(d + j) % pages.length];
      const emailish = (d + j + n) % 3 !== 0;
      const contato = emailish ? `lead${n}@exemplo.com` : `+55 11 9${String(1000000 + (n % 9000000)).slice(1)}`;
      const preenche = n % 4 === 0;
      const diaN = 1 + (n % 28);
      const mesN = 1 + (n % 12);
      const anoN = 1988 + (n % 20);
      const rowBase: Omit<GesiteLeadMockRow, 'qualificacao'> = {
        id: `lead-gen-${n}`,
        dataHora: dt.toISOString(),
        nome: `Lead ${n}`,
        contato,
        pagina,
        origem: ['Google', 'Instagram', 'Direto'][n % 3],
        canal: ['Pesquisa', 'Social', 'URL'][n % 3],
        email: emailish ? contato : '',
        telefone: emailish ? '' : contato,
        relacionamento: preenche ? rels[n % 4] : '',
        investimento: preenche ? invs[n % 4] : '',
        cidadeResidencia: preenche ? cidades[n % cidades.length] : '',
        dataNascimento: preenche ? `${String(diaN).padStart(2, '0')}/${String(mesN).padStart(2, '0')}/${anoN}` : '',
        perfilLead: preenche ? perfis[n % 3] : '',
        perfilOutrasRespostas: '',
        dispositivo: ['Celular', 'Computador'][n % 2],
        pagamentoPreferencia: preenche ? pagamentos[n % pagamentos.length] : '',
      };
      out.push({ ...rowBase, qualificacao: computeGesiteLeadQualificacao(rowBase) });
      n++;
    }
  }
  return out;
}

const GESITE_LEADS_TABLE_SEED_BASE: Omit<GesiteLeadMockRow, 'qualificacao'>[] = [
  {
    id: 'lead-001',
    dataHora: '2026-04-28T10:12:00-03:00',
    nome: 'Ana Costa',
    contato: 'ana@email.com',
    pagina: '/lancamentos',
    origem: 'Google',
    canal: 'Pesquisa',
    email: 'ana@email.com',
    telefone: '+55 11 97777-1001',
    relacionamento: 'União estável / Casado(a)',
    investimento: 'Acima de R$3500',
    cidadeResidencia: 'São Paulo — SP',
    dataNascimento: '15/03/1991',
    perfilLead: 'Morador',
    perfilOutrasRespostas: 'Profissão: arquiteta; Pretensão: moradia até R$ 650 mil; Região: Zona Sul.',
    dispositivo: 'Celular',
    pagamentoPreferencia: 'PIX',
  },
  {
    id: 'lead-002',
    dataHora: '2026-04-28T09:48:00-03:00',
    nome: 'Bruno Lima',
    contato: '+55 21 99999-1001',
    pagina: '/empreendimentos',
    origem: 'Instagram',
    canal: 'Social',
    email: '',
    telefone: '',
    relacionamento: '',
    investimento: '',
    cidadeResidencia: '',
    dataNascimento: '',
    perfilLead: '',
    perfilOutrasRespostas: '',
    dispositivo: 'Celular',
    pagamentoPreferencia: '',
  },
  {
    id: 'lead-003',
    dataHora: '2026-04-28T08:35:00-03:00',
    nome: 'Carla Nunes',
    contato: 'carla@email.com',
    pagina: '/quem-somos',
    origem: 'LinkedIn',
    canal: 'Social',
    email: 'carla@email.com',
    telefone: '+55 31 98888-3344',
    relacionamento: 'Solteiro(a)',
    investimento: 'Entre R$2501 e R$3500',
    cidadeResidencia: 'Belo Horizonte — MG',
    dataNascimento: '22/07/1984',
    perfilLead: 'Investidor',
    perfilOutrasRespostas: 'Moradia atual: aluguel; Interesse: investimento; Prazo: 12 meses.',
    dispositivo: 'Computador',
    pagamentoPreferencia: 'Financiamento',
  },
  {
    id: 'lead-004',
    dataHora: '2026-04-27T16:22:00-03:00',
    nome: 'Diego Rocha',
    contato: '+55 11 98877-6655',
    pagina: '/contato',
    origem: 'Direto',
    canal: 'Direto',
    email: '',
    telefone: '',
    relacionamento: 'Namorando',
    investimento: 'Entre R$1000 e R$1700',
    cidadeResidencia: 'Campinas',
    dataNascimento: '01/11/2000',
    perfilLead: 'Morador',
    perfilOutrasRespostas: '',
    dispositivo: 'Tablet',
    pagamentoPreferencia: '',
  },
  {
    id: 'lead-005',
    dataHora: '2026-04-27T14:05:00-03:00',
    nome: 'Elisa Martins',
    contato: 'elisa@email.com',
    pagina: '/lancamentos',
    origem: 'Facebook',
    canal: 'Social',
    email: 'elisa@email.com',
    telefone: '+55 47 99911-4455',
    relacionamento: 'Noivo(a)',
    investimento: 'Entre R$1701 e R$2500',
    cidadeResidencia: 'Florianópolis — SC',
    dataNascimento: '03/12/1996',
    perfilLead: 'Corretor',
    perfilOutrasRespostas: 'Primeiro imóvel; Financiamento: sim; Contato preferencial: WhatsApp.',
    dispositivo: 'Celular',
    pagamentoPreferencia: 'Cartão / parcelado',
  },
];

const GESITE_LEADS_TABLE_SEED: GesiteLeadMockRow[] = GESITE_LEADS_TABLE_SEED_BASE.map((r) => ({
  ...r,
  qualificacao: computeGesiteLeadQualificacao(r),
}));

export const GESITE_LEADS_TABLE_MOCK: GesiteLeadMockRow[] = [
  ...GESITE_LEADS_TABLE_SEED,
  ...createGesiteLeadsTimeSeriesMock(),
];

function gesiteLeadContatoIsForm(contato: string): boolean {
  return contato.includes('@');
}

const GESITE_LEADS_TAB_BUTTON_ITEMS = [
  { value: 'fonte' as const, label: 'Origem', Icon: Globe },
  { value: 'perfil' as const, label: 'Perfil', Icon: User },
];

const GESITE_LEAD_MODAL_TAB_ORDER: Record<GesiteLeadsTableTab, number> = {
  fonte: 0,
  perfil: 1,
};

const gesiteTabPanelVariants = {
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

export const GESITE_LEADS_PAGINAS_TABLE_MOCK: GesiteLeadsPaginaRow[] = [
  {
    id: 'pg-home',
    nome: 'Home',
    leads: 89,
    ultimoLeadIso: '2026-05-11T18:42:33-03:00',
    perfilPct: 62.4,
    qualificacaoPct: 31.2,
  },
  {
    id: 'pg-flores',
    nome: 'Flores',
    leads: 54,
    ultimoLeadIso: '2026-05-11T14:05:12-03:00',
    perfilPct: 55.6,
    qualificacaoPct: 24.1,
  },
  {
    id: 'pg-bellavista',
    nome: 'Bellavista',
    leads: 41,
    ultimoLeadIso: '2026-05-10T09:18:00-03:00',
    perfilPct: 48.8,
    qualificacaoPct: 19.5,
  },
  {
    id: 'pg-flow',
    nome: 'Flow',
    leads: 36,
    ultimoLeadIso: '2026-05-09T21:33:07-03:00',
    perfilPct: 50.0,
    qualificacaoPct: 22.2,
  },
  {
    id: 'pg-sac',
    nome: 'Sac',
    leads: 28,
    ultimoLeadIso: '2026-05-08T11:20:45-03:00',
    perfilPct: 39.3,
    qualificacaoPct: 14.3,
  },
  {
    id: 'pg-lancamentos',
    nome: 'Lançamentos',
    leads: 67,
    ultimoLeadIso: '2026-05-11T08:55:21-03:00',
    perfilPct: 58.2,
    qualificacaoPct: 26.9,
  },
  {
    id: 'pg-empreendimentos',
    nome: 'Empreendimentos',
    leads: 44,
    ultimoLeadIso: '2026-05-07T16:44:02-03:00',
    perfilPct: 52.3,
    qualificacaoPct: 20.5,
  },
  {
    id: 'pg-genews',
    nome: 'GêNews',
    leads: 19,
    ultimoLeadIso: '2026-05-06T10:01:59-03:00',
    perfilPct: 36.8,
    qualificacaoPct: 15.8,
  },
];

const GESITE_LEADS_PAGINAS_COLS: { key: GesiteLeadsPaginaSortKey; label: string }[] = [
  { key: 'leads', label: 'Leads' },
  { key: 'perfilPct', label: 'Perfil' },
  { key: 'qualificacaoPct', label: 'Qualificação' },
  { key: 'ultimoLead', label: 'Último lead' },
];

const GESITE_LEADS_COL_FONTE: { key: GesiteLeadSortKey; label: string }[] = [
  { key: 'dataHora', label: 'Data' },
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'pagina', label: 'Página' },
  { key: 'origem', label: 'Origem' },
  { key: 'canal', label: 'Canal' },
  { key: 'perfilQuestionario', label: 'Perfil' },
  { key: 'qualificacao', label: 'Qualificação' },
];

const GESITE_LEADS_COL_PERFIL: { key: GesiteLeadSortKey; label: string }[] = [
  { key: 'dataHora', label: 'Data' },
  { key: 'nome', label: 'Nome' },
  { key: 'relacionamento', label: 'Relacionamento' },
  { key: 'investimento', label: 'Investimento' },
  { key: 'cidadeResidencia', label: 'Cidade' },
  { key: 'dataNascimento', label: 'Idade' },
  { key: 'perfilLead', label: 'Perfil' },
];

const GESITE_LEAD_QUALIFICACAO_ORDER: Record<GesiteLeadQualificacao, number> = {
  Indefinida: 0,
  'N/A': 1,
  Baixa: 2,
  Média: 3,
  Alta: 4,
};

const GESITE_LEAD_RELACIONAMENTO_ORDER: Record<GesiteLeadRelacionamento, number> = {
  'Solteiro(a)': 0,
  Namorando: 1,
  'Noivo(a)': 2,
  'União estável / Casado(a)': 3,
};

const GESITE_LEAD_INVESTIMENTO_ORDER: Record<GesiteLeadInvestimento, number> = {
  'Entre R$1000 e R$1700': 0,
  'Entre R$1701 e R$2500': 1,
  'Entre R$2501 e R$3500': 2,
  'Acima de R$3500': 3,
};

const GESITE_LEAD_PERFIL_TIPO_ORDER: Record<GesiteLeadPerfilTipo, number> = {
  Morador: 0,
  Investidor: 1,
  Corretor: 2,
};

function gesiteLeadIrisVariantQualificacao(q: GesiteLeadQualificacao): IrisVariant {
  switch (q) {
    case 'Alta':
      return 'iris6';
    case 'Média':
      return 'iris4';
    case 'Baixa':
      return 'iris1';
    case 'Indefinida':
      return 'iris11';
    case 'N/A':
      return 'iris19';
    default:
      return 'iris6';
  }
}

function GesiteLeadQualificacaoCell({ value }: { value: GesiteLeadQualificacao }) {
  return <Iris text={value} variant={gesiteLeadIrisVariantQualificacao(value)} className="max-w-[12rem]" />;
}

/** View Fonte: indica se o questionário de perfil foi preenchido (Sim/Não). */
function GesiteLeadPerfilQuestionarioCell({ completo }: { completo: boolean }) {
  return <Iris text={completo ? 'Sim' : 'Não'} variant={completo ? 'iris6' : 'iris1'} />;
}

function gesiteLeadIrisVariantPerfilTipo(p: GesiteLeadPerfilTipo): IrisVariant {
  if (p === 'Morador') return 'iris6';
  if (p === 'Investidor') return 'iris11';
  return 'iris14';
}

function GesiteLeadPerfilTipoCell({ value }: { value: GesiteLeadPerfilTipo | '' }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={value} variant={gesiteLeadIrisVariantPerfilTipo(value)} className="max-w-[10rem]" />;
}

/** Solteiro → vermelho; Namorando → amarelo; Casado / Noivo → verde. */
function gesiteLeadIrisVariantRelacionamento(r: GesiteLeadRelacionamento): IrisVariant {
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

function GesiteLeadRelacionamentoCell({ value }: { value: GesiteLeadRelacionamento | '' }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={value} variant={gesiteLeadIrisVariantRelacionamento(value)} className="max-w-[14rem]" />;
}

function gesiteLeadIrisVariantInvestimento(i: GesiteLeadInvestimento): IrisVariant {
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

function GesiteLeadInvestimentoCell({ value }: { value: GesiteLeadInvestimento | '' }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={value} variant={gesiteLeadIrisVariantInvestimento(value)} className="max-w-[16rem]" />;
}

/** Cidade: neutro claro/escuro conforme o tema (IRIS). */
function GesiteLeadCidadeIrisCell({ cidade }: { cidade: string }) {
  const t = cidade.trim();
  if (!t) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <Iris text={t} variant="iris23" className="max-w-[16rem]" />;
}

function gesiteLeadIrisVariantIdadeAnos(age: number | null): IrisVariant {
  if (age == null || !Number.isFinite(age)) return 'iris21';
  if (age < 20) return 'iris1';
  if (age <= 30) return 'iris4';
  return 'iris6';
}

/** Idade (anos) a partir de `dd/mm/aaaa` para cor do IRIS na coluna Idade. */
function GesiteLeadIdadeIrisCell({ dataNascimento }: { dataNascimento: string }) {
  const t = dataNascimento.trim();
  if (!t) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const age = parseIdadeAnosFromDataNascimentoPtBr(t);
  const variant = gesiteLeadIrisVariantIdadeAnos(age);
  return <Iris text={t} variant={variant} className="max-w-[10rem] tabular-nums" />;
}

function gesiteLeadCampoVazio(valor: string): string {
  const t = valor.trim();
  return t.length > 0 ? t : '—';
}

/** `dd/mm/aaaa, hh:mm:ss` em horário local. */
function formatGesiteUltimoLeadDmyHms(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function formatGesitePct0to100(v: number): string {
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Gera bloco de código Markdown com limite de cercas para conteúdo arbitrário. */
function gesiteLeadMdFence(body: string): string {
  const normalized = body.replace(/\r\n/g, '\n');
  let fence = '```';
  while (normalized.includes(fence)) {
    fence += '`';
  }
  return `${fence}\n${normalized}\n${fence}`;
}

/** Linha de lista com rótulo em negrito; valores multilinha viram bloco de código. */
function gesiteLeadMdBullet(label: string, raw: string): string {
  const display = gesiteLeadCampoVazio(raw);
  if (display.includes('\n')) {
    return `- **${label}:**\n\n${gesiteLeadMdFence(display)}`;
  }
  return `- **${label}:** ${display}`;
}

/** Resumo completo do lead em Markdown (abas Fonte + Perfil), adequado a Notion/Obsidian/GitHub. */
function gesiteLeadResumoMarkdown(row: GesiteLeadMockRow): string {
  const capturado = new Date(row.dataHora).toLocaleString();
  const blocos: string[] = [
    '# Resumo do Lead',
    '',
    `> **${row.nome}** · capturado em ${capturado}`,
    '',
    '---',
    '',
    '## Fonte',
    '',
    gesiteLeadMdBullet('Data', new Date(row.dataHora).toLocaleString()),
    gesiteLeadMdBullet('Nome', row.nome),
    gesiteLeadMdBullet('Email', row.email),
    gesiteLeadMdBullet('Telefone', row.telefone),
    gesiteLeadMdBullet('Página', row.pagina),
    gesiteLeadMdBullet('Origem', row.origem),
    gesiteLeadMdBullet('Canal', row.canal),
    gesiteLeadMdBullet('Perfil', gesiteLeadPerfilCompleto(row) ? 'Sim' : 'Não'),
    gesiteLeadMdBullet('Qualificação', row.qualificacao),
    '',
    '---',
    '',
    '## Perfil',
    '',
    gesiteLeadMdBullet('Data', new Date(row.dataHora).toLocaleString()),
    gesiteLeadMdBullet('Nome', row.nome),
    gesiteLeadMdBullet('Relacionamento', row.relacionamento),
    gesiteLeadMdBullet('Investimento', row.investimento),
    gesiteLeadMdBullet('Cidade', row.cidadeResidencia),
    gesiteLeadMdBullet('Idade', row.dataNascimento),
    gesiteLeadMdBullet('Perfil', row.perfilLead),
    '',
  ];
  return blocos.join('\n');
}

function gesiteLeadColMinWidthClass(key: GesiteLeadSortKey): string {
  if (key === 'nome') return 'min-w-[140px]';
  if (key === 'email' || key === 'telefone') return 'min-w-[160px]';
  if (key === 'pagina') return 'min-w-[120px]';
  if (key === 'qualificacao') return 'min-w-[7.5rem]';
  if (key === 'perfilQuestionario') return 'min-w-[5.5rem]';
  if (key === 'relacionamento') return 'min-w-[10rem]';
  if (key === 'investimento') return 'min-w-[11rem]';
  if (key === 'cidadeResidencia') return 'min-w-[120px]';
  if (key === 'dataNascimento') return 'min-w-[6.5rem]';
  if (key === 'perfilLead') return 'min-w-[6.5rem]';
  return '';
}

function gesiteLeadTdClassName(col: GesiteLeadSortKey): string {
  const base = 'px-4 py-3.5 align-top';
  if (col === 'dataHora') return cn(base, 'whitespace-nowrap text-muted-foreground');
  if (col === 'nome') return cn(base, 'font-medium');
  if (col === 'pagina' || col === 'origem' || col === 'canal') return cn(base, 'text-xs');
  if (col === 'email' || col === 'telefone') return cn(base, 'text-xs');
  if (col === 'perfilQuestionario') return cn(base, 'text-xs');
  if (col === 'qualificacao') return cn(base);
  if (col === 'relacionamento' || col === 'investimento' || col === 'perfilLead') return cn(base, 'text-xs');
  if (col === 'cidadeResidencia' || col === 'dataNascimento') return cn(base, 'text-xs');
  return base;
}

function gesiteLeadCellContent(row: GesiteLeadMockRow, col: GesiteLeadSortKey): ReactNode {
  switch (col) {
    case 'dataHora':
      return new Date(row.dataHora).toLocaleString();
    case 'nome':
      return row.nome;
    case 'email':
      return gesiteLeadCampoVazio(row.email);
    case 'telefone':
      return gesiteLeadCampoVazio(row.telefone);
    case 'pagina':
      return <span className="font-mono">{row.pagina}</span>;
    case 'origem':
      return row.origem;
    case 'canal':
      return row.canal;
    case 'perfilQuestionario':
      return <GesiteLeadPerfilQuestionarioCell completo={gesiteLeadPerfilCompleto(row)} />;
    case 'qualificacao':
      return <GesiteLeadQualificacaoCell value={row.qualificacao} />;
    case 'relacionamento':
      return <GesiteLeadRelacionamentoCell value={row.relacionamento} />;
    case 'investimento':
      return <GesiteLeadInvestimentoCell value={row.investimento} />;
    case 'cidadeResidencia':
      return <GesiteLeadCidadeIrisCell cidade={row.cidadeResidencia} />;
    case 'dataNascimento':
      return <GesiteLeadIdadeIrisCell dataNascimento={row.dataNascimento} />;
    case 'perfilLead':
      return <GesiteLeadPerfilTipoCell value={row.perfilLead} />;
  }
}

function gesiteLeadsPaginaColMinWidth(key: GesiteLeadsPaginaSortKey): string {
  if (key === 'nome') return 'min-w-[100px]';
  if (key === 'ultimoLead') return 'min-w-[11rem]';
  return '';
}

function gesiteLeadsPaginaTdClass(col: GesiteLeadsPaginaSortKey): string {
  const base = 'px-4 py-3.5 align-top';
  if (col === 'nome') return cn(base, 'font-medium');
  if (col === 'leads') return cn(base, 'tabular-nums');
  if (col === 'ultimoLead')
    return cn(base, 'whitespace-nowrap text-xs tabular-nums text-muted-foreground text-right');
  if (col === 'perfilPct' || col === 'qualificacaoPct') return cn(base, 'tabular-nums');
  return base;
}

function gesiteLeadsPaginaCellContent(row: GesiteLeadsPaginaRow, col: GesiteLeadsPaginaSortKey): ReactNode {
  switch (col) {
    case 'nome':
      return row.nome;
    case 'leads':
      return <MotionFlipNumber value={row.leads.toLocaleString('pt-BR')} />;
    case 'ultimoLead':
      return formatGesiteUltimoLeadDmyHms(row.ultimoLeadIso);
    case 'perfilPct':
      return <MotionFlipNumber value={formatGesitePct0to100(row.perfilPct)} />;
    case 'qualificacaoPct':
      return <MotionFlipNumber value={formatGesitePct0to100(row.qualificacaoPct)} />;
  }
}

function GesiteLeadModalCampo({
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

function GesiteLeadModalFontePanel({ row }: { row: GesiteLeadMockRow }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {GESITE_LEADS_COL_FONTE.map((col) => (
        <GesiteLeadModalCampo key={col.key} label={col.label}>
          <div className="text-xs sm:text-sm">{gesiteLeadCellContent(row, col.key)}</div>
        </GesiteLeadModalCampo>
      ))}
    </div>
  );
}

function GesiteLeadModalPerfilPanel({ row }: { row: GesiteLeadMockRow }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {GESITE_LEADS_COL_PERFIL.map((col) => (
        <GesiteLeadModalCampo key={col.key} label={col.label}>
          <div className="text-xs sm:text-sm">{gesiteLeadCellContent(row, col.key)}</div>
        </GesiteLeadModalCampo>
      ))}
    </div>
  );
}

function GesiteAnimatedTabPanel({
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
        variants={gesiteTabPanelVariants}
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

function GesiteLeadModalTabPanels({
  tab,
  row,
  direction,
}: {
  tab: GesiteLeadsTableTab;
  row: GesiteLeadMockRow;
  direction: number;
}) {
  const panel =
    tab === 'fonte' ? (
      <GesiteLeadModalFontePanel row={row} />
    ) : (
      <GesiteLeadModalPerfilPanel row={row} />
    );

  return (
    <GesiteAnimatedTabPanel viewKey={tab} direction={direction}>
      {panel}
    </GesiteAnimatedTabPanel>
  );
}

export function buildGesiteLeadsExportRows(rows: GesiteLeadMockRow[]) {
  return rows.map((row) => ({
    data_hora: new Date(row.dataHora).toLocaleString(),
    nome: row.nome,
    contato: row.contato,
    pagina: row.pagina,
    origem: row.origem,
    canal: row.canal,
    qualificacao: row.qualificacao,
    email: row.email,
    telefone: row.telefone,
    relacionamento: row.relacionamento,
    investimento: row.investimento,
    cidade: row.cidadeResidencia,
    data_nascimento: row.dataNascimento,
    perfil: row.perfilLead,
    perfil_questionario_completo: gesiteLeadPerfilCompleto(row) ? 'Sim' : 'Não',
    demais_respostas: row.perfilOutrasRespostas,
    dispositivo: row.dispositivo,
    pagamento_preferencia: row.pagamentoPreferencia,
  }));
}

export type GeSiteLeadsExportRef = {
  getExportRows: () => ReturnType<typeof buildGesiteLeadsExportRows>;
};

export type GesiteLeadsOperacionalViewProps = Record<string, never>;

export const GesiteLeadsOperacionalView = forwardRef<GeSiteLeadsExportRef, GesiteLeadsOperacionalViewProps>(
  function GesiteLeadsOperacionalView(_props, ref) {
  const allLeadsRows = GESITE_LEADS_TABLE_MOCK;

  const [leadsSortKey, setLeadsSortKey] = useState<GesiteLeadSortKey>('dataHora');
  const [leadsSortDirection, setLeadsSortDirection] = useState<'asc' | 'desc'>('desc');
  const [leadsSearchQuery, setLeadsSearchQuery] = useState('');
  const [leadsPage, setLeadsPage] = useState(0);
  /** Lead cuja linha foi clicada — abre modal de resumo. */
  const [leadResumoSelecionado, setLeadResumoSelecionado] = useState<GesiteLeadMockRow | null>(null);
  /** Tela ativa dentro do modal de resumo (Perfil: questionário além da captura). */
  const [leadModalTela, setLeadModalTela] = useState<GesiteLeadsTableTab>('fonte');
  /** Direção da troca de aba no modal (-1 = Perfil→Origem, 1 = Origem→Perfil). */
  const [leadModalTabDirection, setLeadModalTabDirection] = useState(0);
  const [leadsTableTab, setLeadsTableTab] = useState<GesiteLeadsTableTab>('fonte');
  /** Direção da troca de visualização na tabela principal. */
  const [leadsTableViewDirection, setLeadsTableViewDirection] = useState(0);
  /** Sempre abre em cards; o usuário pode alternar para planilha na sessão. */
  const [leadsViewMode, setLeadsViewMode] = useState<ViewMode>('cards');

  const leadsTableColumns = useMemo(
    () => (leadsTableTab === 'fonte' ? GESITE_LEADS_COL_FONTE : GESITE_LEADS_COL_PERFIL),
    [leadsTableTab],
  );

  const filteredLeadsRows = useMemo(() => {
    const q = leadsSearchQuery.trim().toLowerCase();
    if (!q) return allLeadsRows;
    return allLeadsRows.filter((row) =>
      [
        row.nome,
        row.contato,
        row.pagina,
        row.origem,
        row.canal,
        row.qualificacao,
        row.email,
        row.telefone,
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
      if (leadsSortKey === 'dataHora') {
        return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
      }
      if (leadsSortKey === 'perfilQuestionario') {
        return Number(gesiteLeadPerfilCompleto(a)) - Number(gesiteLeadPerfilCompleto(b));
      }
      if (leadsSortKey === 'qualificacao') {
        return GESITE_LEAD_QUALIFICACAO_ORDER[a.qualificacao] - GESITE_LEAD_QUALIFICACAO_ORDER[b.qualificacao];
      }
      if (leadsSortKey === 'relacionamento') {
        const ar = a.relacionamento ? GESITE_LEAD_RELACIONAMENTO_ORDER[a.relacionamento] : -1;
        const br = b.relacionamento ? GESITE_LEAD_RELACIONAMENTO_ORDER[b.relacionamento] : -1;
        return ar - br;
      }
      if (leadsSortKey === 'investimento') {
        const ai = a.investimento ? GESITE_LEAD_INVESTIMENTO_ORDER[a.investimento] : -1;
        const bi = b.investimento ? GESITE_LEAD_INVESTIMENTO_ORDER[b.investimento] : -1;
        return ai - bi;
      }
      if (leadsSortKey === 'perfilLead') {
        const ap = a.perfilLead ? GESITE_LEAD_PERFIL_TIPO_ORDER[a.perfilLead] : -1;
        const bp = b.perfilLead ? GESITE_LEAD_PERFIL_TIPO_ORDER[b.perfilLead] : -1;
        return ap - bp;
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

  const handleLeadsSort = (key: GesiteLeadSortKey) => {
    if (leadsSortKey === key) {
      setLeadsSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setLeadsSortKey(key);
    setLeadsSortDirection(key === 'dataHora' ? 'desc' : 'asc');
  };

  const leadsTableViewKey = `leads-${leadsTableTab}`;

  const handleLeadsTableTabChange = (tab: GesiteLeadsTableTab) => {
    if (tab === leadsTableTab) return;
    setLeadsTableViewDirection(
      GESITE_LEAD_MODAL_TAB_ORDER[tab] - GESITE_LEAD_MODAL_TAB_ORDER[leadsTableTab],
    );
    setLeadsTableTab(tab);
  };

  useEffect(() => {
    setLeadsPage(0);
  }, [leadsSearchQuery]);

  useEffect(() => {
    setLeadsSortKey('dataHora');
    setLeadsSortDirection('desc');
  }, [leadsTableTab]);

  useEffect(() => {
    setLeadModalTela('fonte');
    setLeadModalTabDirection(0);
  }, [leadResumoSelecionado?.id]);

  const handleLeadModalTabChange = (next: GesiteLeadsTableTab) => {
    if (next === leadModalTela) return;
    setLeadModalTabDirection(GESITE_LEAD_MODAL_TAB_ORDER[next] - GESITE_LEAD_MODAL_TAB_ORDER[leadModalTela]);
    setLeadModalTela(next);
  };

  useEffect(() => {
    setLeadsPage((p) => Math.min(p, totalLeadsSectionPages - 1));
  }, [totalLeadsSectionPages]);

  useImperativeHandle(
    ref,
    () => ({
      getExportRows: () => buildGesiteLeadsExportRows(sortedLeadsRows),
    }),
    [sortedLeadsRows],
  );

  return (
    <div className="flex flex-col">
      <MotionReveal index={0} className="space-y-5">
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3 sm:gap-5">
          <div className={cn('flex flex-wrap items-center gap-3 sm:justify-self-start')}>
            <TabButtons
              value={leadsTableTab}
              onChange={handleLeadsTableTabChange}
              items={GESITE_LEADS_TAB_BUTTON_ITEMS}
            />
          </div>
          <div className="w-full sm:justify-self-center sm:max-w-md">
            <Input
              value={leadsSearchQuery}
              onChange={(e) => setLeadsSearchQuery(e.target.value)}
              placeholder="Busca por nome, número, e-mail..."
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
          </div>
        </div>
        <AnimatePresence mode="wait">
          {leadsViewMode === 'table' ? (
            <motion.div
              key="gesite-leads-table"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden rounded-xl border border-border bg-muted/40 dark:bg-card"
            >
              <div className="overflow-x-auto">
                <GesiteAnimatedTabPanel viewKey={leadsTableViewKey} direction={leadsTableViewDirection}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                        {leadsTableColumns.map((col) => {
                          const isActive = leadsSortKey === col.key;
                          const SortIcon = leadsSortDirection === 'asc' ? ArrowUp : ArrowDown;
                          const minWidthClass = gesiteLeadColMinWidthClass(col.key);
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
                    <LayoutGroup id="gesite-leads-rows">
                      <tbody>
                        <AnimatePresence initial={false}>
                          {paginatedLeadsRows.map((row) => (
                            <MotionFlipListItem
                              key={row.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Abrir resumo do lead ${row.nome}`}
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
                                <td key={col.key} className={gesiteLeadTdClassName(col.key)}>
                                  {gesiteLeadCellContent(row, col.key)}
                                </td>
                              ))}
                            </MotionFlipListItem>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </LayoutGroup>
                  </table>
                </GesiteAnimatedTabPanel>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="gesite-leads-cards"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <GesiteAnimatedTabPanel viewKey={leadsTableViewKey} direction={leadsTableViewDirection}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {paginatedLeadsRows.map((row, index) => (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="h-full"
                    >
                      <GesiteLeadCard
                        row={row}
                        tab={leadsTableTab}
                        onClick={() => setLeadResumoSelecionado(row)}
                        className="h-full min-h-[15.5rem]"
                      />
                    </motion.div>
                  ))}
                </div>
              </GesiteAnimatedTabPanel>
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
                  <span className="font-medium text-foreground">{leadResumoSelecionado.nome}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · capturado em {new Date(leadResumoSelecionado.dataHora).toLocaleString()}
                  </span>
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">Detalhes do lead selecionado.</DialogDescription>
              )}
            </DialogHeader>

            <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-muted/15 to-background px-6 py-5">
              {leadResumoSelecionado ? (
                <GesiteLeadModalTabPanels
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
                  items={GESITE_LEADS_TAB_BUTTON_ITEMS}
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
                  const md = gesiteLeadResumoMarkdown(row);
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

/** @deprecated Use GesiteLeadsOperacionalView */
export const GeSiteLeads = GesiteLeadsOperacionalView;
