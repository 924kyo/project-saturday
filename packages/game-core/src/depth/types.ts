import type { PlayerId } from '../player/ids.js';
import type { RosterPlayerId } from '../program/ids.js';
import type { DepthMovementId, DepthRoleId } from './ids.js';

export interface DepthEvaluationComponents {
  readonly talentFit: number;
  readonly coachTrust: number;
  readonly practiceForm: number;
  readonly schemeFit: number;
  readonly experienceReadiness: number;
}

export interface DepthEvaluationContributionsMilli {
  readonly talentFit: number;
  readonly coachTrust: number;
  readonly practiceForm: number;
  readonly schemeFit: number;
  readonly experienceReadiness: number;
}

export interface DepthEvaluationEvidence {
  readonly components: DepthEvaluationComponents;
  readonly contributionsMilli: DepthEvaluationContributionsMilli;
  readonly scoreMilli: number;
}

export interface ProjectedSnapShare {
  readonly depthRank: number;
  readonly roleId: DepthRoleId;
  readonly projectedSnapShareMinPermille: number;
  readonly projectedSnapShareMaxPermille: number;
}

export type WrRoomMemberId = PlayerId | RosterPlayerId;

export type WrRoomDepthOrder = readonly [
  WrRoomMemberId,
  WrRoomMemberId,
  WrRoomMemberId,
  WrRoomMemberId,
  WrRoomMemberId,
  WrRoomMemberId,
  WrRoomMemberId,
  WrRoomMemberId,
];

export interface DepthUpdateEvidence {
  readonly weekIndex: number;
  readonly practiceFormBefore: number;
  readonly practiceImpactTotal: number;
  readonly bodyAdjustment: number;
  readonly weeklyPracticeScore: number;
  readonly practiceFormAfter: number;
  readonly coachTrustBefore: number;
  readonly requestedCoachTrustDelta: number;
  readonly actualCoachTrustDelta: number;
  readonly coachTrustAfter: number;
  readonly playerEvaluationBefore: DepthEvaluationEvidence;
  readonly playerEvaluationAfter: DepthEvaluationEvidence;
  readonly movementThresholdMilli: number;
  readonly movementId: DepthMovementId;
  readonly neighborRosterPlayerId: RosterPlayerId | null;
  readonly playerScoreGapMilli: number | null;
  readonly depthOrderBefore: WrRoomDepthOrder;
  readonly depthOrderAfter: WrRoomDepthOrder;
  readonly projectionBefore: ProjectedSnapShare;
  readonly projectionAfter: ProjectedSnapShare;
}
