import { useState, useMemo, useCallback, useRef } from 'react';
import { Line, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioSystem } from '../../lib/audio';
import { type Constellation, nodeWorld } from '../../game/constellations';

// HDR 暖色（>1 触发 Bloom 辉光）
const LIT = new THREE.Color('#ffe1a8').multiplyScalar(2.4);
const FLARE = new THREE.Color('#ffd9a0').multiplyScalar(3.2);
const DIM = new THREE.Color('#8fa0bd');
const GOLD = '#ffcf87';
const Vec = (p: [number, number, number]) => new THREE.Vector3(...p);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** 连线逐段画出来（直接改 buffer，不触发 re-render） */
function DrawLine({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const ref = useRef<any>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt / 0.4);
    const e = easeOut(t.current);
    ref.current.geometry?.setPositions([a[0], a[1], a[2], a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e]);
  });
  return <Line ref={ref} points={[a, b]} color={GOLD} lineWidth={2.2} transparent opacity={0.95}
    fog={false} depthTest={false} renderOrder={10} />;
}

/** 弹性放大的星点 */
function StarNode({ p, isOn, isNext, onClick }: {
  p: [number, number, number]; isOn: boolean; isNext: boolean; onClick: () => void;
}) {
  const dot = useRef<THREE.Mesh>(null);
  const scale = useRef(1);
  const vel = useRef(0);
  const wasOn = useRef(isOn);
  useFrame((_, dt) => {
    if (!dot.current) return;
    if (isOn && !wasOn.current) { scale.current = 0.3; vel.current = 0; } // 起跳
    wasOn.current = isOn;
    if (isOn) { // 弹簧逼近 1，带过冲
      const f = (1 - scale.current) * 200;
      vel.current = (vel.current + f * dt) * Math.exp(-13 * dt);
      scale.current += vel.current * dt;
    } else scale.current = 1;
    dot.current.scale.setScalar(scale.current);
  });
  return (
    <Billboard position={p}>
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
        <circleGeometry args={[15, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={dot} position={[0, 0, 0.05]} renderOrder={12}>
        <circleGeometry args={[isOn ? 2.4 : 1.4, 24]} />
        <meshBasicMaterial color={isOn ? LIT : DIM} toneMapped={!isOn} fog={false} depthTest={false} />
      </mesh>
      {isNext && !isOn && <Ripple />}
    </Billboard>
  );
}

/** 待点节点的呼吸波纹 */
function Ripple() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const k = 0.9 + Math.sin(s.clock.elapsedTime * 3) * 0.12;
    ref.current.scale.setScalar(k);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(s.clock.elapsedTime * 3) * 0.18;
  });
  return (
    <mesh ref={ref} position={[0, 0, 0.02]} renderOrder={11}>
      <ringGeometry args={[3.2, 3.9, 32]} />
      <meshBasicMaterial color={GOLD} transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} fog={false} depthTest={false} />
    </mesh>
  );
}

/** 连成时中心绽放：扩散光环 + 中央闪光 */
function CompletionFlare({ center }: { center: [number, number, number] }) {
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt / 0.7);
    const e = easeOut(t.current);
    if (ring.current) {
      ring.current.scale.setScalar(1 + e * 22);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - t.current) * 0.8;
    }
    if (core.current) {
      const pulse = Math.sin(Math.min(1, t.current * 1.4) * Math.PI);
      core.current.scale.setScalar(1 + pulse * 6);
      (core.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.9;
    }
  });
  return (
    <Billboard position={center}>
      <mesh ref={core} renderOrder={13}>
        <circleGeometry args={[2, 24]} />
        <meshBasicMaterial color={FLARE} transparent opacity={0} depthWrite={false} toneMapped={false} fog={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring} renderOrder={13}>
        <ringGeometry args={[1.6, 2.1, 48]} />
        <meshBasicMaterial color={FLARE} transparent opacity={0} depthWrite={false} toneMapped={false} fog={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </Billboard>
  );
}

