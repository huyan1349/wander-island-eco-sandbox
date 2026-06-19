import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store';

export function SmokeParticles({ position }: { position: [number, number, number] }) {
  const count = 10;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      offset: Math.random() * 100,
      speed: 0.5 + Math.random() * 0.5,
      xOffset: (Math.random() - 0.5) * 0.2,
      zOffset: (Math.random() - 0.5) * 0.2,
      scale: 0.5 + Math.random() * 0.5,
    }));
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      const t = clock.elapsedTime * p.speed + p.offset;
      const y = t % 3;
      const progress = y / 3;
      dummy.position.set(
        position[0] + p.xOffset + Math.sin(t) * progress * 0.5,
        position[1] + y,
        position[2] + p.zOffset + Math.cos(t * 0.8) * progress * 0.5,
      );
      const s = p.scale * (1 - progress);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial color="#94a3b8" transparent opacity={0.4} />
    </instancedMesh>
  );
}

export function SparkParticles({ position }: { position: [number, number, number] }) {
  const count = 8;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const sparks = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      vx: (Math.random() - 0.5) * 0.8,
      vy: 2 + Math.random() * 1,
      vz: (Math.random() - 0.5) * 0.8,
      life: Math.random(),
      maxLife: 0.8 + Math.random() * 0.4,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const s = sparks[i];
      s.life += delta;
      if (s.life >= s.maxLife) {
        s.life = 0;
        s.vx = (Math.random() - 0.5) * 0.8;
        s.vy = 2 + Math.random() * 1;
        s.vz = (Math.random() - 0.5) * 0.8;
        s.maxLife = 0.8 + Math.random() * 0.4;
      }
      const progress = s.life / s.maxLife;
      const x = position[0] + s.vx * s.life;
      const y = position[1] + s.vy * s.life - 2 * s.life * s.life;
      const z = position[2] + s.vz * s.life;
      const scale = 0.03 * (1 - progress);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(Math.max(0.001, scale));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2} transparent opacity={0.9} />
    </instancedMesh>
  );
}

function VFXInstance({ vfx }: { vfx: any }) {
  const removeVFX = useGameStore(state => state.removeVFX);
  const ref = useRef<THREE.Group>(null);
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      arr.push({
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: (vfx.type === 'splash' ? 3 : 1) + Math.random() * 3,
        vz: Math.sin(angle) * (2 + Math.random() * 3),
      });
    }
    return arr;
  }, [vfx.type]);

  useEffect(() => {
    const timeout = setTimeout(() => removeVFX(vfx.id), 1000);
    return () => clearTimeout(timeout);
  }, [vfx.id, removeVFX]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.children.forEach((mesh, i) => {
      const p = particles[i];
      mesh.position.x += p.vx * delta;
      mesh.position.y += p.vy * delta;
      mesh.position.z += p.vz * delta;
      p.vy -= 10 * delta;
      mesh.scale.multiplyScalar(0.9);
    });
  });

  let color = '#cbd5e1';
  if (vfx.type === 'splash') color = '#ffffff';
  if (vfx.type === 'blood') color = '#b91c1c';

  return (
    <group ref={ref} position={[vfx.position.x, vfx.position.y + 0.5, vfx.position.z]}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

export function VFXSystem() {
  const vfxQueue = useGameStore(state => state.vfxQueue);
  return (
    <group>
      {vfxQueue.map(vfx => <VFXInstance key={vfx.id} vfx={vfx} />)}
    </group>
  );
}
