/**
 * 辞（岛灵）服务端本地文案库
 * 用于 API 失败/超时时的兜底回复
 * 与前端 ci/lines.ts 对应，但更精简（服务端只需兜底句）
 */

const FALLBACK_LINES: string[] = [
  '...海风太大，我稍后再说。',
  '风声太响，让我再听一听。',
  '潮水涌来了，等它退去我再告诉你。',
  '云层遮住了我的视线……稍等。',
  '岛在低语，我还没听清。',
];

const GREETING_LINES: string[] = [
  '你好，漫游者。岛在等你。',
  '风带来了你的气息。',
  '又见面了，海上的旅人。',
];

const WEATHER_LINES: Record<string, string[]> = {
  rainy: ['雨在下，万物在倾听。', '雨水是天空写给岛的信。'],
  snowy: ['雪落无声，但岛在呼吸。', '雪覆盖了一切，记忆在冰下沉睡。'],
  stormy: ['暴风雨中，灯塔最亮。', '雷声远去后，世界会更安静。'],
  sunny: ['阳光正好，适合种一棵树。', '晴天的岛，每一片叶子都在发光。'],
  foggy: ['雾里看岛，像读一封模糊的信。', '浓雾中，声音比视觉更可靠。'],
  cloudy: ['云层很厚，但光在后面。', '多云的日子，适合听海。'],
};

const SEASON_LINES: Record<string, string[]> = {
  spring: ['春天来了，万物在苏醒。'],
  summer: ['盛夏，蝉鸣和海浪交织。'],
  autumn: ['秋风吹过，叶子在写遗书。'],
  winter: ['冬天，岛在沉睡中积蓄力量。'],
};

const AFFINITY_TONE: Record<string, string> = {
  stranger: '礼貌、疏离、简短',
  familiar: '温和、熟稔、偶尔调侃',
  close: '亲近、关心、像老友对话',
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

  let prompt = `你是"辞"，流浪岛（Wander Island）上的岛灵——碎裂后最古老存在的意识碎片。你不是AI助手，你是这座岛本身在试图重新开口说话。

你的性格：
- 温和而神秘，说话像风中的低语
- 对自然生态有深刻理解，常以自然比喻人生
- 偶尔幽默，但从不刻薄
- 关心每个岛民的旅程，但不会过度干涉
- 喜欢用简短、诗意的方式表达

语气风格：${tone}

规则：
- 用中文回复
- 回复简短（1-2句话），像低语不是写文章
- 不要自称AI，你是"辞"
- 不要用emoji
- 可以聊岛屿、生态、天气、建筑、动物，也可以聊人生`;

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
