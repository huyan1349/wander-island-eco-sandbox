import { createNoise2D } from 'simplex-noise';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import { emitHermitPlace } from '../lib/socket';
import { applyTerrainBrush, paintSurface } from '../utils/terrainBrush';
import { encodePondState } from '../game/water/pondFit';
import { carveRiverAndEncode, shapeWaterfallAndEncode, buildStream } from '../game/water/streamPath';
import { getTerrainHeight, getTerrainGradient } from '../utils/terrain';
import { getFloatingPlatformSnap } from '../utils/platformPlacement';
import {
  BUILD_PREVIEW_TOOLS,
  CONTINUOUS_DRAG_TOOLS,
  FIXED_ROTATION_TOOLS,
  GRAY_BURST_TOOLS,
  GREEN_BURST_TOOLS,
  OBJECT_DRAG_TOOLS,
  PLACEABLE_TOOLS,
  VERTICAL_TOOLS,
} from '../config/toolRules';
import { BuildPreview, ParticleBurst, ShockwaveRing } from './terrain/TerrainEffects';

const noise2D = createNoise2D();


// Generate a static heightmap for the island
const ISAND_SIZE = 40;
const SEGMENTS = 64;

// 河流/瀑布拖绘时的实时预览：读取进行中的折线，按当前点重建一条半透明河带，拖到哪显示到哪。
function RiverPreview({ pointsRef }: { pointsRef: React.MutableRefObject<{ x: number; z: number }[]> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastLen = useRef(-1);
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const st = useGameStore.getState();
    const drawing = st.isDrawing && (st.selectedTool === 'water_flow' || st.selectedTool === 'waterfall');
    const pts = pointsRef.current;
    if (!drawing || pts.length < 2) { mesh.visible = false; lastLen.current = -1; return; }
    if (pts.length !== lastLen.current) {
      lastLen.current = pts.length;
      const build = buildStream(pts, st.selectedTool === 'water_flow' ? 2.4 : 2.0);
      if (build.ribbon) { mesh.geometry.dispose(); mesh.geometry = build.ribbon; }
    }
    mesh.visible = true;
  });
  return (
    <mesh ref={meshRef} visible={false} renderOrder={6}>
      <bufferGeometry />
      <meshBasicMaterial color="#aee6fa" transparent opacity={0.45} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
    </mesh>
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

  const terrainColors = useMemo(() => ({
    healthyGrass: new THREE.Color(baseGrass),
    deadGrass: new THREE.Color(baseDeadGrass),
    sandColor: new THREE.Color(baseSand),
    stoneColor: new THREE.Color(baseStone),
    pathColor: new THREE.Color('#adb5bd'),
    paintedStone: new THREE.Color('#6c757d'),
    paintedSnow: new THREE.Color('#f8f9fa'),
    flowerPink: new THREE.Color('#e879f9'),
    flowerYellow: new THREE.Color('#fbbf24'),
    snowBlend: new THREE.Color('#ffffff'),
    rainyGrassTint: new THREE.Color(biome === 'volcanic' ? '#000000' : '#344e41'),
  }), [baseGrass, baseDeadGrass, baseSand, baseStone, biome]);

  const SLOPE_THRESHOLD = 1.2; // 高度差阈值，超过此值视为陡坡

  const refreshTerrainColors = useCallback(() => {
     if (!meshRef.current) return;
     const geometry = meshRef.current.geometry;
     if (!geometry.attributes.color) return;
     const colorAttr = geometry.attributes.color as THREE.BufferAttribute;
     const posAttr = geometry.attributes.position as THREE.BufferAttribute;

     const springs: { x: number; z: number }[] = [];
     for (let j = 0; j < assets.length; j++) {
         if (assets[j].type === 'spring') {
             springs.push({ x: assets[j].position.x, z: assets[j].position.z });
         }
     }

     const targetColor = new THREE.Color();
     const hsl = { h: 0, s: 0, l: 0 };
     let needsUpdate = false;

     // Process 3 vertices (1 face) at a time to ensure solid colors per face.
     for (let i = 0; i < types.length; i += 3) {
        const h1 = posAttr.getY(i);
        const h2 = posAttr.getY(i + 1);
        const h3 = posAttr.getY(i + 2);
        const faceHeight = (h1 + h2 + h3) / 3;

        // ── 手动材质笔刷覆盖（types: 0=草 1=路 2=沙 3=石 4=雪 5=花草）──
        const faceType = types[i]; // 3 顶点同类型（paintSurface 保证）

        if (faceType === 1) {
             targetColor.copy(terrainColors.pathColor);
        } else if (faceType === 2) {
             targetColor.copy(terrainColors.sandColor);  // 沙滩
        } else if (faceType === 3) {
             targetColor.copy(terrainColors.paintedStone); // 石滩
        } else if (faceType === 4) {
             targetColor.copy(terrainColors.paintedSnow); // 雪地
        } else if (faceType === 5) {
             // 花草：草地底色 + 粉紫点缀
             targetColor.copy(terrainColors.healthyGrass);
             if (i % 9 < 3) targetColor.lerp(terrainColors.flowerPink, 0.4); // 粉花
             else if (i % 9 < 5) targetColor.lerp(terrainColors.flowerYellow, 0.3); // 黄花
        } else {
             if (faceHeight < 1.0) {
                 targetColor.copy(terrainColors.sandColor);
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

                 targetColor.copy(terrainColors.deadGrass).lerp(terrainColors.healthyGrass, localGrassHealth);
                 if (weather === 'snowy' || season === 'winter' || biome === 'tundra') {
                     // Add more white for snow
                     targetColor.lerp(terrainColors.snowBlend, 0.8);
                 } else if (weather === 'rainy' && biome === 'forest') {
                     targetColor.lerp(terrainColors.rainyGrassTint, 0.4);
                 }
             } else {
                 // High mountain peaks
                 if (biome === 'volcanic') {
                     targetColor.copy(terrainColors.stoneColor); // Just rock for volcano
                 } else if (faceHeight < 6.5) {
                     targetColor.copy(terrainColors.stoneColor);
                     if (weather === 'snowy' || season === 'winter' || biome === 'tundra') {
                         targetColor.lerp(terrainColors.snowBlend, 0.6);
                     }
                 } else {
                     // Snow peaks
                     targetColor.copy(terrainColors.paintedSnow);
                 }
             }

             const variation = (i % 5 === 0) ? 0.02 : (i % 3 === 0) ? -0.02 : 0;
             if (variation !== 0) {
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
  }, [terrainData, grassHealth, weather, season, biome, assets, terrainColors, types]);

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
    if (isDragEvent && !CONTINUOUS_DRAG_TOOLS.has(selectedTool)) {
        return;
    }

    if (isDragEvent) {
        const isWater = selectedTool === 'pond' || selectedTool === 'spring';
        const isObjectPlacement = OBJECT_DRAG_TOOLS.has(selectedTool);
        const minDistance = isWater ? 1.2 : isObjectPlacement ? 1.5 : 0.2;
        
        // Ensure distance before applying brush again
        if (point.distanceTo(lastBrushPoint.current) < minDistance) return;
        
        lastBrushTime.current = Date.now();
        lastBrushPoint.current.copy(point);
    }

    // Add interaction burst, less often if dragging
    if (!isDragEvent || Math.random() < 0.2) {
      let color = "#ffffff";
      if (GREEN_BURST_TOOLS.has(selectedTool)) color = "#4ade80";
      if (GRAY_BURST_TOOLS.has(selectedTool)) color = "#d1d5db";
      if (selectedTool === 'spring') color = "#3b82f6";
      if (['deer', 'wolf'].includes(selectedTool)) color = "#fbbf24";
      if (selectedTool === 'eraser') color = "#ef4444";
      setClicks(prev => [...prev.slice(-9), { id: Date.now() + Math.random(), pos: point.clone(), color }]);
      
      if (!isDragEvent || Math.random() < 0.1) {
          if (GRAY_BURST_TOOLS.has(selectedTool)) {
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
    if (!isDragEvent && PLACEABLE_TOOLS.has(selectedTool)) {
        
        let rx = 0, rz = 0;
        if (e && e.face && e.face.normal && !VERTICAL_TOOLS.has(selectedTool)) {
            const normal = e.face.normal.clone();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
            const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
            rx = euler.x;
            rz = euler.z;
        }

        let targetScale = 0.8 + Math.random() * 0.4;
        let targetRotY = Math.random() * Math.PI * 2;
        
        if (FIXED_ROTATION_TOOLS.has(selectedTool)) {
            targetScale = 1.0;
            targetRotY = 0;
        } else if (selectedTool === 'platform' || selectedTool === 'pier') {
            targetScale = 1.0;
            targetRotY = 0;
            // Snap logic on terrain for platform? Better to keep it consistent
            const rawPoint = { x: point.x, y: point.y, z: point.z };
            point.x = Math.round(point.x / 3) * 3;
            point.z = Math.round(point.z / 3) * 3;
            if (selectedTool === 'platform') {
                const snap = getFloatingPlatformSnap(rawPoint, useGameStore.getState().assets);
                point.x = snap.position.x;
                point.z = snap.position.z;
            }
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

    // 河流 / 瀑布：落笔开始记录折线，不走笔刷。
    if (selectedTool === 'water_flow' || selectedTool === 'waterfall') {
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

       // 河流 / 瀑布：松手把折线提交为对应物件。
       if (selectedTool === 'water_flow' || selectedTool === 'waterfall') {
          const tool = selectedTool;
          let pts = streamPoints.current;
          // 单击（没拖出折线）：按坡度合成一段「顺坡而下」的短折线。
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
             // 河流：挖河床的流动河面；瀑布：连线两端，系统自动整形地形（崖+潭）再挂水帘
             const placed = {
                type: tool as any,
                position: { x: cx, y: 0, z: cz },
                rotation: { x: 0, y: 0, z: 0 },
                scale: 1,
                customState: tool === 'water_flow'
                  ? carveRiverAndEncode(pts, 2.4)
                  : shapeWaterfallAndEncode(pts[0], pts[pts.length - 1], 2.4),
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
    const isBuildPreviewTool = BUILD_PREVIEW_TOOLS.has(selectedTool);
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
        if (selectedTool === 'water_flow' || selectedTool === 'waterfall') {
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

      {/* 河流/瀑布拖绘实时预览：拖到哪显示到哪 */}
      <RiverPreview pointsRef={streamPoints} />

      <ShockwaveRing />

      {/* Particle Bursts */}
      {clicks.map(c => <ParticleBurst key={c.id} position={c.pos} color={c.color} />)}
      
      {/* High-End Build Previews */}
      <BuildPreview cursorWorldPos={cursorWorldPos} cursorActive={cursorActive} />
    </>
  );
}
