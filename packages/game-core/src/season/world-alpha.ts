import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import {
  POSITION_IDS,
  isPositionId,
  isProgramId,
  type PositionId,
  type ProgramId,
} from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';

export const WORLD_ALPHA_PROGRAM_COUNT = 32 as const;
export const WORLD_ALPHA_GROUP_COUNT = 4 as const;
export const WORLD_ALPHA_REGULAR_ROUND_COUNT = 12 as const;
export const WORLD_ALPHA_FIXTURES_PER_ROUND = 16 as const;
export const WORLD_ALPHA_POSTSEASON_QUALIFIER_COUNT = 4 as const;
export const WORLD_ALPHA_DETAILED_HISTORY_LIMIT = 2 as const;
export const WORLD_ALPHA_SUMMARY_HISTORY_LIMIT = 8 as const;

export type WorldAlphaSimulationTier = 'TIER_1_PLAYER' | 'TIER_2_RELEVANT' | 'TIER_3_DISTANT';
export type WorldAlphaStaffOutcome = 'CONTINUITY' | 'POSITION_STAFF_CHANGE' | 'SCHEME_SHIFT';

export interface WorldAlphaGroupMechanics {
  readonly id: string;
  readonly programIds: readonly ProgramId[];
}

export interface WorldAlphaProgramMechanics {
  readonly programId: ProgramId;
  readonly groupId: string;
  readonly rivalProgramId: ProgramId;
  readonly aggregateTierId: string;
  readonly offenseRating: number;
  readonly defenseRating: number;
  readonly positionRatings: Readonly<Record<PositionId, number>>;
}

export interface WorldAlphaFixtureMechanics {
  readonly id: string;
  readonly homeProgramId: ProgramId;
  readonly awayProgramId: ProgramId;
}

export interface WorldAlphaRoundMechanics {
  readonly id: string;
  readonly roundNumber: number;
  readonly fixtures: readonly WorldAlphaFixtureMechanics[];
}

export interface WorldAlphaMechanicsDefinition {
  readonly id: string;
  readonly groups: readonly WorldAlphaGroupMechanics[];
  readonly programProfiles: readonly WorldAlphaProgramMechanics[];
  readonly regularSeasonRounds: readonly WorldAlphaRoundMechanics[];
}

export interface WorldAlphaPositionMatchupProjection {
  readonly positionId: PositionId;
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly atHome: boolean;
  readonly positionRating: number;
  readonly supportingUnitRating: number;
  readonly opponentPrimaryRating: number;
  readonly opponentSecondaryRating: number;
  readonly positionContributionMilli: number;
  readonly supportingContributionMilli: number;
  readonly opponentPrimaryContributionMilli: number;
  readonly opponentSecondaryContributionMilli: number;
  readonly homeContributionMilli: number;
  readonly matchupScore: number;
  readonly outlook: 'ADVANTAGE' | 'BALANCED' | 'CHALLENGE';
}

interface WorldAlphaGameResultBase {
  readonly fixtureId: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly winnerProgramId: ProgramId | null;
}

export interface WorldAlphaAggregateGameResult extends WorldAlphaGameResultBase {
  readonly model: 'aggregate_alpha_v1';
  readonly simulationTier: 'TIER_2_RELEVANT' | 'TIER_3_DISTANT';
  readonly homeExpectedScore: number;
  readonly awayExpectedScore: number;
  readonly homeVariance: number;
  readonly awayVariance: number;
  readonly worldRngDrawCountBefore: number;
  readonly worldRngDrawCountAfter: number;
}

export interface WorldAlphaPlayerGameResult extends WorldAlphaGameResultBase {
  readonly model: 'player_game_alpha_v1';
}

export type WorldAlphaGameResult = WorldAlphaAggregateGameResult | WorldAlphaPlayerGameResult;

export interface WorldAlphaRoundState {
  readonly roundId: string;
  readonly fixtureResults: readonly (WorldAlphaGameResult | null)[];
}

export interface WorldAlphaProgramRecord {
  readonly programId: ProgramId;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly groupWins: number;
  readonly groupLosses: number;
  readonly groupTies: number;
  readonly pointsFor: number;
  readonly pointsAgainst: number;
}

export interface WorldAlphaRanking {
  readonly rank: number;
  readonly programId: ProgramId;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly recordScore: number;
  readonly scheduleStrength: number;
  readonly programPrior: number;
  readonly recentForm: number;
  readonly recordContributionMilli: number;
  readonly scheduleStrengthContributionMilli: number;
  readonly programPriorContributionMilli: number;
  readonly recentFormContributionMilli: number;
  readonly totalScoreMilli: number;
}

export interface WorldAlphaGroupStanding {
  readonly groupId: string;
  readonly rank: number;
  readonly programId: ProgramId;
  readonly groupWins: number;
  readonly groupLosses: number;
  readonly groupTies: number;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly pointDifferential: number;
}

export interface WorldAlphaPostseasonFixture {
  readonly id: string;
  readonly homeProgramId: ProgramId;
  readonly awayProgramId: ProgramId;
  readonly homeSeed: number;
  readonly awaySeed: number;
}

export interface WorldAlphaPostseasonResult {
  readonly result: WorldAlphaGameResult;
  readonly advancingProgramId: ProgramId;
  readonly usedHigherSeedTiebreak: boolean;
}

export type WorldAlphaPostseasonState =
  | { readonly type: 'PENDING' }
  | {
      readonly type: 'ACTIVE';
      readonly qualifierProgramIds: readonly [ProgramId, ProgramId, ProgramId, ProgramId];
      readonly currentRoundIndex: 0 | 1;
      readonly rounds: readonly [
        {
          readonly id: 'world_alpha_postseason_semifinal';
          readonly fixtures: readonly [WorldAlphaPostseasonFixture, WorldAlphaPostseasonFixture];
          readonly results: readonly [
            WorldAlphaPostseasonResult | null,
            WorldAlphaPostseasonResult | null,
          ];
        },
        {
          readonly id: 'world_alpha_postseason_final';
          readonly fixtures: readonly [] | readonly [WorldAlphaPostseasonFixture];
          readonly results: readonly [] | readonly [WorldAlphaPostseasonResult | null];
        },
      ];
    }
  | {
      readonly type: 'COMPLETE';
      readonly qualifierProgramIds: readonly [ProgramId, ProgramId, ProgramId, ProgramId];
      readonly rounds: readonly [
        {
          readonly id: 'world_alpha_postseason_semifinal';
          readonly fixtures: readonly [WorldAlphaPostseasonFixture, WorldAlphaPostseasonFixture];
          readonly results: readonly [WorldAlphaPostseasonResult, WorldAlphaPostseasonResult];
        },
        {
          readonly id: 'world_alpha_postseason_final';
          readonly fixtures: readonly [WorldAlphaPostseasonFixture];
          readonly results: readonly [WorldAlphaPostseasonResult];
        },
      ];
      readonly championProgramId: ProgramId;
    };

