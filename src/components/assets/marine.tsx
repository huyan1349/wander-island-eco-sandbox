import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { AudioSystem } from "../../lib/audio";
import { useGameStore, type PlacedAsset } from "../../store";
import { getTerrainHeight } from "../../utils/terrain";
import { getWaterHeight as getOceanHeight, getWaveAmplitude } from "../Water";
import { usePopIn } from "./shared";

type MarineAssetIndex = {
  assets: PlacedAsset[];
  byId: Map<string, PlacedAsset>;
  platforms: PlacedAsset[];
  ropes: PlacedAsset[];
  bridges: PlacedAsset[];
  anchors: PlacedAsset[];
};

const MarineAssetIndexContext = createContext<MarineAssetIndex | null>(null);

function buildMarineAssetIndex(assets: PlacedAsset[]): MarineAssetIndex {
  const byId = new Map<string, PlacedAsset>();
  const platforms: PlacedAsset[] = [];
  const ropes: PlacedAsset[] = [];
  const bridges: PlacedAsset[] = [];
  const anchors: PlacedAsset[] = [];

  for (const asset of assets) {
    byId.set(asset.id, asset);
    if (asset.type === "platform") platforms.push(asset);
    if (asset.type === "rope" && asset.connections?.length === 2) ropes.push(asset);
    if (asset.type === "bridge") bridges.push(asset);
    if (asset.type === "platform" || asset.type === "pier" || asset.type === "sub_island") {
      anchors.push(asset);
    }
  }

  return { assets, byId, platforms, ropes, bridges, anchors };
}

export function MarineAssetIndexProvider({ assets, children }: { assets: PlacedAsset[]; children: ReactNode }) {
  const index = useMemo(() => buildMarineAssetIndex(assets), [assets]);
  return <MarineAssetIndexContext.Provider value={index}>{children}</MarineAssetIndexContext.Provider>;
}

function useMarineAssetIndex() {
  const sharedIndex = useContext(MarineAssetIndexContext);
  if (sharedIndex) return sharedIndex;

  const assets = useGameStore((state) => state.assets);
  return useMemo(() => buildMarineAssetIndex(assets), [assets]);
}

// Delegates to the authoritative wave model in Water.tsx so floating
// objects track the exact visual ocean surface (incl. the -0.4 base level)
export function getWaterHeight(x: number, z: number, time: number, weather: string) {
  return getOceanHeight(x, z, time, weather);
}

