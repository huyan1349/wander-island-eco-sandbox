import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { Camera, X, Settings2, Image as ImageIcon, Type, EyeOff, Eye } from 'lucide-react';
import { AudioSystem } from '../../lib/audio';
import { capturePhoto } from '../../lib/photoExport';

export const PhotoModeOverlay: React.FC = () => {
  const isPhotoMode = useGameStore(s => s.isPhotoMode);
  const setPhotoMode = useGameStore(s => s.setPhotoMode);
  const photoSettings = useGameStore(s => s.photoSettings);
  const setPhotoSettings = useGameStore(s => s.setPhotoSettings);

  const [activeTab, setActiveTab] = useState<'lens' | 'filter' | 'watermark'>('lens');
  const [isCapturing, setIsCapturing] = useState(false);
  const [hideUI, setHideUI] = useState(false);

  if (!isPhotoMode) return null;

  const handleCapture = async () => {
    AudioSystem.playTap();
    setIsCapturing(true);
    // 闪光灯特效
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-white z-[9999] pointer-events-none transition-opacity duration-500 opacity-100';
    document.body.appendChild(flash);
    
    // Hide UI elements during capture
    const uiContainer = document.getElementById('photo-mode-ui');
    if (uiContainer) uiContainer.style.opacity = '0';

    // Wait a frame for UI to hide
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      await capturePhoto(photoSettings);
      useGameStore.getState().addToast('照片已保存到本地', 'info');
    } catch (e) {
      console.error(e);
      useGameStore.getState().addToast('照片保存失败', 'info');
    }

    // Restore UI and flash fade out
    if (uiContainer) uiContainer.style.opacity = '1';
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 500);
    });
    setIsCapturing(false);
  };



  return (
    <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* 影院上下黑边 (Cinematic Bars) */}
      <div className={`absolute top-0 left-0 right-0 h-24 bg-slate-950 transition-transform duration-500 ${isCapturing ? '-translate-y-full' : 'translate-y-0'}`} />
      <div className={`absolute bottom-0 left-0 right-0 h-24 bg-slate-950 transition-transform duration-500 ${isCapturing ? 'translate-y-full' : 'translate-y-0'}`} />

      {/* 取景器十字准星 */}
      <div className={`absolute inset-0 flex items-center justify-center opacity-30 transition-opacity duration-300 ${isCapturing ? 'opacity-0' : ''}`}>
        <div className="w-[60vh] h-[60vh] border-2 border-white/20 rounded-sm relative">
          <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-4 h-px bg-white/50" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 w-4 h-px bg-white/50" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-px h-4 bg-white/50" />
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-px h-4 bg-white/50" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-1 h-1 bg-white/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* 水印常驻右下角 */}
      {photoSettings.watermark && (
        <div
          className={`absolute bottom-16 right-12 z-[150] flex items-center gap-3.5 pointer-events-none select-none transition-opacity duration-300 ${hideUI && !isCapturing ? 'opacity-0' : 'opacity-100'}`}
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))' }}
        >
          {/* 右对齐字标块 */}
          <div className="flex flex-col items-end leading-none">
            <span className="text-white/95 text-[15px] font-semibold uppercase" style={{ fontFamily: '"Raleway","Nunito",sans-serif', letterSpacing: '0.42em', paddingRight: '0.42em' }}>
              Wander Island
            </span>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="h-px w-9 bg-white/45" />
              <span className="text-white/85 text-[11px] font-medium uppercase" style={{ fontFamily: '"Raleway","Nunito",sans-serif', letterSpacing: '0.28em' }}>
                {photoSettings.watermarkText}
              </span>
            </div>
          </div>
          {/* 圆形印章：双描边 + 浪纹 */}
          <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0" fill="none">
            <circle cx="23" cy="23" r="21.4" stroke="white" strokeOpacity="0.85" strokeWidth="1.4" />
            <circle cx="23" cy="23" r="16.6" stroke="white" strokeOpacity="0.35" strokeWidth="0.8" />
            <path d="M11.5 25.6c2.45 0 2.45-2.7 4.9-2.7s2.45 2.7 4.9 2.7 2.45-2.7 4.9-2.7 2.45 2.7 4.9 2.7" stroke="white" strokeOpacity="0.92" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M13.5 20c1.95 0 1.95-2.1 3.9-2.1s1.95 2.1 3.9 2.1 1.95-2.1 3.9-2.1 1.95 2.1 3.9 2.1" stroke="white" strokeOpacity="0.5" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* UI 控制面板 */}
      <div id="photo-mode-ui" className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${hideUI ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* 顶部退出按钮 */}
        <div className="absolute top-6 right-8 pointer-events-auto flex items-center gap-4">
           <span className="font-mono text-xs tracking-[0.2em] text-white/50 uppercase drop-shadow-md">Pro Camera Mode</span>
           
           <button onClick={(e) => { e.stopPropagation(); AudioSystem.playTap(); setHideUI(true); }} className="w-10 h-10 rounded-full bg-black/40 border border-white/20 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white transition-colors" title="隐藏参数面板">
              <EyeOff size={18} />
           </button>
           
           <button onClick={(e) => { e.stopPropagation(); AudioSystem.playClick(); setPhotoMode(false); }} className="w-10 h-10 rounded-full bg-black/40 border border-white/20 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white transition-colors">
              <X size={20} />
           </button>
        </div>

        {/* 左下角参数区 */}
        <div className="absolute bottom-32 left-8 w-80 hand-drawn-panel p-5 pointer-events-auto flex flex-col gap-4 text-slate-800">
          <div className="flex gap-2 mb-2 pb-4 border-b border-slate-200">
            <button onClick={() => setActiveTab('lens')} className={`hand-drawn-btn px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold ${activeTab === 'lens' ? 'hand-drawn-btn-active' : ''}`}>
              <Settings2 size={14} /> 镜头
            </button>
            <button onClick={() => setActiveTab('filter')} className={`hand-drawn-btn px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold ${activeTab === 'filter' ? 'hand-drawn-btn-active' : ''}`}>
              <ImageIcon size={14} /> 滤镜
            </button>
            <button onClick={() => setActiveTab('watermark')} className={`hand-drawn-btn px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold ${activeTab === 'watermark' ? 'hand-drawn-btn-active' : ''}`}>
              <Type size={14} /> 水印
            </button>
          </div>

          {activeTab === 'lens' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>对焦距离 (Focus Distance)</span>
                  <span className="font-mono bg-white/50 px-1 rounded">{photoSettings.focusDistance.toFixed(3)}</span>
                </div>
                <input type="range" min="0" max="0.5" step="0.001" value={photoSettings.focusDistance} onChange={e => { setPhotoSettings({ focusDistance: parseFloat(e.target.value), focusTarget: null }); }} className="w-full h-1 bg-slate-200 rounded-full appearance-none outline-none accent-amber-600 cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>镜头焦距 (Focal Length)</span>
                  <span className="font-mono bg-white/50 px-1 rounded">{photoSettings.focalLength.toFixed(3)}</span>
                </div>
                <input type="range" min="0.01" max="0.2" step="0.001" value={photoSettings.focalLength} onChange={e => setPhotoSettings({ focalLength: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-200 rounded-full appearance-none outline-none accent-amber-600 cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>光圈模糊 (Bokeh Scale)</span>
                  <span className="font-mono bg-white/50 px-1 rounded">{photoSettings.bokehScale.toFixed(1)}</span>
                </div>
                <input type="range" min="0" max="10" step="0.1" value={photoSettings.bokehScale} onChange={e => setPhotoSettings({ bokehScale: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-200 rounded-full appearance-none outline-none accent-amber-600 cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>清晰范围 (Focus Range)</span>
                  <span className="font-mono bg-white/50 px-1 rounded">{(photoSettings.focusRange ?? 14).toFixed(0)}</span>
                </div>
                <input type="range" min="2" max="60" step="1" value={photoSettings.focusRange ?? 14} onChange={e => setPhotoSettings({ focusRange: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-200 rounded-full appearance-none outline-none accent-amber-600 cursor-pointer" />
              </div>

              <div className="text-[10px] text-amber-700 font-bold bg-amber-50 p-2 border border-amber-200 rounded mt-2">
                提示：直接点击屏幕中的物体即可实现自动对焦。
              </div>
            </div>
          )}

          {activeTab === 'filter' && (
            <div className="flex flex-wrap gap-2">
              {([
                ['default', '标准 (Standard)'],
                ['cinematic', '电影 (Cinematic)'],
                ['vintage', '复古 (Vintage)'],
                ['cyberpunk', '霓虹 (Neon)'],
                ['blackwhite', '黑白 (B&W)']
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPhotoSettings({ filter: val })}
                  className={`hand-drawn-btn px-3 py-1.5 text-xs font-bold ${photoSettings.filter === val ? 'hand-drawn-btn-active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'watermark' && (
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${photoSettings.watermark ? 'border-amber-600 bg-amber-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
                   {photoSettings.watermark && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
                <span className="text-sm font-bold">启用水印</span>
              </label>
              
              <div className={`transition-opacity ${photoSettings.watermark ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <p className="text-xs font-bold text-slate-500 mb-2">水印样式 (Style)</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {([
                    ['seal', '印章 (Seal)'],
                    ['minimal', '极简 (Minimal)'],
                    ['polaroid', '拍立得 (Polaroid)'],
                    ['eco', '生态 (Eco)'],
                    ['cinema', '电影宽幅 (Cinema)']
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setPhotoSettings({ watermarkStyle: val })}
                      className={`hand-drawn-btn px-3 py-1.5 text-xs font-bold ${photoSettings.watermarkStyle === val ? 'hand-drawn-btn-active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="text-xs font-bold text-slate-500 mb-2">水印文字 (Text)</p>
                <input 
                  type="text" 
                  value={photoSettings.watermarkText}
                  onChange={e => setPhotoSettings({ watermarkText: e.target.value })}
                  className="w-full bg-white/50 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* 右下角快门按钮 */}
        <div className="absolute bottom-32 right-12 pointer-events-auto">
           <button 
             onClick={(e) => { e.stopPropagation(); handleCapture(); }}
             className="relative group w-20 h-20 rounded-full bg-black/30 backdrop-blur border-2 border-white/30 flex items-center justify-center hover:bg-black/50 hover:scale-105 active:scale-95 transition-all"
           >
             <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] transition-all">
                <Camera size={28} className="text-slate-900" />
             </div>
           </button>
        </div>

      </div>
      
      {/* 隐藏状态下的恢复按钮 */}
      <div className={`absolute top-6 right-8 pointer-events-none transition-opacity duration-300 ${hideUI && !isCapturing ? 'opacity-100' : 'opacity-0'}`}>
         <button onClick={(e) => { e.stopPropagation(); AudioSystem.playTap(); setHideUI(false); }} className={`${hideUI ? 'pointer-events-auto' : 'pointer-events-none'} w-10 h-10 rounded-full bg-black/40 border border-white/20 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white transition-colors`} title="显示参数面板">
            <Eye size={18} />
         </button>
      </div>

    </div>
  );
};
