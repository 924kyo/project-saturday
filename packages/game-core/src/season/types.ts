import type {
  CareerId,
  PersonalityTraitId,
  PlayerId,
  ProgramId,
  RecruitingBackgroundId,
  WrArchetypeId,
} from '../player/ids.js';
import type {
  CareerRunV5,
  CareerRunV6,
  CareerRunV7,
  CompletedSeasonSummary,
  PlayerAppearance,
} from '../player/types.js';
import type { CompletedGameSummary, WrGameStatLine } from '../games/types.js';
import type { DepthRoleId } from '../programs/ids.js';
import type { InjuryOutcomeId } from '../injuries/ids.js';
import type { SkillId } from '../skills/ids.js';
import type { RngSeed, RngState } from '../random/rng.js';

export const CAREER_SESSION_SCHEMA_VERSION_V5 = 5 as const;
export const CAREER_SESSION_SCHEMA_VERSION_V6 = 6 as const;
export const CAREER_SESSION_SCHEMA_VERSION_V7 = 7 as const;
export const CAREER_SESSION_SCHEMA_VERSION = CAREER_SESSION_SCHEMA_VERSION_V7;
export const WORLD_SCHEMA_VERSION_V1 = 1 as const;
export const META_PROFILE_SCHEMA_VERSION_V1 = 1 as const;

export interface PendingSeasonCalendar {
  readonly type: 'PENDING';
}

export const SEASON_STAGE_IDS = ['CAMP', 'REGULAR_SEASON', 'POSTSEASON'] as const;
export const SEASON_STANDINGS_TIEBREAKER_IDS = [
  'standings_tiebreak_wins',
  'standings_tiebreak_head_to_head',
  'standings_tiebreak_schedule_strength',
  'standings_tiebreak_program_id',
] as const;

export type SeasonStageId = (typeof SEASON_STAGE_IDS)[number];
export type SeasonStandingsTiebreakerId = (typeof SEASON_STANDINGS_TIEBREAKER_IDS)[number];
export type SeasonId = `season_${string}`;
export type SeasonRoundId = `season_${string}`;
export type SeasonFixtureId = `season_fixture_${string}`;
export type PostseasonRoundId = 'postseason_round_semifinal' | 'postseason_round_final';
export type SeasonOutcomeId = CompletedSeasonSummary['outcomeId'];

export interface SeasonProgramMechanicsProfile {
  readonly programId: ProgramId;
  readonly offenseRating: number;
  readonly defenseRating: number;
  readonly qbRating: number;
  readonly teamRating: number;
  readonly scheduleStrength: number;
}

export interface SeasonFixtureMechanicsDefinition {
  readonly id: SeasonFixtureId;
  readonly homeProgramId: ProgramId;
  readonly awayProgramId: ProgramId;
  readonly spotlight: boolean;
}

export interface RegularSeasonRoundMechanicsDefinition {
  readonly id: SeasonRoundId;
  readonly weekNumber: number;
  readonly fixtures: readonly SeasonFixtureMechanicsDefinition[];
}

export interface SeasonMechanicsDefinition {
  readonly id: SeasonId;
  readonly campRoundIds: readonly [SeasonRoundId, SeasonRoundId, SeasonRoundId];
  readonly regularSeasonRounds: readonly RegularSeasonRoundMechanicsDefinition[];
  readonly programProfiles: readonly SeasonProgramMechanicsProfile[];
  readonly standingsTiebreakOrder: readonly [
    SeasonStandingsTiebreakerId,
    SeasonStandingsTiebreakerId,
    SeasonStandingsTiebreakerId,
    SeasonStandingsTiebreakerId,
  ];
  readonly postseason: {
    readonly qualifierCount: 4;
    readonly semifinalMatchups: readonly [
      { readonly homeSeed: 1; readonly awaySeed: 4 },
      { readonly homeSeed: 2; readonly awaySeed: 3 },
    ];
  };
}

interface SeasonGameResultBase {
  readonly fixtureId: SeasonFixtureId;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly winnerProgramId: ProgramId | null;
}

