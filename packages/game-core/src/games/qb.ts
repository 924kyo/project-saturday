import {
  prepareTacticalAlphaSnapV1,
  resolveTacticalAlphaBackgroundV1,
  resolveTacticalFieldV1,
  SCENE_RULES_V2_TUNING,
  sceneRulesAt,
  type SceneRulesVersion,
  TACTICAL_GAME_RULES_VERSION,
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
import type { SkillFamilyId, SkillGradeId, SkillId } from '../skills/ids.js';
import { isSkillFamilyId, isSkillGradeId, isSkillId } from '../skills/ids.js';
import { ATTRIBUTE_XP_PER_RATING } from '../weekly/tuning.js';
import type {
  WorldAlphaFixtureMechanics,
  WorldAlphaPlayerGameResult,
} from '../season/world-alpha.js';

export const QB_DECISION_FAMILY_IDS = Object.freeze([
  'key_snap_family_qb_pre_snap',
  'key_snap_family_qb_pocket',
  'key_snap_family_qb_throw',
  'key_snap_family_qb_scramble',
] as const);

export const QB_SKILL_EFFECT_TYPES = Object.freeze([
  'qb_information_clue_bonus',
  'qb_decision_score_flat',
  'qb_turnover_risk_delta_permille',
  'qb_scramble_yards_flat',
  'qb_body_cost_reduction',
  'qb_confidence_loss_reduction',
  'qb_xp_multiplier_permille',
  'qb_grade_bonus',
  'qb_event_choice_unlock',
  'qb_event_positive_multiplier_permille',
] as const);

export type QbDecisionFamilyId = (typeof QB_DECISION_FAMILY_IDS)[number];
export type QbDecisionId = `key_snap_decision_qb_${string}`;
export type QbPatternId = `key_snap_pattern_qb_${string}`;
export type QbClueId = `game_clue_qb_${string}`;
export type QbSkillEffectType = (typeof QB_SKILL_EFFECT_TYPES)[number];

export interface QbDecisionDefinition {
  readonly id: QbDecisionId;
  readonly familyId: QbDecisionFamilyId;
  readonly playMode: 'PASS' | 'SCRAMBLE' | 'THROW_AWAY';
  readonly completionModifierPermille: number;
  readonly turnoverRiskModifierPermille: number;
  readonly pressureResponse: number;
  readonly yardModifier: number;
}

export interface QbPatternDefinition {
  readonly id: QbPatternId;
  readonly familyId: QbDecisionFamilyId;
  readonly clueIds: readonly [QbClueId, QbClueId, QbClueId];
  readonly decisionFits: readonly [
    { readonly decisionId: QbDecisionId; readonly fit: number },
    { readonly decisionId: QbDecisionId; readonly fit: number },
    { readonly decisionId: QbDecisionId; readonly fit: number },
  ];
  readonly attributeWeights: readonly [
    { readonly attributeId: MultiPositionAttributeId; readonly weightPermille: number },
    { readonly attributeId: MultiPositionAttributeId; readonly weightPermille: number },
  ];
  readonly pressurePermille: number;
  readonly baseCompletionPermille: number;
  readonly baseTurnoverRiskPermille: number;
  readonly touchdownChancePermille: number;
  readonly baseYards: number;
}

export interface QbSkillEffect {
  readonly type: QbSkillEffectType;
  readonly value: number;
  readonly familyId?: QbDecisionFamilyId;
  readonly decisionId?: QbDecisionId;
}

export interface QbSkillDefinition {
  readonly id: SkillId;
  readonly familyId: SkillFamilyId;
  readonly gradeId: SkillGradeId;
  readonly positionId: 'position_qb';
  readonly effects: readonly QbSkillEffect[];
}

export interface QbEventGameModifiers {
  readonly clueBonus: number;
  readonly decisionScoreFlat: number;
  readonly pressureReductionPermille: number;
}

export interface QbPlayerGameState {
  readonly id: PlayerId;
  readonly positionId: 'position_qb';
  readonly attributes: PositionAttributeProgress;
  readonly state: {
    readonly body: number;
    readonly preparation: number;
    readonly confidence: number;
    readonly coachTrust: number;
  };
}

export interface QbGameStartInput {
  /** Explicit new-game opt-in. Absent inputs retain their literal pre-tactical rules. */
  readonly rulesVersion?: typeof TACTICAL_GAME_RULES_VERSION;
  /**
   * Scene-consistent outcomes (VNext sets it for the snap it resolves): a scramble that gives
   * itself up (a negative yard modifier, such as sliding early) cannot break away for a score.
   */
  readonly sceneRules?: SceneRulesVersion;
  readonly gameId: `game_qb_${string}`;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly opportunityCount: number;
  readonly playerTeamRating: number;
  readonly opponentDefenseRating: number;
  readonly opponentOffenseRating: number;
  readonly player: QbPlayerGameState;
  readonly patterns: readonly QbPatternDefinition[];
  readonly decisions: readonly QbDecisionDefinition[];
  readonly equippedSkills: readonly QbSkillDefinition[];
  readonly eventModifiers: QbEventGameModifiers;
  /** Absent on historical inputs; current relationship evidence contributes score, not free clues. */
  readonly relationshipInformationScoreModifier?: number;
  readonly rng: RngState;
}

export interface QbGameStatLine {
  readonly passAttempts: number;
  readonly completions: number;
  readonly passingYards: number;
  readonly passingTouchdowns: number;
  readonly interceptions: number;
  readonly sacksTaken: number;
  readonly rushAttempts: number;
  readonly rushingYards: number;
  readonly rushingTouchdowns: number;
  readonly fumbles: number;
}

export interface QbSnapInformationEvidence {
  readonly footballIqScore: number;
  readonly readProgressionScore: number;
  readonly preparationScore: number;
  readonly baseScore: number;
  readonly skillClueBonus: number;
  readonly eventClueBonus: number;
  readonly relationshipInformationScoreModifier?: number;
  readonly finalScore: number;
  readonly clueCount: number;
}

export interface PendingQbSnap {
  readonly tacticalContext?: TacticalSnapContextV1;
  readonly snapIndex: number;
  readonly patternId: QbPatternId;
  readonly familyId: QbDecisionFamilyId;
  readonly decisionIds: readonly [QbDecisionId, QbDecisionId, QbDecisionId];
  readonly revealedClueIds: readonly QbClueId[];
  readonly information: QbSnapInformationEvidence;
}

export interface QbSnapResolutionEvidence {
  readonly attributeScore: number;
  readonly attributeContributionMilli: number;
  readonly decisionFit: number;
  readonly decisionContributionMilli: number;
  readonly matchupScore: number;
  readonly matchupContributionMilli: number;
  readonly bodyContributionMilli: number;
  readonly preparationContributionMilli: number;
  readonly confidenceContributionMilli: number;
  readonly teamContextContributionMilli: number;
  readonly skillAdjustment: number;
  readonly eventAdjustment: number;
  readonly weightedScoreMilli: number;
  readonly finalScore: number;
  readonly pressureChancePermille: number;
  readonly completionChancePermille: number;
  readonly turnoverRiskPermille: number;
  readonly touchdownChancePermille: number;
  readonly pressureRoll: number;
  readonly executionRoll: number;
  readonly completionRoll: number;
  readonly turnoverRoll: number;
  readonly touchdownRoll: number;
  readonly yardVariation: number;
}

export interface QbSnapPlayEvidence {
  readonly tacticalResult?: TacticalSnapResultV1;
  readonly snapIndex: number;
  readonly patternId: QbPatternId;
  readonly familyId: QbDecisionFamilyId;
  readonly decisionId: QbDecisionId;
  readonly playResult:
    'COMPLETION' | 'INCOMPLETION' | 'INTERCEPTION' | 'SACK' | 'SCRAMBLE' | 'THROW_AWAY';
  readonly passingYardsDelta: number;
  readonly passingTouchdownDelta: 0 | 1;
  readonly interceptionDelta: 0 | 1;
  readonly sackDelta: 0 | 1;
  readonly rushingYardsDelta: number;
  readonly rushingTouchdownDelta: 0 | 1;
  readonly fumbleDelta: 0 | 1;
  readonly decisionFit: number;
  readonly resolution: QbSnapResolutionEvidence;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
  readonly appliedSkillIds: readonly SkillId[];
}

export interface QbAttributeGrowthEvidence {
  readonly attributeId: MultiPositionAttributeId;
  readonly ratingBefore: number;
  readonly xpBefore: number;
  readonly awardedXp: number;
  readonly appliedXp: number;
  readonly ratingAfter: number;
  readonly xpAfter: number;
}

export interface QbGameSummary {
  readonly rulesVersion?: typeof TACTICAL_GAME_RULES_VERSION;
  readonly gameId: `game_qb_${string}`;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly playerTeamScore: number;
  readonly opponentScore: number;
  readonly resultId: 'game_result_win' | 'game_result_loss' | 'game_result_tie';
  readonly opportunityCount: number;
  readonly statLine: QbGameStatLine;
  readonly gradeScore: number;
  readonly gradeBandId:
    | 'performance_grade_elite'
    | 'performance_grade_strong'
    | 'performance_grade_steady'
    | 'performance_grade_shaky'
    | 'performance_grade_poor';
  readonly participationFeedbackId:
    'game_participation_qb_offense' | 'game_participation_qb_signal_review';
  readonly gameRngDrawCountBefore: number;
  readonly gameRngDrawCountAfter: number;
}

export interface QbPostGameGrowthEvidence {
  readonly bodyBefore: number;
  readonly requestedBodyDelta: number;
  readonly actualBodyDelta: number;
  readonly bodyAfter: number;
  readonly confidenceBefore: number;
  readonly requestedConfidenceDelta: number;
  readonly actualConfidenceDelta: number;
  readonly confidenceAfter: number;
  readonly coachTrustBefore: number;
  readonly requestedCoachTrustDelta: number;
  readonly actualCoachTrustDelta: number;
  readonly coachTrustAfter: number;
  readonly attributeXp: readonly QbAttributeGrowthEvidence[];
}

export interface ActiveQbGame {
  readonly type: 'ACTIVE';
  readonly input: Omit<QbGameStartInput, 'patterns' | 'decisions' | 'equippedSkills' | 'rng'>;
  readonly gameRngDrawCountBefore: number;
  readonly rng: RngState;
  readonly statLine: QbGameStatLine;
  readonly playerTeamTouchdowns: number;
  readonly keyPlayLog: readonly QbSnapPlayEvidence[];
  readonly pendingSnap: PendingQbSnap;
  readonly patterns: readonly QbPatternDefinition[];
  readonly decisions: readonly QbDecisionDefinition[];
  readonly equippedSkills: readonly QbSkillDefinition[];
}

export interface CompleteQbGame {
  readonly type: 'COMPLETE';
  readonly summary: QbGameSummary;
  readonly growth: QbPostGameGrowthEvidence;
  readonly keyPlayLog: readonly QbSnapPlayEvidence[];
  readonly nextPlayer: QbPlayerGameState;
  readonly rng: RngState;
}

export type QbGameState = ActiveQbGame | CompleteQbGame;
export type QbGameResult =
  | { readonly ok: true; readonly state: QbGameState }
  | { readonly ok: false; readonly reason: 'qb_game.invalid_input' | 'qb_game.invalid_decision' };

export type QbWorldResultProjection =
  | { readonly ok: true; readonly result: WorldAlphaPlayerGameResult }
  | { readonly ok: false; readonly reason: 'qb_game.fixture_mismatch' };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function integerIn(value: unknown, minimum: number, maximum: number): value is number {
  return (
    Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum
  );
}

function stablePrefixed(value: unknown, prefix: string): value is string {
  return typeof value === 'string' && value.startsWith(prefix) && /^[a-z0-9_]+$/u.test(value);
}

function emptyStats(): QbGameStatLine {
  return {
    passAttempts: 0,
    completions: 0,
    passingYards: 0,
    passingTouchdowns: 0,
    interceptions: 0,
    sacksTaken: 0,
    rushAttempts: 0,
    rushingYards: 0,
    rushingTouchdowns: 0,
    fumbles: 0,
  };
}

function skillEffectValue(
  skills: readonly QbSkillDefinition[],
  type: QbSkillEffectType,
  familyId?: QbDecisionFamilyId,
  decisionId?: QbDecisionId,
): { readonly value: number; readonly skillIds: readonly SkillId[] } {
  const applied = skills.flatMap((skill) =>
    skill.effects.flatMap((effect) =>
      effect.type === type &&
      (effect.familyId === undefined || effect.familyId === familyId) &&
      (effect.decisionId === undefined || effect.decisionId === decisionId)
        ? [{ skillId: skill.id, value: effect.value }]
        : [],
    ),
  );
  return {
    value: applied.reduce((sum, effect) => sum + effect.value, 0),
    skillIds: [...new Set(applied.map(({ skillId }) => skillId))],
  };
}

function validSkillEffect(effect: QbSkillEffect): boolean {
  if (!QB_SKILL_EFFECT_TYPES.includes(effect?.type)) return false;
  if (effect.familyId !== undefined && !QB_DECISION_FAMILY_IDS.includes(effect.familyId))
    return false;
  if (
    effect.decisionId !== undefined &&
    !stablePrefixed(effect.decisionId, 'key_snap_decision_qb_')
  )
    return false;
  const bounds: Readonly<Record<QbSkillEffectType, readonly [number, number]>> = {
    qb_information_clue_bonus: [1, 2],
    qb_decision_score_flat: [1, 12],
    qb_turnover_risk_delta_permille: [-250, 250],
    qb_scramble_yards_flat: [1, 8],
    qb_body_cost_reduction: [1, 8],
    qb_confidence_loss_reduction: [1, 6],
    qb_xp_multiplier_permille: [50, 300],
    qb_grade_bonus: [1, 8],
    qb_event_choice_unlock: [1, 1],
    qb_event_positive_multiplier_permille: [50, 300],
  };
  const [minimum, maximum] = bounds[effect.type];
  return integerIn(effect.value, minimum, maximum);
}

function validSkill(skill: QbSkillDefinition): boolean {
  return (
    isSkillId(skill?.id) &&
    isSkillFamilyId(skill.familyId) &&
    isSkillGradeId(skill.gradeId) &&
    skill.positionId === 'position_qb' &&
    Array.isArray(skill.effects) &&
    skill.effects.length > 0 &&
    skill.effects.every(validSkillEffect)
  );
}

function validDecision(decision: QbDecisionDefinition): boolean {
  return (
    stablePrefixed(decision?.id, 'key_snap_decision_qb_') &&
    QB_DECISION_FAMILY_IDS.includes(decision.familyId) &&
    ['PASS', 'SCRAMBLE', 'THROW_AWAY'].includes(decision.playMode) &&
    integerIn(decision.completionModifierPermille, -300, 300) &&
    integerIn(decision.turnoverRiskModifierPermille, -300, 300) &&
    integerIn(decision.pressureResponse, -20, 20) &&
    integerIn(decision.yardModifier, -10, 15)
  );
}

function validPattern(pattern: QbPatternDefinition, decisionIds: ReadonlySet<string>): boolean {
  return (
    stablePrefixed(pattern?.id, 'key_snap_pattern_qb_') &&
    QB_DECISION_FAMILY_IDS.includes(pattern.familyId) &&
    Array.isArray(pattern.clueIds) &&
    pattern.clueIds.length === 3 &&
    new Set(pattern.clueIds).size === 3 &&
    pattern.clueIds.every((id) => stablePrefixed(id, 'game_clue_qb_')) &&
    Array.isArray(pattern.decisionFits) &&
    pattern.decisionFits.length === 3 &&
    new Set(pattern.decisionFits.map(({ decisionId }) => decisionId)).size === 3 &&
    pattern.decisionFits.every(
      ({ decisionId, fit }) => decisionIds.has(decisionId) && integerIn(fit, 0, 100),
    ) &&
    Array.isArray(pattern.attributeWeights) &&
    pattern.attributeWeights.length === 2 &&
    new Set(pattern.attributeWeights.map(({ attributeId }) => attributeId)).size === 2 &&
    pattern.attributeWeights.reduce((sum, { weightPermille }) => sum + weightPermille, 0) ===
      1_000 &&
    pattern.attributeWeights.every(
      ({ attributeId, weightPermille }) =>
        [
          'attribute_football_iq',
          'attribute_composure',
          'attribute_speed',
          'attribute_agility',
          'attribute_qb_throw_power',
          'attribute_qb_short_accuracy',
          'attribute_qb_intermediate_accuracy',
          'attribute_qb_deep_accuracy',
          'attribute_qb_pocket_presence',
          'attribute_qb_read_progression',
        ].includes(attributeId) && integerIn(weightPermille, 1, 999),
    ) &&
    integerIn(pattern.pressurePermille, 50, 900) &&
    integerIn(pattern.baseCompletionPermille, 100, 950) &&
    integerIn(pattern.baseTurnoverRiskPermille, 0, 500) &&
    integerIn(pattern.touchdownChancePermille, 0, 500) &&
    integerIn(pattern.baseYards, 0, 40)
  );
}

function inputIsValid(input: QbGameStartInput): boolean {
  if (
    !stablePrefixed(input?.gameId, 'game_qb_') ||
    (Object.hasOwn(input, 'rulesVersion') && input.rulesVersion !== TACTICAL_GAME_RULES_VERSION) ||
    !integerIn(input.weekIndex, 0, 1_000) ||
    !isProgramId(input.playerProgramId) ||
    !isProgramId(input.opponentProgramId) ||
    input.playerProgramId === input.opponentProgramId ||
    typeof input.isHome !== 'boolean' ||
    !integerIn(input.opportunityCount, 0, 5) ||
    !integerIn(input.playerTeamRating, 0, 100) ||
    !integerIn(input.opponentDefenseRating, 0, 100) ||
    !integerIn(input.opponentOffenseRating, 0, 100) ||
    !isPlayerId(input.player?.id) ||
    input.player.positionId !== 'position_qb' ||
    validatePositionAttributeProgress('position_qb', input.player.attributes).length > 0 ||
    !isIntegerWithinBounds(input.player.state?.body, BODY_BOUNDS) ||
    !isIntegerWithinBounds(input.player.state?.preparation, { min: 0, max: 100 }) ||
    !isIntegerWithinBounds(input.player.state?.confidence, CONFIDENCE_BOUNDS) ||
    !isIntegerWithinBounds(input.player.state?.coachTrust, COACH_TRUST_BOUNDS) ||
    !isRngState(input.rng) ||
    (input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
      input.opportunityCount > 0 &&
      input.rng.drawCount > Number.MAX_SAFE_INTEGER - (input.opportunityCount * 11 + 2)) ||
    !Array.isArray(input.decisions) ||
    input.decisions.length !== 12 ||
    !input.decisions.every(validDecision) ||
    new Set(input.decisions.map(({ id }) => id)).size !== 12 ||
    !Array.isArray(input.patterns) ||
    input.patterns.length !== 8 ||
    new Set(input.patterns.map(({ id }) => id)).size !== 8 ||
    !Array.isArray(input.equippedSkills) ||
    input.equippedSkills.length > 4 ||
    !input.equippedSkills.every(validSkill) ||
    new Set(input.equippedSkills.map(({ id }) => id)).size !== input.equippedSkills.length ||
    !integerIn(input.eventModifiers?.clueBonus, 0, 2) ||
    !integerIn(input.eventModifiers?.decisionScoreFlat, -10, 10) ||
    !integerIn(input.eventModifiers?.pressureReductionPermille, 0, 250) ||
    (Object.hasOwn(input, 'relationshipInformationScoreModifier') &&
      !integerIn(input.relationshipInformationScoreModifier, -6, 6))
  )
    return false;
  const decisionById = new Map(input.decisions.map((decision) => [decision.id, decision]));
  if (!input.patterns.every((pattern) => validPattern(pattern, new Set(decisionById.keys())))) {
    return false;
  }
  for (const familyId of QB_DECISION_FAMILY_IDS) {
    const familyDecisions = input.decisions.filter((decision) => decision.familyId === familyId);
    const familyPatterns = input.patterns.filter((pattern) => pattern.familyId === familyId);
    if (
      familyDecisions.length !== 3 ||
      familyPatterns.length !== 2 ||
      familyPatterns.some((pattern) =>
        pattern.decisionFits.some(
          (fit: { readonly decisionId: QbDecisionId }) =>
            decisionById.get(fit.decisionId)?.familyId !== familyId,
        ),
      )
    )
      return false;
  }
  return true;
}

function rating(
  attributes: PositionAttributeProgress,
  attributeId: MultiPositionAttributeId,
): number {
  return attributes[attributeId]!.rating;
}

function pendingSnap(active: Omit<ActiveQbGame, 'pendingSnap'>, snapIndex: number): PendingQbSnap {
  const pattern = active.patterns[(active.input.weekIndex + snapIndex) % active.patterns.length]!;
  const footballIqScore = rating(active.input.player.attributes, 'attribute_football_iq');
  const readProgressionScore = rating(
    active.input.player.attributes,
    'attribute_qb_read_progression',
  );
  const preparationScore = active.input.player.state.preparation;
  const baseScore = Math.round(
    (footballIqScore * 400 + readProgressionScore * 350 + preparationScore * 250) / 1_000,
  );
  const skillClueBonus = skillEffectValue(
    active.equippedSkills,
    'qb_information_clue_bonus',
    pattern.familyId,
  ).value;
  const eventClueBonus = active.input.eventModifiers.clueBonus;
  const relationshipInformationScoreModifier =
    active.input.relationshipInformationScoreModifier ?? 0;
  const finalScore = clamp(baseScore + relationshipInformationScoreModifier, 0, 100);
  const clueCount = clamp(
    (finalScore >= 65 ? 2 : finalScore >= 45 ? 1 : 0) + skillClueBonus + eventClueBonus,
    0,
    3,
  );
  return {
    snapIndex,
    patternId: pattern.id,
    familyId: pattern.familyId,
    decisionIds: pattern.decisionFits.map(
      (fit: { readonly decisionId: QbDecisionId }) => fit.decisionId,
    ) as [QbDecisionId, QbDecisionId, QbDecisionId],
    revealedClueIds: pattern.clueIds.slice(0, clueCount),
    information: {
      footballIqScore,
      readProgressionScore,
      preparationScore,
      baseScore,
      skillClueBonus,
      eventClueBonus,
      ...(Object.hasOwn(active.input, 'relationshipInformationScoreModifier')
        ? { relationshipInformationScoreModifier }
        : {}),
      finalScore,
      clueCount,
    },
  };
}

function mappedDraw(rng: RngState, minimum: number, maximumInclusive: number) {
  const sample = nextUint32(rng);
  return {
    value: minimum + Math.floor((sample.value * (maximumInclusive - minimum + 1)) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

function withPendingSnap(
  active: Omit<ActiveQbGame, 'pendingSnap'>,
  snapIndex: number,
): ActiveQbGame | undefined {
  const pending = pendingSnap(active, snapIndex);
  if (active.input.rulesVersion === undefined) return { ...active, pendingSnap: pending };
  const prepared = prepareTacticalAlphaSnapV1({
    ...active.input,
    positionId: 'position_qb',
    snapIndex,
    decisionIds: pending.decisionIds,
    revealedClueIds: pending.revealedClueIds,
    score: active.keyPlayLog.at(-1)?.tacticalResult?.scoreAfter ?? { playerTeam: 0, opponent: 0 },
    rng: active.rng,
  });
  return prepared === undefined
    ? undefined
    : {
        ...active,
        rng: prepared.rng,
        pendingSnap: { ...pending, tacticalContext: prepared.context },
      };
}

function tacticalPendingIsValid(active: ActiveQbGame): boolean {
  const context = active.pendingSnap.tacticalContext;
  if (active.input.rulesVersion === undefined) return context === undefined;
  return (
    active.input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
    matchesTacticalSnapContextV1(context, {
      ...active.pendingSnap,
      gameId: active.input.gameId,
      positionId: 'position_qb',
    })
  );
}

function addStats(stats: QbGameStatLine, play: QbSnapPlayEvidence): QbGameStatLine {
  const isPass = ['COMPLETION', 'INCOMPLETION', 'INTERCEPTION', 'THROW_AWAY'].includes(
    play.playResult,
  );
  return {
    passAttempts: stats.passAttempts + (isPass ? 1 : 0),
    completions: stats.completions + (play.playResult === 'COMPLETION' ? 1 : 0),
    passingYards: stats.passingYards + play.passingYardsDelta,
    passingTouchdowns: stats.passingTouchdowns + play.passingTouchdownDelta,
    interceptions: stats.interceptions + play.interceptionDelta,
    sacksTaken: stats.sacksTaken + play.sackDelta,
    rushAttempts: stats.rushAttempts + (play.playResult === 'SCRAMBLE' ? 1 : 0),
    rushingYards: stats.rushingYards + play.rushingYardsDelta,
    rushingTouchdowns: stats.rushingTouchdowns + play.rushingTouchdownDelta,
    fumbles: stats.fumbles + play.fumbleDelta,
  };
}

function applyGrowth(
  input: ActiveQbGame['input'],
  patterns: readonly QbPatternDefinition[],
  log: readonly QbSnapPlayEvidence[],
  skills: readonly QbSkillDefinition[],
  gradeScore: number,
): { readonly nextPlayer: QbPlayerGameState; readonly growth: QbPostGameGrowthEvidence } {
  const attributes = Object.fromEntries(
    Object.entries(input.player.attributes).map(([id, progress]) => [id, { ...progress! }]),
  ) as Record<MultiPositionAttributeId, { rating: number; xp: number }>;
  const xpByAttribute = new Map<MultiPositionAttributeId, number>();
  for (const play of log) {
    const pattern = patterns.find(({ id }) => id === play.patternId)!;
    const baseXp = 12 + Math.floor(play.decisionFit / 10);
    for (const { attributeId, weightPermille } of pattern.attributeWeights) {
      xpByAttribute.set(
        attributeId,
        (xpByAttribute.get(attributeId) ?? 0) + Math.round((baseXp * weightPermille) / 1_000),
      );
    }
  }
  const xpMultiplier = 1_000 + skillEffectValue(skills, 'qb_xp_multiplier_permille').value;
  const attributeXp: QbAttributeGrowthEvidence[] = [];
  for (const [attributeId, baseXp] of [...xpByAttribute.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const before = attributes[attributeId]!;
    const awardedXp = Math.round((baseXp * xpMultiplier) / 1_000);
    let ratingAfter = before.rating;
    let xpAfter = before.xp + awardedXp;
    while (ratingAfter < 100 && xpAfter >= ATTRIBUTE_XP_PER_RATING) {
      ratingAfter += 1;
      xpAfter -= ATTRIBUTE_XP_PER_RATING;
    }
    if (ratingAfter === 100) xpAfter = 0;
    const appliedXp = (ratingAfter - before.rating) * ATTRIBUTE_XP_PER_RATING + xpAfter - before.xp;
    attributes[attributeId] = { rating: ratingAfter, xp: xpAfter };
    attributeXp.push({
      attributeId,
      ratingBefore: before.rating,
      xpBefore: before.xp,
      awardedXp,
      appliedXp,
      ratingAfter,
      xpAfter,
    });
  }
  const bodyReduction = skillEffectValue(skills, 'qb_body_cost_reduction').value;
  const requestedBodyDelta = -Math.max(0, 2 + input.opportunityCount * 2 - bodyReduction);
  const bodyAfter = clamp(input.player.state.body + requestedBodyDelta, 0, 100);
  const bandDelta =
    gradeScore >= 85 ? 3 : gradeScore >= 70 ? 1 : gradeScore < 45 ? -3 : gradeScore < 60 ? -1 : 0;
  const lossReduction = skillEffectValue(skills, 'qb_confidence_loss_reduction').value;
  const requestedConfidenceDelta =
    bandDelta < 0 ? Math.min(0, bandDelta + lossReduction) : bandDelta;
  const confidenceAfter = clamp(input.player.state.confidence + requestedConfidenceDelta, 0, 100);
  const requestedCoachTrustDelta =
    gradeScore >= 85 ? 4 : gradeScore >= 70 ? 2 : gradeScore < 45 ? -4 : gradeScore < 60 ? -2 : 0;
  const coachTrustAfter = clamp(input.player.state.coachTrust + requestedCoachTrustDelta, 0, 100);
  const growth: QbPostGameGrowthEvidence = {
    bodyBefore: input.player.state.body,
    requestedBodyDelta,
    actualBodyDelta: bodyAfter - input.player.state.body,
    bodyAfter,
    confidenceBefore: input.player.state.confidence,
    requestedConfidenceDelta,
    actualConfidenceDelta: confidenceAfter - input.player.state.confidence,
    confidenceAfter,
    coachTrustBefore: input.player.state.coachTrust,
    requestedCoachTrustDelta,
    actualCoachTrustDelta: coachTrustAfter - input.player.state.coachTrust,
    coachTrustAfter,
    attributeXp,
  };
  return {
    growth,
    nextPlayer: {
      ...input.player,
      attributes,
      state: {
        ...input.player.state,
        body: bodyAfter,
        confidence: confidenceAfter,
        coachTrust: coachTrustAfter,
      },
    },
  };
}

function completeGame(active: Omit<ActiveQbGame, 'pendingSnap'>): CompleteQbGame {
  const stats = active.statLine;
  const opportunities = active.input.opportunityCount;
  const completionScore =
    stats.passAttempts === 0 ? 50 : Math.round((stats.completions * 100) / stats.passAttempts);
  const averageFit =
    active.keyPlayLog.length === 0
      ? 50
      : Math.round(
          active.keyPlayLog.reduce((sum, play) => sum + play.decisionFit, 0) /
            active.keyPlayLog.length,
        );
  const gradeBonus = skillEffectValue(active.equippedSkills, 'qb_grade_bonus').value;
  const gradeScore = clamp(
    45 +
      Math.round((completionScore - 50) / 4) +
      Math.round((stats.passingYards + stats.rushingYards) / Math.max(4, opportunities * 6)) +
      (stats.passingTouchdowns + stats.rushingTouchdowns) * 8 -
      stats.interceptions * 14 -
      stats.fumbles * 12 -
      stats.sacksTaken * 3 +
      Math.round((averageFit - 50) / 5) +
      gradeBonus,
    0,
    100,
  );
  const playerBaseScore = clamp(
    17 + Math.round((active.input.playerTeamRating - active.input.opponentDefenseRating) / 4),
    7,
    35,
  );
  let opponentScore = clamp(
    17 + Math.round((active.input.opponentOffenseRating - active.input.playerTeamRating) / 4),
    7,
    35,
  );
  let playerTeamScore = clamp(playerBaseScore + active.playerTeamTouchdowns * 7, 0, 70);
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
  const gradeBandId =
    gradeScore >= 85
      ? 'performance_grade_elite'
      : gradeScore >= 70
        ? 'performance_grade_strong'
        : gradeScore >= 55
          ? 'performance_grade_steady'
          : gradeScore >= 40
            ? 'performance_grade_shaky'
            : 'performance_grade_poor';
  const resultId =
    playerTeamScore > opponentScore
      ? 'game_result_win'
      : playerTeamScore < opponentScore
        ? 'game_result_loss'
        : 'game_result_tie';
  const growthResult = applyGrowth(
    active.input,
    active.patterns,
    active.keyPlayLog,
    active.equippedSkills,
    gradeScore,
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
      resultId,
      opportunityCount: opportunities,
      statLine: stats,
      gradeScore,
      gradeBandId,
      participationFeedbackId:
        opportunities === 0
          ? 'game_participation_qb_signal_review'
          : 'game_participation_qb_offense',
      gameRngDrawCountBefore: active.gameRngDrawCountBefore,
      gameRngDrawCountAfter: completedRng.drawCount,
    },
    growth: growthResult.growth,
    keyPlayLog: active.keyPlayLog,
    nextPlayer: growthResult.nextPlayer,
    rng: completedRng,
  };
}

export function startQbGame(input: QbGameStartInput): QbGameResult {
  if (!inputIsValid(input)) {
    return deepFreeze({ ok: false as const, reason: 'qb_game.invalid_input' as const });
  }
  const activeBase: Omit<ActiveQbGame, 'pendingSnap'> = {
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
    keyPlayLog: [],
    patterns: [...input.patterns].sort((left, right) => left.id.localeCompare(right.id)),
    decisions: [...input.decisions].sort((left, right) => left.id.localeCompare(right.id)),
    equippedSkills: [...input.equippedSkills].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  };
  const state =
    input.opportunityCount === 0 ? completeGame(activeBase) : withPendingSnap(activeBase, 0);
  if (state === undefined)
    return deepFreeze({ ok: false as const, reason: 'qb_game.invalid_input' as const });
  return deepFreeze({
    ok: true as const,
    state: input.rulesVersion === undefined ? state : cloneSerializable(state),
  });
}

export function resolveQbSnap(active: ActiveQbGame, decisionId: unknown): QbGameResult {
  const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId);
  const decision = active.decisions.find(({ id }) => id === decisionId);
  const fit = pattern?.decisionFits.find((entry) => entry.decisionId === decisionId)?.fit;
  if (
    pattern === undefined ||
    decision === undefined ||
    fit === undefined ||
    decision.familyId !== pattern.familyId ||
    !active.pendingSnap.decisionIds.includes(decision.id) ||
    !isRngState(active.rng) ||
    !tacticalPendingIsValid(active) ||
    (active.input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
      active.rng.drawCount >
        Number.MAX_SAFE_INTEGER -
          (active.keyPlayLog.length + 1 >= active.input.opportunityCount ? 8 : 11))
  ) {
    return deepFreeze({ ok: false as const, reason: 'qb_game.invalid_decision' as const });
  }
  const before = active.rng.drawCount;
  const pressureDraw = mappedDraw(active.rng, 0, 999);
  const executionDraw = mappedDraw(pressureDraw.rng, 0, 999);
  const completionDraw = mappedDraw(executionDraw.rng, 0, 999);
  const turnoverDraw = mappedDraw(completionDraw.rng, 0, 999);
  const touchdownDraw = mappedDraw(turnoverDraw.rng, 0, 999);
  const yardDraw = mappedDraw(touchdownDraw.rng, -3, 3);
  const attributeScore = Math.round(
    pattern.attributeWeights.reduce(
      (sum, { attributeId, weightPermille }) =>
        sum + rating(active.input.player.attributes, attributeId) * weightPermille,
      0,
    ) / 1_000,
  );
  const matchupScore = 100 - active.input.opponentDefenseRating;
  const teamContextScore = active.input.playerTeamRating;
  const skillScore = skillEffectValue(
    active.equippedSkills,
    'qb_decision_score_flat',
    pattern.familyId,
    decision.id,
  );
  const skillTurnover = skillEffectValue(
    active.equippedSkills,
    'qb_turnover_risk_delta_permille',
    pattern.familyId,
    decision.id,
  );
  const scrambleYards = skillEffectValue(
    active.equippedSkills,
    'qb_scramble_yards_flat',
    pattern.familyId,
    decision.id,
  );
  const weightedScoreMilli =
    attributeScore * 300 +
    fit * 200 +
    matchupScore * 200 +
    active.input.player.state.body * 80 +
    active.input.player.state.preparation * 70 +
    active.input.player.state.confidence * 50 +
    teamContextScore * 100;
  const eventAdjustment = active.input.eventModifiers.decisionScoreFlat;
  const finalScore = clamp(
    Math.round(weightedScoreMilli / 1_000) + skillScore.value + eventAdjustment,
    0,
    100,
  );
  const pocketPresence = rating(active.input.player.attributes, 'attribute_qb_pocket_presence');
  const pressureChancePermille = clamp(
    pattern.pressurePermille -
      Math.round((pocketPresence - 50) * 3) -
      active.input.eventModifiers.pressureReductionPermille,
    20,
    950,
  );
  const pressured = pressureDraw.value < pressureChancePermille;
  const sack =
    pressured &&
    decision.playMode !== 'THROW_AWAY' &&
    executionDraw.value >= clamp(finalScore * 10 + decision.pressureResponse * 10, 50, 950);
  const completionChancePermille = clamp(
    pattern.baseCompletionPermille + decision.completionModifierPermille + (finalScore - 50) * 4,
    50,
    950,
  );
  const turnoverRiskPermille = clamp(
    pattern.baseTurnoverRiskPermille +
      decision.turnoverRiskModifierPermille +
      skillTurnover.value +
      (pressured ? 70 : 0) +
      // v2 (M12): a sharp read throws where the look leaves room; a misread forces the ball.
      (sceneRulesAt(active.input.sceneRules, 2)
        ? (60 - fit) * SCENE_RULES_V2_TUNING.qbTurnoverPerFitPoint
        : 0),
    0,
    700,
  );
  const touchdownChancePermille = clamp(
    pattern.touchdownChancePermille + Math.max(0, finalScore - 60) * 3,
    0,
    700,
  );
  let playResult: QbSnapPlayEvidence['playResult'];
  let passingYardsDelta = 0;
  let passingTouchdownDelta: 0 | 1 = 0;
  let interceptionDelta: 0 | 1 = 0;
  let sackDelta: 0 | 1 = 0;
  let rushingYardsDelta = 0;
  let rushingTouchdownDelta: 0 | 1 = 0;
  let fumbleDelta: 0 | 1 = 0;
  if (decision.playMode === 'THROW_AWAY') {
    playResult = 'THROW_AWAY';
  } else if (sack) {
    playResult = 'SACK';
    sackDelta = 1;
    fumbleDelta = turnoverDraw.value < Math.round(turnoverRiskPermille / 2) ? 1 : 0;
  } else if (decision.playMode === 'SCRAMBLE') {
    playResult = 'SCRAMBLE';
    rushingYardsDelta = Math.max(
      0,
      pattern.baseYards + decision.yardModifier + yardDraw.value + scrambleYards.value,
    );
    fumbleDelta = turnoverDraw.value < turnoverRiskPermille ? 1 : 0;
    // A slide ends the run where it is: no breakaway score under scene rules.
    const givesUp = sceneRulesAt(active.input.sceneRules, 1) && decision.yardModifier < 0;
    rushingTouchdownDelta = !givesUp && touchdownDraw.value < touchdownChancePermille ? 1 : 0;
  } else if (turnoverDraw.value < turnoverRiskPermille) {
    playResult = 'INTERCEPTION';
    interceptionDelta = 1;
  } else if (completionDraw.value < completionChancePermille) {
    playResult = 'COMPLETION';
    passingYardsDelta = Math.max(0, pattern.baseYards + decision.yardModifier + yardDraw.value);
    passingTouchdownDelta = touchdownDraw.value < touchdownChancePermille ? 1 : 0;
  } else {
    playResult = 'INCOMPLETION';
  }
  let tacticalResult: TacticalSnapResultV1 | undefined;
  if (active.input.rulesVersion === TACTICAL_GAME_RULES_VERSION) {
    tacticalResult = resolveTacticalFieldV1(active.pendingSnap.tacticalContext!, {
      decisionId: decision.id,
      kind:
        playResult === 'COMPLETION' || playResult === 'SCRAMBLE'
          ? 'ADVANCE'
          : playResult === 'SACK'
            ? 'SACK'
            : playResult === 'INTERCEPTION'
              ? 'INTERCEPTION'
              : 'INCOMPLETE',
      yards:
        playResult === 'INTERCEPTION' ? pattern.baseYards : passingYardsDelta + rushingYardsDelta,
      touchdown: passingTouchdownDelta === 1 || rushingTouchdownDelta === 1,
      fumbleLost: fumbleDelta === 1,
    });
    if (tacticalResult === undefined)
      return deepFreeze({ ok: false as const, reason: 'qb_game.invalid_input' as const });
    if (playResult === 'COMPLETION') {
      passingYardsDelta = tacticalResult.ball.offenseYards!;
      passingTouchdownDelta = tacticalResult.ball.outcome === 'TOUCHDOWN' ? 1 : 0;
    } else if (playResult === 'SCRAMBLE') {
      rushingYardsDelta = tacticalResult.ball.offenseYards!;
      rushingTouchdownDelta = tacticalResult.ball.outcome === 'TOUCHDOWN' ? 1 : 0;
    }
  }
  const appliedSkillIds = [
    ...new Set([...skillScore.skillIds, ...skillTurnover.skillIds, ...scrambleYards.skillIds]),
  ];
  const play: QbSnapPlayEvidence = {
    ...(tacticalResult === undefined ? {} : { tacticalResult }),
    snapIndex: active.pendingSnap.snapIndex,
    patternId: pattern.id,
    familyId: pattern.familyId,
    decisionId: decision.id,
    playResult,
    passingYardsDelta,
    passingTouchdownDelta,
    interceptionDelta,
    sackDelta,
    rushingYardsDelta,
    rushingTouchdownDelta,
    fumbleDelta,
    decisionFit: fit,
    resolution: {
      attributeScore,
      attributeContributionMilli: attributeScore * 300,
      decisionFit: fit,
      decisionContributionMilli: fit * 200,
      matchupScore,
      matchupContributionMilli: matchupScore * 200,
      bodyContributionMilli: active.input.player.state.body * 80,
      preparationContributionMilli: active.input.player.state.preparation * 70,
      confidenceContributionMilli: active.input.player.state.confidence * 50,
      teamContextContributionMilli: teamContextScore * 100,
      skillAdjustment: skillScore.value,
      eventAdjustment,
      weightedScoreMilli,
      finalScore,
      pressureChancePermille,
      completionChancePermille,
      turnoverRiskPermille,
      touchdownChancePermille,
      pressureRoll: pressureDraw.value,
      executionRoll: executionDraw.value,
      completionRoll: completionDraw.value,
      turnoverRoll: turnoverDraw.value,
      touchdownRoll: touchdownDraw.value,
      yardVariation: yardDraw.value,
    },
    rngDrawCountBefore: before,
    rngDrawCountAfter: yardDraw.rng.drawCount,
    appliedSkillIds,
  };
  const log = [...active.keyPlayLog, play];
  const nextBase: Omit<ActiveQbGame, 'pendingSnap'> = {
    ...active,
    rng: yardDraw.rng,
    statLine: addStats(active.statLine, play),
    playerTeamTouchdowns:
      active.playerTeamTouchdowns + passingTouchdownDelta + rushingTouchdownDelta,
    keyPlayLog: log,
  };
  const state =
    log.length >= active.input.opportunityCount
      ? completeGame(nextBase)
      : withPendingSnap(nextBase, log.length);
  if (state === undefined)
    return deepFreeze({ ok: false as const, reason: 'qb_game.invalid_input' as const });
  return deepFreeze({
    ok: true as const,
    state: active.input.rulesVersion === undefined ? state : cloneSerializable(state),
  });
}

export function projectQbWorldAlphaResult(
  summary: QbGameSummary,
  fixture: WorldAlphaFixtureMechanics,
): QbWorldResultProjection {
  const expectedHomeProgramId = summary.isHome
    ? summary.playerProgramId
    : summary.opponentProgramId;
  const expectedAwayProgramId = summary.isHome
    ? summary.opponentProgramId
    : summary.playerProgramId;
  if (
    fixture.homeProgramId !== expectedHomeProgramId ||
    fixture.awayProgramId !== expectedAwayProgramId
  ) {
    return deepFreeze({ ok: false as const, reason: 'qb_game.fixture_mismatch' as const });
  }
  const homeScore = summary.isHome ? summary.playerTeamScore : summary.opponentScore;
  const awayScore = summary.isHome ? summary.opponentScore : summary.playerTeamScore;
  return deepFreeze({
    ok: true as const,
    result: {
      model: 'player_game_alpha_v1' as const,
      fixtureId: fixture.id,
      homeScore,
      awayScore,
      winnerProgramId:
        homeScore > awayScore
          ? fixture.homeProgramId
          : awayScore > homeScore
            ? fixture.awayProgramId
            : null,
    },
  });
}
