import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Feather, Compass, Sprout, Wind, PawPrint, Calendar, BookOpen, Star, Users, Gift, Heart } from 'lucide-react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { lazyNamed } from '../lib/lazyNamed';

const GiftModal = lazyNamed(() => import('./GiftModal'), 'GiftModal');

type VisitorLog = {
  id: string;
  visitor_name?: string;
  visitor_avatar?: string;
  message?: string;
  rating?: number;
  created_at?: number | string;
};

const WEATHER_LABEL: Record<string, string> = {
  sunny: '晴',
  cloudy: '多云',
  rainy: '雨',
  foggy: '雾',
  snowy: '雪',
  stormy: '风暴',
};

const SEASON_LABEL: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

function formatVisitDate(value?: number | string) {
  if (!value) return '刚刚';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function renderRating(rating = 0) {
  const count = Math.max(0, Math.min(5, Math.round(rating)));
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      size={12}
      className={index < count ? 'text-slate-800 fill-slate-800' : 'text-slate-300'}
      strokeWidth={2.5}
    />
  ));
}

export const IslandStatusPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const authUser = useGameStore((state) => state.authUser);
  const islandId = useGameStore((state) => state.islandId);
  const islandName = useGameStore((state) => state.islandName);
  const serverIslandMap = useGameStore((state) => state.serverIslandMap);
  const assets = useGameStore((state) => state.assets);
  const stats = useGameStore((state) => state.stats);
  const ecoPoints = useGameStore((state) => state.ecoPoints);
  const grassHealth = useGameStore((state) => state.grassHealth);
  const awakening = useGameStore((state) => state.awakening);
  const weather = useGameStore((state) => state.weather);
  const season = useGameStore((state) => state.season);
  const biome = useGameStore((state) => state.biome);

  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(authUser?.visitorCount || 0);
  const [loading, setLoading] = useState(false);
  const [syncNote, setSyncNote] = useState('');
  const [showGift, setShowGift] = useState(false);

  const islandMood = useMemo(() => {
    if (awakening >= 70) return '岛屿正在醒来';
    if (grassHealth < 35) return '岛屿需要照料';
    if (assets.length >= 45) return '生态圈活动稳定';
    return '岛屿保持安静';
  }, [assets.length, awakening, grassHealth]);

  useEffect(() => {
    let alive = true;

    async function loadVisitors() {
      if (!authUser) {
        setSyncNote('持护照登录后可见真实的观测记录。');
        setLoading(false);
        return;
      }

      setLoading(true);
      setSyncNote('');
      try {
        let targetIslandId = islandId ? serverIslandMap[islandId] : undefined;
        if (!targetIslandId) {
          const myIslands = await api.getMyIslands();
          const matched = myIslands.islands.find((island: any) => island.name === islandName) || myIslands.islands[0];
          targetIslandId = matched?.id;
        }

        if (!targetIslandId) {
          if (alive) setSyncNote('观测站尚未收到关于这座岛的信号。');
          return;
        }

        const res = await api.getVisitors(targetIslandId);
        if (!alive) return;
        setVisitors(res.visitors || []);
        setTotalVisitors(res.totalVisitors || 0);
      } catch (error) {
        if (alive) setSyncNote('风暴干扰了记录读取，请稍后。');
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadVisitors();
    return () => {
      alive = false;
    };
  }, [authUser, islandId, islandName, serverIslandMap]);

  return (
    <AnimatePresence>
    <motion.div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 cinematic-vignette p-4 overflow-hidden pointer-events-auto" 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      
      <motion.section
        className="hand-drawn-panel relative w-[1000px] h-[640px] max-w-[96vw] max-h-[90vh] flex flex-col shadow-[0_20px_50px_rgba(15,23,42,0.3)] bg-[#fbf7ec] border-[3px] border-slate-800 rounded-[32px] p-0"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        <div className="absolute inset-0 bg-grid-paper opacity-40 mix-blend-multiply pointer-events-none" style={{ borderRadius: 'inherit' }} />
        
        <motion.button 
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { AudioSystem.playClose(); onClose(); }} 
          className="absolute z-50 p-2.5 rounded-full bg-white text-slate-800 border-2 border-slate-800 shadow-[3px_3px_0_rgba(15,23,42,1)] hover:shadow-[1px_1px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center top-6 right-6"
          title="合上笔记"
        >
           <X size={20} strokeWidth={3} />
        </motion.button>

        <div className="relative z-10 flex w-full h-full max-lg:flex-col overflow-hidden" style={{ borderRadius: 'inherit' }}>
          
          {/* Left Page: Ecology Log */}
          <div className="relative flex-1 p-8 lg:p-10 border-r-2 border-dashed border-slate-300 max-lg:border-r-0 max-lg:border-b-2 overflow-y-auto custom-scrollbar">
            
            {/* 胶带装饰 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-amber-500/20 rotate-[-2deg] mix-blend-multiply pointer-events-none" />
            
            {/* 咖啡渍装饰 */}
            <svg className="absolute -bottom-10 -left-10 w-48 h-48 opacity-[0.04] pointer-events-none -rotate-12" viewBox="0 0 100 100" fill="#78350f">
               <path d="M49.4,12.3c15.1-1.3,30.3,5.1,38.2,18.4c7.9,13.2,7.3,30.4-1.3,43.2c-8.7,12.7-24.8,19.3-39.7,17.2c-14.9-2.2-27.4-13.4-33-27.3 C7.9,49.8,11,33.5,21.6,22.1C32.3,10.6,49.4,12.3,49.4,12.3z" />
               <path d="M51,18c12,0,22,8,26,19c3,9,1,20-5,27c-6,7-16,11-26,9c-9-1-17-8-20-17c-4-9-1-19,5-26C37,23,44,18,51,18z" fill="none" stroke="#78350f" strokeWidth="2" />
            </svg>

            {/* Header: Field Journal Style */}
            <div className="relative mb-10 border-b-[3px] border-slate-800 pb-6">
              <div className="flex items-center gap-3 mb-4 opacity-70 relative">
                <Feather size={20} strokeWidth={2} className="animate-[bounce_3s_ease-in-out_infinite]" />
                <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Field Observation Log</span>
              </div>
              <h2 className="hand-drawn-title text-5xl text-slate-900 mb-5 tracking-wide leading-tight">
                {islandName || '未命名之岛'}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-700 mt-2">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border-[2px] border-slate-800 shadow-[2px_2px_0_#2d3436] rotate-[-1.5deg]"><Wind size={16} className="text-amber-600" /> {SEASON_LABEL[season]} · {WEATHER_LABEL[weather]}</span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 border-[2px] border-slate-800 shadow-[2px_2px_0_#2d3436] rotate-[1deg]"><Compass size={16} className="text-sky-600" /> {biome}</span>
                
                {/* 岛屿心情印章 */}
                <div className="lg:ml-auto relative">
                   <div className="absolute inset-0 border-[2px] border-emerald-800 rounded-sm opacity-10" style={{ transform: 'rotate(2deg)' }} />
                   <span className="flex items-center gap-1.5 text-emerald-900 bg-[#fdfcf8] border-[2px] border-emerald-800 border-dashed px-4 py-1.5 text-[11px] font-black tracking-widest uppercase rotate-[-2deg] shadow-[2px_2px_0_rgba(6,78,59,0.15)]">
                     <Sprout size={14} className="text-emerald-700" /> 评估：{islandMood}
                   </span>
                </div>
              </div>
            </div>

            {/* Ecological Metrics */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-6 opacity-80">
                <Sprout size={18} strokeWidth={2.5} className="text-emerald-800" />
                <h3 className="text-lg font-black tracking-widest text-slate-800">生态指标评估</h3>
              </div>
              
              <div className="space-y-7">
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-black text-slate-700 tracking-wider">世界苏醒度 (Awakening)</span>
                    <span className="hand-drawn-title text-2xl text-slate-900">{Math.round(awakening)}%</span>
                  </div>
                  {/* Sketchy Meter */}
                  <div className="relative h-4 w-full bg-[#fdfcf8] border-[2px] border-slate-800 p-[2px] rotate-[-0.5deg]">
                     <div className="h-full bg-slate-800 transition-all duration-1000 relative overflow-hidden" style={{ width: `${Math.max(0, Math.min(100, Math.round(awakening)))}%` }}>
                        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wLDRMODwsMEw4LDhMMCw4WiIgZmlsbD0iIzAwMCI+PC9wYXRoPgo8L3N2Zz4=')] mix-blend-overlay" />
                     </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 italic">反映岛屿对潮语者的共鸣深度。</p>
                </div>

                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-black text-slate-700 tracking-wider">植被繁荣度 (Flora Health)</span>
                    <span className="hand-drawn-title text-2xl text-slate-900">{Math.round(grassHealth)}%</span>
                  </div>
                  {/* Sketchy Meter */}
                  <div className="relative h-4 w-full bg-[#fdfcf8] border-[2px] border-slate-800 p-[2px] rotate-[0.5deg]">
                     <div className="h-full bg-emerald-700 transition-all duration-1000 relative overflow-hidden" style={{ width: `${Math.max(0, Math.min(100, Math.round(grassHealth)))}%` }}>
                        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wLDRMODwsMEw4LDhMMCw4WiIgZmlsbD0iIzAwMCI+PC9wYXRoPgo8L3N2Zz4=')] mix-blend-overlay" />
                     </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 italic">影响岛屿自发生长与自然演替的速率。</p>
                </div>
              </div>
            </div>

            {/* Asset Inventory */}
            <div>
              <div className="flex items-center gap-2 mb-4 opacity-80">
                <BookOpen size={18} strokeWidth={2.5} className="text-amber-800" />
                <h3 className="text-lg font-black tracking-widest text-slate-800">万物卷宗</h3>
              </div>
              <ul className="grid grid-cols-2 gap-4">
                <li className="relative bg-white border-[2px] border-slate-800 p-4 flex flex-col justify-center shadow-[4px_4px_0_#2d3436] rotate-[-1.5deg] hover:rotate-0 transition-transform">
                  <div className="absolute -top-2 left-4 w-8 h-3 bg-red-400/30 rotate-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><PawPrint size={12}/> Human Artifacts</p>
                  <p className="hand-drawn-title text-4xl text-slate-900">{stats.itemsPlaced || assets.length}</p>
                </li>
                <li className="relative bg-white border-[2px] border-slate-800 p-4 flex flex-col justify-center shadow-[4px_4px_0_#2d3436] rotate-[1.5deg] hover:rotate-0 transition-transform">
                  <div className="absolute -top-2 right-4 w-8 h-3 bg-blue-400/30 rotate-[-2deg]" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Sprout size={12}/> Eco Points</p>
                  <p className="hand-drawn-title text-4xl text-slate-900">{ecoPoints}</p>
                </li>
              </ul>
            </div>

            {/* Gift Section */}
            <div className="mt-8 pt-8 border-t-[3px] border-dashed border-slate-300">
               <div className="flex items-center gap-2 mb-4 opacity-80">
                 <Gift size={18} strokeWidth={2.5} className="text-rose-600" />
                 <h3 className="text-lg font-black tracking-widest text-slate-800">礼物与分享</h3>
               </div>
               <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-[2px] border-slate-800 p-5 shadow-[4px_4px_0_#2d3436] transition-transform hover:-translate-y-1" style={{ borderRadius: '15px 4px 15px 4px' }}>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white border-[2px] border-slate-800 rounded-full flex items-center justify-center shrink-0 shadow-[2px_2px_0_#2d3436]">
                        <Gift size={22} className="text-rose-500" />
                     </div>
                     <div className="flex-1">
                        <p className="font-bold text-slate-800 mb-1">将这座小岛打包为礼物</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-bold">生成一张3D礼物卡，附上寄语，将小岛当前的生态作为礼物送出。</p>
                     </div>
                  </div>
                  <button onClick={() => { AudioSystem.playClick(); setShowGift(true); }} className="mt-4 w-full hand-drawn-btn bg-white py-3 font-bold text-slate-800 flex items-center justify-center gap-2 border-[2px] border-slate-800">
                     <Gift size={16} /> 制作礼物卡
                  </button>
               </div>
            </div>

          </div>

          {/* Right Page: Guestbook */}
          <div className="flex-1 p-8 lg:p-10 flex flex-col min-h-[400px]">
            <div className="mb-6 flex items-end justify-between border-b-[3px] border-slate-800 pb-4">
               <div className="flex items-center gap-3 opacity-90">
                 <PawPrint size={24} strokeWidth={2.5} className="text-slate-800" />
                 <h3 className="hand-drawn-title text-3xl text-slate-900">留名册</h3>
               </div>
               <span className="text-sm font-black text-slate-500">累计观测 {totalVisitors} 次</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
               {loading ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 opacity-60">
                     <Feather size={32} className="animate-pulse" strokeWidth={1.5} />
                     <p className="text-sm font-bold tracking-widest text-slate-600">翻开历史书页...</p>
                  </div>
               ) : visitors.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-8 opacity-60">
                     <BookOpen size={48} className="text-slate-300 mb-4" strokeWidth={1} />
                     <p className="text-lg font-black tracking-widest text-slate-500 mb-2">留白</p>
                     <p className="text-xs font-bold text-slate-400">{syncNote || '这里还没有其他人的笔迹。'}</p>
                  </div>
               ) : (
                  <ul className="space-y-6 pt-2 pb-8 px-2">
                     {visitors.map((visitor, i) => {
                        const rot = (i % 2 === 0 ? -1.5 : 1.5) + (i % 3 === 0 ? 0.5 : -0.5);
                        return (
                        <li key={visitor.id} className="relative group">
                           <div className="hand-drawn-panel bg-[#fdfcf8] p-5 border-[2px] border-slate-800 shadow-[4px_4px_0_#2d3436] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0_#2d3436]" style={{ transform: `rotate(${rot}deg)` }}>
                               {/* Pushpin */}
                               <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-rose-500 rounded-full border-[2px] border-slate-800 shadow-[1px_1px_0_rgba(0,0,0,0.5)] z-10" />
                               <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/50 rounded-full z-20 pointer-events-none" />
                               
                               <div className="flex items-start justify-between mb-3 border-b-[2px] border-dashed border-slate-300 pb-3">
                                  <div className="flex items-center gap-3">
                                     {visitor.visitor_avatar ? (
                                        <img src={visitor.visitor_avatar} className="w-9 h-9 rounded-full border-[2px] border-slate-800 object-cover bg-white" alt=""/>
                                     ) : (
                                        <div className="w-9 h-9 rounded-full border-[2px] border-slate-800 bg-emerald-100 flex items-center justify-center"><Users size={14} className="text-emerald-700"/></div>
                                     )}
                                     <div className="flex flex-col">
                                        <span className="text-sm font-black text-slate-900 tracking-wide">{visitor.visitor_name || '匿名观测者'}</span>
                                        {visitor.rating ? <div className="flex items-center gap-0.5 mt-0.5">{renderRating(visitor.rating)}</div> : null}
                                     </div>
                                  </div>
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 font-mono tracking-wider rotate-[2deg] pt-1"><Calendar size={12} /> {formatVisitDate(visitor.created_at)}</span>
                               </div>
                               
                               {visitor.message ? (
                                  <p className="text-[14px] font-bold text-slate-700 leading-relaxed italic" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>"{visitor.message}"</p>
                               ) : (
                                  <p className="text-[11px] font-bold text-slate-400 italic">（只留下了淡淡的足迹）</p>
                               )}
                           </div>
                        </li>
                        );
                     })}
                   </ul>
               )}
            </div>
          </div>

        </div>
      </motion.section>
      
      {showGift && (
        <Suspense fallback={null}>
          <GiftModal
            mode="create"
            fromName={authUser?.username || '岛民'}
            islandName={islandName}
            onClose={() => setShowGift(false)}
          />
        </Suspense>
      )}
    </motion.div>
    </AnimatePresence>
  );
};
