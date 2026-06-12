import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { X, Mail, Send, Trash2, ArrowLeft, Pen, User } from 'lucide-react';

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

  useEffect(() => {
    loadMails();
    loadFriends();
  }, []);

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
<div className={embedded ? "flex-1 overflow-y-auto custom-scrollbar" : "flex-1 overflow-y-auto p-8 custom-scrollbar"}>
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
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMail.content}</p>
            </div>

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
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">加载中...</p>
              </div>
            ) : mails.length === 0 ? (
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
