import { readFileSync } from 'node:fs';

import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import {
  developmentWeekConfig,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';
import {
  BODY_BOUNDS,
  GPA_BOUNDS,
  TRAINING_PROFICIENCY_IDS,
  TRAINING_PROFICIENCY_USE_HARD_CAP,
  WEEKLY_ACTION_IDS,
  validateCareerRun,
} from '@project-saturday/game-core';
import type { RngSeed, WeeklyActionDefinition } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  M1_DEVELOPMENT_SCENARIOS,
  M1_DEVELOPMENT_SIMULATION_SEEDS,
  M1_WR_AVAILABLE_ACTION_IDS,
  createWrCareerFixture,
  formatM1DevelopmentSimulationReport,
  runM1DevelopmentSimulationReport,
  simulateDevelopmentWeeks,
  type WeeklyActionPlan,
} from '../../src/index.js';
import type { DevelopmentWeekSimulationError } from '../../src/index.js';

const BODY_STABLE_PERSONALITIES = ['personality_quiet', 'personality_disciplined'] as const;

function careerAtBody(seed: RngSeed, body: number) {
  return createWrCareerFixture({
    careerSeed: seed,
    personalityTraitIds: BODY_STABLE_PERSONALITIES,
    baseStateOverrides: { state_body: body },
  });
}

function simulate(
  scenarioId: string,
  seed: RngSeed,
  body: number,
  weekCount: number,
  repeatedActionPlan: WeeklyActionPlan,
  serializationMode: 'none' | 'every_transition' = 'none',
) {
  return simulateDevelopmentWeeks({
    scenarioId,
    initialCareer: careerAtBody(seed, body),
    weekCount,
    repeatedActionPlan,
    availableActionIds: M1_WR_AVAILABLE_ACTION_IDS,
    actionDefinitions: weeklyActionDefinitions,
    config: developmentWeekConfig,
    serializationMode,
  });
}

function resultForAction(report: ReturnType<typeof simulate>, actionId: WeeklyActionPlan[number]) {
  return report.weeks
    .flatMap((week) => week.results)
    .filter((result) => result.actionId === actionId);
}

