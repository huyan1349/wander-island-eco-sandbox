# Handoff

## 已完成
1. **v2.2.0 Touch — 手机端深度优化**
   - PWA: manifest.json (standalone/landscape), 自动全屏(首次触摸), 禁止手势缩放
   - GameCanvas: 双指旋转缩放+阻尼, 触屏隐藏WASD (无虚拟摇杆,无性能降级)
   - App.tsx: 全屏按钮(触屏专用), 工具栏按钮加大(14x14), touch tooltip, safe-area
   - SocialPanel: 触屏全屏+底部Tab导航, 桌面端保持侧边栏
   - PlayerPanel: 触屏全屏+底部Tab导航, 桌面端保持侧边栏
   - SaveSelectScreen: 手机端单列布局, 桌面端3列
   - TitleScreen: 标题字号适配, 菜单按钮全宽, 模态框
2. **BGM系统** — AudioSystem: loadBGM/playBGM/stopBGM/switchBGM, 淡入淡出切换
   - 标题页: Tides_of_Mahogany.mp3
   - 岛屿内: Glockenspiel_Sunprint.mp3
3. **管理后台** — 高级极简暗色主题, 7日活跃趋势图, 在线岛民, 活动Feed, 公告广播
4. **品牌元素** — 启元开物Logo, HUYAN版权, SmoothZoomControls
5. **服务器部署修复**
   - 403问题: Nginx反爬虫规则拦截curl UA, 域名访问正常
   - 启动脚本: 添加 `npm start` → `tsx server/index.ts`（之前回退到旧server.js）
   - 端口: PM2必须设PORT=8080（Nginx代理80→8080）
   - 统一使用域名 wander.qiyuankaiwu.com

## 服务器
- **域名**: https://wander.qiyuankaiwu.com（Cloudflare CDN + HTTPS）
- 管理后台: https://wander.qiyuankaiwu.com/admin.html
- IP: 121.41.239.12（有反爬虫规则，curl被拦截，浏览器正常）
- InstanceId: i-bp1foxoouc62tsvy69rn
- 部署方式: GitHub Release + ghproxy镜像 + 阿里云云助手
- PM2: PORT=8080 npm start

## 未完成
- 手机实机验证（需iPad/手机测试）
- 生态点重构（计划已制定，未执行）
- 生态系统2.0（食物链/动物AI/作物生长）
- Assets.tsx 拆分重构（2900行过大）
- 性能优化（LOD/实例化/海洋分辨率自适应）
- 登录引导功能（首次进入引导登录，已登录欢迎回来弹窗）
