import { describe, expect, it } from 'vitest';
import {
  advanceInjuryDuration,
  assessPositionInjuryWeek,
  createRng,
  deriveInjuryChoiceAvailability,
  derivePositionInjuryExposure,
  resolvePositionInjuryWeekChoice,
  sampleInjuryOutcome,
  validatePositionInjuryWeek,
  type PositionId,
  type PositionInjuryWeekInput,
  type PositionInjuryWeekV1,
} from '@project-saturday/game-core';
import {
  injuryOutcomeMechanicsDefinitions,
  injuryTuning,
  positionLifecycleMechanics,
} from '../content/index.js';

const mechanics = {
  lifecycle: positionLifecycleMechanics,
  outcomes: injuryOutcomeMechanicsDefinitions,
  tuning: injuryTuning,
};

function input(positionId: PositionId, seed: number): PositionInjuryWeekInput {
  return {
    positionId,
    weekIndex: 3,
    body: 35,
    confidence: 50,
    coachTrust: 60,
    durability: 45,
    workloadSnapPermille: 700,
    recentTrainingLoad: 55,
    currentInjury: null,
    rng: { ...createRng(`position-injury-${seed}`) },
  };
}

function required<T>(value: T | null): T {
  expect(value).not.toBeNull();
  if (value === null) throw new Error('Expected valid injury evidence');
  return value;
}

