import { createNoise2D } from 'simplex-noise';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, ToolType } from '../store';
import { AudioSystem } from '../lib/audio';
import { emitHermitPlace } from '../lib/socket';
import { applyTerrainBrush, paintSurface } from '../utils/terrainBrush';
import { encodePondState } from '../game/water/pondFit';
import { encodeStreamState } from '../game/water/streamPath';
import { getTerrainHeight, getTerrainGradient } from '../utils/terrain';

const noise2D = createNoise2D();


// Generate a static heightmap for the island
const ISAND_SIZE = 40;
const SEGMENTS = 64;

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
         p.vy -= delta * 0.5; // Gravity
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

function ShockwaveRing() {
   const synergy = useGameStore(state => state.lastPlacedSynergy);
   const meshRef = useRef<THREE.Mesh>(null);
   const matRef = useRef<THREE.MeshBasicMaterial>(null);
   const scaleRef = useRef(0);
   const [activeId, setActiveId] = useState<number | null>(null);
   const [color, setColor] = useState('#ffffff');
   const [pos, setPos] = useState<THREE.Vector3>(new THREE.Vector3());

   useEffect(() => {
       if (synergy) {
           setActiveId(synergy.id);
           scaleRef.current = 0;
           setPos(new THREE.Vector3(synergy.position.x, synergy.position.y + 0.2, synergy.position.z));
           if (synergy.type === 'spring') setColor('#4ade80'); // Green healing wave
           else if (synergy.type === 'windmill') setColor('#93c5fd'); // Wind wave
           else setColor('#fcd34d'); // Forest connection wave
       }
   }, [synergy]);

   useFrame((_, delta) => {
       if (!meshRef.current || !matRef.current) return;
       if (activeId !== null) {
           scaleRef.current += delta * 15;
           meshRef.current.scale.setScalar(scaleRef.current);
           matRef.current.opacity = Math.max(0, 1 - (scaleRef.current / 12));
           if (scaleRef.current > 12) {
               setActiveId(null);
               matRef.current.opacity = 0;
           }
       }
   });

   return (
       <mesh ref={meshRef} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
           <ringGeometry args={[0.8, 1, 32]} />
           <meshBasicMaterial ref={matRef} color={color} transparent opacity={0} depthTest={false} side={THREE.DoubleSide} toneMapped={false} />
       </mesh>
   );
}

