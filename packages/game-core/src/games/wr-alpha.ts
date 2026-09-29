import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { PlayerId, ProgramId } from '../player/ids.js';
import {
  validatePositionAttributeProgress,
  type PositionAttributeProgress,
} from '../player/progression.js';
import type { CollectedGameHook } from '../skills/types.js';
import { ATTRIBUTE_XP_PER_RATING } from '../weekly/tuning.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import type {
  WorldAlphaFixtureMechanics,
  WorldAlphaPlayerGameResult,
} from '../season/world-alpha.js';
import {
  TACTICAL_GAME_RULES_VERSION,
  prepareTacticalAlphaSnapV1,
  resolveTacticalAlphaBackgroundV1,
  resolveTacticalFieldV1,
  type TacticalSnapResultV1,
} from './tactical-alpha-v1.js';
import type { TacticalSnapContextV1 } from './tactical-context-v1.js';
import type {
  GameClueId,
  GameCoverageId,
  GameLeverageId,
  KeySnapDecisionFamilyId,
  KeySnapDecisionId,
  KeySnapPatternId,
} from './ids.js';
import type {
  KeySnapFamilyMechanicsDefinition,
  KeySnapPatternMechanicsDefinition,
  WrGameStatLine,
} from './types.js';

/**
 * Position-generic WR kernel (Career VNext). It reuses the authored WR release/route/catch/YAC
 * families, patterns, coverage shells, leverage, clues and outcome tuning, and the shared tactical
 * field rules, in the same start/resolve/complete shape as the QB/RB/CB kernels. Current rules only.
 */
export interface WrAlphaGameStartInput {
  readonly rulesVersion: typeof TACTICAL_GAME_RULES_VERSION;
  readonly gameId: `game_wr_${string}`;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly opportunityCount: number;
  readonly playerTeamRating: number;
  readonly opponentDefenseRating: number;
  readonly opponentOffenseRating: number;
  readonly player: WrAlphaPlayerState;
  readonly families: readonly KeySnapFamilyMechanicsDefinition[];
  readonly patterns: readonly KeySnapPatternMechanicsDefinition[];
  /** Equipped WR card hooks (collected by the owning command); empty means no build. */
  readonly gameHooks?: readonly CollectedGameHook[];
  readonly rng: RngState;
}

export interface WrAlphaPlayerState {
  readonly id: PlayerId;
  readonly positionId: 'position_wr';
  readonly attributes: PositionAttributeProgress;
  readonly state: {
    readonly body: number;
    readonly preparation: number;
    readonly confidence: number;
    readonly coachTrust: number;
  };
}

export interface PendingWrAlphaSnap {
  readonly tacticalContext: TacticalSnapContextV1;
  readonly snapIndex: number;
  readonly patternId: KeySnapPatternId;
  readonly familyId: KeySnapDecisionFamilyId;
  readonly coverageId: GameCoverageId;
  readonly leverageId: GameLeverageId;
  readonly decisionIds: readonly [KeySnapDecisionId, KeySnapDecisionId, KeySnapDecisionId];
  readonly revealedClueIds: readonly GameClueId[];
  readonly informationScore: number;
}

export type WrAlphaPlayResult =
  'NOT_TARGETED' | 'INCOMPLETE' | 'DROP' | 'RECEPTION' | 'INTERCEPTION';

