import { deepFreeze } from '../player/immutable.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import {
  defenderSkillValue,
  type DefenderEventGameModifiers,
  type DefenderPositionId,
  type DefenderSkillDefinition,
} from './defender.js';

/**
 * Weekly events for the front-seven defenders: the shipped position-event semantics (state and tag
 * eligibility, cooldowns, one chance draw then one weighted draw, positive-only card multiplier,
 * skill-unlocked third choices) over a position-parameterized ID space.
 */
export interface DefenderEventChoiceEffects {
  readonly bodyDelta: number;
  readonly preparationDelta: number;
  readonly confidenceDelta: number;
  readonly coachTrustDelta: number;
  readonly gpaMilliDelta: number;
  readonly brandDelta: number;
  readonly gameModifiers: DefenderEventGameModifiers;
}

/**
 * The position-neutral weekly event shape these rules run on (defender catalogs and the shared
 * Career VNext life catalog both use it).
 */
export interface WeeklyEventDefinitionV2 {
  readonly id: `event_${string}`;
  readonly weight: number;
  readonly cooldownWeeks: number;
  readonly requirements: DefenderEventDefinition['requirements'];
  readonly choices: readonly {
    readonly id: `event_choice_${string}`;
    readonly requiresUnlockLevel?: number;
    readonly effects: DefenderEventChoiceEffects;
  }[];
}

export interface DefenderEventChoiceDefinition {
  readonly id: `event_choice_${'lb' | 'edge'}_${string}`;
  readonly requiresUnlockLevel?: number;
  readonly effects: DefenderEventChoiceEffects;
}

export interface DefenderEventDefinition {
  readonly id: `event_${'lb' | 'edge'}_${string}`;
  readonly positionId: DefenderPositionId;
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
  };
  readonly choices: readonly DefenderEventChoiceDefinition[];
}

