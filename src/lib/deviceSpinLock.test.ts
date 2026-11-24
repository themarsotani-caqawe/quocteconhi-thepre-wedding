import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDeviceLock,
  serializeDeviceLock,
  type DeviceSpinLock,
} from './deviceSpinLock.ts';

test('serializeDeviceLock and parseDeviceLock round-trip valid locks and reject invalid entries', () => {
  const lock: DeviceSpinLock = {
    epoch: 'epoch-123',
    entryId: 'thanh-phuong',
    teamId: 2,
    spunAt: '2026-11-24T10:00:00.000Z',
  };
  const json = serializeDeviceLock(lock);
  assert.deepEqual(parseDeviceLock(json), lock);

  assert.equal(parseDeviceLock('invalid-json'), null);
  assert.equal(
    parseDeviceLock(JSON.stringify({ epoch: 'e', entryId: 'unknown', teamId: 1, spunAt: 'x' })),
    null
  );
  assert.equal(
    parseDeviceLock(JSON.stringify({ epoch: 'e', entryId: 'mina', teamId: 9, spunAt: 'x' })),
    null
  );
});
