# Handoff · v2.3.0 开场仪式

## 本次完成

**任务：** 把项目气质往"独立游戏 / 艺术品"方向推进，第一步落地「电影感开场仪式」。

**新增 / 修改文件：**
- `src/components/OpeningSequence.tsx`（新增）—— 28 秒无交互 Canvas 2D 电影感开场，6 个节拍：黑屏诗 → 云海下仰视 → 穿云 → 岛屿浮现 → 辞梦呓 → 标题。BGM 渐入到 `Before_the_First_Snow.mp3`。按 ESC / 空格 / 点击可跳过。
- `src/App.tsx` —— 在 LoadingScreen 完成后、TitleScreen 之前插入 OpeningSequence。基于 `wander-opening-seen` localStorage 标记只播一次；`wander_title_skip_intro` 优先级最高。
- `src/components/TitleScreen.tsx` —— 检测 `wander-opening-seen`，若已播过则跳过原本的 AUTHOR→TITLE splash，避免情绪重复。版本号 v2.2.0 → v2.3.0。
- `src/components/SettingsModal.tsx` —— gameplay tab 新增「重放开场仪式」按钮，清除 localStorage 标记后刷新即可重看。
- `package.json` —— version 2.1.0 → 2.3.0。

**保留不变：**
- 现有 GameScreen 状态机（未新增 screen 类型）
- LoadingScreen 流程、TitleScreen 主菜单、所有 gameplay 逻辑
- 多人社交系统全部保留（用户明确要求）
- 存档格式、生态引擎、音频引擎 API

**验证：**
- `npm run lint` ✓
- `npm run test` ✓ 23/23
- `npm run build` ✓ 3.76s，主包 396KB / gzip 122KB

## 未完成（建议下一棒优先级）

按 ROI 排序：
1. **砍 UI + 色彩宪法**（A+D）—— 默认隐藏所有 HUD，每种地貌锁定 1 主色 + 1 强调色 + 1 禁忌色
2. **辞的环境化**（B）—— 把辞的对话从弹窗改成环境书写 / 光影，强化核心机制
3. **无目标结尾序列**（F）—— 集齐 6 张音乐卡 + 生态极佳 7 天 → 触发 2 分钟告别序列

## 分支信息

- 分支：`feature/opening-cinematic-v2.3`
- PR：待创建

## 给下一棒 AI 的提示

- OpeningSequence 是纯 Canvas 2D，没有 Three.js 依赖，改起来很安全
- 字幕文案在 `OpeningSequence.tsx` 顶部 `SUBTITLES` / `WHISPERS` 常量，改文案不影响逻辑
- 节拍时间轴在 `PHASE` 常量，调整时长只改这里
- `wander-opening-seen` 是控制只播一次的 key，开发时可在 DevTools 清除
