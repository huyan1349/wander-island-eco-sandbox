import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { loadPresetIsland, ensureHomeSlot } from '../utils/islandIO';
import { Plus, Trash2, ArrowLeft, TreePine, Mountain, Waves, Bird, Fish, Cloud, Sun, Globe, Check, CloudLightning, CloudRain, Snowflake, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transition } from 'framer-motion';

type SaveSelectItem =
    | { type: 'hermit'; id: 'hermit' }
    | { type: 'create'; id: 'create' }
    | { type: 'save'; id: string; data: any; name?: string };

const getWeatherConfig = (type: string, id: string, data?: any) => {
    if (type === 'create') {
        return {
            bgColor: 'bg-slate-200',
            iconColor: 'text-slate-800',
            label: 'NEW',
            Icon: Plus
        };
    }
    if (type === 'hermit') {
        return {
            bgColor: 'bg-emerald-100',
            iconColor: 'text-emerald-900',
            label: 'HERMIT',
            Icon: Globe
        };
    }
    const w = data?.weather || 'sun';
    const map: Record<string, any> = {
        sun: { bgColor: 'bg-amber-100', iconColor: 'text-amber-700', label: 'SUNNY', Icon: Sun },
        rain: { bgColor: 'bg-blue-100', iconColor: 'text-blue-700', label: 'RAINY', Icon: CloudRain },
        storm: { bgColor: 'bg-indigo-200', iconColor: 'text-indigo-900', label: 'STORM', Icon: CloudLightning },
        snow: { bgColor: 'bg-sky-100', iconColor: 'text-sky-700', label: 'SNOWY', Icon: Snowflake },
        cloudy: { bgColor: 'bg-slate-200', iconColor: 'text-slate-700', label: 'CLOUDY', Icon: Cloud },
    };
    return map[w] || map.sun;
};

