import { useGameStore } from '../../store';

// Asymmetric wave profile: peaked crests, wide flat troughs (anime wave shape).
function crestShape(p: number) {
  return Math.sin(p) + 0.35 * Math.sin(2 * p + 0.6);
}

// (x, y) are ocean-plane local coords: y = -worldZ. Returns height above mesh.
function sampleOceanWave(x: number, y: number, time: number, flowSpeed: number, baseAmp: number) {
  const dist = Math.sqrt(x * x + y * y);
  const flowTime = time * flowSpeed;

  let islandFade = 1.0;
  if (dist < 18) {
    const t = Math.max(0, (dist - 12) / 6.0);
    islandFade = t * t * (3 - 2 * t);
  }

  const wave1 = crestShape(x * 0.2 + y * 0.1 + flowTime) * baseAmp * 0.28 * islandFade;
  const wave2 = crestShape(x * 0.1 - y * 0.2 + flowTime * 0.8) * baseAmp * 0.22 * islandFade;

  const puffL = Math.abs(Math.sin(x * 0.13 - y * 0.08 + flowTime * 0.30) *
                         Math.sin(x * 0.06 + y * 0.15 + flowTime * 0.25)) * baseAmp * 0.55;
  const puffM = Math.abs(Math.sin(x * 0.33 + y * 0.21 + flowTime * 0.45) *
                         Math.sin(y * 0.36 - x * 0.24 - flowTime * 0.35)) * baseAmp * 0.30;
  const puffS = Math.abs(Math.sin(x * 0.68 + y * 0.55 + flowTime * 0.6) *
                         Math.sin(x * 0.52 - y * 0.74 - flowTime * 0.5)) * baseAmp * 0.14;
  const wave3 = (puffL + puffM + puffS - 0.405 * 0.99 * baseAmp) * islandFade;

  let crashWave = 0;
  if (dist < 30 && dist > 14) {
    const angle = Math.atan2(y, x);
    const phase = dist * 0.8 - time * 2.0 + Math.sin(angle * 3.0 + time * 0.4) * 1.6;
    const sectorAmp = 0.65 + 0.35 * Math.sin(angle * 2.0 - time * 0.3);
    crashWave = Math.pow(Math.sin(phase) * 0.5 + 0.5, 3.0) * baseAmp * 1.3 * sectorAmp;
    const fade = Math.min(1.0, (dist - 14) / 4.0) * Math.min(1.0, (30 - dist) / 5.0);
    crashWave *= fade * islandFade;
  }

  return wave1 + wave2 + wave3 + crashWave;
}

let freezeScale = 1;

export function updateWaveFreezeScale(isFrozen: boolean, delta: number) {
  freezeScale += ((isFrozen ? 0 : 1) - freezeScale) * Math.min(1, delta * 1.2);
}

export function getWaveAmplitude(weather: string) {
  let mult = 1.8;
  if (weather === 'rainy') mult = 3.0;
  if (weather === 'stormy') mult = 4.5;
  return mult * (useGameStore.getState().waveIntensity ?? 1) * freezeScale;
}

export function getWaterHeight(x: number, z: number, time: number, weather: string) {
  let flowSpeed = 3.0;
  if (weather === 'rainy') flowSpeed = 4.5;
  if (weather === 'stormy') flowSpeed = 6.0;
  return -0.4 + sampleOceanWave(x, -z, time, flowSpeed, getWaveAmplitude(weather));
}
