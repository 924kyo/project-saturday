import { BODY_BOUNDS, isIntegerWithinBounds } from '../player/bounds.js';

export const WEEKLY_ACTION_PLAN_SIZE = 3 as const;
export const ATTRIBUTE_XP_PER_RATING = 100 as const;

/** Widened for Career VNext development pacing; shipped catalogs stay within their authored 50. */
export const WEEKLY_ACTION_BASE_XP_BOUNDS = Object.freeze({ min: 1, max: 100 });
export const WEEKLY_ACTION_ATTRIBUTE_TARGET_MAX = 3 as const;
export const WEEKLY_ACTION_TAG_ID_MAX = 8 as const;
export const WEEKLY_ACTION_BODY_DELTA_BOUNDS = Object.freeze({ min: -40, max: 40 });
export const WEEKLY_ACTION_GPA_DELTA_BOUNDS = Object.freeze({ min: -0.5, max: 0.5 });
export const WEEKLY_ACTION_PREPARATION_DELTA_BOUNDS = Object.freeze({ min: -25, max: 25 });
export const WEEKLY_ACTION_CONFIDENCE_DELTA_BOUNDS = Object.freeze({ min: -25, max: 25 });
export const PASSIVE_BODY_RECOVERY_BOUNDS = Object.freeze({ min: 0, max: 100 });
export const PREPARATION_ROLLOVER_NEUTRAL = 50 as const;
export const PREPARATION_ROLLOVER_RETENTION_PERMILLE = 500 as const;

export const TRAINING_PROFICIENCY_LEVEL_COUNT = 6 as const;
export const TRAINING_PROFICIENCY_LEVEL_BOUNDS = Object.freeze({ min: 0, max: 5 });
export const TRAINING_PROFICIENCY_USE_HARD_CAP = 1_000_000 as const;
export const BODY_XP_EFFICIENCY_PERMILLE_BOUNDS = Object.freeze({ min: 0, max: 1000 });
export const TRAINING_PROFICIENCY_XP_MULTIPLIER_PERMILLE_BOUNDS = Object.freeze({
  min: 1000,
  max: 5000,
});

export type TrainingProficiencyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface DevelopmentWeekConfig {
  readonly passiveBodyRecovery: number;
  readonly bodyXpEfficiencyMinPermille: number;
  readonly bodyXpEfficiencyPerBodyPoint: number;
  readonly proficiencyUseThresholds: readonly [number, number, number, number, number, number];
  readonly proficiencyXpMultipliersPermille: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDenseTuple(value: unknown, length: number): value is readonly unknown[] {
  if (!Array.isArray(value) || value.length !== length) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      return false;
    }
  }
  return true;
}

