import { z } from 'zod';

import {
  appearanceCatalogSchema,
  playerAppearanceSchema,
  wrBodyMeasurementOptionsSchema,
} from './appearance.js';
import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';

export const PLAYER_ATTRIBUTE_IDS = [
  'attribute_speed',
  'attribute_burst',
  'attribute_agility',
  'attribute_strength',
  'attribute_conditioning',
  'attribute_durability',
  'attribute_football_iq',
  'attribute_composure',
  'attribute_discipline',
  'attribute_work_ethic',
  'attribute_wr_release',
  'attribute_wr_route_running',
  'attribute_wr_hands',
  'attribute_wr_catch_in_traffic',
  'attribute_wr_yac',
  'attribute_wr_blocking',
] as const;

export const PLAYER_STATE_IDS = [
  'state_body',
  'state_confidence',
  'state_coach_trust',
  'state_brand',
  'state_gpa',
] as const;

export const WR_ARCHETYPE_IDS = [
  'archetype_wr_deep_threat',
  'archetype_wr_route_technician',
  'archetype_wr_possession_receiver',
] as const;

export const RECRUITING_BACKGROUND_IDS = [
  'background_blue_chip_star',
  'background_late_bloomer',
  'background_small_town_star',
  'background_legacy_recruit',
  'background_under_recruited_athlete',
] as const;

export const PERSONALITY_TRAIT_IDS = [
  'personality_competitive',
  'personality_quiet',
  'personality_leader',
  'personality_hot_headed',
  'personality_disciplined',
  'personality_social',
  'personality_independent',
  'personality_confident',
] as const;

export const playerAttributeIdSchema = z.enum(PLAYER_ATTRIBUTE_IDS);
export const playerStateIdSchema = z.enum(PLAYER_STATE_IDS);
export const wrArchetypeIdSchema = z.enum(WR_ARCHETYPE_IDS);
export const recruitingBackgroundIdSchema = z.enum(RECRUITING_BACKGROUND_IDS);
export const personalityTraitIdSchema = z.enum(PERSONALITY_TRAIT_IDS);

export const baseAttributeRatingsSchema = z.record(
  playerAttributeIdSchema,
  z.number().int().min(0).max(100),
);

export const baseCreationStateSchema = z
  .object({
    state_body: z.number().int().min(0).max(100),
    state_brand: z.number().int().min(0).max(100),
    state_coach_trust: z.number().int().min(0).max(100),
    state_confidence: z.number().int().min(0).max(100),
    state_gpa: z.number().finite().min(0).max(4),
  })
  .strict();

export const wrCreationBaselineSchema = z
  .object({
    baseAttributeRatings: baseAttributeRatingsSchema,
    baseState: baseCreationStateSchema,
  })
  .strict();

export const attributeModifierSchema = z
  .object({
    attributeId: playerAttributeIdSchema,
    delta: z
      .number()
      .int()
      .min(-8)
      .max(8)
      .refine((value) => value !== 0, {
        message: 'A rating modifier cannot be zero.',
      }),
  })
  .strict();

export const stateModifierSchema = z
  .object({
    delta: z
      .number()
      .min(-20)
      .max(20)
      .refine((value) => value !== 0, {
        message: 'A state modifier cannot be zero.',
      }),
    stateId: playerStateIdSchema,
  })
  .strict();

const localizedDefinitionFields = {
  descriptionKey: messageKeyFormatSchema,
  nameKey: messageKeyFormatSchema,
} as const;

const grantedTagIdsSchema = z
  .array(
    stableContentIdSchema.refine((id) => id.startsWith('tag_'), {
      message: 'Granted player tags must use the tag_ namespace.',
    }),
  )
  .min(1)
  .max(8)
  .superRefine((tags, context) => {
    if (new Set(tags).size !== tags.length) {
      context.addIssue({
        code: 'custom',
        message: 'Granted tag IDs must be unique within a definition.',
      });
    }
  });

const tradeoffAttributeModifiersSchema = z
  .array(attributeModifierSchema)
  .min(2)
  .max(8)
  .superRefine((modifiers, context) => {
    const attributeIds = modifiers.map((modifier) => modifier.attributeId);
    if (new Set(attributeIds).size !== attributeIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Attribute modifier targets must be unique within a definition.',
      });
    }
    if (!modifiers.some((modifier) => modifier.delta > 0)) {
      context.addIssue({
        code: 'custom',
        message: 'An initialization tradeoff must include a positive rating modifier.',
      });
    }
    if (!modifiers.some((modifier) => modifier.delta < 0)) {
      context.addIssue({
        code: 'custom',
        message: 'An initialization tradeoff must include a negative rating modifier.',
      });
    }
  });

