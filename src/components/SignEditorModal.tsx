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
      <div className="bg-[#fbf7ec] rounded-3xl border border-slate-300/70 shadow-[0_30px_80px_rgba(0,0,0,0.45)] w-[420px] max-w-[92vw] p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Signpost size={20} className="text-amber-700" /><h2 className="text-lg font-bold text-slate-800">在牌子上写字</h2></div>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"><X size={18} /></button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="写点什么立在岛上…"
          rows={4}
          maxLength={80}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 resize-none"
          style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}
        />
        <button onClick={() => save(true)} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 transition-colors">
          ⛳ 用作岛屿名牌（同时给小岛命名）
        </button>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">{text.length} / 80</span>
          <div className="flex gap-2">
            <button onClick={close} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">取消</button>
            <button onClick={() => save(false)} className="px-5 py-2 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-700">立牌</button>
          </div>
        </div>
      </div>
    </div>
  );
};
