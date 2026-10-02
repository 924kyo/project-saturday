import type { RngSeed } from '../random/rng.js';
import {
  ATTRIBUTE_RATING_BOUNDS,
  BODY_BOUNDS,
  BRAND_BOUNDS,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
  HEIGHT_CM_BOUNDS,
  INITIAL_PREPARATION,
  WEIGHT_KG_BOUNDS,
  isIntegerWithinBounds,
  isWithinBounds,
} from './bounds.js';
import { derivePlayerId } from './creation.js';
import { deepFreeze } from './immutable.js';
import {
  CREATION_STATE_IDS,
  PERSONALITY_TRAIT_IDS,
  PERSONALITY_TRAIT_INCOMPATIBILITIES,
  arePersonalityTraitsCompatible,
  isCbArchetypeId,
  isEdgeArchetypeId,
  isLbArchetypeId,
  isCreationStateId,
  isPersonalityTraitId,
  isPlayerArchetypeId,
  isPlayerId,
  isPlayerTagId,
  isPositionId,
  isQbArchetypeId,
  isRbArchetypeId,
  isRecruitingBackgroundId,
  isStableDomainId,
  isWrArchetypeId,
  type CreationStateId,
  type MultiPositionAttributeId,
  type PersonalityTraitId,
  type PlayerArchetypeId,
  type PlayerId,
  type PlayerTagId,
  type PositionId,
  type RecruitingBackgroundId,
} from './ids.js';
import { compareCodeUnits } from './order.js';
import {
  derivePositionOverall,
  getPlayableAttributeIds,
  type PositionAttributeProgress,
} from './progression.js';
import type { PlayerAppearance, PlayerState } from './types.js';

export type PositionInitialAttributeRatings = Readonly<
  Partial<Record<MultiPositionAttributeId, number>>
>;
export type PositionInitialCreationState = Readonly<Record<CreationStateId, number>>;

export interface PositionAttributeCreationModifier {
  readonly attributeId: MultiPositionAttributeId;
  readonly delta: number;
}

export interface PositionStateCreationModifier {
  readonly stateId: CreationStateId;
  readonly delta: number;
}

export interface PositionIdentityCreationProfile<TId extends string> {
  readonly attributeModifiers: readonly PositionAttributeCreationModifier[];
  readonly grantedTagIds: readonly PlayerTagId[];
  readonly id: TId;
  readonly stateModifiers: readonly PositionStateCreationModifier[];
}

export interface PositionPersonalityCreationProfile extends PositionIdentityCreationProfile<PersonalityTraitId> {
  readonly incompatibleTraitIds: readonly PersonalityTraitId[];
}

export interface PositionCreationMechanics {
  readonly archetypeProfile: PositionIdentityCreationProfile<PlayerArchetypeId>;
  readonly backgroundProfile: PositionIdentityCreationProfile<RecruitingBackgroundId>;
  readonly baseAttributeRatings: PositionInitialAttributeRatings;
  readonly baseState: PositionInitialCreationState;
  readonly personalityProfiles: readonly [
    PositionPersonalityCreationProfile,
    PositionPersonalityCreationProfile,
  ];
}

export interface PositionPlayerCreationIdentity {
  readonly appearance: PlayerAppearance;
  readonly archetypeId: PlayerArchetypeId;
  readonly displayName: string;
  readonly heightCm: number;
  readonly personalityTraitIds: readonly [PersonalityTraitId, PersonalityTraitId];
  readonly positionId: PositionId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly weightKg: number;
}

export interface CreatePositionPlayerProfileInput {
  readonly careerSeed: RngSeed;
  readonly identity: PositionPlayerCreationIdentity;
  readonly mechanics: PositionCreationMechanics;
  readonly playerId?: PlayerId;
}

export interface CreatedPositionPlayerProfile extends PositionPlayerCreationIdentity {
  readonly attributes: PositionAttributeProgress;
  readonly id: PlayerId;
  readonly overall: number;
  readonly state: PlayerState;
  readonly tagIds: readonly PlayerTagId[];
}

