import { deepFreeze } from '../player/immutable.js';
import { bestDecisionOfLook, type SnapLookDefinitionVNext } from './looks.js';
import { readQuality, type LivePlayFrame, type SnapSituationFrame } from './frames.js';
import type { CareerVNextMechanics, SidelineRepGradeVNext, VNextPositionId } from './types.js';

/**
 * M12 match feedback: every resolved live snap is explained in three independent parts, all derived
 * from the saved play evidence (never re-rolled, never invented):
 *
 * - **read** — the decision against the hidden look, calibrated to the tells the athlete saw;
 * - **execution** — whether the athlete's own action came off, with the chance the kernel actually
 *   used and the key attribute behind it;
 * - **situation** — what the down meant for the team (first down, short of the sticks, stop, …).
 *
 * The same projection ranks a game's plays for the post-game story (leverage, not raw yards), so a
 * defender's pass breakups compete with the catches he allowed.
 */

export type ReadBasisVNext =
  /** The best read for the look. */
  | 'EXACT'
  /** A sharp read that is not the look's single best answer. */
  | 'ALTERNATIVE'
  /** A solid read: workable, with a sharper option available. */
  | 'PARTIAL'
  /** Missed, but the tells the athlete saw also fit a look where this call is right. */
  | 'LIMITED'
  /** Missed against the information that was visible. */
  | 'MISREAD';

export type ExecutionVerdictVNext = 'WON' | 'LOST' | 'NEUTRAL';

/** Every execution reason the projection can name (copy must exist for each, EN and KO). */
export const EXECUTION_REASONS_VNEXT = Object.freeze([
  'qb_incomplete',
  'qb_interception',
  'qb_sack',
  'qb_sack_fumble',
  'qb_run_fumble',
  'qb_throwaway',
  'rb_stuffed',
  'rb_fumble',
  'rb_catch_fumble',
  'rb_protection_miss',
  'wr_incomplete',
  'wr_drop',
  'wr_interception',
  'wr_not_targeted',
  'cb_strip_missed',
  'cb_strip_held',
  'cb_tackle_missed',
  'cb_catch_allowed',
  'cb_touchdown_allowed',
  'def_gain_allowed',
  'def_missed_tackle',
  'def_no_play',
] as const);
export type ExecutionReasonVNext = (typeof EXECUTION_REASONS_VNEXT)[number];

/** Reasons whose recorded chance is a risk (the bad outcome's chance), not a success chance. */
export const RISK_REASONS_VNEXT: ReadonlySet<ExecutionReasonVNext> = new Set([
  'qb_interception',
  'qb_sack',
  'qb_sack_fumble',
  'qb_run_fumble',
  'rb_fumble',
  'rb_catch_fumble',
  'cb_catch_allowed',
  'cb_touchdown_allowed',
]);

export type SituationKindVNext =
  | 'TOUCHDOWN'
  | 'TURNOVER'
  | 'FIRST_DOWN'
  | 'SHORT_OF_STICKS'
  | 'NO_GAIN'
  | 'STOP'
  | 'TURNOVER_ON_DOWNS'
  | 'NO_PLAY';

export interface SnapExplanationVNext {
  readonly read: {
    readonly quality: SidelineRepGradeVNext;
    readonly basis: ReadBasisVNext;
    readonly seenTells: number;
    readonly totalTells: number;
    readonly bestDecisionId: string | null;
    /** For LIMITED: a look whose visible tells match and whose answer was this call. */
    readonly ambiguousLookNameKey: string | null;
    /** The first tell the athlete did not see (what more information would have shown). */
    readonly nextTellKey: string | null;
  };
  readonly execution: {
    readonly verdict: ExecutionVerdictVNext;
    readonly reasonId: ExecutionReasonVNext | null;
    /** The decisive chance the kernel used for this outcome, 0–1000 (null when not recorded). */
    readonly chancePermille: number | null;
    /** The kernel's decision score for the snap, 0–100 (null when not recorded). */
    readonly executionScore: number | null;
    /** The pattern's most heavily weighted attribute and the athlete's rating going in. */
    readonly attribute: { readonly attributeId: string; readonly rating: number } | null;
  };
  readonly situation: {
    readonly kind: SituationKindVNext;
    /** WON / PARTIAL / LOST from the athlete's team's point of view. */
    readonly team: 'WON' | 'PARTIAL' | 'LOST';
    readonly yards: number;
    readonly distance: number;
    readonly down: 1 | 2 | 3 | 4;
  };
  /** How much the snap mattered, 0–100: down, quarter, margin, field and outcome. */
  readonly leverage: number;
}

type Play = Readonly<Record<string, unknown>> & {
  readonly decisionId: string;
  readonly patternId: string;
  readonly familyId: string;
  readonly playResult: string;
};

