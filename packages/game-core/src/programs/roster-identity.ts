import type { RosterFamilyNameId, RosterGivenNameId } from './ids';

export interface RosterNamePairSelectionInput {
  readonly familyNameIds: readonly RosterFamilyNameId[];
  readonly familyStartIndex: number;
  readonly familyUsage: ReadonlyMap<RosterFamilyNameId, number>;
  readonly givenNameIds: readonly RosterGivenNameId[];
  readonly givenStartIndex: number;
  readonly givenUsage: ReadonlyMap<RosterGivenNameId, number>;
  readonly usedPairs: ReadonlySet<string>;
}

export interface RosterNamePairSelection {
  readonly familyNameId: RosterFamilyNameId;
  readonly givenNameId: RosterGivenNameId;
}

function square(value: number): number {
  return value * value;
}

/**
 * Reuses the two authoritative name draws as a cyclic tie-break while preferring
 * the least-used first/surname tokens. It consumes no RNG and never couples names
 * to participant IDs or football ratings.
 */
export function selectDiverseRosterNamePair(
  input: RosterNamePairSelectionInput,
): RosterNamePairSelection | null {
  const pairCount = input.givenNameIds.length * input.familyNameIds.length;
  if (
    pairCount === 0 ||
    !Number.isInteger(input.givenStartIndex) ||
    !Number.isInteger(input.familyStartIndex) ||
    input.givenStartIndex < 0 ||
    input.givenStartIndex >= input.givenNameIds.length ||
    input.familyStartIndex < 0 ||
    input.familyStartIndex >= input.familyNameIds.length
  ) {
    return null;
  }
  const initialPairIndex =
    input.givenStartIndex * input.familyNameIds.length + input.familyStartIndex;
  let selected:
    (RosterNamePairSelection & { readonly penalty: number; readonly offset: number }) | null = null;
  for (let offset = 0; offset < pairCount; offset += 1) {
    const pairIndex = (initialPairIndex + offset) % pairCount;
    const givenNameId = input.givenNameIds[Math.floor(pairIndex / input.familyNameIds.length)];
    const familyNameId = input.familyNameIds[pairIndex % input.familyNameIds.length];
    if (
      givenNameId === undefined ||
      familyNameId === undefined ||
      input.usedPairs.has(`${givenNameId}|${familyNameId}`)
    ) {
      continue;
    }
    const penalty =
      square((input.givenUsage.get(givenNameId) ?? 0) + 1) +
      square((input.familyUsage.get(familyNameId) ?? 0) + 1);
    if (
      selected === null ||
      penalty < selected.penalty ||
      (penalty === selected.penalty && offset < selected.offset)
    ) {
      selected = { familyNameId, givenNameId, offset, penalty };
    }
  }
  return selected === null
    ? null
    : { familyNameId: selected.familyNameId, givenNameId: selected.givenNameId };
}
