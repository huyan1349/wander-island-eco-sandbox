import { useGameStore, PlacedAsset } from '../store';
import { memo, useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AudioSystem } from '../lib/audio';
import { SpotLight, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { getTerrainHeight, getTerrainGradient } from '../utils/terrain';
import { applyTerrainBrush, paintSurface } from '../utils/terrainBrush';
import { getWaterHeight as getOceanHeight, getWaveAmplitude } from '../game/water/oceanModel';
import { DepthWater, WaterfallSheet, FlowRibbon } from '../game/water/DepthWater';
import { StylizedWater } from '../game/water/StylizedWater';
import { decodePondState, carvePondAndEncode } from '../game/water/pondFit';
import { buildStream, decodeStreamState } from '../game/water/streamPath';
import {
  createLocomotionState,
  stepCreature,
  updateWanderTarget,
  computeLegAngles,
  applyLocomotionToGroup,
} from '../game/creatures/locomotion';
import {
  Balloon as MarineBalloon,
  Boat as MarineBoat,
  BridgePillar as MarineBridgePillar,
  BridgeRenderer as MarineBridgeRenderer,
  MarineAssetIndexProvider,
  Pier as MarinePier,
  Platform as MarinePlatform,
  RopeRenderer as MarineRopeRenderer,
} from './assets/marine';
import { usePopIn } from './assets/shared';
import { TreeA, TreeB, Rock, CherryTree, Bamboo, PineTree, WillowTree, Bush } from './assets/Plants';

const subIslandNoise = createNoise2D();
const MAIN_ISLAND_SIZE = 40;
const SUB_ISLAND_SIZE = MAIN_ISLAND_SIZE * (2 / 3);
const SUB_ISLAND_SEGMENTS = 32;
const LEGACY_SUB_ISLAND_SIZE = 20;
const STRUCTURE_WALK_RADIUS_SQ = 1.8 * 1.8;
const CROP_GROWTH_DURATION = 40;

export function useHoverInteraction() {
  const [showHover, setShowHover] = useState(false);
  const [isHoverLeaving, setIsHoverLeaving] = useState(false);
  const hoverTimeout = useRef<any>(null);

  const keepHoverAlive = () => {
      setShowHover(true);
      setIsHoverLeaving(false);
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      hoverTimeout.current = setTimeout(() => {
          setIsHoverLeaving(true);
          hoverTimeout.current = setTimeout(() => {
              setShowHover(false);
              setIsHoverLeaving(false);
          }, 500);
      }, 2000);
  };

  const forceClose = () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      setShowHover(false);
      setIsHoverLeaving(false);
  };

  return { showHover, isHoverLeaving, keepHoverAlive, forceClose };
}

export function HoverButton({ showHover, isHoverLeaving, keepHoverAlive, onClick, iconSvg, yOffset = 1.4 }: any) {
   if (!showHover && !isHoverLeaving) return null;
   return (
       <Html position={[0, yOffset, 0]} center zIndexRange={[100, 0]}>
          <div 
             style={{ padding: '60px', cursor: 'pointer' }}
             onPointerEnter={() => { keepHoverAlive(); }}
             onPointerLeave={() => { keepHoverAlive(); }}
             onClick={onClick}
          >
            <div style={{ animation: 'boatHoverFloat 3s ease-in-out infinite' }}>
               <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '64px',
                    height: '64px',
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(12px)',
                    border: '2px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '50%',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.2) inset',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    animation: isHoverLeaving ? 'bubblePopOut 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards' : 'bubblePopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    color: '#334155'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15) translateY(-5px)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 1)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255,255,255,0.4) inset'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) translateY(0px)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.2) inset'; }}
               >
                 {iconSvg}
               </div>
            </div>
          </div>
        </Html>
   );
}

function getCropGrowthProgress(asset: Partial<PlacedAsset>, playtime: number) {
  if (typeof asset.growthProgress === 'number' && asset.growthProgress >= 1) return 1;
  if (typeof asset.plantedAt === 'number') {
    return Math.min(1, Math.max(asset.growthProgress ?? 0, (playtime - asset.plantedAt) / CROP_GROWTH_DURATION));
  }
  return asset.growthProgress ?? 0;
}

function SelectableAssetWrapper({
  assetId,
  children
}: {
  assetId: string;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const helperRef = useRef<THREE.Box3Helper | null>(null);
  const scene = useThree(state => state.scene);
  const selectedTool = useGameStore(state => state.selectedTool);
  const selectedEntityId = useGameStore(state => state.selectedEntityId);
  const setSelectedEntityId = useGameStore(state => state.setSelectedEntityId);
  const isSelected = selectedTool === 'eraser' && selectedEntityId === assetId;

  useEffect(() => {
    if (!isSelected || !groupRef.current) {
      if (helperRef.current) {
        scene.remove(helperRef.current);
        helperRef.current.geometry.dispose();
        (helperRef.current.material as THREE.Material).dispose();
        helperRef.current = null;
      }
      return;
    }

    const helper = new THREE.Box3Helper(new THREE.Box3().setFromObject(groupRef.current), new THREE.Color('#facc15'));
    const material = helper.material as THREE.LineBasicMaterial;
    material.depthTest = false;
    material.transparent = true;
    material.opacity = 0.95;
    helper.renderOrder = 999;
    helperRef.current = helper;
    scene.add(helper);

    return () => {
      scene.remove(helper);
      helper.geometry.dispose();
      material.dispose();
      if (helperRef.current === helper) helperRef.current = null;
    };
  }, [isSelected, scene]);

  useFrame(() => {
    if (isSelected && helperRef.current && groupRef.current) {
      helperRef.current.box.setFromObject(groupRef.current);
      helperRef.current.updateMatrixWorld(true);
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={(e) => {
        if (selectedTool !== 'eraser') return;
        e.stopPropagation();
        // 第一次点击先定位（高亮选中）；再次点中同一物体即直接擦除。
        const store = useGameStore.getState();
        if (store.selectedEntityId === assetId) {
          store.removeAsset(assetId);
          store.setSelectedEntityId(null);
          AudioSystem.playDig();
        } else {
          setSelectedEntityId(assetId);
        }
      }}
    >
      {children}
    </group>
  );
}

function normalizeSubIslandTerrainData(terrain: {
  positions: number[];
  types: number[];
  size: number;
  segments: number;
}, seedX: number, seedZ: number) {
  const hasEditedTypes = terrain.types.some((type) => type !== 0);
  if (terrain.size === LEGACY_SUB_ISLAND_SIZE && !hasEditedTypes) {
    return generateSubIslandTerrain(seedX, seedZ);
  }

  const expectedGridLength = (terrain.segments + 1) * (terrain.segments + 1) * 3;
  if (terrain.positions.length !== expectedGridLength) {
    return terrain;
  }

  const gridPos: number[][][] = [];
  const vertsPerRow = terrain.segments + 1;
  for (let row = 0; row <= terrain.segments; row++) {
    const line = [];
    for (let col = 0; col <= terrain.segments; col++) {
      const idx = (row * vertsPerRow + col) * 3;
      line.push([
        terrain.positions[idx],
        terrain.positions[idx + 1],
        terrain.positions[idx + 2]
      ]);
    }
    gridPos.push(line);
  }

  const positions: number[] = [];
  const types: number[] = [];
  const halfSize = terrain.size / 2;
  const segmentSize = terrain.size / terrain.segments;
  const islandRadius = terrain.size * 0.46 * 1.06;

  const pushVertex = (r: number, c: number) => {
    const [x, y, z] = gridPos[r][c];
    positions.push(x, y, z);
    const typeIdx = r * vertsPerRow + c;
    types.push(terrain.types[typeIdx] ?? 0);
  };

  for (let row = 0; row < terrain.segments; row++) {
    for (let col = 0; col < terrain.segments; col++) {
      const x = (col + 0.5) * segmentSize - halfSize;
      const z = (row + 0.5) * segmentSize - halfSize;
      if (Math.sqrt(x * x + z * z) > islandRadius) continue;

      pushVertex(row, col + 1);
      pushVertex(row, col);
      pushVertex(row + 1, col + 1);

      pushVertex(row, col);
      pushVertex(row + 1, col);
      pushVertex(row + 1, col + 1);
    }
  }

  return {
    positions,
    types,
    size: terrain.size,
    segments: terrain.segments
  };
}

function ParticleBurst({ position, color }: { position: THREE.Vector3, color: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 12;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
       x: position.x,
       y: position.y + 0.2,
       z: position.z,
       vx: (Math.random() - 0.5) * 0.15,
       vy: Math.random() * 0.15 + 0.05,
       vz: (Math.random() - 0.5) * 0.15,
       scale: Math.random() * 0.4 + 0.1
    }));
  }, [position]);

  const age = useRef(0);

  useFrame((_, delta) => {
     if (!meshRef.current) return;
     age.current += delta;
     
     particles.forEach((p, i) => {
         p.vy -= delta * 0.5;
         p.x += p.vx;
         p.y += p.vy;
         p.z += p.vz;
         p.scale = Math.max(0, p.scale - delta * 0.8);
         
         dummy.position.set(p.x, p.y, p.z);
         dummy.scale.setScalar(p.scale);
         dummy.updateMatrix();
         meshRef.current?.setMatrixAt(i, dummy.matrix);
     });
     meshRef.current.instanceMatrix.needsUpdate = true;
     
     if (age.current > 1 && meshRef.current) {
         meshRef.current.visible = false;
     }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={color} flatShading />
    </instancedMesh>
  );
}

function generateSubIslandTerrain(seedX: number, seedZ: number) {
  const gridPos: number[][][] = [];
  const halfSize = SUB_ISLAND_SIZE / 2;
  const segmentSize = SUB_ISLAND_SIZE / SUB_ISLAND_SEGMENTS;
  const maxDist = SUB_ISLAND_SIZE / 2;
  const hardEdge = maxDist * 0.9;
  const softEdge = maxDist * 0.8;

  for (let row = 0; row <= SUB_ISLAND_SEGMENTS; row++) {
    const line = [];
    const z = row * segmentSize - halfSize;
    for (let col = 0; col <= SUB_ISLAND_SEGMENTS; col++) {
      const x = col * segmentSize - halfSize;
      const dist = Math.sqrt(x * x + z * z);

      let height = (maxDist - dist) * 0.5;
      if (dist > hardEdge) {
        height = -20;
      } else if (dist > softEdge) {
        height -= (dist - softEdge) * 1.5;
      }

      if (height > 0) {
        // Keep the same overall island logic as the main island, but add milder
        // low-frequency variation so the silhouette feels related rather than noisy.
        height += subIslandNoise(seedX * 0.08 + x * 0.1, seedZ * 0.08 + z * 0.1) * 0.9;
        height += subIslandNoise(seedX * 0.19 + x * 0.2, seedZ * 0.19 + z * 0.2) * 0.35;
           if (height < 0.5) height = 0.2;
      } else {
        height = -2;
      }

      line.push([x, height, z]);
    }
    gridPos.push(line);
  }

  const positions: number[] = [];
  const types: number[] = [];

  const pushVertex = (r: number, c: number) => {
    const [x, y, z] = gridPos[r][c];
    positions.push(x, y, z);
    types.push(0);
  };

  for (let row = 0; row < SUB_ISLAND_SEGMENTS; row++) {
    for (let col = 0; col < SUB_ISLAND_SEGMENTS; col++) {
      const x = (col + 0.5) * segmentSize - halfSize;
      const z = (row + 0.5) * segmentSize - halfSize;
      if (Math.sqrt(x * x + z * z) > maxDist * 0.925) continue;

      pushVertex(row, col + 1);
      pushVertex(row, col);
      pushVertex(row + 1, col + 1);

      pushVertex(row, col);
      pushVertex(row + 1, col);
      pushVertex(row + 1, col + 1);
    }
  }

  return {
    positions,
    types,
    size: SUB_ISLAND_SIZE,
    segments: SUB_ISLAND_SEGMENTS
  };
}

// Pop-in hook for assets
// Shared natural water surface: a low-poly disc with gentle JS-driven vertex
// ripples (no GLSL) + a soft expanding ring, so springs/ponds read as real,
// moving water instead of a flat metal disc. depthWrite stays on so it never
// clips through terrain.
function WaterSurface({
  radius = 1,
  color = '#5fb4e6',
  deep = '#2f6f9e',
  opacity = 0.78,
  segments = 28,
}: { radius?: number; color?: string; deep?: string; opacity?: number; segments?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const base = useRef<Float32Array | null>(null);

  // Snapshot the flat geometry once so ripples are applied relative to it.
  useEffect(() => {
    const geo = meshRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (geo) base.current = (geo.attributes.position.array as Float32Array).slice();
  }, []);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const geo = meshRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (geo && base.current) {
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const b = base.current;
      const amp = radius * 0.025;
      for (let i = 0; i < pos.count; i++) {
        const x = b[i * 3];
        const y = b[i * 3 + 1];
        const r = Math.sqrt(x * x + y * y);
        // CircleGeometry lies in its local XY plane (z is the surface normal).
        const z = (Math.sin(r * 2.2 - t * 1.6) + Math.sin(x * 1.7 + t * 1.1)) * amp;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }
    if (matRef.current) matRef.current.opacity = opacity + Math.sin(t * 1.3) * 0.03;
    if (ringRef.current) {
      const p = (t * 0.35) % 1;
      const sc = 0.15 + p * 0.95;
      ringRef.current.scale.set(sc, sc, sc);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.22;
    }
  });

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={meshRef} receiveShadow>
        <circleGeometry args={[radius, segments]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={deep}
          emissiveIntensity={0.18}
          transparent
          opacity={opacity}
          roughness={0.12}
          metalness={0.55}
          flatShading
        />
      </mesh>
      {/* Soft concentric ripple ring radiating from the centre */}
      <mesh ref={ringRef} position={[0, 0, 0.02]}>
        <ringGeometry args={[radius * 0.82, radius * 0.98, 40]} />
        <meshBasicMaterial color="#cdeeff" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Spring({ position, rotation, scale = 1, customState }: { position: any, rotation?: any, scale?: number, customState?: string }) {
  const groupRef = usePopIn(scale * 1.2);
  const fit = decodePondState(customState);
  const waterLevel = fit ? fit.waterLevel : position.y + 0.1;
  const radius = fit ? fit.radius : 1.2;

  // A handful of mossy rim stones at irregular angles around the pool.
  const stones = useMemo(() => {
    const arr: { a: number; r: number; s: number; c: string }[] = [];
    const palette = ['#8a9aa6', '#76858f', '#9bab9a'];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (Math.sin(i * 2.3) * 0.25);
      arr.push({ a, r: 1.15 + Math.sin(i * 1.7) * 0.1, s: 0.22 + Math.abs(Math.sin(i * 3.1)) * 0.18, c: palette[i % palette.length] });
    }
    return arr;
  }, []);

  // 相邻水体：和池塘同一套去重——落在邻近泉/塘水域内的苔石/芦苇不再生成，
  // 多个泉连片时只留整簇外圈，接缝处不再堆乱石。
  const assets = useGameStore(s => s.assets);
  const neighbors = useMemo(
    () =>
      assets
        .filter(a => (a.type === 'pond' || a.type === 'spring')
          && (a.position.x !== position.x || a.position.z !== position.z))
        .map(a => {
          const f = decodePondState(a.customState);
          return { x: a.position.x, z: a.position.z, r: f ? f.radius : 1.6 };
        }),
    [assets, position.x, position.z],
  );
  const insideNeighbor = (lx: number, lz: number) =>
    neighbors.some(o => Math.hypot(position.x + lx - o.x, position.z + lz - o.z) < o.r);

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0, 'YXZ')} scale={0} ref={groupRef}>
      {/* 保留拟合后的水位/半径，但回退到稳定的风格化水面，避免标题页因新深度水面黑屏 */}
      <group position={[0, waterLevel - position.y, 0]}>
        <StylizedWater radius={radius} segments={28} shallow="#9fe0f5" deep="#2f6f9e" opacity={0.82} waveAmp={0.7} />
      </group>
      {/* 苔石与芦苇装饰 */}
      <group>
        {stones.map((st, i) => {
          const lx = Math.cos(st.a) * st.r, lz = Math.sin(st.a) * st.r;
          if (insideNeighbor(lx, lz)) return null;
          return (
            <mesh key={i} position={[lx, 0.12, lz]} rotation={[st.a, st.a * 1.3, 0]} castShadow>
              <dodecahedronGeometry args={[st.s, 0]} />
              <meshStandardMaterial color={st.c} roughness={0.95} flatShading />
            </mesh>
          );
        })}
        {[[-0.7, 0.5], [0.6, -0.6], [0.85, 0.35]].map(([rx, rz], i) =>
          insideNeighbor(rx, rz) ? null : (
            <mesh key={`reed${i}`} position={[rx, 0.45, rz]} rotation={[0.12 * (i - 1), 0, 0.1 * (i - 1)]} castShadow>
              <coneGeometry args={[0.05, 0.9, 5]} />
              <meshStandardMaterial color="#5a9b4a" roughness={0.8} flatShading />
            </mesh>
          ),
        )}
      </group>
    </group>
  );
}

// Inland water body — a lake/pond for filling valleys and shaping river runs.
// Sits flat at its placement height; size scales with the placement scale.
function Pond({ position, rotation, scale = 1, customState }: { position: any, rotation?: any, scale?: number, customState?: string }) {
  const groupRef = usePopIn(scale);

  // 贴地拟合：放置时已写入 customState("pond:水位:半径")。有则按洼地岸线渲染，
  // 水面落在拟合水位（不再是悬浮糙盘）；无则回退旧的固定半径行为。
  const fit = decodePondState(customState);
  const radius = fit ? fit.radius : 3.0 * (scale || 1);
  // customState 里水位是世界 Y；本 group 位于 position.y，换算成局部高度。
  const waterLocalY = fit ? (fit.waterLevel - position.y) : 0.06;

  // Pebble shore ring around the water for a soft, natural edge.
  const pebbles = useMemo(() => {
    const arr: { a: number; s: number; c: string }[] = [];
    const palette = ['#b9a890', '#a89880', '#cdbda6', '#9fae9a'];
    const n = 10;
    for (let i = 0; i < n; i++) {
      arr.push({ a: (i / n) * Math.PI * 2 + Math.sin(i * 1.9) * 0.18, s: 0.16 + Math.abs(Math.sin(i * 2.7)) * 0.16, c: palette[i % palette.length] });
    }
    return arr;
  }, []);

  // 真实水位（世界 Y）：有拟合用拟合，否则回退到放置点略上方。
  const waterLevel = fit ? fit.waterLevel : position.y + 0.06;

  // 相邻湖泊：用于去重石头。落在邻湖水域内的石头不再生成，只留连片簇的外圈。
  const assets = useGameStore(s => s.assets);
  const neighbors = useMemo(
    () =>
      assets
        .filter(a => (a.type === 'pond' || a.type === 'spring')
          && (a.position.x !== position.x || a.position.z !== position.z))
        .map(a => {
          const f = decodePondState(a.customState);
          return { x: a.position.x, z: a.position.z, r: f ? f.radius : 1.6 };
        }),
    [assets, position.x, position.z],
  );

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0, 'YXZ')} scale={0} ref={groupRef}>
      {/* 先恢复到稳定的圆形风格化水面，仍然使用拟合后的半径和水位 */}
      <group position={[0, waterLevel - position.y, 0]}>
        <StylizedWater radius={radius} segments={44} shallow="#7fd0f2" deep="#1f5f8c" opacity={0.85} waveAmp={1} />
      </group>
      {/* 卵石岸：保留新加的邻水去重 */}
      <group>
        {pebbles.map((p, i) => {
          const wx = position.x + Math.cos(p.a) * radius;
          const wz = position.z + Math.sin(p.a) * radius;
          if (neighbors.some(o => Math.hypot(wx - o.x, wz - o.z) < o.r)) return null;
          return (
            <mesh key={i} position={[Math.cos(p.a) * radius * 1.0, waterLocalY - 0.02, Math.sin(p.a) * radius * 1.0]} rotation={[p.a, p.a, 0]} castShadow>
              <dodecahedronGeometry args={[p.s, 0]} />
              <meshStandardMaterial color={p.c} roughness={0.95} flatShading />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// 溪流 / 瀑布：从 customState 解析折线，构建贴地水带 + 落差处竖直水帘。
// 几何已是世界坐标，外层 wrapper group 位于原点，故本组件不再做位移。
function Stream({ customState }: { customState?: string }) {
  const build = useMemo(() => {
    const pts = decodeStreamState(customState);
    if (!pts) return null;
    return buildStream(pts, 1.5);
  }, [customState]);

  if (!build || !build.ribbon) return null;

  return (
    <group>
      {/* 贴地流动水带：复用海面波形 + 沿流向滚动水纹 + 两侧岸沫 */}
      <FlowRibbon geometry={build.ribbon} />
      {/* 瀑布：落差处真实流动的竖直水帘（复用海面配色，UV 下滚 + 顶/底白沫） */}
      {build.falls.map((f, i) => {
        const h = Math.max(0.3, f.topY - f.bottomY);
        const yaw = Math.atan2(f.dir.x, f.dir.z);
        return (
          <group key={i} position={[f.x, (f.topY + f.bottomY) / 2, f.z]} rotation={[0, yaw, 0]}>
            <WaterfallSheet width={f.width} height={h} />
          </group>
        );
      })}
    </group>
  );
}

function Streetlamp(props: any) {
  const { position, rotation, scale = 1 } = props;
  const groupRef = usePopIn(scale);
  useMarinePhysics(groupRef, props);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const isNight = timeOfDay > 18 || timeOfDay < 6;

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(rotation?.x || 0, rotation?.y || 0, rotation?.z || 0, 'YXZ')} scale={0} ref={groupRef}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.12, 3, 8]} />
        <meshStandardMaterial color="#1e293b" flatShading />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
            color={isNight ? "#fef08a" : "#94a3b8"} 
            emissive={isNight ? "#fef08a" : "#000000"} 
            emissiveIntensity={isNight ? 4 : 0} 
            toneMapped={false}
            flatShading
        />
      </mesh>
      {/* Light housing top */}
      <mesh position={[0, 3.4, 0]} castShadow>
          <coneGeometry args={[0.5, 0.4, 8]} />
          <meshStandardMaterial color="#0f172a" flatShading />
      </mesh>
      
      {/* Real Illumination Light */}
      {isNight && (
        <pointLight position={[0, 3.1, 0]} intensity={8.0} distance={25} decay={2} color="#fef08a" />
      )}
    </group>
  );
}

