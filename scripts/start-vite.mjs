import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const BASE_PORT = Number(process.env.VITE_PORT || 5173);
const MAX_RETRIES = Number(process.env.VITE_PORT_RETRY_COUNT || 30);

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function pickPort(base, retries) {
  for (let i = 0; i <= retries; i += 1) {
    const port = base + i;
    // eslint-disable-next-line no-await-in-loop
    const ok = await canListen(port);
    if (ok) return port;
  }
  throw new Error(`Nenhuma porta livre no intervalo ${base}-${base + retries}`);
}

if (!fs.existsSync(viteCli)) {
  console.error('[vite] Não encontrado:', viteCli, '— rode npm install na raiz do projeto.');
  process.exit(1);
}

const port = await pickPort(BASE_PORT, MAX_RETRIES);
if (port !== BASE_PORT) {
  console.log(`[vite] Porta ${BASE_PORT} ocupada. Usando ${port}.`);
}

/** Node + binário do Vite (evita spawn de npx/.cmd no Windows — EINVAL no Node 24+). */
const child = spawn(
  process.execPath,
  [viteCli, '--port', String(port), '--strictPort'],
  {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  },
);

child.on('error', (err) => {
  console.error('[vite] Falha ao iniciar:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
