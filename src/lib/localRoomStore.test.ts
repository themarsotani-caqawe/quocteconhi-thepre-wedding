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

test('localRoomStore spins all 25 guests across 4 teams (6, 6, 6, 7), opens bag, and resets', () => {
  const storage = createMockStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });

  const initial = readLocalRoomState('live');
  assert.equal(initial.totalPeopleAssigned, 0);
  assert.equal(initial.totalPeople, 25);
  assert.equal(initial.isAllFull, false);

  const capacities = TEAM_IDS.map((id) => initial.teams[id].capacity);
  assert.equal(capacities.filter((c) => c === 7).length, 1);
  assert.equal(capacities.filter((c) => c === 6).length, 3);

  const first = spinLocalRoomState('live', 'celine-phang', () => 0);
  assert.equal(first.alreadyAssigned, false);
  assert.equal(first.teamId, 1);
  assert.equal(first.state.totalPeopleAssigned, 1);
  assert.equal(first.state.teams[1].memberCount, 1);

  const dup = spinLocalRoomState('live', 'celine-phang', () => 0.5);
  assert.equal(dup.alreadyAssigned, true);
  assert.equal(dup.teamId, 1);

  assert.throws(() => openLocalRoomBag('live', 1), /cần đủ (6|7) người/);

  // Spin all remaining 19 guest entries (total 25 people)
  for (const entry of GUEST_ENTRIES) {
    if (entry.id === 'celine-phang') continue;
    const res = spinLocalRoomState('live', entry.id, () => 0);
    assert.equal(res.alreadyAssigned, false);
  }

  const fullState = readLocalRoomState('live');
  assert.equal(fullState.totalPeopleAssigned, 25);
  assert.equal(fullState.isAllFull, true);
  for (const teamId of TEAM_IDS) {
    const expectedCap = teamId === fullState.bonusTeamId ? 7 : 6;
    assert.equal(fullState.teams[teamId].memberCount, expectedCap);
    assert.equal(fullState.teams[teamId].isFull, true);
  }

  const openedState = openLocalRoomBag('live', fullState.bonusTeamId);
  assert.equal(openedState.teams[fullState.bonusTeamId].isOpened, true);
  assert.ok(openedState.teams[fullState.bonusTeamId].bag !== null);

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
