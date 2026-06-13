import { useEffect } from 'react';
import { useGameStore } from '../../store';

export function TimeWeatherSystem() {
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    let lastPublishTime = lastTime;
    let simulatedTime = useGameStore.getState().timeOfDay;
    const publishIntervalMs = 1000 / 8;

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

  return null;
}
