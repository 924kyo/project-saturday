import type { ProgramId } from '../player/ids.js';
import { createRng } from '../random/rng.js';
import {
  initializeWorldAlphaPostseason,
  resolveNextWorldAlphaPostseasonRound,
  resolveNextWorldAlphaRegularRound,
  type WorldAlphaMechanicsDefinition,
  type WorldAlphaPlayerGameResult,
  type WorldAlphaPositionMatchupProjection,
  type WorldAlphaPostseasonFixture,
  type WorldAlphaSeasonState,
} from '../season/world-alpha.js';
import {
  createWorldVNextSeason,
  initializeWorldVNextPostseason,
  projectWorldVNextPositionMatchup,
  resolveNextWorldVNextPostseasonRound,
  resolveNextWorldVNextRegularRound,
  WORLD_VNEXT_ID,
  type WorldVNextSeasonState,
} from '../season/world-vnext.js';
import type { CareerVNextMechanics, PostseasonRoundVNext, SeasonFinishVNext } from './types.js';

/**
 * One seam over the two worlds a VNext save can hold: the 64-program conference world (every
 * season started from M8 on) and the 32-program alpha world (a season already in progress when a
 * save was written before M8, which finishes on its own schedule and bracket).
 */
export type WorldStateVNext = WorldAlphaSeasonState | WorldVNextSeasonState;

export function isConferenceWorldVNext(world: WorldStateVNext): world is WorldVNextSeasonState {
  return world.model === 'world_vnext_season_v1';
}

/** The schedule and profiles that the given season's world runs on. */
export function worldDefinitionVNext(
  world: WorldStateVNext | null,
  mechanics: Pick<CareerVNextMechanics, 'world' | 'world64' | 'legacyWorld'>,
): WorldAlphaMechanicsDefinition {
  if (world === null) return mechanics.world;
  if (!isConferenceWorldVNext(world)) return mechanics.legacyWorld;
  // A season keeps the world it started on (the M8 64-program world has no worldId).
  return (world.worldId ?? WORLD_VNEXT_ID) === mechanics.world.id
    ? mechanics.world
    : mechanics.world64;
}

/** A new season's world, on its season-named stream. */
export function createSeasonWorldVNext(
  seed: string,
  seasonIndex: number,
  programId: ProgramId,
  mechanics: Pick<CareerVNextMechanics, 'world'>,
): WorldVNextSeasonState | null {
  const created = createWorldVNextSeason(
    mechanics.world,
    createRng(`${seed}:vnext:world:${seasonIndex}`),
    seasonIndex,
    programId,
  );
  return created.ok ? created.value : null;
}

/** Matchup arithmetic over the conference world's profiles (a superset of the alpha programs). */
export function matchupVNext(
  mechanics: Pick<CareerVNextMechanics, 'world'>,
  positionId: unknown,
  playerProgramId: unknown,
  opponentProgramId: unknown,
  atHome: boolean,
): WorldAlphaPositionMatchupProjection | undefined {
  return projectWorldVNextPositionMatchup(
    mechanics.world,
    positionId,
    playerProgramId,
    opponentProgramId,
    atHome,
  );
}

export function resolveRegularRoundVNext(
  world: WorldStateVNext,
  mechanics: Pick<CareerVNextMechanics, 'world' | 'world64' | 'legacyWorld'>,
  playerResult: WorldAlphaPlayerGameResult | null,
): WorldStateVNext | null {
  if (isConferenceWorldVNext(world)) {
    const resolved = resolveNextWorldVNextRegularRound(
      world,
      worldDefinitionVNext(world, mechanics),
      playerResult,
    );
    return resolved.ok ? resolved.value : null;
  }
  const resolved = resolveNextWorldAlphaRegularRound(world, mechanics.legacyWorld, playerResult);
  return resolved.ok ? resolved.value.state : null;
}

