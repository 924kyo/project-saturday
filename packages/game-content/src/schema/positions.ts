import {
  CB_ARCHETYPE_IDS,
  CB_ATTRIBUTE_IDS,
  CREATION_STATE_IDS,
  EDGE_ARCHETYPE_IDS,
  EDGE_ATTRIBUTE_IDS,
  LB_ARCHETYPE_IDS,
  LB_ATTRIBUTE_IDS,
  MENTAL_ATTRIBUTE_IDS,
  MULTI_POSITION_ATTRIBUTE_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  POSITION_TRAINING_ACTION_IDS,
  POSITION_TRAINING_PROFICIENCY_IDS,
  POSITION_IDS,
  QB_ARCHETYPE_IDS,
  QB_ATTRIBUTE_IDS,
  RB_ARCHETYPE_IDS,
  RB_ATTRIBUTE_IDS,
  WR_ARCHETYPE_IDS,
  WR_ATTRIBUTE_IDS,
  getPlayableAttributeIds,
} from '@project-saturday/game-core';
import { z } from 'zod';

import { messageKeyFormatSchema } from './primitives.js';
import { RECRUITING_BACKGROUND_IDS } from './creation.js';

export const POSITION_DEVELOPMENT_FAMILY_IDS = [
  'development_family_wr_route_craft',
  'development_family_wr_separation',
  'development_family_wr_catch_point',
  'development_family_qb_delivery',
  'development_family_qb_processing',
  'development_family_qb_movement',
  'development_family_rb_run_craft',
  'development_family_rb_contact',
  'development_family_rb_third_down',
  'development_family_cb_man_technique',
  'development_family_cb_zone_eyes',
  'development_family_cb_finish',
  'development_family_lb_run_fits',
  'development_family_lb_coverage_drops',
  'development_family_lb_pressure',
  'development_family_edge_get_off',
  'development_family_edge_hand_fighting',
  'development_family_edge_finish',
] as const;

export const STAGED_GAME_DECISION_FAMILY_IDS = [
  'key_snap_family_qb_pre_snap',
  'key_snap_family_qb_pocket',
  'key_snap_family_qb_throw',
  'key_snap_family_qb_scramble',
  'key_snap_family_rb_track',
  'key_snap_family_rb_contact',
  'key_snap_family_rb_protection',
  'key_snap_family_rb_receiving',
  'key_snap_family_cb_leverage',
  'key_snap_family_cb_coverage',
  'key_snap_family_cb_ball',
  'key_snap_family_cb_tackle',
  'key_snap_family_lb_key',
  'key_snap_family_lb_fit',
  'key_snap_family_lb_drop',
  'key_snap_family_lb_blitz',
  'key_snap_family_edge_rush',
  'key_snap_family_edge_contain',
  'key_snap_family_edge_option',
  'key_snap_family_edge_finish',
] as const;

const WR_GAME_FAMILY_IDS = [
  'key_snap_family_release',
  'key_snap_family_route',
  'key_snap_family_catch',
  'key_snap_family_yac',
] as const;

const ALL_GAME_FAMILY_IDS = [...WR_GAME_FAMILY_IDS, ...STAGED_GAME_DECISION_FAMILY_IDS] as const;
const POSITION_ARCHETYPE_IDS = [
  ...WR_ARCHETYPE_IDS,
  ...QB_ARCHETYPE_IDS,
  ...RB_ARCHETYPE_IDS,
  ...CB_ARCHETYPE_IDS,
  ...LB_ARCHETYPE_IDS,
  ...EDGE_ARCHETYPE_IDS,
] as const;
const POSITION_ATTRIBUTE_IDS = [
  ...WR_ATTRIBUTE_IDS,
  ...QB_ATTRIBUTE_IDS,
  ...RB_ATTRIBUTE_IDS,
  ...CB_ATTRIBUTE_IDS,
  ...LB_ATTRIBUTE_IDS,
  ...EDGE_ATTRIBUTE_IDS,
] as const;
/** Positions whose archetypes live in the position catalog (WR keeps its creation catalog). */
const CATALOG_ARCHETYPE_IDS = [
  ...QB_ARCHETYPE_IDS,
  ...RB_ARCHETYPE_IDS,
  ...CB_ARCHETYPE_IDS,
  ...LB_ARCHETYPE_IDS,
  ...EDGE_ARCHETYPE_IDS,
] as const;
const CATALOG_POSITION_IDS = [
  'position_qb',
  'position_rb',
  'position_cb',
  'position_lb',
  'position_edge',
] as const;
const TRAINING_POSITION_IDS = [...CATALOG_POSITION_IDS, 'position_wr'] as const;
const SHARED_ATTRIBUTE_IDS = [...PHYSICAL_ATTRIBUTE_IDS, ...MENTAL_ATTRIBUTE_IDS] as const;

