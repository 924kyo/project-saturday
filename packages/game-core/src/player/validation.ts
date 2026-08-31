import { isRngState } from '../random/rng.js';
import { isSkillId } from '../skills/ids.js';
import { EQUIPPED_SKILL_SLOT_COUNT, SKILL_BREAKTHROUGH_OFFER_SIZE } from '../skills/types.js';
import {
  SKILL_APPLIED_WEEKLY_EFFECT_MAX,
  SKILL_BODY_COST_MULTIPLIER_AGGREGATE_BOUNDS,
  SKILL_BODY_DELTA_FLAT_AGGREGATE_BOUNDS,
  SKILL_BODY_DELTA_FLAT_BOUNDS,
  SKILL_EFFECT_COUNT_BOUNDS,
  SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS,
  SKILL_EFFECTIVE_BODY_DELTA_BOUNDS,
  SKILL_EFFECTIVE_GPA_DELTA_MILLI_BOUNDS,
  SKILL_GPA_DELTA_MILLI_AGGREGATE_BOUNDS,
  SKILL_GPA_DELTA_MILLI_BOUNDS,
  SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
  SKILL_PASSIVE_BODY_RECOVERY_FLAT_AGGREGATE_BOUNDS,
  SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS,
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
  isRecruitingBackgroundId,
  isStableDomainId,
  isWrArchetypeId,
} from './ids.js';
import { compareCodeUnits } from './order.js';
import {
  CAREER_SCHEMA_VERSION_V1,
  CAREER_SCHEMA_VERSION_V2,
  RECENT_WEEKLY_ACTION_ID_LIMIT,
  type CareerRun,
  type CareerRunV1,
  type CareerRunV2,
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
  WEEKLY_ACTION_GPA_DELTA_BOUNDS,
  WEEKLY_ACTION_PLAN_SIZE,
} from '../weekly/tuning.js';

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
const PLAYER_STATE_KEYS = ['body', 'confidence', 'coachTrust', 'brand', 'gpa'] as const;
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
const SKILL_EFFECT_AGGREGATE_KEYS = [
  'xpMultiplierPermille',
  'bodyCostMultiplierPermille',
  'bodyDeltaFlat',
  'gpaDeltaMilli',
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
const PLAYER_SKILL_STATE_KEYS = ['acquisitions', 'equippedSkillIds'] as const;
const SKILL_ACQUISITION_KEYS = [
  'offerIndex',
  'weekIndex',
  'offeredSkillIds',
  'selectedSkillId',
  'rngDrawCountBefore',
  'rngDrawCountAfter',
] as const;
const SKILL_BREAKTHROUGH_OFFER_KEYS = [
  'offerIndex',
  'weekIndex',
  'offeredSkillIds',
  'rngDrawCountBefore',
  'rngDrawCountAfter',
] as const;
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

function validateState(value: unknown, issues: CareerInvariantIssue[]): void {
  const state = strictRecord(value, 'career.player.state', PLAYER_STATE_KEYS, issues);
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
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
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
  issues: CareerInvariantIssue[],
): SkillValidationSummary {
  const path = 'career.player.skillState';
  const state = strictRecord(value, path, PLAYER_SKILL_STATE_KEYS, issues);
  const ownedSkillIds = new Set<string>();
  let validatedEquippedSkillIds: readonly unknown[] = [null, null, null, null];
  let lastRngDrawCountAfter = 0;
  let lastAcquisitionWeekIndex = 0;
  let acquisitionCount = 0;

  if (state !== undefined) {
    const acquisitions = denseArray(state['acquisitions'], `${path}.acquisitions`, issues);
    if (acquisitions !== undefined) {
      acquisitionCount = acquisitions.length;
      for (const [index, rawAcquisition] of acquisitions.entries()) {
        const acquisitionPath = `${path}.acquisitions.${index}`;
        const acquisition = strictRecord(
          rawAcquisition,
          acquisitionPath,
          SKILL_ACQUISITION_KEYS,
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
          if (!isSkillBreakthroughCadenceWeek(acquisitionWeekIndex)) {
            issue(issues, 'invariant.invalid_combination', `${acquisitionPath}.weekIndex`);
          }
          if (index > 0 && acquisitionWeekIndex <= lastAcquisitionWeekIndex) {
            issue(issues, 'invariant.noncanonical_order', `${acquisitionPath}.weekIndex`);
          }
          lastAcquisitionWeekIndex = acquisitionWeekIndex;
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
  }

  return {
    acquisitionCount,
    lastAcquisitionWeekIndex,
    lastRngDrawCountAfter,
    ownedSkillIds,
    equippedSkillIds: validatedEquippedSkillIds,
  };
}

function validateSkillBreakthroughOffer(
  value: unknown,
  careerWeekIndex: number,
  careerRngDrawCount: number,
  skillSummary: SkillValidationSummary,
  issues: CareerInvariantIssue[],
): void {
  const path = 'career.phase.offer';
  const offer = strictRecord(value, path, SKILL_BREAKTHROUGH_OFFER_KEYS, issues);
  if (offer === undefined) {
    return;
  }
  if (offer['offerIndex'] !== skillSummary.acquisitionCount) {
    issue(issues, 'invariant.invalid_combination', `${path}.offerIndex`);
  }
  if (offer['weekIndex'] !== careerWeekIndex) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  } else if (!isSkillBreakthroughCadenceWeek(careerWeekIndex)) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  } else if (
    skillSummary.acquisitionCount > 0 &&
    careerWeekIndex <= skillSummary.lastAcquisitionWeekIndex
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
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
}

function validateAppliedSkillEffects(
  value: unknown,
  aggregates: ValidatedSkillEffectEvidence,
  equippedSkillIds: readonly unknown[],
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
        : type === 'action_body_delta_flat'
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
  };
  for (const key of SKILL_EFFECT_AGGREGATE_KEYS) {
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
  issues: CareerInvariantIssue[],
): ValidatedSkillEffectEvidence {
  const neutral: ValidatedSkillEffectEvidence = {
    xpMultiplierPermille: SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
    bodyCostMultiplierPermille: SKILL_NEUTRAL_MULTIPLIER_PERMILLE,
    bodyDeltaFlat: 0,
    gpaDeltaMilli: 0,
  };
  const stored = strictRecord(
    result['skillEffectAggregates'],
    `${path}.skillEffectAggregates`,
    SKILL_EFFECT_AGGREGATE_KEYS,
    issues,
  );
  if (stored === undefined) {
    validateAppliedSkillEffects(
      result['appliedSkillEffects'],
      neutral,
      equippedSkillIds,
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
  } as const;
  const aggregates = { ...neutral };
  for (const key of SKILL_EFFECT_AGGREGATE_KEYS) {
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

function validateActionResultV2(
  value: unknown,
  path: string,
  expectedActionId: unknown,
  expectedActionIndex: number,
  weekIndex: unknown,
  equippedSkillIds: readonly unknown[],
  issues: CareerInvariantIssue[],
): UnknownRecord | undefined {
  const result = strictRecord(value, path, ACTION_RESULT_KEYS_V2, issues);
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

  const aggregates = validateSkillEffectEvidence(result, path, equippedSkillIds, issues);
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
    }
  }

  const lastResult = results.at(-1);
  const playerRecord = isRecord(player) ? player : undefined;
  const state = isRecord(playerRecord?.['state']) ? playerRecord['state'] : undefined;
  if (lastResult !== undefined && state !== undefined) {
    if (state['body'] !== lastResult['bodyAfter']) {
      issue(issues, 'invariant.invalid_combination', 'career.player.state.body');
    }
    if (state['gpa'] !== lastResult['gpaAfter']) {
      issue(issues, 'invariant.invalid_combination', 'career.player.state.gpa');
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

function validateCareerPhase(
  value: unknown,
  weekIndex: unknown,
  player: unknown,
  schemaVersion: typeof CAREER_SCHEMA_VERSION_V1 | typeof CAREER_SCHEMA_VERSION_V2,
  rngDrawCount: number,
  skillSummary: SkillValidationSummary,
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
  if (type === 'SKILL_BREAKTHROUGH') {
    if (schemaVersion === CAREER_SCHEMA_VERSION_V1) {
      strictRecord(value, 'career.phase', ['type'] as const, issues);
      issue(issues, 'invariant.invalid_value', 'career.phase.type');
      return;
    }
    const phase = strictRecord(value, 'career.phase', ['type', 'offer'] as const, issues);
    if (phase !== undefined && nonNegativeSafeInteger(weekIndex)) {
      validateSkillBreakthroughOffer(phase['offer'], weekIndex, rngDrawCount, skillSummary, issues);
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
        : validateActionResultV2(
            rawResult,
            `career.phase.results.${index}`,
            actionIds?.[index],
            index,
            weekIndex,
            skillSummary.equippedSkillIds,
            issues,
          );
    if (validated !== undefined) {
      validatedResults.push(validated);
    }
  }
  if (validatedResults.length === rawResults.length) {
    validateResultSequenceAgainstPlayer(validatedResults, player, issues);
  }
}

function validatePlayer(
  value: unknown,
  schemaVersion: typeof CAREER_SCHEMA_VERSION_V1 | typeof CAREER_SCHEMA_VERSION_V2,
  careerWeekIndex: number,
  careerRngDrawCount: number,
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
  validateState(player.state, issues);
  validateTagIds(player.tagIds, issues);
  validateTrainingProficiencyUses(player.trainingProficiencyUses, issues);
  return schemaVersion === CAREER_SCHEMA_VERSION_V2
    ? validatePlayerSkillState(player['skillState'], careerWeekIndex, careerRngDrawCount, issues)
    : {
        acquisitionCount: 0,
        lastAcquisitionWeekIndex: 0,
        lastRngDrawCountAfter: 0,
        ownedSkillIds: new Set(),
        equippedSkillIds: [null, null, null, null],
      };
}

function validateCareerRunVersion(
  value: unknown,
  schemaVersion: typeof CAREER_SCHEMA_VERSION_V1 | typeof CAREER_SCHEMA_VERSION_V2,
): CareerInvariantResult {
  const issues: CareerInvariantIssue[] = [];
  const career = strictRecord(
    value,
    'career',
    schemaVersion === CAREER_SCHEMA_VERSION_V1 ? CAREER_KEYS_V1 : CAREER_KEYS_V2,
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
    if (career.programId !== null) {
      issue(issues, 'invariant.invalid_value', 'career.programId');
    }
    if (!Number.isSafeInteger(career.weekIndex) || (career.weekIndex as number) < 0) {
      issue(issues, 'invariant.out_of_bounds', 'career.weekIndex');
    }
    const careerWeekIndex = nonNegativeSafeInteger(career.weekIndex) ? career.weekIndex : 0;
    const careerRngDrawCount = isRngState(career.rng) ? career.rng.drawCount : 0;
    const skillSummary = validatePlayer(
      career.player,
      schemaVersion,
      careerWeekIndex,
      careerRngDrawCount,
      issues,
    );
    const recentWeeklyActionIds =
      schemaVersion === CAREER_SCHEMA_VERSION_V2
        ? validateRecentWeeklyActionIds(career['recentWeeklyActionIds'], issues)
        : undefined;
    if (schemaVersion === CAREER_SCHEMA_VERSION_V2) {
      validateLastPassiveBodyRecovery(career['lastPassiveBodyRecovery'], careerWeekIndex, issues);
    }
    validateCareerPhase(
      career.phase,
      career.weekIndex,
      career.player,
      schemaVersion,
      careerRngDrawCount,
      skillSummary,
      issues,
    );
    if (schemaVersion === CAREER_SCHEMA_VERSION_V2) {
      validateCurrentResultsInRecentHistory(career.phase, recentWeeklyActionIds, issues);
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

export function validateCareerRun(value: unknown): CareerInvariantResult {
  return validateCareerRunV2(value);
}

export function isCareerRunV1(value: unknown): value is CareerRunV1 {
  return validateCareerRunV1(value).ok;
}

export function isCareerRunV2(value: unknown): value is CareerRunV2 {
  return validateCareerRunV2(value).ok;
}

export function isCareerRun(value: unknown): value is CareerRun {
  return validateCareerRun(value).ok;
}
