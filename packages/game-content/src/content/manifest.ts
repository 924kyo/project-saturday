import { CONTENT_COMPATIBILITY_VERSION, type ContentManifest } from '../schema/content.js';
import { creationContent } from './creation.js';
import { developmentWeekConfig, weeklyActions } from './weekly-actions.js';
import { skills } from './skills.js';

export const contentManifest = {
  contentVersion: CONTENT_COMPATIBILITY_VERSION,
  creation: creationContent,
  definitions: [],
  developmentWeekConfig,
  schemaVersion: 2,
  skills,
  weeklyActions,
} as const satisfies ContentManifest;
