import fs from 'fs';
import path from 'path';
import http from 'http';
import net from 'net';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import { createAuthRouter } from './routes/auth.mjs';
import { createGeChatRouter } from './routes/gechat.mjs';
import { createAdminRouter } from './routes/admin.mjs';
import { createSocketServer } from './realtime/socket-server.mjs';
import { ensureGeChatSchema } from './db/migrate.mjs';
import { logDevServerUrls } from './lib/dev-network.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const app = express();
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Corpo da requisição JSON inválido.' });
  }
  next(err);
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const DEFAULT_PORT = Number(process.env.SERVER_PORT) || 3001;
const SERVER_HOST = process.env.SERVER_HOST || '0.0.0.0';
const MAX_PORT_RETRIES = Number(process.env.SERVER_PORT_RETRY_COUNT) || 30;
const ACTIVE_PORT_FILE = path.join(__dirname, '..', '.server-port');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
app.locals.supabaseUrl = supabaseUrl;
app.locals.supabaseAnonKey = supabaseAnonKey;
app.locals.supabaseServiceRoleKey = supabaseServiceRoleKey;

if (supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    console.log('[server] Supabase (validação JWT):', hostname);
  } catch {
    console.warn('[server] SUPABASE_URL inválida em backend/.env.');
  }
} else {
  console.warn('[server] Defina SUPABASE_URL e SUPABASE_ANON_KEY no .env do backend.');
}

if (!process.env.DATABASE_URL) {
  console.warn('[server] DATABASE_URL não definida — módulo GêChat indisponível.');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'gechat', gechat: Boolean(process.env.DATABASE_URL) });
});

app.use('/api/auth', createAuthRouter());
app.use('/api/gechat', createGeChatRouter());
app.use('/api/admin', createAdminRouter());

app.use(express.static(distPath));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota de API não encontrada.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

function clearActivePortFile() {
  try {
    if (fs.existsSync(ACTIVE_PORT_FILE)) fs.unlinkSync(ACTIVE_PORT_FILE);
  } catch (err) {
    console.warn('[server] Não foi possível limpar .server-port:', err?.message ?? err);
  }
}

function persistActivePort(port) {
  try {
    fs.writeFileSync(ACTIVE_PORT_FILE, String(port), 'utf8');
  } catch (err) {
    console.warn('[server] Não foi possível salvar .server-port:', err?.message ?? err);
  }
}

const httpServer = http.createServer(app);
createSocketServer(httpServer, app);

function findAvailablePort(startPort, retriesLeft) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (err) => {
      probe.close();
      if (err?.code === 'EADDRINUSE' && retriesLeft > 0) {
        resolve(findAvailablePort(startPort + 1, retriesLeft - 1));
        return;
      }
      reject(err);
    });
    probe.once('listening', () => {
      probe.close(() => resolve(startPort));
    });
    probe.listen(startPort);
  });
}

async function startServer() {
  if (process.env.DATABASE_URL) {
    try {
      await ensureGeChatSchema();
    } catch (err) {
      console.error('[server] Falha ao aplicar schema GêChat:', err?.message ?? err);
    }
  }

  const port = await findAvailablePort(DEFAULT_PORT, MAX_PORT_RETRIES);

  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, SERVER_HOST, () => {
      httpServer.off('error', reject);
      persistActivePort(port);
      logDevServerUrls({ label: 'server', port, host: SERVER_HOST });
      resolve();
    });
  });
}

clearActivePortFile();
startServer().catch((err) => {
  console.error('[server] Falha ao iniciar API:', err);
  process.exit(1);
});