// Soft radial glow sprite texture, shared across all lanterns.
let _lanternGlowTex: THREE.CanvasTexture | null = null;
function getLanternGlowTexture() {
  if (_lanternGlowTex) return _lanternGlowTex;
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(160,200,255,0.45)');
  g.addColorStop(1, 'rgba(120,160,220,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _lanternGlowTex = new THREE.CanvasTexture(cv);
  return _lanternGlowTex;
}

// 小岛版提灯少女：原 glb 保留在资源目录，但建造物改为更清晰的程序化摆件。
const LANTERN_SCALE = 1.15;
function LanternGirl(props: any) {
  const { position, rotation, scale = 1 } = props;
  const groupRef = usePopIn(scale);
  const glowTex = useMemo(() => getLanternGlowTexture(), []);
  const S = LANTERN_SCALE;
  const lanternPos: [number, number, number] = [0.52 * S, 1.18 * S, 0.18 * S];
  const faceLightTarget: [number, number, number] = [0.03 * S, 1.58 * S, 0.02 * S];

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(rotation?.x || 0, rotation?.y || 0, rotation?.z || 0, 'YXZ')} scale={0} ref={groupRef}>
      <group scale={S}>
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <cylinderGeometry args={[0.42, 0.56, 0.12, 18]} />
          <meshStandardMaterial color="#d7e0e8" roughness={0.86} metalness={0.03} flatShading />
        </mesh>
        <mesh position={[0, 0.52, 0]} rotation={[0.03, 0, -0.04]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.34, 0.82, 10]} />
          <meshStandardMaterial color="#a7b4c1" roughness={0.94} metalness={0.02} flatShading />
        </mesh>
        <mesh position={[0, 1.03, -0.01]} rotation={[0, 0, -0.07]} castShadow receiveShadow>
          <sphereGeometry args={[0.25, 12, 9]} />
          <meshStandardMaterial color="#7d8b9b" roughness={0.94} metalness={0.02} flatShading />
        </mesh>
        <mesh position={[0.02, 1.02, 0.2]} rotation={[0, 0, -0.04]}>
          <sphereGeometry args={[0.155, 10, 6]} />
          <meshStandardMaterial color="#dfeaf4" emissive="#8bbcff" emissiveIntensity={0.25} roughness={0.7} flatShading />
        </mesh>
        <mesh position={[0.02, 1.065, 0.235]} rotation={[0, 0, -0.04]}>
          <boxGeometry args={[0.18, 0.018, 0.018]} />
          <meshBasicMaterial color="#526273" />
        </mesh>
        <mesh position={[-0.12, 0.78, 0.02]} rotation={[0.08, 0, 0.3]} castShadow receiveShadow>
          <capsuleGeometry args={[0.045, 0.35, 3, 8]} />
          <meshStandardMaterial color="#9aa9b8" roughness={0.92} flatShading />
        </mesh>
        <mesh position={[0.24, 0.8, 0.02]} rotation={[0.08, 0, -0.5]} castShadow receiveShadow>
          <capsuleGeometry args={[0.045, 0.42, 3, 8]} />
          <meshStandardMaterial color="#9aa9b8" roughness={0.92} flatShading />
        </mesh>
        <mesh position={[0.4, 1.1, 0.12]} rotation={[0, 0, 0.06]} castShadow receiveShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.36, 6]} />
          <meshStandardMaterial color="#566170" roughness={0.8} flatShading />
        </mesh>
        <mesh position={lanternPos} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.26, 8]} />
          <meshStandardMaterial color="#9fc7ff" emissive="#78aaff" emissiveIntensity={3.6} toneMapped={false} roughness={0.38} />
        </mesh>
        <mesh position={[lanternPos[0], lanternPos[1] + 0.16, lanternPos[2]]} castShadow receiveShadow>
          <coneGeometry args={[0.12, 0.1, 8]} />
          <meshStandardMaterial color="#5f6b79" roughness={0.75} flatShading />
        </mesh>
        <mesh position={[lanternPos[0], lanternPos[1] - 0.15, lanternPos[2]]} castShadow receiveShadow>
          <cylinderGeometry args={[0.09, 0.12, 0.045, 8]} />
          <meshStandardMaterial color="#5f6b79" roughness={0.75} flatShading />
        </mesh>
      </group>
      {/* 体积光晕：两层 additive sprite */}
      <sprite position={lanternPos} scale={[1.2, 1.2, 1]} renderOrder={3}>
        <spriteMaterial map={glowTex} color="#aaccff" transparent opacity={0.48} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite position={lanternPos} scale={[2.8, 2.8, 1]} renderOrder={2}>
        <spriteMaterial map={glowTex} color="#6699cc" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* 灯心实光：冷光从手里的灯笼扩散，并给脸部一个柔和补光方向 */}
      <pointLight position={lanternPos} color="#88bbff" intensity={3.8} distance={4.5} decay={2} castShadow />
      <spotLight
        position={lanternPos}
        target-position={faceLightTarget}
        color="#c7ddff"
        intensity={1.9}
        distance={3.2}
        angle={0.65}
        penumbra={0.78}
        decay={2}
      />
    </group>
  );
}

export function isWalkable(x: number, z: number, assets: any[]) {
    const groundY = getTerrainHeight(x, z);
    if (groundY > -0.1) return true; // Land

    const state = useGameStore.getState();
    if (state.biome === 'tundra' || state.season === 'winter') {
        return true; // Ocean is frozen, can walk anywhere!
    }

    for (const a of assets) {
        if (a.type === 'platform' || a.type === 'pier' || a.type === 'bridge') {
            const dx = a.position.x - x;
            const dz = a.position.z - z;
            if (dx * dx + dz * dz < STRUCTURE_WALK_RADIUS_SQ) return true;
        }
    }
    return false;
}

export function getWalkableHeight(x: number, z: number, time: number, weather: string, assets: any[]) {
    const groundY = getTerrainHeight(x, z);
    let surfaceY = groundY;
    let onStructure = false;
    for (const a of assets) {
        if (a.type === 'platform' || a.type === 'pier' || a.type === 'bridge') {
            const dx = a.position.x - x;
            const dz = a.position.z - z;
            if (dx * dx + dz * dz < STRUCTURE_WALK_RADIUS_SQ) {
                if (a.type === 'platform') surfaceY = getWaterHeight(x, z, time, weather);
                else surfaceY = a.position.y;
                onStructure = true;
                break;
            }
        }
    }
    return { y: surfaceY, onStructure };
}

function Deer({ position, scale = 1, id }: { position: any, scale?: number, id: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const currentScale = useRef(0);
  const aiTickRef = useRef(0);
  const hunger = useRef(Math.random() * 50);

  // 使用 locomotion 模块
  const locoRef = useRef<ReturnType<typeof createLocomotionState> | null>(null);
  if (locoRef.current === null) {
    locoRef.current = createLocomotionState(
      position.x, position.y, position.z,
      Math.random() * Math.PI * 2
    );
    locoRef.current.aiState = 'wander';
  }
  const loco = locoRef.current;

  const DEER_CFG = useMemo(() => ({
    speed: 1.2,
    runSpeed: 4.0,
    fleeSpeed: 5.0,
    turnRate: 2.5,
    arriveRadius: 1.5,
    stepLength: 0.6,
    obstacleProbeDistance: 1.5,
    wanderDriftRate: 0.3,
    wanderTargetInterval: 3,
    slopeAlignStrength: 0.4,
  }), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Pop in scale
    if (useGameStore.getState().isSplashDone && currentScale.current < scale * 0.5) {
         currentScale.current = THREE.MathUtils.damp(currentScale.current, scale * 0.5, 5, delta);
         groupRef.current.scale.setScalar(currentScale.current);
    }

    const t = state.clock.getElapsedTime();
    const allAssets = useGameStore.getState().assets;
    const weather = useGameStore.getState().weather;

    hunger.current += delta;
    aiTickRef.current += delta;

    // ── AI 逻辑 (设定 target 与 state) ─────────────────
    if (aiTickRef.current >= 0.18) {
        aiTickRef.current = 0;

        const timeOfDay = useGameStore.getState().timeOfDay;
        const isNight = timeOfDay > 20 || timeOfDay < 5;

        let nearestWolf = null;
        let nearestWolfDx = 0;
        let nearestWolfDz = 0;
        let nearestTree = null;
        let nearestFood = null;
        let nearestWater = null;
        let waterDistSq = Infinity;
        let wolfDistSq = Infinity;

        // 鹿群 cohesion: 找到其他鹿的质心
        let herdCenterX = 0;
        let herdCenterZ = 0;
        let herdCount = 0;

        for (const asset of allAssets) {
            if (asset.type === 'wolf') {
                const dx = loco.position.x - asset.position.x;
                const dz = loco.position.z - asset.position.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < wolfDistSq) {
                    wolfDistSq = distSq;
                    nearestWolf = asset;
                    nearestWolfDx = dx;
                    nearestWolfDz = dz;
                }
            } else if (!nearestTree && (asset.type === 'treeA' || asset.type === 'treeB' || asset.type === 'cherry_tree' || asset.type === 'pine_tree' || asset.type === 'willow_tree')) {
                nearestTree = asset;
            } else if (
                !nearestFood &&
                (asset.type === 'crop_wheat' || asset.type === 'crop_carrot') &&
                getCropGrowthProgress(asset, useGameStore.getState().stats.playtime) >= 1
            ) {
                nearestFood = asset;
            } else if (asset.type === 'spring' || asset.type === 'pond') {
                const dx = loco.position.x - asset.position.x;
                const dz = loco.position.z - asset.position.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < waterDistSq) {
                    waterDistSq = distSq;
                    nearestWater = asset;
                }
            } else if (asset.type === 'deer' && asset.id !== id) {
                herdCenterX += asset.position.x;
                herdCenterZ += asset.position.z;
                herdCount++;
            }
        }

        // ── 昼夜节律：夜里卧下 ──────────────────────────
        if (isNight && wolfDistSq > 15 * 15) {
            loco.aiState = 'idle';
            // 夜里偶尔微移
            if (Math.random() < 0.005) {
                const randX = loco.position.x + (Math.random() - 0.5) * 2;
                const randZ = loco.position.z + (Math.random() - 0.5) * 2;
                if (isWalkable(randX, randZ, allAssets)) {
                    loco.target.set(randX, 0, randZ);
                    loco.aiState = 'wander';
                }
            }
        }
        // ── 逃跑 ────────────────────────────────────────
        else if (wolfDistSq < 15 * 15) {
            loco.aiState = 'flee';
            const wolfLen = Math.hypot(nearestWolfDx, nearestWolfDz) || 1;
            const dirX = nearestWolfDx / wolfLen;
            const dirZ = nearestWolfDz / wolfLen;
            const fleeDist = 8;
            loco.target.set(
              loco.position.x + dirX * fleeDist,
              0,
              loco.position.z + dirZ * fleeDist
            );
        }
        // ── 吃东西 ──────────────────────────────────────
        else if (hunger.current > 30) {
            loco.aiState = 'graze';
            if (nearestFood) {
                loco.target.set(nearestFood.position.x, 0, nearestFood.position.z);
                const foodDx = nearestFood.position.x - loco.position.x;
                const foodDz = nearestFood.position.z - loco.position.z;
                if (foodDx * foodDx + foodDz * foodDz < 1.0) {
                    useGameStore.getState().removeAsset(nearestFood.id);
                    hunger.current = 0;
                    loco.aiState = 'idle';
                }
            } else if (nearestTree) {
                loco.target.set(nearestTree.position.x, 0, nearestTree.position.z);
                const treeDx = nearestTree.position.x - loco.position.x;
                const treeDz = nearestTree.position.z - loco.position.z;
                if (treeDx * treeDx + treeDz * treeDz < 9) {
                    hunger.current = 0;
                    loco.aiState = 'graze';
                }
            } else {
                loco.aiState = 'wander';
            }
        }
        // ── 喝水 (渴了且附近有水源) ─────────────────────
        else if (hunger.current > 15 && nearestWater && waterDistSq < 100) {
            loco.aiState = 'drink';
            loco.target.set(nearestWater.position.x, 0, nearestWater.position.z);
            if (waterDistSq < 4) {
                hunger.current = Math.max(0, hunger.current - 5);
                if (Math.random() < 0.1) loco.aiState = 'idle';
            }
        }
        // ── 游荡 ────────────────────────────────────────
        else {
            loco.aiState = 'wander';
        }

        const grassHealth = useGameStore.getState().grassHealth;
        if (grassHealth <= 0 && Math.random() < 0.001 && !nearestFood) {
            useGameStore.getState().removeAsset(id);
            return;
        }

        // 游荡目标更新 + 鹿群 cohesion：统一在此调用一次，覆盖所有进入 wander 的路径
        // （含「饿了找不到树→wander」「夜里微移→wander」），避免某些路径目标不刷新而卡住，
        // 也避免之前在分支内重复调用导致的航向翻倍抖动。
        if (loco.aiState === 'wander') {
            updateWanderTarget(loco, DEER_CFG, allAssets);
            if (herdCount > 0) {
                herdCenterX /= herdCount;
                herdCenterZ /= herdCount;
                const toHerdDx = herdCenterX - loco.position.x;
                const toHerdDz = herdCenterZ - loco.position.z;
                const toHerdDist = Math.sqrt(toHerdDx * toHerdDx + toHerdDz * toHerdDz);
                if (toHerdDist > 6) {
                    loco.target.x += toHerdDx * 0.05;
                    loco.target.z += toHerdDz * 0.05;
                } else if (toHerdDist < 1.5) {
                    loco.target.x -= toHerdDx * 0.05;
                    loco.target.z -= toHerdDz * 0.05;
                }
            }
        }
    }

    // ── 运动逻辑 (交给 locomotion 模块) ─────────────────
    // dt 钳到上限：掉帧时 delta 飙高会让 step 跨一大步造成「瞬移」
    const dt = Math.min(delta, 0.05);
    stepCreature(loco, dt, DEER_CFG, {
      time: t,
      delta: dt,
      assets: allAssets,
      weather,
    });

    // ── 应用到 Three.js Group ───────────────────────────
    applyLocomotionToGroup(groupRef.current, loco, 0.02);

    // ── 头部动画 ────────────────────────────────────────
    const head = groupRef.current.getObjectByName('head');
    if (head) {
         if ((loco.aiState === 'graze' || loco.aiState === 'drink') && !loco.isMoving) head.rotation.x = 0.8;
         else head.rotation.x = Math.sin(loco.legPhase * Math.PI * 2 * 0.5) * 0.15;
    }

    // ── 腿部动画 (位移驱动) ─────────────────────────────
    const legAngles = computeLegAngles(loco.legPhase, loco.isMoving);
    const legFL = groupRef.current.getObjectByName('legFL');
    const legFR = groupRef.current.getObjectByName('legFR');
    const legBL = groupRef.current.getObjectByName('legBL');
    const legBR = groupRef.current.getObjectByName('legBR');

    if (legFL && legFR && legBL && legBR) {
        legFL.rotation.x = legAngles.fl;
        legBR.rotation.x = legAngles.br;
        legFR.rotation.x = legAngles.fr;
        legBL.rotation.x = legAngles.bl;
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    useGameStore.getState().setSelectedEntityId(id);
  };

  return (
    <group position={[position.x, position.y, position.z]} scale={scale * 0.5} ref={groupRef} castShadow onPointerDown={handlePointerDown}>
      {/* Body - elongated torso with belly */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.45, 0.55, 1.3]} />
        <meshStandardMaterial color="#92400e" flatShading />
      </mesh>
      {/* Belly - lighter underside */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[0.4, 0.2, 1.1]} />
        <meshStandardMaterial color="#d6d3d1" flatShading />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.2, 0.55]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.25, 0.5, 0.35]} />
        <meshStandardMaterial color="#a16207" flatShading />
      </mesh>
      {/* Head */}
      <group name="head" position={[0, 1.45, 0.75]}>
         <mesh position={[0, 0, 0]} castShadow>
           <boxGeometry args={[0.28, 0.3, 0.35]} />
           <meshStandardMaterial color="#b45309" flatShading />
         </mesh>
         {/* Snout */}
         <mesh position={[0, -0.08, 0.22]} castShadow>
           <boxGeometry args={[0.18, 0.14, 0.2]} />
           <meshStandardMaterial color="#78350f" flatShading />
         </mesh>
         {/* Eyes */}
         <mesh position={[-0.12, 0.05, 0.12]} castShadow>
           <boxGeometry args={[0.06, 0.06, 0.04]} />
           <meshStandardMaterial color="#1c1917" />
         </mesh>
         <mesh position={[0.12, 0.05, 0.12]} castShadow>
           <boxGeometry args={[0.06, 0.06, 0.04]} />
           <meshStandardMaterial color="#1c1917" />
         </mesh>
         {/* Ears */}
         <mesh position={[-0.12, 0.22, -0.05]} rotation={[0, 0, 0.2]} castShadow>
           <boxGeometry args={[0.08, 0.18, 0.06]} />
           <meshStandardMaterial color="#a16207" flatShading />
         </mesh>
         <mesh position={[0.12, 0.22, -0.05]} rotation={[0, 0, -0.2]} castShadow>
           <boxGeometry args={[0.08, 0.18, 0.06]} />
           <meshStandardMaterial color="#a16207" flatShading />
         </mesh>
         {/* Antlers - branching */}
         <group position={[-0.1, 0.3, -0.05]}>
           <mesh position={[0, 0.2, 0]} castShadow>
             <boxGeometry args={[0.04, 0.4, 0.04]} />
             <meshStandardMaterial color="#fef3c7" flatShading />
           </mesh>
           <mesh position={[0.06, 0.35, 0]} castShadow>
             <boxGeometry args={[0.04, 0.2, 0.04]} />
             <meshStandardMaterial color="#fef3c7" flatShading />
           </mesh>
         </group>
         <group position={[0.1, 0.3, -0.05]}>
           <mesh position={[0, 0.2, 0]} castShadow>
             <boxGeometry args={[0.04, 0.4, 0.04]} />
             <meshStandardMaterial color="#fef3c7" flatShading />
           </mesh>
           <mesh position={[-0.06, 0.35, 0]} castShadow>
             <boxGeometry args={[0.04, 0.2, 0.04]} />
             <meshStandardMaterial color="#fef3c7" flatShading />
           </mesh>
         </group>
      </group>
      {/* Tail */}
      <mesh position={[0, 1.0, -0.7]} rotation={[-0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.25]} />
        <meshStandardMaterial color="#d6d3d1" flatShading />
      </mesh>
      {/* Legs & Hooves */}
      <group name="legBL" position={[-0.18, 0.8, -0.45]}>
          <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.09, 0.8, 0.09]} /><meshStandardMaterial color="#78350f" flatShading /></mesh>
          <mesh position={[0, -0.78, 0]} castShadow><boxGeometry args={[0.1, 0.04, 0.1]} /><meshStandardMaterial color="#44403c" flatShading /></mesh>
      </group>
      <group name="legBR" position={[0.18, 0.8, -0.45]}>
          <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.09, 0.8, 0.09]} /><meshStandardMaterial color="#78350f" flatShading /></mesh>
          <mesh position={[0, -0.78, 0]} castShadow><boxGeometry args={[0.1, 0.04, 0.1]} /><meshStandardMaterial color="#44403c" flatShading /></mesh>
      </group>
      <group name="legFL" position={[-0.18, 0.8, 0.45]}>
          <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.09, 0.8, 0.09]} /><meshStandardMaterial color="#78350f" flatShading /></mesh>
          <mesh position={[0, -0.78, 0]} castShadow><boxGeometry args={[0.1, 0.04, 0.1]} /><meshStandardMaterial color="#44403c" flatShading /></mesh>
      </group>
      <group name="legFR" position={[0.18, 0.8, 0.45]}>
          <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.09, 0.8, 0.09]} /><meshStandardMaterial color="#78350f" flatShading /></mesh>
          <mesh position={[0, -0.78, 0]} castShadow><boxGeometry args={[0.1, 0.04, 0.1]} /><meshStandardMaterial color="#44403c" flatShading /></mesh>
      </group>
    </group>
  );
}

