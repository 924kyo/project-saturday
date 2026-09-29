import {
  PERSONALITY_TRAIT_IDS,
  isPersonalityTraitId,
  isPlayerArchetypeId,
  isPlayerTagId,
  isPositionId,
  isRecruitingBackgroundId,
  type MultiPositionAttributeId,
  type PersonalityTraitId,
  type PlayerArchetypeId,
  type PlayerTagId,
  type PositionCreationMechanics,
  type PositionIdentityCreationProfile,
  type PositionPersonalityCreationProfile,
  type PositionId,
  type RecruitingBackgroundId,
} from '@project-saturday/game-core';

import { creationContent, isCompatiblePersonalitySelection } from './creation.js';
import { positionAlphaContent } from './positions.js';

export interface BuildPositionCreationMechanicsInput {
  readonly archetypeId: PlayerArchetypeId;
  readonly personalityTraitIds: readonly [PersonalityTraitId, PersonalityTraitId];
  readonly positionId: PositionId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
}

export type BuildPositionCreationMechanicsIssueCode =
  | 'position-creation-content.duplicate-personality'
  | 'position-creation-content.incompatible-personality'
  | 'position-creation-content.invalid-archetype'
  | 'position-creation-content.invalid-background'
  | 'position-creation-content.invalid-personality'
  | 'position-creation-content.invalid-position';

export interface BuildPositionCreationMechanicsIssue {
  readonly code: BuildPositionCreationMechanicsIssueCode;
  readonly path: string;
}

export type BuildPositionCreationMechanicsResult =
  | {
      readonly issues: readonly [];
      readonly mechanics: PositionCreationMechanics;
      readonly ok: true;
    }
  | { readonly issues: readonly BuildPositionCreationMechanicsIssue[]; readonly ok: false };

function projectTags(tagIds: readonly string[]): readonly PlayerTagId[] {
  return tagIds.map((tagId) => {
    if (!isPlayerTagId(tagId)) {
      throw new Error(`Position creation content has invalid player tag ${tagId}.`);
    }
    return tagId;
  });
}

function projectProfile<TId extends string>(profile: {
  readonly attributeModifiers: readonly {
    readonly attributeId: MultiPositionAttributeId;
    readonly delta: number;
  }[];
  readonly grantedTagIds: readonly string[];
  readonly id: TId;
  readonly stateModifiers: readonly {
    readonly delta: number;
    readonly stateId:
      'state_body' | 'state_brand' | 'state_coach_trust' | 'state_confidence' | 'state_gpa';
  }[];
}): PositionIdentityCreationProfile<TId> {
  return {
    attributeModifiers: profile.attributeModifiers.map(({ attributeId, delta }) => ({
      attributeId,
      delta,
    })),
    grantedTagIds: projectTags(profile.grantedTagIds),
    id: profile.id,
    stateModifiers: profile.stateModifiers.map(({ delta, stateId }) => ({ delta, stateId })),
  };
}

function projectPersonality(
  profile: (typeof creationContent.personalityTraits)[number],
): PositionPersonalityCreationProfile {
  return {
    ...projectProfile(profile),
    incompatibleTraitIds: [...profile.incompatibleTraitIds],
  };
}

function sortedIssues(
  issues: BuildPositionCreationMechanicsIssue[],
): readonly BuildPositionCreationMechanicsIssue[] {
  return issues.sort((left, right) =>
    left.path === right.path
      ? left.code.localeCompare(right.code)
      : left.path.localeCompare(right.path),
  );
}

export function buildPositionCreationMechanics(
  input: BuildPositionCreationMechanicsInput,
): BuildPositionCreationMechanicsResult {
  const issues: BuildPositionCreationMechanicsIssue[] = [];
  const positionId = isPositionId(input?.positionId) ? input.positionId : undefined;
  if (positionId === undefined) {
    issues.push({
      code: 'position-creation-content.invalid-position',
      path: 'positionId',
    });
  }
  const archetype = isPlayerArchetypeId(input?.archetypeId)
    ? positionAlphaContent.creationMechanics.archetypeProfiles.find(
        (profile) => profile.id === input.archetypeId && profile.positionId === input.positionId,
      )
    : undefined;
  if (archetype === undefined) {
    issues.push({
      code: 'position-creation-content.invalid-archetype',
      path: 'archetypeId',
    });
  }
  const background = isRecruitingBackgroundId(input?.recruitingBackgroundId)
    ? positionAlphaContent.creationMechanics.backgroundProfiles.find(
        (profile) =>
          profile.id === input.recruitingBackgroundId && profile.positionId === input.positionId,
      )
    : undefined;
  if (background === undefined) {
    issues.push({
      code: 'position-creation-content.invalid-background',
      path: 'recruitingBackgroundId',
    });
  }
  const baseline = positionAlphaContent.creationMechanics.baselines.find(
    (candidate) => candidate.positionId === input?.positionId,
  );

  const traitIds: readonly unknown[] = Array.isArray(input?.personalityTraitIds)
    ? input.personalityTraitIds
    : [];
  if (traitIds.length !== 2) {
    issues.push({
      code: 'position-creation-content.invalid-personality',
      path: 'personalityTraitIds',
    });
  }
  traitIds.forEach((traitId, index) => {
    if (!isPersonalityTraitId(traitId)) {
      issues.push({
        code: 'position-creation-content.invalid-personality',
        path: `personalityTraitIds.${index}`,
      });
    }
  });
  if (traitIds.length === 2 && traitIds[0] === traitIds[1]) {
    issues.push({
      code: 'position-creation-content.duplicate-personality',
      path: 'personalityTraitIds',
    });
  }
  const traitPair =
    traitIds.length === 2 && isPersonalityTraitId(traitIds[0]) && isPersonalityTraitId(traitIds[1])
      ? ([traitIds[0], traitIds[1]] as const)
      : undefined;
  if (traitPair !== undefined && !isCompatiblePersonalitySelection(traitPair)) {
    issues.push({
      code: 'position-creation-content.incompatible-personality',
      path: 'personalityTraitIds',
    });
  }
  const personalityProfiles =
    traitPair === undefined
      ? undefined
      : traitPair.map((traitId) =>
          creationContent.personalityTraits.find((profile) => profile.id === traitId),
        );
  if (personalityProfiles?.some((profile) => profile === undefined)) {
    issues.push({
      code: 'position-creation-content.invalid-personality',
      path: 'personalityTraitIds',
    });
  }

  if (
    issues.length > 0 ||
    positionId === undefined ||
    archetype === undefined ||
    background === undefined ||
    baseline === undefined ||
    traitPair === undefined ||
    personalityProfiles === undefined ||
    personalityProfiles[0] === undefined ||
    personalityProfiles[1] === undefined
  ) {
    return { issues: sortedIssues(issues), ok: false };
  }
  const mechanics: PositionCreationMechanics = {
    archetypeProfile: projectProfile(archetype),
    backgroundProfile: projectProfile(background),
    baseAttributeRatings: { ...baseline.baseAttributeRatings },
    baseState: { ...baseline.baseState },
    personalityProfiles: [
      projectPersonality(personalityProfiles[0]),
      projectPersonality(personalityProfiles[1]),
    ],
  };
  return { issues: [], mechanics, ok: true };
}

export const positionCreationArchetypeIds = Object.freeze(
  positionAlphaContent.creationMechanics.archetypeProfiles.map(({ id }) => id),
);

export const positionCreationPersonalityIds = PERSONALITY_TRAIT_IDS;
