import { BODY_BOUNDS, GPA_BOUNDS } from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { restoreRngState } from '../random/rng.js';
import {
  MENTAL_ATTRIBUTE_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  type MentalAttributeId,
  type PhysicalAttributeId,
  type PlayerAttributeId,
  type WrAttributeId,
} from '../player/ids.js';
import type {
  AttributeProgress,
  CareerRun,
  PlayerState,
  WrPlayer,
  WrPlayerAttributes,
} from '../player/types.js';
import { RECENT_WEEKLY_ACTION_ID_LIMIT } from '../player/types.js';
import { validateCareerRun } from '../player/validation.js';
import {
  collectWeeklySkillEffects,
  derivePassiveBodyRecovery,
  deriveSkillModifiedBodyDelta,
  deriveSkillModifiedGpaDelta,
  type CollectWeeklySkillEffectsResult,
} from '../skills/effects.js';
import { isSkillMechanicsDefinitionCatalog } from '../skills/definition.js';
import type { SkillMechanicsDefinition } from '../skills/types.js';
import { generateSkillBreakthroughOffer } from '../skills/offers.js';
import { deriveOwnedSkillIds } from '../skills/state.js';
import { isSkillBreakthroughCadenceWeek } from '../skills/tuning.js';
import { isWeeklyActionDefinition, isWeeklyActionDefinitionCatalog } from './definition.js';
import {
  WEEKLY_ACTION_EFFECT_IDS,
  isWeeklyActionId,
  type TrainingProficiencyId,
  type WeeklyActionEffectId,
  type WeeklyActionId,
  type WeeklyCommandFailureReason,
} from './ids.js';
import {
  ATTRIBUTE_XP_PER_RATING,
  WEEKLY_ACTION_PLAN_SIZE,
  deriveBodyXpEfficiencyPermille,
  deriveTrainingProficiencyLevel,
  getTrainingProficiencyUseCap,
  getTrainingProficiencyXpMultiplierPermille,
  isDevelopmentWeekConfig,
  type DevelopmentWeekConfig,
} from './tuning.js';
import type {
  TrainingProficiencyUses,
  WeeklyActionDefinition,
  WeeklyActionResult,
  WeeklyAttributeXpResult,
  WeeklyProficiencyResult,
} from './types.js';

export type WeeklyCommandResult =
  | { readonly ok: true; readonly career: CareerRun }
  | {
      readonly ok: false;
      readonly career: CareerRun;
      readonly reason: WeeklyCommandFailureReason;
    };

type DeepMutable<T> = T extends object ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> } : T;
type MutableAttributes = DeepMutable<WrPlayerAttributes>;
type MutableProficiencyUses = DeepMutable<TrainingProficiencyUses>;

function failure(career: CareerRun, reason: WeeklyCommandFailureReason): WeeklyCommandResult {
  return Object.freeze({ ok: false, career, reason });
}

function skillRegistryFailure(
  career: CareerRun,
  result: Extract<CollectWeeklySkillEffectsResult, { readonly ok: false }>,
): WeeklyCommandResult {
  return failure(
    career,
    result.reason === 'skill_registry.invalid_definitions'
      ? 'weekly.invalid_skill_definitions'
      : result.reason === 'skill_registry.missing_equipped_definition'
        ? 'weekly.missing_equipped_skill_definition'
        : 'weekly.internal_invariant_failure',
  );
}

function success(previousCareer: CareerRun, nextCareer: CareerRun): WeeklyCommandResult {
  if (!validateCareerRun(nextCareer).ok) {
    return failure(previousCareer, 'weekly.internal_invariant_failure');
  }
  return deepFreeze({ ok: true, career: nextCareer });
}

function canIncrementRevision(career: CareerRun): boolean {
  return career.revision < Number.MAX_SAFE_INTEGER;
}

function isDenseWeeklyActionArray(value: unknown): value is readonly WeeklyActionId[] {
  if (!Array.isArray(value)) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index) || !isWeeklyActionId(value[index])) {
      return false;
    }
  }
  return true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasId<TId extends string>(ids: readonly TId[], value: string): value is TId {
  return ids.some((id) => id === value);
}

