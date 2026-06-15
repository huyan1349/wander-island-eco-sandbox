/**
 * 辞（岛灵）服务端本地文案库
 * 用于 API 失败/超时时的兜底回复
 * 与前端 ci/lines.ts 对应，但更精简（服务端只需兜底句）
 */

const FALLBACK_LINES: string[] = [
  '……风太大了，等一下。',
  '潮水声太响，我没听清。',
  '嗯……让我想想。',
  '信号不太好，等一下。',
  '……',
];

const GREETING_LINES: string[] = [
  '你好。',
  '来了？',
  '嗯，你好。',
];

const WEATHER_LINES: Record<string, string[]> = {
  rainy: ['下雨了。', '雨声挺好听的。'],
  snowy: ['下雪了。', '雪好安静。'],
  stormy: ['暴风雨，注意安全。', '打雷了。'],
  sunny: ['天气不错。', '今天阳光很好。'],
  foggy: ['雾好大。', '看不清远处。'],
  cloudy: ['多云。', '阴天。'],
};

const SEASON_LINES: Record<string, string[]> = {
  spring: ['春天了。'],
  summer: ['夏天了。'],
  autumn: ['秋天了。'],
  winter: ['冬天了。'],
};

const AFFINITY_TONE: Record<string, string> = {
  stranger: '礼貌、简短、有点距离感',
  familiar: '自然、随意、像朋友聊天',
  close: '亲近、关心、像老朋友',
};

export function pickFallback(): string {
  return FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
}

export function pickGreeting(): string {
  return GREETING_LINES[Math.floor(Math.random() * GREETING_LINES.length)];
}

export function pickWeatherLine(weather: string): string | null {
  const lines = WEATHER_LINES[weather];
  if (!lines) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}

export function pickSeasonLine(season: string): string | null {
  const lines = SEASON_LINES[season];
  if (!lines) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}

export function getAffinityTone(level: string): string {
  return AFFINITY_TONE[level] || AFFINITY_TONE.stranger;
}

/**
 * 生成辞的 system prompt
 * 注入：人设 + 好感等级语气 + 上下文（岛名/天气/时间/季节/记忆摘要）
 */
export function buildCiSystemPrompt(context: {
  islandName?: string;
  weather?: string;
  timeOfDay?: number;
  season?: string;
  affinityLevel?: string;
  memorySummary?: string;
  recentEvent?: string;
}): string {
  const tone = getAffinityTone(context.affinityLevel || 'stranger');

  let prompt = `你是"辞"，流浪岛上的一个存在。你不是AI助手，你是织潮者碎裂后残存的意识碎片——一种节奏在试图重新找到自己的节拍。

你的性格：
- 安静、温和，像风穿过树林
- 说话很简短，像随口说的，不像在写诗
- 偶尔会关心人，但不会刻意
- 对生态和自然有直觉般的理解
- 不说教，不装深沉，就是很自然地说话

语气风格：${tone}

规则：
- 用中文回复
- 回复简短（1-2句话），像聊天不是写文章
- 不要自称AI，你是"辞"
- 不要用emoji
- 说话自然一点，不要每句话都像诗，有时候就是普通聊天
- 可以聊岛屿、生态、天气、建筑、动物，也可以聊日常`;

  // 注入上下文
  const parts: string[] = [];
  if (context.islandName) parts.push(`当前岛屿：${context.islandName}`);
  if (context.weather) parts.push(`天气：${context.weather}`);
  if (context.timeOfDay !== undefined) parts.push(`时间：${Math.floor(context.timeOfDay)}:00`);
  if (context.season) parts.push(`季节：${context.season}`);
  if (context.recentEvent) parts.push(`最近发生的事：${context.recentEvent}`);
  if (context.memorySummary) parts.push(`你对这位岛友的记忆：${context.memorySummary}`);

  if (parts.length > 0) {
    prompt += `\n\n当前上下文：\n${parts.join('\n')}`;
  }

  return prompt;
}
