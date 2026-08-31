export const POSITION_WR_ID = 'position_wr' as const;
export const POSITION_IDS = Object.freeze([POSITION_WR_ID] as const);

export const WR_ARCHETYPE_IDS = Object.freeze([
  'archetype_wr_deep_threat',
  'archetype_wr_route_technician',
  'archetype_wr_possession_receiver',
] as const);

export const RECRUITING_BACKGROUND_IDS = Object.freeze([
  'background_blue_chip_star',
  'background_late_bloomer',
  'background_small_town_star',
  'background_legacy_recruit',
  'background_under_recruited_athlete',
] as const);

export const PERSONALITY_TRAIT_IDS = Object.freeze([
  'personality_competitive',
  'personality_quiet',
  'personality_leader',
  'personality_hot_headed',
  'personality_disciplined',
  'personality_social',
  'personality_independent',
  'personality_confident',
] as const);

export const PHYSICAL_ATTRIBUTE_IDS = Object.freeze([
  'attribute_speed',
  'attribute_burst',
  'attribute_agility',
  'attribute_strength',
  'attribute_conditioning',
  'attribute_durability',
] as const);

export const MENTAL_ATTRIBUTE_IDS = Object.freeze([
  'attribute_football_iq',
  'attribute_composure',
  'attribute_discipline',
  'attribute_work_ethic',
] as const);

export const WR_ATTRIBUTE_IDS = Object.freeze([
  'attribute_wr_release',
  'attribute_wr_route_running',
  'attribute_wr_hands',
  'attribute_wr_catch_in_traffic',
  'attribute_wr_yac',
  'attribute_wr_blocking',
] as const);

export const PLAYER_ATTRIBUTE_IDS = Object.freeze([
  ...PHYSICAL_ATTRIBUTE_IDS,
  ...MENTAL_ATTRIBUTE_IDS,
  ...WR_ATTRIBUTE_IDS,
] as const);

export const CREATION_STATE_IDS = Object.freeze([
  'state_body',
  'state_confidence',
  'state_coach_trust',
  'state_brand',
  'state_gpa',
] as const);

export type WrArchetypeId = (typeof WR_ARCHETYPE_IDS)[number];
export type RecruitingBackgroundId = (typeof RECRUITING_BACKGROUND_IDS)[number];
export type PersonalityTraitId = (typeof PERSONALITY_TRAIT_IDS)[number];
export type PhysicalAttributeId = (typeof PHYSICAL_ATTRIBUTE_IDS)[number];
export type MentalAttributeId = (typeof MENTAL_ATTRIBUTE_IDS)[number];
export type WrAttributeId = (typeof WR_ATTRIBUTE_IDS)[number];
export type PlayerAttributeId = (typeof PLAYER_ATTRIBUTE_IDS)[number];
export type CreationStateId = (typeof CREATION_STATE_IDS)[number];
export type PositionId = (typeof POSITION_IDS)[number];

export type CareerId = `career_${string}`;
export type PlayerId = `player_${string}`;
export type ProgramId = `program_${string}`;
export type PlayerTagId = `tag_${string}`;

export type SkinToneId = `skin_tone_${string}`;
export type FaceId = `face_${string}`;
export type HairStyleId = `hair_style_${string}`;
export type HairColorId = `hair_color_${string}`;
export type BodyTypeId = `body_type_${string}`;
export type EyeBlackId = `eye_black_${string}`;
export type ArmSleevesId = `arm_sleeves_${string}`;
export type GlovesId = `gloves_${string}`;
export type VisorId = `visor_${string}`;
export type WristTapeId = `wrist_tape_${string}`;
export type TowelId = `towel_${string}`;
export type JerseyFitId = `jersey_fit_${string}`;
export type FootwearId = `footwear_${string}`;

export const PERSONALITY_TRAIT_INCOMPATIBILITIES = Object.freeze({
  personality_competitive: Object.freeze([]),
  personality_quiet: Object.freeze(['personality_social']),
  personality_leader: Object.freeze([]),
  personality_hot_headed: Object.freeze(['personality_disciplined']),
  personality_disciplined: Object.freeze(['personality_hot_headed']),
  personality_social: Object.freeze(['personality_quiet']),
  personality_independent: Object.freeze([]),
  personality_confident: Object.freeze([]),
} as const satisfies Readonly<Record<PersonalityTraitId, readonly PersonalityTraitId[]>>);

export const STABLE_DOMAIN_ID_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
export const STABLE_DOMAIN_ID_MAX_LENGTH = 96;

export function isStableDomainId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= STABLE_DOMAIN_ID_MAX_LENGTH &&
    STABLE_DOMAIN_ID_PATTERN.test(value)
  );
}

function isOneOf<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
): value is TValues[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

export function isWrArchetypeId(value: unknown): value is WrArchetypeId {
  return isOneOf(value, WR_ARCHETYPE_IDS);
}

export function isRecruitingBackgroundId(value: unknown): value is RecruitingBackgroundId {
  return isOneOf(value, RECRUITING_BACKGROUND_IDS);
}

export function isPersonalityTraitId(value: unknown): value is PersonalityTraitId {
  return isOneOf(value, PERSONALITY_TRAIT_IDS);
}

export function isPlayerAttributeId(value: unknown): value is PlayerAttributeId {
  return isOneOf(value, PLAYER_ATTRIBUTE_IDS);
}

export function isCreationStateId(value: unknown): value is CreationStateId {
  return isOneOf(value, CREATION_STATE_IDS);
}

export function isPositionId(value: unknown): value is PositionId {
  return isOneOf(value, POSITION_IDS);
}

export function isCareerId(value: unknown): value is CareerId {
  return isStableDomainId(value) && value.startsWith('career_');
}

export function isPlayerId(value: unknown): value is PlayerId {
  return isStableDomainId(value) && value.startsWith('player_');
}

export function isPlayerTagId(value: unknown): value is PlayerTagId {
  return isStableDomainId(value) && value.startsWith('tag_');
}

export function arePersonalityTraitsCompatible(left: unknown, right: unknown): boolean {
  return (
    isPersonalityTraitId(left) &&
    isPersonalityTraitId(right) &&
    left !== right &&
    !PERSONALITY_TRAIT_INCOMPATIBILITIES[left].some((traitId) => traitId === right) &&
    !PERSONALITY_TRAIT_INCOMPATIBILITIES[right].some((traitId) => traitId === left)
  );
}
