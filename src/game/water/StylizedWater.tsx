import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getHeightField } from './heightField';

// 无高度场时的占位贴图（1×1）
const DUMMY_TEX = new THREE.DataTexture(new Uint16Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);
DUMMY_TEX.needsUpdate = true;

/**
 * StylizedWater — 全岛通用的「低多边形风格化水面」。
 *
 * 单一来源，被水塘 / 生命之泉 / 溪流 / 瀑布共用，统一观感：
 *  - 深浅渐变：中心深、岸边浅（按到岸距离）
 *  - 交界泡沫：岸线一圈动态白泡沫（低多边形水的灵魂）
 *  - 轻波动：顶点正弦微起伏 + 法线扰动
 *  - 流动：UV 沿 flow 方向滚动（溪流/瀑布有方向感）
 *
 * 走 MeshStandardMaterial.onBeforeCompile 注入 GLSL —— 保留引擎光照/阴影，
 * 与 Water.tsx 海面同一套做法，移动端也能跑。
 *
 * 岸缘因子 vShore：0 = 水心，1 = 岸边。
 *  - foamMode 'radial'：圆形水体（塘/泉），按 uv 到中心的距离求 shore。
 *  - foamMode 'ribbon'：带状水体（溪流），按 uv.y（横向）求 shore，两侧成岸。
 */
export type FoamMode = 'radial' | 'ribbon';

interface StylizedWaterProps {
  /** 圆形水面半径（不传 geometry 时按此建 circleGeometry）。 */
  radius?: number;
  /** 自定义几何（溪流/瀑布的带状网格）。给了就用它，忽略 radius。 */
  geometry?: THREE.BufferGeometry;
  segments?: number;
  shallow?: string;
  deep?: string;
  foam?: string;
  opacity?: number;
  /** 顶点起伏幅度（相对半径/1）。瀑布可调大。 */
  waveAmp?: number;
  foamMode?: FoamMode;
  /** UV 滚动方向与速度（溪流向下游、瀑布向下）。[0,0] = 静水。 */
  flow?: [number, number];
  /** 额外旋转：圆形水面默认躺平(-PI/2)，带状几何通常已在世界系，传 false 不旋转。 */
  lieFlat?: boolean;
  renderOrder?: number;
}

