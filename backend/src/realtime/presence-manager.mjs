import { updateLastSeen } from '../services/gechat/presence.service.mjs';

const OFFLINE_GRACE_MS = 3000;

/** @type {Map<string, Set<string>>} */
const userSockets = new Map();
/** @type {Map<string, string>} */
const socketUsers = new Map();
/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const offlineTimers = new Map();

export function registerSocket(userId, socketId) {
  const timer = offlineTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    offlineTimers.delete(userId);
  }
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
  socketUsers.set(socketId, userId);
}

export function unregisterSocket(socketId) {
  const userId = socketUsers.get(socketId);
  if (!userId) return null;
  socketUsers.delete(socketId);
  const set = userSockets.get(userId);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) {
      userSockets.delete(userId);
      scheduleOffline(userId);
    }
  }
  return userId;
}

function scheduleOffline(userId) {
  if (offlineTimers.has(userId)) return;
  const timer = setTimeout(async () => {
    offlineTimers.delete(userId);
    if (!userSockets.has(userId) || userSockets.get(userId).size === 0) {
      try {
        await updateLastSeen(userId);
      } catch (err) {
        console.error('[presence] updateLastSeen:', err?.message ?? err);
      }
    }
  }, OFFLINE_GRACE_MS);
  offlineTimers.set(userId, timer);
}

export function isUserOnline(userId) {
  const set = userSockets.get(userId);
  return Boolean(set && set.size > 0);
}

export function getOnlineUserIds() {
  return [...userSockets.keys()].filter((id) => isUserOnline(id));
}

export function getPresenceSnapshot(userIds) {
  return Object.fromEntries(
    userIds.map((id) => [id, { online: isUserOnline(id) }]),
  );
}
