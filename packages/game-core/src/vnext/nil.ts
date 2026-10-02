import { nilOfferChancePermilleVNext } from './programs.js';
import { toneNilChancePermilleVNext } from './story.js';
import { withMasteryVNext } from './cards.js';
import { shopVisibilityChanceVNext } from './shop.js';
import type { ProgramId } from '../player/ids.js';
import type { PlayerState } from '../player/types.js';
import { createRng, nextUint32 } from '../random/rng.js';
import type { PlayerTagId } from '../player/ids.js';
import type { NilOfferId, OffFieldBenefitId } from '../off-field/ids.js';
import { applyNilEffectsFromContext } from '../off-field/nil-effects.js';
import type {
  NilEffect,
  NilEffectApplicationEvidenceV1,
  NilOfferMechanicsDefinition,
} from '../off-field/types.js';
import type { ProgramStrengthBandId } from '../programs/ids.js';
import { collectEquippedLifeHooks } from '../skills/effects.js';
import { loadoutVNext, skillDefinitionsVNext } from './build.js';
import {
  CAREER_VNEXT_REGULAR_SEASON_WEEKS,
  type CareerVNext,
  type CareerVNextMechanics,
  type NilOfferSceneVNext,
  type NilVNext,
} from './types.js';

/**
 * NIL in Career VNext, through the shared off-field arithmetic: one offer attempt per regular-season
 * week on a named stream (never while an obligation runs), an accept/decline scene, reward effects
 * with the equipped NIL multiplier, and an obligation that costs practice time and its authored
 * weekly effects until fulfilled. Benefits are small, one-use supports; the locker room is the
 * relationship the NIL catalog touches besides the position coach (whose value is coach trust).
 */
export const VNEXT_NIL_TUNING = Object.freeze({
  offerChancePermille: 300,
  visibilityChancePermille: 150,
  practicePenaltyPerFocus: 5,
  recoveryAccessBody: 6,
  trainingAccessPreparation: 4,
  lockerRoomHigh: 65,
  lockerRoomLow: 35,
  lockerRoomPracticeDelta: 2,
  historyLimit: 40,
  /** Brand from Saturdays: playing, a win, a strong graded game, a postseason game, a ranked win. */
  brand: {
    played: 1,
    win: 1,
    strongGrade: 70,
    strongGame: 1,
    postseason: 2,
    rankedWin: 2,
    offseasonFade: 6,
  },
});

export function createNilVNext(): NilVNext {
  return {
    fundsUsd: 0,
    benefits: [],
    lockerRoom: 50,
    obligation: null,
    history: [],
  };
}

