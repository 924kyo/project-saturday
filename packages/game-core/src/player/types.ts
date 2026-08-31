import type { RngSeed, RngState } from '../random/rng.js';
import type { PassiveBodyRecoveryEvidence, PlayerSkillState } from '../skills/types.js';
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
  PlayerTagId,
  RecruitingBackgroundId,
  SkinToneId,
  TowelId,
  VisorId,
  WrArchetypeId,
  WrAttributeId,
  WristTapeId,
} from './ids.js';
import type { CareerPhaseV1, CareerPhaseV2, TrainingProficiencyUses } from '../weekly/types.js';
import type { WeeklyActionId } from '../weekly/ids.js';

export const CAREER_SCHEMA_VERSION_V1 = 1 as const;
export const CAREER_SCHEMA_VERSION_V2 = 2 as const;
export const CAREER_SCHEMA_VERSION = CAREER_SCHEMA_VERSION_V2;
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

export interface PlayerState {
  readonly body: number;
  readonly confidence: number;
  readonly coachTrust: number;
  readonly brand: number;
  readonly gpa: number;
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
  readonly state: PlayerState;
  readonly tagIds: readonly PlayerTagId[];
  readonly trainingProficiencyUses: TrainingProficiencyUses;
}

export interface WrPlayerV2 extends WrPlayerV1 {
  readonly skillState: PlayerSkillState;
}

export type WrPlayer = WrPlayerV2;

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

export type CareerRun = CareerRunV2;