function readAttribute(
  attributes: WrPlayerAttributes | MutableAttributes,
  attributeId: PlayerAttributeId,
): AttributeProgress {
  if (hasId(PHYSICAL_ATTRIBUTE_IDS, attributeId)) {
    return attributes.physical[attributeId];
  }
  if (hasId(MENTAL_ATTRIBUTE_IDS, attributeId)) {
    return attributes.mental[attributeId];
  }
  return attributes.wr[attributeId];
}

function writeAttribute(
  attributes: MutableAttributes,
  attributeId: PlayerAttributeId,
  progress: AttributeProgress,
): void {
  if (hasId(PHYSICAL_ATTRIBUTE_IDS, attributeId)) {
    attributes.physical[attributeId as PhysicalAttributeId] = { ...progress };
    return;
  }
  if (hasId(MENTAL_ATTRIBUTE_IDS, attributeId)) {
    attributes.mental[attributeId as MentalAttributeId] = { ...progress };
    return;
  }
  attributes.wr[attributeId as WrAttributeId] = { ...progress };
}

function applyAttributeXp(
  progress: AttributeProgress,
  baseXp: number,
  bodyXpEfficiencyPermille: number,
  proficiencyXpMultiplierPermille: number,
  skillXpMultiplierPermille: number,
  attributeId: PlayerAttributeId,
): WeeklyAttributeXpResult {
  const awardedXp = Math.floor(
    (baseXp *
      bodyXpEfficiencyPermille *
      proficiencyXpMultiplierPermille *
      skillXpMultiplierPermille) /
      1_000_000_000,
  );
  const xpCapacity =
    progress.rating >= 100 ? 0 : (100 - progress.rating) * ATTRIBUTE_XP_PER_RATING - progress.xp;
  const appliedXp = Math.min(awardedXp, xpCapacity);
  const totalXp = progress.xp + appliedXp;
  const ratingAfter = Math.min(
    100,
    progress.rating + Math.floor(totalXp / ATTRIBUTE_XP_PER_RATING),
  );
  const xpAfter = ratingAfter === 100 ? 0 : totalXp % ATTRIBUTE_XP_PER_RATING;

  return {
    attributeId,
    baseXp,
    awardedXp,
    appliedXp,
    ratingBefore: progress.rating,
    xpBefore: progress.xp,
    ratingAfter,
    xpAfter,
  };
}

function createProficiencyResult(
  proficiencyUses: MutableProficiencyUses,
  proficiencyId: TrainingProficiencyId,
  config: DevelopmentWeekConfig,
): WeeklyProficiencyResult {
  const usesBefore = proficiencyUses[proficiencyId];
  const configUseCap = getTrainingProficiencyUseCap(config);
  const usesAfter = usesBefore >= configUseCap ? usesBefore : usesBefore + 1;
  const levelBefore = deriveTrainingProficiencyLevel(usesBefore, config);
  const levelAfter = deriveTrainingProficiencyLevel(usesAfter, config);
  const xpMultiplierPermille = getTrainingProficiencyXpMultiplierPermille(levelBefore, config);
  proficiencyUses[proficiencyId] = usesAfter;
  return {
    proficiencyId,
    usesBefore,
    usesAfter,
    levelBefore,
    levelAfter,
    xpMultiplierPermille,
  };
}

function effectIdsForResult(
  definition: WeeklyActionDefinition,
  requestedBodyDelta: number,
  requestedGpaDelta: number,
): readonly WeeklyActionEffectId[] {
  const applicable = new Set<WeeklyActionEffectId>();
  if (definition.attributeXp.length > 0) {
    applicable.add('effect_attribute_progress');
  }
  if (requestedBodyDelta !== 0) {
    applicable.add('effect_body_change');
  }
  if (requestedGpaDelta !== 0) {
    applicable.add('effect_gpa_change');
  }
  if (definition.proficiencyId !== null) {
    applicable.add('effect_proficiency_progress');
  }
  return WEEKLY_ACTION_EFFECT_IDS.filter((effectId) => applicable.has(effectId));
}

