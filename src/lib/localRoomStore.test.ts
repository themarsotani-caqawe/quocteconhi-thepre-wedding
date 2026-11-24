import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidRoomPublicState,
  openLocalRoomBag,
  readLocalRoomState,
  resetLocalRoomState,
  spinLocalRoomState,
} from './localRoomStore.ts';
import { GUEST_ENTRIES, TEAM_IDS } from '../shared/premiereRules.ts';

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test('localRoomStore spins locally, respects 5-per-team cap, opens bag, and resets', () => {
  const storage = createMockStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });

  const initial = readLocalRoomState('live');
  assert.equal(initial.totalPeopleAssigned, 0);
  assert.equal(initial.totalPeople, 20);
  assert.equal(initial.isAllFull, false);

  const first = spinLocalRoomState('live', 'celine-phang', () => 0);
  assert.equal(first.alreadyAssigned, false);
  assert.equal(first.teamId, 1);
  assert.equal(first.state.totalPeopleAssigned, 1);
  assert.equal(first.state.teams[1].memberCount, 1);

  const dup = spinLocalRoomState('live', 'celine-phang', () => 0.5);
  assert.equal(dup.alreadyAssigned, true);
  assert.equal(dup.teamId, 1);

  assert.throws(() => openLocalRoomBag('live', 1), /cần đủ 5 người/);

  // Fill remaining 19 seats (3 pairs = 6 seats + 13 singles = 13 seats)
  const pairs = GUEST_ENTRIES.filter((e) => e.seats === 2).slice(0, 3);
  const singles = GUEST_ENTRIES.filter((e) => e.id !== 'celine-phang' && e.seats === 1).slice(0, 13);
  for (const entry of [...pairs, ...singles]) {
    const res = spinLocalRoomState('live', entry.id, () => 0);
    assert.equal(res.alreadyAssigned, false);
  }

  const fullState = readLocalRoomState('live');
  assert.equal(fullState.totalPeopleAssigned, 20);
  assert.equal(fullState.isAllFull, true);
  for (const teamId of TEAM_IDS) {
    assert.equal(fullState.teams[teamId].memberCount, 5);
    assert.equal(fullState.teams[teamId].isFull, true);
  }

  const openedState = openLocalRoomBag('live', 1);
  assert.equal(openedState.teams[1].isOpened, true);
  assert.ok(openedState.teams[1].bag !== null);

  const resetState = resetLocalRoomState('live');
  assert.equal(resetState.totalPeopleAssigned, 0);
  assert.equal(resetState.isAllFull, false);
  assert.notEqual(resetState.epoch, initial.epoch);
});

test('isValidRoomPublicState rejects HTML or malformed objects', () => {
  assert.equal(isValidRoomPublicState('<!doctype html><html></html>'), false);
  assert.equal(isValidRoomPublicState(null), false);
  assert.equal(isValidRoomPublicState({ room: 'live', epoch: '' }), false);

  const storage = createMockStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
  const valid = readLocalRoomState('demo');
  assert.equal(isValidRoomPublicState(valid), true);
});
