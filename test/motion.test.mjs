import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// motion.js is a plain browser script; run it on its own.
const source = fs.readFileSync(new URL('../app/motion.js', import.meta.url), 'utf8');
const Motion = vm.runInNewContext(`${source}; Motion`, { Math });

const FPS = 60;
const idle = { at: [1000, 500], height: 300, sprite: 'idle', act: '', held: false, tilt: 0, mirrored: false, look: 0 };

// A motion with repeatable randomness, run for `seconds` with what `input(t)` says.
function run(seconds, input = () => ({}), m = Motion.create(seeded(7))) {
  const frames = [];
  for (let i = 0; i < seconds * FPS; i++) {
    const t = i / FPS;
    Motion.step(m, 1 / FPS, { ...idle, ...input(t, m) });
    frames.push({ t, pose: m.pose, body: m.body, shadow: m.shadow });
  }
  return { m, frames };
}

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

const planted = (body) => body.ty === 0;

const walkingLeft = (from, to, speed = 66) => (t) => {
  const on = t >= from && t < to;
  const x = 1000 - speed * (Math.min(Math.max(t, from), to) - from);
  return { act: on ? 'walk' : '', at: [Math.round(x), 500] };
};

test('standing still, she only stirs a little', () => {
  const { frames } = run(10);
  for (const { t, pose, body } of frames.filter((f) => f.t > 1)) {
    assert.ok(Math.abs(pose.hair[0]) < 6 && Math.abs(pose.skirt[0]) < 2, `hair ${pose.hair} skirt ${pose.skirt} at ${t}`);
    assert.ok(Math.abs(pose.bend) < 0.03 && Math.abs(pose.head) < 0.07 && Math.abs(pose.tail) < 0.05);
    assert.ok(pose.feet.flat().every((value) => value === 0));
    assert.ok(pose.hips.every((value) => value === 0));
    assert.ok(planted(body), JSON.stringify(body));
  }
  // but she does breathe
  const breaths = frames.map((f) => f.pose.breath);
  assert.ok(Math.max(...breaths) > 0.9 && Math.min(...breaths) < -0.9);
});

test('walking, her feet take turns and her hair trails behind', () => {
  const { frames } = run(4.7, walkingLeft(0.5, 4, 93));
  const walking = frames.filter((f) => f.t > 1.2 && f.t < 4);
  // walking left, her hair streams out to the right
  assert.ok(walking.every((f) => f.pose.hair[0] > 3), 'hair trails');
  const lifted = walking.map(({ pose }) => pose.feet[0][1] > pose.feet[1][1] ? 0 : 1);
  const changes = lifted.filter((foot, i) => i && foot !== lifted[i - 1]).length;
  assert.ok(changes >= 3, `feet alternated ${changes} times`);
  for (const i of [0, 1]) {
    assert.ok(Math.max(...walking.map(({ pose }) => pose.feet[i][1])) > 40, 'each foot lifts');
  }
  assert.ok(walking.every((f) => f.pose.bend < -0.01), 'she leans forward');
  const last = frames.at(-1).pose;
  assert.ok(last.feet.flat().every((value) => Math.abs(value) < 1), 'the stride settles');
});

test('carried and tilted, her hair hangs down and her legs kick; her shadow goes', () => {
  const { frames } = run(3, (t) => ({ sprite: 'aha', held: t > 0.2, tilt: t > 0.2 ? 0.15 : 0 }));
  const held = frames[frames.length - 1];
  // tilted clockwise, down is to her right: that is where her hair hangs
  assert.ok(held.pose.hair[0] > 5, `hair ${held.pose.hair}`);
  assert.ok(held.pose.feet.every((foot) => foot[1] > 0) && held.pose.feet[0][0] !== held.pose.feet[1][0], 'legs kick');
  assert.ok(held.shadow < 0.01, 'no shadow in the air');
  assert.ok(planted(held.body), JSON.stringify(held.body));
});

