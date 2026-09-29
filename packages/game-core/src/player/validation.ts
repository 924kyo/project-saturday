import { isRngState } from '../random/rng.js';
import {
  isCompletedGameSummary,
  isWrGameStatLine,
  validateCareerGameState,
} from '../games/validation.js';
import { isGameId } from '../games/ids.js';
import { isEventCareerState, isPendingEventEvidence } from '../events/validation.js';
import type { AppliedEventBreakthroughGaugeDelta } from '../events/types.js';
import { isInjuryCareerState, isPendingInjuryChoiceEvidence } from '../injuries/validation.js';
import {
  OFF_FIELD_BENEFIT_IDS,
  RELATIONSHIP_ACTOR_IDS,
  TRANSFER_PROJECTION_FACTOR_IDS,
  isAcademicCheckpointId,
  isNilObligationId,
  isNilOfferId,
  isOffFieldBenefitId,
  isOffseasonCoachChangeId,
  isRelationshipActorId,
  isTransferConfidenceTierId,
  isTransferProjectionFactorId,
} from '../off-field/ids.js';
import { PRACTICE_IMPACT_BOUNDS, depthRoleIdForRank } from '../programs/tuning.js';
import {
  isDepthRoleId,
  isProgramOffenseStyleId,
  isProgramStrengthBandId,
  isRotationPolicyId,
} from '../programs/ids.js';
import { validateProgramState } from '../programs/validation.js';
import {
  SKILL_BREAKTHROUGH_SOURCE_IDS,
  isSkillBreakthroughSourceId,
  isSkillId,
} from '../skills/ids.js';
import { EQUIPPED_SKILL_SLOT_COUNT, SKILL_BREAKTHROUGH_OFFER_SIZE } from '../skills/types.js';
import {
  SKILL_APPLIED_WEEKLY_EFFECT_MAX,
  SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS,
  SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_BODY_DELTA_FLAT_BOUNDS,
  SKILL_BREAKTHROUGH_GAUGE_THRESHOLD,
  SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX,
  SKILL_BREAKTHROUGH_PROGRESS_SOURCE_COUNT_MAX,
  SKILL_BREAKTHROUGH_PROGRESS_SOURCE_POINTS_MAX,
  SKILL_EFFECT_COUNT_BOUNDS,
  SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS,
  SKILL_EFFECTIVE_BODY_DELTA_BOUNDS,
  SKILL_EFFECTIVE_CONFIDENCE_DELTA_BOUNDS,
  SKILL_EFFECTIVE_GPA_DELTA_MILLI_BOUNDS,
  SKILL_EFFECTIVE_PREPARATION_DELTA_BOUNDS,
  SKILL_CONFIDENCE_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_CONFIDENCE_DELTA_FLAT_BOUNDS,
  SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS,
  SKILL_GPA_DELTA_MILLI_BOUNDS,
  SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS,
  SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS,
  SKILL_PRACTICE_IMPACT_FLAT_AGGREGATE_BOUNDS,
  SKILL_PRACTICE_IMPACT_FLAT_BOUNDS,
  SKILL_PREPARATION_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_PREPARATION_DELTA_FLAT_BOUNDS,
  SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS,
  isSkillBreakthroughCadenceWeek,
} from '../skills/tuning.js';
import {
  ATTRIBUTE_PROGRESS_XP_BOUNDS,
  ATTRIBUTE_RATING_BOUNDS,
  BODY_BOUNDS,
  BRAND_BOUNDS,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
  HEIGHT_CM_BOUNDS,
  PREPARATION_BOUNDS,
  WEIGHT_KG_BOUNDS,
  isIntegerWithinBounds,
  isWithinBounds,
} from './bounds.js';
import { deepFreeze } from './immutable.js';
import {
  MENTAL_ATTRIBUTE_IDS,
  PERSONALITY_TRAIT_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  PLAYER_ATTRIBUTE_IDS,
  POSITION_WR_ID,
  WR_ATTRIBUTE_IDS,
  arePersonalityTraitsCompatible,
  isCareerId,
  isPersonalityTraitId,
  isPlayerAttributeId,
  isPlayerId,
  isPlayerTagId,
  isProgramId,
  isRecruitingBackgroundId,
  isStableDomainId,
  isWrArchetypeId,
} from './ids.js';
import { compareCodeUnits } from './order.js';
import {
  CAREER_SCHEMA_VERSION_V1,
  CAREER_SCHEMA_VERSION_V2,
  CAREER_SCHEMA_VERSION_V3,
  CAREER_SCHEMA_VERSION_V4,
  CAREER_SCHEMA_VERSION_V5,
  CAREER_SCHEMA_VERSION_V6,
  CAREER_SCHEMA_VERSION_V7,
  RECENT_WEEKLY_ACTION_ID_LIMIT,
  type CareerRun,
  type CareerRunV1,
  type CareerRunV2,
  type CareerRunV3,
  type CareerRunV4,
  type CareerRunV5,
  type CareerRunV6,
  type CareerRunV7,
} from './types.js';
import {
  TRAINING_PROFICIENCY_IDS,
  WEEKLY_ACTION_EFFECT_IDS,
  WEEKLY_ACTION_PROFICIENCY_IDS,
  isTrainingProficiencyId,
  isWeeklyActionEffectId,
  isWeeklyActionId,
} from '../weekly/ids.js';
import {
  ATTRIBUTE_XP_PER_RATING,
  BODY_XP_EFFICIENCY_PERMILLE_BOUNDS,
  TRAINING_PROFICIENCY_LEVEL_BOUNDS,
  TRAINING_PROFICIENCY_USE_HARD_CAP,
  TRAINING_PROFICIENCY_XP_MULTIPLIER_PERMILLE_BOUNDS,
  PASSIVE_BODY_RECOVERY_BOUNDS,
  WEEKLY_ACTION_ATTRIBUTE_TARGET_MAX,
  WEEKLY_ACTION_BASE_XP_BOUNDS,
  WEEKLY_ACTION_BODY_DELTA_BOUNDS,
  WEEKLY_ACTION_CONFIDENCE_DELTA_BOUNDS,
  WEEKLY_ACTION_GPA_DELTA_BOUNDS,
  WEEKLY_ACTION_PREPARATION_DELTA_BOUNDS,
  WEEKLY_ACTION_PLAN_SIZE,
} from '../weekly/tuning.js';
import {
  WEEKLY_EXPERIENCE_VERSION_CURRENT,
  WEEKLY_EXPERIENCE_VERSION_LEGACY,
} from '../weekly/types.js';

export type CareerInvariantIssueCode =
  | 'invariant.duplicate_value'
  | 'invariant.invalid_combination'
  | 'invariant.invalid_id'
  | 'invariant.invalid_schema_version'
  | 'invariant.invalid_type'
  | 'invariant.invalid_value'
  | 'invariant.missing_field'
  | 'invariant.noncanonical_order'
  | 'invariant.out_of_bounds'
  | 'invariant.unknown_field';

export interface CareerInvariantIssue {
  readonly code: CareerInvariantIssueCode;
  readonly path: string;
}

export type CareerInvariantResult =
  | { readonly ok: true; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly CareerInvariantIssue[] };

type CareerSchemaVersion =
  | typeof CAREER_SCHEMA_VERSION_V1
  | typeof CAREER_SCHEMA_VERSION_V2
  | typeof CAREER_SCHEMA_VERSION_V3
  | typeof CAREER_SCHEMA_VERSION_V4
  | typeof CAREER_SCHEMA_VERSION_V5
  | typeof CAREER_SCHEMA_VERSION_V6
  | typeof CAREER_SCHEMA_VERSION_V7;

function usesExperienceSchema(schemaVersion: CareerSchemaVersion): boolean {
  return (
    schemaVersion === CAREER_SCHEMA_VERSION_V4 ||
    schemaVersion === CAREER_SCHEMA_VERSION_V5 ||
    schemaVersion === CAREER_SCHEMA_VERSION_V6 ||
    schemaVersion === CAREER_SCHEMA_VERSION_V7
  );
}

function usesSeasonSchema(schemaVersion: CareerSchemaVersion): boolean {
  return (
    schemaVersion === CAREER_SCHEMA_VERSION_V5 ||
    schemaVersion === CAREER_SCHEMA_VERSION_V6 ||
    schemaVersion === CAREER_SCHEMA_VERSION_V7
  );
}

function usesOffFieldSchema(schemaVersion: CareerSchemaVersion): boolean {
  return schemaVersion === CAREER_SCHEMA_VERSION_V6 || schemaVersion === CAREER_SCHEMA_VERSION_V7;
}

const CAREER_KEYS_V1 = [
  'schemaVersion',
  'id',
  'careerSeed',
  'rng',
  'revision',
  'programId',
  'weekIndex',
  'phase',
  'player',
] as const;
const CAREER_KEYS_V2 = [
  ...CAREER_KEYS_V1,
  'recentWeeklyActionIds',
  'lastPassiveBodyRecovery',
] as const;
const CAREER_KEYS_V3 = [...CAREER_KEYS_V2, 'recruitingState', 'programContext'] as const;
const CAREER_KEYS_V4 = [...CAREER_KEYS_V3, 'gameCareerState', 'weeklyExperienceVersion'] as const;
const CAREER_KEYS_V5 = [...CAREER_KEYS_V4, 'seasonCareerState'] as const;
const CAREER_KEYS_V6 = [...CAREER_KEYS_V5, 'offFieldCareerState'] as const;
const CAREER_KEYS_V7 = CAREER_KEYS_V6;
const OFF_FIELD_CAREER_STATE_KEYS = [
  'model',
  'academics',
  'relationships',
  'nil',
  'offseason',
  'programHistory',
] as const;
const PENDING_ACADEMIC_STATE_KEYS = [
  'model',
  'bootstrapStatus',
  'termIndex',
  'eligibilityStatus',
  'lastCheckpoint',
  'checkpointHistory',
] as const;
const ACTIVE_ACADEMIC_STATE_KEYS = [
  ...PENDING_ACADEMIC_STATE_KEYS,
  'nextCheckpointIndex',
  'restrictionGamesRemaining',
  'lastGameRestriction',
  'gameRestrictionHistory',
] as const;
const ACADEMIC_CHECKPOINT_EVIDENCE_KEYS = [
  'model',
  'checkpointId',
  'termIndex',
  'weekIndex',
  'gpaMilli',
  'obligationGpaDeltaMilli',
  'eligibleGpaMilli',
  'warningGpaMilli',
  'statusBefore',
  'statusAfter',
  'restrictionGamesBefore',
  'requestedRestrictionGames',
  'actualRestrictionGames',
  'restrictionGamesAfter',
] as const;
const ACADEMIC_GAME_RESTRICTION_EVIDENCE_KEYS = [
  'model',
  'gameId',
  'weekIndex',
  'restrictionGamesBefore',
  'restrictionGamesAfter',
] as const;
const PENDING_RELATIONSHIP_STATE_KEYS = ['model', 'bootstrapStatus', 'tracks', 'history'] as const;
const ACTIVE_RELATIONSHIP_STATE_KEYS = [
  ...PENDING_RELATIONSHIP_STATE_KEYS,
  'lastProcessedWeekIndex',
] as const;
const RELATIONSHIP_TRACK_KEYS = ['actorId', 'value'] as const;
const RELATIONSHIP_CHANGE_KEYS = [
  'actorId',
  'valueBefore',
  'baseDelta',
  'gainMultiplierPermille',
  'requestedDelta',
  'actualDelta',
  'valueAfter',
] as const;
const RELATIONSHIP_FOOTBALL_EFFECT_KEYS = [
  'coachTrustModifier',
  'informationScoreModifier',
  'opportunitySnapBonusPermille',
] as const;
const RELATIONSHIP_WEEK_EVIDENCE_KEYS = [
  'model',
  'sourceId',
  'weekIndex',
  'actionIds',
  'changes',
  'appliedSkillEffects',
  'footballEffectsBefore',
  'footballEffectsAfter',
  'coachTrustBefore',
  'requestedCoachTrustDelta',
  'actualCoachTrustDelta',
  'coachTrustAfter',
] as const;
const COLLECTED_LIFE_HOOK_KEYS = [
  'skillId',
  'slotIndex',
  'effectIndex',
  'hookId',
  'valueMilli',
] as const;
const PENDING_NIL_STATE_KEYS = [
  'model',
  'fictionalFundsUsd',
  'pendingOffers',
  'activeObligation',
  'history',
] as const;
const ACTIVE_NIL_STATE_KEYS = [
  'model',
  'bootstrapStatus',
  'fictionalFundsUsd',
  'benefitStacks',
  'pendingOffers',
  'activeObligation',
  'lastOfferAttempt',
  'history',
] as const;
const NIL_BENEFIT_STACK_KEYS = ['benefitId', 'quantity'] as const;
const NIL_SELECTION_CONTEXT_KEYS = [
  'brand',
  'depthRank',
  'gpaMilli',
  'programStrengthBandId',
  'tagIds',
] as const;
const NIL_SELECTION_EVIDENCE_KEYS = [
  'model',
  'weekIndex',
  'context',
  'eligibleOfferIds',
  'totalWeight',
  'roll',
  'selectedOfferId',
  'rngDrawCountBefore',
  'rngDrawCountAfter',
] as const;
const NIL_PENDING_OFFER_KEYS = [
  'offerId',
  'offeredWeekIndex',
  'expiresAfterWeekIndex',
  'selection',
] as const;
const NIL_ACTIVE_OBLIGATION_KEYS = [
  'offerId',
  'obligationId',
  'acceptedWeekIndex',
  'remainingWeeks',
  'lastResolvedWeekIndex',
] as const;
const NIL_EFFECT_APPLICATION_KEYS = [
  'model',
  'sourceId',
  'effectIndex',
  'effect',
  'rewardMultiplierPermille',
  'valueBefore',
  'baseDelta',
  'requestedDelta',
  'actualDelta',
  'valueAfter',
] as const;
const NIL_DECISION_EVIDENCE_KEYS = [
  'model',
  'weekIndex',
  'decisionId',
  'offer',
  'appliedSkillEffects',
  'rewardMultiplierPermille',
  'appliedEffects',
] as const;
const NIL_EXPIRATION_EVIDENCE_KEYS = ['model', 'weekIndex', 'offer'] as const;
const NIL_OBLIGATION_EVIDENCE_KEYS = [
  'model',
  'weekIndex',
  'resolutionId',
  'offerId',
  'obligationId',
  'focusCost',
  'remainingWeeksBefore',
  'remainingWeeksAfter',
  'appliedEffects',
] as const;
const PENDING_OFFSEASON_STATE_KEYS = [
  'model',
  'status',
  'completedDecisionCount',
  'lastDecision',
] as const;
const PROJECTED_OFFSEASON_STATE_KEYS = [
  ...PENDING_OFFSEASON_STATE_KEYS,
  'completedSeasonId',
  'completedSeasonIndex',
  'nextSeasonIndex',
  'academicTermIndexBefore',
  'academicTermIndexAfter',
  'worldProjection',
  'transferProjection',
] as const;
const OFFSEASON_WORLD_PROJECTION_KEYS = [
  'model',
  'programs',
  'worldRngDrawCountBefore',
  'worldRngDrawCountAfter',
] as const;
const OFFSEASON_PROGRAM_PROJECTION_KEYS = [
  'programId',
  'coachChangeId',
  'offenseStyleIdBefore',
  'offenseStyleIdAfter',
  'roomTalentBefore',
  'departureRelief',
  'incomingPressure',
  'roomTalentAfter',
  'coachChangeTotalWeight',
  'coachChangeRoll',
  'pressureMaximumInclusive',
  'departureRoll',
  'incomingRoll',
  'worldRngDrawCountBefore',
  'worldRngDrawCountAfter',
] as const;
const OFFSEASON_TRANSFER_PROJECTION_KEYS = [
  'model',
  'stayOption',
  'transferOptions',
  'shortlistSelections',
  'careerRngDrawCountBefore',
  'careerRngDrawCountAfter',
] as const;
const TRANSFER_OPTION_PROJECTION_KEYS = [
  'kind',
  'programId',
  'projectedDepthRank',
  'projectedRoleId',
  'projectedSnapMinPermille',
  'projectedSnapMaxPermille',
  'informationScore',
  'confidenceTierId',
  'uncertaintyPoints',
  'factors',
  'projectedScore',
  'projectedScoreMinimum',
  'projectedScoreMaximum',
] as const;
const TRANSFER_FACTOR_PROJECTION_KEYS = [
  'factorId',
  'score',
  'weightPermille',
  'contributionMilli',
] as const;
const TRANSFER_SHORTLIST_SELECTION_KEYS = [
  'selectionIndex',
  'candidateWeights',
  'totalWeight',
  'roll',
  'selectedProgramId',
  'careerRngDrawCountBefore',
  'careerRngDrawCountAfter',
] as const;
const TRANSFER_SHORTLIST_CANDIDATE_KEYS = ['programId', 'weight'] as const;
const OFFSEASON_DECISION_KEYS = [
  'model',
  'kind',
  'previousProgramId',
  'selectedProgramId',
  'selectedOption',
  'coachChangeId',
  'offenseStyleIdBefore',
  'offenseStyleIdAfter',
  'rotationPolicyIdAfter',
  'roomTalentMeanAfter',
  'coachTrustBefore',
  'coachTrustRetentionPermille',
  'coachTrustBaseline',
  'coachTrustRequestedAfter',
  'coachTrustAfter',
  'playerPracticeFormBefore',
  'playerPracticeFormAfter',
  'playerExperienceReadiness',
  'relationshipTransitions',
  'rosterRngDrawCountBefore',
  'rosterRngDrawCountAfter',
  'actualDepthRank',
  'actualRoleId',
  'actualSnapMinPermille',
  'actualSnapMaxPermille',
] as const;
const OFFSEASON_RELATIONSHIP_TRANSITION_KEYS = [
  'actorId',
  'valueBefore',
  'resetToNeutral',
  'resetValue',
  'valueAfter',
] as const;
const PROGRAM_HISTORY_ENTRY_KEYS = ['programId', 'startSeasonIndex', 'endSeasonIndex'] as const;
const PENDING_SEASON_CAREER_STATE_KEYS = [
  'model',
  'bootstrapStatus',
  'seasonsCompleted',
  'activeSeasonId',
  'lastCompletedSeason',
] as const;
const ACTIVE_SEASON_CAREER_STATE_KEYS = [
  ...PENDING_SEASON_CAREER_STATE_KEYS,
  'eventState',
  'injuryState',
  'gameSummaries',
  'roleHistory',
] as const;
const COMPLETED_SEASON_SUMMARY_KEYS = [
  'seasonId',
  'outcomeId',
  'regularSeasonRank',
  'postseasonSeed',
  'programWins',
  'programLosses',
  'programTies',
  'gamesPlayed',
  'playerWins',
  'playerLosses',
  'playerTies',
  'cumulativeStats',
  'averagePerformanceGrade',
  'bestGame',
  'roleHistory',
  'finalDepthRank',
  'finalRoleId',
  'ownedSkillIds',
  'equippedSkillIds',
  'injuryCount',
  'injuryWeeksMissed',
] as const;
const SEASON_ROLE_SNAPSHOT_KEYS = ['weekIndex', 'rank', 'roleId'] as const;
const PLAYER_KEYS_V1 = [
  'id',
  'displayName',
  'positionId',
  'archetypeId',
  'recruitingBackgroundId',
  'personalityTraitIds',
  'appearance',
  'heightCm',
  'weightKg',
  'attributes',
  'state',
  'tagIds',
  'trainingProficiencyUses',
] as const;
const PLAYER_KEYS_V2 = [...PLAYER_KEYS_V1, 'skillState'] as const;
const APPEARANCE_KEYS = [
  'skinToneId',
  'faceId',
  'hairStyleId',
  'hairColorId',
  'bodyTypeId',
  'eyeBlackId',
  'armSleevesId',
  'glovesId',
  'visorId',
  'wristTapeId',
  'towelId',
  'jerseyFitId',
  'footwearId',
] as const;
const ATTRIBUTE_GROUP_KEYS = ['physical', 'mental', 'wr'] as const;
const ATTRIBUTE_PROGRESS_KEYS = ['rating', 'xp'] as const;
const PLAYER_STATE_KEYS_V1 = ['body', 'confidence', 'coachTrust', 'brand', 'gpa'] as const;
const PLAYER_STATE_KEYS_V4 = [...PLAYER_STATE_KEYS_V1, 'preparation'] as const;
const RNG_STATE_KEYS = ['algorithm', 'state', 'drawCount'] as const;
const ACTION_RESULT_KEYS_V1 = [
  'actionId',
  'actionIndex',
  'weekIndex',
  'effectIds',
  'bodyBefore',
  'requestedBodyDelta',
  'actualBodyDelta',
  'bodyAfter',
  'bodyXpEfficiencyPermille',
  'gpaBefore',
  'requestedGpaDelta',
  'actualGpaDelta',
  'gpaAfter',
  'attributeXp',
  'proficiency',
] as const;
const ACTION_RESULT_KEYS_V2 = [
  ...ACTION_RESULT_KEYS_V1,
  'baseBodyDelta',
  'baseGpaDelta',
  'skillEffectAggregates',
  'appliedSkillEffects',
] as const;
const ACTION_RESULT_KEYS_V3 = [...ACTION_RESULT_KEYS_V2, 'practiceImpact'] as const;
const ACTION_RESULT_KEYS_V4 = [
  ...ACTION_RESULT_KEYS_V3,
  'preparationBefore',
  'basePreparationDelta',
  'requestedPreparationDelta',
  'actualPreparationDelta',
  'preparationAfter',
  'confidenceBefore',
  'baseConfidenceDelta',
  'requestedConfidenceDelta',
  'actualConfidenceDelta',
  'confidenceAfter',
] as const;
const SKILL_EFFECT_AGGREGATE_KEYS_V2 = [
  'xpMultiplierPermille',
  'bodyCostMultiplierPermille',
  'bodyDeltaFlat',
  'gpaDeltaMilli',
] as const;
const SKILL_EFFECT_AGGREGATE_KEYS_V4 = [
  ...SKILL_EFFECT_AGGREGATE_KEYS_V2,
  'preparationDeltaFlat',
  'confidenceDeltaFlat',
  'practiceImpactFlat',
] as const;
const APPLIED_SKILL_EFFECT_BASE_KEYS = ['skillId', 'slotIndex', 'effectIndex', 'type'] as const;
const ATTRIBUTE_XP_RESULT_KEYS = [
  'attributeId',
  'baseXp',
  'awardedXp',
  'appliedXp',
  'ratingBefore',
  'xpBefore',
  'ratingAfter',
  'xpAfter',
] as const;
const PROFICIENCY_RESULT_KEYS = [
  'proficiencyId',
  'usesBefore',
  'usesAfter',
  'levelBefore',
  'levelAfter',
  'xpMultiplierPermille',
] as const;
const PLAYER_SKILL_STATE_KEYS_V2 = ['acquisitions', 'equippedSkillIds'] as const;
const PLAYER_SKILL_STATE_KEYS_V4 = [...PLAYER_SKILL_STATE_KEYS_V2, 'breakthroughGauge'] as const;
const SKILL_ACQUISITION_KEYS_V2 = [
  'offerIndex',
  'weekIndex',
  'offeredSkillIds',
  'selectedSkillId',
  'rngDrawCountBefore',
  'rngDrawCountAfter',
] as const;
const SKILL_ACQUISITION_KEYS_V4 = [...SKILL_ACQUISITION_KEYS_V2, 'trigger'] as const;
const SKILL_BREAKTHROUGH_OFFER_KEYS_V2 = [
  'offerIndex',
  'weekIndex',
  'offeredSkillIds',
  'rngDrawCountBefore',
  'rngDrawCountAfter',
] as const;
const SKILL_BREAKTHROUGH_OFFER_KEYS_V4 = [...SKILL_BREAKTHROUGH_OFFER_KEYS_V2, 'trigger'] as const;
const SKILL_BREAKTHROUGH_GAUGE_KEYS = ['model', 'progress', 'threshold', 'lastProgress'] as const;
const SKILL_BREAKTHROUGH_PROGRESS_KEYS = [
  'model',
  'weekIndex',
  'progressBefore',
  'pointsEarned',
  'progressAfter',
  'threshold',
  'triggeredOffer',
  'sources',
] as const;
const SKILL_BREAKTHROUGH_PROGRESS_SOURCE_KEYS = ['sourceId', 'points'] as const;
const PASSIVE_BODY_RECOVERY_EVIDENCE_KEYS = [
  'weekIndex',
  'bodyBefore',
  'baseBodyDelta',
  'requestedBodyDelta',
  'actualBodyDelta',
  'bodyAfter',
  'appliedSkillEffects',
] as const;
const APPLIED_PASSIVE_BODY_RECOVERY_EFFECT_KEYS = [
  'type',
  'skillId',
  'slotIndex',
  'effectIndex',
  'delta',
] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function issue(issues: CareerInvariantIssue[], code: CareerInvariantIssueCode, path: string): void {
  issues.push({ code, path });
}

function strictRecord<const TKeys extends readonly string[]>(
  value: unknown,
  path: string,
  expectedKeys: TKeys,
  issues: CareerInvariantIssue[],
): (UnknownRecord & Record<TKeys[number], unknown>) | undefined {
  if (!isRecord(value)) {
    issue(issues, 'invariant.invalid_type', path);
    return undefined;
  }

  const expected = new Set(expectedKeys);
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) {
      issue(issues, 'invariant.missing_field', `${path}.${key}`);
    }
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      issue(issues, 'invariant.unknown_field', `${path}.${key}`);
    }
  }

  return value as UnknownRecord & Record<TKeys[number], unknown>;
}

function isValidCareerSeed(value: unknown): boolean {
  return (
    (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff) ||
    (typeof value === 'string' && value.length > 0 && value.length <= 256)
  );
}

function validateAppearance(value: unknown, issues: CareerInvariantIssue[]): void {
  const appearance = strictRecord(value, 'career.player.appearance', APPEARANCE_KEYS, issues);
  if (appearance === undefined) {
    return;
  }

  const prefixes: Readonly<Record<(typeof APPEARANCE_KEYS)[number], string>> = {
    skinToneId: 'skin_tone_',
    faceId: 'face_',
    hairStyleId: 'hair_style_',
    hairColorId: 'hair_color_',
    bodyTypeId: 'body_type_',
    eyeBlackId: 'eye_black_',
    armSleevesId: 'arm_sleeves_',
    glovesId: 'gloves_',
    visorId: 'visor_',
    wristTapeId: 'wrist_tape_',
    towelId: 'towel_',
    jerseyFitId: 'jersey_fit_',
    footwearId: 'footwear_',
  };
  const nullableKeys = new Set([
    'eyeBlackId',
    'armSleevesId',
    'glovesId',
    'visorId',
    'wristTapeId',
    'towelId',
  ]);

  for (const key of APPEARANCE_KEYS) {
    const optionId = appearance[key];
    if (nullableKeys.has(key) && optionId === null) {
      continue;
    }
    if (!isStableDomainId(optionId) || !optionId.startsWith(prefixes[key])) {
      issue(issues, 'invariant.invalid_id', `career.player.appearance.${key}`);
    }
  }
}

function validateAttributeGroup(
  value: unknown,
  groupPath: string,
  attributeIds: readonly string[],
  issues: CareerInvariantIssue[],
): void {
  const group = strictRecord(value, groupPath, attributeIds, issues);
  if (group === undefined) {
    return;
  }

  for (const attributeId of attributeIds) {
    if (!Object.hasOwn(group, attributeId)) {
      continue;
    }
    const attributePath = `${groupPath}.${attributeId}`;
    const progress = strictRecord(
      group[attributeId],
      attributePath,
      ATTRIBUTE_PROGRESS_KEYS,
      issues,
    );
    if (progress === undefined) {
      continue;
    }

    if (!isIntegerWithinBounds(progress.rating, ATTRIBUTE_RATING_BOUNDS)) {
      issue(issues, 'invariant.out_of_bounds', `${attributePath}.rating`);
    }
    if (!isIntegerWithinBounds(progress.xp, ATTRIBUTE_PROGRESS_XP_BOUNDS)) {
      issue(issues, 'invariant.out_of_bounds', `${attributePath}.xp`);
    }
    if (progress.rating === ATTRIBUTE_RATING_BOUNDS.max && progress.xp !== 0) {
      issue(issues, 'invariant.invalid_combination', attributePath);
    }
  }
}

function validateAttributes(value: unknown, issues: CareerInvariantIssue[]): void {
  const attributes = strictRecord(value, 'career.player.attributes', ATTRIBUTE_GROUP_KEYS, issues);
  if (attributes === undefined) {
    return;
  }

  validateAttributeGroup(
    attributes.physical,
    'career.player.attributes.physical',
    PHYSICAL_ATTRIBUTE_IDS,
    issues,
  );
  validateAttributeGroup(
    attributes.mental,
    'career.player.attributes.mental',
    MENTAL_ATTRIBUTE_IDS,
    issues,
  );
  validateAttributeGroup(attributes.wr, 'career.player.attributes.wr', WR_ATTRIBUTE_IDS, issues);
}

