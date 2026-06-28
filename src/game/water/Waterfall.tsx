import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Waterfall as Fall } from './streamPath';

// 风格化瀑布：沿落水线扫掠出「横截面外凸圆弧」的低多边形水柱网格（哑光、近不透明 → 有体积、不穿帮）
// + 唇沫 / 跌水潭沫 + 小而碎的哑光水花粒子。对标 Blender 曲线扫掠思路，three.js 手搓。

const NOISE = /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoi(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
`;

/* ---------- 水柱网格（圆弧截面，沿落水线扫掠） ---------- */
function buildChuteGeometry(poly: { x: number; y: number; z: number }[], dir: { x: number; z: number }, width: number) {
  const n = poly.length;
  const K = 5;                       // 横向段数（圆弧分面）
  const VPR = K + 1;
  const bulge = width * 0.5;         // 截面外凸量（体积）
  const dh = new THREE.Vector2(dir.x, dir.z); const dl = dh.length() || 1; dh.x /= dl; dh.y /= dl; // 下游水平
  const wx = -dh.y, wz = dh.x;       // 横向
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const arc: number[] = [0];
  for (let k = 1; k < n; k++) arc.push(arc[k - 1] + Math.hypot(poly[k].x - poly[k - 1].x, poly[k].y - poly[k - 1].y, poly[k].z - poly[k - 1].z) || 0.001);
  const total = arc[n - 1] || 1;
  for (let k = 0; k < n; k++) {
    const p = poly[k];
    for (let j = 0; j <= K; j++) {
      const u = j / K;
      const s = (u - 0.5) * width;
      const bo = Math.cos((u - 0.5) * Math.PI) * bulge; // 中间鼓、两边收 → D 形截面
      positions.push(p.x + wx * s + dh.x * bo, p.y, p.z + wz * s + dh.y * bo);
      uvs.push(u, arc[k] / total);   // v: 0 顶 → 1 底（向下滚动用）
    }
    if (k < n - 1) {
      const base = k * VPR;
      for (let j = 0; j < K; j++) {
        const a = base + j, b = a + 1, c = a + VPR, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function Chute({ poly, dir, width }: { poly: Fall['poly']; dir: { x: number; z: number }; width: number }) {
  const geo = useMemo(() => buildChuteGeometry(poly, dir, width), [poly, dir, width]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uSpeed: { value: 0.9 },
    uColor: { value: new THREE.Color('#7fb4d8') }, uFoam: { value: new THREE.Color('#f3fbff') },
  }), []);
  useFrame((s) => { uniforms.uTime.value = s.clock.elapsedTime; });
  const onBeforeCompile = useMemo(() => (sh: any) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uTime; varying vec2 vWUv;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  vWUv = uv;
  transformed += normal * sin(uv.y * 11.0 - uTime * 5.0) * 0.02; // 表面翻涌
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime; uniform float uSpeed; uniform vec3 uColor; uniform vec3 uFoam; varying vec2 vWUv;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // 干净的竖直流线（少而清晰、带噪声轻扭），代替密集噪点
  float lane = vWUv.x * 5.0;
  float wob = vnoi(vec2(lane * 0.7, vWUv.y * 1.6 - uTime * uSpeed)) * 0.35;
  float s = abs(fract(lane + wob) - 0.5) * 2.0;
  float streak = smoothstep(0.55, 0.12, s);
  // cel 二值水色：底蓝 / 亮蓝
  vec3 col = mix(uColor, mix(uColor, uFoam, 0.55), step(0.5, streak));
  // 顶部唇白 + 近底白沫盖（硬阈值 → toon 干净白块，不是菜花）
  float capN = 0.6 + 0.4 * vnoi(vec2(vWUv.x * 4.0, -uTime * 2.0));
  float cap = smoothstep(0.1, 0.0, vWUv.y) + smoothstep(0.82, 1.0, vWUv.y) * capN;
  col = mix(col, uFoam, step(0.45, cap));
  // 两侧描白边
  col = mix(col, uFoam, smoothstep(0.82, 1.0, abs(vWUv.x - 0.5) * 2.0));
  diffuseColor.rgb = col;
  float fade = smoothstep(0.0, 0.03, vWUv.y) * smoothstep(1.0, 0.93, vWUv.y);
  diffuseColor.a *= fade;
}`);
  }, [uniforms]);
  return (
    <mesh geometry={geo} renderOrder={2}>
      <meshStandardMaterial transparent opacity={0.96} roughness={0.6} metalness={0.0}
        depthWrite={false} flatShading side={THREE.DoubleSide} onBeforeCompile={onBeforeCompile}
        customProgramCacheKey={() => 'chute'} />
    </mesh>
  );
}

