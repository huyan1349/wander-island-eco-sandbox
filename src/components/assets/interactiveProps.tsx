import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { AudioSystem } from '../../lib/audio';
import { useGameStore } from '../../store';
import { SparkParticles } from '../effects/AmbientParticles';
import { ParticleBurst } from '../effects/ParticleBurst';
import { HoverButton, useHoverInteraction } from './interactions';
import { usePopIn } from './shared';

export function Birdhouse(props: any) {
    const updateAsset = useGameStore(state => state.updateAsset);
    const isGathering = props.customState === 'gather';

    return (
        <group
            position={[props.position.x, props.position.y, props.position.z]}
            onClick={(e) => {
                e.stopPropagation();
                updateAsset(props.id, (asset) => ({
                    ...asset,
                    customState: isGathering ? 'release' : 'gather'
                }));
                AudioSystem.playPop();
            }}
            onPointerOver={(e) => {
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                document.body.style.cursor = 'auto';
            }}
        >
            <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 1]} />
                <meshStandardMaterial color="#78350f" />
            </mesh>
            <mesh position={[0, 1.1, 0]} castShadow>
                <boxGeometry args={[0.6, 0.4, 0.6]} />
                <meshStandardMaterial color="#fef3c7" />
            </mesh>
            <mesh position={[0, 1.4, 0]} rotation={[0, Math.PI/4, 0]} castShadow>
                <coneGeometry args={[0.5, 0.4, 4]} />
                <meshStandardMaterial color="#b91c1c" />
            </mesh>
            <mesh position={[0, 1.1, 0.31]}>
                <circleGeometry args={[0.1, 16]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
            {isGathering && (
                <pointLight color="#fbbf24" intensity={2} distance={3} position={[0, 1.6, 0]} />
            )}
        </group>
    );
}

export function Campfire(props: any) {
  const ref = usePopIn(props.scale || 1);
  const [isLit, setIsLit] = useState(false);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();
  const fireGroupRef = useRef<any>(null);
  const fireInnerRef = useRef<any>(null);
  const lightRef = useRef<any>(null);

  useFrame(({ clock }) => {
     if (!useGameStore.getState().isSplashDone || !isLit) return;
     const t = clock.elapsedTime;
     if (fireGroupRef.current) {
         // Add flicker and stylized rotation
         fireGroupRef.current.scale.set(
             1 + Math.sin(t * 8) * 0.1,
             1 + Math.cos(t * 12) * 0.15,
             1 + Math.sin(t * 7) * 0.1
         );
         fireGroupRef.current.rotation.y = Math.sin(t * 2) * 0.1;
     }
     if (fireInnerRef.current) {
         fireInnerRef.current.position.y = 0.25 + Math.sin(t * 10) * 0.05;
     }
     if (lightRef.current) {
         lightRef.current.intensity = 2.5 + Math.sin(t * 15) * 0.3 + Math.sin(t * 23) * 0.2;
     }
  });

  return (
    <group
      position={[props.position.x, props.position.y, props.position.z]}
      rotation={[0, props.rotation.y, 0]}
      ref={ref}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        AudioSystem.playClick();
        setIsLit(!isLit);
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
      {/* Hand-drawn style Stone Ring */}
      {[...Array(10)].map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const r = 0.55 + Math.random() * 0.1;
          const s = 0.8 + Math.random() * 0.5;
          return (
             <mesh key={i} position={[Math.cos(angle)*r, 0.08 * s, Math.sin(angle)*r]} rotation={[Math.random(), Math.random(), Math.random()]} scale={[s, s * 0.8, s * 1.1]} castShadow>
               <dodecahedronGeometry args={[0.15, 0]} />
               <meshStandardMaterial color="#64748b" roughness={1} flatShading />
             </mesh>
          );
      })}

      {/* Ash base */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
         <circleGeometry args={[0.6, 8]} />
         <meshStandardMaterial color="#292524" flatShading />
      </mesh>

      {/* Logs - More random and stylized */}
      {[...Array(5)].map((_, i) => (
          <group key={i} position={[0, 0.1, 0]} rotation={[0, (i * Math.PI * 2 / 5) + (Math.random() * 0.2), 0]}>
            <mesh position={[0.3, 0.1, 0]} rotation={[0, 0, Math.PI / 5 + Math.random() * 0.1]} castShadow>
               <cylinderGeometry args={[0.04, 0.06, 0.8, 5]} />
               <meshStandardMaterial color="#451a03" roughness={1} flatShading />
            </mesh>
            {/* Log highlight/bark detail */}
            <mesh position={[0.3, 0.12, 0]} rotation={[0, 0, Math.PI / 5 + Math.random() * 0.1]}>
               <cylinderGeometry args={[0.02, 0.02, 0.75, 4]} />
               <meshStandardMaterial color="#78350f" roughness={1} flatShading />
            </mesh>
          </group>
      ))}

      {/* Stylized Low-Poly Fire */}
      {isLit && (
        <group ref={fireGroupRef} position={[0, 0.35, 0]}>
          {/* Outer Flame */}
          <mesh castShadow>
              <coneGeometry args={[0.35, 0.7, 4]} />
              <meshStandardMaterial color="#ea580c" emissive="#ea580c" emissiveIntensity={0.8} transparent opacity={0.9} flatShading />
          </mesh>
          <mesh rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[0.3, 0.65, 4]} />
              <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1} flatShading />
          </mesh>
          {/* Inner Flame */}
          <mesh ref={fireInnerRef} position={[0, -0.1, 0]}>
              <octahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={2} flatShading />
          </mesh>
        </group>
      )}

      {/* Fire Particles */}
      {isLit && <ParticleBurst position={new THREE.Vector3(0, 0.5, 0)} color="#fcd34d" />}

      {/* Spark Particles */}
      {isLit && <SparkParticles position={[0, 0.5, 0]} />}

      {/* Light Source */}
      {isLit && <pointLight ref={lightRef} color="#fbbf24" distance={8} decay={2} castShadow intensity={2.5} position={[0, 0.8, 0]} />}

      {/* Hover UI Button */}
      <HoverButton
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={1.4}
          iconSvg={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
              {isLit ? (
                <g style={{ animation: 'extinguishShrink 0.5s forwards', transformOrigin: 'center' }}>
                   <path d="M18 6L6 18M6 6l12 12" />
                </g>
              ) : (
                <g>
                  {/* Spark */}
                  <circle cx="12" cy="18" r="2" fill="currentColor" stroke="none" style={{ transformOrigin: 'center', animation: 'sparkShoot 0.5s ease-out forwards' }} />
                  {/* Flame */}
                  <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 2.4 6a4 4 0 01-4 3.9"
                        style={{ transformOrigin: '12px 20px', animation: 'flameIgniteReal 0.6s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both' }} />
                  {/* Logs at bottom */}
                  <path d="M7 20 L17 17 M7 17 L17 20" strokeWidth="2" style={{ strokeDasharray: 20, strokeDashoffset: 20, animation: 'drawLogs 0.4s forwards' }} />
                </g>
              )}
            </svg>
          }
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); setIsLit(!isLit); forceClose(); }}
      />
    </group>
  );
}