function Wolf({ position, scale = 1, id }: { position: any, scale?: number, id: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const currentScale = useRef(0);
  const aiTickRef = useRef(0);

  // 使用 locomotion 模块
  const locoRef = useRef<ReturnType<typeof createLocomotionState> | null>(null);
  if (locoRef.current === null) {
    locoRef.current = createLocomotionState(
      position.x, position.y, position.z,
      Math.random() * Math.PI * 2
    );
    locoRef.current.aiState = 'wander';
  }
  const loco = locoRef.current;

  const WOLF_CFG = useMemo(() => ({
    speed: 1.5,
    runSpeed: 4.5,
    turnRate: 3.0,
    arriveRadius: 1.2,
    stepLength: 0.7,
    obstacleProbeDistance: 1.5,
    wanderDriftRate: 0.4,
    wanderTargetInterval: 2.5,
    slopeAlignStrength: 0.3,
  }), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Pop in scale
    if (useGameStore.getState().isSplashDone && currentScale.current < scale * 0.4) {
         currentScale.current = THREE.MathUtils.damp(currentScale.current, scale * 0.4, 5, delta);
         groupRef.current.scale.setScalar(currentScale.current);
    }

    const t = state.clock.getElapsedTime();
    const allAssets = useGameStore.getState().assets;
    const weather = useGameStore.getState().weather;
    aiTickRef.current += delta;

    // ── AI 逻辑 (设定 target 与 state) ─────────────────
    if (aiTickRef.current >= 0.18) {
        aiTickRef.current = 0;

        const timeOfDay = useGameStore.getState().timeOfDay;
        const isNight = timeOfDay > 20 || timeOfDay < 5;

        let nearestDeer = null;
        let deerDistSq = Infinity;

        // 狼群分散：找到其他狼的质心
        let packCenterX = 0;
        let packCenterZ = 0;
        let packCount = 0;

        for (const asset of allAssets) {
            if (asset.type === 'deer') {
                const dx = loco.position.x - asset.position.x;
                const dz = loco.position.z - asset.position.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < deerDistSq) {
                    deerDistSq = distSq;
                    nearestDeer = asset;
                }
            } else if (asset.type === 'wolf' && asset.id !== id) {
                packCenterX += asset.position.x;
                packCenterZ += asset.position.z;
                packCount++;
            }
        }

        if (nearestDeer && deerDistSq < 25 * 25) {
            loco.aiState = 'chase';
            loco.target.set(nearestDeer.position.x, 0, nearestDeer.position.z);
            if (deerDistSq < 4) {
                useGameStore.getState().spawnVFX('blood', nearestDeer.position);
                useGameStore.getState().removeAsset(nearestDeer.id);
            }
        } else if (isNight) {
            // 夜里更活跃，巡逻范围更大
            loco.aiState = 'wander';
            updateWanderTarget(loco, WOLF_CFG, allAssets, 25);
        } else {
            loco.aiState = 'wander';
            updateWanderTarget(loco, WOLF_CFG, allAssets);

            // 狼群分散：数量多时互相远离
            if (packCount > 0) {
                packCenterX /= packCount;
                packCenterZ /= packCount;
                const toPackDx = packCenterX - loco.position.x;
                const toPackDz = packCenterZ - loco.position.z;
                const toPackDist = Math.sqrt(toPackDx * toPackDx + toPackDz * toPackDz);
                // 太近时分散巡逻，减弱互相排斥力以防抽搐
                if (toPackDist < 5) {
                    loco.target.x -= toPackDx * 0.05;
                    loco.target.z -= toPackDz * 0.05;
                }
            }
        }
    }

    // ── 运动逻辑 (交给 locomotion 模块) ─────────────────
    stepCreature(loco, delta, WOLF_CFG, {
      time: t,
      delta,
      assets: allAssets,
      weather,
    });

    // ── 应用到 Three.js Group ───────────────────────────
    applyLocomotionToGroup(groupRef.current, loco, 0.025);

    // ── 头部动画 ────────────────────────────────────────
    const head = groupRef.current.getObjectByName('head');
    if (head) {
         if (loco.aiState === 'chase') head.rotation.x = 0.3;
         else head.rotation.x = Math.sin(loco.legPhase * Math.PI * 2 * 0.5) * 0.1;
    }

    // ── 腿部动画 (位移驱动) ─────────────────────────────
    const legAngles = computeLegAngles(loco.legPhase, loco.isMoving);
    const legFL = groupRef.current.getObjectByName('legFL');
    const legFR = groupRef.current.getObjectByName('legFR');
    const legBL = groupRef.current.getObjectByName('legBL');
    const legBR = groupRef.current.getObjectByName('legBR');

    if (legFL && legFR && legBL && legBR) {
        legFL.rotation.x = legAngles.fl;
        legBR.rotation.x = legAngles.br;
        legFR.rotation.x = legAngles.fr;
        legBL.rotation.x = legAngles.bl;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]} scale={scale * 0.45} ref={groupRef} castShadow>
      {/* Body - streamlined torso */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[0.38, 0.45, 1.4]} />
        <meshStandardMaterial color="#475569" flatShading />
      </mesh>
      {/* Belly - lighter underside */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.32, 0.15, 1.2]} />
        <meshStandardMaterial color="#94a3b8" flatShading />
      </mesh>
      {/* Chest - broader front */}
      <mesh position={[0, 0.8, 0.4]} castShadow>
        <boxGeometry args={[0.42, 0.4, 0.4]} />
        <meshStandardMaterial color="#475569" flatShading />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.05, 0.55]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.25, 0.4, 0.3]} />
        <meshStandardMaterial color="#475569" flatShading />
      </mesh>
      {/* Head */}
      <group name="head" position={[0, 1.2, 0.75]}>
         <mesh position={[0, 0, 0]} castShadow>
           <boxGeometry args={[0.3, 0.28, 0.35]} />
           <meshStandardMaterial color="#334155" flatShading />
         </mesh>
         {/* Snout - elongated */}
         <mesh position={[0, -0.06, 0.28]} castShadow>
           <boxGeometry args={[0.18, 0.14, 0.35]} />
           <meshStandardMaterial color="#1e293b" flatShading />
         </mesh>
         {/* Nose */}
         <mesh position={[0, -0.04, 0.45]} castShadow>
           <boxGeometry args={[0.1, 0.06, 0.04]} />
           <meshStandardMaterial color="#0f172a" />
         </mesh>
         {/* Eyes - fierce */}
         <mesh position={[-0.13, 0.05, 0.14]} castShadow>
           <boxGeometry args={[0.05, 0.04, 0.04]} />
           <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
         </mesh>
         <mesh position={[0.13, 0.05, 0.14]} castShadow>
           <boxGeometry args={[0.05, 0.04, 0.04]} />
           <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
         </mesh>
         {/* Ears - pointed */}
         <mesh position={[-0.12, 0.24, -0.06]} rotation={[0, 0, 0.15]} castShadow>
           <boxGeometry args={[0.08, 0.22, 0.06]} />
           <meshStandardMaterial color="#334155" flatShading />
         </mesh>
         <mesh position={[0.12, 0.24, -0.06]} rotation={[0, 0, -0.15]} castShadow>
           <boxGeometry args={[0.08, 0.22, 0.06]} />
           <meshStandardMaterial color="#334155" flatShading />
         </mesh>
         {/* Inner ears */}
         <mesh position={[-0.12, 0.22, -0.04]} rotation={[0, 0, 0.15]} castShadow>
           <boxGeometry args={[0.04, 0.14, 0.04]} />
           <meshStandardMaterial color="#64748b" flatShading />
         </mesh>
         <mesh position={[0.12, 0.22, -0.04]} rotation={[0, 0, -0.15]} castShadow>
           <boxGeometry args={[0.04, 0.14, 0.04]} />
           <meshStandardMaterial color="#64748b" flatShading />
         </mesh>
      </group>
      {/* Tail - bushy */}
      <mesh position={[0, 0.85, -0.8]} rotation={[-0.3, 0, 0]} castShadow>
         <boxGeometry args={[0.14, 0.14, 0.5]} />
         <meshStandardMaterial color="#334155" flatShading />
      </mesh>
      <mesh position={[0, 0.9, -1.05]} rotation={[-0.6, 0, 0]} castShadow>
         <boxGeometry args={[0.12, 0.12, 0.25]} />
         <meshStandardMaterial color="#475569" flatShading />
      </mesh>
      {/* Legs & Paws */}
      <group name="legBL" position={[-0.14, 0.7, -0.45]}>
          <mesh position={[0, -0.35, 0]} castShadow><boxGeometry args={[0.09, 0.7, 0.09]} /><meshStandardMaterial color="#1e293b" flatShading /></mesh>
          <mesh position={[0, -0.68, 0]} castShadow><boxGeometry args={[0.1, 0.04, 0.12]} /><meshStandardMaterial color="#0f172a" flatShading /></mesh>
      </group>
      <group name="legBR" position={[0.14, 0.7, -0.45]}>
          <mesh position={[0, -0.35, 0]} castShadow><boxGeometry args={[0.09, 0.7, 0.09]} /><meshStandardMaterial color="#1e293b" flatShading /></mesh>
          <mesh position={[0, -0.68, 0]} castShadow><boxGeometry args={[0.1, 0.04, 0.12]} /><meshStandardMaterial color="#0f172a" flatShading /></mesh>
      </group>
      <group name="legFL" position={[-0.14, 0.7, 0.4]}>
          <mesh position={[0, -0.35, 0]} castShadow><boxGeometry args={[0.09, 0.7, 0.09]} /><meshStandardMaterial color="#1e293b" flatShading /></mesh>
          <mesh position={[0, -0.68, 0]} castShadow><boxGeometry args={[0.1, 0.04, 0.12]} /><meshStandardMaterial color="#0f172a" flatShading /></mesh>
      </group>
      <group name="legFR" position={[0.14, 0.7, 0.4]}>
          <mesh position={[0, -0.35, 0]} castShadow><boxGeometry args={[0.09, 0.7, 0.09]} /><meshStandardMaterial color="#1e293b" flatShading /></mesh>
          <mesh position={[0, -0.68, 0]} castShadow><boxGeometry args={[0.1, 0.04, 0.12]} /><meshStandardMaterial color="#0f172a" flatShading /></mesh>
      </group>
    </group>
  );
}

function SmokeParticles({ position }: { position: [number, number, number] }) {
  const count = 10;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      offset: Math.random() * 100,
      speed: 0.5 + Math.random() * 0.5,
      xOffset: (Math.random() - 0.5) * 0.2,
      zOffset: (Math.random() - 0.5) * 0.2,
      scale: 0.5 + Math.random() * 0.5
    }));
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      const t = clock.elapsedTime * p.speed + p.offset;
      const y = (t % 3); // rises up to 3 units
      const progress = y / 3;
      dummy.position.set(
        position[0] + p.xOffset + Math.sin(t) * progress * 0.5,
        position[1] + y,
        position[2] + p.zOffset + Math.cos(t * 0.8) * progress * 0.5
      );
      const s = p.scale * (1 - progress); // Shrinks as it goes up
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial color="#94a3b8" transparent opacity={0.4} />
    </instancedMesh>
  );
}

export function House(props: any) {
  const ref = usePopIn(props.scale || 1.2);
  useMarinePhysics(ref, props);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();
  const isNight = timeOfDay > 18 || timeOfDay < 6;
  const windowColor = isNight ? "#f97316" : "#1e293b";
  const emissiveIntensity = isNight ? 1.5 : 0;

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        AudioSystem.playClick();
        useGameStore.getState().setOpenPlayerPanel(true);
        forceClose();
      }}
      onPointerOver={(e: any) => { 
          if (useGameStore.getState().selectedTool === 'none') {
              e.stopPropagation();
              document.body.style.cursor = 'pointer'; 
              keepHoverAlive();
          }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Hover UI Button */}
      <HoverButton 
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={2.5}
          iconSvg={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'seatDropIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
               <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
               <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          } 
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); useGameStore.getState().setOpenPlayerPanel(true); forceClose(); }} 
      />

      {/* Main Building */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.2, 1.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Chimney */}
      <mesh position={[0.6, 1.4, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>

      {/* Smoke */}
      {isNight && <SmokeParticles position={[0.6, 2.0, -0.3]} />}

      {/* Roof */}
      <mesh position={[0, 1.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.6, 1.0, 4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.4, 0.71]} castShadow>
        <boxGeometry args={[0.5, 0.8, 0.05]} />
        <meshStandardMaterial color="#b45309" roughness={0.9} />
      </mesh>
      
      {/* Windows */}
      <mesh position={[-0.5, 0.6, 0.71]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      <mesh position={[0.5, 0.6, 0.71]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Side Window */}
      <mesh position={[0.91, 0.6, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.05]} />
        <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      
      {/* Porch steps */}
      <mesh position={[0, 0.05, 0.85]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.1, 0.3]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
}

export function Windmill(props: any) {
  const ref = usePopIn(props.scale || 1.2);
  useMarinePhysics(ref, props);
  const bladeRef = useRef<THREE.Group>(null);
  const weather = useGameStore(state => state.weather);
  const setWeather = useGameStore(state => state.setWeather);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();
  
  const isCoastal = Math.sqrt(props.position.x * props.position.x + props.position.z * props.position.z) > 12;

  useFrame((_, delta) => {
    // Coastal windmills spin faster
    const speed = (weather === 'rainy' ? 3.5 : 1.2) * (isCoastal ? 1.5 : 1.0);
    if (bladeRef.current) bladeRef.current.rotation.z -= delta * speed;
  });

  const nextWeather = () => {
    if (weather === 'sunny') return 'rainy';
    if (weather === 'rainy') return 'snowy';
    return 'sunny';
  };

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        AudioSystem.playClick();
        setWeather(nextWeather());
        forceClose();
      }}
      onPointerOver={(e: any) => { 
          if (useGameStore.getState().selectedTool === 'none') {
              e.stopPropagation();
              document.body.style.cursor = 'pointer'; 
              keepHoverAlive();
          }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      
      {/* Hover UI Button */}
      <HoverButton 
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={3.5}
          iconSvg={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'wheelSpin 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}>
               {weather === 'sunny' ? <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /> :
                weather === 'rainy' ? <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25M16 20l-4-4-4 4M12 16v8" /> : 
                <path d="M12 2v20m5-15l-10 10m10 0L7 7" />}
            </svg>
          } 
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); setWeather(nextWeather()); forceClose(); }} 
      />

      {/* Coastal Synergy Indicator */}
      {isCoastal && (
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.5, 1.8, 16]} />
              <meshBasicMaterial color="#93c5fd" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
      )}

      {/* Base */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 1.0, 2.4, 6]} />
        <meshStandardMaterial color="#fef3c7" roughness={1.0} flatShading />
      </mesh>
      {/* Wooden Framework Details */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
         <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 0.86, 1.2, Math.sin(i * Math.PI / 3) * 0.86]} rotation={[0, -i * Math.PI / 3, 0.1]} castShadow>
             <boxGeometry args={[0.08, 2.5, 0.08]} />
             <meshStandardMaterial color="#78350f" roughness={1.0} flatShading />
         </mesh>
      ))}
      {/* Top Roof */}
      <mesh position={[0, 2.7, 0]} rotation={[0, Math.PI / 6, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.9, 0.8, 6]} />
        <meshStandardMaterial color="#b45309" roughness={1.0} flatShading />
      </mesh>
      {/* Wooden Deck */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 0.1, 6]} />
        <meshStandardMaterial color="#5c4033" roughness={1.0} flatShading />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.4, 1.0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.1]} />
        <meshStandardMaterial color="#78350f" flatShading />
      </mesh>
      
      {/* Rotor & Blades */}
      <group position={[0, 2.4, 0.85]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
           <cylinderGeometry args={[0.1, 0.1, 0.4]} />
           <meshStandardMaterial color="#0f172a" />
        </mesh>
        <group ref={bladeRef} position={[0, 0, 0.1]}>
          <mesh castShadow><boxGeometry args={[0.15, 4.0, 0.05]}/><meshStandardMaterial color="#1e293b"/></mesh>
          <mesh castShadow><boxGeometry args={[4.0, 0.15, 0.05]}/><meshStandardMaterial color="#1e293b"/></mesh>
          
          {/* Sail cloths */}
          <mesh position={[0.4, 1.0, 0]} castShadow><boxGeometry args={[0.6, 1.8, 0.02]}/><meshStandardMaterial color="#f8fafc"/></mesh>
          <mesh position={[-0.4, -1.0, 0]} castShadow><boxGeometry args={[0.6, 1.8, 0.02]}/><meshStandardMaterial color="#f8fafc"/></mesh>
          <mesh position={[1.0, -0.4, 0]} castShadow><boxGeometry args={[1.8, 0.6, 0.02]}/><meshStandardMaterial color="#f8fafc"/></mesh>
          <mesh position={[-1.0, 0.4, 0]} castShadow><boxGeometry args={[1.8, 0.6, 0.02]}/><meshStandardMaterial color="#f8fafc"/></mesh>
        </group>
      </group>
    </group>
  );
}

