import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { createContext, useContext, useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import * as THREE from "three";
import { AudioSystem } from "../../lib/audio";
import { useGameStore, type PlacedAsset } from "../../store";
import { getTerrainHeight } from "../../utils/terrain";
import { globalBoatState } from "../../game/water/boatState";
import { getWaterHeight, getWaveAmplitude } from "../../game/water/oceanModel";
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

function useMarinePhysics(ref: React.RefObject<any>, props: any, baseOffset: number = 0) {
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

    const gWindow = window as any;
    if (!gWindow.__assetPositions) gWindow.__assetPositions = {};
    gWindow.__assetPositions[props.id] = ref.current;
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

function DynamicSail({ position, width, height, color, baseBulge, windFactor, isJib = false, flipX = false }: any) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  const onBeforeCompile = useMemo(() => (shader: any) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = `
      uniform float uTime;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `
      #include <begin_vertex>
      float hw = ${width.toFixed(2)} / 2.0;
      float nx = ${flipX ? '(position.x + hw) / (hw * 2.0)' : '(hw - position.x) / (hw * 2.0)'};

      float bulge = sin(nx * 3.14159) * ${baseBulge.toFixed(2)};
      float flutter = sin(position.y * 4.0 + uTime * 6.0) * sin(nx * 10.0 - uTime * 8.0) * nx * ${windFactor.toFixed(2)};

      transformed.z += bulge + flutter;

      ${isJib ? `
      // Taper the jib to a point at the bow (nx=1)
      if (position.y > 0.0) {
         transformed.y -= nx * ${height.toFixed(2)} * 0.5;
      }
      ` : ''}
      `
    );
  }, [width, height, baseBulge, windFactor, isJib, flipX]);

  return (
    <mesh position={position} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
      <planeGeometry args={[width, height, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} onBeforeCompile={onBeforeCompile} customProgramCacheKey={() => "sail_" + width + "_" + isJib + "_" + flipX} />
    </mesh>
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

  const selectedTool = useGameStore((state) => state.selectedTool);
  const connectingPillarId = useGameStore((state) => state.connectingPillarId);
  const setConnectingPillarId = useGameStore((state) => state.setConnectingPillarId);
  const drivingBoatId = useGameStore((state) => state.drivingBoatId);
  const setDrivingBoatId = useGameStore((state) => state.setDrivingBoatId);
  const addAsset = useGameStore((state) => state.addAsset);

  const [showHover, setShowHover] = useState(false);
  const [isHoverLeaving, setIsHoverLeaving] = useState(false);
  const hoverTimeout = useRef<any>(null);
  const keys = useRef({ w: false, a: false, s: false, d: false, arrowup: false, arrowdown: false, arrowleft: false, arrowright: false, shift: false });
  const velocity = useRef(0);

  const keepHoverAlive = () => {
      setShowHover(true);
      setIsHoverLeaving(false);
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      hoverTimeout.current = setTimeout(() => {
          setIsHoverLeaving(true);
          setTimeout(() => {
              setShowHover(false);
              setIsHoverLeaving(false);
          }, 300); // Wait for fade out animation
      }, 3000);
  };

  // Set initial rotation so React doesn't overwrite it on re-renders
  useEffect(() => {
    if (ref.current) {
      ref.current.rotation.set(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, "YXZ");
    }
  }, []);

  useEffect(() => {
    if (drivingBoatId !== props.id) {
        keys.current = { w: false, a: false, s: false, d: false, arrowup: false, arrowdown: false, arrowleft: false, arrowright: false, shift: false };
        return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') keys.current.w = true;
      if (key === 'a' || key === 'arrowleft') keys.current.a = true;
      if (key === 's' || key === 'arrowdown') keys.current.s = true;
      if (key === 'd' || key === 'arrowright') keys.current.d = true;
      if (key === 'shift') keys.current.shift = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') keys.current.w = false;
      if (key === 'a' || key === 'arrowleft') keys.current.a = false;
      if (key === 's' || key === 'arrowdown') keys.current.s = false;
      if (key === 'd' || key === 'arrowright') keys.current.d = false;
      if (key === 'shift') keys.current.shift = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [drivingBoatId, props.id]);

  const posRef = useRef({ x: props.position.x, z: props.position.z });

  useFrame((state, delta) => {
    if (!ref.current) return;
    const time = state.clock.elapsedTime;

    const dt = Math.min(delta, 0.1);

    let px: number;
    let pz: number;

    const isOcean = props.position.y < -0.1;
    const riverSurfaceH = props.position.y + 0.5;

    if (drivingBoatId === props.id) {
      // Manual Driving Logic
      let speedIncrement = 0;
      let baseSpeed = keys.current.shift ? 15.0 : 10.0;
      if (keys.current.w || keys.current.arrowup) speedIncrement = baseSpeed;
      if (keys.current.s || keys.current.arrowdown) speedIncrement = -baseSpeed * 0.6;

      velocity.current += (speedIncrement - velocity.current * 1.5) * dt;

      let rotIncrement = 0;
      if (keys.current.a || keys.current.arrowleft) rotIncrement = 1.5;
      if (keys.current.d || keys.current.arrowright) rotIncrement = -1.5;

      ref.current.rotation.y += rotIncrement * dt * (Math.abs(velocity.current) > 0.1 ? 1 : 0.5);

      let nextX = posRef.current.x + Math.sin(ref.current.rotation.y) * velocity.current * dt;
      let nextZ = posRef.current.z + Math.cos(ref.current.rotation.y) * velocity.current * dt;

      // Collision with shore: if water is too shallow (depth < 0.2)
      const surfaceH = isOcean ? getWaterHeight(nextX, nextZ, time, weather) : riverSurfaceH;
      const tH = getTerrainHeight(nextX, nextZ);
      if (surfaceH - tH < 0.2) {
          velocity.current *= 0.5; // slow down
      } else {
          posRef.current.x = nextX;
          posRef.current.z = nextZ;
      }
      px = posRef.current.x;
      pz = posRef.current.z;

    } else if (isMoored) {
      if (globalBoatState.speed > 0) globalBoatState.speed *= (1.0 - dt * 2.0);
      posRef.current.x += (props.position.x - posRef.current.x) * 2 * dt;
      posRef.current.z += (props.position.z - posRef.current.z) * 2 * dt;
      px = posRef.current.x;
      pz = posRef.current.z;

    } else {
      const angle = time * sailParams.speed * (weather === "rainy" ? 1.4 : 1.0) + sailParams.offset;
      const targetX = props.position.x + Math.cos(angle) * sailParams.radiusX;
      const targetZ = props.position.z + Math.sin(angle) * sailParams.radiusZ;

      const dx = targetX - posRef.current.x;
      const dz = targetZ - posRef.current.z;
      const dist = Math.hypot(dx, dz) || 1;
      const speed = 4.0 * dt * (weather === "rainy" ? 1.4 : 1.0);

      let moveX = (dx / dist) * Math.min(speed, dist);
      let moveZ = (dz / dist) * Math.min(speed, dist);

      posRef.current.x += moveX;
      posRef.current.z += moveZ;

      const surfaceH = isOcean ? getWaterHeight(posRef.current.x, posRef.current.z, time, weather) : riverSurfaceH;
      const tH = getTerrainHeight(posRef.current.x, posRef.current.z);
      if (surfaceH - tH < 0.2) {
          const toCenterX = props.position.x - posRef.current.x;
          const toCenterZ = props.position.z - posRef.current.z;
          const cDist = Math.hypot(toCenterX, toCenterZ) || 1;
          posRef.current.x += (toCenterX / cDist) * 5.0 * dt;
          posRef.current.z += (toCenterZ / cDist) * 5.0 * dt;
      }

      px = posRef.current.x;
      pz = posRef.current.z;

      if (dist > 0.1) {
        const moveAngle = Math.atan2(dx, dz);
        let diff = moveAngle - ref.current.rotation.y;
        diff = (diff + Math.PI) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        diff -= Math.PI;
        ref.current.rotation.y += diff * 2.0 * dt;
      }
    }

    ref.current.position.x = px;
    ref.current.position.z = pz;

    const finalSurfaceH = isOcean ? getWaterHeight(px, pz, time, weather) : riverSurfaceH;
    ref.current.position.y = finalSurfaceH + 0.1 + (isOcean ? 0 : Math.sin(time * 2.0) * 0.02);

    if (isOcean) {
      const d = 1.5;
      const hX = getWaterHeight(px + d, pz, time, weather);
      const hZ = getWaterHeight(px, pz + d, time, weather);
      const targetRotX = Math.atan2(hZ - finalSurfaceH, d) * 0.7 + Math.cos(time * 1.6 + pz) * 0.03;
      const targetRotZ = -Math.atan2(hX - finalSurfaceH, d) * 0.7 + Math.sin(time * 1.4 + px) * 0.04;
      ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * 0.15;
      ref.current.rotation.z += (targetRotZ - ref.current.rotation.z) * 0.15;
    } else {
      ref.current.rotation.x += (Math.sin(time * 1.5) * 0.02 - ref.current.rotation.x) * 0.15;
      ref.current.rotation.z += (Math.cos(time * 1.3) * 0.02 - ref.current.rotation.z) * 0.15;
    }

    const gWindow = window as any;
    if (!gWindow.__assetPositions) gWindow.__assetPositions = {};
    gWindow.__assetPositions[props.id] = ref.current;

    // --- Update Global Boat State for Water Shader ---
    if (drivingBoatId === props.id) {
        globalBoatState.pos.set(px, pz);
        globalBoatState.dir.set(-Math.sin(ref.current.rotation.y), -Math.cos(ref.current.rotation.y));
        globalBoatState.speed += (Math.abs(velocity.current) - globalBoatState.speed) * dt * 5.0; // Smooth speed sync
    } else {
        // If not driving this boat, slowly decay the global speed effect so wake dissipates gracefully
        globalBoatState.speed *= (1.0 - dt * 2.0);
    }
  });

  return (
    <>
    <group
      ref={ref as any}
      position={[props.position.x, props.position.y, props.position.z]}
      scale={0}
      onPointerOver={(e) => {
          e.stopPropagation();
          keepHoverAlive();
      }}
      onPointerOut={() => {
          // Do nothing immediately. Let the 3-second timer cleanly handle the disappearance
          // to make the hitbox incredibly lenient while the boat is bobbing.
      }}
      onPointerDown={(e) => {
        if (selectedTool === "rope") {
            e.stopPropagation();
            if (connectingPillarId && connectingPillarId !== props.id) {
                addAsset({
                    type: "rope",
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    connections: [connectingPillarId, props.id],
                });
                setConnectingPillarId(null);
                // AudioSystem.playSound("pop");
            } else {
                setConnectingPillarId(props.id);
                // AudioSystem.playSound("select");
            }
        }
      }}
    >
      {/* Hand-drawn Driving Hover Button */}
      {showHover && drivingBoatId !== props.id && selectedTool === 'none' && (
        <Html position={[0, 4.0, 0]} center zIndexRange={[100, 0]}>
          <div
             style={{ padding: '60px', cursor: 'pointer' }}
             onPointerEnter={() => { keepHoverAlive(); }}
             onPointerLeave={() => { keepHoverAlive(); /* Timer still takes over */ }}
             onClick={(e) => {
                e.stopPropagation();
                if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                setShowHover(false);
                setIsHoverLeaving(false);
                setDrivingBoatId(props.id);
                AudioSystem.playConfirm();
             }}
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
                  onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.15) translateY(-5px)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255,255,255,0.4) inset';
                  }}
                  onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) translateY(0px)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.2) inset';
                  }}
               >
                 <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'wheelSpin 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                   <circle cx="12" cy="12" r="10" />
                   <circle cx="12" cy="12" r="3" />
                   <line x1="12" y1="2" x2="12" y2="22" />
                   <line x1="2" y1="12" x2="22" y2="12" />
                   <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                   <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
                 </svg>
               </div>
            </div>
          </div>
        </Html>
      )}

      {/* Hollow Hull Group */}
      <group position={[0, 0, 0]}>
        {/* Bottom */}
        <mesh position={[0, 0.05, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.1, 3.0]} />
          <meshStandardMaterial color="#92400e" roughness={0.8} />
        </mesh>
        {/* Left Side */}
        <mesh position={[-0.55, 0.35, 0]} rotation={[0, 0, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.6, 3.0]} />
          <meshStandardMaterial color="#854d0e" roughness={0.8} />
        </mesh>
        {/* Right Side */}
        <mesh position={[0.55, 0.35, 0]} rotation={[0, 0, -0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.6, 3.0]} />
          <meshStandardMaterial color="#854d0e" roughness={0.8} />
        </mesh>
        {/* Stern (Back) */}
        <mesh position={[0, 0.35, -1.45]} rotation={[-0.15, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.6, 0.1]} />
          <meshStandardMaterial color="#854d0e" roughness={0.8} />
        </mesh>
        {/* Bow (Front Left) */}
        <mesh position={[-0.32, 0.35, 1.85]} rotation={[0, 0.6, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.6, 1.0]} />
          <meshStandardMaterial color="#854d0e" roughness={0.8} />
        </mesh>
        {/* Bow (Front Right) */}
        <mesh position={[0.32, 0.35, 1.85]} rotation={[0, -0.6, -0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.6, 1.0]} />
          <meshStandardMaterial color="#854d0e" roughness={0.8} />
        </mesh>

        {/* --- Micro-details & Refinements --- */}
        {/* Gunwales (Top edge trims) */}
        <mesh position={[-0.58, 0.66, 0]} rotation={[0, 0, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.05, 3.05]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        <mesh position={[0.58, 0.66, 0]} rotation={[0, 0, -0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.05, 3.05]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        <mesh position={[-0.35, 0.66, 1.86]} rotation={[0, 0.6, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.05, 1.05]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        <mesh position={[0.35, 0.66, 1.86]} rotation={[0, -0.6, -0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.05, 1.05]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.66, -1.48]} rotation={[-0.15, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.05, 0.08]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>

        {/* Wooden Benches */}
        <mesh position={[0, 0.4, 0.6]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.08, 0.4]} />
          <meshStandardMaterial color="#a16207" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.4, -0.8]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.08, 0.4]} />
          <meshStandardMaterial color="#a16207" roughness={0.9} />
        </mesh>

        {/* Cargo Barrel */}
        <group position={[0.3, 0.25, -0.8]} rotation={[0, Math.PI / 4, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.4, 8]} />
            <meshStandardMaterial color="#713f12" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.03, 8]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.03, 8]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>

        {/* Rudder */}
        <group position={[0, 0.2, -1.55]} rotation={[0.2, 0, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.06, 0.5, 0.3]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.1, 0.4]} rotation={[-0.2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.8]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Mast */}
      <mesh position={[0, 1.8, 0.8]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.08, 3.6]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>

      {/* Boom (Horizontal pole) */}
      <mesh position={[0, 1.2, -0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.0]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>



      {/* Hanging Lantern */}
      <group position={[0, 0.95, -1.0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.15, 6]} />
          <meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow>
          <coneGeometry args={[0.1, 0.1, 6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, -0.09, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.05, 6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <pointLight color="#fef08a" intensity={2} distance={3} decay={2} />
      </group>

      {/* Main Sail Group (pivot at mast) */}
      <group position={[0, 2.2, 0.8]} rotation={[0, 0.15, 0]}>
        <DynamicSail position={[0, 0, -0.9]} width={1.8} height={2.0} color="#fefce8" baseBulge={0.6} windFactor={0.15} flipX={false} />
      </group>

      {/* Jib (Front Sail) */}
      <DynamicSail position={[0, 1.4, 1.4]} width={1.2} height={1.6} color="#fefce8" baseBulge={0.4} windFactor={0.15} isJib={true} flipX={true} />

      {/* Flag */}
      <mesh position={[0, 3.5, 0.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.12, 0.5, 3]} />
        <meshStandardMaterial color="#ef4444" roughness={0.6} />
      </mesh>
    </group>
    </>
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
      const surf = getWaterHeight(asset.position.x, asset.position.z, time, weather);
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
    if (!meshRef.current.instanceMatrix || !ropeRef.current.instanceMatrix) return;
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
