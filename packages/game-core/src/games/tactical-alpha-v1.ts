import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import {
  copyTacticalSnapContextV1,
  isTacticalSnapContextV1,
  type TacticalSnapContextV1,
} from './tactical-context-v1.js';

export const TACTICAL_GAME_RULES_VERSION = 'tactical_game_v1' as const;
export const TACTICAL_ALPHA_TUNING = Object.freeze({
  touchdownPermille: 250,
  fieldGoalPermille: 150,
  ratingEdgePermillePerPoint: 5,
  maximumRatingEdgePermille: 200,
  minimumLineYards: 10,
  maximumLineYards: 90,
  maximumDistanceYards: 15,
  sackLossYards: 5,
});

type Score = TacticalSnapContextV1['score'];
interface BackgroundInput {
  readonly score: Score;
  readonly playerTeamRating: number;
  readonly opponentDefenseRating: number;
  readonly opponentOffenseRating: number;
  readonly rng: RngState;
}
interface TacticalAlphaSnapInputV1 extends BackgroundInput {
  readonly gameId: TacticalSnapContextV1['gameId'];
  readonly positionId: 'position_qb' | 'position_rb' | 'position_cb';
  readonly snapIndex: number;
  readonly opportunityCount: number;
  readonly decisionIds: TacticalSnapContextV1['decisionIds'];
  readonly revealedClueIds: TacticalSnapContextV1['revealedClueIds'];
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function draw(rng: RngState, minimum: number, maximum: number) {
  const sample = nextUint32(rng);
  return {
    value: minimum + Math.floor((sample.value * (maximum - minimum + 1)) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

function backgroundInputValid(input: BackgroundInput, draws: number): boolean {
  return (
    isRngState(input.rng) &&
    input.rng.drawCount <= Number.MAX_SAFE_INTEGER - draws &&
    integer(input.score?.playerTeam, 0, 193) &&
    integer(input.score.opponent, 0, 193) &&
    integer(input.playerTeamRating, 0, 100) &&
    integer(input.opponentDefenseRating, 0, 100) &&
    integer(input.opponentOffenseRating, 0, 100)
  );
}

/** Owning-core background possession, never a player statistic or a world-RNG draw. */
function backgroundPoints(roll: number, attack: number, defense: number): 0 | 3 | 7 {
  const tuning = TACTICAL_ALPHA_TUNING;
  const edge = Math.max(
    -tuning.maximumRatingEdgePermille,
    Math.min(
      tuning.maximumRatingEdgePermille,
      (attack - defense) * tuning.ratingEdgePermillePerPoint,
    ),
  );
  const touchdown = tuning.touchdownPermille + edge;
  return roll < touchdown ? 7 : roll < touchdown + tuning.fieldGoalPermille ? 3 : 0;
}

export function resolveTacticalAlphaBackgroundV1(
  input: BackgroundInput,
): { readonly score: Score; readonly rng: RngState } | undefined {
  if (!backgroundInputValid(input, 2)) return undefined;
  const player = draw(input.rng, 0, 999);
  const opponent = draw(player.rng, 0, 999);
  return deepFreeze({
    score: {
      playerTeam:
        input.score.playerTeam +
        backgroundPoints(player.value, input.playerTeamRating, input.opponentDefenseRating),
      opponent:
        input.score.opponent +
        backgroundPoints(opponent.value, input.opponentOffenseRating, input.playerTeamRating),
    },
    rng: opponent.rng,
  });
}

/** Two background draws then line/down/distance: all happen before the choice's six draws. */
export function prepareTacticalAlphaSnapV1(
  input: TacticalAlphaSnapInputV1,
): { readonly context: TacticalSnapContextV1; readonly rng: RngState } | undefined {
  if (
    !backgroundInputValid(input, 5) ||
    !integer(input.opportunityCount, 1, 5) ||
    !integer(input.snapIndex, 0, input.opportunityCount - 1) ||
    !['position_qb', 'position_rb', 'position_cb'].includes(input.positionId)
  )
    return undefined;
  const elapsedSeconds = Math.floor((3600 * (input.snapIndex + 1)) / (input.opportunityCount + 1));
  const period = (Math.floor(elapsedSeconds / 900) + 1) as 1 | 2 | 3 | 4;
  const background = resolveTacticalAlphaBackgroundV1(input)!;
  const line = draw(
    background.rng,
    TACTICAL_ALPHA_TUNING.minimumLineYards,
    TACTICAL_ALPHA_TUNING.maximumLineYards,
  );
  const down = draw(line.rng, 1, 4);
  const distance = draw(down.rng, 1, TACTICAL_ALPHA_TUNING.maximumDistanceYards);
  const context = copyTacticalSnapContextV1({
    model: 'tactical_snap_context_v1',
    gameId: input.gameId,
    positionId: input.positionId,
    snapIndex: input.snapIndex,
    clock: { period, secondsRemaining: 900 - (elapsedSeconds % 900) },
    field: {
      offense: input.positionId === 'position_cb' ? 'OPPONENT' : 'PLAYER',
      driveIndex: input.snapIndex * 3 + 2,
      down: down.value,
      distanceYards: Math.min(distance.value, 100 - line.value),
      lineOfScrimmageYards: line.value,
    },
    score: background.score,
    decisionIds: input.decisionIds,
    revealedClueIds: input.revealedClueIds,
  });
  return context === undefined ? undefined : deepFreeze({ context, rng: distance.rng });
}

export interface TacticalSnapResultV1 {
  readonly model: 'tactical_snap_result_v1';
  readonly before: TacticalSnapContextV1;
  readonly decisionId: TacticalSnapContextV1['decisionIds'][number];
  /** Dead-ball/turnover spot, not a claim of tracked catch or defender coordinates. */
  readonly ball: {
    readonly endLineYards: number | null;
    readonly offenseYards: number | null;
    readonly outcome:
      | 'STOPPED'
      | 'TOUCHDOWN'
      | 'FUMBLE_LOST'
      | 'SACK'
      | 'INCOMPLETE'
      | 'INTERCEPTION'
      | 'UNTRACKED';
  };
  readonly possessionOutcome:
    'RETAINED' | 'TURNOVER_ON_DOWNS' | 'FUMBLE_LOST' | 'INTERCEPTION' | 'SCORE' | 'UNTRACKED';
  readonly possessionAfter: 'PLAYER' | 'OPPONENT' | 'KICKOFF' | null;
  readonly scoreAfter: Score;
}

export interface TacticalFieldRequestV1 {
  readonly decisionId: TacticalSnapContextV1['decisionIds'][number];
  readonly kind: 'ADVANCE' | 'SACK' | 'INCOMPLETE' | 'INTERCEPTION' | 'UNTRACKED';
  readonly yards: number;
  readonly touchdown: boolean;
  readonly fumbleLost: boolean;
}

/** Versioned owning-engine rule: call before adding position statistics, never from React. */
export function resolveTacticalFieldV1(
  context: TacticalSnapContextV1,
  request: TacticalFieldRequestV1,
): TacticalSnapResultV1 | undefined {
  if (
    !isTacticalSnapContextV1(context) ||
    !context.decisionIds.includes(request.decisionId) ||
    !integer(request.yards, 0, 100) ||
    typeof request.touchdown !== 'boolean' ||
    typeof request.fumbleLost !== 'boolean' ||
    !['ADVANCE', 'SACK', 'INCOMPLETE', 'INTERCEPTION', 'UNTRACKED'].includes(request.kind) ||
    (request.kind !== 'ADVANCE' && request.touchdown) ||
    (request.kind !== 'ADVANCE' && request.kind !== 'SACK' && request.fumbleLost)
  )
    return undefined;
  const field = context.field;
  const other = field.offense === 'PLAYER' ? 'OPPONENT' : 'PLAYER';
  const touchdown = request.kind === 'ADVANCE' && request.touchdown && !request.fumbleLost;
  const yards =
    request.kind === 'ADVANCE'
      ? touchdown
        ? 100 - field.lineOfScrimmageYards
        : Math.min(request.yards, 99 - field.lineOfScrimmageYards)
      : request.kind === 'SACK'
        ? -Math.min(TACTICAL_ALPHA_TUNING.sackLossYards, field.lineOfScrimmageYards - 1)
        : 0;
  const untracked = request.kind === 'UNTRACKED';
  const interception = request.kind === 'INTERCEPTION';
  const turnoverOnDowns =
    !untracked &&
    !touchdown &&
    !request.fumbleLost &&
    !interception &&
    field.down === 4 &&
    yards < field.distanceYards;
  const outcome = untracked
    ? 'UNTRACKED'
    : request.fumbleLost
      ? 'FUMBLE_LOST'
      : touchdown
        ? 'TOUCHDOWN'
        : request.kind === 'ADVANCE'
          ? 'STOPPED'
          : request.kind;
  const scoreAfter = {
    playerTeam: context.score.playerTeam + (touchdown && field.offense === 'PLAYER' ? 7 : 0),
    opponent: context.score.opponent + (touchdown && field.offense === 'OPPONENT' ? 7 : 0),
  };
  if (scoreAfter.playerTeam > 200 || scoreAfter.opponent > 200) return undefined;
  return deepFreeze({
    model: 'tactical_snap_result_v1',
    before: cloneSerializable(context),
    decisionId: request.decisionId,
    ball: {
      endLineYards: untracked
        ? null
        : interception
          ? Math.min(99, field.lineOfScrimmageYards + request.yards)
          : field.lineOfScrimmageYards + yards,
      offenseYards: untracked ? null : yards,
      outcome,
    },
    possessionOutcome: untracked
      ? 'UNTRACKED'
      : touchdown
        ? 'SCORE'
        : request.fumbleLost
          ? 'FUMBLE_LOST'
          : interception
            ? 'INTERCEPTION'
            : turnoverOnDowns
              ? 'TURNOVER_ON_DOWNS'
              : 'RETAINED',
    possessionAfter: untracked
      ? null
      : touchdown
        ? 'KICKOFF'
        : request.fumbleLost || interception || turnoverOnDowns
          ? other
          : field.offense,
    scoreAfter,
  });
}
