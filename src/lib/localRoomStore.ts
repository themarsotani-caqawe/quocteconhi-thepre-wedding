import { getBagContentsIfOpened } from '../shared/bagSecrets.ts';
import {
  ENTRY_BY_ID,
  GUEST_ENTRIES,
  TEAM_CAPACITY,
  TEAM_IDS,
  TOTAL_PEOPLE,
  pickRandomEligibleTeam,
  type RoomPublicState,
  type TeamId,
  type TeamMemberSlot,
  type TeamPublicView,
} from '../shared/premiereRules.ts';
import { readDeviceSpinLock } from './deviceSpinLock.ts';

export type RoomMode = 'live' | 'demo';

interface LocalRoomSnapshot {
  epoch: string;
  assignments: Record<string, TeamId>;
  assignmentOrder: string[];
  openedBags: Partial<Record<TeamId, string>>;
}

const LOCAL_ROOM_STORAGE_PREFIX = 'qtcnhi_local_room_v1_';
const DEFAULT_LOCAL_EPOCH = 'local-v1';

function isTeamId(value: unknown): value is TeamId {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function getStorageKey(room: RoomMode): string {
  return `${LOCAL_ROOM_STORAGE_PREFIX}${room}`;
}

function createFreshLocalEpoch(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultSnapshot(epoch = DEFAULT_LOCAL_EPOCH): LocalRoomSnapshot {
  return {
    epoch,
    assignments: {},
    assignmentOrder: [],
    openedBags: {},
  };
}

function readLocalSnapshot(room: RoomMode): LocalRoomSnapshot {
  let snapshot: LocalRoomSnapshot | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(getStorageKey(room));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LocalRoomSnapshot>;
        if (parsed && typeof parsed.epoch === 'string' && parsed.epoch.length > 0) {
          const cleanAssignments: Record<string, TeamId> = {};
          if (parsed.assignments && typeof parsed.assignments === 'object') {
            for (const [entryId, teamId] of Object.entries(parsed.assignments)) {
              if (ENTRY_BY_ID.has(entryId) && isTeamId(teamId)) {
                cleanAssignments[entryId] = teamId;
              }
            }
          }
          const cleanOrder = Array.isArray(parsed.assignmentOrder)
            ? parsed.assignmentOrder.filter(
                (id): id is string => typeof id === 'string' && Boolean(cleanAssignments[id])
              )
            : [];
          for (const entryId of Object.keys(cleanAssignments)) {
            if (!cleanOrder.includes(entryId)) {
              cleanOrder.push(entryId);
            }
          }
          const cleanOpenedBags: Partial<Record<TeamId, string>> = {};
          if (parsed.openedBags && typeof parsed.openedBags === 'object') {
            for (const teamId of TEAM_IDS) {
              const val = (parsed.openedBags as Record<string, unknown>)[String(teamId)];
              if (typeof val === 'string' && val.length > 0) {
                cleanOpenedBags[teamId] = val;
              }
            }
          }
          snapshot = {
            epoch: parsed.epoch,
            assignments: cleanAssignments,
            assignmentOrder: cleanOrder,
            openedBags: cleanOpenedBags,
          };
        }
      }
    }
  } catch {
    snapshot = null;
  }

  const base = snapshot ?? createDefaultSnapshot();

  // Reconcile with strict device lock if room snapshot had not persisted this device's spin yet
  const deviceLock = readDeviceSpinLock(room);
  if (
    deviceLock &&
    (snapshot === null || deviceLock.epoch === base.epoch) &&
    !base.assignments[deviceLock.entryId]
  ) {
    base.epoch = snapshot === null ? deviceLock.epoch : base.epoch;
    base.assignments[deviceLock.entryId] = deviceLock.teamId;
    base.assignmentOrder.push(deviceLock.entryId);
  }

  return base;
}

function writeLocalSnapshot(room: RoomMode, snapshot: LocalRoomSnapshot): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(getStorageKey(room), JSON.stringify(snapshot));
    }
  } catch {
    // ignore storage quota / privacy mode errors
  }
}

