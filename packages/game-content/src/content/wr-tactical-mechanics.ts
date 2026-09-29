import {
  parseCareerSessionV8,
  validateCareerSession,
  type CareerSession,
  type CareerSessionV8,
  type WrTacticalMechanicsV1,
} from '@project-saturday/game-core';

import {
  gameTuning,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
} from './games.js';
import { skillMechanicsDefinitions } from './skills.js';

/** Shipped catalogs that current WR v8 records are source-replayed against. */
export const shippedWrTacticalMechanicsV1: WrTacticalMechanicsV1 = Object.freeze({
  tuning: gameTuning,
  families: keySnapFamilyMechanicsDefinitions,
  patterns: keySnapPatternMechanicsDefinitions,
  skills: skillMechanicsDefinitions,
});

// Frozen sessions are immutable, so one full source-replay validation per object is sufficient.
const validatedFrozenV8Sessions = new WeakSet<CareerSessionV8>();

/** Read-only validation for presentation projections over either saved WR session version. */
export function isValidShippedWrSession(session: CareerSession | CareerSessionV8): boolean {
  if (session.schemaVersion !== 8) return validateCareerSession(session).ok;
  if (validatedFrozenV8Sessions.has(session)) return true;
  const valid = parseCareerSessionV8(session, shippedWrTacticalMechanicsV1).ok;
  if (valid && Object.isFrozen(session) && Object.isFrozen(session.career)) {
    validatedFrozenV8Sessions.add(session);
  }
  return valid;
}
