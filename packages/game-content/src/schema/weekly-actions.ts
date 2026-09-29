import { z } from 'zod';

import { playerAttributeIdSchema } from './creation.js';
import { messageKeyFormatSchema } from './primitives.js';

export const WEEKLY_ACTION_IDS = [
  'action_route_drills',
  'action_release_drills',
  'action_hands_catch_work',
  'action_weight_room',
  'action_speed_work',
  'action_film_study',
  'action_extra_practice',
  'action_recovery',
  'action_study_hall',
] as const;

export const TRAINING_PROFICIENCY_IDS = [
  'proficiency_route_drills',
  'proficiency_release_drills',
  'proficiency_hands_catch_work',
  'proficiency_weight_room',
  'proficiency_speed_work',
  'proficiency_film_study',
  'proficiency_extra_practice',
] as const;

export const WEEKLY_ACTION_POSITION_IDS = ['position_wr'] as const;

export const WEEKLY_ACTION_TAG_IDS = [
  'action_family_training',
  'action_family_recovery',
  'action_family_academics',
  'action_scope_wr',
  'action_scope_common',
  'action_focus_route_running',
  'action_focus_release',
  'action_focus_catching',
  'action_focus_strength',
  'action_focus_speed',
  'action_focus_film_study',
  'action_focus_multi_skill',
  'action_focus_body',
  'action_focus_gpa',
] as const;

export const WEEKLY_ACTION_PROFICIENCY_IDS = {
  action_extra_practice: 'proficiency_extra_practice',
  action_film_study: 'proficiency_film_study',
  action_hands_catch_work: 'proficiency_hands_catch_work',
  action_recovery: null,
  action_release_drills: 'proficiency_release_drills',
  action_route_drills: 'proficiency_route_drills',
  action_speed_work: 'proficiency_speed_work',
  action_study_hall: null,
  action_weight_room: 'proficiency_weight_room',
} as const satisfies Readonly<
  Record<(typeof WEEKLY_ACTION_IDS)[number], (typeof TRAINING_PROFICIENCY_IDS)[number] | null>
>;

export const weeklyActionIdSchema = z.enum(WEEKLY_ACTION_IDS);
export const trainingProficiencyIdSchema = z.enum(TRAINING_PROFICIENCY_IDS);
export const weeklyActionPositionIdSchema = z.enum(WEEKLY_ACTION_POSITION_IDS);
export const weeklyActionTagIdSchema = z.enum(WEEKLY_ACTION_TAG_IDS);

export const weeklyActionRequirementsSchema = z
  .object({
    /** Empty means the action is common to every playable position. */
    positionIds: z.array(weeklyActionPositionIdSchema).max(WEEKLY_ACTION_POSITION_IDS.length),
  })
  .strict();

export const weeklyActionTagsSchema = z
  .array(weeklyActionTagIdSchema)
  .min(1)
  .max(8)
  .superRefine((tags, context) => {
    if (new Set(tags).size !== tags.length) {
      context.addIssue({
        code: 'custom',
        message: 'Weekly action tags must be unique.',
      });
    }
    for (let index = 1; index < tags.length; index += 1) {
      const previous = tags[index - 1];
      const current = tags[index];
      if (
        previous !== undefined &&
        current !== undefined &&
        WEEKLY_ACTION_TAG_IDS.indexOf(previous) >= WEEKLY_ACTION_TAG_IDS.indexOf(current)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Weekly action tags must use canonical contract order.',
        });
        break;
      }
    }
  });

export const attributeXpEntrySchema = z
  .object({
    attributeId: playerAttributeIdSchema,
    baseXp: z.number().int().min(1).max(50),
  })
  .strict();

