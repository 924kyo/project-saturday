import { compareCodeUnits } from '../player/order.js';
import {
  isPlayerTagId,
  isPositionId,
  isWrArchetypeId,
  type PlayerTagId,
  type PositionId,
  type WrArchetypeId,
} from '../player/ids.js';
import { deepFreeze } from '../player/immutable.js';
import { RECENT_WEEKLY_ACTION_ID_LIMIT } from '../player/types.js';
import { isRngState, nextInt, restoreRngState, type RngState } from '../random/rng.js';
import { isWeeklyActionDefinitionCatalog } from '../weekly/definition.js';
import { isWeeklyActionId, type WeeklyActionId } from '../weekly/ids.js';
import type { WeeklyActionDefinition } from '../weekly/types.js';
import { isSkillMechanicsDefinitionCatalog } from './definition.js';
import {
  SKILL_BREAKTHROUGH_SOURCE_IDS,
  isSkillBreakthroughSourceId,
  isSkillId,
  type SkillId,
} from './ids.js';
import {
  SKILL_BREAKTHROUGH_OFFER_SIZE,
  type SkillBehaviorAffinityTagId,
  type SkillBreakthroughOffer,
  type SkillBreakthroughProgressEvidence,
  type SkillBreakthroughProgressSource,
  type SkillMechanicsDefinition,
} from './types.js';
import {
  SKILL_BREAKTHROUGH_GAUGE_THRESHOLD,
  SKILL_BREAKTHROUGH_AFFINITY_POINTS_PER_UNIT,
  SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX,
  SKILL_BREAKTHROUGH_PROGRESS_SOURCE_COUNT_MAX,
  SKILL_BREAKTHROUGH_PROGRESS_SOURCE_POINTS_MAX,
  SKILL_OFFER_TOTAL_WEIGHT_MAX,
  isSkillBreakthroughCadenceWeek,
} from './tuning.js';

export const SKILL_OFFER_FAILURE_REASONS = Object.freeze([
  'skill_offer.invalid_input',
  'skill_offer.invalid_skill_definitions',
  'skill_offer.invalid_action_definitions',
  'skill_offer.missing_action_definition',
  'skill_offer.invalid_total_weight',
  'skill_offer.rng_exhausted',
] as const);

export type SkillOfferFailureReason = (typeof SKILL_OFFER_FAILURE_REASONS)[number];

export interface SkillBehaviorAffinityCount {
  readonly affinityTagId: SkillBehaviorAffinityTagId;
  readonly count: number;
}

export interface WeightedSkillOfferCandidate {
  readonly skillId: SkillId;
  readonly weight: number;
}

export interface SkillOfferEligibilityContext {
  readonly positionId: PositionId;
  readonly archetypeId: WrArchetypeId;
  readonly playerTagIds: readonly PlayerTagId[];
  readonly ownedSkillIds: readonly SkillId[];
  readonly weekIndex: number;
  readonly recentWeeklyActionIds: readonly WeeklyActionId[];
}

export interface GenerateSkillBreakthroughOfferInput extends SkillOfferEligibilityContext {
  readonly rng: RngState;
  readonly offerIndex: number;
}

export interface GenerateGaugeSkillBreakthroughOfferInput extends GenerateSkillBreakthroughOfferInput {
  readonly trigger: SkillBreakthroughProgressEvidence;
}

export type DeriveSkillBehaviorAffinityCountsResult =
  | {
      readonly ok: true;
      readonly counts: readonly SkillBehaviorAffinityCount[];
    }
  | { readonly ok: false; readonly reason: SkillOfferFailureReason };

export type DeriveEligibleWeightedSkillOfferPoolResult =
  | {
      readonly ok: true;
      readonly behaviorCounts: readonly SkillBehaviorAffinityCount[];
      readonly candidates: readonly WeightedSkillOfferCandidate[];
    }
  | { readonly ok: false; readonly reason: SkillOfferFailureReason };

export type GenerateSkillBreakthroughOfferResult =
  | {
      readonly ok: true;
      readonly offer: SkillBreakthroughOffer | null;
      readonly nextRng: RngState;
    }
  | { readonly ok: false; readonly reason: SkillOfferFailureReason };

