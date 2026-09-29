import { describe, expect, it } from 'vitest';
import { createRng, generatePositionAlphaWeightedOfferV2 } from '@project-saturday/game-core';
import { positionSkillOffers } from '../content/position-skill-offers.js';
import { localeMessages } from '../locales/index.js';
import { validatePositionSkillBuilds } from './position-skill-builds.js';

describe('current authored position offer foundation', () => {
  it.each(['position_qb', 'position_rb', 'position_cb'] as const)(
    '%s weights canonical unique offers by actual source affinity',
    (positionId) => {
      const rng = JSON.parse(JSON.stringify(createRng(`offer-${positionId}`))) as ReturnType<
        typeof createRng
      >;
      const definitions = structuredClone(positionSkillOffers);
      const owned = definitions
        .filter((entry) => entry.positionId === positionId)
        .slice(0, 2)
        .map(({ id }) => id);
      const sources = [{ sourceId: 'breakthrough_source_development', points: 9 }] as const;
      const before = JSON.stringify({ rng, definitions, owned, sources });
      const result = generatePositionAlphaWeightedOfferV2(
        positionId,
        owned,
        sources,
        definitions,
        rng,
      )!;
      expect(result).not.toBeNull();
      expect(result.candidates).toHaveLength(10);
      expect(result.offeredSkillIds).toHaveLength(3);
      expect(new Set(result.offeredSkillIds).size).toBe(3);
      for (const candidate of result.candidates) {
        const entry = definitions.find(({ id }) => id === candidate.skillId)!;
        expect(entry.positionId).toBe(positionId);
        expect(owned).not.toContain(candidate.skillId);
        expect(candidate.weight).toBe(
          entry.baseOfferWeight + (entry.sourceId === sources[0].sourceId ? 12 : 0),
        );
      }
      expect(result.rng.drawCount - rng.drawCount).toBe(3);
      expect(
        generatePositionAlphaWeightedOfferV2(
          positionId,
          [...owned].reverse(),
          sources,
          [...definitions].reverse(),
          rng,
        ),
      ).toEqual(result);
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
      expect(JSON.stringify({ rng, definitions, owned, sources })).toBe(before);
      expect(Object.isFrozen(rng)).toBe(false);
      expect(Object.isFrozen(definitions[0])).toBe(false);
      expect(Object.isFrozen(result.candidates[0])).toBe(true);
      const nearlyComplete = definitions
        .filter((entry) => entry.positionId === positionId)
        .slice(0, 10)
        .map(({ id }) => id);
      const empty = generatePositionAlphaWeightedOfferV2(
        positionId,
        nearlyComplete,
        sources,
        definitions,
        rng,
      )!;
      expect(empty.offeredSkillIds).toBeNull();
      expect(empty.rng).toEqual(rng);
    },
  );

  it('rejects invalid, sparse, duplicate, cross-position, unordered and over-cap inputs', () => {
    const rng = createRng('bad-offer');
    const first = positionSkillOffers[0]!;
    expect(
      generatePositionAlphaWeightedOfferV2('position_qb', [], [], [first, first], rng),
    ).toBeNull();
    expect(
      generatePositionAlphaWeightedOfferV2(
        'position_qb',
        ['skill_rb_shared_credit_s'],
        [],
        positionSkillOffers,
        rng,
      ),
    ).toBeNull();
    expect(
      generatePositionAlphaWeightedOfferV2(
        'position_qb',
        [],
        [
          { sourceId: 'breakthrough_source_life', points: 10 },
          { sourceId: 'breakthrough_source_development', points: 10 },
        ],
        positionSkillOffers,
        rng,
      ),
    ).toBeNull();
    expect(
      generatePositionAlphaWeightedOfferV2(
        'position_qb',
        [],
        [
          { sourceId: 'breakthrough_source_development', points: 40 },
          { sourceId: 'breakthrough_source_life', points: 40 },
        ],
        positionSkillOffers,
        rng,
      ),
    ).toBeNull();
    const sparse = [...positionSkillOffers];
    delete sparse[0];
    expect(generatePositionAlphaWeightedOfferV2('position_qb', [], [], sparse, rng)).toBeNull();
    expect(
      generatePositionAlphaWeightedOfferV2('position_qb', [], [], positionSkillOffers, {
        ...rng,
        drawCount: Number.MAX_SAFE_INTEGER,
      }),
    ).toBeNull();
    for (const offers of [
      [],
      [first, first],
      [{ ...first, baseOfferWeight: 0 }],
      [{ ...first, familyId: 'skill_family_life' }],
    ])
      expect(validatePositionSkillBuilds(localeMessages, undefined, undefined, offers).ok).toBe(
        false,
      );
    expect(validatePositionSkillBuilds(localeMessages).ok).toBe(true);
  });
});