describe('deterministic multi-week development simulation', () => {
  it('repeats exact plans through real commands while preserving every invariant and RNG state', () => {
    const report = simulate('repeated_route_recovery', 'repeat-plan-seed', 80, 16, [
      'action_route_drills',
      'action_route_drills',
      'action_recovery',
    ]);
    const replay = simulate('repeated_route_recovery', 'repeat-plan-seed', 80, 16, [
      'action_route_drills',
      'action_route_drills',
      'action_recovery',
    ]);

    expect(report).toEqual(replay);
    expect(report.finalCareer.weekIndex).toBe(16);
    expect(report.finalCareer.revision).toBe(80);
    expect(report.finalCareer.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(report.actionUseCounts.action_route_drills).toBe(32);
    expect(report.actionUseCounts.action_recovery).toBe(16);
    expect(report.weeks).toHaveLength(16);
    expect(report.weeks.every((week) => week.results.length === 3)).toBe(true);
    expect(validateCareerRun(report.finalCareer)).toEqual({ ok: true, issues: [] });
    expect(report.finalCareer.rng).toEqual(report.initialCareer.rng);
    expect(report.finalCareer.rng.drawCount).toBe(0);
  });

  it('produces the same continuation when every authoritative phase is JSON serialized', () => {
    const uninterrupted = simulate(
      'serialization_equivalence',
      'serialization-seed',
      85,
      12,
      ['action_speed_work', 'action_recovery', 'action_route_drills'],
      'none',
    );
    const serialized = simulate(
      'serialization_equivalence',
      'serialization-seed',
      85,
      12,
      ['action_speed_work', 'action_recovery', 'action_route_drills'],
      'every_transition',
    );

    expect(serialized.finalCareer).toEqual(uninterrupted.finalCareer);
    expect(serialized.weeks).toEqual(uninterrupted.weeks);
    expect(serialized.actionUseCounts).toEqual(uninterrupted.actionUseCounts);
    expect(serialized.totalAwardedXp).toBe(uninterrupted.totalAwardedXp);
    expect(serialized.finalCareer.rng).toEqual(uninterrupted.finalCareer.rng);
  });

  it('shows strictly lower smooth training efficiency at low Body with identical inputs', () => {
    const plan = ['action_route_drills', 'action_study_hall', 'action_study_hall'] as const;
    const lowBody = simulate('low_body_efficiency', 'body-comparison', 20, 1, plan);
    const highBody = simulate('high_body_efficiency', 'body-comparison', 80, 1, plan);
    const lowResult = lowBody.weeks[0]?.results[0];
    const highResult = highBody.weeks[0]?.results[0];

    expect(lowResult?.bodyXpEfficiencyPermille).toBe(680);
    expect(highResult?.bodyXpEfficiencyPermille).toBe(920);
    expect(lowResult?.attributeXp[0]?.awardedXp).toBeLessThan(
      highResult?.attributeXp[0]?.awardedXp ?? 0,
    );
  });

  it('demonstrates Recovery value against the same two training actions without hiding its slot cost', () => {
    const withoutRecovery = simulate('paired_without_recovery', 'recovery-value', 80, 8, [
      'action_speed_work',
      'action_route_drills',
      'action_study_hall',
    ]);
    const withRecovery = simulate('paired_with_recovery', 'recovery-value', 80, 8, [
      'action_speed_work',
      'action_route_drills',
      'action_recovery',
    ]);

    expect(withRecovery.finalCareer.player.state.body).toBeGreaterThan(
      withoutRecovery.finalCareer.player.state.body,
    );
    expect(withRecovery.minimumBody).toBeGreaterThan(withoutRecovery.minimumBody);
    expect(withRecovery.totalAwardedXp).toBeGreaterThan(withoutRecovery.totalAwardedXp);
    expect(withoutRecovery.finalCareer.player.state.gpa).toBeGreaterThan(
      withRecovery.finalCareer.player.state.gpa,
    );
    expect(withRecovery.actionUseCounts.action_recovery).toBe(8);
    expect(withoutRecovery.actionUseCounts.action_study_hall).toBe(8);
  });

  it('crosses every proficiency threshold, caps uses, and preserves diminishing marginal bonuses', () => {
    const report = simulate('proficiency_thresholds', 'proficiency-seed', 100, 24, [
      'action_route_drills',
      'action_recovery',
      'action_study_hall',
    ]);
    const routeResults = resultForAction(report, 'action_route_drills');
    const observedThresholdLevels = routeResults
      .map((result) => result.proficiency)
      .filter((result) =>
        result === null
          ? false
          : developmentWeekConfig.proficiencyUseThresholds.some(
              (threshold) => threshold === result.usesAfter,
            ),
      )
      .map((result) => [result?.usesAfter, result?.levelAfter]);
    const multiplierIncreases = developmentWeekConfig.proficiencyXpMultipliersPermille
      .slice(1)
      .map(
        (multiplier, index) =>
          multiplier - developmentWeekConfig.proficiencyXpMultipliersPermille[index]!,
      );

    expect(observedThresholdLevels).toEqual([
      [2, 1],
      [5, 2],
      [9, 3],
      [14, 4],
      [20, 5],
      [20, 5],
      [20, 5],
      [20, 5],
      [20, 5],
    ]);
    expect(report.finalCareer.player.trainingProficiencyUses.proficiency_route_drills).toBe(20);
    expect(Math.max(...routeResults.map((result) => result.proficiency?.usesAfter ?? 0))).toBe(20);
    expect(multiplierIncreases).toEqual([80, 60, 40, 30, 20]);
    expect(
      multiplierIncreases.every(
        (value, index) => index === 0 || value < multiplierIncreases[index - 1]!,
      ),
    ).toBe(true);
  });

  it('includes reproduction context when injected content cannot resolve a queued action', () => {
    const definitionsWithoutRoute = weeklyActionDefinitions.filter(
      (definition) => definition.id !== 'action_route_drills',
    ) as readonly WeeklyActionDefinition[];

    expect(() =>
      simulateDevelopmentWeeks({
        scenarioId: 'missing_definition',
        initialCareer: careerAtBody('missing-definition-seed', 80),
        weekCount: 1,
        repeatedActionPlan: ['action_route_drills', 'action_recovery', 'action_study_hall'],
        availableActionIds: M1_WR_AVAILABLE_ACTION_IDS,
        actionDefinitions: definitionsWithoutRoute,
        config: developmentWeekConfig,
      }),
    ).toThrowError(
      expect.objectContaining({
        name: 'DevelopmentWeekSimulationError',
        reproduction: 'scenario="missing_definition" seed="missing-definition-seed"',
        stage: 'resolve_action_0',
      }) as DevelopmentWeekSimulationError,
    );
  });
});

describe('named M1 development simulation report', () => {
  it('runs named plans across many reproduction seeds and reports every bound', () => {
    const report = runM1DevelopmentSimulationReport();

    expect(report.seedCount).toBe(M1_DEVELOPMENT_SIMULATION_SEEDS.length);
    expect(report.contentCompatibilityVersion).toBe(CONTENT_COMPATIBILITY_VERSION);
    expect(report.scenarioCount).toBe(M1_DEVELOPMENT_SCENARIOS.length);
    expect(report.totalCareers).toBe(72);
    expect(report.totalWeeks).toBe(1_152);
    expect(report.scenarios.map((scenario) => scenario.scenarioId)).toEqual([
      'route_proficiency_calibration',
      'high_workload_without_recovery',
      'recovery_supported_training',
    ]);
    for (const scenario of report.scenarios) {
      expect(scenario.reproductionSeeds).toHaveLength(24);
      expect(scenario.body.min).toBeGreaterThanOrEqual(BODY_BOUNDS.min);
      expect(scenario.body.max).toBeLessThanOrEqual(BODY_BOUNDS.max);
      expect(scenario.gpa.min).toBeGreaterThanOrEqual(GPA_BOUNDS.min);
      expect(scenario.gpa.max).toBeLessThanOrEqual(GPA_BOUNDS.max);
      expect(scenario.attributeRating.min).toBeGreaterThanOrEqual(0);
      expect(scenario.attributeRating.max).toBeLessThanOrEqual(100);
      expect(scenario.finalRevision.min).toBe(scenario.weekCountPerCareer * 5);
      expect(scenario.finalRevision.max).toBe(scenario.weekCountPerCareer * 5);
      expect(scenario.careerRngDrawCount).toEqual({ min: 0, max: 0 });
      for (const proficiencyId of TRAINING_PROFICIENCY_IDS) {
        expect(scenario.maximumProficiencyUses[proficiencyId]).toBeLessThanOrEqual(
          Math.min(
            TRAINING_PROFICIENCY_USE_HARD_CAP,
            developmentWeekConfig.proficiencyUseThresholds.at(-1)!,
          ),
        );
        expect(scenario.maximumProficiencyLevels[proficiencyId]).toBeLessThanOrEqual(5);
      }
      expect(Object.values(scenario.archetypeCounts).every((count) => count > 0)).toBe(true);
      expect(Object.values(scenario.recruitingBackgroundCounts).every((count) => count > 0)).toBe(
        true,
      );
      expect(
        Object.values(scenario.actionUseCounts).reduce((total, count) => total + count, 0),
      ).toBe(scenario.careerCount * scenario.weekCountPerCareer * 3);
    }
  });

  it('emits stable machine-readable JSON and replays exactly', () => {
    const options = { seeds: ['report-a', 'report-b', 'report-c'] } as const;
    const first = runM1DevelopmentSimulationReport(options);
    const replay = runM1DevelopmentSimulationReport(options);
    const formatted = formatM1DevelopmentSimulationReport(first);

    expect(first).toEqual(replay);
    expect(formatM1DevelopmentSimulationReport(replay)).toBe(formatted);
    expect(JSON.parse(formatted)).toEqual(first);
    expect(formatted).not.toContain('generatedAt');
    expect(formatted).toContain('scenario=\\"route_proficiency_calibration\\" seed=\\"report-a\\"');
  });

  it('keeps the checked-in baseline report synchronized with deterministic simulation output', () => {
    const checkedInReport = readFileSync(
      new URL('../../reports/m1-development-baseline.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();
    const generatedReport = formatM1DevelopmentSimulationReport(runM1DevelopmentSimulationReport());

    expect(checkedInReport).toBe(generatedReport);
  });

  it('exposes every current WR-available content action without assuming catalog indexes', () => {
    expect(M1_WR_AVAILABLE_ACTION_IDS).toEqual(WEEKLY_ACTION_IDS);
  });
});
