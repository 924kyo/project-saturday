import { describe, expect, it } from 'vitest';

import {
  createRng,
  createWorldAlphaSeason,
  initializeWorldAlphaPostseason,
  isWorldAlphaMechanicsDefinition,
  projectWorldAlphaOffseason,
  projectWorldAlphaPositionMatchup,
  resolveNextWorldAlphaPostseasonRound,
  resolveNextWorldAlphaRegularRound,
  validateWorldAlphaSeasonState,
  type ProgramId,
  type WorldAlphaMechanicsDefinition,
  type WorldAlphaSeasonState,
} from '../src/index.js';

type Pair = readonly [ProgramId, ProgramId];

function sameGroupPairs(programs: readonly ProgramId[], roundIndex: number): Pair[] {
  const rotating = [...programs];
  for (let rotation = 0; rotation < roundIndex; rotation += 1) {
    rotating.splice(1, 0, rotating.pop()!);
  }
  return Array.from(
    { length: 4 },
    (_, index) => [rotating[index]!, rotating[rotating.length - 1 - index]!] as const,
  );
}

function definition(): WorldAlphaMechanicsDefinition {
  const programs = Array.from(
    { length: 32 },
    (_, index) => `program_core_alpha_${String(index).padStart(2, '0')}` as ProgramId,
  );
  const groups = Array.from({ length: 4 }, (_, groupIndex) => ({
    id: `world_group_core_${groupIndex}`,
    programIds: programs.slice(groupIndex * 8, groupIndex * 8 + 8),
  }));
  const groupByProgram = new Map(
    groups.flatMap((group) => group.programIds.map((programId) => [programId, group.id] as const)),
  );
  const crossRules = [
    [
      [0, 1, 0],
      [2, 3, 0],
    ],
    [
      [0, 2, 0],
      [1, 3, 0],
    ],
    [
      [0, 3, 0],
      [1, 2, 0],
    ],
    [
      [0, 1, 1],
      [2, 3, 1],
    ],
    [
      [0, 2, 1],
      [1, 3, 1],
    ],
  ] as const;
  const regularSeasonRounds = Array.from({ length: 12 }, (_, roundIndex) => {
    const pairs: Pair[] =
      roundIndex < 7
        ? groups.flatMap((group) => sameGroupPairs(group.programIds, roundIndex))
        : crossRules[roundIndex - 7]!.flatMap(([firstGroup, secondGroup, offset]) =>
            groups[firstGroup]!.programIds.map(
              (programId, index) =>
                [programId, groups[secondGroup]!.programIds[(index + offset) % 8]!] as const,
            ),
          );
    return {
      id: `world_alpha_round_core_${String(roundIndex + 1).padStart(2, '0')}`,
      roundNumber: roundIndex + 1,
      fixtures: pairs.map(([homeProgramId, awayProgramId], fixtureIndex) => ({
        id: `world_alpha_fixture_core_${String(roundIndex + 1).padStart(2, '0')}_${String(
          fixtureIndex + 1,
        ).padStart(2, '0')}`,
        homeProgramId,
        awayProgramId,
      })),
    };
  });
  return {
    id: 'world_alpha_32_program',
    groups,
    programProfiles: programs.map((programId, index) => {
      const groupIndex = Math.floor(index / 8);
      const groupOffset = index % 8;
      const base = 58 + (groupOffset % 4) * 8;
      const rivalOffset = groupOffset % 2 === 0 ? groupOffset + 1 : groupOffset - 1;
      return {
        aggregateTierId: `aggregate_tier_${groupOffset % 4}`,
        defenseRating: base,
        groupId: groupByProgram.get(programId)!,
        offenseRating: base + 1,
        positionRatings: {
          position_cb: base,
          position_qb: base + 2,
          position_rb: base - 1,
          position_wr: base + 1,
        },
        programId,
        rivalProgramId: groups[groupIndex]!.programIds[rivalOffset]!,
      };
    }),
    regularSeasonRounds,
  };
}

function completeRegularSeason(mechanics: WorldAlphaMechanicsDefinition): WorldAlphaSeasonState {
  const created = createWorldAlphaSeason(mechanics, createRng('core-world-alpha'), 0, null);
  if (!created.ok) throw new Error(created.reason);
  let state = created.value;
  for (let round = 0; round < 12; round += 1) {
    const next = resolveNextWorldAlphaRegularRound(state, mechanics);
    if (!next.ok) throw new Error(next.reason);
    state = next.value.state;
  }
  return state;
}

describe('M7 core 32-program world', () => {
  it('validates, resolves, ranks, closes postseason, and projects offseason deterministically', () => {
    const mechanics = definition();
    expect(isWorldAlphaMechanicsDefinition(mechanics)).toBe(true);
    const regular = completeRegularSeason(mechanics);
    expect(regular.rng.drawCount).toBe(384);
    expect(validateWorldAlphaSeasonState(mechanics, regular)).toEqual({ issues: [], ok: true });
    const initialized = initializeWorldAlphaPostseason(regular, mechanics);
    if (!initialized.ok) throw new Error(initialized.reason);
    const semifinals = resolveNextWorldAlphaPostseasonRound(initialized.value, mechanics);
    if (!semifinals.ok) throw new Error(semifinals.reason);
    const final = resolveNextWorldAlphaPostseasonRound(semifinals.value, mechanics);
    if (!final.ok) throw new Error(final.reason);
    expect(final.value.rng.drawCount).toBe(390);
    expect(validateWorldAlphaSeasonState(mechanics, final.value)).toEqual({ issues: [], ok: true });
    const offseason = projectWorldAlphaOffseason(final.value, mechanics);
    expect(offseason.ok).toBe(true);
    if (offseason.ok) {
      expect(offseason.value.worldRngDrawCountAfter).toBe(486);
      expect(offseason.value.programs).toHaveLength(32);
    }
  });

  it('uses position responsibilities and rejects schedule/state tampering', () => {
    const mechanics = definition();
    const first = mechanics.programProfiles[0]!.programId;
    const second = mechanics.programProfiles[1]!.programId;
    const qb = projectWorldAlphaPositionMatchup(mechanics, 'position_qb', first, second, false);
    const cb = projectWorldAlphaPositionMatchup(mechanics, 'position_cb', first, second, false);
    expect(qb?.opponentSecondaryContributionMilli).toBe(0);
    expect(cb?.opponentSecondaryContributionMilli).toBeGreaterThan(0);

    const badDefinition = structuredClone(mechanics);
    (badDefinition.regularSeasonRounds[0]!.fixtures[0] as unknown as Record<string, unknown>)[
      'awayProgramId'
    ] = badDefinition.regularSeasonRounds[0]!.fixtures[0]!.homeProgramId;
    expect(isWorldAlphaMechanicsDefinition(badDefinition)).toBe(false);

    const regular = completeRegularSeason(mechanics);
    const tampered = structuredClone(regular);
    (tampered.programRecords[0] as unknown as Record<string, unknown>)['wins'] =
      tampered.programRecords[0]!.wins + 1;
    expect(validateWorldAlphaSeasonState(mechanics, tampered).ok).toBe(false);
  });
});
