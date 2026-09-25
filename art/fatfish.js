// 大肥鱼 (DeepSeek Fat Fish) — SVG character generator.
//
// The fish is drawn in a 512x512 box and faces left. Each part lives in its own
// group (tail / body / fin / face / fx) so the desktop pet can animate them
// separately: wag the tail, flap the fin, blink, bob up and down.

export const PALETTE = {
  blue: '#4D6BFE', // DeepSeek blue
  blueLight: '#7D94FF',
  blueDark: '#3A55E6',
  line: '#2335A6',
  belly: '#FFFFFF',
  bellyShade: '#E3E9FF',
  eye: '#1B2150',
  blush: '#FF9DBE',
  mouth: '#C2335A',
  tongue: '#FF8FA6',
  water: '#A9DDFF',
  gold: '#FFC940',
  goldDark: '#E59A12',
};

// name: label shown on the character sheet; line: what the fish says.
export const EXPRESSIONS = {
  idle: { name: '待机', line: '今天也要游来游去～' },
  hello: { name: '打招呼', line: '你好呀！我是大肥鱼！' },
  happy: { name: '开心', line: '嘿嘿，被夸了～' },
  think: { name: '深度思考', line: '嗯……让我想想。' },
  busy: { name: '服务器繁忙', line: '服务器繁忙，请稍后再试。' },
  sleep: { name: '睡觉', line: 'Zzz……' },
  sideeye: { name: '斜眼', line: '……你认真的？' },
  surprised: { name: '惊讶', line: '诶？！' },
  eat: { name: '吃 Token', line: '嗷呜，Token 真好吃！' },
};

const BODY = 'M46 302 C46 207 131 132 238 132 C345 132 428 207 428 302 C428 412 354 470 238 470 C122 470 46 412 46 302 Z';

// Tail in its own coordinates: base at (0, 0), flukes pointing up.
const TAIL = [
  'M-30 30',
  'C-32 -8 -32 -36 -28 -56',
  'C-40 -72 -50 -100 -44 -124',
  'C-38 -148 -8 -150 -4 -126',
  'C-2 -110 2 -96 10 -86',
  'C28 -100 56 -118 82 -114',
  'C102 -110 104 -88 90 -78',
  'C72 -58 48 -46 28 -44',
  'C28 -20 28 6 30 30 Z',
].join(' ');
const TAIL_CREASE = 'M10 -86 C8 -72 5 -62 1 -54';
const TAIL_ORIGIN = [360, 208];

// White belly: the crescent from the DeepSeek logo, framed by a blue rim.
const BELLY = 'M70 326 C130 314 208 318 262 344 C312 368 346 410 360 446 C326 454 286 452 238 452 C138 452 76 410 66 348 C65 338 66 330 70 326 Z';

// Side fin. The root (292, 334 → 292, 372) has no outline so it blends into the body.
const FIN_EDGE = 'M292 334 C322 330 354 352 370 386 C376 400 366 412 352 406 C328 396 306 386 292 372';
const FIN = FIN_EDGE + ' C282 364 280 340 292 334 Z';
const FIN_ORIGIN = [292, 353];

const EYE_L = [128, 262];
const EYE_R = [218, 262];
const MOUTH = [174, 294];

const f = (n) => +n.toFixed(1);

function sparkle(x, y, s, fill = '#FFFFFF') {
  const k = s * 0.26;
  return `<path d="M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z" fill="${fill}"/>`;
}

function spiral(cx, cy, r, turns = 2.3) {
  const pts = [];
  const n = 56;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2 - Math.PI / 2;
    pts.push(`${f(cx + r * t * Math.cos(a))} ${f(cy + r * t * Math.sin(a))}`);
  }
  return 'M' + pts.join(' L');
}

// A shape drawn twice: a fat stroke in the line colour, then the fill on top.
// Overlapping pieces (clouds, bubbles) therefore share one clean outline.
function outlined(shapes, fill, p, width = 7) {
  return `<g fill="${p.line}" stroke="${p.line}" stroke-width="${width * 2}" stroke-linejoin="round">${shapes}</g>
    <g fill="${fill}">${shapes}</g>`;
}

