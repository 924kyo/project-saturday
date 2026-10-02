import { QB_SKILL_EFFECT_BOUNDS } from '../games/qb.js';
import { createRng, nextUint32 } from '../random/rng.js';
import {
  SKILL_BODY_DELTA_FLAT_BOUNDS,
  SKILL_CONFIDENCE_DELTA_FLAT_BOUNDS,
  SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS,
  SKILL_GAME_HOOK_VALUE_MILLI_BOUNDS,
  SKILL_GPA_DELTA_MILLI_BOUNDS,
  SKILL_LIFE_HOOK_VALUE_MILLI_BOUNDS,
  SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS,
  SKILL_PRACTICE_IMPACT_FLAT_BOUNDS,
  SKILL_PREPARATION_DELTA_FLAT_BOUNDS,
} from '../skills/tuning.js';
import type { SkillGradeId, SkillId } from '../skills/ids.js';
import type { SkillEffect, SkillMechanicsDefinition } from '../skills/types.js';
import type { CareerVNext, CareerVNextMechanics, CardsVNext, VNextPositionId } from './types.js';

/**
 * Cards, Insight and mastery (M12 Phase 7, conflict K1). Insight is an earned development currency,
 * never NIL money. The Workshop crafts any specific card at a fixed price, so no essential card is
 * luck-gated; the Scouting Draw is optional, shows its odds and guarantees an A-or-better within a
 * fixed number of draws; fusion consumes only duplicate copies. There are no real-money purchases.
 */
export const VNEXT_CARD_TUNING = Object.freeze({
  insight: {
    /** A skipped breakthrough offer banks this much. */
    skippedOffer: 15,
    /** Each season award. */
    perAward: 25,
    /** A duplicate drawn for a card already at top mastery is refunded. */
    duplicateRefund: 20,
  },
  /** Workshop prices by grade (fixed, deterministic). */
  workshopPrice: {
    skill_grade_c: 30,
    skill_grade_b: 50,
    skill_grade_a: 80,
    skill_grade_s: 120,
  } satisfies Record<SkillGradeId, number>,
  draw: {
    cost: 40,
    /** Disclosed odds per draw, permille (sum 1000). */
    oddsPermille: {
      skill_grade_c: 500,
      skill_grade_b: 300,
      skill_grade_a: 150,
      skill_grade_s: 50,
    } satisfies Record<SkillGradeId, number>,
    /** Every draw that comes up A or better resets the count; the 6th draw without one is A+. */
    pityDraws: 6,
  },
  /** Mastery levels 2 and 3: effect strength and Insight price (or one duplicate each). */
  mastery: {
    strengthPermille: [1000, 1250, 1500] as const,
    price: [0, 40, 80] as const,
    maxLevel: 3,
  },
});

export function cardsOfVNext(career: Pick<CareerVNext, 'cards'>): CardsVNext {
  return career.cards ?? { insight: 0, mastery: {}, duplicates: {}, pity: 0, draws: [] };
}

const GRADE_ORDER: readonly SkillGradeId[] = [
  'skill_grade_c',
  'skill_grade_b',
  'skill_grade_a',
  'skill_grade_s',
];

/** Every card the athlete's position can own, with its grade. */
export function cardCatalogVNext(
  career: Pick<CareerVNext, 'athlete'>,
  mechanics: CareerVNextMechanics,
): readonly { readonly skillId: SkillId; readonly gradeId: SkillGradeId }[] {
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const rows =
    positionId === 'position_wr'
      ? mechanics.skillBuilds.definitions.map(({ id, gradeId }) => ({ skillId: id, gradeId }))
      : positionId === 'position_lb' || positionId === 'position_edge'
        ? mechanics.defenders[positionId].skills.map(({ id, gradeId }) => ({
            skillId: id,
            gradeId,
          }))
        : mechanics.skillOffers
            .filter((offer) => offer.positionId === positionId)
            .map(({ id, gradeId }) => ({ skillId: id, gradeId }));
  return [...rows].sort((left, right) => (left.skillId < right.skillId ? -1 : 1));
}

export function cardGradeVNext(
  career: Pick<CareerVNext, 'athlete'>,
  skillId: string,
  mechanics: CareerVNextMechanics,
): SkillGradeId | null {
  return (
    cardCatalogVNext(career, mechanics).find((row) => row.skillId === skillId)?.gradeId ?? null
  );
}

