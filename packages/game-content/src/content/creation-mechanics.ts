import {
  ATTRIBUTE_RATING_BOUNDS,
  BODY_BOUNDS,
  BRAND_BOUNDS,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  GPA_BOUNDS,
  isIntegerWithinBounds,
  isPersonalityTraitId,
  isPlayerTagId,
  isRecruitingBackgroundId,
  isWithinBounds,
  isWrArchetypeId,
  type CreationStateId,
  type IdentityCreationProfile,
  type InitialAttributeRatings,
  type InitialCreationState,
  type PersonalityCreationProfile,
  type PersonalityTraitId,
  type PlayerAttributeId,
  type PlayerTagId,
  type RecruitingBackgroundId,
  type WrArchetypeId,
  type WrCreationMechanics,
  type WrPlayerCreationIdentity,
} from '@project-saturday/game-core';

import {
  baseAttributeRatingsSchema,
  baseCreationStateSchema,
  type AttributeModifier,
  type StateModifier,
} from '../schema/creation.js';
import { defaultWrAppearance, wrBodyMeasurementOptions } from './appearance.js';
import { creationContent, isCompatiblePersonalitySelection } from './creation.js';

export const defaultWrCreationIdentity = {
  appearance: defaultWrAppearance,
  archetypeId: 'archetype_wr_deep_threat',
  heightCm: wrBodyMeasurementOptions.heightCm.defaultValue,
  personalityTraitIds: ['personality_competitive', 'personality_leader'],
  recruitingBackgroundId: 'background_blue_chip_star',
  weightKg: wrBodyMeasurementOptions.weightKg.defaultValue,
} as const satisfies Omit<WrPlayerCreationIdentity, 'displayName'>;

export interface BuildWrCreationMechanicsInput {
  readonly archetypeId: WrArchetypeId;
  readonly baseAttributeRatings?: Readonly<Partial<InitialAttributeRatings>>;
  readonly baseState?: Readonly<Partial<InitialCreationState>>;
  readonly personalityTraitIds: readonly [PersonalityTraitId, PersonalityTraitId];
  readonly recruitingBackgroundId: RecruitingBackgroundId;
}

export type BuildWrCreationMechanicsIssueCode =
  | 'creation-content.duplicate-personality'
  | 'creation-content.incompatible-personality'
  | 'creation-content.invalid-archetype'
  | 'creation-content.invalid-background'
  | 'creation-content.invalid-baseline'
  | 'creation-content.invalid-personality'
  | 'creation-content.invalid-personality-count'
  | 'creation-content.out-of-bounds';

export interface BuildWrCreationMechanicsIssue {
  readonly code: BuildWrCreationMechanicsIssueCode;
  readonly path: string;
}

export type BuildWrCreationMechanicsResult =
  | { readonly issues: readonly []; readonly mechanics: WrCreationMechanics; readonly ok: true }
  | {
      readonly issues: readonly BuildWrCreationMechanicsIssue[];
      readonly ok: false;
    };

interface ProjectableProfile<TId extends string> {
  readonly attributeModifiers: readonly AttributeModifier[];
  readonly grantedTagIds: readonly string[];
  readonly id: TId;
  readonly stateModifiers: readonly StateModifier[];
}

function addIssue(
  issues: BuildWrCreationMechanicsIssue[],
  code: BuildWrCreationMechanicsIssueCode,
  path: string,
): void {
  issues.push({ code, path });
}

function sortedIssues(
  issues: readonly BuildWrCreationMechanicsIssue[],
): readonly BuildWrCreationMechanicsIssue[] {
  return [...issues].sort((left, right) => {
    const pathOrder = compareCodeUnits(left.path, right.path);
    return pathOrder === 0 ? compareCodeUnits(left.code, right.code) : pathOrder;
  });
}

