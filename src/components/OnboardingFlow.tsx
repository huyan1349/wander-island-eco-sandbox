import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { TRACKS, renderTrackTexture, grantCard, MAIL_CARD_URLS } from './ui/musicData';

// 注册赠送的卡（前 5 张，排除走邮件发放的新卡）
const STARTER = TRACKS.filter(t => !MAIL_CARD_URLS.includes(t.url));
import { Camera, User, ArrowRight, Sparkles, Globe } from 'lucide-react';

// 居民证主题配色（呼应 5 段记忆的色调）
export const THEMES = [
  { key: 'terracotta', name: '赤陶', bg: 'linear-gradient(135deg,#fbe9dd 0%,#f3c9ab 45%,#e6a378 100%)', accent: '#b5563a', ink: '#7c2d12' },
  { key: 'gold',       name: '晴金', bg: 'linear-gradient(135deg,#fef9ec 0%,#fdeecb 45%,#f7dca0 100%)', accent: '#b45309', ink: '#78350f' },
  { key: 'leaf',       name: '叶绿', bg: 'linear-gradient(135deg,#e9f6ea 0%,#c4e8c9 45%,#9bd6a6 100%)', accent: '#15803d', ink: '#14532d' },
  { key: 'sakura',     name: '樱粉', bg: 'linear-gradient(135deg,#fdeef2 0%,#f9cfdc 45%,#f3aac0 100%)', accent: '#be185d', ink: '#831843' },
  { key: 'lighthouse', name: '灯塔蓝', bg: 'linear-gradient(135deg,#e8f1fb 0%,#c3ddf5 45%,#94c2ec 100%)', accent: '#1d4ed8', ink: '#1e3a8a' },
] as const;

