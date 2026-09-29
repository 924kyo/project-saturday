import type { DepthRoleId, RecruitTierId } from './ids.js';

export const RECRUIT_SCORE_BOUNDS = Object.freeze({ min: 0, max: 100 });
export const RECRUIT_BACKGROUND_MODIFIER_BOUNDS = Object.freeze({ min: -20, max: 20 });
export const RECRUIT_TIER_NATIONAL_MIN_SCORE = 62 as const;
export const RECRUIT_TIER_PRIORITY_MIN_SCORE = 56 as const;
export const RECRUITING_OFFER_COUNT = 5 as const;
export const WR_ROOM_COMPETITOR_COUNT = 7 as const;
export const WR_ROOM_PARTICIPANT_COUNT = 8 as const;
export const ROSTER_GENERATION_MIN_RNG_DRAWS = 35 as const;
export const DEPTH_SCORE_MILLI_BOUNDS = Object.freeze({ min: 0, max: 100_000 });
export const DEPTH_HYSTERESIS_THRESHOLD_MILLI = 2_000 as const;
export const SNAP_SHARE_PERMILLE_BOUNDS = Object.freeze({ min: 0, max: 1_000 });
export const PRACTICE_IMPACT_BOUNDS = Object.freeze({ min: -25, max: 25 });
export const PRACTICE_WEEKLY_SCORE_BASE = 50 as const;
export const PRACTICE_BODY_NEUTRAL_POINT = 60 as const;
export const PRACTICE_BODY_POINTS_PER_SCORE = 5 as const;
export const PRACTICE_PREPARATION_POINTS_PER_SCORE = 5 as const;
export const PRACTICE_CONFIDENCE_NEUTRAL_POINT = 50 as const;
export const PRACTICE_CONFIDENCE_POINTS_PER_SCORE = 10 as const;
export const PRACTICE_PREPARATION_TARGET_BY_ROLE = Object.freeze({
  depth_role_starter: 65,
  depth_role_rotation: 60,
  depth_role_reserve: 55,
  depth_role_developmental: 50,
} as const satisfies Readonly<Record<DepthRoleId, number>>);
export const PRACTICE_FORM_PREVIOUS_WEIGHT_PERMILLE = 400 as const;
export const PRACTICE_FORM_WEEKLY_WEIGHT_PERMILLE = 600 as const;
export const COACH_TRUST_WEEKLY_SCORE_BANDS = Object.freeze([
  { maxScore: 30, delta: -4 },
  { maxScore: 40, delta: -2 },
  { maxScore: 48, delta: -1 },
  { maxScore: 54, delta: 0 },
  { maxScore: 64, delta: 1 },
  { maxScore: 74, delta: 2 },
  { maxScore: 100, delta: 4 },
] as const);
export const DEPTH_COMPONENT_BOUNDS = Object.freeze({ min: 0, max: 100 });

export const DEPTH_EVALUATION_WEIGHTS_PERMILLE = Object.freeze({
  talentFit: 450,
  coachTrust: 200,
  practiceForm: 150,
  schemeFit: 100,
  experienceReadiness: 100,
} as const);

export function deriveRecruitTierId(recruitScore: number): RecruitTierId {
  return recruitScore >= RECRUIT_TIER_NATIONAL_MIN_SCORE
    ? 'recruit_tier_national'
    : recruitScore >= RECRUIT_TIER_PRIORITY_MIN_SCORE
      ? 'recruit_tier_priority'
      : 'recruit_tier_developmental';
}

export function depthRoleIdForRank(rank: number): DepthRoleId {
  return rank <= 2
    ? 'depth_role_starter'
    : rank <= 4
      ? 'depth_role_rotation'
      : rank <= 6
        ? 'depth_role_reserve'
        : 'depth_role_developmental';
}
