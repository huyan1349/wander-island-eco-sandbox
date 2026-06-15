/**
 * 辞（织潮者的回音）本地文案库
 * 按事件类型分桶的固定文案，用于：
 * 1. 前端兜底（API 失败时使用）
 * 2. 高频环境句（不调 DeepSeek，直接用本地文案）
 * 3. 主动性触发时的快速响应
 * 
 * 语气原则：自然、不装、像随口说的
 */

// ===== 进岛欢迎 =====
export const WELCOME_LINES: string[] = [
  '你来了。',
  '嗯，回来了。',
  '岛在等你。',
  '又见面了。',
  '海风把你送回来了。',
];

// ===== 生态事件 =====
export const ECOLOGY_LINES: Record<string, string[]> = {
  deer_arrived: [
    '有鹿来了。',
    '鹿觉得这里安全。',
    '看，小鹿。',
  ],
  wolf_appeared: [
    '狼来了……没事，这也是生态。',
    '别怕，狼也是岛的一部分。',
  ],
  forest_grew: [
    '树多了，风穿过的时候声音不一样了。',
    '树林越来越密了。',
  ],
  spring_flowed: [
    '出水了。',
    '有水了，岛活过来了。',
  ],
  health_high: [
    '岛现在状态不错。',
    '嗯，挺健康的。',
  ],
  health_low: [
    '岛有点累了……多种点树吧。',
    '生态不太好，注意一下。',
  ],
};

// ===== 放置物件 =====
export const PLACEMENT_LINES: Record<string, string[]> = {
  lighthouse: [
    '灯塔亮了，挺好的。',
    '有灯塔就不怕迷路了。',
  ],
  spirit_tree: [
    '这棵树……很老了。',
    '你唤醒了很古老的东西。',
  ],
  cherry_tree: [
    '樱花开了。',
    '好看。',
  ],
  windmill: [
    '风车转起来了。',
    '有风车就有风的声音。',
  ],
  observatory: [
    '观星台……可以看星星。',
    '晚上来这里看星星不错。',
  ],
  waterwheel: [
    '水车转了，像岛的心跳。',
    '有水车的声音，岛就不安静了。',
  ],
  house: [
    '有家了。',
    '小屋亮了灯，暖和。',
  ],
  default: [
    '又多了一个东西。',
    '岛在慢慢变丰富。',
    '嗯，不错。',
  ],
};

// ===== 重复操作建议 =====
export const REPEAT_SUGGESTION_LINES: string[] = [
  '要不要换个位置试试？',
  '一直在调这里……你在找什么？',
  '有时候留白也挺好的。',
  '别纠结了，先放别的地方吧。',
];

// ===== idle 陪伴 =====
export const IDLE_LINES: string[] = [
  '还在吗？',
  '不急，慢慢来。',
  '发呆也挺好的。',
  '有时候什么都不做也是一种休息。',
  '嗯……',
  '岛不会跑掉的。',
];

// ===== 好感度等级变化 =====
export const AFFINITY_LEVEL_LINES: Record<string, string> = {
  familiar: '我们好像越来越熟了。',
  close: '有你在，岛就不孤独了。',
};

// ===== 天气/时间/季节环境句 =====
export const AMBIENT_LINES = {
  morning: [
    '早。',
    '天亮了。',
    '新的一天。',
  ],
  night: [
    '天黑了。',
    '晚安。',
    '夜深了，早点休息。',
  ],
  rainy: [
    '下雨了。',
    '雨声挺好听的。',
    '下雨天适合待在家里。',
  ],
  snowy: [
    '下雪了，好安静。',
    '雪把什么都盖住了。',
  ],
  stormy: [
    '暴风雨……别怕，会过去的。',
    '打雷了，注意安全。',
  ],
  spring: [
    '春天了，万物都在长。',
    '春雨过后，绿意会更多。',
  ],
  summer: [
    '夏天，蝉叫得厉害。',
    '热，但是树荫下凉快。',
  ],
  autumn: [
    '秋天了，叶子在掉。',
    '秋天的风很舒服。',
  ],
  winter: [
    '冬天了，万物都在休息。',
    '冷，但地下的根还活着。',
  ],
};

// ===== 成就解锁 =====
export const ACHIEVEMENT_LINES: string[] = [
  '不错嘛。',
  '做到了。',
  '厉害。',
];

// ===== 等级提升 =====
export const LEVEL_UP_LINES: string[] = [
  '升级了。',
  '你又变强了。',
  '成长了。',
];

/** 从数组中随机取一条 */
export function pickLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

/** 根据放置物件类型获取对应文案 */
export function getPlacementLine(assetType: string): string {
  const bucket = PLACEMENT_LINES[assetType] || PLACEMENT_LINES['default'];
  return pickLine(bucket);
}
