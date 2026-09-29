import { isProgramId, isStableDomainId, type ProgramId } from '../player/ids.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { compareCodeUnits } from '../player/order.js';
import {
  SEASON_STANDINGS_TIEBREAKER_IDS,
  type SeasonFixtureMechanicsDefinition,
  type SeasonMechanicsDefinition,
  type SeasonProgramMechanicsProfile,
} from './types.js';

const PROGRAM_COUNT = 12;
const CAMP_ROUND_COUNT = 3;
const REGULAR_SEASON_ROUND_COUNT = 12;
const FIXTURES_PER_ROUND = 6;
const COMPLETE_ROUND_ROBIN_PAIR_COUNT = 66;

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort(compareCodeUnits);
  const expectedKeys = [...keys].sort(compareCodeUnits);
  return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys);
}

function isSeasonId(value: unknown): value is `season_${string}` {
  return isStableDomainId(value) && value.startsWith('season_') && value.length > 'season_'.length;
}

function isSeasonFixtureId(value: unknown): value is `season_fixture_${string}` {
  return (
    isStableDomainId(value) &&
    value.startsWith('season_fixture_') &&
    value.length > 'season_fixture_'.length
  );
}

function pairId(firstProgramId: string, secondProgramId: string): string {
  return compareCodeUnits(firstProgramId, secondProgramId) < 0
    ? `${firstProgramId}:${secondProgramId}`
    : `${secondProgramId}:${firstProgramId}`;
}

function isProgramProfile(value: unknown): value is SeasonProgramMechanicsProfile {
  if (!isRecord(value)) return false;
  if (
    !hasExactKeys(value, [
      'programId',
      'offenseRating',
      'defenseRating',
      'qbRating',
      'teamRating',
      'scheduleStrength',
    ]) ||
    !isProgramId(value['programId']) ||
    !isIntegerInRange(value['offenseRating'], 0, 100) ||
    !isIntegerInRange(value['defenseRating'], 0, 100) ||
    !isIntegerInRange(value['qbRating'], 0, 100) ||
    !isIntegerInRange(value['teamRating'], 0, 100) ||
    !isIntegerInRange(value['scheduleStrength'], 0, 100)
  ) {
    return false;
  }
  return (
    value['teamRating'] ===
    Math.round((value['offenseRating'] + value['defenseRating'] + value['qbRating']) / 3)
  );
}

function isFixture(value: unknown): value is SeasonFixtureMechanicsDefinition {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['id', 'homeProgramId', 'awayProgramId', 'spotlight']) &&
    isSeasonFixtureId(value['id']) &&
    isProgramId(value['homeProgramId']) &&
    isProgramId(value['awayProgramId']) &&
    value['homeProgramId'] !== value['awayProgramId'] &&
    typeof value['spotlight'] === 'boolean'
  );
}

