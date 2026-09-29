import {
  developmentWeekConfig,
  offenseStyleMechanicsDefinitions,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';
import {
  advanceHistoricalDevelopmentWeek as advanceDevelopmentWeek,
  beginRecruiting,
  chooseSkillBreakthrough,
  commitProgramChoice,
  commitHistoricalM3WeeklyActionPlan,
  parseCareerRun,
  resolveNextWeeklyAction,
  validateCareerRun,
} from '@project-saturday/game-core';
import type {
  CareerRun,
  DepthUpdateEvidence,
  PassiveBodyRecoveryEvidence,
  ProgramId,
  RecruitingOfferEvidence,
  RngState,
  SkillId,
  WeeklyActionId,
  WeeklyActionResult,
} from '@project-saturday/game-core';

// This builder reproduces shipped M3 evidence, whose offer pool ended at the first 18 cards.
const HISTORICAL_M3_SKILL_DEFINITIONS = Object.freeze(skillMechanicsDefinitions.slice(0, 18));

import { createWrCareerFixture, type WrCareerFixtureOptions } from './wr-career.js';

export type ProgramCareerSerializationMode = 'none' | 'every_transition';
export type ProgramWeeklyActionPlan = readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];

export interface CreateEnrolledWrCareerFixtureInput {
  readonly scenarioId: string;
  readonly fixture: WrCareerFixtureOptions;
  readonly selectedProgramId: ProgramId;
  readonly serializationMode?: ProgramCareerSerializationMode;
}

export interface EnrolledWrCareerFixture {
  readonly career: CareerRun;
  readonly roomRngAfter: RngState;
  readonly roomRngBefore: RngState;
  readonly selectedOffer: RecruitingOfferEvidence;
  readonly roundTripCount: number;
}

export interface ExecuteWrProgramDevelopmentWeekInput {
  readonly actionPlan: ProgramWeeklyActionPlan;
  readonly career: CareerRun;
  readonly scenarioId: string;
  readonly serializationMode?: ProgramCareerSerializationMode;
}

export interface ExecutedWrProgramDevelopmentWeek {
  readonly actionPlan: ProgramWeeklyActionPlan;
  readonly actionResults: readonly [WeeklyActionResult, WeeklyActionResult, WeeklyActionResult];
  readonly career: CareerRun;
  readonly completedWeekNumber: number;
  readonly depthUpdate: DepthUpdateEvidence;
  readonly passiveBodyRecovery: PassiveBodyRecoveryEvidence;
  readonly roundTripCount: number;
  readonly selectedSkillId: SkillId | null;
}

export class WrProgramCareerBuilderError extends Error {
  public readonly scenarioId: string;
  public readonly stage: string;

  public constructor(scenarioId: string, stage: string, reason: string) {
    super(`scenario=${JSON.stringify(scenarioId)} stage=${stage} reason=${reason}`);
    this.name = 'WrProgramCareerBuilderError';
    this.scenarioId = scenarioId;
    this.stage = stage;
  }
}

