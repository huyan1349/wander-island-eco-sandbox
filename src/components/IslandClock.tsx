import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { PomodoroTimer } from './PomodoroTimer';

// 岛上 3D 番茄钟：金色小球为拖拽把手，按住拖动可在水平面移动时钟。
// 拖动时复用 isDrawing 标志禁用 OrbitControls，避免镜头跟着转。
export function IslandClock() {
  const ref = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const { camera, raycaster, pointer } = useThree();
  // 固定在 y=3 的水平面上拖动（高度不变）
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -3));

  useFrame(() => {
    if (!dragging.current || !ref.current) return;
    raycaster.setFromCamera(pointer, camera);
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane.current, pt)) {
      ref.current.position.set(pt.x, 3, pt.z);
    }
  });

  useEffect(() => {
    const end = () => {
      if (dragging.current) {
        dragging.current = false;
        useGameStore.getState().setIsDrawing(false);
      }
    };
    window.addEventListener('pointerup', end);
    return () => window.removeEventListener('pointerup', end);
  }, []);

  return (
    <group ref={ref} position={[0, 3, 0]}>
      {/* 拖拽把手 */}
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          dragging.current = true;
          useGameStore.getState().setIsDrawing(true);
        }}
        onPointerOver={() => (document.body.style.cursor = 'grab')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
        position={[0, -1.1, 0]}
      >
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshBasicMaterial color="#fbbf24" toneMapped={false} />
      </mesh>
      <Html transform distanceFactor={10}>
        <PomodoroTimer />
      </Html>
    </group>
  );
}
