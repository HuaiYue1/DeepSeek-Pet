// Character sheet (角色设定图) for 大肥鱼, laid out as a 1800x1200 HTML page.
import { fatFishSVG, EXPRESSIONS, PALETTE } from './fatfish.js';

const PROFILE = [
  ['名字', '大肥鱼'],
  ['物种', '鲸鱼（但坚持说自己是鱼）'],
  ['代表色', '深度求索蓝 #4D6BFE'],
  ['性格', '好奇、话痨，凡事先深度思考'],
  ['口头禅', '「嗯，让我想想……」'],
  ['爱吃', 'Token，按个数吃，不按斤'],
  ['特技', '喷水、深度思考、长上下文'],
  ['弱点', '服务器一繁忙就头晕'],
];

const NOTES = [
  ['圆滚滚的身体', '大肥鱼，名副其实'],
  ['翘起的双叶尾巴', '来自 logo 的鲸尾'],
  ['白色月牙肚皮', '来自 logo 的白色弧线'],
  ['斜眼差分', 'logo 同款眼神'],
];

const SWATCHES = [
  ['主体蓝', PALETTE.blue],
  ['高光', PALETTE.blueLight],
  ['暗部', PALETTE.blueDark],
  ['描边', PALETTE.line],
  ['肚皮', PALETTE.belly],
  ['腮红', PALETTE.blush],
  ['Token', PALETTE.gold],
];

const GRID = ['idle', 'happy', 'think', 'busy', 'sleep', 'sideeye', 'surprised', 'eat'];

const BUBBLES = [
  [70, 330, 22], [112, 270, 12], [610, 420, 18], [640, 372, 9], [590, 720, 14], [80, 690, 16], [52, 640, 8], [636, 250, 7],
];

function sparkle(x, y, s, fill) {
  const k = s * 0.26;
  return `<path d="M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z" fill="${fill}"/>`;
}

