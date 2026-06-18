import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ParticleBurst({ position, color }: { position: THREE.Vector3; color: string }) {
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
      scale: Math.random() * 0.4 + 0.1,
    }));
  }, [position]);

  const age = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    age.current += delta;

    particles.forEach((p, i) => {
      p.vy -= delta * 0.5;
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
