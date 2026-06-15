# 详细计划 B · 生态系统 / 动物重构

> 项目：`/Users/huyan/Desktop/wander-island_-eco-sandbox`
> 业主反馈：海鸥✅保留；金鱼建模糙；鹿/狼**移动轨迹不对 + 建模糙**。
> 每个 STEP 完成跑 `npx tsc --noEmit` + `npx vite build`。勿碰 index.css。

## 0. 现有锚点 + 问题诊断（已看代码确认）
- 动物组件都在 `src/components/Assets.tsx`：
  `Deer`(613)、`Wolf`(851)、`Dolphin`(2506)、`FishSchool`(2584)、`Seagull`(2637)。
- 行走辅助：`isWalkable`(575)、`getWalkableHeight`(594)、`getTerrainHeight/getTerrainGradient`(`utils/terrain.ts`)。
- **移动轨迹为什么不对**（Deer/Wolf 同病，根因明确）：
  1. 用 `lerp(current, target, delta*speed)`（745行）——这是**指数缓动**，动物永远在
     "减速逼近"，没有恒定速度、没有真实寻路 → 飘、黏、慢。
  2. 撞到不可走点直接 `targetPos.copy(current)` **急停**（752行）→ 卡顿/抽搐。
  3. 腿摆频率按固定 `speed` 算，但身体在减速 → **明显滑步**（脚不跟地）。
  4. 朝向用 `children[1..5]` 数字索引头/腿，脆且难维护。
- 建模：纯手写低多边形 box 拼接，比例粗糙、无平滑、无骨骼动画。

---

## STEP 1 · 抽出共享"生物运动"模块（修轨迹，最高价值）★
新建 `src/game/creatures/locomotion.ts`，导出 `stepCreature(state, dt, cfg)`，被 Deer/Wolf 复用：
- **恒定速度 seek + 到达减速(arrival)**：朝 target 的单位方向，按 `cfg.speed` 匀速前进；
  距 target < arriveRadius 时线性减速到 0（而不是全程指数缓动）。
- **避障转向(steer)**：前方探测点不可走时，不急停，而是**左右偏转**寻找可走方向
  （试 ±30°/±60°），找不到才停一帧并换目标。
- **地形贴合 + 坡度对齐**：y = `getWalkableHeight`；用 `getTerrainGradient` 让身体 pitch/roll
  贴合坡面（轻量），避免悬浮/扎地。
- **朝向平滑**：限制最大转向角速度（rad/s），转弯自然不打滑。
- **腿部步频与位移挂钩**：`legPhase += 实际位移 / 步长`，**位移驱动**腿摆 → 不再滑步；
  静止 idle 腿不动。
- **自然游荡**：用"航向角缓慢漂移(heading drift / 噪声)"代替"随机远点目标"，路径更顺。
- cfg 参数化：`{ speed, runSpeed, turnRate, arriveRadius, stepLength, fleeSpeed }`。

➡️ 把 Deer(613)、Wolf(851) 的 useFrame 移动段替换为调用 `stepCreature`，保留各自 AI 状态机
（wander/eat/flee）只负责"设定 target 与 state"，**移动/朝向/腿摆交给模块**。

➡️ 验证：鹿/狼匀速行走、转弯自然、不滑步、不悬浮、撞物会绕行。

## STEP 2 · 动物建模升级（两条路，二选一，建议 A）
**路线 A（推荐，质量跃升）：导入 rigged 低多边形 glTF**
- 选免费可商用的低多边形动物包（鹿/狼/鱼，含 idle/walk/run 动画），放 `public/models/`。
  候选见参考链接（itch.io / Fab / Quaternius 风格 CC0）。
- 用 `useGLTF` + `useAnimations`（drei）加载；按 STEP1 的 state 切 idle/walk/run 动画 clip。
- 保留 STEP1 的位移逻辑，只把"手写 mesh + 程序腿摆"换成 glTF + 动画 clip。
- 注意：统一缩放/朝向；首次需 `npm i`（drei 已在）；模型走懒加载别拖累首屏。

**路线 B（不引资源，纯改程序模型）**
- 重写 Deer/Wolf/金鱼 的几何：更合理比例、`flatShading` 圆滑、加耳/尾/鹿角、鱼加背鳍尾鳍，
  顶点稍增；金鱼用更顺的纺锤体 + 飘动尾鳍（顶点动画）。
- 成本低但天花板有限。

> 金鱼(FishSchool 2584)：无论 A/B，重做成**橙白纺锤体 + 飘尾**，群游加分离/对齐/聚合(boids)。
> 海鸥(2637)：**保留**，仅在 STEP1 顺手统一一下飞行噪声手感（可选）。

## STEP 3 · 行为与生态打磨（让动物"有生活"）
- 状态细化：idle/graze(低头吃草)/walk/flee/drink(水边喝水)。
- **群体感**：鹿群 cohesion（互相靠拢但不重叠）；狼数量多时分散巡逻。
- **昼夜节律**：白天活跃、夜里找地方卧下(idle)；萤火虫只夜出（接呼应系统）。
- 与呼应系统联动：种树片 → 鹿循迹"走入"（带 arriving 入场）；接 P0 计划的生态链规则。

## 分工
- **强 AI**：STEP 1（运动模块，核心难点）、STEP 2 的接入框架（glTF 加载/动画切换范式）。
- **GLM 苦工**：STEP 2 路线 B 的逐个程序模型重写，或 STEP 2-A 接好后**逐个动物接动画 clip**；
  STEP 3 的单项行为（喝水/卧下/群聚）按模板逐条加。

## 验证
- 鹿/狼/金鱼观感明显提升；移动匀速自然、转弯顺、无滑步/悬浮/急停；
- 海鸥不变；性能稳（glTF 懒加载、boids 数量上限）；`tsc`+`build` 通过；存档/生态不破。

## 参考
- 低多边形动物资源(含 walk 动画): https://itch.io/game-assets/free/tag-animals/tag-low-poly ·
  https://www.fab.com/listings/0c8f3917-2461-4775-a853-b995bb93bac5
- 风格参考(Animal Crossing 式 cozy 资源): https://pixelsmithstudios.com/blog/low-poly-animals/