function fail(scenarioId: string, stage: string, reason: string): never {
  throw new WrProgramCareerBuilderError(scenarioId, stage, reason);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function roundTripCareer(career: CareerRun, scenarioId: string, stage: string): CareerRun {
  const serialized = JSON.stringify(career);
  const parsed = parseCareerRun(serialized);
  if (!parsed.ok) {
    return fail(scenarioId, stage, parsed.reason);
  }
  if (JSON.stringify(parsed.career) !== serialized) {
    return fail(scenarioId, stage, 'round_trip_diverged');
  }
  return parsed.career;
}

function maybeRoundTrip(
  career: CareerRun,
  scenarioId: string,
  stage: string,
  serializationMode: ProgramCareerSerializationMode | undefined,
): CareerRun {
  return serializationMode === 'every_transition'
    ? roundTripCareer(career, scenarioId, stage)
    : career;
}

export function createEnrolledWrCareerFixture(
  input: CreateEnrolledWrCareerFixtureInput,
): EnrolledWrCareerFixture {
  let roundTripCount = 0;
  let career = createWrCareerFixture(input.fixture);
  const recruiting = beginRecruiting(
    career,
    recruitingMechanicsConfig,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
  );
  if (!recruiting.ok) {
    return fail(input.scenarioId, 'begin_recruiting', recruiting.reason);
  }
  career = recruiting.career;
  if (input.serializationMode === 'every_transition') {
    career = roundTripCareer(career, input.scenarioId, 'reload_after_recruiting');
    roundTripCount += 1;
  }
  if (career.recruitingState.type !== 'CHOOSING') {
    return fail(input.scenarioId, 'capture_shortlist', 'missing_choosing_state');
  }
  const selectedOffer = career.recruitingState.offers.find(
    ({ programId }) => programId === input.selectedProgramId,
  );
  if (selectedOffer === undefined) {
    return fail(input.scenarioId, 'select_program', 'program_not_offered');
  }
  const roomRngBefore = career.rng;
  const committed = commitProgramChoice(
    career,
    input.selectedProgramId,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
    rotationPolicyMechanicsDefinitions,
    rosterNameMechanicsPool,
  );
  if (!committed.ok) {
    return fail(input.scenarioId, 'commit_program', committed.reason);
  }
  career = committed.career;
  if (input.serializationMode === 'every_transition') {
    career = roundTripCareer(career, input.scenarioId, 'reload_after_program');
    roundTripCount += 1;
  }
  return Object.freeze({
    career,
    roomRngAfter: career.rng,
    roomRngBefore,
    selectedOffer,
    roundTripCount,
  });
}

export function executeWrProgramDevelopmentWeek(
  input: ExecuteWrProgramDevelopmentWeekInput,
): ExecutedWrProgramDevelopmentWeek {
  if (!validateCareerRun(input.career).ok) {
    return fail(input.scenarioId, 'setup', 'invalid_career');
  }
  if (
    input.career.recruitingState.type !== 'COMMITTED' ||
    input.career.programContext === null ||
    input.career.phase.type !== 'PLAN_ACTIONS'
  ) {
    return fail(input.scenarioId, 'setup', 'career_not_ready');
  }
  let roundTripCount = 0;
  let career = input.career;
  const availableActionIds = weeklyActionDefinitions.map(({ id }) => id);
  const committed = commitHistoricalM3WeeklyActionPlan(
    career,
    input.actionPlan,
    availableActionIds,
  );
  if (!committed.ok) {
    return fail(input.scenarioId, 'commit_plan', committed.reason);
  }
  career = maybeRoundTrip(
    committed.career,
    input.scenarioId,
    'reload_after_plan',
    input.serializationMode,
  );
  if (input.serializationMode === 'every_transition') {
    roundTripCount += 1;
  }

  for (const [actionIndex, actionId] of input.actionPlan.entries()) {
    const definition = weeklyActionDefinitions.find(({ id }) => id === actionId);
    if (definition === undefined) {
      return fail(input.scenarioId, `resolve_action_${actionIndex}`, 'missing_definition');
    }
    const resolved = resolveNextWeeklyAction(
      career,
      definition,
      developmentWeekConfig,
      HISTORICAL_M3_SKILL_DEFINITIONS,
      offenseStyleMechanicsDefinitions,
      rotationPolicyMechanicsDefinitions,
    );
    if (!resolved.ok) {
      return fail(input.scenarioId, `resolve_action_${actionIndex}`, resolved.reason);
    }
    career = maybeRoundTrip(
      resolved.career,
      input.scenarioId,
      `reload_after_action_${actionIndex}`,
      input.serializationMode,
    );
    if (input.serializationMode === 'every_transition') {
      roundTripCount += 1;
    }
  }
  if (career.phase.type !== 'WEEK_END' || career.phase.depthUpdate === null) {
    return fail(input.scenarioId, 'capture_week_end', 'missing_depth_update');
  }
  const actionResults = career.phase.results;
  const depthUpdate = career.phase.depthUpdate;
  const completedWeekNumber = career.weekIndex + 1;
  const advanced = advanceDevelopmentWeek(
    career,
    developmentWeekConfig,
    HISTORICAL_M3_SKILL_DEFINITIONS,
    weeklyActionDefinitions,
  );
  if (!advanced.ok) {
    return fail(input.scenarioId, 'advance_week', advanced.reason);
  }
  career = maybeRoundTrip(
    advanced.career,
    input.scenarioId,
    'reload_after_advance',
    input.serializationMode,
  );
  if (input.serializationMode === 'every_transition') {
    roundTripCount += 1;
  }
  const passiveBodyRecovery = career.lastPassiveBodyRecovery;
  if (passiveBodyRecovery === null || passiveBodyRecovery.weekIndex !== completedWeekNumber - 1) {
    return fail(input.scenarioId, 'advance_week', 'missing_passive_recovery');
  }

  let selectedSkillId: SkillId | null = null;
  if (career.phase.type === 'SKILL_BREAKTHROUGH') {
    selectedSkillId = [...career.phase.offer.offeredSkillIds].sort(compareCodeUnits)[0] ?? null;
    if (selectedSkillId === null) {
      return fail(input.scenarioId, 'choose_skill', 'empty_offer');
    }
    const chosen = chooseSkillBreakthrough(career, selectedSkillId);
    if (!chosen.ok) {
      return fail(input.scenarioId, 'choose_skill', chosen.reason);
    }
    career = maybeRoundTrip(
      chosen.career,
      input.scenarioId,
      'reload_after_skill',
      input.serializationMode,
    );
    if (input.serializationMode === 'every_transition') {
      roundTripCount += 1;
    }
  }
  if (career.phase.type !== 'PLAN_ACTIONS') {
    return fail(input.scenarioId, 'complete_week', `unexpected_phase:${career.phase.type}`);
  }
  return Object.freeze({
    actionPlan: input.actionPlan,
    actionResults,
    career,
    completedWeekNumber,
    depthUpdate,
    passiveBodyRecovery,
    roundTripCount,
    selectedSkillId,
  });
}
