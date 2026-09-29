import {
  chooseSkillBreakthrough,
  commitWeeklyActionPlan,
  createCareerSession,
  createEmptyMetaProfile,
  completeWrTwoSeasonCareerV8,
  enterWrTwoSeasonReviewV8,
  migrateCareerSessionV7ToV8,
  resolveNextWeeklyAction,
  validateCareerSession,
  type CareerRun,
  type CareerSession,
  type MetaProfileV1,
} from '@project-saturday/game-core';
import {
  advanceShippedCampRound,
  assessShippedWeeklyInjury,
  attemptShippedWeeklyNilOffer,
  bootstrapShippedNextSeason,
  bootstrapShippedOffFieldSystems,
  bootstrapShippedSeason,
  completeShippedCareer,
  completeShippedPostseasonRound,
  completeShippedRegularSeasonRound,
  developmentWeekConfig,
  decideShippedNilOffer,
  decideShippedOffseason,
  enterShippedSeasonReview,
  initializeShippedPostseason,
  keySnapPatternMechanicsDefinitions,
  offenseStyleMechanicsDefinitions,
  prepareNextShippedPostseasonGame,
  prepareNextShippedSeasonGame,
  projectShippedOffseason,
  resolveShippedEventChoice,
  resolveShippedInjuryChoice,
  resolveShippedKeySnap,
  rotationPolicyMechanicsDefinitions,
  seasonMechanicsDefinition,
  selectShippedWeeklyEvent,
  settleShippedCompletedWeekOffField,
  skillMechanicsDefinitions,
  startShippedGame,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';

import { beginCareerRecruiting, commitCareerProgramChoice } from '../career/career-ui';
import { createTestCareer } from './career-fixture';

export interface CompletedSeasonFixture {
  readonly postseasonCompleteSession: CareerSession;
  readonly postseasonPendingSession: CareerSession;
  readonly reviewSession: CareerSession;
  readonly completedSession: CareerSession;
  readonly completedMeta: MetaProfileV1;
}

export interface SeasonDecisionFixtures {
  readonly eventSession: CareerSession;
  readonly injurySession: CareerSession;
}

export interface SecondSeasonFixture {
  readonly decisionSession: CareerSession;
  readonly nextSeasonSession: CareerSession;
  readonly projectedSession: CareerSession;
  readonly reviewSession: CareerSession;
}

export interface NilDecisionFixtures {
  readonly obligationSession: CareerSession;
  readonly offerSession: CareerSession;
}

function withCareer(session: CareerSession, career: CareerRun): CareerSession {
  const next = { ...session, career };
  if (!validateCareerSession(next).ok) throw new Error('Invalid season fixture session.');
  return next;
}

function resolveDevelopmentWeek(session: CareerSession): CareerSession {
  const actionIds = ['action_recovery', 'action_film_study', 'action_route_drills'] as const;
  const committed = commitWeeklyActionPlan(
    session.career,
    actionIds,
    weeklyActionDefinitions.map(({ id }) => id),
  );
  if (!committed.ok) throw new Error(committed.reason);
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
    if (!resolved.ok) throw new Error(resolved.reason);
    career = resolved.career;
  }
  return withCareer(session, career);
}

function processEventAndInjury(session: CareerSession): CareerSession {
  const selected = selectShippedWeeklyEvent(session);
  if (!selected.ok) throw new Error(selected.reason);
  let current = selected.session;
  if (current.career.phase.type === 'EVENT_CHOICE') {
    const resolved = resolveShippedEventChoice(
      current,
      current.career.phase.pendingEvent.choiceIds[0]!,
    );
    if (!resolved.ok) throw new Error(resolved.reason);
    current = resolved.session;
  }
  const assessed = assessShippedWeeklyInjury(current);
  if (!assessed.ok) throw new Error(assessed.reason);
  current = assessed.session;
  if (current.career.phase.type === 'INJURY_CHOICE') {
    const resolved = resolveShippedInjuryChoice(current, 'injury_choice_play_limited');
    if (!resolved.ok) throw new Error(resolved.reason);
    current = resolved.session;
  }
  return current;
}

function acceptBreakthrough(session: CareerSession): CareerSession {
  if (session.career.phase.type !== 'SKILL_BREAKTHROUGH') return session;
  const chosen = chooseSkillBreakthrough(
    session.career,
    session.career.phase.offer.offeredSkillIds[0],
  );
  if (!chosen.ok) throw new Error(chosen.reason);
  return withCareer(session, chosen.career);
}

