/**
 * locomotion.ts — 共享生物运动模块
 *
 * 解决的核心问题：
 * 1. 旧代码用 lerp 做指数缓动 → 动物永远在减速逼近，无恒定速度
 * 2. 撞到不可走点直接急停 → 卡顿/抽搐
 * 3. 腿摆频率按固定 speed 算，但身体在减速 → 滑步
 * 4. 朝向用 children[1..5] 数字索引 → 脆且难维护
 *
 * 新方案：
 * - 恒定速度 seek + 到达减速(arrival)
 * - 避障转向(steer)：前方不可走时左右偏转
 * - 地形贴合 + 坡度对齐
 * - 朝向平滑(限制最大转向角速度)
 * - 腿部步频与位移挂钩(位移驱动腿摆)
 * - 自然游荡(航向角缓慢漂移/噪声)
 */

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { getTerrainHeight, getTerrainGradient } from '../../utils/terrain';
import { isWalkable, getWalkableHeight } from '../../components/Assets';

// ─── 类型定义 ───────────────────────────────────────────

export type CreatureState = 'idle' | 'wander' | 'walk' | 'graze' | 'flee' | 'chase' | 'drink';

export interface LocomotionConfig {
  /** 正常行走速度 (units/s) */
  speed: number;
  /** 奔跑/逃跑速度 (units/s) */
  runSpeed: number;
  /** 最大转向角速度 (rad/s) */
  turnRate: number;
  /** 到达目标后减速的半径 (units) */
  arriveRadius: number;
  /** 一步的长度 (units)，用于腿摆计算 */
  stepLength: number;
  /** 逃跑速度 (units/s)，若不设则用 runSpeed */
  fleeSpeed?: number;
  /** 避障探测距离 (units) */
  obstacleProbeDistance?: number;
  /** 游荡时航向角漂移速度 (rad/s) */
  wanderDriftRate?: number;
  /** 游荡时目标更新间隔 (s) */
  wanderTargetInterval?: number;
  /** 坡度对齐强度 (0~1)，0=不对齐，1=完全贴合 */
  slopeAlignStrength?: number;
}

export interface LocomotionState {
  /** 当前位置 */
  position: THREE.Vector3;
  /** 当前朝向角 (rad, Y轴旋转) */
  heading: number;
  /** 当前目标点 */
  target: THREE.Vector3;
  /** AI 行为状态 */
  aiState: CreatureState;
  /** 腿摆相位 (由位移驱动累加) */
  legPhase: number;
  /** 上一帧位置 (用于计算实际位移) */
  prevPosition: THREE.Vector3;
  /** 游荡航向漂移噪声 */
  wanderNoise: (x: number, y: number) => number;
  /** 游荡噪声时间偏移 */
  wanderNoiseOffset: number;
  /** 游荡目标计时器 */
  wanderTimer: number;
  /** 是否正在移动 */
  isMoving: boolean;
  /** 当前实际速度 (units/s) */
  currentSpeed: number;
  /** 身体 pitch 角 (坡度对齐) */
  pitch: number;
  /** 身体 roll 角 (坡度对齐) */
  roll: number;
}

// ─── 工厂函数 ───────────────────────────────────────────

const wanderNoiseFactory = createNoise2D();

export function createLocomotionState(
  startX: number,
  startY: number,
  startZ: number,
  initialHeading: number = 0
): LocomotionState {
  return {
    position: new THREE.Vector3(startX, startY, startZ),
    heading: initialHeading,
    target: new THREE.Vector3(startX, startY, startZ),
    aiState: 'wander',
    legPhase: 0,
    prevPosition: new THREE.Vector3(startX, startY, startZ),
    wanderNoise: wanderNoiseFactory,
    wanderNoiseOffset: Math.random() * 1000,
    wanderTimer: 0,
    isMoving: false,
    currentSpeed: 0,
    pitch: 0,
    roll: 0,
  };
}

// ─── 核心步进函数 ───────────────────────────────────────

export interface StepContext {
  /** 当前时钟时间 */
  time: number;
  /** 帧间隔 */
  delta: number;
  /** 所有场景资源 (用于 isWalkable 检测) */
  assets: any[];
  /** 天气 */
  weather: string;
}

/**
 * stepCreature — 每帧调用一次，处理所有运动逻辑
 *
 * @param state  生物运动状态 (可变，会被原地更新)
 * @param dt     帧间隔
 * @param cfg    运动参数
 * @param ctx    上下文 (时间、资源列表等)
 * @returns 更新后的 state (同一个引用)
 */
