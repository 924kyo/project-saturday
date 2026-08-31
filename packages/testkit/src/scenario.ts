import { createRng, restoreRngState } from '@project-saturday/game-core';
import type { RngSample, RngSeed, RngState } from '@project-saturday/game-core';

export interface SeededScenarioDefinition<T> {
  readonly scenarioId: string;
  readonly seed: RngSeed;
  readonly run: (rng: RngState) => RngSample<T>;
}

export interface ScenarioReproduction {
  readonly scenarioId: string;
  readonly seed: RngSeed;
}

export interface SeededScenarioReport<T> extends ScenarioReproduction {
  readonly result: T;
  readonly finalRng: RngState;
  readonly reproduction: string;
}

export class SeededScenarioExecutionError extends Error {
  public readonly reproduction: string;

  public constructor(reproduction: string, cause: unknown) {
    super(`Seeded scenario failed: ${reproduction}`, { cause });
    this.name = 'SeededScenarioExecutionError';
    this.reproduction = reproduction;
  }
}

export function formatScenarioReproduction(reproduction: ScenarioReproduction): string {
  if (reproduction.scenarioId.length === 0) {
    throw new RangeError('Scenario IDs must not be empty.');
  }

  createRng(reproduction.seed);

  return `scenario=${JSON.stringify(reproduction.scenarioId)} seed=${JSON.stringify(reproduction.seed)}`;
}

export function runSeededScenario<T>(
  definition: SeededScenarioDefinition<T>,
): SeededScenarioReport<T> {
  const reproduction = Object.freeze({
    scenarioId: definition.scenarioId,
    seed: definition.seed,
  });
  const reproductionText = formatScenarioReproduction(reproduction);

  let execution: RngSample<T>;
  let finalRng: RngState;

  try {
    execution = definition.run(createRng(definition.seed));
    finalRng = restoreRngState(execution.nextRng);
  } catch (cause) {
    throw new SeededScenarioExecutionError(reproductionText, cause);
  }

  return Object.freeze({
    ...reproduction,
    result: execution.value,
    finalRng,
    reproduction: reproductionText,
  });
}
