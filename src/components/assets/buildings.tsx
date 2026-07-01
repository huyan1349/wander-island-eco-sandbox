import { SpotLight } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AudioSystem } from '../../lib/audio';
import { useGameStore } from '../../store';
import { SmokeParticles } from '../effects/AmbientParticles';
import { HoverButton, useHoverInteraction } from './interactions';
import { useMarinePhysics } from './marine';
import { usePopIn } from './shared';

export function Streetlamp(props: any) {
  const { position, rotation, scale = 1 } = props;
  const groupRef = usePopIn(scale);
  useMarinePhysics(groupRef, props);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const isNight = timeOfDay > 18 || timeOfDay < 6;

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(rotation?.x || 0, rotation?.y || 0, rotation?.z || 0, 'YXZ')} scale={0} ref={groupRef}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.12, 3, 8]} />
        <meshStandardMaterial color="#1e293b" flatShading />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
            color={isNight ? "#fef08a" : "#94a3b8"}
            emissive={isNight ? "#fef08a" : "#000000"}
            emissiveIntensity={isNight ? 4 : 0}
            toneMapped={false}
            flatShading
        />
      </mesh>
      {/* Light housing top */}
      <mesh position={[0, 3.4, 0]} castShadow>
          <coneGeometry args={[0.5, 0.4, 8]} />
          <meshStandardMaterial color="#0f172a" flatShading />
      </mesh>

      {/* Real Illumination Light */}
      {isNight && (
        <pointLight position={[0, 3.1, 0]} intensity={8.0} distance={25} decay={2} color="#fef08a" />
      )}
    </group>
  );
}

// Soft radial glow sprite texture, shared across all lanterns.
let _lanternGlowTex: THREE.CanvasTexture | null = null;
function getLanternGlowTexture() {
  if (_lanternGlowTex) return _lanternGlowTex;
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(160,200,255,0.45)');
  g.addColorStop(1, 'rgba(120,160,220,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _lanternGlowTex = new THREE.CanvasTexture(cv);
  return _lanternGlowTex;
}

// 小岛版提灯少女：原 glb 保留在资源目录，但建造物改为更清晰的程序化摆件。
const LANTERN_SCALE = 1.15;
export function LanternGirl(props: any) {
  const { position, rotation, scale = 1 } = props;
  const groupRef = usePopIn(scale);
  const glowTex = useMemo(() => getLanternGlowTexture(), []);
  const S = LANTERN_SCALE;
  const lanternPos: [number, number, number] = [0.52 * S, 1.18 * S, 0.18 * S];
  const faceLightTarget: [number, number, number] = [0.03 * S, 1.58 * S, 0.02 * S];

  return (
    <group position={[position.x, position.y, position.z]} rotation={new THREE.Euler(rotation?.x || 0, rotation?.y || 0, rotation?.z || 0, 'YXZ')} scale={0} ref={groupRef}>
      <group scale={S}>
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <cylinderGeometry args={[0.42, 0.56, 0.12, 18]} />
          <meshStandardMaterial color="#d7e0e8" roughness={0.86} metalness={0.03} flatShading />
        </mesh>
        <mesh position={[0, 0.52, 0]} rotation={[0.03, 0, -0.04]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.34, 0.82, 10]} />
          <meshStandardMaterial color="#a7b4c1" roughness={0.94} metalness={0.02} flatShading />
        </mesh>
        <mesh position={[0, 1.03, -0.01]} rotation={[0, 0, -0.07]} castShadow receiveShadow>
          <sphereGeometry args={[0.25, 12, 9]} />
          <meshStandardMaterial color="#7d8b9b" roughness={0.94} metalness={0.02} flatShading />
        </mesh>
        <mesh position={[0.02, 1.02, 0.2]} rotation={[0, 0, -0.04]}>
          <sphereGeometry args={[0.155, 10, 6]} />
          <meshStandardMaterial color="#dfeaf4" emissive="#8bbcff" emissiveIntensity={0.25} roughness={0.7} flatShading />
        </mesh>
        <mesh position={[0.02, 1.065, 0.235]} rotation={[0, 0, -0.04]}>
          <boxGeometry args={[0.18, 0.018, 0.018]} />
          <meshBasicMaterial color="#526273" />
        </mesh>
        <mesh position={[-0.12, 0.78, 0.02]} rotation={[0.08, 0, 0.3]} castShadow receiveShadow>
          <capsuleGeometry args={[0.045, 0.35, 3, 8]} />
          <meshStandardMaterial color="#9aa9b8" roughness={0.92} flatShading />
        </mesh>
        <mesh position={[0.24, 0.8, 0.02]} rotation={[0.08, 0, -0.5]} castShadow receiveShadow>
          <capsuleGeometry args={[0.045, 0.42, 3, 8]} />
          <meshStandardMaterial color="#9aa9b8" roughness={0.92} flatShading />
        </mesh>
        <mesh position={[0.4, 1.1, 0.12]} rotation={[0, 0, 0.06]} castShadow receiveShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.36, 6]} />
          <meshStandardMaterial color="#566170" roughness={0.8} flatShading />
        </mesh>
        <mesh position={lanternPos} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.26, 8]} />
          <meshStandardMaterial color="#9fc7ff" emissive="#78aaff" emissiveIntensity={3.6} toneMapped={false} roughness={0.38} />
        </mesh>
        <mesh position={[lanternPos[0], lanternPos[1] + 0.16, lanternPos[2]]} castShadow receiveShadow>
          <coneGeometry args={[0.12, 0.1, 8]} />
          <meshStandardMaterial color="#5f6b79" roughness={0.75} flatShading />
        </mesh>
        <mesh position={[lanternPos[0], lanternPos[1] - 0.15, lanternPos[2]]} castShadow receiveShadow>
          <cylinderGeometry args={[0.09, 0.12, 0.045, 8]} />
          <meshStandardMaterial color="#5f6b79" roughness={0.75} flatShading />
        </mesh>
      </group>
      {/* 体积光晕：两层 additive sprite */}
      <sprite position={lanternPos} scale={[1.2, 1.2, 1]} renderOrder={3}>
        <spriteMaterial map={glowTex} color="#aaccff" transparent opacity={0.48} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite position={lanternPos} scale={[2.8, 2.8, 1]} renderOrder={2}>
        <spriteMaterial map={glowTex} color="#6699cc" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* 灯心实光：冷光从手里的灯笼扩散，并给脸部一个柔和补光方向 */}
      <pointLight position={lanternPos} color="#88bbff" intensity={3.8} distance={4.5} decay={2} castShadow />
      <spotLight
        position={lanternPos}
        target-position={faceLightTarget}
        color="#c7ddff"
        intensity={1.9}
        distance={3.2}
        angle={0.65}
        penumbra={0.78}
        decay={2}
      />
    </group>
  );
}

