import {
  BODY_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
  PREPARATION_BOUNDS,
  isIntegerWithinBounds,
  isWithinBounds,
} from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import {
  getPlayableAttributeIds,
  validatePositionAttributeProgress,
} from '../player/progression.js';
import type { NewInjuryEvidence } from '../injuries/types.js';
import type { WeeklySkillEffectAggregates, AppliedWeeklySkillEffect } from '../skills/types.js';
import { isNewInjuryEvidence } from '../injuries/validation.js';
import { isWeeklyActionDefinition } from './definition.js';
import { isPositionTrainingActionId, type PositionTrainingActionId } from './ids.js';
import type { WeeklyActionDefinition } from './types.js';
import {
  applyPositionTrainingXp,
  createPositionTrainingProficiencyUses,
  resolvePositionTrainingAction,
  type PositionTrainingActionDefinition,
  type PositionTrainingActionEvidence,
  type PositionTrainingAttributeXpEvidence,
  type PositionTrainingProficiencyEvidence,
  type PositionTrainingState,
} from './position-training.js';
import {
  deriveBodyXpEfficiencyPermille,
  deriveTrainingProficiencyLevel,
  getTrainingProficiencyUseCap,
  getTrainingProficiencyXpMultiplierPermille,
  isDevelopmentWeekConfig,
  type DevelopmentWeekConfig,
} from './tuning.js';

export const COMMON_POSITION_FOCUS_IDS = Object.freeze([
  'action_weight_room',
  'action_speed_work',
  'action_film_study',
  'action_recovery',
  'action_study_hall',
] as const);
export const COMMON_POSITION_PROFICIENCY_IDS = Object.freeze([
  'proficiency_weight_room',
  'proficiency_speed_work',
  'proficiency_film_study',
] as const);
export type CommonPositionFocusId = (typeof COMMON_POSITION_FOCUS_IDS)[number];
export type CommonPositionProficiencyId = (typeof COMMON_POSITION_PROFICIENCY_IDS)[number];
export type PositionFocusId = PositionTrainingActionId | CommonPositionFocusId;
export type PositionFocusLoadClass = 'SAFE' | 'TECHNICAL' | 'HIGH_LOAD';
export type PositionFocusInjuryPolicies = Readonly<Record<PositionFocusId, PositionFocusLoadClass>>;
export type CommonPositionProficiencyUses = Readonly<Record<CommonPositionProficiencyId, number>>;

export interface PositionFocusStateV2 {
  readonly model: 'position_focus_state_v2';
  readonly training: PositionTrainingState;
  readonly sharedProficiencyUses: CommonPositionProficiencyUses;
  readonly gpa: number;
}

export interface PositionFocusEvidenceV2 extends Omit<
  PositionTrainingActionEvidence,
  'actionId' | 'attributeXp' | 'proficiency'
> {
  readonly model: 'position_focus_action_v2';
  readonly actionId: PositionFocusId;
  readonly attributeXp: readonly PositionTrainingAttributeXpEvidence[];
  readonly proficiency:
    | (Omit<PositionTrainingProficiencyEvidence, 'proficiencyId'> & {
        readonly proficiencyId:
          PositionTrainingProficiencyEvidence['proficiencyId'] | CommonPositionProficiencyId;
      })
    | null;
  readonly baseBodyDelta: number;
  readonly basePreparationDelta: number;
  readonly baseConfidenceDelta: number;
  readonly gpaBefore: number;
  readonly requestedGpaDelta: number;
  readonly actualGpaDelta: number;
  readonly gpaAfter: number;
  readonly skillEffects?: {
    readonly aggregates: WeeklySkillEffectAggregates;
    readonly appliedSkillEffects: readonly AppliedWeeklySkillEffect[];
  };
}

export type ResolvePositionFocusResult =
  | {
      readonly ok: true;
      readonly next: PositionFocusStateV2;
      readonly evidence: PositionFocusEvidenceV2;
    }
  | {
      readonly ok: false;
      readonly reason: 'position_focus.invalid_input' | 'position_focus.unavailable';
    };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