export function Lighthouse(props: any) {
  const ref = usePopIn(props.scale || 1.2);
  useMarinePhysics(ref, props);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const isNight = timeOfDay > 18 || timeOfDay < 6;
  const lightRef = useRef<THREE.PointLight>(null);
  const beamRef = useRef<THREE.Group>(null);
  
  const target1 = useMemo(() => { const obj = new THREE.Object3D(); obj.position.set(0, -2, 10); return obj; }, []);
  const target2 = useMemo(() => { const obj = new THREE.Object3D(); obj.position.set(0, -2, -10); return obj; }, []);

  useFrame((state, delta) => {
    if (beamRef.current) {
        beamRef.current.rotation.y -= delta * 1.5;
    }
  });

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}>
      
      {/* --- TERRAIN / FOUNDATION --- */}
      {/* Rocky Outcropping Base */}
      <mesh position={[0, 0.1, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[1.8, 2.0, 0.3, 7]} />
         <meshStandardMaterial color="#475569" roughness={1.0} flatShading />
      </mesh>
      {/* Stone Pedestal */}
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[1.3, 1.6, 0.3, 8]} />
         <meshStandardMaterial color="#94a3b8" roughness={1.0} flatShading />
      </mesh>

      {/* --- KEEPER'S COTTAGE (Attached) --- */}
      <group position={[0.9, 0.5, 0.5]} rotation={[0, Math.PI / 6, 0]}>
         {/* Cottage Body */}
         <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.8, 1.0]} />
            <meshStandardMaterial color="#f8fafc" roughness={1.0} flatShading />
         </mesh>
         {/* Cottage Roof */}
         <mesh position={[0, 0.95, 0]} rotation={[0, 0, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.9, 0.5, 4]} />
            <meshStandardMaterial color="#b91c1c" roughness={1.0} flatShading />
         </mesh>
         {/* Cottage Door */}
         <mesh position={[0, 0.3, 0.51]} castShadow>
            <boxGeometry args={[0.3, 0.6, 0.05]} />
            <meshStandardMaterial color="#78350f" roughness={1.0} flatShading />
         </mesh>
         {/* Cottage Window */}
         <mesh position={[0.61, 0.4, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.3, 0.3, 0.05]} />
            <meshStandardMaterial color={isNight ? "#fde047" : "#0f172a"} emissive={isNight ? "#fbbf24" : "#000000"} emissiveIntensity={isNight ? 2 : 0} roughness={0.8} flatShading toneMapped={false} />
         </mesh>
         {/* Cottage Chimney */}
         <mesh position={[0.3, 1.0, -0.2]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.6, 0.2]} />
            <meshStandardMaterial color="#64748b" roughness={1.0} flatShading />
         </mesh>
         {isNight && <SmokeParticles position={[0.3, 1.4, -0.2]} />}
      </group>

      {/* --- MAIN LIGHTHOUSE TOWER --- */}
      <group position={[-0.2, 0, -0.2]}>
          {/* Base Tower (White) */}
          <mesh position={[0, 2.0, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.5, 1.1, 4.0, 8]} />
             <meshStandardMaterial color="#f1f5f9" roughness={1.0} flatShading />
          </mesh>
          
          {/* Red Stripes */}
          <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.82, 0.97, 0.8, 8]} />
             <meshStandardMaterial color="#dc2626" roughness={1.0} flatShading />
          </mesh>
          <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.58, 0.73, 0.8, 8]} />
             <meshStandardMaterial color="#dc2626" roughness={1.0} flatShading />
          </mesh>

          {/* Tower Base Door */}
          <mesh position={[0, 0.7, 1.05]} rotation={[0, -Math.PI / 8, 0]} castShadow>
             <boxGeometry args={[0.3, 0.5, 0.1]} />
             <meshStandardMaterial color="#451a03" roughness={1.0} flatShading />
          </mesh>
          {/* Wooden Awning */}
          <mesh position={[0, 1.0, 1.05]} rotation={[0.2, -Math.PI / 8, 0]} castShadow>
             <boxGeometry args={[0.4, 0.05, 0.3]} />
             <meshStandardMaterial color="#334155" roughness={1.0} flatShading />
          </mesh>

          {/* Spiral Windows */}
          {[0, 1, 2, 3].map(i => {
             const angle = (i * Math.PI * 0.6) + Math.PI;
             const yPos = 1.0 + i * 0.7;
             const radius = 1.1 - (yPos / 4.0) * 0.6 + 0.02;
             return (
                 <mesh key={i} position={[Math.sin(angle) * radius, yPos, Math.cos(angle) * radius]} rotation={[0, angle, 0]} castShadow>
                     <boxGeometry args={[0.15, 0.25, 0.1]} />
                     <meshStandardMaterial color={isNight ? "#fde047" : "#0f172a"} emissive={isNight ? "#fbbf24" : "#000000"} emissiveIntensity={isNight ? 2 : 0} roughness={0.8} flatShading toneMapped={false} />
                 </mesh>
             );
          })}

          {/* --- GALLERY DECK (Balcony) --- */}
          {/* Support Brackets */}
          {[...Array(8)].map((_, i) => (
             <mesh key={`bracket-${i}`} position={[Math.sin(i * Math.PI / 4) * 0.5, 3.8, Math.cos(i * Math.PI / 4) * 0.5]} rotation={[-0.5, i * Math.PI / 4, 0]} castShadow>
                 <boxGeometry args={[0.08, 0.4, 0.08]} />
                 <meshStandardMaterial color="#cbd5e1" roughness={1.0} flatShading />
             </mesh>
          ))}
          {/* Deck Floor */}
          <mesh position={[0, 4.0, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.9, 0.6, 0.2, 8]} />
             <meshStandardMaterial color="#334155" roughness={1.0} flatShading />
          </mesh>
          {/* Deck Railing Top */}
          <mesh position={[0, 4.3, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.85, 0.85, 0.05, 8]} />
             <meshStandardMaterial color="#0f172a" roughness={1.0} flatShading />
          </mesh>
          {/* Deck Railing Posts */}
          {[...Array(16)].map((_, i) => (
             <mesh key={`post-${i}`} position={[Math.sin(i * Math.PI / 8) * 0.82, 4.15, Math.cos(i * Math.PI / 8) * 0.82]} castShadow>
                 <boxGeometry args={[0.03, 0.3, 0.03]} />
                 <meshStandardMaterial color="#0f172a" roughness={1.0} flatShading />
             </mesh>
          ))}
          
          {/* --- LANTERN ROOM --- */}
          {/* Glass Enclosure */}
          <mesh position={[0, 4.5, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
             <cylinderGeometry args={[0.45, 0.45, 0.8, 8]} />
             <meshStandardMaterial color="#fef08a" emissive={isNight ? "#fbbf24" : "#000000"} emissiveIntensity={isNight ? 5 : 0} transparent opacity={isNight ? 0.8 : 0.4} toneMapped={false} />
          </mesh>
          {/* Internal Glowing Lens (Fresnel) */}
          <group position={[0, 4.5, 0]} ref={beamRef}>
             <mesh castShadow>
                 <cylinderGeometry args={[0.2, 0.2, 0.5, 6]} />
                 <meshStandardMaterial color="#ffffff" emissive="#fbbf24" emissiveIntensity={isNight ? 8 : 0} toneMapped={false} flatShading />
             </mesh>
             
             {/* The Spotlight Beams */}
             {isNight && (
                <>
                  <pointLight ref={lightRef} color="#fbbf24" intensity={8} distance={40} />
                  <SpotLight position={[0, 0, 0]} color="#fef08a" distance={50} angle={0.4} attenuation={20} anglePower={6} intensity={8} opacity={0.7} volumetric target={target1} />
                  <SpotLight position={[0, 0, 0]} color="#fef08a" distance={50} angle={0.4} attenuation={20} anglePower={6} intensity={8} opacity={0.7} volumetric target={target2} />
                  <primitive object={target1} />
                  <primitive object={target2} />
                </>
             )}
          </group>
          {/* Window Frames / Pillars */}
          {[...Array(8)].map((_, i) => (
             <mesh key={`lantern-post-${i}`} position={[Math.sin(i * Math.PI / 4 + Math.PI/8) * 0.47, 4.5, Math.cos(i * Math.PI / 4 + Math.PI/8) * 0.47]} castShadow>
                 <boxGeometry args={[0.06, 0.8, 0.06]} />
                 <meshStandardMaterial color="#1e293b" roughness={1.0} flatShading />
             </mesh>
          ))}

          {/* --- ROOF --- */}
          {/* Roof Base Dome/Cone */}
          <mesh position={[0, 5.2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <coneGeometry args={[0.6, 0.6, 8]} />
             <meshStandardMaterial color="#dc2626" roughness={1.0} flatShading />
          </mesh>
          {/* Roof Sphere Finial */}
          <mesh position={[0, 5.5, 0]} castShadow>
             <sphereGeometry args={[0.12, 8, 8]} />
             <meshStandardMaterial color="#fcd34d" roughness={0.4} metalness={0.6} flatShading />
          </mesh>
          {/* Lightning Rod / Weather Vane */}
          <mesh position={[0, 5.8, 0]} castShadow>
             <cylinderGeometry args={[0.015, 0.015, 0.6]} />
             <meshStandardMaterial color="#94a3b8" roughness={0.5} flatShading />
          </mesh>
          {/* Weather Vane Arrow */}
          <mesh position={[0, 5.9, 0]} castShadow>
             <boxGeometry args={[0.3, 0.02, 0.02]} />
             <meshStandardMaterial color="#94a3b8" roughness={0.5} flatShading />
          </mesh>
      </group>

    </group>
  );
}

// Delegates to the authoritative wave model in Water.tsx so floating
// objects track the exact visual ocean surface (incl. the -0.4 base level)
export function getWaterHeight(x: number, z: number, time: number, weather: string) {
    return getOceanHeight(x, z, time, weather);
}

export function useMarinePhysics(ref: React.RefObject<any>, props: any, baseOffset: number = 0) {
  const weather = useGameStore(state => state.weather);
  const assets = useGameStore(state => state.assets);

  // Grid-adjacent platforms form one raft, coupled like train cars: the bulk
  // of the motion is shared (sampled at the raft centroid), with a small
  // per-plank component on top. Objects placed on a platform anchor to that
  // platform so they move exactly like the plank beneath them.
  const raft = useMemo(() => {
     const platforms = useGameStore.getState().assets.filter(a => a.type === 'platform');
     // Anchor: the platform itself, or the platform this object sits on
     let ax = props.position.x;
     let az = props.position.z;
     if (props.type !== 'platform') {
        let best = null as PlacedAsset | null;
        let bestD = 2.2;
        for (const p of platforms) {
           const dd = Math.hypot(p.position.x - ax, p.position.z - az);
           if (dd < bestD) { bestD = dd; best = p; }
        }
        if (!best) return null; // not on a platform: full local motion
        ax = best.position.x;
        az = best.position.z;
     }
     const visited = new Set<string>([`${ax},${az}`]);
     const queue = [{ x: ax, z: az }];
     let sx = 0, sz = 0, n = 0;
     while (queue.length) {
        const cur = queue.pop()!;
        sx += cur.x; sz += cur.z; n++;
        for (const p of platforms) {
           const k = `${p.position.x},${p.position.z}`;
           if (visited.has(k)) continue;
           const dx = p.position.x - cur.x;
           const dz = p.position.z - cur.z;
           if (dx * dx + dz * dz <= 10) { // orthogonal neighbors on the 3-unit grid
              visited.add(k);
              queue.push({ x: p.position.x, z: p.position.z });
           }
        }
     }
     return { cx: sx / n, cz: sz / n, count: n, ax, az };
  }, [assets, props.type, props.position.x, props.position.z]);

  const isMarine = useMemo(() => {
     if (props.type === 'platform') return true;
     if (props.type === 'pier') return false; // piers never bob
     if (props.type === 'boat') return true;
     
     // Buildings logic
     if (getTerrainHeight(props.position.x, props.position.z) > 0.2) return false;
     
     const assets = useGameStore.getState().assets;
     let closestType = 'none';
     let minDist = 3.0;
     for (const a of assets) {
         if (a.type !== 'platform' && a.type !== 'pier') continue;
         const dx = a.position.x - props.position.x;
         const dz = a.position.z - props.position.z;
         const dist = Math.sqrt(dx*dx + dz*dz);
         if (dist < minDist) {
             minDist = dist;
             closestType = a.type;
         }
     }
     return closestType === 'platform' || closestType === 'none';
  }, [props.type, props.position.x, props.position.z]);

  useFrame((state) => {
      if (ref.current && isMarine) {
          const t = state.clock.elapsedTime;
          let targetRotX = 0;
          let targetRotZ = 0;

          if (raft) {
              // Train-car coupling: shared raft motion (damped, sampled at
              // the centroid) plus a small per-plank component at the anchor
              const damp = Math.max(0.3, 1 / Math.sqrt(raft.count));
              const raftWave = getWaterHeight(raft.cx, raft.cz, t, weather) + 0.4;
              const localWave = getWaterHeight(raft.ax, raft.az, t, weather) + 0.4;
              // Loose coupling: planks follow the wave under them more,
              // with the shared raft motion as a softer base
              const wave = raftWave * damp * 0.6 + localWave * 0.4;
              // Hover lift: rafts float above the cloud surface so billows
              // and shore spray don't wash over the deck
              const lift = getWaveAmplitude(weather) * 0.35;
              ref.current.position.y = props.position.y - 0.4 + wave + lift + baseOffset;

              // Shared tilt from the raft-scale slope
              const d = 2.5;
              const hX = getWaterHeight(raft.cx + d, raft.cz, t, weather);
              const hZ = getWaterHeight(raft.cx, raft.cz + d, t, weather);
              targetRotX = Math.atan2(hZ - raftWave + 0.4, d) * 0.2 * damp;
              targetRotZ = -Math.atan2(hX - raftWave + 0.4, d) * 0.2 * damp;
              // Slight individual tilt per plank
              const dl = 1.2;
              const lX = getWaterHeight(raft.ax + dl, raft.az, t, weather);
              const lZ = getWaterHeight(raft.ax, raft.az + dl, t, weather);
              targetRotX += Math.atan2(lZ - localWave + 0.4, dl) * 0.28;
              targetRotZ += -Math.atan2(lX - localWave + 0.4, dl) * 0.28;
          } else {
              // Free-floating object: rides the wave fully at its own spot
              const hC = getWaterHeight(props.position.x, props.position.z, t, weather);
              ref.current.position.y = props.position.y + hC + baseOffset;
              const d = 1.2;
              const hX = getWaterHeight(props.position.x + d, props.position.z, t, weather);
              const hZ = getWaterHeight(props.position.x, props.position.z + d, t, weather);
              targetRotX = Math.atan2(hZ - hC, d) * 0.6;
              targetRotZ = -Math.atan2(hX - hC, d) * 0.6;
          }

          ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * 0.12;
          ref.current.rotation.z += (targetRotZ - ref.current.rotation.z) * 0.12;
      }
  });
}

// Sea Expansion Board (bobs with water, slow drift on ocean)
export function Platform(props: any) {
  const ref = usePopIn(props.scale || 1.5);
  const driftAngle = useRef(0);

  useMarinePhysics(ref, props, 0.05);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const weather = useGameStore.getState().weather;
    const assets = useGameStore.getState().assets;

    // Find the "raft leader": the platform with the lowest ID within 3 units
    // All adjacent platforms share the same drift so they move as one unit
    const platforms = assets.filter(a => a.type === 'platform');
    const myX = props.position.x;
    const myZ = props.position.z;
    let leaderId = props.id;
    let leaderX = myX;
    let leaderZ = myZ;
    for (const p of platforms) {
      const dx = p.position.x - myX;
      const dz = p.position.z - myZ;
      if (dx * dx + dz * dz <= 9 && p.id < leaderId) { // within 3 units
        leaderId = p.id;
        leaderX = p.position.x;
        leaderZ = p.position.z;
      }
    }

    // Use a deterministic drift angle based on the leader's position
    // so all platforms in a raft get the same drift offset
    const driftSeed = leaderX * 0.37 + leaderZ * 0.53;
    const driftSpeed = (weather === 'rainy' || weather === 'stormy') ? 0.045 : 0.03;
    driftAngle.current += driftSpeed * delta;

    const driftRadius = 1.5;
    const angle = driftAngle.current + driftSeed;
    const driftX = Math.cos(angle) * driftRadius;
    const driftZ = Math.sin(angle * 0.8) * driftRadius;

    // Apply drift offset on top of the marine physics Y position
    ref.current.position.x = myX + driftX;
    ref.current.position.z = myZ + driftZ;
  });

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} scale={0}>
      {/* Wooden Deck Base */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.1, 2.8]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {/* Planks lines to make it look like separate boards */}
      {[...Array(5)].map((_, i) => (
         <mesh key={i} position={[(i - 2) * 0.55, 0.05, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.05, 2.8]} />
            <meshStandardMaterial color="#92400e" roughness={0.9} />
         </mesh>
      ))}
      {/* Blue Plastic Floaters Underneath */}
      <mesh position={[0.8, -0.25, 0]} rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 2.6]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>
      <mesh position={[-0.8, -0.25, 0]} rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 2.6]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>
    </group>
  );
}

