import { z } from 'zod';

import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';

export const INJURY_MODEL_IDS = ['injury_v1'] as const;
export const INJURY_SEVERITY_IDS = [
  'injury_severity_minor_restriction',
  'injury_severity_short_absence',
  'injury_severity_multiweek_absence',
  'injury_severity_season_impact',
] as const;
export const INJURY_AVAILABILITY_IDS = [
  'injury_availability_limited',
  'injury_availability_out',
] as const;
export const INJURY_CHOICE_IDS = [
  'injury_choice_rest_rehab',
  'injury_choice_play_limited',
] as const;

export const injuryOutcomeIdSchema = stableContentIdSchema.refine(
  (value) => value.startsWith('injury_outcome_'),
  'Expected an injury_outcome_ stable ID.',
);

export const injuryOutcomeDefinitionSchema = z
  .object({
    availabilityId: z.enum(INJURY_AVAILABILITY_IDS),
    descriptionKey: messageKeyFormatSchema,
    durationWeeks: z.number().int().min(1).max(12),
    id: injuryOutcomeIdSchema,
    kind: z.literal('injury_outcome'),
    minimumRiskPermille: z.number().int().min(0).max(1_000),
    nameKey: messageKeyFormatSchema,
    opportunityCap: z.number().int().min(0).max(4),
    severityId: z.enum(INJURY_SEVERITY_IDS),
    weight: z.number().int().min(1).max(1_000),
  })
  .strict()
  .superRefine((outcome, context) => {
    if (
      (outcome.availabilityId === 'injury_availability_out' && outcome.opportunityCap !== 0) ||
      (outcome.availabilityId === 'injury_availability_limited' && outcome.opportunityCap === 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Injury opportunity cap must agree with availability.',
        path: ['opportunityCap'],
      });
    }
  });

export const injuryChoiceDefinitionSchema = z
  .object({
    descriptionKey: messageKeyFormatSchema,
    id: z.enum(INJURY_CHOICE_IDS),
    kind: z.literal('injury_choice'),
    nameKey: messageKeyFormatSchema,
  })
  .strict();

export const injuryTuningSchema = z
  .object({
    baseRiskPermille: z.number().int().min(0).max(500),
    bodyDeficitWeightPermille: z.number().int().min(0).max(2_000),
    durabilityDeficitWeightPermille: z.number().int().min(0).max(2_000),
    maximumRiskPermille: z.number().int().min(1).max(500),
    model: z.literal('injury_v1'),
    passiveRecoveryRiskWeightPermille: z.number().int().min(0).max(2_000),
    playLimitedBodyDelta: z.number().int().min(-20).max(0),
    playLimitedCoachTrustDelta: z.number().int().min(0).max(20),
    positionExposurePermille: z.number().int().min(0).max(500),
    restBodyDelta: z.number().int().min(0).max(20),
    restConfidenceDelta: z.number().int().min(-20).max(0),
    restRecoveryCreditWeeks: z.number().int().min(1).max(3),
    trainingLoadWeightPermille: z.number().int().min(0).max(2_000),
    workloadWeightPermille: z.number().int().min(0).max(2_000),
  })
  .strict();

export const injuryContentSchema = z
  .object({
    choices: z
      .tuple([injuryChoiceDefinitionSchema, injuryChoiceDefinitionSchema])
      .refine(
        (choices) => choices.every((choice, index) => choice.id === INJURY_CHOICE_IDS[index]),
        'Injury choices must remain in canonical order.',
      ),
    id: z.literal('injuries_wr_vertical_slice_v1'),
    model: z.enum(INJURY_MODEL_IDS),
    outcomes: z.array(injuryOutcomeDefinitionSchema).min(8).max(12),
    tuning: injuryTuningSchema,
  })
  .strict();

type DeepReadonly<T> = T extends readonly (infer TItem)[]
  ? readonly DeepReadonly<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
    : T;

export type InjuryContent = DeepReadonly<z.infer<typeof injuryContentSchema>>;
export type InjuryOutcomeDefinition = DeepReadonly<z.infer<typeof injuryOutcomeDefinitionSchema>>;
export type InjuryChoiceDefinition = DeepReadonly<z.infer<typeof injuryChoiceDefinitionSchema>>;
