import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, PlacedAsset } from '../../store';
import { buildTrack, decodeTrackState } from '../../game/train/trackSystem';
import { usePopIn } from './shared';

const TRACK_COLOR = '#6b7280';
const WOOD_COLOR = '#78350f';
const METAL_COLOR = '#374151';

// =============== TRACK COMPONENT ===============

export function TrackAsset({ asset }: { asset: PlacedAsset }) {
  const groupRef = usePopIn(1);

  const build = useMemo(() => {
    const pts = decodeTrackState(asset.customState);
    if (!pts) return null;
    return buildTrack(pts);
  }, [asset.customState]);

  if (!build || !build.meshGeometry) return null;

  return (
    <group ref={groupRef} position={[asset.position.x, asset.position.y, asset.position.z]}>
      {/* Rails - build.meshGeometry is generated in world coordinates, so we subtract asset.position */}
      <mesh geometry={build.meshGeometry} position={[-asset.position.x, -asset.position.y, -asset.position.z]} castShadow receiveShadow>
         <meshStandardMaterial color={TRACK_COLOR} roughness={0.4} metalness={0.8} flatShading />
      </mesh>

      {/* Ties (Sleepers) */}
      {build.ties && build.ties.map((tie, i) => (
        <mesh key={`tie-${i}`} position={[tie.x - asset.position.x, tie.y - asset.position.y, tie.z - asset.position.z]} rotation={[0, tie.rotation, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.05, 0.2]} />
          <meshStandardMaterial color={WOOD_COLOR} flatShading />
        </mesh>
      ))}

      {/* Trestle bridge supports where track is high above ground */}
      {build.bridgePillars.map((pillar, i) => (
        <group key={i} position={[pillar.x - asset.position.x, pillar.y - asset.position.y, pillar.z - asset.position.z]}>
           {/* Wooden pillar logs */}
           <mesh position={[-0.4, -pillar.height / 2, 0]} castShadow>
               <cylinderGeometry args={[0.08, 0.08, pillar.height, 6]} />
               <meshStandardMaterial color={WOOD_COLOR} flatShading />
           </mesh>
           <mesh position={[0.4, -pillar.height / 2, 0]} castShadow>
               <cylinderGeometry args={[0.08, 0.08, pillar.height, 6]} />
               <meshStandardMaterial color={WOOD_COLOR} flatShading />
           </mesh>
           {/* Cross braces */}
           {Array.from({ length: Math.floor(pillar.height) }).map((_, j) => (
             <mesh key={j} position={[0, -j - 0.5, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                 <boxGeometry args={[1.2, 0.08, 0.08]} />
                 <meshStandardMaterial color={WOOD_COLOR} flatShading />
             </mesh>
           ))}
        </group>
      ))}
    </group>
  );
}

// =============== TRAIN COMPONENT ===============

export function TrainAsset({ asset }: { asset: PlacedAsset }) {
  const groupRef = usePopIn(asset.scale || 1);
  const trainBodyRef = useRef<THREE.Group>(null);
  const wheelsGroupRef = useRef<THREE.Group>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState(1);

  const currentDistanceRef = useRef(0);
  const selected = useGameStore(s => s.selectedEntityId === asset.id);

  const trackCurveData = useMemo(() => {
     const assets = useGameStore.getState().assets;
     let closestCurve: THREE.CatmullRomCurve3 | null = null;
     let minDistance = Infinity;
     let initialT = 0;
     let trackPos = new THREE.Vector3();

     assets.forEach(a => {
         if (a.type === 'track' && a.customState) {
             const pts = decodeTrackState(a.customState);
             if (pts) {
                 const build = buildTrack(pts);
                 if (build.curve) {
                     for (let t = 0; t <= 1; t += 0.05) {
                         const p = build.curve.getPointAt(t);
                         p.add(new THREE.Vector3(a.position.x, a.position.y, a.position.z));
                         const dist = p.distanceTo(new THREE.Vector3(asset.position.x, asset.position.y, asset.position.z));
                         if (dist < minDistance) {
                             minDistance = dist;
                             closestCurve = build.curve;
                             initialT = t;
                             trackPos.set(a.position.x, a.position.y, a.position.z);
                         }
                     }
                 }
             }
         }
     });

     if (closestCurve) {
         const curveLength = (closestCurve as THREE.Curve<THREE.Vector3>).getLength();
         return {
             curve: closestCurve as THREE.Curve<THREE.Vector3>,
             length: curveLength,
             startDist: initialT * curveLength,
             trackOffset: trackPos
         };
     }
     return null;
  }, [asset.position.x, asset.position.y, asset.position.z, asset.customState]);

  useEffect(() => {
     if (trackCurveData) {
         currentDistanceRef.current = trackCurveData.startDist;
     }
  }, [trackCurveData]);

  useFrame((state, delta) => {
      if (!groupRef.current || !trainBodyRef.current) return;

      const speed = isPlaying ? 2.0 : 0;

      if (trackCurveData) {
          const { curve, length, trackOffset } = trackCurveData;

          currentDistanceRef.current += speed * delta * direction;

          if (currentDistanceRef.current > length) {
              currentDistanceRef.current = length;
              setDirection(-1);
          } else if (currentDistanceRef.current < 0) {
              currentDistanceRef.current = 0;
              setDirection(1);
          }

          const t = currentDistanceRef.current / length;
          const pos = curve.getPointAt(t);
          const tangent = curve.getTangentAt(t).normalize();

          groupRef.current.position.set(
              pos.x + trackOffset.x,
              pos.y + trackOffset.y + 0.1, // Lift slightly so wheels touch rail
              pos.z + trackOffset.z
          );

          groupRef.current.rotation.y = Math.atan2(tangent.x, tangent.z);
          const pitch = Math.asin(tangent.y);
          groupRef.current.rotation.x = -pitch;

      } else {
          groupRef.current.position.set(asset.position.x, asset.position.y, asset.position.z);
      }

      trainBodyRef.current.rotation.y = direction === -1 ? Math.PI : 0;

      const wheelRot = speed * delta * 4.0;
      if (wheelsGroupRef.current) {
         wheelsGroupRef.current.children.forEach(w => w.rotation.x -= wheelRot * direction);
      }
  });

  return (
    <group ref={groupRef} scale={asset.scale || 1} onClick={(e) => {
        e.stopPropagation();
        useGameStore.getState().setSelectedEntityId(asset.id);
    }}>
        {/* === Simple Minecraft-style Minecart === */}
        <group ref={trainBodyRef}>
            {/* Base platform */}
            <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.0, 0.1, 1.2]} />
                <meshStandardMaterial color="#6b7280" roughness={0.7} flatShading />
            </mesh>

            {/* Front Wall */}
            <mesh position={[0, 0.4, 0.55]} castShadow receiveShadow>
                <boxGeometry args={[1.0, 0.4, 0.1]} />
                <meshStandardMaterial color="#4b5563" roughness={0.7} flatShading />
            </mesh>

            {/* Back Wall */}
            <mesh position={[0, 0.4, -0.55]} castShadow receiveShadow>
                <boxGeometry args={[1.0, 0.4, 0.1]} />
                <meshStandardMaterial color="#4b5563" roughness={0.7} flatShading />
            </mesh>

            {/* Left Wall */}
            <mesh position={[-0.45, 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.1, 0.4, 1.0]} />
                <meshStandardMaterial color="#4b5563" roughness={0.7} flatShading />
            </mesh>

            {/* Right Wall */}
            <mesh position={[0.45, 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.1, 0.4, 1.0]} />
                <meshStandardMaterial color="#4b5563" roughness={0.7} flatShading />
            </mesh>

            {/* Wheels */}
            <group ref={wheelsGroupRef}>
                {[-0.35, 0.35].map((zPos, i) => (
                    <React.Fragment key={`wheel-${i}`}>
                        <mesh position={[-0.45, 0.1, zPos]} rotation={[0, 0, Math.PI / 2]} castShadow>
                            <cylinderGeometry args={[0.1, 0.1, 0.08, 12]} />
                            <meshStandardMaterial color="#1f2937" flatShading />
                        </mesh>
                        <mesh position={[0.45, 0.1, zPos]} rotation={[0, 0, Math.PI / 2]} castShadow>
                            <cylinderGeometry args={[0.1, 0.1, 0.08, 12]} />
                            <meshStandardMaterial color="#1f2937" flatShading />
                        </mesh>
                    </React.Fragment>
                ))}
            </group>
        </group>

        {selected && (
            <Html position={[0, 1.5, 0]} center zIndexRange={[100, 0]}>
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 pointer-events-auto origin-bottom" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}>
                    <div className="bg-white/95 backdrop-blur-md px-5 py-3.5 flex flex-col gap-3 rounded-2xl border-2 border-slate-200" style={{ boxShadow: 'inset 0 2px 0 0 rgba(255,255,255,1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100">
                            <span className="text-xl">🛒</span>
                            <span className="text-slate-800 font-bold text-sm tracking-widest px-1">运输矿车</span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center hover:bg-white hover:scale-110 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-400 transition-all active:scale-95 group">
                                <span className="text-lg font-bold text-slate-700 group-hover:text-emerald-500">{isPlaying ? '⏸' : '▶️'}</span>
                            </button>
                            <button onClick={() => setDirection(d => -d)} className="w-10 h-10 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center hover:bg-white hover:scale-110 hover:-translate-y-1 hover:shadow-lg hover:border-blue-400 transition-all active:scale-95 group" title="掉头">
                                <span className="text-lg font-bold text-slate-700 group-hover:text-blue-500">🔄</span>
                            </button>
                        </div>
                    </div>
                    <div className="w-5 h-5 bg-white/95 border-r-2 border-b-2 border-slate-200 rotate-45 -mt-2.5" />
                </div>
            </Html>
        )}
    </group>
  );
}
