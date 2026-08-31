import {
  isStableDomainId,
  type ProgramId,
  type WrArchetypeId,
} from '../player/ids.js';

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

export const PROGRAM_ID_PREFIX = 'program_' as const;
export const OFFENSE_STYLE_ID_PREFIX = 'offense_style_' as const;
export const ROTATION_POLICY_ID_PREFIX = 'rotation_policy_' as const;
export const ROSTER_PLAYER_ID_PREFIX = 'roster_player_' as const;
export const ROSTER_GIVEN_NAME_ID_PREFIX = 'roster_given_name_' as const;
export const ROSTER_FAMILY_NAME_ID_PREFIX = 'roster_family_name_' as const;

export type RecruitTierId = (typeof RECRUIT_TIER_IDS)[number];
export type ProjectedDepthBandId = (typeof PROJECTED_DEPTH_BAND_IDS)[number];
export type OffenseStyleId = `${typeof OFFENSE_STYLE_ID_PREFIX}${string}`;
export type RotationPolicyId = `${typeof ROTATION_POLICY_ID_PREFIX}${string}`;
export type RosterPlayerId = `${typeof ROSTER_PLAYER_ID_PREFIX}${string}`;
export type RosterGivenNameId = `${typeof ROSTER_GIVEN_NAME_ID_PREFIX}${string}`;
export type RosterFamilyNameId = `${typeof ROSTER_FAMILY_NAME_ID_PREFIX}${string}`;

function isOneOf<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
): value is TValues[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

function hasStablePrefix<TPrefix extends string>(
  value: unknown,
  prefix: TPrefix,
): value is `${TPrefix}${string}` {
  return isStableDomainId(value) && value.startsWith(prefix) && value.length > prefix.length;
}

export function isRecruitTierId(value: unknown): value is RecruitTierId {
  return isOneOf(value, RECRUIT_TIER_IDS);
}

export function isProjectedDepthBandId(value: unknown): value is ProjectedDepthBandId {
  return isOneOf(value, PROJECTED_DEPTH_BAND_IDS);
}

export function isProgramId(value: unknown): value is ProgramId {
  return hasStablePrefix(value, PROGRAM_ID_PREFIX);
}

export function isOffenseStyleId(value: unknown): value is OffenseStyleId {
  return hasStablePrefix(value, OFFENSE_STYLE_ID_PREFIX);
}

export function isRotationPolicyId(value: unknown): value is RotationPolicyId {
  return hasStablePrefix(value, ROTATION_POLICY_ID_PREFIX);
}

export function isRosterPlayerId(value: unknown): value is RosterPlayerId {
  return hasStablePrefix(value, ROSTER_PLAYER_ID_PREFIX);
}

export function isRosterGivenNameId(value: unknown): value is RosterGivenNameId {
  return hasStablePrefix(value, ROSTER_GIVEN_NAME_ID_PREFIX);
}

export function isRosterFamilyNameId(value: unknown): value is RosterFamilyNameId {
  return hasStablePrefix(value, ROSTER_FAMILY_NAME_ID_PREFIX);
}

/** M3 stores the controlled WR archetype directly on each generated competitor. */
export type RosterWrArchetypeId = WrArchetypeId;
