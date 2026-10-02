import { describe, expect, it } from 'vitest';
import {
  allocationPresetsVNext,
  applyAllocationVNext,
  checkAllocationVNext,
  createCareerVNext,
  createPositionPlayerProfile,
  creationBreakdownVNext,
  overallContributionsVNext,
  overallVNext,
  parseCareerVNext,
  scoutingReportVNext,
  serializeCareerVNext,
  VNEXT_ALLOCATION_TUNING,
  type PlayerAppearance,
  type PositionPlayerCreationIdentity,
  type VNextPositionId,
} from '@project-saturday/game-core';

import {
  appearanceCatalogVNext,
  buildCareerVNextMechanics,
  creationContent,
  defaultWrAppearance,
  positionAlphaContent,
  suggestionNamePoolVNext,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';

function identity(
  positionId: VNextPositionId,
  archetypeId: string,
  recruitingBackgroundId = 'background_late_bloomer',
  appearance: PlayerAppearance = defaultWrAppearance,
): PositionPlayerCreationIdentity {
  return {
    displayName: 'Build Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId,
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance,
    heightCm: 186,
    weightKg: 90,
  } as PositionPlayerCreationIdentity;
}

function profileOf(id: PositionPlayerCreationIdentity) {
  const mechanics = buildCareerVNextMechanics(id)!;
  const created = createPositionPlayerProfile({
    careerSeed: 'build',
    identity: id,
    mechanics: mechanics.creation,
  });
  if (!created.ok) throw new Error('profile');
  return { profile: created.player, mechanics };
}

const POSITIONS = positionAlphaContent.positions
  .filter(({ id }) =>
    [
      'position_qb',
      'position_rb',
      'position_wr',
      'position_cb',
      'position_lb',
      'position_edge',
    ].includes(id),
  )
  .map(({ id, archetypeIds }) => ({ positionId: id as VNextPositionId, archetypeIds }));

describe('M12 creation: the point budget', () => {
  const { profile, mechanics } = profileOf(identity('position_cb', 'archetype_cb_press_man'));
  const keys = Object.keys(mechanics.room.recruitingAbilityWeightsPermille);

  it('enforces the budget, the per-attribute caps, the refund cap and the ceiling', () => {
    const tuning = VNEXT_ALLOCATION_TUNING;
    expect(checkAllocationVNext(profile, {}).remaining).toBe(tuning.budget);
    expect(checkAllocationVNext(profile, { [keys[0]!]: tuning.maxRaise + 1 }).issues).toContain(
      'allocation.raise_cap',
    );
    expect(checkAllocationVNext(profile, { [keys[0]!]: -(tuning.maxLower + 1) }).issues).toContain(
      'allocation.lower_cap',
    );
    const overBudget = Object.fromEntries(keys.slice(0, 3).map((id) => [id, 4]));
    expect(checkAllocationVNext(profile, overBudget).issues).toContain('allocation.over_budget');
    // Lowering buys points back, up to the refund cap.
    const traded = { ...overBudget, [keys.at(-1)!]: -2 };
    expect(checkAllocationVNext(profile, traded)).toMatchObject({ ok: true, remaining: 0 });
    const tooMuchRefund = Object.fromEntries(keys.slice(-3).map((id) => [id, -3]));
    expect(checkAllocationVNext(profile, tooMuchRefund).issues).toContain('allocation.refund_cap');
    expect(checkAllocationVNext(profile, { attribute_unknown: 1 }).issues).toContain(
      'allocation.unknown_attribute',
    );
    expect(checkAllocationVNext(profile, { [keys[0]!]: 2.5 }).issues).toContain(
      'allocation.not_integer',
    );
    // A legacy bonus widens the budget, never the caps.
    expect(checkAllocationVNext(profile, overBudget, 2).ok).toBe(true);
  });

  it('applies the allocation to ratings and overall, and createCareerVNext saves it', () => {
    const allocation = { [keys[0]!]: 5, [keys[1]!]: 5 };
    const applied = applyAllocationVNext(profile, allocation);
    const rating = (p: typeof profile, id: string) =>
      (p.attributes as unknown as Record<string, { rating: number }>)[id]!.rating;
    expect(rating(applied, keys[0]!)).toBe(rating(profile, keys[0]!) + 5);
    expect(overallVNext(applied, mechanics)).toBeGreaterThan(overallVNext(profile, mechanics));
    const id = identity('position_cb', 'archetype_cb_press_man');
    const created = createCareerVNext(
      { seed: 'alloc', identity: id, allocation, presetId: null },
      mechanics,
    );
    if (!created.ok) throw new Error(created.reason);
    expect(created.career.athlete.creation).toMatchObject({ allocation, bonusBudget: 0 });
    expect(rating(created.career.athlete.profile, keys[0]!)).toBe(rating(profile, keys[0]!) + 5);
    expect(
      createCareerVNext({ seed: 'alloc', identity: id, allocation: { [keys[0]!]: 9 } }, mechanics)
        .ok,
    ).toBe(false);
    // The legacy head start is capped.
    expect(createCareerVNext({ seed: 'alloc', identity: id, bonusBudget: 9 }, mechanics).ok).toBe(
      false,
    );
  });

  it('offers valid presets for every position, style and background, and Recommended helps overall', () => {
    for (const { positionId, archetypeIds } of POSITIONS)
      for (const archetypeId of archetypeIds)
        for (const { id: backgroundId } of creationContent.recruitingBackgrounds) {
          const built = profileOf(identity(positionId, archetypeId, backgroundId));
          const presets = allocationPresetsVNext(built.profile, built.mechanics);
          const ids = presets.map(({ id }) => id);
          expect(ids, `${archetypeId} ${backgroundId}`).toContain('preset_recommended');
          expect(ids).toContain('preset_none');
          for (const preset of presets)
            expect(checkAllocationVNext(built.profile, preset.allocation).ok).toBe(true);
          const recommended = presets.find(({ id }) => id === 'preset_recommended')!;
          expect(
            overallVNext(
              applyAllocationVNext(built.profile, recommended.allocation),
              built.mechanics,
            ),
          ).toBeGreaterThan(overallVNext(built.profile, built.mechanics));
        }
  });

  it('itemizes every rating by source, and the sources add up', () => {
    const allocation = { [keys[0]!]: 3 };
    const rows = creationBreakdownVNext(
      profile.positionId,
      mechanics.creation,
      mechanics,
      allocation,
    );
    const applied = applyAllocationVNext(profile, allocation);
    for (const row of rows)
      expect(row.total, row.attributeId).toBe(
        (applied.attributes as unknown as Record<string, { rating: number }>)[row.attributeId]!
          .rating,
      );
    const report = scoutingReportVNext(applied, mechanics)!;
    expect(report.strengths).toHaveLength(2);
    expect(report.weaknesses).toHaveLength(2);
    expect(report.recruitStanding).toBe(-6);
  });
});

describe('M12 overall explanation (playtest report "Explain OVR")', () => {
  it('lists the real weights for every position, and the contributions add up to overall', () => {
    for (const { positionId, archetypeIds } of POSITIONS) {
      const { profile, mechanics } = profileOf(identity(positionId, archetypeIds[0]!));
      const { total, entries } = overallContributionsVNext(profile, mechanics);
      const table = mechanics.room.recruitingAbilityWeightsPermille as Readonly<
        Record<string, number>
      >;
      // Each listed weight is the room's own; anything left out is unweighted or not rated here.
      for (const { attributeId, weightPermille } of entries)
        expect(weightPermille, attributeId).toBe(table[attributeId]);
      const listed = new Set(entries.map(({ attributeId }) => attributeId));
      for (const [attributeId, weight] of Object.entries(table))
        if (!listed.has(attributeId))
          expect(
            weight === 0 || !(attributeId in profile.attributes),
            `${positionId} ${attributeId}`,
          ).toBe(true);
      expect(total, positionId).toBe(overallVNext(profile, mechanics));
    }
  });
});

describe('M12 identity never touches ability (playtest report firm boundary)', () => {
  it('keeps ratings and offers identical across appearance and home region', () => {
    const base = identity('position_wr', 'archetype_wr_deep_threat');
    const mechanics = buildCareerVNextMechanics(base)!;
    const reference = createCareerVNext({ seed: 'identity', identity: base }, mechanics);
    if (!reference.ok) throw new Error(reference.reason);
    const variants: PlayerAppearance[] = [
      { ...defaultWrAppearance, skinToneId: 'skin_tone_dark', hairColorId: 'hair_color_platinum' },
      { ...defaultWrAppearance, faceId: 'face_angular', facialHairId: 'facial_hair_beard' },
      { ...defaultWrAppearance, bodyTypeId: 'body_type_broad', glovesId: 'gloves_accent' },
    ];
    for (const appearance of variants)
      for (const homeRegionId of [
        undefined,
        'home_region_in_state',
        'home_region_international',
      ] as const) {
        const result = createCareerVNext(
          {
            seed: 'identity',
            identity: { ...base, appearance },
            ...(homeRegionId === undefined ? {} : { homeRegionId }),
          },
          mechanics,
        );
        if (!result.ok) throw new Error(result.reason);
        expect(result.career.athlete.profile.attributes).toEqual(
          reference.career.athlete.profile.attributes,
        );
        expect(result.career.recruiting.offers).toEqual(reference.career.recruiting.offers);
      }
  });

  it('round-trips every v3 face and hairstyle through creation and the save codec', () => {
    const base = identity('position_wr', 'archetype_wr_deep_threat');
    const mechanics = buildCareerVNextMechanics(base)!;
    const faces = appearanceCatalogVNext.faceId.options.map(({ id }) => id);
    const styles = appearanceCatalogVNext.hairStyleId.options.map(({ id }) => id);
    expect([faces.length, styles.length]).toEqual([16, 14]);
    for (const [index, faceId] of faces.entries()) {
      const appearance: PlayerAppearance = {
        ...defaultWrAppearance,
        faceId,
        hairStyleId: styles[index % styles.length]!,
        hairColorId: 'hair_color_gray',
        facialHairId: index % 2 === 0 ? 'facial_hair_goatee' : null,
      };
      const created = createCareerVNext(
        { seed: `face-${faceId}`, identity: { ...base, appearance } },
        mechanics,
      );
      if (!created.ok) throw new Error(`${faceId}: ${created.reason}`);
      const restored = parseCareerVNext(serializeCareerVNext(created.career)!);
      expect(restored?.athlete.profile.appearance, faceId).toEqual(appearance);
    }
  });

  it('accepts optional facial hair and rejects a malformed one', () => {
    const base = identity('position_qb', 'archetype_qb_field_general');
    const mechanics = buildCareerVNextMechanics(base)!;
    const bad = { ...base, appearance: { ...defaultWrAppearance, facialHairId: 'beard' as never } };
    expect(createCareerVNext({ seed: 'face', identity: bad }, mechanics).ok).toBe(false);
    expect(createCareerVNext({ seed: 'face', identity: base }, mechanics).ok).toBe(true);
  });
});

describe('M12 appearance and names', () => {
  it('ships copy for every VNext appearance option and suggested name in both languages', () => {
    for (const locale of ['en-US', 'ko-KR'] as const) {
      const messages = localeMessages[locale] as Readonly<Record<string, string>>;
      for (const field of Object.values(appearanceCatalogVNext)) {
        expect(messages[field.labelKey], field.labelKey).toBeTruthy();
        for (const option of field.options)
          expect(messages[option.nameKey], option.nameKey).toBeTruthy();
      }
      for (const entry of [...suggestionNamePoolVNext.given, ...suggestionNamePoolVNext.family])
        expect(messages[entry.nameKey], entry.nameKey).toBeTruthy();
    }
    expect(suggestionNamePoolVNext.given.length).toBeGreaterThanOrEqual(70);
    expect(suggestionNamePoolVNext.family.length).toBeGreaterThanOrEqual(70);
  });

  it('accepts every suggested name as career name tokens', () => {
    const base = identity('position_rb', 'archetype_rb_power_back');
    const mechanics = buildCareerVNextMechanics(base)!;
    for (const [given, family] of [
      [suggestionNamePoolVNext.given.at(-1)!, suggestionNamePoolVNext.family.at(-1)!],
      [suggestionNamePoolVNext.given[0]!, suggestionNamePoolVNext.family[0]!],
    ] as const)
      expect(
        createCareerVNext(
          {
            seed: 'names',
            identity: base,
            nameTokens: { givenNameId: given.id, familyNameId: family.id },
          },
          mechanics,
        ).ok,
      ).toBe(true);
  });
});