export function nilOfVNext(career: Pick<CareerVNext, 'nil'>): NilVNext {
  return career.nil ?? createNilVNext();
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function strengthBand(
  programId: ProgramId,
  mechanics: CareerVNextMechanics,
): ProgramStrengthBandId {
  const authored = mechanics.nil.programStrengthBands.find(
    (entry) => entry.programId === programId,
  );
  if (authored !== undefined) return authored.strengthBandId;
  const tier = mechanics.world.programProfiles.find(
    (entry) => entry.programId === programId,
  )?.aggregateTierId;
  return tier === 'aggregate_tier_peak'
    ? 'program_strength_national'
    : tier === 'aggregate_tier_contender'
      ? 'program_strength_contender'
      : 'program_strength_builder';
}

/** Relationship tags the NIL catalog and events can read (coach trust and the locker room). */
export function relationshipTagsVNext(career: CareerVNext): readonly PlayerTagId[] {
  const tuning = VNEXT_NIL_TUNING;
  const coach = career.athlete.profile.state.coachTrust;
  const room = nilOfVNext(career).lockerRoom;
  const tags: PlayerTagId[] = [];
  if (coach >= tuning.lockerRoomHigh) tags.push('tag_relationship_position_coach_high');
  if (coach <= tuning.lockerRoomLow) tags.push('tag_relationship_position_coach_low');
  if (room >= tuning.lockerRoomHigh) tags.push('tag_relationship_teammate_leader_high');
  if (room <= tuning.lockerRoomLow) tags.push('tag_relationship_teammate_leader_low');
  return tags;
}

/** The locker room's pull on the practice score (teammates carry, or drag, a week). */
export function lockerRoomPracticeDeltaVNext(career: Pick<CareerVNext, 'nil'>): number {
  const tuning = VNEXT_NIL_TUNING;
  const room = nilOfVNext(career).lockerRoom;
  return room >= tuning.lockerRoomHigh
    ? tuning.lockerRoomPracticeDelta
    : room <= tuning.lockerRoomLow
      ? -tuning.lockerRoomPracticeDelta
      : 0;
}

function lifeHookMilli(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  hookId: 'life_hook_nil_reward_multiplier' | 'life_hook_relationship_gain_multiplier',
): number {
  const collected = collectEquippedLifeHooks(
    loadoutVNext(career, mechanics),
    skillDefinitionsVNext(withMasteryVNext(career, mechanics)),
  );
  if (!collected.ok) return 1_000;
  const hooks = collected.hooks.filter((hook) => hook.hookId === hookId);
  return hooks.reduce((value, hook) => Math.round((value * hook.valueMilli) / 1_000), 1_000);
}

function benefitCount(nil: NilVNext, benefitId: OffFieldBenefitId): number {
  return nil.benefits.find((entry) => entry.benefitId === benefitId)?.quantity ?? 0;
}

function spendBenefit(nil: NilVNext, benefitId: OffFieldBenefitId): NilVNext {
  return {
    ...nil,
    benefits: nil.benefits
      .map((entry) =>
        entry.benefitId === benefitId ? { ...entry, quantity: entry.quantity - 1 } : entry,
      )
      .filter(({ quantity }) => quantity > 0),
  };
}

export function nilOfferDefinitionVNext(
  offerId: string,
  mechanics: CareerVNextMechanics,
): NilOfferMechanicsDefinition | undefined {
  return mechanics.nil.catalog.nilOffers.find(({ id }) => id === offerId);
}

/** One attempt a regular-season week: none during an obligation; each offer comes once a career. */
export function attemptNilOfferVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): { readonly scene: NilOfferSceneVNext; readonly nil: NilVNext } | null {
  const nil = nilOfVNext(career);
  if (
    career.program === null ||
    nil.obligation !== null ||
    career.season.weekIndex >= CAREER_VNEXT_REGULAR_SEASON_WEEKS
  )
    return null;
  const state = career.athlete.profile.state;
  const tags = [...career.athlete.profile.tagIds, ...relationshipTagsVNext(career)];
  const band = strengthBand(career.program.programId, mechanics);
  const offered = new Set(nil.history.map(({ offerId }) => offerId));
  const eligible = mechanics.nil.catalog.nilOffers
    .filter(
      (offer) =>
        !offered.has(offer.id) &&
        (mechanics.nilOfferPositions[offer.id]?.includes(
          career.athlete.profile.positionId as never,
        ) ??
          true) &&
        state.brand >= offer.requirements.minimumBrand &&
        career.program!.room.projection.rank <= offer.requirements.maximumDepthRank &&
        Math.round(state.gpa * 1_000) >= offer.requirements.minimumGpaMilli &&
        offer.requirements.programStrengthBandIds.includes(band) &&
        offer.requirements.requiredTagIds.every((tag) => tags.includes(tag)),
    )
    .sort((left, right) => (left.id < right.id ? -1 : 1));
  if (eligible.length === 0) return null;
  const visibility = benefitCount(nil, 'off_field_benefit_offer_visibility');
  const chance = Math.min(
    1_000,
    // M12: the program's NIL market sets the base chance (a solid market keeps the old 300).
    nilOfferChancePermilleVNext(mechanics, career.program.programId) +
      // M12 Phase 6: an interview's tone carries into the NIL market.
      toneNilChancePermilleVNext(career) +
      // M12 Phase 7: an agent's visibility while it lasts.
      shopVisibilityChanceVNext(career) +
      visibility * VNEXT_NIL_TUNING.visibilityChancePermille,
  );
  const rng = createRng(
    `${String(career.seed)}:vnext:nil:${career.season.index}:${career.season.weekIndex}`,
  );
  const roll = nextUint32(rng);
  if (roll.value % 1_000 >= chance) return null;
  const total = eligible.reduce((sum, offer) => sum + offer.weight, 0);
  let cursor = nextUint32(roll.nextRng).value % total;
  let selected = eligible.at(-1)!;
  for (const offer of eligible) {
    if (cursor < offer.weight) {
      selected = offer;
      break;
    }
    cursor -= offer.weight;
  }
  return {
    scene: {
      offerId: selected.id,
      weekIndex: career.season.weekIndex,
      decision: null,
      applied: [],
    },
    // Visibility is spent when it has helped an offer arrive.
    nil: visibility > 0 ? spendBenefit(nil, 'off_field_benefit_offer_visibility') : nil,
  };
}

