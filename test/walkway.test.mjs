// Where she can walk, on made-up screen layouts. Run with `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { walkStep, surroundings, neighbour } from '../app/walkway.js';

// Her 中 size: a 360x390 window, body 204x300 in the middle, feet 18 px up.
const pet = { w: 204, h: 300, floor: 18 };
const size = { width: 360, height: 390 };
const display = (id, x, y, width, height, taskbar = 0) => ({
  id,
  bounds: { x, y, width, height },
  workArea: { x, y, width, height: height - taskbar },
});
// her window with her feet at `feet` and her body's left edge at `left`
const at = (left, feet) => ({ x: left - 78, y: feet - size.height + pet.floor, ...size });
const bodyLeft = (step) => step.x + 78;
const feet = (step) => step.y + size.height - pet.floor;

// A: 1920x1080 with a 40 px taskbar. B: 1600x900 to its right, 90 px lower, no taskbar.
const A = display(1, 0, 0, 1920, 1080, 40);
const B = display(2, 1920, 90, 1600, 900);

test('walks along her floor within the screen', () => {
  const s = walkStep(at(500, 1040), 5, pet, [A], true);
  assert.deepEqual([bodyLeft(s), feet(s), s.hop], [505, 1040, false]);
});

test('stops at the edge of a lone screen, and never walks further out', () => {
  const s = walkStep(at(1920 - 204 - 2, 1040), 5, pet, [A], true);
  assert.equal(bodyLeft(s) + 204, 1920);
  const past = walkStep(at(1800, 1040), 5, pet, [A], true); // dragged half off the screen
  assert.equal(bodyLeft(past), 1800);
  const back = walkStep(at(1800, 1040), -5, pet, [A], true); // but can walk back
  assert.equal(bodyLeft(back), 1795);
});

test('without crossing screens she stops at the edge between them', () => {
  const s = walkStep(at(1920 - 204, 1040), 5, pet, [A, B], false);
  assert.equal(bodyLeft(s) + 204, 1920);
});

test('standing on the taskbar, she walks on to the next screen onto its floor', () => {
  const s = walkStep(at(1920 - 204, 1040), 5, pet, [A, B], true);
  assert.equal(bodyLeft(s), 1920 - 204 + 5);
  assert.equal(feet(s), 990); // B's bottom edge
  assert.equal(s.hop, true);
  // once over there she just keeps walking, and back again the other way
  const on = walkStep(at(1930, 990), 5, pet, [A, B], true);
  assert.deepEqual([bodyLeft(on), feet(on), on.hop], [1935, 990, false]);
  const back = walkStep(at(1921, 990), -5, pet, [A, B], true);
  assert.equal(bodyLeft(back), 1916);
  assert.equal(feet(back), 1040); // back on A's taskbar
});

test('in mid-air she keeps her height on the next screen if it fits', () => {
  const s = walkStep(at(1920 - 204, 600), 5, pet, [A, B], true);
  assert.deepEqual([feet(s), s.hop], [600, false]);
  const high = walkStep(at(1920 - 204, 200), 5, pet, [A, B], true); // B starts 90 px lower
  assert.equal(feet(high), 90 + 300);
});

test('knows when she stands on a taskbar and which screens are next to hers', () => {
  const onA = surroundings(at(800, 1040), pet, [A, B], true);
  assert.deepEqual([onA.display.id, onA.grounded, onA.taskbar, onA.left, onA.right], [1, true, 40, false, true]);
  const onB = surroundings(at(2500, 990), pet, [A, B], true);
  assert.deepEqual([onB.display.id, onB.grounded, onB.taskbar, onB.left, onB.right], [2, true, 0, true, false]);
  const air = surroundings(at(800, 600), pet, [A, B], false);
  assert.deepEqual([air.grounded, air.taskbar, air.right], [false, 0, false]);
});

test('knows how far she can walk either way on her screen', () => {
  const s = surroundings(at(800, 1040), pet, [A, B], true);
  assert.deepEqual([s.roomLeft, s.roomRight], [800, 1920 - 800 - 204]);
  const past = surroundings(at(1800, 1040), pet, [A], true); // dragged half off it
  assert.equal(past.roomRight, 0);
});

test('screens that only touch at a corner are not neighbours', () => {
  const C = display(3, 1920, 1080, 1920, 1080);
  assert.equal(neighbour([A, C], A, 1), null);
});