function validateState(
  value: unknown,
  schemaVersion: CareerSchemaVersion,
  issues: CareerInvariantIssue[],
): void {
  const state = strictRecord(
    value,
    'career.player.state',
    usesExperienceSchema(schemaVersion) ? PLAYER_STATE_KEYS_V4 : PLAYER_STATE_KEYS_V1,
    issues,
  );
  if (state === undefined) {
    return;
  }

  const boundedValues = [
    ['body', BODY_BOUNDS],
    ['confidence', CONFIDENCE_BOUNDS],
    ['coachTrust', COACH_TRUST_BOUNDS],
    ['brand', BRAND_BOUNDS],
  ] as const;
  for (const [key, valueBounds] of boundedValues) {
    if (!isIntegerWithinBounds(state[key], valueBounds)) {
      issue(issues, 'invariant.out_of_bounds', `career.player.state.${key}`);
    }
  }
  if (
    usesExperienceSchema(schemaVersion) &&
    !isIntegerWithinBounds(state['preparation'], PREPARATION_BOUNDS)
  ) {
    issue(issues, 'invariant.out_of_bounds', 'career.player.state.preparation');
  }
  if (!isWithinBounds(state.gpa, GPA_BOUNDS)) {
    issue(issues, 'invariant.out_of_bounds', 'career.player.state.gpa');
  }
}

function validatePersonalityTraits(value: unknown, issues: CareerInvariantIssue[]): void {
  const path = 'career.player.personalityTraitIds';
  if (!Array.isArray(value) || value.length !== 2) {
    issue(issues, 'invariant.invalid_type', path);
    return;
  }

  for (const [index, traitId] of value.entries()) {
    if (!isPersonalityTraitId(traitId)) {
      issue(issues, 'invariant.invalid_id', `${path}.${index}`);
    }
  }
  if (value[0] === value[1]) {
    issue(issues, 'invariant.duplicate_value', path);
  }

  const firstTrait = value[0];
  const secondTrait = value[1];
  if (isPersonalityTraitId(firstTrait) && isPersonalityTraitId(secondTrait)) {
    const firstIndex = PERSONALITY_TRAIT_IDS.indexOf(firstTrait);
    const secondIndex = PERSONALITY_TRAIT_IDS.indexOf(secondTrait);
    if (firstIndex >= secondIndex) {
      issue(issues, 'invariant.noncanonical_order', path);
    }
    if (!arePersonalityTraitsCompatible(firstTrait, secondTrait)) {
      issue(issues, 'invariant.invalid_combination', path);
    }
  }
}

function validateTagIds(value: unknown, issues: CareerInvariantIssue[]): void {
  const path = 'career.player.tagIds';
  if (!Array.isArray(value)) {
    issue(issues, 'invariant.invalid_type', path);
    return;
  }

  const seen = new Set<string>();
  for (const [index, tagId] of value.entries()) {
    if (!isPlayerTagId(tagId)) {
      issue(issues, 'invariant.invalid_id', `${path}.${index}`);
      continue;
    }
    if (seen.has(tagId)) {
      issue(issues, 'invariant.duplicate_value', `${path}.${index}`);
    }
    seen.add(tagId);
  }

  const sorted = [...value].map(String).sort(compareCodeUnits);
  if (value.some((tagId, index) => tagId !== sorted[index])) {
    issue(issues, 'invariant.noncanonical_order', path);
  }
}

function validateTrainingProficiencyUses(value: unknown, issues: CareerInvariantIssue[]): void {
  const path = 'career.player.trainingProficiencyUses';
  const uses = strictRecord(value, path, TRAINING_PROFICIENCY_IDS, issues);
  if (uses === undefined) {
    return;
  }

  for (const proficiencyId of TRAINING_PROFICIENCY_IDS) {
    const useCount = uses[proficiencyId];
    if (
      !Number.isInteger(useCount) ||
      (useCount as number) < 0 ||
      (useCount as number) > TRAINING_PROFICIENCY_USE_HARD_CAP
    ) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${proficiencyId}`);
    }
  }
}

function denseArray(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    issue(issues, 'invariant.invalid_type', path);
    return undefined;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      issue(issues, 'invariant.missing_field', `${path}.${index}`);
    }
  }
  return value;
}

interface SkillValidationSummary {
  readonly acquisitionCount: number;
  readonly lastAcquisitionWeekIndex: number;
  readonly lastRngDrawCountAfter: number;
  readonly ownedSkillIds: ReadonlySet<string>;
  readonly equippedSkillIds: readonly unknown[];
  readonly gaugeLastProgress: UnknownRecord | null;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function integerIn(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function validateReturningCompletedSeasonSummary(
  value: unknown,
  completedSeasonProgramIds: readonly unknown[],
  careerRngDrawCount: number,
  issues: CareerInvariantIssue[],
): void {
  const path = 'career.seasonCareerState.lastCompletedSeason';
  const summary = strictRecord(value, path, COMPLETED_SEASON_SUMMARY_KEYS, issues);
  if (summary === undefined) return;
  if (
    typeof summary['seasonId'] !== 'string' ||
    !isStableDomainId(summary['seasonId']) ||
    !summary['seasonId'].startsWith('season_')
  ) {
    issue(issues, 'invariant.invalid_id', `${path}.seasonId`);
  }
  if (
    ![
      'season_outcome_champion',
      'season_outcome_runner_up',
      'season_outcome_semifinal_exit',
      'season_outcome_regular_season_complete',
    ].includes(summary['outcomeId'] as string)
  ) {
    issue(issues, 'invariant.invalid_id', `${path}.outcomeId`);
  }
  for (const key of [
    'regularSeasonRank',
    'programWins',
    'programLosses',
    'programTies',
    'gamesPlayed',
    'playerWins',
    'playerLosses',
    'playerTies',
    'averagePerformanceGrade',
    'finalDepthRank',
    'injuryCount',
    'injuryWeeksMissed',
  ] as const) {
    if (!nonNegativeSafeInteger(summary[key])) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (summary['postseasonSeed'] !== null && !integerIn(summary['postseasonSeed'], 1, 4)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.postseasonSeed`);
  }
  if (!isWrGameStatLine(summary['cumulativeStats'])) {
    issue(issues, 'invariant.invalid_value', `${path}.cumulativeStats`);
  }
  if (
    summary['bestGame'] !== null &&
    !completedSeasonProgramIds.some((programId) =>
      isCompletedGameSummary(summary['bestGame'], programId, careerRngDrawCount),
    )
  ) {
    issue(issues, 'invariant.invalid_value', `${path}.bestGame`);
  }
  if (!isDepthRoleId(summary['finalRoleId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.finalRoleId`);
  }
  for (const [field, allowNull] of [
    ['ownedSkillIds', false],
    ['equippedSkillIds', true],
  ] as const) {
    const values = summary[field];
    if (
      !Array.isArray(values) ||
      !values.every((entry) => (allowNull && entry === null) || isSkillId(entry))
    ) {
      issue(issues, 'invariant.invalid_value', `${path}.${field}`);
    }
  }
  if (!Array.isArray(summary['roleHistory']) || summary['roleHistory'].length === 0) {
    issue(issues, 'invariant.invalid_value', `${path}.roleHistory`);
  }
}

function validateBreakthroughProgress(
  value: unknown,
  path: string,
  careerWeekIndex: number,
  issues: CareerInvariantIssue[],
): UnknownRecord | undefined {
  const progress = strictRecord(value, path, SKILL_BREAKTHROUGH_PROGRESS_KEYS, issues);
  if (progress === undefined) {
    return undefined;
  }
  if (progress['model'] !== 'gauge_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  if (!nonNegativeSafeInteger(progress['weekIndex']) || progress['weekIndex'] > careerWeekIndex) {
    issue(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
  }
  if (progress['threshold'] !== SKILL_BREAKTHROUGH_GAUGE_THRESHOLD) {
    issue(issues, 'invariant.invalid_value', `${path}.threshold`);
  }
  for (const key of ['progressBefore', 'progressAfter'] as const) {
    if (
      !nonNegativeSafeInteger(progress[key]) ||
      progress[key] > SKILL_BREAKTHROUGH_GAUGE_THRESHOLD
    ) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (
    !nonNegativeSafeInteger(progress['pointsEarned']) ||
    progress['pointsEarned'] > SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX
  ) {
    issue(issues, 'invariant.out_of_bounds', `${path}.pointsEarned`);
  }
  if (typeof progress['triggeredOffer'] !== 'boolean') {
    issue(issues, 'invariant.invalid_type', `${path}.triggeredOffer`);
  }
  const sources = denseArray(progress['sources'], `${path}.sources`, issues);
  let sourcePointTotal = 0;
  let previousSourceIndex = -1;
  const seenSources = new Set<string>();
  if (sources !== undefined) {
    if (sources.length > SKILL_BREAKTHROUGH_PROGRESS_SOURCE_COUNT_MAX) {
      issue(issues, 'invariant.out_of_bounds', `${path}.sources`);
    }
    for (const [index, rawSource] of sources.entries()) {
      const sourcePath = `${path}.sources.${index}`;
      const source = strictRecord(
        rawSource,
        sourcePath,
        SKILL_BREAKTHROUGH_PROGRESS_SOURCE_KEYS,
        issues,
      );
      if (source === undefined) {
        continue;
      }
      const sourceId = source['sourceId'];
      if (!isSkillBreakthroughSourceId(sourceId)) {
        issue(issues, 'invariant.invalid_id', `${sourcePath}.sourceId`);
      } else {
        const sourceOrder = SKILL_BREAKTHROUGH_SOURCE_IDS.indexOf(sourceId);
        if (seenSources.has(sourceId)) {
          issue(issues, 'invariant.duplicate_value', `${sourcePath}.sourceId`);
        }
        if (sourceOrder <= previousSourceIndex) {
          issue(issues, 'invariant.noncanonical_order', `${sourcePath}.sourceId`);
        }
        seenSources.add(sourceId);
        previousSourceIndex = sourceOrder;
      }
      const points = source['points'];
      if (
        !Number.isSafeInteger(points) ||
        (points as number) <= 0 ||
        (points as number) > SKILL_BREAKTHROUGH_PROGRESS_SOURCE_POINTS_MAX
      ) {
        issue(issues, 'invariant.out_of_bounds', `${sourcePath}.points`);
      } else {
        sourcePointTotal += points as number;
      }
    }
  }
  if (sourcePointTotal !== progress['pointsEarned']) {
    issue(issues, 'invariant.invalid_combination', `${path}.pointsEarned`);
  }
  if (
    nonNegativeSafeInteger(progress['progressBefore']) &&
    nonNegativeSafeInteger(progress['pointsEarned']) &&
    nonNegativeSafeInteger(progress['progressAfter']) &&
    typeof progress['triggeredOffer'] === 'boolean'
  ) {
    const total = progress['progressBefore'] + progress['pointsEarned'];
    const expectedAfter = progress['triggeredOffer']
      ? total - SKILL_BREAKTHROUGH_GAUGE_THRESHOLD
      : Math.min(total, SKILL_BREAKTHROUGH_GAUGE_THRESHOLD);
    if (
      (progress['triggeredOffer'] && total < SKILL_BREAKTHROUGH_GAUGE_THRESHOLD) ||
      progress['progressAfter'] !== expectedAfter
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.progressAfter`);
    }
  }
  return progress;
}

function sameBreakthroughProgress(left: UnknownRecord, right: UnknownRecord): boolean {
  for (const key of SKILL_BREAKTHROUGH_PROGRESS_KEYS) {
    if (key === 'sources') {
      continue;
    }
    if (left[key] !== right[key]) {
      return false;
    }
  }
  const leftSources = left['sources'];
  const rightSources = right['sources'];
  return (
    Array.isArray(leftSources) &&
    Array.isArray(rightSources) &&
    leftSources.length === rightSources.length &&
    leftSources.every((source, index) => {
      const candidate = rightSources[index];
      return (
        isRecord(source) &&
        isRecord(candidate) &&
        source['sourceId'] === candidate['sourceId'] &&
        source['points'] === candidate['points']
      );
    })
  );
}

function validateBreakthroughGauge(
  value: unknown,
  careerWeekIndex: number,
  currentEventGaugeEffect: AppliedEventBreakthroughGaugeDelta | undefined,
  issues: CareerInvariantIssue[],
): UnknownRecord | null {
  const path = 'career.player.skillState.breakthroughGauge';
  const gauge = strictRecord(value, path, SKILL_BREAKTHROUGH_GAUGE_KEYS, issues);
  if (gauge === undefined) {
    return null;
  }
  if (gauge['model'] !== 'gauge_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  if (gauge['threshold'] !== SKILL_BREAKTHROUGH_GAUGE_THRESHOLD) {
    issue(issues, 'invariant.invalid_value', `${path}.threshold`);
  }
  if (
    !nonNegativeSafeInteger(gauge['progress']) ||
    gauge['progress'] > SKILL_BREAKTHROUGH_GAUGE_THRESHOLD
  ) {
    issue(issues, 'invariant.out_of_bounds', `${path}.progress`);
  }
  if (gauge['lastProgress'] === null) {
    if (
      currentEventGaugeEffect === undefined
        ? gauge['progress'] !== 0
        : currentEventGaugeEffect.before !== 0 ||
          gauge['progress'] !== currentEventGaugeEffect.after
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.progress`);
    }
    return null;
  }
  const lastProgress = validateBreakthroughProgress(
    gauge['lastProgress'],
    `${path}.lastProgress`,
    careerWeekIndex,
    issues,
  );
  if (lastProgress !== undefined) {
    const expectedProgress =
      currentEventGaugeEffect === undefined
        ? lastProgress['progressAfter']
        : currentEventGaugeEffect.after;
    if (
      gauge['progress'] !== expectedProgress ||
      (currentEventGaugeEffect !== undefined &&
        currentEventGaugeEffect.before !== lastProgress['progressAfter'])
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.progress`);
    }
  }
  return lastProgress ?? null;
}

function validateOfferedSkillIds(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): readonly string[] | undefined {
  const offeredSkillIds = denseArray(value, path, issues);
  if (offeredSkillIds === undefined) {
    return undefined;
  }
  if (offeredSkillIds.length !== SKILL_BREAKTHROUGH_OFFER_SIZE) {
    issue(issues, 'invariant.invalid_combination', path);
  }
  const seen = new Set<string>();
  for (const [index, skillId] of offeredSkillIds.entries()) {
    if (!isSkillId(skillId)) {
      issue(issues, 'invariant.invalid_id', `${path}.${index}`);
      continue;
    }
    if (seen.has(skillId)) {
      issue(issues, 'invariant.duplicate_value', `${path}.${index}`);
    }
    seen.add(skillId);
  }
  return offeredSkillIds.map(String);
}

function validateOfferDrawRange(
  offer: UnknownRecord,
  path: string,
  minimumDrawCount: number,
  maximumDrawCount: number,
  issues: CareerInvariantIssue[],
): number {
  const before = offer['rngDrawCountBefore'];
  const after = offer['rngDrawCountAfter'];
  if (!nonNegativeSafeInteger(before)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.rngDrawCountBefore`);
  }
  if (!nonNegativeSafeInteger(after)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.rngDrawCountAfter`);
  }
  if (
    nonNegativeSafeInteger(before) &&
    nonNegativeSafeInteger(after) &&
    (before < minimumDrawCount ||
      after - before < SKILL_BREAKTHROUGH_OFFER_SIZE ||
      after > maximumDrawCount)
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.rngDrawCountAfter`);
  }
  return nonNegativeSafeInteger(after) ? after : minimumDrawCount;
}

function validatePlayerSkillState(
  value: unknown,
  careerWeekIndex: number,
  careerRngDrawCount: number,
  schemaVersion:
    | typeof CAREER_SCHEMA_VERSION_V2
    | typeof CAREER_SCHEMA_VERSION_V3
    | typeof CAREER_SCHEMA_VERSION_V4
    | typeof CAREER_SCHEMA_VERSION_V5
    | typeof CAREER_SCHEMA_VERSION_V6
    | typeof CAREER_SCHEMA_VERSION_V7,
  currentEventGaugeEffect: AppliedEventBreakthroughGaugeDelta | undefined,
  issues: CareerInvariantIssue[],
): SkillValidationSummary {
  const path = 'career.player.skillState';
  const currentSkillState = usesExperienceSchema(schemaVersion);
  const state = strictRecord(
    value,
    path,
    currentSkillState ? PLAYER_SKILL_STATE_KEYS_V4 : PLAYER_SKILL_STATE_KEYS_V2,
    issues,
  );
  const ownedSkillIds = new Set<string>();
  let validatedEquippedSkillIds: readonly unknown[] = [null, null, null, null];
  let lastRngDrawCountAfter = 0;
  let lastAcquisitionWeekIndex = 0;
  let acquisitionCount = 0;
  let gaugeLastProgress: UnknownRecord | null = null;

  if (state !== undefined) {
    const acquisitions = denseArray(state['acquisitions'], `${path}.acquisitions`, issues);
    if (acquisitions !== undefined) {
      acquisitionCount = acquisitions.length;
      for (const [index, rawAcquisition] of acquisitions.entries()) {
        const acquisitionPath = `${path}.acquisitions.${index}`;
        const hasTrigger = isRecord(rawAcquisition) && Object.hasOwn(rawAcquisition, 'trigger');
        const acquisition = strictRecord(
          rawAcquisition,
          acquisitionPath,
          currentSkillState && hasTrigger ? SKILL_ACQUISITION_KEYS_V4 : SKILL_ACQUISITION_KEYS_V2,
          issues,
        );
        if (acquisition === undefined) {
          continue;
        }
        if (acquisition['offerIndex'] !== index) {
          issue(issues, 'invariant.noncanonical_order', `${acquisitionPath}.offerIndex`);
        }
        const acquisitionWeekIndex = acquisition['weekIndex'];
        if (
          !nonNegativeSafeInteger(acquisitionWeekIndex) ||
          acquisitionWeekIndex > careerWeekIndex
        ) {
          issue(issues, 'invariant.out_of_bounds', `${acquisitionPath}.weekIndex`);
        } else {
          if (!hasTrigger && !isSkillBreakthroughCadenceWeek(acquisitionWeekIndex)) {
            issue(issues, 'invariant.invalid_combination', `${acquisitionPath}.weekIndex`);
          }
          if (index > 0 && acquisitionWeekIndex <= lastAcquisitionWeekIndex) {
            issue(issues, 'invariant.noncanonical_order', `${acquisitionPath}.weekIndex`);
          }
          lastAcquisitionWeekIndex = acquisitionWeekIndex;
        }
        if (hasTrigger) {
          const trigger = validateBreakthroughProgress(
            acquisition['trigger'],
            `${acquisitionPath}.trigger`,
            careerWeekIndex,
            issues,
          );
          if (
            trigger !== undefined &&
            (trigger['triggeredOffer'] !== true ||
              trigger['weekIndex'] !== acquisition['weekIndex'])
          ) {
            issue(issues, 'invariant.invalid_combination', `${acquisitionPath}.trigger`);
          }
        }
        const offeredSkillIds = validateOfferedSkillIds(
          acquisition['offeredSkillIds'],
          `${acquisitionPath}.offeredSkillIds`,
          issues,
        );
        for (const [offeredIndex, offeredSkillId] of (offeredSkillIds ?? []).entries()) {
          if (ownedSkillIds.has(offeredSkillId)) {
            issue(
              issues,
              'invariant.invalid_combination',
              `${acquisitionPath}.offeredSkillIds.${offeredIndex}`,
            );
          }
        }
        const selectedSkillId = acquisition['selectedSkillId'];
        if (!isSkillId(selectedSkillId)) {
          issue(issues, 'invariant.invalid_id', `${acquisitionPath}.selectedSkillId`);
        } else {
          if (!(offeredSkillIds ?? []).some((skillId) => skillId === selectedSkillId)) {
            issue(issues, 'invariant.invalid_combination', `${acquisitionPath}.selectedSkillId`);
          }
          if (ownedSkillIds.has(selectedSkillId)) {
            issue(issues, 'invariant.duplicate_value', `${acquisitionPath}.selectedSkillId`);
          }
          ownedSkillIds.add(selectedSkillId);
        }
        lastRngDrawCountAfter = validateOfferDrawRange(
          acquisition,
          acquisitionPath,
          lastRngDrawCountAfter,
          careerRngDrawCount,
          issues,
        );
      }
    }

    const equippedSkillIds = denseArray(
      state['equippedSkillIds'],
      `${path}.equippedSkillIds`,
      issues,
    );
    if (equippedSkillIds !== undefined) {
      validatedEquippedSkillIds = equippedSkillIds;
      if (equippedSkillIds.length !== EQUIPPED_SKILL_SLOT_COUNT) {
        issue(issues, 'invariant.invalid_combination', `${path}.equippedSkillIds`);
      }
      const equipped = new Set<string>();
      for (const [index, skillId] of equippedSkillIds.entries()) {
        if (skillId === null) {
          continue;
        }
        if (!isSkillId(skillId)) {
          issue(issues, 'invariant.invalid_id', `${path}.equippedSkillIds.${index}`);
          continue;
        }
        if (!ownedSkillIds.has(skillId)) {
          issue(issues, 'invariant.invalid_combination', `${path}.equippedSkillIds.${index}`);
        }
        if (equipped.has(skillId)) {
          issue(issues, 'invariant.duplicate_value', `${path}.equippedSkillIds.${index}`);
        }
        equipped.add(skillId);
      }
    }

    if (currentSkillState) {
      gaugeLastProgress = validateBreakthroughGauge(
        state['breakthroughGauge'],
        careerWeekIndex,
        currentEventGaugeEffect,
        issues,
      );
    }
  }

  return {
    acquisitionCount,
    lastAcquisitionWeekIndex,
    lastRngDrawCountAfter,
    ownedSkillIds,
    equippedSkillIds: validatedEquippedSkillIds,
    gaugeLastProgress,
  };
}

function validateSkillBreakthroughOffer(
  value: unknown,
  careerWeekIndex: number,
  careerRngDrawCount: number,
  skillSummary: SkillValidationSummary,
  schemaVersion:
    | typeof CAREER_SCHEMA_VERSION_V2
    | typeof CAREER_SCHEMA_VERSION_V3
    | typeof CAREER_SCHEMA_VERSION_V4
    | typeof CAREER_SCHEMA_VERSION_V5
    | typeof CAREER_SCHEMA_VERSION_V6
    | typeof CAREER_SCHEMA_VERSION_V7,
  issues: CareerInvariantIssue[],
): void {
  const path = 'career.phase.offer';
  const hasTrigger = isRecord(value) && Object.hasOwn(value, 'trigger');
  const offer = strictRecord(
    value,
    path,
    usesExperienceSchema(schemaVersion) && hasTrigger
      ? SKILL_BREAKTHROUGH_OFFER_KEYS_V4
      : SKILL_BREAKTHROUGH_OFFER_KEYS_V2,
    issues,
  );
  if (offer === undefined) {
    return;
  }
  if (offer['offerIndex'] !== skillSummary.acquisitionCount) {
    issue(issues, 'invariant.invalid_combination', `${path}.offerIndex`);
  }
  if (offer['weekIndex'] !== careerWeekIndex) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  } else if (!hasTrigger && !isSkillBreakthroughCadenceWeek(careerWeekIndex)) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  } else if (
    skillSummary.acquisitionCount > 0 &&
    careerWeekIndex <= skillSummary.lastAcquisitionWeekIndex
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  }
  if (hasTrigger) {
    const trigger = validateBreakthroughProgress(
      offer['trigger'],
      `${path}.trigger`,
      careerWeekIndex,
      issues,
    );
    if (
      trigger !== undefined &&
      (trigger['triggeredOffer'] !== true ||
        trigger['weekIndex'] !== careerWeekIndex ||
        skillSummary.gaugeLastProgress === null ||
        !sameBreakthroughProgress(trigger, skillSummary.gaugeLastProgress))
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.trigger`);
    }
  }
  const offeredSkillIds = validateOfferedSkillIds(
    offer['offeredSkillIds'],
    `${path}.offeredSkillIds`,
    issues,
  );
  for (const [index, skillId] of (offeredSkillIds ?? []).entries()) {
    if (skillSummary.ownedSkillIds.has(skillId)) {
      issue(issues, 'invariant.invalid_combination', `${path}.offeredSkillIds.${index}`);
    }
  }
  const drawCountAfter = validateOfferDrawRange(
    offer,
    path,
    skillSummary.lastRngDrawCountAfter,
    careerRngDrawCount,
    issues,
  );
  if (drawCountAfter !== careerRngDrawCount) {
    issue(issues, 'invariant.invalid_combination', `${path}.rngDrawCountAfter`);
  }
}

function validateRecentWeeklyActionIds(
  value: unknown,
  issues: CareerInvariantIssue[],
): readonly unknown[] | undefined {
  const path = 'career.recentWeeklyActionIds';
  const actionIds = denseArray(value, path, issues);
  if (actionIds === undefined) {
    return undefined;
  }
  if (actionIds.length > RECENT_WEEKLY_ACTION_ID_LIMIT) {
    issue(issues, 'invariant.out_of_bounds', path);
  }
  for (const [index, actionId] of actionIds.entries()) {
    if (!isWeeklyActionId(actionId)) {
      issue(issues, 'invariant.invalid_id', `${path}.${index}`);
    }
  }
  return actionIds;
}

function validateCurrentResultsInRecentHistory(
  phase: unknown,
  recentWeeklyActionIds: readonly unknown[] | undefined,
  issues: CareerInvariantIssue[],
): void {
  if (
    !isRecord(phase) ||
    phase['type'] === 'PLAN_ACTIONS' ||
    phase['type'] === 'SKILL_BREAKTHROUGH'
  ) {
    return;
  }
  const results = Array.isArray(phase['results']) ? phase['results'] : undefined;
  if (results === undefined || recentWeeklyActionIds === undefined) {
    return;
  }

  const expectedActionIds = results.map((result) =>
    isRecord(result) ? result['actionId'] : undefined,
  );
  if (expectedActionIds.length === 0) {
    return;
  }
  const suffix = recentWeeklyActionIds.slice(-expectedActionIds.length);
  if (
    suffix.length !== expectedActionIds.length ||
    suffix.some((actionId, index) => actionId !== expectedActionIds[index])
  ) {
    issue(issues, 'invariant.invalid_combination', 'career.recentWeeklyActionIds');
  }
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function validateLastPassiveBodyRecovery(
  value: unknown,
  careerWeekIndex: number,
  issues: CareerInvariantIssue[],
): void {
  const path = 'career.lastPassiveBodyRecovery';
  if (value === null) {
    return;
  }
  const evidence = strictRecord(value, path, PASSIVE_BODY_RECOVERY_EVIDENCE_KEYS, issues);
  if (evidence === undefined) {
    return;
  }

  const evidenceWeekIndex = evidence['weekIndex'];
  if (!Number.isSafeInteger(evidenceWeekIndex) || (evidenceWeekIndex as number) < 0) {
    issue(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
  } else if (careerWeekIndex === 0 || evidenceWeekIndex !== careerWeekIndex - 1) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  }

  const bodyBeforeValid = isIntegerWithinBounds(evidence['bodyBefore'], BODY_BOUNDS);
  const baseBodyDeltaValid = isIntegerWithinBounds(
    evidence['baseBodyDelta'],
    PASSIVE_BODY_RECOVERY_BOUNDS,
  );
  const requestedBodyDeltaValid = isIntegerWithinBounds(
    evidence['requestedBodyDelta'],
    PASSIVE_BODY_RECOVERY_BOUNDS,
  );
  const actualBodyDeltaValid = isIntegerWithinBounds(
    evidence['actualBodyDelta'],
    PASSIVE_BODY_RECOVERY_BOUNDS,
  );
  const bodyAfterValid = isIntegerWithinBounds(evidence['bodyAfter'], BODY_BOUNDS);
  if (!bodyBeforeValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.bodyBefore`);
  }
  if (!baseBodyDeltaValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.baseBodyDelta`);
  }
  if (!requestedBodyDeltaValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.requestedBodyDelta`);
  }
  if (!actualBodyDeltaValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.actualBodyDelta`);
  }
  if (!bodyAfterValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.bodyAfter`);
  }

  const traces = denseArray(evidence['appliedSkillEffects'], `${path}.appliedSkillEffects`, issues);
  let flatBodyDelta = 0;
  let previousSlotIndex = -1;
  let previousEffectIndex = -1;
  const historicalSkillIdBySlot = new Map<number, string>();
  const historicalSlotBySkillId = new Map<string, number>();
  if (traces !== undefined) {
    if (traces.length > SKILL_APPLIED_WEEKLY_EFFECT_MAX) {
      issue(issues, 'invariant.out_of_bounds', `${path}.appliedSkillEffects`);
    }
    for (const [index, rawTrace] of traces.entries()) {
      const tracePath = `${path}.appliedSkillEffects.${index}`;
      const trace = strictRecord(
        rawTrace,
        tracePath,
        APPLIED_PASSIVE_BODY_RECOVERY_EFFECT_KEYS,
        issues,
      );
      if (trace === undefined) {
        continue;
      }
      if (trace['type'] !== 'passive_body_recovery_flat') {
        issue(issues, 'invariant.invalid_value', `${tracePath}.type`);
      }
      const skillId = trace['skillId'];
      const skillIdValid = isSkillId(skillId);
      if (!skillIdValid) {
        issue(issues, 'invariant.invalid_id', `${tracePath}.skillId`);
      }
      const slotIndex = trace['slotIndex'];
      const effectIndex = trace['effectIndex'];
      const slotIndexValid =
        Number.isInteger(slotIndex) &&
        (slotIndex as number) >= 0 &&
        (slotIndex as number) < EQUIPPED_SKILL_SLOT_COUNT;
      const effectIndexValid =
        Number.isInteger(effectIndex) &&
        (effectIndex as number) >= 0 &&
        (effectIndex as number) < SKILL_EFFECT_COUNT_BOUNDS.max;
      if (!slotIndexValid) {
        issue(issues, 'invariant.out_of_bounds', `${tracePath}.slotIndex`);
      }
      if (!effectIndexValid) {
        issue(issues, 'invariant.out_of_bounds', `${tracePath}.effectIndex`);
      }
      if (slotIndexValid && effectIndexValid) {
        const slot = slotIndex as number;
        const effect = effectIndex as number;
        if (
          slot < previousSlotIndex ||
          (slot === previousSlotIndex && effect <= previousEffectIndex)
        ) {
          issue(issues, 'invariant.noncanonical_order', tracePath);
        }
        previousSlotIndex = slot;
        previousEffectIndex = effect;
      }
      if (slotIndexValid && skillIdValid) {
        const slot = slotIndex as number;
        const priorSkillId = historicalSkillIdBySlot.get(slot);
        const priorSlot = historicalSlotBySkillId.get(skillId);
        if (priorSkillId !== undefined && priorSkillId !== skillId) {
          issue(issues, 'invariant.invalid_combination', `${tracePath}.skillId`);
        }
        if (priorSlot !== undefined && priorSlot !== slot) {
          issue(issues, 'invariant.invalid_combination', `${tracePath}.skillId`);
        }
        historicalSkillIdBySlot.set(slot, skillId);
        historicalSlotBySkillId.set(skillId, slot);
      }
      if (
        !isIntegerWithinBounds(trace['delta'], SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS) ||
        trace['delta'] === 0
      ) {
        issue(issues, 'invariant.out_of_bounds', `${tracePath}.delta`);
      } else {
        flatBodyDelta += trace['delta'];
      }
    }
  }

  if (baseBodyDeltaValid && requestedBodyDeltaValid) {
    const boundedFlatBodyDelta = clamp(
      flatBodyDelta,
      SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS.max,
    );
    const expectedRequestedBodyDelta = clamp(
      (evidence['baseBodyDelta'] as number) + boundedFlatBodyDelta,
      PASSIVE_BODY_RECOVERY_BOUNDS.min,
      PASSIVE_BODY_RECOVERY_BOUNDS.max,
    );
    if (evidence['requestedBodyDelta'] !== expectedRequestedBodyDelta) {
      issue(issues, 'invariant.invalid_combination', `${path}.requestedBodyDelta`);
    }
  }
  if (bodyBeforeValid && requestedBodyDeltaValid && bodyAfterValid) {
    const expectedBodyAfter = clamp(
      (evidence['bodyBefore'] as number) + (evidence['requestedBodyDelta'] as number),
      BODY_BOUNDS.min,
      BODY_BOUNDS.max,
    );
    if (evidence['bodyAfter'] !== expectedBodyAfter) {
      issue(issues, 'invariant.invalid_combination', `${path}.bodyAfter`);
    }
    if (
      actualBodyDeltaValid &&
      evidence['actualBodyDelta'] !== expectedBodyAfter - (evidence['bodyBefore'] as number)
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.actualBodyDelta`);
    }
  }
}

function validStoredProgress(rating: unknown, xp: unknown): rating is number {
  return (
    isIntegerWithinBounds(rating, ATTRIBUTE_RATING_BOUNDS) &&
    isIntegerWithinBounds(xp, ATTRIBUTE_PROGRESS_XP_BOUNDS) &&
    (rating !== ATTRIBUTE_RATING_BOUNDS.max || xp === 0)
  );
}

function validateAttributeXpResult(
  value: unknown,
  path: string,
  bodyEfficiencyPermille: number | undefined,
  proficiencyMultiplierPermille: number | undefined,
  skillMultiplierPermille: number,
  issues: CareerInvariantIssue[],
): UnknownRecord | undefined {
  const result = strictRecord(value, path, ATTRIBUTE_XP_RESULT_KEYS, issues);
  if (result === undefined) {
    return undefined;
  }
  if (!isPlayerAttributeId(result.attributeId)) {
    issue(issues, 'invariant.invalid_id', `${path}.attributeId`);
  }
  if (!isIntegerWithinBounds(result.baseXp, WEEKLY_ACTION_BASE_XP_BOUNDS)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.baseXp`);
  }
  if (!Number.isInteger(result.awardedXp) || (result.awardedXp as number) < 0) {
    issue(issues, 'invariant.out_of_bounds', `${path}.awardedXp`);
  }
  if (!Number.isInteger(result.appliedXp) || (result.appliedXp as number) < 0) {
    issue(issues, 'invariant.out_of_bounds', `${path}.appliedXp`);
  }
  if (!validStoredProgress(result.ratingBefore, result.xpBefore)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.ratingBefore`);
  }
  if (!validStoredProgress(result.ratingAfter, result.xpAfter)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.ratingAfter`);
  }

  if (
    typeof result.baseXp === 'number' &&
    bodyEfficiencyPermille !== undefined &&
    proficiencyMultiplierPermille !== undefined
  ) {
    const expectedAwardedXp = Math.floor(
      (result.baseXp *
        bodyEfficiencyPermille *
        proficiencyMultiplierPermille *
        skillMultiplierPermille) /
        1_000_000_000,
    );
    if (result.awardedXp !== expectedAwardedXp) {
      issue(issues, 'invariant.invalid_combination', `${path}.awardedXp`);
    }
  }

  if (
    validStoredProgress(result.ratingBefore, result.xpBefore) &&
    Number.isInteger(result.awardedXp) &&
    (result.awardedXp as number) >= 0
  ) {
    const ratingBefore = result.ratingBefore;
    const xpBefore = result.xpBefore as number;
    const awardedXp = result.awardedXp as number;
    const xpCapacity =
      ratingBefore >= ATTRIBUTE_RATING_BOUNDS.max
        ? 0
        : (ATTRIBUTE_RATING_BOUNDS.max - ratingBefore) * ATTRIBUTE_XP_PER_RATING - xpBefore;
    const expectedAppliedXp = Math.min(awardedXp, xpCapacity);
    const totalXp = xpBefore + expectedAppliedXp;
    const expectedRatingAfter = Math.min(
      ATTRIBUTE_RATING_BOUNDS.max,
      ratingBefore + Math.floor(totalXp / ATTRIBUTE_XP_PER_RATING),
    );
    const expectedXpAfter =
      expectedRatingAfter === ATTRIBUTE_RATING_BOUNDS.max ? 0 : totalXp % ATTRIBUTE_XP_PER_RATING;
    if (result.appliedXp !== expectedAppliedXp) {
      issue(issues, 'invariant.invalid_combination', `${path}.appliedXp`);
    }
    if (result.ratingAfter !== expectedRatingAfter || result.xpAfter !== expectedXpAfter) {
      issue(issues, 'invariant.invalid_combination', path);
    }
  }
  return result;
}

