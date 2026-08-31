import { nextInt } from '@project-saturday/game-core';
import type { RngSample, RngState } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';
import {
  SeededScenarioExecutionError,
  formatScenarioReproduction,
  runSeededScenario,
} from '../src/index.js';

interface ThreeDrawResult {
  readonly values: readonly number[];
}

function drawThree(rng: RngState): RngSample<ThreeDrawResult> {
  const values: number[] = [];
  let currentRng = rng;

  for (let index = 0; index < 3; index += 1) {
    const sample = nextInt(currentRng, 1, 101);
    values.push(sample.value);
    currentRng = sample.nextRng;
  }

  return Object.freeze({
    value: Object.freeze({ values: Object.freeze(values) }),
    nextRng: currentRng,
  });
}

describe('seeded scenario helper', () => {
  it('reports enough information to replay a deterministic scenario', () => {
    const definition = {
      scenarioId: 'rng_three_draws',
      seed: 20_260_830,
      run: drawThree,
    } as const;

    const first = runSeededScenario(definition);
    const replay = runSeededScenario(definition);

    expect(first).toEqual(replay);
    expect(first.scenarioId).toBe('rng_three_draws');
    expect(first.seed).toBe(20_260_830);
    expect(first.finalRng.drawCount).toBe(3);
    expect(first.reproduction).toBe('scenario="rng_three_draws" seed=20260830');
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('keeps string seeds unambiguous in reproduction output', () => {
    expect(
      formatScenarioReproduction({
        scenarioId: 'string_seed',
        seed: 'career:alpha',
      }),
    ).toBe('scenario="string_seed" seed="career:alpha"');
    expect(() =>
      formatScenarioReproduction({
        scenarioId: 'invalid_seed',
        seed: -1,
      }),
    ).toThrow(RangeError);
  });

  it('validates scenario identifiers before executing the scenario', () => {
    let executed = false;

    expect(() =>
      runSeededScenario({
        scenarioId: '',
        seed: 1,
        run: (rng) => {
          executed = true;
          return { value: null, nextRng: rng };
        },
      }),
    ).toThrow(RangeError);
    expect(executed).toBe(false);
  });

  it('rejects invalid final RNG state returned by a scenario', () => {
    expect(() => {
      try {
        runSeededScenario({
          scenarioId: 'invalid_final_rng',
          seed: 1,
          run: () => ({
            value: null,
            nextRng: {
              algorithm: 'xoshiro128ss-v1',
              state: [0, 0, 0, 0],
              drawCount: 0,
            },
          }),
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SeededScenarioExecutionError);
        expect(error).toMatchObject({
          cause: expect.any(TypeError),
          reproduction: 'scenario="invalid_final_rng" seed=1',
        });
        throw error;
      }
    }).toThrow('scenario="invalid_final_rng" seed=1');
  });

  it('adds reproduction context when scenario execution throws', () => {
    let capturedError: unknown;

    try {
      runSeededScenario({
        scenarioId: 'throwing_scenario',
        seed: 'failure-seed',
        run: () => {
          throw new Error('simulated failure');
        },
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(SeededScenarioExecutionError);
    expect(capturedError).toMatchObject({
      cause: expect.objectContaining({ message: 'simulated failure' }),
      reproduction: 'scenario="throwing_scenario" seed="failure-seed"',
    });
  });
});
