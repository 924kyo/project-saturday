import {
  STAGED_PROGRAM_IDS,
  WORLD_ALPHA_PROGRAM_IDS,
  WORLD_ALPHA_ROUND_IDS,
  type WorldAlphaContent,
} from '../schema/world-alpha.js';

const groupPrograms = {
  world_group_foundry: [
    'program_ember_peak_polytechnic',
    'program_capital_commonwealth',
    'program_ironwood',
    'program_prairie_forge',
    'program_ashgrove_state',
    'program_copperfield',
    'program_kingsport_technical',
    'program_lantern_city',
  ],
  world_group_horizon: [
    'program_cascade_tech',
    'program_high_desert_state',
    'program_redwood_bay',
    'program_solis_coast',
    'program_amber_coast',
    'program_juniper_plains',
    'program_quartz_hill',
    'program_sagebrush_university',
  ],
  world_group_lakes: [
    'program_gulf_meridian',
    'program_lakefront_union',
    'program_northstar_college',
    'program_crown_sound',
    'program_blue_ridge_institute',
    'program_eastern_pines',
    'program_frostline_state',
    'program_oak_river',
  ],
  world_group_summit: [
    'program_delta_vale',
    'program_fairwind',
    'program_granite_harbor',
    'program_marshland_a_and_m',
    'program_palisade',
    'program_rivergate',
    'program_tidewater_polytechnic',
    'program_western_orchard',
  ],
} as const;

type GroupId = keyof typeof groupPrograms;
type ProgramId = (typeof WORLD_ALPHA_PROGRAM_IDS)[number];

const groupIds = Object.keys(groupPrograms) as GroupId[];
const groupByProgram = new Map<ProgramId, GroupId>();
for (const groupId of groupIds) {
  for (const programId of groupPrograms[groupId]) {
    groupByProgram.set(programId, groupId);
  }
}

const localized = <const TId extends string, const TKey extends string>(id: TId, key: TKey) => ({
  descriptionKey: `m7World.${key}.description`,
  id,
  nameKey: `m7World.${key}.name`,
});

const stagedProgramKeys = [
  'amberCoast',
  'ashgroveState',
  'blueRidgeInstitute',
  'copperfield',
  'deltaVale',
  'easternPines',
  'fairwind',
  'frostlineState',
  'graniteHarbor',
  'juniperPlains',
  'kingsportTechnical',
  'lanternCity',
  'marshlandAAndM',
  'oakRiver',
  'palisade',
  'quartzHill',
  'rivergate',
  'sagebrushUniversity',
  'tidewaterPolytechnic',
  'westernOrchard',
] as const;

const tierIds = [
  'aggregate_tier_peak',
  'aggregate_tier_contender',
  'aggregate_tier_competitive',
  'aggregate_tier_building',
] as const;
const tierBaseRatings = {
  aggregate_tier_building: 55,
  aggregate_tier_competitive: 66,
  aggregate_tier_contender: 77,
  aggregate_tier_peak: 86,
} as const;

const programProfiles = WORLD_ALPHA_PROGRAM_IDS.map((id, index) => {
  const groupId = groupByProgram.get(id);
  if (groupId === undefined) {
    throw new Error(`Missing M7 alpha group for ${id}.`);
  }
  const group = groupPrograms[groupId] as readonly ProgramId[];
  const groupIndex = group.indexOf(id);
  const aggregateTierId = tierIds[groupIndex % tierIds.length]!;
  const base = tierBaseRatings[aggregateTierId];
  const ratingOffset = (index % 3) - 1;
  const qbRating = base + ((index + 1) % 3) - 1;
  const rivalIndex = groupIndex % 2 === 0 ? groupIndex + 1 : groupIndex - 1;
  return {
    aggregateTierId,
    defenseRating: base + ratingOffset,
    groupId,
    id,
    offenseRating: base - ratingOffset,
    positionRatings: {
      position_cb: base + ((index + 3) % 5) - 2,
      position_qb: qbRating,
      position_rb: base + ((index + 2) % 5) - 2,
      position_wr: base + ((index + 1) % 5) - 2,
    },
    qbRating,
    rivalProgramId: group[rivalIndex]!,
  };
});

