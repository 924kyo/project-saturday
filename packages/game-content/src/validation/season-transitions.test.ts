import {
  beginRecruiting,
  bootstrapNextSeason,
  bootstrapSeason,
  chooseSkillBreakthrough,
  commitProgramChoice,
  commitWeeklyActionPlan,
  createEmptyMetaProfile,
  createCareerSession,
  createWrCareer,
  decideOffseason,
  deriveKeySnapInformation,
  isOffFieldMechanicsCatalog,
  isSeasonMechanicsDefinition,
  parseCareerSession,
  migrateCareerSessionV7ToV8,
  parseCareerSessionV8,
  prepareWrTacticalGameV1,
  startWrTacticalGameV1,
  chooseWrTacticalSnapV1,
  advanceWrTacticalGameV1,
  projectWrTacticalCareerV8,
  runSessionCommandV8,
  acknowledgePostGameSessionV8,
  parseMetaProfile,
  migrateMetaProfileV1ToWrV2,
  parseWrMetaProfileV2,
  createWrMetaRegistryV1,
  parseWrMetaRegistryV1,
  projectOffseason,
  resolveNextWeeklyAction,
  resolveAcademicCheckpoint,
  validateCareerSession,
  validateWorldStateV1,
  type CareerRun,
  type CareerSession,
  type SeasonMechanicsDefinition,
  type OffFieldMechanicsCatalog,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  assessShippedWeeklyInjury,
  advanceShippedCampRound,
  attemptShippedWeeklyNilOffer,
  bootstrapShippedOffFieldSystems,
  bootstrapShippedNextSeason,
  bootstrapShippedSeason,
  buildWrCreationMechanics,
  completeShippedRegularSeasonRound,
  completeShippedCareer,
  completeShippedPostseasonRound,
  defaultWrCreationIdentity,
  deriveShippedEventContextTagIds,
  developmentWeekConfig,
  deriveShippedLegacyVisibility,
  decideShippedOffseason,
  enterShippedSeasonReview,
  gameTuning,
  initializeShippedPostseason,
  keySnapPatternMechanicsDefinitions,
  keySnapFamilyMechanicsDefinitions,
  offenseStyleMechanicsDefinitions,
  offseasonProgramMechanicsProfiles,
  offFieldMechanicsCatalog,
  prepareNextShippedSeasonGame,
  prepareNextShippedPostseasonGame,
  prepareShippedOffFieldPlanningBoundary,
  projectShippedOffseason,
  programContent,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  resolveShippedKeySnap,
  resolveShippedEventChoice,
  resolveShippedInjuryChoice,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
  seasonMechanicsDefinition,
  seasonTwoMechanicsDefinition,
  selectShippedWeeklyEvent,
  settleShippedCompletedWeekOffField,
  skillMechanicsDefinitions,
  startShippedGame,
  weeklyActionDefinitions,
} from '../content/index.js';

function expectSuccess<T extends { readonly ok: boolean }>(
  result: T,
): asserts result is T & { readonly ok: true } {
  expect(result).toEqual(expect.objectContaining({ ok: true }));
}

