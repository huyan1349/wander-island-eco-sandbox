import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';

export function DepthWater() {
  return null;
}

export function FlowRibbon({ geometry }: { geometry?: THREE.BufferGeometry }) {
  return null;
}

export function WaterfallSheet({ width, height }: { width: number, height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#38bdf8') },
    uFoamColor: { value: new THREE.Color('#ffffff') }
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
      <planeGeometry args={[width, height, 16, 16]} />
      <meshPhysicalMaterial 
        color="#38bdf8" 
        transparent 
        opacity={0.85} 
        roughness={0.1}
        transmission={0.9}
        thickness={0.5}
        onBeforeCompile={(shader) => {
          shader.uniforms.uTime = uniforms.uTime;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
             uniform float uTime;
             varying vec2 vUv;`
          ).replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             vUv = uv;
             float wave = sin(uv.x * 10.0 + uTime * 5.0) * 0.05 * (1.0 - uv.y);
             transformed.z += wave;`
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
             uniform float uTime;
             varying vec2 vUv;`
          ).replace(
            '#include <color_fragment>',
            `#include <color_fragment>
             float streak = sin(vUv.x * 20.0 + uTime * 10.0) * 0.5 + 0.5;
             float fall = fract(vUv.y * 5.0 - uTime * 2.0);
             if (fall > 0.8 && streak > 0.8) {
                 diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), 0.5);
             }
             // Foam at bottom
             if (vUv.y < 0.1) {
                 diffuseColor.rgb = mix(vec3(1.0), diffuseColor.rgb, vUv.y * 10.0);
                 diffuseColor.a = 1.0;
             }`
          );
        }}
      />
    </mesh>
  );
}
