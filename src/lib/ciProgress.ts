// 辞（岛灵）的好感度与记忆：账号级持久化，跨所有小岛。
// 与 globalProgress.ts 同级，独立于单岛存档。

const CI_AFFINITY_KEY = 'ci_affinity';
const CI_MEMORY_KEY = 'ci_memory';

// ===== 好感度 =====

export function getCiAffinity(): number {
  try { return parseInt(localStorage.getItem(CI_AFFINITY_KEY) || '0', 10) || 0; } catch { return 0; }
}

export function setCiAffinity(v: number): void {
  try { localStorage.setItem(CI_AFFINITY_KEY, String(Math.max(0, Math.floor(v)))); } catch { /* ignore */ }
}

export function addCiAffinity(n: number): number {
  const next = getCiAffinity() + n;
  setCiAffinity(next);
  return next;
}

/** 好感等级：0-20 礼貌疏离 / 21-60 熟稔 / 61+ 亲近老友 */
export function getCiAffinityLevel(): 'stranger' | 'familiar' | 'close' {
  const a = getCiAffinity();
  if (a >= 61) return 'close';
  if (a >= 21) return 'familiar';
  return 'stranger';
}

export function getAffinityLevelLabel(level: 'stranger' | 'familiar' | 'close'): string {
  switch (level) {
    case 'close': return '亲近老友';
    case 'familiar': return '熟稔';
    case 'stranger': return '礼貌疏离';
  }
}

// ===== 记忆 =====

export interface CiMemoryEntry {
  text: string;     // 记忆内容
  at: number;       // 时间戳
  type: string;     // 类型: 'island_name' | 'action' | 'event' | 'chat'
}

const MAX_MEMORY = 30; // 最多保留 30 条

export function getCiMemory(): CiMemoryEntry[] {
  try {
    const raw = localStorage.getItem(CI_MEMORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function setCiMemory(entries: CiMemoryEntry[]): void {
  try {
    // 只保留最近 MAX_MEMORY 条
    const trimmed = entries.slice(-MAX_MEMORY);
    localStorage.setItem(CI_MEMORY_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function addCiMemory(entry: CiMemoryEntry): void {
  const mem = getCiMemory();
  mem.push(entry);
  setCiMemory(mem);
}

/** 生成记忆摘要，用于注入 prompt（最近 10 条，去重） */
export function getCiMemorySummary(): string {
  const mem = getCiMemory();
  if (mem.length === 0) return '';
  const recent = mem.slice(-10);
  return recent.map(m => m.text).join('；');
}