function validateProficiencyResult(
  value: unknown,
  path: string,
  actionId: unknown,
  issues: CareerInvariantIssue[],
): UnknownRecord | null | undefined {
  if (value === null) {
    if (isWeeklyActionId(actionId) && WEEKLY_ACTION_PROFICIENCY_IDS[actionId] !== null) {
      issue(issues, 'invariant.invalid_combination', path);
    }
    return null;
  }

  const result = strictRecord(value, path, PROFICIENCY_RESULT_KEYS, issues);
  if (result === undefined) {
    return undefined;
  }
  if (!isTrainingProficiencyId(result.proficiencyId)) {
    issue(issues, 'invariant.invalid_id', `${path}.proficiencyId`);
    return result;
  }
  if (
    isWeeklyActionId(actionId) &&
    WEEKLY_ACTION_PROFICIENCY_IDS[actionId] !== result.proficiencyId
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.proficiencyId`);
  }
  const usesBefore = result.usesBefore;
  const usesAfter = result.usesAfter;
  const validUsesBefore =
    Number.isInteger(usesBefore) &&
    (usesBefore as number) >= 0 &&
    (usesBefore as number) <= TRAINING_PROFICIENCY_USE_HARD_CAP;
  const validUsesAfter =
    Number.isInteger(usesAfter) &&
    (usesAfter as number) >= 0 &&
    (usesAfter as number) <= TRAINING_PROFICIENCY_USE_HARD_CAP;
  if (!validUsesBefore) {
    issue(issues, 'invariant.out_of_bounds', `${path}.usesBefore`);
  }
  if (!validUsesAfter) {
    issue(issues, 'invariant.out_of_bounds', `${path}.usesAfter`);
  }
  const xpMultiplierPermille = result.xpMultiplierPermille;
  const multiplierValid = isIntegerWithinBounds(
    xpMultiplierPermille,
    TRAINING_PROFICIENCY_XP_MULTIPLIER_PERMILLE_BOUNDS,
  );
  if (!multiplierValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.xpMultiplierPermille`);
  }
  if (validUsesBefore && validUsesAfter) {
    const before = usesBefore as number;
    const after = usesAfter as number;
    if (after !== before && after !== before + 1) {
      issue(issues, 'invariant.invalid_combination', `${path}.usesAfter`);
    }
    if (
      !isIntegerWithinBounds(result.levelBefore, TRAINING_PROFICIENCY_LEVEL_BOUNDS) ||
      !isIntegerWithinBounds(result.levelAfter, TRAINING_PROFICIENCY_LEVEL_BOUNDS)
    ) {
      issue(issues, 'invariant.out_of_bounds', `${path}.levelBefore`);
    } else if (
      (result.levelAfter as number) < (result.levelBefore as number) ||
      (result.levelAfter as number) > (result.levelBefore as number) + 1 ||
      (after === before && result.levelAfter !== result.levelBefore)
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.levelAfter`);
    }
    if (
      multiplierValid &&
      ((result.levelBefore === 0 &&
        xpMultiplierPermille !== TRAINING_PROFICIENCY_XP_MULTIPLIER_PERMILLE_BOUNDS.min) ||
        ((result.levelBefore as number) > 0 &&
          xpMultiplierPermille <= TRAINING_PROFICIENCY_XP_MULTIPLIER_PERMILLE_BOUNDS.min))
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.xpMultiplierPermille`);
    }
  }
  return result;
}

function validateEffectIds(
  value: unknown,
  path: string,
  expectedEffectIds: readonly string[],
  issues: CareerInvariantIssue[],
): void {
  const effectIds = denseArray(value, path, issues);
  if (effectIds === undefined) {
    return;
  }
  const seen = new Set<string>();
  for (const [index, effectId] of effectIds.entries()) {
    if (!isWeeklyActionEffectId(effectId)) {
      issue(issues, 'invariant.invalid_id', `${path}.${index}`);
    } else if (seen.has(effectId)) {
      issue(issues, 'invariant.duplicate_value', `${path}.${index}`);
    }
    if (typeof effectId === 'string') {
      seen.add(effectId);
    }
  }
  if (
    effectIds.length !== expectedEffectIds.length ||
    effectIds.some((effectId, index) => effectId !== expectedEffectIds[index])
  ) {
    issue(issues, 'invariant.invalid_combination', path);
  }
}

interface ValidatedSkillEffectEvidence {
  readonly xpMultiplierPermille: number;
  readonly bodyCostMultiplierPermille: number;
  readonly bodyDeltaFlat: number;
  readonly gpaDeltaMilli: number;
  readonly preparationDeltaFlat: number;
  readonly confidenceDeltaFlat: number;
  readonly practiceImpactFlat: number;
}

function validateAppliedSkillEffects(
  value: unknown,
  aggregates: ValidatedSkillEffectEvidence,
  equippedSkillIds: readonly unknown[],
  currentEffectModel: boolean,
  path: string,
  issues: CareerInvariantIssue[],
): void {
  const traces = denseArray(value, path, issues);
  if (traces === undefined) {
    return;
  }
  if (traces.length > SKILL_APPLIED_WEEKLY_EFFECT_MAX) {
    issue(issues, 'invariant.out_of_bounds', path);
  }

  let xpMultiplierPermille = SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
  let bodyCostMultiplierPermille = SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
  let bodyDeltaFlat = 0;
  let gpaDeltaMilli = 0;
  let preparationDeltaFlat = 0;
  let confidenceDeltaFlat = 0;
  let practiceImpactFlat = 0;
  let previousSlotIndex = -1;
  let previousEffectIndex = -1;

  for (const [index, rawTrace] of traces.entries()) {
    const tracePath = `${path}.${index}`;
    if (!isRecord(rawTrace)) {
      issue(issues, 'invariant.invalid_type', tracePath);
      continue;
    }
    const type = rawTrace['type'];
    const valueKey =
      type === 'action_xp_multiplier' || type === 'action_body_cost_multiplier'
        ? 'multiplierPermille'
        : type === 'action_body_delta_flat' ||
            type === 'action_preparation_delta_flat' ||
            type === 'action_confidence_delta_flat' ||
            type === 'action_practice_impact_flat'
          ? 'delta'
          : type === 'action_gpa_delta_milli'
            ? 'deltaMilli'
            : undefined;
    const trace = strictRecord(
      rawTrace,
      tracePath,
      valueKey === undefined
        ? APPLIED_SKILL_EFFECT_BASE_KEYS
        : ([...APPLIED_SKILL_EFFECT_BASE_KEYS, valueKey] as const),
      issues,
    );
    if (trace === undefined) {
      continue;
    }

    const slotIndex = trace['slotIndex'];
    const effectIndex = trace['effectIndex'];
    const validSlotIndex =
      Number.isInteger(slotIndex) &&
      (slotIndex as number) >= 0 &&
      (slotIndex as number) < EQUIPPED_SKILL_SLOT_COUNT;
    const validEffectIndex =
      Number.isInteger(effectIndex) &&
      (effectIndex as number) >= 0 &&
      (effectIndex as number) < SKILL_EFFECT_COUNT_BOUNDS.max;
    if (!validSlotIndex) {
      issue(issues, 'invariant.out_of_bounds', `${tracePath}.slotIndex`);
    }
    if (!validEffectIndex) {
      issue(issues, 'invariant.out_of_bounds', `${tracePath}.effectIndex`);
    }
    if (!isSkillId(trace['skillId'])) {
      issue(issues, 'invariant.invalid_id', `${tracePath}.skillId`);
    } else if (validSlotIndex && equippedSkillIds[slotIndex as number] !== trace['skillId']) {
      issue(issues, 'invariant.invalid_combination', `${tracePath}.skillId`);
    }
    if (validSlotIndex && validEffectIndex) {
      const slot = slotIndex as number;
      const effect = effectIndex as number;
      if (
        slot < previousSlotIndex ||
        (slot === previousSlotIndex && effect <= previousEffectIndex)
      ) {
        issue(issues, 'invariant.noncanonical_order', tracePath);
      }
      previousSlotIndex = slot;
      previousEffectIndex = effect;
    }

    switch (type) {
      case 'action_xp_multiplier':
      case 'action_body_cost_multiplier': {
        const multiplier = trace['multiplierPermille'];
        if (
          !isIntegerWithinBounds(multiplier, SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS) ||
          multiplier === SKILL_NEUTRAL_MULTIPLIER_PERMILLE
        ) {
          issue(issues, 'invariant.out_of_bounds', `${tracePath}.multiplierPermille`);
          break;
        }
        if (type === 'action_xp_multiplier') {
          xpMultiplierPermille += multiplier - SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
        } else {
          bodyCostMultiplierPermille += multiplier - SKILL_NEUTRAL_MULTIPLIER_PERMILLE;
        }
        break;
      }
      case 'action_body_delta_flat':
        if (
          !isIntegerWithinBounds(trace['delta'], SKILL_BODY_DELTA_FLAT_BOUNDS) ||
          trace['delta'] === 0
        ) {
          issue(issues, 'invariant.out_of_bounds', `${tracePath}.delta`);
        } else {
          bodyDeltaFlat += trace['delta'];
        }
        break;
      case 'action_gpa_delta_milli':
        if (
          !isIntegerWithinBounds(trace['deltaMilli'], SKILL_GPA_DELTA_MILLI_BOUNDS) ||
          trace['deltaMilli'] === 0
        ) {
          issue(issues, 'invariant.out_of_bounds', `${tracePath}.deltaMilli`);
        } else {
          gpaDeltaMilli += trace['deltaMilli'];
        }
        break;
      case 'action_preparation_delta_flat':
      case 'action_confidence_delta_flat':
      case 'action_practice_impact_flat': {
        if (!currentEffectModel) {
          issue(issues, 'invariant.invalid_value', `${tracePath}.type`);
          break;
        }
        const bounds =
          type === 'action_preparation_delta_flat'
            ? SKILL_PREPARATION_DELTA_FLAT_BOUNDS
            : type === 'action_confidence_delta_flat'
              ? SKILL_CONFIDENCE_DELTA_FLAT_BOUNDS
              : SKILL_PRACTICE_IMPACT_FLAT_BOUNDS;
        if (!isIntegerWithinBounds(trace['delta'], bounds) || trace['delta'] === 0) {
          issue(issues, 'invariant.out_of_bounds', `${tracePath}.delta`);
        } else if (type === 'action_preparation_delta_flat') {
          preparationDeltaFlat += trace['delta'];
        } else if (type === 'action_confidence_delta_flat') {
          confidenceDeltaFlat += trace['delta'];
        } else {
          practiceImpactFlat += trace['delta'];
        }
        break;
      }
      default:
        issue(issues, 'invariant.invalid_value', `${tracePath}.type`);
    }
  }

  const expected = {
    xpMultiplierPermille: clamp(
      xpMultiplierPermille,
      SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS.min,
      SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS.max,
    ),
    bodyCostMultiplierPermille: clamp(
      bodyCostMultiplierPermille,
      SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS.min,
      SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS.max,
    ),
    bodyDeltaFlat: clamp(
      bodyDeltaFlat,
      SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS.max,
    ),
    gpaDeltaMilli: clamp(
      gpaDeltaMilli,
      SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS.min,
      SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS.max,
    ),
    preparationDeltaFlat: clamp(
      preparationDeltaFlat,
      SKILL_PREPARATION_DELTA_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_PREPARATION_DELTA_FLAT_AGGREGATE_BOUNDS.max,
    ),
    confidenceDeltaFlat: clamp(
      confidenceDeltaFlat,
      SKILL_CONFIDENCE_DELTA_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_CONFIDENCE_DELTA_FLAT_AGGREGATE_BOUNDS.max,
    ),
    practiceImpactFlat: clamp(
      practiceImpactFlat,
      SKILL_PRACTICE_IMPACT_FLAT_AGGREGATE_BOUNDS.min,
      SKILL_PRACTICE_IMPACT_FLAT_AGGREGATE_BOUNDS.max,
    ),
  };
  const aggregateKeys = currentEffectModel
    ? SKILL_EFFECT_AGGREGATE_KEYS_V4
    : SKILL_EFFECT_AGGREGATE_KEYS_V2;
  for (const key of aggregateKeys) {
    if (aggregates[key] !== expected[key]) {
      issue(
        issues,
        'invariant.invalid_combination',
        `${path.replace(/\.appliedSkillEffects$/u, '')}.skillEffectAggregates.${key}`,
      );
    }
  }
}

function validateSkillEffectEvidence(
  result: UnknownRecord,
  path: string,
  equippedSkillIds: readonly unknown[],
  currentEffectModel: boolean,
  issues: CareerInvariantIssue[],
): ValidatedSkillEffectEvidence {
  const neutral: ValidatedSkillEffectEvidence = {
    xpMultiplierPermille: SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
    bodyCostMultiplierPermille: SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
    bodyDeltaFlat: 0,
    gpaDeltaMilli: 0,
    preparationDeltaFlat: 0,
    confidenceDeltaFlat: 0,
    practiceImpactFlat: 0,
  };
  const aggregateKeys = currentEffectModel
    ? SKILL_EFFECT_AGGREGATE_KEYS_V4
    : SKILL_EFFECT_AGGREGATE_KEYS_V2;
  const stored = strictRecord(
    result['skillEffectAggregates'],
    `${path}.skillEffectAggregates`,
    aggregateKeys,
    issues,
  );
  if (stored === undefined) {
    validateAppliedSkillEffects(
      result['appliedSkillEffects'],
      neutral,
      equippedSkillIds,
      currentEffectModel,
      `${path}.appliedSkillEffects`,
      issues,
    );
    return neutral;
  }

  const boundsByKey = {
    xpMultiplierPermille: SKILL_XP_MULTIPLIER_AGGREGATE_BOUNDS,
    bodyCostMultiplierPermille: SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS,
    bodyDeltaFlat: SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS,
    gpaDeltaMilli: SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS,
    preparationDeltaFlat: SKILL_PREPARATION_DELTA_FLAT_AGGREGATE_BOUNDS,
    confidenceDeltaFlat: SKILL_CONFIDENCE_DELTA_FLAT_AGGREGATE_BOUNDS,
    practiceImpactFlat: SKILL_PRACTICE_IMPACT_FLAT_AGGREGATE_BOUNDS,
  } as const;
  const aggregates = { ...neutral };
  for (const key of aggregateKeys) {
    if (!isIntegerWithinBounds(stored[key], boundsByKey[key])) {
      issue(issues, 'invariant.out_of_bounds', `${path}.skillEffectAggregates.${key}`);
    } else {
      aggregates[key] = stored[key];
    }
  }
  validateAppliedSkillEffects(
    result['appliedSkillEffects'],
    aggregates,
    equippedSkillIds,
    currentEffectModel,
    `${path}.appliedSkillEffects`,
    issues,
  );
  return aggregates;
}

