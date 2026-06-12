import { useEffect } from 'react';
import { useGameStore } from '../../store';

export function TimeWeatherSystem() {
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const tick = (currentTime: number) => {
      const state = useGameStore.getState();
      const deltaTimeMs = currentTime - lastTime;
      lastTime = currentTime;

      if (state.screen === 'PLAYING') {
        // 1 real minute = 2 game hours
        // 1 real millisecond = (2 / 60000) game hours
        const deltaHours = (deltaTimeMs * 2 / 60000) * state.timeSpeed;
        
        let newTime = state.timeOfDay + deltaHours;
        if (newTime >= 24) {
          newTime -= 24;
          state.advanceDay();
        }
        
        state.setTimeOfDay(newTime);
      }
      
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return null;
}
