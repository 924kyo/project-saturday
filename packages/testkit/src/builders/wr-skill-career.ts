import {
  advanceHistoricalDevelopmentWeek as advanceDevelopmentWeek,
  chooseSkillBreakthrough,
  commitHistoricalPreProgramWeeklyActionPlan,
  deriveEligibleWeightedSkillOfferPool,
  deriveOwnedSkillIds,
  parseCareerRun,
  resolveNextWeeklyAction,
  validateCareerRun,
} from '@project-saturday/game-core';
import type {
  CareerRun,
  DevelopmentWeekConfig,
  EquippedSkillIds,
  OfferedSkillIds,
  PassiveBodyRecoveryEvidence,
  RngState,
  SkillAcquisitionRecord,
  SkillBehaviorAffinityCount,
  SkillBreakthroughOffer,
  SkillId,
  SkillMechanicsDefinition,
  WeeklyActionDefinition,
  WeeklyActionId,
  WeeklyActionResult,
  WeightedSkillOfferCandidate,
} from '@project-saturday/game-core';

export type SkillAwareWeeklyActionPlan = readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];

export type SkillCareerSerializationMode = 'none' | 'every_transition';

export interface SkillChoiceContext {
  readonly career: CareerRun;
  readonly offer: SkillBreakthroughOffer;
  readonly ownedSkillIds: readonly SkillId[];
}

export type SkillChoicePolicy = (context: SkillChoiceContext) => SkillId;

export interface ExecuteWrSkillDevelopmentWeekInput {
  readonly career: CareerRun;
  readonly actionPlan: SkillAwareWeeklyActionPlan;
  readonly availableActionIds: readonly WeeklyActionId[];
  readonly actionDefinitions: readonly WeeklyActionDefinition[];
  readonly skillDefinitions: readonly SkillMechanicsDefinition[];
  readonly config: DevelopmentWeekConfig;
  readonly choicePolicy: SkillChoicePolicy;
  readonly serializationMode?: SkillCareerSerializationMode;
  readonly scenarioId: string;
}

export interface ExecutedSkillBreakthrough {
  readonly offer: SkillBreakthroughOffer;
  readonly behaviorCounts: readonly SkillBehaviorAffinityCount[];
  readonly weightedCandidates: readonly WeightedSkillOfferCandidate[];
  readonly ownedSkillIdsBefore: readonly SkillId[];
  readonly selectedSkillId: SkillId;
  readonly equippedSkillIdsAfter: EquippedSkillIds;
  readonly acquisition: SkillAcquisitionRecord;
  readonly rngBeforeAdvance: RngState;
  readonly rngAfterOffer: RngState;
  readonly rngAfterChoice: RngState;
  readonly rngDrawCountBeforeChoice: number;
  readonly rngDrawCountAfterChoice: number;
  readonly revisionAfterWeekAdvance: number;
  readonly revisionAfterChoice: number;
}

export interface ExecutedWrSkillDevelopmentWeek {
  readonly weekIndex: number;
  readonly actionPlan: SkillAwareWeeklyActionPlan;
  readonly actionResults: readonly [WeeklyActionResult, WeeklyActionResult, WeeklyActionResult];
  readonly passiveBodyRecovery: PassiveBodyRecoveryEvidence;
  readonly breakthrough: ExecutedSkillBreakthrough | null;
  readonly career: CareerRun;
}

export class WrSkillCareerBuilderError extends Error {
  public readonly scenarioId: string;
  public readonly stage: string;
  public readonly weekIndex: number;

