import { describe, expect, it } from 'vitest';
import {
  beginRecruiting,
  commitProgramChoice,
  createWrCareer,
  validateCareerRun,
} from '@project-saturday/game-core';

import {
  contentManifest,
  buildWrCreationMechanics,
  defaultWrCreationIdentity,
  offenseStyleMechanicsDefinitions,
  programContent,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';
import {
  DEFENSE_STYLE_IDS,
  OFFENSE_STYLE_IDS,
  PROGRAM_IDS,
  PROGRAM_REGION_IDS,
  PROGRAM_STRENGTH_BAND_IDS,
  PROGRAM_TRAIT_IDS,
  RECRUIT_ABILITY_ATTRIBUTE_IDS,
  ROSTER_FAMILY_NAME_IDS,
  ROSTER_GIVEN_NAME_IDS,
  ROTATION_POLICY_IDS,
  programContentSchema,
} from '../schema/programs.js';
import { validateContent, validateShippedContent } from './content.js';

type Mutable<T> = T extends readonly (infer TItem)[]
  ? Mutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> }
    : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

function issuePaths(result: ReturnType<typeof validateContent>): readonly string[] {
  return result.ok ? [] : result.issues.map(({ path }) => path);
}

describe('M3 program-world content', () => {
  it('keeps the exact original M3 catalog under schema 5 and compatibility 1', () => {
    expect(contentManifest.schemaVersion).toBe(9);
    expect(contentManifest.contentVersion).toBe(1);
    expect(contentManifest.programs).toBe(programContent);
    expect(programContent.programs.map(({ id }) => id)).toEqual(PROGRAM_IDS);
    expect(programContent.regions.map(({ id }) => id)).toEqual(PROGRAM_REGION_IDS);
    expect(programContent.offenseStyles.map(({ id }) => id)).toEqual(OFFENSE_STYLE_IDS);
    expect(programContent.defenseStyles.map(({ id }) => id)).toEqual(DEFENSE_STYLE_IDS);
    expect(programContent.rotationPolicies.map(({ id }) => id)).toEqual(ROTATION_POLICY_IDS);
    expect(programContent.traits.map(({ id }) => id)).toEqual(PROGRAM_TRAIT_IDS);
    expect(programContent.rosterGivenNames.map(({ id }) => id)).toEqual(ROSTER_GIVEN_NAME_IDS);
    expect(programContent.rosterFamilyNames.map(({ id }) => id)).toEqual(ROSTER_FAMILY_NAME_IDS);
    expect(programContent.programs.map(({ nameKey }) => localeMessages['en-US'][nameKey])).toEqual([
      'Ember Peak Polytechnic',
      'Capital Commonwealth',
      'Cascade Tech',
      'Gulf Meridian',
      'High Desert State',
      'Ironwood',
      'Lakefront Union',
      'Northstar College',
      'Prairie Forge',
      'Redwood Bay',
      'Solis Coast',
      'Crown Sound University',
    ]);
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
  });

  it('keeps all mechanic profiles complete, fixed-point, and materially distinct', () => {
    expect(recruitingMechanicsConfig).toBe(programContent.recruitingConfig);
    expect(programMechanicsDefinitions).toHaveLength(PROGRAM_IDS.length);
    expect(Object.keys(programMechanicsDefinitions[0]!).sort()).toEqual([
      'id',
      'initialCoachTrustBonus',
      'offenseStyleId',
      'recruitingInterestByTier',
      'roomProfile',
      'rotationPolicyId',
      'strengthBandId',
    ]);
    expect(offenseStyleMechanicsDefinitions).toHaveLength(OFFENSE_STYLE_IDS.length);
    expect(rotationPolicyMechanicsDefinitions).toHaveLength(ROTATION_POLICY_IDS.length);
    expect(rosterNameMechanicsPool).toEqual({
      familyNameIds: ROSTER_FAMILY_NAME_IDS,
      givenNameIds: ROSTER_GIVEN_NAME_IDS,
    });
    expect(programContent.recruitingConfig).toEqual(
      expect.objectContaining({
        abilityWeightsPermille: {
          attribute_agility: 80,
          attribute_burst: 100,
          attribute_speed: 150,
          attribute_strength: 70,
          attribute_wr_catch_in_traffic: 130,
          attribute_wr_hands: 170,
          attribute_wr_release: 140,
          attribute_wr_route_running: 160,
        },
        backgroundModifiers: {
          background_blue_chip_star: 12,
          background_late_bloomer: 0,
          background_legacy_recruit: 4,
          background_small_town_star: 5,
          background_under_recruited_athlete: -5,
        },
        offerCount: 5,
        tierThresholds: { nationalMinScore: 62, priorityMinScore: 56 },
      }),
    );
    expect(Object.keys(programContent.recruitingConfig.abilityWeightsPermille).sort()).toEqual(
      [...RECRUIT_ABILITY_ATTRIBUTE_IDS].sort(),
    );
    expect(
      Object.values(programContent.recruitingConfig.abilityWeightsPermille).reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBe(1_000);

    for (const style of programContent.offenseStyles) {
      expect(
        Object.values(style.attributeWeightsPermille).reduce((sum, value) => sum + value, 0),
      ).toBe(1_000);
      expect(Object.keys(style.schemeFitByArchetype)).toHaveLength(3);
    }
    for (const archetypeId of Object.keys(
      programContent.offenseStyles[0].schemeFitByArchetype,
    ) as (keyof (typeof programContent.offenseStyles)[0]['schemeFitByArchetype'])[]) {
      const fits = programContent.offenseStyles.map(
        ({ schemeFitByArchetype }) => schemeFitByArchetype[archetypeId],
      );
      expect(Math.max(...fits) - Math.min(...fits)).toBeGreaterThanOrEqual(10);
    }
  });

  it('provides exact monotone snap ranges for all eight ranks in every rotation policy', () => {
    for (const policy of programContent.rotationPolicies) {
      expect(policy.rankSnapRanges).toHaveLength(8);
      policy.rankSnapRanges.forEach((range, index) => {
        expect(range.rank).toBe(index + 1);
        expect(range.minSnapPermille).toBeLessThanOrEqual(range.maxSnapPermille);
        const previous = policy.rankSnapRanges[index - 1];
        if (previous !== undefined) {
          expect(range.minSnapPermille).toBeLessThanOrEqual(previous.minSnapPermille);
          expect(range.maxSnapPermille).toBeLessThanOrEqual(previous.maxSnapPermille);
        }
      });
    }
  });

  it('balances four programs per strength band and keeps every rivalry reciprocal', () => {
    for (const bandId of PROGRAM_STRENGTH_BAND_IDS) {
      expect(
        programContent.programs.filter(({ strengthBandId }) => strengthBandId === bandId),
      ).toHaveLength(4);
    }
    const byId = new Map(programContent.programs.map((program) => [program.id, program]));
    for (const program of programContent.programs) {
      expect(program.traitIds.length).toBeGreaterThanOrEqual(2);
      expect(program.traitIds.length).toBeLessThanOrEqual(4);
      for (const rivalId of program.rivalProgramIds) {
        expect(byId.get(rivalId)?.rivalProgramIds).toContain(program.id);
      }
    }
    expect(new Set(programContent.programs.map(({ regionId }) => regionId))).toHaveProperty(
      'size',
      PROGRAM_REGION_IDS.length,
    );
    expect(
      new Set(programContent.programs.map(({ offenseStyleId }) => offenseStyleId)),
    ).toHaveProperty('size', OFFENSE_STYLE_IDS.length);
    expect(
      new Set(programContent.programs.map(({ defenseStyleId }) => defenseStyleId)),
    ).toHaveProperty('size', DEFENSE_STYLE_IDS.length);
    expect(
      new Set(programContent.programs.map(({ rotationPolicyId }) => rotationPolicyId)),
    ).toHaveProperty('size', ROTATION_POLICY_IDS.length);
    expect(new Set(programContent.programs.flatMap(({ traitIds }) => traitIds))).toHaveProperty(
      'size',
      PROGRAM_TRAIT_IDS.length,
    );
  });

  it('covers all 390 valid M1 identities through the validated five-offer diversity matrix', () => {
    const traits = contentManifest.creation.personalityTraits;
    let validPairCount = 0;
    for (let firstIndex = 0; firstIndex < traits.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < traits.length; secondIndex += 1) {
        const first = traits[firstIndex]!;
        const second = traits[secondIndex]!;
        if (
          !(first.incompatibleTraitIds as readonly string[]).includes(second.id) &&
          !(second.incompatibleTraitIds as readonly string[]).includes(first.id)
        ) {
          validPairCount += 1;
        }
      }
    }
    expect(validPairCount).toBe(26);
    expect(
      validPairCount *
        contentManifest.creation.wrArchetypes.length *
        contentManifest.creation.recruitingBackgrounds.length,
    ).toBe(390);
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
  });

  it('commits every shipped offer for a literal career into a strict seven-player room', () => {
    const mechanics = buildWrCreationMechanics({
      archetypeId: defaultWrCreationIdentity.archetypeId,
      personalityTraitIds: defaultWrCreationIdentity.personalityTraitIds,
      recruitingBackgroundId: defaultWrCreationIdentity.recruitingBackgroundId,
    });
    expect(mechanics.ok).toBe(true);
    if (!mechanics.ok) {
      return;
    }
    const created = createWrCareer({
      careerSeed: 'm3-shipped-room-integration',
      identity: {
        ...defaultWrCreationIdentity,
        displayName: 'M3 Integration',
      },
      mechanics: mechanics.mechanics,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const choosing = beginRecruiting(
      created.career,
      recruitingMechanicsConfig,
      programMechanicsDefinitions,
      offenseStyleMechanicsDefinitions,
    );
    expect(choosing.ok).toBe(true);
    if (!choosing.ok || choosing.career.recruitingState.type !== 'CHOOSING') {
      return;
    }
    const selectedRoomIds = new Set<string>();
    for (const offer of choosing.career.recruitingState.offers) {
      const committed = commitProgramChoice(
        choosing.career,
        offer.programId,
        programMechanicsDefinitions,
        offenseStyleMechanicsDefinitions,
        rotationPolicyMechanicsDefinitions,
        rosterNameMechanicsPool,
      );
      expect(committed.ok).toBe(true);
      if (!committed.ok) {
        continue;
      }
      expect(committed.career.rng.drawCount - choosing.career.rng.drawCount).toBe(35);
      expect(committed.career.programContext?.competitors).toHaveLength(7);
      expect(committed.career.programContext?.depthOrderIds).toHaveLength(8);
      expect(validateCareerRun(committed.career)).toEqual({ issues: [], ok: true });
      selectedRoomIds.add(committed.career.programContext?.competitors[0].id ?? 'missing');
    }
    expect(selectedRoomIds.size).toBe(5);
    expect(choosing.career.rng.drawCount).toBe(created.career.rng.drawCount);
  });

  it('rejects nonreciprocal rivals and mechanically flat Scheme Fit catalogs', () => {
    const nonreciprocal = clone(contentManifest);
    nonreciprocal.programs.programs[3]!.rivalProgramIds = ['program_cascade_tech'];
    const rivalryResult = validateContent({
      localeResources: localeMessages,
      manifest: nonreciprocal,
    });
    expect(issuePaths(rivalryResult)).toContain('manifest.programs.programs.0.rivalProgramIds.0');

    const flatFit = clone(contentManifest);
    for (const style of flatFit.programs.offenseStyles) {
      (style.schemeFitByArchetype as Record<string, number>)['archetype_wr_deep_threat'] = 80;
    }
    const fitResult = validateContent({ localeResources: localeMessages, manifest: flatFit });
    expect(fitResult.ok).toBe(false);
    if (!fitResult.ok) {
      expect(fitResult.issues).toContainEqual(
        expect.objectContaining({
          code: 'content.invalid-mechanics',
          contentId: 'archetype_wr_deep_threat',
          path: 'manifest.programs.offenseStyles',
        }),
      );
    }
  });

  it('rejects malformed recruiting weights, rank ranges, and one-locale program copy', () => {
    const invalidWeight = clone(programContent);
    (invalidWeight.recruitingConfig.abilityWeightsPermille as Record<string, number>)[
      'attribute_speed'
    ] = 149;
    expect(programContentSchema.safeParse(invalidWeight).success).toBe(false);

    const invalidRange = clone(programContent);
    invalidRange.rotationPolicies[0]!.rankSnapRanges[1]!.maxSnapPermille = 950;
    expect(programContentSchema.safeParse(invalidRange).success).toBe(false);

    const localeResources = {
      'en-US': { ...localeMessages['en-US'] },
      'ko-KR': { ...localeMessages['ko-KR'] },
    };
    delete (localeResources['en-US'] as Record<string, string>)[
      'programWorld.programs.cascadeTech.shortName'
    ];
    const localizationResult = validateContent({ localeResources, manifest: contentManifest });
    expect(localizationResult.ok).toBe(false);
    if (!localizationResult.ok) {
      expect(localizationResult.issues).toContainEqual(
        expect.objectContaining({
          code: 'content.missing-localization-reference',
          locale: 'en-US',
          messageKey: 'programWorld.programs.cascadeTech.shortName',
        }),
      );
    }
  });
});
