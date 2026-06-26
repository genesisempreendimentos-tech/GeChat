import { getSql } from '../../db/neon.mjs';

const DEFAULT_PRIVACY = {
  readReceiptsEnabled: true,
  lastSeenVisible: true,
};

function mapRow(userId, row) {
  if (!row) {
    return { userId, ...DEFAULT_PRIVACY };
  }
  return {
    userId,
    readReceiptsEnabled: row.read_receipts_enabled,
    lastSeenVisible: row.last_seen_visible,
  };
}

export async function getUserPrivacy(userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT read_receipts_enabled, last_seen_visible
    FROM gechat_user_privacy
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return mapRow(userId, rows[0]);
}

export async function getPrivacyForUsers(userIds) {
  if (!userIds.length) return {};
  const sql = getSql();
  const rows = await sql`
    SELECT user_id, read_receipts_enabled, last_seen_visible
    FROM gechat_user_privacy
    WHERE user_id = ANY(${userIds})
  `;
  const byId = Object.fromEntries(rows.map((r) => [r.user_id, r]));
  return Object.fromEntries(
    userIds.map((id) => [id, mapRow(id, byId[id])]),
  );
}

export async function updateUserPrivacy(userId, patch = {}) {
  const readReceiptsEnabled =
    patch.readReceiptsEnabled !== undefined ? Boolean(patch.readReceiptsEnabled) : undefined;
  const lastSeenVisible =
    patch.lastSeenVisible !== undefined ? Boolean(patch.lastSeenVisible) : undefined;

  if (readReceiptsEnabled === undefined && lastSeenVisible === undefined) {
    return getUserPrivacy(userId);
  }

  const current = await getUserPrivacy(userId);
  const next = {
    readReceiptsEnabled: readReceiptsEnabled ?? current.readReceiptsEnabled,
    lastSeenVisible: lastSeenVisible ?? current.lastSeenVisible,
  };

  const sql = getSql();
  await sql`
    INSERT INTO gechat_user_privacy (user_id, read_receipts_enabled, last_seen_visible, updated_at)
    VALUES (${userId}, ${next.readReceiptsEnabled}, ${next.lastSeenVisible}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      read_receipts_enabled = ${next.readReceiptsEnabled},
      last_seen_visible = ${next.lastSeenVisible},
      updated_at = NOW()
  `;

  return { userId, ...next };
}

export function canViewerSeePresence(viewerPrivacy, targetPrivacy) {
  return Boolean(viewerPrivacy?.lastSeenVisible && targetPrivacy?.lastSeenVisible);
}

export function maskPresenceForViewer(viewerPrivacy, targetId, targetPrivacy, raw) {
  if (!canViewerSeePresence(viewerPrivacy, targetPrivacy)) {
    return {
      userId: targetId,
      online: false,
      lastSeenAt: null,
      presenceHidden: true,
    };
  }
  return {
    userId: targetId,
    online: raw.online ?? false,
    lastSeenAt: raw.lastSeenAt ?? null,
    presenceHidden: false,
  };
}
