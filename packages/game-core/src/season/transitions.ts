import { prepareScheduledGame } from '../games/transitions.js';
import { isOffFieldMechanicsCatalog } from '../off-field/definitions.js';
import { deriveRelationshipContextProjection } from '../off-field/transitions.js';
import { createEmptyEventCareerState } from '../events/validation.js';
import { advanceInjuryRecovery, currentInjuryOpportunityCap } from '../injuries/transitions.js';
import { createEmptyInjuryCareerState } from '../injuries/validation.js';
import type {
  GameOpponentMechanicsProfile,
  GameTuningDefinition,
  KeySnapFamilyMechanicsDefinition,
  KeySnapPatternMechanicsDefinition,
} from '../games/types.js';
import type { GameId } from '../games/ids.js';
import { COACH_TRUST_BOUNDS } from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { isProgramId } from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import { nextInt, restoreRngState, type RngState } from '../random/rng.js';
import type { SkillMechanicsDefinition } from '../skills/types.js';
import type { WeeklyActionDefinition } from '../weekly/types.js';
import type { DevelopmentWeekConfig } from '../weekly/tuning.js';
import type {
  AcademicGameRestrictionEvidenceV1,
  OffFieldMechanicsCatalog,
  OffseasonDecisionEvidenceV1,
  OffseasonProgramMechanicsProfile,
  OffseasonProgramProjectionV1,
  TransferOptionProjectionV1,
  TransferProjectionFactorEvidenceV1,
  TransferShortlistSelectionEvidenceV1,
} from '../off-field/types.js';
import { validateOffenseCatalog, validateProgramCatalog } from '../programs/recruiting.js';
import { generateProgramRoomContext, validateRotationCatalog } from '../programs/commitment.js';
import { depthRoleIdForRank } from '../programs/tuning.js';
import type {
  RecruitingOffenseStyleDefinition,
  RecruitingProgramDefinition,
  RosterNameMechanicsPool,
  RotationPolicyMechanicsDefinition,
} from '../programs/types.js';
import { WEEKLY_EXPERIENCE_VERSION_CURRENT } from '../weekly/types.js';
import { advanceDevelopmentWeek, advanceSeasonCampDevelopmentWeek } from '../weekly/transitions.js';
import {
  canonicalizeSeasonMechanicsDefinition,
  isSeasonMechanicsDefinition,
} from './definitions.js';
import { deriveSeasonTables } from './standings.js';
import type {
  AlumniRecordV1,
  ActiveSeasonCalendar,
  ActivePostseasonState,
  AggregateSeasonGameResult,
  CareerSession,
  CompleteCareerResult,
  CompletePostseasonState,
  LegacyVisibilityV1,
  MetaProfileV1,
  PlayerSeasonGameResult,
  PostseasonGameResult,
  PostseasonRoundState,
  RegularSeasonRoundState,
  SeasonCommandFailureReason,
  SeasonCommandResult,
  SeasonFixtureMechanicsDefinition,
  SeasonMechanicsDefinition,
  SeasonProgramMechanicsProfile,
} from './types.js';
import {
  CAREER_SCHEMA_VERSION,
  type CareerRun,
  type CompletedSeasonSummary,
  type SeasonRoleSnapshot,
} from '../player/types.js';
import { validateCareerSession, validateMetaProfileV1 } from './validation.js';

const AGGREGATE_SCORE_MINIMUM = 0;
const AGGREGATE_SCORE_MAXIMUM = 60;
const AGGREGATE_EXPECTED_SCORE_MINIMUM = 8;
const AGGREGATE_EXPECTED_SCORE_MAXIMUM = 45;
const AGGREGATE_VARIANCE_MINIMUM = -7;
const AGGREGATE_VARIANCE_MAXIMUM_EXCLUSIVE = 8;
const AGGREGATE_HOME_BONUS = 2;

export interface SeasonWeekMechanics {
  readonly developmentWeekConfig: DevelopmentWeekConfig;
  readonly skillDefinitions: readonly SkillMechanicsDefinition[];
  readonly weeklyActionDefinitions: readonly WeeklyActionDefinition[];
}

export interface SeasonGameMechanics {
  readonly tuning: GameTuningDefinition;
  readonly familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[];
  readonly patternDefinitions: readonly KeySnapPatternMechanicsDefinition[];
  readonly skillDefinitions: readonly SkillMechanicsDefinition[];
  readonly offFieldDefinitions?: OffFieldMechanicsCatalog;
}

export interface OffseasonProjectionMechanics {
  readonly offFieldDefinitions: OffFieldMechanicsCatalog;
  readonly programProfiles: readonly OffseasonProgramMechanicsProfile[];
  readonly offenseStyleDefinitions: readonly RecruitingOffenseStyleDefinition[];
  readonly rotationPolicyDefinitions: readonly RotationPolicyMechanicsDefinition[];
}

export interface OffseasonDecisionMechanics extends OffseasonProjectionMechanics {
  readonly programDefinitions: readonly RecruitingProgramDefinition[];
  readonly rosterNamePool: RosterNameMechanicsPool;
}

export interface SimulateAggregateSeasonGameResult {
  readonly result: AggregateSeasonGameResult;
  readonly nextRng: RngState;
}

function failure(session: CareerSession, reason: SeasonCommandFailureReason): SeasonCommandResult {
  return Object.freeze({ ok: false, session, reason });
}

function success(previousSession: CareerSession, nextSession: CareerSession): SeasonCommandResult {
  if (!validateCareerSession(nextSession).ok) {
    return failure(previousSession, 'season.internal_invariant_failure');
  }
  return deepFreeze({ ok: true, session: nextSession });
}

function activeCalendar(session: CareerSession): ActiveSeasonCalendar | null {
  return session.world.calendar.type === 'ACTIVE' ? session.world.calendar : null;
}

