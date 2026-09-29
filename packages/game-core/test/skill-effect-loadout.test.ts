import { describe, expect, it } from 'vitest';
import {
  collectWeeklySkillEffects,
  collectEquippedLifeHooks,
  derivePassiveBodyRecovery,
  deriveInjuryRiskSkillEffects,
  type SkillEffectLoadout,
  type SkillMechanicsDefinition,
  type PlayerSkillStateV2,
} from '../src/index.js';

const skill: SkillMechanicsDefinition = {
  id: 'skill_loadout_fixture_a',
  familyId: 'skill_family_development',
  gradeId: 'skill_grade_a',
  baseOfferWeight: 100,
  eligibility: {
    positionIds: [],
    archetypeIds: [],
    requiredPlayerTagIds: [],
    excludedPlayerTagIds: [],
    minWeekIndex: 0,
  },
  behaviorWeightRules: [],
  effects: [
    {
      type: 'action_xp_multiplier',
      multiplierPermille: 1250,
      scope: { type: 'action_tags', actionTagIds: ['action_focus_position_training'] },
      condition: { type: 'action_occurrence_at_least', minimumCount: 2 },
    },
    {
      type: 'action_body_cost_multiplier',
      multiplierPermille: 900,
      scope: { type: 'action_tags', actionTagIds: ['action_focus_position_training'] },
      condition: { type: 'always' },
    },
    { type: 'passive_body_recovery_flat', delta: 3 },
    { type: 'injury_risk_multiplier', multiplierPermille: 900 },
    { type: 'life_hook', hookId: 'life_hook_nil_reward_multiplier', valueMilli: 1100 },
  ],
};
const loadout: SkillEffectLoadout = {
  model: 'skill_effect_loadout_v1',
  equippedSkillIds: [null, null, null, skill.id],
};
const historical: PlayerSkillStateV2 = {
  acquisitions: [
    {
      offerIndex: 0,
      weekIndex: 0,
      offeredSkillIds: [skill.id, 'skill_fixture_b', 'skill_fixture_c'],
      selectedSkillId: skill.id,
      rngDrawCountBefore: 0,
      rngDrawCountAfter: 3,
    },
  ],
  equippedSkillIds: [null, null, null, skill.id],
};

describe('explicit four-slot effect loadout', () => {
  it('matches historical recovery/injury/life arithmetic and keeps slot/effect order without fabricated acquisitions', () => {
    const catalog = structuredClone([skill]);
    const source = structuredClone(loadout);
    expect(derivePassiveBodyRecovery(95, 10, source, catalog, 2)).toEqual(
      derivePassiveBodyRecovery(95, 10, historical, catalog, 2),
    );
    expect(deriveInjuryRiskSkillEffects(source, catalog)).toEqual(
      deriveInjuryRiskSkillEffects(historical, catalog),
    );
    expect(collectEquippedLifeHooks(source, catalog)).toEqual(
      collectEquippedLifeHooks(historical, catalog),
    );
    const collected = collectEquippedLifeHooks(source, catalog);
    expect(collected).toEqual({
      ok: true,
      hooks: [
        {
          skillId: skill.id,
          slotIndex: 3,
          effectIndex: 4,
          hookId: 'life_hook_nil_reward_multiplier',
          valueMilli: 1100,
        },
      ],
    });
    expect(Object.isFrozen(source)).toBe(false);
    expect(Object.isFrozen(catalog[0])).toBe(false);
    expect(source).toEqual(loadout);
  });

  it('uses actual position action IDs/tags and ordered repetition context with shared weekly arithmetic', () => {
    const action = {
      id: 'action_qb_delivery_work' as const,
      tagIds: ['action_focus_position_training' as const],
      bodyDelta: -13,
      attributeXp: [{ attributeId: 'attribute_throw_power', baseXp: 20 }],
    };
    const context = {
      body: 60,
      actionId: action.id,
      actionIndex: 0 as const,
      planActionIds: [action.id, action.id, 'action_recovery' as const],
      previousActionId: null,
    };
    const first = collectWeeklySkillEffects(loadout, [skill], action, context);
    const second = collectWeeklySkillEffects(loadout, [skill], action, {
      ...context,
      actionIndex: 1,
      previousActionId: action.id,
    });
    if (!first.ok || !second.ok) throw new Error('Missing shared effects');
    expect(first.aggregates.xpMultiplierPermille).toBe(1000);
    expect(second.aggregates.xpMultiplierPermille).toBe(1250);
    expect(second.aggregates.bodyCostMultiplierPermille).toBe(900);
    expect(
      second.appliedSkillEffects.map(({ slotIndex, effectIndex }) => [slotIndex, effectIndex]),
    ).toEqual([
      [3, 0],
      [3, 1],
    ]);
    expect(
      collectWeeklySkillEffects(historical, [skill], action, {
        ...context,
        actionIndex: 1,
        previousActionId: action.id,
      }),
    ).toEqual(second);
    const noTargets = collectWeeklySkillEffects(
      loadout,
      [skill],
      { ...action, attributeXp: [], bodyDelta: 10 },
      { ...context, actionIndex: 1 },
    );
    expect(noTargets.ok && noTargets.appliedSkillEffects).toEqual([]);
  });

  it('rejects malformed, sparse, duplicate, missing-reference, and mixed representations', () => {
    const invalid = [
      { ...loadout, model: 'future' },
      { ...loadout, ownedSkillIds: [] },
      { ...loadout, equippedSkillIds: new Array(4) },
      { ...loadout, equippedSkillIds: [skill.id, skill.id, null, null] },
      { ...loadout, equippedSkillIds: [null, null, skill.id] },
      { ...loadout, acquisitions: [] },
    ];
    for (const input of invalid)
      expect(collectEquippedLifeHooks(input as unknown as SkillEffectLoadout, [skill]).ok).toBe(
        false,
      );
    expect(collectEquippedLifeHooks(loadout, []).ok).toBe(false);
    expect(deriveInjuryRiskSkillEffects(loadout, [{ ...skill, effects: [] }]).ok).toBe(false);
  });
});
