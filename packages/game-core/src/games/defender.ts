import { informationBaseScore, informationTierTells } from './information.js';
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
import {
  prepareTacticalAlphaSnapV1,
  resolveTacticalAlphaBackgroundV1,
  resolveTacticalFieldV1,
  TACTICAL_GAME_RULES_VERSION,
  type TacticalSnapResultV1,
} from './tactical-alpha-v1.js';
import type { TacticalSnapContextV1 } from './tactical-context-v1.js';

/**
 * Front-seven defender kernel (M8). Linebacker and edge rusher share one data-driven resolver whose
 * decision families, clues, patterns and outcome tables are authored per position, so the two
 * positions make different football decisions without two hand-written engines. Current tactical
 * rules only; every snap consumes exactly six draws in a fixed order.
 */
export const DEFENDER_POSITION_IDS = Object.freeze(['position_lb', 'position_edge'] as const);
export type DefenderPositionId = (typeof DEFENDER_POSITION_IDS)[number];

export const DEFENDER_DECISION_FAMILY_IDS = Object.freeze({
  position_lb: Object.freeze([
    'key_snap_family_lb_key',
    'key_snap_family_lb_fit',
    'key_snap_family_lb_drop',
    'key_snap_family_lb_blitz',
  ] as const),
  position_edge: Object.freeze([
    'key_snap_family_edge_rush',
    'key_snap_family_edge_contain',
    'key_snap_family_edge_option',
    'key_snap_family_edge_finish',
  ] as const),
});
export type DefenderDecisionFamilyId =
  (typeof DEFENDER_DECISION_FAMILY_IDS)[DefenderPositionId][number];

export const DEFENDER_SKILL_EFFECT_TYPES = Object.freeze([
  'defender_information_clue_bonus',
  'defender_decision_score_flat',
  'defender_impact_delta_permille',
  'defender_big_play_delta_permille',
  'defender_risk_delta_permille',
  'defender_body_cost_reduction',
  'defender_confidence_loss_reduction',
  'defender_xp_multiplier_permille',
  'defender_grade_bonus',
  'defender_event_choice_unlock',
  'defender_event_positive_multiplier_permille',
] as const);
export type DefenderSkillEffectType = (typeof DEFENDER_SKILL_EFFECT_TYPES)[number];

export type DefenderPlayResult =
  | 'NO_PLAY'
  | 'STOP'
  | 'LOSS'
  | 'SACK'
  | 'PRESSURE'
  | 'PASS_DEFENDED'
  | 'INTERCEPTION'
  | 'FORCED_FUMBLE'
  | 'GAIN_ALLOWED'
  | 'MISSED_TACKLE';

export interface DefenderDecisionDefinition {
  readonly id: `key_snap_decision_${'lb' | 'edge'}_${string}`;
  readonly familyId: DefenderDecisionFamilyId;
  /** SAFE trades upside for fewer big gains; AGGRESSIVE the reverse (and can miss). */
  readonly style: 'SAFE' | 'BALANCED' | 'AGGRESSIVE';
  readonly impactModifierPermille: number;
  readonly bigPlayModifierPermille: number;
  readonly riskModifierPermille: number;
  readonly bodyExposure: number;
}

export interface DefenderPatternDefinition {
  readonly id: `key_snap_pattern_${'lb' | 'edge'}_${string}`;
  readonly familyId: DefenderDecisionFamilyId;
  readonly playType: 'RUN' | 'PASS';
  readonly clueIds: readonly [string, string, string];
  readonly decisionFits: readonly [
    { readonly decisionId: DefenderDecisionDefinition['id']; readonly fit: number },
    { readonly decisionId: DefenderDecisionDefinition['id']; readonly fit: number },
    { readonly decisionId: DefenderDecisionDefinition['id']; readonly fit: number },
  ];
  readonly attributeWeights: readonly [
    { readonly attributeId: MultiPositionAttributeId; readonly weightPermille: number },
    { readonly attributeId: MultiPositionAttributeId; readonly weightPermille: number },
  ];
  /** Chance the play comes to this defender at all. */
  readonly involvePermille: number;
  readonly baseImpactPermille: number;
  readonly baseBigPlayPermille: number;
  readonly baseRiskPermille: number;
  readonly impactResult: 'STOP' | 'PRESSURE' | 'PASS_DEFENDED';
  readonly bigPlayResult: 'LOSS' | 'SACK' | 'INTERCEPTION' | 'FORCED_FUMBLE';
  readonly baseYardsAllowed: number;
  readonly touchdownRiskPermille: number;
}

