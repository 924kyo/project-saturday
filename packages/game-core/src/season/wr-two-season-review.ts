import type { GameCareerState } from '../games/types.js';
import { matchesExactWrEvidence } from '../games/transitions.js';
import { deepFreeze } from '../player/immutable.js';
import type { ProgramId } from '../player/ids.js';
import type { CompletedSeasonSummary } from '../player/types.js';
import { utf8ByteLength } from '../player/utf8.js';
import { parseCareerSessionV7 } from './persistence.js';
import { projectCompletedSeasonSummary } from './transitions.js';
import type { CareerSessionV7 } from './types.js';

export interface WrReviewedSeasonV1 {
  readonly seasonIndex: 0 | 1;
  readonly programId: ProgramId;
  readonly summary: CompletedSeasonSummary;
}

/** Staged terminal evidence, not a live phase or a substitute football model. */
export interface WrTwoSeasonReviewV1 {
  readonly model: 'wr_two_season_review_v1';
  readonly source: CareerSessionV7;
  readonly seasons: readonly [WrReviewedSeasonV1, WrReviewedSeasonV1];
  readonly careerTotals: GameCareerState;
}

export function createWrTwoSeasonReviewV1(value: unknown): WrTwoSeasonReviewV1 | null {
  try {
    const parsed = parseCareerSessionV7(value);
    if (!parsed.ok) return null;
    const source = parsed.session;
    const state = source.career.seasonCareerState;
    const priorWorld = source.world.completedSeasonHistory?.[0];
    if (
      source.career.phase.type !== 'PLAN_ACTIONS' ||
      source.career.programId === null ||
      source.career.revision > Number.MAX_SAFE_INTEGER - 2 ||
      state.bootstrapStatus !== 'ACTIVE' ||
      state.seasonsCompleted !== 1 ||
      state.lastCompletedSeason === null ||
      source.world.completedSeasonHistory?.length !== 1 ||
      priorWorld === undefined ||
      priorWorld.calendar.definition.id !== state.lastCompletedSeason.seasonId ||
      source.world.calendar.type !== 'ACTIVE' ||
      source.world.calendar.postseason.type !== 'COMPLETE'
    )
      return null;
    const current = projectCompletedSeasonSummary(source, 'current-season');
    if (current === null || current.seasonId === state.lastCompletedSeason.seasonId) return null;
    const previous = state.lastCompletedSeason;
    const totals = source.career.gameCareerState;
    if (
      previous.gamesPlayed + current.gamesPlayed !== totals.gamesPlayed ||
      previous.playerWins + current.playerWins !== totals.wins ||
      previous.playerLosses + current.playerLosses !== totals.losses ||
      previous.playerTies + current.playerTies !== totals.ties ||
      Object.keys(totals.cumulativeStats).some((key) => {
        const stat = key as keyof GameCareerState['cumulativeStats'];
        return (
          previous.cumulativeStats[stat] + current.cumulativeStats[stat] !==
          totals.cumulativeStats[stat]
        );
      })
    )
      return null;
    const review: WrTwoSeasonReviewV1 = {
      model: 'wr_two_season_review_v1',
      source,
      seasons: [
        { seasonIndex: 0, programId: priorWorld.playerProgramId, summary: previous },
        { seasonIndex: 1, programId: source.career.programId, summary: current },
      ],
      careerTotals: totals,
    };
    return utf8ByteLength(JSON.stringify(review)) < 1_000_000 ? deepFreeze(review) : null;
  } catch {
    return null;
  }
}

export function parseWrTwoSeasonReviewV1(value: unknown): WrTwoSeasonReviewV1 | null {
  try {
    const decoded: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('source' in decoded) ||
      utf8ByteLength(JSON.stringify(decoded)) >= 1_000_000
    )
      return null;
    const expected = createWrTwoSeasonReviewV1(decoded.source);
    return expected !== null && matchesExactWrEvidence(decoded, expected) ? expected : null;
  } catch {
    return null;
  }
}
