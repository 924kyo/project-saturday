import { z } from 'zod';

import { RECRUITING_BACKGROUND_IDS, WR_ARCHETYPE_IDS } from './creation.js';
import { messageKeyFormatSchema } from './primitives.js';

export const PROGRAM_IDS = [
  'program_ember_peak_polytechnic',
  'program_capital_commonwealth',
  'program_cascade_tech',
  'program_gulf_meridian',
  'program_high_desert_state',
  'program_ironwood',
  'program_lakefront_union',
  'program_northstar_college',
  'program_prairie_forge',
  'program_redwood_bay',
  'program_solis_coast',
  'program_crown_sound',
] as const;

export const PROGRAM_REGION_IDS = [
  'region_appalachian',
  'region_atlantic',
  'region_cascade',
  'region_great_lakes',
  'region_gulf',
  'region_high_desert',
  'region_pacific_coast',
  'region_prairie',
] as const;

export const PROGRAM_STRENGTH_BAND_IDS = [
  'program_strength_national',
  'program_strength_contender',
  'program_strength_builder',
] as const;

export const OFFENSE_STYLE_IDS = [
  'offense_style_balanced_tempo',
  'offense_style_power_play_action',
  'offense_style_precision_spread',
  'offense_style_space_motion',
  'offense_style_vertical_stretch',
] as const;

export const DEFENSE_STYLE_IDS = [
  'defense_style_match_zone',
  'defense_style_multiple',
  'defense_style_pressure_front',
  'defense_style_two_high',
] as const;

export const ROTATION_POLICY_IDS = [
  'rotation_policy_balanced',
  'rotation_policy_tight',
  'rotation_policy_wide',
] as const;

export const PROGRAM_TRAIT_IDS = [
  'program_trait_academic_standard',
  'program_trait_creative_scheme',
  'program_trait_development_lab',
  'program_trait_donor_market',
  'program_trait_national_expectations',
  'program_trait_open_competition',
  'program_trait_patient_path',
  'program_trait_physical_culture',
  'program_trait_pro_workshop',
  'program_trait_quiet_focus',
  'program_trait_rebuild_energy',
  'program_trait_regional_roots',
  'program_trait_spotlight_market',
  'program_trait_stable_staff',
  'program_trait_tempo_identity',
  'program_trait_veteran_loyalty',
] as const;

export const ROSTER_GIVEN_NAME_IDS = [
  'roster_given_name_adrian',
  'roster_given_name_amari',
  'roster_given_name_anton',
  'roster_given_name_bryce',
  'roster_given_name_caleb',
  'roster_given_name_cameron',
  'roster_given_name_darius',
  'roster_given_name_desmond',
  'roster_given_name_devon',
  'roster_given_name_elias',
  'roster_given_name_emmett',
  'roster_given_name_everett',
  'roster_given_name_felix',
  'roster_given_name_gabriel',
  'roster_given_name_henry',
  'roster_given_name_isaiah',
  'roster_given_name_jalen',
  'roster_given_name_jamir',
  'roster_given_name_jordan',
  'roster_given_name_kai',
  'roster_given_name_keon',
  'roster_given_name_leon',
  'roster_given_name_malik',
  'roster_given_name_marcus',
  'roster_given_name_miles',
  'roster_given_name_nico',
  'roster_given_name_noah',
  'roster_given_name_omar',
  'roster_given_name_quincy',
  'roster_given_name_roman',
  'roster_given_name_terrell',
  'roster_given_name_zayne',
] as const;

export const ROSTER_FAMILY_NAME_IDS = [
  'roster_family_name_adeyemi',
  'roster_family_name_alvarez',
  'roster_family_name_banks',
  'roster_family_name_bennett',
  'roster_family_name_brooks',
  'roster_family_name_carter',
  'roster_family_name_chen',
  'roster_family_name_coleman',
  'roster_family_name_dawson',
  'roster_family_name_diaz',
  'roster_family_name_ellis',
  'roster_family_name_ford',
  'roster_family_name_freeman',
  'roster_family_name_grant',
  'roster_family_name_griffin',
  'roster_family_name_harris',
  'roster_family_name_hayes',
  'roster_family_name_ibarra',
  'roster_family_name_jackson',
  'roster_family_name_kim',
  'roster_family_name_king',
  'roster_family_name_lawson',
  'roster_family_name_mitchell',
  'roster_family_name_nguyen',
  'roster_family_name_okafor',
  'roster_family_name_patel',
  'roster_family_name_quinn',
  'roster_family_name_reed',
  'roster_family_name_robinson',
  'roster_family_name_santos',
  'roster_family_name_walker',
  'roster_family_name_young',
] as const;

export const RECRUIT_TIER_IDS = [
  'recruit_tier_national',
  'recruit_tier_priority',
  'recruit_tier_developmental',
] as const;

