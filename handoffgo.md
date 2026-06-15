# Handoff

## 已完成
- **详细计划A · 岛灵辞AI重构** — 全部 6 个 STEP 已完成
  - STEP 2: `src/lib/ciProgress.ts` 新建（好感度/记忆 localStorage 持久化）；`store.ts` 增加 `ci` 状态对象 + `ciSay`(8s节流) + `addAffinity` + `setCiBubble` + `clearCiBubble`
  - STEP 1: `src/components/CiSpirit.tsx` 新建（左下角2D浮层+头像+手绘气泡+8s淡出+点击打开社交面板）；挂载到 `App.tsx` PLAYING 屏幕
  - STEP 3: `src/hooks/useCiProactive.ts` 新建（进岛欢迎/生态事件/放置物件/重复操作建议/idle计时器/好感等级变化）；`src/game/ci/lines.ts` 新建（本地文案库，按事件类型分桶）
  - STEP 4: 好感度分级(stranger/familiar/close) + 记忆系统 + 后端 prompt 注入好感等级和记忆摘要
  - STEP 5: 环境存在感（天气/时间/季节变化触发，60s间隔限制）— 已在 useCiProactive 中实现
  - STEP 6: `server/ciLines.ts` 新建（服务端本地文案库+动态prompt构建+兜底）；重构 `server/socket.ts` 辞聊天（注入好感/记忆/上下文）；重构 `server/index.ts` `/api/generate-event`（动态prompt+成本控制max_tokens:80+本地文案兜底）；前端 `fetchAiNarration` 注入 affinityLevel/memorySummary/islandName/season + 前端兜底
  - 版本号更新至 v2.3.0 岛灵辞，设置页面增加辞的好感度面板
  - `vite build` 通过

## 未完成
- tsc 有 2 个预存错误（BrushOptions 缺少 falloff 属性），非本次修改引入
- 辞的 3D 漂浮小灵形象（文档提到后续可升级为 drei `<Html>`/sprite，当前为 2D 浮层）
