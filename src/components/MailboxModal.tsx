import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { X, Mail, Send, Trash2, ArrowLeft, Pen, User, Gift, UserPlus, Check, Hammer, Castle, TowerControl, PenTool } from 'lucide-react';
import { AudioSystem } from '../lib/audio';
import { emitFriendAccepted } from '../lib/socket';
import { TRACKS, renderTrackTexture, isCardOwned, grantCard } from './ui/musicData';

// ─── Animated Tutorial Guide Component ───

// Hand-drawn style SVG icons — no emoji
const SvgCompass = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2d3436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="14" cy="14" r="11" strokeDasharray="3 2" />
    <path d="M14 5L15.5 12L14 14L12.5 12Z" fill="#b45309" stroke="#2d3436" />
    <path d="M14 23L12.5 16L14 14L15.5 16Z" fill="#60a5fa" stroke="#2d3436" />
    <circle cx="14" cy="14" r="1.5" fill="#2d3436" />
  </svg>
);
const SvgHammer = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2d3436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="3" width="12" height="7" rx="2" fill="#92400e" stroke="#2d3436" />
    <line x1="14" y1="10" x2="14" y2="25" stroke="#78350f" strokeWidth="3" />
    <path d="M10 6H18" stroke="#fcf8ec" strokeWidth="1.5" />
  </svg>
);
const SvgLeaf = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2d3436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22C6 22 8 10 20 4C20 4 22 16 12 22C10 23 7 23 6 22Z" fill="#4ade80" stroke="#2d3436" />
    <path d="M6 22C10 16 16 10 20 4" stroke="#166534" strokeWidth="1.5" />
    <path d="M10 18C12 15 14 12 16 9" stroke="#166534" strokeWidth="1" opacity="0.5" />
  </svg>
);
const SvgSpirit = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2d3436" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* Calligraphy brush */}
    <path d="M10 24L13 14L14 13L15 14L12 24Z" fill="#78350f" stroke="#2d3436" />
    <path d="M13 14L14 6L15 14" fill="#c4b5fd" stroke="#2d3436" />
    {/* Ink drip forming a spirit silhouette */}
    <ellipse cx="14" cy="5.5" rx="3.2" ry="3.5" fill="#c4b5fd" stroke="#2d3436" />
    {/* Spirit eyes — gentle closed */}
    <path d="M12.2 5C12.6 4.5 13.2 4.5 13.4 5" stroke="#2d3436" strokeWidth="1" />
    <path d="M14.6 5C15 4.5 15.6 4.5 15.8 5" stroke="#2d3436" strokeWidth="1" />
    {/* Tiny smile */}
    <path d="M13.2 6.5C13.6 6.9 14.4 6.9 14.8 6.5" stroke="#2d3436" strokeWidth="0.8" />
    {/* Flowing ink trail */}
    <path d="M11 5C9 7 8.5 10 10 12" stroke="#2d3436" strokeWidth="1" opacity="0.4" strokeDasharray="2 1.5" />
    <path d="M17 5C19 7 19.5 10 18 12" stroke="#2d3436" strokeWidth="1" opacity="0.4" strokeDasharray="2 1.5" />
    {/* Ink splatter dots */}
    <circle cx="8" cy="11" r="0.8" fill="#2d3436" opacity="0.3" />
    <circle cx="20" cy="10" r="0.6" fill="#2d3436" opacity="0.25" />
    <circle cx="9.5" cy="8" r="0.5" fill="#2d3436" opacity="0.2" />
  </svg>
);
const SvgMusic = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2d3436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20V7L23 4V17" stroke="#2d3436" />
    <circle cx="8" cy="20" r="3" fill="#f59e0b" stroke="#2d3436" />
    <circle cx="20" cy="17" r="3" fill="#f59e0b" stroke="#2d3436" />
    <line x1="11" y1="7" x2="23" y2="4" stroke="#2d3436" />
  </svg>
);
const SvgGlobe = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2d3436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="14" cy="14" r="11" fill="#bfdbfe" stroke="#2d3436" />
    <ellipse cx="14" cy="14" rx="5" ry="11" stroke="#2d3436" />
    <line x1="3" y1="10" x2="25" y2="10" stroke="#2d3436" strokeWidth="1.2" />
    <line x1="3" y1="18" x2="25" y2="18" stroke="#2d3436" strokeWidth="1.2" />
  </svg>
);
const SvgGift = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2d3436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="12" width="20" height="12" rx="2" fill="#fbbf24" stroke="#2d3436" />
    <rect x="4" y="8" width="20" height="5" rx="1.5" fill="#fde68a" stroke="#2d3436" />
    <line x1="14" y1="8" x2="14" y2="24" stroke="#92400e" strokeWidth="2" />
    <path d="M14 8C14 8 10 4 8 6C6 8 10 8 14 8Z" fill="#dc2626" stroke="#2d3436" />
    <path d="M14 8C14 8 18 4 20 6C22 8 18 8 14 8Z" fill="#dc2626" stroke="#2d3436" />
  </svg>
);
const SvgMoon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#2d3436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 17C16 17 12 13 12 8C12 6.5 12.3 5 13 3.5C8.5 5 5 9.5 5 15C5 21 10 26 16 26C20.5 26 24.3 23.5 26 20C24.5 16.5 22.5 17 21 17Z" fill="#fde68a" stroke="#2d3436" />
    <circle cx="20" cy="8" r="0.8" fill="#2d3436" />
    <circle cx="24" cy="12" r="0.6" fill="#2d3436" />
    <circle cx="22" cy="5" r="0.5" fill="#2d3436" />
  </svg>
);