  public constructor(scenarioId: string, stage: string, weekIndex: number, reason: string) {
    super(
      `scenario=${JSON.stringify(scenarioId)} week=${weekIndex} stage=${stage} reason=${reason}`,
    );
    this.name = 'WrSkillCareerBuilderError';
    this.scenarioId = scenarioId;
    this.stage = stage;
    this.weekIndex = weekIndex;
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }
  return Object.freeze(value);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function selectPreferredOfferedSkill(
  offeredSkillIds: OfferedSkillIds,
  preferredSkillIds: readonly SkillId[],
): SkillId {
  for (const preferredSkillId of preferredSkillIds) {
    if (offeredSkillIds.some((skillId) => skillId === preferredSkillId)) {
      return preferredSkillId;
    }
  }
  const fallback = [...offeredSkillIds].sort(compareCodeUnits)[0];
  if (fallback === undefined) {
    throw new RangeError('A skill breakthrough must contain at least one offered skill.');
  }
  return fallback;
}

function fail(input: ExecuteWrSkillDevelopmentWeekInput, stage: string, reason: string): never {
  throw new WrSkillCareerBuilderError(input.scenarioId, stage, input.career.weekIndex, reason);
}

function roundTripCareer(
  career: CareerRun,
  input: ExecuteWrSkillDevelopmentWeekInput,
  stage: string,
): CareerRun {
  const parsed = parseCareerRun(JSON.stringify(career));
  if (!parsed.ok) {
    return fail(input, stage, parsed.reason);
  }
  return parsed.career;
}

function actionDefinitionById(
  definitions: readonly WeeklyActionDefinition[],
  input: ExecuteWrSkillDevelopmentWeekInput,
): ReadonlyMap<WeeklyActionId, WeeklyActionDefinition> {
  const lookup = new Map<WeeklyActionId, WeeklyActionDefinition>();
  for (const definition of definitions) {
    if (lookup.has(definition.id)) {
      return fail(input, 'setup', `duplicate_action_definition:${definition.id}`);
    }
    lookup.set(definition.id, definition);
  }
  return lookup;
}

export function executeWrSkillDevelopmentWeek(
  input: ExecuteWrSkillDevelopmentWeekInput,
): ExecutedWrSkillDevelopmentWeek {
  if (!validateCareerRun(input.career).ok) {
    return fail(input, 'setup', 'invalid_career');
  }
  if (input.career.phase.type !== 'PLAN_ACTIONS') {
    return fail(input, 'setup', `invalid_initial_phase:${input.career.phase.type}`);
  }
  const definitions = actionDefinitionById(input.actionDefinitions, input);
  const weekIndex = input.career.weekIndex;
  let career = input.career;

  const committed = commitHistoricalPreProgramWeeklyActionPlan(
    career,
    input.actionPlan,
    input.availableActionIds,
  );
  if (!committed.ok) {
    return fail(input, 'commit_plan', committed.reason);
  }
  career = committed.career;
  if (input.serializationMode === 'every_transition') {
    career = roundTripCareer(career, input, 'reload_after_commit');
  }

  for (const [actionIndex, actionId] of input.actionPlan.entries()) {
    const definition = definitions.get(actionId);
    if (definition === undefined) {
      return fail(input, `resolve_action_${actionIndex}`, `missing_definition:${actionId}`);
    }
    const resolved = resolveNextWeeklyAction(
      career,
      definition,
      input.config,
      input.skillDefinitions,
    );
    if (!resolved.ok) {
      return fail(input, `resolve_action_${actionIndex}`, resolved.reason);
    }
    career = resolved.career;
    if (input.serializationMode === 'every_transition') {
      career = roundTripCareer(career, input, `reload_after_action_${actionIndex}`);
    }
  }

  if (career.phase.type !== 'WEEK_END') {
    return fail(input, 'capture_week_end', `invalid_phase:${career.phase.type}`);
  }
  const actionResults = career.phase.results;
  const rngBeforeAdvance = career.rng;
  const advanced = advanceDevelopmentWeek(
    career,
    input.config,
    input.skillDefinitions,
    input.actionDefinitions,
  );
  if (!advanced.ok) {
    return fail(input, 'advance_week', advanced.reason);
  }
  career = advanced.career;
  if (input.serializationMode === 'every_transition') {
    career = roundTripCareer(career, input, 'reload_after_advance');
  }
  const passiveBodyRecovery = career.lastPassiveBodyRecovery;
  if (passiveBodyRecovery === null || passiveBodyRecovery.weekIndex !== weekIndex) {
    return fail(input, 'advance_week', 'missing_passive_body_recovery_evidence');
  }

  let breakthrough: ExecutedSkillBreakthrough | null = null;
  if (career.phase.type === 'SKILL_BREAKTHROUGH') {
    const offer = career.phase.offer;
    const rngAfterOffer = career.rng;
    const revisionAfterWeekAdvance = career.revision;
    const ownedSkillIdsBefore = deriveOwnedSkillIds(career.player.skillState);
    const pool = deriveEligibleWeightedSkillOfferPool(
      {
        positionId: career.player.positionId,
        archetypeId: career.player.archetypeId,
        playerTagIds: career.player.tagIds,
        ownedSkillIds: ownedSkillIdsBefore,
        weekIndex: career.weekIndex,
        recentWeeklyActionIds: career.recentWeeklyActionIds,
      },
      input.skillDefinitions,
      input.actionDefinitions,
    );
    if (!pool.ok) {
      return fail(input, 'derive_offer_pool', pool.reason);
    }
    const selectedSkillId = input.choicePolicy({
      career,
      offer,
      ownedSkillIds: ownedSkillIdsBefore,
    });
    const rngDrawCountBeforeChoice = career.rng.drawCount;
    const chosen = chooseSkillBreakthrough(career, selectedSkillId);
    if (!chosen.ok) {
      return fail(input, 'choose_skill', chosen.reason);
    }
    career = chosen.career;
    const rngDrawCountAfterChoice = career.rng.drawCount;
    if (rngDrawCountAfterChoice !== rngDrawCountBeforeChoice) {
      return fail(input, 'choose_skill', 'choice_consumed_rng');
    }
    if (input.serializationMode === 'every_transition') {
      career = roundTripCareer(career, input, 'reload_after_choice');
    }
    const acquisition = career.player.skillState.acquisitions.at(-1);
    if (
      acquisition === undefined ||
      acquisition.selectedSkillId !== selectedSkillId ||
      JSON.stringify(acquisition) !== JSON.stringify({ ...offer, selectedSkillId })
    ) {
      return fail(input, 'choose_skill', 'acquisition_does_not_match_offer');
    }
    breakthrough = deepFreeze({
      offer,
      behaviorCounts: pool.behaviorCounts,
      weightedCandidates: pool.candidates,
      ownedSkillIdsBefore,
      selectedSkillId,
      equippedSkillIdsAfter: career.player.skillState.equippedSkillIds,
      acquisition,
      rngBeforeAdvance,
      rngAfterOffer,
      rngAfterChoice: career.rng,
      rngDrawCountBeforeChoice,
      rngDrawCountAfterChoice,
      revisionAfterWeekAdvance,
      revisionAfterChoice: career.revision,
    });
  }

  if (career.phase.type !== 'PLAN_ACTIONS') {
    return fail(input, 'complete_week', `invalid_phase:${career.phase.type}`);
  }
  if (!validateCareerRun(career).ok) {
    return fail(input, 'complete_week', 'invalid_result');
  }

  return deepFreeze({
    weekIndex,
    actionPlan: [...input.actionPlan] as SkillAwareWeeklyActionPlan,
    actionResults,
    passiveBodyRecovery,
    breakthrough,
    career,
  });
}