// 注册后引导：① 完善档案 ② 揭晓「漫游岛居民证」③ 登岛礼包 + 直接建岛进入
export const OnboardingFlow: React.FC = () => {
  const authUser = useGameStore(s => s.authUser);
  const setAuthUser = useGameStore(s => s.setAuthUser);
  const createSaveSlot = useGameStore(s => s.createSaveSlot);
  const addToast = useGameStore(s => s.addToast);
  const setShowWelcomeGuide = useGameStore(s => s.setShowWelcomeGuide);

  const [phase, setPhase] = useState<'PROFILE' | 'CARD' | 'GIFT'>('PROFILE');
  const [giftIn, setGiftIn] = useState(false);
  const [flyOut, setFlyOut] = useState(false);
  const [name, setName] = useState(authUser?.username || '');
  const [islandName, setIslandName] = useState('');
  const [motto, setMotto] = useState('');
  const [themeIdx, setThemeIdx] = useState(1);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 居民证揭晓
  const [cardIn, setCardIn] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const theme = THEMES[themeIdx];
  const memberNo = authUser?.memberNo || 1;
  const serial = String(memberNo).padStart(5, '0');
  const today = new Date();
  const joinDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const uid = `WI-${today.getFullYear()}-${String(memberNo).padStart(6, '0')}`;
  const avatarSrc = avatarPreview || authUser?.avatar;

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
        setAuthUser({ ...res.user, memberNo }); // 后端 profile 不回传 memberNo，手动保留
      }
    } catch (err) {
      console.error('Onboarding save failed:', err);
    } finally {
      setSaving(false);
      setPhase('CARD');
    }
  };

  // 进入居民证：揭晓音 + 入场 + 生成二维码
  useEffect(() => {
    if (phase !== 'CARD') return;
    AudioSystem.playSynergyChord();
    const r = requestAnimationFrame(() => setCardIn(true));
    const link = `${location.origin}/?resident=${uid}`;
    QRCode.toDataURL(link, { margin: 1, width: 220, errorCorrectionLevel: 'M' })
      .then(setQrUrl).catch(() => {});
    return () => cancelAnimationFrame(r);
  }, [phase, uid]);

  const onCardMove = (e: React.MouseEvent) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 14, y: px * 16 });
  };

  // 收下居民证 → 进入赠卡仪式
  const goToGift = () => { AudioSystem.playConfirm(); setPhase('GIFT'); };

  // 赠卡仪式：5 张卡依次翻出 + 逐张音效
  useEffect(() => {
    if (phase !== 'GIFT') return;
    const r = requestAnimationFrame(() => setGiftIn(true));
    const timers = STARTER.map((_, i) => setTimeout(() => AudioSystem.playPop(), 350 + i * 160));
    return () => { cancelAnimationFrame(r); timers.forEach(clearTimeout); };
  }, [phase]);

  // 进入漫游岛：赠 5 张记忆卡 + 卡片飞向左下 + 用岛名建岛 + 触发引导
  const enterGame = () => {
    AudioSystem.playConfirm();
    STARTER.forEach(t => grantCard(t.url));
    addToast(`${STARTER.length} 段记忆已收入行囊 ♪`, 'info');
    setShowWelcomeGuide(true);
    setFlyOut(true);
    const finalIsland = islandName.trim() || `${name.trim() || authUser?.username || '漫游者'}的小岛`;
    // 持久化居民证，供游戏内重复查看
    try {
      localStorage.setItem('resident_card', JSON.stringify({
        name: name.trim() || authUser?.username || '漫游者',
        islandName: finalIsland, motto: motto.trim(), themeIdx, memberNo, joinDate, uid,
      }));
    } catch {}
    // 等飞出动画后建岛：新手第一个岛 = 默认开屏小岛(教程岛)，载入后保存
    setTimeout(async () => {
      createSaveSlot(finalIsland); // 内部 set screen=PLAYING + clearAll
      try {
        const m = await import('../utils/islandIO');
        await m.loadPresetIsland('/preset-demo.json?v=2'); // 填入默认教程岛内容
        useGameStore.getState().saveGame();
      } catch (e) { console.error('教程岛载入失败', e); }
    }, 650);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto cinematic-vignette overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 42%, rgba(125,211,252,0.16), transparent 60%)' }} />

      {/* ========== 阶段一：完善档案 ========== */}
      {phase === 'PROFILE' && (
        <div className="w-full max-w-md px-8 animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <div className="hand-drawn-panel p-9 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-8 bg-emerald-200/70 -rotate-2 border-2 border-slate-800 shadow-sm" />

            <div className="text-center mb-7">
              <p className="text-[11px] font-black tracking-[0.4em] uppercase text-emerald-600 mb-2">Welcome, Wanderer</p>
              <h1 className="text-3xl font-black text-slate-900 hand-drawn-title -rotate-1">完善你的漫游档案</h1>
              <p className="text-xs text-slate-400 mt-2 tracking-wider">为即将颁发的居民证准备你的样子</p>
            </div>

            {/* 头像 */}
            <div className="flex justify-center mb-6">
              <label className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full border-3 border-slate-800 overflow-hidden bg-gradient-to-tr from-emerald-400/30 to-cyan-400/30 flex items-center justify-center shadow-[4px_4px_0_#2d3436]">
                  {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : <User size={36} className="text-slate-600" />}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-300 border-2 border-slate-800 flex items-center justify-center shadow-sm">
                  <Camera size={12} className="text-slate-800" />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              </label>
            </div>

            <label className="block mb-3.5">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase ml-1">漫游者名称</span>
              <input type="text" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="给自己起个名字"
                className="mt-1.5 w-full px-4 py-2.5 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-base font-bold tracking-wide" style={{ borderWidth: '2px' }} />
            </label>

            <label className="block mb-3.5">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase ml-1">岛屿名称</span>
              <input type="text" value={islandName} maxLength={20} onChange={(e) => setIslandName(e.target.value)} placeholder="为你的荒岛起个名字"
                className="mt-1.5 w-full px-4 py-2.5 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-base font-bold tracking-wide" style={{ borderWidth: '2px' }} />
            </label>

            <label className="block mb-5">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase ml-1">个性签名（选填）</span>
              <input type="text" value={motto} maxLength={30} onChange={(e) => setMotto(e.target.value)} placeholder="写一句属于你的话…"
                className="mt-1.5 w-full px-4 py-2.5 hand-drawn-panel text-slate-700 italic placeholder:text-slate-400 focus:outline-none text-sm" style={{ borderWidth: '2px', fontFamily: "'ZCOOL KuaiLe', cursive" }} />
            </label>

            {/* 主题色 */}
            <div className="mb-7">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase ml-1">居民证主题色</span>
              <div className="flex items-center gap-3 mt-2">
                {THEMES.map((t, i) => (
                  <button key={t.key} onClick={() => { AudioSystem.playTap(); setThemeIdx(i); }} title={t.name}
                    className="relative w-10 h-10 rounded-full border-2 border-slate-800 transition-transform hover:scale-110"
                    style={{ background: t.bg, transform: themeIdx === i ? 'scale(1.15)' : 'scale(1)', boxShadow: themeIdx === i ? '0 0 0 3px #fff, 0 0 0 5px #1e293b' : 'none' }}>
                  </button>
                ))}
                <span className="ml-1 text-sm font-bold text-slate-600">{theme.name}</span>
              </div>
            </div>

            <button onClick={handleContinue} disabled={saving || !name.trim()}
              className="hand-drawn-btn w-full py-3.5 text-lg font-bold tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50">
              {saving ? <span className="animate-spin">⏳</span> : <>颁发居民证 <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
      )}

      {/* ========== 阶段二：漫游岛居民证 ========== */}
      {phase === 'CARD' && (
        <div className="flex flex-col items-center gap-7" style={{ perspective: 1400 }}>
          <p className="text-center transition-all duration-700" style={{ opacity: cardIn ? 1 : 0, transform: cardIn ? 'translateY(0)' : 'translateY(-14px)' }}>
            <span className="block text-[11px] font-black tracking-[0.45em] uppercase text-white/50 mb-1">Official Resident Card</span>
            <span className="hand-drawn-title text-2xl text-white/90">欢迎加入漫游岛</span>
          </p>

          {/* 入场/视差层 */}
          <div
            ref={cardRef}
            onMouseMove={onCardMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            onClick={() => { AudioSystem.playTap(); setFlipped(f => !f); }}
            className="relative w-[380px] h-[238px] cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transform: cardIn ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1)` : 'rotateY(75deg) scale(0.8)',
              opacity: cardIn ? 1 : 0,
              transition: 'transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.7s ease',
            }}
          >
            {/* 翻面层 */}
            <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1)' }}>

              {/* ===== 正面 ===== */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-slate-900 shadow-[10px_14px_0_rgba(15,23,42,0.45)]"
                style={{ background: theme.bg, backfaceVisibility: 'hidden' }}>
                <div className="absolute inset-0 pointer-events-none opacity-60"
                  style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(125,211,252,0.35) 45%, rgba(255,255,255,0.55) 50%, rgba(167,243,208,0.35) 55%, transparent 70%)', backgroundSize: '300% 100%', backgroundPosition: `${tilt.y * 4 + 50}% 0` }} />
                <svg className="absolute -right-6 -bottom-8 w-44 h-44" style={{ color: theme.ink, opacity: 0.06 }} viewBox="0 0 100 100" fill="currentColor">
                  <path d="M50 8 C70 8 88 30 88 55 C88 78 70 92 50 92 C30 92 12 78 12 55 C12 30 30 8 50 8 Z" />
                </svg>

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
                  <Sparkles size={16} style={{ color: theme.accent }} />
                </div>

                <div className="relative flex items-center gap-4 px-5 mt-3">
                  <div className="w-[78px] h-[78px] rounded-xl overflow-hidden border-2 border-slate-900 bg-white shrink-0 shadow-[3px_3px_0_rgba(15,23,42,0.3)]">
                    {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : <User size={36} className="text-slate-500 m-auto mt-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-slate-500">Resident</p>
                    <p className="text-2xl font-black text-slate-900 truncate leading-tight">{name || authUser?.username}</p>
                    {islandName.trim() && (
                      <p className="text-[11px] font-bold truncate flex items-center gap-1" style={{ color: theme.ink }}>
                        <Globe size={11} /> {islandName.trim()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 px-5 py-3 flex items-end justify-between border-t-2 border-slate-900/15 bg-white/30 backdrop-blur-sm">
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-slate-500">第 {memberNo} 位漫游者</p>
                    <p className="text-xl font-black tracking-[0.15em] font-mono" style={{ color: theme.accent }}>NO.{serial}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-slate-500">登岛日期</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{joinDate}</p>
                  </div>
                </div>
              </div>

              {/* ===== 背面 ===== */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-slate-900 shadow-[10px_14px_0_rgba(15,23,42,0.45)] flex flex-col"
                style={{ background: theme.bg, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="relative flex items-center justify-between px-5 pt-4">
                  <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-slate-500">Resident Signature</p>
                  <p className="text-[10px] font-black tracking-[0.18em] text-slate-900">WANDER ISLAND</p>
                </div>

                {/* 个性签名（无则留白） */}
                <div className="flex-1 flex items-center px-6">
                  <p className="text-xl text-slate-800 leading-snug" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>
                    {motto.trim() ? `「${motto.trim()}」` : ''}
                  </p>
                </div>

                <div className="flex items-end justify-between px-5 py-3 border-t-2 border-slate-900/15 bg-white/30 backdrop-blur-sm">
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-slate-500">专属编号</p>
                    <p className="text-base font-black tracking-[0.1em] font-mono" style={{ color: theme.ink }}>{uid}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">已收录 {STARTER.length} 段记忆 ♪</p>
                  </div>
                  <div className="w-14 h-14 rounded-md border-2 border-slate-900 bg-white p-0.5 shrink-0">
                    {qrUrl ? <img src={qrUrl} alt="QR" className="w-full h-full" /> : <div className="w-full h-full bg-slate-100 animate-pulse rounded-sm" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-white/45 text-xs font-mono tracking-[0.25em] transition-opacity duration-700" style={{ opacity: cardIn ? 1 : 0 }}>
            {flipped ? '点击卡片 · 翻回正面' : '点击卡片 · 查看背面'}
          </p>

          <p className="text-white/70 text-sm tracking-wider text-center transition-all duration-700 delay-200" style={{ opacity: cardIn ? 1 : 0 }}>
            你是第 <span className="text-amber-300 font-black text-lg">{memberNo}</span> 位登上漫游岛的旅人
          </p>

          <button onClick={(e) => { e.stopPropagation(); goToGift(); }}
            className="hand-drawn-btn px-10 py-3.5 text-lg font-bold tracking-[0.2em] flex items-center gap-3 transition-all duration-700 delay-300"
            style={{ opacity: cardIn ? 1 : 0, transform: cardIn ? 'translateY(0)' : 'translateY(12px)' }}>
            收下居民证，启程 <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ========== 阶段三：赠卡仪式 ========== */}
      {phase === 'GIFT' && (
        <div className="flex flex-col items-center gap-8 w-full">
          <p className="text-center transition-all duration-700" style={{ opacity: giftIn && !flyOut ? 1 : 0, transform: giftIn ? 'translateY(0)' : 'translateY(-14px)' }}>
            <span className="block text-[11px] font-black tracking-[0.45em] uppercase text-white/50 mb-1">Memories Gifted</span>
            <span className="hand-drawn-title text-3xl text-white/90">{STARTER.length} 段记忆，已收入你的行囊</span>
          </p>

          {/* 扇形铺开的 5 张记忆卡 */}
          <div className="relative flex items-end justify-center" style={{ height: 240, width: '92vw', maxWidth: 760 }}>
            {STARTER.map((t, i) => {
              const off = i - (STARTER.length - 1) / 2;
              return (
                <div
                  key={i}
                  className="absolute w-36 h-52 rounded-2xl overflow-hidden hand-drawn-panel"
                  style={{
                    transform: flyOut
                      // 飞向屏幕左下（收藏库入口方向）
                      ? 'translate(-44vw, 60vh) rotate(-12deg) scale(0.35)'
                      : giftIn
                        ? `translateX(${off * 128}px) translateY(${Math.abs(off) * 14}px) rotate(${off * 7}deg) scale(1)`
                        : 'translateY(120px) scale(0.6) rotate(0deg)',
                    opacity: flyOut ? 0 : giftIn ? 1 : 0,
                    zIndex: 20 - Math.abs(off),
                    boxShadow: '0 16px 38px rgba(0,0,0,0.5)',
                    transition: flyOut
                      ? `transform 0.65s cubic-bezier(0.5,0,0.75,0) ${i * 0.05}s, opacity 0.6s ease ${i * 0.05}s`
                      : `transform 0.7s cubic-bezier(0.34,1.45,0.64,1) ${i * 0.16}s, opacity 0.5s ease ${i * 0.16}s`,
                  }}
                >
                  <div className="absolute inset-0" style={{ background: t.bg }} />
                  {renderTrackTexture(i)}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-slate-100 border-2 border-slate-800 flex items-center justify-center text-xs font-bold text-slate-700">{i + 1}</div>
                  <p className="absolute bottom-2.5 left-2.5 right-2.5 text-white font-bold text-xs leading-tight drop-shadow">{t.title}</p>
                </div>
              );
            })}
          </div>

          <p className="text-white/70 text-sm tracking-wider text-center transition-all duration-700 delay-500" style={{ opacity: giftIn && !flyOut ? 1 : 0 }}>
            它们都收进了你的<span className="text-amber-300 font-bold">收藏库</span> ♪ 随时在左下角的音乐卡片里翻看
          </p>

          <button onClick={enterGame} disabled={flyOut}
            className="hand-drawn-btn px-10 py-3.5 text-lg font-bold tracking-[0.2em] flex items-center gap-3 transition-all duration-700 delay-700 disabled:opacity-60"
            style={{ opacity: giftIn ? 1 : 0, transform: giftIn ? 'translateY(0)' : 'translateY(12px)' }}>
            进入漫游岛 <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