function resolveDefinition(
  career: CareerRun,
  definition: WeeklyActionDefinition,
  config: DevelopmentWeekConfig,
  skillEffects: Extract<CollectWeeklySkillEffectsResult, { readonly ok: true }>,
): {
  readonly player: WrPlayer;
  readonly result: WeeklyActionResult;
} {
  const phase = career.phase;
  if (phase.type !== 'RESOLVE_ACTIONS') {
    throw new TypeError('resolveDefinition requires a RESOLVE_ACTIONS career.');
  }

  const attributes = cloneSerializable(career.player.attributes) as MutableAttributes;
  const proficiencyUses = cloneSerializable(
    career.player.trainingProficiencyUses,
  ) as MutableProficiencyUses;
  const bodyBefore = career.player.state.body;
  const gpaBefore = career.player.state.gpa;
  const bodyXpEfficiencyPermille = deriveBodyXpEfficiencyPermille(bodyBefore, config);
  const proficiency =
    definition.proficiencyId === null
      ? null
      : createProficiencyResult(proficiencyUses, definition.proficiencyId, config);
  const proficiencyXpMultiplierPermille = proficiency?.xpMultiplierPermille ?? 1000;
  const attributeXp = definition.attributeXp.map((entry) => {
    const before = readAttribute(attributes, entry.attributeId);
    const xpResult = applyAttributeXp(
      before,
      entry.baseXp,
      bodyXpEfficiencyPermille,
      proficiencyXpMultiplierPermille,
      skillEffects.aggregates.xpMultiplierPermille,
      entry.attributeId,
    );
    writeAttribute(attributes, entry.attributeId, {
      rating: xpResult.ratingAfter,
      xp: xpResult.xpAfter,
    });
    return xpResult;
  });

  const baseBodyDelta = definition.bodyDelta;
  const requestedBodyDelta = deriveSkillModifiedBodyDelta(baseBodyDelta, skillEffects.aggregates);
  const bodyAfter = clamp(bodyBefore + requestedBodyDelta, BODY_BOUNDS.min, BODY_BOUNDS.max);
  const baseGpaDelta = definition.gpaDelta;
  const requestedGpaDelta = deriveSkillModifiedGpaDelta(baseGpaDelta, skillEffects.aggregates);
  const gpaAfter = clamp(
    roundToTwoDecimals(gpaBefore + requestedGpaDelta),
    GPA_BOUNDS.min,
    GPA_BOUNDS.max,
  );
  const state: PlayerState = {
    ...career.player.state,
    body: bodyAfter,
    gpa: gpaAfter,
  };
  const result: WeeklyActionResult = {
    actionId: definition.id,
    actionIndex: phase.nextActionIndex,
    weekIndex: career.weekIndex,
    effectIds: effectIdsForResult(definition, requestedBodyDelta, requestedGpaDelta),
    bodyBefore,
    baseBodyDelta,
    requestedBodyDelta,
    actualBodyDelta: bodyAfter - bodyBefore,
    bodyAfter,
    bodyXpEfficiencyPermille,
    gpaBefore,
    baseGpaDelta,
    requestedGpaDelta,
    actualGpaDelta: roundToTwoDecimals(gpaAfter - gpaBefore),
    gpaAfter,
    attributeXp,
    proficiency,
    skillEffectAggregates: skillEffects.aggregates,
    appliedSkillEffects: skillEffects.appliedSkillEffects,
  };

  return {
    player: {
      ...cloneSerializable(career.player),
      attributes,
      state,
      trainingProficiencyUses: proficiencyUses,
    },
    result,
  };
}

