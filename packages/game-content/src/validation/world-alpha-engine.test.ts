import {
  archiveCompletedWorldAlphaSeason,
  createEmptyWorldAlphaHistory,
  createRng,
  createWorldAlphaSeason,
  initializeWorldAlphaPostseason,
  projectWorldAlphaOffseason,
  projectWorldAlphaPositionMatchup,
  resolveNextWorldAlphaPostseasonRound,
  resolveNextWorldAlphaRegularRound,
  validateWorldAlphaSeasonState,
  type WorldAlphaMechanicsDefinition,
  type WorldAlphaPlayerGameResult,
  type WorldAlphaSeasonState,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { worldAlphaMechanicsDefinition } from '../content/index.js';

type Mutable<T> = T extends readonly (infer TItem)[]
  ? Mutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> }
    : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

const playerProgramId = 'program_ember_peak_polytechnic' as const;

function playerResult(roundNumber: number): WorldAlphaPlayerGameResult {
  const round = worldAlphaMechanicsDefinition.regularSeasonRounds.find(
    (candidate) => candidate.roundNumber === roundNumber,
  )!;
  const fixture = round.fixtures.find(
    ({ homeProgramId, awayProgramId }) =>
      homeProgramId === playerProgramId || awayProgramId === playerProgramId,
  )!;
  const playerAtHome = fixture.homeProgramId === playerProgramId;
  const homeScore = playerAtHome ? 31 : 20;
  const awayScore = playerAtHome ? 20 : 31;
  return {
    awayScore,
    fixtureId: fixture.id,
    homeScore,
    model: 'player_game_alpha_v1',
    winnerProgramId: playerProgramId,
  };
}

function playRegularSeason(definition: WorldAlphaMechanicsDefinition): WorldAlphaSeasonState {
  const created = createWorldAlphaSeason(
    definition,
    createRng('m7-world-alpha-season'),
    0,
    playerProgramId,
  );
  if (!created.ok) throw new Error(created.reason);
  let state = created.value;
  for (let roundNumber = 1; roundNumber <= 12; roundNumber += 1) {
    const before = state.rng.drawCount;
    const resolved = resolveNextWorldAlphaRegularRound(
      state,
      definition,
      playerResult(roundNumber),
    );
    if (!resolved.ok) throw new Error(resolved.reason);
    expect(resolved.value.worldRngDrawCountAfter - before).toBe(30);
    state = resolved.value.state;
    expect(validateWorldAlphaSeasonState(definition, state)).toEqual({ issues: [], ok: true });
  }
  return state;
}

function completeSeason(definition = worldAlphaMechanicsDefinition): WorldAlphaSeasonState {
  const regular = playRegularSeason(definition);
  const initialized = initializeWorldAlphaPostseason(regular, definition);
  if (!initialized.ok) throw new Error(initialized.reason);
  const postseasonPlayerResult = (
    state: WorldAlphaSeasonState,
  ): WorldAlphaPlayerGameResult | null => {
    if (state.postseason.type !== 'ACTIVE') return null;
    const fixture = state.postseason.rounds[state.postseason.currentRoundIndex].fixtures.find(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === playerProgramId || awayProgramId === playerProgramId,
    );
    if (fixture === undefined) return null;
    const atHome = fixture.homeProgramId === playerProgramId;
    return {
      awayScore: atHome ? 17 : 34,
      fixtureId: fixture.id,
      homeScore: atHome ? 34 : 17,
      model: 'player_game_alpha_v1',
      winnerProgramId: playerProgramId,
    };
  };
  const semifinals = resolveNextWorldAlphaPostseasonRound(
    initialized.value,
    definition,
    postseasonPlayerResult(initialized.value),
  );
  if (!semifinals.ok) throw new Error(semifinals.reason);
  const final = resolveNextWorldAlphaPostseasonRound(
    semifinals.value,
    definition,
    postseasonPlayerResult(semifinals.value),
  );
  if (!final.ok) throw new Error(final.reason);
  return final.value;
}