export function Sign(props: any) {
  const ref = usePopIn(props.scale || 1);
  const setEditingSignId = useGameStore(s => s.setEditingSignId);
  const text: string = props.text || '';
  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
      {/* 柱子 */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.14, 1.2, 0.14]} />
        <meshStandardMaterial color="#6b4423" flatShading />
      </mesh>
      {/* 牌面（点击编辑，仅选择模式下） */}
      <mesh
        position={[0, 1.4, 0]}
        castShadow
        onClick={(e: any) => {
          if (useGameStore.getState().selectedTool !== 'none') return;
          e.stopPropagation();
          setEditingSignId(props.assetId);
        }}
        onPointerOver={() => { if (useGameStore.getState().selectedTool === 'none') document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[1.7, 1.0, 0.12]} />
        <meshStandardMaterial color="#b08147" flatShading />
      </mesh>
      {/* 边框 */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.82, 1.12, 0.08]} />
        <meshStandardMaterial color="#5c3d22" flatShading />
      </mesh>
      {/* 文字（HTML，支持中文） */}
      <Html position={[0, 1.4, 0.08]} center transform distanceFactor={5} style={{ pointerEvents: 'none' }}>
        <div style={{ width: 150, textAlign: 'center', fontFamily: "'ZCOOL KuaiLe', cursive", color: text ? '#3b2410' : '#8a6a45', fontWeight: 700, fontSize: 15, lineHeight: 1.25, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'none' }}>
          {text || '点击写字'}
        </div>
      </Html>
    </group>
  );
}

