import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { compareCodeUnits } from '../player/order.js';
import type { PlayerState } from '../player/types.js';
import type { NilEffectSourceId } from './ids.js';
import type {
  NilBenefitStackV1,
  NilEffect,
  NilEffectApplicationEvidenceV1,
  OffFieldBenefitMechanicsDefinition,
  RelationshipTrackV1,
} from './types.js';

export interface NilEffectState {
  readonly playerState: PlayerState;
  readonly relationshipTracks: readonly RelationshipTrackV1[];
  readonly fictionalFundsUsd: number;
  readonly benefitStacks: readonly NilBenefitStackV1[];
}
export interface NilEffectResult extends NilEffectState {
  readonly appliedEffects: readonly NilEffectApplicationEvidenceV1[];
}
const NIL_FUNDS_USD_MAXIMUM = 1_000_000;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function effectBaseDelta(effect: NilEffect): number {
  switch (effect.type) {
    case 'nil_integer_state_delta':
    case 'nil_relationship_delta':
      return effect.delta;
    case 'nil_gpa_delta_milli':
      return effect.deltaMilli;
    case 'nil_funds_delta_usd':
      return effect.deltaUsd;
    case 'nil_benefit_grant':
      return effect.quantity;
  }
}

/** Shared ordered arithmetic; aggregate commands validate state, catalogs, and hooks. */
export function applyNilEffectsFromContext(
  state: NilEffectState,
  effects: readonly NilEffect[],
  sourceId: NilEffectSourceId,
  definitions: readonly OffFieldBenefitMechanicsDefinition[],
  rewardMultiplierPermille: number,
): NilEffectResult | null {
  let playerState = state.playerState;
  let relationshipTracks = state.relationshipTracks;
  let fictionalFundsUsd = state.fictionalFundsUsd;
  const benefitStacks = [...state.benefitStacks];
  const appliedEffects: NilEffectApplicationEvidenceV1[] = [];
  for (const [effectIndex, effect] of effects.entries()) {
    const baseDelta = effectBaseDelta(effect);
    const canMultiply = sourceId === 'nil_effect_source_offer_reward' && baseDelta > 0;
    const multiplier =
      canMultiply && effect.type !== 'nil_benefit_grant' ? rewardMultiplierPermille : 1_000;
    const requestedDelta =
      multiplier === 1_000 ? baseDelta : Math.round((baseDelta * multiplier) / 1_000);
    let valueBefore: number;
    let valueAfter: number;
    if (effect.type === 'nil_integer_state_delta') {
      const stateKey = {
        nil_state_body: 'body',
        nil_state_preparation: 'preparation',
        nil_state_confidence: 'confidence',
        nil_state_coach_trust: 'coachTrust',
        nil_state_brand: 'brand',
      }[effect.stateId] as 'body' | 'preparation' | 'confidence' | 'coachTrust' | 'brand';
      valueBefore = playerState[stateKey];
      valueAfter = clamp(valueBefore + requestedDelta, 0, 100);
      playerState = { ...playerState, [stateKey]: valueAfter };
    } else if (effect.type === 'nil_gpa_delta_milli') {
      valueBefore = Math.round(playerState.gpa * 1_000);
      valueAfter = clamp(valueBefore + requestedDelta, 0, 4_000);
      playerState = { ...playerState, gpa: valueAfter / 1_000 };
    } else if (effect.type === 'nil_funds_delta_usd') {
      valueBefore = fictionalFundsUsd;
      valueAfter = clamp(valueBefore + requestedDelta, 0, NIL_FUNDS_USD_MAXIMUM);
      fictionalFundsUsd = valueAfter;
    } else if (effect.type === 'nil_relationship_delta') {
      const trackIndex = relationshipTracks.findIndex(({ actorId }) => actorId === effect.actorId);
      if (trackIndex < 0) return null;
      valueBefore = relationshipTracks[trackIndex]!.value;
      valueAfter = clamp(valueBefore + requestedDelta, 0, 100);
      relationshipTracks = relationshipTracks.map((track, index) =>
        index === trackIndex ? { ...track, value: valueAfter } : track,
      );
    } else {
      const definition = definitions.find(({ id }) => id === effect.benefitId);
      if (definition === undefined) return null;
      const stackIndex = benefitStacks.findIndex(({ benefitId }) => benefitId === effect.benefitId);
      valueBefore = stackIndex < 0 ? 0 : benefitStacks[stackIndex]!.quantity;
      valueAfter = clamp(valueBefore + requestedDelta, 0, definition.maximumStack);
      if (stackIndex < 0) benefitStacks.push({ benefitId: effect.benefitId, quantity: valueAfter });
      else benefitStacks[stackIndex] = { benefitId: effect.benefitId, quantity: valueAfter };
      benefitStacks.sort((left, right) => compareCodeUnits(left.benefitId, right.benefitId));
    }
    appliedEffects.push({
      model: 'nil_effect_application_v1',
      sourceId,
      effectIndex,
      effect,
      rewardMultiplierPermille: multiplier,
      valueBefore,
      baseDelta,
      requestedDelta,
      actualDelta: valueAfter - valueBefore,
      valueAfter,
    });
  }
  return deepFreeze(
    cloneSerializable({
      playerState,
      relationshipTracks,
      fictionalFundsUsd,
      benefitStacks,
      appliedEffects,
    }),
  );
}
