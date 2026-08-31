import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import {
  developmentWeekConfig,
  getAvailableWeeklyActionEntries,
} from '@project-saturday/game-content/content';
import {
  MENTAL_ATTRIBUTE_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  RECRUITING_BACKGROUND_IDS,
  TRAINING_PROFICIENCY_IDS,
  WEEKLY_ACTION_IDS,
  WR_ARCHETYPE_IDS,
  WR_ATTRIBUTE_IDS,
  createRng,
  deriveTrainingProficiencyLevel,
  sampleOne,
} from '@project-saturday/game-core';
import type {
  CareerRun,
  PersonalityTraitId,
  RecruitingBackgroundId,
  RngSeed,
  TrainingProficiencyId,
  WeeklyActionId,
  WrArchetypeId,
} from '@project-saturday/game-core';

import { createWrCareerFixture, type WrCareerFixtureOptions } from '../builders/wr-career.js';
import { formatScenarioReproduction } from '../scenario.js';
import {
  simulateDevelopmentWeeks,
  type CareerSerializationMode,
  type DevelopmentWeekSimulationReport,
  type WeeklyActionPlan,
} from './development-week.js';

export const M1_DEVELOPMENT_SIMULATION_REPORT_ID = 'm1_development_baseline_v1' as const;

export const M1_DEVELOPMENT_SIMULATION_SEEDS = Object.freeze([
  'm1-development-001',
  'm1-development-002',
  'm1-development-003',
  'm1-development-004',
  'm1-development-005',
  'm1-development-006',
  'm1-development-007',
  'm1-development-008',
  'm1-development-009',
  'm1-development-010',
  'm1-development-011',
  'm1-development-012',
  'm1-development-013',
  'm1-development-014',
  'm1-development-015',
  'm1-development-016',
  'm1-development-017',
  'm1-development-018',
  'm1-development-019',
  'm1-development-020',
  'm1-development-021',
  'm1-development-022',
  'm1-development-023',
  'm1-development-024',
] as const satisfies readonly RngSeed[]);

const BODY_NEUTRAL_PERSONALITY_PAIRS = Object.freeze([
  ['personality_quiet', 'personality_disciplined'],
  ['personality_disciplined', 'personality_independent'],
  ['personality_social', 'personality_independent'],
  ['personality_quiet', 'personality_confident'],
] as const satisfies readonly (readonly [PersonalityTraitId, PersonalityTraitId])[]);

export interface M1DevelopmentScenarioDefinition {
  readonly scenarioId:
    | 'route_proficiency_calibration'
    | 'high_workload_without_recovery'
    | 'recovery_supported_training';
  readonly weekCount: number;
  readonly repeatedActionPlan: WeeklyActionPlan;
  readonly baselineBody: number;
}

export const M1_DEVELOPMENT_SCENARIOS = Object.freeze([
  {
    scenarioId: 'route_proficiency_calibration',
    weekCount: 24,
    repeatedActionPlan: ['action_route_drills', 'action_recovery', 'action_study_hall'],
    baselineBody: 100,
  },
  {
    scenarioId: 'high_workload_without_recovery',
    weekCount: 12,
    repeatedActionPlan: ['action_speed_work', 'action_route_drills', 'action_study_hall'],
    baselineBody: 80,
  },
  {
    scenarioId: 'recovery_supported_training',
    weekCount: 12,
    repeatedActionPlan: ['action_speed_work', 'action_route_drills', 'action_recovery'],
    baselineBody: 80,
  },
] as const satisfies readonly M1DevelopmentScenarioDefinition[]);

const M1_WR_AVAILABLE_ACTION_ENTRIES = getAvailableWeeklyActionEntries('position_wr');

export const M1_WR_AVAILABLE_ACTION_IDS = Object.freeze(
  M1_WR_AVAILABLE_ACTION_ENTRIES.map(({ definition }) => definition.id),
) as readonly WeeklyActionId[];

