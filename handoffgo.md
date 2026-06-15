# Handoff

## 已完成
- **详细计划B · 生态系统与动物重构** — 全部 3 个 STEP 已完成
  - STEP 1: 新建 `src/game/creatures/locomotion.ts` 共享生物运动模块
    - 恒定速度 seek + 到达减速(arrival)，替代 lerp 指数缓动
    - 避障转向(steer)：前方不可走时 ±30°/±60° 偏转，不再急停
    - 地形贴合 + 坡度对齐(pitch/roll from getTerrainGradient)
    - 朝向平滑(限制最大转向角速度 rad/s)
    - 腿部步频与位移挂钩(legPhase += displacement/stepLength)，不再滑步
    - 自然游荡(航向角缓慢漂移/噪声)，替代随机远点目标
    - Deer/Wolf 的 useFrame 移动段替换为 stepCreature 调用
  - STEP 2: 动物建模升级(路线B: 纯改程序模型)
    - Deer: 拉长躯干+浅色腹部+颈部+详细头部(吻/眼/耳)+分叉鹿角+尾+蹄
    - Wolf: 流线躯干+浅色腹部+宽胸+详细头部(长吻/鼻/琥珀眼/尖耳+内耳)+双段蓬尾+爪
    - FishSchool: 橙白纺锤体(sphereGeometry)+鱼腹+飘尾+背鳍+眼，boids群游(分离/对齐/聚合)，夜间生物发光
  - STEP 3: 行为与生态打磨
    - Deer: drink状态(检测spring/pond)+鹿群cohesion(远靠近离)+昼夜节律(夜里idle)+识别所有树种
    - Wolf: 狼群分散(太近时互相远离)+昼夜节律(夜里更活跃巡逻范围25)+pack center tracking
  - 版本号更新至 v2.1.0，存档格式 version: 2
  - `vite build` 通过

## 未完成
- tsc 有 2 个预存错误（BrushOptions 缺少 falloff 属性），非本次修改引入
- STEP 2 路线A(glTF rigged 模型)未实施，当前为路线B(程序模型)，后续可升级
- 海鸥飞行噪声手感统一(可选，文档标注)
- 与呼应系统联动(种树→鹿循迹走入)部分实现(cohesion已让鹿靠近树)，完整生态链规则待后续