export interface DefenderEventContext {
  readonly weekIndex: number;
  readonly body: number;
  readonly preparation: number;
  readonly confidence: number;
  readonly coachTrust: number;
  readonly gpaMilli: number;
  readonly brand: number;
  readonly recentEvents: readonly { readonly eventId: string; readonly weekIndex: number }[];
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const integerIn = (value: unknown, minimum: number, maximum: number): value is number =>
  Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
const within = (value: number, minimum?: number, maximum?: number) =>
  (minimum === undefined || value >= minimum) && (maximum === undefined || value <= maximum);

export function isDefenderEventCatalog(
  positionId: DefenderPositionId,
  value: unknown,
): value is readonly DefenderEventDefinition[] {
  const code = positionId === 'position_lb' ? 'lb' : 'edge';
  if (!Array.isArray(value) || value.length !== 12) return false;
  const ids = new Set<string>();
  const choiceIds = new Set<string>();
  for (const event of value as readonly DefenderEventDefinition[]) {
    if (
      !event?.id?.startsWith(`event_${code}_`) ||
      event.positionId !== positionId ||
      ids.has(event.id) ||
      !integerIn(event.weight, 1, 1000) ||
      !integerIn(event.cooldownWeeks, 0, 12) ||
      event.choices.length < 2 ||
      event.choices.length > 3
    )
      return false;
    ids.add(event.id);
    for (const choice of event.choices) {
      const effects = choice.effects;
      if (
        !choice.id.startsWith(`event_choice_${code}_`) ||
        choiceIds.has(choice.id) ||
        (choice.requiresUnlockLevel !== undefined &&
          !integerIn(choice.requiresUnlockLevel, 1, 3)) ||
        !integerIn(effects.bodyDelta, -30, 30) ||
        !integerIn(effects.preparationDelta, -30, 30) ||
        !integerIn(effects.confidenceDelta, -30, 30) ||
        !integerIn(effects.coachTrustDelta, -30, 30) ||
        !integerIn(effects.gpaMilliDelta, -1000, 1000) ||
        !integerIn(effects.brandDelta, -30, 30) ||
        !integerIn(effects.gameModifiers?.clueBonus, 0, 2) ||
        !integerIn(effects.gameModifiers?.decisionScoreFlat, -10, 10) ||
        !integerIn(effects.gameModifiers?.exposureReductionPermille, 0, 250)
      )
        return false;
      choiceIds.add(choice.id);
    }
  }
  return true;
}

function eligible(context: DefenderEventContext, event: WeeklyEventDefinitionV2): boolean {
  const requirements = event.requirements;
  const last = context.recentEvents
    .filter(({ eventId }) => eventId === event.id)
    .reduce((latest, entry) => Math.max(latest, entry.weekIndex), -Infinity);
  return (
    context.weekIndex - last > event.cooldownWeeks &&
    within(context.body, requirements.minBody, requirements.maxBody) &&
    within(context.preparation, requirements.minPreparation, requirements.maxPreparation) &&
    within(context.confidence, requirements.minConfidence, requirements.maxConfidence) &&
    within(context.coachTrust, requirements.minCoachTrust, requirements.maxCoachTrust)
  );
}

function draw(rng: RngState, maximum: number) {
  const sample = nextUint32(rng);
  return { value: Math.floor((sample.value * maximum) / 0x1_0000_0000), rng: sample.nextRng };
}

/** No eligible event or a zero chance consumes no draw; a miss consumes one; a pick two. */
export function selectDefenderEvent<T extends WeeklyEventDefinitionV2>(
  context: DefenderEventContext,
  catalog: readonly T[],
  chancePermille: number,
  rng: RngState,
): { readonly event: T | undefined; readonly rng: RngState } {
  if (!integerIn(chancePermille, 0, 1000) || !isRngState(rng))
    throw new Error('Invalid defender event selection input.');
  const pool = [...catalog]
    .filter((event) => eligible(context, event))
    .sort((left, right) => (left.id < right.id ? -1 : 1));
  if (pool.length === 0 || chancePermille === 0) return { event: undefined, rng };
  const chance = draw(rng, 1000);
  if (chance.value >= chancePermille) return { event: undefined, rng: chance.rng };
  const total = pool.reduce((sum, event) => sum + event.weight, 0);
  const weighted = draw(chance.rng, total);
  let cursor = weighted.value;
  for (const event of pool) {
    cursor -= event.weight;
    if (cursor < 0) return { event, rng: weighted.rng };
  }
  return { event: pool[pool.length - 1], rng: weighted.rng };
}

export function getAvailableDefenderEventChoices<T extends WeeklyEventDefinitionV2>(
  event: T,
  skills: readonly DefenderSkillDefinition[],
): T['choices'] {
  const level = defenderSkillValue(skills, 'defender_event_choice_unlock');
  return event.choices.filter(
    ({ requiresUnlockLevel }) => requiresUnlockLevel === undefined || level >= requiresUnlockLevel,
  );
}

const positive = (value: number, multiplier: number) =>
  value > 0 ? Math.round((value * multiplier) / 1000) : value;

export function resolveDefenderEventChoice(
  context: DefenderEventContext,
  event: WeeklyEventDefinitionV2,
  choiceId: unknown,
  skills: readonly DefenderSkillDefinition[],
) {
  const choice = getAvailableDefenderEventChoices(event, skills).find(({ id }) => id === choiceId);
  if (choice === undefined) return null;
  const multiplier = clamp(
    1000 + defenderSkillValue(skills, 'defender_event_positive_multiplier_permille'),
    1000,
    1500,
  );
  const requested = choice.effects;
  const next = {
    body: clamp(context.body + positive(requested.bodyDelta, multiplier), 0, 100),
    preparation: clamp(
      context.preparation + positive(requested.preparationDelta, multiplier),
      0,
      100,
    ),
    confidence: clamp(context.confidence + positive(requested.confidenceDelta, multiplier), 0, 100),
    coachTrust: clamp(context.coachTrust + positive(requested.coachTrustDelta, multiplier), 0, 100),
    gpaMilli: clamp(context.gpaMilli + positive(requested.gpaMilliDelta, multiplier), 0, 4000),
    brand: clamp(context.brand + positive(requested.brandDelta, multiplier), 0, 100),
  };
  return deepFreeze({
    nextContext: next,
    gameModifiers: {
      clueBonus: clamp(positive(requested.gameModifiers.clueBonus, multiplier), 0, 2),
      decisionScoreFlat: clamp(
        positive(requested.gameModifiers.decisionScoreFlat, multiplier),
        -10,
        10,
      ),
      exposureReductionPermille: clamp(
        positive(requested.gameModifiers.exposureReductionPermille, multiplier),
        0,
        250,
      ),
    },
  });
}