function validateActionResultV1(
  value: unknown,
  path: string,
  expectedActionId: unknown,
  expectedActionIndex: number,
  weekIndex: unknown,
  issues: CareerInvariantIssue[],
): UnknownRecord | undefined {
  const result = strictRecord(value, path, ACTION_RESULT_KEYS_V1, issues);
  if (result === undefined) {
    return undefined;
  }
  if (!isWeeklyActionId(result.actionId)) {
    issue(issues, 'invariant.invalid_id', `${path}.actionId`);
  } else if (expectedActionId !== undefined && result.actionId !== expectedActionId) {
    issue(issues, 'invariant.invalid_combination', `${path}.actionId`);
  }
  if (result.actionIndex !== expectedActionIndex) {
    issue(issues, 'invariant.invalid_combination', `${path}.actionIndex`);
  }
  if (result.weekIndex !== weekIndex) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  }

  const bodyBeforeValid = isIntegerWithinBounds(result.bodyBefore, BODY_BOUNDS);
  const bodyAfterValid = isIntegerWithinBounds(result.bodyAfter, BODY_BOUNDS);
  if (!bodyBeforeValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.bodyBefore`);
  }
  if (!bodyAfterValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.bodyAfter`);
  }
  if (!isIntegerWithinBounds(result.requestedBodyDelta, WEEKLY_ACTION_BODY_DELTA_BOUNDS)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.requestedBodyDelta`);
  }
  if (!Number.isInteger(result.actualBodyDelta)) {
    issue(issues, 'invariant.invalid_value', `${path}.actualBodyDelta`);
  }
  const bodyEfficiencyPermille = isIntegerWithinBounds(
    result.bodyXpEfficiencyPermille,
    BODY_XP_EFFICIENCY_PERMILLE_BOUNDS,
  )
    ? result.bodyXpEfficiencyPermille
    : undefined;
  if (bodyEfficiencyPermille === undefined) {
    issue(issues, 'invariant.out_of_bounds', `${path}.bodyXpEfficiencyPermille`);
  }
  if (bodyBeforeValid) {
    if (typeof result.requestedBodyDelta === 'number' && bodyAfterValid) {
      const expectedBodyAfter = clamp(
        (result.bodyBefore as number) + result.requestedBodyDelta,
        BODY_BOUNDS.min,
        BODY_BOUNDS.max,
      );
      if (
        result.bodyAfter !== expectedBodyAfter ||
        result.actualBodyDelta !== expectedBodyAfter - (result.bodyBefore as number)
      ) {
        issue(issues, 'invariant.invalid_combination', `${path}.bodyAfter`);
      }
    }
  }

  const gpaBeforeValid = isWithinBounds(result.gpaBefore, GPA_BOUNDS);
  const gpaAfterValid = isWithinBounds(result.gpaAfter, GPA_BOUNDS);
  if (!gpaBeforeValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.gpaBefore`);
  }
  if (!gpaAfterValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.gpaAfter`);
  }
  if (!isWithinBounds(result.requestedGpaDelta, WEEKLY_ACTION_GPA_DELTA_BOUNDS)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.requestedGpaDelta`);
  }
  if (typeof result.actualGpaDelta !== 'number' || !Number.isFinite(result.actualGpaDelta)) {
    issue(issues, 'invariant.invalid_value', `${path}.actualGpaDelta`);
  }
  if (gpaBeforeValid && gpaAfterValid && typeof result.requestedGpaDelta === 'number') {
    const expectedGpaAfter = clamp(
      roundToTwoDecimals((result.gpaBefore as number) + result.requestedGpaDelta),
      GPA_BOUNDS.min,
      GPA_BOUNDS.max,
    );
    if (
      result.gpaAfter !== expectedGpaAfter ||
      result.actualGpaDelta !== roundToTwoDecimals(expectedGpaAfter - (result.gpaBefore as number))
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.gpaAfter`);
    }
  }

  const proficiency = validateProficiencyResult(
    result.proficiency,
    `${path}.proficiency`,
    result.actionId,
    issues,
  );
  const proficiencyMultiplierPermille =
    proficiency === null
      ? 1000
      : proficiency !== undefined && typeof proficiency['xpMultiplierPermille'] === 'number'
        ? proficiency['xpMultiplierPermille']
        : undefined;
  const attributeXp = denseArray(result.attributeXp, `${path}.attributeXp`, issues);
  const seenAttributes = new Set<string>();
  if (attributeXp !== undefined) {
    if (attributeXp.length > WEEKLY_ACTION_ATTRIBUTE_TARGET_MAX) {
      issue(issues, 'invariant.out_of_bounds', `${path}.attributeXp`);
    }
    for (const [index, xpResult] of attributeXp.entries()) {
      const validated = validateAttributeXpResult(
        xpResult,
        `${path}.attributeXp.${index}`,
        bodyEfficiencyPermille,
        proficiencyMultiplierPermille,
        SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
        issues,
      );
      const attributeId = validated?.['attributeId'];
      if (isPlayerAttributeId(attributeId)) {
        if (seenAttributes.has(attributeId)) {
          issue(issues, 'invariant.duplicate_value', `${path}.attributeXp.${index}.attributeId`);
        }
        seenAttributes.add(attributeId);
      }
    }
  }

  const applicableEffectIds = new Set<string>();
  if ((attributeXp?.length ?? 0) > 0) {
    applicableEffectIds.add('effect_attribute_progress');
  }
  if (result.requestedBodyDelta !== 0) {
    applicableEffectIds.add('effect_body_change');
  }
  if (result.requestedGpaDelta !== 0) {
    applicableEffectIds.add('effect_gpa_change');
  }
  if (proficiency !== null && proficiency !== undefined) {
    applicableEffectIds.add('effect_proficiency_progress');
  }
  if (applicableEffectIds.size === 0) {
    issue(issues, 'invariant.invalid_combination', path);
  }
  validateEffectIds(
    result.effectIds,
    `${path}.effectIds`,
    WEEKLY_ACTION_EFFECT_IDS.filter((effectId) => applicableEffectIds.has(effectId)),
    issues,
  );
  return result;
}

function validateActionResultV2OrV3(
  value: unknown,
  path: string,
  expectedActionId: unknown,
  expectedActionIndex: number,
  weekIndex: unknown,
  equippedSkillIds: readonly unknown[],
  schemaVersion:
    | typeof CAREER_SCHEMA_VERSION_V2
    | typeof CAREER_SCHEMA_VERSION_V3
    | typeof CAREER_SCHEMA_VERSION_V4
    | typeof CAREER_SCHEMA_VERSION_V5
    | typeof CAREER_SCHEMA_VERSION_V6
    | typeof CAREER_SCHEMA_VERSION_V7,
  weeklyExperienceVersion: unknown,
  issues: CareerInvariantIssue[],
): UnknownRecord | undefined {
  const useExperienceResult =
    usesExperienceSchema(schemaVersion) &&
    weeklyExperienceVersion === WEEKLY_EXPERIENCE_VERSION_CURRENT;
  const result = strictRecord(
    value,
    path,
    schemaVersion === CAREER_SCHEMA_VERSION_V2
      ? ACTION_RESULT_KEYS_V2
      : useExperienceResult
        ? ACTION_RESULT_KEYS_V4
        : ACTION_RESULT_KEYS_V3,
    issues,
  );
  if (result === undefined) {
    return undefined;
  }
  if (
    schemaVersion !== CAREER_SCHEMA_VERSION_V2 &&
    !isIntegerWithinBounds(result['practiceImpact'], PRACTICE_IMPACT_BOUNDS)
  ) {
    issue(issues, 'invariant.out_of_bounds', `${path}.practiceImpact`);
  }
  if (!isWeeklyActionId(result.actionId)) {
    issue(issues, 'invariant.invalid_id', `${path}.actionId`);
  } else if (expectedActionId !== undefined && result.actionId !== expectedActionId) {
    issue(issues, 'invariant.invalid_combination', `${path}.actionId`);
  }
  if (result.actionIndex !== expectedActionIndex) {
    issue(issues, 'invariant.invalid_combination', `${path}.actionIndex`);
  }
  if (result.weekIndex !== weekIndex) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  }

  const aggregates = validateSkillEffectEvidence(
    result,
    path,
    equippedSkillIds,
    useExperienceResult,
    issues,
  );
  const bodyBeforeValid = isIntegerWithinBounds(result.bodyBefore, BODY_BOUNDS);
  const bodyAfterValid = isIntegerWithinBounds(result.bodyAfter, BODY_BOUNDS);
  const baseBodyDeltaValid = isIntegerWithinBounds(
    result.baseBodyDelta,
    WEEKLY_ACTION_BODY_DELTA_BOUNDS,
  );
  const requestedBodyDeltaValid = isIntegerWithinBounds(
    result.requestedBodyDelta,
    SKILL_EFFECTIVE_BODY_DELTA_BOUNDS,
  );
  if (!bodyBeforeValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.bodyBefore`);
  }
  if (!bodyAfterValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.bodyAfter`);
  }
  if (!baseBodyDeltaValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.baseBodyDelta`);
  }
  if (!requestedBodyDeltaValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.requestedBodyDelta`);
  }
  if (!Number.isInteger(result.actualBodyDelta)) {
    issue(issues, 'invariant.invalid_value', `${path}.actualBodyDelta`);
  }
  if (baseBodyDeltaValid && requestedBodyDeltaValid) {
    const baseBodyDelta = result.baseBodyDelta as number;
    const scaledBase =
      baseBodyDelta < 0
        ? -Math.round(
            (Math.abs(baseBodyDelta) * aggregates.bodyCostMultiplierPermille) /
              SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
          )
        : baseBodyDelta;
    if (result.requestedBodyDelta !== scaledBase + aggregates.bodyDeltaFlat) {
      issue(issues, 'invariant.invalid_combination', `${path}.requestedBodyDelta`);
    }
  }
  const bodyEfficiencyPermille = isIntegerWithinBounds(
    result.bodyXpEfficiencyPermille,
    BODY_XP_EFFICIENCY_PERMILLE_BOUNDS,
  )
    ? result.bodyXpEfficiencyPermille
    : undefined;
  if (bodyEfficiencyPermille === undefined) {
    issue(issues, 'invariant.out_of_bounds', `${path}.bodyXpEfficiencyPermille`);
  }
  if (bodyBeforeValid && requestedBodyDeltaValid && bodyAfterValid) {
    const expectedBodyAfter = clamp(
      (result.bodyBefore as number) + (result.requestedBodyDelta as number),
      BODY_BOUNDS.min,
      BODY_BOUNDS.max,
    );
    if (
      result.bodyAfter !== expectedBodyAfter ||
      result.actualBodyDelta !== expectedBodyAfter - (result.bodyBefore as number)
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.bodyAfter`);
    }
  }

  const gpaBeforeValid = isWithinBounds(result.gpaBefore, GPA_BOUNDS);
  const gpaAfterValid = isWithinBounds(result.gpaAfter, GPA_BOUNDS);
  const baseGpaDeltaValid = isWithinBounds(result.baseGpaDelta, WEEKLY_ACTION_GPA_DELTA_BOUNDS);
  const requestedGpaDeltaValid =
    typeof result.requestedGpaDelta === 'number' &&
    Number.isFinite(result.requestedGpaDelta) &&
    result.requestedGpaDelta >= SKILL_EFFECTIVE_GPA_DELTA_MILLI_BOUNDS.min / 1000 &&
    result.requestedGpaDelta <= SKILL_EFFECTIVE_GPA_DELTA_MILLI_BOUNDS.max / 1000;
  if (!gpaBeforeValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.gpaBefore`);
  }
  if (!gpaAfterValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.gpaAfter`);
  }
  if (!baseGpaDeltaValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.baseGpaDelta`);
  }
  if (!requestedGpaDeltaValid) {
    issue(issues, 'invariant.out_of_bounds', `${path}.requestedGpaDelta`);
  }
  if (
    baseGpaDeltaValid &&
    requestedGpaDeltaValid &&
    result.requestedGpaDelta !== (result.baseGpaDelta as number) + aggregates.gpaDeltaMilli / 1000
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.requestedGpaDelta`);
  }
  if (typeof result.actualGpaDelta !== 'number' || !Number.isFinite(result.actualGpaDelta)) {
    issue(issues, 'invariant.invalid_value', `${path}.actualGpaDelta`);
  }
  if (gpaBeforeValid && gpaAfterValid && requestedGpaDeltaValid) {
    const expectedGpaAfter = clamp(
      roundToTwoDecimals((result.gpaBefore as number) + (result.requestedGpaDelta as number)),
      GPA_BOUNDS.min,
      GPA_BOUNDS.max,
    );
    if (
      result.gpaAfter !== expectedGpaAfter ||
      result.actualGpaDelta !== roundToTwoDecimals(expectedGpaAfter - (result.gpaBefore as number))
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.gpaAfter`);
    }
  }

  if (useExperienceResult) {
    for (const [stateName, bounds, baseDeltaBounds, requestedDeltaBounds, aggregateKey] of [
      [
        'preparation',
        PREPARATION_BOUNDS,
        WEEKLY_ACTION_PREPARATION_DELTA_BOUNDS,
        SKILL_EFFECTIVE_PREPARATION_DELTA_BOUNDS,
        'preparationDeltaFlat',
      ],
      [
        'confidence',
        CONFIDENCE_BOUNDS,
        WEEKLY_ACTION_CONFIDENCE_DELTA_BOUNDS,
        SKILL_EFFECTIVE_CONFIDENCE_DELTA_BOUNDS,
        'confidenceDeltaFlat',
      ],
    ] as const) {
      const beforeKey = `${stateName}Before`;
      const baseDeltaKey = `base${stateName[0]?.toUpperCase()}${stateName.slice(1)}Delta`;
      const requestedDeltaKey = `requested${stateName[0]?.toUpperCase()}${stateName.slice(1)}Delta`;
      const actualDeltaKey = `actual${stateName[0]?.toUpperCase()}${stateName.slice(1)}Delta`;
      const afterKey = `${stateName}After`;
      const before = result[beforeKey];
      const baseDelta = result[baseDeltaKey];
      const requestedDelta = result[requestedDeltaKey];
      const actualDelta = result[actualDeltaKey];
      const after = result[afterKey];
      const beforeValid = isIntegerWithinBounds(before, bounds);
      const afterValid = isIntegerWithinBounds(after, bounds);
      const baseValid = isIntegerWithinBounds(baseDelta, baseDeltaBounds);
      const requestedValid = isIntegerWithinBounds(requestedDelta, requestedDeltaBounds);
      if (!beforeValid) {
        issue(issues, 'invariant.out_of_bounds', `${path}.${beforeKey}`);
      }
      if (!afterValid) {
        issue(issues, 'invariant.out_of_bounds', `${path}.${afterKey}`);
      }
      if (!baseValid) {
        issue(issues, 'invariant.out_of_bounds', `${path}.${baseDeltaKey}`);
      }
      if (!requestedValid) {
        issue(issues, 'invariant.out_of_bounds', `${path}.${requestedDeltaKey}`);
      }
      if (!Number.isInteger(actualDelta)) {
        issue(issues, 'invariant.invalid_value', `${path}.${actualDeltaKey}`);
      }
      if (
        baseValid &&
        requestedValid &&
        requestedDelta !== (baseDelta as number) + aggregates[aggregateKey]
      ) {
        issue(issues, 'invariant.invalid_combination', `${path}.${requestedDeltaKey}`);
      }
      if (beforeValid && requestedValid && afterValid) {
        const expectedAfter = clamp(
          (before as number) + (requestedDelta as number),
          bounds.min,
          bounds.max,
        );
        if (after !== expectedAfter || actualDelta !== expectedAfter - (before as number)) {
          issue(issues, 'invariant.invalid_combination', `${path}.${afterKey}`);
        }
      }
    }
  }

  const proficiency = validateProficiencyResult(
    result.proficiency,
    `${path}.proficiency`,
    result.actionId,
    issues,
  );
  const proficiencyMultiplierPermille =
    proficiency === null
      ? SKILL_NEUTRAL_MULTIPLIER_PERMILLE
      : proficiency !== undefined && typeof proficiency['xpMultiplierPermille'] === 'number'
        ? proficiency['xpMultiplierPermille']
        : undefined;
  const attributeXp = denseArray(result.attributeXp, `${path}.attributeXp`, issues);
  const seenAttributes = new Set<string>();
  if (attributeXp !== undefined) {
    if (attributeXp.length > WEEKLY_ACTION_ATTRIBUTE_TARGET_MAX) {
      issue(issues, 'invariant.out_of_bounds', `${path}.attributeXp`);
    }
    for (const [index, xpResult] of attributeXp.entries()) {
      const validated = validateAttributeXpResult(
        xpResult,
        `${path}.attributeXp.${index}`,
        bodyEfficiencyPermille,
        proficiencyMultiplierPermille,
        aggregates.xpMultiplierPermille,
        issues,
      );
      const attributeId = validated?.['attributeId'];
      if (isPlayerAttributeId(attributeId)) {
        if (seenAttributes.has(attributeId)) {
          issue(issues, 'invariant.duplicate_value', `${path}.attributeXp.${index}.attributeId`);
        }
        seenAttributes.add(attributeId);
      }
    }
  }

  const appliedSkillEffects = Array.isArray(result.appliedSkillEffects)
    ? result.appliedSkillEffects
    : [];
  for (const [index, trace] of appliedSkillEffects.entries()) {
    if (!isRecord(trace)) {
      continue;
    }
    if (trace['type'] === 'action_xp_multiplier' && (attributeXp?.length ?? 0) === 0) {
      issue(issues, 'invariant.invalid_combination', `${path}.appliedSkillEffects.${index}`);
    }
    if (
      trace['type'] === 'action_body_cost_multiplier' &&
      baseBodyDeltaValid &&
      (result.baseBodyDelta as number) >= 0
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.appliedSkillEffects.${index}`);
    }
  }

  const applicableEffectIds = new Set<string>();
  if ((attributeXp?.length ?? 0) > 0) {
    applicableEffectIds.add('effect_attribute_progress');
  }
  if (result.requestedBodyDelta !== 0) {
    applicableEffectIds.add('effect_body_change');
  }
  if (result.requestedGpaDelta !== 0) {
    applicableEffectIds.add('effect_gpa_change');
  }
  if (useExperienceResult && result.requestedPreparationDelta !== 0) {
    applicableEffectIds.add('effect_preparation_change');
  }
  if (useExperienceResult && result.requestedConfidenceDelta !== 0) {
    applicableEffectIds.add('effect_confidence_change');
  }
  if (proficiency !== null && proficiency !== undefined) {
    applicableEffectIds.add('effect_proficiency_progress');
  }
  if (applicableEffectIds.size === 0 && appliedSkillEffects.length === 0) {
    issue(issues, 'invariant.invalid_combination', path);
  }
  validateEffectIds(
    result.effectIds,
    `${path}.effectIds`,
    WEEKLY_ACTION_EFFECT_IDS.filter((effectId) => applicableEffectIds.has(effectId)),
    issues,
  );
  return result;
}

function getCurrentAttributeProgress(
  player: unknown,
  attributeId: string,
): UnknownRecord | undefined {
  const playerRecord = isRecord(player) ? player : undefined;
  const attributes = isRecord(playerRecord?.['attributes'])
    ? playerRecord['attributes']
    : undefined;
  const groupName = PLAYER_ATTRIBUTE_IDS.slice(0, PHYSICAL_ATTRIBUTE_IDS.length).some(
    (id) => id === attributeId,
  )
    ? 'physical'
    : MENTAL_ATTRIBUTE_IDS.some((id) => id === attributeId)
      ? 'mental'
      : 'wr';
  const group = isRecord(attributes?.[groupName]) ? attributes[groupName] : undefined;
  return isRecord(group?.[attributeId]) ? group[attributeId] : undefined;
}

function validateResultSequenceAgainstPlayer(
  results: readonly UnknownRecord[],
  player: unknown,
  useExperienceResults: boolean,
  compareFinalPlayerState: boolean,
  issues: CareerInvariantIssue[],
): void {
  for (let index = 1; index < results.length; index += 1) {
    const previous = results[index - 1];
    const current = results[index];
    if (previous !== undefined && current !== undefined) {
      if (current['bodyBefore'] !== previous['bodyAfter']) {
        issue(issues, 'invariant.invalid_combination', `career.phase.results.${index}.bodyBefore`);
      }
      if (current['gpaBefore'] !== previous['gpaAfter']) {
        issue(issues, 'invariant.invalid_combination', `career.phase.results.${index}.gpaBefore`);
      }
      if (useExperienceResults && current['preparationBefore'] !== previous['preparationAfter']) {
        issue(
          issues,
          'invariant.invalid_combination',
          `career.phase.results.${index}.preparationBefore`,
        );
      }
      if (useExperienceResults && current['confidenceBefore'] !== previous['confidenceAfter']) {
        issue(
          issues,
          'invariant.invalid_combination',
          `career.phase.results.${index}.confidenceBefore`,
        );
      }
    }
  }

  const lastResult = results.at(-1);
  const playerRecord = isRecord(player) ? player : undefined;
  const state = isRecord(playerRecord?.['state']) ? playerRecord['state'] : undefined;
  if (compareFinalPlayerState && lastResult !== undefined && state !== undefined) {
    if (state['body'] !== lastResult['bodyAfter']) {
      issue(issues, 'invariant.invalid_combination', 'career.player.state.body');
    }
    if (state['gpa'] !== lastResult['gpaAfter']) {
      issue(issues, 'invariant.invalid_combination', 'career.player.state.gpa');
    }
    if (useExperienceResults && state['preparation'] !== lastResult['preparationAfter']) {
      issue(issues, 'invariant.invalid_combination', 'career.player.state.preparation');
    }
    if (useExperienceResults && state['confidence'] !== lastResult['confidenceAfter']) {
      issue(issues, 'invariant.invalid_combination', 'career.player.state.confidence');
    }
  }

  const latestAttributeResult = new Map<string, UnknownRecord>();
  const latestProficiencyResult = new Map<string, UnknownRecord>();
  for (const [resultIndex, result] of results.entries()) {
    const attributeXp = Array.isArray(result['attributeXp']) ? result['attributeXp'] : [];
    for (const [xpIndex, rawXpResult] of attributeXp.entries()) {
      if (!isRecord(rawXpResult) || !isPlayerAttributeId(rawXpResult['attributeId'])) {
        continue;
      }
      const previous = latestAttributeResult.get(rawXpResult['attributeId']);
      if (
        previous !== undefined &&
        (rawXpResult['ratingBefore'] !== previous['ratingAfter'] ||
          rawXpResult['xpBefore'] !== previous['xpAfter'])
      ) {
        issue(
          issues,
          'invariant.invalid_combination',
          `career.phase.results.${resultIndex}.attributeXp.${xpIndex}`,
        );
      }
      latestAttributeResult.set(rawXpResult['attributeId'], rawXpResult);
    }

    const proficiency = result['proficiency'];
    if (isRecord(proficiency) && isTrainingProficiencyId(proficiency['proficiencyId'])) {
      const previous = latestProficiencyResult.get(proficiency['proficiencyId']);
      if (previous !== undefined && proficiency['usesBefore'] !== previous['usesAfter']) {
        issue(
          issues,
          'invariant.invalid_combination',
          `career.phase.results.${resultIndex}.proficiency.usesBefore`,
        );
      }
      latestProficiencyResult.set(proficiency['proficiencyId'], proficiency);
    }
  }

  if (compareFinalPlayerState) {
    for (const [attributeId, xpResult] of latestAttributeResult) {
      const current = getCurrentAttributeProgress(player, attributeId);
      if (
        current === undefined ||
        current['rating'] !== xpResult['ratingAfter'] ||
        current['xp'] !== xpResult['xpAfter']
      ) {
        issue(issues, 'invariant.invalid_combination', `career.player.attributes.${attributeId}`);
      }
    }
    const currentUses = isRecord(playerRecord?.['trainingProficiencyUses'])
      ? playerRecord['trainingProficiencyUses']
      : undefined;
    for (const [proficiencyId, proficiencyResult] of latestProficiencyResult) {
      if (currentUses?.[proficiencyId] !== proficiencyResult['usesAfter']) {
        issue(
          issues,
          'invariant.invalid_combination',
          `career.player.trainingProficiencyUses.${proficiencyId}`,
        );
      }
    }
  }
}

function validateCareerPhase(
  value: unknown,
  weekIndex: unknown,
  player: unknown,
  schemaVersion: CareerSchemaVersion,
  rngDrawCount: number,
  skillSummary: SkillValidationSummary,
  weeklyExperienceVersion: unknown,
  embeddedCompletedWeek: boolean,
  issues: CareerInvariantIssue[],
): void {
  const phaseRecord = isRecord(value) ? value : undefined;
  if (phaseRecord === undefined) {
    issue(issues, 'invariant.invalid_type', 'career.phase');
    return;
  }
  const type = phaseRecord['type'];
  if (type === 'PLAN_ACTIONS') {
    strictRecord(value, 'career.phase', ['type'] as const, issues);
    return;
  }
  if (type === 'SEASON_REVIEW') {
    if (!usesSeasonSchema(schemaVersion)) {
      strictRecord(value, 'career.phase', ['type'] as const, issues);
      issue(issues, 'invariant.invalid_value', 'career.phase.type');
      return;
    }
    const phase = strictRecord(
      value,
      'career.phase',
      ['type', 'seasonId', 'outcomeId'] as const,
      issues,
    );
    if (
      phase !== undefined &&
      (typeof phase['seasonId'] !== 'string' ||
        !isStableDomainId(phase['seasonId']) ||
        !phase['seasonId'].startsWith('season_'))
    ) {
      issue(issues, 'invariant.invalid_id', 'career.phase.seasonId');
    }
    if (
      phase !== undefined &&
      ![
        'season_outcome_champion',
        'season_outcome_runner_up',
        'season_outcome_semifinal_exit',
        'season_outcome_regular_season_complete',
      ].includes(phase['outcomeId'] as string)
    ) {
      issue(issues, 'invariant.invalid_id', 'career.phase.outcomeId');
    }
    return;
  }
  if (type === 'CAREER_COMPLETE') {
    if (!usesSeasonSchema(schemaVersion)) {
      strictRecord(value, 'career.phase', ['type'] as const, issues);
      issue(issues, 'invariant.invalid_value', 'career.phase.type');
      return;
    }
    const phase = strictRecord(
      value,
      'career.phase',
      ['type', 'seasonId', 'outcomeId', 'alumniId'] as const,
      issues,
    );
    if (phase === undefined) return;
    if (
      typeof phase['seasonId'] !== 'string' ||
      !isStableDomainId(phase['seasonId']) ||
      !phase['seasonId'].startsWith('season_')
    ) {
      issue(issues, 'invariant.invalid_id', 'career.phase.seasonId');
    }
    if (
      ![
        'season_outcome_champion',
        'season_outcome_runner_up',
        'season_outcome_semifinal_exit',
        'season_outcome_regular_season_complete',
      ].includes(phase['outcomeId'] as string)
    ) {
      issue(issues, 'invariant.invalid_id', 'career.phase.outcomeId');
    }
    if (
      typeof phase['alumniId'] !== 'string' ||
      !isStableDomainId(phase['alumniId']) ||
      !phase['alumniId'].startsWith('alumni_')
    ) {
      issue(issues, 'invariant.invalid_id', 'career.phase.alumniId');
    }
    return;
  }
  if (type === 'SKILL_BREAKTHROUGH') {
    if (schemaVersion === CAREER_SCHEMA_VERSION_V1) {
      strictRecord(value, 'career.phase', ['type'] as const, issues);
      issue(issues, 'invariant.invalid_value', 'career.phase.type');
      return;
    }
    const phase = strictRecord(value, 'career.phase', ['type', 'offer'] as const, issues);
    if (phase !== undefined && nonNegativeSafeInteger(weekIndex)) {
      validateSkillBreakthroughOffer(
        phase['offer'],
        weekIndex,
        rngDrawCount,
        skillSummary,
        schemaVersion,
        issues,
      );
    }
    return;
  }
  if (type === 'EVENT_CHOICE') {
    if (!usesSeasonSchema(schemaVersion)) {
      strictRecord(value, 'career.phase', ['type'] as const, issues);
      issue(issues, 'invariant.invalid_value', 'career.phase.type');
      return;
    }
    const phase = strictRecord(
      value,
      'career.phase',
      ['type', 'pendingEvent', 'completedWeek'] as const,
      issues,
    );
    if (phase === undefined) return;
    if (!isPendingEventEvidence(phase['pendingEvent'])) {
      issue(issues, 'invariant.invalid_value', 'career.phase.pendingEvent');
    } else if (
      !nonNegativeSafeInteger(weekIndex) ||
      phase['pendingEvent'].selection.weekIndex !== weekIndex ||
      phase['pendingEvent'].selection.rngDrawCountAfter !== rngDrawCount
    ) {
      issue(issues, 'invariant.invalid_combination', 'career.phase.pendingEvent.selection');
    }
    const completedWeek = isRecord(phase['completedWeek']) ? phase['completedWeek'] : undefined;
    if (completedWeek === undefined) {
      issue(issues, 'invariant.invalid_type', 'career.phase.completedWeek');
      return;
    }
    const completedWeekIssues: CareerInvariantIssue[] = [];
    validateCareerPhase(
      completedWeek,
      weekIndex,
      player,
      schemaVersion,
      rngDrawCount,
      skillSummary,
      weeklyExperienceVersion,
      true,
      completedWeekIssues,
    );
    for (const completedWeekIssue of completedWeekIssues) {
      issues.push({
        ...completedWeekIssue,
        path: completedWeekIssue.path.replace(/^career\.phase/u, 'career.phase.completedWeek'),
      });
    }
    return;
  }
  if (type === 'INJURY_CHOICE') {
    if (!usesSeasonSchema(schemaVersion)) {
      strictRecord(value, 'career.phase', ['type'] as const, issues);
      issue(issues, 'invariant.invalid_value', 'career.phase.type');
      return;
    }
    const phase = strictRecord(
      value,
      'career.phase',
      ['type', 'pendingInjury', 'completedWeek'] as const,
      issues,
    );
    if (phase === undefined) return;
    if (!isPendingInjuryChoiceEvidence(phase['pendingInjury'])) {
      issue(issues, 'invariant.invalid_value', 'career.phase.pendingInjury');
    } else if (
      !nonNegativeSafeInteger(weekIndex) ||
      phase['pendingInjury'].assessment.weekIndex !== weekIndex ||
      phase['pendingInjury'].assessment.rngDrawCountAfter !== rngDrawCount
    ) {
      issue(issues, 'invariant.invalid_combination', 'career.phase.pendingInjury.assessment');
    }
    const completedWeek = isRecord(phase['completedWeek']) ? phase['completedWeek'] : undefined;
    if (completedWeek === undefined) {
      issue(issues, 'invariant.invalid_type', 'career.phase.completedWeek');
      return;
    }
    const completedWeekIssues: CareerInvariantIssue[] = [];
    validateCareerPhase(
      completedWeek,
      weekIndex,
      player,
      schemaVersion,
      rngDrawCount,
      skillSummary,
      weeklyExperienceVersion,
      true,
      completedWeekIssues,
    );
    for (const completedWeekIssue of completedWeekIssues) {
      issues.push({
        ...completedWeekIssue,
        path: completedWeekIssue.path.replace(/^career\.phase/u, 'career.phase.completedWeek'),
      });
    }
    return;
  }
  if (type === 'GAME_PREVIEW' || type === 'KEY_SNAP' || type === 'POST_GAME') {
    if (!usesExperienceSchema(schemaVersion)) {
      strictRecord(value, 'career.phase', ['type'] as const, issues);
      issue(issues, 'invariant.invalid_value', 'career.phase.type');
      return;
    }

    let evidencePath: string | undefined;
    let completedWeek: UnknownRecord | undefined;
    if (type === 'GAME_PREVIEW' && isRecord(phaseRecord['matchup'])) {
      evidencePath = 'career.phase.matchup.completedWeek';
      completedWeek = isRecord(phaseRecord['matchup']['completedWeek'])
        ? phaseRecord['matchup']['completedWeek']
        : undefined;
    } else if (
      type === 'KEY_SNAP' &&
      isRecord(phaseRecord['game']) &&
      isRecord(phaseRecord['game']['matchup'])
    ) {
      evidencePath = 'career.phase.game.matchup.completedWeek';
      completedWeek = isRecord(phaseRecord['game']['matchup']['completedWeek'])
        ? phaseRecord['game']['matchup']['completedWeek']
        : undefined;
    } else if (type === 'POST_GAME') {
      evidencePath = 'career.phase.completedWeek';
      completedWeek = isRecord(phaseRecord['completedWeek'])
        ? phaseRecord['completedWeek']
        : undefined;
    }

    if (completedWeek !== undefined && evidencePath !== undefined) {
      if (completedWeek['version'] !== weeklyExperienceVersion) {
        issue(issues, 'invariant.invalid_combination', `${evidencePath}.version`);
      }
      const completedWeekIssues: CareerInvariantIssue[] = [];
      validateCareerPhase(
        {
          type: 'WEEK_END',
          results: completedWeek['results'],
          depthUpdate: completedWeek['depthUpdate'],
        },
        weekIndex,
        player,
        schemaVersion,
        rngDrawCount,
        skillSummary,
        weeklyExperienceVersion,
        true,
        completedWeekIssues,
      );
      for (const completedWeekIssue of completedWeekIssues) {
        issues.push({
          ...completedWeekIssue,
          path: completedWeekIssue.path.replace(/^career\.phase/u, evidencePath),
        });
      }
    }
    return;
  }
  if (type !== 'RESOLVE_ACTIONS' && type !== 'WEEK_END') {
    strictRecord(value, 'career.phase', ['type'] as const, issues);
    issue(issues, 'invariant.invalid_value', 'career.phase.type');
    return;
  }

  const expectedKeys =
    type === 'RESOLVE_ACTIONS'
      ? (['type', 'actionIds', 'nextActionIndex', 'results'] as const)
      : schemaVersion === CAREER_SCHEMA_VERSION_V3 ||
          schemaVersion === CAREER_SCHEMA_VERSION_V4 ||
          schemaVersion === CAREER_SCHEMA_VERSION_V5 ||
          usesOffFieldSchema(schemaVersion)
        ? (['type', 'results', 'depthUpdate'] as const)
        : (['type', 'results'] as const);
  const phase = strictRecord(value, 'career.phase', expectedKeys, issues);
  if (phase === undefined) {
    return;
  }

  let actionIds: readonly unknown[] | undefined;
  if (type === 'RESOLVE_ACTIONS') {
    actionIds = denseArray(phase['actionIds'], 'career.phase.actionIds', issues);
    if (actionIds !== undefined) {
      if (actionIds.length !== WEEKLY_ACTION_PLAN_SIZE) {
        issue(issues, 'invariant.invalid_combination', 'career.phase.actionIds');
      }
      for (const [index, actionId] of actionIds.entries()) {
        if (!isWeeklyActionId(actionId)) {
          issue(issues, 'invariant.invalid_id', `career.phase.actionIds.${index}`);
        }
      }
    }
    if (
      !Number.isInteger(phase['nextActionIndex']) ||
      (phase['nextActionIndex'] as number) < 0 ||
      (phase['nextActionIndex'] as number) >= WEEKLY_ACTION_PLAN_SIZE
    ) {
      issue(issues, 'invariant.out_of_bounds', 'career.phase.nextActionIndex');
    }
  }

  const rawResults = denseArray(phase['results'], 'career.phase.results', issues);
  if (rawResults === undefined) {
    return;
  }
  const expectedResultCount =
    type === 'WEEK_END' ? WEEKLY_ACTION_PLAN_SIZE : phase['nextActionIndex'];
  if (rawResults.length !== expectedResultCount) {
    issue(issues, 'invariant.invalid_combination', 'career.phase.results');
  }
  const validatedResults: UnknownRecord[] = [];
  for (const [index, rawResult] of rawResults.entries()) {
    const validated =
      schemaVersion === CAREER_SCHEMA_VERSION_V1
        ? validateActionResultV1(
            rawResult,
            `career.phase.results.${index}`,
            actionIds?.[index],
            index,
            weekIndex,
            issues,
          )
        : validateActionResultV2OrV3(
            rawResult,
            `career.phase.results.${index}`,
            actionIds?.[index],
            index,
            weekIndex,
            skillSummary.equippedSkillIds,
            schemaVersion,
            weeklyExperienceVersion,
            issues,
          );
    if (validated !== undefined) {
      validatedResults.push(validated);
    }
  }
  if (validatedResults.length === rawResults.length) {
    validateResultSequenceAgainstPlayer(
      validatedResults,
      player,
      usesExperienceSchema(schemaVersion) &&
        weeklyExperienceVersion === WEEKLY_EXPERIENCE_VERSION_CURRENT,
      !embeddedCompletedWeek,
      issues,
    );
    if (
      type === 'WEEK_END' &&
      usesExperienceSchema(schemaVersion) &&
      weeklyExperienceVersion === WEEKLY_EXPERIENCE_VERSION_CURRENT &&
      isRecord(phase['depthUpdate']) &&
      isRecord(phase['depthUpdate']['practiceGrade'])
    ) {
      const lastResult = validatedResults.at(-1);
      const grade = phase['depthUpdate']['practiceGrade'];
      if (lastResult !== undefined) {
        for (const [gradeField, resultField] of [
          ['bodyAfterFocus', 'bodyAfter'],
          ['preparationAfterFocus', 'preparationAfter'],
          ['confidenceAfterFocus', 'confidenceAfter'],
        ] as const) {
          if (grade[gradeField] !== lastResult[resultField]) {
            issue(
              issues,
              'invariant.invalid_combination',
              `career.phase.depthUpdate.practiceGrade.${gradeField}`,
            );
          }
        }
      }
      const focusImpact = validatedResults.reduce(
        (total, result) =>
          total +
          (Number.isInteger(result['practiceImpact']) ? (result['practiceImpact'] as number) : 0),
        0,
      );
      if (grade['focusImpact'] !== focusImpact) {
        issue(
          issues,
          'invariant.invalid_combination',
          'career.phase.depthUpdate.practiceGrade.focusImpact',
        );
      }
    }
  }
}

