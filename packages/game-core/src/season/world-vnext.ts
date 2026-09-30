import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { POSITION_IDS, isProgramId, type ProgramId } from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import {
  deriveWorldAlphaTables,
  isValidWorldAlphaAggregateResult,
  isValidWorldAlphaPlayerResult,
  projectPositionMatchupFromProfiles,
  simulateWorldAlphaAggregate,
  worldAlphaSimulationTier,
  type WorldAlphaAggregateGameResult,
  type WorldAlphaGameResult,
  type WorldAlphaGroupStanding,
  type WorldAlphaMechanicsDefinition,
  type WorldAlphaPlayerGameResult,
  type WorldAlphaPositionMatchupProjection,
  type WorldAlphaPostseasonFixture,
  type WorldAlphaPostseasonResult,
  type WorldAlphaProgramMechanics,
  type WorldAlphaProgramRecord,
  type WorldAlphaRanking,
  type WorldAlphaRoundState,
} from './world-alpha.js';

/**
 * The Career VNext conference world (M8): 64 programs in eight conferences of eight, a 12-round
 * schedule (seven conference rounds, then five non-conference rounds) and a 12-team bracket of the
 * eight conference champions plus four at-large programs, seeded by the national ranking.
 *
 * Game resolution, tables and rankings reuse the shipped aggregate world model exactly: the
 * player's fixture is a supplied result (no world draw) and every other fixture consumes two
 * world draws in stable fixture-ID order. Only the league shape and the bracket are new.
 */
export const WORLD_VNEXT_ID = 'world_vnext_64_program' as const;
export const WORLD_VNEXT_96_ID = 'world_vnext_96_program' as const;
export const WORLD_VNEXT_CONFERENCE_COUNT = 8 as const;
export const WORLD_VNEXT_REGULAR_ROUND_COUNT = 12 as const;

/**
 * League shapes by definition ID. M8 is eight conferences of 8 (seven conference rounds, then
 * five non-conference). M9 is eight conferences of 12 (three early non-conference rounds, then
 * nine conference games from a 12-team round robin). Both use the same bracket and calendar.
 */
export const WORLD_VNEXT_SHAPES = Object.freeze({
  [WORLD_VNEXT_ID]: Object.freeze({
    conferenceSize: 8,
    nonConferenceRounds: Object.freeze([8, 9, 10, 11, 12]),
  }),
  [WORLD_VNEXT_96_ID]: Object.freeze({
    conferenceSize: 12,
    nonConferenceRounds: Object.freeze([1, 2, 3]),
  }),
} as const);
export type WorldVNextId = keyof typeof WORLD_VNEXT_SHAPES;

function shapeOf(definition: WorldAlphaMechanicsDefinition) {
  return (
    WORLD_VNEXT_SHAPES as Readonly<Record<string, (typeof WORLD_VNEXT_SHAPES)[WorldVNextId]>>
  )[definition?.id];
}
export const WORLD_VNEXT_QUALIFIER_COUNT = 12 as const;
export const WORLD_VNEXT_BYE_COUNT = 4 as const;

export const WORLD_VNEXT_ROUND_IDS = Object.freeze([
  'world_vnext_postseason_first_round',
  'world_vnext_postseason_quarterfinal',
  'world_vnext_postseason_semifinal',
  'world_vnext_postseason_final',
] as const);
export type WorldVNextRoundId = (typeof WORLD_VNEXT_ROUND_IDS)[number];

export interface WorldVNextQualifier {
  readonly programId: ProgramId;
  readonly seed: number;
  readonly conferenceChampion: boolean;
}

export interface WorldVNextBracketRound {
  readonly id: WorldVNextRoundId;
  readonly fixtures: readonly WorldAlphaPostseasonFixture[];
  readonly results: readonly (WorldAlphaPostseasonResult | null)[];
}

export type WorldVNextPostseasonState =
  | { readonly type: 'PENDING' }
  | {
      readonly type: 'ACTIVE';
      readonly qualifiers: readonly WorldVNextQualifier[];
      readonly currentRoundIndex: number;
      readonly rounds: readonly WorldVNextBracketRound[];
    }
  | {
      readonly type: 'COMPLETE';
      readonly qualifiers: readonly WorldVNextQualifier[];
      readonly rounds: readonly WorldVNextBracketRound[];
      readonly championProgramId: ProgramId;
    };

