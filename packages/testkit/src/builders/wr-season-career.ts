import {
  advanceShippedCampRound,
  assessShippedWeeklyInjury,
  bootstrapShippedSeason,
  completeShippedCareer,
  completeShippedPostseasonRound,
  completeShippedRegularSeasonRound,
  deriveShippedLegacyVisibility,
  developmentWeekConfig,
  enterShippedSeasonReview,
  initializeShippedPostseason,
  keySnapPatternMechanicsDefinitions,
  offenseStyleMechanicsDefinitions,
  prepareNextShippedPostseasonGame,
  prepareNextShippedSeasonGame,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  resolveShippedEventChoice,
  resolveShippedInjuryChoice,
  resolveShippedKeySnap,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
  seasonMechanicsDefinition,
  selectShippedWeeklyEvent,
  skillMechanicsDefinitions,
  startShippedGame,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';
import {
  beginRecruiting,
  chooseSkillBreakthrough,
  commitProgramChoice,
  commitWeeklyActionPlan,
  createCareerSession,
  createEmptyMetaProfile,
  parseCareerRun,
  parseCareerSession,
  parseMetaProfile,
  resolveNextWeeklyAction,
  validateCareerSession,
  type AlumniRecordV1,
  type CareerRun,
  type CareerSession,
  type CompletedGameSummary,
  type CompletedSeasonSummary,
  type DepthRoleId,
  type EventChoiceId,
  type EventId,
  type InjuryAvailabilityId,
  type InjuryChoiceId,
  type InjuryOutcomeId,
  type KeySnapDecisionId,
  type LegacyVisibilityV1,
  type MetaProfileV1,
  type ProgramId,
  type ProgramStrengthBandId,
  type RecruitTierId,
  type RngState,
  type SeasonStageId,
  type SkillFamilyId,
  type SkillId,
  type WeeklyActionId,
} from '@project-saturday/game-core';

import { createWrCareerFixture, type WrCareerFixtureOptions } from './wr-career.js';
import type { CurrentProgramWeeklyActionPlan, GameDecisionStrategyId } from './wr-game-career.js';

export type SeasonCareerSerializationMode = 'none' | 'every_transition';
export type SeasonProgramSelectionPolicy = 'first_offer' | 'strongest_offer' | 'weakest_offer';
export type SeasonEventChoicePolicy = 'first' | 'second' | 'alternate';
export type SeasonInjuryChoicePolicy = 'rest' | 'play_limited';
export type SeasonSkillChoicePolicy = 'preferred_family' | 'first_offered';

export interface ExecuteWrSeasonCareerInput {
  readonly scenarioId: string;
  readonly fixture: WrCareerFixtureOptions;
  readonly actionPlan: CurrentProgramWeeklyActionPlan;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly eventChoicePolicy: SeasonEventChoicePolicy;
  readonly injuryChoicePolicy: SeasonInjuryChoicePolicy;
  readonly preferredSkillFamilyIds: readonly SkillFamilyId[];
  readonly skillChoicePolicy: SeasonSkillChoicePolicy;
  readonly programSelectionPolicy: SeasonProgramSelectionPolicy;
  readonly selectedProgramId?: ProgramId;
  readonly serializationMode?: SeasonCareerSerializationMode;
}

export interface WrSeasonWeekTrace {
  readonly sequenceNumber: number;
  readonly stageId: SeasonStageId;
  readonly stageRoundNumber: number;
  readonly actionPlan: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
  readonly eventId: EventId | null;
  readonly eventChoiceId: EventChoiceId | null;
  readonly injuryOutcomeId: InjuryOutcomeId | null;
  readonly injuryChoiceId: InjuryChoiceId | null;
  readonly injuryAvailabilityId: InjuryAvailabilityId;
  readonly roleIdBefore: DepthRoleId;
  readonly roleIdAfter: DepthRoleId;
  readonly gameSummary: CompletedGameSummary | null;
  readonly selectedSkillId: SkillId | null;
  readonly roundTripCount: number;
}

export interface ExecutedWrSeasonCareer {
  readonly scenarioId: string;
  readonly selectedProgramId: ProgramId;
  readonly recruitTierId: RecruitTierId;
  readonly programStrengthBandId: ProgramStrengthBandId;
  readonly initialRoleId: DepthRoleId;
  readonly finalRoleId: DepthRoleId;
  readonly qualifiedForPostseason: boolean;
  readonly seasonSummary: CompletedSeasonSummary;
  readonly alumni: AlumniRecordV1;
  readonly legacyVisibility: LegacyVisibilityV1;
  readonly session: CareerSession;
  readonly meta: MetaProfileV1;
  readonly weeks: readonly WrSeasonWeekTrace[];
  readonly careerRng: RngState;
  readonly worldRng: RngState;
  readonly totalRoundTripCount: number;
  readonly allRoundTripsEquivalent: true;
}

export class WrSeasonCareerBuilderError extends Error {
  public readonly scenarioId: string;
  public readonly stage: string;

  public constructor(scenarioId: string, stage: string, reason: string) {
    super(`scenario=${JSON.stringify(scenarioId)} stage=${stage} reason=${reason}`);
    this.name = 'WrSeasonCareerBuilderError';
    this.scenarioId = scenarioId;
    this.stage = stage;
  }
}

interface BoundaryTrace {
  readonly session: CareerSession;
  readonly eventId: EventId | null;
  readonly eventChoiceId: EventChoiceId | null;
  readonly injuryOutcomeId: InjuryOutcomeId | null;
  readonly injuryChoiceId: InjuryChoiceId | null;
  readonly injuryAvailabilityId: InjuryAvailabilityId;
  readonly roundTripCount: number;
}

function fail(scenarioId: string, stage: string, reason: string): never {
  throw new WrSeasonCareerBuilderError(scenarioId, stage, reason);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function roundTripSession(
  session: CareerSession,
  scenarioId: string,
  stage: string,
): CareerSession {
  const serialized = JSON.stringify(session);
  const parsed = parseCareerSession(serialized);
  if (!parsed.ok) return fail(scenarioId, stage, parsed.reason);
  if (JSON.stringify(parsed.session) !== serialized) {
    return fail(scenarioId, stage, 'round_trip_diverged');
  }
  return parsed.session;
}

function roundTripCareer(career: CareerRun, scenarioId: string, stage: string): CareerRun {
  const serialized = JSON.stringify(career);
  const parsed = parseCareerRun(serialized);
  if (!parsed.ok) return fail(scenarioId, stage, parsed.reason);
  if (JSON.stringify(parsed.career) !== serialized) {
    return fail(scenarioId, stage, 'round_trip_diverged');
  }
  return parsed.career;
}

function roundTripMeta(meta: MetaProfileV1, scenarioId: string, stage: string): MetaProfileV1 {
  const serialized = JSON.stringify(meta);
  const parsed = parseMetaProfile(serialized);
  if (!parsed.ok) return fail(scenarioId, stage, parsed.reason);
  if (JSON.stringify(parsed.meta) !== serialized) {
    return fail(scenarioId, stage, 'round_trip_diverged');
  }
  return parsed.meta;
}

function maybeRoundTripSession(
  session: CareerSession,
  input: ExecuteWrSeasonCareerInput,
  stage: string,
): CareerSession {
  return input.serializationMode === 'every_transition'
    ? roundTripSession(session, input.scenarioId, stage)
    : session;
}

function withCareer(
  session: CareerSession,
  career: CareerRun,
  input: ExecuteWrSeasonCareerInput,
  stage: string,
): CareerSession {
  const next = { ...session, career };
  if (!validateCareerSession(next).ok) return fail(input.scenarioId, stage, 'invalid_session');
  return maybeRoundTripSession(next, input, stage);
}

function roundTripIncrement(input: ExecuteWrSeasonCareerInput): number {
  return input.serializationMode === 'every_transition' ? 1 : 0;
}

function programTeamRating(programId: ProgramId): number {
  return (
    seasonMechanicsDefinition.programProfiles.find((profile) => profile.programId === programId)
      ?.teamRating ?? -1
  );
}

function chooseProgram(career: CareerRun, input: ExecuteWrSeasonCareerInput): ProgramId {
  if (career.recruitingState.type !== 'CHOOSING') {
    return fail(input.scenarioId, 'choose_program', 'missing_offers');
  }
  const offeredIds = career.recruitingState.offers.map(({ programId }) => programId);
  if (input.selectedProgramId !== undefined) {
    if (!offeredIds.includes(input.selectedProgramId)) {
      return fail(input.scenarioId, 'choose_program', 'requested_program_not_offered');
    }
    return input.selectedProgramId;
  }
  if (input.programSelectionPolicy === 'first_offer') return offeredIds[0]!;
  return [...offeredIds].sort((left, right) => {
    const ratingOrder = programTeamRating(left) - programTeamRating(right);
    const directed =
      input.programSelectionPolicy === 'strongest_offer' ? -ratingOrder : ratingOrder;
    return directed === 0 ? compareCodeUnits(left, right) : directed;
  })[0]!;
}

function chooseDecision(career: CareerRun, input: ExecuteWrSeasonCareerInput): KeySnapDecisionId {
  if (career.phase.type !== 'KEY_SNAP') {
    return fail(input.scenarioId, 'choose_game_decision', 'missing_key_snap');
  }
  const pendingSnap = career.phase.pendingSnap;
  if (input.decisionStrategyId === 'first_presented') return pendingSnap.decisionIds[0];
  if (input.decisionStrategyId === 'risk_seeking') {
    const riskChoiceByFamily = {
      key_snap_family_release: 'key_snap_decision_speed_release',
      key_snap_family_route: 'key_snap_decision_stack_defender',
      key_snap_family_catch: 'key_snap_decision_attack_high_point',
      key_snap_family_yac: 'key_snap_decision_burst_upfield',
    } as const;
    return riskChoiceByFamily[pendingSnap.familyId];
  }
  const pattern = keySnapPatternMechanicsDefinitions.find(({ id }) => id === pendingSnap.patternId);
  if (pattern === undefined)
    return fail(input.scenarioId, 'choose_game_decision', 'missing_pattern');
  return [...pattern.decisionFits].sort((left, right) => {
    const fitOrder = right.fit - left.fit;
    return fitOrder === 0 ? compareCodeUnits(left.decisionId, right.decisionId) : fitOrder;
  })[0]!.decisionId;
}

function chooseSkill(career: CareerRun, input: ExecuteWrSeasonCareerInput): SkillId {
  if (career.phase.type !== 'SKILL_BREAKTHROUGH') {
    return fail(input.scenarioId, 'choose_skill', 'missing_offer');
  }
  if (input.skillChoicePolicy === 'first_offered') {
    return career.phase.offer.offeredSkillIds[0];
  }
  const familyPreference = new Map(
    input.preferredSkillFamilyIds.map((familyId, index) => [familyId, index]),
  );
  return [...career.phase.offer.offeredSkillIds].sort((left, right) => {
    const leftFamily = skillMechanicsDefinitions.find(({ id }) => id === left)?.familyId;
    const rightFamily = skillMechanicsDefinitions.find(({ id }) => id === right)?.familyId;
    const preferenceOrder =
      (leftFamily === undefined ? 999 : (familyPreference.get(leftFamily) ?? 999)) -
      (rightFamily === undefined ? 999 : (familyPreference.get(rightFamily) ?? 999));
    return preferenceOrder === 0 ? compareCodeUnits(left, right) : preferenceOrder;
  })[0]!;
}

function acceptBreakthrough(
  session: CareerSession,
  input: ExecuteWrSeasonCareerInput,
  stage: string,
): { readonly session: CareerSession; readonly selectedSkillId: SkillId | null } {
  if (session.career.phase.type !== 'SKILL_BREAKTHROUGH') {
    return { session, selectedSkillId: null };
  }
  const selectedSkillId = chooseSkill(session.career, input);
  const chosen = chooseSkillBreakthrough(session.career, selectedSkillId);
  if (!chosen.ok) return fail(input.scenarioId, stage, chosen.reason);
  return {
    session: withCareer(session, chosen.career, input, `${stage}_reload`),
    selectedSkillId,
  };
}

function resolvePracticeWeek(
  session: CareerSession,
  input: ExecuteWrSeasonCareerInput,
  sequenceNumber: number,
): { readonly session: CareerSession; readonly roundTripCount: number } {
  const availableActionIds = weeklyActionDefinitions.map(({ id }) => id);
  const committed = commitWeeklyActionPlan(session.career, input.actionPlan, availableActionIds);
  if (!committed.ok) return fail(input.scenarioId, `week_${sequenceNumber}_plan`, committed.reason);
  let current = withCareer(
    session,
    committed.career,
    input,
    `week_${sequenceNumber}_reload_after_plan`,
  );
  let roundTripCount = roundTripIncrement(input);
  for (const [actionIndex, actionId] of input.actionPlan.entries()) {
    const definition = weeklyActionDefinitions.find(({ id }) => id === actionId);
    if (definition === undefined) {
      return fail(
        input.scenarioId,
        `week_${sequenceNumber}_action_${actionIndex}`,
        'missing_action',
      );
    }
    const resolved = resolveNextWeeklyAction(
      current.career,
      definition,
      developmentWeekConfig,
      skillMechanicsDefinitions,
      offenseStyleMechanicsDefinitions,
      rotationPolicyMechanicsDefinitions,
    );
    if (!resolved.ok) {
      return fail(
        input.scenarioId,
        `week_${sequenceNumber}_action_${actionIndex}`,
        resolved.reason,
      );
    }
    current = withCareer(
      current,
      resolved.career,
      input,
      `week_${sequenceNumber}_reload_after_action_${actionIndex}`,
    );
    roundTripCount += roundTripIncrement(input);
  }
  if (current.career.phase.type !== 'WEEK_END') {
    return fail(input.scenarioId, `week_${sequenceNumber}_practice`, 'missing_week_end');
  }
  return { session: current, roundTripCount };
}

function eventChoiceIndex(policy: SeasonEventChoicePolicy, sequenceNumber: number): 0 | 1 {
  if (policy === 'first') return 0;
  if (policy === 'second') return 1;
  return sequenceNumber % 2 === 0 ? 1 : 0;
}

function resolveWeeklyBoundary(
  session: CareerSession,
  input: ExecuteWrSeasonCareerInput,
  sequenceNumber: number,
): BoundaryTrace {
  const selected = selectShippedWeeklyEvent(session);
  if (!selected.ok) return fail(input.scenarioId, `week_${sequenceNumber}_event`, selected.reason);
  let current = maybeRoundTripSession(
    selected.session,
    input,
    `week_${sequenceNumber}_reload_after_event_selection`,
  );
  let roundTripCount = roundTripIncrement(input);
  let eventId: EventId | null = null;
  let eventChoiceId: EventChoiceId | null = null;
  if (current.career.phase.type === 'EVENT_CHOICE') {
    eventId = current.career.phase.pendingEvent.eventId;
    eventChoiceId =
      current.career.phase.pendingEvent.choiceIds[
        eventChoiceIndex(input.eventChoicePolicy, sequenceNumber)
      ] ?? null;
    if (eventChoiceId === null) {
      return fail(input.scenarioId, `week_${sequenceNumber}_event_choice`, 'missing_choice');
    }
    const resolved = resolveShippedEventChoice(current, eventChoiceId);
    if (!resolved.ok) {
      return fail(input.scenarioId, `week_${sequenceNumber}_event_choice`, resolved.reason);
    }
    current = maybeRoundTripSession(
      resolved.session,
      input,
      `week_${sequenceNumber}_reload_after_event_choice`,
    );
    roundTripCount += roundTripIncrement(input);
  }

  const assessed = assessShippedWeeklyInjury(current);
  if (!assessed.ok) return fail(input.scenarioId, `week_${sequenceNumber}_injury`, assessed.reason);
  current = maybeRoundTripSession(
    assessed.session,
    input,
    `week_${sequenceNumber}_reload_after_injury_assessment`,
  );
  roundTripCount += roundTripIncrement(input);
  let injuryOutcomeId: InjuryOutcomeId | null = null;
  let injuryChoiceId: InjuryChoiceId | null = null;
  if (current.career.seasonCareerState.bootstrapStatus !== 'ACTIVE') {
    return fail(input.scenarioId, `week_${sequenceNumber}_injury`, 'missing_active_season');
  }
  const assessment = current.career.seasonCareerState.injuryState.lastAssessment;
  if (assessment?.outcome === 'INJURY') injuryOutcomeId = assessment.selectedOutcomeId;
  if (assessment?.outcome === 'ONGOING') injuryOutcomeId = assessment.currentOutcomeId;
  if (current.career.phase.type === 'INJURY_CHOICE') {
    injuryOutcomeId = current.career.phase.pendingInjury.outcomeId;
    injuryChoiceId =
      input.injuryChoicePolicy === 'rest'
        ? 'injury_choice_rest_rehab'
        : 'injury_choice_play_limited';
    if (!current.career.phase.pendingInjury.choiceIds.includes(injuryChoiceId)) {
      return fail(input.scenarioId, `week_${sequenceNumber}_injury_choice`, 'choice_unavailable');
    }
    const resolved = resolveShippedInjuryChoice(current, injuryChoiceId);
    if (!resolved.ok) {
      return fail(input.scenarioId, `week_${sequenceNumber}_injury_choice`, resolved.reason);
    }
    current = maybeRoundTripSession(
      resolved.session,
      input,
      `week_${sequenceNumber}_reload_after_injury_choice`,
    );
    roundTripCount += roundTripIncrement(input);
  }
  if (current.career.seasonCareerState.bootstrapStatus !== 'ACTIVE') {
    return fail(input.scenarioId, `week_${sequenceNumber}_availability`, 'missing_active_season');
  }
  const injuryAvailabilityId =
    current.career.seasonCareerState.injuryState.lastAvailability?.availabilityId;
  if (injuryAvailabilityId === undefined) {
    return fail(input.scenarioId, `week_${sequenceNumber}_availability`, 'missing_availability');
  }
  return {
    session: current,
    eventId,
    eventChoiceId,
    injuryOutcomeId,
    injuryChoiceId,
    injuryAvailabilityId,
    roundTripCount,
  };
}

function playPreparedGame(
  session: CareerSession,
  input: ExecuteWrSeasonCareerInput,
  sequenceNumber: number,
): {
  readonly session: CareerSession;
  readonly summary: CompletedGameSummary;
  readonly roundTripCount: number;
} {
  const started = startShippedGame(session.career);
  if (!started.ok)
    return fail(input.scenarioId, `week_${sequenceNumber}_start_game`, started.reason);
  let current = withCareer(
    session,
    started.career,
    input,
    `week_${sequenceNumber}_reload_after_game_start`,
  );
  let roundTripCount = roundTripIncrement(input);
  let snapIndex = 0;
  while (current.career.phase.type === 'KEY_SNAP') {
    const decisionId = chooseDecision(current.career, input);
    const resolved = resolveShippedKeySnap(current.career, decisionId);
    if (!resolved.ok) {
      return fail(input.scenarioId, `week_${sequenceNumber}_snap_${snapIndex}`, resolved.reason);
    }
    current = withCareer(
      current,
      resolved.career,
      input,
      `week_${sequenceNumber}_reload_after_snap_${snapIndex}`,
    );
    roundTripCount += roundTripIncrement(input);
    snapIndex += 1;
  }
  if (current.career.phase.type !== 'POST_GAME') {
    return fail(input.scenarioId, `week_${sequenceNumber}_game`, 'missing_post_game');
  }
  return { session: current, summary: current.career.phase.summary, roundTripCount };
}

function pushWeekTrace(
  traces: WrSeasonWeekTrace[],
  input: ExecuteWrSeasonCareerInput,
  stageId: SeasonStageId,
  stageRoundNumber: number,
  session: CareerSession,
  completeRound: (session: CareerSession) => {
    readonly session: CareerSession;
    readonly gameSummary: CompletedGameSummary | null;
    readonly roundTripCount: number;
  },
): CareerSession {
  const sequenceNumber = traces.length + 1;
  const roleIdBefore = session.career.programContext?.projection.roleId;
  if (roleIdBefore === undefined) return fail(input.scenarioId, 'week_role_before', 'missing_role');
  const roundTripBefore = resolvePracticeWeek(session, input, sequenceNumber);
  const boundary = resolveWeeklyBoundary(roundTripBefore.session, input, sequenceNumber);
  const completed = completeRound(boundary.session);
  const breakthrough = acceptBreakthrough(completed.session, input, `week_${sequenceNumber}_skill`);
  const roleIdAfter = breakthrough.session.career.programContext?.projection.roleId;
  if (roleIdAfter === undefined) return fail(input.scenarioId, 'week_role_after', 'missing_role');
  const breakthroughRoundTrips =
    breakthrough.selectedSkillId === null ? 0 : roundTripIncrement(input);
  traces.push(
    Object.freeze({
      sequenceNumber,
      stageId,
      stageRoundNumber,
      actionPlan: input.actionPlan,
      eventId: boundary.eventId,
      eventChoiceId: boundary.eventChoiceId,
      injuryOutcomeId: boundary.injuryOutcomeId,
      injuryChoiceId: boundary.injuryChoiceId,
      injuryAvailabilityId: boundary.injuryAvailabilityId,
      roleIdBefore,
      roleIdAfter,
      gameSummary: completed.gameSummary,
      selectedSkillId: breakthrough.selectedSkillId,
      roundTripCount:
        roundTripBefore.roundTripCount +
        boundary.roundTripCount +
        completed.roundTripCount +
        breakthroughRoundTrips,
    }),
  );
  return breakthrough.session;
}

export function executeWrSeasonCareer(input: ExecuteWrSeasonCareerInput): ExecutedWrSeasonCareer {
  let career = createWrCareerFixture(input.fixture);
  const recruiting = beginRecruiting(
    career,
    recruitingMechanicsConfig,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
  );
  if (!recruiting.ok) return fail(input.scenarioId, 'begin_recruiting', recruiting.reason);
  career = recruiting.career;
  if (input.serializationMode === 'every_transition') {
    career = roundTripCareer(career, input.scenarioId, 'reload_after_recruiting');
  }
  const selectedProgramId = chooseProgram(career, input);
  const committed = commitProgramChoice(
    career,
    selectedProgramId,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
    rotationPolicyMechanicsDefinitions,
    rosterNameMechanicsPool,
  );
  if (!committed.ok) return fail(input.scenarioId, 'commit_program', committed.reason);
  career = committed.career;
  if (input.serializationMode === 'every_transition') {
    career = roundTripCareer(career, input.scenarioId, 'reload_after_program_commitment');
  }
  if (career.recruitingState.type !== 'COMMITTED') {
    return fail(input.scenarioId, 'commit_program', 'missing_committed_state');
  }
  const recruitTierId = career.recruitingState.recruitTierId;
  const program = programMechanicsDefinitions.find(({ id }) => id === selectedProgramId);
  if (program === undefined) return fail(input.scenarioId, 'program', 'missing_program');
  const initialRoleId = career.programContext?.projection.roleId;
  if (initialRoleId === undefined) return fail(input.scenarioId, 'program', 'missing_initial_role');

  let session = createCareerSession(career);
  let totalRoundTripCount = 0;
  if (input.serializationMode === 'every_transition') {
    session = roundTripSession(session, input.scenarioId, 'reload_after_session_creation');
    totalRoundTripCount += 3;
  }
  const bootstrapped = bootstrapShippedSeason(session);
  if (!bootstrapped.ok) return fail(input.scenarioId, 'bootstrap_season', bootstrapped.reason);
  session = maybeRoundTripSession(bootstrapped.session, input, 'reload_after_season_bootstrap');
  totalRoundTripCount += roundTripIncrement(input);
  const weeks: WrSeasonWeekTrace[] = [];

  for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
    session = pushWeekTrace(weeks, input, 'CAMP', roundIndex + 1, session, (boundarySession) => {
      const advanced = advanceShippedCampRound(boundarySession);
      if (!advanced.ok) {
        return fail(input.scenarioId, `camp_${roundIndex + 1}`, advanced.reason);
      }
      return {
        session: maybeRoundTripSession(
          advanced.session,
          input,
          `reload_after_camp_${roundIndex + 1}`,
        ),
        gameSummary: null,
        roundTripCount: roundTripIncrement(input),
      };
    });
  }

  for (let roundIndex = 0; roundIndex < 12; roundIndex += 1) {
    session = pushWeekTrace(
      weeks,
      input,
      'REGULAR_SEASON',
      roundIndex + 1,
      session,
      (boundarySession) => {
        const prepared = prepareNextShippedSeasonGame(boundarySession);
        if (!prepared.ok) {
          return fail(input.scenarioId, `regular_${roundIndex + 1}_prepare`, prepared.reason);
        }
        const preparedSession = maybeRoundTripSession(
          prepared.session,
          input,
          `reload_after_regular_${roundIndex + 1}_preview`,
        );
        const played = playPreparedGame(preparedSession, input, weeks.length + 1);
        const completed = completeShippedRegularSeasonRound(played.session);
        if (!completed.ok) {
          return fail(input.scenarioId, `regular_${roundIndex + 1}_complete`, completed.reason);
        }
        return {
          session: maybeRoundTripSession(
            completed.session,
            input,
            `reload_after_regular_${roundIndex + 1}_complete`,
          ),
          gameSummary: played.summary,
          roundTripCount:
            roundTripIncrement(input) + played.roundTripCount + roundTripIncrement(input),
        };
      },
    );
  }

  const initialized = initializeShippedPostseason(session);
  if (!initialized.ok) return fail(input.scenarioId, 'initialize_postseason', initialized.reason);
  session = maybeRoundTripSession(
    initialized.session,
    input,
    'reload_after_postseason_initialization',
  );
  totalRoundTripCount += roundTripIncrement(input);
  const calendar = session.world.calendar;
  if (
    calendar.type !== 'ACTIVE' ||
    (calendar.postseason.type !== 'COMPLETE' && calendar.postseason.type !== 'ACTIVE')
  ) {
    return fail(input.scenarioId, 'postseason', 'invalid_postseason_state');
  }
  const qualifiedForPostseason = calendar.postseason.type === 'ACTIVE';

  let postseasonRoundNumber = 1;
  while (
    session.world.calendar.type === 'ACTIVE' &&
    session.world.calendar.postseason.type === 'ACTIVE'
  ) {
    session = pushWeekTrace(
      weeks,
      input,
      'POSTSEASON',
      postseasonRoundNumber,
      session,
      (boundarySession) => {
        const prepared = prepareNextShippedPostseasonGame(boundarySession);
        if (!prepared.ok) {
          return fail(
            input.scenarioId,
            `postseason_${postseasonRoundNumber}_prepare`,
            prepared.reason,
          );
        }
        const preparedSession = maybeRoundTripSession(
          prepared.session,
          input,
          `reload_after_postseason_${postseasonRoundNumber}_preview`,
        );
        const played = playPreparedGame(preparedSession, input, weeks.length + 1);
        const completed = completeShippedPostseasonRound(played.session);
        if (!completed.ok) {
          return fail(
            input.scenarioId,
            `postseason_${postseasonRoundNumber}_complete`,
            completed.reason,
          );
        }
        return {
          session: maybeRoundTripSession(
            completed.session,
            input,
            `reload_after_postseason_${postseasonRoundNumber}_complete`,
          ),
          gameSummary: played.summary,
          roundTripCount:
            roundTripIncrement(input) + played.roundTripCount + roundTripIncrement(input),
        };
      },
    );
    postseasonRoundNumber += 1;
  }

  totalRoundTripCount += weeks.reduce((total, week) => total + week.roundTripCount, 0);
  const reviewed = enterShippedSeasonReview(session);
  if (!reviewed.ok) return fail(input.scenarioId, 'enter_review', reviewed.reason);
  session = maybeRoundTripSession(reviewed.session, input, 'reload_after_review');
  totalRoundTripCount += roundTripIncrement(input);
  const completed = completeShippedCareer(session, createEmptyMetaProfile());
  if (!completed.ok) return fail(input.scenarioId, 'complete_career', completed.reason);
  session = maybeRoundTripSession(completed.session, input, 'reload_after_career_completion');
  let meta = completed.meta;
  if (input.serializationMode === 'every_transition') {
    meta = roundTripMeta(meta, input.scenarioId, 'reload_after_meta_completion');
    totalRoundTripCount += 2;
  }
  if (session.career.seasonCareerState.bootstrapStatus !== 'COMPLETE') {
    return fail(input.scenarioId, 'complete_career', 'missing_completed_summary');
  }
  const seasonSummary = session.career.seasonCareerState.lastCompletedSeason;
  const finalRoleId = seasonSummary.finalRoleId;
  const legacyVisibility = deriveShippedLegacyVisibility(meta, selectedProgramId);
  return Object.freeze({
    scenarioId: input.scenarioId,
    selectedProgramId,
    recruitTierId,
    programStrengthBandId: program.strengthBandId,
    initialRoleId,
    finalRoleId,
    qualifiedForPostseason,
    seasonSummary,
    alumni: completed.alumni,
    legacyVisibility,
    session,
    meta,
    weeks: Object.freeze(weeks),
    careerRng: session.career.rng,
    worldRng: session.world.rng,
    totalRoundTripCount,
    allRoundTripsEquivalent: true,
  });
}
