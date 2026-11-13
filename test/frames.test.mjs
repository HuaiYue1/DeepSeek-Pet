import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app/frames.js', import.meta.url), 'utf8');
const Frames = vm.runInNewContext(`${source}; Frames`);

test('walk and run use the same eight drawings, indexed by stride progress', () => {
  for (const act of ['walk', 'run']) {
    for (let i = 0; i < 8; i++) assert.equal(Frames.select({ act, gait: (i + 0.5) / 8 }), `walk-${i}`);
  }
  assert.equal(Frames.select({ act: 'jump', sprite: 'happy' }), null);
});

test('greeting settles and feeding leaves a bite in the coin', () => {
  assert.equal(Frames.select({ sprite: 'hello', spriteT: 0.25 }), 'wave-1');
  assert.equal(Frames.select({ sprite: 'hello', spriteT: 2.6 }), 'wave-3');
  assert.equal(Frames.select({ sprite: 'eat', act: 'munch', actT: 0.05 }), 'munch-0');
  assert.equal(Frames.select({ sprite: 'eat', act: 'munch', actT: 0.4 }), 'munch-1');
  assert.equal(Frames.select({ sprite: 'eat', act: 'munch', actT: 0.7 }), 'munch-2');
  assert.equal(Frames.select({ sprite: 'eat' }), 'munch-3');
});

test('jump poses follow anticipation, takeoff, tuck, and landing', () => {
  for (const [phase, frame] of [[0.02, null], [0.14, 'jump-0'], [0.25, 'jump-1'],
    [0.50, 'jump-2'], [0.75, 'jump-1'], [0.87, 'jump-3'], [0.97, null]]) {
    assert.equal(Frames.select({ act: 'jump', sprite: 'happy', jumpPhase: phase }), frame);
  }
});
