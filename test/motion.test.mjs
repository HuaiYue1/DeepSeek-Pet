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

// standing on her feet, not hopping, squashed or shaken
const planted = (body) => body.tx === 0 && body.ty === 0 && body.sx === 1 && body.sy === 1;

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
    assert.deepEqual([...pose.step.slice(1)], [0, 0, 0]);
    assert.ok(planted(body), JSON.stringify(body));
  }
  // but she does breathe
  const breaths = frames.map((f) => f.pose.breath);
  assert.ok(Math.max(...breaths) > 0.9 && Math.min(...breaths) < -0.9);
});

test('walking, her feet take turns and her hair trails behind', () => {
  const { frames } = run(3, walkingLeft(0.5, 2.5));
  const walking = frames.filter((f) => f.t > 1.2 && f.t < 2.5);
  // walking left, her hair streams out to the right
  assert.ok(walking.every((f) => f.pose.hair[0] > 3), 'hair trails');
  // the feet lift in turn: sin(phase) > 0 lifts the one on the left of the picture, < 0 the other
  const lifts = walking.map((f) => Math.sign(Math.sin(f.pose.step[0])));
  const changes = lifts.filter((s, i) => i && s !== lifts[i - 1]).length;
  assert.ok(changes >= 3, `feet alternated ${changes} times`);
  assert.ok(walking.every((f) => f.pose.step[2] > 25), 'feet lift while walking');
  assert.ok(walking.every((f) => f.pose.bend < -0.01), 'she leans forward');
  // stopped, the stride dies down and her feet come down again
  const last = frames[frames.length - 1].pose;
  assert.ok(last.step[1] < 1 && last.step[2] < 1 && last.step[3] < 0.5, `still stepping: ${last.step}`);
});

test('carried and tilted, her hair hangs down and her legs kick; her shadow goes', () => {
  const { frames } = run(3, (t) => ({ sprite: 'aha', held: t > 0.2, tilt: t > 0.2 ? 0.15 : 0 }));
  const held = frames[frames.length - 1];
  // tilted clockwise, down is to her right: that is where her hair hangs
  assert.ok(held.pose.hair[0] > 5, `hair ${held.pose.hair}`);
  assert.ok(held.pose.step[1] > 0 && held.pose.step[2] > 0, 'legs kick');
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
  assert.equal(frames[frames.length - 1].pose.mirror, true);
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