function recordActiveSeasonProgress(
  career: CareerRun,
  completedGameSummary: CareerRun['gameCareerState']['lastGame'] = null,
): CareerRun {
  if (career.seasonCareerState.bootstrapStatus !== 'ACTIVE' || career.programContext === null) {
    return career;
  }
  const projection = career.programContext.projection;
  const snapshot: SeasonRoleSnapshot = {
    weekIndex: career.weekIndex,
    rank: projection.rank,
    roleId: projection.roleId,
  };
  const lastSnapshot = career.seasonCareerState.roleHistory.at(-1);
  const roleHistory =
    lastSnapshot?.weekIndex === snapshot.weekIndex &&
    lastSnapshot.rank === snapshot.rank &&
    lastSnapshot.roleId === snapshot.roleId
      ? career.seasonCareerState.roleHistory
      : [...career.seasonCareerState.roleHistory, snapshot];
  const gameSummaries =
    completedGameSummary === null
      ? career.seasonCareerState.gameSummaries
      : [...career.seasonCareerState.gameSummaries, completedGameSummary];
  return {
    ...career,
    seasonCareerState: {
      ...career.seasonCareerState,
      gameSummaries,
      roleHistory,
    },
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function winnerProgramId(
  fixture: SeasonFixtureMechanicsDefinition,
  homeScore: number,
  awayScore: number,
) {
  return homeScore === awayScore
    ? null
    : homeScore > awayScore
      ? fixture.homeProgramId
      : fixture.awayProgramId;
}

function attackRating(profile: SeasonProgramMechanicsProfile): number {
  return Math.round((profile.offenseRating * 2 + profile.qbRating) / 3);
}

function expectedScore(
  attackProfile: SeasonProgramMechanicsProfile,
  defenseProfile: SeasonProgramMechanicsProfile,
  homeBonus: number,
): number {
  return clamp(
    24 + Math.round((attackRating(attackProfile) - defenseProfile.defenseRating) / 3) + homeBonus,
    AGGREGATE_EXPECTED_SCORE_MINIMUM,
    AGGREGATE_EXPECTED_SCORE_MAXIMUM,
  );
}

export function simulateAggregateSeasonGame(
  fixture: SeasonFixtureMechanicsDefinition,
  homeProfile: SeasonProgramMechanicsProfile,
  awayProfile: SeasonProgramMechanicsProfile,
  rng: RngState,
): SimulateAggregateSeasonGameResult {
  if (
    fixture.homeProgramId !== homeProfile.programId ||
    fixture.awayProgramId !== awayProfile.programId
  ) {
    throw new TypeError('season_simulation.profile_mismatch');
  }
  const worldRngDrawCountBefore = rng.drawCount;
  const homeExpectedScore = expectedScore(homeProfile, awayProfile, AGGREGATE_HOME_BONUS);
  const awayExpectedScore = expectedScore(awayProfile, homeProfile, 0);
  const homeVarianceSample = nextInt(
    restoreRngState(rng),
    AGGREGATE_VARIANCE_MINIMUM,
    AGGREGATE_VARIANCE_MAXIMUM_EXCLUSIVE,
  );
  const awayVarianceSample = nextInt(
    homeVarianceSample.nextRng,
    AGGREGATE_VARIANCE_MINIMUM,
    AGGREGATE_VARIANCE_MAXIMUM_EXCLUSIVE,
  );
  const homeScore = clamp(
    homeExpectedScore + homeVarianceSample.value,
    AGGREGATE_SCORE_MINIMUM,
    AGGREGATE_SCORE_MAXIMUM,
  );
  const awayScore = clamp(
    awayExpectedScore + awayVarianceSample.value,
    AGGREGATE_SCORE_MINIMUM,
    AGGREGATE_SCORE_MAXIMUM,
  );
  return deepFreeze({
    result: {
      fixtureId: fixture.id,
      model: 'aggregate_v1',
      homeScore,
      awayScore,
      winnerProgramId: winnerProgramId(fixture, homeScore, awayScore),
      homeExpectedScore,
      awayExpectedScore,
      homeVariance: homeVarianceSample.value,
      awayVariance: awayVarianceSample.value,
      worldRngDrawCountBefore,
      worldRngDrawCountAfter: awayVarianceSample.nextRng.drawCount,
    },
    nextRng: awayVarianceSample.nextRng,
  });
}

function createActiveCalendar(definition: SeasonMechanicsDefinition): ActiveSeasonCalendar {
  const regularSeasonResults: readonly RegularSeasonRoundState[] =
    definition.regularSeasonRounds.map((round) => ({
      roundId: round.id,
      fixtureResults: round.fixtures.map(() => null),
    }));
  const tables = deriveSeasonTables(definition, regularSeasonResults);
  return deepFreeze({
    type: 'ACTIVE',
    definition,
    stage: 'CAMP',
    completedCampRoundCount: 0,
    completedRegularSeasonRoundCount: 0,
    regularSeasonResults,
    programRecords: tables.programRecords,
    standings: tables.standings,
    postseason: { type: 'PENDING' },
  });
}

export function bootstrapSeason(
  session: CareerSession,
  definition: SeasonMechanicsDefinition,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  if (!isSeasonMechanicsDefinition(definition)) {
    return failure(session, 'season.invalid_definition');
  }
  if (
    session.career.seasonCareerState.bootstrapStatus !== 'PENDING' ||
    session.world.calendar.type !== 'PENDING' ||
    session.career.phase.type !== 'PLAN_ACTIONS' ||
    session.career.recruitingState.type !== 'COMMITTED' ||
    session.career.programId === null ||
    session.career.programContext === null ||
    session.career.weeklyExperienceVersion !== WEEKLY_EXPERIENCE_VERSION_CURRENT ||
    !definition.programProfiles.some(({ programId }) => programId === session.career.programId)
  ) {
    return failure(session, 'season.invalid_phase');
  }
  if (
    session.career.revision === Number.MAX_SAFE_INTEGER ||
    session.world.revision === Number.MAX_SAFE_INTEGER
  ) {
    return failure(session, 'season.revision_exhausted');
  }
  const canonicalDefinition = canonicalizeSeasonMechanicsDefinition(definition);
  const nextSession: CareerSession = {
    ...cloneSerializable(session),
    career: {
      ...cloneSerializable(session.career),
      revision: session.career.revision + 1,
      seasonCareerState: {
        model: 'season_v1',
        bootstrapStatus: 'ACTIVE',
        seasonsCompleted: 0,
        activeSeasonId: canonicalDefinition.id,
        lastCompletedSeason: null,
        eventState: createEmptyEventCareerState(),
        injuryState: createEmptyInjuryCareerState(),
        gameSummaries: [],
        roleHistory: [
          {
            weekIndex: session.career.weekIndex,
            rank: session.career.programContext.projection.rank,
            roleId: session.career.programContext.projection.roleId,
          },
        ],
      },
    },
    world: {
      ...cloneSerializable(session.world),
      revision: session.world.revision + 1,
      calendar: createActiveCalendar(canonicalDefinition),
    },
  };
  return success(session, nextSession);
}

export function bootstrapNextSeason(
  session: CareerSession,
  definition: SeasonMechanicsDefinition,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  if (!isSeasonMechanicsDefinition(definition)) {
    return failure(session, 'season.invalid_definition');
  }
  const seasonState = session.career.seasonCareerState;
  const offseason = session.career.offFieldCareerState.offseason;
  const completedCalendar = activeCalendar(session);
  if (
    seasonState.bootstrapStatus !== 'COMPLETE' ||
    seasonState.seasonsCompleted !== 1 ||
    session.career.phase.type !== 'SEASON_REVIEW' ||
    offseason.status !== 'DECIDED' ||
    offseason.nextSeasonIndex !== 2 ||
    completedCalendar === null ||
    completedCalendar.postseason.type !== 'COMPLETE' ||
    completedCalendar.definition.id !== seasonState.lastCompletedSeason.seasonId ||
    session.world.completedSeasonHistory !== undefined ||
    session.world.offseasonRngEvidence === undefined ||
    session.career.offFieldCareerState.academics.bootstrapStatus !== 'ACTIVE' ||
    session.career.offFieldCareerState.academics.termIndex !== offseason.academicTermIndexBefore ||
    session.career.programId === null ||
    session.career.programContext === null
  ) {
    return failure(session, 'season.invalid_phase');
  }
  const canonicalDefinition = canonicalizeSeasonMechanicsDefinition(definition);
  const projectedProgramIds = offseason.worldProjection.programs.map(({ programId }) => programId);
  const definitionProgramIds = canonicalDefinition.programProfiles.map(
    ({ programId }) => programId,
  );
  if (
    canonicalDefinition.id === seasonState.lastCompletedSeason.seasonId ||
    JSON.stringify(definitionProgramIds) !== JSON.stringify(projectedProgramIds) ||
    !definitionProgramIds.includes(session.career.programId)
  ) {
    return failure(session, 'season.invalid_definition');
  }
  if (
    session.career.revision === Number.MAX_SAFE_INTEGER ||
    session.world.revision === Number.MAX_SAFE_INTEGER
  ) {
    return failure(session, 'season.revision_exhausted');
  }
  const playerProgramId = offseason.lastDecision.previousProgramId;
  return success(session, {
    ...cloneSerializable(session),
    career: {
      ...cloneSerializable(session.career),
      revision: session.career.revision + 1,
      phase: { type: 'PLAN_ACTIONS' },
      recentWeeklyActionIds: [],
      offFieldCareerState: {
        ...cloneSerializable(session.career.offFieldCareerState),
        academics: {
          ...cloneSerializable(session.career.offFieldCareerState.academics),
          termIndex: offseason.academicTermIndexAfter,
        },
      },
      seasonCareerState: {
        model: 'season_v1',
        bootstrapStatus: 'ACTIVE',
        seasonsCompleted: 1,
        activeSeasonId: canonicalDefinition.id,
        lastCompletedSeason: cloneSerializable(seasonState.lastCompletedSeason),
        eventState: createEmptyEventCareerState(),
        injuryState: createEmptyInjuryCareerState(),
        gameSummaries: [],
        roleHistory: [
          {
            weekIndex: session.career.weekIndex,
            rank: session.career.programContext.projection.rank,
            roleId: session.career.programContext.projection.roleId,
          },
        ],
      },
    },
    world: {
      ...cloneSerializable(session.world),
      revision: session.world.revision + 1,
      completedSeasonHistory: [
        {
          model: 'completed_season_world_v1',
          seasonIndex: 0,
          playerProgramId,
          calendar: cloneSerializable(completedCalendar),
        },
      ],
      calendar: createActiveCalendar(canonicalDefinition),
    },
  });
}

function weeklyFailureReason(reason: string): SeasonCommandFailureReason {
  if (reason === 'weekly.invalid_development_config') return 'season.invalid_development_config';
  if (reason === 'weekly.invalid_action_definitions') return 'season.invalid_action_definitions';
  if (
    reason === 'weekly.invalid_skill_definitions' ||
    reason === 'weekly.missing_equipped_skill_definition' ||
    reason === 'weekly.invalid_skill_offer_weights'
  ) {
    return 'season.invalid_skill_definitions';
  }
  if (reason === 'weekly.rng_exhausted') return 'season.rng_exhausted';
  if (reason === 'weekly.revision_exhausted') return 'season.revision_exhausted';
  return reason === 'weekly.invalid_phase'
    ? 'season.invalid_phase'
    : 'season.internal_invariant_failure';
}

export function advanceSeasonCampRound(
  session: CareerSession,
  mechanics: SeasonWeekMechanics,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  const calendar = activeCalendar(session);
  if (
    calendar === null ||
    calendar.stage !== 'CAMP' ||
    calendar.completedCampRoundCount >= calendar.definition.campRoundIds.length ||
    session.career.phase.type !== 'WEEK_END' ||
    session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    session.career.seasonCareerState.eventState.lastSelection?.weekIndex !==
      session.career.weekIndex ||
    session.career.seasonCareerState.injuryState.lastAssessment?.weekIndex !==
      session.career.weekIndex ||
    session.career.seasonCareerState.injuryState.lastAvailability?.weekIndex !==
      session.career.weekIndex
  ) {
    return failure(session, 'season.invalid_phase');
  }
  if (session.world.revision === Number.MAX_SAFE_INTEGER) {
    return failure(session, 'season.revision_exhausted');
  }
  const advanced = advanceSeasonCampDevelopmentWeek(
    session.career,
    mechanics.developmentWeekConfig,
    mechanics.skillDefinitions,
    mechanics.weeklyActionDefinitions,
  );
  if (!advanced.ok) return failure(session, weeklyFailureReason(advanced.reason));
  const completedCampRoundCount = calendar.completedCampRoundCount + 1;
  return success(session, {
    ...cloneSerializable(session),
    career: recordActiveSeasonProgress(advanceInjuryRecovery(advanced.career)),
    world: {
      ...cloneSerializable(session.world),
      revision: session.world.revision + 1,
      calendar: {
        ...cloneSerializable(calendar),
        stage:
          completedCampRoundCount === calendar.definition.campRoundIds.length
            ? 'REGULAR_SEASON'
            : 'CAMP',
        completedCampRoundCount,
      },
    },
  });
}

function currentRegularSeasonRound(calendar: ActiveSeasonCalendar) {
  return calendar.definition.regularSeasonRounds[calendar.completedRegularSeasonRoundCount];
}

function playerFixture(
  session: CareerSession,
  calendar: ActiveSeasonCalendar,
): SeasonFixtureMechanicsDefinition | null {
  const round = currentRegularSeasonRound(calendar);
  const programId = session.career.programId;
  if (round === undefined || programId === null) return null;
  return (
    round.fixtures.find(
      (fixture) => fixture.homeProgramId === programId || fixture.awayProgramId === programId,
    ) ?? null
  );
}

function gameProfile(profile: SeasonProgramMechanicsProfile): GameOpponentMechanicsProfile {
  return {
    programId: profile.programId,
    offenseRating: profile.offenseRating,
    defenseRating: profile.defenseRating,
    qbRating: profile.qbRating,
  };
}

function deriveOffFieldGameAvailability(
  career: CareerRun,
  mechanics: SeasonGameMechanics,
  injuryMaximumOpportunities: number,
) {
  const academics = career.offFieldCareerState.academics;
  const relationships = career.offFieldCareerState.relationships;
  if (academics.bootstrapStatus === 'PENDING' && relationships.bootstrapStatus === 'PENDING') {
    return { maximumOpportunities: injuryMaximumOpportunities } as const;
  }
  if (
    academics.bootstrapStatus !== 'ACTIVE' ||
    relationships.bootstrapStatus !== 'ACTIVE' ||
    mechanics.offFieldDefinitions === undefined
  ) {
    return null;
  }
  const nextCheckpoint =
    mechanics.offFieldDefinitions.academics.checkpoints[academics.nextCheckpointIndex];
  if (nextCheckpoint !== undefined && nextCheckpoint.weekIndex <= career.weekIndex) return null;
  if (relationships.lastProcessedWeekIndex !== career.weekIndex) return null;
  const relationshipContext = deriveRelationshipContextProjection(
    career,
    mechanics.offFieldDefinitions,
  );
  if (relationshipContext === null) return null;
  const academicRestrictionGamesBefore = academics.restrictionGamesRemaining;
  const academicRestrictionGamesAfter = Math.max(0, academicRestrictionGamesBefore - 1);
  const maximumOpportunities = academicRestrictionGamesBefore > 0 ? 0 : injuryMaximumOpportunities;
  return {
    maximumOpportunities,
    offFieldContext: {
      model: 'off_field_game_context_v1',
      relationshipEffects: relationshipContext.footballEffects,
      injuryMaximumOpportunities,
      academicRestrictionGamesBefore,
      academicRestrictionGamesAfter,
      maximumOpportunities,
    },
  } as const;
}

function consumePreparedAcademicRestriction(career: CareerRun): CareerRun {
  if (career.phase.type !== 'GAME_PREVIEW' || career.phase.matchup.offFieldContext === undefined) {
    return career;
  }
  const context = career.phase.matchup.offFieldContext;
  if (context.academicRestrictionGamesBefore === 0) return career;
  const academics = career.offFieldCareerState.academics;
  if (
    academics.bootstrapStatus !== 'ACTIVE' ||
    academics.restrictionGamesRemaining !== context.academicRestrictionGamesBefore
  ) {
    return career;
  }
  const evidence: AcademicGameRestrictionEvidenceV1 = {
    model: 'academic_game_restriction_v1',
    gameId: career.phase.matchup.gameId,
    weekIndex: career.weekIndex,
    restrictionGamesBefore: context.academicRestrictionGamesBefore,
    restrictionGamesAfter: context.academicRestrictionGamesAfter,
  };
  return {
    ...career,
    offFieldCareerState: {
      ...career.offFieldCareerState,
      academics: {
        ...academics,
        restrictionGamesRemaining: context.academicRestrictionGamesAfter,
        lastGameRestriction: evidence,
        gameRestrictionHistory: [...academics.gameRestrictionHistory, evidence],
      },
    },
  };
}

export function prepareSeasonGame(
  session: CareerSession,
  mechanics: SeasonGameMechanics,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  const calendar = activeCalendar(session);
  if (
    calendar === null ||
    calendar.stage !== 'REGULAR_SEASON' ||
    session.career.phase.type !== 'WEEK_END' ||
    session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    session.career.seasonCareerState.eventState.lastSelection?.weekIndex !==
      session.career.weekIndex ||
    session.career.seasonCareerState.injuryState.lastAssessment?.weekIndex !==
      session.career.weekIndex ||
    session.career.seasonCareerState.injuryState.lastAvailability?.weekIndex !==
      session.career.weekIndex
  ) {
    return failure(session, 'season.invalid_phase');
  }
  const fixture = playerFixture(session, calendar);
  if (fixture === null || session.career.programId === null) {
    return failure(session, 'season.missing_player_fixture');
  }
  const playerProfile = calendar.definition.programProfiles.find(
    ({ programId }) => programId === session.career.programId,
  );
  const opponentProgramId =
    fixture.homeProgramId === session.career.programId
      ? fixture.awayProgramId
      : fixture.homeProgramId;
  const opponentProfile = calendar.definition.programProfiles.find(
    ({ programId }) => programId === opponentProgramId,
  );
  if (playerProfile === undefined || opponentProfile === undefined) {
    return failure(session, 'season.invalid_definition');
  }
  const offFieldAvailability = deriveOffFieldGameAvailability(
    session.career,
    mechanics,
    currentInjuryOpportunityCap(session.career) ?? mechanics.tuning.maxKeySnapOpportunities,
  );
  if (offFieldAvailability === null) return failure(session, 'season.invalid_phase');
  const prepared = prepareScheduledGame(
    session.career,
    {
      gameId: `game_${fixture.id}` as GameId,
      isHome: fixture.homeProgramId === session.career.programId,
    },
    gameProfile(playerProfile),
    gameProfile(opponentProfile),
    mechanics.tuning,
    mechanics.familyDefinitions,
    mechanics.patternDefinitions,
    mechanics.skillDefinitions,
    offFieldAvailability,
  );
  if (!prepared.ok) return failure(session, 'season.game_command_failed');
  return success(session, {
    ...cloneSerializable(session),
    career: consumePreparedAcademicRestriction(prepared.career as CareerRun),
  });
}

function playerGameResult(
  session: CareerSession,
  fixture: SeasonFixtureMechanicsDefinition,
): PlayerSeasonGameResult | null {
  if (session.career.phase.type !== 'POST_GAME') return null;
  const summary = session.career.phase.summary;
  const programId = session.career.programId;
  if (
    programId === null ||
    summary.gameId !== `game_${fixture.id}` ||
    summary.playerProgramId !== programId ||
    summary.opponentProgramId !==
      (fixture.homeProgramId === programId ? fixture.awayProgramId : fixture.homeProgramId) ||
    summary.isHome !== (fixture.homeProgramId === programId)
  ) {
    return null;
  }
  const homeScore = summary.isHome ? summary.score.playerTeam : summary.score.opponent;
  const awayScore = summary.isHome ? summary.score.opponent : summary.score.playerTeam;
  return {
    fixtureId: fixture.id,
    model: 'player_game_v1',
    homeScore,
    awayScore,
    winnerProgramId: winnerProgramId(fixture, homeScore, awayScore),
    careerRngDrawCountBefore: summary.gameRngDrawCountBefore,
    careerRngDrawCountAfter: summary.gameRngDrawCountAfter,
  };
}

export function completeRegularSeasonRound(
  session: CareerSession,
  mechanics: SeasonWeekMechanics,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  const calendar = activeCalendar(session);
  if (
    calendar === null ||
    calendar.stage !== 'REGULAR_SEASON' ||
    session.career.phase.type !== 'POST_GAME'
  ) {
    return failure(session, 'season.invalid_phase');
  }
  if (session.world.revision === Number.MAX_SAFE_INTEGER) {
    return failure(session, 'season.revision_exhausted');
  }
  const round = currentRegularSeasonRound(calendar);
  const playerRoundFixture = playerFixture(session, calendar);
  if (round === undefined || playerRoundFixture === null) {
    return failure(session, 'season.missing_player_fixture');
  }
  const savedPlayerResult = playerGameResult(session, playerRoundFixture);
  if (savedPlayerResult === null) return failure(session, 'season.matchup_mismatch');

  const advanced = advanceDevelopmentWeek(
    session.career,
    mechanics.developmentWeekConfig,
    mechanics.skillDefinitions,
    mechanics.weeklyActionDefinitions,
  );
  if (!advanced.ok) return failure(session, weeklyFailureReason(advanced.reason));

  const profileByProgramId = new Map(
    calendar.definition.programProfiles.map((profile) => [profile.programId, profile]),
  );
  const resultByFixtureId = new Map<string, AggregateSeasonGameResult | PlayerSeasonGameResult>([
    [playerRoundFixture.id, savedPlayerResult],
  ]);
  let nextRng = restoreRngState(session.world.rng);
  try {
    for (const fixture of [...round.fixtures].sort((left, right) =>
      compareCodeUnits(left.id, right.id),
    )) {
      if (fixture.id === playerRoundFixture.id) continue;
      const homeProfile = profileByProgramId.get(fixture.homeProgramId);
      const awayProfile = profileByProgramId.get(fixture.awayProgramId);
      if (homeProfile === undefined || awayProfile === undefined) {
        return failure(session, 'season.invalid_definition');
      }
      const simulated = simulateAggregateSeasonGame(fixture, homeProfile, awayProfile, nextRng);
      resultByFixtureId.set(fixture.id, simulated.result);
      nextRng = simulated.nextRng;
    }
  } catch {
    return failure(session, 'season.rng_exhausted');
  }

  const completedRegularSeasonRoundCount = calendar.completedRegularSeasonRoundCount + 1;
  const regularSeasonResults = calendar.regularSeasonResults.map((roundState, roundIndex) =>
    roundIndex === calendar.completedRegularSeasonRoundCount
      ? {
          roundId: roundState.roundId,
          fixtureResults: round.fixtures.map(
            (fixture) => resultByFixtureId.get(fixture.id) ?? null,
          ),
        }
      : cloneSerializable(roundState),
  );
  const tables = deriveSeasonTables(calendar.definition, regularSeasonResults);
  return success(session, {
    ...cloneSerializable(session),
    career: recordActiveSeasonProgress(
      advanceInjuryRecovery(advanced.career),
      session.career.phase.summary,
    ),
    world: {
      ...cloneSerializable(session.world),
      rng: nextRng,
      revision: session.world.revision + 1,
      calendar: {
        ...cloneSerializable(calendar),
        stage:
          completedRegularSeasonRoundCount === calendar.definition.regularSeasonRounds.length
            ? 'POSTSEASON'
            : 'REGULAR_SEASON',
        completedRegularSeasonRoundCount,
        regularSeasonResults,
        programRecords: tables.programRecords,
        standings: tables.standings,
      },
    },
  });
}

function postseasonFixture(
  id: string,
  homeProgramId: SeasonFixtureMechanicsDefinition['homeProgramId'],
  awayProgramId: SeasonFixtureMechanicsDefinition['awayProgramId'],
): SeasonFixtureMechanicsDefinition {
  return {
    id: `season_fixture_postseason_${id}`,
    homeProgramId,
    awayProgramId,
    spotlight: true,
  };
}

function wrapPostseasonResult(
  fixture: SeasonFixtureMechanicsDefinition,
  result: AggregateSeasonGameResult | PlayerSeasonGameResult,
): PostseasonGameResult {
  const usedHigherSeedTiebreak = result.winnerProgramId === null;
  return {
    result,
    advancingProgramId: result.winnerProgramId ?? fixture.homeProgramId,
    usedHigherSeedTiebreak,
  };
}

function simulatePostseasonFixture(
  fixture: SeasonFixtureMechanicsDefinition,
  profileByProgramId: ReadonlyMap<string, SeasonProgramMechanicsProfile>,
  rng: RngState,
): { readonly game: PostseasonGameResult; readonly nextRng: RngState } {
  const homeProfile = profileByProgramId.get(fixture.homeProgramId);
  const awayProfile = profileByProgramId.get(fixture.awayProgramId);
  if (homeProfile === undefined || awayProfile === undefined) {
    throw new TypeError('season_postseason.missing_profile');
  }
  const simulated = simulateAggregateSeasonGame(fixture, homeProfile, awayProfile, rng);
  return {
    game: wrapPostseasonResult(fixture, simulated.result),
    nextRng: simulated.nextRng,
  };
}

function createSemifinalRound(
  calendar: ActiveSeasonCalendar,
  qualifiers: readonly [
    SeasonFixtureMechanicsDefinition['homeProgramId'],
    SeasonFixtureMechanicsDefinition['homeProgramId'],
    SeasonFixtureMechanicsDefinition['homeProgramId'],
    SeasonFixtureMechanicsDefinition['homeProgramId'],
  ],
): PostseasonRoundState {
  const fixtures = calendar.definition.postseason.semifinalMatchups.map((matchup, index) =>
    postseasonFixture(
      `semifinal_${index + 1}`,
      qualifiers[matchup.homeSeed - 1]!,
      qualifiers[matchup.awaySeed - 1]!,
    ),
  );
  return {
    roundId: 'postseason_round_semifinal',
    fixtures,
    fixtureResults: fixtures.map(() => null),
  };
}

function createFinalRound(
  qualifiers: readonly string[],
  semifinalResults: readonly PostseasonGameResult[],
): PostseasonRoundState {
  const winners = semifinalResults.map(({ advancingProgramId }) => advancingProgramId);
  const seedByProgramId = new Map(qualifiers.map((programId, index) => [programId, index + 1]));
  winners.sort(
    (left, right) =>
      (seedByProgramId.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (seedByProgramId.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
  const fixture = postseasonFixture('final_1', winners[0]!, winners[1]!);
  return {
    roundId: 'postseason_round_final',
    fixtures: [fixture],
    fixtureResults: [null],
  };
}

function completePostseasonState(
  qualifiers: ActivePostseasonState['qualifierProgramIds'],
  rounds: ActivePostseasonState['rounds'],
  playerProgramId: SeasonFixtureMechanicsDefinition['homeProgramId'],
  playerRegularSeasonRank: number,
): CompletePostseasonState {
  const finalResult = rounds[1].fixtureResults[0];
  if (finalResult === null || finalResult === undefined) {
    throw new TypeError('season_postseason.missing_final_result');
  }
  const playerPostseasonSeed = qualifiers.indexOf(playerProgramId) + 1;
  const playerQualified = playerPostseasonSeed > 0;
  const semifinalResult = rounds[0].fixtureResults.find(
    (game, index) =>
      game !== null &&
      (rounds[0].fixtures[index]?.homeProgramId === playerProgramId ||
        rounds[0].fixtures[index]?.awayProgramId === playerProgramId),
  );
  const playerOutcomeId = !playerQualified
    ? 'season_outcome_regular_season_complete'
    : finalResult.advancingProgramId === playerProgramId
      ? 'season_outcome_champion'
      : rounds[1].fixtures[0]?.homeProgramId === playerProgramId ||
          rounds[1].fixtures[0]?.awayProgramId === playerProgramId
        ? 'season_outcome_runner_up'
        : semifinalResult !== undefined
          ? 'season_outcome_semifinal_exit'
          : 'season_outcome_regular_season_complete';
  return {
    type: 'COMPLETE',
    qualifierProgramIds: qualifiers,
    rounds,
    championProgramId: finalResult.advancingProgramId,
    playerOutcomeId,
    playerRegularSeasonRank,
    playerPostseasonSeed: playerQualified ? playerPostseasonSeed : null,
  };
}

export function initializePostseason(session: CareerSession): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  const calendar = activeCalendar(session);
  if (
    calendar === null ||
    calendar.stage !== 'POSTSEASON' ||
    calendar.postseason.type !== 'PENDING' ||
    session.career.phase.type !== 'PLAN_ACTIONS' ||
    session.career.programId === null ||
    session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(session, 'season.invalid_phase');
  }
  if (session.world.revision === Number.MAX_SAFE_INTEGER) {
    return failure(session, 'season.revision_exhausted');
  }
  const qualifiers = calendar.standings
    .slice(0, calendar.definition.postseason.qualifierCount)
    .map(({ programId }) => programId) as unknown as ActivePostseasonState['qualifierProgramIds'];
  const semifinalRound = createSemifinalRound(calendar, qualifiers);
  const emptyFinalRound: PostseasonRoundState = {
    roundId: 'postseason_round_final',
    fixtures: [],
    fixtureResults: [],
  };
  let nextRng = restoreRngState(session.world.rng);
  let postseason: ActivePostseasonState | CompletePostseasonState = {
    type: 'ACTIVE',
    qualifierProgramIds: qualifiers,
    currentRoundIndex: 0,
    rounds: [semifinalRound, emptyFinalRound],
  };
  if (!qualifiers.includes(session.career.programId)) {
    try {
      const profiles = new Map(
        calendar.definition.programProfiles.map((profile) => [profile.programId, profile]),
      );
      const semifinalResults: PostseasonGameResult[] = [];
      for (const fixture of semifinalRound.fixtures) {
        const simulated = simulatePostseasonFixture(fixture, profiles, nextRng);
        semifinalResults.push(simulated.game);
        nextRng = simulated.nextRng;
      }
      const finalRound = createFinalRound(qualifiers, semifinalResults);
      const simulatedFinal = simulatePostseasonFixture(finalRound.fixtures[0]!, profiles, nextRng);
      nextRng = simulatedFinal.nextRng;
      const rounds = [
        { ...semifinalRound, fixtureResults: semifinalResults },
        { ...finalRound, fixtureResults: [simulatedFinal.game] },
      ] as const;
      const regularRank =
        calendar.standings.find(({ programId }) => programId === session.career.programId)?.rank ??
        12;
      postseason = completePostseasonState(
        qualifiers,
        rounds,
        session.career.programId,
        regularRank,
      );
    } catch {
      return failure(session, 'season.rng_exhausted');
    }
  }
  return success(session, {
    ...cloneSerializable(session),
    world: {
      ...cloneSerializable(session.world),
      rng: nextRng,
      revision: session.world.revision + 1,
      calendar: { ...cloneSerializable(calendar), postseason },
    },
  });
}

function activePostseasonPlayerFixture(
  session: CareerSession,
  calendar: ActiveSeasonCalendar,
): SeasonFixtureMechanicsDefinition | null {
  if (calendar.postseason.type !== 'ACTIVE' || session.career.programId === null) return null;
  const round = calendar.postseason.rounds[calendar.postseason.currentRoundIndex];
  return (
    round.fixtures.find(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === session.career.programId || awayProgramId === session.career.programId,
    ) ?? null
  );
}

export function preparePostseasonGame(
  session: CareerSession,
  mechanics: SeasonGameMechanics,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  const calendar = activeCalendar(session);
  if (
    calendar === null ||
    calendar.stage !== 'POSTSEASON' ||
    calendar.postseason.type !== 'ACTIVE' ||
    session.career.phase.type !== 'WEEK_END' ||
    session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    session.career.seasonCareerState.eventState.lastSelection?.weekIndex !==
      session.career.weekIndex ||
    session.career.seasonCareerState.injuryState.lastAssessment?.weekIndex !==
      session.career.weekIndex ||
    session.career.seasonCareerState.injuryState.lastAvailability?.weekIndex !==
      session.career.weekIndex
  ) {
    return failure(session, 'season.invalid_phase');
  }
  const fixture = activePostseasonPlayerFixture(session, calendar);
  if (fixture === null || session.career.programId === null) {
    return failure(session, 'season.missing_player_fixture');
  }
  const playerProfile = calendar.definition.programProfiles.find(
    ({ programId }) => programId === session.career.programId,
  );
  const opponentProgramId =
    fixture.homeProgramId === session.career.programId
      ? fixture.awayProgramId
      : fixture.homeProgramId;
  const opponentProfile = calendar.definition.programProfiles.find(
    ({ programId }) => programId === opponentProgramId,
  );
  if (playerProfile === undefined || opponentProfile === undefined) {
    return failure(session, 'season.invalid_definition');
  }
  const offFieldAvailability = deriveOffFieldGameAvailability(
    session.career,
    mechanics,
    currentInjuryOpportunityCap(session.career) ?? mechanics.tuning.maxKeySnapOpportunities,
  );
  if (offFieldAvailability === null) return failure(session, 'season.invalid_phase');
  const prepared = prepareScheduledGame(
    session.career,
    {
      gameId: `game_${fixture.id}` as GameId,
      isHome: fixture.homeProgramId === session.career.programId,
    },
    gameProfile(playerProfile),
    gameProfile(opponentProfile),
    mechanics.tuning,
    mechanics.familyDefinitions,
    mechanics.patternDefinitions,
    mechanics.skillDefinitions,
    offFieldAvailability,
  );
  if (!prepared.ok) return failure(session, 'season.game_command_failed');
  return success(session, {
    ...cloneSerializable(session),
    career: consumePreparedAcademicRestriction(prepared.career as CareerRun),
  });
}

export function completePostseasonRound(
  session: CareerSession,
  mechanics: SeasonWeekMechanics,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  const calendar = activeCalendar(session);
  if (
    calendar === null ||
    calendar.stage !== 'POSTSEASON' ||
    calendar.postseason.type !== 'ACTIVE' ||
    session.career.phase.type !== 'POST_GAME' ||
    session.career.programId === null
  ) {
    return failure(session, 'season.invalid_phase');
  }
  if (session.world.revision === Number.MAX_SAFE_INTEGER) {
    return failure(session, 'season.revision_exhausted');
  }
  const fixture = activePostseasonPlayerFixture(session, calendar);
  if (fixture === null) return failure(session, 'season.missing_player_fixture');
  const savedPlayerResult = playerGameResult(session, fixture);
  if (savedPlayerResult === null) return failure(session, 'season.matchup_mismatch');
  const advanced = advanceDevelopmentWeek(
    session.career,
    mechanics.developmentWeekConfig,
    mechanics.skillDefinitions,
    mechanics.weeklyActionDefinitions,
  );
  if (!advanced.ok) return failure(session, weeklyFailureReason(advanced.reason));

  const postseason = calendar.postseason;
  const currentRound = postseason.rounds[postseason.currentRoundIndex];
  const profiles = new Map(
    calendar.definition.programProfiles.map((profile) => [profile.programId, profile]),
  );
  let nextRng = restoreRngState(session.world.rng);
  const currentResults: PostseasonGameResult[] = [];
  try {
    for (const currentFixture of currentRound.fixtures) {
      if (currentFixture.id === fixture.id) {
        currentResults.push(wrapPostseasonResult(currentFixture, savedPlayerResult));
      } else {
        const simulated = simulatePostseasonFixture(currentFixture, profiles, nextRng);
        currentResults.push(simulated.game);
        nextRng = simulated.nextRng;
      }
    }
  } catch {
    return failure(session, 'season.rng_exhausted');
  }

  let nextPostseason: ActivePostseasonState | CompletePostseasonState;
  if (postseason.currentRoundIndex === 0) {
    const semifinalRound = { ...currentRound, fixtureResults: currentResults };
    const finalRound = createFinalRound(postseason.qualifierProgramIds, currentResults);
    const playerAdvanced = currentResults.some(
      ({ advancingProgramId }) => advancingProgramId === session.career.programId,
    );
    if (playerAdvanced) {
      nextPostseason = {
        type: 'ACTIVE',
        qualifierProgramIds: postseason.qualifierProgramIds,
        currentRoundIndex: 1,
        rounds: [semifinalRound, finalRound],
      };
    } else {
      try {
        const simulatedFinal = simulatePostseasonFixture(
          finalRound.fixtures[0]!,
          profiles,
          nextRng,
        );
        nextRng = simulatedFinal.nextRng;
        const rounds = [
          semifinalRound,
          { ...finalRound, fixtureResults: [simulatedFinal.game] },
        ] as const;
        const regularRank =
          calendar.standings.find(({ programId }) => programId === session.career.programId)
            ?.rank ?? 12;
        nextPostseason = completePostseasonState(
          postseason.qualifierProgramIds,
          rounds,
          session.career.programId,
          regularRank,
        );
      } catch {
        return failure(session, 'season.rng_exhausted');
      }
    }
  } else {
    const finalRound = { ...currentRound, fixtureResults: currentResults };
    const rounds = [postseason.rounds[0], finalRound] as const;
    const regularRank =
      calendar.standings.find(({ programId }) => programId === session.career.programId)?.rank ??
      12;
    nextPostseason = completePostseasonState(
      postseason.qualifierProgramIds,
      rounds,
      session.career.programId,
      regularRank,
    );
  }

  return success(session, {
    ...cloneSerializable(session),
    career: recordActiveSeasonProgress(
      advanceInjuryRecovery(advanced.career),
      session.career.phase.summary,
    ),
    world: {
      ...cloneSerializable(session.world),
      rng: nextRng,
      revision: session.world.revision + 1,
      calendar: { ...cloneSerializable(calendar), postseason: nextPostseason },
    },
  });
}

/** Internal shared ranking for season and versioned alumni projection. */
export function compareBestGame(
  left: NonNullable<CareerRun['gameCareerState']['lastGame']>,
  right: NonNullable<CareerRun['gameCareerState']['lastGame']>,
): number {
  return (
    right.performanceGradeScore - left.performanceGradeScore ||
    right.statLine.receivingYards - left.statLine.receivingYards ||
    right.statLine.receivingTouchdowns - left.statLine.receivingTouchdowns ||
    compareCodeUnits(left.gameId, right.gameId)
  );
}

export function projectCompletedSeasonSummary(
  session: CareerSession,
  statisticsScope: 'historical-career' | 'current-season' = 'historical-career',
): CompletedSeasonSummary | null {
  const calendar = activeCalendar(session);
  if (
    calendar === null ||
    calendar.postseason.type !== 'COMPLETE' ||
    session.career.programId === null ||
    session.career.programContext === null ||
    session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE'
  ) {
    return null;
  }
  const careerState = session.career.seasonCareerState;
  const record = calendar.programRecords.find(
    ({ programId }) => programId === session.career.programId,
  );
  if (record === undefined) return null;
  const gameState =
    statisticsScope === 'historical-career'
      ? session.career.gameCareerState
      : careerState.gameSummaries.reduce(
          (total, game) => ({
            gamesPlayed: total.gamesPlayed + 1,
            wins: total.wins + (game.resultId === 'game_result_win' ? 1 : 0),
            losses: total.losses + (game.resultId === 'game_result_loss' ? 1 : 0),
            ties: total.ties + (game.resultId === 'game_result_tie' ? 1 : 0),
            cumulativeGradeScore: total.cumulativeGradeScore + game.performanceGradeScore,
            cumulativeStats: {
              targets: total.cumulativeStats.targets + game.statLine.targets,
              receptions: total.cumulativeStats.receptions + game.statLine.receptions,
              receivingYards: total.cumulativeStats.receivingYards + game.statLine.receivingYards,
              receivingTouchdowns:
                total.cumulativeStats.receivingTouchdowns + game.statLine.receivingTouchdowns,
              drops: total.cumulativeStats.drops + game.statLine.drops,
              turnovers: total.cumulativeStats.turnovers + game.statLine.turnovers,
            },
          }),
          {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            cumulativeGradeScore: 0,
            cumulativeStats: {
              targets: 0,
              receptions: 0,
              receivingYards: 0,
              receivingTouchdowns: 0,
              drops: 0,
              turnovers: 0,
            },
          },
        );
  const bestGame = [...careerState.gameSummaries].sort(compareBestGame)[0] ?? null;
  const injuryWeeksMissed = careerState.injuryState.history.reduce(
    (total, injury) =>
      total +
      (injury.defaultAvailabilityId === 'injury_availability_out'
        ? injury.originalDurationWeeks
        : 0),
    0,
  );
  return deepFreeze({
    seasonId: calendar.definition.id,
    outcomeId: calendar.postseason.playerOutcomeId,
    regularSeasonRank: calendar.postseason.playerRegularSeasonRank,
    postseasonSeed: calendar.postseason.playerPostseasonSeed,
    programWins: record.wins,
    programLosses: record.losses,
    programTies: record.ties,
    gamesPlayed: gameState.gamesPlayed,
    playerWins: gameState.wins,
    playerLosses: gameState.losses,
    playerTies: gameState.ties,
    cumulativeStats: cloneSerializable(gameState.cumulativeStats),
    averagePerformanceGrade:
      gameState.gamesPlayed === 0
        ? 0
        : Math.round(gameState.cumulativeGradeScore / gameState.gamesPlayed),
    bestGame: cloneSerializable(bestGame),
    roleHistory: cloneSerializable(careerState.roleHistory),
    finalDepthRank: session.career.programContext.projection.rank,
    finalRoleId: session.career.programContext.projection.roleId,
    ownedSkillIds:
      careerState.bootstrapStatus === 'ACTIVE'
        ? session.career.player.skillState.acquisitions.map(
            ({ selectedSkillId }) => selectedSkillId,
          )
        : [],
    equippedSkillIds: cloneSerializable(session.career.player.skillState.equippedSkillIds),
    injuryCount: careerState.injuryState.history.length,
    injuryWeeksMissed,
  });
}

export function enterSeasonReview(session: CareerSession): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  const summary = projectCompletedSeasonSummary(session);
  if (
    summary === null ||
    session.career.phase.type !== 'PLAN_ACTIONS' ||
    session.career.revision === Number.MAX_SAFE_INTEGER
  ) {
    return failure(session, 'season.invalid_phase');
  }
  return success(session, {
    ...cloneSerializable(session),
    career: {
      ...cloneSerializable(session.career),
      revision: session.career.revision + 1,
      phase: {
        type: 'SEASON_REVIEW',
        seasonId: summary.seasonId,
        outcomeId: summary.outcomeId,
      },
    },
  });
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function playerTransferAbility(career: CareerRun): number {
  const { physical, wr } = career.player.attributes;
  const ratings = [
    physical.attribute_speed.rating,
    physical.attribute_burst.rating,
    physical.attribute_agility.rating,
    physical.attribute_strength.rating,
    wr.attribute_wr_release.rating,
    wr.attribute_wr_route_running.rating,
    wr.attribute_wr_hands.rating,
    wr.attribute_wr_catch_in_traffic.rating,
  ];
  return Math.round(ratings.reduce((total, rating) => total + rating, 0) / ratings.length);
}

function validOffseasonProgramProfiles(
  session: CareerSession,
  profiles: readonly OffseasonProgramMechanicsProfile[],
  offenseStyles: ReadonlyMap<string, RecruitingOffenseStyleDefinition>,
  rotationPolicies: ReadonlyMap<string, RotationPolicyMechanicsDefinition>,
): boolean {
  if (profiles.length < 4 || profiles.length > 128) return false;
  const ids = new Set<string>();
  for (const profile of profiles) {
    if (
      !isProgramId(profile.programId) ||
      ids.has(profile.programId) ||
      !offenseStyles.has(profile.offenseStyleId) ||
      !offenseStyles.has(profile.schemeShiftOffenseStyleId) ||
      profile.offenseStyleId === profile.schemeShiftOffenseStyleId ||
      !rotationPolicies.has(profile.rotationPolicyId) ||
      !Number.isInteger(profile.roomTalentMean) ||
      profile.roomTalentMean < 35 ||
      profile.roomTalentMean > 90 ||
      ![
        profile.programOutlook,
        profile.playerDevelopment,
        profile.nilPower,
        profile.academics,
      ].every((value) => Number.isInteger(value) && value >= 0 && value <= 100)
    ) {
      return false;
    }
    ids.add(profile.programId);
  }
  if (session.career.programId === null || !ids.has(session.career.programId)) return false;
  if (session.world.calendar.type !== 'ACTIVE') return false;
  const seasonProgramIds = session.world.calendar.definition.programProfiles.map(
    ({ programId }) => programId,
  );
  return (
    seasonProgramIds.length === ids.size &&
    seasonProgramIds.every((programId) => ids.has(programId))
  );
}

function transferFactorScoreForRank(rank: number): number {
  return clampInteger(112 - rank * 12, 0, 100);
}

function selectTransferConfidence(informationScore: number, definitions: OffFieldMechanicsCatalog) {
  const tier = definitions.offseason.confidenceTiers.find(
    ({ minimumInformationScore }) => informationScore >= minimumInformationScore,
  );
  if (tier === undefined) throw new RangeError('Offseason confidence definitions are incomplete.');
  return tier;
}

function buildTransferOption(
  kind: TransferOptionProjectionV1['kind'],
  profile: OffseasonProgramMechanicsProfile,
  worldProjection: OffseasonProgramProjectionV1,
  projectedDepthRank: number,
  relationshipScore: number,
  informationScore: number,
  familiarityScore: number,
  career: CareerRun,
  definitions: OffFieldMechanicsCatalog,
  offenseStyles: ReadonlyMap<string, RecruitingOffenseStyleDefinition>,
  rotationPolicies: ReadonlyMap<string, RotationPolicyMechanicsDefinition>,
): TransferOptionProjectionV1 {
  const projectedStyleId = worldProjection.offenseStyleIdAfter;
  const style = offenseStyles.get(projectedStyleId);
  const policy = rotationPolicies.get(profile.rotationPolicyId);
  if (style === undefined || policy === undefined) {
    throw new RangeError('Offseason program projection references missing mechanics.');
  }
  const snapRange = policy.rankSnapRanges[projectedDepthRank - 1];
  if (snapRange === undefined) throw new RangeError('Offseason depth rank has no snap range.');
  const programOutlook = clampInteger(
    profile.programOutlook + worldProjection.departureRelief - worldProjection.incomingPressure,
    0,
    100,
  );
  const scores = {
    transfer_factor_role: transferFactorScoreForRank(projectedDepthRank),
    transfer_factor_snaps: Math.round((snapRange.minSnapPermille + snapRange.maxSnapPermille) / 20),
    transfer_factor_scheme_fit: style.schemeFitByArchetype[career.player.archetypeId],
    transfer_factor_development: profile.playerDevelopment,
    transfer_factor_program_outlook: programOutlook,
    transfer_factor_nil: profile.nilPower,
    transfer_factor_academics: profile.academics,
    transfer_factor_relationships: relationshipScore,
    transfer_factor_familiarity: familiarityScore,
  } as const;
  const factors = definitions.offseason.projectionFactors.map(
    ({ id, weightPermille }): TransferProjectionFactorEvidenceV1 => ({
      factorId: id,
      score: scores[id],
      weightPermille,
      contributionMilli: scores[id] * weightPermille,
    }),
  );
  const projectedScore = Math.round(
    factors.reduce((total, factor) => total + factor.contributionMilli, 0) / 1_000,
  );
  const confidence = selectTransferConfidence(informationScore, definitions);
  return {
    kind,
    programId: profile.programId,
    projectedDepthRank,
    projectedRoleId: depthRoleIdForRank(projectedDepthRank),
    projectedSnapMinPermille: snapRange.minSnapPermille,
    projectedSnapMaxPermille: snapRange.maxSnapPermille,
    informationScore,
    confidenceTierId: confidence.id,
    uncertaintyPoints: confidence.uncertaintyPoints,
    factors,
    projectedScore,
    projectedScoreMinimum: clampInteger(projectedScore - confidence.uncertaintyPoints, 0, 100),
    projectedScoreMaximum: clampInteger(projectedScore + confidence.uncertaintyPoints, 0, 100),
  };
}

/**
 * Freezes season one and creates the deterministic world/transfer projection used by the
 * subsequent offseason decision command. World churn and shortlist curation consume separate RNG streams.
 */
export function projectOffseason(
  session: CareerSession,
  mechanics: OffseasonProjectionMechanics,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  if (!isOffFieldMechanicsCatalog(mechanics.offFieldDefinitions)) {
    return failure(session, 'season.invalid_definition');
  }
  const offenseStyles = validateOffenseCatalog(mechanics.offenseStyleDefinitions);
  const rotationPolicies = validateRotationCatalog(mechanics.rotationPolicyDefinitions);
  if (
    offenseStyles === undefined ||
    rotationPolicies === undefined ||
    !validOffseasonProgramProfiles(
      session,
      mechanics.programProfiles,
      offenseStyles,
      rotationPolicies,
    )
  ) {
    return failure(session, 'season.invalid_definition');
  }
  const summary = projectCompletedSeasonSummary(session);
  const offField = session.career.offFieldCareerState;
  if (
    summary === null ||
    session.career.phase.type !== 'SEASON_REVIEW' ||
    session.career.programId === null ||
    offField.offseason.status !== 'NOT_STARTED' ||
    offField.academics.bootstrapStatus !== 'ACTIVE' ||
    offField.relationships.bootstrapStatus !== 'ACTIVE' ||
    !('bootstrapStatus' in offField.nil) ||
    offField.nil.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(session, 'season.invalid_phase');
  }
  const activeNil = offField.nil;
  if (
    offField.academics.nextCheckpointIndex !==
      mechanics.offFieldDefinitions.academics.checkpoints.length ||
    activeNil.pendingOffers.length !== 0 ||
    activeNil.activeObligation !== null
  ) {
    return failure(session, 'season.invalid_phase');
  }
  const profiles = [...mechanics.programProfiles].sort((left, right) =>
    compareCodeUnits(left.programId, right.programId),
  );
  const worldDrawsRequired = profiles.length * 3;
  if (
    session.career.revision === Number.MAX_SAFE_INTEGER ||
    session.world.revision === Number.MAX_SAFE_INTEGER
  ) {
    return failure(session, 'season.revision_exhausted');
  }
  if (
    session.world.rng.drawCount > Number.MAX_SAFE_INTEGER - worldDrawsRequired ||
    session.career.rng.drawCount >
      Number.MAX_SAFE_INTEGER - mechanics.offFieldDefinitions.offseason.transferShortlistSize ||
    offField.academics.termIndex === Number.MAX_SAFE_INTEGER
  ) {
    return failure(session, 'season.rng_exhausted');
  }

  let worldRng = restoreRngState(session.world.rng);
  const worldRngDrawCountBefore = worldRng.drawCount;
  const programProjections: OffseasonProgramProjectionV1[] = [];
  for (const profile of profiles) {
    const programDrawCountBefore = worldRng.drawCount;
    const coachRoll = nextInt(worldRng, 0, 1_000);
    worldRng = coachRoll.nextRng;
    let coachCursor = 0;
    const coachChange = mechanics.offFieldDefinitions.offseason.coachChanges.find((change) => {
      coachCursor += change.weight;
      return coachRoll.value < coachCursor;
    });
    if (coachChange === undefined) return failure(session, 'season.invalid_definition');
    const pressureMaximumInclusive =
      mechanics.offFieldDefinitions.offseason.pressureMaximumInclusive;
    const departure = nextInt(worldRng, 0, pressureMaximumInclusive + 1);
    worldRng = departure.nextRng;
    const incoming = nextInt(worldRng, 0, pressureMaximumInclusive + 1);
    worldRng = incoming.nextRng;
    programProjections.push({
      programId: profile.programId,
      coachChangeId: coachChange.id,
      offenseStyleIdBefore: profile.offenseStyleId,
      offenseStyleIdAfter: coachChange.changesScheme
        ? profile.schemeShiftOffenseStyleId
        : profile.offenseStyleId,
      roomTalentBefore: profile.roomTalentMean,
      departureRelief: departure.value,
      incomingPressure: incoming.value,
      roomTalentAfter: clampInteger(
        profile.roomTalentMean - departure.value + incoming.value,
        35,
        90,
      ),
      coachChangeTotalWeight: 1_000,
      coachChangeRoll: coachRoll.value,
      pressureMaximumInclusive,
      departureRoll: departure.value,
      incomingRoll: incoming.value,
      worldRngDrawCountBefore: programDrawCountBefore,
      worldRngDrawCountAfter: worldRng.drawCount,
    });
  }

  const profileById = new Map(profiles.map((profile) => [profile.programId, profile]));
  const projectionById = new Map(
    programProjections.map((projection) => [projection.programId, projection]),
  );
  const currentProgramProfile = profileById.get(session.career.programId);
  const currentProgramProjection = projectionById.get(session.career.programId);
  if (currentProgramProfile === undefined || currentProgramProjection === undefined) {
    return failure(session, 'season.invalid_definition');
  }
  const tuning = mechanics.offFieldDefinitions.offseason;
  const ability = playerTransferAbility(session.career);
  const relationshipScore = Math.round(
    offField.relationships.tracks.reduce((total, track) => total + track.value, 0) /
      offField.relationships.tracks.length,
  );
  const advisorInsightQuantity =
    activeNil.benefitStacks.find(
      ({ benefitId }) => benefitId === 'off_field_benefit_advisor_insight',
    )?.quantity ?? 0;
  const transferInformationScore = clampInteger(
    tuning.transferInformationBaseScore +
      Math.floor(session.career.player.state.brand / tuning.brandInformationDivisor) +
      advisorInsightQuantity * tuning.advisorInsightInformationBonus,
    0,
    100,
  );
  const projectedStayRank = clampInteger(
    summary.finalDepthRank +
      Math.floor(currentProgramProjection.incomingPressure / tuning.pressurePointsPerDepthRank) -
      Math.floor(currentProgramProjection.departureRelief / tuning.pressurePointsPerDepthRank),
    1,
    8,
  );
  const stayOption = buildTransferOption(
    'STAY',
    currentProgramProfile,
    currentProgramProjection,
    projectedStayRank,
    relationshipScore,
    100,
    clampInteger(tuning.relationshipResetValue + tuning.stayFamiliarityBonus, 0, 100),
    session.career,
    mechanics.offFieldDefinitions,
    offenseStyles,
    rotationPolicies,
  );

  let careerRng = restoreRngState(session.career.rng);
  const careerRngDrawCountBefore = careerRng.drawCount;
  const remainingProgramIds = profiles
    .map(({ programId }) => programId)
    .filter((programId) => programId !== session.career.programId);
  const shortlistSelections: TransferShortlistSelectionEvidenceV1[] = [];
  for (let selectionIndex = 0; selectionIndex < tuning.transferShortlistSize; selectionIndex += 1) {
    const candidateWeights = remainingProgramIds
      .map((programId) => {
        const profile = profileById.get(programId)!;
        const projection = projectionById.get(programId)!;
        const style = offenseStyles.get(projection.offenseStyleIdAfter)!;
        return {
          programId,
          weight: Math.max(
            1,
            style.schemeFitByArchetype[session.career.player.archetypeId] +
              profile.playerDevelopment +
              profile.programOutlook +
              profile.nilPower,
          ),
        };
      })
      .sort((left, right) => compareCodeUnits(left.programId, right.programId));
    const totalWeight = candidateWeights.reduce((total, candidate) => total + candidate.weight, 0);
    const drawBefore = careerRng.drawCount;
    const selection = nextInt(careerRng, 0, totalWeight);
    careerRng = selection.nextRng;
    let cursor = 0;
    const selected = candidateWeights.find((candidate) => {
      cursor += candidate.weight;
      return selection.value < cursor;
    });
    if (selected === undefined) return failure(session, 'season.invalid_definition');
    shortlistSelections.push({
      selectionIndex,
      candidateWeights,
      totalWeight,
      roll: selection.value,
      selectedProgramId: selected.programId,
      careerRngDrawCountBefore: drawBefore,
      careerRngDrawCountAfter: careerRng.drawCount,
    });
    remainingProgramIds.splice(remainingProgramIds.indexOf(selected.programId), 1);
  }

  const transferOptions = shortlistSelections.map(({ selectedProgramId }) => {
    const profile = profileById.get(selectedProgramId)!;
    const projection = projectionById.get(selectedProgramId)!;
    const projectedDepthRank = clampInteger(
      tuning.neutralTransferDepthRank +
        Math.round((projection.roomTalentAfter - ability) / tuning.pressurePointsPerDepthRank),
      1,
      8,
    );
    return buildTransferOption(
      'TRANSFER',
      profile,
      projection,
      projectedDepthRank,
      tuning.relationshipResetValue,
      transferInformationScore,
      tuning.transferFamiliarityScore,
      session.career,
      mechanics.offFieldDefinitions,
      offenseStyles,
      rotationPolicies,
    );
  });
  if (
    transferOptions.length !== 3 ||
    shortlistSelections.length !== 3 ||
    offField.academics.termIndex < 1
  ) {
    return failure(session, 'season.internal_invariant_failure');
  }

  const projectedSession: CareerSession = {
    ...cloneSerializable(session),
    career: {
      ...cloneSerializable(session.career),
      revision: session.career.revision + 1,
      rng: careerRng,
      seasonCareerState: {
        model: 'season_v1',
        bootstrapStatus: 'COMPLETE',
        seasonsCompleted: 1,
        activeSeasonId: null,
        lastCompletedSeason: summary,
      },
      offFieldCareerState: {
        ...cloneSerializable(offField),
        offseason: {
          model: 'offseason_v1',
          status: 'PROJECTED',
          completedDecisionCount: 0,
          lastDecision: null,
          completedSeasonId: summary.seasonId,
          completedSeasonIndex: 1,
          nextSeasonIndex: 2,
          academicTermIndexBefore: offField.academics.termIndex,
          academicTermIndexAfter: offField.academics.termIndex + 1,
          worldProjection: {
            model: 'offseason_world_projection_v1',
            programs: programProjections,
            worldRngDrawCountBefore,
            worldRngDrawCountAfter: worldRng.drawCount,
          },
          transferProjection: {
            model: 'offseason_transfer_projection_v1',
            stayOption,
            transferOptions: [transferOptions[0]!, transferOptions[1]!, transferOptions[2]!],
            shortlistSelections: [
              shortlistSelections[0]!,
              shortlistSelections[1]!,
              shortlistSelections[2]!,
            ],
            careerRngDrawCountBefore,
            careerRngDrawCountAfter: careerRng.drawCount,
          },
        },
      },
    },
    world: {
      ...cloneSerializable(session.world),
      revision: session.world.revision + 1,
      rng: worldRng,
      offseasonRngEvidence: {
        model: 'offseason_world_rng_v1',
        worldRngDrawCountBefore,
        worldRngDrawCountAfter: worldRng.drawCount,
      },
    },
  };
  return success(session, projectedSession);
}

/** Commits exactly one saved offseason option and rebuilds that program's projected WR room. */
export function decideOffseason(
  session: CareerSession,
  selectedProgramId: string,
  mechanics: OffseasonDecisionMechanics,
): SeasonCommandResult {
  if (!validateCareerSession(session).ok) return failure(session, 'season.invalid_session');
  if (!isOffFieldMechanicsCatalog(mechanics.offFieldDefinitions)) {
    return failure(session, 'season.invalid_definition');
  }
  const offenseStyles = validateOffenseCatalog(mechanics.offenseStyleDefinitions);
  const rotationPolicies = validateRotationCatalog(mechanics.rotationPolicyDefinitions);
  const programs =
    offenseStyles === undefined
      ? undefined
      : validateProgramCatalog(mechanics.programDefinitions, offenseStyles);
  if (
    offenseStyles === undefined ||
    rotationPolicies === undefined ||
    programs === undefined ||
    !validOffseasonProgramProfiles(
      session,
      mechanics.programProfiles,
      offenseStyles,
      rotationPolicies,
    ) ||
    !mechanics.programProfiles.every((profile) => {
      const program = programs.find(({ id }) => id === profile.programId);
      return (
        program !== undefined &&
        program.offenseStyleId === profile.offenseStyleId &&
        program.rotationPolicyId === profile.rotationPolicyId &&
        program.roomProfile.talentMean === profile.roomTalentMean
      );
    })
  ) {
    return failure(session, 'season.invalid_definition');
  }
  const offField = session.career.offFieldCareerState;
  if (
    session.career.phase.type !== 'SEASON_REVIEW' ||
    session.career.seasonCareerState.bootstrapStatus !== 'COMPLETE' ||
    session.career.programId === null ||
    session.career.programContext === null ||
    offField.offseason.status !== 'PROJECTED' ||
    offField.relationships.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(session, 'season.invalid_phase');
  }
  const projection = offField.offseason;
  const currentProgramId = session.career.programId;
  const selectedOption =
    projection.transferProjection.stayOption.programId === selectedProgramId
      ? projection.transferProjection.stayOption
      : projection.transferProjection.transferOptions.find(
          (option) => option.programId === selectedProgramId,
        );
  if (selectedOption === undefined || !isProgramId(selectedProgramId)) {
    return failure(session, 'season.invalid_phase');
  }
  const kind = selectedOption.kind;
  if (
    (kind === 'STAY' && selectedProgramId !== currentProgramId) ||
    (kind === 'TRANSFER' && selectedProgramId === currentProgramId)
  ) {
    return failure(session, 'season.invalid_phase');
  }
  if (session.career.revision === Number.MAX_SAFE_INTEGER) {
    return failure(session, 'season.revision_exhausted');
  }

  const selectedProgramProjection = projection.worldProjection.programs.find(
    ({ programId }) => programId === selectedProgramId,
  );
  const selectedProfile = mechanics.programProfiles.find(
    ({ programId }) => programId === selectedProgramId,
  );
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);
  const coachChange = mechanics.offFieldDefinitions.offseason.coachChanges.find(
    ({ id }) => id === selectedProgramProjection?.coachChangeId,
  );
  const playerEvaluation = session.career.programContext.evaluations.find(
    ({ participantId }) => participantId === session.career.player.id,
  );
  if (
    selectedProgramProjection === undefined ||
    selectedProfile === undefined ||
    selectedProgram === undefined ||
    coachChange === undefined ||
    playerEvaluation === undefined
  ) {
    return failure(session, 'season.invalid_definition');
  }

  const tuning = mechanics.offFieldDefinitions.offseason;
  const coachTrustBefore = session.career.player.state.coachTrust;
  const coachTrustRetentionPermille =
    kind === 'STAY'
      ? coachChange.coachTrustRetentionPermille
      : tuning.transferCoachTrustRetentionPermille;
  const coachTrustBaseline =
    kind === 'STAY'
      ? 0
      : clampInteger(
          selectedProgram.roomProfile.trustBase + selectedProgram.initialCoachTrustBonus,
          COACH_TRUST_BOUNDS.min,
          COACH_TRUST_BOUNDS.max,
        );
  const coachTrustRequestedAfter =
    coachTrustBaseline + Math.round((coachTrustBefore * coachTrustRetentionPermille) / 1_000);
  const coachTrustAfter = clampInteger(
    coachTrustRequestedAfter,
    COACH_TRUST_BOUNDS.min,
    COACH_TRUST_BOUNDS.max,
  );
  const playerPracticeFormBefore = session.career.programContext.playerPracticeForm;
  const playerPracticeFormAfter =
    kind === 'STAY' ? playerPracticeFormBefore : selectedProgram.roomProfile.practiceFormBase;
  const relationshipResetActors = new Set(
    kind === 'STAY'
      ? coachChange.resetRelationshipActorIds
      : offField.relationships.tracks.map(({ actorId }) => actorId),
  );
  const relationshipTransitions = offField.relationships.tracks.map((track) => {
    const resetToNeutral = relationshipResetActors.has(track.actorId);
    return {
      actorId: track.actorId,
      valueBefore: track.value,
      resetToNeutral,
      resetValue: resetToNeutral ? tuning.relationshipResetValue : null,
      valueAfter: resetToNeutral ? tuning.relationshipResetValue : track.value,
    };
  });
  const generatedRoom = generateProgramRoomContext(
    session.career.player,
    session.career.rng,
    mechanics.programDefinitions,
    mechanics.offenseStyleDefinitions,
    mechanics.rotationPolicyDefinitions,
    mechanics.rosterNamePool,
    {
      programId: selectedProgram.id,
      offenseStyleId: selectedProgramProjection.offenseStyleIdAfter,
      roomTalentMean: selectedProgramProjection.roomTalentAfter,
      playerCoachTrust: coachTrustAfter,
      playerPracticeForm: playerPracticeFormAfter,
      playerExperienceReadiness: playerEvaluation.components.experienceReadiness,
    },
  );
  if (generatedRoom === undefined) {
    return session.career.rng.drawCount > Number.MAX_SAFE_INTEGER - 35
      ? failure(session, 'season.rng_exhausted')
      : failure(session, 'season.invalid_definition');
  }

  const currentHistoryEntry = offField.programHistory.at(-1);
  if (
    currentHistoryEntry === undefined ||
    currentHistoryEntry.programId !== currentProgramId ||
    currentHistoryEntry.endSeasonIndex !== null
  ) {
    return failure(session, 'season.invalid_session');
  }
  const programHistory =
    kind === 'STAY'
      ? cloneSerializable(offField.programHistory)
      : [
          ...cloneSerializable(offField.programHistory.slice(0, -1)),
          {
            ...cloneSerializable(currentHistoryEntry),
            endSeasonIndex: projection.completedSeasonIndex - 1,
          },
          {
            programId: selectedProgram.id,
            startSeasonIndex: projection.nextSeasonIndex - 1,
            endSeasonIndex: null,
          },
        ];
  const actualProjection = generatedRoom.context.projection;
  const decision: OffseasonDecisionEvidenceV1 = {
    model: 'offseason_decision_v1',
    kind,
    previousProgramId: currentProgramId,
    selectedProgramId: selectedProgram.id,
    selectedOption: cloneSerializable(selectedOption),
    coachChangeId: selectedProgramProjection.coachChangeId,
    offenseStyleIdBefore: selectedProgramProjection.offenseStyleIdBefore,
    offenseStyleIdAfter: selectedProgramProjection.offenseStyleIdAfter,
    rotationPolicyIdAfter: selectedProfile.rotationPolicyId,
    roomTalentMeanAfter: selectedProgramProjection.roomTalentAfter,
    coachTrustBefore,
    coachTrustRetentionPermille,
    coachTrustBaseline,
    coachTrustRequestedAfter,
    coachTrustAfter,
    playerPracticeFormBefore,
    playerPracticeFormAfter,
    playerExperienceReadiness: playerEvaluation.components.experienceReadiness,
    relationshipTransitions,
    rosterRngDrawCountBefore: generatedRoom.rosterRngDrawCountBefore,
    rosterRngDrawCountAfter: generatedRoom.rosterRngDrawCountAfter,
    actualDepthRank: actualProjection.rank,
    actualRoleId: actualProjection.roleId,
    actualSnapMinPermille: actualProjection.minSnapPermille,
    actualSnapMaxPermille: actualProjection.maxSnapPermille,
  };
  const nextSession: CareerSession = {
    ...cloneSerializable(session),
    career: {
      ...cloneSerializable(session.career),
      revision: session.career.revision + 1,
      rng: generatedRoom.rng,
      programId: selectedProgram.id,
      player: {
        ...cloneSerializable(session.career.player),
        state: {
          ...cloneSerializable(session.career.player.state),
          coachTrust: coachTrustAfter,
        },
      },
      programContext: generatedRoom.context,
      offFieldCareerState: {
        ...cloneSerializable(offField),
        relationships: {
          ...cloneSerializable(offField.relationships),
          tracks: relationshipTransitions.map(({ actorId, valueAfter }) => ({
            actorId,
            value: valueAfter,
          })),
        },
        offseason: {
          ...cloneSerializable(projection),
          status: 'DECIDED',
          completedDecisionCount: 1,
          lastDecision: decision,
        },
        programHistory,
      },
    },
  };
  return success(session, nextSession);
}

function alumniIdForCareer(careerId: string): `alumni_${string}` {
  return `alumni_${careerId}`;
}

export function completeCareer(
  session: CareerSession,
  meta: MetaProfileV1,
  contentVersion: number,
): CompleteCareerResult {
  if (!validateCareerSession(session).ok) {
    return Object.freeze({ ok: false, session, meta, reason: 'season.invalid_session' });
  }
  if (
    !validateMetaProfileV1(meta).ok ||
    !Number.isSafeInteger(contentVersion) ||
    contentVersion < 1
  ) {
    return Object.freeze({ ok: false, session, meta, reason: 'season.invalid_meta' });
  }
  const summary = projectCompletedSeasonSummary(session);
  if (
    summary === null ||
    session.career.phase.type !== 'SEASON_REVIEW' ||
    session.career.programId === null ||
    session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE'
  ) {
    return Object.freeze({ ok: false, session, meta, reason: 'season.invalid_phase' });
  }
  if (
    session.career.revision === Number.MAX_SAFE_INTEGER ||
    meta.revision === Number.MAX_SAFE_INTEGER
  ) {
    return Object.freeze({ ok: false, session, meta, reason: 'season.revision_exhausted' });
  }
  const alumniId = alumniIdForCareer(session.career.id);
  if (meta.alumni.some((alumnus) => alumnus.careerId === session.career.id)) {
    return Object.freeze({ ok: false, session, meta, reason: 'season.duplicate_alumni' });
  }
  const careerState = session.career.seasonCareerState;
  const firstRole = careerState.roleHistory[0]!;
  const injuryOutcomeIds = careerState.injuryState.history.map(({ outcomeId }) => outcomeId);
  const alumnus: AlumniRecordV1 = deepFreeze({
    schemaVersion: 1,
    alumniId,
    careerId: session.career.id,
    playerId: session.career.player.id,
    displayName: session.career.player.displayName,
    appearance: cloneSerializable(session.career.player.appearance),
    positionId: 'position_wr',
    archetypeId: session.career.player.archetypeId,
    recruitingBackgroundId: session.career.player.recruitingBackgroundId,
    personalityTraitIds: cloneSerializable(session.career.player.personalityTraitIds),
    programIds: [session.career.programId],
    seasonsPlayed: 1,
    careerStats: cloneSerializable(summary.cumulativeStats),
    gamesPlayed: summary.gamesPlayed,
    wins: summary.playerWins,
    losses: summary.playerLosses,
    ties: summary.playerTies,
    averagePerformanceGrade: summary.averagePerformanceGrade,
    bestGame: cloneSerializable(summary.bestGame),
    startingDepthRank: firstRole.rank,
    startingRoleId: firstRole.roleId,
    finalDepthRank: summary.finalDepthRank,
    finalRoleId: summary.finalRoleId,
    ownedSkillIds: cloneSerializable(summary.ownedSkillIds) as AlumniRecordV1['ownedSkillIds'],
    equippedSkillIds: cloneSerializable(
      summary.equippedSkillIds,
    ) as AlumniRecordV1['equippedSkillIds'],
    injuryOutcomeIds,
    injuryWeeksMissed: summary.injuryWeeksMissed,
    seasonOutcomeId: summary.outcomeId,
    regularSeasonRank: summary.regularSeasonRank,
    postseasonSeed: summary.postseasonSeed,
    championshipCount: summary.outcomeId === 'season_outcome_champion' ? 1 : 0,
    endingId: 'career_ending_one_season_complete',
    careerSeed: session.career.careerSeed,
    careerSchemaVersion: CAREER_SCHEMA_VERSION,
    contentVersion,
  });
  const programFamiliarity = new Map(
    meta.programFamiliarity.map((entry) => [entry.programId, entry.completedCareers]),
  );
  programFamiliarity.set(
    session.career.programId,
    (programFamiliarity.get(session.career.programId) ?? 0) + 1,
  );
  const nextMeta: MetaProfileV1 = {
    ...cloneSerializable(meta),
    revision: meta.revision + 1,
    alumni: [...meta.alumni, alumnus].sort((left, right) =>
      compareCodeUnits(left.alumniId, right.alumniId),
    ),
    unlockedOptionIds: [
      ...new Set([...meta.unlockedOptionIds, 'legacy_option_alumni_history']),
    ].sort(compareCodeUnits),
    programFamiliarity: [...programFamiliarity.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([programId, completedCareers]) => ({ programId, completedCareers })),
  };
  const nextSession: CareerSession = {
    ...cloneSerializable(session),
    career: {
      ...cloneSerializable(session.career),
      revision: session.career.revision + 1,
      phase: {
        type: 'CAREER_COMPLETE',
        seasonId: summary.seasonId,
        outcomeId: summary.outcomeId,
        alumniId,
      },
      seasonCareerState: {
        model: 'season_v1',
        bootstrapStatus: 'COMPLETE',
        seasonsCompleted: 1,
        activeSeasonId: null,
        lastCompletedSeason: summary,
      },
    },
  };
  if (!validateCareerSession(nextSession).ok || !validateMetaProfileV1(nextMeta).ok) {
    return Object.freeze({
      ok: false,
      session,
      meta,
      reason: 'season.internal_invariant_failure',
    });
  }
  return deepFreeze({ ok: true, session: nextSession, meta: nextMeta, alumni: alumnus });
}

export function deriveLegacyVisibility(
  meta: MetaProfileV1,
  programId: SeasonFixtureMechanicsDefinition['homeProgramId'],
): LegacyVisibilityV1 {
  if (!validateMetaProfileV1(meta).ok) {
    return deepFreeze({
      model: 'legacy_visibility_v1',
      alumnus: null,
      familiarProgramCareerCount: 0,
      unlockedOptionIds: [],
    });
  }
  const eligible = meta.alumni.filter((alumnus) => alumnus.programIds.includes(programId));
  return deepFreeze({
    model: 'legacy_visibility_v1',
    alumnus: eligible.at(-1) ?? null,
    familiarProgramCareerCount:
      meta.programFamiliarity.find((entry) => entry.programId === programId)?.completedCareers ?? 0,
    unlockedOptionIds: cloneSerializable(meta.unlockedOptionIds),
  });
}
