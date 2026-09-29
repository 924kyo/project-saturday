import { RECRUITING_BACKGROUND_IDS, WR_ARCHETYPE_IDS, isProgramId } from '../player/ids.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { CareerRun, WrPlayer } from '../player/types.js';
import { validateCareerRun } from '../player/validation.js';
import {
  isProgramOffenseStyleId,
  isProgramStrengthBandId,
  isRotationPolicyId,
  type ProjectedDepthBandId,
  type RecruitTierId,
  type RecruitingCommandFailureReason,
} from './ids.js';
import {
  RECRUIT_BACKGROUND_MODIFIER_BOUNDS,
  RECRUIT_SCORE_BOUNDS,
  RECRUIT_TIER_NATIONAL_MIN_SCORE,
  RECRUIT_TIER_PRIORITY_MIN_SCORE,
  RECRUITING_OFFER_COUNT,
  deriveRecruitTierId,
} from './tuning.js';
import {
  RECRUIT_ABILITY_ATTRIBUTE_IDS,
  type RecruitAbilityAttributeId,
  type RecruitingCommandResult,
  type RecruitingMechanicsConfig,
  type RecruitingOffenseStyleDefinition,
  type RecruitingOfferEvidence,
  type RecruitingOfferTuple,
  type RecruitingProgramDefinition,
} from './types.js';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }
  const ownKeys = Object.keys(value);
  return (
    ownKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key)) &&
    ownKeys.every((key) => keys.includes(key))
  );
}

function isDenseArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      return false;
    }
  }
  return true;
}

