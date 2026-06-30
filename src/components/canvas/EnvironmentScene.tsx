import { useEffect } from 'react';
import { updateHeightField } from '../../game/water/heightField';
import { useGameStore } from '../../store';
import { FirefliesSystem, SkySystem, WeatherSystem } from '../SkySystem';
import { Terrain } from '../Terrain';
import { Water } from '../Water';

function HeightFieldSync() {
  const terrainData = useGameStore(state => state.terrainData);
  useEffect(() => { updateHeightField(); }, [terrainData]);
  return null;
}

export function EnvironmentScene() {
  return (
    <>
      <SkySystem />
      <WeatherSystem />
      <FirefliesSystem />
      <HeightFieldSync />
      <Terrain />
      <Water />
    </>
  );
}
