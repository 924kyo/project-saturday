import type { NilOfferMechanicsDefinition } from '../off-field/types.js';
import { nilOfVNext, VNEXT_NIL_TUNING } from './nil.js';
import type { CareerVNext, GearIdVNext, NilVNext, ShopServiceIdVNext, ShopVNext } from './types.js';
import type { PlayerState } from '../player/types.js';

/**
 * The NIL shop (M12 Phase 7, playtest report "funds accumulate unused"): fixed-price services
 * with an immediate, shown effect, and gear cosmetics. NIL money never buys cards or ratings
 * (one currency per purpose); the balance can never go below zero. An Appearance Style token
 * (an NIL benefit) unlocks one gear cosmetic of the athlete's choice.
 */
export const VNEXT_SHOP_TUNING = Object.freeze({
  services: {
    shop_recovery_session: { priceUsd: 300, body: 12 },
    shop_film_package: { priceUsd: 250, preparation: 10 },
    shop_tutor: { priceUsd: 200, gpaMilli: 150 },
    shop_agent_visibility: { priceUsd: 500, brand: 4, visibilityWeeks: 4 },
  } satisfies Record<
    ShopServiceIdVNext,
    {
      readonly priceUsd: number;
      readonly body?: number;
      readonly preparation?: number;
      readonly gpaMilli?: number;
      readonly brand?: number;
      readonly visibilityWeeks?: number;
    }
  >,
  /** The weekly NIL offer chance an agent adds while visibility lasts (permille). */
  visibilityChancePermille: 60,
  gear: {
    gear_gold_trim: 800,
    gear_blackout_helmet: 800,
    gear_volt_gloves: 600,
    gear_alternate_jersey: 1000,
  } satisfies Record<GearIdVNext, number>,
  styleTokenBenefitId: 'off_field_benefit_appearance_style',
});

export const SHOP_SERVICE_IDS_VNEXT = Object.keys(
  VNEXT_SHOP_TUNING.services,
) as readonly ShopServiceIdVNext[];
export const GEAR_IDS_VNEXT = Object.keys(VNEXT_SHOP_TUNING.gear) as readonly GearIdVNext[];

export function shopOfVNext(career: Pick<CareerVNext, 'shop'>): ShopVNext {
  return (
    career.shop ?? { ownedGearIds: [], equippedGearIds: [], purchases: [], visibilityWeeks: 0 }
  );
}

/** Money earned, spendable, spent, and the obligation in force (NIL-01). */
export function nilLedgerVNext(career: Pick<CareerVNext, 'nil' | 'shop'>): {
  readonly earnedUsd: number;
  readonly spendableUsd: number;
  readonly spentUsd: number;
  readonly obligation: NilVNext['obligation'];
} {
  const nil = nilOfVNext(career);
  const spent = shopOfVNext(career).purchases.reduce((sum, { priceUsd }) => sum + priceUsd, 0);
  return {
    earnedUsd: nil.fundsUsd + spent,
    spendableUsd: nil.fundsUsd,
    spentUsd: spent,
    obligation: nil.obligation,
  };
}

/** What a deal costs over its whole term, before accepting (NIL-03). */
export function nilDealCostVNext(offer: Pick<NilOfferMechanicsDefinition, 'obligation'>): {
  readonly weeks: number;
  readonly practicePerWeek: number;
  readonly practiceTotal: number;
} {
  const weeks = offer.obligation.durationWeeks;
  const practicePerWeek = VNEXT_NIL_TUNING.practicePenaltyPerFocus * offer.obligation.focusCost;
  return { weeks, practicePerWeek, practiceTotal: weeks * practicePerWeek };
}

export type ShopFailureVNext = 'not_enough_funds' | 'already_bought' | 'not_owned' | 'no_token';

export interface ShopChangeVNext {
  readonly state: PlayerState;
  readonly nil: NilVNext;
  readonly shop: ShopVNext;
}

const clamp = (value: number, low = 0, high = 100) => Math.min(high, Math.max(low, value));