export const RECRUIT_ABILITY_ATTRIBUTE_IDS = [
  'attribute_speed',
  'attribute_burst',
  'attribute_agility',
  'attribute_strength',
  'attribute_wr_release',
  'attribute_wr_route_running',
  'attribute_wr_hands',
  'attribute_wr_catch_in_traffic',
] as const;

export const programIdSchema = z.enum(PROGRAM_IDS);
export const programRegionIdSchema = z.enum(PROGRAM_REGION_IDS);
export const programStrengthBandIdSchema = z.enum(PROGRAM_STRENGTH_BAND_IDS);
export const offenseStyleIdSchema = z.enum(OFFENSE_STYLE_IDS);
export const defenseStyleIdSchema = z.enum(DEFENSE_STYLE_IDS);
export const rotationPolicyIdSchema = z.enum(ROTATION_POLICY_IDS);
export const programTraitIdSchema = z.enum(PROGRAM_TRAIT_IDS);
export const rosterGivenNameIdSchema = z.enum(ROSTER_GIVEN_NAME_IDS);
export const rosterFamilyNameIdSchema = z.enum(ROSTER_FAMILY_NAME_IDS);
export const recruitTierIdSchema = z.enum(RECRUIT_TIER_IDS);
export const recruitAbilityAttributeIdSchema = z.enum(RECRUIT_ABILITY_ATTRIBUTE_IDS);

const localizedFields = {
  descriptionKey: messageKeyFormatSchema,
  nameKey: messageKeyFormatSchema,
} as const;

const uniqueArray = <T extends z.ZodType>(item: T, min: number, max: number) =>
  z
    .array(item)
    .min(min)
    .max(max)
    .superRefine((values, context) => {
      if (new Set(values).size !== values.length) {
        context.addIssue({ code: 'custom', message: 'References must be unique.' });
      }
    });

export const programRegionDefinitionSchema = z
  .object({ ...localizedFields, id: programRegionIdSchema, kind: z.literal('program_region') })
  .strict();

export const programTraitDefinitionSchema = z
  .object({ ...localizedFields, id: programTraitIdSchema, kind: z.literal('program_trait') })
  .strict();

export const offenseStyleDefinitionSchema = z
  .object({
    ...localizedFields,
    attributeWeightsPermille: z.record(
      recruitAbilityAttributeIdSchema,
      z.number().int().min(1).max(1_000),
    ),
    id: offenseStyleIdSchema,
    kind: z.literal('offense_style'),
    schemeFitByArchetype: z
      .object({
        [WR_ARCHETYPE_IDS[0]]: z.number().int().min(0).max(100),
        [WR_ARCHETYPE_IDS[1]]: z.number().int().min(0).max(100),
        [WR_ARCHETYPE_IDS[2]]: z.number().int().min(0).max(100),
      })
      .strict(),
  })
  .strict()
  .superRefine((style, context) => {
    const weightTotal = Object.values(style.attributeWeightsPermille).reduce(
      (total, weight) => total + weight,
      0,
    );
    if (weightTotal !== 1_000) {
      context.addIssue({
        code: 'custom',
        message: 'WR offense attribute weights must sum to 1000 permille.',
        path: ['attributeWeightsPermille'],
      });
    }
  });

export const defenseStyleDefinitionSchema = z
  .object({ ...localizedFields, id: defenseStyleIdSchema, kind: z.literal('defense_style') })
  .strict();

export const snapRangeSchema = z
  .object({
    maxSnapPermille: z.number().int().min(0).max(1_000),
    minSnapPermille: z.number().int().min(0).max(1_000),
    rank: z.number().int().min(1).max(8),
  })
  .strict()
  .refine((range) => range.minSnapPermille <= range.maxSnapPermille, {
    message: 'Projected snap minimum cannot exceed its maximum.',
  });

export const rotationPolicyDefinitionSchema = z
  .object({
    ...localizedFields,
    id: rotationPolicyIdSchema,
    kind: z.literal('rotation_policy'),
    rankSnapRanges: z.tuple([
      snapRangeSchema,
      snapRangeSchema,
      snapRangeSchema,
      snapRangeSchema,
      snapRangeSchema,
      snapRangeSchema,
      snapRangeSchema,
      snapRangeSchema,
    ]),
  })
  .strict()
  .superRefine((policy, context) => {
    for (const [index, range] of policy.rankSnapRanges.entries()) {
      if (range.rank !== index + 1) {
        context.addIssue({
          code: 'custom',
          message: 'Rotation ranges must be stored in exact rank order.',
          path: ['rankSnapRanges', index, 'rank'],
        });
      }
      const previous = policy.rankSnapRanges[index - 1];
      if (
        previous !== undefined &&
        (range.minSnapPermille > previous.minSnapPermille ||
          range.maxSnapPermille > previous.maxSnapPermille)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Projected snap ranges must be monotone by depth rank.',
          path: ['rankSnapRanges', index],
        });
      }
    }
  });

