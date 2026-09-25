// 深深（DeepSeek 娘，外号「大肥鱼」）— SVG character generator.
//
// A chibi whale girl in a maid dress, drawn in a 600x1000 box. Parts live in
// their own groups (hair-back / tail / legs / outfit / arms / head / fx) so the
// desktop pet can animate them later: sway the hair, wag the tail, blink.

import { lock, smooth, mirrorPts, lockLine, frill, sampleSpline } from './geom.js';

export const PALETTE = {
  line: '#1B2266',
  skin: '#FFEDE4',
  skinShade: '#F7CFC4',
  skinLine: '#C9786C',
  hair: '#4661F2',
  hairTip: '#8CC6FF',
  iris1: '#131B66',
  iris2: '#2F4BE0',
  iris3: '#5AA2FF',
  iris4: '#A6ECFF',
  blush: '#FF9AAE',
  fin: '#28348E',
  finBelly: '#DCE4FA',
  dress: '#252F7A',
  dressShade: '#1A2160',
  dressHi: '#3B4CB2',
  white: '#FFFFFF',
  whiteShade: '#DCE3F5',
  fold: '#B7C2E4',
  gold: '#E8BC5E',
  goldDark: '#B4862C',
  blue: '#4D6BFE', // DeepSeek blue
  blueDark: '#3550DA',
  shoe: '#232B6E',
  tail: '#2E3C9E',
  tailBelly: '#DDE5FB',
  water: '#A9DDFF',
};
const P = PALETTE;
const FONT = "'ZCOOL KuaiLe', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif";

// Each expression is a desktop-pet state: face, arm pose, head tilt and effects.
// `line` is what she says in that state.
export const EXPRESSIONS = {
  idle: { name: '待机', line: '有什么可以帮你的吗？', eyes: 'open', brows: 'normal', mouth: 'cat', arms: ['down', 'down'] },
  hello: { name: '打招呼', line: '我是 DeepSeek，很高兴见到你！', eyes: 'sparkle', brows: 'normal', mouth: 'open', arms: ['out', 'wave'], fx: ['sparkles'] },
  think: { name: '深度思考', line: '嗯，用户说……', eyes: 'up', brows: 'think', mouth: 'hmm', arms: ['down', 'chin'], tilt: 4, fx: ['thought'] },
  busy: { name: '服务器繁忙', line: '服务器繁忙，请稍后再试。', eyes: 'dizzy', brows: 'worried', mouth: 'wavy', arms: ['sign', 'sign'], fx: ['sign', 'sweat', 'steam'] },
  happy: { name: '开源啦', line: '全部开源，MIT 协议，随便用～', eyes: 'happy', brows: 'raised', mouth: 'open', arms: ['out', 'wave'], blush: 1, fx: ['sparkles', 'hearts'] },
  aha: { name: '顿悟', line: '等等，我好像悟了！', eyes: 'surprised', brows: 'raised', mouth: 'o', arms: ['down', 'down'], fx: ['bang'] },
  eat: { name: '吃 Token', line: 'Token 便宜又大碗，嗷呜！', eyes: 'sparkle', brows: 'normal', mouth: 'chomp', arms: ['coin', 'coin'], blush: 1, fx: ['coin'] },
  sleep: { name: '睡觉', line: '夜间错峰优惠中……zzz', eyes: 'closed', brows: 'relaxed', mouth: 'sleep', arms: ['down', 'down'], tilt: -5, fx: ['zzz'] },
  sideeye: { name: '无语', line: '……这题问过 128K 遍了。', eyes: 'side', brows: 'flat', mouth: 'flat', arms: ['down', 'down'], blush: 0.3, fx: ['sweat', 'dots'] },
};

const r = (n) => Math.round(n * 10) / 10;
const mirrorD = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${r(600 - +x)} ${y}`);
const rad = (a) => (a * Math.PI) / 180;

// Strokes drawn twice — fat in the line colour, then thinner in the fill — so
// overlapping pieces (fingers, clouds) share one clean outline.
function outlined(shapes, fill, lw = 2.4, line = P.line) {
  const draw = (extra, color) =>
    `<g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">${shapes.map(([d, w]) => `<path d="${d}" stroke-width="${w + extra}"/>`).join('')}</g>`;
  return draw(2 * lw, line) + draw(0, fill);
}

function ruffle(points, opts, fill = P.white) {
  const f = frill(points, opts);
  return `<path d="${f.d}" fill="${fill}" stroke="${P.line}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${f.folds}" stroke="${P.fold}" stroke-width="1.6" stroke-linecap="round"/>`;
}

function sparkle(x, y, s, fill = P.gold) {
  const k = s * 0.26;
  return `<path d="M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z" fill="${fill}"/>`;
}

// ================================================================== face

const FACE = 'M207 150 C204 190 206 230 222 258 C242 284 272 300 300 302 C328 300 358 284 378 258 C394 230 396 190 393 150 C393 100 350 78 300 78 C250 78 207 100 207 150 Z';
const EYES = [[255, 226], [345, 226]];
const SCLERA = 'M-25 -6 C-20 -22 -4 -28 10 -26 C18 -25 24 -18 25 -10 C25 8 18 24 2 28 C-12 30 -24 18 -25 -6 Z';
const LASH = 'M-30 2 C-28 -14 -16 -28 4 -30 C16 -31 26 -22 28 -10 C27 -8 25 -8 24 -10 C20 -20 12 -25 2 -25 C-12 -24 -22 -14 -25 -4 C-27 0 -28 2 -30 2 Z';
const LASH_TIPS = 'M-25 -14 L-35 -19 L-27 -8 Z M-27 -6 L-37 -8 L-28 -1 Z';