function playPreparedGame(session: CareerSession): CareerSession {
  const started = startShippedGame(session.career);
  if (!started.ok) throw new Error(started.reason);
  let career = started.career;
  while (career.phase.type === 'KEY_SNAP') {
    const pendingSnap = career.phase.pendingSnap;
    const pattern = keySnapPatternMechanicsDefinitions.find(
      ({ id }) => id === pendingSnap.patternId,
    )!;
    const decisionId = [...pattern.decisionFits].sort((left, right) => right.fit - left.fit)[0]!
      .decisionId;
    const resolved = resolveShippedKeySnap(career, decisionId);
    if (!resolved.ok) throw new Error(resolved.reason);
    career = resolved.career;
  }
  return withCareer(session, career);
}

export function createPendingSeasonFixture(seed = 'season-ui-pending'): CareerSession {
  const created = createTestCareer(seed);
  const recruiting = beginCareerRecruiting(created);
  if (!recruiting.ok || recruiting.career.recruitingState.type !== 'CHOOSING') {
    throw new Error('Season fixture recruiting failed.');
  }
  const selectedProgramId = [...recruiting.career.recruitingState.offers].sort((left, right) => {
    const leftRating = seasonMechanicsDefinition.programProfiles.find(
      ({ programId }) => programId === left.programId,
    )?.teamRating;
    const rightRating = seasonMechanicsDefinition.programProfiles.find(
      ({ programId }) => programId === right.programId,
    )?.teamRating;
    return (rightRating ?? 0) - (leftRating ?? 0);
  })[0]!.programId;
  const committed = commitCareerProgramChoice(recruiting.career, selectedProgramId);
  if (!committed.ok) throw new Error(committed.reason);
  return createCareerSession(committed.career);
}

export function createCompletedSeasonFixture(
  seed = 'season-career-close-1',
): CompletedSeasonFixture {
  const bootstrapped = bootstrapShippedSeason(createPendingSeasonFixture(seed));
  if (!bootstrapped.ok) throw new Error(bootstrapped.reason);
  let session = bootstrapped.session;
  for (let campRound = 0; campRound < 3; campRound += 1) {
    session = processEventAndInjury(resolveDevelopmentWeek(session));
    const advanced = advanceShippedCampRound(session);
    if (!advanced.ok) throw new Error(advanced.reason);
    session = acceptBreakthrough(advanced.session);
  }
  for (let round = 0; round < 12; round += 1) {
    session = processEventAndInjury(resolveDevelopmentWeek(session));
    const prepared = prepareNextShippedSeasonGame(session);
    if (!prepared.ok) throw new Error(prepared.reason);
    const completed = completeShippedRegularSeasonRound(playPreparedGame(prepared.session));
    if (!completed.ok) throw new Error(completed.reason);
    session = acceptBreakthrough(completed.session);
  }
  const postseasonPendingSession = session;
  const initialized = initializeShippedPostseason(session);
  if (!initialized.ok) throw new Error(initialized.reason);
  session = initialized.session;
  for (let round = 0; round < 2; round += 1) {
    if (
      session.world.calendar.type !== 'ACTIVE' ||
      session.world.calendar.postseason.type !== 'ACTIVE'
    ) {
      break;
    }
    session = processEventAndInjury(resolveDevelopmentWeek(session));
    const prepared = prepareNextShippedPostseasonGame(session);
    if (!prepared.ok) throw new Error(prepared.reason);
    const completed = completeShippedPostseasonRound(playPreparedGame(prepared.session));
    if (!completed.ok) throw new Error(completed.reason);
    session = acceptBreakthrough(completed.session);
  }
  const postseasonCompleteSession = session;
  const reviewed = enterShippedSeasonReview(session);
  if (!reviewed.ok) throw new Error(reviewed.reason);
  const completed = completeShippedCareer(reviewed.session, createEmptyMetaProfile());
  if (!completed.ok) throw new Error(completed.reason);
  return {
    postseasonCompleteSession,
    postseasonPendingSession,
    reviewSession: reviewed.session,
    completedSession: completed.session,
    completedMeta: completed.meta,
  };
}

