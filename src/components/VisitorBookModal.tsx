import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { X, BookOpen, User, Star } from 'lucide-react';

export const VisitorBookModal: React.FC<{ onClose: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      const myIslands = await api.getMyIslands();
      if (myIslands.islands.length > 0) {
        const targetIslandId = myIslands.islands[0].id;
        const res = await api.getVisitors(targetIslandId);
        setVisitors(res.visitors);
        setTotalVisitors(res.totalVisitors);
      }
    } catch (err) {
      console.error('Failed to load visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={12}
        className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
      />
    ));
  };

  const renderCounter = (num: number) => {
    const digits = num.toString().padStart(4, '0').split('');
    return (
      <div className="flex items-center gap-1">
        {digits.map((d, i) => (
          <div
            key={i}
            className="w-8 h-10 bg-slate-800 text-amber-300 font-mono text-lg font-bold flex items-center justify-center rounded border border-slate-600 shadow-inner"
          >
            {d}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={embedded ? "flex flex-col h-full" : "hand-drawn-panel w-[700px] max-h-[85vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden"}>
      {/* Header */}
      {!embedded && (
      <div className="flex justify-between items-center border-b-2 border-slate-800 p-8 pb-6">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-violet-600" />
          <h2 className="text-3xl hand-drawn-title -rotate-1">访客簿</h2>
        </div>
        <button onClick={onClose} className="hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200">
          <X size={24} strokeWidth={3} className="text-slate-800" />
        </button>
      </div>
      )}

      <div className={embedded ? "flex-1 overflow-y-auto custom-scrollbar" : "flex-1 overflow-y-auto p-8 custom-scrollbar"}>
        {/* Visitor Counter */}
        <div className="hand-drawn-panel p-6 mb-6 bg-gradient-to-r from-violet-50 to-amber-50" style={{ borderWidth: '2px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">Total Visitors</p>
              <p className="text-sm text-slate-600">共有岛民造访过你的岛屿</p>
            </div>
            {renderCounter(totalVisitors)}
          </div>
        </div>

        {/* Visitor List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">翻阅中...</p>
          </div>
        ) : visitors.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold tracking-widest">还没有访客</p>
            <p className="text-slate-300 text-sm mt-2">部署岛屿后，其他岛民就能来串门了</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visitors.map(visitor => (
              <div
                key={visitor.id}
                className="hand-drawn-panel p-5 flex items-start gap-4"
                style={{ borderWidth: '2px' }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-800 shrink-0 bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center">
                  {visitor.visitor_avatar ? (
                    <img src={visitor.visitor_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-violet-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-sm tracking-wide">{visitor.visitor_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(visitor.created_at * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  {visitor.message && (
                    <p className="text-sm text-slate-600 leading-relaxed mb-1">{visitor.message}</p>
                  )}
                  {visitor.rating > 0 && (
                    <div className="flex items-center gap-0.5">{renderStars(visitor.rating)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
