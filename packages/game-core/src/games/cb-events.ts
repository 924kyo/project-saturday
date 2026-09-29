import { deepFreeze } from '../player/immutable.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import type { CbEventGameModifiers, CbSkillDefinition } from './cb.js';
export type CbEventId = `event_cb_${string}`;
export type CbEventChoiceId = `event_choice_cb_${string}`;
export interface CbEventChoiceEffects {
  readonly bodyDelta: number;
  readonly preparationDelta: number;
  readonly confidenceDelta: number;
  readonly coachTrustDelta: number;
  readonly gpaMilliDelta: number;
  readonly brandDelta: number;
  readonly gameModifiers: CbEventGameModifiers;
}
export interface CbEventChoiceDefinition {
  readonly id: CbEventChoiceId;
  readonly requiresUnlockLevel?: number;
  readonly effects: CbEventChoiceEffects;
}
export interface CbEventDefinition {
  readonly id: CbEventId;
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
  readonly choices: readonly CbEventChoiceDefinition[];
}
export interface CbEventContext {
  readonly weekIndex: number;
  readonly body: number;
  readonly preparation: number;
  readonly confidence: number;
  readonly coachTrust: number;
  readonly gpaMilli: number;
  readonly brand: number;
  readonly contextTags: readonly string[];
  readonly recentEvents: readonly { readonly eventId: CbEventId; readonly weekIndex: number }[];
}
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const int = (v: unknown, min: number, max: number): v is number =>
  Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const bound = (v: number, min?: number, max?: number) =>
  (min === undefined || v >= min) && (max === undefined || v <= max);
