import { z } from 'zod';

import { creationContentSchema, type CreationContent } from './creation.js';
import { gameContentSchema, type GameContent } from './games.js';
import { eventContentSchema, type EventContent } from './events.js';
import { injuryContentSchema, type InjuryContent } from './injuries.js';
import { offFieldContentSchema, type OffFieldContent } from './off-field.js';
import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import { programContentSchema, type ProgramContent } from './programs.js';
import { positionAlphaContentSchema, type PositionAlphaContent } from './positions.js';
import { seasonContentSchema, type SeasonContent } from './seasons.js';
import { skillContentSchema, type SkillContent } from './skills.js';
import {
  developmentWeekConfigSchema,
  weeklyActionContentSchema,
  type DevelopmentWeekConfig,
  type WeeklyActionContent,
} from './weekly-actions.js';
import { worldAlphaContentSchema, type WorldAlphaContent } from './world-alpha.js';
import { qbAlphaContentSchema, type QbAlphaContent } from './qb-alpha.js';
import { rbAlphaContentSchema, type RbAlphaContent } from './rb-alpha.js';
import { cbAlphaContentSchema, type CbAlphaContent } from './cb-alpha.js';

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
    events: eventContentSchema,
    games: gameContentSchema,
    injuries: injuryContentSchema,
    offField: offFieldContentSchema,
    positionAlpha: positionAlphaContentSchema,
    qbAlpha: qbAlphaContentSchema,
    rbAlpha: rbAlphaContentSchema,
    cbAlpha: cbAlphaContentSchema,
    programs: programContentSchema,
    schemaVersion: z.literal(9),
    season: seasonContentSchema,
    skills: skillContentSchema,
    weeklyActions: weeklyActionContentSchema,
    worldAlpha: worldAlphaContentSchema,
  })
  .strict();

export type ContentIdentity = Readonly<z.infer<typeof contentIdentitySchema>>;
export type LocalizedContentDefinition = Readonly<z.infer<typeof localizedContentDefinitionSchema>>;
export type ContentManifest = Readonly<{
  contentVersion: typeof CONTENT_COMPATIBILITY_VERSION;
  creation: CreationContent;
  definitions: readonly LocalizedContentDefinition[];
  developmentWeekConfig: DevelopmentWeekConfig;
  events: EventContent;
  games: GameContent;
  injuries: InjuryContent;
  offField: OffFieldContent;
  positionAlpha: PositionAlphaContent;
  qbAlpha: QbAlphaContent;
  rbAlpha: RbAlphaContent;
  cbAlpha: CbAlphaContent;
  programs: ProgramContent;
  schemaVersion: 9;
  season: SeasonContent;
  skills: SkillContent;
  weeklyActions: WeeklyActionContent;
  worldAlpha: WorldAlphaContent;
}>;
