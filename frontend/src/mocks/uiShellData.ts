import type { Category, System, User } from '@/types';
import type {
  CompanyProfileApp,
  RequestChannel,
  Statement,
  Team,
  TeamLifecycleStatus,
} from '@/services/supabase';

export const uiShellUser: User = {
  id: 'user-ui-shell-001',
  name: 'Usuário Demo',
  email: 'usuario.demo@example.com',
  role: 'user',
  accessType: 'user',
  profileStatus: 'active',
  avatar: '/assets/banners/demo/1.jpg',
  createdAt: new Date('2026-01-15T09:00:00.000Z'),
};

export const uiShellAdminUser: User = {
  id: 'admin-ui-shell-001',
  name: 'Admin Demo',
  email: 'admin.demo@example.com',
  role: 'admin',
  accessType: 'admin',
  profileStatus: 'active',
  avatar: '/assets/banners/demo/1.jpg',
  createdAt: new Date('2025-08-01T09:00:00.000Z'),
};

/** UI shell: categorias vazias (telas de listagem / admin em estado vazio). */
export const uiShellCategories: Category[] = [];

/** UI shell: sem apps de exemplo no hub. */
export const uiShellSystems: System[] = [];

/** UI shell: sem equipes mockadas. */
export const uiShellTeams: Team[] = [];

/** UI shell: sem canais de solicitação. */
export const uiShellRequestChannels: RequestChannel[] = [];

/** UI shell: sem comunicados. */
export const uiShellStatements: Statement[] = [];

/** UI shell: empresa em branco (empty state visual na tela Empresa). */
export const uiShellCompanyProfile: CompanyProfileApp = {
  name: '',
  logo: '',
  description: '',
  segment: '',
  createdAt: '',
  location: '',
  site: '',
  phone: '',
  email: '',
  cnpj: '',
  geTeamsWorkspace: '',
  geTeamsWorkspaceId: '',
};

export const uiShellTeamStatuses: TeamLifecycleStatus[] = ['active', 'archived', 'deleted'];