// ---------------------------------------------------------------- eyes

function eyesDot(p, { sparkly = false } = {}) {
  return [EYE_L, EYE_R]
    .map(([x, y]) => `
      <ellipse cx="${x}" cy="${y}" rx="17" ry="22" fill="${p.eye}"/>
      ${sparkly ? sparkle(x + 5, y - 8, 9) : `<circle cx="${x + 6}" cy="${y - 9}" r="7" fill="#fff"/>`}
      <circle cx="${x - 5}" cy="${y + 9}" r="3.2" fill="#fff" opacity=".9"/>`)
    .join('');
}

function eyesArc(p, shape) {
  // shape 'up': happy ^ ^ ; shape 'down': sleeping ︶ ︶
  const [top, mid] = shape === 'up' ? [8, -12] : [0, 16];
  return [EYE_L, EYE_R]
    .map(([x, y]) => `<path d="M${x - 17} ${y + top} Q${x} ${y + mid} ${x + 17} ${y + top}" fill="none" stroke="${p.eye}" stroke-width="7" stroke-linecap="round"/>`)
    .join('');
}

function eyesThink(p) {
  // Looking up and to the side, with a raised brow on one eye.
  return [EYE_L, EYE_R]
    .map(([x, y]) => `
      <ellipse cx="${x - 3}" cy="${y - 2}" rx="16" ry="21" fill="${p.eye}"/>
      <circle cx="${x - 8}" cy="${y - 12}" r="6.5" fill="#fff"/>
      <circle cx="${x + 3}" cy="${y + 7}" r="2.8" fill="#fff" opacity=".9"/>`)
    .join('') +
    `<path d="M${EYE_R[0] - 14} ${EYE_R[1] - 36} Q${EYE_R[0]} ${EYE_R[1] - 46} ${EYE_R[0] + 16} ${EYE_R[1] - 38}" fill="none" stroke="${p.eye}" stroke-width="5" stroke-linecap="round"/>`;
}