export const wrArchetypeDefinitionSchema = z
  .object({
    ...localizedDefinitionFields,
    attributeModifiers: tradeoffAttributeModifiersSchema,
    grantedTagIds: grantedTagIdsSchema,
    id: wrArchetypeIdSchema,
    kind: z.literal('wr_archetype'),
    stateModifiers: z.array(stateModifierSchema).max(PLAYER_STATE_IDS.length),
  })
  .strict();

export const recruitingBackgroundDefinitionSchema = z
  .object({
    ...localizedDefinitionFields,
    attributeModifiers: tradeoffAttributeModifiersSchema,
    grantedTagIds: grantedTagIdsSchema,
    id: recruitingBackgroundIdSchema,
    kind: z.literal('recruiting_background'),
    stateModifiers: z.array(stateModifierSchema).max(PLAYER_STATE_IDS.length),
  })
  .strict();

export const personalityTraitDefinitionSchema = z
  .object({
    ...localizedDefinitionFields,
    attributeModifiers: z.array(attributeModifierSchema).max(PLAYER_ATTRIBUTE_IDS.length),
    grantedTagIds: grantedTagIdsSchema,
    id: personalityTraitIdSchema,
    incompatibleTraitIds: z.array(stableContentIdSchema).max(PERSONALITY_TRAIT_IDS.length - 1),
    kind: z.literal('personality_trait'),
    stateModifiers: z.array(stateModifierSchema).max(PLAYER_STATE_IDS.length),
  })
  .strict()
  .superRefine((definition, context) => {
    const modifiers = [
      ...definition.attributeModifiers.map((modifier) => modifier.delta),
      ...definition.stateModifiers.map((modifier) => modifier.delta),
    ];
    if (modifiers.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'A personality must provide at least one initialization modifier.',
      });
    }
    if (!modifiers.some((delta) => delta > 0) || !modifiers.some((delta) => delta < 0)) {
      context.addIssue({
        code: 'custom',
        message: 'A personality initialization must include a positive and negative tradeoff.',
      });
    }
    const attributeIds = definition.attributeModifiers.map((modifier) => modifier.attributeId);
    if (new Set(attributeIds).size !== attributeIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Attribute modifier targets must be unique within a definition.',
      });
    }
    const stateIds = definition.stateModifiers.map((modifier) => modifier.stateId);
    if (new Set(stateIds).size !== stateIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'State modifier targets must be unique within a definition.',
      });
    }
  });

export const creationContentSchema = z
  .object({
    appearanceCatalog: appearanceCatalogSchema,
    baseline: wrCreationBaselineSchema,
    bodyMeasurements: wrBodyMeasurementOptionsSchema,
    defaultAppearance: playerAppearanceSchema,
    personalityTraits: z
      .array(personalityTraitDefinitionSchema)
      .length(PERSONALITY_TRAIT_IDS.length),
    recruitingBackgrounds: z
      .array(recruitingBackgroundDefinitionSchema)
      .length(RECRUITING_BACKGROUND_IDS.length),
    wrArchetypes: z.array(wrArchetypeDefinitionSchema).length(WR_ARCHETYPE_IDS.length),
  })
  .strict()
  .superRefine((content, context) => {
    for (const field of Object.keys(
      content.defaultAppearance,
    ) as (keyof typeof content.defaultAppearance)[]) {
      const selectedId = content.defaultAppearance[field];
      const options: readonly { readonly id: string | null }[] =
        content.appearanceCatalog[field].options;
      if (!options.some(({ id }) => id === selectedId)) {
        context.addIssue({
          code: 'custom',
          message: `Default appearance ID ${String(selectedId)} is not available for ${field}.`,
          path: ['defaultAppearance', field],
        });
      }
    }
  });

type DeepReadonly<T> = T extends readonly (infer TItem)[]
  ? readonly DeepReadonly<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
    : T;

export type PlayerAttributeId = (typeof PLAYER_ATTRIBUTE_IDS)[number];
export type PlayerStateId = (typeof PLAYER_STATE_IDS)[number];
export type WrArchetypeId = (typeof WR_ARCHETYPE_IDS)[number];
export type RecruitingBackgroundId = (typeof RECRUITING_BACKGROUND_IDS)[number];
export type PersonalityTraitId = (typeof PERSONALITY_TRAIT_IDS)[number];
export type AttributeModifier = DeepReadonly<z.infer<typeof attributeModifierSchema>>;
export type StateModifier = DeepReadonly<z.infer<typeof stateModifierSchema>>;
export type WrCreationBaseline = DeepReadonly<z.infer<typeof wrCreationBaselineSchema>>;
export type WrArchetypeDefinition = DeepReadonly<z.infer<typeof wrArchetypeDefinitionSchema>>;
export type RecruitingBackgroundDefinition = DeepReadonly<
  z.infer<typeof recruitingBackgroundDefinitionSchema>
>;
export type PersonalityTraitDefinition = DeepReadonly<
  z.infer<typeof personalityTraitDefinitionSchema>
>;
export type CreationContent = DeepReadonly<z.infer<typeof creationContentSchema>>;