export interface AggregateSeasonGameResult extends SeasonGameResultBase {
  readonly model: 'aggregate_v1';
  readonly homeExpectedScore: number;
  readonly awayExpectedScore: number;
  readonly homeVariance: number;
  readonly awayVariance: number;
  readonly worldRngDrawCountBefore: number;
  readonly worldRngDrawCountAfter: number;
}

export interface PlayerSeasonGameResult extends SeasonGameResultBase {
  readonly model: 'player_game_v1';
  readonly careerRngDrawCountBefore: number;
  readonly careerRngDrawCountAfter: number;
}

export type SeasonGameResult = AggregateSeasonGameResult | PlayerSeasonGameResult;

export interface RegularSeasonRoundState {
  readonly roundId: SeasonRoundId;
  readonly fixtureResults: readonly (SeasonGameResult | null)[];
}

export interface SeasonProgramRecord {
  readonly programId: ProgramId;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly pointsFor: number;
  readonly pointsAgainst: number;
}

export interface SeasonStanding {
  readonly rank: number;
  readonly programId: ProgramId;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly headToHeadWins: number;
  readonly scheduleStrength: number;
}

export interface PendingPostseasonState {
  readonly type: 'PENDING';
}

export interface PostseasonRoundState {
  readonly roundId: PostseasonRoundId;
  readonly fixtures: readonly SeasonFixtureMechanicsDefinition[];
  readonly fixtureResults: readonly (PostseasonGameResult | null)[];
}

export interface PostseasonGameResult {
  readonly result: SeasonGameResult;
  readonly advancingProgramId: ProgramId;
  readonly usedHigherSeedTiebreak: boolean;
}

export interface ActivePostseasonState {
  readonly type: 'ACTIVE';
  readonly qualifierProgramIds: readonly [ProgramId, ProgramId, ProgramId, ProgramId];
  readonly currentRoundIndex: 0 | 1;
  readonly rounds: readonly [PostseasonRoundState, PostseasonRoundState];
}

export interface CompletePostseasonState {
  readonly type: 'COMPLETE';
  readonly qualifierProgramIds: readonly [ProgramId, ProgramId, ProgramId, ProgramId];
  readonly rounds: readonly [PostseasonRoundState, PostseasonRoundState];
  readonly championProgramId: ProgramId;
  readonly playerOutcomeId: SeasonOutcomeId;
  readonly playerRegularSeasonRank: number;
  readonly playerPostseasonSeed: number | null;
}

export type PostseasonState =
  PendingPostseasonState | ActivePostseasonState | CompletePostseasonState;

export interface ActiveSeasonCalendar {
  readonly type: 'ACTIVE';
  readonly definition: SeasonMechanicsDefinition;
  readonly stage: SeasonStageId;
  readonly completedCampRoundCount: number;
  readonly completedRegularSeasonRoundCount: number;
  readonly regularSeasonResults: readonly RegularSeasonRoundState[];
  readonly programRecords: readonly SeasonProgramRecord[];
  readonly standings: readonly SeasonStanding[];
  readonly postseason: PostseasonState;
}

export type SeasonCalendar = PendingSeasonCalendar | ActiveSeasonCalendar;

export interface OffseasonWorldRngEvidenceV1 {
  readonly model: 'offseason_world_rng_v1';
  readonly worldRngDrawCountBefore: number;
  readonly worldRngDrawCountAfter: number;
}

export interface CompletedSeasonWorldHistoryEntryV1 {
  readonly model: 'completed_season_world_v1';
  readonly seasonIndex: number;
  readonly playerProgramId: ProgramId;
  readonly calendar: ActiveSeasonCalendar;
}

export interface WorldStateV1 {
  readonly schemaVersion: typeof WORLD_SCHEMA_VERSION_V1;
  readonly model: 'season_v1';
  readonly careerId: CareerId;
  readonly worldSeed: RngSeed;
  readonly rng: RngState;
  readonly revision: number;
  readonly calendar: SeasonCalendar;
  readonly offseasonRngEvidence?: OffseasonWorldRngEvidenceV1;
  readonly completedSeasonHistory?: readonly CompletedSeasonWorldHistoryEntryV1[];
}