function openEye(id, i, { look = [0, 0], iris = 1, sparkly = false, lid = 0 } = {}) {
  const [cx, cy] = EYES[i];
  const m = i === 1 ? -1 : 1; // the right eye is mirrored
  const [lx, ly] = [look[0] * m, look[1]];
  const cid = `${id}-eye${i}`;
  const lidLine = lid
    ? `<path d="M-29 ${-26 + lid} Q0 ${-31 + lid} 29 ${-25 + lid}" fill="none" stroke="${P.line}" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="${LASH}" fill="${P.line}"/><path d="${LASH_TIPS}" fill="${P.line}"/>`;
  const hx = cx + look[0], hy = cy + look[1];
  const highlights = sparkly
    ? sparkle(hx - 7, hy - 9, 11, '#fff') + sparkle(hx + 10, hy + 13, 4.5, '#fff')
    : `<ellipse cx="${hx - 8 * iris}" cy="${hy - 10 * iris}" rx="${8 * iris}" ry="${10 * iris}" fill="#fff"/><circle cx="${hx + 10 * iris}" cy="${hy + 15 * iris}" r="${4 * iris}" fill="#fff"/>`;
  return `<g transform="translate(${cx} ${cy}) scale(${1.12 * m} 1.12)">
      <clipPath id="${cid}"><path d="${SCLERA}"/></clipPath>
      <path d="${SCLERA}" fill="#fff"/>
      <g clip-path="url(#${cid})">
        <ellipse cx="${1 + lx}" cy="${4 + ly}" rx="${19 * iris}" ry="${25 * iris}" fill="url(#${id}-iris)"/>
        <ellipse cx="${1 + lx}" cy="${2 + ly}" rx="${8.5 * iris}" ry="${12.5 * iris}" fill="${P.iris1}" opacity=".85"/>
        <ellipse cx="${1 + lx}" cy="${4 + ly}" rx="${19 * iris}" ry="${25 * iris}" fill="none" stroke="${P.iris1}" stroke-width="2"/>
        <path d="M${-14 * iris + lx} ${16 * iris + ly} Q${1 + lx} ${30 * iris + ly} ${16 * iris + lx} ${16 * iris + ly} Q${1 + lx} ${24 * iris + ly} ${-14 * iris + lx} ${16 * iris + ly} Z" fill="${P.iris4}" opacity=".8"/>
        <path d="M-25 -30 H26 V-12 C10 -18 -10 -18 -25 -10 Z" fill="${P.iris1}" opacity=".25"/>
        ${lid ? `<rect x="-32" y="-36" width="64" height="${10 + lid}" fill="${P.skin}"/>` : ''}
      </g>
      ${lidLine}
      <path d="M-19 21 Q-8 30 6 29" fill="none" stroke="${P.line}" stroke-width="2" stroke-linecap="round"/>
      <path d="M-18 -32 Q-2 -39 16 -34" fill="none" stroke="${P.skinLine}" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    ${lid ? '' : highlights}`;
}

function spiral(cx, cy, rr, turns) {
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, a = t * turns * Math.PI * 2 - Math.PI / 2;
    pts.push(`${r(cx + rr * t * Math.cos(a))} ${r(cy + rr * t * Math.sin(a))}`);
  }
  return 'M' + pts.join(' L');
}

function eyes(id, kind) {
  const line = `fill="none" stroke="${P.line}" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case 'sparkle':
      return openEye(id, 0, { sparkly: true }) + openEye(id, 1, { sparkly: true });
    case 'up':
      return openEye(id, 0, { look: [-4, -7] }) + openEye(id, 1, { look: [-4, -7] });
    case 'surprised':
      return openEye(id, 0, { iris: 0.62 }) + openEye(id, 1, { iris: 0.62 });
    case 'side':
      return openEye(id, 0, { look: [12, 3], lid: 13 }) + openEye(id, 1, { look: [12, 3], lid: 13 });
    case 'happy':
      return EYES.map(([x, y], i) => `<path d="M${x - 22} ${y + 8} Q${x} ${y - 18} ${x + 22} ${y + 8}" ${line} stroke-width="5.5"/>
        <path d="M${i ? x + 22 : x - 22} ${y + 8} l${i ? 7 : -7} -4" ${line} stroke-width="3"/>`).join('');
    case 'closed':
      return EYES.map(([x, y], i) => `<path d="M${x - 22} ${y} Q${x} ${y + 15} ${x + 22} ${y}" ${line} stroke-width="5"/>
        <path d="M${x - 12} ${y + 8} l-3 6 M${x} ${y + 10} l0 6.5 M${x + 12} ${y + 8} l3 6" ${line} stroke-width="2.2"/>
        <path d="M${i ? x + 22 : x - 22} ${y} l${i ? 7 : -7} -3" ${line} stroke-width="3"/>`).join('');
    case 'dizzy':
      return EYES.map(([x, y], i) => `<path d="${spiral(x, y + 2, 20, i ? 2.4 : -2.4)}" ${line} stroke-width="3.6"/>`).join('');
    default:
      return openEye(id, 0) + openEye(id, 1);
  }
}

// brows sit over the bangs, half transparent, as anime brows often do
const BROWS = {
  normal: [[234, 190], [250, 184], [268, 185]],
  raised: [[234, 180], [250, 171], [268, 175]],
  worried: [[234, 190], [252, 186], [268, 177]],
  flat: [[236, 187], [252, 185], [268, 187]],
  relaxed: [[236, 193], [252, 189], [268, 191]],
  think: [[234, 180], [250, 174], [268, 179]],
};
function brows(kind) {
  const left = BROWS[kind] || BROWS.normal;
  const right = kind === 'think' ? [[332, 191], [350, 190], [366, 194]] : mirrorPts(left);
  const b = (pts) => lock(pts, [[0, 1], [0.4, 3.2], [1, 0.6]]).d;
  return `<g class="brows" fill="${P.line}" opacity=".75"><path d="${b(left)}"/><path d="${b(right)}"/></g>`;
}

function mouth(id, kind) {
  const ln = `fill="none" stroke="#6E2233" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
  const openShape = (w, h, fang = true) => {
    const d = `M${300 - w} 266 Q300 ${270 + w * 0.05} ${300 + w} 266 Q${300 + w - 1} ${270 + h} 300 ${272 + h} Q${300 - w + 1} ${270 + h} ${300 - w} 266 Z`;
    return `<clipPath id="${id}-mouth"><path d="${d}"/></clipPath>
      <path d="${d}" fill="#A3304A"/>
      <ellipse cx="301" cy="${272 + h}" rx="${w * 0.72}" ry="${h * 0.45}" fill="#FF8098" clip-path="url(#${id}-mouth)"/>
      ${fang ? `<path d="M${304 - w} 267.5 L${309 - w} 268 L${306.5 - w} 273 Z" fill="#fff"/>` : ''}
      <path d="${d}" ${ln}/>`;
  };
  switch (kind) {
    case 'cat':
      return `<path d="M287 268 Q293.5 276 300 269 Q306.5 276 313 268" ${ln} stroke="${P.skinLine}" stroke-width="2.4"/>`;
    case 'o':
      return `<ellipse cx="300" cy="277" rx="7" ry="9" fill="#A3304A" stroke="#6E2233" stroke-width="2.2"/><ellipse cx="300" cy="282" rx="4" ry="3" fill="#FF8098"/>`;
    case 'wavy':
      return `<path d="M284 274 q4 -6 8 0 t8 0 t8 0 t8 0" ${ln}/>`;
    case 'flat':
      return `<path d="M290 275 Q300 273 311 276" ${ln}/>`;
    case 'hmm':
      return `<path d="M293 276 Q301 271 309 273 Q312 274 312 277" ${ln}/>`;
    case 'sleep':
      return `<ellipse cx="300" cy="276" rx="4.5" ry="5" fill="#A3304A" stroke="#6E2233" stroke-width="2"/>`;
    case 'chomp':
      return openShape(16, 20);
    default:
      return openShape(14, 15);
  }
}

