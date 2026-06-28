import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EYE, SKY_R, skyPoint } from '../../game/constellations';

// 铺在天穹球面上的星空：HDR 亮星（推过 Bloom 阈值 1.2 自动发光）+ 流星。叠在游戏原本的夜空上。
const STAR_COUNT = 850;
const EYE_V = new THREE.Vector3(...EYE);

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aBright;
  attribute float aSpeed;
  attribute float aPhase;
  uniform float uTime;
  uniform float uMag;   // 望远镜放大倍率（随 FOV 收窄增大）
  varying vec3 vColor;
  varying float vBright;
  void main(){
    vColor = color;
    float tw = 0.7 + 0.3 * sin(uTime * aSpeed + aPhase);
    vBright = aBright * tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    if (mv.z > -1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; } // 裁掉相机背面，消除拖影
    float mag = mix(1.0, uMag, 0.55); // 放大只部分作用于尺寸，保持锐利点状
    gl_PointSize = aSize * mag * (900.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vBright;
  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    // 实心小硬盘 + 窄抗锯齿边 → 锐利针点
    float disk = smoothstep(0.5, 0.4, d);
    // 极淡细晕
    float halo = smoothstep(0.5, 0.0, d) * 0.09;
    // 衍射十字芒：仅亮星可见
    float sx = (1.0 - smoothstep(0.0, 0.016, abs(uv.y))) * (1.0 - smoothstep(0.0, 0.5, abs(uv.x)));
    float sy = (1.0 - smoothstep(0.0, 0.016, abs(uv.x))) * (1.0 - smoothstep(0.0, 0.5, abs(uv.y)));
    float spikes = max(sx, sy) * clamp(vBright - 1.05, 0.0, 1.0) * 0.7;
    float a = disk + halo + spikes;
    if(a < 0.01) discard;
    gl_FragColor = vec4(vColor * vBright, a);
  }
`;

function Stars() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const rand = mulberry32(98765);
    const pos = new Float32Array(STAR_COUNT * 3);
    const col = new Float32Array(STAR_COUNT * 3);
    const size = new Float32Array(STAR_COUNT);
    const bright = new Float32Array(STAR_COUNT);
    const speed = new Float32Array(STAR_COUNT);
    const phase = new Float32Array(STAR_COUNT);
    const warm = new THREE.Color('#ffd9a8'), cool = new THREE.Color('#cdd9ff'), white = new THREE.Color('#ffffff');
    const c = new THREE.Color();
    for (let i = 0; i < STAR_COUNT; i++) {
      const p = skyPoint(rand() * 360, 10 + rand() * 80); // 球面随机方向
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      const r = rand();
      const lum = Math.pow(r, 3.0); // 绝大多数暗，少数极亮
      const tt = rand();
      c.copy(white);
      if (tt < 0.25) c.lerp(warm, 0.3 + rand() * 0.5);
      else if (tt > 0.78) c.lerp(cool, 0.3 + rand() * 0.5);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      size[i] = 0.8 + lum * 4.2;
      bright[i] = r > 0.965 ? 1.35 + lum * 1.6 : 0.18 + lum * 0.7; // 仅顶 ~3.5% 亮星 HDR 发光，其余压暗
      speed[i] = 0.4 + rand() * 1.8;
      phase[i] = rand() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    return g;
  }, []);

  const REF_HALF = Math.tan((54 * Math.PI) / 180 / 2); // 广角基准
  useFrame((s) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = s.clock.elapsedTime;
    const fov = (s.camera as THREE.PerspectiveCamera).fov;
    matRef.current.uniforms.uMag.value = REF_HALF / Math.tan((fov * Math.PI) / 180 / 2);
  });

  return (
    <points geometry={geometry} renderOrder={2} frustumCulled={false}>
      <shaderMaterial ref={matRef} vertexShader={STAR_VERT} fragmentShader={STAR_FRAG}
        uniforms={{ uTime: { value: 0 }, uMag: { value: 1 } }} transparent depthWrite={false} depthTest={false}
        blending={THREE.AdditiveBlending} toneMapped={false} vertexColors />
    </points>
  );
}

/* ---------- 流星：沿天穹划过 ---------- */
function Meteor({ seed }: { seed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const rand = useMemo(() => mulberry32(seed * 1337 + 7), [seed]);
  const st = useRef({ t: 0, next: seed * 5, az0: 0, alt0: 0, daz: 0, dalt: 0, life: 1 }).current;
  const respawn = () => {
    st.az0 = rand() * 360;
    st.alt0 = 35 + rand() * 45;
    st.daz = -22 + rand() * 44;
    st.dalt = -16 + rand() * 8;
    st.life = 0.7 + rand() * 0.6;
    st.t = 0;
  };
  useFrame((_, dt) => {
    const m = ref.current; if (!m) return;
    if (st.t === 0 && st.next > 0) { st.next -= dt; if (st.next <= 0) respawn(); else { m.visible = false; return; } }
    st.t += dt;
    const p = st.t / st.life;
    if (p >= 1) { m.visible = false; st.t = 0; st.next = 12 + rand() * 16; return; }
    m.visible = true;
    const [x, y, z] = skyPoint(st.az0 + st.daz * p, st.alt0 + st.dalt * p);
    m.position.set(x, y, z);
    m.lookAt(EYE_V);
    const head = skyPoint(st.az0 + st.daz * (p + 0.02), st.alt0 + st.dalt * (p + 0.02));
    m.rotation.z = Math.atan2(head[1] - y, head[0] - x);
    (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(p * Math.PI);
  });
  return (
    <mesh ref={ref} visible={false} renderOrder={3} frustumCulled={false}>
      <planeGeometry args={[SKY_R * 0.06, 0.5]} />
      <meshBasicMaterial color={'#fff4d6'} transparent depthWrite={false} depthTest={false}
        blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} fog={false} />
    </mesh>
  );
}

export function StarField() {
  return (
    <group>
      <Stars />
      <Meteor seed={1} />
      <Meteor seed={2} />
    </group>
  );
}
