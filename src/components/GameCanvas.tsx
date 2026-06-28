import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html, PivotControls } from '@react-three/drei';
import { PomodoroTimer } from './PomodoroTimer';
import { IslandClock } from './IslandClock';
import { Suspense, useRef, useEffect, useState } from 'react';
import { Terrain } from './Terrain';
import { Water } from './Water';
import { BoatWake } from './assets/marine';
import { SkySystem, WeatherSystem, FirefliesSystem } from './SkySystem';
import { ConstellationGame } from './game/ConstellationGame';
import { TelescopeControls } from './game/TelescopeControls';
import { updateHeightField } from '../game/water/heightField';
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
  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      keys.current[k] = true;
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
    state.camera.getWorldDirection(fwd.current);
    fwd.current.y = 0;
    fwd.current.normalize();
    right.current.crossVectors(fwd.current, state.camera.up).normalize();

    desiredVelocity.current
      .set(0, 0, 0)
      .addScaledVector(fwd.current, mz)
      .addScaledVector(right.current, mx);

    if (desiredVelocity.current.lengthSq() > 0) {
      desiredVelocity.current.normalize().multiplyScalar(25);
    }

    const blend = 1 - Math.exp(-delta * 10);
    velocity.current.lerp(desiredVelocity.current, blend);

    if (velocity.current.lengthSq() < 0.0001) {
      velocity.current.set(0, 0, 0);
      return;
    }

    move.current.copy(velocity.current).multiplyScalar(delta);
    state.camera.position.add(move.current);
    c.target.add(move.current);

    if (move.current.lengthSq() > 0 && !useGameStore.getState().tutorialPanDone) {
      if (!c.panAccum) c.panAccum = 0;
      c.panAccum += move.current.length();
      const progress = Math.min(1, c.panAccum / 5);
      useGameStore.getState().setTutorialPanProgress(progress);
      if (c.panAccum > 5) {
        useGameStore.getState().setTutorialPanDone(true);
      }
    }
  });

  return null;
}

function BoatCameraFollow({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const drivingBoatId = useGameStore(state => state.drivingBoatId);
  const targetPos = useRef(new THREE.Vector3());
  const beforeTarget = useRef(new THREE.Vector3());
  const targetDelta = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!drivingBoatId) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const gWindow = window as any;
    if (gWindow.__assetPositions && gWindow.__assetPositions[drivingBoatId]) {
      const mesh = gWindow.__assetPositions[drivingBoatId] as THREE.Object3D;
      mesh.getWorldPosition(targetPos.current);
      
      // Smoothly move the target
      const lerpSpeed = 1 - Math.exp(-delta * 8);
      
      // Move camera position by the same amount the target moves to keep relative distance
      beforeTarget.current.copy(controls.target);
      controls.target.lerp(targetPos.current, lerpSpeed);
      targetDelta.current.copy(controls.target).sub(beforeTarget.current);
      state.camera.position.add(targetDelta.current);
    }
  });
  return null;
}

