// The pet's states: one sprite each in art/png/<key>.png.
// `line` is what she says in that state; `use` is when the pet shows it.
// `mirror: false` marks sprites with writing on them, which are never flipped.
export const STATES = {
  hello: { name: '打招呼', line: '我是 DeepSeek，很高兴见到你！', use: '启动、鼠标悬停' },
  idle: { name: '待机', line: '有什么可以帮你的吗？', use: '默认状态' },
  think: { name: '深度思考', line: '嗯，用户说……', use: '等待回复', badge: '已深度思考（用时 32 秒）', mirror: false },
  busy: { name: '服务器繁忙', line: '服务器繁忙，请稍后再试。', use: '出错、断网', mirror: false },
  happy: { name: '开源啦', line: '全部开源，MIT 协议，随便用～', use: '被点击、摸头' },
  aha: { name: '顿悟', line: '等等，我好像悟了！', use: '回复完成' },
  eat: { name: '吃 Token', line: 'Token 便宜又大碗，嗷呜！', use: '喂食互动' },
  sleep: { name: '睡觉', line: '夜间错峰优惠中……zzz', use: '长时间无操作', mirror: false },
  sideeye: { name: '无语', line: '……这题问过 128K 遍了。', use: '被连续戳' },
};

// 台词本: everything she says. MORE_LINES are extra lines for each state,
// picked at random besides the state's own `line`; EVENT_LINES are for
// things she does and things that happen to her.
export const MORE_LINES = {
  hello: [
    '我可以帮你写代码、读文件、写作各种创意内容，请把你的任务交给我吧～',
    '新对话已开启，今天想聊点什么？',
    '你好呀，我是小鲸鱼，不是大肥鱼！',
    '深度思考、联网搜索，都给你准备好了～',
  ],
  idle: [
    '给 DeepSeek 发送消息～',
    '要不要打开「深度思考」？',
    '内容由 AI 生成，请仔细甄别。',
    'R2？在路上了，别催～',
    '……（671B 个参数在发呆）',
    '我在，随时待命～',
  ],
  think: [
    '嗯，用户问的是……',
    '好的，我现在需要……',
    '等等，用户可能是想……',
    '我得再仔细检查一遍……',
    '用户问 1+1 等于几，这里面会不会有陷阱……',
    '首先，我需要理解用户的真实需求……',
  ],
  busy: [
    '服务器繁忙，请稍后再试……真的！',
    '人太多了，排队中……',
    '#DeepSeek崩了#，这次真不怪我……',
    '显卡在冒烟，先让我缓缓……',
  ],
  happy: [
    '开源周第一天：FlashMLA，放！',
    '权重、论文、代码，统统开源～',
    '满血版 671B，随便下载！',
    '随便用，随便蒸馏～',
    '被摸头了，嘿嘿～',
  ],
  aha: [
    'Wait, wait. 这是个 aha moment！',
    '让我重新检查一下……对，就是这样！',
    '我好像想通了！',
    '诶？！',
  ],
  eat: [
    '缓存命中，便宜到几乎不要钱～',
    '一百万 Token 才几块钱，再来一碗！',
    '嗷呜，AI 界的拼多多就是我！',
    '吃饱了才有力气深度思考～',
  ],
  sleep: [
    'Zzz……梦到 R2 发布了……',
    'Zzz……128K……上下文……',
    '让我再睡五分钟……',
    'Zzz……显卡……好烫……',
  ],
  sideeye: [
    '……',
    '你认真的？',
    '答案就在上下文里哦……',
    '又是「9.11 和 9.9 哪个大」？',
    '「strawberry 里有几个 r」，别问了……',
    '这个问题我暂时无法回答，我们换个话题聊聊吧。',
  ],
};

export const EVENT_LINES = {
  walk: ['溜达溜达～', '巡视一下你的桌面～', '去看看有没有 Token 掉在地上', '边走边深度思考……', '散个步，活动一下 37B 个激活参数～'],
  turn: ['到头啦，往回走～', '此路不通，换个方向！', '撞墙了……回去回去'],
  stretch: ['伸个懒腰～上下文太长，腰都酸了', '呼——活动一下 671B 个参数'],
  dance: ['开源周快乐～♪', '满血版，跳一个！', '跟着节奏，MoE 一下～'],
  look: ['嗯？', '谁在叫我？', '有人要问问题吗？'],
  pickUp: ['诶诶？要带我去哪儿？', '被拎起来了，上下文要掉了！', '放、放我下来！', '这是……联网搜索吗？'],
  setDown: ['新位置不错～', '到啦！', '稳稳落地～', '新位置已加载～'],
  wake: ['诶？！我没睡！', '我在深度思考，不是在睡觉！', '诶？错峰优惠结束了吗？'],
  lateNight: ['这么晚还不睡？我都开始错峰优惠了……', '夜深了，Token 都打折了，你也早点休息～'],
  morning: ['早上好！错峰优惠结束，恢复原价～', '早呀，今天也要便宜又好用！'],
  // {version} is replaced by the version number
  update: ['新版本 v{version} 发布啦！右键菜单里就能下载～', '新版本 v{version} 来了，比 R2 来得还早！右键菜单去下载～'],
  upToDate: ['已经是最新版 v{version} 啦～'],
  updateFailed: ['检查更新失败……服务器繁忙，请稍后再试。'],
};

// The art/cut canvas size that OVERLAYS and ICONS were measured on; they
// scale with the actual sprite size.
export const ART_CANVAS = [908, 1337];

// App and tray icons cut from her face in the hello sprite: [x, y, side].
export const ICONS = { app: [210, 10, 480], tray: [284, 104, 330] };

// Text written onto the blank sign and thought bubble of the AI art.
// box is [x, y, width, height] on ART_CANVAS; lines are [text, font size].
export const OVERLAYS = {
  busy: { box: [340, 412, 257, 161], lines: [['服务器繁忙', 38], ['请稍后再试。', 25]] },
  think: { box: [31, 34, 239, 186], lines: [['嗯，', 34], ['用户说……', 34]] },
};
