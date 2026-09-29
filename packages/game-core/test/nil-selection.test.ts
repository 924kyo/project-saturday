import { describe, expect, it } from 'vitest';
import { selectNilOfferFromContext } from '../src/off-field/nil-selection.js';
import { createRng, nextInt } from '../src/random/rng.js';
import type {
  ActiveNilCareerStateV1,
  NilOfferEligibilityContextV1,
  NilOfferMechanicsDefinition,
} from '../src/off-field/types.js';

const nil: ActiveNilCareerStateV1 = {
  model: 'nil_v1',
  bootstrapStatus: 'ACTIVE',
  fictionalFundsUsd: 0,
  benefitStacks: [],
  pendingOffers: [],
  activeObligation: null,
  lastOfferAttempt: null,
  history: [],
};
const context: NilOfferEligibilityContextV1 = {
  brand: 40,
  depthRank: 2,
  gpaMilli: 2500,
  programStrengthBandId: 'program_strength_builder',
  tagIds: ['tag_position_qb'],
};
const offer: NilOfferMechanicsDefinition = {
  id: 'nil_offer_test_a',
  categoryId: 'nil_category_community',
  weight: 10,
  expirationWeeks: 2,
  requirements: {
    minimumBrand: 40,
    maximumDepthRank: 2,
    minimumGpaMilli: 2500,
    programStrengthBandIds: ['program_strength_builder'],
    requiredTagIds: ['tag_position_qb'],
  },
  rewardEffects: [{ type: 'nil_funds_delta_usd', deltaUsd: 50 }],
  obligation: {
    id: 'nil_obligation_test_a',
    typeId: 'nil_obligation_type_community_visit',
    durationWeeks: 1,
    focusCost: 1,
    weeklyEffects: [],
    defaultEffects: [],
  },
};
const catalog = [offer, { ...offer, id: 'nil_offer_test_b', weight: 30 }] as const;

describe('shared validated NIL selection arithmetic', () => {
  it('uses the exact weighted draw, canonical order, context, and inclusive expiry', () => {
    const rng = createRng('nil-shared-selection');
    const sample = nextInt(rng, 0, 40);
    const selected = selectNilOfferFromContext(nil, context, catalog, 4, rng);
    expect(selected).toEqual(
      selectNilOfferFromContext(nil, context, [...catalog].reverse(), 4, rng),
    );
    expect(selected.evidence).toEqual({
      model: 'nil_offer_selection_v1',
      weekIndex: 4,
      context,
      eligibleOfferIds: ['nil_offer_test_a', 'nil_offer_test_b'],
      totalWeight: 40,
      roll: sample.value,
      selectedOfferId: sample.value < 10 ? 'nil_offer_test_a' : 'nil_offer_test_b',
      rngDrawCountBefore: rng.drawCount,
      rngDrawCountAfter: sample.nextRng.drawCount,
    });
    expect(selected.rng).toEqual(sample.nextRng);
    expect(selected.nil.pendingOffers).toEqual([
      {
        offerId: selected.evidence.selectedOfferId,
        offeredWeekIndex: 4,
        expiresAfterWeekIndex: 6,
        selection: selected.evidence,
      },
    ]);
    expect(selected.nil.lastOfferAttempt).toEqual(selected.evidence);
    expect(selected.nil.history).toEqual(nil.history);
  });

  it.each([
    { brand: 39 },
    { depthRank: 3 },
    { gpaMilli: 2499 },
    { programStrengthBandId: 'program_strength_national' as const },
    { tagIds: [] },
  ])('preserves each exact eligibility boundary and a zero-draw miss: %j', (change) => {
    const rng = createRng('nil-shared-boundary');
    const result = selectNilOfferFromContext(nil, { ...context, ...change }, catalog, 4, rng);
    expect(result.rng).toEqual(rng);
    expect(result.evidence.eligibleOfferIds).toEqual([]);
    expect(result.evidence.totalWeight).toBe(0);
    expect(result.evidence.roll).toBeNull();
    expect(result.evidence.selectedOfferId).toBeNull();
    expect(result.nil.pendingOffers).toEqual([]);
  });

  it('excludes previously offered templates after decisions or expiry', () => {
    const rng = createRng('nil-shared-history');
    const first = selectNilOfferFromContext(nil, context, [offer], 0, rng);
    const pending = first.nil.pendingOffers[0]!;
    for (const entry of [
      { model: 'nil_offer_expiration_v1', weekIndex: 3, offer: pending } as const,
      {
        model: 'nil_offer_decision_v1',
        weekIndex: 1,
        decisionId: 'DECLINE',
        offer: pending,
        appliedSkillEffects: [],
        rewardMultiplierPermille: 1000,
        appliedEffects: [],
      } as const,
    ]) {
      const result = selectNilOfferFromContext(
        { ...nil, history: [entry] },
        context,
        catalog,
        4,
        first.rng,
      );
      expect(result.evidence.eligibleOfferIds).toEqual(['nil_offer_test_b']);
      expect(result.nil.history).toEqual([entry]);
    }
  });

  it('never freezes or mutates caller inputs, even when no offer is eligible', () => {
    const source = JSON.parse(
      JSON.stringify({ nil, context, catalog, rng: createRng('nil-owner') }),
    ) as {
      nil: ActiveNilCareerStateV1;
      context: NilOfferEligibilityContextV1;
      catalog: readonly NilOfferMechanicsDefinition[];
      rng: ReturnType<typeof createRng>;
    };
    const before = JSON.stringify(source);
    for (const definitions of [source.catalog, []]) {
      const selected = selectNilOfferFromContext(
        source.nil,
        source.context,
        definitions,
        4,
        source.rng,
      );
      expect(JSON.stringify(source)).toBe(before);
      expect(Object.isFrozen(source.rng)).toBe(false);
      expect(Object.isFrozen(source.nil.history)).toBe(false);
      expect(Object.isFrozen(source.context.tagIds)).toBe(false);
      expect(Object.isFrozen(selected.nil)).toBe(true);
      expect(selected.nil).not.toBe(source.nil);
    }
  });
});