export type PositionPlayerCreationIssueCode =
  | 'position_creation.duplicate_modifier'
  | 'position_creation.duplicate_personality'
  | 'position_creation.duplicate_tag'
  | 'position_creation.incompatible_personality'
  | 'position_creation.invalid_appearance'
  | 'position_creation.invalid_archetype_position'
  | 'position_creation.invalid_baseline'
  | 'position_creation.invalid_body_measurement'
  | 'position_creation.invalid_display_name'
  | 'position_creation.invalid_id'
  | 'position_creation.invalid_modifier'
  | 'position_creation.invalid_profile'
  | 'position_creation.invalid_seed'
  | 'position_creation.invalid_tag'
  | 'position_creation.out_of_bounds'
  | 'position_creation.profile_has_no_effect'
  | 'position_creation.profile_mismatch';

export interface PositionPlayerCreationIssue {
  readonly code: PositionPlayerCreationIssueCode;
  readonly path: string;
}

export type CreatePositionPlayerProfileResult =
  | { readonly ok: true; readonly player: CreatedPositionPlayerProfile }
  | { readonly ok: false; readonly issues: readonly PositionPlayerCreationIssue[] };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function validSeed(seed: unknown): seed is RngSeed {
  return (
    (typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= 0xffff_ffff) ||
    (typeof seed === 'string' && seed.length > 0 && seed.length <= 256)
  );
}

function addIssue(
  issues: PositionPlayerCreationIssue[],
  code: PositionPlayerCreationIssueCode,
  path: string,
): void {
  issues.push({ code, path });
}

