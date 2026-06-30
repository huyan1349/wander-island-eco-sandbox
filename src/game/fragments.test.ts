import { describe, expect, it } from 'vitest';
import { getFragmentById, NARRATIVE_FRAGMENTS } from './fragments';
import { pickFragment } from './fragmentPicker';

describe('narrative fragments data', () => {
  it('keeps fragment ids unique and lookupable', () => {
    const ids = NARRATIVE_FRAGMENTS.map((fragment) => fragment.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      expect(getFragmentById(id)?.id).toBe(id);
    }
  });

  it('keeps every weighted fragment drawable and display-ready', () => {
    for (const fragment of NARRATIVE_FRAGMENTS) {
      expect(fragment.weight).toBeGreaterThan(0);
      expect(fragment.title.trim()).not.toBe('');
      expect(fragment.oracle.trim()).not.toBe('');
      expect(fragment.story.trim()).not.toBe('');
      expect(fragment.bg.trim()).not.toBe('');
    }
  });

  it('draws from weighted fragments with an injectable random source', () => {
    expect(pickFragment([], () => 0).id).toBe(NARRATIVE_FRAGMENTS[0].id);
    expect(pickFragment([], () => 0.999).id).toBe(NARRATIVE_FRAGMENTS[NARRATIVE_FRAGMENTS.length - 1].id);
  });
});
