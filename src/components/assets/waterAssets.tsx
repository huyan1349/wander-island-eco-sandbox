import { useMemo } from 'react';
import * as THREE from 'three';
import { decodePondState } from '../../game/water/pondFit';
import { buildStream, decodeStreamState, decodeWaterfall, decodeWaterfallPath } from '../../game/water/streamPath';
import { Waterfall } from '../../game/water/Waterfall';
import { StylizedWater } from '../../game/water/StylizedWater';
import { useGameStore } from '../../store';
import { getTerrainHeight } from '../../utils/terrain';
import { usePopIn } from './shared';

export function Spring({ position, rotation, scale = 1, customState }: { position: any, rotation?: any, scale?: number, customState?: string }) {
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
export function Pond({ position, rotation, scale = 1, customState }: { position: any, rotation?: any, scale?: number, customState?: string }) {
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

// 河流：一条连续的低多边形流动水带——平缓处沉进河床，陡峭处自然贴崖垂下成瀑布，
// 由同一张几何/着色器统一表现，不再用独立飘片水帘（避免穿帮）。
export function Stream({ customState }: { customState?: string }) {
  const build = useMemo(() => {
    const pts = decodeStreamState(customState);
    if (!pts) return null;
    return buildStream(pts, 2.4);
  }, [customState]);

  if (!build || !build.ribbon) return null;

  // 河流：只渲染流动河面（瀑布已拆为独立工具）
  return (
    <StylizedWater geometry={build.ribbon} foamMode="ribbon" flow={[0, 0.22]} lieFlat={false}
      shallow="#aee6fa" deep="#2a6690" opacity={0.88} waveAmp={1.5} renderOrder={1} />
  );
}

// 瀑布：放置时已沿地形「最陡下降」追踪出自然水路（wf2）。这里据折线贴坡建出有体积的
// 级联水体 + 跌水潭 + 落水水花；旧存档(wf:)回退为两点直连。
export function WaterfallStroke({ customState }: { customState?: string }) {
  const built = useMemo(() => {
    const wf = decodeWaterfallPath(customState);
    let pts: { x: number; z: number }[]; let poolY: number; let width: number;
    if (wf) {
      pts = wf.points; poolY = wf.poolY; width = wf.width;
    } else {
      // 兼容旧存档：wf: 两点直连
      const spec = decodeWaterfall(customState);
      if (!spec) return null;
      pts = [{ x: spec.lip.x, z: spec.lip.z }, { x: spec.base.x, z: spec.base.z }];
      poolY = spec.base.y; width = spec.width;
    }
    if (pts.length < 2) return null;
    // 贴坡：沿水路采样（已挖槽的）地形高度，水顺槽而下、只降不升，末端落到潭面。
    const poly: { x: number; y: number; z: number }[] = [];
    let prevY = getTerrainHeight(pts[0].x, pts[0].z) + 0.08;
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i].x, z = pts[i].z;
      const groundY = getTerrainHeight(x, z) + 0.08;     // 略浮于槽底，避免穿插
      let y = Math.min(groundY, prevY);                  // 贴地且只降不升
      y = Math.max(y, poolY);                            // 不低于潭面
      if (i === pts.length - 1) y = poolY - 0.12;        // 末端没入潭面 → 不留悬空缝
      poly.push({ x, y, z });
      prevY = y;
    }
    const start = pts[0], end = pts[pts.length - 1];
    let dx = end.x - start.x, dz = end.z - start.z;
    const hl = Math.hypot(dx, dz) || 1; dx /= hl; dz /= hl; // 整体走向（仅几何兜底；逐点切线在几何内计算）
    const fall = { x: start.x, z: start.z, topY: poly[0].y, bottomY: poolY, dir: { x: dx, z: dz }, width, poly };
    return { fall, base: { x: end.x, y: poolY, z: end.z }, width };
  }, [customState]);

  if (!built) return null;

  const { fall, base, width } = built;

  return (
    <group>
      <Waterfall {...fall} />
      {/* 跌水潭：圆形水面，吃高度场体积着色 → 像真水潭 */}
      <group position={[base.x, base.y, base.z]}>
        <StylizedWater radius={width * 1.6} segments={28} shallow="#aee6fa" deep="#2a6690" opacity={0.9} waveAmp={0.6} />
      </group>
    </group>
  );
}
