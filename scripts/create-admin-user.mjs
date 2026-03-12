#!/usr/bin/env node
/**
 * Cria o usuário admin do GêApps no Supabase (Auth + profiles) e valida.
 *
 * Uso:
 *   npm run create-admin-user
 *
 * Ou com variáveis na hora:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/create-admin-user.mjs
 *
 * A chave service_role está em: Supabase Dashboard → Settings → API → service_role (secret)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function loadEnv() {
  const paths = [join(rootDir, '.env'), join(rootDir, '.env.local')];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    const content = readFileSync(p, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    break;
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = 'admingeapps@genesisempreendimentos.com.br';
const ADMIN_PASSWORD = 'Admingeapps123@';
const ADMIN_NAME = 'Admin GêApps';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env ou .env.local');
    console.error('   A chave service_role: Dashboard → Settings → API → service_role (secret)');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔐 Criando usuário admin no Auth...');

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { name: ADMIN_NAME },
  });

  if (authError) {
    if (authError.message?.includes('already been registered') || authError.code === 'user_already_exists') {
      console.log('⚠️ Usuário já existe no Auth. Garantindo perfil em profiles...');
    } else {
      console.error('❌ Erro ao criar usuário no Auth:', authError.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Usuário criado no Auth:', authUser.user?.id);
  }

  let uid = authUser?.user?.id;
  if (!uid) {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = list?.users?.find((x) => x.email === ADMIN_EMAIL);
    uid = u?.id;
    if (uid) console.log('   ID do usuário existente:', uid);
  }
  if (!uid) {
    console.error('❌ Não foi possível obter o ID do usuário no Auth.');
    process.exit(1);
  }

  console.log('📋 Inserindo/atualizando perfil em public.profiles...');

  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ADMIN_NAME)}`;
  const withId = { id: uid, full_name: ADMIN_NAME, avatar_url: avatarUrl, role: 'admin', email: ADMIN_EMAIL };
  const withUserId = { user_id: uid, full_name: ADMIN_NAME, avatar_url: avatarUrl, role: 'admin', email: ADMIN_EMAIL };

  let profileOk = false;
  for (const payload of [withId, withUserId]) {
    const { error: insertErr } = await supabase.from('profiles').insert(payload);
    if (!insertErr) {
      profileOk = true;
      console.log('✅ Perfil criado em profiles.');
      break;
    }
    if (insertErr.code === '23505') {
      const { error: updateErr } = await supabase.from('profiles').update({
        full_name: ADMIN_NAME,
        avatar_url: avatarUrl,
        role: 'admin',
        email: ADMIN_EMAIL,
      }).eq(payload.id !== undefined ? 'id' : 'user_id', uid);
      if (!updateErr) {
        profileOk = true;
        console.log('✅ Perfil já existia; role/email atualizados.');
        break;
      }
    }
  }

  if (!profileOk) {
    console.warn('⚠️ Ajuste o perfil manualmente no Supabase (Dashboard → Table Editor → profiles) com role=admin.');
  }

  console.log('\n✅ Validação: faça login na tela de login com:');
  console.log('   Email:', ADMIN_EMAIL);
  console.log('   Senha:', ADMIN_PASSWORD);
  console.log('   Atalho: Ctrl+Shift+A → verifica access_type; se não for softadmin, redireciona para /access-denied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
