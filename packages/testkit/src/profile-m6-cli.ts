import {
  executeWrOffFieldCareer,
  type M6OperationProfileSample,
} from './builders/wr-off-field-career.js';
import {
  M6_OFF_FIELD_SCENARIOS,
  type M6OffFieldScenarioDefinition,
} from './simulations/m6-off-field-transfer.js';

const MAX_OPERATION_MS = 1_000;
const operationOrder = [
  'weekly_boundary',
  'world_round',
  'offseason_projection',
  'offseason_decision',
  'next_season_bootstrap',
] as const satisfies readonly M6OperationProfileSample['operationId'][];

function percentile95(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function executeProfileScenario(
  scenario: M6OffFieldScenarioDefinition,
  samples: M6OperationProfileSample[],
): void {
  executeWrOffFieldCareer({
    scenarioId: `m6_profile:${scenario.scenarioProfileId}`,
    fixture: {
      careerSeed: scenario.seed,
      displayName: 'M6 Performance Profile Athlete',
      archetypeId: scenario.archetypeId,
      recruitingBackgroundId: scenario.recruitingBackgroundId,
      baseStateOverrides: {
        state_brand: scenario.initialBrand,
        state_gpa: scenario.initialGpa,
      },
    },
    actionPlan: scenario.actionPlan,
    decisionStrategyId: scenario.decisionStrategyId,
    eventChoicePolicy: scenario.eventChoicePolicy,
    injuryChoicePolicy: scenario.injuryChoicePolicy,
    preferredSkillFamilyIds: scenario.preferredSkillFamilyIds,
    skillChoicePolicy: 'preferred_family',
    programSelectionPolicy: scenario.programSelectionPolicy,
    nilDecisionPolicy: scenario.nilDecisionPolicy,
    offseasonChoicePolicy: scenario.offseasonChoicePolicy,
    serializationMode: 'none',
    operationObserver: (sample) => samples.push(sample),
  });
}

const samples: M6OperationProfileSample[] = [];
const profileScenarios = [M6_OFF_FIELD_SCENARIOS[0], M6_OFF_FIELD_SCENARIOS[1]];

for (let repetition = 0; repetition < 3; repetition += 1) {
  for (const scenario of profileScenarios) executeProfileScenario(scenario, samples);
}

const operations = operationOrder.map((operationId) => {
  const elapsedValues = samples
    .filter((sample) => sample.operationId === operationId)
    .map(({ elapsedMs }) => elapsedMs);
  const maxMs = Math.max(...elapsedValues);
  if (maxMs >= MAX_OPERATION_MS) {
    throw new Error(`${operationId} exceeded the ${MAX_OPERATION_MS} ms profile bound.`);
  }
  return Object.freeze({
    operationId,
    sampleCount: elapsedValues.length,
    meanMs: roundMilliseconds(
      elapsedValues.reduce((total, elapsedMs) => total + elapsedMs, 0) / elapsedValues.length,
    ),
    p95Ms: roundMilliseconds(percentile95(elapsedValues)),
    maxMs: roundMilliseconds(maxMs),
  });
});

process.stdout.write(
  `${JSON.stringify({
    profileId: 'm6_engine_operations_v1',
    scenarioCount: profileScenarios.length,
    repetitions: 3,
    serializationMode: 'none',
    maxOperationBoundMs: MAX_OPERATION_MS,
    operations,
  })}\n`,
);
