import { NARRATIVE_FRAGMENTS, type NarrativeFragment } from './fragmentData';

/** 加权随机抽一签（测试期不限次数，可重复）。玩家挑哪张牌都揭示这一签。 */
export function pickFragment(_collected: string[], random = Math.random): NarrativeFragment {
  const total = NARRATIVE_FRAGMENTS.reduce((sum, fragment) => sum + fragment.weight, 0);
  let cursor = random() * total;
  for (const fragment of NARRATIVE_FRAGMENTS) {
    cursor -= fragment.weight;
    if (cursor <= 0) return fragment;
  }
  return NARRATIVE_FRAGMENTS[0];
}