// Sky floatable: hot air balloon tethered to the ground by a rope+stake,
// a rigid ladder, or a swaying plank bridge
export function Balloon(props: any) {
  const ref = usePopIn(props.scale || 1);
  const swayRef = useRef<THREE.Group>(null);
  const ropeRef = useRef<THREE.Mesh>(null);
  const plankRefs = useRef<(THREE.Mesh | null)[]>([]);
  const balloonMatShaders = useRef<any[]>([]);
  const ropeMatShader = useRef<any>(null);
  const driftAngle = useRef(0);

  const balloonOnBeforeCompile = useMemo(() => (shader: any) => {
    shader.uniforms.time = { value: 0 };
    shader.uniforms.waveInt = { value: 1.0 };
    shader.vertexShader = `
      uniform float time;
      uniform float waveInt;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      transformed.x += sin(position.y * 3.0 + time * 2.0) * 0.05 * waveInt;
      transformed.z += cos(position.x * 2.0 + time * 2.5) * 0.05 * waveInt;
      `
    );
    balloonMatShaders.current.push(shader);
  }, []);

  const ropeOnBeforeCompile = useMemo(() => (shader: any) => {
    shader.uniforms.time = { value: 0 };
    shader.vertexShader = `
      uniform float time;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float bend = 1.0 - abs(position.y * 2.0);
      transformed.x += sin(time * 1.5) * 0.3 * bend;
      transformed.z += cos(time * 1.2) * 0.3 * bend;
      `
    );
    ropeMatShader.current = shader;
  }, []);

  const mode = props.type === 'balloon_ladder' ? 'ladder'
             : props.type === 'balloon_bridge' ? 'bridge' : 'rope';
  const H = 11; // float altitude above the anchor point
  const PLANKS = 14;

  // Player-chosen look, stored on the asset as "color|style".
  // 'lowpoly': flat-shaded solid icosahedron (matches the game's look);
  // 'striped': classic two-color gored balloon.
  const { mainColor, style } = useMemo(() => {
    const [c, s] = String(props.customState || '').split('|');
    return { mainColor: c || '#e11d48', style: s === 'striped' ? 'striped' : 'lowpoly' };
  }, [props.customState]);
  const duo = [mainColor, '#f8fafc'];

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const g = swayRef.current;
    const weather = useGameStore.getState().weather;

    // Slow wind drift: figure-8 pattern around home position
    const driftSpeed = weather === 'rainy' ? 0.1 : 0.07;
    driftAngle.current += driftSpeed * delta;
    const driftRadius = 3;
    const driftX = Math.cos(driftAngle.current) * driftRadius;
    const driftZ = Math.sin(driftAngle.current * 0.7) * driftRadius;

    if (balloonMatShaders.current.length > 0) {
      const waveInt = useGameStore.getState().waveIntensity || 1.0;
      balloonMatShaders.current.forEach(shader => {
        shader.uniforms.time.value = t;
        shader.uniforms.waveInt.value = waveInt;
      });
    }
    if (ropeMatShader.current) {
      ropeMatShader.current.uniforms.time.value = t;
    }

    if (!g) return;

    if (mode === 'ladder') {
      // Held by the ladder: gentle bob, slight lean and slow turn + drift
      g.position.set(
        driftX + Math.sin(t * 0.5) * 0.15,
        H + Math.sin(t * 0.7) * 0.3,
        driftZ + Math.cos(t * 0.45) * 0.15
      );
      g.rotation.z = Math.sin(t * 0.5) * 0.03;
      g.rotation.y = Math.sin(t * 0.15) * 0.15;
    } else {
      const ax = mode === 'bridge' ? 1.2 : 1.8;
      g.position.set(
        driftX + Math.sin(t * 0.31) * ax,
        H + Math.sin(t * 0.53) * 0.9,
        driftZ + Math.cos(t * 0.27) * ax
      );
      g.rotation.y = Math.sin(t * 0.2) * 0.3;
      g.rotation.z = Math.sin(t * 0.37) * 0.04;
    }

    if (mode === 'rope' && ropeRef.current) {
      // Stretch the rope between the stake and the basket
      const top = g.position.clone().add(new THREE.Vector3(0, -3.2, 0));
      const bottom = new THREE.Vector3(0, 0.5, 0);
      const dir = top.sub(bottom);
      const len = dir.length();
      ropeRef.current.position.copy(bottom).addScaledVector(dir, 0.5);
      ropeRef.current.scale.set(1, len, 1);
      ropeRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }

    if (mode === 'bridge') {
      // Hanging plank bridge: planks follow a sagging curve up to the
      // basket, with a traveling wave so the whole bridge sways
      const top = g.position.clone().add(new THREE.Vector3(0, -3.4, 0));
      const bx = 0, by = 0.3, bz = 0;
      const faceY = Math.atan2(top.x - bx, top.z - bz);
      for (let i = 0; i < PLANKS; i++) {
        const m = plankRefs.current[i];
        if (!m) continue;
        const k = (i + 0.5) / PLANKS;
        const env = Math.sin(k * Math.PI); // pinned at both ends
        m.position.set(
          bx + (top.x - bx) * k + Math.sin(t * 1.1 + k * 5.0) * 0.3 * env,
          by + (top.y - by) * k - env * 1.5 + Math.sin(t * 0.9 + k * 4.0) * 0.18 * env,
          bz + (top.z - bz) * k + Math.cos(t * 0.8 + k * 5.0) * 0.3 * env
        );
        m.rotation.set(0, faceY, Math.sin(t * 1.2 + k * 6.0) * 0.12);
      }
    }
  });

  const rungs = Math.max(1, Math.floor((H - 3.1) / 0.6));

  return (
    <group
      ref={ref}
      position={[props.position.x, props.position.y, props.position.z]}
      scale={0}
      onPointerDown={(e) => {
        // Balloons act as sky anchors: bridges/ropes can connect them to
        // bridge pillars (or other balloons), same flow as clicking a pillar
        const st = useGameStore.getState();
        if (st.selectedTool !== 'bridge' && st.selectedTool !== 'rope') return;
        e.stopPropagation();
        if (!st.connectingPillarId) {
          st.setConnectingPillarId(props.id);
          AudioSystem.playPop();
        } else if (st.connectingPillarId === props.id) {
          st.setConnectingPillarId(null);
        } else {
          const start = st.assets.find(a => a.id === st.connectingPillarId);
          if (start) {
            st.addAsset({
              type: st.selectedTool as any,
              position: { x: (start.position.x + props.position.x) / 2, y: 0, z: (start.position.z + props.position.z) / 2 },
              rotation: { x: 0, y: 0, z: 0 },
              connections: [st.connectingPillarId, props.id]
            });
            AudioSystem.playDig();
          }
          st.setConnectingPillarId(null);
        }
      }}
    >
      {/* Balloon + basket (sways) */}
      <group ref={swayRef} position={[0, H, 0]}>
        {/* Striped envelope: 6 sphere wedges alternating two colors */}
        {[...Array(6)].map((_, i) => (
          <mesh key={i} castShadow scale={[1, 1.25, 1]}>
            <sphereGeometry args={[2, 12, 16, (i * Math.PI * 2) / 6, Math.PI * 2 / 6]} />
            <meshStandardMaterial color={duo[i % 2]} roughness={0.6} onBeforeCompile={balloonOnBeforeCompile} />
          </mesh>
        ))}
        {/* Skirt funneling down to the basket */}
        <mesh castShadow position={[0, -2.45, 0]}>
          <cylinderGeometry args={[0.95, 0.5, 0.8, 8, 1, true]} />
          <meshStandardMaterial color={duo[0]} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh castShadow position={[0, -3.2, 0]}>
          <boxGeometry args={[0.9, 0.7, 0.9]} />
          <meshStandardMaterial color="#92400e" roughness={1} />
        </mesh>
        {[[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].map(([sx, sz], i) => (
          <mesh key={i} position={[sx, -2.9, sz]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        ))}
      </group>

      {mode === 'ladder' && (
        <group>
          {[-0.3, 0.3].map((sx, i) => (
            <mesh key={i} position={[sx, (H - 3.1) / 2, 0]} castShadow>
              <boxGeometry args={[0.07, H - 3.1, 0.07]} />
              <meshStandardMaterial color="#854d0e" roughness={1} />
            </mesh>
          ))}
          {[...Array(rungs)].map((_, i) => (
            <mesh key={i} position={[0, 0.4 + i * 0.6, 0]} castShadow>
              <boxGeometry args={[0.66, 0.06, 0.1]} />
              <meshStandardMaterial color="#a16207" roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {mode === 'rope' && (
        <group>
          <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0.12]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.8]} />
            <meshStandardMaterial color="#713f12" roughness={1} />
          </mesh>
          <mesh ref={ropeRef}>
            <cylinderGeometry args={[0.025, 0.025, 1, 8, 16]} />
            <meshStandardMaterial color="#d6c8a8" roughness={1} onBeforeCompile={ropeOnBeforeCompile} />
          </mesh>
        </group>
      )}

      {mode === 'bridge' && (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.8]} />
            <meshStandardMaterial color="#713f12" roughness={1} />
          </mesh>
          {[...Array(PLANKS)].map((_, i) => (
            <mesh key={i} ref={el => { plankRefs.current[i] = el; }} castShadow>
              <boxGeometry args={[0.95, 0.07, 0.42]} />
              <meshStandardMaterial color="#a16207" roughness={1} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// Fixed Wooden Pier (static)
export function Pier(props: any) {
  const ref = usePopIn(props.scale || 1.5);
  // Pier is absolutely static, no useMarinePhysics needed
  // Deck raised so it sits clearly above the wave crests
  return (
    <group ref={ref} position={[props.position.x, props.position.y + 0.4, props.position.z]} scale={0}>
      {/* Wooden Deck Base */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.1, 3]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {/* Planks lines */}
      {[...Array(5)].map((_, i) => (
         <mesh key={i} position={[(i - 2) * 0.55, 0.05, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.05, 3]} />
            <meshStandardMaterial color="#92400e" roughness={0.9} />
         </mesh>
      ))}
      {/* Long wooden piles reaching bottom */}
      <mesh position={[-1.2, -1.5, -1.2]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 4]}/><meshStandardMaterial color="#451a03" /></mesh>
      <mesh position={[1.2, -1.5, -1.2]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 4]}/><meshStandardMaterial color="#451a03" /></mesh>
      <mesh position={[-1.2, -1.5, 1.2]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 4]}/><meshStandardMaterial color="#451a03" /></mesh>
      <mesh position={[1.2, -1.5, 1.2]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 4]}/><meshStandardMaterial color="#451a03" /></mesh>
    </group>
  );
}

export function Boat(props: any) {
  const ref = usePopIn(props.scale || 1);
  const weather = useGameStore(state => state.weather);
  const assets = useGameStore(state => state.assets);

  const [sailParams] = useState(() => ({
    radiusX: 12 + Math.random() * 6,
    radiusZ: 8 + Math.random() * 4,
    speed: 0.15 + Math.random() * 0.1,
    offset: Math.random() * Math.PI * 2,
  }));

  const isMoored = useMemo(() => {
    return assets.some(a => a.type === 'rope' && a.connections?.includes(props.id));
  }, [assets, props.id]);

  useFrame((state) => {
    if (!ref.current) return;
    const time = state.clock.elapsedTime;

    let px: number, pz: number;

    if (isMoored) {
      // Moored boats stay at home position
      px = props.position.x;
      pz = props.position.z;
    } else {
      // Sailing boats patrol around their home position
      const angle = time * sailParams.speed * (weather === 'rainy' ? 1.4 : 1.0) + sailParams.offset;
      px = props.position.x + Math.cos(angle) * sailParams.radiusX;
      pz = props.position.z + Math.sin(angle) * sailParams.radiusZ;
      ref.current.position.x = px;
      ref.current.position.z = pz;

      // Face the direction of movement
      const nextAngle = angle + 0.01;
      const nextPx = props.position.x + Math.cos(nextAngle) * sailParams.radiusX;
      const nextPz = props.position.z + Math.sin(nextAngle) * sailParams.radiusZ;
      const moveAngle = Math.atan2(nextPx - px, nextPz - pz);
      ref.current.rotation.y += (moveAngle - ref.current.rotation.y) * 0.05;
    }

    // Wave physics at current position
    const hC = getWaterHeight(px, pz, time, weather);
    ref.current.position.y = hC + 0.1;

    const d = 1.5;
    const hX = getWaterHeight(px + d, pz, time, weather);
    const hZ = getWaterHeight(px, pz + d, time, weather);
    const targetRotX = Math.atan2(hZ - hC, d) * 0.7 + Math.cos(time * 1.6 + pz) * 0.03;
    const targetRotZ = -Math.atan2(hX - hC, d) * 0.7 + Math.sin(time * 1.4 + px) * 0.04;
    ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * 0.15;
    ref.current.rotation.z += (targetRotZ - ref.current.rotation.z) * 0.15;
  });

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}>
      {/* Hull */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.5, 3]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.08, 2.5]} />
        <meshStandardMaterial color="#ca8a04" />
      </mesh>
      {/* Sail */}
      <mesh position={[0, 1.5, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 2, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

export function RopeRenderer() {
  const assets = useGameStore(state => state.assets);
  const ropes = assets.filter(a => a.type === 'rope' && a.connections && a.connections.length === 2);

  // We map ropes to visual lines
  return (
    <>
      {ropes.map(rope => {
         const fromAsset = assets.find(a => a.id === rope.connections![0]);
         const toAsset = assets.find(a => a.id === rope.connections![1]);
         if (!fromAsset || !toAsset) return null;

         // Since boats and platforms move physically, a static line isn't perfect, but we can update it in useFrame if it was a component.
         // Let's create a dynamic rope component
         return <DynamicRope key={rope.id} fromId={fromAsset.id} toId={toAsset.id} />;
      })}
    </>
  );
}

function DynamicRope({ fromId, toId }: { fromId: string, toId: string }) {
    const fromRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const toRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const lineRef = useRef<THREE.Line>(null);
    const weather = useGameStore(state => state.weather);
    const assets = useGameStore(state => state.assets);

    const fromAsset = assets.find(a => a.id === fromId);
    const toAsset = assets.find(a => a.id === toId);

    // Compute bouncing positions independently
    const getPos = (asset: any, time: number) => {
        // Read precise visual mesh published by the boat/platform
        const gWindow = window as any;
        if (gWindow.__assetPositions && gWindow.__assetPositions[asset.id]) {
            const mesh = gWindow.__assetPositions[asset.id] as THREE.Object3D;
            
            let localOffset = new THREE.Vector3(0, 0, 0);
            if (asset.type === 'boat') {
                // Attach to the bow trims
                localOffset.set(0, 0.66, 1.85); 
            } else if (asset.type === 'platform') {
                // Attach to the front edge of the platform deck
                localOffset.set(0, 0.1, 1.4);
            }
            
            // localToWorld mutates the vector
            const worldPos = localOffset.clone();
            mesh.localToWorld(worldPos);
            return worldPos;
        }

        // Fallback for static assets like pillars
        return new THREE.Vector3(asset.position.x, asset.position.y + 0.5, asset.position.z);
    }

    useFrame((state) => {
        if (!lineRef.current || !fromAsset || !toAsset) return;
        const p1 = getPos(fromAsset, state.clock.elapsedTime);
        const p2 = getPos(toAsset, state.clock.elapsedTime);
        const geom = lineRef.current.geometry;
        
        // Create parabolic rope curve
        const points = [];
        const segments = 20; // Increased segments for smoother curve
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            // Add a subtle wind sway
            const sway = Math.sin(state.clock.elapsedTime * 2.0 + t * 5.0) * 0.2 * Math.sin(t * Math.PI);
            const px = p1.x + (p2.x - p1.x) * t + sway;
            const pz = p1.z + (p2.z - p1.z) * t + sway;
            // Natural rope sag that becomes taut (less drop) as it stretches
            const dist = p1.distanceTo(p2);
            const drop = Math.sin(t * Math.PI) * Math.max(0.05, 1.2 - dist * 0.15);
            const py = p1.y + (p2.y - p1.y) * t - drop; 
            points.push(new THREE.Vector3(px, py, pz));
        }
        geom.setFromPoints(points);
    });

    return (
        <line ref={lineRef as any}>
            <bufferGeometry />
            <lineBasicMaterial color="#ffffff" linewidth={3} />
        </line>
    );
}

export function BridgeRenderer() {
  const assets = useGameStore(state => state.assets);
  const bridges = assets.filter(a => a.type === 'bridge');

  return (
    <>
      {bridges.map(bridge => {
         let fromAsset, toAsset;
         
         if (bridge.connections && bridge.connections.length === 2) {
             fromAsset = assets.find(a => a.id === bridge.connections![0]);
             toAsset = assets.find(a => a.id === bridge.connections![1]);
         } 
         else if (bridge.connections && bridge.connections.length === 1) {
             fromAsset = { type: 'static', position: bridge.position };
             try {
                toAsset = { type: 'static', position: JSON.parse(bridge.connections[0]) };
             } catch { return null; }
         }
         else {
             return null;
         }

         if (!fromAsset || !toAsset) return null;
         return <DynamicBridge key={bridge.id} fromAsset={fromAsset} toAsset={toAsset} />;
      })}
    </>
  );
}

function DynamicBridge({ fromAsset, toAsset }: { fromAsset: any, toAsset: any }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const ropeRef = useRef<THREE.InstancedMesh>(null);
    const weather = useGameStore(state => state.weather);
    
    // Calculate required planks once based on initial static distance
    const plankCount = useMemo(() => {
        const dx = fromAsset.position.x - (toAsset.position?.x || 0);
        const dz = fromAsset.position.z - (toAsset.position?.z || 0);
        const dist = Math.sqrt(dx*dx + dz*dz);
        return Math.max(3, Math.floor(dist / 0.6));
    }, [fromAsset, toAsset]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    const getPos = (asset: any, time: number) => {
        if (asset.type === 'static') {
             return new THREE.Vector3(asset.position.x, 0.4, asset.position.z);
        }
        if (asset.type === 'bridge_pillar') {
             return new THREE.Vector3(asset.position.x, asset.position.y + 3, asset.position.z);
        }
        if (String(asset.type).startsWith('balloon')) {
             // Anchor at the top of the balloon's basket (~H above ground)
             return new THREE.Vector3(asset.position.x, asset.position.y + 8.2, asset.position.z);
        }
        if (asset.type === 'platform') {
            // Authoritative wave model + the raft hover lift
            const surf = getOceanHeight(asset.position.x, asset.position.z, time, weather);
            return new THREE.Vector3(
                asset.position.x,
                Math.max(asset.position.y, surf + getWaveAmplitude(weather) * 0.35 + 0.1),
                asset.position.z
            );
        }
        return new THREE.Vector3(
          asset.position.x,
          asset.type === 'sub_island' ? getTerrainHeight(asset.position.x, asset.position.z) : asset.position.y,
          asset.position.z
        );
    }

    const startTime = useRef<number | null>(null);

    useFrame((state) => {
        if (!meshRef.current || !ropeRef.current) return;
        if (startTime.current === null) startTime.current = state.clock.elapsedTime;
        
        const timeSinceStart = state.clock.elapsedTime - startTime.current;
        
        const p1 = getPos(fromAsset, state.clock.elapsedTime);
        const p2 = getPos(toAsset, state.clock.elapsedTime);
        const dist = p1.distanceTo(p2);
        
        for (let i = 0; i < plankCount; i++) {
            const t = i / (plankCount - 1);
            
            const delay = i * 0.05;
            let animScale = 1;
            if (timeSinceStart < delay) {
                animScale = 0;
            } else {
                animScale = Math.min(1, (timeSinceStart - delay) * 5);
            }
            
            const x = THREE.MathUtils.lerp(p1.x, p2.x, t);
            const z = THREE.MathUtils.lerp(p1.z, p2.z, t);
            
            // Parabolic suspension droop
            const droop = dist * 0.12; 
            const droopY = -droop * (1 - Math.pow(2 * t - 1, 2));
            const y = THREE.MathUtils.lerp(p1.y, p2.y, t) + droopY;

            // Calculate next point to look at
            const nextT = Math.min(1, (i + 1) / (plankCount - 1));
            const nx = THREE.MathUtils.lerp(p1.x, p2.x, nextT);
            const nz = THREE.MathUtils.lerp(p1.z, p2.z, nextT);
            const ny = THREE.MathUtils.lerp(p1.y, p2.y, nextT) - droop * (1 - Math.pow(2 * nextT - 1, 2));

            // Set Plank
            if (animScale > 0) {
                dummy.position.set(x, y, z);
                if (i < plankCount - 1) dummy.lookAt(nx, ny, nz);
                dummy.scale.set(1.5 * animScale, 0.15 * animScale, 0.4 * animScale);
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);
                
                // Set Ropes
                if (i < plankCount - 1) {
                    dummy.position.set(x, y + 0.4, z);
                    dummy.lookAt(nx, ny + 0.4, nz);
                    dummy.translateX(-0.65); // Move local left
                    dummy.translateZ(dist / plankCount * 0.5); // Shift forward
                    dummy.scale.set(0.06 * animScale, 0.06 * animScale, (dist / plankCount) * animScale);
                    dummy.updateMatrix();
                    ropeRef.current.setMatrixAt(i * 2, dummy.matrix);

                    dummy.translateX(1.3); // Move local right
                    dummy.updateMatrix();
                    ropeRef.current.setMatrixAt(i * 2 + 1, dummy.matrix);
                }
            } else {
                // Invisible plank and ropes
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);
                if (i < plankCount - 1) {
                    ropeRef.current.setMatrixAt(i * 2, dummy.matrix);
                    ropeRef.current.setMatrixAt(i * 2 + 1, dummy.matrix);
                }
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        ropeRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <instancedMesh ref={meshRef} args={[undefined, undefined, plankCount]} castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
            </instancedMesh>
            <instancedMesh ref={ropeRef} args={[undefined, undefined, plankCount * 2]} castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#d4d4d8" roughness={0.9} />
            </instancedMesh>
        </group>
    );
}

export function SubIsland(props: any) {
  const ref = usePopIn(props.scale || 1.0);
  const meshRef = useRef<THREE.Mesh>(null);
  const cursorRef = useRef<THREE.Mesh>(null);
  const [clicks, setClicks] = useState<{id: number, pos: THREE.Vector3, color: string}[]>([]);

  const selectedTool = useGameStore(state => state.selectedTool);
  const grassHealth = useGameStore(state => state.grassHealth);
  const weather = useGameStore(state => state.weather);
  const assets = useGameStore(state => state.assets);
  const isDrawing = useGameStore(state => state.isDrawing);
  const setIsDrawing = useGameStore(state => state.setIsDrawing);
  const addAsset = useGameStore(state => state.addAsset);
  const updateAsset = useGameStore(state => state.updateAsset);
  const removeAssetAt = useGameStore(state => state.removeAssetAt);

  const generatedTerrain = useMemo(
    () => props.terrain ? normalizeSubIslandTerrainData(props.terrain, props.position.x, props.position.z) : generateSubIslandTerrain(props.position.x, props.position.z),
    [props.id, props.position.x, props.position.z, props.terrain]
  );
  const positionsRef = useRef<Float32Array>(new Float32Array(generatedTerrain.positions));
  const typesRef = useRef<Uint8Array>(new Uint8Array(generatedTerrain.types));
  const colorsRef = useRef<Float32Array>(new Float32Array(positionsRef.current.length));
  const rainyGrassTint = useMemo(() => new THREE.Color('#344e41'), []);
  const healthyGrass = useMemo(() => new THREE.Color('#588157'), []);
  const deadGrass = useMemo(() => new THREE.Color('#bc6c25'), []);
  const sandColor = useMemo(() => new THREE.Color('#dda15e'), []);
  const snowColor = useMemo(() => new THREE.Color('#f8f9fa'), []);
  const stoneColor = useMemo(() => new THREE.Color('#6c757d'), []);
  const pathColor = useMemo(() => new THREE.Color('#adb5bd'), []);
  const lastBrushPoint = useRef(new THREE.Vector3());
  const flattenTargetY = useRef(0);

  useEffect(() => {
    if (!props.terrain || generatedTerrain !== props.terrain) {
      updateAsset(props.id, (asset) => ({ ...asset, terrain: generatedTerrain }));
    }
  }, [generatedTerrain, props.id, props.terrain, updateAsset]);

  useEffect(() => {
    if (props.terrain) {
      positionsRef.current = new Float32Array(props.terrain.positions);
      typesRef.current = new Uint8Array(props.terrain.types);
      colorsRef.current = new Float32Array(positionsRef.current.length);
      if (meshRef.current) {
        const geometry = meshRef.current.geometry;
        geometry.setAttribute('position', new THREE.BufferAttribute(positionsRef.current, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colorsRef.current, 3));
        geometry.computeVertexNormals();
      }
    }
  }, [props.terrain]);

  const refreshColors = () => {
    if (!meshRef.current) return;
    const geometry = meshRef.current.geometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;
    const targetColor = new THREE.Color();

    const springs = assets
      .filter((asset) => asset.type === 'spring')
      .map((asset) => new THREE.Vector3(asset.position.x, asset.position.y, asset.position.z));

    for (let i = 0; i < posAttr.count; i += 3) {
      const localHeight = (posAttr.getY(i) + posAttr.getY(i + 1) + posAttr.getY(i + 2)) / 3;
      const localX = (posAttr.getX(i) + posAttr.getX(i + 1) + posAttr.getX(i + 2)) / 3;
      const localZ = (posAttr.getZ(i) + posAttr.getZ(i + 1) + posAttr.getZ(i + 2)) / 3;
      const worldX = props.position.x + localX;
      const worldZ = props.position.z + localZ;

      if (typesRef.current[i] === 1 || typesRef.current[i + 1] === 1 || typesRef.current[i + 2] === 1) {
        targetColor.copy(pathColor);
      } else {
        if (localHeight < 0.6) {
          targetColor.copy(sandColor);
        } else if (localHeight < 4.0) {
          let springInfluence = 0;
          for (let s = 0; s < springs.length; s++) {
            const dx = worldX - springs[s].x;
            const dz = worldZ - springs[s].z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 10) {
              springInfluence = Math.max(springInfluence, (10 - dist) / 10);
            }
          }

          let localGrassHealth = Math.min(1, grassHealth / 100 + springInfluence * 1.5);
          targetColor.copy(deadGrass).lerp(healthyGrass, localGrassHealth);
          if (weather === 'snowy') {
            targetColor.lerp(snowColor, 0.7);
          } else if (weather === 'rainy') {
            targetColor.lerp(rainyGrassTint, 0.4);
          }
        } else if (localHeight < 5.8) {
          targetColor.copy(stoneColor);
        } else {
          targetColor.copy(snowColor);
        }

        const variation = (i % 5 === 0) ? 0.02 : (i % 3 === 0) ? -0.02 : 0;
        if (variation !== 0) {
          const hsl = { h: 0, s: 0, l: 0 };
          targetColor.getHSL(hsl);
          targetColor.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + variation)));
        }
      }

      colorAttr.setXYZ(i, targetColor.r, targetColor.g, targetColor.b);
      colorAttr.setXYZ(i + 1, targetColor.r, targetColor.g, targetColor.b);
      colorAttr.setXYZ(i + 2, targetColor.r, targetColor.g, targetColor.b);
    }

    colorAttr.needsUpdate = true;
  };

  useEffect(() => {
    refreshColors();
  }, [assets, grassHealth, weather]);

  const persistTerrain = () => {
    updateAsset(props.id, (asset) => ({
      ...asset,
      terrain: {
        size: generatedTerrain.size,
        segments: generatedTerrain.segments,
        positions: Array.from(positionsRef.current),
        types: Array.from(typesRef.current)
      }
    }));
  };

  const applyBrush = (worldPoint: THREE.Vector3, isDragEvent: boolean, event?: any) => {
    if (!meshRef.current) return;
    if (isDragEvent && !['terrainUp', 'terrainDown', 'eraser', 'pave', 'treeA', 'treeB', 'rock', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot'].includes(selectedTool)) {
      return;
    }

    if (isDragEvent) {
      const isObjectPlacement = ['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'].includes(selectedTool);
      const minDistance = isObjectPlacement ? 1.5 : 0.2;
      if (worldPoint.distanceTo(lastBrushPoint.current) < minDistance) return;
      lastBrushPoint.current.copy(worldPoint);
    }

    const localPoint = worldPoint.clone();
    meshRef.current.worldToLocal(localPoint);
    const geometry = meshRef.current.geometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const brushVertex = new THREE.Vector3();
    const sampledGroundY = getTerrainHeight(worldPoint.x, worldPoint.z);
    const placementY = sampledGroundY > -0.5 ? Math.max(sampledGroundY, worldPoint.y) : worldPoint.y;

    if (!isDragEvent || Math.random() < 0.2) {
      let color = "#ffffff";
      if (['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'].includes(selectedTool)) color = "#4ade80";
      if (['terrainUp', 'terrainDown', 'rock', 'pave'].includes(selectedTool)) color = "#d1d5db";
      if (selectedTool === 'spring' || selectedTool === 'pond') color = "#3b82f6";
      if (['deer', 'wolf'].includes(selectedTool)) color = "#fbbf24";
      if (selectedTool === 'eraser') color = "#ef4444";
      setClicks(prev => [...prev.slice(-9), { id: Date.now() + Math.random(), pos: worldPoint.clone(), color }]);

      if (!isDragEvent || Math.random() < 0.1) {
        if (['terrainUp', 'terrainDown', 'pave', 'rock'].includes(selectedTool)) {
          AudioSystem.playDig();
        } else if (selectedTool !== 'eraser' && selectedTool !== 'none') {
          AudioSystem.playPop();
        }
      }
    }

    if (selectedTool === 'pave') {
      if (!meshRef.current) return;
      const geometry = meshRef.current.geometry;
      const posAttr = geometry.attributes.position;
      const { brushSize, brushStrength, brushFalloff } = useGameStore.getState();
      const paintChanged = paintSurface(typesRef.current, posAttr.array as Float32Array, {
        mode: 'paint', size: 1.5, strength: brushStrength, falloff: brushFalloff,
        isDrag: isDragEvent, px: localPoint.x, pz: localPoint.z, paintType: 1, // 1 = 小路
      });
      if (paintChanged) {
        refreshColors();
        if (!isDragEvent) persistTerrain();
      }
      return;
    }

    // ── 地形笔刷（隆起/挖低/找平/柔化/材质）──
    if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {
      const { brushMode, brushSize, brushStrength, brushFalloff, brushPaintType } = useGameStore.getState();
      if (!isDragEvent) flattenTargetY.current = localPoint.y;

      if (brushMode === 'paint') {
        // 材质笔刷：改 types 数组，不改高度
        const paintChanged = paintSurface(typesRef.current, posAttr.array as Float32Array, {
          mode: 'paint', size: brushSize, strength: brushStrength, falloff: brushFalloff,
          isDrag: isDragEvent, px: localPoint.x, pz: localPoint.z, paintType: brushPaintType,
        });
        if (paintChanged) {
          refreshColors();
          positionsRef.current = new Float32Array(posAttr.array);
          if (!isDragEvent) persistTerrain();
        }
      } else {
        // 高度笔刷：改 positions 数组（隆起/挖低/找平/柔化）
        const changed = applyTerrainBrush(posAttr.array as Float32Array, {
          mode: brushMode, size: brushSize, strength: brushStrength, falloff: brushFalloff,
          isDrag: isDragEvent, px: localPoint.x, pz: localPoint.z, targetY: flattenTargetY.current,
        });
        if (changed) {
          posAttr.needsUpdate = true;
          geometry.computeVertexNormals();
          refreshColors(); // 坡度自动贴材质
          positionsRef.current = new Float32Array(posAttr.array);
          if (!isDragEvent) persistTerrain();
        }
      }
      return;
    }

    if (selectedTool === 'eraser') {
      useGameStore.getState().setSelectedEntityId(null);
      return;
    }

    const landPlaceableTools = ['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'deer', 'wolf', 'spring', 'pond', 'streetlamp', 'lantern_girl', 'house', 'windmill', 'lighthouse', 'balloon', 'balloon_ladder', 'balloon_bridge', 'bridge_pillar', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'];
    if (!isDragEvent && landPlaceableTools.includes(selectedTool)) {
      // Ponds may sit in dug-out valleys below sea level; everything else
      // must rest on land.
      if (placementY <= -0.5 && selectedTool !== 'pond') return;

      let rx = 0;
      let rz = 0;
      const verticalTools = ['house', 'windmill', 'lighthouse', 'streetlamp', 'lantern_girl', 'sub_island', 'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'balloon', 'balloon_ladder', 'balloon_bridge', 'bridge_pillar', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel', 'pond', 'spring'];
      if (event && event.face && event.face.normal && !verticalTools.includes(selectedTool)) {
        const normal = event.face.normal.clone();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
        rx = euler.x;
        rz = euler.z;
      }

      const isPillar = selectedTool === 'bridge_pillar';

      if (selectedTool === 'pond') {
        const centerH = getTerrainHeight(worldPoint.x, worldPoint.z);
        const changed = applyTerrainBrush(posAttr.array as Float32Array, {
          mode: 'flatten', targetY: placementY - 0.7, size: 8.5, strength: 1.0, falloff: 'flat_center',
          isDrag: false, px: localPoint.x, pz: localPoint.z
        });
        if (changed) {
          posAttr.needsUpdate = true;
          geometry.computeVertexNormals();
          refreshColors();
          positionsRef.current = new Float32Array(posAttr.array);
          persistTerrain();
        }
      }
      
      if (selectedTool === 'spring') {
        const changed = applyTerrainBrush(posAttr.array as Float32Array, {
          mode: 'flatten', targetY: placementY, size: 4.0, strength: 1.0, falloff: 'flat_center',
          isDrag: false, px: localPoint.x, pz: localPoint.z
        });
        if (changed) {
          posAttr.needsUpdate = true;
          geometry.computeVertexNormals();
          refreshColors();
          positionsRef.current = new Float32Array(posAttr.array);
          persistTerrain();
        }
      }

      // 池塘：挖浅碗 + 贴地拟合，如果放在 SubIsland 上则通过 skipBrush 仅计算不改主岛
      const placedCustom = selectedTool === 'pond'
        ? carvePondAndEncode(worldPoint.x, worldPoint.z, true)
        : (String(selectedTool).startsWith('balloon') ? useGameStore.getState().balloonColor : undefined);
      addAsset({
        type: selectedTool as any,
        position: { x: worldPoint.x, y: placementY, z: worldPoint.z },
        rotation: { x: rx, y: isPillar ? 0 : Math.random() * Math.PI * 2, z: rz },
        scale: isPillar ? 1.0 : 0.8 + Math.random() * 0.4,
        customState: placedCustom
      });
    }
  };

  const onPointerDown = (e: any) => {
    if (selectedTool === 'none') return;
    e.stopPropagation();
    if (e.button !== 0) return;
    if (selectedTool === 'eraser') {
      useGameStore.getState().setSelectedEntityId(null);
      return;
    }
    setIsDrawing(true);
    applyBrush(e.point, false, e);
    if (e.target && e.pointerId !== undefined) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerUp = (e: any) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    persistTerrain();
    if (e.target && e.pointerId !== undefined) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const onPointerMove = (e: any) => {
    if (selectedTool !== 'none' && cursorRef.current) {
      e.stopPropagation();
      cursorRef.current.visible = true;
      cursorRef.current.position.copy(e.point);
      cursorRef.current.position.y += 0.05;

      if (e.face) {
        const n = e.face.normal;
        cursorRef.current.lookAt(e.point.x + n.x, e.point.y + n.y + 0.05, e.point.z + n.z);
      }

      let cursorScale = 1;
      if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') cursorScale = useGameStore.getState().brushSize;
      if (selectedTool === 'eraser') cursorScale = 2;
      cursorRef.current.scale.setScalar(cursorScale);
    }

    if (isDrawing) {
      e.stopPropagation();
      applyBrush(e.point, true, e);
    }
  };

  const onPointerOut = () => {
    if (cursorRef.current) cursorRef.current.visible = false;
  };

  useFrame(({ clock }) => {
    if (cursorRef.current && cursorRef.current.visible) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 8) * 0.08;
      cursorRef.current.scale.multiplyScalar(pulse / cursorRef.current.scale.x);
      cursorRef.current.rotation.z = clock.elapsedTime * 2;
    }
  });

  return (
    <group
      ref={ref}
      position={[props.position.x, props.position.y, props.position.z]}
      rotation={new THREE.Euler(0, props.rotation?.y || 0, 0, 'YXZ')}
      scale={0}
    >
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positionsRef.current} count={positionsRef.current.length / 3} itemSize={3} />
          <bufferAttribute attach="attributes-color" array={colorsRef.current} count={colorsRef.current.length / 3} itemSize={3} />
        </bufferGeometry>
        <meshStandardMaterial vertexColors flatShading roughness={0.92} />
      </mesh>

      <mesh ref={cursorRef} visible={false}>
        <ringGeometry args={[0.8, 1, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {clicks.map(c => <ParticleBurst key={c.id} position={c.pos} color={c.color} />)}
    </group>
  );
}

export function BridgePillar(props: any) {
    const ref = usePopIn(props.scale || 1);
    const selectedTool = useGameStore(state => state.selectedTool);
    const connectingPillarId = useGameStore(state => state.connectingPillarId);
    const setConnectingPillarId = useGameStore(state => state.setConnectingPillarId);
    const addAsset = useGameStore(state => state.addAsset);
    const assets = useGameStore(state => state.assets);
    
    // 3D Point to Segment Distance
    const checkLineOfSight = (p1: THREE.Vector3, p2: THREE.Vector3) => {
        // The bridge connects the TOPS of the pillars
        const A = new THREE.Vector3(p1.x, p1.y + 3, p1.z);
        const B = new THREE.Vector3(p2.x, p2.y + 3, p2.z);
        const AB = new THREE.Vector3().subVectors(B, A);
        const lengthSq = AB.lengthSq();

        for (const a of assets) {
            if (a.id === props.assetId || a.id === connectingPillarId) continue;
            // Ignore small or flat items (balloons float far above bridge
            // height — only a thin stake sits on the ground)
            if (['platform', 'spring', 'pond', 'pave', 'boat', 'bridge', 'rope', 'balloon', 'balloon_ladder', 'balloon_bridge'].includes(a.type)) continue;
            
            // Define obstacle center and radius based on type
            let height = 2;
            let radius = 1.0;
            if (['house', 'sub_island'].includes(a.type)) { height = 3; radius = 2.0; }
            if (a.type === 'windmill') { height = 6; radius = 2.0; }
            if (a.type === 'lighthouse') { height = 8; radius = 2.0; }
            if (['treeA', 'treeB'].includes(a.type)) { height = 4; radius = 1.0; }
            if (a.type === 'rock') { height = 2; radius = 1.2; }

            const P = new THREE.Vector3(a.position.x, a.position.y + height / 2, a.position.z);
            const AP = new THREE.Vector3().subVectors(P, A);

            let t = 0;
            if (lengthSq !== 0) {
                t = AP.dot(AB) / lengthSq;
                t = Math.max(0, Math.min(1, t));
            }
            
            const proj = new THREE.Vector3().copy(A).add(AB.clone().multiplyScalar(t));
            const dist = P.distanceTo(proj);
            
            if (dist < radius) {
                // Check if the bridge passes completely above the obstacle
                // proj.y is the height of the bridge at this point
                // a.position.y + height is the top of the obstacle
                if (proj.y < a.position.y + height) {
                    return false; // Blocked!
                }
            }
        }
        return true;
    };

    return (
        <group 
            ref={ref} 
            position={[props.position.x, props.position.y, props.position.z]}
            onPointerDown={(e) => {
                if (selectedTool === 'bridge' || selectedTool === 'rope') {
                    e.stopPropagation();
                    if (!connectingPillarId) {
                        setConnectingPillarId(props.assetId);
                        AudioSystem.playPop();
                    } else if (connectingPillarId === props.assetId) {
                        setConnectingPillarId(null);
                    } else {
                        const startPillar = assets.find(a => a.id === connectingPillarId);
                        if (startPillar) {
                            const p1 = new THREE.Vector3(startPillar.position.x, startPillar.position.y, startPillar.position.z);
                            const p2 = new THREE.Vector3(props.position.x, props.position.y, props.position.z);
                            
                            if (checkLineOfSight(p1, p2)) {
                                addAsset({
                                    type: selectedTool as any,
                                    position: { x: (p1.x+p2.x)/2, y: 0, z: (p1.z+p2.z)/2 },
                                    rotation: { x:0, y:0, z:0 },
                                    connections: [connectingPillarId, props.assetId]
                                });
                                AudioSystem.playDig();
                            } else {
                                alert("建造失败：桥梁被障碍物（如建筑、树木）遮挡！\n如果在高处建桥，请确保桥面高度超过障碍物顶部。");
                            }
                        }
                        setConnectingPillarId(null);
                    }
                }
            }}
        >
            <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 3]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 3, 0]}>
                <boxGeometry args={[1, 0.2, 1]} />
                <meshStandardMaterial color="#92400e" roughness={0.9} />
            </mesh>
            {connectingPillarId === props.assetId && (
                <pointLight color="#34d399" intensity={2} distance={5} position={[0, 4, 0]} />
            )}
        </group>
    );
}