export function StylizedWater({
  radius = 1,
  geometry,
  segments = 40,
  shallow = '#7fd0f2',
  deep = '#1f5f8c',
  foam = '#eaf8ff',
  opacity = 0.86,
  waveAmp = 1,
  foamMode = 'radial',
  flow = [0, 0],
  lieFlat = true,
  renderOrder = 0,
}: StylizedWaterProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const uniforms = useRef({
    uTime: { value: 0 },
    uShallow: { value: new THREE.Color(shallow) },
    uDeep: { value: new THREE.Color(deep) },
    uFoam: { value: new THREE.Color(foam) },
    uOpacity: { value: opacity },
    uWaveAmp: { value: waveAmp },
    uFoamMode: { value: foamMode === 'ribbon' ? 1.0 : 0.0 },
    uFlow: { value: new THREE.Vector2(flow[0], flow[1]) },
    // 体积水：水深来自地形高度场
    uHeightTex: { value: DUMMY_TEX as THREE.Texture },
    uIslandSize: { value: 1 },
    uUseDepth: { value: 0 },
    uAbsorb: { value: 1.9 },       // 深度吸收系数（越大越快变深）
    uFoamWidth: { value: 0.14 },   // 岸线白沫的水深带宽
    uFresnelP: { value: 4.0 },
    uMinA: { value: 0.16 },        // 浅水透明
    uMaxA: { value: 0.92 },        // 深水不透
  });

  // 保持 uniforms 与 props 同步（颜色/不透明度可被场景实时调）。
  useEffect(() => {
    const u = uniforms.current;
    u.uShallow.value.set(shallow);
    u.uDeep.value.set(deep);
    u.uFoam.value.set(foam);
    u.uOpacity.value = opacity;
    u.uWaveAmp.value = waveAmp;
    u.uFoamMode.value = foamMode === 'ribbon' ? 1.0 : 0.0;
    u.uFlow.value.set(flow[0], flow[1]);
  }, [shallow, deep, foam, opacity, waveAmp, foamMode, flow]);

  const circleGeo = useMemo(() => {
    if (geometry) return null;
    return new THREE.CircleGeometry(radius, segments);
  }, [geometry, radius, segments]);

  const onBeforeCompile = useMemo(() => (shader: any) => {
    Object.assign(shader.uniforms, uniforms.current);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform float uWaveAmp; uniform float uFoamMode;
varying float vShore; varying float vSteep; varying vec2 vWUv;
varying vec3 vWorldPos; varying vec3 vViewDir;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  vWUv = uv;
  vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz; // 未起伏的水面世界坐标（算水深用，稳定不闪）
  vWorldPos = wp;
  vViewDir = cameraPosition - wp;
  // 岸缘因子：圆形按到中心距离，带状按横向 uv.x（两岸）。
  vShore = uFoamMode > 0.5 ? abs(uv.x - 0.5) * 2.0 : clamp(length(uv - 0.5) * 2.0, 0.0, 1.0);
  // 陡峭因子：法线越偏离朝上越陡（崖面/瀑布段）。
  vSteep = 1.0 - clamp(normal.y, 0.0, 1.0);
  float damp = 1.0 - vShore * vShore;
  if (uFoamMode > 0.5) {
    // 河流：顺流而下的行进波，沿世界 Y 起伏（uv.y = 弧长米数 → 波长恒定）。
    float tw = sin(uv.y * 2.3 - uTime * 3.2)
             + sin(uv.y * 5.1 + uv.x * 4.0 - uTime * 4.6) * 0.4;
    transformed.y += tw * 0.06 * uWaveAmp * damp;
  } else {
    float w = sin((position.x * 2.1 + position.y * 1.3) + uTime * 1.6)
            + sin((position.x * 1.3 - position.y * 2.4) - uTime * 1.1) * 0.6;
    transformed.z += w * 0.05 * uWaveAmp * damp;
  }
}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uFoam;
uniform float uOpacity; uniform float uFoamMode; uniform vec2 uFlow;
uniform sampler2D uHeightTex; uniform float uIslandSize; uniform float uUseDepth;
uniform float uAbsorb; uniform float uFoamWidth; uniform float uFresnelP; uniform float uMinA; uniform float uMaxA;
varying float vShore; varying float vSteep; varying vec2 vWUv;
varying vec3 vWorldPos; varying vec3 vViewDir;
float wHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(wHash(i),wHash(i+vec2(1,0)),u.x), mix(wHash(i+vec2(0,1)),wHash(i+vec2(1,1)),u.x), u.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float t;       // 深度暗化：0 浅 → 1 深
  float shoreF;  // 岸线白沫因子：1 在水线、0 深处
  float alpha;
  if (uUseDepth > 0.5) {
    // —— 体积水：按「水面 Y − 地形 Y」的水柱厚度着色（Beer–Lambert）——
    vec2 huv = vWorldPos.xz / uIslandSize + 0.5;
    float bottomY = texture2D(uHeightTex, huv).r;
    float depth = max(0.0, vWorldPos.y - bottomY);
    t = 1.0 - exp(-depth * uAbsorb);
    shoreF = 1.0 - smoothstep(0.0, uFoamWidth, depth);
    alpha = mix(uMinA, uMaxA, t);
  } else {
    // 回退：无高度场（如副岛）时按 uv 岸缘。
    t = smoothstep(0.0, 1.0, 1.0 - vShore);
    shoreF = uFoamMode > 0.5 ? smoothstep(0.6, 0.96, vShore) : smoothstep(0.74, 1.0, vShore);
    alpha = uOpacity;
  }
  vec3 water = mix(uShallow, uDeep, t);
  float centerFast = clamp(1.0 - vShore, 0.0, 1.0); // 河心快、近岸慢

  // 顺流而下的水花丝：沿流向(uv.y 弧长)漂移的两层噪声，组织成细丝（河心更急更密）
  vec2 f1 = vec2(vWUv.x * 3.2, vWUv.y * 0.9 - uTime * (0.7 + centerFast * 1.2));
  vec2 f2 = vec2(vWUv.x * 6.1, vWUv.y * 1.7 - uTime * (1.1 + centerFast * 1.6));
  float fn = wNoise(f1) * 0.62 + wNoise(f2) * 0.38;
  float threads = smoothstep(0.60, 0.93, fn) * (0.25 + 0.75 * centerFast);

  // 岸线白沫：贴水线一圈，慢噪声起伏（不再高频闪烁）
  float shoreFoam = shoreF * (0.45 + 0.55 * wNoise(vec2(vWUv.x * 5.0, vWUv.y * 1.3 - uTime * 0.9)));

  // 陡处白水（瀑布段，本期先保留弱化，待第二期单独打磨）
  float fall = uFoamMode > 0.5 ? smoothstep(0.35, 0.8, vSteep) * 0.55 : 0.0;

  // 菲涅尔：掠角微泛白（俯视通透）
  float fres = pow(1.0 - clamp(normalize(vViewDir).y, 0.0, 1.0), uFresnelP);
  water = mix(water, uShallow, fres * 0.12);

  float riverFoam = uFoamMode > 0.5 ? threads * 0.5 : 0.0;
  float foamAmt = clamp(shoreFoam + riverFoam + fall, 0.0, 1.0);
  diffuseColor.rgb = mix(water, uFoam, foamAmt);
  diffuseColor.a = max(alpha, foamAmt * 0.9);
}`);
  }, []);

  useFrame((s) => {
    const u = uniforms.current;
    u.uTime.value = s.clock.elapsedTime;
    const hf = getHeightField();
    if (hf) { u.uHeightTex.value = hf.tex; u.uIslandSize.value = hf.size; u.uUseDepth.value = 1; }
    else { u.uUseDepth.value = 0; }
  });

  const rot: [number, number, number] = lieFlat ? [-Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <mesh rotation={rot} geometry={geometry ?? circleGeo ?? undefined} receiveShadow renderOrder={renderOrder}>
      {!geometry && circleGeo == null && <circleGeometry args={[radius, segments]} />}
      <meshStandardMaterial
        ref={matRef}
        transparent
        opacity={opacity}
        roughness={0.62}
        metalness={0.0}
        depthWrite={false}
        flatShading
        side={THREE.DoubleSide}
        onBeforeCompile={onBeforeCompile}
        customProgramCacheKey={() => 'stylized-water-' + foamMode}
      />
    </mesh>
  );
}
