import type { SkillId } from '../skills/ids.js';
import { VNEXT_BREAKTHROUGH_THRESHOLD, breakthroughStateVNext } from './build.js';
import {
  cardsOfVNext,
  craftCardVNext,
  masterCardVNext,
  scoutingDrawVNext,
  VNEXT_CARD_TUNING,
  withMasteryVNext,
  type CardStateChangeVNext,
  type CardCommandFailureVNext,
} from './cards.js';
import { fail, publish } from './common.js';
import { resolveFocusPlanVNext } from './development.js';
import {
  buyGearVNext,
  buyServiceVNext,
  equipGearVNext,
  type ShopChangeVNext,
  type ShopFailureVNext,
} from './shop.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
  CareerVNextResult,
  GearIdVNext,
  ShopServiceIdVNext,
} from './types.js';

/**
 * Career commands for the card economy and the NIL shop (M12 Phase 7). Card and shop changes are
 * made while planning the week, where the build is edited; every rule is the pure function's.
 */
function applyCards(career: CareerVNext, change: CardStateChangeVNext): CareerVNextResult {
  const equipped = [...career.build.equippedSkillIds];
  // A new card fills the first open slot, like a breakthrough card.
  if (change.added !== null) {
    const open = equipped.indexOf(null);
    if (open >= 0) equipped[open] = change.added;
  }
  return publish(career, {
    ...career,
    build: {
      equippedSkillIds: equipped as unknown as CareerVNext['build']['equippedSkillIds'],
      ownedSkillIds: [...change.ownedSkillIds],
    },
    cards: change.cards,
  });
}

const failed = (result: unknown): result is CardCommandFailureVNext | ShopFailureVNext =>
  typeof result === 'string';

export function craftCardCareerVNext(
  career: CareerVNext,
  skillId: string,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'WEEK_PLAN') return fail('career_vnext.invalid_phase');
  const change = craftCardVNext(career, skillId, mechanics);
  return failed(change) ? fail('career_vnext.invalid_choice') : applyCards(career, change);
}

export function drawCardCareerVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'WEEK_PLAN') return fail('career_vnext.invalid_phase');
  const change = scoutingDrawVNext(career, mechanics);
  return failed(change) ? fail('career_vnext.invalid_choice') : applyCards(career, change);
}

export function masterCardCareerVNext(
  career: CareerVNext,
  skillId: string,
  payment: 'insight' | 'duplicate',
): CareerVNextResult {
  if (career.flow.type !== 'WEEK_PLAN') return fail('career_vnext.invalid_phase');
  const change = masterCardVNext(career, skillId, payment);
  return failed(change) ? fail('career_vnext.invalid_choice') : applyCards(career, change);
}

/** Passes on a breakthrough offer: the gauge is spent and the choice banks Insight instead. */
export function skipBreakthroughVNext(career: CareerVNext): CareerVNextResult {
  if (career.flow.type !== 'BREAKTHROUGH' || career.flow.offer.chosenSkillId !== null)
    return fail('career_vnext.invalid_phase');
  if (career.flow.offer.skipped === true) return fail('career_vnext.invalid_phase');
  const cards = cardsOfVNext(career);
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      breakthroughGauge: career.athlete.breakthroughGauge - VNEXT_BREAKTHROUGH_THRESHOLD,
    },
    cards: { ...cards, insight: cards.insight + VNEXT_CARD_TUNING.insight.skippedOffer },
    flow: { ...career.flow, offer: { ...career.flow.offer, skipped: true } },
  });
}

/**
 * Gauge points past a complete collection become Insight (CARD-03): the gauge stays full and every
 * point the week would have added is banked.
 */
export function overflowInsightVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  gaugeBefore: number,
  points: number,
): { readonly gauge: number; readonly insight: number } {
  if (!breakthroughStateVNext(career, mechanics).complete)
    return { gauge: Math.min(160, gaugeBefore + points), insight: 0 };
  return { gauge: VNEXT_BREAKTHROUGH_THRESHOLD, insight: Math.max(0, points) };
}

function applyShop(career: CareerVNext, change: ShopChangeVNext): CareerVNextResult {
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      profile: { ...career.athlete.profile, state: change.state },
    },
    nil: change.nil,
    shop: change.shop,
  });
}

export function buyServiceCareerVNext(
  career: CareerVNext,
  serviceId: ShopServiceIdVNext,
): CareerVNextResult {
  if (career.flow.type !== 'WEEK_PLAN') return fail('career_vnext.invalid_phase');
  const change = buyServiceVNext(career, serviceId);
  return failed(change) ? fail('career_vnext.invalid_choice') : applyShop(career, change);
}

