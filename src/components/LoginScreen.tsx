import React, { useState } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { AudioSystem } from '../lib/audio';
import { User, Lock, ArrowRight, Globe, ArrowLeft } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const setScreen = useGameStore(state => state.setScreen);
  const setAuthUser = useGameStore(state => state.setAuthUser);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    AudioSystem.playConfirm();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'register'
        ? await api.register(username, password)
        : await api.login(username, password);

      api.setToken(result.token);
      connectSocket(result.token);
      setAuthUser(result.user);
      setScreen('SAVE_SELECT');
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto cinematic-vignette">
      <div className="w-full max-w-md px-8 animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>

        {/* Back Button */}
        <button
          onClick={() => { AudioSystem.playClose(); setScreen('TITLE'); }}
          className="group flex items-center gap-3 text-slate-600 hover:text-slate-900 mb-8 hand-drawn-btn hand-drawn-ghost px-4 py-2"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold tracking-widest uppercase">返回</span>
        </button>

        {/* Main Panel */}
        <div className="hand-drawn-panel p-10">
          {/* Decorative Tape */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-amber-200/60 rotate-2 border-2 border-slate-800 shadow-sm"></div>

          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-2 border-slate-800 mb-4">
              <Globe size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-wider hand-drawn-title">漫游小岛</h1>
            <p className="text-xs font-bold text-emerald-600 tracking-[0.3em] mt-2 uppercase">Online · Multiplayer</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex mb-8 border-2 border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => { AudioSystem.playTap(); setMode('login'); setError(''); }}
              className={`flex-1 py-3 text-sm font-bold tracking-widest transition-all ${mode === 'login' ? 'hand-drawn-btn-active' : 'bg-transparent text-slate-500 hover:bg-amber-50'}`}
            >
              登录
            </button>
            <button
              onClick={() => { AudioSystem.playTap(); setMode('register'); setError(''); }}
              className={`flex-1 py-3 text-sm font-bold tracking-widest transition-all ${mode === 'register' ? 'hand-drawn-btn-active' : 'bg-transparent text-slate-500 hover:bg-amber-50'}`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Username */}
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名"
                className="w-full pl-11 pr-4 py-3 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm font-bold tracking-wide"
                style={{ borderWidth: '2px' }}
                required
                minLength={2}
                maxLength={20}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full pl-11 pr-4 py-3 hand-drawn-panel text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm font-bold tracking-wide"
                style={{ borderWidth: '2px' }}
                required
                minLength={4}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="stamp text-center text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="hand-drawn-btn w-full py-3.5 text-lg font-bold tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  {mode === 'login' ? '进入岛屿' : '创建账号'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Hint */}
          <p className="text-center text-xs text-slate-400 mt-6 tracking-wider">
            {mode === 'login' ? '还没有账号？点击上方注册' : '已有账号？点击上方登录'}
          </p>
        </div>

        {/* Version */}
        <p className="text-center text-[10px] text-white/20 mt-8 tracking-[0.3em] font-mono">
          WANDER ISLAND v2.0.0 · MULTIPLAYER
        </p>
      </div>
    </div>
  );
};
