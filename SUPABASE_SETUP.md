# Configuração do Supabase

## 1. Execute este SQL COMPLETO no Supabase SQL Editor

**⚠️ COPIE TODO O BLOCO ABAIXO E EXECUTE DE UMA VEZ**

```sql
-- ============================================
-- GESTACK - CONFIGURAÇÃO COMPLETA DO BANCO
-- ============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LIMPAR TABELAS E TRIGGERS EXISTENTES
-- ============================================

-- Remover triggers existentes
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_systems_updated_at ON public.systems;

-- Remover tabelas (CASCADE remove as dependências)
DROP TABLE IF EXISTS public.access_logs CASCADE;
DROP TABLE IF EXISTS public.user_systems CASCADE;
DROP TABLE IF EXISTS public.systems CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Remover função se existir
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- CRIAR TABELAS
-- ============================================

-- Tabela de usuários (sincronizada com auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  avatar VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sistemas
CREATE TABLE public.systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  url VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN ('RH', 'Financeiro', 'Marketing', 'Arquitetura', 'Ferramentas')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de acessos de usuários aos sistemas
CREATE TABLE public.user_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  system_id UUID REFERENCES public.systems(id) ON DELETE CASCADE,
  can_access BOOLEAN DEFAULT true,
  favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, system_id)
);

-- Tabela de logs de acesso
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  system_id UUID REFERENCES public.systems(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CRIAR ÍNDICES
-- ============================================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_user_systems_user_id ON public.user_systems(user_id);
CREATE INDEX idx_user_systems_system_id ON public.user_systems(system_id);
CREATE INDEX idx_user_systems_favorite ON public.user_systems(user_id, favorite) WHERE favorite = true;
CREATE INDEX idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_system_id ON public.access_logs(system_id);
CREATE INDEX idx_access_logs_timestamp ON public.access_logs(timestamp DESC);

-- ============================================
-- CRIAR FUNÇÃO E TRIGGERS
-- ============================================

-- Função para atualizar updated_at
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_systems_updated_at
  BEFORE UPDATE ON public.systems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERIR DADOS INICIAIS
-- ============================================

-- Inserir todos os sistemas Gê*
INSERT INTO public.systems (name, description, icon, url, category, active) VALUES
  ('GêSite', 'Gestão de sites e páginas web', 'Globe2', 'https://gesite.gestack.com', 'Ferramentas', true),
  ('GêTask', 'Gerenciamento de tarefas e projetos', 'ListChecks', 'https://getask.gestack.com', 'Ferramentas', true),
  ('GêForms', 'Criação e gestão de formulários', 'FileEdit', 'https://geforms.gestack.com', 'Ferramentas', true),
  ('GêReserva', 'Sistema de reservas e agendamentos', 'CalendarCheck', 'https://gereserva.gestack.com', 'Ferramentas', true),
  ('GêSup', 'Suporte e atendimento ao cliente', 'MessageCircleQuestion', 'https://gesup.gestack.com', 'Ferramentas', true),
  ('GêBoard', 'Quadros kanban e gestão visual', 'LayoutDashboard', 'https://geboard.gestack.com', 'Ferramentas', true),
  ('GêShow', 'Apresentações e slides corporativos', 'Monitor', 'https://geshow.gestack.com', 'Ferramentas', true),
  ('GêSenha', 'Gerenciador de senhas empresarial', 'KeyRound', 'https://gesenha.gestack.com', 'Ferramentas', true),
  ('GêLinks', 'Encurtador e gestão de links', 'Link2', 'https://gelinks.gestack.com', 'Ferramentas', true),
  ('GêMidia', 'Biblioteca de mídia e arquivos', 'Images', 'https://gemidia.gestack.com', 'Ferramentas', true),
  ('GêCode', 'Editor de código colaborativo', 'Code2', 'https://gecode.gestack.com', 'Ferramentas', true),
  ('GêTeam', 'Gestão de equipes e colaboradores', 'UsersRound', 'https://geteam.gestack.com', 'RH', true),
  ('GêChat', 'Chat corporativo e comunicação em tempo real', 'MessageSquare', 'https://gechat.gestack.com', 'Ferramentas', true),
  ('GêCursos', 'Plataforma de treinamentos e cursos corporativos', 'GraduationCap', 'https://gecursos.gestack.com', 'RH', true);

-- ============================================
-- CONCLUÍDO! ✓
-- ============================================
```

## 2. Configure as Políticas RLS (Row Level Security)

**⚠️ EXECUTE ESTE SEGUNDO BLOCO APÓS O PRIMEIRO**

