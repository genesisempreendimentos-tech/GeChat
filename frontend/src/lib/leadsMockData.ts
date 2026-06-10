import { computeLeadQualificacao } from '@/rules/qualifyLead';
import { parseLeadSequentialNumber } from '@/lib/leadDisplayId';
import { computeLeadsInfoboxStats, computePaginasFromLeads } from '@/lib/leadsMetrics';

export type LeadRelacionamento =
  | 'Solteiro(a)'
  | 'Namorando'
  | 'Noivo(a)'
  | 'União estável / Casado(a)';

export type LeadInvestimento =
  | 'Entre R$1000 e R$1700'
  | 'Entre R$1701 e R$2500'
  | 'Entre R$2501 e R$3500'
  | 'Acima de R$3500';

export type LeadPerfilTipo = 'Morador' | 'Investidor' | 'Corretor';

export type LeadMockRow = {
  id: string;
  dataHora: string;
  nome: string;
  contato: string;
  pagina: string;
  origem: string;
  canal: string;
  qualificacao: ReturnType<typeof computeLeadQualificacao>;
  email: string;
  telefone: string;
  relacionamento: LeadRelacionamento | '';
  investimento: LeadInvestimento | '';
  cidadeResidencia: string;
  dataNascimento: string;
  perfilLead: LeadPerfilTipo | '';
  perfilOutrasRespostas: string;
  dispositivo: string;
  pagamentoPreferencia: string;
  empreendimento: string;
  responsavel: string;
  parametro: string;
};

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fernando', 'Gabriela', 'Henrique',
  'Isabela', 'João', 'Juliana', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Patrícia',
  'Rafael', 'Samuel', 'Tatiana', 'Vinícius', 'Amanda', 'Caio', 'Daniela', 'Eduardo',
  'Fabiana', 'Gustavo', 'Helena', 'Igor', 'Larissa', 'Mateus', 'Natália', 'Otávio',
  'Paula', 'Renato', 'Sandra', 'Thiago', 'Vanessa', 'Wagner', 'Yasmin', 'Felipe',
] as const;

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Almeida',
  'Nunes', 'Rocha', 'Martins', 'Pereira', 'Carvalho', 'Gomes', 'Ribeiro', 'Barbosa',
  'Araújo', 'Melo', 'Cardoso', 'Teixeira', 'Monteiro', 'Moura', 'Correia', 'Cavalcanti',
  'Freitas', 'Pinto', 'Campos', 'Vieira', 'Moreira', 'Duarte',
] as const;

const EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'uol.com.br',
  'icloud.com', 'live.com', 'bol.com.br', 'terra.com.br', 'proton.me',
] as const;

const CIDADES = [
  'São Paulo — SP', 'Rio de Janeiro — RJ', 'Belo Horizonte — MG', 'Curitiba — PR',
  'Porto Alegre — RS', 'Brasília — DF', 'Salvador — BA', 'Fortaleza — CE',
  'Campinas — SP', 'Florianópolis — SC', 'Goiânia — GO', 'Recife — PE',
  'Santos — SP', 'Ribeirão Preto — SP', 'Niterói — RJ',
] as const;

const PAGINAS = [
  '/home', '/flores', '/sac', '/trabalhe-conosco', '/fornecedores',
  '/lancamentos', '/empreendimentos', '/quem-somos', '/contato',
] as const;

const EMPREENDIMENTOS = [
  'Residencial Aurora',
  'Vista Mar Premium',
  'Parque das Flores',
  'Horizonte Business',
  'Jardim Europa',
  'Skyline Tower',
  'Vila Verde',
  'Condomínio Atlântico',
] as const;

const RESPONSAVEIS = [
  'Marina Costa',
  'Pedro Alves',
  'Juliana Ribeiro',
  'Rafael Mendes',
  'Camila Duarte',
  'Lucas Ferreira',
] as const;

import { LEAD_PARAMETRO_LABELS } from '@/lib/leadParametro';

const ORIGEM_CANAL: { origem: string; canal: string; weight: number }[] = [
  { origem: 'Google', canal: 'Pesquisa', weight: 0.32 },
  { origem: 'Instagram', canal: 'Social', weight: 0.24 },
  { origem: 'Facebook', canal: 'Social', weight: 0.18 },
  { origem: 'LinkedIn', canal: 'Social', weight: 0.11 },
  { origem: 'Direto', canal: 'URL', weight: 0.15 },
];

