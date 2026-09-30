import type {
  GameRecapVNext,
  LegacyAlumnusVNext,
  ProgramId,
  VNextPositionId,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

/**
 * Authored reactions selected only by real recap triggers, in a fixed priority order. No
 * randomness, no invented relationships: an empty feed is a valid, truthful outcome.
 */
export type ReactionSpeaker = 'coach' | 'teammate' | 'media' | 'fans';
export interface ReactionView {
  readonly id: string;
  readonly speaker: ReactionSpeaker;
  readonly key: MessageKey;
  readonly params: Readonly<Record<string, string | number>>;
}

function stat(recap: GameRecapVNext, field: string): number {
  if (recap.engine.game.type !== 'COMPLETE') return 0;
  return (recap.engine.game.summary.statLine as unknown as Record<string, number>)[field] ?? 0;
}

function bestPlayYards(recap: GameRecapVNext): number {
  return recap.engine.game.keyPlayLog.reduce((best, play) => {
    const record = play as unknown as Record<string, unknown>;
    const yards = ['passingYardsDelta', 'rushingYardsDelta', 'yardsDelta', 'receivingYardsDelta']
      .map((field) => (typeof record[field] === 'number' ? (record[field] as number) : 0))
      .reduce((sum, value) => sum + value, 0);
    return Math.max(best, yards);
  }, 0);
}

export function selectReactions(
  recap: GameRecapVNext,
  positionId: VNextPositionId,
  legacy?: { readonly programId: ProgramId; readonly alumni: readonly LegacyAlumnusVNext[] },
): readonly ReactionView[] {
  // Cameos: alumni whose saved careers touch this game's programs (information only).
  const proud = legacy?.alumni.find(({ programIds }) => programIds.includes(legacy.programId));
  const rival = legacy?.alumni.find(({ programIds }) =>
    programIds.includes(recap.opponentProgramId),
  );
  const won = recap.resultId === 'game_result_win';
  const lost = recap.resultId === 'game_result_loss';
  const margin = recap.playerScore - recap.opponentScore;
  const stakes = recap.stakes;
  const touchdowns =
    stat(recap, 'passingTouchdowns') +
    stat(recap, 'rushingTouchdowns') +
    stat(recap, 'receivingTouchdowns');
  const defense =
    positionId === 'position_cb' || positionId === 'position_lb' || positionId === 'position_edge';
  const takeaways = defense ? stat(recap, 'interceptions') + stat(recap, 'forcedFumbles') : 0;
  const sacks = defense ? stat(recap, 'sacks') : 0;
  const giveaways = defense
    ? 0
    : stat(recap, 'interceptions') + stat(recap, 'fumbles') + stat(recap, 'turnovers');
  const big = defense ? 0 : bestPlayYards(recap);
  const sharpReps = recap.sideline.filter(({ grade }) => grade === 'SHARP').length;
  const candidates: (ReactionView | false)[] = [
    won &&
      stakes?.opponentRank != null &&
      (stakes.playerRank === null || stakes.playerRank > stakes.opponentRank) && {
        id: 'upset',
        speaker: 'media',
        key: 'v2.react.upset',
        params: { rank: stakes.opponentRank },
      },
    won &&
      stakes?.rivalry === true && {
        id: 'rivalWin',
        speaker: 'fans',
        key: 'v2.react.rivalWin',
        params: {},
      },
    lost &&
      stakes?.rivalry === true && {
        id: 'rivalLoss',
        speaker: 'media',
        key: 'v2.react.rivalLoss',
        params: {},
      },
    touchdowns > 0 && {
      id: 'td',
      speaker: 'media',
      key: 'v2.react.touchdown',
      params: { count: touchdowns },
    },
    won &&
      rival !== undefined && {
        id: 'alumniRival',
        speaker: 'fans',
        key: 'v2.react.alumniRival',
        params: { name: rival.displayName },
      },
    won &&
      proud !== undefined && {
        id: 'alumniProud',
        speaker: 'teammate',
        key: 'v2.react.alumniProud',
        params: { name: proud.displayName },
      },
    takeaways > 0 && { id: 'takeaway', speaker: 'fans', key: 'v2.react.takeaway', params: {} },
    sacks > 0 && { id: 'sack', speaker: 'fans', key: 'v2.react.sack', params: {} },
    big >= 20 && {
      id: 'bigPlay',
      speaker: 'teammate',
      key: 'v2.react.bigPlay',
      params: { yards: big },
    },
    giveaways > 0 && { id: 'giveaway', speaker: 'coach', key: 'v2.react.giveaway', params: {} },
    lost &&
      margin <= -21 && { id: 'blowout', speaker: 'coach', key: 'v2.react.blowout', params: {} },
    recap.sideline.length > 0 &&
      sharpReps === recap.sideline.length && {
        id: 'sidelineSharp',
        speaker: 'coach',
        key: 'v2.react.sidelineSharp',
        params: {},
      },
    won &&
      recap.liveSnapCount === 0 && {
        id: 'stayReady',
        speaker: 'teammate',
        key: 'v2.react.stayReady',
        params: {},
      },
  ];
  return candidates.filter((entry): entry is ReactionView => entry !== false).slice(0, 3);
}

export const SPEAKER_KEYS = {
  coach: 'v2.react.speaker.coach',
  teammate: 'v2.react.speaker.teammate',
  media: 'v2.react.speaker.media',
  fans: 'v2.react.speaker.fans',
} as const satisfies Record<ReactionSpeaker, MessageKey>;