export function commitWeeklyActionPlan(
  career: CareerRun,
  actionIds: readonly WeeklyActionId[],
  availableActionIds: readonly WeeklyActionId[],
): WeeklyCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(career, 'weekly.invalid_career');
  }
  if (!canIncrementRevision(career)) {
    return failure(career, 'weekly.revision_exhausted');
  }
  if (career.phase.type !== 'PLAN_ACTIONS') {
    return failure(career, 'weekly.invalid_phase');
  }
  if (!isDenseWeeklyActionArray(actionIds) || actionIds.length !== WEEKLY_ACTION_PLAN_SIZE) {
    return failure(
      career,
      Array.isArray(actionIds) && actionIds.length !== WEEKLY_ACTION_PLAN_SIZE
        ? 'weekly.invalid_plan_length'
        : 'weekly.invalid_action_id',
    );
  }
  if (!isDenseWeeklyActionArray(availableActionIds)) {
    return failure(career, 'weekly.invalid_available_actions');
  }
  if (
    actionIds.some((actionId) => !availableActionIds.some((available) => available === actionId))
  ) {
    return failure(career, 'weekly.action_unavailable');
  }

  const cloned = cloneSerializable(career);
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    phase: {
      type: 'RESOLVE_ACTIONS',
      actionIds: [
        actionIds[0] as WeeklyActionId,
        actionIds[1] as WeeklyActionId,
        actionIds[2] as WeeklyActionId,
      ],
      nextActionIndex: 0,
      results: [],
    },
  };
  return success(career, nextCareer);
}

export function resolveNextWeeklyAction(
  career: CareerRun,
  definition: WeeklyActionDefinition,
  config: DevelopmentWeekConfig,
  skillDefinitions: readonly SkillMechanicsDefinition[] = [],
): WeeklyCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(career, 'weekly.invalid_career');
  }
  if (!canIncrementRevision(career)) {
    return failure(career, 'weekly.revision_exhausted');
  }
  if (career.phase.type !== 'RESOLVE_ACTIONS') {
    return failure(career, 'weekly.invalid_phase');
  }
  if (!isDevelopmentWeekConfig(config)) {
    return failure(career, 'weekly.invalid_development_config');
  }
  if (!isWeeklyActionDefinition(definition)) {
    return failure(career, 'weekly.invalid_action_definition');
  }
  const queuedActionId = career.phase.actionIds[career.phase.nextActionIndex];
  if (definition.id !== queuedActionId) {
    return failure(career, 'weekly.action_definition_mismatch');
  }

  const skillEffects = collectWeeklySkillEffects(
    career.player.skillState,
    skillDefinitions,
    definition,
    {
      body: career.player.state.body,
      actionId: definition.id,
      actionIndex: career.phase.nextActionIndex,
      planActionIds: career.phase.actionIds,
      previousActionId: career.phase.results.at(-1)?.actionId ?? null,
    },
  );
  if (!skillEffects.ok) {
    return skillRegistryFailure(career, skillEffects);
  }

  const resolved = resolveDefinition(career, definition, config, skillEffects);
  const results = [...career.phase.results.map(cloneSerializable), resolved.result];
  const cloned = cloneSerializable(career);
  const phase =
    results.length === WEEKLY_ACTION_PLAN_SIZE
      ? {
          type: 'WEEK_END' as const,
          results: [
            results[0] as WeeklyActionResult,
            results[1] as WeeklyActionResult,
            results[2] as WeeklyActionResult,
          ] as const,
        }
      : {
          type: 'RESOLVE_ACTIONS' as const,
          actionIds: [...career.phase.actionIds] as [
            WeeklyActionId,
            WeeklyActionId,
            WeeklyActionId,
          ],
          nextActionIndex: results.length as 1 | 2,
          results,
        };
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    recentWeeklyActionIds: [
      ...career.recentWeeklyActionIds.slice(-(RECENT_WEEKLY_ACTION_ID_LIMIT - 1)),
      definition.id,
    ],
    phase,
    player: resolved.player,
  };
  return success(career, nextCareer);
}

