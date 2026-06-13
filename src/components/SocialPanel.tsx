import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import {
  onChatMessage, onFriendRequest, onFriendAccepted,
  onIslandVisitor, emitChatSend, emitFriendRequest, emitFriendAccepted,
  emitPresenceCheck, emitIslandVisit, disconnectSocket, onPresenceStatus, onUserOnline, onUserOffline
} from '../lib/socket';
import {
  Users, MessageCircle, Globe, Search, Send, UserPlus, Check, X,
  ArrowLeft, LogOut, Wifi, WifiOff
} from 'lucide-react';

type Tab = 'friends' | 'chat' | 'islands';

export const SocialPanel: React.FC = () => {
  const authUser = useGameStore(state => state.authUser);
  const clearAuthUser = useGameStore(state => state.clearAuthUser);
  const setScreen = useGameStore(state => state.setScreen);
  const unreadCount = useGameStore(state => state.unreadCount);
  const setUnreadCount = useGameStore(state => state.setUnreadCount);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  // 触屏检测
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const hasCoarse = window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(hasCoarse || hasTouch);
  }, []);

  // Friends state
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  // Chat state
  const [chatTarget, setChatTarget] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Islands state
  const [islands, setIslands] = useState<any[]>([]);
  const [myIslands, setMyIslands] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    if (!isOpen) return;
    loadFriends();
    loadIslands();
    // Clear unread when opening panel on chat tab
    if (activeTab === 'chat') {
      setUnreadCount(0);
    }
  }, [isOpen, activeTab]);

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
    const unsubVisitor = onIslandVisitor((data) => {
      console.log(`${data.visitorName} visited your island!`);
    });
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

  const loadIslands = async () => {
    try {
      const [allRes, myRes] = await Promise.all([api.getIslands(), api.getMyIslands()]);
      setIslands(allRes.islands);
      setMyIslands(myRes.islands);
    } catch (err) { console.error('Failed to load islands:', err); }
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

  const handleOpenChat = async (friend: any) => {
    setChatTarget(friend);
    setActiveTab('chat');
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

  const handleLogout = () => {
    api.setToken(null);
    disconnectSocket();
    clearAuthUser();
    setIsOpen(false);
    setScreen('LOGIN');
  };

  // Mini widget button (when panel is closed)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`group relative flex items-center justify-center hand-drawn-btn shrink-0 ${isTouch ? 'w-11 h-11' : 'w-12 h-12'}`}
        title="社交"
      >
        <Users size={isTouch ? 20 : 24} className="text-slate-800" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-500">
      <div className={`hand-drawn-panel flex overflow-hidden shadow-2xl animate-slide-up ${isTouch ? 'touch-modal-full touch-safe-bottom flex-col' : 'w-[900px] h-[640px]'}`}>

        {/* Sidebar - Desktop: left / Touch: bottom tab */}
        {!isTouch ? (
        <div className="w-56 border-r-2 border-slate-800 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-800">
              {authUser?.avatar ? (
                <img src={authUser.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                  <Users size={18} className="text-emerald-600" />
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-slate-800 tracking-wide text-sm">{authUser?.username}</p>
              <div className="flex items-center gap-1">
                <Wifi size={10} className="text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-bold">在线</span>
              </div>
            </div>
          </div>

          <button onClick={() => setActiveTab('friends')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold tracking-widest transition-all ${activeTab === 'friends' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={16} /> 好友
          </button>
          <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold tracking-widest transition-all ${activeTab === 'chat' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
            <MessageCircle size={16} /> 聊天
          </button>
          <button onClick={() => setActiveTab('islands')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold tracking-widest transition-all ${activeTab === 'islands' ? 'hand-drawn-btn-active' : 'text-slate-500 hover:text-slate-700'}`}>
            <Globe size={16} /> 岛屿
          </button>

          <button onClick={handleLogout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold tracking-widest text-red-400 hover:text-red-600 transition-all">
            <LogOut size={16} /> 退出
          </button>
        </div>
        ) : (
          /* 触屏：底部 Tab 导航 */
          <div className="flex-shrink-0 border-t-2 border-slate-800 flex items-center justify-around px-2 py-2 touch-safe-bottom bg-[#fcf8ec]">
            <button onClick={() => setActiveTab('friends')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'friends' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
              <Users size={20} /><span className="text-[10px] font-bold">好友</span>
            </button>
            <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl relative ${activeTab === 'chat' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
              <MessageCircle size={20} /><span className="text-[10px] font-bold">聊天</span>
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <button onClick={() => setActiveTab('islands')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl ${activeTab === 'islands' ? 'hand-drawn-btn-active' : 'text-slate-500'}`}>
              <Globe size={20} /><span className="text-[10px] font-bold">岛屿</span>
            </button>
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-red-400">
              <LogOut size={20} /><span className="text-[10px] font-bold">退出</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col relative">
          {/* Close */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-6 right-6 hand-drawn-btn p-2 rounded-full z-10"
          >
            <X size={20} />
          </button>

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-3xl hand-drawn-title mb-8 border-b-2 border-slate-800 pb-4 -rotate-1">好友列表</h2>

              {/* Search */}
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索用户..."
                    className="w-full pl-9 pr-4 py-2.5 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm"
                    style={{ borderWidth: '2px' }}
                  />
                </div>
                <button onClick={handleSearch} className="hand-drawn-btn px-4 py-2">
                  <Search size={16} />
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">搜索结果</p>
                  {searchResults.map(user => (
                    <div key={user.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-amber-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-800" />
                        <span className="font-bold text-slate-800 text-sm">{user.username}</span>
                      </div>
                      <button
                        onClick={() => handleSendFriendRequest(user.id)}
                        className="hand-drawn-btn flex items-center gap-1 px-3 py-1 text-xs"
                      >
                        <UserPlus size={12} /> 加好友
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Requests */}
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
                        <button onClick={() => handleAcceptRequest(req.id)} className="hand-drawn-btn p-1.5 text-emerald-600">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleRejectRequest(req.id)} className="hand-drawn-btn p-1.5 text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends List */}
              <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">我的好友 ({friends.length})</p>
              {friends.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">还没有好友，搜索添加吧！</p>
              ) : (
                friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer"
                    onClick={() => handleOpenChat(friend)}
                  >
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
                        <p className="text-[10px] text-slate-400">
                          {(friend.is_online || friend.is_ai || onlineUsers[friend.id]) ? '在线' : '离线'}
                        </p>
                      </div>
                    </div>
                    <MessageCircle size={16} className="text-slate-400" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4">
              {chatTarget ? (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 px-8 py-4 border-b-2 border-slate-800">
                    <button onClick={() => { setChatTarget(null); setChatMessages([]); }} className="hand-drawn-btn p-1">
                      <ArrowLeft size={16} />
                    </button>
                    <img src={chatTarget.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-800" />
                    <span className="font-bold text-slate-800 tracking-wide">{chatTarget.username}</span>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
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

                  {/* Input */}
                  <div className="px-8 py-4 border-t-2 border-slate-800">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="输入消息..."
                        className="flex-1 px-4 py-2.5 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm"
                        style={{ borderWidth: '2px' }}
                      />
                      <button onClick={handleSendMessage} className="hand-drawn-btn px-4 py-2">
                        <Send size={16} />
                      </button>
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

          {/* Islands Tab */}
          {activeTab === 'islands' && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-3xl hand-drawn-title mb-8 border-b-2 border-slate-800 pb-4 -rotate-1">岛屿世界</h2>

              {/* My Islands */}
              <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">我的岛屿</p>
              {myIslands.length === 0 ? (
                <p className="text-sm text-slate-400 mb-6">暂无岛屿，在游戏中保存即可部署</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {myIslands.map(island => (
                    <div key={island.id} className="hand-drawn-panel p-4" style={{ borderWidth: '2px' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <Globe size={16} className="text-emerald-600" />
                        <span className="font-bold text-slate-800 text-sm">{island.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {island.is_public ? '🌍 公开' : '🔒 私有'} · 更新于 {new Date(island.updated_at * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Public Islands */}
              <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">探索岛屿</p>
              {islands.filter(i => i.owner_id !== authUser?.id).length === 0 ? (
                <p className="text-sm text-slate-400">暂无其他公开岛屿</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {islands.filter(i => i.owner_id !== authUser?.id).map(island => (
                    <div key={island.id} className="hand-drawn-panel p-4 cursor-pointer hover:bg-amber-50 transition-all hover:-translate-y-1 hover:scale-[1.02]"
                      style={{ borderWidth: '2px' }}
                      onClick={() => emitIslandVisit(island.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <img src={island.owner_avatar} alt="" className="w-6 h-6 rounded-full border border-slate-800" />
                        <span className="font-bold text-slate-800 text-sm">{island.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        by {island.owner_name} · {new Date(island.updated_at * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
