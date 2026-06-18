import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'GeImage';
const PREFIX = 'empreendimentos';
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

function extFromMime(mime, originalname) {
  const byMime = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  if (byMime[mime]) return byMime[mime];

  const ext = path.extname(String(originalname ?? '')).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
    return ext === '.jpeg' ? '.jpg' : ext;
  }
  return '.png';
}

export function validateEmpreendimentoLogoFile(file) {
  if (!file?.buffer?.length) {
    throw Object.assign(new Error('Arquivo é obrigatório.'), { statusCode: 400 });
  }
  if (file.buffer.length > MAX_BYTES) {
    throw Object.assign(new Error('Imagem deve ter no máximo 2 MB.'), { statusCode: 400 });
  }
  const mime = String(file.mimetype ?? '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw Object.assign(new Error('Formato inválido. Use PNG, JPEG, WebP, GIF ou SVG.'), {
      statusCode: 400,
    });
  }
}

export async function uploadEmpreendimentoLogo(supabaseUrl, serviceRoleKey, file) {
  validateEmpreendimentoLogoFile(file);

  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error('Storage não configurado no servidor (SUPABASE_SERVICE_ROLE_KEY).'), {
      statusCode: 500,
    });
  }

  const storagePath = `${PREFIX}/${randomUUID()}${extFromMime(file.mimetype, file.originalname)}`;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file.buffer, {
    contentType: file.mimetype || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    console.error('[empreendimentos/logo] Supabase upload:', error.message);
    throw Object.assign(new Error(error.message || 'Falha no upload.'), { statusCode: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return { url: data.publicUrl, path: storagePath };
}