export const positionIdSchema = z.enum(POSITION_IDS);
export const positionArchetypeIdSchema = z.enum(POSITION_ARCHETYPE_IDS);
export const positionAttributeIdSchema = z.enum(POSITION_ATTRIBUTE_IDS);
export const positionDevelopmentFamilyIdSchema = z.enum(POSITION_DEVELOPMENT_FAMILY_IDS);
export const positionGameDecisionFamilyIdSchema = z.enum(ALL_GAME_FAMILY_IDS);
export const stagedGameDecisionFamilyIdSchema = z.enum(STAGED_GAME_DECISION_FAMILY_IDS);
export const positionTrainingActionIdSchema = z.enum(POSITION_TRAINING_ACTION_IDS);
export const positionTrainingProficiencyIdSchema = z.enum(POSITION_TRAINING_PROFICIENCY_IDS);
const multiPositionAttributeIdSchema = z.enum(MULTI_POSITION_ATTRIBUTE_IDS);
const creationStateIdSchema = z.enum(CREATION_STATE_IDS);
const recruitingBackgroundIdSchema = z.enum(RECRUITING_BACKGROUND_IDS);

const localizedFields = {
  descriptionKey: messageKeyFormatSchema,
  nameKey: messageKeyFormatSchema,
} as const;

const localizedDefinitionSchema = z
  .object({
    ...localizedFields,
    id: z.union([
      positionAttributeIdSchema,
      positionDevelopmentFamilyIdSchema,
      stagedGameDecisionFamilyIdSchema,
    ]),
  })
  .strict();

export const stagedArchetypeDefinitionSchema = z
  .object({
    ...localizedFields,
    id: z.enum(CATALOG_ARCHETYPE_IDS),
    positionId: z.enum(CATALOG_POSITION_IDS),
    priorityAttributeIds: z.tuple([
      positionAttributeIdSchema,
      positionAttributeIdSchema,
      positionAttributeIdSchema,
    ]),
  })
  .strict();

const positionCreationAttributeModifierSchema = z
  .object({
    attributeId: multiPositionAttributeIdSchema,
    delta: z
      .number()
      .int()
      .min(-8)
      .max(8)
      .refine((delta) => delta !== 0),
  })
  .strict();

const positionCreationStateModifierSchema = z
  .object({
    delta: z
      .number()
      .min(-20)
      .max(20)
      .refine((delta) => delta !== 0),
    stateId: creationStateIdSchema,
  })
  .strict();

const grantedTagIdsSchema = z
  .array(z.string().regex(/^tag_[a-z0-9_]+$/u))
  .min(1)
  .max(8)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'Tag IDs must be unique.' });

const positionCreationProfileFields = {
  attributeModifiers: z.array(positionCreationAttributeModifierSchema).min(2).max(8),
  grantedTagIds: grantedTagIdsSchema,
  positionId: positionIdSchema,
  stateModifiers: z.array(positionCreationStateModifierSchema).max(CREATION_STATE_IDS.length),
} as const;

export const positionTrainingProficiencyDefinitionSchema = z
  .object({
    ...localizedFields,
    id: positionTrainingProficiencyIdSchema,
    positionId: z.enum(TRAINING_POSITION_IDS),
  })
  .strict();

