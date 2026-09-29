import { CONTENT_COMPATIBILITY_VERSION, type ContentManifest } from '../schema/content.js';
import { creationContent } from './creation.js';
import { developmentWeekConfig, weeklyActions } from './weekly-actions.js';
import { eventContent } from './events.js';
import { gameContent } from './games.js';
import { injuryContent } from './injuries.js';
import { offFieldContent } from './off-field.js';
import { positionAlphaContent } from './positions.js';
import { programContent } from './programs.js';
import { seasonContent } from './seasons.js';
import { skills } from './skills.js';
import { worldAlphaContent } from './world-alpha.js';
import { qbAlphaContent } from './qb-alpha.js';
import { rbAlphaContent } from './rb-alpha.js';
import { cbAlphaContent } from './cb-alpha.js';

export const contentManifest = {
  contentVersion: CONTENT_COMPATIBILITY_VERSION,
  creation: creationContent,
  definitions: [],
  developmentWeekConfig,
  events: eventContent,
  games: gameContent,
  injuries: injuryContent,
  offField: offFieldContent,
  positionAlpha: positionAlphaContent,
  qbAlpha: qbAlphaContent,
  rbAlpha: rbAlphaContent,
  cbAlpha: cbAlphaContent,
  programs: programContent,
  schemaVersion: 9,
  season: seasonContent,
  skills,
  weeklyActions,
  worldAlpha: worldAlphaContent,
} as const satisfies ContentManifest;
