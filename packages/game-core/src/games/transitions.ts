import {
  MENTAL_ATTRIBUTE_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  PLAYER_ATTRIBUTE_IDS,
  type MentalAttributeId,
  type PhysicalAttributeId,
  type PlayerAttributeId,
  type WrAttributeId,
} from '../player/ids.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { BODY_BOUNDS, COACH_TRUST_BOUNDS, CONFIDENCE_BOUNDS } from '../player/bounds.js';
import type { AttributeProgress, CareerRun, WrPlayerAttributes } from '../player/types.js';
import { validateCareerRun } from '../player/validation.js';
import { nextInt, restoreRngState, type RngState } from '../random/rng.js';
import { collectEquippedGameHooks } from '../skills/effects.js';
import type { CollectedGameHook, SkillMechanicsDefinition } from '../skills/types.js';
import { ATTRIBUTE_XP_PER_RATING } from '../weekly/tuning.js';
import {
  isGameOpponentMechanicsProfile,
  isGameTuningDefinition,
  isKeySnapFamilyMechanicsDefinitionCatalog,
  isKeySnapPatternMechanicsDefinitionCatalog,
} from './definitions.js';
import type {
  GameCommandFailureReason,
  GameInformationTierId,
  GameParticipationFeedbackId,
  KeySnapDecisionId,
  PerformanceGradeBandId,
} from './ids.js';
import type {
  ActiveGameState,
  AppliedGameHookEvidence,
  GameCommandResult,
  GameCompletedWeekEvidence,
  GameMatchupEvidence,
  GameOpponentMechanicsProfile,
  GameScore,
  GameTuningDefinition,
  GameAttributeGrowthEvidence,
  KeySnapFamilyMechanicsDefinition,
  KeySnapInformationEvidence,
  KeySnapPatternMechanicsDefinition,
  KeySnapPlayEvidence,
  OffFieldGameContextEvidenceV1,
  PendingKeySnap,
  PostGamePhase,
  ScheduledGameIdentity,
  WrGameStatLine,
} from './types.js';
import { isGameId } from './ids.js';
import { createEmptyWrGameStatLine } from './types.js';
import { createWrTacticalSnapContextV1 } from './tactical-wr-v1.js';
import { matchesTacticalSnapContextV1, type TacticalSnapContextV1 } from './tactical-context-v1.js';
import { resolveTacticalFieldV1, type TacticalSnapResultV1 } from './tactical-alpha-v1.js';

const RNG_COMMAND_SAFETY_MARGIN = 1_000;
const ZERO_OPPORTUNITY_FEEDBACK_IDS = [
  'game_participation_special_teams',
  'game_participation_package_reps',
  'game_participation_late_reps',
  'game_participation_sideline_learning',
  'game_participation_scout_preparation',
] as const satisfies readonly GameParticipationFeedbackId[];

function failure(
  career: CareerRun,
  reason: GameCommandFailureReason,
): Extract<GameCommandResult, { readonly ok: false }> {
  return Object.freeze({ career, ok: false, reason });
}

function success(previousCareer: CareerRun, nextCareer: CareerRun): GameCommandResult {
  if (!validateCareerRun(nextCareer).ok) {
    return failure(previousCareer, 'game.internal_invariant_failure');
  }
  return deepFreeze({ career: nextCareer, ok: true });
}

function canIncrementRevision(career: CareerRun): boolean {
  return career.revision < Number.MAX_SAFE_INTEGER;
}

