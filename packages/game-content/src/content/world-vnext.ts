import type { ProgramId, WorldAlphaMechanicsDefinition } from '@project-saturday/game-core';

import { worldAlphaMechanicsDefinition } from './world-alpha-mechanics.js';
import {
  addedPrograms96VNext,
  addedProgramsVNext,
  conferenceIdentitiesVNext,
} from './world-vnext-programs.js';

/**
 * The M8 conference world: the 32 alpha programs keep their profiles and their groups become the
 * first four conferences; 32 new programs form four more. Rounds 1–7 are conference round robins;
 * rounds 8–12 pair conferences by five distinct perfect matchings, so every program meets five
 * different outside opponents. Schedule construction consumes no RNG.
 */
const TIERS = [
  'aggregate_tier_peak',
  'aggregate_tier_contender',
  'aggregate_tier_competitive',
  'aggregate_tier_building',
] as const;
const TIER_BASE = {
  aggregate_tier_peak: 86,
  aggregate_tier_contender: 77,
  aggregate_tier_competitive: 66,
  aggregate_tier_building: 55,
} as const;

const legacyConferences = worldAlphaMechanicsDefinition.groups.map(({ id, programIds }) => ({
  id,
  programIds: [...programIds] as ProgramId[],
}));
const addedConferences = conferenceIdentitiesVNext
  .slice(legacyConferences.length)
  .map(({ id }) => ({
    id,
    programIds: addedProgramsVNext
      .filter(({ conferenceId }) => conferenceId === id)
      .map(({ id: programId }) => programId as ProgramId),
  }));
const conferences = [...legacyConferences, ...addedConferences];

const addedProfiles = addedConferences.flatMap((conference, conferenceIndex) =>
  conference.programIds.map((programId, slot) => {
    const index = 32 + conferenceIndex * 8 + slot;
    const aggregateTierId = TIERS[slot % TIERS.length]!;
    const base = TIER_BASE[aggregateTierId];
    const offset = (index % 3) - 1;
    return {
      aggregateTierId,
      defenseRating: base + offset,
      groupId: conference.id,
      offenseRating: base - offset,
      positionRatings: {
        position_wr: base + ((index + 1) % 5) - 2,
        position_qb: base + ((index + 1) % 3) - 1,
        position_rb: base + ((index + 2) % 5) - 2,
        position_cb: base + ((index + 3) % 5) - 2,
        position_lb: base + ((index + 4) % 5) - 2,
        position_edge: base + (index % 5) - 2,
      },
      programId,
      rivalProgramId: conference.programIds[slot % 2 === 0 ? slot + 1 : slot - 1]!,
    };
  }),
);

interface Pair {
  readonly homeProgramId: ProgramId;
  readonly awayProgramId: ProgramId;
}
interface Conference {
  readonly id: string;
  readonly programIds: readonly ProgramId[];
}

/** Circle-method round robin inside one conference; hosting is balanced below. */
function conferenceRound(programIds: readonly ProgramId[], roundIndex: number): Pair[] {
  const rotating = [...programIds];
  for (let rotation = 0; rotation < roundIndex; rotation += 1)
    rotating.splice(1, 0, rotating.pop()!);
  return Array.from({ length: rotating.length / 2 }, (_, pairIndex) => ({
    homeProgramId: rotating[pairIndex]!,
    awayProgramId: rotating[rotating.length - 1 - pairIndex]!,
  }));
}

/** Conference matching r of a 1-factorization of the eight conferences (circle method). */
function conferenceMatching(roundIndex: number): (readonly [number, number])[] {
  const order = [0, 1, 2, 3, 4, 5, 6, 7];
  for (let rotation = 0; rotation < roundIndex; rotation += 1) order.splice(1, 0, order.pop()!);
  return Array.from({ length: 4 }, (_, index) => [order[index]!, order[7 - index]!] as const);
}

/**
 * A 12-round schedule: conference rounds from the round robin and non-conference rounds over
 * distinct conference matchings (slot meets slot). Every game goes home to whichever side has
 * hosted less so far (ties alternate by round and slot), keeping hosting within five to seven.
 */