export function Dolphin(props: any) {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);
    
    const [params] = useState(() => ({
        radius: 8 + Math.random() * 8,
        speed: 0.8 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
    }));

    const jumpState = useRef({
        isJumping: false,
        jumpTime: 0,
        nextJumpDelay: 5 + Math.random() * 10
    });

    useFrame(({ clock }, delta) => {
        if (!groupRef.current || !bodyRef.current) return;
        const t = clock.elapsedTime;
        
        const angle = t * params.speed + params.offset;
        groupRef.current.position.x = props.position.x + Math.cos(angle) * params.radius;
        groupRef.current.position.z = props.position.z + Math.sin(angle) * params.radius;
        groupRef.current.rotation.y = -angle + Math.PI;

        const state = jumpState.current;
        state.nextJumpDelay -= delta;

        if (!state.isJumping && state.nextJumpDelay <= 0) {
            state.isJumping = true;
            state.jumpTime = 0;
            useGameStore.getState().spawnVFX('splash', groupRef.current.position);
        }

        if (state.isJumping) {
            state.jumpTime += delta * 1.2; 
            const x = (state.jumpTime / 1.0) * 2 - 1; 
            
            if (x >= 1) {
                state.isJumping = false;
                state.nextJumpDelay = 5 + Math.random() * 10;
                bodyRef.current.position.y = -0.5;
                bodyRef.current.rotation.x = 0;
                useGameStore.getState().spawnVFX('splash', groupRef.current.position);
            } else {
                bodyRef.current.position.y = -0.5 + (1 - x * x) * 4;
                bodyRef.current.rotation.x = -x * Math.PI * 0.4;
            }
        } else {
            bodyRef.current.position.y = -0.5 + Math.sin(t * 3) * 0.2;
            bodyRef.current.rotation.x = Math.cos(t * 3) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            <group ref={bodyRef}>
                <mesh castShadow rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.2, 0.4, 1.5, 8]} />
                    <meshStandardMaterial color="#64748b" roughness={0.3} />
                </mesh>
                <mesh castShadow position={[0, 0, 0.75]} rotation={[Math.PI/2, 0, 0]}>
                    <coneGeometry args={[0.2, 0.5, 8]} />
                    <meshStandardMaterial color="#64748b" roughness={0.3} />
                </mesh>
                <mesh castShadow position={[0, 0.3, 0]} rotation={[Math.PI/4, 0, 0]}>
                    <coneGeometry args={[0.1, 0.5, 4]} />
                    <meshStandardMaterial color="#475569" roughness={0.3} />
                </mesh>
                <mesh castShadow position={[0, 0, -0.8]}>
                    <boxGeometry args={[0.6, 0.05, 0.4]} />
                    <meshStandardMaterial color="#475569" roughness={0.3} />
                </mesh>
            </group>
        </group>
    );
}

export function FishSchool(props: any) {
    const groupRef = useRef<THREE.Group>(null);
    const timeOfDay = useGameStore(state => state.timeOfDay);
    const isNight = timeOfDay > 18 || timeOfDay < 6;

    const FISH_COUNT = 6;
    const [fishData] = useState(() => {
        const arr: {
            pos: THREE.Vector3;
            vel: THREE.Vector3;
            phase: number;
        }[] = [];
        for (let i = 0; i < FISH_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 1.5;
            arr.push({
                pos: new THREE.Vector3(
                    props.position.x + Math.cos(angle) * r,
                    -0.5,
                    props.position.z + Math.sin(angle) * r
                ),
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    0,
                    (Math.random() - 0.5) * 0.5
                ),
                phase: Math.random() * Math.PI * 2,
            });
        }
        return arr;
    });

    // Boids 参数
    const BOID_SEP_DIST = 0.6;
    const BOID_ALI_DIST = 2.0;
    const BOID_COH_DIST = 2.5;
    const BOID_MAX_SPEED = 0.8;
    const BOID_CENTER_PULL = 0.3;

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;

        // ── Boids 群游算法 ──────────────────────────────
        const center = new THREE.Vector3(props.position.x, -0.5, props.position.z);

        for (let i = 0; i < fishData.length; i++) {
            const fish = fishData[i];
            const sep = new THREE.Vector3();
            const ali = new THREE.Vector3();
            const coh = new THREE.Vector3();
            let sepCount = 0, aliCount = 0, cohCount = 0;

            for (let j = 0; j < fishData.length; j++) {
                if (i === j) continue;
                const other = fishData[j];
                const dist = fish.pos.distanceTo(other.pos);

                // 分离
                if (dist < BOID_SEP_DIST && dist > 0) {
                    const diff = new THREE.Vector3().subVectors(fish.pos, other.pos).normalize().divideScalar(dist);
                    sep.add(diff);
                    sepCount++;
                }
                // 对齐
                if (dist < BOID_ALI_DIST) {
                    ali.add(other.vel);
                    aliCount++;
                }
                // 聚合
                if (dist < BOID_COH_DIST) {
                    coh.add(other.pos);
                    cohCount++;
                }
            }

            // 应用规则
            if (sepCount > 0) {
                sep.divideScalar(sepCount).normalize().multiplyScalar(0.05);
                fish.vel.add(sep);
            }
            if (aliCount > 0) {
                ali.divideScalar(aliCount).normalize().multiplyScalar(0.02);
                fish.vel.add(ali);
            }
            if (cohCount > 0) {
                coh.divideScalar(cohCount);
                const toCoh = new THREE.Vector3().subVectors(coh, fish.pos).normalize().multiplyScalar(0.03);
                fish.vel.add(toCoh);
            }

            // 朝中心拉回 (防止游太远)
            const toCenter = new THREE.Vector3().subVectors(center, fish.pos);
            if (toCenter.length() > 3) {
                fish.vel.add(toCenter.normalize().multiplyScalar(BOID_CENTER_PULL * delta));
            }

            // 限速
            if (fish.vel.length() > BOID_MAX_SPEED) {
                fish.vel.normalize().multiplyScalar(BOID_MAX_SPEED);
            }

            // 更新位置
            fish.pos.add(fish.vel.clone().multiplyScalar(delta * 2));
            // 保持在水下
            fish.pos.y = -0.5 + Math.sin(t * 2 + fish.phase) * 0.15;
        }

        // ── 更新 mesh ──────────────────────────────────
        groupRef.current.children.forEach((fishGroup, i) => {
            if (i >= fishData.length) return;
            const data = fishData[i];
            fishGroup.position.copy(data.pos);
            // 朝向运动方向
            if (data.vel.lengthSq() > 0.001) {
                const angle = Math.atan2(data.vel.x, data.vel.z);
                fishGroup.rotation.y = angle;
            }
            // 飘尾动画
            const tail = fishGroup.children[1]; // tail mesh
            if (tail) {
                tail.rotation.y = Math.sin(t * 8 + data.phase) * 0.4;
            }
        });
    });

    const bodyColor = isNight ? "#38bdf8" : "#f97316";
    const bellyColor = isNight ? "#0ea5e9" : "#fef3c7";
    const tailColor = isNight ? "#7dd3fc" : "#ea580c";
    const emissiveProps = isNight
        ? { emissive: "#0ea5e9", emissiveIntensity: 4.0, toneMapped: false }
        : {};

    return (
        <group ref={groupRef}>
            {fishData.map((_, i) => (
                <group key={i}>
                    {/* 鱼身 - 纺锤体 */}
                    <mesh rotation={[0, Math.PI / 2, 0]}>
                        <sphereGeometry args={[0.12, 6, 4]} />
                        <meshStandardMaterial color={bodyColor} flatShading {...emissiveProps} />
                    </mesh>
                    {/* 鱼腹 */}
                    <mesh position={[0, -0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <sphereGeometry args={[0.1, 6, 3]} />
                        <meshStandardMaterial color={bellyColor} flatShading {...emissiveProps} />
                    </mesh>
                    {/* 鱼尾 - 飘动 */}
                    <mesh position={[0, 0, -0.15]} rotation={[0, Math.PI, 0]}>
                        <coneGeometry args={[0.1, 0.15, 4]} />
                        <meshStandardMaterial color={tailColor} flatShading {...emissiveProps} />
                    </mesh>
                    {/* 背鳍 */}
                    <mesh position={[0, 0.1, -0.02]} rotation={[0.3, 0, 0]}>
                        <boxGeometry args={[0.02, 0.06, 0.1]} />
                        <meshStandardMaterial color={tailColor} flatShading {...emissiveProps} />
                    </mesh>
                    {/* 眼睛 */}
                    <mesh position={[-0.06, 0.02, 0.08]}>
                        <sphereGeometry args={[0.02, 4, 4]} />
                        <meshStandardMaterial color="#1c1917" />
                    </mesh>
                    <mesh position={[0.06, 0.02, 0.08]}>
                        <sphereGeometry args={[0.02, 4, 4]} />
                        <meshStandardMaterial color="#1c1917" />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

export function Seagull(props: any) {
    const groupRef = useRef<THREE.Group>(null);
    const leftWing = useRef<THREE.Mesh>(null);
    const rightWing = useRef<THREE.Mesh>(null);
    const searchTickRef = useRef(0);
    
    const flightParams = useMemo(() => ({
        radius: 10 + Math.random() * 20,
        speed: 0.2 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
        baseY: 15 + Math.random() * 10,
        flapSpeed: 10 + Math.random() * 5
    }), []);

    const currentCenter = useRef(new THREE.Vector3(props.position.x, flightParams.baseY, props.position.z));
    const currentRadius = useRef(flightParams.radius);
    const targetCenterRef = useRef(new THREE.Vector3(props.position.x, flightParams.baseY, props.position.z));
    const targetRadiusRef = useRef(flightParams.radius);
    const isGatheringRef = useRef(false);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;
        searchTickRef.current += delta;

        if (searchTickRef.current >= 0.35) {
            searchTickRef.current = 0;
            const assets = useGameStore.getState().assets;
            let nearest: PlacedAsset | null = null;
            let minDistSq = Infinity;

            for (let i = 0; i < assets.length; i++) {
                const asset = assets[i];
                if (asset.type !== 'birdhouse' || asset.customState !== 'gather') continue;
                const dx = asset.position.x - props.position.x;
                const dz = asset.position.z - props.position.z;
                const dSq = dx * dx + dz * dz;
                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    nearest = asset;
                }
            }

            if (nearest) {
                targetCenterRef.current.set(
                    nearest.position.x,
                    nearest.position.y + 2.5 + Math.random(),
                    nearest.position.z
                );
                targetRadiusRef.current = 1.5 + Math.random() * 2;
                isGatheringRef.current = true;
            } else {
                targetCenterRef.current.set(props.position.x, flightParams.baseY, props.position.z);
                targetRadiusRef.current = flightParams.radius;
                isGatheringRef.current = false;
            }
        }

        // Smoothly interpolate current center and radius towards target
        currentCenter.current.lerp(targetCenterRef.current, delta * 1.5);
        currentRadius.current += (targetRadiusRef.current - currentRadius.current) * delta * 1.5;

        const currentSpeedMultiplier = isGatheringRef.current ? 3 : 1;
        const angle = t * flightParams.speed * currentSpeedMultiplier + flightParams.offset;
        
        groupRef.current.position.x = currentCenter.current.x + Math.cos(angle) * currentRadius.current;
        groupRef.current.position.z = currentCenter.current.z + Math.sin(angle) * currentRadius.current;
        groupRef.current.position.y = currentCenter.current.y + Math.sin(t * 2) * 1.5; 
        
        groupRef.current.rotation.y = -angle + Math.PI;

        const flap = Math.sin(t * flightParams.flapSpeed) * 0.5;
        if (leftWing.current) leftWing.current.rotation.z = -flap;
        if (rightWing.current) rightWing.current.rotation.z = flap;
    });

    return (
        <group ref={groupRef} scale={0.5}>
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.3, 0.3, 0.8]} />
                <meshStandardMaterial color="#f8fafc" />
            </mesh>
            <mesh position={[0, 0.1, 0.5]} rotation={[Math.PI/2, 0, 0]} castShadow>
                <coneGeometry args={[0.08, 0.3, 4]} />
                <meshStandardMaterial color="#facc15" />
            </mesh>
            <group position={[-0.15, 0.1, 0]} ref={leftWing}>
                <mesh position={[-0.4, 0, 0]} castShadow>
                    <boxGeometry args={[0.8, 0.05, 0.3]} />
                    <meshStandardMaterial color="#e2e8f0" />
                </mesh>
            </group>
            <group position={[0.15, 0.1, 0]} ref={rightWing}>
                <mesh position={[0.4, 0, 0]} castShadow>
                    <boxGeometry args={[0.8, 0.05, 0.3]} />
                    <meshStandardMaterial color="#e2e8f0" />
                </mesh>
            </group>
        </group>
    );
}

function VFXInstance({ vfx }: { vfx: any }) {
    const removeVFX = useGameStore(state => state.removeVFX);
    const ref = useRef<THREE.Group>(null);
    const particles = useMemo(() => {
        const arr = [];
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            arr.push({
                vx: Math.cos(angle) * (2 + Math.random() * 3),
                vy: (vfx.type === 'splash' ? 3 : 1) + Math.random() * 3,
                vz: Math.sin(angle) * (2 + Math.random() * 3),
            });
        }
        return arr;
    }, [vfx.type]);

    useEffect(() => {
        const timeout = setTimeout(() => removeVFX(vfx.id), 1000);
        return () => clearTimeout(timeout);
    }, [vfx.id, removeVFX]);

    useFrame((_, delta) => {
        if (!ref.current) return;
        ref.current.children.forEach((mesh, i) => {
            const p = particles[i];
            mesh.position.x += p.vx * delta;
            mesh.position.y += p.vy * delta;
            mesh.position.z += p.vz * delta;
            p.vy -= 10 * delta; 
            mesh.scale.multiplyScalar(0.9); 
        });
    });

    let color = "#cbd5e1"; 
    if (vfx.type === 'splash') color = "#ffffff";
    if (vfx.type === 'blood') color = "#b91c1c";

    return (
        <group ref={ref} position={[vfx.position.x, vfx.position.y + 0.5, vfx.position.z]}>
            {particles.map((_, i) => (
                <mesh key={i}>
                    <boxGeometry args={[0.2, 0.2, 0.2]} />
                    <meshBasicMaterial color={color} />
                </mesh>
            ))}
        </group>
    );
}

