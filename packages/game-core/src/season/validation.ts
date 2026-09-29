import {
  isCareerId,
  isPlayerId,
  isProgramId,
  isStableDomainId,
  isWrArchetypeId,
  isRecruitingBackgroundId,
  isPersonalityTraitId,
} from '../player/ids.js';
import { isCompletedGameSummary, isWrGameStatLine } from '../games/validation.js';
import { isDepthRoleId } from '../programs/ids.js';
import { isSkillId } from '../skills/ids.js';
import { isInjuryOutcomeId } from '../injuries/ids.js';
import { compareCodeUnits } from '../player/order.js';
import {
  validateCareerRunV5,
  validateCareerRunV6,
  validateCareerRunV7,
  type CareerInvariantResult,
} from '../player/validation.js';
import { createRng, isRngState, nextUint32, type RngSeed, type RngState } from '../random/rng.js';
import {
  canonicalizeSeasonMechanicsDefinition,
  isSeasonMechanicsDefinition,
} from './definitions.js';
import { deriveSeasonTables } from './standings.js';
import {
  CAREER_SESSION_SCHEMA_VERSION_V5,
  CAREER_SESSION_SCHEMA_VERSION_V6,
  CAREER_SESSION_SCHEMA_VERSION_V7,
  META_PROFILE_SCHEMA_VERSION_V1,
  WORLD_SCHEMA_VERSION_V1,
  type CareerSessionV5,
  type CareerSessionV6,
  type CareerSessionV7,
  type MetaProfileV1,
  type RegularSeasonRoundState,
  type SeasonFixtureMechanicsDefinition,
  type SeasonMechanicsDefinition,
  type WorldStateV1,
} from './types.js';

export type SeasonInvariantIssueCode =
  | 'invariant.duplicate_value'
  | 'invariant.invalid_combination'
  | 'invariant.invalid_id'
  | 'invariant.invalid_schema_version'
  | 'invariant.invalid_type'
  | 'invariant.invalid_value'
  | 'invariant.missing_field'
  | 'invariant.noncanonical_order'
  | 'invariant.out_of_bounds'
  | 'invariant.unknown_field';

export interface SeasonInvariantIssue {
  readonly code: SeasonInvariantIssueCode;
  readonly path: string;
}

export type SeasonInvariantResult =
  | { readonly ok: true; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly SeasonInvariantIssue[] };

type UnknownRecord = Readonly<Record<string, unknown>>;

