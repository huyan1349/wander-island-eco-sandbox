# 详细计划 C · 地形笔刷重构 + 水系统（贴地水塘 / 溪流 / 瀑布）

> 项目：`/Users/huyan/Desktop/wander-island_-eco-sandbox`
> **本文取代**旧的《给苦工AI-地形笔刷任务.md》——按专业游戏笔刷标准重做。
> 对标：Unreal Landscape Sculpt / World Creator（raise/lower/flatten-to-target/smooth/noise +
> **falloff 羽化** + 强度/半径 + 笔刷预览圈）；水对标 Poseidon / Synty POLYGON（**交界泡沫** +
> 流向 + 瀑布 + 样条河道 + 深浅色）。技术栈是 React+R3F+Three.js，地形是 65×65 CPU 高度图——
> 不需要 GPU compute，**CPU 笔刷足够快**。
> 每 STEP 跑 `npx tsc --noEmit` + `npx vite build`。勿碰 index.css 手绘变量。

## 竞品分析（研究结论，指导本计划）
- **Townscaper**：不规则网格 + 波函数坍缩；玩家只做粗选择，系统**自动拼美 + 模式匹配塞点缀**。
  启发：玩家做粗决策，**系统补全美感**。
- **Tiny Glade**（最像）：先"画"一片地，再 raise/lower/smooth/锐化；官方建议**先分高/中/低三层**；
  灵魂是**实时自适应**——地形一变，草/岩/路/墙自动贴合。
- **核心结论**：让地形显专业的不是笔刷多，而是**两件自动补全**：
  ① 按坡度/高度**自动贴材质**(陡坡岩、平顶草、水边沙、高处雪)；② 挖低**自动出水**。
  手动材质笔刷只作为覆盖微调。**随机"粗糙"删除。**

## 0. 现有锚点
- 地形：`src/components/Terrain.tsx`（主岛网格，搜 `selectedTool === 'terrainUp'` 的笔刷段）
  ；`utils/terrain.ts` 的 `getTerrainHeight/getTerrainGradient`。
- 已写好的算法基座：`src/utils/terrainBrush.ts`（raise/lower/flatten/smooth/roughen + smoothstep
  falloff + flatten targetY）——**本计划在它之上升级**，不是从零。
- 水：海面 shader 在 `src/components/Water.tsx`（有泡沫/水下 varying，可复用思路）；
  `Assets.tsx` 的 `WaterSurface`(385) / `Spring`(454) / `Pond`(500)。

---

# 第一部分 · 地形笔刷重构（专业级）

## ⚠️ 设计原则（业主指示，重要）
笔刷**不按底层操作分，按"玩家想造什么"分**。删掉没用的「粗糙/噪声」（治愈小岛用不上）。
**原有"上升/下降"保留复用，不重写。** 最终笔刷只有这 5 把：

| 笔刷 | 意图 | 实现 |
|---|---|---|
| 隆起 raise | 堆小山丘 | **复用原 terrainUp** |
| 挖低 lower → **自动出水** | 挖坑，低于水位自动成水塘/湖 | 复用原 terrainDown + 接水系统 |
| 找平 flatten | 推平地放房子/广场/梯田 | terrainBrush(flatten) |
| 柔化 smooth | 抹圆棱角，地形显手作治愈 | terrainBrush(smooth) |
| **地表材质 paint** ★ | 刷沙滩/石滩/雪地/小路/花草 | 改 terrain `types`（见 STEP 1b） |

> ❌ 删除 roughen/erode。✅ 新增「地表材质笔刷」——这才是让素岛快速变好看的关键。

## STEP 1 · 笔刷算法（terrainBrush.ts）
`src/utils/terrainBrush.ts`（现已有 raise/lower/flatten/smooth/erode）：
- 笔刷集定为 **隆起 / 挖低 / 找平 / 平滑** 四把(raise/lower 走原代码)。`erode` 作为**可选**
  "造崖"进阶档，不进默认 UI(免得像随机粗糙)。
