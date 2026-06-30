import { describe, expect, it } from 'vitest';
import { advanceForecast, buildForecastAlert, pickForecastLine, pickWeather, WEATHER_TYPES } from './weather';

describe('weather forecast logic', () => {
  it('picks weather from the supported weather list', () => {
    expect(pickWeather(() => 0)).toBe(WEATHER_TYPES[0]);
    expect(pickWeather(() => 0.999)).toBe(WEATHER_TYPES[WEATHER_TYPES.length - 1]);
  });

  it('advances the forecast queue without mutating the current queue', () => {
    const forecast = ['cloudy', 'rainy', 'sunny'] as const;
    const next = advanceForecast([...forecast], () => 0);

    expect(next).toEqual({
      weather: 'cloudy',
      forecast: ['rainy', 'sunny', 'sunny'],
    });
    expect(forecast).toEqual(['cloudy', 'rainy', 'sunny']);
  });

  it('builds deterministic alert copy when the random source is injected', () => {
    expect(pickForecastLine('rainy', () => 0)).toBe('我闻到雨的气息了，草会喝饱水。');
    expect(buildForecastAlert('stormy', ['sunny'], 123, () => 0)).toEqual({
      weather: 'stormy',
      forecast: ['sunny'],
      line: '风暴在路上，把松动的东西收一收吧。',
      at: 123,
    });
  });
});
