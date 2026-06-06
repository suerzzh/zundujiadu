export const mockEvents = [
  {
    chapter: 1,
    title: "第一章：重生归来",
    events: [
      { type: "event", content: "林风在雷劫中陨落，醒来发现回到了三百年前的地球。" },
      { type: "character", content: "林风：从仙帝重回凡人期，保留记忆。" },
      { type: "location", content: "东海市第一高中" },
      { type: "conflict", content: "校霸王强找茬，试图勒索林风的学费。" },
      { type: "emotion", content: "从绝望到震惊，再到重回地球的狂喜。" }
    ]
  },
  {
    chapter: 2,
    title: "第二章：一掌镇压",
    events: [
      { type: "event", content: "林风稍微运转残存灵力，一巴掌扇飞王强。" },
      { type: "character", content: "王强：校霸，被林风一招秒杀，震惊。" },
      { type: "location", content: "学校操场后面" },
      { type: "conflict", content: "王强不服，叫来社会上的大哥李彪。" },
      { type: "emotion", content: "林风冷漠无视，展现强者的绝对自信。" }
    ]
  },
  {
    chapter: 3,
    title: "第三章：初露锋芒",
    events: [
      { type: "event", content: "李彪带人围堵，林风使用基础步法闪避并反击，全灭小混混。" },
      { type: "character", content: "楚梦瑶：校花，暗中目睹了全过程，对林风产生好奇。" },
      { type: "location", content: "学校旁边的废弃小巷" },
      { type: "conflict", content: "李彪掏出匕首，生死危机（微弱）。" },
      { type: "emotion", content: "爽点爆发：反杀社会大哥，引得校花侧目。" }
    ]
  }
];

export const mockAnalysis = {
  overview: {
    genre: "都市修仙 / 重生爽文",
    orientation: "男频",
    adaptationStrategy: "加快节奏，放大前期打脸的爽感，提前引出女主楚梦瑶的互动。",
    risks: "原著开篇铺垫过长，剧本需在第一集第一分钟内完成重生和第一次打脸。"
  },
  episodes: [
    { id: 1, title: "第1集：仙帝归来", type: "打脸装逼", events: "重生觉醒 -> 校霸挑衅 -> 一巴掌秒杀", hook: "社会大哥李彪收到消息，带人前往学校围堵。", emotion: "高" },
    { id: 2, title: "第2集：小巷战神", type: "武力压制", events: "李彪围堵 -> 轻松反杀 -> 校花目击", hook: "楚梦瑶暗中派人调查林风的背景。", emotion: "极高" },
    { id: 3, title: "第3集：楚家的邀请", type: "身份揭秘", events: "楚家老爷子病危 -> 楚梦瑶找林风求助", hook: "林风开出天价诊费，楚家是否答应？", emotion: "中上" }
  ],
  hooks: [
    "身份悬念：林风为何突然变得这么强？",
    "危机悬念：李彪背后的黑虎帮即将报复。",
    "情感悬念：楚梦瑶对林风态度的转变。"
  ],
  satisfaction: [
    { point: "一招秒杀校霸", phase: "第1集末尾" },
    { point: "反杀社会大哥", phase: "第2集高潮" },
    { point: "校花主动搭话", phase: "第3集开篇" }
  ]
};

export const mockReview = {
  radarData: [
    { subject: '节奏把控', A: 90, fullMark: 100 },
    { subject: '爽点密度', A: 95, fullMark: 100 },
    { subject: '对话占比', A: 75, fullMark: 100 },
    { subject: '格式规范', A: 100, fullMark: 100 },
    { subject: '集末悬念', A: 85, fullMark: 100 },
  ],
  issues: [
    { title: "第2集对话比例偏低 (60%)", desc: "动作戏描写过多，建议将部分心理活动转化为台词。", episode: 2 },
    { title: "第3集集末钩子不够强", desc: "仅提出天价诊费，缺乏生死倒计时的紧迫感。", episode: 3 },
    { title: "楚梦瑶出场略显突兀", desc: "建议在第一集加入她对原主林风的刻板印象作为对比。", episode: 1 }
  ],
  suggestions: [
    "在第2集增加李彪手下的求饶台词，提升爽感。",
    "第3集结尾加入楚家老爷子吐血的特写，强化悬念。"
  ],
  qualityGate: [
    { check: "单集字数控制 (800-1200字)", pass: true },
    { check: "场景数限制 (单集≤3场)", pass: true },
    { check: "跨集重复检查", pass: true },
    { check: "对话句长限制 (≤15字/句)", pass: false }
  ]
};

export const mockContinuity = [
  { chapter: 1, type: "人物", target: "林风", state: "凡人期练气一层，校服，略显消瘦。" },
  { chapter: 1, type: "伏笔", target: "雷劫伤痕", state: "手腕处有一道暗红色的闪电印记。" },
  { chapter: 2, type: "道具", target: "破旧校服", state: "在战斗中被划破一道口子。" },
  { chapter: 3, type: "人物", target: "楚梦瑶", state: "高冷校花，穿着百褶裙制服，暗中观察。" },
  { chapter: 3, type: "称呼", target: "林风", state: "王强称呼从“废物”变成“疯哥”。" }
];

export const mockScript = `---
version: "1.1"
meta:
  episode: 1
  title: "仙帝归来"
  analysis:
    beat_phase: "开篇打脸"
    emotion_marker: "爽"
---

# 场景 1：学校操场后面
**时间**：白天
**地点**：东海市第一高中
**人物**：林风、王强、围观学生

[林风]缓缓睁开眼睛，眼神中闪过一丝凌厉的电光。他看了一眼自己的手腕，暗红色的闪电印记若隐若现。

[林风] (内心混响)
我竟然没死在九重雷劫之下？回到了三百年前的地球！

[王强]带着两个小弟嚣张地走过来，一把推在[林风]肩膀上。

[王强] (嚣张)
喂！姓林的，这个月的保护费该交了吧？

[林风]被推得后退半步，眼神瞬间变得冰冷。

[林风] (冷漠)
滚。

[王强]愣了一下，随即大怒。

[王强] (怒极反笑)
你小子今天吃错药了？敢叫我滚？

[王强]挥起拳头砸向[林风]的脸。

## 冲突爆发！(conflict_type: 肢体冲突)

[林风]不闪不避，随意地一抬手，后发先至，一巴掌扇在[王强]脸上。

**啪！** 一声脆响。

[王强]整个人在空中转了720度，重重摔在三米外的草地上，满嘴是血，直接昏死过去。

两个小弟吓得双腿发软，跌坐在地。

[小弟甲] (结巴)
疯...疯了...林风你敢打强哥！

[林风]拍了拍手，像拍去灰尘一样随意。

[林风] (语气平淡)
告诉李彪，想报仇，让他自己来找我。

## 悬念点 (钩子)
远处的教学楼天台上，一个高挑的身影放下了望远镜。
(切至楚梦瑶特写)

[楚梦瑶] (低声)
这个林风...有意思。
`;
