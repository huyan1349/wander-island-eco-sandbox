import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { AudioSystem } from '../lib/audio';
import { disconnectSocket, onChatMessage, onFriendRequest, onFriendAccepted, onIslandVisitor, emitChatSend, emitFriendRequest, emitFriendAccepted, emitPresenceCheck, emitIslandVisit, onPresenceStatus, onUserOnline, onUserOffline } from '../lib/socket';
import { MailboxModal } from './MailboxModal';
import { VisitorBookModal } from './VisitorBookModal';
import { SocialPlaza } from './SocialPlaza';
import {
  User, Edit2, BarChart2, Leaf, Unlock, Settings, LogOut, Clock, Layers,
  Wifi, WifiOff, Camera, X, Users, MessageCircle, Globe, Search, Send,
  UserPlus, Check, ArrowLeft, Mail, BookOpen, Compass, Star, Waves, Download, Gift, Upload, Trash2,
  Award, Trophy, TreePine, Home, Rabbit, ChevronRight, Lock, Sparkles, Image as ImageIcon, IdCard, Shield
} from 'lucide-react';
import QRCode from 'qrcode';
import { exportIslandFile, applyIslandData, captureScreenshot } from '../utils/islandIO';
import { GiftModal } from './GiftModal';
import { THEMES } from './OnboardingFlow';
import { ACHIEVEMENTS, getUnlocked, buildSnapshot } from '../lib/achievements';
import { PlayerStatsTab } from './PlayerStatsTab';

// 段位称号：随等级成长，给玩家明确的进阶身份感
type Tab = 'stats' | 'card' | 'ecology' | 'unlocks' | 'social' | 'system';
type SocialTab = 'friends' | 'chat' | 'mailbox' | 'visitors' | 'plaza';