export interface WorldVNextSeasonState {
  readonly model: 'world_vnext_season_v1';
  /** The definition this season runs on (absent = the M8 64-program world). */
  readonly worldId?: WorldVNextId;
  readonly seasonIndex: number;
  readonly playerProgramId: ProgramId | null;
  readonly rng: RngState;
  readonly completedRegularSeasonRoundCount: number;
  readonly regularSeasonResults: readonly WorldAlphaRoundState[];
  readonly programRecords: readonly WorldAlphaProgramRecord[];
  readonly groupStandings: readonly WorldAlphaGroupStanding[];
  readonly rankings: readonly WorldAlphaRanking[];
  readonly postseason: WorldVNextPostseasonState;
}

/**
 * Conference-world overtime for aggregate games: a regulation tie takes one more world draw; the
 * higher expected score is favored, and the winner adds a field goal or a touchdown.
 */
export interface WorldVNextOvertime {
  readonly homeRegulation: number;
  readonly awayRegulation: number;
}

function aggregateWithOvertime(
  fixture: { readonly homeProgramId: ProgramId; readonly awayProgramId: ProgramId },
  simulated: { readonly result: WorldAlphaAggregateGameResult; readonly rng: RngState },
): { readonly result: WorldAlphaAggregateGameResult; readonly rng: RngState } {
  const result = simulated.result;
  if (result.winnerProgramId !== null) return simulated;
  const draw = nextUint32(simulated.rng);
  const homeChance = Math.min(
    800,
    Math.max(200, 500 + (result.homeExpectedScore - result.awayExpectedScore) * 25),
  );
  const homeWins = draw.value % 1_000 < homeChance;
  const points = Math.floor(draw.value / 1_000) % 10 < 6 ? 3 : 7;
  return {
    rng: draw.nextRng,
    result: {
      ...result,
      homeScore: result.homeScore + (homeWins ? points : 0),
      awayScore: result.awayScore + (homeWins ? 0 : points),
      winnerProgramId: homeWins ? fixture.homeProgramId : fixture.awayProgramId,
      worldRngDrawCountAfter: draw.nextRng.drawCount,
      overtime: { homeRegulation: result.homeScore, awayRegulation: result.awayScore },
    } as WorldAlphaAggregateGameResult,
  };
}

/** An aggregate result, allowing one conference-world overtime on top of the shipped model. */
function validAggregate(
  result: WorldAlphaAggregateGameResult & { readonly overtime?: WorldVNextOvertime },
  fixture: {
    readonly id: string;
    readonly homeProgramId: ProgramId;
    readonly awayProgramId: ProgramId;
  },
  home: WorldAlphaProgramMechanics,
  away: WorldAlphaProgramMechanics,
): boolean {
  const overtime = result.overtime;
  if (overtime === undefined) return isValidWorldAlphaAggregateResult(result, fixture, home, away);
  const { overtime: _overtime, ...rest } = result;
  void _overtime;
  const regulation = {
    ...rest,
    homeScore: overtime.homeRegulation,
    awayScore: overtime.awayRegulation,
    winnerProgramId: null,
    worldRngDrawCountAfter: result.worldRngDrawCountBefore + 2,
  };
  const homeDelta = result.homeScore - overtime.homeRegulation;
  const awayDelta = result.awayScore - overtime.awayRegulation;
  return (
    overtime.homeRegulation === overtime.awayRegulation &&
    isValidWorldAlphaAggregateResult(regulation, fixture, home, away) &&
    result.worldRngDrawCountAfter === result.worldRngDrawCountBefore + 3 &&
    ((homeDelta === 0 &&
      [3, 7].includes(awayDelta) &&
      result.winnerProgramId === fixture.awayProgramId) ||
      (awayDelta === 0 &&
        [3, 7].includes(homeDelta) &&
        result.winnerProgramId === fixture.homeProgramId))
  );
}

type Result<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly reason: 'world_vnext.invalid_input' | 'world_vnext.invalid_state';
    };

const invalid = (reason: 'world_vnext.invalid_input' | 'world_vnext.invalid_state') =>
  deepFreeze({ ok: false as const, reason });
const ok = <T>(value: T) => deepFreeze({ ok: true as const, value });

function integerIn(value: unknown, minimum: number, maximum: number): value is number {
  return (
    Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum
  );
}

const validDefinitions = new WeakSet<object>();

