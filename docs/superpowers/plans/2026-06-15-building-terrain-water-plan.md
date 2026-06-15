# 建造 / 地形 / 水系 — 实施 Plan（交接给执行 AI）

> 本文件为**可直接执行**的任务清单。所有 file:行号锚点、搜索字符串、改法均已在
> 提交 `e8e1803`（branch `claude/game-next-steps-cuuw7q`）上人工核对过。
>
> **给执行 AI 的规则（省 token 必读）：**
> 1. **不要重新通读代码库**。需要定位时，直接用本文给的“搜索串”跳到目标，只读该函数附近。
> 2. **所有改动只提交到 `claude/game-next-steps-cuuw7q` 分支，禁止动 `main`**（有另一个 AI 并行改，避免冲突）。
> 3. 每完成一个里程碑：`npx tsc --noEmit`（须 0 错）→ `npm run build`（须成功）→ commit。
>    （首次需 `npm install --ignore-scripts` 才能 typecheck/build；native 包不影响前端编译。）
> 4. 容器内无法看 3D 画面，所有视觉数值（半径/幅度/颜色）写成易调常量，别硬编码进逻辑。
> 5. 按里程碑顺序做；M1 优先级最高，独立可交付。

---

## 0. 本仓库“加一个可放置物件类型”的标准接线清单（复用，最省 token）

新增任何放置型物件（如建造套件、新装饰）都要改**以下 9 处**，照 `pond`/`spring` 镜像即可：

| # | 文件 | 搜索串 | 改法 |
|---|------|--------|------|
| 1 | `src/store.ts` | `export type ToolType` | union 里加 `'<id>'` |
| 2 | `src/store.ts` | `export interface PlacedAsset` 下的 `type:` | union 里加 `'<id>'` |
| 3 | `src/App.tsx` | `const categories = [` | 对应分类 `tools` 数组加 `{ id, icon, label, cost }`（icon 用已 import 的 lucide） |
| 4 | `src/components/Assets.tsx` | `switch (asset.type)` | 加 `case '<id>': content = <Comp {...asset} />; break;` |
| 5 | `src/components/Assets.tsx` | `const landPlaceableTools` | 数组加 `'<id>'`（陆地放置才需要） |
| 6 | `src/components/Assets.tsx` | `const verticalTools` | 加 `'<id>'` = 始终竖直/不随坡面翻转（建筑类都要） |
| 7 | `src/components/Assets.tsx` | `color = "#3b82f6"`（光标反馈块） | 给新工具一个光标色 |
| 8 | `src/store.ts` | `'deer', 'wolf', 'seagull'`（**两处** unlockedAssets） | 两处都加 `'<id>'`，否则工具被锁 |
| 9 | `src/components/Assets.tsx` | `'platform', 'spring', 'pond', 'pave'` | 若是“扁平/不挡路”物件，加入此忽略列表 |

物件组件本体写在 `Assets.tsx`，可参考刚加的 `function Pond(` / `function Spring(` / `function WaterSurface(`。
统一用 `usePopIn(scale)` 做出生动画，`<group position={[position.x,position.y,position.z]} ... scale={0} ref={groupRef}>` 包裹。

---

## M1：地形雕刻模式升级（最高 ROI，1 天，零美术）

**目标**：把地形从“只能升/降”扩成真正的雕刻工具——抹平 / 平滑 / 斜坡 / 粗糙，+ 笔刷大小/力度滑块。
配合已上线的“挖谷到 -3.0 + 水塘”，造地貌即完整。

**关键前置调查（必做，1 次）**：本仓库有**两处**地形笔刷实现，先确认哪处是“主岛”实际生效的：
- A：`src/components/Assets.tsx` 搜 `if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown')`（含 `positionsRef`/`persistTerrain`，疑似主岛生效）
- B：`src/components/Terrain.tsx` 同搜索串
判断方法：看哪个 `<mesh>` 真正挂了 `onPointerDown/applyBrush` 且驱动 `terrainData`。**在生效的那处实现新模式；若两处都活，逻辑要镜像一致。**

### Task 1.1 — store 增加笔刷参数
- 文件 `src/store.ts`
- 在 `GameState` interface + `create(...)` 里加：
  ```ts
  brushMode: 'raise' | 'lower' | 'flatten' | 'smooth' | 'ramp' | 'roughen';
  brushSize: number;     // 默认 3.5
  brushStrength: number; // 默认 0.3
  setBrushMode/ setBrushSize/ setBrushStrength
  ```
- 说明：保留现有 `terrainUp/terrainDown` 工具作为“升/降”，新模式可走 `brushMode`；或新增 ToolType `terrainFlatten` 等（二选一，推荐 brushMode + 当 selectedTool 属于地形类时读 brushMode，UI 更干净）。

### Task 1.2 — 在生效的笔刷循环里实现 5 个新算法
锚点：上面调查确定的笔刷 for 循环（`Assets.tsx` 现为 `dist < 3.5` 那段，`const newY = Math.max(-3.0, ...)`）。把固定 `3.5`→`brushSize`，固定 `strength`→`brushStrength`，并按 mode 分支：
- `flatten`：拖动起点记录目标高度 `targetY`，把范围内顶点按 `smoothInfluence` lerp 向 `targetY` → 台地/地基。
- `smooth`：每个顶点设为其邻居高度的加权平均（对网格邻接采样）→ 自然丘陵、去尖刺。
- `ramp`：pointerDown 记录 `startY`+`startPos`，拖动方向上做线性高度梯度 → 上坡路/梯田。
- `roughen`：叠加 `(Math.random()-0.5)*brushStrength*smoothInfluence` → 嶙峋崖壁。
- 共用现有 `Math.max(-3.0, ...)` 下限与 `posAttr.needsUpdate / computeVertexNormals / refreshColors / persistTerrain`。

