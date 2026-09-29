import {
  advanceShippedCampRound,
  assessShippedWeeklyInjury,
  attemptShippedWeeklyNilOffer,
  bootstrapShippedNextSeason,
  bootstrapShippedOffFieldSystems,
  bootstrapShippedSeason,
  completeShippedPostseasonRound,
  completeShippedRegularSeasonRound,
  decideShippedNilOffer,
  decideShippedOffseason,
  enterShippedSeasonReview,
  initializeShippedPostseason,
  keySnapPatternMechanicsDefinitions,
  offenseStyleMechanicsDefinitions,
  prepareNextShippedPostseasonGame,
  prepareNextShippedSeasonGame,
  prepareShippedOffFieldPlanningBoundary,
  programMechanicsDefinitions,
  projectShippedOffseason,
  recruitingMechanicsConfig,
  resolveShippedEventChoice,
  resolveShippedInjuryChoice,
  resolveShippedKeySnap,
  resolveShippedNilObligation,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
  seasonMechanicsDefinition,
  selectShippedWeeklyEvent,
  settleShippedCompletedWeekOffField,
  skillMechanicsDefinitions,
  startShippedGame,
} from '@project-saturday/game-content/content';
import {
  beginRecruiting,
  chooseSkillBreakthrough,
  commitProgramChoice,
  createCareerSession,
  parseCareerRun,
  parseCareerSession,
  validateCareerSession,
  type AcademicCheckpointEvidenceV1,
  type CareerRun,
  type CareerSession,
  type CompletedGameSummary,
  type CompletedSeasonSummary,
  type DepthRoleId,
  type KeySnapDecisionId,
  type NilHistoryEvidenceV1,
  type OffseasonCoachChangeId,
  type ProgramId,
  type ProgramStrengthBandId,
  type RecruitTierId,
  type RelationshipActorId,
  type RelationshipTrackV1,
  type RngState,
  type SeasonStageId,
  type SkillFamilyId,
} from '@project-saturday/game-core';

import { createWrCareerFixture, type WrCareerFixtureOptions } from './wr-career.js';
import {
  completeCurrentProgramPracticeWeek,
  type CurrentProgramWeeklyActionPlan,
  type GameDecisionStrategyId,
} from './wr-game-career.js';
import type {
  SeasonEventChoicePolicy,
  SeasonInjuryChoicePolicy,
  SeasonProgramSelectionPolicy,
  SeasonSkillChoicePolicy,
} from './wr-season-career.js';

export type OffFieldCareerSerializationMode = 'none' | 'every_transition';
export type NilDecisionPolicy = 'accept_default' | 'accept_fulfill' | 'decline';
export type OffseasonChoicePolicy = 'first_transfer' | 'stay';
export type M6ProfileOperationId =
  | 'weekly_boundary'
  | 'world_round'
  | 'offseason_projection'
  | 'offseason_decision'
  | 'next_season_bootstrap';

export interface M6OperationProfileSample {
  readonly operationId: M6ProfileOperationId;
  readonly stage: string;
  readonly elapsedMs: number;
}

export interface ExecuteWrOffFieldCareerInput {
  readonly scenarioId: string;
  readonly fixture: WrCareerFixtureOptions;
  readonly actionPlan: CurrentProgramWeeklyActionPlan;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly eventChoicePolicy: SeasonEventChoicePolicy;
  readonly injuryChoicePolicy: SeasonInjuryChoicePolicy;
  readonly preferredSkillFamilyIds: readonly SkillFamilyId[];
  readonly skillChoicePolicy: SeasonSkillChoicePolicy;
  readonly programSelectionPolicy: SeasonProgramSelectionPolicy;
  readonly nilDecisionPolicy: NilDecisionPolicy;
  readonly offseasonChoicePolicy: OffseasonChoicePolicy;
  readonly serializationMode?: OffFieldCareerSerializationMode;
  readonly operationObserver?: (sample: M6OperationProfileSample) => void;
}

export interface WrOffFieldWeekTrace {
  readonly seasonIndex: 0 | 1;
  readonly stageId: SeasonStageId;
  readonly stageRoundNumber: number;
  readonly weekIndex: number;
  readonly roleId: DepthRoleId;
  readonly academicStatusId: string;
  readonly relationshipTracks: readonly RelationshipTrackV1[];
  readonly gameSummary: CompletedGameSummary | null;
}

