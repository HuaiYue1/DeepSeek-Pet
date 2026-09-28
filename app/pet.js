// DeepSeek-Pet's behaviour: which sprite to show, what she says, what she
// gets up to on her own and how she reacts.
'use strict';

const $ = (id) => document.getElementById(id);
const petEl = $('pet');
const swingEl = $('swing');
const squashEl = $('squash');
const sprite = $('sprite');
const fxEl = $('fx');
const bubble = $('bubble');
const textEl = $('text');
const badge = $('badge');
const badgeText = badge.querySelector('span');

const NAP_AFTER = 120000; // ms without attention before she naps
const NAP_AFTER_OFF_PEAK = 45000; // sooner during DeepSeek's 00:30–08:30 off-peak discount
const POKE_WINDOW = 2500; // clicks this close together count as poking her
const SIDEEYE_CLICKS = 3; // poked this many times she gives you a look
const BUSY_CLICKS = 5; // ...and this many times she is "server busy"
const WALK_SPEED = 0.22; // pet heights per second

let states = {};
let moreLines = {};
let eventLines = {};
let sprites = {};
const hitMaps = {};
let current = 'idle';
let interactive = false;
let pressed = false;
let dragging = false;
let roam = true; // walks about on her own
let walking = null;
let facing = -1; // -1 facing left, as drawn; 1 facing right
let lastTurn = 0;
let lastAttention = Date.now();
let clicks = [];
const timers = {};

function later(name, ms, fn) {
  clearTimeout(timers[name]);
  timers[name] = setTimeout(fn, ms);
}

function stop(...names) {
  for (const name of names) {
    clearTimeout(timers[name]);
    clearInterval(timers[name]);
  }
}

const random = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const lines = (key) => [states[key].line, ...(moreLines[key] || [])];
const eventLine = (kind) => random(eventLines[kind] || ['……']);

// Beijing time 00:30–08:30, when DeepSeek's API is half price.
function offPeak() {
  const hour = (Date.now() / 3600000 + 8) % 24;
  return hour >= 0.5 && hour < 8.5;
}

// Idle chatter, now and then about the time of day (yours, not Beijing's).
function chatLine() {
  const hour = new Date().getHours();
  if ((hour >= 23 || hour < 5) && Math.random() < 0.5) return eventLine('lateNight');
  if (hour >= 6 && hour < 10 && Math.random() < 0.3) return eventLine('morning');
  return random(lines('idle'));
}

// ---------------------------------------------------------------- bubble

function say(text, { ms = 3600, typing = false } = {}) {
  stop('type', 'bubble');
  bubble.classList.add('show');
  if (!typing) {
    textEl.textContent = text;
  } else {
    const chars = Array.from(text);
    let n = 0;
    textEl.innerHTML = '<span class="caret"></span>';
    timers.type = setInterval(() => {
      n += 1;
      textEl.textContent = chars.slice(0, n).join('');
      if (n < chars.length) textEl.insertAdjacentHTML('beforeend', '<span class="caret"></span>');
      else clearInterval(timers.type);
    }, 110);
  }
  if (ms) later('bubble', ms, hideBubble);
}

function hideBubble() {
  stop('type', 'bubble');
  bubble.classList.remove('show');
  badge.classList.remove('show', 'done');
}

// ---------------------------------------------------------------- states

// Show a state's sprite; say something; go back to idle after `ms` (0 = stay).
// Whatever she was doing (walking, dancing...) stops.
function show(key, { line, ms = 3600, then = 'idle', typing = false, quiet = false } = {}) {
  if (!sprites[key]) return;
  stop('back', 'think', 'act');
  stopWalking();
  petEl.dataset.act = '';
  current = key;
  sprite.src = sprites[key];
  // a new sprite comes in already facing the right way, without turning round
  petEl.classList.add('snap');
  petEl.classList.toggle('mirrored', mirrored());
  petEl.dataset.state = '';
  void petEl.offsetWidth; // restart the CSS animation
  petEl.classList.remove('snap');
  petEl.dataset.state = ['happy', 'busy', 'sleep'].includes(key) ? key : 'pop';
  badge.classList.remove('show', 'done');
  if (!quiet) say(line ?? random(lines(key)), { ms: ms || 0, typing });
  if (ms && key !== then) later('back', ms, () => show(then, { quiet: true }));
}

