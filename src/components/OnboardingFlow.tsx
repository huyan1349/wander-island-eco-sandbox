import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { Camera, User, ArrowRight, Sparkles } from 'lucide-react';

// 注册后引导：① 完善档案（头像/名称/座右铭）② 揭晓「漫游岛居民证」身份卡
export const OnboardingFlow: React.FC = () => {
  const setScreen = useGameStore(s => s.setScreen);
  const authUser = useGameStore(s => s.authUser);
  const setAuthUser = useGameStore(s => s.setAuthUser);

  const [phase, setPhase] = useState<'PROFILE' | 'CARD'>('PROFILE');
  const [name, setName] = useState(authUser?.username || '');
  const [motto, setMotto] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 居民证揭晓动画
  const [cardIn, setCardIn] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const memberNo = authUser?.memberNo || 1;
  const serial = String(memberNo).padStart(5, '0');
  const today = new Date();
  const joinDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleContinue = async () => {
    if (!name.trim()) return;
    AudioSystem.playConfirm();
    setSaving(true);
    try {
      const updates: { username?: string; motto?: string; avatarFile?: File } = {};
      if (name.trim() && name.trim() !== authUser?.username) updates.username = name.trim();
      if (motto.trim()) updates.motto = motto.trim();
      if (avatarFile) updates.avatarFile = avatarFile;
      if (Object.keys(updates).length > 0) {
        const res = await api.updateProfile(updates);
        // 保留 memberNo（后端 profile 接口不回传）
        setAuthUser({ ...res.user, memberNo });
      }
    } catch (err) {
      console.error('Onboarding save failed:', err);
    } finally {
      setSaving(false);
      setPhase('CARD');
    }
  };

  // 进入居民证阶段后播放揭晓音 + 入场
  useEffect(() => {
    if (phase !== 'CARD') return;
    AudioSystem.playSynergyChord();
    const r = requestAnimationFrame(() => setCardIn(true));
    return () => cancelAnimationFrame(r);
  }, [phase]);

  const onCardMove = (e: React.MouseEvent) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 16, y: px * 18 });
  };

  const avatarSrc = avatarPreview || authUser?.avatar;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto cinematic-vignette overflow-hidden">
      {/* 柔光背景 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 42%, rgba(125,211,252,0.16), transparent 60%)' }} />

      {/* ========== 阶段一：完善档案 ========== */}
      {phase === 'PROFILE' && (
        <div className="w-full max-w-md px-8 animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <div className="hand-drawn-panel p-10 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-8 bg-emerald-200/70 -rotate-2 border-2 border-slate-800 shadow-sm" />

            <div className="text-center mb-8">
              <p className="text-[11px] font-black tracking-[0.4em] uppercase text-emerald-600 mb-2">Welcome, Wanderer</p>
              <h1 className="text-3xl font-black text-slate-900 hand-drawn-title -rotate-1">完善你的漫游档案</h1>
              <p className="text-xs text-slate-400 mt-2 tracking-wider">为即将颁发的居民证准备你的样子</p>
            </div>

            {/* 头像 */}
            <div className="flex justify-center mb-7">
              <label className="relative group cursor-pointer">
                <div className="w-28 h-28 rounded-full border-3 border-slate-800 overflow-hidden bg-gradient-to-tr from-emerald-400/30 to-cyan-400/30 flex items-center justify-center shadow-[4px_4px_0_#2d3436]">
                  {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : <User size={40} className="text-slate-600" />}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={26} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-300 border-2 border-slate-800 flex items-center justify-center shadow-sm">
                  <Camera size={14} className="text-slate-800" />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              </label>
            </div>

            {/* 名称 */}
            <label className="block mb-4">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase ml-1">漫游者名称</span>
              <input
                type="text" value={name} maxLength={20}
                onChange={(e) => setName(e.target.value)}
                placeholder="给自己起个名字"
                className="mt-1.5 w-full px-4 py-3 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-base font-bold tracking-wide"
                style={{ borderWidth: '2px' }}
              />
            </label>

            {/* 座右铭 */}
            <label className="block mb-7">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase ml-1">座右铭（选填）</span>
              <input
                type="text" value={motto} maxLength={30}
                onChange={(e) => setMotto(e.target.value)}
                placeholder="写一句属于你的话…"
                className="mt-1.5 w-full px-4 py-3 hand-drawn-panel text-slate-700 italic placeholder:text-slate-400 focus:outline-none text-sm"
                style={{ borderWidth: '2px', fontFamily: "'ZCOOL KuaiLe', cursive" }}
              />
            </label>

            <button
              onClick={handleContinue}
              disabled={saving || !name.trim()}
              className="hand-drawn-btn w-full py-3.5 text-lg font-bold tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {saving ? <span className="animate-spin">⏳</span> : <>颁发居民证 <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
      )}

      {/* ========== 阶段二：漫游岛居民证 ========== */}
      {phase === 'CARD' && (
        <div className="flex flex-col items-center gap-8" style={{ perspective: 1400 }}>
          <p
            className="text-center transition-all duration-700"
            style={{ opacity: cardIn ? 1 : 0, transform: cardIn ? 'translateY(0)' : 'translateY(-14px)' }}
          >
            <span className="block text-[11px] font-black tracking-[0.45em] uppercase text-white/50 mb-1">Official Resident Card</span>
            <span className="hand-drawn-title text-2xl text-white/90">欢迎加入漫游岛</span>
          </p>

          <div
            ref={cardRef}
            onMouseMove={onCardMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            className="relative w-[380px] h-[238px] rounded-2xl"
            style={{
              transformStyle: 'preserve-3d',
              transform: cardIn
                ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1)`
                : 'rotateY(75deg) scale(0.8)',
              opacity: cardIn ? 1 : 0,
              transition: 'transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.7s ease',
            }}
          >
            {/* 卡体 */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-slate-900 shadow-[10px_14px_0_rgba(15,23,42,0.45)]"
              style={{ background: 'linear-gradient(135deg,#fef9ec 0%,#fdeecb 45%,#f7dca0 100%)' }}>
              {/* 全息斜光 */}
              <div className="absolute inset-0 pointer-events-none opacity-60"
                style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(125,211,252,0.35) 45%, rgba(255,255,255,0.55) 50%, rgba(167,243,208,0.35) 55%, transparent 70%)', backgroundSize: '300% 100%', backgroundPosition: `${tilt.y * 4 + 50}% 0` }} />
              {/* 角落水印图标 */}
              <svg className="absolute -right-6 -bottom-8 w-44 h-44 text-emerald-900/[0.06]" viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 8 C70 8 88 30 88 55 C88 78 70 92 50 92 C30 92 12 78 12 55 C12 30 30 8 50 8 Z" />
              </svg>

              {/* 顶部条 */}
              <div className="relative flex items-center justify-between px-5 pt-4">
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 100 100" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinejoin="round">
                    <path d="M15 90 L45 80 L45 10 L15 20 Z" /><path d="M45 10 L85 20 L85 90 L70 86 L70 36 L55 32 L55 82 L45 80 Z" />
                  </svg>
                  <div className="leading-none">
                    <p className="text-[13px] font-black tracking-[0.18em] text-slate-900">WANDER ISLAND</p>
                    <p className="text-[9px] font-bold tracking-[0.3em] text-slate-500">漫游岛 · 居民证</p>
                  </div>
                </div>
                <Sparkles size={16} className="text-amber-500" />
              </div>

              {/* 主体 */}
              <div className="relative flex items-center gap-4 px-5 mt-3">
                <div className="w-[78px] h-[78px] rounded-xl overflow-hidden border-2 border-slate-900 bg-white shrink-0 shadow-[3px_3px_0_rgba(15,23,42,0.3)]">
                  {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : <User size={36} className="text-slate-500 m-auto mt-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-slate-500">Resident</p>
                  <p className="text-2xl font-black text-slate-900 truncate leading-tight">{name || authUser?.username}</p>
                  {motto && <p className="text-[11px] text-slate-500 italic truncate" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>「{motto}」</p>}
                </div>
              </div>

              {/* 底部：序号 + 日期 */}
              <div className="absolute bottom-0 left-0 right-0 px-5 py-3 flex items-end justify-between border-t-2 border-slate-900/15 bg-white/30 backdrop-blur-sm">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-slate-500">第 {memberNo} 位漫游者</p>
                  <p className="text-xl font-black tracking-[0.15em] text-emerald-700 font-mono">NO.{serial}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-slate-500">登岛日期</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{joinDate}</p>
                </div>
              </div>
            </div>
          </div>

          <p
            className="text-white/70 text-sm tracking-wider text-center transition-all duration-700 delay-200"
            style={{ opacity: cardIn ? 1 : 0 }}
          >
            你是第 <span className="text-amber-300 font-black text-lg">{memberNo}</span> 位登上漫游岛的旅人
          </p>

          <button
            onClick={() => { AudioSystem.playConfirm(); setScreen('SAVE_SELECT'); }}
            className="hand-drawn-btn px-10 py-3.5 text-lg font-bold tracking-[0.2em] flex items-center gap-3 transition-all duration-700 delay-300"
            style={{ opacity: cardIn ? 1 : 0, transform: cardIn ? 'translateY(0)' : 'translateY(12px)' }}
          >
            收下居民证，启程 <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