interface FixturePair {
  readonly awayProgramId: ProgramId;
  readonly homeProgramId: ProgramId;
}

function sameGroupRound(programIds: readonly ProgramId[], roundIndex: number): FixturePair[] {
  const rotating = [...programIds];
  for (let rotation = 0; rotation < roundIndex; rotation += 1) {
    rotating.splice(1, 0, rotating.pop()!);
  }
  return Array.from({ length: 4 }, (_, pairIndex) => {
    const first = rotating[pairIndex]!;
    const second = rotating[rotating.length - 1 - pairIndex]!;
    return (roundIndex + pairIndex) % 2 === 0
      ? { awayProgramId: second, homeProgramId: first }
      : { awayProgramId: first, homeProgramId: second };
  });
}

function crossGroupRound(
  firstGroupId: GroupId,
  secondGroupId: GroupId,
  offset: number,
  reverseHome: boolean,
): FixturePair[] {
  const first = groupPrograms[firstGroupId] as readonly ProgramId[];
  const second = groupPrograms[secondGroupId] as readonly ProgramId[];
  return first.map((firstProgramId, index) => {
    const secondProgramId = second[(index + offset) % second.length]!;
    return reverseHome
      ? { awayProgramId: firstProgramId, homeProgramId: secondProgramId }
      : { awayProgramId: secondProgramId, homeProgramId: firstProgramId };
  });
}

const crossRoundRules = [
  [
    ['world_group_foundry', 'world_group_horizon', 0],
    ['world_group_lakes', 'world_group_summit', 0],
  ],
  [
    ['world_group_foundry', 'world_group_lakes', 0],
    ['world_group_horizon', 'world_group_summit', 0],
  ],
  [
    ['world_group_foundry', 'world_group_summit', 0],
    ['world_group_horizon', 'world_group_lakes', 0],
  ],
  [
    ['world_group_foundry', 'world_group_horizon', 1],
    ['world_group_lakes', 'world_group_summit', 1],
  ],
  [
    ['world_group_foundry', 'world_group_lakes', 1],
    ['world_group_horizon', 'world_group_summit', 1],
  ],
] as const satisfies readonly (readonly (readonly [GroupId, GroupId, number])[])[];

const regularSeasonRounds = WORLD_ALPHA_ROUND_IDS.map((id, roundIndex) => {
  const pairs =
    roundIndex < 7
      ? groupIds.flatMap((groupId) =>
          sameGroupRound(groupPrograms[groupId] as readonly ProgramId[], roundIndex),
        )
      : crossRoundRules[roundIndex - 7]!.flatMap(([first, second, offset], pairIndex) =>
          crossGroupRound(first, second, offset, (roundIndex + pairIndex) % 2 === 1),
        );
  return {
    fixtures: pairs.map((pair, fixtureIndex) => ({
      ...pair,
      id: `world_alpha_fixture_${String(roundIndex + 1).padStart(2, '0')}_${String(
        fixtureIndex + 1,
      ).padStart(2, '0')}`,
    })),
    id,
    roundNumber: roundIndex + 1,
  };
});

export const worldAlphaContent = {
  descriptionKey: 'm7World.world.description',
  groups: [
    {
      ...localized('world_group_foundry', 'groups.foundry'),
      programIds: groupPrograms.world_group_foundry,
    },
    {
      ...localized('world_group_horizon', 'groups.horizon'),
      programIds: groupPrograms.world_group_horizon,
    },
    {
      ...localized('world_group_lakes', 'groups.lakes'),
      programIds: groupPrograms.world_group_lakes,
    },
    {
      ...localized('world_group_summit', 'groups.summit'),
      programIds: groupPrograms.world_group_summit,
    },
  ],
  id: 'world_alpha_32_program',
  nameKey: 'm7World.world.name',
  programProfiles,
  regularSeasonRounds,
  stagedPrograms: STAGED_PROGRAM_IDS.map((id, index) => ({
    ...localized(id, `programs.${stagedProgramKeys[index]!}`),
    shortNameKey: `m7World.programs.${stagedProgramKeys[index]!}.shortName`,
  })),
} as const satisfies WorldAlphaContent;
