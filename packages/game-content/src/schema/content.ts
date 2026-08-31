import { z } from 'zod';

import { creationContentSchema, type CreationContent } from './creation.js';
import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import { skillContentSchema, type SkillContent } from './skills.js';
import {
  developmentWeekConfigSchema,
  weeklyActionContentSchema,
  type DevelopmentWeekConfig,
  type WeeklyActionContent,
} from './weekly-actions.js';

export {
  MESSAGE_KEY_PATTERN,
  STABLE_CONTENT_ID_PATTERN,
  messageKeyFormatSchema,
  stableContentIdSchema,
} from './primitives.js';

/** Increment only when shipped content compatibility or tuning semantics change. */
export const CONTENT_COMPATIBILITY_VERSION = 1 as const;

export const contentIdentitySchema = z
  .object({
    id: stableContentIdSchema,
  })
  .strict();

export const localizedContentDefinitionSchema = contentIdentitySchema
  .extend({
    descriptionKey: messageKeyFormatSchema,
    nameKey: messageKeyFormatSchema,
  })
  .strict();

export const contentManifestSchema = z
  .object({
    contentVersion: z.literal(CONTENT_COMPATIBILITY_VERSION),
    creation: creationContentSchema,
    definitions: z.array(localizedContentDefinitionSchema),
    developmentWeekConfig: developmentWeekConfigSchema,
    schemaVersion: z.literal(2),
    skills: skillContentSchema,
    weeklyActions: weeklyActionContentSchema,
  })
  .strict();

export type ContentIdentity = Readonly<z.infer<typeof contentIdentitySchema>>;
export type LocalizedContentDefinition = Readonly<z.infer<typeof localizedContentDefinitionSchema>>;
export type ContentManifest = Readonly<{
  contentVersion: typeof CONTENT_COMPATIBILITY_VERSION;
  creation: CreationContent;
  definitions: readonly LocalizedContentDefinition[];
  developmentWeekConfig: DevelopmentWeekConfig;
  schemaVersion: 2;
  skills: SkillContent;
  weeklyActions: WeeklyActionContent;
}>;
