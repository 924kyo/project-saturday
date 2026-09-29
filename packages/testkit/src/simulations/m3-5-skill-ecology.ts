import {
  CONTENT_COMPATIBILITY_VERSION,
  SKILL_BREAKTHROUGH_SOURCE_IDS,
} from '@project-saturday/game-content';
import {
  developmentWeekConfig,
  offenseStyleMechanicsDefinitions,
  rotationPolicyMechanicsDefinitions,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';
import {
  advanceHistoricalGaugeDevelopmentWeek as advanceDevelopmentWeek,
  chooseSkillBreakthrough,
  collectEquippedGameHooks,
  collectEquippedLifeHooks,
  commitWeeklyActionPlan,
  parseCareerRun,
  resolveNextWeeklyAction,
  validateCareerRun,
} from '@project-saturday/game-core';
import type {
  CareerRun,
  SkillBreakthroughSourceId,
  SkillEffectType,
  SkillFamilyId,
  SkillId,
  WeeklyActionId,
} from '@project-saturday/game-core';

import { createEnrolledWrCareerFixture } from '../builders/wr-program-career.js';
import { formatScenarioReproduction } from '../scenario.js';
import {
  HISTORICAL_M3_5_SKILL_EFFECT_TYPES,
  historicalM3_5SkillMechanicsDefinitions,
} from './historical-m3-5-skill-catalog.js';

export const M3_5_SKILL_ECOLOGY_REPORT_ID = 'm3_5_skill_ecology_v1' as const;
export const M3_5_SKILL_ECOLOGY_SEED = 'm3-depth-001' as const;
export const M3_5_SKILL_ECOLOGY_WEEK_COUNT = 13 as const;

export type M3_5SkillStrategyId = 'development_body' | 'role_preparation' | 'balanced_life_mindset';

export interface M3_5SkillStrategyDefinition {
  readonly strategyId: M3_5SkillStrategyId;
  readonly actionPlan: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
  readonly preferredFamilyIds: readonly SkillFamilyId[];
  readonly preferredSkillIds: readonly SkillId[];
}

export const M3_5_SKILL_STRATEGIES = Object.freeze([
  {
    strategyId: 'development_body',
    actionPlan: ['action_route_drills', 'action_weight_room', 'action_recovery'],
    preferredFamilyIds: ['skill_family_development', 'skill_family_body'],
    preferredSkillIds: [
      'skill_route_notebook_c',
      'skill_late_set_engine_b',
      'skill_recovery_window_c',
      'skill_first_step_lab_b',
    ],
  },
  {
    strategyId: 'role_preparation',
    actionPlan: ['action_film_study', 'action_route_drills', 'action_extra_practice'],
    preferredFamilyIds: ['skill_family_role_coach', 'skill_family_game_day'],
    preferredSkillIds: [
      'skill_assignment_echo_c',
      'skill_package_memory_b',
      'skill_clean_install_b',
      'skill_signal_reader_a',
      'skill_coaches_key_s',
    ],
  },
  {
    strategyId: 'balanced_life_mindset',
    actionPlan: ['action_film_study', 'action_recovery', 'action_study_hall'],
    preferredFamilyIds: ['skill_family_life', 'skill_family_mindset'],
    preferredSkillIds: [
      'skill_campus_bridge_b',
      'skill_composure_anchor_b',
      'skill_study_buffer_c',
      'skill_reset_ritual_b',
    ],
  },
] as const satisfies readonly M3_5SkillStrategyDefinition[]);

export interface M3_5SkillStrategyReport {
  readonly strategyId: M3_5SkillStrategyId;
  readonly reproduction: string;
  readonly actionPlan: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
  readonly acquisitionCount: number;
  readonly acquisitionWeekNumbers: readonly number[];
  readonly acquiredSkillIds: readonly SkillId[];
  readonly acquiredFamilyIds: readonly SkillFamilyId[];
  readonly sourcePointTotals: Readonly<Record<SkillBreakthroughSourceId, number>>;
  readonly appliedEffectCounts: Readonly<Record<SkillEffectType, number>>;
  readonly equippedGameHookIds: readonly string[];
  readonly equippedLifeHookIds: readonly string[];
  readonly finalGaugeProgress: number;
  readonly finalBody: number;
  readonly finalPreparation: number;
  readonly finalConfidence: number;
  readonly finalGpa: number;
  readonly initialCoachTrust: number;
  readonly finalCoachTrust: number;
  readonly initialDepthRank: number;
  readonly finalDepthRank: number;
  readonly roundTripCount: number;
}

export interface M3_5SkillEcologyReport {
  readonly reportId: typeof M3_5_SKILL_ECOLOGY_REPORT_ID;
  readonly contentCompatibilityVersion: typeof CONTENT_COMPATIBILITY_VERSION;
  readonly seed: typeof M3_5_SKILL_ECOLOGY_SEED;
  readonly weekCountPerStrategy: typeof M3_5_SKILL_ECOLOGY_WEEK_COUNT;
  readonly strategies: readonly M3_5SkillStrategyReport[];
}

export class M3_5SkillEcologySimulationError extends Error {
  public constructor(strategyId: string, stage: string, reason: string) {
    super(`strategy=${JSON.stringify(strategyId)} stage=${stage} reason=${reason}`);
    this.name = 'M3_5SkillEcologySimulationError';
  }
}

function fail(strategyId: string, stage: string, reason: string): never {
  throw new M3_5SkillEcologySimulationError(strategyId, stage, reason);
}

function roundTrip(career: CareerRun, strategyId: string, stage: string): CareerRun {
  const serialized = JSON.stringify(career);
  const parsed = parseCareerRun(serialized);
  if (!parsed.ok) {
    return fail(strategyId, stage, parsed.reason);
  }
  if (JSON.stringify(parsed.career) !== serialized) {
    return fail(strategyId, stage, 'round_trip_diverged');
  }
  return parsed.career;
}

function definitionFamily(skillId: SkillId): SkillFamilyId {
  const definition = historicalM3_5SkillMechanicsDefinitions.find(({ id }) => id === skillId);
  if (definition === undefined) {
    return fail(skillId, 'skill_definition', 'missing');
  }
  return definition.familyId;
}

function chooseStrategySkill(
  offeredSkillIds: readonly [SkillId, SkillId, SkillId],
  strategy: M3_5SkillStrategyDefinition,
): SkillId {
  return (
    strategy.preferredSkillIds.find((skillId) => offeredSkillIds.includes(skillId)) ??
    offeredSkillIds.find((skillId) =>
      strategy.preferredFamilyIds.includes(definitionFamily(skillId)),
    ) ??
    offeredSkillIds[0]
  );
}

function zeroSourceTotals(): Record<SkillBreakthroughSourceId, number> {
  return Object.fromEntries(
    SKILL_BREAKTHROUGH_SOURCE_IDS.map((sourceId) => [sourceId, 0]),
  ) as Record<SkillBreakthroughSourceId, number>;
}

function zeroEffectCounts(): Record<SkillEffectType, number> {
  return Object.fromEntries(
    HISTORICAL_M3_5_SKILL_EFFECT_TYPES.map((effectType) => [effectType, 0]),
  ) as Record<SkillEffectType, number>;
}

function runStrategy(strategy: M3_5SkillStrategyDefinition): M3_5SkillStrategyReport {
  const scenarioId = `m3_5_skill_ecology:${strategy.strategyId}`;
  const enrolled = createEnrolledWrCareerFixture({
    scenarioId,
    fixture: {
      careerSeed: M3_5_SKILL_ECOLOGY_SEED,
      displayName: 'M3.5 Skill Ecology Athlete',
      archetypeId: 'archetype_wr_route_technician',
      recruitingBackgroundId: 'background_small_town_star',
      personalityTraitIds: ['personality_competitive', 'personality_leader'],
    },
    selectedProgramId: 'program_cascade_tech',
    serializationMode: 'every_transition',
  });
  let career = enrolled.career;
  if (career.programContext === null) {
    return fail(strategy.strategyId, 'setup', 'missing_program_context');
  }
  const initialCoachTrust = career.player.state.coachTrust;
  const initialDepthRank = career.programContext.projection.rank;
  const acquisitionWeekNumbers: number[] = [];
  const acquiredSkillIds: SkillId[] = [];
  const sourcePointTotals = zeroSourceTotals();
  const appliedEffectCounts = zeroEffectCounts();
  let roundTripCount = enrolled.roundTripCount;
  const availableActionIds = weeklyActionDefinitions.map(({ id }) => id);

  for (let week = 0; week < M3_5_SKILL_ECOLOGY_WEEK_COUNT; week += 1) {
    const committed = commitWeeklyActionPlan(career, strategy.actionPlan, availableActionIds);
    if (!committed.ok) {
      return fail(strategy.strategyId, 'commit_plan', committed.reason);
    }
    career = roundTrip(committed.career, strategy.strategyId, `week_${week}_plan`);
    roundTripCount += 1;

    for (const [actionIndex, actionId] of strategy.actionPlan.entries()) {
      const definition = weeklyActionDefinitions.find(({ id }) => id === actionId);
      if (definition === undefined) {
        return fail(strategy.strategyId, 'action_definition', actionId);
      }
      const resolved = resolveNextWeeklyAction(
        career,
        definition,
        developmentWeekConfig,
        historicalM3_5SkillMechanicsDefinitions,
        offenseStyleMechanicsDefinitions,
        rotationPolicyMechanicsDefinitions,
      );
      if (!resolved.ok) {
        return fail(strategy.strategyId, `resolve_${actionIndex}`, resolved.reason);
      }
      career = roundTrip(
        resolved.career,
        strategy.strategyId,
        `week_${week}_action_${actionIndex}`,
      );
      roundTripCount += 1;
    }
    if (career.phase.type !== 'WEEK_END') {
      return fail(strategy.strategyId, 'week_end', 'missing');
    }
    for (const result of career.phase.results) {
      for (const effect of result.appliedSkillEffects) {
        appliedEffectCounts[effect.type] += 1;
      }
    }

    const advanced = advanceDevelopmentWeek(
      career,
      developmentWeekConfig,
      historicalM3_5SkillMechanicsDefinitions,
      weeklyActionDefinitions,
    );
    if (!advanced.ok) {
      return fail(strategy.strategyId, 'advance', advanced.reason);
    }
    career = roundTrip(advanced.career, strategy.strategyId, `week_${week}_advance`);
    roundTripCount += 1;
    const progress = career.player.skillState.breakthroughGauge.lastProgress;
    if (progress === null) {
      return fail(strategy.strategyId, 'gauge', 'missing_weekly_evidence');
    }
    for (const source of progress.sources) {
      sourcePointTotals[source.sourceId] += source.points;
    }

    if (career.phase.type === 'SKILL_BREAKTHROUGH') {
      const selectedSkillId = chooseStrategySkill(career.phase.offer.offeredSkillIds, strategy);
      const chosen = chooseSkillBreakthrough(career, selectedSkillId);
      if (!chosen.ok) {
        return fail(strategy.strategyId, 'choose_skill', chosen.reason);
      }
      acquisitionWeekNumbers.push(career.phase.offer.weekIndex);
      acquiredSkillIds.push(selectedSkillId);
      career = roundTrip(chosen.career, strategy.strategyId, `week_${week}_choice`);
      roundTripCount += 1;
    }
  }

  if (!validateCareerRun(career).ok || career.programContext === null) {
    return fail(strategy.strategyId, 'final', 'invalid_career');
  }
  const gameHooks = collectEquippedGameHooks(
    career.player.skillState,
    historicalM3_5SkillMechanicsDefinitions,
  );
  const lifeHooks = collectEquippedLifeHooks(
    career.player.skillState,
    historicalM3_5SkillMechanicsDefinitions,
  );
  if (!gameHooks.ok || !lifeHooks.ok) {
    return fail(strategy.strategyId, 'final_hooks', 'invalid_registry');
  }

  return Object.freeze({
    strategyId: strategy.strategyId,
    reproduction: formatScenarioReproduction({ scenarioId, seed: M3_5_SKILL_ECOLOGY_SEED }),
    actionPlan: strategy.actionPlan,
    acquisitionCount: acquiredSkillIds.length,
    acquisitionWeekNumbers: Object.freeze(acquisitionWeekNumbers),
    acquiredSkillIds: Object.freeze(acquiredSkillIds),
    acquiredFamilyIds: Object.freeze(acquiredSkillIds.map(definitionFamily)),
    sourcePointTotals: Object.freeze(sourcePointTotals),
    appliedEffectCounts: Object.freeze(appliedEffectCounts),
    equippedGameHookIds: Object.freeze(gameHooks.hooks.map(({ hookId }) => hookId)),
    equippedLifeHookIds: Object.freeze(lifeHooks.hooks.map(({ hookId }) => hookId)),
    finalGaugeProgress: career.player.skillState.breakthroughGauge.progress,
    finalBody: career.player.state.body,
    finalPreparation: career.player.state.preparation,
    finalConfidence: career.player.state.confidence,
    finalGpa: career.player.state.gpa,
    initialCoachTrust,
    finalCoachTrust: career.player.state.coachTrust,
    initialDepthRank,
    finalDepthRank: career.programContext.projection.rank,
    roundTripCount,
  });
}

export function runM3_5SkillEcologyReport(): M3_5SkillEcologyReport {
  return Object.freeze({
    reportId: M3_5_SKILL_ECOLOGY_REPORT_ID,
    contentCompatibilityVersion: CONTENT_COMPATIBILITY_VERSION,
    seed: M3_5_SKILL_ECOLOGY_SEED,
    weekCountPerStrategy: M3_5_SKILL_ECOLOGY_WEEK_COUNT,
    strategies: Object.freeze(M3_5_SKILL_STRATEGIES.map(runStrategy)),
  });
}

export function formatM3_5SkillEcologyReport(report: M3_5SkillEcologyReport): string {
  return JSON.stringify(report);
}