export interface ExecutedWrOffFieldCareer {
  readonly scenarioId: string;
  readonly recruitTierId: RecruitTierId;
  readonly initialProgramId: ProgramId;
  readonly initialProgramStrengthBandId: ProgramStrengthBandId;
  readonly initialRoleId: DepthRoleId;
  readonly selectedProgramId: ProgramId;
  readonly selectedProgramStrengthBandId: ProgramStrengthBandId;
  readonly offseasonChoicePolicy: OffseasonChoicePolicy;
  readonly coachChangeId: OffseasonCoachChangeId;
  readonly schemeChanged: boolean;
  readonly projectedNextRoleId: DepthRoleId;
  readonly actualNextRoleId: DepthRoleId;
  readonly completedSeason: CompletedSeasonSummary;
  readonly academicCheckpoints: readonly AcademicCheckpointEvidenceV1[];
  readonly relationshipTracksBeforeSeason: readonly RelationshipTrackV1[];
  readonly relationshipTracksAtDecision: readonly RelationshipTrackV1[];
  readonly relationshipTracksAfterOpeningGame: readonly RelationshipTrackV1[];
  readonly nilHistory: readonly NilHistoryEvidenceV1[];
  readonly fictionalFundsUsd: number;
  readonly openingGame: CompletedGameSummary;
  readonly worldCoachChangeIds: readonly OffseasonCoachChangeId[];
  readonly session: CareerSession;
  readonly careerRng: RngState;
  readonly worldRng: RngState;
  readonly totalRoundTripCount: number;
  readonly allRoundTripsEquivalent: true;
  readonly weeks: readonly WrOffFieldWeekTrace[];
}

export class WrOffFieldCareerBuilderError extends Error {
  public readonly scenarioId: string;
  public readonly stage: string;

  public constructor(scenarioId: string, stage: string, reason: string) {
    super(`scenario=${JSON.stringify(scenarioId)} stage=${stage} reason=${reason}`);
    this.name = 'WrOffFieldCareerBuilderError';
    this.scenarioId = scenarioId;
    this.stage = stage;
  }
}

