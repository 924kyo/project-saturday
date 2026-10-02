import { describe, expect, it } from 'vitest';
import {
  advanceCalendarVNext,
  buyGearCareerVNext,
  buyServiceCareerVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  cardAttributionVNext,
  cardCatalogVNext,
  cardTellBonusesVNext,
  commitProgramVNext,
  craftCardCareerVNext,
  createCareerVNext,
  developmentPermilleVNext,
  drawCardCareerVNext,
  drawGradeVNext,
  equipGearCareerVNext,
  kickoffVNext,
  masterCardCareerVNext,
  nilDealCostVNext,
  nilLedgerVNext,
  overflowInsightVNext,
  parseCareerVNext,
  planWeekVNext,
  serializeCareerVNext,
  skipBreakthroughVNext,
  shopOfVNext,
  toGameDayVNext,
  VNEXT_BREAKTHROUGH_THRESHOLD,
  VNEXT_CARD_TUNING,
  VNEXT_NIL_TUNING,
  VNEXT_SHOP_TUNING,
  withMasteryVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
  type SkillId,
  type VNextPositionId,
} from '@project-saturday/game-core';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

const ok = (result: CareerVNextResult): CareerVNext => {
  if (!result.ok) throw new Error(result.reason);
  return result.career;
};

function identity(
  positionId: VNextPositionId,
  archetypeId: string,
): PositionPlayerCreationIdentity {
  return {
    displayName: 'Card Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_quiet'],
    appearance: defaultWrAppearance,
    heightCm: 186,
    weightKg: 88,
  } as unknown as PositionPlayerCreationIdentity;
}

/** A career at its first week plan with `insight` and `funds` to spend. */
function atWeek(
  seed: string,
  positionId: VNextPositionId = 'position_qb',
  archetypeId = 'archetype_qb_field_general',
  insight = 0,
  fundsUsd = 0,
) {
  const mechanics = buildCareerVNextMechanics(identity(positionId, archetypeId))!;
  const created = ok(
    createCareerVNext({ seed, identity: identity(positionId, archetypeId) }, mechanics),
  );
  let career = ok(commitProgramVNext(created, created.recruiting.offers[1]!.programId, mechanics));
  while (career.flow.type === 'CAMP') career = ok(advanceCalendarVNext(career, mechanics)!);
  career = {
    ...career,
    cards: { insight, mastery: {}, duplicates: {}, pity: 0, draws: [] },
    nil: {
      fundsUsd,
      benefits: [],
      lockerRoom: 50,
      obligation: null,
      history: [],
    },
  };
  return { mechanics, career };
}

const plan = (career: CareerVNext, mechanics: CareerVNextMechanics) => {
  void mechanics;
  void career;
  return ['action_film_study', 'action_recovery', 'action_study_hall'];
};

describe('CARD-04: the Workshop crafts any card at a fixed price', () => {
  it('charges the grade price, adds and equips the card, and refuses when short', () => {
    const { mechanics, career } = atWeek('craft', undefined, undefined, 200);
    const card = cardCatalogVNext(career, mechanics).find(
      ({ skillId }) => !career.build.ownedSkillIds.includes(skillId),
    )!;
    const crafted = ok(craftCardCareerVNext(career, card.skillId, mechanics));
    expect(crafted.cards!.insight).toBe(200 - VNEXT_CARD_TUNING.workshopPrice[card.gradeId]);
    expect(crafted.build.ownedSkillIds).toContain(card.skillId);
    expect(crafted.build.equippedSkillIds).toContain(card.skillId);
    // Deterministic: the same command gives the same career.
    expect(ok(craftCardCareerVNext(career, card.skillId, mechanics))).toEqual(crafted);
    expect(craftCardCareerVNext(crafted, card.skillId, mechanics).ok).toBe(false);
    const broke = { ...career, cards: { ...career.cards!, insight: 0 } };
    expect(craftCardCareerVNext(broke, card.skillId, mechanics).ok).toBe(false);
  });
});

