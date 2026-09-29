import type { RngSeed, RngState } from '../random/rng.js';
import type {
  PassiveBodyRecoveryEvidence,
  PlayerSkillState,
  PlayerSkillStateV2,
} from '../skills/types.js';
import type {
  ArmSleevesId,
  BodyTypeId,
  CareerId,
  EyeBlackId,
  FaceId,
  FootwearId,
  GlovesId,
  HairColorId,
  HairStyleId,
  JerseyFitId,
  MentalAttributeId,
  PersonalityTraitId,
  PhysicalAttributeId,
  PlayerId,
  ProgramId,
  PlayerTagId,
  RecruitingBackgroundId,
  SkinToneId,
  TowelId,
  VisorId,
  WrArchetypeId,
  WrAttributeId,
  WristTapeId,
} from './ids.js';
import type {
  CareerPhaseV1,
  CareerPhaseV2,
  CareerPhaseV3,
  CareerPhaseV4,
  CareerPhaseV5,
  TrainingProficiencyUses,
  WeeklyExperienceVersion,
} from '../weekly/types.js';
import type { WeeklyActionId } from '../weekly/ids.js';
import type { ProgramCareerState, RecruitingState } from '../programs/types.js';
import type { CompletedGameSummary, GameCareerState, WrGameStatLine } from '../games/types.js';
import type { EventCareerState } from '../events/types.js';
import type { InjuryCareerState } from '../injuries/types.js';
import type { DepthRoleId } from '../programs/ids.js';
import type { OffFieldCareerStateV1 } from '../off-field/types.js';

export const CAREER_SCHEMA_VERSION_V1 = 1 as const;
export const CAREER_SCHEMA_VERSION_V2 = 2 as const;
export const CAREER_SCHEMA_VERSION_V3 = 3 as const;
export const CAREER_SCHEMA_VERSION_V4 = 4 as const;
export const CAREER_SCHEMA_VERSION_V5 = 5 as const;
export const CAREER_SCHEMA_VERSION_V6 = 6 as const;
export const CAREER_SCHEMA_VERSION_V7 = 7 as const;
export const CAREER_SCHEMA_VERSION = CAREER_SCHEMA_VERSION_V7;
export const RECENT_WEEKLY_ACTION_ID_LIMIT = 6 as const;

export interface AttributeProgress {
  readonly rating: number;
  readonly xp: number;
}

export interface WrPlayerAttributes {
  readonly physical: Readonly<Record<PhysicalAttributeId, AttributeProgress>>;
  readonly mental: Readonly<Record<MentalAttributeId, AttributeProgress>>;
  readonly wr: Readonly<Record<WrAttributeId, AttributeProgress>>;
}

export interface PlayerAppearance {
  readonly skinToneId: SkinToneId;
  readonly faceId: FaceId;
  readonly hairStyleId: HairStyleId;
  readonly hairColorId: HairColorId;
  readonly bodyTypeId: BodyTypeId;
  readonly eyeBlackId: EyeBlackId | null;
  readonly armSleevesId: ArmSleevesId | null;
  readonly glovesId: GlovesId | null;
  readonly visorId: VisorId | null;
  readonly wristTapeId: WristTapeId | null;
  readonly towelId: TowelId | null;
  readonly jerseyFitId: JerseyFitId;
  readonly footwearId: FootwearId;
}

export interface PlayerStateV1 {
  readonly body: number;
  readonly confidence: number;
  readonly coachTrust: number;
  readonly brand: number;
  readonly gpa: number;
}

export interface PlayerState extends PlayerStateV1 {
  readonly preparation: number;
}

export interface WrPlayerV1 {
  readonly id: PlayerId;
  readonly displayName: string;
  readonly positionId: 'position_wr';
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly personalityTraitIds: readonly [PersonalityTraitId, PersonalityTraitId];
  readonly appearance: PlayerAppearance;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly attributes: WrPlayerAttributes;
  readonly state: PlayerStateV1;
  readonly tagIds: readonly PlayerTagId[];
  readonly trainingProficiencyUses: TrainingProficiencyUses;
}

export interface WrPlayerV2 extends WrPlayerV1 {
  readonly skillState: PlayerSkillStateV2;
}

export type WrPlayerV3 = WrPlayerV2;
export interface WrPlayerV4 extends WrPlayerV3 {
  readonly state: PlayerState;
  readonly skillState: PlayerSkillState;
}
export type WrPlayer = WrPlayerV4;

export interface CareerRunV1 {
  readonly schemaVersion: typeof CAREER_SCHEMA_VERSION_V1;
  readonly id: CareerId;
  readonly careerSeed: RngSeed;
  readonly rng: RngState;
  readonly revision: number;
  readonly programId: null;
  readonly weekIndex: number;
  readonly phase: CareerPhaseV1;
  readonly player: WrPlayerV1;
}

export interface CareerRunV2 {
  readonly schemaVersion: typeof CAREER_SCHEMA_VERSION_V2;
  readonly id: CareerId;
  readonly careerSeed: RngSeed;
  readonly rng: RngState;
  readonly revision: number;
  readonly programId: null;
  readonly weekIndex: number;
  readonly recentWeeklyActionIds: readonly WeeklyActionId[];
  readonly lastPassiveBodyRecovery: PassiveBodyRecoveryEvidence | null;
  readonly phase: CareerPhaseV2;
  readonly player: WrPlayerV2;
}

