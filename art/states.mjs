// The pet's states: one sprite each in art/png/<key>.png.
// `line` is what 深深 says in that state; `use` is when the pet shows it.
export const STATES = {
  hello: { name: '打招呼', line: '我是 DeepSeek，很高兴见到你！', use: '启动、鼠标悬停' },
  idle: { name: '待机', line: '有什么可以帮你的吗？', use: '默认状态' },
  think: { name: '深度思考', line: '嗯，用户说……', use: '等待回复', badge: '已深度思考（用时 32 秒）' },
  busy: { name: '服务器繁忙', line: '服务器繁忙，请稍后再试。', use: '出错、断网' },
  happy: { name: '开源啦', line: '全部开源，MIT 协议，随便用～', use: '被点击、摸头' },
  aha: { name: '顿悟', line: '等等，我好像悟了！', use: '回复完成' },
  eat: { name: '吃 Token', line: 'Token 便宜又大碗，嗷呜！', use: '喂食互动' },
  sleep: { name: '睡觉', line: '夜间错峰优惠中……zzz', use: '长时间无操作' },
};

// Extra lines the pet picks from at random, besides each state's `line`.
export const MORE_LINES = {
  hello: ['今天想聊点什么？', '深深来陪你摸鱼啦～', '有问题尽管问，我先深度思考一下！'],
  idle: ['要不要问我点问题？', '……（发呆中）', '我在，随时待命～'],
  think: ['等等，让我再想想……', '先把问题拆解一下……', '嗯，这个问题有点意思……'],
  busy: ['请求太多啦，排队中……', '人好多，我先喘口气……', '服务器繁忙，请稍后再试……真的！'],
  happy: ['被摸头了，嘿嘿～', '今天也是便宜又好用的一天！', '开源精神，发扬光大！'],
  aha: ['这是一个 aha moment！', '诶？！', '我想明白了！'],
  eat: ['缓存命中，更香了！', '再来一个 Token～', '嗷呜，一口一个 Token！'],
  sleep: ['Zzz……128K……上下文……', '让我再睡五分钟……', '错峰时段，打个盹……'],
};

// Text written onto the blank sign and thought bubble of the AI art.
// box is [x, y, width, height] on the art/cut canvas; lines are [text, font size].
export const OVERLAYS = {
  busy: { box: [104, 222, 118, 74], lines: [['服务器繁忙', 19], ['请稍后再试。', 12]] },
  think: { box: [39, 30, 81, 70], lines: [['嗯，', 14], ['用户说……', 14]] },
};
