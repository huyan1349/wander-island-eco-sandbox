# 高级地形笔刷接线 Spec

## Why
游戏当前地形工具仅支持简单的「升/降」两种操作，地形编辑能力单一。核心算法 `terrainBrush.ts` 已实现 5 种笔刷模式（隆起/凹陷/抹平/平滑/粗糙），但尚未接入游戏。需要将其接入，让玩家拥有丰富的地形塑造能力。本任务是确定性的「接线」工作，不发明算法。

## 铁律（违反打回）
1. **只准改** `src/store.ts`、`src/components/Terrain.tsx`、`src/App.tsx`、（可选）`src/components/Assets.tsx`，**其它文件一律不碰**
2. **绝对不碰** `src/index.css`，不改任何圆角、手绘 `hand-drawn-*` 样式定义
3. **不改样式风格/配色**，按钮用现成 `hand-drawn-btn`、`hand-drawn-panel` 类
4. **找不到搜索串就停下来告诉业主**，不要猜、不要乱改
5. 每步做完必须跑验证（`npx tsc --noEmit` + `npx vite build` 均通过才继续）
6. 不 git push，不部署，不改 main 分支以外的事

## What Changes
- 在 `src/store.ts` 中添加 `brushMode`、`brushSize`、`brushStrength` 三个状态及其 setter
- 在 `src/components/Terrain.tsx` 中用 `applyTerrainBrush` 替换旧的手动升降逻辑，并让光标大小跟随笔刷大小
- 在 `src/App.tsx` 中添加底部笔刷面板 UI（5 个模式按钮 + 大小/力度滑块），仅在地形工具激活时显示
- 在 `src/App.tsx` 中让「隆起/凹陷」工具按钮联动 brushMode（选 terrainUp 自动切 raise，选 terrainDown 自动切 lower）
- （可选/进阶）在 `src/components/Assets.tsx` 的 `SubIsland` 组件中接入笔刷支持

## Impact
- Affected code: `src/store.ts`、`src/components/Terrain.tsx`、`src/App.tsx`、（可选）`src/components/Assets.tsx`
- 依赖已有模块: `src/utils/terrainBrush.ts`（只读，不修改）
- 不影响: `src/index.css`、任何手绘样式定义、其他组件

## ADDED Requirements

### Requirement: 笔刷状态管理
系统 SHALL 在全局 store 中维护 `brushMode`（BrushMode 类型）、`brushSize`（number，默认 3.5）、`brushStrength`（number，默认 0.5）三个状态，并提供对应的 setter 方法。

#### Scenario: 默认值
- **WHEN** 游戏初始化
- **THEN** brushMode 为 'raise'，brushSize 为 3.5，brushStrength 为 0.5

#### Scenario: 切换笔刷模式
- **WHEN** 用户点击笔刷面板中的模式按钮
- **THEN** store 中 brushMode 更新为对应模式

### Requirement: 主岛高级笔刷应用
系统 SHALL 在地形工具（terrainUp/terrainDown）激活时，使用 `applyTerrainBrush` 函数替代旧的手动顶点遍历逻辑，支持 5 种笔刷模式。替换时需添加 `flattenTargetY` ref 用于抹平模式记录落笔高度。

#### Scenario: 隆起模式
- **WHEN** 用户选择隆起模式并点击/拖拽地形
- **THEN** 地形在笔刷范围内平滑隆起

#### Scenario: 凹陷模式
- **WHEN** 用户选择凹陷模式并点击/拖拽地形
- **THEN** 地形在笔刷范围内平滑凹陷，可挖出深坑/河谷

#### Scenario: 抹平模式
- **WHEN** 用户选择抹平模式并点击/拖拽地形
- **THEN** 地形向落笔时的高度收敛（flattenTargetY），压出平台

#### Scenario: 平滑模式
- **WHEN** 用户选择平滑模式并点击/拖拽地形
- **THEN** 尖锐坡度变圆润（邻居均值）

#### Scenario: 粗糙模式
- **WHEN** 用户选择粗糙模式并点击/拖拽地形
- **THEN** 地面变嶙峋（叠加噪声）

