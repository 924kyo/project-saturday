import { isStableDomainId } from '../player/ids.js';

export const RECRUIT_TIER_IDS = Object.freeze([
  'recruit_tier_national',
  'recruit_tier_priority',
  'recruit_tier_developmental',
] as const);

export const PROJECTED_DEPTH_BAND_IDS = Object.freeze([
  'projected_depth_band_starter_competition',
  'projected_depth_band_rotation_path',
  'projected_depth_band_reserve_path',
  'projected_depth_band_developmental',
] as const);

export const DEPTH_ROLE_IDS = Object.freeze([
  'depth_role_starter',
  'depth_role_rotation',
  'depth_role_reserve',
  'depth_role_developmental',
] as const);

export const PROGRAM_STRENGTH_BAND_IDS = Object.freeze([
  'program_strength_national',
  'program_strength_contender',
  'program_strength_builder',
] as const);

export const RECRUITING_COMMAND_FAILURE_REASONS = Object.freeze([
  'recruiting.invalid_career',
  'recruiting.invalid_phase',
  'recruiting.already_started',
  'recruiting.revision_exhausted',
  'recruiting.invalid_config',
  'recruiting.invalid_program_catalog',
  'recruiting.invalid_offense_catalog',
  'recruiting.insufficient_offers',
  'recruiting.internal_invariant_failure',
] as const);

export const PROGRAM_COMMIT_COMMAND_FAILURE_REASONS = Object.freeze([
  'program_commit.invalid_career',
  'program_commit.invalid_phase',
  'program_commit.not_choosing',
  'program_commit.revision_exhausted',
  'program_commit.invalid_program_selection',
  'program_commit.invalid_program_catalog',
  'program_commit.invalid_offense_catalog',
  'program_commit.invalid_rotation_catalog',
  'program_commit.invalid_name_pool',
  'program_commit.rng_exhausted',
  'program_commit.internal_invariant_failure',
] as const);

export type RecruitTierId = (typeof RECRUIT_TIER_IDS)[number];
export type ProjectedDepthBandId = (typeof PROJECTED_DEPTH_BAND_IDS)[number];
export type DepthRoleId = (typeof DEPTH_ROLE_IDS)[number];
export type ProgramStrengthBandId = (typeof PROGRAM_STRENGTH_BAND_IDS)[number];
export type RecruitingCommandFailureReason = (typeof RECRUITING_COMMAND_FAILURE_REASONS)[number];
export type ProgramCommitCommandFailureReason =
  (typeof PROGRAM_COMMIT_COMMAND_FAILURE_REASONS)[number];
export type ProgramOffenseStyleId = `offense_style_${string}`;
export type RotationPolicyId = `rotation_policy_${string}`;
export type RosterPlayerId = `roster_player_${string}`;
export type RosterGivenNameId = `roster_given_name_${string}`;
export type RosterFamilyNameId = `roster_family_name_${string}`;

function isMember<const T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

export function isRecruitTierId(value: unknown): value is RecruitTierId {
  return isMember(RECRUIT_TIER_IDS, value);
}

export function isProjectedDepthBandId(value: unknown): value is ProjectedDepthBandId {
  return isMember(PROJECTED_DEPTH_BAND_IDS, value);
}

export function isDepthRoleId(value: unknown): value is DepthRoleId {
  return isMember(DEPTH_ROLE_IDS, value);
}

export function isProgramStrengthBandId(value: unknown): value is ProgramStrengthBandId {
  return isMember(PROGRAM_STRENGTH_BAND_IDS, value);
}

function isPrefixedStableId(value: unknown, prefix: string): value is string {
  return isStableDomainId(value) && value.startsWith(prefix) && value.length > prefix.length;
}

export function isProgramOffenseStyleId(value: unknown): value is ProgramOffenseStyleId {
  return isPrefixedStableId(value, 'offense_style_');
}

export function isRotationPolicyId(value: unknown): value is RotationPolicyId {
  return isPrefixedStableId(value, 'rotation_policy_');
}

export function isRosterPlayerId(value: unknown): value is RosterPlayerId {
  return isPrefixedStableId(value, 'roster_player_');
}

export function isRosterGivenNameId(value: unknown): value is RosterGivenNameId {
  return isPrefixedStableId(value, 'roster_given_name_');
}

export function isRosterFamilyNameId(value: unknown): value is RosterFamilyNameId {
  return isPrefixedStableId(value, 'roster_family_name_');
}
