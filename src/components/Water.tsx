import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import { Edges } from '@react-three/drei';

const ISAND_SIZE = 40;
const SEGMENTS = 64;

export function Water() {
  const oceanMeshRef = useRef<THREE.Mesh>(null);
  const oceanGeomRef = useRef<THREE.PlaneGeometry>(null);
  const weather = useGameStore(state => state.weather);
  const season = useGameStore(state => state.season);
  const biome = useGameStore(state => state.biome);

  // Dynamic accumulated water
  const dynamicWaterRef = useRef<THREE.Mesh>(null);
  const waterLevels = useRef<Float32Array>(new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1)));

  // Generate dynamic water plane geometry matching the terrain
  const { positions, uvs, indices } = useMemo(() => {
    const pos = [];
    const uv = [];
    const ind = [];
    const halfSize = ISAND_SIZE / 2;
    const segmentSize = ISAND_SIZE / SEGMENTS;

    for (let i = 0; i <= SEGMENTS; i++) {
        const y = (i * segmentSize) - halfSize;
        for (let j = 0; j <= SEGMENTS; j++) {
            const x = (j * segmentSize) - halfSize;
            pos.push(x, -5, y); // Initialize below ground
            uv.push(j / SEGMENTS, 1 - (i / SEGMENTS));
        }
    }

    for (let i = 0; i < SEGMENTS; i++) {
        for (let j = 0; j < SEGMENTS; j++) {
            const x = (j + 0.5) * segmentSize - halfSize;
            const y = (i + 0.5) * segmentSize - halfSize;
            const dist = Math.sqrt(x*x + y*y);

            if (dist > 18.5) continue;

            const a = i * (SEGMENTS + 1) + (j + 1);
            const b = i * (SEGMENTS + 1) + j;
            const c = (i + 1) * (SEGMENTS + 1) + j;
            const d = (i + 1) * (SEGMENTS + 1) + (j + 1);

            ind.push(a, b, d);
            ind.push(b, c, d);
        }
    }

    return {
      positions: new Float32Array(pos),
      uvs: new Float32Array(uv),
      indices: new Uint16Array(ind)
    };
  }, []);

  const cursorRef = useRef<THREE.Group>(null);
  const connectionStartRef = useRef<THREE.Vector3 | null>(null);
  const linePreviewRef = useRef<any>(null);

  useFrame((state) => {
    const isFrozen = useGameStore.getState().biome === 'tundra' || useGameStore.getState().season === 'winter';
    
    // 1. Global Ocean Animation
    if (oceanGeomRef.current && oceanMeshRef.current && !isFrozen) {
        const time = state.clock.elapsedTime;
        const oPos = oceanGeomRef.current.attributes.position;
        const flowSpeed = weather === 'rainy' ? 4.5 : 3.0;
        const baseAmp = weather === 'rainy' ? 3.0 : 1.8;
        
        for (let i = 0; i < oPos.count; i++) {
             const x = oPos.getX(i);
             const y = oPos.getY(i); 
             const dist = Math.sqrt(x*x + y*y);

             const flowTime = time * flowSpeed;
             
             let islandFade = 1.0;
             if (dist < 18) {
                 islandFade = Math.max(0, (dist - 12) / 6.0); // 0 at r=12, 1 at r=18
             }
             
             // Base ambient waves
             // Add frequency variation for more choppy look
             const wave1 = Math.sin((x * 0.2 + y * 0.1) + flowTime) * baseAmp * 0.5 * islandFade;
             const wave2 = Math.cos((x * 0.1 - y * 0.2) + flowTime * 0.8) * baseAmp * 0.4 * islandFade;
             const wave3 = Math.sin((x * 0.5 + y * 0.5) - flowTime * 1.5) * baseAmp * 0.1 * islandFade;
             
             // Crashing waves near the island
             let crashWave = 0;
             if (dist < 30 && dist > 14) {
                 // Radial wave moving inward
                 const phase = dist * 0.8 - time * 2.0;
                 // Steep crests
                 crashWave = Math.pow(Math.sin(phase) * 0.5 + 0.5, 3.0) * (baseAmp * 1.5);
                 // Fade out as it goes further away
                 const fade = Math.min(1.0, (dist - 14) / 4.0) * Math.min(1.0, (30 - dist) / 5.0);
                 crashWave *= fade * islandFade;
             }

             oPos.setZ(i, wave1 + wave2 + wave3 + crashWave);
        }
        oPos.needsUpdate = true;
        oceanGeomRef.current.computeVertexNormals();

        const material = oceanMeshRef.current.material as THREE.MeshStandardMaterial;
        if (weather === 'rainy') {
            material.opacity = 0.9;
        } else {
            material.opacity = 0.8;
        }
    }

    // 2. Dynamic Water Simulation (Rivers/Lakes)
    const terrainData = useGameStore.getState().terrainData;
    if (!dynamicWaterRef.current || !terrainData.positions) return;

    const terrainHeights = terrainData.positions;
    const w = waterLevels.current;
    const nextW = new Float32Array(w);
    const size = SEGMENTS + 1;
    
    // a. Add Water from Springs
    const assets = useGameStore.getState().assets;
    let hasSprings = false;
    for (let i = 0; i < assets.length; i++) {
        if (assets[i].type === 'spring') {
            hasSprings = true;
            const asset = assets[i];
            const u = (asset.position.x + ISAND_SIZE / 2) / ISAND_SIZE;
            const v = (asset.position.z + ISAND_SIZE / 2) / ISAND_SIZE;
            
            if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
                const col = Math.floor(u * SEGMENTS);
                const row = Math.floor(v * SEGMENTS);
                
                // Spring fills 3x3 area
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const rr = row + dr;
                        const cc = col + dc;
                        if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
                             nextW[rr * size + cc] += 0.02; // Water source
                        }
                    }
                }
            }
        }
    }

    // b. Rain addition
    const isRainy = weather === 'rainy';
    if (isRainy) {
       for (let i = 0; i < w.length; i++) {
           if (terrainHeights[i * 3 + 1] > 0.5) {
               nextW[i] += 0.005; 
           }
       }
    }

    // c. Flow Simulation (Cellular Automata on Terrain Gradients)
    const maxFlowRate = 0.4; 
    let activeCells = false;

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const idx = r * size + c;
            const th = terrainHeights[idx * 3 + 1];
            
            if (w[idx] <= 0.001) continue; 
            activeCells = true;
            
            const currentHeight = terrainHeights[idx * 3 + 1] + w[idx];
            let totalDiff = 0;
            const diffs = [0, 0, 0, 0];
            const neighbors = [-1, -1, -1, -1];
            
            if (r > 0) neighbors[0] = (r - 1) * size + c;         // Top
            if (r < size - 1) neighbors[1] = (r + 1) * size + c;  // Bottom
            if (c > 0) neighbors[2] = r * size + (c - 1);         // Left
            if (c < size - 1) neighbors[3] = r * size + (c + 1);  // Right
            
            for (let i = 0; i < 4; i++) {
                if (neighbors[i] !== -1) {
                    const nIdx = neighbors[i];
                    const neighborHeight = terrainHeights[nIdx * 3 + 1] + w[nIdx];
                    if (currentHeight > neighborHeight) {
                        diffs[i] = currentHeight - neighborHeight;
                        totalDiff += diffs[i];
                    }
                }
            }
            
            if (totalDiff > 0) {
                const flowAmount = Math.min(w[idx], totalDiff / 4) * maxFlowRate;
                for (let i = 0; i < 4; i++) {
                    if (diffs[i] > 0) {
                        const out = (diffs[i] / totalDiff) * flowAmount;
                        nextW[idx] -= out;
                        nextW[neighbors[i]] += out;
                    }
                }
            }
            
            // Ground absorption
            nextW[idx] -= 0.002;
            if (nextW[idx] < 0) nextW[idx] = 0;
        }
    }
    
    // d. Update Geometry
    if (activeCells || hasSprings || isRainy) {
        const dynGeom = dynamicWaterRef.current.geometry;
        const dynPos = dynGeom.attributes.position;
        
        for (let i = 0; i < w.length; i++) {
            w[i] = nextW[i];
            const th = terrainHeights[i * 3 + 1];
            
            // Drain at beach
            if (th <= 0.2) {
                w[i] = 0;
            }
    
            if (w[i] >= 0.01) {
                dynPos.setY(i, th + w[i]);
            } else {
                dynPos.setY(i, -100); // Hide completely out of sight
                if (w[i] < 0.01) { w[i] = 0; }
            }
        }
        
        dynPos.needsUpdate = true;
        dynGeom.computeVertexNormals();
    }
  });

  // Determine properties based on biome and season
  const isFrozen = biome === 'tundra' || season === 'winter';
  const isVolcanic = biome === 'volcanic';

  let dynColor = '#60a5fa';
  let dynOpacity = 0.8;
  if (isVolcanic) { dynColor = '#ea580c'; dynOpacity = 1.0; }
  else if (isFrozen) { dynColor = '#e0f2fe'; dynOpacity = 0.95; }

  let oceanColor = weather === 'rainy' ? '#0f172a' : '#0284c7';
  let oceanEmissive = weather === 'rainy' ? '#020617' : '#0ea5e9';
  let emissiveInt = 0.2;
  let rough = 0.15;
  let metal = 0.9;
  let oceanOpac = 0.85;

  if (isVolcanic) {
     oceanColor = '#ea580c';
     oceanEmissive = '#dc2626';
     emissiveInt = 1.5;
     rough = 0.8;
     metal = 0.1;
     oceanOpac = 1.0;
  } else if (isFrozen) {
     oceanColor = '#e0f2fe';
     oceanEmissive = '#bae6fd';
     emissiveInt = 0.1;
     rough = 0.4;
     metal = 0.3;
     oceanOpac = 0.95;
  }

  return (
    <group>
        {/* Dynamic Flowing Water / Rivers / Lakes */}
        <mesh ref={dynamicWaterRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
            <bufferAttribute attach="attributes-uv" array={uvs} count={uvs.length / 2} itemSize={2} />
            <bufferAttribute attach="index" array={indices} count={indices.length} itemSize={1} />
          </bufferGeometry>
          <meshPhysicalMaterial 
            color={dynColor}
            transparent 
            opacity={dynOpacity}
            metalness={isVolcanic ? 0.1 : 0.1}
            roughness={isVolcanic ? 0.8 : (isFrozen ? 0.5 : 0.1)}
            transmission={isVolcanic || isFrozen ? 0 : 0.5}
            thickness={2.0}
            flatShading
          />
        </mesh>

        {/* Global Ocean Base */}
        <mesh 
          position={[0, -0.4, 0]} 
          rotation={[-Math.PI / 2, 0, 0]} 
          ref={oceanMeshRef} 
          onPointerDown={(e) => {
            const state = useGameStore.getState();
            const tool = state.selectedTool;
            const placeableTools = ['platform', 'pier', 'sub_island', 'boat', 'bridge_pillar', 'seagull', 'dolphin', 'fish', 'birdhouse'];
            if (placeableTools.includes(tool)) {
               e.stopPropagation();
               if (e.button !== 0) return;

               // Normal placement
               let targetX = e.point.x;
               let targetZ = e.point.z;
               let targetScale = tool === 'sub_island' ? 1.5 + Math.random() * 0.5 : (0.8 + Math.random() * 0.4);
               let targetRotY = Math.random() * Math.PI * 2;

               if (tool === 'platform' || tool === 'pier') {
                   // 3x3 Grid Snapping
                   targetX = Math.round(targetX / 3) * 3;
                   targetZ = Math.round(targetZ / 3) * 3;
                   targetScale = 1.0;
                   targetRotY = 0;
               }

               if (tool === 'bridge_pillar') {
                   targetScale = 1.0;
                   targetRotY = 0;
               }

               state.addAsset({
                  type: tool as any,
                  position: { x: targetX, y: 0, z: targetZ },
                  rotation: { x: 0, y: targetRotY, z: 0 },
                  scale: targetScale
               });
               AudioSystem.playDig();
            }
          }}
          onPointerMove={(e) => {
             const state = useGameStore.getState();
             const tool = state.selectedTool;
             const placeableTools = ['platform', 'pier', 'sub_island', 'boat', 'bridge_pillar', 'seagull', 'dolphin', 'fish', 'birdhouse'];
             
             if (placeableTools.includes(tool)) {
                e.stopPropagation();
                
                if (cursorRef.current) {
                    cursorRef.current.visible = true;
                    
                    let targetX = e.point.x;
                    let targetZ = e.point.z;

                    if (tool === 'platform' || tool === 'pier') {
                        targetX = Math.round(targetX / 3) * 3;
                        targetZ = Math.round(targetZ / 3) * 3;
                        cursorRef.current.scale.set(0.75, 1, 0.75); // 3x3 bounding box
                    } else if (tool === 'sub_island') {
                        cursorRef.current.scale.set(1.5, 1, 1.5);
                    } else if (tool === 'boat') {
                        cursorRef.current.scale.set(0.5, 1, 0.8);
                    } else {
                        cursorRef.current.scale.set(0.1, 1, 0.1); 
                    }

                    cursorRef.current.position.set(targetX, 0, targetZ);
                }
             } else {
                if (cursorRef.current) cursorRef.current.visible = false;
             }

             // Holographic line logic
             if ((tool === 'bridge' || tool === 'rope') && state.connectingPillarId) {
                const startPillar = state.assets.find(a => a.id === state.connectingPillarId);
                if (startPillar && linePreviewRef.current) {
                    linePreviewRef.current.visible = true;
                    const posAttr = linePreviewRef.current.geometry.attributes.position;
                    posAttr.setXYZ(0, startPillar.position.x, 0.5, startPillar.position.z);
                    posAttr.setXYZ(1, e.point.x, 0.5, e.point.z);
                    posAttr.needsUpdate = true;
                    if (linePreviewRef.current.computeLineDistances) {
                        linePreviewRef.current.computeLineDistances();
                    }
                }
             } else {
                if (linePreviewRef.current) linePreviewRef.current.visible = false;
             }
          }}
          onPointerOut={() => {
             if (cursorRef.current) cursorRef.current.visible = false;
             if (linePreviewRef.current) linePreviewRef.current.visible = false;
          }}
        >
          <planeGeometry args={[400, 400, 150, 150]} ref={oceanGeomRef as any} />
          <meshPhysicalMaterial 
            color={oceanColor}
            emissive={oceanEmissive}
            emissiveIntensity={emissiveInt}
            transparent 
            opacity={oceanOpac} 
            roughness={rough} 
            metalness={metal}
            clearcoat={isVolcanic ? 0 : 1.0}
            clearcoatRoughness={0.1}
            flatShading
          />
        </mesh>

        {/* Ocean Cursor (Holographic Dashed Outline) */}
        <group ref={cursorRef} visible={false}>
            <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[4, 1, 4]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.1} wireframe={false} depthWrite={false} />
                <Edges color="#34d399" scale={1.02} threshold={15} />
            </mesh>
            <pointLight color="#10b981" intensity={2} distance={8} />
        </group>

        {/* Holographic Line for bridges */}
        <lineSegments ref={linePreviewRef} visible={false}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={2} array={new Float32Array(6)} itemSize={3} />
            </bufferGeometry>
            <lineDashedMaterial color="#34d399" dashSize={0.5} gapSize={0.2} transparent opacity={0.8} />
        </lineSegments>
    </group>
  );
}