function canRunBoundedRngCommand(rng: RngState): boolean {
  return rng.drawCount <= Number.MAX_SAFE_INTEGER - RNG_COMMAND_SAFETY_MARGIN;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function completedWeekEvidence(career: CareerRun): GameCompletedWeekEvidence {
  if (career.phase.type !== 'WEEK_END') {
    throw new TypeError('Completed-week evidence requires WEEK_END.');
  }
  if (
    career.weeklyExperienceVersion === 2 &&
    career.phase.results.every((result) => 'preparationAfter' in result)
  ) {
    return {
      version: 2,
      results: cloneSerializable(career.phase.results),
      depthUpdate: cloneSerializable(career.phase.depthUpdate),
    } as GameCompletedWeekEvidence;
  }
  return {
    version: 1,
    results: cloneSerializable(career.phase.results),
    depthUpdate: cloneSerializable(career.phase.depthUpdate),
  } as GameCompletedWeekEvidence;
}

export function deriveGameOpportunityBudget(
  projection: GameMatchupEvidence['pregameProjection'],
  tuning: GameTuningDefinition,
  packageSnapBonusPermille = 0,
  relationshipSnapBonusPermille = 0,
): number | null {
  if (
    !isGameTuningDefinition(tuning) ||
    !Number.isSafeInteger(packageSnapBonusPermille) ||
    packageSnapBonusPermille < 0 ||
    packageSnapBonusPermille > 4_000 ||
    !Number.isSafeInteger(relationshipSnapBonusPermille) ||
    relationshipSnapBonusPermille < -100 ||
    relationshipSnapBonusPermille > 100 ||
    !Number.isSafeInteger(projection.rank) ||
    projection.rank < 1 ||
    projection.rank > 8 ||
    !Number.isSafeInteger(projection.minSnapPermille) ||
    !Number.isSafeInteger(projection.maxSnapPermille) ||
    projection.minSnapPermille < 0 ||
    projection.maxSnapPermille > 1_000 ||
    projection.minSnapPermille > projection.maxSnapPermille
  ) {
    return null;
  }
  const midpoint = clamp(
    Math.floor((projection.minSnapPermille + projection.maxSnapPermille) / 2) +
      packageSnapBonusPermille +
      relationshipSnapBonusPermille,
    0,
    1_000,
  );
  const rawBudget =
    midpoint <= tuning.zeroOpportunityMaxSnapPermille
      ? 0
      : (tuning.opportunityBands.find(({ minimumSnapPermille }) => midpoint >= minimumSnapPermille)
          ?.opportunityBudget ?? 0);
  const bounds = tuning.opportunityBoundsByDepthRank[projection.rank - 1]!;
  return clamp(rawBudget, bounds.minimumOpportunities, bounds.maximumOpportunities);
}

function validateMechanicsCatalogs(
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
): GameCommandFailureReason | null {
  if (!isGameTuningDefinition(tuning)) return 'game.invalid_tuning';
  if (!isKeySnapFamilyMechanicsDefinitionCatalog(familyDefinitions)) {
    return 'game.invalid_family_definitions';
  }
  if (!isKeySnapPatternMechanicsDefinitionCatalog(patternDefinitions, familyDefinitions)) {
    return 'game.invalid_pattern_definitions';
  }
  return null;
}

function collectGameHooks(
  career: CareerRun,
  skillDefinitions: readonly SkillMechanicsDefinition[],
): readonly CollectedGameHook[] | null {
  const result = collectEquippedGameHooks(career.player.skillState, skillDefinitions);
  return result.ok ? result.hooks : null;
}

function opportunityHookEvidence(
  hooks: readonly CollectedGameHook[],
): readonly AppliedGameHookEvidence[] {
  return hooks
    .filter(({ hookId }) => hookId === 'game_hook_package_snap_bonus')
    .map((hook) => ({ ...hook, appliedValue: hook.valueMilli }));
}

function sameHookEvidence(
  left: readonly AppliedGameHookEvidence[],
  right: readonly AppliedGameHookEvidence[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function prepareGameInternal(
  career: CareerRun,
  identity: ScheduledGameIdentity,
  playerProfile: GameOpponentMechanicsProfile,
  opponentProfile: GameOpponentMechanicsProfile,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
  availability?: {
    readonly maximumOpportunities: number;
    readonly offFieldContext?: OffFieldGameContextEvidenceV1;
  },
): GameCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'game.invalid_career');
  if (!canIncrementRevision(career)) return failure(career, 'game.revision_exhausted');
  if (
    career.phase.type !== 'WEEK_END' ||
    career.recruitingState.type !== 'COMMITTED' ||
    career.programId === null ||
    career.programContext === null
  ) {
    return failure(career, 'game.invalid_phase');
  }
  if (!isGameOpponentMechanicsProfile(playerProfile)) {
    return failure(career, 'game.invalid_player_profile');
  }
  if (!isGameOpponentMechanicsProfile(opponentProfile)) {
    return failure(career, 'game.invalid_opponent_profile');
  }
  if (playerProfile.programId !== career.programId) {
    return failure(career, 'game.invalid_player_profile');
  }
  if (opponentProfile.programId === career.programId) {
    return failure(career, 'game.invalid_opponent');
  }
  if (!isGameId(identity.gameId) || typeof identity.isHome !== 'boolean') {
    return failure(career, 'game.invalid_tuning');
  }
  const catalogFailure = validateMechanicsCatalogs(tuning, familyDefinitions, patternDefinitions);
  if (catalogFailure !== null) return failure(career, catalogFailure);
  const gameHooks = collectGameHooks(career, skillDefinitions);
  if (gameHooks === null) return failure(career, 'game.invalid_skill_definitions');
  const appliedOpportunityHooks = opportunityHookEvidence(gameHooks);
  const packageSnapBonusPermille = appliedOpportunityHooks.reduce(
    (total, hook) => total + hook.appliedValue,
    0,
  );
  const derivedOpportunityBudget = deriveGameOpportunityBudget(
    career.programContext.projection,
    tuning,
    packageSnapBonusPermille,
    availability?.offFieldContext?.relationshipEffects.opportunitySnapBonusPermille ?? 0,
  );
  if (derivedOpportunityBudget === null) return failure(career, 'game.invalid_tuning');
  if (
    availability !== undefined &&
    (!Number.isSafeInteger(availability.maximumOpportunities) ||
      availability.maximumOpportunities < 0 ||
      availability.maximumOpportunities > tuning.maxKeySnapOpportunities)
  ) {
    return failure(career, 'game.invalid_tuning');
  }
  const opportunityBudget = Math.min(
    derivedOpportunityBudget,
    availability?.maximumOpportunities ?? tuning.maxKeySnapOpportunities,
  );

  const cloned = cloneSerializable(career);
  const matchup: GameMatchupEvidence = {
    gameId: identity.gameId,
    weekIndex: career.weekIndex,
    playerProgramId: career.programId,
    opponentProgramId: opponentProfile.programId,
    isHome: identity.isHome,
    playerOffenseRating: playerProfile.offenseRating,
    playerDefenseRating: playerProfile.defenseRating,
    playerQbRating: playerProfile.qbRating,
    opponentOffenseRating: opponentProfile.offenseRating,
    opponentDefenseRating: opponentProfile.defenseRating,
    pregameProjection: cloneSerializable(career.programContext.projection),
    opportunityBudget,
    opportunityGameHooks: cloneSerializable(appliedOpportunityHooks),
    completedWeek: completedWeekEvidence(career),
    ...(availability?.offFieldContext === undefined
      ? {}
      : { offFieldContext: cloneSerializable(availability.offFieldContext) }),
  };
  return success(career, {
    ...cloned,
    revision: career.revision + 1,
    phase: { type: 'GAME_PREVIEW', matchup },
  });
}

export function prepareGame(
  career: CareerRun,
  playerProfile: GameOpponentMechanicsProfile,
  opponentProfile: GameOpponentMechanicsProfile,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
): GameCommandResult {
  return prepareGameInternal(
    career,
    { gameId: `game_week_${career.weekIndex}`, isHome: career.weekIndex % 2 === 0 },
    playerProfile,
    opponentProfile,
    tuning,
    familyDefinitions,
    patternDefinitions,
    skillDefinitions,
  );
}

export function prepareScheduledGame(
  career: CareerRun,
  identity: ScheduledGameIdentity,
  playerProfile: GameOpponentMechanicsProfile,
  opponentProfile: GameOpponentMechanicsProfile,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
  availability?: {
    readonly maximumOpportunities: number;
    readonly offFieldContext?: OffFieldGameContextEvidenceV1;
  },
): GameCommandResult {
  return prepareGameInternal(
    career,
    identity,
    playerProfile,
    opponentProfile,
    tuning,
    familyDefinitions,
    patternDefinitions,
    skillDefinitions,
    availability,
  );
}

function clockFromRemainingSeconds(
  secondsRemaining: number,
  tuning: GameTuningDefinition,
): { readonly period: 1 | 2 | 3 | 4; readonly clockSecondsRemaining: number } {
  if (secondsRemaining <= 0) return { period: 4, clockSecondsRemaining: 0 };
  const totalSeconds = tuning.periodCount * tuning.periodLengthSeconds;
  const elapsedSeconds = totalSeconds - secondsRemaining;
  const period = Math.min(
    tuning.periodCount,
    Math.floor(elapsedSeconds / tuning.periodLengthSeconds) + 1,
  ) as 1 | 2 | 3 | 4;
  return {
    period,
    clockSecondsRemaining: period * tuning.periodLengthSeconds - elapsedSeconds,
  };
}

function remainingSecondsFromClock(
  clock: ActiveGameState['clock'],
  tuning: GameTuningDefinition,
): number {
  return (
    (tuning.periodCount - clock.period) * tuning.periodLengthSeconds + clock.clockSecondsRemaining
  );
}

function scoringPoints(
  possessionId: 'game_possession_player_team' | 'game_possession_opponent',
  matchup: GameMatchupEvidence,
  tuning: GameTuningDefinition,
  roll: number,
): 0 | 3 | 7 {
  const playerPossession = possessionId === 'game_possession_player_team';
  const offenseRating = playerPossession
    ? matchup.playerOffenseRating
    : matchup.opponentOffenseRating;
  const defenseRating = playerPossession
    ? matchup.opponentDefenseRating
    : matchup.playerDefenseRating;
  const isHomeOffense = playerPossession === matchup.isHome;
  const ratingEdge =
    offenseRating + (isHomeOffense ? tuning.drive.homeRatingBonus : 0) - defenseRating;
  const touchdownChance = clamp(
    tuning.drive.touchdownBasePermille + ratingEdge * tuning.drive.ratingEdgePermillePerPoint,
    0,
    1_000,
  );
  const fieldGoalChance = clamp(
    tuning.drive.fieldGoalBasePermille +
      Math.trunc((ratingEdge * tuning.drive.ratingEdgePermillePerPoint) / 2),
    0,
    1_000 - touchdownChance,
  );
  return roll < touchdownChance ? 7 : roll < touchdownChance + fieldGoalChance ? 3 : 0;
}

function addScore(
  score: GameScore,
  possessionId: 'game_possession_player_team' | 'game_possession_opponent',
  points: 0 | 3 | 7,
): GameScore {
  return possessionId === 'game_possession_player_team'
    ? { playerTeam: score.playerTeam + points, opponent: score.opponent }
    : { playerTeam: score.playerTeam, opponent: score.opponent + points };
}

function addStats(left: WrGameStatLine, right: WrGameStatLine): WrGameStatLine {
  return {
    targets: left.targets + right.targets,
    receptions: left.receptions + right.receptions,
    receivingYards: left.receivingYards + right.receivingYards,
    receivingTouchdowns: left.receivingTouchdowns + right.receivingTouchdowns,
    drops: left.drops + right.drops,
    turnovers: left.turnovers + right.turnovers,
  };
}

function gradeBandForScore(score: number, tuning: GameTuningDefinition): PerformanceGradeBandId {
  return tuning.grade.bands.find(({ minimumScore }) => score >= minimumScore)!.id;
}

function resultForScore(score: GameScore) {
  return score.playerTeam > score.opponent
    ? ('game_result_win' as const)
    : score.playerTeam < score.opponent
      ? ('game_result_loss' as const)
      : ('game_result_tie' as const);
}

function zeroOpportunityFeedback(matchup: GameMatchupEvidence): GameParticipationFeedbackId {
  const index =
    (matchup.pregameProjection.rank + matchup.weekIndex) % ZERO_OPPORTUNITY_FEEDBACK_IDS.length;
  return ZERO_OPPORTUNITY_FEEDBACK_IDS[index]!;
}

function derivePerformanceGradeScore(
  statLine: WrGameStatLine,
  keyPlayLog: readonly KeySnapPlayEvidence[],
  tuning: GameTuningDefinition,
): number {
  if (keyPlayLog.length === 0) return tuning.grade.baseScore;
  const production =
    statLine.receptions * tuning.grade.receptionValue +
    Math.trunc(statLine.receivingYards / tuning.grade.receivingYardsDivisor) +
    statLine.receivingTouchdowns * tuning.grade.touchdownValue;
  const mistakes =
    statLine.drops * tuning.grade.dropPenalty + statLine.turnovers * tuning.grade.turnoverPenalty;
  const opportunityAdjustedProduction = Math.round(
    (production * tuning.grade.opportunityNormalizationTarget) / keyPlayLog.length,
  );
  const opportunityAdjustedMistakes = Math.round(
    (mistakes * tuning.grade.opportunityNormalizationTarget) / keyPlayLog.length,
  );
  const averageDecisionFit = Math.round(
    keyPlayLog.reduce((total, play) => total + play.decisionFit, 0) / keyPlayLog.length,
  );
  return clamp(
    tuning.grade.baseScore +
      opportunityAdjustedProduction -
      opportunityAdjustedMistakes +
      Math.trunc(averageDecisionFit / tuning.grade.fitDivisor),
    0,
    100,
  );
}

function hasId<TId extends string>(ids: readonly TId[], value: string): value is TId {
  return ids.some((id) => id === value);
}

function readAttribute(
  attributes: WrPlayerAttributes,
  attributeId: PlayerAttributeId,
): AttributeProgress {
  if (hasId(PHYSICAL_ATTRIBUTE_IDS, attributeId)) return attributes.physical[attributeId];
  if (hasId(MENTAL_ATTRIBUTE_IDS, attributeId)) return attributes.mental[attributeId];
  return attributes.wr[attributeId];
}

function replaceAttribute(
  attributes: WrPlayerAttributes,
  attributeId: PlayerAttributeId,
  progress: AttributeProgress,
): WrPlayerAttributes {
  if (hasId(PHYSICAL_ATTRIBUTE_IDS, attributeId)) {
    return {
      ...attributes,
      physical: { ...attributes.physical, [attributeId as PhysicalAttributeId]: progress },
    };
  }
  if (hasId(MENTAL_ATTRIBUTE_IDS, attributeId)) {
    return {
      ...attributes,
      mental: { ...attributes.mental, [attributeId as MentalAttributeId]: progress },
    };
  }
  return {
    ...attributes,
    wr: { ...attributes.wr, [attributeId as WrAttributeId]: progress },
  };
}

function applyGameAttributeXp(
  attributeId: PlayerAttributeId,
  progress: AttributeProgress,
  awardedXp: number,
): GameAttributeGrowthEvidence {
  const xpCapacity =
    progress.rating >= 100 ? 0 : (100 - progress.rating) * ATTRIBUTE_XP_PER_RATING - progress.xp;
  const appliedXp = Math.min(awardedXp, xpCapacity);
  const totalXp = progress.xp + appliedXp;
  const ratingAfter = Math.min(
    100,
    progress.rating + Math.floor(totalXp / ATTRIBUTE_XP_PER_RATING),
  );
  return {
    attributeId,
    awardedXp,
    appliedXp,
    ratingBefore: progress.rating,
    xpBefore: progress.xp,
    ratingAfter,
    xpAfter: ratingAfter === 100 ? 0 : totalXp % ATTRIBUTE_XP_PER_RATING,
  };
}

function deriveAttributeXpAwards(
  keyPlayLog: readonly KeySnapPlayEvidence[],
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  tuning: GameTuningDefinition,
): ReadonlyMap<PlayerAttributeId, number> {
  const familyById = new Map(familyDefinitions.map((family) => [family.id, family]));
  const awards = new Map<PlayerAttributeId, number>();
  for (const play of keyPlayLog) {
    const family = familyById.get(play.familyId)!;
    const familyXp =
      tuning.growth.baseAttributeXpPerOpportunity +
      Math.max(0, Math.floor(play.decisionFit / tuning.growth.fitXpDivisor));
    const distributed = family.attributeWeights.map(({ weightPermille }) =>
      Math.floor((familyXp * weightPermille) / 1_000),
    );
    distributed[0] =
      distributed[0]! + familyXp - distributed.reduce((total, value) => total + value, 0);
    family.attributeWeights.forEach(({ attributeId }, index) => {
      awards.set(attributeId, (awards.get(attributeId) ?? 0) + distributed[index]!);
    });
  }
  return awards;
}

function derivePostGameGrowth(
  career: CareerRun,
  keyPlayLog: readonly KeySnapPlayEvidence[],
  gradeBandId: PerformanceGradeBandId,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
) {
  const bodyBefore = career.player.state.body;
  const confidenceBefore = career.player.state.confidence;
  const coachTrustBefore = career.player.state.coachTrust;
  const participatedOnOffense = keyPlayLog.length > 0;
  const requestedBodyDelta = participatedOnOffense
    ? tuning.growth.baseBodyCost
    : Math.trunc(tuning.growth.baseBodyCost / 2);
  const requestedConfidenceDelta = participatedOnOffense
    ? tuning.growth.confidenceDeltaByBand[gradeBandId]
    : 0;
  const requestedCoachTrustDelta = participatedOnOffense
    ? tuning.growth.trustDeltaByBand[gradeBandId]
    : 0;
  const bodyAfter = clamp(bodyBefore + requestedBodyDelta, BODY_BOUNDS.min, BODY_BOUNDS.max);
  const confidenceAfter = clamp(
    confidenceBefore + requestedConfidenceDelta,
    CONFIDENCE_BOUNDS.min,
    CONFIDENCE_BOUNDS.max,
  );
  const coachTrustAfter = clamp(
    coachTrustBefore + requestedCoachTrustDelta,
    COACH_TRUST_BOUNDS.min,
    COACH_TRUST_BOUNDS.max,
  );

  let attributes: WrPlayerAttributes = cloneSerializable(career.player.attributes);
  const awards = deriveAttributeXpAwards(keyPlayLog, familyDefinitions, tuning);
  const attributeXp = PLAYER_ATTRIBUTE_IDS.flatMap((attributeId) => {
    const awardedXp = awards.get(attributeId) ?? 0;
    if (awardedXp === 0) return [];
    const evidence = applyGameAttributeXp(
      attributeId,
      readAttribute(attributes, attributeId),
      awardedXp,
    );
    attributes = replaceAttribute(attributes, attributeId, {
      rating: evidence.ratingAfter,
      xp: evidence.xpAfter,
    });
    return [evidence];
  });

  return {
    attributes,
    state: {
      ...career.player.state,
      body: bodyAfter,
      confidence: confidenceAfter,
      coachTrust: coachTrustAfter,
    },
    evidence: {
      bodyBefore,
      requestedBodyDelta,
      actualBodyDelta: bodyAfter - bodyBefore,
      bodyAfter,
      confidenceBefore,
      requestedConfidenceDelta,
      actualConfidenceDelta: confidenceAfter - confidenceBefore,
      confidenceAfter,
      coachTrustBefore,
      requestedCoachTrustDelta,
      actualCoachTrustDelta: coachTrustAfter - coachTrustBefore,
      coachTrustAfter,
      attributeXp,
    },
  } as const;
}

export interface WrGameCompletionEvidence {
  readonly gameCareerState: CareerRun['gameCareerState'];
  readonly player: CareerRun['player'];
  readonly phase: PostGamePhase;
}

/** Owning completion calculation only; the caller publishes and validates its versioned career. */
export function deriveWrGameCompletionEvidence(
  career: CareerRun,
  matchup: GameMatchupEvidence,
  score: GameScore,
  statLine: WrGameStatLine,
  keyPlayLog: readonly KeySnapPlayEvidence[],
  gameRngDrawCountBefore: number,
  nextRng: RngState,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
): WrGameCompletionEvidence {
  const gradeScore = derivePerformanceGradeScore(statLine, keyPlayLog, tuning);
  const gradeBandId = gradeBandForScore(gradeScore, tuning);
  const growth = derivePostGameGrowth(career, keyPlayLog, gradeBandId, tuning, familyDefinitions);
  const summary = {
    gameId: matchup.gameId,
    weekIndex: matchup.weekIndex,
    playerProgramId: matchup.playerProgramId,
    opponentProgramId: matchup.opponentProgramId,
    isHome: matchup.isHome,
    score,
    resultId: resultForScore(score),
    statLine,
    keySnapCount: keyPlayLog.length,
    performanceGradeScore: gradeScore,
    performanceGradeBandId: gradeBandId,
    participationFeedbackId:
      keyPlayLog.length === 0
        ? zeroOpportunityFeedback(matchup)
        : ('game_participation_offensive_role' as const),
    gameRngDrawCountBefore,
    gameRngDrawCountAfter: nextRng.drawCount,
  } as const;
  const resultId = summary.resultId;
  const previousState = career.gameCareerState;
  return deepFreeze(
    cloneSerializable({
      gameCareerState: {
        gamesPlayed: previousState.gamesPlayed + 1,
        wins: previousState.wins + (resultId === 'game_result_win' ? 1 : 0),
        losses: previousState.losses + (resultId === 'game_result_loss' ? 1 : 0),
        ties: previousState.ties + (resultId === 'game_result_tie' ? 1 : 0),
        cumulativeStats: addStats(previousState.cumulativeStats, statLine),
        cumulativeGradeScore: previousState.cumulativeGradeScore + gradeScore,
        lastGame: summary,
      },
      player: {
        ...career.player,
        attributes: growth.attributes,
        state: growth.state,
      },
      phase: {
        type: 'POST_GAME' as const,
        summary,
        growth: growth.evidence,
        keyPlayLog: cloneSerializable(keyPlayLog),
        completedWeek: cloneSerializable(matchup.completedWeek),
      },
    }),
  );
}

function completeGame(
  career: CareerRun,
  matchup: GameMatchupEvidence,
  score: GameScore,
  statLine: WrGameStatLine,
  keyPlayLog: readonly KeySnapPlayEvidence[],
  gameRngDrawCountBefore: number,
  nextRng: RngState,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
): GameCommandResult {
  return success(career, {
    ...cloneSerializable(career),
    revision: career.revision + 1,
    rng: nextRng,
    ...deriveWrGameCompletionEvidence(
      career,
      matchup,
      score,
      statLine,
      keyPlayLog,
      gameRngDrawCountBefore,
      nextRng,
      tuning,
      familyDefinitions,
    ),
  });
}

function informationTier(score: number, tuning: GameTuningDefinition): GameInformationTierId {
  return score >= tuning.information.diagnosticMinimumScore
    ? 'game_information_diagnostic'
    : score >= tuning.information.partialMinimumScore
      ? 'game_information_partial'
      : 'game_information_uncertain';
}

function clueCountForTier(tierId: GameInformationTierId): number {
  return tierId === 'game_information_diagnostic'
    ? 2
    : tierId === 'game_information_partial'
      ? 1
      : 0;
}

export function deriveKeySnapInformation(
  footballIqScore: number,
  preparationScore: number,
  filmStudyApplied: boolean,
  gameHooks: readonly CollectedGameHook[],
  clueIds: KeySnapPatternMechanicsDefinition['clueIds'],
  tuning: GameTuningDefinition,
  relationshipScoreModifier?: number,
): {
  readonly information: KeySnapInformationEvidence;
  readonly informationScore: number;
  readonly informationTierId: GameInformationTierId;
  readonly revealedClueIds: KeySnapPatternMechanicsDefinition['clueIds'][number][];
  readonly informationGameHooks: readonly AppliedGameHookEvidence[];
} | null {
  if (
    !isGameTuningDefinition(tuning) ||
    !Number.isSafeInteger(footballIqScore) ||
    footballIqScore < 0 ||
    footballIqScore > 100 ||
    !Number.isSafeInteger(preparationScore) ||
    preparationScore < 0 ||
    preparationScore > 100 ||
    typeof filmStudyApplied !== 'boolean' ||
    (relationshipScoreModifier !== undefined &&
      (!Number.isSafeInteger(relationshipScoreModifier) ||
        relationshipScoreModifier < -12 ||
        relationshipScoreModifier > 12))
  ) {
    return null;
  }
  const footballIqContributionMilli = footballIqScore * tuning.information.footballIqWeightPermille;
  const preparationContributionMilli =
    preparationScore * tuning.information.preparationWeightPermille;
  const baseScore = Math.round(
    (footballIqContributionMilli + preparationContributionMilli) / 1_000,
  );
  const filmStudyBonus = filmStudyApplied ? tuning.information.filmStudyBonus : 0;
  const informationGameHooks: AppliedGameHookEvidence[] = [];
  let coverageClueBonus = 0;
  let hookScoreBonus = 0;
  const scorePerClue =
    tuning.information.diagnosticMinimumScore - tuning.information.partialMinimumScore;
  for (const hook of gameHooks) {
    if (hook.hookId !== 'game_hook_coverage_clue_bonus') continue;
    const clueBonus = Math.max(0, Math.trunc(hook.valueMilli / 1_000));
    const scoreBonus = clueBonus * scorePerClue;
    coverageClueBonus += clueBonus;
    hookScoreBonus += scoreBonus;
    informationGameHooks.push({ ...hook, appliedValue: scoreBonus });
  }
  const finalScore = clamp(
    baseScore + filmStudyBonus + hookScoreBonus + (relationshipScoreModifier ?? 0),
    0,
    200,
  );
  const informationTierId = informationTier(finalScore, tuning);
  const baseTierId = informationTier(baseScore + filmStudyBonus, tuning);
  const revealedCount = Math.min(
    clueIds.length,
    Math.max(clueCountForTier(informationTierId), clueCountForTier(baseTierId) + coverageClueBonus),
  );
  return deepFreeze({
    information: {
      footballIqScore,
      footballIqContributionMilli,
      preparationScore,
      preparationContributionMilli,
      baseScore,
      filmStudyApplied,
      filmStudyBonus,
      hookScoreBonus,
      ...(relationshipScoreModifier === undefined ? {} : { relationshipScoreModifier }),
      finalScore,
    },
    informationScore: finalScore,
    informationTierId,
    revealedClueIds: clueIds.slice(0, revealedCount),
    informationGameHooks,
  });
}

function footballIqRating(career: CareerRun): number {
  return career.player.attributes.mental.attribute_football_iq.rating;
}

function didStudyFilm(matchup: GameMatchupEvidence): boolean {
  return matchup.completedWeek.results.some(({ actionId }) => actionId === 'action_film_study');
}

function createPendingSnap(
  career: CareerRun,
  game: Omit<ActiveGameState, 'opportunitiesPresented'>,
  pattern: KeySnapPatternMechanicsDefinition,
  family: KeySnapFamilyMechanicsDefinition,
  matchupRating: number,
  rngDrawCountBefore: number,
  gameHooks: readonly CollectedGameHook[],
  tuning: GameTuningDefinition,
): PendingKeySnap | null {
  const information = deriveKeySnapInformation(
    footballIqRating(career),
    career.player.state.preparation,
    didStudyFilm(game.matchup),
    gameHooks,
    pattern.clueIds,
    tuning,
    game.matchup.offFieldContext?.relationshipEffects.informationScoreModifier,
  );
  if (information === null) return null;
  return {
    keySnapId: `key_snap_week_${career.weekIndex}_${game.keyPlayLog.length + 1}`,
    patternId: pattern.id,
    familyId: pattern.familyId,
    decisionIds: cloneSerializable(family.decisionIds),
    coverageId: pattern.coverageId,
    leverageId: pattern.leverageId,
    matchupRating,
    ...information,
    rngDrawCountBefore,
  };
}

export interface WrSimulationCursor {
  readonly matchup: GameMatchupEvidence;
  readonly secondsRemaining: number;
  readonly driveIndex: number;
  readonly possessionId: 'game_possession_player_team' | 'game_possession_opponent';
  readonly score: GameScore;
  readonly statLine: WrGameStatLine;
  readonly keyPlayLog: readonly KeySnapPlayEvidence[];
  readonly gameRngDrawCountBefore: number;
}

export type WrDriveEvidenceResult =
  | { readonly ok: false; readonly reason: GameCommandFailureReason }
  | {
      readonly ok: true;
      readonly type: 'KEY_SNAP';
      readonly game: ActiveGameState;
      readonly pendingSnap: PendingKeySnap;
      readonly tacticalContext?: TacticalSnapContextV1;
      readonly nextRng: RngState;
    }
  | {
      readonly ok: true;
      readonly type: 'FINAL';
      readonly score: GameScore;
      readonly nextRng: RngState;
    };

/** Owning kernel; validated commands select rules at new-game creation only. */
export function advanceWrDriveEvidence(
  career: CareerRun,
  cursor: WrSimulationCursor,
  sourceRng: RngState,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  gameHooks: readonly CollectedGameHook[],
  tactical?: {
    readonly rulesVersion: 'tactical_game_v1';
    readonly finishPlayerDrive: boolean;
  },
): WrDriveEvidenceResult {
  const invalid = (): WrDriveEvidenceResult => ({
    ok: false,
    reason: 'game.internal_invariant_failure',
  });
  if (
    tactical !== undefined &&
    (tactical.rulesVersion !== 'tactical_game_v1' ||
      typeof tactical.finishPlayerDrive !== 'boolean' ||
      (tactical.finishPlayerDrive && cursor.possessionId !== 'game_possession_player_team'))
  )
    return invalid();
  const canonicalPatterns = [...patternDefinitions].sort((left, right) =>
    compareCodeUnits(left.id, right.id),
  );
  const familyById = new Map(familyDefinitions.map((family) => [family.id, family]));
  let secondsRemaining = cursor.secondsRemaining;
  let driveIndex = cursor.driveIndex;
  let score = cursor.score;
  let possessionId = cursor.possessionId;
  let currentRng = sourceRng;

  const remainingOpportunities = cursor.matchup.opportunityBudget - cursor.keyPlayLog.length;
  // Only current initialization reserves actual clock for future decisions.
  // Historical calls retain literal zero-clock opportunities and draw cadence.
  function elapse(sampledSeconds: number, reserveSeconds: number): boolean {
    if (tactical === undefined || reserveSeconds === 0) {
      secondsRemaining = Math.max(0, secondsRemaining - sampledSeconds);
      return true;
    }
    if (secondsRemaining <= reserveSeconds) return false;
    secondsRemaining -= Math.min(sampledSeconds, secondsRemaining - reserveSeconds);
    return true;
  }

  try {
    if (tactical?.finishPlayerDrive) {
      const duration = nextInt(
        currentRng,
        tuning.drive.minimumSecondsElapsed,
        tuning.drive.maximumSecondsElapsed + 1,
      );
      currentRng = duration.nextRng;
      if (!elapse(duration.value, remainingOpportunities > 0 ? 3 * remainingOpportunities + 1 : 0))
        return invalid();
      const scoreSample = nextInt(currentRng, 0, 1_000);
      currentRng = scoreSample.nextRng;
      score = addScore(
        score,
        possessionId,
        scoringPoints(possessionId, cursor.matchup, tuning, scoreSample.value),
      );
      possessionId = 'game_possession_opponent';
    }
    while (
      driveIndex < tuning.drive.maxDriveCount &&
      (secondsRemaining > 0 || cursor.keyPlayLog.length < cursor.matchup.opportunityBudget)
    ) {
      const durationSample = nextInt(
        currentRng,
        tuning.drive.minimumSecondsElapsed,
        tuning.drive.maximumSecondsElapsed + 1,
      );
      currentRng = durationSample.nextRng;
      const reserveSeconds =
        remainingOpportunities > 0
          ? 3 * remainingOpportunities - (possessionId === 'game_possession_player_team' ? 1 : 0)
          : 0;
      if (!elapse(durationSample.value, reserveSeconds)) return invalid();
      driveIndex += 1;

      if (
        possessionId === 'game_possession_player_team' &&
        cursor.keyPlayLog.length < cursor.matchup.opportunityBudget
      ) {
        const pendingRngDrawCountBefore = currentRng.drawCount;
        const patternSample = nextInt(currentRng, 0, canonicalPatterns.length);
        const pattern = canonicalPatterns[patternSample.value]!;
        const family = familyById.get(pattern.familyId)!;
        const downSample = nextInt(patternSample.nextRng, 1, 5);
        const distanceSample = nextInt(downSample.nextRng, 1, 16);
        const yardLineSample = nextInt(distanceSample.nextRng, 10, 91);
        const matchupSample = nextInt(yardLineSample.nextRng, 40, 101);
        currentRng = matchupSample.nextRng;
        const gameWithoutCount = {
          matchup: cursor.matchup,
          clock: clockFromRemainingSeconds(secondsRemaining, tuning),
          situation: {
            possessionId,
            driveIndex,
            down: downSample.value as 1 | 2 | 3 | 4,
            distanceYards:
              tactical === undefined
                ? distanceSample.value
                : Math.min(distanceSample.value, 100 - yardLineSample.value),
            yardLine: yardLineSample.value,
          },
          score,
          statLine: cursor.statLine,
          keyPlayLog: cursor.keyPlayLog,
          gameRngDrawCountBefore: cursor.gameRngDrawCountBefore,
        } satisfies Omit<ActiveGameState, 'opportunitiesPresented'>;
        const pendingSnap = createPendingSnap(
          career,
          gameWithoutCount,
          pattern,
          family,
          matchupSample.value,
          pendingRngDrawCountBefore,
          gameHooks,
          tuning,
        );
        if (pendingSnap === null) return invalid();
        const game = { ...gameWithoutCount, opportunitiesPresented: cursor.keyPlayLog.length + 1 };
        const tacticalContext =
          tactical === undefined ? undefined : createWrTacticalSnapContextV1(game, pendingSnap);
        if (tactical !== undefined && tacticalContext === undefined) return invalid();
        return deepFreeze(
          cloneSerializable({
            ok: true as const,
            type: 'KEY_SNAP' as const,
            game,
            pendingSnap,
            ...(tacticalContext === undefined ? {} : { tacticalContext }),
            nextRng: currentRng,
          }),
        );
      }

      const scoreSample = nextInt(currentRng, 0, 1_000);
      currentRng = scoreSample.nextRng;
      score = addScore(
        score,
        possessionId,
        scoringPoints(possessionId, cursor.matchup, tuning, scoreSample.value),
      );
      possessionId =
        possessionId === 'game_possession_player_team'
          ? 'game_possession_opponent'
          : 'game_possession_player_team';
    }
  } catch {
    return { ok: false, reason: 'game.rng_exhausted' };
  }

  if (cursor.keyPlayLog.length !== cursor.matchup.opportunityBudget) {
    return invalid();
  }
  return deepFreeze(
    cloneSerializable({ ok: true as const, type: 'FINAL' as const, score, nextRng: currentRng }),
  );
}

function advanceSimulation(
  career: CareerRun,
  cursor: WrSimulationCursor,
  sourceRng: RngState,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  gameHooks: readonly CollectedGameHook[],
): GameCommandResult {
  const advanced = advanceWrDriveEvidence(
    career,
    cursor,
    sourceRng,
    tuning,
    familyDefinitions,
    patternDefinitions,
    gameHooks,
  );
  if (!advanced.ok) return failure(career, advanced.reason);
  if (advanced.type === 'KEY_SNAP') {
    return success(career, {
      ...cloneSerializable(career),
      revision: career.revision + 1,
      rng: advanced.nextRng,
      phase: { type: 'KEY_SNAP', game: advanced.game, pendingSnap: advanced.pendingSnap },
    });
  }
  return completeGame(
    career,
    cursor.matchup,
    advanced.score,
    cursor.statLine,
    cursor.keyPlayLog,
    cursor.gameRngDrawCountBefore,
    advanced.nextRng,
    tuning,
    familyDefinitions,
  );
}

/** Exact historical-compatible kickoff source; this does not choose current rules or draw. */
export function prepareWrKickoffEvidence(
  career: CareerRun,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
):
  | Extract<GameCommandResult, { readonly ok: false }>
  | {
      readonly ok: true;
      readonly cursor: WrSimulationCursor;
      readonly gameHooks: readonly CollectedGameHook[];
    } {
  if (!validateCareerRun(career).ok) return failure(career, 'game.invalid_career');
  if (!canIncrementRevision(career)) return failure(career, 'game.revision_exhausted');
  if (career.phase.type !== 'GAME_PREVIEW') return failure(career, 'game.invalid_phase');
  const catalogFailure = validateMechanicsCatalogs(tuning, familyDefinitions, patternDefinitions);
  if (catalogFailure !== null) return failure(career, catalogFailure);
  const gameHooks = collectGameHooks(career, skillDefinitions);
  if (gameHooks === null) return failure(career, 'game.invalid_skill_definitions');
  if (
    !sameHookEvidence(career.phase.matchup.opportunityGameHooks, opportunityHookEvidence(gameHooks))
  ) {
    return failure(career, 'game.invalid_skill_definitions');
  }
  if (!canRunBoundedRngCommand(career.rng)) return failure(career, 'game.rng_exhausted');

  const matchup = cloneSerializable(career.phase.matchup);
  const totalSeconds = tuning.periodCount * tuning.periodLengthSeconds;
  return deepFreeze(
    cloneSerializable({
      ok: true as const,
      gameHooks,
      cursor: {
        matchup,
        secondsRemaining: totalSeconds,
        driveIndex: 0,
        possessionId: matchup.isHome
          ? ('game_possession_opponent' as const)
          : ('game_possession_player_team' as const),
        score: { playerTeam: 0, opponent: 0 },
        statLine: createEmptyWrGameStatLine(),
        keyPlayLog: [],
        gameRngDrawCountBefore: career.rng.drawCount,
      },
    }),
  );
}

export function startGame(
  career: CareerRun,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
): GameCommandResult {
  const kickoff = prepareWrKickoffEvidence(
    career,
    tuning,
    familyDefinitions,
    patternDefinitions,
    skillDefinitions,
  );
  if (!kickoff.ok) return kickoff;
  return advanceSimulation(
    career,
    kickoff.cursor,
    restoreRngState(career.rng),
    tuning,
    familyDefinitions,
    patternDefinitions,
    kickoff.gameHooks,
  );
}

function attributeRating(career: CareerRun, attributeId: PlayerAttributeId): number {
  if (PHYSICAL_ATTRIBUTE_IDS.some((candidate) => candidate === attributeId)) {
    return career.player.attributes.physical[attributeId as PhysicalAttributeId].rating;
  }
  if (MENTAL_ATTRIBUTE_IDS.some((candidate) => candidate === attributeId)) {
    return career.player.attributes.mental[attributeId as MentalAttributeId].rating;
  }
  return career.player.attributes.wr[attributeId as WrAttributeId].rating;
}

function isPressureSnap(game: ActiveGameState): boolean {
  return (
    game.clock.period === 4 ||
    game.situation.down >= 3 ||
    game.situation.distanceYards >= 8 ||
    Math.abs(game.score.playerTeam - game.score.opponent) <= 8
  );
}

/** Internal owning kernel: commands must validate career/catalogs/hooks first. */
export function resolveWrPlayEvidence(
  career: CareerRun,
  decisionId: KeySnapDecisionId,
  pattern: KeySnapPatternMechanicsDefinition,
  family: KeySnapFamilyMechanicsDefinition,
  gameHooks: readonly CollectedGameHook[],
  tuning: GameTuningDefinition,
  tacticalContext?: TacticalSnapContextV1,
): {
  readonly play: KeySnapPlayEvidence & { readonly tacticalResult?: TacticalSnapResultV1 };
  readonly nextRng: RngState;
} {
  if (career.phase.type !== 'KEY_SNAP') throw new TypeError('Resolution requires KEY_SNAP.');
  const { game, pendingSnap } = career.phase;
  if (tacticalContext !== undefined) {
    const actual = createWrTacticalSnapContextV1(game, pendingSnap);
    if (
      actual === undefined ||
      !matchesTacticalSnapContextV1(tacticalContext, actual) ||
      tacticalContext.clock.period !== actual.clock.period ||
      tacticalContext.clock.secondsRemaining !== actual.clock.secondsRemaining ||
      tacticalContext.field.driveIndex !== actual.field.driveIndex ||
      tacticalContext.field.down !== actual.field.down ||
      tacticalContext.field.distanceYards !== actual.field.distanceYards ||
      tacticalContext.field.lineOfScrimmageYards !== actual.field.lineOfScrimmageYards ||
      tacticalContext.score.playerTeam !== actual.score.playerTeam ||
      tacticalContext.score.opponent !== actual.score.opponent
    )
      throw new TypeError('game.invalid_tactical_context');
  }
  let currentRng = restoreRngState(career.rng);
  const rngDrawCountBefore = currentRng.drawCount;
  const outcomeRollSample = nextInt(
    currentRng,
    tuning.resolution.rollMinimum,
    tuning.resolution.rollMaximum + 1,
  );
  const targetSample = nextInt(outcomeRollSample.nextRng, 0, 1_000);
  const catchSample = nextInt(targetSample.nextRng, 0, 1_000);
  const riskSample = nextInt(catchSample.nextRng, 0, 1_000);
  const touchdownSample = nextInt(riskSample.nextRng, 0, 1_000);
  const yardSample = nextInt(touchdownSample.nextRng, -3, 7);
  currentRng = yardSample.nextRng;

  const attributeScore = Math.round(
    family.attributeWeights.reduce(
      (total, weight) =>
        total + attributeRating(career, weight.attributeId) * weight.weightPermille,
      0,
    ) / 1_000,
  );
  const decisionFit = pattern.decisionFits.find((fit) => fit.decisionId === decisionId)!.fit;
  const matchupScore = 100 - pendingSnap.matchupRating;
  const decisionFitScore = clamp(50 + decisionFit, 0, 100);
  const teamContextScore = Math.round(
    (game.matchup.playerOffenseRating +
      game.matchup.playerQbRating +
      (100 - game.matchup.opponentDefenseRating)) /
      3,
  );
  const bodyScore = career.player.state.body;
  const preparationScore = career.player.state.preparation;
  const confidenceScore = career.player.state.confidence;
  const attributeContributionMilli = attributeScore * tuning.resolution.attributeWeightPermille;
  const matchupContributionMilli = matchupScore * tuning.resolution.matchupWeightPermille;
  const decisionFitContributionMilli =
    decisionFitScore * tuning.resolution.decisionFitWeightPermille;
  const teamContextContributionMilli =
    teamContextScore * tuning.resolution.teamContextWeightPermille;
  const bodyContributionMilli = bodyScore * tuning.resolution.bodyWeightPermille;
  const preparationContributionMilli =
    preparationScore * tuning.resolution.preparationWeightPermille;
  const confidenceContributionMilli = confidenceScore * tuning.resolution.confidenceWeightPermille;
  const weightedScoreMilli =
    attributeContributionMilli +
    matchupContributionMilli +
    decisionFitContributionMilli +
    teamContextContributionMilli +
    bodyContributionMilli +
    preparationContributionMilli +
    confidenceContributionMilli;
  const pressureSnap = isPressureSnap(game);
  let skillAdjustment = 0;
  for (const hook of gameHooks) {
    if (hook.hookId === 'game_hook_assignment_reliability_bonus') {
      skillAdjustment += Math.round(hook.valueMilli / 10);
    } else if (hook.hookId === 'game_hook_pressure_composure_bonus' && pressureSnap) {
      skillAdjustment += Math.round(hook.valueMilli / 10);
    }
  }
  const finalScore = clamp(
    Math.round(weightedScoreMilli / 1_000) + skillAdjustment + outcomeRollSample.value,
    0,
    100,
  );
  const targetChancePermille = clamp(
    pattern.outcome.baseTargetPermille + (finalScore - 50) * 3,
    0,
    1_000,
  );
  let catchChancePermille = clamp(
    pattern.outcome.baseCatchPermille + (finalScore - 50) * 5,
    0,
    1_000,
  );
  const dropRiskPermille = pattern.outcome.dropRiskPermille;
  let turnoverRiskPermille = pattern.outcome.turnoverRiskPermille;
  const touchdownChancePermille = clamp(
    pattern.outcome.touchdownChancePermille + (finalScore - 50) * 2,
    0,
    1_000,
  );
  const receivingYardsBeforeHooks = clamp(
    pattern.outcome.baseReceivingYards + yardSample.value + Math.trunc((finalScore - 50) / 10),
    0,
    100,
  );
  let receivingYardsAfterHooks = receivingYardsBeforeHooks;
  const contestedHighPoint =
    family.id === 'key_snap_family_catch' && decisionId === 'key_snap_decision_attack_high_point';
  const aggressiveYac =
    family.id === 'key_snap_family_yac' && decisionId !== 'key_snap_decision_protect_ball';
  const appliedGameHooks: AppliedGameHookEvidence[] = [];
  for (const hook of gameHooks) {
    let appliedValue: number | null = null;
    if (hook.hookId === 'game_hook_assignment_reliability_bonus') {
      appliedValue = Math.round(hook.valueMilli / 10);
    } else if (hook.hookId === 'game_hook_pressure_composure_bonus' && pressureSnap) {
      appliedValue = Math.round(hook.valueMilli / 10);
    } else if (hook.hookId === 'game_hook_contested_catch_success_bonus' && contestedHighPoint) {
      const before = catchChancePermille;
      catchChancePermille = clamp(catchChancePermille + hook.valueMilli, 0, 1_000);
      appliedValue = catchChancePermille - before;
    } else if (hook.hookId === 'game_hook_tipped_turnover_risk_bonus' && contestedHighPoint) {
      const before = turnoverRiskPermille;
      turnoverRiskPermille = clamp(turnoverRiskPermille + hook.valueMilli, 0, 1_000);
      appliedValue = turnoverRiskPermille - before;
    } else if (hook.hookId === 'game_hook_yac_yardage_multiplier' && aggressiveYac) {
      const before = receivingYardsAfterHooks;
      receivingYardsAfterHooks = clamp(
        Math.round((receivingYardsAfterHooks * hook.valueMilli) / 1_000),
        0,
        100,
      );
      appliedValue = receivingYardsAfterHooks - before;
    } else if (hook.hookId === 'game_hook_fumble_risk_multiplier' && aggressiveYac) {
      const before = turnoverRiskPermille;
      turnoverRiskPermille = clamp(
        Math.round((turnoverRiskPermille * hook.valueMilli) / 1_000),
        0,
        1_000,
      );
      appliedValue = turnoverRiskPermille - before;
    }
    if (appliedValue !== null) appliedGameHooks.push({ ...hook, appliedValue });
  }

  const targetDelta = targetSample.value < targetChancePermille ? 1 : 0;
  const receptionDelta = targetDelta === 1 && catchSample.value < catchChancePermille ? 1 : 0;
  let dropDelta: 0 | 1 = 0;
  let turnoverDelta: 0 | 1 = 0;
  if (targetDelta === 1 && receptionDelta === 0) {
    if (family.id !== 'key_snap_family_yac' && riskSample.value < turnoverRiskPermille) {
      turnoverDelta = 1;
    } else if (riskSample.value < turnoverRiskPermille + dropRiskPermille) {
      dropDelta = 1;
    }
  } else if (
    receptionDelta === 1 &&
    family.id === 'key_snap_family_yac' &&
    riskSample.value < turnoverRiskPermille
  ) {
    turnoverDelta = 1;
  }
  const receivingTouchdownDelta =
    receptionDelta === 1 && turnoverDelta === 0 && touchdownSample.value < touchdownChancePermille
      ? 1
      : 0;
  let receivingYardsDelta = receptionDelta === 1 ? receivingYardsAfterHooks : 0;
  let scoreAfter =
    receivingTouchdownDelta === 1
      ? addScore(game.score, 'game_possession_player_team', 7)
      : game.score;
  let tacticalResult: TacticalSnapResultV1 | undefined;
  if (tacticalContext !== undefined) {
    tacticalResult = resolveTacticalFieldV1(tacticalContext, {
      decisionId,
      kind:
        targetDelta === 0
          ? 'UNTRACKED'
          : receptionDelta === 1
            ? 'ADVANCE'
            : turnoverDelta === 1
              ? 'INTERCEPTION'
              : 'INCOMPLETE',
      yards: receivingYardsAfterHooks,
      touchdown: receivingTouchdownDelta === 1,
      fumbleLost: receptionDelta === 1 && turnoverDelta === 1,
    });
    if (tacticalResult === undefined) throw new TypeError('game.invalid_tactical_result');
    receivingYardsDelta = receptionDelta === 1 ? tacticalResult.ball.offenseYards! : 0;
    scoreAfter = tacticalResult.scoreAfter;
  }
  const resultId =
    targetDelta === 0
      ? ('game_play_result_not_targeted' as const)
      : turnoverDelta === 1
        ? ('game_play_result_turnover' as const)
        : dropDelta === 1
          ? ('game_play_result_drop' as const)
          : receptionDelta === 0
            ? ('game_play_result_incomplete' as const)
            : receivingTouchdownDelta === 1
              ? ('game_play_result_touchdown' as const)
              : ('game_play_result_reception' as const);

  return {
    play: {
      keySnapId: pendingSnap.keySnapId,
      patternId: pattern.id,
      familyId: family.id,
      decisionId,
      decisionFit,
      resolution: {
        attributeScore,
        attributeContributionMilli,
        matchupScore,
        matchupContributionMilli,
        decisionFitScore,
        decisionFitContributionMilli,
        teamContextScore,
        teamContextContributionMilli,
        bodyScore,
        bodyContributionMilli,
        preparationScore,
        preparationContributionMilli,
        confidenceScore,
        confidenceContributionMilli,
        weightedScoreMilli,
        skillAdjustment,
        rngRoll: outcomeRollSample.value,
        finalScore,
        targetChancePermille,
        catchChancePermille,
        dropRiskPermille,
        turnoverRiskPermille,
        touchdownChancePermille,
        receivingYardsBeforeHooks,
        receivingYardsAfterHooks,
      },
      resultId,
      targetDelta,
      receptionDelta,
      receivingYardsDelta,
      receivingTouchdownDelta,
      dropDelta,
      turnoverDelta,
      scoreBefore: cloneSerializable(game.score),
      scoreAfter,
      rngDrawCountBefore,
      rngDrawCountAfter: currentRng.drawCount,
      appliedGameHooks,
      ...(tacticalResult === undefined ? {} : { tacticalResult }),
    },
    nextRng: currentRng,
  };
}

export interface WrResolvedSnapBoundaryV1 {
  readonly model: 'wr_resolved_snap_boundary_v1';
  readonly rulesVersion: 'tactical_game_v1';
  readonly play: KeySnapPlayEvidence & { readonly tacticalResult: TacticalSnapResultV1 };
  readonly nextRng: RngState;
  readonly continuation: WrSimulationCursor;
  /** Aggregate the remainder of this drive, not another personal snap. */
  readonly finishPlayerDrive: boolean;
}

type WrSnapTransitionResult =
  | Extract<GameCommandResult, { readonly ok: false }>
  | {
      readonly ok: true;
      readonly play: KeySnapPlayEvidence & { readonly tacticalResult?: TacticalSnapResultV1 };
      readonly nextRng: RngState;
      readonly cursor: WrSimulationCursor;
      readonly gameHooks: readonly CollectedGameHook[];
      readonly finishPlayerDrive: boolean;
    };

/** Shared owning input checks and resolution; aggregate career validation is the caller's job. */
function resolveWrSnapTransition(
  career: CareerRun,
  decisionId: KeySnapDecisionId,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
  tactical = false,
): WrSnapTransitionResult {
  if (!canIncrementRevision(career)) return failure(career, 'game.revision_exhausted');
  if (career.phase.type !== 'KEY_SNAP') return failure(career, 'game.invalid_phase');
  const catalogFailure = validateMechanicsCatalogs(tuning, familyDefinitions, patternDefinitions);
  if (catalogFailure !== null) return failure(career, catalogFailure);
  const gameHooks = collectGameHooks(career, skillDefinitions);
  if (gameHooks === null) return failure(career, 'game.invalid_skill_definitions');
  if (
    !sameHookEvidence(
      career.phase.game.matchup.opportunityGameHooks,
      opportunityHookEvidence(gameHooks),
    )
  ) {
    return failure(career, 'game.invalid_skill_definitions');
  }
  if (!canRunBoundedRngCommand(career.rng)) return failure(career, 'game.rng_exhausted');
  const { game, pendingSnap } = career.phase;
  if (!pendingSnap.decisionIds.some((candidate) => candidate === decisionId)) {
    return failure(career, 'game.invalid_decision');
  }
  const family = familyDefinitions.find(({ id }) => id === pendingSnap.familyId);
  const pattern = patternDefinitions.find(({ id }) => id === pendingSnap.patternId);
  if (
    family === undefined ||
    pattern === undefined ||
    pattern.familyId !== family.id ||
    JSON.stringify(family.decisionIds) !== JSON.stringify(pendingSnap.decisionIds) ||
    pattern.coverageId !== pendingSnap.coverageId ||
    pattern.leverageId !== pendingSnap.leverageId
  ) {
    return failure(career, 'game.invalid_pattern_definitions');
  }
  const expectedInformation = deriveKeySnapInformation(
    footballIqRating(career),
    career.player.state.preparation,
    didStudyFilm(game.matchup),
    gameHooks,
    pattern.clueIds,
    tuning,
    game.matchup.offFieldContext?.relationshipEffects.informationScoreModifier,
  );
  if (
    expectedInformation === null ||
    JSON.stringify(expectedInformation) !==
      JSON.stringify({
        information: pendingSnap.information,
        informationScore: pendingSnap.informationScore,
        informationTierId: pendingSnap.informationTierId,
        revealedClueIds: pendingSnap.revealedClueIds,
        informationGameHooks: pendingSnap.informationGameHooks,
      })
  ) {
    return failure(career, 'game.invalid_skill_definitions');
  }

  const context = tactical ? createWrTacticalSnapContextV1(game, pendingSnap) : undefined;
  if (tactical && context === undefined) return failure(career, 'game.internal_invariant_failure');
  let resolved: ReturnType<typeof resolveWrPlayEvidence>;
  try {
    resolved = resolveWrPlayEvidence(
      career,
      decisionId,
      pattern,
      family,
      gameHooks,
      tuning,
      context,
    );
  } catch {
    return failure(career, 'game.rng_exhausted');
  }
  const play = resolved.play;
  const statLine = addStats(game.statLine, {
    targets: play.targetDelta,
    receptions: play.receptionDelta,
    receivingYards: play.receivingYardsDelta,
    receivingTouchdowns: play.receivingTouchdownDelta,
    drops: play.dropDelta,
    turnovers: play.turnoverDelta,
  });
  const keyPlayLog = [...game.keyPlayLog, play];
  const finishPlayerDrive =
    tactical &&
    play.tacticalResult !== undefined &&
    ['RETAINED', 'UNTRACKED'].includes(play.tacticalResult.possessionOutcome);
  return deepFreeze(
    cloneSerializable({
      ok: true as const,
      play,
      nextRng: resolved.nextRng,
      gameHooks,
      finishPlayerDrive,
      cursor: {
        matchup: game.matchup,
        secondsRemaining: remainingSecondsFromClock(game.clock, tuning),
        driveIndex: game.situation.driveIndex,
        possessionId: finishPlayerDrive
          ? ('game_possession_player_team' as const)
          : ('game_possession_opponent' as const),
        score: play.scoreAfter,
        statLine,
        keyPlayLog,
        gameRngDrawCountBefore: game.gameRngDrawCountBefore,
      },
    }),
  );
}

export function resolveKeySnap(
  career: CareerRun,
  decisionId: KeySnapDecisionId,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
): GameCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'game.invalid_career');
  const resolved = resolveWrSnapTransition(
    career,
    decisionId,
    tuning,
    familyDefinitions,
    patternDefinitions,
    skillDefinitions,
  );
  if (!resolved.ok) return resolved;
  return advanceSimulation(
    career,
    resolved.cursor,
    resolved.nextRng,
    tuning,
    familyDefinitions,
    patternDefinitions,
    resolved.gameHooks,
  );
}