export function initializePostseasonVNext(
  world: WorldStateVNext,
  mechanics: Pick<CareerVNextMechanics, 'world' | 'world64' | 'legacyWorld'>,
): WorldStateVNext | null {
  const initialized = isConferenceWorldVNext(world)
    ? initializeWorldVNextPostseason(world, worldDefinitionVNext(world, mechanics))
    : initializeWorldAlphaPostseason(world, mechanics.legacyWorld);
  return initialized.ok ? initialized.value : null;
}

export function resolvePostseasonRoundVNext(
  world: WorldStateVNext,
  mechanics: Pick<CareerVNextMechanics, 'world' | 'world64' | 'legacyWorld'>,
  playerResult: WorldAlphaPlayerGameResult | null,
): WorldStateVNext | null {
  const resolved = isConferenceWorldVNext(world)
    ? resolveNextWorldVNextPostseasonRound(
        world,
        worldDefinitionVNext(world, mechanics),
        playerResult,
      )
    : resolveNextWorldAlphaPostseasonRound(world, mechanics.legacyWorld, playerResult);
  return resolved.ok ? resolved.value : null;
}

const CONFERENCE_ROUNDS: readonly PostseasonRoundVNext[] = [
  'FIRST_ROUND',
  'QUARTERFINAL',
  'SEMIFINAL',
  'FINAL',
];
const ALPHA_ROUNDS: readonly PostseasonRoundVNext[] = ['SEMIFINAL', 'FINAL'];

/** The bracket round in play, with its fixtures (null outside an active postseason). */
export function activePostseasonRoundVNext(world: WorldStateVNext | null): {
  readonly index: number;
  readonly round: PostseasonRoundVNext;
  readonly fixtures: readonly WorldAlphaPostseasonFixture[];
} | null {
  if (world === null || world.postseason.type !== 'ACTIVE') return null;
  const index = world.postseason.currentRoundIndex;
  const names = isConferenceWorldVNext(world) ? CONFERENCE_ROUNDS : ALPHA_ROUNDS;
  const round = (
    world.postseason.rounds as readonly {
      readonly fixtures: readonly WorldAlphaPostseasonFixture[];
    }[]
  )[index];
  return round === undefined ? null : { index, round: names[index]!, fixtures: round.fixtures };
}

export function postseasonRoundCountVNext(world: WorldStateVNext): number {
  return isConferenceWorldVNext(world) ? CONFERENCE_ROUNDS.length : ALPHA_ROUNDS.length;
}

const includes = (
  fixture: { readonly homeProgramId: ProgramId; readonly awayProgramId: ProgramId },
  programId: ProgramId,
) => fixture.homeProgramId === programId || fixture.awayProgramId === programId;

/** How far the program went, from the completed bracket alone. */
export function seasonFinishVNext(
  world: WorldStateVNext,
  programId: ProgramId,
): SeasonFinishVNext | null {
  const postseason = world.postseason;
  if (postseason.type !== 'COMPLETE') return null;
  if (postseason.championProgramId === programId) return 'CHAMPION';
  const rounds = postseason.rounds as readonly {
    readonly fixtures: readonly WorldAlphaPostseasonFixture[];
  }[];
  const names = isConferenceWorldVNext(world) ? CONFERENCE_ROUNDS : ALPHA_ROUNDS;
  for (let index = rounds.length - 1; index >= 0; index -= 1)
    if (rounds[index]!.fixtures.some((fixture) => includes(fixture, programId))) {
      const round = names[index]!;
      return round === 'FINAL' ? 'RUNNER_UP' : round;
    }
  return 'MISSED';
}

/** Whether the program won its conference (conference world only; the alpha world has groups). */
export function conferenceChampionVNext(world: WorldStateVNext, programId: ProgramId): boolean {
  return (
    isConferenceWorldVNext(world) &&
    world.groupStandings.some((entry) => entry.programId === programId && entry.rank === 1)
  );
}