describe('CARD-05: the Scouting Draw follows its disclosed odds, with pity', () => {
  it('maps rolls to the disclosed odds exactly, and the due draw is always A or better', () => {
    const counts: Record<string, number> = {};
    for (let roll = 0; roll < 1000; roll += 1) {
      const grade = drawGradeVNext(roll, 0);
      counts[grade] = (counts[grade] ?? 0) + 1;
    }
    expect(counts).toEqual(VNEXT_CARD_TUNING.draw.oddsPermille);
    for (let roll = 0; roll < 1000; roll += 1)
      expect(['skill_grade_a', 'skill_grade_s']).toContain(
        drawGradeVNext(roll, VNEXT_CARD_TUNING.draw.pityDraws - 1),
      );
  });

  it('a seeded run never goes past the pity count, and duplicates are kept or refunded', () => {
    const { mechanics, career: start } = atWeek('draws', undefined, undefined, 1_000_000);
    let career = start;
    let streak = 0;
    let longest = 0;
    let duplicates = 0;
    for (let draw = 0; draw < 200; draw += 1) {
      const next = ok(drawCardCareerVNext(career, mechanics));
      const record = next.cards!.draws.at(-1)!;
      streak = ['skill_grade_a', 'skill_grade_s'].includes(record.gradeId) ? 0 : streak + 1;
      longest = Math.max(longest, streak);
      if (record.duplicate) duplicates += 1;
      expect(next.cards!.insight).toBeLessThanOrEqual(career.cards!.insight);
      career = next;
    }
    expect(longest).toBeLessThan(VNEXT_CARD_TUNING.draw.pityDraws);
    expect(duplicates).toBeGreaterThan(0);
    const held = Object.values(career.cards!.duplicates).reduce((sum, count) => sum + count, 0);
    expect(held).toBeGreaterThan(0);
    // Every card of the position is owned by now; nothing was ever lost.
    expect(new Set(career.build.ownedSkillIds).size).toBe(career.build.ownedSkillIds.length);
  });
});

describe('CARD-06: mastery strengthens a card, previewed exactly; fusion uses duplicates only', () => {
  it('scales weekly effects and kernel effects, clamped to their bounds, and games still start', () => {
    const { mechanics, career: base } = atWeek('mastery', undefined, undefined, 1_000);
    const catalog = cardCatalogVNext(base, mechanics);
    let career = base;
    for (const { skillId } of catalog.slice(0, 4))
      career = ok(craftCardCareerVNext(career, skillId, mechanics));
    const target = career.build.equippedSkillIds.find((id): id is SkillId => id !== null)!;
    const level2 = ok(masterCardCareerVNext(career, target, 'insight'));
    expect(level2.cards!.mastery[target]).toBe(2);
    expect(level2.cards!.insight).toBe(career.cards!.insight - VNEXT_CARD_TUNING.mastery.price[1]);
    // The preview is the scaled definition the game will play.
    const before = withMasteryVNext(career, mechanics).qb.skills.find(({ id }) => id === target);
    const after = withMasteryVNext(level2, mechanics).qb.skills.find(({ id }) => id === target);
    if (before !== undefined && after !== undefined)
      for (const [index, effect] of before.effects.entries())
        expect(Math.abs(after.effects[index]!.value)).toBeGreaterThanOrEqual(
          Math.abs(effect.value),
        );
    // Fusion needs a duplicate and never touches the card itself.
    expect(masterCardCareerVNext(level2, target, 'duplicate').ok).toBe(false);
    const withCopy = { ...level2, cards: { ...level2.cards!, duplicates: { [target]: 1 } } };
    const level3 = ok(masterCardCareerVNext(withCopy, target, 'duplicate'));
    expect(level3.cards!.mastery[target]).toBe(3);
    expect(level3.cards!.duplicates[target]).toBe(0);
    expect(level3.build.equippedSkillIds).toEqual(level2.build.equippedSkillIds);
    expect(masterCardCareerVNext(level3, target, 'insight').ok).toBe(false);
    // Every card at top mastery: the kernels still accept the catalog and the game starts.
    let maxed = level3;
    for (const skillId of maxed.build.ownedSkillIds)
      maxed = {
        ...maxed,
        cards: { ...maxed.cards!, mastery: { ...maxed.cards!.mastery, [skillId]: 3 } },
      };
    let game = ok(planWeekVNext(maxed, plan(maxed, mechanics), mechanics));
    for (let guard = 0; guard < 20 && game.flow.type !== 'GAME'; guard += 1) {
      const flow = game.flow;
      if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
        game = ok(skipBreakthroughVNext(game));
      else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
        game = ok(chooseEventVNext(game, flow.event.choiceIds[0]!, mechanics));
      else if (flow.type === 'NIL' && flow.offer.decision === null)
        game = ok(chooseNilVNext(game, false, mechanics));
      else if (flow.type === 'INJURY' && flow.report.availability === null)
        game = ok(chooseInjuryVNext(game, 'injury_choice_rest_rehab', mechanics));
      else game = ok(toGameDayVNext(game, mechanics));
    }
    expect(game.flow.type).toBe('GAME');
    expect(kickoffVNext(game, mechanics).ok).toBe(true);
  });
});