function CameraFocusPan({ controlsRef }: { controlsRef: any }) {
  const focusPoint = useGameStore(s => s.focusPoint);
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3());
  const camTarget = useRef(new THREE.Vector3());
  
  useFrame((state, dt) => {
    if (!focusPoint || !controlsRef.current) return;
    targetVec.current.set(focusPoint[0], focusPoint[1], focusPoint[2]);
    // Target camera slightly back and up from the object
    camTarget.current.set(focusPoint[0], focusPoint[1] + 5, focusPoint[2] + 8);
    
    controlsRef.current.target.lerp(targetVec.current, dt * 4.0);
    camera.position.lerp(camTarget.current, dt * 4.0);
    
    if (controlsRef.current.target.distanceTo(targetVec.current) < 0.1) {
      useGameStore.getState().setFocusPoint(null);
    }
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
  const gestureBaseDistanceRef = useRef<number | null>(null);
  const zoomAccumRef = useRef(0);
  const offset = useRef(new THREE.Vector3());

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
      if (!useGameStore.getState().tutorialZoomDone) {
        zoomAccumRef.current += Math.abs(e.deltaY);
        const progress = Math.min(1, zoomAccumRef.current / 150);
        useGameStore.getState().setTutorialZoomProgress(progress);
        if (zoomAccumRef.current > 150) {
          useGameStore.getState().setTutorialZoomDone(true);
        }
      }
    };

    const readGestureScale = (e: Event) => {
      return typeof (e as Event & { scale?: number }).scale === 'number'
        ? (e as Event & { scale: number }).scale
        : 1;
    };

    const onGestureStart = (e: Event) => {
      e.preventDefault();
      const camera = controls.object as THREE.Camera;
      gestureBaseDistanceRef.current = camera.position.distanceTo(controls.target);
    };

    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const scale = readGestureScale(e);
      const baseDistance = gestureBaseDistanceRef.current;
      if (!baseDistance || scale <= 0) return;
      targetRef.current = THREE.MathUtils.clamp(
        baseDistance / scale,
        minDistance,
        maxDistance
      );
      if (!useGameStore.getState().tutorialZoomDone) {
        zoomAccumRef.current += Math.abs(1 - scale) * 1000;
        const progress = Math.min(1, zoomAccumRef.current / 200);
        useGameStore.getState().setTutorialZoomProgress(progress);
        if (zoomAccumRef.current > 200) {
          useGameStore.getState().setTutorialZoomDone(true);
        }
      }
    };

    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      gestureBaseDistanceRef.current = null;
    };

    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('gesturestart', onGestureStart, { passive: false });
    dom.addEventListener('gesturechange', onGestureChange, { passive: false });
    dom.addEventListener('gestureend', onGestureEnd, { passive: false });
    mountedRef.current = true;
  });

  const isReturningFromSky = useRef(false);
  const isEnteringSky = useRef(false);
  const wasObservatoryMode = useRef(false);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object as THREE.PerspectiveCamera;
    
    const focusTarget = useGameStore.getState().cameraFocus;
    const isObservatoryMode = useGameStore.getState().isObservatoryMode;

    if (focusTarget) {
      // Cinematic focus on a specific point (e.g. Spirit Seed)
      const targetVec = new THREE.Vector3(...focusTarget);
      controls.target.lerp(targetVec, delta * 4);
      controls.update();
      // Keep distance logic active so it zooms nicely
      if (targetRef.current !== null) {
        const current = camera.position.distanceTo(controls.target);
        const next = THREE.MathUtils.damp(current, targetRef.current, 8, delta);
        offset.current.copy(camera.position).sub(controls.target);
        if (offset.current.lengthSq() > 0) {
          offset.current.setLength(next);
          camera.position.copy(controls.target).add(offset.current);
        }
      }
      return;
    }

    // 观星模式由 TelescopeControls 接管相机，旧的仰视平移逻辑全部跳过
    if (isObservatoryMode) { wasObservatoryMode.current = true; return; }
    if (wasObservatoryMode.current) { wasObservatoryMode.current = false; }

    if (isEnteringSky.current) {
      controls.target.lerp(new THREE.Vector3(0, 110, -40), delta * 5);
      camera.position.lerp(new THREE.Vector3(0, 5, -39.9), delta * 5);
      controls.update();
      if (targetRef.current !== null) {
        targetRef.current = camera.position.distanceTo(controls.target);
      }
      if (controls.target.y > 105 && camera.position.y < 10) {
        isEnteringSky.current = false;
      }
      return;
    }

    if (isReturningFromSky.current) {
      controls.target.lerp(new THREE.Vector3(0, 0, 0), delta * 3);
      camera.position.lerp(new THREE.Vector3(0, 40, 80), delta * 3);
      controls.update();
      if (targetRef.current !== null) {
        targetRef.current = camera.position.distanceTo(controls.target);
      }
      if (controls.target.lengthSq() < 1) {
        isReturningFromSky.current = false;
      }
      return;
    }
    if (isObservatoryMode) {
      // 允许缩放和平移，但强制摄像机永远处于目标正下方，实现完美的 2D 俯视/仰视效果
      controls.target.y = 110;
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -50, 50);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -80, 0);
      camera.position.x = controls.target.x;
      camera.position.z = controls.target.z + 0.1; // 极小的偏移避免 OrbitControls 的万向节死锁
      controls.update();
      if (targetRef.current !== null) {
        targetRef.current = camera.position.distanceTo(controls.target);
      }
      return;
    }

    // 限制正常海岛模式下的平移范围
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -60, 60);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -60, 60);

    if (targetRef.current !== null) {
      const current = camera.position.distanceTo(controls.target);
      const next = THREE.MathUtils.damp(current, targetRef.current, 8, delta);
      offset.current.copy(camera.position).sub(controls.target);
      if (offset.current.lengthSq() > 0) {
        offset.current.setLength(next);
        camera.position.copy(controls.target).add(offset.current);
      }
    }
  });

  return null;
}

