# Handoff

## 已完成
1. 字体本地化 — Google Fonts 改为本地 woff2，国内可正常显示
2. 管理员后台 — http://121.41.239.12/admin.html
   - 用 wander_admin / admin123 登录
   - 总览/用户管理/岛屿管理/聊天记录/信箱/漂流瓶/服务器状态
   - 支持搜索用户、删除用户、分页
3. 修复 JWT_SECRET 不一致导致 admin API 认证失败
4. 修复 SQLite 双引号字符串比较错误

## 服务器
- 游戏: http://121.41.239.12
- 管理后台: http://121.41.239.12/admin.html
- SSH: root@121.41.239.12 密码: Wander@Island2026!
- PM2: wander-island