function validatePlayer(
  value: unknown,
  schemaVersion: CareerSchemaVersion,
  careerWeekIndex: number,
  careerRngDrawCount: number,
  currentEventGaugeEffect: AppliedEventBreakthroughGaugeDelta | undefined,
  issues: CareerInvariantIssue[],
): SkillValidationSummary {
  const player = strictRecord(
    value,
    'career.player',
    schemaVersion === CAREER_SCHEMA_VERSION_V1 ? PLAYER_KEYS_V1 : PLAYER_KEYS_V2,
    issues,
  );
  if (player === undefined) {
    return {
      acquisitionCount: 0,
      lastAcquisitionWeekIndex: 0,
      lastRngDrawCountAfter: 0,
      ownedSkillIds: new Set(),
      equippedSkillIds: [null, null, null, null],
      gaugeLastProgress: null,
    };
  }

  if (!isPlayerId(player.id)) {
    issue(issues, 'invariant.invalid_id', 'career.player.id');
  }
  const displayName = typeof player.displayName === 'string' ? player.displayName : '';
  const hasControlCharacter = [...displayName].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });
  if (
    typeof player.displayName !== 'string' ||
    player.displayName.trim() !== player.displayName ||
    [...displayName].length < 1 ||
    [...displayName].length > 40 ||
    hasControlCharacter
  ) {
    issue(issues, 'invariant.invalid_value', 'career.player.displayName');
  }
  if (player.positionId !== POSITION_WR_ID) {
    issue(issues, 'invariant.invalid_id', 'career.player.positionId');
  }
  if (!isWrArchetypeId(player.archetypeId)) {
    issue(issues, 'invariant.invalid_id', 'career.player.archetypeId');
  }
  if (!isRecruitingBackgroundId(player.recruitingBackgroundId)) {
    issue(issues, 'invariant.invalid_id', 'career.player.recruitingBackgroundId');
  }
  validatePersonalityTraits(player.personalityTraitIds, issues);
  validateAppearance(player.appearance, issues);
  if (!isIntegerWithinBounds(player.heightCm, HEIGHT_CM_BOUNDS)) {
    issue(issues, 'invariant.out_of_bounds', 'career.player.heightCm');
  }
  if (!isIntegerWithinBounds(player.weightKg, WEIGHT_KG_BOUNDS)) {
    issue(issues, 'invariant.out_of_bounds', 'career.player.weightKg');
  }
  validateAttributes(player.attributes, issues);
  validateState(player.state, schemaVersion, issues);
  validateTagIds(player.tagIds, issues);
  validateTrainingProficiencyUses(player.trainingProficiencyUses, issues);
  return schemaVersion !== CAREER_SCHEMA_VERSION_V1
    ? validatePlayerSkillState(
        player['skillState'],
        careerWeekIndex,
        careerRngDrawCount,
        schemaVersion,
        currentEventGaugeEffect,
        issues,
      )
    : {
        acquisitionCount: 0,
        lastAcquisitionWeekIndex: 0,
        lastRngDrawCountAfter: 0,
        ownedSkillIds: new Set(),
        equippedSkillIds: [null, null, null, null],
        gaugeLastProgress: null,
      };
}

function validatePendingEmptyArray(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): void {
  if (!Array.isArray(value)) {
    issue(issues, 'invariant.invalid_type', path);
  } else if (value.length !== 0) {
    issue(issues, 'invariant.invalid_value', path);
  }
}

function isActiveAcademicStatus(value: unknown): value is 'ELIGIBLE' | 'WARNING' | 'INELIGIBLE' {
  return value === 'ELIGIBLE' || value === 'WARNING' || value === 'INELIGIBLE';
}

function validateAcademicCheckpointEvidence(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): boolean {
  const evidence = strictRecord(value, path, ACADEMIC_CHECKPOINT_EVIDENCE_KEYS, issues);
  if (evidence === undefined) return false;
  let valid = true;
  const invalid = (field: string, code = 'invariant.invalid_value') => {
    issue(issues, code as CareerInvariantIssue['code'], `${path}.${field}`);
    valid = false;
  };
  if (evidence['model'] !== 'academic_checkpoint_v1') invalid('model');
  if (!isAcademicCheckpointId(evidence['checkpointId']))
    invalid('checkpointId', 'invariant.invalid_id');
  if (!nonNegativeSafeInteger(evidence['termIndex']) || evidence['termIndex'] < 1) {
    invalid('termIndex', 'invariant.out_of_bounds');
  }
  if (!nonNegativeSafeInteger(evidence['weekIndex']))
    invalid('weekIndex', 'invariant.out_of_bounds');
  for (const field of ['gpaMilli', 'eligibleGpaMilli', 'warningGpaMilli'] as const) {
    if (!nonNegativeSafeInteger(evidence[field]) || evidence[field] > 4_000) {
      invalid(field, 'invariant.out_of_bounds');
    }
  }
  if (
    !Number.isSafeInteger(evidence['obligationGpaDeltaMilli']) ||
    Math.abs(evidence['obligationGpaDeltaMilli'] as number) > 1_000
  ) {
    invalid('obligationGpaDeltaMilli', 'invariant.out_of_bounds');
  }
  if (
    typeof evidence['warningGpaMilli'] === 'number' &&
    typeof evidence['eligibleGpaMilli'] === 'number' &&
    evidence['warningGpaMilli'] >= evidence['eligibleGpaMilli']
  ) {
    invalid('warningGpaMilli', 'invariant.invalid_combination');
  }
  if (!isActiveAcademicStatus(evidence['statusBefore'])) invalid('statusBefore');
  if (!isActiveAcademicStatus(evidence['statusAfter'])) invalid('statusAfter');
  for (const field of [
    'restrictionGamesBefore',
    'requestedRestrictionGames',
    'actualRestrictionGames',
    'restrictionGamesAfter',
  ] as const) {
    if (!Number.isSafeInteger(evidence[field]) || Math.abs(evidence[field] as number) > 3) {
      invalid(field, 'invariant.out_of_bounds');
    }
  }
  if (
    typeof evidence['restrictionGamesBefore'] === 'number' &&
    typeof evidence['restrictionGamesAfter'] === 'number' &&
    evidence['actualRestrictionGames'] !==
      evidence['restrictionGamesAfter'] - evidence['restrictionGamesBefore']
  ) {
    invalid('actualRestrictionGames', 'invariant.invalid_combination');
  }
  if (
    isActiveAcademicStatus(evidence['statusAfter']) &&
    ((evidence['statusAfter'] === 'INELIGIBLE' && evidence['requestedRestrictionGames'] === 0) ||
      (evidence['statusAfter'] !== 'INELIGIBLE' && evidence['requestedRestrictionGames'] !== 0))
  ) {
    invalid('requestedRestrictionGames', 'invariant.invalid_combination');
  }
  return valid;
}

function validateAcademicGameRestrictionEvidence(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): value is Readonly<Record<string, unknown>> {
  const evidence = strictRecord(value, path, ACADEMIC_GAME_RESTRICTION_EVIDENCE_KEYS, issues);
  if (evidence === undefined) return false;
  let valid = true;
  if (evidence['model'] !== 'academic_game_restriction_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
    valid = false;
  }
  if (!isGameId(evidence['gameId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.gameId`);
    valid = false;
  }
  if (!nonNegativeSafeInteger(evidence['weekIndex'])) {
    issue(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
    valid = false;
  }
  if (
    !nonNegativeSafeInteger(evidence['restrictionGamesBefore']) ||
    evidence['restrictionGamesBefore'] < 1 ||
    evidence['restrictionGamesBefore'] > 3
  ) {
    issue(issues, 'invariant.out_of_bounds', `${path}.restrictionGamesBefore`);
    valid = false;
  }
  if (
    !nonNegativeSafeInteger(evidence['restrictionGamesAfter']) ||
    evidence['restrictionGamesAfter'] > 2
  ) {
    issue(issues, 'invariant.out_of_bounds', `${path}.restrictionGamesAfter`);
    valid = false;
  }
  if (
    typeof evidence['restrictionGamesBefore'] === 'number' &&
    evidence['restrictionGamesAfter'] !== evidence['restrictionGamesBefore'] - 1
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.restrictionGamesAfter`);
    valid = false;
  }
  return valid;
}

function validateRelationshipFootballEffects(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): void {
  const effects = strictRecord(value, path, RELATIONSHIP_FOOTBALL_EFFECT_KEYS, issues);
  if (effects === undefined) return;
  for (const [field, minimum, maximum] of [
    ['coachTrustModifier', -10, 10],
    ['informationScoreModifier', -12, 12],
    ['opportunitySnapBonusPermille', -100, 100],
  ] as const) {
    const effectValue = effects[field];
    if (
      typeof effectValue !== 'number' ||
      !Number.isSafeInteger(effectValue) ||
      effectValue < minimum ||
      effectValue > maximum
    ) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
}

function validateRelationshipWeekEvidence(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): { readonly weekIndex: number; readonly afterValues: readonly number[] } | null {
  const evidence = strictRecord(value, path, RELATIONSHIP_WEEK_EVIDENCE_KEYS, issues);
  if (evidence === undefined) return null;
  if (evidence['model'] !== 'relationship_week_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  if (evidence['sourceId'] !== 'relationship_source_weekly_action') {
    issue(issues, 'invariant.invalid_id', `${path}.sourceId`);
  }
  if (!nonNegativeSafeInteger(evidence['weekIndex'])) {
    issue(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
  }
  if (
    !Array.isArray(evidence['actionIds']) ||
    evidence['actionIds'].length !== 3 ||
    !evidence['actionIds'].every(isWeeklyActionId)
  ) {
    issue(issues, 'invariant.invalid_value', `${path}.actionIds`);
  }
  const afterValues: number[] = [];
  if (
    !Array.isArray(evidence['changes']) ||
    evidence['changes'].length !== RELATIONSHIP_ACTOR_IDS.length
  ) {
    issue(issues, 'invariant.invalid_value', `${path}.changes`);
  } else {
    for (const [index, value] of evidence['changes'].entries()) {
      const changePath = `${path}.changes.${index}`;
      const change = strictRecord(value, changePath, RELATIONSHIP_CHANGE_KEYS, issues);
      if (change === undefined) continue;
      if (change['actorId'] !== RELATIONSHIP_ACTOR_IDS[index]) {
        issue(issues, 'invariant.noncanonical_order', `${changePath}.actorId`);
      }
      for (const field of ['valueBefore', 'valueAfter'] as const) {
        if (!nonNegativeSafeInteger(change[field]) || change[field] > 100) {
          issue(issues, 'invariant.out_of_bounds', `${changePath}.${field}`);
        }
      }
      for (const field of ['baseDelta', 'requestedDelta', 'actualDelta'] as const) {
        if (!Number.isSafeInteger(change[field]) || Math.abs(change[field] as number) > 20) {
          issue(issues, 'invariant.out_of_bounds', `${changePath}.${field}`);
        }
      }
      const gainMultiplierPermille = change['gainMultiplierPermille'];
      if (
        typeof gainMultiplierPermille !== 'number' ||
        !Number.isSafeInteger(gainMultiplierPermille) ||
        gainMultiplierPermille < 1_000 ||
        gainMultiplierPermille > 1_500
      ) {
        issue(issues, 'invariant.out_of_bounds', `${changePath}.gainMultiplierPermille`);
      }
      if (
        typeof change['valueBefore'] === 'number' &&
        typeof change['valueAfter'] === 'number' &&
        change['actualDelta'] !== change['valueAfter'] - change['valueBefore']
      ) {
        issue(issues, 'invariant.invalid_combination', `${changePath}.actualDelta`);
      }
      if (
        typeof change['baseDelta'] === 'number' &&
        change['baseDelta'] <= 0 &&
        change['gainMultiplierPermille'] !== 1_000
      ) {
        issue(issues, 'invariant.invalid_combination', `${changePath}.gainMultiplierPermille`);
      }
      if (typeof change['valueAfter'] === 'number') afterValues.push(change['valueAfter']);
    }
  }
  if (!Array.isArray(evidence['appliedSkillEffects'])) {
    issue(issues, 'invariant.invalid_type', `${path}.appliedSkillEffects`);
  } else {
    for (const [index, value] of evidence['appliedSkillEffects'].entries()) {
      const hookPath = `${path}.appliedSkillEffects.${index}`;
      const hook = strictRecord(value, hookPath, COLLECTED_LIFE_HOOK_KEYS, issues);
      if (hook === undefined) continue;
      if (!isSkillId(hook['skillId'])) issue(issues, 'invariant.invalid_id', `${hookPath}.skillId`);
      if (
        !nonNegativeSafeInteger(hook['slotIndex']) ||
        hook['slotIndex'] >= EQUIPPED_SKILL_SLOT_COUNT
      ) {
        issue(issues, 'invariant.out_of_bounds', `${hookPath}.slotIndex`);
      }
      if (!nonNegativeSafeInteger(hook['effectIndex']) || hook['effectIndex'] > 11) {
        issue(issues, 'invariant.out_of_bounds', `${hookPath}.effectIndex`);
      }
      if (hook['hookId'] !== 'life_hook_relationship_gain_multiplier') {
        issue(issues, 'invariant.invalid_id', `${hookPath}.hookId`);
      }
      const valueMilli = hook['valueMilli'];
      if (
        typeof valueMilli !== 'number' ||
        !Number.isSafeInteger(valueMilli) ||
        valueMilli < 1_001 ||
        valueMilli > 1_500
      ) {
        issue(issues, 'invariant.out_of_bounds', `${hookPath}.valueMilli`);
      }
    }
  }
  validateRelationshipFootballEffects(
    evidence['footballEffectsBefore'],
    `${path}.footballEffectsBefore`,
    issues,
  );
  validateRelationshipFootballEffects(
    evidence['footballEffectsAfter'],
    `${path}.footballEffectsAfter`,
    issues,
  );
  for (const field of ['coachTrustBefore', 'coachTrustAfter'] as const) {
    if (!nonNegativeSafeInteger(evidence[field]) || evidence[field] > 100) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  for (const field of ['requestedCoachTrustDelta', 'actualCoachTrustDelta'] as const) {
    if (!Number.isSafeInteger(evidence[field]) || Math.abs(evidence[field] as number) > 4) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  if (
    typeof evidence['coachTrustBefore'] === 'number' &&
    typeof evidence['coachTrustAfter'] === 'number' &&
    evidence['actualCoachTrustDelta'] !== evidence['coachTrustAfter'] - evidence['coachTrustBefore']
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.actualCoachTrustDelta`);
  }
  return nonNegativeSafeInteger(evidence['weekIndex'])
    ? { weekIndex: evidence['weekIndex'], afterValues }
    : null;
}

function validateNilSelectionEvidence(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): { readonly weekIndex: number; readonly selectedOfferId: string | null } | null {
  const evidence = strictRecord(value, path, NIL_SELECTION_EVIDENCE_KEYS, issues);
  if (evidence === undefined) return null;
  if (evidence['model'] !== 'nil_offer_selection_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  if (!nonNegativeSafeInteger(evidence['weekIndex'])) {
    issue(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
  }
  const context = strictRecord(
    evidence['context'],
    `${path}.context`,
    NIL_SELECTION_CONTEXT_KEYS,
    issues,
  );
  if (context !== undefined) {
    if (!nonNegativeSafeInteger(context['brand']) || context['brand'] > 100) {
      issue(issues, 'invariant.out_of_bounds', `${path}.context.brand`);
    }
    if (
      !nonNegativeSafeInteger(context['depthRank']) ||
      context['depthRank'] < 1 ||
      context['depthRank'] > 8
    ) {
      issue(issues, 'invariant.out_of_bounds', `${path}.context.depthRank`);
    }
    if (!nonNegativeSafeInteger(context['gpaMilli']) || context['gpaMilli'] > 4_000) {
      issue(issues, 'invariant.out_of_bounds', `${path}.context.gpaMilli`);
    }
    if (!isProgramStrengthBandId(context['programStrengthBandId'])) {
      issue(issues, 'invariant.invalid_id', `${path}.context.programStrengthBandId`);
    }
    const tagIds = context['tagIds'];
    if (!Array.isArray(tagIds) || tagIds.length > 64) {
      issue(issues, 'invariant.invalid_value', `${path}.context.tagIds`);
    } else {
      for (const [index, tagId] of tagIds.entries()) {
        if (!isPlayerTagId(tagId))
          issue(issues, 'invariant.invalid_id', `${path}.context.tagIds.${index}`);
        if (index > 0 && compareCodeUnits(String(tagIds[index - 1]), String(tagId)) >= 0) {
          issue(issues, 'invariant.noncanonical_order', `${path}.context.tagIds.${index}`);
        }
      }
    }
  }
  const eligibleOfferIds = evidence['eligibleOfferIds'];
  if (!Array.isArray(eligibleOfferIds) || eligibleOfferIds.length > 10) {
    issue(issues, 'invariant.invalid_value', `${path}.eligibleOfferIds`);
  } else {
    for (const [index, offerId] of eligibleOfferIds.entries()) {
      if (!isNilOfferId(offerId))
        issue(issues, 'invariant.invalid_id', `${path}.eligibleOfferIds.${index}`);
      if (
        index > 0 &&
        compareCodeUnits(String(eligibleOfferIds[index - 1]), String(offerId)) >= 0
      ) {
        issue(issues, 'invariant.noncanonical_order', `${path}.eligibleOfferIds.${index}`);
      }
    }
  }
  const totalWeight = evidence['totalWeight'];
  if (!nonNegativeSafeInteger(totalWeight) || totalWeight > 10_000) {
    issue(issues, 'invariant.out_of_bounds', `${path}.totalWeight`);
  }
  const selectedOfferId = evidence['selectedOfferId'];
  if (selectedOfferId !== null && !isNilOfferId(selectedOfferId)) {
    issue(issues, 'invariant.invalid_id', `${path}.selectedOfferId`);
  }
  for (const field of ['rngDrawCountBefore', 'rngDrawCountAfter'] as const) {
    if (!nonNegativeSafeInteger(evidence[field])) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  const noSelection = selectedOfferId === null;
  if (noSelection) {
    if (
      evidence['roll'] !== null ||
      totalWeight !== 0 ||
      (Array.isArray(eligibleOfferIds) && eligibleOfferIds.length !== 0) ||
      evidence['rngDrawCountAfter'] !== evidence['rngDrawCountBefore']
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.selectedOfferId`);
    }
  } else {
    if (
      !nonNegativeSafeInteger(evidence['roll']) ||
      !nonNegativeSafeInteger(totalWeight) ||
      (evidence['roll'] as number) >= totalWeight
    ) {
      issue(issues, 'invariant.out_of_bounds', `${path}.roll`);
    }
    if (!Array.isArray(eligibleOfferIds) || !eligibleOfferIds.includes(selectedOfferId)) {
      issue(issues, 'invariant.invalid_combination', `${path}.selectedOfferId`);
    }
    if (
      !nonNegativeSafeInteger(evidence['rngDrawCountBefore']) ||
      !nonNegativeSafeInteger(evidence['rngDrawCountAfter']) ||
      evidence['rngDrawCountAfter'] <= evidence['rngDrawCountBefore']
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.rngDrawCountAfter`);
    }
  }
  return nonNegativeSafeInteger(evidence['weekIndex'])
    ? {
        weekIndex: evidence['weekIndex'],
        selectedOfferId: isNilOfferId(selectedOfferId) ? selectedOfferId : null,
      }
    : null;
}

function validatePendingNilOffer(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): { readonly offerId: string; readonly offeredWeekIndex: number } | null {
  const offer = strictRecord(value, path, NIL_PENDING_OFFER_KEYS, issues);
  if (offer === undefined) return null;
  if (!isNilOfferId(offer['offerId'])) issue(issues, 'invariant.invalid_id', `${path}.offerId`);
  if (!nonNegativeSafeInteger(offer['offeredWeekIndex'])) {
    issue(issues, 'invariant.out_of_bounds', `${path}.offeredWeekIndex`);
  }
  if (
    !nonNegativeSafeInteger(offer['expiresAfterWeekIndex']) ||
    !nonNegativeSafeInteger(offer['offeredWeekIndex']) ||
    offer['expiresAfterWeekIndex'] <= offer['offeredWeekIndex'] ||
    offer['expiresAfterWeekIndex'] > offer['offeredWeekIndex'] + 4
  ) {
    issue(issues, 'invariant.out_of_bounds', `${path}.expiresAfterWeekIndex`);
  }
  const selection = validateNilSelectionEvidence(offer['selection'], `${path}.selection`, issues);
  if (
    selection !== null &&
    (selection.weekIndex !== offer['offeredWeekIndex'] ||
      selection.selectedOfferId !== offer['offerId'])
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.selection`);
  }
  return isNilOfferId(offer['offerId']) && nonNegativeSafeInteger(offer['offeredWeekIndex'])
    ? { offerId: offer['offerId'], offeredWeekIndex: offer['offeredWeekIndex'] }
    : null;
}

function validateNilLifeHooks(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): number {
  if (!Array.isArray(value) || value.length > EQUIPPED_SKILL_SLOT_COUNT) {
    issue(issues, 'invariant.invalid_value', path);
    return 1_000;
  }
  let additive = 0;
  let priorSlot = -1;
  for (const [index, hookValue] of value.entries()) {
    const hookPath = `${path}.${index}`;
    const hook = strictRecord(hookValue, hookPath, COLLECTED_LIFE_HOOK_KEYS, issues);
    if (hook === undefined) continue;
    if (!isSkillId(hook['skillId'])) issue(issues, 'invariant.invalid_id', `${hookPath}.skillId`);
    if (
      !nonNegativeSafeInteger(hook['slotIndex']) ||
      hook['slotIndex'] >= EQUIPPED_SKILL_SLOT_COUNT
    ) {
      issue(issues, 'invariant.out_of_bounds', `${hookPath}.slotIndex`);
    } else if (hook['slotIndex'] <= priorSlot) {
      issue(issues, 'invariant.noncanonical_order', `${hookPath}.slotIndex`);
    } else priorSlot = hook['slotIndex'];
    if (!nonNegativeSafeInteger(hook['effectIndex']) || hook['effectIndex'] > 11) {
      issue(issues, 'invariant.out_of_bounds', `${hookPath}.effectIndex`);
    }
    if (hook['hookId'] !== 'life_hook_nil_reward_multiplier') {
      issue(issues, 'invariant.invalid_id', `${hookPath}.hookId`);
    }
    const valueMilli = hook['valueMilli'];
    if (
      typeof valueMilli !== 'number' ||
      !Number.isSafeInteger(valueMilli) ||
      valueMilli < 1_001 ||
      valueMilli > 1_500
    ) {
      issue(issues, 'invariant.out_of_bounds', `${hookPath}.valueMilli`);
    } else additive += valueMilli - 1_000;
  }
  return Math.min(1_500, 1_000 + additive);
}

function validateNilEffectApplication(
  value: unknown,
  path: string,
  expectedSourceId: string,
  expectedEffectIndex: number,
  issues: CareerInvariantIssue[],
): void {
  const application = strictRecord(value, path, NIL_EFFECT_APPLICATION_KEYS, issues);
  if (application === undefined) return;
  if (application['model'] !== 'nil_effect_application_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  if (application['sourceId'] !== expectedSourceId) {
    issue(issues, 'invariant.invalid_value', `${path}.sourceId`);
  }
  if (application['effectIndex'] !== expectedEffectIndex) {
    issue(issues, 'invariant.noncanonical_order', `${path}.effectIndex`);
  }
  const effect = application['effect'];
  let baseDelta: number | null = null;
  let maximum = 100;
  if (!isRecord(effect) || typeof effect['type'] !== 'string') {
    issue(issues, 'invariant.invalid_type', `${path}.effect`);
  } else if (effect['type'] === 'nil_integer_state_delta') {
    const recordValue = strictRecord(
      effect,
      `${path}.effect`,
      ['type', 'stateId', 'delta'],
      issues,
    );
    if (recordValue !== undefined) {
      if (
        ![
          'nil_state_body',
          'nil_state_preparation',
          'nil_state_confidence',
          'nil_state_coach_trust',
          'nil_state_brand',
        ].includes(String(recordValue['stateId']))
      ) {
        issue(issues, 'invariant.invalid_id', `${path}.effect.stateId`);
      }
      if (
        !Number.isSafeInteger(recordValue['delta']) ||
        Math.abs(recordValue['delta'] as number) > 12 ||
        recordValue['delta'] === 0
      ) {
        issue(issues, 'invariant.out_of_bounds', `${path}.effect.delta`);
      } else baseDelta = recordValue['delta'] as number;
    }
  } else if (effect['type'] === 'nil_gpa_delta_milli') {
    const recordValue = strictRecord(effect, `${path}.effect`, ['type', 'deltaMilli'], issues);
    maximum = 4_000;
    if (
      recordValue !== undefined &&
      Number.isSafeInteger(recordValue['deltaMilli']) &&
      Math.abs(recordValue['deltaMilli'] as number) <= 250 &&
      recordValue['deltaMilli'] !== 0
    )
      baseDelta = recordValue['deltaMilli'] as number;
    else issue(issues, 'invariant.out_of_bounds', `${path}.effect.deltaMilli`);
  } else if (effect['type'] === 'nil_funds_delta_usd') {
    const recordValue = strictRecord(effect, `${path}.effect`, ['type', 'deltaUsd'], issues);
    maximum = 1_000_000;
    if (
      recordValue !== undefined &&
      Number.isSafeInteger(recordValue['deltaUsd']) &&
      (recordValue['deltaUsd'] as number) >= -500 &&
      (recordValue['deltaUsd'] as number) <= 2_500 &&
      recordValue['deltaUsd'] !== 0
    )
      baseDelta = recordValue['deltaUsd'] as number;
    else issue(issues, 'invariant.out_of_bounds', `${path}.effect.deltaUsd`);
  } else if (effect['type'] === 'nil_relationship_delta') {
    const recordValue = strictRecord(
      effect,
      `${path}.effect`,
      ['type', 'actorId', 'delta'],
      issues,
    );
    if (recordValue !== undefined) {
      if (!isRelationshipActorId(recordValue['actorId']))
        issue(issues, 'invariant.invalid_id', `${path}.effect.actorId`);
      if (
        !Number.isSafeInteger(recordValue['delta']) ||
        Math.abs(recordValue['delta'] as number) > 12 ||
        recordValue['delta'] === 0
      )
        issue(issues, 'invariant.out_of_bounds', `${path}.effect.delta`);
      else baseDelta = recordValue['delta'] as number;
    }
  } else if (effect['type'] === 'nil_benefit_grant') {
    const recordValue = strictRecord(
      effect,
      `${path}.effect`,
      ['type', 'benefitId', 'quantity'],
      issues,
    );
    maximum = 9;
    if (recordValue !== undefined) {
      if (!isOffFieldBenefitId(recordValue['benefitId']))
        issue(issues, 'invariant.invalid_id', `${path}.effect.benefitId`);
      if (
        !nonNegativeSafeInteger(recordValue['quantity']) ||
        recordValue['quantity'] < 1 ||
        recordValue['quantity'] > 3
      )
        issue(issues, 'invariant.out_of_bounds', `${path}.effect.quantity`);
      else baseDelta = recordValue['quantity'];
    }
  } else {
    issue(issues, 'invariant.invalid_value', `${path}.effect.type`);
  }
  for (const field of ['valueBefore', 'valueAfter'] as const) {
    if (!nonNegativeSafeInteger(application[field]) || application[field] > maximum) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${field}`);
    }
  }
  const rawMultiplier = application['rewardMultiplierPermille'];
  const multiplier = typeof rawMultiplier === 'number' ? rawMultiplier : Number.NaN;
  if (!Number.isSafeInteger(multiplier) || multiplier < 1_000 || multiplier > 1_500) {
    issue(issues, 'invariant.out_of_bounds', `${path}.rewardMultiplierPermille`);
  }
  if (baseDelta !== null) {
    if (application['baseDelta'] !== baseDelta)
      issue(issues, 'invariant.invalid_combination', `${path}.baseDelta`);
    const canMultiply =
      expectedSourceId === 'nil_effect_source_offer_reward' &&
      baseDelta > 0 &&
      (!isRecord(effect) || effect['type'] !== 'nil_benefit_grant');
    const expectedMultiplier = canMultiply ? multiplier : 1_000;
    if (multiplier !== expectedMultiplier)
      issue(issues, 'invariant.invalid_combination', `${path}.rewardMultiplierPermille`);
    const requested =
      expectedMultiplier === 1_000
        ? baseDelta
        : Math.round((baseDelta * expectedMultiplier) / 1_000);
    if (application['requestedDelta'] !== requested)
      issue(issues, 'invariant.invalid_combination', `${path}.requestedDelta`);
  }
  if (
    typeof application['valueBefore'] === 'number' &&
    typeof application['valueAfter'] === 'number' &&
    application['actualDelta'] !== application['valueAfter'] - application['valueBefore']
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.actualDelta`);
  }
}

function validateNilHistoryEvidence(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): number | null {
  if (!isRecord(value) || typeof value['model'] !== 'string') {
    issue(issues, 'invariant.invalid_type', path);
    return null;
  }
  if (value['model'] === 'nil_offer_decision_v1') {
    const evidence = strictRecord(value, path, NIL_DECISION_EVIDENCE_KEYS, issues);
    if (evidence === undefined) return null;
    if (!nonNegativeSafeInteger(evidence['weekIndex']))
      issue(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
    if (evidence['decisionId'] !== 'ACCEPT' && evidence['decisionId'] !== 'DECLINE')
      issue(issues, 'invariant.invalid_value', `${path}.decisionId`);
    const offerSummary = validatePendingNilOffer(evidence['offer'], `${path}.offer`, issues);
    const offerValue = evidence['offer'];
    const expiresAfterWeekIndex = isRecord(offerValue) ? offerValue['expiresAfterWeekIndex'] : null;
    if (
      offerSummary !== null &&
      nonNegativeSafeInteger(evidence['weekIndex']) &&
      (evidence['weekIndex'] < offerSummary.offeredWeekIndex ||
        !nonNegativeSafeInteger(expiresAfterWeekIndex) ||
        evidence['weekIndex'] > expiresAfterWeekIndex)
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
    }
    const hookMultiplier = validateNilLifeHooks(
      evidence['appliedSkillEffects'],
      `${path}.appliedSkillEffects`,
      issues,
    );
    const rewardMultiplier = evidence['rewardMultiplierPermille'];
    if (
      typeof rewardMultiplier !== 'number' ||
      !Number.isSafeInteger(rewardMultiplier) ||
      rewardMultiplier < 1_000 ||
      rewardMultiplier > 1_500
    )
      issue(issues, 'invariant.out_of_bounds', `${path}.rewardMultiplierPermille`);
    if (!Array.isArray(evidence['appliedEffects']) || evidence['appliedEffects'].length > 4)
      issue(issues, 'invariant.invalid_value', `${path}.appliedEffects`);
    else
      evidence['appliedEffects'].forEach((effect, index) =>
        validateNilEffectApplication(
          effect,
          `${path}.appliedEffects.${index}`,
          'nil_effect_source_offer_reward',
          index,
          issues,
        ),
      );
    if (evidence['decisionId'] === 'DECLINE') {
      if (
        (Array.isArray(evidence['appliedSkillEffects']) &&
          evidence['appliedSkillEffects'].length > 0) ||
        (Array.isArray(evidence['appliedEffects']) && evidence['appliedEffects'].length > 0) ||
        evidence['rewardMultiplierPermille'] !== 1_000
      )
        issue(issues, 'invariant.invalid_combination', `${path}.decisionId`);
    } else if (evidence['rewardMultiplierPermille'] !== hookMultiplier) {
      issue(issues, 'invariant.invalid_combination', `${path}.rewardMultiplierPermille`);
    }
    return nonNegativeSafeInteger(evidence['weekIndex']) ? evidence['weekIndex'] : null;
  }
  if (value['model'] === 'nil_offer_expiration_v1') {
    const evidence = strictRecord(value, path, NIL_EXPIRATION_EVIDENCE_KEYS, issues);
    if (evidence === undefined) return null;
    if (!nonNegativeSafeInteger(evidence['weekIndex']))
      issue(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
    const offer = validatePendingNilOffer(evidence['offer'], `${path}.offer`, issues);
    const rawOffer = evidence['offer'];
    const expiresAfterWeekIndex = isRecord(rawOffer) ? rawOffer['expiresAfterWeekIndex'] : null;
    if (
      offer !== null &&
      nonNegativeSafeInteger(evidence['weekIndex']) &&
      nonNegativeSafeInteger(expiresAfterWeekIndex) &&
      evidence['weekIndex'] <= expiresAfterWeekIndex
    )
      issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
    return nonNegativeSafeInteger(evidence['weekIndex']) ? evidence['weekIndex'] : null;
  }
  if (value['model'] === 'nil_obligation_resolution_v1') {
    const evidence = strictRecord(value, path, NIL_OBLIGATION_EVIDENCE_KEYS, issues);
    if (evidence === undefined) return null;
    if (!nonNegativeSafeInteger(evidence['weekIndex']))
      issue(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
    if (evidence['resolutionId'] !== 'FULFILL' && evidence['resolutionId'] !== 'DEFAULT')
      issue(issues, 'invariant.invalid_value', `${path}.resolutionId`);
    if (!isNilOfferId(evidence['offerId']))
      issue(issues, 'invariant.invalid_id', `${path}.offerId`);
    if (!isNilObligationId(evidence['obligationId']))
      issue(issues, 'invariant.invalid_id', `${path}.obligationId`);
    if (
      !nonNegativeSafeInteger(evidence['focusCost']) ||
      evidence['focusCost'] < 1 ||
      evidence['focusCost'] > 2
    )
      issue(issues, 'invariant.out_of_bounds', `${path}.focusCost`);
    if (
      !nonNegativeSafeInteger(evidence['remainingWeeksBefore']) ||
      evidence['remainingWeeksBefore'] < 1 ||
      evidence['remainingWeeksBefore'] > 3
    )
      issue(issues, 'invariant.out_of_bounds', `${path}.remainingWeeksBefore`);
    if (
      !nonNegativeSafeInteger(evidence['remainingWeeksAfter']) ||
      evidence['remainingWeeksAfter'] > 2
    )
      issue(issues, 'invariant.out_of_bounds', `${path}.remainingWeeksAfter`);
    if (
      evidence['resolutionId'] === 'FULFILL' &&
      evidence['remainingWeeksAfter'] !== (evidence['remainingWeeksBefore'] as number) - 1
    )
      issue(issues, 'invariant.invalid_combination', `${path}.remainingWeeksAfter`);
    if (evidence['resolutionId'] === 'DEFAULT' && evidence['remainingWeeksAfter'] !== 0)
      issue(issues, 'invariant.invalid_combination', `${path}.remainingWeeksAfter`);
    const sourceId =
      evidence['resolutionId'] === 'FULFILL'
        ? 'nil_effect_source_obligation_weekly'
        : 'nil_effect_source_obligation_default';
    if (
      !Array.isArray(evidence['appliedEffects']) ||
      evidence['appliedEffects'].length < 1 ||
      evidence['appliedEffects'].length > 3
    )
      issue(issues, 'invariant.invalid_value', `${path}.appliedEffects`);
    else
      evidence['appliedEffects'].forEach((effect, index) =>
        validateNilEffectApplication(
          effect,
          `${path}.appliedEffects.${index}`,
          sourceId,
          index,
          issues,
        ),
      );
    return nonNegativeSafeInteger(evidence['weekIndex']) ? evidence['weekIndex'] : null;
  }
  issue(issues, 'invariant.invalid_value', `${path}.model`);
  return null;
}

function validateTransferOptionProjection(
  value: unknown,
  path: string,
  expectedKind: 'STAY' | 'TRANSFER',
  issues: CareerInvariantIssue[],
): string | null {
  const option = strictRecord(value, path, TRANSFER_OPTION_PROJECTION_KEYS, issues);
  if (option === undefined) return null;
  if (option['kind'] !== expectedKind) issue(issues, 'invariant.invalid_value', `${path}.kind`);
  const programId = isProgramId(option['programId']) ? option['programId'] : null;
  if (programId === null) issue(issues, 'invariant.invalid_id', `${path}.programId`);
  if (
    !nonNegativeSafeInteger(option['projectedDepthRank']) ||
    option['projectedDepthRank'] < 1 ||
    option['projectedDepthRank'] > 8
  ) {
    issue(issues, 'invariant.out_of_bounds', `${path}.projectedDepthRank`);
  } else if (option['projectedRoleId'] !== depthRoleIdForRank(option['projectedDepthRank'])) {
    issue(issues, 'invariant.invalid_combination', `${path}.projectedRoleId`);
  } else if (!isDepthRoleId(option['projectedRoleId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.projectedRoleId`);
  }
  for (const key of [
    'projectedSnapMinPermille',
    'projectedSnapMaxPermille',
    'informationScore',
    'uncertaintyPoints',
    'projectedScore',
    'projectedScoreMinimum',
    'projectedScoreMaximum',
  ] as const) {
    const maximum = key.includes('Snap') ? 1_000 : 100;
    if (!nonNegativeSafeInteger(option[key]) || option[key] > maximum) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (
    typeof option['projectedSnapMinPermille'] === 'number' &&
    typeof option['projectedSnapMaxPermille'] === 'number' &&
    option['projectedSnapMinPermille'] > option['projectedSnapMaxPermille']
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.projectedSnapMinPermille`);
  }
  if (!isTransferConfidenceTierId(option['confidenceTierId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.confidenceTierId`);
  }
  const factors = option['factors'];
  let contributionTotal = 0;
  let factorWeights = 0;
  if (!Array.isArray(factors) || factors.length !== TRANSFER_PROJECTION_FACTOR_IDS.length) {
    issue(issues, 'invariant.invalid_value', `${path}.factors`);
  } else {
    for (const [index, factorValue] of factors.entries()) {
      const factorPath = `${path}.factors.${index}`;
      const factor = strictRecord(factorValue, factorPath, TRANSFER_FACTOR_PROJECTION_KEYS, issues);
      if (factor === undefined) continue;
      if (
        !isTransferProjectionFactorId(factor['factorId']) ||
        factor['factorId'] !== TRANSFER_PROJECTION_FACTOR_IDS[index]
      ) {
        issue(issues, 'invariant.noncanonical_order', `${factorPath}.factorId`);
      }
      if (!nonNegativeSafeInteger(factor['score']) || factor['score'] > 100) {
        issue(issues, 'invariant.out_of_bounds', `${factorPath}.score`);
      }
      if (
        !nonNegativeSafeInteger(factor['weightPermille']) ||
        factor['weightPermille'] < 1 ||
        factor['weightPermille'] > 1_000
      ) {
        issue(issues, 'invariant.out_of_bounds', `${factorPath}.weightPermille`);
      }
      if (
        !nonNegativeSafeInteger(factor['contributionMilli']) ||
        (typeof factor['score'] === 'number' &&
          typeof factor['weightPermille'] === 'number' &&
          factor['contributionMilli'] !== factor['score'] * factor['weightPermille'])
      ) {
        issue(issues, 'invariant.invalid_combination', `${factorPath}.contributionMilli`);
      }
      if (typeof factor['contributionMilli'] === 'number')
        contributionTotal += factor['contributionMilli'];
      if (typeof factor['weightPermille'] === 'number') factorWeights += factor['weightPermille'];
    }
    if (factorWeights !== 1_000) issue(issues, 'invariant.invalid_combination', `${path}.factors`);
  }
  if (
    typeof option['projectedScore'] === 'number' &&
    option['projectedScore'] !== Math.round(contributionTotal / 1_000)
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.projectedScore`);
  }
  if (
    typeof option['projectedScore'] === 'number' &&
    typeof option['uncertaintyPoints'] === 'number' &&
    (option['projectedScoreMinimum'] !==
      Math.max(0, option['projectedScore'] - option['uncertaintyPoints']) ||
      option['projectedScoreMaximum'] !==
        Math.min(100, option['projectedScore'] + option['uncertaintyPoints']))
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.projectedScoreMinimum`);
  }
  return programId;
}

