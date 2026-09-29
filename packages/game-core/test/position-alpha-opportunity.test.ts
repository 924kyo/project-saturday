import { describe, expect, it } from 'vitest';
import { projectPositionAlphaOpportunityV2 } from '../src/index.js';

describe('current role-bounded opportunity projection', () => {
  it.each([
    [0, 1, 0, 0, 1],
    [1, 2, 1, 1, 2],
    [2, 4, 2, 3, 4],
    [3, 5, 3, 4, 5],
  ])(
    'keeps role %i–%i bounded with both relationship directions',
    (minimum, maximum, low, neutral, high) => {
      const band = { interactiveSnapMinimum: minimum!, interactiveSnapMaximum: maximum! };
      const original = { ...band };
      for (const [modifier, expected] of [
        [-100, low],
        [-50, low],
        [-49, neutral],
        [0, neutral],
        [49, neutral],
        [50, high],
        [100, high],
      ]) {
        const result = projectPositionAlphaOpportunityV2(band, modifier!);
        expect(result?.projectedOpportunities).toBe(expected);
        expect(result?.baseline).toBe(Math.floor((minimum! + maximum!) / 2));
        expect(result?.relationshipBonusPermille).toBe(modifier);
        expect(JSON.parse(JSON.stringify(result))).toEqual(result);
        expect(Object.isFrozen(result)).toBe(true);
      }
      expect(band).toEqual(original);
      expect(Object.isFrozen(band)).toBe(false);
    },
  );

  it('enforces the alpha bound and rejects malformed ranges/modifiers without normalizing them', () => {
    expect(
      projectPositionAlphaOpportunityV2(
        { interactiveSnapMinimum: 6, interactiveSnapMaximum: 8 },
        100,
      )?.projectedOpportunities,
    ).toBe(5);
    for (const [minimum, maximum] of [
      [-1, 2],
      [2, 1],
      [0, 9],
      [NaN, 2],
      [0, 1.5],
    ])
      expect(
        projectPositionAlphaOpportunityV2(
          { interactiveSnapMinimum: minimum!, interactiveSnapMaximum: maximum! },
          0,
        ),
      ).toBeNull();
    for (const modifier of [-101, 101, 0.5, NaN, Infinity, undefined])
      expect(
        projectPositionAlphaOpportunityV2(
          { interactiveSnapMinimum: 1, interactiveSnapMaximum: 2 },
          modifier!,
        ),
      ).toBeNull();
    expect(
      Object.is(
        projectPositionAlphaOpportunityV2(
          { interactiveSnapMinimum: 1, interactiveSnapMaximum: 2 },
          -0,
        )?.relationshipBonusPermille,
        0,
      ),
    ).toBe(true);
  });
});
