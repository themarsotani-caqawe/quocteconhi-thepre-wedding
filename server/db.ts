import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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
} from '../src/shared/premiereRules.ts';
import { getBagContentsIfOpened } from './bagSecrets.ts';

export type RoomMode = 'live' | 'demo';

const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'premiere.db');

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS assignments (
    room TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    team_id INTEGER NOT NULL CHECK (team_id IN (1, 2, 3, 4)),
    created_at TEXT NOT NULL,
    PRIMARY KEY (room, entry_id)
  );

  CREATE TABLE IF NOT EXISTS team_bags (
    room TEXT NOT NULL,
    team_id INTEGER NOT NULL CHECK (team_id IN (1, 2, 3, 4)),
    opened INTEGER NOT NULL DEFAULT 0 CHECK (opened IN (0, 1)),
    opened_at TEXT,
    opened_by TEXT,
    PRIMARY KEY (room, team_id)
  );

  CREATE TABLE IF NOT EXISTS room_epochs (
    room TEXT PRIMARY KEY,
    epoch TEXT NOT NULL,
    bonus_team_id INTEGER NOT NULL DEFAULT 4 CHECK (bonus_team_id IN (1, 2, 3, 4)),
    updated_at TEXT NOT NULL
  );
`);

// Safely migrate older room_epochs tables created before bonus_team_id existed
const epochColumns = db.prepare('PRAGMA table_info(room_epochs)').all() as Array<{ name: string }>;
if (!epochColumns.some((col) => col.name === 'bonus_team_id')) {
  db.exec(
    'ALTER TABLE room_epochs ADD COLUMN bonus_team_id INTEGER NOT NULL DEFAULT 4 CHECK (bonus_team_id IN (1, 2, 3, 4))'
  );
}

let mutationQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => T): Promise<T> {
  const next = mutationQueue.then(() => fn(), () => fn());
  mutationQueue = next.catch(() => {});
  return next;
}

function randomBonusTeamId(): TeamId {
  return TEAM_IDS[crypto.randomInt(0, TEAM_IDS.length)];
}

function getOrCreateRoomMeta(room: RoomMode): { epoch: string; bonusTeamId: TeamId } {
  const existing = db
    .prepare('SELECT epoch, bonus_team_id FROM room_epochs WHERE room = ?')
    .get(room) as { epoch: string; bonus_team_id: TeamId } | undefined;
  if (existing) {
    return { epoch: existing.epoch, bonusTeamId: existing.bonus_team_id };
  }
  const freshEpoch = crypto.randomUUID();
  const bonusTeamId = randomBonusTeamId();
  db.prepare(
    'INSERT OR IGNORE INTO room_epochs (room, epoch, bonus_team_id, updated_at) VALUES (?, ?, ?, ?)'
  ).run(room, freshEpoch, bonusTeamId, new Date().toISOString());
  const saved = db
    .prepare('SELECT epoch, bonus_team_id FROM room_epochs WHERE room = ?')
    .get(room) as { epoch: string; bonus_team_id: TeamId };
  return { epoch: saved.epoch, bonusTeamId: saved.bonus_team_id };
}

function rotateRoomEpoch(room: RoomMode): { epoch: string; bonusTeamId: TeamId } {
  const freshEpoch = crypto.randomUUID();
  const bonusTeamId = randomBonusTeamId();
  db.prepare(`
    INSERT INTO room_epochs (room, epoch, bonus_team_id, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(room) DO UPDATE SET
      epoch = excluded.epoch,
      bonus_team_id = excluded.bonus_team_id,
      updated_at = excluded.updated_at
  `).run(room, freshEpoch, bonusTeamId, new Date().toISOString());
  return { epoch: freshEpoch, bonusTeamId };
}

function readAssignmentsMap(room: RoomMode): {
  assignments: Record<string, TeamId>;
  orderedRows: Array<{ entry_id: string; team_id: TeamId; created_at: string }>;
} {
  const stmt = db.prepare(
    'SELECT entry_id, team_id, created_at FROM assignments WHERE room = ? ORDER BY created_at ASC, rowid ASC'
  );
  const rows = stmt.all(room) as Array<{ entry_id: string; team_id: TeamId; created_at: string }>;
  const assignments: Record<string, TeamId> = {};
  for (const row of rows) {
    assignments[row.entry_id] = row.team_id;
  }
  return { assignments, orderedRows: rows };
}

export function getPublicRoomState(room: RoomMode): RoomPublicState {
  const { epoch, bonusTeamId } = getOrCreateRoomMeta(room);
  const capacities = getTeamCapacities(bonusTeamId);
  const { orderedRows, assignments } = readAssignmentsMap(room);
  const bagStmt = db.prepare(
    'SELECT team_id, opened, opened_at FROM team_bags WHERE room = ?'
  );
  const bagRows = bagStmt.all(room) as Array<{
    team_id: TeamId;
    opened: number;
    opened_at: string | null;
  }>;
  const bagMap = new Map<TeamId, { opened: boolean; openedAt: string | null }>();
  for (const row of bagRows) {
    bagMap.set(row.team_id, { opened: row.opened === 1, openedAt: row.opened_at });
  }

  const teamMembers: Record<TeamId, TeamMemberSlot[]> = { 1: [], 2: [], 3: [], 4: [] };
  let totalPeopleAssigned = 0;

  for (const row of orderedRows) {
    const entry = ENTRY_BY_ID.get(row.entry_id);
    if (!entry) continue;
    totalPeopleAssigned += entry.seats;
    entry.members.forEach((memberName, idx) => {
      teamMembers[row.team_id].push({
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
    const bagMeta = bagMap.get(teamId);
    const isOpened = Boolean(bagMeta?.opened) && isFull;
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

  const isAllFull = TEAM_IDS.every((teamId) => teams[teamId].isFull);

  return {
    room,
    epoch,
    bonusTeamId,
    totalPeopleAssigned,
    totalPeople: TOTAL_PEOPLE,
    isAllFull,
    assignments,
    teams,
  };
}

export interface SpinResult {
  teamId: TeamId;
  alreadyAssigned: boolean;
  state: RoomPublicState;
}

export function spinEntryAtomic(room: RoomMode, entryId: string): Promise<SpinResult> {
  const entry = ENTRY_BY_ID.get(entryId);
  if (!entry) {
    return Promise.reject(new Error('Tên khách không tồn tại trong danh sách sự kiện.'));
  }

  return withWriteLock(() => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const existingStmt = db.prepare(
        'SELECT team_id FROM assignments WHERE room = ? AND entry_id = ?'
      );
      const existing = existingStmt.get(room, entryId) as { team_id: TeamId } | undefined;

      if (existing) {
        db.exec('COMMIT');
        return {
          teamId: existing.team_id,
          alreadyAssigned: true,
          state: getPublicRoomState(room),
        };
      }

      const { bonusTeamId } = getOrCreateRoomMeta(room);
      const { assignments } = readAssignmentsMap(room);
      const teamId = pickRandomEligibleTeam(
        assignments,
        entryId,
        bonusTeamId,
        () => crypto.randomInt(0, 1_000_000) / 1_000_000
      );

      db.prepare(
        'INSERT INTO assignments (room, entry_id, team_id, created_at) VALUES (?, ?, ?, ?)'
      ).run(room, entryId, teamId, new Date().toISOString());
      db.exec('COMMIT');

      return {
        teamId,
        alreadyAssigned: false,
        state: getPublicRoomState(room),
      };
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      throw err;
    }
  });
}

export interface OpenBagResult {
  ok: boolean;
  alreadyOpened?: boolean;
  error?: string;
  state: RoomPublicState;
}

export function openBagAtomic(
  room: RoomMode,
  teamId: TeamId,
  openedByEntryId?: string
): Promise<OpenBagResult> {
  return withWriteLock(() => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const { bonusTeamId } = getOrCreateRoomMeta(room);
      const capacity = getTeamCapacities(bonusTeamId)[teamId];
      const { assignments } = readAssignmentsMap(room);
      let teamSeatCount = 0;
      for (const [entryId, assignedTeam] of Object.entries(assignments)) {
        if (assignedTeam === teamId) {
          teamSeatCount += ENTRY_BY_ID.get(entryId)?.seats ?? 0;
        }
      }

      if (teamSeatCount < capacity) {
        db.exec('ROLLBACK');
        return {
          ok: false,
          error: `Đội ${teamId} hiện có ${teamSeatCount}/${capacity} thành viên, chưa thể khui túi mù.`,
          state: getPublicRoomState(room),
        };
      }

      const existingBag = db
        .prepare('SELECT opened FROM team_bags WHERE room = ? AND team_id = ?')
        .get(room, teamId) as { opened: number } | undefined;

      if (existingBag && existingBag.opened === 1) {
        db.exec('COMMIT');
        return {
          ok: true,
          alreadyOpened: true,
          state: getPublicRoomState(room),
        };
      }

      db.prepare(`
        INSERT INTO team_bags (room, team_id, opened, opened_at, opened_by)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(room, team_id) DO UPDATE SET
          opened = 1,
          opened_at = excluded.opened_at,
          opened_by = excluded.opened_by
      `).run(room, teamId, new Date().toISOString(), openedByEntryId ?? null);
      db.exec('COMMIT');

      return {
        ok: true,
        alreadyOpened: false,
        state: getPublicRoomState(room),
      };
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      throw err;
    }
  });
}

export function resetRoomAtomic(room: RoomMode): Promise<RoomPublicState> {
  return withWriteLock(() => {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM assignments WHERE room = ?').run(room);
      db.prepare('DELETE FROM team_bags WHERE room = ?').run(room);
      rotateRoomEpoch(room);
      db.exec('COMMIT');
      return getPublicRoomState(room);
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore
      }
      throw err;
    }
  });
}

export function resetDemoRoomAtomic(): Promise<RoomPublicState> {
  return resetRoomAtomic('demo');
}

export function autofillDemoExceptOneAtomic(keepEntryId?: string): Promise<RoomPublicState> {
  return withWriteLock(() => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const { bonusTeamId } = getOrCreateRoomMeta('demo');
      const { assignments } = readAssignmentsMap('demo');
      const remainingGuests = GUEST_ENTRIES.filter(
        (entry) => entry.id !== keepEntryId && assignments[entry.id] === undefined
      );
      for (const entry of remainingGuests) {
        const current = readAssignmentsMap('demo').assignments;
        const teamId = pickRandomEligibleTeam(
          current,
          entry.id,
          bonusTeamId,
          () => crypto.randomInt(0, 1_000_000) / 1_000_000
        );
        db.prepare(
          'INSERT INTO assignments (room, entry_id, team_id, created_at) VALUES (?, ?, ?, ?)'
        ).run('demo', entry.id, teamId, new Date().toISOString());
      }
      if (keepEntryId && readAssignmentsMap('demo').assignments[keepEntryId] === undefined) {
        const current = readAssignmentsMap('demo').assignments;
        const teamId = pickRandomEligibleTeam(
          current,
          keepEntryId,
          bonusTeamId,
          () => crypto.randomInt(0, 1_000_000) / 1_000_000
        );
        db.prepare(
          'INSERT INTO assignments (room, entry_id, team_id, created_at) VALUES (?, ?, ?, ?)'
        ).run('demo', keepEntryId, teamId, new Date().toISOString());
      }
      db.exec('COMMIT');
      return getPublicRoomState('demo');
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore
      }
      throw err;
    }
  });
}