describe('position-owned exposure with shared injury sampling and choice', () => {
  it.each(['position_qb', 'position_rb', 'position_wr', 'position_cb'] as const)(
    '%s records exact shared draws, choice consequences, and replay without touching the source',
    (positionId) => {
      const observed = new Set<string>();
      for (let seed = 0; seed < 80; seed += 1) {
        const source = input(positionId, seed);
        const before = JSON.stringify(source);
        const week = required(assessPositionInjuryWeek(source, mechanics));
        const sampled = sampleInjuryOutcome(
          week.exposure.totalRiskPermille,
          mechanics.outcomes,
          source.rng,
        );
        if (!sampled.ok) throw new Error('Invalid shared sample');
        expect(week.exposure).toEqual(derivePositionInjuryExposure(source, mechanics.lifecycle));
        expect(week.rng).toEqual(sampled.sample.rng);
        expect(week.riskRoll).toBe(sampled.sample.riskRoll);
        expect(week.outcomeSelectionRoll).toBe(sampled.sample.outcomeSelectionRoll);
        expect(week.currentInjury?.outcomeId ?? null).toBe(
          sampled.sample.selectedOutcome?.id ?? null,
        );
        expect(week.rng.drawCount - source.rng.drawCount).toBe(week.outcome === 'INJURY' ? 2 : 1);
        expect(validatePositionInjuryWeek(JSON.parse(JSON.stringify(week)), mechanics)).toBe(true);
        expect(
          assessPositionInjuryWeek(source, {
            ...mechanics,
            outcomes: [...mechanics.outcomes].reverse(),
          }),
        ).toEqual(week);
        observed.add(week.outcome);
        if (week.availability === null) {
          observed.add('LIMITED');
          const definition = mechanics.outcomes.find(
            ({ id }) => id === week.currentInjury?.outcomeId,
          )!;
          for (const choiceId of [
            'injury_choice_rest_rehab',
            'injury_choice_play_limited',
          ] as const) {
            const chosen = required(resolvePositionInjuryWeekChoice(week, choiceId, mechanics));
            expect(chosen.availability).toEqual(
              deriveInjuryChoiceAvailability(
                source,
                source.weekIndex,
                definition,
                choiceId,
                mechanics.tuning,
              ),
            );
            expect(chosen.rng).toEqual(week.rng);
            expect(chosen.currentInjury).toEqual(week.currentInjury);
            expect(validatePositionInjuryWeek(JSON.parse(JSON.stringify(chosen)), mechanics)).toBe(
              true,
            );
            expect(resolvePositionInjuryWeekChoice(chosen, choiceId, mechanics)).toBeNull();
            const availability = required(chosen.availability);
            expect(availability.opportunityCap).toBe(
              choiceId === 'injury_choice_rest_rehab' ? 0 : definition.opportunityCap,
            );
          }
        } else {
          observed.add(week.availability.availabilityId);
          expect(
            resolvePositionInjuryWeekChoice(week, 'injury_choice_rest_rehab', mechanics),
          ).toBeNull();
        }
        expect(JSON.stringify(source)).toBe(before);
        expect(Object.isFrozen(source.rng)).toBe(false);
        expect(Object.isFrozen(week.source.rng)).toBe(true);
      }
      expect(observed).toEqual(
        new Set([
          'NO_INJURY',
          'INJURY',
          'LIMITED',
          'injury_availability_full',
          'injury_availability_out',
        ]),
      );
    },
  );

  it('keeps all ongoing catalog restrictions literal, uses no draws, and shares recovery duration', () => {
    for (const definition of mechanics.outcomes) {
      const source: PositionInjuryWeekInput = {
        ...input('position_rb', 99),
        rng: { ...createRng('exhausted-ongoing'), drawCount: Number.MAX_SAFE_INTEGER },
        currentInjury: {
          outcomeId: definition.id,
          severityId: definition.severityId,
          startedWeekIndex: 2,
          originalDurationWeeks: definition.durationWeeks,
          remainingWeeks: definition.durationWeeks,
          defaultAvailabilityId: definition.availabilityId,
          opportunityCap: definition.opportunityCap,
        },
      };
      let week = required(assessPositionInjuryWeek(source, mechanics));
      expect(week.outcome).toBe('ONGOING');
      expect(week.riskRoll).toBeNull();
      expect(week.outcomeSelectionRoll).toBeNull();
      expect(week.eligibleOutcomeIds).toEqual([]);
      expect(week.rng).toEqual(source.rng);
      expect(week.currentInjury).toEqual(source.currentInjury);
      if (week.availability === null)
        week = required(
          resolvePositionInjuryWeekChoice(week, 'injury_choice_rest_rehab', mechanics),
        );
      expect(validatePositionInjuryWeek(week, mechanics)).toBe(true);
      const recovered = advanceInjuryDuration(
        required(week.currentInjury),
        required(week.availability).recoveryCreditWeeks,
      );
      const expectedRemaining =
        definition.durationWeeks - 1 - required(week.availability).recoveryCreditWeeks;
      expect(recovered?.remainingWeeks ?? 0).toBe(Math.max(0, expectedRemaining));
      expect(source.currentInjury?.remainingWeeks).toBe(definition.durationWeeks);
    }
  });

  it('rejects forged nested evidence, draw chains, caps, choices, source keys, and catalog mismatch', () => {
    let week: PositionInjuryWeekV1 | null = null;
    for (let seed = 0; seed < 80; seed += 1) {
      const candidate = required(assessPositionInjuryWeek(input('position_qb', seed), mechanics));
      if (candidate.availability === null) {
        week = candidate;
        break;
      }
    }
    const pending = required(week);
    const chosen = required(
      resolvePositionInjuryWeekChoice(pending, 'injury_choice_play_limited', mechanics),
    );
    const mutations: readonly ((value: Record<string, unknown>) => void)[] = [
      (value) => {
        value['extra'] = true;
      },
      (value) => {
        value['outcome'] = 'ONGOING';
      },
      (value) => {
        value['riskRoll'] = -1;
      },
      (value) => {
        value['outcomeSelectionRoll'] = 9_999;
      },
      (value) => {
        value['totalEligibleWeight'] = 1;
      },
      (value) => {
        value['eligibleOutcomeIds'] = [];
      },
      (value) => {
        (value['source'] as Record<string, unknown>)['extra'] = 1;
      },
      (value) => {
        (value['source'] as Record<string, unknown>)['weekIndex'] = -1;
      },
      (value) => {
        (value['exposure'] as Record<string, unknown>)['totalRiskPermille'] = 0;
      },
      (value) => {
        (value['rng'] as Record<string, unknown>)['drawCount'] = 99;
      },
      (value) => {
        (value['currentInjury'] as Record<string, unknown>)['remainingWeeks'] = 12;
      },
      (value) => {
        (value['availability'] as Record<string, unknown>)['opportunityCap'] = 5;
      },
      (value) => {
        (value['availability'] as Record<string, unknown>)['bodyAfter'] = 100;
      },
      (value) => {
        (value['availability'] as Record<string, unknown>)['choiceId'] = 'invented';
      },
    ];
    for (const mutate of mutations) {
      const corrupted = JSON.parse(JSON.stringify(chosen)) as Record<string, unknown>;
      mutate(corrupted);
      expect(validatePositionInjuryWeek(corrupted, mechanics)).toBe(false);
    }
    const reordered = Object.fromEntries(Object.entries(chosen).reverse());
    expect(validatePositionInjuryWeek(reordered, mechanics)).toBe(true);
    expect(validatePositionInjuryWeek(chosen, { ...mechanics, outcomes: [] })).toBe(false);
    expect(validatePositionInjuryWeek(null, mechanics)).toBe(false);
    expect(validatePositionInjuryWeek({ source: null }, mechanics)).toBe(false);
    expect(resolvePositionInjuryWeekChoice(pending, 'invented' as never, mechanics)).toBeNull();
    const current = required(chosen.currentInjury);
    expect(
      assessPositionInjuryWeek(
        { ...input('position_cb', 0), currentInjury: { ...current, opportunityCap: 4 } },
        mechanics,
      ),
    ).toBeNull();
    expect(
      assessPositionInjuryWeek(
        { ...input('position_cb', 0), currentInjury: { ...current, startedWeekIndex: 4 } },
        mechanics,
      ),
    ).toBeNull();
    expect(
      assessPositionInjuryWeek(
        {
          ...input('position_cb', 0),
          rng: { ...createRng(0), drawCount: Number.MAX_SAFE_INTEGER },
        },
        mechanics,
      ),
    ).toBeNull();
  });
});
