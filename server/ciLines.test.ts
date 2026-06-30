import { describe, expect, it } from 'vitest';
import { buildCiSystemPrompt, getAffinityTone, pickSeasonLine, pickWeatherLine } from './ciLines';

describe('ciLines local fallback helpers', () => {
  it('returns weather and season lines only for known keys', () => {
    expect(pickWeatherLine('sunny')).toEqual(expect.any(String));
    expect(pickWeatherLine('unknown')).toBeNull();
    expect(pickSeasonLine('winter')).toEqual(expect.any(String));
    expect(pickSeasonLine('monsoon')).toBeNull();
  });

  it('falls back to stranger tone for unknown affinity levels', () => {
    expect(getAffinityTone('close')).toContain('亲近');
    expect(getAffinityTone('???')).toBe(getAffinityTone('stranger'));
  });

  it('injects island context into the system prompt without exposing AI identity', () => {
    const prompt = buildCiSystemPrompt({
      islandName: '测试岛',
      weather: '晴天',
      timeOfDay: 8.5,
      season: 'spring',
      affinityLevel: 'familiar',
      memorySummary: '记得玩家喜欢灯塔',
      recentEvent: '刚放下一座灯塔',
    });

    expect(prompt).toContain('你是"辞"');
    expect(prompt).toContain('当前岛屿：测试岛');
    expect(prompt).toContain('天气：晴天');
    expect(prompt).toContain('时间：8:00');
    expect(prompt).toContain('季节：spring');
    expect(prompt).toContain('刚放下一座灯塔');
    expect(prompt).toContain('记得玩家喜欢灯塔');
    expect(prompt).toContain('不要自称AI');
  });
});