function roundGpa(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createCommonPositionProficiencyUses(): CommonPositionProficiencyUses {
  return Object.freeze({
    proficiency_weight_room: 0,
    proficiency_speed_work: 0,
    proficiency_film_study: 0,
  });
}

export function isPositionFocusStateV2(
  value: unknown,
  config: DevelopmentWeekConfig,
): value is PositionFocusStateV2 {
  if (
    !isDevelopmentWeekConfig(config) ||
    !record(value) ||
    Object.keys(value).sort().join('|') !== 'gpa|model|sharedProficiencyUses|training' ||
    value['model'] !== 'position_focus_state_v2' ||
    !record(value['training']) ||
    !record(value['sharedProficiencyUses']) ||
    !isWithinBounds(value['gpa'], GPA_BOUNDS)
  )
    return false;
  const training = value['training'];
  if (
    Object.keys(training).sort().join('|') !== 'attributes|positionId|proficiencyUses|state' ||
    ![
      'position_qb',
      'position_rb',
      'position_cb',
      'position_wr',
      'position_lb',
      'position_edge',
    ].includes(String(training['positionId'])) ||
    !record(training['proficiencyUses']) ||
    !record(training['state']) ||
    Object.keys(training['state']).sort().join('|') !== 'body|confidence|preparation' ||
    !isIntegerWithinBounds(training['state']['body'], BODY_BOUNDS) ||
    !isIntegerWithinBounds(training['state']['preparation'], PREPARATION_BOUNDS) ||
    !isIntegerWithinBounds(training['state']['confidence'], CONFIDENCE_BOUNDS) ||
    validatePositionAttributeProgress(
      training['positionId'] as PositionTrainingState['positionId'],
      training['attributes'],
    ).length > 0
  )
    return false;
  const expected = Object.keys(
    createPositionTrainingProficiencyUses(
      training['positionId'] as PositionTrainingState['positionId'],
    ),
  );
  const cap = getTrainingProficiencyUseCap(config);
  return [
    { counts: training['proficiencyUses'], ids: expected },
    { counts: value['sharedProficiencyUses'], ids: COMMON_POSITION_PROFICIENCY_IDS },
  ].every(
    ({ counts, ids }) =>
      Object.keys(counts).length === ids.length &&
      ids.every(
        (id) =>
          Number.isSafeInteger(counts[id]) &&
          (counts[id] as number) >= 0 &&
          (counts[id] as number) <= cap,
      ),
  );
}

export function isPositionFocusAvailable(
  actionId: PositionFocusId,
  injury: NewInjuryEvidence | null,
  policies: PositionFocusInjuryPolicies,
): boolean {
  const load = policies?.[actionId];
  if (!['SAFE', 'TECHNICAL', 'HIGH_LOAD'].includes(load)) return false;
  if (injury === null) return true;
  if (!isNewInjuryEvidence(injury)) return false;
  return injury.defaultAvailabilityId === 'injury_availability_out'
    ? load === 'SAFE'
    : load !== 'HIGH_LOAD';
}

/** Position drills reuse their resolver; shared focuses reuse authored common IDs and XP arithmetic. */
export function resolvePositionFocus(
  input: PositionFocusStateV2,
  definition: PositionTrainingActionDefinition | WeeklyActionDefinition,
  config: DevelopmentWeekConfig,
  injury: NewInjuryEvidence | null,
  policies: PositionFocusInjuryPolicies,
): ResolvePositionFocusResult {
  const invalid = (): ResolvePositionFocusResult =>
    deepFreeze({ ok: false as const, reason: 'position_focus.invalid_input' as const });
  if (!isPositionFocusStateV2(input, config) || !record(definition)) return invalid();
  if (isPositionTrainingActionId(definition.id)) {
    if (!('positionId' in definition)) return invalid();
    const result = resolvePositionTrainingAction(
      cloneSerializable(input.training),
      definition as PositionTrainingActionDefinition,
      config,
    );
    if (!result.ok) return invalid();
    if (!isPositionFocusAvailable(definition.id, injury, policies))
      return deepFreeze({ ok: false as const, reason: 'position_focus.unavailable' as const });
    return deepFreeze({
      ok: true,
      next: { ...cloneSerializable(input), training: result.next },
      evidence: {
        ...result.evidence,
        model: 'position_focus_action_v2',
        baseBodyDelta: definition.bodyDelta,
        basePreparationDelta: definition.preparationDelta,
        baseConfidenceDelta: definition.confidenceDelta,
        gpaBefore: input.gpa,
        requestedGpaDelta: 0,
        actualGpaDelta: 0,
        gpaAfter: input.gpa,
      },
    });
  }
  if (
    !isWeeklyActionDefinition(definition) ||
    !COMMON_POSITION_FOCUS_IDS.includes(definition.id as CommonPositionFocusId) ||
    !definition.tagIds.includes('action_scope_common') ||
    definition.attributeXp.some(
      ({ attributeId }) =>
        !getPlayableAttributeIds(input.training.positionId).includes(attributeId),
    )
  )
    return invalid();
  const actionId = definition.id as CommonPositionFocusId;
  if (!isPositionFocusAvailable(actionId, injury, policies))
    return deepFreeze({ ok: false as const, reason: 'position_focus.unavailable' as const });
  const proficiencyId = definition.proficiencyId as CommonPositionProficiencyId | null;
  if (proficiencyId !== null && !COMMON_POSITION_PROFICIENCY_IDS.includes(proficiencyId))
    return invalid();
  const sharedProficiencyUses = { ...input.sharedProficiencyUses };
  let proficiency: PositionFocusEvidenceV2['proficiency'] = null;
  if (proficiencyId !== null) {
    const usesBefore = sharedProficiencyUses[proficiencyId];
    const usesAfter = Math.min(usesBefore + 1, getTrainingProficiencyUseCap(config));
    const levelBefore = deriveTrainingProficiencyLevel(usesBefore, config);
    proficiency = {
      proficiencyId,
      usesBefore,
      usesAfter,
      levelBefore,
      levelAfter: deriveTrainingProficiencyLevel(usesAfter, config),
      xpMultiplierPermille: getTrainingProficiencyXpMultiplierPermille(levelBefore, config),
    };
    sharedProficiencyUses[proficiencyId] = usesAfter;
  }
  const bodyXpEfficiencyPermille = deriveBodyXpEfficiencyPermille(
    input.training.state.body,
    config,
  );
  const attributes = { ...input.training.attributes };
  const attributeXp = definition.attributeXp.map(({ attributeId, baseXp }) => {
    const evidence = applyPositionTrainingXp(
      attributes[attributeId]!,
      attributeId,
      baseXp,
      bodyXpEfficiencyPermille,
      proficiency?.xpMultiplierPermille ?? 1000,
    );
    attributes[attributeId] = { rating: evidence.ratingAfter, xp: evidence.xpAfter };
    return evidence;
  });
  const bodyAfter = clamp(
    input.training.state.body + definition.bodyDelta,
    BODY_BOUNDS.min,
    BODY_BOUNDS.max,
  );
  const preparationAfter = clamp(
    input.training.state.preparation + definition.preparationDelta,
    PREPARATION_BOUNDS.min,
    PREPARATION_BOUNDS.max,
  );
  const confidenceAfter = clamp(
    input.training.state.confidence + definition.confidenceDelta,
    CONFIDENCE_BOUNDS.min,
    CONFIDENCE_BOUNDS.max,
  );
  const gpaAfter =
    definition.gpaDelta === 0
      ? input.gpa
      : roundGpa(clamp(input.gpa + definition.gpaDelta, GPA_BOUNDS.min, GPA_BOUNDS.max));
  return deepFreeze(
    cloneSerializable({
      ok: true as const,
      next: {
        ...input,
        gpa: gpaAfter,
        sharedProficiencyUses,
        training: {
          ...input.training,
          attributes,
          state: { body: bodyAfter, preparation: preparationAfter, confidence: confidenceAfter },
        },
      },
      evidence: {
        model: 'position_focus_action_v2' as const,
        actionId,
        attributeXp,
        proficiency,
        bodyBefore: input.training.state.body,
        bodyAfter,
        bodyXpEfficiencyPermille,
        baseBodyDelta: definition.bodyDelta,
        preparationBefore: input.training.state.preparation,
        preparationAfter,
        basePreparationDelta: definition.preparationDelta,
        confidenceBefore: input.training.state.confidence,
        confidenceAfter,
        baseConfidenceDelta: definition.confidenceDelta,
        gpaBefore: input.gpa,
        requestedGpaDelta: definition.gpaDelta,
        actualGpaDelta: roundGpa(gpaAfter - input.gpa),
        gpaAfter,
        practiceImpact: definition.practiceImpact,
        // Current source-based gauge settlement owns rewards; common actions do not award passive points.
        breakthroughGaugePoints: 0,
      },
    }),
  );
}