export function masteryOfVNext(career: Pick<CareerVNext, 'cards'>, skillId: string): number {
  return cardsOfVNext(career).mastery[skillId] ?? 1;
}

// ---------------------------------------------------------------------------------------------
// Mastery scaling: one rule for every catalog. Multipliers (permille around 1000) scale their
// deviation; flat amounts scale directly; discrete unlocks (an extra clue, an option, a package
// snap) never change, so mastery strengthens a card without changing what it does.

const DISCRETE = /clue_bonus|unlock|option_access|package_snap/;

function scaledValue(kind: string, value: number, strength: number): number {
  if (DISCRETE.test(kind)) return value;
  if (/multiplier/.test(kind)) return 1000 + Math.round(((value - 1000) * strength) / 1000);
  return Math.round((value * strength) / 1000);
}

const within = (value: number, [low, high]: readonly [number, number]) =>
  Math.min(high, Math.max(low, value));

/** Each weekly-card effect stays inside the bounds its validator enforces. */
function scaledSkillEffect(effect: SkillEffect, strength: number): SkillEffect {
  const multiplier = (value: number) =>
    within(scaledValue('multiplier', value, strength), [
      SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS.min,
      SKILL_EFFECT_MULTIPLIER_PERMILLE_BOUNDS.max,
    ]);
  const flat = (value: number, bounds: { readonly min: number; readonly max: number }) =>
    within(scaledValue('flat', value, strength), [bounds.min, bounds.max]);
  switch (effect.type) {
    case 'action_xp_multiplier':
    case 'action_body_cost_multiplier':
    case 'injury_risk_multiplier':
      return { ...effect, multiplierPermille: multiplier(effect.multiplierPermille) };
    case 'action_gpa_delta_milli':
      return { ...effect, deltaMilli: flat(effect.deltaMilli, SKILL_GPA_DELTA_MILLI_BOUNDS) };
    case 'action_body_delta_flat':
      return { ...effect, delta: flat(effect.delta, SKILL_BODY_DELTA_FLAT_BOUNDS) };
    case 'action_preparation_delta_flat':
      return { ...effect, delta: flat(effect.delta, SKILL_PREPARATION_DELTA_FLAT_BOUNDS) };
    case 'action_confidence_delta_flat':
      return { ...effect, delta: flat(effect.delta, SKILL_CONFIDENCE_DELTA_FLAT_BOUNDS) };
    case 'action_practice_impact_flat':
      return { ...effect, delta: flat(effect.delta, SKILL_PRACTICE_IMPACT_FLAT_BOUNDS) };
    case 'passive_body_recovery_flat':
      return { ...effect, delta: flat(effect.delta, SKILL_PASSIVE_BODY_RECOVERY_FLAT_BOUNDS) };
    case 'game_hook': {
      const bounds = SKILL_GAME_HOOK_VALUE_MILLI_BOUNDS[effect.hookId];
      return {
        ...effect,
        valueMilli: within(scaledValue(effect.hookId, effect.valueMilli, strength), [
          bounds.min,
          bounds.max,
        ]),
      };
    }
    case 'life_hook': {
      const bounds = SKILL_LIFE_HOOK_VALUE_MILLI_BOUNDS[effect.hookId];
      return {
        ...effect,
        valueMilli: within(scaledValue(effect.hookId, effect.valueMilli, strength), [
          bounds.min,
          bounds.max,
        ]),
      };
    }
  }
}

/** The value bounds each kernel validates (QB per type; the others a shared range). */
const KERNEL_BOUNDS: readonly [number, number] = [-500, 500];

function scaledKernelEffects<T extends { readonly type: string; readonly value: number }>(
  effects: readonly T[],
  strength: number,
): readonly T[] {
  // Kernel card values are bonuses (`*_multiplier_permille: 250` is +25%), so they scale directly.
  return effects.map((effect) => {
    if (DISCRETE.test(effect.type)) return effect;
    const bounds =
      (QB_SKILL_EFFECT_BOUNDS as Readonly<Record<string, readonly [number, number]>>)[
        effect.type
      ] ?? KERNEL_BOUNDS;
    return { ...effect, value: within(Math.round((effect.value * strength) / 1000), bounds) };
  });
}

