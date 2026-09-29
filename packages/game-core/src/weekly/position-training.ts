import type { DepthRoleId } from '../programs/ids.js';
import {
  DEPTH_COMPONENT_BOUNDS,
  PRACTICE_BODY_NEUTRAL_POINT,
  PRACTICE_BODY_POINTS_PER_SCORE,
  PRACTICE_CONFIDENCE_NEUTRAL_POINT,
  PRACTICE_CONFIDENCE_POINTS_PER_SCORE,
  PRACTICE_PREPARATION_POINTS_PER_SCORE,
  PRACTICE_PREPARATION_TARGET_BY_ROLE,
  PRACTICE_WEEKLY_SCORE_BASE,
} from '../programs/tuning.js';
import {
  ATTRIBUTE_RATING_BOUNDS,
  BODY_BOUNDS,
  CONFIDENCE_BOUNDS,
  PREPARATION_BOUNDS,
} from '../player/bounds.js';
import { deepFreeze } from '../player/immutable.js';
import { isPositionId, type MultiPositionAttributeId, type PositionId } from '../player/ids.js';
import {
  getPositionAttributeIds,
  validatePositionAttributeProgress,
  type PositionAttributeProgress,
} from '../player/progression.js';
import type { AttributeProgress, PlayerState } from '../player/types.js';
import { SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX } from '../skills/tuning.js';
import {
  POSITION_TRAINING_ACTION_IDS,
  POSITION_TRAINING_PROFICIENCY_IDS,
  isPositionTrainingActionId,
  isPositionTrainingProficiencyId,
  type PositionTrainingActionId,
  type PositionTrainingProficiencyId,
} from './ids.js';
import {
  ATTRIBUTE_XP_PER_RATING,
  deriveBodyXpEfficiencyPermille,
  deriveTrainingProficiencyLevel,
  getTrainingProficiencyUseCap,
  getTrainingProficiencyXpMultiplierPermille,
  isDevelopmentWeekConfig,
  type DevelopmentWeekConfig,
  type TrainingProficiencyLevel,
} from './tuning.js';

export interface PositionTrainingActionDefinition {
  readonly attributeXp: readonly [
    { readonly attributeId: MultiPositionAttributeId; readonly baseXp: number },
    { readonly attributeId: MultiPositionAttributeId; readonly baseXp: number },
  ];
  readonly bodyDelta: number;
  readonly breakthroughGaugePoints: number;
  readonly confidenceDelta: number;
  readonly developmentFamilyId: `development_family_${string}`;
  readonly id: PositionTrainingActionId;
  readonly positionId: Exclude<PositionId, 'position_wr'>;
  readonly practiceImpact: number;
  readonly preparationDelta: number;
  readonly proficiencyId: PositionTrainingProficiencyId;
}

export type PositionTrainingProficiencyUses = Readonly<
  Partial<Record<PositionTrainingProficiencyId, number>>
>;

export interface PositionTrainingAttributeXpEvidence {
  readonly appliedXp: number;
  readonly attributeId: MultiPositionAttributeId;
  readonly awardedXp: number;
  readonly baseXp: number;
  readonly ratingAfter: number;
  readonly ratingBefore: number;
  readonly xpAfter: number;
  readonly xpBefore: number;
}

export interface PositionTrainingProficiencyEvidence {
  readonly levelAfter: TrainingProficiencyLevel;
  readonly levelBefore: TrainingProficiencyLevel;
  readonly proficiencyId: PositionTrainingProficiencyId;
  readonly usesAfter: number;
  readonly usesBefore: number;
  readonly xpMultiplierPermille: number;
}

export interface PositionTrainingActionEvidence {
  readonly actionId: PositionTrainingActionId;
  readonly attributeXp: readonly [
    PositionTrainingAttributeXpEvidence,
    PositionTrainingAttributeXpEvidence,
  ];
  readonly bodyAfter: number;
  readonly bodyBefore: number;
  readonly bodyXpEfficiencyPermille: number;
  readonly breakthroughGaugePoints: number;
  readonly confidenceAfter: number;
  readonly confidenceBefore: number;
  readonly practiceImpact: number;
  readonly preparationAfter: number;
  readonly preparationBefore: number;
  readonly proficiency: PositionTrainingProficiencyEvidence;
}

export interface PositionTrainingState {
  readonly attributes: PositionAttributeProgress;
  readonly positionId: Exclude<PositionId, 'position_wr'>;
  readonly proficiencyUses: PositionTrainingProficiencyUses;
  readonly state: Pick<PlayerState, 'body' | 'confidence' | 'preparation'>;
}

export interface PositionPracticeGradeProjection {
  readonly baseScore: number;
  readonly bodyAfterFocus: number;
  readonly bodyContribution: number;
  readonly breakthroughGaugePoints: number;
  readonly confidenceAfterFocus: number;
  readonly confidenceContribution: number;
  readonly focusImpact: number;
  readonly preparationAfterFocus: number;
  readonly preparationContribution: number;
  readonly preparationTarget: number;
  readonly score: number;
}

