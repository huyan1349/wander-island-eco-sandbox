import { useGameStore, PlacedAsset } from '../store';
import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AudioSystem } from '../lib/audio';
import { SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { getTerrainHeight, getTerrainGradient } from '../utils/terrain';
import { getWaterHeight as getOceanHeight, getWaveAmplitude } from './Water';

const subIslandNoise = createNoise2D();
const MAIN_ISLAND_SIZE = 40;
const SUB_ISLAND_SIZE = MAIN_ISLAND_SIZE * (2 / 3);
const SUB_ISLAND_SEGMENTS = 32;
const LEGACY_SUB_ISLAND_SIZE = 20;
const STRUCTURE_WALK_RADIUS_SQ = 1.8 * 1.8;

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
function usePopIn(targetScale: number = 1) {
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

// Procedural generation of simple low poly trees, rocks, deer
function TreeA({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
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
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.2, 1, 5]} />
        <meshStandardMaterial color={trunkColor} flatShading />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.8, 2, 5]} />
        <meshStandardMaterial color={leafColor} flatShading />
      </mesh>
    </group>
  );
}

function TreeB({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
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
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.25, 1, 6]} />
        <meshStandardMaterial color={trunkColor} flatShading />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={leafColor} flatShading />
      </mesh>
    </group>
  );
}