/** Buys a service for this week: its effect applies now; one of each per week. */
export function buyServiceVNext(
  career: CareerVNext,
  serviceId: ShopServiceIdVNext,
): ShopChangeVNext | ShopFailureVNext {
  const service = VNEXT_SHOP_TUNING.services[serviceId];
  const nil = nilOfVNext(career);
  const shop = shopOfVNext(career);
  if (
    shop.purchases.some(
      (entry) =>
        entry.itemId === serviceId &&
        entry.seasonIndex === career.season.index &&
        entry.weekIndex === career.season.weekIndex,
    )
  )
    return 'already_bought';
  if (nil.fundsUsd < service.priceUsd) return 'not_enough_funds';
  const state = career.athlete.profile.state;
  const effect = service as {
    readonly body?: number;
    readonly preparation?: number;
    readonly gpaMilli?: number;
    readonly brand?: number;
    readonly visibilityWeeks?: number;
  };
  return {
    state: {
      ...state,
      body: clamp(state.body + (effect.body ?? 0)),
      preparation: clamp(state.preparation + (effect.preparation ?? 0)),
      gpa: Math.min(4, Math.round(state.gpa * 1000 + (effect.gpaMilli ?? 0)) / 1000),
      brand: clamp(state.brand + (effect.brand ?? 0)),
    },
    nil: { ...nil, fundsUsd: nil.fundsUsd - service.priceUsd },
    shop: {
      ...shop,
      visibilityWeeks: Math.max(shop.visibilityWeeks, effect.visibilityWeeks ?? 0),
      purchases: [
        ...shop.purchases,
        {
          seasonIndex: career.season.index,
          weekIndex: career.season.weekIndex,
          itemId: serviceId,
          priceUsd: service.priceUsd,
        },
      ].slice(-60),
    },
  };
}

/** Buys a gear cosmetic with money, or with an Appearance Style token (NIL-02). */
export function buyGearVNext(
  career: CareerVNext,
  gearId: GearIdVNext,
  payment: 'money' | 'token',
): ShopChangeVNext | ShopFailureVNext {
  const nil = nilOfVNext(career);
  const shop = shopOfVNext(career);
  if (shop.ownedGearIds.includes(gearId)) return 'already_bought';
  const price = VNEXT_SHOP_TUNING.gear[gearId];
  const tokenId = VNEXT_SHOP_TUNING.styleTokenBenefitId;
  const tokens = nil.benefits.find(({ benefitId }) => benefitId === tokenId)?.quantity ?? 0;
  if (payment === 'token' && tokens < 1) return 'no_token';
  if (payment === 'money' && nil.fundsUsd < price) return 'not_enough_funds';
  const benefits =
    payment === 'token'
      ? nil.benefits
          .map((entry) =>
            entry.benefitId === tokenId ? { ...entry, quantity: entry.quantity - 1 } : entry,
          )
          .filter(({ quantity }) => quantity > 0)
      : nil.benefits;
  return {
    state: career.athlete.profile.state,
    nil: {
      ...nil,
      benefits,
      fundsUsd: payment === 'money' ? nil.fundsUsd - price : nil.fundsUsd,
    },
    shop: {
      ...shop,
      ownedGearIds: [...shop.ownedGearIds, gearId],
      equippedGearIds: [...shop.equippedGearIds, gearId],
      purchases: [
        ...shop.purchases,
        {
          seasonIndex: career.season.index,
          weekIndex: career.season.weekIndex,
          itemId: gearId,
          priceUsd: payment === 'money' ? price : 0,
          ...(payment === 'token' ? { token: true } : {}),
        },
      ].slice(-60),
    },
  };
}

/** Wears or puts away an owned gear cosmetic. */
export function equipGearVNext(
  career: CareerVNext,
  gearId: GearIdVNext,
  equipped: boolean,
): ShopVNext | ShopFailureVNext {
  const shop = shopOfVNext(career);
  if (!shop.ownedGearIds.includes(gearId)) return 'not_owned';
  const without = shop.equippedGearIds.filter((id) => id !== gearId);
  return { ...shop, equippedGearIds: equipped ? [...without, gearId] : without };
}

/** The weekly NIL chance an agent's visibility adds (while it lasts). */
export function shopVisibilityChanceVNext(career: Pick<CareerVNext, 'shop'>): number {
  return shopOfVNext(career).visibilityWeeks > 0 ? VNEXT_SHOP_TUNING.visibilityChancePermille : 0;
}