#### Scenario: 笔刷大小和力度可调
- **WHEN** 用户拖动大小/力度滑块
- **THEN** 笔刷影响范围/强度随之变化，光标圆圈大小也跟着变

### Requirement: 笔刷面板 UI
系统 SHALL 在地形工具激活时，在屏幕底部（建造栏上方）显示笔刷面板，包含 5 个模式按钮和大小/力度两个滑块。

#### Scenario: 面板显示条件
- **WHEN** 用户选中 terrainUp 或 terrainDown 工具
- **THEN** 底部出现笔刷面板（位于建造栏上方，bottom-44）

#### Scenario: 面板隐藏条件
- **WHEN** 用户切换到非地形工具
- **THEN** 笔刷面板消失

#### Scenario: 面板交互 - 模式按钮
- **WHEN** 用户点击模式按钮
- **THEN** 切换笔刷模式，当前激活模式按钮使用 `hand-drawn-btn-active` 高亮

#### Scenario: 面板交互 - 大小滑块
- **WHEN** 用户拖动大小滑块（0.5~10，步长 0.5）
- **THEN** brushSize 实时更新，光标大小同步变化

#### Scenario: 面板交互 - 力度滑块
- **WHEN** 用户拖动力度滑块（0.05~1，步长 0.05）
- **THEN** brushStrength 实时更新

### Requirement: 光标大小跟随笔刷
系统 SHALL 让地形工具的光标大小动态跟随 brushSize 参数，而非固定 3.5。需修改两处：`cursorScale`（onPointerMove 内）和 `baseScale`（useFrame 内）。

#### Scenario: 调整笔刷大小后光标变化
- **WHEN** 用户调整 brushSize 滑块
- **THEN** 地形光标圆圈大小实时反映 brushSize 值

### Requirement: 工具按钮联动 brushMode
系统 SHALL 在用户选择地形工具时自动设置默认笔刷模式：选 terrainUp 自动切 'raise'，选 terrainDown 自动切 'lower'。用户仍可通过笔刷面板覆盖切换。

#### Scenario: 选择隆起工具
- **WHEN** 用户点击「隆起地形」工具按钮
- **THEN** brushMode 自动设为 'raise'

#### Scenario: 选择降低工具
- **WHEN** 用户点击「降低地形」工具按钮
- **THEN** brushMode 自动设为 'lower'

### Requirement: 子岛笔刷支持（可选/进阶）
系统 SHALL 在 SubIsland 组件中也接入 applyTerrainBrush，使子岛地形编辑行为与主岛一致。关键：子岛笔刷坐标必须使用**局部坐标**（世界坐标转局部坐标），沿用原块已有的转换变量名和持久化写法。

#### Scenario: 子岛笔刷编辑
- **WHEN** 用户在子岛上使用地形工具
- **THEN** 笔刷效果与主岛一致，坐标正确转换

## MODIFIED Requirements

### Requirement: 地形升降工具行为
原有 terrainUp/terrainDown 工具的硬编码升降逻辑 SHALL 被 `applyTerrainBrush` 替代。替换范围：`applyBrush` 函数内带有 `posAttr.setY` / `for` 循环改地形的那一处 `if` 块（**不是** onPointerMove/useFrame 中仅设置 `cursorScale = 3.5` 的光标代码）。工具选择入口（地形分类中的两个按钮）保持不变。

## REMOVED Requirements
（无移除项）

## 搜索串锚点速查
- store 接口插入点：`setMailboxOpen: (v: boolean) => void;`
- store 实现插入点：`setMailboxOpen: (v) => set({ mailboxOpen: v }),`
- Terrain 主逻辑替换点：`if (selectedTool === 'terrainUp' || selectedTool === 'terrainDown') {`（applyBrush 内，约 line 569，带 posAttr.setY 的那处）
- Terrain 光标 cursorScale：`cursorScale = 3.5`（onPointerMove 内）
- Terrain 光标 baseScale：`baseScale = 3.5`（useFrame 内）
- App 笔刷面板插入点：`{screen === 'PLAYING' && <Toast />}`
- App 工具按钮联动点：`"隆起地形"` / `setSelectedTool(`
