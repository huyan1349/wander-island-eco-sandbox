import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getFragmentById } from '../../game/fragmentLookup';
import { AudioSystem } from '../../lib/audio';
import { useGameStore } from '../../store';
import { ParticleBurst } from '../effects/ParticleBurst';
import { TelescopeIcon } from '../icons/TelescopeIcon';
import { HoverButton, useHoverInteraction } from './interactions';
import { usePopIn } from './shared';

function SpiritSeed({ fragId, position }: { fragId: string, position: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const [picked, setPicked] = useState(false);
  const frag = useMemo(() => getFragmentById(fragId), [fragId]);
  const dismiss = useGameStore(s => s.dismissFragment);
  const setCameraFocus = useGameStore(s => s.setCameraFocus);

  // Focus camera when seed appears
  useEffect(() => {
    setCameraFocus(position);
    return () => setCameraFocus(null); // Return camera when unmounted
  }, [position, setCameraFocus]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    if (picked) {
      // 选中后爆闪
      meshRef.current.scale.setScalar(THREE.MathUtils.damp(meshRef.current.scale.x, 3, 4, delta));
      if (glowRef.current) glowRef.current.intensity = THREE.MathUtils.damp(glowRef.current.intensity, 15, 6, delta);
      return;
    }

    // 唯美的飘落曲线
    const startY = 6;
    const endY = 1.5;
    const fallDuration = 3;
    const fallProgress = Math.min(t / fallDuration, 1);

    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - fallProgress, 3);
    const targetY = startY - (startY - endY) * easeProgress;

    const bob = Math.sin(t * 2) * 0.1;
    meshRef.current.position.y = targetY + bob + (hovered ? 0.2 : 0);

    meshRef.current.rotation.y = t * 0.5;
    meshRef.current.rotation.x = Math.sin(t) * 0.2;

    const targetScale = hovered ? 1.3 : 1.0;
    meshRef.current.scale.setScalar(THREE.MathUtils.damp(meshRef.current.scale.x, targetScale, 6, delta));

    if (glowRef.current) {
      glowRef.current.intensity = THREE.MathUtils.damp(glowRef.current.intensity, hovered ? 5 : (fallProgress > 0.8 ? 2.5 : 0.5), 4, delta);
    }
  });

  if (!frag) return null;

  return (
    <group
      ref={meshRef}
      position={[0, 6, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (picked) return;
        setPicked(true);
        AudioSystem.playClick();
        setTimeout(() => AudioSystem.playTap(), 500);
      }}
      onPointerOver={(e) => { e.stopPropagation(); if (!picked) setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { document.body.style.cursor = 'auto'; if (!picked) setHovered(false); }}
    >
      {/* 灵之种本体 */}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshPhysicalMaterial
          color={hovered ? '#ffffff' : frag.tierColor}
          emissive={frag.tierColor}
          emissiveIntensity={hovered ? 4 : 2}
          roughness={0.1}
          metalness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* 外部光环 */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color={frag.tierColor} transparent opacity={hovered ? 0.4 : 0.2} depthWrite={false} side={THREE.BackSide} />
      </mesh>

      {/* 悬停呼吸光环 */}
      {hovered && !picked && (
        <mesh>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshBasicMaterial color={frag.tierColor} transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      <pointLight ref={glowRef} color={frag.tierColor} intensity={0} distance={15} decay={2} />

      {/* 卡牌揭晓 UI */}
      {picked && (
        <Html position={[0, 1.2, 0]} center zIndexRange={[100, 0]}>
          <div className="hand-drawn-panel p-8 w-[320px] flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-widest">{frag.title}</h3>
            <span className="px-3 py-1 text-xs font-bold rounded-full mb-4" style={{ backgroundColor: frag.tierColor + '40', color: frag.tierColor }}>
              {frag.tier}
            </span>
            <p className="text-sm text-slate-600 font-bold mb-6 text-center leading-relaxed whitespace-pre-wrap">{frag.oracle}</p>
            <button
              className="hand-drawn-btn px-8 py-2 text-slate-800 font-bold tracking-widest"
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
            >
              收下
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

export function SpiritTree(props: any) {
  const ref = usePopIn(props.scale || 1.5);
  const leavesRef = useRef<any>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);
  const grassHealth = useGameStore(state => state.grassHealth);
  const pendingFragment = useGameStore(state => state.pendingFragment);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();
  const pray = () => {
    // 神树不摇动，祈愿的回应交给：辞语 + 苏醒度 + 叙事碎片揭示
    useGameStore.getState().pray();
    forceClose();
  };
  const particleCount = 20;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.8 + Math.random() * 2.2,
      baseY: 2.5 + Math.random() * 3.5,
      speed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.3,
      baseScale: 0.15 + Math.random() * 0.25
    }));
  }, []);

  // Determine particle visibility and color based on grassHealth
  const ecologyState = useMemo(() => {
    if (grassHealth > 80) return { visibleRatio: 1.0, color: new THREE.Color('#4ade80'), speedMul: 1.0 };
    if (grassHealth > 50) return { visibleRatio: 0.7, color: new THREE.Color('#86efac'), speedMul: 0.7 };
    if (grassHealth > 20) return { visibleRatio: 0.3, color: new THREE.Color('#fde047'), speedMul: 0.4 };
    return { visibleRatio: 0.1, color: new THREE.Color('#fca5a5'), speedMul: 0.2 };
  }, [grassHealth]);

  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (leavesRef.current) {
      leavesRef.current.position.y = 3.5 + Math.sin(clock.elapsedTime * 2) * 0.1;
      leavesRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.05;
    }
    if (!particleMeshRef.current) return;

    const visibleCount = Math.max(1, Math.floor(particleCount * ecologyState.visibleRatio));
    const speedMul = ecologyState.speedMul;
    // Unhealthy: more erratic movement
    const erraticMul = grassHealth > 50 ? 1 : (1 + (50 - grassHealth) * 0.03);

    for (let i = 0; i < particleCount; i++) {
      if (i < visibleCount) {
        const p = particles[i];
        const t = clock.elapsedTime * p.speed * speedMul + p.phase;
        const x = Math.cos(p.angle + t * 0.2) * p.radius + Math.sin(t * erraticMul * 1.3) * p.drift;
        const y = p.baseY + Math.sin(t * 1.5) * 0.4;
        const z = Math.sin(p.angle + t * 0.2) * p.radius + Math.cos(t * erraticMul * 1.1) * p.drift;
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(p.baseScale);
        dummy.updateMatrix();
        particleMeshRef.current.setMatrixAt(i, dummy.matrix);
        particleMeshRef.current.setColorAt(i, ecologyState.color);
      } else {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        particleMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    particleMeshRef.current.instanceMatrix.needsUpdate = true;
    if (particleMeshRef.current.instanceColor) particleMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group
      position={[props.position.x, props.position.y, props.position.z]}
      rotation={[0, props.rotation.y, 0]}
      scale={0}
      ref={ref}
      onPointerOver={(e: any) => {
        if (useGameStore.getState().selectedTool === 'none' && !pendingFragment) { e.stopPropagation(); document.body.style.cursor = 'pointer'; keepHoverAlive(); }
      }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool === 'none' && !pendingFragment) {
          e.stopPropagation();
          pray();
        }
      }}
    >
      {/* 灵之种降临 */}
      {pendingFragment ? (
        <SpiritSeed fragId={pendingFragment} position={[props.position.x, props.position.y, props.position.z]} />
      ) : (
        /* 祈愿按钮 —— 悬停浮现的高级气泡 */
        <HoverButton
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={6.0}
          iconSvg={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {/* 双手合十：左手 */}
              <path d="M12 3.8C9.5 6.2 7.5 9.6 8 14.4c.2 2 1.6 3.4 4 3.4" style={{ animation: 'seatDropIn 0.6s 0.1s both cubic-bezier(0.34,1.56,0.64,1)' }} />
              {/* 右手（镜像） */}
              <path d="M12 3.8C14.5 6.2 16.5 9.6 16 14.4c-.2 2-1.6 3.4-4 3.4" style={{ animation: 'seatDropIn 0.6s 0.22s both cubic-bezier(0.34,1.56,0.64,1)' }} />
              {/* 两掌相贴的中缝 */}
              <path d="M12 4.8v13" />
              {/* 拇指交叠 */}
              <path d="M8.7 12.4c2.2.5 4.4.5 6.6 0" />
              {/* 手腕收拢 */}
              <path d="M9.2 17.6c.6 1.7 1.7 2.8 2.8 2.8s2.2-1.1 2.8-2.8" />
              {/* 祈愿光点 */}
              <path d="M12 2.1v.7M9.7 3.1l.3.6M14.3 3.1l-.3.6" style={{ animation: 'sparkPop 0.5s 0.3s both', transformOrigin: 'center' }} />
            </svg>
          }
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); pray(); }}
        />
      )}

      {/* Massive Trunk */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.8, 3, 7]} />
        <meshStandardMaterial color="#292524" roughness={1} flatShading />
      </mesh>
      {/* Twisted roots */}
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i*Math.PI*2/5)*0.6, 0.3, Math.sin(i*Math.PI*2/5)*0.6]} rotation={[0, -i*Math.PI*2/5, Math.PI/6]} castShadow>
          <cylinderGeometry args={[0.1, 0.4, 1.5, 5]} />
          <meshStandardMaterial color="#292524" roughness={1} flatShading />
        </mesh>
      ))}

      {/* Leaf Layers */}
      <group ref={leavesRef} position={[0, 3.5, 0]}>
        {[...Array(6)].map((_, i) => {
          const s = 1.8 - i * 0.2;
          return (
            <mesh key={i} position={[0, i * 0.6, 0]} rotation={[0, i * Math.PI / 3, 0]} castShadow receiveShadow>
              <dodecahedronGeometry args={[s, 0]} />
              <meshStandardMaterial color="#10b981" flatShading />
            </mesh>
          );
        })}
      </group>

      {/* Ecology-responsive Floating Particles */}
      <instancedMesh ref={particleMeshRef} args={[undefined, undefined, particleCount]}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial emissive="#4ade80" emissiveIntensity={0.6} flatShading />
      </instancedMesh>
    </group>
  );
}

