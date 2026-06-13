import { createNoise2D } from 'simplex-noise';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, ToolType } from '../store';
import { AudioSystem } from '../lib/audio';

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
                    for (const a of assets) {
                        if (a.type === 'platform' || a.type === 'pier' || a.type === 'sub_island') {
                            const dist = Math.sqrt((a.position.x - point.x)**2 + (a.position.z - point.z)**2);
                            if (dist < 4.5) { isValid = true; break; }
                        }
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
            let anchors = assets.filter(a => a.type === 'platform' || a.type === 'pier' || a.type === 'sub_island')
                                .map(a => ({
                                    pos: new THREE.Vector3(
                                        a.position.x,
                                        a.type === 'sub_island' ? a.position.y : Math.max(a.position.y, 0),
                                        a.position.z
                                    ),
                                    dist: Math.sqrt((a.position.x - point.x)**2 + (a.position.z - point.z)**2)
                                }))
                                .filter(a => a.dist < 12)
                                .sort((a, b) => a.dist - b.dist);
                                
            if (anchors.length >= 2) {
                // Two anchors in range: Show solid bridge placement preview
                dotsRef.current.visible = false;
                bridgeGroup.current.visible = true;
                
                const p1 = anchors[0].pos;
                const p2 = anchors[1].pos;
                const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
                bridgeGroup.current.position.copy(center);
                bridgeGroup.current.lookAt(p2);
                bridgeGroup.current.scale.set(1, 1, p1.distanceTo(p2));
                
                const mesh = bridgeGroup.current.children[0] as THREE.Mesh;
                if (mesh.material) (mesh.material as THREE.Material).opacity = 0.5 + Math.sin(time * 6) * 0.2;
                
            } else if (anchors.length === 1) {
                // One anchor in range: Show leading dotted line to cursor
                bridgeGroup.current.visible = false;
                dotsRef.current.visible = true;
                
                const p1 = anchors[0].pos;
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

        if (isPath) {
             targetColor.copy(pathColor);
        } else {
             if (faceHeight < 0.8) {
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
        }

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
  const lastBrushTime = useRef(0);

  const applyBrush = (point: THREE.Vector3, isDragEvent: boolean, e?: any) => {
    // Continuous brushing allowed for structural tools and plants/rocks
    if (isDragEvent && !['terrainUp', 'terrainDown', 'eraser', 'pave', 'treeA', 'treeB', 'rock'].includes(selectedTool)) {
        return;
    }

    if (isDragEvent) {
        const isObjectPlacement = ['treeA', 'treeB', 'rock', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'].includes(selectedTool);
        const minDistance = isObjectPlacement ? 1.5 : 0.2;
        
        // Ensure distance before applying brush again
        if (point.distanceTo(lastBrushPoint.current) < minDistance) return;
        
        lastBrushTime.current = Date.now();
        lastBrushPoint.current.copy(point);
    }

    // Add interaction burst, less often if dragging
    if (!isDragEvent || Math.random() < 0.2) {
      let color = "#ffffff";
      if (['treeA', 'treeB', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'].includes(selectedTool)) color = "#4ade80";
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

    if (selectedTool === 'pave') {
       if (!meshRef.current) return;
       const geometry = meshRef.current.geometry;
       const posAttr = geometry.attributes.position;
       const v = new THREE.Vector3();
       for (let i = 0; i < posAttr.count; i++) {
         v.fromBufferAttribute(posAttr, i);
         const dist = Math.sqrt((v.x - point.x) ** 2 + (v.z - point.z) ** 2);
         if (dist < 1.5) { // brush size
             types[i] = 1; // 1 = path
         }
       }
       refreshTerrainColors();
       return;
    }

    if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {
       if (!meshRef.current) return;
       const geometry = meshRef.current.geometry;
       const posAttr = geometry.attributes.position;
       
       const v = new THREE.Vector3();
       let changed = false;
       for (let i = 0; i < posAttr.count; i++) {
         v.fromBufferAttribute(posAttr, i);
         // Find horizontal distance
         const dist = Math.sqrt((v.x - point.x) ** 2 + (v.z - point.z) ** 2);
         if (dist < 3.5) { // Matched cursor scale
            const influence = (3.5 - dist) / 3.5;
            // Smooth curve for deformation
            const smoothInfluence = influence * influence * (3 - 2 * influence);
            // Lower intensity per-frame if dragging
            const strength = isDragEvent ? 0.3 : 0.6;
            const delta = (selectedTool === 'terrainUp' ? strength : -strength) * smoothInfluence;
            const newY = Math.max(-0.5, v.y + delta);
            if (newY !== v.y) {
                posAttr.setY(i, newY);
                changed = true;
            }
         }
       }

       if (changed) {
           posAttr.needsUpdate = true;
           geometry.computeVertexNormals();
           geometry.computeBoundingBox();
           geometry.computeBoundingSphere();
           refreshTerrainColors();
           // Update global store
           if (!isDragEvent) {
               // If it's just a click, update immediately
               useGameStore.getState().setTerrainData(posAttr.array as Float32Array, types, ISAND_SIZE, SEGMENTS);
           }
       }
       return;
    }

    // Eraser Tool
    if (selectedTool === 'eraser') {
        useGameStore.getState().removeAssetAt({ x: point.x, y: point.y, z: point.z }, isDragEvent ? 2.5 : 2);
        
        // Also erase paths
        if (meshRef.current) {
            const geometry = meshRef.current.geometry;
            const posAttr = geometry.attributes.position;
            const v = new THREE.Vector3();
            for (let i = 0; i < posAttr.count; i++) {
                v.fromBufferAttribute(posAttr, i);
                const dist = Math.sqrt((v.x - point.x) ** 2 + (v.z - point.z) ** 2);
                if (dist < 2.0) {
                    types[i] = 0; // 0 = grass
                }
            }
            refreshTerrainColors();
        }
        return;
    }

    // Add object tool (only on single clicks)
    const placeableTools = ['treeA', 'treeB', 'rock', 'deer', 'wolf', 'seagull', 'dolphin', 'fish', 'spring', 'streetlamp', 'house', 'windmill', 'lighthouse', 'platform', 'pier', 'boat', 'bridge_pillar', 'sub_island', 'birdhouse', 'balloon', 'balloon_ladder', 'balloon_bridge', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'];
    if (!isDragEvent && placeableTools.includes(selectedTool)) {
        
        let rx = 0, rz = 0;
        const verticalTools = ['house', 'windmill', 'lighthouse', 'streetlamp', 'sub_island', 'bridge_pillar', 'balloon', 'balloon_ladder', 'balloon_bridge', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'];
        if (e && e.face && e.face.normal && !verticalTools.includes(selectedTool)) {
            const normal = e.face.normal.clone();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
            rx = euler.x;
            rz = euler.z;
        }

        let targetScale = 0.8 + Math.random() * 0.4;
        let targetRotY = Math.random() * Math.PI * 2;
        
        if (selectedTool === 'bridge_pillar' || selectedTool === 'tent' || selectedTool === 'campfire' || selectedTool === 'well' || selectedTool === 'bench' || selectedTool === 'hoe' || selectedTool === 'seed_wheat' || selectedTool === 'seed_carrot' || selectedTool === 'observatory' || selectedTool === 'ruins_arch' || selectedTool === 'waterwheel') {
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

        addAsset({
            type: assetType as any,
            position: { x: point.x, y: Math.max(point.y, 0), z: point.z },
            rotation: { x: rx, y: targetRotY, z: rz },
            scale: targetScale,
            customState: String(selectedTool).startsWith('balloon') ? useGameStore.getState().balloonColor : undefined
        });
    }
  };

  const onPointerDown = (e: any) => {
    if (selectedTool === 'none') return;
    e.stopPropagation();
    
    // Check if right click (button 2) to cancel or allow anything
    if (e.button !== 0) return;

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
       if (meshRef.current) {
          const geometry = meshRef.current.geometry;
          const posAttr = geometry.attributes.position;
          useGameStore.getState().setTerrainData(posAttr.array as Float32Array, types, ISAND_SIZE, SEGMENTS);
       }
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
      if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') cursorScale = 3.5;
      if (selectedTool === 'eraser') cursorScale = 2;
      cursorRef.current.scale.setScalar(cursorScale);
    }

    if (useGameStore.getState().isDrawing) {
        e.stopPropagation();
        applyBrush(e.point, true, e);
    }
  };

  useFrame(({ clock }) => {
     if (cursorRef.current && cursorRef.current.visible) {
         cursorRef.current.rotation.z = clock.elapsedTime * 2;
         
         let baseScale = 1;
         const tool = useGameStore.getState().selectedTool;
         if (tool === 'terrainUp' || tool === 'terrainDown') baseScale = 3.5;
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
