import {
  buildWrCreationMechanics,
  defaultWrCreationIdentity,
} from '@project-saturday/game-content/content';
import { createWrCareer, validateCareerRun } from '@project-saturday/game-core';
import type {
  CareerId,
  CareerRun,
  InitialAttributeRatings,
  InitialCreationState,
  PersonalityTraitId,
  PlayerAppearance,
  PlayerCreationIssue,
  PlayerId,
  RecruitingBackgroundId,
  RngSeed,
  WrArchetypeId,
} from '@project-saturday/game-core';
import type { BuildWrCreationMechanicsIssue } from '@project-saturday/game-content/content';

export interface WrCareerFixtureOptions {
  readonly careerSeed: RngSeed;
  readonly displayName?: string;
  readonly careerId?: CareerId;
  readonly playerId?: PlayerId;
  readonly archetypeId?: WrArchetypeId;
  readonly recruitingBackgroundId?: RecruitingBackgroundId;
  readonly personalityTraitIds?: readonly [PersonalityTraitId, PersonalityTraitId];
  readonly appearance?: PlayerAppearance;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly baseAttributeRatingOverrides?: Readonly<Partial<InitialAttributeRatings>>;
  readonly baseStateOverrides?: Readonly<Partial<InitialCreationState>>;
}

export type WrCareerFixtureErrorStage = 'content_mechanics' | 'career_creation';

export class WrCareerFixtureError extends Error {
  public readonly stage: WrCareerFixtureErrorStage;
  public readonly issues: readonly (BuildWrCreationMechanicsIssue | PlayerCreationIssue)[];

  public constructor(
    stage: WrCareerFixtureErrorStage,
    issues: readonly (BuildWrCreationMechanicsIssue | PlayerCreationIssue)[],
  ) {
    super(`WR career fixture failed at ${stage}: ${JSON.stringify(issues)}`);
    this.name = 'WrCareerFixtureError';
    this.stage = stage;
    this.issues = Object.freeze([...issues]);
  }
}

/**
 * Builds a valid deterministic career through content-owned creation mechanics and game-core.
 * Overrides are fixture inputs only; profile rules and baseline defaults remain content-owned.
 */
export function createWrCareerFixture(options: WrCareerFixtureOptions): CareerRun {
  const archetypeId = options.archetypeId ?? defaultWrCreationIdentity.archetypeId;
  const recruitingBackgroundId =
    options.recruitingBackgroundId ?? defaultWrCreationIdentity.recruitingBackgroundId;
  const personalityTraitIds =
    options.personalityTraitIds ?? defaultWrCreationIdentity.personalityTraitIds;
  const mechanicsResult = buildWrCreationMechanics({
    archetypeId,
    recruitingBackgroundId,
    personalityTraitIds,
    ...(options.baseAttributeRatingOverrides === undefined
      ? {}
      : { baseAttributeRatings: options.baseAttributeRatingOverrides }),
    ...(options.baseStateOverrides === undefined ? {} : { baseState: options.baseStateOverrides }),
  });
  if (!mechanicsResult.ok) {
    throw new WrCareerFixtureError('content_mechanics', mechanicsResult.issues);
  }

  const creationResult = createWrCareer({
    careerSeed: options.careerSeed,
    ...(options.careerId === undefined ? {} : { careerId: options.careerId }),
    ...(options.playerId === undefined ? {} : { playerId: options.playerId }),
    identity: {
      appearance: options.appearance ?? defaultWrCreationIdentity.appearance,
      archetypeId,
      displayName: options.displayName ?? 'Deterministic Test Athlete',
      heightCm: options.heightCm ?? defaultWrCreationIdentity.heightCm,
      personalityTraitIds,
      recruitingBackgroundId,
      weightKg: options.weightKg ?? defaultWrCreationIdentity.weightKg,
    },
    mechanics: mechanicsResult.mechanics,
  });
  if (!creationResult.ok) {
    throw new WrCareerFixtureError('career_creation', creationResult.issues);
  }
  if (!validateCareerRun(creationResult.career).ok) {
    throw new WrCareerFixtureError('career_creation', [
      { code: 'creation.invalid_result', path: 'career' },
    ]);
  }
  return creationResult.career;
}