export const PlayerPanel: React.FC = () => {
  const store = useGameStore();
  const {
    playerName, setPlayerName, playerLevel, playerXP, playerAvatar, setPlayerAvatar,
    islandName, stats, ecoPoints, unlockedAssets,
    grassHealth, deerCount, wolfCount, weather, timeOfDay,
    setScreen, saveGame
  } = store;

  const authUser = useGameStore(state => state.authUser);
  const clearAuthUser = useGameStore(state => state.clearAuthUser);
  const setAuthUser = useGameStore(state => state.setAuthUser);
  const unreadCount = useGameStore(state => state.unreadCount);
  const setUnreadCount = useGameStore(state => state.setUnreadCount);

  const isOpen = useGameStore(state => state.openPlayerPanel);
  const setIsOpen = useGameStore(state => state.setOpenPlayerPanel);
  const panelInitialTab = useGameStore(state => state.panelInitialTab);
  const setPanelInitialTab = useGameStore(state => state.setPanelInitialTab);
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [showGift, setShowGift] = useState(false);
  const [activeSocialTab, setActiveSocialTab] = useState<SocialTab>('friends');

  // 居民证 / 明信片（自 IslandHubModal 并入）
  const [cardFlipped, setCardFlipped] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [postcardBusy, setPostcardBusy] = useState(false);

  // 左边栏按钮请求打开面板时，定位到指定标签
  useEffect(() => {
    if (isOpen && panelInitialTab) {
      setActiveTab(panelInitialTab as Tab);
      setPanelInitialTab(null);
    }
  }, [isOpen, panelInitialTab, setPanelInitialTab]);

  // 辞头像点击时，自动定位到社交→聊天→辞
  const panelInitialSocialTab = useGameStore(state => state.panelInitialSocialTab);
  const setPanelInitialSocialTab = useGameStore(state => state.setPanelInitialSocialTab);
  useEffect(() => {
    if (isOpen && panelInitialSocialTab && activeTab === 'social') {
      setActiveSocialTab(panelInitialSocialTab as SocialTab);
      setPanelInitialSocialTab(null);
      // 如果定位到 chat，自动选择辞作为聊天对象
      if (panelInitialSocialTab === 'chat') {
        const CI_USER_ID = '00000000-0000-0000-0000-000000000001';
        const ciFriend = friends.find((f: any) => f.id === CI_USER_ID);
        if (ciFriend) {
          handleOpenChat(ciFriend);
        }
      }
    }
  }, [isOpen, panelInitialSocialTab, activeTab]);

  // 居民证数据：优先持久化，缺失则从账号/存档回退
  const residentCard = (() => {
    try { const v = localStorage.getItem('resident_card'); if (v) return JSON.parse(v); } catch { /* ignore */ }
    const memberNo = authUser?.memberNo || 1;
    const d = new Date();
    return {
      name: authUser?.username || playerName, islandName, motto: authUser?.motto || '', themeIdx: 1, memberNo,
      joinDate: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
      uid: `WI-${d.getFullYear()}-${String(memberNo).padStart(6, '0')}`,
    };
  })();
  const cardTheme = THEMES[residentCard.themeIdx] || THEMES[1];

  useEffect(() => {
    if (!isOpen || activeTab !== 'card') return;
    QRCode.toDataURL(`${location.origin}/?resident=${residentCard.uid}`, { margin: 1, width: 200, errorCorrectionLevel: 'M' }).then(setQrUrl).catch(() => {});
  }, [isOpen, activeTab, residentCard.uid]);

  const downloadPostcard = async () => {
    setPostcardBusy(true);
    try {
      const shot = captureScreenshot(1200);
      const img = new window.Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error()); img.src = shot; });
      const W = 1200, H = 820, pad = 40, iw = W - pad * 2, ih = 560;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, pad, pad, iw, ih);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.strokeRect(pad, pad, iw, ih);
      ctx.textAlign = 'left'; ctx.fillStyle = '#1e293b'; ctx.font = "bold 52px 'ZCOOL KuaiLe', sans-serif";
      ctx.fillText(residentCard.islandName || islandName, pad, ih + pad + 78);
      ctx.fillStyle = '#64748b'; ctx.font = "500 26px sans-serif";
      ctx.fillText(`漫游岛 · ${residentCard.joinDate}`, pad, ih + pad + 120);
      ctx.textAlign = 'right'; ctx.fillStyle = '#15803d'; ctx.font = "bold 28px sans-serif";
      ctx.fillText('WANDER ISLAND', W - pad, ih + pad + 120);
      const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `${residentCard.islandName || 'island'}-明信片.png`; a.click();
    } catch (e) { console.error('明信片生成失败', e); } finally { setPostcardBusy(false); }
  };


  // 触屏检测
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const hasCoarse = window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(hasCoarse || hasTouch);
  }, []);

  // 从 JSON 文件导入岛屿
  const handleImportIsland = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result));
        const name = d.name || d.islandName || '导入的岛屿';
        applyIslandData(d, name);
        AudioSystem.playConfirm();
        setIsOpen(false);
        alert(`已导入岛屿「${name}」`);
      } catch {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Social state
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHint, setSearchHint] = useState(''); // 无结果 / 未登录 / 失败 提示
  const [sentTo, setSentTo] = useState<Record<string, boolean>>({}); // 已送出申请的用户(按钮动画)
  const [celebrate, setCelebrate] = useState<string | null>(null); // 成为好友庆祝浮层
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [chatTarget, setChatTarget] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);


  // Load social data
  useEffect(() => {
    if (!isOpen || !authUser) return;
    loadFriends();
    api.getUnreadMailCount().then(res => setUnreadMailCount(res.count)).catch(() => {});
  }, [isOpen, authUser]);

  // Socket listeners
  useEffect(() => {
    const unsubMsg = onChatMessage((msg) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    const unsubReq = onFriendRequest(() => loadFriends());
    const unsubAcc = onFriendAccepted((data: any) => {
      AudioSystem.playSynergyChord?.();
      setCelebrate(data?.fromName || '新朋友');
      setTimeout(() => setCelebrate(null), 2000);
      loadFriends();
    });
    const unsubVisitor = onIslandVisitor(() => {});
    const unsubPresence = onPresenceStatus((statuses) => setOnlineUsers(prev => ({ ...prev, ...statuses })));
    const unsubOnline = onUserOnline((data) => setOnlineUsers(prev => ({ ...prev, [data.userId]: true })));
    const unsubOffline = onUserOffline((data) => setOnlineUsers(prev => ({ ...prev, [data.userId]: false })));
    return () => { unsubMsg(); unsubReq(); unsubAcc(); unsubVisitor(); unsubPresence(); unsubOnline(); unsubOffline(); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadFriends = async () => {
    try {
      const [fRes, rRes] = await Promise.all([api.getFriends(), api.getFriendRequests()]);
      setFriends(fRes.friends);
      setIncomingRequests(rRes.incoming);
      if (fRes.friends.length > 0) emitPresenceCheck(fRes.friends.map((f: any) => f.id));
    } catch (err) { console.error('Failed to load friends:', err); }
  };


  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
    api.updateProfile({ avatarFile: file })
      .then(res => setAuthUser(res.user))
      .catch(err => console.error('Avatar upload failed:', err));
  };

  const handleOpenChat = async (friend: any) => {
    AudioSystem.playClick();
    setChatTarget(friend);
    setActiveSocialTab('chat');
    try {
      const res = await api.getChatMessages(friend.id);
      setChatMessages(res.messages);
    } catch (err) { console.error('Failed to load chat:', err); }
  };

  const handleSendMessage = () => {
    AudioSystem.playConfirm();
    if (!chatInput.trim() || !chatTarget) return;
    // 和"辞"聊天时附带实时岛屿上下文，让它记得整段对话 + 看见当前的岛
    const s = useGameStore.getState();
    const ctx = chatTarget.id === CI_USER_ID ? {
      timeOfDay: s.timeOfDay, weather: s.weather, season: s.season,
      grassHealth: s.grassHealth, deerCount: s.deerCount, wolfCount: s.wolfCount,
      assetsCount: s.assets.length, islandName: s.islandName,
      affinityLevel: s.ci.affinity >= 61 ? 'close' : s.ci.affinity >= 21 ? 'familiar' : 'stranger',
    } : undefined;
    emitChatSend(chatTarget.id, chatInput.trim(), ctx);
    setChatInput('');
  };

  const runSearch = async (q: string) => {
    const query = q.trim();
    if (!query) { setSearchResults([]); setSearchHint(''); return; }
    if (!authUser) { setSearchResults([]); setSearchHint('登录账号后才能搜索并添加好友'); return; }
    setSearchBusy(true); setSearchHint('');
    try {
      const res = await api.searchUsers(query);
      setSearchResults(res.users || []);
      setSearchHint((res.users || []).length === 0 ? '没有找到匹配的玩家（试试完整用户名或编号）' : '');
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
      setSearchHint('搜索失败，请检查网络后再试');
    } finally { setSearchBusy(false); }
  };

  const handleSearch = () => { AudioSystem.playClick(); runSearch(searchQuery); };

  // 输入即搜（防抖 350ms）：点开搜索框打字就能出结果，不必非按回车
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); setSearchHint(''); return; }
    const t = setTimeout(() => runSearch(searchQuery), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSendFriendRequest = async (userId: string, username?: string) => {
    AudioSystem.playPop();
    try {
      await api.sendFriendRequest(userId);
      emitFriendRequest(userId);
      // 按钮先变「已送出 ✓」再淡出移除（飞出动画）
      setSentTo(prev => ({ ...prev, [userId]: true }));
      store.addToast(`好友申请已送给 ${username || '对方'} ✈`, 'friend_request');
      setTimeout(() => setSearchResults(prev => prev.filter(u => u.id !== userId)), 900);
    } catch (err: any) { alert(err.message); }
  };

  const handleAcceptRequest = async (userId: string) => {
    AudioSystem.playConfirm();
    const name = incomingRequests.find(r => r.id === userId)?.username || '新朋友';
    try {
      await api.acceptFriendRequest(userId);
      emitFriendAccepted(userId);
      // 庆祝浮层 + 音效
      AudioSystem.playSynergyChord?.();
      setCelebrate(name);
      setTimeout(() => setCelebrate(null), 2000);
      loadFriends();
    } catch (err: any) { alert(err.message); }
  };

  const handleRejectRequest = async (userId: string) => {
    AudioSystem.playClose();
    try {
      await api.rejectFriendRequest(userId);
      setIncomingRequests(prev => prev.filter(r => r.id !== userId));
    } catch (err: any) { alert(err.message); }
  };

  const CI_USER_ID = '00000000-0000-0000-0000-000000000001';

  return (
    <>
      {/* Mini Widget */}
      <div
        id="guide-avatar"
        onClick={() => { AudioSystem.playClick(); setIsOpen(true); }}
        className="group flex items-center gap-4 cursor-pointer"
      >
        <div className="relative group shrink-0">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-800 shadow-md overflow-hidden">
            {(authUser ? authUser.avatar : playerAvatar) ? (
              <img src={authUser ? authUser.avatar : playerAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="text-slate-700" size={24} />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-900 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center shadow-lg border border-slate-700">
            {playerLevel}
          </div>
          {authUser && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse" title="在线" />
          )}
        </div>
        {/* 无背景：仅名字 */}
        <div className="flex flex-col min-w-[80px]">
          <span className="text-sm font-bold text-white tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            {authUser ? authUser.username : playerName}
          </span>
        </div>
      </div>

      {/* Full Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-500">
          <div className={`bg-[#fbf7ec] rounded-3xl border border-slate-300/70 flex overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)] animate-slide-up ${isTouch ? 'touch-modal-full touch-safe-bottom flex-col rounded-none' : 'w-[960px] h-[640px]'}`}>

            {/* Sidebar - Desktop: left column / Touch: bottom tab bar */}
            {!isTouch ? (
              <div className="w-56 border-r-2 border-slate-800 p-6 flex flex-col gap-2">
                {/* Avatar */}
                <div className="flex items-center gap-3 mb-8">
                  {authUser ? (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-800 shadow-inner relative group shrink-0">
                      <img src={authUser.avatar} alt="" className="w-full h-full object-cover bg-gradient-to-br from-emerald-500/20 to-cyan-500/20" />
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera size={18} className="text-white" />
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-800 shadow-inner shrink-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                      <User size={24} className="text-slate-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold tracking-wide text-slate-800">{authUser ? authUser.username : playerName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20 px-2 py-0.5 rounded-full">LV.{playerLevel}</p>
                      {authUser && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">在线</span>}
                    </div>
                  </div>
                </div>

                <button onClick={() => { AudioSystem.playTap(); setActiveTab('stats'); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'stats' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <BarChart2 size={16} /> 护照
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('card'); setCardFlipped(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'card' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <IdCard size={16} /> 居民证
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('ecology'); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'ecology' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Leaf size={16} /> 生态
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('unlocks'); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'unlocks' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Unlock size={16} /> 蓝图
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('social'); setActiveSocialTab('friends'); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all relative ${activeTab === 'social' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Users size={16} /> 社交
                  {(unreadCount > 0 || unreadMailCount > 0) && (
                    <span className="absolute right-3 top-2 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full border border-slate-800">
                      {unreadCount + unreadMailCount > 9 ? '9+' : unreadCount + unreadMailCount}
                    </span>
                  )}
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('system'); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all mt-auto ${activeTab === 'system' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Settings size={16} /> 系统
                </button>
              </div>
            ) : (
              /* 触屏：底部 Tab 导航 */
              <div className="flex-shrink-0 border-t-2 border-slate-800 flex items-center justify-around px-2 py-2 touch-safe-bottom bg-[#fcf8ec]">
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('stats'); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'stats' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <BarChart2 size={20} /><span className="text-[10px] font-bold">护照</span>
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('card'); setCardFlipped(false); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'card' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <IdCard size={20} /><span className="text-[10px] font-bold">居民证</span>
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('ecology'); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'ecology' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <Leaf size={20} /><span className="text-[10px] font-bold">生态</span>
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('unlocks'); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'unlocks' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <Unlock size={20} /><span className="text-[10px] font-bold">蓝图</span>
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('social'); setActiveSocialTab('friends'); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl relative ${activeTab === 'social' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <Users size={20} /><span className="text-[10px] font-bold">社交</span>
                  {(unreadCount > 0 || unreadMailCount > 0) && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full">
                      {unreadCount + unreadMailCount > 9 ? '9+' : unreadCount + unreadMailCount}
                    </span>
                  )}
                </button>
                <button onClick={() => { AudioSystem.playTap(); setActiveTab('system'); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'system' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <Settings size={20} /><span className="text-[10px] font-bold">系统</span>
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative">
              <button onClick={() => { AudioSystem.playClose(); setIsOpen(false); }} className="absolute top-6 right-6 hand-drawn-btn p-2 rounded-full z-10">
                <X size={20} />
              </button>

              {/* ====== Passport Tab (玩家档案 / 角色卡) ====== */}
              {activeTab === 'stats' && (
                <PlayerStatsTab handleAvatarUpload={handleAvatarUpload} setActiveTab={setActiveTab} />
              )}

              {/* ====== Resident Card Tab (居民证 · 明信片，并入自小岛面板) ====== */}
              {activeTab === 'card' && (
                <div className="flex-1 p-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto custom-scrollbar">
                  <div className="mb-8 border-b-2 border-slate-800 pb-6"><h2 className="text-4xl hand-drawn-title -rotate-1 inline-block">居民证</h2></div>

                  <div className="flex flex-col items-center gap-4" style={{ perspective: 1200 }}>
                    <div onClick={() => { AudioSystem.playTap(); setCardFlipped(f => !f); }} className="relative w-[360px] max-w-full h-[227px] cursor-pointer" style={{ transformStyle: 'preserve-3d', transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0)', transition: 'transform .6s cubic-bezier(.4,.2,.2,1)' }}>
                      {/* 正面 */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-slate-900 shadow-[8px_10px_0_rgba(15,23,42,0.4)]" style={{ background: cardTheme.bg, backfaceVisibility: 'hidden' }}>
                        <div className="flex items-center justify-between px-4 pt-3">
                          <p className="text-[12px] font-black tracking-[0.15em] text-slate-900">WANDER ISLAND</p>
                          <Sparkles size={14} style={{ color: cardTheme.accent }} />
                        </div>
                        <div className="flex items-center gap-3 px-4 mt-2">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-900 bg-white shrink-0">
                            {authUser?.avatar ? <img src={authUser.avatar} alt="" className="w-full h-full object-cover" /> : <User size={28} className="text-slate-500 m-auto mt-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[8px] font-bold tracking-[0.3em] uppercase text-slate-500">Resident</p>
                            <p className="text-xl font-black text-slate-900 truncate">{residentCard.name}</p>
                            {residentCard.islandName && <p className="text-[11px] font-bold truncate" style={{ color: cardTheme.ink }}>{residentCard.islandName}</p>}
                          </div>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 px-4 py-2 flex items-end justify-between border-t-2 border-slate-900/15 bg-white/30">
                          <div><p className="text-[8px] uppercase tracking-widest text-slate-500">第 {residentCard.memberNo} 位</p><p className="text-base font-black font-mono" style={{ color: cardTheme.accent }}>NO.{String(residentCard.residentNo ?? residentCard.memberNo).padStart(5, '0')}</p></div>
                          <p className="text-xs font-bold text-slate-700 font-mono">{residentCard.joinDate}</p>
                        </div>
                      </div>
                      {/* 背面 */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden border-[3px] border-slate-900 shadow-[8px_10px_0_rgba(15,23,42,0.4)] flex flex-col" style={{ background: cardTheme.bg, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div className="flex-1 flex items-center px-5"><p className="text-lg text-slate-800" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>{residentCard.motto ? `「${residentCard.motto}」` : ''}</p></div>
                        <div className="flex items-end justify-between px-4 py-2 border-t-2 border-slate-900/15 bg-white/30">
                          <div><p className="text-[8px] uppercase tracking-widest text-slate-500">专属编号</p><p className="text-sm font-black font-mono" style={{ color: cardTheme.ink }}>{residentCard.uid}</p></div>
                          <div className="w-12 h-12 rounded border-2 border-slate-900 bg-white p-0.5">{qrUrl ? <img src={qrUrl} alt="" className="w-full h-full" /> : <div className="w-full h-full bg-slate-100 animate-pulse" />}</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs">点击卡片 · 翻面</p>
                  </div>

                  {/* 明信片 / 礼物 */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
                    <button onClick={() => { AudioSystem.playClick(); downloadPostcard(); }} disabled={postcardBusy} className="hand-drawn-btn px-4 py-4 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"><ImageIcon size={18} className="text-sky-600" /> {postcardBusy ? '生成中…' : '生成明信片'}</button>
                    <button onClick={() => { AudioSystem.playClick(); setShowGift(true); }} className="hand-drawn-btn px-4 py-4 text-sm font-bold flex items-center justify-center gap-2"><Gift size={18} className="text-rose-500" /> 赠送礼物</button>
                  </div>
                </div>
              )}

              {/* ====== Ecology Tab ====== */}
              {activeTab === 'ecology' && (
                <div className="flex-1 p-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto custom-scrollbar">
                  <div className="mb-10 border-b-2 border-slate-800 pb-6"><h2 className="text-4xl hand-drawn-title -rotate-1 inline-block">岛屿生态</h2></div>
                  <div className="hand-drawn-panel p-8 mb-8" style={{ borderWidth: '2px' }}>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">草地健康度</p>
                      <span className="font-light tracking-widest text-2xl text-slate-800">{Math.floor(grassHealth)}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full transition-all duration-1000 ${grassHealth > 50 ? "bg-gradient-to-r from-emerald-500 to-green-400" : grassHealth > 20 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-red-600 to-red-400"}`} style={{ width: `${grassHealth}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="hand-drawn-panel p-8" style={{ borderWidth: '2px' }}>
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">天气</p>
                      <p className="text-3xl font-light text-slate-800 tracking-widest capitalize">{weather}</p>
                    </div>
                    <div className="hand-drawn-panel p-8" style={{ borderWidth: '2px' }}>
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">时间</p>
                      <p className="text-3xl font-light text-slate-800 tracking-widest">{Math.floor(timeOfDay).toString().padStart(2, '0')}:00</p>
                    </div>
                  </div>

                  {/* 分享你的小岛 */}
                  <div className="mt-8 flex flex-col gap-4 max-w-md">
                    <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">分享你的小岛</p>
                    <button onClick={() => { AudioSystem.playClick(); exportIslandFile(); }} className="hand-drawn-btn px-6 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><Download size={18} /> 导出小岛文件</button>
                    <button onClick={() => { AudioSystem.playClick(); setShowGift(true); }} className="hand-drawn-btn px-6 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><Gift size={18} /> 生成礼物链接</button>
                  </div>
                </div>
              )}

              {/* ====== Unlocks Tab ====== */}
              {activeTab === 'unlocks' && (
                <div className="flex-1 p-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto custom-scrollbar">
                  <div className="mb-10 border-b-2 border-slate-800 pb-6"><h2 className="text-4xl hand-drawn-title -rotate-1 inline-block">已解锁蓝图</h2></div>
                  <div className="grid grid-cols-2 gap-4">
                    {unlockedAssets.map(asset => (
                      <div key={asset} className="hand-drawn-panel px-6 py-4 flex items-center justify-between group transition-colors cursor-default" style={{ borderWidth: '2px' }}>
                        <span className="font-light tracking-widest text-slate-600 group-hover:text-slate-900 capitalize">{asset.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500/50 group-hover:bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ====== Social Tab ====== */}
              {activeTab === 'social' && (
                <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4">
                  {/* Social Sub-tabs */}
                  <div className="flex gap-1 px-8 pt-6 pb-3 border-b border-slate-200">
                    <button onClick={() => { AudioSystem.playTap(); setActiveSocialTab('friends'); }} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'friends' ? 'hand-drawn-btn-active' : ''}`}>
                      <Users size={13} /> 好友
                    </button>
                    <button onClick={() => { AudioSystem.playTap(); setActiveSocialTab('chat'); }} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'chat' ? 'hand-drawn-btn-active' : ''}`}>
                      <MessageCircle size={13} /> 聊天
                      {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </button>
                    <button onClick={() => { AudioSystem.playTap(); setActiveSocialTab('mailbox'); }} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'mailbox' ? 'hand-drawn-btn-active' : ''}`}>
                      <Mail size={13} /> 信箱
                      {unreadMailCount > 0 && <span className="bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full">{unreadMailCount > 9 ? '9+' : unreadMailCount}</span>}
                    </button>
                    <button onClick={() => { AudioSystem.playTap(); setActiveSocialTab('visitors'); }} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'visitors' ? 'hand-drawn-btn-active' : ''}`}>
                      <BookOpen size={13} /> 访客簿
                    </button>
                    <button onClick={() => { AudioSystem.playTap(); setActiveSocialTab('plaza'); }} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'plaza' ? 'hand-drawn-btn-active' : ''}`}>
                      <Compass size={13} /> 广场
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {/* Friends Sub-tab */}
                    {activeSocialTab === 'friends' && (
                      <div className="p-8">
                        {/* 我的编号：分享给好友，对方可按编号搜索到你 */}
                        {authUser && (
                          <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-xl bg-emerald-50/70 ring-1 ring-emerald-200">
                            <span className="text-[11px] text-slate-500">我的好友编号 · 告诉朋友即可搜到你</span>
                            <span className="text-sm font-black font-mono text-emerald-700 tracking-wider">NO.{String(authUser.residentNo ?? authUser.memberNo ?? 1).padStart(5, '0')}</span>
                          </div>
                        )}
                        {/* Search */}
                        <div className="flex gap-2 mb-6">
                          <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="搜索用户名 或 编号（如 42）..." className="w-full pl-9 pr-4 py-2.5 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm" style={{ borderWidth: '2px' }} />
                          </div>
                          <button onClick={() => { AudioSystem.playClick(); handleSearch(); }} className="hand-drawn-btn px-4 py-2"><Search size={16} /></button>
                        </div>

                        {/* 搜索状态：加载 / 无结果 / 未登录 / 失败 */}
                        {(searchBusy || searchHint) && (
                          <div className="mb-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            {searchBusy ? (
                              <><span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> 搜索中…</>
                            ) : searchHint}
                          </div>
                        )}

                        {searchResults.length > 0 && (
                          <div className="mb-6">
                            <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">搜索结果</p>
                            {searchResults.map((user, i) => (
                              <div key={user.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-amber-50 transition-all duration-500 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 50}ms`, opacity: sentTo[user.id] ? 0 : 1, transform: sentTo[user.id] ? 'translateX(40px)' : 'none' }}>
                                <div className="flex items-center gap-3">
                                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-800" />
                                  <div>
                                    <span className="font-bold text-slate-800 text-sm">{user.username}</span>
                                    {user.memberNo != null && <span className="ml-2 text-[10px] font-mono text-slate-400">NO.{String(user.residentNo ?? user.memberNo).padStart(5, '0')}</span>}
                                  </div>
                                </div>
                                {sentTo[user.id] ? (
                                  <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-emerald-600"><Check size={12} /> 已送出</span>
                                ) : (
                                  <button onClick={() => handleSendFriendRequest(user.id, user.username)} className="hand-drawn-btn flex items-center gap-1 px-3 py-1 text-xs transition-transform active:scale-90"><UserPlus size={12} /> 加好友</button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {incomingRequests.length > 0 && (
                          <div className="mb-6">
                            <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">好友请求</p>
                            {incomingRequests.map((req, i) => (
                              <div key={req.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-amber-50 mb-2 border-2 border-amber-200 animate-in fade-in slide-in-from-top-2" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="flex items-center gap-3">
                                  <img src={req.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-800" />
                                  <span className="font-bold text-slate-800 text-sm">{req.username}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handleAcceptRequest(req.id)} className="hand-drawn-btn p-1.5 text-emerald-600 transition-transform active:scale-90 hover:scale-110"><Check size={14} /></button>
                                  <button onClick={() => { AudioSystem.playClose(); handleRejectRequest(req.id); }} className="hand-drawn-btn p-1.5 text-red-500 transition-transform active:scale-90"><X size={14} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">我的好友 ({friends.length})</p>
                        {friends.length === 0 ? (
                          <div className="text-center py-10">
                            <p className="text-sm text-slate-500 font-bold">岛和岛之间，隔着一片云海。</p>
                            <p className="text-xs text-slate-400 mt-1.5">把上面的编号告诉朋友，或搜个名字，去认识第一位岛友吧。</p>
                          </div>
                        ) : (
                          friends.map((friend, i) => (
                            <div key={friend.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 40}ms` }} onClick={() => handleOpenChat(friend)}>
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img src={friend.avatar} alt="" className="w-9 h-9 rounded-full border border-slate-800" />
                                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${(friend.is_online || friend.is_ai || onlineUsers[friend.id]) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-sm">{friend.username}</span>
                                    {friend.is_ai && <span className="text-[9px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-bold">AI</span>}
                                  </div>
                                  <p className="text-[10px] text-slate-400">{(friend.is_online || friend.is_ai || onlineUsers[friend.id]) ? '在线' : '离线'}</p>
                                </div>
                              </div>
                              <MessageCircle size={16} className="text-slate-400" />
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Chat Sub-tab */}
                    {activeSocialTab === 'chat' && (
                      <div className="flex flex-col h-full min-h-0">
                        {chatTarget ? (
                          <>
                            <div className="flex items-center gap-3 px-8 py-3 border-b border-slate-200">
                              <button onClick={() => { AudioSystem.playClose(); setChatTarget(null); setChatMessages([]); }} className="hand-drawn-btn p-1"><ArrowLeft size={14} /></button>
                              <img src={chatTarget.avatar} alt="" className="w-7 h-7 rounded-full border border-slate-800" />
                              <span className="font-bold text-slate-800 text-sm tracking-wide">{chatTarget.username}</span>
                              {chatTarget.is_ai && <span className="text-[9px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-bold">AI</span>}
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                              {chatMessages.map((msg) => {
                                const isMine = msg.from_id === authUser?.id;
                                return (
                                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] px-4 py-2.5 text-sm ${isMine ? 'hand-drawn-panel bg-emerald-50' : 'hand-drawn-panel'}`} style={{ borderWidth: '2px' }}>
                                      <p className="leading-relaxed text-slate-800">{msg.content}</p>
                                      <p className={`text-[10px] mt-1 ${isMine ? 'text-emerald-500' : 'text-slate-400'}`}>
                                        {new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={chatEndRef} />
                            </div>
                            <div className="px-6 py-3 border-t-2 border-slate-800">
                              <div className="flex gap-2">
                                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={chatTarget.is_ai ? '和辞说点什么...' : '输入消息...'} className="flex-1 px-4 py-2.5 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm" style={{ borderWidth: '2px' }} />
                                <button onClick={() => { AudioSystem.playConfirm(); handleSendMessage(); }} className="hand-drawn-btn px-4 py-2"><Send size={16} /></button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                              <MessageCircle size={48} className="text-slate-300 mx-auto mb-4" />
                              <p className="text-slate-400 font-bold tracking-widest">选择好友开始聊天</p>
                              <p className="text-slate-300 text-sm mt-2">在好友列表中点击好友即可聊天</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mailbox Sub-tab */}
                    {activeSocialTab === 'mailbox' && (
                      <div className="h-full">
                        <MailboxModal onClose={() => {}} embedded />
                      </div>
                    )}

                    {/* Visitors Sub-tab */}
                    {activeSocialTab === 'visitors' && (
                      <div className="h-full">
                        <VisitorBookModal onClose={() => {}} embedded />
                      </div>
                    )}

                    {/* Plaza Sub-tab */}
                    {activeSocialTab === 'plaza' && (
                      <div className="h-full">
                        <SocialPlaza onClose={() => {}} embedded />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ====== System Tab ====== */}
              {activeTab === 'system' && (
                <div className="flex-1 p-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto custom-scrollbar">
                  <div className="mb-10 border-b-2 border-slate-800 pb-6"><h2 className="text-4xl hand-drawn-title -rotate-1 inline-block">系统菜单</h2></div>
                  <div className="flex flex-col gap-6 max-w-sm mt-4">
                    <div className="hand-drawn-panel p-4" style={{ borderWidth: '2px' }}>
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">辞 · 织潮者的回音</p>
                      <p className="text-sm font-bold text-slate-800 tracking-wider">v2.4.0 地形笔刷</p>
                    </div>
                    {/* 辞的好感度面板 */}
                    {(() => {
                      const ciAffinity = useGameStore.getState().ci.affinity;
                      const ciLevel = ciAffinity >= 61 ? '亲近老友' : ciAffinity >= 21 ? '熟稔' : '礼貌疏离';
                      const ciLevelColor = ciAffinity >= 61 ? 'text-rose-600' : ciAffinity >= 21 ? 'text-emerald-600' : 'text-slate-500';
                      return (
                        <div className="hand-drawn-panel p-4" style={{ borderWidth: '2px' }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 border border-slate-800 flex items-center justify-center">
                                <span className="text-[8px] font-black text-slate-900">辞</span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">岛灵好感度</p>
                            </div>
                            <span className={`text-xs font-bold ${ciLevelColor}`}>{ciLevel}</span>
                          </div>
                          <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700 rounded-full" style={{ width: `${Math.min(ciAffinity, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 text-right">{ciAffinity} / 100</p>
                        </div>
                      );
                    })()}
                    <div className="hand-drawn-panel p-4" style={{ borderWidth: '2px' }}>
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">网络</p>
                      {authUser ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wifi size={14} className="text-emerald-500" />
                            <span className="text-sm font-bold text-slate-800">{authUser.username}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">在线</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <WifiOff size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-500">离线模式</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { AudioSystem.playClick(); setActiveTab('card'); }} className="hand-drawn-btn px-8 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><IdCard size={18} /> 居民证 · 明信片</button>
                    <button onClick={() => { AudioSystem.playConfirm(); saveGame(); alert("Game Saved Successfully!"); }} className="hand-drawn-btn px-8 py-4 text-xl font-bold w-full">保存进度</button>
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button onClick={() => { AudioSystem.playClick(); exportIslandFile(); }} className="hand-drawn-btn px-4 py-4 text-sm font-bold flex items-center justify-center gap-2"><Download size={16} /> 导出文件</button>
                      <label className="hand-drawn-btn px-4 py-4 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
                        <Upload size={16} /> 导入文件
                        <input type="file" accept="application/json,.json" className="hidden" onChange={handleImportIsland} />
                      </label>
                    </div>
                    <button onClick={() => { AudioSystem.playClick(); setShowGift(true); }} className="hand-drawn-btn px-8 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><Gift size={18} /> 生成礼物链接</button>
                    <button onClick={() => { AudioSystem.playClick(); if (confirm('确定清空当前岛屿上的所有物体？此操作不可撤销。')) { store.clearAll(); setIsOpen(false); } }} className="hand-drawn-btn px-8 py-4 text-base font-bold w-full flex items-center justify-center gap-3 text-red-600"><Trash2 size={18} /> 清空岛屿</button>
                    <button onClick={() => { AudioSystem.playClick(); window.dispatchEvent(new CustomEvent('wander:show-privacy')); }} className="hand-drawn-btn px-8 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><Shield size={18} /> 隐私政策</button>
                    {authUser && (
                      <button onClick={() => { AudioSystem.playConfirm(); api.setToken(null); disconnectSocket(); clearAuthUser(); setIsOpen(false); }} className="w-full flex items-center justify-center gap-3 hand-drawn-btn px-8 py-4 text-red-600 font-bold">
                        <LogOut size={18} /><span className="font-light tracking-[0.2em] uppercase text-sm">退出登录</span>
                      </button>
                    )}
                    <button onClick={() => { AudioSystem.playConfirm(); if (confirm("Return to Title Screen? Any unsaved progress will be lost!")) { setIsOpen(false); setScreen('TITLE'); } }} className="w-full flex items-center justify-center gap-3 hand-drawn-btn px-8 py-4 mt-12 text-red-600 font-bold">
                      <LogOut size={18} /><span className="font-light tracking-[0.2em] uppercase text-sm">返回标题</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showGift && (
        <GiftModal
          mode="create"
          fromName={useGameStore.getState().playerName}
          islandName={useGameStore.getState().islandName}
          onClose={() => setShowGift(false)}
        />
      )}

      {/* 成为好友庆祝浮层 */}
      {celebrate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center gap-3 animate-in zoom-in-50 fade-in duration-500">
            <div className="text-6xl" style={{ animation: 'friendPop 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>🤝</div>
            <div className="hand-drawn-panel px-6 py-3 shadow-xl" style={{ borderWidth: '2px' }}>
              <p className="text-lg font-black text-slate-800">你和 <span className="text-emerald-600">{celebrate}</span> 成为好友了！</p>
            </div>
            {/* 飘心 */}
            {['💚', '✨', '💛', '🌿', '✨', '💚'].map((e, i) => (
              <span key={i} className="absolute text-2xl" style={{ left: `${15 + i * 13}%`, bottom: '30%', animation: `friendFloat ${1.4 + (i % 3) * 0.3}s ease-out ${i * 0.08}s forwards`, opacity: 0 }}>{e}</span>
            ))}
          </div>
          <style>{`
            @keyframes friendPop { 0% { transform: scale(0) rotate(-20deg); } 60% { transform: scale(1.25) rotate(8deg); } 100% { transform: scale(1) rotate(0); } }
            @keyframes friendFloat { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(-120px) scale(1.1); opacity: 0; } }
          `}</style>
        </div>
      )}
    </>
  );
};