const SESSION_KEYS = ['schemaVersion', 'career', 'world'] as const;
const WORLD_KEYS = [
  'schemaVersion',
  'model',
  'careerId',
  'worldSeed',
  'rng',
  'revision',
  'calendar',
] as const;
const COMPLETED_SEASON_HISTORY_ENTRY_KEYS = [
  'model',
  'seasonIndex',
  'playerProgramId',
  'calendar',
] as const;
const OFFSEASON_WORLD_RNG_EVIDENCE_KEYS = [
  'model',
  'worldRngDrawCountBefore',
  'worldRngDrawCountAfter',
] as const;
const PENDING_CALENDAR_KEYS = ['type'] as const;
const ACTIVE_CALENDAR_KEYS = [
  'type',
  'definition',
  'stage',
  'completedCampRoundCount',
  'completedRegularSeasonRoundCount',
  'regularSeasonResults',
  'programRecords',
  'standings',
  'postseason',
] as const;
const ROUND_STATE_KEYS = ['roundId', 'fixtureResults'] as const;
const GAME_RESULT_BASE_KEYS = [
  'fixtureId',
  'model',
  'homeScore',
  'awayScore',
  'winnerProgramId',
] as const;
const AGGREGATE_RESULT_KEYS = [
  ...GAME_RESULT_BASE_KEYS,
  'homeExpectedScore',
  'awayExpectedScore',
  'homeVariance',
  'awayVariance',
  'worldRngDrawCountBefore',
  'worldRngDrawCountAfter',
] as const;
const PLAYER_RESULT_KEYS = [
  ...GAME_RESULT_BASE_KEYS,
  'careerRngDrawCountBefore',
  'careerRngDrawCountAfter',
] as const;
const PROGRAM_RECORD_KEYS = [
  'programId',
  'wins',
  'losses',
  'ties',
  'pointsFor',
  'pointsAgainst',
] as const;
const STANDING_KEYS = [
  'rank',
  'programId',
  'wins',
  'losses',
  'ties',
  'headToHeadWins',
  'scheduleStrength',
] as const;
const PENDING_POSTSEASON_KEYS = ['type'] as const;
const ACTIVE_POSTSEASON_KEYS = [
  'type',
  'qualifierProgramIds',
  'currentRoundIndex',
  'rounds',
] as const;
const COMPLETE_POSTSEASON_KEYS = [
  'type',
  'qualifierProgramIds',
  'rounds',
  'championProgramId',
  'playerOutcomeId',
  'playerRegularSeasonRank',
  'playerPostseasonSeed',
] as const;
const POSTSEASON_ROUND_KEYS = ['roundId', 'fixtures', 'fixtureResults'] as const;
const POSTSEASON_GAME_KEYS = ['result', 'advancingProgramId', 'usedHigherSeedTiebreak'] as const;
const POSTSEASON_FIXTURE_KEYS = ['id', 'homeProgramId', 'awayProgramId', 'spotlight'] as const;
const META_KEYS = [
  'schemaVersion',
  'revision',
  'alumni',
  'unlockedOptionIds',
  'programFamiliarity',
] as const;
const FAMILIARITY_KEYS = ['programId', 'completedCareers'] as const;
const ALUMNI_KEYS = [
  'schemaVersion',
  'alumniId',
  'careerId',
  'playerId',
  'displayName',
  'appearance',
  'positionId',
  'archetypeId',
  'recruitingBackgroundId',
  'personalityTraitIds',
  'programIds',
  'seasonsPlayed',
  'careerStats',
  'gamesPlayed',
  'wins',
  'losses',
  'ties',
  'averagePerformanceGrade',
  'bestGame',
  'startingDepthRank',
  'startingRoleId',
  'finalDepthRank',
  'finalRoleId',
  'ownedSkillIds',
  'equippedSkillIds',
  'injuryOutcomeIds',
  'injuryWeeksMissed',
  'seasonOutcomeId',
  'regularSeasonRank',
  'postseasonSeed',
  'championshipCount',
  'endingId',
  'careerSeed',
  'careerSchemaVersion',
  'contentVersion',
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issue(issues: SeasonInvariantIssue[], code: SeasonInvariantIssueCode, path: string): void {
  issues.push({ code, path });
}

function strictRecord(
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: SeasonInvariantIssue[],
): UnknownRecord | undefined {
  if (!isRecord(value)) {
    issue(issues, 'invariant.invalid_type', path);
    return undefined;
  }
  const expected = new Set(keys);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) issue(issues, 'invariant.missing_field', `${path}.${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) issue(issues, 'invariant.unknown_field', `${path}.${key}`);
  }
  return value;
}

function validSeed(value: unknown): value is RngSeed {
  return (
    (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff)
  );
}

function expectedWorldSeed(careerSeed: RngSeed): string {
  return `world_v1:${typeof careerSeed}:${String(careerSeed)}`;
}

function sameRng(left: unknown, right: RngState): boolean {
  return (
    isRngState(left) &&
    left.algorithm === right.algorithm &&
    left.drawCount === right.drawCount &&
    left.state.every((word, index) => word === right.state[index])
  );
}

function result(issues: SeasonInvariantIssue[]): SeasonInvariantResult {
  issues.sort((left, right) => {
    const pathOrder = compareCodeUnits(left.path, right.path);
    return pathOrder === 0 ? compareCodeUnits(left.code, right.code) : pathOrder;
  });
  return issues.length === 0
    ? Object.freeze({ ok: true, issues: [] as const })
    : Object.freeze({ ok: false, issues: Object.freeze([...issues]) });
}

function validSafeInteger(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function validateGameResult(
  value: unknown,
  path: string,
  fixture: {
    readonly id: string;
    readonly homeProgramId: string;
    readonly awayProgramId: string;
  },
  issues: SeasonInvariantIssue[],
): void {
  const candidate = isRecord(value) ? value : undefined;
  const model = candidate?.['model'];
  const gameResult = strictRecord(
    value,
    path,
    model === 'aggregate_v1'
      ? AGGREGATE_RESULT_KEYS
      : model === 'player_game_v1'
        ? PLAYER_RESULT_KEYS
        : GAME_RESULT_BASE_KEYS,
    issues,
  );
  if (gameResult === undefined) return;
  if (model !== 'aggregate_v1' && model !== 'player_game_v1') {
    issue(issues, 'invariant.invalid_value', `${path}.model`);
  }
  if (gameResult['fixtureId'] !== fixture.id) {
    issue(issues, 'invariant.invalid_combination', `${path}.fixtureId`);
  }
  const homeScore = gameResult['homeScore'];
  const awayScore = gameResult['awayScore'];
  if (!validSafeInteger(homeScore, 0, 100)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.homeScore`);
  }
  if (!validSafeInteger(awayScore, 0, 100)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.awayScore`);
  }
  if (validSafeInteger(homeScore, 0, 100) && validSafeInteger(awayScore, 0, 100)) {
    const expectedWinner =
      homeScore === awayScore
        ? null
        : homeScore > awayScore
          ? fixture.homeProgramId
          : fixture.awayProgramId;
    if (gameResult['winnerProgramId'] !== expectedWinner) {
      issue(issues, 'invariant.invalid_combination', `${path}.winnerProgramId`);
    }
  }
  if (model === 'aggregate_v1') {
    for (const field of ['homeExpectedScore', 'awayExpectedScore'] as const) {
      if (!validSafeInteger(gameResult[field], 0, 100)) {
        issue(issues, 'invariant.out_of_bounds', `${path}.${field}`);
      }
    }
    for (const field of ['homeVariance', 'awayVariance'] as const) {
      if (!validSafeInteger(gameResult[field], -20, 20)) {
        issue(issues, 'invariant.out_of_bounds', `${path}.${field}`);
      }
    }
    const before = gameResult['worldRngDrawCountBefore'];
    const after = gameResult['worldRngDrawCountAfter'];
    if (
      !validSafeInteger(before, 0, Number.MAX_SAFE_INTEGER) ||
      !validSafeInteger(after, 0, Number.MAX_SAFE_INTEGER) ||
      after <= before
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.worldRngDrawCountAfter`);
    }
  }
  if (model === 'player_game_v1') {
    const before = gameResult['careerRngDrawCountBefore'];
    const after = gameResult['careerRngDrawCountAfter'];
    if (
      !validSafeInteger(before, 0, Number.MAX_SAFE_INTEGER) ||
      !validSafeInteger(after, 0, Number.MAX_SAFE_INTEGER) ||
      after < before
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.careerRngDrawCountAfter`);
    }
  }
}

function validatePostseasonFixture(
  value: unknown,
  path: string,
  programIds: ReadonlySet<string>,
  issues: SeasonInvariantIssue[],
): SeasonFixtureMechanicsDefinition | null {
  const fixture = strictRecord(value, path, POSTSEASON_FIXTURE_KEYS, issues);
  if (fixture === undefined) return null;
  if (
    typeof fixture['id'] !== 'string' ||
    !isStableDomainId(fixture['id']) ||
    !fixture['id'].startsWith('season_fixture_postseason_')
  ) {
    issue(issues, 'invariant.invalid_id', `${path}.id`);
  }
  if (!isProgramId(fixture['homeProgramId']) || !programIds.has(fixture['homeProgramId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.homeProgramId`);
  }
  if (!isProgramId(fixture['awayProgramId']) || !programIds.has(fixture['awayProgramId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.awayProgramId`);
  }
  if (fixture['homeProgramId'] === fixture['awayProgramId']) {
    issue(issues, 'invariant.invalid_combination', `${path}.awayProgramId`);
  }
  if (fixture['spotlight'] !== true) {
    issue(issues, 'invariant.invalid_value', `${path}.spotlight`);
  }
  return fixture as unknown as SeasonFixtureMechanicsDefinition;
}

function validatePostseasonRound(
  value: unknown,
  path: string,
  expectedRoundId: 'postseason_round_semifinal' | 'postseason_round_final',
  programIds: ReadonlySet<string>,
  issues: SeasonInvariantIssue[],
): void {
  const round = strictRecord(value, path, POSTSEASON_ROUND_KEYS, issues);
  if (round === undefined) return;
  if (round['roundId'] !== expectedRoundId) {
    issue(issues, 'invariant.invalid_value', `${path}.roundId`);
  }
  if (!Array.isArray(round['fixtures']) || !Array.isArray(round['fixtureResults'])) {
    issue(issues, 'invariant.invalid_type', `${path}.fixtures`);
    return;
  }
  if (round['fixtures'].length !== round['fixtureResults'].length) {
    issue(issues, 'invariant.invalid_combination', `${path}.fixtureResults`);
  }
  for (const [index, fixtureValue] of round['fixtures'].entries()) {
    const fixture = validatePostseasonFixture(
      fixtureValue,
      `${path}.fixtures.${index}`,
      programIds,
      issues,
    );
    const gameValue = round['fixtureResults'][index];
    if (gameValue === null || fixture === null) continue;
    const game = strictRecord(
      gameValue,
      `${path}.fixtureResults.${index}`,
      POSTSEASON_GAME_KEYS,
      issues,
    );
    if (game === undefined) continue;
    validateGameResult(game['result'], `${path}.fixtureResults.${index}.result`, fixture, issues);
    const resultValue = isRecord(game['result']) ? game['result'] : undefined;
    const expectedAdvancing = resultValue?.['winnerProgramId'] ?? fixture.homeProgramId;
    if (game['advancingProgramId'] !== expectedAdvancing) {
      issue(
        issues,
        'invariant.invalid_combination',
        `${path}.fixtureResults.${index}.advancingProgramId`,
      );
    }
    if (game['usedHigherSeedTiebreak'] !== (resultValue?.['winnerProgramId'] === null)) {
      issue(
        issues,
        'invariant.invalid_combination',
        `${path}.fixtureResults.${index}.usedHigherSeedTiebreak`,
      );
    }
  }
}

function validatePostseasonState(
  value: unknown,
  calendar: UnknownRecord,
  definition: SeasonMechanicsDefinition,
  path: string,
  issues: SeasonInvariantIssue[],
): void {
  const type = isRecord(value) ? value['type'] : undefined;
  if (type === 'PENDING') {
    strictRecord(value, path, PENDING_POSTSEASON_KEYS, issues);
    return;
  }
  const keys = type === 'ACTIVE' ? ACTIVE_POSTSEASON_KEYS : COMPLETE_POSTSEASON_KEYS;
  const postseason = strictRecord(value, path, keys, issues);
  if (postseason === undefined) return;
  if (type !== 'ACTIVE' && type !== 'COMPLETE') {
    issue(issues, 'invariant.invalid_value', `${path}.type`);
    return;
  }
  const expectedQualifiers = Array.isArray(calendar['standings'])
    ? calendar['standings']
        .slice(0, definition.postseason.qualifierCount)
        .map((standing) => (isRecord(standing) ? standing['programId'] : undefined))
    : [];
  if (
    !Array.isArray(postseason['qualifierProgramIds']) ||
    postseason['qualifierProgramIds'].length !== 4 ||
    JSON.stringify(postseason['qualifierProgramIds']) !== JSON.stringify(expectedQualifiers)
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.qualifierProgramIds`);
  }
  if (!Array.isArray(postseason['rounds']) || postseason['rounds'].length !== 2) {
    issue(issues, 'invariant.invalid_value', `${path}.rounds`);
    return;
  }
  const programIds = new Set(definition.programProfiles.map(({ programId }) => programId));
  validatePostseasonRound(
    postseason['rounds'][0],
    `${path}.rounds.0`,
    'postseason_round_semifinal',
    programIds,
    issues,
  );
  validatePostseasonRound(
    postseason['rounds'][1],
    `${path}.rounds.1`,
    'postseason_round_final',
    programIds,
    issues,
  );
  const semifinal = isRecord(postseason['rounds'][0]) ? postseason['rounds'][0] : undefined;
  const final = isRecord(postseason['rounds'][1]) ? postseason['rounds'][1] : undefined;
  if (
    !Array.isArray(semifinal?.['fixtures']) ||
    semifinal['fixtures'].length !== 2 ||
    !Array.isArray(semifinal['fixtureResults'])
  ) {
    issue(issues, 'invariant.invalid_value', `${path}.rounds.0`);
  }
  if (type === 'ACTIVE') {
    if (postseason['currentRoundIndex'] !== 0 && postseason['currentRoundIndex'] !== 1) {
      issue(issues, 'invariant.out_of_bounds', `${path}.currentRoundIndex`);
    }
    const currentRoundIndex = postseason['currentRoundIndex'];
    if (
      currentRoundIndex === 0 &&
      (semifinal?.['fixtureResults'] as unknown[])?.some((result) => result !== null)
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.rounds.0.fixtureResults`);
    }
    if (
      currentRoundIndex === 1 &&
      (!Array.isArray(final?.['fixtures']) ||
        final['fixtures'].length !== 1 ||
        !Array.isArray(final['fixtureResults']) ||
        final['fixtureResults'][0] !== null)
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.rounds.1`);
    }
  } else {
    const finalResults = Array.isArray(final?.['fixtureResults']) ? final['fixtureResults'] : [];
    if (
      !Array.isArray(semifinal?.['fixtureResults']) ||
      semifinal['fixtureResults'].some((result) => result === null) ||
      !Array.isArray(final?.['fixtures']) ||
      final['fixtures'].length !== 1 ||
      finalResults.length !== 1 ||
      finalResults[0] === null
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.rounds`);
    }
    if (!isProgramId(postseason['championProgramId'])) {
      issue(issues, 'invariant.invalid_id', `${path}.championProgramId`);
    } else if (
      isRecord(finalResults[0]) &&
      postseason['championProgramId'] !== finalResults[0]['advancingProgramId']
    ) {
      issue(issues, 'invariant.invalid_combination', `${path}.championProgramId`);
    }
    if (
      ![
        'season_outcome_champion',
        'season_outcome_runner_up',
        'season_outcome_semifinal_exit',
        'season_outcome_regular_season_complete',
      ].includes(postseason['playerOutcomeId'] as string)
    ) {
      issue(issues, 'invariant.invalid_id', `${path}.playerOutcomeId`);
    }
    if (!validSafeInteger(postseason['playerRegularSeasonRank'], 1, 12)) {
      issue(issues, 'invariant.out_of_bounds', `${path}.playerRegularSeasonRank`);
    }
    if (
      postseason['playerPostseasonSeed'] !== null &&
      !validSafeInteger(postseason['playerPostseasonSeed'], 1, 4)
    ) {
      issue(issues, 'invariant.out_of_bounds', `${path}.playerPostseasonSeed`);
    }
  }
}