export function useMarinePhysics(ref: React.RefObject<any>, props: any, baseOffset: number = 0) {
  const weather = useGameStore((state) => state.weather);
  const { platforms, anchors } = useMarineAssetIndex();

  const raft = useMemo(() => {
    let ax = props.position.x;
    let az = props.position.z;
    if (props.type !== "platform") {
      let best = null as PlacedAsset | null;
      let bestD = 2.2;
      for (const platform of platforms) {
        const dd = Math.hypot(platform.position.x - ax, platform.position.z - az);
        if (dd < bestD) {
          bestD = dd;
          best = platform;
        }
      }
      if (!best) return null;
      ax = best.position.x;
      az = best.position.z;
    }
    const visited = new Set<string>([`${ax},${az}`]);
    const queue = [{ x: ax, z: az }];
    let sx = 0;
    let sz = 0;
    let n = 0;
    while (queue.length) {
      const cur = queue.pop()!;
      sx += cur.x;
      sz += cur.z;
      n++;
      for (const platform of platforms) {
        const key = `${platform.position.x},${platform.position.z}`;
        if (visited.has(key)) continue;
        const dx = platform.position.x - cur.x;
        const dz = platform.position.z - cur.z;
        if (dx * dx + dz * dz <= 10) {
          visited.add(key);
          queue.push({ x: platform.position.x, z: platform.position.z });
        }
      }
    }
    return { cx: sx / n, cz: sz / n, count: n, ax, az };
  }, [platforms, props.type, props.position.x, props.position.z]);

  const isMarine = useMemo(() => {
    if (props.type === "platform") return true;
    if (props.type === "pier") return false;
    if (props.type === "boat") return true;

    if (getTerrainHeight(props.position.x, props.position.z) > 0.2) return false;

    let closestType = "none";
    let minDist = 3.0;
    for (const asset of anchors) {
      const dx = asset.position.x - props.position.x;
      const dz = asset.position.z - props.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        closestType = asset.type;
      }
    }
    return closestType === "platform" || closestType === "none";
  }, [anchors, props.type, props.position.x, props.position.z]);

  useFrame((state) => {
    if (ref.current && isMarine) {
      const t = state.clock.elapsedTime;
      let targetRotX = 0;
      let targetRotZ = 0;

      if (raft) {
        const damp = Math.max(0.3, 1 / Math.sqrt(raft.count));
        const raftWave = getWaterHeight(raft.cx, raft.cz, t, weather) + 0.4;
        const localWave = getWaterHeight(raft.ax, raft.az, t, weather) + 0.4;
        const wave = raftWave * damp * 0.6 + localWave * 0.4;
        const lift = getWaveAmplitude(weather) * 0.35;
        ref.current.position.y = props.position.y - 0.4 + wave + lift + baseOffset;

        const d = 2.5;
        const hX = getWaterHeight(raft.cx + d, raft.cz, t, weather);
        const hZ = getWaterHeight(raft.cx, raft.cz + d, t, weather);
        targetRotX = Math.atan2(hZ - raftWave + 0.4, d) * 0.2 * damp;
        targetRotZ = -Math.atan2(hX - raftWave + 0.4, d) * 0.2 * damp;

        const dl = 1.2;
        const lX = getWaterHeight(raft.ax + dl, raft.az, t, weather);
        const lZ = getWaterHeight(raft.ax, raft.az + dl, t, weather);
        targetRotX += Math.atan2(lZ - localWave + 0.4, dl) * 0.28;
        targetRotZ += -Math.atan2(lX - localWave + 0.4, dl) * 0.28;
      } else {
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

export function Platform(props: any) {
  const ref = usePopIn(props.scale || 1.5);
  const driftAngle = useRef(0);
  const { platforms } = useMarineAssetIndex();

  useMarinePhysics(ref, props, 0.05);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const weather = useGameStore.getState().weather;
    const myX = props.position.x;
    const myZ = props.position.z;
    let leaderId = props.id;
    let leaderX = myX;
    let leaderZ = myZ;
    for (const platform of platforms) {
      const dx = platform.position.x - myX;
      const dz = platform.position.z - myZ;
      if (dx * dx + dz * dz <= 9 && platform.id < leaderId) {
        leaderId = platform.id;
        leaderX = platform.position.x;
        leaderZ = platform.position.z;
      }
    }

    const driftSeed = leaderX * 0.37 + leaderZ * 0.53;
    const driftSpeed = weather === "rainy" || weather === "stormy" ? 0.045 : 0.03;
    driftAngle.current += driftSpeed * delta;

    const driftRadius = 1.5;
    const angle = driftAngle.current + driftSeed;
    const driftX = Math.cos(angle) * driftRadius;
    const driftZ = Math.sin(angle * 0.8) * driftRadius;

    ref.current.position.x = myX + driftX;
    ref.current.position.z = myZ + driftZ;
  });

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} scale={0}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.1, 2.8]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[(i - 2) * 0.55, 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.05, 2.8]} />
          <meshStandardMaterial color="#92400e" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0.8, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 2.6]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>
      <mesh position={[-0.8, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 2.6]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Balloon(props: any) {
  const ref = usePopIn(props.scale || 1);
  const swayRef = useRef<THREE.Group>(null);
  const ropeRef = useRef<THREE.Mesh>(null);
  const plankRefs = useRef<(THREE.Mesh | null)[]>([]);
  const balloonMatShaders = useRef<any[]>([]);
  const ropeMatShader = useRef<any>(null);
  const driftAngle = useRef(0);

  const balloonOnBeforeCompile = useMemo(
    () => (shader: any) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.waveInt = { value: 1.0 };
      shader.vertexShader = `
      uniform float time;
      uniform float waveInt;
      ${shader.vertexShader}
    `.replace(
        "#include <begin_vertex>",
        `
      #include <begin_vertex>
      transformed.x += sin(position.y * 3.0 + time * 2.0) * 0.05 * waveInt;
      transformed.z += cos(position.x * 2.0 + time * 2.5) * 0.05 * waveInt;
      `,
      );
      balloonMatShaders.current.push(shader);
    },
    [],
  );

  const ropeOnBeforeCompile = useMemo(
    () => (shader: any) => {
      shader.uniforms.time = { value: 0 };
      shader.vertexShader = `
      uniform float time;
      ${shader.vertexShader}
    `.replace(
        "#include <begin_vertex>",
        `
      #include <begin_vertex>
      float bend = 1.0 - abs(position.y * 2.0);
      transformed.x += sin(time * 1.5) * 0.3 * bend;
      transformed.z += cos(time * 1.2) * 0.3 * bend;
      `,
      );
      ropeMatShader.current = shader;
    },
    [],
  );

  const mode =
    props.type === "balloon_ladder" ? "ladder" : props.type === "balloon_bridge" ? "bridge" : "rope";
  const H = 11;
  const PLANKS = 14;

  const { mainColor } = useMemo(() => {
    const [color] = String(props.customState || "").split("|");
    return { mainColor: color || "#e11d48" };
  }, [props.customState]);
  const duo = [mainColor, "#f8fafc"];

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const group = swayRef.current;
    const weather = useGameStore.getState().weather;

    const driftSpeed = weather === "rainy" ? 0.1 : 0.07;
    driftAngle.current += driftSpeed * delta;
    const driftRadius = 3;
    const driftX = Math.cos(driftAngle.current) * driftRadius;
    const driftZ = Math.sin(driftAngle.current * 0.7) * driftRadius;

    if (balloonMatShaders.current.length > 0) {
      const waveInt = useGameStore.getState().waveIntensity || 1.0;
      balloonMatShaders.current.forEach((shader) => {
        shader.uniforms.time.value = t;
        shader.uniforms.waveInt.value = waveInt;
      });
    }
    if (ropeMatShader.current) {
      ropeMatShader.current.uniforms.time.value = t;
    }

    if (!group) return;

    if (mode === "ladder") {
      group.position.set(
        driftX + Math.sin(t * 0.5) * 0.15,
        H + Math.sin(t * 0.7) * 0.3,
        driftZ + Math.cos(t * 0.45) * 0.15,
      );
      group.rotation.z = Math.sin(t * 0.5) * 0.03;
      group.rotation.y = Math.sin(t * 0.15) * 0.15;
    } else {
      const ax = mode === "bridge" ? 1.2 : 1.8;
      group.position.set(
        driftX + Math.sin(t * 0.31) * ax,
        H + Math.sin(t * 0.53) * 0.9,
        driftZ + Math.cos(t * 0.27) * ax,
      );
      group.rotation.y = Math.sin(t * 0.2) * 0.3;
      group.rotation.z = Math.sin(t * 0.37) * 0.04;
    }

    if (mode === "rope" && ropeRef.current) {
      const top = group.position.clone().add(new THREE.Vector3(0, -3.2, 0));
      const bottom = new THREE.Vector3(0, 0.5, 0);
      const dir = top.sub(bottom);
      const len = dir.length();
      ropeRef.current.position.copy(bottom).addScaledVector(dir, 0.5);
      ropeRef.current.scale.set(1, len, 1);
      ropeRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }

    if (mode === "bridge") {
      const top = group.position.clone().add(new THREE.Vector3(0, -3.4, 0));
      const bx = 0;
      const by = 0.3;
      const bz = 0;
      const faceY = Math.atan2(top.x - bx, top.z - bz);
      for (let i = 0; i < PLANKS; i++) {
        const plank = plankRefs.current[i];
        if (!plank) continue;
        const k = (i + 0.5) / PLANKS;
        const env = Math.sin(k * Math.PI);
        plank.position.set(
          bx + (top.x - bx) * k + Math.sin(t * 1.1 + k * 5.0) * 0.3 * env,
          by + (top.y - by) * k - env * 1.5 + Math.sin(t * 0.9 + k * 4.0) * 0.18 * env,
          bz + (top.z - bz) * k + Math.cos(t * 0.8 + k * 5.0) * 0.3 * env,
        );
        plank.rotation.set(0, faceY, Math.sin(t * 1.2 + k * 6.0) * 0.12);
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
        const state = useGameStore.getState();
        if (state.selectedTool !== "bridge" && state.selectedTool !== "rope") return;
        e.stopPropagation();
        if (!state.connectingPillarId) {
          state.setConnectingPillarId(props.id);
          AudioSystem.playPop();
        } else if (state.connectingPillarId === props.id) {
          state.setConnectingPillarId(null);
        } else {
          const start = state.assets.find((asset) => asset.id === state.connectingPillarId);
          if (start) {
            state.addAsset({
              type: state.selectedTool as any,
              position: {
                x: (start.position.x + props.position.x) / 2,
                y: 0,
                z: (start.position.z + props.position.z) / 2,
              },
              rotation: { x: 0, y: 0, z: 0 },
              connections: [state.connectingPillarId, props.id],
            });
            AudioSystem.playDig();
          }
          state.setConnectingPillarId(null);
        }
      }}
    >
      <group ref={swayRef} position={[0, H, 0]}>
        {[...Array(6)].map((_, i) => (
          <mesh key={i} castShadow scale={[1, 1.25, 1]}>
            <sphereGeometry args={[2, 12, 16, (i * Math.PI * 2) / 6, Math.PI * 2 / 6]} />
            <meshStandardMaterial color={duo[i % 2]} roughness={0.6} onBeforeCompile={balloonOnBeforeCompile} />
          </mesh>
        ))}
        <mesh castShadow position={[0, -2.45, 0]}>
          <cylinderGeometry args={[0.95, 0.5, 0.8, 8, 1, true]} />
          <meshStandardMaterial color={duo[0]} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh castShadow position={[0, -3.2, 0]}>
          <boxGeometry args={[0.9, 0.7, 0.9]} />
          <meshStandardMaterial color="#92400e" roughness={1} />
        </mesh>
        {[
          [-0.35, -0.35],
          [0.35, -0.35],
          [-0.35, 0.35],
          [0.35, 0.35],
        ].map(([sx, sz], i) => (
          <mesh key={i} position={[sx, -2.9, sz]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        ))}
      </group>

      {mode === "ladder" && (
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

      {mode === "rope" && (
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

      {mode === "bridge" && (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.8]} />
            <meshStandardMaterial color="#713f12" roughness={1} />
          </mesh>
          {[...Array(PLANKS)].map((_, i) => (
            <mesh key={i} ref={(el) => { plankRefs.current[i] = el; }} castShadow>
              <boxGeometry args={[0.95, 0.07, 0.42]} />
              <meshStandardMaterial color="#a16207" roughness={1} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export function Pier(props: any) {
  const ref = usePopIn(props.scale || 1.5);
  return (
    <group ref={ref} position={[props.position.x, props.position.y + 0.4, props.position.z]} scale={0}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.1, 3]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[(i - 2) * 0.55, 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.05, 3]} />
          <meshStandardMaterial color="#92400e" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[-1.2, -1.5, -1.2]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 4]} /><meshStandardMaterial color="#451a03" /></mesh>
      <mesh position={[1.2, -1.5, -1.2]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 4]} /><meshStandardMaterial color="#451a03" /></mesh>
      <mesh position={[-1.2, -1.5, 1.2]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 4]} /><meshStandardMaterial color="#451a03" /></mesh>
      <mesh position={[1.2, -1.5, 1.2]} castShadow receiveShadow><cylinderGeometry args={[0.15, 0.15, 4]} /><meshStandardMaterial color="#451a03" /></mesh>
    </group>
  );
}

export function Boat(props: any) {
  const ref = usePopIn(props.scale || 1);
  const weather = useGameStore((state) => state.weather);
  const assets = useGameStore((state) => state.assets);

  const [sailParams] = useState(() => ({
    radiusX: 12 + Math.random() * 6,
    radiusZ: 8 + Math.random() * 4,
    speed: 0.15 + Math.random() * 0.1,
    offset: Math.random() * Math.PI * 2,
  }));

  const isMoored = useMemo(() => assets.some((asset) => asset.type === "rope" && asset.connections?.includes(props.id)), [assets, props.id]);

  useFrame((state) => {
    if (!ref.current) return;
    const time = state.clock.elapsedTime;

    let px: number;
    let pz: number;

    if (isMoored) {
      px = props.position.x;
      pz = props.position.z;
    } else {
      const angle = time * sailParams.speed * (weather === "rainy" ? 1.4 : 1.0) + sailParams.offset;
      px = props.position.x + Math.cos(angle) * sailParams.radiusX;
      pz = props.position.z + Math.sin(angle) * sailParams.radiusZ;
      ref.current.position.x = px;
      ref.current.position.z = pz;

      const nextAngle = angle + 0.01;
      const nextPx = props.position.x + Math.cos(nextAngle) * sailParams.radiusX;
      const nextPz = props.position.z + Math.sin(nextAngle) * sailParams.radiusZ;
      const moveAngle = Math.atan2(nextPx - px, nextPz - pz);
      ref.current.rotation.y += (moveAngle - ref.current.rotation.y) * 0.05;
    }

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
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, "YXZ")} scale={0}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.5, 3]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.08, 2.5]} />
        <meshStandardMaterial color="#ca8a04" />
      </mesh>
      <mesh position={[0, 1.5, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 2, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

export function RopeRenderer() {
  const { byId, ropes } = useMarineAssetIndex();

  return (
    <>
      {ropes.map((rope) => {
        const fromAsset = byId.get(rope.connections![0]);
        const toAsset = byId.get(rope.connections![1]);
        if (!fromAsset || !toAsset) return null;
        return <DynamicRope key={rope.id} fromId={fromAsset.id} toId={toAsset.id} />;
      })}
    </>
  );
}

function DynamicRope({ fromId, toId }: { fromId: string; toId: string }) {
  const lineRef = useRef<THREE.Line>(null);
  const weather = useGameStore((state) => state.weather);
  const { byId } = useMarineAssetIndex();
  const segments = 10;
  const ropePoints = useMemo(() => Array.from({ length: segments + 1 }, () => new THREE.Vector3()), []);
  const fromPos = useMemo(() => new THREE.Vector3(), []);
  const toPos = useMemo(() => new THREE.Vector3(), []);

  const fromAsset = byId.get(fromId);
  const toAsset = byId.get(toId);

  const writePos = (asset: any, time: number, target: THREE.Vector3) => {
    if (asset.type !== "boat" && asset.type !== "platform") {
      return target.set(asset.position.x, asset.position.y + 0.5, asset.position.z);
    }
    const x = asset.position.x;
    const y = asset.position.z;
    const dist = Math.sqrt(x * x + y * y);

    const flowSpeed = weather === "rainy" ? 3.5 : 2.5;
    const baseAmp = weather === "rainy" ? 0.7 : 0.4;
    const flowTime = time * flowSpeed;

    let islandFade = 1.0;
    if (dist < 18) {
      islandFade = Math.max(0, (dist - 12) / 6.0);
    }

    const wave1 = Math.sin((x + y) * 0.5 + flowTime) * baseAmp * 0.5 * islandFade;
    const wave2 = Math.cos((x - y) * 0.3 + flowTime * 0.8) * baseAmp * 0.5 * islandFade;

    let crashWave = 0;
    if (dist < 30 && dist > 14) {
      const phase = dist * 0.8 - time * 2.0;
      crashWave = Math.pow(Math.sin(phase) * 0.5 + 0.5, 3.0) * (baseAmp * 3.0);
      const fade = Math.min(1.0, (dist - 14) / 4.0) * Math.min(1.0, (30 - dist) / 5.0);
      crashWave *= fade * islandFade;
    }

    const waterZ = wave1 + wave2 + crashWave;
    return target.set(x, Math.max(asset.position.y, waterZ - 0.4) + (asset.type === "boat" ? 0.5 : 0.2), y);
  };

  useFrame((state) => {
    if (!lineRef.current || !fromAsset || !toAsset) return;
    const p1 = writePos(fromAsset, state.clock.elapsedTime, fromPos);
    const p2 = writePos(toAsset, state.clock.elapsedTime, toPos);
    const geom = lineRef.current.geometry;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = p1.x + (p2.x - p1.x) * t;
      const pz = p1.z + (p2.z - p1.z) * t;
      const py = p1.y + (p2.y - p1.y) * t - (t - 0.5) * (t - 0.5) * -4 + 1.0;
      ropePoints[i].set(px, py - 1.0, pz);
    }
    geom.setFromPoints(ropePoints);
  });

  return (
    <line ref={lineRef as any}>
      <bufferGeometry />
      <lineBasicMaterial color="#ffffff" linewidth={3} />
    </line>
  );
}

export function BridgeRenderer() {
  const { byId, bridges } = useMarineAssetIndex();

  return (
    <>
      {bridges.map((bridge) => {
        let fromAsset;
        let toAsset;

        if (bridge.connections && bridge.connections.length === 2) {
          fromAsset = byId.get(bridge.connections![0]);
          toAsset = byId.get(bridge.connections![1]);
        } else if (bridge.connections && bridge.connections.length === 1) {
          fromAsset = { type: "static", position: bridge.position };
          try {
            toAsset = { type: "static", position: JSON.parse(bridge.connections[0]) };
          } catch {
            return null;
          }
        } else {
          return null;
        }

        if (!fromAsset || !toAsset) return null;
        return <DynamicBridge key={bridge.id} fromAsset={fromAsset} toAsset={toAsset} />;
      })}
    </>
  );
}

function DynamicBridge({ fromAsset, toAsset }: { fromAsset: any; toAsset: any }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ropeRef = useRef<THREE.InstancedMesh>(null);
  const weather = useGameStore((state) => state.weather);

  const plankCount = useMemo(() => {
    const dx = fromAsset.position.x - (toAsset.position?.x || 0);
    const dz = fromAsset.position.z - (toAsset.position?.z || 0);
    const dist = Math.sqrt(dx * dx + dz * dz);
    return Math.max(3, Math.floor(dist / 0.6));
  }, [fromAsset, toAsset]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const startTime = useRef<number | null>(null);

  const getPos = (asset: any, time: number) => {
    if (asset.type === "static") {
      return new THREE.Vector3(asset.position.x, 0.4, asset.position.z);
    }
    if (asset.type === "bridge_pillar") {
      return new THREE.Vector3(asset.position.x, asset.position.y + 3, asset.position.z);
    }
    if (String(asset.type).startsWith("balloon")) {
      return new THREE.Vector3(asset.position.x, asset.position.y + 8.2, asset.position.z);
    }
    if (asset.type === "platform") {
      const surf = getOceanHeight(asset.position.x, asset.position.z, time, weather);
      return new THREE.Vector3(
        asset.position.x,
        Math.max(asset.position.y, surf + getWaveAmplitude(weather) * 0.35 + 0.1),
        asset.position.z,
      );
    }
    return new THREE.Vector3(
      asset.position.x,
      asset.type === "sub_island" ? getTerrainHeight(asset.position.x, asset.position.z) : asset.position.y,
      asset.position.z,
    );
  };

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
      const droop = dist * 0.12;
      const droopY = -droop * (1 - Math.pow(2 * t - 1, 2));
      const y = THREE.MathUtils.lerp(p1.y, p2.y, t) + droopY;

      const nextT = Math.min(1, (i + 1) / (plankCount - 1));
      const nx = THREE.MathUtils.lerp(p1.x, p2.x, nextT);
      const nz = THREE.MathUtils.lerp(p1.z, p2.z, nextT);
      const ny = THREE.MathUtils.lerp(p1.y, p2.y, nextT) - droop * (1 - Math.pow(2 * nextT - 1, 2));

      if (animScale > 0) {
        dummy.position.set(x, y, z);
        if (i < plankCount - 1) dummy.lookAt(nx, ny, nz);
        dummy.scale.set(1.5 * animScale, 0.15 * animScale, 0.4 * animScale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);

        if (i < plankCount - 1) {
          dummy.position.set(x, y + 0.4, z);
          dummy.lookAt(nx, ny + 0.4, nz);
          dummy.translateX(-0.65);
          dummy.translateZ((dist / plankCount) * 0.5);
          dummy.scale.set(0.06 * animScale, 0.06 * animScale, (dist / plankCount) * animScale);
          dummy.updateMatrix();
          ropeRef.current.setMatrixAt(i * 2, dummy.matrix);

          dummy.translateX(1.3);
          dummy.updateMatrix();
          ropeRef.current.setMatrixAt(i * 2 + 1, dummy.matrix);
        }
      } else {
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

export function BridgePillar(props: any) {
  const ref = usePopIn(props.scale || 1);
  const selectedTool = useGameStore((state) => state.selectedTool);
  const connectingPillarId = useGameStore((state) => state.connectingPillarId);
  const setConnectingPillarId = useGameStore((state) => state.setConnectingPillarId);
  const addAsset = useGameStore((state) => state.addAsset);
  const { assets, byId } = useMarineAssetIndex();

  const checkLineOfSight = (p1: THREE.Vector3, p2: THREE.Vector3) => {
    const A = new THREE.Vector3(p1.x, p1.y + 3, p1.z);
    const B = new THREE.Vector3(p2.x, p2.y + 3, p2.z);
    const AB = new THREE.Vector3().subVectors(B, A);
    const lengthSq = AB.lengthSq();

    for (const asset of assets) {
      if (asset.id === props.assetId || asset.id === connectingPillarId) continue;
      if (["platform", "spring", "pond", "pave", "boat", "bridge", "rope", "balloon", "balloon_ladder", "balloon_bridge"].includes(asset.type)) continue;

      let height = 2;
      let radius = 1.0;
      if (["house", "sub_island"].includes(asset.type)) {
        height = 3;
        radius = 2.0;
      }
      if (asset.type === "windmill") {
        height = 6;
        radius = 2.0;
      }
      if (asset.type === "lighthouse") {
        height = 8;
        radius = 2.0;
      }
      if (["treeA", "treeB"].includes(asset.type)) {
        height = 4;
        radius = 1.0;
      }
      if (asset.type === "rock") {
        height = 2;
        radius = 1.2;
      }

      const P = new THREE.Vector3(asset.position.x, asset.position.y + height / 2, asset.position.z);
      const AP = new THREE.Vector3().subVectors(P, A);

      let t = 0;
      if (lengthSq !== 0) {
        t = AP.dot(AB) / lengthSq;
        t = Math.max(0, Math.min(1, t));
      }

      const proj = new THREE.Vector3().copy(A).add(AB.clone().multiplyScalar(t));
      const dist = P.distanceTo(proj);

      if (dist < radius && proj.y < asset.position.y + height) {
        return false;
      }
    }
    return true;
  };

  return (
    <group
      ref={ref}
      position={[props.position.x, props.position.y, props.position.z]}
      onPointerDown={(e) => {
        if (selectedTool === "bridge" || selectedTool === "rope") {
          e.stopPropagation();
          if (!connectingPillarId) {
            setConnectingPillarId(props.assetId);
            AudioSystem.playPop();
          } else if (connectingPillarId === props.assetId) {
            setConnectingPillarId(null);
          } else {
            const startPillar = byId.get(connectingPillarId);
            if (startPillar) {
              const p1 = new THREE.Vector3(startPillar.position.x, startPillar.position.y, startPillar.position.z);
              const p2 = new THREE.Vector3(props.position.x, props.position.y, props.position.z);

              if (checkLineOfSight(p1, p2)) {
                addAsset({
                  type: selectedTool as any,
                  position: { x: (p1.x + p2.x) / 2, y: 0, z: (p1.z + p2.z) / 2 },
                  rotation: { x: 0, y: 0, z: 0 },
                  connections: [connectingPillarId, props.assetId],
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
    </group>
  );
}