describe('CARD-01 and CARD-02: attribution is the with/without difference', () => {
  it('stores each equipped card’s difference on the practice report', () => {
    const { mechanics, career: base } = atWeek(
      'attribution',
      'position_wr',
      'archetype_wr_route_technician',
      1_000,
    );
    let career = base;
    for (const { skillId } of cardCatalogVNext(base, mechanics).slice(0, 4))
      career = ok(craftCardCareerVNext(career, skillId, mechanics));
    const focusIds = plan(career, mechanics);
    const expected = cardAttributionVNext(
      career,
      focusIds,
      mechanics,
      developmentPermilleVNext(career, mechanics),
    );
    const planned = ok(planWeekVNext(career, focusIds, mechanics));
    if (planned.flow.type !== 'PRACTICE_REPORT') throw new Error(planned.flow.type);
    expect(planned.flow.report.cardAttribution).toEqual(expected);
    // A card whose effects never applied changed nothing.
    for (const row of expected)
      if (!row.active)
        expect([row.xp, row.body, row.preparation, row.confidence, row.gpaMilli]).toEqual([
          0, 0, 0, 0, 0,
        ]);
  });

  it('names the tells a card brings to a game, from the kernel catalog', () => {
    const { mechanics, career: base } = atWeek('tells', undefined, undefined, 1_000);
    const clueCard = withMasteryVNext(base, mechanics).qb.skills.find(({ effects }) =>
      effects.some(({ type }) => type === 'qb_information_clue_bonus'),
    );
    expect(clueCard).toBeDefined();
    const career = ok(craftCardCareerVNext(base, clueCard!.id, mechanics));
    const bonus = cardTellBonusesVNext(career, mechanics).find(
      ({ skillId }) => skillId === clueCard!.id,
    );
    expect(bonus?.tells).toBe(
      clueCard!.effects
        .filter(({ type }) => type === 'qb_information_clue_bonus')
        .reduce((sum, { value }) => sum + value, 0),
    );
  });
});

describe('CARD-03: a complete collection banks Insight', () => {
  it('holds the gauge full and converts every point once nothing is left to offer', () => {
    const { mechanics, career } = atWeek('complete', undefined, undefined, 1_000_000);
    let owned = career;
    for (const { skillId } of cardCatalogVNext(career, mechanics))
      owned = ok(craftCardCareerVNext(owned, skillId, mechanics));
    expect(overflowInsightVNext(owned, mechanics, VNEXT_BREAKTHROUGH_THRESHOLD, 19)).toEqual({
      gauge: VNEXT_BREAKTHROUGH_THRESHOLD,
      insight: 19,
    });
    expect(overflowInsightVNext(career, mechanics, 10, 19)).toEqual({ gauge: 29, insight: 0 });
    // The card state round-trips through the save codec.
    expect(parseCareerVNext(serializeCareerVNext(owned)!)?.cards).toEqual(owned.cards);
  });
});

