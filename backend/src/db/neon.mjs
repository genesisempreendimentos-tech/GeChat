import { neon } from '@neondatabase/serverless';

let sql = null;

export function getSql() {
  if (sql) return sql;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada no backend/.env');
  }
  sql = neon(databaseUrl);
  return sql;
}

export async function runMigrationStatements(statements) {
  const db = getSql();
  for (const statement of statements) {
    const trimmed = statement.trim();
    if (!trimmed) continue;
    await db.query(trimmed);
  }
}