const INVESTIMENTO_WEIGHTS: { value: LeadInvestimento; weight: number }[] = [
  { value: 'Entre R$1000 e R$1700', weight: 0.36 },
  { value: 'Entre R$1701 e R$2500', weight: 0.25 },
  { value: 'Entre R$2501 e R$3500', weight: 0.22 },
  { value: 'Acima de R$3500', weight: 0.17 },
];

const PERFIL_RESPOSTAS = [
  'Pretensão: apartamento 2 dorm.; Região: Zona Sul; Prazo: 6 meses.',
  'Primeiro imóvel; Financiamento: sim; Contato preferencial: WhatsApp.',
  'Moradia atual: aluguel; Interesse: investimento; Prazo: 12 meses.',
  'Profissão: engenheiro; Orçamento: até R$ 580 mil; Estacionamento: 2 vagas.',
  'Busca studio para locação; Perfil: investidor; Aceita obra.',
  'Família com 2 filhos; Escola próxima; Área de lazer imprescindível.',
] as const;

/** PRNG determinístico — mesma base de leads entre reloads. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rng: () => number, items: { value: T; weight: number }[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1]!.value;
}

function slugifyName(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function buildEmail(nome: string, rng: () => number, seq: number): string {
  const slug = slugifyName(nome);
  const [first = 'contato', last = 'lead'] = slug.split('.');
  const domain = EMAIL_DOMAINS[Math.floor(rng() * EMAIL_DOMAINS.length)]!;
  const pattern = Math.floor(rng() * 5);
  switch (pattern) {
    case 0:
      return `${first}.${last}@${domain}`;
    case 1:
      return `${first}${last}${String(10 + (seq % 89)).slice(-2)}@${domain}`;
    case 2:
      return `${first.charAt(0)}${last}@${domain}`;
    case 3:
      return `${first}_${last}@${domain}`;
    default:
      return `${first}.${last}.${1980 + (seq % 25)}@${domain}`;
  }
}

function buildPhone(rng: () => number): string {
  const ddd = [11, 21, 31, 41, 47, 48, 51, 61, 71, 85][Math.floor(rng() * 10)]!;
  const nine = 9;
  const block = String(Math.floor(rng() * 90000000) + 10000000);
  return `+55 ${ddd} ${nine}${block.slice(0, 4)}-${block.slice(4)}`;
}

function buildBirthDate(rng: () => number): string {
  const year = 1975 + Math.floor(rng() * 28);
  const month = 1 + Math.floor(rng() * 12);
  const day = 1 + Math.floor(rng() * 28);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function withQualificacao(
  row: Omit<LeadMockRow, 'qualificacao' | 'empreendimento' | 'responsavel' | 'parametro'> &
    Partial<Pick<LeadMockRow, 'empreendimento' | 'responsavel' | 'parametro'>>,
): LeadMockRow {
  const seq = parseLeadSequentialNumber(row.id) || 1;
  return {
    ...row,
    empreendimento: row.empreendimento ?? EMPREENDIMENTOS[seq % EMPREENDIMENTOS.length]!,
    responsavel: row.responsavel ?? RESPONSAVEIS[seq % RESPONSAVEIS.length]!,
    parametro: row.parametro ?? LEAD_PARAMETRO_LABELS[seq % LEAD_PARAMETRO_LABELS.length]!,
    qualificacao: computeLeadQualificacao(row as LeadMockRow),
  };
}

const LEADS_TABLE_SEED_BASE: Omit<LeadMockRow, 'qualificacao' | 'empreendimento' | 'responsavel' | 'parametro'>[] = [
  {
    id: 'lead-001',
    dataHora: '2026-04-28T10:12:00-03:00',
    nome: 'Ana Beatriz Costa',
    contato: 'ana.beatriz.costa@gmail.com',
    pagina: '/lancamentos',
    origem: 'Google',
    canal: 'Pesquisa',
    email: 'ana.beatriz.costa@gmail.com',
    telefone: '+55 11 98765-1201',
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
    nome: 'Bruno Henrique Lima',
    contato: '+55 21 99876-5432',
    pagina: '/empreendimentos',
    origem: 'Instagram',
    canal: 'Social',
    email: '',
    telefone: '+55 21 99876-5432',
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
    nome: 'Carla Fernanda Nunes',
    contato: 'carla.nunes@outlook.com',
    pagina: '/quem-somos',
    origem: 'LinkedIn',
    canal: 'Social',
    email: 'carla.nunes@outlook.com',
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
    nome: 'Diego Alves Rocha',
    contato: '+55 19 99741-8820',
    pagina: '/contato',
    origem: 'Direto',
    canal: 'Direto',
    email: 'diego.rocha@hotmail.com',
    telefone: '+55 19 99741-8820',
    relacionamento: 'Namorando',
    investimento: 'Entre R$1000 e R$1700',
    cidadeResidencia: 'Campinas — SP',
    dataNascimento: '01/11/2000',
    perfilLead: 'Morador',
    perfilOutrasRespostas: 'Primeiro imóvel; Orçamento apertado; Preferência por planta compacta.',
    dispositivo: 'Tablet',
    pagamentoPreferencia: 'Cartão / parcelado',
  },
  {
    id: 'lead-005',
    dataHora: '2026-04-27T14:05:00-03:00',
    nome: 'Elisa Martins Pereira',
    contato: 'elisa.martins@uol.com.br',
    pagina: '/lancamentos',
    origem: 'Facebook',
    canal: 'Social',
    email: 'elisa.martins@uol.com.br',
    telefone: '+55 47 99911-4455',
    relacionamento: 'Noivo(a)',
    investimento: 'Entre R$1701 e R$2500',
    cidadeResidencia: 'Florianópolis — SC',
    dataNascimento: '03/12/1996',
    perfilLead: 'Corretor',
    perfilOutrasRespostas: 'Cliente indicado; Financiamento: em análise; Contato preferencial: e-mail.',
    dispositivo: 'Celular',
    pagamentoPreferencia: 'Cartão / parcelado',
  },
  {
    id: 'lead-006',
    dataHora: '2026-04-27T11:30:00-03:00',
    nome: 'Fernando Augusto Melo',
    contato: 'fernando.melo@yahoo.com.br',
    pagina: '/home',
    origem: 'Google',
    canal: 'Pesquisa',
    email: 'fernando.melo@yahoo.com.br',
    telefone: '',
    relacionamento: '',
    investimento: '',
    cidadeResidencia: '',
    dataNascimento: '',
    perfilLead: '',
    perfilOutrasRespostas: '',
    dispositivo: 'Computador',
    pagamentoPreferencia: '',
  },
  {
    id: 'lead-007',
    dataHora: '2026-04-26T17:45:00-03:00',
    nome: 'Gabriela Souza Carvalho',
    contato: 'gabriela.carvalho@gmail.com',
    pagina: '/flores',
    origem: 'Instagram',
    canal: 'Social',
    email: 'gabriela.carvalho@gmail.com',
    telefone: '+55 11 97654-3210',
    relacionamento: 'União estável / Casado(a)',
    investimento: 'Entre R$2501 e R$3500',
    cidadeResidencia: 'Santos — SP',
    dataNascimento: '08/05/1988',
    perfilLead: 'Morador',
    perfilOutrasRespostas: 'Busca apartamento frente mar; 3 dormitórios; Vaga dupla.',
    dispositivo: 'Celular',
    pagamentoPreferencia: 'Financiamento',
  },
  {
    id: 'lead-008',
    dataHora: '2026-04-26T09:15:00-03:00',
    nome: 'Henrique Vieira Santos',
    contato: '+55 51 99123-7788',
    pagina: '/sac',
    origem: 'Direto',
    canal: 'URL',
    email: '',
    telefone: '+55 51 99123-7788',
    relacionamento: '',
    investimento: '',
    cidadeResidencia: '',
    dataNascimento: '',
    perfilLead: '',
    perfilOutrasRespostas: '',
    dispositivo: 'Celular',
    pagamentoPreferencia: '',
  },
];

function createLeadsTimeSeriesMock(reference: Date = new Date()): LeadMockRow[] {
  const rng = mulberry32(20260428);
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const rels: LeadRelacionamento[] = [
    'Solteiro(a)', 'Namorando', 'Noivo(a)', 'União estável / Casado(a)',
  ];
  const perfis: LeadPerfilTipo[] = ['Morador', 'Investidor', 'Corretor'];
  const pagamentos = ['PIX', 'Financiamento', 'Cartão / parcelado', 'Transferência'] as const;

  const out: LeadMockRow[] = [];
  let seq = 9;

  for (let d = 0; d < 400; d++) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);
    const count = 1 + (d % 4);

    for (let j = 0; j < count; j++) {
      const dt = new Date(day);
      dt.setHours(9 + (j % 8), (j * 11 + d) % 55, 0, 0);

      const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]!;
      const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]!;
      const nome = `${first} ${last}`;
      const emailPrimary = rng() < 0.58;
      const email = emailPrimary ? buildEmail(nome, rng, seq) : '';
      const phone = !emailPrimary || rng() < 0.38 ? buildPhone(rng) : '';
      const contato = emailPrimary ? email : phone;

      const origemPick = pickWeighted(rng, ORIGEM_CANAL.map((o) => ({ value: o, weight: o.weight })));
      const dispositivo = pickWeighted(rng, [
        { value: 'Celular', weight: 0.57 },
        { value: 'Computador', weight: 0.33 },
        { value: 'Tablet', weight: 0.1 },
      ]);

      const profileComplete = rng() < 0.41;
      const partialProfile = !profileComplete && rng() < 0.18;

      let relacionamento: LeadRelacionamento | '' = '';
      let investimento: LeadInvestimento | '' = '';
      let cidadeResidencia = '';
      let dataNascimento = '';
      let perfilLead: LeadPerfilTipo | '' = '';
      let perfilOutrasRespostas = '';
      let pagamentoPreferencia = '';

      if (profileComplete) {
        relacionamento = rels[Math.floor(rng() * rels.length)]!;
        investimento = pickWeighted(rng, INVESTIMENTO_WEIGHTS);
        cidadeResidencia = CIDADES[Math.floor(rng() * CIDADES.length)]!;
        dataNascimento = buildBirthDate(rng);
        perfilLead = perfis[Math.floor(rng() * perfis.length)]!;
        perfilOutrasRespostas = PERFIL_RESPOSTAS[Math.floor(rng() * PERFIL_RESPOSTAS.length)]!;
        pagamentoPreferencia = pagamentos[Math.floor(rng() * pagamentos.length)]!;
      } else if (partialProfile) {
        if (rng() < 0.6) relacionamento = rels[Math.floor(rng() * rels.length)]!;
        if (rng() < 0.5) cidadeResidencia = CIDADES[Math.floor(rng() * CIDADES.length)]!;
        if (rng() < 0.4) perfilLead = perfis[Math.floor(rng() * perfis.length)]!;
      }

      const rowBase: Omit<LeadMockRow, 'qualificacao' | 'empreendimento' | 'responsavel' | 'parametro'> = {
        id: `lead-gen-${seq}`,
        dataHora: dt.toISOString(),
        nome,
        contato,
        pagina: PAGINAS[Math.floor(rng() * PAGINAS.length)]!,
        origem: origemPick.origem,
        canal: origemPick.canal,
        email,
        telefone: phone,
        relacionamento,
        investimento,
        cidadeResidencia,
        dataNascimento,
        perfilLead,
        perfilOutrasRespostas,
        dispositivo,
        pagamentoPreferencia,
      };

      out.push(withQualificacao(rowBase));
      seq++;
    }
  }

  return out;
}

const LEADS_TABLE_SEED: LeadMockRow[] = LEADS_TABLE_SEED_BASE.map(withQualificacao);

export const LEADS_TABLE_MOCK: LeadMockRow[] = [
  ...LEADS_TABLE_SEED,
  ...createLeadsTimeSeriesMock(),
];

/** Derivado dos mocks — alinhado às métricas reais de Dados. */
export const LEADS_INFOBOX_MOCK = computeLeadsInfoboxStats(LEADS_TABLE_MOCK);

export const LEADS_PAGINAS_TABLE_MOCK = computePaginasFromLeads(LEADS_TABLE_MOCK);
