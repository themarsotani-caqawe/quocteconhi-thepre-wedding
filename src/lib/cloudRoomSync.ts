import {
  ENTRY_BY_ID,
  GUEST_ENTRIES,
  getTeamCapacities,
  getTeamSeatCounts,
  pickRandomBonusTeamId,
  pickRandomEligibleTeam,
  type RoomPublicState,
  type TeamId,
} from '../shared/premiereRules.ts';
import { readDeviceSpinLock } from './deviceSpinLock.ts';
import {
  buildRoomPublicState,
  createDefaultSnapshot,
  createFreshEpoch,
  parseSnapshotFromUnknown,
  writeLocalSnapshot,
  type LocalRoomSnapshot,
  type RoomMode,
} from './localRoomStore.ts';

const CLOUD_OBJECT_IDS: Record<RoomMode, string> = {
  live: 'ff808181a09d98f701a20d63787b3516',
  demo: 'ff808181a09d98f701a20d6379a03517',
};

const CLOUD_BASE_URL = 'https://api.restful-api.dev/objects';
const CLOUD_TIMEOUT_MS = 2600;

function getCloudEndpoint(room: RoomMode, withCacheBust = false): string {
  const base = `${CLOUD_BASE_URL}/${CLOUD_OBJECT_IDS[room]}`;
  return withCacheBust ? `${base}?_t=${Date.now()}` : base;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = CLOUD_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function readCloudSnapshot(room: RoomMode): Promise<LocalRoomSnapshot> {
  const res = await fetchWithTimeout(getCloudEndpoint(room, true));
  if (!res.ok) {
    throw new Error(`Cloud GET failed (${res.status})`);
  }
  const json = (await res.json()) as { data?: unknown };
  const snapshot = parseSnapshotFromUnknown(json?.data);
  if (!snapshot) {
    throw new Error('Invalid cloud room payload');
  }
  return snapshot;
}

async function writeCloudSnapshot(
  room: RoomMode,
  snapshot: LocalRoomSnapshot
): Promise<LocalRoomSnapshot> {
  const res = await fetchWithTimeout(getCloudEndpoint(room, false), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `qtcnhi-${room}-v3`,
      data: snapshot,
    }),
  });
  if (!res.ok) {
    throw new Error(`Cloud PUT failed (${res.status})`);
  }
  const json = (await res.json()) as { data?: unknown };
  return parseSnapshotFromUnknown(json?.data) ?? snapshot;
}

export async function fetchCloudRoomState(room: RoomMode): Promise<RoomPublicState> {
  let snapshot = await readCloudSnapshot(room);

  // Self-heal if this device already holds a valid spin lock for the active cloud epoch
  // that was missed due to an earlier concurrent PUT race
  const deviceLock = readDeviceSpinLock(room);
  if (
    deviceLock &&
    deviceLock.epoch === snapshot.epoch &&
    !snapshot.assignments[deviceLock.entryId]
  ) {
    const entry = ENTRY_BY_ID.get(deviceLock.entryId);
    const used = getTeamSeatCounts(snapshot.assignments);
    const cap = getTeamCapacities(snapshot.bonusTeamId)[deviceLock.teamId];
    if (entry && used[deviceLock.teamId] + entry.seats <= cap) {
      snapshot.assignments[deviceLock.entryId] = deviceLock.teamId;
      snapshot.assignmentOrder.push(deviceLock.entryId);
      try {
        snapshot = await writeCloudSnapshot(room, snapshot);
      } catch {
        // still use merged snapshot locally
      }
    }
  }

  writeLocalSnapshot(room, snapshot);
  return buildRoomPublicState(room, snapshot);
}

