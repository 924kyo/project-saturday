import { deepFreeze } from '../player/immutable.js';
import type { ProgramId } from '../player/ids.js';
import { projectWorldAlphaPositionMatchup } from '../season/world-alpha.js';
import type { CareerVNext, CareerVNextMechanics } from './types.js';

/** Public stakes for a scheduled game: only authoritative world facts, no hidden ratings. */
export interface GameStakesVNext {
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly outlook: 'ADVANTAGE' | 'BALANCED' | 'CHALLENGE';
  readonly rivalry: boolean;
  readonly playerRank: number | null;
  readonly opponentRank: number | null;
  readonly playerRecord: { readonly wins: number; readonly losses: number; readonly ties: number };
  readonly opponentRecord: {
    readonly wins: number;
    readonly losses: number;
    readonly ties: number;
  };
}

export const RANKED_CUTOFF = 25;

export function projectGameStakesVNext(
  career: CareerVNext,
  opponentProgramId: ProgramId,
  isHome: boolean,
  mechanics: CareerVNextMechanics,
): GameStakesVNext | null {
  const programId = career.program?.programId;
  const world = career.season.world;
  if (programId === undefined || world === null) return null;
  const matchup = projectWorldAlphaPositionMatchup(
    mechanics.world,
    career.athlete.profile.positionId,
    programId,
    opponentProgramId,
    isHome,
  );
  if (matchup === undefined) return null;
  const profile = mechanics.world.programProfiles.find((entry) => entry.programId === programId);
  const record = (id: ProgramId) => {
    const found = world.programRecords.find((entry) => entry.programId === id);
    return { wins: found?.wins ?? 0, losses: found?.losses ?? 0, ties: found?.ties ?? 0 };
  };
  const rank = (id: ProgramId) => {
    const found = world.rankings.find((entry) => entry.programId === id)?.rank;
    return found !== undefined && found <= RANKED_CUTOFF ? found : null;
  };
  return deepFreeze({
    opponentProgramId,
    isHome,
    outlook: matchup.outlook,
    rivalry: profile?.rivalProgramId === opponentProgramId,
    playerRank: rank(programId),
    opponentRank: rank(opponentProgramId),
    playerRecord: record(programId),
    opponentRecord: record(opponentProgramId),
  });
}