// R1-style deep think: the thought types out while the timer runs, then the aha.
function deepThink() {
  const seconds = 3 + Math.floor(Math.random() * 6);
  show('think', { ms: 0, typing: true, line: random(lines('think')) });
  const started = Date.now();
  badge.classList.add('show');
  badge.classList.remove('done');
  badgeText.textContent = '思考中…';
  timers.think = setInterval(() => {
    const s = Math.round((Date.now() - started) / 1000);
    badgeText.textContent = `思考中… ${s} 秒`;
    if (s >= seconds) {
      clearInterval(timers.think);
      badge.classList.add('done');
      badgeText.textContent = `已深度思考（用时 ${s} 秒）`;
      later('back', 1600, () => {
        show('aha', { ms: 3000 });
        fx('spark', 5, 70);
      });
    }
  }, 250);
}

function nap() {
  stopWalking();
  show('sleep', { ms: 0, line: offPeak() ? states.sleep.line : random(moreLines.sleep || [states.sleep.line]) });
  later('bubble', 4000, hideBubble);
  stop('zz');
  timers.zz = setInterval(() => (current === 'sleep' ? fx('z') : stop('zz')), 1500);
}

function wake() {
  show('aha', { line: eventLine('wake'), ms: 2400 });
  fx('spark', 4, 70);
}

function attention() {
  lastAttention = Date.now();
}

setInterval(() => {
  const limit = offPeak() ? NAP_AFTER_OFF_PEAK : NAP_AFTER;
  if (current === 'idle' && !pressed && !walking && Date.now() - lastAttention > limit) nap();
}, 5000);

// ---------------------------------------------------------------- facing

// She is drawn facing a little to the left; facing right she is mirrored,
// except in the sprites with writing on them.
const mirrored = () => facing > 0 && states[current]?.mirror !== false;

function turn(dir) {
  if (!dir || dir === facing) return;
  facing = dir;
  lastTurn = Date.now();
  petEl.classList.toggle('mirrored', mirrored());
}

// When the pointer comes near (but not onto her) she turns towards it.
function notice(x) {
  if (walking || dragging || Date.now() - lastTurn < 1500) return;
  const box = petEl.getBoundingClientRect();
  const dx = x - (box.left + box.width / 2);
  if (Math.abs(dx) > box.width * 0.45) turn(Math.sign(dx));
}

// ---------------------------------------------------------------- effects

// Little things floating up around her head. x and y are where they start,
// as fractions of her box; dx, dy and size are in px at the 中 size.
const EFFECTS = {
  z: { text: ['Z', 'z'], x: [0.6, 0.7], y: [0.06, 0.12], dx: [8, 24], dy: [-45, -70], size: [13, 20], color: ['#8C9BE6'], ms: 2200 },
  note: { text: ['♪', '♫'], x: [0.28, 0.74], y: [0.04, 0.16], dx: [-18, 18], dy: [-40, -65], size: [15, 21], color: ['#FF7EB6', '#4D6BFE'], ms: 1600 },
  heart: { text: ['♥'], x: [0.34, 0.7], y: [0.06, 0.16], dx: [-14, 14], dy: [-35, -55], size: [13, 18], color: ['#FF6FA5'], ms: 1500 },
  question: { text: ['?'], x: [0.66, 0.7], y: [0.02, 0.05], dx: [2, 8], dy: [-18, -26], size: [20, 24], color: ['#4D6BFE'], ms: 1400 },
  spark: { text: ['✦'], x: [0.24, 0.8], y: [0.02, 0.2], dx: [-10, 10], dy: [-12, -26], size: [12, 18], color: ['#F2C230', '#8FB1FF'], ms: 900 },
  sweat: { x: [0.3, 0.72], y: [0.08, 0.16], dx: [-6, 6], dy: [18, 30], size: [9, 12], ms: 1100 },
  coin: { text: ['T'], x: [0.52, 0.52], y: [0.22, 0.24], dx: [-70, 70], dy: [0, 0], size: [15, 18], ms: 900 },
};

function fx(kind, count = 1, every = 250) {
  for (let i = 0; i < count; i++) setTimeout(() => spawn(kind), i * every);
}

function spawn(kind) {
  const e = EFFECTS[kind];
  const k = petEl.offsetHeight / 300;
  const el = document.createElement('span');
  el.className = `fx fx-${kind}`;
  if (e.text) el.textContent = random(e.text);
  const set = (name, value) => el.style.setProperty(name, value);
  set('--x', `${rand(...e.x) * 100}%`);
  set('--y', `${rand(...e.y) * 100}%`);
  set('--dx', `${rand(...e.dx) * k}px`);
  set('--dy', `${rand(...e.dy) * k}px`);
  set('--size', `${rand(...e.size) * k}px`);
  if (e.color) set('--color', random(e.color));
  set('--ms', `${e.ms}ms`);
  el.addEventListener('animationend', () => el.remove());
  fxEl.append(el);
}