interface Applied {
  readonly state: PlayerState;
  readonly nil: NilVNext;
  readonly applied: readonly NilEffectApplicationEvidenceV1[];
}

function applyEffects(
  career: CareerVNext,
  nil: NilVNext,
  effects: readonly NilEffect[],
  source: 'nil_effect_source_offer_reward' | 'nil_effect_source_obligation_weekly',
  mechanics: CareerVNextMechanics,
  state: PlayerState = career.athlete.profile.state,
): Applied | null {
  const relationshipMultiplier = lifeHookMilli(
    career,
    mechanics,
    'life_hook_relationship_gain_multiplier',
  );
  // The campus line amplifies relationship gains; losses are never amplified.
  const scaled = effects.map((effect) =>
    effect.type === 'nil_relationship_delta' && effect.delta > 0
      ? { ...effect, delta: Math.round((effect.delta * relationshipMultiplier) / 1_000) }
      : effect,
  );
  const result = applyNilEffectsFromContext(
    {
      playerState: state,
      relationshipTracks: [
        { actorId: 'relationship_actor_position_coach', value: state.coachTrust },
        { actorId: 'relationship_actor_teammate_leader', value: nil.lockerRoom },
        // Not modelled in VNext; kept neutral so shared effects stay well-formed.
        { actorId: 'relationship_actor_direct_competitor', value: 50 },
      ],
      fictionalFundsUsd: nil.fundsUsd,
      benefitStacks: nil.benefits,
    },
    scaled,
    source,
    mechanics.nil.catalog.benefits,
    source === 'nil_effect_source_offer_reward'
      ? lifeHookMilli(career, mechanics, 'life_hook_nil_reward_multiplier')
      : 1_000,
  );
  if (result === null) return null;
  const coach = result.relationshipTracks.find(
    ({ actorId }) => actorId === 'relationship_actor_position_coach',
  )!.value;
  const room = result.relationshipTracks.find(
    ({ actorId }) => actorId === 'relationship_actor_teammate_leader',
  )!.value;
  return {
    state: { ...result.playerState, coachTrust: coach },
    nil: {
      ...nil,
      fundsUsd: result.fictionalFundsUsd,
      benefits: result.benefitStacks.map(({ benefitId, quantity }) => ({ benefitId, quantity })),
      lockerRoom: room,
    },
    applied: result.appliedEffects,
  };
}

function remember(nil: NilVNext, entry: NilVNext['history'][number]): NilVNext {
  return { ...nil, history: [...nil.history, entry].slice(-VNEXT_NIL_TUNING.historyLimit) };
}

/** Accept (reward now, obligation from next week) or decline; either way the offer is spent. */
export function decideNilOfferVNext(
  career: CareerVNext,
  scene: NilOfferSceneVNext,
  accept: boolean,
  mechanics: CareerVNextMechanics,
): {
  readonly state: PlayerState;
  readonly nil: NilVNext;
  readonly scene: NilOfferSceneVNext;
} | null {
  const offer = nilOfferDefinitionVNext(scene.offerId, mechanics);
  if (offer === undefined || scene.decision !== null) return null;
  const nil = nilOfVNext(career);
  const entry = {
    offerId: offer.id as NilOfferId,
    seasonIndex: career.season.index,
    weekIndex: career.season.weekIndex,
  };
  if (!accept)
    return {
      state: career.athlete.profile.state,
      nil: remember(nil, { ...entry, outcome: 'DECLINED' }),
      scene: { ...scene, decision: 'DECLINED' },
    };
  const applied = applyEffects(
    career,
    nil,
    offer.rewardEffects,
    'nil_effect_source_offer_reward',
    mechanics,
  );
  if (applied === null) return null;
  return {
    state: applied.state,
    nil: remember(
      {
        ...applied.nil,
        obligation: {
          offerId: offer.id as NilOfferId,
          weeksRemaining: offer.obligation.durationWeeks,
          focusCost: offer.obligation.focusCost,
        },
      },
      { ...entry, outcome: 'ACCEPTED' },
    ),
    scene: { ...scene, decision: 'ACCEPTED', applied: applied.applied },
  };
}

