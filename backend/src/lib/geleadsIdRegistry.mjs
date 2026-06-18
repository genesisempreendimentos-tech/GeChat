import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { encodeGeleadsId } from './geleadsId.mjs';
import {
  normalizePersonCvcrmLeadId,
  normalizePersonEmail,
  normalizePersonPhone,
} from './personUnionKeys.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL = readFileSync(join(__dirname, '../../migrations/neon-geleads-id.sql'), 'utf8');

export const ENSURE_GELEADS_ID_SQL = MIGRATION_SQL;

const KEY_BATCH_SIZE = 500;

function keyToken(key_type, key_value) {
  return `${key_type}:${key_value}`;
}

function stableRowFingerprint(row) {
  const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  const created = Number.isFinite(createdAt.getTime()) ? createdAt.toISOString() : '';
  const source = String(row.source_table ?? '').trim();
  const name = String(row.name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const signupId = String(row.id ?? '').trim();
  return `${created}|${source}|${name}|${signupId}`;
}

/** Chave determinística para clusters sem email/telefone/cvcrm (estável entre rebuilds). */
export function buildClusterFallbackKeyValue(rows) {
  const fingerprints = rows.map(stableRowFingerprint).sort();
  return createHash('sha256').update(fingerprints.join('\n')).digest('hex');
}

/** Coleta chaves normalizadas do cluster (mesmas regras do union-find + fallback estável se vazio). */
export function collectClusterKeys(rows) {
  const keys = [];
  const seen = new Set();
  for (const row of rows) {
    const candidates = [
      ['email', normalizePersonEmail(row.email)],
      ['phone', normalizePersonPhone(row.phone)],
      ['cvcrm', normalizePersonCvcrmLeadId(row.cvcrm_lead_id)],
    ];
    for (const [key_type, key_value] of candidates) {
      if (!key_value) continue;
      const token = keyToken(key_type, key_value);
      if (seen.has(token)) continue;
      seen.add(token);
      keys.push({ key_type, key_value });
    }
  }
  if (keys.length === 0) {
    const key_value = buildClusterFallbackKeyValue(rows);
    keys.push({ key_type: 'fallback', key_value });
  }
  return keys;
}

export async function ensureGeleadsIdSchema(client) {
  await client.query(ENSURE_GELEADS_ID_SQL);
}

async function batchInsertRegistry(client, rows) {
  if (rows.length === 0) return;
  const params = [];
  const tuples = rows.map((row, i) => {
    const base = i * 3 + 1;
    params.push(row.geleads_id, row.seq, row.entry_date);
    return `($${base}, $${base + 1}, $${base + 2}, 'active', NULL)`;
  });
  await client.query(
    `INSERT INTO geleads_id_registry (geleads_id, seq, entry_date, status, merged_into)
     VALUES ${tuples.join(', ')}
     ON CONFLICT (geleads_id) DO NOTHING`,
    params,
  );
}

async function batchUpsertKeys(client, rows) {
  for (let i = 0; i < rows.length; i += KEY_BATCH_SIZE) {
    const chunk = rows.slice(i, i + KEY_BATCH_SIZE);
    const params = [];
    const tuples = chunk.map((row, j) => {
      const base = j * 3 + 1;
      params.push(row.key_type, row.key_value, row.geleads_id);
      return `($${base}, $${base + 1}, $${base + 2})`;
    });
    await client.query(
      `INSERT INTO geleads_id_keys (key_type, key_value, geleads_id)
       VALUES ${tuples.join(', ')}
       ON CONFLICT (key_type, key_value) DO UPDATE SET geleads_id = EXCLUDED.geleads_id`,
      params,
    );
  }
}

function sortMatchesByLowestSeq(matches) {
  return [...matches].sort((a, b) => {
    const seqDiff = Number(a.seq) - Number(b.seq);
    if (seqDiff !== 0) return seqDiff;
    return String(a.geleads_id).localeCompare(String(b.geleads_id));
  });
}

/**
 * Resolver em memória + flush em lote (uma transação).
 * Carrega registry e chaves no início; zero queries por cluster.
 */
export async function createGeleadsIdResolver(client) {
  const { rows: registryRows } = await client.query(`
    SELECT geleads_id, seq, status, merged_into, entry_date
    FROM geleads_id_registry
  `);
  const registryById = new Map(registryRows.map((r) => [r.geleads_id, { ...r }]));

  const { rows: keyRows } = await client.query(`
    SELECT key_type, key_value, geleads_id FROM geleads_id_keys
  `);
  const keyToGeleads = new Map(
    keyRows.map((r) => [keyToken(r.key_type, r.key_value), r.geleads_id]),
  );

  let nextSeq = registryRows.reduce((max, r) => Math.max(max, Number(r.seq) || 0), 0);
  const initialMaxSeq = nextSeq;

  const pendingRegistry = [];
  const pendingKeyUpserts = new Map();
  const pendingMerges = [];

  function resolveActiveMeta(geleadsId, seen = new Set()) {
    if (!geleadsId || seen.has(geleadsId)) return null;
    seen.add(geleadsId);
    const row = registryById.get(geleadsId);
    if (!row) return null;
    if (row.status === 'active') return row;
    if (row.status === 'merged' && row.merged_into) {
      return resolveActiveMeta(row.merged_into, seen);
    }
    return null;
  }

  function lookupActiveMatches(keys) {
    const byId = new Map();
    for (const key of keys) {
      const rawGeleadsId = keyToGeleads.get(keyToken(key.key_type, key.key_value));
      if (!rawGeleadsId) continue;
      const meta = resolveActiveMeta(rawGeleadsId);
      if (!meta) continue;
      if (!byId.has(meta.geleads_id)) byId.set(meta.geleads_id, meta);
    }
    return sortMatchesByLowestSeq([...byId.values()]);
  }

  function registerKeyUpserts(keys, geleadsId) {
    for (const key of keys) {
      const token = keyToken(key.key_type, key.key_value);
      pendingKeyUpserts.set(token, {
        key_type: key.key_type,
        key_value: key.key_value,
        geleads_id: geleadsId,
      });
      keyToGeleads.set(token, geleadsId);
    }
  }

  function mergeInMemory(survivorId, loserIds) {
    for (const loserId of loserIds) {
      if (!loserId || loserId === survivorId) continue;
      const loser = registryById.get(loserId);
      if (!loser || loser.status !== 'active') continue;
      if (!pendingMerges.some((m) => m.loserId === loserId)) {
        pendingMerges.push({ survivorId, loserId });
      }
      loser.status = 'merged';
      loser.merged_into = survivorId;
      for (const [token, gid] of keyToGeleads) {
        if (gid === loserId) keyToGeleads.set(token, survivorId);
      }
      for (const [token, row] of pendingKeyUpserts) {
        if (row.geleads_id === loserId) {
          pendingKeyUpserts.set(token, { ...row, geleads_id: survivorId });
        }
      }
    }
  }

  function allocateNew(entryDate) {
    nextSeq += 1;
    const seq = nextSeq;
    const geleadsId = encodeGeleadsId(seq);
    const row = {
      geleads_id: geleadsId,
      seq,
      entry_date: entryDate,
      status: 'active',
      merged_into: null,
    };
    registryById.set(geleadsId, row);
    pendingRegistry.push(row);
    return geleadsId;
  }

  return {
    /** @returns {string} geleads_id */
    resolveForCluster(clusterRows, entryDate) {
      const keys = collectClusterKeys(clusterRows);
      const matches = lookupActiveMatches(keys);

      if (matches.length === 0) {
        const geleadsId = allocateNew(entryDate);
        registerKeyUpserts(keys, geleadsId);
        return geleadsId;
      }

      if (matches.length === 1) {
        const geleadsId = matches[0].geleads_id;
        registerKeyUpserts(keys, geleadsId);
        return geleadsId;
      }

      const survivorId = matches[0].geleads_id;
      const loserIds = matches.slice(1).map((m) => m.geleads_id);
      mergeInMemory(survivorId, loserIds);
      registerKeyUpserts(keys, survivorId);
      return survivorId;
    },

    async flush() {
      const hasWork =
        pendingRegistry.length > 0 || pendingKeyUpserts.size > 0 || pendingMerges.length > 0;
      if (!hasWork && nextSeq === initialMaxSeq) return;

      await client.query('BEGIN');
      try {
        await batchInsertRegistry(client, pendingRegistry);

        for (const { survivorId, loserId } of pendingMerges) {
          await client.query(`UPDATE geleads_id_keys SET geleads_id = $1 WHERE geleads_id = $2`, [
            survivorId,
            loserId,
          ]);
          await client.query(
            `UPDATE geleads_id_registry
             SET status = 'merged', merged_into = $1
             WHERE geleads_id = $2 AND status = 'active'`,
            [survivorId, loserId],
          );
        }

        await batchUpsertKeys(client, [...pendingKeyUpserts.values()]);

        if (nextSeq > initialMaxSeq) {
          await client.query(`SELECT setval('geleads_id_seq', $1::bigint)`, [nextSeq]);
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      pendingRegistry.length = 0;
      pendingKeyUpserts.clear();
      pendingMerges.length = 0;
    },
  };
}

/** Desativa registry órfão (active sem pessoa correspondente no rebuild atual). */
export async function reconcileGeleadsRegistryActive(client, activeGeleadsIds) {
  if (activeGeleadsIds.length === 0) {
    await client.query(`
      UPDATE geleads_id_registry
      SET status = 'merged', merged_into = NULL
      WHERE status = 'active'
    `);
    return;
  }
  await client.query(
    `UPDATE geleads_id_registry
     SET status = 'merged', merged_into = NULL
     WHERE status = 'active' AND NOT (geleads_id = ANY($1::text[]))`,
    [activeGeleadsIds],
  );
}
