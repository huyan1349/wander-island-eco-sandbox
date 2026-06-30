import * as THREE from 'three';
import { usePopIn } from './shared';

export function Tent(props: any) {
  const ref = usePopIn(props.scale || 1);

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
      {/* Front Wooden Frame */}
      <mesh position={[0, 0.9, 1.0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      <mesh position={[0, 0.9, 1.0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>

      {/* Back Wooden Frame */}
      <mesh position={[0, 0.9, -1.0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      <mesh position={[0, 0.9, -1.0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>

      {/* Top Ridge Pole (Crossbar) */}
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#451a03" roughness={0.8} flatShading />
      </mesh>

      {/* Canvas Main - Left side */}
      <mesh position={[-0.6, 0.9, 0]} rotation={[0, 0, Math.PI / 6]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 2.1, 2.1]} />
        <meshStandardMaterial color="#fef3c7" roughness={1} flatShading />
      </mesh>
      {/* Canvas Main - Right side */}
      <mesh position={[0.6, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 2.1, 2.1]} />
        <meshStandardMaterial color="#fef3c7" roughness={1} flatShading />
      </mesh>

      {/* Ropes and Pegs */}
      {[-1, 1].map((sideX) =>
        [-1, 1].map((sideZ) => (
          <group key={`${sideX}-${sideZ}`}>
            <mesh position={[sideX * 0.9, 0.4, sideZ * 1.0]} rotation={[0, 0, sideX * -Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 1.2, 4]} />
              <meshStandardMaterial color="#e5e5e5" roughness={1} flatShading />
            </mesh>
            <mesh position={[sideX * 1.3, 0.05, sideZ * 1.0]} rotation={[sideZ * 0.2, 0, sideX * -Math.PI / 6]} castShadow>
              <cylinderGeometry args={[0.03, 0.01, 0.2, 4]} />
              <meshStandardMaterial color="#52525b" roughness={0.7} flatShading />
            </mesh>
          </group>
        ))
      )}

      {/* Back flap */}
      <mesh position={[0, 0.7, -0.95]} rotation={[Math.PI / 10, 0, 0]} castShadow>
        <planeGeometry args={[1.5, 1.7]} />
        <meshStandardMaterial color="#fde68a" roughness={1} side={THREE.DoubleSide} flatShading />
      </mesh>

      {/* Floor blanket */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.7, 2.0]} />
        <meshStandardMaterial color="#92400e" roughness={1} flatShading />
      </mesh>

      {/* Lantern */}
      <group position={[0, 0.8, 0.8]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.2, 4]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.15, 6]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} flatShading />
        </mesh>
        <pointLight color="#fde047" distance={3} intensity={0.8} />
      </group>

      {/* Inside Details */}
      <mesh position={[-0.3, 0.15, -0.4]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <boxGeometry args={[0.6, 0.25, 0.4]} />
        <meshStandardMaterial color="#e2e8f0" flatShading />
      </mesh>
    </group>
  );
}

export function Fence(props: any) {
  const ref = usePopIn(props.scale || 1);
  // Add some slight randomized variation based on position to look hand-made
  const seed = props.position.x * 13.1 + props.position.z * 7.9;
  const r1 = Math.sin(seed) * 0.05;
  const r2 = Math.cos(seed) * 0.05;

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
      {/* Posts */}
      <mesh position={[-0.8, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 5]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.8, 0.6, 0]} rotation={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 5]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} flatShading />
      </mesh>

      {/* Planks */}
      <mesh position={[0, 0.8, 0.1]} rotation={[0, 0, r1]} castShadow>
        <boxGeometry args={[2.0, 0.15, 0.05]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.4, -0.1]} rotation={[0, 0, r2]} castShadow>
        <boxGeometry args={[2.0, 0.15, 0.05]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

export function Well(props: any) {
  const ref = usePopIn(props.scale || 1);

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
      {/* Stone Base Ring */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.8, 12]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} flatShading />
      </mesh>
      {/* Inner Hole */}
      <mesh position={[0, 0.41, 0]} receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.81, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={1} flatShading />
      </mesh>
      {/* Water inside */}
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 12]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.8} flatShading />
      </mesh>

      {/* Pillars */}
      <mesh position={[-0.65, 1.2, 0]} castShadow>
        <boxGeometry args={[0.15, 2.4, 0.15]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      <mesh position={[0.65, 1.2, 0]} castShadow>
        <boxGeometry args={[0.15, 2.4, 0.15]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>

      {/* Roof crossbeam */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[1.6, 0.1, 0.1]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      {/* Roof */}
      <mesh position={[-0.4, 2.4, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <boxGeometry args={[1.2, 0.1, 1.5]} />
        <meshStandardMaterial color="#991b1b" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.4, 2.4, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <boxGeometry args={[1.2, 0.1, 1.5]} />
        <meshStandardMaterial color="#991b1b" roughness={0.9} flatShading />
      </mesh>

      {/* Roller & Rope & Bucket */}
      <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
        <meshStandardMaterial color="#78350f" flatShading />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
        <meshStandardMaterial color="#e2e8f0" flatShading />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.3, 8]} />
        <meshStandardMaterial color="#b45309" flatShading />
      </mesh>
    </group>
  );
}