const TUTORIAL_SECTIONS = [
  {
    icon: <SvgCompass />,
    title: '视角与移动',
    subtitle: 'NAVIGATION',
    narrative: '在这座小岛上，你的目光就是翅膀。学会驾驭视角，才能发现每一处隐秘的风景。',
    items: [
      { key: '左键拖动', desc: '旋转视角，环顾四周' },
      { key: '滚轮缩放', desc: '拉近看细节，拉远看全貌' },
      { key: 'W / A / S / D', desc: '前后左右移动镜头' },
      { key: 'Tab', desc: '光标模式 ↔ 建造模式 快速切换' },
      { key: 'Esc', desc: '退出当前选中的建筑或工具' },
    ],
  },
  {
    icon: <SvgHammer />,
    title: '建造与编辑',
    subtitle: 'BUILDING',
    narrative: '每一块土地都等待你的雕琢。从一粒沙到一座山，你的岛屿由你亲手塑造。',
    items: [
      { key: '下方建造栏', desc: '选择分类 → 点选物品 → 点击地面放置' },
      { key: '橡皮擦', desc: '点击已放置的物体将其移除' },
      { key: '地形隆起', desc: '抬升地面，造山造丘' },
      { key: '地形下陷', desc: '压低地面，挖湖挖河' },
      { key: '铺地工具', desc: '改变地表材质 — 草地 / 沙地 / 泥土' },
      { key: '副岛', desc: '在海面上放置新小岛，扩展领地' },
    ],
  },
  {
    icon: <SvgLeaf />,
    title: '生态与种植',
    subtitle: 'ECOLOGY',
    narrative: '岛上的生命会随你的选择而变化。种一棵树，引一群鸟，生态的涟漪从此开始。',
    items: [
      { key: '植物', desc: '橡树 · 松树 · 竹子 · 柳树 · 樱花 · 灌木' },
      { key: '动物', desc: '鹿 · 狼 · 海鸥 · 海豚 · 鱼' },
      { key: '建筑', desc: '房屋 · 风车 · 灯塔 · 帐篷 · 天文台 · 遗迹拱门' },
      { key: '锄地 → 播种', desc: '种下小麦或胡萝卜，等待生长' },
      { key: '生态面板', desc: '左上角头像 → 生态页，调整生态配置' },
    ],
  },
  {
    icon: <SvgSpirit />,
    title: '认识「辞」',
    subtitle: 'SPIRIT',
    narrative: '「辞」是这座岛的守护灵，她以文字为桥梁，与你分享岛上的故事与秘密。',
    items: [
      { key: '右下角头像', desc: '点击打开与「辞」的聊天窗口' },
      { key: 'DeepSeek', desc: '「辞」已接入 DeepSeek，可以聊各种话题' },
      { key: '好感度', desc: '多聊天提升好感，解锁更多对话与故事' },
    ],
  },
  {
    icon: <SvgMusic />,
    title: '音乐长廊',
    subtitle: 'MUSIC',
    narrative: '每张卡片封存一段旋律的记忆。翻面、聆听、收藏，让音乐成为你岛屿的背景诗。',
    items: [
      { key: '左下角卡片', desc: '点击打开音乐收藏库' },
      { key: '翻面', desc: '点击卡片查看背面故事' },
      { key: '播放', desc: '点击「播放这首」切换背景音乐' },
      { key: '信箱领取', desc: '新卡片通过邮件赠送，记得领取' },
    ],
  },
  {
    icon: <SvgGlobe />,
    title: '社交与联机',
    subtitle: 'SOCIAL',
    narrative: '海的那边有别的岛，也有别的旅人。漂流瓶、岛屿橱窗、访客簿——连接从这里开始。',
    items: [
      { key: '好友系统', desc: '搜索用户名添加好友，聊天互访' },
      { key: '漂流广场', desc: '公告板 / 漂流瓶 / 岛屿橱窗' },
      { key: '漂流瓶', desc: '投入心情或捡起别人的瓶子阅读回信' },
      { key: '岛屿橱窗', desc: '浏览公开岛屿，点击即可前往参观' },
      { key: '访客簿', desc: '参观时留言，查看自己的访客记录' },
    ],
  },
  {
    icon: <SvgGift />,
    title: '礼物与存档',
    subtitle: 'ARCHIVE',
    narrative: '你的岛屿值得被珍藏。打包一份礼物送给朋友，或导出存档为这段旅程留下备份。',
    items: [
      { key: '赠送礼物', desc: '左上角头像 → 存档页 → 赠送礼物' },
      { key: '导出存档', desc: '左上角头像 → 存档页 → 导出为文件' },
      { key: '导入存档', desc: '左上角头像 → 存档页 → 导入恢复进度' },
      { key: '信箱', desc: '好友申请、音乐卡片、系统公告都在这里' },
    ],
  },
  {
    icon: <SvgMoon />,
    title: '沉浸与专注',
    subtitle: 'ZEN',
    narrative: '当世界安静下来，你才能真正听见海浪与风声。沉浸模式，为你的心留一片净土。',
    items: [
      { key: '沉浸模式', desc: '隐藏所有 UI，安静欣赏岛屿' },
      { key: '番茄钟', desc: '沉浸模式中的专注计时器' },
      { key: '设置', desc: '左上角头像 → 设置，音量/主题/清除数据' },
    ],
  },
];

