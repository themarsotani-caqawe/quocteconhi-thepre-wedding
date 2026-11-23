import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_ENTRIES,
  TEAM_IDS,
  TOTAL_PEOPLE,
  computeEligibleTeams,
  computeWheelTargetAngle,
  getTeamAtWheelAngle,
  getTeamCapacities,
  getTeamSeatCounts,
  pickRandomEligibleTeam,
  type TeamId,
} from './premiereRules';

test('guest list totals exactly 25 people across 20 entries with 5 pairs including Thanh Phương', () => {
  assert.equal(GUEST_ENTRIES.length, 20);
  const totalSeats = GUEST_ENTRIES.reduce((sum, entry) => sum + entry.seats, 0);
  assert.equal(totalSeats, TOTAL_PEOPLE);
  assert.equal(TOTAL_PEOPLE, 25);
  assert.ok(GUEST_ENTRIES.some((entry) => entry.label === 'Thanh Phương' && entry.seats === 1));
  const pairs = GUEST_ENTRIES.filter((entry) => entry.seats === 2);
  assert.equal(pairs.length, 5);
  for (const pair of pairs) {
    assert.ok(pair.label.includes('&'));
    assert.equal(pair.members.length, 2);
  }
});

test('all 5 pairs spinning LAST still guarantees 3 teams of 6 and 1 team of 7 across all bonusTeamId options', () => {
  const singles = GUEST_ENTRIES.filter((e) => e.seats === 1);
  const pairs = GUEST_ENTRIES.filter((e) => e.seats === 2);

  for (const bonusTeamId of TEAM_IDS) {
    const expected = getTeamCapacities(bonusTeamId);
    for (let trial = 0; trial < 100; trial++) {
      const assignments: Record<string, TeamId> = {};
      for (const entry of singles) {
        assignments[entry.id] = pickRandomEligibleTeam(assignments, entry.id, Math.random, bonusTeamId);
      }
      for (const pair of pairs) {
        const eligible = computeEligibleTeams(assignments, pair.id, bonusTeamId);
        assert.ok(eligible.length >= 1, `No eligible team left for pair ${pair.label} on trial ${trial}`);
        assignments[pair.id] = pickRandomEligibleTeam(assignments, pair.id, Math.random, bonusTeamId);
      }

      const counts = getTeamSeatCounts(assignments);
      for (const teamId of TEAM_IDS) {
        assert.equal(counts[teamId], expected[teamId], `Team ${teamId} expected ${expected[teamId]}`);
      }
    }
  }
});

test('500 random spin permutations always yield exact 25-person distribution with all pairs together', () => {
  for (let trial = 0; trial < 500; trial++) {
    const bonusTeamId = TEAM_IDS[trial % TEAM_IDS.length];
    const expected = getTeamCapacities(bonusTeamId);
    const shuffled = [...GUEST_ENTRIES].sort(() => Math.random() - 0.5);
    const assignments: Record<string, TeamId> = {};
    for (const entry of shuffled) {
      assignments[entry.id] = pickRandomEligibleTeam(assignments, entry.id, Math.random, bonusTeamId);
    }
    assert.equal(Object.keys(assignments).length, GUEST_ENTRIES.length);
    const counts = getTeamSeatCounts(assignments);
    for (const teamId of TEAM_IDS) {
      assert.equal(counts[teamId], expected[teamId]);
    }
  }
});

test('computeEligibleTeams returns existing team when entry was already assigned', () => {
  const assignments: Record<string, TeamId> = { 'celine-phang': 3 };
  assert.deepEqual(computeEligibleTeams(assignments, 'celine-phang'), [3]);
});

test('wheel target angle always lands under the top pointer for the assigned team', () => {
  const startAngles = [0, 37, 145, 720, 1893.4];
  const jitters = [0, 0.15, 0.5, 0.85, 1];
  for (const start of startAngles) {
    for (const teamId of TEAM_IDS) {
      for (const jitter of jitters) {
        const targetAngle = computeWheelTargetAngle(start, teamId, jitter);
        assert.ok(targetAngle - start >= 5 * 360, 'Wheel should spin at least 5 full turns');
        assert.equal(
          getTeamAtWheelAngle(targetAngle),
          teamId,
          `Expected team ${teamId} at angle ${targetAngle} (from ${start}, jitter ${jitter})`
        );
      }
    }
  }
});
