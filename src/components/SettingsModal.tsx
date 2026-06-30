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
  Speaker,
  Code2,
  BrainCircuit,
  Layers,
  Server,
  Database,
  Network,
  KeyRound,
  Box
} from 'lucide-react';
import { AudioSystem } from '../lib/audio';

type QualityPreset = 'performance' | 'balanced' | 'cinematic';
export type SettingsTab = 'audio' | 'video' | 'gameplay' | 'data' | 'development';

const developmentHighlights = [
  { label: '作者', value: 'huyan' },
  { label: '主要开发模型', value: 'Gemini3.1pro / Opus 4.8' },
  { label: '项目形态', value: '3D 生态沙盒 · 岛屿编辑器 · 多人社交 · AI 叙事应用' },
];

const techStackDocs = [
  {
    id: 'architecture',
    index: '01',
    title: '整体架构',
    icon: <Code2 size={18} />,
    summary: '流浪岛不是单一的 Three.js 展示页，而是一个浏览器内运行的 3D 生态沙盒产品。前端承担实时 3D 渲染、岛屿编辑、拍照、观星、教程与 UI；后端承担账号、岛屿云同步、社交、实时多人、AI 叙事和管理接口。',
    stack: ['React 19', 'TypeScript', 'Vite 6', 'R3F', 'Express', 'Socket.IO', 'SQLite', 'Zustand'],
    bullets: [
      '客户端：React 19 + TypeScript + Zustand 组织复杂 UI、游戏状态和长期存档。',
      '3D 层：Three.js r184 通过 @react-three/fiber 接入 React 渲染树，使用 drei 与 postprocessing 扩展相机、天空、文字、后期和控制器。',
      '服务端：Express + Socket.IO + better-sqlite3 形成轻量全栈，支持 REST、WebSocket、SQLite 持久化和静态资源托管。',
      '工程目标：首屏不强拉 3D 大包，GameCanvas 懒加载；社交和云同步独立于本地存档运行。',
    ],
    difficulty: [
      '难点在于它同时是“游戏场景”和“产品应用”：3D 渲染、账号数据、弹窗 UI、社交事件、AI 对话不能互相阻塞。',
      '状态边界必须清楚：本地游玩、访问他人岛屿、归隐之岛公共房间和云端自己的岛屿是四种不同数据来源。',
    ],
  },
  {
    id: 'rendering',
    index: '02',
    title: '3D 渲染核心',
    icon: <Layers size={18} />,
    summary: '渲染层采用 React Three Fiber 声明式组织 Three.js 场景。和 Elemental Serenity 类似，我们也以 Three.js 为底座，但更偏“可编辑的实时沙盒”，不是固定模型场景。',
    stack: ['Three.js r184', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'WebGL', 'ACES tone mapping'],
    bullets: [
      'Canvas 使用 ACESFilmicToneMapping、阴影、preserveDrawingBuffer 和高性能 WebGL 上下文，兼顾视觉与截图导出。',
      '场景包含 Terrain、Water、Assets、SkySystem、WeatherSystem、FirefliesSystem、ConstellationGame、TelescopeControls 和 BoatWake。',
      '后期链使用 EffectComposer、Bloom、Vignette、HueSaturation、DepthOfField、BrightnessContrast；拍照模式会动态改变焦点、滤镜、亮度和对比度。',
      '相机系统组合 OrbitControls、WASD 平移、平滑缩放、拍照焦点射线、船只跟随和观星模式控制，桌面与触屏输入分流。',
    ],
    difficulty: [
      'R3F 场景中既有 React 生命周期，又有 useFrame 高频帧循环；需要避免把每帧数据写成 React state 导致重渲染风暴。',
      '截图、拍照 DOF、后期滤镜和实时交互共用一个 WebGL canvas，所以 preserveDrawingBuffer、焦点射线和后期参数必须协调。',
    ],
  },
  {
    id: 'editor',
    index: '03',
    title: '程序化岛屿与编辑器',
    icon: <Compass size={18} />,
    summary: '核心难点是让“岛屿”既能被实时渲染，又能被玩家持续编辑、保存、同步和恢复。地形、物件、水系与生态都不是静态展示图层，而是可变状态。',
    stack: ['simplex-noise', 'BufferGeometry', 'Float32Array', 'Uint8Array', 'terrainBrush', 'heightField', 'undo / redo'],
    bullets: [
      '地形用 simplex-noise 生成低多边形岛体，维护 Float32Array 顶点高度与 Uint8Array 表面类型。',
      '地形笔刷支持抬高、降低、铺路、耕地、雪地、石面、擦除等操作，并在实时预览、放置规则和存档数据之间保持一致。',
      '水体系统包含池塘拟合、河流拖绘、瀑布塑形、溪流几何和高度场同步，水不是简单平面贴图。',
      '资产系统覆盖树、岩石、动物、建筑、桥、平台、船、气球、观星台、遗迹、灯笼少女等可放置对象，并支持 undo / redo。',
    ],
    difficulty: [
      '地形修改要同时影响视觉网格、物件放置高度、水体走向、动物行走和存档编码。',
      '拖绘河流、瀑布两点放置、平台吸附、桥柱连接这些交互都要在“预览态”和“提交态”之间保持一致。',
    ],
  },
  {
    id: 'ecology',
    index: '04',
    title: '生态、天气与时间',
    icon: <Waves size={18} />,
    summary: '应用把岛屿状态视为一个持续演化的生态系统，而不是简单的装饰集合。天气、季节、昼夜、草地健康度、动物数量和音频氛围互相影响。',
    stack: ['Sky / Stars / Clouds', 'useFrame damping', 'weather state', 'season / biome', 'ecology loop', 'forecast system'],
    bullets: [
      'SkySystem 以 24 小时关键帧插值驱动太阳、月光、雾色、环境光和星空显隐，避免昼夜切换硬跳。',
      '天气包含 sunny、cloudy、rainy、foggy、snowy、stormy，并影响雾密度、粒子、预报、AI 文案和环境音。',
      '生态循环追踪草地健康、鹿、狼、泉水、风车等变量，并驱动资源、提示与氛围反馈。',
      '季节与 biome 影响草、沙、雪、石面、火山等视觉调色，形成同一岛屿的多种环境状态。',
    ],
    difficulty: [
      '天气和昼夜不能只换 UI 文案，它们要同步影响雾、天空、星光、粒子、音频、生态播报和 AI 叙事。',
      '时间滑动、自动时间推进和观星模式都在改同一套环境变量，必须避免视觉硬跳。',
    ],
  },
  {
    id: 'gameplay',
    index: '05',
    title: '玩法与模式系统',
    icon: <Gamepad2 size={18} />,
    summary: '流浪岛在“自由搭建”之外还叠加了多个玩法系统，让 3D 沙盒不只是摆放物件，而能沉淀进度、目标和收藏。',
    stack: ['Creative mode', 'Flourish cards', 'ConstellationGame', 'Photo mode', 'toolCatalog', 'toolRules'],
    bullets: [
      '创作模式提供工具栏、分类建造、物件选择、编辑、拖放、地形改造和生态管理。',
      '生生不息 Flourish 模式使用卡牌、回合生态收益、共生评价和手牌 / 牌堆数据，提供策略生存分支。',
      '观星系统包含星座数据、天文台模式、TelescopeControls、ConstellationGame、解锁记录和星卡反馈。',
      '拍照模式基于 WebGL canvas 输出，支持焦点射线、动态 DOF、滤镜和专业相机 UI。',
    ],
    difficulty: [
      '同一套岛屿数据要服务自由建造、策略模式、观星收藏和拍照输出，不能为单一玩法写死结构。',
      '教程进度、工具状态、相机控制、选择对象和拖拽放置要在移动端与桌面端都保持可用。',
    ],
  },
  {
    id: 'frontend',
    index: '06',
    title: '前端工程栈',
    icon: <Palette size={18} />,
    summary: 'UI 层是一个完整 React 应用，而不是 Three.js 周边脚手架。设置、标题页、制作组、信箱、社交广场、玩家面板、拍照面板都使用同一套手绘高级感设计语言。',
    stack: ['React 19', 'TypeScript 5.8', 'Tailwind CSS 4', 'Motion', 'Lucide React', 'Zustand', '@fontsource'],
    bullets: [
      'React 19、TypeScript 5.8、Vite 6、@vitejs/plugin-react、@tailwindcss/vite、Tailwind CSS 4。',
      'Zustand 5 承载全局游戏状态、账号状态、教程进度、存档、生态变量、UI 模态和多人状态。',
      'Motion / Framer Motion 负责弹窗、页签、卡片、按钮和标题页的声明式动效。',
      'Lucide React 统一图标系统；@fontsource/nunito、raleway、zcool-kuaile 提供字体资产。',
    ],
    difficulty: [
      '应用 UI 和 3D canvas 是同屏叠加关系，弹窗、HUD、触屏安全区、工具栏和 Canvas 输入要避免互相抢事件。',
      '设置页、制作组和玩家面板复用同一种卡片语言：白底、粗描边、硬阴影、轻微 hover 位移，保证高级但不乱。',
    ],
  },
  {
    id: 'sync',
    index: '07',
    title: '存档、云同步与状态合并',
    icon: <Database size={18} />,
    summary: '这里的难点不是“存一份 JSON”，而是本地岛屿、服务器岛屿、账号进度、AI 记忆、成就、卡牌和跨设备数据之间的合并策略。',
    stack: ['localStorage', 'cloudSync', 'REST API', 'serverIslandMap', 'user_state', 'autosave', 'merge strategy'],
    bullets: [
      '本地使用 localStorage 保存岛屿 slot、具体岛屿快照、全局 XP、辞好感、辞记忆、成就、居民卡和音乐卡。',
      '登录后 cloudSync 双向同步岛屿：服务器新则覆盖本地，本地未部署则自动创建云端岛屿。',
      '账号级进度采用合并而非覆盖：XP / 好感取最大值，记忆去重截断，成就合并，卡牌保留最早获得时间。',
      '自动保存 30 秒一轮，云端同步 60 秒一轮，并避免访问他人岛屿时污染自己的本地存档。',
    ],
    difficulty: [
      '如果简单覆盖，跨设备登录会丢失 XP、成就、辞记忆或卡牌；所以账号级进度必须 merge。',
      '串门时会临时套用远程岛屿快照，退出时要回到自己的岛，不能把访客视图写回本地存档。',
    ],
  },
  {
    id: 'ai',
    index: '08',
    title: 'AI 叙事与岛灵「辞」',
    icon: <BrainCircuit size={18} />,
    summary: '开发阶段主要借助 Gemini3.1pro 与 Opus 4.8；运行时的 AI 叙事通过 OpenAI SDK 接入 DeepSeek 兼容接口，让岛灵能读取玩家当前岛屿上下文。',
    stack: ['Gemini3.1pro', 'Opus 4.8', 'OpenAI SDK 6', 'DeepSeek compatible API', 'system prompt', 'local fallback'],
    bullets: [
      '后端使用 OpenAI SDK 6，baseURL 指向 DeepSeek 兼容接口，支持代理配置与无 key 回退。',
      'buildCiSystemPrompt 会注入岛名、天气、时间、季节、好感等级、记忆摘要、动物数量、草地健康度与玩家输入。',
      '无用户消息时优先使用本地天气 / 季节文案库，减少 API 调用并保证离线体验有基本叙事反馈。',
      'Socket 聊天中，普通好友消息与「辞」对话共用消息管线；对辞会额外传入实时岛屿上下文。',
    ],
    difficulty: [
      'AI 不能脱离游戏状态空泛聊天，所以 prompt 必须把岛屿现场压缩成稳定上下文。',
      'AI 失败或没有 key 时不能破坏核心玩法，因此天气、季节和生态提示都有本地文案回退。',
    ],
  },
  {
    id: 'backend',
    index: '09',
    title: '后端、账号与数据库',
    icon: <Server size={18} />,
    summary: '后端是一个嵌入式部署取向的 Express 服务，使用 SQLite 降低部署复杂度，同时覆盖账号、岛屿、好友、聊天、信箱、访客、漂流瓶、礼物、留言板和后台管理。',
    stack: ['Express 4', 'better-sqlite3', 'JWT', 'bcryptjs', 'multer', 'cors', 'dotenv', 'admin API'],
    bullets: [
      'Express 4 + Node.js + tsx；Vite 开发期通过 proxy 转发 /api、/socket.io、/avatars 到 3001。',
      'better-sqlite3 创建 users、islands、friends、chat_messages、mailbox、visitor_log、messages_in_bottle、gifts、board_posts、user_state。',
      '认证使用 JWT Bearer Token、jsonwebtoken、bcryptjs；头像上传使用 multer，头像静态资源走 /avatars。',
      '管理端 API 提供用户、岛屿、消息、信箱、漂流瓶、服务器统计、在线用户和公告能力。',
    ],
    difficulty: [
      'SQLite 同步 API 简洁，但要小心大 JSON 岛屿数据、聊天写入和多人房间落盘的节奏。',
      '账号体系既服务普通 REST，又服务 Socket.IO 握手和管理端权限，认证边界必须统一。',
    ],
  },
  {
    id: 'realtime',
    index: '10',
    title: '实时通信与多人社交',
    icon: <Network size={18} />,
    summary: 'Socket.IO 不只用于聊天，还承担在线状态、好友事件、串门数据和归隐之岛公共房间。实时层和 REST 层共享账号认证，但职责分开。',
    stack: ['Socket.IO 4', 'JWT handshake', 'rooms', 'presence', 'hermit room', 'persistent chat'],
    bullets: [
      'Socket 握手读取 JWT，验证用户后加入个人房间，广播 user:online / user:offline。',
      '私聊事件 chat:send 会写入数据库并向目标用户房间推送 chat:message。',
      '串门系统通过 island:visit 请求远程岛屿数据，前端 applyIslandSnapshot 临时呈现他人岛屿。',
      '归隐之岛使用 hermit:join / place / remove / chat / presence 管理多人公共服务器，限制人数与物件总量，并节流落盘。',
    ],
    difficulty: [
      '实时事件既要立即反馈，又要和数据库记录一致，聊天、好友、信箱、在线状态不能只靠前端乐观更新。',
      '公共房间的物件编辑需要限流和容量约束，否则多人同时放置会拖垮前端与落盘。',
    ],
  },
  {
    id: 'audio',
    index: '11',
    title: '音频与沉浸反馈',
    icon: <Speaker size={18} />,
    summary: '音频系统用 Web Audio API 管理环境声，用 HTMLAudioElement 管理 BGM，以适配浏览器自动播放限制。交互音效按语义分类，而不是单一 click 声。',
    stack: ['Web Audio API', 'HTMLAudioElement', 'GainNode', 'BiquadFilterNode', 'BGM playlist', 'haptics'],
    bullets: [
      'AudioSystem 维护 master gain、delay、风、雨、水、鸟鸣、海浪、夜虫等环境节点。',
      'BGM 使用缓存的 audio element、播放列表、自动下一首、淡入淡出和用户手势解锁。',
      'UI 交互有 press、tap、confirm、toggle、close 等语义音效，并带有防重复触发逻辑。',
      '环境音与生态状态同步：泉水、风车、天气和昼夜会改变水声、风声、雨声、虫鸣等声景。',
    ],
    difficulty: [
      '浏览器自动播放策略会阻止音频，必须把 BGM 恢复、AudioContext resume 和用户手势绑定起来。',
      '全局点击监听和组件内点击都可能发声，需要 recent-play 去重，否则 UI 会叠音。',
    ],
  },
  {
    id: 'build',
    index: '12',
    title: '构建、分包与接口边界',
    icon: <Box size={18} />,
    summary: '工程化重点是控制 3D 大包对首屏的影响，同时保持本地开发、生产静态托管、API 代理、Socket 和资源目录稳定。',
    stack: ['Vite 6', 'Rollup manualChunks', 'React.lazy', 'tsx', 'esbuild', 'sharp', 'npm scripts'],
    bullets: [
      'GameCanvas 通过 React.lazy 独立懒加载；Vite/Rollup manualChunks 只把 React vendor 与 socket 拆出，避免 three 被入口静态依赖。',
      '主要脚本：npm run dev、npm run server、npm run build、npm run preview、npm run lint、npm run seed。',
      'API 边界包括 /api/auth、/api/islands、/api/friends、/api/chat、/api/mailbox、/api/visitors、/api/bottles、/api/gifts、/api/board、/api/user-state。',
      '辅助依赖包括 cors、cookie-parser、dotenv、https-proxy-agent、qrcode、sharp、esbuild、tsx。',
    ],
    difficulty: [
      'Three / R3F / drei 体积很大，错误分包会把 3D 库重新拖回首屏，导致标题页也背上游戏场景成本。',
      '开发期前后端分端口运行，生产期 Express 又要托管 dist、public、avatars 和 API，需要清楚区分代理与静态路径。',
    ],
  },
];

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
  initialTab?: SettingsTab;
}