// ---------------------------------------------------------------- on her own

// Walk a little way along the screen, waddling, and turn round at its edges.
// The main process moves the window; this asks for a step every frame.
function walk() {
  const h = petEl.offsetHeight;
  const dir = Math.random() < 0.5 ? -1 : 1;
  show('idle', { quiet: true, ms: 0 });
  turn(dir);
  walking = { dir, speed: WALK_SPEED * h, left: h * rand(0.6, 1.8), acc: 0, pending: false, pause: 0, stuck: 0 };
  petEl.dataset.act = 'walk';
  if (Math.random() < 0.5) say(eventLine('walk'), { ms: 2600 });
  animate();
}

function stopWalking() {
  if (!walking) return;
  walking = null;
  if (petEl.dataset.act === 'walk') petEl.dataset.act = '';
}

function stepWalk(dt) {
  const w = walking;
  if (w.pause > 0) {
    w.pause -= dt;
    return;
  }
  w.acc += w.dir * w.speed * dt;
  const dx = Math.trunc(w.acc);
  if (w.pending || !dx) return;
  w.acc -= dx;
  w.pending = true;
  window.pet.walk(dx).then(({ moved }) => {
    w.pending = false;
    if (walking !== w) return;
    w.left -= Math.abs(moved);
    if (moved) {
      w.stuck = 0;
    } else if (++w.stuck > 2) {
      stopWalking(); // no room either way
      return;
    } else {
      // at the edge of the screen: turn round
      w.dir = -w.dir;
      w.acc = 0;
      w.pause = 0.5;
      turn(w.dir);
      if (Math.random() < 0.6) say(eventLine('turn'), { ms: 2200 });
    }
    if (w.left <= 0) stopWalking();
  }, stopWalking);
}

// An activity's animation for `ms` (see data-act in style.css).
function playAct(name, ms) {
  petEl.dataset.act = name;
  later('act', ms, () => {
    if (petEl.dataset.act === name) petEl.dataset.act = '';
  });
}

function dance() {
  show('happy', { line: eventLine('dance'), ms: 4400 });
  playAct('dance', 4000);
  fx('note', 7, 550);
}

function stretch() {
  show('idle', { line: eventLine('stretch'), ms: 3200 });
  playAct('stretch', 1800);
}

function lookAround() {
  show('idle', { line: eventLine('look'), ms: 2800 });
  fx('question');
  const was = facing;
  later('look', 600, () => {
    turn(-was);
    later('look', 900, () => turn(was));
  });
}

function munch() {
  show('eat', { ms: 3600 });
  playAct('munch', 2600);
  fx('coin', 4, 500);
}

function wave() {
  show('hello', { ms: 3600 });
  playAct('wave', 2800);
}

function sweat() {
  show('busy', { ms: 3600 });
  fx('sweat', 5, 450);
}

function chat() {
  show('idle', { line: chatLine(), ms: 4200 });
}

// What she does every so often when nobody is playing with her, and how
// likely each is.
const ACTIVITIES = [
  { weight: 30, run: walk, when: () => roam },
  { weight: 14, run: deepThink },
  { weight: 9, run: dance },
  { weight: 8, run: stretch },
  { weight: 8, run: lookAround },
  { weight: 8, run: munch },
  { weight: 7, run: wave },
  { weight: 6, run: chat },
  { weight: 5, run: sweat },
  { weight: 5, run: () => show('sideeye', { ms: 3200 }) },
];

function ambient() {
  later('ambient', rand(7000, 15000), ambient);
  if (current !== 'idle' || pressed || dragging || walking) return;
  const options = ACTIVITIES.filter((a) => !a.when || a.when());
  let roll = Math.random() * options.reduce((sum, a) => sum + a.weight, 0);
  for (const a of options) {
    roll -= a.weight;
    if (roll < 0) {
      a.run();
      return;
    }
  }
}

// ---------------------------------------------------------------- hit testing

