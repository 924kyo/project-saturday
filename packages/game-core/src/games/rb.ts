import {
  prepareTacticalAlphaSnapV1,
  resolveTacticalAlphaBackgroundV1,
  resolveTacticalFieldV1,
  SCENE_RULES_V2_TUNING,
  sceneRulesAt,
  TACTICAL_GAME_RULES_VERSION,
  type SceneRulesVersion,
  type TacticalSnapResultV1,
} from './tactical-alpha-v1.js';
import { matchesTacticalSnapContextV1, type TacticalSnapContextV1 } from './tactical-context-v1.js';
import {
  BODY_BOUNDS,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  isIntegerWithinBounds,
} from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import {
  isPlayerId,
  isProgramId,
  type MultiPositionAttributeId,
  type PlayerId,
  type ProgramId,
} from '../player/ids.js';
import {
  validatePositionAttributeProgress,
  type PositionAttributeProgress,
} from '../player/progression.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import type {
  WorldAlphaFixtureMechanics,
  WorldAlphaPlayerGameResult,
} from '../season/world-alpha.js';
import {
  isSkillFamilyId,
  isSkillGradeId,
  isSkillId,
  type SkillFamilyId,
  type SkillGradeId,
  type SkillId,
} from '../skills/ids.js';
import { ATTRIBUTE_XP_PER_RATING } from '../weekly/tuning.js';

export const RB_DECISION_FAMILY_IDS = Object.freeze([
  'key_snap_family_rb_track',
  'key_snap_family_rb_contact',
  'key_snap_family_rb_protection',
  'key_snap_family_rb_receiving',
] as const);

export const RB_SKILL_EFFECT_TYPES = Object.freeze([
  'rb_information_clue_bonus',
  'rb_decision_score_flat',
  'rb_fumble_risk_delta_permille',
  'rb_explosive_chance_delta_permille',
  'rb_protection_score_flat',
  'rb_body_cost_reduction',
  'rb_confidence_loss_reduction',
  'rb_xp_multiplier_permille',
  'rb_grade_bonus',
  'rb_event_choice_unlock',
  'rb_event_positive_multiplier_permille',
] as const);

export type RbDecisionFamilyId = (typeof RB_DECISION_FAMILY_IDS)[number];
export type RbDecisionId = `key_snap_decision_rb_${string}`;
export type RbPatternId = `key_snap_pattern_rb_${string}`;
export type RbClueId = `game_clue_rb_${string}`;
export type RbSkillEffectType = (typeof RB_SKILL_EFFECT_TYPES)[number];

export interface RbDecisionDefinition {
  readonly id: RbDecisionId;
  readonly familyId: RbDecisionFamilyId;
  readonly playMode: 'RUSH' | 'RECEPTION' | 'PROTECTION';
  readonly successModifierPermille: number;
  readonly fumbleRiskModifierPermille: number;
  readonly bodyExposure: number;
  readonly yardModifier: number;
}

export interface RbPatternDefinition {
  readonly id: RbPatternId;
  readonly familyId: RbDecisionFamilyId;
  readonly clueIds: readonly [RbClueId, RbClueId, RbClueId];
  readonly decisionFits: readonly [
    { readonly decisionId: RbDecisionId; readonly fit: number },
    { readonly decisionId: RbDecisionId; readonly fit: number },
    { readonly decisionId: RbDecisionId; readonly fit: number },
  ];
  readonly attributeWeights: readonly [
    { readonly attributeId: MultiPositionAttributeId; readonly weightPermille: number },
    { readonly attributeId: MultiPositionAttributeId; readonly weightPermille: number },
  ];
  readonly contactPermille: number;
  readonly baseSuccessPermille: number;
  readonly baseFumbleRiskPermille: number;
  readonly explosiveChancePermille: number;
  readonly touchdownChancePermille: number;
  readonly baseYards: number;
}

export interface RbSkillEffect {
  readonly type: RbSkillEffectType;
  readonly value: number;
  readonly familyId?: RbDecisionFamilyId;
  readonly decisionId?: RbDecisionId;
}

export interface RbSkillDefinition {
  readonly id: SkillId;
  readonly familyId: SkillFamilyId;
  readonly gradeId: SkillGradeId;
  readonly positionId: 'position_rb';
  readonly effects: readonly RbSkillEffect[];
}

export interface RbEventGameModifiers {
  readonly clueBonus: number;
  readonly decisionScoreFlat: number;
  readonly contactReductionPermille: number;
}

export interface RbPlayerGameState {
  readonly id: PlayerId;
  readonly positionId: 'position_rb';
  readonly attributes: PositionAttributeProgress;
  readonly state: {
    readonly body: number;
    readonly preparation: number;
    readonly confidence: number;
    readonly coachTrust: number;
  };
}

