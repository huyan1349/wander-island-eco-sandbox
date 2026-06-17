// 植物 / 岩石类装饰组件（从 Assets.tsx 抽离）。
// 依赖极少：react + r3f + three + store + usePopIn，无地形/运动/海洋耦合。
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store';
import { AudioSystem } from '../../lib/audio';
import { usePopIn } from './shared';

// 点击摇晃 + 落叶：包裹任意树的内容。沙盒里所有树共用。
// - 点树身 → 树冠回弹式摇晃 + 一阵叶子飘落（颜色随树种）。
// - shakeApi 可被外部（如神树「祈愿」按钮）命令式触发同样的反馈。
export function TreeShake({
  leafColor = '#4ade80',
  canopyY = 2.2,
  spread = 1.4,
  shakeApi,
  onShake,
  children,
}: {
  leafColor?: string;
  canopyY?: number;
  spread?: number;
  shakeApi?: React.MutableRefObject<(() => void) | null>;
  onShake?: () => void;
  children: React.ReactNode;
}) {
  const shakeRef = useRef<THREE.Group>(null);
  const shakeStart = useRef(-999);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const N = 16;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const leaves = useRef(
    Array.from({ length: N }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, vr: 0, ph: 0 }))
  );

  const doShake = () => {
    shakeStart.current = performance.now();
    AudioSystem.playTap();
    for (const lf of leaves.current) {
      lf.active = true;
      lf.x = (Math.random() - 0.5) * spread * 2;
      lf.y = canopyY + (Math.random() - 0.5) * 1.0;
      lf.z = (Math.random() - 0.5) * spread * 2;
      lf.vx = (Math.random() - 0.5) * 0.7;
      lf.vy = -0.3 - Math.random() * 0.4;
      lf.vz = (Math.random() - 0.5) * 0.7;
      lf.rx = Math.random() * 6; lf.ry = Math.random() * 6; lf.rz = Math.random() * 6;
      lf.vr = (Math.random() - 0.5) * 5;
      lf.ph = Math.random() * Math.PI * 2;
    }
  };

  useEffect(() => {
    if (shakeApi) shakeApi.current = doShake;
  });

  useFrame((_, delta) => {
    if (!useGameStore.getState().isSplashDone) return;
    const dt = Math.min(delta, 0.05);
    const now = performance.now();

    if (shakeRef.current) {
      const t = (now - shakeStart.current) / 1000;
      if (t < 1.0) {
        const decay = 1 - t;
        shakeRef.current.rotation.z = Math.sin(t * 34) * 0.07 * decay;
        shakeRef.current.rotation.x = Math.cos(t * 30) * 0.04 * decay;
      } else if (shakeRef.current.rotation.z !== 0 || shakeRef.current.rotation.x !== 0) {
        shakeRef.current.rotation.z = 0;
        shakeRef.current.rotation.x = 0;
      }
    }

    const m = leafRef.current;
    if (!m) return;
    let any = false;
    leaves.current.forEach((lf, i) => {
      if (lf.active) {
        lf.vy -= 2.2 * dt;
        lf.vx *= 0.985; lf.vz *= 0.985;
        lf.x += lf.vx * dt + Math.sin(now / 600 + lf.ph) * 0.004; // 飘
        lf.y += lf.vy * dt;
        lf.z += lf.vz * dt;
        lf.rx += lf.vr * dt; lf.ry += lf.vr * 0.6 * dt; lf.rz += lf.vr * 0.8 * dt;
        if (lf.y < 0.06) lf.active = false;
        dummy.position.set(lf.x, lf.y, lf.z);
        dummy.rotation.set(lf.rx, lf.ry, lf.rz);
        dummy.scale.setScalar(0.16);
        any = true;
      } else {
        dummy.position.set(0, -200, 0);
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.visible = any;
  });

  return (
    <group
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        doShake();
        onShake?.();
      }}
      onPointerOver={(e: any) => {
        if (useGameStore.getState().selectedTool === 'none') {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <group ref={shakeRef}>{children}</group>
      <instancedMesh ref={leafRef} args={[undefined, undefined, N]} frustumCulled={false}>
        <planeGeometry args={[0.3, 0.3]} />
        <meshStandardMaterial color={leafColor} side={THREE.DoubleSide} flatShading transparent opacity={0.95} />
      </instancedMesh>
    </group>
  );
}

export function TreeA({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  const swayRef = useRef<any>(null);
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (swayRef.current) {
      swayRef.current.rotation.z = Math.sin(clock.elapsedTime * 1.5 + position.x) * 0.08;
    }
  });
  const season = useGameStore(state => state.season);
  const biome = useGameStore(state => state.biome);

  let leafColor = '#1f4d29';
  let trunkColor = '#5c4033';
  if (biome !== 'default') {
    if (biome === 'volcanic') { leafColor = '#450a0a'; trunkColor = '#1c1917'; }
    else if (biome === 'desert') leafColor = '#ca8a04';
    else if (biome === 'tundra' || season === 'winter') leafColor = '#f8f9fa';
    else if (season === 'autumn') leafColor = '#ea580c';
    else if (season === 'spring') leafColor = '#4ade80';
  }

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
      <TreeShake leafColor={leafColor} canopyY={2.2}>
        <group ref={swayRef}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.2, 1, 5]} />
            <meshStandardMaterial color={trunkColor} flatShading />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.8, 2, 5]} />
            <meshStandardMaterial color={leafColor} flatShading />
          </mesh>
        </group>
      </TreeShake>
    </group>
  );
}

