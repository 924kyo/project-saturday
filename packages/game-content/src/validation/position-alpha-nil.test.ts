import { describe, expect, it } from 'vitest';
import {
  advancePositionAlphaGameDayV2,
  choosePositionAlphaSkillV2,
  commitPositionAlphaFocusPlanV2,
  projectPositionAlphaPlanningV2,
  migratePositionAlphaSessionV1ToV2,
  parsePositionAlphaSessionV2Json,
  resolvePositionAlphaEventV2,
  resolvePositionAlphaGameDaySnapV2,
  resolvePositionAlphaInjuryChoiceV2,
  resolvePositionAlphaNilPlanningV2,
  settlePositionAlphaGameDayV2,
  validatePositionAlphaSessionV2,
  type NilOfferId,
  type PositionAlphaCommandResultV2,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaSessionV2,
  projectPositionAlphaNilPlanningV2,
  projectPositionAlphaNilChoicesV2,
  equipPositionAlphaSkillV2,
} from '@project-saturday/game-core';
import { positionSkillBuilds } from '../content/position-skill-builds.js';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  chooseShippedPositionAlphaSkill,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaWeek,
} from '../index.js';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;
function fixture(
  [positionId, archetypeId]: readonly [(typeof CASES)[number][0], (typeof CASES)[number][1]],
  offerId: NilOfferId,
  startWeek = 0,
) {
  const identity = {
    displayName: 'NIL Athlete',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer' as const,
    personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  };
  const created = createShippedPositionAlphaSession({
    careerSeed: `nil-${positionId}`,
    programId: 'program_ember_peak_polytechnic',
    identity,
  });
  const base = buildShippedPositionAlphaSessionCommandMechanics({ identity });
  if (!created.ok || base === null) throw new Error('Invalid fixture');
  let historical = created.session;
  while (
    historical.weekHistory.length < startWeek ||
    historical.skills.offeredSkillIds !== null ||
    historical.events.pending !== null
  ) {
    const next =
      historical.skills.offeredSkillIds !== null
        ? chooseShippedPositionAlphaSkill(historical, historical.skills.offeredSkillIds[0])
        : historical.events.pending !== null
          ? resolveShippedPositionAlphaEvent(historical, historical.events.pending.choiceIds[0])
          : resolveShippedPositionAlphaWeek(
              historical,
              base.trainingActions.find((action) => action.positionId === positionId)!.id,
              'best_fit',
            );
    if (!next.ok) throw new Error(next.reason);
    historical = next.session;
  }
  const state = { ...historical.player.state, brand: 60, gpa: 2.35 };
  historical = {
    ...historical,
    player: { ...historical.player, state },
    lifecycle: { ...historical.lifecycle, playerState: state },
  };
  const mechanics = {
    ...base,
    nil: {
      ...base.nil,
      catalog: {
        ...base.nil.catalog,
        // Isolate the authored NIL effects from depth rank; ordinary eligibility
        // boundaries are separately covered by shared selection and season tests.
        nilOffers: base.nil.catalog.nilOffers.map((offer) =>
          offer.id === offerId
            ? { ...offer, requirements: { ...offer.requirements, maximumDepthRank: 8 } }
            : { ...offer, requirements: { ...offer.requirements, minimumBrand: 100 } },
        ),
      },
    },
    // Isolate the saved obligation's GPA contribution from separate event GPA effects.
    qb: {
      ...base.qb,
      events: base.qb.events.map((event) => ({
        ...event,
        choices: event.choices.map((choice) => ({
          ...choice,
          effects: { ...choice.effects, gpaMilliDelta: 0 },
        })),
      })),
    },
    rb: {
      ...base.rb,
      events: base.rb.events.map((event) => ({
        ...event,
        choices: event.choices.map((choice) => ({
          ...choice,
          effects: { ...choice.effects, gpaMilliDelta: 0 },
        })),
      })),
    },
    cb: {
      ...base.cb,
      events: base.cb.events.map((event) => ({
        ...event,
        choices: event.choices.map((choice) => ({
          ...choice,
          effects: { ...choice.effects, gpaMilliDelta: 0 },
        })),
      })),
    },
  } satisfies PositionAlphaSessionCommandMechanics;
  const session = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
  expect(session).not.toBeNull();
  expect(Object.hasOwn(session, 'nil')).toBe(false);
  return { session, mechanics };
}
function accept(
  result: PositionAlphaCommandResultV2,
  mechanics: PositionAlphaSessionCommandMechanics,
) {
  if (!result.ok) throw new Error(result.reason);
  const parsed = parsePositionAlphaSessionV2Json(JSON.stringify(result.session), mechanics);
  expect(parsed).toEqual(result.session);
  return parsed!;
}
function advance(session: PositionAlphaSessionV2, mechanics: PositionAlphaSessionCommandMechanics) {
  const day = session.gameDay;
  return accept(
    day.type === 'EVENT_CHOICE'
      ? resolvePositionAlphaEventV2(session, day.event!.choiceIds[0], mechanics)
      : day.type === 'INJURY_CHOICE'
        ? resolvePositionAlphaInjuryChoiceV2(session, 'injury_choice_rest_rehab', mechanics)
        : day.type === 'ACTIVE_SNAP' && day.game?.game.type === 'ACTIVE'
          ? resolvePositionAlphaGameDaySnapV2(
              session,
              day.game.game.pendingSnap.decisionIds[0],
              mechanics,
            )
          : advancePositionAlphaGameDayV2(session, mechanics),
    mechanics,
  );
}
function finish(initial: PositionAlphaSessionV2, mechanics: PositionAlphaSessionCommandMechanics) {
  let session = initial;
  for (let step = 0; session.gameDay.type !== 'POST_GAME'; step += 1) {
    if (step > 24) throw new Error('Unfinished game');
    session = advance(session, mechanics);
  }
  session = accept(settlePositionAlphaGameDayV2(session, mechanics), mechanics);
  if (session.skills.offeredSkillIds !== null)
    session = accept(
      choosePositionAlphaSkillV2(session, session.skills.offeredSkillIds[0], mechanics),
      mechanics,
    );
  return session;
}
const recovery = ['action_recovery', 'action_recovery', 'action_recovery'];