function validateOffseasonWorldProjection(
  value: unknown,
  path: string,
  issues: CareerInvariantIssue[],
): Set<string> | null {
  const world = strictRecord(value, path, OFFSEASON_WORLD_PROJECTION_KEYS, issues);
  if (world === undefined) return null;
  if (world['model'] !== 'offseason_world_projection_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  const programs = world['programs'];
  const ids = new Set<string>();
  if (!Array.isArray(programs) || programs.length < 4 || programs.length > 128) {
    issue(issues, 'invariant.invalid_value', `${path}.programs`);
    return null;
  }
  let previousProgramId = '';
  let expectedDrawCount = world['worldRngDrawCountBefore'];
  if (!nonNegativeSafeInteger(expectedDrawCount)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.worldRngDrawCountBefore`);
  }
  for (const [index, programValue] of programs.entries()) {
    const programPath = `${path}.programs.${index}`;
    const program = strictRecord(
      programValue,
      programPath,
      OFFSEASON_PROGRAM_PROJECTION_KEYS,
      issues,
    );
    if (program === undefined) continue;
    if (!isProgramId(program['programId'])) {
      issue(issues, 'invariant.invalid_id', `${programPath}.programId`);
    } else {
      if (compareCodeUnits(previousProgramId, program['programId']) >= 0) {
        issue(issues, 'invariant.noncanonical_order', `${programPath}.programId`);
      }
      previousProgramId = program['programId'];
      ids.add(program['programId']);
    }
    if (!isOffseasonCoachChangeId(program['coachChangeId'])) {
      issue(issues, 'invariant.invalid_id', `${programPath}.coachChangeId`);
    }
    if (!isProgramOffenseStyleId(program['offenseStyleIdBefore'])) {
      issue(issues, 'invariant.invalid_id', `${programPath}.offenseStyleIdBefore`);
    }
    if (!isProgramOffenseStyleId(program['offenseStyleIdAfter'])) {
      issue(issues, 'invariant.invalid_id', `${programPath}.offenseStyleIdAfter`);
    }
    const shouldChangeScheme = program['coachChangeId'] === 'offseason_coach_change_scheme_shift';
    if (
      typeof program['offenseStyleIdBefore'] === 'string' &&
      typeof program['offenseStyleIdAfter'] === 'string' &&
      (shouldChangeScheme
        ? program['offenseStyleIdBefore'] === program['offenseStyleIdAfter']
        : program['offenseStyleIdBefore'] !== program['offenseStyleIdAfter'])
    ) {
      issue(issues, 'invariant.invalid_combination', `${programPath}.offenseStyleIdAfter`);
    }
    for (const key of ['roomTalentBefore', 'roomTalentAfter'] as const) {
      if (!nonNegativeSafeInteger(program[key]) || program[key] < 35 || program[key] > 90) {
        issue(issues, 'invariant.out_of_bounds', `${programPath}.${key}`);
      }
    }
    if (
      !nonNegativeSafeInteger(program['pressureMaximumInclusive']) ||
      program['pressureMaximumInclusive'] < 1 ||
      program['pressureMaximumInclusive'] > 30
    ) {
      issue(issues, 'invariant.out_of_bounds', `${programPath}.pressureMaximumInclusive`);
    }
    for (const key of [
      'departureRelief',
      'incomingPressure',
      'departureRoll',
      'incomingRoll',
    ] as const) {
      if (
        !nonNegativeSafeInteger(program[key]) ||
        (typeof program['pressureMaximumInclusive'] === 'number' &&
          program[key] > program['pressureMaximumInclusive'])
      ) {
        issue(issues, 'invariant.out_of_bounds', `${programPath}.${key}`);
      }
    }
    if (
      program['departureRelief'] !== program['departureRoll'] ||
      program['incomingPressure'] !== program['incomingRoll']
    ) {
      issue(issues, 'invariant.invalid_combination', `${programPath}.departureRoll`);
    }
    if (
      typeof program['roomTalentBefore'] === 'number' &&
      typeof program['departureRelief'] === 'number' &&
      typeof program['incomingPressure'] === 'number' &&
      program['roomTalentAfter'] !==
        Math.min(
          90,
          Math.max(
            35,
            program['roomTalentBefore'] - program['departureRelief'] + program['incomingPressure'],
          ),
        )
    ) {
      issue(issues, 'invariant.invalid_combination', `${programPath}.roomTalentAfter`);
    }
    if (
      program['coachChangeTotalWeight'] !== 1_000 ||
      !nonNegativeSafeInteger(program['coachChangeRoll']) ||
      program['coachChangeRoll'] >= 1_000
    ) {
      issue(issues, 'invariant.out_of_bounds', `${programPath}.coachChangeRoll`);
    }
    if (
      program['worldRngDrawCountBefore'] !== expectedDrawCount ||
      !nonNegativeSafeInteger(program['worldRngDrawCountAfter']) ||
      !nonNegativeSafeInteger(program['worldRngDrawCountBefore']) ||
      program['worldRngDrawCountAfter'] !== (program['worldRngDrawCountBefore'] as number) + 3
    ) {
      issue(issues, 'invariant.invalid_combination', `${programPath}.worldRngDrawCountAfter`);
    }
    expectedDrawCount = program['worldRngDrawCountAfter'];
  }
  if (world['worldRngDrawCountAfter'] !== expectedDrawCount) {
    issue(issues, 'invariant.invalid_combination', `${path}.worldRngDrawCountAfter`);
  }
  return ids;
}

function validateOffseasonTransferProjection(
  value: unknown,
  path: string,
  worldProgramIds: Set<string> | null,
  issues: CareerInvariantIssue[],
): number | null {
  const transfer = strictRecord(value, path, OFFSEASON_TRANSFER_PROJECTION_KEYS, issues);
  if (transfer === undefined) return null;
  if (transfer['model'] !== 'offseason_transfer_projection_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  const stayProgramId = validateTransferOptionProjection(
    transfer['stayOption'],
    `${path}.stayOption`,
    'STAY',
    issues,
  );
  const transferOptions = transfer['transferOptions'];
  const optionProgramIds: (string | null)[] = [];
  if (!Array.isArray(transferOptions) || transferOptions.length !== 3) {
    issue(issues, 'invariant.invalid_value', `${path}.transferOptions`);
  } else {
    for (const [index, option] of transferOptions.entries()) {
      optionProgramIds.push(
        validateTransferOptionProjection(
          option,
          `${path}.transferOptions.${index}`,
          'TRANSFER',
          issues,
        ),
      );
    }
  }
  if (
    stayProgramId !== null &&
    (optionProgramIds.includes(stayProgramId) ||
      new Set(optionProgramIds).size !== optionProgramIds.length)
  ) {
    issue(issues, 'invariant.duplicate_value', `${path}.transferOptions`);
  }
  if (
    worldProgramIds !== null &&
    [stayProgramId, ...optionProgramIds].some(
      (programId) => programId !== null && !worldProgramIds.has(programId),
    )
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.transferOptions`);
  }

  const selections = transfer['shortlistSelections'];
  let expectedDrawCount = transfer['careerRngDrawCountBefore'];
  let previousCandidates: string[] | null = null;
  if (!nonNegativeSafeInteger(expectedDrawCount)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.careerRngDrawCountBefore`);
  }
  if (!Array.isArray(selections) || selections.length !== 3) {
    issue(issues, 'invariant.invalid_value', `${path}.shortlistSelections`);
  } else {
    for (const [index, selectionValue] of selections.entries()) {
      const selectionPath = `${path}.shortlistSelections.${index}`;
      const selection = strictRecord(
        selectionValue,
        selectionPath,
        TRANSFER_SHORTLIST_SELECTION_KEYS,
        issues,
      );
      if (selection === undefined) continue;
      if (selection['selectionIndex'] !== index) {
        issue(issues, 'invariant.noncanonical_order', `${selectionPath}.selectionIndex`);
      }
      const candidates = selection['candidateWeights'];
      const candidateIds: string[] = [];
      let totalWeight = 0;
      let selectedByRoll: string | null = null;
      if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > 127) {
        issue(issues, 'invariant.invalid_value', `${selectionPath}.candidateWeights`);
      } else {
        let previousProgramId = '';
        let cursor = 0;
        for (const [candidateIndex, candidateValue] of candidates.entries()) {
          const candidatePath = `${selectionPath}.candidateWeights.${candidateIndex}`;
          const candidate = strictRecord(
            candidateValue,
            candidatePath,
            TRANSFER_SHORTLIST_CANDIDATE_KEYS,
            issues,
          );
          if (candidate === undefined) continue;
          if (!isProgramId(candidate['programId'])) {
            issue(issues, 'invariant.invalid_id', `${candidatePath}.programId`);
          } else {
            if (compareCodeUnits(previousProgramId, candidate['programId']) >= 0) {
              issue(issues, 'invariant.noncanonical_order', `${candidatePath}.programId`);
            }
            previousProgramId = candidate['programId'];
            candidateIds.push(candidate['programId']);
          }
          if (
            !nonNegativeSafeInteger(candidate['weight']) ||
            candidate['weight'] < 1 ||
            candidate['weight'] > 400
          ) {
            issue(issues, 'invariant.out_of_bounds', `${candidatePath}.weight`);
          }
          if (typeof candidate['weight'] === 'number') {
            cursor += candidate['weight'];
            totalWeight += candidate['weight'];
            if (
              selectedByRoll === null &&
              typeof selection['roll'] === 'number' &&
              selection['roll'] < cursor
            ) {
              selectedByRoll = isProgramId(candidate['programId']) ? candidate['programId'] : null;
            }
          }
        }
      }
      if (previousCandidates !== null) {
        const priorSelected = selections[index - 1];
        const priorSelectedId = isRecord(priorSelected) ? priorSelected['selectedProgramId'] : null;
        const expectedCandidates = previousCandidates.filter(
          (programId) => programId !== priorSelectedId,
        );
        if (JSON.stringify(candidateIds) !== JSON.stringify(expectedCandidates)) {
          issue(issues, 'invariant.invalid_combination', `${selectionPath}.candidateWeights`);
        }
      }
      previousCandidates = candidateIds;
      if (selection['totalWeight'] !== totalWeight) {
        issue(issues, 'invariant.invalid_combination', `${selectionPath}.totalWeight`);
      }
      if (
        !nonNegativeSafeInteger(selection['roll']) ||
        selection['roll'] >= totalWeight ||
        selection['selectedProgramId'] !== selectedByRoll ||
        selection['selectedProgramId'] !== optionProgramIds[index]
      ) {
        issue(issues, 'invariant.invalid_combination', `${selectionPath}.selectedProgramId`);
      }
      if (
        selection['careerRngDrawCountBefore'] !== expectedDrawCount ||
        !nonNegativeSafeInteger(selection['careerRngDrawCountBefore']) ||
        selection['careerRngDrawCountAfter'] !==
          (selection['careerRngDrawCountBefore'] as number) + 1
      ) {
        issue(issues, 'invariant.invalid_combination', `${selectionPath}.careerRngDrawCountAfter`);
      }
      expectedDrawCount = selection['careerRngDrawCountAfter'];
    }
  }
  if (transfer['careerRngDrawCountAfter'] !== expectedDrawCount) {
    issue(issues, 'invariant.invalid_combination', `${path}.careerRngDrawCountAfter`);
  }
  if (!nonNegativeSafeInteger(transfer['careerRngDrawCountAfter'])) return null;
  return transfer['careerRngDrawCountAfter'];
}

interface ValidatedOffseasonDecisionSummary {
  readonly kind: 'STAY' | 'TRANSFER';
  readonly previousProgramId: string;
  readonly selectedProgramId: string;
  readonly relationshipValuesAfter: ReadonlyMap<string, number>;
}

function validateOffseasonDecision(
  value: unknown,
  path: string,
  transferProjection: unknown,
  worldProjection: unknown,
  transferProjectionRngDrawCountAfter: number | null,
  careerRngDrawCount: number,
  enforceDecisionRngTail: boolean,
  issues: CareerInvariantIssue[],
): ValidatedOffseasonDecisionSummary | null {
  const decision = strictRecord(value, path, OFFSEASON_DECISION_KEYS, issues);
  if (decision === undefined) return null;
  if (decision['model'] !== 'offseason_decision_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  const kind = decision['kind'];
  if (kind !== 'STAY' && kind !== 'TRANSFER') {
    issue(issues, 'invariant.invalid_value', `${path}.kind`);
    return null;
  }
  if (!isProgramId(decision['previousProgramId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.previousProgramId`);
  }
  if (!isProgramId(decision['selectedProgramId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.selectedProgramId`);
  }
  const transfer = isRecord(transferProjection) ? transferProjection : undefined;
  const expectedOption =
    kind === 'STAY'
      ? transfer?.['stayOption']
      : Array.isArray(transfer?.['transferOptions'])
        ? transfer['transferOptions'].find(
            (option) => isRecord(option) && option['programId'] === decision['selectedProgramId'],
          )
        : undefined;
  validateTransferOptionProjection(
    decision['selectedOption'],
    `${path}.selectedOption`,
    kind,
    issues,
  );
  if (
    expectedOption === undefined ||
    JSON.stringify(decision['selectedOption']) !== JSON.stringify(expectedOption)
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.selectedOption`);
  }
  if (
    isRecord(decision['selectedOption']) &&
    decision['selectedOption']['programId'] !== decision['selectedProgramId']
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.selectedProgramId`);
  }
  if (
    (kind === 'STAY' && decision['selectedProgramId'] !== decision['previousProgramId']) ||
    (kind === 'TRANSFER' && decision['selectedProgramId'] === decision['previousProgramId'])
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.kind`);
  }

  const worldProgram =
    isRecord(worldProjection) && Array.isArray(worldProjection['programs'])
      ? worldProjection['programs'].find(
          (program) => isRecord(program) && program['programId'] === decision['selectedProgramId'],
        )
      : undefined;
  if (!isRecord(worldProgram)) {
    issue(issues, 'invariant.invalid_combination', `${path}.selectedProgramId`);
  } else {
    for (const [decisionKey, worldKey] of [
      ['coachChangeId', 'coachChangeId'],
      ['offenseStyleIdBefore', 'offenseStyleIdBefore'],
      ['offenseStyleIdAfter', 'offenseStyleIdAfter'],
      ['roomTalentMeanAfter', 'roomTalentAfter'],
    ] as const) {
      if (decision[decisionKey] !== worldProgram[worldKey]) {
        issue(issues, 'invariant.invalid_combination', `${path}.${decisionKey}`);
      }
    }
  }
  if (!isOffseasonCoachChangeId(decision['coachChangeId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.coachChangeId`);
  }
  for (const key of ['offenseStyleIdBefore', 'offenseStyleIdAfter'] as const) {
    if (!isProgramOffenseStyleId(decision[key])) {
      issue(issues, 'invariant.invalid_id', `${path}.${key}`);
    }
  }
  if (!isRotationPolicyId(decision['rotationPolicyIdAfter'])) {
    issue(issues, 'invariant.invalid_id', `${path}.rotationPolicyIdAfter`);
  }
  if (!integerIn(decision['roomTalentMeanAfter'], 35, 90)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.roomTalentMeanAfter`);
  }
  for (const key of ['coachTrustBefore', 'coachTrustAfter'] as const) {
    if (!integerIn(decision[key], COACH_TRUST_BOUNDS.min, COACH_TRUST_BOUNDS.max)) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (!integerIn(decision['coachTrustRetentionPermille'], 0, 1_000)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.coachTrustRetentionPermille`);
  }
  if (!integerIn(decision['coachTrustBaseline'], 0, 100)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.coachTrustBaseline`);
  }
  if (!integerIn(decision['coachTrustRequestedAfter'], 0, 200)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.coachTrustRequestedAfter`);
  }
  if (
    Number.isInteger(decision['coachTrustBefore']) &&
    Number.isInteger(decision['coachTrustRetentionPermille']) &&
    Number.isInteger(decision['coachTrustBaseline'])
  ) {
    const requested =
      (decision['coachTrustBaseline'] as number) +
      Math.round(
        ((decision['coachTrustBefore'] as number) *
          (decision['coachTrustRetentionPermille'] as number)) /
          1_000,
      );
    if (decision['coachTrustRequestedAfter'] !== requested) {
      issue(issues, 'invariant.invalid_combination', `${path}.coachTrustRequestedAfter`);
    }
    if (
      decision['coachTrustAfter'] !==
      clamp(requested, COACH_TRUST_BOUNDS.min, COACH_TRUST_BOUNDS.max)
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.coachTrustAfter`);
    }
  }
  for (const key of [
    'playerPracticeFormBefore',
    'playerPracticeFormAfter',
    'playerExperienceReadiness',
  ] as const) {
    if (!integerIn(decision[key], 0, 100)) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }

  const relationshipValuesAfter = new Map<string, number>();
  const transitions = decision['relationshipTransitions'];
  if (!Array.isArray(transitions) || transitions.length !== RELATIONSHIP_ACTOR_IDS.length) {
    issue(issues, 'invariant.invalid_value', `${path}.relationshipTransitions`);
  } else {
    for (const [index, transitionValue] of transitions.entries()) {
      const transitionPath = `${path}.relationshipTransitions.${index}`;
      const transition = strictRecord(
        transitionValue,
        transitionPath,
        OFFSEASON_RELATIONSHIP_TRANSITION_KEYS,
        issues,
      );
      if (transition === undefined) continue;
      if (
        !isRelationshipActorId(transition['actorId']) ||
        transition['actorId'] !== RELATIONSHIP_ACTOR_IDS[index]
      ) {
        issue(issues, 'invariant.noncanonical_order', `${transitionPath}.actorId`);
      }
      for (const key of ['valueBefore', 'valueAfter'] as const) {
        if (!integerIn(transition[key], 0, 100)) {
          issue(issues, 'invariant.out_of_bounds', `${transitionPath}.${key}`);
        }
      }
      if (typeof transition['resetToNeutral'] !== 'boolean') {
        issue(issues, 'invariant.invalid_type', `${transitionPath}.resetToNeutral`);
      } else if (transition['resetToNeutral']) {
        if (
          !integerIn(transition['resetValue'], 0, 100) ||
          transition['valueAfter'] !== transition['resetValue']
        ) {
          issue(issues, 'invariant.invalid_combination', `${transitionPath}.resetValue`);
        }
      } else if (
        transition['resetValue'] !== null ||
        transition['valueAfter'] !== transition['valueBefore']
      ) {
        issue(issues, 'invariant.invalid_combination', `${transitionPath}.valueAfter`);
      }
      if (
        typeof transition['actorId'] === 'string' &&
        typeof transition['valueAfter'] === 'number'
      ) {
        relationshipValuesAfter.set(transition['actorId'], transition['valueAfter']);
      }
    }
  }

  if (
    transferProjectionRngDrawCountAfter === null ||
    decision['rosterRngDrawCountBefore'] !== transferProjectionRngDrawCountAfter ||
    !nonNegativeSafeInteger(decision['rosterRngDrawCountBefore']) ||
    decision['rosterRngDrawCountAfter'] !== (decision['rosterRngDrawCountBefore'] as number) + 35 ||
    !nonNegativeSafeInteger(decision['rosterRngDrawCountAfter']) ||
    (decision['rosterRngDrawCountAfter'] as number) > careerRngDrawCount ||
    (enforceDecisionRngTail && decision['rosterRngDrawCountAfter'] !== careerRngDrawCount)
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.rosterRngDrawCountAfter`);
  }
  if (!integerIn(decision['actualDepthRank'], 1, 8)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.actualDepthRank`);
  }
  if (!isDepthRoleId(decision['actualRoleId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.actualRoleId`);
  } else if (
    Number.isInteger(decision['actualDepthRank']) &&
    decision['actualRoleId'] !== depthRoleIdForRank(decision['actualDepthRank'] as number)
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.actualRoleId`);
  }
  for (const key of ['actualSnapMinPermille', 'actualSnapMaxPermille'] as const) {
    if (!integerIn(decision[key], 0, 1_000)) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (
    integerIn(decision['actualSnapMinPermille'], 0, 1_000) &&
    integerIn(decision['actualSnapMaxPermille'], 0, 1_000) &&
    decision['actualSnapMinPermille'] > decision['actualSnapMaxPermille']
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.actualSnapMaxPermille`);
  }

  return isProgramId(decision['previousProgramId']) && isProgramId(decision['selectedProgramId'])
    ? {
        kind,
        previousProgramId: decision['previousProgramId'],
        selectedProgramId: decision['selectedProgramId'],
        relationshipValuesAfter,
      }
    : null;
}

