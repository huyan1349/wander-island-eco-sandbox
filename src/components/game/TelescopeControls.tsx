import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store';
import { EYE_HEIGHT, CONSTELLATIONS } from '../../game/constellations';

// 真·望远镜：眼点固定，拖拽摆动镜头扫过天穹，滚轮收窄 FOV 拉近。仅观星模式生效。
const ALT_MIN = 18, ALT_MAX = 88;
const FOV_WIDE = 54, FOV_NARROW = 11;
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const d2r = THREE.MathUtils.degToRad;

export function TelescopeControls({ active }: { active: boolean }) {
  const { camera, gl } = useThree();
  const setDpr = useThree((st) => st.setDpr);
  const s = useRef({ az: 0, alt: 60, zoom: 0.15, taz: 0, talt: 60, tzoom: 0.15, drag: false, px: 0, py: 0, on: false, ex: 0, ey: EYE_HEIGHT, ez: 0 }).current;

  useEffect(() => {
    if (!active) {
      if (s.on) { // 退出：恢复常规视角、FOV 与渲染分辨率
        s.on = false;
        setDpr(1.25);
        const cam = camera as THREE.PerspectiveCamera;
        cam.fov = 45; cam.updateProjectionMatrix();
        cam.position.set(0, 40, 80); cam.lookAt(0, 0, 0);
      }
      return;
    }
    // 观星时提到原生分辨率，让星点清晰锐利
    setDpr(Math.min(window.devicePixelRatio || 1, 2));
    // 眼点 = 观星台世界坐标 + 目镜高度
    const obs = useGameStore.getState().observatoryPos ?? [0, 0, 0];
    s.ex = obs[0]; s.ey = obs[1] + EYE_HEIGHT; s.ez = obs[2];
    // 进入：瞄准第一个未解锁星座，并从略偏处缓缓对焦
    const unlocked = useGameStore.getState().unlockedConstellations;
    const target = CONSTELLATIONS.find((c) => !unlocked.includes(c.id)) || CONSTELLATIONS[0];
    s.taz = target.dir[0]; s.az = target.dir[0] - 12; // 找星漂移
    s.talt = clamp(target.dir[1], ALT_MIN, ALT_MAX); s.alt = clamp(s.talt - 6, ALT_MIN, ALT_MAX);
    s.tzoom = 0.12; s.zoom = 0; // 缓缓拉近对焦
    s.on = true;

    const el = gl.domElement;
    const down = (e: PointerEvent) => { s.drag = true; s.px = e.clientX; s.py = e.clientY; };
    const move = (e: PointerEvent) => {
      if (!s.drag) return;
      const dx = e.clientX - s.px, dy = e.clientY - s.py;
      s.px = e.clientX; s.py = e.clientY;
      const k = 0.11 * THREE.MathUtils.lerp(1, 0.32, s.zoom); // 越拉近越精细
      s.taz -= dx * k;
      s.talt = clamp(s.talt + dy * k, ALT_MIN, ALT_MAX);
    };
    const up = () => { s.drag = false; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); s.tzoom = clamp(s.tzoom + (e.deltaY > 0 ? -0.09 : 0.09), 0, 1); };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [active, camera, gl, s]);

  useFrame((_, dt) => {
    if (!s.on) return;
    s.az = damp(s.az, s.taz, 9, dt);
    s.alt = damp(s.alt, s.talt, 9, dt);
    s.zoom = damp(s.zoom, s.tzoom, 8, dt);
    const az = d2r(s.az), alt = d2r(s.alt), ca = Math.cos(alt);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(s.ex, s.ey, s.ez);
    cam.lookAt(s.ex + ca * Math.sin(az), s.ey + Math.sin(alt), s.ez - ca * Math.cos(az));
    const fov = THREE.MathUtils.lerp(FOV_WIDE, FOV_NARROW, s.zoom);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  });

  // 暴露缩放给 UI 按钮（+/-）
  useEffect(() => {
    (window as any).__telescopeZoom = (delta: number) => { s.tzoom = clamp(s.tzoom + delta, 0, 1); };
    return () => { delete (window as any).__telescopeZoom; };
  }, [s]);

  return null;
}