/** Internal staged boundary. A future v8 command must validate the complete current source first. */
export function stageWrResolvedSnapBoundaryV1(
  career: CareerRun,
  decisionId: KeySnapDecisionId,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
):
  | Extract<GameCommandResult, { readonly ok: false }>
  | { readonly ok: true; readonly boundary: WrResolvedSnapBoundaryV1 } {
  const resolved = resolveWrSnapTransition(
    career,
    decisionId,
    tuning,
    familyDefinitions,
    patternDefinitions,
    skillDefinitions,
    true,
  );
  if (!resolved.ok) return resolved;
  const tacticalResult = resolved.play.tacticalResult;
  if (tacticalResult === undefined) return failure(career, 'game.internal_invariant_failure');
  return deepFreeze({
    ok: true,
    boundary: {
      model: 'wr_resolved_snap_boundary_v1' as const,
      rulesVersion: 'tactical_game_v1' as const,
      play: { ...resolved.play, tacticalResult },
      nextRng: resolved.nextRng,
      continuation: resolved.cursor,
      finishPlayerDrive: resolved.finishPlayerDrive,
    },
  });
}

/** Compare to finite engine output without dropping undefined/extra keys or array holes. */
export function matchesExactWrEvidence(value: unknown, expected: unknown): boolean {
  if (typeof expected !== 'object' || expected === null) return value === expected;
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) !== Array.isArray(expected)
  )
    return false;
  if (Array.isArray(value) && Array.isArray(expected) && value.length !== expected.length)
    return false;
  const keys = Object.keys(expected);
  if (Object.keys(value).length !== keys.length) return false;
  const record = value as Readonly<Record<string, unknown>>;
  const expectedRecord = expected as Readonly<Record<string, unknown>>;
  return keys.every(
    (key) => Object.hasOwn(value, key) && matchesExactWrEvidence(record[key], expectedRecord[key]),
  );
}

/** Source-bound exact replay, not a substitute for validating the owning career/source. */
export function matchesWrResolvedSnapBoundaryV1(
  value: unknown,
  career: CareerRun,
  decisionId: KeySnapDecisionId,
  tuning: GameTuningDefinition,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
  patternDefinitions: readonly KeySnapPatternMechanicsDefinition[],
  skillDefinitions: readonly SkillMechanicsDefinition[],
): value is WrResolvedSnapBoundaryV1 {
  try {
    const expected = stageWrResolvedSnapBoundaryV1(
      career,
      decisionId,
      tuning,
      familyDefinitions,
      patternDefinitions,
      skillDefinitions,
    );
    return expected.ok && matchesExactWrEvidence(value, expected.boundary);
  } catch {
    return false;
  }
}
