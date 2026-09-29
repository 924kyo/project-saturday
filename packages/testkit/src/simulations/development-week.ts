import {
  WEEKLY_ACTION_IDS,
  advanceHistoricalDevelopmentWeek as advanceDevelopmentWeek,
  commitHistoricalPreProgramWeeklyActionPlan,
  isCareerRun,
  resolveNextWeeklyAction,
  validateCareerRun,
} from '@project-saturday/game-core';
import type {
  CareerRun,
  DevelopmentWeekConfig,
  RngSeed,
  WeeklyActionDefinition,
  WeeklyActionId,
  WeeklyActionResult,
  WeeklyCommandResult,
} from '@project-saturday/game-core';

import { formatScenarioReproduction } from '../scenario.js';

export type WeeklyActionPlan = readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
export type CareerSerializationMode = 'none' | 'every_transition';

export interface DevelopmentWeekSimulationInput {
  readonly scenarioId: string;
  readonly initialCareer: CareerRun;
  readonly weekCount: number;
  readonly repeatedActionPlan: WeeklyActionPlan;
  readonly availableActionIds: readonly WeeklyActionId[];
  readonly actionDefinitions: readonly WeeklyActionDefinition[];
  readonly config: DevelopmentWeekConfig;
  readonly serializationMode?: CareerSerializationMode;
}

export interface DevelopmentWeekTrace {
  readonly weekIndex: number;
  readonly actionIds: WeeklyActionPlan;
  readonly bodyBeforeActions: number;
  readonly gpaBeforeActions: number;
  readonly results: readonly [WeeklyActionResult, WeeklyActionResult, WeeklyActionResult];
  readonly bodyAfterActions: number;
  readonly bodyAfterWeekAdvance: number;
  readonly gpaAfterActions: number;
  readonly revisionAfterWeekAdvance: number;
}

export interface DevelopmentWeekSimulationReport {
  readonly scenarioId: string;
  readonly seed: RngSeed;
  readonly reproduction: string;
  readonly serializationMode: CareerSerializationMode;
  readonly weekCount: number;
  readonly repeatedActionPlan: WeeklyActionPlan;
  readonly initialCareer: CareerRun;
  readonly finalCareer: CareerRun;
  readonly weeks: readonly DevelopmentWeekTrace[];
  readonly actionUseCounts: Readonly<Record<WeeklyActionId, number>>;
  readonly minimumBody: number;
  readonly maximumBody: number;
  readonly minimumGpa: number;
  readonly maximumGpa: number;
  readonly totalAwardedXp: number;
  readonly totalAppliedXp: number;
}

export class DevelopmentWeekSimulationError extends Error {
  public readonly reproduction: string;
  public readonly stage: string;
  public readonly weekIndex: number;

  public constructor(
    reproduction: string,
    stage: string,
    weekIndex: number,
    reason: string,
    options?: ErrorOptions,
  ) {
    super(`${reproduction} week=${weekIndex} stage=${stage} reason=${reason}`, options);
    this.name = 'DevelopmentWeekSimulationError';
    this.reproduction = reproduction;
    this.stage = stage;
    this.weekIndex = weekIndex;
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const propertyValue of Object.values(value)) {
    deepFreeze(propertyValue);
  }
  return Object.freeze(value);
}

function roundTripCareer(career: CareerRun, reproduction: string, stage: string): CareerRun {
  const restored: unknown = JSON.parse(JSON.stringify(career));
  if (!isCareerRun(restored)) {
    throw new DevelopmentWeekSimulationError(
      reproduction,
      `${stage}:json_round_trip`,
      career.weekIndex,
      'invalid_restored_career',
    );
  }
  return deepFreeze(restored);
}

function afterTransition(
  career: CareerRun,
  mode: CareerSerializationMode,
  reproduction: string,
  stage: string,
): CareerRun {
  const invariant = validateCareerRun(career);
  if (!invariant.ok) {
    throw new DevelopmentWeekSimulationError(
      reproduction,
      stage,
      career.weekIndex,
      `invalid_transition:${invariant.issues.map((issue) => `${issue.code}@${issue.path}`).join(',')}`,
    );
  }
  return mode === 'every_transition' ? roundTripCareer(career, reproduction, stage) : career;
}

function requireSuccess(
  result: WeeklyCommandResult,
  reproduction: string,
  stage: string,
  weekIndex: number,
): CareerRun {
  if (!result.ok) {
    throw new DevelopmentWeekSimulationError(reproduction, stage, weekIndex, result.reason);
  }
  return result.career;
}

function validateInput(input: DevelopmentWeekSimulationInput, reproduction: string): void {
  if (!Number.isSafeInteger(input.weekCount) || input.weekCount < 1 || input.weekCount > 10_000) {
    throw new DevelopmentWeekSimulationError(
      reproduction,
      'setup',
      input.initialCareer.weekIndex,
      'invalid_week_count',
    );
  }
  if (!validateCareerRun(input.initialCareer).ok) {
    throw new DevelopmentWeekSimulationError(
      reproduction,
      'setup',
      input.initialCareer.weekIndex,
      'invalid_initial_career',
    );
  }
  if (input.initialCareer.phase.type !== 'PLAN_ACTIONS') {
    throw new DevelopmentWeekSimulationError(
      reproduction,
      'setup',
      input.initialCareer.weekIndex,
      'initial_career_not_planning',
    );
  }
}

