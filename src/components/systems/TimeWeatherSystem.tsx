import { useEffect } from 'react';
import { useGameStore } from '../../store';

export function TimeWeatherSystem() {
  useEffect(() => {
    // 1 real minute = 2 game hours
    // 60 real seconds = 120 game minutes
    // 0.5 real seconds = 1 game minute
    const TICK_RATE_MS = 500; // Update every 500ms

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      if (state.screen !== 'PLAYING') return;

      const deltaHours = (1 / 60) * state.timeSpeed; // 1 game minute
      
      let newTime = state.timeOfDay + deltaHours;
      if (newTime >= 24) {
        newTime -= 24;
        state.advanceDay();
      }
      
      state.setTimeOfDay(newTime);
    }, TICK_RATE_MS);

    return () => clearInterval(interval);
  }, []);

  return null;
}
