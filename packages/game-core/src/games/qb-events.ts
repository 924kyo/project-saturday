import { deepFreeze } from '../player/immutable.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import type { QbEventGameModifiers, QbSkillDefinition } from './qb.js';

export type QbEventId = `event_qb_${string}`;
export type QbEventChoiceId = `event_choice_qb_${string}`;

export interface QbEventRequirements {
  readonly minBody?: number;
  readonly maxBody?: number;
  readonly minPreparation?: number;
  readonly maxPreparation?: number;
  readonly minConfidence?: number;
  readonly maxConfidence?: number;
  readonly minCoachTrust?: number;
  readonly maxCoachTrust?: number;
  readonly requiredContextTags?: readonly string[];
  readonly excludedContextTags?: readonly string[];
}

export interface QbEventChoiceEffects {
  readonly bodyDelta: number;
  readonly preparationDelta: number;
  readonly confidenceDelta: number;
  readonly coachTrustDelta: number;
  readonly gpaMilliDelta: number;
  readonly brandDelta: number;
  readonly gameModifiers: QbEventGameModifiers;
}

export interface QbEventChoiceDefinition {
  readonly id: QbEventChoiceId;
  readonly requiresUnlockLevel?: number;
  readonly effects: QbEventChoiceEffects;
}

export interface QbEventDefinition {
  readonly id: QbEventId;
  readonly weight: number;
  readonly cooldownWeeks: number;
  readonly requirements: QbEventRequirements;
  readonly choices: readonly QbEventChoiceDefinition[];
}

export interface QbEventContext {
  readonly weekIndex: number;
  readonly body: number;
  readonly preparation: number;
  readonly confidence: number;
  readonly coachTrust: number;
  readonly gpaMilli: number;
  readonly brand: number;
  readonly contextTags: readonly string[];
  readonly recentEvents: readonly {
    readonly eventId: QbEventId;
    readonly weekIndex: number;
  }[];
}

