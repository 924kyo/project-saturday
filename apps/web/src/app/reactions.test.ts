import type { GameRecapVNext } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { selectReactions } from './reactions';

function recap(overrides: {
  readonly score?: [number, number];
  readonly stat?: Readonly<Record<string, number>>;
  readonly plays?: readonly Record<string, unknown>[];
  readonly rivalry?: boolean;
  readonly ranks?: [number | null, number | null];
  readonly live?: number;
  readonly sideline?: readonly ('SHARP' | 'SOLID' | 'MISSED')[];
}): GameRecapVNext {
  const [us, them] = overrides.score ?? [21, 14];
  return {
    playerScore: us,
    opponentScore: them,
    resultId: us > them ? 'game_result_win' : us < them ? 'game_result_loss' : 'game_result_tie',
    liveSnapCount: overrides.live ?? 2,
    sideline: (overrides.sideline ?? []).map((grade) => ({ grade })),
    engine: {
      positionId: 'position_qb',
      game: {
        type: 'COMPLETE',
        summary: { statLine: overrides.stat ?? {} },
        keyPlayLog: overrides.plays ?? [],
      },
    },
    stakes: {
      rivalry: overrides.rivalry ?? false,
      playerRank: overrides.ranks?.[0] ?? null,
      opponentRank: overrides.ranks?.[1] ?? null,
    },
  } as unknown as GameRecapVNext;
}

describe('post-game reactions', () => {
  it('orders authored reactions by real triggers and caps the feed at three', () => {
    const feed = selectReactions(
      recap({
        rivalry: true,
        ranks: [null, 9],
        stat: { passingTouchdowns: 2 },
        plays: [{ passingYardsDelta: 34 }],
      }),
      'position_qb',
    );
    expect(feed.map(({ id }) => id)).toEqual(['upset', 'rivalWin', 'td']);
  });

  it('stays silent when nothing notable happened', () => {
    expect(selectReactions(recap({ score: [10, 13] }), 'position_rb')).toEqual([]);
  });

  it('treats a cornerback interception as a takeaway, not a giveaway', () => {
    const feed = selectReactions(recap({ stat: { interceptions: 1 } }), 'position_cb');
    expect(feed.map(({ id }) => id)).toEqual(['takeaway']);
    const offense = selectReactions(recap({ stat: { interceptions: 1 } }), 'position_qb');
    expect(offense.map(({ id }) => id)).toEqual(['giveaway']);
  });

  it('credits front-seven forced fumbles as takeaways and sacks as their own moment', () => {
    const feed = selectReactions(recap({ stat: { forcedFumbles: 1, sacks: 2 } }), 'position_edge');
    expect(feed.map(({ id }) => id)).toEqual(['takeaway', 'sack']);
    const quiet = selectReactions(recap({ stat: { sacks: 1 } }), 'position_qb');
    expect(quiet).toEqual([]);
  });

  it('rewards a perfect sideline day for a reserve', () => {
    const feed = selectReactions(recap({ live: 0, sideline: ['SHARP', 'SHARP'] }), 'position_wr');
    expect(feed.map(({ id }) => id)).toEqual(['sidelineSharp', 'stayReady']);
  });
});