export interface CareerSessionV5 {
  readonly schemaVersion: typeof CAREER_SESSION_SCHEMA_VERSION_V5;
  readonly career: CareerRunV5;
  readonly world: WorldStateV1;
}

export interface CareerSessionV6 {
  readonly schemaVersion: typeof CAREER_SESSION_SCHEMA_VERSION_V6;
  readonly career: CareerRunV6;
  readonly world: WorldStateV1;
}

export interface CareerSessionV7 {
  readonly schemaVersion: typeof CAREER_SESSION_SCHEMA_VERSION_V7;
  readonly career: CareerRunV7;
  readonly world: WorldStateV1;
}

export type CareerSession = CareerSessionV7;

export interface ProgramFamiliarityV1 {
  readonly programId: ProgramId;
  readonly completedCareers: number;
}

export type AlumniId = `alumni_${string}`;

export interface AlumniRecordV1 {
  readonly schemaVersion: 1;
  readonly alumniId: AlumniId;
  readonly careerId: CareerId;
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly appearance: PlayerAppearance;
  readonly positionId: 'position_wr';
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly personalityTraitIds: readonly [PersonalityTraitId, PersonalityTraitId];
  readonly programIds: readonly [ProgramId];
  readonly seasonsPlayed: 1;
  readonly careerStats: WrGameStatLine;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly averagePerformanceGrade: number;
  readonly bestGame: CompletedGameSummary | null;
  readonly startingDepthRank: number;
  readonly startingRoleId: DepthRoleId;
  readonly finalDepthRank: number;
  readonly finalRoleId: DepthRoleId;
  readonly ownedSkillIds: readonly SkillId[];
  readonly equippedSkillIds: readonly (SkillId | null)[];
  readonly injuryOutcomeIds: readonly InjuryOutcomeId[];
  readonly injuryWeeksMissed: number;
  readonly seasonOutcomeId: SeasonOutcomeId;
  readonly regularSeasonRank: number;
  readonly postseasonSeed: number | null;
  readonly championshipCount: 0 | 1;
  readonly endingId: 'career_ending_one_season_complete';
  readonly careerSeed: RngSeed;
  readonly careerSchemaVersion: 5 | 6 | 7;
  readonly contentVersion: number;
}

export interface MetaProfileV1 {
  readonly schemaVersion: typeof META_PROFILE_SCHEMA_VERSION_V1;
  readonly revision: number;
  readonly alumni: readonly AlumniRecordV1[];
  readonly unlockedOptionIds: readonly string[];
  readonly programFamiliarity: readonly ProgramFamiliarityV1[];
}

export const SEASON_COMMAND_FAILURE_REASONS = [
  'season.invalid_session',
  'season.invalid_definition',
  'season.invalid_phase',
  'season.revision_exhausted',
  'season.rng_exhausted',
  'season.missing_player_fixture',
  'season.matchup_mismatch',
  'season.invalid_development_config',
  'season.invalid_action_definitions',
  'season.invalid_skill_definitions',
  'season.game_command_failed',
  'season.invalid_meta',
  'season.duplicate_alumni',
  'season.internal_invariant_failure',
] as const;

export type SeasonCommandFailureReason = (typeof SEASON_COMMAND_FAILURE_REASONS)[number];
export type SeasonCommandResult =
  | { readonly ok: true; readonly session: CareerSession }
  | {
      readonly ok: false;
      readonly session: CareerSession;
      readonly reason: SeasonCommandFailureReason;
    };

export type CompleteCareerResult =
  | {
      readonly ok: true;
      readonly session: CareerSession;
      readonly meta: MetaProfileV1;
      readonly alumni: AlumniRecordV1;
    }
  | {
      readonly ok: false;
      readonly session: CareerSession;
      readonly meta: MetaProfileV1;
      readonly reason: SeasonCommandFailureReason;
    };

export interface LegacyVisibilityV1 {
  readonly model: 'legacy_visibility_v1';
  readonly alumnus: AlumniRecordV1 | null;
  readonly familiarProgramCareerCount: number;
  readonly unlockedOptionIds: readonly string[];
}