function integerIn(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function failure(
  career: CareerRun,
  reason: RecruitingCommandFailureReason,
): RecruitingCommandResult {
  return Object.freeze({ career, ok: false, reason });
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function playerRating(player: WrPlayer, attributeId: RecruitAbilityAttributeId): number {
  switch (attributeId) {
    case 'attribute_speed':
    case 'attribute_burst':
    case 'attribute_agility':
    case 'attribute_strength':
      return player.attributes.physical[attributeId].rating;
    case 'attribute_wr_release':
    case 'attribute_wr_route_running':
    case 'attribute_wr_hands':
    case 'attribute_wr_catch_in_traffic':
      return player.attributes.wr[attributeId].rating;
  }
}

function isExactIntegerRecord(
  value: unknown,
  keys: readonly string[],
  min: number,
  max: number,
): value is Readonly<Record<string, number>> {
  return hasExactKeys(value, keys) && keys.every((key) => integerIn(value[key], min, max));
}

function isRecruitingConfig(value: unknown): value is RecruitingMechanicsConfig {
  if (
    !hasExactKeys(value, [
      'abilityWeightsPermille',
      'backgroundModifiers',
      'offerCount',
      'projectedDepthGapThresholds',
      'tierThresholds',
    ]) ||
    value['offerCount'] !== RECRUITING_OFFER_COUNT ||
    !isExactIntegerRecord(
      value['abilityWeightsPermille'],
      RECRUIT_ABILITY_ATTRIBUTE_IDS,
      1,
      1_000,
    ) ||
    Object.values(value['abilityWeightsPermille']).reduce((total, weight) => total + weight, 0) !==
      1_000 ||
    !isExactIntegerRecord(
      value['backgroundModifiers'],
      RECRUITING_BACKGROUND_IDS,
      RECRUIT_BACKGROUND_MODIFIER_BOUNDS.min,
      RECRUIT_BACKGROUND_MODIFIER_BOUNDS.max,
    ) ||
    !hasExactKeys(value['tierThresholds'], ['nationalMinScore', 'priorityMinScore']) ||
    value['tierThresholds']['nationalMinScore'] !== RECRUIT_TIER_NATIONAL_MIN_SCORE ||
    value['tierThresholds']['priorityMinScore'] !== RECRUIT_TIER_PRIORITY_MIN_SCORE ||
    !hasExactKeys(value['projectedDepthGapThresholds'], [
      'reservePathMin',
      'rotationPathMin',
      'starterCompetitionMin',
    ])
  ) {
    return false;
  }
  const thresholds = value['projectedDepthGapThresholds'];
  return (
    integerIn(thresholds['starterCompetitionMin'], -100, 100) &&
    integerIn(thresholds['rotationPathMin'], -100, 100) &&
    integerIn(thresholds['reservePathMin'], -100, 100) &&
    thresholds['starterCompetitionMin'] > thresholds['rotationPathMin'] &&
    thresholds['rotationPathMin'] > thresholds['reservePathMin']
  );
}

const OFFENSE_STYLE_KEYS = ['id', 'attributeWeightsPermille', 'schemeFitByArchetype'] as const;

export function validateOffenseCatalog(
  value: unknown,
): ReadonlyMap<string, RecruitingOffenseStyleDefinition> | undefined {
  if (!isDenseArray(value) || value.length === 0) {
    return undefined;
  }
  const byId = new Map<string, RecruitingOffenseStyleDefinition>();
  for (const rawStyle of value) {
    if (
      !hasExactKeys(rawStyle, OFFENSE_STYLE_KEYS) ||
      !isProgramOffenseStyleId(rawStyle['id']) ||
      byId.has(rawStyle['id']) ||
      !isExactIntegerRecord(
        rawStyle['attributeWeightsPermille'],
        RECRUIT_ABILITY_ATTRIBUTE_IDS,
        1,
        1_000,
      ) ||
      Object.values(rawStyle['attributeWeightsPermille']).reduce(
        (total, weight) => total + weight,
        0,
      ) !== 1_000 ||
      !isExactIntegerRecord(rawStyle['schemeFitByArchetype'], WR_ARCHETYPE_IDS, 0, 100)
    ) {
      return undefined;
    }
    byId.set(rawStyle['id'], rawStyle as unknown as RecruitingOffenseStyleDefinition);
  }
  return byId;
}

const PROGRAM_KEYS = [
  'id',
  'initialCoachTrustBonus',
  'offenseStyleId',
  'recruitingInterestByTier',
  'roomProfile',
  'rotationPolicyId',
  'strengthBandId',
] as const;

export function validateProgramCatalog(
  value: unknown,
  offenseStyles: ReadonlyMap<string, RecruitingOffenseStyleDefinition>,
): readonly RecruitingProgramDefinition[] | undefined {
  if (!isDenseArray(value) || value.length < RECRUITING_OFFER_COUNT) {
    return undefined;
  }
  const definitions: RecruitingProgramDefinition[] = [];
  const seenIds = new Set<string>();
  for (const rawProgram of value) {
    if (
      !hasExactKeys(rawProgram, PROGRAM_KEYS) ||
      !isProgramId(rawProgram['id']) ||
      seenIds.has(rawProgram['id']) ||
      !isProgramStrengthBandId(rawProgram['strengthBandId']) ||
      !isProgramOffenseStyleId(rawProgram['offenseStyleId']) ||
      !offenseStyles.has(rawProgram['offenseStyleId']) ||
      !isRotationPolicyId(rawProgram['rotationPolicyId']) ||
      !integerIn(rawProgram['initialCoachTrustBonus'], -10, 20) ||
      !isExactIntegerRecord(
        rawProgram['recruitingInterestByTier'],
        ['recruit_tier_national', 'recruit_tier_priority', 'recruit_tier_developmental'],
        0,
        100,
      ) ||
      !hasExactKeys(rawProgram['roomProfile'], [
        'experienceReadinessBase',
        'practiceFormBase',
        'talentMean',
        'talentSpread',
        'trustBase',
      ])
    ) {
      return undefined;
    }
    const room = rawProgram['roomProfile'];
    if (
      !integerIn(room['experienceReadinessBase'], 20, 80) ||
      !integerIn(room['practiceFormBase'], 35, 65) ||
      !integerIn(room['talentMean'], 35, 90) ||
      !integerIn(room['talentSpread'], 4, 20) ||
      !integerIn(room['trustBase'], 0, 40)
    ) {
      return undefined;
    }
    seenIds.add(rawProgram['id']);
    definitions.push(rawProgram as unknown as RecruitingProgramDefinition);
  }
  return definitions;
}

function projectedDepthBand(
  recruitScore: number,
  roomTalentMean: number,
  config: RecruitingMechanicsConfig,
): ProjectedDepthBandId {
  const gap = recruitScore - roomTalentMean;
  const thresholds = config.projectedDepthGapThresholds;
  return gap >= thresholds.starterCompetitionMin
    ? 'projected_depth_band_starter_competition'
    : gap >= thresholds.rotationPathMin
      ? 'projected_depth_band_rotation_path'
      : gap >= thresholds.reservePathMin
        ? 'projected_depth_band_reserve_path'
        : 'projected_depth_band_developmental';
}

/** Begins the one-shot M3 recruiting choice without consuming gameplay RNG. */
export function beginRecruiting(
  career: CareerRun,
  config: RecruitingMechanicsConfig,
  programDefinitions: readonly RecruitingProgramDefinition[],
  offenseStyleDefinitions: readonly RecruitingOffenseStyleDefinition[],
): RecruitingCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(career, 'recruiting.invalid_career');
  }
  if (career.revision >= Number.MAX_SAFE_INTEGER) {
    return failure(career, 'recruiting.revision_exhausted');
  }
  if (career.phase.type !== 'PLAN_ACTIONS') {
    return failure(career, 'recruiting.invalid_phase');
  }
  if (career.recruitingState.type !== 'NOT_STARTED') {
    return failure(career, 'recruiting.already_started');
  }
  if (!isRecruitingConfig(config)) {
    return failure(career, 'recruiting.invalid_config');
  }
  const offenseStyles = validateOffenseCatalog(offenseStyleDefinitions);
  if (offenseStyles === undefined) {
    return failure(career, 'recruiting.invalid_offense_catalog');
  }
  const programs = validateProgramCatalog(programDefinitions, offenseStyles);
  if (programs === undefined) {
    return failure(career, 'recruiting.invalid_program_catalog');
  }

  const weightedRatingTotal = RECRUIT_ABILITY_ATTRIBUTE_IDS.reduce(
    (total, attributeId) =>
      total + playerRating(career.player, attributeId) * config.abilityWeightsPermille[attributeId],
    0,
  );
  const recruitAbilityScore = Math.round(weightedRatingTotal / 1_000);
  const backgroundModifier = config.backgroundModifiers[career.player.recruitingBackgroundId];
  const recruitScore = clamp(
    recruitAbilityScore + backgroundModifier,
    RECRUIT_SCORE_BOUNDS.min,
    RECRUIT_SCORE_BOUNDS.max,
  );
  const recruitTierId: RecruitTierId = deriveRecruitTierId(recruitScore);
  const offers = programs
    .flatMap((program): readonly RecruitingOfferEvidence[] => {
      const interest = program.recruitingInterestByTier[recruitTierId];
      const offenseStyle = offenseStyles.get(program.offenseStyleId);
      if (interest === 0 || offenseStyle === undefined) {
        return [];
      }
      const schemeFit = offenseStyle.schemeFitByArchetype[career.player.archetypeId];
      return [
        {
          programId: program.id,
          interest,
          schemeFit,
          priority: interest * 2 + schemeFit,
          projectedDepthBandId: projectedDepthBand(
            recruitScore,
            program.roomProfile.talentMean,
            config,
          ),
        },
      ];
    })
    .sort((left, right) =>
      right.priority === left.priority
        ? compareCodeUnits(left.programId, right.programId)
        : right.priority - left.priority,
    )
    .slice(0, config.offerCount);
  if (offers.length !== RECRUITING_OFFER_COUNT) {
    return failure(career, 'recruiting.insufficient_offers');
  }

  const cloned = cloneSerializable(career);
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    recruitingState: {
      type: 'CHOOSING',
      recruitAbilityScore,
      backgroundModifier,
      recruitScore,
      recruitTierId,
      offers: offers as unknown as RecruitingOfferTuple,
    },
  };
  if (!validateCareerRun(nextCareer).ok) {
    return failure(career, 'recruiting.internal_invariant_failure');
  }
  return deepFreeze({ career: nextCareer, ok: true });
}
