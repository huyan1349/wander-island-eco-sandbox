import type { WeatherType } from './types';

export const WEATHER_TYPES: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'foggy', 'snowy', 'stormy'];

// 辞向玩家播报天气时的诗意文案（每种天气随机取一句）
export const FORECAST_LINES: Record<WeatherType, string[]> = {
  sunny: ['天要放晴了，阳光会把岛照得发亮。', '云散了，是个好天气。'],
  cloudy: ['云正慢慢聚拢，光会变得温柔。', '天色要暗一点了，云在路上。'],
  rainy: ['我闻到雨的气息了，草会喝饱水。', '要下雨了，听见远处的潮声了吗。'],
  foggy: ['雾要漫上来了，岛会变得朦胧。', '一层雾正靠近，看不太远了。'],
  snowy: ['要下雪了……岛会安静下来。', '第一片雪快落了，记得留意。'],
  stormy: ['风暴在路上，把松动的东西收一收吧。', '雷云压过来了，今晚不太平静。'],
};

export interface ForecastAlertPayload {
  weather: WeatherType;
  forecast: WeatherType[];
  line: string;
  at: number;
}

export interface ForecastAdvance {
  weather: WeatherType;
  forecast: WeatherType[];
}

export function pickWeather(random = Math.random): WeatherType {
  return WEATHER_TYPES[Math.floor(random() * WEATHER_TYPES.length)] ?? 'sunny';
}

export function pickForecastLine(weather: WeatherType, random = Math.random): string {
  const lines = FORECAST_LINES[weather] || FORECAST_LINES.sunny;
  return lines[Math.floor(random() * lines.length)] ?? lines[0];
}

export function advanceForecast(forecast: WeatherType[], random = Math.random): ForecastAdvance {
  const nextForecast = [...forecast];
  const weather = nextForecast.shift() || 'sunny';
  nextForecast.push(pickWeather(random));
  return { weather, forecast: nextForecast };
}

export function buildForecastAlert(
  weather: WeatherType,
  forecast: WeatherType[],
  at = Date.now(),
  random = Math.random,
): ForecastAlertPayload {
  return {
    weather,
    forecast,
    line: pickForecastLine(weather, random),
    at,
  };
}
