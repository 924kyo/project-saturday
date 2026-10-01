import { deepFreeze } from '../player/immutable.js';
import type { TacticalSnapContextV1 } from '../games/tactical-context-v1.js';
import type { TacticalSnapResultV1 } from '../games/tactical-alpha-v1.js';
import {
  bestDecisionOfLook,
  snapLookVNext,
  type SnapLookDefinitionVNext,
  type SnapLookMove,
  type SnapLookSlotVNext,
  type SnapLookStance,
} from './looks.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
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

/**
 * The hidden look as the athlete can read it: before the snap only the tells their preparation
 * earned and the movements those tells expose; after the result, the whole picture and the answer.
 */
export interface SnapLookFrameVNext {
  readonly lookId: string;
  readonly familyNameKey: string;
  readonly familyPromptKey: string;
  readonly stance: SnapLookStance;
  readonly tellKeys: readonly string[];
  readonly moves: readonly SnapLookMove[];
  /** Present only once the snap is resolved. */
  readonly reveal: {
    readonly nameKey: string;
    readonly bestDecisionId: string;
    readonly allTellKeys: readonly string[];
  } | null;
}

function lookFrame(
  look: SnapLookDefinitionVNext,
  mechanics: Pick<CareerVNextMechanics, 'looks'>,
  shown: number,
  resolved: boolean,
): SnapLookFrameVNext {
  const family = mechanics.looks.families[look.familyId];
  const count = resolved ? look.tellKeys.length : Math.max(0, Math.min(3, shown));
  return {
    lookId: look.id,
    familyNameKey: family?.nameKey ?? look.nameKey,
    familyPromptKey: family?.promptKey ?? look.nameKey,
    stance: look.stance,
    tellKeys: look.tellKeys.slice(0, count),
    moves: look.moves.filter(({ reveal }) => resolved || reveal <= count),
    reveal: resolved
      ? {
          nameKey: look.nameKey,
          bestDecisionId: bestDecisionOfLook(look),
          allTellKeys: look.tellKeys,
        }
      : null,
  };
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
      /** The hidden look (M11), or null for content without authored looks. */
      readonly look: SnapLookFrameVNext | null;
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
      readonly look: SnapLookFrameVNext | null;
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
  } else if (positionId === 'position_lb' || positionId === 'position_edge') {
    // Front-seven success: a stop, a loss, a sack, pressure or a takeaway.
    yards = num(play, 'yardsAllowed');
    touchdown = num(play, 'touchdownAllowed') > 0;
    turnover = ['INTERCEPTION', 'FORCED_FUMBLE'].includes(play.playResult);
    stop = ['STOP', 'LOSS', 'SACK', 'PRESSURE', 'PASS_DEFENDED', 'NO_PLAY'].includes(
      play.playResult,
    );
  } else {
    // Defensive success is a stop or takeaway; allowed yards are the opponent's gain.
    yards = num(play, 'yardsAllowed');
    touchdown = num(play, 'touchdownAllowed') > 0;
    turnover = num(play, 'interception') > 0 || play.playResult === 'FORCED_FUMBLE';
    stop = ['COVERED', 'PASS_DEFENDED', 'TACKLE', 'NO_TARGET'].includes(play.playResult);
  }
  const defense =
    positionId === 'position_cb' || positionId === 'position_lb' || positionId === 'position_edge';
  const outcome: PlayOutcomeKindVNext = defense
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

function plays(engine: VNextGameState): readonly AnyPlay[] {
  return engine.game.keyPlayLog as unknown as readonly AnyPlay[];
}

/** What a read is worth to the staff, whatever the play then did. */
export const READ_GRADE_POINTS_VNEXT = Object.freeze({ SHARP: 90, SOLID: 65, MISSED: 30 });

/** The mean read grade of a game's live snaps (null without live snaps). */
export function liveReadScoreVNext(engine: VNextGameState): number | null {
  const log = plays(engine);
  if (log.length === 0) return null;
  const total = log.reduce(
    (sum, play) => sum + READ_GRADE_POINTS_VNEXT[readQuality(num(play, 'decisionFit'))],
    0,
  );
  return total / log.length;
}

function sidelineFrame(
  positionId: VNextPositionId,
  rep: SidelineRepVNext,
  total: number,
  look: SnapLookFrameVNext | null,
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
    look,
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
export function projectSnapBoardFrame(
  career: CareerVNext,
  mechanics: Pick<CareerVNextMechanics, 'looks'>,
): SnapBoardFrame | null {
  if (career.flow.type !== 'GAME') return null;
  const game: GameDayVNext = career.flow.game;
  if ((game.stage !== 'SNAP' && game.stage !== 'RESULT') || game.engine === null) return null;
  const slot = game.slots[game.cursor];
  if (slot === undefined) return null;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  if (slot.kind === 'SIDELINE') {
    const rep = game.sideline[slot.repIndex];
    if (rep === undefined) return null;
    const look = snapLookVNext(career, game.weekIndex, slot, rep.familyId, mechanics);
    return deepFreeze(
      sidelineFrame(
        positionId,
        rep,
        game.sideline.length,
        look === null
          ? null
          : lookFrame(look, mechanics, rep.revealedClueIds.length, rep.chosenDecisionId !== null),
      ),
    );
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
    const look = snapLookVNext(career, game.weekIndex, slot, pending.familyId, mechanics);
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
      look:
        look === null ? null : lookFrame(look, mechanics, pending.revealedClueIds.length, false),
      result: null,
    });
  }
  const play = log[slot.snapIndex] as
    (AnyPlay & { patternId: string; familyId: string }) | undefined;
  if (play?.tacticalResult === undefined) return null;
  const before = play.tacticalResult.before;
  const look = snapLookVNext(career, game.weekIndex, slot, play.familyId, mechanics);
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
    look: look === null ? null : lookFrame(look, mechanics, before.revealedClueIds.length, true),
    result: livePlayFrame(positionId, play),
  });
}

/** Completed live plays in order, for post-game defining plays and replays. */
export function projectCompletedPlayFrames(
  positionId: VNextPositionId,
  engine: VNextGameState,
  /** When given, each play names the hidden look it was played against (M11). */
  looks?: {
    readonly career: Pick<CareerVNext, 'seed' | 'season' | 'athlete'>;
    readonly weekIndex: number;
    readonly mechanics: Pick<CareerVNextMechanics, 'looks'>;
  },
): readonly {
  readonly situation: SnapSituationFrame;
  readonly result: LivePlayFrame;
  readonly patternId: string;
  readonly lookNameKey: string | null;
  /** The look's answer (Play Review); null without looks. */
  readonly bestDecisionId: string | null;
}[] {
  return deepFreeze(
    plays(engine).flatMap((play, snapIndex) => {
      const result = livePlayFrame(positionId, play);
      const tactical = play.tacticalResult;
      if (result === null || tactical === undefined) return [];
      const slot: SnapLookSlotVNext = { kind: 'LIVE', snapIndex };
      const look =
        looks === undefined
          ? null
          : snapLookVNext(
              looks.career,
              looks.weekIndex,
              slot,
              String(play['familyId']),
              looks.mechanics,
            );
      return [
        {
          situation: situation(tactical.before),
          result,
          patternId: String(play['patternId']),
          lookNameKey: look?.nameKey ?? null,
          bestDecisionId: look === null ? null : bestDecisionOfLook(look),
        },
      ];
    }),
  );
}
