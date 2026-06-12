import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { Suspense, useRef, useEffect } from 'react';
import { Terrain } from './Terrain';
import { Water } from './Water';
import { SkySystem, WeatherSystem, FirefliesSystem } from './SkySystem';
import { Assets } from './Assets';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, HueSaturation, DepthOfField } from '@react-three/postprocessing';
import { useGameStore } from '../store';

// WASD pans the camera (and orbit target) along the camera's horizontal axes
function WASDControls({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const keys = useRef<Record<string, boolean>>({});

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
    if (!mx && !mz) return;

    const speed = 25 * delta;
    const fwd = new THREE.Vector3();
    state.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, state.camera.up).normalize();
    const move = new THREE.Vector3()
      .addScaledVector(fwd, mz * speed)
      .addScaledVector(right, mx * speed);
    state.camera.position.add(move);
    c.target.add(move);
  });

  return null;
}

function CinematicEntry({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const screen = useGameStore(state => state.screen);
  const { camera } = useThree();
  const [animating, setAnimating] = useState(false);
  const tRef = useRef(0);
  
  // Starting high in the sky looking down
  const startPos = new THREE.Vector3(20, 100, 20);
  const endPos = new THREE.Vector3(50, 4, 50);
  
  const startTarget = new THREE.Vector3(15, -20, 15);
  const endTarget = new THREE.Vector3(0, 0, 0);

  useEffect(() => {
    if (screen === 'PLAYING') {
      setAnimating(true);
      tRef.current = 0;
      camera.position.copy(startPos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(startTarget);
        controlsRef.current.enabled = false;
        controlsRef.current.update();
      }
    }
  }, [screen, camera]);

  useFrame((state, delta) => {
    if (animating) {
      tRef.current += delta * 0.25; // 4 seconds animation
      if (tRef.current >= 1) {
        setAnimating(false);
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      } else {
        const t = tRef.current;
        // EaseOutExpo for a very dramatic swoop that slows down beautifully
        const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        
        camera.position.lerpVectors(startPos, endPos, ease);
        if (controlsRef.current) {
           controlsRef.current.target.lerpVectors(startTarget, endTarget, ease);
           controlsRef.current.update();
        }
      }
    }
  });

  return null;
}

export function GameCanvas() {
  const isDrawing = useGameStore(state => state.isDrawing);
  const selectedTool = useGameStore(state => state.selectedTool);
  const screen = useGameStore(state => state.screen);
  
  // Disable orbit controls if we are using brush, or if we have a tool selected maybe?
  // Let's only disable it while actively drawing, so user can still rotate if they drag outside terrain.
  const enableOrbitControls = !isDrawing;
  const orbitRef = useRef<any>(null);

  return (
    <div className="w-full h-full bg-slate-950">
      <Canvas 
        shadows 
        camera={{ position: [50, 4, 50], fov: 45 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Suspense fallback={null}>
          <SkySystem />
          <WeatherSystem />
          <FirefliesSystem />
          
          <Terrain />
          <Water />
          <Assets />

          {/* Little Bit ISLAND Rock */}
          {useGameStore(state => state.assets.length) === 0 && (
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

          {/* Post-processing for cinematic aesthetic */}
          <EffectComposer multisampling={4}>
             <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.8} intensity={1.5} mipmapBlur />
             <HueSaturation saturation={0.3} hue={0} />
             <Vignette eskil={false} offset={0.15} darkness={0.8} />
          </EffectComposer>
        </Suspense>
        <CinematicEntry controlsRef={orbitRef} />
        <WASDControls controlsRef={orbitRef} />
        <OrbitControls
          ref={orbitRef}
          enabled={enableOrbitControls}
          autoRotate={screen !== 'PLAYING'}
          autoRotateSpeed={0.8}
          maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below ground
          minDistance={5}
          maxDistance={120}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
