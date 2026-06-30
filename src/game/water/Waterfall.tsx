import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Waterfall as Fall } from './streamPath';
import { StylizedWater } from './StylizedWater';

// 风格化瀑布：沿落水线扫掠出「横截面外凸圆弧」的低多边形水柱网格——真实 3D 体积，不是平板贴图。
// 水帘本体用与「溪流」完全相同的 StylizedWater 着色器渲染（同配色、同深浅渐变、同柔和岸沫），
// 不再有竖条纹 / 卡通描边 / 硬阈值白块等花纹。底部补少量哑光溅射水花（真实液滴）。
//
// 关键点：瀑布悬在半空，若按地形水深上色会「爆表」全黑 → 传 depthShade={false} 走横向 uv 上色；
//         陡面白水 steepFoam 调低 → 水帘以蓝水为主、只有少量白沫，真正和溪流一致。

/* ---------- 级联水体网格：沿落水线扫掠「贴坡、沿坡面法线鼓起」的圆弧水体 ----------
   关键修正（解决"贴图感"）：
   - 横截面沿「坡面法线 N」方向鼓出（陡处朝外、缓处朝上）→ 鼓包真正立在坡面之外 → 有体积；
     旧版沿下游水平鼓、且整段共用同一个 Y，是一张完全扁平的膜，所以看着像贴图。
   - 逐顶点写入坡度 aSteep（0 缓 → 1 陡），交给 StylizedWater 驱动「陡白急 / 缓蓝静」的自然过渡。
   - 上窄下宽 + 陡处更鼓（鼓量随坡度）→ 缓处接近溪流的扁平、陡处是奔流的厚水体。 */
function buildCascadeGeometry(poly: { x: number; y: number; z: number }[], dir: { x: number; z: number }, width: number) {
  const n = poly.length;
  const K = 6;                                   // 横向段数（圆弧分面）
  const VPR = K + 1;
  const up = new THREE.Vector3(0, 1, 0);
  const fallbackW = new THREE.Vector3(-dir.z, 0, dir.x); if (fallbackW.lengthSq() < 1e-6) fallbackW.set(1, 0, 0); fallbackW.normalize();
  const positions: number[] = [], uvs: number[] = [], steeps: number[] = [], indices: number[] = [];
  const arc: number[] = [0];
  for (let k = 1; k < n; k++) arc.push(arc[k - 1] + Math.hypot(poly[k].x - poly[k - 1].x, poly[k].y - poly[k - 1].y, poly[k].z - poly[k - 1].z) || 0.001);
  const total = arc[n - 1] || 1;
  // 逐站原始坡度（下落占比）→ 沿程平滑（box blur 2 趟），使陡/缓白水过渡连续、无突变带（更自然）
  const steepArr: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = poly[Math.max(0, k - 1)], b = poly[Math.min(n - 1, k + 1)];
    const tl = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1;
    steepArr.push(Math.min(1, Math.max(0, (-((b.y - a.y) / tl) - 0.30) / 0.55)));
  }
  for (let pass = 0; pass < 2; pass++) {
    const tmp = steepArr.slice();
    for (let k = 0; k < n; k++) steepArr[k] = (tmp[Math.max(0, k - 1)] + 2 * tmp[k] + tmp[Math.min(n - 1, k + 1)]) / 4;
  }
  const T = new THREE.Vector3(), W = new THREE.Vector3(), N = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    const a = poly[Math.max(0, k - 1)], b = poly[Math.min(n - 1, k + 1)];
    T.set(b.x - a.x, b.y - a.y, b.z - a.z);       // 流向切线（含下落分量）
    if (T.lengthSq() < 1e-8) T.set(dir.x, 0, dir.z);
    T.normalize();
    W.crossVectors(T, up);                        // 横向（水平，垂直于流向水平投影）
    if (W.lengthSq() < 1e-6) W.copy(fallbackW); else W.normalize();
    N.crossVectors(W, T).normalize();             // 坡面法线（指向坡外上方）
    if (N.y < 0) N.negate();
    const t = arc[k] / total;                     // 0 顶 → 1 底
    const steep = steepArr[k]; // 沿程平滑后的坡度 → 陡缓过渡连续、不生硬
    // 两端鼓量渐隐：顶部 14% 由扁渐鼓（出水口自然渐出）、底部 16% 由鼓渐扁（自然摊入潭面）→ 衔接不生硬
    const endFade = Math.min(1, t / 0.14) * (1 - Math.min(1, Math.max(0, (t - 0.84) / 0.16)));
    const wk = width * (0.7 + 0.45 * t);          // 上窄下宽
    const bulge = wk * (0.15 + 0.4 * steep) * endFade; // 陡处更鼓；两端摊平融入地形/潭面
    const p = poly[k];
    for (let j = 0; j <= K; j++) {
      const u = j / K;
      const s = (u - 0.5) * wk;
      const bo = Math.cos((u - 0.5) * Math.PI) * bulge; // 中间鼓、两边收 → 沿 N 的圆弧截面
      positions.push(p.x + W.x * s + N.x * bo, p.y + W.y * s + N.y * bo, p.z + W.z * s + N.z * bo);
      uvs.push(u, t);                             // u 横向(0..1 → 两岸)、v 弧长(0 顶 → 1 底)
      steeps.push(steep);
    }
    if (k < n - 1) {
      const base = k * VPR;
      for (let j = 0; j < K; j++) {
        const a2 = base + j, b2 = a2 + 1, c2 = a2 + VPR, d2 = c2 + 1;
        indices.push(a2, c2, b2, b2, c2, d2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('aSteep', new THREE.Float32BufferAttribute(steeps, 1));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
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
    uSizeA: { value: sizeA }, uSizeB: { value: sizeB }, uColor: { value: new THREE.Color('#eaf8ff') }, uOpacity: { value: opacity },
  }), [life, speed, gravity, sizeA, sizeB, opacity]);
  useFrame((s) => { if (ref.current) ref.current.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <points position={origin} geometry={geo} renderOrder={4} frustumCulled={false}>
      <shaderMaterial ref={ref} vertexShader={SP_VERT} fragmentShader={SP_FRAG} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.NormalBlending} toneMapped={false} />
    </points>
  );
}

