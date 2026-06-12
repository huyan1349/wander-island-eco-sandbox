# Tasks

- [x] Task 1: 修改 store.ts — 添加认证状态和 LOGIN 屏幕类型
  - [x] 1.1: `GameScreen` 类型添加 `'LOGIN'`
  - [x] 1.2: 添加 `AuthUser` 接口（id, username, avatar）
  - [x] 1.3: GameState 添加 `authUser`, `setAuthUser`, `clearAuthUser`
  - [x] 1.4: 初始状态 `authUser: null`，`clearAuthUser` 清除 authUser 并跳转 LOGIN

- [x] Task 2: 重写 LoginScreen.tsx — 手绘风格登录/注册界面
  - [x] 2.1: 使用 `hand-drawn-panel` 作为主面板，`cinematic-vignette` 背景
  - [x] 2.2: ZCOOL KuaiLe 标题"漫游小岛"，副标题"ONLINE · MULTIPLAYER"
  - [x] 2.3: 登录/注册模式切换（手绘风格 toggle）
  - [x] 2.4: 用户名/密码输入框（手绘风格，`hand-drawn-panel` 底色 + 黑边）
  - [x] 2.5: 提交按钮（`hand-drawn-btn`，emerald 渐变图标）
  - [x] 2.6: 错误提示（红色 `.stamp` 风格）
  - [x] 2.7: 登录成功后调用 `api.setToken` + `connectSocket` + `setAuthUser` + `setScreen('SAVE_SELECT')`
  - [x] 2.8: 返回按钮回标题画面

- [x] Task 3: 重写 SocialPanel.tsx — 手绘风格社交面板
  - [x] 3.1: 全屏模态（同 PlayerPanel 的 `fixed inset-0 z-[100]` + `bg-slate-950/40 backdrop-blur-sm`）
  - [x] 3.2: 侧边栏布局（同 PlayerPanel：`w-56 border-r-2 border-slate-800`）
  - [x] 3.3: 侧边栏内容：用户头像+名称+在线状态、好友/聊天/岛屿三个 tab 按钮、退出登录按钮
  - [x] 3.4: 好友标签页：搜索框 + 搜索结果列表 + 好友请求区 + 好友列表（含在线绿点）
  - [x] 3.5: 聊天标签页：聊天对象头部 + 消息列表 + 输入框
  - [x] 3.6: 岛屿标签页：我的岛屿网格 + 公开岛屿网格（同 SaveSelectScreen 卡片风格）
  - [x] 3.7: 所有按钮/面板/卡片统一使用 `hand-drawn-btn` / `hand-drawn-panel` 样式
  - [x] 3.8: 集成 Socket.IO 实时事件（聊天消息、好友通知、在线状态）

- [x] Task 4: 修改 TitleScreen.tsx — 添加联机入口
  - [x] 4.1: 在主菜单添加"联机模式"按钮（Globe 图标，`hand-drawn-btn` 样式），位于"离线模式"上方
  - [x] 4.2: 点击"联机模式"跳转 `setScreen('LOGIN')`
  - [x] 4.3: 更新版本号为 "v2.0.0 Multiplayer"

- [x] Task 5: 修改 store.ts — 添加通知/串门/未读状态
  - [x] 5.1: 添加 `ToastItem` 接口（id, message, type, createdAt）
  - [x] 5.2: 添加 `toasts: ToastItem[]`, `addToast(message, type?)`, `removeToast(id)` 
  - [x] 5.3: 添加 `VisitingIsland` 接口（islandId, islandName, ownerName, data）
  - [x] 5.4: 添加 `visitingIsland: VisitingIsland | null`, `setVisitingIsland`
  - [x] 5.5: 添加 `unreadCount: number`, `setUnreadCount`

- [x] Task 6: 新建 Toast.tsx — 手绘风格通知组件
  - [x] 6.1: 右上角固定定位，`hand-drawn-panel` 样式
  - [x] 6.2: 支持 slide-in-from-right 入场动画，3秒自动消失
  - [x] 6.3: 不同类型图标（好友上线/下线/好友请求）
  - [x] 6.4: 从 store 读取 toasts 列表渲染

- [x] Task 7: 新建 VisitOverlay.tsx — 串门加载/展示界面
  - [x] 7.1: 全屏覆盖，`cinematic-vignette` 背景
  - [x] 7.2: 手绘风格罗盘/指南针加载动画（CSS 旋转动画）
  - [x] 7.3: "正在前往 {岛屿名}..." 文字，ZCOOL KuaiLe 字体
  - [x] 7.4: 岛主信息展示
  - [x] 7.5: 返回按钮（恢复自己岛屿数据）
  - [x] 7.6: 错误状态展示（通过 addToast 显示）

- [x] Task 8: 修改 App.tsx — 核心集成
  - [x] 8.1: 导入 LoginScreen、SocialPanel、Toast、VisitOverlay 组件
  - [x] 8.2: 添加 `{screen === 'LOGIN' && <LoginScreen />}` 渲染
  - [x] 8.3: 在游戏 HUD 的 PlayerPanel 旁边添加 SocialPanel 组件
  - [x] 8.4: 添加自动登录 useEffect（检查 localStorage token，验证后自动进入）
  - [x] 8.5: 添加 Toast 渲染区域（右上角）
  - [x] 8.6: 添加 VisitOverlay 渲染（visitingIsland 存在时显示）
  - [x] 8.7: 添加 Socket.IO 事件监听（user:online/offline, friend:request_received）→ addToast
  - [x] 8.8: 添加未读消息轮询（定时调用 api.getUnreadCount）
  - [x] 8.9: 保存岛屿时同步到服务器（authUser 存在时调用 api.updateIsland）

- [x] Task 9: 修改 SaveSelectScreen.tsx — 联机存档部署
  - [x] 9.1: 在联机模式下（authUser 存在），每个存档卡片添加"部署到服务器"按钮
  - [x] 9.2: 按钮使用 Globe/Check 图标，手绘风格
  - [x] 9.3: 点击后调用 `api.createIsland()` 上传存档数据
  - [x] 9.4: 部署成功后显示"已部署"标记
  - [x] 9.5: 已部署的存档显示同步状态（serverIslandMap 映射持久化）

- [x] Task 10: 修改 PlayerPanel.tsx — 设置页联机信息
  - [x] 10.1: System 标签页添加版本号 "v2.0.0 Multiplayer"
  - [x] 10.2: 已登录时显示当前用户名和在线状态
  - [x] 10.3: 已登录时添加"退出登录"按钮
  - [x] 10.4: 未登录时显示"离线模式"提示

- [x] Task 11: 修改 index.css — 添加 toast 动画
  - [x] 11.1: 添加 toast 入场动画 keyframes（slideInFromRight）
  - [x] 11.2: 添加 toast 退场动画 keyframes（slideOutToRight）
  - [x] 11.3: 添加罗盘旋转动画 keyframes（compassSpin）

# Task Dependencies
- Task 5 是 Task 6/7/8 的前置依赖（store 状态必须先更新）
- Task 6 和 Task 7 可以并行开发（无相互依赖）
- Task 8 依赖 Task 5/6/7 全部完成
- Task 9 和 Task 10 可以并行开发（无相互依赖）
- Task 8 是 Task 9/10 的前置依赖（App 集成必须先完成）
