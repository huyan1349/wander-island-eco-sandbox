import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import { Edges } from '@react-three/drei';

const ISAND_SIZE = 40;

// --- Shared ocean wave model ---
// Single source of truth for the ocean surface: the visual mesh and all
// floating objects sample the same function so they stay perfectly in sync.

// Asymmetric wave profile: peaked crests, wide flat troughs (anime wave shape)
function crestShape(p: number) {
  return Math.sin(p) + 0.35 * Math.sin(2 * p + 0.6);
}

// (x, y) are ocean-plane local coords: y = -worldZ. Returns height above mesh.
function sampleOceanWave(x: number, y: number, time: number, flowSpeed: number, baseAmp: number) {
  const dist = Math.sqrt(x * x + y * y);
  const flowTime = time * flowSpeed;

  // Smooth fade under the island (smoothstep: no visible hinge ring)
  let islandFade = 1.0;
  if (dist < 18) {
      const t = Math.max(0, (dist - 12) / 6.0);
      islandFade = t * t * (3 - 2 * t);
  }

  // Broad drifting swells underneath
  const wave1 = crestShape(x * 0.2 + y * 0.1 + flowTime) * baseAmp * 0.28 * islandFade;
  const wave2 = crestShape(x * 0.1 - y * 0.2 + flowTime * 0.8) * baseAmp * 0.22 * islandFade;

  // Billowing puffs: |sin·sin| products form rounded upward mounds, layered
  // at three scales (big billows / puffs / fine fluff) for a cloud-like
  // cauliflower surface. Mean is subtracted to keep the surface level.
  const puffL = Math.abs(Math.sin(x * 0.13 - y * 0.08 + flowTime * 0.30) *
                         Math.sin(x * 0.06 + y * 0.15 + flowTime * 0.25)) * baseAmp * 0.55;
  const puffM = Math.abs(Math.sin(x * 0.33 + y * 0.21 + flowTime * 0.45) *
                         Math.sin(y * 0.36 - x * 0.24 - flowTime * 0.35)) * baseAmp * 0.30;
  const puffS = Math.abs(Math.sin(x * 0.68 + y * 0.55 + flowTime * 0.6) *
                         Math.sin(x * 0.52 - y * 0.74 - flowTime * 0.5)) * baseAmp * 0.14;
  const wave3 = (puffL + puffM + puffS - 0.405 * 0.99 * baseAmp) * islandFade;

  // Shore-break waves: angular phase/amplitude variation so surf arrives in
  // staggered patches around the island, never as one synchronized ring
  let crashWave = 0;
  if (dist < 30 && dist > 14) {
      const angle = Math.atan2(y, x);
      const phase = dist * 0.8 - time * 2.0 + Math.sin(angle * 3.0 + time * 0.4) * 1.6;
      const sectorAmp = 0.65 + 0.35 * Math.sin(angle * 2.0 - time * 0.3);
      crashWave = Math.pow(Math.sin(phase) * 0.5 + 0.5, 3.0) * baseAmp * 1.3 * sectorAmp;
      const fade = Math.min(1.0, (dist - 14) / 4.0) * Math.min(1.0, (30 - dist) / 5.0);
      crashWave *= fade * islandFade;
  }

  return wave1 + wave2 + wave3 + crashWave;
}

// Smoothed freeze factor (1 = animated, 0 = frozen flat), driven by Water's
// frame loop so visuals and floating physics fade out together
let freezeScale = 1;

// Current wave amplitude (weather + panel intensity + freeze ramp)
export function getWaveAmplitude(weather: string) {
  let mult = 1.8;
  if (weather === 'rainy') mult = 3.0;
  if (weather === 'stormy') mult = 4.5;
  return mult * (useGameStore.getState().waveIntensity ?? 1) * freezeScale;
}

// World-space ocean surface height at (x, z). Includes the mesh base at y=-0.4.
export function getWaterHeight(x: number, z: number, time: number, weather: string) {
  let flowSpeed = 3.0;
  if (weather === 'rainy') flowSpeed = 4.5;
  if (weather === 'stormy') flowSpeed = 6.0;
  return -0.4 + sampleOceanWave(x, -z, time, flowSpeed, getWaveAmplitude(weather));
}