/**
 * The mechanics this career plays with: each mastered card's effects scaled in every catalog
 * that reads them (weekly builds, the QB/RB/CB and defender kernels). Unmastered careers get
 * the shared mechanics unchanged.
 */
export function withMasteryVNext(
  career: Pick<CareerVNext, 'cards'>,
  mechanics: CareerVNextMechanics,
): CareerVNextMechanics {
  const mastery = cardsOfVNext(career).mastery;
  const strengthOf = (id: string) =>
    VNEXT_CARD_TUNING.mastery.strengthPermille[Math.min(3, Math.max(1, mastery[id] ?? 1)) - 1]!;
  if (Object.values(mastery).every((level) => (level ?? 1) <= 1)) return mechanics;
  const definitions = mechanics.skillBuilds.definitions.map(
    (definition): SkillMechanicsDefinition =>
      strengthOf(definition.id) === 1000
        ? definition
        : {
            ...definition,
            effects: definition.effects.map((effect) =>
              scaledSkillEffect(effect, strengthOf(definition.id)),
            ),
          },
  );
  const kernel = <
    T extends {
      readonly id: SkillId;
      readonly effects: readonly { readonly type: string; readonly value: number }[];
    },
  >(
    skills: readonly T[],
  ): readonly T[] =>
    skills.map((skill) =>
      strengthOf(skill.id) === 1000
        ? skill
        : { ...skill, effects: scaledKernelEffects(skill.effects, strengthOf(skill.id)) },
    );
  return {
    ...mechanics,
    skillBuilds: { ...mechanics.skillBuilds, definitions },
    qb: { ...mechanics.qb, skills: kernel(mechanics.qb.skills) },
    rb: { ...mechanics.rb, skills: kernel(mechanics.rb.skills) },
    cb: { ...mechanics.cb, skills: kernel(mechanics.cb.skills) },
    defenders: {
      position_lb: {
        ...mechanics.defenders.position_lb,
        skills: kernel(mechanics.defenders.position_lb.skills),
      },
      position_edge: {
        ...mechanics.defenders.position_edge,
        skills: kernel(mechanics.defenders.position_edge.skills),
      },
    },
  } as CareerVNextMechanics;
}

// ---------------------------------------------------------------------------------------------
// Commands (pure; they return the new card state or null when not allowed).

export type CardCommandFailureVNext =
  | 'not_enough_insight'
  | 'already_owned'
  | 'not_owned'
  | 'unknown_card'
  | 'max_mastery'
  | 'no_duplicate';

export interface CardStateChangeVNext {
  readonly cards: CardsVNext;
  readonly ownedSkillIds: readonly SkillId[];
  /** The card a craft or draw added (null when a draw produced a duplicate). */
  readonly added: SkillId | null;
}

/** Crafts a specific unowned card at its fixed grade price. */
export function craftCardVNext(
  career: CareerVNext,
  skillId: string,
  mechanics: CareerVNextMechanics,
): CardStateChangeVNext | CardCommandFailureVNext {
  const gradeId = cardGradeVNext(career, skillId, mechanics);
  if (gradeId === null) return 'unknown_card';
  if (career.build.ownedSkillIds.includes(skillId as SkillId)) return 'already_owned';
  const cards = cardsOfVNext(career);
  const price = VNEXT_CARD_TUNING.workshopPrice[gradeId];
  if (cards.insight < price) return 'not_enough_insight';
  return {
    cards: { ...cards, insight: cards.insight - price },
    ownedSkillIds: [...career.build.ownedSkillIds, skillId as SkillId],
    added: skillId as SkillId,
  };
}

/** The grade a draw's roll lands on: the disclosed odds, or A+ when the pity count is due. */
export function drawGradeVNext(roll: number, pity: number): SkillGradeId {
  const { oddsPermille, pityDraws } = VNEXT_CARD_TUNING.draw;
  const value = roll % 1000;
  if (pity >= pityDraws - 1) {
    // The guaranteed draw keeps A and S in their disclosed ratio.
    const top = oddsPermille.skill_grade_a + oddsPermille.skill_grade_s;
    return value % top < oddsPermille.skill_grade_a ? 'skill_grade_a' : 'skill_grade_s';
  }
  let cursor = 0;
  for (const gradeId of GRADE_ORDER) {
    cursor += oddsPermille[gradeId];
    if (value < cursor) return gradeId;
  }
  return 'skill_grade_c';
}