export function buildRoomPublicState(
  room: RoomMode,
  snapshot: LocalRoomSnapshot
): RoomPublicState {
  const teamMembers: Record<TeamId, TeamMemberSlot[]> = { 1: [], 2: [], 3: [], 4: [] };
  let totalPeopleAssigned = 0;

  const seen = new Set<string>();
  const orderedIds = [...snapshot.assignmentOrder, ...Object.keys(snapshot.assignments)];

  for (const entryId of orderedIds) {
    if (seen.has(entryId)) continue;
    seen.add(entryId);
    const teamId = snapshot.assignments[entryId];
    const entry = ENTRY_BY_ID.get(entryId);
    if (!entry || !isTeamId(teamId)) continue;

    totalPeopleAssigned += entry.seats;
    entry.members.forEach((memberName, idx) => {
      teamMembers[teamId].push({
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
    const isFull = memberCount >= TEAM_CAPACITY;
    const openedAt = snapshot.openedBags[teamId] ?? null;
    const isOpened = Boolean(openedAt) && isFull;
    teams[teamId] = {
      teamId,
      memberCount,
      capacity: TEAM_CAPACITY,
      isFull,
      isOpened,
      openedAt: isOpened ? openedAt : null,
      members,
      bag: getBagContentsIfOpened(teamId, isFull, isOpened),
    };
  }

  const isAllFull = TEAM_IDS.every((teamId) => teams[teamId].isFull);

  return {
    room,
    epoch: snapshot.epoch,
    totalPeopleAssigned,
    totalPeople: TOTAL_PEOPLE,
    isAllFull,
    assignments: { ...snapshot.assignments },
    teams,
  };
}

export function isValidRoomPublicState(data: unknown): data is RoomPublicState {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<RoomPublicState>;
  if (
    (candidate.room !== 'live' && candidate.room !== 'demo') ||
    typeof candidate.epoch !== 'string' ||
    candidate.epoch.length === 0 ||
    typeof candidate.totalPeopleAssigned !== 'number' ||
    typeof candidate.totalPeople !== 'number' ||
    typeof candidate.isAllFull !== 'boolean' ||
    !candidate.assignments ||
    typeof candidate.assignments !== 'object' ||
    !candidate.teams ||
    typeof candidate.teams !== 'object'
  ) {
    return false;
  }
  return TEAM_IDS.every((teamId) => {
    const team = (candidate.teams as Record<number, TeamPublicView | undefined>)[teamId];
    return Boolean(team && team.teamId === teamId && Array.isArray(team.members));
  });
}

export function readLocalRoomState(room: RoomMode): RoomPublicState {
  return buildRoomPublicState(room, readLocalSnapshot(room));
}

export function saveRemoteStateToLocal(room: RoomMode, state: RoomPublicState): void {
  const assignmentOrder: string[] = [];
  const seen = new Set<string>();
  for (const teamId of TEAM_IDS) {
    for (const member of state.teams[teamId].members) {
      if (!seen.has(member.entryId)) {
        seen.add(member.entryId);
        assignmentOrder.push(member.entryId);
      }
    }
  }
  const openedBags: Partial<Record<TeamId, string>> = {};
  for (const teamId of TEAM_IDS) {
    const team = state.teams[teamId];
    if (team.isOpened) {
      openedBags[teamId] = team.openedAt ?? new Date().toISOString();
    }
  }
  writeLocalSnapshot(room, {
    epoch: state.epoch,
    assignments: { ...state.assignments },
    assignmentOrder,
    openedBags,
  });
}

export function spinLocalRoomState(
  room: RoomMode,
  entryId: string,
  randomFloat: () => number = Math.random
): { teamId: TeamId; alreadyAssigned: boolean; state: RoomPublicState } {
  const snapshot = readLocalSnapshot(room);
  const existing = snapshot.assignments[entryId];
  if (existing) {
    return {
      teamId: existing,
      alreadyAssigned: true,
      state: buildRoomPublicState(room, snapshot),
    };
  }

  const chosenTeam = pickRandomEligibleTeam(snapshot.assignments, entryId, randomFloat);
  snapshot.assignments[entryId] = chosenTeam;
  snapshot.assignmentOrder.push(entryId);
  writeLocalSnapshot(room, snapshot);

  return {
    teamId: chosenTeam,
    alreadyAssigned: false,
    state: buildRoomPublicState(room, snapshot),
  };
}

export function openLocalRoomBag(room: RoomMode, teamId: TeamId): RoomPublicState {
  const snapshot = readLocalSnapshot(room);
  const currentState = buildRoomPublicState(room, snapshot);
  const team = currentState.teams[teamId];
  if (!team.isFull) {
    throw new Error(
      `Đội ${teamId} mới có ${team.memberCount}/${team.capacity} người — cần đủ ${team.capacity} người mới khui túi mù!`
    );
  }
  if (!snapshot.openedBags[teamId]) {
    snapshot.openedBags[teamId] = new Date().toISOString();
    writeLocalSnapshot(room, snapshot);
  }
  return buildRoomPublicState(room, snapshot);
}

export function resetLocalRoomState(room: RoomMode): RoomPublicState {
  const freshSnapshot = createDefaultSnapshot(createFreshLocalEpoch());
  writeLocalSnapshot(room, freshSnapshot);
  return buildRoomPublicState(room, freshSnapshot);
}

export function autofillDemoLocalRoomState(keepEntryId?: string): RoomPublicState {
  const snapshot = createDefaultSnapshot(createFreshLocalEpoch());
  for (const entry of GUEST_ENTRIES) {
    if (keepEntryId && entry.id === keepEntryId) {
      continue;
    }
    try {
      const team = pickRandomEligibleTeam(snapshot.assignments, entry.id);
      snapshot.assignments[entry.id] = team;
      snapshot.assignmentOrder.push(entry.id);
    } catch {
      break;
    }
  }
  if (keepEntryId && ENTRY_BY_ID.has(keepEntryId) && !snapshot.assignments[keepEntryId]) {
    try {
      const team = pickRandomEligibleTeam(snapshot.assignments, keepEntryId);
      snapshot.assignments[keepEntryId] = team;
      snapshot.assignmentOrder.push(keepEntryId);
    } catch {
      // ignore if full
    }
  }
  writeLocalSnapshot(roomModeDemo(), snapshot);
  return buildRoomPublicState('demo', snapshot);
}

function roomModeDemo(): RoomMode {
  return 'demo';
}
