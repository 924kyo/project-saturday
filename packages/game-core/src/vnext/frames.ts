import { deepFreeze } from '../player/immutable.js';
import type { TacticalSnapContextV1 } from '../games/tactical-context-v1.js';
import type { TacticalSnapResultV1 } from '../games/tactical-alpha-v1.js';
import type {
  CareerVNext,
  GameDayVNext,
  SidelineRepGradeVNext,
  SidelineRepVNext,
  VNextGameState,
  VNextPositionId,
} from './types.js';

/**
 * Board frames are semantic football facts, not pixels. They come only from saved engine evidence
 * and never draw RNG; the renderer turns them into original schematic geometry.
 */
export interface SnapSituationFrame {
  readonly period: 1 | 2 | 3 | 4;
  readonly secondsRemaining: number;
  readonly offense: 'PLAYER' | 'OPPONENT';
  readonly down: 1 | 2 | 3 | 4;
  readonly distanceYards: number;
  /** 0–100 toward the offense's goal line. */
  readonly lineOfScrimmageYards: number;
  readonly firstDownYards: number;
  readonly score: { readonly playerTeam: number; readonly opponent: number };
}

export type PlayOutcomeKindVNext = 'GAIN' | 'SHORT' | 'TOUCHDOWN' | 'TURNOVER' | 'STOP' | 'NEUTRAL';

export interface LivePlayFrame {
  readonly decisionId: string;
  /** Position-owned result id (e.g. COMPLETION, RUSH, PASS_DEFENDED). */
  readonly playResultId: string;
  readonly outcome: PlayOutcomeKindVNext;
  /** Primary yards for the athlete's role (passing/rushing gained, or allowed for CB). */
  readonly yards: number;
  readonly ballEndYards: number | null;
  readonly ballOutcome: TacticalSnapResultV1['ball']['outcome'];
  readonly scoreAfter: { readonly playerTeam: number; readonly opponent: number };
  readonly appliedSkillIds: readonly string[];
  /** Post-snap qualitative read feedback from the saved decision fit; never shown before choice. */
  readonly readQuality: SidelineRepGradeVNext;
}

/** Same bands as sideline grading: authored best reads sit around 85–95, weak ones below 65. */
export function readQuality(fit: number): SidelineRepGradeVNext {
  return fit >= 85 ? 'SHARP' : fit >= 65 ? 'SOLID' : 'MISSED';
}

export type SnapBoardFrame =
  | {
      readonly kind: 'LIVE';
      readonly positionId: VNextPositionId;
      readonly snapNumber: number;
      readonly snapTotal: number;
      readonly patternId: string;
      readonly familyId: string;
      readonly decisionIds: readonly string[];
      readonly revealedClueIds: readonly string[];
      readonly situation: SnapSituationFrame;
      /** Points both teams scored in the background since the athlete's previous live snap. */
      readonly meanwhile: { readonly playerTeam: number; readonly opponent: number };
      /** Authored defensive look when the owning content records it (WR coverage/leverage). */
      readonly look: { readonly coverageId: string; readonly leverageId: string } | null;
      readonly result: LivePlayFrame | null;
    }
  | {
      readonly kind: 'SIDELINE';
      readonly positionId: VNextPositionId;
      readonly repNumber: number;
      readonly repTotal: number;
      readonly period: 1 | 2 | 3 | 4;
      readonly patternId: string;
      readonly familyId: string;
      readonly decisionIds: readonly string[];
      readonly revealedClueIds: readonly string[];
      readonly result: {
        readonly decisionId: string;
        readonly grade: SidelineRepGradeVNext;
        readonly bestDecisionId: string;
      } | null;
    };

function situation(context: TacticalSnapContextV1): SnapSituationFrame {
  return {
    period: context.clock.period,
    secondsRemaining: context.clock.secondsRemaining,
    offense: context.field.offense,
    down: context.field.down,
    distanceYards: context.field.distanceYards,
    lineOfScrimmageYards: context.field.lineOfScrimmageYards,
    firstDownYards: Math.min(100, context.field.lineOfScrimmageYards + context.field.distanceYards),
    score: context.score,
  };
}