function eyesDizzy(p) {
  return [EYE_L, EYE_R]
    .map(([x, y], i) => `<path d="${spiral(x, y, 18, i ? 2.3 : -2.3)}" fill="none" stroke="${p.eye}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
}

function eyesSide(p, id) {
  // The DeepSeek-logo eye: a white almond with the pupil pushed into the corner, half-lidded.
  return [EYE_L, EYE_R]
    .map(([x, y], i) => `
      <clipPath id="${id}-se${i}"><ellipse cx="${x}" cy="${y + 2}" rx="21" ry="15"/></clipPath>
      <ellipse cx="${x}" cy="${y + 2}" rx="21" ry="15" fill="#fff"/>
      <g clip-path="url(#${id}-se${i})">
        <circle cx="${x + 12}" cy="${y + 6}" r="10" fill="${p.eye}"/>
        <circle cx="${x + 15}" cy="${y + 2}" r="3" fill="#fff"/>
        <rect x="${x - 24}" y="${y - 16}" width="48" height="13" fill="url(#${id}-body)"/>
      </g>
      <path d="M${x - 23} ${y - 3} L${x + 23} ${y - 3}" stroke="${p.eye}" stroke-width="5" stroke-linecap="round"/>
      <path d="M${x - 19} ${y + 12} Q${x} ${y + 22} ${x + 19} ${y + 12}" fill="none" stroke="${p.eye}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`)
    .join('');
}

function eyesSurprised(p) {
  return [EYE_L, EYE_R]
    .map(([x, y]) => `
      <circle cx="${x}" cy="${y - 2}" r="21" fill="#fff" stroke="${p.eye}" stroke-width="5"/>
      <circle cx="${x}" cy="${y}" r="8.5" fill="${p.eye}"/>
      <circle cx="${x + 3}" cy="${y - 3}" r="2.6" fill="#fff"/>`)
    .join('') +
    [EYE_L, EYE_R]
      .map(([x, y]) => `<path d="M${x - 14} ${y - 38} Q${x} ${y - 47} ${x + 14} ${y - 38}" fill="none" stroke="${p.eye}" stroke-width="5" stroke-linecap="round"/>`)
      .join('');
}

// ---------------------------------------------------------------- mouths

function mouthW(p) {
  const [x, y] = MOUTH;
  return `<path d="M${x - 14} ${y - 2} Q${x - 7} ${y + 6} ${x} ${y - 2} Q${x + 7} ${y + 6} ${x + 14} ${y - 2}" fill="none" stroke="${p.eye}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function mouthOpen(p, id, { w = 20, h = 22 } = {}) {
  const [x, y] = MOUTH;
  const d = `M${x - w} ${y - 4} Q${x} ${y + 2} ${x + w} ${y - 4} Q${x + w - 2} ${y + h} ${x} ${y + h} Q${x - w + 2} ${y + h} ${x - w} ${y - 4} Z`;
  return `
    <clipPath id="${id}-mo"><path d="${d}"/></clipPath>
    <path d="${d}" fill="${p.mouth}"/>
    <ellipse cx="${x + 2}" cy="${y + h + 2}" rx="${w * 0.62}" ry="${h * 0.5}" fill="${p.tongue}" clip-path="url(#${id}-mo)"/>
    <path d="${d}" fill="none" stroke="${p.eye}" stroke-width="4.5" stroke-linejoin="round"/>`;
}

function mouthO(p, { rx = 8, ry = 10, dy = 6 } = {}) {
  const [x, y] = MOUTH;
  return `<ellipse cx="${x}" cy="${y + dy}" rx="${rx}" ry="${ry}" fill="${p.mouth}" stroke="${p.eye}" stroke-width="4.5"/>`;
}

function mouthWavy(p) {
  const [x, y] = MOUTH;
  return `<path d="M${x - 20} ${y + 2} Q${x - 15} ${y - 6} ${x - 10} ${y + 2} T${x} ${y + 2} T${x + 10} ${y + 2} T${x + 20} ${y + 2}" fill="none" stroke="${p.eye}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function mouthFlat(p) {
  const [x, y] = MOUTH;
  return `<path d="M${x - 11} ${y + 3} Q${x} ${y} ${x + 11} ${y + 4}" fill="none" stroke="${p.eye}" stroke-width="5" stroke-linecap="round"/>`;
}

function mouthHmm(p) {
  const [x, y] = MOUTH;
  return `<path d="M${x - 10} ${y + 4} Q${x - 2} ${y + 1} ${x + 6} ${y - 1} Q${x + 12} ${y - 2} ${x + 13} ${y + 3}" fill="none" stroke="${p.eye}" stroke-width="5" stroke-linecap="round"/>`;
}

// ---------------------------------------------------------------- effects

function fxSparkles(p) {
  return sparkle(62, 132, 16, p.gold) + sparkle(104, 90, 9, p.gold) + sparkle(304, 96, 12, p.gold);
}

function fxSpout(p) {
  const jets = `
    <path d="M232 138 C226 110 214 94 196 86" />
    <path d="M238 138 C238 108 238 84 240 62" />
    <path d="M244 138 C252 110 264 94 282 86" />`;
  return `
    <g fill="none" stroke-linecap="round">
      <g stroke="${p.line}" stroke-width="20">${jets}</g>
      <g stroke="${p.water}" stroke-width="8">${jets}</g>
    </g>
    ${outlined(`<circle cx="192" cy="84" r="9"/><circle cx="240" cy="56" r="10"/><circle cx="286" cy="84" r="9"/>`, p.water, p, 4.5)}
    <circle cx="237" cy="53" r="3" fill="#fff"/>
    <circle cx="189" cy="81" r="2.6" fill="#fff"/>
    <circle cx="283" cy="81" r="2.6" fill="#fff"/>`;
}

function fxThought(p) {
  const cloud = `
    <circle cx="96" cy="72" r="34"/>
    <circle cx="140" cy="62" r="38"/>
    <circle cx="184" cy="76" r="30"/>
    <circle cx="120" cy="96" r="28"/>
    <circle cx="164" cy="98" r="26"/>`;
  return `
    ${outlined(cloud, '#fff', p, 5)}
    ${outlined(`<circle cx="92" cy="136" r="11"/>`, '#fff', p, 5)}
    ${outlined(`<circle cx="76" cy="164" r="7"/>`, '#fff', p, 5)}
    <g fill="${p.blue}">
      <circle cx="112" cy="80" r="8"/><circle cx="140" cy="80" r="8" opacity=".7"/><circle cx="168" cy="80" r="8" opacity=".4"/>
    </g>`;
}

function fxSweat(p, x = 300, y = 196, s = 1) {
  return `<path d="M${x} ${y} C${x + 10 * s} ${y + 14 * s} ${x + 16 * s} ${y + 24 * s} ${x + 16 * s} ${y + 32 * s} C${x + 16 * s} ${y + 42 * s} ${x + 8 * s} ${y + 48 * s} ${x} ${y + 48 * s} C${x - 8 * s} ${y + 48 * s} ${x - 16 * s} ${y + 42 * s} ${x - 16 * s} ${y + 32 * s} C${x - 16 * s} ${y + 24 * s} ${x - 10 * s} ${y + 14 * s} ${x} ${y} Z" fill="${p.water}" stroke="${p.line}" stroke-width="4.5" stroke-linejoin="round"/>
    <ellipse cx="${x - 6 * s}" cy="${y + 32 * s}" rx="${3 * s}" ry="${6 * s}" fill="#fff"/>`;
}

function fxSteam(p) {
  const puffs = `
    <circle cx="150" cy="118" r="17"/><circle cx="170" cy="102" r="21"/><circle cx="192" cy="116" r="15"/>
    <circle cx="276" cy="112" r="14"/><circle cx="292" cy="98" r="18"/><circle cx="310" cy="110" r="12"/>`;
  return `${outlined(puffs, '#EEF1FF', p, 4)}
    <g fill="none" stroke="${p.line}" stroke-width="4.5" stroke-linecap="round">
      <path d="M170 70 q-7 -8 0 -16 q7 -8 0 -16"/><path d="M292 64 q-6 -7 0 -14 q6 -7 0 -14"/>
    </g>`;
}

function fxZzz(p) {
  const z = (x, y, s, w) => {
    const d = `M${x} ${y} h${s} l${-s} ${s} h${s}`;
    return `<path d="${d}" stroke="${p.line}" stroke-width="${w + 7}"/><path d="${d}" stroke="#E3E9FF" stroke-width="${w}"/>`;
  };
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${z(250, 92, 28, 8) + z(296, 50, 20, 7) + z(208, 58, 15, 6)}</g>`;
}

function fxBubble(p) {
  // Sleep bubble blown from the mouth.
  const [x, y] = [MOUTH[0] - 4, MOUTH[1] + 14];
  return `<circle cx="${x}" cy="${y}" r="17" fill="#DDF2FF" fill-opacity=".85" stroke="${p.line}" stroke-width="4"/>
    <ellipse cx="${x - 6}" cy="${y - 7}" rx="5" ry="3.2" transform="rotate(-30 ${x - 6} ${y - 7})" fill="#fff"/>`;
}

function fxBang(p) {
  return `<g stroke="${p.line}" stroke-linecap="round">
      <path d="M266 58 L262 106" stroke-width="22"/><path d="M266 58 L262 106" stroke="#FF6B6B" stroke-width="10"/>
    </g>
    <circle cx="260" cy="130" r="9" fill="#FF6B6B" stroke="${p.line}" stroke-width="5"/>
    <path d="M214 92 L200 78 M206 112 L186 108 M302 92 L318 80" stroke="${p.line}" stroke-width="5" stroke-linecap="round"/>`;
}

function fxToken(p, id) {
  // A golden token with a bite taken out of it, crumbs flying towards the mouth.
  const [x, y] = [92, 350];
  const bites = [[x + 21, y - 23, 11], [x + 30, y - 6, 9]];
  return `
    <mask id="${id}-bite" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
      <rect width="512" height="512" fill="#fff"/>
      ${bites.map(([bx, by, r]) => `<circle cx="${bx}" cy="${by}" r="${r}" fill="#000"/>`).join('')}
    </mask>
    <clipPath id="${id}-coin"><circle cx="${x}" cy="${y}" r="32"/></clipPath>
    <g mask="url(#${id}-bite)">
      <circle cx="${x}" cy="${y}" r="30" fill="${p.gold}" stroke="${p.line}" stroke-width="5"/>
      <circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${p.goldDark}" stroke-width="3.5"/>
      <path d="M${x - 10} ${y - 9} H${x + 9} M${x - 0.5} ${y - 9} V${y + 11}" stroke="${p.goldDark}" stroke-width="5.5" stroke-linecap="round"/>
    </g>
    <g clip-path="url(#${id}-coin)" mask="url(#${id}-bite)" fill="none" stroke="${p.line}" stroke-width="5">
      ${bites.map(([bx, by, r]) => `<circle cx="${bx}" cy="${by}" r="${r + 2.5}"/>`).join('')}
    </g>
    <g fill="${p.gold}" stroke="${p.line}" stroke-width="3">
      <circle cx="${x + 46}" cy="${y - 30}" r="4.5"/><circle cx="${x + 56}" cy="${y - 16}" r="3.5"/><circle cx="${x + 38}" cy="${y - 44}" r="3"/>
    </g>
    ${sparkle(x - 22, y - 44, 10, p.gold)}`;
}

function fxBubbles(p) {
  return `<g fill="#fff" fill-opacity=".35" stroke="${p.line}" stroke-width="3.5" stroke-opacity=".55">
      <circle cx="58" cy="148" r="15"/><circle cx="86" cy="102" r="9"/><circle cx="470" cy="236" r="11"/><circle cx="486" cy="200" r="6"/>
    </g>
    <g fill="#fff"><circle cx="53" cy="143" r="4"/><circle cx="467" cy="232" r="3"/></g>`;
}

// ---------------------------------------------------------------- poses

const POSES = {
  idle: { eyes: (p) => eyesDot(p), mouth: mouthW, fx: () => '' },
  hello: {
    eyes: (p) => eyesDot(p, { sparkly: true }),
    mouth: (p, id) => mouthOpen(p, id, { w: 16, h: 18 }),
    fin: -62,
    tail: 2,
    tilt: -5,
    fx: (p) => fxBubbles(p) + sparkle(116, 96, 12, p.gold) + sparkle(150, 64, 7, p.gold),
  },
  happy: { eyes: (p) => eyesArc(p, 'up'), mouth: (p, id) => mouthOpen(p, id), fin: -30, tail: -2, blush: 1, fx: (p) => fxSpout(p) + fxSparkles(p) },
  think: { eyes: eyesThink, mouth: mouthHmm, fin: -20, tilt: 5, fx: fxThought },
  busy: { eyes: eyesDizzy, mouth: mouthWavy, fin: 8, tail: 24, fx: (p) => fxSteam(p) + fxSweat(p, 40, 196, 0.9) + fxSweat(p, 236, 168, 0.65) },
  sleep: { eyes: (p) => eyesArc(p, 'down'), mouth: () => '', fin: 10, tail: 18, squash: 0.94, fx: (p) => fxZzz(p) + fxBubble(p) },
  sideeye: { eyes: (p, id) => eyesSide(p, id), mouth: mouthFlat, blush: 0.35, fx: (p) => fxSweat(p, 290, 196, 0.8) },
  surprised: { eyes: eyesSurprised, mouth: (p) => mouthO(p), fin: -45, tail: -4, blush: 0.4, fx: fxBang },
  eat: { eyes: (p) => eyesDot(p, { sparkly: true }), mouth: (p, id) => mouthOpen(p, id, { w: 18, h: 20 }), fin: -28, fx: fxToken },
};

export function fatFishSVG({ expression = 'idle', id = 'ff', ground = true, size = 512 } = {}) {
  const p = PALETTE;
  const pose = POSES[expression] || POSES.idle;
  const squash = pose.squash || 1;
  const t = [];
  if (pose.tilt) t.push(`rotate(${pose.tilt} 238 300)`);
  if (squash !== 1) t.push(`translate(238 470) scale(${f(1 + (1 - squash) / 2)} ${squash}) translate(-238 -470)`);
  const fishT = t.length ? `transform="${t.join(' ')}"` : '';
  const blush = pose.blush ?? 0.85;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <radialGradient id="${id}-body" gradientUnits="userSpaceOnUse" cx="184" cy="233" r="306" gradientTransform="translate(0 233) scale(1 .885) translate(0 -233)">
      <stop offset="0" stop-color="${p.blueLight}"/>
      <stop offset="0.45" stop-color="${p.blue}"/>
      <stop offset="1" stop-color="${p.blueDark}"/>
    </radialGradient>
    <linearGradient id="${id}-tail" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${p.blueDark}"/>
      <stop offset="1" stop-color="${p.blueLight}"/>
    </linearGradient>
    <linearGradient id="${id}-belly" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.belly}"/>
      <stop offset="1" stop-color="${p.bellyShade}"/>
    </linearGradient>
    <clipPath id="${id}-clip"><path d="${BODY}"/></clipPath>
    <filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs>
  ${ground ? `<ellipse class="shadow" cx="240" cy="494" rx="150" ry="13" fill="#1B2150" opacity=".15"/>` : ''}
  <g class="fish" ${fishT}>
    <g class="tail" transform="translate(${TAIL_ORIGIN[0]} ${TAIL_ORIGIN[1]}) rotate(${pose.tail ?? 10})">
      <path d="${TAIL}" fill="url(#${id}-tail)" stroke="${p.line}" stroke-width="7" stroke-linejoin="round"/>
      <path d="${TAIL_CREASE}" fill="none" stroke="${p.line}" stroke-width="4" stroke-linecap="round" opacity=".5"/>
      <ellipse cx="-24" cy="-118" rx="7" ry="13" transform="rotate(-10 -24 -118)" fill="#fff" opacity=".35"/>
    </g>
    <g class="body">
      <path d="${BODY}" fill="url(#${id}-body)"/>
      <g clip-path="url(#${id}-clip)">
        <path d="${BELLY}" fill="url(#${id}-belly)"/>
      </g>
      <path d="${BODY}" fill="none" stroke="${p.line}" stroke-width="7"/>
      <ellipse cx="170" cy="178" rx="46" ry="20" transform="rotate(-24 170 178)" fill="#fff" opacity=".35"/>
      <circle cx="224" cy="158" r="8" fill="#fff" opacity=".35"/>
    </g>
    <g class="fin" transform="rotate(${pose.fin ?? 0} ${FIN_ORIGIN[0]} ${FIN_ORIGIN[1]})">
      <path d="${FIN}" fill="${p.blue}"/>
      <path d="${FIN_EDGE}" fill="none" stroke="${p.line}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M312 350 C330 356 344 368 352 382" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".35"/>
    </g>
    <g class="face">
      <g class="blush" filter="url(#${id}-soft)" fill="${p.blush}" opacity="${blush}">
        <ellipse cx="98" cy="300" rx="19" ry="11"/>
        <ellipse cx="246" cy="300" rx="19" ry="11"/>
      </g>
      <g class="eyes">${pose.eyes(p, id)}</g>
      <g class="mouth">${pose.mouth(p, id)}</g>
    </g>
  </g>
  <g class="fx">${pose.fx(p, id)}</g>
</svg>`;
}