export const programRatingsSchema = z
  .object({
    academics: z.number().int().min(0).max(100),
    facilities: z.number().int().min(0).max(100),
    fanPressure: z.number().int().min(0).max(100),
    nflPipeline: z.number().int().min(0).max(100),
    nilPower: z.number().int().min(0).max(100),
    playerDevelopment: z.number().int().min(0).max(100),
    prestige: z.number().int().min(0).max(100),
    recruitingReach: z.number().int().min(0).max(100),
    schemeStability: z.number().int().min(0).max(100),
  })
  .strict();

export const programRoomProfileSchema = z
  .object({
    experienceReadinessBase: z.number().int().min(20).max(80),
    practiceFormBase: z.number().int().min(35).max(65),
    talentMean: z.number().int().min(35).max(90),
    talentSpread: z.number().int().min(4).max(20),
    trustBase: z.number().int().min(0).max(40),
  })
  .strict();

export const recruitingConfigSchema = z
  .object({
    abilityWeightsPermille: z.record(
      recruitAbilityAttributeIdSchema,
      z.number().int().min(1).max(1_000),
    ),
    backgroundModifiers: z
      .object({
        [RECRUITING_BACKGROUND_IDS[0]]: z.number().int().min(-20).max(20),
        [RECRUITING_BACKGROUND_IDS[1]]: z.number().int().min(-20).max(20),
        [RECRUITING_BACKGROUND_IDS[2]]: z.number().int().min(-20).max(20),
        [RECRUITING_BACKGROUND_IDS[3]]: z.number().int().min(-20).max(20),
        [RECRUITING_BACKGROUND_IDS[4]]: z.number().int().min(-20).max(20),
      })
      .strict(),
    offerCount: z.literal(5),
    projectedDepthGapThresholds: z
      .object({
        reservePathMin: z.number().int().min(-100).max(100),
        rotationPathMin: z.number().int().min(-100).max(100),
        starterCompetitionMin: z.number().int().min(-100).max(100),
      })
      .strict(),
    tierThresholds: z
      .object({
        nationalMinScore: z.number().int().min(0).max(100),
        priorityMinScore: z.number().int().min(0).max(100),
      })
      .strict(),
  })
  .strict()
  .superRefine((config, context) => {
    const total = Object.values(config.abilityWeightsPermille).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    if (total !== 1_000) {
      context.addIssue({
        code: 'custom',
        message: 'Recruit ability weights must sum to 1000 permille.',
        path: ['abilityWeightsPermille'],
      });
    }
    if (config.tierThresholds.nationalMinScore <= config.tierThresholds.priorityMinScore) {
      context.addIssue({
        code: 'custom',
        message: 'National tier threshold must exceed the priority threshold.',
        path: ['tierThresholds'],
      });
    }
    const gaps = config.projectedDepthGapThresholds;
    if (
      gaps.starterCompetitionMin <= gaps.rotationPathMin ||
      gaps.rotationPathMin <= gaps.reservePathMin
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Projected depth gap thresholds must descend by opportunity band.',
        path: ['projectedDepthGapThresholds'],
      });
    }
  });

export const programDefinitionSchema = z
  .object({
    ...localizedFields,
    defenseStyleId: defenseStyleIdSchema,
    id: programIdSchema,
    initialCoachTrustBonus: z.number().int().min(-10).max(20),
    kind: z.literal('program'),
    offenseStyleId: offenseStyleIdSchema,
    ratings: programRatingsSchema,
    recruitingHotbedRegionIds: uniqueArray(programRegionIdSchema, 1, 3),
    recruitingInterestByTier: z
      .object({
        recruit_tier_developmental: z.number().int().min(0).max(100),
        recruit_tier_national: z.number().int().min(0).max(100),
        recruit_tier_priority: z.number().int().min(0).max(100),
      })
      .strict(),
    regionId: programRegionIdSchema,
    rivalProgramIds: uniqueArray(programIdSchema, 1, 2),
    roomProfile: programRoomProfileSchema,
    rotationPolicyId: rotationPolicyIdSchema,
    shortNameKey: messageKeyFormatSchema,
    strengthBandId: programStrengthBandIdSchema,
    traitIds: uniqueArray(programTraitIdSchema, 2, 4),
  })
  .strict()
  .superRefine((program, context) => {
    if (program.rivalProgramIds.includes(program.id)) {
      context.addIssue({
        code: 'custom',
        message: 'A program cannot list itself as a rival.',
        path: ['rivalProgramIds'],
      });
    }
  });