function definitionLookup(
  definitions: readonly WeeklyActionDefinition[],
  reproduction: string,
  weekIndex: number,
): ReadonlyMap<WeeklyActionId, WeeklyActionDefinition> {
  const lookup = new Map<WeeklyActionId, WeeklyActionDefinition>();
  for (const definition of definitions) {
    if (lookup.has(definition.id)) {
      throw new DevelopmentWeekSimulationError(
        reproduction,
        'setup',
        weekIndex,
        `duplicate_action_definition:${definition.id}`,
      );
    }
    lookup.set(definition.id, definition);
  }
  return lookup;
}

function emptyActionUseCounts(): Record<WeeklyActionId, number> {
  return Object.fromEntries(WEEKLY_ACTION_IDS.map((actionId) => [actionId, 0])) as Record<
    WeeklyActionId,
    number
  >;
}

export function simulateDevelopmentWeeks(
  input: DevelopmentWeekSimulationInput,
): DevelopmentWeekSimulationReport {
  const seed = input.initialCareer.careerSeed;
  const reproduction = formatScenarioReproduction({ scenarioId: input.scenarioId, seed });
  const serializationMode = input.serializationMode ?? 'none';
  validateInput(input, reproduction);
  const definitions = definitionLookup(
    input.actionDefinitions,
    reproduction,
    input.initialCareer.weekIndex,
  );
  const initialCareer = roundTripCareer(input.initialCareer, reproduction, 'initial_snapshot');
  let career = input.initialCareer;
  let minimumBody = career.player.state.body;
  let maximumBody = career.player.state.body;
  let minimumGpa = career.player.state.gpa;
  let maximumGpa = career.player.state.gpa;
  let totalAwardedXp = 0;
  let totalAppliedXp = 0;
  const actionUseCounts = emptyActionUseCounts();
  const weeks: DevelopmentWeekTrace[] = [];

  for (let completedWeeks = 0; completedWeeks < input.weekCount; completedWeeks += 1) {
    const weekIndex = career.weekIndex;
    const bodyBeforeActions = career.player.state.body;
    const gpaBeforeActions = career.player.state.gpa;
    career = afterTransition(
      requireSuccess(
        commitHistoricalPreProgramWeeklyActionPlan(
          career,
          input.repeatedActionPlan,
          input.availableActionIds,
        ),
        reproduction,
        'commit_plan',
        weekIndex,
      ),
      serializationMode,
      reproduction,
      'commit_plan',
    );

    for (const [actionIndex, actionId] of input.repeatedActionPlan.entries()) {
      const definition = definitions.get(actionId);
      if (definition === undefined) {
        throw new DevelopmentWeekSimulationError(
          reproduction,
          `resolve_action_${actionIndex}`,
          weekIndex,
          `missing_action_definition:${actionId}`,
        );
      }
      career = afterTransition(
        requireSuccess(
          resolveNextWeeklyAction(career, definition, input.config),
          reproduction,
          `resolve_action_${actionIndex}`,
          weekIndex,
        ),
        serializationMode,
        reproduction,
        `resolve_action_${actionIndex}`,
      );
    }

    if (career.phase.type !== 'WEEK_END') {
      throw new DevelopmentWeekSimulationError(
        reproduction,
        'capture_week_end',
        weekIndex,
        'missing_week_end_results',
      );
    }
    const results = career.phase.results;
    for (const result of results) {
      actionUseCounts[result.actionId] += 1;
      minimumBody = Math.min(minimumBody, result.bodyBefore, result.bodyAfter);
      maximumBody = Math.max(maximumBody, result.bodyBefore, result.bodyAfter);
      minimumGpa = Math.min(minimumGpa, result.gpaBefore, result.gpaAfter);
      maximumGpa = Math.max(maximumGpa, result.gpaBefore, result.gpaAfter);
      for (const xpResult of result.attributeXp) {
        totalAwardedXp += xpResult.awardedXp;
        totalAppliedXp += xpResult.appliedXp;
      }
    }
    const bodyAfterActions = career.player.state.body;
    const gpaAfterActions = career.player.state.gpa;

    career = afterTransition(
      requireSuccess(
        advanceDevelopmentWeek(career, input.config),
        reproduction,
        'advance_week',
        weekIndex,
      ),
      serializationMode,
      reproduction,
      'advance_week',
    );
    minimumBody = Math.min(minimumBody, career.player.state.body);
    maximumBody = Math.max(maximumBody, career.player.state.body);
    minimumGpa = Math.min(minimumGpa, career.player.state.gpa);
    maximumGpa = Math.max(maximumGpa, career.player.state.gpa);
    weeks.push(
      deepFreeze({
        weekIndex,
        actionIds: Object.freeze([...input.repeatedActionPlan]) as WeeklyActionPlan,
        bodyBeforeActions,
        gpaBeforeActions,
        results,
        bodyAfterActions,
        bodyAfterWeekAdvance: career.player.state.body,
        gpaAfterActions,
        revisionAfterWeekAdvance: career.revision,
      }),
    );
  }

  return deepFreeze({
    scenarioId: input.scenarioId,
    seed,
    reproduction,
    serializationMode,
    weekCount: input.weekCount,
    repeatedActionPlan: Object.freeze([...input.repeatedActionPlan]) as WeeklyActionPlan,
    initialCareer,
    finalCareer: career,
    weeks,
    actionUseCounts,
    minimumBody,
    maximumBody,
    minimumGpa,
    maximumGpa,
    totalAwardedXp,
    totalAppliedXp,
  });
}
