import { getSql } from '../../db/neon.mjs';

export async function updateLastSeen(userId) {
  const sql = getSql();
  await sql`
    INSERT INTO gechat_user_presence (user_id, last_seen_at)
    VALUES (${userId}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW()
  `;
}

export async function getPresenceForUsers(userIds) {
  if (!userIds.length) return [];
  const sql = getSql();
  return sql`
    SELECT user_id, last_seen_at
    FROM gechat_user_presence
    WHERE user_id = ANY(${userIds})
  `;
}
