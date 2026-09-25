// Character sheet (角色设定图) for 深深, laid out as an 1800x1280 HTML page.
import { characterSVG, EXPRESSIONS, PALETTE } from './shenshen.js';

const PROFILE = [
  ['名字', '深深（DeepSeek 娘）'],
  ['外号', '大肥鱼（本人坚决不认）'],
  ['物种', '鲸鱼娘 · 体重 671B'],
  ['干活', 'MoE，每次只用 37B 的力气'],
  ['出身', '杭州 · 深度求索'],
  ['生日', '1 月 20 日（R1 发布日）'],
  ['口头禅', '「嗯，用户说……」'],
  ['记性', '128K 上下文，记仇也记得清'],
  ['爱好', '开源（MIT 协议）、便宜大碗'],
  ['弱点', '人一多就「服务器繁忙」'],
];

const NOTES = [
  ['鲸鳍耳朵 + 鲸鱼尾巴', '蓝鲸拟人'],
  ['鲸尾呆毛', '头顶翘着一条小尾巴'],
  ['「R1」发卡', '推理模型的名字'],
  ['围裙上的小鲸鱼', '初代大肥鱼彩蛋'],
];

const SWATCHES = [
  ['DS 蓝', PALETTE.blue],
  ['发色', PALETTE.hair],
  ['发梢', PALETTE.hairTip],
  ['瞳色', PALETTE.iris2],
  ['女仆装', PALETTE.dress],
  ['围裙', PALETTE.white],
  ['金饰', PALETTE.gold],
];

const GRID = ['idle', 'think', 'busy', 'happy', 'aha', 'eat', 'sleep', 'sideeye'];

const BUBBLES = [
  [62, 420, 20], [96, 372, 10], [640, 520, 16], [664, 474, 8], [630, 860, 12], [52, 760, 14], [80, 700, 7], [652, 300, 9],
];

function sparkle(x, y, s, fill) {
  const k = s * 0.26;
  return `<path d="M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z" fill="${fill}"/>`;
}

