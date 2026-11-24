import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BONUS_TEAM_CAPACITY,
  DEFAULT_TEAM_CAPACITY,
  GUEST_ENTRIES,
  TEAM_IDS,
  TOTAL_PEOPLE,
  computeEligibleTeams,
  computeWheelTargetAngle,
  formatTeamsClipboardText,
  getTeamAtWheelAngle,
  getTeamCapacities,
  getTeamSeatCounts,
  pickRandomEligibleTeam,
  type RoomPublicState,
  type TeamId,
} from './premiereRules.ts';

test('TOTAL_PEOPLE is 25 across 4 teams (6, 6, 6, 7) matching all 20 guest entries', () => {
  assert.equal(DEFAULT_TEAM_CAPACITY, 6);
  assert.equal(BONUS_TEAM_CAPACITY, 7);
  assert.equal(TOTAL_PEOPLE, 25);
  assert.equal(GUEST_ENTRIES.length, 20);
  const totalSeats = GUEST_ENTRIES.reduce((sum, entry) => sum + entry.seats, 0);
  assert.equal(totalSeats, 25);

  const capacities = getTeamCapacities(2);
  assert.deepEqual(capacities, { 1: 6, 2: 7, 3: 6, 4: 6 });
});

test('computeEligibleTeams excludes full teams (6 or 7) and preserves pair slots in any spin order', () => {
  const bonusTeamId: TeamId = 3;
  // Spin ALL 15 singles first (worst case for pairs), then all 5 pairs
  const singles = GUEST_ENTRIES.filter((e) => e.seats === 1);
  const pairs = GUEST_ENTRIES.filter((e) => e.seats === 2);

  const assignments: Record<string, TeamId> = {};
  for (const entry of [...singles, ...pairs]) {
    const teamId = pickRandomEligibleTeam(assignments, entry.id, bonusTeamId, () => 0);
    assignments[entry.id] = teamId;
  }

  const counts = getTeamSeatCounts(assignments);
  assert.deepEqual(counts, { 1: 6, 2: 6, 3: 7, 4: 6 });
  assert.equal(
    TEAM_IDS.reduce((acc, id) => acc + counts[id], 0),
    25
  );
});

test('when 3 teams reach 6/6/7 capacity, computeEligibleTeams excludes full teams and selects only remaining open team', () => {
  const bonusTeamId: TeamId = 4;
  const assignments: Record<string, TeamId> = {};
  for (const entry of GUEST_ENTRIES) {
    assignments[entry.id] = pickRandomEligibleTeam(assignments, entry.id, bonusTeamId, () => 0.42);
  }
  const counts = getTeamSeatCounts(assignments);
  assert.deepEqual(counts, { 1: 6, 2: 6, 3: 6, 4: 7 });

  // Remove one guest from Đội 2 (leaving 5/6 on Đội 2 while Đội 1, 3, 4 stay full at 6, 6, 7)
  const entryInTeam2 = Object.keys(assignments).find(
    (id) => assignments[id] === 2 && (GUEST_ENTRIES.find((g) => g.id === id)?.seats ?? 0) === 1
  );
  if (entryInTeam2) {
    delete assignments[entryInTeam2];
    const eligible = computeEligibleTeams(assignments, entryInTeam2, bonusTeamId);
    assert.deepEqual(eligible, [2]);
  }
});

test('wheel target angle always lands under the top pointer for the assigned team', () => {
  const startAngles = [0, 37, 145, 720, 1893.4];
  const jitters = [0, 0.15, 0.5, 0.85, 1];
  for (const start of startAngles) {
    for (const teamId of TEAM_IDS) {
      for (const jitter of jitters) {
        const targetAngle = computeWheelTargetAngle(start, teamId, jitter);
        assert.ok(targetAngle - start >= 5 * 360);
        assert.equal(getTeamAtWheelAngle(targetAngle), teamId);
      }
    }
  }
});

test('formatTeamsClipboardText formats 6-person and 7-person team status cleanly', () => {
  const sample: RoomPublicState = {
    room: 'live',
    epoch: 'e1',
    bonusTeamId: 4,
    totalPeopleAssigned: 7,
    totalPeople: 25,
    isAllFull: false,
    assignments: { 'celine-phang': 1 },
    teams: {
      1: {
        teamId: 1,
        memberCount: 6,
        capacity: 6,
        isFull: true,
        isOpened: false,
        openedAt: null,
        members: [
          { entryId: 'celine-phang', memberName: 'Céline Phang', avatarSeed: 0, isPair: false, pairGroupId: null },
        ],
        bag: null,
      },
      2: {
        teamId: 2,
        memberCount: 1,
        capacity: 6,
        isFull: false,
        isOpened: false,
        openedAt: null,
        members: [{ entryId: 'mina', memberName: 'Mina', avatarSeed: 11, isPair: false, pairGroupId: null }],
        bag: null,
      },
      3: { teamId: 3, memberCount: 0, capacity: 6, isFull: false, isOpened: false, openedAt: null, members: [], bag: null },
      4: { teamId: 4, memberCount: 0, capacity: 7, isFull: false, isOpened: false, openedAt: null, members: [], bag: null },
    },
  };

  const text = formatTeamsClipboardText(sample);
  assert.ok(text.includes('(7/25 thành viên)'));
  assert.ok(text.includes('Đội 1 (6/6 người · Đã đủ (6/6))'));
  assert.ok(text.includes('Đội 2 (1/6 người · Chưa đủ (còn thiếu 5 người))'));
  assert.ok(text.includes('Đội 4 (0/7 người · Chưa đủ (còn thiếu 7 người))'));
});
