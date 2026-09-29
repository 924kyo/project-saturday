import { copyTacticalSnapContextV1, type TacticalSnapContextV1 } from './tactical-context-v1.js';
import type { ActiveGameState, PendingKeySnap } from './types.js';

/**
 * Owning-core pre-context only. Never clamp an existing historical situation
 * into a made-up current one; current drive initialization must establish it.
 */
export function createWrTacticalSnapContextV1(
  game: ActiveGameState,
  pending: PendingKeySnap,
): TacticalSnapContextV1 | undefined {
  if (game.situation.possessionId !== 'game_possession_player_team') return undefined;
  return copyTacticalSnapContextV1({
    model: 'tactical_snap_context_v1',
    gameId: game.matchup.gameId,
    positionId: 'position_wr',
    snapIndex: game.opportunitiesPresented - 1,
    clock: { period: game.clock.period, secondsRemaining: game.clock.clockSecondsRemaining },
    field: {
      offense: 'PLAYER',
      driveIndex: game.situation.driveIndex,
      down: game.situation.down,
      distanceYards: game.situation.distanceYards,
      lineOfScrimmageYards: game.situation.yardLine,
    },
    score: game.score,
    decisionIds: pending.decisionIds,
    revealedClueIds: pending.revealedClueIds,
  });
}