export interface DefenderSkillEffect {
  readonly type: DefenderSkillEffectType;
  readonly value: number;
  readonly familyId?: DefenderDecisionFamilyId;
  readonly decisionId?: DefenderDecisionDefinition['id'];
}

export interface DefenderSkillDefinition {
  readonly id: SkillId;
  readonly familyId: SkillFamilyId;
  readonly gradeId: SkillGradeId;
  readonly positionId: DefenderPositionId;
  readonly effects: readonly DefenderSkillEffect[];
}

export interface DefenderEventGameModifiers {
  readonly clueBonus: number;
  readonly decisionScoreFlat: number;
  readonly exposureReductionPermille: number;
}

export interface DefenderPlayerGameState {
  readonly id: PlayerId;
  readonly positionId: DefenderPositionId;
  readonly attributes: PositionAttributeProgress;
  readonly state: {
    readonly body: number;
    readonly preparation: number;
    readonly confidence: number;
    readonly coachTrust: number;
  };
}

export interface DefenderGameStartInput {
  readonly rulesVersion: typeof TACTICAL_GAME_RULES_VERSION;
  readonly gameId: `game_${'lb' | 'edge'}_${string}`;
  readonly positionId: DefenderPositionId;
  readonly weekIndex: number;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly opportunityCount: number;
  readonly playerTeamRating: number;
  readonly opponentOffenseRating: number;
  readonly opponentDefenseRating: number;
  readonly player: DefenderPlayerGameState;
  readonly patterns: readonly DefenderPatternDefinition[];
  readonly decisions: readonly DefenderDecisionDefinition[];
  readonly equippedSkills: readonly DefenderSkillDefinition[];
  readonly eventModifiers: DefenderEventGameModifiers;
  readonly rng: RngState;
}

export interface DefenderGameStatLine {
  readonly snaps: number;
  readonly tackles: number;
  readonly tacklesForLoss: number;
  readonly sacks: number;
  readonly pressures: number;
  readonly passesDefended: number;
  readonly interceptions: number;
  readonly forcedFumbles: number;
  readonly yardsAllowed: number;
  readonly missedTackles: number;
}

export interface PendingDefenderSnap {
  readonly tacticalContext: TacticalSnapContextV1;
  readonly snapIndex: number;
  readonly patternId: DefenderPatternDefinition['id'];
  readonly familyId: DefenderDecisionFamilyId;
  readonly playType: 'RUN' | 'PASS';
  readonly decisionIds: readonly [
    DefenderDecisionDefinition['id'],
    DefenderDecisionDefinition['id'],
    DefenderDecisionDefinition['id'],
  ];
  readonly revealedClueIds: readonly string[];
  readonly informationScore: number;
}

