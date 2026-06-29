import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { syncOnLogin } from '../lib/cloudSync';
import { AudioSystem } from '../lib/audio';
import { User, Lock, ArrowRight, Globe, ArrowLeft, Check, X } from 'lucide-react';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

type NameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'short';

export const LoginScreen: React.FC = () => {
  const setScreen = useGameStore(state => state.setScreen);
  const setAuthUser = useGameStore(state => state.setAuthUser);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameStatus, setNameStatus] = useState<NameStatus>('idle');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacyWarning, setPrivacyWarning] = useState(false);
  const [hasShownPrivacyOnRegister, setHasShownPrivacyOnRegister] = useState(false);

  // 切换到注册模式时自动弹出隐私政策
  useEffect(() => {
    if (mode === 'register' && !hasShownPrivacyOnRegister) {
      setShowPrivacy(true);
      setHasShownPrivacyOnRegister(true);
    }
  }, [mode, hasShownPrivacyOnRegister]);

  // 注册模式下实时校验用户名是否可用（防抖）
  useEffect(() => {
    if (mode !== 'register') { setNameStatus('idle'); return; }
    const u = username.trim();
    if (u.length === 0) { setNameStatus('idle'); return; }
    if (u.length < 2) { setNameStatus('short'); return; }
    setNameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await api.checkUsername(u);
        // 仅当输入未变时才应用结果
        setNameStatus(res.available ? 'available' : 'taken');
      } catch { setNameStatus('idle'); }
    }, 450);
    return () => clearTimeout(t);
  }, [username, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    AudioSystem.playConfirm();
    setError('');

    // 注册时未同意隐私政策 → 提醒
    if (mode === 'register' && !privacyAgreed) {
      setPrivacyWarning(true);
      AudioSystem.playClose();
      return;
    }

    setLoading(true);

    try {
      const result = mode === 'register'
        ? await api.register(username, password)
        : await api.login(username, password);

      api.setToken(result.token);
      connectSocket(result.token);
      setAuthUser(result.user);
      // 登录后从云端同步岛屿与账号进度（新设备也能拿回数据）
      if (mode === 'login') {
        await syncOnLogin();
      }
      // 新注册用户 → 引导设置个人信息 + 居民证；老用户直接进入存档
      setScreen(mode === 'register' ? 'ONBOARD' : 'SAVE_SELECT');
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto bg-transparent overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >

      <motion.div 
        className="w-full max-w-md px-8 relative z-10"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Back Button */}
        <motion.button
          whileHover={{ scale: 1.05, x: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { AudioSystem.playClose(); setScreen('TITLE'); }}
          className="group flex items-center gap-3 text-slate-500 hover:text-slate-800 mb-8 px-4 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-black tracking-widest uppercase">返回</span>
        </motion.button>

        {/* Main Panel */}
        <motion.div 
          className="bg-white border-[3px] border-slate-800 p-10 rounded-3xl shadow-[8px_8px_0_rgba(15,23,42,1)] relative overflow-hidden transition-transform duration-300 hover:translate-y-[-2px] hover:shadow-[10px_10px_0_rgba(15,23,42,1)]"
          layout
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >

          {/* Logo */}
          <div className="text-center mb-10 relative z-10">
            <motion.div 
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 border-[3px] border-slate-800 mb-4 shadow-[4px_4px_0_rgba(15,23,42,1)]"
            >
              <Globe size={32} className="text-emerald-600" strokeWidth={2.5} />
            </motion.div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">漫游小岛</h1>
            <p className="text-xs font-bold text-emerald-600 tracking-[0.3em] mt-2 uppercase">Online · Multiplayer</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex mb-8 bg-[#f2ebd9] rounded-2xl overflow-hidden p-1 border-[3px] border-slate-800 relative z-10 shadow-inner">
            <motion.button
              whileHover={{ scale: mode === 'login' ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { AudioSystem.playTap(); setMode('login'); setError(''); }}
              className={`flex-1 py-3 text-sm font-black tracking-widest rounded-xl transition-all ${mode === 'login' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              登 录
            </motion.button>
            <motion.button
              whileHover={{ scale: mode === 'register' ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { AudioSystem.playTap(); setMode('register'); setError(''); }}
              className={`flex-1 py-3 text-sm font-black tracking-widest rounded-xl transition-all ${mode === 'register' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              注 册
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
            {/* Username */}
            <div className="relative group">
              <User size={18} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-600 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, ''))}
                placeholder={mode === 'login' ? "你的名字 (Callsign)" : "起个名字 (2-12字符)"}
                className="w-full pl-12 pr-10 py-4 bg-[#fbf7ec] border-[3px] border-slate-800 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:translate-y-[2px] focus:translate-x-[2px] transition-all text-sm font-bold tracking-wide shadow-[4px_4px_0_rgba(15,23,42,1)] focus:shadow-none"
                required
                minLength={2}
                maxLength={12}
              />
              {mode === 'register' && nameStatus !== 'idle' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  {nameStatus === 'checking' && <span className="text-slate-400 text-xs animate-spin inline-block">⏳</span>}
                  {nameStatus === 'available' && <Check size={18} className="text-emerald-600" strokeWidth={3} />}
                  {(nameStatus === 'taken' || nameStatus === 'short') && <X size={18} className="text-red-500" strokeWidth={3} />}
                </span>
              )}
            </div>
            {mode === 'register' && (nameStatus === 'available' || nameStatus === 'taken' || nameStatus === 'short') && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`text-[11px] font-bold mt-[-8px] ml-2 ${nameStatus === 'available' ? 'text-emerald-600' : 'text-red-500'}`}
              >
                {nameStatus === 'available' ? '✓ 这个名字可用' : nameStatus === 'short' ? '名字至少 2 个字' : '✗ 这个名字已被占用'}
              </motion.p>
            )}

            {/* Password */}
            <div className="relative group">
              <Lock size={18} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-600 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码 (Passcode)"
                className="w-full pl-12 pr-4 py-4 bg-[#fbf7ec] border-[3px] border-slate-800 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:translate-y-[2px] focus:translate-x-[2px] transition-all text-sm font-bold tracking-wide shadow-[4px_4px_0_rgba(15,23,42,1)] focus:shadow-none"
                required
                minLength={4}
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-700 text-sm font-bold text-center bg-red-100 border-[3px] border-slate-800 p-3 rounded-xl shadow-[4px_4px_0_rgba(15,23,42,1)]"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Privacy Agreement */}
            {mode === 'register' && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-md border-[2px] flex items-center justify-center transition-colors ${privacyAgreed ? 'bg-emerald-500 border-slate-800 shadow-[2px_2px_0_rgba(15,23,42,1)]' : 'bg-white border-slate-800 shadow-[2px_2px_0_rgba(15,23,42,1)] group-hover:bg-slate-100'}`}>
                    {privacyAgreed && <Check size={14} className="text-white" strokeWidth={4} />}
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => { setPrivacyAgreed(e.target.checked); setPrivacyWarning(false); AudioSystem.playToggle(); }}
                    className="hidden"
                  />
                  <span className="text-xs text-slate-600 font-bold tracking-wider">
                    我已阅读并同意
                    <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); AudioSystem.playClick(); }} className="text-emerald-600 hover:text-emerald-500 underline underline-offset-4 decoration-emerald-300 hover:decoration-emerald-500 transition-colors mx-1">
                      《隐私政策》
                    </button>
                  </span>
                </label>
                <AnimatePresence>
                  {privacyWarning && !privacyAgreed && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] text-red-500 font-bold ml-8"
                    >
                      * 请先阅读并同意隐私政策
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading || (mode === 'register' && nameStatus !== 'available')}
              whileHover={{ scale: 1.02, y: -2, boxShadow: '6px 6px 0 rgba(15,23,42,1)' }}
              whileTap={{ scale: 0.98, y: 0, boxShadow: '0px 0px 0 rgba(15,23,42,1)' }}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-lg tracking-widest mt-4 transition-all border-[3px] border-slate-800 shadow-[4px_4px_0_rgba(15,23,42,1)]
                ${loading || (mode === 'register' && nameStatus !== 'available')
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                  : 'bg-emerald-400 text-slate-900 hover:bg-emerald-300 hover:text-slate-900'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                  处理中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === 'login' ? '进入小岛' : '签发护照'}
                  <ArrowRight size={20} strokeWidth={3} />
                </span>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Version */}
        <p className="text-center text-[10px] text-white/30 mt-8 tracking-[0.3em] font-mono font-bold">
          WANDER ISLAND v2.0.0 · MULTIPLAYER
        </p>
      </motion.div>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
      {showPrivacy && (
        <motion.div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <PrivacyPolicyModal
            onClose={() => { setShowPrivacy(false); }}
            showAgree={mode === 'register'}
            onAgree={() => {
              setPrivacyAgreed(true);
              setPrivacyWarning(false);
              setShowPrivacy(false);
            }}
          />
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};