export function Observatory(props: any) {
  const ref = usePopIn(props.scale || 1.2);
  const telescopeRef = useRef<any>(null);
  const timeOfDay = useGameStore(s => s.timeOfDay);
  const setObservatoryMode = useGameStore(s => s.setObservatoryMode);

  const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;
  const { showHover, isHoverLeaving, keepHoverAlive } = useHoverInteraction();

  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (telescopeRef.current) {
      telescopeRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.3;
      telescopeRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group
      position={[props.position.x, props.position.y, props.position.z]}
      rotation={[0, props.rotation.y, 0]}
      scale={0}
      ref={ref}
      onPointerEnter={() => keepHoverAlive()}
      onPointerLeave={() => keepHoverAlive()}
    >
      <HoverButton
        showHover={showHover}
        isHoverLeaving={isHoverLeaving}
        keepHoverAlive={keepHoverAlive}
        yOffset={3.5}
        onClick={(e: any) => {
          e.stopPropagation();
          AudioSystem.playToggle();
          // Premium transition to night
          useGameStore.getState().setTimeOfDay(22);
          useGameStore.getState().setObservatoryPos([props.position.x, props.position.y, props.position.z]);
          setObservatoryMode(true);
        }}
        iconSvg={<TelescopeIcon />}
      />

      {/* Main Wooden Base Tower */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.2, 3, 6]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} flatShading />
      </mesh>

      {/* Balcony */}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.0, 0.2, 8]} />
        <meshStandardMaterial color="#78350f" roughness={1} flatShading />
      </mesh>

      {/* Pillars for Dome */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i*Math.PI/3)*0.9, 3.6, Math.sin(i*Math.PI/3)*0.9]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial color="#5c4033" flatShading />
        </mesh>
      ))}

      {/* Dome */}
      <mesh position={[0, 4.2, 0]} castShadow>
        <sphereGeometry args={[1.1, 8, 8, 0, Math.PI * 2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} flatShading />
      </mesh>
      {/* Warm glow from inside */}
      <pointLight color="#fef08a" intensity={1.5} distance={8} position={[0, 3.5, 0]} castShadow />
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1} flatShading />
      </mesh>

      {/* Giant Telescope */}
      <group position={[0, 3.6, 0.6]} ref={telescopeRef}>
        <mesh position={[0, 0, 0.6]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.25, 1.5, 6]} />
          <meshStandardMaterial color="#b45309" roughness={0.4} flatShading />
        </mesh>
        <mesh position={[0, 0, 1.4]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.15, 0.3, 6]} />
          <meshStandardMaterial color="#1c1917" flatShading />
        </mesh>
      </group>
    </group>
  );
}

