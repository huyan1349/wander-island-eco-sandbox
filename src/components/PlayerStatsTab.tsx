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
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f7f2e6] text-slate-900 animate-in fade-in slide-in-from-bottom-4">
      <div className="min-h-full px-10 py-9">
        <div className="mb-7 flex items-center justify-between border-b border-slate-900/70 pb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-slate-500">Wander Island Archive</p>
            <h2 className="mt-2 text-3xl font-black tracking-[0.12em] text-slate-900">潮语者护照</h2>
          </div>
          <div className="hidden rounded-full border border-slate-900/30 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600 sm:block">
            No. {residentNo}
          </div>
        </div>

        {/* Identity dossier */}
        <section className="relative mb-7 overflow-hidden rounded-[6px] border border-slate-900/80 bg-[#fbf7eb] shadow-[0_12px_0_rgba(15,23,42,0.12)]">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(90deg, #0f172a 1px, transparent 1px), linear-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative grid gap-7 p-7 lg:grid-cols-[170px_1fr]">
            <div className="relative shrink-0 group">
              <div className="aspect-[4/5] w-[150px] overflow-hidden rounded-[4px] border border-slate-900 bg-[#e8efe8] p-2 shadow-[5px_5px_0_rgba(15,23,42,0.18)]">
                <div className="h-full w-full overflow-hidden rounded-[3px] bg-[#dfe9e1] flex items-center justify-center">
                  {avatarSrc ? <img src={avatarSrc} alt="" className="h-full w-full object-cover grayscale-[15%] saturate-[0.8]" /> : <User size={44} className="text-slate-500" />}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                <IdCard size={13} />
                Resident File
              </div>
          {authUser && (
                <label className="absolute inset-0 flex h-[188px] w-[150px] cursor-pointer items-center justify-center rounded-[4px] bg-slate-950/45 opacity-0 transition-opacity group-hover:opacity-100" title="更换头像">
              <Camera size={20} className="text-white" />
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
                        <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveName()} className="max-w-[320px] rounded-[4px] border border-slate-900 bg-white/70 px-3 py-2 text-2xl font-black tracking-[0.08em] text-slate-900 outline-none" />
                        <button onClick={handleSaveName} className="rounded-[4px] border border-slate-900 px-2 py-2 text-slate-800 hover:bg-slate-900 hover:text-white" title="保存名字"><Check size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <h3 className="truncate text-4xl font-black tracking-[0.14em] text-slate-950">{authUser ? authUser.username : playerName}</h3>
                        <button onClick={() => { AudioSystem.playClick(); setTempName(authUser ? authUser.username : playerName); setIsEditing(true); }} className="rounded-[4px] border border-transparent p-2 text-slate-500 hover:border-slate-900 hover:text-slate-900" title="修改名字"><Edit2 size={15} /></button>
                      </>
                    )}
                  </div>
                </div>
                <div className="rounded-[4px] border border-amber-800/50 bg-amber-100/40 px-4 py-3 text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-900/70">Current Rank</p>
                  <p className="mt-1 text-sm font-black tracking-[0.1em] text-amber-950">{rank}</p>
                </div>
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="border-t border-slate-900/30 pt-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">Island</p>
                  <p className="mt-1 truncate font-black text-slate-900">{residentCard.islandName || islandName || '未命名之岛'}</p>
                </div>
                <div className="border-t border-slate-900/30 pt-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">Level</p>
                  <p className="mt-1 font-black text-slate-900">LV.{playerLevel}</p>
                </div>
                <div className="border-t border-slate-900/30 pt-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">Issued</p>
                  <p className="mt-1 font-black text-slate-900">{residentCard.joinDate || '已登记'}</p>
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Experience</span>
                  <span className="text-xs font-black text-slate-600">{currentLevelXP} / {xpForNextLevel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-900/12">
                  <div className="h-full rounded-full bg-slate-900 transition-all duration-700" style={{ width: `${xpPercentage}%` }} />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">距下一级还差 {xpForNextLevel - currentLevelXP} 点经验</p>
              </div>
            </div>
          </div>
        </section>

        {/* Island status */}
        <section className="mb-7 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[6px] border border-slate-900/70 bg-[#fbf7eb] p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500"><Star size={14} /> Island Waking</p>
                <h3 className="mt-2 text-2xl font-black tracking-[0.08em] text-slate-900">岛屿苏醒度 · {awakeningTier}</h3>
              </div>
              <span className="font-mono text-xl font-black text-slate-900">{aw}/100</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-900/12">
              <div className="h-full rounded-full bg-[#274238] transition-all duration-700" style={{ width: `${aw}%` }} />
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">这不是生态评分，而是岛与你之间的关系记录。它醒得越深，回声和辞的表达就越接近完整。</p>
          </div>
          <div className="rounded-[6px] border border-slate-900/70 bg-[#f3f0e6] p-6">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500"><Compass size={14} /> Current Note</p>
            <p className="mt-3 text-lg font-black text-slate-900">当前旅程记录</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{journeyNote}</p>
          </div>
        </section>

        {/* Journey fields */}
        <section className="mb-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[6px] border border-slate-900/70 bg-[#fbf7eb] p-6">
            <div className="mb-5 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500"><Clock size={14} /> Journey Record</p>
              <span className="text-xs font-black text-slate-500">旅程摘要</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {journeyFields.map(field => (
                <div key={field.label} className="border-t border-slate-900/20 pt-3">
                  <p className="text-xs font-bold text-slate-500">{field.label}</p>
                  <p className="mt-1 text-2xl font-black tracking-[0.08em] text-slate-900">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[6px] border border-slate-900/70 bg-[#fbf7eb] p-6">
            <div className="mb-5 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500"><Layers size={14} /> Island Notes</p>
              <span className="text-xs font-black text-slate-500">轻量记录</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {islandFields.map(field => (
                <div key={field.label} className="border-t border-slate-900/20 pt-3">
                  <p className="text-xs font-bold text-slate-500">{field.label}</p>
                  <p className="mt-1 text-2xl font-black tracking-[0.08em] text-slate-900">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      {/* 成就陈列 */}
        <section className="rounded-[6px] border border-slate-900/70 bg-[#fbf7eb] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
              <Trophy size={18} className="text-slate-700" />
              <span className="font-black tracking-wide text-slate-900">成就记录</span>
              <span className="text-sm font-black text-slate-500">{achDone}/{ACHIEVEMENTS.length}</span>
          </div>
            <button onClick={() => { AudioSystem.playClick(); setActiveTab('card'); }} className="flex items-center gap-1 rounded-[4px] border border-slate-900/60 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-900 hover:text-white">居民证 <ChevronRight size={13} /></button>
        </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-900/12">
            <div className="h-full rounded-full bg-slate-800 transition-all duration-700" style={{ width: `${(achDone / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {ACHIEVEMENTS.map(a => {
            const done = unlockedAch.has(a.id);
            return (
                <div key={a.id} title={`${a.title} · ${a.desc}`} className={`flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-105 ${done ? 'border-slate-800 bg-slate-900 text-[#f7f2e6]' : 'border-slate-300 bg-slate-100 text-slate-400'}`}>
                  {done ? <Award size={16} /> : <Lock size={13} />}
              </div>
            );
          })}
        </div>
          <div className="rounded-[4px] border border-slate-900/15 bg-[#f3f0e6] px-4 py-3 text-sm text-slate-600">
            {nextAch ? <><span className="font-black text-slate-900">下一段旅程：</span>{nextAch.title} · {nextAch.desc}</> : <span className="font-black text-slate-900">全部成就已完成，这份护照已经写满了。</span>}
          </div>
        </section>
        </div>
    </div>
  );
};
