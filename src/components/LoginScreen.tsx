import React, { useState } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { User, Lock, ArrowRight, Sparkles, Globe } from 'lucide-react';

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

        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 mb-6">
            <Globe size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-4xl font-light tracking-[0.3em] text-white uppercase mb-2">Wander Island</h1>
          <p className="text-sm tracking-[0.2em] text-white/40">生态沙盒模拟系统</p>
        </div>

        {/* Form Card */}
        <div className="hand-drawn-panel p-8">
          {/* Mode Toggle */}
          <div className="flex mb-8 bg-slate-200/50 rounded-xl p-1">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold tracking-widest rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold tracking-widest rounded-lg transition-all ${mode === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Username */}
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名"
                className="w-full pl-12 pr-4 py-3.5 bg-white/60 border-2 border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors font-medium tracking-wide"
                required
                minLength={2}
                maxLength={20}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full pl-12 pr-4 py-3.5 bg-white/60 border-2 border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors font-medium tracking-wide"
                required
                minLength={4}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-red-500 text-sm font-bold tracking-wide bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold tracking-[0.3em] rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <Sparkles size={18} className="animate-spin" />
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
          WANDER ISLAND v2.0 · MULTIPLAYER
        </p>
      </div>
    </div>
  );
};
