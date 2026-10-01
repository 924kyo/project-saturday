import {
  prepareTacticalAlphaSnapV1,
  resolveTacticalAlphaBackgroundV1,
  resolveTacticalFieldV1,
  SCENE_RULES_VERSION,
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

export const CB_DECISION_FAMILY_IDS = Object.freeze([
  'key_snap_family_cb_leverage',
  'key_snap_family_cb_coverage',
  'key_snap_family_cb_ball',
  'key_snap_family_cb_tackle',
] as const);
export const CB_SKILL_EFFECT_TYPES = Object.freeze([
  'cb_information_clue_bonus',
  'cb_decision_score_flat',
  'cb_completion_risk_delta_permille',
  'cb_takeaway_chance_delta_permille',
  'cb_tackle_score_flat',
  'cb_body_cost_reduction',
  'cb_confidence_loss_reduction',
  'cb_xp_multiplier_permille',
  'cb_grade_bonus',
  'cb_event_choice_unlock',
  'cb_event_positive_multiplier_permille',
] as const);
export type CbDecisionFamilyId = (typeof CB_DECISION_FAMILY_IDS)[number];
export type CbDecisionId = `key_snap_decision_cb_${string}`;
export type CbPatternId = `key_snap_pattern_cb_${string}`;
export type CbClueId = `game_clue_cb_${string}`;
export type CbSkillEffectType = (typeof CB_SKILL_EFFECT_TYPES)[number];

export interface CbDecisionDefinition {
  readonly id: CbDecisionId;
  readonly familyId: CbDecisionFamilyId;
  readonly mode: 'COVERAGE' | 'BALL' | 'TACKLE';
  readonly disruptionModifierPermille: number;
  readonly completionRiskModifierPermille: number;
  readonly takeawayModifierPermille: number;
  readonly bodyExposure: number;
}
export interface CbPatternDefinition {
  readonly id: CbPatternId;
  readonly familyId: CbDecisionFamilyId;
  readonly clueIds: readonly [CbClueId, CbClueId, CbClueId];
  readonly decisionFits: readonly [
    { readonly decisionId: CbDecisionId; readonly fit: number },
    { readonly decisionId: CbDecisionId; readonly fit: number },
    { readonly decisionId: CbDecisionId; readonly fit: number },
  ];
  readonly attributeWeights: readonly [
    { readonly attributeId: MultiPositionAttributeId; readonly weightPermille: number },
    { readonly attributeId: MultiPositionAttributeId; readonly weightPermille: number },
  ];
  readonly targetPermille: number;
  readonly baseDisruptionPermille: number;
  readonly baseCompletionRiskPermille: number;
  readonly takeawayChancePermille: number;
  readonly touchdownRiskPermille: number;
  readonly baseYardsAllowed: number;
}
export interface CbSkillEffect {
  readonly type: CbSkillEffectType;
  readonly value: number;
  readonly familyId?: CbDecisionFamilyId;
  readonly decisionId?: CbDecisionId;
}
export interface CbSkillDefinition {
  readonly id: SkillId;
  readonly familyId: SkillFamilyId;
  readonly gradeId: SkillGradeId;
  readonly positionId: 'position_cb';
  readonly effects: readonly CbSkillEffect[];
}
export interface CbEventGameModifiers {
  readonly clueBonus: number;
  readonly decisionScoreFlat: number;
  readonly targetReductionPermille: number;
}
export interface CbPlayerGameState {
  readonly id: PlayerId;
  readonly positionId: 'position_cb';
  readonly attributes: PositionAttributeProgress;
  readonly state: {
    readonly body: number;
    readonly preparation: number;
    readonly confidence: number;
    readonly coachTrust: number;
  };
}
export interface CbGameStartInput {
  /** Explicit opt-in for a newly started game; absence preserves literal historical rules. */
  readonly rulesVersion?: typeof TACTICAL_GAME_RULES_VERSION;
  /**
   * Scene-consistent outcomes (VNext sets it for the snap it resolves): a ball already in the
   * air is thrown at the player, a catch already made is a catch, and a strip after the catch
   * is a forced fumble rather than an interception. Absent, the literal historical rules apply.
   */
  readonly sceneRules?: typeof SCENE_RULES_VERSION;
  readonly gameId: `game_cb_${string}`;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly opportunityCount: number;
  readonly playerTeamRating: number;
  readonly opponentOffenseRating: number;
  readonly opponentDefenseRating: number;
  readonly player: CbPlayerGameState;
  readonly patterns: readonly CbPatternDefinition[];
  readonly decisions: readonly CbDecisionDefinition[];
  readonly equippedSkills: readonly CbSkillDefinition[];
  readonly eventModifiers: CbEventGameModifiers;
  /** Absent on historical inputs; current relationship evidence contributes score, not free clues. */
  readonly relationshipInformationScoreModifier?: number;
  readonly rng: RngState;
}
export interface CbGameStatLine {
  readonly coverageSnaps: number;
  readonly targets: number;
  readonly completionsAllowed: number;
  readonly yardsAllowed: number;
  readonly touchdownsAllowed: number;
  readonly passesDefended: number;
  readonly interceptions: number;
  readonly tackles: number;
  readonly missedTackles: number;
}
export interface PendingCbSnap {
  readonly tacticalContext?: TacticalSnapContextV1;
  readonly snapIndex: number;
  readonly patternId: CbPatternId;
  readonly familyId: CbDecisionFamilyId;
  readonly decisionIds: readonly [CbDecisionId, CbDecisionId, CbDecisionId];
  readonly revealedClueIds: readonly CbClueId[];
  readonly information: {
    readonly footballIqScore: number;
    readonly coverageScore: number;
    readonly preparationScore: number;
    readonly finalScore: number;
    readonly clueCount: number;
    readonly skillClueBonus: number;
    readonly eventClueBonus: number;
    readonly relationshipInformationScoreModifier?: number;
  };
}
export interface CbSnapPlayEvidence {
  readonly tacticalResult?: TacticalSnapResultV1;
  readonly snapIndex: number;
  readonly patternId: CbPatternId;
  readonly familyId: CbDecisionFamilyId;
  readonly decisionId: CbDecisionId;
  readonly playResult:
    | 'NO_TARGET'
    | 'COVERED'
    | 'COMPLETION_ALLOWED'
    | 'PASS_DEFENDED'
    | 'INTERCEPTION'
    | 'TACKLE'
    | 'MISSED_TACKLE'
    | 'FORCED_FUMBLE';
  readonly targeted: boolean;
  readonly completionAllowed: 0 | 1;
  readonly yardsAllowed: number;
  readonly touchdownAllowed: 0 | 1;
  readonly passDefended: 0 | 1;
  readonly interception: 0 | 1;
  readonly tackle: 0 | 1;
  readonly missedTackle: 0 | 1;
  readonly decisionFit: number;
  readonly bodyExposure: number;
  readonly resolution: {
    readonly attributeScore: number;
    readonly decisionFit: number;
    readonly matchupScore: number;
    readonly finalScore: number;
    readonly targetChancePermille: number;
    readonly disruptionChancePermille: number;
    readonly completionRiskPermille: number;
    readonly takeawayChancePermille: number;
    readonly touchdownRiskPermille: number;
    readonly releaseRoll: number;
    readonly executionRoll: number;
    readonly targetRoll: number;
    readonly completionRoll: number;
    readonly takeawayRoll: number;
    readonly yardVariation: number;
    readonly skillAdjustment: number;
    readonly eventAdjustment: number;
  };
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
  readonly appliedSkillIds: readonly SkillId[];
}
export interface ActiveCbGame {
  readonly type: 'ACTIVE';
  readonly input: Omit<CbGameStartInput, 'patterns' | 'decisions' | 'equippedSkills' | 'rng'>;
  readonly gameRngDrawCountBefore: number;
  readonly rng: RngState;
  readonly statLine: CbGameStatLine;
  readonly opponentTouchdowns: number;
  readonly totalBodyExposure: number;
  readonly keyPlayLog: readonly CbSnapPlayEvidence[];
  readonly pendingSnap: PendingCbSnap;
  readonly patterns: readonly CbPatternDefinition[];
  readonly decisions: readonly CbDecisionDefinition[];
  readonly equippedSkills: readonly CbSkillDefinition[];
}
export interface CompleteCbGame {
  readonly type: 'COMPLETE';
  readonly summary: {
    readonly rulesVersion?: typeof TACTICAL_GAME_RULES_VERSION;
    readonly gameId: `game_cb_${string}`;
    readonly weekIndex: number;
    readonly playerProgramId: ProgramId;
    readonly opponentProgramId: ProgramId;
    readonly isHome: boolean;
    readonly playerTeamScore: number;
    readonly opponentScore: number;
    readonly resultId: 'game_result_win' | 'game_result_loss' | 'game_result_tie';
    readonly opportunityCount: number;
    readonly statLine: CbGameStatLine;
    readonly gradeScore: number;
    readonly participationFeedbackId:
      'game_participation_cb_coverage' | 'game_participation_cb_scout_review';
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
  readonly keyPlayLog: readonly CbSnapPlayEvidence[];
  readonly nextPlayer: CbPlayerGameState;
  readonly rng: RngState;
}
export type CbGameState = ActiveCbGame | CompleteCbGame;
export type CbGameResult =
  | { readonly ok: true; readonly state: CbGameState }
  | { readonly ok: false; readonly reason: 'cb_game.invalid_input' | 'cb_game.invalid_decision' };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const integerIn = (v: unknown, min: number, max: number): v is number =>
  Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const prefixed = (v: unknown, p: string): v is string =>
  typeof v === 'string' && v.startsWith(p) && /^[a-z0-9_]+$/u.test(v);
const rating = (a: PositionAttributeProgress, id: MultiPositionAttributeId) => a[id]!.rating;
function skillValue(
  skills: readonly CbSkillDefinition[],
  type: CbSkillEffectType,
  familyId?: CbDecisionFamilyId,
  decisionId?: CbDecisionId,
) {
  const rows = skills.flatMap((card) =>
    card.effects.flatMap((effect) =>
      effect.type === type &&
      (effect.familyId === undefined || effect.familyId === familyId) &&
      (effect.decisionId === undefined || effect.decisionId === decisionId)
        ? [{ id: card.id, value: effect.value }]
        : [],
    ),
  );
  return {
    value: rows.reduce((sum, row) => sum + row.value, 0),
    ids: [...new Set(rows.map(({ id }) => id))].sort(),
  };
}
function validInput(input: CbGameStartInput): boolean {
  if (
    !prefixed(input?.gameId, 'game_cb_') ||
    (Object.hasOwn(input, 'rulesVersion') && input.rulesVersion !== TACTICAL_GAME_RULES_VERSION) ||
    !integerIn(input.weekIndex, 0, 1000) ||
    !isProgramId(input.playerProgramId) ||
    !isProgramId(input.opponentProgramId) ||
    input.playerProgramId === input.opponentProgramId ||
    !integerIn(input.opportunityCount, 0, 5) ||
    !integerIn(input.playerTeamRating, 0, 100) ||
    !integerIn(input.opponentOffenseRating, 0, 100) ||
    !integerIn(input.opponentDefenseRating, 0, 100) ||
    !isPlayerId(input.player?.id) ||
    input.player.positionId !== 'position_cb' ||
    validatePositionAttributeProgress('position_cb', input.player.attributes).length > 0 ||
    !isIntegerWithinBounds(input.player.state.body, BODY_BOUNDS) ||
    !integerIn(input.player.state.preparation, 0, 100) ||
    !isIntegerWithinBounds(input.player.state.confidence, CONFIDENCE_BOUNDS) ||
    !isIntegerWithinBounds(input.player.state.coachTrust, COACH_TRUST_BOUNDS) ||
    !isRngState(input.rng) ||
    (input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
      input.opportunityCount > 0 &&
      input.rng.drawCount > Number.MAX_SAFE_INTEGER - (input.opportunityCount * 11 + 2)) ||
    input.decisions.length !== 12 ||
    input.patterns.length !== 8 ||
    input.equippedSkills.length > 4 ||
    !integerIn(input.eventModifiers?.clueBonus, 0, 2) ||
    !integerIn(input.eventModifiers?.decisionScoreFlat, -10, 10) ||
    !integerIn(input.eventModifiers?.targetReductionPermille, 0, 250) ||
    (Object.hasOwn(input, 'relationshipInformationScoreModifier') &&
      !integerIn(input.relationshipInformationScoreModifier, -6, 6))
  )
    return false;
  if (
    new Set(input.decisions.map(({ id }) => id)).size !== 12 ||
    new Set(input.patterns.map(({ id }) => id)).size !== 8
  )
    return false;
  const byDecision = new Map(input.decisions.map((d) => [d.id, d]));
  for (const d of input.decisions)
    if (
      !prefixed(d.id, 'key_snap_decision_cb_') ||
      !CB_DECISION_FAMILY_IDS.includes(d.familyId) ||
      !['COVERAGE', 'BALL', 'TACKLE'].includes(d.mode) ||
      !integerIn(d.disruptionModifierPermille, -300, 300) ||
      !integerIn(d.completionRiskModifierPermille, -250, 250) ||
      !integerIn(d.takeawayModifierPermille, -250, 250) ||
      !integerIn(d.bodyExposure, 0, 8)
    )
      return false;
  for (const p of input.patterns)
    if (
      !prefixed(p.id, 'key_snap_pattern_cb_') ||
      !CB_DECISION_FAMILY_IDS.includes(p.familyId) ||
      p.clueIds.length !== 3 ||
      new Set(p.clueIds).size !== 3 ||
      !p.clueIds.every((id) => prefixed(id, 'game_clue_cb_')) ||
      p.decisionFits.length !== 3 ||
      !p.decisionFits.every(
        ({ decisionId, fit }) =>
          byDecision.get(decisionId)?.familyId === p.familyId && integerIn(fit, 0, 100),
      ) ||
      p.attributeWeights.length !== 2 ||
      new Set(p.attributeWeights.map(({ attributeId }) => attributeId)).size !== 2 ||
      p.attributeWeights.reduce((s, x) => s + x.weightPermille, 0) !== 1000 ||
      !p.attributeWeights.every(
        ({ attributeId, weightPermille }) =>
          input.player.attributes[attributeId] !== undefined && integerIn(weightPermille, 1, 999),
      ) ||
      !integerIn(p.targetPermille, 0, 950) ||
      !integerIn(p.baseDisruptionPermille, 0, 950) ||
      !integerIn(p.baseCompletionRiskPermille, 0, 950) ||
      !integerIn(p.takeawayChancePermille, 0, 500) ||
      !integerIn(p.touchdownRiskPermille, 0, 500) ||
      !integerIn(p.baseYardsAllowed, 0, 40)
    )
      return false;
  for (const f of CB_DECISION_FAMILY_IDS)
    if (
      input.decisions.filter((d) => d.familyId === f).length !== 3 ||
      input.patterns.filter((p) => p.familyId === f).length !== 2
    )
      return false;
  for (const s of input.equippedSkills)
    if (
      !isSkillId(s.id) ||
      !isSkillFamilyId(s.familyId) ||
      !isSkillGradeId(s.gradeId) ||
      s.positionId !== 'position_cb' ||
      s.effects.length < 1 ||
      !s.effects.every(
        (e) => CB_SKILL_EFFECT_TYPES.includes(e.type) && integerIn(e.value, -500, 500),
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
function pending(active: Omit<ActiveCbGame, 'pendingSnap'>, index: number): PendingCbSnap {
  const p = active.patterns[(active.input.weekIndex + index) % active.patterns.length]!;
  const footballIqScore = rating(active.input.player.attributes, 'attribute_football_iq');
  const coverageScore = Math.round(
    (rating(active.input.player.attributes, 'attribute_cb_man_coverage') +
      rating(active.input.player.attributes, 'attribute_cb_zone_coverage')) /
      2,
  );
  const preparationScore = active.input.player.state.preparation;
  const skillClueBonus = skillValue(
    active.equippedSkills,
    'cb_information_clue_bonus',
    p.familyId,
  ).value;
  const eventClueBonus = active.input.eventModifiers.clueBonus;
  const relationshipInformationScoreModifier =
    active.input.relationshipInformationScoreModifier ?? 0;
  const finalScore = clamp(
    Math.round((footballIqScore * 350 + coverageScore * 400 + preparationScore * 250) / 1000) +
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
    snapIndex: index,
    patternId: p.id,
    familyId: p.familyId,
    decisionIds: p.decisionFits.map(({ decisionId }) => decisionId) as [
      CbDecisionId,
      CbDecisionId,
      CbDecisionId,
    ],
    revealedClueIds: p.clueIds.slice(0, clueCount),
    information: {
      footballIqScore,
      coverageScore,
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
  active: Omit<ActiveCbGame, 'pendingSnap'>,
  snapIndex: number,
): ActiveCbGame | undefined {
  const nextPending = pending(active, snapIndex);
  if (active.input.rulesVersion === undefined) return { ...active, pendingSnap: nextPending };
  const prepared = prepareTacticalAlphaSnapV1({
    ...active.input,
    positionId: 'position_cb',
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

function tacticalPendingIsValid(active: ActiveCbGame): boolean {
  const context = active.pendingSnap.tacticalContext;
  if (active.input.rulesVersion === undefined) return context === undefined;
  return (
    active.input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
    matchesTacticalSnapContextV1(context, {
      ...active.pendingSnap,
      gameId: active.input.gameId,
      positionId: 'position_cb',
    })
  );
}

const emptyStats = (): CbGameStatLine => ({
  coverageSnaps: 0,
  targets: 0,
  completionsAllowed: 0,
  yardsAllowed: 0,
  touchdownsAllowed: 0,
  passesDefended: 0,
  interceptions: 0,
  tackles: 0,
  missedTackles: 0,
});
function addStats(s: CbGameStatLine, p: CbSnapPlayEvidence): CbGameStatLine {
  return {
    coverageSnaps: s.coverageSnaps + 1,
    targets: s.targets + (p.targeted ? 1 : 0),
    completionsAllowed: s.completionsAllowed + p.completionAllowed,
    yardsAllowed: s.yardsAllowed + p.yardsAllowed,
    touchdownsAllowed: s.touchdownsAllowed + p.touchdownAllowed,
    passesDefended: s.passesDefended + p.passDefended,
    interceptions: s.interceptions + p.interception,
    tackles: s.tackles + p.tackle,
    missedTackles: s.missedTackles + p.missedTackle,
  };
}
function complete(a: Omit<ActiveCbGame, 'pendingSnap'>): CompleteCbGame {
  const s = a.statLine;
  const opp = a.input.opportunityCount;
  const avgFit =
    a.keyPlayLog.length === 0
      ? 50
      : Math.round(a.keyPlayLog.reduce((x, p) => x + p.decisionFit, 0) / a.keyPlayLog.length);
  const gradeScore = clamp(
    55 +
      Math.round((avgFit - 50) / 5) +
      s.passesDefended * 7 +
      s.interceptions * 16 +
      s.tackles * 3 -
      s.completionsAllowed * 5 -
      Math.round(s.yardsAllowed / Math.max(4, opp * 3)) -
      s.touchdownsAllowed * 12 -
      s.missedTackles * 8 +
      skillValue(a.equippedSkills, 'cb_grade_bonus').value,
    0,
    100,
  );
  let playerTeamScore = clamp(
    17 +
      Math.round((a.input.playerTeamRating - a.input.opponentDefenseRating) / 4) +
      s.interceptions * 3,
    7,
    42,
  );
  let opponentScore = clamp(
    17 +
      Math.round((a.input.opponentOffenseRating - a.input.playerTeamRating) / 4) +
      a.opponentTouchdowns * 7,
    7,
    56,
  );
  let completedRng = a.rng;
  if (a.input.rulesVersion === TACTICAL_GAME_RULES_VERSION && opp > 0) {
    const finalBackground = resolveTacticalAlphaBackgroundV1({
      ...a.input,
      score: a.keyPlayLog.at(-1)!.tacticalResult!.scoreAfter,
      rng: a.rng,
    })!;
    playerTeamScore = finalBackground.score.playerTeam;
    opponentScore = finalBackground.score.opponent;
    completedRng = finalBackground.rng;
  }
  const attrs = Object.fromEntries(
    Object.entries(a.input.player.attributes).map(([id, v]) => [id, { ...v! }]),
  ) as Record<MultiPositionAttributeId, { rating: number; xp: number }>;
  const xpMap = new Map<MultiPositionAttributeId, number>();
  for (const play of a.keyPlayLog) {
    const p = a.patterns.find(({ id }) => id === play.patternId)!;
    const base = 12 + Math.floor(play.decisionFit / 10);
    for (const w of p.attributeWeights)
      xpMap.set(
        w.attributeId,
        (xpMap.get(w.attributeId) ?? 0) + Math.round((base * w.weightPermille) / 1000),
      );
  }
  const mult = 1000 + skillValue(a.equippedSkills, 'cb_xp_multiplier_permille').value;
  const attributeXp = [...xpMap.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([attributeId, base]) => {
      const before = attrs[attributeId]!;
      const awardedXp = Math.round((base * mult) / 1000);
      let ratingAfter = before.rating;
      let xpAfter = before.xp + awardedXp;
      while (ratingAfter < 100 && xpAfter >= ATTRIBUTE_XP_PER_RATING) {
        ratingAfter++;
        xpAfter -= ATTRIBUTE_XP_PER_RATING;
      }
      if (ratingAfter === 100) xpAfter = 0;
      attrs[attributeId] = { rating: ratingAfter, xp: xpAfter };
      return {
        attributeId,
        awardedXp,
        ratingBefore: before.rating,
        ratingAfter,
        xpBefore: before.xp,
        xpAfter,
      };
    });
  const requestedBodyDelta = -Math.max(
    0,
    2 + opp + a.totalBodyExposure - skillValue(a.equippedSkills, 'cb_body_cost_reduction').value,
  );
  const bodyAfter = clamp(a.input.player.state.body + requestedBodyDelta, 0, 100);
  const band =
    gradeScore >= 85 ? 3 : gradeScore >= 70 ? 1 : gradeScore < 45 ? -3 : gradeScore < 60 ? -1 : 0;
  const requestedConfidenceDelta =
    band < 0
      ? Math.min(0, band + skillValue(a.equippedSkills, 'cb_confidence_loss_reduction').value)
      : band;
  const confidenceAfter = clamp(a.input.player.state.confidence + requestedConfidenceDelta, 0, 100);
  const requestedCoachTrustDelta =
    gradeScore >= 85 ? 4 : gradeScore >= 70 ? 2 : gradeScore < 45 ? -4 : gradeScore < 60 ? -2 : 0;
  const coachTrustAfter = clamp(a.input.player.state.coachTrust + requestedCoachTrustDelta, 0, 100);
  return {
    type: 'COMPLETE',
    summary: {
      ...(a.input.rulesVersion === undefined ? {} : { rulesVersion: a.input.rulesVersion }),
      gameId: a.input.gameId,
      weekIndex: a.input.weekIndex,
      playerProgramId: a.input.playerProgramId,
      opponentProgramId: a.input.opponentProgramId,
      isHome: a.input.isHome,
      playerTeamScore,
      opponentScore,
      resultId:
        playerTeamScore > opponentScore
          ? 'game_result_win'
          : playerTeamScore < opponentScore
            ? 'game_result_loss'
            : 'game_result_tie',
      opportunityCount: opp,
      statLine: s,
      gradeScore,
      participationFeedbackId:
        opp === 0 ? 'game_participation_cb_scout_review' : 'game_participation_cb_coverage',
      gameRngDrawCountBefore: a.gameRngDrawCountBefore,
      gameRngDrawCountAfter: completedRng.drawCount,
    },
    growth: {
      bodyBefore: a.input.player.state.body,
      requestedBodyDelta,
      bodyAfter,
      confidenceBefore: a.input.player.state.confidence,
      requestedConfidenceDelta,
      confidenceAfter,
      coachTrustBefore: a.input.player.state.coachTrust,
      requestedCoachTrustDelta,
      coachTrustAfter,
      attributeXp,
    },
    keyPlayLog: a.keyPlayLog,
    nextPlayer: {
      ...a.input.player,
      attributes: attrs,
      state: {
        ...a.input.player.state,
        body: bodyAfter,
        confidence: confidenceAfter,
        coachTrust: coachTrustAfter,
      },
    },
    rng: completedRng,
  };
}
export function startCbGame(input: CbGameStartInput): CbGameResult {
  if (!validInput(input))
    return deepFreeze({ ok: false as const, reason: 'cb_game.invalid_input' as const });
  const base: Omit<ActiveCbGame, 'pendingSnap'> = {
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
      opponentOffenseRating: input.opponentOffenseRating,
      opponentDefenseRating: input.opponentDefenseRating,
      player: input.player,
      eventModifiers: input.eventModifiers,
      ...(Object.hasOwn(input, 'relationshipInformationScoreModifier')
        ? { relationshipInformationScoreModifier: input.relationshipInformationScoreModifier! }
        : {}),
    },
    gameRngDrawCountBefore: input.rng.drawCount,
    rng: input.rng,
    statLine: emptyStats(),
    opponentTouchdowns: 0,
    totalBodyExposure: 0,
    keyPlayLog: [],
    patterns: [...input.patterns].sort((x, y) => x.id.localeCompare(y.id)),
    decisions: [...input.decisions].sort((x, y) => x.id.localeCompare(y.id)),
    equippedSkills: [...input.equippedSkills].sort((x, y) => x.id.localeCompare(y.id)),
  };
  const state = input.opportunityCount === 0 ? complete(base) : withPendingSnap(base, 0);
  if (state === undefined)
    return deepFreeze({ ok: false as const, reason: 'cb_game.invalid_input' as const });
  return deepFreeze({
    ok: true as const,
    state: input.rulesVersion === undefined ? state : cloneSerializable(state),
  });
}
export function resolveCbSnap(a: ActiveCbGame, decisionId: unknown): CbGameResult {
  const p = a.patterns.find(({ id }) => id === a.pendingSnap.patternId);
  const d = a.decisions.find(({ id }) => id === decisionId);
  const fit = p?.decisionFits.find((x) => x.decisionId === decisionId)?.fit;
  if (
    !p ||
    !d ||
    fit === undefined ||
    d.familyId !== p.familyId ||
    !a.pendingSnap.decisionIds.includes(d.id) ||
    !isRngState(a.rng) ||
    !tacticalPendingIsValid(a) ||
    (a.input.rulesVersion === TACTICAL_GAME_RULES_VERSION &&
      a.rng.drawCount >
        Number.MAX_SAFE_INTEGER - (a.keyPlayLog.length + 1 >= a.input.opportunityCount ? 8 : 11))
  )
    return deepFreeze({ ok: false as const, reason: 'cb_game.invalid_decision' as const });
  const before = a.rng.drawCount;
  const release = mapped(a.rng, 0, 999);
  const execution = mapped(release.rng, 0, 999);
  const target = mapped(execution.rng, 0, 999);
  const completion = mapped(target.rng, 0, 999);
  const takeaway = mapped(completion.rng, 0, 999);
  const yards = mapped(takeaway.rng, -3, 4);
  const attributeScore = Math.round(
    p.attributeWeights.reduce(
      (sum, x) => sum + rating(a.input.player.attributes, x.attributeId) * x.weightPermille,
      0,
    ) / 1000,
  );
  const matchupScore = 100 - a.input.opponentOffenseRating;
  const scoreSkill = skillValue(a.equippedSkills, 'cb_decision_score_flat', p.familyId, d.id);
  const tackleSkill = skillValue(a.equippedSkills, 'cb_tackle_score_flat', p.familyId, d.id);
  const finalScore = clamp(
    Math.round(
      (attributeScore * 350 +
        fit * 250 +
        matchupScore * 150 +
        a.input.player.state.body * 70 +
        a.input.player.state.preparation * 80 +
        a.input.player.state.confidence * 50 +
        a.input.playerTeamRating * 50) /
        1000,
    ) +
      scoreSkill.value +
      tackleSkill.value +
      a.input.eventModifiers.decisionScoreFlat,
    0,
    100,
  );
  const targetChancePermille = clamp(
    p.targetPermille - a.input.eventModifiers.targetReductionPermille,
    0,
    950,
  );
  // Scene rules: the scene already says where the ball is.
  const scene = a.input.sceneRules === SCENE_RULES_VERSION;
  const airborne = scene && p.familyId === 'key_snap_family_cb_ball';
  const afterCatch = scene && p.familyId === 'key_snap_family_cb_tackle';
  const targeted = airborne || afterCatch || target.value < targetChancePermille;
  const disruptionChancePermille = clamp(
    p.baseDisruptionPermille + d.disruptionModifierPermille + (finalScore - 50) * 4,
    0,
    950,
  );
  const riskSkill = skillValue(
    a.equippedSkills,
    'cb_completion_risk_delta_permille',
    p.familyId,
    d.id,
  );
  const completionRiskPermille = clamp(
    p.baseCompletionRiskPermille +
      d.completionRiskModifierPermille +
      riskSkill.value -
      (execution.value < disruptionChancePermille ? 90 : 0),
    0,
    950,
  );
  const takeSkill = skillValue(
    a.equippedSkills,
    'cb_takeaway_chance_delta_permille',
    p.familyId,
    d.id,
  );
  const takeawayChancePermille = clamp(
    p.takeawayChancePermille + d.takeawayModifierPermille + takeSkill.value,
    0,
    700,
  );
  const completed = afterCatch || (targeted && completion.value < completionRiskPermille);
  // After the catch, a ball-hunting call is a strip: it forces a fumble or misses the tackle.
  const stripped = afterCatch && d.mode === 'BALL' && takeaway.value < takeawayChancePermille;
  const intercepted =
    !afterCatch &&
    targeted &&
    !completed &&
    d.mode === 'BALL' &&
    takeaway.value < takeawayChancePermille;
  const defended =
    targeted && !completed && !intercepted && execution.value < disruptionChancePermille;
  const tackleAttempt = completed && (d.mode === 'TACKLE' || afterCatch);
  const tackleMade =
    stripped ||
    (tackleAttempt && d.mode === 'TACKLE' && execution.value < disruptionChancePermille);
  let yardsAllowed = completed
    ? Math.max(0, p.baseYardsAllowed + yards.value - (tackleMade ? 3 : 0))
    : 0;
  let touchdownAllowed =
    completed && release.value < p.touchdownRiskPermille ? (1 as const) : (0 as const);
  let tacticalResult: TacticalSnapResultV1 | undefined;
  if (a.input.rulesVersion === TACTICAL_GAME_RULES_VERSION) {
    tacticalResult = resolveTacticalFieldV1(a.pendingSnap.tacticalContext!, {
      decisionId: d.id,
      kind: !targeted
        ? 'UNTRACKED'
        : intercepted
          ? 'INTERCEPTION'
          : completed
            ? 'ADVANCE'
            : 'INCOMPLETE',
      yards: intercepted ? p.baseYardsAllowed : yardsAllowed,
      touchdown: touchdownAllowed === 1 && !tackleMade,
      fumbleLost: stripped,
    });
    if (tacticalResult === undefined)
      return deepFreeze({ ok: false as const, reason: 'cb_game.invalid_input' as const });
    yardsAllowed = completed ? tacticalResult.ball.offenseYards! : 0;
    touchdownAllowed = tacticalResult.ball.outcome === 'TOUCHDOWN' ? 1 : 0;
  }
  const playResult: CbSnapPlayEvidence['playResult'] = stripped
    ? 'FORCED_FUMBLE'
    : !targeted
      ? 'NO_TARGET'
      : intercepted
        ? 'INTERCEPTION'
        : defended
          ? 'PASS_DEFENDED'
          : tackleMade
            ? 'TACKLE'
            : tackleAttempt
              ? 'MISSED_TACKLE'
              : completed
                ? 'COMPLETION_ALLOWED'
                : 'COVERED';
  const play: CbSnapPlayEvidence = {
    ...(tacticalResult === undefined ? {} : { tacticalResult }),
    snapIndex: a.pendingSnap.snapIndex,
    patternId: p.id,
    familyId: p.familyId,
    decisionId: d.id,
    playResult,
    targeted,
    completionAllowed: completed ? 1 : 0,
    yardsAllowed,
    touchdownAllowed,
    passDefended: defended ? 1 : 0,
    interception: intercepted ? 1 : 0,
    tackle: tackleMade ? 1 : 0,
    missedTackle: tackleAttempt && !tackleMade ? 1 : 0,
    decisionFit: fit,
    bodyExposure: d.bodyExposure + (tackleAttempt ? 1 : 0),
    resolution: {
      attributeScore,
      decisionFit: fit,
      matchupScore,
      finalScore,
      targetChancePermille,
      disruptionChancePermille,
      completionRiskPermille,
      takeawayChancePermille,
      touchdownRiskPermille: p.touchdownRiskPermille,
      releaseRoll: release.value,
      executionRoll: execution.value,
      targetRoll: target.value,
      completionRoll: completion.value,
      takeawayRoll: takeaway.value,
      yardVariation: yards.value,
      skillAdjustment: scoreSkill.value + tackleSkill.value + riskSkill.value + takeSkill.value,
      eventAdjustment: a.input.eventModifiers.decisionScoreFlat,
    },
    rngDrawCountBefore: before,
    rngDrawCountAfter: yards.rng.drawCount,
    appliedSkillIds: [
      ...new Set([...scoreSkill.ids, ...tackleSkill.ids, ...riskSkill.ids, ...takeSkill.ids]),
    ].sort(),
  };
  const log = [...a.keyPlayLog, play];
  const next: Omit<ActiveCbGame, 'pendingSnap'> = {
    ...a,
    rng: yards.rng,
    statLine: addStats(a.statLine, play),
    opponentTouchdowns: a.opponentTouchdowns + touchdownAllowed,
    totalBodyExposure: a.totalBodyExposure + play.bodyExposure,
    keyPlayLog: log,
  };
  const state =
    log.length >= a.input.opportunityCount ? complete(next) : withPendingSnap(next, log.length);
  if (state === undefined)
    return deepFreeze({ ok: false as const, reason: 'cb_game.invalid_input' as const });
  return deepFreeze({
    ok: true as const,
    state: a.input.rulesVersion === undefined ? state : cloneSerializable(state),
  });
}
export function projectCbWorldAlphaResult(
  summary: CompleteCbGame['summary'],
  fixture: WorldAlphaFixtureMechanics,
):
  | { readonly ok: true; readonly result: WorldAlphaPlayerGameResult }
  | { readonly ok: false; readonly reason: 'cb_game.fixture_mismatch' } {
  const home = summary.isHome ? summary.playerProgramId : summary.opponentProgramId;
  const away = summary.isHome ? summary.opponentProgramId : summary.playerProgramId;
  if (fixture.homeProgramId !== home || fixture.awayProgramId !== away)
    return deepFreeze({ ok: false as const, reason: 'cb_game.fixture_mismatch' as const });
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
