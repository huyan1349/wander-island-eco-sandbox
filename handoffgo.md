# Handoff

## 已完成
1. Bug修复批次（8个bug）：头像代理、FormData、AI回复、在线状态、embedded模式等
2. **部署到阿里云服务器** ✅
   - 服务器: 121.41.239.12 (4C/8G Ubuntu 24.04)
   - 访问地址: http://121.41.239.12
   - Nginx 反向代理 80→8080，支持 WebSocket
   - PM2 进程管理，自动重启
   - 数据库已初始化（wander_admin/admin123 + AI角色"辞"）
   - DeepSeek API 在阿里云直连，无需代理

## 服务器信息
- SSH: root@121.41.239.12 密码: Wander@Island2026!
- 项目路径: /root/wander-island
- PM2 进程名: wander-island
- 常用命令: `pm2 restart wander-island` / `pm2 logs wander-island`
- 数据库: /root/wander-island/data/wander-island.db

## 未完成
- 无
