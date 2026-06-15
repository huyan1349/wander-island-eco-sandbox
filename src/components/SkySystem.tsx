import { useGameStore } from '../store';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars, Clouds, Cloud } from '@react-three/drei';

// ===== 全天连续光照关键帧（消除时段边界硬跳；端点首尾相接，0=24 闭环）=====
// 每个关键帧：t 时刻 / 环境光色 ai / 太阳(月)光色 si / 雾色
const SKY_KF = [
  { t: 0,    amb: '#0a0e1a', ai: 0.30, sun: '#5b7fb9', si: 0.22, fog: '#05070f' }, // 深夜
  { t: 4.5,  amb: '#10131f', ai: 0.30, sun: '#5b7fb9', si: 0.24, fog: '#0a0c16' }, // 拂晓前
  { t: 6,    amb: '#caa6c8', ai: 0.45, sun: '#f6b27a', si: 0.70, fog: '#e8c4c0' }, // 日出微光
  { t: 7,    amb: '#fbbf8f', ai: 0.55, sun: '#ffd9a0', si: 1.05, fog: '#fde2c0' }, // 朝霞
  { t: 8.5,  amb: '#e2e8f0', ai: 0.60, sun: '#ffffff', si: 1.20, fog: '#bae6fd' }, // 入昼
  { t: 15,   amb: '#e2e8f0', ai: 0.60, sun: '#ffffff', si: 1.20, fog: '#bae6fd' }, // 正午～午后
  { t: 17,   amb: '#f1d2aa', ai: 0.55, sun: '#ffd29a', si: 1.05, fog: '#d8ecf0' }, // 金色前段
  { t: 18.5, amb: '#c77a52', ai: 0.46, sun: '#f97316', si: 0.75, fog: '#f4768c' }, // 日落
  { t: 19.8, amb: '#5b3a86', ai: 0.36, sun: '#a06fc9', si: 0.40, fog: '#5a2f57' }, // 暮色
  { t: 21,   amb: '#0a0e1a', ai: 0.30, sun: '#5b7fb9', si: 0.22, fog: '#05070f' }, // 入夜
  { t: 24,   amb: '#0a0e1a', ai: 0.30, sun: '#5b7fb9', si: 0.22, fog: '#05070f' }, // 闭环=0
];

const _kfTmp = new THREE.Color();
const _wFog = new THREE.Color();
const _sunTmp = new THREE.Vector3();

// 在任意时刻对关键帧做线性插值，写入 out（颜色连续、无突变）
function sampleSky(t: number, out: { amb: THREE.Color; sun: THREE.Color; fog: THREE.Color; ai: number; si: number }) {
  t = ((t % 24) + 24) % 24;
  let a = SKY_KF[0], b = SKY_KF[SKY_KF.length - 1];
  for (let i = 0; i < SKY_KF.length - 1; i++) {
    if (t >= SKY_KF[i].t && t <= SKY_KF[i + 1].t) { a = SKY_KF[i]; b = SKY_KF[i + 1]; break; }
  }
  const p = THREE.MathUtils.clamp((t - a.t) / ((b.t - a.t) || 1), 0, 1);
  out.amb.set(a.amb).lerp(_kfTmp.set(b.amb), p);
  out.sun.set(a.sun).lerp(_kfTmp.set(b.sun), p);
  out.fog.set(a.fog).lerp(_kfTmp.set(b.fog), p);
  out.ai = THREE.MathUtils.lerp(a.ai, b.ai, p);
  out.si = THREE.MathUtils.lerp(a.si, b.si, p);
}

