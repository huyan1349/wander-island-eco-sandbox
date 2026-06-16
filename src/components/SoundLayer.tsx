import { useEffect } from 'react';
import { AudioSystem } from '../lib/audio';

// 悬停发声的元素：仅真正的按钮/链接，保持"高级"不嘈杂
const HOVER_SEL = 'button, a[href], [role="button"], .hand-drawn-btn, .hand-drawn-ghost';
// 点击发声的元素：更宽，含可点击容器
const CLICK_SEL = HOVER_SEL + ', label, select, input[type="checkbox"], input[type="radio"], .cursor-pointer, [data-clickable]';

// 全局交互音效层：统一为所有交互元素加 hover / click 声。
// click 通过延后判定避免与组件内已有的 AudioSystem 调用重复发声。
export function SoundLayer() {
  useEffect(() => {
    let lastHoverEl: Element | null = null;
    let lastHoverAt = 0;

    const match = (t: EventTarget | null, sel: string): Element | null =>
      t instanceof Element ? t.closest(sel) : null;

    const onOver = (e: PointerEvent) => {
      const el = match(e.target, HOVER_SEL);
      if (!el || el === lastHoverEl) return;
      lastHoverEl = el;
      const now = performance.now();
      if (now - lastHoverAt < 55) return; // 节流，避免快速划过时连发
      lastHoverAt = now;
      AudioSystem.playHover();
    };

    const onOut = (e: PointerEvent) => {
      if (match(e.target, HOVER_SEL) === lastHoverEl) lastHoverEl = null;
    };

    const onClick = (e: MouseEvent) => {
      if (!match(e.target, CLICK_SEL)) return;
      // 延后到本次事件分发结束：若组件自身已发声(recentlyPlayed)则不重复
      setTimeout(() => { if (!AudioSystem.recentlyPlayed()) AudioSystem.playClick(); }, 0);
    };

    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout', onOut, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout', onOut, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}
