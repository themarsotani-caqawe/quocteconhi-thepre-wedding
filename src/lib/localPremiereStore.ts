import { getBagContentsIfOpened } from '../shared/bagSecrets.ts';
import {
  ENTRY_BY_ID,
  GUEST_ENTRIES,
  TEAM_IDS,
  TOTAL_PEOPLE,
  getTeamCapacities,
  pickRandomEligibleTeam,
  type RoomPublicState,
  type TeamId,
  type TeamMemberSlot,
  type TeamPublicView,
} from '../shared/premiereRules.ts';

export type LocalRoomMode = 'live' | 'demo';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface StoredAssignment {
  entryId: string;
  teamId: TeamId;
  createdAt: string;
}

interface StoredBagMeta {
  openedAt: string;
  openedBy?: string;
}

interface StoredRoomRecord {
  bonusTeamId: TeamId;
  assignmentOrder: StoredAssignment[];
  openedBags: Partial<Record<TeamId, StoredBagMeta>>;
}

const STORAGE_KEYS: Record<LocalRoomMode, string> = {
  live: 'qtcnhi_local_room_live_v1',
  demo: 'qtcnhi_local_room_demo_v1',
};

const memoryFallback = new Map<string, string>();
const fallbackStorage: StorageLike = {
  getItem: (key) => memoryFallback.get(key) ?? null,
  setItem: (key, value) => {
    memoryFallback.set(key, value);
  },
  removeItem: (key) => {
    memoryFallback.delete(key);
  },
};

function resolveStorage(customStorage?: StorageLike): StorageLike {
  if (customStorage) return customStorage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore storage access restrictions
  }
  return fallbackStorage;
}

function secureRandomFloat(): number {
  try {
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      const buf = new Uint32Array(1);
      globalThis.crypto.getRandomValues(buf);
      return buf[0] / 0x1_0000_0000;
    }
  } catch {
    // fallback to Math.random
  }
  return Math.random();
}

function isTeamId(value: unknown): value is TeamId {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function createFreshRecord(): StoredRoomRecord {
  const index = Math.floor(secureRandomFloat() * TEAM_IDS.length);
  const bonusTeamId = TEAM_IDS[index] ?? 4;
  return {
    bonusTeamId,
    assignmentOrder: [],
    openedBags: {},
  };
}

function readOrInitRecord(room: LocalRoomMode, storage: StorageLike): StoredRoomRecord {
  const key = STORAGE_KEYS[room];
  try {
    const raw = storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredRoomRecord>;
      const bonusTeamId: TeamId = isTeamId(parsed.bonusTeamId) ? parsed.bonusTeamId : 4;
      const seen = new Set<string>();
      const assignmentOrder: StoredAssignment[] = [];

      if (Array.isArray(parsed.assignmentOrder)) {
        for (const item of parsed.assignmentOrder) {
          if (
            item &&
            typeof item.entryId === 'string' &&
            ENTRY_BY_ID.has(item.entryId) &&
            isTeamId(item.teamId) &&
            !seen.has(item.entryId)
          ) {
            seen.add(item.entryId);
            assignmentOrder.push({
              entryId: item.entryId,
              teamId: item.teamId,
              createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
            });
          }
        }
      }

      const openedBags: Partial<Record<TeamId, StoredBagMeta>> = {};
      if (parsed.openedBags && typeof parsed.openedBags === 'object') {
        for (const teamId of TEAM_IDS) {
          const bag = (parsed.openedBags as Record<string, unknown>)[String(teamId)] as
            | Partial<StoredBagMeta>
            | undefined;
          if (bag && typeof bag.openedAt === 'string') {
            openedBags[teamId] = {
              openedAt: bag.openedAt,
              openedBy: typeof bag.openedBy === 'string' ? bag.openedBy : undefined,
            };
          }
        }
      }

      return { bonusTeamId, assignmentOrder, openedBags };
    }
  } catch {
    // ignore corrupt JSON and reset cleanly
  }

  const fresh = createFreshRecord();
  try {
    storage.setItem(key, JSON.stringify(fresh));
  } catch {
    // ignore storage quota errors
  }
  return fresh;
}

function saveRecord(room: LocalRoomMode, record: StoredRoomRecord, storage: StorageLike): void {
  try {
    storage.setItem(STORAGE_KEYS[room], JSON.stringify(record));
  } catch {
    // ignore storage quota errors
  }
}

function buildAssignmentsMap(record: StoredRoomRecord): Record<string, TeamId> {
  const assignments: Record<string, TeamId> = {};
  for (const item of record.assignmentOrder) {
    assignments[item.entryId] = item.teamId;
  }
  return assignments;
}

