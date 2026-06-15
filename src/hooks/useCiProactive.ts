import { useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { addCiAffinity, addCiMemory as addCiMemoryEntry, getCiAffinityLevel } from '../lib/ciProgress';
import {
  pickLine, WELCOME_LINES, ECOLOGY_LINES, getPlacementLine,
  REPEAT_SUGGESTION_LINES, IDLE_LINES, ACHIEVEMENT_LINES,
  LEVEL_UP_LINES, AFFINITY_LEVEL_LINES, AMBIENT_LINES,
} from '../game/ci/lines';

/**
 * 辞的主动性 hook：监听游戏事件，驱动辞主动冒泡
 * - 进岛首次欢迎
 * - 系统事件呼应（生态/放置/成就/等级）
 * - 重复操作建议
 * - idle 计时器（90s 无操作）
 * - 环境存在感（天气/时间/季节变化）
 */
export function useCiProactive() {
  const ciSay = useGameStore(s => s.ciSay);
  const screen = useGameStore(s => s.screen);
  const assets = useGameStore(s => s.assets);
  const deerCount = useGameStore(s => s.deerCount);
  const wolfCount = useGameStore(s => s.wolfCount);
  const grassHealth = useGameStore(s => s.grassHealth);
  const playerLevel = useGameStore(s => s.playerLevel);
  const lastPlacedSynergy = useGameStore(s => s.lastPlacedSynergy);
  const weather = useGameStore(s => s.weather);
  const timeOfDay = useGameStore(s => s.timeOfDay);
  const season = useGameStore(s => s.season);
  const islandName = useGameStore(s => s.islandName);
  const addAffinity = useGameStore(s => s.addAffinity);

  // ===== 进岛首次欢迎 =====
  const welcomedRef = useRef(false);
  useEffect(() => {
    if (screen === 'PLAYING' && !welcomedRef.current) {
      welcomedRef.current = true;
      const memory = useGameStore.getState().ci.memory;
      let line: string;
      if (memory.length > 0 && getCiAffinityLevel() !== 'stranger') {
        // 老朋友回来
        line = pickLine(WELCOME_LINES);
      } else {
        // 首次见面
        line = '你好，我是辞。这座岛上的……嗯，算是老住户吧。';
      }
      // 延迟 2s 再说，等场景加载完
      const t = setTimeout(() => ciSay(line), 2000);
      return () => clearTimeout(t);
    }
  }, [screen, ciSay]);

  // ===== 生态事件呼应 =====
  const prevDeerCountRef = useRef(deerCount);
  const prevWolfCountRef = useRef(wolfCount);
  const prevGrassHealthRef = useRef(grassHealth);

  useEffect(() => {
    // 鹿来了
    if (deerCount > prevDeerCountRef.current && prevDeerCountRef.current >= 0) {
      ciSay(pickLine(ECOLOGY_LINES.deer_arrived));
      addAffinity(2);
    }
    prevDeerCountRef.current = deerCount;
  }, [deerCount, ciSay, addAffinity]);

  useEffect(() => {
    // 狼来了
    if (wolfCount > prevWolfCountRef.current && prevWolfCountRef.current >= 0) {
      ciSay(pickLine(ECOLOGY_LINES.wolf_appeared));
      addAffinity(2);
    }
    prevWolfCountRef.current = wolfCount;
  }, [wolfCount, ciSay, addAffinity]);

  useEffect(() => {
    // 生态健康度变化
    if (grassHealth > 80 && prevGrassHealthRef.current <= 80) {
      ciSay(pickLine(ECOLOGY_LINES.health_high));
    } else if (grassHealth < 30 && prevGrassHealthRef.current >= 30) {
      ciSay(pickLine(ECOLOGY_LINES.health_low));
    }
    prevGrassHealthRef.current = grassHealth;
  }, [grassHealth, ciSay]);

  // ===== 放置物件呼应 =====
  const prevAssetCountRef = useRef(assets.length);
  const recentPlacementsRef = useRef<{ type: string; position: { x: number; z: number }; at: number }[]>([]);

  useEffect(() => {
    if (assets.length > prevAssetCountRef.current) {
      // 有新物件放置
      const newAsset = assets[assets.length - 1];
      if (newAsset) {
        // 记录放置
        recentPlacementsRef.current.push({
          type: newAsset.type,
          position: { x: newAsset.position.x, z: newAsset.position.z },
          at: Date.now(),
        });
        // 只保留最近 10 条
        if (recentPlacementsRef.current.length > 10) {
          recentPlacementsRef.current = recentPlacementsRef.current.slice(-10);
        }

        // 检测重复操作（5s 内在同一位置放/删 3+ 次）
        const now = Date.now();
        const recentSamePos = recentPlacementsRef.current.filter(
          p => now - p.at < 5000 &&
            Math.abs(p.position.x - newAsset.position.x) < 2 &&
            Math.abs(p.position.z - newAsset.position.z) < 2
        );
        if (recentSamePos.length >= 3) {
          ciSay(pickLine(REPEAT_SUGGESTION_LINES));
        } else {
          // 正常放置呼应
          ciSay(getPlacementLine(newAsset.type));
          addAffinity(1);
        }

        // 记忆：记录玩家常做的事
        addCiMemoryEntry({
          text: `在${islandName}放置了${newAsset.type}`,
          at: Date.now(),
          type: 'action',
        });
      }
    }
    prevAssetCountRef.current = assets.length;
  }, [assets.length, ciSay, addAffinity, islandName]);

  // ===== 协同事件呼应 =====
  useEffect(() => {
    if (lastPlacedSynergy) {
      ciSay('生态产生了共鸣……感觉到了吗？');
      addAffinity(5);
    }
  }, [lastPlacedSynergy, ciSay, addAffinity]);

  // ===== 等级提升 =====
  const prevLevelRef = useRef(playerLevel);
  useEffect(() => {
    if (playerLevel > prevLevelRef.current) {
      ciSay(pickLine(LEVEL_UP_LINES));
      addAffinity(3);
    }
    prevLevelRef.current = playerLevel;
  }, [playerLevel, ciSay, addAffinity]);

  // ===== 好感度等级变化 =====
  const ciAffinity = useGameStore(s => s.ci.affinity);
  const prevAffinityLevelRef = useRef(getCiAffinityLevel());
  useEffect(() => {
    const currentLevel = getCiAffinityLevel();
    if (currentLevel !== prevAffinityLevelRef.current) {
      const line = AFFINITY_LEVEL_LINES[currentLevel];
      if (line) {
        ciSay(line);
        addCiMemoryEntry({
          text: `好感度升至${currentLevel === 'familiar' ? '熟稔' : '亲近老友'}`,
          at: Date.now(),
          type: 'event',
        });
      }
      prevAffinityLevelRef.current = currentLevel;
    }
  }, [ciAffinity, ciSay]);

  // ===== idle 计时器（90s 无操作 → 陪伴的话） =====
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    // 任意 store 变化视为活动，重置 idle 计时器
    lastActivityRef.current = Date.now();

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= 90000 && useGameStore.getState().screen === 'PLAYING') {
        ciSay(pickLine(IDLE_LINES));
      }
    }, 90000);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [assets, deerCount, wolfCount, grassHealth, weather, timeOfDay, season, playerLevel, ciSay]);

  // ===== 环境存在感 =====
  const prevWeatherRef = useRef(weather);
  const prevTimeOfDayRef = useRef(Math.floor(timeOfDay));
  const prevSeasonRef = useRef(season);
  const lastAmbientRef = useRef(0); // 上次环境句时间戳

  useEffect(() => {
    const now = Date.now();
    // 至少间隔 60s 才说环境句
    if (now - lastAmbientRef.current < 60000) return;

    // 天气变化
    if (weather !== prevWeatherRef.current) {
      prevWeatherRef.current = weather;
      lastAmbientRef.current = now;
      const lines = AMBIENT_LINES[weather === 'rainy' ? 'rainy' : weather === 'snowy' ? 'snowy' : weather === 'stormy' ? 'stormy' : 'morning'];
      if (lines) ciSay(pickLine(lines));
    }
  }, [weather, ciSay]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastAmbientRef.current < 60000) return;

    // 时间段变化（清晨/入夜）
    const currentHour = Math.floor(timeOfDay);
    const prevHour = prevTimeOfDayRef.current;
    prevTimeOfDayRef.current = currentHour;

    if (prevHour < 6 && currentHour >= 6 && currentHour <= 8) {
      // 清晨
      lastAmbientRef.current = now;
      ciSay(pickLine(AMBIENT_LINES.morning));
    } else if (prevHour < 20 && currentHour >= 20 && currentHour <= 22) {
      // 入夜
      lastAmbientRef.current = now;
      ciSay(pickLine(AMBIENT_LINES.night));
    }
  }, [timeOfDay, ciSay]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastAmbientRef.current < 60000) return;

    // 季节变化
    if (season !== prevSeasonRef.current) {
      prevSeasonRef.current = season;
      lastAmbientRef.current = now;
      const lines = AMBIENT_LINES[season];
      if (lines) ciSay(pickLine(lines));
    }
  }, [season, ciSay]);
}
