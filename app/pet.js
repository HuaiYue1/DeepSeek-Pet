// DeepSeek-Pet's behaviour: which sprite to show, what she says and how she reacts.
'use strict';

const $ = (id) => document.getElementById(id);
const petEl = $('pet');
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
  petEl.className = '';
  void petEl.offsetWidth; // restart the CSS animation
  petEl.className = ['happy', 'busy', 'sleep'].includes(key) ? key : 'pop';
  if (dragging) petEl.classList.add('dragging');
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
      for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
      hitMaps[key] = { w: canvas.width, h: canvas.height, alpha };
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

function overPet(x, y) {
  const r = sprite.getBoundingClientRect();
  if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) return false;
  const map = hitMaps[current];
  if (!map) return true;
  const px = Math.floor(((x - r.left) / r.width) * map.w);
  const py = Math.floor(((y - r.top) / r.height) * map.h);
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

// ---------------------------------------------------------------- mouse

petEl.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || !overPet(e.clientX, e.clientY)) return;
  pressed = true;
  attention();
  window.pet.dragStart();
});

window.addEventListener('mouseup', async (e) => {
  if (e.button !== 0 || !pressed) return;
  pressed = false;
  const { moved } = await window.pet.dragEnd();
  if (dragging) {
    dragging = false;
    show('idle', { line: random(['新位置不错～', '到啦！', '放我下来啦～']), ms: 2600 });
  } else if (!moved) {
    click();
  }
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
    dragging = true;
    show('aha', { line: random(['诶诶？要带我去哪儿？', '哇，飞起来了！']), ms: 0 });
    petEl.classList.add('dragging');
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
