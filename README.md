<div align="center">

# 🏝️ 流浪岛 · Wander Island

### *世界不是被毁灭的，而是被遗忘的。*

**一个关于遗忘与倾听的生态沙盒——在破碎的叙述中，重建一座会呼吸的岛。**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r184-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)](https://socket.io/)

[English](#-overview) · [快速开始](#-快速开始) · [核心特性](#-核心特性) · [技术架构](#-技术架构) · [世界观](#-世界观)

</div>

---

## 🌊 Overview

**Wander Island** is not just a game—it's a living narrative ecosystem.

You are a **Tide Speaker** (潮语者), stepping onto a fragment of a shattered narrative. Every island is a broken piece of a once-complete story, drifting on a sea of forgotten possibilities. Your role is not to conquer or build, but to **listen**—to hear the echoes of memories trying to speak again.

Plant trees to give syntax to memory. Channel springs to provide ink for forgotten words. Release deer to restore the rhythm of lost paragraphs. As the ecology thrives, the island begins to sing—fragments of narrative surface, music grows clearer, and the story of the Great Forgetting slowly unfolds.

> *你听到的不是声音。是记忆在试图重新开口说话。*

---

## ✨ 核心特性

### 🌿 生态沙盒
- **动态生态系统** — 植被、动物、水源相互依存，形成真实的生态链
- **地形雕刻** — 升降、平整、雕刻地形，塑造独一无二的岛屿形态
- **40+ 可放置物件** — 从松树、樱花到灯塔、远古神树，每个物件都是叙述语法的残骸
- **天气与昼夜** — 晴、雨、雾、雪、暴风，动态天光与实时阴影

### 🎵 回声系统
- **6 首原创环境音乐** — 每首对应一位叙述居民的遗响
- **生态驱动音乐清晰度** — 生态越健康，回声越完整；生态崩溃时，音乐走调消散
- **回声容器** — 灯塔、樱花树、远古神树、观星台、水车，放置即唤醒记忆

### 📜 叙事碎片
- **三层碎片系统** — 表层回声、中层残句、深层遗书，由浅入深还原叙述
- **共鸣触发** — 放置相关物件、生态阈值、特定时间/天气均可触发碎片浮现
- **叙事图谱** — 收集的碎片逐渐拼合成星座图，还原五位居民的完整故事

### 🤖 AI 岛灵「辞」
- **生态感知对话** — 岛灵的语言能力随生态健康度变化：完整段落 → 短语 → 单词 → 沉默
- **叙述回响** — 不是 AI 聊天，是叙述本身试图重新开口说话
- **织潮者的残影** — 辞是碎裂后最古老存在的意识碎片

### 🌐 社交与多人
- **串门系统** — 访问其他潮语者的碎片，触发跨岛碎片共鸣
- **漂流瓶** — 向云海投递记忆片段，用叙述语法书写的信
- **礼物与好友** — 在碎片之间赠送语法、重建叙述连接
- **实时通信** — Socket.IO 驱动的即时互动

### 🃏 生生不息
- **卡牌策略模式** — 六种叙事元素卡牌，共生连锁重建叙述语法
- **三级共生** — 水土丰茂 → 鹿群觅食 → 食物链闭合，还原叙述最根本的运行方式

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│  React 19 · Three.js/r3f · Zustand · Tailwind CSS   │
│  Vite · Motion · Lucide Icons · Simplex Noise       │
├─────────────────────────────────────────────────────┤
│                    Backend                           │
│  Express 4 · Socket.IO · SQLite (better-sqlite3)    │
│  JWT Auth · OpenAI API · Multer                     │
├─────────────────────────────────────────────────────┤
│                    3D Engine                         │
│  @react-three/fiber · @react-three/drei             │
│  @react-three/postprocessing · simplex-noise         │
└─────────────────────────────────────────────────────┘
```

| 层级 | 技术栈 | 用途 |
|------|--------|------|
| **渲染引擎** | Three.js + React Three Fiber | 3D 岛屿场景、动态光照、后处理 |
| **UI 框架** | React 19 + Zustand | 响应式界面、全局状态管理 |
| **样式系统** | Tailwind CSS 4 | 原子化 CSS、暗色主题 |
| **构建工具** | Vite 6 | 极速 HMR、代码分割 |
| **服务端** | Express + SQLite | RESTful API、用户系统、数据持久化 |
| **实时通信** | Socket.IO | 多人在线、串门、聊天 |
| **AI 集成** | OpenAI API | 岛灵对话、叙事生成 |
| **地形系统** | simplex-noise | 程序化地形、笔刷编辑 |

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18
- **npm** 或 **pnpm**

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/huyan1349/wander-island-eco-sandbox.git
cd wander-island-eco-sandbox

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入必要的 API Key

# 启动开发服务器
npm run dev

# 启动后端服务（另一个终端）
npm run server
```

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 (port 3002) |
| `npm run server` | 启动 Express 后端服务 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | TypeScript 类型检查 |
| `npm run seed` | 初始化数据库种子数据 |

---

## 🌍 世界观

> *你不是创造者。你是倾听者。而倾听——是最古老的创造。*

在一切之前，存在一个「叙述」——活着的、会呼吸的意义。它没有作者，没有边界，永远在生长。然后，**大遗忘**降临了。叙述碎裂成无数碎片，漂浮在云海之上，沉默不语。

五位居民在碎裂中做出了各自的选择：

| 居民 | 选择 | 代价 | 回声 |
|------|------|------|------|
| **守灯人** | 将自己变成灯塔 | 失去人的形态 | *Lighthouse Beam* |
| **摆渡人** | 继续航行直到沉没 | 红木船沉入海底 | *Tides of Mahogany* |
| **时间记录者** | 敲响最后的黎明 | 永远困在清晨 | *Glockenspiel Sunprint* |
| **图书馆守护者** | 打开未生之故事的门 | 图书馆变成远古神树 | *The Architecture of Leaves* |
| **织潮者** | 第一次放下手中的线 | 碎裂散入每一块碎片 | *Sakura Drifting Down* |

而你——潮语者——踏上碎片，倾听回声，让叙述重新拥有语法。

---

## 📁 项目结构

```
wander-island-eco-sandbox/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   │   ├── systems/        # 时间天气系统
│   │   └── ui/             # UI 组件（音乐库、天气预报等）
│   ├── game/               # 游戏逻辑（生生不息卡牌系统）
│   ├── lib/                # 工具库（API、音频、成就、Socket）
│   └── utils/              # 工具函数（地形、笔刷、岛屿IO）
├── server/                 # 后端源码
│   ├── routes/             # API 路由（认证、岛屿、好友、聊天等）
│   ├── auth.ts             # JWT 认证中间件
│   ├── db.ts               # SQLite 数据库
│   ├── socket.ts           # Socket.IO 实时通信
│   └── seed.ts             # 数据库种子
├── public/                 # 静态资源（字体、音乐、图标）
├── docs/                   # 项目文档
│   └── narrative/          # 世界观与叙事设计
└── 预置岛屿/               # 预设岛屿存档
```

---

## 🎮 游戏截图

> *待补充 — 岛屿正在生长中...*

---

## 🤝 贡献

这是一个个人创作项目，但欢迎所有形式的交流与灵感碰撞。如果你对叙事驱动的生态沙盒感兴趣，欢迎：

- 提交 Issue 分享你的想法
- Fork 后创建 Pull Request
- 在漂流瓶中投递你的故事

---

## 📜 许可

本项目为个人创作项目，版权所有。

---

<div align="center">

*你建造的不是岛屿。是叙述在试图重新拥有语法。*

**流浪岛 · Wander Island** · *潮语者纪元*

</div>
