import React from 'react';
import { useGameStore, ToastItem } from '../store';
import { Wifi, WifiOff, UserPlus, Sparkles, X } from 'lucide-react';

const iconMap: Record<ToastItem['type'], { Icon: React.FC<any>; color: string }> = {
  online: { Icon: Wifi, color: 'text-emerald-500' },
  offline: { Icon: WifiOff, color: 'text-slate-400' },
  friend_request: { Icon: UserPlus, color: 'text-amber-500' },
  info: { Icon: Sparkles, color: 'text-cyan-500' },
};

export const Toast: React.FC = () => {
  const toasts = useGameStore(state => state.toasts);
  const removeToast = useGameStore(state => state.removeToast);

  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const { Icon, color } = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className="hand-drawn-panel pointer-events-auto flex items-center gap-3 px-4 py-3 animate-in slide-in-from-right-4 fade-in duration-300"
            style={{ borderWidth: '2px' }}
          >
            <Icon size={18} className={color} />
            <span className="text-sm font-bold text-slate-800 tracking-wide">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="hand-drawn-btn p-1 ml-1"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