function fail(scenarioId: string, stage: string, reason: string): never {
  throw new WrOffFieldCareerBuilderError(scenarioId, stage, reason);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function roundTripCareer(career: CareerRun, scenarioId: string, stage: string): CareerRun {
  const serialized = JSON.stringify(career);
  const parsed = parseCareerRun(serialized);
  if (!parsed.ok) return fail(scenarioId, stage, parsed.reason);
  if (JSON.stringify(parsed.career) !== serialized) fail(scenarioId, stage, 'round_trip_diverged');
  return parsed.career;
}

function roundTripSession(
  session: CareerSession,
  scenarioId: string,
  stage: string,
): CareerSession {
  const serialized = JSON.stringify(session);
  const parsed = parseCareerSession(serialized);
  if (!parsed.ok) return fail(scenarioId, stage, parsed.reason);
  if (JSON.stringify(parsed.session) !== serialized) fail(scenarioId, stage, 'round_trip_diverged');
  return parsed.session;
}

function programTeamRating(programId: ProgramId): number {
  return (
    seasonMechanicsDefinition.programProfiles.find(({ programId: id }) => id === programId)
      ?.teamRating ?? -1
  );
}

function chooseProgram(career: CareerRun, policy: SeasonProgramSelectionPolicy): ProgramId {
  if (career.recruitingState.type !== 'CHOOSING') throw new TypeError('Missing shortlist.');
  const offeredIds = career.recruitingState.offers.map(({ programId }) => programId);
  if (policy === 'first_offer') return offeredIds[0]!;
  return [...offeredIds].sort((left, right) => {
    const ratingOrder = programTeamRating(left) - programTeamRating(right);
    const directed = policy === 'strongest_offer' ? -ratingOrder : ratingOrder;
    return directed === 0 ? compareCodeUnits(left, right) : directed;
  })[0]!;
}

function chooseSkill(career: CareerRun, input: ExecuteWrOffFieldCareerInput): CareerRun {
  if (career.phase.type !== 'SKILL_BREAKTHROUGH') return career;
  const offeredIds = career.phase.offer.offeredSkillIds;
  let selectedId = offeredIds[0]!;
  if (input.skillChoicePolicy === 'preferred_family') {
    for (const familyId of input.preferredSkillFamilyIds) {
      const matching = offeredIds.find(
        (skillId) =>
          skillMechanicsDefinitions.find(({ id }) => id === skillId)?.familyId === familyId,
      );
      if (matching !== undefined) {
        selectedId = matching;
        break;
      }
    }
  }
  const selected = chooseSkillBreakthrough(career, selectedId);
  if (!selected.ok) return fail(input.scenarioId, 'choose_skill', selected.reason);
  return selected.career;
}

function activeRelationships(
  session: CareerSession,
  stage: string,
): readonly RelationshipTrackV1[] {
  const relationships = session.career.offFieldCareerState.relationships;
  if (relationships.bootstrapStatus !== 'ACTIVE') throw new TypeError(`Missing ${stage}.`);
  return relationships.tracks;
}

function activeAcademics(session: CareerSession, stage: string) {
  const academics = session.career.offFieldCareerState.academics;
  if (academics.bootstrapStatus !== 'ACTIVE') throw new TypeError(`Missing ${stage}.`);
  return academics;
}

function activeNil(session: CareerSession, stage: string) {
  const nil = session.career.offFieldCareerState.nil;
  if (!('bootstrapStatus' in nil) || nil.bootstrapStatus !== 'ACTIVE') {
    throw new TypeError(`Missing ${stage}.`);
  }
  return nil;
}

export function executeWrOffFieldCareer(
  input: ExecuteWrOffFieldCareerInput,
): ExecutedWrOffFieldCareer {
  const observeOperation = <Result>(
    operationId: M6ProfileOperationId,
    stage: string,
    operation: () => Result,
  ): Result => {
    if (input.operationObserver === undefined) return operation();
    const startedAt = performance.now();
    try {
      return operation();
    } finally {
      input.operationObserver({
        operationId,
        stage,
        elapsedMs: performance.now() - startedAt,
      });
    }
  };
  let totalRoundTripCount = 0;
  const reloadCareer = (career: CareerRun, stage: string): CareerRun => {
    if (input.serializationMode !== 'every_transition') return career;
    totalRoundTripCount += 1;
    return roundTripCareer(career, input.scenarioId, stage);
  };
  const reloadSession = (session: CareerSession, stage: string): CareerSession => {
    if (input.serializationMode !== 'every_transition') return session;
    totalRoundTripCount += 1;
    return roundTripSession(session, input.scenarioId, stage);
  };
  const adoptCareer = (session: CareerSession, career: CareerRun, stage: string): CareerSession => {
    const next = { ...session, career };
    if (!validateCareerSession(next).ok) return fail(input.scenarioId, stage, 'invalid_session');
    return reloadSession(next, stage);
  };

  let career = createWrCareerFixture(input.fixture);
  const recruiting = beginRecruiting(
    career,
    recruitingMechanicsConfig,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
  );
  if (!recruiting.ok) return fail(input.scenarioId, 'begin_recruiting', recruiting.reason);
  career = reloadCareer(recruiting.career, 'reload_after_recruiting');
  const initialProgramId = chooseProgram(career, input.programSelectionPolicy);
  const committed = commitProgramChoice(
    career,
    initialProgramId,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
    rotationPolicyMechanicsDefinitions,
    rosterNameMechanicsPool,
  );
  if (!committed.ok) return fail(input.scenarioId, 'commit_program', committed.reason);
  career = reloadCareer(committed.career, 'reload_after_program_commitment');
  if (career.recruitingState.type !== 'COMMITTED' || career.programContext === null) {
    return fail(input.scenarioId, 'commit_program', 'missing_committed_state');
  }
  const recruitTierId = career.recruitingState.recruitTierId;
  const initialRoleId = career.programContext.projection.roleId;
  const initialProgram = programMechanicsDefinitions.find(({ id }) => id === initialProgramId);
  if (initialProgram === undefined) return fail(input.scenarioId, 'program', 'missing_program');

  let session = reloadSession(createCareerSession(career), 'reload_after_session_creation');
  const bootstrapped = bootstrapShippedSeason(session);
  if (!bootstrapped.ok) return fail(input.scenarioId, 'bootstrap_season', bootstrapped.reason);
  session = reloadSession(bootstrapped.session, 'reload_after_season_bootstrap');
  const offField = bootstrapShippedOffFieldSystems(session);
  if (!offField.ok) return fail(input.scenarioId, 'bootstrap_off_field', offField.reason);
  session = reloadSession(offField.session, 'reload_after_off_field_bootstrap');
  const relationshipTracksBeforeSeason = activeRelationships(session, 'initial relationships');
  const weeks: WrOffFieldWeekTrace[] = [];

  const preparePlanning = (stage: string): void => {
    const prepared = prepareShippedOffFieldPlanningBoundary(session);
    if (!prepared.ok) return fail(input.scenarioId, stage, prepared.reason);
    session = reloadSession(prepared.session, `${stage}_prepared`);
    let nil = activeNil(session, stage);
    if (
      nil.activeObligation !== null &&
      nil.activeObligation.lastResolvedWeekIndex !== session.career.weekIndex
    ) {
      const resolutionId = input.nilDecisionPolicy === 'accept_default' ? 'DEFAULT' : 'FULFILL';
      const resolved = resolveShippedNilObligation(session, resolutionId);
      if (!resolved.ok) return fail(input.scenarioId, `${stage}_obligation`, resolved.reason);
      session = reloadSession(resolved.session, `${stage}_obligation_reloaded`);
      nil = activeNil(session, stage);
    }
    const pending = nil.pendingOffers[0];
    if (pending !== undefined) {
      const decisionId = input.nilDecisionPolicy === 'decline' ? 'DECLINE' : 'ACCEPT';
      const decided = decideShippedNilOffer(session, pending.offerId, decisionId);
      if (!decided.ok) return fail(input.scenarioId, `${stage}_offer`, decided.reason);
      session = reloadSession(decided.session, `${stage}_offer_reloaded`);
      nil = activeNil(session, stage);
      if (
        nil.activeObligation !== null &&
        nil.activeObligation.lastResolvedWeekIndex !== session.career.weekIndex
      ) {
        const resolutionId = input.nilDecisionPolicy === 'accept_default' ? 'DEFAULT' : 'FULFILL';
        const resolved = resolveShippedNilObligation(session, resolutionId);
        if (!resolved.ok) return fail(input.scenarioId, `${stage}_new_obligation`, resolved.reason);
        session = reloadSession(resolved.session, `${stage}_new_obligation_reloaded`);
      }
    }
  };

  const acceptBreakthrough = (stage: string): void => {
    if (session.career.phase.type !== 'SKILL_BREAKTHROUGH') return;
    session = adoptCareer(session, chooseSkill(session.career, input), `${stage}_skill_reloaded`);
  };

  const completeWeeklyBoundary = (stage: string, attemptNil: boolean): void =>
    observeOperation('weekly_boundary', stage, () => {
      preparePlanning(`${stage}_planning`);
      const practice = completeCurrentProgramPracticeWeek({
        actionPlan: input.actionPlan,
        career: session.career,
        scenarioId: `${input.scenarioId}:${stage}`,
        ...(input.serializationMode === undefined
          ? {}
          : { serializationMode: input.serializationMode }),
      });
      totalRoundTripCount += practice.roundTripCount;
      session = adoptCareer(session, practice.career, `${stage}_practice_reloaded`);
      const settled = settleShippedCompletedWeekOffField(session);
      if (!settled.ok) return fail(input.scenarioId, `${stage}_off_field`, settled.reason);
      session = reloadSession(settled.session, `${stage}_off_field_reloaded`);
      const selectedEvent = selectShippedWeeklyEvent(session);
      if (!selectedEvent.ok) return fail(input.scenarioId, `${stage}_event`, selectedEvent.reason);
      session = reloadSession(selectedEvent.session, `${stage}_event_reloaded`);
      if (session.career.phase.type === 'EVENT_CHOICE') {
        const choiceIndex =
          input.eventChoicePolicy === 'second' ||
          (input.eventChoicePolicy === 'alternate' && weeks.length % 2 === 1)
            ? 1
            : 0;
        const eventChoice = resolveShippedEventChoice(
          session,
          session.career.phase.pendingEvent.choiceIds[choiceIndex]!,
        );
        if (!eventChoice.ok)
          return fail(input.scenarioId, `${stage}_event_choice`, eventChoice.reason);
        session = reloadSession(eventChoice.session, `${stage}_event_choice_reloaded`);
      }
      const injury = assessShippedWeeklyInjury(session);
      if (!injury.ok) return fail(input.scenarioId, `${stage}_injury`, injury.reason);
      session = reloadSession(injury.session, `${stage}_injury_reloaded`);
      if (session.career.phase.type === 'INJURY_CHOICE') {
        const injuryChoiceId =
          input.injuryChoicePolicy === 'rest'
            ? 'injury_choice_rest_rehab'
            : 'injury_choice_play_limited';
        const injuryChoice = resolveShippedInjuryChoice(session, injuryChoiceId);
        if (!injuryChoice.ok) {
          return fail(input.scenarioId, `${stage}_injury_choice`, injuryChoice.reason);
        }
        session = reloadSession(injuryChoice.session, `${stage}_injury_choice_reloaded`);
      }
      if (attemptNil) {
        const attempted = attemptShippedWeeklyNilOffer(session);
        if (!attempted.ok) return fail(input.scenarioId, `${stage}_nil_offer`, attempted.reason);
        session = reloadSession(attempted.session, `${stage}_nil_offer_reloaded`);
      }
    });

  const pushTrace = (
    seasonIndex: 0 | 1,
    stageId: SeasonStageId,
    stageRoundNumber: number,
    gameSummary: CompletedGameSummary | null,
  ): void => {
    const academics = activeAcademics(session, 'week trace academics');
    const context = session.career.programContext;
    if (context === null) return fail(input.scenarioId, 'week_trace', 'missing_program_context');
    weeks.push(
      Object.freeze({
        seasonIndex,
        stageId,
        stageRoundNumber,
        weekIndex: session.career.weekIndex,
        roleId: context.projection.roleId,
        academicStatusId: academics.eligibilityStatus,
        relationshipTracks: activeRelationships(session, 'week trace relationships'),
        gameSummary,
      }),
    );
  };

  const playPreparedCareer = (stage: string): CompletedGameSummary => {
    const started = startShippedGame(session.career);
    if (!started.ok) return fail(input.scenarioId, `${stage}_start`, started.reason);
    let gameCareer = reloadCareer(started.career, `${stage}_start_reloaded`);
    while (gameCareer.phase.type === 'KEY_SNAP') {
      const pending = gameCareer.phase.pendingSnap;
      let decisionId: KeySnapDecisionId;
      if (input.decisionStrategyId === 'first_presented') {
        decisionId = pending.decisionIds[0];
      } else if (input.decisionStrategyId === 'risk_seeking') {
        const riskChoiceByFamily = {
          key_snap_family_release: 'key_snap_decision_speed_release',
          key_snap_family_route: 'key_snap_decision_stack_defender',
          key_snap_family_catch: 'key_snap_decision_attack_high_point',
          key_snap_family_yac: 'key_snap_decision_burst_upfield',
        } as const;
        decisionId = riskChoiceByFamily[pending.familyId];
      } else {
        const pattern = keySnapPatternMechanicsDefinitions.find(
          ({ id }) => id === pending.patternId,
        );
        if (pattern === undefined) return fail(input.scenarioId, stage, 'missing_pattern');
        decisionId = [...pattern.decisionFits].sort((left, right) => {
          const fitOrder = right.fit - left.fit;
          return fitOrder === 0 ? compareCodeUnits(left.decisionId, right.decisionId) : fitOrder;
        })[0]!.decisionId;
      }
      const resolved = resolveShippedKeySnap(gameCareer, decisionId);
      if (!resolved.ok) return fail(input.scenarioId, `${stage}_snap`, resolved.reason);
      gameCareer = reloadCareer(resolved.career, `${stage}_snap_reloaded`);
    }
    if (gameCareer.phase.type !== 'POST_GAME') {
      return fail(input.scenarioId, `${stage}_finish`, 'missing_post_game');
    }
    const summary = gameCareer.phase.summary;
    session = adoptCareer(session, gameCareer, `${stage}_game_reloaded`);
    return summary;
  };

  const playRegularGame = (stage: string): CompletedGameSummary => {
    const prepared = prepareNextShippedSeasonGame(session);
    if (!prepared.ok) return fail(input.scenarioId, `${stage}_prepare`, prepared.reason);
    session = reloadSession(prepared.session, `${stage}_preview_reloaded`);
    const summary = playPreparedCareer(stage);
    const completed = observeOperation('world_round', stage, () =>
      completeShippedRegularSeasonRound(session),
    );
    if (!completed.ok) return fail(input.scenarioId, `${stage}_complete`, completed.reason);
    session = reloadSession(completed.session, `${stage}_complete_reloaded`);
    acceptBreakthrough(stage);
    return summary;
  };

  const playPostseasonGame = (stage: string): CompletedGameSummary => {
    const prepared = prepareNextShippedPostseasonGame(session);
    if (!prepared.ok) return fail(input.scenarioId, `${stage}_prepare`, prepared.reason);
    session = reloadSession(prepared.session, `${stage}_preview_reloaded`);
    const summary = playPreparedCareer(stage);
    const completed = observeOperation('world_round', stage, () =>
      completeShippedPostseasonRound(session),
    );
    if (!completed.ok) return fail(input.scenarioId, `${stage}_complete`, completed.reason);
    session = reloadSession(completed.session, `${stage}_complete_reloaded`);
    acceptBreakthrough(stage);
    return summary;
  };

  for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
    const stage = `season_one_camp_${roundIndex + 1}`;
    completeWeeklyBoundary(stage, true);
    const advanced = observeOperation('world_round', stage, () => advanceShippedCampRound(session));
    if (!advanced.ok) return fail(input.scenarioId, stage, advanced.reason);
    session = reloadSession(advanced.session, `${stage}_advanced_reloaded`);
    acceptBreakthrough(stage);
    pushTrace(0, 'CAMP', roundIndex + 1, null);
  }
  for (let roundIndex = 0; roundIndex < 12; roundIndex += 1) {
    const stage = `season_one_regular_${roundIndex + 1}`;
    completeWeeklyBoundary(stage, roundIndex < 9);
    const summary = playRegularGame(stage);
    pushTrace(0, 'REGULAR_SEASON', roundIndex + 1, summary);
  }
  preparePlanning('pre_postseason_planning');
  const initialized = initializeShippedPostseason(session);
  if (!initialized.ok) return fail(input.scenarioId, 'initialize_postseason', initialized.reason);
  session = reloadSession(initialized.session, 'reload_after_postseason_initialization');
  let postseasonRoundNumber = 1;
  while (
    session.world.calendar.type === 'ACTIVE' &&
    session.world.calendar.postseason.type === 'ACTIVE'
  ) {
    const stage = `season_one_postseason_${postseasonRoundNumber}`;
    completeWeeklyBoundary(stage, false);
    const summary = playPostseasonGame(stage);
    pushTrace(0, 'POSTSEASON', postseasonRoundNumber, summary);
    postseasonRoundNumber += 1;
  }
  preparePlanning('pre_review_planning');
  const reviewed = enterShippedSeasonReview(session);
  if (!reviewed.ok) return fail(input.scenarioId, 'enter_review', reviewed.reason);
  session = reloadSession(reviewed.session, 'reload_after_review');
  const relationshipTracksAtDecision = activeRelationships(session, 'decision relationships');
  const academicCheckpoints = activeAcademics(session, 'completed academics').checkpointHistory;

  const projected = observeOperation('offseason_projection', 'project_offseason', () =>
    projectShippedOffseason(session),
  );
  if (!projected.ok) return fail(input.scenarioId, 'project_offseason', projected.reason);
  session = reloadSession(projected.session, 'reload_after_offseason_projection');
  if (session.career.seasonCareerState.bootstrapStatus !== 'COMPLETE') {
    return fail(input.scenarioId, 'project_offseason', 'missing_completed_summary');
  }
  const completedSeason = session.career.seasonCareerState.lastCompletedSeason;
  const offseason = session.career.offFieldCareerState.offseason;
  if (offseason.status !== 'PROJECTED') {
    return fail(input.scenarioId, 'project_offseason', 'missing_projection');
  }
  const selectedProgramId =
    input.offseasonChoicePolicy === 'stay'
      ? initialProgramId
      : offseason.transferProjection.transferOptions[0].programId;
  const decided = observeOperation('offseason_decision', 'decide_offseason', () =>
    decideShippedOffseason(session, selectedProgramId),
  );
  if (!decided.ok) return fail(input.scenarioId, 'decide_offseason', decided.reason);
  session = reloadSession(decided.session, 'reload_after_offseason_decision');
  const decidedOffseason = session.career.offFieldCareerState.offseason;
  if (decidedOffseason.status !== 'DECIDED' || decidedOffseason.lastDecision === null) {
    return fail(input.scenarioId, 'decide_offseason', 'missing_decision');
  }
  const decision = decidedOffseason.lastDecision;
  const selectedProgram = programMechanicsDefinitions.find(({ id }) => id === selectedProgramId);
  if (selectedProgram === undefined) {
    return fail(input.scenarioId, 'decide_offseason', 'missing_selected_program');
  }
  const worldCoachChangeIds = decidedOffseason.worldProjection.programs.map(
    ({ coachChangeId }) => coachChangeId,
  );
  const nextSeason = observeOperation('next_season_bootstrap', 'bootstrap_next_season', () =>
    bootstrapShippedNextSeason(session),
  );
  if (!nextSeason.ok) return fail(input.scenarioId, 'bootstrap_next_season', nextSeason.reason);
  session = reloadSession(nextSeason.session, 'reload_after_next_season_bootstrap');

  for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
    const stage = `season_two_camp_${roundIndex + 1}`;
    completeWeeklyBoundary(stage, false);
    const advanced = observeOperation('world_round', stage, () => advanceShippedCampRound(session));
    if (!advanced.ok) return fail(input.scenarioId, stage, advanced.reason);
    session = reloadSession(advanced.session, `${stage}_advanced_reloaded`);
    acceptBreakthrough(stage);
    pushTrace(1, 'CAMP', roundIndex + 1, null);
  }
  completeWeeklyBoundary('season_two_regular_1', false);
  const openingGame = playRegularGame('season_two_regular_1');
  pushTrace(1, 'REGULAR_SEASON', 1, openingGame);

  const finalNil = activeNil(session, 'final NIL');
  const relationshipTracksAfterOpeningGame = activeRelationships(
    session,
    'opening-game relationships',
  );
  const coachChange = decidedOffseason.worldProjection.programs.find(
    ({ programId }) => programId === selectedProgramId,
  );
  if (coachChange === undefined) {
    return fail(input.scenarioId, 'finalize', 'missing_coach_change');
  }
  return Object.freeze({
    scenarioId: input.scenarioId,
    recruitTierId,
    initialProgramId,
    initialProgramStrengthBandId: initialProgram.strengthBandId,
    initialRoleId,
    selectedProgramId,
    selectedProgramStrengthBandId: selectedProgram.strengthBandId,
    offseasonChoicePolicy: input.offseasonChoicePolicy,
    coachChangeId: decision.coachChangeId,
    schemeChanged: decision.offenseStyleIdBefore !== decision.offenseStyleIdAfter,
    projectedNextRoleId: decision.selectedOption.projectedRoleId,
    actualNextRoleId: decision.actualRoleId,
    completedSeason,
    academicCheckpoints,
    relationshipTracksBeforeSeason,
    relationshipTracksAtDecision,
    relationshipTracksAfterOpeningGame,
    nilHistory: finalNil.history,
    fictionalFundsUsd: finalNil.fictionalFundsUsd,
    openingGame,
    worldCoachChangeIds,
    session,
    careerRng: session.career.rng,
    worldRng: session.world.rng,
    totalRoundTripCount,
    allRoundTripsEquivalent: true,
    weeks: Object.freeze(weeks),
  });
}

export function relationshipTrackValue(
  tracks: readonly RelationshipTrackV1[],
  actorId: RelationshipActorId,
): number {
  return tracks.find(({ actorId: id }) => id === actorId)?.value ?? 0;
}