export interface CareerRunV3 {
  readonly schemaVersion: typeof CAREER_SCHEMA_VERSION_V3;
  readonly id: CareerId;
  readonly careerSeed: RngSeed;
  readonly rng: RngState;
  readonly revision: number;
  readonly programId: ProgramId | null;
  readonly weekIndex: number;
  readonly recentWeeklyActionIds: readonly WeeklyActionId[];
  readonly lastPassiveBodyRecovery: PassiveBodyRecoveryEvidence | null;
  readonly recruitingState: RecruitingState;
  readonly programContext: ProgramCareerState | null;
  readonly phase: CareerPhaseV3;
  readonly player: WrPlayerV3;
}

export interface CareerRunV4 {
  readonly schemaVersion: typeof CAREER_SCHEMA_VERSION_V4;
  readonly id: CareerId;
  readonly careerSeed: RngSeed;
  readonly rng: RngState;
  readonly revision: number;
  readonly programId: ProgramId | null;
  readonly weekIndex: number;
  readonly recentWeeklyActionIds: readonly WeeklyActionId[];
  readonly lastPassiveBodyRecovery: PassiveBodyRecoveryEvidence | null;
  readonly recruitingState: RecruitingState;
  readonly programContext: ProgramCareerState | null;
  readonly gameCareerState: GameCareerState;
  readonly weeklyExperienceVersion: WeeklyExperienceVersion;
  readonly phase: CareerPhaseV4;
  readonly player: WrPlayerV4;
}

export interface PendingSeasonCareerState {
  readonly model: 'season_v1';
  readonly bootstrapStatus: 'PENDING';
  readonly seasonsCompleted: 0;
  readonly activeSeasonId: null;
  readonly lastCompletedSeason: null;
}

export interface ActiveSeasonCareerState {
  readonly model: 'season_v1';
  readonly bootstrapStatus: 'ACTIVE';
  readonly seasonsCompleted: 0 | 1;
  readonly activeSeasonId: `season_${string}`;
  readonly lastCompletedSeason: CompletedSeasonSummary | null;
  readonly eventState: EventCareerState;
  readonly injuryState: InjuryCareerState;
  readonly gameSummaries: readonly CompletedGameSummary[];
  readonly roleHistory: readonly SeasonRoleSnapshot[];
}

export interface SeasonRoleSnapshot {
  readonly weekIndex: number;
  readonly rank: number;
  readonly roleId: DepthRoleId;
}

export interface CompletedSeasonSummary {
  readonly seasonId: `season_${string}`;
  readonly outcomeId:
    | 'season_outcome_champion'
    | 'season_outcome_runner_up'
    | 'season_outcome_semifinal_exit'
    | 'season_outcome_regular_season_complete';
  readonly regularSeasonRank: number;
  readonly postseasonSeed: number | null;
  readonly programWins: number;
  readonly programLosses: number;
  readonly programTies: number;
  readonly gamesPlayed: number;
  readonly playerWins: number;
  readonly playerLosses: number;
  readonly playerTies: number;
  readonly cumulativeStats: WrGameStatLine;
  readonly averagePerformanceGrade: number;
  readonly bestGame: CompletedGameSummary | null;
  readonly roleHistory: readonly SeasonRoleSnapshot[];
  readonly finalDepthRank: number;
  readonly finalRoleId: DepthRoleId;
  readonly ownedSkillIds: readonly `skill_${string}`[];
  readonly equippedSkillIds: readonly (`skill_${string}` | null)[];
  readonly injuryCount: number;
  readonly injuryWeeksMissed: number;
}

export interface CompletedSeasonCareerState {
  readonly model: 'season_v1';
  readonly bootstrapStatus: 'COMPLETE';
  readonly seasonsCompleted: 1;
  readonly activeSeasonId: null;
  readonly lastCompletedSeason: CompletedSeasonSummary;
}

export type SeasonCareerState =
  PendingSeasonCareerState | ActiveSeasonCareerState | CompletedSeasonCareerState;

export interface CareerRunV5 extends Omit<CareerRunV4, 'schemaVersion' | 'phase'> {
  readonly schemaVersion: typeof CAREER_SCHEMA_VERSION_V5;
  readonly seasonCareerState: SeasonCareerState;
  readonly phase: CareerPhaseV5;
}

export interface CareerRunV6 extends Omit<CareerRunV5, 'schemaVersion'> {
  readonly schemaVersion: typeof CAREER_SCHEMA_VERSION_V6;
  readonly offFieldCareerState: OffFieldCareerStateV1;
}

/**
 * M7 compatibility checkpoint. The v7 writer is intentionally WR-only until
 * the position-aware player/content contracts are activated together.
 */
export interface CareerRunV7 extends Omit<CareerRunV6, 'schemaVersion'> {
  readonly schemaVersion: typeof CAREER_SCHEMA_VERSION_V7;
}

export type CareerRun = CareerRunV7;
