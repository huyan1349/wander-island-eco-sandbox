import React from 'react';
import { motion } from 'motion/react';
import { X, Heart, Code2, Sparkles, Coffee } from 'lucide-react';
import { AudioSystem } from '../lib/audio';

interface CreditsModalProps {
  onClose: () => void;
  isTouch: boolean;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 25,
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 }
  }
};

export function CreditsModal({ onClose, isTouch }: CreditsModalProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4" onClick={() => { AudioSystem.playClose(); onClose(); }}>
      <motion.div 
        className={`hand-drawn-panel relative shadow-[0_20px_50px_rgba(15,23,42,0.3)] bg-[#fbf7ec] w-[600px] max-w-[95vw] h-[85vh] max-h-[850px] flex flex-col overflow-hidden rounded-[32px] border-[3px] border-slate-800 p-0 ${isTouch ? 'h-[90vh]' : ''}`}
        onClick={(e) => e.stopPropagation()}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        {/* Header */}
        <motion.div variants={itemVariants} className="relative pt-10 pb-6 px-10 flex flex-col items-center border-b-[3px] border-slate-800 bg-[#f2ebd9] z-10 shrink-0">
          <motion.button 
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { AudioSystem.playClose(); onClose(); }} 
            className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white text-slate-800 border-2 border-slate-800 shadow-[3px_3px_0_rgba(15,23,42,1)] hover:shadow-[1px_1px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <X size={20} strokeWidth={3} />
          </motion.button>
          
          <motion.h2 
            initial={{ rotate: -2 }}
            whileHover={{ rotate: 1, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="text-4xl sm:text-5xl hand-drawn-title tracking-wider text-slate-800 cursor-default"
          >
            WANDER ISLAND
          </motion.h2>
          <p className="text-sm font-black tracking-widest text-emerald-600 mt-2 uppercase">Credits & Appreciations</p>
        </motion.div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 relative z-10 space-y-8">
          
          {/* Main Dev Card */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4, rotate: -1, scale: 1.01 }}
            className="bg-white border-[3px] border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_rgba(15,23,42,1)] flex flex-col gap-6 relative overflow-hidden transition-colors hover:bg-[#faf9f5]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-bl-full -z-0 opacity-50" />
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-slate-400 relative z-10">
              <Code2 size={14} /> Solo Developer / Game Design
            </div>
            
            <div className="flex items-end justify-between gap-4 border-b-[3px] border-slate-100 pb-6 relative z-10">
              <div className="flex flex-col">
                <span className="text-4xl font-black tracking-tight text-slate-900 leading-none">huyan</span>
                <span className="text-xs font-bold tracking-[0.2em] text-amber-600 mt-2 uppercase">Independent Creator</span>
              </div>
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="w-16 h-16 rounded-full border-[3px] border-slate-800 bg-white overflow-hidden shrink-0 shadow-[2px_2px_0_rgba(15,23,42,1)]"
              >
                <img src="/title/huyan-avatar.png" alt="huyan avatar" className="w-full h-full object-cover" />
              </motion.div>
            </div>
            
            <div className="flex flex-col gap-3 relative z-10">
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Links</span>
              <motion.a 
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                href="https://github.com/huyan1349" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 text-sm font-black text-slate-700 bg-[#fbf7ec] px-4 py-3 rounded-xl border-[2px] border-slate-800 shadow-[2px_2px_0_rgba(15,23,42,1)] hover:shadow-[1px_1px_0_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                GitHub: huyan1349
              </motion.a>
              <motion.a 
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                href="mailto:huyanxius@gmail.com" 
                className="flex items-center gap-2 text-sm font-black text-slate-700 bg-[#fbf7ec] px-4 py-3 rounded-xl border-[2px] border-slate-800 shadow-[2px_2px_0_rgba(15,23,42,1)] hover:shadow-[1px_1px_0_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Contact: huyanxius@gmail.com
              </motion.a>
            </div>
          </motion.div>
          
          {/* Special Thanks & Engine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -4, rotate: 1, scale: 1.02 }}
              className="bg-[#f0f9ff] border-[3px] border-slate-800 rounded-3xl p-6 shadow-[6px_6px_0_rgba(15,23,42,1)] flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-blue-600">
                <Heart size={14} /> Special Thanks
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 block mb-3">xyh</span>
                <div className="flex flex-col gap-2 border-t-2 border-blue-200 pt-3 text-sm font-bold text-slate-700">
                  <motion.p whileHover={{ x: 5 }} className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"/> Google AI Studio</motion.p>
                  <motion.p whileHover={{ x: 5 }} className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"/> Antigravity</motion.p>
                  <motion.p whileHover={{ x: 5 }} className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"/> Claude Code</motion.p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -4, rotate: -1, scale: 1.02 }}
              className="bg-[#ecfdf5] border-[3px] border-slate-800 rounded-3xl p-6 shadow-[6px_6px_0_rgba(15,23,42,1)] flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-emerald-600">
                <Coffee size={14} /> Publisher
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xl font-black text-slate-900 mb-2">启元开物</span>
                <a href="https://qiyuankaiwu.com" target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-600 hover:text-emerald-600 underline decoration-emerald-300 underline-offset-4 decoration-2">
                  qiyuankaiwu.com
                </a>
              </div>
            </motion.div>
          </div>
          
          {/* Footer Motto */}
          <motion.div variants={itemVariants} className="pt-8 pb-4 text-center">
            <motion.div 
              whileHover={{ scale: 1.08, rotate: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="inline-block relative cursor-default"
            >
              <span className="text-lg font-black text-slate-700">在孤岛中寻找生态的呼吸</span>
              <motion.div 
                animate={{ scaleX: [0.9, 1.1, 0.9] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-2 left-0 w-full h-2 bg-emerald-200/60 -rotate-1 -z-10 rounded-full" 
              />
            </motion.div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
