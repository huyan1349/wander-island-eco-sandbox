# Handoff

## 已完成 (部署批次)
1. **生产部署支持** — Express 添加 dist/ 静态文件服务和 SPA fallback
2. **CORS 更新** — 支持 CLIENT_ORIGIN 环境变量，生产环境允许所有来源
3. **API_BASE 改为相对路径** — 前端生产环境使用同源请求，不再硬编码 localhost:3001
4. **代理可选化** — DeepSeek API 代理不再硬编码，服务器无代理时直连
5. **阿里云 ECS 部署完成** — 服务器 121.41.239.12:80 通过 Nginx 反向代理到 8080 端口
6. **PM2 进程管理** — wander-island 进程运行在 8080 端口，已保存配置
7. **Nginx 反向代理** — 80 端口代理到 8080，支持 WebSocket 升级
8. **代码已推送到 GitHub main 分支**

## 部署信息
- 访问地址: http://121.41.239.12
- 后端端口: 8080 (PM2 管理)
- Nginx: 80 → 8080 反向代理
- .env.local: DEEPSEEK_API_KEY + CLIENT_ORIGIN + PORT=8080 (无代理，直连DeepSeek)
- PM2 进程名: wander-island

## 未完成
- 无
