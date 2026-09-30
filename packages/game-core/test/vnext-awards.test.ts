import { describe, expect, it } from 'vitest';

import {
  awardStockPointsVNext,
  seasonAwardsVNext,
  type GameRecapVNext,
  type SeasonReviewVNext,
} from '../src/index.js';

type Review = Parameters<typeof seasonAwardsVNext>[0];

const base: Review = {
  seasonIndex: 1,
  averageGrade: 55,
  liveGames: 12,
  depthRank: { start: 1, end: 1 },
  record: { wins: 7, losses: 5, ties: 0 },
  finish: 'MISSED',
  conferenceChampion: false,
};

describe('VNext season awards', () => {
  it('stays empty for an ordinary season or too few live games', () => {
    expect(seasonAwardsVNext(base, 'position_qb', [])).toEqual([]);
    expect(
      seasonAwardsVNext({ ...base, averageGrade: 90, liveGames: 5 }, 'position_qb', []),
    ).toEqual([]);
  });

  it('orders earned awards from most prestigious, by position', () => {
    expect(
      seasonAwardsVNext(
        {
          ...base,
          averageGrade: 70,
          conferenceChampion: true,
          record: { wins: 10, losses: 2, ties: 0 },
        },
        'position_edge',
        [],
      ),
    ).toEqual([
      'award_position_edge',
      'award_conference_player_of_year',
      'award_all_american',
      'award_all_conference_first',
    ]);
    expect(
      seasonAwardsVNext(
        { ...base, seasonIndex: 0, averageGrade: 61, depthRank: { start: 3, end: 2 } },
        'position_lb',
        [],
      ),
    ).toEqual(['award_all_conference_second', 'award_freshman_all_american']);
  });

  it('names a title game MVP only from the saved final', () => {
    const final = { round: 'FINAL', liveSnapCount: 4, coachGrade: 74 } as GameRecapVNext;
    expect(seasonAwardsVNext({ ...base, finish: 'CHAMPION' }, 'position_wr', [final])).toEqual([
      'award_title_game_mvp',
    ]);
    expect(seasonAwardsVNext({ ...base, finish: 'RUNNER_UP' }, 'position_wr', [final])).toEqual([]);
  });

  it('credits awards to draft stock, capped', () => {
    const reviews = [
      { awards: ['award_all_american', 'award_position_qb'] },
      { awards: ['award_all_conference_first'] },
    ] as Pick<SeasonReviewVNext, 'awards'>[];
    expect(awardStockPointsVNext(reviews)).toBe(8);
    expect(awardStockPointsVNext([{ awards: ['award_all_conference_second'] }])).toBe(2);
    expect(awardStockPointsVNext([{}])).toBe(0);
  });
});
