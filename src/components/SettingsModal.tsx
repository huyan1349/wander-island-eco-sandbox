import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Volume2,
  Music2,
  Monitor,
  Check,
  Palette,
  Waves,
  Gauge,
  Compass,
  User,
  Shield,
  BookOpen,
  RotateCcw,
  Trash2,
  Sparkles,
  Settings,
  Gamepad2,
  MousePointer2,
  Eye,
  Speaker
} from 'lucide-react';
import { AudioSystem } from '../lib/audio';

type QualityPreset = 'performance' | 'balanced' | 'cinematic';

export interface SettingsModalProps {
  onClose: () => void;
  masterVol: number;
  bgmVol: number;
  handleMasterVol: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBgmVol: (e: React.ChangeEvent<HTMLInputElement>) => void;
  qualityPreset: QualityPreset;
  setQuality: (preset: QualityPreset) => void;
  titleTheme: string;
  setTitleTheme: (theme: string) => void;
  ambientDetail: boolean;
  toggleAmbientDetail: () => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
  skipIntro: boolean;
  toggleSkipIntro: () => void;
  authUser: any;
  islandName: string;
  playerLevel: number;
  playerXP: number;
  stats: any;
  resetTitlePreferences: () => void;
  isClearingData: boolean;
  clearAllData: () => Promise<void>;
  setActiveModal: (modal: string) => void;
}