export const SaveSelectScreen: React.FC = () => {
    const store = useGameStore();
    const [saves, setSaves] = useState<any[]>([]);
    const [serverIslandMap, setServerIslandMap] = useState<Record<string, string>>({});
    const [deployingId, setDeployingId] = useState<string | null>(null);
    const [deployedIds, setDeployedIds] = useState<Set<string>>(new Set());
    const [hermitLoading, setHermitLoading] = useState(false);
    const [expanding, setExpanding] = useState(false);
    const authUser = store.authUser;

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            await ensureHomeSlot();
            const indexStr = localStorage.getItem('eco_saves_index');
            if (indexStr) setSaves(JSON.parse(indexStr));
            const mapStr = localStorage.getItem('wander_server_island_map');
            if (mapStr) {
                try { setServerIslandMap(JSON.parse(mapStr)); } catch {}
            }
        })();
    }, [setServerIslandMap]);

    const allItems: SaveSelectItem[] = [
        { type: 'hermit', id: 'hermit' },
        { type: 'create', id: 'create' },
        ...saves.map(s => ({ type: 'save' as const, id: s.id, data: s, name: s.name }))
    ];

    const handleCreateNew = (e: React.MouseEvent) => {
        e.stopPropagation();
        AudioSystem.playConfirm();
        const name = prompt("给你的新岛屿起个名字：");
        if (name && name.trim()) {
            setExpanding(true);
            setTimeout(() => {
                store.createSaveSlot(name.trim());
                store.setScreen('PLAYING');
            }, 1200);
        }
    };

    const enterHermit = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!authUser) { AudioSystem.playClick(); store.setScreen('LOGIN'); return; }
        AudioSystem.playConfirm();
        setHermitLoading(true);
        try {
            await loadPresetIsland('/preset-hermit.json'); 
        } catch (err) {
            console.error('归隐之岛底图加载失败', err);
            store.clearAll();
        }
        setExpanding(true);
        setTimeout(() => {
            store.setOnline(true);
            store.setIslandInfo('hermit', '归隐之岛');
            store.setScreen('PLAYING');
            setHermitLoading(false);
        }, 1200);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        AudioSystem.playConfirm();
        if (!confirm("确定撕毁这张明信片？星尘散去后将永远无法找回。")) return;
        const serverId = serverIslandMap[id];
        if (serverId) {
            try { await api.deleteIsland(serverId); } catch {}
            const nextMap = { ...serverIslandMap };
            delete nextMap[id];
            setServerIslandMap(nextMap);
            localStorage.setItem('wander_server_island_map', JSON.stringify(nextMap));
        }
        const newSaves = saves.filter(s => s.id !== id);
        setSaves(newSaves);
        localStorage.setItem('eco_saves_index', JSON.stringify(newSaves));
        localStorage.removeItem(`eco_save_${id}`);
        setSelectedIndex(null);
        setHoveredIndex(null);
    };

    const handleDeploy = async (saveId: string, saveName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        AudioSystem.playConfirm();
        if (!authUser) return;

        setDeployingId(saveId);
        try {
            const saved = localStorage.getItem(`eco_save_${saveId}`);
            if (!saved) return;
            const saveData = JSON.parse(saved);

            if (serverIslandMap[saveId]) {
                await api.updateIsland(serverIslandMap[saveId], { data: saveData });
            } else {
                const res = await api.createIsland(saveName, true, saveData);
                setServerIslandMap({ ...serverIslandMap, [saveId]: res.island.id });
                localStorage.setItem('wander_server_island_map', JSON.stringify({ ...serverIslandMap, [saveId]: res.island.id }));
            }
            setDeployedIds(prev => new Set([...prev, saveId]));
        } catch (err) {
            console.error('Deploy failed:', err);
        } finally {
            setDeployingId(null);
        }
    };

    const handleLoad = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        AudioSystem.playConfirm();
        setExpanding(true);
        setTimeout(() => {
            store.loadGame(id, true);
            store.setScreen('PLAYING');
        }, 1200);
    };

    const handleCardClick = (index: number) => {
        if (selectedIndex === index) return;
        AudioSystem.playTap();
        setSelectedIndex(index);
        setHoveredIndex(null);
    };

    // --- The Hard Card Visual ---
    const HardCard = ({ item, isSelected, isExpanding }: { item: any, isSelected: boolean, isExpanding?: boolean }) => {
        const isSynced = item.type === 'save' && (deployedIds.has(item.id) || serverIslandMap[item.id]);
        const config = getWeatherConfig(item.type, item.id, item.data);
        const Icon = config.Icon;
        const ecoPoints = item.data?.ecoPoints || 0;

        const themeMap: Record<string, any> = {
            save: {
                bg: 'bg-[#fdfaf3]',
                textMain: 'text-slate-900',
                textSub: 'text-slate-500',
                border: 'border-slate-900',
                stubBg: 'bg-slate-900',
                stubText: 'text-slate-400',
                stubIconBg: 'bg-slate-800',
                stubIconBorder: 'border-slate-700',
                stubLine: 'bg-white',
                stampText: 'fill-slate-900',
                stampIcon: 'text-slate-900',
                value: 'text-slate-900',
                valueLabel: 'text-slate-500',
            },
            hermit: {
                bg: 'bg-emerald-900',
                textMain: 'text-emerald-50',
                textSub: 'text-emerald-300',
                border: 'border-emerald-950',
                stubBg: 'bg-emerald-950',
                stubText: 'text-emerald-500',
                stubIconBg: 'bg-emerald-800',
                stubIconBorder: 'border-emerald-700',
                stubLine: 'bg-emerald-700',
                stampText: 'fill-emerald-950',
                stampIcon: 'text-emerald-950',
                value: 'text-emerald-100',
                valueLabel: 'text-emerald-300',
            },
            create: {
                bg: 'bg-slate-900',
                textMain: 'text-slate-50',
                textSub: 'text-slate-400',
                border: 'border-black',
                stubBg: 'bg-black',
                stubText: 'text-slate-600',
                stubIconBg: 'bg-slate-800',
                stubIconBorder: 'border-slate-700',
                stubLine: 'bg-slate-700',
                stampText: 'fill-black',
                stampIcon: 'text-black',
                value: 'text-slate-100',
                valueLabel: 'text-slate-400',
            }
        };
        const theme = themeMap[item.type] || themeMap.save;

        return (
            <div className={`w-[460px] h-[280px] flex relative ${isSelected && !isExpanding ? 'transition-transform duration-300 -translate-y-2 brightness-105' : ''}`} style={{ perspective: 1200 }}>
                
                {/* LEFT PIECE: STUB */}
                <motion.div 
                    className={`w-[72px] h-full ${theme.stubBg} border-y-[4px] border-l-[4px] border-r-[2px] border-r-dashed ${theme.border} rounded-l-[24px] flex flex-col items-center justify-between py-6 relative z-10 origin-bottom-right overflow-hidden`}
                    animate={{ 
                        y: isExpanding ? 600 : 0, 
                        x: isExpanding ? -100 : 0,
                        rotateZ: isExpanding ? -45 : 0,
                        rotateX: isExpanding ? 60 : 0,
                        opacity: isExpanding ? 0 : 1
                    }}
                    transition={{ duration: 0.8, ease: "easeIn" }}
                >
                    {/* Background Texture for stub */}
                    <div className={`absolute inset-0 ${item.type === 'save' ? 'opacity-[0.04]' : 'opacity-20'}`} style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                    
                    {/* Content */}
                    <div className={`w-8 h-8 rounded-xl border-[2px] ${theme.stubIconBorder} ${theme.stubIconBg} flex items-center justify-center relative z-10`}>
                        <Icon size={18} strokeWidth={2.5} className="text-white" />
                    </div>
                    <span className={`${theme.stubText} font-mono text-[11px] font-black uppercase tracking-[0.3em] -rotate-90 whitespace-nowrap mb-6 relative z-10`}>
                        {item.type} {item.id.slice(0, 5)}
                    </span>
                    <div className="w-8 h-12 flex flex-col gap-[3px] opacity-40 relative z-10">
                        <div className={`h-[2px] w-full ${theme.stubLine}`} />
                        <div className={`h-[4px] w-full ${theme.stubLine}`} />
                        <div className={`h-[1px] w-full ${theme.stubLine}`} />
                        <div className={`h-[3px] w-full ${theme.stubLine}`} />
                        <div className={`h-[2px] w-full ${theme.stubLine}`} />
                        <div className={`h-[5px] w-full ${theme.stubLine}`} />
                        <div className={`h-[1px] w-full ${theme.stubLine}`} />
                        <div className={`h-[2px] w-full ${theme.stubLine}`} />
                    </div>
                </motion.div>

                {/* RIGHT PIECE: MAIN CARD */}
                <motion.div 
                    className={`flex-1 h-full ${theme.bg} border-y-[4px] border-r-[4px] border-l-[2px] border-l-dashed ${theme.border} rounded-r-[24px] p-6 flex flex-col relative z-10 origin-center overflow-hidden`}
                    animate={{ 
                        y: isExpanding ? -400 : 0,
                        x: isExpanding ? 200 : 0,
                        rotateZ: isExpanding ? 25 : 0,
                        scale: isExpanding ? 0.2 : 1,
                        opacity: isExpanding ? 0 : 1 
                    }}
                    transition={{ duration: 1.0, delay: isExpanding ? 0.2 : 0, ease: "easeInOut" }}
                >
                    {/* Background Texture for main */}
                    <div className={`absolute inset-0 ${item.type === 'save' ? 'opacity-[0.04]' : 'opacity-20'}`} style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                    
                    {/* Synced Ribbon */}
                    {isSynced && (
                        <div className={`absolute -top-1.5 -right-8 bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.3em] py-1 w-32 text-center transform rotate-45 border-y-[3px] border-slate-900 z-20`}>
                            SYNCED
                        </div>
                    )}

                    <div className="relative z-10 flex-1 flex flex-col">
                        {/* Top Section */}
                        <div className={`flex justify-between items-start border-b-[4px] ${theme.border} pb-4 mb-4`}>
                            <div className="flex-1 pr-4">
                                <p className={`text-[10px] font-black tracking-[0.2em] ${theme.textSub} uppercase mb-1`}>Destination / 坐标位置</p>
                                <h2 className={`text-[26px] font-black tracking-widest ${theme.textMain} uppercase hand-drawn-title leading-tight line-clamp-2`}>
                                    {item.type === 'hermit' ? '归隐之岛' : item.type === 'create' ? '唤醒新世界' : (item.name || item.data?.name || '未知岛屿')}
                                </h2>
                            </div>
                            
                            <div className={`w-16 h-16 shrink-0 rounded-full border-[3px] ${theme.border} flex items-center justify-center transform rotate-12 relative ${config.bgColor}`}>
                                <Icon size={28} strokeWidth={2.5} className={theme.stampIcon} />
                                <svg className="absolute inset-0 w-full h-full animate-[spin_20s_linear_infinite]" viewBox="0 0 100 100">
                                    <path id={`circlePath-${item.id}`} d="M 50, 50 m -32, 0 a 32,32 0 1,1 64,0 a 32,32 0 1,1 -64,0" fill="transparent" />
                                    <text className={`text-[9.5px] font-black tracking-widest uppercase ${theme.stampText} opacity-60`}>
                                        <textPath href={`#circlePath-${item.id}`}>
                                            WANDER ISLAND • {config.label} • 
                                        </textPath>
                                    </text>
                                </svg>
                            </div>
                        </div>

                        {/* Middle Section */}
                        <div className="flex-1 flex flex-col justify-end">
                            {item.type === 'save' && (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${theme.textSub} mb-0.5`}>Time Elapsed</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-2xl font-black font-mono ${theme.value}`}>{Math.floor((item.data?.playtime || 0) / 60)}</span>
                                            <span className={`text-xs font-bold ${theme.valueLabel}`}>HRS</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${theme.textSub} mb-0.5`}>Eco Level</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-2xl font-black font-mono ${theme.value}`}>{ecoPoints}</span>
                                            <span className={`text-xs font-bold ${theme.valueLabel}`}>PTS</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {item.type === 'hermit' && (
                                <p className={`${theme.textMain} opacity-90 font-bold text-sm leading-relaxed border-l-[4px] border-emerald-400 pl-3`}>
                                    永远在线的公共时空。与众旅人相遇，共同留痕。
                                </p>
                            )}
                            {item.type === 'create' && (
                                <p className={`${theme.textMain} opacity-90 font-bold text-sm leading-relaxed border-l-[4px] border-amber-400 pl-3`}>
                                    提供一个全新的坐标，播下一颗种子，静候发芽。
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    // Double Stack Layout Config
    const visibleTopEdge = 85;
    const cardWidth = 460;
    const gap = 80; 
    const cardHeight = 280; 
    const maxItemsInColumn = Math.ceil(allItems.length / 2);
    const totalHeight = (maxItemsInColumn - 1) * visibleTopEdge + cardHeight;
    const springTransition: Transition = { type: "spring", stiffness: 400, damping: 30 };

    return (
        <motion.div 
            className="absolute inset-0 z-50 flex pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
        >
            {/* Liquid glass blur background over the game canvas */}
            <motion.div 
                className="absolute inset-0 bg-[#f4ebd0]/30 saturate-150 pointer-events-none" 
                style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                animate={{ opacity: expanding ? 0 : 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
            />

            {/* Top Left Return Button */}
            <AnimatePresence>
                {!expanding && (
                    <motion.button 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => { AudioSystem.playClose(); store.setScreen('TITLE'); }}
                        className="fixed top-8 left-8 flex items-center gap-3 bg-white border-[4px] border-slate-900 rounded-2xl px-6 py-3 hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[6px] active:translate-y-[6px] transition-all z-[150] text-slate-900"
                    >
                        <ArrowLeft size={24} strokeWidth={3} />
                        <span className="text-base font-black tracking-widest uppercase hand-drawn-title">Return</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Scrollable Double Stack Container */}
            <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden pt-36 pb-48 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedIndex !== null ? 'pointer-events-none bg-slate-900/60' : 'pointer-events-auto'} ${expanding ? 'opacity-0' : 'opacity-100'}`}>
                <div className="relative mx-auto" style={{ height: totalHeight, width: cardWidth * 2 + gap }}>
                    {allItems.map((item, index) => {
                        const isLeftColumn = index % 2 === 0;
                        const columnIndex = Math.floor(index / 2); 
                        
                        let y = columnIndex * visibleTopEdge;
                        let z = columnIndex;
                        
                        if (hoveredIndex !== null && selectedIndex === null) {
                            const hoveredIsLeft = hoveredIndex % 2 === 0;
                            if (isLeftColumn === hoveredIsLeft) {
                                const hoveredColIndex = Math.floor(hoveredIndex / 2);
                                if (columnIndex === hoveredColIndex) {
                                    y -= 40; 
                                    z = 100; // Bring hovered to front
                                } else if (columnIndex > hoveredColIndex) {
                                    y += 100; // Push others down harder
                                }
                            }
                        }
                        
                        if (selectedIndex === index) {
                            return (
                                <div 
                                    key={item.id}
                                    className="absolute pointer-events-none"
                                    style={{ 
                                        top: 0, 
                                        zIndex: columnIndex,
                                        left: isLeftColumn ? 0 : cardWidth + gap,
                                        width: cardWidth,
                                        height: cardHeight,
                                        transform: `translateY(${y}px) scale(${1 + columnIndex * 0.015})`
                                    }}
                                />
                            );
                        }
                        
                        return (
                            <motion.div
                                key={item.id}
                                layoutId={`card-${item.id}`}
                                className="absolute cursor-pointer"
                                style={{ 
                                    top: 0, 
                                    zIndex: z,
                                    left: isLeftColumn ? 0 : cardWidth + gap,
                                    width: cardWidth,
                                    height: cardHeight
                                }}
                                animate={{ y, scale: selectedIndex === null ? 1 + columnIndex * 0.015 : 1 }}
                                transition={springTransition}
                                onHoverStart={() => selectedIndex === null && setHoveredIndex(index)}
                                onHoverEnd={() => selectedIndex === null && setHoveredIndex(null)}
                                onClick={() => handleCardClick(index)}
                            >
                                <HardCard item={item} isSelected={false} />
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Card Overlay with Visible Action Buttons */}
            <AnimatePresence>
                {selectedIndex !== null && (
                    <div className="fixed inset-0 flex items-center justify-center pointer-events-auto cursor-pointer" style={{ zIndex: expanding ? 200 : 100 }} onClick={() => !expanding && setSelectedIndex(null)}>
                        
                        <motion.div
                            layoutId={expanding ? undefined : `card-${allItems[selectedIndex].id}`}
                            className="relative flex flex-col"
                            animate={{ width: cardWidth, height: cardHeight, borderRadius: 24 }}
                            transition={springTransition}
                            style={{ cursor: expanding ? 'default' : 'auto' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Inner wrapper for fixed height matching layoutid otherwise the hardcard flex takes the height */}
                            <div className="w-full h-full">
                                <HardCard item={allItems[selectedIndex]} isSelected={true} isExpanding={expanding} />
                            </div>

                            {/* The Buttons explicitly below the card */}
                            <AnimatePresence>
                                {!expanding && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: 0.1, duration: 0.2 }}
                                        className="absolute top-full left-0 mt-8 flex gap-4 w-full"
                                    >
                                        {allItems[selectedIndex].type === 'hermit' && (
                                            <button onClick={enterHermit} disabled={hermitLoading} className="flex-1 h-14 bg-emerald-500 text-white border-[4px] border-slate-900 rounded-2xl hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center gap-2 font-black tracking-widest text-lg uppercase">
                                                <Globe size={24} strokeWidth={3} />
                                                {hermitLoading ? '穿越中...' : '前往联机世界'}
                                            </button>
                                        )}
                                        {allItems[selectedIndex].type === 'create' && (
                                            <button onClick={handleCreateNew} className="flex-1 h-14 bg-amber-400 text-slate-900 border-[4px] border-slate-900 rounded-2xl hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center gap-2 font-black tracking-widest text-lg uppercase">
                                                <Plus size={24} strokeWidth={3} />
                                                唤醒新岛屿
                                            </button>
                                        )}
                                        {allItems[selectedIndex].type === 'save' && (
                                            <>
                                                <button onClick={(e) => handleLoad(allItems[selectedIndex].id, e)} className="flex-1 h-14 bg-white text-slate-900 border-[4px] border-slate-900 rounded-2xl hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center gap-2 font-black tracking-widest text-lg uppercase">
                                                    降落岛屿
                                                </button>
                                                
                                                {authUser && (() => {
                                                    const item = allItems[selectedIndex];
                                                    const isSynced = !!(deployedIds.has(item.id) || serverIslandMap[item.id]);
                                                    return (
                                                        <button 
                                                            onClick={(e) => handleDeploy(item.id, item.name || item.data?.name || '岛屿', e)}
                                                            disabled={isSynced}
                                                            className={`w-14 h-14 shrink-0 border-[4px] border-slate-900 rounded-2xl hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center ${isSynced ? 'bg-emerald-400 text-slate-900' : 'bg-blue-400 text-slate-900'}`}
                                                            title="部署至云端"
                                                        >
                                                            {deployingId === item.id ? <span className="animate-spin text-xl">⏳</span> : isSynced ? <Check size={24} strokeWidth={3} /> : <Cloud size={24} strokeWidth={3} />}
                                                        </button>
                                                    );
                                                })()}

                                                <button 
                                                    onClick={(e) => handleDelete(allItems[selectedIndex].id, e)}
                                                    className="w-14 h-14 shrink-0 bg-red-500 text-white border-[4px] border-slate-900 rounded-2xl hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center"
                                                    title="销毁"
                                                >
                                                    <Trash2 size={24} strokeWidth={3} />
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