export function TreeB({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  const swayRef = useRef<any>(null);
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (swayRef.current) {
      swayRef.current.rotation.z = Math.sin(clock.elapsedTime * 1.2 + position.z) * 0.08;
    }
  });
  const season = useGameStore(state => state.season);
  const biome = useGameStore(state => state.biome);

  let leafColor = '#d97706'; // default warm
  let trunkColor = '#5c4033';
  if (biome !== 'default') {
    if (biome === 'volcanic') { leafColor = '#7f1d1d'; trunkColor = '#1c1917'; }
    else if (biome === 'desert') leafColor = '#facc15';
    else if (biome === 'tundra' || season === 'winter') leafColor = '#e2e8f0';
    else if (season === 'autumn') leafColor = '#b45309';
    else if (season === 'spring') leafColor = '#fbbf24';
  }

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
      <TreeShake leafColor={leafColor} canopyY={2.6}>
        <group ref={swayRef}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.15, 0.25, 1, 6]} />
            <meshStandardMaterial color={trunkColor} flatShading />
          </mesh>
          <mesh position={[0, 2, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={leafColor} flatShading />
          </mesh>
        </group>
      </TreeShake>
    </group>
  );
}

export function Rock({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  return (
    <group position={[position.x, position.y + (0.3 * scale), position.z]} rotation={new THREE.Euler(rotation?.x || 0, rotation?.y || 0, rotation?.z || 0, 'YXZ')} scale={0} ref={groupRef}>
      <mesh castShadow receiveShadow rotation={[position.x, position.y, position.z]}>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#6b7280" flatShading />
      </mesh>
    </group>
  );
}

function CherryPetals({ position }: { position: any }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 20;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const petalData = useMemo(() => {
    return Array.from({ length: count }, () => ({
      offsetX: (Math.random() - 0.5) * 4,
      offsetZ: (Math.random() - 0.5) * 4,
      startY: 3 + Math.random() * 3,
      fallSpeed: 0.3 + Math.random() * 0.2,
      driftSpeed: 0.5 + Math.random() * 0.5,
      driftAmp: 0.3 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const p = petalData[i];
      const cycle = (t * p.fallSpeed + p.phase) % 6;
      const y = p.startY - cycle;

      dummy.position.set(
        position.x + p.offsetX + Math.sin(t * p.driftSpeed + p.phase) * p.driftAmp,
        y,
        position.z + p.offsetZ + Math.cos(t * p.driftSpeed * 0.7 + p.phase) * p.driftAmp
      );
      dummy.rotation.set(
        Math.sin(t * p.rotSpeed + p.phase) * 0.5,
        t * p.rotSpeed,
        Math.cos(t * p.rotSpeed * 0.7 + p.phase) * 0.5
      );
      dummy.scale.setScalar(0.8 + Math.sin(t + p.phase) * 0.2);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.08, 0.01, 0.08]} />
      <meshStandardMaterial color="#f9a8d4" transparent opacity={0.85} />
    </instancedMesh>
  );
}

export function CherryTree({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  const swayRef = useRef<any>(null);
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (swayRef.current) {
      swayRef.current.rotation.z = Math.sin(clock.elapsedTime * 1.5 + position.x) * 0.08;
    }
  });
  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
      <TreeShake leafColor="#f9a8d4" canopyY={2.0}>
        <group ref={swayRef}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.2, 1, 5]} />
            <meshStandardMaterial color="#5c4033" flatShading />
          </mesh>
          <group position={[0, 1.8, 0]}>
            {/* Main canopy: Sakura pink */}
            <mesh castShadow receiveShadow>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#fbcfe8" flatShading />
            </mesh>
            {/* Side canopy: The "white" touch the user wanted, very clean */}
            <mesh position={[0.5, 0.1, 0.3]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.6, 0]} />
              <meshStandardMaterial color="#fdf2f8" flatShading />
            </mesh>
            {/* Small bottom filler: standard pink to blend */}
            <mesh position={[-0.4, -0.3, -0.3]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.5, 0]} />
              <meshStandardMaterial color="#f9a8d4" flatShading />
            </mesh>
          </group>
        </group>
      </TreeShake>
      <CherryPetals position={position} />
    </group>
  );
}

