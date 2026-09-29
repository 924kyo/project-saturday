import {
  advanceSeasonCampDevelopmentWeek,
  beginRecruiting,
  bootstrapSeason,
  commitProgramChoice,
  commitWeeklyActionPlan,
  createCareerSession,
  createWrCareer,
  decideNilOffer,
  expireNilOffers,
  isOffFieldMechanicsCatalog,
  parseCareerSession,
  resolveAcademicCheckpoint,
  resolveNilObligation,
  resolveNextWeeklyAction,
  selectNilOffer,
  validateCareerRun,
  validateCareerSession,
  type CareerSession,
  type OffFieldMechanicsCatalog,
  type NilOfferId,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  attemptShippedWeeklyNilOffer,
  bootstrapShippedOffFieldSystems,
  buildWrCreationMechanics,
  defaultWrCreationIdentity,
  deriveShippedOffFieldWeekProjection,
  deriveShippedEventContextTagIds,
  developmentWeekConfig,
  offenseStyleMechanicsDefinitions,
  offFieldMechanicsCatalog,
  offFieldContent,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  resolveShippedWeeklyRelationships,
  settleShippedCompletedWeekOffField,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
  seasonMechanicsDefinition,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';

function expectSuccess<T extends { readonly ok: boolean }>(
  result: T,
): asserts result is T & { readonly ok: true } {
  expect(result).toEqual(expect.objectContaining({ ok: true }));
}

function createActiveSession(
  seed: string,
  options: { readonly weekIndex?: number; readonly gpa?: number } = {},
): CareerSession {
  const mechanics = buildWrCreationMechanics({
    archetypeId: defaultWrCreationIdentity.archetypeId,
    personalityTraitIds: defaultWrCreationIdentity.personalityTraitIds,
    recruitingBackgroundId: defaultWrCreationIdentity.recruitingBackgroundId,
  });
  expectSuccess(mechanics);
  const created = createWrCareer({
    careerSeed: seed,
    identity: { ...defaultWrCreationIdentity, displayName: 'Off Field Test' },
    mechanics: mechanics.mechanics,
  });
  expectSuccess(created);
  const choosing = beginRecruiting(
    created.career,
    recruitingMechanicsConfig,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
  );
  expectSuccess(choosing);
  if (choosing.career.recruitingState.type !== 'CHOOSING') {
    throw new TypeError('Expected choosing state.');
  }
  const committed = commitProgramChoice(
    choosing.career,
    choosing.career.recruitingState.offers[0].programId,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
    rotationPolicyMechanicsDefinitions,
    rosterNameMechanicsPool,
  );
  expectSuccess(committed);
  const shiftedCareer = {
    ...committed.career,
    weekIndex: options.weekIndex ?? committed.career.weekIndex,
    player: {
      ...committed.career.player,
      state: {
        ...committed.career.player.state,
        gpa: options.gpa ?? committed.career.player.state.gpa,
      },
    },
  };
  expect(validateCareerRun(shiftedCareer)).toEqual({ issues: [], ok: true });
  const season = bootstrapSeason(createCareerSession(shiftedCareer), seasonMechanicsDefinition);
  expectSuccess(season);
  return season.session;
}

function activateOffField(session: CareerSession): CareerSession {
  const result = bootstrapShippedOffFieldSystems(session);
  expectSuccess(result);
  return result.session;
}

function completeWeek(
  session: CareerSession,
  actionIds: readonly [
    (typeof weeklyActionDefinitions)[number]['id'],
    (typeof weeklyActionDefinitions)[number]['id'],
    (typeof weeklyActionDefinitions)[number]['id'],
  ],
): CareerSession {
  const committed = commitWeeklyActionPlan(
    session.career,
    actionIds,
    weeklyActionDefinitions.map(({ id }) => id),
  );
  expectSuccess(committed);
  let career = committed.career;
  for (const actionId of actionIds) {
    const definition = weeklyActionDefinitions.find(({ id }) => id === actionId)!;
    const resolved = resolveNextWeeklyAction(
      career,
      definition,
      developmentWeekConfig,
      skillMechanicsDefinitions,
      offenseStyleMechanicsDefinitions,
      rotationPolicyMechanicsDefinitions,
    );
    expectSuccess(resolved);
    career = resolved.career;
  }
  expect(career.phase.type).toBe('WEEK_END');
  return { ...session, career };
}

function withCampusBridge(session: CareerSession): CareerSession {
  const career = {
    ...session.career,
    player: {
      ...session.career.player,
      skillState: {
        ...session.career.player.skillState,
        acquisitions: [
          {
            offerIndex: 0,
            weekIndex: 1,
            offeredSkillIds: [
              'skill_campus_bridge_b',
              'skill_route_notebook_c',
              'skill_first_step_lab_b',
            ],
            rngDrawCountBefore: 0,
            rngDrawCountAfter: 3,
            selectedSkillId: 'skill_campus_bridge_b',
          },
        ],
        equippedSkillIds: ['skill_campus_bridge_b', null, null, null],
      },
    },
  } as const satisfies CareerSession['career'];
  expect(validateCareerRun(career)).toEqual({ issues: [], ok: true });
  return { ...session, career };
}

function checkpointAtWeekOne(): OffFieldMechanicsCatalog {
  const definitions = {
    ...offFieldMechanicsCatalog,
    academics: {
      ...offFieldMechanicsCatalog.academics,
      checkpoints: [
        { id: 'academic_checkpoint_midterm', weekIndex: 1 },
        { id: 'academic_checkpoint_final', weekIndex: 2 },
      ],
    },
  } as const satisfies OffFieldMechanicsCatalog;
  expect(isOffFieldMechanicsCatalog(definitions)).toBe(true);
  return definitions;
}

function catalogWithOnlyOffer(offerId: NilOfferId): OffFieldMechanicsCatalog {
  const definitions = {
    ...offFieldMechanicsCatalog,
    nilOffers: offFieldMechanicsCatalog.nilOffers.map((offer) => ({
      ...offer,
      requirements: {
        ...offer.requirements,
        minimumBrand: offer.id === offerId ? 0 : 100,
        maximumDepthRank: 8,
        minimumGpaMilli: 0,
        requiredTagIds: [],
      },
    })),
  } as const satisfies OffFieldMechanicsCatalog;
  expect(isOffFieldMechanicsCatalog(definitions)).toBe(true);
  return definitions;
}

function selectOnlyOffer(
  session: CareerSession,
  offerId: NilOfferId,
): { readonly session: CareerSession; readonly definitions: OffFieldMechanicsCatalog } {
  const definitions = catalogWithOnlyOffer(offerId);
  const program = programMechanicsDefinitions.find(({ id }) => id === session.career.programId)!;
  const selected = selectNilOffer(session.career, definitions, {
    programStrengthBandId: program.strengthBandId,
    additionalTagIds: [],
  });
  expectSuccess(selected);
  return { definitions, session: { ...session, career: selected.career } };
}

function advanceCampCareer(session: CareerSession): CareerSession {
  const advanced = advanceSeasonCampDevelopmentWeek(
    session.career,
    developmentWeekConfig,
    skillMechanicsDefinitions,
    weeklyActionDefinitions,
  );
  expectSuccess(advanced);
  expect(advanced.career.phase.type).toBe('PLAN_ACTIONS');
  return { ...session, career: advanced.career };
}

describe('M6 deterministic academic and relationship commands', () => {
  it('activates neutral v6 state without RNG and preserves exact session round trips', () => {
    const pending = createActiveSession('off-field-bootstrap');
    const before = JSON.stringify(pending);
    const result = bootstrapShippedOffFieldSystems(pending);
    expectSuccess(result);
    expect(JSON.stringify(pending)).toBe(before);
    expect(result.session.career.rng).toEqual(pending.career.rng);
    expect(result.session.world).toEqual(pending.world);
    expect(result.session.career.revision).toBe(pending.career.revision + 1);
    expect(result.session.career.offFieldCareerState).toEqual(
      expect.objectContaining({
        academics: expect.objectContaining({
          bootstrapStatus: 'ACTIVE',
          eligibilityStatus: 'ELIGIBLE',
          nextCheckpointIndex: 0,
          restrictionGamesRemaining: 0,
        }),
        relationships: expect.objectContaining({
          bootstrapStatus: 'ACTIVE',
          lastProcessedWeekIndex: null,
          tracks: [
            { actorId: 'relationship_actor_position_coach', value: 50 },
            { actorId: 'relationship_actor_teammate_leader', value: 50 },
            { actorId: 'relationship_actor_direct_competitor', value: 50 },
          ],
        }),
        nil: expect.objectContaining({
          bootstrapStatus: 'ACTIVE',
          fictionalFundsUsd: 0,
          benefitStacks: [],
          pendingOffers: [],
          activeObligation: null,
        }),
        programHistory: [
          {
            programId: pending.career.programId,
            startSeasonIndex: 0,
            endSeasonIndex: null,
          },
        ],
      }),
    );
    expect(parseCareerSession(JSON.parse(JSON.stringify(result.session)))).toEqual({
      ok: true,
      session: result.session,
    });
    expect(Object.isFrozen(result.session.career)).toBe(true);

    const duplicate = bootstrapShippedOffFieldSystems(result.session);
    expect(duplicate).toEqual({
      ok: false,
      session: result.session,
      reason: 'off_field.invalid_phase',
    });
  });

  it('resolves a fictional low-GPA checkpoint with explicit threshold and restriction evidence', () => {
    const active = activateOffField(
      createActiveSession('off-field-academic-low', { weekIndex: 1, gpa: 1.9 }),
    );
    const completed = completeWeek(active, [
      'action_route_drills',
      'action_release_drills',
      'action_hands_catch_work',
    ]);
    const before = JSON.stringify(completed.career);
    const result = resolveAcademicCheckpoint(completed.career, checkpointAtWeekOne(), 0);
    expectSuccess(result);
    expect(JSON.stringify(completed.career)).toBe(before);
    expect(result.career.rng).toEqual(completed.career.rng);
    expect(result.career.offFieldCareerState.academics).toEqual(
      expect.objectContaining({
        bootstrapStatus: 'ACTIVE',
        eligibilityStatus: 'INELIGIBLE',
        nextCheckpointIndex: 1,
        restrictionGamesRemaining: 1,
        lastCheckpoint: {
          model: 'academic_checkpoint_v1',
          checkpointId: 'academic_checkpoint_midterm',
          termIndex: 1,
          weekIndex: 1,
          gpaMilli: 1_900,
          obligationGpaDeltaMilli: 0,
          eligibleGpaMilli: 2_300,
          warningGpaMilli: 2_000,
          statusBefore: 'WARNING',
          statusAfter: 'INELIGIBLE',
          restrictionGamesBefore: 0,
          requestedRestrictionGames: 1,
          actualRestrictionGames: 1,
          restrictionGamesAfter: 1,
        },
      }),
    );
    expect(validateCareerRun(result.career)).toEqual({ issues: [], ok: true });
    const retry = resolveAcademicCheckpoint(result.career, checkpointAtWeekOne(), 0);
    expect(retry).toEqual({
      ok: false,
      career: result.career,
      reason: 'off_field.not_due',
    });
  });

  it('turns existing weekly choices into canonical relationship and Coach Trust evidence', () => {
    const completed = completeWeek(
      activateOffField(createActiveSession('off-field-relationships')),
      ['action_extra_practice', 'action_hands_catch_work', 'action_film_study'],
    );
    const trustBefore = completed.career.player.state.coachTrust;
    const drawsBefore = completed.career.rng.drawCount;
    const result = resolveShippedWeeklyRelationships(completed);
    expectSuccess(result);
    const relationships = result.session.career.offFieldCareerState.relationships;
    expect(relationships.bootstrapStatus).toBe('ACTIVE');
    if (relationships.bootstrapStatus !== 'ACTIVE') throw new TypeError('Expected active state.');
    expect(relationships.tracks).toEqual([
      { actorId: 'relationship_actor_position_coach', value: 53 },
      { actorId: 'relationship_actor_teammate_leader', value: 52 },
      { actorId: 'relationship_actor_direct_competitor', value: 49 },
    ]);
    expect(relationships.history).toHaveLength(1);
    expect(relationships.history[0]).toEqual(
      expect.objectContaining({
        model: 'relationship_week_v1',
        sourceId: 'relationship_source_weekly_action',
        weekIndex: 0,
        actionIds: ['action_extra_practice', 'action_hands_catch_work', 'action_film_study'],
        changes: [
          expect.objectContaining({
            actorId: 'relationship_actor_position_coach',
            baseDelta: 3,
            gainMultiplierPermille: 1_000,
            actualDelta: 3,
          }),
          expect.objectContaining({
            actorId: 'relationship_actor_teammate_leader',
            baseDelta: 2,
            gainMultiplierPermille: 1_000,
            actualDelta: 2,
          }),
          expect.objectContaining({
            actorId: 'relationship_actor_direct_competitor',
            baseDelta: -1,
            gainMultiplierPermille: 1_000,
            actualDelta: -1,
          }),
        ],
        appliedSkillEffects: [],
        coachTrustBefore: trustBefore,
        requestedCoachTrustDelta: 2,
        actualCoachTrustDelta: 2,
        coachTrustAfter: trustBefore + 2,
      }),
    );
    expect(result.session.career.player.state.coachTrust).toBe(trustBefore + 2);
    expect(result.session.career.rng.drawCount).toBe(drawsBefore);
    expect(validateCareerSession(result.session)).toEqual({ issues: [], ok: true });

    const retry = resolveShippedWeeklyRelationships(result.session);
    expect(retry).toEqual({
      ok: false,
      session: result.session,
      reason: 'off_field.already_resolved',
    });
  });

  it('lets Campus Bridge improve only positive relationship gains with saved hook evidence', () => {
    const completed = withCampusBridge(
      completeWeek(
        activateOffField(createActiveSession('off-field-relationship-skill', { weekIndex: 1 })),
        ['action_extra_practice', 'action_hands_catch_work', 'action_film_study'],
      ),
    );
    const result = resolveShippedWeeklyRelationships(completed);
    expectSuccess(result);
    const relationships = result.session.career.offFieldCareerState.relationships;
    if (relationships.bootstrapStatus !== 'ACTIVE') throw new TypeError('Expected active state.');
    expect(relationships.tracks).toEqual([
      { actorId: 'relationship_actor_position_coach', value: 54 },
      { actorId: 'relationship_actor_teammate_leader', value: 53 },
      { actorId: 'relationship_actor_direct_competitor', value: 49 },
    ]);
    expect(relationships.history[0]!.appliedSkillEffects).toEqual([
      expect.objectContaining({
        hookId: 'life_hook_relationship_gain_multiplier',
        skillId: 'skill_campus_bridge_b',
        valueMilli: 1_200,
      }),
    ]);
    expect(
      relationships.history[0]!.changes.map(({ gainMultiplierPermille }) => gainMultiplierPermille),
    ).toEqual([1_200, 1_200, 1_000]);
  });

  it('derives threshold event tags and rejects malformed saved relationship evidence', () => {
    const active = activateOffField(createActiveSession('off-field-context-tags'));
    const relationships = active.career.offFieldCareerState.relationships;
    if (relationships.bootstrapStatus !== 'ACTIVE') throw new TypeError('Expected active state.');
    const tagged: CareerSession = {
      ...active,
      career: {
        ...active.career,
        offFieldCareerState: {
          ...active.career.offFieldCareerState,
          relationships: {
            ...relationships,
            tracks: [
              { actorId: 'relationship_actor_position_coach', value: 70 },
              { actorId: 'relationship_actor_teammate_leader', value: 30 },
              { actorId: 'relationship_actor_direct_competitor', value: 50 },
            ],
          },
        },
      },
    };
    expect(validateCareerSession(tagged)).toEqual({ issues: [], ok: true });
    expect(deriveShippedEventContextTagIds(tagged)).toEqual(
      expect.arrayContaining([
        'tag_relationship_position_coach_high',
        'tag_relationship_teammate_leader_low',
      ]),
    );

    const resolved = resolveShippedWeeklyRelationships(
      completeWeek(active, [
        'action_extra_practice',
        'action_hands_catch_work',
        'action_film_study',
      ]),
    );
    expectSuccess(resolved);
    const malformed = JSON.parse(JSON.stringify(resolved.session.career)) as {
      offFieldCareerState: {
        relationships: { history: Array<{ changes: Array<{ actualDelta: number }> }> };
      };
    };
    malformed.offFieldCareerState.relationships.history[0]!.changes[0]!.actualDelta += 1;
    expect(validateCareerRun(malformed)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'invariant.invalid_combination',
            path: 'career.offFieldCareerState.relationships.history.0.changes.0.actualDelta',
          }),
        ]),
      }),
    );
  });

  it('selects one eligible NIL offer in canonical order and persists zero-draw empty attempts', () => {
    const completed = completeWeek(
      activateOffField(createActiveSession('nil-selection-canonical')),
      ['action_route_drills', 'action_release_drills', 'action_hands_catch_work'],
    );
    const definitions = catalogWithOnlyOffer('nil_offer_neighborhood_breakfast_feature');
    const program = programMechanicsDefinitions.find(
      ({ id }) => id === completed.career.programId,
    )!;
    const selected = selectNilOffer(completed.career, definitions, {
      programStrengthBandId: program.strengthBandId,
      additionalTagIds: [],
    });
    expectSuccess(selected);
    const reordered = selectNilOffer(
      completed.career,
      { ...definitions, nilOffers: [...definitions.nilOffers].reverse() },
      { programStrengthBandId: program.strengthBandId, additionalTagIds: [] },
    );
    expectSuccess(reordered);
    expect(reordered.career).toEqual(selected.career);
    const nil = selected.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in nil) || nil.bootstrapStatus !== 'ACTIVE') {
      throw new TypeError('Expected active NIL state.');
    }
    expect(nil.pendingOffers).toEqual([
      expect.objectContaining({
        offerId: 'nil_offer_neighborhood_breakfast_feature',
        offeredWeekIndex: 0,
        expiresAfterWeekIndex: 2,
      }),
    ]);
    expect(nil.lastOfferAttempt).toEqual(
      expect.objectContaining({
        eligibleOfferIds: ['nil_offer_neighborhood_breakfast_feature'],
        selectedOfferId: 'nil_offer_neighborhood_breakfast_feature',
        totalWeight: 160,
        roll: expect.any(Number),
      }),
    );
    expect(selected.career.rng.drawCount).toBeGreaterThan(completed.career.rng.drawCount);
    expect(
      selectNilOffer(selected.career, definitions, {
        programStrengthBandId: program.strengthBandId,
        additionalTagIds: [],
      }),
    ).toEqual({ ok: false, career: selected.career, reason: 'off_field.offer_pending' });

    const noOfferCareer = completeWeek(
      activateOffField(createActiveSession('nil-selection-empty')),
      ['action_route_drills', 'action_release_drills', 'action_hands_catch_work'],
    ).career;
    const noOfferDefinitions = {
      ...definitions,
      nilOffers: definitions.nilOffers.map((offer) => ({
        ...offer,
        requirements: { ...offer.requirements, minimumBrand: 100 },
      })),
    } satisfies OffFieldMechanicsCatalog;
    const noOfferProgram = programMechanicsDefinitions.find(
      ({ id }) => id === noOfferCareer.programId,
    )!;
    const noOffer = selectNilOffer(noOfferCareer, noOfferDefinitions, {
      programStrengthBandId: noOfferProgram.strengthBandId,
      additionalTagIds: [],
    });
    expectSuccess(noOffer);
    expect(noOffer.career.rng).toEqual(noOfferCareer.rng);
    const noOfferState = noOffer.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in noOfferState)) throw new TypeError('Expected active NIL state.');
    expect(noOfferState.lastOfferAttempt).toEqual(
      expect.objectContaining({
        eligibleOfferIds: [],
        totalWeight: 0,
        roll: null,
        selectedOfferId: null,
        rngDrawCountBefore: noOfferCareer.rng.drawCount,
        rngDrawCountAfter: noOfferCareer.rng.drawCount,
      }),
    );
  });

  it('applies bounded offer rewards, the Campus Bridge multiplier, and weekly fulfillment evidence', () => {
    const completed = completeWeek(
      activateOffField(createActiveSession('nil-reward-fulfillment')),
      ['action_route_drills', 'action_release_drills', 'action_hands_catch_work'],
    );
    const selected = selectOnlyOffer(completed, 'nil_offer_neighborhood_breakfast_feature');
    const planning = advanceCampCareer(selected.session);
    const baseAccepted = decideNilOffer(
      planning.career,
      'nil_offer_neighborhood_breakfast_feature',
      'ACCEPT',
      selected.definitions,
      skillMechanicsDefinitions,
    );
    expectSuccess(baseAccepted);
    const skilledAccepted = decideNilOffer(
      withCampusBridge(planning).career,
      'nil_offer_neighborhood_breakfast_feature',
      'ACCEPT',
      selected.definitions,
      skillMechanicsDefinitions,
    );
    expectSuccess(skilledAccepted);
    const baseNil = baseAccepted.career.offFieldCareerState.nil;
    const skilledNil = skilledAccepted.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in baseNil) || !('bootstrapStatus' in skilledNil)) {
      throw new TypeError('Expected active NIL state.');
    }
    expect(baseNil.fictionalFundsUsd).toBe(350);
    expect(skilledNil.fictionalFundsUsd).toBe(385);
    expect(skilledNil.activeObligation).toEqual(
      expect.objectContaining({
        obligationId: 'nil_obligation_neighborhood_breakfast_feature',
        remainingWeeks: 1,
      }),
    );
    expect(skilledNil.history[0]).toEqual(
      expect.objectContaining({
        model: 'nil_offer_decision_v1',
        decisionId: 'ACCEPT',
        rewardMultiplierPermille: 1_100,
        appliedSkillEffects: [
          expect.objectContaining({ hookId: 'life_hook_nil_reward_multiplier', valueMilli: 1_100 }),
        ],
      }),
    );
    const drawsBefore = skilledAccepted.career.rng.drawCount;
    const fulfilled = resolveNilObligation(skilledAccepted.career, 'FULFILL', selected.definitions);
    expectSuccess(fulfilled);
    const fulfilledNil = fulfilled.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in fulfilledNil)) throw new TypeError('Expected active NIL state.');
    expect(fulfilledNil.activeObligation).toBeNull();
    expect(fulfilledNil.history[1]).toEqual(
      expect.objectContaining({
        model: 'nil_obligation_resolution_v1',
        resolutionId: 'FULFILL',
        focusCost: 1,
        remainingWeeksBefore: 1,
        remainingWeeksAfter: 0,
        appliedEffects: [
          expect.objectContaining({
            sourceId: 'nil_effect_source_obligation_weekly',
            baseDelta: -2,
            rewardMultiplierPermille: 1_000,
          }),
        ],
      }),
    );
    expect(fulfilled.career.rng.drawCount).toBe(drawsBefore);
    expect(
      parseCareerSession(JSON.parse(JSON.stringify({ ...planning, career: fulfilled.career }))),
    ).toEqual({
      ok: true,
      session: { ...planning, career: fulfilled.career },
    });
  });

  it('declines a pending offer without rewards, an obligation, or another RNG draw', () => {
    const completed = completeWeek(activateOffField(createActiveSession('nil-decline')), [
      'action_route_drills',
      'action_release_drills',
      'action_hands_catch_work',
    ]);
    const selected = selectOnlyOffer(completed, 'nil_offer_youth_route_clinic');
    const planning = advanceCampCareer(selected.session);
    const before = JSON.stringify(planning.career);
    const declined = decideNilOffer(
      planning.career,
      'nil_offer_youth_route_clinic',
      'DECLINE',
      selected.definitions,
      skillMechanicsDefinitions,
    );
    expectSuccess(declined);
    expect(JSON.stringify(planning.career)).toBe(before);
    expect(declined.career.rng).toEqual(planning.career.rng);
    expect(declined.career.player).toEqual(planning.career.player);
    const nil = declined.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in nil)) throw new TypeError('Expected active NIL state.');
    expect(nil.pendingOffers).toEqual([]);
    expect(nil.activeObligation).toBeNull();
    expect(nil.history).toEqual([
      expect.objectContaining({
        model: 'nil_offer_decision_v1',
        decisionId: 'DECLINE',
        appliedSkillEffects: [],
        rewardMultiplierPermille: 1_000,
        appliedEffects: [],
      }),
    ]);
  });

  it('persists explicit default and expiration outcomes and rejects tampered effect evidence', () => {
    const completed = completeWeek(
      activateOffField(createActiveSession('nil-default-expiration')),
      ['action_route_drills', 'action_release_drills', 'action_hands_catch_work'],
    );
    const selected = selectOnlyOffer(completed, 'nil_offer_corner_store_game_card');
    const planning = advanceCampCareer(selected.session);
    const accepted = decideNilOffer(
      planning.career,
      'nil_offer_corner_store_game_card',
      'ACCEPT',
      selected.definitions,
      skillMechanicsDefinitions,
    );
    expectSuccess(accepted);
    const acceptedNil = accepted.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in acceptedNil)) throw new TypeError('Expected active NIL state.');
    expect(acceptedNil.benefitStacks).toEqual([
      { benefitId: 'off_field_benefit_appearance_style', quantity: 1 },
    ]);
    const defaulted = resolveNilObligation(accepted.career, 'DEFAULT', selected.definitions);
    expectSuccess(defaulted);
    const nil = defaulted.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in nil)) throw new TypeError('Expected active NIL state.');
    expect(nil.fictionalFundsUsd).toBe(350);
    expect(defaulted.career.player.state.brand).toBe(accepted.career.player.state.brand - 3);
    expect(nil.activeObligation).toBeNull();
    expect(resolveNilObligation(defaulted.career, 'DEFAULT', selected.definitions)).toEqual({
      ok: false,
      career: defaulted.career,
      reason: 'off_field.obligation_not_due',
    });

    const malformed = JSON.parse(JSON.stringify(defaulted.career)) as {
      offFieldCareerState: {
        nil: { history: Array<{ appliedEffects?: Array<{ actualDelta: number }> }> };
      };
    };
    malformed.offFieldCareerState.nil.history[1]!.appliedEffects![0]!.actualDelta += 1;
    expect(validateCareerRun(malformed)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'invariant.invalid_combination',
            path: 'career.offFieldCareerState.nil.history.1.appliedEffects.0.actualDelta',
          }),
        ]),
      }),
    );

    const expiringCompleted = completeWeek(
      activateOffField(createActiveSession('nil-expiration-only')),
      ['action_route_drills', 'action_release_drills', 'action_hands_catch_work'],
    );
    const expiring = selectOnlyOffer(expiringCompleted, 'nil_offer_neighborhood_breakfast_feature');
    const expiredCareer = {
      ...expiring.session.career,
      weekIndex: 3,
      phase: { type: 'PLAN_ACTIONS' },
    } as const;
    expect(validateCareerRun(expiredCareer)).toEqual({ issues: [], ok: true });
    expect(
      decideNilOffer(
        expiredCareer,
        'nil_offer_neighborhood_breakfast_feature',
        'ACCEPT',
        expiring.definitions,
        skillMechanicsDefinitions,
      ),
    ).toEqual({ ok: false, career: expiredCareer, reason: 'off_field.offer_expired' });
    const expired = expireNilOffers(expiredCareer, expiring.definitions);
    expectSuccess(expired);
    expect(expired.career.rng).toEqual(expiredCareer.rng);
    const expiredNil = expired.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in expiredNil)) throw new TypeError('Expected active NIL state.');
    expect(expiredNil.pendingOffers).toEqual([]);
    expect(expiredNil.history).toEqual([
      expect.objectContaining({ model: 'nil_offer_expiration_v1', weekIndex: 3 }),
    ]);
  });

  it('settles the completed-week boundary once and saves a canonical NIL attempt', () => {
    const completed = completeWeek(
      activateOffField(createActiveSession('off-field-week-boundary')),
      ['action_film_study', 'action_hands_catch_work', 'action_route_drills'],
    );
    const settled = settleShippedCompletedWeekOffField(completed);
    expectSuccess(settled);
    const relationships = settled.session.career.offFieldCareerState.relationships;
    expect(relationships).toEqual(
      expect.objectContaining({
        bootstrapStatus: 'ACTIVE',
        lastProcessedWeekIndex: settled.session.career.weekIndex,
      }),
    );
    const attempted = attemptShippedWeeklyNilOffer(settled.session);
    expectSuccess(attempted);
    const nil = attempted.session.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in nil)) throw new TypeError('Expected active NIL state.');
    expect(nil.lastOfferAttempt?.weekIndex).toBe(attempted.session.career.weekIndex);
    const duplicate = attemptShippedWeeklyNilOffer(attempted.session);
    expectSuccess(duplicate);
    expect(duplicate.session).toBe(attempted.session);
  });

  it('projects bilingual consequences and requires an active obligation before football actions', () => {
    const completed = completeWeek(
      activateOffField(createActiveSession('off-field-required-focus')),
      ['action_route_drills', 'action_release_drills', 'action_hands_catch_work'],
    );
    const selected = selectOnlyOffer(completed, 'nil_offer_corner_store_game_card');
    const preview = deriveShippedOffFieldWeekProjection(selected.session);
    expect(preview?.nil.pendingOffer).toEqual(
      expect.objectContaining({
        offerId: 'nil_offer_corner_store_game_card',
        obligationId: 'nil_obligation_corner_store_game_card',
        obligationFocusCost: 1,
      }),
    );
    const content = offFieldContent.nil.offers.find(
      ({ id }) => id === 'nil_offer_corner_store_game_card',
    )!;
    for (const locale of ['ko-KR', 'en-US'] as const) {
      expect(localeMessages[locale][content.nameKey]).not.toHaveLength(0);
      expect(localeMessages[locale][content.descriptionKey]).not.toHaveLength(0);
      expect(localeMessages[locale][content.obligation.nameKey]).not.toHaveLength(0);
      expect(localeMessages[locale][content.obligation.descriptionKey]).not.toHaveLength(0);
    }

    const planning = advanceCampCareer(selected.session);
    const accepted = decideNilOffer(
      planning.career,
      'nil_offer_corner_store_game_card',
      'ACCEPT',
      selected.definitions,
      skillMechanicsDefinitions,
    );
    expectSuccess(accepted);
    const blocked = commitWeeklyActionPlan(
      accepted.career,
      ['action_route_drills', 'action_release_drills', 'action_hands_catch_work'],
      weeklyActionDefinitions.map(({ id }) => id),
    );
    expect(blocked).toEqual({
      ok: false,
      career: accepted.career,
      reason: 'weekly.off_field_obligation_required',
    });
    const fulfilled = resolveNilObligation(accepted.career, 'FULFILL', selected.definitions);
    expectSuccess(fulfilled);
    const committed = commitWeeklyActionPlan(
      fulfilled.career,
      ['action_route_drills', 'action_release_drills', 'action_hands_catch_work'],
      weeklyActionDefinitions.map(({ id }) => id),
    );
    expectSuccess(committed);
  });
});
