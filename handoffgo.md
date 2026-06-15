# Handoff

## 已完成
- **详细计划C · 地形笔刷重构（第一部分 STEP 1~4）**
  - STEP 1: terrainBrush.ts 升级
    - 删除 roughen/erode，新增 paint（地表材质）模式
    - 新增 falloff 羽化曲线（smooth/linear/sharp）
    - 性能优化：包围盒内遍历，不全扫 4225 顶点
    - 新增 paintSurface() 材质笔刷函数（改 types 数组）
    - SurfaceType 类型：0=草 1=路 2=沙 3=石 4=雪 5=花草
  - STEP 1b: 按坡度自动贴材质（学 Tiny Glade 自适应）
    - refreshTerrainColors 增加坡度检测：陡坡→岩石 #6c757d
    - 沙滩阈值从 0.8 扩至 1.0
    - 优先级：path > steep > 沙滩 > 草地 > 石/雪
  - STEP 2: store.ts 新增 brushFalloff/brushPaintType 参数
  - STEP 3: Terrain.tsx 接入
    - paint 模式调 paintSurface 改 types
    - 其他模式调 applyTerrainBrush 改高度（含 falloff 参数）
    - Assets.tsx SubIsland 同步修复 falloff 参数
  - STEP 4: App.tsx 笔刷面板 UI
    - 5 模式按钮（隆起/挖低/找平/柔化/材质）
    - 材质色块选择（仅 paint 模式显示）
    - 羽化曲线切换（柔/线/锐）
    - 大小/力度滑块
  - tsc 0 错误，vite build 成功

## 未完成
- STEP 5: 水塘贴地放置 pondFit.ts
- STEP 5b: 挖低笔刷一体化造水
- STEP 6: 水视觉升级（低多边形风格化水 shader）
- STEP 7: 溪流/瀑布新功能
- 子岛 SubIsland 的 paintSurface 接入（当前仅主岛）
