# 多人联机前端界面 Spec

## Why
后端已搭建完成（Express + Socket.IO + SQLite + JWT），包含用户认证、岛屿管理、好友系统、聊天系统、实时串门等 API 和 Socket 事件。现在需要构建与游戏手绘风格一致的前端界面，让玩家能够登录、社交、串门，并完成全部增强功能。

## What Changes
- **修改** `src/store.ts`：添加 `authUser` 状态、`LOGIN` 屏幕类型、认证相关 actions、在线通知状态、串门状态、未读消息数
- **修改** `src/App.tsx`：添加 LOGIN 屏幕渲染、自动登录逻辑、社交面板入口、在线通知 toast、串门加载界面
- **重写** `src/components/LoginScreen.tsx`：完全按照手绘笔记本风格重做（已完成）
- **重写** `src/components/SocialPanel.tsx`：完全按照手绘笔记本风格重做，与 PlayerPanel 风格统一（已完成）
- **修改** `src/components/TitleScreen.tsx`：添加"联机模式"入口按钮，更新版本号（已完成）
- **新增** `src/components/VisitOverlay.tsx`：串门访问时的手绘风格加载/展示界面
- **新增** `src/components/Toast.tsx`：手绘风格 toast 通知组件
- **修改** `src/components/SaveSelectScreen.tsx`：联机模式下增加"部署到服务器"按钮
- **修改** `src/components/PlayerPanel.tsx`：System 标签页增加联机相关设置
- **修改** `src/index.css`：添加 toast 动画样式

## Impact
- Affected code: `src/store.ts`, `src/App.tsx`, `src/components/TitleScreen.tsx`, `src/components/LoginScreen.tsx`, `src/components/SocialPanel.tsx`, `src/components/VisitOverlay.tsx`, `src/components/Toast.tsx`, `src/components/SaveSelectScreen.tsx`, `src/components/PlayerPanel.tsx`, `src/index.css`
- 不影响现有游戏玩法逻辑、3D 渲染、离线存档系统

---

## 设计风格规范（从现有代码提取）

### 核心美学：手绘笔记本 (Hand-Drawn Notebook)
- **面板**：`hand-drawn-panel` — 暖色羊皮纸底色 `#fcf8ec`，3px 实线黑边 `#2d3436`，不规则圆角 `255px 15px 225px 15px/15px 225px 15px 255px`，4px 偏移黑阴影
- **按钮**：`hand-drawn-btn` — 同底色，hover 时黄高亮 `#ffeaa7`，-2px/-2px 偏移 + 旋转 -1deg，active 时反向
- **激活态**：`hand-drawn-btn-active` — 黄底 `#ffeaa7`，3px 黑边，3px 偏移阴影
- **幽灵按钮**：`hand-drawn-ghost` — 透明底，hover 时变为黄底黑边
- **标题**：`hand-drawn-title` — ZCOOL KuaiLe 字体，900 粗，大写，-2deg 旋转
- **邮票标记**：`.stamp` — 3px 虚线红边 `#ff7675`，-5deg 旋转，Courier 字体

### 字体
- 主字体：Nunito（300/400/600/700/800/900）
- 标题/装饰：ZCOOL KuaiLe
- 等宽：font-mono（用于数据标签）

### 色彩
- 主文字：`#2d3436`（深灰黑）
- 纸张底：`#fcf8ec`（暖米黄）
- 高亮黄：`#ffeaa7`
- 按压黄：`#fdcb6e`
- 生态绿：emerald-400/500
- 海洋青：cyan-400/500
- 警告红：`#ff7675`
- 灰色标签：slate-500

### 布局模式
- 全屏模态：`fixed inset-0 z-[100]` + `bg-slate-950/40 backdrop-blur-sm`
- 侧边栏 + 内容区：PlayerPanel 的 `w-64 border-r` + `flex-1` 模式
- 卡片网格：SaveSelectScreen 的 `grid grid-cols-3 gap-8`
- 小标签：`text-[10px] font-mono tracking-[0.3em] uppercase`

### 动画
- 入场：`animate-slide-up`（1.2s cubic-bezier）
- 渐显：`animate-in fade-in duration-500`
- 标签页切换：`animate-in fade-in slide-in-from-bottom-4`
- Toast 通知：`animate-in slide-in-from-right-4 fade-in` / `animate-out slide-out-to-right-4 fade-out`