export function createSecondSeasonFixture(
  seed = 'season-two-persistence',
  choice: 'STAY' | 'TRANSFER' = 'TRANSFER',
): SecondSeasonFixture {
  const bootstrapped = bootstrapShippedSeason(createPendingSeasonFixture(seed));
  if (!bootstrapped.ok) throw new Error(bootstrapped.reason);
  const activated = bootstrapShippedOffFieldSystems(bootstrapped.session);
  if (!activated.ok) throw new Error(activated.reason);
  let session = activated.session;
  for (let campRound = 0; campRound < 3; campRound += 1) {
    session = resolveDevelopmentWeek(session);
    const settled = settleShippedCompletedWeekOffField(session);
    if (!settled.ok) throw new Error(settled.reason);
    session = processEventAndInjury(settled.session);
    const advanced = advanceShippedCampRound(session);
    if (!advanced.ok) throw new Error(advanced.reason);
    session = acceptBreakthrough(advanced.session);
  }
  for (let round = 0; round < 12; round += 1) {
    session = resolveDevelopmentWeek(session);
    const settled = settleShippedCompletedWeekOffField(session);
    if (!settled.ok) throw new Error(settled.reason);
    session = processEventAndInjury(settled.session);
    const prepared = prepareNextShippedSeasonGame(session);
    if (!prepared.ok) throw new Error(prepared.reason);
    const completed = completeShippedRegularSeasonRound(playPreparedGame(prepared.session));
    if (!completed.ok) throw new Error(completed.reason);
    session = acceptBreakthrough(completed.session);
  }
  const initialized = initializeShippedPostseason(session);
  if (!initialized.ok) throw new Error(initialized.reason);
  session = initialized.session;
  for (let round = 0; round < 2; round += 1) {
    if (
      session.world.calendar.type !== 'ACTIVE' ||
      session.world.calendar.postseason.type !== 'ACTIVE'
    ) {
      break;
    }
    session = resolveDevelopmentWeek(session);
    const settled = settleShippedCompletedWeekOffField(session);
    if (!settled.ok) throw new Error(settled.reason);
    session = processEventAndInjury(settled.session);
    const prepared = prepareNextShippedPostseasonGame(session);
    if (!prepared.ok) throw new Error(prepared.reason);
    const completed = completeShippedPostseasonRound(playPreparedGame(prepared.session));
    if (!completed.ok) throw new Error(completed.reason);
    session = acceptBreakthrough(completed.session);
  }
  const reviewed = enterShippedSeasonReview(session);
  if (!reviewed.ok) throw new Error(reviewed.reason);
  const projected = projectShippedOffseason(reviewed.session);
  if (!projected.ok) throw new Error(projected.reason);
  const offseason = projected.session.career.offFieldCareerState.offseason;
  if (offseason.status !== 'PROJECTED' || projected.session.career.programId === null) {
    throw new Error('Expected a projected offseason fixture.');
  }
  const selectedProgramId =
    choice === 'STAY'
      ? projected.session.career.programId
      : offseason.transferProjection.transferOptions[0].programId;
  const decided = decideShippedOffseason(projected.session, selectedProgramId);
  if (!decided.ok) throw new Error(decided.reason);
  const nextSeason = bootstrapShippedNextSeason(decided.session);
  if (!nextSeason.ok) throw new Error(nextSeason.reason);
  return {
    decisionSession: decided.session,
    nextSeasonSession: nextSeason.session,
    projectedSession: projected.session,
    reviewSession: reviewed.session,
  };
}