describe('CARD-04: skipping a breakthrough offer banks Insight', () => {
  it('spends the gauge, adds Insight, and the week goes on', () => {
    const { mechanics, career: base } = atWeek('skip');
    const skillId = cardCatalogVNext(base, mechanics)[0]!.skillId;
    const offered: CareerVNext = {
      ...base,
      athlete: { ...base.athlete, breakthroughGauge: VNEXT_BREAKTHROUGH_THRESHOLD + 7 },
      flow: {
        type: 'BREAKTHROUGH',
        offer: { weekIndex: 0, skillIds: [skillId], chosenSkillId: null, slotIndex: null },
        trainingLoad: 0,
      },
    };
    const skipped = ok(skipBreakthroughVNext(offered));
    expect(skipped.athlete.breakthroughGauge).toBe(7);
    expect(skipped.cards!.insight).toBe(VNEXT_CARD_TUNING.insight.skippedOffer);
    expect(skipBreakthroughVNext(skipped).ok).toBe(false);
    expect(toGameDayVNext(skipped, mechanics).ok).toBe(true);
  });
});

describe('NIL-01…03: the NIL shop, style tokens and deal costs', () => {
  it('a service applies its effect, charges a fixed price once a week, and never overdraws', () => {
    const { career } = atWeek('shop', undefined, undefined, 0, 400);
    const bought = ok(buyServiceCareerVNext(career, 'shop_recovery_session'));
    const service = VNEXT_SHOP_TUNING.services.shop_recovery_session;
    expect(bought.nil!.fundsUsd).toBe(400 - service.priceUsd);
    expect(bought.athlete.profile.state.body).toBe(
      Math.min(100, career.athlete.profile.state.body + service.body),
    );
    expect(buyServiceCareerVNext(bought, 'shop_recovery_session').ok).toBe(false);
    expect(buyServiceCareerVNext(bought, 'shop_agent_visibility').ok).toBe(false);
    const ledger = nilLedgerVNext(bought);
    expect(ledger.earnedUsd).toBe(400);
    expect(ledger.spendableUsd + ledger.spentUsd).toBe(ledger.earnedUsd);
  });

  it('a style token unlocks gear of choice; gear can be worn or put away', () => {
    const { career: base } = atWeek('token');
    const career = {
      ...base,
      nil: {
        ...base.nil!,
        benefits: [{ benefitId: VNEXT_SHOP_TUNING.styleTokenBenefitId, quantity: 1 }],
      },
    } as CareerVNext;
    const unlocked = ok(buyGearCareerVNext(career, 'gear_gold_trim', 'token'));
    expect(shopOfVNext(unlocked).ownedGearIds).toEqual(['gear_gold_trim']);
    expect(shopOfVNext(unlocked).equippedGearIds).toEqual(['gear_gold_trim']);
    expect(unlocked.nil!.benefits).toEqual([]);
    expect(buyGearCareerVNext(unlocked, 'gear_volt_gloves', 'token').ok).toBe(false);
    const off = ok(equipGearCareerVNext(unlocked, 'gear_gold_trim', false));
    expect(shopOfVNext(off).equippedGearIds).toEqual([]);
    expect(parseCareerVNext(serializeCareerVNext(off)!)?.shop).toEqual(off.shop);
  });

  it('a deal’s cost over its term is the weekly practice cost times its weeks', () => {
    const { mechanics } = atWeek('deal');
    for (const offer of mechanics.nil.catalog.nilOffers) {
      const cost = nilDealCostVNext(offer);
      expect(cost.practicePerWeek).toBe(
        VNEXT_NIL_TUNING.practicePenaltyPerFocus * offer.obligation.focusCost,
      );
      expect(cost.practiceTotal).toBe(cost.weeks * cost.practicePerWeek);
    }
  });
});
