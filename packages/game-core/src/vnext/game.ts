import { TACTICAL_GAME_RULES_VERSION } from '../games/tactical-alpha-v1.js';
import {
  projectWrAlphaWorldResult,
  resolveWrAlphaSnap,
  startWrAlphaGame,
} from '../games/wr-alpha.js';
import {
  projectCompletedWorldResult,
  resolvePositionAlphaSnap,
  startPositionAlphaGame,
  type CompletedPositionGame,
  type PositionAlphaGameContext,
  type PositionAlphaGameState,
} from '../season/position-alpha-session.js';
import {
  projectWorldAlphaPositionMatchup,
  type WorldAlphaFixtureMechanics,
  type WorldAlphaPlayerGameResult,
} from '../season/world-alpha.js';
import { gameHooksVNext, packageSnapBonusVNext } from './build.js';
import type { CareerVNext, CareerVNextMechanics, VNextGameState } from './types.js';

/**
 * The one game-engine seam for VNext: every position starts, resolves and reports through the
 * owning kernel with current tactical rules. No presentation or career code branches on engines.
 */
function sharedContext(career: CareerVNext): PositionAlphaGameContext {
  // The shared QB/RB/CB entry reads only these fields; VNext supplies them from its own aggregate.
  return {
    player: career.athlete.profile,
    lifecycle: {
      currentProgramId: career.program!.programId,
      activeSeasonIndex: career.season.index,
    },
    room: career.program!.room,
    careerRng: career.rng.career,
    events: { nextGameModifiers: career.condition.nextGameModifiers },
    skills: { equippedSkillIds: career.build.equippedSkillIds },
  } as unknown as PositionAlphaGameContext;
}

export function startVNextGame(
  career: CareerVNext,
  fixture: WorldAlphaFixtureMechanics,
  weekIndex: number,
  mechanics: CareerVNextMechanics,
  academicHold = false,
): VNextGameState | null {
  if (career.program === null) return null;
  const profile = career.athlete.profile;
  if (profile.positionId !== 'position_wr')
    return startPositionAlphaGame(
      sharedContext(career),
      fixture,
      weekIndex,
      mechanics,
      career.condition.availability,
      academicHold ? 0 : 5,
      TACTICAL_GAME_RULES_VERSION,
    );
  const programId = career.program.programId;
  const isHome = fixture.homeProgramId === programId;
  const opponentProgramId = isHome ? fixture.awayProgramId : fixture.homeProgramId;
  const matchup = projectWorldAlphaPositionMatchup(
    mechanics.world,
    'position_wr',
    programId,
    opponentProgramId,
    isHome,
  );
  if (matchup === undefined) return null;
  const gameHooks = gameHooksVNext(career, mechanics);
  const maximum = career.program.room.projection.interactiveSnapMaximum;
  const started = startWrAlphaGame({
    rulesVersion: TACTICAL_GAME_RULES_VERSION,
    gameId: `game_wr_alpha_${career.season.index}_${weekIndex}`,
    weekIndex,
    playerProgramId: programId,
    opponentProgramId,
    isHome,
    // Package cards add live snaps to a role that already has some; they never create a role.
    opportunityCount: Math.min(
      5,
      maximum + (maximum > 0 ? packageSnapBonusVNext(gameHooks) : 0),
      career.condition.availability?.opportunityCap ?? 12,
      academicHold ? 0 : 5,
    ),
    playerTeamRating: matchup.supportingUnitRating,
    opponentDefenseRating: matchup.opponentPrimaryRating,
    opponentOffenseRating: matchup.opponentSecondaryRating,
    player: {
      id: profile.id,
      positionId: 'position_wr',
      attributes: profile.attributes,
      state: {
        body: profile.state.body,
        preparation: profile.state.preparation,
        confidence: profile.state.confidence,
        coachTrust: profile.state.coachTrust,
      },
    },
    families: mechanics.wr.families,
    patterns: mechanics.wr.patterns,
    gameHooks,
    rng: career.rng.career,
  });
  return started.ok ? { positionId: 'position_wr', game: started.state } : null;
}

export function resolveVNextSnap(state: VNextGameState, decisionId: string): VNextGameState | null {
  if (state.positionId !== 'position_wr')
    return resolvePositionAlphaSnap(state as PositionAlphaGameState, decisionId);
  if (state.game.type !== 'ACTIVE') return null;
  const resolved = resolveWrAlphaSnap(state.game, decisionId);
  return resolved.ok ? { positionId: 'position_wr', game: resolved.state } : null;
}

export function projectVNextWorldResult(
  state: VNextGameState,
  fixture: WorldAlphaFixtureMechanics,
): WorldAlphaPlayerGameResult | null {
  if (state.game.type !== 'COMPLETE') return null;
  if (state.positionId === 'position_wr')
    return projectWrAlphaWorldResult(state.game.summary, fixture);
  return projectCompletedWorldResult(state as CompletedPositionGame, fixture);
}
