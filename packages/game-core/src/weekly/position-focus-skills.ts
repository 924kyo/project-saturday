import {
  BODY_BOUNDS,
  PREPARATION_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
} from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { NewInjuryEvidence } from '../injuries/types.js';
import {
  collectWeeklySkillEffects,
  deriveSkillModifiedBodyDelta,
  deriveSkillModifiedGpaDelta,
  type SkillEffectLoadout,
  type SkillActionTarget,
  type WeeklySkillEffectContext,
} from '../skills/effects.js';
import type { SkillMechanicsDefinition } from '../skills/types.js';
import type { WeeklyActionDefinition } from './types.js';
import {
  applyPositionTrainingXp,
  type PositionTrainingActionDefinition,
} from './position-training.js';
import type { DevelopmentWeekConfig } from './tuning.js';
import {
  resolvePositionFocus,
  type PositionFocusStateV2,
  type PositionFocusInjuryPolicies,
  type ResolvePositionFocusResult,
} from './position-focus.js';

const bounded = (value: number, bounds: { readonly min: number; readonly max: number }) =>
  Math.min(bounds.max, Math.max(bounds.min, value));
const milliGpa = (value: number) => Math.round(value * 1000) / 1000;

/** Reuse base action validation/proficiency and shared effects; never roll gameplay RNG. */
export function resolvePositionFocusWithSkills(
  input: PositionFocusStateV2,
  definition: PositionTrainingActionDefinition | WeeklyActionDefinition,
  config: DevelopmentWeekConfig,
  injury: NewInjuryEvidence | null,
  policies: PositionFocusInjuryPolicies,
  loadout: SkillEffectLoadout,
  definitions: readonly SkillMechanicsDefinition[],
  target: SkillActionTarget,
  context: WeeklySkillEffectContext,
): ResolvePositionFocusResult {
  const base = resolvePositionFocus(input, definition, config, injury, policies);
  if (!base.ok) return base;
  // The owning content/command supplies tags; IDs, XP, cost, and order must still
  // refer to the actual action rather than an invented WR action surrogate.
  if (
    target.id !== definition.id ||
    context.actionId !== definition.id ||
    context.body !== input.training.state.body ||
    context.planActionIds.length !== 3 ||
    context.planActionIds[context.actionIndex] !== definition.id ||
    context.previousActionId !==
      (context.actionIndex === 0 ? null : context.planActionIds[context.actionIndex - 1]) ||
    target.bodyDelta !== definition.bodyDelta ||
    JSON.stringify(target.attributeXp) !== JSON.stringify(definition.attributeXp)
  )
    return { ok: false, reason: 'position_focus.invalid_input' };
  const skills = collectWeeklySkillEffects(loadout, definitions, target, context);
  if (!skills.ok) return { ok: false, reason: 'position_focus.invalid_input' };
  const aggregates = skills.aggregates;
  const attributes = { ...input.training.attributes };
  const attributeXp = definition.attributeXp.map(({ attributeId, baseXp }) => {
    const evidence = applyPositionTrainingXp(
      attributes[attributeId]!,
      attributeId,
      baseXp,
      base.evidence.bodyXpEfficiencyPermille,
      base.evidence.proficiency?.xpMultiplierPermille ?? 1000,
      aggregates.xpMultiplierPermille,
    );
    attributes[attributeId] = { rating: evidence.ratingAfter, xp: evidence.xpAfter };
    return evidence;
  });
  const bodyAfter = bounded(
    input.training.state.body + deriveSkillModifiedBodyDelta(definition.bodyDelta, aggregates),
    BODY_BOUNDS,
  );
  const preparationAfter = bounded(
    input.training.state.preparation +
      definition.preparationDelta +
      aggregates.preparationDeltaFlat,
    PREPARATION_BOUNDS,
  );
  const confidenceAfter = bounded(
    input.training.state.confidence + definition.confidenceDelta + aggregates.confidenceDeltaFlat,
    CONFIDENCE_BOUNDS,
  );
  const requestedGpaDelta = deriveSkillModifiedGpaDelta(
    'gpaDelta' in definition ? definition.gpaDelta : 0,
    aggregates,
  );
  const gpaAfter =
    requestedGpaDelta === 0
      ? input.gpa
      : milliGpa(bounded(input.gpa + requestedGpaDelta, GPA_BOUNDS));
  return deepFreeze(
    cloneSerializable({
      ok: true,
      next: {
        ...base.next,
        gpa: gpaAfter,
        training: {
          ...base.next.training,
          attributes,
          state: { body: bodyAfter, preparation: preparationAfter, confidence: confidenceAfter },
        },
      },
      evidence: {
        ...base.evidence,
        attributeXp,
        bodyAfter,
        preparationAfter,
        confidenceAfter,
        requestedGpaDelta,
        actualGpaDelta: milliGpa(gpaAfter - input.gpa),
        gpaAfter,
        practiceImpact: base.evidence.practiceImpact + aggregates.practiceImpactFlat,
        skillEffects: { aggregates, appliedSkillEffects: skills.appliedSkillEffects },
      },
    }),
  );
}