export const developmentWeekConfigSchema = z
  .object({
    bodyXpEfficiencyMinPermille: z.number().int().min(0).max(1000),
    bodyXpEfficiencyPerBodyPoint: z.number().int().min(0).max(10),
    passiveBodyRecovery: z.number().int().min(0).max(100),
    proficiencyUseThresholds: z.tuple([
      z.number().int().min(0).max(1_000_000),
      z.number().int().min(0).max(1_000_000),
      z.number().int().min(0).max(1_000_000),
      z.number().int().min(0).max(1_000_000),
      z.number().int().min(0).max(1_000_000),
      z.number().int().min(0).max(1_000_000),
    ]),
    proficiencyXpMultipliersPermille: z.tuple([
      z.number().int().min(1000).max(5000),
      z.number().int().min(1000).max(5000),
      z.number().int().min(1000).max(5000),
      z.number().int().min(1000).max(5000),
      z.number().int().min(1000).max(5000),
      z.number().int().min(1000).max(5000),
    ]),
  })
  .strict()
  .superRefine((config, context) => {
    if (config.bodyXpEfficiencyMinPermille + config.bodyXpEfficiencyPerBodyPoint * 100 > 1000) {
      context.addIssue({
        code: 'custom',
        message: 'Body XP efficiency cannot exceed 1000 permille at full Body.',
        path: ['bodyXpEfficiencyPerBodyPoint'],
      });
    }

    if (config.proficiencyUseThresholds[0] !== 0) {
      context.addIssue({
        code: 'custom',
        message: 'The first proficiency threshold must begin at zero uses.',
        path: ['proficiencyUseThresholds', 0],
      });
    }
    for (let index = 1; index < config.proficiencyUseThresholds.length; index += 1) {
      const previous = config.proficiencyUseThresholds[index - 1];
      const current = config.proficiencyUseThresholds[index];
      if (previous !== undefined && current !== undefined && current <= previous) {
        context.addIssue({
          code: 'custom',
          message: 'Proficiency use thresholds must be strictly increasing.',
          path: ['proficiencyUseThresholds', index],
        });
      }
    }

    if (config.proficiencyXpMultipliersPermille[0] !== 1000) {
      context.addIssue({
        code: 'custom',
        message: 'The baseline proficiency XP multiplier must be 1000 permille.',
        path: ['proficiencyXpMultipliersPermille', 0],
      });
    }
    let previousIncrease: number | undefined;
    for (let index = 1; index < config.proficiencyXpMultipliersPermille.length; index += 1) {
      const previous = config.proficiencyXpMultipliersPermille[index - 1];
      const current = config.proficiencyXpMultipliersPermille[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      const increase = current - previous;
      if (increase <= 0) {
        context.addIssue({
          code: 'custom',
          message: 'Proficiency XP multipliers must be strictly increasing.',
          path: ['proficiencyXpMultipliersPermille', index],
        });
      }
      if (previousIncrease !== undefined && increase >= previousIncrease) {
        context.addIssue({
          code: 'custom',
          message: 'Proficiency XP multiplier gains must diminish at every level.',
          path: ['proficiencyXpMultipliersPermille', index],
        });
      }
      previousIncrease = increase;
    }
  });

export const weeklyActionDefinitionSchema = z
  .object({
    attributeXp: z.array(attributeXpEntrySchema).max(3),
    bodyDelta: z.number().int().min(-40).max(40),
    confidenceDelta: z.number().int().min(-25).max(25),
    descriptionKey: messageKeyFormatSchema,
    gpaDelta: z.number().finite().min(-0.5).max(0.5),
    id: weeklyActionIdSchema,
    nameKey: messageKeyFormatSchema,
    practiceImpact: z.number().int().min(-25).max(25),
    preparationDelta: z.number().int().min(-25).max(25),
    proficiencyId: trainingProficiencyIdSchema.nullable(),
    requirements: weeklyActionRequirementsSchema,
    tags: weeklyActionTagsSchema,
  })
  .strict()
  .superRefine((definition, context) => {
    const attributeIds = definition.attributeXp.map((entry) => entry.attributeId);
    if (new Set(attributeIds).size !== attributeIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Weekly action XP targets must be unique.',
        path: ['attributeXp'],
      });
    }

    if (
      definition.attributeXp.length === 0 &&
      definition.bodyDelta === 0 &&
      definition.confidenceDelta === 0 &&
      definition.preparationDelta === 0 &&
      definition.gpaDelta === 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A weekly action must have an immediate M1 effect.',
      });
    }

    const expectedProficiencyId = WEEKLY_ACTION_PROFICIENCY_IDS[definition.id];
    if (definition.proficiencyId !== expectedProficiencyId) {
      context.addIssue({
        code: 'custom',
        message: `Weekly action ${definition.id} must use proficiency ${String(expectedProficiencyId)}.`,
        path: ['proficiencyId'],
      });
    }
  });

export const weeklyActionContentSchema = z
  .array(weeklyActionDefinitionSchema)
  .length(WEEKLY_ACTION_IDS.length)
  .superRefine((definitions, context) => {
    for (const [index, expectedId] of WEEKLY_ACTION_IDS.entries()) {
      if (definitions[index]?.id !== expectedId) {
        context.addIssue({
          code: 'custom',
          message: `Weekly action index ${index} must contain ${expectedId}.`,
          path: [index, 'id'],
        });
      }
    }
  });

type DeepReadonly<T> = T extends object ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> } : T;

export type WeeklyActionId = (typeof WEEKLY_ACTION_IDS)[number];
export type TrainingProficiencyId = (typeof TRAINING_PROFICIENCY_IDS)[number];
export type WeeklyActionPositionId = (typeof WEEKLY_ACTION_POSITION_IDS)[number];
export type WeeklyActionTagId = (typeof WEEKLY_ACTION_TAG_IDS)[number];
export type AttributeXpEntry = DeepReadonly<z.infer<typeof attributeXpEntrySchema>>;
export type DevelopmentWeekConfig = DeepReadonly<z.infer<typeof developmentWeekConfigSchema>>;
export type WeeklyActionRequirements = DeepReadonly<z.infer<typeof weeklyActionRequirementsSchema>>;
export type WeeklyActionDefinition = DeepReadonly<z.infer<typeof weeklyActionDefinitionSchema>>;
export type WeeklyActionMechanicsDefinition = Readonly<{
  attributeXp: WeeklyActionDefinition['attributeXp'];
  bodyDelta: WeeklyActionDefinition['bodyDelta'];
  confidenceDelta: WeeklyActionDefinition['confidenceDelta'];
  gpaDelta: WeeklyActionDefinition['gpaDelta'];
  id: WeeklyActionDefinition['id'];
  practiceImpact: WeeklyActionDefinition['practiceImpact'];
  preparationDelta: WeeklyActionDefinition['preparationDelta'];
  proficiencyId: WeeklyActionDefinition['proficiencyId'];
  tagIds: readonly WeeklyActionTagId[];
}>;
export type WeeklyActionContent = DeepReadonly<z.infer<typeof weeklyActionContentSchema>>;