```sql
-- ============================================
-- GESTACK - POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS: TABELA USERS
-- ============================================

-- Permitir INSERT para novos usuários (cadastro)
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Todos podem ver todos os usuários
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  USING (true);

-- Usuários podem atualizar seus próprios dados
DROP POLICY IF EXISTS "users_update_own_policy" ON public.users;
CREATE POLICY "users_update_own_policy"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Admins podem fazer qualquer coisa com users
DROP POLICY IF EXISTS "users_admin_all_policy" ON public.users;
CREATE POLICY "users_admin_all_policy"
  ON public.users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS: TABELA SYSTEMS
-- ============================================

-- Todos podem ver sistemas ativos
DROP POLICY IF EXISTS "systems_select_policy" ON public.systems;
CREATE POLICY "systems_select_policy"
  ON public.systems FOR SELECT
  USING (active = true);

-- Admins podem gerenciar sistemas
DROP POLICY IF EXISTS "systems_admin_policy" ON public.systems;
CREATE POLICY "systems_admin_policy"
  ON public.systems FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS: TABELA USER_SYSTEMS
-- ============================================

-- Usuários podem inserir seus próprios acessos
DROP POLICY IF EXISTS "user_systems_insert_policy" ON public.user_systems;
CREATE POLICY "user_systems_insert_policy"
  ON public.user_systems FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuários podem ver seus próprios acessos
DROP POLICY IF EXISTS "user_systems_select_policy" ON public.user_systems;
CREATE POLICY "user_systems_select_policy"
  ON public.user_systems FOR SELECT
  USING (user_id = auth.uid());

-- Usuários podem atualizar seus próprios acessos (favoritos)
DROP POLICY IF EXISTS "user_systems_update_policy" ON public.user_systems;
CREATE POLICY "user_systems_update_policy"
  ON public.user_systems FOR UPDATE
  USING (user_id = auth.uid());

-- Admins podem gerenciar todos os acessos
DROP POLICY IF EXISTS "user_systems_admin_policy" ON public.user_systems;
CREATE POLICY "user_systems_admin_policy"
  ON public.user_systems FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- POLÍTICAS: TABELA ACCESS_LOGS
-- ============================================

-- Usuários podem criar seus próprios logs
DROP POLICY IF EXISTS "access_logs_insert_policy" ON public.access_logs;
CREATE POLICY "access_logs_insert_policy"
  ON public.access_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuários podem ver seus próprios logs
DROP POLICY IF EXISTS "access_logs_select_own_policy" ON public.access_logs;
CREATE POLICY "access_logs_select_own_policy"
  ON public.access_logs FOR SELECT
  USING (user_id = auth.uid());

-- Admins podem ver todos os logs
DROP POLICY IF EXISTS "access_logs_admin_policy" ON public.access_logs;
CREATE POLICY "access_logs_admin_policy"
  ON public.access_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SEGURANÇA CONFIGURADA! ✓
-- ============================================
```

## 3. Configurar Authentication

### No painel do Supabase:

1. Vá em **Authentication > Settings**

2. **Email Auth**:
   - ✅ Certifique-se que está habilitado
   - ⚠️ **Confirm Email**: 
     - Para **produção**: Deixe habilitado
     - Para **testes/desenvolvimento**: Desabilite para permitir login imediato sem verificar email

3. **Rate Limits** (IMPORTANTE):
   - Se você estiver vendo erro "email rate limit exceeded":
   - Vá em **Authentication > Rate Limits**
   - Aumente os valores ou aguarde alguns minutos
   - Padrão é 3-4 cadastros por hora por IP
   - **Solução rápida**: Aguarde 2-3 minutos entre tentativas

4. **Email Templates**:
   - Configure conforme necessário para emails de confirmação

5. **Auth Providers**:
   - Deixe apenas **Email** habilitado

## 4. Testar a Configuração

### ⚠️ IMPORTANTE - Sobre Rate Limiting:
O Supabase tem proteção contra spam de cadastros. Se você ver "email rate limit exceeded":
- **Aguarde 2-3 minutos** antes de tentar novamente
- Ou aumente os limites em **Authentication > Rate Limits**
- Limite padrão: ~3-4 cadastros por hora por IP

### Testando:

1. **Abra o Console do navegador** (F12)
2. Acesse `/signup` no GeStack
3. Crie uma conta com email `@genesisempreendimentos.com.br`
4. **Se receber erro de rate limit**: Aguarde alguns minutos
5. Se a confirmação de email estiver habilitada, confirme o email
6. Faça login em `/login`
7. Você deve ser redirecionado para o dashboard

## 5. Criar Primeiro Admin

Para transformar um usuário em admin, execute:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'seu.email@genesisempreendimentos.com.br';
```

## Pronto! 🎉

Agora o GeStack está totalmente integrado com o Supabase.
