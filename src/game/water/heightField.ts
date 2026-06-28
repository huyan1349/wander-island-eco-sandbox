import * as THREE from 'three';
import { useGameStore } from '../../store';

/**
 * 地形高度场贴图：把主岛 terrainData 的 Y 烘成一张 (segments+1)² 的半浮点纹理，
 * 供水的着色器按世界 (x,z) 采样水底高度 → 算「水柱厚度」做体积着色（深浅/岸线/透明）。
 *
 * 索引与 buildHeightSampler 完全一致（round 到网格 + 双线性由纹理 LinearFilter 完成），
 * 保证水深和地形严丝合缝。只在地形被编辑时重建一次，不进每帧。
 */

let tex: THREE.DataTexture | null = null;
let texW = 0;
let islandSize = 0;

export function updateHeightField(): void {
  const data = useGameStore.getState().terrainData;
  const positions = data?.positions;
  if (!positions) return;

  const { size, segments } = data;
  const W = segments + 1;
  const half = size / 2;

  const grid = new Float32Array(W * W);
  const filled = new Uint8Array(W * W);
  for (let i = 0; i < positions.length; i += 3) {
    const col = Math.round(((positions[i] + half) / size) * segments);
    const row = Math.round(((positions[i + 2] + half) / size) * segments);
    if (col < 0 || col >= W || row < 0 || row >= W) continue;
    grid[row * W + col] = positions[i + 1];
    filled[row * W + col] = 1;
  }

  if (!tex || texW !== W) {
    tex = new THREE.DataTexture(new Uint16Array(W * W * 4), W, W, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    texW = W;
  }

  const buf = tex.image.data as Uint16Array;
  for (let i = 0; i < W * W; i++) {
    // 未填充格点回退到很低（视作深水），由 LinearFilter 在边缘平滑
    const y = filled[i] ? grid[i] : -3;
    buf[i * 4] = THREE.DataUtils.toHalfFloat(y);
  }
  tex.needsUpdate = true;
  islandSize = size;
}

export function getHeightField(): { tex: THREE.DataTexture; size: number } | null {
  return tex ? { tex, size: islandSize } : null;
}