function BuildPreview({ cursorWorldPos, cursorActive }: { cursorWorldPos: React.MutableRefObject<THREE.Vector3>, cursorActive: React.MutableRefObject<boolean> }) {
    const selectedTool = useGameStore(state => state.selectedTool);
    const assets = useGameStore(state => state.assets);
    const buildAnchors = useMemo(
        () =>
            assets
                .filter(a => a.type === 'platform' || a.type === 'pier' || a.type === 'sub_island')
                .map(a => ({
                    x: a.position.x,
                    z: a.position.z,
                    y: a.type === 'sub_island' ? a.position.y : Math.max(a.position.y, 0),
                })),
        [assets],
    );
    
    const ghostGroup = useRef<THREE.Group>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const bridgeGroup = useRef<THREE.Group>(null);
    
    // InstancedMesh for dotted line particles
    const dotsCount = 25;
    const dotsRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        if (!ghostGroup.current || !bridgeGroup.current || !dotsRef.current || !matRef.current) return;
        
        if (!cursorActive.current || !['platform', 'pier', 'sub_island', 'bridge'].includes(selectedTool)) {
            ghostGroup.current.visible = false;
            bridgeGroup.current.visible = false;
            dotsRef.current.visible = false;
            return;
        }

        const point = cursorWorldPos.current;
        const time = state.clock.elapsedTime;
        
        // --- PLATFORM / SUB_ISLAND GHOST ---
        if (selectedTool === 'platform' || selectedTool === 'pier' || selectedTool === 'sub_island') {
            bridgeGroup.current.visible = false;
            dotsRef.current.visible = false;
            ghostGroup.current.visible = true;
            
            ghostGroup.current.position.set(point.x, Math.max(point.y, 0), point.z);
            ghostGroup.current.position.y += Math.sin(time * 4) * 0.05; // Gentle float
            
            // Validity Check
            let isValid = false;
            if (selectedTool === 'sub_island') {
                isValid = true; // Can place anywhere in water
            } else {
                if (point.y > -0.6) isValid = true;
                if (!isValid) {
                    for (const anchor of buildAnchors) {
                        const dx = anchor.x - point.x;
                        const dz = anchor.z - point.z;
                        if (dx * dx + dz * dz < 4.5 * 4.5) { isValid = true; break; }
                    }
                }
            }
            
            matRef.current.color.setHex(isValid ? 0x4ade80 : 0xef4444); // Green / Red
            
            const platformMesh = ghostGroup.current.children[0] as THREE.Mesh;
            const islandMesh = ghostGroup.current.children[1] as THREE.Mesh;
            platformMesh.visible = (selectedTool === 'platform' || selectedTool === 'pier');
            islandMesh.visible = (selectedTool === 'sub_island');
        }
        
        // --- BRIDGE PREVIEW ---
        if (selectedTool === 'bridge') {
            ghostGroup.current.visible = false;
            
            // Find valid anchors
            let firstAnchor: { pos: THREE.Vector3; distSq: number } | null = null;
            let secondAnchor: { pos: THREE.Vector3; distSq: number } | null = null;
            for (const anchor of buildAnchors) {
                const dx = anchor.x - point.x;
                const dz = anchor.z - point.z;
                const distSq = dx * dx + dz * dz;
                if (distSq >= 12 * 12) continue;

                const candidate = {
                    pos: new THREE.Vector3(anchor.x, anchor.y, anchor.z),
                    distSq,
                };

                if (!firstAnchor || distSq < firstAnchor.distSq) {
                    secondAnchor = firstAnchor;
                    firstAnchor = candidate;
                } else if (!secondAnchor || distSq < secondAnchor.distSq) {
                    secondAnchor = candidate;
                }
            }
                                
            if (firstAnchor && secondAnchor) {
                // Two anchors in range: Show solid bridge placement preview
                dotsRef.current.visible = false;
                bridgeGroup.current.visible = true;
                
                const p1 = firstAnchor.pos;
                const p2 = secondAnchor.pos;
                const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
                bridgeGroup.current.position.copy(center);
                bridgeGroup.current.lookAt(p2);
                bridgeGroup.current.scale.set(1, 1, p1.distanceTo(p2));
                
                const mesh = bridgeGroup.current.children[0] as THREE.Mesh;
                if (mesh.material) (mesh.material as THREE.Material).opacity = 0.5 + Math.sin(time * 6) * 0.2;
                
            } else if (firstAnchor) {
                // One anchor in range: Show leading dotted line to cursor
                bridgeGroup.current.visible = false;
                dotsRef.current.visible = true;
                
                const p1 = firstAnchor.pos;
                const p2 = new THREE.Vector3(point.x, Math.max(point.y, 0) + 1.0, point.z); 
                
                for (let i = 0; i < dotsCount; i++) {
                    const t = i / (dotsCount - 1);
                    const offsetT = (t + time * 1.5) % 1.0; // Flowing animation
                    dummy.position.copy(p1).lerp(p2, offsetT);
                    
                    // Add an arc to the line
                    dummy.position.y += Math.sin(offsetT * Math.PI) * 1.5;
                    
                    dummy.scale.setScalar(0.6 * (1 - offsetT * 0.5)); // Shrink as it approaches cursor
                    dummy.updateMatrix();
                    dotsRef.current.setMatrixAt(i, dummy.matrix);
                }
                dotsRef.current.instanceMatrix.needsUpdate = true;
                
            } else {
                bridgeGroup.current.visible = false;
                dotsRef.current.visible = false;
            }
        }
    });

    return (
        <group>
            <group ref={ghostGroup} visible={false}>
                <mesh position={[0, 0, 0]}>
                   <boxGeometry args={[3.2, 0.4, 3.2]} />
                   <meshBasicMaterial ref={matRef} color="#4ade80" transparent opacity={0.6} wireframe toneMapped={false} />
                </mesh>
                <mesh position={[0, 1.5, 0]}>
                   <cylinderGeometry args={[2.5, 3.5, 3.0, 8]} />
                   <meshBasicMaterial color="#ffffff" transparent opacity={0.4} wireframe toneMapped={false} />
                </mesh>
            </group>
            
            <group ref={bridgeGroup} visible={false}>
                <mesh>
                    <boxGeometry args={[1.6, 0.3, 1]} />
                    <meshBasicMaterial color="#4ade80" transparent opacity={0.5} wireframe toneMapped={false} />
                </mesh>
            </group>
            
            <instancedMesh ref={dotsRef} args={[undefined, undefined, dotsCount]} visible={false}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshBasicMaterial color="#fef08a" transparent opacity={0.8} toneMapped={false} />
            </instancedMesh>
        </group>
    );
}