/* ---------- 哑光翻涌白沫盘（唇 / 潭） ---------- */
const FOAM_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uFoam; varying vec2 vUv;
${NOISE}
void main(){
  vec2 c = vUv - 0.5; float r = length(c) * 2.0;
  float churn = vnoi(c * 8.0 + vec2(0.0, uTime * 1.4)) * 0.6 + vnoi(c * 16.0 - uTime) * 0.4;
  float m = smoothstep(0.25, 0.85, churn) * (1.0 - smoothstep(0.45, 1.0, r));
  if (m < 0.04) discard;
  gl_FragColor = vec4(uFoam, m * 0.9);
}`;
function FoamDisc({ pos, radius }: { pos: [number, number, number]; radius: number }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFoam: { value: new THREE.Color('#f3fbff') } }), []);
  useFrame((s) => { if (ref.current) ref.current.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <shaderMaterial ref={ref} fragmentShader={FOAM_FRAG} uniforms={uniforms} transparent depthWrite={false} toneMapped={false}
        vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`} />
    </mesh>
  );
}

/* ---------- 小而碎的哑光水花粒子 ---------- */
const SP_VERT = /* glsl */ `
attribute vec3 aDir; attribute float aPhase; attribute float aRand;
uniform float uTime, uLife, uSpeed, uGravity, uSizeA, uSizeB; varying float vA;
void main(){
  float t = fract(uTime / uLife + aPhase); float tt = t * uLife;
  vec3 pos = aDir * uSpeed * tt; pos.y += 0.5 * uGravity * tt * tt;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = mix(uSizeA, uSizeB, t) * (0.6 + aRand) * (55.0 / -mv.z);
  vA = sin(t * 3.14159); gl_Position = projectionMatrix * mv;
}`;
const SP_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.34, d) * vA * uOpacity; if (a < 0.03) discard; gl_FragColor = vec4(uColor, a); }`;
function Spray({ origin, count, life, speed, gravity, spread, up, sizeA, sizeB, opacity }: {
  origin: [number, number, number]; count: number; life: number; speed: number; gravity: number;
  spread: number; up: number; sizeA: number; sizeB: number; opacity: number;
}) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), dir = new Float32Array(count * 3), ph = new Float32Array(count), rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2, r = Math.random() * spread;
      const d = new THREE.Vector3(Math.cos(ang) * r, up + Math.random() * up * 0.6, Math.sin(ang) * r).normalize();
      dir[i * 3] = d.x; dir[i * 3 + 1] = d.y; dir[i * 3 + 2] = d.z; ph[i] = Math.random(); rnd[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    return g;
  }, [count, spread, up]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uLife: { value: life }, uSpeed: { value: speed }, uGravity: { value: gravity },
    uSizeA: { value: sizeA }, uSizeB: { value: sizeB }, uColor: { value: new THREE.Color('#f3fbff') }, uOpacity: { value: opacity },
  }), [life, speed, gravity, sizeA, sizeB, opacity]);
  useFrame((s) => { if (ref.current) ref.current.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <points position={origin} geometry={geo} renderOrder={4} frustumCulled={false}>
      <shaderMaterial ref={ref} vertexShader={SP_VERT} fragmentShader={SP_FRAG} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.NormalBlending} toneMapped={false} />
    </points>
  );
}

export function Waterfall({ poly, dir, width }: Fall) {
  if (!poly || poly.length < 2) return null;
  const bot = poly[poly.length - 1];
  return (
    <group>
      <Chute poly={poly} dir={dir} width={width} />
      {/* 迸溅水花：小而碎、哑光，向外炸 + 重力 */}
      <Spray origin={[bot.x, bot.y, bot.z]} count={20} life={0.9} speed={2.6} gravity={-9.0}
        spread={0.9} up={1.5} sizeA={1.0} sizeB={2.4} opacity={0.9} />
      {/* 极淡水雾：少、低透明、上飘 */}
      <Spray origin={[bot.x, bot.y + 0.1, bot.z]} count={7} life={2.2} speed={0.8} gravity={0.4}
        spread={0.6} up={2.0} sizeA={3.0} sizeB={5.5} opacity={0.1} />
    </group>
  );
}
