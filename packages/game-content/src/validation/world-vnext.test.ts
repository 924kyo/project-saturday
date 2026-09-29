import {
  createRng,
  createWorldVNextSeason,
  initializeWorldVNextPostseason,
  isWorldAlphaMechanicsDefinition,
  isWorldVNextDefinition,
  isWorldVNextSeasonState,
  resolveNextWorldVNextPostseasonRound,
  resolveNextWorldVNextRegularRound,
  WORLD_VNEXT_ROUND_IDS,
  type ProgramId,
  type WorldVNextSeasonState,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  addedProgramsVNext,
  conferenceIdentitiesVNext,
  programIdentityVNext,
  worldAlphaMechanicsDefinition,
  worldVNextMechanicsDefinition,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';

const definition = worldVNextMechanicsDefinition;

function playSeason(seed: string, playerProgramId: ProgramId | null) {
  const created = createWorldVNextSeason(definition, createRng(seed), 0, playerProgramId);
  if (!created.ok) throw new Error(created.reason);
  let state: WorldVNextSeasonState = created.value;
  const playerResult = (fixture: {
    readonly id: string;
    readonly homeProgramId: ProgramId;
    readonly awayProgramId: ProgramId;
  }) => ({
    model: 'player_game_alpha_v1' as const,
    fixtureId: fixture.id,
    homeScore: 24,
    awayScore: 17,
    winnerProgramId: fixture.homeProgramId,
  });
  for (let round = 0; round < 12; round += 1) {
    const fixture = definition.regularSeasonRounds
      .find(({ roundNumber }) => roundNumber === round + 1)!
      .fixtures.find(
        ({ homeProgramId, awayProgramId }) =>
          homeProgramId === playerProgramId || awayProgramId === playerProgramId,
      );
    const resolved = resolveNextWorldVNextRegularRound(
      state,
      definition,
      fixture === undefined ? null : playerResult(fixture),
    );
    if (!resolved.ok) throw new Error(resolved.reason);
    state = resolved.value;
    expect(isWorldVNextSeasonState(definition, state)).toBe(true);
  }
  const initialized = initializeWorldVNextPostseason(state, definition);
  if (!initialized.ok) throw new Error(initialized.reason);
  state = initialized.value;
  for (let guard = 0; guard < 4 && state.postseason.type === 'ACTIVE'; guard += 1) {
    const round = state.postseason.rounds[state.postseason.currentRoundIndex]!;
    const fixture = round.fixtures.find(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === playerProgramId || awayProgramId === playerProgramId,
    );
    const resolved = resolveNextWorldVNextPostseasonRound(
      state,
      definition,
      fixture === undefined ? null : playerResult(fixture),
    );
    if (!resolved.ok) throw new Error(resolved.reason);
    state = resolved.value;
    expect(isWorldVNextSeasonState(definition, state)).toBe(true);
  }
  return state;
}

describe('M8 conference world', () => {
  it('ships 64 programs in eight conferences with a valid 12-round schedule', () => {
    expect(isWorldVNextDefinition(definition)).toBe(true);
    // The alpha world stays valid and literal for pre-M8 seasons.
    expect(isWorldAlphaMechanicsDefinition(worldAlphaMechanicsDefinition)).toBe(true);
    expect(definition.programProfiles).toHaveLength(64);
    expect(definition.groups).toHaveLength(8);
    // Every alpha program keeps its exact profile.
    for (const profile of worldAlphaMechanicsDefinition.programProfiles)
      expect(definition.programProfiles).toContainEqual(profile);
    const homeGames = new Map<string, number>();
    for (const round of definition.regularSeasonRounds)
      for (const fixture of round.fixtures)
        homeGames.set(fixture.homeProgramId, (homeGames.get(fixture.homeProgramId) ?? 0) + 1);
    for (const count of homeGames.values()) {
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(7);
    }
  });

  it('gives every new program and conference paired identity and copy', () => {
    expect(addedProgramsVNext).toHaveLength(32);
    expect(conferenceIdentitiesVNext).toHaveLength(8);
    const keys = [
      ...addedProgramsVNext.flatMap(({ id }) => {
        const identity = programIdentityVNext(id as ProgramId);
        return [identity.nameKey, identity.shortNameKey, identity.descriptionKey];
      }),
      ...conferenceIdentitiesVNext.flatMap((entry) => [
        entry.nameKey,
        entry.shortNameKey,
        entry.descriptionKey,
      ]),
    ];
    for (const key of keys) {
      expect(localeMessages['en-US'][key as never], key).toBeTruthy();
      expect(localeMessages['ko-KR'][key as never], key).toBeTruthy();
    }
    const names = addedProgramsVNext.map(
      ({ nameKey }) => localeMessages['en-US'][nameKey as never],
    );
    expect(new Set(names).size).toBe(32);
  });

  it('seeds eight conference champions and four at-large teams into an 11-game bracket', () => {
    const state = playSeason('world-vnext-a', null);
    if (state.postseason.type !== 'COMPLETE') throw new Error('incomplete');
    const qualifiers = state.postseason.qualifiers;
    expect(qualifiers.map(({ seed }) => seed)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(qualifiers.filter(({ conferenceChampion }) => conferenceChampion)).toHaveLength(8);
    const conferences = new Set(
      qualifiers
        .filter(({ conferenceChampion }) => conferenceChampion)
        .map(
          ({ programId }) =>
            definition.programProfiles.find((entry) => entry.programId === programId)!.groupId,
        ),
    );
    expect(conferences.size).toBe(8);
    expect(state.postseason.rounds.map(({ id }) => id)).toEqual([...WORLD_VNEXT_ROUND_IDS]);
    expect(state.postseason.rounds.map(({ fixtures }) => fixtures.length)).toEqual([4, 4, 2, 1]);
    // Byes: seeds 1-4 first appear in the quarterfinal.
    const firstRoundSeeds = state.postseason.rounds[0]!.fixtures.flatMap(
      ({ homeSeed, awaySeed }) => [homeSeed, awaySeed],
    );
    expect(firstRoundSeeds.sort((a, b) => a - b)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    for (const round of state.postseason.rounds)
      for (const fixture of round.fixtures) expect(fixture.homeSeed).toBeLessThan(fixture.awaySeed);
    expect(state.postseason.rounds[3]!.results[0]!.advancingProgramId).toBe(
      state.postseason.championProgramId,
    );
  });

  it('is deterministic by seed, keeps the player game draw-free, and rejects tampering', () => {
    const player = definition.programProfiles[40]!.programId;
    const first = playSeason('world-vnext-b', player);
    expect(playSeason('world-vnext-b', player)).toEqual(first);
    // 11 bracket games plus 31 aggregate fixtures a round, minus the player's bracket games.
    const playerGames = first.regularSeasonResults.flatMap(({ fixtureResults }) =>
      fixtureResults.filter((result) => result?.model === 'player_game_alpha_v1'),
    );
    expect(playerGames).toHaveLength(12);
    const tampered = JSON.parse(JSON.stringify(first)) as WorldVNextSeasonState;
    const result = tampered.regularSeasonResults[3]!.fixtureResults.find(
      (entry) => entry?.model === 'aggregate_alpha_v1',
    ) as { homeScore: number } | undefined;
    result!.homeScore += 1;
    expect(isWorldVNextSeasonState(definition, tampered)).toBe(false);
  });
});
