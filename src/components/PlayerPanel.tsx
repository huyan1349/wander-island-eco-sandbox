import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { disconnectSocket, onChatMessage, onFriendRequest, onFriendAccepted, onIslandVisitor, emitChatSend, emitFriendRequest, emitFriendAccepted, emitPresenceCheck, emitIslandVisit, onPresenceStatus, onUserOnline, onUserOffline } from '../lib/socket';
import { MailboxModal } from './MailboxModal';
import { VisitorBookModal } from './VisitorBookModal';
import { SocialPlaza } from './SocialPlaza';
import {
  User, Edit2, BarChart2, Leaf, Unlock, Settings, LogOut, Clock, Layers,
  Wifi, WifiOff, Camera, X, Users, MessageCircle, Globe, Search, Send,
  UserPlus, Check, ArrowLeft, Mail, BookOpen, Compass, Star, Waves, Download, Gift
} from 'lucide-react';
import { exportIslandFile } from '../utils/islandIO';
import { GiftModal } from './GiftModal';

type Tab = 'stats' | 'ecology' | 'unlocks' | 'social' | 'system';
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

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [showGift, setShowGift] = useState(false);
  const [activeSocialTab, setActiveSocialTab] = useState<SocialTab>('friends');

  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(playerName);

  // 触屏检测
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const hasCoarse = window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(hasCoarse || hasTouch);
  }, []);

  // Social state
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [chatTarget, setChatTarget] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const xpForNextLevel = 100;
  const currentLevelXP = playerXP % 100;
  const xpPercentage = (currentLevelXP / 100) * 100;

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
    const unsubAcc = onFriendAccepted(() => loadFriends());
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

  const handleSaveName = async () => {
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
    api.updateProfile({ avatarFile: file })
      .then(res => setAuthUser(res.user))
      .catch(err => console.error('Avatar upload failed:', err));
  };

  const handleOpenChat = async (friend: any) => {
    setChatTarget(friend);
    setActiveSocialTab('chat');
    try {
      const res = await api.getChatMessages(friend.id);
      setChatMessages(res.messages);
    } catch (err) { console.error('Failed to load chat:', err); }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !chatTarget) return;
    emitChatSend(chatTarget.id, chatInput.trim());
    setChatInput('');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.searchUsers(searchQuery.trim());
      setSearchResults(res.users);
    } catch (err) { console.error('Search failed:', err); }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await api.sendFriendRequest(userId);
      emitFriendRequest(userId);
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) { alert(err.message); }
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      await api.acceptFriendRequest(userId);
      emitFriendAccepted(userId);
      loadFriends();
    } catch (err: any) { alert(err.message); }
  };

  const handleRejectRequest = async (userId: string) => {
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
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-4 hand-drawn-btn hand-drawn-ghost p-3 pr-6"
      >
        <div className="relative group">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-800 shadow-inner overflow-hidden">
            {(authUser ? authUser.avatar : playerAvatar) ? (
              <img src={authUser ? authUser.avatar : playerAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="text-slate-700" size={24} />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-900 border text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center shadow-lg">
            {playerLevel}
          </div>
          {authUser && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse" title="在线" />
          )}
          {authUser && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera size={16} className="text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-sm font-bold text-white group-hover:text-slate-900 transition-colors tracking-wide">
            {authUser ? authUser.username : playerName}
          </span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" style={{ width: `${xpPercentage}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Full Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-500">
          <div className={`hand-drawn-panel flex overflow-hidden shadow-2xl animate-slide-up ring-1 ${isTouch ? 'touch-modal-full touch-safe-bottom flex-col' : 'w-[960px] h-[640px]'}`}>

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

                <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'stats' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <BarChart2 size={16} /> 护照
                </button>
                <button onClick={() => setActiveTab('ecology')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'ecology' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Leaf size={16} /> 生态
                </button>
                <button onClick={() => setActiveTab('unlocks')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'unlocks' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Unlock size={16} /> 蓝图
                </button>
                <button onClick={() => { setActiveTab('social'); setActiveSocialTab('friends'); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all relative ${activeTab === 'social' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Users size={16} /> 社交
                  {(unreadCount > 0 || unreadMailCount > 0) && (
                    <span className="absolute right-3 top-2 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full border border-slate-800">
                      {unreadCount + unreadMailCount > 9 ? '9+' : unreadCount + unreadMailCount}
                    </span>
                  )}
                </button>
                <button onClick={() => setActiveTab('system')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all mt-auto ${activeTab === 'system' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Settings size={16} /> 系统
                </button>
              </div>
            ) : (
              /* 触屏：底部 Tab 导航 */
              <div className="flex-shrink-0 border-t-2 border-slate-800 flex items-center justify-around px-2 py-2 touch-safe-bottom bg-[#fcf8ec]">
                <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'stats' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <BarChart2 size={20} /><span className="text-[10px] font-bold">护照</span>
                </button>
                <button onClick={() => setActiveTab('ecology')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'ecology' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <Leaf size={20} /><span className="text-[10px] font-bold">生态</span>
                </button>
                <button onClick={() => setActiveTab('unlocks')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'unlocks' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <Unlock size={20} /><span className="text-[10px] font-bold">蓝图</span>
                </button>
                <button onClick={() => { setActiveTab('social'); setActiveSocialTab('friends'); }} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl relative ${activeTab === 'social' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <Users size={20} /><span className="text-[10px] font-bold">社交</span>
                  {(unreadCount > 0 || unreadMailCount > 0) && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full">
                      {unreadCount + unreadMailCount > 9 ? '9+' : unreadCount + unreadMailCount}
                    </span>
                  )}
                </button>
                <button onClick={() => setActiveTab('system')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'system' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
                  <Settings size={20} /><span className="text-[10px] font-bold">系统</span>
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative">
              <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 hand-drawn-btn p-2 rounded-full z-10">
                <X size={20} />
              </button>

              {/* ====== Passport Tab ====== */}
              {activeTab === 'stats' && (
                <div className="flex-1 p-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto custom-scrollbar">
                  <h2 className="text-4xl hand-drawn-title mb-10 border-b-2 border-slate-800 pb-6 -rotate-1">岛民护照</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="hand-drawn-panel p-8" style={{ borderWidth: '2px' }}>
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">岛屿</p>
                      <p className="text-3xl font-light text-slate-800 tracking-widest">{islandName}</p>
                    </div>
                    <div className="hand-drawn-panel p-8 bg-gradient-to-br from-emerald-500/10 to-transparent" style={{ borderWidth: '2px' }}>
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-2">生态点</p>
                      <p className="text-4xl font-light text-emerald-400 tracking-wider">{ecoPoints}</p>
                    </div>
                    <div className="hand-drawn-panel p-8 flex items-center gap-8" style={{ borderWidth: '2px' }}>
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                        <Clock size={24} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">游戏时长</p>
                        <p className="text-2xl font-light text-slate-800 tracking-widest">{Math.floor(stats.playtime / 60)} min</p>
                      </div>
                    </div>
                    <div className="hand-drawn-panel p-8 flex items-center gap-8" style={{ borderWidth: '2px' }}>
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                        <Layers size={24} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">已放置物体</p>
                        <p className="text-2xl font-light text-slate-800 tracking-widest">{stats.itemsPlaced}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ====== Ecology Tab ====== */}
              {activeTab === 'ecology' && (
                <div className="flex-1 p-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto custom-scrollbar">
                  <h2 className="text-4xl hand-drawn-title mb-10 border-b-2 border-slate-800 pb-6 -rotate-1">岛屿生态</h2>
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
                    <button onClick={() => exportIslandFile()} className="hand-drawn-btn px-6 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><Download size={18} /> 导出小岛文件</button>
                    <button onClick={() => setShowGift(true)} className="hand-drawn-btn px-6 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><Gift size={18} /> 生成礼物链接</button>
                  </div>
                </div>
              )}

              {/* ====== Unlocks Tab ====== */}
              {activeTab === 'unlocks' && (
                <div className="flex-1 p-10 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto custom-scrollbar">
                  <h2 className="text-4xl hand-drawn-title mb-10 border-b-2 border-slate-800 pb-6 -rotate-1">已解锁蓝图</h2>
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
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4">
                  {/* Social Sub-tabs */}
                  <div className="flex gap-1 px-8 pt-6 pb-3 border-b border-slate-200">
                    <button onClick={() => setActiveSocialTab('friends')} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'friends' ? 'hand-drawn-btn-active' : ''}`}>
                      <Users size={13} /> 好友
                    </button>
                    <button onClick={() => setActiveSocialTab('chat')} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'chat' ? 'hand-drawn-btn-active' : ''}`}>
                      <MessageCircle size={13} /> 聊天
                      {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </button>
                    <button onClick={() => setActiveSocialTab('mailbox')} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'mailbox' ? 'hand-drawn-btn-active' : ''}`}>
                      <Mail size={13} /> 信箱
                      {unreadMailCount > 0 && <span className="bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full">{unreadMailCount > 9 ? '9+' : unreadMailCount}</span>}
                    </button>
                    <button onClick={() => setActiveSocialTab('visitors')} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'visitors' ? 'hand-drawn-btn-active' : ''}`}>
                      <BookOpen size={13} /> 访客簿
                    </button>
                    <button onClick={() => setActiveSocialTab('plaza')} className={`hand-drawn-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${activeSocialTab === 'plaza' ? 'hand-drawn-btn-active' : ''}`}>
                      <Compass size={13} /> 广场
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Friends Sub-tab */}
                    {activeSocialTab === 'friends' && (
                      <div className="p-8">
                        {/* Search */}
                        <div className="flex gap-2 mb-6">
                          <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="搜索用户..." className="w-full pl-9 pr-4 py-2.5 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm" style={{ borderWidth: '2px' }} />
                          </div>
                          <button onClick={handleSearch} className="hand-drawn-btn px-4 py-2"><Search size={16} /></button>
                        </div>

                        {searchResults.length > 0 && (
                          <div className="mb-6">
                            <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">搜索结果</p>
                            {searchResults.map(user => (
                              <div key={user.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-amber-50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-800" />
                                  <span className="font-bold text-slate-800 text-sm">{user.username}</span>
                                </div>
                                <button onClick={() => handleSendFriendRequest(user.id)} className="hand-drawn-btn flex items-center gap-1 px-3 py-1 text-xs"><UserPlus size={12} /> 加好友</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {incomingRequests.length > 0 && (
                          <div className="mb-6">
                            <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">好友请求</p>
                            {incomingRequests.map(req => (
                              <div key={req.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-amber-50 mb-2 border-2 border-amber-200">
                                <div className="flex items-center gap-3">
                                  <img src={req.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-800" />
                                  <span className="font-bold text-slate-800 text-sm">{req.username}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handleAcceptRequest(req.id)} className="hand-drawn-btn p-1.5 text-emerald-600"><Check size={14} /></button>
                                  <button onClick={() => handleRejectRequest(req.id)} className="hand-drawn-btn p-1.5 text-red-500"><X size={14} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">我的好友 ({friends.length})</p>
                        {friends.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-8">还没有好友，搜索添加吧</p>
                        ) : (
                          friends.map(friend => (
                            <div key={friend.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer" onClick={() => handleOpenChat(friend)}>
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
                      <div className="flex-1 flex flex-col h-full">
                        {chatTarget ? (
                          <>
                            <div className="flex items-center gap-3 px-8 py-3 border-b border-slate-200">
                              <button onClick={() => { setChatTarget(null); setChatMessages([]); }} className="hand-drawn-btn p-1"><ArrowLeft size={14} /></button>
                              <img src={chatTarget.avatar} alt="" className="w-7 h-7 rounded-full border border-slate-800" />
                              <span className="font-bold text-slate-800 text-sm tracking-wide">{chatTarget.username}</span>
                              {chatTarget.is_ai && <span className="text-[9px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-bold">AI</span>}
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
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
                                <button onClick={handleSendMessage} className="hand-drawn-btn px-4 py-2"><Send size={16} /></button>
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
                  <h2 className="text-4xl hand-drawn-title mb-10 border-b-2 border-slate-800 pb-6 -rotate-1">系统菜单</h2>
                  <div className="flex flex-col gap-6 max-w-sm mt-4">
                    <div className="hand-drawn-panel p-4" style={{ borderWidth: '2px' }}>
                      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">版本</p>
                      <p className="text-sm font-bold text-slate-800 tracking-wider">v2.2.0 Touch</p>
                    </div>
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
                    <button onClick={() => { saveGame(); alert("Game Saved Successfully!"); }} className="hand-drawn-btn px-8 py-4 text-xl font-bold w-full">保存进度</button>
                    <button onClick={() => exportIslandFile()} className="hand-drawn-btn px-8 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><Download size={18} /> 导出小岛文件</button>
                    <button onClick={() => setShowGift(true)} className="hand-drawn-btn px-8 py-4 text-base font-bold w-full flex items-center justify-center gap-3"><Gift size={18} /> 生成礼物链接</button>
                    {authUser && (
                      <button onClick={() => { api.setToken(null); disconnectSocket(); clearAuthUser(); setIsOpen(false); }} className="w-full flex items-center justify-center gap-3 hand-drawn-btn px-8 py-4 text-red-600 font-bold">
                        <LogOut size={18} /><span className="font-light tracking-[0.2em] uppercase text-sm">退出登录</span>
                      </button>
                    )}
                    <button onClick={() => { if (confirm("Return to Title Screen? Any unsaved progress will be lost!")) { setIsOpen(false); setScreen('TITLE'); } }} className="w-full flex items-center justify-center gap-3 hand-drawn-btn px-8 py-4 mt-12 text-red-600 font-bold">
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
    </>
  );
};
