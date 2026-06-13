# Handoff

## 已完成
1. 字体本地化 — Google Fonts 改为本地 woff2，国内可正常显示
2. 管理员后台 — http://121.41.239.12/admin.html
   - 用 wander_admin / admin123 登录
   - **全新高级极简暗色主题** — 深色背景 + coral/sage/sky 强调色
   - 总览页：8项统计指标 + 7日活跃趋势图 + 最近动态Feed + 在线岛民 + 公告发送
   - 岛民/岛屿/对话/信箱/漂流瓶/系统 7个页面
   - 支持搜索用户、删除用户、分页、30秒自动刷新
3. Admin API 增强：
   - `/api/admin/overview` — 新增 onlineCount, activity(7日趋势), recentActivity
   - `/api/admin/online` — 在线用户列表(5分钟内活跃)
   - `/api/admin/users/:id/messages` — 用户消息记录
   - `/api/admin/announce` — POST 广播公告到所有岛民信箱
4. 修复 JWT_SECRET 不一致导致 admin API 认证失败
5. 修复 SQLite 双引号字符串比较错误
6. 服务器重新部署完成（通过 GitHub Release + 云助手）

## 服务器
- 游戏: http://121.41.239.12
- 管理后台: http://121.41.239.12/admin.html
- SSH: root@121.41.239.12 密码: Wander@Island2026!
- PM2: wander-island (pid 4132, online)
- 实例: i-bp1foxoouc62tsvy69rn (cn-hangzhou)

## 未完成
- SSH 从本机仍被拒（fail2ban已无封禁，可能是其他防火墙规则）
- 可通过阿里云云助手执行命令（aliyun ecs RunCommand）
