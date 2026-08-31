import { z } from 'zod';

import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';

export const APPEARANCE_OPTION_CARDINALITIES = {
  armSleevesId: 4,
  bodyTypeId: 3,
  eyeBlackId: 3,
  faceId: 4,
  footwearId: 3,
  glovesId: 4,
  hairColorId: 4,
  hairStyleId: 6,
  jerseyFitId: 3,
  skinToneId: 6,
  towelId: 4,
  visorId: 3,
  wristTapeId: 4,
} as const;

export const NULLABLE_APPEARANCE_FIELDS = [
  'armSleevesId',
  'eyeBlackId',
  'glovesId',
  'towelId',
  'visorId',
  'wristTapeId',
] as const;

function prefixedAppearanceIdSchema(idPrefix: string) {
  return stableContentIdSchema.refine((id) => id.startsWith(idPrefix), {
    message: `Expected an appearance ID beginning with ${idPrefix}.`,
  });
}

function appearanceCategorySchema(idPrefix: string, cardinality: number, nullable: boolean) {
  const prefixedIdSchema = prefixedAppearanceIdSchema(idPrefix);
  const idSchema: z.ZodType<string | null> = nullable
    ? prefixedIdSchema.nullable()
    : prefixedIdSchema;

  return z
    .object({
      labelKey: messageKeyFormatSchema,
      options: z
        .array(
          z
            .object({
              id: idSchema,
              nameKey: messageKeyFormatSchema,
            })
            .strict(),
        )
        .length(cardinality),
    })
    .strict()
    .superRefine((category, context) => {
      const ids = category.options.map(({ id }) => id);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: 'custom',
          message: 'Appearance option IDs must be unique within a field.',
          path: ['options'],
        });
      }

      const nullCount = ids.filter((id) => id === null).length;
      if (nullable && (nullCount !== 1 || ids[0] !== null)) {
        context.addIssue({
          code: 'custom',
          message: 'Nullable appearance fields must begin with exactly one explicit none option.',
          path: ['options'],
        });
      }
      if (!nullable && nullCount !== 0) {
        context.addIssue({
          code: 'custom',
          message: 'Required appearance fields cannot contain a none option.',
          path: ['options'],
        });
      }
    });
}

export const appearanceCatalogSchema = z
  .object({
    armSleevesId: appearanceCategorySchema(
      'arm_sleeves_',
      APPEARANCE_OPTION_CARDINALITIES.armSleevesId,
      true,
    ),
    bodyTypeId: appearanceCategorySchema(
      'body_type_',
      APPEARANCE_OPTION_CARDINALITIES.bodyTypeId,
      false,
    ),
    eyeBlackId: appearanceCategorySchema(
      'eye_black_',
      APPEARANCE_OPTION_CARDINALITIES.eyeBlackId,
      true,
    ),
    faceId: appearanceCategorySchema('face_', APPEARANCE_OPTION_CARDINALITIES.faceId, false),
    footwearId: appearanceCategorySchema(
      'footwear_',
      APPEARANCE_OPTION_CARDINALITIES.footwearId,
      false,
    ),
    glovesId: appearanceCategorySchema('gloves_', APPEARANCE_OPTION_CARDINALITIES.glovesId, true),
    hairColorId: appearanceCategorySchema(
      'hair_color_',
      APPEARANCE_OPTION_CARDINALITIES.hairColorId,
      false,
    ),
    hairStyleId: appearanceCategorySchema(
      'hair_style_',
      APPEARANCE_OPTION_CARDINALITIES.hairStyleId,
      false,
    ),
    jerseyFitId: appearanceCategorySchema(
      'jersey_fit_',
      APPEARANCE_OPTION_CARDINALITIES.jerseyFitId,
      false,
    ),
    skinToneId: appearanceCategorySchema(
      'skin_tone_',
      APPEARANCE_OPTION_CARDINALITIES.skinToneId,
      false,
    ),
    towelId: appearanceCategorySchema('towel_', APPEARANCE_OPTION_CARDINALITIES.towelId, true),
    visorId: appearanceCategorySchema('visor_', APPEARANCE_OPTION_CARDINALITIES.visorId, true),
    wristTapeId: appearanceCategorySchema(
      'wrist_tape_',
      APPEARANCE_OPTION_CARDINALITIES.wristTapeId,
      true,
    ),
  })
  .strict();

export const playerAppearanceSchema = z
  .object({
    armSleevesId: prefixedAppearanceIdSchema('arm_sleeves_').nullable(),
    bodyTypeId: prefixedAppearanceIdSchema('body_type_'),
    eyeBlackId: prefixedAppearanceIdSchema('eye_black_').nullable(),
    faceId: prefixedAppearanceIdSchema('face_'),
    footwearId: prefixedAppearanceIdSchema('footwear_'),
    glovesId: prefixedAppearanceIdSchema('gloves_').nullable(),
    hairColorId: prefixedAppearanceIdSchema('hair_color_'),
    hairStyleId: prefixedAppearanceIdSchema('hair_style_'),
    jerseyFitId: prefixedAppearanceIdSchema('jersey_fit_'),
    skinToneId: prefixedAppearanceIdSchema('skin_tone_'),
    towelId: prefixedAppearanceIdSchema('towel_').nullable(),
    visorId: prefixedAppearanceIdSchema('visor_').nullable(),
    wristTapeId: prefixedAppearanceIdSchema('wrist_tape_').nullable(),
  })
  .strict();

function metricRangeSchema(absoluteMin: number, absoluteMax: number) {
  return z
    .object({
      defaultValue: z.number().int().min(absoluteMin).max(absoluteMax),
      labelKey: messageKeyFormatSchema,
      max: z.number().int().min(absoluteMin).max(absoluteMax),
      min: z.number().int().min(absoluteMin).max(absoluteMax),
      step: z.number().int().positive(),
    })
    .strict()
    .superRefine((range, context) => {
      if (
        range.min > range.max ||
        range.defaultValue < range.min ||
        range.defaultValue > range.max
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Metric defaults must fall within an ordered range.',
        });
      }

      if ((range.max - range.min) % range.step !== 0) {
        context.addIssue({
          code: 'custom',
          message: 'Metric ranges must be evenly divisible by their step.',
          path: ['step'],
        });
      }
    });
}

export const wrBodyMeasurementOptionsSchema = z
  .object({
    heightCm: metricRangeSchema(150, 215),
    weightKg: metricRangeSchema(55, 150),
  })
  .strict();

type DeepReadonly<T> = T extends object ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> } : T;

export type AppearanceCatalog = DeepReadonly<z.infer<typeof appearanceCatalogSchema>>;
export type PlayerAppearanceContent = DeepReadonly<z.infer<typeof playerAppearanceSchema>>;
export type WrBodyMeasurementOptions = DeepReadonly<z.infer<typeof wrBodyMeasurementOptionsSchema>>;
