import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublicRoomState,
  openBagAtomic,
  resetRoomAtomic,
  spinEntryAtomic,
} from './db.ts';
import { GUEST_ENTRIES, TEAM_CAPACITY, TEAM_IDS } from '../src/shared/premiereRules.ts';

test('atomic DB spin enforces 5/5 cap per team, rejects 21st seat, rotates epoch on reset, and gates blind bags', async () => {
  const initial = await resetRoomAtomic('demo');
  assert.equal(initial.totalPeopleAssigned, 0);
  assert.equal(initial.totalPeople, 20);
  assert.equal(initial.isAllFull, false);

  // Concurrent double-spin for same guest returns identical team idempotently
  const [r1, r2] = await Promise.all([
    spinEntryAtomic('demo', 'celine-phang'),
    spinEntryAtomic('demo', 'celine-phang'),
  ]);
  assert.equal(r1.teamId, r2.teamId);
  assert.equal(r1.alreadyAssigned !== r2.alreadyAssigned, true);

  // Opening bag before 5/5 fails cleanly
  const earlyOpen = await openBagAtomic('demo', r1.teamId, 'celine-phang');
  assert.equal(earlyOpen.ok, false);
  assert.equal(earlyOpen.state.teams[r1.teamId].bag, null);

  // Spin singles until all 4 teams reach 5/5 (15 singles + pairs would be >20; test with 15 singles + 2 pairs = 19 + 1 pair? Use 2 pairs + 16? Wait: 15 singles + 2 pairs = 19; let's spin pairs first then singles!)
  const pairs = GUEST_ENTRIES.filter((e) => e.seats === 2).slice(0, 3); // 6 seats
  const singles = GUEST_ENTRIES.filter((e) => e.id !== 'celine-phang' && e.seats === 1).slice(0, 13); // +13 + celine(1) = 20 seats
  for (const entry of [...pairs, ...singles]) {
    await spinEntryAtomic('demo', entry.id);
  }

  const fullState = getPublicRoomState('demo');
  assert.equal(fullState.totalPeopleAssigned, 20);
  assert.equal(fullState.isAllFull, true);
  for (const teamId of TEAM_IDS) {
    assert.equal(fullState.teams[teamId].memberCount, TEAM_CAPACITY);
    assert.equal(fullState.teams[teamId].isFull, true);
    assert.equal(fullState.teams[teamId].bag, null);
  }

  // Attempting to spin an unassigned guest after all teams are 5/5 must fail with exact message
  await assert.rejects(
    () => spinEntryAtomic('demo', 'thanh-phuong'),
    /Tất cả các đội đã đủ thành viên/
  );

  // Opening Đội 3 after 5/5 unlocks bag
  const opened3 = await openBagAtomic('demo', 3, 'celine-phang');
  assert.equal(opened3.ok, true);
  assert.equal(opened3.state.teams[3].isOpened, true);
  assert.ok(opened3.state.teams[3].bag);

  // Reset rotates epoch and clears room to 0/20
  const reset = await resetRoomAtomic('demo');
  assert.equal(reset.totalPeopleAssigned, 0);
  assert.equal(reset.isAllFull, false);
  assert.notEqual(reset.epoch, initial.epoch);
});
