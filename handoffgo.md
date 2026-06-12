# Handoff Notes

## Completed
- App.tsx 多人联机核心集成完成
  - 添加 LoginScreen, SocialPanel, Toast, VisitOverlay 组件导入
  - 添加 api, socket (connectSocket, onUserOnline, onUserOffline, onFriendRequest, onIslandVisitData, onIslandVisitError) 导入
  - 添加 store 状态读取: authUser, setAuthUser, addToast, visitingIsland, setVisitingIsland, setUnreadCount, serverIslandMap, setServerIslandMap, islandId
  - 添加自动登录 useEffect (从 saved token 恢复登录)
  - 添加 Socket.IO 事件监听 useEffect (上线/离线/好友请求/串门数据/串门错误)
  - 添加未读消息轮询 useEffect (15秒间隔)
  - 添加服务器同步 useEffect (60秒间隔同步岛屿数据到服务器)
  - JSX 渲染添加: LoginScreen, SocialPanel, Toast, VisitOverlay
- SaveSelectScreen.tsx 联机存档部署功能完成
  - 添加 api, Globe, Check 导入
  - 添加 store 状态读取: authUser, serverIslandMap, setServerIslandMap
  - 添加部署状态: deployingId, deployedIds
  - 添加 handleDeploy 函数 (创建/更新服务器岛屿，持久化映射)
  - useEffect 中加载 serverIslandMap 映射
  - 存档卡片添加部署按钮 (Globe/Check 图标，仅登录用户可见)
  - 已部署存档显示"已部署"绿色标记
- Git 已提交并推送

## Not Completed
- Toast 组件和 VisitOverlay 组件的具体实现（已导入但可能需要确认组件文件存在）
- store.ts 中需要确认 authUser, visitingIsland, serverIslandMap, addToast, setUnreadCount 等状态已定义
- 实际联机测试需要后端服务器运行

## How to Run
```bash
npm run server    # 后端 localhost:3001
npm run dev       # 前端 localhost:3000
```
