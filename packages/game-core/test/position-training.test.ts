import {
  createPositionTrainingProficiencyUses,
  derivePositionPracticeGrade,
  getPlayableAttributeIds,
  resolvePositionTrainingAction,
  type DevelopmentWeekConfig,
  type PositionTrainingActionDefinition,
  type PositionTrainingState,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

const config = {
  bodyXpEfficiencyMinPermille: 600,
  bodyXpEfficiencyPerBodyPoint: 4,
  passiveBodyRecovery: 10,
  proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
  proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
} as const satisfies DevelopmentWeekConfig;

const qbActions = [
  {
    attributeXp: [
      { attributeId: 'attribute_qb_short_accuracy', baseXp: 24 },
      { attributeId: 'attribute_qb_intermediate_accuracy', baseXp: 18 },
    ],
    bodyDelta: -12,
    breakthroughGaugePoints: 9,
    confidenceDelta: 0,
    developmentFamilyId: 'development_family_qb_delivery',
    id: 'action_qb_delivery_work',
    positionId: 'position_qb',
    practiceImpact: 3,
    preparationDelta: 2,
    proficiencyId: 'proficiency_qb_delivery_work',
  },
  {
    attributeXp: [
      { attributeId: 'attribute_qb_read_progression', baseXp: 22 },
      { attributeId: 'attribute_qb_pocket_presence', baseXp: 16 },
    ],
    bodyDelta: -5,
    breakthroughGaugePoints: 8,
    confidenceDelta: 0,
    developmentFamilyId: 'development_family_qb_processing',
    id: 'action_qb_coverage_recognition',
    positionId: 'position_qb',
    practiceImpact: 4,
    preparationDelta: 10,
    proficiencyId: 'proficiency_qb_coverage_recognition',
  },
  {
    attributeXp: [
      { attributeId: 'attribute_qb_throw_power', baseXp: 22 },
      { attributeId: 'attribute_qb_deep_accuracy', baseXp: 14 },
    ],
    bodyDelta: -14,
    breakthroughGaugePoints: 10,
    confidenceDelta: 2,
    developmentFamilyId: 'development_family_qb_movement',
    id: 'action_qb_pressure_movement',
    positionId: 'position_qb',
    practiceImpact: 2,
    preparationDelta: 3,
    proficiencyId: 'proficiency_qb_pressure_movement',
  },
] as const satisfies readonly PositionTrainingActionDefinition[];

function initialState(): PositionTrainingState {
  return {
    attributes: Object.fromEntries(
      getPlayableAttributeIds('position_qb').map((id) => [id, { rating: 60, xp: 0 }]),
    ),
    positionId: 'position_qb',
    proficiencyUses: createPositionTrainingProficiencyUses('position_qb'),
    state: { body: 80, confidence: 50, preparation: 50 },
  };
}

describe('M7 deterministic position training', () => {
  it('resolves a three-focus QB plan with explicit tension, XP, proficiency, and gauge evidence', () => {
    const first = resolvePositionTrainingAction(initialState(), qbActions[0], config);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.evidence.attributeXp.map(({ awardedXp }) => awardedXp)).toEqual([22, 16]);
    expect(first.evidence.bodyXpEfficiencyPermille).toBe(920);
    expect(first.evidence.proficiency).toEqual({
      levelAfter: 0,
      levelBefore: 0,
      proficiencyId: 'proficiency_qb_delivery_work',
      usesAfter: 1,
      usesBefore: 0,
      xpMultiplierPermille: 1000,
    });

    const second = resolvePositionTrainingAction(first.next, qbActions[1], config);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const third = resolvePositionTrainingAction(second.next, qbActions[2], config);
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.next.state).toEqual({ body: 49, confidence: 52, preparation: 65 });
    expect(
      derivePositionPracticeGrade(
        [first.evidence, second.evidence, third.evidence],
        'depth_role_starter',
      ),
    ).toEqual({
      baseScore: 50,
      bodyAfterFocus: 49,
      bodyContribution: -2,
      breakthroughGaugePoints: 27,
      confidenceAfterFocus: 52,
      confidenceContribution: 0,
      focusImpact: 9,
      preparationAfterFocus: 65,
      preparationContribution: 0,
      preparationTarget: 65,
      score: 57,
    });
    expect(Object.isFrozen(third.next)).toBe(true);
  });

  it('makes proficiency thresholds legible and applies the pre-action level multiplier', () => {
    const first = resolvePositionTrainingAction(initialState(), qbActions[0], config);
    if (!first.ok) throw new Error('fixture');
    const second = resolvePositionTrainingAction(first.next, qbActions[0], config);
    if (!second.ok) throw new Error('fixture');
    expect(second.evidence.proficiency.levelAfter).toBe(1);
    expect(second.evidence.proficiency.xpMultiplierPermille).toBe(1000);
    const third = resolvePositionTrainingAction(second.next, qbActions[0], config);
    if (!third.ok) throw new Error('fixture');
    expect(third.evidence.proficiency.levelBefore).toBe(1);
    expect(third.evidence.proficiency.xpMultiplierPermille).toBe(1080);
  });

  it('rejects cross-position definitions and malformed proficiency state without mutation', () => {
    const state = initialState();
    const wrong = {
      ...qbActions[0],
      positionId: 'position_rb',
    } as PositionTrainingActionDefinition;
    expect(resolvePositionTrainingAction(state, wrong, config)).toEqual({
      ok: false,
      reason: 'position_training.invalid_input',
    });
    const malformed = { ...state, proficiencyUses: {} };
    expect(resolvePositionTrainingAction(malformed, qbActions[0], config)).toEqual({
      ok: false,
      reason: 'position_training.invalid_input',
    });
    expect(state.state).toEqual({ body: 80, confidence: 50, preparation: 50 });
  });
});
