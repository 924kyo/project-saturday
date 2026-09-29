import type { SeasonMechanicsDefinition } from '@project-saturday/game-core';

import type { SeasonContent } from '../schema/seasons.js';
import { gameOpponentMechanicsProfiles } from './games.js';

const roundCopy = (weekNumber: number) => ({
  descriptionKey: `season.regular.round${weekNumber}.description`,
  nameKey: `season.regular.round${weekNumber}.name`,
});

export const seasonContent = {
  campRounds: [
    {
      descriptionKey: 'season.camp.install.description',
      id: 'season_camp_install',
      kind: 'camp_round',
      nameKey: 'season.camp.install.name',
      sequence: 1,
    },
    {
      descriptionKey: 'season.camp.competition.description',
      id: 'season_camp_competition',
      kind: 'camp_round',
      nameKey: 'season.camp.competition.name',
      sequence: 2,
    },
    {
      descriptionKey: 'season.camp.dressRehearsal.description',
      id: 'season_camp_dress_rehearsal',
      kind: 'camp_round',
      nameKey: 'season.camp.dressRehearsal.name',
      sequence: 3,
    },
  ],
  descriptionKey: 'season.verticalSlice.description',
  id: 'season_wr_vertical_slice_v1',
  kind: 'season',
  model: 'season_v1',
  nameKey: 'season.verticalSlice.name',
  postseason: {
    outcomes: [
      {
        descriptionKey: 'season.outcomes.champion.description',
        id: 'season_outcome_champion',
        kind: 'season_outcome',
        maximumFinish: 1,
        minimumFinish: 1,
        nameKey: 'season.outcomes.champion.name',
      },
      {
        descriptionKey: 'season.outcomes.runnerUp.description',
        id: 'season_outcome_runner_up',
        kind: 'season_outcome',
        maximumFinish: 2,
        minimumFinish: 2,
        nameKey: 'season.outcomes.runnerUp.name',
      },
      {
        descriptionKey: 'season.outcomes.semifinalExit.description',
        id: 'season_outcome_semifinal_exit',
        kind: 'season_outcome',
        maximumFinish: 4,
        minimumFinish: 3,
        nameKey: 'season.outcomes.semifinalExit.name',
      },
      {
        descriptionKey: 'season.outcomes.regularSeasonComplete.description',
        id: 'season_outcome_regular_season_complete',
        kind: 'season_outcome',
        maximumFinish: 12,
        minimumFinish: 5,
        nameKey: 'season.outcomes.regularSeasonComplete.name',
      },
    ],
    qualifierCount: 4,
    rounds: [
      {
        descriptionKey: 'season.postseason.semifinal.description',
        gameCount: 2,
        id: 'postseason_round_semifinal',
        kind: 'postseason_round',
        nameKey: 'season.postseason.semifinal.name',
      },
      {
        descriptionKey: 'season.postseason.final.description',
        gameCount: 1,
        id: 'postseason_round_final',
        kind: 'postseason_round',
        nameKey: 'season.postseason.final.name',
      },
    ],
    semifinalMatchups: [
      { awaySeed: 4, homeSeed: 1 },
      { awaySeed: 3, homeSeed: 2 },
    ],
  },
  programProfiles: [
    { programId: 'program_ember_peak_polytechnic', scheduleStrength: 81, teamRating: 85 },
    { programId: 'program_capital_commonwealth', scheduleStrength: 81, teamRating: 78 },
    { programId: 'program_cascade_tech', scheduleStrength: 81, teamRating: 88 },
    { programId: 'program_gulf_meridian', scheduleStrength: 80, teamRating: 88 },
    { programId: 'program_high_desert_state', scheduleStrength: 82, teamRating: 67 },
    { programId: 'program_ironwood', scheduleStrength: 80, teamRating: 86 },
    { programId: 'program_lakefront_union', scheduleStrength: 81, teamRating: 80 },
    { programId: 'program_northstar_college', scheduleStrength: 81, teamRating: 71 },
    { programId: 'program_prairie_forge', scheduleStrength: 81, teamRating: 72 },
    { programId: 'program_redwood_bay', scheduleStrength: 79, teamRating: 82 },
    { programId: 'program_solis_coast', scheduleStrength: 81, teamRating: 90 },
    { programId: 'program_crown_sound', scheduleStrength: 80, teamRating: 81 },
  ],
  regularSeasonRounds: [
    {
      ...roundCopy(1),
      fixtures: [
        {
          awayProgramId: 'program_ember_peak_polytechnic',
          homeProgramId: 'program_crown_sound',
          id: 'season_fixture_r01_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_capital_commonwealth',
          homeProgramId: 'program_solis_coast',
          id: 'season_fixture_r01_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_cascade_tech',
          homeProgramId: 'program_redwood_bay',
          id: 'season_fixture_r01_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_prairie_forge',
          homeProgramId: 'program_gulf_meridian',
          id: 'season_fixture_r01_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_northstar_college',
          homeProgramId: 'program_high_desert_state',
          id: 'season_fixture_r01_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_lakefront_union',
          homeProgramId: 'program_ironwood',
          id: 'season_fixture_r01_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_01',
      kind: 'regular_season_round',
      weekNumber: 1,
    },
    {
      ...roundCopy(2),
      fixtures: [
        {
          awayProgramId: 'program_ember_peak_polytechnic',
          homeProgramId: 'program_solis_coast',
          id: 'season_fixture_r02_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_crown_sound',
          homeProgramId: 'program_redwood_bay',
          id: 'season_fixture_r02_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_capital_commonwealth',
          homeProgramId: 'program_prairie_forge',
          id: 'season_fixture_r02_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_northstar_college',
          homeProgramId: 'program_cascade_tech',
          id: 'season_fixture_r02_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_lakefront_union',
          homeProgramId: 'program_gulf_meridian',
          id: 'season_fixture_r02_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_ironwood',
          homeProgramId: 'program_high_desert_state',
          id: 'season_fixture_r02_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_02',
      kind: 'regular_season_round',
      weekNumber: 2,
    },
    {
      ...roundCopy(3),
      fixtures: [
        {
          awayProgramId: 'program_ember_peak_polytechnic',
          homeProgramId: 'program_redwood_bay',
          id: 'season_fixture_r03_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_solis_coast',
          homeProgramId: 'program_prairie_forge',
          id: 'season_fixture_r03_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_northstar_college',
          homeProgramId: 'program_crown_sound',
          id: 'season_fixture_r03_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_lakefront_union',
          homeProgramId: 'program_capital_commonwealth',
          id: 'season_fixture_r03_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_ironwood',
          homeProgramId: 'program_cascade_tech',
          id: 'season_fixture_r03_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_high_desert_state',
          homeProgramId: 'program_gulf_meridian',
          id: 'season_fixture_r03_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_03',
      kind: 'regular_season_round',
      weekNumber: 3,
    },
    {
      ...roundCopy(4),
      fixtures: [
        {
          awayProgramId: 'program_ember_peak_polytechnic',
          homeProgramId: 'program_prairie_forge',
          id: 'season_fixture_r04_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_redwood_bay',
          homeProgramId: 'program_northstar_college',
          id: 'season_fixture_r04_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_solis_coast',
          homeProgramId: 'program_lakefront_union',
          id: 'season_fixture_r04_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_ironwood',
          homeProgramId: 'program_crown_sound',
          id: 'season_fixture_r04_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_high_desert_state',
          homeProgramId: 'program_capital_commonwealth',
          id: 'season_fixture_r04_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_gulf_meridian',
          homeProgramId: 'program_cascade_tech',
          id: 'season_fixture_r04_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_04',
      kind: 'regular_season_round',
      weekNumber: 4,
    },
    {
      ...roundCopy(5),
      fixtures: [
        {
          awayProgramId: 'program_ember_peak_polytechnic',
          homeProgramId: 'program_northstar_college',
          id: 'season_fixture_r05_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_prairie_forge',
          homeProgramId: 'program_lakefront_union',
          id: 'season_fixture_r05_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_redwood_bay',
          homeProgramId: 'program_ironwood',
          id: 'season_fixture_r05_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_high_desert_state',
          homeProgramId: 'program_solis_coast',
          id: 'season_fixture_r05_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_crown_sound',
          homeProgramId: 'program_gulf_meridian',
          id: 'season_fixture_r05_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_cascade_tech',
          homeProgramId: 'program_capital_commonwealth',
          id: 'season_fixture_r05_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_05',
      kind: 'regular_season_round',
      weekNumber: 5,
    },
    {
      ...roundCopy(6),
      fixtures: [
        {
          awayProgramId: 'program_ember_peak_polytechnic',
          homeProgramId: 'program_lakefront_union',
          id: 'season_fixture_r06_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_northstar_college',
          homeProgramId: 'program_ironwood',
          id: 'season_fixture_r06_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_prairie_forge',
          homeProgramId: 'program_high_desert_state',
          id: 'season_fixture_r06_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_gulf_meridian',
          homeProgramId: 'program_redwood_bay',
          id: 'season_fixture_r06_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_cascade_tech',
          homeProgramId: 'program_solis_coast',
          id: 'season_fixture_r06_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_crown_sound',
          homeProgramId: 'program_capital_commonwealth',
          id: 'season_fixture_r06_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_06',
      kind: 'regular_season_round',
      weekNumber: 6,
    },
    {
      ...roundCopy(7),
      fixtures: [
        {
          awayProgramId: 'program_ironwood',
          homeProgramId: 'program_ember_peak_polytechnic',
          id: 'season_fixture_r07_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_lakefront_union',
          homeProgramId: 'program_high_desert_state',
          id: 'season_fixture_r07_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_northstar_college',
          homeProgramId: 'program_gulf_meridian',
          id: 'season_fixture_r07_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_cascade_tech',
          homeProgramId: 'program_prairie_forge',
          id: 'season_fixture_r07_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_capital_commonwealth',
          homeProgramId: 'program_redwood_bay',
          id: 'season_fixture_r07_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_crown_sound',
          homeProgramId: 'program_solis_coast',
          id: 'season_fixture_r07_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_07',
      kind: 'regular_season_round',
      weekNumber: 7,
    },
    {
      ...roundCopy(8),
      fixtures: [
        {
          awayProgramId: 'program_high_desert_state',
          homeProgramId: 'program_ember_peak_polytechnic',
          id: 'season_fixture_r08_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_ironwood',
          homeProgramId: 'program_gulf_meridian',
          id: 'season_fixture_r08_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_lakefront_union',
          homeProgramId: 'program_cascade_tech',
          id: 'season_fixture_r08_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_capital_commonwealth',
          homeProgramId: 'program_northstar_college',
          id: 'season_fixture_r08_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_crown_sound',
          homeProgramId: 'program_prairie_forge',
          id: 'season_fixture_r08_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_solis_coast',
          homeProgramId: 'program_redwood_bay',
          id: 'season_fixture_r08_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_08',
      kind: 'regular_season_round',
      weekNumber: 8,
    },
    {
      ...roundCopy(9),
      fixtures: [
        {
          awayProgramId: 'program_gulf_meridian',
          homeProgramId: 'program_ember_peak_polytechnic',
          id: 'season_fixture_r09_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_high_desert_state',
          homeProgramId: 'program_cascade_tech',
          id: 'season_fixture_r09_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_ironwood',
          homeProgramId: 'program_capital_commonwealth',
          id: 'season_fixture_r09_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_crown_sound',
          homeProgramId: 'program_lakefront_union',
          id: 'season_fixture_r09_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_solis_coast',
          homeProgramId: 'program_northstar_college',
          id: 'season_fixture_r09_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_redwood_bay',
          homeProgramId: 'program_prairie_forge',
          id: 'season_fixture_r09_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_09',
      kind: 'regular_season_round',
      weekNumber: 9,
    },
    {
      ...roundCopy(10),
      fixtures: [
        {
          awayProgramId: 'program_cascade_tech',
          homeProgramId: 'program_ember_peak_polytechnic',
          id: 'season_fixture_r10_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_gulf_meridian',
          homeProgramId: 'program_capital_commonwealth',
          id: 'season_fixture_r10_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_high_desert_state',
          homeProgramId: 'program_crown_sound',
          id: 'season_fixture_r10_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_solis_coast',
          homeProgramId: 'program_ironwood',
          id: 'season_fixture_r10_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_redwood_bay',
          homeProgramId: 'program_lakefront_union',
          id: 'season_fixture_r10_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_prairie_forge',
          homeProgramId: 'program_northstar_college',
          id: 'season_fixture_r10_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_10',
      kind: 'regular_season_round',
      weekNumber: 10,
    },
    {
      ...roundCopy(11),
      fixtures: [
        {
          awayProgramId: 'program_capital_commonwealth',
          homeProgramId: 'program_ember_peak_polytechnic',
          id: 'season_fixture_r11_g01',
          spotlight: false,
        },
        {
          awayProgramId: 'program_cascade_tech',
          homeProgramId: 'program_crown_sound',
          id: 'season_fixture_r11_g02',
          spotlight: false,
        },
        {
          awayProgramId: 'program_gulf_meridian',
          homeProgramId: 'program_solis_coast',
          id: 'season_fixture_r11_g03',
          spotlight: false,
        },
        {
          awayProgramId: 'program_redwood_bay',
          homeProgramId: 'program_high_desert_state',
          id: 'season_fixture_r11_g04',
          spotlight: false,
        },
        {
          awayProgramId: 'program_prairie_forge',
          homeProgramId: 'program_ironwood',
          id: 'season_fixture_r11_g05',
          spotlight: false,
        },
        {
          awayProgramId: 'program_northstar_college',
          homeProgramId: 'program_lakefront_union',
          id: 'season_fixture_r11_g06',
          spotlight: false,
        },
      ],
      id: 'season_round_11',
      kind: 'regular_season_round',
      weekNumber: 11,
    },
    {
      ...roundCopy(12),
      fixtures: [
        {
          awayProgramId: 'program_gulf_meridian',
          homeProgramId: 'program_ember_peak_polytechnic',
          id: 'season_fixture_r12_g01',
          spotlight: true,
        },
        {
          awayProgramId: 'program_capital_commonwealth',
          homeProgramId: 'program_crown_sound',
          id: 'season_fixture_r12_g02',
          spotlight: true,
        },
        {
          awayProgramId: 'program_solis_coast',
          homeProgramId: 'program_cascade_tech',
          id: 'season_fixture_r12_g03',
          spotlight: true,
        },
        {
          awayProgramId: 'program_redwood_bay',
          homeProgramId: 'program_high_desert_state',
          id: 'season_fixture_r12_g04',
          spotlight: true,
        },
        {
          awayProgramId: 'program_lakefront_union',
          homeProgramId: 'program_ironwood',
          id: 'season_fixture_r12_g05',
          spotlight: true,
        },
        {
          awayProgramId: 'program_prairie_forge',
          homeProgramId: 'program_northstar_college',
          id: 'season_fixture_r12_g06',
          spotlight: true,
        },
      ],
      id: 'season_round_12',
      kind: 'regular_season_round',
      weekNumber: 12,
    },
  ],
  standings: {
    explanationKey: 'season.standings.tiebreakExplanation',
    tiebreakOrder: [
      'standings_tiebreak_wins',
      'standings_tiebreak_head_to_head',
      'standings_tiebreak_schedule_strength',
      'standings_tiebreak_program_id',
    ],
  },
} as const satisfies SeasonContent;

export const seasonProgramMechanicsProfiles = seasonContent.programProfiles;
export const seasonSchedule = seasonContent.regularSeasonRounds;

const gameProfileByProgramId = new Map(
  gameOpponentMechanicsProfiles.map((profile) => [profile.programId, profile]),
);

/** Display-free season projection consumed by deterministic game-core commands. */
export const seasonMechanicsDefinition = {
  id: seasonContent.id,
  campRoundIds: [
    seasonContent.campRounds[0].id,
    seasonContent.campRounds[1].id,
    seasonContent.campRounds[2].id,
  ],
  regularSeasonRounds: seasonContent.regularSeasonRounds.map(({ fixtures, id, weekNumber }) => ({
    id,
    weekNumber,
    fixtures: fixtures.map(({ awayProgramId, homeProgramId, id: fixtureId, spotlight }) => ({
      awayProgramId,
      homeProgramId,
      id: fixtureId,
      spotlight,
    })),
  })),
  programProfiles: seasonContent.programProfiles.map((profile) => {
    const gameProfile = gameProfileByProgramId.get(profile.programId);
    if (gameProfile === undefined) {
      throw new TypeError(`Season program ${profile.programId} is missing its Game Day profile.`);
    }
    return { ...profile, ...gameProfile };
  }),
  standingsTiebreakOrder: seasonContent.standings.tiebreakOrder,
  postseason: {
    qualifierCount: seasonContent.postseason.qualifierCount,
    semifinalMatchups: seasonContent.postseason.semifinalMatchups,
  },
} as const satisfies SeasonMechanicsDefinition;

/** Mechanics-only second-season calendar with distinct stable schedule identities. */
export const seasonTwoMechanicsDefinition = {
  ...seasonMechanicsDefinition,
  id: 'season_wr_vertical_slice_v1_year_2',
  campRoundIds: [
    `${seasonMechanicsDefinition.campRoundIds[0]}_year_2`,
    `${seasonMechanicsDefinition.campRoundIds[1]}_year_2`,
    `${seasonMechanicsDefinition.campRoundIds[2]}_year_2`,
  ],
  regularSeasonRounds: seasonMechanicsDefinition.regularSeasonRounds.map((round) => ({
    ...round,
    id: `${round.id}_year_2` as `season_${string}`,
    fixtures: round.fixtures.map((fixture) => ({
      ...fixture,
      id: `${fixture.id}_year_2` as `season_fixture_${string}`,
    })),
  })),
} as const satisfies SeasonMechanicsDefinition;
