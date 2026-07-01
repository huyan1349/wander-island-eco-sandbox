import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { generateSubIslandTerrain, normalizeSubIslandTerrainData } from '../../game/terrain/subIslandTerrain';
import { carvePondAndEncode } from '../../game/water/pondFit';
import { AudioSystem } from '../../lib/audio';
import { useGameStore } from '../../store';
import { getTerrainHeight } from '../../utils/terrain';
import { applyTerrainBrush, paintSurface } from '../../utils/terrainBrush';
import { ParticleBurst } from '../effects/ParticleBurst';
import { usePopIn } from './shared';

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
  const flattenTargetY = useRef(0);

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
      if (selectedTool === 'spring' || selectedTool === 'pond') color = "#3b82f6";
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
      if (!meshRef.current) return;
      const geometry = meshRef.current.geometry;
      const posAttr = geometry.attributes.position;
      const { brushSize, brushStrength, brushFalloff } = useGameStore.getState();
      const paintChanged = paintSurface(typesRef.current, posAttr.array as Float32Array, {
        mode: 'paint', size: 1.5, strength: brushStrength, falloff: brushFalloff,
        isDrag: isDragEvent, px: localPoint.x, pz: localPoint.z, paintType: 1, // 1 = 小路
      });
      if (paintChanged) {
        refreshColors();
        if (!isDragEvent) persistTerrain();
      }
      return;
    }

    // ── 地形笔刷（隆起/挖低/找平/柔化/材质）──
    if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {
      const { brushMode, brushSize, brushStrength, brushFalloff, brushPaintType } = useGameStore.getState();
      if (!isDragEvent) flattenTargetY.current = localPoint.y;

      if (brushMode === 'paint') {
        // 材质笔刷：改 types 数组，不改高度
        const paintChanged = paintSurface(typesRef.current, posAttr.array as Float32Array, {
          mode: 'paint', size: brushSize, strength: brushStrength, falloff: brushFalloff,
          isDrag: isDragEvent, px: localPoint.x, pz: localPoint.z, paintType: brushPaintType,
        });
        if (paintChanged) {
          refreshColors();
          positionsRef.current = new Float32Array(posAttr.array);
          if (!isDragEvent) persistTerrain();
        }
      } else {
        // 高度笔刷：改 positions 数组（隆起/挖低/找平/柔化）
        const changed = applyTerrainBrush(posAttr.array as Float32Array, {
          mode: brushMode, size: brushSize, strength: brushStrength, falloff: brushFalloff,
          isDrag: isDragEvent, px: localPoint.x, pz: localPoint.z, targetY: flattenTargetY.current,
        });
        if (changed) {
          posAttr.needsUpdate = true;
          geometry.computeVertexNormals();
          refreshColors(); // 坡度自动贴材质
          positionsRef.current = new Float32Array(posAttr.array);
          if (!isDragEvent) persistTerrain();
        }
      }
      return;
    }

    if (selectedTool === 'eraser') {
      useGameStore.getState().setSelectedEntityId(null);
      return;
    }

    const landPlaceableTools = ['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'rock', 'deer', 'wolf', 'spring', 'pond', 'streetlamp', 'lantern_girl', 'house', 'windmill', 'lighthouse', 'balloon', 'balloon_ladder', 'balloon_bridge', 'bridge_pillar', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel'];
    if (!isDragEvent && landPlaceableTools.includes(selectedTool)) {
      // Ponds may sit in dug-out valleys below sea level; everything else
      // must rest on land.
      if (placementY <= -0.5 && selectedTool !== 'pond') return;

      let rx = 0;
      let rz = 0;
      const verticalTools = ['house', 'windmill', 'lighthouse', 'streetlamp', 'lantern_girl', 'sub_island', 'treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'bush', 'balloon', 'balloon_ladder', 'balloon_bridge', 'bridge_pillar', 'tent', 'campfire', 'fence', 'well', 'bench', 'hoe', 'seed_wheat', 'seed_carrot', 'spirit_tree', 'observatory', 'ruins_arch', 'waterwheel', 'pond', 'spring'];
      if (event && event.face && event.face.normal && !verticalTools.includes(selectedTool)) {
        const normal = event.face.normal.clone();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
        rx = euler.x;
        rz = euler.z;
      }

      const isPillar = selectedTool === 'bridge_pillar';

      if (selectedTool === 'pond') {
        const centerH = getTerrainHeight(worldPoint.x, worldPoint.z);
        const changed = applyTerrainBrush(posAttr.array as Float32Array, {
          mode: 'flatten', targetY: placementY - 0.7, size: 8.5, strength: 1.0, falloff: 'flat_center',
          isDrag: false, px: localPoint.x, pz: localPoint.z
        });
        if (changed) {
          posAttr.needsUpdate = true;
          geometry.computeVertexNormals();
          refreshColors();
          positionsRef.current = new Float32Array(posAttr.array);
          persistTerrain();
        }
      }

      if (selectedTool === 'spring') {
        const changed = applyTerrainBrush(posAttr.array as Float32Array, {
          mode: 'flatten', targetY: placementY, size: 4.0, strength: 1.0, falloff: 'flat_center',
          isDrag: false, px: localPoint.x, pz: localPoint.z
        });
        if (changed) {
          posAttr.needsUpdate = true;
          geometry.computeVertexNormals();
          refreshColors();
          positionsRef.current = new Float32Array(posAttr.array);
          persistTerrain();
        }
      }

      // 池塘：挖浅碗 + 贴地拟合，如果放在 SubIsland 上则通过 skipBrush 仅计算不改主岛
      const placedCustom = selectedTool === 'pond'
        ? carvePondAndEncode(worldPoint.x, worldPoint.z, true)
        : (String(selectedTool).startsWith('balloon') ? useGameStore.getState().balloonColor : undefined);
      addAsset({
        type: selectedTool as any,
        position: { x: worldPoint.x, y: placementY, z: worldPoint.z },
        rotation: { x: rx, y: isPillar ? 0 : Math.random() * Math.PI * 2, z: rz },
        scale: isPillar ? 1.0 : 0.8 + Math.random() * 0.4,
        customState: placedCustom
      });
    }
  };

  const onPointerDown = (e: any) => {
    if (selectedTool === 'none') return;
    e.stopPropagation();
    if (e.button !== 0) return;
    if (selectedTool === 'eraser') {
      useGameStore.getState().setSelectedEntityId(null);
      return;
    }
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
      if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') cursorScale = useGameStore.getState().brushSize;
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