function validateOffFieldCareerState(
  value: unknown,
  careerRngDrawCount: number,
  enforceDecisionSnapshot: boolean,
  issues: CareerInvariantIssue[],
): void {
  const path = 'career.offFieldCareerState';
  const state = strictRecord(value, path, OFF_FIELD_CAREER_STATE_KEYS, issues);
  if (state === undefined) return;
  if (state['model'] !== 'off_field_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }

  const academicsValue = state['academics'];
  const academics = strictRecord(
    academicsValue,
    `${path}.academics`,
    isRecord(academicsValue) && academicsValue['bootstrapStatus'] === 'ACTIVE'
      ? ACTIVE_ACADEMIC_STATE_KEYS
      : PENDING_ACADEMIC_STATE_KEYS,
    issues,
  );
  if (academics !== undefined) {
    if (academics['model'] !== 'academic_v1') {
      issue(issues, 'invariant.invalid_value', `${path}.academics.model`);
    }
    if (academics['bootstrapStatus'] === 'PENDING') {
      for (const [key, expected] of [
        ['termIndex', 0],
        ['eligibilityStatus', 'PENDING'],
        ['lastCheckpoint', null],
      ] as const) {
        if (academics[key] !== expected) {
          issue(issues, 'invariant.invalid_value', `${path}.academics.${key}`);
        }
      }
      validatePendingEmptyArray(
        academics['checkpointHistory'],
        `${path}.academics.checkpointHistory`,
        issues,
      );
    } else if (academics['bootstrapStatus'] === 'ACTIVE') {
      if (!nonNegativeSafeInteger(academics['termIndex']) || academics['termIndex'] < 1) {
        issue(issues, 'invariant.out_of_bounds', `${path}.academics.termIndex`);
      }
      if (!isActiveAcademicStatus(academics['eligibilityStatus'])) {
        issue(issues, 'invariant.invalid_value', `${path}.academics.eligibilityStatus`);
      }
      if (
        !nonNegativeSafeInteger(academics['nextCheckpointIndex']) ||
        academics['nextCheckpointIndex'] > 2
      ) {
        issue(issues, 'invariant.out_of_bounds', `${path}.academics.nextCheckpointIndex`);
      }
      if (
        !nonNegativeSafeInteger(academics['restrictionGamesRemaining']) ||
        academics['restrictionGamesRemaining'] > 3
      ) {
        issue(issues, 'invariant.out_of_bounds', `${path}.academics.restrictionGamesRemaining`);
      }
      const history = academics['checkpointHistory'];
      if (!Array.isArray(history) || history.length > 2) {
        issue(issues, 'invariant.invalid_value', `${path}.academics.checkpointHistory`);
      } else {
        let priorWeekIndex = -1;
        for (const [index, evidence] of history.entries()) {
          const evidencePath = `${path}.academics.checkpointHistory.${index}`;
          if (validateAcademicCheckpointEvidence(evidence, evidencePath, issues)) {
            const weekIndex = (evidence as Readonly<Record<string, unknown>>)[
              'weekIndex'
            ] as number;
            if (weekIndex <= priorWeekIndex) {
              issue(issues, 'invariant.noncanonical_order', `${evidencePath}.weekIndex`);
            }
            priorWeekIndex = weekIndex;
          }
        }
        if (academics['nextCheckpointIndex'] !== history.length) {
          issue(issues, 'invariant.invalid_combination', `${path}.academics.nextCheckpointIndex`);
        }
        const last = history.at(-1) ?? null;
        if (JSON.stringify(academics['lastCheckpoint']) !== JSON.stringify(last)) {
          issue(issues, 'invariant.invalid_combination', `${path}.academics.lastCheckpoint`);
        }
        if (
          last !== null &&
          isRecord(last) &&
          academics['eligibilityStatus'] !== last['statusAfter']
        ) {
          issue(issues, 'invariant.invalid_combination', `${path}.academics.eligibilityStatus`);
        }
      }
      const gameRestrictionHistory = academics['gameRestrictionHistory'];
      if (!Array.isArray(gameRestrictionHistory) || gameRestrictionHistory.length > 1_000) {
        issue(issues, 'invariant.invalid_value', `${path}.academics.gameRestrictionHistory`);
      } else {
        let priorWeekIndex = -1;
        for (const [index, evidence] of gameRestrictionHistory.entries()) {
          const evidencePath = `${path}.academics.gameRestrictionHistory.${index}`;
          if (!validateAcademicGameRestrictionEvidence(evidence, evidencePath, issues)) continue;
          const weekIndex = evidence['weekIndex'] as number;
          if (weekIndex <= priorWeekIndex) {
            issue(issues, 'invariant.noncanonical_order', `${evidencePath}.weekIndex`);
          }
          priorWeekIndex = weekIndex;
        }
        const lastRestriction = gameRestrictionHistory.at(-1) ?? null;
        if (JSON.stringify(academics['lastGameRestriction']) !== JSON.stringify(lastRestriction)) {
          issue(issues, 'invariant.invalid_combination', `${path}.academics.lastGameRestriction`);
        }

        if (Array.isArray(history)) {
          const mutations = [
            ...history.filter(isRecord).map((evidence) => ({
              weekIndex: evidence['weekIndex'] as number,
              order: 0,
              before: evidence['restrictionGamesBefore'] as number,
              after: evidence['restrictionGamesAfter'] as number,
            })),
            ...gameRestrictionHistory.filter(isRecord).map((evidence) => ({
              weekIndex: evidence['weekIndex'] as number,
              order: 1,
              before: evidence['restrictionGamesBefore'] as number,
              after: evidence['restrictionGamesAfter'] as number,
            })),
          ].sort((left, right) => left.weekIndex - right.weekIndex || left.order - right.order);
          let expectedRestrictionGames = 0;
          for (const mutation of mutations) {
            if (mutation.before !== expectedRestrictionGames) {
              issue(
                issues,
                'invariant.invalid_combination',
                `${path}.academics.restrictionGamesRemaining`,
              );
              break;
            }
            expectedRestrictionGames = mutation.after;
          }
          if (academics['restrictionGamesRemaining'] !== expectedRestrictionGames) {
            issue(
              issues,
              'invariant.invalid_combination',
              `${path}.academics.restrictionGamesRemaining`,
            );
          }
        }
      }
    } else {
      issue(issues, 'invariant.invalid_value', `${path}.academics.bootstrapStatus`);
    }
  }

  const relationshipsValue = state['relationships'];
  const relationships = strictRecord(
    relationshipsValue,
    `${path}.relationships`,
    isRecord(relationshipsValue) && relationshipsValue['bootstrapStatus'] === 'ACTIVE'
      ? ACTIVE_RELATIONSHIP_STATE_KEYS
      : PENDING_RELATIONSHIP_STATE_KEYS,
    issues,
  );
  if (relationships !== undefined) {
    if (relationships['model'] !== 'relationships_v1') {
      issue(issues, 'invariant.invalid_value', `${path}.relationships.model`);
    }
    if (relationships['bootstrapStatus'] === 'PENDING') {
      validatePendingEmptyArray(relationships['tracks'], `${path}.relationships.tracks`, issues);
      validatePendingEmptyArray(relationships['history'], `${path}.relationships.history`, issues);
    } else if (relationships['bootstrapStatus'] === 'ACTIVE') {
      const tracks = relationships['tracks'];
      if (!Array.isArray(tracks) || tracks.length !== RELATIONSHIP_ACTOR_IDS.length) {
        issue(issues, 'invariant.invalid_value', `${path}.relationships.tracks`);
      } else {
        for (const [index, value] of tracks.entries()) {
          const trackPath = `${path}.relationships.tracks.${index}`;
          const track = strictRecord(value, trackPath, RELATIONSHIP_TRACK_KEYS, issues);
          if (track === undefined) continue;
          if (!isRelationshipActorId(track['actorId'])) {
            issue(issues, 'invariant.invalid_id', `${trackPath}.actorId`);
          } else if (track['actorId'] !== RELATIONSHIP_ACTOR_IDS[index]) {
            issue(issues, 'invariant.noncanonical_order', `${trackPath}.actorId`);
          }
          if (!nonNegativeSafeInteger(track['value']) || track['value'] > 100) {
            issue(issues, 'invariant.out_of_bounds', `${trackPath}.value`);
          }
        }
      }
      const history = relationships['history'];
      if (!Array.isArray(history) || history.length > 1_000) {
        issue(issues, 'invariant.invalid_value', `${path}.relationships.history`);
      } else {
        let priorWeekIndex = -1;
        let lastAfterValues: readonly number[] | null = null;
        for (const [index, evidence] of history.entries()) {
          const evidencePath = `${path}.relationships.history.${index}`;
          const summary = validateRelationshipWeekEvidence(evidence, evidencePath, issues);
          if (summary === null) continue;
          if (summary.weekIndex <= priorWeekIndex) {
            issue(issues, 'invariant.noncanonical_order', `${evidencePath}.weekIndex`);
          }
          priorWeekIndex = summary.weekIndex;
          lastAfterValues = summary.afterValues;
        }
        const expectedLastWeek = history.length === 0 ? null : priorWeekIndex;
        if (relationships['lastProcessedWeekIndex'] !== expectedLastWeek) {
          issue(
            issues,
            'invariant.invalid_combination',
            `${path}.relationships.lastProcessedWeekIndex`,
          );
        }
        // NIL, events, games, and offseason commands may change a relationship
        // after the latest weekly relationship evidence. Their own evidence
        // validates the bounded transition, so only the weekly cursor is tied
        // to this weekly-only history.
        void lastAfterValues;
      }
    } else {
      issue(issues, 'invariant.invalid_value', `${path}.relationships.bootstrapStatus`);
    }
  }

  const nilValue = state['nil'];
  const nil = strictRecord(
    nilValue,
    `${path}.nil`,
    isRecord(nilValue) && nilValue['bootstrapStatus'] === 'ACTIVE'
      ? ACTIVE_NIL_STATE_KEYS
      : PENDING_NIL_STATE_KEYS,
    issues,
  );
  if (nil !== undefined) {
    if (nil['model'] !== 'nil_v1') {
      issue(issues, 'invariant.invalid_value', `${path}.nil.model`);
    }
    if (!Object.hasOwn(nil, 'bootstrapStatus')) {
      if (nil['fictionalFundsUsd'] !== 0) {
        issue(issues, 'invariant.invalid_value', `${path}.nil.fictionalFundsUsd`);
      }
      if (nil['activeObligation'] !== null) {
        issue(issues, 'invariant.invalid_value', `${path}.nil.activeObligation`);
      }
      validatePendingEmptyArray(nil['pendingOffers'], `${path}.nil.pendingOffers`, issues);
      validatePendingEmptyArray(nil['history'], `${path}.nil.history`, issues);
    } else if (nil['bootstrapStatus'] === 'ACTIVE') {
      if (
        !nonNegativeSafeInteger(nil['fictionalFundsUsd']) ||
        nil['fictionalFundsUsd'] > 1_000_000
      ) {
        issue(issues, 'invariant.out_of_bounds', `${path}.nil.fictionalFundsUsd`);
      }
      const benefitStacks = nil['benefitStacks'];
      if (!Array.isArray(benefitStacks) || benefitStacks.length > OFF_FIELD_BENEFIT_IDS.length) {
        issue(issues, 'invariant.invalid_value', `${path}.nil.benefitStacks`);
      } else {
        let priorBenefitId = '';
        for (const [index, stackValue] of benefitStacks.entries()) {
          const stackPath = `${path}.nil.benefitStacks.${index}`;
          const stack = strictRecord(stackValue, stackPath, NIL_BENEFIT_STACK_KEYS, issues);
          if (stack === undefined) continue;
          if (!isOffFieldBenefitId(stack['benefitId'])) {
            issue(issues, 'invariant.invalid_id', `${stackPath}.benefitId`);
          } else if (index > 0 && compareCodeUnits(priorBenefitId, stack['benefitId']) >= 0) {
            issue(issues, 'invariant.noncanonical_order', `${stackPath}.benefitId`);
          } else priorBenefitId = stack['benefitId'];
          if (
            !nonNegativeSafeInteger(stack['quantity']) ||
            stack['quantity'] < 1 ||
            stack['quantity'] > 9
          ) {
            issue(issues, 'invariant.out_of_bounds', `${stackPath}.quantity`);
          }
        }
      }
      const pendingOffers = nil['pendingOffers'];
      if (!Array.isArray(pendingOffers) || pendingOffers.length > 1) {
        issue(issues, 'invariant.invalid_value', `${path}.nil.pendingOffers`);
      } else {
        pendingOffers.forEach((offer, index) =>
          validatePendingNilOffer(offer, `${path}.nil.pendingOffers.${index}`, issues),
        );
        if (
          pendingOffers.length === 1 &&
          nil['lastOfferAttempt'] !== null &&
          isRecord(pendingOffers[0]) &&
          JSON.stringify(pendingOffers[0]['selection']) !== JSON.stringify(nil['lastOfferAttempt'])
        ) {
          issue(issues, 'invariant.invalid_combination', `${path}.nil.pendingOffers.0.selection`);
        }
      }
      if (nil['lastOfferAttempt'] !== null) {
        validateNilSelectionEvidence(
          nil['lastOfferAttempt'],
          `${path}.nil.lastOfferAttempt`,
          issues,
        );
      }
      const activeObligationValue = nil['activeObligation'];
      if (activeObligationValue !== null) {
        const obligation = strictRecord(
          activeObligationValue,
          `${path}.nil.activeObligation`,
          NIL_ACTIVE_OBLIGATION_KEYS,
          issues,
        );
        if (obligation !== undefined) {
          if (!isNilOfferId(obligation['offerId']))
            issue(issues, 'invariant.invalid_id', `${path}.nil.activeObligation.offerId`);
          if (!isNilObligationId(obligation['obligationId']))
            issue(issues, 'invariant.invalid_id', `${path}.nil.activeObligation.obligationId`);
          if (!nonNegativeSafeInteger(obligation['acceptedWeekIndex']))
            issue(
              issues,
              'invariant.out_of_bounds',
              `${path}.nil.activeObligation.acceptedWeekIndex`,
            );
          if (
            !nonNegativeSafeInteger(obligation['remainingWeeks']) ||
            obligation['remainingWeeks'] < 1 ||
            obligation['remainingWeeks'] > 3
          )
            issue(issues, 'invariant.out_of_bounds', `${path}.nil.activeObligation.remainingWeeks`);
          if (
            obligation['lastResolvedWeekIndex'] !== null &&
            (!nonNegativeSafeInteger(obligation['lastResolvedWeekIndex']) ||
              (nonNegativeSafeInteger(obligation['acceptedWeekIndex']) &&
                obligation['lastResolvedWeekIndex'] < obligation['acceptedWeekIndex']))
          )
            issue(
              issues,
              'invariant.out_of_bounds',
              `${path}.nil.activeObligation.lastResolvedWeekIndex`,
            );
        }
      }
      const history = nil['history'];
      if (!Array.isArray(history) || history.length > 2_000) {
        issue(issues, 'invariant.invalid_value', `${path}.nil.history`);
      } else {
        let priorWeekIndex = -1;
        for (const [index, entry] of history.entries()) {
          const entryPath = `${path}.nil.history.${index}`;
          const weekIndex = validateNilHistoryEvidence(entry, entryPath, issues);
          if (weekIndex !== null) {
            if (weekIndex < priorWeekIndex)
              issue(issues, 'invariant.noncanonical_order', `${entryPath}.weekIndex`);
            priorWeekIndex = weekIndex;
          }
        }
      }
    } else {
      issue(issues, 'invariant.invalid_value', `${path}.nil.bootstrapStatus`);
    }
  }

  let offseasonDecisionSummary: ValidatedOffseasonDecisionSummary | null = null;
  const offseason = strictRecord(
    state['offseason'],
    `${path}.offseason`,
    isRecord(state['offseason']) &&
      (state['offseason']['status'] === 'PROJECTED' || state['offseason']['status'] === 'DECIDED')
      ? PROJECTED_OFFSEASON_STATE_KEYS
      : PENDING_OFFSEASON_STATE_KEYS,
    issues,
  );
  if (offseason !== undefined) {
    if (offseason['model'] !== 'offseason_v1') {
      issue(issues, 'invariant.invalid_value', `${path}.offseason.model`);
    }
    if (offseason['status'] === 'NOT_STARTED') {
      if (offseason['completedDecisionCount'] !== 0) {
        issue(issues, 'invariant.invalid_value', `${path}.offseason.completedDecisionCount`);
      }
      if (offseason['lastDecision'] !== null) {
        issue(issues, 'invariant.invalid_value', `${path}.offseason.lastDecision`);
      }
      // The strict key set above fully defines the neutral migration state.
    } else if (offseason['status'] === 'PROJECTED' || offseason['status'] === 'DECIDED') {
      const decided = offseason['status'] === 'DECIDED';
      if (offseason['completedDecisionCount'] !== (decided ? 1 : 0)) {
        issue(issues, 'invariant.invalid_value', `${path}.offseason.completedDecisionCount`);
      }
      if (!decided && offseason['lastDecision'] !== null) {
        issue(issues, 'invariant.invalid_value', `${path}.offseason.lastDecision`);
      }
      if (
        typeof offseason['completedSeasonId'] !== 'string' ||
        !isStableDomainId(offseason['completedSeasonId']) ||
        !offseason['completedSeasonId'].startsWith('season_')
      ) {
        issue(issues, 'invariant.invalid_id', `${path}.offseason.completedSeasonId`);
      }
      if (
        !nonNegativeSafeInteger(offseason['completedSeasonIndex']) ||
        offseason['completedSeasonIndex'] < 1 ||
        offseason['nextSeasonIndex'] !== offseason['completedSeasonIndex'] + 1
      ) {
        issue(issues, 'invariant.invalid_combination', `${path}.offseason.nextSeasonIndex`);
      }
      if (
        !nonNegativeSafeInteger(offseason['academicTermIndexBefore']) ||
        offseason['academicTermIndexBefore'] < 1 ||
        offseason['academicTermIndexAfter'] !== offseason['academicTermIndexBefore'] + 1
      ) {
        issue(issues, 'invariant.invalid_combination', `${path}.offseason.academicTermIndexAfter`);
      }
      const worldProgramIds = validateOffseasonWorldProjection(
        offseason['worldProjection'],
        `${path}.offseason.worldProjection`,
        issues,
      );
      const transferProjectionRngDrawCountAfter = validateOffseasonTransferProjection(
        offseason['transferProjection'],
        `${path}.offseason.transferProjection`,
        worldProgramIds,
        issues,
      );
      if (decided) {
        offseasonDecisionSummary = validateOffseasonDecision(
          offseason['lastDecision'],
          `${path}.offseason.lastDecision`,
          offseason['transferProjection'],
          offseason['worldProjection'],
          transferProjectionRngDrawCountAfter,
          careerRngDrawCount,
          enforceDecisionSnapshot,
          issues,
        );
      } else if (transferProjectionRngDrawCountAfter !== careerRngDrawCount) {
        issue(
          issues,
          'invariant.invalid_combination',
          `${path}.offseason.transferProjection.careerRngDrawCountAfter`,
        );
      }
    } else {
      issue(issues, 'invariant.invalid_value', `${path}.offseason.status`);
    }
  }

  const programHistory = state['programHistory'];
  if (!Array.isArray(programHistory)) {
    issue(issues, 'invariant.invalid_type', `${path}.programHistory`);
    return;
  }
  let priorEndSeasonIndex = -1;
  for (const [index, entryValue] of programHistory.entries()) {
    const entryPath = `${path}.programHistory.${index}`;
    const entry = strictRecord(entryValue, entryPath, PROGRAM_HISTORY_ENTRY_KEYS, issues);
    if (entry === undefined) continue;
    if (!isProgramId(entry['programId'])) {
      issue(issues, 'invariant.invalid_id', `${entryPath}.programId`);
    }
    if (!nonNegativeSafeInteger(entry['startSeasonIndex'])) {
      issue(issues, 'invariant.out_of_bounds', `${entryPath}.startSeasonIndex`);
      continue;
    }
    if (entry['startSeasonIndex'] <= priorEndSeasonIndex) {
      issue(issues, 'invariant.noncanonical_order', `${entryPath}.startSeasonIndex`);
    }
    if (
      entry['endSeasonIndex'] !== null &&
      (!nonNegativeSafeInteger(entry['endSeasonIndex']) ||
        entry['endSeasonIndex'] < entry['startSeasonIndex'])
    ) {
      issue(issues, 'invariant.out_of_bounds', `${entryPath}.endSeasonIndex`);
    }
    if (index < programHistory.length - 1 && entry['endSeasonIndex'] === null) {
      issue(issues, 'invariant.invalid_combination', `${entryPath}.endSeasonIndex`);
    }
    priorEndSeasonIndex =
      typeof entry['endSeasonIndex'] === 'number'
        ? entry['endSeasonIndex']
        : (entry['startSeasonIndex'] as number);
  }
  if (offseasonDecisionSummary !== null && offseason !== undefined) {
    if (enforceDecisionSnapshot) {
      const relationshipTracks = isRecord(state['relationships'])
        ? state['relationships']['tracks']
        : undefined;
      if (Array.isArray(relationshipTracks)) {
        for (const [index, trackValue] of relationshipTracks.entries()) {
          if (!isRecord(trackValue) || typeof trackValue['actorId'] !== 'string') continue;
          if (
            trackValue['value'] !==
            offseasonDecisionSummary.relationshipValuesAfter.get(trackValue['actorId'])
          ) {
            issue(
              issues,
              'invariant.invalid_combination',
              `${path}.relationships.tracks.${index}.value`,
            );
          }
        }
      }
    }
    const firstHistory = isRecord(programHistory[0]) ? programHistory[0] : undefined;
    const lastHistory = isRecord(programHistory.at(-1)) ? programHistory.at(-1) : undefined;
    if (
      firstHistory?.['programId'] !== offseasonDecisionSummary.previousProgramId ||
      lastHistory?.['programId'] !== offseasonDecisionSummary.selectedProgramId ||
      lastHistory?.['endSeasonIndex'] !== null
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.programHistory`);
    }
    if (offseasonDecisionSummary.kind === 'STAY') {
      if (programHistory.length !== 1 || firstHistory?.['endSeasonIndex'] !== null) {
        issue(issues, 'invariant.invalid_combination', `${path}.programHistory`);
      }
    } else {
      if (
        programHistory.length !== 2 ||
        firstHistory?.['endSeasonIndex'] !== (offseason['completedSeasonIndex'] as number) - 1 ||
        lastHistory?.['startSeasonIndex'] !== (offseason['nextSeasonIndex'] as number) - 1
      ) {
        issue(issues, 'invariant.invalid_combination', `${path}.programHistory`);
      }
    }
  }
}

function validateCareerRunVersion(
  value: unknown,
  schemaVersion: CareerSchemaVersion,
): CareerInvariantResult {
  const issues: CareerInvariantIssue[] = [];
  const career = strictRecord(
    value,
    'career',
    schemaVersion === CAREER_SCHEMA_VERSION_V1
      ? CAREER_KEYS_V1
      : schemaVersion === CAREER_SCHEMA_VERSION_V2
        ? CAREER_KEYS_V2
        : schemaVersion === CAREER_SCHEMA_VERSION_V3
          ? CAREER_KEYS_V3
          : schemaVersion === CAREER_SCHEMA_VERSION_V4
            ? CAREER_KEYS_V4
            : schemaVersion === CAREER_SCHEMA_VERSION_V5
              ? CAREER_KEYS_V5
              : schemaVersion === CAREER_SCHEMA_VERSION_V6
                ? CAREER_KEYS_V6
                : CAREER_KEYS_V7,
    issues,
  );
  if (career !== undefined) {
    if (career.schemaVersion !== schemaVersion) {
      issue(issues, 'invariant.invalid_schema_version', 'career.schemaVersion');
    }
    if (!isCareerId(career.id)) {
      issue(issues, 'invariant.invalid_id', 'career.id');
    }
    if (!isValidCareerSeed(career.careerSeed)) {
      issue(issues, 'invariant.invalid_value', 'career.careerSeed');
    }
    const rng = strictRecord(career.rng, 'career.rng', RNG_STATE_KEYS, issues);
    if (rng === undefined || !isRngState(career.rng)) {
      issue(issues, 'invariant.invalid_value', 'career.rng');
    }
    if (!Number.isSafeInteger(career.revision) || (career.revision as number) < 0) {
      issue(issues, 'invariant.out_of_bounds', 'career.revision');
    }
    if (
      schemaVersion !== CAREER_SCHEMA_VERSION_V3 &&
      schemaVersion !== CAREER_SCHEMA_VERSION_V4 &&
      schemaVersion !== CAREER_SCHEMA_VERSION_V5 &&
      schemaVersion !== CAREER_SCHEMA_VERSION_V6 &&
      schemaVersion !== CAREER_SCHEMA_VERSION_V7 &&
      career.programId !== null
    ) {
      issue(issues, 'invariant.invalid_value', 'career.programId');
    }
    if (!Number.isSafeInteger(career.weekIndex) || (career.weekIndex as number) < 0) {
      issue(issues, 'invariant.out_of_bounds', 'career.weekIndex');
    }
    const weeklyExperienceVersion = usesExperienceSchema(schemaVersion)
      ? career['weeklyExperienceVersion']
      : undefined;
    if (
      usesExperienceSchema(schemaVersion) &&
      weeklyExperienceVersion !== WEEKLY_EXPERIENCE_VERSION_LEGACY &&
      weeklyExperienceVersion !== WEEKLY_EXPERIENCE_VERSION_CURRENT
    ) {
      issue(issues, 'invariant.invalid_value', 'career.weeklyExperienceVersion');
    }
    if (
      usesExperienceSchema(schemaVersion) &&
      weeklyExperienceVersion === WEEKLY_EXPERIENCE_VERSION_LEGACY &&
      (!isRecord(career.phase) ||
        !['RESOLVE_ACTIONS', 'WEEK_END', 'GAME_PREVIEW', 'KEY_SNAP', 'POST_GAME'].includes(
          career.phase['type'] as string,
        ))
    ) {
      issue(issues, 'invariant.invalid_combination', 'career.weeklyExperienceVersion');
    }
    const careerWeekIndex = nonNegativeSafeInteger(career.weekIndex) ? career.weekIndex : 0;
    const careerRngDrawCount = isRngState(career.rng) ? career.rng.drawCount : 0;
    const rawOffFieldState =
      usesOffFieldSchema(schemaVersion) && isRecord(career['offFieldCareerState'])
        ? career['offFieldCareerState']
        : undefined;
    const rawOffseason =
      rawOffFieldState !== undefined && isRecord(rawOffFieldState['offseason'])
        ? rawOffFieldState['offseason']
        : undefined;
    const rawOffseasonDecision =
      rawOffseason?.['status'] === 'DECIDED' && isRecord(rawOffseason['lastDecision'])
        ? rawOffseason['lastDecision']
        : undefined;
    const transferredProgramId =
      rawOffseasonDecision?.['kind'] === 'TRANSFER' &&
      isProgramId(rawOffseasonDecision['selectedProgramId'])
        ? rawOffseasonDecision['selectedProgramId']
        : undefined;
    const rawHistoricalCareerProgramIds =
      rawOffFieldState !== undefined && Array.isArray(rawOffFieldState['programHistory'])
        ? rawOffFieldState['programHistory']
            .map((entry) => (isRecord(entry) ? entry['programId'] : undefined))
            .filter(isProgramId)
        : [];
    const historicalCareerProgramIds =
      rawHistoricalCareerProgramIds.length === 0 ? undefined : rawHistoricalCareerProgramIds;
    const completedSeasonProgramIds =
      rawOffseasonDecision !== undefined && isProgramId(rawOffseasonDecision['previousProgramId'])
        ? [rawOffseasonDecision['previousProgramId']]
        : [career['programId']];
    const rawEventState =
      usesSeasonSchema(schemaVersion) &&
      isRecord(career['seasonCareerState']) &&
      career['seasonCareerState']['bootstrapStatus'] === 'ACTIVE'
        ? career['seasonCareerState']['eventState']
        : undefined;
    const validatedEventState = isEventCareerState(
      rawEventState,
      careerWeekIndex,
      careerRngDrawCount,
    )
      ? rawEventState
      : undefined;
    const rawInjuryState =
      usesSeasonSchema(schemaVersion) &&
      isRecord(career['seasonCareerState']) &&
      career['seasonCareerState']['bootstrapStatus'] === 'ACTIVE'
        ? career['seasonCareerState']['injuryState']
        : undefined;
    const validatedInjuryState = isInjuryCareerState(
      rawInjuryState,
      careerWeekIndex,
      careerRngDrawCount,
    )
      ? rawInjuryState
      : undefined;
    const resolvedEventRecord = validatedEventState?.history.find(
      (record) =>
        record.weekIndex === careerWeekIndex &&
        record.eventId === validatedEventState.lastSelection?.selectedEventId &&
        record.selectionRngDrawCountAfter === validatedEventState.lastSelection?.rngDrawCountAfter,
    );
    const currentEventGaugeEffect = resolvedEventRecord?.appliedEffects.find(
      (effect): effect is AppliedEventBreakthroughGaugeDelta =>
        effect.type === 'event_breakthrough_gauge_delta',
    );
    const skillSummary = validatePlayer(
      career.player,
      schemaVersion,
      careerWeekIndex,
      careerRngDrawCount,
      currentEventGaugeEffect,
      issues,
    );
    const recentWeeklyActionIds =
      schemaVersion !== CAREER_SCHEMA_VERSION_V1
        ? validateRecentWeeklyActionIds(career['recentWeeklyActionIds'], issues)
        : undefined;
    if (schemaVersion !== CAREER_SCHEMA_VERSION_V1) {
      validateLastPassiveBodyRecovery(career['lastPassiveBodyRecovery'], careerWeekIndex, issues);
    }
    const hasResolvedEventThisWeek =
      validatedEventState !== undefined &&
      validatedEventState.lastSelection?.outcome === 'EVENT' &&
      validatedEventState.lastSelection.weekIndex === careerWeekIndex &&
      validatedEventState.history.some(
        (record) =>
          record.eventId === validatedEventState.lastSelection?.selectedEventId &&
          record.weekIndex === careerWeekIndex &&
          record.selectionRngDrawCountBefore ===
            validatedEventState.lastSelection?.rngDrawCountBefore &&
          record.selectionRngDrawCountAfter ===
            validatedEventState.lastSelection?.rngDrawCountAfter,
      );
    const hasResolvedInjuryChoiceThisWeek =
      validatedInjuryState?.lastAvailability?.weekIndex === careerWeekIndex &&
      validatedInjuryState.lastAvailability.choiceId !== null;
    validateCareerPhase(
      career.phase,
      career.weekIndex,
      career.player,
      schemaVersion,
      careerRngDrawCount,
      skillSummary,
      weeklyExperienceVersion,
      hasResolvedEventThisWeek || hasResolvedInjuryChoiceThisWeek,
      issues,
    );
    if (schemaVersion !== CAREER_SCHEMA_VERSION_V1) {
      validateCurrentResultsInRecentHistory(career.phase, recentWeeklyActionIds, issues);
    }
    if (
      schemaVersion === CAREER_SCHEMA_VERSION_V3 ||
      schemaVersion === CAREER_SCHEMA_VERSION_V4 ||
      schemaVersion === CAREER_SCHEMA_VERSION_V5 ||
      usesOffFieldSchema(schemaVersion)
    ) {
      const phaseDepthUpdate =
        isRecord(career.phase) && career.phase['type'] === 'WEEK_END'
          ? career.phase['depthUpdate']
          : undefined;
      const currentPlayerCoachTrust =
        isRecord(career.player) && isRecord(career.player['state'])
          ? career.player['state']['coachTrust']
          : undefined;
      const playerEvaluation =
        isRecord(career['programContext']) && Array.isArray(career['programContext']['evaluations'])
          ? career['programContext']['evaluations'].find(
              (evaluation) =>
                isRecord(evaluation) &&
                isRecord(career.player) &&
                evaluation['participantId'] === career.player['id'],
            )
          : undefined;
      const evaluatedComponents =
        isRecord(playerEvaluation) && isRecord(playerEvaluation['components'])
          ? playerEvaluation['components']
          : undefined;
      const playerCoachTrust = evaluatedComponents?.['coachTrust'] ?? currentPlayerCoachTrust;
      issues.push(
        ...validateProgramState({
          programId: career.programId,
          recruitingState: career['recruitingState'],
          programContext: career['programContext'],
          playerId: isRecord(career.player) ? career.player['id'] : undefined,
          playerCoachTrust,
          careerWeekIndex,
          careerRngDrawCount,
          phaseDepthUpdate,
          weeklyExperienceVersion,
          currentProgramIdOverride: transferredProgramId,
        }),
      );
    }
    if (usesExperienceSchema(schemaVersion)) {
      issues.push(
        ...validateCareerGameState({
          gameCareerState: career['gameCareerState'],
          phase: career.phase,
          careerWeekIndex: career.weekIndex,
          careerProgramId: career.programId,
          careerRngDrawCount,
          player: career.player,
          ...(historicalCareerProgramIds === undefined ? {} : { historicalCareerProgramIds }),
        }),
      );
    }
    if (usesSeasonSchema(schemaVersion)) {
      const rawSeasonCareerState = career['seasonCareerState'];
      const seasonStateKeys =
        isRecord(rawSeasonCareerState) && rawSeasonCareerState['bootstrapStatus'] === 'ACTIVE'
          ? ACTIVE_SEASON_CAREER_STATE_KEYS
          : PENDING_SEASON_CAREER_STATE_KEYS;
      const seasonCareerState = strictRecord(
        rawSeasonCareerState,
        'career.seasonCareerState',
        seasonStateKeys,
        issues,
      );
      if (seasonCareerState !== undefined) {
        if (seasonCareerState['model'] !== 'season_v1') {
          issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.model');
        }
        if (
          seasonCareerState['bootstrapStatus'] !== 'PENDING' &&
          seasonCareerState['bootstrapStatus'] !== 'ACTIVE' &&
          seasonCareerState['bootstrapStatus'] !== 'COMPLETE'
        ) {
          issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.bootstrapStatus');
        }
        if (seasonCareerState['bootstrapStatus'] === 'COMPLETE') {
          if (seasonCareerState['seasonsCompleted'] !== 1) {
            issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.seasonsCompleted');
          }
          if (seasonCareerState['activeSeasonId'] !== null) {
            issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.activeSeasonId');
          }
          const summary = strictRecord(
            seasonCareerState['lastCompletedSeason'],
            'career.seasonCareerState.lastCompletedSeason',
            COMPLETED_SEASON_SUMMARY_KEYS,
            issues,
          );
          if (summary !== undefined) {
            if (
              typeof summary['seasonId'] !== 'string' ||
              !isStableDomainId(summary['seasonId']) ||
              !summary['seasonId'].startsWith('season_')
            ) {
              issue(
                issues,
                'invariant.invalid_id',
                'career.seasonCareerState.lastCompletedSeason.seasonId',
              );
            }
            if (
              ![
                'season_outcome_champion',
                'season_outcome_runner_up',
                'season_outcome_semifinal_exit',
                'season_outcome_regular_season_complete',
              ].includes(summary['outcomeId'] as string)
            ) {
              issue(
                issues,
                'invariant.invalid_id',
                'career.seasonCareerState.lastCompletedSeason.outcomeId',
              );
            }
            for (const key of [
              'regularSeasonRank',
              'programWins',
              'programLosses',
              'programTies',
              'gamesPlayed',
              'playerWins',
              'playerLosses',
              'playerTies',
              'averagePerformanceGrade',
              'finalDepthRank',
              'injuryCount',
              'injuryWeeksMissed',
            ] as const) {
              if (!nonNegativeSafeInteger(summary[key])) {
                issue(
                  issues,
                  'invariant.out_of_bounds',
                  `career.seasonCareerState.lastCompletedSeason.${key}`,
                );
              }
            }
            if (
              summary['postseasonSeed'] !== null &&
              (!nonNegativeSafeInteger(summary['postseasonSeed']) ||
                summary['postseasonSeed'] < 1 ||
                summary['postseasonSeed'] > 4)
            ) {
              issue(
                issues,
                'invariant.out_of_bounds',
                'career.seasonCareerState.lastCompletedSeason.postseasonSeed',
              );
            }
            if (!isWrGameStatLine(summary['cumulativeStats'])) {
              issue(
                issues,
                'invariant.invalid_value',
                'career.seasonCareerState.lastCompletedSeason.cumulativeStats',
              );
            }
            if (
              summary['bestGame'] !== null &&
              !completedSeasonProgramIds.some((programId) =>
                isCompletedGameSummary(summary['bestGame'], programId, careerRngDrawCount),
              )
            ) {
              issue(
                issues,
                'invariant.invalid_value',
                'career.seasonCareerState.lastCompletedSeason.bestGame',
              );
            }
            if (!isDepthRoleId(summary['finalRoleId'])) {
              issue(
                issues,
                'invariant.invalid_id',
                'career.seasonCareerState.lastCompletedSeason.finalRoleId',
              );
            }
            for (const [field, allowNull] of [
              ['ownedSkillIds', false],
              ['equippedSkillIds', true],
            ] as const) {
              const values = summary[field];
              if (
                !Array.isArray(values) ||
                !values.every((value) => (allowNull && value === null) || isSkillId(value))
              ) {
                issue(
                  issues,
                  'invariant.invalid_value',
                  `career.seasonCareerState.lastCompletedSeason.${field}`,
                );
              }
            }
            const roleHistory = summary['roleHistory'];
            if (!Array.isArray(roleHistory) || roleHistory.length === 0) {
              issue(
                issues,
                'invariant.invalid_value',
                'career.seasonCareerState.lastCompletedSeason.roleHistory',
              );
            }
          }
        } else {
          const returningActiveSeason =
            usesOffFieldSchema(schemaVersion) &&
            seasonCareerState['bootstrapStatus'] === 'ACTIVE' &&
            seasonCareerState['seasonsCompleted'] === 1;
          if (returningActiveSeason) {
            validateReturningCompletedSeasonSummary(
              seasonCareerState['lastCompletedSeason'],
              completedSeasonProgramIds,
              careerRngDrawCount,
              issues,
            );
          } else {
            if (seasonCareerState['seasonsCompleted'] !== 0) {
              issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.seasonsCompleted');
            }
            if (seasonCareerState['lastCompletedSeason'] !== null) {
              issue(
                issues,
                'invariant.invalid_value',
                'career.seasonCareerState.lastCompletedSeason',
              );
            }
          }
          if (seasonCareerState['bootstrapStatus'] === 'PENDING') {
            if (seasonCareerState['activeSeasonId'] !== null) {
              issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.activeSeasonId');
            }
          }
          if (seasonCareerState['bootstrapStatus'] === 'ACTIVE') {
            if (
              typeof seasonCareerState['activeSeasonId'] !== 'string' ||
              !isStableDomainId(seasonCareerState['activeSeasonId']) ||
              !seasonCareerState['activeSeasonId'].startsWith('season_')
            ) {
              issue(issues, 'invariant.invalid_id', 'career.seasonCareerState.activeSeasonId');
            }
            const gameSummaries = seasonCareerState['gameSummaries'];
            if (!Array.isArray(gameSummaries)) {
              issue(issues, 'invariant.invalid_type', 'career.seasonCareerState.gameSummaries');
            } else {
              for (const [index, summary] of gameSummaries.entries()) {
                if (!isCompletedGameSummary(summary, career['programId'], careerRngDrawCount)) {
                  issue(
                    issues,
                    'invariant.invalid_value',
                    `career.seasonCareerState.gameSummaries.${index}`,
                  );
                }
              }
            }
            const roleHistory = seasonCareerState['roleHistory'];
            if (!Array.isArray(roleHistory) || roleHistory.length === 0) {
              issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.roleHistory');
            } else {
              let previousWeekIndex = -1;
              for (const [index, snapshotValue] of roleHistory.entries()) {
                const snapshot = strictRecord(
                  snapshotValue,
                  `career.seasonCareerState.roleHistory.${index}`,
                  SEASON_ROLE_SNAPSHOT_KEYS,
                  issues,
                );
                if (snapshot === undefined) continue;
                if (
                  !nonNegativeSafeInteger(snapshot['weekIndex']) ||
                  snapshot['weekIndex'] < previousWeekIndex
                ) {
                  issue(
                    issues,
                    'invariant.noncanonical_order',
                    `career.seasonCareerState.roleHistory.${index}.weekIndex`,
                  );
                } else {
                  previousWeekIndex = snapshot['weekIndex'];
                }
                if (
                  !nonNegativeSafeInteger(snapshot['rank']) ||
                  snapshot['rank'] < 1 ||
                  snapshot['rank'] > 8
                ) {
                  issue(
                    issues,
                    'invariant.out_of_bounds',
                    `career.seasonCareerState.roleHistory.${index}.rank`,
                  );
                }
                if (!isDepthRoleId(snapshot['roleId'])) {
                  issue(
                    issues,
                    'invariant.invalid_id',
                    `career.seasonCareerState.roleHistory.${index}.roleId`,
                  );
                }
              }
            }
            const eventState = seasonCareerState['eventState'];
            if (!isEventCareerState(eventState, careerWeekIndex, careerRngDrawCount)) {
              issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.eventState');
            } else if (isRecord(career.phase) && career.phase['type'] === 'EVENT_CHOICE') {
              const pendingEvent = career.phase['pendingEvent'];
              if (
                !isPendingEventEvidence(pendingEvent) ||
                JSON.stringify(eventState.lastSelection) !== JSON.stringify(pendingEvent.selection)
              ) {
                issue(
                  issues,
                  'invariant.invalid_combination',
                  'career.seasonCareerState.eventState.lastSelection',
                );
              }
            } else if (
              eventState.lastSelection?.outcome === 'EVENT' &&
              !eventState.history.some(
                (record) =>
                  record.eventId === eventState.lastSelection?.selectedEventId &&
                  record.weekIndex === eventState.lastSelection.weekIndex &&
                  record.selectionRngDrawCountBefore ===
                    eventState.lastSelection.rngDrawCountBefore &&
                  record.selectionRngDrawCountAfter === eventState.lastSelection.rngDrawCountAfter,
              )
            ) {
              issue(
                issues,
                'invariant.invalid_combination',
                'career.seasonCareerState.eventState.lastSelection',
              );
            }
            const injuryState = seasonCareerState['injuryState'];
            if (!isInjuryCareerState(injuryState, careerWeekIndex, careerRngDrawCount)) {
              issue(issues, 'invariant.invalid_value', 'career.seasonCareerState.injuryState');
            } else if (isRecord(career.phase) && career.phase['type'] === 'INJURY_CHOICE') {
              const pendingInjury = career.phase['pendingInjury'];
              if (
                !isPendingInjuryChoiceEvidence(pendingInjury) ||
                JSON.stringify(injuryState.lastAssessment) !==
                  JSON.stringify(pendingInjury.assessment) ||
                injuryState.currentInjury?.outcomeId !== pendingInjury.outcomeId ||
                injuryState.lastAvailability?.weekIndex === careerWeekIndex
              ) {
                issue(
                  issues,
                  'invariant.invalid_combination',
                  'career.seasonCareerState.injuryState.lastAssessment',
                );
              }
            } else if (
              injuryState.lastAssessment?.weekIndex === careerWeekIndex &&
              injuryState.lastAvailability?.weekIndex !== careerWeekIndex
            ) {
              issue(
                issues,
                'invariant.invalid_combination',
                'career.seasonCareerState.injuryState.lastAvailability',
              );
            }
          }
        }
      }
    }
    if (usesOffFieldSchema(schemaVersion)) {
      validateOffFieldCareerState(
        career['offFieldCareerState'],
        careerRngDrawCount,
        isRecord(career['seasonCareerState']) &&
          career['seasonCareerState']['bootstrapStatus'] === 'COMPLETE' &&
          isRecord(career['phase']) &&
          career['phase']['type'] === 'SEASON_REVIEW',
        issues,
      );
      const offseason = isRecord(career['offFieldCareerState'])
        ? career['offFieldCareerState']['offseason']
        : undefined;
      if (
        isRecord(offseason) &&
        (offseason['status'] === 'PROJECTED' || offseason['status'] === 'DECIDED')
      ) {
        const completedSeason = isRecord(career['seasonCareerState'])
          ? career['seasonCareerState']['lastCompletedSeason']
          : undefined;
        const seasonState = isRecord(career['seasonCareerState'])
          ? career['seasonCareerState']
          : undefined;
        const phase = isRecord(career['phase']) ? career['phase'] : undefined;
        const awaitingDecision =
          phase?.['type'] === 'SEASON_REVIEW' && seasonState?.['bootstrapStatus'] === 'COMPLETE';
        const playingNextSeason =
          offseason['status'] === 'DECIDED' &&
          seasonState?.['bootstrapStatus'] === 'ACTIVE' &&
          seasonState['seasonsCompleted'] === 1 &&
          phase?.['type'] !== 'SEASON_REVIEW';
        const academics = isRecord(career['offFieldCareerState'])
          ? career['offFieldCareerState']['academics']
          : undefined;
        if (
          (!awaitingDecision && !playingNextSeason) ||
          !isRecord(completedSeason) ||
          offseason['completedSeasonId'] !== completedSeason['seasonId']
        ) {
          issue(
            issues,
            'invariant.invalid_combination',
            'career.offFieldCareerState.offseason.completedSeasonId',
          );
        }
        if (
          !isRecord(academics) ||
          academics['termIndex'] !==
            (playingNextSeason
              ? offseason['academicTermIndexAfter']
              : offseason['academicTermIndexBefore'])
        ) {
          issue(
            issues,
            'invariant.invalid_combination',
            'career.offFieldCareerState.academics.termIndex',
          );
        }
        if (offseason['status'] === 'DECIDED' && isRecord(offseason['lastDecision'])) {
          const decision = offseason['lastDecision'];
          const programContext = isRecord(career['programContext'])
            ? career['programContext']
            : undefined;
          const playerState =
            isRecord(career['player']) && isRecord(career['player']['state'])
              ? career['player']['state']
              : undefined;
          const playerEvaluation =
            programContext !== undefined && Array.isArray(programContext['evaluations'])
              ? programContext['evaluations'].find(
                  (entry) =>
                    isRecord(entry) &&
                    isRecord(career['player']) &&
                    entry['participantId'] === career['player']['id'],
                )
              : undefined;
          const evaluationComponents =
            isRecord(playerEvaluation) && isRecord(playerEvaluation['components'])
              ? playerEvaluation['components']
              : undefined;
          const projection =
            programContext !== undefined && isRecord(programContext['projection'])
              ? programContext['projection']
              : undefined;
          const recruitingState = isRecord(career['recruitingState'])
            ? career['recruitingState']
            : undefined;
          const atDecisionBoundary =
            isRecord(career['seasonCareerState']) &&
            career['seasonCareerState']['bootstrapStatus'] === 'COMPLETE' &&
            isRecord(career['phase']) &&
            career['phase']['type'] === 'SEASON_REVIEW';
          if (
            career['programId'] !== decision['selectedProgramId'] ||
            programContext?.['programId'] !== decision['selectedProgramId'] ||
            programContext?.['offenseStyleId'] !== decision['offenseStyleIdAfter'] ||
            programContext?.['rotationPolicyId'] !== decision['rotationPolicyIdAfter'] ||
            recruitingState?.['selectedProgramId'] !== decision['previousProgramId'] ||
            (atDecisionBoundary &&
              (programContext?.['playerPracticeForm'] !== decision['playerPracticeFormAfter'] ||
                playerState?.['coachTrust'] !== decision['coachTrustAfter'] ||
                evaluationComponents?.['coachTrust'] !== decision['coachTrustAfter'] ||
                evaluationComponents?.['practiceForm'] !== decision['playerPracticeFormAfter'] ||
                evaluationComponents?.['experienceReadiness'] !==
                  decision['playerExperienceReadiness'] ||
                projection?.['rank'] !== decision['actualDepthRank'] ||
                projection?.['roleId'] !== decision['actualRoleId'] ||
                projection?.['minSnapPermille'] !== decision['actualSnapMinPermille'] ||
                projection?.['maxSnapPermille'] !== decision['actualSnapMaxPermille']))
          ) {
            issue(
              issues,
              'invariant.invalid_combination',
              'career.offFieldCareerState.offseason.lastDecision',
            );
          }
        }
      }
    }
  }

  const sortedIssues = issues.sort((left, right) => {
    const pathOrder = compareCodeUnits(left.path, right.path);
    return pathOrder === 0 ? compareCodeUnits(left.code, right.code) : pathOrder;
  });
  const result: CareerInvariantResult =
    sortedIssues.length === 0 ? { ok: true, issues: [] } : { ok: false, issues: sortedIssues };
  return deepFreeze(result);
}

export function validateCareerRunV1(value: unknown): CareerInvariantResult {
  return validateCareerRunVersion(value, CAREER_SCHEMA_VERSION_V1);
}

export function validateCareerRunV2(value: unknown): CareerInvariantResult {
  return validateCareerRunVersion(value, CAREER_SCHEMA_VERSION_V2);
}

export function validateCareerRunV3(value: unknown): CareerInvariantResult {
  return validateCareerRunVersion(value, CAREER_SCHEMA_VERSION_V3);
}

export function validateCareerRunV4(value: unknown): CareerInvariantResult {
  return validateCareerRunVersion(value, CAREER_SCHEMA_VERSION_V4);
}

export function validateCareerRunV5(value: unknown): CareerInvariantResult {
  return validateCareerRunVersion(value, CAREER_SCHEMA_VERSION_V5);
}

export function validateCareerRunV6(value: unknown): CareerInvariantResult {
  return validateCareerRunVersion(value, CAREER_SCHEMA_VERSION_V6);
}

export function validateCareerRunV7(value: unknown): CareerInvariantResult {
  return validateCareerRunVersion(value, CAREER_SCHEMA_VERSION_V7);
}

export function validateCareerRun(value: unknown): CareerInvariantResult {
  return validateCareerRunV7(value);
}

export function isCareerRunV1(value: unknown): value is CareerRunV1 {
  return validateCareerRunV1(value).ok;
}

export function isCareerRunV2(value: unknown): value is CareerRunV2 {
  return validateCareerRunV2(value).ok;
}

export function isCareerRunV3(value: unknown): value is CareerRunV3 {
  return validateCareerRunV3(value).ok;
}

export function isCareerRunV4(value: unknown): value is CareerRunV4 {
  return validateCareerRunV4(value).ok;
}

export function isCareerRunV5(value: unknown): value is CareerRunV5 {
  return validateCareerRunV5(value).ok;
}

export function isCareerRunV6(value: unknown): value is CareerRunV6 {
  return validateCareerRunV6(value).ok;
}

export function isCareerRunV7(value: unknown): value is CareerRunV7 {
  return validateCareerRunV7(value).ok;
}

export function isCareerRun(value: unknown): value is CareerRun {
  return validateCareerRun(value).ok;
}
