# Tasks

- [x] Task 1: 在 store.ts 中添加笔刷状态参数
  - [x] 1.1: 在 `import { getGlobalXP, ... }` 下方新增 `import type { BrushMode } from './utils/terrainBrush'`
  - [x] 1.2: 搜索 `setMailboxOpen: (v: boolean) => void;`，在其后添加 brushMode/brushSize/brushStrength 及其 setter 类型声明
  - [x] 1.3: 搜索 `setMailboxOpen: (v) => set({ mailboxOpen: v }),`，在其后添加默认值（'raise', 3.5, 0.5）和 setter 实现
  - [x] 1.4: 验证 `npx tsc --noEmit` 和 `npx vite build` 均通过

- [x] Task 2: 在 Terrain.tsx 中接入 applyTerrainBrush
  - [x] 2.1: 添加 `import { applyTerrainBrush } from '../utils/terrainBrush'`
  - [x] 2.2: 搜索 `const lastBrushPoint = useRef(new THREE.Vector3());`，在其后添加 `const flattenTargetY = useRef(0);`
  - [x] 2.3: 搜索 `if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {`（applyBrush 内带 posAttr.setY 的那处，不是光标处），将整个 if 块替换为 applyTerrainBrush 调用
  - [x] 2.4: 搜索 `cursorScale = 3.5`（onPointerMove 内），改为 `useGameStore.getState().brushSize`
  - [x] 2.5: 搜索 `baseScale = 3.5`（useFrame 内），改为 `useGameStore.getState().brushSize`
  - [x] 2.6: 验证 `npx tsc --noEmit` 和 `npx vite build` 均通过

- [x] Task 3: 在 App.tsx 中添加笔刷面板 UI + 工具联动
  - [x] 3.1: 添加 `import { BRUSH_MODES } from './utils/terrainBrush'`
  - [x] 3.2: 搜索 `const activeCatObj = categories.find`，在其附近添加 brushMode/brushSize/brushStrength 状态订阅
  - [x] 3.3: 搜索 `{screen === 'PLAYING' && <Toast />}`，在其上方粘贴笔刷面板 JSX（5 个模式按钮 + 大小/力度滑块，使用 hand-drawn-btn/hand-drawn-panel 样式）
  - [x] 3.4: 工具按钮联动 brushMode：在工具 onClick 中补充 terrainUp→raise、terrainDown→lower
  - [x] 3.5: 验证 `npx tsc --noEmit` 和 `npx vite build` 均通过

- [x] Task 4（可选/进阶）: 在 Assets.tsx 的 SubIsland 中接入笔刷
  - [x] 4.1: 确认/添加 `import { applyTerrainBrush } from '../utils/terrainBrush'`
  - [x] 4.2: 搜索 SubIsland 内 `const lastBrushPoint = useRef`，在其后添加 `const flattenTargetY = useRef(0);`
  - [x] 4.3: 搜索 SubIsland 内 `if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {`，替换为 applyTerrainBrush 调用（使用 localPoint 局部坐标 + persistTerrain 持久化）
  - [x] 4.4: 验证 `npx tsc --noEmit` 和 `npx vite build` 均通过

# Task Dependencies
- Task 2 依赖 Task 1（需要 store 中的笔刷参数）
- Task 3 依赖 Task 1（需要 store 中的笔刷参数和 BRUSH_MODES）
- Task 2 和 Task 3 可并行执行（均只依赖 Task 1）
- Task 4 依赖 Task 2（需要主岛笔刷逻辑先验证通过）