---

## ADDED Requirements

### Requirement: 登录/注册界面
系统 SHALL 提供一个与游戏手绘风格一致的登录/注册界面。

#### Scenario: 用户进入登录界面
- **WHEN** 用户在标题画面点击"联机模式"
- **THEN** 显示 LoginScreen，包含登录/注册切换、用户名密码输入、提交按钮
- **AND** 界面使用 `hand-drawn-panel` 面板、`hand-drawn-btn` 按钮、ZCOOL KuaiLe 标题
- **AND** 背景使用 `cinematic-vignette` 暗角效果

#### Scenario: 用户注册新账号
- **WHEN** 用户填写用户名和密码并点击注册
- **THEN** 调用 `/api/auth/register`，成功后自动登录并跳转到存档选择
- **AND** 错误信息以手绘风格红色标签显示

#### Scenario: 用户登录已有账号
- **WHEN** 用户填写用户名和密码并点击登录
- **THEN** 调用 `/api/auth/login`，成功后连接 Socket.IO 并跳转到存档选择
- **AND** Token 保存到 localStorage，下次自动登录

#### Scenario: 自动登录
- **WHEN** 用户打开游戏且 localStorage 中有有效 Token
- **THEN** 自动调用 `/api/auth/me` 验证，成功后跳过登录直接进入存档选择
- **AND** Token 过期则清除并显示登录界面

### Requirement: 社交面板
系统 SHALL 提供一个与 PlayerPanel 风格统一的社交面板，包含好友、聊天、岛屿浏览三个标签页。

#### Scenario: 打开社交面板
- **WHEN** 用户在游戏内点击社交按钮（位于 PlayerPanel 旁边）
- **THEN** 显示全屏模态社交面板，使用与 PlayerPanel 相同的侧边栏+内容区布局
- **AND** 面板使用 `hand-drawn-panel` 底色和手绘边框

#### Scenario: 好友标签页
- **WHEN** 用户切换到好友标签
- **THEN** 显示好友列表（含在线状态绿点）、搜索用户框、待处理好友请求
- **AND** 好友条目使用 `hand-drawn-panel` 卡片样式
- **AND** 搜索框使用手绘风格输入框
- **AND** 加好友/接受/拒绝按钮使用 `hand-drawn-btn` 样式

#### Scenario: 聊天标签页
- **WHEN** 用户点击好友进入聊天
- **THEN** 显示聊天消息列表和输入框
- **AND** 自己的消息右对齐绿底，对方消息左对齐白底
- **AND** 输入框使用手绘风格，发送按钮使用 `hand-drawn-btn`
- **AND** 消息通过 Socket.IO 实时收发

#### Scenario: 岛屿标签页
- **WHEN** 用户切换到岛屿标签
- **THEN** 显示"我的岛屿"和"探索岛屿"两个分区
- **AND** 岛屿卡片使用 `hand-drawn-panel` + hover 上浮效果（同 SaveSelectScreen）
- **AND** 点击公开岛屿可串门访问（通过 Socket.IO emitIslandVisit）

### Requirement: 标题画面更新
系统 SHALL 在标题画面添加联机模式入口。

#### Scenario: 标题画面显示联机按钮
- **WHEN** 用户进入标题画面
- **THEN** 在"离线模式"按钮上方显示"联机模式"按钮
- **AND** 按钮使用 `hand-drawn-btn` 样式，带 Globe 图标
- **AND** 版本号显示 "v2.0.0 Multiplayer"

### Requirement: 游戏内社交入口
系统 SHALL 在游戏 HUD 中提供社交面板入口。

#### Scenario: HUD 社交按钮
- **WHEN** 用户在游戏内（非沉浸模式）
- **THEN** 在 PlayerPanel 右侧显示社交按钮（Users 图标 + 未读消息红点）
- **AND** 按钮使用 `hand-drawn-btn hand-drawn-ghost` 样式（与现有 HUD 按钮统一）

### Requirement: 串门体验
系统 SHALL 提供串门访问他人岛屿的完整体验。