export function Bamboo({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  const leavesRef = useRef<any>(null);
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (leavesRef.current) {
      leavesRef.current.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.05;
    }
  });
  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
      <TreeShake leafColor="#16a34a" canopyY={3.0} spread={0.8}>
        <group ref={leavesRef}>
          <mesh position={[-0.15, 1.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.05, 0.05, 2.4, 5]} />
            <meshStandardMaterial color="#22c55e" flatShading />
          </mesh>
          <mesh position={[0.15, 1.5, 0.1]} castShadow receiveShadow>
            <cylinderGeometry args={[0.04, 0.04, 3.0, 5]} />
            <meshStandardMaterial color="#16a34a" flatShading />
          </mesh>
          <mesh position={[0, 1.8, -0.1]} castShadow receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 3.6, 5]} />
            <meshStandardMaterial color="#15803d" flatShading />
          </mesh>
        </group>
      </TreeShake>
    </group>
  );
}

export function PineTree({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
      <TreeShake leafColor="#065f46" canopyY={2.6} spread={1.0}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.25, 1, 5]} />
          <meshStandardMaterial color="#451a03" flatShading />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <coneGeometry args={[1.0, 1.2, 5]} />
          <meshStandardMaterial color="#064e3b" flatShading />
        </mesh>
        <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.8, 1.0, 5]} />
          <meshStandardMaterial color="#065f46" flatShading />
        </mesh>
        <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.6, 0.8, 5]} />
          <meshStandardMaterial color="#047857" flatShading />
        </mesh>
      </TreeShake>
    </group>
  );
}

export function WillowTree({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  const leavesRef = useRef<any>(null);
  const swayRef = useRef<any>(null);

  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;

    if (swayRef.current) {
      // Entire tree sway from root
      swayRef.current.rotation.z = Math.sin(clock.elapsedTime * 1.5 + position.x) * 0.08;
    }

    if (leavesRef.current) {
      // Gentle core sway
      leavesRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.03;

      // Cascading wave effect on the hanging strands
      leavesRef.current.children.forEach((child: any, i: number) => {
        if (child.name === 'strand') {
           child.rotation.x = Math.sin(clock.elapsedTime * 1.2 + i * 0.5) * 0.18;
           child.rotation.z = Math.cos(clock.elapsedTime * 1.0 + i * 0.5) * 0.18;
        }
      });
    }
  });

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
      <TreeShake leafColor="#84cc16" canopyY={2.2} spread={1.2}>
      <group ref={swayRef}>
        {/* Curved, elegant trunk */}
        <mesh position={[0, 0.6, 0]} rotation={[0, 0, 0.08]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.25, 1.2, 6]} />
          <meshStandardMaterial color="#4a3022" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0.05, 1.6, 0]} rotation={[0, 0, 0.15]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.15, 1.0, 6]} />
          <meshStandardMaterial color="#4a3022" roughness={0.9} flatShading />
        </mesh>

        <group ref={leavesRef} position={[0.15, 2.2, 0]}>
          {/* Core leaf clump */}
          <mesh castShadow receiveShadow>
            <icosahedronGeometry args={[0.7, 1]} />
            <meshStandardMaterial color="#65a30d" roughness={0.8} flatShading />
          </mesh>

          {/* Anime-style cascading leaf strands (chains of diminishing spheres) */}
          {[...Array(6)].map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            const r = 0.5;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            return (
              <group key={i} name="strand" position={[x, -0.2, z]}>
                <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
                  <icosahedronGeometry args={[0.25, 0]} />
                  <meshStandardMaterial color="#84cc16" flatShading />
                </mesh>
                <mesh position={[0.05, -0.7, 0.05]} castShadow receiveShadow>
                  <icosahedronGeometry args={[0.2, 0]} />
                  <meshStandardMaterial color="#65a30d" flatShading />
                </mesh>
                <mesh position={[0.02, -1.0, 0.02]} castShadow receiveShadow>
                  <icosahedronGeometry args={[0.15, 0]} />
                  <meshStandardMaterial color="#4d7c0f" flatShading />
                </mesh>
                <mesh position={[0, -1.25, 0]} castShadow receiveShadow>
                  <icosahedronGeometry args={[0.1, 0]} />
                  <meshStandardMaterial color="#3f6212" flatShading />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>
      </TreeShake>
    </group>
  );
}

export function Bush({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  const leavesRef = useRef<any>(null);
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (leavesRef.current) {
      leavesRef.current.scale.y = 1 + Math.sin(clock.elapsedTime * 2 + position.x) * 0.05;
    }
  });
  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
      <TreeShake leafColor="#22c55e" canopyY={0.7} spread={0.7}>
        <mesh ref={leavesRef} position={[0, 0.3, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#22c55e" flatShading />
        </mesh>
      </TreeShake>
    </group>
  );
}