export interface DefenderSnapPlayEvidence {
  readonly tacticalResult: TacticalSnapResultV1;
  readonly snapIndex: number;
  readonly patternId: DefenderPatternDefinition['id'];
  readonly familyId: DefenderDecisionFamilyId;
  readonly decisionId: DefenderDecisionDefinition['id'];
  readonly playResult: DefenderPlayResult;
  readonly yardsAllowed: number;
  readonly touchdownAllowed: 0 | 1;
  readonly decisionFit: number;
  readonly finalScore: number;
  readonly bodyExposure: number;
  readonly appliedSkillIds: readonly SkillId[];
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface ActiveDefenderGame {
  readonly type: 'ACTIVE';
  readonly input: Omit<DefenderGameStartInput, 'patterns' | 'decisions' | 'equippedSkills' | 'rng'>;
  readonly rng: RngState;
  readonly statLine: DefenderGameStatLine;
  readonly opponentTouchdowns: number;
  readonly totalBodyExposure: number;
  readonly keyPlayLog: readonly DefenderSnapPlayEvidence[];
  readonly pendingSnap: PendingDefenderSnap;
  readonly patterns: readonly DefenderPatternDefinition[];
  readonly decisions: readonly DefenderDecisionDefinition[];
  readonly equippedSkills: readonly DefenderSkillDefinition[];
}

export interface CompleteDefenderGame {
  readonly type: 'COMPLETE';
  readonly summary: {
    readonly rulesVersion: typeof TACTICAL_GAME_RULES_VERSION;
    readonly gameId: DefenderGameStartInput['gameId'];
    readonly positionId: DefenderPositionId;
    readonly weekIndex: number;
    readonly playerProgramId: ProgramId;
    readonly opponentProgramId: ProgramId;
    readonly isHome: boolean;
    readonly playerTeamScore: number;
    readonly opponentScore: number;
    readonly resultId: 'game_result_win' | 'game_result_loss' | 'game_result_tie';
    readonly opportunityCount: number;
    readonly statLine: DefenderGameStatLine;
    readonly gradeScore: number;
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
  readonly keyPlayLog: readonly DefenderSnapPlayEvidence[];
  readonly nextPlayer: DefenderPlayerGameState;
  readonly rng: RngState;
}

export type DefenderGameState = ActiveDefenderGame | CompleteDefenderGame;
export type DefenderGameResult =
  | { readonly ok: true; readonly state: DefenderGameState }
  | {
      readonly ok: false;
      readonly reason: 'defender_game.invalid_input' | 'defender_game.invalid_decision';
    };

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const integerIn = (value: unknown, minimum: number, maximum: number): value is number =>
  Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
const rating = (attributes: PositionAttributeProgress, id: MultiPositionAttributeId) =>
  attributes[id]?.rating ?? 0;
const abbreviation = (positionId: DefenderPositionId) =>
  positionId === 'position_lb' ? 'lb' : 'edge';
const invalid = (reason: 'defender_game.invalid_input' | 'defender_game.invalid_decision') =>
  deepFreeze({ ok: false as const, reason });

function skillValue(
  skills: readonly DefenderSkillDefinition[],
  type: DefenderSkillEffectType,
  familyId?: DefenderDecisionFamilyId,
  decisionId?: DefenderDecisionDefinition['id'],
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

/** The same fixed-point effect vocabulary for every defender card. */
export function defenderSkillValue(
  skills: readonly DefenderSkillDefinition[],
  type: DefenderSkillEffectType,
): number {
  return skillValue(skills, type).value;
}

export function isDefenderCatalogValid(
  positionId: DefenderPositionId,
  patterns: readonly DefenderPatternDefinition[],
  decisions: readonly DefenderDecisionDefinition[],
): boolean {
  const families = DEFENDER_DECISION_FAMILY_IDS[positionId] as readonly string[];
  const code = abbreviation(positionId);
  if (
    decisions.length !== 12 ||
    patterns.length !== 8 ||
    new Set(decisions.map(({ id }) => id)).size !== 12 ||
    new Set(patterns.map(({ id }) => id)).size !== 8
  )
    return false;
  const byDecision = new Map(decisions.map((decision) => [decision.id, decision]));
  for (const decision of decisions)
    if (
      !decision.id.startsWith(`key_snap_decision_${code}_`) ||
      !families.includes(decision.familyId) ||
      !['SAFE', 'BALANCED', 'AGGRESSIVE'].includes(decision.style) ||
      !integerIn(decision.impactModifierPermille, -300, 300) ||
      !integerIn(decision.bigPlayModifierPermille, -300, 300) ||
      !integerIn(decision.riskModifierPermille, -300, 300) ||
      !integerIn(decision.bodyExposure, 0, 8)
    )
      return false;
  for (const pattern of patterns)
    if (
      !pattern.id.startsWith(`key_snap_pattern_${code}_`) ||
      !families.includes(pattern.familyId) ||
      !['RUN', 'PASS'].includes(pattern.playType) ||
      pattern.clueIds.length !== 3 ||
      new Set(pattern.clueIds).size !== 3 ||
      !pattern.clueIds.every((id) => id.startsWith(`game_clue_${code}_`)) ||
      pattern.decisionFits.length !== 3 ||
      !pattern.decisionFits.every(
        ({ decisionId, fit }) =>
          byDecision.get(decisionId)?.familyId === pattern.familyId && integerIn(fit, 0, 100),
      ) ||
      pattern.attributeWeights.length !== 2 ||
      pattern.attributeWeights.reduce((sum, weight) => sum + weight.weightPermille, 0) !== 1000 ||
      !integerIn(pattern.involvePermille, 100, 1000) ||
      !integerIn(pattern.baseImpactPermille, 0, 950) ||
      !integerIn(pattern.baseBigPlayPermille, 0, 700) ||
      !integerIn(pattern.baseRiskPermille, 0, 950) ||
      !integerIn(pattern.baseYardsAllowed, 0, 40) ||
      !integerIn(pattern.touchdownRiskPermille, 0, 500) ||
      (pattern.playType === 'RUN' && ['SACK', 'INTERCEPTION'].includes(pattern.bigPlayResult)) ||
      (pattern.playType === 'PASS' && pattern.bigPlayResult === 'LOSS')
    )
      return false;
  return families.every(
    (familyId) =>
      decisions.filter((decision) => decision.familyId === familyId).length === 3 &&
      patterns.filter((pattern) => pattern.familyId === familyId).length === 2,
  );
}

function validInput(input: DefenderGameStartInput): boolean {
  if (
    input?.rulesVersion !== TACTICAL_GAME_RULES_VERSION ||
    !DEFENDER_POSITION_IDS.includes(input.positionId) ||
    !input.gameId?.startsWith(`game_${abbreviation(input.positionId)}_`) ||
    !integerIn(input.weekIndex, 0, 1000) ||
    !isProgramId(input.playerProgramId) ||
    !isProgramId(input.opponentProgramId) ||
    input.playerProgramId === input.opponentProgramId ||
    !integerIn(input.opportunityCount, 0, 5) ||
    !integerIn(input.playerTeamRating, 0, 100) ||
    !integerIn(input.opponentOffenseRating, 0, 100) ||
    !integerIn(input.opponentDefenseRating, 0, 100) ||
    !isPlayerId(input.player?.id) ||
    input.player.positionId !== input.positionId ||
    validatePositionAttributeProgress(input.positionId, input.player.attributes).length > 0 ||
    !['body', 'preparation', 'confidence', 'coachTrust'].every((key) =>
      integerIn(input.player.state[key as keyof DefenderPlayerGameState['state']], 0, 100),
    ) ||
    !isRngState(input.rng) ||
    input.rng.drawCount > Number.MAX_SAFE_INTEGER - (input.opportunityCount * 11 + 2) ||
    !isDefenderCatalogValid(input.positionId, input.patterns, input.decisions) ||
    input.equippedSkills.length > 4 ||
    !integerIn(input.eventModifiers?.clueBonus, 0, 2) ||
    !integerIn(input.eventModifiers?.decisionScoreFlat, -10, 10) ||
    !integerIn(input.eventModifiers?.exposureReductionPermille, 0, 250)
  )
    return false;
  return input.equippedSkills.every(
    (card) =>
      isSkillId(card.id) &&
      isSkillFamilyId(card.familyId) &&
      isSkillGradeId(card.gradeId) &&
      card.positionId === input.positionId &&
      card.effects.length > 0 &&
      card.effects.every(
        (effect) =>
          DEFENDER_SKILL_EFFECT_TYPES.includes(effect.type) && integerIn(effect.value, -500, 500),
      ),
  );
}

function draw(rng: RngState, minimum: number, maximum: number) {
  const sample = nextUint32(rng);
  return {
    value: minimum + Math.floor((sample.value * (maximum - minimum + 1)) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

function withPendingSnap(
  active: Omit<ActiveDefenderGame, 'pendingSnap'>,
  snapIndex: number,
): ActiveDefenderGame | undefined {
  const pattern = active.patterns[(active.input.weekIndex * 3 + snapIndex * 5) % 8]!;
  const player = active.input.player;
  const informationScore = clamp(
    informationBaseScore(player.positionId, player.attributes, player.state.preparation),
    0,
    100,
  );
  const clueCount = clamp(
    informationTierTells(player.positionId, informationScore) +
      skillValue(active.equippedSkills, 'defender_information_clue_bonus', pattern.familyId).value +
      active.input.eventModifiers.clueBonus,
    0,
    3,
  );
  const revealedClueIds = pattern.clueIds.slice(0, clueCount);
  const decisionIds = pattern.decisionFits.map(({ decisionId }) => decisionId) as [
    DefenderDecisionDefinition['id'],
    DefenderDecisionDefinition['id'],
    DefenderDecisionDefinition['id'],
  ];
  const prepared = prepareTacticalAlphaSnapV1({
    gameId: active.input.gameId,
    positionId: active.input.positionId,
    snapIndex,
    opportunityCount: active.input.opportunityCount,
    decisionIds,
    revealedClueIds: revealedClueIds as TacticalSnapContextV1['revealedClueIds'],
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
      playType: pattern.playType,
      decisionIds,
      revealedClueIds,
      informationScore,
    },
  };
}

const emptyStats = (): DefenderGameStatLine => ({
  snaps: 0,
  tackles: 0,
  tacklesForLoss: 0,
  sacks: 0,
  pressures: 0,
  passesDefended: 0,
  interceptions: 0,
  forcedFumbles: 0,
  yardsAllowed: 0,
  missedTackles: 0,
});

function addStats(stats: DefenderGameStatLine, play: DefenderSnapPlayEvidence) {
  const result = play.playResult;
  return {
    snaps: stats.snaps + 1,
    tackles: stats.tackles + (['STOP', 'LOSS', 'SACK', 'FORCED_FUMBLE'].includes(result) ? 1 : 0),
    tacklesForLoss: stats.tacklesForLoss + (result === 'LOSS' || result === 'SACK' ? 1 : 0),
    sacks: stats.sacks + (result === 'SACK' ? 1 : 0),
    pressures: stats.pressures + (result === 'PRESSURE' || result === 'SACK' ? 1 : 0),
    passesDefended: stats.passesDefended + (result === 'PASS_DEFENDED' ? 1 : 0),
    interceptions: stats.interceptions + (result === 'INTERCEPTION' ? 1 : 0),
    forcedFumbles: stats.forcedFumbles + (result === 'FORCED_FUMBLE' ? 1 : 0),
    yardsAllowed: stats.yardsAllowed + play.yardsAllowed,
    missedTackles: stats.missedTackles + (result === 'MISSED_TACKLE' ? 1 : 0),
  };
}

function complete(active: Omit<ActiveDefenderGame, 'pendingSnap'>): CompleteDefenderGame {
  const stats = active.statLine;
  const opportunities = active.input.opportunityCount;
  const averageFit =
    active.keyPlayLog.length === 0
      ? 50
      : Math.round(
          active.keyPlayLog.reduce((sum, play) => sum + play.decisionFit, 0) /
            active.keyPlayLog.length,
        );
  // Base 47 keeps a typical front-seven afternoon near the other positions' grade band (R1.6).
  const gradeScore = clamp(
    47 +
      Math.round((averageFit - 50) / 5) +
      stats.tackles * 3 +
      stats.tacklesForLoss * 5 +
      stats.sacks * 7 +
      stats.pressures * 4 +
      stats.passesDefended * 6 +
      stats.interceptions * 14 +
      stats.forcedFumbles * 10 -
      stats.missedTackles * 7 -
      Math.round(stats.yardsAllowed / Math.max(4, opportunities * 3)) -
      active.opponentTouchdowns * 10 +
      skillValue(active.equippedSkills, 'defender_grade_bonus').value,
    0,
    100,
  );
  let playerTeamScore: number;
  let opponentScore: number;
  let rng = active.rng;
  if (opportunities > 0) {
    const background = resolveTacticalAlphaBackgroundV1({
      score: active.keyPlayLog.at(-1)!.tacticalResult.scoreAfter,
      playerTeamRating: active.input.playerTeamRating,
      opponentDefenseRating: active.input.opponentDefenseRating,
      opponentOffenseRating: active.input.opponentOffenseRating,
      rng: active.rng,
    })!;
    playerTeamScore = background.score.playerTeam;
    opponentScore = background.score.opponent;
    rng = background.rng;
  } else {
    playerTeamScore = clamp(
      17 + Math.round((active.input.playerTeamRating - active.input.opponentDefenseRating) / 4),
      7,
      42,
    );
    opponentScore = clamp(
      17 + Math.round((active.input.opponentOffenseRating - active.input.playerTeamRating) / 4),
      7,
      56,
    );
  }
  const attributes = Object.fromEntries(
    Object.entries(active.input.player.attributes).map(([id, value]) => [id, { ...value! }]),
  ) as Record<MultiPositionAttributeId, { rating: number; xp: number }>;
  const xpByAttribute = new Map<MultiPositionAttributeId, number>();
  for (const play of active.keyPlayLog) {
    const pattern = active.patterns.find(({ id }) => id === play.patternId)!;
    const base = 12 + Math.floor(play.decisionFit / 10);
    for (const weight of pattern.attributeWeights)
      xpByAttribute.set(
        weight.attributeId,
        (xpByAttribute.get(weight.attributeId) ?? 0) +
          Math.round((base * weight.weightPermille) / 1000),
      );
  }
  const multiplier =
    1000 + skillValue(active.equippedSkills, 'defender_xp_multiplier_permille').value;
  const attributeXp = [...xpByAttribute.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([attributeId, base]) => {
      const before = attributes[attributeId]!;
      const awardedXp = Math.round((base * multiplier) / 1000);
      let ratingAfter = before.rating;
      let xpAfter = before.xp + awardedXp;
      while (ratingAfter < 100 && xpAfter >= ATTRIBUTE_XP_PER_RATING) {
        ratingAfter += 1;
        xpAfter -= ATTRIBUTE_XP_PER_RATING;
      }
      if (ratingAfter === 100) xpAfter = 0;
      attributes[attributeId] = { rating: ratingAfter, xp: xpAfter };
      return {
        attributeId,
        awardedXp,
        ratingBefore: before.rating,
        ratingAfter,
        xpBefore: before.xp,
        xpAfter,
      };
    });
  const state = active.input.player.state;
  const requestedBodyDelta = -Math.max(
    0,
    2 +
      opportunities +
      active.totalBodyExposure -
      skillValue(active.equippedSkills, 'defender_body_cost_reduction').value,
  );
  const bodyAfter = clamp(state.body + requestedBodyDelta, 0, 100);
  const band =
    gradeScore >= 85 ? 3 : gradeScore >= 70 ? 1 : gradeScore < 45 ? -3 : gradeScore < 60 ? -1 : 0;
  const requestedConfidenceDelta =
    band < 0
      ? Math.min(
          0,
          band + skillValue(active.equippedSkills, 'defender_confidence_loss_reduction').value,
        )
      : band;
  const confidenceAfter = clamp(state.confidence + requestedConfidenceDelta, 0, 100);
  const requestedCoachTrustDelta =
    gradeScore >= 85 ? 4 : gradeScore >= 70 ? 2 : gradeScore < 45 ? -4 : gradeScore < 60 ? -2 : 0;
  const coachTrustAfter = clamp(state.coachTrust + requestedCoachTrustDelta, 0, 100);
  return {
    type: 'COMPLETE',
    summary: {
      rulesVersion: TACTICAL_GAME_RULES_VERSION,
      gameId: active.input.gameId,
      positionId: active.input.positionId,
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
    },
    growth: {
      bodyBefore: state.body,
      requestedBodyDelta,
      bodyAfter,
      confidenceBefore: state.confidence,
      requestedConfidenceDelta,
      confidenceAfter,
      coachTrustBefore: state.coachTrust,
      requestedCoachTrustDelta,
      coachTrustAfter,
      attributeXp,
    },
    keyPlayLog: active.keyPlayLog,
    nextPlayer: {
      ...active.input.player,
      attributes,
      state: {
        ...state,
        body: bodyAfter,
        confidence: confidenceAfter,
        coachTrust: coachTrustAfter,
      },
    },
    rng,
  };
}

export function startDefenderGame(input: DefenderGameStartInput): DefenderGameResult {
  if (!validInput(input)) return invalid('defender_game.invalid_input');
  const { patterns, decisions, equippedSkills, rng, ...rest } = input;
  const base: Omit<ActiveDefenderGame, 'pendingSnap'> = {
    type: 'ACTIVE',
    input: rest,
    rng,
    statLine: emptyStats(),
    opponentTouchdowns: 0,
    totalBodyExposure: 0,
    keyPlayLog: [],
    patterns: [...patterns].sort((left, right) => (left.id < right.id ? -1 : 1)),
    decisions: [...decisions].sort((left, right) => (left.id < right.id ? -1 : 1)),
    equippedSkills: [...equippedSkills].sort((left, right) => (left.id < right.id ? -1 : 1)),
  };
  const state = input.opportunityCount === 0 ? complete(base) : withPendingSnap(base, 0);
  return state === undefined
    ? invalid('defender_game.invalid_input')
    : deepFreeze({ ok: true as const, state: cloneSerializable(state) });
}

export function resolveDefenderSnap(
  active: ActiveDefenderGame,
  decisionId: unknown,
): DefenderGameResult {
  const pending = active.pendingSnap;
  const pattern = active.patterns.find(({ id }) => id === pending.patternId);
  const decision = active.decisions.find(({ id }) => id === decisionId);
  const fit = pattern?.decisionFits.find((entry) => entry.decisionId === decisionId)?.fit;
  if (
    active.type !== 'ACTIVE' ||
    pattern === undefined ||
    decision === undefined ||
    fit === undefined ||
    !pending.decisionIds.includes(decision.id) ||
    !isRngState(active.rng)
  )
    return invalid('defender_game.invalid_decision');
  const player = active.input.player;
  const before = active.rng.drawCount;
  // Fixed draw order: involvement, execution, impact, big play, risk, yards.
  const involve = draw(active.rng, 0, 999);
  const execution = draw(involve.rng, 0, 999);
  const impact = draw(execution.rng, 0, 999);
  const bigPlay = draw(impact.rng, 0, 999);
  const risk = draw(bigPlay.rng, 0, 999);
  const yards = draw(risk.rng, -2, 4);
  const attributeScore = Math.round(
    pattern.attributeWeights.reduce(
      (sum, weight) => sum + rating(player.attributes, weight.attributeId) * weight.weightPermille,
      0,
    ) / 1000,
  );
  const scoreSkill = skillValue(
    active.equippedSkills,
    'defender_decision_score_flat',
    pattern.familyId,
    decision.id,
  );
  const finalScore = clamp(
    Math.round(
      (attributeScore * 350 +
        fit * 250 +
        (100 - active.input.opponentOffenseRating) * 150 +
        player.state.body * 70 +
        player.state.preparation * 80 +
        player.state.confidence * 50 +
        active.input.playerTeamRating * 50) /
        1000,
    ) +
      scoreSkill.value +
      active.input.eventModifiers.decisionScoreFlat,
    0,
    100,
  );
  const impactSkill = skillValue(
    active.equippedSkills,
    'defender_impact_delta_permille',
    pattern.familyId,
    decision.id,
  );
  const bigSkill = skillValue(
    active.equippedSkills,
    'defender_big_play_delta_permille',
    pattern.familyId,
    decision.id,
  );
  const riskSkill = skillValue(
    active.equippedSkills,
    'defender_risk_delta_permille',
    pattern.familyId,
    decision.id,
  );
  const involved = involve.value < pattern.involvePermille;
  const impactChance = clamp(
    pattern.baseImpactPermille +
      decision.impactModifierPermille +
      impactSkill.value +
      (finalScore - 50) * 5 +
      (fit - 60) * 3,
    0,
    950,
  );
  const madePlay = involved && execution.value < impactChance;
  const bigPlayChance = clamp(
    pattern.baseBigPlayPermille +
      decision.bigPlayModifierPermille +
      bigSkill.value +
      Math.max(0, finalScore - 60) * 3,
    0,
    700,
  );
  const riskChance = clamp(
    pattern.baseRiskPermille +
      decision.riskModifierPermille +
      riskSkill.value -
      active.input.eventModifiers.exposureReductionPermille -
      (finalScore - 50) * 3,
    0,
    950,
  );
  let playResult: DefenderPlayResult;
  if (!involved) playResult = 'NO_PLAY';
  else if (madePlay)
    playResult = impact.value < bigPlayChance ? pattern.bigPlayResult : pattern.impactResult;
  else if (risk.value < riskChance)
    playResult = decision.style === 'AGGRESSIVE' ? 'MISSED_TACKLE' : 'GAIN_ALLOWED';
  else playResult = 'GAIN_ALLOWED';
  const bigGain = !madePlay && involved && risk.value < riskChance;
  const requestedYards =
    playResult === 'GAIN_ALLOWED' || playResult === 'MISSED_TACKLE'
      ? Math.max(1, pattern.baseYardsAllowed + yards.value + (bigGain ? 8 : 0))
      : playResult === 'STOP'
        ? Math.max(0, 1 + yards.value)
        : playResult === 'FORCED_FUMBLE'
          ? Math.max(0, 2 + yards.value)
          : playResult === 'LOSS'
            ? clamp(2 + Math.abs(yards.value), 1, 10)
            : playResult === 'INTERCEPTION'
              ? Math.max(0, 4 + yards.value)
              : 0;
  const touchdown = bigGain && bigPlay.value < pattern.touchdownRiskPermille;
  const passPlay = pending.playType === 'PASS';
  const tacticalResult = resolveTacticalFieldV1(pending.tacticalContext, {
    decisionId: decision.id,
    kind:
      playResult === 'NO_PLAY'
        ? 'UNTRACKED'
        : playResult === 'SACK'
          ? 'SACK'
          : playResult === 'LOSS'
            ? 'LOSS'
            : playResult === 'INTERCEPTION'
              ? 'INTERCEPTION'
              : playResult === 'PRESSURE' || playResult === 'PASS_DEFENDED'
                ? 'INCOMPLETE'
                : playResult === 'FORCED_FUMBLE' && passPlay
                  ? 'SACK'
                  : 'ADVANCE',
    yards: requestedYards,
    touchdown,
    fumbleLost: playResult === 'FORCED_FUMBLE',
  });
  if (tacticalResult === undefined) return invalid('defender_game.invalid_decision');
  const offenseYards = tacticalResult.ball.offenseYards ?? 0;
  const yardsAllowed = Math.max(0, offenseYards);
  const touchdownAllowed = tacticalResult.ball.outcome === 'TOUCHDOWN' ? 1 : 0;
  const play: DefenderSnapPlayEvidence = {
    tacticalResult,
    snapIndex: pending.snapIndex,
    patternId: pattern.id,
    familyId: pattern.familyId,
    decisionId: decision.id,
    playResult,
    yardsAllowed,
    touchdownAllowed,
    decisionFit: fit,
    finalScore,
    bodyExposure:
      decision.bodyExposure +
      (['STOP', 'LOSS', 'SACK', 'MISSED_TACKLE'].includes(playResult) ? 1 : 0),
    appliedSkillIds: [
      ...new Set([...scoreSkill.ids, ...impactSkill.ids, ...bigSkill.ids, ...riskSkill.ids]),
    ].sort(),
    rngDrawCountBefore: before,
    rngDrawCountAfter: yards.rng.drawCount,
  };
  const keyPlayLog = [...active.keyPlayLog, play];
  const next: Omit<ActiveDefenderGame, 'pendingSnap'> = {
    ...active,
    rng: yards.rng,
    statLine: addStats(active.statLine, play),
    opponentTouchdowns: active.opponentTouchdowns + touchdownAllowed,
    totalBodyExposure: active.totalBodyExposure + play.bodyExposure,
    keyPlayLog,
  };
  const state =
    keyPlayLog.length >= active.input.opportunityCount
      ? complete(next)
      : withPendingSnap(next, keyPlayLog.length);
  return state === undefined
    ? invalid('defender_game.invalid_input')
    : deepFreeze({ ok: true as const, state: cloneSerializable(state) });
}

export function projectDefenderWorldResult(
  summary: CompleteDefenderGame['summary'],
  fixture: WorldAlphaFixtureMechanics,
): WorldAlphaPlayerGameResult | null {
  const home = summary.isHome ? summary.playerProgramId : summary.opponentProgramId;
  const away = summary.isHome ? summary.opponentProgramId : summary.playerProgramId;
  if (fixture.homeProgramId !== home || fixture.awayProgramId !== away) return null;
  const homeScore = summary.isHome ? summary.playerTeamScore : summary.opponentScore;
  const awayScore = summary.isHome ? summary.opponentScore : summary.playerTeamScore;
  return deepFreeze({
    model: 'player_game_alpha_v1' as const,
    fixtureId: fixture.id,
    homeScore,
    awayScore,
    winnerProgramId: homeScore > awayScore ? home : awayScore > homeScore ? away : null,
  });
}
