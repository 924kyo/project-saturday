export const DEPTH_ROLE_IDS = Object.freeze([
  'depth_role_starter',
  'depth_role_rotation',
  'depth_role_reserve',
  'depth_role_developmental',
] as const);

export const DEPTH_MOVEMENT_IDS = Object.freeze([
  'depth_movement_promoted',
  'depth_movement_demoted',
  'depth_movement_blocked_promotion',
  'depth_movement_blocked_demotion',
  'depth_movement_stable',
] as const);

export type DepthRoleId = (typeof DEPTH_ROLE_IDS)[number];
export type DepthMovementId = (typeof DEPTH_MOVEMENT_IDS)[number];

function isOneOf<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
): value is TValues[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

export function isDepthRoleId(value: unknown): value is DepthRoleId {
  return isOneOf(value, DEPTH_ROLE_IDS);
}

export function isDepthMovementId(value: unknown): value is DepthMovementId {
  return isOneOf(value, DEPTH_MOVEMENT_IDS);
}