function validateActiveCalendar(
  value: unknown,
  path: string,
  issues: SeasonInvariantIssue[],
): void {
  const calendar = strictRecord(value, path, ACTIVE_CALENDAR_KEYS, issues);
  if (calendar === undefined) return;
  if (calendar['type'] !== 'ACTIVE') issue(issues, 'invariant.invalid_value', `${path}.type`);
  if (!isSeasonMechanicsDefinition(calendar['definition'])) {
    issue(issues, 'invariant.invalid_value', `${path}.definition`);
    return;
  }
  const definition = calendar['definition'];
  if (
    JSON.stringify(definition) !== JSON.stringify(canonicalizeSeasonMechanicsDefinition(definition))
  ) {
    issue(issues, 'invariant.noncanonical_order', `${path}.definition`);
  }
  const stage = calendar['stage'];
  if (stage !== 'CAMP' && stage !== 'REGULAR_SEASON' && stage !== 'POSTSEASON') {
    issue(issues, 'invariant.invalid_value', `${path}.stage`);
  }
  const completedCampRoundCount = calendar['completedCampRoundCount'];
  const completedRegularSeasonRoundCount = calendar['completedRegularSeasonRoundCount'];
  if (!validSafeInteger(completedCampRoundCount, 0, 3)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.completedCampRoundCount`);
  }
  if (!validSafeInteger(completedRegularSeasonRoundCount, 0, 12)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.completedRegularSeasonRoundCount`);
  }
  if (
    (stage === 'CAMP' &&
      (completedCampRoundCount === 3 || completedRegularSeasonRoundCount !== 0)) ||
    (stage === 'REGULAR_SEASON' &&
      (completedCampRoundCount !== 3 || completedRegularSeasonRoundCount === 12)) ||
    (stage === 'POSTSEASON' &&
      (completedCampRoundCount !== 3 || completedRegularSeasonRoundCount !== 12))
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.stage`);
  }

  if (!Array.isArray(calendar['regularSeasonResults'])) {
    issue(issues, 'invariant.invalid_type', `${path}.regularSeasonResults`);
  } else if (calendar['regularSeasonResults'].length !== definition.regularSeasonRounds.length) {
    issue(issues, 'invariant.invalid_value', `${path}.regularSeasonResults`);
  } else {
    for (const [roundIndex, stateValue] of calendar['regularSeasonResults'].entries()) {
      const statePath = `${path}.regularSeasonResults.${roundIndex}`;
      const state = strictRecord(stateValue, statePath, ROUND_STATE_KEYS, issues);
      const round = definition.regularSeasonRounds[roundIndex]!;
      if (state === undefined) continue;
      if (state['roundId'] !== round.id) {
        issue(issues, 'invariant.invalid_combination', `${statePath}.roundId`);
      }
      if (!Array.isArray(state['fixtureResults'])) {
        issue(issues, 'invariant.invalid_type', `${statePath}.fixtureResults`);
        continue;
      }
      if (state['fixtureResults'].length !== round.fixtures.length) {
        issue(issues, 'invariant.invalid_value', `${statePath}.fixtureResults`);
        continue;
      }
      for (const [fixtureIndex, resultValue] of state['fixtureResults'].entries()) {
        const resultPath = `${statePath}.fixtureResults.${fixtureIndex}`;
        const shouldBeComplete =
          validSafeInteger(completedRegularSeasonRoundCount, 0, 12) &&
          roundIndex < completedRegularSeasonRoundCount;
        if (resultValue === null) {
          if (shouldBeComplete) issue(issues, 'invariant.missing_field', resultPath);
        } else {
          if (!shouldBeComplete) issue(issues, 'invariant.invalid_combination', resultPath);
          validateGameResult(resultValue, resultPath, round.fixtures[fixtureIndex]!, issues);
        }
      }
    }
  }

  for (const [field, keys] of [
    ['programRecords', PROGRAM_RECORD_KEYS],
    ['standings', STANDING_KEYS],
  ] as const) {
    const entries = calendar[field];
    if (!Array.isArray(entries) || entries.length !== definition.programProfiles.length) {
      issue(issues, 'invariant.invalid_value', `${path}.${field}`);
      continue;
    }
    for (const [index, entryValue] of entries.entries()) {
      const entryPath = `${path}.${field}.${index}`;
      const entry = strictRecord(entryValue, entryPath, keys, issues);
      if (entry === undefined) continue;
      if (!isProgramId(entry['programId'])) {
        issue(issues, 'invariant.invalid_id', `${entryPath}.programId`);
      }
      for (const key of keys.filter((key) => key !== 'programId')) {
        if (!validSafeInteger(entry[key], 0, 1_200)) {
          issue(issues, 'invariant.out_of_bounds', `${entryPath}.${key}`);
        }
      }
    }
  }
  validatePostseasonState(
    calendar['postseason'],
    calendar,
    definition,
    `${path}.postseason`,
    issues,
  );
  if (Array.isArray(calendar['regularSeasonResults'])) {
    try {
      const tables = deriveSeasonTables(
        definition,
        calendar['regularSeasonResults'] as unknown as readonly RegularSeasonRoundState[],
      );
      if (JSON.stringify(calendar['programRecords']) !== JSON.stringify(tables.programRecords)) {
        issue(issues, 'invariant.invalid_combination', `${path}.programRecords`);
      }
      if (JSON.stringify(calendar['standings']) !== JSON.stringify(tables.standings)) {
        issue(issues, 'invariant.invalid_combination', `${path}.standings`);
      }
    } catch {
      issue(issues, 'invariant.invalid_value', `${path}.regularSeasonResults`);
    }
  }
}

function advanceExpectedWorldDrawCount(
  calendar: UnknownRecord,
  path: string,
  initialDrawCount: number,
  issues: SeasonInvariantIssue[],
): number {
  let expectedDrawCount = initialDrawCount;
  const results = calendar['regularSeasonResults'];
  if (Array.isArray(results)) {
    for (const roundState of results) {
      if (!isRecord(roundState) || !Array.isArray(roundState['fixtureResults'])) continue;
      for (const gameResult of roundState['fixtureResults']) {
        if (!isRecord(gameResult) || gameResult['model'] !== 'aggregate_v1') continue;
        if (gameResult['worldRngDrawCountBefore'] !== expectedDrawCount) {
          issue(issues, 'invariant.invalid_combination', `${path}.regularSeasonResults`);
        }
        if (validSafeInteger(gameResult['worldRngDrawCountAfter'], 0, 10_000)) {
          expectedDrawCount = gameResult['worldRngDrawCountAfter'];
        }
      }
    }
  }
  const postseason = calendar['postseason'];
  if (isRecord(postseason) && Array.isArray(postseason['rounds'])) {
    for (const round of postseason['rounds']) {
      if (!isRecord(round) || !Array.isArray(round['fixtureResults'])) continue;
      for (const wrappedResult of round['fixtureResults']) {
        if (!isRecord(wrappedResult) || !isRecord(wrappedResult['result'])) continue;
        const gameResult = wrappedResult['result'];
        if (gameResult['model'] !== 'aggregate_v1') continue;
        if (gameResult['worldRngDrawCountBefore'] !== expectedDrawCount) {
          issue(issues, 'invariant.invalid_combination', `${path}.postseason.rounds`);
        }
        if (validSafeInteger(gameResult['worldRngDrawCountAfter'], 0, 10_000)) {
          expectedDrawCount = gameResult['worldRngDrawCountAfter'];
        }
      }
    }
  }
  return expectedDrawCount;
}

function validateCalendarPlayerModels(
  calendar: UnknownRecord,
  playerProgramId: string,
  path: string,
  issues: SeasonInvariantIssue[],
): void {
  if (!isSeasonMechanicsDefinition(calendar['definition'])) return;
  const definition = calendar['definition'];
  const results = calendar['regularSeasonResults'];
  if (Array.isArray(results)) {
    for (const [roundIndex, state] of results.entries()) {
      if (!isRecord(state) || !Array.isArray(state['fixtureResults'])) continue;
      const round = definition.regularSeasonRounds[roundIndex];
      if (round === undefined) continue;
      for (const [fixtureIndex, gameResult] of state['fixtureResults'].entries()) {
        if (!isRecord(gameResult)) continue;
        const fixture = round.fixtures[fixtureIndex];
        if (fixture === undefined) continue;
        const includesPlayer =
          fixture.homeProgramId === playerProgramId || fixture.awayProgramId === playerProgramId;
        if (
          (includesPlayer && gameResult['model'] !== 'player_game_v1') ||
          (!includesPlayer && gameResult['model'] !== 'aggregate_v1')
        ) {
          issue(
            issues,
            'invariant.invalid_combination',
            `${path}.regularSeasonResults.${roundIndex}.fixtureResults.${fixtureIndex}.model`,
          );
        }
      }
    }
  }
  const postseason = calendar['postseason'];
  if (!isRecord(postseason) || !Array.isArray(postseason['rounds'])) return;
  for (const [roundIndex, round] of postseason['rounds'].entries()) {
    if (!isRecord(round) || !Array.isArray(round['fixtures'])) continue;
    if (!Array.isArray(round['fixtureResults'])) continue;
    for (const [fixtureIndex, fixture] of round['fixtures'].entries()) {
      if (!isRecord(fixture)) continue;
      const wrapped = round['fixtureResults'][fixtureIndex];
      if (!isRecord(wrapped) || !isRecord(wrapped['result'])) continue;
      const includesPlayer =
        fixture['homeProgramId'] === playerProgramId ||
        fixture['awayProgramId'] === playerProgramId;
      if (
        (includesPlayer && wrapped['result']['model'] !== 'player_game_v1') ||
        (!includesPlayer && wrapped['result']['model'] !== 'aggregate_v1')
      ) {
        issue(
          issues,
          'invariant.invalid_combination',
          `${path}.postseason.rounds.${roundIndex}.fixtureResults.${fixtureIndex}.result.model`,
        );
      }
    }
  }
}

export function validateWorldStateV1(value: unknown): SeasonInvariantResult {
  const issues: SeasonInvariantIssue[] = [];
  const hasOffseasonEvidence = isRecord(value) && Object.hasOwn(value, 'offseasonRngEvidence');
  const hasCompletedSeasonHistory =
    isRecord(value) && Object.hasOwn(value, 'completedSeasonHistory');
  const worldKeys = [
    ...WORLD_KEYS,
    ...(hasOffseasonEvidence ? ['offseasonRngEvidence'] : []),
    ...(hasCompletedSeasonHistory ? ['completedSeasonHistory'] : []),
  ];
  const world = strictRecord(value, 'world', worldKeys, issues);
  if (world !== undefined) {
    if (world['schemaVersion'] !== WORLD_SCHEMA_VERSION_V1) {
      issue(issues, 'invariant.invalid_schema_version', 'world.schemaVersion');
    }
    if (world['model'] !== 'season_v1') {
      issue(issues, 'invariant.invalid_value', 'world.model');
    }
    if (!isCareerId(world['careerId'])) {
      issue(issues, 'invariant.invalid_id', 'world.careerId');
    }
    if (!validSeed(world['worldSeed'])) {
      issue(issues, 'invariant.invalid_value', 'world.worldSeed');
    }
    if (!isRngState(world['rng'])) {
      issue(issues, 'invariant.invalid_value', 'world.rng');
    }
    if (!Number.isSafeInteger(world['revision']) || (world['revision'] as number) < 0) {
      issue(issues, 'invariant.out_of_bounds', 'world.revision');
    }
    const offseasonEvidence = hasOffseasonEvidence
      ? strictRecord(
          world['offseasonRngEvidence'],
          'world.offseasonRngEvidence',
          OFFSEASON_WORLD_RNG_EVIDENCE_KEYS,
          issues,
        )
      : undefined;
    let additionalTailDrawCount = 0;
    if (offseasonEvidence !== undefined) {
      if (offseasonEvidence['model'] !== 'offseason_world_rng_v1') {
        issue(issues, 'invariant.invalid_value', 'world.offseasonRngEvidence.model');
      }
      if (
        !validSafeInteger(offseasonEvidence['worldRngDrawCountBefore'], 0, 10_000) ||
        !validSafeInteger(offseasonEvidence['worldRngDrawCountAfter'], 0, 10_000) ||
        offseasonEvidence['worldRngDrawCountAfter'] < offseasonEvidence['worldRngDrawCountBefore']
      ) {
        issue(
          issues,
          'invariant.invalid_combination',
          'world.offseasonRngEvidence.worldRngDrawCountAfter',
        );
      } else {
        additionalTailDrawCount =
          offseasonEvidence['worldRngDrawCountAfter'] -
          offseasonEvidence['worldRngDrawCountBefore'];
      }
    }
    const completedSeasonHistory: UnknownRecord[] = [];
    if (hasCompletedSeasonHistory) {
      const rawHistory = world['completedSeasonHistory'];
      if (!Array.isArray(rawHistory) || rawHistory.length < 1 || rawHistory.length > 4) {
        issue(issues, 'invariant.invalid_value', 'world.completedSeasonHistory');
      } else {
        const seasonIds = new Set<string>();
        for (const [index, rawEntry] of rawHistory.entries()) {
          const path = `world.completedSeasonHistory.${index}`;
          const entry = strictRecord(rawEntry, path, COMPLETED_SEASON_HISTORY_ENTRY_KEYS, issues);
          if (entry === undefined) continue;
          completedSeasonHistory.push(entry);
          if (entry['model'] !== 'completed_season_world_v1') {
            issue(issues, 'invariant.invalid_value', `${path}.model`);
          }
          if (entry['seasonIndex'] !== index) {
            issue(issues, 'invariant.noncanonical_order', `${path}.seasonIndex`);
          }
          if (!isProgramId(entry['playerProgramId'])) {
            issue(issues, 'invariant.invalid_id', `${path}.playerProgramId`);
          }
          validateActiveCalendar(entry['calendar'], `${path}.calendar`, issues);
          if (isRecord(entry['calendar'])) {
            const definition = isRecord(entry['calendar']['definition'])
              ? entry['calendar']['definition']
              : undefined;
            const seasonId = definition?.['id'];
            if (
              entry['calendar']['stage'] !== 'POSTSEASON' ||
              !isRecord(entry['calendar']['postseason']) ||
              entry['calendar']['postseason']['type'] !== 'COMPLETE'
            ) {
              issue(issues, 'invariant.invalid_combination', `${path}.calendar`);
            }
            if (typeof seasonId === 'string') {
              if (seasonIds.has(seasonId)) {
                issue(issues, 'invariant.duplicate_value', `${path}.calendar.definition.id`);
              }
              seasonIds.add(seasonId);
            }
            if (isProgramId(entry['playerProgramId'])) {
              validateCalendarPlayerModels(
                entry['calendar'],
                entry['playerProgramId'],
                `${path}.calendar`,
                issues,
              );
            }
          }
        }
      }
      if (!hasOffseasonEvidence) {
        issue(issues, 'invariant.missing_field', 'world.offseasonRngEvidence');
      }
    }
    if (isRecord(world['calendar']) && world['calendar']['type'] === 'ACTIVE') {
      validateActiveCalendar(world['calendar'], 'world.calendar', issues);
      if (world['revision'] === 0) {
        issue(issues, 'invariant.invalid_combination', 'world.revision');
      }
      if (isRngState(world['rng']) && validSeed(world['worldSeed'])) {
        if (world['rng'].drawCount > 10_000) {
          issue(issues, 'invariant.out_of_bounds', 'world.rng.drawCount');
        } else {
          let expectedRng = createRng(world['worldSeed']);
          while (expectedRng.drawCount < world['rng'].drawCount) {
            expectedRng = nextUint32(expectedRng).nextRng;
          }
          if (!sameRng(world['rng'], expectedRng)) {
            issue(issues, 'invariant.invalid_combination', 'world.rng');
          }
        }
        let expectedDrawCount = 0;
        for (const [index, entry] of completedSeasonHistory.entries()) {
          if (isRecord(entry['calendar'])) {
            expectedDrawCount = advanceExpectedWorldDrawCount(
              entry['calendar'],
              `world.completedSeasonHistory.${index}.calendar`,
              expectedDrawCount,
              issues,
            );
          }
        }
        if (completedSeasonHistory.length > 0 && offseasonEvidence !== undefined) {
          if (offseasonEvidence['worldRngDrawCountBefore'] !== expectedDrawCount) {
            issue(issues, 'invariant.invalid_combination', 'world.offseasonRngEvidence');
          }
          if (validSafeInteger(offseasonEvidence['worldRngDrawCountAfter'], 0, 10_000)) {
            expectedDrawCount = offseasonEvidence['worldRngDrawCountAfter'];
          }
        }
        expectedDrawCount = advanceExpectedWorldDrawCount(
          world['calendar'],
          'world.calendar',
          expectedDrawCount,
          issues,
        );
        if (completedSeasonHistory.length === 0) {
          expectedDrawCount += additionalTailDrawCount;
        }
        if (
          world['rng'].drawCount !== expectedDrawCount ||
          (offseasonEvidence !== undefined &&
            completedSeasonHistory.length === 0 &&
            (offseasonEvidence['worldRngDrawCountBefore'] !==
              expectedDrawCount - additionalTailDrawCount ||
              offseasonEvidence['worldRngDrawCountAfter'] !== world['rng'].drawCount))
        ) {
          issue(issues, 'invariant.invalid_combination', 'world.rng.drawCount');
        }
      }
    } else {
      const calendar = strictRecord(
        world['calendar'],
        'world.calendar',
        PENDING_CALENDAR_KEYS,
        issues,
      );
      if (calendar !== undefined && calendar['type'] !== 'PENDING') {
        issue(issues, 'invariant.invalid_value', 'world.calendar.type');
      }
      if (hasCompletedSeasonHistory) {
        issue(issues, 'invariant.invalid_combination', 'world.completedSeasonHistory');
      }
    }
  }
  return result(issues);
}

function validateCareerSessionVersion(
  value: unknown,
  sessionSchemaVersion:
    | typeof CAREER_SESSION_SCHEMA_VERSION_V5
    | typeof CAREER_SESSION_SCHEMA_VERSION_V6
    | typeof CAREER_SESSION_SCHEMA_VERSION_V7
    | 8,
  validateCareer: (career: unknown) => CareerInvariantResult,
): SeasonInvariantResult {
  const issues: SeasonInvariantIssue[] = [];
  const session = strictRecord(value, 'session', SESSION_KEYS, issues);
  if (session !== undefined) {
    if (session['schemaVersion'] !== sessionSchemaVersion) {
      issue(issues, 'invariant.invalid_schema_version', 'session.schemaVersion');
    }
    const careerValidation = validateCareer(session['career']);
    if (!careerValidation.ok) {
      for (const careerIssue of careerValidation.issues) {
        issues.push({
          code: careerIssue.code,
          path: careerIssue.path.replace(/^career/u, 'session.career'),
        });
      }
    }
    const usesOffFieldSchema =
      sessionSchemaVersion === CAREER_SESSION_SCHEMA_VERSION_V6 ||
      sessionSchemaVersion === CAREER_SESSION_SCHEMA_VERSION_V7 ||
      sessionSchemaVersion === 8;
    const rawOffseason =
      usesOffFieldSchema &&
      isRecord(session['career']) &&
      isRecord(session['career']['offFieldCareerState']) &&
      isRecord(session['career']['offFieldCareerState']['offseason'])
        ? session['career']['offFieldCareerState']['offseason']
        : undefined;
    const rawWorldProjection =
      (rawOffseason?.['status'] === 'PROJECTED' || rawOffseason?.['status'] === 'DECIDED') &&
      isRecord(rawOffseason['worldProjection'])
        ? rawOffseason['worldProjection']
        : undefined;
    const worldValidation = validateWorldStateV1(session['world']);
    if (!worldValidation.ok) {
      for (const worldIssue of worldValidation.issues) {
        issues.push({
          code: worldIssue.code,
          path: worldIssue.path.replace(/^world/u, 'session.world'),
        });
      }
    }
    if (
      sessionSchemaVersion === CAREER_SESSION_SCHEMA_VERSION_V5 &&
      isRecord(session['world']) &&
      Object.hasOwn(session['world'], 'completedSeasonHistory')
    ) {
      issue(issues, 'invariant.unknown_field', 'session.world.completedSeasonHistory');
    }
    if (
      isRecord(session['career']) &&
      isRecord(session['world']) &&
      session['career']['id'] !== session['world']['careerId']
    ) {
      issue(issues, 'invariant.invalid_combination', 'session.world.careerId');
    }
    if (
      isRecord(session['career']) &&
      validSeed(session['career']['careerSeed']) &&
      isRecord(session['world'])
    ) {
      const worldSeed = expectedWorldSeed(session['career']['careerSeed']);
      if (session['world']['worldSeed'] !== worldSeed) {
        issue(issues, 'invariant.invalid_combination', 'session.world.worldSeed');
      }
      if (
        isRecord(session['world']['calendar']) &&
        session['world']['calendar']['type'] === 'PENDING'
      ) {
        if (!sameRng(session['world']['rng'], createRng(worldSeed))) {
          issue(issues, 'invariant.invalid_combination', 'session.world.rng');
        }
        if (session['world']['revision'] !== 0) {
          issue(issues, 'invariant.invalid_combination', 'session.world.revision');
        }
      }
    }
    if (
      isRecord(session['career']) &&
      isRecord(session['career']['seasonCareerState']) &&
      isRecord(session['world'])
    ) {
      const seasonState = session['career']['seasonCareerState'];
      const history = session['world']['completedSeasonHistory'];
      const returningActiveSeason =
        usesOffFieldSchema &&
        seasonState['bootstrapStatus'] === 'ACTIVE' &&
        seasonState['seasonsCompleted'] === 1;
      if (returningActiveSeason) {
        const completedSummary = isRecord(seasonState['lastCompletedSeason'])
          ? seasonState['lastCompletedSeason']
          : undefined;
        const historyEntry =
          Array.isArray(history) && isRecord(history[0]) ? history[0] : undefined;
        const historyCalendar =
          historyEntry !== undefined && isRecord(historyEntry['calendar'])
            ? historyEntry['calendar']
            : undefined;
        const historyDefinition =
          historyCalendar !== undefined && isRecord(historyCalendar['definition'])
            ? historyCalendar['definition']
            : undefined;
        const historyPostseason =
          historyCalendar !== undefined && isRecord(historyCalendar['postseason'])
            ? historyCalendar['postseason']
            : undefined;
        const decision =
          rawOffseason?.['status'] === 'DECIDED' && isRecord(rawOffseason['lastDecision'])
            ? rawOffseason['lastDecision']
            : undefined;
        if (
          !Array.isArray(history) ||
          history.length !== 1 ||
          historyEntry?.['seasonIndex'] !== 0 ||
          historyDefinition?.['id'] !== completedSummary?.['seasonId'] ||
          historyPostseason?.['playerOutcomeId'] !== completedSummary?.['outcomeId'] ||
          historyEntry?.['playerProgramId'] !== decision?.['previousProgramId']
        ) {
          issue(issues, 'invariant.invalid_combination', 'session.world.completedSeasonHistory');
        }
      } else if (history !== undefined) {
        issue(issues, 'invariant.invalid_combination', 'session.world.completedSeasonHistory');
      }
    }
    const rawWorldEvidence =
      isRecord(session['world']) && isRecord(session['world']['offseasonRngEvidence'])
        ? session['world']['offseasonRngEvidence']
        : undefined;
    if (
      (rawWorldProjection === undefined && rawWorldEvidence !== undefined) ||
      (rawWorldProjection !== undefined &&
        (rawWorldEvidence === undefined ||
          rawWorldProjection['worldRngDrawCountBefore'] !==
            rawWorldEvidence['worldRngDrawCountBefore'] ||
          rawWorldProjection['worldRngDrawCountAfter'] !==
            rawWorldEvidence['worldRngDrawCountAfter']))
    ) {
      issue(issues, 'invariant.invalid_combination', 'session.world.offseasonRngEvidence');
    }
    if (
      isRecord(session['career']) &&
      isRecord(session['career']['seasonCareerState']) &&
      isRecord(session['world']) &&
      isRecord(session['world']['calendar']) &&
      ((session['career']['seasonCareerState']['bootstrapStatus'] === 'PENDING' &&
        session['world']['calendar']['type'] !== 'PENDING') ||
        (session['career']['seasonCareerState']['bootstrapStatus'] === 'ACTIVE' &&
          session['world']['calendar']['type'] !== 'ACTIVE'))
    ) {
      issue(issues, 'invariant.invalid_combination', 'session.world.calendar.type');
    }
    if (
      isRecord(session['career']) &&
      isRecord(session['career']['seasonCareerState']) &&
      isRecord(session['world']) &&
      isRecord(session['world']['calendar']) &&
      session['career']['seasonCareerState']['bootstrapStatus'] === 'ACTIVE' &&
      session['world']['calendar']['type'] === 'ACTIVE'
    ) {
      const calendar = session['world']['calendar'];
      if (
        !isRecord(calendar['definition']) ||
        session['career']['seasonCareerState']['activeSeasonId'] !== calendar['definition']['id']
      ) {
        issue(
          issues,
          'invariant.invalid_combination',
          'session.career.seasonCareerState.activeSeasonId',
        );
      }
      const playerProgramId = session['career']['programId'];
      if (
        isProgramId(playerProgramId) &&
        isSeasonMechanicsDefinition(calendar['definition']) &&
        Array.isArray(calendar['regularSeasonResults']) &&
        validSafeInteger(calendar['completedRegularSeasonRoundCount'], 0, 12)
      ) {
        for (
          let roundIndex = 0;
          roundIndex < calendar['completedRegularSeasonRoundCount'];
          roundIndex += 1
        ) {
          const round = calendar['definition'].regularSeasonRounds[roundIndex]!;
          const state = calendar['regularSeasonResults'][roundIndex];
          if (!isRecord(state) || !Array.isArray(state['fixtureResults'])) continue;
          for (const [fixtureIndex, fixture] of round.fixtures.entries()) {
            const gameResult = state['fixtureResults'][fixtureIndex];
            if (!isRecord(gameResult)) continue;
            const includesPlayer =
              fixture.homeProgramId === playerProgramId ||
              fixture.awayProgramId === playerProgramId;
            if (
              (includesPlayer && gameResult['model'] !== 'player_game_v1') ||
              (!includesPlayer && gameResult['model'] !== 'aggregate_v1')
            ) {
              issue(
                issues,
                'invariant.invalid_combination',
                `session.world.calendar.regularSeasonResults.${roundIndex}.fixtureResults.${fixtureIndex}.model`,
              );
            }
          }
        }
      }
    }
    if (
      isRecord(session['career']) &&
      isRecord(session['career']['seasonCareerState']) &&
      isRecord(session['world']) &&
      isRecord(session['world']['calendar']) &&
      session['world']['calendar']['type'] === 'ACTIVE'
    ) {
      const career = session['career'];
      const seasonState = isRecord(career['seasonCareerState'])
        ? career['seasonCareerState']
        : undefined;
      const calendar = session['world']['calendar'];
      const postseason = isRecord(calendar['postseason']) ? calendar['postseason'] : undefined;
      const phase = isRecord(career['phase']) ? career['phase'] : undefined;
      const offseasonReview =
        usesOffFieldSchema &&
        isRecord(career['offFieldCareerState']) &&
        isRecord(career['offFieldCareerState']['offseason']) &&
        (career['offFieldCareerState']['offseason']['status'] === 'PROJECTED' ||
          career['offFieldCareerState']['offseason']['status'] === 'DECIDED');
      if (seasonState === undefined) {
        issue(issues, 'invariant.invalid_type', 'session.career.seasonCareerState');
      } else if (seasonState['bootstrapStatus'] === 'COMPLETE') {
        if (
          postseason?.['type'] !== 'COMPLETE' ||
          (phase?.['type'] !== 'CAREER_COMPLETE' &&
            !(offseasonReview && phase?.['type'] === 'SEASON_REVIEW'))
        ) {
          issue(issues, 'invariant.invalid_combination', 'session.career.seasonCareerState');
        }
        const summary = isRecord(seasonState['lastCompletedSeason'])
          ? seasonState['lastCompletedSeason']
          : undefined;
        if (
          summary !== undefined &&
          (summary['seasonId'] !== phase?.['seasonId'] ||
            summary['outcomeId'] !== phase?.['outcomeId'] ||
            summary['outcomeId'] !== postseason?.['playerOutcomeId'])
        ) {
          issue(
            issues,
            'invariant.invalid_combination',
            'session.career.seasonCareerState.lastCompletedSeason',
          );
        }
      } else if (
        phase?.['type'] === 'SEASON_REVIEW' &&
        (seasonState['bootstrapStatus'] !== 'ACTIVE' ||
          postseason?.['type'] !== 'COMPLETE' ||
          phase['seasonId'] !==
            (isRecord(calendar['definition']) ? calendar['definition']['id'] : undefined) ||
          phase['outcomeId'] !== postseason?.['playerOutcomeId'])
      ) {
        issue(issues, 'invariant.invalid_combination', 'session.career.phase');
      }

      const decision =
        rawOffseason?.['status'] === 'DECIDED' && isRecord(rawOffseason['lastDecision'])
          ? rawOffseason['lastDecision']
          : undefined;
      const playerProgramId =
        seasonState?.['bootstrapStatus'] === 'COMPLETE' &&
        decision !== undefined &&
        isProgramId(decision['previousProgramId'])
          ? decision['previousProgramId']
          : career['programId'];
      if (
        isProgramId(playerProgramId) &&
        postseason !== undefined &&
        (postseason['type'] === 'ACTIVE' || postseason['type'] === 'COMPLETE') &&
        Array.isArray(postseason['rounds'])
      ) {
        for (const [roundIndex, roundValue] of postseason['rounds'].entries()) {
          if (
            !isRecord(roundValue) ||
            !Array.isArray(roundValue['fixtures']) ||
            !Array.isArray(roundValue['fixtureResults'])
          )
            continue;
          for (const [fixtureIndex, fixtureValue] of roundValue['fixtures'].entries()) {
            if (!isRecord(fixtureValue)) continue;
            const wrappedResult = roundValue['fixtureResults'][fixtureIndex];
            if (!isRecord(wrappedResult) || !isRecord(wrappedResult['result'])) continue;
            const includesPlayer =
              fixtureValue['homeProgramId'] === playerProgramId ||
              fixtureValue['awayProgramId'] === playerProgramId;
            if (
              (includesPlayer && wrappedResult['result']['model'] !== 'player_game_v1') ||
              (!includesPlayer && wrappedResult['result']['model'] !== 'aggregate_v1')
            ) {
              issue(
                issues,
                'invariant.invalid_combination',
                `session.world.calendar.postseason.rounds.${roundIndex}.fixtureResults.${fixtureIndex}.result.model`,
              );
            }
          }
        }
        if (postseason['type'] === 'COMPLETE' && Array.isArray(calendar['standings'])) {
          const standing = calendar['standings'].find(
            (entry) => isRecord(entry) && entry['programId'] === playerProgramId,
          );
          const expectedRank = isRecord(standing) ? standing['rank'] : undefined;
          const qualifiers = Array.isArray(postseason['qualifierProgramIds'])
            ? postseason['qualifierProgramIds']
            : [];
          const seedIndex = qualifiers.indexOf(playerProgramId);
          const expectedSeed = seedIndex < 0 ? null : seedIndex + 1;
          const finalRound = isRecord(postseason['rounds'][1])
            ? postseason['rounds'][1]
            : undefined;
          const finalFixture =
            Array.isArray(finalRound?.['fixtures']) && isRecord(finalRound['fixtures'][0])
              ? finalRound['fixtures'][0]
              : undefined;
          const playerInFinal =
            finalFixture?.['homeProgramId'] === playerProgramId ||
            finalFixture?.['awayProgramId'] === playerProgramId;
          const expectedOutcome =
            expectedSeed === null
              ? 'season_outcome_regular_season_complete'
              : postseason['championProgramId'] === playerProgramId
                ? 'season_outcome_champion'
                : playerInFinal
                  ? 'season_outcome_runner_up'
                  : 'season_outcome_semifinal_exit';
          if (
            postseason['playerRegularSeasonRank'] !== expectedRank ||
            postseason['playerPostseasonSeed'] !== expectedSeed ||
            postseason['playerOutcomeId'] !== expectedOutcome
          ) {
            issue(
              issues,
              'invariant.invalid_combination',
              'session.world.calendar.postseason.playerOutcomeId',
            );
          }
        }
      }
    }
  }
  return result(issues);
}

export function validateCareerSessionV5(value: unknown): SeasonInvariantResult {
  return validateCareerSessionVersion(value, CAREER_SESSION_SCHEMA_VERSION_V5, validateCareerRunV5);
}

export function validateCareerSessionV6(value: unknown): SeasonInvariantResult {
  return validateCareerSessionVersion(value, CAREER_SESSION_SCHEMA_VERSION_V6, validateCareerRunV6);
}

export function validateCareerSessionV7(value: unknown): SeasonInvariantResult {
  return validateCareerSessionVersion(value, CAREER_SESSION_SCHEMA_VERSION_V7, validateCareerRunV7);
}

/** Internal v8 parser hook: share all world/linkage checks without broadening old readers. */
export function validateCareerSessionV8WithCareer(
  value: unknown,
  validateCareer: (career: unknown) => CareerInvariantResult,
): SeasonInvariantResult {
  return validateCareerSessionVersion(value, 8, validateCareer);
}

export function validateCareerSession(value: unknown): SeasonInvariantResult {
  return validateCareerSessionV7(value);
}

function validateAlumniRecord(
  value: unknown,
  path: string,
  issues: SeasonInvariantIssue[],
): UnknownRecord | undefined {
  const alumni = strictRecord(value, path, ALUMNI_KEYS, issues);
  if (alumni === undefined) return undefined;
  if (alumni['schemaVersion'] !== 1) {
    issue(issues, 'invariant.invalid_schema_version', `${path}.schemaVersion`);
  }
  if (!isCareerId(alumni['careerId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.careerId`);
  }
  if (
    typeof alumni['alumniId'] !== 'string' ||
    !isStableDomainId(alumni['alumniId']) ||
    alumni['alumniId'] !== `alumni_${String(alumni['careerId'])}`
  ) {
    issue(issues, 'invariant.invalid_id', `${path}.alumniId`);
  }
  if (!isPlayerId(alumni['playerId'])) issue(issues, 'invariant.invalid_id', `${path}.playerId`);
  if (typeof alumni['displayName'] !== 'string' || alumni['displayName'].trim().length === 0) {
    issue(issues, 'invariant.invalid_value', `${path}.displayName`);
  }
  if (!isRecord(alumni['appearance'])) {
    issue(issues, 'invariant.invalid_type', `${path}.appearance`);
  }
  if (alumni['positionId'] !== 'position_wr') {
    issue(issues, 'invariant.invalid_id', `${path}.positionId`);
  }
  if (!isWrArchetypeId(alumni['archetypeId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.archetypeId`);
  }
  if (!isRecruitingBackgroundId(alumni['recruitingBackgroundId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.recruitingBackgroundId`);
  }
  if (
    !Array.isArray(alumni['personalityTraitIds']) ||
    alumni['personalityTraitIds'].length !== 2 ||
    !alumni['personalityTraitIds'].every(isPersonalityTraitId) ||
    alumni['personalityTraitIds'][0] === alumni['personalityTraitIds'][1]
  ) {
    issue(issues, 'invariant.invalid_value', `${path}.personalityTraitIds`);
  }
  if (
    !Array.isArray(alumni['programIds']) ||
    alumni['programIds'].length !== 1 ||
    !isProgramId(alumni['programIds'][0])
  ) {
    issue(issues, 'invariant.invalid_value', `${path}.programIds`);
  }
  if (alumni['seasonsPlayed'] !== 1) {
    issue(issues, 'invariant.invalid_value', `${path}.seasonsPlayed`);
  }
  if (!isWrGameStatLine(alumni['careerStats'])) {
    issue(issues, 'invariant.invalid_value', `${path}.careerStats`);
  }
  for (const key of [
    'gamesPlayed',
    'wins',
    'losses',
    'ties',
    'averagePerformanceGrade',
    'startingDepthRank',
    'finalDepthRank',
    'injuryWeeksMissed',
    'regularSeasonRank',
    'contentVersion',
  ] as const) {
    if (!validSafeInteger(alumni[key], key === 'contentVersion' ? 1 : 0, 10_000)) {
      issue(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (
    validSafeInteger(alumni['gamesPlayed'], 0, 10_000) &&
    validSafeInteger(alumni['wins'], 0, 10_000) &&
    validSafeInteger(alumni['losses'], 0, 10_000) &&
    validSafeInteger(alumni['ties'], 0, 10_000) &&
    alumni['gamesPlayed'] !==
      (alumni['wins'] as number) + (alumni['losses'] as number) + (alumni['ties'] as number)
  ) {
    issue(issues, 'invariant.invalid_combination', `${path}.gamesPlayed`);
  }
  const programId = Array.isArray(alumni['programIds']) ? alumni['programIds'][0] : undefined;
  if (
    alumni['bestGame'] !== null &&
    !isCompletedGameSummary(alumni['bestGame'], programId, Number.MAX_SAFE_INTEGER)
  ) {
    issue(issues, 'invariant.invalid_value', `${path}.bestGame`);
  }
  if (!isDepthRoleId(alumni['startingRoleId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.startingRoleId`);
  }
  if (!isDepthRoleId(alumni['finalRoleId'])) {
    issue(issues, 'invariant.invalid_id', `${path}.finalRoleId`);
  }
  for (const [field, allowNull] of [
    ['ownedSkillIds', false],
    ['equippedSkillIds', true],
  ] as const) {
    const entries = alumni[field];
    if (
      !Array.isArray(entries) ||
      !entries.every((entry) => (allowNull && entry === null) || isSkillId(entry))
    ) {
      issue(issues, 'invariant.invalid_value', `${path}.${field}`);
    }
  }
  if (
    !Array.isArray(alumni['injuryOutcomeIds']) ||
    !alumni['injuryOutcomeIds'].every(isInjuryOutcomeId)
  ) {
    issue(issues, 'invariant.invalid_value', `${path}.injuryOutcomeIds`);
  }
  if (
    ![
      'season_outcome_champion',
      'season_outcome_runner_up',
      'season_outcome_semifinal_exit',
      'season_outcome_regular_season_complete',
    ].includes(alumni['seasonOutcomeId'] as string)
  ) {
    issue(issues, 'invariant.invalid_id', `${path}.seasonOutcomeId`);
  }
  if (alumni['postseasonSeed'] !== null && !validSafeInteger(alumni['postseasonSeed'], 1, 4)) {
    issue(issues, 'invariant.out_of_bounds', `${path}.postseasonSeed`);
  }
  if (alumni['championshipCount'] !== 0 && alumni['championshipCount'] !== 1) {
    issue(issues, 'invariant.out_of_bounds', `${path}.championshipCount`);
  }
  if (alumni['endingId'] !== 'career_ending_one_season_complete') {
    issue(issues, 'invariant.invalid_id', `${path}.endingId`);
  }
  if (!validSeed(alumni['careerSeed'])) {
    issue(issues, 'invariant.invalid_value', `${path}.careerSeed`);
  }
  if (
    alumni['careerSchemaVersion'] !== 5 &&
    alumni['careerSchemaVersion'] !== 6 &&
    alumni['careerSchemaVersion'] !== 7
  ) {
    issue(issues, 'invariant.invalid_schema_version', `${path}.careerSchemaVersion`);
  }
  return alumni;
}

function validateMetaProfileVersion(
  value: unknown,
  version: 1 | 2,
  validateAlumni: typeof validateAlumniRecord = validateAlumniRecord,
): SeasonInvariantResult {
  const issues: SeasonInvariantIssue[] = [];
  const meta = strictRecord(value, 'meta', META_KEYS, issues);
  if (meta !== undefined) {
    if (meta['schemaVersion'] !== version) {
      issue(issues, 'invariant.invalid_schema_version', 'meta.schemaVersion');
    }
    if (!Number.isSafeInteger(meta['revision']) || (meta['revision'] as number) < 0) {
      issue(issues, 'invariant.out_of_bounds', 'meta.revision');
    }
    if (!Array.isArray(meta['alumni'])) {
      issue(issues, 'invariant.invalid_type', 'meta.alumni');
    } else {
      const careerIds = new Set<string>();
      let previousAlumniId: string | undefined;
      for (const [index, alumnusValue] of meta['alumni'].entries()) {
        const path = `meta.alumni.${index}`;
        const alumnus = validateAlumni(alumnusValue, path, issues);
        if (alumnus === undefined) continue;
        if (
          previousAlumniId !== undefined &&
          compareCodeUnits(previousAlumniId, String(alumnus['alumniId'])) >= 0
        ) {
          issue(issues, 'invariant.noncanonical_order', path);
        }
        previousAlumniId = String(alumnus['alumniId']);
        if (careerIds.has(String(alumnus['careerId']))) {
          issue(issues, 'invariant.duplicate_value', `${path}.careerId`);
        }
        careerIds.add(String(alumnus['careerId']));
      }
    }
    if (!Array.isArray(meta['unlockedOptionIds'])) {
      issue(issues, 'invariant.invalid_type', 'meta.unlockedOptionIds');
    } else {
      const seen = new Set<string>();
      for (const [index, optionId] of meta['unlockedOptionIds'].entries()) {
        if (!isStableDomainId(optionId)) {
          issue(issues, 'invariant.invalid_id', `meta.unlockedOptionIds.${index}`);
        } else if (seen.has(optionId)) {
          issue(issues, 'invariant.duplicate_value', `meta.unlockedOptionIds.${index}`);
        } else {
          seen.add(optionId);
        }
        if (index > 0 && compareCodeUnits(meta['unlockedOptionIds'][index - 1], optionId) >= 0) {
          issue(issues, 'invariant.noncanonical_order', `meta.unlockedOptionIds.${index}`);
        }
      }
    }
    if (!Array.isArray(meta['programFamiliarity'])) {
      issue(issues, 'invariant.invalid_type', 'meta.programFamiliarity');
    } else {
      let previousProgramId: string | undefined;
      for (const [index, entryValue] of meta['programFamiliarity'].entries()) {
        const path = `meta.programFamiliarity.${index}`;
        const entry = strictRecord(entryValue, path, FAMILIARITY_KEYS, issues);
        if (entry === undefined) continue;
        if (!isProgramId(entry['programId'])) {
          issue(issues, 'invariant.invalid_id', `${path}.programId`);
        } else {
          if (
            previousProgramId !== undefined &&
            compareCodeUnits(previousProgramId, entry['programId']) >= 0
          ) {
            issue(issues, 'invariant.noncanonical_order', path);
          }
          previousProgramId = entry['programId'];
        }
        if (
          !Number.isSafeInteger(entry['completedCareers']) ||
          (entry['completedCareers'] as number) < 1
        ) {
          issue(issues, 'invariant.out_of_bounds', `${path}.completedCareers`);
        }
      }
    }
  }
  return result(issues);
}

/** Internal standalone access to the unchanged historical alumni kernel. */
export function validateAlumniRecordV1(value: unknown): SeasonInvariantResult {
  const issues: SeasonInvariantIssue[] = [];
  validateAlumniRecord(value, 'alumni', issues);
  return result(issues);
}

export function validateMetaProfileV1(value: unknown): SeasonInvariantResult {
  return validateMetaProfileVersion(value, META_PROFILE_SCHEMA_VERSION_V1);
}

/** Internal versioned WR hook; historical alumni still use their exact reader. */
export function validateWrMetaProfileV2WithAlumni(
  value: unknown,
  currentAlumni: (value: unknown) => boolean,
): SeasonInvariantResult {
  return validateMetaProfileVersion(value, 2, (alumni, path, issues) => {
    if (isRecord(alumni) && alumni['schemaVersion'] === 1)
      return validateAlumniRecord(alumni, path, issues);
    if (isRecord(alumni) && currentAlumni(alumni)) return alumni;
    issue(issues, 'invariant.invalid_combination', path);
    return undefined;
  });
}

export function isWorldStateV1(value: unknown): value is WorldStateV1 {
  return validateWorldStateV1(value).ok;
}

export function isCareerSessionV5(value: unknown): value is CareerSessionV5 {
  return validateCareerSessionV5(value).ok;
}

export function isCareerSessionV6(value: unknown): value is CareerSessionV6 {
  return validateCareerSessionV6(value).ok;
}

export function isCareerSessionV7(value: unknown): value is CareerSessionV7 {
  return validateCareerSessionV7(value).ok;
}

export function isMetaProfileV1(value: unknown): value is MetaProfileV1 {
  return validateMetaProfileV1(value).ok;
}