function createCommittedSession(
  seed: string,
  programPolicy: 'first_offer' | 'strongest_offer' = 'first_offer',
): CareerSession {
  const mechanics = buildWrCreationMechanics({
    archetypeId: defaultWrCreationIdentity.archetypeId,
    personalityTraitIds: defaultWrCreationIdentity.personalityTraitIds,
    recruitingBackgroundId: defaultWrCreationIdentity.recruitingBackgroundId,
  });
  expectSuccess(mechanics);
  const created = createWrCareer({
    careerSeed: seed,
    identity: { ...defaultWrCreationIdentity, displayName: 'Season Test' },
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
  const selectedProgramId =
    programPolicy === 'strongest_offer'
      ? [...choosing.career.recruitingState.offers].sort((left, right) => {
          const leftRating = seasonMechanicsDefinition.programProfiles.find(
            ({ programId }) => programId === left.programId,
          )?.teamRating;
          const rightRating = seasonMechanicsDefinition.programProfiles.find(
            ({ programId }) => programId === right.programId,
          )?.teamRating;
          return (rightRating ?? 0) - (leftRating ?? 0);
        })[0]!.programId
      : choosing.career.recruitingState.offers[0].programId;
  const committed = commitProgramChoice(
    choosing.career,
    selectedProgramId,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
    rotationPolicyMechanicsDefinitions,
    rosterNameMechanicsPool,
  );
  expectSuccess(committed);
  return createCareerSession(committed.career);
}

function expectNeutralV8Session(session: CareerSession): void {
  const before = JSON.stringify(session);
  const staged = migrateCareerSessionV7ToV8(session);
  expect(staged).toEqual({
    ...session,
    schemaVersion: 8,
    career: { ...session.career, schemaVersion: 8 },
  });
  expect(parseCareerSessionV8(JSON.stringify(staged))).toEqual({ ok: true, session: staged });
  expect(parseCareerSession(staged).ok).toBe(false);
  expect(JSON.stringify(session)).toBe(before);
}

function withCareer(session: CareerSession, career: CareerRun): CareerSession {
  const next = { ...session, career };
  expect(validateCareerSession(next)).toEqual({ issues: [], ok: true });
  return next;
}

function resolveDevelopmentWeek(session: CareerSession): CareerSession {
  const actionIds = ['action_recovery', 'action_film_study', 'action_route_drills'] as const;
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
  return withCareer(session, career);
}

function acceptBreakthroughIfPresent(session: CareerSession): CareerSession {
  if (session.career.phase.type !== 'SKILL_BREAKTHROUGH') return session;
  const chosen = chooseSkillBreakthrough(
    session.career,
    session.career.phase.offer.offeredSkillIds[0],
  );
  expectSuccess(chosen);
  return withCareer(session, chosen.career);
}

function expectCurrentTacticalV8Game(session: CareerSession): void {
  const mechanics = {
    tuning: gameTuning,
    families: keySnapFamilyMechanicsDefinitions,
    patterns: keySnapPatternMechanicsDefinitions,
    skills: skillMechanicsDefinitions,
  };
  const before = JSON.stringify(session);
  let record = prepareWrTacticalGameV1(session.career, mechanics);
  for (let boundary = 0; boundary < 27; boundary += 1) {
    if (record === undefined) throw new Error('Expected staged current game.');
    const career = projectWrTacticalCareerV8(record, mechanics);
    if (career === undefined) throw new Error('Expected replay-validated v8 career.');
    const current = { schemaVersion: 8 as const, career, world: session.world };
    expect(parseCareerSessionV8(JSON.stringify(current), mechanics)).toEqual({
      ok: true,
      session: current,
    });
    expect(current.world).toEqual(session.world);
    if (record.boundary.type === 'POST_GAME') break;
    record =
      record.boundary.type === 'GAME_PREVIEW'
        ? startWrTacticalGameV1(record, mechanics)
        : record.boundary.type === 'SNAP_RESOLVED'
          ? advanceWrTacticalGameV1(record, mechanics)
          : chooseWrTacticalSnapV1(record, record.boundary.pendingSnap.decisionIds[0], mechanics);
  }
  expect(record?.boundary.type).toBe('POST_GAME');
  if (record === undefined) throw new Error('Expected completed current record.');
  const career = projectWrTacticalCareerV8(record, mechanics);
  if (career === undefined) throw new Error('Expected current completion.');
  const completed = { schemaVersion: 8 as const, career, world: session.world };
  expect(runSessionCommandV8(completed, mechanics, completeShippedRegularSeasonRound).ok).toBe(
    false,
  );
  const failed = acknowledgePostGameSessionV8(completed, mechanics, () => ({
    ok: false as const,
    reason: 'test.retry',
  }));
  expect(failed.session).toBe(completed);
  expect(failed.ok).toBe(false);
  const acknowledged = acknowledgePostGameSessionV8(completed, mechanics, (literal) => {
    expect(literal.career.gameCareerState).toEqual(career.gameCareerState);
    expect(literal.career.player).toEqual(career.player);
    expect(literal.career.rng).toEqual(career.rng);
    expect(literal.world).toEqual(completed.world);
    const result = completeShippedRegularSeasonRound(literal);
    return result.ok ? { ...result, auxiliaryMeta: createEmptyMetaProfile() } : result;
  });
  expectSuccess(acknowledged);
  expect(acknowledged.auxiliaryMeta).toEqual(createEmptyMetaProfile());
  expect(acknowledged.session.career.gameCareerState).toEqual(career.gameCareerState);
  expect(acknowledged.session.career).not.toHaveProperty('tacticalGame');
  expect(parseCareerSessionV8(JSON.stringify(acknowledged.session), mechanics)).toEqual({
    ok: true,
    session: acknowledged.session,
  });
  expect(
    acknowledgePostGameSessionV8(acknowledged.session, mechanics, completeShippedRegularSeasonRound)
      .ok,
  ).toBe(false);
  expect(JSON.stringify(session)).toBe(before);
}

function playPreparedGame(session: CareerSession): CareerSession {
  if (
    session.career.seasonCareerState.bootstrapStatus === 'ACTIVE' &&
    session.career.seasonCareerState.seasonsCompleted === 1 &&
    session.career.seasonCareerState.gameSummaries.length === 0
  ) {
    expectCurrentTacticalV8Game(session);
  }
  const started = startShippedGame(session.career);
  expectSuccess(started);
  let career = started.career;
  while (career.phase.type === 'KEY_SNAP') {
    const pendingSnap = career.phase.pendingSnap;
    const pattern = keySnapPatternMechanicsDefinitions.find(
      ({ id }) => id === pendingSnap.patternId,
    )!;
    const decisionId = [...pattern.decisionFits].sort((left, right) => right.fit - left.fit)[0]!
      .decisionId;
    const resolved = resolveShippedKeySnap(career, decisionId);
    expectSuccess(resolved);
    career = resolved.career;
  }
  expect(career.phase.type).toBe('POST_GAME');
  return withCareer(session, career);
}

function processWeeklyEvent(session: CareerSession): CareerSession {
  const selected = selectShippedWeeklyEvent(session);
  expectSuccess(selected);
  if (selected.session.career.phase.type !== 'EVENT_CHOICE') return selected.session;
  const resolved = resolveShippedEventChoice(
    selected.session,
    selected.session.career.phase.pendingEvent.choiceIds[0]!,
  );
  expectSuccess(resolved);
  return resolved.session;
}

function processWeeklyInjury(session: CareerSession): CareerSession {
  const assessed = assessShippedWeeklyInjury(session);
  expectSuccess(assessed);
  if (assessed.session.career.phase.type !== 'INJURY_CHOICE') return assessed.session;
  const resolved = resolveShippedInjuryChoice(assessed.session, 'injury_choice_play_limited');
  expectSuccess(resolved);
  return resolved.session;
}

function finishCamp(session: CareerSession): CareerSession {
  let current = session;
  for (let campRound = 0; campRound < 3; campRound += 1) {
    current = processWeeklyInjury(processWeeklyEvent(resolveDevelopmentWeek(current)));
    const advanced = advanceShippedCampRound(current);
    expectSuccess(advanced);
    current = acceptBreakthroughIfPresent(advanced.session);
  }
  return current;
}

function finishActiveOffFieldCamp(session: CareerSession): CareerSession {
  let current = session;
  for (let campRound = 0; campRound < 3; campRound += 1) {
    current = resolveDevelopmentWeek(current);
    const settled = settleShippedCompletedWeekOffField(current);
    expectSuccess(settled);
    current = processWeeklyInjury(processWeeklyEvent(settled.session));
    const attempted = attemptShippedWeeklyNilOffer(current);
    expectSuccess(attempted);
    const advanced = advanceShippedCampRound(attempted.session);
    expectSuccess(advanced);
    const planning = prepareShippedOffFieldPlanningBoundary(advanced.session);
    expectSuccess(planning);
    current = acceptBreakthroughIfPresent(planning.session);
  }
  return current;
}

function academicCheckpointAtWeek(weekIndex: number): OffFieldMechanicsCatalog {
  const definitions = {
    ...offFieldMechanicsCatalog,
    academics: {
      ...offFieldMechanicsCatalog.academics,
      checkpoints: [
        { id: 'academic_checkpoint_midterm', weekIndex },
        { id: 'academic_checkpoint_final', weekIndex: weekIndex + 7 },
      ],
    },
  } as const satisfies OffFieldMechanicsCatalog;
  expect(isOffFieldMechanicsCatalog(definitions)).toBe(true);
  return definitions;
}

function playRegularSeasonRound(session: CareerSession): CareerSession {
  let current = processWeeklyInjury(processWeeklyEvent(resolveDevelopmentWeek(session)));
  const prepared = prepareNextShippedSeasonGame(current);
  expectSuccess(prepared);
  current = playPreparedGame(prepared.session);
  const completed = completeShippedRegularSeasonRound(current);
  expectSuccess(completed);
  return acceptBreakthroughIfPresent(completed.session);
}

function finishSettledOffFieldCamp(session: CareerSession): CareerSession {
  let current = session;
  for (let campRound = 0; campRound < 3; campRound += 1) {
    current = resolveDevelopmentWeek(current);
    const settled = settleShippedCompletedWeekOffField(current);
    expectSuccess(settled);
    current = processWeeklyInjury(processWeeklyEvent(settled.session));
    const advanced = advanceShippedCampRound(current);
    expectSuccess(advanced);
    current = acceptBreakthroughIfPresent(advanced.session);
  }
  return current;
}

function playSettledOffFieldSeasonRound(session: CareerSession): CareerSession {
  let current = resolveDevelopmentWeek(session);
  const settled = settleShippedCompletedWeekOffField(current);
  expectSuccess(settled);
  current = processWeeklyInjury(processWeeklyEvent(settled.session));
  const prepared = prepareNextShippedSeasonGame(current);
  expectSuccess(prepared);
  current = playPreparedGame(prepared.session);
  const completed = completeShippedRegularSeasonRound(current);
  expectSuccess(completed);
  return acceptBreakthroughIfPresent(completed.session);
}

function reorderedSeasonDefinition(
  definition: SeasonMechanicsDefinition = seasonMechanicsDefinition,
): SeasonMechanicsDefinition {
  const reordered = JSON.parse(JSON.stringify(definition)) as SeasonMechanicsDefinition;
  (reordered.programProfiles as SeasonMechanicsDefinition['programProfiles'][number][]).reverse();
  for (const round of reordered.regularSeasonRounds) {
    (
      round.fixtures as SeasonMechanicsDefinition['regularSeasonRounds'][number]['fixtures'][number][]
    ).reverse();
  }
  return reordered;
}

describe('M5 shipped season transitions', () => {
  it('projects a strict mechanics-only definition and canonicalizes input order at bootstrap', () => {
    expect(isSeasonMechanicsDefinition(seasonMechanicsDefinition)).toBe(true);
    const reordered = reorderedSeasonDefinition();
    expect(isSeasonMechanicsDefinition(reordered)).toBe(true);
    const first = bootstrapShippedSeason(createCommittedSession('season-bootstrap-order'));
    expectSuccess(first);
    const second = bootstrapSeason(createCommittedSession('season-bootstrap-order'), reordered);
    expectSuccess(second);
    expect(first.session).toEqual(second.session);
    expect(first.session.world.calendar.type).toBe('ACTIVE');
  });

  it('bootstraps only at the safe committed planning boundary without consuming either RNG', () => {
    const pending = createCommittedSession('season-safe-bootstrap');
    const careerDraws = pending.career.rng.drawCount;
    const worldDraws = pending.world.rng.drawCount;
    const result = bootstrapShippedSeason(pending);
    expectSuccess(result);
    expect(result.session.career.revision).toBe(pending.career.revision + 1);
    expect(result.session.world.revision).toBe(1);
    expect(result.session.career.rng.drawCount).toBe(careerDraws);
    expect(result.session.world.rng.drawCount).toBe(worldDraws);
    expect(result.session.career.seasonCareerState).toEqual({
      model: 'season_v1',
      bootstrapStatus: 'ACTIVE',
      seasonsCompleted: 0,
      activeSeasonId: 'season_wr_vertical_slice_v1',
      lastCompletedSeason: null,
      eventState: { model: 'event_v1', lastSelection: null, history: [], cooldowns: [] },
      injuryState: {
        model: 'injury_v1',
        currentInjury: null,
        lastAssessment: null,
        lastAvailability: null,
        history: [],
      },
      gameSummaries: [],
      roleHistory: [
        {
          weekIndex: result.session.career.weekIndex,
          rank: result.session.career.programContext?.projection.rank,
          roleId: result.session.career.programContext?.projection.roleId,
        },
      ],
    });
    expect(validateCareerSession(result.session)).toEqual({ issues: [], ok: true });
    expect(bootstrapShippedSeason(result.session)).toEqual({
      ok: false,
      reason: 'season.invalid_phase',
      session: result.session,
    });
  });

  it('advances three camp weeks without a game or any world RNG draws', () => {
    const bootstrapped = bootstrapShippedSeason(createCommittedSession('season-camp'));
    expectSuccess(bootstrapped);
    const worldRngBefore = bootstrapped.session.world.rng;
    const afterCamp = finishCamp(bootstrapped.session);
    expect(afterCamp.career.weekIndex).toBe(3);
    expect(afterCamp.career.gameCareerState.gamesPlayed).toBe(0);
    expect(afterCamp.world.rng).toEqual(worldRngBefore);
    expect(afterCamp.world.calendar).toEqual(
      expect.objectContaining({
        type: 'ACTIVE',
        stage: 'REGULAR_SEASON',
        completedCampRoundCount: 3,
        completedRegularSeasonRoundCount: 0,
      }),
    );
  });

  it('uses the saved fixture opponent, home state, and ID for the detailed player game', () => {
    const bootstrapped = bootstrapShippedSeason(createCommittedSession('season-matchup'));
    expectSuccess(bootstrapped);
    const afterCamp = finishCamp(bootstrapped.session);
    const weekEnd = processWeeklyInjury(processWeeklyEvent(resolveDevelopmentWeek(afterCamp)));
    const calendar = weekEnd.world.calendar;
    if (calendar.type !== 'ACTIVE' || weekEnd.career.programId === null) {
      throw new TypeError('Expected active season and player program.');
    }
    const round = calendar.definition.regularSeasonRounds[0]!;
    const fixture = round.fixtures.find(
      ({ awayProgramId, homeProgramId }) =>
        awayProgramId === weekEnd.career.programId || homeProgramId === weekEnd.career.programId,
    )!;
    const prepared = prepareNextShippedSeasonGame(weekEnd);
    expectSuccess(prepared);
    expect(prepared.session.career.phase).toEqual(
      expect.objectContaining({
        type: 'GAME_PREVIEW',
        matchup: expect.objectContaining({
          gameId: `game_${fixture.id}`,
          opponentProgramId:
            fixture.homeProgramId === weekEnd.career.programId
              ? fixture.awayProgramId
              : fixture.homeProgramId,
          isHome: fixture.homeProgramId === weekEnd.career.programId,
        }),
      }),
    );
    expect(prepared.session.world).toEqual(weekEnd.world);
    expectCurrentTacticalV8Game(prepared.session);
  });

  it('persists relationship context and consumes a fictional academic Game Day restriction', () => {
    const season = bootstrapShippedSeason(createCommittedSession('season-off-field-game-boundary'));
    expectSuccess(season);
    const offField = bootstrapShippedOffFieldSystems(season.session);
    expectSuccess(offField);
    let current = finishActiveOffFieldCamp(offField.session);
    current = withCareer(current, {
      ...current.career,
      player: {
        ...current.career.player,
        state: { ...current.career.player.state, gpa: 1.8 },
      },
    });
    current = resolveDevelopmentWeek(current);
    const settled = settleShippedCompletedWeekOffField(current);
    expectSuccess(settled);
    const relationships = settled.session.career.offFieldCareerState.relationships;
    if (relationships.bootstrapStatus !== 'ACTIVE') throw new TypeError('Expected relationships.');
    const highRelationshipCareer = {
      ...settled.session.career,
      offFieldCareerState: {
        ...settled.session.career.offFieldCareerState,
        relationships: {
          ...relationships,
          tracks: relationships.tracks.map((track) => ({ ...track, value: 100 })),
        },
      },
    } as const;
    const checkpoint = resolveAcademicCheckpoint(
      highRelationshipCareer,
      academicCheckpointAtWeek(highRelationshipCareer.weekIndex),
    );
    expectSuccess(checkpoint);
    current = withCareer(settled.session, checkpoint.career);
    current = processWeeklyInjury(processWeeklyEvent(current));
    const attempted = attemptShippedWeeklyNilOffer(current);
    expectSuccess(attempted);
    const prepared = prepareNextShippedSeasonGame(attempted.session);
    expectSuccess(prepared);
    if (prepared.session.career.phase.type !== 'GAME_PREVIEW') {
      throw new TypeError('Expected game preview.');
    }
    const context = prepared.session.career.phase.matchup.offFieldContext;
    expect(context).toEqual(
      expect.objectContaining({
        model: 'off_field_game_context_v1',
        academicRestrictionGamesBefore: 1,
        academicRestrictionGamesAfter: 0,
        maximumOpportunities: 0,
      }),
    );
    expect(context?.relationshipEffects.informationScoreModifier).toBeGreaterThan(0);
    expect(context?.relationshipEffects.opportunitySnapBonusPermille).toBeGreaterThan(0);
    expect(prepared.session.career.phase.matchup.opportunityBudget).toBe(0);
    const academics = prepared.session.career.offFieldCareerState.academics;
    if (academics.bootstrapStatus !== 'ACTIVE') throw new TypeError('Expected academics.');
    expect(academics.restrictionGamesRemaining).toBe(0);
    expect(academics.lastGameRestriction).toEqual(
      expect.objectContaining({
        gameId: prepared.session.career.phase.matchup.gameId,
        restrictionGamesBefore: 1,
        restrictionGamesAfter: 0,
      }),
    );
    expect(validateCareerSession(prepared.session)).toEqual({ issues: [], ok: true });

    const pattern = keySnapPatternMechanicsDefinitions[0]!;
    const neutralInformation = deriveKeySnapInformation(
      60,
      60,
      false,
      [],
      pattern.clueIds,
      gameTuning,
    );
    const relationshipInformation = deriveKeySnapInformation(
      60,
      60,
      false,
      [],
      pattern.clueIds,
      gameTuning,
      context!.relationshipEffects.informationScoreModifier,
    );
    expect(relationshipInformation?.information.relationshipScoreModifier).toBe(
      context!.relationshipEffects.informationScoreModifier,
    );
    expect(relationshipInformation!.informationScore).toBeGreaterThan(
      neutralInformation!.informationScore,
    );
  });

  it('records one player game plus five canonical aggregate games and reproduces exactly', () => {
    function run(
      seed: string,
      definition: SeasonMechanicsDefinition = seasonMechanicsDefinition,
    ): CareerSession {
      const bootstrapped = bootstrapSeason(createCommittedSession(seed), definition);
      expectSuccess(bootstrapped);
      return playRegularSeasonRound(finishCamp(bootstrapped.session));
    }
    const first = run('season-one-round');
    const replay = run('season-one-round');
    const reordered = run('season-one-round', reorderedSeasonDefinition());
    expect(first).toEqual(replay);
    expect(first).toEqual(reordered);
    expect(parseCareerSession(JSON.stringify(first))).toEqual({ ok: true, session: first });
    expectNeutralV8Session(first);
    if (first.world.calendar.type !== 'ACTIVE') throw new TypeError('Expected active season.');
    const results = first.world.calendar.regularSeasonResults[0]!.fixtureResults;
    expect(results.filter((result) => result?.model === 'player_game_v1')).toHaveLength(1);
    expect(results.filter((result) => result?.model === 'aggregate_v1')).toHaveLength(5);
    expect(first.world.rng.drawCount).toBeGreaterThanOrEqual(10);
    expect(
      first.world.calendar.programRecords.every(
        (record) => record.wins + record.losses + record.ties === 1,
      ),
    ).toBe(true);
    expect(first.world.calendar.standings.map(({ rank }) => rank)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    const tampered = JSON.parse(JSON.stringify(first)) as {
      world: { calendar: { programRecords: { pointsFor: number }[] } };
    };
    tampered.world.calendar.programRecords[0]!.pointsFor += 1;
    expect(validateCareerSession(tampered)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          {
            code: 'invariant.invalid_combination',
            path: 'session.world.calendar.programRecords',
          },
        ]),
      }),
    );
  });

  it('terminates all twelve rounds with complete records and a postseason handoff', () => {
    const bootstrapped = bootstrapShippedSeason(createCommittedSession('season-full-run'));
    expectSuccess(bootstrapped);
    let session = finishCamp(bootstrapped.session);
    for (let roundIndex = 0; roundIndex < 12; roundIndex += 1) {
      session = playRegularSeasonRound(session);
      expect(validateCareerSession(session)).toEqual({ issues: [], ok: true });
    }
    expect(session.career.weekIndex).toBe(15);
    expect(session.career.gameCareerState.gamesPlayed).toBe(12);
    if (session.world.calendar.type !== 'ACTIVE') throw new TypeError('Expected active season.');
    expect(session.world.calendar.stage).toBe('POSTSEASON');
    expect(session.world.calendar.completedRegularSeasonRoundCount).toBe(12);
    expect(
      session.world.calendar.regularSeasonResults.every(({ fixtureResults }) =>
        fixtureResults.every((result) => result !== null),
      ),
    ).toBe(true);
    expect(
      session.world.calendar.programRecords.every(
        ({ wins, losses, ties }) => wins + losses + ties === 12,
      ),
    ).toBe(true);
    expect(session.world.calendar.standings).toHaveLength(12);
  });

  it('freezes season one and projects deterministic offseason world churn plus three offers', () => {
    const bootstrapped = bootstrapShippedSeason(createCommittedSession('season-offseason-project'));
    expectSuccess(bootstrapped);
    const activated = bootstrapShippedOffFieldSystems(bootstrapped.session);
    expectSuccess(activated);
    let session = finishSettledOffFieldCamp(activated.session);
    for (let roundIndex = 0; roundIndex < 12; roundIndex += 1) {
      session = playSettledOffFieldSeasonRound(session);
    }
    const initialized = initializeShippedPostseason(session);
    expectSuccess(initialized);
    session = initialized.session;
    for (let postseasonRound = 0; postseasonRound < 2; postseasonRound += 1) {
      if (
        session.world.calendar.type !== 'ACTIVE' ||
        session.world.calendar.postseason.type !== 'ACTIVE'
      ) {
        break;
      }
      session = resolveDevelopmentWeek(session);
      const settled = settleShippedCompletedWeekOffField(session);
      expectSuccess(settled);
      session = processWeeklyInjury(processWeeklyEvent(settled.session));
      const prepared = prepareNextShippedPostseasonGame(session);
      expectSuccess(prepared);
      const completed = completeShippedPostseasonRound(playPreparedGame(prepared.session));
      expectSuccess(completed);
      session = acceptBreakthroughIfPresent(completed.session);
    }
    const reviewed = enterShippedSeasonReview(session);
    expectSuccess(reviewed);
    const careerDrawsBefore = reviewed.session.career.rng.drawCount;
    const worldDrawsBefore = reviewed.session.world.rng.drawCount;
    const worldCalendarBefore = reviewed.session.world.calendar;

    const projected = projectShippedOffseason(reviewed.session);
    expectSuccess(projected);
    const reordered = projectOffseason(reviewed.session, {
      offFieldDefinitions: offFieldMechanicsCatalog,
      programProfiles: [...offseasonProgramMechanicsProfiles].reverse(),
      offenseStyleDefinitions: [...offenseStyleMechanicsDefinitions].reverse(),
      rotationPolicyDefinitions: [...rotationPolicyMechanicsDefinitions].reverse(),
    });
    expectSuccess(reordered);
    expect(reordered.session).toEqual(projected.session);
    expect(projected.session.world.calendar).toEqual(worldCalendarBefore);
    expect(projected.session.world.rng.drawCount).toBe(worldDrawsBefore + 36);
    expect(projected.session.career.rng.drawCount).toBe(careerDrawsBefore + 3);
    expect(projected.session.career.seasonCareerState).toEqual(
      expect.objectContaining({
        bootstrapStatus: 'COMPLETE',
        seasonsCompleted: 1,
        activeSeasonId: null,
      }),
    );
    const offseason = projected.session.career.offFieldCareerState.offseason;
    if (offseason.status !== 'PROJECTED') throw new TypeError('Expected projected offseason.');
    expect(offseason.completedSeasonId).toBe(
      projected.session.career.seasonCareerState.lastCompletedSeason?.seasonId,
    );
    expect(offseason.academicTermIndexAfter).toBe(offseason.academicTermIndexBefore + 1);
    expect(offseason.worldProjection.programs).toHaveLength(12);
    expect(offseason.worldProjection.worldRngDrawCountAfter).toBe(
      projected.session.world.rng.drawCount,
    );
    expect(validateWorldStateV1(projected.session.world)).toEqual({ issues: [], ok: true });
    expect(offseason.transferProjection.careerRngDrawCountAfter).toBe(
      projected.session.career.rng.drawCount,
    );
    expect(offseason.transferProjection.stayOption).toEqual(
      expect.objectContaining({ kind: 'STAY', programId: projected.session.career.programId }),
    );
    expect(offseason.transferProjection.transferOptions).toHaveLength(3);
    expect(
      new Set(offseason.transferProjection.transferOptions.map(({ programId }) => programId)).size,
    ).toBe(3);
    expect(
      offseason.transferProjection.transferOptions.every(
        (option) =>
          option.kind === 'TRANSFER' &&
          option.programId !== projected.session.career.programId &&
          option.factors.length === 9 &&
          option.projectedScoreMinimum <= option.projectedScore &&
          option.projectedScore <= option.projectedScoreMaximum,
      ),
    ).toBe(true);
    expect(parseCareerSession(JSON.stringify(projected.session))).toEqual({
      ok: true,
      session: projected.session,
    });
    expectNeutralV8Session(projected.session);

    const currentProgramId = projected.session.career.programId;
    if (currentProgramId === null) throw new TypeError('Expected current program.');
    expect(decideShippedOffseason(projected.session, 'program_not_shortlisted')).toEqual({
      ok: false,
      reason: 'season.invalid_phase',
      session: projected.session,
    });
    const stayed = decideShippedOffseason(projected.session, currentProgramId);
    expectSuccess(stayed);
    const stayedOffseason = stayed.session.career.offFieldCareerState.offseason;
    if (stayedOffseason.status !== 'DECIDED') throw new TypeError('Expected decided offseason.');
    expect(stayed.session.career.rng.drawCount).toBe(projected.session.career.rng.drawCount + 35);
    expect(stayed.session.world).toEqual(projected.session.world);
    expect(stayed.session.career.programId).toBe(currentProgramId);
    expect(stayed.session.career.recruitingState).toEqual(projected.session.career.recruitingState);
    expect(stayed.session.career.gameCareerState).toEqual(projected.session.career.gameCareerState);
    expect(stayed.session.career.seasonCareerState).toEqual(
      projected.session.career.seasonCareerState,
    );
    expect(stayed.session.career.offFieldCareerState.programHistory).toEqual(
      projected.session.career.offFieldCareerState.programHistory,
    );
    expect(stayedOffseason.lastDecision.selectedOption).toEqual(
      offseason.transferProjection.stayOption,
    );
    expect(stayedOffseason.lastDecision.actualDepthRank).toBe(
      stayed.session.career.programContext?.projection.rank,
    );
    expect(parseCareerSession(JSON.stringify(stayed.session))).toEqual({
      ok: true,
      session: stayed.session,
    });
    expectNeutralV8Session(stayed.session);

    const transferOption = offseason.transferProjection.transferOptions[0];
    const transferred = decideShippedOffseason(projected.session, transferOption.programId);
    expectSuccess(transferred);
    const transferredOffseason = transferred.session.career.offFieldCareerState.offseason;
    if (transferredOffseason.status !== 'DECIDED') {
      throw new TypeError('Expected decided transfer offseason.');
    }
    const reorderedDecision = decideOffseason(projected.session, transferOption.programId, {
      offFieldDefinitions: offFieldMechanicsCatalog,
      programProfiles: [...offseasonProgramMechanicsProfiles].reverse(),
      programDefinitions: [...programMechanicsDefinitions].reverse(),
      offenseStyleDefinitions: [...offenseStyleMechanicsDefinitions].reverse(),
      rotationPolicyDefinitions: [...rotationPolicyMechanicsDefinitions].reverse(),
      rosterNamePool: {
        givenNameIds: [...rosterNameMechanicsPool.givenNameIds].reverse(),
        familyNameIds: [...rosterNameMechanicsPool.familyNameIds].reverse(),
      },
    });
    expectSuccess(reorderedDecision);
    expect(reorderedDecision.session).toEqual(transferred.session);
    expect(transferred.session.career.rng.drawCount).toBe(
      projected.session.career.rng.drawCount + 35,
    );
    expect(transferred.session.world).toEqual(projected.session.world);
    expect(transferred.session.career.programId).toBe(transferOption.programId);
    expect(transferred.session.career.programContext).toEqual(
      expect.objectContaining({
        programId: transferOption.programId,
        offenseStyleId: transferredOffseason.lastDecision.offenseStyleIdAfter,
        rotationPolicyId: transferredOffseason.lastDecision.rotationPolicyIdAfter,
      }),
    );
    expect(transferred.session.career.recruitingState).toEqual(
      projected.session.career.recruitingState,
    );
    expect(transferred.session.career.player.appearance).toEqual(
      projected.session.career.player.appearance,
    );
    expect(transferred.session.career.player.skillState).toEqual(
      projected.session.career.player.skillState,
    );
    expect(transferred.session.career.gameCareerState).toEqual(
      projected.session.career.gameCareerState,
    );
    expect(transferred.session.career.seasonCareerState).toEqual(
      projected.session.career.seasonCareerState,
    );
    expect(transferred.session.career.offFieldCareerState.programHistory).toEqual([
      {
        ...projected.session.career.offFieldCareerState.programHistory[0],
        endSeasonIndex: 0,
      },
      { programId: transferOption.programId, startSeasonIndex: 1, endSeasonIndex: null },
    ]);
    expect(
      transferred.session.career.offFieldCareerState.relationships.bootstrapStatus === 'ACTIVE'
        ? transferred.session.career.offFieldCareerState.relationships.tracks.map(
            ({ value }) => value,
          )
        : [],
    ).toEqual([50, 50, 50]);
    expect(transferredOffseason.lastDecision.selectedOption).toEqual(transferOption);
    expect(transferredOffseason.lastDecision.coachTrustRequestedAfter).toBe(
      transferredOffseason.lastDecision.coachTrustBaseline +
        Math.round(
          (transferredOffseason.lastDecision.coachTrustBefore *
            transferredOffseason.lastDecision.coachTrustRetentionPermille) /
            1_000,
        ),
    );
    expect(transferredOffseason.lastDecision.rosterRngDrawCountBefore).toBe(
      offseason.transferProjection.careerRngDrawCountAfter,
    );
    expect(transferredOffseason.lastDecision.rosterRngDrawCountAfter).toBe(
      transferred.session.career.rng.drawCount,
    );
    expect(parseCareerSession(JSON.stringify(transferred.session))).toEqual({
      ok: true,
      session: transferred.session,
    });
    expectNeutralV8Session(transferred.session);
    const destinationProgram = programContent.programs.find(
      ({ id }) => id === transferOption.programId,
    );
    expect(destinationProgram).toBeDefined();
    expect(deriveShippedEventContextTagIds(transferred.session)).toEqual(
      expect.arrayContaining(destinationProgram!.traitIds.map((traitId) => `tag_${traitId}`)),
    );
    expect(decideShippedOffseason(transferred.session, transferOption.programId)).toEqual({
      ok: false,
      reason: 'season.invalid_phase',
      session: transferred.session,
    });

    const stayedCareerDraws = stayed.session.career.rng.drawCount;
    const stayedWorldDraws = stayed.session.world.rng.drawCount;
    const stayedNextSeason = bootstrapShippedNextSeason(stayed.session);
    expectSuccess(stayedNextSeason);
    const reorderedNextSeason = bootstrapNextSeason(
      stayed.session,
      reorderedSeasonDefinition(seasonTwoMechanicsDefinition),
    );
    expectSuccess(reorderedNextSeason);
    expect(reorderedNextSeason.session).toEqual(stayedNextSeason.session);
    expect(stayedNextSeason.session.career.rng.drawCount).toBe(stayedCareerDraws);
    expect(stayedNextSeason.session.world.rng.drawCount).toBe(stayedWorldDraws);
    expect(stayedNextSeason.session.career.offFieldCareerState.relationships).toEqual(
      stayed.session.career.offFieldCareerState.relationships,
    );
    expect(stayedNextSeason.session.career.offFieldCareerState.nil).toEqual(
      stayed.session.career.offFieldCareerState.nil,
    );
    expect(stayedNextSeason.session.career.offFieldCareerState.academics).toEqual(
      expect.objectContaining({
        checkpointHistory:
          stayed.session.career.offFieldCareerState.academics.bootstrapStatus === 'ACTIVE'
            ? stayed.session.career.offFieldCareerState.academics.checkpointHistory
            : [],
        termIndex: stayedOffseason.academicTermIndexAfter,
      }),
    );
    expect(stayedNextSeason.session.career.gameCareerState).toEqual(
      stayed.session.career.gameCareerState,
    );
    expect(stayedNextSeason.session.career.seasonCareerState).toEqual(
      expect.objectContaining({
        activeSeasonId: seasonTwoMechanicsDefinition.id,
        bootstrapStatus: 'ACTIVE',
        gameSummaries: [],
        lastCompletedSeason: stayed.session.career.seasonCareerState.lastCompletedSeason,
        seasonsCompleted: 1,
      }),
    );
    expect(stayedNextSeason.session.world.completedSeasonHistory).toEqual([
      {
        calendar: worldCalendarBefore,
        model: 'completed_season_world_v1',
        playerProgramId: currentProgramId,
        seasonIndex: 0,
      },
    ]);
    expect(stayedNextSeason.session.world.calendar).toEqual(
      expect.objectContaining({
        definition: expect.objectContaining({ id: seasonTwoMechanicsDefinition.id }),
        stage: 'CAMP',
      }),
    );
    expect(parseCareerSession(JSON.stringify(stayedNextSeason.session))).toEqual({
      ok: true,
      session: stayedNextSeason.session,
    });
    expectNeutralV8Session(stayedNextSeason.session);
    expect(bootstrapShippedNextSeason(stayedNextSeason.session)).toEqual({
      ok: false,
      reason: 'season.invalid_phase',
      session: stayedNextSeason.session,
    });
    expect(bootstrapNextSeason(stayed.session, seasonMechanicsDefinition)).toEqual({
      ok: false,
      reason: 'season.invalid_definition',
      session: stayed.session,
    });

    const transferredCareerDraws = transferred.session.career.rng.drawCount;
    const transferredWorldDraws = transferred.session.world.rng.drawCount;
    const transferredNextSeason = bootstrapShippedNextSeason(transferred.session);
    expectSuccess(transferredNextSeason);
    expect(transferredNextSeason.session.career.rng.drawCount).toBe(transferredCareerDraws);
    expect(transferredNextSeason.session.world.rng.drawCount).toBe(transferredWorldDraws);
    expect(transferredNextSeason.session.career.offFieldCareerState.relationships).toEqual(
      transferred.session.career.offFieldCareerState.relationships,
    );
    expect(transferredNextSeason.session.career.offFieldCareerState.nil).toEqual(
      transferred.session.career.offFieldCareerState.nil,
    );
    expect(transferredNextSeason.session.career.offFieldCareerState.academics).toEqual(
      expect.objectContaining({
        checkpointHistory:
          transferred.session.career.offFieldCareerState.academics.bootstrapStatus === 'ACTIVE'
            ? transferred.session.career.offFieldCareerState.academics.checkpointHistory
            : [],
        termIndex: transferredOffseason.academicTermIndexAfter,
      }),
    );
    expect(transferredNextSeason.session.career.gameCareerState).toEqual(
      transferred.session.career.gameCareerState,
    );
    expect(transferredNextSeason.session.world.completedSeasonHistory?.[0]).toEqual(
      expect.objectContaining({
        calendar: worldCalendarBefore,
        playerProgramId: currentProgramId,
      }),
    );
    expect(transferredNextSeason.session.career.programId).toBe(transferOption.programId);

    const stayedGamesBefore = stayedNextSeason.session.career.gameCareerState.gamesPlayed;
    const transferredGamesBefore = transferredNextSeason.session.career.gameCareerState.gamesPlayed;
    const stayedAfterOpeningGame = playSettledOffFieldSeasonRound(
      finishSettledOffFieldCamp(stayedNextSeason.session),
    );
    const transferredAfterOpeningGame = playSettledOffFieldSeasonRound(
      finishSettledOffFieldCamp(transferredNextSeason.session),
    );
    for (const [opened, expectedProgramId, gamesBefore] of [
      [stayedAfterOpeningGame, currentProgramId, stayedGamesBefore],
      [transferredAfterOpeningGame, transferOption.programId, transferredGamesBefore],
    ] as const) {
      expect(opened.career.gameCareerState.gamesPlayed).toBe(gamesBefore + 1);
      expect(opened.career.gameCareerState.lastGame?.playerProgramId).toBe(expectedProgramId);
      expect(opened.career.seasonCareerState).toEqual(
        expect.objectContaining({
          bootstrapStatus: 'ACTIVE',
          seasonsCompleted: 1,
          gameSummaries: [opened.career.gameCareerState.lastGame],
        }),
      );
      expect(opened.career.seasonCareerState.lastCompletedSeason).toEqual(
        projected.session.career.seasonCareerState.lastCompletedSeason,
      );
      expect(opened.world.completedSeasonHistory?.[0]?.calendar).toEqual(worldCalendarBefore);
      expect(validateCareerSession(opened)).toEqual({ issues: [], ok: true });
      expect(parseCareerSession(JSON.stringify(opened))).toEqual({ ok: true, session: opened });
      expectNeutralV8Session(opened);
    }

    const tamperedHistory = structuredClone(transferredNextSeason.session) as unknown as {
      world: { completedSeasonHistory: { playerProgramId: string }[] };
    };
    tamperedHistory.world.completedSeasonHistory[0]!.playerProgramId = transferOption.programId;
    expect(validateCareerSession(tamperedHistory)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'invariant.invalid_combination',
            path: expect.stringContaining('completedSeasonHistory'),
          }),
        ]),
      }),
    );

    const tamperedAcademicTerm = structuredClone(stayedNextSeason.session) as unknown as {
      career: { offFieldCareerState: { academics: { termIndex: number } } };
    };
    tamperedAcademicTerm.career.offFieldCareerState.academics.termIndex =
      stayedOffseason.academicTermIndexBefore;
    expect(validateCareerSession(tamperedAcademicTerm)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'invariant.invalid_combination',
            path: 'session.career.offFieldCareerState.academics.termIndex',
          }),
        ]),
      }),
    );

    const tamperedDecision = structuredClone(transferred.session) as unknown as {
      career: {
        offFieldCareerState: {
          offseason: { lastDecision: { rosterRngDrawCountAfter: number } };
        };
      };
    };
    tamperedDecision.career.offFieldCareerState.offseason.lastDecision.rosterRngDrawCountAfter -= 1;
    expect(validateCareerSession(tamperedDecision)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'invariant.invalid_combination',
            path: expect.stringContaining('rosterRngDrawCountAfter'),
          }),
        ]),
      }),
    );

    const tampered = structuredClone(projected.session) as unknown as {
      career: {
        offFieldCareerState: {
          offseason: { worldProjection: { programs: { roomTalentAfter: number }[] } };
        };
      };
    };
    tampered.career.offFieldCareerState.offseason.worldProjection.programs[0]!.roomTalentAfter += 1;
    expect(validateCareerSession(tampered)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'invariant.invalid_combination',
            path: expect.stringContaining('roomTalentAfter'),
          }),
        ]),
      }),
    );
  });

  it('closes the deterministic postseason into review, alumni, and bounded legacy visibility', () => {
    const bootstrapped = bootstrapShippedSeason(
      createCommittedSession('season-career-close-1', 'strongest_offer'),
    );
    expectSuccess(bootstrapped);
    let session = finishCamp(bootstrapped.session);
    for (let roundIndex = 0; roundIndex < 12; roundIndex += 1) {
      session = playRegularSeasonRound(session);
    }
    const initialized = initializeShippedPostseason(session);
    expectSuccess(initialized);
    session = initialized.session;
    if (session.world.calendar.type !== 'ACTIVE') {
      throw new TypeError('Expected an active calendar.');
    }
    expect(session.world.calendar.postseason.type).toBe('ACTIVE');

    for (let postseasonRound = 0; postseasonRound < 2; postseasonRound += 1) {
      if (
        session.world.calendar.type !== 'ACTIVE' ||
        session.world.calendar.postseason.type !== 'ACTIVE'
      ) {
        break;
      }
      session = processWeeklyInjury(processWeeklyEvent(resolveDevelopmentWeek(session)));
      const prepared = prepareNextShippedPostseasonGame(session);
      expectSuccess(prepared);
      const played = playPreparedGame(prepared.session);
      const completed = completeShippedPostseasonRound(played);
      expectSuccess(completed);
      session = acceptBreakthroughIfPresent(completed.session);
    }

    if (
      session.world.calendar.type !== 'ACTIVE' ||
      session.world.calendar.postseason.type !== 'COMPLETE'
    ) {
      throw new TypeError('Expected a complete postseason.');
    }
    expect(session.world.calendar.postseason.rounds[0].fixtureResults).toHaveLength(2);
    expect(session.world.calendar.postseason.rounds[1].fixtureResults).toHaveLength(1);
    expect(validateCareerSession(session)).toEqual({ issues: [], ok: true });

    const reviewed = enterShippedSeasonReview(session);
    expectSuccess(reviewed);
    expect(reviewed.session.career.phase.type).toBe('SEASON_REVIEW');
    const completedCareer = completeShippedCareer(reviewed.session, createEmptyMetaProfile());
    expectSuccess(completedCareer);
    const migratedMeta = migrateMetaProfileV1ToWrV2(completedCareer.meta);
    expect(migratedMeta).toEqual({ ...completedCareer.meta, schemaVersion: 2 });
    expect(parseWrMetaProfileV2(JSON.stringify(migratedMeta))).toEqual(migratedMeta);
    const registry = createWrMetaRegistryV1(completedCareer.meta);
    expect(registry?.records).toEqual(completedCareer.meta.alumni);
    expect(registry?.registry.alumni).toEqual(
      completedCareer.meta.alumni.map((alumni) => ({
        alumniId: alumni.alumniId,
        careerId: alumni.careerId,
        programIds: alumni.programIds,
        recordSchemaVersion: 1,
      })),
    );
    expect(parseWrMetaRegistryV1(JSON.stringify(registry?.registry))).toEqual(registry?.registry);
    expect(parseMetaProfile(migratedMeta).ok).toBe(false);
    expect(
      parseWrMetaProfileV2({
        ...migratedMeta,
        alumni: [...migratedMeta.alumni, ...migratedMeta.alumni],
      }),
    ).toBeNull();
    expect(completedCareer.session.career.phase.type).toBe('CAREER_COMPLETE');
    expect(completedCareer.session.career.seasonCareerState).toEqual(
      expect.objectContaining({
        bootstrapStatus: 'COMPLETE',
        seasonsCompleted: 1,
        activeSeasonId: null,
      }),
    );
    expect(completedCareer.meta.alumni).toEqual([completedCareer.alumni]);
    expect(completedCareer.alumni.bestGame).not.toBeNull();
    expect(completedCareer.alumni.gamesPlayed).toBe(
      completedCareer.session.career.gameCareerState.gamesPlayed,
    );
    expect(completedCareer.alumni.startingDepthRank).toBe(
      completedCareer.session.career.seasonCareerState.lastCompletedSeason?.roleHistory[0]?.rank,
    );
    expect(completedCareer.alumni.programIds).toEqual([completedCareer.session.career.programId]);
    const visibility = deriveShippedLegacyVisibility(
      completedCareer.meta,
      completedCareer.alumni.programIds[0],
    );
    expect(visibility).toEqual(
      expect.objectContaining({
        model: 'legacy_visibility_v1',
        alumnus: completedCareer.alumni,
        familiarProgramCareerCount: 1,
        unlockedOptionIds: ['legacy_option_alumni_history'],
      }),
    );
    expect(parseCareerSession(JSON.stringify(completedCareer.session))).toEqual({
      ok: true,
      session: completedCareer.session,
    });
    expectNeutralV8Session(reviewed.session);
    expectNeutralV8Session(completedCareer.session);
    expect(completeShippedCareer(reviewed.session, completedCareer.meta)).toEqual({
      ok: false,
      session: reviewed.session,
      meta: completedCareer.meta,
      reason: 'season.duplicate_alumni',
    });
    const tamperedMeta = structuredClone(completedCareer.meta) as unknown as {
      alumni: { contentVersion: number }[];
    };
    tamperedMeta.alumni[0]!.contentVersion = 0;
    expect(parseMetaProfile(tamperedMeta)).toEqual(
      expect.objectContaining({ ok: false, reason: 'session_parse.invalid_session' }),
    );
  });

  it('closes a non-qualifier without fabricating player playoff games', () => {
    const bootstrapped = bootstrapShippedSeason(
      createCommittedSession('season-career-close', 'strongest_offer'),
    );
    expectSuccess(bootstrapped);
    let session = finishCamp(bootstrapped.session);
    for (let roundIndex = 0; roundIndex < 12; roundIndex += 1) {
      session = playRegularSeasonRound(session);
    }
    const gamesBefore = session.career.gameCareerState.gamesPlayed;
    const careerRngBefore = session.career.rng;
    const worldDrawsBefore = session.world.rng.drawCount;
    const initialized = initializeShippedPostseason(session);
    expectSuccess(initialized);
    if (initialized.session.world.calendar.type !== 'ACTIVE') {
      throw new TypeError('Expected an active calendar.');
    }
    expect(initialized.session.world.calendar.postseason).toEqual(
      expect.objectContaining({
        type: 'COMPLETE',
        playerOutcomeId: 'season_outcome_regular_season_complete',
        playerPostseasonSeed: null,
      }),
    );
    expect(initialized.session.career.gameCareerState.gamesPlayed).toBe(gamesBefore);
    expect(initialized.session.career.rng).toEqual(careerRngBefore);
    expect(initialized.session.world.rng.drawCount).toBe(worldDrawsBefore + 6);
    expect(prepareNextShippedPostseasonGame(initialized.session)).toEqual({
      ok: false,
      reason: 'season.invalid_phase',
      session: initialized.session,
    });
    const reviewed = enterShippedSeasonReview(initialized.session);
    expectSuccess(reviewed);
    expect(reviewed.session.career.phase).toEqual(
      expect.objectContaining({
        type: 'SEASON_REVIEW',
        outcomeId: 'season_outcome_regular_season_complete',
      }),
    );
  });
});