export interface WorldAlphaSeasonState {
  readonly model: 'world_alpha_season_v1';
  readonly seasonIndex: number;
  readonly playerProgramId: ProgramId | null;
  readonly rng: RngState;
  readonly completedRegularSeasonRoundCount: number;
  readonly regularSeasonResults: readonly WorldAlphaRoundState[];
  readonly programRecords: readonly WorldAlphaProgramRecord[];
  readonly groupStandings: readonly WorldAlphaGroupStanding[];
  readonly rankings: readonly WorldAlphaRanking[];
  readonly postseason: WorldAlphaPostseasonState;
}

export interface ResolveWorldAlphaRoundResult {
  readonly ok: true;
  readonly state: WorldAlphaSeasonState;
  readonly worldRngDrawCountBefore: number;
  readonly worldRngDrawCountAfter: number;
}

export interface WorldAlphaOffseasonProgramProjection {
  readonly programId: ProgramId;
  readonly staffOutcome: WorldAlphaStaffOutcome;
  readonly positionStaffFocus: PositionId | null;
  readonly departingPressure: number;
  readonly incomingPressure: number;
  readonly ratingDelta: number;
  readonly before: WorldAlphaProgramMechanics;
  readonly after: WorldAlphaProgramMechanics;
}

export interface WorldAlphaOffseasonProjection {
  readonly model: 'world_alpha_offseason_v1';
  readonly seasonIndex: number;
  readonly worldRngDrawCountBefore: number;
  readonly worldRngDrawCountAfter: number;
  readonly programs: readonly WorldAlphaOffseasonProgramProjection[];
  readonly rng: RngState;
}

export interface WorldAlphaSeasonArchiveEntry {
  readonly seasonIndex: number;
  readonly championProgramId: ProgramId;
  readonly programRecords: readonly WorldAlphaProgramRecord[];
  readonly finalRankings: readonly WorldAlphaRanking[];
  readonly regularSeasonResults: readonly WorldAlphaRoundState[];
  readonly postseason: Extract<WorldAlphaPostseasonState, { readonly type: 'COMPLETE' }>;
}

export interface WorldAlphaSeasonSummary {
  readonly seasonIndex: number;
  readonly championProgramId: ProgramId;
  readonly topFourProgramIds: readonly [ProgramId, ProgramId, ProgramId, ProgramId];
  readonly records: readonly {
    readonly programId: ProgramId;
    readonly wins: number;
    readonly losses: number;
    readonly ties: number;
  }[];
}

export interface WorldAlphaHistory {
  readonly model: 'world_alpha_history_v1';
  readonly detailedSeasons: readonly WorldAlphaSeasonArchiveEntry[];
  readonly summarizedSeasons: readonly WorldAlphaSeasonSummary[];
}

type WorldAlphaResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly reason: 'world_alpha.invalid_input' | 'world_alpha.invalid_state';
    };

export type WorldAlphaValidationResult =
  | { readonly ok: true; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly string[] };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function integerIn(value: unknown, minimum: number, maximum: number): value is number {
  return (
    Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum
  );
}