export function SkySystem() {
    // 不再按 timeOfDay 订阅重渲染；全部在 useFrame 里以阻尼方式驱动，任何时间跳变都丝滑过渡
    const skyRef = useRef<any>(null);
    const ambRef = useRef<THREE.AmbientLight>(null!);
    const dirRef = useRef<THREE.DirectionalLight>(null!);
    const fogRef = useRef<THREE.FogExp2>(null!);
    const starsRef = useRef<THREE.Group>(null!);

    // 当前（已阻尼）状态，持久存在于帧之间
    const cur = useMemo(() => ({
        amb: new THREE.Color('#0a0e1a'),
        sun: new THREE.Color('#5b7fb9'),
        fog: new THREE.Color('#05070f'),
        ai: 0.30, si: 0.22, density: 0.012,
        sunPos: new THREE.Vector3(0, -50, 20),
    }), []);
    const target = useMemo(() => ({ amb: new THREE.Color(), sun: new THREE.Color(), fog: new THREE.Color(), ai: 0.3, si: 0.22 }), []);

    useFrame((_, delta) => {
        const g = useGameStore.getState();
        const t = g.timeOfDay;
        const w = g.weather;

        sampleSky(t, target);

        // 太阳 / 月亮位置（连续）
        const theta = Math.PI * (t / 24) * 2 - Math.PI / 2;
        _sunTmp.set(Math.cos(theta) * 50, Math.sin(theta) * 50, 20);

        // 天气对雾的覆盖（也走阻尼，天气切换不再突兀）
        let fogTarget: THREE.Color = target.fog;
        let densityTarget = 0.012;
        if (w === 'rainy') { fogTarget = _wFog.set('#64748b'); densityTarget = 0.025; }
        else if (w === 'stormy') { fogTarget = _wFog.set('#334155'); densityTarget = 0.035; }
        else if (w === 'foggy') { fogTarget = _wFog.set('#cbd5e1'); densityTarget = 0.06; }
        else if (w === 'snowy') { fogTarget = _wFog.set('#e2e8f0'); densityTarget = 0.02; }
        else if (w === 'cloudy') { densityTarget = 0.016; }

        // 阻尼系数：约 0.4s 收敛，既跟手又丝滑（帧率无关）
        const k = 1 - Math.exp(-2.5 * delta);
        cur.amb.lerp(target.amb, k);
        cur.sun.lerp(target.sun, k);
        cur.fog.lerp(fogTarget, k);
        cur.ai = THREE.MathUtils.lerp(cur.ai, target.ai, k);
        cur.si = THREE.MathUtils.lerp(cur.si, target.si, k);
        cur.density = THREE.MathUtils.lerp(cur.density, densityTarget, k);
        cur.sunPos.lerp(_sunTmp, k);

        if (ambRef.current) { ambRef.current.color.copy(cur.amb); ambRef.current.intensity = cur.ai; }
        if (dirRef.current) {
            dirRef.current.color.copy(cur.sun);
            dirRef.current.intensity = cur.si;
            dirRef.current.position.copy(cur.sunPos);
            dirRef.current.visible = cur.sunPos.y > -8; // 太阳落到地平线下就不再投射
        }
        if (fogRef.current) { fogRef.current.color.copy(cur.fog); fogRef.current.density = cur.density; }
        if (skyRef.current?.material?.uniforms?.sunPosition) {
            skyRef.current.material.uniforms.sunPosition.value.copy(cur.sunPos);
        }
        if (starsRef.current) starsRef.current.visible = (t >= 19.5 || t < 5.5);
    });

    return (
        <>
           <fogExp2 ref={fogRef} attach="fog" color={'#05070f'} density={0.012} />
           <Sky ref={skyRef} distance={450000} sunPosition={[0, -50, 20]} azimuth={0.25} />
           <group ref={starsRef}>
              <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
           </group>
           <ambientLight ref={ambRef} color={'#0a0e1a'} intensity={0.3} />
           <directionalLight
              ref={dirRef}
              position={[0, -50, 20]}
              intensity={0.22}
              color={'#5b7fb9'}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-camera-far={150}
              shadow-camera-left={-40}
              shadow-camera-right={40}
              shadow-camera-top={40}
              shadow-camera-bottom={-40}
              shadow-bias={-0.0005}
           />
        </>
    );
}