function VFXSystem() {
    const vfxQueue = useGameStore(state => state.vfxQueue);
    return (
        <group>
            {vfxQueue.map(vfx => <VFXInstance key={vfx.id} vfx={vfx} />)}
        </group>
    );
}

export function Birdhouse(props: any) {
    const updateAsset = useGameStore(state => state.updateAsset);
    const isGathering = props.customState === 'gather';

    return (
        <group 
            position={[props.position.x, props.position.y, props.position.z]}
            onClick={(e) => {
                e.stopPropagation();
                updateAsset(props.id, (asset) => ({ 
                    ...asset, 
                    customState: isGathering ? 'release' : 'gather' 
                }));
                AudioSystem.playPop();
            }}
            onPointerOver={(e) => {
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                document.body.style.cursor = 'auto';
            }}
        >
            <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 1]} />
                <meshStandardMaterial color="#78350f" />
            </mesh>
            <mesh position={[0, 1.1, 0]} castShadow>
                <boxGeometry args={[0.6, 0.4, 0.6]} />
                <meshStandardMaterial color="#fef3c7" />
            </mesh>
            <mesh position={[0, 1.4, 0]} rotation={[0, Math.PI/4, 0]} castShadow>
                <coneGeometry args={[0.5, 0.4, 4]} />
                <meshStandardMaterial color="#b91c1c" />
            </mesh>
            <mesh position={[0, 1.1, 0.31]}>
                <circleGeometry args={[0.1, 16]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
            {isGathering && (
                <pointLight color="#fbbf24" intensity={2} distance={3} position={[0, 1.6, 0]} />
            )}
        </group>
    );
}

function Farmland({ position, scale = 1, id }: any) {
  const ref = usePopIn(scale);
  return (
    <group position={[position.x, position.y, position.z]} scale={scale} ref={ref}>
      {/* Base soil mound */}
      <mesh receiveShadow position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial color="#3f2716" roughness={1} flatShading />
      </mesh>
      
      {/* Hand-drawn stylized soil mounds */}
      <mesh receiveShadow position={[0, 0.08, 0]} rotation={[-Math.PI / 2 + 0.05, 0, 0]}>
        <planeGeometry args={[2.3, 2.3]} />
        <meshStandardMaterial color="#4a3018" roughness={1} flatShading />
      </mesh>

      {/* Dirt rows */}
      {[...Array(4)].map((_, i) => (
        <group key={i} position={[0, 0.12, -0.9 + i * 0.6]}>
          <mesh rotation={[-Math.PI / 2, Math.random() * 0.05, 0]} receiveShadow>
             <planeGeometry args={[2.3, 0.15]} />
             <meshStandardMaterial color="#2a1b0f" roughness={1} flatShading />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, Math.random() * 0.05, 0]}>
             <cylinderGeometry args={[0.08, 0.08, 2.2, 4]} />
             <meshStandardMaterial color="#352112" roughness={1} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Crop({ position, scale = 1, type, growthProgress = 0, plantedAt }: any) {
  const isWheat = type === 'crop_wheat';
  const playtime = useGameStore(state => state.stats.playtime);
  const localProgress = getCropGrowthProgress({ growthProgress, plantedAt }, playtime);

  // Visual growth stages based on progress
  let visualScale: number;
  let color: string;

  if (localProgress < 0.3) {
    // Small green sprout
    visualScale = 0.3;
    color = '#4ade80';
  } else if (localProgress < 0.7) {
    // Medium green stalk/top
    visualScale = 0.6;
    color = '#22c55e';
  } else {
    // Full grown
    visualScale = 1.0;
    color = isWheat ? '#eab308' : '#22c55e';
  }

  const h = isWheat ? 1.5 : 0.6;
  const currentHeight = Math.max(0.1, h * visualScale);
  const isGrown = localProgress >= 0.7;

  return (
    <group position={[position.x, position.y, position.z]} scale={scale}>
       <group position={[0, currentHeight / 2, 0]}>
         {/* Plants using cross-planes for hand-drawn/paper feel */}
         {[...Array(3)].map((_, i) => (
           <group key={i} position={[(i-1)*0.4, 0, (i%2 === 0 ? 0.2 : -0.2)]}>
             <mesh rotation={[0, Math.PI / 4 + Math.random()*0.2, 0]} castShadow>
               <planeGeometry args={[0.3, currentHeight]} />
               <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} transparent opacity={0.9} flatShading />
             </mesh>
             <mesh rotation={[0, -Math.PI / 4 + Math.random()*0.2, 0]} castShadow>
               <planeGeometry args={[0.3, currentHeight]} />
               <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} transparent opacity={0.9} flatShading />
             </mesh>
             
             {/* Carrot orange root visible when grown */}
             {!isWheat && isGrown && (
               <mesh position={[0, -currentHeight/2 + 0.15, 0]} castShadow>
                 <coneGeometry args={[0.15, 0.4, 4]} />
                 <meshStandardMaterial color="#f97316" roughness={0.7} flatShading />
               </mesh>
             )}
             
             {/* Wheat golden head when grown */}
             {isWheat && isGrown && (
               <mesh position={[0, currentHeight/2 - 0.1, 0]} castShadow>
                 <octahedronGeometry args={[0.18, 0]} />
                 <meshStandardMaterial color="#fbbf24" roughness={0.6} flatShading />
               </mesh>
             )}
           </group>
         ))}
       </group>
    </group>
  );
}


export function Tent(props: any) {
  const ref = usePopIn(props.scale || 1);
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
      {/* Front Wooden Frame */}
      <mesh position={[0, 0.9, 1.0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      <mesh position={[0, 0.9, 1.0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>

      {/* Back Wooden Frame */}
      <mesh position={[0, 0.9, -1.0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      <mesh position={[0, 0.9, -1.0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>

      {/* Top Ridge Pole (Crossbar) */}
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#451a03" roughness={0.8} flatShading />
      </mesh>
      
      {/* Canvas Main - Left side */}
      <mesh position={[-0.6, 0.9, 0]} rotation={[0, 0, Math.PI / 6]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 2.1, 2.1]} />
        <meshStandardMaterial color="#fef3c7" roughness={1} flatShading />
      </mesh>
      {/* Canvas Main - Right side */}
      <mesh position={[0.6, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 2.1, 2.1]} />
        <meshStandardMaterial color="#fef3c7" roughness={1} flatShading />
      </mesh>

      {/* Ropes and Pegs */}
      {[-1, 1].map((sideX) => 
        [-1, 1].map((sideZ) => (
           <group key={`${sideX}-${sideZ}`}>
             <mesh position={[sideX * 0.9, 0.4, sideZ * 1.0]} rotation={[0, 0, sideX * -Math.PI / 4]} castShadow>
               <cylinderGeometry args={[0.015, 0.015, 1.2, 4]} />
               <meshStandardMaterial color="#e5e5e5" roughness={1} flatShading />
             </mesh>
             <mesh position={[sideX * 1.3, 0.05, sideZ * 1.0]} rotation={[sideZ * 0.2, 0, sideX * -Math.PI / 6]} castShadow>
               <cylinderGeometry args={[0.03, 0.01, 0.2, 4]} />
               <meshStandardMaterial color="#52525b" roughness={0.7} flatShading />
             </mesh>
           </group>
        ))
      )}

      {/* Back flap */}
      <mesh position={[0, 0.7, -0.95]} rotation={[Math.PI / 10, 0, 0]} castShadow>
        <planeGeometry args={[1.5, 1.7]} />
        <meshStandardMaterial color="#fde68a" roughness={1} side={THREE.DoubleSide} flatShading />
      </mesh>
      
      {/* Floor blanket */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.7, 2.0]} />
        <meshStandardMaterial color="#92400e" roughness={1} flatShading />
      </mesh>

      {/* Lantern */}
      <group position={[0, 0.8, 0.8]}>
         <mesh position={[0, 0.1, 0]} castShadow>
           <cylinderGeometry args={[0.01, 0.01, 0.2, 4]} />
           <meshStandardMaterial color="#1c1917" />
         </mesh>
         <mesh castShadow>
           <cylinderGeometry args={[0.06, 0.08, 0.15, 6]} />
           <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} flatShading />
         </mesh>
         <pointLight color="#fde047" distance={3} intensity={0.8} />
      </group>

      {/* Inside Details */}
      <mesh position={[-0.3, 0.15, -0.4]} rotation={[0, Math.PI/8, 0]} castShadow>
        <boxGeometry args={[0.6, 0.25, 0.4]} />
        <meshStandardMaterial color="#e2e8f0" flatShading />
      </mesh>
    </group>
  );
}

function SparkParticles({ position }: { position: [number, number, number] }) {
  const count = 8;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const sparks = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      vx: (Math.random() - 0.5) * 0.8,
      vy: 2 + Math.random() * 1,
      vz: (Math.random() - 0.5) * 0.8,
      life: Math.random(), // stagger initial life so they don't all reset together
      maxLife: 0.8 + Math.random() * 0.4
    }));
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const s = sparks[i];
      s.life += delta;
      if (s.life >= s.maxLife) {
        // Reset spark
        s.life = 0;
        s.vx = (Math.random() - 0.5) * 0.8;
        s.vy = 2 + Math.random() * 1;
        s.vz = (Math.random() - 0.5) * 0.8;
        s.maxLife = 0.8 + Math.random() * 0.4;
      }
      const progress = s.life / s.maxLife;
      const x = position[0] + s.vx * s.life;
      const y = position[1] + s.vy * s.life - 2 * s.life * s.life; // gravity-like arc
      const z = position[2] + s.vz * s.life;
      const scale = 0.03 * (1 - progress); // fade out by shrinking
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(Math.max(0.001, scale));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2} transparent opacity={0.9} />
    </instancedMesh>
  );
}

export function Campfire(props: any) {
  const ref = usePopIn(props.scale || 1);
  const [isLit, setIsLit] = useState(false);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();
  const fireGroupRef = useRef<any>(null);
  const fireInnerRef = useRef<any>(null);
  const lightRef = useRef<any>(null);
  
  useFrame(({ clock }) => {
     if (!useGameStore.getState().isSplashDone || !isLit) return;
     const t = clock.elapsedTime;
     if (fireGroupRef.current) {
         // Add flicker and stylized rotation
         fireGroupRef.current.scale.set(
             1 + Math.sin(t * 8) * 0.1, 
             1 + Math.cos(t * 12) * 0.15, 
             1 + Math.sin(t * 7) * 0.1
         );
         fireGroupRef.current.rotation.y = Math.sin(t * 2) * 0.1;
     }
     if (fireInnerRef.current) {
         fireInnerRef.current.position.y = 0.25 + Math.sin(t * 10) * 0.05;
     }
     if (lightRef.current) {
         lightRef.current.intensity = 2.5 + Math.sin(t * 15) * 0.3 + Math.sin(t * 23) * 0.2;
     }
  });

  return (
    <group 
      position={[props.position.x, props.position.y, props.position.z]} 
      rotation={[0, props.rotation.y, 0]} 
      ref={ref}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        AudioSystem.playClick();
        setIsLit(!isLit);
        forceClose();
      }}
      onPointerOver={(e: any) => { 
          if (useGameStore.getState().selectedTool === 'none') {
              e.stopPropagation();
              document.body.style.cursor = 'pointer'; 
              keepHoverAlive();
          }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Hand-drawn style Stone Ring */}
      {[...Array(10)].map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const r = 0.55 + Math.random() * 0.1;
          const s = 0.8 + Math.random() * 0.5;
          return (
             <mesh key={i} position={[Math.cos(angle)*r, 0.08 * s, Math.sin(angle)*r]} rotation={[Math.random(), Math.random(), Math.random()]} scale={[s, s * 0.8, s * 1.1]} castShadow>
               <dodecahedronGeometry args={[0.15, 0]} />
               <meshStandardMaterial color="#64748b" roughness={1} flatShading />
             </mesh>
          );
      })}
      
      {/* Ash base */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
         <circleGeometry args={[0.6, 8]} />
         <meshStandardMaterial color="#292524" flatShading />
      </mesh>

      {/* Logs - More random and stylized */}
      {[...Array(5)].map((_, i) => (
          <group key={i} position={[0, 0.1, 0]} rotation={[0, (i * Math.PI * 2 / 5) + (Math.random() * 0.2), 0]}>
            <mesh position={[0.3, 0.1, 0]} rotation={[0, 0, Math.PI / 5 + Math.random() * 0.1]} castShadow>
               <cylinderGeometry args={[0.04, 0.06, 0.8, 5]} />
               <meshStandardMaterial color="#451a03" roughness={1} flatShading />
            </mesh>
            {/* Log highlight/bark detail */}
            <mesh position={[0.3, 0.12, 0]} rotation={[0, 0, Math.PI / 5 + Math.random() * 0.1]}>
               <cylinderGeometry args={[0.02, 0.02, 0.75, 4]} />
               <meshStandardMaterial color="#78350f" roughness={1} flatShading />
            </mesh>
          </group>
      ))}

      {/* Stylized Low-Poly Fire */}
      {isLit && (
        <group ref={fireGroupRef} position={[0, 0.35, 0]}>
          {/* Outer Flame */}
          <mesh castShadow>
              <coneGeometry args={[0.35, 0.7, 4]} />
              <meshStandardMaterial color="#ea580c" emissive="#ea580c" emissiveIntensity={0.8} transparent opacity={0.9} flatShading />
          </mesh>
          <mesh rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[0.3, 0.65, 4]} />
              <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1} flatShading />
          </mesh>
          {/* Inner Flame */}
          <mesh ref={fireInnerRef} position={[0, -0.1, 0]}>
              <octahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={2} flatShading />
          </mesh>
        </group>
      )}

      {/* Fire Particles */}
      {isLit && <ParticleBurst position={new THREE.Vector3(0, 0.5, 0)} color="#fcd34d" />}

      {/* Spark Particles */}
      {isLit && <SparkParticles position={[0, 0.5, 0]} />}

      {/* Light Source */}
      {isLit && <pointLight ref={lightRef} color="#fbbf24" distance={8} decay={2} castShadow intensity={2.5} position={[0, 0.8, 0]} />}

      {/* Hover UI Button */}
      <HoverButton 
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={1.4}
          iconSvg={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
              {isLit ? (
                <g style={{ animation: 'extinguishShrink 0.5s forwards', transformOrigin: 'center' }}>
                   <path d="M18 6L6 18M6 6l12 12" />
                </g>
              ) : (
                <g>
                  {/* Spark */}
                  <circle cx="12" cy="18" r="2" fill="currentColor" stroke="none" style={{ transformOrigin: 'center', animation: 'sparkShoot 0.5s ease-out forwards' }} />
                  {/* Flame */}
                  <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 2.4 6a4 4 0 01-4 3.9" 
                        style={{ transformOrigin: '12px 20px', animation: 'flameIgniteReal 0.6s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both' }} />
                  {/* Logs at bottom */}
                  <path d="M7 20 L17 17 M7 17 L17 20" strokeWidth="2" style={{ strokeDasharray: 20, strokeDashoffset: 20, animation: 'drawLogs 0.4s forwards' }} />
                </g>
              )}
            </svg>
          } 
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); setIsLit(!isLit); forceClose(); }} 
      />
    </group>
  );
}

export function Fence(props: any) {
  const ref = usePopIn(props.scale || 1);
  // Add some slight randomized variation based on position to look hand-made
  const seed = (props.position.x * 13.1 + props.position.z * 7.9);
  const r1 = Math.sin(seed) * 0.05;
  const r2 = Math.cos(seed) * 0.05;
  
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
      {/* Posts */}
      <mesh position={[-0.8, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 5]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.8, 0.6, 0]} rotation={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 5]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} flatShading />
      </mesh>
      
      {/* Planks */}
      <mesh position={[0, 0.8, 0.1]} rotation={[0, 0, r1]} castShadow>
        <boxGeometry args={[2.0, 0.15, 0.05]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.4, -0.1]} rotation={[0, 0, r2]} castShadow>
        <boxGeometry args={[2.0, 0.15, 0.05]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

export function Well(props: any) {
  const ref = usePopIn(props.scale || 1);
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
      {/* Stone Base Ring */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.8, 12]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} flatShading />
      </mesh>
      {/* Inner Hole */}
      <mesh position={[0, 0.41, 0]} receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.81, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={1} flatShading />
      </mesh>
      {/* Water inside */}
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.55, 12]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.8} flatShading />
      </mesh>

      {/* Pillars */}
      <mesh position={[-0.65, 1.2, 0]} castShadow>
        <boxGeometry args={[0.15, 2.4, 0.15]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      <mesh position={[0.65, 1.2, 0]} castShadow>
        <boxGeometry args={[0.15, 2.4, 0.15]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      
      {/* Roof crossbeam */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[1.6, 0.1, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      {/* Roof */}
      <mesh position={[-0.4, 2.4, 0]} rotation={[0, 0, Math.PI/6]} castShadow>
        <boxGeometry args={[1.2, 0.1, 1.5]} />
        <meshStandardMaterial color="#991b1b" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.4, 2.4, 0]} rotation={[0, 0, -Math.PI/6]} castShadow>
        <boxGeometry args={[1.2, 0.1, 1.5]} />
        <meshStandardMaterial color="#991b1b" roughness={0.9} flatShading />
      </mesh>
      
      {/* Roller & Rope & Bucket */}
      <mesh position={[0, 1.8, 0]} rotation={[Math.PI/2, 0, Math.PI/2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
        <meshStandardMaterial color="#78350f" flatShading />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
        <meshStandardMaterial color="#e2e8f0" flatShading />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.3, 8]} />
        <meshStandardMaterial color="#b45309" flatShading />
      </mesh>
    </group>
  );
}

export function Sign(props: any) {
  const ref = usePopIn(props.scale || 1);
  const setEditingSignId = useGameStore(s => s.setEditingSignId);
  const text: string = props.text || '';
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
      {/* 柱子 */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.14, 1.2, 0.14]} />
        <meshStandardMaterial color="#6b4423" flatShading />
      </mesh>
      {/* 牌面（点击编辑，仅选择模式下） */}
      <mesh
        position={[0, 1.4, 0]}
        castShadow
        onClick={(e: any) => {
          if (useGameStore.getState().selectedTool !== 'none') return;
          e.stopPropagation();
          setEditingSignId(props.assetId);
        }}
        onPointerOver={() => { if (useGameStore.getState().selectedTool === 'none') document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[1.7, 1.0, 0.12]} />
        <meshStandardMaterial color="#b08147" flatShading />
      </mesh>
      {/* 边框 */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.82, 1.12, 0.08]} />
        <meshStandardMaterial color="#5c3d22" flatShading />
      </mesh>
      {/* 文字（HTML，支持中文） */}
      <Html position={[0, 1.4, 0.08]} center transform distanceFactor={5} style={{ pointerEvents: 'none' }}>
        <div style={{ width: 150, textAlign: 'center', fontFamily: "'ZCOOL KuaiLe', cursive", color: text ? '#3b2410' : '#8a6a45', fontWeight: 700, fontSize: 15, lineHeight: 1.25, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'none' }}>
          {text || '点击写字'}
        </div>
      </Html>
    </group>
  );
}