- **falloff 羽化曲线**：加 `falloff: 'smooth'|'linear'|'sharp'`，控制边缘软硬。
- **flatten 到目标高度**：支持 UI/落笔指定 targetY（做水平台地）。
- **性能**：只遍历包围盒内顶点（按 px±radius 反推网格索引，别全扫 4225）。

## STEP 1b · 按坡度/高度「自动贴材质」★★ 全计划最高价值（学 Tiny Glade 自适应）
**这是让地形一变就自动好看的核心**，应作为默认行为，无需玩家操作：
- 在 Terrain 计算顶点颜色处（搜 `refreshTerrainColors`/颜色映射），改为按**坡度 + 高度**决定材质：
  - 坡度陡(法线与竖直夹角大，用相邻高差或 `getTerrainGradient`)→ **岩石** #6c757d
  - 接近水位/低处岸边 → **沙滩** #dda15e
  - 平缓中高度 → **草地** #588157（现状）
  - 高处(y 超阈值) → **雪** #f8f9fa
- 每次笔刷改完高度，自动重算这块的材质色。→ 玩家只管隆起/挖低，岩崖、沙岸、雪顶自动出现。
- 阈值都做成易调常量。

## STEP 1c · 手动「地表材质笔刷」(覆盖微调，次要)
在自动材质之上，给一把手动笔覆盖：`paintSurface(types, positions, opts)` 把半径内 `types[i]=目标材质`
(草/沙/石/雪/路/花草)，刷完 `refreshTerrainColors`。像 Townscaper 上色，用于刷小路/花田等特意安排。

## STEP 2 · store 笔刷参数（含 falloff/target）
`src/store.ts` 加：`brushMode, brushSize, brushStrength, brushFalloff, brushTargetY(可空)` + setters。
（默认 size 3.5 / strength 0.5 / falloff 'smooth'）。

## STEP 3 · 接入主岛 + 笔刷预览圈（增量，不动原 raise/lower）
`Terrain.tsx`：
- **保留**现有 `terrainUp/terrainDown` 升降代码原样。在它旁边加分支：当 `brushMode` 属于
  新模式(flatten/smooth/roughen/erode)时，调用 `applyTerrainBrush`；否则走原升降逻辑。
  落笔(`!isDragEvent`)记录 flattenTargetY=点击点 y（或用 brushTargetY）。
- **笔刷预览圈**：已有 cursorRef 光标，改为半径=brushSize 的**地面投影圆环**（贴合地形法线），
  专业工具都有——让玩家看清作用范围。光标 scale 跟 brushSize。
- 改完 `computeVertexNormals + refreshTerrainColors`，松手写回 `setTerrainData`（接 undo）。

## STEP 4 · 笔刷面板 UI（底部，仅地形工具时显示）
`src/App.tsx`：笔刷按钮 **隆起 / 挖低 / 找平 / 平滑** + 一把可选 **地表材质** +
falloff 切换 + 大小/力度滑块，全用 `hand-drawn-*`，放底部工具坞上方（搜 `id="tool-dock"` 上方浮层）。
选「地表材质」时旁边出一排材质色块(草/沙/石/雪/路/花草)。
**注意：按坡度/高度的自动贴材质(STEP 1b)是默认自动发生的，不需要按钮。** 不要"粗糙"按钮。

> 子岛 SubIsland 同样接入（同算法，注意它是局部坐标）——可作为 GLM 苦工任务。

---

# 第二部分 · 水系统重构

## STEP 5 · 水塘"贴地"放置（自动检测地形）★核心改造
新建 `src/game/water/pondFit.ts`：放置时不再是"一片固定平面"，而是：
1. 以点击点为中心，向外环形采样 `getTerrainHeight`，找一个合理**水位 y**
   （= 点击点地面高度 + 小偏移；或取邻域较低处，模拟洼地积水）。
