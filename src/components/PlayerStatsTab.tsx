// 玩家面板 - 概览(stats)标签页（从 PlayerPanel.tsx 抽离）。
// 自取 store 数据、自管改名状态；改头像与切页通过 props 复用父组件逻辑。
import React, { useState } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { ACHIEVEMENTS, getUnlocked, buildSnapshot } from '../lib/achievements';
import {
  User, Camera, Edit2, Check, Star, Clock, Layers,
  Trophy, ChevronRight, Award, Lock, IdCard, Compass,
} from 'lucide-react';

function getRankTitle(level: number): string {
  if (level >= 20) return '漫游岛传奇';
  if (level >= 12) return '漫游岛大师';
  if (level >= 8) return '岛屿守护者';
  if (level >= 5) return '资深漫游者';
  if (level >= 3) return '漫游者';
  return '初临漫游者';
}

function getAwakeningTier(awakening: number): string {
  if (awakening >= 90) return '和声';
  if (awakening >= 70) return '清醒';
  if (awakening >= 45) return '苏醒';
  if (awakening >= 20) return '微醒';
  return '沉睡';
}

function getIslandBreath(grassHealth: number, lifeCount: number): string {
  if (grassHealth >= 80 && lifeCount > 0) return '丰茂';
  if (grassHealth >= 60) return '稳定';
  if (grassHealth >= 35) return '复苏中';
  return '低语';
}

function getSeasonLabel(season: string): string {
  const labels: Record<string, string> = {
    spring: '春',
    summer: '夏',
    autumn: '秋',
    winter: '冬',
  };
  return labels[season] || season;
}

function getWeatherLabel(weather: string): string {
  const labels: Record<string, string> = {
    sunny: '晴',
    cloudy: '云',
    rainy: '雨',
    foggy: '雾',
    snowy: '雪',
    stormy: '风暴',
  };
  return labels[weather] || weather;
}

function readResidentCardFallback(authUser: ReturnType<typeof useGameStore.getState>['authUser'], playerName: string, islandName: string) {
  try {
    const raw = localStorage.getItem('resident_card');
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore local card read */
  }
  const memberNo = authUser?.residentNo ?? authUser?.memberNo ?? 1;
  return {
    name: authUser?.username || playerName,
    islandName,
    memberNo,
    residentNo: memberNo,
    joinDate: '',
    uid: `WI-${String(memberNo).padStart(6, '0')}`,
  };
}

type Tab = 'stats' | 'card' | 'ecology' | 'unlocks' | 'social' | 'system';

interface PlayerStatsTabProps {
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
}

