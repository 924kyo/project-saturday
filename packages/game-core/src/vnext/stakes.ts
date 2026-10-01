import { deepFreeze } from '../player/immutable.js';
import type { ProgramId } from '../player/ids.js';
import { matchupVNext } from './world.js';
import type { CareerVNext, CareerVNextMechanics } from './types.js';

/** Public stakes for a scheduled game: only authoritative world facts, no hidden ratings. */
export interface GameStakesVNext {
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly outlook: 'ADVANTAGE' | 'BALANCED' | 'CHALLENGE';
  /**
   * M12: the five-band pregame line (absent on recaps saved before M12). The three-band outlook put
   * 85% of games at "toss-up"; the bands follow the observed matchup-score spread.
   */
  readonly band?: OutlookBandVNext;
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

export type OutlookBandVNext =
  'HEAVY_FAVORITE' | 'FAVORITE' | 'TOSS_UP' | 'UNDERDOG' | 'HEAVY_UNDERDOG';

/** Matchup-score cut-offs (p10 46, p25 49, p50 52, p75 55, p90 59 across 864 shipped matchups). */
export const VNEXT_OUTLOOK_BANDS = Object.freeze({
  heavyFavorite: 59,
  favorite: 55,
  tossUpLow: 50,
  underdog: 46,
});

export function outlookBandVNext(matchupScore: number): OutlookBandVNext {
  const bands = VNEXT_OUTLOOK_BANDS;
  return matchupScore >= bands.heavyFavorite
    ? 'HEAVY_FAVORITE'
    : matchupScore >= bands.favorite
      ? 'FAVORITE'
      : matchupScore >= bands.tossUpLow
        ? 'TOSS_UP'
        : matchupScore >= bands.underdog
          ? 'UNDERDOG'
          : 'HEAVY_UNDERDOG';
}

/** A win the pregame line did not expect (pre-M12 recaps: a win over a better-ranked team). */
export function isUpsetWinVNext(
  won: boolean,
  stakes: Pick<GameStakesVNext, 'band' | 'playerRank' | 'opponentRank'> | null,
): boolean {
  if (!won || stakes === null) return false;
  if (stakes.band !== undefined)
    return stakes.band === 'UNDERDOG' || stakes.band === 'HEAVY_UNDERDOG';
  return (
    stakes.opponentRank !== null &&
    (stakes.playerRank === null || stakes.playerRank > stakes.opponentRank)
  );
}

export function projectGameStakesVNext(
  career: CareerVNext,
  opponentProgramId: ProgramId,
  isHome: boolean,
  mechanics: CareerVNextMechanics,
): GameStakesVNext | null {
  const programId = career.program?.programId;
  const world = career.season.world;
  if (programId === undefined || world === null) return null;
  const matchup = matchupVNext(
    mechanics,
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
    band: outlookBandVNext(matchup.matchupScore),
    rivalry: profile?.rivalProgramId === opponentProgramId,
    playerRank: rank(programId),
    opponentRank: rank(opponentProgramId),
    playerRecord: record(programId),
    opponentRecord: record(opponentProgramId),
  });
}
