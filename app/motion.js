// How DeepSeek-Pet moves by herself, part by part (drawn by puppet.js):
// she breathes and blinks; her hair, skirt, tail and the strand of hair on
// top of her head swing after her when she moves; her feet take steps when
// she walks; and she tilts her head, leans, wags, waves and bounces along
// with whatever she is doing.
//
// Plain maths on a state object, like swing.js: pet.js says each frame what
// she is up to and where her window is, and draws the pose. Lengths are in
// the sprite's pixels (908x1337) unless they say screen px; times are in
// seconds, angles in radians, clockwise. Forward is to the left, as drawn.
'use strict';

const Motion = (() => {
  const TAU = 2 * Math.PI;
  const SPRITE_HEIGHT = 1337; // px, as in puppet.js
  // The parts that swing after her: stiffness (1/s²) and damping (1/s), how
  // much of her window's acceleration they feel, how much the air holds
  // them back while she moves (1/s) and how far they swing at most (px).
  const HAIR = { k: 36, c: 4, lag: 0.05, drag: 1.2, max: 36 };
  const SKIRT = { k: 110, c: 8, lag: 0.04, drag: 1, max: 22 };
  const AHOGE = { k: 220, c: 5, lag: 0.12, max: 0.35 };
  const AHOGE_ARM = [-100, -30]; // from its root to its middle, as drawn
  const AIR_SPEED = 150; // screen px/s: carried faster, the air holds her hair back no further
  const FOLLOW = 30; // 1/s: how closely the smoothed window follows the real one
  const MAX_ACCEL = 4000; // screen px/s²: more than this is her window jumping
  const STEP = 1 / 120;
  // walking: seconds per pair of steps; how far the feet swing, how high
  // they lift and how high she rises, px; how far she leans forward
  const GAIT = {
    walk: { period: 0.64, sweep: 14, lift: 30, bob: 10, lean: -0.035 },
    run: { period: 0.36, sweep: 20, lift: 44, bob: 16, lean: -0.08 },
  };
  // tail wag by sprite (or activity): [angle, seconds per wag]
  const WAG = {
    idle: [0.035, 2.4], hello: [0.09, 0.8], happy: [0.1, 0.75], aha: [0.05, 1], eat: [0.07, 0.65],
    think: [0.03, 3], busy: [0.05, 0.32], sleep: [0.015, 5], sideeye: [0.07, 1.2],
    dance: [0.14, 0.45], walk: [0.06, 0.64], run: [0.08, 0.36], held: [0.07, 0.9],
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const ease = (v) => v * v * (3 - 2 * v);

  function create(random = Math.random) {
    return {
      random,
      t: 0,
      sprite: '',
      spriteT: 0, // how long this sprite has been showing
      act: '',
      actT: 0, // how long she has been doing this
      mirrored: false,
      turnT: Infinity, // since she last turned round
      at: null, // her window, smoothed (screen px)...
      atV: [0, 0], // ...how fast it moves
      atA: [0, 0], // ...and how fast that changes
      hair: { x: [0, 0], v: [0, 0] }, // as seen on screen, not as drawn
      skirt: { x: [0, 0], v: [0, 0] },
      ahoge: { a: 0, v: 0 },
      lift: [0, 0, 0], // her body's height above the floor (px) over the last frames
      breath: 0, // phase
      gait: 0, // phase
      stride: 0, // 0 standing .. 1 walking
      gaitKind: GAIT.walk,
      head: [0, 0], // angle and how fast it changes
      bend: [0, 0],
      tail: 0, // phase
      wag: 0.035, // how far she wags now
      blinkT: Infinity, // since this blink started
      blinkIn: 1.5 + 3 * random(), // until the next one
      blinkAgain: false,
      glance: 0, // where she glances when idle...
      glanceIn: 2 + 4 * random(), // ...and until she glances again
      kick: 0, // legs kicking while carried: phase
      shadow: 1,
      pose: null,
      body: { tx: 0, ty: 0, sx: 1, sy: 1 },
    };
  }

  // A critically damped spring towards `target` at `rate` (1/s).
  function follow(s, target, rate, dt) {
    s[1] += (rate * rate * (target - s[0]) - 2 * rate * s[1]) * dt;
    s[0] += s[1] * dt;
  }

  // A jump `height` screen px high taking `time` seconds, `t` seconds in:
  // her height and her squash (positive: stretched tall).
  function hop(t, time, height) {
    const u = t / time;
    if (u < 0 || u >= 1) return [0, 0];
    if (u < 0.2) return [0, -0.06 * Math.sin((Math.PI * u) / 0.2)]; // crouch
    if (u < 0.82) {
      const a = (u - 0.2) / 0.62;
      return [height * 4 * a * (1 - a), 0.04 * (1 - a) * (1 - a)]; // up and down, stretched as she leaves the floor
    }
    return [0, -0.05 * Math.sin((Math.PI * (u - 0.82)) / 0.18)]; // landing
  }

  // Keyframes [[u, value]...] at `u` (0..1), eased between.
  function keys(frames, u) {
    for (let i = 1; i < frames.length; i++) {
      if (u <= frames[i][0]) {
        const [u0, v0] = frames[i - 1];
        const [u1, v1] = frames[i];
        return v0 + (v1 - v0) * ease(clamp((u - u0) / (u1 - u0), 0, 1));
      }
    }
    return frames[frames.length - 1][1];
  }

  // A part hanging off her (hair, skirt), as seen on screen: pushed by `force`.
  function swingPart(part, spec, force, dt) {
    for (const k of [0, 1]) {
      part.v[k] += (force[k] - spec.k * part.x[k] - spec.c * part.v[k]) * dt;
      part.x[k] = clamp(part.x[k] + part.v[k] * dt, -3 * spec.max, 3 * spec.max);
    }
  }

  // Advance by `dt` seconds. `now` is what she is up to:
  //   at        her window on screen (screen px)
  //   height    how tall she is on screen (screen px)
  //   sprite    the sprite showing
  //   act       what she is doing: walk, run, jump, tap, dance, stretch, munch, wave or ''
  //   held      being carried, `tilt` tilted by this much (swing.js)
  //   mirrored  facing right
  //   look      a head tilt she wants, or 0
  function step(m, dt, now) {
    const r = m.random;
    m.t += dt;
    // turned round (rather than shown another way round with another sprite)
    const turned = now.mirrored !== m.mirrored && now.sprite === m.sprite && !now.held;
    m.mirrored = now.mirrored;
    m.turnT = turned ? 0 : m.turnT + dt;
    if (now.sprite !== m.sprite) {
      m.sprite = now.sprite;
      m.spriteT = 0;
      if (now.sprite === 'aha') m.blinkIn = 0.45; // a surprised blink
    } else {
      m.spriteT += dt;
    }
    if (now.act !== m.act) [m.act, m.actT] = [now.act, 0];
    else m.actT += dt;
    const scale = SPRITE_HEIGHT / now.height; // sprite px per screen px
    const k = now.height / 300; // her size: 1 is 中
    const act = now.held ? 'held' : now.act;
    const back = now.mirrored ? -1 : 1; // behind her, on screen

    // her window's movement, smoothed: it moves in whole pixels
    if (!m.at || Math.hypot(now.at[0] - m.at[0], now.at[1] - m.at[1]) > 400) {
      m.at = [...now.at];
      m.atV = [0, 0];
    }

    // walking: a stride that builds up when she sets off and dies down when she stops
    const gait = GAIT[act];
    if (gait) m.gaitKind = gait;
    const walking = !!gait;
    m.stride += ((walking ? 1 : 0) - m.stride) * (1 - Math.exp(-dt * (walking ? 10 : 7)));
    if (m.stride > 0.005) m.gait = (m.gait + (TAU * dt) / m.gaitKind.period) % TAU;
    const bob = m.gaitKind.bob * m.stride * Math.abs(Math.sin(m.gait));

    // her body going up and down on the spot: hops, bounces, dips (screen px)
    let ty = 0;
    let squash = 0;
    let tx = 0;
    if (!now.held) {
      if (act === 'jump') [ty, squash] = hop(m.actT, 0.45, 26 * k);
      else if (m.sprite === 'happy' && !act && m.spriteT < 1) [ty, squash] = hop(m.spriteT % 0.5, 0.5, 12 * k); // two happy hops
      if (m.turnT < 0.26) {
        const [h, q] = hop(m.turnT, 0.26, 5 * k);
        ty += h;
        squash += q;
      }
      if (act === 'dance') {
        ty += 7 * k * Math.abs(Math.sin((TAU * m.actT) / 0.9));
        squash -= 0.015 * (1 - Math.abs(Math.sin((TAU * m.actT) / 0.9)));
      }
      if (act === 'tap' && m.actT < 1.5) ty -= 3 * k * Math.sin((Math.PI * m.actT) / 0.5) ** 2;
      if (act === 'stretch') squash += 0.06 * keys([[0, 0], [0.35, 1], [0.6, 1], [0.8, -0.42], [1, 0]], m.actT / 1.8);
      if (m.sprite === 'busy') tx = 1.5 * k * Math.sin((TAU * m.t) / 0.24);
      if (m.spriteT < 0.6) squash += 0.03 * Math.exp(-6 * m.spriteT) * Math.cos(22 * m.spriteT); // a pop as she changes
    }
    m.body = { tx, ty: -ty, sx: 1 - 0.6 * squash, sy: 1 + squash };
    // how high her upper body is, in sprite px, for how it pushes her hair about
    m.lift = [m.lift[1], m.lift[2], ty * scale + bob];

    // the springs, in small steps
    const n = Math.max(1, Math.ceil(dt / STEP));
    const h = dt / n;
    const liftA = dt > 0 ? (m.lift[2] - 2 * m.lift[1] + m.lift[0]) / (dt * dt) : 0;
    const breeze = Math.sin(0.83 * m.t) + 0.6 * Math.sin(1.91 * m.t + 1.3);
    for (let i = 0; i < n; i++) {
      for (const j of [0, 1]) {
        const a = FOLLOW * FOLLOW * (now.at[j] - m.at[j]) - 2 * FOLLOW * m.atV[j];
        m.atV[j] += a * h;
        m.at[j] += m.atV[j] * h;
        m.atA[j] = clamp(a, -MAX_ACCEL, MAX_ACCEL);
      }
      // what pushes her hair and skirt, in sprite px/s²: being moved about,
      // the air, going up and down, and gravity when she is tilted
      const air = m.atV.map((v) => AIR_SPEED * Math.tanh(v / AIR_SPEED) * scale);
      const push = (spec) => [
        -spec.lag * m.atA[0] * scale - spec.drag * air[0] + (now.held ? spec.k * 90 * Math.sin(now.tilt || 0) : 0),
        -spec.lag * m.atA[1] * scale - 0.3 * spec.drag * air[1] + 0.5 * spec.lag * liftA,
      ];
      const hair = push(HAIR);
      hair[0] += HAIR.k * 2.5 * breeze;
      swingPart(m.hair, HAIR, hair, h);
      const skirt = push(SKIRT);
      skirt[0] += SKIRT.k * 3 * m.stride * Math.sin(m.gait - 0.6) * back; // swishing with her steps
      swingPart(m.skirt, SKIRT, skirt, h);
      // the strand on her head: a little pendulum from its root
      const arm = [AHOGE_ARM[0] * back, AHOGE_ARM[1]];
      const f = [-AHOGE.lag * m.atA[0] * scale, -AHOGE.lag * m.atA[1] * scale + AHOGE.lag * liftA];
      const torque = (arm[0] * f[1] - arm[1] * f[0]) / (arm[0] * arm[0] + arm[1] * arm[1]);
      m.ahoge.v += (torque - AHOGE.k * m.ahoge.a - AHOGE.c * m.ahoge.v) * h;
      m.ahoge.a = clamp(m.ahoge.a + m.ahoge.v * h, -3 * AHOGE.max, 3 * AHOGE.max);
    }
    if (turned) {
      // turning round flings her hair and skirt out behind her
      m.hair.v[0] += 110 * back;
      m.skirt.v[0] += 80 * back;
    }

    // head: glances now and then, tilts along with what she is doing
    m.glanceIn -= dt;
    if (m.glanceIn <= 0) {
      m.glance = r() < 0.4 ? 0 : (r() - 0.5) * 0.1;
      m.glanceIn = 2.5 + 5 * r();
    }
    let head = m.glance;
    if (now.look) head = now.look;
    else if (m.sprite === 'sleep') head = 0.08 + 0.02 * Math.sin((TAU * m.t) / 5.2);
    else if (m.sprite === 'think') head = 0.05 + 0.015 * Math.sin((TAU * m.t) / 3.1);
    else if (m.sprite === 'sideeye') head = -0.035;
    else if (act === 'held') head = 0.03 * Math.sin(1.3 * m.t);
    else if (walking) head = 0.01 * Math.sin(2 * m.gait);
    else if (act === 'tap') head = 0.06;
    follow(m.head, head, 9, dt);
    let headSway = 0;
    if (act === 'dance') headSway = -0.07 * Math.sin((TAU * m.actT) / 0.9 + 0.5) * Math.min(1, m.actT / 0.3);
    if (act === 'munch') headSway = 0.012 * Math.sin((TAU * m.actT) / 0.32);

    // leaning from the hips
    let bend = 0.01 * Math.sin((TAU * m.t) / 6.3) + 0.005 * Math.sin((TAU * m.t) / 3.7); // shifting her weight
    if (walking) bend = gait.lean;
    else if (act === 'held') bend = 0;
    else if (act === 'stretch') bend = 0.03 * keys([[0, 0], [0.35, 1], [0.6, 1], [0.8, 0]], m.actT / 1.8);
    else if (m.sprite === 'sleep') bend = 0.02;
    follow(m.bend, bend, 8, dt);
    let bendSway = 0.012 * m.stride * Math.sin(m.gait); // rocking from foot to foot
    if (act === 'dance') bendSway += 0.07 * Math.sin((TAU * m.actT) / 0.9) * Math.min(1, m.actT / 0.3);
    if (act === 'tap' && m.actT < 1.5) bendSway -= 0.13 * Math.sin((Math.PI * m.actT) / 0.5) ** 2;
    if (act === 'wave') bendSway += 0.02 * Math.sin((TAU * m.actT) / 0.7 + 1);

    // tail
    const [wag, period] = WAG[act] || WAG[m.sprite] || WAG.idle;
    m.wag += (wag - m.wag) * (1 - Math.exp(-3 * dt));
    m.tail = (m.tail + (TAU * dt) / period) % TAU;

    // breathing: slower and deeper asleep, quicker when flustered
    const breathing = m.sprite === 'sleep' ? [5.2, 1.3] : m.sprite === 'busy' ? [1.6, 0.8] : act === 'run' ? [1.4, 0.8] : [3.6, 1];
    m.breath = (m.breath + (TAU * dt) / breathing[0]) % TAU;

    // blinking, now and then, sometimes twice
    m.blinkIn -= dt;
    m.blinkT += dt;
    if (m.blinkIn <= 0) {
      m.blinkT = 0;
      m.blinkAgain = !m.blinkAgain && r() < 0.15;
      m.blinkIn = m.blinkAgain ? 0.28 : 2.2 + 4 * r();
    }
    const bt = m.blinkT;
    let blink = bt < 0.06 ? (bt / 0.06) ** 2 : bt < 0.1 ? 1 : bt < 0.2 ? 1 - ease((bt - 0.1) / 0.1) : 0;
    if (act === 'stretch') blink = Math.max(blink, keys([[0, 0], [0.25, 1], [0.7, 1], [0.8, 0]], m.actT / 1.8)); // eyes squeezed shut

    // a raised hand waves, a coin is nibbled
    let wave = 0;
    if (act === 'wave') wave = 0.13 * Math.sin((TAU * m.actT) / 0.62);
    else if (m.sprite === 'hello' && m.spriteT < 2.5) wave = 0.11 * Math.sin((TAU * m.spriteT) / 0.62) * Math.min(1, (2.5 - m.spriteT) / 0.4);
    else if (m.sprite === 'happy') wave = 0.09 * Math.sin((TAU * m.spriteT) / 0.5);
    wave *= Math.min(1, (act === 'wave' ? m.actT : m.spriteT) / 0.15);
    const bite = act === 'munch' ? 7 * Math.max(0, Math.sin((TAU * m.actT) / 0.32)) : 0;

    // legs: stepping when she walks, kicking a little when carried
    let stepping = [m.gait, m.gaitKind.sweep * m.stride, m.gaitKind.lift * m.stride, bob];
    if (act === 'held') {
      m.kick = (m.kick + (TAU * dt) / 0.55) % TAU;
      const kick = 0.6 + 0.4 * Math.sin(1.7 * m.t);
      stepping = [m.kick, 10 * kick, 14 * kick, 0];
    }

    // her shadow: gone while she is carried, smaller the higher she hops
    m.shadow += ((now.held ? 0 : 1) - m.shadow) * (1 - Math.exp(-dt * 10));

    // on screen to as drawn, big swings eased off
    const shown = (v, max, flip = 1) => max * Math.tanh((v * flip) / max);
    const mirror = now.mirrored ? -1 : 1;
    m.pose = {
      mirror: now.mirrored,
      breath: breathing[1] * Math.sin(m.breath),
      hair: [shown(m.hair.x[0], HAIR.max, mirror), shown(m.hair.x[1], HAIR.max)],
      skirt: [shown(m.skirt.x[0], SKIRT.max, mirror), shown(m.skirt.x[1], SKIRT.max)],
      ahoge: shown(m.ahoge.a, AHOGE.max, mirror),
      head: m.head[0] + headSway,
      bend: m.bend[0] + bendSway,
      tail: m.wag * Math.sin(m.tail),
      step: stepping,
      wave,
      bite,
      blink,
    };
    m.shadowScale = 1 - 0.4 * Math.min(1, ty / (30 * k));
  }

  // Whether nothing much is moving: she can be drawn less often.
  function calm(m) {
    const still = (p) => Math.hypot(...p.v) < 4 && Math.hypot(...p.x) < 12;
    return !m.act && m.stride < 0.005 && still(m.hair) && still(m.skirt) && Math.abs(m.ahoge.v) < 0.05
      && Math.hypot(...m.atV) < 1 && m.turnT > 0.3 && m.spriteT > 1 && m.blinkT > 0.2;
  }

  return { create, step, calm };
})();
