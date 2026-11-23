import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublicRoomState,
  openBagAtomic,
  resetDemoRoomAtomic,
  spinEntryAtomic,
} from './db.ts';
import { GUEST_ENTRIES, TEAM_IDS } from '../src/shared/premiereRules.ts';

test('demo atomic DB spin, concurrency, blind bag security gating, and full 25-person allocation', async () => {
  await resetDemoRoomAtomic();

  // 1. Concurrent double-spin of the same guest returns the exact same team idempotently
  const [r1, r2] = await Promise.all([
    spinEntryAtomic('demo', 'celine-phang'),
    spinEntryAtomic('demo', 'celine-phang'),
  ]);
  assert.equal(r1.teamId, r2.teamId);
  assert.equal(r1.alreadyAssigned !== r2.alreadyAssigned, true);

  // 2. Attempting to open bag before team reaches capacity must fail with ok=false and bag remains null
  const earlyOpen = await openBagAtomic('demo', r1.teamId, 'celine-phang');
  assert.equal(earlyOpen.ok, false);
  assert.equal(earlyOpen.state.teams[r1.teamId].bag, null);

  // 3. Concurrent spins for all remaining 19 entries (total 25 people)
  const remaining = GUEST_ENTRIES.filter((e) => e.id !== 'celine-phang');
  await Promise.all(remaining.map((entry) => spinEntryAtomic('demo', entry.id)));

  const fullState = getPublicRoomState('demo');
  assert.equal(fullState.totalPeopleAssigned, 25);
  const capacities = TEAM_IDS.map((id) => fullState.teams[id].capacity).sort((a, b) => a - b);
  assert.deepEqual(capacities, [6, 6, 6, 7]);
  for (const teamId of TEAM_IDS) {
    assert.equal(fullState.teams[teamId].memberCount, fullState.teams[teamId].capacity);
    assert.equal(fullState.teams[teamId].isFull, true);
    assert.equal(fullState.teams[teamId].isOpened, false);
    // Security invariant: bag items are NEVER returned before bag is opened
    assert.equal(fullState.teams[teamId].bag, null);
  }

  // 4. Open team 3's & team 4's bags -> reveal exact 25-portion items
  const opened3 = await openBagAtomic('demo', 3, 'celine-phang');
  assert.equal(opened3.ok, true);
  assert.equal(opened3.state.teams[3].isOpened, true);
  assert.equal(opened3.state.teams[3].bag?.title, 'Tối đó, Đội 3 mang…');
  assert.deepEqual(
    opened3.state.teams[3].bag?.items.map((i) => i.text),
    ['4 bánh pizza', '25 bánh canelé']
  );

  // Other unopened teams still keep bag === null
  assert.equal(opened3.state.teams[1].bag, null);
  assert.equal(opened3.state.teams[2].bag, null);
  assert.equal(opened3.state.teams[4].bag, null);

  const opened4 = await openBagAtomic('demo', 4, 'celine-phang');
  assert.equal(opened4.ok, true);
  assert.deepEqual(
    opened4.state.teams[4].bag?.items.map((i) => i.text),
    [
      '5 phần salad phô mai burrata',
      '25 phần đồ uống tổng cộng, gồm nước suối, sữa đậu nành và nước ngọt',
    ]
  );

  // Clean up demo state after test
  await resetDemoRoomAtomic();
});