/** Real two-season commands; no authored terminal save or UI-only rules. */
export function createWrV8TerminalFixture(seed = 'wr-v8-wire-terminal') {
  const first = createSecondSeasonFixture(seed);
  let session = first.nextSeasonSession;
  const week = () => {
    session = resolveDevelopmentWeek(session);
    const settled = settleShippedCompletedWeekOffField(session);
    if (!settled.ok) throw new Error(settled.reason);
    session = processEventAndInjury(settled.session);
  };
  for (let round = 0; round < 3; round += 1) {
    week();
    const next = advanceShippedCampRound(session);
    if (!next.ok) throw new Error(next.reason);
    session = acceptBreakthrough(next.session);
  }
  for (let round = 0; round < 12; round += 1) {
    week();
    const prepared = prepareNextShippedSeasonGame(session);
    if (!prepared.ok) throw new Error(prepared.reason);
    const next = completeShippedRegularSeasonRound(playPreparedGame(prepared.session));
    if (!next.ok) throw new Error(next.reason);
    session = acceptBreakthrough(next.session);
  }
  const initialized = initializeShippedPostseason(session);
  if (!initialized.ok) throw new Error(initialized.reason);
  session = initialized.session;
  for (let round = 0; round < 2; round += 1) {
    if (
      session.world.calendar.type !== 'ACTIVE' ||
      session.world.calendar.postseason.type !== 'ACTIVE'
    )
      break;
    week();
    const prepared = prepareNextShippedPostseasonGame(session);
    if (!prepared.ok) throw new Error(prepared.reason);
    const next = completeShippedPostseasonRound(playPreparedGame(prepared.session));
    if (!next.ok) throw new Error(next.reason);
    session = acceptBreakthrough(next.session);
  }
  const review = enterWrTwoSeasonReviewV8(migrateCareerSessionV7ToV8(session));
  if (!review.ok) throw new Error(review.reason);
  const completed = completeWrTwoSeasonCareerV8(review.session, 1);
  if (!completed.ok) throw new Error(completed.reason);
  return {
    reviewSession: review.session,
    completedSession: completed.session,
    alumni: completed.alumni,
  };
}

export function createNilDecisionFixtures(): NilDecisionFixtures {
  for (let candidate = 0; candidate < 128; candidate += 1) {
    const bootstrapped = bootstrapShippedSeason(
      createPendingSeasonFixture(`season-ui-nil-${candidate}`),
    );
    if (!bootstrapped.ok) throw new Error(bootstrapped.reason);
    const activated = bootstrapShippedOffFieldSystems(bootstrapped.session);
    if (!activated.ok) throw new Error(activated.reason);
    const marketable = withCareer(activated.session, {
      ...activated.session.career,
      player: {
        ...activated.session.career.player,
        state: { ...activated.session.career.player.state, brand: 20 },
      },
    });
    const ready = resolveDevelopmentWeek(marketable);
    const settled = settleShippedCompletedWeekOffField(ready);
    if (!settled.ok) throw new Error(settled.reason);
    const boundary = processEventAndInjury(settled.session);
    const attempted = attemptShippedWeeklyNilOffer(boundary);
    if (!attempted.ok) throw new Error(attempted.reason);
    const advanced = advanceShippedCampRound(attempted.session);
    if (!advanced.ok) throw new Error(advanced.reason);
    const offerSession = acceptBreakthrough(advanced.session);
    const nil = offerSession.career.offFieldCareerState.nil;
    if (!('bootstrapStatus' in nil) || nil.pendingOffers.length === 0) continue;
    const accepted = decideShippedNilOffer(offerSession, nil.pendingOffers[0]!.offerId, 'ACCEPT');
    if (!accepted.ok) throw new Error(accepted.reason);
    return { obligationSession: accepted.session, offerSession };
  }
  throw new Error('Unable to find deterministic NIL UI fixtures.');
}

export function createSeasonDecisionFixtures(): SeasonDecisionFixtures {
  let eventSession: CareerSession | null = null;
  let injurySession: CareerSession | null = null;
  for (let candidate = 0; candidate < 512; candidate += 1) {
    const bootstrapped = bootstrapShippedSeason(
      createPendingSeasonFixture(`season-ui-decision-${candidate}`),
    );
    if (!bootstrapped.ok) throw new Error(bootstrapped.reason);
    const ready = resolveDevelopmentWeek(bootstrapped.session);
    const selected = selectShippedWeeklyEvent(ready);
    if (!selected.ok) throw new Error(selected.reason);
    let current = selected.session;
    if (current.career.phase.type === 'EVENT_CHOICE') {
      eventSession ??= current;
      const resolved = resolveShippedEventChoice(
        current,
        current.career.phase.pendingEvent.choiceIds[0]!,
      );
      if (!resolved.ok) throw new Error(resolved.reason);
      current = resolved.session;
    }
    const assessed = assessShippedWeeklyInjury(current);
    if (!assessed.ok) throw new Error(assessed.reason);
    if (assessed.session.career.phase.type === 'INJURY_CHOICE') {
      injurySession ??= assessed.session;
    }
    if (eventSession !== null && injurySession !== null) {
      return { eventSession, injurySession };
    }
  }
  throw new Error('Unable to find deterministic event and injury UI fixtures.');
}