/** Eight conferences of eight, reciprocal rivals, seven conference then five distinct outside games. */
export function isWorldVNextDefinition(value: unknown): value is WorldAlphaMechanicsDefinition {
  const definition = value as WorldAlphaMechanicsDefinition;
  if (typeof value === 'object' && value !== null && validDefinitions.has(value)) return true;
  const shape = shapeOf(definition);
  if (
    shape === undefined ||
    !Array.isArray(definition.groups) ||
    definition.groups.length !== WORLD_VNEXT_CONFERENCE_COUNT ||
    !Array.isArray(definition.programProfiles) ||
    definition.programProfiles.length !== WORLD_VNEXT_CONFERENCE_COUNT * shape.conferenceSize ||
    !Array.isArray(definition.regularSeasonRounds) ||
    definition.regularSeasonRounds.length !== WORLD_VNEXT_REGULAR_ROUND_COUNT
  )
    return false;
  const profiles = new Map<string, WorldAlphaProgramMechanics>();
  for (const profile of definition.programProfiles) {
    if (
      !isProgramId(profile?.programId) ||
      profiles.has(profile.programId) ||
      !isProgramId(profile.rivalProgramId) ||
      profile.rivalProgramId === profile.programId ||
      typeof profile.aggregateTierId !== 'string' ||
      !integerIn(profile.offenseRating, 35, 95) ||
      !integerIn(profile.defenseRating, 35, 95) ||
      POSITION_IDS.some((positionId) => !integerIn(profile.positionRatings?.[positionId], 35, 95))
    )
      return false;
    profiles.set(profile.programId, profile);
  }
  const conferenceOf = new Map<string, string>();
  for (const group of definition.groups) {
    if (
      typeof group?.id !== 'string' ||
      group.id.length === 0 ||
      !Array.isArray(group.programIds) ||
      group.programIds.length !== shape.conferenceSize
    )
      return false;
    for (const programId of group.programIds) {
      if (!profiles.has(programId) || conferenceOf.has(programId)) return false;
      conferenceOf.set(programId, group.id);
    }
  }
  for (const profile of profiles.values())
    if (
      conferenceOf.get(profile.programId) !== profile.groupId ||
      profiles.get(profile.rivalProgramId)?.rivalProgramId !== profile.programId
    )
      return false;
  const fixtureIds = new Set<string>();
  const roundNumbers = new Set<number>();
  const opponents = new Map([...profiles.keys()].map((id) => [id, [] as string[]]));
  for (const round of definition.regularSeasonRounds) {
    if (
      !integerIn(round?.roundNumber, 1, WORLD_VNEXT_REGULAR_ROUND_COUNT) ||
      roundNumbers.has(round.roundNumber) ||
      typeof round.id !== 'string' ||
      !Array.isArray(round.fixtures) ||
      round.fixtures.length !== (WORLD_VNEXT_CONFERENCE_COUNT * shape.conferenceSize) / 2
    )
      return false;
    roundNumbers.add(round.roundNumber);
    const appearances = new Set<string>();
    for (const fixture of round.fixtures) {
      if (
        typeof fixture?.id !== 'string' ||
        fixtureIds.has(fixture.id) ||
        !profiles.has(fixture.homeProgramId) ||
        !profiles.has(fixture.awayProgramId) ||
        fixture.homeProgramId === fixture.awayProgramId ||
        appearances.has(fixture.homeProgramId) ||
        appearances.has(fixture.awayProgramId)
      )
        return false;
      const conferenceGame =
        conferenceOf.get(fixture.homeProgramId) === conferenceOf.get(fixture.awayProgramId);
      if (
        (shape.nonConferenceRounds as readonly number[]).includes(round.roundNumber) ===
        conferenceGame
      )
        return false;
      fixtureIds.add(fixture.id);
      appearances.add(fixture.homeProgramId);
      appearances.add(fixture.awayProgramId);
      opponents.get(fixture.homeProgramId)!.push(fixture.awayProgramId);
      opponents.get(fixture.awayProgramId)!.push(fixture.homeProgramId);
    }
  }
  const valid = [...opponents.values()].every(
    (values) => values.length === WORLD_VNEXT_REGULAR_ROUND_COUNT && new Set(values).size === 12,
  );
  if (valid) validDefinitions.add(definition);
  return valid;
}

