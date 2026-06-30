import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { ACHIEVEMENTS, getUnlocked, buildSnapshot } from '../lib/achievements';
import {
  User, Camera, Edit2, Check, Star, Clock, Layers,
  Trophy, ChevronRight, Award, Lock, IdCard, Compass, Sparkles, Sprout,
  Globe, TreePine, Waves
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
  if (grassHealth > 80 && lifeCount > 10) return '生机盎然';
  if (grassHealth > 50 && lifeCount > 5) return '微风拂绿';
  if (grassHealth > 20) return '初绽青芽';
  return '沉寂沙洲';
}

// 可复用的 Settings 风格卡片
function StatsCard({ title, icon, value, colorClass }: { title: string, icon: React.ReactNode, value: React.ReactNode, colorClass: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`w-full p-5 rounded-2xl border-[3px] border-slate-800 flex flex-col justify-between shadow-[4px_4px_0_rgba(15,23,42,1)] hover:shadow-[2px_2px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-default ${colorClass}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-2 border-slate-800 shrink-0 text-slate-800">
          {icon}
        </div>
        <span className="text-sm font-black text-slate-800">{title}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 mt-2 hand-drawn-title">{value}</div>
    </motion.div>
  );
}

interface PlayerStatsTabProps {
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setActiveTab: (tab: any) => void;
  exportIslandFile: () => void;
  setShowGift: (v: boolean) => void;
}

export const PlayerStatsTab: React.FC<PlayerStatsTabProps> = ({ handleAvatarUpload, setActiveTab, exportIslandFile, setShowGift }) => {
  const store = useGameStore();
  const authUser = store.authUser;
  const isOnline = !!authUser;

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(store.playerName);

  // Stats derivations
  const rankTitle = getRankTitle(store.playerLevel);
  const lifeCount = store.assets.filter((asset) => ['deer', 'wolf', 'seagull', 'dolphin', 'fish'].includes(asset.type)).length;
  const islandBreath = getIslandBreath(store.grassHealth, lifeCount);
  const playTimeHours = (store.stats.playtime / 3600).toFixed(1);
  const totalDays = Math.max(1, Math.floor(store.stats.playtime / 60));
  const treesPlanted = store.assets.filter((asset) => ['treeA', 'treeB', 'cherry_tree', 'bamboo', 'pine_tree', 'willow_tree', 'spirit_tree'].includes(asset.type)).length;

  const aw = store.awakening ?? 0;
  const awakeningTier = getAwakeningTier(aw);
  let journeyNote = '';
  if (aw >= 90) journeyNote = '这座岛已经完全醒来，它的脉搏与你同频。';
  else if (aw >= 70) journeyNote = '辞的声音变得清晰，岛屿在向你诉说它的记忆。';
  else if (aw >= 45) journeyNote = '微风中偶尔传来低语，岛屿正在从长眠中苏醒。';
  else if (aw >= 20) journeyNote = '新生的绿意带来了微弱的生机，有什么正在酝酿。';
  else journeyNote = '岛屿还在沉睡，等待着你用绿意唤醒它。';

  const snap = buildSnapshot(store);
  const unlockedAch = getUnlocked();
  const achDone = unlockedAch.size;
  const nextAch = ACHIEVEMENTS.find(a => !unlockedAch.has(a.id));

  const handleNameSave = () => {
    if (tempName.trim()) {
      store.setPlayerName(tempName.trim());
      if (isOnline) {
        api.updateProfile({ username: tempName.trim() }).catch(e => console.error(e));
      }
    }
    setIsEditingName(false);
    AudioSystem.playConfirm();
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-10 relative space-y-8 bg-[#fdfcf8]">

      {/* --- Profile Header (Settings Style) --- */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative bg-white rounded-[2rem] border-[3px] border-slate-800 shadow-[6px_6px_0_rgba(15,23,42,1)] p-8 flex flex-col md:flex-row gap-8 items-center md:items-start"
      >
        {/* Avatar */}
        <div className="relative group shrink-0">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-[#fbf7ec] border-[4px] border-slate-800 shadow-[4px_4px_0_rgba(15,23,42,1)] relative transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
            {store.playerAvatar ? (
              <img src={store.playerAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-800">
                <User size={56} strokeWidth={2.5} />
              </div>
            )}
            {/* Status indicator */}
            <div className="absolute bottom-1 right-2 w-7 h-7 rounded-full border-[3px] border-slate-800 bg-emerald-400 shadow-[2px_2px_0_rgba(15,23,42,1)]" />
          </div>
          <label className="absolute -bottom-2 -right-2 p-3 bg-white text-slate-800 rounded-full border-[3px] border-slate-800 cursor-pointer shadow-[2px_2px_0_rgba(15,23,42,1)] hover:bg-emerald-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95">
            <Camera size={20} strokeWidth={3} />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left w-full">
          <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                  className="text-4xl hand-drawn-title bg-slate-100 border-[3px] border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:bg-white text-slate-800 w-64 shadow-inner"
                  autoFocus
                />
                <button onClick={handleNameSave} className="p-3 bg-emerald-400 border-[3px] border-slate-800 text-slate-900 rounded-xl shadow-[3px_3px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_rgba(15,23,42,1)] transition-all">
                  <Check size={24} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-5xl hand-drawn-title text-slate-900 drop-shadow-sm">{store.playerName}</h2>
                <button onClick={() => setIsEditingName(true)} className="p-2.5 bg-white border-[3px] border-slate-800 text-slate-800 rounded-xl shadow-[2px_2px_0_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(15,23,42,1)] transition-all">
                  <Edit2 size={18} strokeWidth={3} />
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl border-2 border-slate-800 text-sm font-black shadow-[3px_3px_0_rgba(15,23,42,1)]">
              <span className="text-amber-400"><Star size={16} strokeWidth={3} /></span>
              LV.{store.playerLevel} {rankTitle}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-300 text-slate-900 rounded-xl border-2 border-slate-800 text-sm font-black shadow-[3px_3px_0_rgba(15,23,42,1)]">
              <Sprout size={16} strokeWidth={3} />
              {store.ecoPoints} Eco
            </div>
            {isOnline && (
              <div className="px-4 py-2 bg-sky-200 text-slate-900 rounded-xl border-2 border-slate-800 text-sm font-black shadow-[3px_3px_0_rgba(15,23,42,1)] flex items-center gap-2">
                <Globe size={16} strokeWidth={3} /> #{authUser?.id.slice(0,6)}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* --- Ecology & Journey Cards --- */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Awakening */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className="bg-[#fbf7ec] rounded-[2rem] border-[3px] border-slate-800 p-8 shadow-[6px_6px_0_rgba(15,23,42,1)]"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-2"><Sparkles size={16} strokeWidth={3} /> Island Waking</p>
              <h3 className="text-3xl hand-drawn-title text-slate-800">岛屿苏醒度 · {awakeningTier}</h3>
            </div>
            <div className="w-16 h-16 bg-white border-[3px] border-slate-800 rounded-2xl flex items-center justify-center shadow-[3px_3px_0_rgba(15,23,42,1)] -rotate-3">
              <span className="text-xl hand-drawn-title text-slate-800">{aw}<span className="text-xs">/100</span></span>
            </div>
          </div>

          <div className="h-6 w-full bg-slate-200 rounded-full border-[3px] border-slate-800 p-0.5 shadow-inner">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000 border-r-[3px] border-slate-800 relative" style={{ width: `${aw}%` }}>
               <div className="absolute top-1 left-2 right-2 h-1 bg-white/40 rounded-full" />
            </div>
          </div>
          <p className="mt-6 text-sm font-bold text-slate-600 leading-relaxed bg-white border-2 border-slate-800 p-4 rounded-xl shadow-[2px_2px_0_rgba(15,23,42,1)]">这不是生态评分，而是岛与你之间的关系记录。它醒得越深，回声和辞的表达就越接近完整。</p>
        </motion.div>

        {/* Current Note */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
          className="bg-amber-100 rounded-[2rem] border-[3px] border-slate-800 p-8 shadow-[6px_6px_0_rgba(15,23,42,1)]"
        >
          <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-2"><Compass size={16} strokeWidth={3} /> Current Note</p>
          <h3 className="text-3xl hand-drawn-title text-slate-800 mb-6">当前旅程记录</h3>
          <div className="bg-white border-[3px] border-slate-800 p-6 rounded-2xl shadow-[4px_4px_0_rgba(15,23,42,1)] rotate-1 hover:rotate-0 transition-transform">
            <p className="text-base font-bold text-slate-800 leading-relaxed italic border-l-4 border-amber-400 pl-4">{journeyNote}</p>
          </div>
        </motion.div>
      </div>

      {/* --- Stats Grid --- */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatsCard title="漫游时长" icon={<Clock />} value={`${playTimeHours}h`} colorClass="bg-sky-100" />
        <StatsCard title="历经日夜" icon={<Layers />} value={`${totalDays} 天`} colorClass="bg-rose-100" />
        <StatsCard title="播种希望" icon={<TreePine />} value={`${treesPlanted} 棵`} colorClass="bg-emerald-100" />
        <StatsCard title="岛屿共鸣" icon={<Waves />} value={islandBreath} colorClass="bg-indigo-100" />
      </motion.div>

      {/* --- Achievements Section --- */}
      <motion.section
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.4 }}
        className="bg-white rounded-[2rem] border-[3px] border-slate-800 p-8 lg:p-10 shadow-[6px_6px_0_rgba(15,23,42,1)]"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-5">
              <div className="w-16 h-16 flex items-center justify-center bg-amber-200 border-[3px] border-slate-800 rounded-2xl shadow-[4px_4px_0_rgba(15,23,42,1)] -rotate-6 hover:rotate-0 transition-transform">
                <Trophy size={32} className="text-slate-800" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-3xl hand-drawn-title text-slate-800 tracking-tight">成就勋章</h3>
                <p className="text-sm font-black text-slate-500 mt-1 flex items-center gap-2">
                  已收集 {achDone} / {ACHIEVEMENTS.length}
                </p>
              </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { AudioSystem.playClick(); setActiveTab('card'); }}
            className="px-6 py-4 bg-emerald-400 border-[3px] border-slate-800 text-slate-900 rounded-2xl text-sm font-black flex items-center gap-2 shadow-[4px_4px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgba(15,23,42,1)] transition-all"
          >
             查看居民证 <ChevronRight size={20} strokeWidth={3} />
          </motion.button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 h-5 w-full bg-slate-100 rounded-full border-[3px] border-slate-800 p-0.5 shadow-inner">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-1000 border-r-[3px] border-slate-800 relative" style={{ width: `${(achDone / ACHIEVEMENTS.length) * 100}%` }}>
             <div className="absolute top-1 left-2 right-2 h-1 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-4 mb-10">
          {ACHIEVEMENTS.map(a => {
            const done = unlockedAch.has(a.id);
            return (
                <motion.div
                  whileHover={{ scale: 1.1, y: -4, rotate: done ? [-5, 5, -5, 0] : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  key={a.id}
                  title={`${a.title} · ${a.desc}`}
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] transition-all cursor-help ${done ? 'border-slate-800 bg-amber-300 text-slate-900 shadow-[4px_4px_0_rgba(15,23,42,1)] hover:shadow-[6px_6px_0_rgba(15,23,42,1)] rotate-2' : 'border-slate-300 bg-slate-100 text-slate-400 shadow-none -rotate-2'}`}
                >
                  {done ? <Award size={32} strokeWidth={2.5} /> : <Lock size={24} strokeWidth={3} />}
              </motion.div>
            );
          })}
        </div>

        {/* Next Goal */}
        <div className="rounded-2xl border-[3px] border-slate-800 bg-amber-50 p-6 text-sm text-slate-600 shadow-[4px_4px_0_rgba(15,23,42,1)] relative overflow-hidden flex items-center justify-between">
          <div className="relative z-10 flex-1">
            {nextAch ? (
              <>
                <div className="font-black text-slate-800 flex items-center gap-2 mb-2 text-base">
                  <Star size={18} className="text-amber-500" strokeWidth={3} fill="currentColor" /> 下一段旅程目标
                </div>
                <div className="font-black text-xl text-slate-900 mb-1">{nextAch.title}</div>
                <div className="text-slate-600 font-bold">{nextAch.desc}</div>
              </>
            ) : (
              <div className="font-black text-slate-800 text-xl flex items-center gap-3"><Award size={24} className="text-amber-500" /> 全部成就已完成，这份护照已经写满了。</div>
            )}
          </div>
          {nextAch && <div className="hidden sm:flex w-16 h-16 rounded-full bg-white border-[3px] border-slate-800 items-center justify-center shadow-[2px_2px_0_rgba(15,23,42,1)] shrink-0 opacity-80"><Lock size={24} className="text-slate-400" /></div>}
        </div>
      </motion.section>
    </div>
  );
};