// Only her own pixels (and the bubble) catch the mouse; everything else
// clicks through to the desktop.
function buildHitMap(key, url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const alpha = new Uint8Array(canvas.width * canvas.height);
      let sx = 0, sy = 0, ss = 0, n = 0;
      for (let i = 0; i < alpha.length; i++) {
        alpha[i] = data[i * 4 + 3];
        if (alpha[i] > 40) {
          const x = i % canvas.width;
          const y = Math.floor(i / canvas.width);
          sx += x;
          sy += y;
          ss += x * x + y * y;
          n += 1;
        }
      }
      // her centre of mass and how spread out she is around it (radius of
      // gyration), for how she turns when picked up
      const com = n ? [sx / n, sy / n] : [canvas.width / 2, canvas.height / 2];
      const spread = n ? Math.sqrt(Math.max(0, ss / n - com[0] ** 2 - com[1] ** 2)) : canvas.height / 4;
      hitMaps[key] = { w: canvas.width, h: canvas.height, alpha, com, spread };
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

function overPet(x, y) {
  // standing, the sprite's own box (it bobs and hops); tilted, undo the tilt
  let u, v;
  if (Swing.resting(swing)) {
    const r = sprite.getBoundingClientRect();
    [u, v] = [(x - r.left) / r.width, (y - r.top) / r.height];
  } else {
    const box = petEl.getBoundingClientRect();
    const [bx, by] = boxPoint(x, y);
    [u, v] = [bx / box.width, by / box.height];
  }
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
  if (petEl.classList.contains('mirrored')) u = 1 - u;
  const map = hitMaps[current];
  if (!map) return true;
  const px = Math.floor(u * map.w);
  const py = Math.floor(v * map.h);
  // look a few pixels around so thin hair strands are easy to grab
  for (let dy = -4; dy <= 4; dy += 4) {
    for (let dx = -4; dx <= 4; dx += 4) {
      const qx = px + dx, qy = py + dy;
      if (qx >= 0 && qy >= 0 && qx < map.w && qy < map.h && map.alpha[qy * map.w + qx] > 40) return true;
    }
  }
  return false;
}

function overBubble(x, y) {
  if (!bubble.classList.contains('show')) return false;
  const r = bubble.getBoundingClientRect();
  return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}

function setInteractive(on) {
  if (on === interactive) return;
  interactive = on;
  window.pet.setIgnoreMouse(!on);
}

document.addEventListener('mousemove', (e) => {
  if (pressed) return;
  const onPet = overPet(e.clientX, e.clientY);
  setInteractive(onPet || overBubble(e.clientX, e.clientY));
  if (onPet) {
    attention();
    stopWalking(); // she stops to see what you want
    if (current === 'sleep') wake();
  } else {
    notice(e.clientX);
  }
});

document.addEventListener('mouseleave', () => {
  if (!pressed) setInteractive(false);
});

// ---------------------------------------------------------------- picked up

// swing.js works out how she hangs, swings and lands; this draws it. The
// pose runs on animation frames while the mouse is down, she is walking or
// she is still settling, and while the mouse is down each frame also has
// the main process move the window after the mouse, so window and pose move
// in step.
const swing = Swing.create();
let framing = false;
let lastFrame = 0;
let windowAt = null; // where the main process last put the window
let grabbedAt = [0, 0]; // where the mouse went down, in her box

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function drawPose() {
  const p = Swing.pose(swing);
  swingEl.style.transform = p.angle ? `rotate(${p.angle}rad)` : '';
  squashEl.style.transform = p.sx !== 1 || p.tx || p.ty ? `translate(${p.tx}px, ${p.ty}px) scale(${p.sx}, ${p.sy})` : '';
}

function frame(now) {
  const dt = clamp((now - lastFrame) / 1000, 0.001, 0.05);
  lastFrame = now;
  if (pressed) window.pet.dragTick().then((at) => { if (at) windowAt = at; });
  if (walking) stepWalk(dt);
  Swing.step(swing, dt, windowAt);
  drawPose();
  if (pressed || walking || !Swing.resting(swing)) requestAnimationFrame(frame);
  else framing = false;
}

function animate() {
  if (framing) return;
  framing = true;
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

// A point in the window as a point in her own box, undoing her tilt and squash.
function boxPoint(clientX, clientY) {
  const box = petEl.getBoundingClientRect();
  let x = clientX - box.left;
  let y = clientY - box.top;
  const p = Swing.pose(swing);
  if (p.angle) {
    const [ox, oy] = swing.pivot;
    const c = Math.cos(p.angle);
    const s = Math.sin(p.angle);
    [x, y] = [ox + (x - ox) * c + (y - oy) * s, oy - (x - ox) * s + (y - oy) * c];
  }
  const [fx, fy] = [box.width / 2, box.height];
  return [fx + (x - p.tx - fx) / p.sx, fy + (y - p.ty - fy) / p.sy];
}

function pickUp() {
  dragging = true;
  // she is carried as the surprised sprite, so her balance is that sprite's
  show('aha', { line: eventLine('pickUp'), ms: 0 });
  const box = petEl.getBoundingClientRect();
  const map = hitMaps[current];
  const com = map ? [(map.com[0] * box.width) / map.w, (map.com[1] * box.height) / map.h] : [box.width / 2, box.height / 2];
  if (petEl.classList.contains('mirrored')) com[0] = box.width - com[0];
  const spread = map ? (map.spread * box.height) / map.h : box.height / 4;
  Swing.grab(swing, { pivot: grabbedAt, com, spread, size: [box.width, box.height], at: windowAt || [window.screenX, window.screenY] });
  petEl.style.setProperty('--pivot-x', `${grabbedAt[0]}px`);
  petEl.style.setProperty('--pivot-y', `${grabbedAt[1]}px`);
  petEl.classList.add('held');
  animate();
}

function setDown() {
  dragging = false;
  petEl.classList.remove('held');
  Swing.release(swing);
  animate();
  show('idle', { line: eventLine('setDown'), ms: 2600 });
}

// ---------------------------------------------------------------- mouse

petEl.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || !overPet(e.clientX, e.clientY)) return;
  pressed = true;
  attention();
  stopWalking();
  grabbedAt = boxPoint(e.clientX, e.clientY);
  windowAt = null;
  window.pet.dragStart();
  animate();
});