#### Scenario: 访问他人岛屿
- **WHEN** 用户在社交面板岛屿标签页点击公开岛屿
- **THEN** 显示手绘风格加载界面（VisitOverlay），包含岛屿名称、岛主名称、加载动画
- **AND** 通过 Socket.IO 获取岛屿数据后，将岛屿数据加载到当前场景
- **AND** 加载界面显示"正在前往 {岛屿名}..."文字和手绘风格罗盘动画

#### Scenario: 串门加载失败
- **WHEN** 串门请求返回错误（岛屿不存在/私有）
- **THEN** 显示手绘风格错误提示（`.stamp` 样式），2秒后自动关闭

#### Scenario: 退出串门
- **WHEN** 用户在串门模式下点击返回按钮
- **THEN** 恢复到自己的岛屿数据，关闭 VisitOverlay

### Requirement: 在线通知
系统 SHALL 在好友上线/下线时显示 toast 通知。

#### Scenario: 好友上线通知
- **WHEN** 好友上线（Socket.IO `user:online` 事件）
- **THEN** 在屏幕右上角显示手绘风格 toast 通知，包含好友头像和"xxx 上线了"文字
- **AND** 通知 3 秒后自动消失，使用 `animate-in slide-in-from-right-4` 入场动画

#### Scenario: 好友下线通知
- **WHEN** 好友下线（Socket.IO `user:offline` 事件）
- **THEN** 显示类似 toast，文字为"xxx 离开了"

#### Scenario: 好友请求通知
- **WHEN** 收到好友请求（Socket.IO `friend:request_received` 事件）
- **THEN** 显示 toast 通知"xxx 请求添加你为好友"

### Requirement: 未读消息红点
系统 SHALL 在社交按钮上显示未读消息数量。

#### Scenario: 显示未读数
- **WHEN** 用户有未读聊天消息
- **THEN** 社交按钮右上角显示红色圆形数字角标
- **AND** 数字使用 `bg-red-500 text-white text-[10px] font-bold` 样式

#### Scenario: 清除未读数
- **WHEN** 用户打开社交面板聊天标签页
- **THEN** 清除未读消息计数

### Requirement: 联机存档同步
系统 SHALL 在联机模式下允许用户将本地存档部署到服务器。

#### Scenario: 部署岛屿到服务器
- **WHEN** 用户在联机模式的存档选择界面点击"部署到服务器"
- **THEN** 调用 `api.createIsland()` 将当前存档数据上传
- **AND** 按钮使用 `hand-drawn-btn` 样式，带 Globe 图标
- **AND** 部署成功后显示 `.stamp` 样式"已部署"标记

#### Scenario: 同步岛屿数据
- **WHEN** 用户在游戏中保存岛屿且已登录
- **THEN** 自动调用 `api.updateIsland()` 将最新数据同步到服务器
- **AND** 同步失败时静默处理，不影响本地保存

### Requirement: 设置页面更新
系统 SHALL 在设置中更新版本号并添加联机相关设置。

#### Scenario: 版本号更新
- **WHEN** 用户查看 PlayerPanel System 标签页
- **THEN** 显示版本号 "v2.0.0 Multiplayer"

#### Scenario: 联机状态显示
- **WHEN** 用户已登录
- **THEN** System 标签页显示当前登录用户名和在线状态
- **AND** 提供"退出登录"按钮（与 SocialPanel 的退出功能一致）

## MODIFIED Requirements

### Requirement: GameScreen 类型
`GameScreen` 类型 SHALL 从 `'TITLE' | 'SAVE_SELECT' | 'PLAYING'` 修改为 `'TITLE' | 'LOGIN' | 'SAVE_SELECT' | 'PLAYING'`。

### Requirement: Store 认证状态
GameState SHALL 新增 `authUser: AuthUser | null`、`setAuthUser`、`clearAuthUser` 字段。

### Requirement: Store 通知状态
GameState SHALL 新增 `toasts: Toast[]`、`addToast`、`removeToast` 字段用于管理通知。

### Requirement: Store 串门状态
GameState SHALL 新增 `visitingIsland: VisitingIsland | null`、`setVisitingIsland` 字段用于管理串门状态。

### Requirement: Store 未读消息
GameState SHALL 新增 `unreadCount: number`、`setUnreadCount` 字段用于管理未读消息计数。