function compareCodeUnits(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function projectTagIds(tagIds: readonly string[]): readonly PlayerTagId[] {
  return tagIds.map((tagId) => {
    if (!isPlayerTagId(tagId)) {
      throw new Error(`Creation profile contains invalid player tag ID ${tagId}.`);
    }
    return tagId;
  });
}

function projectProfile<TId extends string>(
  profile: ProjectableProfile<TId>,
): IdentityCreationProfile<TId> {
  return {
    attributeModifiers: profile.attributeModifiers.map(({ attributeId, delta }) => ({
      attributeId,
      delta,
    })),
    grantedTagIds: projectTagIds(profile.grantedTagIds),
    id: profile.id,
    stateModifiers: profile.stateModifiers.map(({ delta, stateId }) => ({ delta, stateId })),
  };
}

function projectPersonalityProfile(
  profile: (typeof creationContent.personalityTraits)[number],
): PersonalityCreationProfile {
  return {
    ...projectProfile(profile),
    incompatibleTraitIds: [...profile.incompatibleTraitIds],
  };
}

function stateBounds(stateId: CreationStateId) {
  switch (stateId) {
    case 'state_body':
      return BODY_BOUNDS;
    case 'state_brand':
      return BRAND_BOUNDS;
    case 'state_coach_trust':
      return COACH_TRUST_BOUNDS;
    case 'state_confidence':
      return CONFIDENCE_BOUNDS;
    case 'state_gpa':
      return GPA_BOUNDS;
  }
}

function validateResultBounds(
  mechanics: WrCreationMechanics,
  issues: BuildWrCreationMechanicsIssue[],
): void {
  const ratings: Record<PlayerAttributeId, number> = {
    ...mechanics.baseAttributeRatings,
  };
  const state: Record<CreationStateId, number> = { ...mechanics.baseState };
  const profiles = [
    mechanics.archetypeProfile,
    mechanics.backgroundProfile,
    ...mechanics.personalityProfiles,
  ];

  for (const profile of profiles) {
    for (const { attributeId, delta } of profile.attributeModifiers) {
      ratings[attributeId] += delta;
    }
    for (const { delta, stateId } of profile.stateModifiers) {
      state[stateId] += delta;
    }
  }

  for (const [attributeId, rating] of Object.entries(ratings) as [PlayerAttributeId, number][]) {
    if (!isIntegerWithinBounds(rating, ATTRIBUTE_RATING_BOUNDS)) {
      addIssue(issues, 'creation-content.out-of-bounds', `result.attributes.${attributeId}`);
    }
  }
  for (const [stateId, value] of Object.entries(state) as [CreationStateId, number][]) {
    const valid =
      stateId === 'state_gpa'
        ? isWithinBounds(value, GPA_BOUNDS)
        : isIntegerWithinBounds(value, stateBounds(stateId));
    if (!valid) {
      addIssue(issues, 'creation-content.out-of-bounds', `result.state.${stateId}`);
    }
  }
}

/**
 * Projects localized creation content into the browser-independent game-core input shape.
 * Optional baselines are fixture/tuning overrides; profile rules remain content-owned.
 */
export function buildWrCreationMechanics(
  input: BuildWrCreationMechanicsInput,
): BuildWrCreationMechanicsResult {
  const issues: BuildWrCreationMechanicsIssue[] = [];
  const archetype = isWrArchetypeId(input.archetypeId)
    ? creationContent.wrArchetypes.find(({ id }) => id === input.archetypeId)
    : undefined;
  if (archetype === undefined) {
    addIssue(issues, 'creation-content.invalid-archetype', 'archetypeId');
  }

  const background = isRecruitingBackgroundId(input.recruitingBackgroundId)
    ? creationContent.recruitingBackgrounds.find(({ id }) => id === input.recruitingBackgroundId)
    : undefined;
  if (background === undefined) {
    addIssue(issues, 'creation-content.invalid-background', 'recruitingBackgroundId');
  }

  const traitIds: readonly unknown[] = Array.isArray(input.personalityTraitIds)
    ? input.personalityTraitIds
    : [];
  if (traitIds.length !== 2) {
    addIssue(issues, 'creation-content.invalid-personality-count', 'personalityTraitIds');
  }
  traitIds.forEach((traitId, index) => {
    if (!isPersonalityTraitId(traitId)) {
      addIssue(issues, 'creation-content.invalid-personality', `personalityTraitIds.${index}`);
    }
  });
  if (traitIds.length === 2 && traitIds[0] === traitIds[1]) {
    addIssue(issues, 'creation-content.duplicate-personality', 'personalityTraitIds');
  }

  const validTraitPair =
    traitIds.length === 2 && isPersonalityTraitId(traitIds[0]) && isPersonalityTraitId(traitIds[1])
      ? ([traitIds[0], traitIds[1]] as const)
      : undefined;
  if (validTraitPair !== undefined && !isCompatiblePersonalitySelection(validTraitPair)) {
    addIssue(issues, 'creation-content.incompatible-personality', 'personalityTraitIds');
  }

  const parsedRatings = baseAttributeRatingsSchema.safeParse({
    ...creationContent.baseline.baseAttributeRatings,
    ...input.baseAttributeRatings,
  });
  if (!parsedRatings.success) {
    for (const schemaIssue of parsedRatings.error.issues) {
      addIssue(
        issues,
        'creation-content.invalid-baseline',
        `baseAttributeRatings.${schemaIssue.path.map(String).join('.')}`.replace(/\.$/u, ''),
      );
    }
  }

  const parsedState = baseCreationStateSchema.safeParse({
    ...creationContent.baseline.baseState,
    ...input.baseState,
  });
  if (!parsedState.success) {
    for (const schemaIssue of parsedState.error.issues) {
      addIssue(
        issues,
        'creation-content.invalid-baseline',
        `baseState.${schemaIssue.path.map(String).join('.')}`.replace(/\.$/u, ''),
      );
    }
  }

  if (
    archetype === undefined ||
    background === undefined ||
    validTraitPair === undefined ||
    issues.length > 0 ||
    !parsedRatings.success ||
    !parsedState.success
  ) {
    return { issues: sortedIssues(issues), ok: false };
  }

  const firstPersonality = creationContent.personalityTraits.find(
    ({ id }) => id === validTraitPair[0],
  );
  const secondPersonality = creationContent.personalityTraits.find(
    ({ id }) => id === validTraitPair[1],
  );
  if (firstPersonality === undefined || secondPersonality === undefined) {
    addIssue(issues, 'creation-content.invalid-personality', 'personalityTraitIds');
    return { issues: sortedIssues(issues), ok: false };
  }

  const mechanics: WrCreationMechanics = {
    archetypeProfile: projectProfile(archetype),
    backgroundProfile: projectProfile(background),
    baseAttributeRatings: parsedRatings.data,
    baseState: parsedState.data,
    personalityProfiles: [
      projectPersonalityProfile(firstPersonality),
      projectPersonalityProfile(secondPersonality),
    ],
  };
  validateResultBounds(mechanics, issues);

  return issues.length === 0
    ? { issues: [], mechanics, ok: true }
    : { issues: sortedIssues(issues), ok: false };
}