### Task 1.3 — 地形面板 UI（笔刷模式 + 大小/力度滑块）
- 文件 `src/App.tsx`，`地形` 分类（搜 `"隆起地形"`）。当 `selectedTool` ∈ 地形类时，在工具栏附近渲染：5~6 个 mode 图标按钮 + 两个 `<input type=range>`（绑定 `brushSize` 0.5~10、`brushStrength` 0.05~1）。
- 复用现有面板的 Tailwind 卡片风格（参考 `PlayerPanel.tsx`）。
- 光标视觉大小（搜 `cursorScale = 3.5`）改成读 `brushSize`，让光标圈和实际笔刷一致。

**验收**：能挖出带水（放 pond）的河谷、能抹出平台地基、能平滑出连绵丘陵。tsc+build 通过。

---

## M2：水塘进阶 — 顺地形蓄水（可选，承接已上线的 pond）

当前 `pond`（`Assets.tsx` 搜 `function Pond(`）是“放在点击点地面高度的一片平面水体”，不会自动灌满山谷。

### Task 2.1 — 水位填充
- 给 pond 增加 `customState` 存“水位 y”（放置时弹一个小滑块或用 brushStrength 复用），水面渲染在该绝对水位、半径自动取到与该水位相交的地形范围（采样 `getTerrainHeight` 找边界）。
- 或更简：放置时把 pond 水面设在 `placementY + 可调 offset`，半径随 scale（已实现），先满足“湖/河”观感即可。
- 注意：`getTerrainHeight` 在 `src/utils/terrain.ts`，可直接采样判断岸线。

### Task 2.2 — 河流
- 提供“水流”笔刷：沿拖动路径连续放置小号 pond（半径 ~1.2）形成河道；或新增 `river` 段类型用拉伸水面。先用前者（零新类型，最省事）。

---

## M3：模块化建造套件（让“能建造”成立）

**目标**：5 个能拼装、带网格吸附的零件，远胜散装物件。新增类型：`wall` `path_tile` `stairs` `pillar` `roof`。

### Task 3.1 — 按“§0 接线清单”新增 5 个类型
- 全部走 §0 的 9 处接线；放进 `App.tsx` 新分类 `{ name: "建造", icon: <已import图标>, tools: [...] }`。
- 组件写在 `Assets.tsx`：低多边形、`flatShading`、暖色木/石材质，参考现有 `House`/`Fence`。

### Task 3.2 — 网格吸附
- 放置时对 `worldPoint.x/z` 做 `Math.round(v / GRID) * GRID`（GRID=1 或 2）。
- 参考现有吸附：`Assets.tsx` 搜 `Math.round(point.x / 3) * 3`、`Water.tsx` 搜 `Math.round(targetX / 3) * 3`。
- 这 5 类放进 `verticalTools`（始终竖直），并加一个旋转快捷键（R 键转 90°，存进 `rotation.y`）。

**验收**：能用墙+路+台阶+柱+顶拼出一座小房子/庭院。tsc+build 通过。

---

## M4：内容补充（廉价，随时插空做）

按 §0 接线，逐个加（每个就是一个 `Assets.tsx` 组件 + 9 处接线）：
- 自然：芦苇丛、睡莲（放 pond 上）、蘑菇、苔石、枯木、芒草。
- 装饰：石灯笼、鸟居、吊桥灯、风铃、晾衣绳、秋千。
- 生物：兔子、萤火虫群（夜间发光）、锦鲤（放 pond 上）。

---

## M5（更后）：碎片 / 还原叙事循环 — 给建造一个“为什么”

设计文档已在 `docs/narrative/完整情景设计.md`（碎片文本库 60+40+8、还原阶段表见 §4.3）。
代码里**完全未实现**（仅 `MusicLibrary.tsx`/`LoadingScreen.tsx` 有 flavor 文字）。

- M5.1 碎片收集 MVP：`store.ts` 加 `collectedFragments:string[]` + 持久化；把 §3.1 的 60 条做成数据文件；在物件附近生成可点击碎片光点，拾取入档+弹文字。
- M5.2 还原进度：按 §4.3 阈值（微光/低语/.../和声）触发轻量环境变化（光照/悬停雪/灯塔变粉）。
- M5.3 岛灵「辞」：已装 `openai` 依赖（`package.json`），按收集进度从词→句→完整小故事。
- M5.4 叙事图谱 UI + 漂流瓶/好友叙事化（社交系统已上线，见 git log）。

---

## 附：本仓库速查锚点（执行 AI 直接用，避免探索）

- 工具栏分类定义：`src/App.tsx` 搜 `const categories = [`
- 物件渲染分发：`src/components/Assets.tsx` 搜 `switch (asset.type)`
- 放置主逻辑/白名单：`Assets.tsx` 搜 `const landPlaceableTools`
- 地形笔刷（两处）：搜 `selectedTool === 'terrainUp'`（在 `Assets.tsx` 与 `Terrain.tsx`）
- 共享水面组件：`Assets.tsx` 搜 `function WaterSurface(`
- 海面着色器注入（穿模修复参考）：`src/components/Water.tsx` 搜 `varying float vUnder`
- 地形采样：`src/utils/terrain.ts` 的 `getTerrainHeight(x,z)`
- 海面高度采样（漂浮物同步）：`Water.tsx` 的 `getWaterHeight`
- 存档读/清：`store.ts` 搜 `unlockedAssets`
</content>
</invoke>
