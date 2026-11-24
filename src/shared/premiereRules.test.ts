import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_ENTRIES,
  TEAM_CAPACITY,
  TEAM_IDS,
  TOTAL_PEOPLE,
  computeEligibleTeams,
  computeWheelTargetAngle,
  formatTeamsClipboardText,
  getTeamAtWheelAngle,
  getTeamSeatCounts,
  pickRandomEligibleTeam,
  type RoomPublicState,
  type TeamId,
} from './premiereRules.ts';

test('TEAM_CAPACITY is 5 and TOTAL_PEOPLE is 20 across 4 teams while guest roster keeps all 20 entries', () => {
  assert.equal(TEAM_CAPACITY, 5);
  assert.equal(TOTAL_PEOPLE, 20);
  assert.equal(GUEST_ENTRIES.length, 20);
  assert.ok(GUEST_ENTRIES.some((entry) => entry.label === 'Thanh Phương'));
});

test('computeEligibleTeams strictly excludes any team at 5/5 capacity', () => {
  const assignments: Record<string, TeamId> = {
    'celine-phang': 1,
    'cao-thu': 1,
    'phuong-thuy': 1,
    'trong-hieu': 1,
    'hong-nhung': 1, // Đội 1 is now 5/5
    'nhat-quang': 2,
    'lan-anh': 2,
    'mina': 2,
    'tuan-anh': 2, // Đội 2 is 4/5
  };

  const soloEligible = computeEligibleTeams(assignments, 'thanh-dang');
  assert.deepEqual(soloEligible, [2, 3, 4]);

  const pairEligible = computeEligibleTeams(assignments, 'sam-chun');
  assert.deepEqual(pairEligible, [3, 4]);
});

test('when all 4 teams reach 5/5 capacity, computeEligibleTeams returns empty and pickRandomEligibleTeam throws full message', () => {
  const assignments: Record<string, TeamId> = {
    'celine-phang': 1,
    'cao-thu': 1,
    'phuong-thuy': 1,
    'trong-hieu': 1,
    'hong-nhung': 1,
    'nhat-quang': 2,
    'lan-anh': 2,
    'mina': 2,
    'tuan-anh': 2,
    'thanh-dang': 2,
    'phuong-thuy-bui': 3,
    'bao-khanh': 3,
    'tat-thinh': 3,
    'gia-thuy': 3,
    'thanh-phuong': 3,
    'sam-chun': 4,
    'anh-xu-con-trai': 4,
    'to-to-dat-le': 4, // wait: 2+2+2=6; use 1 pair + ... wait use singles/pairs = 5:
  };
  delete assignments['to-to-dat-le'];
  // Wait: put 1 single in team 4? Let's use 2 pairs + 1 single or check counts
  const full20: Record<string, TeamId> = {
    'celine-phang': 1,
    'cao-thu': 1,
    'phuong-thuy': 1,
    'trong-hieu': 1,
    'hong-nhung': 1,
    'nhat-quang': 2,
    'lan-anh': 2,
    'mina': 2,
    'tuan-anh': 2,
    'thanh-dang': 2,
    'phuong-thuy-bui': 3,
    'bao-khanh': 3,
    'tat-thinh': 3,
    'gia-thuy': 3,
    'thanh-phuong': 3,
    'sam-chun': 4,
    'anh-xu-con-trai': 4,
  };
  // Team 4 currently has 4 seats (sam-chun + anh-xu-con-trai); let's keep 3 singles + 1 pair? Only 15 singles exist so 5+5+5=15 singles used!
  // Re-balance: put 1 pair in team 1 (3 singles + 1 pair = 5), 1 single free for team 4!
  const balancedFull: Record<string, TeamId> = {
    'celine-phang': 1,
    'cao-thu': 1,
    'phuong-thuy': 1,
    'sam-chun': 1,
    'trong-hieu': 2,
    'hong-nhung': 2,
    'nhat-quang': 2,
    'lan-anh': 2,
    'mina': 2,
    'tuan-anh': 3,
    'thanh-dang': 3,
    'phuong-thuy-bui': 3,
    'bao-khanh': 3,
    'tat-thinh': 3,
    'gia-thuy': 4,
    'anh-xu-con-trai': 4,
    'to-to-dat-le': 4,
  };

  const counts = getTeamSeatCounts(balancedFull);
  assert.deepEqual(counts, { 1: 5, 2: 5, 3: 5, 4: 5 });
  assert.deepEqual(computeEligibleTeams(balancedFull, 'thanh-phuong'), []);
  assert.throws(
    () => pickRandomEligibleTeam(balancedFull, 'thanh-phuong'),
    /Tất cả các đội đã đủ thành viên/
  );
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

test('formatTeamsClipboardText formats status and member names cleanly', () => {
  const sample: RoomPublicState = {
    room: 'live',
    epoch: 'e1',
    totalPeopleAssigned: 6,
    totalPeople: 20,
    isAllFull: false,
    assignments: { 'celine-phang': 1 },
    teams: {
      1: {
        teamId: 1,
        memberCount: 5,
        capacity: 5,
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
        capacity: 5,
        isFull: false,
        isOpened: false,
        openedAt: null,
        members: [{ entryId: 'mina', memberName: 'Mina', avatarSeed: 11, isPair: false, pairGroupId: null }],
        bag: null,
      },
      3: { teamId: 3, memberCount: 0, capacity: 5, isFull: false, isOpened: false, openedAt: null, members: [], bag: null },
      4: { teamId: 4, memberCount: 0, capacity: 5, isFull: false, isOpened: false, openedAt: null, members: [], bag: null },
    },
  };

  const text = formatTeamsClipboardText(sample);
  assert.ok(text.includes('Đội 1 (5/5 người · Đã đủ (5/5))'));
  assert.ok(text.includes('Đội 2 (1/5 người · Chưa đủ (còn thiếu 4 người))'));
  assert.ok(text.includes('Mina'));
});
