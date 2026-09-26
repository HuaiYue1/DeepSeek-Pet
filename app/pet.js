// DeepSeek-Pet's behaviour: which sprite to show, what she says and how she reacts.
'use strict';

const $ = (id) => document.getElementById(id);
const petEl = $('pet');
const swingEl = $('swing');
const squashEl = $('squash');
const sprite = $('sprite');
const bubble = $('bubble');
const textEl = $('text');
const badge = $('badge');
const badgeText = badge.querySelector('span');

const NAP_AFTER = 120000; // ms without attention before she naps
const NAP_AFTER_OFF_PEAK = 45000; // sooner during DeepSeek's 00:30–08:30 off-peak discount
const POKE_WINDOW = 2500; // clicks this close together count as poking her
const SIDEEYE_CLICKS = 3; // poked this many times she gives you a look
const BUSY_CLICKS = 5; // ...and this many times she is "server busy"

let states = {};
let moreLines = {};
let sprites = {};
const hitMaps = {};
let current = 'idle';
let interactive = false;
let pressed = false;
let dragging = false;
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
const lines = (key) => [states[key].line, ...(moreLines[key] || [])];

// Beijing time 00:30–08:30, when DeepSeek's API is half price.
function offPeak() {
  const hour = (Date.now() / 3600000 + 8) % 24;
  return hour >= 0.5 && hour < 8.5;
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
function show(key, { line, ms = 3600, then = 'idle', typing = false, quiet = false } = {}) {
  if (!sprites[key]) return;
  stop('back', 'think');
  current = key;
  sprite.src = sprites[key];
  petEl.dataset.state = '';
  void petEl.offsetWidth; // restart the CSS animation
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
      later('back', 1600, () => show('aha', { ms: 3000 }));
    }
  }, 250);
}

function nap() {
  show('sleep', { ms: 0, line: offPeak() ? states.sleep.line : random(moreLines.sleep || [states.sleep.line]) });
  later('bubble', 4000, hideBubble);
}

function wake() {
  show('aha', { line: '诶？！我没睡！', ms: 2400 });
}

// Something to do now and then when nobody is playing with her.
function ambient() {
  later('ambient', 25000 + Math.random() * 20000, ambient);
  if (current !== 'idle' || pressed) return;
  const roll = Math.random();
  if (roll < 0.4) deepThink();
  else if (roll < 0.6) show('hello');
  else if (roll < 0.75) show('eat');
  else if (roll < 0.83) show('busy', { ms: 3200 });
  else if (roll < 0.9) show('sideeye', { ms: 3200 });
  else show('idle', { ms: 3600 });
}

function attention() {
  lastAttention = Date.now();
}

setInterval(() => {
  const limit = offPeak() ? NAP_AFTER_OFF_PEAK : NAP_AFTER;
  if (current === 'idle' && !pressed && Date.now() - lastAttention > limit) nap();
}, 5000);

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
    if (current === 'sleep') wake();
  }
});

document.addEventListener('mouseleave', () => {
  if (!pressed) setInteractive(false);
});

// ---------------------------------------------------------------- picked up

// swing.js works out how she hangs, swings and lands; this draws it. The
// pose runs on animation frames while the mouse is down or she is still
// settling, and while the mouse is down each frame also has the main process
// move the window after the mouse, so window and pose move in step.
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
  Swing.step(swing, dt, windowAt);
  drawPose();
  if (pressed || !Swing.resting(swing)) requestAnimationFrame(frame);
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
  const box = petEl.getBoundingClientRect();
  const map = hitMaps[current];
  const com = map ? [(map.com[0] * box.width) / map.w, (map.com[1] * box.height) / map.h] : [box.width / 2, box.height / 2];
  const spread = map ? (map.spread * box.height) / map.h : box.height / 4;
  Swing.grab(swing, { pivot: grabbedAt, com, spread, size: [box.width, box.height], at: windowAt || [window.screenX, window.screenY] });
  petEl.style.setProperty('--pivot-x', `${grabbedAt[0]}px`);
  petEl.style.setProperty('--pivot-y', `${grabbedAt[1]}px`);
  petEl.classList.add('held');
  animate();
  show('aha', { line: random(['诶诶？要带我去哪儿？', '哇，飞起来了！', '放、放我下来！']), ms: 0 });
}

function setDown() {
  dragging = false;
  petEl.classList.remove('held');
  Swing.release(swing);
  animate();
  show('idle', { line: random(['新位置不错～', '到啦！', '稳稳落地～']), ms: 2600 });
}

// ---------------------------------------------------------------- mouse

petEl.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || !overPet(e.clientX, e.clientY)) return;
  pressed = true;
  attention();
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
  } else if (clicks.length >= SIDEEYE_CLICKS) {
    if (current !== 'sideeye') show('sideeye', { ms: 3200 });
  } else if (current !== 'busy') {
    show('happy', { ms: 3200 });
  }
}

petEl.addEventListener('dblclick', () => show('eat', { ms: 3600 }));

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
    if (cmd.key === 'think') deepThink();
    else if (cmd.key === 'sleep') nap();
    else show(cmd.key, { ms: cmd.key === 'idle' ? 3600 : 4200 });
  } else if (cmd.type === 'say') {
    show(current === 'sleep' ? 'aha' : 'hello');
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
  applyGeometry(init.geometry);
  await Promise.all(Object.entries(sprites).map(([key, url]) => buildHitMap(key, url)));
  show('hello', { line: states.hello.line, ms: 4200 });
  later('ambient', 20000, ambient);
}

start();
