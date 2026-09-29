import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import {
  packJsonArchiveV1,
  unpackJsonArchiveV1,
  type JsonArchiveV1,
} from '../player/json-archive.js';
import type { ProgramId } from '../player/ids.js';
import type { InjuryOutcomeId } from '../injuries/ids.js';
import { matchesExactWrEvidence } from '../games/transitions.js';
import { utf8ByteLength } from '../player/utf8.js';
import { compareBestGame } from './transitions.js';
import type { AlumniRecordV1 } from './types.js';
import { parseWrTwoSeasonReviewV1 } from './wr-two-season-review.js';

export interface WrAlumniInjuryEvidenceV1 {
  readonly seasonIndex: 0 | 1;
  readonly recordedCount: number;
  readonly weeksMissed: number;
  /** Historical first-season summary did not retain incident identities. */
  readonly outcomeIds: readonly InjuryOutcomeId[] | null;
}

export interface WrTwoSeasonAlumniV1 extends Omit<
  AlumniRecordV1,
  | 'schemaVersion'
  | 'programIds'
  | 'seasonsPlayed'
  | 'injuryOutcomeIds'
  | 'championshipCount'
  | 'endingId'
  | 'careerSchemaVersion'
> {
  readonly schemaVersion: 2;
  readonly model: 'wr_two_season_alumni_v1';
  readonly programIds: readonly ProgramId[];
  readonly seasonsPlayed: 2;
  readonly injuryEvidence: readonly [WrAlumniInjuryEvidenceV1, WrAlumniInjuryEvidenceV1];
  readonly championshipCount: number;
  readonly endingId: 'career_ending_college_complete';
  readonly careerSchemaVersion: 8;
  readonly reviewArchive: JsonArchiveV1;
}

export function createWrTwoSeasonAlumniV1(
  value: unknown,
  contentVersion: number,
): WrTwoSeasonAlumniV1 | null {
  if (!Number.isSafeInteger(contentVersion) || contentVersion < 1) return null;
  const review = parseWrTwoSeasonReviewV1(value);
  if (review === null) return null;
  const archive = packJsonArchiveV1(review);
  if (archive === null) return null;
  const source = review.source.career;
  const state = source.seasonCareerState;
  if (state.bootstrapStatus !== 'ACTIVE') return null;
  const first = review.seasons[0].summary;
  const last = review.seasons[1].summary;
  const starting = first.roleHistory[0];
  if (starting === undefined) return null;
  const candidates = [first.bestGame, last.bestGame].filter((game) => game !== null);
  const bestGame = candidates.sort(compareBestGame)[0] ?? null;
  const total = review.careerTotals;
  const alumni: WrTwoSeasonAlumniV1 = {
    schemaVersion: 2,
    model: 'wr_two_season_alumni_v1',
    alumniId: `alumni_${source.id}`,
    careerId: source.id,
    playerId: source.player.id,
    displayName: source.player.displayName,
    appearance: source.player.appearance,
    positionId: 'position_wr',
    archetypeId: source.player.archetypeId,
    recruitingBackgroundId: source.player.recruitingBackgroundId,
    personalityTraitIds: source.player.personalityTraitIds,
    programIds: [...new Set(review.seasons.map(({ programId }) => programId))],
    seasonsPlayed: 2,
    careerStats: total.cumulativeStats,
    gamesPlayed: total.gamesPlayed,
    wins: total.wins,
    losses: total.losses,
    ties: total.ties,
    averagePerformanceGrade:
      total.gamesPlayed === 0 ? 0 : Math.round(total.cumulativeGradeScore / total.gamesPlayed),
    bestGame,
    startingDepthRank: starting.rank,
    startingRoleId: starting.roleId,
    finalDepthRank: last.finalDepthRank,
    finalRoleId: last.finalRoleId,
    ownedSkillIds: source.player.skillState.acquisitions.map(
      ({ selectedSkillId }) => selectedSkillId,
    ),
    equippedSkillIds: source.player.skillState.equippedSkillIds,
    injuryEvidence: [
      {
        seasonIndex: 0,
        recordedCount: first.injuryCount,
        weeksMissed: first.injuryWeeksMissed,
        outcomeIds: null,
      },
      {
        seasonIndex: 1,
        recordedCount: last.injuryCount,
        weeksMissed: last.injuryWeeksMissed,
        outcomeIds: state.injuryState.history.map(({ outcomeId }) => outcomeId),
      },
    ],
    injuryWeeksMissed: first.injuryWeeksMissed + last.injuryWeeksMissed,
    seasonOutcomeId: last.outcomeId,
    regularSeasonRank: last.regularSeasonRank,
    postseasonSeed: last.postseasonSeed,
    championshipCount: review.seasons.filter(
      ({ summary }) => summary.outcomeId === 'season_outcome_champion',
    ).length,
    endingId: 'career_ending_college_complete',
    careerSeed: source.careerSeed,
    careerSchemaVersion: 8,
    contentVersion,
    reviewArchive: archive,
  };
  return utf8ByteLength(JSON.stringify(alumni)) < 1_000_000
    ? deepFreeze(cloneSerializable(alumni))
    : null;
}

export function parseWrTwoSeasonAlumniV1(value: unknown): WrTwoSeasonAlumniV1 | null {
  try {
    const decoded: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('reviewArchive' in decoded) ||
      !('contentVersion' in decoded) ||
      typeof decoded.contentVersion !== 'number' ||
      utf8ByteLength(JSON.stringify(decoded)) >= 1_000_000
    )
      return null;
    const expanded = unpackJsonArchiveV1(decoded.reviewArchive);
    if (!expanded.ok) return null;
    const expected = createWrTwoSeasonAlumniV1(expanded.value, decoded.contentVersion);
    return expected !== null && matchesExactWrEvidence(decoded, expected) ? expected : null;
  } catch {
    return null;
  }
}
