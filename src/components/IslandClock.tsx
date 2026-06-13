import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { PomodoroTimer } from './PomodoroTimer';

// 岛上 3D 番茄钟：鼠标移到整块面板上即可拖动（无需小把手）。
// 拖动时把屏幕坐标投影到 y=3 水平面，移动整组；并禁用 OrbitControls。
export function IslandClock() {
  const ref = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -3));

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current || !ref.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);
      const pt = new THREE.Vector3();
      if (raycaster.current.ray.intersectPlane(plane.current, pt)) {
        ref.current.position.set(pt.x, 3, pt.z);
      }
    };
    const up = () => {
      if (dragging.current) {
        dragging.current = false;
        useGameStore.getState().setIsDrawing(false);
        document.body.style.cursor = 'auto';
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [camera, gl]);

  return (
    <group ref={ref} position={[0, 3, 0]}>
      <Html transform distanceFactor={10}>
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            dragging.current = true;
            useGameStore.getState().setIsDrawing(true);
            document.body.style.cursor = 'grabbing';
          }}
          onPointerOver={() => { if (!dragging.current) document.body.style.cursor = 'grab'; }}
          onPointerOut={() => { if (!dragging.current) document.body.style.cursor = 'auto'; }}
          style={{ cursor: 'grab', padding: '12px' }}
        >
          <PomodoroTimer />
        </div>
      </Html>
    </group>
  );
}
