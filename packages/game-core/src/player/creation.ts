import { createRng, type RngSeed } from '../random/rng.js';
import { createEmptyPlayerSkillState } from '../skills/state.js';
import {
  ATTRIBUTE_RATING_BOUNDS,
  BODY_BOUNDS,
  BRAND_BOUNDS,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
  HEIGHT_CM_BOUNDS,
  WEIGHT_KG_BOUNDS,
  isIntegerWithinBounds,
  isWithinBounds,
} from './bounds.js';
import { deepFreeze } from './immutable.js';
import {
  CREATION_STATE_IDS,
  MENTAL_ATTRIBUTE_IDS,
  PERSONALITY_TRAIT_IDS,
  PERSONALITY_TRAIT_INCOMPATIBILITIES,
  PHYSICAL_ATTRIBUTE_IDS,
  PLAYER_ATTRIBUTE_IDS,
  POSITION_WR_ID,
  WR_ATTRIBUTE_IDS,
  arePersonalityTraitsCompatible,
  isCareerId,
  isCreationStateId,
  isPersonalityTraitId,
  isPlayerAttributeId,
  isPlayerId,
  isPlayerTagId,
  isRecruitingBackgroundId,
  isStableDomainId,
  isWrArchetypeId,
  type CareerId,
  type CreationStateId,
  type PersonalityTraitId,
  type PlayerAttributeId,
  type PlayerId,
  type PlayerTagId,
  type RecruitingBackgroundId,
  type WrArchetypeId,
} from './ids.js';
import { compareCodeUnits } from './order.js';
import {
  CAREER_SCHEMA_VERSION,
  type CareerRun,
  type PlayerAppearance,
  type PlayerState,
  type WrPlayerAttributes,
} from './types.js';
import { validateCareerRun } from './validation.js';
import { TRAINING_PROFICIENCY_IDS } from '../weekly/ids.js';

export type InitialAttributeRatings = Readonly<Record<PlayerAttributeId, number>>;
export type InitialCreationState = Readonly<Record<CreationStateId, number>>;

export interface AttributeCreationModifier {
  readonly attributeId: PlayerAttributeId;
  readonly delta: number;
}

export interface StateCreationModifier {
  readonly stateId: CreationStateId;
  readonly delta: number;
}

export interface IdentityCreationProfile<TId extends string> {
  readonly id: TId;
  readonly attributeModifiers: readonly AttributeCreationModifier[];
  readonly stateModifiers: readonly StateCreationModifier[];
  readonly grantedTagIds: readonly PlayerTagId[];
}

export interface PersonalityCreationProfile extends IdentityCreationProfile<PersonalityTraitId> {
  readonly incompatibleTraitIds: readonly PersonalityTraitId[];
}

export interface WrCreationMechanics {
  readonly baseAttributeRatings: InitialAttributeRatings;
  readonly baseState: InitialCreationState;
  readonly archetypeProfile: IdentityCreationProfile<WrArchetypeId>;
  readonly backgroundProfile: IdentityCreationProfile<RecruitingBackgroundId>;
  readonly personalityProfiles: readonly [PersonalityCreationProfile, PersonalityCreationProfile];
}

export interface WrPlayerCreationIdentity {
  readonly displayName: string;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly personalityTraitIds: readonly [PersonalityTraitId, PersonalityTraitId];
  readonly appearance: PlayerAppearance;
  readonly heightCm: number;
  readonly weightKg: number;
}

export interface CreateWrCareerInput {
  readonly careerSeed: RngSeed;
  readonly careerId?: CareerId;
  readonly playerId?: PlayerId;
  readonly identity: WrPlayerCreationIdentity;
  readonly mechanics: WrCreationMechanics;
}