function face(id, e) {
  const strength = e.blush ?? 0.6;
  return `
    <g class="blush" filter="url(#${id}-blur)" fill="${P.blush}" opacity="${strength}">
      <ellipse cx="236" cy="256" rx="18" ry="9"/><ellipse cx="364" cy="256" rx="18" ry="9"/>
    </g>
    <g stroke="#F07890" stroke-width="1.6" stroke-linecap="round" opacity="${Math.min(0.8, strength + 0.1)}">
      <path d="M228 259 l5 -7 M236 259 l5 -7 M244 259 l5 -7"/><path d="M356 259 l5 -7 M364 259 l5 -7 M372 259 l5 -7"/>
    </g>
    <g class="eyes">${eyes(id, e.eyes)}</g>
    <path d="M298 251 Q300 254 302 252" fill="none" stroke="${P.skinLine}" stroke-width="1.6" stroke-linecap="round"/>
    <g class="mouth">${mouth(id, e.mouth)}</g>`;
}

// ================================================================== hair

const WB = (a, b, c) => [[0, 30], [0.2, a], [0.5, b], [0.85, c], [1, 0]];
const BACK = [
  { pts: [[236, 150], [206, 200], [184, 270], [170, 350], [160, 430], [150, 500], [134, 560], [128, 610], [142, 650], [132, 692]], w: WB(80, 90, 52) },
  { pts: [[222, 180], [196, 230], [168, 310], [146, 390], [126, 460], [108, 520], [112, 568], [94, 610], [104, 648]], w: WB(44, 52, 32) },
  { pts: [[240, 170], [214, 250], [196, 350], [186, 450], [170, 530], [152, 596], [162, 636], [150, 676]], w: WB(46, 54, 36) },
  { pts: [[262, 150], [236, 210], [216, 300], [204, 400], [196, 480], [190, 560], [176, 620], [188, 660], [174, 706]], w: WB(70, 76, 42) },
];
// the right side is a mirror with the tips nudged, so it is not perfectly symmetric
const BACK_R = BACK.map((l, i) => ({
  ...l,
  pts: mirrorPts(l.pts).map(([x, y], k, arr) => (k > arr.length - 4 ? [x + [6, -4, 8, -6][i], y + [4, -6, 6, 2][i]] : [x, y])),
}));
const BACK_MID = { pts: [[300, 160], [300, 300], [300, 620]], w: [[0, 150], [0.15, 250], [1, 250]] };

const BW = (w) => [[0, w], [0.55, w * 0.95], [0.88, w * 0.5], [1, 0]];
const BANGS = [
  { pts: [[236, 96], [214, 140], [206, 196], [212, 248]], w: BW(40) },
  { pts: [[364, 96], [386, 140], [394, 196], [388, 248]], w: BW(40) },
  { pts: [[256, 84], [242, 130], [236, 166], [238, 200]], w: BW(44) },
  { pts: [[344, 84], [358, 130], [364, 166], [362, 200]], w: BW(44) },
  { pts: [[276, 78], [268, 130], [264, 168], [268, 204]], w: BW(42) },
  { pts: [[324, 78], [332, 130], [336, 168], [332, 204]], w: BW(42) },
  { pts: [[296, 74], [294, 120], [292, 160], [286, 196]], w: BW(34) },
  { pts: [[304, 74], [308, 120], [312, 160], [316, 198]], w: BW(34) },
];
const STRANDS = [
  { pts: [[284, 90], [280, 150], [276, 216]], w: [[0, 10], [0.5, 9], [1, 0]] },
  { pts: [[318, 90], [324, 150], [328, 218]], w: [[0, 10], [0.5, 9], [1, 0]] },
];
const SIDE = { pts: [[222, 110], [204, 170], [194, 240], [194, 310], [190, 370], [176, 422]], w: [[0, 40], [0.3, 44], [0.75, 30], [1, 0]] };

const DOME = 'M186 212 C178 120 232 56 300 56 C368 56 422 120 414 212 Z';
const DOME_EDGE = 'M186 212 C178 120 232 56 300 56 C368 56 422 120 414 212';

// highlight streaks (the "angel ring"), each pointing away from the crown
function ring() {
  const xs = [214, 236, 256, 276, 294, 312, 330, 350, 370, 388];
  return `<g fill="#C9D6FF" opacity=".9">${xs.map((x, i) => {
    const u = (x - 300) / 100;
    const y = 112 + 22 * u * u;
    const ang = Math.atan2(y - 40, x - 300);
    const len = i % 2 ? 16 : 24;
    const [dx, dy] = [(Math.cos(ang) * len) / 2, (Math.sin(ang) * len) / 2];
    return `<path d="${lock([[x - dx, y - dy], [x, y], [x + dx, y + dy]], [[0, 0], [0.5, i % 2 ? 4 : 6], [1, 0]], { per: 6 }).d}"/>`;
  }).join('')}</g>`;
}

function hairBack(id) {
  const ln = `stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"`;
  const back = [...BACK, ...BACK_R].map((l) => lock(l.pts, l.w, { per: 6 }));
  const strand = (b, from, to, dx, w) => lock(b.center.filter((_, i) => i > b.center.length * from && i < b.center.length * to && i % 2 === 0).map(([x, y]) => [x + dx, y]), [[0, 0], [0.5, w], [1, 0]], { per: 1 }).d;
  return `<g class="hair-back" clip-path="url(#${id}-backclip)">
    <path d="${lock(BACK_MID.pts, BACK_MID.w).d}" fill="url(#${id}-hairNape)"/>
    ${back.map((b) => `<path d="${b.d}" fill="url(#${id}-hairBack)" ${ln}/>`).join('')}
    <g fill="#A9C8FF" opacity=".55">${back.map((b) => `<path d="${strand(b, 0.3, 0.8, 6, 3)}"/>`).join('')}</g>
    <g fill="${P.line}" opacity=".35">${back.map((b) => `<path d="${strand(b, 0.45, 0.95, -8, 2)}"/>`).join('')}</g>
  </g>`;
}

