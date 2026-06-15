# 详细计划 A · 岛灵「辞」AI 重构（DeepSeek 已接入，重在"存在感+主动性+关系"）

> 项目：`/Users/huyan/Desktop/wander-island_-eco-sandbox`
> 现状：DeepSeek 已接入，但辞被动、无形象、用户不知它存在。
> 目标（对标陪伴 AI 共识）：**就近主动 + 好感升温 + 环境存在感 + 记忆**。
> 每个 STEP 完成跑 `npx tsc --noEmit` + `npx vite build`。风格用 `hand-drawn-*`，勿碰 index.css。

## 0. 现有锚点（已确认）
- 前端调用：`src/App.tsx` 的 `fetchAiNarration()` → `POST /api/generate-event`
  body: `{ timeOfDay, weather, grassHealth, deerCount, wolfCount, assetsCount, userMessage }`
  → store `aiNarration / setAiNarration`。
- 后端：`grep -rn "generate-event\|deepseek\|DEEPSEEK\|api.deepseek" server` 定位接口与 key。
- 辞头像：`/ci-avatar.png`（已有）；辞作为 AI 好友：`server/seed.ts` 里 CI 用户，
  PlayerPanel 聊天 tab 已能和辞对话（`is_ai`）。
- 聊天后端：`grep -rn "is_ai\|ci\b\|辞" server` 找辞的回复生成处。

---

## STEP 1 · 让玩家"看见"辞（存在感）★最优先
新建 `src/components/CiSpirit.tsx`，在 `App.tsx` 游戏内挂载（`screen==='PLAYING'`）。
- **形象**：先做**屏幕左下/角落的 2D 浮层**最快（用 `/ci-avatar.png` + 手绘气泡）；
  后续可升级为 3D 漂浮小灵（drei `<Html>`/sprite）。
- **气泡**：读 store `ci.bubble`（见 STEP 2 的 store 字段）。非空时显示手绘气泡，
  约 8s 自动淡出 + 可点关闭。⚠️ 定时器只依赖 `ci.bubbleAt`，**别犯之前"effect cleanup
  把定时器清掉导致不消失"的 bug**（参考已修好的 AchievementSystem 写法）。
- 点击辞 → 打开 PlayerPanel 的社交/聊天并定位到辞（复用 `setOpenPlayerPanel`+`setPanelInitialTab('social')`）。

## STEP 2 · store 增 辞 状态（若 P0 已加则跳过）
`src/store.ts`：
```ts
ci: { affinity: number; lastSpokenAt: number; memory: string[]; bubble: string|null; bubbleAt: number };
ciSay: (line) => 节流8s 设 bubble+bubbleAt+lastSpokenAt;
addAffinity: (n) => ...; setCiBubble: (s) => ...;
```
持久化：`ci.affinity / memory` 存全局 localStorage（账号级，跨岛），参考 `globalProgress.ts`。

## STEP 3 · 主动性（Proactive，事件驱动）★核心
辞在这些时机**主动冒泡**（调 `ciSay`），且全部走 8s 节流避免刷屏：
- 进岛首次：欢迎 + 回扣记忆（"这座岛一直记得你"）。
- 呼应系统事件：完成"小景"、生态链触发（鹿来了）、等级提升、集齐成就。
- 反复在同一处放/删 → 给个温柔建议（"要不试试把它挪到水边？"）。
- 长时间无操作（idle 计时器，如 90s）→ 来一句陪伴的话。
> 这些时机大多来自呼应引擎（见 P0 计划），辞订阅这些事件即可。

## STEP 4 · 好感升温 + 记忆（关系成长）
- `affinity` 随互动累加（对话、被点击、完成小景 +n）。
- 文案语气随 affinity 分级注入后端 prompt：
  `0-20 礼貌疏离 / 21-60 熟稔 / 61+ 亲近老友`。
- 记忆：记录岛名、玩家常做的事、口头禅 → `ci.memory[]`，对话时摘要注入 prompt，
  让辞自然回扣（"你又在种樱花了呀"）。

## STEP 5 · 环境存在感（Ambient，低频治愈）
- 清晨道早安、雨天感慨、入夜点亮萤火虫时说一句、季节更替感叹。
- 频率很低（每 In-game 时段最多一次），用 timeOfDay/weather/season 变化触发。

## STEP 6 · 后端 prompt 与成本/兜底（重要）
后端 `/api/generate-event`（和辞聊天接口）重做 system prompt：
- **人设**：辞 = 漫游岛的岛灵，温柔、诗意、简短（1~2 句）、不说教、用中文。
- **上下文注入**：岛名 + 季节/天气/时间 + 最近触发事件(小景/生态) + affinity 等级 + 记忆摘要。
- **成本控制**：前端节流 + 后端对"主动旁白"做短 max_tokens；高频环境句优先用**本地文案库**
  （只在重要时刻才真调 DeepSeek）。
- **兜底**：API 失败/超时 → 回退本地文案库（按事件类型分桶的固定诗句），保证辞永远"在"。
- 新建 `server` 本地文案库 + `src/game/ci/lines.ts`（前端兜底/环境句）。

## 分工
- **强 AI**：STEP 1~4、6（形象、主动触发、关系、prompt 架构——设计敏感）。
- **GLM 苦工**：STEP 5 环境句 + 扩充本地文案库（大量分桶诗句，照模板填）。

## 验证
- 进岛能看见辞 + 主动气泡；完成"樱下小憩"时辞说话；多互动后语气变亲近；
- 断网时辞用本地文案兜底不报错；`tsc`+`build` 通过。

## 参考
- 陪伴 AI / 主动性: https://interconnected.org/home/2023/09/01/npcs
- From AI NPC to AI Game Companion: https://dev.to/susiewang/from-ai-npc-to-ai-game-companion-7l3