function archetypeMatchesPosition(positionId: unknown, archetypeId: unknown): boolean {
  return (
    (positionId === 'position_wr' && isWrArchetypeId(archetypeId)) ||
    (positionId === 'position_qb' && isQbArchetypeId(archetypeId)) ||
    (positionId === 'position_rb' && isRbArchetypeId(archetypeId)) ||
    (positionId === 'position_cb' && isCbArchetypeId(archetypeId)) ||
    (positionId === 'position_lb' && isLbArchetypeId(archetypeId)) ||
    (positionId === 'position_edge' && isEdgeArchetypeId(archetypeId))
  );
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

function validateAppearance(value: unknown, issues: PositionPlayerCreationIssue[]): void {
  const appearance = asRecord(value);
  const required = {
    bodyTypeId: 'body_type_',
    faceId: 'face_',
    footwearId: 'footwear_',
    hairColorId: 'hair_color_',
    hairStyleId: 'hair_style_',
    jerseyFitId: 'jersey_fit_',
    skinToneId: 'skin_tone_',
  } as const;
  const optional = {
    armSleevesId: 'arm_sleeves_',
    eyeBlackId: 'eye_black_',
    glovesId: 'gloves_',
    towelId: 'towel_',
    visorId: 'visor_',
    wristTapeId: 'wrist_tape_',
  } as const;
  const expectedKeys = new Set([...Object.keys(required), ...Object.keys(optional)]);
  // M12: facial hair is an optional key, so identities saved before it stay valid.
  const additiveKeys = new Set(['facialHairId']);
  const keys = appearance === undefined ? [] : Object.keys(appearance);
  if (
    appearance === undefined ||
    keys.filter((key) => !additiveKeys.has(key)).length !== expectedKeys.size ||
    keys.some((key) => !expectedKeys.has(key) && !additiveKeys.has(key))
  ) {
    addIssue(issues, 'position_creation.invalid_appearance', 'identity.appearance');
    return;
  }
  for (const [key, prefix] of Object.entries(required)) {
    if (!isStableDomainId(appearance[key]) || !(appearance[key] as string).startsWith(prefix)) {
      addIssue(issues, 'position_creation.invalid_appearance', `identity.appearance.${key}`);
    }
  }
  for (const [key, prefix] of Object.entries(optional)) {
    const id = appearance[key];
    if (id !== null && (!isStableDomainId(id) || !id.startsWith(prefix))) {
      addIssue(issues, 'position_creation.invalid_appearance', `identity.appearance.${key}`);
    }
  }
  const facialHair = appearance['facialHairId'];
  if (
    facialHair !== undefined &&
    facialHair !== null &&
    (!isStableDomainId(facialHair) || !facialHair.startsWith('facial_hair_'))
  ) {
    addIssue(issues, 'position_creation.invalid_appearance', 'identity.appearance.facialHairId');
  }
}

function validateIdentity(
  identity: unknown,
  issues: PositionPlayerCreationIssue[],
): identity is PositionPlayerCreationIdentity {
  const record = asRecord(identity);
  if (record === undefined) {
    addIssue(issues, 'position_creation.invalid_profile', 'identity');
    return false;
  }
  const identityKeys = new Set([
    'appearance',
    'archetypeId',
    'displayName',
    'heightCm',
    'personalityTraitIds',
    'positionId',
    'recruitingBackgroundId',
    'weightKg',
  ]);
  for (const key of Object.keys(record)) {
    if (!identityKeys.has(key)) {
      addIssue(issues, 'position_creation.invalid_profile', `identity.${key}`);
    }
  }
  const displayName = record['displayName'];
  if (
    typeof displayName !== 'string' ||
    displayName.trim() !== displayName ||
    [...displayName].length < 1 ||
    [...displayName].length > 40 ||
    [...displayName].some((character) => (character.codePointAt(0) ?? 0) <= 0x1f)
  ) {
    addIssue(issues, 'position_creation.invalid_display_name', 'identity.displayName');
  }
  if (!isPositionId(record['positionId']) || !isPlayerArchetypeId(record['archetypeId'])) {
    addIssue(issues, 'position_creation.invalid_id', 'identity.positionId');
  } else if (!archetypeMatchesPosition(record['positionId'], record['archetypeId'])) {
    addIssue(issues, 'position_creation.invalid_archetype_position', 'identity.archetypeId');
  }
  if (!isRecruitingBackgroundId(record['recruitingBackgroundId'])) {
    addIssue(issues, 'position_creation.invalid_id', 'identity.recruitingBackgroundId');
  }
  const traits = record['personalityTraitIds'];
  if (!Array.isArray(traits) || traits.length !== 2) {
    addIssue(issues, 'position_creation.invalid_profile', 'identity.personalityTraitIds');
  } else {
    traits.forEach((traitId, index) => {
      if (!isPersonalityTraitId(traitId)) {
        addIssue(issues, 'position_creation.invalid_id', `identity.personalityTraitIds.${index}`);
      }
    });
    if (traits[0] === traits[1]) {
      addIssue(issues, 'position_creation.duplicate_personality', 'identity.personalityTraitIds');
    }
    if (
      isPersonalityTraitId(traits[0]) &&
      isPersonalityTraitId(traits[1]) &&
      !arePersonalityTraitsCompatible(traits[0], traits[1])
    ) {
      addIssue(
        issues,
        'position_creation.incompatible_personality',
        'identity.personalityTraitIds',
      );
    }
  }
  if (!isIntegerWithinBounds(record['heightCm'], HEIGHT_CM_BOUNDS)) {
    addIssue(issues, 'position_creation.invalid_body_measurement', 'identity.heightCm');
  }
  if (!isIntegerWithinBounds(record['weightKg'], WEIGHT_KG_BOUNDS)) {
    addIssue(issues, 'position_creation.invalid_body_measurement', 'identity.weightKg');
  }
  validateAppearance(record['appearance'], issues);
  return true;
}

function validateBase(
  positionId: PositionId,
  mechanics: UnknownRecord,
  issues: PositionPlayerCreationIssue[],
): void {
  const mechanicsKeys = new Set([
    'archetypeProfile',
    'backgroundProfile',
    'baseAttributeRatings',
    'baseState',
    'personalityProfiles',
  ]);
  for (const key of Object.keys(mechanics)) {
    if (!mechanicsKeys.has(key)) {
      addIssue(issues, 'position_creation.invalid_profile', `mechanics.${key}`);
    }
  }
  const ratings = asRecord(mechanics['baseAttributeRatings']);
  const expectedAttributeIds = getPlayableAttributeIds(positionId);
  const expected = new Set<string>(expectedAttributeIds);
  if (ratings === undefined) {
    addIssue(issues, 'position_creation.invalid_baseline', 'mechanics.baseAttributeRatings');
  } else {
    for (const attributeId of expectedAttributeIds) {
      if (!isIntegerWithinBounds(ratings[attributeId], ATTRIBUTE_RATING_BOUNDS)) {
        addIssue(
          issues,
          'position_creation.invalid_baseline',
          `mechanics.baseAttributeRatings.${attributeId}`,
        );
      }
    }
    for (const attributeId of Object.keys(ratings)) {
      if (!expected.has(attributeId)) {
        addIssue(
          issues,
          'position_creation.invalid_baseline',
          `mechanics.baseAttributeRatings.${attributeId}`,
        );
      }
    }
  }

  const state = asRecord(mechanics['baseState']);
  if (state === undefined) {
    addIssue(issues, 'position_creation.invalid_baseline', 'mechanics.baseState');
  } else {
    for (const stateId of CREATION_STATE_IDS) {
      const valid =
        stateId === 'state_gpa'
          ? isWithinBounds(state[stateId], GPA_BOUNDS)
          : isIntegerWithinBounds(state[stateId], stateBounds(stateId));
      if (!valid) {
        addIssue(issues, 'position_creation.invalid_baseline', `mechanics.baseState.${stateId}`);
      }
    }
    for (const stateId of Object.keys(state)) {
      if (!isCreationStateId(stateId)) {
        addIssue(issues, 'position_creation.invalid_baseline', `mechanics.baseState.${stateId}`);
      }
    }
  }
}

function validateProfile(
  value: unknown,
  path: string,
  expectedId: string,
  allowedAttributes: ReadonlySet<string>,
  issues: PositionPlayerCreationIssue[],
  personality: boolean,
): void {
  const profile = asRecord(value);
  if (profile === undefined) {
    addIssue(issues, 'position_creation.invalid_profile', path);
    return;
  }
  const expectedProfileKeys = new Set([
    'attributeModifiers',
    'grantedTagIds',
    'id',
    'stateModifiers',
    ...(personality ? ['incompatibleTraitIds'] : []),
  ]);
  for (const key of Object.keys(profile)) {
    if (!expectedProfileKeys.has(key)) {
      addIssue(issues, 'position_creation.invalid_profile', `${path}.${key}`);
    }
  }
  if (profile['id'] !== expectedId) {
    addIssue(issues, 'position_creation.profile_mismatch', `${path}.id`);
  }
  let hasEffect = false;
  const attributeModifiers = profile['attributeModifiers'];
  if (!Array.isArray(attributeModifiers)) {
    addIssue(issues, 'position_creation.invalid_profile', `${path}.attributeModifiers`);
  } else {
    const seen = new Set<string>();
    for (const [index, value] of attributeModifiers.entries()) {
      const modifier = asRecord(value);
      const attributeId = modifier?.['attributeId'];
      if (
        typeof attributeId !== 'string' ||
        !allowedAttributes.has(attributeId) ||
        !Number.isInteger(modifier?.['delta']) ||
        modifier?.['delta'] === 0
      ) {
        addIssue(
          issues,
          'position_creation.invalid_modifier',
          `${path}.attributeModifiers.${index}`,
        );
      } else {
        hasEffect = true;
        if (seen.has(attributeId)) {
          addIssue(
            issues,
            'position_creation.duplicate_modifier',
            `${path}.attributeModifiers.${index}.attributeId`,
          );
        }
        seen.add(attributeId);
      }
    }
  }
  const stateModifiers = profile['stateModifiers'];
  if (!Array.isArray(stateModifiers)) {
    addIssue(issues, 'position_creation.invalid_profile', `${path}.stateModifiers`);
  } else {
    const seen = new Set<string>();
    for (const [index, value] of stateModifiers.entries()) {
      const modifier = asRecord(value);
      const stateId = modifier?.['stateId'];
      const delta = modifier?.['delta'];
      if (
        !isCreationStateId(stateId) ||
        typeof delta !== 'number' ||
        !Number.isFinite(delta) ||
        delta === 0 ||
        (stateId !== 'state_gpa' && !Number.isInteger(delta))
      ) {
        addIssue(issues, 'position_creation.invalid_modifier', `${path}.stateModifiers.${index}`);
      } else {
        hasEffect = true;
        if (seen.has(stateId)) {
          addIssue(
            issues,
            'position_creation.duplicate_modifier',
            `${path}.stateModifiers.${index}.stateId`,
          );
        }
        seen.add(stateId);
      }
    }
  }
  const tags = profile['grantedTagIds'];
  if (!Array.isArray(tags)) {
    addIssue(issues, 'position_creation.invalid_profile', `${path}.grantedTagIds`);
  } else {
    const seen = new Set<string>();
    for (const [index, tagId] of tags.entries()) {
      if (!isPlayerTagId(tagId)) {
        addIssue(issues, 'position_creation.invalid_tag', `${path}.grantedTagIds.${index}`);
      } else if (seen.has(tagId)) {
        addIssue(issues, 'position_creation.duplicate_tag', `${path}.grantedTagIds.${index}`);
      } else {
        seen.add(tagId);
      }
    }
  }
  if (!hasEffect) {
    addIssue(issues, 'position_creation.profile_has_no_effect', path);
  }
  if (personality) {
    const incompatibilities = profile['incompatibleTraitIds'];
    if (!isPersonalityTraitId(profile['id']) || !Array.isArray(incompatibilities)) {
      addIssue(issues, 'position_creation.invalid_profile', `${path}.incompatibleTraitIds`);
    } else {
      const expected = [...PERSONALITY_TRAIT_INCOMPATIBILITIES[profile['id']]].sort(
        compareCodeUnits,
      );
      const actual = incompatibilities.filter(isPersonalityTraitId).sort(compareCodeUnits);
      if (
        actual.length !== incompatibilities.length ||
        actual.length !== expected.length ||
        actual.some((id, index) => id !== expected[index])
      ) {
        addIssue(issues, 'position_creation.profile_mismatch', `${path}.incompatibleTraitIds`);
      }
    }
  }
}

function sortedIssues(
  issues: PositionPlayerCreationIssue[],
): readonly PositionPlayerCreationIssue[] {
  return deepFreeze(
    issues.sort((left, right) => {
      const pathOrder = compareCodeUnits(left.path, right.path);
      return pathOrder === 0 ? compareCodeUnits(left.code, right.code) : pathOrder;
    }),
  );
}

function cloneAppearance(appearance: PlayerAppearance): PlayerAppearance {
  return { ...appearance };
}

export function createPositionPlayerProfile(
  input: CreatePositionPlayerProfileInput,
): CreatePositionPlayerProfileResult {
  const issues: PositionPlayerCreationIssue[] = [];
  if (!validSeed(input?.careerSeed)) {
    addIssue(issues, 'position_creation.invalid_seed', 'careerSeed');
  }
  if (input?.playerId !== undefined && !isPlayerId(input.playerId)) {
    addIssue(issues, 'position_creation.invalid_id', 'playerId');
  }
  const identityValid = validateIdentity(input?.identity, issues);
  const positionId = isPositionId(input?.identity?.positionId)
    ? input.identity.positionId
    : undefined;
  const mechanics = asRecord(input?.mechanics);
  if (mechanics === undefined) {
    addIssue(issues, 'position_creation.invalid_profile', 'mechanics');
  } else if (positionId !== undefined) {
    validateBase(positionId, mechanics, issues);
    const allowedAttributes = new Set<string>(getPlayableAttributeIds(positionId));
    validateProfile(
      mechanics['archetypeProfile'],
      'mechanics.archetypeProfile',
      String(input.identity.archetypeId),
      allowedAttributes,
      issues,
      false,
    );
    validateProfile(
      mechanics['backgroundProfile'],
      'mechanics.backgroundProfile',
      String(input.identity.recruitingBackgroundId),
      allowedAttributes,
      issues,
      false,
    );
    const profiles = mechanics['personalityProfiles'];
    if (!Array.isArray(profiles) || profiles.length !== 2) {
      addIssue(issues, 'position_creation.invalid_profile', 'mechanics.personalityProfiles');
    } else {
      const selectedTraits = Array.isArray(input.identity.personalityTraitIds)
        ? input.identity.personalityTraitIds
        : [];
      for (const [index, traitId] of selectedTraits.entries()) {
        const matchingProfile = profiles.find((profile) => asRecord(profile)?.['id'] === traitId);
        validateProfile(
          matchingProfile,
          `mechanics.personalityProfiles.${index}`,
          String(traitId),
          allowedAttributes,
          issues,
          true,
        );
      }
      const profileIds = profiles.map((profile) => asRecord(profile)?.['id']);
      if (new Set(profileIds).size !== 2) {
        addIssue(
          issues,
          'position_creation.duplicate_personality',
          'mechanics.personalityProfiles',
        );
      }
    }
  }
  if (
    issues.length > 0 ||
    !identityValid ||
    positionId === undefined ||
    mechanics === undefined ||
    !validSeed(input.careerSeed)
  ) {
    return deepFreeze({ ok: false, issues: sortedIssues(issues) });
  }

  const identity = input.identity;
  const baseRatings = mechanics['baseAttributeRatings'] as Record<MultiPositionAttributeId, number>;
  const baseState = mechanics['baseState'] as Record<CreationStateId, number>;
  const personalityProfiles = [...input.mechanics.personalityProfiles].sort(
    (left, right) =>
      PERSONALITY_TRAIT_IDS.indexOf(left.id) - PERSONALITY_TRAIT_IDS.indexOf(right.id),
  );
  const profiles: readonly PositionIdentityCreationProfile<string>[] = [
    input.mechanics.archetypeProfile,
    input.mechanics.backgroundProfile,
    ...personalityProfiles,
  ];
  const ratings = { ...baseRatings };
  const state = { ...baseState };
  for (const profile of profiles) {
    for (const modifier of profile.attributeModifiers) {
      ratings[modifier.attributeId] += modifier.delta;
    }
    for (const modifier of profile.stateModifiers) {
      state[modifier.stateId] += modifier.delta;
    }
  }
  for (const attributeId of getPlayableAttributeIds(positionId)) {
    if (!isIntegerWithinBounds(ratings[attributeId], ATTRIBUTE_RATING_BOUNDS)) {
      addIssue(issues, 'position_creation.out_of_bounds', `player.attributes.${attributeId}`);
    }
  }
  for (const stateId of CREATION_STATE_IDS) {
    const valid =
      stateId === 'state_gpa'
        ? isWithinBounds(state[stateId], GPA_BOUNDS)
        : isIntegerWithinBounds(state[stateId], stateBounds(stateId));
    if (!valid) {
      addIssue(issues, 'position_creation.out_of_bounds', `player.state.${stateId}`);
    }
  }
  if (issues.length > 0) {
    return deepFreeze({ ok: false, issues: sortedIssues(issues) });
  }

  const attributes = Object.fromEntries(
    getPlayableAttributeIds(positionId).map((attributeId) => [
      attributeId,
      { rating: ratings[attributeId], xp: 0 },
    ]),
  ) as PositionAttributeProgress;
  const overallResult = derivePositionOverall(positionId, attributes);
  if (!overallResult.ok) {
    return deepFreeze({
      ok: false,
      issues: overallResult.issues.map(({ path }) => ({
        code: 'position_creation.invalid_baseline' as const,
        path,
      })),
    });
  }
  const personalityTraitIds = [...identity.personalityTraitIds].sort(
    (left, right) => PERSONALITY_TRAIT_IDS.indexOf(left) - PERSONALITY_TRAIT_IDS.indexOf(right),
  ) as [PersonalityTraitId, PersonalityTraitId];
  const tagIds = [...new Set(profiles.flatMap(({ grantedTagIds }) => grantedTagIds))].sort(
    compareCodeUnits,
  );
  return deepFreeze({
    ok: true,
    player: {
      ...identity,
      appearance: cloneAppearance(identity.appearance),
      attributes,
      id: input.playerId ?? derivePlayerId(input.careerSeed),
      overall: overallResult.overall,
      personalityTraitIds,
      state: {
        body: state.state_body,
        brand: state.state_brand,
        coachTrust: state.state_coach_trust,
        confidence: state.state_confidence,
        gpa: state.state_gpa,
        preparation: INITIAL_PREPARATION,
      },
      tagIds,
    },
  });
}