export interface QbEventSelectionEvidence {
  readonly eligibleEventIds: readonly QbEventId[];
  readonly chancePermille: number;
  readonly chanceRoll?: number;
  readonly weightedRoll?: number;
  readonly totalWeight: number;
  readonly selectedEventId?: QbEventId;
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface QbEventSelectionResult {
  readonly event?: QbEventDefinition;
  readonly evidence: QbEventSelectionEvidence;
  readonly rng: RngState;
}

export interface QbEventResolutionEvidence {
  readonly eventId: QbEventId;
  readonly choiceId: QbEventChoiceId;
  readonly positiveMultiplierPermille: number;
  readonly appliedSkillIds: readonly string[];
  readonly requestedEffects: QbEventChoiceEffects;
  readonly appliedEffects: QbEventChoiceEffects;
}

export interface QbEventResolutionResult {
  readonly nextContext: Omit<QbEventContext, 'contextTags' | 'recentEvents'>;
  readonly gameModifiers: QbEventGameModifiers;
  readonly evidence: QbEventResolutionEvidence;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isIntegerIn(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function meetsBound(value: number, minimum?: number, maximum?: number): boolean {
  return (minimum === undefined || value >= minimum) && (maximum === undefined || value <= maximum);
}

function validateRequirements(requirements: QbEventRequirements): boolean {
  return (
    meetsBound(requirements.minBody ?? 0, 0, 100) &&
    meetsBound(requirements.maxBody ?? 100, 0, 100) &&
    meetsBound(requirements.minPreparation ?? 0, 0, 100) &&
    meetsBound(requirements.maxPreparation ?? 100, 0, 100) &&
    meetsBound(requirements.minConfidence ?? 0, 0, 100) &&
    meetsBound(requirements.maxConfidence ?? 100, 0, 100) &&
    meetsBound(requirements.minCoachTrust ?? 0, 0, 100) &&
    meetsBound(requirements.maxCoachTrust ?? 100, 0, 100) &&
    (requirements.minBody ?? 0) <= (requirements.maxBody ?? 100) &&
    (requirements.minPreparation ?? 0) <= (requirements.maxPreparation ?? 100) &&
    (requirements.minConfidence ?? 0) <= (requirements.maxConfidence ?? 100) &&
    (requirements.minCoachTrust ?? 0) <= (requirements.maxCoachTrust ?? 100) &&
    (requirements.requiredContextTags === undefined ||
      new Set(requirements.requiredContextTags).size === requirements.requiredContextTags.length) &&
    (requirements.excludedContextTags === undefined ||
      new Set(requirements.excludedContextTags).size === requirements.excludedContextTags.length)
  );
}

function validateEffects(effects: QbEventChoiceEffects): boolean {
  return (
    isIntegerIn(effects.bodyDelta, -30, 30) &&
    isIntegerIn(effects.preparationDelta, -30, 30) &&
    isIntegerIn(effects.confidenceDelta, -30, 30) &&
    isIntegerIn(effects.coachTrustDelta, -30, 30) &&
    isIntegerIn(effects.gpaMilliDelta, -1_000, 1_000) &&
    isIntegerIn(effects.brandDelta, -30, 30) &&
    isIntegerIn(effects.gameModifiers?.clueBonus, 0, 2) &&
    isIntegerIn(effects.gameModifiers?.decisionScoreFlat, -10, 10) &&
    isIntegerIn(effects.gameModifiers?.pressureReductionPermille, 0, 250)
  );
}

export function isQbEventCatalog(value: unknown): value is readonly QbEventDefinition[] {
  if (!Array.isArray(value) || value.length !== 12) return false;
  const ids = new Set<string>();
  const choiceIds = new Set<string>();
  for (const event of value as readonly QbEventDefinition[]) {
    if (
      typeof event?.id !== 'string' ||
      !event.id.startsWith('event_qb_') ||
      ids.has(event.id) ||
      !isIntegerIn(event.weight, 1, 1_000) ||
      !isIntegerIn(event.cooldownWeeks, 0, 12) ||
      !validateRequirements(event.requirements) ||
      !Array.isArray(event.choices) ||
      event.choices.length < 2 ||
      event.choices.length > 3
    )
      return false;
    ids.add(event.id);
    for (const choice of event.choices) {
      if (
        typeof choice?.id !== 'string' ||
        !choice.id.startsWith('event_choice_qb_') ||
        choiceIds.has(choice.id) ||
        (choice.requiresUnlockLevel !== undefined &&
          !isIntegerIn(choice.requiresUnlockLevel, 1, 3)) ||
        !validateEffects(choice.effects)
      )
        return false;
      choiceIds.add(choice.id);
    }
  }
  return true;
}

function isEligible(context: QbEventContext, event: QbEventDefinition): boolean {
  const requirements = event.requirements;
  const tags = new Set(context.contextTags);
  const lastOccurrence = context.recentEvents
    .filter(({ eventId }) => eventId === event.id)
    .reduce((latest, occurrence) => Math.max(latest, occurrence.weekIndex), -Infinity);
  return (
    context.weekIndex - lastOccurrence > event.cooldownWeeks &&
    meetsBound(context.body, requirements.minBody, requirements.maxBody) &&
    meetsBound(context.preparation, requirements.minPreparation, requirements.maxPreparation) &&
    meetsBound(context.confidence, requirements.minConfidence, requirements.maxConfidence) &&
    meetsBound(context.coachTrust, requirements.minCoachTrust, requirements.maxCoachTrust) &&
    (requirements.requiredContextTags ?? []).every((tag) => tags.has(tag)) &&
    !(requirements.excludedContextTags ?? []).some((tag) => tags.has(tag))
  );
}

function mappedDraw(rng: RngState, maximumExclusive: number) {
  const sample = nextUint32(rng);
  return {
    value: Math.floor((sample.value * maximumExclusive) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

export function selectQbEvent(
  context: QbEventContext,
  catalog: readonly QbEventDefinition[],
  chancePermille: number,
  rng: RngState,
): QbEventSelectionResult {
  if (
    !isQbEventCatalog(catalog) ||
    !isIntegerIn(context.weekIndex, 0, 1_000) ||
    !isIntegerIn(context.body, 0, 100) ||
    !isIntegerIn(context.preparation, 0, 100) ||
    !isIntegerIn(context.confidence, 0, 100) ||
    !isIntegerIn(context.coachTrust, 0, 100) ||
    !isIntegerIn(context.gpaMilli, 0, 4_000) ||
    !isIntegerIn(context.brand, 0, 100) ||
    !isIntegerIn(chancePermille, 0, 1_000) ||
    !isRngState(rng)
  ) {
    throw new Error('Invalid QB event selection input.');
  }
  const eligible = [...catalog]
    .filter((event) => isEligible(context, event))
    .sort((left, right) => left.id.localeCompare(right.id));
  const before = rng.drawCount;
  if (eligible.length === 0 || chancePermille === 0) {
    return deepFreeze({
      evidence: {
        eligibleEventIds: eligible.map(({ id }) => id),
        chancePermille,
        totalWeight: eligible.reduce((sum, event) => sum + event.weight, 0),
        rngDrawCountBefore: before,
        rngDrawCountAfter: before,
      },
      rng,
    });
  }
  const chance = mappedDraw(rng, 1_000);
  const totalWeight = eligible.reduce((sum, event) => sum + event.weight, 0);
  if (chance.value >= chancePermille) {
    return deepFreeze({
      evidence: {
        eligibleEventIds: eligible.map(({ id }) => id),
        chancePermille,
        chanceRoll: chance.value,
        totalWeight,
        rngDrawCountBefore: before,
        rngDrawCountAfter: chance.rng.drawCount,
      },
      rng: chance.rng,
    });
  }
  const weighted = mappedDraw(chance.rng, totalWeight);
  let cursor = weighted.value;
  let selected = eligible[eligible.length - 1]!;
  for (const event of eligible) {
    cursor -= event.weight;
    if (cursor < 0) {
      selected = event;
      break;
    }
  }
  return deepFreeze({
    event: selected,
    evidence: {
      eligibleEventIds: eligible.map(({ id }) => id),
      chancePermille,
      chanceRoll: chance.value,
      weightedRoll: weighted.value,
      totalWeight,
      selectedEventId: selected.id,
      rngDrawCountBefore: before,
      rngDrawCountAfter: weighted.rng.drawCount,
    },
    rng: weighted.rng,
  });
}

function skillValue(
  skills: readonly QbSkillDefinition[],
  type: string,
): {
  value: number;
  skillIds: string[];
} {
  let value = 0;
  const skillIds: string[] = [];
  for (const skill of skills) {
    for (const effect of skill.effects) {
      if (effect.type === type) {
        value += effect.value;
        skillIds.push(skill.id);
      }
    }
  }
  return { value, skillIds: [...new Set(skillIds)].sort() };
}

export function getAvailableQbEventChoices(
  event: QbEventDefinition,
  skills: readonly QbSkillDefinition[],
): readonly QbEventChoiceDefinition[] {
  const unlockLevel = skillValue(skills, 'qb_event_choice_unlock').value;
  return event.choices.filter(
    ({ requiresUnlockLevel }) =>
      requiresUnlockLevel === undefined || unlockLevel >= requiresUnlockLevel,
  );
}

function multiplyPositive(value: number, multiplierPermille: number): number {
  return value > 0 ? Math.round((value * multiplierPermille) / 1_000) : value;
}

export function resolveQbEventChoice(
  context: QbEventContext,
  event: QbEventDefinition,
  choiceId: unknown,
  skills: readonly QbSkillDefinition[],
): QbEventResolutionResult {
  const choice = getAvailableQbEventChoices(event, skills).find(({ id }) => id === choiceId);
  if (choice === undefined) throw new Error('QB event choice is unavailable.');
  const multiplier = skillValue(skills, 'qb_event_positive_multiplier_permille');
  const positiveMultiplierPermille = clamp(1_000 + multiplier.value, 1_000, 1_500);
  const requested = choice.effects;
  const scaled = {
    bodyDelta: multiplyPositive(requested.bodyDelta, positiveMultiplierPermille),
    preparationDelta: multiplyPositive(requested.preparationDelta, positiveMultiplierPermille),
    confidenceDelta: multiplyPositive(requested.confidenceDelta, positiveMultiplierPermille),
    coachTrustDelta: multiplyPositive(requested.coachTrustDelta, positiveMultiplierPermille),
    gpaMilliDelta: multiplyPositive(requested.gpaMilliDelta, positiveMultiplierPermille),
    brandDelta: multiplyPositive(requested.brandDelta, positiveMultiplierPermille),
    gameModifiers: {
      clueBonus: multiplyPositive(requested.gameModifiers.clueBonus, positiveMultiplierPermille),
      decisionScoreFlat: multiplyPositive(
        requested.gameModifiers.decisionScoreFlat,
        positiveMultiplierPermille,
      ),
      pressureReductionPermille: multiplyPositive(
        requested.gameModifiers.pressureReductionPermille,
        positiveMultiplierPermille,
      ),
    },
  };
  const next = {
    weekIndex: context.weekIndex,
    body: clamp(context.body + scaled.bodyDelta, 0, 100),
    preparation: clamp(context.preparation + scaled.preparationDelta, 0, 100),
    confidence: clamp(context.confidence + scaled.confidenceDelta, 0, 100),
    coachTrust: clamp(context.coachTrust + scaled.coachTrustDelta, 0, 100),
    gpaMilli: clamp(context.gpaMilli + scaled.gpaMilliDelta, 0, 4_000),
    brand: clamp(context.brand + scaled.brandDelta, 0, 100),
  };
  const applied: QbEventChoiceEffects = {
    bodyDelta: next.body - context.body,
    preparationDelta: next.preparation - context.preparation,
    confidenceDelta: next.confidence - context.confidence,
    coachTrustDelta: next.coachTrust - context.coachTrust,
    gpaMilliDelta: next.gpaMilli - context.gpaMilli,
    brandDelta: next.brand - context.brand,
    gameModifiers: {
      clueBonus: clamp(scaled.gameModifiers.clueBonus, 0, 2),
      decisionScoreFlat: clamp(scaled.gameModifiers.decisionScoreFlat, -10, 10),
      pressureReductionPermille: clamp(scaled.gameModifiers.pressureReductionPermille, 0, 250),
    },
  };
  return deepFreeze({
    nextContext: next,
    gameModifiers: applied.gameModifiers,
    evidence: {
      eventId: event.id,
      choiceId: choice.id,
      positiveMultiplierPermille,
      appliedSkillIds: multiplier.skillIds,
      requestedEffects: requested,
      appliedEffects: applied,
    },
  });
}