type AnyPlay = {
  readonly tacticalResult?: TacticalSnapResultV1;
  readonly decisionId: string;
  readonly playResult: string;
  readonly appliedSkillIds?: readonly string[];
} & Record<string, unknown>;

function num(play: AnyPlay, key: string): number {
  const value = play[key];
  return typeof value === 'number' ? value : 0;
}

export function livePlayFrame(positionId: VNextPositionId, play: AnyPlay): LivePlayFrame | null {
  const tactical = play.tacticalResult;
  if (tactical === undefined) return null;
  let yards: number;
  let touchdown: boolean;
  let turnover: boolean;
  let stop = false;
  if (positionId === 'position_qb') {
    yards = num(play, 'passingYardsDelta') + num(play, 'rushingYardsDelta');
    touchdown = num(play, 'passingTouchdownDelta') + num(play, 'rushingTouchdownDelta') > 0;
    turnover = num(play, 'interceptionDelta') + num(play, 'fumbleDelta') > 0;
  } else if (positionId === 'position_wr') {
    yards = num(play, 'receivingYardsDelta');
    touchdown = num(play, 'receivingTouchdownDelta') > 0;
    turnover = play.playResult === 'INTERCEPTION';
  } else if (positionId === 'position_rb') {
    yards = num(play, 'yardsDelta');
    touchdown = num(play, 'touchdownDelta') > 0;
    turnover = num(play, 'fumbleDelta') > 0;
  } else {
    // Defensive success is a stop or takeaway; allowed yards are the opponent's gain.
    yards = num(play, 'yardsAllowed');
    touchdown = num(play, 'touchdownAllowed') > 0;
    turnover = num(play, 'interception') > 0;
    stop = ['COVERED', 'PASS_DEFENDED', 'TACKLE', 'NO_TARGET'].includes(play.playResult);
  }
  const outcome: PlayOutcomeKindVNext =
    positionId === 'position_cb'
      ? turnover
        ? 'TURNOVER'
        : touchdown
          ? 'TOUCHDOWN'
          : stop
            ? 'STOP'
            : yards >= 10
              ? 'GAIN'
              : 'NEUTRAL'
      : touchdown
        ? 'TOUCHDOWN'
        : turnover
          ? 'TURNOVER'
          : yards >= 8
            ? 'GAIN'
            : yards > 0
              ? 'SHORT'
              : play.playResult === 'NOT_TARGETED'
                ? 'NEUTRAL'
                : 'STOP';
  return {
    decisionId: play.decisionId,
    playResultId: play.playResult,
    outcome,
    yards,
    ballEndYards: tactical.ball.endLineYards,
    ballOutcome: tactical.ball.outcome,
    scoreAfter: tactical.scoreAfter,
    appliedSkillIds: play.appliedSkillIds ?? [],
    readQuality: readQuality(num(play, 'decisionFit')),
  };
}

function meanwhile(
  log: readonly AnyPlay[],
  snapIndex: number,
  score: { readonly playerTeam: number; readonly opponent: number },
) {
  const previous = snapIndex > 0 ? log[snapIndex - 1]?.tacticalResult?.scoreAfter : undefined;
  const base = previous ?? { playerTeam: 0, opponent: 0 };
  return {
    playerTeam: Math.max(0, score.playerTeam - base.playerTeam),
    opponent: Math.max(0, score.opponent - base.opponent),
  };
}

function lookOf(source: unknown): { coverageId: string; leverageId: string } | null {
  const record = source as { coverageId?: unknown; leverageId?: unknown };
  return typeof record.coverageId === 'string' && typeof record.leverageId === 'string'
    ? { coverageId: record.coverageId, leverageId: record.leverageId }
    : null;
}

