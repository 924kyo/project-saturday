import { deepFreeze } from '../player/immutable.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import type { RbEventGameModifiers, RbSkillDefinition } from './rb.js';

export type RbEventId = `event_rb_${string}`;
export type RbEventChoiceId = `event_choice_rb_${string}`;

export interface RbEventChoiceEffects {
  readonly bodyDelta: number;
  readonly preparationDelta: number;
  readonly confidenceDelta: number;
  readonly coachTrustDelta: number;
  readonly gpaMilliDelta: number;
  readonly brandDelta: number;
  readonly gameModifiers: RbEventGameModifiers;
}

export interface RbEventChoiceDefinition {
  readonly id: RbEventChoiceId;
  readonly requiresUnlockLevel?: number;
  readonly effects: RbEventChoiceEffects;
}

export interface RbEventDefinition {
  readonly id: RbEventId;
  readonly weight: number;
  readonly cooldownWeeks: number;
  readonly requirements: {
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
  };
  readonly choices: readonly RbEventChoiceDefinition[];
}

export interface RbEventContext {
  readonly weekIndex: number;
  readonly body: number;
  readonly preparation: number;
  readonly confidence: number;
  readonly coachTrust: number;
  readonly gpaMilli: number;
  readonly brand: number;
  readonly contextTags: readonly string[];
  readonly recentEvents: readonly { readonly eventId: RbEventId; readonly weekIndex: number }[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const integerIn = (value: unknown, min: number, max: number): value is number =>
  Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
const bound = (value: number, min?: number, max?: number) =>
  (min === undefined || value >= min) && (max === undefined || value <= max);

export function isRbEventCatalog(value: unknown): value is readonly RbEventDefinition[] {
  if (!Array.isArray(value) || value.length !== 12) return false;
  const ids = new Set<string>();
  const choices = new Set<string>();
  for (const event of value as readonly RbEventDefinition[]) {
    if (
      !event?.id?.startsWith('event_rb_') ||
      ids.has(event.id) ||
      !integerIn(event.weight, 1, 1_000) ||
      !integerIn(event.cooldownWeeks, 0, 12) ||
      event.choices.length < 2 ||
      event.choices.length > 3
    )
      return false;
    ids.add(event.id);
    const r = event.requirements;
    if (
      !bound(r.minBody ?? 0, 0, 100) ||
      !bound(r.maxBody ?? 100, 0, 100) ||
      (r.minBody ?? 0) > (r.maxBody ?? 100) ||
      !bound(r.minPreparation ?? 0, 0, 100) ||
      !bound(r.maxPreparation ?? 100, 0, 100) ||
      (r.minPreparation ?? 0) > (r.maxPreparation ?? 100) ||
      !bound(r.minConfidence ?? 0, 0, 100) ||
      !bound(r.maxConfidence ?? 100, 0, 100) ||
      (r.minConfidence ?? 0) > (r.maxConfidence ?? 100) ||
      !bound(r.minCoachTrust ?? 0, 0, 100) ||
      !bound(r.maxCoachTrust ?? 100, 0, 100) ||
      (r.minCoachTrust ?? 0) > (r.maxCoachTrust ?? 100)
    )
      return false;
    for (const choice of event.choices) {
      const e = choice.effects;
      if (
        !choice.id.startsWith('event_choice_rb_') ||
        choices.has(choice.id) ||
        (choice.requiresUnlockLevel !== undefined &&
          !integerIn(choice.requiresUnlockLevel, 1, 3)) ||
        !integerIn(e.bodyDelta, -30, 30) ||
        !integerIn(e.preparationDelta, -30, 30) ||
        !integerIn(e.confidenceDelta, -30, 30) ||
        !integerIn(e.coachTrustDelta, -30, 30) ||
        !integerIn(e.gpaMilliDelta, -1_000, 1_000) ||
        !integerIn(e.brandDelta, -30, 30) ||
        !integerIn(e.gameModifiers?.clueBonus, 0, 2) ||
        !integerIn(e.gameModifiers?.decisionScoreFlat, -10, 10) ||
        !integerIn(e.gameModifiers?.contactReductionPermille, 0, 250)
      )
        return false;
      choices.add(choice.id);
    }
  }
  return true;
}

function eligible(context: RbEventContext, event: RbEventDefinition): boolean {
  const r = event.requirements;
  const tags = new Set(context.contextTags);
  const last = context.recentEvents
    .filter(({ eventId }) => eventId === event.id)
    .reduce((max, item) => Math.max(max, item.weekIndex), -Infinity);
  return (
    context.weekIndex - last > event.cooldownWeeks &&
    bound(context.body, r.minBody, r.maxBody) &&
    bound(context.preparation, r.minPreparation, r.maxPreparation) &&
    bound(context.confidence, r.minConfidence, r.maxConfidence) &&
    bound(context.coachTrust, r.minCoachTrust, r.maxCoachTrust) &&
    (r.requiredContextTags ?? []).every((tag) => tags.has(tag)) &&
    !(r.excludedContextTags ?? []).some((tag) => tags.has(tag))
  );
}

function draw(rng: RngState, max: number) {
  const sample = nextUint32(rng);
  return { value: Math.floor((sample.value * max) / 0x1_0000_0000), rng: sample.nextRng };
}

export function selectRbEvent(
  context: RbEventContext,
  catalog: readonly RbEventDefinition[],
  chancePermille: number,
  rng: RngState,
) {
  if (
    !isRbEventCatalog(catalog) ||
    !integerIn(context.weekIndex, 0, 1_000) ||
    !integerIn(context.body, 0, 100) ||
    !integerIn(context.preparation, 0, 100) ||
    !integerIn(context.confidence, 0, 100) ||
    !integerIn(context.coachTrust, 0, 100) ||
    !integerIn(context.gpaMilli, 0, 4_000) ||
    !integerIn(context.brand, 0, 100) ||
    !integerIn(chancePermille, 0, 1_000) ||
    !isRngState(rng)
  )
    throw new Error('Invalid RB event selection input.');
  const pool = [...catalog]
    .filter((event) => eligible(context, event))
    .sort((a, b) => a.id.localeCompare(b.id));
  const before = rng.drawCount;
  const totalWeight = pool.reduce((sum, event) => sum + event.weight, 0);
  if (pool.length === 0 || chancePermille === 0)
    return deepFreeze({
      event: undefined,
      evidence: {
        eligibleEventIds: pool.map(({ id }) => id),
        chancePermille,
        totalWeight,
        rngDrawCountBefore: before,
        rngDrawCountAfter: before,
      },
      rng,
    });
  const chance = draw(rng, 1_000);
  if (chance.value >= chancePermille)
    return deepFreeze({
      event: undefined,
      evidence: {
        eligibleEventIds: pool.map(({ id }) => id),
        chancePermille,
        chanceRoll: chance.value,
        totalWeight,
        rngDrawCountBefore: before,
        rngDrawCountAfter: chance.rng.drawCount,
      },
      rng: chance.rng,
    });
  const weighted = draw(chance.rng, totalWeight);
  let cursor = weighted.value;
  let selected = pool[pool.length - 1]!;
  for (const event of pool) {
    cursor -= event.weight;
    if (cursor < 0) {
      selected = event;
      break;
    }
  }
  return deepFreeze({
    event: selected,
    evidence: {
      eligibleEventIds: pool.map(({ id }) => id),
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

function skill(
  skills: readonly RbSkillDefinition[],
  type: 'rb_event_choice_unlock' | 'rb_event_positive_multiplier_permille',
) {
  const rows = skills.flatMap((card) =>
    card.effects
      .filter((effect) => effect.type === type)
      .map((effect) => ({ id: card.id, value: effect.value })),
  );
  return {
    value: rows.reduce((sum, row) => sum + row.value, 0),
    ids: [...new Set(rows.map(({ id }) => id))].sort(),
  };
}

export function getAvailableRbEventChoices(
  event: RbEventDefinition,
  skills: readonly RbSkillDefinition[],
) {
  const level = skill(skills, 'rb_event_choice_unlock').value;
  return event.choices.filter(
    ({ requiresUnlockLevel }) => requiresUnlockLevel === undefined || level >= requiresUnlockLevel,
  );
}

const positive = (value: number, multiplier: number) =>
  value > 0 ? Math.round((value * multiplier) / 1_000) : value;

export function resolveRbEventChoice(
  context: RbEventContext,
  event: RbEventDefinition,
  choiceId: unknown,
  skills: readonly RbSkillDefinition[],
) {
  const choice = getAvailableRbEventChoices(event, skills).find(({ id }) => id === choiceId);
  if (!choice) throw new Error('RB event choice is unavailable.');
  const boost = skill(skills, 'rb_event_positive_multiplier_permille');
  const multiplier = clamp(1_000 + boost.value, 1_000, 1_500);
  const requested = choice.effects;
  const scaled = {
    bodyDelta: positive(requested.bodyDelta, multiplier),
    preparationDelta: positive(requested.preparationDelta, multiplier),
    confidenceDelta: positive(requested.confidenceDelta, multiplier),
    coachTrustDelta: positive(requested.coachTrustDelta, multiplier),
    gpaMilliDelta: positive(requested.gpaMilliDelta, multiplier),
    brandDelta: positive(requested.brandDelta, multiplier),
    gameModifiers: {
      clueBonus: positive(requested.gameModifiers.clueBonus, multiplier),
      decisionScoreFlat: positive(requested.gameModifiers.decisionScoreFlat, multiplier),
      contactReductionPermille: positive(
        requested.gameModifiers.contactReductionPermille,
        multiplier,
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
  const applied: RbEventChoiceEffects = {
    bodyDelta: next.body - context.body,
    preparationDelta: next.preparation - context.preparation,
    confidenceDelta: next.confidence - context.confidence,
    coachTrustDelta: next.coachTrust - context.coachTrust,
    gpaMilliDelta: next.gpaMilli - context.gpaMilli,
    brandDelta: next.brand - context.brand,
    gameModifiers: {
      clueBonus: clamp(scaled.gameModifiers.clueBonus, 0, 2),
      decisionScoreFlat: clamp(scaled.gameModifiers.decisionScoreFlat, -10, 10),
      contactReductionPermille: clamp(scaled.gameModifiers.contactReductionPermille, 0, 250),
    },
  };
  return deepFreeze({
    nextContext: next,
    gameModifiers: applied.gameModifiers,
    evidence: {
      eventId: event.id,
      choiceId: choice.id,
      positiveMultiplierPermille: multiplier,
      appliedSkillIds: boost.ids,
      requestedEffects: requested,
      appliedEffects: applied,
    },
  });
}
