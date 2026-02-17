# GeStack 🚀

> Hub Central de Sistemas Corporativos

GeStack é uma plataforma SaaS moderna que centraliza todos os sistemas corporativos de uma empresa em um único painel intuitivo e eficiente.

![GeStack](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## ✨ Características

- **Dashboard Intuitivo**: Visão geral de todos os sistemas disponíveis
- **Gerenciamento de Sistemas**: Organize e categorize aplicações corporativas
- **Favoritos**: Acesso rápido aos sistemas mais utilizados
- **Controle de Acesso**: Gerenciamento granular de permissões por usuário
- **Logs de Atividade**: Rastreamento de acessos aos sistemas
- **Interface Moderna**: Design clean e profissional inspirado em Notion, Linear e Vercel
- **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Dark Mode Ready**: Preparado para tema escuro

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **Vite** - Framework e build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Componentes UI
- **Framer Motion** - Animações fluidas
- **React Router** - Navegação
- **Zustand** - Estado global
- **Lucide React** - Ícones

### Backend (Preparado)
- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Row Level Security** - Segurança avançada

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Passos

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/gestack.git
cd gestack
```

2. Instale as dependências
```bash
npm install
```

3. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

4. Acesse no navegador
```
http://localhost:5173
```

## 👤 Credenciais de Teste

### Administrador
- **Email**: admin@gestack.com
- **Senha**: admin123

### Gerente
- **Email**: carlos@gestack.com
- **Senha**: admin123

### Usuário
- **Email**: maria@gestack.com
- **Senha**: admin123

## 📁 Estrutura do Projeto

```
src/
├── components/        # Componentes reutilizáveis
│   ├── layout/       # Sidebar, Topbar
│   └── ui/           # Componentes Shadcn/UI
├── layouts/          # Layouts principais
│   ├── AuthLayout.tsx
│   └── MainLayout.tsx
├── pages/            # Páginas da aplicação
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── SystemsPage.tsx
│   ├── FavoritesPage.tsx
│   ├── UsersPage.tsx
│   └── SettingsPage.tsx
├── store/            # Estado global (Zustand)
│   ├── authStore.ts
│   ├── systemStore.ts
│   └── accessLogStore.ts
├── services/         # Camada de serviços
│   ├── supabase.ts
│   └── schema.sql
├── mock/             # Dados mockados
│   └── data.ts
├── types/            # TypeScript types
│   └── index.ts
├── lib/              # Utilitários
│   └── utils.ts
└── App.tsx           # Componente principal
```

## 🔧 Configuração do Supabase (Futuro)

O projeto está preparado para integração com Supabase. Para conectar:

1. Instale o cliente Supabase:
```bash
npm install @supabase/supabase-js
```

2. Crie um arquivo `.env`:
```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

3. Execute o schema SQL no Supabase:
```bash
# Copie o conteúdo de src/services/schema.sql
# Cole no SQL Editor do Supabase
```

4. Descomente o código em `src/services/supabase.ts`

## 📊 Funcionalidades por Página

### Dashboard
- Cards de estatísticas (sistemas disponíveis, favoritos, acessos)
- Sistemas favoritos para acesso rápido
- Atividade recente
- Grid com todos os sistemas disponíveis

### Sistemas
- Lista completa de sistemas
- Filtro por categoria
- Busca por nome ou descrição
- Ações: abrir, favoritar, editar (admin), remover (admin)

### Favoritos
- Sistemas marcados como favoritos
- Acesso rápido
- Possibilidade de remover dos favoritos

### Usuários (Admin only)
- Lista de todos os usuários
- Gerenciamento de permissões
- Criação de novos usuários
- Definição de acessos por sistema

## 🎨 Design System

### Cores
- **Primary**: Blue (#3B82F6)
- **Secondary**: Gray
- **Accent**: Light Blue
- **Destructive**: Red

### Componentes
Todos os componentes seguem o padrão Shadcn/UI com customizações para o tema GeStack.

## 🔐 Autenticação e Segurança

- Sistema de autenticação mock (preparado para Supabase)
- Proteção de rotas com ProtectedRoute
- Controle de acesso baseado em roles (admin, manager, user)
- Persistência de sessão via localStorage

## 📦 Build para Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

Desenvolvido por **Bruno Souza**

---

<div align="center">
  <strong>GeStack - Centralize. Organize. Simplifique.</strong>
</div>
