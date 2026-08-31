import { deepFreeze } from '../player/immutable.js';
import type { SkillId } from './ids.js';
import type { PlayerSkillState } from './types.js';

export function createEmptyPlayerSkillState(): PlayerSkillState {
  return deepFreeze({
    acquisitions: [],
    equippedSkillIds: [null, null, null, null],
  });
}

export function deriveOwnedSkillIds(skillState: PlayerSkillState): readonly SkillId[] {
  return Object.freeze(skillState.acquisitions.map(({ selectedSkillId }) => selectedSkillId));
}