function canonicalRounds(definition: WorldAlphaMechanicsDefinition) {
  return [...definition.regularSeasonRounds]
    .sort((left, right) => left.roundNumber - right.roundNumber)
    .map((round) => ({
      ...round,
      fixtures: [...round.fixtures].sort((left, right) => compareCodeUnits(left.id, right.id)),
    }));
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The eight conference champions (standings rank 1) plus the four best-ranked others, seeded 1–12. */
export function selectWorldVNextQualifiers(
  state: Pick<WorldVNextSeasonState, 'groupStandings' | 'rankings'>,
): readonly WorldVNextQualifier[] {
  const champions = new Set(
    state.groupStandings.filter(({ rank }) => rank === 1).map(({ programId }) => programId),
  );
  const ranked = [...state.rankings].sort((left, right) => left.rank - right.rank);
  const atLarge = ranked
    .filter(({ programId }) => !champions.has(programId))
    .slice(0, WORLD_VNEXT_QUALIFIER_COUNT - champions.size)
    .map(({ programId }) => programId);
  const field = new Set([...champions, ...atLarge]);
  return ranked
    .filter(({ programId }) => field.has(programId))
    .map(({ programId }, index) => ({
      programId,
      seed: index + 1,
      conferenceChampion: champions.has(programId),
    }));
}

function seedOf(qualifiers: readonly WorldVNextQualifier[], programId: ProgramId): number {
  return qualifiers.find((entry) => entry.programId === programId)!.seed;
}

function bracketFixture(
  roundId: WorldVNextRoundId,
  qualifiers: readonly WorldVNextQualifier[],
  left: ProgramId,
  right: ProgramId,
): WorldAlphaPostseasonFixture {
  const [home, away] =
    seedOf(qualifiers, left) < seedOf(qualifiers, right) ? [left, right] : [right, left];
  const homeSeed = seedOf(qualifiers, home);
  const awaySeed = seedOf(qualifiers, away);
  return {
    id: `${roundId}_${homeSeed}_${awaySeed}`,
    homeProgramId: home,
    awayProgramId: away,
    homeSeed,
    awaySeed,
  };
}

/** Fixed bracket: 5–12, 6–11, 7–10, 8–9; seed k meets the winner of (9−k, 8+k); 1/4 and 2/3 sides. */
function nextRound(
  qualifiers: readonly WorldVNextQualifier[],
  rounds: readonly WorldVNextBracketRound[],
): WorldVNextBracketRound | null {
  const bySeed = (seed: number) => qualifiers.find((entry) => entry.seed === seed)!.programId;
  const winners = (round: WorldVNextBracketRound) =>
    round.results.map((result) => result!.advancingProgramId);
  const index = rounds.length;
  const roundId = WORLD_VNEXT_ROUND_IDS[index];
  if (roundId === undefined) return null;
  let pairs: (readonly [ProgramId, ProgramId])[];
  if (index === 0) pairs = [5, 6, 7, 8].map((seed) => [bySeed(seed), bySeed(17 - seed)] as const);
  else if (index === 1) {
    const firstRound = winners(rounds[0]!);
    pairs = [1, 2, 3, 4].map((seed) => [bySeed(seed), firstRound[4 - seed]!] as const);
  } else if (index === 2) {
    const quarterfinal = winners(rounds[1]!);
    pairs = [
      [quarterfinal[0]!, quarterfinal[3]!],
      [quarterfinal[1]!, quarterfinal[2]!],
    ];
  } else {
    const semifinal = winners(rounds[2]!);
    pairs = [[semifinal[0]!, semifinal[1]!]];
  }
  const fixtures = pairs.map(([left, right]) => bracketFixture(roundId, qualifiers, left, right));
  return { id: roundId, fixtures, results: fixtures.map(() => null) };
}

export function createWorldVNextSeason(
  definition: WorldAlphaMechanicsDefinition,
  rng: RngState,
  seasonIndex: number,
  playerProgramId: ProgramId | null,
): Result<WorldVNextSeasonState> {
  if (
    !isWorldVNextDefinition(definition) ||
    !isRngState(rng) ||
    !integerIn(seasonIndex, 0, 100) ||
    (playerProgramId !== null &&
      !definition.programProfiles.some(({ programId }) => programId === playerProgramId))
  )
    return invalid('world_vnext.invalid_input');
  const regularSeasonResults = canonicalRounds(definition).map((round) => ({
    roundId: round.id,
    fixtureResults: round.fixtures.map(() => null),
  }));
  return ok<WorldVNextSeasonState>({
    model: 'world_vnext_season_v1',
    // The M8 world keeps its original state shape; later worlds name themselves.
    ...(definition.id === WORLD_VNEXT_ID ? {} : { worldId: definition.id as WorldVNextId }),
    seasonIndex,
    playerProgramId,
    rng,
    completedRegularSeasonRoundCount: 0,
    regularSeasonResults,
    ...deriveWorldAlphaTables(definition, regularSeasonResults),
    postseason: { type: 'PENDING' },
  });
}

function playerFixtureIn(
  state: WorldVNextSeasonState,
  fixtures: readonly {
    readonly id: string;
    readonly homeProgramId: ProgramId;
    readonly awayProgramId: ProgramId;
  }[],
) {
  return state.playerProgramId === null
    ? undefined
    : fixtures.find(
        ({ homeProgramId, awayProgramId }) =>
          homeProgramId === state.playerProgramId || awayProgramId === state.playerProgramId,
      );
}

export function resolveNextWorldVNextRegularRound(
  state: WorldVNextSeasonState,
  definition: WorldAlphaMechanicsDefinition,
  playerResult: WorldAlphaPlayerGameResult | null = null,
): Result<WorldVNextSeasonState> {
  if (
    !isWorldVNextDefinition(definition) ||
    state?.model !== 'world_vnext_season_v1' ||
    (state.worldId ?? WORLD_VNEXT_ID) !== definition.id ||
    !isRngState(state.rng) ||
    state.postseason.type !== 'PENDING' ||
    !integerIn(state.completedRegularSeasonRoundCount, 0, WORLD_VNEXT_REGULAR_ROUND_COUNT - 1)
  )
    return invalid('world_vnext.invalid_state');
  const roundIndex = state.completedRegularSeasonRoundCount;
  const round = canonicalRounds(definition)[roundIndex]!;
  const playerFixture = playerFixtureIn(state, round.fixtures);
  if (
    (playerFixture === undefined) !== (playerResult === null) ||
    (playerFixture !== undefined && !isValidWorldAlphaPlayerResult(playerResult!, playerFixture))
  )
    return invalid('world_vnext.invalid_input');
  const profileById = new Map(definition.programProfiles.map((entry) => [entry.programId, entry]));
  let rng = state.rng;
  const results: WorldAlphaGameResult[] = round.fixtures.map((fixture) => {
    if (fixture.id === playerFixture?.id) return cloneSerializable(playerResult!);
    const tier = worldAlphaSimulationTier(state, definition, fixture) as
      'TIER_2_RELEVANT' | 'TIER_3_DISTANT';
    const simulated = aggregateWithOvertime(
      fixture,
      simulateWorldAlphaAggregate(
        fixture,
        profileById.get(fixture.homeProgramId)!,
        profileById.get(fixture.awayProgramId)!,
        tier,
        rng,
      ),
    );
    rng = simulated.rng;
    return simulated.result;
  });
  const regularSeasonResults = state.regularSeasonResults.map((entry, index) =>
    index === roundIndex ? { roundId: entry.roundId, fixtureResults: results } : entry,
  );
  return ok<WorldVNextSeasonState>({
    ...cloneSerializable(state),
    rng,
    completedRegularSeasonRoundCount: roundIndex + 1,
    regularSeasonResults: cloneSerializable(regularSeasonResults),
    ...deriveWorldAlphaTables(definition, regularSeasonResults),
  });
}

export function initializeWorldVNextPostseason(
  state: WorldVNextSeasonState,
  definition: WorldAlphaMechanicsDefinition,
): Result<WorldVNextSeasonState> {
  if (
    !isWorldVNextDefinition(definition) ||
    state?.model !== 'world_vnext_season_v1' ||
    (state.worldId ?? WORLD_VNEXT_ID) !== definition.id ||
    state.completedRegularSeasonRoundCount !== WORLD_VNEXT_REGULAR_ROUND_COUNT ||
    state.postseason.type !== 'PENDING'
  )
    return invalid('world_vnext.invalid_state');
  const qualifiers = selectWorldVNextQualifiers(state);
  if (qualifiers.length !== WORLD_VNEXT_QUALIFIER_COUNT)
    return invalid('world_vnext.invalid_state');
  const first = nextRound(qualifiers, [])!;
  return ok<WorldVNextSeasonState>({
    ...cloneSerializable(state),
    postseason: { type: 'ACTIVE', qualifiers, currentRoundIndex: 0, rounds: [first] },
  });
}

export function resolveNextWorldVNextPostseasonRound(
  state: WorldVNextSeasonState,
  definition: WorldAlphaMechanicsDefinition,
  playerResult: WorldAlphaPlayerGameResult | null = null,
): Result<WorldVNextSeasonState> {
  if (
    !isWorldVNextDefinition(definition) ||
    state?.model !== 'world_vnext_season_v1' ||
    (state.worldId ?? WORLD_VNEXT_ID) !== definition.id ||
    state.postseason.type !== 'ACTIVE' ||
    !isRngState(state.rng)
  )
    return invalid('world_vnext.invalid_state');
  const active = state.postseason;
  const round = active.rounds[active.currentRoundIndex]!;
  const playerFixture = playerFixtureIn(state, round.fixtures);
  if (
    (playerFixture === undefined) !== (playerResult === null) ||
    (playerFixture !== undefined && !isValidWorldAlphaPlayerResult(playerResult!, playerFixture))
  )
    return invalid('world_vnext.invalid_input');
  const profileById = new Map(definition.programProfiles.map((entry) => [entry.programId, entry]));
  let rng = state.rng;
  const results: WorldAlphaPostseasonResult[] = round.fixtures.map((fixture) => {
    let result: WorldAlphaGameResult;
    if (fixture.id === playerFixture?.id) result = cloneSerializable(playerResult!);
    else {
      const simulated = aggregateWithOvertime(
        fixture,
        simulateWorldAlphaAggregate(
          fixture,
          profileById.get(fixture.homeProgramId)!,
          profileById.get(fixture.awayProgramId)!,
          'TIER_2_RELEVANT',
          rng,
        ),
      );
      rng = simulated.rng;
      result = simulated.result;
    }
    // A regulation tie advances the higher seed, which always hosts.
    return {
      result,
      advancingProgramId: result.winnerProgramId ?? fixture.homeProgramId,
      usedHigherSeedTiebreak: result.winnerProgramId === null,
    };
  });
  const rounds = [...active.rounds.slice(0, active.currentRoundIndex), { ...round, results }].map(
    (entry) => cloneSerializable(entry),
  );
  const following = nextRound(active.qualifiers, rounds);
  if (following === null)
    return ok<WorldVNextSeasonState>({
      ...cloneSerializable(state),
      rng,
      postseason: {
        type: 'COMPLETE',
        qualifiers: cloneSerializable(active.qualifiers),
        rounds,
        championProgramId: results[0]!.advancingProgramId,
      },
    });
  return ok<WorldVNextSeasonState>({
    ...cloneSerializable(state),
    rng,
    postseason: {
      type: 'ACTIVE',
      qualifiers: cloneSerializable(active.qualifiers),
      currentRoundIndex: active.currentRoundIndex + 1,
      rounds: [...rounds, following],
    },
  });
}

/**
 * Structural validation for saved VNext worlds: the shape, every aggregate result's own
 * arithmetic, the world RNG ledger, derived tables, and the bracket's qualifiers and pairings.
 */
export function isWorldVNextSeasonState(
  definition: WorldAlphaMechanicsDefinition,
  value: unknown,
): value is WorldVNextSeasonState {
  const state = value as WorldVNextSeasonState;
  if (
    !isWorldVNextDefinition(definition) ||
    state?.model !== 'world_vnext_season_v1' ||
    (state.worldId ?? WORLD_VNEXT_ID) !== definition.id ||
    !integerIn(state.seasonIndex, 0, 100) ||
    !isRngState(state.rng) ||
    !integerIn(state.completedRegularSeasonRoundCount, 0, WORLD_VNEXT_REGULAR_ROUND_COUNT) ||
    (state.playerProgramId !== null &&
      !definition.programProfiles.some(({ programId }) => programId === state.playerProgramId)) ||
    !Array.isArray(state.regularSeasonResults) ||
    state.regularSeasonResults.length !== WORLD_VNEXT_REGULAR_ROUND_COUNT
  )
    return false;
  const profiles = new Map(definition.programProfiles.map((entry) => [entry.programId, entry]));
  let drawAfter: number | undefined;
  const checkAggregate = (
    result: WorldAlphaGameResult,
    fixture:
      | WorldAlphaPostseasonFixture
      | {
          readonly id: string;
          readonly homeProgramId: ProgramId;
          readonly awayProgramId: ProgramId;
        },
  ) => {
    if (result.model === 'player_game_alpha_v1')
      return (
        state.playerProgramId !== null &&
        [fixture.homeProgramId, fixture.awayProgramId].includes(state.playerProgramId) &&
        isValidWorldAlphaPlayerResult(result, fixture)
      );
    if (
      !validAggregate(
        result,
        fixture,
        profiles.get(fixture.homeProgramId)!,
        profiles.get(fixture.awayProgramId)!,
      ) ||
      (drawAfter !== undefined && result.worldRngDrawCountBefore !== drawAfter)
    )
      return false;
    drawAfter = result.worldRngDrawCountAfter;
    return true;
  };
  for (const [index, round] of canonicalRounds(definition).entries()) {
    const saved = state.regularSeasonResults[index];
    if (
      saved?.roundId !== round.id ||
      !Array.isArray(saved.fixtureResults) ||
      saved.fixtureResults.length !== round.fixtures.length
    )
      return false;
    const complete = index < state.completedRegularSeasonRoundCount;
    for (const [fixtureIndex, fixture] of round.fixtures.entries()) {
      const result = saved.fixtureResults[fixtureIndex];
      if (!complete ? result !== null : result == null || !checkAggregate(result, fixture))
        return false;
    }
  }
  const tables = deriveWorldAlphaTables(definition, state.regularSeasonResults);
  if (
    !sameJson(state.programRecords, tables.programRecords) ||
    !sameJson(state.groupStandings, tables.groupStandings) ||
    !sameJson(state.rankings, tables.rankings)
  )
    return false;
  const postseason = state.postseason;
  if (postseason?.type === 'PENDING')
    return drawAfter === undefined || drawAfter === state.rng.drawCount;
  if (
    (postseason?.type !== 'ACTIVE' && postseason?.type !== 'COMPLETE') ||
    state.completedRegularSeasonRoundCount !== WORLD_VNEXT_REGULAR_ROUND_COUNT ||
    !sameJson(postseason.qualifiers, selectWorldVNextQualifiers(state)) ||
    !Array.isArray(postseason.rounds)
  )
    return false;
  const expectedLength =
    postseason.type === 'ACTIVE' ? postseason.currentRoundIndex + 1 : WORLD_VNEXT_ROUND_IDS.length;
  if (postseason.rounds.length !== expectedLength) return false;
  for (const [index, round] of postseason.rounds.entries()) {
    const expected = nextRound(postseason.qualifiers, postseason.rounds.slice(0, index));
    if (
      expected === null ||
      !sameJson(round.fixtures, expected.fixtures) ||
      round.id !== expected.id ||
      round.results.length !== round.fixtures.length
    )
      return false;
    const open = postseason.type === 'ACTIVE' && index === postseason.currentRoundIndex;
    for (const [fixtureIndex, fixture] of round.fixtures.entries()) {
      const entry = round.results[fixtureIndex];
      if (open) {
        if (entry !== null) return false;
        continue;
      }
      if (
        entry == null ||
        !checkAggregate(entry.result, fixture) ||
        entry.advancingProgramId !== (entry.result.winnerProgramId ?? fixture.homeProgramId) ||
        entry.usedHigherSeedTiebreak !== (entry.result.winnerProgramId === null)
      )
        return false;
    }
  }
  if (
    postseason.type === 'COMPLETE' &&
    postseason.rounds.at(-1)!.results[0]?.advancingProgramId !== postseason.championProgramId
  )
    return false;
  return drawAfter === undefined || drawAfter === state.rng.drawCount;
}

export function projectWorldVNextPositionMatchup(
  definition: WorldAlphaMechanicsDefinition,
  positionId: unknown,
  playerProgramId: unknown,
  opponentProgramId: unknown,
  atHome: boolean,
): WorldAlphaPositionMatchupProjection | undefined {
  return isWorldVNextDefinition(definition)
    ? projectPositionMatchupFromProfiles(
        definition,
        positionId,
        playerProgramId,
        opponentProgramId,
        atHome,
      )
    : undefined;
}