export function SettingsModal(props: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'gameplay' | 'data'>('audio');

  // Simulated local settings for "Real Game" feel
  const [sfxVol, setSfxVol] = useState(0.8);
  const [uiVol, setUiVol] = useState(1.0);
  const [shadowQuality, setShadowQuality] = useState<'low' | 'med' | 'high'>('high');
  const [dofEnabled, setDofEnabled] = useState(true);
  const [mouseSensitivity, setMouseSensitivity] = useState(0.5);
  const [invertY, setInvertY] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5); // 5 mins

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => { AudioSystem.playClose(); props.onClose(); }}>
      <motion.div 
        className="hand-drawn-panel relative shadow-2xl bg-[#fbf7ec] w-[900px] max-w-[95vw] h-[80vh] max-h-[850px] flex overflow-hidden rounded-[32px] border-[3px] border-slate-800 p-0"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Close Button */}
        <motion.button 
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { AudioSystem.playClose(); props.onClose(); }} 
          className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white text-slate-800 border-2 border-slate-800 shadow-[2px_2px_0_rgba(15,23,42,1)] hover:shadow-[1px_1px_0_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          <X size={20} strokeWidth={3} />
        </motion.button>

        {/* Sidebar Navigation */}
        <div className="w-[240px] bg-[#f2ebd9] border-r-[3px] border-slate-800 flex flex-col pt-10 pb-6 px-4 shrink-0 relative z-10">
          <div className="mb-10 px-4">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] uppercase text-emerald-700 mb-2">
              <Sparkles size={14} className="animate-pulse" />
              Settings
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">游戏设置</h2>
          </div>

          <nav className="flex flex-col gap-2 flex-1 relative">
            <TabButton active={activeTab === 'audio'} onClick={() => setActiveTab('audio')} icon={<Volume2 size={18} />} label="声音设置" />
            <TabButton active={activeTab === 'video'} onClick={() => setActiveTab('video')} icon={<Monitor size={18} />} label="画面与视觉" />
            <TabButton active={activeTab === 'gameplay'} onClick={() => setActiveTab('gameplay')} icon={<Gamepad2 size={18} />} label="游戏与控制" />
            <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')} icon={<Shield size={18} />} label="账号与数据" />
          </nav>

          {/* Current Profile Mini Card */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="mt-auto bg-white p-4 rounded-2xl border-[3px] border-slate-800 shadow-[4px_4px_0_rgba(15,23,42,1)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 overflow-hidden border-2 border-slate-800">
                {props.authUser?.avatar ? <img src={props.authUser.avatar} alt="" className="w-full h-full object-cover" /> : <User size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Profile</p>
                <p className="text-sm font-black text-slate-800 truncate">{props.authUser?.username || '离线游玩'}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#fbf7ec]">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="p-10 max-w-2xl mx-auto space-y-12 pb-20 relative z-10">
            <AnimatePresence mode="wait">
              {activeTab === 'audio' && (
                <motion.div 
                  key="audio"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="space-y-10"
                >
                  <SectionTitle title="音量控制" icon={<Volume2 />} />
                  <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0_rgba(15,23,42,1)] border-[3px] border-slate-800 space-y-8">
                    <SettingSlider icon={<Volume2 size={18} />} label="主音量" value={props.masterVol} color="#10b981" onChange={props.handleMasterVol} />
                    <SettingSlider icon={<Music2 size={18} />} label="音乐音量 (BGM)" value={props.bgmVol} color="#3b82f6" onChange={props.handleBgmVol} />
                    <SettingSlider icon={<Speaker size={18} />} label="音效音量 (SFX)" value={sfxVol} color="#f59e0b" onChange={(e) => setSfxVol(parseFloat(e.target.value))} />
                    <SettingSlider icon={<MousePointer2 size={18} />} label="界面音量 (UI)" value={uiVol} color="#8b5cf6" onChange={(e) => setUiVol(parseFloat(e.target.value))} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'video' && (
                <motion.div 
                  key="video"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="space-y-10"
                >
                  <div>
                    <SectionTitle title="画质预设" icon={<Monitor />} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {(['performance', 'balanced', 'cinematic'] as const).map((id) => (
                        <OptionCard 
                          key={id}
                          selected={props.qualityPreset === id}
                          onClick={() => props.setQuality(id)}
                          title={{ performance: '性能优先', balanced: '平衡', cinematic: '电影级' }[id]}
                          desc={{ performance: '最高帧率', balanced: '推荐选项', cinematic: '极致视觉' }[id]}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="高级渲染细节" icon={<Sparkles />} />
                    <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0_rgba(15,23,42,1)] border-[3px] border-slate-800 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-slate-800">阴影质量</span>
                        <div className="flex gap-2">
                          {(['low', 'med', 'high'] as const).map(q => (
                            <button 
                              key={q} 
                              onClick={() => { AudioSystem.playTap(); setShadowQuality(q); }}
                              className={`px-4 py-1.5 rounded-full text-xs font-black border-2 transition-all ${shadowQuality === q ? 'bg-emerald-400 border-slate-800 text-slate-900 shadow-[2px_2px_0_rgba(15,23,42,1)]' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'}`}
                            >
                              {q === 'low' ? '低' : q === 'med' ? '中' : '高'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <SettingToggle icon={<Eye size={18} />} label="景深效果 (DOF)" desc="在远处模糊以模拟真实镜头感" checked={dofEnabled} onClick={() => setDofEnabled(!dofEnabled)} />
                      <SettingToggle icon={<Waves size={18} />} label="体积雾与环境光" desc="提升场景沉浸感" checked={props.ambientDetail} onClick={props.toggleAmbientDetail} />
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="标题页偏好" icon={<Palette />} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <OptionCard selected={props.titleTheme === 'white'} onClick={() => { AudioSystem.playTap(); props.setTitleTheme('white'); }} title="纸白标题" desc="更轻、更干净的视觉" />
                      <OptionCard selected={props.titleTheme === 'blue'} onClick={() => { AudioSystem.playTap(); props.setTitleTheme('blue'); }} title="深蓝标题" desc="更沉静的电影感" />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'gameplay' && (
                <motion.div 
                  key="gameplay"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="space-y-10"
                >
                  <div>
                    <SectionTitle title="控制与视角" icon={<MousePointer2 />} />
                    <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0_rgba(15,23,42,1)] border-[3px] border-slate-800 space-y-8">
                      <SettingSlider icon={<Gauge size={18} />} label="鼠标灵敏度" value={mouseSensitivity} color="#0ea5e9" onChange={(e) => setMouseSensitivity(parseFloat(e.target.value))} />
                      <SettingToggle icon={<RotateCcw size={18} />} label="反转 Y 轴" desc="将鼠标上下视角反转" checked={invertY} onClick={() => setInvertY(!invertY)} />
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="游玩偏好" icon={<Gamepad2 />} />
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-3xl shadow-[4px_4px_0_rgba(15,23,42,1)] border-[3px] border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 border-2 border-slate-800"><RotateCcw size={18} /></div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">自动保存间隔</p>
                            <p className="font-bold text-slate-500 text-xs">定时保存以防数据丢失</p>
                          </div>
                        </div>
                        <select 
                          className="font-black text-sm border-2 border-slate-800 bg-[#fbf7ec] rounded-xl px-3 py-1 outline-none cursor-pointer"
                          value={autoSaveInterval} 
                          onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                        >
                          <option value={1}>1 分钟</option>
                          <option value={5}>5 分钟</option>
                          <option value={15}>15 分钟</option>
                          <option value={0}>从不自动保存</option>
                        </select>
                      </div>
                      
                      <SettingToggle icon={<Gauge size={18} />} label="降低界面动态效果" desc="适合低电量或晕动症患者" checked={props.reducedMotion} onClick={props.toggleReducedMotion} />
                      <SettingToggle icon={<Compass size={18} />} label="跳过开场动画" desc="直接进入主菜单" checked={props.skipIntro} onClick={props.toggleSkipIntro} />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'data' && (
                <motion.div 
                  key="data"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="space-y-10"
                >
                  <div>
                    <SectionTitle title="档案状态" icon={<User />} />
                    <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0_rgba(15,23,42,1)] border-[3px] border-slate-800 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full -z-0 opacity-50" />
                      <div className="flex flex-col gap-4 text-sm font-black text-slate-600 relative z-10">
                        <div className="flex justify-between items-center pb-3 border-b-2 border-slate-100 border-dashed"><span>登入账号</span><span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{props.authUser?.username || '未登录'}</span></div>
                        <div className="flex justify-between items-center pb-3 border-b-2 border-slate-100 border-dashed"><span>岛屿名称</span><span className="text-slate-900 truncate max-w-[200px]">{props.islandName || '未命名之岛'}</span></div>
                        <div className="flex justify-between items-center pb-3 border-b-2 border-slate-100 border-dashed"><span>等级与经验</span><span className="font-mono text-slate-900">Lv.{props.playerLevel} ({props.playerXP} XP)</span></div>
                        <div className="flex justify-between items-center"><span>总游玩时长</span><span className="font-mono text-slate-900">{Math.floor((props.stats?.playtime || 0) / 60)} 分钟</span></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="安全与隐私" icon={<Shield />} />
                    <div className="grid grid-cols-1 gap-3">
                      <ActionCard 
                        icon={<BookOpen size={18} />} 
                        label="查看隐私政策" 
                        onClick={() => { AudioSystem.playClick(); props.setActiveModal('PRIVACY'); }} 
                      />
                      <ActionCard 
                        icon={<RotateCcw size={18} />} 
                        label="重置环境偏好" 
                        onClick={() => { AudioSystem.playClick(); props.resetTitlePreferences(); }} 
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={props.isClearingData}
                        onClick={async () => {
                          AudioSystem.playClick();
                          if (!confirm('确定清除所有数据？将清空本地存档与进度，页面将自动刷新回到初始状态。')) return;
                          await props.clearAllData();
                        }}
                        className="w-full bg-[#fee2e2] p-4 rounded-2xl border-[3px] border-slate-800 text-red-700 font-black flex items-center gap-4 shadow-[4px_4px_0_rgba(15,23,42,1)] hover:shadow-[2px_2px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 mt-4"
                      >
                        <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center border-2 border-slate-800 shrink-0"><Trash2 size={18} /></div>
                        <div className="text-left text-sm">{props.isClearingData ? '正在清除宇宙尘埃...' : '销毁当前存档 (不可逆)'}</div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SectionTitle({ title, icon }: { title: string, icon: React.ReactNode }) {
  return (
    <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-3">
      <span className="text-slate-400">{icon}</span>
      {title}
    </h3>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div className="relative">
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-emerald-400 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0_rgba(15,23,42,1)]"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      )}
      <button
        onClick={() => { AudioSystem.playTap(); onClick(); }}
        className={`relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black transition-colors ${active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
      >
        {icon}
        {label}
      </button>
    </div>
  );
}

function OptionCard({ selected, onClick, title, desc }: { selected: boolean, onClick: () => void, title: string, desc: string }) {
  return (
    <motion.button
      whileHover={{ scale: selected ? 1 : 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative p-5 rounded-3xl text-left transition-colors border-[3px] border-slate-800 ${
        selected ? 'bg-emerald-400 shadow-[2px_2px_0_rgba(15,23,42,1)] translate-x-[2px] translate-y-[2px]' : 'bg-white shadow-[4px_4px_0_rgba(15,23,42,1)] hover:bg-[#fbf7ec]'
      }`}
    >
      {selected && <Check size={20} className="absolute right-4 top-4 text-slate-900 stroke-[3]" />}
      <p className={`font-black text-lg ${selected ? 'text-slate-900' : 'text-slate-800'}`}>{title}</p>
      <p className={`mt-1 text-xs font-bold ${selected ? 'text-slate-800' : 'text-slate-500'}`}>{desc}</p>
    </motion.button>
  );
}

function ActionCard({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-white p-4 rounded-2xl border-[3px] border-slate-800 text-slate-800 font-black flex items-center gap-4 shadow-[4px_4px_0_rgba(15,23,42,1)] hover:shadow-[2px_2px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
    >
      <div className="w-10 h-10 rounded-full bg-[#fbf7ec] flex items-center justify-center border-2 border-slate-800 shrink-0">{icon}</div>
      <div className="text-left text-sm">{label}</div>
    </motion.button>
  );
}

function SettingSlider({ icon, label, value, color, onChange }: { icon: React.ReactNode; label: string; value: number; color: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }) {
  return (
    <div className="flex flex-col gap-3 group">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3 text-sm font-black text-slate-800">
          <div className="w-8 h-8 rounded-full bg-[#fbf7ec] flex items-center justify-center text-slate-600 border-2 border-slate-800 transition-transform group-hover:scale-110 group-hover:-rotate-12 duration-300">{icon}</div>
          {label}
        </span>
        <span className="font-mono text-xs font-black text-slate-600 bg-[#fbf7ec] border-2 border-slate-800 px-3 py-1 rounded-full">{Math.round(value * 100)}%</span>
      </div>
      <div className="relative w-full h-8 flex items-center cursor-pointer mt-1">
        {/* Track */}
        <div className="absolute h-4 bg-slate-200 rounded-full w-full pointer-events-none border-2 border-slate-800 overflow-hidden">
          <motion.div 
            className="h-full rounded-full" 
            style={{ width: `${value * 100}%`, background: color }} 
            layout
          />
        </div>
        {/* Thumb */}
        <motion.div 
          className="absolute w-6 h-6 bg-white border-[3px] border-slate-800 shadow-[2px_2px_0_rgba(15,23,42,1)] rounded-full pointer-events-none" 
          style={{ left: `calc(${value * 100}% - 12px)` }}
          layout
        />
        <input type="range" min="0" max="1" step="0.05" value={value} onChange={onChange} className="w-full opacity-0 cursor-pointer absolute inset-0 h-full" />
      </div>
    </div>
  );
}

function SettingToggle({ icon, label, desc, checked, onClick }: { icon: React.ReactNode; label: string; desc: string; checked: boolean; onClick: () => void; }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { AudioSystem.playTap(); onClick(); }}
      className={`w-full flex items-center justify-between p-4 rounded-3xl border-[3px] border-slate-800 transition-colors shadow-[4px_4px_0_rgba(15,23,42,1)] hover:shadow-[2px_2px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] ${checked ? 'bg-[#fbf7ec]' : 'bg-white'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 border-slate-800 ${checked ? 'bg-emerald-300 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-black text-slate-800">{label}</p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">{desc}</p>
        </div>
      </div>
      
      {/* Q弹的开关 */}
      <div className={`relative w-14 h-8 rounded-full border-[3px] border-slate-800 transition-colors p-1 flex items-center ${checked ? 'bg-emerald-400' : 'bg-slate-200'}`}>
        <motion.div 
          className="w-5 h-5 bg-white rounded-full border-2 border-slate-800 shadow-sm"
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        />
      </div>
    </motion.button>
  );
}
