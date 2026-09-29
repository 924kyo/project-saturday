import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { CollectedLifeHook } from './types.js';

export interface PositiveLifeSkillMultiplier {
  readonly multiplierPermille: number;
  readonly appliedSkillEffects: readonly CollectedLifeHook[];
}

/** Shared WR/current arithmetic. The registry validates hook values before this step. */
export function derivePositiveLifeSkillMultiplier(
  hooks: readonly CollectedLifeHook[],
  hookId: 'life_hook_relationship_gain_multiplier' | 'life_hook_nil_reward_multiplier',
): PositiveLifeSkillMultiplier {
  const appliedSkillEffects = hooks.filter((hook) => hook.hookId === hookId);
  return deepFreeze(
    cloneSerializable({
      multiplierPermille: Math.min(
        1500,
        Math.max(
          1000,
          1000 + appliedSkillEffects.reduce((total, hook) => total + hook.valueMilli - 1000, 0),
        ),
      ),
      appliedSkillEffects,
    }),
  );
}

export function scalePositiveRelationshipDelta(
  baseDelta: number,
  multiplierPermille: number,
): number {
  return baseDelta > 0 ? Math.ceil((baseDelta * multiplierPermille) / 1000) : baseDelta;
}