export function isDevelopmentWeekConfig(value: unknown): value is DevelopmentWeekConfig {
  if (!isRecord(value)) {
    return false;
  }
  const expectedKeys = [
    'passiveBodyRecovery',
    'bodyXpEfficiencyMinPermille',
    'bodyXpEfficiencyPerBodyPoint',
    'proficiencyUseThresholds',
    'proficiencyXpMultipliersPermille',
  ];
  if (
    Object.keys(value).length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(value, key)) ||
    !isIntegerWithinBounds(value['passiveBodyRecovery'], PASSIVE_BODY_RECOVERY_BOUNDS) ||
    !isIntegerWithinBounds(
      value['bodyXpEfficiencyMinPermille'],
      BODY_XP_EFFICIENCY_PERMILLE_BOUNDS,
    ) ||
    !Number.isInteger(value['bodyXpEfficiencyPerBodyPoint']) ||
    (value['bodyXpEfficiencyPerBodyPoint'] as number) < 0 ||
    !isDenseTuple(value['proficiencyUseThresholds'], TRAINING_PROFICIENCY_LEVEL_COUNT) ||
    !isDenseTuple(value['proficiencyXpMultipliersPermille'], TRAINING_PROFICIENCY_LEVEL_COUNT)
  ) {
    return false;
  }

  const maximumBodyEfficiency =
    (value['bodyXpEfficiencyMinPermille'] as number) +
    (value['bodyXpEfficiencyPerBodyPoint'] as number) * BODY_BOUNDS.max;
  if (maximumBodyEfficiency > BODY_XP_EFFICIENCY_PERMILLE_BOUNDS.max) {
    return false;
  }

  const thresholds = value['proficiencyUseThresholds'];
  if (
    thresholds[0] !== 0 ||
    thresholds.some(
      (threshold, index) =>
        !Number.isInteger(threshold) ||
        (threshold as number) < 0 ||
        (threshold as number) > TRAINING_PROFICIENCY_USE_HARD_CAP ||
        (index > 0 && (threshold as number) <= (thresholds[index - 1] as number)),
    )
  ) {
    return false;
  }

  const multipliers = value['proficiencyXpMultipliersPermille'];
  if (
    multipliers[0] !== TRAINING_PROFICIENCY_XP_MULTIPLIER_PERMILLE_BOUNDS.min ||
    multipliers.some(
      (multiplier, index) =>
        !isIntegerWithinBounds(multiplier, TRAINING_PROFICIENCY_XP_MULTIPLIER_PERMILLE_BOUNDS) ||
        (index > 0 && (multiplier as number) <= (multipliers[index - 1] as number)),
    )
  ) {
    return false;
  }
  let previousIncrement = Number.POSITIVE_INFINITY;
  for (let index = 1; index < multipliers.length; index += 1) {
    const increment = (multipliers[index] as number) - (multipliers[index - 1] as number);
    if (increment <= 0 || increment >= previousIncrement) {
      return false;
    }
    previousIncrement = increment;
  }
  return true;
}

export function deriveBodyXpEfficiencyPermille(
  body: number,
  config: DevelopmentWeekConfig,
): number {
  if (!isIntegerWithinBounds(body, BODY_BOUNDS) || !isDevelopmentWeekConfig(config)) {
    throw new RangeError('Body efficiency requires bounded Body and valid development tuning.');
  }
  return config.bodyXpEfficiencyMinPermille + body * config.bodyXpEfficiencyPerBodyPoint;
}

export function deriveTrainingProficiencyLevel(
  uses: number,
  config: DevelopmentWeekConfig,
): TrainingProficiencyLevel {
  if (
    !Number.isInteger(uses) ||
    uses < 0 ||
    uses > TRAINING_PROFICIENCY_USE_HARD_CAP ||
    !isDevelopmentWeekConfig(config)
  ) {
    throw new RangeError('Proficiency level requires bounded uses and valid development tuning.');
  }

  for (let level = TRAINING_PROFICIENCY_LEVEL_COUNT - 1; level >= 0; level -= 1) {
    if (uses >= (config.proficiencyUseThresholds[level] ?? 0)) {
      return level as TrainingProficiencyLevel;
    }
  }
  return 0;
}

export function getTrainingProficiencyXpMultiplierPermille(
  level: TrainingProficiencyLevel,
  config: DevelopmentWeekConfig,
): number {
  if (
    !isIntegerWithinBounds(level, TRAINING_PROFICIENCY_LEVEL_BOUNDS) ||
    !isDevelopmentWeekConfig(config)
  ) {
    throw new RangeError('Proficiency multiplier requires valid development tuning.');
  }
  return config.proficiencyXpMultipliersPermille[level];
}

export function getTrainingProficiencyUseCap(config: DevelopmentWeekConfig): number {
  if (!isDevelopmentWeekConfig(config)) {
    throw new RangeError('Proficiency cap requires valid development tuning.');
  }
  return config.proficiencyUseThresholds[TRAINING_PROFICIENCY_LEVEL_COUNT - 1] as number;
}

/** Retains half of the prior week's deviation from neutral without consuming RNG. */
export function deriveNextWeekPreparation(preparation: number): number {
  if (!Number.isInteger(preparation) || preparation < 0 || preparation > 100) {
    throw new RangeError('Preparation rollover requires a bounded integer.');
  }
  return (
    PREPARATION_ROLLOVER_NEUTRAL +
    Math.round(
      ((preparation - PREPARATION_ROLLOVER_NEUTRAL) * PREPARATION_ROLLOVER_RETENTION_PERMILLE) /
        1_000,
    )
  );
}