const M1_WR_AVAILABLE_ACTION_DEFINITIONS = Object.freeze(
  M1_WR_AVAILABLE_ACTION_ENTRIES.map(({ definition }) => definition),
);

export interface M1DevelopmentSimulationReportOptions {
  readonly seeds?: readonly RngSeed[];
  readonly serializationMode?: CareerSerializationMode;
}

export interface NumericRangeReport {
  readonly min: number;
  readonly max: number;
}

export interface M1DevelopmentScenarioReport {
  readonly scenarioId: M1DevelopmentScenarioDefinition['scenarioId'];
  readonly weekCountPerCareer: number;
  readonly careerCount: number;
  readonly repeatedActionPlan: WeeklyActionPlan;
  readonly reproductionSeeds: readonly string[];
  readonly archetypeCounts: Readonly<Record<WrArchetypeId, number>>;
  readonly recruitingBackgroundCounts: Readonly<Record<RecruitingBackgroundId, number>>;
  readonly actionUseCounts: Readonly<Record<WeeklyActionId, number>>;
  readonly body: NumericRangeReport & { readonly averageFinal: number };
  readonly gpa: NumericRangeReport;
  readonly attributeRating: NumericRangeReport;
  readonly totalAwardedXp: number;
  readonly totalAppliedXp: number;
  readonly maximumProficiencyUses: Readonly<Record<TrainingProficiencyId, number>>;
  readonly maximumProficiencyLevels: Readonly<Record<TrainingProficiencyId, number>>;
  readonly finalRevision: NumericRangeReport;
  readonly careerRngDrawCount: NumericRangeReport;
}

export interface M1DevelopmentSimulationReport {
  readonly reportId: typeof M1_DEVELOPMENT_SIMULATION_REPORT_ID;
  readonly contentCompatibilityVersion: typeof CONTENT_COMPATIBILITY_VERSION;
  readonly seeds: readonly RngSeed[];
  readonly seedCount: number;
  readonly serializationMode: CareerSerializationMode;
  readonly scenarioCount: number;
  readonly totalCareers: number;
  readonly totalWeeks: number;
  readonly scenarios: readonly M1DevelopmentScenarioReport[];
}

function pickFixtureValue<T>(values: readonly T[], careerSeed: RngSeed, domain: string): T {
  // This harness-only RNG selects fixture coverage; CareerRun RNG remains untouched at draw zero.
  return sampleOne(createRng(`${domain}|${typeof careerSeed}:${String(careerSeed)}`), values).value;
}

function fixtureOptionsForSeed(
  scenario: M1DevelopmentScenarioDefinition,
  careerSeed: RngSeed,
): WrCareerFixtureOptions {
  return {
    careerSeed,
    displayName: 'Simulation Athlete',
    archetypeId: pickFixtureValue(WR_ARCHETYPE_IDS, careerSeed, 'm1-fixture-archetype'),
    recruitingBackgroundId: pickFixtureValue(
      RECRUITING_BACKGROUND_IDS,
      careerSeed,
      'm1-fixture-background',
    ),
    personalityTraitIds: pickFixtureValue(
      BODY_NEUTRAL_PERSONALITY_PAIRS,
      careerSeed,
      'm1-fixture-personality',
    ),
    baseStateOverrides: { state_body: scenario.baselineBody },
  };
}

function emptyActionCounts(): Record<WeeklyActionId, number> {
  return Object.fromEntries(WEEKLY_ACTION_IDS.map((actionId) => [actionId, 0])) as Record<
    WeeklyActionId,
    number
  >;
}

function emptyArchetypeCounts(): Record<WrArchetypeId, number> {
  return Object.fromEntries(WR_ARCHETYPE_IDS.map((archetypeId) => [archetypeId, 0])) as Record<
    WrArchetypeId,
    number
  >;
}

