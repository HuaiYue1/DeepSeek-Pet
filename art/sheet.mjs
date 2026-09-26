// Character sheet (角色设定图) for DeepSeek-Pet, laid out as an 1800x1200 HTML page.
// `sprite(key)` gives the URL of a state's PNG.
import { STATES } from './states.mjs';

const PROFILE = [
  ['名字', 'DeepSeek-Pet（DeepSeek 娘）'],
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

const MEMES = [
  ['服务器繁忙，请稍后再试。', '举牌'],
  ['嗯，用户说……', '思考泡泡'],
  ['已深度思考（用时 32 秒）', '思考中'],
  ['等等，我好像悟了', 'aha moment'],
  ['Token 便宜又大碗', '吃 Token'],
  ['夜间错峰优惠', '睡觉'],
];

const GRID = ['idle', 'think', 'busy', 'happy', 'aha', 'eat', 'sleep'];

function sparkle(x, y, s, fill) {
  const k = s * 0.26;
  return `<path d="M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z" fill="${fill}"/>`;
}

function heroDecor() {
  const bubbles = [[54, 470, 18], [86, 424, 9], [500, 560, 15], [522, 516, 7], [490, 860, 11], [44, 780, 13], [70, 722, 6], [516, 340, 8]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".5" stroke="#1B2266" stroke-opacity=".25" stroke-width="2.5"/>
      <circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${Math.max(2, r * 0.22)}" fill="#fff"/>`).join('');
  const rays = [-26, -13, 0, 13, 26].map((a) => `<path d="M280 -40 L${280 + Math.tan(((a - 5) * Math.PI) / 180) * 900} 860 L${280 + Math.tan(((a + 5) * Math.PI) / 180) * 900} 860 Z" fill="#fff" opacity=".22"/>`).join('');
  return `<svg class="decor" viewBox="0 0 560 1120" width="560" height="1120">
    ${rays}${bubbles}
    ${sparkle(480, 250, 14, '#E8BC5E')}${sparkle(452, 218, 7, '#E8BC5E')}${sparkle(70, 600, 9, '#fff')}
    <path d="M0 930 C70 902 140 902 210 930 S350 958 420 930 S520 905 560 922 V1120 H0 Z" fill="#fff" opacity=".35"/>
    <path d="M0 972 C80 950 150 954 220 976 S370 1004 450 978 S530 956 560 968 V1120 H0 Z" fill="#fff" opacity=".55"/>
  </svg>`;
}

export function characterSheetHTML({ fontCSS = '', sprite }) {
  const profile = PROFILE.map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
  const memes = MEMES.map(([t, w]) => `<li><span>${t}</span><em>${w}</em></li>`).join('');
  const cards = GRID.map((key) => {
    const s = STATES[key];
    return `<div class="card">
      <div class="pic"><img src="${sprite(key)}">${s.badge ? `<span class="badge"><i></i>${s.badge}</span>` : ''}</div>
      <div class="label"><span>${s.name}</span><small>${key}</small></div>
      <div class="quote">${s.line}</div>
    </div>`;
  }).join('');

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>DeepSeek-Pet · 角色设定</title>
<style>
${fontCSS}
:root { --blue: #4D6BFE; --line: #1B2266; --muted: #5C6394; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1800px; height: 1200px; overflow: hidden; color: var(--line);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #F3F5FF radial-gradient(#D6DDFB 1.6px, transparent 1.6px) 0 0 / 26px 26px;
}
.cute { font-family: 'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif; font-weight: 400; }
.sheet { display: flex; gap: 40px; padding: 40px; height: 1200px; }

/* ---------- hero 立绘 */
.hero {
  position: relative; flex: none; width: 560px; height: 1120px; border-radius: 44px; overflow: hidden;
  background:
    radial-gradient(circle at 50% 45%, rgba(255,255,255,.95) 0, rgba(255,255,255,0) 45%),
    linear-gradient(172deg, #EEF2FF 0%, #D8E0FF 55%, #B4C3FF 100%);
  box-shadow: 0 24px 60px rgba(35,53,166,.20), inset 0 0 0 4px rgba(255,255,255,.7);
}
.hero .decor { position: absolute; inset: 0; }
.hero .girl { position: absolute; left: 50%; top: 178px; width: 402px; transform: translateX(-50%); }
.hero .tag { position: absolute; right: 30px; top: 34px; display: flex; gap: 8px; font-size: 16px; font-weight: 700; letter-spacing: 1px; }
.hero .tag b { background: var(--line); color: #fff; padding: 5px 13px; border-radius: 999px; }
.hero .tag span { background: #fff; padding: 5px 13px; border-radius: 999px; box-shadow: 0 4px 12px rgba(35,53,166,.12); }
.say {
  position: absolute; left: 30px; top: 84px; padding: 14px 22px; background: #fff; border-radius: 26px;
  border: 4px solid var(--line); font-size: 25px; line-height: 1.3; box-shadow: 0 7px 0 rgba(35,53,166,.12);
}
.say .tip { position: absolute; left: 300px; bottom: -33px; }
.say em { font-style: normal; color: var(--blue); }
.name { position: absolute; left: 36px; bottom: 44px; }
.name h1 {
  font-size: 66px; line-height: 1; color: var(--blue); letter-spacing: 1px;
  -webkit-text-stroke: 8px #fff; paint-order: stroke fill; text-shadow: 0 9px 0 rgba(35,53,166,.18);
}
.name p { margin-top: 10px; font-size: 16px; font-weight: 700; letter-spacing: 4px; }
.name p i { font-style: normal; background: var(--line); color: #fff; padding: 2px 10px; border-radius: 6px; letter-spacing: 2px; margin-left: 6px; }

/* ---------- right column */
.side { flex: 1; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.head { display: flex; align-items: flex-end; gap: 18px; padding: 2px 4px 0; }
.head h2 { font-size: 56px; line-height: 1; }
.head p { font-size: 15px; font-weight: 700; letter-spacing: 5px; color: var(--muted); padding-bottom: 7px; }
.head .ver { margin-left: auto; font-size: 14px; color: var(--muted); padding-bottom: 7px; }
.panel { background: #fff; border-radius: 26px; padding: 18px 26px; box-shadow: 0 10px 30px rgba(35,53,166,.10); }
.panel h3 { font-size: 24px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.panel h3::before { content: ''; width: 9px; height: 24px; border-radius: 5px; background: var(--blue); }
.profile { display: grid; grid-template-columns: 1fr 1fr; gap: 9px 28px; }
.row { display: flex; align-items: center; gap: 12px; font-size: 17.5px; }
.row .k { flex: none; width: 72px; text-align: center; padding: 3px 0; border-radius: 999px; background: #E8EDFF; font-weight: 700; font-size: 15px; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.card { background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(35,53,166,.10); }
.card .pic { position: relative; height: 272px; overflow: hidden; background: linear-gradient(180deg, #F4F6FF, #DCE3FF); }
.card .pic img { display: block; width: 100%; }
.badge {
  position: absolute; right: 8px; bottom: 10px; display: flex; align-items: center; gap: 5px;
  background: rgba(238,241,251,.95); border: 1.5px solid #C9D1EE; border-radius: 999px; padding: 3px 9px;
  font-size: 11.5px; color: var(--muted);
}
.badge i { width: 9px; height: 9px; border-radius: 50%; border: 2px solid var(--blue); border-right-color: transparent; }
.card .label { display: flex; align-items: baseline; gap: 8px; padding: 10px 16px 2px; }
.card .label span { font-family: 'ZCOOL KuaiLe', sans-serif; font-size: 24px; }
.card .label small { font-size: 12.5px; color: var(--muted); letter-spacing: 1px; }
.card .quote { padding: 0 16px 14px; font-size: 13.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.memes { padding: 18px 20px; }
.memes h3 { margin-bottom: 10px; }
.memes ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
.memes li { display: flex; flex-direction: column; font-size: 14px; line-height: 1.3; font-weight: 700; }
.memes li em { font-style: normal; font-weight: 400; font-size: 12px; color: var(--muted); }
</style></head>
<body><div class="sheet">
  <section class="hero">
    ${heroDecor()}
    <img class="girl" src="${sprite('hello')}">
    <div class="tag"><b>No.001</b><span>DeepSeek 娘</span></div>
    <div class="say cute">我是 <em>DeepSeek</em>，很高兴见到你！<svg class="tip" width="50" height="38" viewBox="0 0 50 38"><path d="M2 0 L34 38 L42 0" fill="#fff" stroke="#1B2266" stroke-width="4" stroke-linejoin="round"/><rect x="0" y="0" width="50" height="3.5" fill="#fff"/></svg></div>
    <div class="name"><h1 class="cute">DeepSeek-Pet</h1><p>DEEPSEEK 娘<i>外号 大肥鱼</i></p></div>
  </section>
  <section class="side">
    <div class="head"><h2 class="cute">角色设定</h2><p>CHARACTER SHEET</p><span class="ver">立绘 v1.0 · 状态 ×${Object.keys(STATES).length}</span></div>
    <div class="panel"><h3 class="cute">基础档案</h3><div class="profile">${profile}</div></div>
    <div class="grid">${cards}<div class="card memes"><h3 class="cute">DS 梗</h3><ul>${memes}</ul></div></div>
  </section>
</div></body></html>`;
}
