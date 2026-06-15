import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { X, Mail, Send, Trash2, ArrowLeft, Pen, User, Gift, UserPlus, Check } from 'lucide-react';
import { AudioSystem } from '../lib/audio';
import { emitFriendAccepted } from '../lib/socket';
import { TRACKS, renderTrackTexture, isCardOwned, grantCard } from './ui/musicData';

// ─── Animated Tutorial Guide Component ───
const TUTORIAL_SECTIONS = [
  {
    icon: '🗺️',
    title: '视角与移动',
    items: [
      { key: '🖱️ 左键拖动', desc: '旋转视角' },
      { key: '🖱️ 滚轮', desc: '缩放远近' },
      { key: 'W / A / S / D', desc: '前后左右移动镜头' },
      { key: 'Tab', desc: '在光标模式与建造模式之间快速切换' },
      { key: 'Esc', desc: '退出当前选中的建筑/工具' },
    ],
  },
  {
    icon: '🏗️',
    title: '建造与编辑',
    items: [
      { key: '下方建造栏', desc: '选择分类 → 点选物品 → 点击地面放置' },
      { key: '橡皮擦工具', desc: '点击已放置的物体将其移除' },
      { key: '地形隆起', desc: '抬升地面，造山造丘' },
      { key: '地形下陷', desc: '压低地面，挖湖挖河' },
      { key: '铺地工具', desc: '改变地表材质（草地/沙地/泥土）' },
      { key: '副岛', desc: '在海面上放置新小岛，扩展领地' },
    ],
  },
  {
    icon: '🌿',
    title: '生态与种植',
    items: [
      { key: '植物', desc: '橡树、松树、竹子、柳树、樱花、灌木' },
      { key: '动物', desc: '鹿、狼、海鸥、海豚、鱼' },
      { key: '建筑', desc: '房屋、风车、灯塔、帐篷、天文台、遗迹拱门' },
      { key: '锄地 → 播种', desc: '种下小麦/胡萝卜，等待生长' },
      { key: '生态面板', desc: '左上角头像 → 生态页，调整生态配置' },
    ],
  },
  {
    icon: '💬',
    title: '认识「辞」',
    items: [
      { key: '右下角头像', desc: '点击打开与「辞」的聊天窗口' },
      { key: 'DeepSeek', desc: '「辞」已接入 DeepSeek，可以聊各种话题' },
      { key: '好感度', desc: '多聊天提升好感，解锁更多对话' },
    ],
  },
  {
    icon: '🎵',
    title: '音乐长廊',
    items: [
      { key: '左下角卡片', desc: '点击打开音乐收藏库' },
      { key: '翻面', desc: '点击卡片查看背面故事' },
      { key: '播放', desc: '点击「播放这首」切换背景音乐' },
      { key: '信箱领取', desc: '新卡片通过邮件赠送，记得领取' },
    ],
  },
  {
    icon: '🌐',
    title: '社交与联机',
    items: [
      { key: '好友系统', desc: '搜索用户名添加好友，聊天互访' },
      { key: '漂流广场', desc: '公告板 / 漂流瓶 / 岛屿橱窗' },
      { key: '漂流瓶', desc: '投入心情或捡起别人的瓶子阅读回信' },
      { key: '岛屿橱窗', desc: '浏览公开岛屿，点击即可前往参观' },
      { key: '访客簿', desc: '参观时留言，查看自己的访客记录' },
    ],
  },
  {
    icon: '🎁',
    title: '礼物与存档',
    items: [
      { key: '赠送礼物', desc: '左上角头像 → 存档页 → 赠送礼物，打包岛屿分享' },
      { key: '导出存档', desc: '左上角头像 → 存档页 → 导出，备份为文件' },
      { key: '导入存档', desc: '左上角头像 → 存档页 → 导入，恢复之前的进度' },
      { key: '信箱', desc: '好友申请、音乐卡片、系统公告都在这里' },
    ],
  },
  {
    icon: '🌙',
    title: '沉浸与专注',
    items: [
      { key: '沉浸模式', desc: '隐藏所有 UI，安静欣赏岛屿' },
      { key: '番茄钟', desc: '沉浸模式中的专注计时器' },
      { key: '设置', desc: '左上角头像 → 设置，音量/主题/清除数据' },
    ],
  },
];