function average(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function mappedDraw(rng: RngState, minimum: number, maximumInclusive: number) {
  const sample = nextUint32(rng);
  const span = maximumInclusive - minimum + 1;
  return {
    value: minimum + Math.floor((sample.value * span) / 0x1_0000_0000),
    rng: sample.nextRng,
  };
}

function teamRating(profile: WorldAlphaProgramMechanics): number {
  return Math.round(
    (profile.offenseRating +
      profile.defenseRating +
      Object.values(profile.positionRatings).reduce((sum, rating) => sum + rating, 0) /
        POSITION_IDS.length) /
      3,
  );
}

function definitionIsValid(definition: WorldAlphaMechanicsDefinition): boolean {
  if (
    definition?.id !== 'world_alpha_32_program' ||
    !Array.isArray(definition.groups) ||
    definition.groups.length !== WORLD_ALPHA_GROUP_COUNT ||
    !Array.isArray(definition.programProfiles) ||
    definition.programProfiles.length !== WORLD_ALPHA_PROGRAM_COUNT ||
    !Array.isArray(definition.regularSeasonRounds) ||
    definition.regularSeasonRounds.length !== WORLD_ALPHA_REGULAR_ROUND_COUNT
  )
    return false;
  const profiles = new Map<string, WorldAlphaProgramMechanics>();
  for (const profile of definition.programProfiles) {
    if (
      !isProgramId(profile.programId) ||
      profiles.has(profile.programId) ||
      !isProgramId(profile.rivalProgramId) ||
      profile.rivalProgramId === profile.programId ||
      typeof profile.groupId !== 'string' ||
      profile.groupId.length === 0 ||
      typeof profile.aggregateTierId !== 'string' ||
      profile.aggregateTierId.length === 0 ||
      !integerIn(profile.offenseRating, 35, 95) ||
      !integerIn(profile.defenseRating, 35, 95) ||
      Object.keys(profile.positionRatings).length !== POSITION_IDS.length ||
      POSITION_IDS.some((positionId) => !integerIn(profile.positionRatings[positionId], 35, 95))
    )
      return false;
    profiles.set(profile.programId, profile);
  }
  const groupByProgram = new Map<string, string>();
  for (const group of definition.groups) {
    if (
      typeof group.id !== 'string' ||
      group.id.length === 0 ||
      !Array.isArray(group.programIds) ||
      group.programIds.length !== 8 ||
      new Set(group.programIds).size !== 8
    )
      return false;
    for (const programId of group.programIds) {
      if (!profiles.has(programId) || groupByProgram.has(programId)) return false;
      groupByProgram.set(programId, group.id);
    }
  }
  if (groupByProgram.size !== WORLD_ALPHA_PROGRAM_COUNT) return false;
  for (const profile of profiles.values()) {
    if (
      groupByProgram.get(profile.programId) !== profile.groupId ||
      profiles.get(profile.rivalProgramId)?.rivalProgramId !== profile.programId
    )
      return false;
  }
  const fixtureIds = new Set<string>();
  const roundIds = new Set<string>();
  const roundNumbers = new Set<number>();
  const opponents = new Map([...profiles.keys()].map((id) => [id, [] as string[]]));
  for (const round of definition.regularSeasonRounds) {
    if (
      !integerIn(round.roundNumber, 1, WORLD_ALPHA_REGULAR_ROUND_COUNT) ||
      typeof round.id !== 'string' ||
      round.id.length === 0 ||
      roundIds.has(round.id) ||
      roundNumbers.has(round.roundNumber) ||
      !Array.isArray(round.fixtures) ||
      round.fixtures.length !== WORLD_ALPHA_FIXTURES_PER_ROUND
    )
      return false;
    roundIds.add(round.id);
    roundNumbers.add(round.roundNumber);
    const appearances = new Set<string>();
    for (const fixture of round.fixtures) {
      if (
        typeof fixture.id !== 'string' ||
        fixtureIds.has(fixture.id) ||
        !profiles.has(fixture.homeProgramId) ||
        !profiles.has(fixture.awayProgramId) ||
        fixture.homeProgramId === fixture.awayProgramId ||
        appearances.has(fixture.homeProgramId) ||
        appearances.has(fixture.awayProgramId)
      )
        return false;
      const sameGroup =
        groupByProgram.get(fixture.homeProgramId) === groupByProgram.get(fixture.awayProgramId);
      if (round.roundNumber <= 7 !== sameGroup) return false;
      fixtureIds.add(fixture.id);
      appearances.add(fixture.homeProgramId);
      appearances.add(fixture.awayProgramId);
      opponents.get(fixture.homeProgramId)!.push(fixture.awayProgramId);
      opponents.get(fixture.awayProgramId)!.push(fixture.homeProgramId);
    }
    if (appearances.size !== WORLD_ALPHA_PROGRAM_COUNT) return false;
  }
  return [...opponents.entries()].every(
    ([programId, values]) =>
      values.length === 12 &&
      new Set(values).size === 12 &&
      values.filter(
        (opponentId) => groupByProgram.get(opponentId) === groupByProgram.get(programId),
      ).length === 7,
  );
}

export function isWorldAlphaMechanicsDefinition(
  value: unknown,
): value is WorldAlphaMechanicsDefinition {
  return definitionIsValid(value as WorldAlphaMechanicsDefinition);
}

function winner(
  fixture: WorldAlphaFixtureMechanics,
  homeScore: number,
  awayScore: number,
): ProgramId | null {
  return homeScore === awayScore
    ? null
    : homeScore > awayScore
      ? fixture.homeProgramId
      : fixture.awayProgramId;
}

function groupMap(definition: WorldAlphaMechanicsDefinition): ReadonlyMap<string, string> {
  return new Map(
    definition.groups.flatMap((group) =>
      group.programIds.map((programId) => [programId, group.id] as const),
    ),
  );
}

function fixtureResultMap(roundStates: readonly WorldAlphaRoundState[]) {
  return new Map(
    roundStates.flatMap((round) =>
      round.fixtureResults.flatMap((result) =>
        result === null ? [] : [[result.fixtureId, result] as const],
      ),
    ),
  );
}

/** Shared by the VNext conference world: records, group standings and rankings from results. */
export function deriveWorldAlphaTables(
  definition: WorldAlphaMechanicsDefinition,
  roundStates: readonly WorldAlphaRoundState[],
): Pick<WorldAlphaSeasonState, 'programRecords' | 'groupStandings' | 'rankings'> {
  const groups = groupMap(definition);
  const profileById = new Map(
    definition.programProfiles.map((profile) => [profile.programId, profile]),
  );
  const resultById = fixtureResultMap(roundStates);
  const mutableRecords = new Map(
    definition.programProfiles.map(({ programId }) => [
      programId,
      {
        programId,
        wins: 0,
        losses: 0,
        ties: 0,
        groupWins: 0,
        groupLosses: 0,
        groupTies: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ]),
  );
  const playedByProgram = new Map(
    definition.programProfiles.map(({ programId }) => [
      programId,
      [] as { opponentId: ProgramId; points: number; roundNumber: number }[],
    ]),
  );
  for (const round of definition.regularSeasonRounds) {
    for (const fixture of round.fixtures) {
      const result = resultById.get(fixture.id);
      if (result === undefined) continue;
      const home = mutableRecords.get(fixture.homeProgramId)!;
      const away = mutableRecords.get(fixture.awayProgramId)!;
      home.pointsFor += result.homeScore;
      home.pointsAgainst += result.awayScore;
      away.pointsFor += result.awayScore;
      away.pointsAgainst += result.homeScore;
      const sameGroup = groups.get(fixture.homeProgramId) === groups.get(fixture.awayProgramId);
      if (result.winnerProgramId === null) {
        home.ties += 1;
        away.ties += 1;
        if (sameGroup) {
          home.groupTies += 1;
          away.groupTies += 1;
        }
      } else if (result.winnerProgramId === fixture.homeProgramId) {
        home.wins += 1;
        away.losses += 1;
        if (sameGroup) {
          home.groupWins += 1;
          away.groupLosses += 1;
        }
      } else {
        away.wins += 1;
        home.losses += 1;
        if (sameGroup) {
          away.groupWins += 1;
          home.groupLosses += 1;
        }
      }
      playedByProgram.get(fixture.homeProgramId)!.push({
        opponentId: fixture.awayProgramId,
        points:
          result.winnerProgramId === null
            ? 50
            : result.winnerProgramId === fixture.homeProgramId
              ? 100
              : 0,
        roundNumber: round.roundNumber,
      });
      playedByProgram.get(fixture.awayProgramId)!.push({
        opponentId: fixture.homeProgramId,
        points:
          result.winnerProgramId === null
            ? 50
            : result.winnerProgramId === fixture.awayProgramId
              ? 100
              : 0,
        roundNumber: round.roundNumber,
      });
    }
  }
  const programRecords = [...mutableRecords.values()].sort((a, b) =>
    compareCodeUnits(a.programId, b.programId),
  );
  const rankings = programRecords
    .map((record) => {
      const played = playedByProgram.get(record.programId)!;
      const games = record.wins + record.losses + record.ties;
      const recordScore =
        games === 0 ? 50 : Math.round(((record.wins + record.ties * 0.5) * 100) / games);
      const scheduledOpponents = definition.regularSeasonRounds.flatMap((round) =>
        round.fixtures.flatMap((fixture) =>
          fixture.homeProgramId === record.programId
            ? [fixture.awayProgramId]
            : fixture.awayProgramId === record.programId
              ? [fixture.homeProgramId]
              : [],
        ),
      );
      const scheduleStrength = average(
        scheduledOpponents.map((id) => teamRating(profileById.get(id)!)),
      );
      const programPrior = teamRating(profileById.get(record.programId)!);
      const recent = [...played].sort((a, b) => b.roundNumber - a.roundNumber).slice(0, 3);
      const recentForm = recent.length === 0 ? 50 : average(recent.map(({ points }) => points));
      return {
        rank: 0,
        programId: record.programId,
        wins: record.wins,
        losses: record.losses,
        ties: record.ties,
        recordScore,
        scheduleStrength,
        programPrior,
        recentForm,
        recordContributionMilli: recordScore * 550,
        scheduleStrengthContributionMilli: scheduleStrength * 200,
        programPriorContributionMilli: programPrior * 150,
        recentFormContributionMilli: recentForm * 100,
        totalScoreMilli:
          recordScore * 550 + scheduleStrength * 200 + programPrior * 150 + recentForm * 100,
      };
    })
    .sort(
      (a, b) =>
        b.totalScoreMilli - a.totalScoreMilli ||
        b.wins - a.wins ||
        compareCodeUnits(a.programId, b.programId),
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const groupStandings = [...definition.groups]
    .sort((left, right) => compareCodeUnits(left.id, right.id))
    .flatMap((group) =>
      programRecords
        .filter(({ programId }) => group.programIds.includes(programId))
        .sort(
          (a, b) =>
            b.groupWins - a.groupWins ||
            b.wins - a.wins ||
            b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
            compareCodeUnits(a.programId, b.programId),
        )
        .map((record, index) => ({
          groupId: group.id,
          rank: index + 1,
          programId: record.programId,
          groupWins: record.groupWins,
          groupLosses: record.groupLosses,
          groupTies: record.groupTies,
          wins: record.wins,
          losses: record.losses,
          ties: record.ties,
          pointDifferential: record.pointsFor - record.pointsAgainst,
        })),
    );
  return { programRecords, groupStandings, rankings };
}

function sameSerializable(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

export function isValidWorldAlphaAggregateResult(
  result: WorldAlphaAggregateGameResult,
  fixture: WorldAlphaFixtureMechanics,
  home: WorldAlphaProgramMechanics,
  away: WorldAlphaProgramMechanics,
): boolean {
  if (
    result.model !== 'aggregate_alpha_v1' ||
    result.fixtureId !== fixture.id ||
    (result.simulationTier !== 'TIER_2_RELEVANT' && result.simulationTier !== 'TIER_3_DISTANT') ||
    !integerIn(result.homeScore, 0, 70) ||
    !integerIn(result.awayScore, 0, 70) ||
    !integerIn(result.homeExpectedScore, 10, 45) ||
    !integerIn(result.awayExpectedScore, 10, 45) ||
    !Number.isSafeInteger(result.worldRngDrawCountBefore) ||
    result.worldRngDrawCountBefore < 0 ||
    result.worldRngDrawCountAfter !== result.worldRngDrawCountBefore + 2 ||
    result.winnerProgramId !== winner(fixture, result.homeScore, result.awayScore)
  )
    return false;
  const variance = result.simulationTier === 'TIER_2_RELEVANT' ? 7 : 10;
  if (
    !integerIn(result.homeVariance, -variance, variance) ||
    !integerIn(result.awayVariance, -variance, variance) ||
    result.homeScore !== clamp(result.homeExpectedScore + result.homeVariance, 0, 70) ||
    result.awayScore !== clamp(result.awayExpectedScore + result.awayVariance, 0, 70)
  )
    return false;
  const homeAttack = Math.round((home.offenseRating * 2 + home.positionRatings.position_qb) / 3);
  const awayAttack = Math.round((away.offenseRating * 2 + away.positionRatings.position_qb) / 3);
  return (
    result.homeExpectedScore ===
      clamp(26 + Math.round((homeAttack - away.defenseRating) / 3) + 2, 10, 45) &&
    result.awayExpectedScore ===
      clamp(26 + Math.round((awayAttack - home.defenseRating) / 3), 10, 45)
  );
}

export function validateWorldAlphaSeasonState(
  definition: WorldAlphaMechanicsDefinition,
  value: unknown,
): WorldAlphaValidationResult {
  const issues: string[] = [];
  if (
    !definitionIsValid(definition) ||
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return deepFreeze({ ok: false as const, issues: ['world_alpha.invalid_state'] });
  }
  const state = value as WorldAlphaSeasonState;
  if (
    state.model !== 'world_alpha_season_v1' ||
    !integerIn(state.seasonIndex, 0, 100) ||
    !isRngState(state.rng) ||
    !integerIn(state.completedRegularSeasonRoundCount, 0, 12) ||
    (state.playerProgramId !== null &&
      !definition.programProfiles.some(({ programId }) => programId === state.playerProgramId)) ||
    !Array.isArray(state.regularSeasonResults) ||
    state.regularSeasonResults.length !== 12
  ) {
    return deepFreeze({ ok: false as const, issues: ['world_alpha.invalid_state'] });
  }
  const profiles = new Map(
    definition.programProfiles.map((profile) => [profile.programId, profile]),
  );
  const rounds = [...definition.regularSeasonRounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  );
  let previousAggregateDrawAfter: number | undefined;
  for (const [roundIndex, round] of rounds.entries()) {
    const roundState = state.regularSeasonResults[roundIndex];
    const fixtures = [...round.fixtures].sort((left, right) => compareCodeUnits(left.id, right.id));
    if (
      roundState?.roundId !== round.id ||
      !Array.isArray(roundState.fixtureResults) ||
      roundState.fixtureResults.length !== 16
    ) {
      issues.push(`regularSeasonResults.${roundIndex}`);
      continue;
    }
    const shouldBeComplete = roundIndex < state.completedRegularSeasonRoundCount;
    let playerResultCount = 0;
    for (const [fixtureIndex, fixture] of fixtures.entries()) {
      const result = roundState.fixtureResults[fixtureIndex];
      const path = `regularSeasonResults.${roundIndex}.fixtureResults.${fixtureIndex}`;
      if (!shouldBeComplete) {
        if (result !== null) issues.push(path);
        continue;
      }
      if (result === null || typeof result !== 'object') {
        issues.push(path);
        continue;
      }
      if (result.model === 'player_game_alpha_v1') {
        playerResultCount += 1;
        if (
          state.playerProgramId === null ||
          ![fixture.homeProgramId, fixture.awayProgramId].includes(state.playerProgramId) ||
          !isValidWorldAlphaPlayerResult(result, fixture)
        )
          issues.push(path);
      } else if (
        result.model !== 'aggregate_alpha_v1' ||
        !isValidWorldAlphaAggregateResult(
          result,
          fixture,
          profiles.get(fixture.homeProgramId)!,
          profiles.get(fixture.awayProgramId)!,
        )
      ) {
        issues.push(path);
      } else {
        if (
          previousAggregateDrawAfter !== undefined &&
          result.worldRngDrawCountBefore !== previousAggregateDrawAfter
        )
          issues.push(`${path}.rng`);
        previousAggregateDrawAfter = result.worldRngDrawCountAfter;
      }
    }
    if (shouldBeComplete && playerResultCount !== (state.playerProgramId === null ? 0 : 1)) {
      issues.push(`regularSeasonResults.${roundIndex}.playerResult`);
    }
  }
  const expectedTables =
    issues.length === 0
      ? deriveWorldAlphaTables(definition, state.regularSeasonResults)
      : undefined;
  if (
    expectedTables !== undefined &&
    (!sameSerializable(state.programRecords, expectedTables.programRecords) ||
      !sameSerializable(state.groupStandings, expectedTables.groupStandings) ||
      !sameSerializable(state.rankings, expectedTables.rankings))
  )
    issues.push('tables');
  const topFour = state.rankings?.slice(0, 4).map(({ programId }) => programId) ?? [];
  if (state.postseason?.type !== 'PENDING') {
    if (state.postseason?.type !== 'ACTIVE' && state.postseason?.type !== 'COMPLETE') {
      issues.push('postseason');
    } else {
      if (
        state.completedRegularSeasonRoundCount !== 12 ||
        !sameSerializable(state.postseason.qualifierProgramIds, topFour)
      )
        issues.push('postseason.qualifiers');
      const postseasonResults: WorldAlphaPostseasonResult[] = [];
      for (const round of state.postseason.rounds) {
        for (const result of round.results) {
          if (result !== null) postseasonResults.push(result);
        }
      }
      const postseasonFixtures = state.postseason.rounds.flatMap(({ fixtures }) => fixtures);
      for (const [index, postseasonResult] of postseasonResults.entries()) {
        const fixture = postseasonFixtures.find(
          ({ id }) => id === postseasonResult.result.fixtureId,
        );
        const resultValid =
          fixture !== undefined &&
          (postseasonResult.result.model === 'aggregate_alpha_v1'
            ? isValidWorldAlphaAggregateResult(
                postseasonResult.result,
                fixture,
                profiles.get(fixture.homeProgramId)!,
                profiles.get(fixture.awayProgramId)!,
              )
            : state.playerProgramId !== null &&
              [fixture.homeProgramId, fixture.awayProgramId].includes(state.playerProgramId) &&
              isValidWorldAlphaPlayerResult(postseasonResult.result, fixture));
        if (
          fixture === undefined ||
          !resultValid ||
          postseasonResult.advancingProgramId !==
            (postseasonResult.result.winnerProgramId ?? fixture.homeProgramId) ||
          postseasonResult.usedHigherSeedTiebreak !==
            (postseasonResult.result.winnerProgramId === null)
        ) {
          issues.push(`postseason.results.${index}`);
        } else if (postseasonResult.result.model === 'aggregate_alpha_v1') {
          if (
            previousAggregateDrawAfter !== undefined &&
            postseasonResult.result.worldRngDrawCountBefore !== previousAggregateDrawAfter
          )
            issues.push(`postseason.results.${index}.rng`);
          previousAggregateDrawAfter = postseasonResult.result.worldRngDrawCountAfter;
        }
      }
      if (
        state.postseason.type === 'COMPLETE' &&
        state.postseason.rounds[1].results[0]?.advancingProgramId !==
          state.postseason.championProgramId
      )
        issues.push('postseason.championProgramId');
    }
  }
  if (
    previousAggregateDrawAfter !== undefined &&
    previousAggregateDrawAfter !== state.rng.drawCount
  )
    issues.push('rng.drawCount');
  return issues.length === 0
    ? deepFreeze({ ok: true as const, issues: [] as const })
    : deepFreeze({ ok: false as const, issues });
}

export function createWorldAlphaSeason(
  definition: WorldAlphaMechanicsDefinition,
  rng: RngState,
  seasonIndex: number,
  playerProgramId: ProgramId | null,
): WorldAlphaResult<WorldAlphaSeasonState> {
  if (
    !definitionIsValid(definition) ||
    !isRngState(rng) ||
    !integerIn(seasonIndex, 0, 100) ||
    (playerProgramId !== null &&
      !definition.programProfiles.some(({ programId }) => programId === playerProgramId))
  )
    return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_input' as const });
  const regularSeasonResults = [...definition.regularSeasonRounds]
    .sort((left, right) => left.roundNumber - right.roundNumber)
    .map((round) => ({
      roundId: round.id,
      fixtureResults: [...round.fixtures]
        .sort((left, right) => compareCodeUnits(left.id, right.id))
        .map(() => null),
    }));
  const tables = deriveWorldAlphaTables(definition, regularSeasonResults);
  const state: WorldAlphaSeasonState = {
    model: 'world_alpha_season_v1',
    seasonIndex,
    playerProgramId,
    rng,
    completedRegularSeasonRoundCount: 0,
    regularSeasonResults,
    ...tables,
    postseason: { type: 'PENDING' },
  };
  return validateWorldAlphaSeasonState(definition, state).ok
    ? deepFreeze({ ok: true as const, value: state })
    : deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_state' as const });
}

export function projectWorldAlphaPositionMatchup(
  definition: WorldAlphaMechanicsDefinition,
  positionId: unknown,
  playerProgramId: unknown,
  opponentProgramId: unknown,
  atHome: boolean,
): WorldAlphaPositionMatchupProjection | undefined {
  return definitionIsValid(definition)
    ? projectPositionMatchupFromProfiles(
        definition,
        positionId,
        playerProgramId,
        opponentProgramId,
        atHome,
      )
    : undefined;
}

/** The matchup arithmetic over any already-validated world definition's program profiles. */
export function projectPositionMatchupFromProfiles(
  definition: WorldAlphaMechanicsDefinition,
  positionId: unknown,
  playerProgramId: unknown,
  opponentProgramId: unknown,
  atHome: boolean,
): WorldAlphaPositionMatchupProjection | undefined {
  if (
    !isPositionId(positionId) ||
    !isProgramId(playerProgramId) ||
    !isProgramId(opponentProgramId) ||
    playerProgramId === opponentProgramId ||
    typeof atHome !== 'boolean'
  )
    return undefined;
  const player = definition.programProfiles.find(({ programId }) => programId === playerProgramId);
  const opponent = definition.programProfiles.find(
    ({ programId }) => programId === opponentProgramId,
  );
  if (player === undefined || opponent === undefined) return undefined;
  const defensePosition =
    positionId === 'position_cb' || positionId === 'position_lb' || positionId === 'position_edge';
  const positionRating = player.positionRatings[positionId];
  const supportingUnitRating = defensePosition ? player.defenseRating : player.offenseRating;
  const opponentPrimaryRating = defensePosition ? opponent.offenseRating : opponent.defenseRating;
  // Each defender's secondary opponent is the skill player they most often meet.
  const opponentSecondaryRating = defensePosition
    ? opponent.positionRatings[positionId === 'position_lb' ? 'position_rb' : 'position_qb']
    : opponent.defenseRating;
  const weights = defensePosition ? ([450, 300, 150, 100] as const) : ([450, 300, 250, 0] as const);
  const contributions = [
    positionRating * weights[0],
    supportingUnitRating * weights[1],
    (100 - opponentPrimaryRating) * weights[2],
    (100 - opponentSecondaryRating) * weights[3],
  ];
  const homeContributionMilli = atHome ? 2_000 : 0;
  const matchupScore = clamp(
    Math.round(
      (contributions.reduce((sum, value) => sum + value, 0) + homeContributionMilli) / 1_000,
    ),
    0,
    100,
  );
  return deepFreeze({
    positionId,
    playerProgramId,
    opponentProgramId,
    atHome,
    positionRating,
    supportingUnitRating,
    opponentPrimaryRating,
    opponentSecondaryRating,
    positionContributionMilli: contributions[0]!,
    supportingContributionMilli: contributions[1]!,
    opponentPrimaryContributionMilli: contributions[2]!,
    opponentSecondaryContributionMilli: contributions[3]!,
    homeContributionMilli,
    matchupScore,
    outlook: matchupScore >= 58 ? 'ADVANTAGE' : matchupScore <= 42 ? 'CHALLENGE' : 'BALANCED',
  });
}

export function worldAlphaSimulationTier(
  state: Pick<WorldAlphaSeasonState, 'playerProgramId' | 'rankings'>,
  definition: WorldAlphaMechanicsDefinition,
  fixture: WorldAlphaFixtureMechanics,
): WorldAlphaSimulationTier {
  if (
    state.playerProgramId !== null &&
    [fixture.homeProgramId, fixture.awayProgramId].includes(state.playerProgramId)
  )
    return 'TIER_1_PLAYER';
  const topEight = new Set(state.rankings.slice(0, 8).map(({ programId }) => programId));
  const groups = groupMap(definition);
  const playerProgramId = state.playerProgramId;
  const relevantToPlayer =
    playerProgramId !== null &&
    [fixture.homeProgramId, fixture.awayProgramId].some(
      (id) => groups.get(id) === groups.get(playerProgramId),
    );
  return topEight.has(fixture.homeProgramId) ||
    topEight.has(fixture.awayProgramId) ||
    relevantToPlayer
    ? 'TIER_2_RELEVANT'
    : 'TIER_3_DISTANT';
}

export function simulateWorldAlphaAggregate(
  fixture: WorldAlphaFixtureMechanics,
  home: WorldAlphaProgramMechanics,
  away: WorldAlphaProgramMechanics,
  tier: 'TIER_2_RELEVANT' | 'TIER_3_DISTANT',
  rng: RngState,
): { readonly result: WorldAlphaAggregateGameResult; readonly rng: RngState } {
  const homeAttack = Math.round((home.offenseRating * 2 + home.positionRatings.position_qb) / 3);
  const awayAttack = Math.round((away.offenseRating * 2 + away.positionRatings.position_qb) / 3);
  const homeExpectedScore = clamp(
    26 + Math.round((homeAttack - away.defenseRating) / 3) + 2,
    10,
    45,
  );
  const awayExpectedScore = clamp(26 + Math.round((awayAttack - home.defenseRating) / 3), 10, 45);
  const variance = tier === 'TIER_2_RELEVANT' ? 7 : 10;
  const before = rng.drawCount;
  const homeDraw = mappedDraw(rng, -variance, variance);
  const awayDraw = mappedDraw(homeDraw.rng, -variance, variance);
  const homeScore = clamp(homeExpectedScore + homeDraw.value, 0, 70);
  const awayScore = clamp(awayExpectedScore + awayDraw.value, 0, 70);
  return {
    rng: awayDraw.rng,
    result: {
      model: 'aggregate_alpha_v1',
      fixtureId: fixture.id,
      simulationTier: tier,
      homeScore,
      awayScore,
      winnerProgramId: winner(fixture, homeScore, awayScore),
      homeExpectedScore,
      awayExpectedScore,
      homeVariance: homeDraw.value,
      awayVariance: awayDraw.value,
      worldRngDrawCountBefore: before,
      worldRngDrawCountAfter: awayDraw.rng.drawCount,
    },
  };
}

export function isValidWorldAlphaPlayerResult(
  result: WorldAlphaPlayerGameResult,
  fixture: WorldAlphaFixtureMechanics,
): boolean {
  return (
    result?.model === 'player_game_alpha_v1' &&
    result.fixtureId === fixture.id &&
    integerIn(result.homeScore, 0, 100) &&
    integerIn(result.awayScore, 0, 100) &&
    result.winnerProgramId === winner(fixture, result.homeScore, result.awayScore)
  );
}

export function resolveNextWorldAlphaRegularRound(
  state: WorldAlphaSeasonState,
  definition: WorldAlphaMechanicsDefinition,
  playerResult: WorldAlphaPlayerGameResult | null = null,
): WorldAlphaResult<ResolveWorldAlphaRoundResult> {
  if (
    !definitionIsValid(definition) ||
    state.model !== 'world_alpha_season_v1' ||
    !isRngState(state.rng) ||
    !validateWorldAlphaSeasonState(definition, state).ok ||
    state.postseason.type !== 'PENDING' ||
    state.completedRegularSeasonRoundCount >= 12
  )
    return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_state' as const });
  const roundIndex = state.completedRegularSeasonRoundCount;
  const round = definition.regularSeasonRounds.find(
    ({ roundNumber }) => roundNumber === roundIndex + 1,
  )!;
  const canonicalFixtures = [...round.fixtures].sort((a, b) => compareCodeUnits(a.id, b.id));
  const playerFixture =
    state.playerProgramId === null
      ? undefined
      : canonicalFixtures.find(
          (fixture) =>
            fixture.homeProgramId === state.playerProgramId ||
            fixture.awayProgramId === state.playerProgramId,
        );
  if (
    (playerFixture === undefined) !== (playerResult === null) ||
    (playerFixture !== undefined &&
      playerResult !== null &&
      !isValidWorldAlphaPlayerResult(playerResult, playerFixture))
  )
    return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_input' as const });
  const profileById = new Map(
    definition.programProfiles.map((profile) => [profile.programId, profile]),
  );
  const before = state.rng.drawCount;
  let rng = state.rng;
  const results: WorldAlphaGameResult[] = [];
  for (const fixture of canonicalFixtures) {
    const tier = worldAlphaSimulationTier(state, definition, fixture);
    if (tier === 'TIER_1_PLAYER') {
      if (playerResult === null || playerResult.fixtureId !== fixture.id)
        return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_input' as const });
      results.push(cloneSerializable(playerResult));
    } else {
      const simulated = simulateWorldAlphaAggregate(
        fixture,
        profileById.get(fixture.homeProgramId)!,
        profileById.get(fixture.awayProgramId)!,
        tier,
        rng,
      );
      rng = simulated.rng;
      results.push(simulated.result);
    }
  }
  const resultById = new Map(results.map((result) => [result.fixtureId, result]));
  const regularSeasonResults = state.regularSeasonResults.map((entry, index) =>
    index === roundIndex
      ? {
          roundId: entry.roundId,
          fixtureResults: canonicalFixtures.map((fixture) => resultById.get(fixture.id)!),
        }
      : cloneSerializable(entry),
  );
  const tables = deriveWorldAlphaTables(definition, regularSeasonResults);
  const nextState: WorldAlphaSeasonState = {
    ...cloneSerializable(state),
    rng,
    completedRegularSeasonRoundCount: roundIndex + 1,
    regularSeasonResults,
    ...tables,
  };
  const resolved: ResolveWorldAlphaRoundResult = {
    ok: true,
    state: nextState,
    worldRngDrawCountBefore: before,
    worldRngDrawCountAfter: rng.drawCount,
  };
  return deepFreeze({ ok: true as const, value: resolved });
}

export function initializeWorldAlphaPostseason(
  state: WorldAlphaSeasonState,
  definition: WorldAlphaMechanicsDefinition,
): WorldAlphaResult<WorldAlphaSeasonState> {
  if (
    !validateWorldAlphaSeasonState(definition, state).ok ||
    state.completedRegularSeasonRoundCount !== 12 ||
    state.postseason.type !== 'PENDING' ||
    state.rankings.length !== 32
  )
    return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_state' as const });
  const qualifiers = state.rankings.slice(0, 4).map(({ programId }) => programId) as [
    ProgramId,
    ProgramId,
    ProgramId,
    ProgramId,
  ];
  const fixture = (homeSeed: number, awaySeed: number): WorldAlphaPostseasonFixture => ({
    id: `world_alpha_postseason_semifinal_${homeSeed}_${awaySeed}`,
    homeProgramId: qualifiers[homeSeed - 1]!,
    awayProgramId: qualifiers[awaySeed - 1]!,
    homeSeed,
    awaySeed,
  });
  const nextState: WorldAlphaSeasonState = {
    ...cloneSerializable(state),
    postseason: {
      type: 'ACTIVE',
      qualifierProgramIds: qualifiers,
      currentRoundIndex: 0,
      rounds: [
        {
          id: 'world_alpha_postseason_semifinal',
          fixtures: [fixture(1, 4), fixture(2, 3)],
          results: [null, null],
        },
        { id: 'world_alpha_postseason_final', fixtures: [], results: [] },
      ],
    },
  };
  return deepFreeze({ ok: true as const, value: nextState });
}

export function resolveNextWorldAlphaPostseasonRound(
  state: WorldAlphaSeasonState,
  definition: WorldAlphaMechanicsDefinition,
  playerResult: WorldAlphaPlayerGameResult | null = null,
): WorldAlphaResult<WorldAlphaSeasonState> {
  if (
    !definitionIsValid(definition) ||
    !validateWorldAlphaSeasonState(definition, state).ok ||
    state.postseason.type !== 'ACTIVE' ||
    !isRngState(state.rng)
  )
    return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_state' as const });
  const profileById = new Map(
    definition.programProfiles.map((profile) => [profile.programId, profile]),
  );
  const active = state.postseason;
  const round = active.rounds[active.currentRoundIndex];
  const playerFixture =
    state.playerProgramId === null
      ? undefined
      : round.fixtures.find(
          ({ homeProgramId, awayProgramId }) =>
            homeProgramId === state.playerProgramId || awayProgramId === state.playerProgramId,
        );
  if (
    (playerFixture === undefined) !== (playerResult === null) ||
    (playerFixture !== undefined &&
      playerResult !== null &&
      !isValidWorldAlphaPlayerResult(playerResult, playerFixture))
  )
    return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_input' as const });
  let rng = state.rng;
  const results = round.fixtures.map((fixture) => {
    const result =
      playerFixture?.id === fixture.id && playerResult !== null
        ? cloneSerializable(playerResult)
        : (() => {
            const simulated = simulateWorldAlphaAggregate(
              fixture,
              profileById.get(fixture.homeProgramId)!,
              profileById.get(fixture.awayProgramId)!,
              'TIER_2_RELEVANT',
              rng,
            );
            rng = simulated.rng;
            return simulated.result;
          })();
    return {
      result,
      advancingProgramId: result.winnerProgramId ?? fixture.homeProgramId,
      usedHigherSeedTiebreak: result.winnerProgramId === null,
    };
  });
  if (active.currentRoundIndex === 0) {
    const semifinalResults = results as [WorldAlphaPostseasonResult, WorldAlphaPostseasonResult];
    const seedByProgram = new Map(
      active.qualifierProgramIds.map((programId, index) => [programId, index + 1]),
    );
    const finalists = semifinalResults.map(({ advancingProgramId }) => advancingProgramId) as [
      ProgramId,
      ProgramId,
    ];
    finalists.sort((a, b) => seedByProgram.get(a)! - seedByProgram.get(b)!);
    const finalFixture: WorldAlphaPostseasonFixture = {
      id: 'world_alpha_postseason_final_01',
      homeProgramId: finalists[0],
      awayProgramId: finalists[1],
      homeSeed: seedByProgram.get(finalists[0])!,
      awaySeed: seedByProgram.get(finalists[1])!,
    };
    const nextState: WorldAlphaSeasonState = {
      ...cloneSerializable(state),
      rng,
      postseason: {
        type: 'ACTIVE',
        qualifierProgramIds: active.qualifierProgramIds,
        currentRoundIndex: 1,
        rounds: [
          { ...active.rounds[0], results: semifinalResults },
          { id: 'world_alpha_postseason_final', fixtures: [finalFixture], results: [null] },
        ],
      },
    };
    return deepFreeze({ ok: true as const, value: nextState });
  }
  const finalResult = results[0]!;
  const semifinals = active.rounds[0].results as [
    WorldAlphaPostseasonResult,
    WorldAlphaPostseasonResult,
  ];
  const nextState: WorldAlphaSeasonState = {
    ...cloneSerializable(state),
    rng,
    postseason: {
      type: 'COMPLETE',
      qualifierProgramIds: active.qualifierProgramIds,
      rounds: [
        { ...active.rounds[0], results: semifinals },
        {
          id: 'world_alpha_postseason_final',
          fixtures: active.rounds[1].fixtures as [WorldAlphaPostseasonFixture],
          results: [finalResult],
        },
      ],
      championProgramId: finalResult.advancingProgramId,
    },
  };
  return deepFreeze({ ok: true as const, value: nextState });
}

export function projectWorldAlphaOffseason(
  state: WorldAlphaSeasonState,
  definition: WorldAlphaMechanicsDefinition,
): WorldAlphaResult<WorldAlphaOffseasonProjection> {
  if (
    !definitionIsValid(definition) ||
    !validateWorldAlphaSeasonState(definition, state).ok ||
    state.postseason.type !== 'COMPLETE' ||
    !isRngState(state.rng) ||
    state.rng.drawCount > Number.MAX_SAFE_INTEGER - 96
  )
    return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_state' as const });
  const before = state.rng.drawCount;
  let rng = state.rng;
  const programs = [...definition.programProfiles]
    .sort((a, b) => compareCodeUnits(a.programId, b.programId))
    .map((profile, index) => {
      const staff = mappedDraw(rng, 0, 99);
      rng = staff.rng;
      const departing = mappedDraw(rng, -4, 4);
      rng = departing.rng;
      const incoming = mappedDraw(rng, -4, 4);
      rng = incoming.rng;
      const staffOutcome: WorldAlphaStaffOutcome =
        staff.value < 60
          ? 'CONTINUITY'
          : staff.value < 85
            ? 'POSITION_STAFF_CHANGE'
            : 'SCHEME_SHIFT';
      const positionStaffFocus =
        staffOutcome === 'POSITION_STAFF_CHANGE'
          ? POSITION_IDS[index % POSITION_IDS.length]!
          : null;
      const ratingDelta = clamp(incoming.value - departing.value, -6, 6);
      const positionRatings = Object.fromEntries(
        POSITION_IDS.map((positionId) => [
          positionId,
          clamp(
            profile.positionRatings[positionId] +
              ratingDelta +
              (positionId === positionStaffFocus ? 2 : 0),
            35,
            95,
          ),
        ]),
      ) as Record<PositionId, number>;
      const after: WorldAlphaProgramMechanics = {
        ...cloneSerializable(profile),
        offenseRating: clamp(
          profile.offenseRating + ratingDelta + (staffOutcome === 'SCHEME_SHIFT' ? 1 : 0),
          35,
          95,
        ),
        defenseRating: clamp(
          profile.defenseRating + ratingDelta - (staffOutcome === 'SCHEME_SHIFT' ? 1 : 0),
          35,
          95,
        ),
        positionRatings,
      };
      return {
        programId: profile.programId,
        staffOutcome,
        positionStaffFocus,
        departingPressure: departing.value,
        incomingPressure: incoming.value,
        ratingDelta,
        before: cloneSerializable(profile),
        after,
      };
    });
  const projection: WorldAlphaOffseasonProjection = {
    model: 'world_alpha_offseason_v1',
    seasonIndex: state.seasonIndex,
    worldRngDrawCountBefore: before,
    worldRngDrawCountAfter: rng.drawCount,
    programs,
    rng,
  };
  return deepFreeze({ ok: true as const, value: projection });
}

export function createEmptyWorldAlphaHistory(): WorldAlphaHistory {
  return deepFreeze({
    model: 'world_alpha_history_v1',
    detailedSeasons: [],
    summarizedSeasons: [],
  });
}

function summarize(entry: WorldAlphaSeasonArchiveEntry): WorldAlphaSeasonSummary {
  return {
    seasonIndex: entry.seasonIndex,
    championProgramId: entry.championProgramId,
    topFourProgramIds: entry.finalRankings.slice(0, 4).map(({ programId }) => programId) as [
      ProgramId,
      ProgramId,
      ProgramId,
      ProgramId,
    ],
    records: entry.programRecords.map(({ programId, wins, losses, ties }) => ({
      programId,
      wins,
      losses,
      ties,
    })),
  };
}

export function archiveCompletedWorldAlphaSeason(
  history: WorldAlphaHistory,
  state: WorldAlphaSeasonState,
  definition: WorldAlphaMechanicsDefinition,
): WorldAlphaResult<WorldAlphaHistory> {
  if (
    history?.model !== 'world_alpha_history_v1' ||
    !validateWorldAlphaSeasonState(definition, state).ok ||
    state.postseason.type !== 'COMPLETE' ||
    [...history.detailedSeasons, ...history.summarizedSeasons].some(
      ({ seasonIndex }) => seasonIndex === state.seasonIndex,
    )
  )
    return deepFreeze({ ok: false as const, reason: 'world_alpha.invalid_state' as const });
  const entry: WorldAlphaSeasonArchiveEntry = {
    seasonIndex: state.seasonIndex,
    championProgramId: state.postseason.championProgramId,
    programRecords: cloneSerializable(state.programRecords),
    finalRankings: cloneSerializable(state.rankings),
    regularSeasonResults: cloneSerializable(state.regularSeasonResults),
    postseason: cloneSerializable(state.postseason),
  };
  const detailed = [...history.detailedSeasons, entry].sort(
    (a, b) => a.seasonIndex - b.seasonIndex,
  );
  const moved =
    detailed.length > WORLD_ALPHA_DETAILED_HISTORY_LIMIT
      ? detailed.splice(0, detailed.length - WORLD_ALPHA_DETAILED_HISTORY_LIMIT).map(summarize)
      : [];
  const summarized = [...history.summarizedSeasons, ...moved]
    .sort((a, b) => a.seasonIndex - b.seasonIndex)
    .slice(-WORLD_ALPHA_SUMMARY_HISTORY_LIMIT);
  const nextHistory: WorldAlphaHistory = {
    model: 'world_alpha_history_v1',
    detailedSeasons: detailed,
    summarizedSeasons: summarized,
  };
  return deepFreeze({ ok: true as const, value: nextHistory });
}