function TutorialGuideContent() {
  const [currentPage, setCurrentPage] = useState(0);
  const [animDir, setAnimDir] = useState(0); // -1 left, 1 right, 0 init
  const [isAnimating, setIsAnimating] = useState(false);

  const section = TUTORIAL_SECTIONS[currentPage];
  const totalPages = TUTORIAL_SECTIONS.length;

  const goTo = (page: number) => {
    if (page < 0 || page >= totalPages || isAnimating) return;
    setAnimDir(page > currentPage ? 1 : -1);
    setIsAnimating(true);
    AudioSystem.playTap();
    setTimeout(() => {
      setCurrentPage(page);
      setTimeout(() => setIsAnimating(false), 50);
    }, 180);
  };

  return (
    <div className="flex flex-col w-full select-text" style={{ minHeight: '420px' }}>
      {/* Header */}
      <div className="text-center mb-4 pt-1">
        <p className="hand-drawn-title text-2xl text-slate-800" style={{ transform: 'rotate(-1deg)' }}>漫游者指南</p>
        <p className="text-slate-400 text-[9px] font-mono tracking-[0.35em] uppercase mt-1">WANDERER'S GUIDE</p>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {TUTORIAL_SECTIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all duration-200"
              style={{
                width: i === currentPage ? '18px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === currentPage ? '#92400e' : 'rgba(0,0,0,0.15)',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden relative">
        <div
          key={currentPage}
          className="flex flex-col gap-4"
          style={{
            animation: isAnimating ? 'none' : 'tutorialPageIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Section Title Block */}
          <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-800/10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(254,243,199,0.6)', border: '2px solid rgba(146,64,14,0.2)' }}>
              {section.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-wide" style={{ fontFamily: "'ZCOOL KuaiLe', sans-serif" }}>
                {section.title}
              </h3>
              <p className="text-[9px] font-mono text-amber-700/60 tracking-[0.3em] uppercase">{section.subtitle}</p>
            </div>
          </div>

          {/* Narrative */}
          <p className="text-[13px] text-slate-600 leading-relaxed italic pl-1"
            style={{ borderLeft: '3px solid rgba(146,64,14,0.2)', paddingLeft: '12px' }}>
            {section.narrative}
          </p>

          {/* Items */}
          <div className="flex flex-col gap-2 mt-1">
            {section.items.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-amber-50/60"
                style={{
                  animation: isAnimating ? 'none' : `tutorialItemIn 0.35s ease ${i * 0.06}s both`,
                }}
              >
                <span className="text-[11px] font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap mt-0.5 border border-amber-200/50"
                  style={{ fontFamily: "'Nunito', monospace" }}>
                  {item.key}
                </span>
                <span className="text-[13px] text-slate-600 leading-relaxed">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 0}
          className="hand-drawn-btn px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          ← 上一页
        </button>
        <span className="text-[10px] font-mono text-slate-400">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          className="hand-drawn-btn px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          下一页 →
        </button>
      </div>

      {/* Closing on last page */}
      {currentPage === totalPages - 1 && (
        <div className="text-center mt-3 pt-3 border-t border-slate-200/30"
          style={{ animation: 'tutorialPageIn 0.6s ease 0.3s both' }}>
          <p className="text-slate-400 text-[11px] italic">愿你在流浪岛上，找到属于自己的宁静。</p>
          <p className="text-slate-300 text-[9px] font-mono mt-1">—— 辞</p>
        </div>
      )}

      <style>{`
        @keyframes tutorialPageIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes tutorialItemIn {
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
  
  // 建筑全解锁金卡：gift_type = "unlock_all_buildings"
  const isBuildingUnlockMail = (mail: any) => mail?.gift_type === 'unlock_all_buildings';

  // DeepSeek升级公告邮件
  const isDeepseekAnnouncement = (mail: any) => mail?.gift_type === 'announcement_deepseek_multiplayer_v2' || mail?.gift_type === 'announcement_deepseek_multiplayer';

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
    <motion.div 
      className={embedded ? "flex flex-col h-full" : "hand-drawn-panel w-[700px] h-[550px] max-h-[85vh] p-0 flex flex-col ring-1 relative shadow-[0_20px_50px_rgba(15,23,42,0.3)] bg-[#fbf7ec]"}
      initial={embedded ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
      animate={embedded ? undefined : { opacity: 1, scale: 1, y: 0 }}
      exit={embedded ? undefined : { opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
      {!embedded && (
        <motion.button 
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { AudioSystem.playClose(); onClose(); }} 
          className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white text-slate-800 border-2 border-slate-800 shadow-[3px_3px_0_rgba(15,23,42,1)] hover:shadow-[1px_1px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center"
          title="关闭"
        >
           <X size={20} strokeWidth={3} />
        </motion.button>
      )}
      <div className="flex w-full h-full flex-col overflow-hidden" style={{ borderRadius: 'inherit' }}>
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

            <div className={`hand-drawn-panel p-6 bg-amber-50/50 ${isTutorialMail(selectedMail) ? 'overflow-y-auto max-h-[70vh] custom-scrollbar' : ''}`} style={{ borderWidth: '2px' }}>
              {isTutorialMail(selectedMail) ? (
                <TutorialGuideContent />
              ) : isDeepseekAnnouncement(selectedMail) ? (
                <div className="relative">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMail.content}</p>
                  <img
                    src="/mail-illustration.png"
                    alt=""
                    className="absolute bottom-0 right-0 w-28 h-28 object-contain pointer-events-none select-none"
                    style={{ opacity: 0.9 }}
                  />
                </div>
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

            {/* 建筑金卡领取 */}
            {(() => {
              if (!isBuildingUnlockMail(selectedMail)) return null;
              const owned = localStorage.getItem('claimed_buildings_card') === '1';
              return (
                <div className="flex flex-col items-center gap-4 py-2 mt-4">
                  <div
                    className="relative w-40 h-56 rounded-2xl overflow-hidden transition-transform duration-500 shadow-[0_12px_30px_rgba(15,23,42,0.12)] border border-slate-200"
                    style={{
                      transform: claimAnim ? 'scale(1.07) rotate(-2deg)' : 'scale(1)',
                    }}
                  >
                    <img 
                      src="/lighthouse_blueprint.png" 
                      alt="Building Blueprint" 
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ filter: owned ? 'none' : 'grayscale(60%) brightness(0.8) contrast(0.9) blur(1px)' }}
                    />
                    
                    {/* 纸张噪点纹理，增加质感 */}
                    {renderTrackTexture(-1)}

                    {!owned && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px]">
                        <span className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-400/40 text-slate-50 text-[11px] font-bold tracking-widest shadow-md">
                          🔒 未提取
                        </span>
                      </div>
                    )}
                    
                    {/* 高级感毛玻璃标签 */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[85%] py-2 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center justify-center">
                      <span className={`font-bold text-[13px] tracking-widest ${owned ? 'text-slate-800' : 'text-slate-600'}`}>
                        岛屿建设蓝图
                      </span>
                    </div>
                    
                    {claimAnim && <div className="absolute inset-0 animate-pulse bg-white/40 mix-blend-overlay" style={{ boxShadow: 'inset 0 0 50px rgba(255,255,255,1)' }} />}
                  </div>
                  
                  {owned ? (
                    <p className="text-emerald-600 font-bold text-sm flex items-center gap-1">✓ 已收入你的工具箱 ♪</p>
                  ) : (
                    <button onClick={() => {
                      setClaimAnim(true);
                      AudioSystem.playPop();
                      setTimeout(() => {
                        localStorage.setItem('claimed_buildings_card', '1');
                        setClaimAnim(false);
                        setClaimedTick(t => t + 1);
                      }, 600);
                    }} className="hand-drawn-btn px-7 py-3 font-bold bg-white flex items-center gap-2">
                      <Gift size={16} /> 领取建筑权限
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
    </motion.div>
  );
};