export function buyGearCareerVNext(
  career: CareerVNext,
  gearId: GearIdVNext,
  payment: 'money' | 'token',
): CareerVNextResult {
  if (career.flow.type !== 'WEEK_PLAN') return fail('career_vnext.invalid_phase');
  const change = buyGearVNext(career, gearId, payment);
  return failed(change) ? fail('career_vnext.invalid_choice') : applyShop(career, change);
}

export function equipGearCareerVNext(
  career: CareerVNext,
  gearId: GearIdVNext,
  equipped: boolean,
): CareerVNextResult {
  const shop = equipGearVNext(career, gearId, equipped);
  return failed(shop) ? fail('career_vnext.invalid_choice') : publish(career, { ...career, shop });
}

// ---------------------------------------------------------------------------------------------
// Attribution (CARD-01, CARD-02): what each equipped card did to this plan.

export interface CardAttributionVNext {
  readonly skillId: SkillId;
  /** Whether any of the card's effects applied to this plan (the resolver's own evidence). */
  readonly active: boolean;
  /** With the card minus without it. */
  readonly xp: number;
  readonly body: number;
  readonly preparation: number;
  readonly confidence: number;
  readonly gpaMilli: number;
}

const totalXp = (attributes: unknown) =>
  Object.values(attributes as Record<string, { rating: number; xp: number }>).reduce(
    (sum, { rating, xp }) => sum + rating * 100 + xp,
    0,
  );

/** Each equipped card's with/without difference on a weekly plan. */
export function cardAttributionVNext(
  career: CareerVNext,
  focusIds: readonly string[],
  mechanics: CareerVNextMechanics,
  xpPermille: number,
): readonly CardAttributionVNext[] {
  const full = resolveFocusPlanVNext(career, focusIds, mechanics, xpPermille);
  if (full === null) return [];
  const applied = new Set(
    full.evidence.flatMap((evidence) =>
      (
        (evidence as { skillEffects?: { appliedSkillEffects?: readonly { skillId: string }[] } })
          .skillEffects?.appliedSkillEffects ?? []
      ).map(({ skillId }) => skillId),
    ),
  );
  const rows: CardAttributionVNext[] = [];
  for (const [slot, skillId] of career.build.equippedSkillIds.entries()) {
    if (skillId === null) continue;
    const equipped = [...career.build.equippedSkillIds];
    equipped[slot] = null;
    const without = resolveFocusPlanVNext(
      {
        ...career,
        build: {
          ...career.build,
          equippedSkillIds: equipped as unknown as CareerVNext['build']['equippedSkillIds'],
        },
      },
      focusIds,
      mechanics,
      xpPermille,
    );
    if (without === null) continue;
    rows.push({
      skillId,
      active: applied.has(skillId),
      xp: totalXp(full.attributes) - totalXp(without.attributes),
      body: full.state.body - without.state.body,
      preparation: full.state.preparation - without.state.preparation,
      confidence: full.state.confidence - without.state.confidence,
      gpaMilli: Math.round(full.gpa * 1000) - Math.round(without.gpa * 1000),
    });
  }
  return rows;
}

/** The extra tells each equipped card brings to a game (the kernel's clue-bonus input). */
export function cardTellBonusesVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): readonly { readonly skillId: SkillId; readonly tells: number }[] {
  const mastered = withMasteryVNext(career, mechanics);
  const positionId = career.athlete.profile.positionId;
  const equipped = career.build.equippedSkillIds.filter((id): id is SkillId => id !== null);
  const kernel =
    positionId === 'position_qb'
      ? mastered.qb.skills
      : positionId === 'position_rb'
        ? mastered.rb.skills
        : positionId === 'position_cb'
          ? mastered.cb.skills
          : positionId === 'position_lb' || positionId === 'position_edge'
            ? mastered.defenders[positionId].skills
            : [];
  const fromKernel = kernel
    .filter(({ id }) => equipped.includes(id))
    .map(({ id, effects }) => ({
      skillId: id,
      tells: (effects as readonly { type: string; value: number }[])
        .filter(({ type }) => /clue_bonus/.test(type))
        .reduce((sum, { value }) => sum + value, 0),
    }));
  const fromHooks = mastered.skillBuilds.definitions
    .filter(({ id }) => equipped.includes(id))
    .map(({ id, effects }) => ({
      skillId: id,
      tells: effects
        .filter(
          (effect) =>
            effect.type === 'game_hook' && effect.hookId === 'game_hook_coverage_clue_bonus',
        )
        .reduce(
          (sum, effect) => sum + Math.floor((effect as { valueMilli: number }).valueMilli / 1000),
          0,
        ),
    }));
  return [...fromKernel, ...fromHooks].filter(({ tells }) => tells > 0);
}