export const positionTrainingActionDefinitionSchema = z
  .object({
    ...localizedFields,
    attributeXp: z.tuple([
      z
        .object({
          attributeId: multiPositionAttributeIdSchema,
          baseXp: z.number().int().min(1).max(50),
        })
        .strict(),
      z
        .object({
          attributeId: multiPositionAttributeIdSchema,
          baseXp: z.number().int().min(1).max(50),
        })
        .strict(),
    ]),
    bodyDelta: z.number().int().min(-40).max(40),
    breakthroughGaugePoints: z.number().int().min(1).max(20),
    confidenceDelta: z.number().int().min(-25).max(25),
    developmentFamilyId: positionDevelopmentFamilyIdSchema,
    id: positionTrainingActionIdSchema,
    positionId: z.enum(TRAINING_POSITION_IDS),
    practiceImpact: z.number().int().min(-25).max(25),
    preparationDelta: z.number().int().min(-25).max(25),
    proficiencyId: positionTrainingProficiencyIdSchema,
  })
  .strict();

export const positionCreationBaselineSchema = z
  .object({
    baseAttributeRatings: z.record(z.string(), z.number().int().min(0).max(100)),
    baseState: z
      .object({
        state_body: z.number().int().min(0).max(100),
        state_brand: z.number().int().min(0).max(100),
        state_coach_trust: z.number().int().min(0).max(100),
        state_confidence: z.number().int().min(0).max(100),
        state_gpa: z.number().min(0).max(4),
      })
      .strict(),
    positionId: positionIdSchema,
  })
  .strict();

export const positionCreationArchetypeProfileSchema = z
  .object({ ...positionCreationProfileFields, id: positionArchetypeIdSchema })
  .strict();

export const positionCreationBackgroundProfileSchema = z
  .object({ ...positionCreationProfileFields, id: recruitingBackgroundIdSchema })
  .strict();

export const positionCreationMechanicsContentSchema = z
  .object({
    archetypeProfiles: z
      .array(positionCreationArchetypeProfileSchema)
      .length(POSITION_IDS.length * 3),
    backgroundProfiles: z
      .array(positionCreationBackgroundProfileSchema)
      .length(POSITION_IDS.length * RECRUITING_BACKGROUND_IDS.length),
    baselines: z.array(positionCreationBaselineSchema).length(POSITION_IDS.length),
  })
  .strict();

const depthEvaluationWeightsSchema = z
  .object({
    coachTrust: z.number().int().min(1).max(1_000),
    experienceReadiness: z.number().int().min(1).max(1_000),
    practiceForm: z.number().int().min(1).max(1_000),
    schemeFit: z.number().int().min(1).max(1_000),
    talentFit: z.number().int().min(1).max(1_000),
  })
  .strict()
  .refine((weights) => Object.values(weights).reduce((sum, weight) => sum + weight, 0) === 1_000, {
    message: 'Depth evaluation weights must total 1,000 permille.',
  });

const recruitingAbilityWeightsSchema = z
  .record(z.string(), z.number().int().min(0).max(1_000))
  .refine((weights) => Object.values(weights).reduce((sum, weight) => sum + weight, 0) === 1_000, {
    message: 'Recruiting ability weights must total 1,000 permille.',
  });

const schemeFitByArchetypeSchema = z.record(z.string(), z.number().int().min(0).max(100));

const opportunityBandSchema = z
  .object({
    feedbackBeatMinimum: z.number().int().min(1).max(4),
    interactiveSnapMaximum: z.number().int().min(0).max(8),
    interactiveSnapMinimum: z.number().int().min(0).max(8),
  })
  .strict()
  .refine((band) => band.interactiveSnapMinimum <= band.interactiveSnapMaximum, {
    message: 'Interactive snap minimum cannot exceed its maximum.',
  });

export const positionDefinitionSchema = z
  .object({
    ...localizedFields,
    archetypeIds: z.tuple([
      positionArchetypeIdSchema,
      positionArchetypeIdSchema,
      positionArchetypeIdSchema,
    ]),
    attributeIds: z.tuple([
      positionAttributeIdSchema,
      positionAttributeIdSchema,
      positionAttributeIdSchema,
      positionAttributeIdSchema,
      positionAttributeIdSchema,
      positionAttributeIdSchema,
    ]),
    depthEvaluationWeightsPermille: depthEvaluationWeightsSchema,
    developmentFamilyIds: z.tuple([
      positionDevelopmentFamilyIdSchema,
      positionDevelopmentFamilyIdSchema,
      positionDevelopmentFamilyIdSchema,
    ]),
    gameDecisionFamilyIds: z.tuple([
      positionGameDecisionFamilyIdSchema,
      positionGameDecisionFamilyIdSchema,
      positionGameDecisionFamilyIdSchema,
      positionGameDecisionFamilyIdSchema,
    ]),
    id: positionIdSchema,
    kind: z.literal('position_alpha'),
    opportunityByRole: z
      .object({
        depth_role_developmental: opportunityBandSchema,
        depth_role_reserve: opportunityBandSchema,
        depth_role_rotation: opportunityBandSchema,
        depth_role_starter: opportunityBandSchema,
      })
      .strict(),
    recruitingAbilityWeightsPermille: recruitingAbilityWeightsSchema,
    schemeFitByArchetype: schemeFitByArchetypeSchema,
  })
  .strict();