2. **自动求水面半径**：从中心向外扩，直到地形高度升过水位（即"岸线"），得到贴合洼地的半径。
3. 存进 pond 的 `customState`（水位 + 半径），渲染按此画。
→ 效果：水塘像真的积在地形凹陷里、有岸线，而不是悬浮圆盘。
（最快版：先做"水位=地面+offset、半径随地形岸线截断"，不追求任意形状。）

### STEP 5b · 「挖低」笔刷一体化造水（关键缝合）
用"挖低"笔刷把地形挖到**全局水位线以下**时，**自动在该洼地生成/扩展水面**（贴 STEP 6 的水）。
→ 玩家不必先挖坑再放水塘：一笔挖下去，水自己漫上来成湖。这是把笔刷和水系统真正缝在一起。

## STEP 6 · 水的视觉升级（低多边形风格化水 shader）
重写 `Pond`/`WaterSurface` 的材质（复用 `Water.tsx` 海面 shader 思路）：
- **深浅色**：按水深渐变（浅岸亮、深处暗）。
- **交界泡沫**：水面与地形/物件相接处一圈白泡沫（深度差/距岸检测）——低多边形水的灵魂。
- **轻波动**：顶点正弦微起伏 + 法线扰动，缓慢流动 UV。
- 风格化、低面数，移动端也能跑。统一给 Pond/Spring/溪流共用一个 `<StylizedWater>` 组件。

## STEP 7 · 新增"水的放置"→ 溪流 / 瀑布 ★新功能
新增工具 `water_flow`（按"加放置物类型"9 处接线：store ToolType/PlacedAsset、App categories、
Assets switch、placeableTools、unlockedAssets 等——参考之前 §0 接线清单）。
- **溪流**：沿玩家**拖动路径**连续放置小号水段（或存一条折线 polyline 到一个 asset），
  渲染成顺着地形下流的水带（样条/连段网格），UV 沿流向滚动 → 有"流动感"。
- **瀑布**：当相邻水段**落差超过阈值**（地形高度差）→ 该处渲染竖直水帘 + 底部泡沫/水花粒子
  （复用 vfxQueue 加 'splash'）。
- 流向：由路径方向或地形梯度 `getTerrainGradient` 决定，水自然"从高往低"。
- 最快版：溪流先做"拖动落点连成一串小水塘 + 流动贴图"；瀑布先做"落差处加竖直水片+水花"。

## 分工
- **强 AI**：STEP 1(算法升级)、3(预览圈+接入)、5(贴地算法)、6(水 shader)、7(溪流/瀑布框架)。
- **GLM 苦工**：STEP 2/4(参数+UI 体力活)、子岛接入、STEP 7 的更多水段类型/参数微调、
  泡沫/水花参数调试（照模板）。

## 验证
- 笔刷：5 模式 + falloff + 大小/力度都生效；有预览圈；能挖河谷/抹台地/平滑丘陵/造崖壁；
- 水塘：放在洼地会贴合岸线、有泡沫和深浅、不再是悬浮糙盘；
- 水流：能拖出溪流、落差处成瀑布带水花；
- `tsc`+`build` 通过；存档/撤销/性能正常。

## 参考
- Unreal Landscape Sculpt（raise/lower/flatten/smooth/falloff）: https://dev.epicgames.com/documentation/unreal-engine/landscape-sculpt-mode-in-unreal-engine
- World Creator Sculpt（flatten 到 target / smooth 半径）: https://docs.world-creator.com/reference/terrain/shape-layers/sculpt
- 低多边形水 Poseidon（交界泡沫/河流/瀑布）: https://unityassetcollection.com/low-poly-water-builtin-urp-poseidon-free-download/
- UE5 风格化水 shader 实操: https://80.lv/articles/how-to-build-stylized-water-shader-design-implementation-for-nimue
- Godot 低多边形水: https://godotshaders.com/shader/low-poly-water/
