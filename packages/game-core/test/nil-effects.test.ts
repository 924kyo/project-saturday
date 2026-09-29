import { describe, expect, it } from 'vitest';
import { applyNilEffectsFromContext, type NilEffectState } from '../src/off-field/nil-effects.js';
import type { NilEffect } from '../src/off-field/types.js';

function fixture(): NilEffectState {
  return {
    playerState: {
      body: 95,
      preparation: 20,
      confidence: 30,
      coachTrust: 40,
      brand: 50,
      gpa: 3.95,
    },
    relationshipTracks: [{ actorId: 'relationship_actor_position_coach', value: 99 }],
    fictionalFundsUsd: 999_950,
    benefitStacks: [{ benefitId: 'off_field_benefit_recovery_access', quantity: 1 }],
  };
}
const benefits = [{ id: 'off_field_benefit_recovery_access', maximumStack: 2 }] as const;

describe('shared validated NIL effect arithmetic', () => {
  it('retains authored order, positive-only rewards, discrete benefits, and every clamp trace', () => {
    const source = fixture();
    const before = JSON.stringify(source);
    const effects: readonly NilEffect[] = [
      { type: 'nil_integer_state_delta', stateId: 'nil_state_body', delta: 10 },
      { type: 'nil_integer_state_delta', stateId: 'nil_state_body', delta: -20 },
      { type: 'nil_gpa_delta_milli', deltaMilli: 100 },
      { type: 'nil_funds_delta_usd', deltaUsd: 100 },
      { type: 'nil_relationship_delta', actorId: 'relationship_actor_position_coach', delta: 10 },
      { type: 'nil_benefit_grant', benefitId: 'off_field_benefit_recovery_access', quantity: 2 },
    ];
    const result = applyNilEffectsFromContext(
      source,
      effects,
      'nil_effect_source_offer_reward',
      benefits,
      1100,
    )!;
    expect(result.playerState).toEqual({ ...source.playerState, body: 80, gpa: 4 });
    expect(result.fictionalFundsUsd).toBe(1_000_000);
    expect(result.relationshipTracks[0]!.value).toBe(100);
    expect(result.benefitStacks[0]!.quantity).toBe(2);
    expect(
      result.appliedEffects.map(
        ({
          valueBefore,
          baseDelta,
          rewardMultiplierPermille,
          requestedDelta,
          actualDelta,
          valueAfter,
        }) => [
          valueBefore,
          baseDelta,
          rewardMultiplierPermille,
          requestedDelta,
          actualDelta,
          valueAfter,
        ],
      ),
    ).toEqual([
      [95, 10, 1100, 11, 5, 100],
      [100, -20, 1000, -20, -20, 80],
      [3950, 100, 1100, 110, 50, 4000],
      [999950, 100, 1100, 110, 50, 1000000],
      [99, 10, 1100, 11, 1, 100],
      [1, 2, 1000, 2, 1, 2],
    ]);
    expect(
      result.appliedEffects.map(({ effect, effectIndex, sourceId }) => ({
        effect,
        effectIndex,
        sourceId,
      })),
    ).toEqual(
      effects.map((effect, effectIndex) => ({
        effect,
        effectIndex,
        sourceId: 'nil_effect_source_offer_reward',
      })),
    );
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(source.playerState)).toBe(false);
    expect(Object.isFrozen(source.relationshipTracks[0])).toBe(false);
    expect(Object.isFrozen(effects[0])).toBe(false);
    expect(Object.isFrozen(result.playerState)).toBe(true);
  });

  it.each(['nil_effect_source_obligation_weekly', 'nil_effect_source_obligation_default'] as const)(
    '%s never amplifies weekly/default effects or creates debt',
    (sourceId) => {
      const result = applyNilEffectsFromContext(
        { ...fixture(), fictionalFundsUsd: 20 },
        [
          { type: 'nil_integer_state_delta', stateId: 'nil_state_confidence', delta: 10 },
          { type: 'nil_funds_delta_usd', deltaUsd: -100 },
          { type: 'nil_gpa_delta_milli', deltaMilli: -100 },
        ],
        sourceId,
        benefits,
        1500,
      )!;
      expect(result.playerState.confidence).toBe(40);
      expect(result.playerState.gpa).toBe(3.85);
      expect(result.fictionalFundsUsd).toBe(0);
      expect(
        result.appliedEffects.every(
          ({ rewardMultiplierPermille }) => rewardMultiplierPermille === 1000,
        ),
      ).toBe(true);
      expect(result.appliedEffects[1]!.actualDelta).toBe(-20);
    },
  );

  it('rejects missing tracks/benefits without publishing earlier partial effects', () => {
    const state = fixture();
    const before = JSON.stringify(state);
    for (const missing of [
      { type: 'nil_relationship_delta', actorId: 'relationship_actor_direct_competitor', delta: 1 },
      { type: 'nil_benefit_grant', benefitId: 'off_field_benefit_advisor_insight', quantity: 1 },
    ] as const) {
      expect(
        applyNilEffectsFromContext(
          state,
          [{ type: 'nil_funds_delta_usd', deltaUsd: -100 }, missing],
          'nil_effect_source_offer_reward',
          benefits,
          1000,
        ),
      ).toBeNull();
      expect(JSON.stringify(state)).toBe(before);
      expect(Object.isFrozen(state.playerState)).toBe(false);
    }
  });

  it('preserves exact GPA and canonical benefit ordering without unrelated effects', () => {
    const state = fixture();
    const result = applyNilEffectsFromContext(
      state,
      [{ type: 'nil_benefit_grant', benefitId: 'off_field_benefit_advisor_insight', quantity: 1 }],
      'nil_effect_source_offer_reward',
      [...benefits, { id: 'off_field_benefit_advisor_insight', maximumStack: 2 }],
      1500,
    )!;
    expect(result.playerState).toEqual(state.playerState);
    expect(result.benefitStacks.map(({ benefitId }) => benefitId)).toEqual([
      'off_field_benefit_advisor_insight',
      'off_field_benefit_recovery_access',
    ]);
    expect(result.benefitStacks[0]!.quantity).toBe(1);
  });
});