describe('saved current added-position NIL commands', () => {
  it.each(CASES)(
    '%s previews only accepted NIL commands with exact effects and zero draws',
    (positionId, archetypeId) => {
      const offerId = 'nil_offer_youth_route_clinic';
      const { session: initial, mechanics } = fixture([positionId, archetypeId], offerId);
      expect(projectPositionAlphaNilChoicesV2(initial, mechanics)?.choices).toEqual([]);
      const planned = accept(
        commitPositionAlphaFocusPlanV2(initial, recovery, mechanics),
        mechanics,
      );
      expect(projectPositionAlphaNilChoicesV2(planned, mechanics)).toBeNull();
      const offered = finish(planned, mechanics);
      const accepted = accept(
        resolvePositionAlphaNilPlanningV2(offered, { type: 'ACCEPT', offerId }, mechanics),
        mechanics,
      );
      const fulfilled = accept(
        resolvePositionAlphaNilPlanningV2(accepted, { type: 'FULFILL' }, mechanics),
        mechanics,
      );
      const defaulted = accept(
        resolvePositionAlphaNilPlanningV2(accepted, { type: 'DEFAULT' }, mechanics),
        mechanics,
      );
      for (const [source, expectedTypes] of [
        [offered, ['ACCEPT', 'DECLINE']],
        [accepted, ['FULFILL', 'DEFAULT']],
        [fulfilled, []],
        [defaulted, []],
      ] as const) {
        const owned = JSON.parse(JSON.stringify(source)) as PositionAlphaSessionV2;
        const before = JSON.stringify(owned);
        const projection = projectPositionAlphaNilChoicesV2(owned, mechanics)!;
        expect(projection).not.toBeNull();
        expect(projection.choices.map(({ action }) => action.type)).toEqual(expectedTypes);
        expect(projection).toEqual(projectPositionAlphaNilChoicesV2(owned, mechanics));
        expect(projection.current).toEqual(
          projectPositionAlphaNilPlanningV2(source, projection.careerWeekIndex, mechanics.nil),
        );
        expect(Object.isFrozen(projection.current.playerState)).toBe(true);
        expect(Object.isFrozen(owned.player.state)).toBe(false);
        for (const choice of projection.choices) {
          const command = resolvePositionAlphaNilPlanningV2(source, choice.action, mechanics);
          if (!command.ok) throw new Error(command.reason);
          expect(choice.after).toEqual(
            projectPositionAlphaNilPlanningV2(
              command.session,
              projection.careerWeekIndex,
              mechanics.nil,
            ),
          );
          expect(command.session.careerRng).toEqual(source.careerRng);
          expect(command.session.world).toEqual(source.world);
          expect(command.session.player).toEqual(source.player);
          expect(Object.isFrozen(choice.after.state.history)).toBe(true);
        }
        expect(JSON.stringify(owned)).toBe(before);
      }
      expect(projectPositionAlphaNilChoicesV2({ ...offered, revision: -1 }, mechanics)).toBeNull();
    },
  );
  it.each(CASES)(
    '%s snapshots acceptance skills, permits later swaps, and rejects forged ownership',
    (positionId, archetypeId) => {
      const offerId = 'nil_offer_youth_route_clinic';
      const { session: initial, mechanics } = fixture([positionId, archetypeId], offerId);
      const skillId = positionSkillBuilds.find(
        (entry) => entry.positionId === positionId && entry.buildId === 'nil',
      )!.skillId;
      const owned: PositionAlphaSessionV2 = {
        ...initial,
        skills: {
          ...initial.skills,
          ownedSkillIds: [skillId],
          breakthroughHistory: [{ skillId, weekIndex: 0 }],
        },
      };
      const offered = finish(
        accept(commitPositionAlphaFocusPlanV2(owned, recovery, mechanics), mechanics),
        mechanics,
      );
      const equipped = accept(equipPositionAlphaSkillV2(offered, skillId, 3, mechanics), mechanics);
      const before = JSON.stringify(equipped);
      const accepted = accept(
        resolvePositionAlphaNilPlanningV2(equipped, { type: 'ACCEPT', offerId }, mechanics),
        mechanics,
      );
      expect(accepted.nil!.state.fictionalFundsUsd).toBe(275);
      expect(accepted.nil!.planning).toEqual([
        {
          action: { type: 'ACCEPT', offerId },
          equippedSkillIds: equipped.skills.equippedSkillIds,
        },
      ]);
      expect(accepted.nil!.state.history.at(-1)).toMatchObject({
        model: 'nil_offer_decision_v1',
        rewardMultiplierPermille: 1100,
        appliedSkillEffects: [
          { skillId, slotIndex: 3, hookId: 'life_hook_nil_reward_multiplier', valueMilli: 1100 },
        ],
      });
      expect(accepted.player).toEqual(equipped.player);
      expect(accepted.world).toEqual(equipped.world);
      expect(accepted.careerRng).toEqual(equipped.careerRng);
      expect(JSON.stringify(equipped)).toBe(before);
      const swapped = accept(equipPositionAlphaSkillV2(accepted, null, 3, mechanics), mechanics);
      expect(swapped.nil).toEqual(accepted.nil);
      expect(projectPositionAlphaNilPlanningV2(swapped, 1, mechanics.nil)).toEqual(
        projectPositionAlphaNilPlanningV2(accepted, 1, mechanics.nil),
      );
      // Equipping after an unboosted acceptance does not retroactively pay the difference.
      const plain = accept(
        resolvePositionAlphaNilPlanningV2(offered, { type: 'ACCEPT', offerId }, mechanics),
        mechanics,
      );
      const late = accept(equipPositionAlphaSkillV2(plain, skillId, 3, mechanics), mechanics);
      expect(late.nil).toEqual(plain.nil);
      expect(late.nil!.state.fictionalFundsUsd).toBe(250);
      const declined = accept(
        resolvePositionAlphaNilPlanningV2(equipped, { type: 'DECLINE', offerId }, mechanics),
        mechanics,
      );
      expect(declined.nil!.state.history.at(-1)).toMatchObject({
        rewardMultiplierPermille: 1000,
        appliedSkillEffects: [],
        appliedEffects: [],
      });
      const fulfilled = accept(
        resolvePositionAlphaNilPlanningV2(accepted, { type: 'FULFILL' }, mechanics),
        mechanics,
      );
      const fulfillment = fulfilled.nil!.state.history.at(-1)!;
      if (fulfillment.model !== 'nil_obligation_resolution_v1')
        throw new Error('Missing obligation');
      expect(
        fulfillment.appliedEffects.every((effect) => effect.rewardMultiplierPermille === 1000),
      ).toBe(true);
      const defaulted = accept(
        resolvePositionAlphaNilPlanningV2(swapped, { type: 'DEFAULT' }, mechanics),
        mechanics,
      );
      const defaultEvidence = defaulted.nil!.state.history.at(-1)!;
      if (defaultEvidence.model !== 'nil_obligation_resolution_v1')
        throw new Error('Missing default');
      expect(defaultEvidence.appliedEffects.map(({ requestedDelta }) => requestedDelta)).toEqual([
        -5,
      ]);
      expect(defaulted.nil!.planning.map(({ equippedSkillIds }) => equippedSkillIds)).toEqual([
        equipped.skills.equippedSkillIds,
        swapped.skills.equippedSkillIds,
      ]);
      const forgedLoadouts = [
        [null, null, null, null], // would remove an already-paid reward
        [skillId, null, null, skillId], // duplicate
        [null, null, null], // old three-slot shape is not a current action snapshot
        [
          null,
          null,
          null,
          positionId === 'position_qb' ? 'skill_rb_shared_credit_s' : 'skill_qb_shared_spotlight_s',
        ],
      ];
      for (const equippedSkillIds of forgedLoadouts)
        expect(
          validatePositionAlphaSessionV2(
            {
              ...accepted,
              nil: {
                ...accepted.nil!,
                planning: [
                  {
                    ...accepted.nil!.planning[0]!,
                    equippedSkillIds,
                  },
                ],
              },
            },
            mechanics,
          ),
        ).toBe(false);
      expect(
        validatePositionAlphaSessionV2(
          {
            ...swapped,
            skills: { ...swapped.skills, ownedSkillIds: [], breakthroughHistory: [] },
          },
          mechanics,
        ),
      ).toBe(false);
      const settled = finish(
        accept(commitPositionAlphaFocusPlanV2(defaulted, recovery, mechanics), mechanics),
        mechanics,
      );
      const last = settled.weekHistory.at(-1)!;
      if (last.model !== 'position_alpha_week_summary_v2')
        throw new Error('Missing saved NIL week');
      expect(last.source.nil!.planning).toEqual(defaulted.nil!.planning);
      expect(last.source.skills.equippedSkillIds).toEqual(swapped.skills.equippedSkillIds);
      // The aggregate can own the card today, but a dated acquisition cannot justify an earlier action.
      const later = finish(
        accept(commitPositionAlphaFocusPlanV2(settled, recovery, mechanics), mechanics),
        mechanics,
      );
      expect(
        validatePositionAlphaSessionV2(
          {
            ...later,
            skills: {
              ...later.skills,
              breakthroughHistory: later.skills.breakthroughHistory.map((entry) =>
                entry.skillId === skillId ? { ...entry, weekIndex: 2 } : entry,
              ),
            },
          },
          mechanics,
        ),
      ).toBe(false);
    },
  );

  it.each(CASES)(
    '%s completes twelve saved weeks with accepted offers and fulfilled obligations',
    (positionId, archetypeId) => {
      const { session: initial, mechanics } = fixture(
        [positionId, archetypeId],
        'nil_offer_youth_route_clinic',
      );
      const skillId = positionSkillBuilds.find(
        (entry) => entry.positionId === positionId && entry.buildId === 'nil',
      )!.skillId;
      let session: PositionAlphaSessionV2 = {
        ...initial,
        skills: {
          ...initial.skills,
          ownedSkillIds: [skillId],
          equippedSkillIds: [null, null, null, skillId],
          breakthroughHistory: [{ skillId, weekIndex: 0 }],
        },
      };
      for (let week = 0; week < 12; week += 1) {
        const beforePlanning = session.careerRng;
        const pending = session.nil?.state.pendingOffers[0];
        if (pending !== undefined && session.nil!.state.activeObligation === null)
          session = accept(
            resolvePositionAlphaNilPlanningV2(
              session,
              { type: 'ACCEPT', offerId: pending.offerId },
              mechanics,
            ),
            mechanics,
          );
        if (
          session.nil?.state.activeObligation !== null &&
          session.nil?.state.activeObligation !== undefined
        )
          session = accept(
            resolvePositionAlphaNilPlanningV2(session, { type: 'FULFILL' }, mechanics),
            mechanics,
          );
        expect(session.careerRng).toEqual(beforePlanning);
        const worldBefore = session.world.rng.drawCount;
        session = finish(
          accept(
            commitPositionAlphaFocusPlanV2(
              session,
              ['action_recovery', 'action_film_study', 'action_study_hall'],
              mechanics,
            ),
            mechanics,
          ),
          mechanics,
        );
        expect(session.world.rng.drawCount - worldBefore).toBe(30);
        const summary = session.weekHistory.at(-1)!;
        if (summary.model !== 'position_alpha_week_summary_v2')
          throw new Error('Missing current week');
        expect(summary.nil.rngBefore).toEqual(summary.injury.rng);
        expect(summary.completedGame.game.rng.drawCount - summary.nil.rng.drawCount).toBe(
          summary.opportunityCount * 6,
        );
        expect(session.nil!.planning).toEqual([]);
        if (week >= 9) expect(summary.nil.reason).toBe('SEASON_CUTOFF');
      }
      expect(session.phase.type).toBe('SEASON_REVIEW');
      expect(session.nil!.state.history.length).toBeGreaterThanOrEqual(2);
      expect(session.nil!.state.fictionalFundsUsd).toBeGreaterThan(0);
      expect(session.nil!.state.activeObligation).toBeNull();
      expect(new TextEncoder().encode(JSON.stringify(session)).byteLength).toBeLessThan(1_000_000);
    },
  );
  it.each(CASES)(
    '%s preserves decline, reward/default relationship effects, and caller ownership',
    (positionId, archetypeId) => {
      const offerId = 'nil_offer_youth_route_clinic';
      const { session: initial, mechanics } = fixture([positionId, archetypeId], offerId);
      const offered = finish(
        accept(commitPositionAlphaFocusPlanV2(initial, recovery, mechanics), mechanics),
        mechanics,
      );
      expect(offered.nil!.state.pendingOffers[0]!.offerId).toBe(offerId);
      const declined = accept(
        resolvePositionAlphaNilPlanningV2(offered, { type: 'DECLINE', offerId }, mechanics),
        mechanics,
      );
      expect(declined.nil!.state.fictionalFundsUsd).toBe(0);
      expect(declined.nil!.state.activeObligation).toBeNull();
      const declinedProjection = projectPositionAlphaNilPlanningV2(declined, 1, mechanics.nil)!;
      expect(declinedProjection.playerState).toEqual(offered.player.state);
      expect(declinedProjection.relationships).toEqual(offered.lifecycle.relationships);
      expect(
        resolvePositionAlphaNilPlanningV2(declined, { type: 'DECLINE', offerId }, mechanics).ok,
      ).toBe(false);
      const raw = JSON.parse(JSON.stringify(offered)) as PositionAlphaSessionV2;
      const before = JSON.stringify(raw);
      const accepted = accept(
        resolvePositionAlphaNilPlanningV2(raw, { type: 'ACCEPT', offerId }, mechanics),
        mechanics,
      );
      expect(JSON.stringify(raw)).toBe(before);
      expect(Object.isFrozen(raw.nil!.weekStart)).toBe(false);
      expect(Object.isFrozen(raw.player.state)).toBe(false);
      expect(Object.isFrozen(raw.careerRng)).toBe(false);
      const acceptedProjection = projectPositionAlphaNilPlanningV2(accepted, 1, mechanics.nil)!;
      const roomBefore = offered.lifecycle.relationships.find(
        ({ actorId }) => actorId === 'ROOM_LEADER',
      )!.value;
      expect(
        acceptedProjection.relationships.find(({ actorId }) => actorId === 'ROOM_LEADER')!.value,
      ).toBe(roomBefore + 4);
      expect(accepted.nil!.state.fictionalFundsUsd).toBe(250);
      const defaulted = accept(
        resolvePositionAlphaNilPlanningV2(accepted, { type: 'DEFAULT' }, mechanics),
        mechanics,
      );
      expect(defaulted.nil!.state.activeObligation).toBeNull();
      expect(defaulted.nil!.state.fictionalFundsUsd).toBe(250);
      expect(defaulted.careerRng).toEqual(offered.careerRng);
      expect(defaulted.world).toEqual(offered.world);
      expect(defaulted.player).toEqual(offered.player);
      const projected = projectPositionAlphaNilPlanningV2(defaulted, 1, mechanics.nil)!;
      expect(projected.relationships.find(({ actorId }) => actorId === 'ROOM_LEADER')!.value).toBe(
        roomBefore - 1,
      );
      expect(projected.obligationGpaDeltaMilli).toBe(0);
      expect(resolvePositionAlphaNilPlanningV2(defaulted, { type: 'DEFAULT' }, mechanics).ok).toBe(
        false,
      );
      const planned = accept(
        commitPositionAlphaFocusPlanV2(defaulted, recovery, mechanics),
        mechanics,
      );
      if (planned.gameDay.type === 'IDLE') throw new Error('Missing preparation');
      expect(
        planned.gameDay.preparation.relationships.changes.find(
          ({ actorId }) => actorId === 'ROOM_LEADER',
        )!.valueBefore,
      ).toBe(roomBefore - 1);
      const settled = finish(planned, mechanics);
      expect(
        settled.lifecycle.relationships.find(({ actorId }) => actorId === 'ROOM_LEADER')!.value,
      ).toBe(roomBefore - 1);
      expect(settled.nil!.state.history).toHaveLength(2);
      const week = settled.weekHistory.at(-1)!;
      if (week.model !== 'position_alpha_week_summary_v2') throw new Error('Missing NIL record');
      expect(week.nil.selection!.eligibleOfferIds).not.toContain(offerId);
    },
  );

  it.each(CASES)(
    '%s permits inclusive-expiry acceptance and expires ignored offers once at commitment',
    (positionId, archetypeId) => {
      const offerId = 'nil_offer_neighborhood_breakfast_feature';
      const { session: initial, mechanics } = fixture([positionId, archetypeId], offerId);
      let session = finish(
        accept(commitPositionAlphaFocusPlanV2(initial, recovery, mechanics), mechanics),
        mechanics,
      );
      expect(session.nil!.state.pendingOffers[0]!.expiresAfterWeekIndex).toBe(2);
      session = finish(
        accept(commitPositionAlphaFocusPlanV2(session, recovery, mechanics), mechanics),
        mechanics,
      );
      const accepted = accept(
        resolvePositionAlphaNilPlanningV2(session, { type: 'ACCEPT', offerId }, mechanics),
        mechanics,
      );
      expect(accepted.nil!.state.fictionalFundsUsd).toBe(350);
      const held = finish(
        accept(commitPositionAlphaFocusPlanV2(session, recovery, mechanics), mechanics),
        mechanics,
      );
      expect(
        resolvePositionAlphaNilPlanningV2(held, { type: 'ACCEPT', offerId }, mechanics).ok,
      ).toBe(false);
      const before = JSON.stringify(held);
      const expiryChoices = projectPositionAlphaNilChoicesV2(held, mechanics)!;
      expect(expiryChoices.choices.map(({ action }) => action)).toEqual([{ type: 'EXPIRE' }]);
      const explicitlyExpired = accept(
        resolvePositionAlphaNilPlanningV2(held, { type: 'EXPIRE' }, mechanics),
        mechanics,
      );
      expect(expiryChoices.choices[0]!.after).toEqual(
        projectPositionAlphaNilPlanningV2(
          explicitlyExpired,
          expiryChoices.careerWeekIndex,
          mechanics.nil,
        ),
      );
      expect(explicitlyExpired.careerRng).toEqual(held.careerRng);
      expect(explicitlyExpired.world).toEqual(held.world);
      expect(projectPositionAlphaNilChoicesV2(explicitlyExpired, mechanics)!.choices).toEqual([]);
      const preview = projectPositionAlphaPlanningV2(held, recovery, mechanics)!;
      const planned = accept(commitPositionAlphaFocusPlanV2(held, recovery, mechanics), mechanics);
      if (planned.gameDay.type === 'IDLE') throw new Error('Missing planning evidence');
      expect(preview.preparation).toEqual(planned.gameDay.preparation);
      expect(planned.revision).toBe(held.revision + 1);
      expect(planned.careerRng).toEqual(held.careerRng);
      expect(planned.nil!.planning).toEqual([
        {
          action: { type: 'EXPIRE' },
          equippedSkillIds: held.skills.equippedSkillIds,
        },
      ]);
      expect(planned.nil!.state.pendingOffers).toEqual([]);
      expect(planned.nil!.state.history).toHaveLength(1);
      expect(planned.nil!.state.history[0]!.model).toBe('nil_offer_expiration_v1');
      expect(planned.player).toEqual(held.player);
      expect(JSON.stringify(held)).toBe(before);
      const settled = finish(planned, mechanics);
      expect(settled.nil!.state.history).toHaveLength(1);
      expect(resolvePositionAlphaNilPlanningV2(settled, { type: 'EXPIRE' }, mechanics).ok).toBe(
        false,
      );
    },
  );

  it.each(CASES)(
    '%s saves zero-draw late-season filtering and cutoff without inventing obligations',
    (positionId, archetypeId) => {
      for (const startWeek of [7, 8, 9]) {
        const { session, mechanics } = fixture(
          [positionId, archetypeId],
          'nil_offer_regional_travel_story',
          startWeek,
        );
        const settled = finish(
          accept(commitPositionAlphaFocusPlanV2(session, recovery, mechanics), mechanics),
          mechanics,
        );
        const week = settled.weekHistory.at(-1)!;
        if (week.model !== 'position_alpha_week_summary_v2')
          throw new Error('Missing current evidence');
        expect(week.nil.reason).toBe(
          startWeek === 7 ? 'SELECTED' : startWeek === 8 ? 'EMPTY_POOL' : 'SEASON_CUTOFF',
        );
        expect(week.nil.rngBefore).toEqual(week.injury.rng);
        if (startWeek === 7)
          expect(week.nil.rng.drawCount).toBeGreaterThan(week.nil.rngBefore.drawCount);
        else expect(week.nil.rng).toEqual(week.nil.rngBefore);
        expect(settled.nil!.state.activeObligation).toBeNull();
      }
    },
  );
  it.each(CASES)(
    '%s binds rewards, mandatory obligations, and actual GPA into the due academic review',
    (positionId, archetypeId) => {
      const offerId = 'nil_offer_regional_travel_story';
      const { session: initial, mechanics } = fixture([positionId, archetypeId], offerId, 4);
      const offered = finish(
        accept(commitPositionAlphaFocusPlanV2(initial, recovery, mechanics), mechanics),
        mechanics,
      );
      expect(offered.nil!.activatedAtCareerWeekIndex).toBe(4);
      expect(
        offered.nil!.state.pendingOffers,
        JSON.stringify(offered.nil!.state.lastOfferAttempt),
      ).toHaveLength(1);
      expect(offered.nil!.state.pendingOffers[0]!.offerId).toBe(offerId);
      const before = JSON.stringify(offered);
      for (const focus of [recovery, ['action_study_hall', 'action_recovery', 'action_recovery']]) {
        let session = accept(
          resolvePositionAlphaNilPlanningV2(offered, { type: 'ACCEPT', offerId }, mechanics),
          mechanics,
        );
        expect(session.careerRng).toEqual(offered.careerRng);
        expect(session.world).toEqual(offered.world);
        expect(session.player).toEqual(offered.player);
        expect(session.lifecycle).toEqual(offered.lifecycle);
        expect(session.nil!.state.fictionalFundsUsd).toBe(1100);
        expect(session.nil!.state.benefitStacks).toEqual([
          { benefitId: 'off_field_benefit_offer_visibility', quantity: 1 },
        ]);
        expect(commitPositionAlphaFocusPlanV2(session, recovery, mechanics).ok).toBe(false);
        expect(
          projectPositionAlphaPlanningV2(session, recovery, mechanics)?.preparation,
        ).toBeNull();
        expect(
          resolvePositionAlphaNilPlanningV2(session, { type: 'ACCEPT', offerId }, mechanics).ok,
        ).toBe(false);
        session = accept(
          resolvePositionAlphaNilPlanningV2(session, { type: 'FULFILL' }, mechanics),
          mechanics,
        );
        expect(session.nil!.state.activeObligation!.remainingWeeks).toBe(1);
        expect(session.player).toEqual(offered.player);
        const obligation = session.nil!.state.history.at(-1)!;
        if (obligation.model !== 'nil_obligation_resolution_v1')
          throw new Error('Missing obligation');
        expect(obligation.focusCost).toBe(2);
        expect(
          obligation.appliedEffects.find(({ effect }) => effect.type === 'nil_gpa_delta_milli')!
            .actualDelta,
        ).toBe(-100);
        expect(resolvePositionAlphaNilPlanningV2(session, { type: 'FULFILL' }, mechanics).ok).toBe(
          false,
        );
        for (const nil of [
          { ...session.nil!, planning: session.nil!.planning.slice(0, 1) },
          { ...session.nil!, state: { ...session.nil!.state, fictionalFundsUsd: 1101 } },
          { ...session.nil!, weekStart: { ...session.nil!.weekStart, fictionalFundsUsd: 1 } },
          { ...session.nil!, extra: true },
        ])
          expect(validatePositionAlphaSessionV2({ ...session, nil }, mechanics)).toBe(false);
        const planned = accept(
          commitPositionAlphaFocusPlanV2(session, focus, mechanics),
          mechanics,
        );
        if (planned.gameDay.type === 'IDLE') throw new Error('Missing focus evidence');
        expect(planned.gameDay.preparation.nilObligationGpaDeltaMilli).toBe(-100);
        expect(planned.gameDay.preparation.trainingEvidence[0].gpaBefore).toBe(2.25);
        const reviewed = advance(planned, mechanics);
        expect(reviewed.gameDay.type).toBe('ACADEMIC_REVIEW');
        if (reviewed.gameDay.type === 'IDLE') throw new Error('Missing academics');
        expect(reviewed.gameDay.academics!.checkpoint!.obligationGpaDeltaMilli).toBe(-100);
        expect(reviewed.gameDay.academics!.checkpoint!.statusAfter).toBe(
          focus[0] === 'action_study_hall' ? 'ELIGIBLE' : 'WARNING',
        );
        const settled = finish(reviewed, mechanics);
        expect(settled.player.state.gpa).toBe(focus[0] === 'action_study_hall' ? 2.4 : 2.25);
        expect(settled.nil!.planning).toEqual([]);
        const history = settled.weekHistory.at(-1)!;
        if (history.model !== 'position_alpha_week_summary_v2')
          throw new Error('Missing current week');
        expect(history.nil.reason).toBe('ACTIVE_OBLIGATION');
        expect(history.nil.rng).toEqual(history.injury.rng);
        expect(resolvePositionAlphaNilPlanningV2(reviewed, { type: 'DEFAULT' }, mechanics).ok).toBe(
          false,
        );
      }
      expect(JSON.stringify(offered)).toBe(before);
    },
  );
});
