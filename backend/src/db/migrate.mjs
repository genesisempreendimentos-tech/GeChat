import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runMigrationStatements } from './neon.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true });

const migrationsDir = path.join(__dirname, 'migrations');

export async function ensureGeChatSchema() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));
    await runMigrationStatements(statements);
    console.log(`[gechat] Migration aplicada: ${file}`);
  }
  console.log('[gechat] Schema verificado/aplicado.');
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  ensureGeChatSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[gechat] Falha na migration:', err);
      process.exit(1);
    });
}
