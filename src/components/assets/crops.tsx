import * as THREE from 'three';
import { getCropGrowthProgress } from '../../game/crops';
import { useGameStore } from '../../store';
import { usePopIn } from './shared';

export function Farmland({ position, scale = 1 }: any) {
  const ref = usePopIn(scale);
  return (
    <group position={[position.x, position.y, position.z]} scale={scale} ref={ref}>
      <mesh receiveShadow position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial color="#3f2716" roughness={1} flatShading />
      </mesh>

      <mesh receiveShadow position={[0, 0.08, 0]} rotation={[-Math.PI / 2 + 0.05, 0, 0]}>
        <planeGeometry args={[2.3, 2.3]} />
        <meshStandardMaterial color="#4a3018" roughness={1} flatShading />
      </mesh>

      {[...Array(4)].map((_, i) => (
        <group key={i} position={[0, 0.12, -0.9 + i * 0.6]}>
          <mesh rotation={[-Math.PI / 2, Math.random() * 0.05, 0]} receiveShadow>
            <planeGeometry args={[2.3, 0.15]} />
            <meshStandardMaterial color="#2a1b0f" roughness={1} flatShading />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, Math.random() * 0.05, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 2.2, 4]} />
            <meshStandardMaterial color="#352112" roughness={1} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Crop({ position, scale = 1, type, growthProgress = 0, plantedAt }: any) {
  const isWheat = type === 'crop_wheat';
  const playtime = useGameStore(state => state.stats.playtime);
  const localProgress = getCropGrowthProgress({ growthProgress, plantedAt }, playtime);

  let visualScale: number;
  let color: string;

  if (localProgress < 0.3) {
    visualScale = 0.3;
    color = '#4ade80';
  } else if (localProgress < 0.7) {
    visualScale = 0.6;
    color = '#22c55e';
  } else {
    visualScale = 1.0;
    color = isWheat ? '#eab308' : '#22c55e';
  }

  const height = isWheat ? 1.5 : 0.6;
  const currentHeight = Math.max(0.1, height * visualScale);
  const isGrown = localProgress >= 0.7;

  return (
    <group position={[position.x, position.y, position.z]} scale={scale}>
      <group position={[0, currentHeight / 2, 0]}>
        {[...Array(3)].map((_, i) => (
          <group key={i} position={[(i - 1) * 0.4, 0, i % 2 === 0 ? 0.2 : -0.2]}>
            <mesh rotation={[0, Math.PI / 4 + Math.random() * 0.2, 0]} castShadow>
              <planeGeometry args={[0.3, currentHeight]} />
              <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} transparent opacity={0.9} flatShading />
            </mesh>
            <mesh rotation={[0, -Math.PI / 4 + Math.random() * 0.2, 0]} castShadow>
              <planeGeometry args={[0.3, currentHeight]} />
              <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} transparent opacity={0.9} flatShading />
            </mesh>

            {!isWheat && isGrown && (
              <mesh position={[0, -currentHeight / 2 + 0.15, 0]} castShadow>
                <coneGeometry args={[0.15, 0.4, 4]} />
                <meshStandardMaterial color="#f97316" roughness={0.7} flatShading />
              </mesh>
            )}

            {isWheat && isGrown && (
              <mesh position={[0, currentHeight / 2 - 0.1, 0]} castShadow>
                <octahedronGeometry args={[0.18, 0]} />
                <meshStandardMaterial color="#fbbf24" roughness={0.6} flatShading />
              </mesh>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