export function House(props: any) {
  const ref = usePopIn(props.scale || 1.2);
  useMarinePhysics(ref, props);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();
  const isNight = timeOfDay > 18 || timeOfDay < 6;
  const windowColor = isNight ? "#f97316" : "#1e293b";
  const emissiveIntensity = isNight ? 1.5 : 0;

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        AudioSystem.playClick();
        useGameStore.getState().setOpenPlayerPanel(true);
        forceClose();
      }}
      onPointerOver={(e: any) => {
          if (useGameStore.getState().selectedTool === 'none') {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              keepHoverAlive();
          }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Hover UI Button */}
      <HoverButton
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={2.5}
          iconSvg={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'seatDropIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
               <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
               <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); useGameStore.getState().setOpenPlayerPanel(true); forceClose(); }}
      />

      {/* Main Building */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.2, 1.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Chimney */}
      <mesh position={[0.6, 1.4, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>

      {/* Smoke */}
      {isNight && <SmokeParticles position={[0.6, 2.0, -0.3]} />}

      {/* Roof */}
      <mesh position={[0, 1.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.6, 1.0, 4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.4, 0.71]} castShadow>
        <boxGeometry args={[0.5, 0.8, 0.05]} />
        <meshStandardMaterial color="#b45309" roughness={0.9} />
      </mesh>

      {/* Windows */}
      <mesh position={[-0.5, 0.6, 0.71]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      <mesh position={[0.5, 0.6, 0.71]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Side Window */}
      <mesh position={[0.91, 0.6, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.05]} />
        <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      {/* Porch steps */}
      <mesh position={[0, 0.05, 0.85]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.1, 0.3]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
}

export function Windmill(props: any) {
  const ref = usePopIn(props.scale || 1.2);
  useMarinePhysics(ref, props);
  const bladeRef = useRef<THREE.Group>(null);
  const weather = useGameStore(state => state.weather);
  const setWeather = useGameStore(state => state.setWeather);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();

  const isCoastal = Math.sqrt(props.position.x * props.position.x + props.position.z * props.position.z) > 12;

  useFrame((_, delta) => {
    // Coastal windmills spin faster
    const speed = (weather === 'rainy' ? 3.5 : 1.2) * (isCoastal ? 1.5 : 1.0);
    if (bladeRef.current) bladeRef.current.rotation.z -= delta * speed;
  });

  const nextWeather = () => {
    if (weather === 'sunny') return 'rainy';
    if (weather === 'rainy') return 'snowy';
    return 'sunny';
  };

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        AudioSystem.playClick();
        setWeather(nextWeather());
        forceClose();
      }}
      onPointerOver={(e: any) => {
          if (useGameStore.getState().selectedTool === 'none') {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              keepHoverAlive();
          }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >

      {/* Hover UI Button */}
      <HoverButton
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={3.5}
          iconSvg={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'wheelSpin 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}>
               {weather === 'sunny' ? <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /> :
                weather === 'rainy' ? <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25M16 20l-4-4-4 4M12 16v8" /> :
                <path d="M12 2v20m5-15l-10 10m10 0L7 7" />}
            </svg>
          }
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); setWeather(nextWeather()); forceClose(); }}
      />

      {/* Coastal Synergy Indicator */}
      {isCoastal && (
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.5, 1.8, 16]} />
              <meshBasicMaterial color="#93c5fd" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
      )}

      {/* Base */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 1.0, 2.4, 6]} />
        <meshStandardMaterial color="#fef3c7" roughness={1.0} flatShading />
      </mesh>
      {/* Wooden Framework Details */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
         <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 0.86, 1.2, Math.sin(i * Math.PI / 3) * 0.86]} rotation={[0, -i * Math.PI / 3, 0.1]} castShadow>
             <boxGeometry args={[0.08, 2.5, 0.08]} />
             <meshStandardMaterial color="#78350f" roughness={1.0} flatShading />
         </mesh>
      ))}
      {/* Top Roof */}
      <mesh position={[0, 2.7, 0]} rotation={[0, Math.PI / 6, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.9, 0.8, 6]} />
        <meshStandardMaterial color="#b45309" roughness={1.0} flatShading />
      </mesh>
      {/* Wooden Deck */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 0.1, 6]} />
        <meshStandardMaterial color="#5c4033" roughness={1.0} flatShading />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.4, 1.0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.1]} />
        <meshStandardMaterial color="#78350f" flatShading />
      </mesh>

      {/* Rotor & Blades */}
      <group position={[0, 2.4, 0.85]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
           <cylinderGeometry args={[0.1, 0.1, 0.4]} />
           <meshStandardMaterial color="#0f172a" />
        </mesh>
        <group ref={bladeRef} position={[0, 0, 0.1]}>
          <mesh castShadow><boxGeometry args={[0.15, 4.0, 0.05]}/><meshStandardMaterial color="#1e293b"/></mesh>
          <mesh castShadow><boxGeometry args={[4.0, 0.15, 0.05]}/><meshStandardMaterial color="#1e293b"/></mesh>

          {/* Sail cloths */}
          <mesh position={[0.4, 1.0, 0]} castShadow><boxGeometry args={[0.6, 1.8, 0.02]}/><meshStandardMaterial color="#f8fafc"/></mesh>
          <mesh position={[-0.4, -1.0, 0]} castShadow><boxGeometry args={[0.6, 1.8, 0.02]}/><meshStandardMaterial color="#f8fafc"/></mesh>
          <mesh position={[1.0, -0.4, 0]} castShadow><boxGeometry args={[1.8, 0.6, 0.02]}/><meshStandardMaterial color="#f8fafc"/></mesh>
          <mesh position={[-1.0, 0.4, 0]} castShadow><boxGeometry args={[1.8, 0.6, 0.02]}/><meshStandardMaterial color="#f8fafc"/></mesh>
        </group>
      </group>
    </group>
  );
}

