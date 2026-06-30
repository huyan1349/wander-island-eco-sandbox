import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getWaterHeight } from "../../game/water/oceanModel";
import { getTerrainHeight, getTerrainGradient } from "../../utils/terrain";
import { useGameStore } from "../../store";

export function RaftAsset(props: any) {
  const ref = useRef<THREE.Group>(null);
  const posRef = useRef({ x: props.position.x, z: props.position.z });
  const velRef = useRef({ x: 0, z: 0 }); // Track velocity
  const timeOffset = useMemo(() => Math.random() * 100, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const dt = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime + timeOffset;
    const weather = useGameStore.getState().weather;

    const isOcean = props.position.y < -0.1;

    let forceX = 0;
    let forceZ = 0;

    if (!isOcean) {
      // 1. Gravity pulling it into the deepest part of the river / downstream
      const grad = getTerrainGradient(posRef.current.x, posRef.current.z);
      forceX = -grad.dx * 15.0; // Strong pull towards deeper water (center of channel)
      forceZ = -grad.dz * 15.0;

      // 2. Gentle wind/random drift
      forceX += Math.sin(time * 0.7) * 0.5;
      forceZ += Math.cos(time * 0.5) * 0.5;
    } else {
      // Ocean drift
      forceX = Math.sin(time * 0.5) * 2.0;
      forceZ = Math.cos(time * 0.4) * 2.0;
    }

    // 3. Tether force (restrict movement range to ~3 units around spawn)
    const toCenterX = props.position.x - posRef.current.x;
    const toCenterZ = props.position.z - posRef.current.z;
    const dist = Math.hypot(toCenterX, toCenterZ);
    if (dist > 3.0) {
       forceX += (toCenterX / dist) * (dist - 3.0) * 3.0;
       forceZ += (toCenterZ / dist) * (dist - 3.0) * 3.0;
    }

    velRef.current.x += forceX * dt;
    velRef.current.z += forceZ * dt;

    // Water Friction
    velRef.current.x *= Math.pow(0.2, dt);
    velRef.current.z *= Math.pow(0.2, dt);

    // Propose new position
    let nextX = posRef.current.x + velRef.current.x * dt;
    let nextZ = posRef.current.z + velRef.current.z * dt;

    const riverSurfaceH = props.position.y + 0.5; // Water surface is ~0.5 above the clicked river bed

    // Shore collision check (bounce back if too shallow)
    const surfaceH = isOcean ? getWaterHeight(nextX, nextZ, time, weather) : riverSurfaceH;
    const tH = getTerrainHeight(nextX, nextZ);

    if (surfaceH - tH < 0.2) {
        // Reverse velocity (bounce)
        velRef.current.x *= -0.5;
        velRef.current.z *= -0.5;

        // Minor nudge back towards spawn to unstick it completely
        if (dist > 0.5) {
          velRef.current.x += (toCenterX / dist) * 2.0;
          velRef.current.z += (toCenterZ / dist) * 2.0;
        }
    } else {
        // Safe to move
        posRef.current.x = nextX;
        posRef.current.z = nextZ;
    }

    const px = posRef.current.x;
    const pz = posRef.current.z;
    ref.current.position.x = px;
    ref.current.position.z = pz;

    const finalSurfaceH = isOcean ? getWaterHeight(px, pz, time, weather) : riverSurfaceH;
    ref.current.position.y = finalSurfaceH + 0.05 + (isOcean ? 0 : Math.sin(time * 2.0) * 0.02);

    if (isOcean) {
      const d = 1.0;
      const hX = getWaterHeight(px + d, pz, time, weather);
      const hZ = getWaterHeight(px, pz + d, time, weather);

      const targetRotX = Math.atan2(hZ - finalSurfaceH, d) * 0.7;
      const targetRotZ = -Math.atan2(hX - finalSurfaceH, d) * 0.7;

      ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * 0.1;
      ref.current.rotation.z += (targetRotZ - ref.current.rotation.z) * 0.1;
    } else {
      // Gentle bobbing rotation for calm rivers/lakes
      ref.current.rotation.x += (Math.sin(time * 1.5) * 0.02 - ref.current.rotation.x) * 0.1;
      ref.current.rotation.z += (Math.cos(time * 1.3) * 0.02 - ref.current.rotation.z) * 0.1;
    }

    // Slow spin driven by lateral movement to look natural
    const spinForce = velRef.current.x * 0.1 - velRef.current.z * 0.1;
    ref.current.rotation.y += spinForce * dt;
  });

  return (
    <group ref={ref as any} position={[props.position.x, props.position.y, props.position.z]} scale={[0.66, 0.66, 0.66]}>
      {/* Raft base logs */}
      {[-0.4, 0, 0.4].map((xOffset, i) => (
        <mesh key={`log-${i}`} position={[xOffset, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.15, 2.0, 8]} />
          <meshStandardMaterial color="#6b4c3a" roughness={0.9} />
        </mesh>
      ))}

      {/* Cross planks */}
      {[-0.6, 0.6].map((zOffset, i) => (
        <mesh key={`plank-${i}`} position={[0, 0.15, zOffset]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.08, 0.2]} />
          <meshStandardMaterial color="#8c6a51" roughness={0.8} />
        </mesh>
      ))}

      {/* Lantern pole */}
      <mesh position={[-0.4, 0.5, 0.6]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.0, 4]} />
        <meshStandardMaterial color="#4a3525" />
      </mesh>

      {/* Lantern */}
      <mesh position={[-0.4, 1.0, 0.6]} castShadow>
        <boxGeometry args={[0.2, 0.25, 0.2]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={0.8} />
      </mesh>

      <pointLight position={[-0.4, 1.0, 0.6]} color="#ffa32a" distance={10} intensity={2.0} />
    </group>
  );
}
