# 高级地形笔刷 · 接线 Plan（交接给执行 AI / 苦工）

> 核心算法**已写好**：`src/utils/terrainBrush.ts`，导出 `applyTerrainBrush(positions, opts)`、
> 类型 `BrushMode`、清单 `BRUSH_MODES`。本任务只是「把它接进 UI 和两处地形」，是确定性的体力活。
>
> **执行规则（省 token）：**
> 1. 不要重新通读代码库；用下面给的「搜索串」直接跳到目标，只读该函数附近。
> 2. 只改下面列出的文件。每个里程碑做完跑 `npx tsc --noEmit`（须 0 错）→ `npx vite build`（须成功）→ commit。
> 3. 视觉数值（半径/力度范围）已是易调常量，不要硬编码进算法。
> 4. 风格务必沿用现有 `hand-drawn-btn` / `hand-drawn-panel` 手绘类，不要引入新样式/新配色。
> 5. 严禁动 `src/index.css` 的圆角/手绘变量（业主对此非常敏感）。

---

## 背景：笔刷能做什么
`applyTerrainBrush` 支持 5 种模式（高度图可复刻的地貌）：
- `raise` 隆起（山峦）、`lower` 凹陷（深挖到 -3，峡谷/河谷）
- `flatten` 抹平（向落笔高度收敛 → 台地/地基）
- `smooth` 平滑（邻居均值 → 绵延丘陵、去尖刺）
- `roughen` 粗糙（叠加噪声 → 嶙峋崖壁）

`BrushOptions = { mode, size, strength, isDrag, px, pz, targetY?, minY?, maxY? }`。
`flatten` 需要 `targetY`（落笔那一刻点击点的高度）。

---

## Task 1 — store 增加笔刷参数
文件 `src/store.ts`

1. 顶部已存在 `import { getGlobalXP, ... } from './lib/globalProgress';`，在其下加：
   ```ts
   import type { BrushMode } from './utils/terrainBrush';
   ```
2. 搜索串 `setMailboxOpen: (v: boolean) => void;`（interface 段），其后加：
   ```ts
   brushMode: BrushMode;
   brushSize: number;
   brushStrength: number;
   setBrushMode: (m: BrushMode) => void;
   setBrushSize: (n: number) => void;
   setBrushStrength: (n: number) => void;
   ```
3. 搜索串 `setMailboxOpen: (v) => set({ mailboxOpen: v }),`（实现段），其后加：
   ```ts
   brushMode: 'raise',
   brushSize: 3.5,
   brushStrength: 0.5,
   setBrushMode: (m) => set({ brushMode: m }),
   setBrushSize: (n) => set({ brushSize: n }),
   setBrushStrength: (n) => set({ brushStrength: n }),
   ```

---

## Task 2 — 接入主岛笔刷（Terrain.tsx）
文件 `src/components/Terrain.tsx`

1. 顶部加 `import { applyTerrainBrush } from '../utils/terrainBrush';`
2. 搜索串 `const lastBrushPoint = useRef(new THREE.Vector3());`，其后加一行：
   ```ts
   const flattenTargetY = useRef(0);
   ```
3. 搜索串 `if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {`
   （在 `applyBrush` 内，约 line 569 那块，**不是** 724/741 的光标块）。
   把整个 `if (...) { ... return; }` 块替换为：
   ```ts
   if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {
      if (!meshRef.current) return;
      const geometry = meshRef.current.geometry;
      const posAttr = geometry.attributes.position;
      const { brushMode, brushSize, brushStrength } = useGameStore.getState();
      if (!isDragEvent) flattenTargetY.current = point.y; // 落笔记录抹平目标高度
      const changed = applyTerrainBrush(posAttr.array as Float32Array, {
        mode: brushMode, size: brushSize, strength: brushStrength, isDrag: isDragEvent,
        px: point.x, pz: point.z, targetY: flattenTargetY.current, minY: -3.0, maxY: 8.0,
      });
      if (changed) {
        posAttr.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        refreshTerrainColors();
        if (!isDragEvent) useGameStore.getState().setTerrainData(posAttr.array as Float32Array, types, ISAND_SIZE, SEGMENTS);
      }
      return;
   }
   ```
4. 光标大小跟随笔刷：搜索串 `cursorScale = 3.5`（在 onPointerMove，约 724）改为
   `cursorScale = useGameStore.getState().brushSize;`
   再搜索串 `baseScale = 3.5`（在 useFrame，约 741）改为
   `baseScale = useGameStore.getState().brushSize;`

注意：拖动白名单已含 `terrainUp/terrainDown`（搜 `isDragEvent && !['terrainUp'`），无需改；
因为算法只读 `brushMode`，所以选了「凹陷」工具后在面板切到「抹平」也能用。

---

## Task 3 — 接入子岛笔刷（Assets.tsx · SubIsland）
文件 `src/components/Assets.tsx`，函数 `function SubIsland(`（搜 `export function SubIsland(`）

1. 确认顶部已 import `applyTerrainBrush`（没有就加 `import { applyTerrainBrush } from '../utils/terrainBrush';`）。
2. 搜索串 `const lastBrushPoint = useRef(new THREE.Vector3());`（SubIsland 内那处），其后加：
   ```ts
   const flattenTargetY = useRef(0);
   ```
