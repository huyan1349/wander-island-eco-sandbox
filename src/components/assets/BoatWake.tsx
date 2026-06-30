import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { globalBoatState } from '../../game/water/boatState';
import { getWaterHeight } from '../../game/water/oceanModel';
import { useGameStore } from '../../store';

const WAKE_MAX_POINTS = 70;
const WAKE_POINT_STEP = 0.55;
const WAKE_LIFETIME = 2.6;
const WAKE_SPEED_MIN = 1.2;
const SPRAY_MAX = 120;
const SPRAY_LIFE = 0.7;

function daylightFactor(tod: number) {
  return Math.max(0, Math.min(1, (tod - 5.5) / 1.5)) *
    Math.max(0, Math.min(1, (18.5 - tod) / 1.5));
}

type WakePoint = { x: number; z: number; px: number; pz: number; halfW: number; born: number };
type Spray = { x: number; y: number; z: number; vx: number; vy: number; vz: number; born: number };

export function BoatWake() {
  const weather = useGameStore((state) => state.weather);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const sprayGeomRef = useRef<THREE.BufferGeometry>(null);
  const points = useRef<WakePoint[]>([]);
  const lastDrop = useRef<{ x: number; z: number } | null>(null);
  const sprays = useRef<Spray[]>([]);

  const MAXV = WAKE_MAX_POINTS * 2;
  const positions = useMemo(() => new Float32Array(MAXV * 3), [MAXV]);
  const uvs = useMemo(() => new Float32Array(MAXV * 2), [MAXV]);
  const alphas = useMemo(() => new Float32Array(MAXV), [MAXV]);
  const indices = useMemo(() => {
    const idx: number[] = [];
    for (let i = 0; i < WAKE_MAX_POINTS - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      idx.push(a, c, b, b, c, d);
    }
    return new Uint16Array(idx);
  }, []);

  const sprayPos = useMemo(() => new Float32Array(SPRAY_MAX * 3), []);
  const sprayAlpha = useMemo(() => new Float32Array(SPRAY_MAX), []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uDaylight: { value: 1 } },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      varying vec2 vUv;
      void main() {
        vAlpha = aAlpha;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform float uDaylight;
      varying float vAlpha;
      varying vec2 vUv;
      void main() {
        float across = abs(vUv.x * 2.0 - 1.0);
        float edge = smoothstep(0.45, 1.0, across);
        float stripes = sin(vUv.y * 38.0 - uTime * 6.0) * 0.5 + 0.5;
        float churn = (1.0 - across) * stripes * 0.9;
        float foam = max(edge, churn);
        foam = smoothstep(0.22, 0.5, foam);
        float a = foam * vAlpha;
        if (a < 0.02) discard;
        vec3 col = mix(vec3(0.20, 0.25, 0.34), vec3(1.0), uDaylight);
        gl_FragColor = vec4(col, a);
      }`,
  }), []);

  const sprayMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uDaylight: { value: 1 } },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (14.0 + 26.0 * aAlpha) * (8.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uDaylight;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.18, d) * vAlpha;
        vec3 col = mix(vec3(0.22, 0.27, 0.36), vec3(1.0), uDaylight);
        gl_FragColor = vec4(col, a);
      }`,
  }), []);

  useEffect(() => {
    const geometry = geomRef.current;
    if (geometry) {
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    const sprayGeometry = sprayGeomRef.current;
    if (sprayGeometry) {
      sprayGeometry.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
      sprayGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(sprayAlpha, 1));
    }

    return () => {
      material.dispose();
      sprayMaterial.dispose();
    };
  }, [positions, uvs, alphas, indices, sprayPos, sprayAlpha, material, sprayMaterial]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const daylight = daylightFactor(useGameStore.getState().timeOfDay);
    material.uniforms.uTime.value = time;
    material.uniforms.uDaylight.value = daylight;
    sprayMaterial.uniforms.uDaylight.value = daylight;

    const geometry = geomRef.current;
    if (!geometry) return;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
    const alphaAttr = geometry.getAttribute('aAlpha') as THREE.BufferAttribute | undefined;
    if (!positionAttr || !uvAttr || !alphaAttr) return;

    const wakePoints = points.current;
    const { pos, dir, speed } = globalBoatState;

    if (speed > WAKE_SPEED_MIN) {
      const sternX = pos.x - dir.x * 1.0;
      const sternZ = pos.y - dir.y * 1.0;
      const moved = lastDrop.current
        ? Math.hypot(sternX - lastDrop.current.x, sternZ - lastDrop.current.z)
        : Infinity;
      if (moved > WAKE_POINT_STEP) {
        const halfW = 0.6 + Math.min(speed, 16.0) * 0.11;
        wakePoints.push({ x: sternX, z: sternZ, px: dir.y, pz: -dir.x, halfW, born: time });
        lastDrop.current = { x: sternX, z: sternZ };
        if (wakePoints.length > WAKE_MAX_POINTS) wakePoints.shift();
      }
    }

    while (wakePoints.length && time - wakePoints[0].born > WAKE_LIFETIME) wakePoints.shift();

    const pointCount = wakePoints.length;
    for (let i = 0; i < pointCount; i++) {
      const point = wakePoints[i];
      const age = (time - point.born) / WAKE_LIFETIME;
      const spread = 1.0 + age * 1.8;
      const halfWidth = point.halfW * spread;
      const y = getWaterHeight(point.x, point.z, time, weather) + 0.06;
      const leftX = point.x + point.px * halfWidth;
      const leftZ = point.z + point.pz * halfWidth;
      const rightX = point.x - point.px * halfWidth;
      const rightZ = point.z - point.pz * halfWidth;
      const fade = (1.0 - age) * (1.0 - age);
      const vertexIndex = i * 2;

      positions[vertexIndex * 3 + 0] = leftX;
      positions[vertexIndex * 3 + 1] = y;
      positions[vertexIndex * 3 + 2] = leftZ;
      positions[vertexIndex * 3 + 3] = rightX;
      positions[vertexIndex * 3 + 4] = y;
      positions[vertexIndex * 3 + 5] = rightZ;
      uvs[vertexIndex * 2 + 0] = 0.0;
      uvs[vertexIndex * 2 + 1] = age;
      uvs[vertexIndex * 2 + 2] = 1.0;
      uvs[vertexIndex * 2 + 3] = age;
      alphas[vertexIndex] = fade;
      alphas[vertexIndex + 1] = fade;
    }

    geometry.setDrawRange(0, Math.max(0, (pointCount - 1) * 6));
    positionAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;

    const sprayPoints = sprays.current;
    if (speed > WAKE_SPEED_MIN * 1.3 && sprayPoints.length < SPRAY_MAX) {
      const count = speed > 9 ? 4 : speed > 5 ? 3 : 2;
      const bowX = pos.x + dir.x * 1.1;
      const bowZ = pos.y + dir.y * 1.1;
      const bowY = getWaterHeight(bowX, bowZ, time, weather);
      const perpX = dir.y;
      const perpZ = -dir.x;
      for (let k = 0; k < count && sprayPoints.length < SPRAY_MAX; k++) {
        const side = Math.random() < 0.5 ? 1 : -1;
        const out = 1.6 + Math.random() * 2.2;
        sprayPoints.push({
          x: bowX,
          y: bowY + 0.1,
          z: bowZ,
          vx: perpX * side * out + dir.x * speed * 0.15 + (Math.random() - 0.5),
          vy: 2.6 + Math.random() * 2.4,
          vz: perpZ * side * out + dir.y * speed * 0.15 + (Math.random() - 0.5),
          born: time,
        });
      }
    }

    let liveSprayCount = 0;
    for (let i = 0; i < sprayPoints.length; i++) {
      const spray = sprayPoints[i];
      const age = (time - spray.born) / SPRAY_LIFE;
      if (age >= 1) continue;
      spray.vy -= 9.0 * dt;
      spray.x += spray.vx * dt;
      spray.y += spray.vy * dt;
      spray.z += spray.vz * dt;
      if (spray.y < getWaterHeight(spray.x, spray.z, time, weather)) continue;
      sprayPos[liveSprayCount * 3 + 0] = spray.x;
      sprayPos[liveSprayCount * 3 + 1] = spray.y;
      sprayPos[liveSprayCount * 3 + 2] = spray.z;
      sprayAlpha[liveSprayCount] = 1.0 - age;
      sprayPoints[liveSprayCount] = spray;
      liveSprayCount++;
    }
    sprayPoints.length = liveSprayCount;

    const sprayGeometry = sprayGeomRef.current;
    if (sprayGeometry) {
      const sprayPositionAttr = sprayGeometry.getAttribute('position') as THREE.BufferAttribute | undefined;
      const sprayAlphaAttr = sprayGeometry.getAttribute('aAlpha') as THREE.BufferAttribute | undefined;
      if (!sprayPositionAttr || !sprayAlphaAttr) return;
      sprayGeometry.setDrawRange(0, liveSprayCount);
      sprayPositionAttr.needsUpdate = true;
      sprayAlphaAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh material={material} renderOrder={3} frustumCulled={false}>
        <bufferGeometry ref={geomRef} />
      </mesh>
      <points material={sprayMaterial} renderOrder={4} frustumCulled={false}>
        <bufferGeometry ref={sprayGeomRef} />
      </points>
    </group>
  );
}
