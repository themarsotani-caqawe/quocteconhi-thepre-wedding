import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublicRoomState,
  openBagAtomic,
  resetRoomAtomic,
  spinEntryAtomic,
} from './db.ts';
import { GUEST_ENTRIES, TEAM_IDS } from '../src/shared/premiereRules.ts';

test('atomic DB spin enforces 6/6/6/7 (total 25), rotates epoch on reset, and gates blind bags', async () => {
  const initial = await resetRoomAtomic('demo');
  assert.equal(initial.totalPeopleAssigned, 0);
  assert.equal(initial.totalPeople, 25);
  assert.equal(initial.isAllFull, false);

  const caps = TEAM_IDS.map((id) => initial.teams[id].capacity);
  assert.equal(caps.filter((c) => c === 7).length, 1);
  assert.equal(caps.filter((c) => c === 6).length, 3);

  // Concurrent double-spin for same guest returns identical team idempotently
  const [r1, r2] = await Promise.all([
    spinEntryAtomic('demo', 'celine-phang'),
    spinEntryAtomic('demo', 'celine-phang'),
  ]);
  assert.equal(r1.teamId, r2.teamId);
  assert.equal(r1.alreadyAssigned !== r2.alreadyAssigned, true);

  // Opening bag before 6/6 or 7/7 fails cleanly
  const earlyOpen = await openBagAtomic('demo', r1.teamId, 'celine-phang');
  assert.equal(earlyOpen.ok, false);
  assert.equal(earlyOpen.state.teams[r1.teamId].bag, null);

  // Spin all remaining 19 guest entries (total 25 seats)
  for (const entry of GUEST_ENTRIES) {
    if (entry.id === 'celine-phang') continue;
    await spinEntryAtomic('demo', entry.id);
  }

  const fullState = getPublicRoomState('demo');
  assert.equal(fullState.totalPeopleAssigned, 25);
  assert.equal(fullState.isAllFull, true);
  for (const teamId of TEAM_IDS) {
    const expectedCap = teamId === fullState.bonusTeamId ? 7 : 6;
    assert.equal(fullState.teams[teamId].memberCount, expectedCap);
    assert.equal(fullState.teams[teamId].isFull, true);
    assert.equal(fullState.teams[teamId].bag, null);
  }

  // Opening Đội 3 after full unlocks bag
  const opened3 = await openBagAtomic('demo', 3, 'celine-phang');
  assert.equal(opened3.ok, true);
  assert.equal(opened3.state.teams[3].isOpened, true);
  assert.ok(opened3.state.teams[3].bag);

  // Reset rotates epoch and clears room to 0/25
  const reset = await resetRoomAtomic('demo');
  assert.equal(reset.totalPeopleAssigned, 0);
  assert.equal(reset.isAllFull, false);
  assert.notEqual(reset.epoch, initial.epoch);
});