export function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cursorRef = useRef<THREE.Mesh>(null);
  const selectedTool = useGameStore(state => state.selectedTool);
  const terrainData = useGameStore(state => state.terrainData);
  const isDrawing = useGameStore(state => state.isDrawing);
  const addAsset = useGameStore(state => state.addAsset);
  const grassHealth = useGameStore(state => state.grassHealth);
  const weather = useGameStore(state => state.weather);
  const season = useGameStore(state => state.season);
  const biome = useGameStore(state => state.biome);
  const assets = useGameStore(state => state.assets);
  const [clicks, setClicks] = useState<{id: number, pos: THREE.Vector3, color: string}[]>([]);
  
  const cursorWorldPos = useRef(new THREE.Vector3());
  const cursorActive = useRef(false);
  
  // Create non-indexed geometry for sharp, premium low-poly look
  const { positions, uvs, colors, types } = useMemo(() => {
    const gridPos: number[][][] = [];
    const halfSize = ISAND_SIZE / 2;
    const segmentSize = ISAND_SIZE / SEGMENTS;

    // First generate the grid points
    for (let i = 0; i <= SEGMENTS; i++) {
      const row = [];
      const y = (i * segmentSize) - halfSize;
      for (let j = 0; j <= SEGMENTS; j++) {
        const x = (j * segmentSize) - halfSize;
        const dist = Math.sqrt(x*x + y*y);
        const maxDist = ISAND_SIZE / 2;
        
        let z = (maxDist - dist) * 0.5;
        if (dist > 18) {
             z = -20;
        } else if (dist > 16) {
             z -= (dist - 16) * 1.5;
        }
        
        if (z > 0) {
           z += noise2D(x * 0.1, y * 0.1) * 1.5;
           if (z < 0.5) z = 0.2;
        } else {
           z = -2;
        }
        row.push([x, z, y]);
      }
      gridPos.push(row);
    }

    // Now construct non-indexed triangles
    const pos = [];
    const uv = [];
    const faceTypes = []; // one type per vertex

    const pushVertex = (r: number, c: number) => {
        const [x, y, z] = gridPos[r][c];
        pos.push(x, y, z);
        uv.push(c / SEGMENTS, 1 - (r / SEGMENTS));
        faceTypes.push(0); // Default type
    };

    for (let i = 0; i < SEGMENTS; i++) {
      for (let j = 0; j < SEGMENTS; j++) {
        const x = (j + 0.5) * segmentSize - halfSize;
        const y = (i + 0.5) * segmentSize - halfSize;
        if (Math.sqrt(x*x + y*y) > 18.5) continue;

        // Triangle 1: Top-Left, Bottom-Left, Bottom-Right
        pushVertex(i, j + 1);
        pushVertex(i, j);
        pushVertex(i + 1, j + 1);

        // Triangle 2: Bottom-Left, Bottom-Right, Top-Right (Wait, standard quad)
        pushVertex(i, j);
        pushVertex(i + 1, j);
        pushVertex(i + 1, j + 1);
      }
    }

    return {
      positions: new Float32Array(pos),
      uvs: new Float32Array(uv),
      colors: new Float32Array(pos.length), // 3 floats per vertex
      types: new Uint8Array(faceTypes)
    };
  }, []);

  // Use a global health-tinted color for the ground material, and modify by weather, season, and biome
  let baseSand = '#dda15e';
  let baseGrass = '#588157';
  let baseDeadGrass = '#bc6c25';
  let baseStone = '#6c757d';

  if (biome === 'desert') {
     baseSand = '#fcd34d'; // rich yellow sand
     baseGrass = '#fde047'; // yellowish sand dunes
     baseDeadGrass = '#d97706'; // darker sand
     baseStone = '#b45309'; // sandstone
  } else if (biome === 'tundra') {
     baseSand = '#e2e8f0'; // snow shore
     baseGrass = '#f8f9fa'; // pure snow
     baseDeadGrass = '#cbd5e1'; // dirty snow
     baseStone = '#94a3b8'; // icy rock
  } else if (biome === 'volcanic') {
     baseSand = '#44403c'; // ash shore
     baseGrass = '#292524'; // charred earth
     baseDeadGrass = '#1c1917'; // darker ash
     baseStone = '#171717'; // obsidian
  }

  // Season overrides (apply strongly if biome is forest)
  if (biome === 'forest') {
      if (season === 'spring') {
         baseGrass = '#4ade80'; // vibrant bright green
      } else if (season === 'autumn') {
         baseGrass = '#f97316'; // orange autumn leaves on grass
         baseDeadGrass = '#9a3412';
      } else if (season === 'winter') {
         baseGrass = '#f8f9fa'; // snow covered grass
         baseDeadGrass = '#e2e8f0';
         baseSand = '#f1f5f9'; // frozen shore
      }
  }

  const healthyGrass = new THREE.Color(baseGrass);
  const deadGrass = new THREE.Color(baseDeadGrass);
  const sandColor = new THREE.Color(baseSand);
  const stoneColor = new THREE.Color(baseStone);

  const pathColor = new THREE.Color('#adb5bd'); // Light stone path
  const rainyGrassTint = useMemo(() => new THREE.Color(biome === 'volcanic' ? '#000000' : '#344e41'), [biome]);

  const SLOPE_THRESHOLD = 1.2; // 高度差阈值，超过此值视为陡坡

  const refreshTerrainColors = useCallback(() => {
     if (!meshRef.current) return;
     const geometry = meshRef.current.geometry;
     if (!geometry.attributes.color) return;
     const colorAttr = geometry.attributes.color as THREE.BufferAttribute;
     const posAttr = geometry.attributes.position as THREE.BufferAttribute;

     const springs: THREE.Vector3[] = [];
     for (let j = 0; j < assets.length; j++) {
         if (assets[j].type === 'spring') {
             springs.push(new THREE.Vector3(assets[j].position.x, assets[j].position.y, assets[j].position.z));
         }
     }

     const targetColor = new THREE.Color();
     let needsUpdate = false;

     // Process 3 vertices (1 face) at a time to ensure solid colors per face.
     for (let i = 0; i < types.length; i += 3) {
        const h1 = posAttr.getY(i);
        const h2 = posAttr.getY(i + 1);
        const h3 = posAttr.getY(i + 2);
        const faceHeight = (h1 + h2 + h3) / 3;

        const isPath = types[i] === 1 || types[i + 1] === 1 || types[i + 2] === 1;

        // ── 手动材质笔刷覆盖（types: 0=草 1=路 2=沙 3=石 4=雪 5=花草）──
        const faceType = types[i]; // 3 顶点同类型（paintSurface 保证）
        const isPainted = faceType >= 2; // 2/3/4/5 是手动刷的材质

        if (faceType === 1) {
             targetColor.copy(pathColor);
        } else if (faceType === 2) {
             targetColor.copy(sandColor);  // 沙滩
        } else if (faceType === 3) {
             targetColor.copy(new THREE.Color('#6c757d')); // 石滩
        } else if (faceType === 4) {
             targetColor.copy(new THREE.Color('#f8f9fa')); // 雪地
        } else if (faceType === 5) {
             // 花草：草地底色 + 粉紫点缀
             targetColor.copy(healthyGrass);
             if (i % 9 < 3) targetColor.lerp(new THREE.Color('#e879f9'), 0.4); // 粉花
             else if (i % 9 < 5) targetColor.lerp(new THREE.Color('#fbbf24'), 0.3); // 黄花
        } else {
             if (faceHeight < 1.0) {
                 targetColor.copy(sandColor);
             } else if (faceHeight < 4.5) {
                 // GRASS
                 const faceCenterX = (posAttr.getX(i) + posAttr.getX(i + 1) + posAttr.getX(i + 2)) / 3;
                 const faceCenterZ = (posAttr.getZ(i) + posAttr.getZ(i + 1) + posAttr.getZ(i + 2)) / 3;

                 let springInfluence = 0;
                 for (let s = 0; s < springs.length; s++) {
                      const dx = faceCenterX - springs[s].x;
                      const dz = faceCenterZ - springs[s].z;
                      const dist = Math.sqrt(dx * dx + dz * dz);
                      if (dist < 10) {
                          springInfluence = Math.max(springInfluence, (10 - dist) / 10);
                      }
                 }

                 let localGrassHealth = grassHealth / 100;
                 localGrassHealth = Math.min(1, localGrassHealth + springInfluence * 1.5);

                 targetColor.copy(deadGrass).lerp(healthyGrass, localGrassHealth);
                 if (weather === 'snowy' || season === 'winter' || biome === 'tundra') {
                     // Add more white for snow
                     targetColor.lerp(new THREE.Color('#ffffff'), 0.8);
                 } else if (weather === 'rainy' && biome === 'forest') {
                     targetColor.lerp(rainyGrassTint, 0.4);
                 }
             } else {
                 // High mountain peaks
                 if (biome === 'volcanic') {
                     targetColor.copy(stoneColor); // Just rock for volcano
                 } else if (faceHeight < 6.5) {
                     targetColor.copy(stoneColor);
                     if (weather === 'snowy' || season === 'winter' || biome === 'tundra') {
                         targetColor.lerp(new THREE.Color('#ffffff'), 0.6);
                     }
                 } else {
                     // Snow peaks
                     targetColor.copy(new THREE.Color('#f8f9fa'));
                 }
             }

             const variation = (i % 5 === 0) ? 0.02 : (i % 3 === 0) ? -0.02 : 0;
             if (variation !== 0) {
                 const hsl = { h: 0, s: 0, l: 0 };
                 targetColor.getHSL(hsl);
                 targetColor.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + variation)));
             }
        } // Closing the 'else' block for the manual material override

        const tr = targetColor.r;
        const tg = targetColor.g;
        const tb = targetColor.b;

        if (
            Math.abs(colorAttr.getX(i) - tr) > 0.001 ||
            Math.abs(colorAttr.getY(i) - tg) > 0.001 ||
            Math.abs(colorAttr.getZ(i) - tb) > 0.001
        ) {
             colorAttr.setXYZ(i, tr, tg, tb);
             colorAttr.setXYZ(i + 1, tr, tg, tb);
             colorAttr.setXYZ(i + 2, tr, tg, tb);
             needsUpdate = true;
        }
     }

     if (needsUpdate) colorAttr.needsUpdate = true;
  }, [terrainData, grassHealth, weather, season, biome, assets, healthyGrass, deadGrass, sandColor, stoneColor, pathColor, rainyGrassTint, types]);

  useEffect(() => {
     refreshTerrainColors();
  }, [refreshTerrainColors]);

  // Push initial terrain into shared state once so other systems can sample it.
  useEffect(() => {
     const currentState = useGameStore.getState().terrainData;
     if (!currentState.positions) {
         useGameStore.getState().setTerrainData(positions, types, ISAND_SIZE, SEGMENTS);
     }
  }, [positions, types]);

  // Reflect loaded terrain data back into the live mesh after save/load.
  useEffect(() => {
     if (!meshRef.current || !terrainData.positions || !terrainData.types || isDrawing) {
         return;
     }

     const geometry = meshRef.current.geometry;
     if (geometry.attributes.position.array.length === terrainData.positions.length) {
         geometry.attributes.position.array.set(terrainData.positions);
         geometry.attributes.position.needsUpdate = true;
         geometry.computeVertexNormals();
         geometry.computeBoundingSphere();
         types.set(terrainData.types);
         refreshTerrainColors();
     }
  }, [isDrawing, refreshTerrainColors, terrainData, types]);

  const lastBrushPoint = useRef(new THREE.Vector3());
  const flattenTargetY = useRef(0);
  // 溪流拖绘：落笔到松手之间累积的折线点（世界 x,z）。
  const streamPoints = useRef<{ x: number; z: number }[]>([]);
  // 「挖低」一笔里触到的最低点 + 中心，松手判定是否自动出水。
  const digLowest = useRef({ y: 999, x: 0, z: 0 });
  const lastBrushTime = useRef(0);

  const applyBrush = (point: THREE.Vector3, isDragEvent: boolean, e?: any) => {
    // Continuous brushing allowed for structural tools and plants/rocks
    if (isDragEvent && !['terrainUp', 'terrainDown', 'eraser', 'pave', 'treeA', 'treeB', 'rock', 'pond', 'spring'].includes(selectedTool)) {
        return;
    }

    if (isDragEvent) {
        const isWater = selectedTool === 'pond' || selectedTool === 'spring';
        const isObjectPlacement = ['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'].includes(selectedTool);
        const minDistance = isWater ? 1.2 : isObjectPlacement ? 1.5 : 0.2;
        
        // Ensure distance before applying brush again
        if (point.distanceTo(lastBrushPoint.current) < minDistance) return;
        
        lastBrushTime.current = Date.now();
        lastBrushPoint.current.copy(point);
    }

    // Add interaction burst, less often if dragging
    if (!isDragEvent || Math.random() < 0.2) {
      let color = "#ffffff";
      if (['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'].includes(selectedTool)) color = "#4ade80";
      if (['terrainUp', 'terrainDown', 'rock', 'pave'].includes(selectedTool)) color = "#d1d5db";
      if (selectedTool === 'spring') color = "#3b82f6";
      if (['deer', 'wolf'].includes(selectedTool)) color = "#fbbf24";
      if (selectedTool === 'eraser') color = "#ef4444";
      setClicks(prev => [...prev.slice(-9), { id: Date.now() + Math.random(), pos: point.clone(), color }]);
      
      if (!isDragEvent || Math.random() < 0.1) {
          if (['terrainUp', 'terrainDown', 'pave', 'rock'].includes(selectedTool)) {
              AudioSystem.playDig();
          } else if (selectedTool !== 'eraser' && selectedTool !== 'none') {
              AudioSystem.playPop();
          }
      }
    }

    // ── 水笔刷（池塘 / 泉）──
    // 单击或拖动都按间距落一笔：直接在 mesh 上挖一个小碗 + 出水 + 装饰。
    // 重叠的笔触靠石头去重(insideNeighbor)自动融成连片的湖/河，等于"画水"。
    if (selectedTool === 'pond' || selectedTool === 'spring') {
       if (!meshRef.current) return;
       const isSpring = selectedTool === 'spring';
       const R = isSpring ? 1.2 : 1.8;  // 单笔碗口（笔刷用，比单点放置小，便于连片）
       const D = isSpring ? 0.6 : 1.0;  // 向下挖深
       const geom = meshRef.current.geometry;
       const posAttr = geom.attributes.position;
       const centerH = getTerrainHeight(point.x, point.z);
       applyTerrainBrush(posAttr.array as Float32Array, {
         mode: 'flatten', targetY: centerH - D, size: R, strength: 1.0,
         falloff: 'flat_center', isDrag: false, px: point.x, pz: point.z,
       });
       posAttr.needsUpdate = true;
       geom.computeVertexNormals();
       geom.computeBoundingSphere();
       useGameStore.getState().setTerrainData(posAttr.array as Float32Array, types, ISAND_SIZE, SEGMENTS);
       refreshTerrainColors();
       const placed = {
         type: selectedTool as any,
         position: { x: point.x, y: point.y, z: point.z },
         rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
         scale: 1,
         customState: encodePondState({ waterLevel: centerH - D + 0.4, radius: R }),
       };
       addAsset(placed);
       if (useGameStore.getState().online) emitHermitPlace(placed);
       return;
    }

    if (selectedTool === 'pave') {
       if (!meshRef.current) return;
       const geometry = meshRef.current.geometry;
       const posAttr = geometry.attributes.position;
       const { brushSize, brushStrength, brushFalloff } = useGameStore.getState();
       const paintChanged = paintSurface(types, posAttr.array as Float32Array, {
         mode: 'paint', size: 1.5, strength: brushStrength, falloff: brushFalloff,
         isDrag: isDragEvent, px: point.x, pz: point.z, paintType: 1, // 1 = 小路
       });
       if (paintChanged) {
         refreshTerrainColors();
         if (!isDragEvent) useGameStore.getState().setTerrainData(posAttr.array as Float32Array, types, ISAND_SIZE, SEGMENTS);
       }
       return;
    }

    // ── 地形笔刷（隆起/挖低/找平/柔化/材质）──
    if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {
       if (!meshRef.current) return;
       const geometry = meshRef.current.geometry;
       const posAttr = geometry.attributes.position;
       const { brushMode, brushSize, brushStrength, brushFalloff, brushPaintType } = useGameStore.getState();
       if (!isDragEvent) flattenTargetY.current = point.y;

       if (brushMode === 'paint') {
         // 材质笔刷：改 types 数组，不改高度
         const paintChanged = paintSurface(types, posAttr.array as Float32Array, {
           mode: 'paint', size: brushSize, strength: brushStrength, falloff: brushFalloff,
           isDrag: isDragEvent, px: point.x, pz: point.z, paintType: brushPaintType,
         });
         if (paintChanged) {
           refreshTerrainColors();
           if (!isDragEvent) useGameStore.getState().setTerrainData(posAttr.array as Float32Array, types, ISAND_SIZE, SEGMENTS);
         }
       } else {
         // 高度笔刷：改 positions 数组（隆起/挖低/找平/柔化）
          const changed = applyTerrainBrush(posAttr.array as Float32Array, {
            mode: brushMode, size: brushSize, strength: brushStrength, falloff: brushFalloff,
            isDrag: isDragEvent, px: point.x, pz: point.z, targetY: flattenTargetY.current,
          });
         if (changed) {
           posAttr.needsUpdate = true;
           geometry.computeVertexNormals();
           geometry.computeBoundingBox();
           geometry.computeBoundingSphere();
           refreshTerrainColors(); // 坡度自动贴材质
           if (!isDragEvent) useGameStore.getState().setTerrainData(posAttr.array as Float32Array, types, ISAND_SIZE, SEGMENTS);
         }
       }
       return;
    }

    // Eraser Tool
    if (selectedTool === 'eraser') {
        useGameStore.getState().setSelectedEntityId(null);
        return;
    }

    // Add object tool (only on single clicks)
    const placeableTools = ['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'pond', 'streetlamp', 'house', 'windmill', 'lighthouse', 'platform', 'pier', 'boat', 'bridge_pillar', 'sub_island', 'birdhouse', 'balloon', 'balloon_ladder', 'balloon_bridge', 'tent', 'campfire', 'fence', 'well', 'bench', 'sign', 'mailbox', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'];
    if (!isDragEvent && placeableTools.includes(selectedTool)) {
        
        let rx = 0, rz = 0;
        const verticalTools = ['house', 'windmill', 'lighthouse', 'streetlamp', 'sub_island', 'bridge_pillar', 'balloon', 'balloon_ladder', 'balloon_bridge', 'tent', 'campfire', 'fence', 'well', 'bench', 'sign', 'mailbox', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel', 'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush'];
        if (e && e.face && e.face.normal && !verticalTools.includes(selectedTool)) {
            const normal = e.face.normal.clone();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
            rx = euler.x;
            rz = euler.z;
        }

        let targetScale = 0.8 + Math.random() * 0.4;
        let targetRotY = Math.random() * Math.PI * 2;
        
        if (selectedTool === 'bridge_pillar' || selectedTool === 'tent' || selectedTool === 'campfire' || selectedTool === 'well' || selectedTool === 'bench' || selectedTool === 'sign' || selectedTool === 'mailbox' || selectedTool === 'hoe' || selectedTool === 'seed_wheat' || selectedTool === 'seed_carrot' || selectedTool === 'observatory' || selectedTool === 'ruins_arch' || selectedTool === 'waterwheel') {
            targetScale = 1.0;
            targetRotY = 0;
        } else if (selectedTool === 'platform' || selectedTool === 'pier') {
            targetScale = 1.0;
            targetRotY = 0;
            // Snap logic on terrain for platform? Better to keep it consistent
            point.x = Math.round(point.x / 3) * 3;
            point.z = Math.round(point.z / 3) * 3;
        }

        // 生生不息模式：打牌即放置，放下后走共生连锁结算
        const flourishState = useGameStore.getState();
        if (flourishState.mode === 'flourish' && flourishState.pendingCard) {
            flourishState.commitCardPlacement({ x: point.x, z: point.z });
            return;
        }

        let assetType: any = selectedTool;
        if (selectedTool === 'hoe') assetType = 'farmland';
        if (selectedTool === 'seed_wheat') assetType = 'crop_wheat';
        if (selectedTool === 'seed_carrot') assetType = 'crop_carrot';

        let placedCustom = String(selectedTool).startsWith('balloon') ? useGameStore.getState().balloonColor : undefined;

        // 允许自由放置，不做任何碰撞拦截
        // （池塘/泉已由上面的「水笔刷」分支处理，不会走到这里）
        let placedY = Math.max(point.y, 0);

        const placed = {
            type: assetType as any,
            position: { x: point.x, y: placedY, z: point.z },
            rotation: { x: rx, y: targetRotY, z: rz },
            scale: targetScale,
            customState: placedCustom
        };
        addAsset(placed);
        if (useGameStore.getState().online) emitHermitPlace(placed); // 联机：广播放置
    }
  };

  const onPointerDown = (e: any) => {
    if (selectedTool === 'none') return;
    e.stopPropagation();
    
    // Check if right click (button 2) to cancel or allow anything
    if (e.button !== 0) return;

    if (selectedTool === 'eraser') {
        useGameStore.getState().setSelectedEntityId(null);
        return;
    }

    // 溪流：落笔开始记录折线，不走笔刷。
    if (selectedTool === 'water_flow') {
        streamPoints.current = [{ x: e.point.x, z: e.point.z }];
        useGameStore.getState().setIsDrawing(true);
        if (e.target && e.pointerId !== undefined) {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
        return;
    }

    useGameStore.getState().setIsDrawing(true);
    applyBrush(e.point, false, e);
    // Explicit pointer capture so drag outside of mesh continues
    if (e.target && e.pointerId !== undefined) {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerUp = (e: any) => {
    if (useGameStore.getState().isDrawing) {
       useGameStore.getState().setIsDrawing(false);

       // 溪流：松手把折线提交为一个 water_flow 物件。
       if (selectedTool === 'water_flow') {
          let pts = streamPoints.current;
          // 点击放置瀑布：没拖出折线时，按落点坡度合成一段「顺坡而下」的短折线，
          // buildStream 检测到陡降即生成竖直水帘 → 点一下就是一道瀑布。
          if (pts.length < 2) {
             const c = pts[0] || { x: lastBrushPoint.current.x, z: lastBrushPoint.current.z };
             const g = getTerrainGradient(c.x, c.z); // 指向上坡
             let ux = g.dx, uz = g.dz;
             const gl = Math.hypot(ux, uz) || 1;
             ux /= gl; uz /= gl;
             const span = 2.2;
             pts = [
                { x: c.x + ux * span, z: c.z + uz * span }, // 高处
                { x: c.x - ux * span, z: c.z - uz * span }, // 低处
             ];
          }
          if (pts.length >= 2) {
             const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
             const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
             const placed = {
                type: 'water_flow' as any,
                position: { x: cx, y: 0, z: cz },
                rotation: { x: 0, y: 0, z: 0 },
                scale: 1,
                customState: encodeStreamState(pts),
             };
             addAsset(placed);
             if (useGameStore.getState().online) emitHermitPlace(placed);
          }
          streamPoints.current = [];
          if (e.target && e.pointerId !== undefined) {
             try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
          }
          return;
       }

       if (meshRef.current) {
          const geometry = meshRef.current.geometry;
          const posAttr = geometry.attributes.position;
          useGameStore.getState().setTerrainData(posAttr.array as Float32Array, types, ISAND_SIZE, SEGMENTS);
       }

       // 挖到海平面以下时海水自然漫入，不再额外生成水塘/湖泊（已按需求移除自动出水）。

       if (e.target && e.pointerId !== undefined) {
           try {
              (e.target as HTMLElement).releasePointerCapture(e.pointerId);
           } catch { } // ignore
       }
    }
  };

  const onPointerMove = (e: any) => {
    cursorWorldPos.current.copy(e.point);
    cursorActive.current = true;

    // Custom cursor handling
    const isBuildPreviewTool = ['platform', 'pier', 'sub_island', 'bridge'].includes(selectedTool);
    if (selectedTool !== 'none' && cursorRef.current && !isBuildPreviewTool) {
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

    if (useGameStore.getState().isDrawing) {
        e.stopPropagation();
        if (selectedTool === 'water_flow') {
            const pts = streamPoints.current;
            const last = pts[pts.length - 1];
            if (!last || Math.hypot(e.point.x - last.x, e.point.z - last.z) > 0.6) {
                pts.push({ x: e.point.x, z: e.point.z });
            }
        } else {
            applyBrush(e.point, true, e);
        }
    }
  };

  useFrame(({ clock }) => {
     if (cursorRef.current && cursorRef.current.visible) {
         cursorRef.current.rotation.z = clock.elapsedTime * 2;
         
         let baseScale = 1;
         const tool = useGameStore.getState().selectedTool;
         if (tool === 'terrainUp' || tool === 'terrainDown') baseScale = useGameStore.getState().brushSize;
         if (tool === 'eraser') baseScale = 2;

         cursorRef.current.scale.setScalar(baseScale * (1 + Math.sin(clock.elapsedTime * 8) * 0.1));
     }
  });

  const onPointerOut = () => {
    cursorActive.current = false;
    if (cursorRef.current) cursorRef.current.visible = false;
  };

  return (
    <>
      {/* Giant invisible ocean plane to catch clicks outside the terrain grid */}
      <mesh 
        position={[0, -0.5, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        onPointerDown={onPointerDown} 
        onPointerMove={onPointerMove} 
        onPointerOut={onPointerOut}
      >
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={meshRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerMove={onPointerMove} onPointerOut={onPointerOut} receiveShadow castShadow name="terrain-mesh">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
          <bufferAttribute attach="attributes-uv" array={uvs} count={uvs.length / 2} itemSize={2} />
          <bufferAttribute attach="attributes-color" array={colors} count={colors.length / 3} itemSize={3} />
        </bufferGeometry>
        <meshStandardMaterial 
          vertexColors={true}
          flatShading={true} 
          roughness={0.9}
        />
      </mesh>
      
      {/* Terrain Cursor */}
      <mesh ref={cursorRef} visible={false}>
        <ringGeometry args={[0.8, 1, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <ShockwaveRing />

      {/* Particle Bursts */}
      {clicks.map(c => <ParticleBurst key={c.id} position={c.pos} color={c.color} />)}
      
      {/* High-End Build Previews */}
      <BuildPreview cursorWorldPos={cursorWorldPos} cursorActive={cursorActive} />
    </>
  );
}