export interface RbGameStartInput {
  /** Explicit opt-in for a newly started game; absence preserves literal historical rules. */
  readonly rulesVersion?: typeof TACTICAL_GAME_RULES_VERSION;
  readonly gameId: `game_rb_${string}`;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly opportunityCount: number;
  readonly playerTeamRating: number;
  readonly opponentDefenseRating: number;
  readonly opponentOffenseRating: number;
  readonly player: RbPlayerGameState;
  readonly patterns: readonly RbPatternDefinition[];
  readonly decisions: readonly RbDecisionDefinition[];
  readonly equippedSkills: readonly RbSkillDefinition[];
  readonly eventModifiers: RbEventGameModifiers;
  /** Absent on historical inputs; current relationship evidence contributes score, not free clues. */
  readonly relationshipInformationScoreModifier?: number;
  /** Scene-consistent outcomes, set by VNext for one resolve only (absent on historical inputs). */
  readonly sceneRules?: SceneRulesVersion;
  readonly rng: RngState;
}

export interface RbGameStatLine {
  readonly carries: number;
  readonly rushingYards: number;
  readonly rushingTouchdowns: number;
  readonly receptions: number;
  readonly receivingYards: number;
  readonly receivingTouchdowns: number;
  readonly protectionAssignments: number;
  readonly protectionWins: number;
  readonly fumbles: number;
}

export interface PendingRbSnap {
  readonly tacticalContext?: TacticalSnapContextV1;
  readonly snapIndex: number;
  readonly patternId: RbPatternId;
  readonly familyId: RbDecisionFamilyId;
  readonly decisionIds: readonly [RbDecisionId, RbDecisionId, RbDecisionId];
  readonly revealedClueIds: readonly RbClueId[];
  readonly information: {
    readonly footballIqScore: number;
    readonly visionScore: number;
    readonly preparationScore: number;
    readonly finalScore: number;
    readonly clueCount: number;
    readonly skillClueBonus: number;
    readonly eventClueBonus: number;
    readonly relationshipInformationScoreModifier?: number;
  };
}

export interface RbSnapPlayEvidence {
  readonly tacticalResult?: TacticalSnapResultV1;
  readonly snapIndex: number;
  readonly patternId: RbPatternId;
  readonly familyId: RbDecisionFamilyId;
  readonly decisionId: RbDecisionId;
  readonly playResult: 'RUSH' | 'RECEPTION' | 'PROTECTION_WIN' | 'PROTECTION_MISS';
  readonly yardsDelta: number;
  readonly touchdownDelta: 0 | 1;
  readonly fumbleDelta: 0 | 1;
  readonly decisionFit: number;
  readonly bodyExposure: number;
  readonly resolution: {
    readonly attributeScore: number;
    readonly decisionFit: number;
    readonly matchupScore: number;
    readonly finalScore: number;
    readonly contactChancePermille: number;
    readonly successChancePermille: number;
    readonly fumbleRiskPermille: number;
    readonly explosiveChancePermille: number;
    readonly touchdownChancePermille: number;
    readonly contactRoll: number;
    readonly executionRoll: number;
    readonly outcomeRoll: number;
    readonly turnoverRoll: number;
    readonly explosiveRoll: number;
    readonly yardVariation: number;
    readonly skillAdjustment: number;
    readonly eventAdjustment: number;
  };
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
  readonly appliedSkillIds: readonly SkillId[];
}

export interface CompleteRbGame {
  readonly type: 'COMPLETE';
  readonly summary: {
    readonly rulesVersion?: typeof TACTICAL_GAME_RULES_VERSION;
    readonly gameId: `game_rb_${string}`;
    readonly weekIndex: number;
    readonly playerProgramId: ProgramId;
    readonly opponentProgramId: ProgramId;
    readonly isHome: boolean;
    readonly playerTeamScore: number;
    readonly opponentScore: number;
    readonly resultId: 'game_result_win' | 'game_result_loss' | 'game_result_tie';
    readonly opportunityCount: number;
    readonly statLine: RbGameStatLine;
    readonly gradeScore: number;
    readonly participationFeedbackId:
      'game_participation_rb_offense' | 'game_participation_rb_assignment_review';
    readonly gameRngDrawCountBefore: number;
    readonly gameRngDrawCountAfter: number;
  };
  readonly growth: {
    readonly bodyBefore: number;
    readonly requestedBodyDelta: number;
    readonly bodyAfter: number;
    readonly confidenceBefore: number;
    readonly requestedConfidenceDelta: number;
    readonly confidenceAfter: number;
    readonly coachTrustBefore: number;
    readonly requestedCoachTrustDelta: number;
    readonly coachTrustAfter: number;
    readonly attributeXp: readonly {
      readonly attributeId: MultiPositionAttributeId;
      readonly awardedXp: number;
      readonly ratingBefore: number;
      readonly ratingAfter: number;
      readonly xpBefore: number;
      readonly xpAfter: number;
    }[];
  };
  readonly keyPlayLog: readonly RbSnapPlayEvidence[];
  readonly nextPlayer: RbPlayerGameState;
  readonly rng: RngState;
}