export type ResolvePositionTrainingActionResult =
  | {
      readonly evidence: PositionTrainingActionEvidence;
      readonly next: PositionTrainingState;
      readonly ok: true;
    }
  | { readonly ok: false; readonly reason: 'position_training.invalid_input' };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function proficiencyIdsForPosition(
  positionId: Exclude<PositionId, 'position_wr'>,
): readonly PositionTrainingProficiencyId[] {
  const offset = positionId === 'position_qb' ? 0 : positionId === 'position_rb' ? 3 : 6;
  return POSITION_TRAINING_PROFICIENCY_IDS.slice(offset, offset + 3);
}

export function createPositionTrainingProficiencyUses(
  positionId: Exclude<PositionId, 'position_wr'>,
): PositionTrainingProficiencyUses {
  return deepFreeze(
    Object.fromEntries(proficiencyIdsForPosition(positionId).map((id) => [id, 0])) as Record<
      PositionTrainingProficiencyId,
      number
    >,
  );
}

function validDefinition(
  definition: PositionTrainingActionDefinition,
  positionId: Exclude<PositionId, 'position_wr'>,
): boolean {
  if (
    !isPositionTrainingActionId(definition?.id) ||
    !isPositionTrainingProficiencyId(definition?.proficiencyId) ||
    definition.positionId !== positionId ||
    POSITION_TRAINING_ACTION_IDS.indexOf(definition.id) !==
      POSITION_TRAINING_PROFICIENCY_IDS.indexOf(definition.proficiencyId) ||
    !Number.isInteger(definition.bodyDelta) ||
    !Number.isInteger(definition.preparationDelta) ||
    !Number.isInteger(definition.confidenceDelta) ||
    !Number.isInteger(definition.practiceImpact) ||
    !Number.isInteger(definition.breakthroughGaugePoints)
  ) {
    return false;
  }
  const allowed = getPositionAttributeIds(positionId);
  return (
    definition.attributeXp.length === 2 &&
    definition.attributeXp[0].attributeId !== definition.attributeXp[1].attributeId &&
    definition.attributeXp.every(
      ({ attributeId, baseXp }) =>
        allowed.includes(attributeId) && Number.isInteger(baseXp) && baseXp >= 1 && baseXp <= 50,
    )
  );
}

export function applyPositionTrainingXp(
  progress: AttributeProgress,
  attributeId: MultiPositionAttributeId,
  baseXp: number,
  bodyEfficiency: number,
  proficiencyMultiplier: number,
  skillMultiplierPermille = 1000,
): PositionTrainingAttributeXpEvidence {
  const awardedXp =
    skillMultiplierPermille === 1000
      ? Math.floor((baseXp * bodyEfficiency * proficiencyMultiplier) / 1_000_000)
      : Math.floor(
          (baseXp * bodyEfficiency * proficiencyMultiplier * skillMultiplierPermille) /
            1_000_000_000,
        );
  const capacity =
    progress.rating >= ATTRIBUTE_RATING_BOUNDS.max
      ? 0
      : (ATTRIBUTE_RATING_BOUNDS.max - progress.rating) * ATTRIBUTE_XP_PER_RATING - progress.xp;
  const appliedXp = Math.min(awardedXp, capacity);
  const totalXp = progress.xp + appliedXp;
  const ratingAfter = Math.min(
    ATTRIBUTE_RATING_BOUNDS.max,
    progress.rating + Math.floor(totalXp / ATTRIBUTE_XP_PER_RATING),
  );
  return {
    appliedXp,
    attributeId,
    awardedXp,
    baseXp,
    ratingAfter,
    ratingBefore: progress.rating,
    xpAfter: ratingAfter === ATTRIBUTE_RATING_BOUNDS.max ? 0 : totalXp % ATTRIBUTE_XP_PER_RATING,
    xpBefore: progress.xp,
  };
}