const expectedByPosition = {
  position_wr: {
    archetypeIds: WR_ARCHETYPE_IDS,
    attributeIds: WR_ATTRIBUTE_IDS,
    developmentFamilyIds: POSITION_DEVELOPMENT_FAMILY_IDS.slice(0, 3),
    gameDecisionFamilyIds: WR_GAME_FAMILY_IDS,
  },
  position_qb: {
    archetypeIds: QB_ARCHETYPE_IDS,
    attributeIds: QB_ATTRIBUTE_IDS,
    developmentFamilyIds: POSITION_DEVELOPMENT_FAMILY_IDS.slice(3, 6),
    gameDecisionFamilyIds: STAGED_GAME_DECISION_FAMILY_IDS.slice(0, 4),
  },
  position_rb: {
    archetypeIds: RB_ARCHETYPE_IDS,
    attributeIds: RB_ATTRIBUTE_IDS,
    developmentFamilyIds: POSITION_DEVELOPMENT_FAMILY_IDS.slice(6, 9),
    gameDecisionFamilyIds: STAGED_GAME_DECISION_FAMILY_IDS.slice(4, 8),
  },
  position_cb: {
    archetypeIds: CB_ARCHETYPE_IDS,
    attributeIds: CB_ATTRIBUTE_IDS,
    developmentFamilyIds: POSITION_DEVELOPMENT_FAMILY_IDS.slice(9, 12),
    gameDecisionFamilyIds: STAGED_GAME_DECISION_FAMILY_IDS.slice(8, 12),
  },
  position_lb: {
    archetypeIds: LB_ARCHETYPE_IDS,
    attributeIds: LB_ATTRIBUTE_IDS,
    developmentFamilyIds: POSITION_DEVELOPMENT_FAMILY_IDS.slice(12, 15),
    gameDecisionFamilyIds: STAGED_GAME_DECISION_FAMILY_IDS.slice(12, 16),
  },
  position_edge: {
    archetypeIds: EDGE_ARCHETYPE_IDS,
    attributeIds: EDGE_ATTRIBUTE_IDS,
    developmentFamilyIds: POSITION_DEVELOPMENT_FAMILY_IDS.slice(15, 18),
    gameDecisionFamilyIds: STAGED_GAME_DECISION_FAMILY_IDS.slice(16, 20),
  },
} as const;

function hasExactIds(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
}