export interface ActiveRbGame {
  readonly type: 'ACTIVE';
  readonly input: Omit<RbGameStartInput, 'patterns' | 'decisions' | 'equippedSkills' | 'rng'>;
  readonly gameRngDrawCountBefore: number;
  readonly rng: RngState;
  readonly statLine: RbGameStatLine;
  readonly playerTeamTouchdowns: number;
  readonly totalBodyExposure: number;
  readonly keyPlayLog: readonly RbSnapPlayEvidence[];
  readonly pendingSnap: PendingRbSnap;
  readonly patterns: readonly RbPatternDefinition[];
  readonly decisions: readonly RbDecisionDefinition[];
  readonly equippedSkills: readonly RbSkillDefinition[];
}

export type RbGameState = ActiveRbGame | CompleteRbGame;
export type RbGameResult =
  | { readonly ok: true; readonly state: RbGameState }
  | { readonly ok: false; readonly reason: 'rb_game.invalid_input' | 'rb_game.invalid_decision' };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const integerIn = (value: unknown, min: number, max: number): value is number =>
  Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
const prefixed = (value: unknown, prefix: string): value is string =>
  typeof value === 'string' && value.startsWith(prefix) && /^[a-z0-9_]+$/u.test(value);
const rating = (attributes: PositionAttributeProgress, id: MultiPositionAttributeId) =>
  attributes[id]!.rating;

function skillValue(
  skills: readonly RbSkillDefinition[],
  type: RbSkillEffectType,
  familyId?: RbDecisionFamilyId,
  decisionId?: RbDecisionId,
) {
  const applied = skills.flatMap((skill) =>
    skill.effects.flatMap((effect) =>
      effect.type === type &&
      (effect.familyId === undefined || effect.familyId === familyId) &&
      (effect.decisionId === undefined || effect.decisionId === decisionId)
        ? [{ id: skill.id, value: effect.value }]
        : [],
    ),
  );
  return {
    value: applied.reduce((sum, item) => sum + item.value, 0),
    ids: [...new Set(applied.map(({ id }) => id))].sort(),
  };
}

function validInput(input: RbGameStartInput): boolean {
  const decisions = input?.decisions;
  const patterns = input?.patterns;
  if (
    !prefixed(input?.gameId, 'game_rb_') ||
    (Object.hasOwn(input, 'rulesVersion') && input.rulesVersion !== TACTICAL_GAME_RULES_VERSION) ||
    !integerIn(input.weekIndex, 0, 1_000) ||
    !isProgramId(input.playerProgramId) ||
    !isProgramId(input.opponentProgramId) ||
    input.playerProgramId === input.opponentProgramId ||
    !integerIn(input.opportunityCount, 0, 5) ||
    !integerIn(input.playerTeamRating, 0, 100) ||
    !integerIn(input.opponentDefenseRating, 0, 100) ||
    !integerIn(input.opponentOffenseRating, 0, 100) ||
    !isPlayerId(input.player?.id) ||
    input.player.positionId !== 'position_rb' ||
    validatePositionAttributeProgress('position_rb', input.player.attributes).length > 0 ||
    !isIntegerWithinBounds(input.player.state.body, BODY_BOUNDS) ||
    !integerIn(input.player.state.preparation, 0, 100) ||
    !isIntegerWithinBounds(input.player.state.confidence, CONFIDENCE_BOUNDS) ||
    !isIntegerWithinBounds(input.player.state.coachTrust, COACH_TRUST_BOUNDS) ||
    !isRngState(input.rng) ||
    (input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
      input.opportunityCount > 0 &&
      input.rng.drawCount > Number.MAX_SAFE_INTEGER - (input.opportunityCount * 11 + 2)) ||
    decisions?.length !== 12 ||
    patterns?.length !== 8 ||
    input.equippedSkills.length > 4 ||
    !integerIn(input.eventModifiers?.clueBonus, 0, 2) ||
    !integerIn(input.eventModifiers?.decisionScoreFlat, -10, 10) ||
    !integerIn(input.eventModifiers?.contactReductionPermille, 0, 250) ||
    (Object.hasOwn(input, 'relationshipInformationScoreModifier') &&
      !integerIn(input.relationshipInformationScoreModifier, -6, 6))
  )
    return false;
  if (
    new Set(decisions.map(({ id }) => id)).size !== 12 ||
    new Set(patterns.map(({ id }) => id)).size !== 8
  )
    return false;
  for (const decision of decisions)
    if (
      !prefixed(decision.id, 'key_snap_decision_rb_') ||
      !RB_DECISION_FAMILY_IDS.includes(decision.familyId) ||
      !['RUSH', 'RECEPTION', 'PROTECTION'].includes(decision.playMode) ||
      !integerIn(decision.successModifierPermille, -300, 300) ||
      !integerIn(decision.fumbleRiskModifierPermille, -250, 250) ||
      !integerIn(decision.bodyExposure, 0, 8) ||
      !integerIn(decision.yardModifier, -10, 15)
    )
      return false;
  const byDecision = new Map(decisions.map((item) => [item.id, item]));
  for (const pattern of patterns) {
    if (
      !prefixed(pattern.id, 'key_snap_pattern_rb_') ||
      !RB_DECISION_FAMILY_IDS.includes(pattern.familyId) ||
      pattern.clueIds.length !== 3 ||
      new Set(pattern.clueIds).size !== 3 ||
      !pattern.clueIds.every((id) => prefixed(id, 'game_clue_rb_')) ||
      pattern.decisionFits.length !== 3 ||
      new Set(pattern.decisionFits.map(({ decisionId }) => decisionId)).size !== 3 ||
      !pattern.decisionFits.every(
        ({ decisionId, fit }) =>
          byDecision.get(decisionId)?.familyId === pattern.familyId && integerIn(fit, 0, 100),
      ) ||
      pattern.attributeWeights.length !== 2 ||
      new Set(pattern.attributeWeights.map(({ attributeId }) => attributeId)).size !== 2 ||
      pattern.attributeWeights.reduce((sum, item) => sum + item.weightPermille, 0) !== 1_000 ||
      !pattern.attributeWeights.every(
        ({ attributeId, weightPermille }) =>
          input.player.attributes[attributeId] !== undefined && integerIn(weightPermille, 1, 999),
      ) ||
      !integerIn(pattern.contactPermille, 0, 900) ||
      !integerIn(pattern.baseSuccessPermille, 100, 950) ||
      !integerIn(pattern.baseFumbleRiskPermille, 0, 500) ||
      !integerIn(pattern.explosiveChancePermille, 0, 500) ||
      !integerIn(pattern.touchdownChancePermille, 0, 500) ||
      !integerIn(pattern.baseYards, 0, 30)
    )
      return false;
  }
  for (const familyId of RB_DECISION_FAMILY_IDS)
    if (
      decisions.filter((item) => item.familyId === familyId).length !== 3 ||
      patterns.filter((item) => item.familyId === familyId).length !== 2
    )
      return false;
  for (const skill of input.equippedSkills)
    if (
      !isSkillId(skill.id) ||
      !isSkillFamilyId(skill.familyId) ||
      !isSkillGradeId(skill.gradeId) ||
      skill.positionId !== 'position_rb' ||
      skill.effects.length < 1 ||
      !skill.effects.every(
        (effect) =>
          RB_SKILL_EFFECT_TYPES.includes(effect.type) && integerIn(effect.value, -500, 500),
      )
    )
      return false;
  return true;
}