function hairFront(id) {
  const ln = `stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"`;
  const bangs = BANGS.map((l) => lock(l.pts, l.w, { per: 7 }));
  const strands = STRANDS.map((l) => lock(l.pts, l.w));
  const sides = [lock(SIDE.pts, SIDE.w), lock(mirrorPts(SIDE.pts), SIDE.w)];
  return `<g class="hair-front">
    ${sides.map((s) => `<path d="${s.d}" fill="url(#${id}-hair)" ${ln}/>`).join('')}
    ${bangs.map((b) => `<path d="${b.d}" fill="url(#${id}-hair)"/><path d="${lockLine(b, 0.4, 2.8)}" fill="${P.line}"/>`).join('')}
    ${strands.map((b) => `<path d="${b.d}" fill="url(#${id}-hair)"/><path d="${lockLine(b, 0.5, 1.8)}" fill="${P.line}"/>`).join('')}
    ${ring()}
    <path d="${DOME_EDGE}" fill="none" ${ln} stroke-linecap="round"/>
  </g>`;
}

// forehead shadow cast by the bangs
function bangShadow(id) {
  return `<g clip-path="url(#${id}-face)" fill="${P.skinShade}">${BANGS.map((l) => `<path d="${lock(l.pts, l.w, { per: 5 }).d}" transform="translate(0 7)"/>`).join('')}</g>`;
}

// ================================================================== whale bits

const FIN_L = 'M216 198 C192 186 150 194 124 234 C116 246 110 262 116 270 C130 272 152 262 172 256 C190 250 204 248 216 248 Z';
const FIN_L_BELLY = 'M220 228 C190 232 150 246 108 268 L108 300 L230 300 Z';
const FIN_CREASE = lock([[210, 214], [180, 214], [150, 228], [126, 250]], [[0, 0], [0.3, 2], [1, 0]]).d;

function fins(id) {
  const ln = `stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"`;
  return `<g class="fins">
    <clipPath id="${id}-finL"><path d="${FIN_L}"/></clipPath><clipPath id="${id}-finR"><path d="${mirrorD(FIN_L)}"/></clipPath>
    <path d="${FIN_L}" fill="url(#${id}-fin)"/><path d="${FIN_L_BELLY}" fill="${P.finBelly}" clip-path="url(#${id}-finL)"/>
    <path d="${mirrorD(FIN_L)}" fill="url(#${id}-fin)"/><path d="${mirrorD(FIN_L_BELLY)}" fill="${P.finBelly}" clip-path="url(#${id}-finR)"/>
    <path d="${FIN_CREASE}" fill="${P.line}" opacity=".55"/><path d="${mirrorD(FIN_CREASE)}" fill="${P.line}" opacity=".55"/>
    <path d="${FIN_L}" fill="none" ${ln}/><path d="${mirrorD(FIN_L)}" fill="none" ${ln}/>
  </g>`;
}

// whale fluke seen from behind: two lobes, base at the origin, pointing up
const FLUKE = 'M-5 6 C-7 -4 -16 -14 -32 -20 C-44 -25 -50 -34 -44 -40 C-30 -42 -12 -34 0 -22 C12 -34 30 -42 44 -40 C50 -34 44 -25 32 -20 C16 -14 7 -4 5 6 Z';

function tail(id) {
  const pts = [[372, 540], [424, 578], [456, 628], [472, 680], [490, 716], [514, 726], [530, 708]];
  const body = lock(pts, [[0, 62], [0.35, 48], [0.75, 26], [0.92, 16], [1, 14]], { per: 10 });
  const belly = lock(pts.map(([x, y]) => [x - 7, y + 12]), [[0, 22], [0.5, 16], [0.9, 6], [1, 4]], { per: 10 });
  return `<g class="tail">
    <clipPath id="${id}-tail"><path d="${body.d}"/></clipPath>
    <g transform="translate(531 706) rotate(40)"><path d="${FLUKE}" fill="${P.tail}" stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M-4 -4 C-12 -14 -24 -22 -36 -26 M4 -4 C12 -14 24 -22 36 -26" fill="none" stroke="#5C6BD0" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>
    <path d="${body.d}" fill="${P.tail}" stroke="${P.line}" stroke-width="2.4"/>
    <path d="${belly.d}" fill="${P.tailBelly}" clip-path="url(#${id}-tail)"/>
  </g>`;
}