export interface WrAlphaSnapPlayEvidence {
  readonly tacticalResult: TacticalSnapResultV1;
  readonly snapIndex: number;
  readonly patternId: KeySnapPatternId;
  readonly familyId: KeySnapDecisionFamilyId;
  readonly coverageId: GameCoverageId;
  readonly leverageId: GameLeverageId;
  readonly decisionId: KeySnapDecisionId;
  readonly playResult: WrAlphaPlayResult;
  readonly receivingYardsDelta: number;
  readonly receivingTouchdownDelta: 0 | 1;
  readonly decisionFit: number;
  readonly finalScore: number;
  readonly appliedSkillIds: readonly string[];
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface WrAlphaAttributeGrowthEvidence {
  readonly attributeId: string;
  readonly ratingBefore: number;
  readonly xpBefore: number;
  readonly awardedXp: number;
  readonly appliedXp: number;
  readonly ratingAfter: number;
  readonly xpAfter: number;
}

export interface WrAlphaGameSummary {
  readonly rulesVersion: typeof TACTICAL_GAME_RULES_VERSION;
  readonly gameId: `game_wr_${string}`;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly playerTeamScore: number;
  readonly opponentScore: number;
  readonly resultId: 'game_result_win' | 'game_result_loss' | 'game_result_tie';
  readonly opportunityCount: number;
  readonly statLine: WrGameStatLine;
  readonly gradeScore: number;
}

export interface WrAlphaGrowthEvidence {
  readonly bodyBefore: number;
  readonly requestedBodyDelta: number;
  readonly bodyAfter: number;
  readonly confidenceBefore: number;
  readonly confidenceAfter: number;
  readonly coachTrustBefore: number;
  readonly coachTrustAfter: number;
  readonly attributeXp: readonly WrAlphaAttributeGrowthEvidence[];
}

export interface ActiveWrAlphaGame {
  readonly type: 'ACTIVE';
  readonly input: Omit<WrAlphaGameStartInput, 'families' | 'patterns' | 'rng'>;
  readonly rng: RngState;
  readonly statLine: WrGameStatLine;
  readonly keyPlayLog: readonly WrAlphaSnapPlayEvidence[];
  readonly pendingSnap: PendingWrAlphaSnap;
  readonly families: readonly KeySnapFamilyMechanicsDefinition[];
  readonly patterns: readonly KeySnapPatternMechanicsDefinition[];
}

export interface CompleteWrAlphaGame {
  readonly type: 'COMPLETE';
  readonly summary: WrAlphaGameSummary;
  readonly growth: WrAlphaGrowthEvidence;
  readonly keyPlayLog: readonly WrAlphaSnapPlayEvidence[];
  readonly nextPlayer: WrAlphaPlayerState;
  readonly rng: RngState;
}

export type WrAlphaGameState = ActiveWrAlphaGame | CompleteWrAlphaGame;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function draw(rng: RngState, minimum: number, maximum: number) {
  const sample = nextUint32(rng);
  return {
    value: minimum + Math.floor((sample.value * (maximum - minimum + 1)) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

function rating(attributes: PositionAttributeProgress, attributeId: string): number {
  return (
    (attributes as Readonly<Record<string, { readonly rating: number }>>)[attributeId]?.rating ?? 50
  );
}

function emptyStats(): WrGameStatLine {
  return {
    targets: 0,
    receptions: 0,
    receivingYards: 0,
    receivingTouchdowns: 0,
    drops: 0,
    turnovers: 0,
  };
}

type ActiveBase = Omit<ActiveWrAlphaGame, 'pendingSnap'>;

function withPendingSnap(active: ActiveBase, snapIndex: number): ActiveWrAlphaGame | undefined {
  // Deterministic rotation through the authored looks; the family follows the pattern.
  const pattern =
    active.patterns[(active.input.weekIndex * 3 + snapIndex * 5) % active.patterns.length]!;
  const family = active.families.find(({ id }) => id === pattern.familyId);
  if (family === undefined) return undefined;
  const player = active.input.player;
  const informationScore = clamp(
    Math.round(
      (rating(player.attributes, 'attribute_football_iq') * 400 +
        rating(player.attributes, 'attribute_wr_route_running') * 250 +
        player.state.preparation * 350) /
        1_000,
    ),
    0,
    100,
  );
  // Coverage-clue cards add whole clues on top of the information tier (the shipped WR rule).
  const clueBonus = (active.input.gameHooks ?? [])
    .filter(({ hookId }) => hookId === 'game_hook_coverage_clue_bonus')
    .reduce((sum, { valueMilli }) => sum + Math.trunc(valueMilli / 1_000), 0);
  const clueCount = (informationScore >= 62 ? 2 : informationScore >= 42 ? 1 : 0) + clueBonus;
  const revealedClueIds = pattern.clueIds.slice(0, clueCount);
  const prepared = prepareTacticalAlphaSnapV1({
    gameId: active.input.gameId,
    positionId: 'position_wr',
    snapIndex,
    opportunityCount: active.input.opportunityCount,
    decisionIds: family.decisionIds,
    revealedClueIds,
    score: active.keyPlayLog.at(-1)?.tacticalResult.scoreAfter ?? { playerTeam: 0, opponent: 0 },
    playerTeamRating: active.input.playerTeamRating,
    opponentDefenseRating: active.input.opponentDefenseRating,
    opponentOffenseRating: active.input.opponentOffenseRating,
    rng: active.rng,
  });
  if (prepared === undefined) return undefined;
  return {
    ...active,
    rng: prepared.rng,
    pendingSnap: {
      tacticalContext: prepared.context,
      snapIndex,
      patternId: pattern.id,
      familyId: pattern.familyId,
      coverageId: pattern.coverageId,
      leverageId: pattern.leverageId,
      decisionIds: family.decisionIds,
      revealedClueIds,
      informationScore,
    },
  };
}

function applyGrowth(active: ActiveBase, gradeScore: number) {
  const player = active.input.player;
  const attributes = cloneSerializable(player.attributes) as Record<
    string,
    { rating: number; xp: number }
  >;
  const xpByAttribute = new Map<string, number>();
  for (const play of active.keyPlayLog) {
    const family = active.families.find(({ id }) => id === play.familyId)!;
    const baseXp = 12 + Math.floor(play.decisionFit / 10);
    for (const { attributeId, weightPermille } of family.attributeWeights) {
      if (attributes[attributeId] === undefined) continue;
      xpByAttribute.set(
        attributeId,
        (xpByAttribute.get(attributeId) ?? 0) + Math.round((baseXp * weightPermille) / 1_000),
      );
    }
  }
  const attributeXp: WrAlphaAttributeGrowthEvidence[] = [];
  for (const [attributeId, awardedXp] of [...xpByAttribute.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const before = attributes[attributeId]!;
    let ratingAfter = before.rating;
    let xpAfter = before.xp + awardedXp;
    while (ratingAfter < 100 && xpAfter >= ATTRIBUTE_XP_PER_RATING) {
      ratingAfter += 1;
      xpAfter -= ATTRIBUTE_XP_PER_RATING;
    }
    if (ratingAfter === 100) xpAfter = 0;
    attributeXp.push({
      attributeId,
      ratingBefore: before.rating,
      xpBefore: before.xp,
      awardedXp,
      appliedXp: (ratingAfter - before.rating) * ATTRIBUTE_XP_PER_RATING + xpAfter - before.xp,
      ratingAfter,
      xpAfter,
    });
    attributes[attributeId] = { rating: ratingAfter, xp: xpAfter };
  }
  const requestedBodyDelta = -(2 + active.input.opportunityCount * 2);
  const bodyAfter = clamp(player.state.body + requestedBodyDelta, 0, 100);
  const bandDelta =
    gradeScore >= 85 ? 3 : gradeScore >= 70 ? 1 : gradeScore < 45 ? -3 : gradeScore < 60 ? -1 : 0;
  const confidenceAfter = clamp(player.state.confidence + bandDelta, 0, 100);
  const trustDelta =
    gradeScore >= 85 ? 4 : gradeScore >= 70 ? 2 : gradeScore < 45 ? -4 : gradeScore < 60 ? -2 : 0;
  const coachTrustAfter = clamp(player.state.coachTrust + trustDelta, 0, 100);
  return {
    growth: {
      bodyBefore: player.state.body,
      requestedBodyDelta,
      bodyAfter,
      confidenceBefore: player.state.confidence,
      confidenceAfter,
      coachTrustBefore: player.state.coachTrust,
      coachTrustAfter,
      attributeXp,
    },
    nextPlayer: {
      ...player,
      attributes: attributes as unknown as PositionAttributeProgress,
      state: {
        ...player.state,
        body: bodyAfter,
        confidence: confidenceAfter,
        coachTrust: coachTrustAfter,
      },
    },
  };
}

function completeGame(active: ActiveBase): CompleteWrAlphaGame {
  const stats = active.statLine;
  const opportunities = active.input.opportunityCount;
  const averageFit =
    active.keyPlayLog.length === 0
      ? 50
      : Math.round(
          active.keyPlayLog.reduce((sum, play) => sum + play.decisionFit, 0) /
            active.keyPlayLog.length,
        );
  const gradeScore = clamp(
    48 +
      stats.receptions * 6 +
      Math.round(stats.receivingYards / Math.max(3, opportunities * 2)) +
      stats.receivingTouchdowns * 10 -
      stats.drops * 8 -
      stats.turnovers * 12 +
      Math.round((averageFit - 50) / 4),
    0,
    100,
  );
  let score = active.keyPlayLog.at(-1)?.tacticalResult.scoreAfter ?? { playerTeam: 0, opponent: 0 };
  let rng = active.rng;
  // Remaining game plays out in the background after the athlete's last decision.
  for (let drive = 0; drive < 4; drive += 1) {
    const background = resolveTacticalAlphaBackgroundV1({
      score,
      playerTeamRating: active.input.playerTeamRating,
      opponentDefenseRating: active.input.opponentDefenseRating,
      opponentOffenseRating: active.input.opponentOffenseRating,
      rng,
    })!;
    score = background.score;
    rng = background.rng;
  }
  const resultId =
    score.playerTeam > score.opponent
      ? 'game_result_win'
      : score.playerTeam < score.opponent
        ? 'game_result_loss'
        : 'game_result_tie';
  const { growth, nextPlayer } = applyGrowth(active, gradeScore);
  return {
    type: 'COMPLETE',
    summary: {
      rulesVersion: TACTICAL_GAME_RULES_VERSION,
      gameId: active.input.gameId,
      weekIndex: active.input.weekIndex,
      playerProgramId: active.input.playerProgramId,
      opponentProgramId: active.input.opponentProgramId,
      isHome: active.input.isHome,
      playerTeamScore: score.playerTeam,
      opponentScore: score.opponent,
      resultId,
      opportunityCount: opportunities,
      statLine: stats,
      gradeScore,
    },
    growth,
    keyPlayLog: active.keyPlayLog,
    nextPlayer,
    rng,
  };
}

export type WrAlphaGameResult =
  | { readonly ok: true; readonly state: WrAlphaGameState }
  | { readonly ok: false; readonly reason: 'wr_alpha.invalid_input' | 'wr_alpha.invalid_decision' };

const invalid = (
  reason: 'wr_alpha.invalid_input' | 'wr_alpha.invalid_decision',
): WrAlphaGameResult => deepFreeze({ ok: false, reason });

export function startWrAlphaGame(input: WrAlphaGameStartInput): WrAlphaGameResult {
  if (
    input?.rulesVersion !== TACTICAL_GAME_RULES_VERSION ||
    !Number.isInteger(input.opportunityCount) ||
    input.opportunityCount < 0 ||
    input.opportunityCount > 5 ||
    input.player?.positionId !== 'position_wr' ||
    validatePositionAttributeProgress('position_wr', input.player.attributes).length > 0 ||
    !isRngState(input.rng) ||
    input.patterns.length === 0 ||
    input.families.length === 0
  )
    return invalid('wr_alpha.invalid_input');
  const { families, patterns, rng, ...rest } = input;
  const base: ActiveBase = {
    type: 'ACTIVE',
    input: rest,
    rng,
    statLine: emptyStats(),
    keyPlayLog: [],
    families: [...families].sort((a, b) => a.id.localeCompare(b.id)),
    patterns: [...patterns].sort((a, b) => a.id.localeCompare(b.id)),
  };
  const state = input.opportunityCount === 0 ? completeGame(base) : withPendingSnap(base, 0);
  return state === undefined
    ? invalid('wr_alpha.invalid_input')
    : deepFreeze({ ok: true, state: cloneSerializable(state) });
}

export function resolveWrAlphaSnap(
  active: ActiveWrAlphaGame,
  decisionId: unknown,
): WrAlphaGameResult {
  const pending = active.pendingSnap;
  const pattern = active.patterns.find(({ id }) => id === pending.patternId);
  const family = active.families.find(({ id }) => id === pending.familyId);
  const fit = pattern?.decisionFits.find((entry) => entry.decisionId === decisionId)?.fit;
  if (
    active.type !== 'ACTIVE' ||
    pattern === undefined ||
    family === undefined ||
    fit === undefined ||
    typeof decisionId !== 'string' ||
    !(pending.decisionIds as readonly string[]).includes(decisionId)
  )
    return invalid('wr_alpha.invalid_decision');
  const player = active.input.player;
  const before = active.rng.drawCount;
  const targetDraw = draw(active.rng, 0, 999);
  const turnoverDraw = draw(targetDraw.rng, 0, 999);
  const catchDraw = draw(turnoverDraw.rng, 0, 999);
  const dropDraw = draw(catchDraw.rng, 0, 999);
  const touchdownDraw = draw(dropDraw.rng, 0, 999);
  const yardDraw = draw(touchdownDraw.rng, -3, 5);
  const attributeScore = Math.round(
    family.attributeWeights.reduce(
      (sum, { attributeId, weightPermille }) =>
        sum + rating(player.attributes, attributeId) * weightPermille,
      0,
    ) / 1_000,
  );
  // Card hooks follow the shipped WR semantics: reliability always, composure on pressure snaps,
  // contested catch and tipped risk on the high-point attack, YAC and fumble risk on aggressive YAC.
  const hooks = active.input.gameHooks ?? [];
  const context = pending.tacticalContext;
  const pressureSnap =
    context.clock.period === 4 ||
    context.field.down >= 3 ||
    context.field.distanceYards >= 8 ||
    Math.abs(context.score.playerTeam - context.score.opponent) <= 8;
  const contestedHighPoint =
    family.id === 'key_snap_family_catch' && decisionId === 'key_snap_decision_attack_high_point';
  const aggressiveYac =
    family.id === 'key_snap_family_yac' && decisionId !== 'key_snap_decision_protect_ball';
  const applied = new Set<string>();
  let skillAdjustment = 0;
  for (const hook of hooks)
    if (
      hook.hookId === 'game_hook_assignment_reliability_bonus' ||
      (hook.hookId === 'game_hook_pressure_composure_bonus' && pressureSnap)
    ) {
      skillAdjustment += Math.round(hook.valueMilli / 10);
      applied.add(hook.skillId);
    }
  const finalScore = clamp(
    Math.round(
      (attributeScore * 300 +
        fit * 200 +
        (100 - active.input.opponentDefenseRating) * 200 +
        player.state.body * 80 +
        player.state.preparation * 70 +
        player.state.confidence * 50 +
        active.input.playerTeamRating * 100) /
        1_000,
    ) + skillAdjustment,
    0,
    100,
  );
  const outcome = pattern.outcome;
  const targetChance = clamp(
    outcome.baseTargetPermille + (fit - 60) * 5 + (finalScore - 50) * 3,
    80,
    950,
  );
  let turnoverRisk = clamp(
    outcome.turnoverRiskPermille + (50 - finalScore) * 2 + (60 - fit),
    0,
    450,
  );
  let catchChance = clamp(
    outcome.baseCatchPermille + (finalScore - 50) * 6 + (fit - 60) * 3,
    100,
    950,
  );
  let yacMultiplierMilli = 1_000;
  for (const hook of hooks) {
    if (contestedHighPoint && hook.hookId === 'game_hook_contested_catch_success_bonus') {
      catchChance = clamp(catchChance + hook.valueMilli, 0, 1_000);
      applied.add(hook.skillId);
    } else if (contestedHighPoint && hook.hookId === 'game_hook_tipped_turnover_risk_bonus') {
      turnoverRisk = clamp(turnoverRisk + hook.valueMilli, 0, 1_000);
      applied.add(hook.skillId);
    } else if (aggressiveYac && hook.hookId === 'game_hook_yac_yardage_multiplier') {
      yacMultiplierMilli = Math.round((yacMultiplierMilli * hook.valueMilli) / 1_000);
      applied.add(hook.skillId);
    } else if (aggressiveYac && hook.hookId === 'game_hook_fumble_risk_multiplier') {
      turnoverRisk = clamp(Math.round((turnoverRisk * hook.valueMilli) / 1_000), 0, 1_000);
      applied.add(hook.skillId);
    }
  }
  const dropRisk = clamp(
    outcome.dropRiskPermille - (rating(player.attributes, 'attribute_wr_hands') - 50) * 3,
    0,
    400,
  );
  const touchdownChance = clamp(
    outcome.touchdownChancePermille + Math.max(0, finalScore - 60) * 3,
    0,
    600,
  );
  let playResult: WrAlphaPlayResult;
  let yards = 0;
  let touchdown: 0 | 1 = 0;
  if (targetDraw.value >= targetChance) playResult = 'NOT_TARGETED';
  else if (turnoverDraw.value < turnoverRisk) playResult = 'INTERCEPTION';
  else if (catchDraw.value >= catchChance) playResult = 'INCOMPLETE';
  else if (dropDraw.value < dropRisk) playResult = 'DROP';
  else {
    playResult = 'RECEPTION';
    yards = Math.max(
      1,
      Math.round(
        ((outcome.baseReceivingYards + Math.round((finalScore - 50) / 6) + yardDraw.value) *
          yacMultiplierMilli) /
          1_000,
      ),
    );
    touchdown = touchdownDraw.value < touchdownChance ? 1 : 0;
  }
  const tacticalResult = resolveTacticalFieldV1(pending.tacticalContext, {
    decisionId: decisionId as TacticalSnapContextV1['decisionIds'][number],
    kind:
      playResult === 'RECEPTION'
        ? 'ADVANCE'
        : playResult === 'INTERCEPTION'
          ? 'INTERCEPTION'
          : playResult === 'NOT_TARGETED'
            ? 'UNTRACKED'
            : 'INCOMPLETE',
    yards: playResult === 'INTERCEPTION' ? Math.max(1, outcome.baseReceivingYards) : yards,
    touchdown: touchdown === 1,
    fumbleLost: false,
  });
  if (tacticalResult === undefined) return invalid('wr_alpha.invalid_decision');
  // Credited yards follow the physically bounded field result (a TD scores from the actual spot).
  const creditedYards =
    playResult === 'RECEPTION' ? (tacticalResult.ball.offenseYards ?? yards) : 0;
  const scored = tacticalResult.ball.outcome === 'TOUCHDOWN' ? 1 : 0;
  const play: WrAlphaSnapPlayEvidence = {
    tacticalResult,
    snapIndex: pending.snapIndex,
    patternId: pattern.id,
    familyId: pattern.familyId,
    coverageId: pattern.coverageId,
    leverageId: pattern.leverageId,
    decisionId: decisionId as KeySnapDecisionId,
    playResult,
    receivingYardsDelta: creditedYards,
    receivingTouchdownDelta: scored,
    decisionFit: fit,
    finalScore,
    appliedSkillIds: [...applied].sort(),
    rngDrawCountBefore: before,
    rngDrawCountAfter: yardDraw.rng.drawCount,
  };
  const stats = active.statLine;
  const statLine: WrGameStatLine = {
    targets: stats.targets + (playResult === 'NOT_TARGETED' ? 0 : 1),
    receptions: stats.receptions + (playResult === 'RECEPTION' ? 1 : 0),
    receivingYards: stats.receivingYards + creditedYards,
    receivingTouchdowns: stats.receivingTouchdowns + scored,
    drops: stats.drops + (playResult === 'DROP' ? 1 : 0),
    turnovers: stats.turnovers + (playResult === 'INTERCEPTION' ? 1 : 0),
  };
  const next: ActiveBase = {
    type: 'ACTIVE',
    input: active.input,
    rng: yardDraw.rng,
    statLine,
    keyPlayLog: [...active.keyPlayLog, play],
    families: active.families,
    patterns: active.patterns,
  };
  const snapIndex = pending.snapIndex + 1;
  const state =
    snapIndex >= active.input.opportunityCount
      ? completeGame(next)
      : withPendingSnap(next, snapIndex);
  return state === undefined
    ? invalid('wr_alpha.invalid_decision')
    : deepFreeze({ ok: true, state: cloneSerializable(state) });
}

export function projectWrAlphaWorldResult(
  summary: WrAlphaGameSummary,
  fixture: WorldAlphaFixtureMechanics,
): WorldAlphaPlayerGameResult | null {
  const homeProgramId = summary.isHome ? summary.playerProgramId : summary.opponentProgramId;
  if (fixture.homeProgramId !== homeProgramId) return null;
  const homeScore = summary.isHome ? summary.playerTeamScore : summary.opponentScore;
  const awayScore = summary.isHome ? summary.opponentScore : summary.playerTeamScore;
  return deepFreeze({
    model: 'player_game_alpha_v1',
    fixtureId: fixture.id,
    homeScore,
    awayScore,
    winnerProgramId:
      homeScore > awayScore
        ? fixture.homeProgramId
        : awayScore > homeScore
          ? fixture.awayProgramId
          : null,
  });
}