export const rosterGivenNameTokenSchema = z
  .object({
    id: rosterGivenNameIdSchema,
    nameKey: messageKeyFormatSchema,
  })
  .strict();

export const rosterFamilyNameTokenSchema = z
  .object({
    id: rosterFamilyNameIdSchema,
    nameKey: messageKeyFormatSchema,
  })
  .strict();

export const rosterNameTokenSchema = z.union([
  rosterGivenNameTokenSchema,
  rosterFamilyNameTokenSchema,
]);

function uniqueCatalogIds(
  entries: readonly { readonly id: string }[],
  path: string,
  context: z.RefinementCtx,
): void {
  if (new Set(entries.map(({ id }) => id)).size !== entries.length) {
    context.addIssue({ code: 'custom', message: `${path} IDs must be unique.`, path: [path] });
  }
}

function canonicalCatalogIds(
  entries: readonly { readonly id: string }[],
  expectedIds: readonly string[],
  path: string,
  context: z.RefinementCtx,
): void {
  entries.forEach((entry, index) => {
    if (entry.id !== expectedIds[index]) {
      context.addIssue({
        code: 'custom',
        message: `${path} must use canonical stable-ID order.`,
        path: [path, index, 'id'],
      });
    }
  });
}

export const programContentSchema = z
  .object({
    defenseStyles: z.array(defenseStyleDefinitionSchema).length(DEFENSE_STYLE_IDS.length),
    offenseStyles: z.array(offenseStyleDefinitionSchema).length(OFFENSE_STYLE_IDS.length),
    programs: z.array(programDefinitionSchema).length(PROGRAM_IDS.length),
    recruitingConfig: recruitingConfigSchema,
    regions: z.array(programRegionDefinitionSchema).length(PROGRAM_REGION_IDS.length),
    rosterFamilyNames: z.array(rosterFamilyNameTokenSchema).length(ROSTER_FAMILY_NAME_IDS.length),
    rosterGivenNames: z.array(rosterGivenNameTokenSchema).length(ROSTER_GIVEN_NAME_IDS.length),
    rotationPolicies: z.array(rotationPolicyDefinitionSchema).length(ROTATION_POLICY_IDS.length),
    traits: z.array(programTraitDefinitionSchema).length(PROGRAM_TRAIT_IDS.length),
  })
  .strict()
  .superRefine((content, context) => {
    for (const [path, entries, expectedIds] of [
      ['defenseStyles', content.defenseStyles, DEFENSE_STYLE_IDS],
      ['offenseStyles', content.offenseStyles, OFFENSE_STYLE_IDS],
      ['programs', content.programs, PROGRAM_IDS],
      ['regions', content.regions, PROGRAM_REGION_IDS],
      ['rosterFamilyNames', content.rosterFamilyNames, ROSTER_FAMILY_NAME_IDS],
      ['rosterGivenNames', content.rosterGivenNames, ROSTER_GIVEN_NAME_IDS],
      ['rotationPolicies', content.rotationPolicies, ROTATION_POLICY_IDS],
      ['traits', content.traits, PROGRAM_TRAIT_IDS],
    ] as const) {
      uniqueCatalogIds(entries, path, context);
      canonicalCatalogIds(entries, expectedIds, path, context);
    }
  });

type DeepReadonly<T> = T extends readonly (infer TItem)[]
  ? readonly DeepReadonly<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
    : T;

export type ProgramId = (typeof PROGRAM_IDS)[number];
export type ProgramRegionId = (typeof PROGRAM_REGION_IDS)[number];
export type ProgramStrengthBandId = (typeof PROGRAM_STRENGTH_BAND_IDS)[number];
export type OffenseStyleId = (typeof OFFENSE_STYLE_IDS)[number];
export type DefenseStyleId = (typeof DEFENSE_STYLE_IDS)[number];
export type RotationPolicyId = (typeof ROTATION_POLICY_IDS)[number];
export type ProgramTraitId = (typeof PROGRAM_TRAIT_IDS)[number];
export type RosterGivenNameId = (typeof ROSTER_GIVEN_NAME_IDS)[number];
export type RosterFamilyNameId = (typeof ROSTER_FAMILY_NAME_IDS)[number];
export type RecruitAbilityAttributeId = (typeof RECRUIT_ABILITY_ATTRIBUTE_IDS)[number];
export type RecruitingConfig = DeepReadonly<z.infer<typeof recruitingConfigSchema>>;
export type ProgramDefinition = DeepReadonly<z.infer<typeof programDefinitionSchema>>;
export type OffenseStyleDefinition = DeepReadonly<z.infer<typeof offenseStyleDefinitionSchema>>;
export type RotationPolicyDefinition = DeepReadonly<z.infer<typeof rotationPolicyDefinitionSchema>>;
export type ProgramContent = DeepReadonly<z.infer<typeof programContentSchema>>;
