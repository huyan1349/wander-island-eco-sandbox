# Handoff

## 已完成
1. **v2.2.0 Touch — 手机端深度优化**
   - PWA: manifest.json (standalone/landscape), 自动全屏(首次触摸), 禁止手势缩放
   - GameCanvas: 双指旋转缩放+阻尼, 触屏隐藏WASD (无虚拟摇杆,无性能降级)
   - App.tsx: 全屏按钮(触屏专用), 工具栏按钮加大(14x14), touch tooltip, safe-area
   - SocialPanel/PlayerPanel: 触屏全屏+底部Tab导航
2. **BGM系统** — `<audio>`元素播放（MEI策略），淡入淡出切换，ensureResumed()解锁
3. **加载界面(LoadingScreen) — 左右分栏布局**
   - 左边(45%): 音乐卡片轮播，复用MusicLibrary的TRACKS数据和renderTrackTexture
   - 卡片自动切换(6秒)，支持手动翻页、点击翻面查看故事
   - 背景光晕跟随当前卡片渐变色变化
   - 导航圆点 + 前后翻页按钮
   - 右边(55%): 安装列表+进度条+验证+Enter按钮（保持原逻辑不变）
   - 移动端: 隐藏左侧音乐卡片，右侧全宽显示
   - 预加载: 5首BGM + 8字体 + 3图片，三阶段流程 install→verify→ready
   - 首次访问显示，再次访问跳过（localStorage）
   - 点击Enter自动全屏 + 解锁AudioContext + 播放BGM
4. **管理后台** — 高级极简暗色主题, 7日活跃趋势图, 在线岛民, 活动Feed, 公告广播
5. **品牌元素** — 启元开物Logo, HUYAN版权, SmoothZoomControls
6. **服务器部署** — GitHub Release + ghproxy镜像 + 阿里云云助手，域名 wander.qiyuankaiwu.com

## 服务器
- **域名**: https://wander.qiyuankaiwu.com（Cloudflare CDN + HTTPS）
- 管理后台: https://wander.qiyuankaiwu.com/admin.html
- IP: 121.41.239.12（有反爬虫规则，curl被拦截，浏览器正常）
- InstanceId: i-bp1foxoouc62tsvy69rn
- PM2: PORT=8080 npm start

## 未完成
- 手机实机验证（需iPad/手机测试）
- 生态点重构（计划已制定，未执行）
- 生态系统2.0（食物链/动物AI/作物生长）
- Assets.tsx 拆分重构（2900行过大）
- 性能优化（LOD/实例化/海洋分辨率自适应）
- 登录引导功能（首次进入引导登录，已登录欢迎回来弹窗）
