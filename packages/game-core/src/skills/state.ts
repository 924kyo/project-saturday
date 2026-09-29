import { deepFreeze } from '../player/immutable.js';
import type { SkillId } from './ids.js';
import { SKILL_BREAKTHROUGH_GAUGE_THRESHOLD } from './tuning.js';
import type { PlayerSkillState, PlayerSkillStateV2 } from './types.js';

export function createEmptyPlayerSkillStateV2(): PlayerSkillStateV2 {
  return deepFreeze({
    acquisitions: [],
    equippedSkillIds: [null, null, null, null],
  });
}

export function createEmptyPlayerSkillState(): PlayerSkillState {
  return deepFreeze({
    acquisitions: [],
    equippedSkillIds: [null, null, null, null],
    breakthroughGauge: {
      model: 'gauge_v1',
      progress: 0,
      threshold: SKILL_BREAKTHROUGH_GAUGE_THRESHOLD,
      lastProgress: null,
    },
  });
}

export function deriveOwnedSkillIds(
  skillState: PlayerSkillState | PlayerSkillStateV2,
): readonly SkillId[] {
  return Object.freeze(skillState.acquisitions.map(({ selectedSkillId }) => selectedSkillId));
}