3. 搜索串（SubIsland 内，约 line 2253）`if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {`
   把该块替换为同样逻辑，但**用 SubIsland 的本地引用**：用 `positionsRef.current` 作为顶点数组、
   `typesRef.current` 作类型、`refreshColors()` 刷新颜色（SubIsland 用的是这些名字，不是 Terrain 的）：
   ```ts
   if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {
      if (!meshRef.current) return;
      const geometry = meshRef.current.geometry;
      const posAttr = geometry.attributes.position;
      const { brushMode, brushSize, brushStrength } = useGameStore.getState();
      if (!isDragEvent) flattenTargetY.current = point.y;
      const changed = applyTerrainBrush(posAttr.array as Float32Array, {
        mode: brushMode, size: brushSize, strength: brushStrength, isDrag: isDragEvent,
        px: localPoint.x, pz: localPoint.z, targetY: flattenTargetY.current, minY: -3.0, maxY: 8.0,
      });
      if (changed) {
        posAttr.needsUpdate = true;
        geometry.computeVertexNormals();
        refreshColors();
        // 同步回存档：照搬该块原本写 updateAsset/terrain 的方式（若原代码有，保留之）
      }
      return;
   }
   ```
   ⚠️ 关键：SubIsland 的笔刷坐标是**局部坐标**。先看原块里它怎么把世界点转成局部点
   （搜 `localPoint` 或 `worldToLocal`/`point.x - props.position.x`）。**沿用原块的转换变量名**，
   别假设叫 `localPoint`。若原块直接用 `point.x/point.z`，那就用 `point`。
   持久化部分（写回 asset.terrain）**照抄原块已有的写法**，不要新发明。

---

## Task 4 — 地形面板 UI（App.tsx）
文件 `src/App.tsx`

目标：当 `selectedTool` 是 `'terrainUp'` 或 `'terrainDown'` 时，在底部工具栏上方显示
「5 个模式按钮 + 笔刷大小/力度两个滑块」。

1. 顶部 import：`import { BRUSH_MODES } from "./utils/terrainBrush";`
2. 取 store：在组件内已有大量 `useGameStore(...)`，加：
   ```ts
   const brushMode = useGameStore(s => s.brushMode);
   const brushSize = useGameStore(s => s.brushSize);
   const brushStrength = useGameStore(s => s.brushStrength);
   ```
3. 渲染位置：搜索串 `bottom-10'}` 或底部工具栏容器（搜 `absolute left-1/2 -translate-x-1/2 z-50` 中
   `bottom-` 的那个建造栏）。在它**上方**插入一个浮层（仅地形工具时显示）：
   ```tsx
   {screen === 'PLAYING' && (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') && (
     <div className="absolute left-1/2 -translate-x-1/2 bottom-44 z-50 hand-drawn-panel px-4 py-3 flex items-center gap-4 pointer-events-auto">
       <div className="flex gap-1.5">
         {BRUSH_MODES.map(m => (
           <button key={m.id}
             onClick={() => { AudioSystem.playTap(); useGameStore.getState().setBrushMode(m.id); }}
             className={`hand-drawn-btn px-3 py-1.5 text-xs font-bold ${brushMode === m.id ? 'hand-drawn-btn-active' : ''}`}>
             {m.label}
           </button>
         ))}
       </div>
       <div className="flex items-center gap-2">
         <span className="text-[10px] font-bold text-slate-600">大小</span>
         <input type="range" min={0.5} max={10} step={0.5} value={brushSize}
           onChange={e => useGameStore.getState().setBrushSize(parseFloat(e.target.value))}
           className="w-24 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer" />
       </div>
       <div className="flex items-center gap-2">
         <span className="text-[10px] font-bold text-slate-600">力度</span>
         <input type="range" min={0.05} max={1} step={0.05} value={brushStrength}
           onChange={e => useGameStore.getState().setBrushStrength(parseFloat(e.target.value))}
           className="w-24 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer" />
       </div>
     </div>
   )}
   ```
   `bottom-44` 是为了浮在建造栏之上；若被遮挡/重叠，微调这个值即可（纯视觉常量）。
4. 工具栏「隆起/凹陷」按钮联动 brushMode（让选工具即设模式，体验更顺）：
   搜索串 `"隆起地形"` 找到地形分类的工具定义；这些工具 tile 的 onClick 是通用的
   `setSelectedTool(tool.id)`（搜 `setSelectedTool(` 在 tile 渲染处）。在该 onClick 里补一句：
   `if (tool.id === 'terrainUp') useGameStore.getState().setBrushMode('raise'); if (tool.id === 'terrainDown') useGameStore.getState().setBrushMode('lower');`
   （若改动通用 tile 处不方便，可跳过此步——面板里的模式按钮已能切换，不影响功能。）

---

## 验收
- 选「隆起」工具，底部出现笔刷面板；切换 5 个模式 + 拖大小/力度滑块，光标圈随大小变化。
- 能：挖出带水（放 pond）的河谷、抹出平台地基、平滑出连绵丘陵、刷出嶙峋崖壁。
- 主岛与子岛行为一致。
- `npx tsc --noEmit` 0 错；`npx vite build` 成功。

## 速查锚点
- 共享算法：`src/utils/terrainBrush.ts`
- 主岛笔刷：`src/components/Terrain.tsx` 搜 `selectedTool === 'terrainUp'`（applyBrush 内那处，非光标处）
- 子岛笔刷：`src/components/Assets.tsx` 的 `SubIsland`，搜 `selectedTool === 'terrainUp'`
- 工具栏分类：`src/App.tsx` 搜 `"隆起地形"` / `const categories = [`
- 底部建造栏容器：`src/App.tsx` 搜 `bottom-10'}`