/**
 * One Scouting Draw from `:vnext:draw:<n>`: a grade by the disclosed odds (pity included), then a
 * card of that grade (or the nearest grade below that has one). A new card joins the collection;
 * a duplicate is kept for fusion, or refunded when the card is already at top mastery.
 */
export function scoutingDrawVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): CardStateChangeVNext | CardCommandFailureVNext {
  const cards = cardsOfVNext(career);
  const tuning = VNEXT_CARD_TUNING;
  if (cards.insight < tuning.draw.cost) return 'not_enough_insight';
  const catalog = cardCatalogVNext(career, mechanics);
  if (catalog.length === 0) return 'unknown_card';
  const rng = createRng(`${String(career.seed)}:vnext:draw:${cards.draws.length}`);
  const gradeRoll = nextUint32(rng);
  const gradeId = drawGradeVNext(gradeRoll.value, cards.pity);
  const index = GRADE_ORDER.indexOf(gradeId);
  const pool =
    GRADE_ORDER.slice(0, index + 1)
      .reverse()
      .map((grade) => catalog.filter((row) => row.gradeId === grade))
      .find((rows) => rows.length > 0) ?? catalog;
  const picked = pool[nextUint32(gradeRoll.nextRng).value % pool.length]!;
  const owned = career.build.ownedSkillIds.includes(picked.skillId);
  const top = picked.gradeId === 'skill_grade_a' || picked.gradeId === 'skill_grade_s';
  const maxed = (cards.mastery[picked.skillId] ?? 1) >= tuning.mastery.maxLevel;
  const record = {
    seasonIndex: career.season.index,
    weekIndex: career.season.weekIndex,
    skillId: picked.skillId,
    gradeId: picked.gradeId,
    duplicate: owned,
  };
  return {
    cards: {
      ...cards,
      insight:
        cards.insight - tuning.draw.cost + (owned && maxed ? tuning.insight.duplicateRefund : 0),
      duplicates:
        owned && !maxed
          ? { ...cards.duplicates, [picked.skillId]: (cards.duplicates[picked.skillId] ?? 0) + 1 }
          : cards.duplicates,
      pity: top ? 0 : cards.pity + 1,
      draws: [...cards.draws, record].slice(-40),
    },
    ownedSkillIds: owned
      ? career.build.ownedSkillIds
      : [...career.build.ownedSkillIds, picked.skillId],
    added: owned ? null : picked.skillId,
  };
}

/**
 * Raises a card's mastery by one level, paid with Insight or by fusing one duplicate copy. Fusion
 * never consumes the card itself, equipped or not.
 */
export function masterCardVNext(
  career: CareerVNext,
  skillId: string,
  payment: 'insight' | 'duplicate',
): CardStateChangeVNext | CardCommandFailureVNext {
  if (!career.build.ownedSkillIds.includes(skillId as SkillId)) return 'not_owned';
  const cards = cardsOfVNext(career);
  const tuning = VNEXT_CARD_TUNING.mastery;
  const level = cards.mastery[skillId] ?? 1;
  if (level >= tuning.maxLevel) return 'max_mastery';
  const price = tuning.price[level]!;
  if (payment === 'insight' && cards.insight < price) return 'not_enough_insight';
  if (payment === 'duplicate' && (cards.duplicates[skillId] ?? 0) < 1) return 'no_duplicate';
  return {
    cards: {
      ...cards,
      insight: payment === 'insight' ? cards.insight - price : cards.insight,
      duplicates:
        payment === 'duplicate'
          ? { ...cards.duplicates, [skillId]: (cards.duplicates[skillId] ?? 0) - 1 }
          : cards.duplicates,
      mastery: { ...cards.mastery, [skillId]: level + 1 },
    },
    ownedSkillIds: career.build.ownedSkillIds,
    added: null,
  };
}

/** Insight earned at a season review (each award). */
export function awardInsightVNext(awards: number): number {
  return Math.max(0, awards) * VNEXT_CARD_TUNING.insight.perAward;
}
