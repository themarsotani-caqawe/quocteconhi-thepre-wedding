import { ENTRY_BY_ID, type TeamId } from '../shared/premiereRules.ts';

export interface DeviceSpinLock {
  epoch: string;
  entryId: string;
  teamId: TeamId;
  spunAt: string;
}

const STORAGE_PREFIX = 'qtcnhi_device_spin_lock_v2_';
const COOKIE_PREFIX = 'qtcnhi_spin_lock_v2_';
const ONE_YEAR_SECONDS = 31_536_000;

function isTeamId(value: unknown): value is TeamId {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function serializeDeviceLock(lock: DeviceSpinLock): string {
  return JSON.stringify(lock);
}

export function parseDeviceLock(raw: string | null | undefined): DeviceSpinLock | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DeviceSpinLock>;
    if (
      typeof parsed.epoch === 'string' &&
      parsed.epoch.length > 0 &&
      typeof parsed.entryId === 'string' &&
      ENTRY_BY_ID.has(parsed.entryId) &&
      isTeamId(parsed.teamId) &&
      typeof parsed.spunAt === 'string'
    ) {
      return {
        epoch: parsed.epoch,
        entryId: parsed.entryId,
        teamId: parsed.teamId,
        spunAt: parsed.spunAt,
      };
    }
  } catch {
    // ignore invalid JSON
  }
  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const part of cookies) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

export function writeDeviceSpinLock(room: 'live' | 'demo', lock: DeviceSpinLock): void {
  const serialized = serializeDeviceLock(lock);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}${room}`, serialized);
    }
  } catch {
    // ignore storage quota errors
  }
  writeCookie(`${COOKIE_PREFIX}${room}`, serialized, ONE_YEAR_SECONDS);
}

export function clearDeviceSpinLock(room: 'live' | 'demo'): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${STORAGE_PREFIX}${room}`);
    }
  } catch {
    // ignore storage errors
  }
  writeCookie(`${COOKIE_PREFIX}${room}`, '', 0);
}

export function readDeviceSpinLock(
  room: 'live' | 'demo',
  currentEpoch?: string
): DeviceSpinLock | null {
  let fromStorage: DeviceSpinLock | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      fromStorage = parseDeviceLock(localStorage.getItem(`${STORAGE_PREFIX}${room}`));
    }
  } catch {
    fromStorage = null;
  }

  const fromCookie = parseDeviceLock(readCookie(`${COOKIE_PREFIX}${room}`));
  const lock = fromStorage ?? fromCookie;
  if (!lock) {
    return null;
  }

  if (currentEpoch && lock.epoch !== currentEpoch) {
    clearDeviceSpinLock(room);
    return null;
  }

  // Self-heal if one persistence layer was cleared while the other remained
  if (!fromStorage || !fromCookie) {
    writeDeviceSpinLock(room, lock);
  }

  return lock;
}