function TutorialGuideContent() {
  const [visibleSections, setVisibleSections] = useState(0);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  useEffect(() => {
    // Staggered reveal of sections
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= TUTORIAL_SECTIONS.length; i++) {
      timers.push(setTimeout(() => setVisibleSections(i), i * 200));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto scrollbar-none pr-1">
      {/* Header */}
      <div className="text-center mb-2" style={{ animation: 'tutorialFadeIn 0.6s ease both' }}>
        <p className="hand-drawn-title text-xl text-slate-800 -rotate-1">漫游者指南</p>
        <p className="text-slate-400 text-[9px] font-mono tracking-[0.3em] uppercase mt-1">WANDERER'S GUIDE</p>
      </div>

      {TUTORIAL_SECTIONS.map((section, si) => {
        const isVisible = si < visibleSections;
        const isExpanded = expandedSection === si;
        return (
          <div
            key={si}
            className="rounded-xl border border-slate-200/80 overflow-hidden transition-all duration-300"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 0.4s ease ${si * 0.1}s, transform 0.4s ease ${si * 0.1}s`,
              background: isExpanded ? 'rgba(254,243,199,0.3)' : 'rgba(255,255,255,0.5)',
            }}
          >
            {/* Section header */}
            <button
              onClick={() => { setExpandedSection(isExpanded ? null : si); AudioSystem.playTap(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <span className="text-lg">{section.icon}</span>
              <span className="text-sm font-bold text-slate-800 tracking-wide flex-1">{section.title}</span>
              <span
                className="text-slate-400 text-xs transition-transform duration-300"
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>

            {/* Section items */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: isExpanded ? section.items.length * 40 + 16 : 0, opacity: isExpanded ? 1 : 0 }}
            >
              <div className="px-4 pb-3 flex flex-col gap-1.5">
                {section.items.map((item, ii) => (
                  <div
                    key={ii}
                    className="flex items-start gap-2 py-1"
                    style={{ animation: isExpanded ? `tutorialFadeIn 0.3s ease ${ii * 0.05}s both` : 'none' }}
                  >
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap mt-0.5">
                      {item.key}
                    </span>
                    <span className="text-[12px] text-slate-600 leading-relaxed">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center mt-3 pt-3 border-t border-slate-200/50" style={{ animation: 'tutorialFadeIn 0.6s ease 1.8s both' }}>
        <p className="text-slate-400 text-[10px] italic">愿你在流浪岛上，找到属于自己的宁静。</p>
        <p className="text-slate-300 text-[9px] font-mono mt-1">—— 辞</p>
      </div>

      <style>{`
        @keyframes tutorialFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export const MailboxModal: React.FC<{ onClose: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const authUser = useGameStore(state => state.authUser);
  const [mails, setMails] = useState<any[]>([]);
  const [selectedMail, setSelectedMail] = useState<any>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [writeTo, setWriteTo] = useState('');
  const [writeSubject, setWriteSubject] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [claimAnim, setClaimAnim] = useState(false);
  const [, setClaimedTick] = useState(0); // 领取后强制刷新 owned 状态
  const [friendReqs, setFriendReqs] = useState<any[]>([]); // 收到的好友申请

  // 解析"记忆卡"邮件：gift_type = "music_card:<url>"
  const cardOf = (mail: any) => {
    const gt: string = mail?.gift_type || '';
    if (!gt.startsWith('music_card:')) return null;
    const url = gt.slice('music_card:'.length);
    const idx = TRACKS.findIndex(t => t.url === url);
    return idx >= 0 ? { idx, ...TRACKS[idx] } : null;
  };

  // 解析教程邮件：gift_type = "tutorial_guide"
  const isTutorialMail = (mail: any) => mail?.gift_type === 'tutorial_guide';

  const claimCard = (url: string) => {
    grantCard(url);
    AudioSystem.playSynergyChord();
    setClaimAnim(true);
    setClaimedTick(t => t + 1);
    setTimeout(() => setClaimAnim(false), 1800);
  };

  useEffect(() => {
    loadMails();
    loadFriends();
    loadFriendReqs();
  }, []);

  const loadFriendReqs = async () => {
    try {
      const res = await api.getFriendRequests();
      setFriendReqs(res.incoming || []);
    } catch { /* ignore */ }
  };

  const handleAcceptReq = async (userId: string) => {
    AudioSystem.playConfirm();
    try {
      await api.acceptFriendRequest(userId);
      emitFriendAccepted(userId);
      setFriendReqs(prev => prev.filter(r => r.id !== userId));
      loadFriends();
    } catch (err: any) { alert(err?.message || '操作失败'); }
  };

  const handleRejectReq = async (userId: string) => {
    AudioSystem.playClose();
    try {
      await api.rejectFriendRequest(userId);
      setFriendReqs(prev => prev.filter(r => r.id !== userId));
    } catch { /* ignore */ }
  };

  const loadMails = async () => {
    try {
      const res = await api.getMailbox();
      setMails(res.mails);
    } catch (err) {
      console.error('Failed to load mailbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await api.getFriends();
      setFriends(res.friends);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const handleOpenMail = async (mail: any) => {
    setSelectedMail(mail);
    if (!mail.read) {
      try {
        await api.markMailRead(mail.id);
        setMails(prev => prev.map(m => m.id === mail.id ? { ...m, read: 1 } : m));
      } catch {}
    }
  };

  const handleSendMail = async () => {
    if (!writeTo || !writeContent.trim()) return;
    try {
      await api.sendMail(writeTo, writeSubject, writeContent.trim());
      setIsWriting(false);
      setWriteTo('');
      setWriteSubject('');
      setWriteContent('');
      loadMails();
    } catch (err) {
      console.error('Failed to send mail:', err);
    }
  };

  const handleDeleteMail = async (id: string) => {
    try {
      await api.deleteMail(id);
      setSelectedMail(null);
      loadMails();
    } catch {}
  };

  return (
    <div className={embedded ? "flex flex-col h-full" : "hand-drawn-panel w-[700px] max-h-[85vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden"}>
      {/* Header */}
      {!embedded && (
      <div className="flex justify-between items-center border-b-2 border-slate-800 p-8 pb-6">
        <div className="flex items-center gap-3">
          <Mail size={24} className="text-amber-600" />
          <h2 className="text-3xl hand-drawn-title -rotate-1">岛屿信箱</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsWriting(true); setSelectedMail(null); }}
            className="hand-drawn-btn px-4 py-2 flex items-center gap-2 text-sm"
          >
            <Pen size={14} /> 写信
          </button>
          <button onClick={onClose} className="hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200">
            <X size={24} strokeWidth={3} className="text-slate-800" />
          </button>
        </div>
      </div>
      )}
<div className={embedded ? "flex-1 overflow-y-auto custom-scrollbar p-6" : "flex-1 overflow-y-auto p-8 custom-scrollbar"}>
        {/* Compose Mode */}
        {isWriting ? (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setIsWriting(false)} className="hand-drawn-btn p-2 self-start">
              <ArrowLeft size={16} />
            </button>

            {/* Recipient Selection */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">收件人</p>
              {friends.length === 0 ? (
                <p className="text-sm text-slate-400">暂无好友，先去添加好友吧</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {friends.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setWriteTo(f.id)}
                      className={`hand-drawn-btn px-3 py-1.5 text-xs flex items-center gap-2 ${writeTo === f.id ? 'hand-drawn-btn-active' : ''}`}
                    >
                      <img src={f.avatar} alt="" className="w-5 h-5 rounded-full border border-slate-800" />
                      {f.username}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              value={writeSubject}
              onChange={e => setWriteSubject(e.target.value)}
              placeholder="主题"
              className="hand-drawn-panel px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              style={{ borderWidth: '2px' }}
            />
            <textarea
              value={writeContent}
              onChange={e => setWriteContent(e.target.value)}
              placeholder="写点什么..."
              rows={6}
              maxLength={500}
              className="hand-drawn-panel px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none"
              style={{ borderWidth: '2px' }}
            />
            <p className="text-[10px] text-slate-400 text-right">{writeContent.length} / 500</p>
            <button
              onClick={handleSendMail}
              disabled={!writeTo || !writeContent.trim()}
              className="hand-drawn-btn px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Send size={16} /> 寄出
            </button>
          </div>
        ) : selectedMail ? (
          /* Read Mode */
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setSelectedMail(null)} className="hand-drawn-btn p-2 self-start">
              <ArrowLeft size={16} />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-800 bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center shrink-0">
                {selectedMail.from_avatar ? (
                  <img src={selectedMail.from_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-amber-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-800 tracking-wide">{selectedMail.from_name}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {new Date(selectedMail.created_at * 1000).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedMail.subject && (
              <h3 className="text-lg font-bold text-slate-800 tracking-wide">{selectedMail.subject}</h3>
            )}

            <div className="hand-drawn-panel p-6 bg-amber-50/50" style={{ borderWidth: '2px' }}>
              {isTutorialMail(selectedMail) ? (
                <TutorialGuideContent />
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMail.content}</p>
              )}
            </div>

            {/* 记忆卡领取 */}
            {(() => {
              const card = cardOf(selectedMail);
              if (!card) return null;
              const owned = isCardOwned(card.url);
              return (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div
                    className="relative w-40 h-56 rounded-2xl overflow-hidden hand-drawn-panel"
                    style={{
                      transform: claimAnim ? 'scale(1.07) rotate(-2deg)' : 'scale(1)',
                      transition: 'transform 0.6s cubic-bezier(0.34,1.45,0.64,1)',
                      boxShadow: owned ? '0 0 0 3px #15803d, 0 14px 34px rgba(0,0,0,0.4)' : '0 12px 30px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div className="absolute inset-0" style={{ background: owned ? card.bg : 'linear-gradient(160deg,#cbd5e1 0%,#64748b 100%)' }} />
                    {owned && renderTrackTexture(card.idx)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    {!owned && <div className="absolute inset-0 flex items-center justify-center"><span className="px-2.5 py-1 rounded-full bg-slate-900/70 border border-white/40 text-white/90 text-[11px] font-bold tracking-widest">🔒 未领取</span></div>}
                    <p className="absolute bottom-3 left-3 right-3 text-white font-bold text-sm leading-tight drop-shadow">{card.title}</p>
                    {claimAnim && <div className="absolute inset-0 animate-pulse" style={{ boxShadow: 'inset 0 0 44px rgba(253,224,71,0.85)' }} />}
                  </div>
                  {owned ? (
                    <p className="text-emerald-600 font-bold text-sm flex items-center gap-1">✓ 已收入你的收藏库 ♪</p>
                  ) : (
                    <button onClick={() => claimCard(card.url)} className="hand-drawn-btn px-7 py-3 font-bold bg-white flex items-center gap-2">
                      <Gift size={16} /> 领取这段记忆
                    </button>
                  )}
                </div>
              );
            })()}

            <button
              onClick={() => handleDeleteMail(selectedMail.id)}
              className="hand-drawn-btn px-4 py-2 text-red-500 text-sm self-end flex items-center gap-2"
            >
              <Trash2 size={14} /> 删除
            </button>
          </div>
        ) : (
          /* Inbox List */
          <div className="flex flex-col gap-2">
            {embedded && (
              <button
                onClick={() => { setIsWriting(true); setSelectedMail(null); }}
                className="hand-drawn-btn px-4 py-2 flex items-center gap-2 text-sm self-start mb-2"
              >
                <Pen size={14} /> 写信
              </button>
            )}
            {/* 好友申请：同意后即可聊天、互访、赠礼 */}
            {friendReqs.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase flex items-center gap-1.5"><UserPlus size={12} /> 好友申请</p>
                {friendReqs.map(req => (
                  <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/70 border-2 border-amber-200">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-800 shrink-0">
                      {req.avatar ? <img src={req.avatar} alt="" className="w-full h-full object-cover" /> : <User size={16} className="text-amber-400 m-auto" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{req.username}</p>
                      <p className="text-[11px] text-slate-400">想成为你的岛友</p>
                    </div>
                    <button onClick={() => handleAcceptReq(req.id)} className="hand-drawn-btn px-2.5 py-1.5 text-emerald-600 flex items-center gap-1 text-xs font-bold"><Check size={13} /> 同意</button>
                    <button onClick={() => handleRejectReq(req.id)} className="hand-drawn-btn p-1.5 text-slate-400"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">加载中...</p>
              </div>
            ) : mails.length === 0 && friendReqs.length === 0 ? (
              <div className="text-center py-16">
                <Mail size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-bold tracking-widest">信箱空空如也</p>
                <p className="text-slate-300 text-sm mt-2">给好友写封信吧</p>
              </div>
            ) : (
              mails.map(mail => (
                <div
                  key={mail.id}
                  onClick={() => handleOpenMail(mail)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors hover:bg-amber-50/80 ${
                    !mail.read ? 'bg-amber-50/60 border-2 border-amber-200' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-800 shrink-0 bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                    {mail.from_avatar ? (
                      <img src={mail.from_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{mail.from_name}</span>
                      {!mail.read && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {mail.subject || mail.content.slice(0, 40)}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(mail.created_at * 1000).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