window.addEventListener('mouseup', async (e) => {
  if (e.button !== 0 || !pressed) return;
  pressed = false;
  const { moved } = await window.pet.dragEnd();
  if (dragging) setDown();
  else if (!moved) click();
});

function click() {
  const now = Date.now();
  clicks = clicks.filter((t) => now - t < POKE_WINDOW);
  clicks.push(now);
  if (clicks.length >= BUSY_CLICKS) {
    clicks = [];
    show('busy', { line: states.busy.line, ms: 4200 });
    fx('sweat', 4, 300);
  } else if (clicks.length >= SIDEEYE_CLICKS) {
    if (current !== 'sideeye') show('sideeye', { ms: 3200 });
  } else if (current !== 'busy') {
    show('happy', { ms: 3200 });
    fx('heart', 3, 150);
  }
}

petEl.addEventListener('dblclick', () => {
  show('eat', { ms: 3600 });
  playAct('munch', 1800);
  fx('coin', 3, 250);
});

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  attention();
  window.pet.showMenu();
});

// ---------------------------------------------------------------- main process

function applyGeometry(g) {
  document.documentElement.style.setProperty('--pet-w', `${g.petW}px`);
  document.documentElement.style.setProperty('--pet-h', `${g.petH}px`);
  document.documentElement.style.setProperty('--floor', `${g.floor}px`);
}

window.pet.onCommand((cmd) => {
  attention();
  if (cmd.type === 'state') {
    stopWalking();
    if (cmd.key === 'think') deepThink();
    else if (cmd.key === 'sleep') nap();
    else show(cmd.key, { ms: cmd.key === 'idle' ? 3600 : 4200 });
  } else if (cmd.type === 'say') {
    stopWalking();
    if (current === 'sleep') wake();
    else show('hello', { line: random([...lines('hello'), chatLine()]) });
  } else if (cmd.type === 'update') {
    if (dragging) return;
    stopWalking();
    const line = (kind) => eventLine(kind).replace('{version}', cmd.version);
    if (cmd.failed) show('busy', { line: line('updateFailed'), ms: 4200 });
    else if (cmd.upToDate) show('happy', { line: line('upToDate'), ms: 3600 });
    else {
      show('aha', { line: line('update'), ms: 6000 });
      fx('spark', 5, 70);
    }
  } else if (cmd.type === 'roam') {
    roam = cmd.on;
    if (!roam) stopWalking();
  } else if (cmd.type === 'geometry') {
    applyGeometry(cmd.geometry);
  } else if (cmd.type === 'drag-begin') {
    pickUp();
  } else if (cmd.type === 'drag-end') {
    // the main process stopped following the mouse (she lost focus)
    pressed = false;
    if (dragging) setDown();
  }
});

async function start() {
  const init = await window.pet.init();
  ({ states, moreLines, sprites } = init);
  eventLines = init.eventLines || {};
  roam = init.roam !== false;
  applyGeometry(init.geometry);
  await Promise.all(Object.entries(sprites).map(([key, url]) => buildHitMap(key, url)));
  show('hello', { line: states.hello.line, ms: 4200 });
  later('ambient', 9000, ambient);
}

start();
