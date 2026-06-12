# Handoff Notes

## Completed
- 后端服务器完整搭建 (Express + Socket.IO + SQLite + JWT)
  - `server/index.ts` - 主入口，整合所有路由和 Socket.IO
  - `server/db.ts` - SQLite 数据库初始化（users, islands, friends, chat_messages）
  - `server/auth.ts` - JWT 认证中间件
  - `server/routes/auth.ts` - 注册/登录/获取当前用户
  - `server/routes/islands.ts` - 岛屿 CRUD + 公开浏览
  - `server/routes/friends.ts` - 好友系统（搜索/请求/接受/拒绝/删除）
  - `server/routes/chat.ts` - 聊天消息（发送/获取/未读计数）
  - `server/socket.ts` - Socket.IO 实时通信（聊天/串门/在线状态/好友通知）
- 前端辅助文件已创建（未修改现有前端代码）：
  - `src/lib/api.ts` - API 客户端封装
  - `src/lib/socket.ts` - Socket.IO 客户端封装
  - `src/components/LoginScreen.tsx` - 登录/注册界面
  - `src/components/SocialPanel.tsx` - 社交面板（好友/聊天/岛屿浏览）
- 所有 12 个 API 端点测试通过
- 版本号更新至 v2.0.0
- 已推送到 GitHub: https://github.com/huyan1349/wander-island-eco-sandbox

## Not Completed
- 前端集成：需要将 LoginScreen/SocialPanel 接入 App.tsx 和 store.ts（用户要求暂不动前端）
- 前端 store.ts 需要添加 authUser 状态和 LOGIN screen 类型
- Socket.IO 前端连接需要在 App.tsx 中初始化

## How to Run
```bash
# 启动后端
npm run server    # 运行在 localhost:3001

# 启动前端
npm run dev       # 运行在 localhost:3000
```

## API Endpoints
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- GET /api/auth/me - 获取当前用户
- GET /api/islands - 浏览公开岛屿
- GET /api/islands/my - 我的岛屿
- POST /api/islands - 创建岛屿
- PUT /api/islands/:id - 更新岛屿
- DELETE /api/islands/:id - 删除岛屿
- GET /api/friends - 好友列表
- GET /api/friends/requests - 好友请求
- POST /api/friends/request - 发送好友请求
- POST /api/friends/accept - 接受好友请求
- POST /api/friends/reject - 拒绝好友请求
- DELETE /api/friends/:userId - 删除好友
- GET /api/friends/search/:query - 搜索用户
- GET /api/chat/:userId - 获取聊天记录
- POST /api/chat - 发送消息
- GET /api/chat/unread/count - 未读消息数
- GET /api/stats - 服务器统计
- POST /api/generate-event - AI 旁白（保留原功能）