/* ---------- 水帘本体 + 落水水花 ---------- */
function FallBody({ poly, dir, width }: Pick<Fall, 'poly' | 'dir' | 'width'>) {
  const geo = useMemo(() => buildCascadeGeometry(poly, dir, width), [poly, dir, width]);
  const bot = poly[poly.length - 1];
  return (
    <group>
      {/* 水帘本体：与溪流同一套 StylizedWater 着色器（同配色、同柔和岸沫，无条纹）。
          slopeAttr → 用几何坡度驱动「陡白急 / 缓蓝静」的自然过渡；
          depthShade=false → 走横向 uv 上色（瀑布贴坡，水深无意义）；
          opacity 偏高 → 读作有体积的水体，而非透明贴片。 */}
      <StylizedWater
        geometry={geo}
        foamMode="ribbon"
        slopeAttr
        flow={[0, 0.4]}
        lieFlat={false}
        depthShade={false}
        steepFoam={0.14}
        shallow="#aee6fa"
        deep="#2a6690"
        opacity={0.95}
        waveAmp={1.1}
        renderOrder={2}
      />
      {/* 入潭溅射：低角度「向外炸开」的浪花冠（up 低、spread 大）——水真的打在潭面溅出来的感觉，
          而不是向上喷的喷泉；重力大 → 迸出后很快落回，冠形紧凑。 */}
      <Spray origin={[bot.x, bot.y, bot.z]} count={24} life={0.7} speed={2.8} gravity={-12.0}
        spread={1.6} up={0.45} sizeA={1.2} sizeB={2.2} opacity={0.85} />
      {/* 贴水面低矮碎沫：向外薄薄铺开，不上窜 */}
      <Spray origin={[bot.x, bot.y + 0.05, bot.z]} count={10} life={1.1} speed={1.3} gravity={-5.0}
        spread={1.3} up={0.5} sizeA={2.2} sizeB={3.8} opacity={0.14} />
    </group>
  );
}

export function Waterfall({ poly, dir, width }: Fall) {
  if (!poly || poly.length < 2) return null;
  return <FallBody poly={poly} dir={dir} width={width} />;
}
