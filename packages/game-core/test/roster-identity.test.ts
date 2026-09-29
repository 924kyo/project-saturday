import { describe, expect, it } from 'vitest';

import {
  selectDiverseRosterNamePair,
  type RosterFamilyNameId,
  type RosterGivenNameId,
} from '../src/index.js';

const givenNameIds = [
  'roster_given_name_a',
  'roster_given_name_b',
  'roster_given_name_c',
] as const satisfies readonly RosterGivenNameId[];
const familyNameIds = [
  'roster_family_name_a',
  'roster_family_name_b',
  'roster_family_name_c',
] as const satisfies readonly RosterFamilyNameId[];

describe('roster identity selection', () => {
  it('uses saved draw offsets as deterministic tie-breaks and penalizes repeated tokens', () => {
    const first = selectDiverseRosterNamePair({
      familyNameIds,
      familyStartIndex: 0,
      familyUsage: new Map(),
      givenNameIds,
      givenStartIndex: 0,
      givenUsage: new Map(),
      usedPairs: new Set(),
    });
    expect(first).toEqual({
      familyNameId: 'roster_family_name_a',
      givenNameId: 'roster_given_name_a',
    });

    const second = selectDiverseRosterNamePair({
      familyNameIds,
      familyStartIndex: 0,
      familyUsage: new Map([['roster_family_name_a', 1]]),
      givenNameIds,
      givenStartIndex: 0,
      givenUsage: new Map([['roster_given_name_a', 1]]),
      usedPairs: new Set(['roster_given_name_a|roster_family_name_a']),
    });
    expect(second).toEqual({
      familyNameId: 'roster_family_name_b',
      givenNameId: 'roster_given_name_b',
    });
  });

  it('never returns a used full name and rejects invalid draw indexes', () => {
    const usedPairs = new Set(
      givenNameIds.flatMap((givenNameId) =>
        familyNameIds.map((familyNameId) => `${givenNameId}|${familyNameId}`),
      ),
    );
    expect(
      selectDiverseRosterNamePair({
        familyNameIds,
        familyStartIndex: 0,
        familyUsage: new Map(),
        givenNameIds,
        givenStartIndex: 0,
        givenUsage: new Map(),
        usedPairs,
      }),
    ).toBeNull();
    expect(
      selectDiverseRosterNamePair({
        familyNameIds,
        familyStartIndex: 3,
        familyUsage: new Map(),
        givenNameIds,
        givenStartIndex: 0,
        givenUsage: new Map(),
        usedPairs: new Set(),
      }),
    ).toBeNull();
  });
});
