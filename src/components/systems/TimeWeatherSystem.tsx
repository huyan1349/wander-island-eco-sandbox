import { useEffect } from 'react';
import { useGameStore } from '../../store';

export function TimeWeatherSystem() {
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    let lastPublishTime = lastTime;
    let simulatedTime = useGameStore.getState().timeOfDay;
    const publishIntervalMs = 1000 / 30; // 8fps→30fps：时间流逝更丝滑(太阳/天空不再一卡一卡)

    const tick = (currentTime: number) => {
      const state = useGameStore.getState();
      const deltaTimeMs = currentTime - lastTime;
      lastTime = currentTime;

      if (state.screen === 'PLAYING') {
        if (state.isTimeScrubbing) {
          simulatedTime = state.timeOfDay;
          lastPublishTime = currentTime;
          frameId = requestAnimationFrame(tick);
          return;
        }

        // If some UI scrubber or slider manually changed the time, treat that
        // as the new source of truth immediately instead of snapping back.
        if (Math.abs(state.timeOfDay - simulatedTime) > 0.05) {
          simulatedTime = state.timeOfDay;
          lastPublishTime = currentTime;
        }

        // 1 real minute = 2 game hours
        // 1 real millisecond = (2 / 60000) game hours
        const deltaHours = (deltaTimeMs * 2 / 60000) * state.timeSpeed;

        simulatedTime += deltaHours;
        let crossedDay = false;
        while (simulatedTime >= 24) {
          simulatedTime -= 24;
          state.advanceDay();
          crossedDay = true;
        }

        if (crossedDay || currentTime - lastPublishTime >= publishIntervalMs) {
          state.setTimeOfDay(simulatedTime);
          lastPublishTime = currentTime;
        }
      } else {
        simulatedTime = state.timeOfDay;
        lastPublishTime = currentTime;
      }
      
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // 随机天气调度：游戏中每隔一段随机时间，天气自然变化一次，辞会播报预报
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // 130~260s 随机间隔，避免太频繁打扰
      const delay = 130000 + Math.random() * 130000;
      timer = setTimeout(() => {
        const s = useGameStore.getState();
        if (s.screen === 'PLAYING' && !s.isTimeScrubbing) {
          s.rollWeather();
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return null;
}
