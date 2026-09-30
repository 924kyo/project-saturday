import type { ProgramId } from '../player/ids.js';
import { createRng, nextUint32 } from '../random/rng.js';
import type {
  WorldAlphaFixtureMechanics,
  WorldAlphaPlayerGameResult,
} from '../season/world-alpha.js';
import type { CareerVNext, CareerVNextMechanics } from './types.js';
import { matchupVNext } from './world.js';

/**
 * Original fictional overtime (M8): Saturdays do not end tied. A regulation tie in the player's game
 * goes to one overtime on its own named stream; the stronger matchup is favored but never certain,
 * and the winner adds a field goal or a touchdown. Kernel outputs stay literal; only the final
 * score the world and the recap record changes.
 */
export const VNEXT_OVERTIME_TUNING = Object.freeze({
  basePermille: 500,
  perMatchupPointPermille: 10,
  minimumPermille: 250,
  maximumPermille: 750,
  fieldGoalPermille: 600,
});

export interface OvertimeVNext {
  readonly regulation: { readonly home: number; readonly away: number };
  readonly winnerProgramId: ProgramId;
  readonly points: 3 | 7;
}

export function resolveOvertimeVNext(
  career: Pick<CareerVNext, 'seed' | 'season' | 'program' | 'athlete'>,
  fixture: WorldAlphaFixtureMechanics,
  result: WorldAlphaPlayerGameResult,
  mechanics: CareerVNextMechanics,
): { readonly result: WorldAlphaPlayerGameResult; readonly overtime: OvertimeVNext | null } {
  if (result.winnerProgramId !== null || career.program === null) return { result, overtime: null };
  const programId = career.program.programId;
  const isHome = fixture.homeProgramId === programId;
  const opponentId = isHome ? fixture.awayProgramId : fixture.homeProgramId;
  const matchup = matchupVNext(
    mechanics,
    career.athlete.profile.positionId,
    programId,
    opponentId,
    isHome,
  );
  const tuning = VNEXT_OVERTIME_TUNING;
  const playerChance = Math.min(
    tuning.maximumPermille,
    Math.max(
      tuning.minimumPermille,
      tuning.basePermille + ((matchup?.matchupScore ?? 50) - 50) * tuning.perMatchupPointPermille,
    ),
  );
  const rng = createRng(
    `${String(career.seed)}:vnext:overtime:${career.season.index}:${career.season.weekIndex}`,
  );
  const winnerDraw = nextUint32(rng);
  const pointsDraw = nextUint32(winnerDraw.nextRng);
  const winnerProgramId = winnerDraw.value % 1_000 < playerChance ? programId : opponentId;
  const points: 3 | 7 = pointsDraw.value % 1_000 < tuning.fieldGoalPermille ? 3 : 7;
  const homeWins = winnerProgramId === fixture.homeProgramId;
  return {
    result: {
      ...result,
      homeScore: result.homeScore + (homeWins ? points : 0),
      awayScore: result.awayScore + (homeWins ? 0 : points),
      winnerProgramId,
    },
    overtime: {
      regulation: { home: result.homeScore, away: result.awayScore },
      winnerProgramId,
      points,
    },
  };
}