export function stepCreature(
  state: LocomotionState,
  dt: number,
  cfg: LocomotionConfig,
  ctx: StepContext,
): LocomotionState {
  // 保存上一帧位置
  state.prevPosition.copy(state.position);

  // ── 1. 确定目标速度 ──────────────────────────────────
  const toTarget = new THREE.Vector3().subVectors(state.target, state.position);
  toTarget.y = 0; // 只在 XZ 平面移动
  const distToTarget = toTarget.length();

  // 根据AI状态选择速度
  let desiredSpeed = cfg.speed;
  if (state.aiState === 'flee') {
    desiredSpeed = cfg.fleeSpeed ?? cfg.runSpeed;
  } else if (state.aiState === 'chase') {
    desiredSpeed = cfg.runSpeed;
  } else if (state.aiState === 'idle' || state.aiState === 'graze' || state.aiState === 'drink') {
    desiredSpeed = 0;
  }

  // ── 2. 到达减速 (arrival) ────────────────────────────
  let moveSpeed = desiredSpeed;
  if (distToTarget < cfg.arriveRadius && desiredSpeed > 0) {
    // 线性减速到 0
    moveSpeed = desiredSpeed * (distToTarget / cfg.arriveRadius);
    if (moveSpeed < 0.05) moveSpeed = 0;
  }

  // ── 3. 计算期望朝向 ──────────────────────────────────
  let desiredHeading = state.heading;
  if (distToTarget > 0.05 && moveSpeed > 0) {
    desiredHeading = Math.atan2(toTarget.x, toTarget.z);
  }

  // ── 4. 朝向平滑 (限制最大转向角速度) ─────────────────
  let headingDiff = desiredHeading - state.heading;
  // 归一化到 [-PI, PI]
  while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
  while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;

  const maxTurn = cfg.turnRate * dt;
  if (Math.abs(headingDiff) > maxTurn) {
    headingDiff = Math.sign(headingDiff) * maxTurn;
  }
  state.heading += headingDiff;

  // ── 5. 计算移动向量 ──────────────────────────────────
  const moveDir = new THREE.Vector3(
    Math.sin(state.heading),
    0,
    Math.cos(state.heading)
  );

  let actualDisplacement = 0;

  if (moveSpeed > 0) {
    const probeDist = cfg.obstacleProbeDistance ?? 1.5;
    const nextX = state.position.x + moveDir.x * moveSpeed * dt;
    const nextZ = state.position.z + moveDir.z * moveSpeed * dt;

    // ── 6. 避障转向 (steer) ─────────────────────────────
    if (isWalkable(nextX, nextZ, ctx.assets)) {
      // 前方可走，正常移动
      state.position.x = nextX;
      state.position.z = nextZ;
      actualDisplacement = moveSpeed * dt;
    } else {
      // 前方不可走 → 尝试左右偏转
      const steerAngles = [Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2];
      let steered = false;

      for (const angle of steerAngles) {
        const testHeading = state.heading + angle;
        const testDirX = Math.sin(testHeading);
        const testDirZ = Math.cos(testHeading);
        const testX = state.position.x + testDirX * moveSpeed * dt;
        const testZ = state.position.z + testDirZ * moveSpeed * dt;

        if (isWalkable(testX, testZ, ctx.assets)) {
          // 偏转方向可走，更新朝向和位置
          state.heading = testHeading;
          state.position.x = testX;
          state.position.z = testZ;
          actualDisplacement = moveSpeed * dt;
          steered = true;
          break;
        }
      }

      if (!steered) {
        // 所有方向都不可走 → 停一帧，AI 层会换目标
        moveSpeed = 0;
        actualDisplacement = 0;
      }
    }
  }

  // ── 7. 地形贴合 + 坡度对齐 ───────────────────────────
  const { y: surfaceY } = getWalkableHeight(
    state.position.x,
    state.position.z,
    ctx.time,
    ctx.weather,
    ctx.assets
  );
  state.position.y = surfaceY;

  // 坡度对齐
  const slopeStrength = cfg.slopeAlignStrength ?? 0.5;
  if (slopeStrength > 0) {
    const grad = getTerrainGradient(state.position.x, state.position.z);
    // pitch: 前后倾斜
    const targetPitch = -Math.atan2(grad.dz, 0.2) * slopeStrength;
    // roll: 左右倾斜
    const targetRoll = -Math.atan2(grad.dx, 0.2) * slopeStrength;
    // 平滑过渡
    state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 5);
    state.roll += (targetRoll - state.roll) * Math.min(1, dt * 5);
  }

  // ── 8. 腿部步频与位移挂钩 ─────────────────────────────
  if (actualDisplacement > 0.0001) {
    state.legPhase += actualDisplacement / cfg.stepLength;
  }
  // idle 时 legPhase 不变 → 腿不动

  // ── 9. 更新状态标志 ──────────────────────────────────
  state.isMoving = actualDisplacement > 0.001;
  state.currentSpeed = actualDisplacement / Math.max(dt, 0.001);

  return state;
}