export function RuinsArch(props: any) {
  const ref = usePopIn(props.scale || 1.3);
  // 破水而出：customState='rising:<ts>' 时，从水下 5 单位 easeOut 缓缓升起到位
  const riseRef = useRef<number | null>(null);
  const isRising = String(props.customState || '').startsWith('rising');
  useEffect(() => {
    const cs = String(props.customState || '');
    if (cs.startsWith('rising')) {
      const t = parseInt(cs.split(':')[1] || '', 10);
      riseRef.current = Number.isFinite(t) ? t : Date.now();
    } else riseRef.current = null;
  }, [props.customState]);
  useFrame(() => {
    if (!ref.current || riseRef.current == null) return;
    const RISE = 3200, DEPTH = 5;
    const p = Math.min(1, (Date.now() - riseRef.current) / RISE);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    ref.current.position.y = props.position.y + (e - 1) * DEPTH;
    if (p >= 1) riseRef.current = null;
  });
  return (
    <group position={[props.position.x, isRising ? props.position.y - 5 : props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
      {/* Massive Left Pillar */}
      <mesh position={[-1.2, 1.5, 0]} rotation={[0, 0.1, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 3.0, 0.8]} />
        <meshStandardMaterial color="#64748b" roughness={1} flatShading />
      </mesh>

      {/* Massive Right Pillar */}
      <mesh position={[1.2, 1.4, 0]} rotation={[0, -0.1, -0.03]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 2.8, 0.8]} />
        <meshStandardMaterial color="#64748b" roughness={1} flatShading />
      </mesh>

      {/* Top Cross Beam */}
      <mesh position={[0, 3.1, 0]} rotation={[0.02, 0, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 0.7, 0.9]} />
        <meshStandardMaterial color="#475569" roughness={1} flatShading />
      </mesh>

      {/* Stylized Vines */}
      <mesh position={[-0.8, 2.0, 0.46]} rotation={[0, 0, 0.05]} castShadow>
        <planeGeometry args={[0.3, 2.0]} />
        <meshStandardMaterial color="#166534" roughness={1} side={THREE.DoubleSide} flatShading />
      </mesh>
      <mesh position={[0.5, 2.5, -0.46]} rotation={[0, 0, -0.05]} castShadow>
        <planeGeometry args={[0.4, 1.2]} />
        <meshStandardMaterial color="#166534" roughness={1} side={THREE.DoubleSide} flatShading />
      </mesh>

      {/* Large Base Rubble */}
      <mesh position={[-1.4, 0.3, 0.6]} rotation={[0.2, 0.8, 0]} castShadow>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#475569" roughness={1} flatShading />
      </mesh>
      <mesh position={[1.5, 0.4, -0.5]} rotation={[0, 0.5, 0.5]} castShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#64748b" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

export function Waterwheel(props: any) {
  const ref = usePopIn(props.scale || 1.4);
  const wheelRef = useRef<any>(null);
  const assets = useGameStore(state => state.assets);
  const season = useGameStore(state => state.season);
  const weather = useGameStore(state => state.weather);

  useFrame(({ clock }) => {
    if (!useGameStore.getState().isSplashDone) return;
    if (wheelRef.current) {
      // Count nearby springs within 8 units
      const wx = props.position.x, wz = props.position.z;
      const nearbySprings = assets.filter(a =>
        a.type === 'spring' &&
        Math.sqrt((a.position.x - wx) ** 2 + (a.position.z - wz) ** 2) <= 8
      ).length;

      // Base speed + spring bonus
      const baseSpeed = 0.3;
      const springBonus = nearbySprings * 0.15;

      // Season multiplier
      const seasonMult = season === 'spring' ? 1.0
        : season === 'summer' ? 1.3
        : season === 'autumn' ? 0.9
        : 0.4; // winter

      // Rainy weather multiplier
      const weatherMult = (weather === 'rainy' || weather === 'stormy') ? 1.5 : 1.0;

      const speed = (baseSpeed + springBonus) * seasonMult * weatherMult;
      wheelRef.current.rotation.x = clock.elapsedTime * speed;
    }
  });

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} scale={0} ref={ref}>
      {/* Wooden Supports */}
      <mesh position={[-0.4, 1.5, 0]} rotation={[0, 0, 0.1]} castShadow>
        <boxGeometry args={[0.2, 3.0, 0.2]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[0.4, 1.5, 0]} rotation={[0, 0, -0.1]} castShadow>
        <boxGeometry args={[0.2, 3.0, 0.2]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>

      {/* Crossbeam Axis */}
      <mesh position={[0, 2.0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.2, 6]} />
        <meshStandardMaterial color="#292524" flatShading />
      </mesh>

      {/* The Rotating Wheel */}
      <group position={[0, 2.0, 0]} ref={wheelRef}>
        {/* Outer Rings */}
        <mesh rotation={[0, 0, Math.PI/2]} castShadow>
          <torusGeometry args={[1.5, 0.08, 6, 12]} />
          <meshStandardMaterial color="#78350f" flatShading />
        </mesh>

        {/* Spokes and Paddles */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <group key={i} rotation={[angle, 0, 0]}>
              {/* Spoke */}
              <mesh position={[0, 0.75, 0]} castShadow>
                <boxGeometry args={[0.1, 1.5, 0.1]} />
                <meshStandardMaterial color="#5c4033" flatShading />
              </mesh>
              {/* Paddle */}
              <mesh position={[0, 1.5, 0]} castShadow>
                <boxGeometry args={[0.8, 0.1, 0.4]} />
                <meshStandardMaterial color="#92400e" flatShading />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Splashing Particles at water level */}
      <ParticleBurst position={new THREE.Vector3(0, 0.2, 1.5)} color="#bae6fd" />
    </group>
  );
}
