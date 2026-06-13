import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { PomodoroTimer } from './PomodoroTimer';

// 岛上 3D 番茄钟：鼠标移到整块面板上即可拖动。
// 拖动时对场景做射线检测，落点高度自动贴合地形/物体表面（往高处拖会升高）。
export function IslandClock() {
  const ref = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current || !ref.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);
      const hits = raycaster.current.intersectObjects(scene.children, true);
      // 取第一个不属于时钟自身的命中点，贴合该表面
      const hit = hits.find((h) => {
        let o: THREE.Object3D | null = h.object;
        while (o) { if (o === ref.current) return false; o = o.parent; }
        return true;
      });
      if (hit) {
        ref.current.position.set(hit.point.x, hit.point.y + 1.5, hit.point.z);
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
  }, [camera, gl, scene]);

  return (
    <group ref={ref} position={[0, 4, 0]}>
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
