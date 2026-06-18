import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store';
import { BUILD_PREVIEW_TOOLS } from '../../config/toolRules';
import { ParticleBurst } from '../effects/ParticleBurst';

export { ParticleBurst };

export function ShockwaveRing() {
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
      if (synergy.type === 'spring') setColor('#4ade80');
      else if (synergy.type === 'windmill') setColor('#93c5fd');
      else setColor('#fcd34d');
    }
  }, [synergy]);

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return;
    if (activeId !== null) {
      scaleRef.current += delta * 15;
      meshRef.current.scale.setScalar(scaleRef.current);
      matRef.current.opacity = Math.max(0, 1 - scaleRef.current / 12);
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

export function BuildPreview({
  cursorWorldPos,
  cursorActive,
}: {
  cursorWorldPos: React.MutableRefObject<THREE.Vector3>;
  cursorActive: React.MutableRefObject<boolean>;
}) {
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
  const dotsCount = 25;
  const dotsRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const p1Ref = useRef(new THREE.Vector3());
  const p2Ref = useRef(new THREE.Vector3());
  const centerRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    if (!ghostGroup.current || !bridgeGroup.current || !dotsRef.current || !matRef.current) return;

    if (!cursorActive.current || !BUILD_PREVIEW_TOOLS.has(selectedTool)) {
      ghostGroup.current.visible = false;
      bridgeGroup.current.visible = false;
      dotsRef.current.visible = false;
      return;
    }

    const point = cursorWorldPos.current;
    const time = state.clock.elapsedTime;

    if (selectedTool === 'platform' || selectedTool === 'pier' || selectedTool === 'sub_island') {
      bridgeGroup.current.visible = false;
      dotsRef.current.visible = false;
      ghostGroup.current.visible = true;

      ghostGroup.current.position.set(point.x, Math.max(point.y, 0), point.z);
      ghostGroup.current.position.y += Math.sin(time * 4) * 0.05;

      let isValid = false;
      if (selectedTool === 'sub_island') {
        isValid = true;
      } else {
        if (point.y > -0.6) isValid = true;
        if (!isValid) {
          for (const anchor of buildAnchors) {
            const dx = anchor.x - point.x;
            const dz = anchor.z - point.z;
            if (dx * dx + dz * dz < 4.5 * 4.5) {
              isValid = true;
              break;
            }
          }
        }
      }

      matRef.current.color.setHex(isValid ? 0x4ade80 : 0xef4444);

      const platformMesh = ghostGroup.current.children[0] as THREE.Mesh;
      const islandMesh = ghostGroup.current.children[1] as THREE.Mesh;
      platformMesh.visible = selectedTool === 'platform' || selectedTool === 'pier';
      islandMesh.visible = selectedTool === 'sub_island';
    }

    if (selectedTool === 'bridge') {
      ghostGroup.current.visible = false;

      let firstAnchor: { x: number; y: number; z: number; distSq: number } | null = null;
      let secondAnchor: { x: number; y: number; z: number; distSq: number } | null = null;
      for (const anchor of buildAnchors) {
        const dx = anchor.x - point.x;
        const dz = anchor.z - point.z;
        const distSq = dx * dx + dz * dz;
        if (distSq >= 12 * 12) continue;

        const candidate = {
          x: anchor.x,
          y: anchor.y,
          z: anchor.z,
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
        dotsRef.current.visible = false;
        bridgeGroup.current.visible = true;

        const p1 = p1Ref.current.set(firstAnchor.x, firstAnchor.y, firstAnchor.z);
        const p2 = p2Ref.current.set(secondAnchor.x, secondAnchor.y, secondAnchor.z);
        const center = centerRef.current.addVectors(p1, p2).multiplyScalar(0.5);
        bridgeGroup.current.position.copy(center);
        bridgeGroup.current.lookAt(p2);
        bridgeGroup.current.scale.set(1, 1, p1.distanceTo(p2));

        const mesh = bridgeGroup.current.children[0] as THREE.Mesh;
        if (mesh.material) (mesh.material as THREE.Material).opacity = 0.5 + Math.sin(time * 6) * 0.2;
      } else if (firstAnchor) {
        bridgeGroup.current.visible = false;
        dotsRef.current.visible = true;

        const p1 = p1Ref.current.set(firstAnchor.x, firstAnchor.y, firstAnchor.z);
        const p2 = p2Ref.current.set(point.x, Math.max(point.y, 0) + 1.0, point.z);

        for (let i = 0; i < dotsCount; i++) {
          const t = i / (dotsCount - 1);
          const offsetT = (t + time * 1.5) % 1.0;
          dummy.position.copy(p1).lerp(p2, offsetT);
          dummy.position.y += Math.sin(offsetT * Math.PI) * 1.5;
          dummy.scale.setScalar(0.6 * (1 - offsetT * 0.5));
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