function heroDecor() {
  const p = PALETTE;
  const bubbles = BUBBLES.map(([x, y, rr]) => `
    <circle cx="${x}" cy="${y}" r="${rr}" fill="#fff" fill-opacity=".45" stroke="${p.line}" stroke-opacity=".3" stroke-width="2.5"/>
    <circle cx="${x - rr * 0.35}" cy="${y - rr * 0.35}" r="${Math.max(2, rr * 0.22)}" fill="#fff"/>`).join('');
  const rays = [-28, -14, 0, 14, 28].map((a) => `<path d="M350 -40 L${350 + Math.tan((a - 5) * Math.PI / 180) * 900} 860 L${350 + Math.tan((a + 5) * Math.PI / 180) * 900} 860 Z" fill="#fff" opacity=".22"/>`).join('');
  return `<svg class="decor" viewBox="0 0 700 1200" width="700" height="1200">
    ${rays}
    ${bubbles}
    ${sparkle(610, 210, 15, p.gold)}${sparkle(574, 176, 7, p.gold)}${sparkle(84, 560, 9, '#fff')}
    <path d="M0 980 C80 950 160 950 240 980 S400 1010 480 980 S620 950 700 975 V1200 H0 Z" fill="#fff" opacity=".35"/>
    <path d="M0 1030 C90 1005 170 1010 250 1035 S420 1065 510 1035 S640 1005 700 1025 V1200 H0 Z" fill="#fff" opacity=".55"/>
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
      <div class="pic">${characterSVG({ expression: key, id: `g-${key}`, size: 226, crop: 'bust' })}</div>
      <div class="label"><span>${e.name}</span><small>${key}</small></div>
      <div class="quote">${e.line}</div>
    </div>`;
  }).join('');

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>深深 · 角色设定</title>
<style>
${fontCSS}
:root { --blue: ${p.blue}; --line: ${p.line}; --ink: ${p.line}; --muted: #5C6394; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1800px; height: 1280px; overflow: hidden; color: var(--ink);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'WenQuanYi Zen Hei', sans-serif;
  background: #F3F5FF radial-gradient(#D6DDFB 1.6px, transparent 1.6px) 0 0 / 26px 26px;
}
.cute { font-family: 'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif; font-weight: 400; }
.sheet { display: flex; gap: 40px; padding: 40px; height: 1280px; }

/* ---------- hero 立绘 */
.hero {
  position: relative; flex: none; width: 700px; height: 1200px; border-radius: 44px; overflow: hidden;
  background:
    radial-gradient(circle at 52% 40%, rgba(255,255,255,.9) 0, rgba(255,255,255,0) 42%),
    linear-gradient(172deg, #EEF2FF 0%, #D8E0FF 55%, #B4C3FF 100%);
  box-shadow: 0 24px 60px rgba(35,53,166,.20), inset 0 0 0 4px rgba(255,255,255,.7);
}
.hero .decor { position: absolute; inset: 0; }
.hero .girl { position: absolute; left: 36px; top: 116px; }
.hero .tag {
  position: absolute; right: 34px; top: 38px; display: flex; gap: 10px; align-items: center;
  font-size: 18px; font-weight: 700; letter-spacing: 1px; color: var(--line);
}
.hero .tag b { background: var(--line); color: #fff; padding: 6px 14px; border-radius: 999px; }
.hero .tag span { background: #fff; padding: 6px 14px; border-radius: 999px; box-shadow: 0 4px 12px rgba(35,53,166,.12); }
.say {
  position: absolute; left: 34px; top: 34px; padding: 16px 26px; background: #fff; border-radius: 28px;
  border: 5px solid var(--line); font-size: 30px; line-height: 1.3; color: var(--ink);
  box-shadow: 0 8px 0 rgba(35,53,166,.12);
}
.say .tip { position: absolute; left: 240px; bottom: -39px; }
.say em { font-style: normal; color: var(--blue); }
.name { position: absolute; left: 44px; bottom: 52px; }
.name h1 {
  font-size: 118px; line-height: 1; color: var(--blue); letter-spacing: 4px;
  -webkit-text-stroke: 10px #fff; paint-order: stroke fill; text-shadow: 0 10px 0 rgba(35,53,166,.18);
}
.name p { margin-top: 12px; font-size: 18px; font-weight: 700; letter-spacing: 5px; color: var(--line); }
.name p i { font-style: normal; background: var(--line); color: #fff; padding: 2px 10px; border-radius: 6px; letter-spacing: 2px; margin-left: 6px; }

/* ---------- right column */
.side { flex: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.head { display: flex; align-items: flex-end; gap: 18px; padding: 4px 4px 0; }
.head h2 { font-size: 60px; line-height: 1; color: var(--line); }
.head p { font-size: 16px; font-weight: 700; letter-spacing: 5px; color: var(--muted); padding-bottom: 8px; }
.head .ver { margin-left: auto; font-size: 15px; color: var(--muted); padding-bottom: 8px; }
.panel { background: #fff; border-radius: 28px; padding: 20px 28px; box-shadow: 0 10px 30px rgba(35,53,166,.10); }
.panel h3 { font-size: 26px; color: var(--line); margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
.panel h3::before { content: ''; width: 10px; height: 26px; border-radius: 5px; background: var(--blue); }
.profile { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; }
.row { display: flex; align-items: center; gap: 14px; font-size: 18.5px; }
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
.card .pic { height: 226px; display: grid; place-items: center; background: linear-gradient(180deg, #F4F6FF, #DCE3FF); }
.card .pic svg { display: block; }
.card .label { display: flex; align-items: baseline; gap: 8px; padding: 12px 18px 2px; }
.card .label span { font-family: 'ZCOOL KuaiLe', sans-serif; font-size: 26px; color: var(--line); }
.card .label small { font-size: 13px; color: var(--muted); letter-spacing: 1px; }
.card .quote { padding: 0 18px 16px; font-size: 14px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style></head>
<body><div class="sheet">
  <section class="hero" id="hero">
    ${heroDecor()}
    <div class="girl">${characterSVG({ expression: 'hello', id: 'hero', size: 628, labels: false })}</div>
    <div class="tag"><b>No.001</b><span>DeepSeek 娘</span></div>
    <div class="say cute">我是 <em>DeepSeek</em>，<br>很高兴见到你！<svg class="tip" width="60" height="44" viewBox="0 0 60 44"><path d="M2 0 L40 44 L50 0" fill="#fff" stroke="${p.line}" stroke-width="5" stroke-linejoin="round"/><rect x="0" y="0" width="60" height="4" fill="#fff"/></svg></div>
    <div class="name"><h1 class="cute">深深</h1><p>DEEPSEEK 娘<i>外号 大肥鱼</i></p></div>
  </section>
  <section class="side">
    <div class="head"><h2 class="cute">角色设定</h2><p>CHARACTER SHEET</p><span class="ver">立绘 v0.2 · 表情差分 ×9</span></div>
    <div class="panel"><h3 class="cute">基础档案</h3><div class="profile">${profile}</div></div>
    <div class="duo">
      <div class="panel notes"><h3 class="cute">设计要点</h3><ul>${notes}</ul></div>
      <div class="panel palette"><h3 class="cute">配色</h3><div class="swatches">${swatches}</div></div>
    </div>
    <div class="grid">${cards}</div>
  </section>
</div></body></html>`;
}
