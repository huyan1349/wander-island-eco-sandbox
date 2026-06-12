import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { emitIslandVisit } from '../lib/socket';
import {
  X, Compass, MessageSquare, Globe, Send, Waves,
  User, ArrowLeft, ChevronRight
} from 'lucide-react';

type Section = 'board' | 'bottle' | 'showcase';

export const SocialPlaza: React.FC<{ onClose: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const [activeSection, setActiveSection] = useState<Section>('board');

  return (
    <div className={embedded ? "flex flex-col h-full" : "hand-drawn-panel w-[900px] max-h-[85vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden"}>
      {/* Header */}
      {!embedded && (
      <div className="flex justify-between items-center border-b-2 border-slate-800 p-8 pb-4">
        <div className="flex items-center gap-3">
          <Compass size={24} className="text-cyan-600" />
          <h2 className="text-3xl hand-drawn-title -rotate-1">漂流广场</h2>
        </div>
        <button onClick={onClose} className="hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200">
          <X size={24} strokeWidth={3} className="text-slate-800" />
        </button>
      </div>
      )}


      {/* Section Tabs */}
      <div className="flex gap-2 px-8 py-3 border-b border-slate-200">
        <button
          onClick={() => setActiveSection('board')}
          className={`hand-drawn-btn px-5 py-2 text-sm font-bold tracking-wider flex items-center gap-2 ${activeSection === 'board' ? 'hand-drawn-btn-active' : ''}`}
        >
          <MessageSquare size={14} /> 公告板
        </button>
        <button
          onClick={() => setActiveSection('bottle')}
          className={`hand-drawn-btn px-5 py-2 text-sm font-bold tracking-wider flex items-center gap-2 ${activeSection === 'bottle' ? 'hand-drawn-btn-active' : ''}`}
        >
          <Waves size={14} /> 漂流瓶
        </button>
        <button
          onClick={() => setActiveSection('showcase')}
          className={`hand-drawn-btn px-5 py-2 text-sm font-bold tracking-wider flex items-center gap-2 ${activeSection === 'showcase' ? 'hand-drawn-btn-active' : ''}`}
        >
          <Globe size={14} /> 岛屿橱窗
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeSection === 'board' && <BulletinBoard />}
        {activeSection === 'bottle' && <BottleSection />}
        {activeSection === 'showcase' && <IslandShowcase />}
      </div>
    </div>
  );
};

