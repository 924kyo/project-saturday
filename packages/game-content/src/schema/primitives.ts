import { z } from 'zod';

export const STABLE_CONTENT_ID_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
export const MESSAGE_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)+$/u;

export const stableContentIdSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(STABLE_CONTENT_ID_PATTERN, 'Expected a lower-snake-case stable ID.');

export const messageKeyFormatSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(MESSAGE_KEY_PATTERN, 'Expected a dotted stable message key.');