const DEFENSE: ReadonlySet<string> = new Set(['position_cb', 'position_lb', 'position_edge']);

function num(record: Readonly<Record<string, unknown>> | undefined, key: string): number | null {
  const value = record?.[key];
  return typeof value === 'number' ? value : null;
}

function resolution(play: Play): Readonly<Record<string, unknown>> | undefined {
  const value = play['resolution'];
  return typeof value === 'object' && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

type PatternCatalogs = Pick<CareerVNextMechanics, 'qb' | 'rb' | 'cb' | 'defenders' | 'wr'>;

function patternWeights(
  mechanics: PatternCatalogs,
  positionId: VNextPositionId,
  patternId: string,
): readonly { readonly attributeId: string; readonly weightPermille: number }[] {
  const catalog: readonly {
    readonly id: string;
    readonly attributeWeights?: readonly {
      readonly attributeId: string;
      readonly weightPermille: number;
    }[];
  }[] =
    positionId === 'position_qb'
      ? mechanics.qb.patterns
      : positionId === 'position_rb'
        ? mechanics.rb.patterns
        : positionId === 'position_cb'
          ? mechanics.cb.patterns
          : positionId === 'position_wr'
            ? mechanics.wr.patterns
            : mechanics.defenders[positionId].patterns;
  return catalog.find(({ id }) => id === patternId)?.attributeWeights ?? [];
}

function cbDecisionMode(mechanics: PatternCatalogs, decisionId: string): string | null {
  return (
    (mechanics.cb.decisions as readonly { readonly id: string; readonly mode?: string }[]).find(
      ({ id }) => id === decisionId,
    )?.mode ?? null
  );
}

function execution(
  positionId: VNextPositionId,
  play: Play,
  frame: LivePlayFrame,
  mechanics: PatternCatalogs,
): Pick<SnapExplanationVNext['execution'], 'verdict' | 'reasonId' | 'chancePermille'> {
  const r = resolution(play);
  const result = play.playResult;
  const lost = (reasonId: ExecutionReasonVNext, chance: number | null) =>
    ({ verdict: 'LOST', reasonId, chancePermille: chance }) as const;
  const won = { verdict: 'WON', reasonId: null, chancePermille: null } as const;
  const neutral = (reasonId: ExecutionReasonVNext | null) =>
    ({ verdict: 'NEUTRAL', reasonId, chancePermille: null }) as const;
  if (positionId === 'position_qb') {
    const fumble = num(play, 'fumbleDelta') === 1;
    if (result === 'COMPLETION') return won;
    if (result === 'INCOMPLETION') return lost('qb_incomplete', num(r, 'completionChancePermille'));
    if (result === 'INTERCEPTION') return lost('qb_interception', num(r, 'turnoverRiskPermille'));
    if (result === 'SACK')
      return fumble
        ? lost('qb_sack_fumble', num(r, 'turnoverRiskPermille'))
        : lost('qb_sack', num(r, 'pressureChancePermille'));
    if (result === 'SCRAMBLE')
      return fumble ? lost('qb_run_fumble', num(r, 'turnoverRiskPermille')) : won;
    return neutral('qb_throwaway');
  }
  if (positionId === 'position_rb') {
    const fumble = num(play, 'fumbleDelta') === 1;
    if (result === 'PROTECTION_WIN') return won;
    if (result === 'PROTECTION_MISS')
      return lost('rb_protection_miss', num(r, 'successChancePermille'));
    if (fumble)
      return lost(
        result === 'RECEPTION' ? 'rb_catch_fumble' : 'rb_fumble',
        num(r, 'fumbleRiskPermille'),
      );
    if (result === 'RUSH' && frame.yards <= 0)
      return lost('rb_stuffed', num(r, 'successChancePermille'));
    return won;
  }
  if (positionId === 'position_wr') {
    if (result === 'RECEPTION') return won;
    if (result === 'NOT_TARGETED') return neutral('wr_not_targeted');
    if (result === 'DROP') return lost('wr_drop', null);
    if (result === 'INTERCEPTION') return lost('wr_interception', null);
    return lost('wr_incomplete', null);
  }
  if (positionId === 'position_cb') {
    const strip = cbDecisionMode(mechanics, play.decisionId) === 'BALL';
    if (result === 'TACKLE' && strip)
      return {
        verdict: 'WON',
        reasonId: 'cb_strip_held',
        chancePermille: num(r, 'disruptionChancePermille'),
      };
    if (['NO_TARGET', 'COVERED', 'PASS_DEFENDED', 'INTERCEPTION', 'TACKLE'].includes(result))
      return won;
    if (result === 'FORCED_FUMBLE') return won;
    if (result === 'MISSED_TACKLE')
      return strip
        ? lost('cb_strip_missed', num(r, 'takeawayChancePermille'))
        : lost('cb_tackle_missed', num(r, 'disruptionChancePermille'));
    if (num(play, 'touchdownAllowed') === 1)
      return lost('cb_touchdown_allowed', num(r, 'completionRiskPermille'));
    return lost('cb_catch_allowed', num(r, 'completionRiskPermille'));
  }
  // LB / EDGE share the front-seven vocabulary.
  if (result === 'NO_PLAY') return neutral('def_no_play');
  if (result === 'MISSED_TACKLE') return lost('def_missed_tackle', null);
  if (result === 'GAIN_ALLOWED') return lost('def_gain_allowed', null);
  return won;
}

function situationOf(
  positionId: VNextPositionId,
  play: Play,
  frame: LivePlayFrame,
  before: SnapSituationFrame,
): SnapExplanationVNext['situation'] {
  const defense = DEFENSE.has(positionId);
  const tactical = play['tacticalResult'] as
    | { readonly possessionOutcome?: string; readonly ball?: { readonly outcome?: string } }
    | undefined;
  const possession = tactical?.possessionOutcome;
  const yards = frame.yards;
  const distance = before.distanceYards;
  const down = before.down;
  const noPlay =
    frame.ballOutcome === 'UNTRACKED' ||
    ['NO_TARGET', 'NOT_TARGETED', 'NO_PLAY'].includes(frame.playResultId);
  let kind: SituationKindVNext;
  if (frame.outcome === 'TOUCHDOWN') kind = 'TOUCHDOWN';
  else if (
    frame.outcome === 'TURNOVER' ||
    possession === 'INTERCEPTION' ||
    possession === 'FUMBLE_LOST'
  )
    kind = 'TURNOVER';
  else if (noPlay) kind = 'NO_PLAY';
  else if (possession === 'TURNOVER_ON_DOWNS') kind = 'TURNOVER_ON_DOWNS';
  else if (yards >= distance) kind = 'FIRST_DOWN';
  else if (yards > 0) kind = 'SHORT_OF_STICKS';
  else kind = defense ? 'STOP' : 'NO_GAIN';
  // Team view: the athlete's side wins the down or it doesn't. Early-down gains short of the
  // sticks are "partial" on offense when they keep the series on schedule (40% of the distance).
  const onSchedule = yards >= Math.ceil(distance * 0.4);
  let team: SnapExplanationVNext['situation']['team'];
  if (defense)
    team =
      kind === 'TOUCHDOWN' || kind === 'FIRST_DOWN'
        ? 'LOST'
        : kind === 'SHORT_OF_STICKS' && down <= 2 && onSchedule
          ? 'PARTIAL'
          : kind === 'NO_PLAY'
            ? 'PARTIAL'
            : 'WON';
  else
    team =
      kind === 'TOUCHDOWN' || kind === 'FIRST_DOWN'
        ? 'WON'
        : kind === 'SHORT_OF_STICKS' && down <= 2 && onSchedule
          ? 'PARTIAL'
          : kind === 'NO_PLAY'
            ? 'PARTIAL'
            : 'LOST';
  return { kind, team, yards, distance, down };
}

/** How much a snap mattered: down, quarter, margin, field position and what it produced. */
export function snapLeverageVNext(
  positionId: VNextPositionId,
  before: SnapSituationFrame,
  situation: SnapExplanationVNext['situation'],
): number {
  const defense = DEFENSE.has(positionId);
  const margin = Math.abs(before.score.playerTeam - before.score.opponent);
  // Field position from the athlete's side: near either goal line raises the stakes.
  const goalLine =
    before.lineOfScrimmageYards >= 80 || (defense && before.lineOfScrimmageYards >= 75);
  let score = 10;
  score += before.down === 4 ? 25 : before.down === 3 ? 18 : before.down === 2 ? 6 : 0;
  score += before.period === 4 ? 14 : before.period === 3 ? 6 : 0;
  score += margin <= 8 ? 14 : margin <= 16 ? 6 : 0;
  score += goalLine ? 10 : 0;
  score +=
    situation.kind === 'TOUCHDOWN' || situation.kind === 'TURNOVER'
      ? 28
      : situation.kind === 'TURNOVER_ON_DOWNS'
        ? 24
        : (situation.kind === 'FIRST_DOWN' ||
              situation.kind === 'SHORT_OF_STICKS' ||
              situation.kind === 'STOP') &&
            before.down >= 3
          ? 14
          : Math.min(10, Math.floor(Math.abs(situation.yards) / 2));
  return Math.max(0, Math.min(100, score));
}

export interface ExplainLivePlayInputVNext {
  readonly positionId: VNextPositionId;
  /** The raw saved play from the engine's key-play log. */
  readonly play: Readonly<Record<string, unknown>>;
  readonly frame: LivePlayFrame;
  readonly before: SnapSituationFrame;
  /** Tells the athlete saw before the call. */
  readonly seenTells: number;
  /** The look the snap was played against (null when the family has no authored looks). */
  readonly look: SnapLookDefinitionVNext | null;
  /** The athlete's attribute ratings going into the game. */
  readonly attributes: Readonly<Record<string, { readonly rating: number } | undefined>>;
  readonly mechanics: PatternCatalogs & Pick<CareerVNextMechanics, 'looks'>;
}

export function explainLivePlayVNext(input: ExplainLivePlayInputVNext): SnapExplanationVNext {
  const { positionId, frame, before, look, mechanics } = input;
  const play = input.play as Play;
  const quality = readQuality(typeof play['decisionFit'] === 'number' ? play['decisionFit'] : 0);
  const best = look === null ? null : bestDecisionOfLook(look);
  const seen = look === null ? input.seenTells : Math.min(input.seenTells, look.tellKeys.length);
  // Calibrated blame (playtest report #4): a miss is "limited" when another look of the family
  // shows exactly the tells the athlete saw and makes this call the right one.
  let ambiguous: SnapLookDefinitionVNext | null = null;
  if (look !== null && quality === 'MISSED') {
    const visible = look.tellKeys.slice(0, seen);
    ambiguous =
      mechanics.looks.looks.find(
        (other) =>
          other.id !== look.id &&
          other.positionId === look.positionId &&
          other.familyId === look.familyId &&
          visible.every((tell, index) => other.tellKeys[index] === tell) &&
          bestDecisionOfLook(other) === play.decisionId,
      ) ?? null;
    if (ambiguous === null && seen === 0) ambiguous = look;
  }
  const basis: ReadBasisVNext =
    quality === 'SHARP'
      ? best === null || best === play.decisionId
        ? 'EXACT'
        : 'ALTERNATIVE'
      : quality === 'SOLID'
        ? 'PARTIAL'
        : ambiguous !== null
          ? 'LIMITED'
          : 'MISREAD';
  const weights = [...patternWeights(mechanics, positionId, play.patternId)].sort(
    (left, right) => right.weightPermille - left.weightPermille,
  );
  const key = weights[0];
  const rating = key === undefined ? undefined : input.attributes[key.attributeId]?.rating;
  const r = resolution(play);
  const situation = situationOf(positionId, play, frame, before);
  return deepFreeze({
    read: {
      quality,
      basis,
      seenTells: seen,
      totalTells: look?.tellKeys.length ?? seen,
      bestDecisionId: best,
      ambiguousLookNameKey:
        basis === 'LIMITED' && ambiguous !== null && ambiguous !== look ? ambiguous.nameKey : null,
      nextTellKey: look !== null && seen < look.tellKeys.length ? look.tellKeys[seen]! : null,
    },
    execution: {
      ...execution(positionId, play, frame, mechanics),
      executionScore: num(r, 'finalScore') ?? num(play, 'finalScore'),
      attribute:
        key === undefined || rating === undefined ? null : { attributeId: key.attributeId, rating },
    },
    situation,
    leverage: snapLeverageVNext(positionId, before, situation),
  });
}

export interface GameHighlightsVNext {
  /** A play where the athlete's action came off and the down was not lost, by leverage. */
  readonly playOfGame: number | null;
  /** When nothing went the athlete's way: the play that mattered most. */
  readonly turningPoint: number | null;
  /** Up to three plays by leverage, always including the best positive play when one exists. */
  readonly defining: readonly number[];
}

/**
 * The post-game story's picks (regression P9). Ranking is by leverage, not raw yards, and positive
 * plays (a breakup, a stop short of the sticks) are always eligible, so a defender's good snaps are
 * credited in a comfortable win.
 */
export function selectGameHighlightsVNext(
  explanations: readonly SnapExplanationVNext[],
): GameHighlightsVNext {
  // A highlight needs the athlete's action to come off and the down not to be lost: a 5-yard
  // scramble on 3rd & 14 "worked" for nobody (regression report).
  const positive = (entry: SnapExplanationVNext) =>
    entry.execution.verdict === 'WON' && entry.situation.team !== 'LOST';
  const order = explanations
    .map((entry, index) => ({ entry, index }))
    .sort(
      (left, right) =>
        right.entry.leverage - left.entry.leverage ||
        Number(positive(right.entry)) - Number(positive(left.entry)) ||
        left.index - right.index,
    );
  const bestPositive = order.find(({ entry }) => positive(entry)) ?? null;
  const defining = order.slice(0, 3).map(({ index }) => index);
  if (bestPositive !== null && !defining.includes(bestPositive.index)) {
    defining.pop();
    defining.push(bestPositive.index);
  }
  return deepFreeze({
    playOfGame: bestPositive?.index ?? null,
    turningPoint: bestPositive === null ? (order[0]?.index ?? null) : null,
    defining: [...defining].sort((left, right) => left - right),
  });
}
