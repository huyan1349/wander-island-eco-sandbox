# 任务：给「漫游岛」接上高级地形笔刷（按步照做即可）

项目目录：`/Users/huyan/Desktop/wander-island_-eco-sandbox`

---

## 我要你做什么（一句话）
游戏现在的地形工具只能「升 / 降」。**核心算法我已经写好了**，放在
`src/utils/terrainBrush.ts`。你的任务是**把它接进游戏**，让地形工具支持 5 种笔刷：
**隆起 / 凹陷 / 抹平 / 平滑 / 粗糙**，并加上「笔刷大小 / 力度」两个滑块。
你不需要发明任何算法，只是「照图接线」。

---

## 铁律（违反会被打回，务必遵守）
1. **只准改这几个文件**：`src/store.ts`、`src/components/Terrain.tsx`、`src/App.tsx`、
   （可选）`src/components/Assets.tsx`。**其它文件一律不要碰。**
2. **绝对不要碰** `src/index.css`，不要改任何圆角、手绘 `hand-drawn-*` 的样式定义。
3. **不要改样式风格 / 配色**。需要按钮就用现成的 `hand-drawn-btn`、`hand-drawn-panel` 类。
4. **找不到「搜索串」就停下来，把情况告诉业主，不要猜、不要乱改**。
5. 每做完一个步骤(STEP)，**必须**按「验证」小节跑一次，通过了再做下一步。
6. 不要 `git push`，不要部署，不要动 `main` 分支以外的事。改完留在本地即可。

## 每步都要做的「验证」
在项目目录执行（两条都要 0 错 / 成功）：
```
npx tsc --noEmit
npx vite build
```
- `tsc` 有红色报错 → 说明你刚改的有问题，**先改对再继续**。
- 都通过 → 这一步算完成，可以做下一步。

---

## STEP 1：给数据中心加 3 个参数
文件：`src/store.ts`

(1) 找到这一行（搜索：`import { getGlobalXP`）：
```ts
import { getGlobalXP, addGlobalXP, levelFromXP } from './lib/globalProgress';
```
在它**下面新增一行**：
```ts
import type { BrushMode } from './utils/terrainBrush';
```

(2) 搜索：`setMailboxOpen: (v: boolean) => void;`
在它**下面新增**：
```ts
  brushMode: BrushMode;
  brushSize: number;
  brushStrength: number;
  setBrushMode: (m: BrushMode) => void;
  setBrushSize: (n: number) => void;
  setBrushStrength: (n: number) => void;
```

(3) 搜索：`setMailboxOpen: (v) => set({ mailboxOpen: v }),`
在它**下面新增**：
```ts
  brushMode: 'raise',
  brushSize: 3.5,
  brushStrength: 0.5,
  setBrushMode: (m) => set({ brushMode: m }),
  setBrushSize: (n) => set({ brushSize: n }),
  setBrushStrength: (n) => set({ brushStrength: n }),
```

➡️ 跑「验证」。通过再继续。

---

## STEP 2：接入主岛笔刷（最重要，价值最大）
文件：`src/components/Terrain.tsx`

(1) 在文件最上方的 import 区，新增一行：
```ts
import { applyTerrainBrush } from '../utils/terrainBrush';
```

(2) 搜索：`const lastBrushPoint = useRef(new THREE.Vector3());`
在它**下面新增一行**：
```ts
  const flattenTargetY = useRef(0);
```

(3) 搜索：`if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {`
⚠️ 文件里这串出现**不止一次**。你要找的是**带有 `posAttr.setY` 或 `geometry.attributes.position`、
后面跟着一个 `for` 循环改地形**的那一处（不是只设置 `cursorScale = 3.5` 的那两处光标代码）。
找到那一处后，把「从这个 `if (` 开始、一直到它配对的 `return;` 和 `}`」整段，替换成下面这段：
```ts
    if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {
       if (!meshRef.current) return;
       const geometry = meshRef.current.geometry;
       const posAttr = geometry.attributes.position;
       const { brushMode, brushSize, brushStrength } = useGameStore.getState();
       if (!isDragEvent) flattenTargetY.current = point.y;
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
> 如果替换后 `tsc` 报某个名字（如 `refreshTerrainColors`、`types`、`ISAND_SIZE`）不存在，
> 说明你删多了或这处不对——撤销，重新确认是哪一处。**不确定就停下问业主。**

(4) 光标大小跟着笔刷走：
- 搜索：`cursorScale = 3.5`，把这一行的 `3.5` 改成 `useGameStore.getState().brushSize`
- 搜索：`baseScale = 3.5`，把这一行的 `3.5` 改成 `useGameStore.getState().brushSize`

➡️ 跑「验证」。通过再继续。

---

## STEP 3：加底部「笔刷面板」UI
文件：`src/App.tsx`

(1) 最上方 import 区新增：
```ts
import { BRUSH_MODES } from "./utils/terrainBrush";
```

(2) 搜索：`const activeCatObj = categories.find`（这是组件内部，随便找个组件内的位置）。
在它**上面或下面**（同一层级、组件函数体内）加 3 行取数据：
```ts
  const brushMode = useGameStore(s => s.brushMode);
  const brushSize = useGameStore(s => s.brushSize);
  const brushStrength = useGameStore(s => s.brushStrength);
```

(3) 搜索：`{screen === 'PLAYING' && <Toast />}`
在这一行**上面**，粘贴下面这整段（地形工具激活时才显示）：
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
> 若 `tsc` 说 `AudioSystem` / `selectedTool` / `screen` 未定义：说明你贴错了位置（贴到组件外面了）。
> 一定要贴在 `return (...)` 里、和 `{screen === 'PLAYING' && <Toast />}` 同一层级。

➡️ 跑「验证」。通过再继续。

---

## STEP 4（可选 / 进阶，没把握就跳过并告诉业主）
让「子岛」也支持新笔刷。文件：`src/components/Assets.tsx`，函数 `SubIsland`。
这部分涉及「世界坐标转局部坐标」，容易出错。
**如果你不确定，请直接跳过 STEP 4，做完 STEP 1~3 就交付，并明确告诉业主「STEP 4 没做」。**
（主岛笔刷 STEP 1~3 已经是 90% 的价值。）

---

## 全部做完后，怎么自测
1. 项目目录运行：`npm run server`（开后端）和 `npm run dev`（开前端），浏览器打开提示的
   `localhost:3002`。
2. 进游戏，选「地形 / 隆起」工具 → 底部应出现一排：隆起 / 凹陷 / 抹平 / 平滑 / 粗糙 + 两个滑块。
3. 分别点这 5 个模式，在地面上点/拖：
   - 凹陷：能挖出深坑 / 河谷
   - 抹平：能压出一块平台
   - 平滑：尖坡变圆润
   - 粗糙：地面变嶙峋
4. 拖「大小 / 力度」滑块，笔刷范围 / 强度跟着变；光标圆圈大小也跟着变。

## 交付
- 确认 `npx tsc --noEmit` 0 错、`npx vite build` 成功。
- 用 `git add -A && git commit -m "feat: 高级地形笔刷接线"` 提交到当前分支（**不要 push**）。
- 把「STEP 4 做了没」「有没有遇到找不到搜索串的地方」一并告诉业主。
