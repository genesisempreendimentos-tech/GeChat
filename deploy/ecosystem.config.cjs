/** PM2 — rodar na VPS: pm2 start deploy/ecosystem.config.cjs */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'backend', '.env');

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile(ENV_PATH);
const serverPort = Number(fileEnv.SERVER_PORT) || 3001;

module.exports = {
  apps: [
    {
      name: 'geleads',
      cwd: path.join(ROOT, 'backend'),
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: String(serverPort),
        ...fileEnv,
      },
      error_file: path.join(ROOT, 'logs', 'pm2-error.log'),
      out_file: path.join(ROOT, 'logs', 'pm2-out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};
