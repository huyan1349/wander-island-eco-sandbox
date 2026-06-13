import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, PivotControls } from '@react-three/drei';
import { PomodoroTimer } from './PomodoroTimer';
import { Suspense, useRef, useEffect, useState } from 'react';
import { Terrain } from './Terrain';
import { Water } from './Water';
import { SkySystem, WeatherSystem, FirefliesSystem } from './SkySystem';
import { Assets } from './Assets';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, HueSaturation } from '@react-three/postprocessing';
import { useGameStore } from '../store';

// 触屏检测 hook
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const hasCoarse = window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const result = hasCoarse || hasTouch;
    setIsTouch(result);
    if (result) {
      document.documentElement.classList.add('is-touch');
    }
  }, []);
  return isTouch;
}

// WASD pans the camera (and orbit target) along the camera's horizontal axes
function WASDControls({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const desiredVelocity = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((state, delta) => {
    const c = controlsRef.current;
    if (!c) return;
    const k = keys.current;
    let mx = 0, mz = 0;
    if (k['w']) mz += 1;
    if (k['s']) mz -= 1;
    if (k['a']) mx -= 1;
    if (k['d']) mx += 1;
    const fwd = new THREE.Vector3();
    state.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, state.camera.up).normalize();

    desiredVelocity.current
      .set(0, 0, 0)
      .addScaledVector(fwd, mz)
      .addScaledVector(right, mx);

    if (desiredVelocity.current.lengthSq() > 0) {
      desiredVelocity.current.normalize().multiplyScalar(25);
    }

    const blend = 1 - Math.exp(-delta * 10);
    velocity.current.lerp(desiredVelocity.current, blend);

    if (velocity.current.lengthSq() < 0.0001) {
      velocity.current.set(0, 0, 0);
      return;
    }

    const move = velocity.current.clone().multiplyScalar(delta);
    state.camera.position.add(move);
    c.target.add(move);
  });

  return null;
}

function SmoothZoom({ controlsRef, minDistance, maxDistance }: {
  controlsRef: React.RefObject<any>;
  minDistance: number;
  maxDistance: number;
}) {
  const targetRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || mountedRef.current) return;

    const dom = controls.domElement as HTMLElement | undefined;
    if (!dom) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const camera = controls.object as THREE.Camera;
      const current = camera.position.distanceTo(controls.target);
      targetRef.current = THREE.MathUtils.clamp(
        current * Math.exp(e.deltaY * 0.024),
        minDistance,
        maxDistance
      );
    };

    dom.addEventListener('wheel', onWheel, { passive: false });
    mountedRef.current = true;
  });

  useFrame((_, delta) => {
    if (targetRef.current === null) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const camera = controls.object as THREE.PerspectiveCamera;
    const current = camera.position.distanceTo(controls.target);
    const next = THREE.MathUtils.damp(current, targetRef.current, 8, delta);

    const offset = camera.position.clone().sub(controls.target);
    if (offset.lengthSq() === 0) return;
    offset.setLength(next);
    camera.position.copy(controls.target).add(offset);
  });

  return null;
}

export function GameCanvas({ immersive = false, timer3D = false }: { immersive?: boolean; timer3D?: boolean }) {
  const isDrawing = useGameStore(state => state.isDrawing);
  const screen = useGameStore(state => state.screen);
  const assetCount = useGameStore(state => state.assets.length);
  const isTouch = useIsTouchDevice();
  
  const enableOrbitControls = !isDrawing;
  const orbitRef = useRef<any>(null);

  return (
    <div className="w-full h-full bg-slate-950" style={{ touchAction: 'none' }}>
      <Canvas 
        dpr={[1, 1.25]}
        shadows 
        camera={{ position: [50, 4, 50], fov: 45 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1
        }}
      >
        <Suspense fallback={null}>
          <SkySystem />
          <WeatherSystem />
          <FirefliesSystem />
          
          <Terrain />
          <Water />
          <Assets />

          {assetCount === 0 && (
             <group position={[15, -0.1, 15]}>
                <mesh castShadow receiveShadow>
                   <dodecahedronGeometry args={[2, 1]} />
                   <meshStandardMaterial color="#4b5563" flatShading />
                </mesh>
                <Text
                   position={[0, 1, 1.8]}
                   rotation={[0, 0, 0]}
                   fontSize={0.4}
                   color="#f8fafc"
                   anchorX="center"
                   anchorY="middle"
                >
                   Little Bit{"\n"}ISLAND
                </Text>
             </group>
          )}

          <EffectComposer multisampling={0}>
             <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.8} intensity={1.5} mipmapBlur />
             <HueSaturation saturation={0.3} hue={0} />
             <Vignette eskil={false} offset={0.15} darkness={0.8} />
          </EffectComposer>
        </Suspense>
        {!isTouch && <WASDControls controlsRef={orbitRef} />}
        {!isTouch && <SmoothZoom controlsRef={orbitRef} minDistance={5} maxDistance={120} />}
        <OrbitControls
          ref={orbitRef}
          enabled={enableOrbitControls}
          autoRotate={screen !== 'PLAYING' || immersive}
          autoRotateSpeed={0.8}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={5}
          maxDistance={120}
          target={[0, 0, 0]}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
          }}
          enableDamping={true}
          dampingFactor={0.12}
          rotateSpeed={isTouch ? 0.45 : 0.85}
          enableZoom={isTouch}
          zoomSpeed={0.8}
          enablePan={true}
          panSpeed={isTouch ? 0.55 : 0.85}
        />
        {timer3D && immersive && (
          <PivotControls anchor={[0, 0, 0]} scale={2.5} depthTest={false} lineWidth={2} disableRotations>
            <Html transform occlude position={[0, 3, 0]} distanceFactor={10}>
              <PomodoroTimer />
            </Html>
          </PivotControls>
        )}
      </Canvas>
    </div>
  );
}