export function Mailbox(props: any) {
  const ref = usePopIn(props.scale || 1);
  const setMailboxOpen = useGameStore(s => s.setMailboxOpen);
  const setFocusPoint = useGameStore(s => s.setFocusPoint);
  const unreadCount = useGameStore(s => s.unreadCount);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();

  const isHoverActive = showHover || unreadCount > 0;

  return (
    <group position={[props.position.x, props.position.y, props.position.z]} rotation={[0, props.rotation.y, 0]} ref={ref}>
      {/* Stone Base */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.2, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} flatShading />
      </mesh>
      {/* Wooden Post */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.15, 1.0, 0.15]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} flatShading />
      </mesh>
      {/* Hover UI Button */}
      <group position={[0, 1.2, 0]}>
        <HoverButton
          showHover={isHoverActive}
          isHoverLeaving={isHoverLeaving && unreadCount === 0}
          keepHoverAlive={keepHoverAlive}
          yOffset={1.0}
          iconSvg={
            <div style={{ position: 'relative' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
                {/* Envelope back body */}
                <path d="M3 8 h18 v11 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z" />
                {/* Paper sliding out */}
                <rect x="6" y="8" width="12" height="10" strokeDasharray="40" strokeDashoffset="40" style={{ animation: 'paperSlideUp 0.6s 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }} fill="#fff" />
                {/* Envelope flap opening */}
                <path d="M3 8 L12 14 L21 8" style={{ transformOrigin: 'center 8px', animation: 'envelopeFlapOpen 0.5s 0.1s forwards' }} />
              </svg>
              {unreadCount > 0 && (
                 <div style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', border: '2px solid white', animation: 'bubblePopIn 0.3s' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                 </div>
              )}
            </div>
          }
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); setMailboxOpen(true); setFocusPoint([props.position.x, props.position.y, props.position.z]); forceClose(); }}
        />
      </group>
      {/* Mailbox Box Group */}
      <group
        position={[0, 1.2, 0]}
        onClick={(e: any) => {
          if (useGameStore.getState().selectedTool !== 'none') return;
          e.stopPropagation();
          AudioSystem.playClick();
          setMailboxOpen(true);
          setFocusPoint([props.position.x, props.position.y, props.position.z]);
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
        {/* Main Box */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.4, 0.6]} />
          <meshStandardMaterial color="#0f766e" roughness={0.7} flatShading />
        </mesh>
        {/* Slanted Roof Left */}
        <mesh position={[-0.15, 0.3, 0]} rotation={[0, 0, 0.5]} castShadow>
          <boxGeometry args={[0.4, 0.05, 0.7]} />
          <meshStandardMaterial color="#334155" roughness={0.8} flatShading />
        </mesh>
        {/* Slanted Roof Right */}
        <mesh position={[0.15, 0.3, 0]} rotation={[0, 0, -0.5]} castShadow>
          <boxGeometry args={[0.4, 0.05, 0.7]} />
          <meshStandardMaterial color="#334155" roughness={0.8} flatShading />
        </mesh>
        {/* Letter Slot */}
        <mesh position={[0, 0.05, 0.31]}>
          <boxGeometry args={[0.3, 0.04, 0.02]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Letter inside slot (glows) */}
        <mesh position={[0, 0.05, 0.32]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.02, 0.05]} />
          <meshStandardMaterial color="#fcf8ec" emissive="#fcf8ec" emissiveIntensity={0.5} />
        </mesh>
        {/* Animated Flag Stick */}
        <mesh position={[0.28, 0.1, 0.1]} rotation={[0, 0, showHover ? -0.5 : 0.2]} castShadow>
          <boxGeometry args={[0.04, 0.3, 0.04]} />
          <meshStandardMaterial color="#7f1d1d" flatShading />
          {/* Flag Banner */}
          <mesh position={[0.08, 0.07, 0]} rotation={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.16, 0.12, 0.02]} />
            <meshStandardMaterial color="#dc2626" flatShading />
          </mesh>
        </mesh>
      </group>
    </group>
  );
}

export function Bench(props: any) {
  const ref = usePopIn(props.scale || 1);
  const setFocusPoint = useGameStore(s => s.setFocusPoint);
  const { showHover, isHoverLeaving, keepHoverAlive, forceClose } = useHoverInteraction();

  return (
    <group
      position={[props.position.x, props.position.y, props.position.z]}
      rotation={[0, props.rotation.y, 0]}
      ref={ref}
      onClick={(e: any) => {
        if (useGameStore.getState().selectedTool !== 'none') return;
        e.stopPropagation();
        AudioSystem.playClick();
        setFocusPoint([props.position.x, props.position.y, props.position.z]);
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
          showHover={showHover} isHoverLeaving={isHoverLeaving} keepHoverAlive={keepHoverAlive} yOffset={1.4}
          iconSvg={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'seatDropIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}><path d="M2 12h20"/><path d="M12 2v20"/><path d="M5 12A7 7 0 0 1 19 12"/></svg>}
          onClick={(e: any) => { e.stopPropagation(); AudioSystem.playClick(); setFocusPoint([props.position.x, props.position.y, props.position.z]); forceClose(); }}
      />

      {/* Legs */}
      <mesh position={[-0.8, 0.25, -0.2]} castShadow>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[0.8, 0.25, -0.2]} castShadow>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[-0.8, 0.45, 0.2]} rotation={[-Math.PI/12, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>
      <mesh position={[0.8, 0.45, 0.2]} rotation={[-Math.PI/12, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>

      {/* Seat Planks */}
      <mesh position={[0, 0.5, -0.2]} castShadow>
        <boxGeometry args={[2.0, 0.08, 0.15]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.0, 0.08, 0.15]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0.2]} castShadow>
        <boxGeometry args={[2.0, 0.08, 0.15]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>

      {/* Backrest Planks */}
      <mesh position={[0, 0.7, 0.3]} rotation={[-Math.PI/12, 0, 0]} castShadow>
        <boxGeometry args={[2.0, 0.12, 0.05]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.85, 0.35]} rotation={[-Math.PI/12, 0, 0]} castShadow>
        <boxGeometry args={[2.0, 0.12, 0.05]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}