type UnknownRecord = Record<string, unknown>;

const ELIGIBILITY_CONTEXT_KEYS = [
  'positionId',
  'archetypeId',
  'playerTagIds',
  'ownedSkillIds',
  'weekIndex',
  'recentWeeklyActionIds',
] as const;
const GENERATION_INPUT_KEYS = [...ELIGIBILITY_CONTEXT_KEYS, 'rng', 'offerIndex'] as const;
const GAUGE_GENERATION_INPUT_KEYS = [...GENERATION_INPUT_KEYS, 'trigger'] as const;
const GAUGE_TRIGGER_KEYS = [
  'model',
  'weekIndex',
  'progressBefore',
  'pointsEarned',
  'progressAfter',
  'threshold',
  'triggeredOffer',
  'sources',
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: UnknownRecord, expectedKeys: readonly string[]): boolean {
  return (
    Object.keys(value).length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
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

function isGaugeTrigger(
  value: unknown,
  weekIndex: number,
): value is SkillBreakthroughProgressEvidence {
  if (!isRecord(value) || !hasExactKeys(value, GAUGE_TRIGGER_KEYS)) {
    return false;
  }
  if (
    value['model'] !== 'gauge_v1' ||
    value['weekIndex'] !== weekIndex ||
    value['threshold'] !== SKILL_BREAKTHROUGH_GAUGE_THRESHOLD ||
    value['triggeredOffer'] !== true ||
    !Number.isSafeInteger(value['progressBefore']) ||
    (value['progressBefore'] as number) < 0 ||
    (value['progressBefore'] as number) > SKILL_BREAKTHROUGH_GAUGE_THRESHOLD ||
    !Number.isSafeInteger(value['pointsEarned']) ||
    (value['pointsEarned'] as number) < 0 ||
    (value['pointsEarned'] as number) > SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX ||
    !Number.isSafeInteger(value['progressAfter']) ||
    (value['progressAfter'] as number) < 0 ||
    (value['progressAfter'] as number) >= SKILL_BREAKTHROUGH_GAUGE_THRESHOLD ||
    !isDenseArray(value['sources']) ||
    value['sources'].length > SKILL_BREAKTHROUGH_PROGRESS_SOURCE_COUNT_MAX
  ) {
    return false;
  }
  let totalPoints = 0;
  let previousSourceIndex = -1;
  for (const rawSource of value['sources']) {
    if (
      !isRecord(rawSource) ||
      !hasExactKeys(rawSource, ['sourceId', 'points']) ||
      !isSkillBreakthroughSourceId(rawSource['sourceId']) ||
      !Number.isSafeInteger(rawSource['points']) ||
      (rawSource['points'] as number) <= 0 ||
      (rawSource['points'] as number) > SKILL_BREAKTHROUGH_PROGRESS_SOURCE_POINTS_MAX
    ) {
      return false;
    }
    const sourceIndex = SKILL_BREAKTHROUGH_SOURCE_IDS.indexOf(rawSource['sourceId']);
    if (sourceIndex <= previousSourceIndex) {
      return false;
    }
    previousSourceIndex = sourceIndex;
    totalPoints += rawSource['points'] as number;
  }
  return (
    totalPoints === value['pointsEarned'] &&
    (value['progressBefore'] as number) + totalPoints - SKILL_BREAKTHROUGH_GAUGE_THRESHOLD ===
      value['progressAfter']
  );
}

function isUniqueIdArray(
  value: unknown,
  isId: (candidate: unknown) => boolean,
): value is readonly string[] {
  if (!isDenseArray(value)) {
    return false;
  }
  const seen = new Set<string>();
  for (const candidate of value) {
    if (!isId(candidate) || seen.has(candidate as string)) {
      return false;
    }
    seen.add(candidate as string);
  }
  return true;
}

function isRecentWeeklyActionIds(value: unknown): value is readonly WeeklyActionId[] {
  return (
    isDenseArray(value) &&
    value.length <= RECENT_WEEKLY_ACTION_ID_LIMIT &&
    value.every((actionId) => isWeeklyActionId(actionId))
  );
}

function offerFailure(reason: SkillOfferFailureReason): {
  readonly ok: false;
  readonly reason: SkillOfferFailureReason;
} {
  return deepFreeze({ ok: false as const, reason });
}

function isEligibilityContext(value: unknown): value is SkillOfferEligibilityContext {
  if (!isRecord(value) || !hasExactKeys(value, ELIGIBILITY_CONTEXT_KEYS)) {
    return false;
  }
  return (
    isPositionId(value['positionId']) &&
    isWrArchetypeId(value['archetypeId']) &&
    isUniqueIdArray(value['playerTagIds'], isPlayerTagId) &&
    isUniqueIdArray(value['ownedSkillIds'], isSkillId) &&
    Number.isSafeInteger(value['weekIndex']) &&
    (value['weekIndex'] as number) >= 0 &&
    isRecentWeeklyActionIds(value['recentWeeklyActionIds'])
  );
}

/**
 * Counts behavior over the bounded six-action history. Each authored action tag
 * counts once per matching action. Repeats count duplicate occurrences beyond
 * each action ID's first occurrence; varied-actions contributes one when at
 * least three distinct IDs are present; study-then-training counts adjacent
 * Study Hall -> `action_family_training` pairs, including across week borders.
 */
export function deriveSkillBehaviorAffinityCounts(
  recentWeeklyActionIds: readonly WeeklyActionId[],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[],
): DeriveSkillBehaviorAffinityCountsResult {
  if (!isRecentWeeklyActionIds(recentWeeklyActionIds)) {
    return offerFailure('skill_offer.invalid_input');
  }
  if (!isWeeklyActionDefinitionCatalog(weeklyActionDefinitions)) {
    return offerFailure('skill_offer.invalid_action_definitions');
  }

  const definitionsById = new Map(
    weeklyActionDefinitions.map((definition) => [definition.id, definition]),
  );
  const recentDefinitions: WeeklyActionDefinition[] = [];
  for (const actionId of recentWeeklyActionIds) {
    const definition = definitionsById.get(actionId);
    if (definition === undefined) {
      return offerFailure('skill_offer.missing_action_definition');
    }
    recentDefinitions.push(definition);
  }

  const counts = new Map<SkillBehaviorAffinityTagId, number>();
  const increment = (affinityTagId: SkillBehaviorAffinityTagId, amount = 1): void => {
    counts.set(affinityTagId, (counts.get(affinityTagId) ?? 0) + amount);
  };
  for (const definition of recentDefinitions) {
    for (const tagId of definition.tagIds) {
      increment(tagId);
    }
  }

  const distinctActionCount = new Set(recentWeeklyActionIds).size;
  const repeatCount = recentWeeklyActionIds.length - distinctActionCount;
  if (repeatCount > 0) {
    increment('behavior_repeat_action', repeatCount);
  }
  if (distinctActionCount >= 3) {
    increment('behavior_varied_actions');
  }
  for (let index = 0; index + 1 < recentDefinitions.length; index += 1) {
    if (
      recentWeeklyActionIds[index] === 'action_study_hall' &&
      recentDefinitions[index + 1]?.tagIds.some((tagId) => tagId === 'action_family_training')
    ) {
      increment('behavior_study_then_training');
    }
  }

  const derivedCounts = [...counts.entries()]
    .map(([affinityTagId, count]) => ({ affinityTagId, count }))
    .sort((left, right) => compareCodeUnits(left.affinityTagId, right.affinityTagId));
  return deepFreeze({ ok: true, counts: derivedCounts });
}

function isEligible(
  definition: SkillMechanicsDefinition,
  context: SkillOfferEligibilityContext,
  ownedSkillIds: ReadonlySet<SkillId>,
): boolean {
  const { eligibility } = definition;
  const playerTagIds = new Set(context.playerTagIds);
  return (
    !ownedSkillIds.has(definition.id) &&
    (eligibility.positionIds.length === 0 ||
      eligibility.positionIds.some((positionId) => positionId === context.positionId)) &&
    (eligibility.archetypeIds.length === 0 ||
      eligibility.archetypeIds.some((archetypeId) => archetypeId === context.archetypeId)) &&
    eligibility.requiredPlayerTagIds.every((tagId) => playerTagIds.has(tagId)) &&
    eligibility.excludedPlayerTagIds.every((tagId) => !playerTagIds.has(tagId)) &&
    eligibility.minWeekIndex <= context.weekIndex
  );
}

export function deriveEligibleWeightedSkillOfferPool(
  context: SkillOfferEligibilityContext,
  skillDefinitions: readonly SkillMechanicsDefinition[],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[],
  breakthroughSources: readonly SkillBreakthroughProgressSource[] = [],
): DeriveEligibleWeightedSkillOfferPoolResult {
  if (!isEligibilityContext(context)) {
    return offerFailure('skill_offer.invalid_input');
  }
  if (!isSkillMechanicsDefinitionCatalog(skillDefinitions)) {
    return offerFailure('skill_offer.invalid_skill_definitions');
  }
  if (!isWeeklyActionDefinitionCatalog(weeklyActionDefinitions)) {
    return offerFailure('skill_offer.invalid_action_definitions');
  }
  if (
    !isDenseArray(breakthroughSources) ||
    breakthroughSources.length > SKILL_BREAKTHROUGH_PROGRESS_SOURCE_COUNT_MAX ||
    breakthroughSources.some(
      (source) =>
        !isRecord(source) ||
        !hasExactKeys(source, ['sourceId', 'points']) ||
        !isSkillBreakthroughSourceId(source['sourceId']) ||
        !Number.isSafeInteger(source['points']) ||
        (source['points'] as number) <= 0 ||
        (source['points'] as number) > SKILL_BREAKTHROUGH_PROGRESS_SOURCE_POINTS_MAX,
    )
  ) {
    return offerFailure('skill_offer.invalid_input');
  }
  if (skillDefinitions.length === 0 && weeklyActionDefinitions.length === 0) {
    return deepFreeze({ ok: true, behaviorCounts: [], candidates: [] });
  }
  if (skillDefinitions.length === 0) {
    return offerFailure('skill_offer.invalid_skill_definitions');
  }
  if (weeklyActionDefinitions.length === 0) {
    return offerFailure('skill_offer.invalid_action_definitions');
  }
  const behaviorResult = deriveSkillBehaviorAffinityCounts(
    context.recentWeeklyActionIds,
    weeklyActionDefinitions,
  );
  if (!behaviorResult.ok) {
    return behaviorResult;
  }

  const behaviorCountById = new Map(
    behaviorResult.counts.map(({ affinityTagId, count }) => [affinityTagId, count]),
  );
  for (const { sourceId, points } of breakthroughSources) {
    const affinityUnits = Math.ceil(points / SKILL_BREAKTHROUGH_AFFINITY_POINTS_PER_UNIT);
    behaviorCountById.set(sourceId, (behaviorCountById.get(sourceId) ?? 0) + affinityUnits);
  }
  const ownedSkillIds = new Set(context.ownedSkillIds);
  const candidates: WeightedSkillOfferCandidate[] = [];
  let totalWeight = 0;
  const canonicalDefinitions = [...skillDefinitions].sort((left, right) =>
    compareCodeUnits(left.id, right.id),
  );
  for (const definition of canonicalDefinitions) {
    if (!isEligible(definition, context, ownedSkillIds)) {
      continue;
    }
    let weight = definition.baseOfferWeight;
    for (const rule of definition.behaviorWeightRules) {
      weight += rule.weightBonus * (behaviorCountById.get(rule.affinityTagId) ?? 0);
    }
    if (!Number.isSafeInteger(weight) || weight <= 0) {
      return offerFailure('skill_offer.invalid_total_weight');
    }
    totalWeight += weight;
    if (!Number.isSafeInteger(totalWeight) || totalWeight > SKILL_OFFER_TOTAL_WEIGHT_MAX) {
      return offerFailure('skill_offer.invalid_total_weight');
    }
    candidates.push({ skillId: definition.id, weight });
  }
  return deepFreeze({
    ok: true,
    behaviorCounts: behaviorResult.counts,
    candidates,
  });
}

/** Internal shared sampler; owning offer generators validate the canonical weighted pool. */
export function sampleOfferIds(
  rng: RngState,
  candidates: readonly WeightedSkillOfferCandidate[],
):
  | {
      readonly ok: true;
      readonly offeredSkillIds: readonly [SkillId, SkillId, SkillId];
      readonly nextRng: RngState;
    }
  | {
      readonly ok: false;
      readonly reason: 'skill_offer.invalid_total_weight' | 'skill_offer.rng_exhausted';
    } {
  const remaining = candidates.map((candidate) => ({ ...candidate }));
  const selected: SkillId[] = [];
  let currentRng = restoreRngState(rng);
  try {
    while (selected.length < SKILL_BREAKTHROUGH_OFFER_SIZE) {
      const totalWeight = remaining.reduce((total, candidate) => total + candidate.weight, 0);
      const sample = nextInt(currentRng, 0, totalWeight);
      currentRng = sample.nextRng;
      let cumulativeWeight = 0;
      const selectedIndex = remaining.findIndex(({ weight }) => {
        cumulativeWeight += weight;
        return sample.value < cumulativeWeight;
      });
      if (selectedIndex < 0) {
        return { ok: false, reason: 'skill_offer.invalid_total_weight' };
      }
      const [candidate] = remaining.splice(selectedIndex, 1);
      if (candidate === undefined) {
        return { ok: false, reason: 'skill_offer.invalid_total_weight' };
      }
      selected.push(candidate.skillId);
    }
  } catch (error) {
    if (error instanceof RangeError) {
      return { ok: false, reason: 'skill_offer.rng_exhausted' };
    }
    throw error;
  }
  return {
    ok: true,
    offeredSkillIds: [selected[0] as SkillId, selected[1] as SkillId, selected[2] as SkillId],
    nextRng: currentRng,
  };
}

export function generateSkillBreakthroughOffer(
  input: GenerateSkillBreakthroughOfferInput,
  skillDefinitions: readonly SkillMechanicsDefinition[],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[],
): GenerateSkillBreakthroughOfferResult {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, GENERATION_INPUT_KEYS) ||
    !isEligibilityContext({
      positionId: input['positionId'],
      archetypeId: input['archetypeId'],
      playerTagIds: input['playerTagIds'],
      ownedSkillIds: input['ownedSkillIds'],
      weekIndex: input['weekIndex'],
      recentWeeklyActionIds: input['recentWeeklyActionIds'],
    }) ||
    !isRngState(input['rng']) ||
    !Number.isSafeInteger(input['offerIndex']) ||
    (input['offerIndex'] as number) < 0 ||
    input['offerIndex'] !== input['ownedSkillIds'].length ||
    !isSkillBreakthroughCadenceWeek(input['weekIndex'] as number)
  ) {
    return offerFailure('skill_offer.invalid_input');
  }
  if (!isSkillMechanicsDefinitionCatalog(skillDefinitions)) {
    return offerFailure('skill_offer.invalid_skill_definitions');
  }
  if (!isWeeklyActionDefinitionCatalog(weeklyActionDefinitions)) {
    return offerFailure('skill_offer.invalid_action_definitions');
  }
  const sourceRng = restoreRngState(input.rng);
  if (skillDefinitions.length === 0 && weeklyActionDefinitions.length === 0) {
    return deepFreeze({ ok: true, offer: null, nextRng: sourceRng });
  }
  if (skillDefinitions.length === 0) {
    return offerFailure('skill_offer.invalid_skill_definitions');
  }
  if (weeklyActionDefinitions.length === 0) {
    return offerFailure('skill_offer.invalid_action_definitions');
  }

  const pool = deriveEligibleWeightedSkillOfferPool(
    {
      positionId: input.positionId,
      archetypeId: input.archetypeId,
      playerTagIds: input.playerTagIds,
      ownedSkillIds: input.ownedSkillIds,
      weekIndex: input.weekIndex,
      recentWeeklyActionIds: input.recentWeeklyActionIds,
    },
    skillDefinitions,
    weeklyActionDefinitions,
  );
  if (!pool.ok) {
    return pool;
  }
  if (pool.candidates.length < SKILL_BREAKTHROUGH_OFFER_SIZE) {
    return deepFreeze({ ok: true, offer: null, nextRng: sourceRng });
  }

  const sampled = sampleOfferIds(sourceRng, pool.candidates);
  if (!sampled.ok) {
    return offerFailure(sampled.reason);
  }
  return deepFreeze({
    ok: true,
    offer: {
      offerIndex: input.offerIndex,
      weekIndex: input.weekIndex,
      offeredSkillIds: sampled.offeredSkillIds,
      rngDrawCountBefore: sourceRng.drawCount,
      rngDrawCountAfter: sampled.nextRng.drawCount,
    },
    nextRng: sampled.nextRng,
  });
}

