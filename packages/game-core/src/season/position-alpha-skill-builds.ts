import type { SkillEffectLoadout } from '../skills/effects.js';
import type { SkillId } from '../skills/ids.js';
import type { SkillMechanicsDefinition } from '../skills/types.js';
import type { WeeklyActionTagId } from '../weekly/ids.js';
import type { PositionFocusId } from '../weekly/position-focus.js';

export interface PositionAlphaSkillBuildMechanics {
  readonly definitions: readonly SkillMechanicsDefinition[];
  readonly actionTags: Readonly<Record<PositionFocusId, readonly WeeklyActionTagId[]>>;
}

/** Commands own acquisition validation. Game-only cards have no weekly supplement. */
export function positionSkillEffectLoadout(
  equippedSkillIds: readonly (SkillId | null)[],
  definitions: readonly SkillMechanicsDefinition[],
): SkillEffectLoadout {
  return {
    model: 'skill_effect_loadout_v1',
    equippedSkillIds: equippedSkillIds.map((id) =>
      id !== null && definitions.some((definition) => definition.id === id) ? id : null,
    ),
  };
}