export type PlayerCreationIssueCode =
  | 'creation.duplicate_modifier'
  | 'creation.duplicate_personality'
  | 'creation.duplicate_tag'
  | 'creation.incompatible_personality'
  | 'creation.invalid_appearance_id'
  | 'creation.invalid_baseline'
  | 'creation.invalid_body_measurement'
  | 'creation.invalid_display_name'
  | 'creation.invalid_identity_id'
  | 'creation.invalid_modifier'
  | 'creation.invalid_personality_count'
  | 'creation.invalid_profile'
  | 'creation.invalid_result'
  | 'creation.invalid_seed'
  | 'creation.invalid_stable_id'
  | 'creation.invalid_tag'
  | 'creation.out_of_bounds'
  | 'creation.profile_has_no_initial_effect'
  | 'creation.profile_mismatch';

export interface PlayerCreationIssue {
  readonly code: PlayerCreationIssueCode;
  readonly path: string;
}

export type CreateWrCareerResult =
  | { readonly ok: true; readonly career: CareerRun }
  | { readonly ok: false; readonly issues: readonly PlayerCreationIssue[] };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function addIssue(
  issues: PlayerCreationIssue[],
  code: PlayerCreationIssueCode,
  path: string,
): void {
  issues.push({ code, path });
}

function validSeed(seed: unknown): seed is RngSeed {
  return (
    (typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= 0xffff_ffff) ||
    (typeof seed === 'string' && seed.length > 0 && seed.length <= 256)
  );
}

function stableHash(value: string, domain: number): number {
  let hash = (0x811c_9dc5 ^ domain) >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x0100_0193) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0_aaad) >>> 0;
  return (hash ^ (hash >>> 15)) >>> 0;
}

function deterministicSuffix(value: string): string {
  return [stableHash(value, 0x63a9_5d21), stableHash(value, 0xb4b8_2e39)]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

function seedToken(seed: RngSeed): string {
  return typeof seed === 'number' ? `number:${seed}` : `string:${seed}`;
}

export function deriveCareerId(careerSeed: RngSeed): CareerId {
  return `career_${deterministicSuffix(`career|${seedToken(careerSeed)}`)}`;
}

function canonicalPersonalityIds(
  values: readonly [PersonalityTraitId, PersonalityTraitId],
): readonly [PersonalityTraitId, PersonalityTraitId] {
  const ordered = [...values].sort(
    (left, right) => PERSONALITY_TRAIT_IDS.indexOf(left) - PERSONALITY_TRAIT_IDS.indexOf(right),
  );
  return [ordered[0] as PersonalityTraitId, ordered[1] as PersonalityTraitId];
}

/** One CareerRun owns one player, so creation edits never change its seed-derived player ID. */
export function derivePlayerId(careerSeed: RngSeed): PlayerId {
  return `player_${deterministicSuffix(`player|${seedToken(careerSeed)}`)}`;
}

function validateDisplayName(value: unknown, issues: PlayerCreationIssue[]): void {
  const name = typeof value === 'string' ? value : '';
  const length = [...name].length;
  const hasControlCharacter = [...name].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });
  if (
    typeof value !== 'string' ||
    name.trim() !== name ||
    length < 1 ||
    length > 40 ||
    hasControlCharacter
  ) {
    addIssue(issues, 'creation.invalid_display_name', 'identity.displayName');
  }
}

function validateAppearance(value: unknown, issues: PlayerCreationIssue[]): void {
  const appearance = asRecord(value);
  const requiredPrefixes = {
    skinToneId: 'skin_tone_',
    faceId: 'face_',
    hairStyleId: 'hair_style_',
    hairColorId: 'hair_color_',
    bodyTypeId: 'body_type_',
    jerseyFitId: 'jersey_fit_',
    footwearId: 'footwear_',
  } as const;
  const optionalPrefixes = {
    eyeBlackId: 'eye_black_',
    armSleevesId: 'arm_sleeves_',
    glovesId: 'gloves_',
    visorId: 'visor_',
    wristTapeId: 'wrist_tape_',
    towelId: 'towel_',
  } as const;

  if (appearance === undefined) {
    addIssue(issues, 'creation.invalid_appearance_id', 'identity.appearance');
    return;
  }

  const expectedKeys = new Set([
    ...Object.keys(requiredPrefixes),
    ...Object.keys(optionalPrefixes),
  ]);
  for (const key of Object.keys(appearance)) {
    if (!expectedKeys.has(key)) {
      addIssue(issues, 'creation.invalid_appearance_id', `identity.appearance.${key}`);
    }
  }
  for (const [key, prefix] of Object.entries(requiredPrefixes)) {
    const optionId = appearance[key];
    if (!isStableDomainId(optionId) || !optionId.startsWith(prefix)) {
      addIssue(issues, 'creation.invalid_appearance_id', `identity.appearance.${key}`);
    }
  }
  for (const [key, prefix] of Object.entries(optionalPrefixes)) {
    const optionId = appearance[key];
    if (optionId !== null && (!isStableDomainId(optionId) || !optionId.startsWith(prefix))) {
      addIssue(issues, 'creation.invalid_appearance_id', `identity.appearance.${key}`);
    }
  }
}