function heroDecor() {
  const p = PALETTE;
  const bubbles = BUBBLES.map(([x, y, r]) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".45" stroke="${p.line}" stroke-opacity=".35" stroke-width="3"/>
    <circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${Math.max(2, r * 0.22)}" fill="#fff"/>`).join('');
  return `<svg class="decor" viewBox="0 0 700 1120" width="700" height="1120">
    ${bubbles}
    ${sparkle(600, 190, 16, p.gold)}${sparkle(560, 150, 8, p.gold)}${sparkle(90, 820, 10, '#fff')}
    <path d="M0 900 C80 870 160 870 240 900 S400 930 480 900 S620 870 700 895 V1120 H0 Z" fill="#fff" opacity=".35"/>
    <path d="M0 950 C90 925 170 930 250 955 S420 985 510 955 S640 925 700 945 V1120 H0 Z" fill="#fff" opacity=".55"/>
  </svg>`;
}

export function characterSheetHTML({ fontCSS = '' } = {}) {
  const p = PALETTE;
  const profile = PROFILE.map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
  const notes = NOTES.map(([k, v], i) => `<li><b>${i + 1}</b><div><span>${k}</span><em>${v}</em></div></li>`).join('');
  const swatches = SWATCHES.map(([k, c]) => `<div class="sw"><i style="background:${c}"></i><span>${k}</span><code>${c}</code></div>`).join('');
  const cards = GRID.map((key) => {
    const e = EXPRESSIONS[key];
    return `<div class="card">
      <div class="pic">${fatFishSVG({ expression: key, id: `g-${key}`, size: 186 })}</div>
      <div class="label"><span>${e.name}</span><small>${key}</small></div>
      <div class="quote">${e.line}</div>
    </div>`;
  }).join('');

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>大肥鱼 · 角色设定</title>
<style>
${fontCSS}
:root { --blue: ${p.blue}; --line: ${p.line}; --ink: ${p.eye}; --muted: #5C6394; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1800px; height: 1200px; overflow: hidden; color: var(--ink);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'WenQuanYi Zen Hei', sans-serif;
  background: #F3F5FF radial-gradient(#D6DDFB 1.6px, transparent 1.6px) 0 0 / 26px 26px;
}
.cute { font-family: 'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif; font-weight: 400; }
.sheet { display: flex; gap: 40px; padding: 40px; height: 1200px; }

/* ---------- hero 立绘 */
.hero {
  position: relative; flex: none; width: 700px; height: 1120px; border-radius: 44px; overflow: hidden;
  background:
    radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0, rgba(255,255,255,0) 44%),
    linear-gradient(172deg, #EEF2FF 0%, #D8E0FF 55%, #B8C6FF 100%);
  box-shadow: 0 24px 60px rgba(35,53,166,.20), inset 0 0 0 4px rgba(255,255,255,.7);
}
.hero .decor { position: absolute; inset: 0; }
.hero .fish { position: absolute; left: 30px; top: 232px; }
.hero .tag {
  position: absolute; right: 36px; top: 40px; display: flex; gap: 10px; align-items: center;
  font-size: 18px; font-weight: 700; letter-spacing: 1px; color: var(--line);
}
.hero .tag b { background: var(--line); color: #fff; padding: 6px 14px; border-radius: 999px; }
.hero .tag span { background: #fff; padding: 6px 14px; border-radius: 999px; box-shadow: 0 4px 12px rgba(35,53,166,.12); }
.say {
  position: absolute; left: 44px; top: 128px; padding: 22px 30px; background: #fff; border-radius: 30px;
  border: 5px solid var(--line); font-size: 36px; line-height: 1.3; color: var(--ink);
  box-shadow: 0 10px 0 rgba(35,53,166,.12);
}
.say .tip { position: absolute; left: 96px; bottom: -41px; }
.say em { font-style: normal; color: var(--blue); }
.name { position: absolute; left: 0; right: 0; bottom: 58px; text-align: center; }
.name h1 {
  font-size: 132px; line-height: 1; color: var(--blue); letter-spacing: 6px;
  -webkit-text-stroke: 10px #fff; paint-order: stroke fill;
  text-shadow: 0 10px 0 rgba(35,53,166,.18);
}
.name p { margin-top: 14px; font-size: 20px; font-weight: 700; letter-spacing: 8px; color: var(--line); }

/* ---------- right column */
.side { flex: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.head { display: flex; align-items: flex-end; gap: 18px; padding: 4px 4px 0; }
.head h2 { font-size: 60px; line-height: 1; color: var(--line); }
.head p { font-size: 16px; font-weight: 700; letter-spacing: 5px; color: var(--muted); padding-bottom: 8px; }
.head .ver { margin-left: auto; font-size: 15px; color: var(--muted); padding-bottom: 8px; }
.panel { background: #fff; border-radius: 28px; padding: 20px 28px; box-shadow: 0 10px 30px rgba(35,53,166,.10); }
.panel h3 { font-size: 26px; color: var(--line); margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
.panel h3::before { content: ''; width: 10px; height: 26px; border-radius: 5px; background: var(--blue); }
.profile { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 34px; }
.row { display: flex; align-items: center; gap: 14px; font-size: 19px; }
.row .k {
  flex: none; width: 76px; text-align: center; padding: 4px 0; border-radius: 999px;
  background: #E8EDFF; color: var(--line); font-weight: 700; font-size: 16px;
}
.duo { display: flex; gap: 22px; }
.notes { flex: 1.25; }
.notes ul { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.notes li { display: flex; align-items: center; gap: 12px; font-size: 17px; }
.notes li b {
  flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--blue); color: #fff;
  display: grid; place-items: center; font-size: 15px;
}
.notes li div { display: flex; flex-direction: column; line-height: 1.35; }
.notes li span { font-weight: 700; }
.notes li em { font-style: normal; color: var(--muted); font-size: 14.5px; }
.palette { flex: 1; }
.swatches { display: flex; gap: 10px; }
.sw { display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: 13px; }
.sw i { width: 46px; height: 46px; border-radius: 14px; border: 3px solid #E3E7F7; }
.sw code { font-family: 'DejaVu Sans Mono', monospace; font-size: 10.5px; color: var(--muted); }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.card { background: #fff; border-radius: 26px; overflow: hidden; box-shadow: 0 10px 30px rgba(35,53,166,.10); }
.card .pic { height: 186px; display: grid; place-items: center; background: linear-gradient(180deg, #F4F6FF, #E4E9FF); }
.card .label { display: flex; align-items: baseline; gap: 8px; padding: 12px 18px 2px; }
.card .label span { font-family: 'ZCOOL KuaiLe', sans-serif; font-size: 27px; color: var(--line); }
.card .label small { font-size: 13px; color: var(--muted); letter-spacing: 1px; }
.card .quote { padding: 0 18px 16px; font-size: 14.5px; color: var(--muted); white-space: nowrap; }
</style></head>
<body><div class="sheet">
  <section class="hero" id="hero">
    ${heroDecor()}
    <div class="tag"><b>No.001</b><span>DeepSeek 桌宠</span></div>
    <div class="say cute">你好呀！我是<em>大肥鱼</em>～<svg class="tip" width="60" height="44" viewBox="0 0 60 44"><path d="M2 0 L40 44 L50 0" fill="#fff" stroke="${p.line}" stroke-width="5" stroke-linejoin="round"/><rect x="0" y="0" width="60" height="4" fill="#fff"/></svg></div>
    <div class="fish">${fatFishSVG({ expression: 'hello', id: 'hero', size: 640 })}</div>
    <div class="name"><h1 class="cute">大肥鱼</h1><p>DEEPSEEK · FAT FISH</p></div>
  </section>
  <section class="side">
    <div class="head"><h2 class="cute">角色设定</h2><p>CHARACTER SHEET</p><span class="ver">立绘 v0.1 · 表情差分 ×8</span></div>
    <div class="panel"><h3 class="cute">基础档案</h3><div class="profile">${profile}</div></div>
    <div class="duo">
      <div class="panel notes"><h3 class="cute">设计要点</h3><ul>${notes}</ul></div>
      <div class="panel palette"><h3 class="cute">配色</h3><div class="swatches">${swatches}</div></div>
    </div>
    <div class="grid">${cards}</div>
  </section>
</div></body></html>`;
}
