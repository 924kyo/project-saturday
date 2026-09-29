import { describe, expect, it } from 'vitest';
import {
  derivePositiveLifeSkillMultiplier,
  scalePositiveRelationshipDelta,
} from '../src/skills/positive-life-effects.js';
import type { CollectedLifeHook } from '../src/skills/types.js';

describe('shared positive life skill arithmetic', () => {
  it('filters the requested hook, stacks to the existing cap and owns its result', () => {
    const hooks: CollectedLifeHook[] = ([0, 1, 2] as const).map((slotIndex) => ({
      skillId: 'skill_campus_bridge_b',
      slotIndex,
      effectIndex: 0,
      hookId: 'life_hook_relationship_gain_multiplier',
      valueMilli: 1200,
    }));
    const baseline = derivePositiveLifeSkillMultiplier(hooks, 'life_hook_nil_reward_multiplier');
    expect(baseline).toEqual({ multiplierPermille: 1000, appliedSkillEffects: [] });
    const boosted = derivePositiveLifeSkillMultiplier(
      hooks,
      'life_hook_relationship_gain_multiplier',
    );
    expect(boosted.multiplierPermille).toBe(1500);
    expect(boosted.appliedSkillEffects).toEqual(hooks);
    expect(Object.isFrozen(boosted.appliedSkillEffects[0])).toBe(true);
    expect(Object.isFrozen(hooks[0])).toBe(false);
    expect(boosted.appliedSkillEffects[0]).not.toBe(hooks[0]);
  });
  it('rounds net positive gains upward and leaves zeros and losses literal', () => {
    expect(
      [-3, -1, 0, 1, 3, 5].map((delta) => scalePositiveRelationshipDelta(delta, 1200)),
    ).toEqual([-3, -1, 0, 2, 4, 6]);
  });
});