function Rock({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
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

function Spring({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale * 1.2);

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(rotation?.x || 0, rotation?.y || 0, rotation?.z || 0, 'YXZ')} scale={0} ref={groupRef}>
       {/* Basin Base */}
       <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[1.2, 1.4, 0.3, 16]} />
         <meshStandardMaterial color="#94a3b8" roughness={0.8} />
       </mesh>
       {/* Water */}
       <mesh position={[0, 0.25, 0]}>
         <cylinderGeometry args={[1.0, 1.0, 0.05, 16]} />
         <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.5} transparent opacity={0.9} roughness={0.1} metalness={0.8} />
       </mesh>
       {/* Small fountain spout */}
       <mesh position={[0, 0.3, 0]} castShadow>
         <cylinderGeometry args={[0.2, 0.3, 0.4, 8]} />
         <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
       </mesh>
       {/* Decor stones */}
       <mesh position={[0.8, 0.15, 0]} castShadow><dodecahedronGeometry args={[0.3, 1]} /><meshStandardMaterial color="#cbd5e1" roughness={0.9}/></mesh>
       <mesh position={[-0.6, 0.15, 0.6]} castShadow><dodecahedronGeometry args={[0.2, 1]} /><meshStandardMaterial color="#94a3b8" roughness={0.9}/></mesh>
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
  const targetPos = useRef(new THREE.Vector3(position.x, position.y, position.z));
  const currentPos = useRef(new THREE.Vector3(position.x, position.y, position.z));
  const currentScale = useRef(0);
  const aiTickRef = useRef(0);
  
  const hunger = useRef(Math.random() * 50);
  const stateRef = useRef<any>('wander');
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Pop in scale
    if (useGameStore.getState().isSplashDone && currentScale.current < scale * 0.5) {
         currentScale.current = THREE.MathUtils.damp(currentScale.current, scale * 0.5, 5, delta);
         groupRef.current.scale.setScalar(currentScale.current);
    }

    const t = state.clock.getElapsedTime();
    const allAssets = useGameStore.getState().assets;
    let speed = 0.3;

    hunger.current += delta;
    aiTickRef.current += delta;

    if (aiTickRef.current >= 0.18) {
        aiTickRef.current = 0;

        // AI Logic
        let nearestWolf = null;
        let nearestWolfDx = 0;
        let nearestWolfDz = 0;
        let nearestTree = null;
        let nearestFood = null;
        let wolfDistSq = Infinity;
        for (const asset of allAssets) {
            if (asset.type === 'wolf') {
                const dx = currentPos.current.x - asset.position.x;
                const dz = currentPos.current.z - asset.position.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < wolfDistSq) {
                    wolfDistSq = distSq;
                    nearestWolf = asset;
                    nearestWolfDx = dx;
                    nearestWolfDz = dz;
                }
            } else if (!nearestTree && (asset.type === 'treeA' || asset.type === 'treeB')) {
                nearestTree = asset;
            } else if (!nearestFood && (asset.type === 'crop_wheat' || asset.type === 'crop_carrot') && asset.growthProgress === 1) {
                nearestFood = asset;
            }
        }

        if (wolfDistSq < 15 * 15) {
            stateRef.current = 'flee';
        } else if (hunger.current > 30) {
            stateRef.current = 'eat';
        } else {
            stateRef.current = 'wander';
        }

        const grassHealth = useGameStore.getState().grassHealth;
        if (grassHealth <= 0 && Math.random() < 0.001 && !nearestFood) {
            useGameStore.getState().removeAsset(id);
            return;
        }

        if (stateRef.current === 'flee' && nearestWolf) {
            const wolfLen = Math.hypot(nearestWolfDx, nearestWolfDz) || 1;
            const dirX = nearestWolfDx / wolfLen;
            const dirZ = nearestWolfDz / wolfLen;
            let newTargetX = currentPos.current.x + dirX * 4;
            let newTargetZ = currentPos.current.z + dirZ * 4;
            if (isWalkable(newTargetX, newTargetZ, allAssets)) {
                targetPos.current.set(newTargetX, 0, newTargetZ);
            } else {
                const cos45 = Math.SQRT1_2;
                const sin45 = Math.SQRT1_2;
                const rightDirX = dirX * cos45 + dirZ * sin45;
                const rightDirZ = -dirX * sin45 + dirZ * cos45;
                newTargetX = currentPos.current.x + rightDirX * 4;
                newTargetZ = currentPos.current.z + rightDirZ * 4;
                if (isWalkable(newTargetX, newTargetZ, allAssets)) {
                    targetPos.current.set(newTargetX, 0, newTargetZ);
                } else {
                    targetPos.current.copy(currentPos.current);
                }
            }
        } else if (stateRef.current === 'eat') {
            if (nearestFood) {
                targetPos.current.set(nearestFood.position.x, 0, nearestFood.position.z);
                const foodDx = nearestFood.position.x - currentPos.current.x;
                const foodDz = nearestFood.position.z - currentPos.current.z;
                if (foodDx * foodDx + foodDz * foodDz < 1.0) {
                    useGameStore.getState().removeAsset(nearestFood.id);
                    hunger.current = 0;
                }
            } else if (nearestTree) {
                targetPos.current.set(nearestTree.position.x, 0, nearestTree.position.z);
                const treeDx = nearestTree.position.x - currentPos.current.x;
                const treeDz = nearestTree.position.z - currentPos.current.z;
                if (treeDx * treeDx + treeDz * treeDz < 9) {
                    hunger.current = 0;
                }
            } else {
                const randX = currentPos.current.x + (Math.random() - 0.5) * 4;
                const randZ = currentPos.current.z + (Math.random() - 0.5) * 4;
                if (isWalkable(randX, randZ, allAssets)) {
                    targetPos.current.set(randX, 0, randZ);
                }
                if (Math.random() < 0.01) hunger.current = 0;
            }
            stateRef.current = 'wander';
        } else if (Math.random() < 0.01) {
            const randX = currentPos.current.x + (Math.random() - 0.5) * 8;
            const randZ = currentPos.current.z + (Math.random() - 0.5) * 8;
            if (isWalkable(randX, randZ, allAssets)) {
                targetPos.current.set(randX, 0, randZ);
            }
        }
    }

    if (stateRef.current === 'flee') speed = 4.0;
    else if (stateRef.current === 'eat') speed = 0.5;
    else speed = 0.3;
    
    // Move towards target
    const nextX = THREE.MathUtils.lerp(currentPos.current.x, targetPos.current.x, delta * speed);
    const nextZ = THREE.MathUtils.lerp(currentPos.current.z, targetPos.current.z, delta * speed);
    
    if (isWalkable(nextX, nextZ, allAssets)) {
        currentPos.current.x = nextX;
        currentPos.current.z = nextZ;
    } else {
        targetPos.current.copy(currentPos.current); // Stop
    }
    
    const weather = useGameStore.getState().weather;
    const { y: surfaceY } = getWalkableHeight(currentPos.current.x, currentPos.current.z, t, weather, allAssets);
    currentPos.current.y = surfaceY;
    
    const offset = id.charCodeAt(0);
    let bobFreq = speed * 10;
    let bobAmp = 0.015 * speed; // Much smaller bob since legs do the walking
    if (stateRef.current === 'flee') {
        bobFreq = speed * 5; 
        bobAmp = 0.1;
    }
    
    groupRef.current.position.set(
        currentPos.current.x,
        currentPos.current.y + Math.abs(Math.sin(t * bobFreq + offset)) * bobAmp,
        currentPos.current.z
    );

    // Look at target direction with shortest angle
    const dx = targetPos.current.x - currentPos.current.x;
    const dz = targetPos.current.z - currentPos.current.z;
    const isMoving = dx*dx + dz*dz > 0.01;
    if (isMoving) {
        const targetAngle = Math.atan2(dx, dz);
        let diff = targetAngle - groupRef.current.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        groupRef.current.rotation.y += diff * delta * 5;
    }
    
    // Head & Leg animations
    const head = groupRef.current.children[1];
    if (head) {
         if (stateRef.current === 'eat' && !isMoving) head.rotation.x = 0.8; // head down eating
         else head.rotation.x = Math.sin(t * bobFreq * 0.5 + offset) * 0.2;
    }

    const legRot = isMoving ? Math.sin(t * speed * 15 + offset) * 0.5 : 0;
    const legFL = groupRef.current.children[2];
    const legFR = groupRef.current.children[3];
    const legBL = groupRef.current.children[4];
    const legBR = groupRef.current.children[5];

    if (legFL && legFR && legBL && legBR) {
        legFL.rotation.x = legRot;
        legBR.rotation.x = legRot;
        legFR.rotation.x = -legRot;
        legBL.rotation.x = -legRot;
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    useGameStore.getState().setSelectedEntityId(id);
  };

  return (
    <group position={[position.x, position.y, position.z]} scale={scale * 0.5} ref={groupRef} castShadow onPointerDown={handlePointerDown}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 1.2]} />
        <meshStandardMaterial color="#a16207" flatShading />
      </mesh>
      {/* Head */}
      <group position={[0, 1.2, 0.7]}>
         <mesh position={[0, 0.2, 0.2]} castShadow>
           <boxGeometry args={[0.3, 0.4, 0.4]} />
           <meshStandardMaterial color="#ca8a04" flatShading />
         </mesh>
         {/* Antlers */}
         <mesh position={[-0.1, 0.6, 0.1]} castShadow>
             <boxGeometry args={[0.05, 0.4, 0.05]} />
             <meshStandardMaterial color="#fef08a" flatShading />
         </mesh>
         <mesh position={[0.1, 0.6, 0.1]} castShadow>
             <boxGeometry args={[0.05, 0.4, 0.05]} />
             <meshStandardMaterial color="#fef08a" flatShading />
         </mesh>
      </group>
      {/* Legs */}
      <group position={[-0.2, 0.8, -0.4]}>
          <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#422006" /></mesh>
      </group>
      <group position={[0.2, 0.8, -0.4]}>
          <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#422006" /></mesh>
      </group>
      <group position={[-0.2, 0.8, 0.4]}>
          <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#422006" /></mesh>
      </group>
      <group position={[0.2, 0.8, 0.4]}>
          <mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#422006" /></mesh>
      </group>
    </group>
  );
}

