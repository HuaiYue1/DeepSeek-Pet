// How DeepSeek-Pet hangs while you carry her, and how she lands.
//
// Carried, she hangs from the point you grabbed like a pendulum: her centre
// of mass is a weight on a rod from that point, pulled by gravity and yanked
// along when you move. So she trails behind when you set off, swings ahead
// when you stop and settles after a few swings. Held off-centre she hangs a
// little crooked, and she stretches a bit under her own weight, more when
// yanked upward. Held below her middle she wobbles about upright instead,
// like a balloon on a string. Let go, she swings upright and lands with a
// squash.
//
// Plain maths on a state object, no DOM: pet.js feeds in where the window is
// and draws the pose. Lengths are in px, times in seconds, angles in radians,
// clockwise like CSS rotate().
'use strict';

const Swing = (() => {
  const GRAVITY = 60; // pet heights/s²: hung by the head she swings about twice a second
  const GRIP_DAMPING = 3; // 1/s: a few visible swings before she hangs still
  const GRIP_GIVE = 70; // 1/s: how softly the grab point follows your hand
  const AIR_DRAG = 0.5; // 1/s: carried fast she trails back a little
  const MAX_LEAN = 0.2; // how crooked she hangs at most when held off-centre
  const MAX_ANGLE = 0.45; // bigger swings are eased off towards this...
  const MAX_ANGLE_UPRIGHT = 0.34; // ...or this when she is held below her middle
  const STRETCH = 0.025; // how much longer she hangs under her own weight
  const SHAPE_SPRING = 420; // 1/s²: how quickly she springs back into shape...
  const SHAPE_DAMPING = 12; // 1/s: ...and how soon the jiggle dies down
  const LAND_SQUASH = 1.3; // 1/s: how hard she lands when let go
  const STEP = 1 / 240; // physics substep

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function create() {
    return {
      held: false,
      hanging: true, // hung from above her centre of mass, or held from below it
      pivot: [0, 0], // grab point in her unrotated box
      feet: [0, 0], // bottom centre of her box
      height: 1, // her height
      length: 1, // grab point to centre of mass
      lean: 0, // how crooked she hangs at rest
      hand: [0, 0], // where the window is on screen
      at: [0, 0], // grab point on screen: follows the hand, softly...
      atVelocity: [0, 0], // ...at this speed
      mass: [0, 0], // centre of mass on screen...
      velocity: [0, 0], // ...and how fast it is moving
      tension: 0, // how hard the grab point pulls on her, in units of her weight
      angle: 0, // her tilt as drawn...
      spin: 0, // ...and how fast it changes
      stretch: 0, // 0.03 = 3 % taller (and a bit narrower)
      stretchRate: 0,
      pin: 0, // 1 = stretch about the grab point (held), 0 = about her feet
    };
  }

  // Tilt as drawn for a pendulum angle: small swings as they are, big ones eased off.
  const limit = (s) => (s.hanging ? MAX_ANGLE : MAX_ANGLE_UPRIGHT);
  const drawn = (s, theta) => limit(s) * Math.tanh(theta / limit(s));
  const undrawn = (s, angle) => limit(s) * Math.atanh(clamp(angle / limit(s), -0.99, 0.99));

  // Pendulum angle of her centre of mass: 0 straight below the grab point
  // (above it if held from below), positive towards +x.
  function massAngle(s) {
    const dx = s.mass[0] - s.at[0];
    const dy = s.mass[1] - s.at[1];
    return s.hanging ? Math.atan2(dx, dy) : Math.atan2(dx, -dy);
  }

  // Tilt for a pendulum angle, and the other way round.
  const tilt = (s, psi) => (s.hanging ? s.lean - psi : psi);
  const psiFor = (s, theta) => (s.hanging ? s.lean - theta : theta);

  function placeMass(s, psi) {
    const up = s.hanging ? 1 : -1;
    s.mass = [s.at[0] + s.length * Math.sin(psi), s.at[1] + up * s.length * Math.cos(psi)];
  }

  // Picked up at `pivot` (in her box of `size`), whose centre of mass is at
  // `com`, while the window is at `at` on screen.
  function grab(s, { pivot, com, size, at }) {
    const [w, h] = size;
    const dx = com[0] - pivot[0];
    const dy = com[1] - pivot[1];
    s.hanging = dy >= 0;
    // she may still be swinging from the last time: carry on from her tilt
    const theta = undrawn(s, s.angle);
    Object.assign(s, {
      held: true,
      pivot,
      feet: [w / 2, h],
      height: h,
      length: Math.max(Math.hypot(dx, dy), 0.15 * h),
      lean: dy >= 0 ? clamp(Math.atan2(dx, dy), -MAX_LEAN, MAX_LEAN) : 0,
      hand: [...at],
      at: [...at],
      atVelocity: [0, 0],
      velocity: [0, 0],
      tension: 0,
      pin: 1,
    });
    placeMass(s, psiFor(s, theta));
    s.angle = drawn(s, theta);
    s.spin = 0;
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
      const g = GRAVITY * s.height * (s.hanging ? 1 : -1);
      const grip = 1 - Math.exp(-GRIP_DAMPING * h);
      const air = 1 - Math.exp(-AIR_DRAG * h);
      let pull = 0;
      for (let i = 1; i <= n; i++) {
        // the grab point follows the window through a little give, so she
        // isn't shaken by the window moving in whole-pixel steps
        const hand = [from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n];
        const av = s.atVelocity;
        for (const k of [0, 1]) {
          av[k] += (GRIP_GIVE * GRIP_GIVE * (hand[k] - s.at[k]) - 2 * GRIP_GIVE * av[k]) * h;
          s.at[k] += av[k] * h;
        }
        const v = s.velocity;
        // the grip damps her swinging relative to your hand, the air her motion
        v[0] -= (v[0] - av[0]) * grip + v[0] * air;
        v[1] -= (v[1] - av[1]) * grip + v[1] * air;
        v[1] += g * h;
        const before = s.mass;
        const moved = [before[0] + v[0] * h, before[1] + v[1] * h];
        // the rod from the grab point keeps her centre of mass at arm's length
        const dx = moved[0] - s.at[0];
        const dy = moved[1] - s.at[1];
        const r = Math.hypot(dx, dy) || 1;
        pull += (r - s.length) / (h * h);
        s.mass = [s.at[0] + (dx * s.length) / r, s.at[1] + (dy * s.length) / r];
        // never let her swing up past the horizontal
        const psi = massAngle(s);
        if (Math.abs(psi) > 1.4) placeMass(s, Math.sign(psi) * 1.4);
        s.velocity = [(s.mass[0] - before[0]) / h, (s.mass[1] - before[1]) / h];
      }
      s.hand = [...to];
      const tension = clamp(pull / n / Math.abs(g), 0, 2);
      s.tension += (tension - s.tension) * (1 - Math.exp(-dt / 0.03));
      const angle = drawn(s, tilt(s, massAngle(s)));
      s.spin = (angle - s.angle) / dt;
      s.angle = angle;
    } else {
      // back on her feet: straighten up
      for (let i = 0; i < n; i++) {
        s.spin += (-90 * s.angle - 14 * s.spin) * h;
        s.angle += s.spin * h;
      }
      s.pin *= Math.exp(-dt / 0.08);
    }
    // squash and stretch: hanging she stretches with the pull, held from
    // below she squashes a little, standing she keeps her shape
    const rest = !s.held ? 0 : s.hanging ? STRETCH * s.tension : -0.5 * STRETCH * s.tension;
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
