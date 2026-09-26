// How DeepSeek-Pet hangs while you carry her, and how she lands.
//
// Carried, she is a rigid body held at the point you grabbed. Gravity and
// being yanked along turn her about that point, more the further it is from
// her centre of mass, and your grip holds her fairly firmly upright, the way
// you'd carry a figurine. So she only tilts a little: she trails behind when
// you set off, leans ahead when you stop and settles after one small swing.
// Held by the side she droops a bit; held at her middle she hardly turns.
// She stretches a touch under her own weight (squashes, if held from below).
// Let go, she straightens up and lands with a small squash.
//
// Plain maths on a state object, no DOM: pet.js feeds in where the window is
// and draws the pose. Lengths are in px, times in seconds, angles in radians,
// clockwise like CSS rotate().
'use strict';

const Swing = (() => {
  const GRAVITY = 60; // pet heights/s²
  const GRIP_STIFFNESS = 400; // 1/s²: how firmly your grip holds her upright...
  const GRIP_DAMPING = 24; // 1/s: ...and how quickly it stops her swinging
  const GRIP_GIVE = 70; // 1/s: how softly the grab point follows your hand
  const AIR_DRAG = 0.5; // 1/s: carried fast she trails back a little
  const MAX_ANGLE = 0.25; // bigger tilts are eased off towards this
  const STRETCH = 0.012; // how much longer she hangs under her own weight
  const SHAPE_SPRING = 420; // 1/s²: how quickly she springs back into shape...
  const SHAPE_DAMPING = 22; // 1/s: ...and how soon the jiggle dies down
  const LAND_SQUASH = 0.8; // 1/s: how hard she lands when let go
  const STEP = 1 / 240; // physics substep

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // Tilt as drawn: small tilts as they are, big ones eased off.
  const drawn = (theta) => MAX_ANGLE * Math.tanh(theta / MAX_ANGLE);
  const undrawn = (angle) => MAX_ANGLE * Math.atanh(clamp(angle / MAX_ANGLE, -0.99, 0.99));

  function create() {
    return {
      held: false,
      pivot: [0, 0], // grab point in her unrotated box
      feet: [0, 0], // bottom centre of her box
      height: 1, // her height
      offset: [0, 0], // grab point to centre of mass, unrotated
      inertia: 1, // moment of inertia about the grab point, per unit of mass
      hand: [0, 0], // where the window is on screen
      at: [0, 0], // grab point on screen: follows the hand, softly...
      atVelocity: [0, 0], // ...at this speed
      theta: 0, // her tilt while held...
      omega: 0, // ...and how fast it changes
      tension: 0, // how hard the grab point pulls on her, in units of her weight
      angle: 0, // her tilt as drawn...
      spin: 0, // ...and how fast it changes
      stretch: 0, // 0.01 = 1 % taller (and a bit narrower)
      stretchRate: 0,
      pin: 0, // 1 = stretch about the grab point (held), 0 = about her feet
    };
  }

  // Picked up at `pivot` in her box of `size`, whose centre of mass is at
  // `com` and radius of gyration is `spread`, while the window is at `at`.
  function grab(s, { pivot, com, spread, size, at }) {
    const offset = [com[0] - pivot[0], com[1] - pivot[1]];
    Object.assign(s, {
      held: true,
      pivot,
      feet: [size[0] / 2, size[1]],
      height: size[1],
      offset,
      inertia: spread * spread + offset[0] * offset[0] + offset[1] * offset[1],
      hand: [...at],
      at: [...at],
      atVelocity: [0, 0],
      // she may still be tilting from the last time: carry on from there
      theta: undrawn(s.angle),
      omega: 0,
      tension: 0,
      pin: 1,
    });
  }

  function release(s) {
    if (!s.held) return;
    s.held = false;
    s.stretchRate -= LAND_SQUASH;
  }

  // Advance by `dt` seconds. `at` is where the window is now.
  function step(s, dt, at) {
    const n = Math.max(1, Math.ceil(dt / STEP));
    const h = dt / n;
    if (s.held) {
      const from = s.hand;
      const to = at || from;
      const g = GRAVITY * s.height;
      let pull = 0;
      for (let i = 1; i <= n; i++) {
        // the grab point follows the window through a little give, so she
        // isn't shaken by the window moving in whole-pixel steps
        const hand = [from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n];
        const av = s.atVelocity;
        const acc = [0, 1].map((k) => GRIP_GIVE * GRIP_GIVE * (hand[k] - s.at[k]) - 2 * GRIP_GIVE * av[k]);
        for (const k of [0, 1]) {
          av[k] += acc[k] * h;
          s.at[k] += av[k] * h;
        }
        // what pulls on her, seen from your hand: gravity, being yanked along, the air
        const fx = -acc[0] - AIR_DRAG * av[0];
        const fy = g - acc[1] - AIR_DRAG * av[1];
        // that turns her about the grab point, and your grip holds her upright
        const cos = Math.cos(s.theta);
        const sin = Math.sin(s.theta);
        const rx = s.offset[0] * cos - s.offset[1] * sin;
        const ry = s.offset[0] * sin + s.offset[1] * cos;
        const torque = rx * fy - ry * fx;
        s.omega += (torque / s.inertia - GRIP_STIFFNESS * s.theta - GRIP_DAMPING * s.omega) * h;
        s.theta += s.omega * h;
        // how hard the grab point pulls on her (negative: pushes up from below)
        const r = Math.hypot(rx, ry);
        if (r > 1) pull += (rx * fx + ry * fy) / r + r * s.omega * s.omega;
      }
      s.hand = [...to];
      s.tension += (clamp(pull / n / g, -1, 2) - s.tension) * (1 - Math.exp(-dt / 0.03));
      const angle = drawn(s.theta);
      s.spin = (angle - s.angle) / dt;
      s.angle = angle;
    } else {
      // back on her feet: straighten up
      for (let i = 0; i < n; i++) {
        s.spin += (-160 * s.angle - 22 * s.spin) * h;
        s.angle += s.spin * h;
      }
      s.pin *= Math.exp(-dt / 0.08);
    }
    // squash and stretch: held, she stretches with the pull; standing, she
    // keeps her shape
    const rest = s.held ? STRETCH * s.tension : 0;
    for (let i = 0; i < n; i++) {
      s.stretchRate += (SHAPE_SPRING * (rest - s.stretch) - SHAPE_DAMPING * s.stretchRate) * h;
      s.stretch += s.stretchRate * h;
    }
  }

  function resting(s) {
    return !s.held && Math.abs(s.angle) < 0.002 && Math.abs(s.spin) < 0.02
      && Math.abs(s.stretch) < 0.001 && Math.abs(s.stretchRate) < 0.02 && s.pin < 0.01;
  }

  // What to draw: rotate by `angle` about the grab point, then scale by
  // (sx, sy) about her feet and shift by (tx, ty) so that, while she is
  // held, the grab point stays under the mouse.
  function pose(s) {
    const sy = 1 + s.stretch;
    const sx = 1 - 0.6 * s.stretch;
    return {
      angle: s.angle,
      sx,
      sy,
      tx: (1 - sx) * (s.pivot[0] - s.feet[0]) * s.pin,
      ty: (1 - sy) * (s.pivot[1] - s.feet[1]) * s.pin,
    };
  }

  return { create, grab, release, step, resting, pose };
})();