export function isSeasonMechanicsDefinition(value: unknown): value is SeasonMechanicsDefinition {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'id',
      'campRoundIds',
      'regularSeasonRounds',
      'programProfiles',
      'standingsTiebreakOrder',
      'postseason',
    ]) ||
    !isSeasonId(value['id']) ||
    !Array.isArray(value['campRoundIds']) ||
    value['campRoundIds'].length !== CAMP_ROUND_COUNT ||
    !value['campRoundIds'].every(isSeasonId) ||
    new Set(value['campRoundIds']).size !== CAMP_ROUND_COUNT ||
    !Array.isArray(value['programProfiles']) ||
    value['programProfiles'].length !== PROGRAM_COUNT ||
    !value['programProfiles'].every(isProgramProfile) ||
    !Array.isArray(value['regularSeasonRounds']) ||
    value['regularSeasonRounds'].length !== REGULAR_SEASON_ROUND_COUNT ||
    !Array.isArray(value['standingsTiebreakOrder']) ||
    JSON.stringify(value['standingsTiebreakOrder']) !==
      JSON.stringify(SEASON_STANDINGS_TIEBREAKER_IDS) ||
    !isRecord(value['postseason']) ||
    !hasExactKeys(value['postseason'], ['qualifierCount', 'semifinalMatchups']) ||
    value['postseason']['qualifierCount'] !== 4 ||
    !Array.isArray(value['postseason']['semifinalMatchups']) ||
    value['postseason']['semifinalMatchups'].length !== 2 ||
    !value['postseason']['semifinalMatchups'].every((matchup) =>
      isRecord(matchup) ? hasExactKeys(matchup, ['homeSeed', 'awaySeed']) : false,
    ) ||
    !isRecord(value['postseason']['semifinalMatchups'][0]) ||
    value['postseason']['semifinalMatchups'][0]['homeSeed'] !== 1 ||
    value['postseason']['semifinalMatchups'][0]['awaySeed'] !== 4 ||
    !isRecord(value['postseason']['semifinalMatchups'][1]) ||
    value['postseason']['semifinalMatchups'][1]['homeSeed'] !== 2 ||
    value['postseason']['semifinalMatchups'][1]['awaySeed'] !== 3
  ) {
    return false;
  }

  const profileByProgramId = new Map(
    value['programProfiles'].map((profile) => [profile.programId, profile]),
  );
  if (profileByProgramId.size !== PROGRAM_COUNT) return false;
  const programIds = new Set(profileByProgramId.keys());
  const fixtureIds = new Set<string>();
  const roundIds = new Set<string>();
  const weekNumbers = new Set<number>();
  const firstElevenPairs = new Set<string>();
  const finalRoundPairs = new Set<string>();
  const appearances = new Map([...programIds].map((programId) => [programId, 0]));
  const homeCounts = new Map([...programIds].map((programId) => [programId, 0]));
  const opponents = new Map([...programIds].map((programId) => [programId, [] as ProgramId[]]));

  for (const round of value['regularSeasonRounds']) {
    if (
      !isRecord(round) ||
      !hasExactKeys(round, ['id', 'weekNumber', 'fixtures']) ||
      !isSeasonId(round['id']) ||
      !isIntegerInRange(round['weekNumber'], 1, REGULAR_SEASON_ROUND_COUNT) ||
      !Array.isArray(round['fixtures']) ||
      round['fixtures'].length !== FIXTURES_PER_ROUND ||
      !round['fixtures'].every(isFixture) ||
      roundIds.has(round['id']) ||
      weekNumbers.has(round['weekNumber'])
    ) {
      return false;
    }
    roundIds.add(round['id']);
    weekNumbers.add(round['weekNumber']);
    const roundPrograms = new Set<string>();
    for (const fixture of round['fixtures']) {
      if (
        fixtureIds.has(fixture.id) ||
        !programIds.has(fixture.homeProgramId) ||
        !programIds.has(fixture.awayProgramId) ||
        roundPrograms.has(fixture.homeProgramId) ||
        roundPrograms.has(fixture.awayProgramId)
      ) {
        return false;
      }
      fixtureIds.add(fixture.id);
      roundPrograms.add(fixture.homeProgramId);
      roundPrograms.add(fixture.awayProgramId);
      appearances.set(fixture.homeProgramId, (appearances.get(fixture.homeProgramId) ?? 0) + 1);
      appearances.set(fixture.awayProgramId, (appearances.get(fixture.awayProgramId) ?? 0) + 1);
      homeCounts.set(fixture.homeProgramId, (homeCounts.get(fixture.homeProgramId) ?? 0) + 1);
      opponents.get(fixture.homeProgramId)?.push(fixture.awayProgramId);
      opponents.get(fixture.awayProgramId)?.push(fixture.homeProgramId);
      const currentPairId = pairId(fixture.homeProgramId, fixture.awayProgramId);
      if (round['weekNumber'] <= 11) {
        if (firstElevenPairs.has(currentPairId) || fixture.spotlight) return false;
        firstElevenPairs.add(currentPairId);
      } else {
        if (!fixture.spotlight) return false;
        finalRoundPairs.add(currentPairId);
      }
    }
    if (roundPrograms.size !== PROGRAM_COUNT) return false;
  }

  if (
    fixtureIds.size !== REGULAR_SEASON_ROUND_COUNT * FIXTURES_PER_ROUND ||
    firstElevenPairs.size !== COMPLETE_ROUND_ROBIN_PAIR_COUNT ||
    finalRoundPairs.size !== FIXTURES_PER_ROUND ||
    [...finalRoundPairs].some((currentPairId) => !firstElevenPairs.has(currentPairId))
  ) {
    return false;
  }

  for (const [programId, profile] of profileByProgramId) {
    if (appearances.get(programId) !== 12 || homeCounts.get(programId) !== 6) return false;
    const opponentRatings = (opponents.get(programId) ?? []).map(
      (opponentId) => profileByProgramId.get(opponentId)?.teamRating,
    );
    if (opponentRatings.some((rating) => rating === undefined)) return false;
    const expectedScheduleStrength = Math.round(
      (opponentRatings as number[]).reduce((total, rating) => total + rating, 0) /
        opponentRatings.length,
    );
    if (profile.scheduleStrength !== expectedScheduleStrength) return false;
  }
  return true;
}

export function canonicalizeSeasonMechanicsDefinition(
  definition: SeasonMechanicsDefinition,
): SeasonMechanicsDefinition {
  if (!isSeasonMechanicsDefinition(definition)) {
    throw new TypeError('season_definition.invalid');
  }
  const cloned = cloneSerializable(definition);
  return deepFreeze({
    ...cloned,
    programProfiles: [...cloned.programProfiles].sort((left, right) =>
      compareCodeUnits(left.programId, right.programId),
    ),
    regularSeasonRounds: [...cloned.regularSeasonRounds]
      .sort((left, right) => left.weekNumber - right.weekNumber)
      .map((round) => ({
        ...round,
        fixtures: [...round.fixtures].sort((left, right) => compareCodeUnits(left.id, right.id)),
      })),
  });
}
