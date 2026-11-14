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
  // Speed is in pet heights/s. Both gaits use the same drawn stride.
  // One cycle moves 96 pixels on the skirt-walk drawing's 500 px canvas.
  const GAIT = {
    walk: { speed: 0.15, swing: 0.43, lift: 47, bob: 12, lean: -0.045 },
    run: { speed: 0.25, swing: 0.54, lift: 69, bob: 20, lean: -0.095 },
  };
  const STRIDE = 96 / 500;
  const GATHERED = [[0.25, 0.32], [0.75, 0.82]]; // feet pass underneath the hips
  const JUMP_TIME = 1.10;
  const HOP_TIME = 0.45;
  const CROUCH = [[0, 0], [0.16, 1], [0.28, 0], [0.77, 0], [0.89, 0.84], [1, 0]];
  const STRETCH = [[0, 0], [0.18, 0.2], [0.42, 1], [0.59, 1], [0.83, -0.18], [1, 0]];
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
      shows: null,
      spriteT: 0, // how long this sprite has been showing
      act: '',
      actT: 0, // how long she has been doing this
      mirrored: false, // requested direction
      facing: false, // direction currently drawn
      turnT: Infinity, // since she last turned round
      lastX: null, // last window position used to advance the gait
      at: null, // her window, smoothed (screen px)...
      atV: [0, 0], // ...how fast it moves
      atA: [0, 0], // ...and how fast that changes
      hair: { x: [0, 0], v: [0, 0] }, // as seen on screen, not as drawn
      skirt: { x: [0, 0], v: [0, 0] },
      ahoge: { a: 0, v: 0 },
      lift: [0, 0, 0], // her body's height above the floor (px) over the last frames
      breath: 0, // phase
      gait: GATHERED[0][0], // fraction of a stride, starting with the feet passing
      settleFrom: 0,
      settleTo: 0,
      settleTime: 0,
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
      kickWeight: 0,
      wasHeld: false,
      dropT: Infinity,
      jumpPhase: null,
      jumpKind: null,
      wave: [0, 0],
      wrist: [0, 0],
      bite: [0, 0],
      shadow: 1,
      pose: null,
      body: { ty: 0 },
    };
  }

  // A critically damped spring towards `target` at `rate` (1/s).
  function follow(s, target, rate, dt) {
    s[1] += (rate * rate * (target - s[0]) - 2 * rate * s[1]) * dt;
    s[0] += s[1] * dt;
  }

  function hop(t, time, height) {
    const air = clamp((t / time - 0.20) / 0.62, 0, 1);
    return height * 4 * air * (1 - air);
  }

  // Approach the target over a few tenths of a second and brake as soon as
  // the distance left calls for it. Dimensions are screen px and seconds.
  function walkSpeed(act, speed, remaining, height, dt) {
    const top = GAIT[act].speed * height;
    const accel = top / 0.32;
    const brake = top / 0.27;
    const target = Math.min(top, Math.sqrt(2 * brake * remaining));
    return speed + clamp(target - speed, -brake * dt, accel * dt);
  }

  // Horizontal travel during stance cancels the window's movement. The
  // swing curve brings the foot forward, with the same speed at contact.
  function foot(phase, gait, distance, weight) {
    const sweep = distance * (1 - gait.swing) / 2;
    if (phase >= gait.swing) return [weight * (distance * (phase - gait.swing) - sweep), 0, 0];
    const u = phase / gait.swing;
    const up = Math.sin(Math.PI * u);
    const x = sweep * (1 - 2 * ease(u)) + distance * gait.swing * u * (1 - u) * (1 - 2 * u);
    return [weight * x, weight * gait.lift * up ** 2, weight * 0.19 * Math.sin(TAU * u) * up];
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
  //   walkTravel  confirmed horizontal distance moved since the last frame (screen px)
  //   height    how tall she is on screen (screen px)
  //   sprite    the sprite showing, and `shows` counting the times one was
  //             shown, so showing the same one again starts it over
  //   act       what she is doing: walk, run, walk-stop, jump, hop, tap,
  //             dance, stretch, munch, wave or ''
  //   plantedTurn  keep her feet down while changing direction on a walk
  //   held      being carried, `tilt` tilted by this much (swing.js)
  //   mirrored  facing right
  //   look      a head tilt she wants, or 0
  function step(m, dt, now) {
    const r = m.random;
    m.t += dt;
    const fresh = now.sprite !== m.sprite || now.shows !== m.shows; // a sprite was shown
    const turned = now.mirrored !== m.mirrored && !fresh && !now.held;
    m.mirrored = now.mirrored;
    m.turnT = turned ? 0 : m.turnT + dt;
    const previousFacing = m.facing;
    if (fresh || now.held || m.turnT >= 0.12) m.facing = now.mirrored;
    const flipped = previousFacing !== m.facing && !fresh && !now.held;
    m.dropT = m.wasHeld && !now.held ? 0 : m.dropT + dt;
    m.wasHeld = now.held;
    if (fresh) {
      [m.sprite, m.shows] = [now.sprite, now.shows];
      m.spriteT = 0;
      if (now.sprite === 'aha') m.blinkIn = 0.45; // a surprised blink
    } else {
      m.spriteT += dt;
    }
    if (now.act !== m.act) {
      if (GAIT[now.act] && !GAIT[m.act]) m.gait = GATHERED[0][0];
      if (now.act === 'walk-stop') {
        m.settleFrom = m.gait;
        // Finish the step in flight, then stand with both feet close.
        const span = GATHERED.find(([, end]) => end > m.gait);
        const gathered = span ? Math.max(m.gait, span[0]) : 1 + GATHERED[0][0];
        m.settleTo = gathered;
        m.settleTime = Math.min(0.15, (gathered - m.gait) * 0.75);
      }
      [m.act, m.actT] = [now.act, 0];
    } else {
      m.actT += dt;
    }
    const scale = SPRITE_HEIGHT / now.height; // sprite px per screen px
    const k = now.height / 300; // her size: 1 is 中
    const act = now.held ? 'held' : now.act;
    const back = m.facing ? -1 : 1; // behind her, on screen

    // her window's movement, smoothed: it moves in whole pixels
    if (!m.at || Math.hypot(now.at[0] - m.at[0], now.at[1] - m.at[1]) > 400) {
      m.at = [...now.at];
      m.atV = [0, 0];
    }

    const dx = now.walkTravel ?? (m.lastX == null ? 0 : Math.abs(now.at[0] - m.lastX));
    m.lastX = now.at[0];
    const gait = GAIT[act];
    if (gait) m.gaitKind = gait;
    const walking = !!gait;
    const strideDistance = STRIDE * SPRITE_HEIGHT;
    const travel = walking && dx * scale <= strideDistance / 2 ? dx * scale : 0;
    m.stride += ((walking ? 1 : 0) - m.stride) * (1 - Math.exp(-dt * (walking ? 13 : 10)));
    if (!walking && m.stride < 0.005) m.stride = 0;
    if (act === 'walk-stop') {
      const u = m.settleTime ? ease(clamp(m.actT / m.settleTime, 0, 1)) : 1;
      m.gait = (m.settleFrom + (m.settleTo - m.settleFrom) * u) % 1;
    } else {
      m.gait = (m.gait + travel / strideDistance) % 1;
    }
    const phase = TAU * m.gait;
    const bob = m.gaitKind.bob * m.stride * (0.5 - 0.5 * Math.cos(2 * phase));

    // Translation comes from being airborne. The mesh bends the knees to
    // take the weight before takeoff and after contact.
    let ty = 0;
    let crouch = 0;
    let tuck = 0;
    m.jumpPhase = null;
    m.jumpKind = null;
    const stretching = act === 'stretch' ? keys(STRETCH, m.actT / 1.8) : 0;
    if (!now.held) {
      const crossing = act === 'hop';
      const time = crossing ? HOP_TIME : JUMP_TIME;
      const explicit = crossing || act === 'jump';
      const t = explicit ? m.actT : m.spriteT;
      const jumping = (explicit || (m.sprite === 'happy' && !act)) && t < time;
      if (jumping) {
        const height = crossing ? 26 * k : 0.11 * now.height;
        m.jumpKind = crossing ? 'hop' : 'jump';
        m.jumpPhase = t / time;
        const air = clamp((t - 0.29) / 0.35, 0, 1);
        ty = crossing ? hop(t, time, height) : height * 4 * air * (1 - air);
        crouch = 56 * keys(CROUCH, m.jumpPhase);
        tuck = ty / height;
      }
      if (m.turnT < 0.26) {
        if (!now.plantedTurn) ty += hop(m.turnT, 0.26, 5 * k);
        crouch += 18 * keys(CROUCH, m.turnT / 0.26);
      }
      if (m.dropT < 0.32) crouch += 64 * keys([[0, 0], [0.20, 1], [0.58, -0.13], [1, 0]], m.dropT / 0.32);
      if (act === 'dance') {
        const beat = Math.sin((TAU * m.actT) / 0.9) ** 2;
        ty += 5 * k * beat;
        crouch += 22 * (1 - beat) * Math.min(1, m.actT / 0.18);
      }
      if (act === 'tap' && m.actT < 1.5) crouch += 17 * Math.sin((Math.PI * m.actT) / 0.5) ** 2;
    }
    m.body = { ty: -ty };
    m.lift = [m.lift[1], m.lift[2], ty * scale + bob - crouch];

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
      skirt[0] += SKIRT.k * 3 * m.stride * Math.sin(phase - 0.6) * back; // swishing with her steps
      swingPart(m.skirt, SKIRT, skirt, h);
      // the strand on her head: a little pendulum from its root
      const arm = [AHOGE_ARM[0] * back, AHOGE_ARM[1]];
      const f = [-AHOGE.lag * m.atA[0] * scale, -AHOGE.lag * m.atA[1] * scale + AHOGE.lag * liftA];
      const torque = (arm[0] * f[1] - arm[1] * f[0]) / (arm[0] * arm[0] + arm[1] * arm[1]);
      m.ahoge.v += (torque - AHOGE.k * m.ahoge.a - AHOGE.c * m.ahoge.v) * h;
      m.ahoge.a = clamp(m.ahoge.a + m.ahoge.v * h, -3 * AHOGE.max, 3 * AHOGE.max);
    }
    if (flipped) {
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
    else if (walking) head = 0.01 * Math.sin(2 * phase);
    else if (act === 'tap') head = 0.06;
    else if (m.sprite === 'busy') head = 0.055 * Math.sin(TAU * m.t / 0.42);
    head += 0.0014 * crouch - 0.10 * stretching;
    if (m.turnT < 0.12) head -= 0.12 * Math.sin(Math.PI * m.turnT / 0.12);
    follow(m.head, head, 9, dt);
    let headSway = 0;
    if (act === 'dance') headSway = -0.07 * Math.sin((TAU * m.actT) / 0.9 + 0.5) * Math.min(1, m.actT / 0.3);
    if (act === 'munch') headSway = 0.035 * Math.sin(TAU * m.actT / 0.54) * Math.min(1, m.actT / 0.18);

    // leaning from the hips
    let bend = 0.01 * Math.sin((TAU * m.t) / 6.3) + 0.005 * Math.sin((TAU * m.t) / 3.7); // shifting her weight
    if (walking) bend = gait.lean;
    else if (act === 'held') bend = 0;
    else if (act === 'stretch') bend = 0.10 * stretching;
    else if (m.sprite === 'sleep') bend = 0.02;
    follow(m.bend, bend - 0.0015 * crouch, 11, dt);
    let bendSway = 0.012 * m.stride * Math.sin(phase); // rocking from foot to foot
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

    // The forearm leads the wave. The wrist follows and settles after it.
    const waving = act === 'wave' || (m.sprite === 'hello' && m.spriteT < 2.5);
    const waveT = act === 'wave' ? m.actT : m.spriteT;
    const greeting = waving ? 0.32 * Math.sin(TAU * waveT / 0.68) * Math.min(1, waveT / 0.18) : 0;
    const arm = greeting + (m.sprite === 'happy' ? 0.16 * Math.sin(TAU * m.spriteT / 0.53) : 0);
    follow(m.wave, arm, 21, dt);
    follow(m.wrist, m.wave[0] * 0.85, 15, dt);
    // Lift the coin towards the mouth, pause at the bite, then lower it.
    const bite = act === 'munch' ? 19 * keys([[0, 0], [0.38, 1], [0.53, 0.83], [0.66, 1], [1, 0]], (m.actT / 0.54) % 1) : 0;
    follow(m.bite, bite, 24, dt);

    const feet = [
      foot(m.gait, m.gaitKind, strideDistance, m.stride),
      foot((m.gait + 0.5) % 1, m.gaitKind, strideDistance, m.stride),
    ];
    m.kickWeight += ((now.held ? 1 : 0) - m.kickWeight) * (1 - Math.exp(-dt * 13));
    m.kick = (m.kick + TAU * dt / 0.58) % TAU;
    for (let i = 0; i < feet.length; i++) {
      const kick = Math.sin(m.kick + i * Math.PI);
      feet[i][0] += 22 * m.kickWeight * kick + (i ? 14 : -20) * tuck;
      feet[i][1] += (13 + 12 * kick) * m.kickWeight + (i ? 21 : 35) * tuck;
      feet[i][2] += 0.15 * kick * m.kickWeight + (i ? -0.12 : 0.17) * tuck;
    }

    // her shadow: gone while she is carried, smaller the higher she hops
    m.shadow += ((now.held ? 0 : 1) - m.shadow) * (1 - Math.exp(-dt * 10));

    // on screen to as drawn, big swings eased off
    const shown = (v, max, flip = 1) => max * Math.tanh((v * flip) / max);
    const mirror = m.facing ? -1 : 1;
    m.pose = {
      mirror: m.facing,
      breath: breathing[1] * Math.sin(m.breath),
      hair: [shown(m.hair.x[0], HAIR.max, mirror), shown(m.hair.x[1], HAIR.max)],
      skirt: [shown(m.skirt.x[0], SKIRT.max, mirror), shown(m.skirt.x[1], SKIRT.max)],
      ahoge: shown(m.ahoge.a, AHOGE.max, mirror),
      head: m.head[0] + headSway,
      bend: m.bend[0] + bendSway,
      tail: m.wag * Math.sin(m.tail),
      feet,
      hips: [10 * m.stride * Math.sin(phase), crouch - bob],
      reach: stretching,
      wave: m.wave[0],
      wrist: m.wrist[0],
      bite: m.bite[0],
      blink,
    };
    m.shadowScale = 1 - 0.4 * Math.min(1, ty / (30 * k));
  }

  // Whether nothing much is moving: she can be drawn less often.
  function calm(m) {
    const still = (p) => Math.hypot(...p.v) < 4 && Math.hypot(...p.x) < 12;
    return !m.act && !m.wasHeld && m.dropT > 0.32 && m.kickWeight < 0.005
      && Math.abs(m.wave[0]) + Math.abs(m.wrist[0]) < 0.01 && m.bite[0] < 0.1
      && !['hello', 'busy'].includes(m.sprite) && m.stride === 0 && still(m.hair) && still(m.skirt) && Math.abs(m.ahoge.v) < 0.05
      && Math.hypot(...m.atV) < 1 && m.turnT > 0.3 && m.spriteT > JUMP_TIME && m.blinkT > 0.2;
  }

  return { create, step, calm, walkSpeed };
})();
