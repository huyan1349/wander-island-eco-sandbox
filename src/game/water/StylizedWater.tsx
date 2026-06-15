import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
varying float vShore; varying vec2 vWUv;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  vWUv = uv;
  // 岸缘因子：圆形按到中心距离，带状按横向 uv.y。
  vShore = uFoamMode > 0.5 ? abs(uv.y - 0.5) * 2.0 : clamp(length(uv - 0.5) * 2.0, 0.0, 1.0);
  // 轻波动：中心强、近岸收敛为 0（岸边贴地不穿帮）。
  float damp = 1.0 - vShore * vShore;
  float w = sin((position.x * 2.1 + position.y * 1.3) + uTime * 1.6)
          + sin((position.x * 1.3 - position.y * 2.4) - uTime * 1.1) * 0.6;
  transformed.z += w * 0.05 * uWaveAmp * damp;
}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uFoam;
uniform float uOpacity; uniform float uFoamMode; uniform vec2 uFlow;
varying float vShore; varying vec2 vWUv;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // 深浅：水心深、岸边浅。
  vec3 water = mix(uDeep, uShallow, smoothstep(0.0, 1.0, vShore));
  // 流动 UV（溪流/瀑布）叠一层细纹理感。
  vec2 fuv = vWUv + uFlow * uTime;
  float ripple = sin(fuv.x * 26.0 + fuv.y * 10.0) * 0.5 + 0.5;
  water += (ripple - 0.5) * 0.05;
  // 交界泡沫：靠岸一圈白带，随时间起伏，带状水体在两侧成沫。
  float band = uFoamMode > 0.5 ? smoothstep(0.62, 0.96, vShore) : smoothstep(0.74, 1.0, vShore);
  float flick = 0.6 + 0.4 * sin(uTime * 3.0 + (vWUv.x + vWUv.y) * 22.0);
  float foamAmt = band * flick;
  diffuseColor.rgb = mix(water, uFoam, foamAmt);
  diffuseColor.a = mix(uOpacity, 0.95, foamAmt);
}`);
  }, []);

  useFrame((s) => {
    uniforms.current.uTime.value = s.clock.elapsedTime;
  });

  const rot: [number, number, number] = lieFlat ? [-Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <mesh rotation={rot} geometry={geometry ?? circleGeo ?? undefined} receiveShadow renderOrder={renderOrder}>
      {!geometry && circleGeo == null && <circleGeometry args={[radius, segments]} />}
      <meshStandardMaterial
        ref={matRef}
        transparent
        opacity={opacity}
        roughness={0.18}
        metalness={0.1}
        depthWrite={false}
        flatShading
        side={THREE.DoubleSide}
        onBeforeCompile={onBeforeCompile}
        customProgramCacheKey={() => 'stylized-water-' + foamMode}
      />
    </mesh>
  );
}