export function isCbEventCatalog(value: unknown): value is readonly CbEventDefinition[] {
  if (!Array.isArray(value) || value.length !== 12) return false;
  const ids = new Set<string>();
  const choiceIds = new Set<string>();
  for (const event of value as readonly CbEventDefinition[]) {
    if (
      !event?.id?.startsWith('event_cb_') ||
      ids.has(event.id) ||
      !int(event.weight, 1, 1000) ||
      !int(event.cooldownWeeks, 0, 12) ||
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
    for (const c of event.choices) {
      const e = c.effects;
      if (
        !c.id.startsWith('event_choice_cb_') ||
        choiceIds.has(c.id) ||
        (c.requiresUnlockLevel !== undefined && !int(c.requiresUnlockLevel, 1, 3)) ||
        !int(e.bodyDelta, -30, 30) ||
        !int(e.preparationDelta, -30, 30) ||
        !int(e.confidenceDelta, -30, 30) ||
        !int(e.coachTrustDelta, -30, 30) ||
        !int(e.gpaMilliDelta, -1000, 1000) ||
        !int(e.brandDelta, -30, 30) ||
        !int(e.gameModifiers?.clueBonus, 0, 2) ||
        !int(e.gameModifiers?.decisionScoreFlat, -10, 10) ||
        !int(e.gameModifiers?.targetReductionPermille, 0, 250)
      )
        return false;
      choiceIds.add(c.id);
    }
  }
  return true;
}
function eligible(c: CbEventContext, e: CbEventDefinition) {
  const r = e.requirements;
  const tags = new Set(c.contextTags);
  const last = c.recentEvents
    .filter(({ eventId }) => eventId === e.id)
    .reduce((m, x) => Math.max(m, x.weekIndex), -Infinity);
  return (
    c.weekIndex - last > e.cooldownWeeks &&
    bound(c.body, r.minBody, r.maxBody) &&
    bound(c.preparation, r.minPreparation, r.maxPreparation) &&
    bound(c.confidence, r.minConfidence, r.maxConfidence) &&
    bound(c.coachTrust, r.minCoachTrust, r.maxCoachTrust) &&
    (r.requiredContextTags ?? []).every((tag) => tags.has(tag)) &&
    !(r.excludedContextTags ?? []).some((tag) => tags.has(tag))
  );
}
function draw(rng: RngState, max: number) {
  const s = nextUint32(rng);
  return { value: Math.floor((s.value * max) / 0x1_0000_0000), rng: s.nextRng };
}
export function selectCbEvent(
  context: CbEventContext,
  catalog: readonly CbEventDefinition[],
  chancePermille: number,
  rng: RngState,
) {
  if (
    !isCbEventCatalog(catalog) ||
    !int(context.weekIndex, 0, 1000) ||
    !int(context.body, 0, 100) ||
    !int(context.preparation, 0, 100) ||
    !int(context.confidence, 0, 100) ||
    !int(context.coachTrust, 0, 100) ||
    !int(context.gpaMilli, 0, 4000) ||
    !int(context.brand, 0, 100) ||
    !int(chancePermille, 0, 1000) ||
    !isRngState(rng)
  )
    throw new Error('Invalid CB event selection input.');
  const pool = [...catalog]
    .filter((e) => eligible(context, e))
    .sort((a, b) => a.id.localeCompare(b.id));
  const before = rng.drawCount;
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
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
  const chance = draw(rng, 1000);
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
  for (const e of pool) {
    cursor -= e.weight;
    if (cursor < 0) {
      selected = e;
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
  skills: readonly CbSkillDefinition[],
  type: 'cb_event_choice_unlock' | 'cb_event_positive_multiplier_permille',
) {
  const rows = skills.flatMap((card) =>
    card.effects.filter((e) => e.type === type).map((e) => ({ id: card.id, value: e.value })),
  );
  return {
    value: rows.reduce((s, r) => s + r.value, 0),
    ids: [...new Set(rows.map(({ id }) => id))].sort(),
  };
}
export function getAvailableCbEventChoices(
  event: CbEventDefinition,
  skills: readonly CbSkillDefinition[],
) {
  const level = skill(skills, 'cb_event_choice_unlock').value;
  return event.choices.filter(
    ({ requiresUnlockLevel }) => requiresUnlockLevel === undefined || level >= requiresUnlockLevel,
  );
}
const positive = (v: number, m: number) => (v > 0 ? Math.round((v * m) / 1000) : v);
export function resolveCbEventChoice(
  context: CbEventContext,
  event: CbEventDefinition,
  choiceId: unknown,
  skills: readonly CbSkillDefinition[],
) {
  const choice = getAvailableCbEventChoices(event, skills).find(({ id }) => id === choiceId);
  if (!choice) throw new Error('CB event choice is unavailable.');
  const boost = skill(skills, 'cb_event_positive_multiplier_permille');
  const multiplier = clamp(1000 + boost.value, 1000, 1500);
  const r = choice.effects;
  const scaled = {
    bodyDelta: positive(r.bodyDelta, multiplier),
    preparationDelta: positive(r.preparationDelta, multiplier),
    confidenceDelta: positive(r.confidenceDelta, multiplier),
    coachTrustDelta: positive(r.coachTrustDelta, multiplier),
    gpaMilliDelta: positive(r.gpaMilliDelta, multiplier),
    brandDelta: positive(r.brandDelta, multiplier),
    gameModifiers: {
      clueBonus: positive(r.gameModifiers.clueBonus, multiplier),
      decisionScoreFlat: positive(r.gameModifiers.decisionScoreFlat, multiplier),
      targetReductionPermille: positive(r.gameModifiers.targetReductionPermille, multiplier),
    },
  };
  const next = {
    weekIndex: context.weekIndex,
    body: clamp(context.body + scaled.bodyDelta, 0, 100),
    preparation: clamp(context.preparation + scaled.preparationDelta, 0, 100),
    confidence: clamp(context.confidence + scaled.confidenceDelta, 0, 100),
    coachTrust: clamp(context.coachTrust + scaled.coachTrustDelta, 0, 100),
    gpaMilli: clamp(context.gpaMilli + scaled.gpaMilliDelta, 0, 4000),
    brand: clamp(context.brand + scaled.brandDelta, 0, 100),
  };
  const applied: CbEventChoiceEffects = {
    bodyDelta: next.body - context.body,
    preparationDelta: next.preparation - context.preparation,
    confidenceDelta: next.confidence - context.confidence,
    coachTrustDelta: next.coachTrust - context.coachTrust,
    gpaMilliDelta: next.gpaMilli - context.gpaMilli,
    brandDelta: next.brand - context.brand,
    gameModifiers: {
      clueBonus: clamp(scaled.gameModifiers.clueBonus, 0, 2),
      decisionScoreFlat: clamp(scaled.gameModifiers.decisionScoreFlat, -10, 10),
      targetReductionPermille: clamp(scaled.gameModifiers.targetReductionPermille, 0, 250),
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
      requestedEffects: r,
      appliedEffects: applied,
    },
  });
}
