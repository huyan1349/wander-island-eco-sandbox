import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store';

// 出生「弹入」动画：缩放从 0 阻尼增长到目标值，供各装饰/植物/建筑组件复用。
export function usePopIn(targetScale: number = 1) {
  const ref = useRef<any>(null);
  useFrame((_, delta) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (ref.current && ref.current.scale.x < targetScale) {
      const nextScale = THREE.MathUtils.damp(ref.current.scale.x, targetScale, 5, delta);
      ref.current.scale.set(nextScale, nextScale, nextScale);
    }
  });
  return ref;
}
