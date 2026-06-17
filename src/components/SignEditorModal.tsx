import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { AudioSystem } from '../lib/audio';
import { X, Signpost } from 'lucide-react';

// 牌子文字编辑器：点击岛上的牌子（选择模式）弹出
export const SignEditorModal: React.FC = () => {
  const editingSignId = useGameStore(s => s.editingSignId);
  const setEditingSignId = useGameStore(s => s.setEditingSignId);
  const assets = useGameStore(s => s.assets);
  const updateAsset = useGameStore(s => s.updateAsset);
  const [text, setText] = useState('');

  const sign = editingSignId ? assets.find(a => a.id === editingSignId) : null;

  useEffect(() => {
    if (sign) setText(sign.text || '');
  }, [editingSignId]); // eslint-disable-line

  if (!editingSignId || !sign) return null;

  const save = (asIslandName = false) => {
    AudioSystem.playConfirm();
    const t = text.slice(0, 80);
    updateAsset(editingSignId!, (a) => ({ ...a, text: t }));
    if (asIslandName && t.trim()) {
      const st = useGameStore.getState();
      st.setIslandInfo(st.islandId, t.trim());
    }
    setEditingSignId(null);
  };
  const close = () => { AudioSystem.playClose(); setEditingSignId(null); };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm" onClick={close}>
      <div className="hand-drawn-panel relative bg-[#fdfcf8] shadow-[16px_16px_0_rgba(0,0,0,0.4)] w-[420px] max-w-[92vw] p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="absolute inset-0 bg-grid-paper opacity-40 mix-blend-multiply pointer-events-none" style={{ borderRadius: 'inherit' }} />
        <button onClick={close} className="hand-drawn-close-btn" title="关闭"><X size={24} strokeWidth={3} /></button>
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2"><Signpost size={24} className="text-slate-800" /><h2 className="text-2xl hand-drawn-title -rotate-1">在牌子上写字</h2></div>
          
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="写点什么立在岛上…"
            rows={4}
            maxLength={80}
            autoFocus
            className="w-full px-4 py-3 hand-drawn-panel bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none"
            style={{ borderWidth: '2px' }}
          />
          <button onClick={() => save(true)} className="hand-drawn-btn w-full px-4 py-3 text-sm font-bold border-2 text-slate-700 bg-amber-50">
            ⛳ 用作岛屿名牌（同时给小岛命名）
          </button>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-400 font-mono">{text.length} / 80</span>
            <div className="flex gap-2">
              <button onClick={close} className="hand-drawn-btn px-4 py-2 text-sm font-bold text-slate-500">取消</button>
              <button onClick={() => save(false)} className="hand-drawn-btn hand-drawn-btn-active px-5 py-2 text-sm font-bold">立牌</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