export const PlayerStatsTab: React.FC<PlayerStatsTabProps> = ({ handleAvatarUpload, setActiveTab }) => {
  const {
    playerName, setPlayerName, playerLevel, playerXP, playerAvatar,
    islandName, stats, ecoPoints, deerCount, wolfCount, awakening,
    grassHealth, weather, season,
  } = useGameStore();
  const authUser = useGameStore(state => state.authUser);
  const setAuthUser = useGameStore(state => state.setAuthUser);

  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(playerName);

  const xpForNextLevel = 100;
  const currentLevelXP = playerXP % 100;
  const xpPercentage = (currentLevelXP / 100) * 100;

  const handleSaveName = async () => {
    AudioSystem.playConfirm();
    if (tempName.trim()) {
      setPlayerName(tempName.trim());
      if (authUser) {
        try {
          const res = await api.updateProfile({ username: tempName.trim() });
          setAuthUser(res.user);
        } catch {}
      }
    } else {
      setTempName(authUser ? authUser.username : playerName);
    }
    setIsEditing(false);
  };

  const snap = buildSnapshot(useGameStore.getState());
  const unlockedAch = getUnlocked();
  const achDone = ACHIEVEMENTS.filter(a => unlockedAch.has(a.id)).length;
  const nextAch = ACHIEVEMENTS.find(a => !unlockedAch.has(a.id));
  const rank = getRankTitle(playerLevel);
  const avatarSrc = authUser ? authUser.avatar : playerAvatar;
  const residentCard = readResidentCardFallback(authUser, playerName, islandName);
  const residentNo = String(residentCard.residentNo ?? residentCard.memberNo ?? authUser?.residentNo ?? authUser?.memberNo ?? 1).padStart(5, '0');
  const aw = Math.round(awakening);
  const awakeningTier = getAwakeningTier(aw);
  const lifeCount = deerCount + wolfCount;
  const islandBreath = getIslandBreath(grassHealth, lifeCount);
  const journeyFields = [
    { label: '旅程时长', value: `${Math.floor(stats.playtime / 60)}m` },
    { label: '已放置', value: stats.itemsPlaced },
    { label: '成就', value: `${achDone}/${ACHIEVEMENTS.length}` },
    { label: '生态点', value: ecoPoints },
  ];
  const islandFields = [
    { label: '岛屿气息', value: islandBreath },
    { label: '季节天气', value: `${getSeasonLabel(season)} · ${getWeatherLabel(weather)}` },
    { label: '生灵踪迹', value: lifeCount },
    { label: '树木记录', value: snap.treeCount },
  ];
  const journeyNote = stats.playtime >= 3600
    ? '这份护照已经记录下一段很长的停留。岛上留下的不是数值，而是你反复回来过的证据。'
    : stats.itemsPlaced >= 100
      ? '岛上已经有了足够多的痕迹。下一步不必急着扩张，适合开始整理属于你的记忆。'
      : stats.itemsPlaced > 0
        ? '旅程已经开始。你放下的物件会慢慢变成这座岛的个人历史。'
        : '这份护照刚刚签发。岛还很安静，等待第一件真正属于你的东西。';

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f4ebd0] text-slate-900 animate-in fade-in slide-in-from-bottom-4 relative">
      <div className="absolute inset-0 bg-grid-paper opacity-40 mix-blend-multiply pointer-events-none" />
      
      <div className="relative z-10 min-h-full px-10 py-9 max-lg:px-6">
        <div className="mb-8 flex items-center justify-between border-b-[3px] border-dashed border-slate-800/30 pb-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-600 mb-2">
              <Compass size={16} strokeWidth={2.5} />
              Wander Island Archive
            </p>
            <h2 className="hand-drawn-title text-4xl text-slate-800">潮语者护照</h2>
          </div>
          <div className="stamp border-slate-500 text-slate-600 px-3 py-1.5 text-xs font-black tracking-widest hidden sm:block">
            NO. {residentNo}
          </div>
        </div>

        {/* Identity dossier */}
        <section className="hand-drawn-panel mb-8 bg-white p-7 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[160px_1fr]">
            <div className="relative shrink-0 group">
              <div className="aspect-[4/5] w-[150px] overflow-hidden border-[3px] border-slate-800 bg-[#e8efe8] p-2 shadow-[4px_4px_0_#2d3436] rotate-[-2deg]">
                <div className="h-full w-full border-[3px] border-slate-800 bg-[#dfe9e1] flex items-center justify-center relative overflow-hidden">
                  {avatarSrc ? <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover grayscale-[20%] saturate-[0.8] hover:grayscale-0 hover:saturate-100 transition-all duration-500" /> : <User size={44} className="text-slate-500" />}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 rotate-[-2deg]">
                <IdCard size={14} strokeWidth={2.5} />
                Resident File
              </div>
              {authUser && (
                <label className="absolute inset-0 flex h-[188px] w-[150px] cursor-pointer items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100 rotate-[-2deg]" title="更换头像">
                  <Camera size={24} className="text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              )}
            </div>

            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">Name of Tide Speaker</p>
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveName()} className="max-w-[320px] rounded-none border-[3px] border-slate-800 bg-slate-50 px-3 py-2 text-2xl font-black tracking-[0.08em] text-slate-900 outline-none" />
                        <button onClick={handleSaveName} className="hand-drawn-btn p-2 text-slate-800" title="保存名字"><Check size={20} strokeWidth={3} /></button>
                      </div>
                    ) : (
                      <>
                        <h3 className="hand-drawn-title truncate text-5xl text-slate-800">{authUser ? authUser.username : playerName}</h3>
                        <button onClick={() => { AudioSystem.playClick(); setTempName(authUser ? authUser.username : playerName); setIsEditing(true); }} className="p-2 text-slate-400 hover:text-slate-800 transition-colors" title="修改名字"><Edit2 size={18} strokeWidth={2.5} /></button>
                      </>
                    )}
                  </div>
                </div>
                <div className="stamp border-amber-600 text-amber-700 px-4 py-2 text-right rotate-[3deg]">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] opacity-80">Current Rank</p>
                  <p className="mt-1 text-sm font-black tracking-widest">{rank}</p>
                </div>
              </div>

              <div className="grid gap-4 text-sm md:grid-cols-3">
                <div className="border-t-[2px] border-dashed border-slate-300 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 mb-1">Island</p>
                  <p className="truncate font-black text-slate-800 text-lg">{residentCard.islandName || islandName || '未命名之岛'}</p>
                </div>
                <div className="border-t-[2px] border-dashed border-slate-300 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 mb-1">Level</p>
                  <p className="font-black text-slate-800 text-lg">LV.{playerLevel}</p>
                </div>
                <div className="border-t-[2px] border-dashed border-slate-300 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 mb-1">Issued</p>
                  <p className="font-black text-slate-800 text-lg">{residentCard.joinDate || '已登记'}</p>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Experience</span>
                  <span className="hand-drawn-title text-xl text-slate-700">{currentLevelXP} / {xpForNextLevel}</span>
                </div>
                <div className="h-3 w-full border-[3px] border-slate-800 bg-slate-100 p-0.5" style={{ borderRadius: '15px 5px 15px 5px' }}>
                  <div className="h-full bg-slate-800 transition-all duration-700" style={{ width: `${xpPercentage}%`, borderRadius: '8px 2px 8px 2px' }} />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500">距下一级还差 {xpForNextLevel - currentLevelXP} 点经验</p>
              </div>
            </div>
          </div>
        </section>

        {/* Island status */}
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="hand-drawn-panel bg-white p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500"><Star size={16} strokeWidth={2.5} /> Island Waking</p>
                <h3 className="hand-drawn-title mt-2 text-3xl text-slate-800">岛屿苏醒度 · {awakeningTier}</h3>
              </div>
              <span className="hand-drawn-title text-3xl text-slate-800">{aw}/100</span>
            </div>
            <div className="h-3 w-full border-[3px] border-slate-800 bg-slate-100 p-0.5" style={{ borderRadius: '5px 15px 5px 15px' }}>
              <div className="h-full bg-emerald-700 transition-all duration-700 relative" style={{ width: `${aw}%`, borderRadius: '2px 8px 2px 8px' }}>
                 <div className="absolute top-0.5 left-1 right-1 h-0.5 bg-white/30 rounded-full" />
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-relaxed text-slate-600">这不是生态评分，而是岛与你之间的关系记录。它醒得越深，回声和辞的表达就越接近完整。</p>
          </div>
          <div className="hand-drawn-panel bg-[#faf9f5] p-6">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500"><Compass size={16} strokeWidth={2.5} /> Current Note</p>
            <p className="hand-drawn-title mt-3 text-2xl text-slate-800">当前旅程记录</p>
            <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">{journeyNote}</p>
          </div>
        </section>

        {/* Journey fields */}
        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="hand-drawn-panel bg-white p-6">
            <div className="mb-5 flex items-center justify-between border-b-[2px] border-dashed border-slate-300 pb-4">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500"><Clock size={16} strokeWidth={2.5} /> Journey Record</p>
              <span className="text-xs font-black text-slate-500">旅程摘要</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {journeyFields.map(field => (
                <div key={field.label}>
                  <p className="text-xs font-black tracking-widest text-slate-500">{field.label}</p>
                  <p className="hand-drawn-title mt-1 text-3xl text-slate-800">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hand-drawn-panel bg-white p-6">
            <div className="mb-5 flex items-center justify-between border-b-[2px] border-dashed border-slate-300 pb-4">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500"><Layers size={16} strokeWidth={2.5} /> Island Notes</p>
              <span className="text-xs font-black text-slate-500">轻量记录</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {islandFields.map(field => (
                <div key={field.label}>
                  <p className="text-xs font-black tracking-widest text-slate-500">{field.label}</p>
                  <p className="hand-drawn-title mt-1 text-3xl text-slate-800">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 成就陈列 */}
        <section className="hand-drawn-panel bg-[#faf9f5] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
                <Trophy size={20} className="text-slate-800" strokeWidth={2.5} />
                <span className="hand-drawn-title text-2xl text-slate-800">成就记录</span>
                <span className="hand-drawn-title text-xl text-slate-500">{achDone}/{ACHIEVEMENTS.length}</span>
            </div>
            <button onClick={() => { AudioSystem.playClick(); setActiveTab('card'); }} className="hand-drawn-btn flex items-center gap-1 bg-white px-4 py-2 text-sm font-black text-slate-800">
               居民证 <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
          <div className="mb-6 h-3 w-full border-[3px] border-slate-800 bg-slate-100 p-0.5" style={{ borderRadius: '15px 5px 15px 5px' }}>
            <div className="h-full bg-slate-800 transition-all duration-700 relative" style={{ width: `${(achDone / ACHIEVEMENTS.length) * 100}%`, borderRadius: '8px 2px 8px 2px' }}>
               <div className="absolute top-0.5 left-1 right-1 h-0.5 bg-white/30 rounded-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mb-6">
            {ACHIEVEMENTS.map(a => {
              const done = unlockedAch.has(a.id);
              return (
                  <div key={a.id} title={`${a.title} · ${a.desc}`} className={`flex h-10 w-10 items-center justify-center rounded-sm border-[3px] transition-transform hover:scale-110 cursor-help ${done ? 'border-slate-800 bg-amber-200 text-amber-900 shadow-[2px_2px_0_#2d3436] rotate-1' : 'border-slate-300 bg-slate-100 text-slate-400 rotate-[-1deg]'}`}>
                    {done ? <Award size={20} strokeWidth={2.5} /> : <Lock size={16} strokeWidth={2.5} />}
                </div>
              );
            })}
          </div>
          <div className="rounded-sm border-[2px] border-dashed border-slate-300 bg-white px-5 py-4 text-sm text-slate-600">
            {nextAch ? <><span className="font-black text-slate-800">下一段旅程：</span>{nextAch.title} · {nextAch.desc}</> : <span className="font-black text-slate-800">全部成就已完成，这份护照已经写满了。</span>}
          </div>
        </section>
      </div>
    </div>
  );
};