function toPublicState(room: LocalRoomMode, record: StoredRoomRecord): RoomPublicState {
  const capacities = getTeamCapacities(record.bonusTeamId);
  const assignments = buildAssignmentsMap(record);
  const teamMembers: Record<TeamId, TeamMemberSlot[]> = { 1: [], 2: [], 3: [], 4: [] };
  let totalPeopleAssigned = 0;

  for (const row of record.assignmentOrder) {
    const entry = ENTRY_BY_ID.get(row.entryId);
    if (!entry) continue;
    totalPeopleAssigned += entry.seats;
    entry.members.forEach((memberName, idx) => {
      teamMembers[row.teamId].push({
        entryId: entry.id,
        memberName,
        avatarSeed: entry.avatarSeeds[idx] ?? 0,
        isPair: entry.seats === 2,
        pairGroupId: entry.seats === 2 ? entry.id : null,
      });
    });
  }

  const teams = {} as Record<TeamId, TeamPublicView>;
  for (const teamId of TEAM_IDS) {
    const members = teamMembers[teamId];
    const memberCount = members.length;
    const capacity = capacities[teamId];
    const isFull = memberCount >= capacity;
    const bagMeta = record.openedBags[teamId];
    const isOpened = Boolean(bagMeta) && isFull;
    teams[teamId] = {
      teamId,
      memberCount,
      capacity,
      isFull,
      isOpened,
      openedAt: isOpened ? (bagMeta?.openedAt ?? null) : null,
      members,
      bag: getBagContentsIfOpened(teamId, isFull, isOpened),
    };
  }

  return {
    room,
    totalPeopleAssigned,
    totalPeople: TOTAL_PEOPLE,
    assignments,
    teams,
  };
}

export function loadRoomState(room: LocalRoomMode, customStorage?: StorageLike): RoomPublicState {
  const storage = resolveStorage(customStorage);
  const record = readOrInitRecord(room, storage);
  return toPublicState(room, record);
}

export interface LocalSpinResult {
  teamId: TeamId;
  alreadyAssigned: boolean;
  state: RoomPublicState;
}

export function spinEntryLocally(
  room: LocalRoomMode,
  entryId: string,
  customStorage?: StorageLike
): LocalSpinResult {
  if (!ENTRY_BY_ID.has(entryId)) {
    throw new Error('Tên khách không tồn tại trong danh sách sự kiện.');
  }

  const storage = resolveStorage(customStorage);
  const record = readOrInitRecord(room, storage);
  const existing = record.assignmentOrder.find((item) => item.entryId === entryId);

  if (existing) {
    return {
      teamId: existing.teamId,
      alreadyAssigned: true,
      state: toPublicState(room, record),
    };
  }

  const assignments = buildAssignmentsMap(record);
  const teamId = pickRandomEligibleTeam(
    assignments,
    entryId,
    secureRandomFloat,
    record.bonusTeamId
  );

  record.assignmentOrder.push({
    entryId,
    teamId,
    createdAt: new Date().toISOString(),
  });
  saveRecord(room, record, storage);

  return {
    teamId,
    alreadyAssigned: false,
    state: toPublicState(room, record),
  };
}

export interface LocalOpenBagResult {
  ok: boolean;
  alreadyOpened?: boolean;
  error?: string;
  state: RoomPublicState;
}

export function openBagLocally(
  room: LocalRoomMode,
  teamId: TeamId,
  openedByEntryId?: string,
  customStorage?: StorageLike
): LocalOpenBagResult {
  const storage = resolveStorage(customStorage);
  const record = readOrInitRecord(room, storage);
  const stateBefore = toPublicState(room, record);
  const team = stateBefore.teams[teamId];

  if (team.memberCount < team.capacity) {
    return {
      ok: false,
      error: `Đội ${teamId} hiện có ${team.memberCount}/${team.capacity} thành viên, chưa thể khui túi mù.`,
      state: stateBefore,
    };
  }

  if (record.openedBags[teamId]) {
    return {
      ok: true,
      alreadyOpened: true,
      state: stateBefore,
    };
  }

  record.openedBags[teamId] = {
    openedAt: new Date().toISOString(),
    openedBy: openedByEntryId,
  };
  saveRecord(room, record, storage);

  return {
    ok: true,
    alreadyOpened: false,
    state: toPublicState(room, record),
  };
}

export function resetRoomLocally(room: LocalRoomMode, customStorage?: StorageLike): RoomPublicState {
  const storage = resolveStorage(customStorage);
  const fresh = createFreshRecord();
  saveRecord(room, fresh, storage);
  return toPublicState(room, fresh);
}

export function autofillRoomExceptOneLocally(
  room: LocalRoomMode,
  keepEntryId?: string,
  customStorage?: StorageLike
): RoomPublicState {
  const storage = resolveStorage(customStorage);
  const record = readOrInitRecord(room, storage);
  const assignedSet = new Set(record.assignmentOrder.map((item) => item.entryId));

  const candidates = GUEST_ENTRIES.filter(
    (entry) => entry.id !== keepEntryId && !assignedSet.has(entry.id)
  );
  for (const entry of candidates) {
    const assignments = buildAssignmentsMap(record);
    const teamId = pickRandomEligibleTeam(
      assignments,
      entry.id,
      secureRandomFloat,
      record.bonusTeamId
    );
    record.assignmentOrder.push({
      entryId: entry.id,
      teamId,
      createdAt: new Date().toISOString(),
    });
  }

  if (keepEntryId && ENTRY_BY_ID.has(keepEntryId) && !record.assignmentOrder.some((a) => a.entryId === keepEntryId)) {
    const assignments = buildAssignmentsMap(record);
    const teamId = pickRandomEligibleTeam(
      assignments,
      keepEntryId,
      secureRandomFloat,
      record.bonusTeamId
    );
    record.assignmentOrder.push({
      entryId: keepEntryId,
      teamId,
      createdAt: new Date().toISOString(),
    });
  }

  saveRecord(room, record, storage);
  return toPublicState(room, record);
}