/** 已解锁星座：永久点亮、不可交互 */
export function UnlockedConstellation({ c }: { c: Constellation }) {
  const W = useMemo(() => c.nodes.map((_, i) => nodeWorld(c, i)), [c]);
  return (
    <group>
      {c.edges.map(([a, b], i) => (
        <Line key={i} points={[W[a], W[b]]} color={GOLD} lineWidth={1.4} transparent opacity={0.5}
          fog={false} depthTest={false} renderOrder={10} />
      ))}
      {W.map((p, i) => (
        <Billboard key={i} position={p}>
          <mesh renderOrder={12}><circleGeometry args={[2.2, 24]} /><meshBasicMaterial color={LIT} toneMapped={false} fog={false} depthTest={false} /></mesh>
        </Billboard>
      ))}
    </group>
  );
}

/** 未解锁星座：连点成线，连完触发 onComplete */
export function ConstellationBoard({ c, onComplete }: { c: Constellation; onComplete: (id: string) => void }) {
  const W = useMemo(() => c.nodes.map((_, i) => nodeWorld(c, i)), [c]);
  const center = useMemo(() => {
    const v = W.reduce((acc, p) => acc.add(Vec(p)), new THREE.Vector3()).multiplyScalar(1 / W.length);
    return [v.x, v.y, v.z] as [number, number, number];
  }, [W]);
  const [active, setActive] = useState<number[]>([]);
  const [lines, setLines] = useState<[number, number][]>([]);
  const [flaring, setFlaring] = useState(false);
  const done = useRef(false);

  const adjacent = useCallback(
    (a: number, b: number) => c.edges.some(([x, y]) => (x === a && y === b) || (y === a && x === b)),
    [c.edges],
  );

  const validNext = useMemo(() => {
    if (active.length === 0) return c.nodes.map((_, i) => i);
    const set = new Set<number>();
    for (const [a, b] of c.edges) {
      if (active.includes(a) && !active.includes(b)) set.add(b);
      if (active.includes(b) && !active.includes(a)) set.add(a);
    }
    return [...set];
  }, [active, c]);

  const handleClick = useCallback((i: number) => {
    setActive((prev) => {
      if (prev.includes(i) || done.current) return prev;
      const first = prev.length === 0;
      if (!first && !prev.some((n) => adjacent(n, i))) return prev;
      AudioSystem.playPop();
      if (!first) {
        const fresh = prev.filter((n) => adjacent(n, i)).map((n) => [n, i] as [number, number]);
        setLines((pl) => {
          const merged = [...pl, ...fresh];
          if (merged.length >= c.edges.length && !done.current) {
            done.current = true;
            AudioSystem.playToggle();
            setFlaring(true);
            setTimeout(() => onComplete(c.id), 900); // 留给绽放动画
          }
          return merged;
        });
      }
      return [...prev, i];
    });
  }, [adjacent, c, onComplete]);

  const started = active.length > 0;

  return (
    <group>
      {/* 点亮首星后淡入的虚线轮廓 */}
      {started && c.edges.map(([a, b], i) => (
        <Line key={`h${i}`} points={[W[a], W[b]]} color={GOLD} lineWidth={1}
          dashed dashSize={2.4} gapSize={3.4} transparent opacity={0.2} fog={false} depthTest={false} renderOrder={9} />
      ))}
      {/* 已连成的暖金线（逐段画出） */}
      {lines.map(([a, b], i) => <DrawLine key={`l${i}`} a={W[a]} b={W[b]} />)}
      {/* 连成绽放 */}
      {flaring && <CompletionFlare center={center} />}

      {W.map((p, i) => (
        <StarNode key={i} p={p} isOn={active.includes(i)} isNext={validNext.includes(i)} onClick={() => handleClick(i)} />
      ))}
    </group>
  );
}