export function Lighthouse(props: any) {
  const ref = usePopIn(props.scale || 1.2);
  useMarinePhysics(ref, props);
  const timeOfDay = useGameStore(state => state.timeOfDay);
  const isNight = timeOfDay > 18 || timeOfDay < 6;
  const lightRef = useRef<THREE.PointLight>(null);
  const beamRef = useRef<THREE.Group>(null);

  const target1 = useMemo(() => { const obj = new THREE.Object3D(); obj.position.set(0, -2, 10); return obj; }, []);
  const target2 = useMemo(() => { const obj = new THREE.Object3D(); obj.position.set(0, -2, -10); return obj; }, []);

  useFrame((state, delta) => {
    if (beamRef.current) {
        beamRef.current.rotation.y -= delta * 1.5;
    }
  });

  return (
    <group ref={ref} position={[props.position.x, props.position.y, props.position.z]} rotation={new THREE.Euler(props.rotation?.x || 0, props.rotation?.y || 0, props.rotation?.z || 0, 'YXZ')} scale={0}>

      {/* --- TERRAIN / FOUNDATION --- */}
      {/* Rocky Outcropping Base */}
      <mesh position={[0, 0.1, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[1.8, 2.0, 0.3, 7]} />
         <meshStandardMaterial color="#475569" roughness={1.0} flatShading />
      </mesh>
      {/* Stone Pedestal */}
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[1.3, 1.6, 0.3, 8]} />
         <meshStandardMaterial color="#94a3b8" roughness={1.0} flatShading />
      </mesh>

      {/* --- KEEPER'S COTTAGE (Attached) --- */}
      <group position={[0.9, 0.5, 0.5]} rotation={[0, Math.PI / 6, 0]}>
         {/* Cottage Body */}
         <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.8, 1.0]} />
            <meshStandardMaterial color="#f8fafc" roughness={1.0} flatShading />
         </mesh>
         {/* Cottage Roof */}
         <mesh position={[0, 0.95, 0]} rotation={[0, 0, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.9, 0.5, 4]} />
            <meshStandardMaterial color="#b91c1c" roughness={1.0} flatShading />
         </mesh>
         {/* Cottage Door */}
         <mesh position={[0, 0.3, 0.51]} castShadow>
            <boxGeometry args={[0.3, 0.6, 0.05]} />
            <meshStandardMaterial color="#78350f" roughness={1.0} flatShading />
         </mesh>
         {/* Cottage Window */}
         <mesh position={[0.61, 0.4, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.3, 0.3, 0.05]} />
            <meshStandardMaterial color={isNight ? "#fde047" : "#0f172a"} emissive={isNight ? "#fbbf24" : "#000000"} emissiveIntensity={isNight ? 2 : 0} roughness={0.8} flatShading toneMapped={false} />
         </mesh>
         {/* Cottage Chimney */}
         <mesh position={[0.3, 1.0, -0.2]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.6, 0.2]} />
            <meshStandardMaterial color="#64748b" roughness={1.0} flatShading />
         </mesh>
         {isNight && <SmokeParticles position={[0.3, 1.4, -0.2]} />}
      </group>

      {/* --- MAIN LIGHTHOUSE TOWER --- */}
      <group position={[-0.2, 0, -0.2]}>
          {/* Base Tower (White) */}
          <mesh position={[0, 2.0, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.5, 1.1, 4.0, 8]} />
             <meshStandardMaterial color="#f1f5f9" roughness={1.0} flatShading />
          </mesh>

          {/* Red Stripes */}
          <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.82, 0.97, 0.8, 8]} />
             <meshStandardMaterial color="#dc2626" roughness={1.0} flatShading />
          </mesh>
          <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.58, 0.73, 0.8, 8]} />
             <meshStandardMaterial color="#dc2626" roughness={1.0} flatShading />
          </mesh>

          {/* Tower Base Door */}
          <mesh position={[0, 0.7, 1.05]} rotation={[0, -Math.PI / 8, 0]} castShadow>
             <boxGeometry args={[0.3, 0.5, 0.1]} />
             <meshStandardMaterial color="#451a03" roughness={1.0} flatShading />
          </mesh>
          {/* Wooden Awning */}
          <mesh position={[0, 1.0, 1.05]} rotation={[0.2, -Math.PI / 8, 0]} castShadow>
             <boxGeometry args={[0.4, 0.05, 0.3]} />
             <meshStandardMaterial color="#334155" roughness={1.0} flatShading />
          </mesh>

          {/* Spiral Windows */}
          {[0, 1, 2, 3].map(i => {
             const angle = (i * Math.PI * 0.6) + Math.PI;
             const yPos = 1.0 + i * 0.7;
             const radius = 1.1 - (yPos / 4.0) * 0.6 + 0.02;
             return (
                 <mesh key={i} position={[Math.sin(angle) * radius, yPos, Math.cos(angle) * radius]} rotation={[0, angle, 0]} castShadow>
                     <boxGeometry args={[0.15, 0.25, 0.1]} />
                     <meshStandardMaterial color={isNight ? "#fde047" : "#0f172a"} emissive={isNight ? "#fbbf24" : "#000000"} emissiveIntensity={isNight ? 2 : 0} roughness={0.8} flatShading toneMapped={false} />
                 </mesh>
             );
          })}

          {/* --- GALLERY DECK (Balcony) --- */}
          {/* Support Brackets */}
          {[...Array(8)].map((_, i) => (
             <mesh key={`bracket-${i}`} position={[Math.sin(i * Math.PI / 4) * 0.5, 3.8, Math.cos(i * Math.PI / 4) * 0.5]} rotation={[-0.5, i * Math.PI / 4, 0]} castShadow>
                 <boxGeometry args={[0.08, 0.4, 0.08]} />
                 <meshStandardMaterial color="#cbd5e1" roughness={1.0} flatShading />
             </mesh>
          ))}
          {/* Deck Floor */}
          <mesh position={[0, 4.0, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.9, 0.6, 0.2, 8]} />
             <meshStandardMaterial color="#334155" roughness={1.0} flatShading />
          </mesh>
          {/* Deck Railing Top */}
          <mesh position={[0, 4.3, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <cylinderGeometry args={[0.85, 0.85, 0.05, 8]} />
             <meshStandardMaterial color="#0f172a" roughness={1.0} flatShading />
          </mesh>
          {/* Deck Railing Posts */}
          {[...Array(16)].map((_, i) => (
             <mesh key={`post-${i}`} position={[Math.sin(i * Math.PI / 8) * 0.82, 4.15, Math.cos(i * Math.PI / 8) * 0.82]} castShadow>
                 <boxGeometry args={[0.03, 0.3, 0.03]} />
                 <meshStandardMaterial color="#0f172a" roughness={1.0} flatShading />
             </mesh>
          ))}

          {/* --- LANTERN ROOM --- */}
          {/* Glass Enclosure */}
          <mesh position={[0, 4.5, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
             <cylinderGeometry args={[0.45, 0.45, 0.8, 8]} />
             <meshStandardMaterial color="#fef08a" emissive={isNight ? "#fbbf24" : "#000000"} emissiveIntensity={isNight ? 5 : 0} transparent opacity={isNight ? 0.8 : 0.4} toneMapped={false} />
          </mesh>
          {/* Internal Glowing Lens (Fresnel) */}
          <group position={[0, 4.5, 0]} ref={beamRef}>
             <mesh castShadow>
                 <cylinderGeometry args={[0.2, 0.2, 0.5, 6]} />
                 <meshStandardMaterial color="#ffffff" emissive="#fbbf24" emissiveIntensity={isNight ? 8 : 0} toneMapped={false} flatShading />
             </mesh>

             {/* The Spotlight Beams */}
             {isNight && (
                <>
                  <pointLight ref={lightRef} color="#fbbf24" intensity={8} distance={40} />
                  <SpotLight position={[0, 0, 0]} color="#fef08a" distance={50} angle={0.4} attenuation={20} anglePower={6} intensity={8} opacity={0.7} volumetric target={target1} />
                  <SpotLight position={[0, 0, 0]} color="#fef08a" distance={50} angle={0.4} attenuation={20} anglePower={6} intensity={8} opacity={0.7} volumetric target={target2} />
                  <primitive object={target1} />
                  <primitive object={target2} />
                </>
             )}
          </group>
          {/* Window Frames / Pillars */}
          {[...Array(8)].map((_, i) => (
             <mesh key={`lantern-post-${i}`} position={[Math.sin(i * Math.PI / 4 + Math.PI/8) * 0.47, 4.5, Math.cos(i * Math.PI / 4 + Math.PI/8) * 0.47]} castShadow>
                 <boxGeometry args={[0.06, 0.8, 0.06]} />
                 <meshStandardMaterial color="#1e293b" roughness={1.0} flatShading />
             </mesh>
          ))}

          {/* --- ROOF --- */}
          {/* Roof Base Dome/Cone */}
          <mesh position={[0, 5.2, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
             <coneGeometry args={[0.6, 0.6, 8]} />
             <meshStandardMaterial color="#dc2626" roughness={1.0} flatShading />
          </mesh>
          {/* Roof Sphere Finial */}
          <mesh position={[0, 5.5, 0]} castShadow>
             <sphereGeometry args={[0.12, 8, 8]} />
             <meshStandardMaterial color="#fcd34d" roughness={0.4} metalness={0.6} flatShading />
          </mesh>
          {/* Lightning Rod / Weather Vane */}
          <mesh position={[0, 5.8, 0]} castShadow>
             <cylinderGeometry args={[0.015, 0.015, 0.6]} />
             <meshStandardMaterial color="#94a3b8" roughness={0.5} flatShading />
          </mesh>
          {/* Weather Vane Arrow */}
          <mesh position={[0, 5.9, 0]} castShadow>
             <boxGeometry args={[0.3, 0.02, 0.02]} />
             <meshStandardMaterial color="#94a3b8" roughness={0.5} flatShading />
          </mesh>
      </group>

    </group>
  );
}
