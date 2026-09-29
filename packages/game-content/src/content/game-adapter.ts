import {
  prepareGame,
  resolveKeySnap,
  startGame,
  type CareerRun,
  type GameCommandResult,
  type GameOpponentMechanicsProfile,
  type KeySnapDecisionId,
  type ProgramId,
} from '@project-saturday/game-core';

import {
  gameOpponentMechanicsProfiles,
  gameTuning,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
} from './games.js';
import { skillMechanicsDefinitions } from './skills.js';

export interface NextGameProfiles {
  readonly playerProfile: GameOpponentMechanicsProfile;
  readonly opponentProfile: GameOpponentMechanicsProfile;
}

/** Selects the next exhibition opponent by canonical program order without consuming RNG. */
export function selectNextGameProfiles(
  playerProgramId: ProgramId,
  weekIndex: number,
): NextGameProfiles | null {
  if (!Number.isSafeInteger(weekIndex) || weekIndex < 0) return null;
  const playerIndex = gameOpponentMechanicsProfiles.findIndex(
    ({ programId }) => programId === playerProgramId,
  );
  if (playerIndex < 0) return null;
  const opponentOffset = 1 + (weekIndex % (gameOpponentMechanicsProfiles.length - 1));
  const opponentIndex = (playerIndex + opponentOffset) % gameOpponentMechanicsProfiles.length;
  return Object.freeze({
    playerProfile: gameOpponentMechanicsProfiles[playerIndex]!,
    opponentProfile: gameOpponentMechanicsProfiles[opponentIndex]!,
  });
}

/** Shipping content adapter for the zero-draw WEEK_END -> GAME_PREVIEW command. */
export function prepareNextShippedGame(career: CareerRun): GameCommandResult {
  if (career.programId === null) {
    return Object.freeze({ career, ok: false, reason: 'game.invalid_player_profile' });
  }
  const profiles = selectNextGameProfiles(career.programId, career.weekIndex);
  if (profiles === null) {
    return Object.freeze({ career, ok: false, reason: 'game.invalid_player_profile' });
  }
  return prepareGame(
    career,
    profiles.playerProfile,
    profiles.opponentProfile,
    gameTuning,
    keySnapFamilyMechanicsDefinitions,
    keySnapPatternMechanicsDefinitions,
    skillMechanicsDefinitions,
  );
}

/** Shipping content adapter for the first deterministic simulation advance. */
export function startShippedGame(career: CareerRun): GameCommandResult {
  return startGame(
    career,
    gameTuning,
    keySnapFamilyMechanicsDefinitions,
    keySnapPatternMechanicsDefinitions,
    skillMechanicsDefinitions,
  );
}

/** Shipping content adapter for one persisted athlete-level key-snap decision. */
export function resolveShippedKeySnap(
  career: CareerRun,
  decisionId: KeySnapDecisionId,
): GameCommandResult {
  return resolveKeySnap(
    career,
    decisionId,
    gameTuning,
    keySnapFamilyMechanicsDefinitions,
    keySnapPatternMechanicsDefinitions,
    skillMechanicsDefinitions,
  );
}
