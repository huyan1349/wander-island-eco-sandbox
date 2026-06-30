import { NARRATIVE_FRAGMENTS, type NarrativeFragment } from './fragmentData';

export function getFragmentById(id: string): NarrativeFragment | undefined {
  return NARRATIVE_FRAGMENTS.find(fragment => fragment.id === id);
}
