import type { DepthRoleId } from './ids.js';

export const WR_ROOM_COMPETITOR_COUNT = 7 as const;
export const WR_ROOM_MEMBER_COUNT = 8 as const;
export const DEPTH_RANK_BOUNDS = Object.freeze({ min: 1, max: WR_ROOM_MEMBER_COUNT });
export const DEPTH_COMPONENT_BOUNDS = Object.freeze({ min: 0, max: 100 });
export const DEPTH_SCORE_MILLI_BOUNDS = Object.freeze({ min: 0, max: 100_000 });
export const SNAP_SHARE_PERMILLE_BOUNDS = Object.freeze({ min: 0, max: 1000 });
export const PRACTICE_IMPACT_BOUNDS = Object.freeze({ min: -100, max: 100 });
export const PRACTICE_IMPACT_TOTAL_BOUNDS = Object.freeze({ min: -300, max: 300 });
export const PRACTICE_BODY_ADJUSTMENT_BOUNDS = Object.freeze({ min: -10, max: 8 });
export const COACH_TRUST_DELTA_BOUNDS = Object.freeze({ min: -100, max: 100 });
export const DEPTH_MOVEMENT_THRESHOLD_MILLI = 2000 as const;

export const DEPTH_EVALUATION_WEIGHTS_PERMILLE = Object.freeze({
  talentFit: 450,
  coachTrust: 200,
  practiceForm: 150,
  schemeFit: 100,
  experienceReadiness: 100,
} as const);

export function deriveDepthRoleId(depthRank: number): DepthRoleId {
  if (depthRank <= 2) {
    return 'depth_role_starter';
  }
  if (depthRank <= 4) {
    return 'depth_role_rotation';
  }
  if (depthRank <= 6) {
    return 'depth_role_reserve';
  }
  return 'depth_role_developmental';
}
