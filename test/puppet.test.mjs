import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// puppet.js is a plain browser script; its mesh maths runs without WebGL.
const source = fs.readFileSync(new URL('../app/puppet.js', import.meta.url), 'utf8');
const Puppet = vm.runInNewContext(`${source}; Puppet`, { Math, Float32Array, Uint16Array });
const { RIGS } = await import('../art/states.mjs');

const [PX, PY] = Puppet.PAD;
// a point of the picture (fractions of it) on the canvas, standing still
const onCanvas = (u, v) => [(u + PX) / (1 + 2 * PX), (v + PY) / (1 + 2 * PY)];
const pose = (changes) => ({ ...Puppet.REST, ...changes });
const bent = (p, rig) => {
  const mesh = Puppet.makeMesh();
  Puppet.setRig(mesh, rig);
  Puppet.bend(mesh, p);
  return mesh;
};
// how far each point of the mesh moved from where it stands still, in sprite px
const moved = (mesh, rest, v) => Math.hypot((mesh.at[2 * v] - rest.at[2 * v]) * (1 + 2 * PX) * 908, (mesh.at[2 * v + 1] - rest.at[2 * v + 1]) * (1 + 2 * PY) * 1337);
const near = (mesh, x, y) => {
  let best = 0;
  for (let v = 1; v < mesh.n; v++) {
    const d = (i) => Math.hypot(mesh.uv[2 * i] * 908 - x, mesh.uv[2 * i + 1] * 1337 - y);
    if (d(v) < d(best)) best = v;
  }
  return best;
};

test('standing still, the mesh is the picture as it is', () => {
  const mesh = bent(Puppet.REST);
  for (let v = 0; v < mesh.n; v++) {
    const [x, y] = onCanvas(mesh.uv[2 * v], mesh.uv[2 * v + 1]);
    assert.ok(Math.abs(mesh.at[2 * v] - x) < 1e-6 && Math.abs(mesh.at[2 * v + 1] - y) < 1e-6);
  }
});

test('facing right, the picture is mirrored', () => {
  const mesh = bent(pose({ mirror: true }));
  for (let v = 0; v < mesh.n; v++) {
    const [x, y] = onCanvas(1 - mesh.uv[2 * v], mesh.uv[2 * v + 1]);
    assert.ok(Math.abs(mesh.at[2 * v] - x) < 1e-6 && Math.abs(mesh.at[2 * v + 1] - y) < 1e-6);
  }
});

test('a wave moves the raised hand and leaves the rest of her be', () => {
  const rest = bent(Puppet.REST, RIGS.hello);
  const waving = bent(pose({ wave: 0.13 }), RIGS.hello);
  assert.ok(moved(waving, rest, near(rest, 640, 360)) > 15, 'fingers');
  for (const [x, y] of [[250, 600], [470, 280], [450, 1250], [840, 800]]) assert.ok(moved(waving, rest, near(rest, x, y)) < 0.5, `${x},${y}`);
});

test('walking lifts one foot while the other stays down', () => {
  const rest = bent(Puppet.REST);
  const step = bent(pose({ step: [Math.PI / 2, 14, 30, 0] })); // lifting the foot on the left of the picture
  assert.ok(moved(step, rest, near(rest, 370, 1270)) > 25, 'left foot up');
  assert.ok(moved(step, rest, near(rest, 490, 1300)) < 1, 'right foot down');
});

test('the mouse finds the same bit of her however she is bent', () => {
  const poses = [
    pose({ hair: [30, 5], skirt: [15, -4], head: 0.1, bend: -0.06, tail: 0.12, ahoge: 0.3, breath: 1 }),
    pose({ mirror: true, step: [2.1, 20, 44, 16], hair: [-25, 3], tail: -0.1 }),
    pose({ wave: -0.13, head: -0.05 }),
  ];
  for (const p of poses) {
    const mesh = bent(p, RIGS.hello);
    let found = 0;
    for (let v = 0; v < mesh.n; v++) {
      const at = Puppet.pick(mesh, mesh.at[2 * v], mesh.at[2 * v + 1]);
      if (at && Math.abs(at[0] - mesh.uv[2 * v]) < 1e-3 && Math.abs(at[1] - mesh.uv[2 * v + 1]) < 1e-3) found++;
    }
    // all but the odd point where a part swings over another
    assert.ok(found > 0.99 * mesh.n, `${found} of ${mesh.n}`);
  }
  // and nothing off the edge of her picture
  assert.equal(Puppet.pick(bent(Puppet.REST), 0.01, 0.01), null);
});