export async function spinCloudRoomState(
  room: RoomMode,
  entryId: string
): Promise<{ teamId: TeamId; alreadyAssigned: boolean; state: RoomPublicState }> {
  const remote = await readCloudSnapshot(room);
  const existing = remote.assignments[entryId];
  if (existing) {
    writeLocalSnapshot(room, remote);
    return {
      teamId: existing,
      alreadyAssigned: true,
      state: buildRoomPublicState(room, remote),
    };
  }

  const chosenTeam = pickRandomEligibleTeam(remote.assignments, entryId, remote.bonusTeamId);
  const nextSnapshot: LocalRoomSnapshot = {
    epoch: remote.epoch,
    bonusTeamId: remote.bonusTeamId,
    assignments: { ...remote.assignments, [entryId]: chosenTeam },
    assignmentOrder: [...remote.assignmentOrder, entryId],
    openedBags: { ...remote.openedBags },
  };

  let persisted = await writeCloudSnapshot(room, nextSnapshot);

  // Brief verification read to merge safely if another guest spun concurrently
  await new Promise((resolve) => window.setTimeout(resolve, 160));
  try {
    const latest = await readCloudSnapshot(room);
    if (latest.epoch === nextSnapshot.epoch && !latest.assignments[entryId]) {
      const mergedTeam = pickRandomEligibleTeam(latest.assignments, entryId, latest.bonusTeamId);
      const merged: LocalRoomSnapshot = {
        epoch: latest.epoch,
        bonusTeamId: latest.bonusTeamId,
        assignments: { ...latest.assignments, [entryId]: mergedTeam },
        assignmentOrder: [...latest.assignmentOrder, entryId],
        openedBags: { ...latest.openedBags },
      };
      persisted = await writeCloudSnapshot(room, merged);
      writeLocalSnapshot(room, persisted);
      return {
        teamId: mergedTeam,
        alreadyAssigned: false,
        state: buildRoomPublicState(room, persisted),
      };
    }
    persisted = latest;
  } catch {
    // keep persisted snapshot from PUT
  }

  writeLocalSnapshot(room, persisted);
  const finalTeam = persisted.assignments[entryId] ?? chosenTeam;
  return {
    teamId: finalTeam,
    alreadyAssigned: false,
    state: buildRoomPublicState(room, persisted),
  };
}

export async function openCloudRoomBag(room: RoomMode, teamId: TeamId): Promise<RoomPublicState> {
  const remote = await readCloudSnapshot(room);
  const state = buildRoomPublicState(room, remote);
  const team = state.teams[teamId];
  if (!team.isFull) {
    throw new Error(
      `Đội ${teamId} mới có ${team.memberCount}/${team.capacity} người — cần đủ ${team.capacity} người mới khui túi mù!`
    );
  }
  if (!remote.openedBags[teamId]) {
    const nextSnapshot: LocalRoomSnapshot = {
      ...remote,
      openedBags: {
        ...remote.openedBags,
        [teamId]: new Date().toISOString(),
      },
    };
    const persisted = await writeCloudSnapshot(room, nextSnapshot);
    writeLocalSnapshot(room, persisted);
    return buildRoomPublicState(room, persisted);
  }
  writeLocalSnapshot(room, remote);
  return state;
}

export async function resetCloudRoomState(room: RoomMode): Promise<RoomPublicState> {
  const fresh = createDefaultSnapshot(createFreshEpoch('cloud'), pickRandomBonusTeamId());
  const persisted = await writeCloudSnapshot(room, fresh);
  writeLocalSnapshot(room, persisted);
  return buildRoomPublicState(room, persisted);
}

export async function autofillDemoCloudRoomState(
  keepEntryId?: string
): Promise<RoomPublicState> {
  const snapshot = createDefaultSnapshot(createFreshEpoch('cloud'), pickRandomBonusTeamId());
  for (const entry of GUEST_ENTRIES) {
    if (keepEntryId && entry.id === keepEntryId) {
      continue;
    }
    const team = pickRandomEligibleTeam(snapshot.assignments, entry.id, snapshot.bonusTeamId);
    snapshot.assignments[entry.id] = team;
    snapshot.assignmentOrder.push(entry.id);
  }
  if (keepEntryId && ENTRY_BY_ID.has(keepEntryId) && !snapshot.assignments[keepEntryId]) {
    const team = pickRandomEligibleTeam(snapshot.assignments, keepEntryId, snapshot.bonusTeamId);
    snapshot.assignments[keepEntryId] = team;
    snapshot.assignmentOrder.push(keepEntryId);
  }
  const persisted = await writeCloudSnapshot('demo', snapshot);
  writeLocalSnapshot('demo', persisted);
  return buildRoomPublicState('demo', persisted);
}