/** Generates a current-v4 offer only from persisted threshold-crossing evidence. */
export function generateGaugeSkillBreakthroughOffer(
  input: GenerateGaugeSkillBreakthroughOfferInput,
  skillDefinitions: readonly SkillMechanicsDefinition[],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[],
): GenerateSkillBreakthroughOfferResult {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, GAUGE_GENERATION_INPUT_KEYS) ||
    !isEligibilityContext({
      positionId: input['positionId'],
      archetypeId: input['archetypeId'],
      playerTagIds: input['playerTagIds'],
      ownedSkillIds: input['ownedSkillIds'],
      weekIndex: input['weekIndex'],
      recentWeeklyActionIds: input['recentWeeklyActionIds'],
    }) ||
    !isRngState(input['rng']) ||
    !Number.isSafeInteger(input['offerIndex']) ||
    (input['offerIndex'] as number) < 0 ||
    input['offerIndex'] !== input['ownedSkillIds'].length ||
    !isGaugeTrigger(input['trigger'], input['weekIndex'] as number)
  ) {
    return offerFailure('skill_offer.invalid_input');
  }
  if (!isSkillMechanicsDefinitionCatalog(skillDefinitions)) {
    return offerFailure('skill_offer.invalid_skill_definitions');
  }
  if (!isWeeklyActionDefinitionCatalog(weeklyActionDefinitions)) {
    return offerFailure('skill_offer.invalid_action_definitions');
  }
  const sourceRng = restoreRngState(input.rng);
  if (skillDefinitions.length === 0 && weeklyActionDefinitions.length === 0) {
    return deepFreeze({ ok: true, offer: null, nextRng: sourceRng });
  }
  if (skillDefinitions.length === 0) {
    return offerFailure('skill_offer.invalid_skill_definitions');
  }
  if (weeklyActionDefinitions.length === 0) {
    return offerFailure('skill_offer.invalid_action_definitions');
  }
  const pool = deriveEligibleWeightedSkillOfferPool(
    {
      positionId: input.positionId,
      archetypeId: input.archetypeId,
      playerTagIds: input.playerTagIds,
      ownedSkillIds: input.ownedSkillIds,
      weekIndex: input.weekIndex,
      recentWeeklyActionIds: input.recentWeeklyActionIds,
    },
    skillDefinitions,
    weeklyActionDefinitions,
    input.trigger.sources,
  );
  if (!pool.ok) {
    return pool;
  }
  if (pool.candidates.length < SKILL_BREAKTHROUGH_OFFER_SIZE) {
    return deepFreeze({ ok: true, offer: null, nextRng: sourceRng });
  }
  const sampled = sampleOfferIds(sourceRng, pool.candidates);
  if (!sampled.ok) {
    return offerFailure(sampled.reason);
  }
  return deepFreeze({
    ok: true,
    offer: {
      offerIndex: input.offerIndex,
      weekIndex: input.weekIndex,
      offeredSkillIds: sampled.offeredSkillIds,
      rngDrawCountBefore: sourceRng.drawCount,
      rngDrawCountAfter: sampled.nextRng.drawCount,
      trigger: {
        ...input.trigger,
        sources: input.trigger.sources.map((source) => ({ ...source })),
      },
    },
    nextRng: sampled.nextRng,
  });
}