function schedule(
  conferences: readonly Conference[],
  prefix: string,
  nonConferenceRounds: readonly number[],
) {
  const homeCount = new Map<string, number>();
  const balanced = (pairs: readonly Pair[], roundIndex: number) =>
    pairs.map(({ homeProgramId: left, awayProgramId: right }, slot) => {
      const mine = homeCount.get(left) ?? 0;
      const theirs = homeCount.get(right) ?? 0;
      const leftHosts = mine !== theirs ? mine < theirs : (roundIndex + slot) % 2 === 0;
      const pair = leftHosts
        ? { homeProgramId: left, awayProgramId: right }
        : { homeProgramId: right, awayProgramId: left };
      homeCount.set(pair.homeProgramId, (homeCount.get(pair.homeProgramId) ?? 0) + 1);
      return pair;
    });
  let conferenceIndex = 0;
  let matchingIndex = 0;
  return Array.from({ length: 12 }, (_, roundIndex) => {
    const outside = nonConferenceRounds.includes(roundIndex + 1);
    const pairs = balanced(
      outside
        ? conferenceMatching(matchingIndex++).flatMap(([left, right]) =>
            conferences[left]!.programIds.map((programId, slot) => ({
              homeProgramId: programId,
              awayProgramId: conferences[right]!.programIds[slot]!,
            })),
          )
        : (() => {
            const index = conferenceIndex++;
            return conferences.flatMap(({ programIds }) => conferenceRound(programIds, index));
          })(),
      roundIndex,
    );
    const round = String(roundIndex + 1).padStart(2, '0');
    return {
      id: `${prefix}_round_${round}`,
      roundNumber: roundIndex + 1,
      fixtures: pairs.map((pair, fixtureIndex) => ({
        ...pair,
        id: `${prefix}_fixture_${round}_${String(fixtureIndex + 1).padStart(2, '0')}`,
      })),
    };
  });
}

const alphaProfiles = worldAlphaMechanicsDefinition.programProfiles.map((profile) => ({
  ...profile,
  positionRatings: { ...profile.positionRatings },
}));

/** M8: eight conferences of 8; conference rounds 1–7, non-conference rounds 8–12. */
export const worldVNextMechanicsDefinition: WorldAlphaMechanicsDefinition = {
  id: 'world_vnext_64_program',
  groups: conferences,
  programProfiles: [...alphaProfiles, ...addedProfiles],
  regularSeasonRounds: schedule(conferences, 'world_vnext', [8, 9, 10, 11, 12]),
};

/**
 * M9: four more programs per conference (8 conferences of 12). Every M8 profile is unchanged;
 * each conference gains a contender, a competitive and two building programs (paired rivals).
 * Non-conference games open the season (rounds 1–3), then nine conference games.
 */
const TIERS_96 = [
  'aggregate_tier_competitive',
  'aggregate_tier_building',
  'aggregate_tier_contender',
  'aggregate_tier_building',
] as const;
const conferences96 = conferences.map((conference) => ({
  id: conference.id,
  programIds: [
    ...conference.programIds,
    ...addedPrograms96VNext
      .filter(({ conferenceId }) => conferenceId === conference.id)
      .map(({ id }) => id as ProgramId),
  ],
}));
const addedProfiles96 = conferences96.flatMap((conference, conferenceIndex) =>
  conference.programIds.slice(8).map((programId, extra) => {
    const index = 64 + conferenceIndex * 4 + extra;
    const aggregateTierId = TIERS_96[extra]!;
    const base = TIER_BASE[aggregateTierId];
    const offset = (index % 3) - 1;
    return {
      aggregateTierId,
      defenseRating: base + offset,
      groupId: conference.id,
      offenseRating: base - offset,
      positionRatings: {
        position_wr: base + ((index + 1) % 5) - 2,
        position_qb: base + ((index + 1) % 3) - 1,
        position_rb: base + ((index + 2) % 5) - 2,
        position_cb: base + ((index + 3) % 5) - 2,
        position_lb: base + ((index + 4) % 5) - 2,
        position_edge: base + (index % 5) - 2,
      },
      programId,
      rivalProgramId: conference.programIds[8 + (extra % 2 === 0 ? extra + 1 : extra - 1)]!,
    };
  }),
);

export const worldVNext96MechanicsDefinition: WorldAlphaMechanicsDefinition = {
  id: 'world_vnext_96_program',
  groups: conferences96,
  programProfiles: [...alphaProfiles, ...addedProfiles, ...addedProfiles96],
  regularSeasonRounds: schedule(conferences96, 'world_vnext96', [1, 2, 3]),
};

export { addedPrograms96VNext, addedProgramsVNext, conferenceIdentitiesVNext };

export function conferenceIdentityVNext(conferenceId: string) {
  const identity = conferenceIdentitiesVNext.find(({ id }) => id === conferenceId);
  if (identity === undefined) throw new Error(`Missing conference identity for ${conferenceId}.`);
  return identity;
}
