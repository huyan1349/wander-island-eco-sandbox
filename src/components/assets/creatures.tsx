import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  applyLocomotionToGroup,
  computeLegAngles,
  createLocomotionState,
  stepCreature,
  updateWanderTarget,
} from '../../game/creatures/locomotion';
import { isWalkable } from '../../game/creatures/walkability';
import { getCropGrowthProgress } from '../../game/crops';
import { useGameStore } from '../../store';

export function Deer({ position, scale = 1, id }: { position: any, scale?: number, id: string }) {
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

export function Wolf({ position, scale = 1, id }: { position: any, scale?: number, id: string }) {
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
