# Handoff

## 已完成
- 整理 Terrain.tsx 和 Assets.tsx 的地形笔刷逻辑，使主岛/子岛一致
  - pave 块：从手动遍历顶点改为统一调用 `paintSurface()`，支持 falloff 和 drag 持久化
  - terrainUp/terrainDown 块：添加 `brushMode === 'paint'` 分支（材质笔刷），高度笔刷加注释分段
  - Assets.tsx 新增 `paintSurface` import
  - tsc --noEmit 0 错误，vite build 成功

## 未完成
- 无