function mapped(rng: RngState, min: number, max: number) {
  const sample = nextUint32(rng);
  return {
    value: min + Math.floor((sample.value * (max - min + 1)) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

function pending(active: Omit<ActiveRbGame, 'pendingSnap'>, snapIndex: number): PendingRbSnap {
  const pattern = active.patterns[(active.input.weekIndex + snapIndex) % active.patterns.length]!;
  const footballIqScore = rating(active.input.player.attributes, 'attribute_football_iq');
  const visionScore = rating(active.input.player.attributes, 'attribute_rb_vision');
  const preparationScore = active.input.player.state.preparation;
  const skillClueBonus = skillValue(
    active.equippedSkills,
    'rb_information_clue_bonus',
    pattern.familyId,
  ).value;
  const eventClueBonus = active.input.eventModifiers.clueBonus;
  const relationshipInformationScoreModifier =
    active.input.relationshipInformationScoreModifier ?? 0;
  const finalScore = clamp(
    Math.round((footballIqScore * 350 + visionScore * 400 + preparationScore * 250) / 1_000) +
      relationshipInformationScoreModifier,
    0,
    100,
  );
  const clueCount = clamp(
    (finalScore >= 65 ? 2 : finalScore >= 45 ? 1 : 0) + skillClueBonus + eventClueBonus,
    0,
    3,
  );
  return {
    snapIndex,
    patternId: pattern.id,
    familyId: pattern.familyId,
    decisionIds: pattern.decisionFits.map(({ decisionId }) => decisionId) as [
      RbDecisionId,
      RbDecisionId,
      RbDecisionId,
    ],
    revealedClueIds: pattern.clueIds.slice(0, clueCount),
    information: {
      footballIqScore,
      visionScore,
      preparationScore,
      finalScore,
      clueCount,
      skillClueBonus,
      eventClueBonus,
      ...(Object.hasOwn(active.input, 'relationshipInformationScoreModifier')
        ? { relationshipInformationScoreModifier }
        : {}),
    },
  };
}

function withPendingSnap(
  active: Omit<ActiveRbGame, 'pendingSnap'>,
  snapIndex: number,
): ActiveRbGame | undefined {
  const nextPending = pending(active, snapIndex);
  if (active.input.rulesVersion === undefined) return { ...active, pendingSnap: nextPending };
  const prepared = prepareTacticalAlphaSnapV1({
    ...active.input,
    positionId: 'position_rb',
    snapIndex,
    decisionIds: nextPending.decisionIds,
    revealedClueIds: nextPending.revealedClueIds,
    score: active.keyPlayLog.at(-1)?.tacticalResult?.scoreAfter ?? { playerTeam: 0, opponent: 0 },
    rng: active.rng,
  });
  return prepared === undefined
    ? undefined
    : {
        ...active,
        rng: prepared.rng,
        pendingSnap: { ...nextPending, tacticalContext: prepared.context },
      };
}

function tacticalPendingIsValid(active: ActiveRbGame): boolean {
  const context = active.pendingSnap.tacticalContext;
  if (active.input.rulesVersion === undefined) return context === undefined;
  return (
    active.input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
    matchesTacticalSnapContextV1(context, {
      ...active.pendingSnap,
      gameId: active.input.gameId,
      positionId: 'position_rb',
    })
  );
}

const emptyStats = (): RbGameStatLine => ({
  carries: 0,
  rushingYards: 0,
  rushingTouchdowns: 0,
  receptions: 0,
  receivingYards: 0,
  receivingTouchdowns: 0,
  protectionAssignments: 0,
  protectionWins: 0,
  fumbles: 0,
});

function addStats(stats: RbGameStatLine, play: RbSnapPlayEvidence): RbGameStatLine {
  return {
    carries: stats.carries + (play.playResult === 'RUSH' ? 1 : 0),
    rushingYards: stats.rushingYards + (play.playResult === 'RUSH' ? play.yardsDelta : 0),
    rushingTouchdowns:
      stats.rushingTouchdowns + (play.playResult === 'RUSH' ? play.touchdownDelta : 0),
    receptions: stats.receptions + (play.playResult === 'RECEPTION' ? 1 : 0),
    receivingYards: stats.receivingYards + (play.playResult === 'RECEPTION' ? play.yardsDelta : 0),
    receivingTouchdowns:
      stats.receivingTouchdowns + (play.playResult === 'RECEPTION' ? play.touchdownDelta : 0),
    protectionAssignments:
      stats.protectionAssignments + (play.playResult.startsWith('PROTECTION_') ? 1 : 0),
    protectionWins: stats.protectionWins + (play.playResult === 'PROTECTION_WIN' ? 1 : 0),
    fumbles: stats.fumbles + play.fumbleDelta,
  };
}

function complete(active: Omit<ActiveRbGame, 'pendingSnap'>): CompleteRbGame {
  const stats = active.statLine;
  const opportunities = active.input.opportunityCount;
  const protectionRate =
    stats.protectionAssignments === 0
      ? 70
      : Math.round((stats.protectionWins * 100) / stats.protectionAssignments);
  const averageFit =
    active.keyPlayLog.length === 0
      ? 50
      : Math.round(
          active.keyPlayLog.reduce((sum, play) => sum + play.decisionFit, 0) /
            active.keyPlayLog.length,
        );
  const gradeScore = clamp(
    45 +
      Math.round((stats.rushingYards + stats.receivingYards) / Math.max(4, opportunities * 4)) +
      Math.round((protectionRate - 50) / 5) +
      Math.round((averageFit - 50) / 5) +
      (stats.rushingTouchdowns + stats.receivingTouchdowns) * 8 -
      stats.fumbles * 16 +
      skillValue(active.equippedSkills, 'rb_grade_bonus').value,
    0,
    100,
  );
  const baseScore = clamp(
    17 + Math.round((active.input.playerTeamRating - active.input.opponentDefenseRating) / 4),
    7,
    35,
  );
  let opponentScore = clamp(
    17 + Math.round((active.input.opponentOffenseRating - active.input.playerTeamRating) / 4),
    7,
    35,
  );
  let playerTeamScore = clamp(baseScore + active.playerTeamTouchdowns * 7, 0, 70);
  let completedRng = active.rng;
  if (active.input.rulesVersion === TACTICAL_GAME_RULES_VERSION && opportunities > 0) {
    const finalBackground = resolveTacticalAlphaBackgroundV1({
      ...active.input,
      score: active.keyPlayLog.at(-1)!.tacticalResult!.scoreAfter,
      rng: active.rng,
    })!;
    playerTeamScore = finalBackground.score.playerTeam;
    opponentScore = finalBackground.score.opponent;
    completedRng = finalBackground.rng;
  }
  const mutable = Object.fromEntries(
    Object.entries(active.input.player.attributes).map(([id, value]) => [id, { ...value! }]),
  ) as Record<MultiPositionAttributeId, { rating: number; xp: number }>;
  const xpByAttribute = new Map<MultiPositionAttributeId, number>();
  for (const play of active.keyPlayLog) {
    const pattern = active.patterns.find(({ id }) => id === play.patternId)!;
    const baseXp = 12 + Math.floor(play.decisionFit / 10);
    for (const weight of pattern.attributeWeights)
      xpByAttribute.set(
        weight.attributeId,
        (xpByAttribute.get(weight.attributeId) ?? 0) +
          Math.round((baseXp * weight.weightPermille) / 1_000),
      );
  }
  const multiplier = 1_000 + skillValue(active.equippedSkills, 'rb_xp_multiplier_permille').value;
  const attributeXp = [...xpByAttribute.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([attributeId, baseXp]) => {
      const before = mutable[attributeId]!;
      const awardedXp = Math.round((baseXp * multiplier) / 1_000);
      let ratingAfter = before.rating;
      let xpAfter = before.xp + awardedXp;
      while (ratingAfter < 100 && xpAfter >= ATTRIBUTE_XP_PER_RATING) {
        ratingAfter += 1;
        xpAfter -= ATTRIBUTE_XP_PER_RATING;
      }
      if (ratingAfter === 100) xpAfter = 0;
      mutable[attributeId] = { rating: ratingAfter, xp: xpAfter };
      return {
        attributeId,
        awardedXp,
        ratingBefore: before.rating,
        ratingAfter,
        xpBefore: before.xp,
        xpAfter,
      };
    });
  const bodyReduction = skillValue(active.equippedSkills, 'rb_body_cost_reduction').value;
  const requestedBodyDelta = -Math.max(
    0,
    2 + opportunities + active.totalBodyExposure - bodyReduction,
  );
  const bodyAfter = clamp(active.input.player.state.body + requestedBodyDelta, 0, 100);
  const bandDelta =
    gradeScore >= 85 ? 3 : gradeScore >= 70 ? 1 : gradeScore < 45 ? -3 : gradeScore < 60 ? -1 : 0;
  const requestedConfidenceDelta =
    bandDelta < 0
      ? Math.min(
          0,
          bandDelta + skillValue(active.equippedSkills, 'rb_confidence_loss_reduction').value,
        )
      : bandDelta;
  const confidenceAfter = clamp(
    active.input.player.state.confidence + requestedConfidenceDelta,
    0,
    100,
  );
  const requestedCoachTrustDelta =
    gradeScore >= 85 ? 4 : gradeScore >= 70 ? 2 : gradeScore < 45 ? -4 : gradeScore < 60 ? -2 : 0;
  const coachTrustAfter = clamp(
    active.input.player.state.coachTrust + requestedCoachTrustDelta,
    0,
    100,
  );
  return {
    type: 'COMPLETE',
    summary: {
      ...(active.input.rulesVersion === undefined
        ? {}
        : { rulesVersion: active.input.rulesVersion }),
      gameId: active.input.gameId,
      weekIndex: active.input.weekIndex,
      playerProgramId: active.input.playerProgramId,
      opponentProgramId: active.input.opponentProgramId,
      isHome: active.input.isHome,
      playerTeamScore,
      opponentScore,
      resultId:
        playerTeamScore > opponentScore
          ? 'game_result_win'
          : playerTeamScore < opponentScore
            ? 'game_result_loss'
            : 'game_result_tie',
      opportunityCount: opportunities,
      statLine: stats,
      gradeScore,
      participationFeedbackId:
        opportunities === 0
          ? 'game_participation_rb_assignment_review'
          : 'game_participation_rb_offense',
      gameRngDrawCountBefore: active.gameRngDrawCountBefore,
      gameRngDrawCountAfter: completedRng.drawCount,
    },
    growth: {
      bodyBefore: active.input.player.state.body,
      requestedBodyDelta,
      bodyAfter,
      confidenceBefore: active.input.player.state.confidence,
      requestedConfidenceDelta,
      confidenceAfter,
      coachTrustBefore: active.input.player.state.coachTrust,
      requestedCoachTrustDelta,
      coachTrustAfter,
      attributeXp,
    },
    keyPlayLog: active.keyPlayLog,
    nextPlayer: {
      ...active.input.player,
      attributes: mutable,
      state: {
        ...active.input.player.state,
        body: bodyAfter,
        confidence: confidenceAfter,
        coachTrust: coachTrustAfter,
      },
    },
    rng: completedRng,
  };
}

export function startRbGame(input: RbGameStartInput): RbGameResult {
  if (!validInput(input))
    return deepFreeze({ ok: false as const, reason: 'rb_game.invalid_input' as const });
  const base: Omit<ActiveRbGame, 'pendingSnap'> = {
    type: 'ACTIVE',
    input: {
      ...(input.rulesVersion === undefined ? {} : { rulesVersion: input.rulesVersion }),
      gameId: input.gameId,
      weekIndex: input.weekIndex,
      playerProgramId: input.playerProgramId,
      opponentProgramId: input.opponentProgramId,
      isHome: input.isHome,
      opportunityCount: input.opportunityCount,
      playerTeamRating: input.playerTeamRating,
      opponentDefenseRating: input.opponentDefenseRating,
      opponentOffenseRating: input.opponentOffenseRating,
      player: input.player,
      eventModifiers: input.eventModifiers,
      ...(Object.hasOwn(input, 'relationshipInformationScoreModifier')
        ? { relationshipInformationScoreModifier: input.relationshipInformationScoreModifier! }
        : {}),
    },
    gameRngDrawCountBefore: input.rng.drawCount,
    rng: input.rng,
    statLine: emptyStats(),
    playerTeamTouchdowns: 0,
    totalBodyExposure: 0,
    keyPlayLog: [],
    patterns: [...input.patterns].sort((a, b) => a.id.localeCompare(b.id)),
    decisions: [...input.decisions].sort((a, b) => a.id.localeCompare(b.id)),
    equippedSkills: [...input.equippedSkills].sort((a, b) => a.id.localeCompare(b.id)),
  };
  const state = input.opportunityCount === 0 ? complete(base) : withPendingSnap(base, 0);
  if (state === undefined)
    return deepFreeze({ ok: false as const, reason: 'rb_game.invalid_input' as const });
  return deepFreeze({
    ok: true as const,
    state: input.rulesVersion === undefined ? state : cloneSerializable(state),
  });
}

export function resolveRbSnap(active: ActiveRbGame, decisionId: unknown): RbGameResult {
  const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId);
  const decision = active.decisions.find(({ id }) => id === decisionId);
  const fit = pattern?.decisionFits.find((item) => item.decisionId === decisionId)?.fit;
  if (
    !pattern ||
    !decision ||
    fit === undefined ||
    decision.familyId !== pattern.familyId ||
    !active.pendingSnap.decisionIds.includes(decision.id) ||
    !isRngState(active.rng) ||
    !tacticalPendingIsValid(active) ||
    (active.input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
      active.rng.drawCount >
        Number.MAX_SAFE_INTEGER -
          (active.keyPlayLog.length + 1 >= active.input.opportunityCount ? 8 : 11))
  )
    return deepFreeze({ ok: false as const, reason: 'rb_game.invalid_decision' as const });
  const before = active.rng.drawCount;
  const contact = mapped(active.rng, 0, 999);
  const execution = mapped(contact.rng, 0, 999);
  const outcome = mapped(execution.rng, 0, 999);
  const turnover = mapped(outcome.rng, 0, 999);
  const explosive = mapped(turnover.rng, 0, 999);
  const yards = mapped(explosive.rng, -2, 4);
  const attributeScore = Math.round(
    pattern.attributeWeights.reduce(
      (sum, item) =>
        sum + rating(active.input.player.attributes, item.attributeId) * item.weightPermille,
      0,
    ) / 1_000,
  );
  const matchupScore = 100 - active.input.opponentDefenseRating;
  const scoreSkill = skillValue(
    active.equippedSkills,
    'rb_decision_score_flat',
    pattern.familyId,
    decision.id,
  );
  const protectionSkill = skillValue(
    active.equippedSkills,
    'rb_protection_score_flat',
    pattern.familyId,
    decision.id,
  );
  const finalScore = clamp(
    Math.round(
      (attributeScore * 350 +
        fit * 250 +
        matchupScore * 150 +
        active.input.player.state.body * 80 +
        active.input.player.state.preparation * 70 +
        active.input.player.state.confidence * 50 +
        active.input.playerTeamRating * 50) /
        1_000,
    ) +
      scoreSkill.value +
      protectionSkill.value +
      active.input.eventModifiers.decisionScoreFlat,
    0,
    100,
  );
  const contactChancePermille = clamp(
    pattern.contactPermille - active.input.eventModifiers.contactReductionPermille,
    0,
    950,
  );
  const contacted = contact.value < contactChancePermille;
  const successChancePermille = clamp(
    pattern.baseSuccessPermille +
      decision.successModifierPermille +
      (finalScore - 50) * 4 -
      (contacted ? 80 : 0),
    50,
    950,
  );
  const fumbleSkill = skillValue(
    active.equippedSkills,
    'rb_fumble_risk_delta_permille',
    pattern.familyId,
    decision.id,
  );
  const fumbleRiskPermille = clamp(
    pattern.baseFumbleRiskPermille +
      decision.fumbleRiskModifierPermille +
      fumbleSkill.value +
      (contacted ? 45 : 0) +
      // v2 (M12): a misread runs into contact unprepared; a sharp read protects the ball.
      (sceneRulesAt(active.input.sceneRules, 2)
        ? (60 - fit) * SCENE_RULES_V2_TUNING.rbFumblePerFitPoint
        : 0),
    0,
    700,
  );
  const explosiveSkill = skillValue(
    active.equippedSkills,
    'rb_explosive_chance_delta_permille',
    pattern.familyId,
    decision.id,
  );
  const explosiveChancePermille = clamp(
    pattern.explosiveChancePermille + explosiveSkill.value,
    0,
    700,
  );
  const succeeded = outcome.value < successChancePermille;
  const playResult =
    decision.playMode === 'PROTECTION'
      ? succeeded
        ? 'PROTECTION_WIN'
        : 'PROTECTION_MISS'
      : decision.playMode;
  const fumbleDelta =
    decision.playMode !== 'PROTECTION' && turnover.value < fumbleRiskPermille
      ? (1 as const)
      : (0 as const);
  let yardsDelta =
    decision.playMode === 'PROTECTION'
      ? 0
      : succeeded
        ? Math.max(
            0,
            pattern.baseYards +
              decision.yardModifier +
              yards.value +
              (explosive.value < explosiveChancePermille ? 8 : 0) -
              (contacted ? 2 : 0),
          )
        : Math.max(0, pattern.baseYards - 4 + yards.value - (contacted ? 1 : 0));
  let touchdownDelta =
    decision.playMode !== 'PROTECTION' &&
    succeeded &&
    execution.value <
      clamp(pattern.touchdownChancePermille + Math.max(0, finalScore - 60) * 2, 0, 600)
      ? (1 as const)
      : (0 as const);
  let tacticalResult: TacticalSnapResultV1 | undefined;
  if (active.input.rulesVersion === TACTICAL_GAME_RULES_VERSION) {
    tacticalResult = resolveTacticalFieldV1(active.pendingSnap.tacticalContext!, {
      decisionId: decision.id,
      kind: decision.playMode === 'PROTECTION' ? 'UNTRACKED' : 'ADVANCE',
      yards: yardsDelta,
      touchdown: touchdownDelta === 1,
      fumbleLost: fumbleDelta === 1,
    });
    if (tacticalResult === undefined)
      return deepFreeze({ ok: false as const, reason: 'rb_game.invalid_input' as const });
    yardsDelta = tacticalResult.ball.offenseYards ?? 0;
    touchdownDelta = tacticalResult.ball.outcome === 'TOUCHDOWN' ? 1 : 0;
  }
  const play: RbSnapPlayEvidence = {
    ...(tacticalResult === undefined ? {} : { tacticalResult }),
    snapIndex: active.pendingSnap.snapIndex,
    patternId: pattern.id,
    familyId: pattern.familyId,
    decisionId: decision.id,
    playResult,
    yardsDelta,
    touchdownDelta,
    fumbleDelta,
    decisionFit: fit,
    bodyExposure: decision.bodyExposure + (contacted ? 1 : 0),
    resolution: {
      attributeScore,
      decisionFit: fit,
      matchupScore,
      finalScore,
      contactChancePermille,
      successChancePermille,
      fumbleRiskPermille,
      explosiveChancePermille,
      touchdownChancePermille: pattern.touchdownChancePermille,
      contactRoll: contact.value,
      executionRoll: execution.value,
      outcomeRoll: outcome.value,
      turnoverRoll: turnover.value,
      explosiveRoll: explosive.value,
      yardVariation: yards.value,
      skillAdjustment: scoreSkill.value + protectionSkill.value,
      eventAdjustment: active.input.eventModifiers.decisionScoreFlat,
    },
    rngDrawCountBefore: before,
    rngDrawCountAfter: yards.rng.drawCount,
    appliedSkillIds: [
      ...new Set([
        ...scoreSkill.ids,
        ...protectionSkill.ids,
        ...fumbleSkill.ids,
        ...explosiveSkill.ids,
      ]),
    ].sort(),
  };
  const log = [...active.keyPlayLog, play];
  const next: Omit<ActiveRbGame, 'pendingSnap'> = {
    ...active,
    rng: yards.rng,
    statLine: addStats(active.statLine, play),
    playerTeamTouchdowns: active.playerTeamTouchdowns + touchdownDelta,
    totalBodyExposure: active.totalBodyExposure + play.bodyExposure,
    keyPlayLog: log,
  };
  const state =
    log.length >= active.input.opportunityCount
      ? complete(next)
      : withPendingSnap(next, log.length);
  if (state === undefined)
    return deepFreeze({ ok: false as const, reason: 'rb_game.invalid_input' as const });
  return deepFreeze({
    ok: true as const,
    state: active.input.rulesVersion === undefined ? state : cloneSerializable(state),
  });
}

export function projectRbWorldAlphaResult(
  summary: CompleteRbGame['summary'],
  fixture: WorldAlphaFixtureMechanics,
):
  | { readonly ok: true; readonly result: WorldAlphaPlayerGameResult }
  | { readonly ok: false; readonly reason: 'rb_game.fixture_mismatch' } {
  const home = summary.isHome ? summary.playerProgramId : summary.opponentProgramId;
  const away = summary.isHome ? summary.opponentProgramId : summary.playerProgramId;
  if (fixture.homeProgramId !== home || fixture.awayProgramId !== away)
    return deepFreeze({ ok: false as const, reason: 'rb_game.fixture_mismatch' as const });
  const homeScore = summary.isHome ? summary.playerTeamScore : summary.opponentScore;
  const awayScore = summary.isHome ? summary.opponentScore : summary.playerTeamScore;
  return deepFreeze({
    ok: true as const,
    result: {
      model: 'player_game_alpha_v1' as const,
      fixtureId: fixture.id,
      homeScore,
      awayScore,
      winnerProgramId: homeScore > awayScore ? home : awayScore > homeScore ? away : null,
    },
  });
}