export const positionAlphaContentSchema = z
  .object({
    archetypes: z.array(stagedArchetypeDefinitionSchema).length(CATALOG_ARCHETYPE_IDS.length),
    attributes: z.array(localizedDefinitionSchema).length(POSITION_ATTRIBUTE_IDS.length),
    creationMechanics: positionCreationMechanicsContentSchema,
    developmentFamilies: z
      .array(localizedDefinitionSchema)
      .length(POSITION_DEVELOPMENT_FAMILY_IDS.length),
    gameDecisionFamilies: z
      .array(localizedDefinitionSchema)
      .length(STAGED_GAME_DECISION_FAMILY_IDS.length),
    positions: z.array(positionDefinitionSchema).length(POSITION_IDS.length),
    trainingActions: z
      .array(positionTrainingActionDefinitionSchema)
      .length(POSITION_TRAINING_ACTION_IDS.length),
    trainingProficiencies: z
      .array(positionTrainingProficiencyDefinitionSchema)
      .length(POSITION_TRAINING_PROFICIENCY_IDS.length),
  })
  .strict()
  .superRefine((content, context) => {
    const catalogs = [
      [content.attributes, POSITION_ATTRIBUTE_IDS, 'attributes'],
      [content.developmentFamilies, POSITION_DEVELOPMENT_FAMILY_IDS, 'developmentFamilies'],
      [content.gameDecisionFamilies, STAGED_GAME_DECISION_FAMILY_IDS, 'gameDecisionFamilies'],
      [content.positions, POSITION_IDS, 'positions'],
      [content.archetypes, CATALOG_ARCHETYPE_IDS, 'archetypes'],
      [content.trainingActions, POSITION_TRAINING_ACTION_IDS, 'trainingActions'],
      [content.trainingProficiencies, POSITION_TRAINING_PROFICIENCY_IDS, 'trainingProficiencies'],
    ] as const;
    for (const [entries, expectedIds, path] of catalogs) {
      if (
        !hasExactIds(
          entries.map(({ id }) => id),
          expectedIds,
        )
      ) {
        context.addIssue({
          code: 'custom',
          message: `${path} must use canonical stable-ID order.`,
          path: [path],
        });
      }
    }

    for (const [index, position] of content.positions.entries()) {
      const expected = expectedByPosition[position.id];
      for (const field of [
        'archetypeIds',
        'attributeIds',
        'developmentFamilyIds',
        'gameDecisionFamilyIds',
      ] as const) {
        if (!hasExactIds(position[field], expected[field])) {
          context.addIssue({
            code: 'custom',
            message: `${position.id} ${field} must match its canonical position contract.`,
            path: ['positions', index, field],
          });
        }
      }
      const playableAttributeIds = getPlayableAttributeIds(position.id);
      if (
        !hasExactIds(
          Object.keys(position.recruitingAbilityWeightsPermille).sort(),
          [...playableAttributeIds].sort(),
        )
      ) {
        context.addIssue({
          code: 'custom',
          message: `${position.id} recruiting weights must define exactly its 16 playable attributes.`,
          path: ['positions', index, 'recruitingAbilityWeightsPermille'],
        });
      }
      if (
        !hasExactIds(
          Object.keys(position.schemeFitByArchetype).sort(),
          [...position.archetypeIds].sort(),
        )
      ) {
        context.addIssue({
          code: 'custom',
          message: `${position.id} scheme fit must define exactly its three archetypes.`,
          path: ['positions', index, 'schemeFitByArchetype'],
        });
      }
    }

    for (const [index, archetype] of content.archetypes.entries()) {
      if (!expectedByPosition[archetype.positionId].archetypeIds.includes(archetype.id as never)) {
        context.addIssue({
          code: 'custom',
          message: `${archetype.id} must belong to ${archetype.positionId}.`,
          path: ['archetypes', index, 'positionId'],
        });
      }
      if (new Set(archetype.priorityAttributeIds).size !== 3) {
        context.addIssue({
          code: 'custom',
          message: 'Archetype priority attributes must be unique.',
          path: ['archetypes', index, 'priorityAttributeIds'],
        });
      }
      const allowed = expectedByPosition[archetype.positionId].attributeIds as readonly string[];
      if (archetype.priorityAttributeIds.some((id) => !allowed.includes(id))) {
        context.addIssue({
          code: 'custom',
          message: 'Archetype priority attributes must belong to its position.',
          path: ['archetypes', index, 'priorityAttributeIds'],
        });
      }
    }

    const expectedPlayableAttributes = (positionId: (typeof POSITION_IDS)[number]) => [
      ...SHARED_ATTRIBUTE_IDS,
      ...expectedByPosition[positionId].attributeIds,
    ];
    for (const [index, baseline] of content.creationMechanics.baselines.entries()) {
      if (baseline.positionId !== POSITION_IDS[index]) {
        context.addIssue({
          code: 'custom',
          message: 'Creation baselines must use canonical position order.',
          path: ['creationMechanics', 'baselines', index, 'positionId'],
        });
      }
      const expectedIds = expectedPlayableAttributes(baseline.positionId);
      if (
        !hasExactIds(Object.keys(baseline.baseAttributeRatings).sort(), [...expectedIds].sort())
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Creation baseline must define exactly the selected position attributes.',
          path: ['creationMechanics', 'baselines', index, 'baseAttributeRatings'],
        });
      }
    }
    const expectedArchetypes = POSITION_IDS.flatMap(
      (positionId) => expectedByPosition[positionId].archetypeIds,
    );
    if (
      !hasExactIds(
        content.creationMechanics.archetypeProfiles.map(({ id }) => id),
        expectedArchetypes,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Creation archetype mechanics must use canonical position/archetype order.',
        path: ['creationMechanics', 'archetypeProfiles'],
      });
    }
    const expectedBackgroundIds = POSITION_IDS.flatMap(() => RECRUITING_BACKGROUND_IDS);
    if (
      !hasExactIds(
        content.creationMechanics.backgroundProfiles.map(({ id }) => id),
        expectedBackgroundIds,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Creation background mechanics must use canonical position/background order.',
        path: ['creationMechanics', 'backgroundProfiles'],
      });
    }
    for (const [catalogName, profiles] of [
      ['archetypeProfiles', content.creationMechanics.archetypeProfiles],
      ['backgroundProfiles', content.creationMechanics.backgroundProfiles],
    ] as const) {
      for (const [index, profile] of profiles.entries()) {
        const allowed = new Set(expectedPlayableAttributes(profile.positionId));
        if (profile.attributeModifiers.some(({ attributeId }) => !allowed.has(attributeId))) {
          context.addIssue({
            code: 'custom',
            message: 'Creation modifiers must target selected-position attributes.',
            path: ['creationMechanics', catalogName, index, 'attributeModifiers'],
          });
        }
        const attributeIds = profile.attributeModifiers.map(({ attributeId }) => attributeId);
        if (new Set(attributeIds).size !== attributeIds.length) {
          context.addIssue({
            code: 'custom',
            message: 'Creation profile attribute targets must be unique.',
            path: ['creationMechanics', catalogName, index, 'attributeModifiers'],
          });
        }
        if (
          !profile.attributeModifiers.some(({ delta }) => delta > 0) ||
          !profile.attributeModifiers.some(({ delta }) => delta < 0)
        ) {
          context.addIssue({
            code: 'custom',
            message: 'Creation profiles must contain a visible rating tradeoff.',
            path: ['creationMechanics', catalogName, index, 'attributeModifiers'],
          });
        }
      }
    }
    for (const [index, action] of content.trainingActions.entries()) {
      const positionAttributes = new Set(expectedByPosition[action.positionId].attributeIds);
      if (
        action.attributeXp.some(({ attributeId }) => !positionAttributes.has(attributeId as never))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Position training XP must target its position-owned attributes.',
          path: ['trainingActions', index, 'attributeXp'],
        });
      }
      if (action.attributeXp[0].attributeId === action.attributeXp[1].attributeId) {
        context.addIssue({
          code: 'custom',
          message: 'Position training XP targets must be distinct.',
          path: ['trainingActions', index, 'attributeXp'],
        });
      }
      if (content.trainingProficiencies[index]?.id !== action.proficiencyId) {
        context.addIssue({
          code: 'custom',
          message: 'Training action and proficiency order must align.',
          path: ['trainingActions', index, 'proficiencyId'],
        });
      }
      if (content.trainingProficiencies[index]?.positionId !== action.positionId) {
        context.addIssue({
          code: 'custom',
          message: 'Training action and proficiency position must align.',
          path: ['trainingActions', index, 'positionId'],
        });
      }
    }
  });

type DeepReadonly<T> = T extends readonly (infer TItem)[]
  ? readonly DeepReadonly<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
    : T;

export type PositionAlphaContent = DeepReadonly<z.infer<typeof positionAlphaContentSchema>>;
export type PositionAlphaDefinition = DeepReadonly<z.infer<typeof positionDefinitionSchema>>;
export type PositionCreationMechanicsContent = DeepReadonly<
  z.infer<typeof positionCreationMechanicsContentSchema>
>;
export type PositionTrainingActionDefinition = DeepReadonly<
  z.infer<typeof positionTrainingActionDefinitionSchema>
>;
export type PositionTrainingProficiencyDefinition = DeepReadonly<
  z.infer<typeof positionTrainingProficiencyDefinitionSchema>
>;