function validateIdentity(input: CreateWrCareerInput, issues: PlayerCreationIssue[]): void {
  validateDisplayName(input.identity?.displayName, issues);
  if (!isWrArchetypeId(input.identity?.archetypeId)) {
    addIssue(issues, 'creation.invalid_identity_id', 'identity.archetypeId');
  }
  if (!isRecruitingBackgroundId(input.identity?.recruitingBackgroundId)) {
    addIssue(issues, 'creation.invalid_identity_id', 'identity.recruitingBackgroundId');
  }

  const traits: unknown = input.identity?.personalityTraitIds;
  if (!Array.isArray(traits) || traits.length !== 2) {
    addIssue(issues, 'creation.invalid_personality_count', 'identity.personalityTraitIds');
  } else {
    traits.forEach((traitId, index) => {
      if (!isPersonalityTraitId(traitId)) {
        addIssue(issues, 'creation.invalid_identity_id', `identity.personalityTraitIds.${index}`);
      }
    });
    if (traits[0] === traits[1]) {
      addIssue(issues, 'creation.duplicate_personality', 'identity.personalityTraitIds');
    }
  }

  validateAppearance(input.identity?.appearance, issues);
  if (!isIntegerWithinBounds(input.identity?.heightCm, HEIGHT_CM_BOUNDS)) {
    addIssue(issues, 'creation.invalid_body_measurement', 'identity.heightCm');
  }
  if (!isIntegerWithinBounds(input.identity?.weightKg, WEIGHT_KG_BOUNDS)) {
    addIssue(issues, 'creation.invalid_body_measurement', 'identity.weightKg');
  }
}

function validateBaseAttributes(value: unknown, issues: PlayerCreationIssue[]): void {
  const ratings = asRecord(value);
  if (ratings === undefined) {
    addIssue(issues, 'creation.invalid_baseline', 'mechanics.baseAttributeRatings');
    return;
  }

  const expected = new Set<string>(PLAYER_ATTRIBUTE_IDS);
  for (const attributeId of PLAYER_ATTRIBUTE_IDS) {
    if (!Object.hasOwn(ratings, attributeId)) {
      addIssue(
        issues,
        'creation.invalid_baseline',
        `mechanics.baseAttributeRatings.${attributeId}`,
      );
      continue;
    }
    if (!isIntegerWithinBounds(ratings[attributeId], ATTRIBUTE_RATING_BOUNDS)) {
      addIssue(
        issues,
        'creation.invalid_baseline',
        `mechanics.baseAttributeRatings.${attributeId}`,
      );
    }
  }
  for (const key of Object.keys(ratings)) {
    if (!expected.has(key)) {
      addIssue(issues, 'creation.invalid_baseline', `mechanics.baseAttributeRatings.${key}`);
    }
  }
}

function stateBounds(stateId: CreationStateId) {
  switch (stateId) {
    case 'state_body':
      return BODY_BOUNDS;
    case 'state_confidence':
      return CONFIDENCE_BOUNDS;
    case 'state_coach_trust':
      return COACH_TRUST_BOUNDS;
    case 'state_brand':
      return BRAND_BOUNDS;
    case 'state_gpa':
      return GPA_BOUNDS;
  }
}

