import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runMigrationStatements } from './neon.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true });

const migrationsDir = path.join(__dirname, 'migrations');

function stripSqlComments(statement) {
  return statement
    .replace(/^\s*(--[^\n]*\n)+/g, '')
    .trim();
}

function parseMigrationStatements(sql) {
  return sql
    .split(';')
    .map((chunk) => stripSqlComments(chunk.trim()))
    .filter((statement) => statement.length > 0);
}

export async function ensureGeChatSchema() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = parseMigrationStatements(sql);
    if (!statements.length) {
      console.warn(`[gechat] Migration sem statements executáveis: ${file}`);
      continue;
    }
    await runMigrationStatements(statements);
    console.log(`[gechat] Migration aplicada: ${file} (${statements.length} statement(s))`);
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