// the little whale on the apron pocket — the old 大肥鱼 mascot
function whaleIcon(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M10 -14 C8 -20 12 -24 14 -20 C16 -24 22 -22 18 -16 C16 -12 12 -10 10 -14 Z" fill="${P.blue}" stroke="${P.line}" stroke-width="1.5"/>
    <path d="M-14 0 C-14 -10 -6 -15 2 -15 C12 -15 16 -8 16 0 C16 8 8 12 0 12 C-8 12 -14 8 -14 0 Z" fill="${P.blue}" stroke="${P.line}" stroke-width="1.8"/>
    <path d="M-12 4 C-4 2 6 4 12 8 C6 12 -6 12 -12 4 Z" fill="#fff"/>
    <circle cx="-6" cy="-3" r="1.8" fill="${P.line}"/>
    <path d="M-3 -16 q-2 -6 -6 -8 M-3 -16 q2 -7 1 -11 M-3 -16 q4 -4 8 -5" fill="none" stroke="#8CC6FF" stroke-width="1.6" stroke-linecap="round"/>
  </g>`;
}

// ================================================================== body

const TORSO = 'M288 328 C272 332 256 338 246 348 C238 364 240 392 250 420 C254 432 258 442 262 454 L338 454 C342 442 346 432 350 420 C360 392 362 364 354 348 C344 338 328 332 312 328 Z';
const SHIRT = 'M280 334 L320 334 L327 412 L273 412 Z';
const CORSET = 'M252 408 Q276 400 300 410 Q324 400 348 408 L341 456 L259 456 Z';
const SKIRT = 'M262 452 C236 502 196 586 152 686 Q176 700 200 692 Q226 704 250 696 Q275 708 300 700 Q325 708 350 696 Q374 704 400 692 Q424 700 448 686 C404 586 364 502 338 452 Z';
const HEM = [[150, 688], [200, 696], [250, 700], [300, 704], [350, 700], [400, 696], [450, 688]];
const APRON = 'M254 452 L346 452 C368 520 384 580 380 626 C376 664 340 680 300 680 C260 680 224 664 220 626 C216 580 232 520 254 452 Z';
const APRON_EDGE = [[254, 454], [238, 520], [224, 580], [220, 628], [236, 664], [268, 678], [300, 681], [332, 678], [364, 664], [380, 628], [376, 580], [362, 520], [346, 454]];
const SHOE = 'M264 892 C254 896 247 908 248 920 C250 934 264 941 280 939 C295 937 303 928 301 914 C300 903 296 895 290 892 C282 889 270 889 264 892 Z';

function legs(id) {
  const L = [[281, 690], [279, 790], [279, 845], [281, 898]];
  const prof = [[0, 40], [0.45, 30], [0.62, 32], [1, 23]];
  const leg = (pts) => `<path d="${lock(pts, prof).d}" fill="${P.skin}" stroke="${P.skinLine}" stroke-width="2"/>`;
  const sock = (x) => `<path d="${lock([[x, 852], [x + (x < 300 ? 1 : -1), 904]], [[0, 30], [1, 25]]).d}" fill="#fff" stroke="${P.line}" stroke-width="2"/>`;
  return `<g class="legs">
    ${leg(L)}${leg(mirrorPts(L))}
    <path d="M262 700 Q281 730 300 700 L300 690 L262 690 Z M300 700 Q319 730 338 700 L338 690 L300 690 Z" fill="${P.skinShade}"/>
    ${sock(280)}${sock(320)}
    ${ruffle([[260, 858], [280, 863], [300, 858]], { w: 11, size: 8 })}
    ${ruffle([[300, 858], [320, 863], [340, 858]], { w: 11, size: 8 })}
    ${[SHOE, mirrorD(SHOE)].map((d) => `<path d="${d}" fill="url(#${id}-shoe)" stroke="${P.line}" stroke-width="2.4"/>`).join('')}
    <path d="M250 926 C258 938 290 942 300 924 M350 926 C342 938 310 942 300 924" fill="none" stroke="#10163F" stroke-width="3" stroke-linecap="round"/>
    <path d="M262 900 Q281 894 297 901 M338 900 Q319 894 303 901" fill="none" stroke="${P.line}" stroke-width="7" stroke-linecap="round"/>
    <path d="M262 900 Q281 894 297 901 M338 900 Q319 894 303 901" fill="none" stroke="${P.shoe}" stroke-width="3.6" stroke-linecap="round"/>
    <rect x="283" y="892" width="10" height="8" rx="2" fill="${P.gold}" stroke="${P.goldDark}" stroke-width="1.4"/>
    <rect x="307" y="892" width="10" height="8" rx="2" fill="${P.gold}" stroke="${P.goldDark}" stroke-width="1.4"/>
    <path d="M256 914 Q260 906 268 904 M344 914 Q340 906 332 904" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
  </g>`;
}

function skirt(id) {
  const gold = sampleSpline(HEM.map(([x, y]) => [x + (x - 300) * -0.06, y - 22]), 8);
  const fold = (pts, w) => `<path d="${lock(pts, [[0, 0], [0.5, w * 0.65], [1, w]]).d}"/>`;
  return `<g class="skirt">
    ${ruffle(HEM, { w: 20, size: 18, side: -1 })}
    <path d="${SKIRT}" fill="url(#${id}-dress)" stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${smooth(gold)}" fill="none" stroke="${P.gold}" stroke-width="2.4"/>
    <path d="${smooth(gold.map(([x, y]) => [x, y - 9]))}" fill="none" stroke="${P.gold}" stroke-width="1.4"/>
    <g fill="${P.dressShade}" opacity=".55">
      ${fold([[284, 470], [266, 570], [240, 690]], 16)}${fold([[316, 470], [334, 570], [360, 690]], 16)}
      ${fold([[270, 470], [226, 580], [196, 688]], 12)}${fold([[330, 470], [374, 580], [404, 688]], 12)}
    </g>
  </g>`;
}

function torso(id) {
  return `<g class="torso">
    <path d="${TORSO}" fill="url(#${id}-dress)" stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${SHIRT}" fill="#fff" stroke="${P.line}" stroke-width="2"/>
    <path d="M286 340 L284 410 M292 340 L291 410 M308 340 L309 410 M314 340 L316 410" stroke="${P.fold}" stroke-width="1.4"/>
    <g fill="${P.blue}" stroke="${P.line}" stroke-width="1.2"><circle cx="300" cy="362" r="3.4"/><circle cx="300" cy="380" r="3.4"/><circle cx="300" cy="398" r="3.4"/></g>
    ${ruffle([[272, 412], [264, 380], [258, 350]], { w: 11, size: 9 })}
    ${ruffle([[328, 412], [336, 380], [342, 350]], { w: 11, size: 9, side: -1 })}
    <path d="${CORSET}" fill="${P.dress}" stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"/>
    <g fill="${P.gold}" stroke="${P.goldDark}" stroke-width="1.2"><circle cx="287" cy="424" r="4"/><circle cx="313" cy="424" r="4"/><circle cx="287" cy="442" r="4"/><circle cx="313" cy="442" r="4"/></g>
  </g>`;
}

function apron(id) {
  return `<g class="apron">
    ${ruffle(APRON_EDGE, { w: 13, size: 12, side: -1 })}
    <path d="${APRON}" fill="url(#${id}-apron)" stroke="${P.line}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M272 470 C266 540 262 600 258 668 M328 470 C334 540 338 600 342 668 M300 480 L300 676" fill="none" stroke="${P.fold}" stroke-width="1.6" stroke-linecap="round"/>
    ${whaleIcon(344, 640, 0.9)}
  </g>`;
}

function collar() {
  return `<g class="collar">
    <path d="M287 292 L287 334 Q300 340 313 334 L313 292 Z" fill="${P.skin}"/>
    <path d="M287 298 Q300 318 313 298 L313 314 Q300 326 287 314 Z" fill="${P.skinShade}"/>
    ${ruffle([[276, 336], [300, 330], [324, 336]], { w: 10, size: 8 })}
    <path d="M300 342 L278 330 Q272 342 278 356 Z M300 342 L322 330 Q328 342 322 356 Z" fill="${P.blue}" stroke="${P.line}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M296 344 L288 372 L296 368 Z M304 344 L312 372 L304 368 Z" fill="${P.blueDark}" stroke="${P.line}" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="300" cy="343" r="6.5" fill="#6FB6FF" stroke="${P.goldDark}" stroke-width="2.4"/>
    <circle cx="298" cy="341" r="2" fill="#fff"/>
  </g>`;
}

// ------------------------------------------------------------------ arms

// Arm poses for the viewer's left arm; the right arm uses mirrored copies.
// segs: sleeve centre lines (upper arm, forearm); cuff: [x, y, dir]; hand: see hand().
const ARM_L = {
  out: {
    segs: [[[244, 370], [228, 404], [212, 436], [199, 462], [190, 480]]],
    cuff: [192, 480, 116],
    hand: { at: [188, 488], dir: 116, palm: 14, fingers: [13, 15, 14, 11], spread: 4, gap: 5, fw: 6.4, thumb: 70, thumbLen: 10, pw: 20 },
  },
  down: {
    segs: [[[244, 370], [238, 406], [233, 440], [230, 468], [229, 484]]],
    cuff: [229, 486, 94],
    hand: { at: [229, 492], dir: 97, palm: 13, fingers: [12, 14, 13, 10], spread: 3, gap: 4.8, fw: 6.2, thumb: 62, thumbLen: 9, pw: 19 },
  },
  sign: {
    segs: [[[244, 370], [226, 402], [218, 430]], [[218, 428], [222, 450], [234, 464]]],
    cuff: [236, 466, 50],
    hand: { at: [240, 472], dir: -8, palm: 10, fingers: [12, 13, 12, 10], spread: 2, gap: 4.6, fw: 6, thumb: -60, thumbLen: 8, pw: 18 },
  },
  coin: {
    segs: [[[244, 370], [236, 404], [234, 428]], [[234, 430], [252, 384], [270, 338]]],
    cuff: [271, 336, -68],
    hand: { at: [275, 326], dir: -58, palm: 11, fingers: [11, 12, 11, 9], spread: 5, gap: 4.6, fw: 6, thumb: -10, thumbLen: 9, pw: 18 },
    front: true,
  },
};
const ARM_R = {
  wave: {
    segs: [[[356, 370], [378, 398], [396, 410], [414, 396], [428, 366]]],
    cuff: [431, 362, -70],
    hand: { at: [434, 350], dir: -82, palm: 18, fingers: [16, 19, 18, 14], spread: 9, gap: 5.8, fw: 6.8, thumb: -150, thumbLen: 12, pw: 24 },
  },
  chin: {
    segs: [[[356, 370], [366, 404], [368, 430]], [[368, 432], [352, 384], [336, 340]]],
    cuff: [335, 338, -110],
    hand: { at: [331, 327], dir: -118, palm: 12, fingers: [14, 7, 6.5, 5.5], spread: 14, gap: 4.8, fw: 6.2, thumb: -175, thumbLen: 8, pw: 19 },
    front: true,
  },
};
const mirrorArm = (a) => ({
  ...a,
  segs: a.segs.map((s) => mirrorPts(s)),
  cuff: [600 - a.cuff[0], a.cuff[1], 180 - a.cuff[2]],
  hand: { ...a.hand, at: [600 - a.hand.at[0], a.hand.at[1]], dir: 180 - a.hand.dir, thumb: 180 - a.hand.thumb },
});
for (const k of Object.keys(ARM_L)) if (!ARM_R[k]) ARM_R[k] = mirrorArm(ARM_L[k]);

// Chibi hand as round-capped strokes (merged by outlined()).
function hand([x, y], { dir, palm = 14, fingers = [13, 15, 14, 11], spread = 8, gap = 5.2, fw = 6.2, thumb, thumbLen = 10, pw = 19 }) {
  const u = [Math.cos(rad(dir)), Math.sin(rad(dir))];
  const v = [-u[1], u[0]];
  const pe = [x + u[0] * palm, y + u[1] * palm];
  const seg = (a, b, w) => [`M${r(a[0])} ${r(a[1])} L${r(b[0])} ${r(b[1])}`, w];
  const out = [seg([x, y], pe, pw)];
  fingers.forEach((len, i) => {
    const o = (i - (fingers.length - 1) / 2) * gap;
    const a = rad(dir + (i - (fingers.length - 1) / 2) * spread);
    const base = [pe[0] + v[0] * o, pe[1] + v[1] * o];
    out.push(seg(base, [base[0] + Math.cos(a) * len, base[1] + Math.sin(a) * len], fw));
  });
  const side = Math.sign(Math.sin(rad(thumb - dir))) || 1;
  const tb = [x + u[0] * palm * 0.35 + v[0] * pw * 0.42 * side, y + u[1] * palm * 0.35 + v[1] * pw * 0.42 * side];
  out.push(seg(tb, [tb[0] + Math.cos(rad(thumb)) * thumbLen, tb[1] + Math.sin(rad(thumb)) * thumbLen], fw + 0.8));
  return outlined(out, P.skin, 1.8, P.skinLine);
}

function cuff([x, y, dir]) {
  const u = [Math.cos(rad(dir)), Math.sin(rad(dir))], v = [-u[1], u[0]];
  const at = (a, b) => [x + u[0] * a + v[0] * b, y + u[1] * a + v[1] * b];
  const band = lock([at(-15, 0), at(-4, 0)], [[0, 33], [1, 33]], { per: 3 }).d;
  const trim = lock([at(-12, 0), at(-10, 0)], [[0, 33], [1, 33]], { per: 2 }).d;
  return `${ruffle([at(-5, -17), at(-3, 0), at(-5, 17)], { w: 10, size: 7, side: 1 })}
    <path d="${band}" fill="${P.dress}" stroke="${P.line}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="${trim}" fill="${P.gold}"/>`;
}