function validateBaseState(value: unknown, issues: PlayerCreationIssue[]): void {
  const state = asRecord(value);
  if (state === undefined) {
    addIssue(issues, 'creation.invalid_baseline', 'mechanics.baseState');
    return;
  }

  const expected = new Set<string>(CREATION_STATE_IDS);
  for (const stateId of CREATION_STATE_IDS) {
    const stateValue = state[stateId];
    const valid =
      stateId === 'state_gpa'
        ? isWithinBounds(stateValue, GPA_BOUNDS)
        : isIntegerWithinBounds(stateValue, stateBounds(stateId));
    if (!Object.hasOwn(state, stateId) || !valid) {
      addIssue(issues, 'creation.invalid_baseline', `mechanics.baseState.${stateId}`);
    }
  }
  for (const key of Object.keys(state)) {
    if (!expected.has(key)) {
      addIssue(issues, 'creation.invalid_baseline', `mechanics.baseState.${key}`);
    }
  }
}

function validateProfile(
  value: unknown,
  path: string,
  expectedId: string,
  idGuard: (id: unknown) => boolean,
  issues: PlayerCreationIssue[],
  personality: boolean,
): void {
  const profile = asRecord(value);
  if (profile === undefined) {
    addIssue(issues, 'creation.invalid_profile', path);
    return;
  }
  if (!idGuard(profile['id'])) {
    addIssue(issues, 'creation.invalid_profile', `${path}.id`);
  } else if (profile['id'] !== expectedId) {
    addIssue(issues, 'creation.profile_mismatch', `${path}.id`);
  }

  let hasInitialEffect = false;
  const attributeModifiers = profile['attributeModifiers'];
  if (!Array.isArray(attributeModifiers)) {
    addIssue(issues, 'creation.invalid_profile', `${path}.attributeModifiers`);
  } else {
    const seenAttributes = new Set<string>();
    for (const [index, rawModifier] of attributeModifiers.entries()) {
      const modifierPath = `${path}.attributeModifiers.${index}`;
      const modifier = asRecord(rawModifier);
      if (
        modifier === undefined ||
        !isPlayerAttributeId(modifier['attributeId']) ||
        !Number.isInteger(modifier['delta']) ||
        modifier['delta'] === 0
      ) {
        addIssue(issues, 'creation.invalid_modifier', modifierPath);
        continue;
      }
      hasInitialEffect = true;
      if (seenAttributes.has(modifier['attributeId'])) {
        addIssue(issues, 'creation.duplicate_modifier', `${modifierPath}.attributeId`);
      }
      seenAttributes.add(modifier['attributeId']);
    }
  }

  const stateModifiers = profile['stateModifiers'];
  if (!Array.isArray(stateModifiers)) {
    addIssue(issues, 'creation.invalid_profile', `${path}.stateModifiers`);
  } else {
    const seenStates = new Set<string>();
    for (const [index, rawModifier] of stateModifiers.entries()) {
      const modifierPath = `${path}.stateModifiers.${index}`;
      const modifier = asRecord(rawModifier);
      const validDelta =
        modifier !== undefined &&
        isCreationStateId(modifier['stateId']) &&
        typeof modifier['delta'] === 'number' &&
        Number.isFinite(modifier['delta']) &&
        modifier['delta'] !== 0 &&
        (modifier['stateId'] === 'state_gpa' || Number.isInteger(modifier['delta']));
      if (!validDelta || modifier === undefined || !isCreationStateId(modifier['stateId'])) {
        addIssue(issues, 'creation.invalid_modifier', modifierPath);
        continue;
      }
      hasInitialEffect = true;
      if (seenStates.has(modifier['stateId'])) {
        addIssue(issues, 'creation.duplicate_modifier', `${modifierPath}.stateId`);
      }
      seenStates.add(modifier['stateId']);
    }
  }

  const grantedTagIds = profile['grantedTagIds'];
  if (!Array.isArray(grantedTagIds)) {
    addIssue(issues, 'creation.invalid_profile', `${path}.grantedTagIds`);
  } else {
    const seenTags = new Set<string>();
    for (const [index, tagId] of grantedTagIds.entries()) {
      if (!isPlayerTagId(tagId)) {
        addIssue(issues, 'creation.invalid_tag', `${path}.grantedTagIds.${index}`);
      } else if (seenTags.has(tagId)) {
        addIssue(issues, 'creation.duplicate_tag', `${path}.grantedTagIds.${index}`);
      }
      if (typeof tagId === 'string') {
        seenTags.add(tagId);
      }
    }
  }

  if (!hasInitialEffect) {
    addIssue(issues, 'creation.profile_has_no_initial_effect', path);
  }

  if (personality) {
    const incompatibleTraitIds = profile['incompatibleTraitIds'];
    if (!Array.isArray(incompatibleTraitIds)) {
      addIssue(issues, 'creation.invalid_profile', `${path}.incompatibleTraitIds`);
    } else {
      const seenTraits = new Set<string>();
      for (const [index, traitId] of incompatibleTraitIds.entries()) {
        if (!isPersonalityTraitId(traitId) || traitId === profile['id']) {
          addIssue(issues, 'creation.invalid_profile', `${path}.incompatibleTraitIds.${index}`);
        } else if (seenTraits.has(traitId)) {
          addIssue(
            issues,
            'creation.duplicate_personality',
            `${path}.incompatibleTraitIds.${index}`,
          );
        }
        if (typeof traitId === 'string') {
          seenTraits.add(traitId);
        }
      }

      if (isPersonalityTraitId(profile['id'])) {
        const expectedIncompatibilities = [
          ...PERSONALITY_TRAIT_INCOMPATIBILITIES[profile['id']],
        ].sort(compareCodeUnits);
        const suppliedIncompatibilities = incompatibleTraitIds
          .filter(isPersonalityTraitId)
          .sort(compareCodeUnits);
        if (
          suppliedIncompatibilities.length !== expectedIncompatibilities.length ||
          suppliedIncompatibilities.some(
            (traitId, index) => traitId !== expectedIncompatibilities[index],
          )
        ) {
          addIssue(issues, 'creation.profile_mismatch', `${path}.incompatibleTraitIds`);
        }
      }
    }
  }
}