/* ========== Bulletin Board ========== */
const BulletinBoard: React.FC = () => {
  const [notes] = useState([
    { id: '1', title: '欢迎来到漂流广场', content: '这里是岛民们交流的公共空间。你可以投递漂流瓶、浏览其他岛民的岛屿，或者在这里留下你的足迹。', author: '系统', pinned: true },
    { id: '2', title: '如何串门', content: '在岛屿橱窗中点击任意公开岛屿，即可前往参观。别忘了在访客簿上留言！', author: '系统', pinned: true },
    { id: '3', title: '漂流瓶指南', content: '将你的心情装入漂流瓶投入大海，等待有缘人捡到。你也可以在海边捡到其他岛民的瓶子。', author: '系统', pinned: false },
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="hand-drawn-panel p-6 bg-gradient-to-br from-amber-50 to-orange-50" style={{ borderWidth: '2px' }}>
        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">Bulletin Board</p>
        <div className="flex flex-col gap-3">
          {notes.map(note => (
            <div
              key={note.id}
              className={`p-4 border-2 border-slate-800 shadow-[3px_3px_0_#2d3436] ${note.pinned ? 'bg-amber-100' : 'bg-white'}`}
              style={{ transform: note.pinned ? 'rotate(-1deg)' : 'rotate(0.5deg)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm tracking-wide mb-1">{note.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{note.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{note.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ========== Message in Bottle ========== */
const BottleSection: React.FC = () => {
  const [bottleContent, setBottleContent] = useState('');
  const [bottleMood, setBottleMood] = useState('happy');
  const [foundBottle, setFoundBottle] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [sentBottles, setSentBottles] = useState<any[]>([]);
  const [isFishing, setIsFishing] = useState(false);
  const [view, setView] = useState<'main' | 'found' | 'sent'>('main');

  const moods = [
    { id: 'happy', label: '开心', color: 'text-amber-500' },
    { id: 'thinking', label: '沉思', color: 'text-blue-500' },
    { id: 'melancholy', label: '忧郁', color: 'text-violet-500' },
    { id: 'hopeful', label: '期待', color: 'text-emerald-500' },
  ];

  const handleThrowBottle = async () => {
    if (!bottleContent.trim()) return;
    try {
      await api.throwBottle(bottleContent.trim(), bottleMood);
      setBottleContent('');
    } catch (err) {
      console.error('Failed to throw bottle:', err);
    }
  };

  const handleFishBottle = async () => {
    setIsFishing(true);
    setFoundBottle(null);
    try {
      const res = await api.fishBottle();
      setTimeout(() => {
        setFoundBottle(res.bottle);
        setIsFishing(false);
        if (res.bottle) setView('found');
      }, 1500);
    } catch (err) {
      console.error('Failed to fish bottle:', err);
      setIsFishing(false);
    }
  };

  const handleReplyBottle = async () => {
    if (!foundBottle || !replyText.trim()) return;
    try {
      await api.replyBottle(foundBottle.id, replyText.trim());
      setReplyText('');
      setFoundBottle(null);
      setView('main');
    } catch (err) {
      console.error('Failed to reply bottle:', err);
    }
  };

  const loadSentBottles = async () => {
    try {
      const res = await api.getSentBottles();
      setSentBottles(res.bottles);
      setView('sent');
    } catch (err) {
      console.error('Failed to load sent bottles:', err);
    }
  };

  if (view === 'found' && foundBottle) {
    return (
      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4">
        <button onClick={() => { setView('main'); setFoundBottle(null); }} className="hand-drawn-btn p-2 self-start">
          <ArrowLeft size={16} />
        </button>

        <div className="hand-drawn-panel p-6 bg-gradient-to-br from-cyan-50 to-blue-50" style={{ borderWidth: '2px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-800 shrink-0 flex items-center justify-center bg-gradient-to-br from-cyan-100 to-cyan-50">
              {foundBottle.sender_avatar ? (
                <img src={foundBottle.sender_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-cyan-400" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{foundBottle.sender_name}</p>
              <p className="text-[10px] text-slate-400">
                {moods.find(m => m.id === foundBottle.mood)?.label || '开心'} · {new Date(foundBottle.created_at * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{foundBottle.content}</p>
        </div>

        <div className="flex flex-col gap-3">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="写封回信..."
            rows={3}
            maxLength={200}
            className="hand-drawn-panel px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none"
            style={{ borderWidth: '2px' }}
          />
          <button onClick={handleReplyBottle} disabled={!replyText.trim()} className="hand-drawn-btn px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-40">
            <Send size={16} /> 回信
          </button>
        </div>
      </div>
    );
  }

  if (view === 'sent') {
    return (
      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4">
        <button onClick={() => setView('main')} className="hand-drawn-btn p-2 self-start">
          <ArrowLeft size={16} />
        </button>

        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">我投出的瓶子</p>

        {sentBottles.length === 0 ? (
          <div className="text-center py-12">
            <Waves size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">还没有投出过瓶子</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sentBottles.map(bottle => (
              <div key={bottle.id} className="hand-drawn-panel p-4" style={{ borderWidth: '2px' }}>
                <p className="text-sm text-slate-700 leading-relaxed mb-2">{bottle.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(bottle.created_at * 1000).toLocaleDateString()}
                  </span>
                  {bottle.finder_name ? (
                    <span className="text-[10px] text-emerald-600 font-bold">已被 {bottle.finder_name} 捡到</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">还在漂流中...</span>
                  )}
                </div>
                {bottle.reply && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-[10px] text-emerald-600 font-bold mb-1">回信</p>
                    <p className="text-xs text-slate-600">{bottle.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Throw Bottle */}
      <div className="hand-drawn-panel p-6 bg-gradient-to-br from-cyan-50 to-sky-50" style={{ borderWidth: '2px' }}>
        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">投递漂流瓶</p>
        <div className="flex gap-2 mb-3">
          {moods.map(m => (
            <button
              key={m.id}
              onClick={() => setBottleMood(m.id)}
              className={`hand-drawn-btn px-3 py-1 text-xs ${bottleMood === m.id ? 'hand-drawn-btn-active' : ''} ${m.color}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <textarea
          value={bottleContent}
          onChange={e => setBottleContent(e.target.value)}
          placeholder="把心情装进瓶子..."
          rows={3}
          maxLength={200}
          className="w-full hand-drawn-panel px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none bg-white/60"
          style={{ borderWidth: '2px' }}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-[10px] text-slate-400">{bottleContent.length} / 200</p>
          <button onClick={handleThrowBottle} disabled={!bottleContent.trim()} className="hand-drawn-btn px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-40">
            <Waves size={14} /> 投入大海
          </button>
        </div>
      </div>

      {/* Fish Bottle */}
      <div className="hand-drawn-panel p-6 bg-gradient-to-br from-blue-50 to-indigo-50" style={{ borderWidth: '2px' }}>
        <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-3">海边拾瓶</p>
        <p className="text-sm text-slate-500 mb-4">在海边漫步，看看能不能捡到其他岛民的漂流瓶</p>
        <button
          onClick={handleFishBottle}
          disabled={isFishing}
          className="hand-drawn-btn px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-40"
        >
          {isFishing ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              捡拾中...
            </>
          ) : (
            <>
              <Waves size={16} /> 去海边看看
            </>
          )}
        </button>
      </div>

      {/* My Bottles */}
      <button onClick={loadSentBottles} className="hand-drawn-btn hand-drawn-ghost px-5 py-3 text-sm flex items-center justify-between">
        <span className="flex items-center gap-2 text-slate-600">
          <ChevronRight size={14} /> 我投出的瓶子
        </span>
      </button>
    </div>
  );
};

/* ========== Island Showcase ========== */
const IslandShowcase: React.FC = () => {
  const authUser = useGameStore(state => state.authUser);
  const [islands, setIslands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIslands();
  }, []);

  const loadIslands = async () => {
    try {
      const res = await api.getIslands();
      setIslands(res.islands);
    } catch (err) {
      console.error('Failed to load islands:', err);
    } finally {
      setLoading(false);
    }
  };

  const otherIslands = islands.filter(i => i.owner_id !== authUser?.id && i.is_public);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">探索公开岛屿</p>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">探索中...</p>
        </div>
      ) : otherIslands.length === 0 ? (
        <div className="text-center py-16">
          <Globe size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold tracking-widest">暂无公开岛屿</p>
          <p className="text-slate-300 text-sm mt-2">等待更多岛民部署他们的岛屿</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {otherIslands.map(island => (
            <div
              key={island.id}
              className="hand-drawn-panel p-5 cursor-pointer hover:bg-amber-50/50 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
              style={{ borderWidth: '2px' }}
              onClick={() => emitIslandVisit(island.id)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-800 shrink-0 flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50">
                  {island.owner_avatar ? (
                    <img src={island.owner_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Globe size={16} className="text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm tracking-wide truncate">{island.name}</p>
                  <p className="text-[10px] text-slate-400">by {island.owner_name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-mono">
                  {new Date(island.updated_at * 1000).toLocaleDateString()}
                </p>
                <span className="text-[10px] text-emerald-600 font-bold group-hover:text-emerald-700 flex items-center gap-1">
                  前往 <ChevronRight size={10} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
