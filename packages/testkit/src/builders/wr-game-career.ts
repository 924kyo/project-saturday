import {
  developmentWeekConfig,
  keySnapPatternMechanicsDefinitions,
  offenseStyleMechanicsDefinitions,
  prepareNextShippedGame,
  resolveShippedKeySnap,
  rotationPolicyMechanicsDefinitions,
  skillMechanicsDefinitions,
  startShippedGame,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';
import {
  advanceDevelopmentWeek,
  chooseSkillBreakthrough,
  commitWeeklyActionPlan,
  parseCareerRun,
  resolveNextWeeklyAction,
  validateCareerRun,
  type AppliedGameHookEvidence,
  type CareerRun,
  type CompletedGameSummary,
  type GameClueId,
  type GameInformationTierId,
  type GameMatchupEvidence,
  type KeySnapDecisionFamilyId,
  type KeySnapDecisionId,
  type KeySnapInformationEvidence,
  type KeySnapPatternId,
  type KeySnapPlayEvidence,
  type PostGameGrowthEvidence,
  type SkillFamilyId,
  type SkillId,
  type SkillMechanicsDefinition,
  type WeeklyActionId,
  type WeeklyActionResult,
  type DepthUpdateEvidence,
} from '@project-saturday/game-core';

export type GameCareerSerializationMode = 'none' | 'every_transition';
export type GameDecisionStrategyId = 'best_fit' | 'first_presented' | 'risk_seeking';
export type CurrentProgramWeeklyActionPlan = readonly [
  WeeklyActionId,
  WeeklyActionId,
  WeeklyActionId,
];

export interface CompleteCurrentProgramPracticeWeekInput {
  readonly actionPlan: CurrentProgramWeeklyActionPlan;
  readonly career: CareerRun;
  readonly scenarioId: string;
  readonly serializationMode?: GameCareerSerializationMode;
  readonly skillDefinitions?: readonly SkillMechanicsDefinition[];
}

export interface CompletedCurrentProgramPracticeWeek {
  readonly actionPlan: CurrentProgramWeeklyActionPlan;
  readonly actionResults: readonly [WeeklyActionResult, WeeklyActionResult, WeeklyActionResult];
  readonly career: CareerRun;
  readonly depthUpdate: DepthUpdateEvidence;
  readonly roundTripCount: number;
}

export interface ExecuteWrShippedGameInput {
  readonly career: CareerRun;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly scenarioId: string;
  readonly serializationMode?: GameCareerSerializationMode;
}

export interface WrGameDecisionTrace {
  readonly familyId: KeySnapDecisionFamilyId;
  readonly decisionId: KeySnapDecisionId;
  readonly information: KeySnapInformationEvidence;
  readonly informationGameHooks: readonly AppliedGameHookEvidence[];
  readonly informationTierId: GameInformationTierId;
  readonly patternId: KeySnapPatternId;
  readonly revealedClueIds: readonly GameClueId[];
  readonly play: KeySnapPlayEvidence;
}

export interface ExecutedWrShippedGame {
  readonly career: CareerRun;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly decisions: readonly WrGameDecisionTrace[];
  readonly growth: PostGameGrowthEvidence;
  readonly keyPlayLog: readonly KeySnapPlayEvidence[];
  readonly matchup: GameMatchupEvidence;
  readonly roundTripCount: number;
  readonly summary: CompletedGameSummary;
}

export interface AdvanceCompletedWrGameWeekInput {
  readonly career: CareerRun;
  readonly preferredSkillFamilyIds: readonly SkillFamilyId[];
  readonly scenarioId: string;
  readonly serializationMode?: GameCareerSerializationMode;
  readonly skillDefinitions?: readonly SkillMechanicsDefinition[];
}

export interface AdvancedCompletedWrGameWeek {
  readonly career: CareerRun;
  readonly roundTripCount: number;
  readonly selectedSkillId: SkillId | null;
}

export class WrGameCareerBuilderError extends Error {
  public readonly scenarioId: string;
  public readonly stage: string;

  public constructor(scenarioId: string, stage: string, reason: string) {
    super(`scenario=${JSON.stringify(scenarioId)} stage=${stage} reason=${reason}`);
    this.name = 'WrGameCareerBuilderError';
    this.scenarioId = scenarioId;
    this.stage = stage;
  }
}

function fail(scenarioId: string, stage: string, reason: string): never {
  throw new WrGameCareerBuilderError(scenarioId, stage, reason);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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

function maybeRoundTrip(
  career: CareerRun,
  scenarioId: string,
  stage: string,
  mode: GameCareerSerializationMode | undefined,
): CareerRun {
  return mode === 'every_transition' ? roundTripCareer(career, scenarioId, stage) : career;
}

function decisionForStrategy(
  career: CareerRun,
  strategyId: GameDecisionStrategyId,
  scenarioId: string,
): KeySnapDecisionId {
  if (career.phase.type !== 'KEY_SNAP') return fail(scenarioId, 'choose_decision', 'missing_snap');
  const pending = career.phase.pendingSnap;
  if (strategyId === 'first_presented') return pending.decisionIds[0];
  if (strategyId === 'risk_seeking') {
    const riskChoiceByFamily = {
      key_snap_family_release: 'key_snap_decision_speed_release',
      key_snap_family_route: 'key_snap_decision_stack_defender',
      key_snap_family_catch: 'key_snap_decision_attack_high_point',
      key_snap_family_yac: 'key_snap_decision_burst_upfield',
    } as const satisfies Readonly<Record<KeySnapDecisionFamilyId, KeySnapDecisionId>>;
    return riskChoiceByFamily[pending.familyId];
  }
  const pattern = keySnapPatternMechanicsDefinitions.find(({ id }) => id === pending.patternId);
  if (pattern === undefined) return fail(scenarioId, 'choose_decision', 'missing_pattern');
  return [...pattern.decisionFits].sort((left, right) => {
    const fitOrder = right.fit - left.fit;
    return fitOrder === 0 ? compareCodeUnits(left.decisionId, right.decisionId) : fitOrder;
  })[0]!.decisionId;
}

export function completeCurrentProgramPracticeWeek(
  input: CompleteCurrentProgramPracticeWeekInput,
): CompletedCurrentProgramPracticeWeek {
  const skillDefinitions = input.skillDefinitions ?? skillMechanicsDefinitions;
  if (
    !validateCareerRun(input.career).ok ||
    input.career.recruitingState.type !== 'COMMITTED' ||
    input.career.programContext === null ||
    input.career.phase.type !== 'PLAN_ACTIONS'
  ) {
    return fail(input.scenarioId, 'practice_setup', 'career_not_ready');
  }
  let roundTripCount = 0;
  const availableActionIds = weeklyActionDefinitions.map(({ id }) => id);
  const committed = commitWeeklyActionPlan(input.career, input.actionPlan, availableActionIds);
  if (!committed.ok) return fail(input.scenarioId, 'commit_plan', committed.reason);
  let career = maybeRoundTrip(
    committed.career,
    input.scenarioId,
    'reload_after_plan',
    input.serializationMode,
  );
  if (input.serializationMode === 'every_transition') roundTripCount += 1;

  for (const [actionIndex, actionId] of input.actionPlan.entries()) {
    const definition = weeklyActionDefinitions.find(({ id }) => id === actionId);
    if (definition === undefined) {
      return fail(input.scenarioId, `resolve_action_${actionIndex}`, 'missing_definition');
    }
    const resolved = resolveNextWeeklyAction(
      career,
      definition,
      developmentWeekConfig,
      skillDefinitions,
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
    if (input.serializationMode === 'every_transition') roundTripCount += 1;
  }
  if (career.phase.type !== 'WEEK_END' || career.phase.depthUpdate === null) {
    return fail(input.scenarioId, 'capture_week_end', 'missing_depth_update');
  }
  return Object.freeze({
    actionPlan: input.actionPlan,
    actionResults: career.phase.results,
    career,
    depthUpdate: career.phase.depthUpdate,
    roundTripCount,
  });
}

export function executeWrShippedGame(input: ExecuteWrShippedGameInput): ExecutedWrShippedGame {
  if (!validateCareerRun(input.career).ok || input.career.phase.type !== 'WEEK_END') {
    return fail(input.scenarioId, 'game_setup', 'career_not_ready');
  }
  let roundTripCount = 0;
  const prepared = prepareNextShippedGame(input.career);
  if (!prepared.ok) return fail(input.scenarioId, 'prepare_game', prepared.reason);
  let career = maybeRoundTrip(
    prepared.career,
    input.scenarioId,
    'reload_after_preview',
    input.serializationMode,
  );
  if (input.serializationMode === 'every_transition') roundTripCount += 1;
  if (career.phase.type !== 'GAME_PREVIEW') {
    return fail(input.scenarioId, 'capture_preview', 'missing_preview');
  }
  const matchup = career.phase.matchup;
  const started = startShippedGame(career);
  if (!started.ok) return fail(input.scenarioId, 'start_game', started.reason);
  career = maybeRoundTrip(
    started.career,
    input.scenarioId,
    'reload_after_start',
    input.serializationMode,
  );
  if (input.serializationMode === 'every_transition') roundTripCount += 1;

  const decisions: WrGameDecisionTrace[] = [];
  while (career.phase.type === 'KEY_SNAP') {
    const pending = career.phase.pendingSnap;
    const decisionId = decisionForStrategy(career, input.decisionStrategyId, input.scenarioId);
    const resolved = resolveShippedKeySnap(career, decisionId);
    if (!resolved.ok) {
      return fail(input.scenarioId, `resolve_snap_${decisions.length}`, resolved.reason);
    }
    const play =
      resolved.career.phase.type === 'KEY_SNAP'
        ? resolved.career.phase.game.keyPlayLog.at(-1)
        : resolved.career.phase.type === 'POST_GAME'
          ? resolved.career.phase.keyPlayLog.at(-1)
          : undefined;
    if (play === undefined) return fail(input.scenarioId, 'capture_play', 'missing_play');
    decisions.push(
      Object.freeze({
        familyId: pending.familyId,
        decisionId,
        information: pending.information,
        informationGameHooks: pending.informationGameHooks,
        informationTierId: pending.informationTierId,
        patternId: pending.patternId,
        revealedClueIds: Object.freeze([...pending.revealedClueIds]),
        play,
      }),
    );
    career = maybeRoundTrip(
      resolved.career,
      input.scenarioId,
      `reload_after_snap_${decisions.length}`,
      input.serializationMode,
    );
    if (input.serializationMode === 'every_transition') roundTripCount += 1;
  }
  if (career.phase.type !== 'POST_GAME') {
    return fail(input.scenarioId, 'capture_post_game', `unexpected_phase:${career.phase.type}`);
  }
  return Object.freeze({
    career,
    decisionStrategyId: input.decisionStrategyId,
    decisions: Object.freeze(decisions),
    growth: career.phase.growth,
    keyPlayLog: career.phase.keyPlayLog,
    matchup,
    roundTripCount,
    summary: career.phase.summary,
  });
}

export function advanceCompletedWrGameWeek(
  input: AdvanceCompletedWrGameWeekInput,
): AdvancedCompletedWrGameWeek {
  const skillDefinitions = input.skillDefinitions ?? skillMechanicsDefinitions;
  if (!validateCareerRun(input.career).ok || input.career.phase.type !== 'POST_GAME') {
    return fail(input.scenarioId, 'advance_setup', 'career_not_ready');
  }
  let roundTripCount = 0;
  const advanced = advanceDevelopmentWeek(
    input.career,
    developmentWeekConfig,
    skillDefinitions,
    weeklyActionDefinitions,
  );
  if (!advanced.ok) return fail(input.scenarioId, 'advance_week', advanced.reason);
  let career = maybeRoundTrip(
    advanced.career,
    input.scenarioId,
    'reload_after_advance',
    input.serializationMode,
  );
  if (input.serializationMode === 'every_transition') roundTripCount += 1;

  let selectedSkillId: SkillId | null = null;
  if (career.phase.type === 'SKILL_BREAKTHROUGH') {
    const preference = new Map(
      input.preferredSkillFamilyIds.map((familyId, index) => [familyId, index]),
    );
    selectedSkillId = [...career.phase.offer.offeredSkillIds].sort((leftId, rightId) => {
      const leftFamily = skillDefinitions.find(({ id }) => id === leftId)?.familyId;
      const rightFamily = skillDefinitions.find(({ id }) => id === rightId)?.familyId;
      const preferenceOrder =
        (leftFamily === undefined ? Number.MAX_SAFE_INTEGER : (preference.get(leftFamily) ?? 999)) -
        (rightFamily === undefined
          ? Number.MAX_SAFE_INTEGER
          : (preference.get(rightFamily) ?? 999));
      return preferenceOrder === 0 ? compareCodeUnits(leftId, rightId) : preferenceOrder;
    })[0]!;
    const chosen = chooseSkillBreakthrough(career, selectedSkillId);
    if (!chosen.ok) return fail(input.scenarioId, 'choose_skill', chosen.reason);
    career = maybeRoundTrip(
      chosen.career,
      input.scenarioId,
      'reload_after_skill',
      input.serializationMode,
    );
    if (input.serializationMode === 'every_transition') roundTripCount += 1;
  }
  if (career.phase.type !== 'PLAN_ACTIONS') {
    return fail(input.scenarioId, 'complete_week', `unexpected_phase:${career.phase.type}`);
  }
  return Object.freeze({ career, roundTripCount, selectedSkillId });
}
