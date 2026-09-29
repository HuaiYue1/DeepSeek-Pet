// Version comparison for the update check. Run with `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewer } from '../app/update.js';

test('compares versions part by part, as numbers', () => {
  assert.equal(isNewer('1.1.0', '1.0.1'), true);
  assert.equal(isNewer('1.10.0', '1.9.2'), true);
  assert.equal(isNewer('2.0', '1.9.9'), true);
  assert.equal(isNewer('1.0.1', '1.0'), true);
  assert.equal(isNewer('1.0.1', '1.0.1'), false);
  assert.equal(isNewer('1.0.0', '1.0.1'), false);
});