// 地形高度场：terrainData 变更时重建一次，供体积水着色器采样水深
function HeightFieldSync() {
  const terrainData = useGameStore(state => state.terrainData);
  useEffect(() => { updateHeightField(); }, [terrainData]);
  return null;
}

export function GameCanvas({ immersive = false, timer3D = false, autoRotateOn = true }: { immersive?: boolean; timer3D?: boolean; autoRotateOn?: boolean }) {
  const isDrawing = useGameStore(state => state.isDrawing);
  const screen = useGameStore(state => state.screen);
  const assetCount = useGameStore(state => state.assets.length);
  const drivingBoatId = useGameStore(state => state.drivingBoatId);
  const isObservatoryMode = useGameStore(s => s.isObservatoryMode);
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
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1
        }}
      >
        <Suspense fallback={null}>
          <SkySystem />
          <WeatherSystem />
          <FirefliesSystem />
          
          <HeightFieldSync />
          <Terrain />
          <Water />
          {/* Interactive Objects */}
          <Assets />
          <ConstellationGame />
          <TelescopeControls active={isObservatoryMode} />
          
          <BoatWake />

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
        {!isTouch && !drivingBoatId && !isObservatoryMode && <WASDControls controlsRef={orbitRef} />}
        {!isTouch && !isObservatoryMode && <SmoothZoom controlsRef={orbitRef} minDistance={5} maxDistance={120} />}
        <CameraFocusPan controlsRef={orbitRef} />
        <BoatCameraFollow controlsRef={orbitRef} />
        <OrbitControls
          ref={orbitRef}
          enabled={enableOrbitControls && !isObservatoryMode}
          onChange={() => {
            const state = useGameStore.getState();
            const controls = orbitRef.current;
            if (controls && state.screen === 'PLAYING' && !state.tutorialRotateDone) {
              if (controls.lastAzimuth !== undefined) {
                const diff = Math.abs(controls.getAzimuthalAngle() - controls.lastAzimuth);
                if (diff > 0.001) {
                  controls.rotateAccum = (controls.rotateAccum || 0) + diff;
                  const progress = Math.min(1, controls.rotateAccum / 0.5);
                  state.setTutorialRotateProgress(progress);
                  if (controls.rotateAccum > 0.5) {
                    state.setTutorialRotateDone(true);
                  }
                }
              }
              controls.lastAzimuth = controls.getAzimuthalAngle();
            }
          }}
          autoRotate={screen !== 'PLAYING' || (immersive && autoRotateOn)}
          autoRotateSpeed={0.8}
          maxPolarAngle={isObservatoryMode ? Math.PI : Math.PI / 2 - 0.05}
          minPolarAngle={isObservatoryMode ? 0 : Math.PI / 6}
          minDistance={1}
          maxDistance={isObservatoryMode ? 60 : 120}
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
        {timer3D && immersive && <IslandClock />}
      </Canvas>
    </div>
  );
}
