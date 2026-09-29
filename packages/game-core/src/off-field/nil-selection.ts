import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { compareCodeUnits } from '../player/order.js';
import { nextInt, type RngState } from '../random/rng.js';
import type { NilOfferId } from './ids.js';
import type {
  ActiveNilCareerStateV1,
  NilOfferEligibilityContextV1,
  NilOfferMechanicsDefinition,
  NilOfferSelectionEvidenceV1,
  PendingNilOfferV1,
} from './types.js';

/** Shared arithmetic for validated commands. Callers own phase/due/catalog guards. */
export function selectNilOfferFromContext(
  nil: ActiveNilCareerStateV1,
  context: NilOfferEligibilityContextV1,
  definitions: readonly NilOfferMechanicsDefinition[],
  weekIndex: number,
  rng: RngState,
): {
  readonly nil: ActiveNilCareerStateV1;
  readonly evidence: NilOfferSelectionEvidenceV1;
  readonly rng: RngState;
} {
  const previouslyOffered = new Set<NilOfferId>(nil.pendingOffers.map(({ offerId }) => offerId));
  for (const entry of nil.history) {
    if (entry.model === 'nil_offer_decision_v1' || entry.model === 'nil_offer_expiration_v1')
      previouslyOffered.add(entry.offer.offerId);
  }
  const eligible = [...definitions]
    .filter(
      (offer) =>
        !previouslyOffered.has(offer.id) &&
        context.brand >= offer.requirements.minimumBrand &&
        context.depthRank <= offer.requirements.maximumDepthRank &&
        context.gpaMilli >= offer.requirements.minimumGpaMilli &&
        offer.requirements.programStrengthBandIds.some(
          (bandId) => bandId === context.programStrengthBandId,
        ) &&
        offer.requirements.requiredTagIds.every((tagId) => context.tagIds.includes(tagId)),
    )
    .sort((left, right) => compareCodeUnits(left.id, right.id));
  const totalWeight = eligible.reduce((total, offer) => total + offer.weight, 0);
  const rngDrawCountBefore = rng.drawCount;
  if (eligible.length === 0) {
    const evidence: NilOfferSelectionEvidenceV1 = {
      model: 'nil_offer_selection_v1',
      weekIndex,
      context,
      eligibleOfferIds: [],
      totalWeight: 0,
      roll: null,
      selectedOfferId: null,
      rngDrawCountBefore,
      rngDrawCountAfter: rngDrawCountBefore,
    };
    return deepFreeze(
      cloneSerializable({ nil: { ...nil, lastOfferAttempt: evidence }, evidence, rng }),
    );
  }
  const sample = nextInt(rng, 0, totalWeight);
  let cursor = sample.value;
  let selected = eligible[eligible.length - 1]!;
  for (const offer of eligible) {
    if (cursor < offer.weight) {
      selected = offer;
      break;
    }
    cursor -= offer.weight;
  }
  const evidence: NilOfferSelectionEvidenceV1 = {
    model: 'nil_offer_selection_v1',
    weekIndex,
    context,
    eligibleOfferIds: eligible.map(({ id }) => id),
    totalWeight,
    roll: sample.value,
    selectedOfferId: selected.id,
    rngDrawCountBefore,
    rngDrawCountAfter: sample.nextRng.drawCount,
  };
  const pending: PendingNilOfferV1 = {
    offerId: selected.id,
    offeredWeekIndex: weekIndex,
    expiresAfterWeekIndex: weekIndex + selected.expirationWeeks,
    selection: evidence,
  };
  return deepFreeze(
    cloneSerializable({
      nil: { ...nil, pendingOffers: [pending], lastOfferAttempt: evidence },
      evidence,
      rng: sample.nextRng,
    }),
  );
}
