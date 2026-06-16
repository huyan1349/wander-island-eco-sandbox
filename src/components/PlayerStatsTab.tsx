// 玩家面板 - 概览(stats)标签页（从 PlayerPanel.tsx 抽离）。
// 自取 store 数据、自管改名状态；改头像与切页通过 props 复用父组件逻辑。
import React, { useState } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { ACHIEVEMENTS, getUnlocked, buildSnapshot } from '../lib/achievements';
import {
  User, Camera, Edit2, Check, Star, Leaf, Clock, Layers,
  TreePine, Home, Rabbit, Trophy, ChevronRight, Award, Lock,
} from 'lucide-react';

function getRankTitle(level: number): string {
  if (level >= 20) return '漫游岛传奇';
  if (level >= 12) return '漫游岛大师';
  if (level >= 8) return '岛屿守护者';
  if (level >= 5) return '资深漫游者';
  if (level >= 3) return '漫游者';
  return '初临漫游者';
}

type Tab = 'stats' | 'card' | 'ecology' | 'unlocks' | 'social' | 'system';

interface PlayerStatsTabProps {
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
}

export const PlayerStatsTab: React.FC<PlayerStatsTabProps> = ({ handleAvatarUpload, setActiveTab }) => {
  const {
    playerName, setPlayerName, playerLevel, playerXP, playerAvatar,
    islandName, stats, ecoPoints, deerCount, wolfCount,
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

  return (
    <div className="flex-1 p-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto custom-scrollbar">

      {/* Hero header：头像 + 可改名 + 段位 + 经验条 */}
      <div className="flex items-center gap-6 mb-8 border-b-2 border-slate-800 pb-8">
        <div className="relative shrink-0 group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-800 shadow-[4px_4px_0_rgba(15,23,42,0.2)] bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 flex items-center justify-center">
            {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : <User size={40} className="text-slate-500" />}
          </div>
          {authUser && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="更换头像">
              <Camera size={20} className="text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          )}
          <div className="absolute -bottom-1 -right-1 bg-slate-900 text-emerald-400 text-xs font-black px-2 py-0.5 rounded-lg border border-slate-700 shadow">LV.{playerLevel}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveName()} className="hand-drawn-panel px-3 py-1 text-2xl font-bold text-slate-800 focus:outline-none max-w-[260px]" style={{ borderWidth: '2px' }} />
                <button onClick={handleSaveName} className="hand-drawn-btn p-2 text-emerald-600"><Check size={16} /></button>
              </div>
            ) : (
              <>
                <h2 className="text-3xl hand-drawn-title text-slate-800 truncate">{authUser ? authUser.username : playerName}</h2>
                <button onClick={() => { AudioSystem.playClick(); setTempName(authUser ? authUser.username : playerName); setIsEditing(true); }} className="hand-drawn-btn p-1.5 shrink-0" title="修改名字"><Edit2 size={13} /></button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 ring-1 ring-amber-300 px-2.5 py-1 rounded-full"><Star size={12} /> {rank}</span>
            <span className="text-xs text-slate-500 truncate">🏝️ {islandName}</span>
            {authUser && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">在线</span>}
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase">经验 · 距下一级还差 {xpForNextLevel - currentLevelXP}</span>
              <span className="text-[10px] font-bold text-slate-600">{currentLevelXP} / {xpForNextLevel}</span>
            </div>
            <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-300/60">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700 rounded-full" style={{ width: `${xpPercentage}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 数据网格 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: <Leaf size={20} className="text-emerald-500" />, label: '生态点', value: ecoPoints, accent: 'from-emerald-500/10' },
          { icon: <Clock size={20} className="text-blue-500" />, label: '游戏时长', value: `${Math.floor(stats.playtime / 60)}m` },
          { icon: <Layers size={20} className="text-amber-500" />, label: '已放置', value: stats.itemsPlaced },
          { icon: <TreePine size={20} className="text-green-600" />, label: '树木', value: snap.treeCount },
          { icon: <Home size={20} className="text-orange-500" />, label: '建筑', value: snap.buildingCount },
          { icon: <Rabbit size={20} className="text-rose-500" />, label: '生灵', value: deerCount + wolfCount },
        ].map((s, i) => (
          <div key={i} className={`hand-drawn-panel p-5 flex items-center gap-4 ${s.accent ? `bg-gradient-to-br ${s.accent} to-transparent` : ''}`} style={{ borderWidth: '2px' }}>
            <div className="w-11 h-11 rounded-2xl bg-white/60 ring-1 ring-slate-200 flex items-center justify-center shrink-0">{s.icon}</div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase truncate">{s.label}</p>
              <p className="text-2xl font-light text-slate-800 tracking-wider">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 成就陈列 */}
      <div className="hand-drawn-panel p-6" style={{ borderWidth: '2px' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <span className="font-bold text-slate-800 tracking-wide">成就</span>
            <span className="text-sm font-bold text-amber-600">{achDone}/{ACHIEVEMENTS.length}</span>
          </div>
          <button onClick={() => { AudioSystem.playClick(); setActiveTab('card'); }} className="hand-drawn-btn px-3 py-1.5 text-xs font-bold flex items-center gap-1">居民证 <ChevronRight size={13} /></button>
        </div>
        <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden shadow-inner mb-4">
          <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-700" style={{ width: `${(achDone / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {ACHIEVEMENTS.map(a => {
            const done = unlockedAch.has(a.id);
            return (
              <div key={a.id} title={`${a.title} · ${a.desc}`} className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110 ${done ? 'bg-gradient-to-tr from-amber-300 to-yellow-500 border-slate-800 shadow-[2px_2px_0_rgba(15,23,42,0.25)]' : 'bg-slate-200 border-slate-300'}`}>
                {done ? <Award size={18} className="text-slate-900" /> : <Lock size={15} className="text-slate-400" />}
              </div>
            );
          })}
        </div>
        <div className="text-sm text-slate-600 bg-amber-50/60 rounded-xl px-4 py-2.5 ring-1 ring-amber-100">
          {nextAch ? <><span className="font-bold text-amber-700">下一目标：</span>{nextAch.title} — {nextAch.desc}</> : <span className="font-bold text-emerald-600">🎉 已集齐全部成就，了不起的漫游者！</span>}
        </div>
      </div>
    </div>
  );
};