function plays(engine: VNextGameState): readonly AnyPlay[] {
  return engine.game.keyPlayLog as unknown as readonly AnyPlay[];
}

function sidelineFrame(
  positionId: VNextPositionId,
  rep: SidelineRepVNext,
  total: number,
): SnapBoardFrame {
  return {
    kind: 'SIDELINE',
    positionId,
    repNumber: rep.repIndex + 1,
    repTotal: total,
    period: rep.period,
    patternId: rep.patternId,
    familyId: rep.familyId,
    decisionIds: rep.decisionIds,
    revealedClueIds: rep.revealedClueIds,
    result:
      rep.chosenDecisionId === null || rep.grade === null
        ? null
        : {
            decisionId: rep.chosenDecisionId,
            grade: rep.grade,
            bestDecisionId: rep.bestDecisionId,
          },
  };
}

/** Frame for the current Saturday slot: pending decision in SNAP, saved outcome in RESULT. */
export function projectSnapBoardFrame(career: CareerVNext): SnapBoardFrame | null {
  if (career.flow.type !== 'GAME') return null;
  const game: GameDayVNext = career.flow.game;
  if ((game.stage !== 'SNAP' && game.stage !== 'RESULT') || game.engine === null) return null;
  const slot = game.slots[game.cursor];
  if (slot === undefined) return null;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  if (slot.kind === 'SIDELINE') {
    const rep = game.sideline[slot.repIndex];
    return rep === undefined
      ? null
      : deepFreeze(sidelineFrame(positionId, rep, game.sideline.length));
  }
  const liveTotal = game.slots.filter(({ kind }) => kind === 'LIVE').length;
  const log = plays(game.engine);
  if (game.stage === 'SNAP') {
    if (game.engine.game.type !== 'ACTIVE') return null;
    const pending = game.engine.game.pendingSnap as unknown as {
      tacticalContext?: TacticalSnapContextV1;
      patternId: string;
      familyId: string;
      decisionIds: readonly string[];
      revealedClueIds: readonly string[];
    };
    if (pending.tacticalContext === undefined) return null;
    return deepFreeze({
      kind: 'LIVE',
      positionId,
      snapNumber: slot.snapIndex + 1,
      snapTotal: liveTotal,
      patternId: pending.patternId,
      familyId: pending.familyId,
      decisionIds: pending.decisionIds,
      revealedClueIds: pending.revealedClueIds,
      situation: situation(pending.tacticalContext),
      meanwhile: meanwhile(log, slot.snapIndex, pending.tacticalContext.score),
      look: lookOf(pending),
      result: null,
    });
  }
  const play = log[slot.snapIndex] as
    (AnyPlay & { patternId: string; familyId: string }) | undefined;
  if (play?.tacticalResult === undefined) return null;
  const before = play.tacticalResult.before;
  return deepFreeze({
    kind: 'LIVE',
    positionId,
    snapNumber: slot.snapIndex + 1,
    snapTotal: liveTotal,
    patternId: play.patternId,
    familyId: play.familyId,
    decisionIds: before.decisionIds,
    revealedClueIds: before.revealedClueIds,
    situation: situation(before),
    meanwhile: meanwhile(log, slot.snapIndex, before.score),
    look: lookOf(play),
    result: livePlayFrame(positionId, play),
  });
}

/** Completed live plays in order, for post-game defining plays and replays. */
export function projectCompletedPlayFrames(
  positionId: VNextPositionId,
  engine: VNextGameState,
): readonly {
  readonly situation: SnapSituationFrame;
  readonly result: LivePlayFrame;
  readonly patternId: string;
}[] {
  return deepFreeze(
    plays(engine).flatMap((play) => {
      const result = livePlayFrame(positionId, play);
      const tactical = play.tacticalResult;
      return result === null || tactical === undefined
        ? []
        : [{ situation: situation(tactical.before), result, patternId: String(play['patternId']) }];
    }),
  );
}