export function Water() {
  const oceanMeshRef = useRef<THREE.Mesh>(null);
  const oceanGeomRef = useRef<THREE.PlaneGeometry>(null);
  const weather = useGameStore(state => state.weather);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const season = useGameStore(state => state.season);
  const biome = useGameStore(state => state.biome);

  const cursorRef = useRef<THREE.Group>(null);
  const connectionStartRef = useRef<THREE.Vector3 | null>(null);
  const linePreviewRef = useRef<any>(null);
  const oceanTarget = useRef({ color: new THREE.Color('#f4f9fd'), emissive: new THREE.Color('#dbeafe'), intensity: 0.3 });

  useFrame((state, delta) => {
    const isFrozen = useGameStore.getState().biome === 'tundra' || useGameStore.getState().season === 'winter';

    // Smooth freeze: amplitude ramps down/up over ~2s instead of snapping
    freezeScale += ((isFrozen ? 0 : 1) - freezeScale) * Math.min(1, delta * 1.2);

    // Smooth color transitions toward the current weather/biome palette
    if (oceanMeshRef.current) {
        const mat = oceanMeshRef.current.material as THREE.MeshPhysicalMaterial;
        const f = Math.min(1, delta * 1.5);
        mat.color.lerp(oceanTarget.current.color, f);
        mat.emissive.lerp(oceanTarget.current.emissive, f);
        mat.emissiveIntensity += (oceanTarget.current.intensity - mat.emissiveIntensity) * f;
    }

    // 1. Global Ocean Animation
    if (oceanGeomRef.current && oceanMeshRef.current && freezeScale > 0.005) {
        const time = state.clock.elapsedTime;
        const oPos = oceanGeomRef.current.attributes.position;
        let flowSpeed = 3.0;
        if (weather === 'rainy') flowSpeed = 4.5;
        if (weather === 'stormy') flowSpeed = 6.0;
        const baseAmp = getWaveAmplitude(weather);

        // Vertex colors for whitecaps on wave crests
        let colAttr = oceanGeomRef.current.getAttribute('color') as THREE.BufferAttribute;
        if (!colAttr) {
            colAttr = new THREE.BufferAttribute(new Float32Array(oPos.count * 3).fill(1), 3);
            oceanGeomRef.current.setAttribute('color', colAttr);
        }

        // Direct typed-array access: ~2-3x faster than attribute accessors,
        // which is what allows the denser grid
        const pArr = oPos.array as Float32Array;
        const cArr = colAttr.array as Float32Array;

        for (let i = 0; i < oPos.count; i++) {
             const ix = i * 3;
             const x = pArr[ix];
             const y = pArr[ix + 1];
             const dist = Math.sqrt(x*x + y*y);

             const h = sampleOceanWave(x, y, time, flowSpeed, baseAmp);
             pArr[ix + 2] = h;

             // Subtle open-sea whitecaps on the highest crests
             let crest = baseAmp > 0.01 ? Math.min(1, Math.max(0, (h - baseAmp * 0.55) / (baseAmp * 0.6))) : 0;
             crest *= crest;
             if (dist > 60) crest *= Math.max(0, 1 - (dist - 60) / 40);

             // Shore surf spray: white where breaking waves hit the island.
             // Mirrors the crashWave phase math in sampleOceanWave so the
             // foam surges and retreats with each breaking wave
             let foam = 0;
             if (dist > 16 && dist < 21.5 && baseAmp > 0.01) {
                 const angle = Math.atan2(y, x);
                 const phase = dist * 0.8 - time * 2.0 + Math.sin(angle * 3.0 + time * 0.4) * 1.6;
                 const sectorAmp = 0.65 + 0.35 * Math.sin(angle * 2.0 - time * 0.3);
                 const sp = Math.sin(phase) * 0.5 + 0.5;
                 const crash = sp * sp * sp * sectorAmp;
                 const band = Math.min(1, (dist - 16) / 1.2) * Math.min(1, (21.5 - dist) / 2.5);
                 foam = crash * band;
             }

             // Cloud volume shading: deep blue-grey shadow in the crevices,
             // bright white on the billowing tops (plus surf mist at shore)
             const k = baseAmp > 0.01 ? Math.max(0, Math.min(1, h / (baseAmp * 1.3) * 0.5 + 0.55)) : 0.5;
             const kk = k * k; // sharpen: shadows stay in crevices only
             const white = Math.min(1.0, crest * 0.5 + foam * 1.2);
             cArr[ix] = 0.74 + 0.30 * kk + white * 0.35;
             cArr[ix + 1] = 0.78 + 0.26 * kk + white * 0.32;
             cArr[ix + 2] = 0.88 + 0.16 * kk + white * 0.25;
        }
        oPos.needsUpdate = true;
        colAttr.needsUpdate = true;
        // No computeVertexNormals: with flatShading the face normals are
        // derived in the fragment shader, the normal attribute is never read

        const material = oceanMeshRef.current.material as THREE.MeshStandardMaterial;
        if (weather === 'rainy') {
            material.opacity = 0.9;
        } else {
            material.opacity = 0.8;
        }
    }
  });

  // Determine properties based on biome and season
  const isFrozen = biome === 'tundra' || season === 'winter';
  const isVolcanic = biome === 'volcanic';

  // Cloud-sea look: the island floats on a sea of clouds. Near-white base,
  // fully diffuse, fog-colored glow so the far field melts into the sky.
  let oceanColor = (weather === 'rainy' || weather === 'stormy') ? '#aab8c8' : '#f4f9fd';
  let oceanEmissive = (weather === 'rainy' || weather === 'stormy') ? '#64748b' : '#dbeafe';
  let emissiveInt = 0.3;
  let rough = 1.0;
  let metal = 0.0;
  let oceanOpac = 0.96;

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

  // Emissive only represents scattered daylight, so it follows the sun:
  // full in daytime, ramps at dawn/dusk, zero at night (no self-glow).
  // Lava keeps glowing — that light comes from the lava itself.
  if (!isVolcanic) {
     const daylight = Math.max(0, Math.min(1, (timeOfDay - 5.5) / 1.5)) *
                      Math.max(0, Math.min(1, (18.5 - timeOfDay) / 1.5));
     emissiveInt *= daylight;
  }

  // Targets for smooth color transitions (lerped in the frame loop, so
  // weather/biome changes fade over ~2s instead of snapping)
  oceanTarget.current.color.set(oceanColor);
  oceanTarget.current.emissive.set(oceanEmissive);
  oceanTarget.current.intensity = emissiveInt;

  return (
    <group>
        {/* Global Ocean Base (visual only — no pointer handlers, so the
            event system never raycasts its 97k displaced triangles) */}
        <mesh
          position={[0, -0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={oceanMeshRef}
        >
          <planeGeometry args={[400, 400, 220, 220]} ref={oceanGeomRef as any} />
          <meshPhysicalMaterial
            color="#f4f9fd"
            emissive="#dbeafe"
            emissiveIntensity={0.3}
            transparent
            opacity={oceanOpac}
            roughness={rough}
            metalness={metal}
            clearcoat={0}
            clearcoatRoughness={1}
            vertexColors
            flatShading
          />
        </mesh>

        {/* Invisible flat raycast proxy: receives all ocean pointer events
            on 2 triangles instead of the dense animated mesh */}
        <mesh
          position={[0, -0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={(e) => {
            const state = useGameStore.getState();
            const tool = state.selectedTool;
            const placeableTools = ['platform', 'pier', 'sub_island', 'boat', 'bridge_pillar', 'seagull', 'dolphin', 'fish', 'birdhouse', 'balloon', 'balloon_ladder', 'balloon_bridge'];
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
                  scale: targetScale,
                  customState: tool.startsWith('balloon') ? state.balloonColor : undefined
               });
               AudioSystem.playDig();
            }
          }}
          onPointerMove={(e) => {
             const state = useGameStore.getState();
             const tool = state.selectedTool;
             const placeableTools = ['platform', 'pier', 'sub_island', 'boat', 'bridge_pillar', 'seagull', 'dolphin', 'fish', 'birdhouse', 'balloon', 'balloon_ladder', 'balloon_bridge'];
             
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
          <planeGeometry args={[400, 400, 1, 1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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