export function resolvePositionTrainingAction(
  input: PositionTrainingState,
  definition: PositionTrainingActionDefinition,
  config: DevelopmentWeekConfig,
): ResolvePositionTrainingActionResult {
  if (
    !isPositionId(input?.positionId) ||
    validatePositionAttributeProgress(input.positionId, input.attributes).length > 0 ||
    !validDefinition(definition, input.positionId) ||
    !isDevelopmentWeekConfig(config)
  ) {
    return deepFreeze({ ok: false as const, reason: 'position_training.invalid_input' as const });
  }
  const expectedProficiencies = proficiencyIdsForPosition(input.positionId);
  const proficiencyKeys = Object.keys(input.proficiencyUses);
  if (
    proficiencyKeys.length !== 3 ||
    proficiencyKeys.some(
      (id) => !expectedProficiencies.includes(id as PositionTrainingProficiencyId),
    ) ||
    expectedProficiencies.some(
      (id) => !Number.isInteger(input.proficiencyUses[id]) || (input.proficiencyUses[id] ?? -1) < 0,
    ) ||
    !Number.isInteger(input.state.body) ||
    !Number.isInteger(input.state.preparation) ||
    !Number.isInteger(input.state.confidence)
  ) {
    return deepFreeze({ ok: false as const, reason: 'position_training.invalid_input' as const });
  }
  const usesBefore = input.proficiencyUses[definition.proficiencyId]!;
  const usesAfter = Math.min(usesBefore + 1, getTrainingProficiencyUseCap(config));
  const levelBefore = deriveTrainingProficiencyLevel(usesBefore, config);
  const levelAfter = deriveTrainingProficiencyLevel(usesAfter, config);
  const xpMultiplierPermille = getTrainingProficiencyXpMultiplierPermille(levelBefore, config);
  const bodyXpEfficiencyPermille = deriveBodyXpEfficiencyPermille(input.state.body, config);
  const attributes = { ...input.attributes };
  const xpEvidence = definition.attributeXp.map(({ attributeId, baseXp }) => {
    const evidence = applyPositionTrainingXp(
      attributes[attributeId]!,
      attributeId,
      baseXp,
      bodyXpEfficiencyPermille,
      xpMultiplierPermille,
    );
    attributes[attributeId] = { rating: evidence.ratingAfter, xp: evidence.xpAfter };
    return evidence;
  }) as [PositionTrainingAttributeXpEvidence, PositionTrainingAttributeXpEvidence];
  const bodyAfter = clamp(
    input.state.body + definition.bodyDelta,
    BODY_BOUNDS.min,
    BODY_BOUNDS.max,
  );
  const preparationAfter = clamp(
    input.state.preparation + definition.preparationDelta,
    PREPARATION_BOUNDS.min,
    PREPARATION_BOUNDS.max,
  );
  const confidenceAfter = clamp(
    input.state.confidence + definition.confidenceDelta,
    CONFIDENCE_BOUNDS.min,
    CONFIDENCE_BOUNDS.max,
  );
  const proficiency = {
    levelAfter,
    levelBefore,
    proficiencyId: definition.proficiencyId,
    usesAfter,
    usesBefore,
    xpMultiplierPermille,
  };
  return deepFreeze({
    evidence: {
      actionId: definition.id,
      attributeXp: xpEvidence,
      bodyAfter,
      bodyBefore: input.state.body,
      bodyXpEfficiencyPermille,
      breakthroughGaugePoints: definition.breakthroughGaugePoints,
      confidenceAfter,
      confidenceBefore: input.state.confidence,
      practiceImpact: definition.practiceImpact,
      preparationAfter,
      preparationBefore: input.state.preparation,
      proficiency,
    },
    next: {
      attributes,
      positionId: input.positionId,
      proficiencyUses: { ...input.proficiencyUses, [definition.proficiencyId]: usesAfter },
      state: { body: bodyAfter, confidence: confidenceAfter, preparation: preparationAfter },
    },
    ok: true,
  });
}

export function derivePositionPracticeGrade(
  results: readonly [PositionPracticeInput, PositionPracticeInput, PositionPracticeInput],
  roleId: DepthRoleId,
): PositionPracticeGradeProjection {
  const final = results[2];
  const focusImpact = results.reduce((total, result) => total + result.practiceImpact, 0);
  const bodyContribution = Math.round(
    (final.bodyAfter - PRACTICE_BODY_NEUTRAL_POINT) / PRACTICE_BODY_POINTS_PER_SCORE,
  );
  const preparationTarget = PRACTICE_PREPARATION_TARGET_BY_ROLE[roleId];
  const preparationContribution = Math.round(
    (final.preparationAfter - preparationTarget) / PRACTICE_PREPARATION_POINTS_PER_SCORE,
  );
  const confidenceContribution = Math.round(
    (final.confidenceAfter - PRACTICE_CONFIDENCE_NEUTRAL_POINT) /
      PRACTICE_CONFIDENCE_POINTS_PER_SCORE,
  );
  const breakthroughGaugePoints = Math.min(
    SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX,
    results.reduce((total, result) => total + result.breakthroughGaugePoints, 0),
  );
  return deepFreeze({
    baseScore: PRACTICE_WEEKLY_SCORE_BASE,
    bodyAfterFocus: final.bodyAfter,
    bodyContribution,
    breakthroughGaugePoints,
    confidenceAfterFocus: final.confidenceAfter,
    confidenceContribution,
    focusImpact,
    preparationAfterFocus: final.preparationAfter,
    preparationContribution,
    preparationTarget,
    score: clamp(
      PRACTICE_WEEKLY_SCORE_BASE +
        focusImpact +
        bodyContribution +
        preparationContribution +
        confidenceContribution,
      DEPTH_COMPONENT_BOUNDS.min,
      DEPTH_COMPONENT_BOUNDS.max,
    ),
  });
}

export type PositionPracticeInput = Pick<
  PositionTrainingActionEvidence,
  | 'bodyBefore'
  | 'bodyAfter'
  | 'preparationAfter'
  | 'confidenceAfter'
  | 'practiceImpact'
  | 'breakthroughGaugePoints'
>;
