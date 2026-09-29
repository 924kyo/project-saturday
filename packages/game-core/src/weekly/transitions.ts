import {
  BODY_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
  PREPARATION_BOUNDS,
} from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { restoreRngState } from '../random/rng.js';
import { isWeeklyActionAvailableForCurrentInjury } from '../injuries/transitions.js';
import { updateProgramDepthAfterWeek } from '../programs/depth.js';
import { PRACTICE_IMPACT_BOUNDS } from '../programs/tuning.js';
import type {
  RecruitingOffenseStyleDefinition,
  RotationPolicyMechanicsDefinition,
} from '../programs/types.js';
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
import type {
  AppliedWeeklySkillEffectV2,
  SkillMechanicsDefinition,
  WeeklySkillEffectAggregatesV2,
} from '../skills/types.js';
import {
  generateGaugeSkillBreakthroughOffer,
  generateSkillBreakthroughOffer,
  type GenerateSkillBreakthroughOfferResult,
} from '../skills/offers.js';
import {
  bankSkillBreakthroughProgress,
  deriveWeeklySkillBreakthroughProgress,
} from '../skills/progress.js';
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
  deriveNextWeekPreparation,
  deriveBodyXpEfficiencyPermille,
  deriveTrainingProficiencyLevel,
  getTrainingProficiencyUseCap,
  getTrainingProficiencyXpMultiplierPermille,
  isDevelopmentWeekConfig,
  type DevelopmentWeekConfig,
} from './tuning.js';
import {
  WEEKLY_EXPERIENCE_VERSION_CURRENT,
  WEEKLY_EXPERIENCE_VERSION_LEGACY,
  type TrainingProficiencyUses,
  type WeeklyActionDefinition,
  type WeeklyActionResult,
  type WeeklyActionResultV3,
  type WeeklyActionResultV4,
  type WeeklyAttributeXpResult,
  type WeeklyProficiencyResult,
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
  requestedPreparationDelta: number,
  requestedConfidenceDelta: number,
  includeExperienceEffects: boolean,
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
  if (includeExperienceEffects && requestedPreparationDelta !== 0) {
    applicable.add('effect_preparation_change');
  }
  if (includeExperienceEffects && requestedConfidenceDelta !== 0) {
    applicable.add('effect_confidence_change');
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
  readonly result: WeeklyActionResultV3 | WeeklyActionResultV4;
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
  const preparationBefore = career.player.state.preparation;
  const confidenceBefore = career.player.state.confidence;
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
  const useExperienceModel = career.weeklyExperienceVersion === WEEKLY_EXPERIENCE_VERSION_CURRENT;
  const requestedPreparationDelta = useExperienceModel
    ? definition.preparationDelta + skillEffects.aggregates.preparationDeltaFlat
    : definition.preparationDelta;
  const requestedConfidenceDelta = useExperienceModel
    ? definition.confidenceDelta + skillEffects.aggregates.confidenceDeltaFlat
    : definition.confidenceDelta;
  const preparationAfter = useExperienceModel
    ? clamp(
        preparationBefore + requestedPreparationDelta,
        PREPARATION_BOUNDS.min,
        PREPARATION_BOUNDS.max,
      )
    : preparationBefore;
  const confidenceAfter = useExperienceModel
    ? clamp(
        confidenceBefore + requestedConfidenceDelta,
        CONFIDENCE_BOUNDS.min,
        CONFIDENCE_BOUNDS.max,
      )
    : confidenceBefore;
  const state: PlayerState = {
    ...career.player.state,
    body: bodyAfter,
    preparation: preparationAfter,
    confidence: confidenceAfter,
    gpa: gpaAfter,
  };
  const legacySkillEffectAggregates: WeeklySkillEffectAggregatesV2 = {
    xpMultiplierPermille: skillEffects.aggregates.xpMultiplierPermille,
    bodyCostMultiplierPermille: skillEffects.aggregates.bodyCostMultiplierPermille,
    bodyDeltaFlat: skillEffects.aggregates.bodyDeltaFlat,
    gpaDeltaMilli: skillEffects.aggregates.gpaDeltaMilli,
  };
  const legacyAppliedSkillEffects = skillEffects.appliedSkillEffects.filter(
    (effect): effect is AppliedWeeklySkillEffectV2 =>
      effect.type === 'action_xp_multiplier' ||
      effect.type === 'action_body_cost_multiplier' ||
      effect.type === 'action_body_delta_flat' ||
      effect.type === 'action_gpa_delta_milli',
  );
  const practiceImpact =
    career.recruitingState.type === 'COMMITTED'
      ? clamp(
          definition.practiceImpact +
            (useExperienceModel ? skillEffects.aggregates.practiceImpactFlat : 0),
          PRACTICE_IMPACT_BOUNDS.min,
          PRACTICE_IMPACT_BOUNDS.max,
        )
      : 0;
  const legacyResult: WeeklyActionResultV3 = {
    actionId: definition.id,
    actionIndex: phase.nextActionIndex,
    weekIndex: career.weekIndex,
    effectIds: effectIdsForResult(
      definition,
      requestedBodyDelta,
      requestedGpaDelta,
      requestedPreparationDelta,
      requestedConfidenceDelta,
      useExperienceModel,
    ),
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
    skillEffectAggregates: legacySkillEffectAggregates,
    appliedSkillEffects: legacyAppliedSkillEffects,
    practiceImpact,
  };
  const result: WeeklyActionResultV3 | WeeklyActionResultV4 = useExperienceModel
    ? {
        ...legacyResult,
        skillEffectAggregates: skillEffects.aggregates,
        appliedSkillEffects: skillEffects.appliedSkillEffects,
        preparationBefore,
        basePreparationDelta: definition.preparationDelta,
        requestedPreparationDelta,
        actualPreparationDelta: preparationAfter - preparationBefore,
        preparationAfter,
        confidenceBefore,
        baseConfidenceDelta: definition.confidenceDelta,
        requestedConfidenceDelta,
        actualConfidenceDelta: confidenceAfter - confidenceBefore,
        confidenceAfter,
      }
    : legacyResult;

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
  if (career.recruitingState.type !== 'COMMITTED') {
    return failure(career, 'weekly.recruiting_required');
  }
  if ('offFieldCareerState' in career) {
    const nil = career.offFieldCareerState.nil;
    if ('bootstrapStatus' in nil && nil.bootstrapStatus === 'ACTIVE') {
      if (
        nil.activeObligation !== null &&
        nil.activeObligation.lastResolvedWeekIndex !== career.weekIndex
      ) {
        return failure(career, 'weekly.off_field_obligation_required');
      }
    }
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
  if (actionIds.some((actionId) => !isWeeklyActionAvailableForCurrentInjury(career, actionId))) {
    return failure(career, 'weekly.action_unavailable');
  }

  const cloned = cloneSerializable(career);
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    weeklyExperienceVersion: WEEKLY_EXPERIENCE_VERSION_CURRENT,
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

/**
 * Preserves the exact pre-program M1/M2 simulation contract for pinned historical reports.
 * Shipping adapters must use commitWeeklyActionPlan; this command accepts only neutral
 * NOT_STARTED careers and can never bypass an active CHOOSING shortlist.
 */
export function commitHistoricalPreProgramWeeklyActionPlan(
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
  if (career.recruitingState.type !== 'NOT_STARTED') {
    return failure(career, 'weekly.recruiting_required');
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
    weeklyExperienceVersion: WEEKLY_EXPERIENCE_VERSION_LEGACY,
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

/**
 * Preserves the shipped M3 program/depth simulation baseline after the current-v4
 * experience model replaces its weekly formula. Testkit is the only intended caller.
 */
export function commitHistoricalM3WeeklyActionPlan(
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
  if (career.recruitingState.type !== 'COMMITTED') {
    return failure(career, 'weekly.recruiting_required');
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
    weeklyExperienceVersion: WEEKLY_EXPERIENCE_VERSION_LEGACY,
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
  offenseStyleDefinitions: readonly RecruitingOffenseStyleDefinition[] = [],
  rotationPolicyDefinitions: readonly RotationPolicyMechanicsDefinition[] = [],
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
  const results: Array<WeeklyActionResultV3 | WeeklyActionResultV4> = [
    ...career.phase.results.map((result) => cloneSerializable(result)),
    resolved.result,
  ];
  const cloned = cloneSerializable(career);
  let nextPlayer = resolved.player;
  let nextProgramContext = cloned.programContext;
  let depthUpdate = null;
  if (results.length === WEEKLY_ACTION_PLAN_SIZE && career.recruitingState.type === 'COMMITTED') {
    const updatedDepth = updateProgramDepthAfterWeek(
      { ...career, player: resolved.player },
      [
        results[0] as WeeklyActionResult,
        results[1] as WeeklyActionResult,
        results[2] as WeeklyActionResult,
      ],
      offenseStyleDefinitions,
      rotationPolicyDefinitions,
      career.weeklyExperienceVersion === WEEKLY_EXPERIENCE_VERSION_CURRENT
        ? 'experience'
        : 'legacy',
    );
    if (!updatedDepth.ok) {
      return failure(
        career,
        updatedDepth.reason === 'depth.invalid_offense_catalog'
          ? 'weekly.invalid_offense_definitions'
          : updatedDepth.reason === 'depth.invalid_rotation_catalog'
            ? 'weekly.invalid_rotation_definitions'
            : 'weekly.internal_invariant_failure',
      );
    }
    nextPlayer = updatedDepth.player;
    nextProgramContext = updatedDepth.programContext;
    depthUpdate = updatedDepth.depthUpdate;
  }
  let phase: CareerRun['phase'];
  if (results.length === WEEKLY_ACTION_PLAN_SIZE) {
    phase =
      career.weeklyExperienceVersion === WEEKLY_EXPERIENCE_VERSION_CURRENT
        ? {
            type: 'WEEK_END',
            results: results as [WeeklyActionResultV4, WeeklyActionResultV4, WeeklyActionResultV4],
            depthUpdate: depthUpdate as Extract<
              CareerRun['phase'],
              { readonly type: 'WEEK_END'; readonly results: readonly WeeklyActionResultV4[] }
            >['depthUpdate'],
          }
        : {
            type: 'WEEK_END',
            results: results as [WeeklyActionResultV3, WeeklyActionResultV3, WeeklyActionResultV3],
            depthUpdate: depthUpdate as Extract<
              CareerRun['phase'],
              { readonly type: 'WEEK_END'; readonly results: readonly WeeklyActionResultV3[] }
            >['depthUpdate'],
          };
  } else {
    const actionIds = [...career.phase.actionIds] as [
      WeeklyActionId,
      WeeklyActionId,
      WeeklyActionId,
    ];
    phase =
      career.weeklyExperienceVersion === 2
        ? {
            type: 'RESOLVE_ACTIONS',
            actionIds,
            nextActionIndex: results.length as 1 | 2,
            results: results as WeeklyActionResultV4[],
          }
        : {
            type: 'RESOLVE_ACTIONS',
            actionIds,
            nextActionIndex: results.length as 1 | 2,
            results: results as WeeklyActionResultV3[],
          };
  }
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    recentWeeklyActionIds: [
      ...career.recentWeeklyActionIds.slice(-(RECENT_WEEKLY_ACTION_ID_LIMIT - 1)),
      definition.id,
    ],
    phase,
    player: nextPlayer,
    programContext: nextProgramContext,
  };
  return success(career, nextCareer);
}

function advanceDevelopmentWeekInternal(
  career: CareerRun,
  config: DevelopmentWeekConfig,
  skillDefinitions: readonly SkillMechanicsDefinition[],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[],
  offerModel: 'gauge' | 'historical_cadence' | 'historical_gauge',
  phasePolicy: 'standard' | 'season_camp',
): WeeklyCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(career, 'weekly.invalid_career');
  }
  if (!canIncrementRevision(career)) {
    return failure(career, 'weekly.revision_exhausted');
  }
  const historicalWeekEnd = offerModel !== 'gauge';
  const usesGauge = offerModel !== 'historical_cadence';
  const validPhase =
    phasePolicy === 'season_camp'
      ? career.recruitingState.type === 'COMMITTED' && career.phase.type === 'WEEK_END'
      : historicalWeekEnd
        ? career.phase.type === 'WEEK_END'
        : career.recruitingState.type === 'COMMITTED'
          ? career.phase.type === 'POST_GAME'
          : career.phase.type === 'WEEK_END';
  if (!validPhase) {
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
  let breakthroughProgress = usesGauge ? deriveWeeklySkillBreakthroughProgress(career) : null;
  let generatedOffer: GenerateSkillBreakthroughOfferResult | null = null;
  if (usesGauge && breakthroughProgress?.triggeredOffer === true) {
    generatedOffer = generateGaugeSkillBreakthroughOffer(
      {
        positionId: career.player.positionId,
        archetypeId: career.player.archetypeId,
        playerTagIds: career.player.tagIds,
        ownedSkillIds: deriveOwnedSkillIds(career.player.skillState),
        weekIndex: completedWeekNumber,
        recentWeeklyActionIds: career.recentWeeklyActionIds,
        rng: career.rng,
        offerIndex: career.player.skillState.acquisitions.length,
        trigger: breakthroughProgress,
      },
      skillDefinitions,
      weeklyActionDefinitions,
    );
  } else if (
    offerModel === 'historical_cadence' &&
    isSkillBreakthroughCadenceWeek(completedWeekNumber)
  ) {
    generatedOffer = generateSkillBreakthroughOffer(
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
  }
  if (generatedOffer !== null) {
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
    } else if (breakthroughProgress !== null && breakthroughProgress.triggeredOffer) {
      breakthroughProgress = bankSkillBreakthroughProgress(breakthroughProgress);
    }
  }

  const cloned = cloneSerializable(career);
  const nextBody = passiveRecovery.evidence.bodyAfter;
  const nextPreparation =
    career.weeklyExperienceVersion === 2
      ? deriveNextWeekPreparation(career.player.state.preparation)
      : career.player.state.preparation;
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    weekIndex: completedWeekNumber,
    rng: nextRng,
    lastPassiveBodyRecovery: passiveRecovery.evidence,
    weeklyExperienceVersion: WEEKLY_EXPERIENCE_VERSION_CURRENT,
    phase: nextPhase,
    player: {
      ...cloned.player,
      skillState:
        breakthroughProgress === null
          ? cloned.player.skillState
          : {
              ...cloned.player.skillState,
              breakthroughGauge: {
                model: 'gauge_v1',
                progress: breakthroughProgress.progressAfter,
                threshold: breakthroughProgress.threshold,
                lastProgress: breakthroughProgress,
              },
            },
      state: {
        ...cloned.player.state,
        body: nextBody,
        preparation: nextPreparation,
      },
    },
  };
  return success(career, nextCareer);
}

export function advanceDevelopmentWeek(
  career: CareerRun,
  config: DevelopmentWeekConfig,
  skillDefinitions: readonly SkillMechanicsDefinition[] = [],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[] = [],
): WeeklyCommandResult {
  return advanceDevelopmentWeekInternal(
    career,
    config,
    skillDefinitions,
    weeklyActionDefinitions,
    'gauge',
    'standard',
  );
}

/** Season orchestration only: camp completes a development week without requiring a game. */
export function advanceSeasonCampDevelopmentWeek(
  career: CareerRun,
  config: DevelopmentWeekConfig,
  skillDefinitions: readonly SkillMechanicsDefinition[] = [],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[] = [],
): WeeklyCommandResult {
  return advanceDevelopmentWeekInternal(
    career,
    config,
    skillDefinitions,
    weeklyActionDefinitions,
    'gauge',
    'season_camp',
  );
}

/** Historical report compatibility only; shipping adapters must use `advanceDevelopmentWeek`. */
export function advanceHistoricalDevelopmentWeek(
  career: CareerRun,
  config: DevelopmentWeekConfig,
  skillDefinitions: readonly SkillMechanicsDefinition[] = [],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[] = [],
): WeeklyCommandResult {
  return advanceDevelopmentWeekInternal(
    career,
    config,
    skillDefinitions,
    weeklyActionDefinitions,
    'historical_cadence',
    'standard',
  );
}

/** Checked-report compatibility only; shipping adapters must use `advanceDevelopmentWeek`. */
export function advanceHistoricalGaugeDevelopmentWeek(
  career: CareerRun,
  config: DevelopmentWeekConfig,
  skillDefinitions: readonly SkillMechanicsDefinition[] = [],
  weeklyActionDefinitions: readonly WeeklyActionDefinition[] = [],
): WeeklyCommandResult {
  return advanceDevelopmentWeekInternal(
    career,
    config,
    skillDefinitions,
    weeklyActionDefinitions,
    'historical_gauge',
    'standard',
  );
}
