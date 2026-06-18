import { useEffect } from 'react';
import { AudioSystem } from '../lib/audio';

// 悬停发声的元素：仅真正的按钮/链接，保持"高级"不嘈杂
const HOVER_SEL = 'button, a[href], [role="button"], .hand-drawn-btn, .hand-drawn-ghost';
// 点击发声的元素：更宽，含可点击容器
const CLICK_SEL = HOVER_SEL + ', label, select, input[type="checkbox"], input[type="radio"], .cursor-pointer, [data-clickable]';
const CONFIRM_RE = /开始|进入|保存|确认|同意|登录|注册|领取|收下|建造|放置|创建|完成|apply|save|start|confirm|ok/i;
const CLOSE_RE = /关闭|取消|返回|以后|收起|退出|close|cancel|back|dismiss/i;
const TOGGLE_RE = /checkbox|radio|switch|toggle/i;

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
      if (now - lastHoverAt < 95) return; // 节流，避免快速划过时连发
      lastHoverAt = now;
      AudioSystem.playHover();
    };

    const onOut = (e: PointerEvent) => {
      if (match(e.target, HOVER_SEL) === lastHoverEl) lastHoverEl = null;
    };

    const describe = (el: Element) =>
      [
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.getAttribute('role'),
        el.getAttribute('type'),
        el.className,
        el.textContent,
      ].filter(Boolean).join(' ');

    const playSemanticClick = (el: Element) => {
      const target = el.closest('input, button, a, label, [role="button"], [role="tab"], [data-clickable]') ?? el;
      const signature = describe(target);
      if (TOGGLE_RE.test(signature) || target instanceof HTMLSelectElement) {
        AudioSystem.playToggle();
      } else if (CLOSE_RE.test(signature)) {
        AudioSystem.playClose();
      } else if (CONFIRM_RE.test(signature)) {
        AudioSystem.playConfirm();
      } else if (target.getAttribute('role') === 'tab') {
        AudioSystem.playTap();
      } else {
        AudioSystem.playClick();
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (!match(e.target, CLICK_SEL)) return;
      AudioSystem.playPress();
    };

    const onClick = (e: MouseEvent) => {
      const el = match(e.target, CLICK_SEL);
      if (!el) return;
      // 延后到本次事件分发结束：若组件自身已发声(recentlyPlayed)则不重复
      setTimeout(() => { if (!AudioSystem.recentlyPlayed()) playSemanticClick(el); }, 0);
    };

    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout', onOut, true);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout', onOut, true);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}