function validateMechanics(input: CreateWrCareerInput, issues: PlayerCreationIssue[]): void {
  validateBaseAttributes(input.mechanics?.baseAttributeRatings, issues);
  validateBaseState(input.mechanics?.baseState, issues);
  validateProfile(
    input.mechanics?.archetypeProfile,
    'mechanics.archetypeProfile',
    input.identity?.archetypeId,
    isWrArchetypeId,
    issues,
    false,
  );
  validateProfile(
    input.mechanics?.backgroundProfile,
    'mechanics.backgroundProfile',
    input.identity?.recruitingBackgroundId,
    isRecruitingBackgroundId,
    issues,
    false,
  );

  const profileValues: unknown = input.mechanics?.personalityProfiles;
  if (!Array.isArray(profileValues) || profileValues.length !== 2) {
    addIssue(issues, 'creation.invalid_profile', 'mechanics.personalityProfiles');
    return;
  }

  const selectedTraits: readonly unknown[] = Array.isArray(input.identity?.personalityTraitIds)
    ? input.identity.personalityTraitIds
    : [];
  for (const [index, profile] of profileValues.entries()) {
    const profileId = asRecord(profile)?.['id'];
    const expectedId = selectedTraits.includes(profileId)
      ? (profileId as string)
      : String(selectedTraits[index] ?? '');
    validateProfile(
      profile,
      `mechanics.personalityProfiles.${index}`,
      expectedId,
      isPersonalityTraitId,
      issues,
      true,
    );
  }

  const profileRecords = profileValues.map(asRecord);
  const profileIds = profileRecords.map((profile) => profile?.['id']);
  if (new Set(profileIds).size !== 2) {
    addIssue(issues, 'creation.duplicate_personality', 'mechanics.personalityProfiles');
  }
  for (const [index, selectedTrait] of selectedTraits.entries()) {
    if (!profileIds.includes(selectedTrait)) {
      addIssue(issues, 'creation.profile_mismatch', `mechanics.personalityProfiles.${index}.id`);
    }
  }

  const firstSelectedTrait = selectedTraits[0];
  const secondSelectedTrait = selectedTraits[1];
  if (
    isPersonalityTraitId(firstSelectedTrait) &&
    isPersonalityTraitId(secondSelectedTrait) &&
    !arePersonalityTraitsCompatible(firstSelectedTrait, secondSelectedTrait)
  ) {
    addIssue(issues, 'creation.incompatible_personality', 'identity.personalityTraitIds');
  }
}