export function advanceDevelopmentWeek(
  career: CareerRun,
  config: DevelopmentWeekConfig,
  skillDefinitions: readonly SkillMechanicsDefinition[] = [],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[] = [],
): WeeklyCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(career, 'weekly.invalid_career');
  }
  if (!canIncrementRevision(career)) {
    return failure(career, 'weekly.revision_exhausted');
  }
  if (career.phase.type !== 'WEEK_END') {
    return failure(career, 'weekly.invalid_phase');
  }
  if (!Number.isSafeInteger(career.weekIndex) || career.weekIndex === Number.MAX_SAFE_INTEGER) {
    return failure(career, 'weekly.week_index_exhausted');
  }
  if (!isDevelopmentWeekConfig(config)) {
    return failure(career, 'weekly.invalid_development_config');
  }
  if (!isWeeklyActionDefinitionCatalog(weeklyActionDefinitions)) {
    return failure(career, 'weekly.invalid_action_definitions');
  }
  if (!isSkillMechanicsDefinitionCatalog(skillDefinitions)) {
    return failure(career, 'weekly.invalid_skill_definitions');
  }
  if (skillDefinitions.length === 0 && weeklyActionDefinitions.length > 0) {
    return failure(career, 'weekly.invalid_skill_definitions');
  }
  if (skillDefinitions.length > 0 && weeklyActionDefinitions.length === 0) {
    return failure(career, 'weekly.invalid_action_definitions');
  }

  const passiveRecovery = derivePassiveBodyRecovery(
    career.player.state.body,
    config.passiveBodyRecovery,
    career.player.skillState,
    skillDefinitions,
    career.weekIndex,
  );
  if (!passiveRecovery.ok) {
    return failure(
      career,
      passiveRecovery.reason === 'skill_registry.invalid_definitions'
        ? 'weekly.invalid_skill_definitions'
        : passiveRecovery.reason === 'skill_registry.missing_equipped_definition'
          ? 'weekly.missing_equipped_skill_definition'
          : 'weekly.internal_invariant_failure',
    );
  }

  const completedWeekNumber = career.weekIndex + 1;
  let nextRng = restoreRngState(career.rng);
  let nextPhase: CareerRun['phase'] = { type: 'PLAN_ACTIONS' };
  if (isSkillBreakthroughCadenceWeek(completedWeekNumber)) {
    const generatedOffer = generateSkillBreakthroughOffer(
      {
        positionId: career.player.positionId,
        archetypeId: career.player.archetypeId,
        playerTagIds: career.player.tagIds,
        ownedSkillIds: deriveOwnedSkillIds(career.player.skillState),
        weekIndex: completedWeekNumber,
        recentWeeklyActionIds: career.recentWeeklyActionIds,
        rng: career.rng,
        offerIndex: career.player.skillState.acquisitions.length,
      },
      skillDefinitions,
      weeklyActionDefinitions,
    );
    if (!generatedOffer.ok) {
      return failure(
        career,
        generatedOffer.reason === 'skill_offer.invalid_skill_definitions'
          ? 'weekly.invalid_skill_definitions'
          : generatedOffer.reason === 'skill_offer.invalid_action_definitions' ||
              generatedOffer.reason === 'skill_offer.missing_action_definition'
            ? 'weekly.invalid_action_definitions'
            : generatedOffer.reason === 'skill_offer.invalid_total_weight'
              ? 'weekly.invalid_skill_offer_weights'
              : generatedOffer.reason === 'skill_offer.rng_exhausted'
                ? 'weekly.rng_exhausted'
                : 'weekly.internal_invariant_failure',
      );
    }
    nextRng = generatedOffer.nextRng;
    if (generatedOffer.offer !== null) {
      nextPhase = { type: 'SKILL_BREAKTHROUGH', offer: generatedOffer.offer };
    }
  }

  const cloned = cloneSerializable(career);
  const nextBody = passiveRecovery.evidence.bodyAfter;
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    weekIndex: completedWeekNumber,
    rng: nextRng,
    lastPassiveBodyRecovery: passiveRecovery.evidence,
    phase: nextPhase,
    player: {
      ...cloned.player,
      state: {
        ...cloned.player.state,
        body: nextBody,
      },
    },
  };
  return success(career, nextCareer);
}