test('turning round, she hops and her hair swings out behind her', () => {
  const { frames } = run(1.5, (t) => ({ mirrored: t >= 0.5 }));
  const hop = frames.filter((f) => f.t > 0.5 && f.t < 0.75);
  assert.ok(Math.min(...hop.map((f) => f.body.ty)) < -2, 'up in the air');
  assert.ok(frames.filter((f) => f.t > 0.8).every((f) => f.body.ty === 0), 'and down again');
  // facing right now: behind her is to the left on screen, which as drawn (mirrored) is +x
  const swung = frames.filter((f) => f.t > 0.5 && f.t < 0.9).map((f) => f.pose.hair[0]);
  assert.ok(Math.max(...swung) > 8, `hair ${Math.max(...swung)}`);
  const flip = frames.find(({ pose }) => pose.mirror);
  assert.ok(flip.t > 0.6 && flip.body.ty < -2, 'turns while airborne');
});

test('she blinks every few seconds, shutting her eyes all the way', () => {
  const { frames } = run(20);
  const starts = frames.filter((f, i) => i && f.pose.blink > 0 && frames[i - 1].pose.blink === 0);
  assert.ok(starts.length >= 3 && starts.length <= 10, `${starts.length} blinks in 20 s`);
  assert.ok(Math.max(...frames.map((f) => f.pose.blink)) === 1);
  const shut = frames.filter((f) => f.pose.blink > 0).length / FPS;
  assert.ok(shut < starts.length * 0.25, 'each blink is quick');
});

test('hops are as big as she is', () => {
  const peak = (height) => -Math.min(...run(1, (t) => ({ height, act: t > 0.1 ? 'jump' : '' })).frames.map((f) => f.body.ty));
  const [small, large] = [peak(240), peak(480)];
  assert.ok(small > 15 && large > 1.9 * small, `small ${small}, large ${large}`);
});

test('she keeps still enough to be drawn less often when nothing is going on', () => {
  const { m } = run(6);
  assert.equal(Motion.calm(m), true);
  const { m: walker } = run(1, walkingLeft(0.2, 1));
  assert.equal(Motion.calm(walker), false);
});

test('showing the same sprite again starts it over', () => {
  // clicked twice while happy: she hops again
  const hopping = (t) => ({ sprite: 'happy', shows: t < 1.5 ? 1 : 2 });
  const { frames } = run(2.5, hopping);
  const up = (from, to) => Math.min(...frames.filter((f) => f.t >= from && f.t < to).map((f) => f.body.ty));
  assert.ok(up(0, 1) < -5 && up(1.2, 1.5) === 0 && up(1.5, 2.5) < -5, 'hops, rests, hops again');
});

test('the gait advances with horizontal travel and stops during a pause', () => {
  const { m } = run(1, () => ({ act: 'walk' }));
  assert.equal(m.gait, 0.25);
  const start = m.gait;
  run(1, walkingLeft(0, 1), m);
  assert.notEqual(m.gait, start);
  const phase = m.gait;
  const x = m.lastX;
  run(1, () => ({ act: 'walk', at: [x, 650] }), m);
  assert.equal(m.gait, phase);
});

test('walking eases into the stride, brakes for the distance and settles its last step', () => {
  const dt = 1 / 60;
  const top = 45;
  const first = Motion.walkSpeed('walk', 0, 300, 300, dt);
  assert.ok(first > 0 && first < top / 10);
  assert.equal(Motion.walkSpeed('walk', top, 100, 300, dt), top);
  const brake = Motion.walkSpeed('walk', top, 4, 300, dt);
  assert.ok(brake < top && brake > 0);

  const { m } = run(0.1, () => ({ act: 'walk', at: [1450, 500], walkTravel: 0 }));
  assert.equal(m.gait, 0.25);
  run(dt, () => ({ act: 'walk', walkTravel: 15 }), m);
  const before = m.gait;
  run(0.16, () => ({ act: 'walk-stop', walkTravel: 0 }), m);
  assert.ok(m.gait > before && m.gait >= 0.75 - 1e-12);
});

test('jump and release lower the hips while the feet are on the floor', () => {
  const jump = run(1.2, (t) => ({ act: t < 1.10 ? 'jump' : '' })).frames;
  assert.ok(jump.some(({ pose, body }) => planted(body) && pose.hips[1] > 35));
  assert.ok(jump.some(({ pose, body }) => body.ty < -20 && pose.feet[0][1] > 25));
  const land = run(0.75, (t) => ({ held: t < 0.30 })).frames;
  assert.ok(land.some(({ t, pose, body }) => t > 0.30 && planted(body) && pose.hips[1] > 40));
});