function sortedIssues(issues: PlayerCreationIssue[]): readonly PlayerCreationIssue[] {
  return Object.freeze(
    issues.sort((left, right) => {
      const pathOrder = compareCodeUnits(left.path, right.path);
      return pathOrder === 0 ? compareCodeUnits(left.code, right.code) : pathOrder;
    }),
  );
}

function modifiersFromProfile(
  profile: IdentityCreationProfile<string>,
): readonly (AttributeCreationModifier | StateCreationModifier)[] {
  return [...profile.attributeModifiers, ...profile.stateModifiers];
}

function createAttributes(
  ratings: Readonly<Record<PlayerAttributeId, number>>,
): WrPlayerAttributes {
  const progress = (attributeId: PlayerAttributeId) => ({ rating: ratings[attributeId], xp: 0 });
  return {
    physical: {
      attribute_speed: progress('attribute_speed'),
      attribute_burst: progress('attribute_burst'),
      attribute_agility: progress('attribute_agility'),
      attribute_strength: progress('attribute_strength'),
      attribute_conditioning: progress('attribute_conditioning'),
      attribute_durability: progress('attribute_durability'),
    },
    mental: {
      attribute_football_iq: progress('attribute_football_iq'),
      attribute_composure: progress('attribute_composure'),
      attribute_discipline: progress('attribute_discipline'),
      attribute_work_ethic: progress('attribute_work_ethic'),
    },
    wr: {
      attribute_wr_release: progress('attribute_wr_release'),
      attribute_wr_route_running: progress('attribute_wr_route_running'),
      attribute_wr_hands: progress('attribute_wr_hands'),
      attribute_wr_catch_in_traffic: progress('attribute_wr_catch_in_traffic'),
      attribute_wr_yac: progress('attribute_wr_yac'),
      attribute_wr_blocking: progress('attribute_wr_blocking'),
    },
  };
}

function cloneAppearance(appearance: PlayerAppearance): PlayerAppearance {
  return {
    skinToneId: appearance.skinToneId,
    faceId: appearance.faceId,
    hairStyleId: appearance.hairStyleId,
    hairColorId: appearance.hairColorId,
    bodyTypeId: appearance.bodyTypeId,
    eyeBlackId: appearance.eyeBlackId,
    armSleevesId: appearance.armSleevesId,
    glovesId: appearance.glovesId,
    visorId: appearance.visorId,
    wristTapeId: appearance.wristTapeId,
    towelId: appearance.towelId,
    jerseyFitId: appearance.jerseyFitId,
    footwearId: appearance.footwearId,
  };
}