function emptyBackgroundCounts(): Record<RecruitingBackgroundId, number> {
  return Object.fromEntries(
    RECRUITING_BACKGROUND_IDS.map((backgroundId) => [backgroundId, 0]),
  ) as Record<RecruitingBackgroundId, number>;
}

function emptyProficiencyValues(): Record<TrainingProficiencyId, number> {
  return Object.fromEntries(
    TRAINING_PROFICIENCY_IDS.map((proficiencyId) => [proficiencyId, 0]),
  ) as Record<TrainingProficiencyId, number>;
}

function ratings(career: CareerRun): readonly number[] {
  return [
    ...PHYSICAL_ATTRIBUTE_IDS.map(
      (attributeId) => career.player.attributes.physical[attributeId].rating,
    ),
    ...MENTAL_ATTRIBUTE_IDS.map(
      (attributeId) => career.player.attributes.mental[attributeId].rating,
    ),
    ...WR_ATTRIBUTE_IDS.map((attributeId) => career.player.attributes.wr[attributeId].rating),
  ];
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function summarizeScenario(
  scenario: M1DevelopmentScenarioDefinition,
  simulations: readonly DevelopmentWeekSimulationReport[],
): M1DevelopmentScenarioReport {
  const actionUseCounts = emptyActionCounts();
  const archetypeCounts = emptyArchetypeCounts();
  const recruitingBackgroundCounts = emptyBackgroundCounts();
  const maximumProficiencyUses = emptyProficiencyValues();
  const maximumProficiencyLevels = emptyProficiencyValues();
  let minimumBody = Number.POSITIVE_INFINITY;
  let maximumBody = Number.NEGATIVE_INFINITY;
  let finalBodyTotal = 0;
  let minimumGpa = Number.POSITIVE_INFINITY;
  let maximumGpa = Number.NEGATIVE_INFINITY;
  let minimumRating = Number.POSITIVE_INFINITY;
  let maximumRating = Number.NEGATIVE_INFINITY;
  let totalAwardedXp = 0;
  let totalAppliedXp = 0;
  let minimumRevision = Number.POSITIVE_INFINITY;
  let maximumRevision = Number.NEGATIVE_INFINITY;
  let minimumDrawCount = Number.POSITIVE_INFINITY;
  let maximumDrawCount = Number.NEGATIVE_INFINITY;

  for (const simulation of simulations) {
    archetypeCounts[simulation.finalCareer.player.archetypeId] += 1;
    recruitingBackgroundCounts[simulation.finalCareer.player.recruitingBackgroundId] += 1;
    for (const actionId of WEEKLY_ACTION_IDS) {
      actionUseCounts[actionId] += simulation.actionUseCounts[actionId];
    }
    minimumBody = Math.min(minimumBody, simulation.minimumBody);
    maximumBody = Math.max(maximumBody, simulation.maximumBody);
    finalBodyTotal += simulation.finalCareer.player.state.body;
    minimumGpa = Math.min(minimumGpa, simulation.minimumGpa);
    maximumGpa = Math.max(maximumGpa, simulation.maximumGpa);
    for (const rating of ratings(simulation.finalCareer)) {
      minimumRating = Math.min(minimumRating, rating);
      maximumRating = Math.max(maximumRating, rating);
    }
    totalAwardedXp += simulation.totalAwardedXp;
    totalAppliedXp += simulation.totalAppliedXp;
    minimumRevision = Math.min(minimumRevision, simulation.finalCareer.revision);
    maximumRevision = Math.max(maximumRevision, simulation.finalCareer.revision);
    minimumDrawCount = Math.min(minimumDrawCount, simulation.finalCareer.rng.drawCount);
    maximumDrawCount = Math.max(maximumDrawCount, simulation.finalCareer.rng.drawCount);
    for (const proficiencyId of TRAINING_PROFICIENCY_IDS) {
      const uses = simulation.finalCareer.player.trainingProficiencyUses[proficiencyId];
      maximumProficiencyUses[proficiencyId] = Math.max(maximumProficiencyUses[proficiencyId], uses);
      maximumProficiencyLevels[proficiencyId] = Math.max(
        maximumProficiencyLevels[proficiencyId],
        deriveTrainingProficiencyLevel(uses, developmentWeekConfig),
      );
    }
  }

  return Object.freeze({
    scenarioId: scenario.scenarioId,
    weekCountPerCareer: scenario.weekCount,
    careerCount: simulations.length,
    repeatedActionPlan: Object.freeze([...scenario.repeatedActionPlan]) as WeeklyActionPlan,
    reproductionSeeds: Object.freeze(simulations.map((simulation) => simulation.reproduction)),
    archetypeCounts: Object.freeze(archetypeCounts),
    recruitingBackgroundCounts: Object.freeze(recruitingBackgroundCounts),
    actionUseCounts: Object.freeze(actionUseCounts),
    body: Object.freeze({
      min: minimumBody,
      max: maximumBody,
      averageFinal: roundToTwoDecimals(finalBodyTotal / simulations.length),
    }),
    gpa: Object.freeze({ min: minimumGpa, max: maximumGpa }),
    attributeRating: Object.freeze({ min: minimumRating, max: maximumRating }),
    totalAwardedXp,
    totalAppliedXp,
    maximumProficiencyUses: Object.freeze(maximumProficiencyUses),
    maximumProficiencyLevels: Object.freeze(maximumProficiencyLevels),
    finalRevision: Object.freeze({ min: minimumRevision, max: maximumRevision }),
    careerRngDrawCount: Object.freeze({ min: minimumDrawCount, max: maximumDrawCount }),
  });
}

export function runM1DevelopmentSimulationReport(
  options: M1DevelopmentSimulationReportOptions = {},
): M1DevelopmentSimulationReport {
  const seeds = options.seeds ?? M1_DEVELOPMENT_SIMULATION_SEEDS;
  if (seeds.length === 0) {
    throw new RangeError('At least one reproduction seed is required.');
  }
  const serializationMode = options.serializationMode ?? 'none';
  const scenarioReports: M1DevelopmentScenarioReport[] = [];

  for (const scenario of M1_DEVELOPMENT_SCENARIOS) {
    const simulations = seeds.map((careerSeed) =>
      simulateDevelopmentWeeks({
        scenarioId: scenario.scenarioId,
        initialCareer: createWrCareerFixture(fixtureOptionsForSeed(scenario, careerSeed)),
        weekCount: scenario.weekCount,
        repeatedActionPlan: scenario.repeatedActionPlan,
        availableActionIds: M1_WR_AVAILABLE_ACTION_IDS,
        actionDefinitions: M1_WR_AVAILABLE_ACTION_DEFINITIONS,
        config: developmentWeekConfig,
        serializationMode,
      }),
    );
    scenarioReports.push(summarizeScenario(scenario, simulations));
  }

  return Object.freeze({
    reportId: M1_DEVELOPMENT_SIMULATION_REPORT_ID,
    contentCompatibilityVersion: CONTENT_COMPATIBILITY_VERSION,
    seeds: Object.freeze([...seeds]),
    seedCount: seeds.length,
    serializationMode,
    scenarioCount: scenarioReports.length,
    totalCareers: seeds.length * scenarioReports.length,
    totalWeeks: scenarioReports.reduce(
      (total, scenario) => total + scenario.careerCount * scenario.weekCountPerCareer,
      0,
    ),
    scenarios: Object.freeze(scenarioReports),
  });
}

export function formatM1DevelopmentSimulationReport(report: M1DevelopmentSimulationReport): string {
  return JSON.stringify(report);
}

export function reproductionForM1DevelopmentScenario(
  scenarioId: M1DevelopmentScenarioDefinition['scenarioId'],
  seed: RngSeed,
): string {
  return formatScenarioReproduction({ scenarioId, seed });
}
