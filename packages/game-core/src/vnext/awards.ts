import type { AwardIdVNext, GameRecapVNext, SeasonReviewVNext, VNextPositionId } from './types.js';

/**
 * Fictional season awards (M9), decided only by saved facts: the staff's live-snap-weighted grade,
 * live games, the season-ending depth rank, the team's record and finish, and the title game.
 * They are rare by design and never change ratings; they feed the Pro Draft stock and history.
 */
export const VNEXT_AWARD_TUNING = Object.freeze({
  minimumLiveGames: 8,
  allConferenceFirst: 64,
  allConferenceSecond: 62,
  freshman: 62,
  allAmerican: 66,
  allAmericanWins: 8,
  positionAward: 68,
  positionAwardLiveGames: 10,
  playerOfYear: 65,
  titleGameMvp: 70,
});

export const POSITION_AWARD_IDS = Object.freeze({
  position_qb: 'award_position_qb',
  position_rb: 'award_position_rb',
  position_wr: 'award_position_wr',
  position_cb: 'award_position_cb',
  position_lb: 'award_position_lb',
  position_edge: 'award_position_edge',
} as const satisfies Record<VNextPositionId, AwardIdVNext>);

/** Awards in a fixed order (most prestigious first) for one finished season. */
export function seasonAwardsVNext(
  review: Pick<
    SeasonReviewVNext,
    | 'seasonIndex'
    | 'averageGrade'
    | 'liveGames'
    | 'depthRank'
    | 'record'
    | 'finish'
    | 'conferenceChampion'
  >,
  positionId: VNextPositionId,
  seasonLog: readonly GameRecapVNext[],
): readonly AwardIdVNext[] {
  const tuning = VNEXT_AWARD_TUNING;
  const grade = review.averageGrade;
  if (grade === null || grade === undefined || review.liveGames < tuning.minimumLiveGames) {
    return titleGameMvp(review, seasonLog) ? ['award_title_game_mvp'] : [];
  }
  const starter = review.depthRank.end === 1;
  const awards: AwardIdVNext[] = [];
  if (starter && grade >= tuning.positionAward && review.liveGames >= tuning.positionAwardLiveGames)
    awards.push(POSITION_AWARD_IDS[positionId]);
  if (starter && grade >= tuning.playerOfYear && review.conferenceChampion === true)
    awards.push('award_conference_player_of_year');
  if (starter && grade >= tuning.allAmerican && review.record.wins >= tuning.allAmericanWins)
    awards.push('award_all_american');
  if (starter && grade >= tuning.allConferenceFirst) awards.push('award_all_conference_first');
  else if (review.depthRank.end <= 2 && grade >= tuning.allConferenceSecond)
    awards.push('award_all_conference_second');
  if (review.seasonIndex === 0 && grade >= tuning.freshman)
    awards.push('award_freshman_all_american');
  if (titleGameMvp(review, seasonLog)) awards.push('award_title_game_mvp');
  return awards;
}

function titleGameMvp(
  review: Pick<SeasonReviewVNext, 'finish'>,
  seasonLog: readonly GameRecapVNext[],
): boolean {
  if (review.finish !== 'CHAMPION') return false;
  const final = seasonLog.find(({ round }) => round === 'FINAL');
  return (
    final !== undefined &&
    final.liveSnapCount > 0 &&
    (final.coachGrade ?? 0) >= VNEXT_AWARD_TUNING.titleGameMvp
  );
}

/** Draft-stock credit for a career's awards (capped): the spec's "awards" dimension. */
export function awardStockPointsVNext(
  reviews: readonly Pick<SeasonReviewVNext, 'awards'>[],
): number {
  let points = 0;
  for (const { awards = [] } of reviews)
    for (const award of awards)
      points +=
        award === 'award_all_american' || award.startsWith('award_position_')
          ? 4
          : award === 'award_conference_player_of_year'
            ? 3
            : 2;
  return Math.min(8, points);
}