export function FirefliesSystem() {
    const timeOfDay = useGameStore(state => state.timeOfDay);
    const isNight = timeOfDay > 18 || timeOfDay < 6;
    const count = 60;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const fireflies = useMemo(() => {
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push({
                x: (Math.random() - 0.5) * 30,
                y: Math.random() * 2 + 0.5,
                z: (Math.random() - 0.5) * 30,
                offset: Math.random() * 100,
                speed: 0.5 + Math.random() * 0.5,
                wanderRadius: 1 + Math.random() * 1.5
            });
        }
        return arr;
    }, []);

    useFrame(({ clock }, delta) => {
        if (!meshRef.current) return;
        
        const targetOpacity = isNight ? 1 : 0;
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOpacity, 2, delta);
        if (mat.opacity < 0.01) {
            meshRef.current.visible = false;
            return;
        } else {
            meshRef.current.visible = true;
        }

        const time = clock.elapsedTime;
        fireflies.forEach((f, i) => {
            const t = time * f.speed + f.offset;
            const x = f.x + Math.sin(t * 0.5) * f.wanderRadius;
            const y = f.y + Math.sin(t * 0.2) * 0.5;
            const z = f.z + Math.cos(t * 0.4) * f.wanderRadius;

            dummy.position.set(x, y, z);
            const pulse = (Math.sin(time * 3 + f.offset) + 1) / 2; // 0 to 1
            const s = 0.5 + pulse * 1.5;
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
             <sphereGeometry args={[0.08, 8, 8]} />
             <meshStandardMaterial color="#bef264" emissive="#bef264" emissiveIntensity={2} transparent opacity={0} toneMapped={false} />
        </instancedMesh>
    );
}

export function RainSystem() {
    const weather = useGameStore(state => state.weather);
    const rainCount = 2800;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const rainDrops = useMemo(() => {
        const drops = [];
        for (let i = 0; i < rainCount; i++) {
            drops.push({
                x: (Math.random() - 0.5) * 80,
                y: Math.random() * 50,
                z: (Math.random() - 0.5) * 80,
                speed: 1.5 + Math.random() * 1.0
            });
        }
        return drops;
    }, []);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const targetOpacity = weather === 'stormy' ? 1.0 : (weather === 'rainy' ? 0.6 : 0);
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOpacity, 4, delta);
        if (mat.opacity < 0.01) {
            meshRef.current.visible = false;
            return;
        } else {
            meshRef.current.visible = true;
        }

        rainDrops.forEach((drop, i) => {
            drop.y -= drop.speed * delta * 40;
            drop.x -= 0.2 * delta * 40; // wind
            if (drop.y < 0) {
                 drop.y = 50;
                 drop.x = (Math.random() - 0.5) * 80;
            }
            dummy.position.set(drop.x, drop.y, drop.z);
            dummy.rotation.z = 0.15;
            dummy.scale.set(0.1, 2.5, 0.1);
            dummy.updateMatrix();
            meshRef.current?.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, rainCount]}>
             <boxGeometry args={[0.1, 1, 0.1]} />
             <meshBasicMaterial color="#94a3b8" transparent opacity={0} depthWrite={false} />
        </instancedMesh>
    );
}

export function SnowSystem() {
    const weather = useGameStore(state => state.weather);
    const snowCount = 1800;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const snowflakes = useMemo(() => {
        const flakes = [];
        for (let i = 0; i < snowCount; i++) {
            flakes.push({
                x: (Math.random() - 0.5) * 80,
                y: Math.random() * 40,
                z: (Math.random() - 0.5) * 80,
                speed: 0.2 + Math.random() * 0.2,
                offset: Math.random() * 100
            });
        }
        return flakes;
    }, []);

    useFrame(({ clock }, delta) => {
        if (!meshRef.current) return;
        const targetOpacity = weather === 'snowy' ? 0.8 : 0;
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOpacity, 2, delta);
        if (mat.opacity < 0.01) {
            meshRef.current.visible = false;
            return;
        } else {
            meshRef.current.visible = true;
        }

        const t = clock.elapsedTime;
        snowflakes.forEach((flake, i) => {
            flake.y -= flake.speed * delta * 15;
            if (flake.y < 0) {
                 flake.y = 40;
                 flake.x = (Math.random() - 0.5) * 80;
            }
            const wobbleX = Math.sin(t + flake.offset) * 0.5;
            const wobbleZ = Math.cos(t * 0.8 + flake.offset) * 0.5;
            
            dummy.position.set(flake.x + wobbleX, flake.y, flake.z + wobbleZ);
            dummy.scale.setScalar(0.06);
            dummy.updateMatrix();
            meshRef.current?.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, snowCount]}>
             <sphereGeometry args={[1, 4, 4]} />
             <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </instancedMesh>
    );
}

export function WeatherSystem() {
    return (
        <>
           <RainSystem />
           <SnowSystem />
        </>
    );
}