function sleeves(arms, id) {
  const tube = (pts, i, n) => lock(pts, n === 1 ? [[0, 34], [0.5, 30], [1, 28]] : i === 0 ? [[0, 34], [1, 31]] : [[0, 31], [1, 28]], { per: 10 }).d;
  return arms.map((a) => a.segs.map((s, i) => `<path d="${tube(s, i, a.segs.length)}" fill="url(#${id}-dress)" stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"/>`).join('')).join('');
}

function puff(id, cx, cy, rot) {
  const d = 'M-20 -6 C-20 -26 20 -30 22 -4 C24 16 10 28 -2 28 C-16 28 -20 12 -20 -6 Z';
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">
      <path d="${d}" fill="url(#${id}-puff)" stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M-8 -18 C-4 -4 -4 10 -8 22 M6 -20 C10 -6 10 8 6 22" fill="none" stroke="${P.dressShade}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <path d="M-12 -14 C-8 -20 0 -22 8 -20" fill="none" stroke="#5E70D0" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    </g>`;
}

// ================================================================== head accessories

function headAccessories(id) {
  const band = [[206, 150], [230, 112], [264, 92], [300, 86], [336, 92], [370, 112], [394, 150]];
  return `
  <g class="headband">
    ${ruffle(band, { w: 18, size: 13 })}
    <path d="${smooth(band)}" fill="none" stroke="${P.line}" stroke-width="9" stroke-linecap="round"/>
    <path d="${smooth(band)}" fill="none" stroke="${P.dress}" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g class="bow" transform="translate(388 128) rotate(18)">
    <path d="M0 0 C-10 -20 -34 -22 -32 -4 C-30 10 -10 8 0 0 Z M0 0 C10 -20 34 -22 32 -4 C30 10 10 8 0 0 Z" fill="${P.blue}" stroke="${P.line}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M-2 2 L-12 26 L-4 22 L0 28 Z M2 2 L12 26 L4 22 L0 28 Z" fill="${P.blueDark}" stroke="${P.line}" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="0" cy="0" rx="7" ry="8" fill="${P.blue}" stroke="${P.line}" stroke-width="2"/>
    <path d="M-24 -8 Q-18 -14 -10 -10 M24 -8 Q18 -14 10 -10" fill="none" stroke="#9FB4FF" stroke-width="2" stroke-linecap="round"/>
  </g>
  <g class="ahoge">
    <path d="${lock([[300, 66], [295, 46], [300, 30], [311, 22]], [[0, 7], [0.6, 5], [1, 3.5]]).d}" fill="url(#${id}-hair)" stroke="${P.line}" stroke-width="2"/>
    <g transform="translate(312 22) rotate(62) scale(.42)"><path d="${FLUKE}" fill="${P.hair}" stroke="${P.line}" stroke-width="4.8" stroke-linejoin="round"/></g>
  </g>
  <g class="pin" transform="translate(222 152) rotate(-24)">
    <rect x="-17" y="-9" width="34" height="18" rx="6" fill="${P.gold}" stroke="${P.goldDark}" stroke-width="2"/>
    <path d="M-10 5 V-5 H-4 Q0 -5 0 -1.5 Q0 2 -4 2 H-10 M-4 2 L0 5 M4 -3 L7 -5 V5" fill="none" stroke="${P.line}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

// ================================================================== effects

function fxSparkles() {
  return sparkle(120, 118, 13) + sparkle(96, 160, 7) + sparkle(486, 118, 11) + sparkle(512, 160, 6);
}

function fxHearts() {
  const heart = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6 C-10 -2 -12 -10 -6 -13 C-2 -15 0 -12 0 -10 C0 -12 2 -15 6 -13 C12 -10 10 -2 0 6 Z" fill="#FF7FA0" stroke="${P.line}" stroke-width="1.6"/>`;
  return heart(150, 70, 1.3) + heart(470, 64, 1.1) + heart(500, 100, 0.8);
}

function fxThought(labels) {
  const cloud = [[64, 76, 30], [104, 60, 36], [150, 58, 34], [192, 70, 30], [86, 102, 26], [134, 106, 28], [178, 100, 26]];
  const shapes = cloud.map(([x, y, rr]) => [`M${x} ${y} h0.01`, rr * 2]);
  return `<g class="thought">
    ${outlined(shapes, '#fff', 3)}
    ${outlined([['M176 140 h0.01', 18], ['M196 164 h0.01', 11]], '#fff', 2.6)}
    ${labels ? `<text x="130" y="92" text-anchor="middle" font-family="${FONT}" font-size="21" fill="${P.line}">嗯，用户说……</text>` : `<g fill="${P.blue}"><circle cx="104" cy="84" r="7"/><circle cx="130" cy="84" r="7" opacity=".7"/><circle cx="156" cy="84" r="7" opacity=".4"/></g>`}
  </g>
  ${labels ? `<g class="deepthink" transform="translate(336 30)">
    <rect x="0" y="0" width="228" height="36" rx="18" fill="#EEF1FB" stroke="#C9D1EE" stroke-width="1.6"/>
    <g transform="translate(21 18)" fill="none" stroke="${P.blue}" stroke-width="2"><ellipse rx="9" ry="3.6"/><ellipse rx="9" ry="3.6" transform="rotate(60)"/><ellipse rx="9" ry="3.6" transform="rotate(-60)"/></g>
    <text x="37" y="23.5" font-family="${FONT}" font-size="14" fill="#5C6394">已深度思考（用时 32 秒）</text>
  </g>` : ''}`;
}

function fxSign(labels) {
  return `<g class="sign">
    <rect x="210" y="390" width="180" height="88" rx="14" fill="#fff" stroke="${P.line}" stroke-width="3"/>
    <rect x="218" y="398" width="164" height="72" rx="9" fill="none" stroke="${P.blue}" stroke-width="2" stroke-dasharray="7 5"/>
    ${labels ? `<text x="300" y="433" text-anchor="middle" font-family="${FONT}" font-size="27" fill="${P.line}">服务器繁忙</text>
    <text x="300" y="458" text-anchor="middle" font-family="${FONT}" font-size="16" fill="#5C6394">请稍后再试。</text>` : `<path d="M280 424 h40 M270 446 h60" stroke="${P.line}" stroke-width="6" stroke-linecap="round"/>`}
  </g>`;
}

function fxSweat(x, y, s = 1) {
  const d = `M${x} ${y} C${x + 8 * s} ${y + 11 * s} ${x + 12 * s} ${y + 18 * s} ${x + 12 * s} ${y + 24 * s} C${x + 12 * s} ${y + 31 * s} ${x + 6 * s} ${y + 36 * s} ${x} ${y + 36 * s} C${x - 6 * s} ${y + 36 * s} ${x - 12 * s} ${y + 31 * s} ${x - 12 * s} ${y + 24 * s} C${x - 12 * s} ${y + 18 * s} ${x - 8 * s} ${y + 11 * s} ${x} ${y} Z`;
  return `<path d="${d}" fill="${P.water}" stroke="${P.line}" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="${x - 4 * s}" cy="${y + 24 * s}" rx="${2.4 * s}" ry="${4.5 * s}" fill="#fff"/>`;
}

function fxSteam() {
  const puffs = [[140, 84, 16], [160, 70, 20], [180, 84, 14], [440, 74, 14], [456, 60, 18], [474, 74, 12]].map(([x, y, rr]) => [`M${x} ${y} h0.01`, rr * 2]);
  return outlined(puffs, '#EEF1FF', 2.4) + `<path d="M160 46 q-5 -6 0 -12 q5 -6 0 -12 M456 38 q-5 -6 0 -12 q5 -6 0 -12" fill="none" stroke="${P.line}" stroke-width="3" stroke-linecap="round"/>`;
}

function fxBang(labels) {
  return `<g stroke="${P.line}" stroke-linecap="round">
      <path d="M468 44 L462 96" stroke-width="20"/><path d="M468 44 L462 96" stroke="#FF6B6B" stroke-width="10"/>
    </g>
    <circle cx="460" cy="118" r="8" fill="#FF6B6B" stroke="${P.line}" stroke-width="4"/>
    <path d="M430 60 L416 46 M424 86 L404 84 M498 62 L512 50" stroke="${P.line}" stroke-width="4" stroke-linecap="round"/>
    ${labels ? `<text x="112" y="104" font-family="${FONT}" font-size="30" fill="${P.line}" transform="rotate(-8 112 104)">等等，</text>` : ''}`;
}

function fxZzz() {
  const z = (x, y, s, w) => {
    const d = `M${x} ${y} h${s} l${-s} ${s} h${s}`;
    return `<path d="${d}" stroke="${P.line}" stroke-width="${w + 6}"/><path d="${d}" stroke="#E3E9FF" stroke-width="${w}"/>`;
  };
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${z(420, 118, 24, 6) + z(458, 74, 18, 5) + z(494, 40, 13, 4)}</g>`;
}

function fxSnotBubble() {
  return `<circle cx="322" cy="262" r="12" fill="#DDF2FF" fill-opacity=".85" stroke="${P.line}" stroke-width="2.4"/>
    <ellipse cx="318" cy="257" rx="3.5" ry="2.4" transform="rotate(-30 318 257)" fill="#fff"/>`;
}

function fxCoin(id) {
  const [x, y] = [300, 300];
  return `<g class="coin">
    <mask id="${id}-bite" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="1000">
      <rect width="600" height="1000" fill="#fff"/><circle cx="${x + 6}" cy="${y - 23}" r="9" fill="#000"/><circle cx="${x - 9}" cy="${y - 22}" r="7" fill="#000"/>
    </mask>
    <g mask="url(#${id}-bite)">
      <circle cx="${x}" cy="${y}" r="22" fill="${P.gold}" stroke="${P.line}" stroke-width="2.6"/>
      <circle cx="${x}" cy="${y}" r="15" fill="none" stroke="${P.goldDark}" stroke-width="2.4"/>
      <path d="M${x - 7} ${y - 6} H${x + 7} M${x} ${y - 6} V${y + 8}" stroke="${P.goldDark}" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g fill="${P.gold}" stroke="${P.line}" stroke-width="1.6"><circle cx="332" cy="270" r="3.2"/><circle cx="340" cy="284" r="2.4"/><circle cx="264" cy="276" r="2.6"/></g>
  </g>
  ${sparkle(356, 300, 9)}${sparkle(244, 312, 7)}`;
}

// ================================================================== assemble

export function characterSVG({ expression = 'hello', id = 'ss', size = null, labels = true, crop = 'full' } = {}) {
  const e = EXPRESSIONS[expression] || EXPRESSIONS.hello;
  const fx = new Set(e.fx || []);
  const [armL, armR] = [ARM_L[e.arms[0]], ARM_R[e.arms[1]]];
  const arms = [armL, armR];
  const back = arms.filter((a) => !a.front);
  const front = arms.filter((a) => a.front);
  const hands = (list) => list.map((a) => hand(a.hand.at, a.hand) + cuff(a.cuff)).join('');
  const tilt = e.tilt ? `transform="rotate(${e.tilt} 300 316)"` : '';
  const box = crop === 'bust' ? [30, 10, 540, 540] : [0, 0, 600, 1000];
  const w = size ?? box[2], h = (w * box[3]) / box[2];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" width="${r(w)}" height="${r(h)}">
  <defs>
    <linearGradient id="${id}-iris" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.iris1}"/><stop offset=".45" stop-color="${P.iris2}"/><stop offset=".78" stop-color="${P.iris3}"/><stop offset="1" stop-color="${P.iris4}"/>
    </linearGradient>
    <linearGradient id="${id}-hairBack" gradientUnits="userSpaceOnUse" x1="0" y1="80" x2="0" y2="700">
      <stop offset="0" stop-color="#2B3AA6"/><stop offset=".35" stop-color="#3F57DE"/><stop offset=".75" stop-color="#6A95FF"/><stop offset="1" stop-color="${P.hairTip}"/>
    </linearGradient>
    <linearGradient id="${id}-hairNape" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="620">
      <stop offset="0" stop-color="#1F2B85"/><stop offset=".6" stop-color="#3552C8"/><stop offset="1" stop-color="#6A95FF"/>
    </linearGradient>
    <linearGradient id="${id}-hair" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="430">
      <stop offset="0" stop-color="#3950D6"/><stop offset=".45" stop-color="${P.hair}"/><stop offset="1" stop-color="#7EAEFF"/>
    </linearGradient>
    <linearGradient id="${id}-dress" gradientUnits="userSpaceOnUse" x1="0" y1="330" x2="0" y2="700">
      <stop offset="0" stop-color="${P.dressHi}"/><stop offset=".4" stop-color="${P.dress}"/><stop offset="1" stop-color="${P.dressShade}"/>
    </linearGradient>
    <linearGradient id="${id}-puff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3D4FB8"/><stop offset="1" stop-color="${P.dress}"/></linearGradient>
    <linearGradient id="${id}-shoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A479F"/><stop offset="1" stop-color="${P.shoe}"/></linearGradient>
    <linearGradient id="${id}-apron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${P.whiteShade}"/></linearGradient>
    <linearGradient id="${id}-fin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4456C8"/><stop offset="1" stop-color="${P.fin}"/></linearGradient>
    <clipPath id="${id}-face"><path d="${FACE}"/></clipPath>
    <clipPath id="${id}-backclip"><path d="M186 212 C178 120 232 56 300 56 C368 56 422 120 414 212 L600 212 L600 1000 L0 1000 L0 212 Z"/></clipPath>
    <filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  ${hairBack(id)}
  ${tail(id)}
  ${legs(id)}
  ${skirt(id)}
  <g class="outfit">
    ${torso(id)}
    ${apron(id)}
    <g class="arms">${sleeves(arms, id)}</g>
    ${fx.has('sign') ? fxSign(labels) : ''}
    <g class="hands">${hands(back)}</g>
    <g class="puffs">${puff(id, 250, 360, -20)}${puff(id, 350, 360, 20)}</g>
    ${collar()}
  </g>
  <g class="head" ${tilt}>
    ${fins(id)}
    <path d="${DOME}" fill="url(#${id}-hair)"/>
    <path d="${FACE}" fill="${P.skin}" stroke="${P.skinLine}" stroke-width="2.2"/>
    ${bangShadow(id)}
    <g class="face">${face(id, e)}</g>
    ${hairFront(id)}
    ${brows(e.brows)}
    ${headAccessories(id)}
    ${fx.has('zzz') ? fxSnotBubble() : ''}
  </g>
  ${fx.has('coin') ? fxCoin(id) : ''}
  <g class="hands-front">${hands(front)}</g>
  <g class="fx">
    ${fx.has('sparkles') ? fxSparkles() : ''}
    ${fx.has('hearts') ? fxHearts() : ''}
    ${fx.has('thought') ? fxThought(labels) : ''}
    ${fx.has('sweat') ? fxSweat(404, 172, 1) + (expression === 'busy' ? fxSweat(178, 190, 0.8) : '') : ''}
    ${fx.has('steam') ? fxSteam() : ''}
    ${fx.has('bang') ? fxBang(labels) : ''}
    ${fx.has('zzz') ? fxZzz() : ''}
    ${fx.has('dots') ? `<g fill="${P.line}"><circle cx="440" cy="120" r="4.5"/><circle cx="458" cy="120" r="4.5"/><circle cx="476" cy="120" r="4.5"/></g>` : ''}
  </g>
</svg>`;
}