function Wolf({ position, scale = 1, id }: { position: any, scale?: number, id: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(position.x, position.y, position.z));
  const currentPos = useRef(new THREE.Vector3(position.x, position.y, position.z));
  const currentScale = useRef(0);
  const aiTickRef = useRef(0);
  
  const stateRef = useRef<any>('wander');
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Pop in scale
    if (useGameStore.getState().isSplashDone && currentScale.current < scale * 0.4) {
         currentScale.current = THREE.MathUtils.damp(currentScale.current, scale * 0.4, 5, delta);
         groupRef.current.scale.setScalar(currentScale.current);
    }
    
    const t = state.clock.getElapsedTime();
    const allAssets = useGameStore.getState().assets;
    let speed = 0.8;
    aiTickRef.current += delta;

    if (aiTickRef.current >= 0.18) {
        aiTickRef.current = 0;

        let nearestDeer = null;
        let deerDistSq = Infinity;
        for (const asset of allAssets) {
            if (asset.type !== 'deer') continue;
            const dx = currentPos.current.x - asset.position.x;
            const dz = currentPos.current.z - asset.position.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < deerDistSq) {
                deerDistSq = distSq;
                nearestDeer = asset;
            }
        }

        if (nearestDeer && deerDistSq < 25 * 25) {
            stateRef.current = 'chase';
            targetPos.current.set(nearestDeer.position.x, 0, nearestDeer.position.z);
            if (deerDistSq < 4) {
                useGameStore.getState().spawnVFX('blood', nearestDeer.position);
                useGameStore.getState().removeAsset(nearestDeer.id);
            }
        } else {
            stateRef.current = 'wander';
            if (Math.random() < 0.01) {
               const randX = currentPos.current.x + (Math.random() - 0.5) * 15;
               const randZ = currentPos.current.z + (Math.random() - 0.5) * 15;
               if (isWalkable(randX, randZ, allAssets)) {
                   targetPos.current.set(randX, 0, randZ);
               }
            }
        }
    }

    speed = stateRef.current === 'chase' ? 4.5 : 0.8;

    const nextX = THREE.MathUtils.lerp(currentPos.current.x, targetPos.current.x, delta * speed);
    const nextZ = THREE.MathUtils.lerp(currentPos.current.z, targetPos.current.z, delta * speed);
    
    if (isWalkable(nextX, nextZ, allAssets)) {
        currentPos.current.x = nextX;
        currentPos.current.z = nextZ;
    } else {
        targetPos.current.copy(currentPos.current); // Stop
    }
    
    const weather = useGameStore.getState().weather;
    const { y: surfaceY } = getWalkableHeight(currentPos.current.x, currentPos.current.z, t, weather, allAssets);
    currentPos.current.y = surfaceY;

    const offset = id.charCodeAt(0);
    let bobFreq = speed * 8;
    let bobAmp = 0.02 * speed;
    if (stateRef.current === 'chase') {
        bobAmp = 0.08; // aggressive jumps
    }
    
    groupRef.current.position.set(
        currentPos.current.x,
        currentPos.current.y + Math.abs(Math.sin(t * bobFreq + offset)) * bobAmp,
        currentPos.current.z
    );

    const dx = targetPos.current.x - currentPos.current.x;
    const dz = targetPos.current.z - currentPos.current.z;
    const isMoving = dx*dx + dz*dz > 0.01;
    if (isMoving) {
        const targetAngle = Math.atan2(dx, dz);
        let diff = targetAngle - groupRef.current.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        groupRef.current.rotation.y += diff * delta * 8; // fast turning
    }
    
    // Head & Leg animations
    const head = groupRef.current.children[1];
    if (head) {
         if (stateRef.current === 'chase') head.rotation.x = 0.3; // head down aggressive
         else head.rotation.x = Math.sin(t * bobFreq * 0.5 + offset) * 0.1;
    }

    const legRot = isMoving ? Math.sin(t * speed * 12 + offset) * 0.6 : 0;
    const legFL = groupRef.current.children[2];
    const legFR = groupRef.current.children[3];
    const legBL = groupRef.current.children[4];
    const legBR = groupRef.current.children[5];

    if (legFL && legFR && legBL && legBR) {
        legFL.rotation.x = legRot;
        legBR.rotation.x = legRot;
        legFR.rotation.x = -legRot;
        legBL.rotation.x = -legRot;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]} scale={scale * 0.45} ref={groupRef} castShadow>
      {/* Body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.4, 0.5, 1.3]} />
        <meshStandardMaterial color="#475569" flatShading /> {/* Slate grey */}
      </mesh>
      {/* Head */}
      <group position={[0, 1.0, 0.7]}>
         <mesh position={[0, 0, 0]} castShadow>
           <boxGeometry args={[0.35, 0.35, 0.4]} />
           <meshStandardMaterial color="#334155" flatShading />
         </mesh>
         {/* Snout */}
         <mesh position={[0, -0.1, 0.3]} castShadow>
           <boxGeometry args={[0.2, 0.15, 0.3]} />
           <meshStandardMaterial color="#1e293b" flatShading />
         </mesh>
         {/* Ears */}
         <mesh position={[-0.12, 0.25, -0.1]} castShadow>
             <boxGeometry args={[0.1, 0.2, 0.1]} />
             <meshStandardMaterial color="#475569" flatShading />
         </mesh>
         <mesh position={[0.12, 0.25, -0.1]} castShadow>
             <boxGeometry args={[0.1, 0.2, 0.1]} />
             <meshStandardMaterial color="#475569" flatShading />
         </mesh>
      </group>
      {/* Tail */}
      <mesh position={[0, 0.8, -0.7]} rotation={[-0.4, 0, 0]} castShadow>
         <boxGeometry args={[0.15, 0.15, 0.5]} />
         <meshStandardMaterial color="#334155" flatShading />
      </mesh>
      {/* Legs */}
      <group position={[-0.15, 0.7, -0.4]}>
          <mesh position={[0, -0.35, 0]} castShadow><boxGeometry args={[0.1, 0.7, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
      </group>
      <group position={[0.15, 0.7, -0.4]}>
          <mesh position={[0, -0.35, 0]} castShadow><boxGeometry args={[0.1, 0.7, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
      </group>
      <group position={[-0.15, 0.7, 0.4]}>
          <mesh position={[0, -0.35, 0]} castShadow><boxGeometry args={[0.1, 0.7, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
      </group>
      <group position={[0.15, 0.7, 0.4]}>
          <mesh position={[0, -0.35, 0]} castShadow><boxGeometry args={[0.1, 0.7, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
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
  const isNight = timeOfDay > 18 || timeOfDay < 6;
  const windowColor = isNight ? "#f97316" : "#1e293b";
  const emissiveIntensity = isNight ? 1.5 : 0;

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}>
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
      <SmokeParticles position={[0.6, 2.0, -0.3]} />

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
  const ref = usePopIn(props.scale || 1.5);
  useMarinePhysics(ref, props);
  const bladeRef = useRef<THREE.Group>(null);
  const weather = useGameStore(state => state.weather);
  
  const isCoastal = Math.sqrt(props.position.x * props.position.x + props.position.z * props.position.z) > 12;

  useFrame((_, delta) => {
    // Coastal windmills spin faster
    const speed = (weather === 'rainy' ? 3.5 : 1.2) * (isCoastal ? 1.5 : 1.0);
    if (bladeRef.current) bladeRef.current.rotation.z -= delta * speed;
  });
  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}>
      
      {/* Coastal Synergy Indicator */}
      {isCoastal && (
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.5, 1.8, 16]} />
              <meshBasicMaterial color="#93c5fd" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
      )}

      {/* Base */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 1.2, 2.4, 8]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
      </mesh>
      {/* Top Dome */}
      <mesh position={[0, 2.4, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      {/* Wooden Deck */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 8]} />
        <meshStandardMaterial color="#854d0e" roughness={0.8} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.4, 1.05]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.1]} />
        <meshStandardMaterial color="#78350f" />
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
        beamRef.current.rotation.y -= delta * 2.0;
    }
  });

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}>
      {/* Base */}
      <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[0.6, 1.2, 4.0, 16]} />
         <meshStandardMaterial color="#f8fafc" roughness={0.1} />
      </mesh>
      
      {/* Red Stripes */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[0.95, 1.1, 0.8, 16]} />
         <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[0.68, 0.8, 0.8, 16]} />
         <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>

      {/* Gallery Deck */}
      <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[1.0, 1.0, 0.15, 16]} />
         <meshStandardMaterial color="#334155" />
      </mesh>
      
      {/* Lantern Room */}
      <mesh position={[0, 4.4, 0]} castShadow>
         <cylinderGeometry args={[0.5, 0.5, 0.8, 8]} />
         <meshStandardMaterial color="#fde047" emissive={isNight ? "#fbbf24" : "#000000"} emissiveIntensity={isNight ? 4 : 0} transparent opacity={0.6} toneMapped={false} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 5.0, 0]} castShadow receiveShadow>
         <coneGeometry args={[0.7, 0.6, 8]} />
         <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Rotating Beam */}
      {isNight && (
        <group position={[0, 4.4, 0]} ref={beamRef}>
          <pointLight ref={lightRef} color="#fbbf24" intensity={8} distance={30} />

          <SpotLight 
              position={[0, 0, 0]}
              color="#fef08a" 
              distance={40} 
              angle={0.4} 
              attenuation={20} 
              anglePower={5} 
              intensity={5} 
              opacity={0.6}
              volumetric
              target={target1}
          />
          <SpotLight 
              position={[0, 0, 0]}
              color="#fef08a" 
              distance={40} 
              angle={0.4} 
              attenuation={20} 
              anglePower={5} 
              intensity={5} 
              opacity={0.6}
              volumetric
              target={target2}
          />
          <primitive object={target1} />
          <primitive object={target2} />
        </group>
      )}
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