export function SettingsModal(props: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(props.initialTab ?? 'audio');

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
            <TabButton active={activeTab === 'development'} onClick={() => setActiveTab('development')} icon={<Code2 size={18} />} label="开发" />
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

              {activeTab === 'development' && (
                <motion.div
                  key="development"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="space-y-10"
                >
                  <div>
                    <SectionTitle title="开发档案" icon={<Code2 />} />
                    <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0_rgba(15,23,42,1)] border-[3px] border-slate-800 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-100 rounded-bl-full opacity-60" />
                      <div className="relative z-10 space-y-4">
                        {developmentHighlights.map((item) => (
                          <div key={item.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-3 border-b-2 border-slate-100 border-dashed last:border-b-0 last:pb-0">
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">{item.label}</span>
                            <span className="text-sm font-black text-slate-900 sm:text-right">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="目录" icon={<BookOpen />} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {techStackDocs.map((group) => (
                        <DocIndexCard key={group.id} docId={group.id} index={group.index} title={group.title} icon={group.icon} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="技术核心与难点" icon={<Layers />} />
                    <div className="space-y-4">
                      {techStackDocs.map((group) => (
                        <TechStackPanel
                          key={group.id}
                          id={group.id}
                          index={group.index}
                          title={group.title}
                          icon={group.icon}
                          summary={group.summary}
                          stack={group.stack}
                          bullets={group.bullets}
                          difficulty={group.difficulty}
                        />
                      ))}
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

function DocIndexCard({ docId, index, title, icon }: { docId: string; index: string; title: string; icon: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        AudioSystem.playTap();
        document.getElementById(`dev-doc-${docId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
      className="w-full bg-white p-4 rounded-2xl border-[3px] border-slate-800 text-slate-800 font-black flex items-center gap-3 shadow-[4px_4px_0_rgba(15,23,42,1)] hover:shadow-[2px_2px_0_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-left"
    >
      <span className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-slate-800 text-[11px] shrink-0">{index}</span>
      <span className="w-9 h-9 rounded-full bg-[#fbf7ec] flex items-center justify-center border-2 border-slate-800 text-emerald-700 shrink-0">{icon}</span>
      <span className="text-sm leading-tight">{title}</span>
    </motion.button>
  );
}

function TechStackPanel({
  id,
  index,
  title,
  icon,
  summary,
  stack,
  bullets,
  difficulty,
}: {
  id: string;
  index: string;
  title: string;
  icon: React.ReactNode;
  summary: string;
  stack: string[];
  bullets: string[];
  difficulty: string[];
}) {
  return (
    <motion.section
      id={`dev-doc-${id}`}
      whileHover={{ y: -2 }}
      className="scroll-mt-8 bg-white p-5 rounded-3xl border-[3px] border-slate-800 shadow-[4px_4px_0_rgba(15,23,42,1)]"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-slate-800 text-[11px] font-black text-slate-800 shrink-0">
          {index}
        </div>
        <div className="w-10 h-10 rounded-full bg-[#fbf7ec] flex items-center justify-center text-emerald-700 border-2 border-slate-800 shrink-0">
          {icon}
        </div>
        <h4 className="text-base font-black text-slate-800 tracking-wide">{title}</h4>
      </div>
      <p className="text-sm font-bold leading-7 text-slate-700 mb-5">{summary}</p>

      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700 mb-3">技术栈</p>
        <div className="flex flex-wrap gap-2">
          {stack.map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-full border-2 border-slate-800 bg-[#fbf7ec] px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-[2px_2px_0_rgba(15,23,42,0.18)]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 mb-3">实现要点</p>
      <div className="space-y-2 mb-5">
        {bullets.map((item) => (
          <div key={item} className="flex gap-3 text-xs sm:text-sm font-bold leading-6 text-slate-600">
            <span className="mt-2 w-2 h-2 rounded-full bg-emerald-400 border border-slate-800 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-slate-800 bg-[#fbf7ec] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700 mb-3">关键难点</p>
        <div className="space-y-2">
          {difficulty.map((item) => (
            <div key={item} className="flex gap-3 text-xs sm:text-sm font-bold leading-6 text-slate-700">
              <span className="mt-2 w-2 h-2 rounded-full bg-amber-300 border border-slate-800 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
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
