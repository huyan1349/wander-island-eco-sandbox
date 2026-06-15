# Handoff

## 已完成
- **详细计划C · 地形笔刷重构（STEP 1~4 全部完成）**
  - STEP 1: terrainBrush.ts 升级
    - 删除 roughen/erode，新增 paint（地表材质）模式
    - 新增 falloff 羽化曲线（smooth/linear/sharp）
    - 性能优化：包围盒内遍历，不全扫 4225 顶点
    - 新增 paintSurface() 材质笔刷函数（改 types 数组）
    - SurfaceType: 0=草 1=路 2=沙 3=石 4=雪 5=花草
  - STEP 1b: 按坡度自动贴材质（学 Tiny Glade 自适应）
    - refreshTerrainColors 增加坡度检测：陡坡→岩石 #6c757d
    - 手动材质优先级 > 自动坡度 > 自动高度
    - 完整支持 types 0~5 的颜色渲染
  - STEP 1c: 手动地表材质笔刷 paintSurface
  - STEP 2: store.ts 新增 brushFalloff/brushPaintType
  - STEP 3: Terrain.tsx 接入（主岛）
    - paint 模式→paintSurface 改 types
    - 其他模式→applyTerrainBrush 改高度（含 falloff）
    - pave 工具统一用 paintSurface
  - STEP 4: App.tsx 笔刷面板（5模式+材质色块+羽化切换+大小/力度）
  - **子岛 Assets.tsx 同步接入**：paintSurface + paint 分支 + pave 统一
  - tsc 0 错误，vite build 成功

## 未完成
- STEP 5: 水塘贴地放置 pondFit.ts
- STEP 5b: 挖低笔刷一体化造水
- STEP 6: 水视觉升级（低多边形风格化水 shader）
- STEP 7: 溪流/瀑布新功能