describe('M7 staged 32-program world engine', () => {
  it('resolves all 192 fixtures into group standings and evidence-based rankings', () => {
    const state = playRegularSeason(worldAlphaMechanicsDefinition);
    expect(state.completedRegularSeasonRoundCount).toBe(12);
    expect(state.rng.drawCount).toBe(360);
    expect(state.regularSeasonResults.flatMap(({ fixtureResults }) => fixtureResults)).toHaveLength(
      192,
    );
    expect(state.programRecords).toHaveLength(32);
    expect(state.groupStandings).toHaveLength(32);
    expect(state.rankings).toHaveLength(32);
    expect(
      state.programRecords.every(({ wins, losses, ties }) => wins + losses + ties === 12),
    ).toBe(true);
    expect(
      state.rankings.every(
        (ranking) =>
          ranking.totalScoreMilli ===
          ranking.recordContributionMilli +
            ranking.scheduleStrengthContributionMilli +
            ranking.programPriorContributionMilli +
            ranking.recentFormContributionMilli,
      ),
    ).toBe(true);
    const aggregateTiers = new Set(
      state.regularSeasonResults
        .flatMap(({ fixtureResults }) => fixtureResults)
        .flatMap((result) =>
          result?.model === 'aggregate_alpha_v1' ? [result.simulationTier] : [],
        ),
    );
    expect(aggregateTiers).toEqual(new Set(['TIER_2_RELEVANT', 'TIER_3_DISTANT']));
  });

  it('projects distinct four-position matchup responsibilities with explicit components', () => {
    const opponentProgramId = 'program_capital_commonwealth';
    const projections = ['position_qb', 'position_rb', 'position_wr', 'position_cb'].map(
      (positionId) =>
        projectWorldAlphaPositionMatchup(
          worldAlphaMechanicsDefinition,
          positionId,
          playerProgramId,
          opponentProgramId,
          true,
        ),
    );
    expect(projections.every((projection) => projection !== undefined)).toBe(true);
    expect(projections.map((projection) => projection?.positionId)).toEqual([
      'position_qb',
      'position_rb',
      'position_wr',
      'position_cb',
    ]);
    expect(projections[0]?.opponentSecondaryContributionMilli).toBe(0);
    expect(projections[3]?.opponentSecondaryContributionMilli).toBeGreaterThan(0);
    expect(projections.every((projection) => projection?.homeContributionMilli === 2_000)).toBe(
      true,
    );
  });

  it('completes the seeded four-team postseason and projects all programs in 96 draws', () => {
    const completed = completeSeason();
    expect(completed.postseason.type).toBe('COMPLETE');
    expect(completed.rng.drawCount).toBe(362);
    expect(validateWorldAlphaSeasonState(worldAlphaMechanicsDefinition, completed)).toEqual({
      issues: [],
      ok: true,
    });
    const offseason = projectWorldAlphaOffseason(completed, worldAlphaMechanicsDefinition);
    expect(offseason.ok).toBe(true);
    if (!offseason.ok) return;
    expect(offseason.value.programs).toHaveLength(32);
    expect(offseason.value.worldRngDrawCountAfter - offseason.value.worldRngDrawCountBefore).toBe(
      96,
    );
    expect(
      new Set(offseason.value.programs.map(({ staffOutcome }) => staffOutcome)).size,
    ).toBeGreaterThan(1);
    expect(
      offseason.value.programs.every(({ after }) =>
        Object.values(after.positionRatings).every((rating) => rating >= 35 && rating <= 95),
      ),
    ).toBe(true);
  });

  it('canonicalizes catalog order and rejects table or draw-chain tampering', () => {
    const reordered = clone(worldAlphaMechanicsDefinition);
    reordered.groups.reverse();
    reordered.programProfiles.reverse();
    reordered.regularSeasonRounds.reverse();
    reordered.regularSeasonRounds.forEach((round) => round.fixtures.reverse());
    expect(playRegularSeason(reordered)).toEqual(playRegularSeason(worldAlphaMechanicsDefinition));

    const valid = playRegularSeason(worldAlphaMechanicsDefinition);
    const tableTamper = clone(valid);
    tableTamper.rankings[0]!.wins += 1;
    expect(validateWorldAlphaSeasonState(worldAlphaMechanicsDefinition, tableTamper)).toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(
      resolveNextWorldAlphaRegularRound(
        { ...valid, completedRegularSeasonRoundCount: 11 } as WorldAlphaSeasonState,
        worldAlphaMechanicsDefinition,
        playerResult(12),
      ),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it('keeps only two detailed and eight summarized seasons in history', () => {
    const completed = completeSeason();
    let history = createEmptyWorldAlphaHistory();
    for (let seasonIndex = 0; seasonIndex < 11; seasonIndex += 1) {
      const archived = archiveCompletedWorldAlphaSeason(
        history,
        { ...completed, seasonIndex },
        worldAlphaMechanicsDefinition,
      );
      if (!archived.ok) throw new Error(archived.reason);
      history = archived.value;
    }
    expect(history.detailedSeasons.map(({ seasonIndex }) => seasonIndex)).toEqual([9, 10]);
    expect(history.summarizedSeasons.map(({ seasonIndex }) => seasonIndex)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(
      archiveCompletedWorldAlphaSeason(
        history,
        { ...completed, seasonIndex: 10 },
        worldAlphaMechanicsDefinition,
      ),
    ).toEqual({ ok: false, reason: 'world_alpha.invalid_state' });
  });
});
