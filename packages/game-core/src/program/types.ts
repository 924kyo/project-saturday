import type {
  DepthEvaluationEvidence,
  DepthUpdateEvidence,
  ProjectedSnapShare,
  WrRoomDepthOrder,
} from '../depth/types.js';
import type { ProgramId, WrArchetypeId } from '../player/ids.js';
import type {
  OffenseStyleId,
  ProjectedDepthBandId,
  RecruitTierId,
  RosterFamilyNameId,
  RosterGivenNameId,
  RosterPlayerId,
  RotationPolicyId,
} from './ids.js';

export const RECRUITING_OFFER_COUNT = 5 as const;

export interface RecruitingOfferEvidence {
  readonly programId: ProgramId;
  readonly interest: number;
  readonly schemeFit: number;
  readonly priority: number;
  readonly projectedDepthBandId: ProjectedDepthBandId;
}

export type RecruitingOffers = readonly [
  RecruitingOfferEvidence,
  RecruitingOfferEvidence,
  RecruitingOfferEvidence,
  RecruitingOfferEvidence,
  RecruitingOfferEvidence,
];

export interface RecruitingNotStartedState {
  readonly type: 'NOT_STARTED';
}

export interface RecruitingChoosingState {
  readonly type: 'CHOOSING';
  readonly recruitAbilityScore: number;
  readonly backgroundModifier: number;
  readonly recruitScore: number;
  readonly recruitTierId: RecruitTierId;
  readonly offers: RecruitingOffers;
}

export interface RecruitingCommittedState extends Omit<RecruitingChoosingState, 'type'> {
  readonly type: 'COMMITTED';
  readonly selectedProgramId: ProgramId;
  readonly selectedAtWeekIndex: number;
  readonly rosterRngDrawCountBefore: number;
  readonly rosterRngDrawCountAfter: number;
}

export type RecruitingState =
  | RecruitingNotStartedState
  | RecruitingChoosingState
  | RecruitingCommittedState;

export interface WrRoomCompetitor {
  readonly id: RosterPlayerId;
  readonly givenNameId: RosterGivenNameId;
  readonly familyNameId: RosterFamilyNameId;
  readonly archetypeId: WrArchetypeId;
  readonly classYear: 1 | 2 | 3 | 4;
  readonly talentFit: number;
  readonly coachTrust: number;
  readonly practiceForm: number;
  readonly schemeFit: number;
  readonly experienceReadiness: number;
  readonly evaluation: DepthEvaluationEvidence;
}

export type WrRoomCompetitors = readonly [
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
  WrRoomCompetitor,
];

export interface WrRoomState {
  readonly competitors: WrRoomCompetitors;
  readonly depthOrder: WrRoomDepthOrder;
  readonly practiceForm: number;
  readonly playerEvaluation: DepthEvaluationEvidence;
  readonly playerProjection: ProjectedSnapShare;
  readonly lastDepthUpdate: DepthUpdateEvidence | null;
}

export interface ProgramCareerState {
  readonly programId: ProgramId;
  readonly offenseStyleId: OffenseStyleId;
  readonly rotationPolicyId: RotationPolicyId;
  readonly wrRoom: WrRoomState;
}