// ─── 自然游荡辅助 ───────────────────────────────────────

/**
 * 更新游荡目标 — 用航向角缓慢漂移代替随机远点
 * 应在 AI tick (约 0.18s 间隔) 中调用
 */
export function updateWanderTarget(
  state: LocomotionState,
  cfg: LocomotionConfig,
  assets: any[],
  boundsRadius: number = 18,
): void {
  const driftRate = cfg.wanderDriftRate ?? 0.3;
  const interval = cfg.wanderTargetInterval ?? 3;

  state.wanderTimer += 0.18; // AI tick 间隔

  if (state.wanderTimer < interval) {
    // 用噪声缓慢漂移航向
    const noiseVal = state.wanderNoise(
      state.wanderNoiseOffset + state.wanderTimer * driftRate,
      0
    );
    state.heading += noiseVal * 0.02;
    return;
  }

  state.wanderTimer = 0;

  // 基于当前航向 + 噪声偏移，生成新目标
  const noiseAngle = state.wanderNoise(
    state.wanderNoiseOffset + state.wanderTimer * 0.5,
    1
  ) * Math.PI; // ±180° 范围
  const newHeading = state.heading + noiseAngle * 0.3; // 温和偏转
  const wanderDist = 3 + Math.random() * 5;

  let newTargetX = state.position.x + Math.sin(newHeading) * wanderDist;
  let newTargetZ = state.position.z + Math.cos(newHeading) * wanderDist;

  // 限制在岛屿范围内
  const distFromCenter = Math.sqrt(newTargetX * newTargetX + newTargetZ * newTargetZ);
  if (distFromCenter > boundsRadius) {
    // 朝中心方向偏移
    const toCenterAngle = Math.atan2(-newTargetX, -newTargetZ);
    newTargetX = state.position.x + Math.sin(toCenterAngle) * wanderDist * 0.5;
    newTargetZ = state.position.z + Math.cos(toCenterAngle) * wanderDist * 0.5;
  }

  if (isWalkable(newTargetX, newTargetZ, assets)) {
    state.target.set(newTargetX, 0, newTargetZ);
  }
  // 不可走则保持当前目标，等下一轮
}

// ─── 腿部动画辅助 ───────────────────────────────────────

/**
 * 计算腿部旋转角度 — 基于位移驱动的 legPhase
 * @param legPhase  位移驱动的相位
 * @param isMoving  是否在移动
 * @returns 前左/前右/后左/后右 四条腿的旋转角度
 */
export function computeLegAngles(
  legPhase: number,
  isMoving: boolean,
): { fl: number; fr: number; bl: number; br: number } {
  if (!isMoving) {
    return { fl: 0, fr: 0, bl: 0, br: 0 };
  }

  const swing = Math.sin(legPhase * Math.PI * 2) * 0.5;
  // 对角步态: FL+BR 同步, FR+BL 同步
  return {
    fl: swing,
    fr: -swing,
    bl: -swing,
    br: swing,
  };
}

/**
 * 将运动状态应用到 Three.js Group
 * 设置 position, rotation (heading + pitch + roll)
 */
export function applyLocomotionToGroup(
  group: THREE.Group,
  state: LocomotionState,
  bobAmplitude: number = 0.015,
): void {
  group.position.set(
    state.position.x,
    state.position.y + (state.isMoving ? Math.abs(Math.sin(state.legPhase * Math.PI * 2)) * bobAmplitude * state.currentSpeed : 0),
    state.position.z,
  );

  // YXZ 旋转顺序: 先 heading(Y), 再 pitch(X), 再 roll(Z)
  group.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
}