export function Mailbox(props: any) {
  const ref = usePopIn(props.scale || 1);
  const setMailboxOpen = useGameStore(s => s.setMailboxOpen);
  const setFocusPoint = useGameStore(s => s.setFocusPoint);
  const unreadCount = useGameStore(s => s.unreadCount);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();
  
  const isHoverActive = showHover || unreadCount > 0;

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
      {/* Stone Base */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.2, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} flatShading />
      </mesh>
      {/* Wooden Post */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.15, 1.0, 0.15]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} flatShading />
      </mesh>
      {/* Hover UI Button */}
      <group position={[0, 1.2, 0]}>
        <HoverButton 
          showHover={isHoverActive} 
          isHoverLeaving={isHoverLeaving && unreadCount === 0} 
          keepHoverAlive={keepHoverAlive} 
          yOffset={1.0}
          iconSvg={
            <div style={{ position: 'relative' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
                {/* Envelope back body */}
                <path d="M3 8 h18 v11 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z" />
                {/* Paper sliding out */}
                <rect x="6" y="8" width="12" height="10" strokeDasharray="40" strokeDashoffset="40" style={{ animation: 'paperSlideUp 0.6s 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }} fill="#fff" />
                {/* Envelope flap opening */}
                <path d="M3 8 L12 14 L21 8" style={{ transformOrigin: 'center 8px', animation: 'envelopeFlapOpen 0.5s 0.1s forwards' }} />
              </svg>
              {unreadCount > 0 && (
                 <div style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', border: '2px solid white', animation: 'bubblePopIn 0.3s' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                 </div>
              )}
            </div>
          } 
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); setMailboxOpen(true); setFocusPoint([props.position.x, props.position.y, props.position.z]); forceClose(); }} 
        />
      </group>
      {/* Mailbox Box Group */}
      <group
        position={[0, 1.2, 0]}
        onClick={(e: any) => {
          if (useGameStore.getState().selectedTool !== 'none') return;
          e.stopPropagation();
          AudioSystem.playClick();
          setMailboxOpen(true);
          setFocusPoint([props.position.x, props.position.y, props.position.z]);
          forceClose();
        }}
        onPointerOver={(e: any) => { 
            if (useGameStore.getState().selectedTool === 'none') {
                e.stopPropagation();
                document.body.style.cursor = 'pointer'; 
                keepHoverAlive();
            }
        }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* Main Box */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.4, 0.6]} />
          <meshStandardMaterial color="#0f766e" roughness={0.7} flatShading />
        </mesh>
        {/* Slanted Roof Left */}
        <mesh position={[-0.15, 0.3, 0]} rotation={[0, 0, 0.5]} castShadow>
          <boxGeometry args={[0.4, 0.05, 0.7]} />
          <meshStandardMaterial color="#334155" roughness={0.8} flatShading />
        </mesh>
        {/* Slanted Roof Right */}
        <mesh position={[0.15, 0.3, 0]} rotation={[0, 0, -0.5]} castShadow>
          <boxGeometry args={[0.4, 0.05, 0.7]} />
          <meshStandardMaterial color="#334155" roughness={0.8} flatShading />
        </mesh>
        {/* Letter Slot */}
        <mesh position={[0, 0.05, 0.31]}>
          <boxGeometry args={[0.3, 0.04, 0.02]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Letter inside slot (glows) */}
        <mesh position={[0, 0.05, 0.32]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.02, 0.05]} />
          <meshStandardMaterial color="#fcf8ec" emissive="#fcf8ec" emissiveIntensity={0.5} />
        </mesh>
        {/* Animated Flag Stick */}
        <mesh position={[0.28, 0.1, 0.1]} rotation={[0, 0, showHover ? -0.5 : 0.2]} castShadow>
          <boxGeometry args={[0.04, 0.3, 0.04]} />
          <meshStandardMaterial color="#7f1d1d" flatShading />
          {/* Flag Banner */}
          <mesh position={[0.08, 0.07, 0]} rotation={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.16, 0.12, 0.02]} />
            <meshStandardMaterial color="#dc2626" flatShading />
          </mesh>
        </mesh>
      </group>
    </group>
  );
}

export function Bench(props: any) {
  const ref = usePopIn(props.scale || 1);
  const setFocusPoint = useGameStore(s => s.setFocusPoint);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();

  return (
    <group 
      position={[props.position.x, props.position.y, props.position.z]} 
      rotation={[0, props.rotation.y, 0]} 
      ref={ref}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        AudioSystem.playClick();
        setFocusPoint([props.position.x, props.position.y, props.position.z]);
        forceClose();
      }}
      onPointerOver={(e: any) => { 
          if (useGameStore.getState().selectedTool === 'none') {
              e.stopPropagation();
              document.body.style.cursor = 'pointer'; 
              keepHoverAlive();
          }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Hover UI Button */}
      <HoverButton 
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={1.4}
          iconSvg={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'seatDropIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}><path d="M2 12h20"/><path d="M12 2v20"/><path d="M5 12A7 7 0 0 1 19 12"/></svg>} 
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); setFocusPoint([props.position.x, props.position.y, props.position.z]); forceClose(); }} 
      />

      {/* Legs */}
      <mesh position={[-0.8, 0.25, -0.2]} castShadow>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[0.8, 0.25, -0.2]} castShadow>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[-0.8, 0.45, 0.2]} rotation={[-Math.PI/12, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[0.8, 0.45, 0.2]} rotation={[-Math.PI/12, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>

      {/* Seat Planks */}
      <mesh position={[0, 0.5, -0.2]} castShadow>
        <boxGeometry args={[2.0, 0.08, 0.15]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.0, 0.08, 0.15]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0.2]} castShadow>
        <boxGeometry args={[2.0, 0.08, 0.15]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>

      {/* Backrest Planks */}
      <mesh position={[0, 0.7, 0.3]} rotation={[-Math.PI/12, 0, 0]} castShadow>
        <boxGeometry args={[2.0, 0.12, 0.05]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.85, 0.35]} rotation={[-Math.PI/12, 0, 0]} castShadow>
        <boxGeometry args={[2.0, 0.12, 0.05]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}
export function SpiritTree(props: any) {
  const ref = usePopIn(props.scale || 1.5);
  const leavesRef = useRef<any>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);
  const grassHealth = useGameStore(state => state.grassHealth);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();
  const pray = () => {
    // 神树不摇动，祈愿的回应交给：辞语 + 苏醒度 + 叙事碎片揭示
    useGameStore.getState().pray();
    forceClose();
  };
  const particleCount = 20;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.8 + Math.random() * 2.2,
      baseY: 2.5 + Math.random() * 3.5,
      speed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.3,
      baseScale: 0.15 + Math.random() * 0.25
    }));
  }, []);

  // Determine particle visibility and color based on grassHealth
  const ecologyState = useMemo(() => {
    if (grassHealth > 80) return { visibleRatio: 1.0, color: new THREE.Color('#4ade80'), speedMul: 1.0 };
    if (grassHealth > 50) return { visibleRatio: 0.7, color: new THREE.Color('#86efac'), speedMul: 0.7 };
    if (grassHealth > 20) return { visibleRatio: 0.3, color: new THREE.Color('#fde047'), speedMul: 0.4 };
    return { visibleRatio: 0.1, color: new THREE.Color('#fca5a5'), speedMul: 0.2 };
  }, [grassHealth]);

  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (leavesRef.current) {
      leavesRef.current.position.y = 3.5 + Math.sin(clock.elapsedTime * 2) * 0.1;
      leavesRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.05;
    }
    if (!particleMeshRef.current) return;

    const visibleCount = Math.max(1, Math.floor(particleCount * ecologyState.visibleRatio));
    const speedMul = ecologyState.speedMul;
    // Unhealthy: more erratic movement
    const erraticMul = grassHealth > 50 ? 1 : (1 + (50 - grassHealth) * 0.03);

    for (let i = 0; i < particleCount; i++) {
      if (i < visibleCount) {
        const p = particles[i];
        const t = clock.elapsedTime * p.speed * speedMul + p.phase;
        const x = Math.cos(p.angle + t * 0.2) * p.radius + Math.sin(t * erraticMul * 1.3) * p.drift;
        const y = p.baseY + Math.sin(t * 1.5) * 0.4;
        const z = Math.sin(p.angle + t * 0.2) * p.radius + Math.cos(t * erraticMul * 1.1) * p.drift;
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(p.baseScale);
        dummy.updateMatrix();
        particleMeshRef.current.setMatrixAt(i, dummy.matrix);
        particleMeshRef.current.setColorAt(i, ecologyState.color);
      } else {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        particleMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    particleMeshRef.current.instanceMatrix.needsUpdate = true;
    if (particleMeshRef.current.instanceColor) particleMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group
      position={[props.position.x, props.position.y, props.position.z]}
      rotation={[0, props.rotation.y, 0]}
      scale={0}
      ref={ref}
      onPointerOver={(e: any) => {
        if (useGameStore.getState().selectedTool === 'none') { e.stopPropagation(); document.body.style.cursor = 'pointer'; keepHoverAlive(); }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* 祈愿按钮 —— 悬停浮现的高级气泡 */}
      <HoverButton
        showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={6.0}
        iconSvg={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* 双手合十：左手 */}
            <path d="M12 3.8C9.5 6.2 7.5 9.6 8 14.4c.2 2 1.6 3.4 4 3.4" style={{ animation: 'seatDropIn 0.6s 0.1s both cubic-bezier(0.34,1.56,0.64,1)' }} />
            {/* 右手（镜像） */}
            <path d="M12 3.8C14.5 6.2 16.5 9.6 16 14.4c-.2 2-1.6 3.4-4 3.4" style={{ animation: 'seatDropIn 0.6s 0.22s both cubic-bezier(0.34,1.56,0.64,1)' }} />
            {/* 两掌相贴的中缝 */}
            <path d="M12 4.8v13" />
            {/* 拇指交叠 */}
            <path d="M8.7 12.4c2.2.5 4.4.5 6.6 0" />
            {/* 手腕收拢 */}
            <path d="M9.2 17.6c.6 1.7 1.7 2.8 2.8 2.8s2.2-1.1 2.8-2.8" />
            {/* 祈愿光点 */}
            <path d="M12 2.1v.7M9.7 3.1l.3.6M14.3 3.1l-.3.6" style={{ animation: 'sparkPop 0.5s 0.3s both', transformOrigin: 'center' }} />
          </svg>
        }
        onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); pray(); }}
      />

      {/* Massive Trunk */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.8, 3, 7]} />
        <meshStandardMaterial color="#292524" roughness={1} flatShading />
      </mesh>
      {/* Twisted roots */}
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i*Math.PI*2/5)*0.6, 0.3, Math.sin(i*Math.PI*2/5)*0.6]} rotation={[0, -i*Math.PI*2/5, Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.1, 0.4, 1.5, 5]} />
          <meshStandardMaterial color="#292524" roughness={1} flatShading />
        </mesh>
      ))}

      {/* Leaf Layers */}
      <group ref={leavesRef} position={[0, 3.5, 0]}>
        {[...Array(6)].map((_, i) => {
          const s = 1.8 - i * 0.2;
          return (
            <mesh key={i} position={[0, i * 0.6, 0]} rotation={[0, i * Math.PI / 3, 0]} castShadow receiveShadow>
              <dodecahedronGeometry args={[s, 0]} />
              <meshStandardMaterial color="#10b981" flatShading />
            </mesh>
          );
        })}
      </group>

      {/* Ecology-responsive Floating Particles */}
      <instancedMesh ref={particleMeshRef} args={[undefined, undefined, particleCount]}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial emissive="#4ade80" emissiveIntensity={0.6} flatShading />
      </instancedMesh>
    </group>
  );
}

export function Observatory(props: any) {
  const ref = usePopIn(props.scale || 1.2);
  const telescopeRef = useRef<any>(null);
  
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (telescopeRef.current) {
      telescopeRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.3;
      telescopeRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
      {/* Main Wooden Base Tower */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.2, 3, 6]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
      </mesh>
      
      {/* Balcony */}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.0, 0.2, 8]} />
        <meshStandardMaterial color="#78350f" roughness={1} flatShading />
      </mesh>
      
      {/* Pillars for Dome */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i*Math.PI/3)*0.9, 3.6, Math.sin(i*Math.PI/3)*0.9]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial color="#5c4033" flatShading />
        </mesh>
      ))}

      {/* Dome */}
      <mesh position={[0, 4.2, 0]} castShadow>
        <sphereGeometry args={[1.1, 8, 8, 0, Math.PI * 2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} flatShading />
      </mesh>
      {/* Warm glow from inside */}
      <pointLight color="#fef08a" intensity={1.5} distance={8} position={[0, 3.5, 0]} castShadow />
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1} flatShading />
      </mesh>

      {/* Giant Telescope */}
      <group position={[0, 3.6, 0.6]} ref={telescopeRef}>
        <mesh position={[0, 0, 0.6]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.25, 1.5, 6]} />
          <meshStandardMaterial color="#b45309" roughness={0.4} flatShading />
        </mesh>
        <mesh position={[0, 0, 1.4]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.15, 0.3, 6]} />
          <meshStandardMaterial color="#1c1917" flatShading />
        </mesh>
      </group>
    </group>
  );
}


export function RuinsArch(props: any) {
  const ref = usePopIn(props.scale || 1.3);
  // 破水而出：customState='rising:<ts>' 时，从水下 5 单位 easeOut 缓缓升起到位
  const riseRef = useRef<number | null>(null);
  const isRising = String(props.customState || '').startsWith('rising');
  useEffect(() => {
    const cs = String(props.customState || '');
    if (cs.startsWith('rising')) {
      const t = parseInt(cs.split(':')[1] || '', 10);
      riseRef.current = Number.isFinite(t) ? t : Date.now();
    } else riseRef.current = null;
  }, [props.customState]);
  useFrame(() => {
    if (!ref.current || riseRef.current == null) return;
    const RISE = 3200, DEPTH = 5;
    const p = Math.min(1, (Date.now() - riseRef.current) / RISE);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    ref.current.position.y = props.position.y + (e - 1) * DEPTH;
    if (p >= 1) riseRef.current = null;
  });
  return (
    <group position={[props.position.x, isRising ? props.position.y - 5 : props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
      {/* Massive Left Pillar */}
      <mesh position={[-1.2, 1.5, 0]} rotation={[0, 0.1, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 3.0, 0.8]} />
        <meshStandardMaterial color="#64748b" roughness={1} flatShading />
      </mesh>
      
      {/* Massive Right Pillar */}
      <mesh position={[1.2, 1.4, 0]} rotation={[0, -0.1, -0.03]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 2.8, 0.8]} />
        <meshStandardMaterial color="#64748b" roughness={1} flatShading />
      </mesh>

      {/* Top Cross Beam */}
      <mesh position={[0, 3.1, 0]} rotation={[0.02, 0, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 0.7, 0.9]} />
        <meshStandardMaterial color="#475569" roughness={1} flatShading />
      </mesh>

      {/* Stylized Vines */}
      <mesh position={[-0.8, 2.0, 0.46]} rotation={[0, 0, 0.05]} castShadow>
        <planeGeometry args={[0.3, 2.0]} />
        <meshStandardMaterial color="#166534" roughness={1} side={THREE.DoubleSide} flatShading />
      </mesh>
      <mesh position={[0.5, 2.5, -0.46]} rotation={[0, 0, -0.05]} castShadow>
        <planeGeometry args={[0.4, 1.2]} />
        <meshStandardMaterial color="#166534" roughness={1} side={THREE.DoubleSide} flatShading />
      </mesh>
      
      {/* Large Base Rubble */}
      <mesh position={[-1.4, 0.3, 0.6]} rotation={[0.2, 0.8, 0]} castShadow>
         <dodecahedronGeometry args={[0.4, 0]} />
         <meshStandardMaterial color="#475569" roughness={1} flatShading />
      </mesh>
      <mesh position={[1.5, 0.4, -0.5]} rotation={[0, 0.5, 0.5]} castShadow>
         <dodecahedronGeometry args={[0.5, 0]} />
         <meshStandardMaterial color="#64748b" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

export function Waterwheel(props: any) {
  const ref = usePopIn(props.scale || 1.4);
  const wheelRef = useRef<any>(null);
  const assets = useGameStore(state => state.assets);
  const season = useGameStore(state => state.season);
  const weather = useGameStore(state => state.weather);

  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (wheelRef.current) {
      // Count nearby springs within 8 units
      const wx = props.position.x, wz = props.position.z;
      const nearbySprings = assets.filter(a =>
        a.type === 'spring' &&
        Math.sqrt((a.position.x - wx) ** 2 + (a.position.z - wz) ** 2) <= 8
      ).length;

      // Base speed + spring bonus
      const baseSpeed = 0.3;
      const springBonus = nearbySprings * 0.15;

      // Season multiplier
      const seasonMult = season === 'spring' ? 1.0
        : season === 'summer' ? 1.3
        : season === 'autumn' ? 0.9
        : 0.4; // winter

      // Rainy weather multiplier
      const weatherMult = (weather === 'rainy' || weather === 'stormy') ? 1.5 : 1.0;

      const speed = (baseSpeed + springBonus) * seasonMult * weatherMult;
      wheelRef.current.rotation.x = clock.elapsedTime * speed;
    }
  });

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
      {/* Wooden Supports */}
      <mesh position={[-0.4, 1.5, 0]} rotation={[0, 0, 0.1]} castShadow>
        <boxGeometry args={[0.2, 3.0, 0.2]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[0.4, 1.5, 0]} rotation={[0, 0, -0.1]} castShadow>
        <boxGeometry args={[0.2, 3.0, 0.2]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      
      {/* Crossbeam Axis */}
      <mesh position={[0, 2.0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.2, 6]} />
        <meshStandardMaterial color="#292524" flatShading />
      </mesh>

      {/* The Rotating Wheel */}
      <group position={[0, 2.0, 0]} ref={wheelRef}>
        {/* Outer Rings */}
        <mesh rotation={[0, 0, Math.PI/2]} castShadow>
          <torusGeometry args={[1.5, 0.08, 6, 12]} />
          <meshStandardMaterial color="#78350f" flatShading />
        </mesh>
        
        {/* Spokes and Paddles */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <group key={i} rotation={[angle, 0, 0]}>
              {/* Spoke */}
              <mesh position={[0, 0.75, 0]} castShadow>
                <boxGeometry args={[0.1, 1.5, 0.1]} />
                <meshStandardMaterial color="#5c4033" flatShading />
              </mesh>
              {/* Paddle */}
              <mesh position={[0, 1.5, 0]} castShadow>
                <boxGeometry args={[0.8, 0.1, 0.4]} />
                <meshStandardMaterial color="#92400e" flatShading />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Splashing Particles at water level */}
      <ParticleBurst position={new THREE.Vector3(0, 0.2, 1.5)} color="#bae6fd" />
    </group>
  );
}

const AssetInstance = memo(function AssetInstance({ asset }: { asset: PlacedAsset }) {
  let content: React.ReactNode = null;

  switch (asset.type) {
    case 'treeA': content = <TreeA {...asset} />; break;
    case 'treeB': content = <TreeB {...asset} />; break;
    case 'rock': content = <Rock {...asset} />; break;
    case 'deer': content = <Deer {...asset} />; break;
    case 'wolf': content = <Wolf {...asset} />; break;
    case 'seagull': content = <Seagull {...asset} />; break;
    case 'dolphin': content = <Dolphin {...asset} />; break;
    case 'fish': content = <FishSchool {...asset} />; break;
    case 'spring': content = <Spring {...asset} />; break;
    case 'pond': content = <Pond {...asset} />; break;
    case 'water_flow': content = <Stream {...asset} />; break;
    case 'streetlamp': content = <Streetlamp {...asset} />; break;
    case 'lantern_girl': content = <LanternGirl {...asset} />; break;
    case 'house': content = <House {...asset} />; break;
    case 'windmill': content = <Windmill {...asset} />; break;
    case 'lighthouse': content = <Lighthouse {...asset} />; break;
    case 'platform': content = <MarinePlatform {...asset} />; break;
    case 'pier': content = <MarinePier {...asset} />; break;
    case 'bridge_pillar': content = <MarineBridgePillar {...asset} assetId={asset.id} />; break;
    case 'boat': content = <MarineBoat {...asset} />; break;
    case 'balloon':
    case 'balloon_ladder':
    case 'balloon_bridge': content = <MarineBalloon {...asset} />; break;
    case 'sub_island': content = <SubIsland {...asset} />; break;
    case 'birdhouse': content = <Birdhouse {...asset} />; break;
    case 'hoe':
    case 'farmland': content = <Farmland {...asset} />; break;
    case 'crop_wheat':
    case 'crop_carrot': content = <Crop {...asset} />; break;
    case 'tent': content = <Tent {...asset} />; break;
    case 'campfire': content = <Campfire {...asset} />; break;
    case 'fence': content = <Fence {...asset} />; break;
    case 'well': content = <Well {...asset} />; break;
    case 'bench': content = <Bench {...asset} />; break;
    case 'spirit_tree': content = <SpiritTree {...asset} />; break;
    case 'observatory': content = <Observatory {...asset} />; break;
    case 'ruins_arch': content = <RuinsArch {...asset} />; break;
    case 'waterwheel': content = <Waterwheel {...asset} />; break;
    case 'cherry_tree': content = <CherryTree {...asset} />; break;
    case 'bamboo': content = <Bamboo {...asset} />; break;
    case 'pine_tree': content = <PineTree {...asset} />; break;
    case 'willow_tree': content = <WillowTree {...asset} />; break;
    case 'bush': content = <Bush {...asset} />; break;
    case 'sign': content = <Sign {...asset} assetId={asset.id} />; break;
    case 'mailbox': content = <Mailbox {...asset} assetId={asset.id} />; break;
    default: content = null;
  }

  if (!content) return null;
  return (
    <SelectableAssetWrapper assetId={asset.id}>
      {content}
    </SelectableAssetWrapper>
  );
});

export function Assets() {
  const assets = useGameStore(state => state.assets);

  return (
    <MarineAssetIndexProvider assets={assets}>
      <VFXSystem />
      <MarineRopeRenderer />
      <MarineBridgeRenderer />
      {assets.map(asset => <AssetInstance key={asset.id} asset={asset} />)}
    </MarineAssetIndexProvider>
  );
}
