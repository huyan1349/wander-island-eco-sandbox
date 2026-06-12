import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { Suspense } from 'react';
import { Terrain } from './Terrain';
import { Water } from './Water';
import { SkySystem, WeatherSystem, FirefliesSystem } from './SkySystem';
import { Assets } from './Assets';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, HueSaturation } from '@react-three/postprocessing';
import { useGameStore } from '../store';

export function GameCanvas() {
  const isDrawing = useGameStore(state => state.isDrawing);
  const selectedTool = useGameStore(state => state.selectedTool);
  const screen = useGameStore(state => state.screen);
  
  // Disable orbit controls if we are using brush, or if we have a tool selected maybe?
  // Let's only disable it while actively drawing, so user can still rotate if they drag outside terrain.
  const enableOrbitControls = !isDrawing;

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
        <OrbitControls 
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
