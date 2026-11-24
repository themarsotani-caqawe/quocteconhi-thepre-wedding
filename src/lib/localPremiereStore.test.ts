import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autofillRoomExceptOneLocally,
  loadRoomState,
  openBagLocally,
  resetRoomLocally,
  spinEntryLocally,
  type StorageLike,
} from './localPremiereStore.ts';
import { GUEST_ENTRIES, TEAM_IDS } from '../shared/premiereRules.ts';

function createMemoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

test('localPremiereStore hydrates 0/25 synchronously, enforces 6-7 capacity before opening bag, and resets cleanly', () => {
  const storage = createMemoryStorage();
  const initial = loadRoomState('live', storage);
  assert.equal(initial.totalPeopleAssigned, 0);
  assert.equal(initial.totalPeople, 25);

  const capacities = TEAM_IDS.map((id) => initial.teams[id].capacity).sort((a, b) => a - b);
  assert.deepEqual(capacities, [6, 6, 6, 7]);

  // First spin saves immediately and is idempotent on repeat
  const firstSpin = spinEntryLocally('live', 'celine-phang', storage);
  assert.equal(firstSpin.alreadyAssigned, false);
  const secondAttempt = spinEntryLocally('live', 'celine-phang', storage);
  assert.equal(secondAttempt.alreadyAssigned, true);
  assert.equal(secondAttempt.teamId, firstSpin.teamId);

  // Attempting to open blind bag before reaching 6 or 7 members fails cleanly
  const prematureOpen = openBagLocally('live', firstSpin.teamId, 'celine-phang', storage);
  assert.equal(prematureOpen.ok, false);
  assert.equal(prematureOpen.state.teams[firstSpin.teamId].bag, null);

  // Fill remaining 19 entries on the same browser storage -> 25 people total
  for (const entry of GUEST_ENTRIES) {
    if (entry.id !== 'celine-phang') {
      spinEntryLocally('live', entry.id, storage);
    }
  }

  const fullState = loadRoomState('live', storage);
  assert.equal(fullState.totalPeopleAssigned, 25);
  for (const teamId of TEAM_IDS) {
    assert.equal(fullState.teams[teamId].memberCount, fullState.teams[teamId].capacity);
    assert.equal(fullState.teams[teamId].isFull, true);
    assert.equal(fullState.teams[teamId].isOpened, false);
    assert.equal(fullState.teams[teamId].bag, null);
  }

  // Opening Đội 3 after full unlocks exact 25-portion menu while others remain locked
  const opened3 = openBagLocally('live', 3, 'celine-phang', storage);
  assert.equal(opened3.ok, true);
  assert.equal(opened3.state.teams[3].isOpened, true);
  assert.deepEqual(
    opened3.state.teams[3].bag?.items.map((i) => i.text),
    ['4 bánh pizza', '25 bánh canelé']
  );
  assert.equal(opened3.state.teams[1].bag, null);

  // Reloading from same storage preserves assignments & opened bags
  const reloaded = loadRoomState('live', storage);
  assert.equal(reloaded.totalPeopleAssigned, 25);
  assert.equal(reloaded.teams[3].isOpened, true);

  // Resetting clears back to 0/25
  const reset = resetRoomLocally('live', storage);
  assert.equal(reset.totalPeopleAssigned, 0);
  assert.deepEqual(reset.assignments, {});
});

test('autofillRoomExceptOneLocally fills all 25 slots cleanly in demo mode', () => {
  const storage = createMemoryStorage();
  const state = autofillRoomExceptOneLocally('demo', 'thanh-phuong', storage);
  assert.equal(state.totalPeopleAssigned, 25);
  assert.ok(state.assignments['thanh-phuong']);
});