// Sea Expansion Board (bobs with water)
export function Platform(props: any) {
  const ref = usePopIn(props.scale || 1.5);
  useMarinePhysics(ref, props, 0.05);

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

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = swayRef.current;

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
      // Held by the ladder: gentle bob, slight lean and slow turn
      g.position.set(Math.sin(t * 0.5) * 0.15, H + Math.sin(t * 0.7) * 0.3, Math.cos(t * 0.45) * 0.15);
      g.rotation.z = Math.sin(t * 0.5) * 0.03;
      g.rotation.y = Math.sin(t * 0.15) * 0.15;
    } else {
      const ax = mode === 'bridge' ? 1.2 : 1.8;
      g.position.set(
        Math.sin(t * 0.31) * ax,
        H + Math.sin(t * 0.53) * 0.9,
        Math.cos(t * 0.27) * ax
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
  
  useFrame((state) => {
    if (ref.current) {
        const time = state.clock.elapsedTime;
        const px = props.position.x;
        const pz = props.position.z;

        const hC = getWaterHeight(px, pz, time, weather);
        ref.current.position.y = hC + 0.1;

        // Tilt with the actual wave slope, plus a touch of idle rocking
        const d = 1.5;
        const hX = getWaterHeight(px + d, pz, time, weather);
        const hZ = getWaterHeight(px, pz + d, time, weather);
        const targetRotX = Math.atan2(hZ - hC, d) * 0.7 + Math.cos(time * 1.6 + pz) * 0.03;
        const targetRotZ = -Math.atan2(hX - hC, d) * 0.7 + Math.sin(time * 1.4 + px) * 0.04;
        ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * 0.15;
        ref.current.rotation.z += (targetRotZ - ref.current.rotation.z) * 0.15;
    }
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
        if (asset.type !== 'boat' && asset.type !== 'platform') {
            return new THREE.Vector3(asset.position.x, asset.position.y + 0.5, asset.position.z);
        }
        const x = asset.position.x;
        const y = asset.position.z; 
        const dist = Math.sqrt(x*x + y*y);

        const flowSpeed = weather === 'rainy' ? 3.5 : 2.5;
        const baseAmp = weather === 'rainy' ? 0.7 : 0.4;
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
        return new THREE.Vector3(x, Math.max(asset.position.y, waterZ - 0.4) + (asset.type === 'boat' ? 0.5 : 0.2), y);
    }

    useFrame((state) => {
        if (!lineRef.current || !fromAsset || !toAsset) return;
        const p1 = getPos(fromAsset, state.clock.elapsedTime);
        const p2 = getPos(toAsset, state.clock.elapsedTime);
        const geom = lineRef.current.geometry;
        
        // Create parabolic rope curve
        const points = [];
        const segments = 10;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const px = p1.x + (p2.x - p1.x) * t;
            const pz = p1.z + (p2.z - p1.z) * t;
            // Parabola eq dipping down in the middle
            const py = p1.y + (p2.y - p1.y) * t - (t - 0.5) * (t - 0.5) * -4 + 1.0; 
            points.push(new THREE.Vector3(px, py - 1.0, pz));
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
      if (selectedTool === 'spring') color = "#3b82f6";
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
      for (let i = 0; i < posAttr.count; i++) {
        brushVertex.fromBufferAttribute(posAttr, i);
        const dist = Math.sqrt((brushVertex.x - localPoint.x) ** 2 + (brushVertex.z - localPoint.z) ** 2);
        if (dist < 1.5) typesRef.current[i] = 1;
      }
      refreshColors();
      return;
    }

    if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {
      let changed = false;
      for (let i = 0; i < posAttr.count; i++) {
        brushVertex.fromBufferAttribute(posAttr, i);
        const dist = Math.sqrt((brushVertex.x - localPoint.x) ** 2 + (brushVertex.z - localPoint.z) ** 2);
        if (dist < 3.5) {
          const influence = (3.5 - dist) / 3.5;
          const smoothInfluence = influence * influence * (3 - 2 * influence);
          const strength = isDragEvent ? 0.3 : 0.6;
          const delta = (selectedTool === 'terrainUp' ? strength : -strength) * smoothInfluence;
          const newY = Math.max(-0.5, brushVertex.y + delta);
          if (newY !== brushVertex.y) {
            posAttr.setY(i, newY);
            positionsRef.current[i * 3 + 1] = newY;
            changed = true;
          }
        }
      }

      if (changed) {
        posAttr.needsUpdate = true;
        geometry.computeVertexNormals();
        refreshColors();
      }
      return;
    }

    if (selectedTool === 'eraser') {
      removeAssetAt({ x: worldPoint.x, y: worldPoint.y, z: worldPoint.z }, isDragEvent ? 2.5 : 2);
      for (let i = 0; i < posAttr.count; i++) {
        brushVertex.fromBufferAttribute(posAttr, i);
        const dist = Math.sqrt((brushVertex.x - localPoint.x) ** 2 + (brushVertex.z - localPoint.z) ** 2);
        if (dist < 2.0) typesRef.current[i] = 0;
      }
      refreshColors();
      return;
    }

    const landPlaceableTools = ['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'deer', 'wolf', 'spring', 'streetlamp', 'house', 'windmill', 'lighthouse', 'balloon', 'balloon_ladder', 'balloon_bridge', 'bridge_pillar', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'];
    if (!isDragEvent && landPlaceableTools.includes(selectedTool)) {
      if (placementY <= -0.5) return;

      let rx = 0;
      let rz = 0;
      const verticalTools = ['house', 'windmill', 'lighthouse', 'streetlamp', 'sub_island', 'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'balloon', 'balloon_ladder', 'balloon_bridge', 'bridge_pillar', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'];
      if (event && event.face && event.face.normal && !verticalTools.includes(selectedTool)) {
        const normal = event.face.normal.clone();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
        rx = euler.x;
        rz = euler.z;
      }

      const isPillar = selectedTool === 'bridge_pillar';
      addAsset({
        type: selectedTool as any,
        position: { x: worldPoint.x, y: placementY, z: worldPoint.z },
        rotation: { x: rx, y: isPillar ? 0 : Math.random() * Math.PI * 2, z: rz },
        scale: isPillar ? 1.0 : 0.8 + Math.random() * 0.4,
        customState: String(selectedTool).startsWith('balloon') ? useGameStore.getState().balloonColor : undefined
      });
    }
  };

  const onPointerDown = (e: any) => {
    if (selectedTool === 'none') return;
    e.stopPropagation();
    if (e.button !== 0) return;
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
      if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') cursorScale = 3.2;
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
            if (['platform', 'spring', 'pave', 'boat', 'bridge', 'rope', 'balloon', 'balloon_ladder', 'balloon_bridge'].includes(a.type)) continue;
            
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
    
    const [fishData] = useState(() => {
        const arr = [];
        for (let i = 0; i < 5; i++) {
            arr.push({
                offset: Math.random() * Math.PI * 2,
                radius: 0.5 + Math.random() * 1.5,
                speed: 1 + Math.random(),
                yOffset: (Math.random() - 0.5) * 0.5
            });
        }
        return arr;
    });

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;
        
        groupRef.current.position.x = props.position.x + Math.sin(t * 0.2) * 2;
        groupRef.current.position.z = props.position.z + Math.cos(t * 0.2) * 2;

        groupRef.current.children.forEach((fish, i) => {
            const data = fishData[i];
            const angle = t * data.speed + data.offset;
            fish.position.x = Math.cos(angle) * data.radius;
            fish.position.z = Math.sin(angle) * data.radius;
            fish.position.y = -0.5 + data.yOffset + Math.sin(t * 3 + data.offset) * 0.2;
            fish.rotation.y = -angle; 
        });
    });

    const materialProps = isNight 
        ? { color: "#38bdf8", emissive: "#0ea5e9", emissiveIntensity: 4.0, toneMapped: false }
        : { color: "#0f172a", roughness: 0.5 };

    return (
        <group ref={groupRef}>
            {fishData.map((_, i) => (
                <group key={i}>
                    <mesh rotation={[Math.PI/2, 0, 0]}>
                        <coneGeometry args={[0.1, 0.4, 4]} />
                        <meshStandardMaterial {...materialProps} />
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
    const assets = useGameStore(state => state.assets);
    
    const flightParams = useMemo(() => ({
        radius: 10 + Math.random() * 20,
        speed: 0.2 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
        baseY: 15 + Math.random() * 10,
        flapSpeed: 10 + Math.random() * 5
    }), []);

    const currentCenter = useRef(new THREE.Vector3(props.position.x, flightParams.baseY, props.position.z));
    const currentRadius = useRef(flightParams.radius);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;
        
        // Find nearest gathering birdhouse
        const activeBirdhouses = assets.filter(a => a.type === 'birdhouse' && a.customState === 'gather');
        let targetCenter = new THREE.Vector3(props.position.x, flightParams.baseY, props.position.z);
        let targetRadius = flightParams.radius;
        let isGathering = false;

        if (activeBirdhouses.length > 0) {
            let nearest = activeBirdhouses[0];
            let minDistSq = Infinity;
            for (const bh of activeBirdhouses) {
                const dx = bh.position.x - props.position.x;
                const dz = bh.position.z - props.position.z;
                const dSq = dx*dx + dz*dz;
                if (dSq < minDistSq) { minDistSq = dSq; nearest = bh; }
            }
            
            // Gather around this birdhouse
            targetCenter.set(nearest.position.x, nearest.position.y + 2.5 + Math.random(), nearest.position.z);
            targetRadius = 1.5 + Math.random() * 2; // tight circle
            isGathering = true;
        }

        // Smoothly interpolate current center and radius towards target
        currentCenter.current.lerp(targetCenter, delta * 1.5);
        currentRadius.current += (targetRadius - currentRadius.current) * delta * 1.5;

        const currentSpeedMultiplier = isGathering ? 3 : 1;
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

function Crop({ position, scale = 1, type, growthProgress = 0, id }: any) {
  const isWheat = type === 'crop_wheat';
  const [localProgress, setLocalProgress] = useState(growthProgress || 0);
  
  useFrame((_, delta) => {
    if (useGameStore.getState().isSplashDone && localProgress < 1) {
      setLocalProgress((p: number) => Math.min(1, p + delta * 0.025)); // 40 seconds to fully grow
    }
  });
  
  const h = isWheat ? 1.5 : 0.6;
  const currentHeight = Math.max(0.1, h * localProgress);
  const isGrown = localProgress > 0.8;
  const color = isWheat ? (isGrown ? '#fcd34d' : '#84cc16') : (isGrown ? '#f97316' : '#4ade80');
  
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
             
             {/* Carrot orange top */}
             {!isWheat && isGrown && (
               <mesh position={[0, -currentHeight/2 + 0.15, 0]} castShadow>
                 <coneGeometry args={[0.15, 0.4, 4]} />
                 <meshStandardMaterial color="#f97316" roughness={0.7} flatShading />
               </mesh>
             )}
             
             {/* Wheat gold top */}
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

export function Campfire(props: any) {
  const ref = usePopIn(props.scale || 1);
  const fireGroupRef = useRef<any>(null);
  const fireInnerRef = useRef<any>(null);
  const lightRef = useRef<any>(null);
  
  useFrame(({ clock }) => {
     if (!useGameStore.getState().isSplashDone) return;
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
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
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

      {/* Fire Particles */}
      <ParticleBurst position={new THREE.Vector3(0, 0.5, 0)} color="#fcd34d" />

      {/* Light Source */}
      <pointLight ref={lightRef} color="#fbbf24" distance={8} decay={2} castShadow intensity={2.5} position={[0, 0.8, 0]} />
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

export function Bench(props: any) {
  const ref = usePopIn(props.scale || 1);
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
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
  
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (leavesRef.current) {
      leavesRef.current.position.y = 3.5 + Math.sin(clock.elapsedTime * 2) * 0.1;
      leavesRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
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
      
      {/* Floating Particles */}
      <ParticleBurst position={new THREE.Vector3(0, 4, 0)} color="#6ee7b7" />
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
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
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
  
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (wheelRef.current) {
      wheelRef.current.rotation.x = clock.elapsedTime * 0.5; // Slowly rotating
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

export function CherryTree({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  const leavesRef = useRef<any>(null);
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (leavesRef.current) {
      leavesRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.05;
      leavesRef.current.position.y = 1.3 + Math.sin(clock.elapsedTime * 1.5) * 0.03;
    }
  });
  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
      {/* Tapered Trunk */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.18, 1.2, 6]} />
        <meshStandardMaterial color="#4a3022" roughness={0.9} flatShading />
      </mesh>
      
      {/* Anime-style Layered Volumetric Foliage */}
      <group ref={leavesRef} position={[0, 1.3, 0]}>
        {/* Base Layer - Darker pink, wide spread */}
        <mesh position={[-0.4, 0, 0.3]} castShadow receiveShadow>
          <icosahedronGeometry args={[0.65, 1]} />
          <meshStandardMaterial color="#f472b6" roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0.4, 0.1, 0.2]} castShadow receiveShadow>
          <icosahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial color="#f472b6" roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0, -0.1, -0.4]} castShadow receiveShadow>
          <icosahedronGeometry args={[0.7, 1]} />
          <meshStandardMaterial color="#ec4899" roughness={0.8} flatShading />
        </mesh>

        {/* Middle Layer - Mid pink, slightly higher */}
        <mesh position={[-0.2, 0.5, -0.2]} castShadow receiveShadow>
          <icosahedronGeometry args={[0.55, 1]} />
          <meshStandardMaterial color="#f9a8d4" roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0.3, 0.4, -0.1]} castShadow receiveShadow>
          <icosahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial color="#fbcfe8" roughness={0.8} flatShading />
        </mesh>

        {/* Top Layer - Lightest pink, crown */}
        <mesh position={[0, 0.8, 0.1]} castShadow receiveShadow>
          <icosahedronGeometry args={[0.45, 1]} />
          <meshStandardMaterial color="#fdf2f8" roughness={0.8} flatShading />
        </mesh>

        {/* Floating distinct leaves/petals */}
        {[...Array(5)].map((_, i) => (
          <mesh key={i} position={[
            Math.cos(i * Math.PI * 2 / 5) * 0.8,
            0.2 + Math.random() * 0.6,
            Math.sin(i * Math.PI * 2 / 5) * 0.8
          ]} rotation={[Math.random(), Math.random(), 0]} castShadow>
            <planeGeometry args={[0.15, 0.15]} />
            <meshStandardMaterial color="#fbcfe8" side={THREE.DoubleSide} flatShading />
          </mesh>
        ))}
      </group>
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
    </group>
  );
}

export function PineTree({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
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
    </group>
  );
}

export function WillowTree({ position, rotation, scale = 1 }: { position: any, rotation?: any, scale?: number }) {
  const groupRef = usePopIn(scale);
  const leavesRef = useRef<any>(null);
  
  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (leavesRef.current) {
      // Gentle core sway
      leavesRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.03;
      
      // Cascading wave effect on the hanging strands
      leavesRef.current.children.forEach((child: any, i: number) => {
        if (child.name === 'strand') {
           child.rotation.x = Math.sin(clock.elapsedTime * 1.2 + i * 0.5) * 0.06;
           child.rotation.z = Math.cos(clock.elapsedTime * 1.0 + i * 0.5) * 0.06;
        }
      });
    }
  });

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(0, rotation?.y || 0, 0)} scale={0} ref={groupRef}>
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
      <mesh ref={leavesRef} position={[0, 0.3, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#22c55e" flatShading />
      </mesh>
    </group>
  );
}

export function Assets() {
  const assets = useGameStore(state => state.assets);

  return (
    <>
      <VFXSystem />
      <RopeRenderer />
      <BridgeRenderer />
      {assets.map(asset => {
        switch (asset.type) {
          case 'treeA': return <TreeA key={asset.id} {...asset} />;
          case 'treeB': return <TreeB key={asset.id} {...asset} />;
          case 'rock': return <Rock key={asset.id} {...asset} />;
          case 'deer': return <Deer key={asset.id} {...asset} />;
          case 'wolf': return <Wolf key={asset.id} {...asset} />;
          case 'seagull': return <Seagull key={asset.id} {...asset} />;
          case 'dolphin': return <Dolphin key={asset.id} {...asset} />;
          case 'fish': return <FishSchool key={asset.id} {...asset} />;
          case 'spring': return <Spring key={asset.id} {...asset} />;
          case 'streetlamp': return <Streetlamp key={asset.id} {...asset} />;
          case 'house': return <House key={asset.id} {...asset} />;
          case 'windmill': return <Windmill key={asset.id} {...asset} />;
          case 'lighthouse': return <Lighthouse key={asset.id} {...asset} />;
          case 'platform': return <Platform key={asset.id} {...asset} />;
          case 'pier': return <Pier key={asset.id} {...asset} />;
          case 'bridge_pillar': return <BridgePillar key={asset.id} {...asset} assetId={asset.id} />;
          case 'boat': return <Boat key={asset.id} {...asset} />;
          case 'balloon':
          case 'balloon_ladder':
          case 'balloon_bridge': return <Balloon key={asset.id} {...asset} />;
          case 'sub_island': return <SubIsland key={asset.id} {...asset} />;
          case 'birdhouse': return <Birdhouse key={asset.id} {...asset} />;
          case 'hoe': 
          case 'farmland': return <Farmland key={asset.id} {...asset} />;
          case 'crop_wheat':
          case 'crop_carrot': return <Crop key={asset.id} {...asset} />;
          case 'tent': return <Tent key={asset.id} {...asset} />;
          case 'campfire': return <Campfire key={asset.id} {...asset} />;
          case 'fence': return <Fence key={asset.id} {...asset} />;
          case 'well': return <Well key={asset.id} {...asset} />;
          case 'bench': return <Bench key={asset.id} {...asset} />;
          case 'spirit_tree': return <SpiritTree key={asset.id} {...asset} />;
          case 'observatory': return <Observatory key={asset.id} {...asset} />;
          case 'ruins_arch': return <RuinsArch key={asset.id} {...asset} />;
          case 'waterwheel': return <Waterwheel key={asset.id} {...asset} />;
          case 'cherry_tree': return <CherryTree key={asset.id} {...asset} />;
          case 'bamboo': return <Bamboo key={asset.id} {...asset} />;
          case 'pine_tree': return <PineTree key={asset.id} {...asset} />;
          case 'willow_tree': return <WillowTree key={asset.id} {...asset} />;
          case 'bush': return <Bush key={asset.id} {...asset} />;
          default: return null;
        }
      })}
    </>
  );
}