/**
 * The week's off-field ledger after practice: an obligation's practice cost and weekly effects,
 * the locker room's pull, and one-use benefits the plan can use. Returns the adjusted state.
 */
export function settleNilWeekVNext(
  career: CareerVNext,
  state: PlayerState,
  focusIds: readonly string[],
  positionFocusIds: readonly string[],
  mechanics: CareerVNextMechanics,
): {
  readonly state: PlayerState;
  readonly nil: NilVNext;
  readonly practiceDelta: number;
  readonly obligationApplied: readonly NilEffectApplicationEvidenceV1[];
  readonly benefitsUsed: readonly OffFieldBenefitId[];
} | null {
  let nil = nilOfVNext(career);
  let next = state;
  const tuning = VNEXT_NIL_TUNING;
  const benefitsUsed: OffFieldBenefitId[] = [];
  if (
    focusIds.includes('action_recovery') &&
    benefitCount(nil, 'off_field_benefit_recovery_access') > 0
  ) {
    next = { ...next, body: clamp(next.body + tuning.recoveryAccessBody, 0, 100) };
    nil = spendBenefit(nil, 'off_field_benefit_recovery_access');
    benefitsUsed.push('off_field_benefit_recovery_access');
  }
  if (
    focusIds.some((id) => positionFocusIds.includes(id)) &&
    benefitCount(nil, 'off_field_benefit_training_access') > 0
  ) {
    next = {
      ...next,
      preparation: clamp(next.preparation + tuning.trainingAccessPreparation, 0, 100),
    };
    nil = spendBenefit(nil, 'off_field_benefit_training_access');
    benefitsUsed.push('off_field_benefit_training_access');
  }
  let practiceDelta = lockerRoomPracticeDeltaVNext({ nil });
  let obligationApplied: readonly NilEffectApplicationEvidenceV1[] = [];
  const obligation = nil.obligation;
  if (obligation !== null) {
    const offer = nilOfferDefinitionVNext(obligation.offerId, mechanics);
    if (offer === undefined) return null;
    const applied = applyEffects(
      career,
      nil,
      offer.obligation.weeklyEffects,
      'nil_effect_source_obligation_weekly',
      mechanics,
      next,
    );
    if (applied === null) return null;
    next = applied.state;
    obligationApplied = applied.applied;
    practiceDelta -= tuning.practicePenaltyPerFocus * obligation.focusCost;
    const weeksRemaining = obligation.weeksRemaining - 1;
    nil =
      weeksRemaining > 0
        ? { ...applied.nil, obligation: { ...obligation, weeksRemaining } }
        : remember(
            { ...applied.nil, obligation: null },
            {
              offerId: obligation.offerId,
              outcome: 'FULFILLED',
              seasonIndex: career.season.index,
              weekIndex: career.season.weekIndex,
            },
          );
  }
  return { state: next, nil, practiceDelta, obligationApplied, benefitsUsed };
}

/** Brand earned on a Saturday, from the saved result only. */
export function brandFromGameVNext(input: {
  readonly played: boolean;
  readonly won: boolean;
  readonly coachGrade: number | null;
  readonly postseason: boolean;
  readonly opponentRank: number | null;
}): number {
  const brand = VNEXT_NIL_TUNING.brand;
  return (
    (input.played ? brand.played : 0) +
    (input.won ? brand.win : 0) +
    (input.coachGrade !== null && input.coachGrade >= brand.strongGrade ? brand.strongGame : 0) +
    (input.postseason ? brand.postseason : 0) +
    (input.won && input.opponentRank !== null && input.opponentRank <= 25 ? brand.rankedWin : 0)
  );
}