export function createWrCareer(input: CreateWrCareerInput): CreateWrCareerResult {
  const issues: PlayerCreationIssue[] = [];
  if (!validSeed(input?.careerSeed)) {
    addIssue(issues, 'creation.invalid_seed', 'careerSeed');
  }
  if (input?.careerId !== undefined && !isCareerId(input.careerId)) {
    addIssue(issues, 'creation.invalid_stable_id', 'careerId');
  }
  if (input?.playerId !== undefined && !isPlayerId(input.playerId)) {
    addIssue(issues, 'creation.invalid_stable_id', 'playerId');
  }
  validateIdentity(input, issues);
  validateMechanics(input, issues);

  if (issues.length > 0 || !validSeed(input.careerSeed)) {
    return deepFreeze({ ok: false, issues: sortedIssues(issues) });
  }

  const identity = input.identity;
  const personalityTraitIds = canonicalPersonalityIds(identity.personalityTraitIds);
  const personalityProfiles = [...input.mechanics.personalityProfiles].sort(
    (left, right) =>
      PERSONALITY_TRAIT_IDS.indexOf(left.id) - PERSONALITY_TRAIT_IDS.indexOf(right.id),
  );
  const profiles: readonly IdentityCreationProfile<string>[] = [
    input.mechanics.archetypeProfile,
    input.mechanics.backgroundProfile,
    ...personalityProfiles,
  ];

  const ratings = { ...input.mechanics.baseAttributeRatings };
  const state = { ...input.mechanics.baseState };
  for (const profile of profiles) {
    for (const modifier of modifiersFromProfile(profile)) {
      if ('attributeId' in modifier) {
        ratings[modifier.attributeId] += modifier.delta;
      } else {
        state[modifier.stateId] += modifier.delta;
      }
    }
  }

  for (const attributeId of PLAYER_ATTRIBUTE_IDS) {
    if (!isIntegerWithinBounds(ratings[attributeId], ATTRIBUTE_RATING_BOUNDS)) {
      addIssue(issues, 'creation.out_of_bounds', `player.attributes.${attributeId}`);
    }
  }
  for (const stateId of CREATION_STATE_IDS) {
    const stateValue = state[stateId];
    const valid =
      stateId === 'state_gpa'
        ? isWithinBounds(stateValue, GPA_BOUNDS)
        : isIntegerWithinBounds(stateValue, stateBounds(stateId));
    if (!valid) {
      addIssue(issues, 'creation.out_of_bounds', `player.${stateId}`);
    }
  }
  if (issues.length > 0) {
    return deepFreeze({ ok: false, issues: sortedIssues(issues) });
  }

  const playerState: PlayerState = {
    body: state.state_body,
    confidence: state.state_confidence,
    coachTrust: state.state_coach_trust,
    brand: state.state_brand,
    gpa: state.state_gpa,
  };
  const tagIds = [...new Set(profiles.flatMap((profile) => profile.grantedTagIds))].sort(
    compareCodeUnits,
  );
  const careerId = input.careerId ?? deriveCareerId(input.careerSeed);
  const playerId = input.playerId ?? derivePlayerId(input.careerSeed);
  const career: CareerRun = {
    schemaVersion: CAREER_SCHEMA_VERSION,
    id: careerId,
    careerSeed: input.careerSeed,
    rng: createRng(input.careerSeed),
    revision: 0,
    programId: null,
    weekIndex: 0,
    recentWeeklyActionIds: [],
    lastPassiveBodyRecovery: null,
    phase: { type: 'PLAN_ACTIONS' },
    player: {
      id: playerId,
      displayName: identity.displayName,
      positionId: POSITION_WR_ID,
      archetypeId: identity.archetypeId,
      recruitingBackgroundId: identity.recruitingBackgroundId,
      personalityTraitIds,
      appearance: cloneAppearance(identity.appearance),
      heightCm: identity.heightCm,
      weightKg: identity.weightKg,
      attributes: createAttributes(ratings),
      state: playerState,
      tagIds,
      skillState: createEmptyPlayerSkillState(),
      trainingProficiencyUses: Object.fromEntries(
        TRAINING_PROFICIENCY_IDS.map((proficiencyId) => [proficiencyId, 0]),
      ) as unknown as CareerRun['player']['trainingProficiencyUses'],
    },
  };

  const invariantResult = validateCareerRun(career);
  if (!invariantResult.ok) {
    return deepFreeze({
      ok: false,
      issues: invariantResult.issues.map((invariantIssue) => ({
        code: 'creation.invalid_result' as const,
        path: invariantIssue.path,
      })),
    });
  }

  return deepFreeze({ ok: true, career });
}

export function deriveWrOverall(career: Pick<CareerRun, 'player'>): number {
  const attributes = career.player.attributes;
  const ratings = [
    ...PHYSICAL_ATTRIBUTE_IDS.map((attributeId) => attributes.physical[attributeId].rating),
    ...MENTAL_ATTRIBUTE_IDS.map((attributeId) => attributes.mental[attributeId].rating),
    ...WR_ATTRIBUTE_IDS.map((attributeId) => attributes.wr[attributeId].rating),
  ];
  return Math.round(ratings.reduce((total, rating) => total + rating, 0) / ratings.length);
}
