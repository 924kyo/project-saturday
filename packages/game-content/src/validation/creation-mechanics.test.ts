import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_RATING_BOUNDS,
  BODY_BOUNDS,
  BRAND_BOUNDS,
  COACH_TRUST_BOUNDS,
  CONFIDENCE_BOUNDS,
  CREATION_STATE_IDS as CORE_CREATION_STATE_IDS,
  GPA_BOUNDS,
  HEIGHT_CM_BOUNDS,
  PLAYER_ATTRIBUTE_IDS as CORE_PLAYER_ATTRIBUTE_IDS,
  WEIGHT_KG_BOUNDS,
  arePersonalityTraitsCompatible,
  createWrCareer,
  validateCareerRun,
  type CareerRun,
  type PlayerAppearance,
} from '@project-saturday/game-core';

import {
  appearanceCatalog,
  buildWrCreationMechanics,
  contentManifest,
  creationContent,
  defaultWrAppearance,
  defaultWrCreationIdentity,
  wrBodyMeasurementOptions,
} from '../content/index.js';
import { localeMessages, type SupportedLocale } from '../locales/index.js';
import {
  APPEARANCE_OPTION_CARDINALITIES,
  NULLABLE_APPEARANCE_FIELDS,
  appearanceCatalogSchema,
  playerAppearanceSchema,
  wrBodyMeasurementOptionsSchema,
} from '../schema/appearance.js';
import {
  PERSONALITY_TRAIT_IDS,
  PLAYER_ATTRIBUTE_IDS,
  PLAYER_STATE_IDS,
  RECRUITING_BACKGROUND_IDS,
  WR_ARCHETYPE_IDS,
  wrCreationBaselineSchema,
} from '../schema/creation.js';
import { CONTENT_COMPATIBILITY_VERSION, contentManifestSchema } from '../schema/content.js';
import { validateContent, validateShippedContent } from './content.js';
import type { ValidationIssue, ValidationResult } from './types.js';

type AppearanceField = keyof PlayerAppearance;
type MutableResources = Record<SupportedLocale, Record<string, unknown>>;

const APPEARANCE_FIELDS = [
  'armSleevesId',
  'bodyTypeId',
  'eyeBlackId',
  'faceId',
  'footwearId',
  'glovesId',
  'hairColorId',
  'hairStyleId',
  'jerseyFitId',
  'skinToneId',
  'towelId',
  'visorId',
  'wristTapeId',
] as const satisfies readonly AppearanceField[];

function expectIssues(result: ValidationResult): readonly ValidationIssue[] {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected content validation to fail.');
  }
  return result.issues;
}

function cloneResources(): MutableResources {
  return {
    'en-US': { ...localeMessages['en-US'] },
    'ko-KR': { ...localeMessages['ko-KR'] },
  };
}

function expectBoundedCareer(career: CareerRun): void {
  expect(validateCareerRun(career)).toEqual({ issues: [], ok: true });
  const attributeProgress = [
    ...Object.values(career.player.attributes.physical),
    ...Object.values(career.player.attributes.mental),
    ...Object.values(career.player.attributes.wr),
  ];
  for (const progress of attributeProgress) {
    expect(progress.rating).toBeGreaterThanOrEqual(ATTRIBUTE_RATING_BOUNDS.min);
    expect(progress.rating).toBeLessThanOrEqual(ATTRIBUTE_RATING_BOUNDS.max);
  }
  expect(career.player.state.body).toBeGreaterThanOrEqual(BODY_BOUNDS.min);
  expect(career.player.state.body).toBeLessThanOrEqual(BODY_BOUNDS.max);
  expect(career.player.state.brand).toBeGreaterThanOrEqual(BRAND_BOUNDS.min);
  expect(career.player.state.brand).toBeLessThanOrEqual(BRAND_BOUNDS.max);
  expect(career.player.state.coachTrust).toBeGreaterThanOrEqual(COACH_TRUST_BOUNDS.min);
  expect(career.player.state.coachTrust).toBeLessThanOrEqual(COACH_TRUST_BOUNDS.max);
  expect(career.player.state.confidence).toBeGreaterThanOrEqual(CONFIDENCE_BOUNDS.min);
  expect(career.player.state.confidence).toBeLessThanOrEqual(CONFIDENCE_BOUNDS.max);
  expect(career.player.state.gpa).toBeGreaterThanOrEqual(GPA_BOUNDS.min);
  expect(career.player.state.gpa).toBeLessThanOrEqual(GPA_BOUNDS.max);
}

function buildDefaultMechanics() {
  const result = buildWrCreationMechanics(defaultWrCreationIdentity);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.mechanics;
}

describe('WR creation mechanics adapter', () => {
  it('ships a complete bounded baseline aligned exactly with game-core IDs', () => {
    expect(PLAYER_ATTRIBUTE_IDS).toEqual(CORE_PLAYER_ATTRIBUTE_IDS);
    expect(PLAYER_STATE_IDS).toEqual(CORE_CREATION_STATE_IDS);
    expect(Object.keys(creationContent.baseline.baseAttributeRatings).sort()).toEqual(
      [...CORE_PLAYER_ATTRIBUTE_IDS].sort(),
    );
    expect(Object.keys(creationContent.baseline.baseState).sort()).toEqual(
      [...CORE_CREATION_STATE_IDS].sort(),
    );
    expect(wrCreationBaselineSchema.safeParse(creationContent.baseline).success).toBe(true);
  });

  it('projects all 390 valid mechanical identity combinations into bounded CareerRuns', () => {
    let combinationCount = 0;
    for (const archetypeId of WR_ARCHETYPE_IDS) {
      for (const recruitingBackgroundId of RECRUITING_BACKGROUND_IDS) {
        for (const [leftIndex, leftId] of PERSONALITY_TRAIT_IDS.entries()) {
          for (const rightId of PERSONALITY_TRAIT_IDS.slice(leftIndex + 1)) {
            if (!arePersonalityTraitsCompatible(leftId, rightId)) {
              continue;
            }

            combinationCount += 1;
            const mechanicsResult = buildWrCreationMechanics({
              archetypeId,
              personalityTraitIds: [leftId, rightId],
              recruitingBackgroundId,
            });
            expect(mechanicsResult.ok, JSON.stringify(mechanicsResult)).toBe(true);
            if (!mechanicsResult.ok) {
              continue;
            }

            const careerResult = createWrCareer({
              careerSeed: combinationCount,
              identity: {
                ...defaultWrCreationIdentity,
                archetypeId,
                displayName: `WR ${combinationCount}`,
                personalityTraitIds: [leftId, rightId],
                recruitingBackgroundId,
              },
              mechanics: mechanicsResult.mechanics,
            });
            expect(careerResult.ok, JSON.stringify(careerResult)).toBe(true);
            if (careerResult.ok) {
              expectBoundedCareer(careerResult.career);
            }
          }
        }
      }
    }
    expect(combinationCount).toBe(390);
  });

  it('supports partial mechanical baseline overrides without mutating caller input', () => {
    const baseAttributeRatings = { attribute_speed: 70 } as const;
    const baseState = { state_body: 80, state_gpa: 3.4 } as const;
    const result = buildWrCreationMechanics({
      ...defaultWrCreationIdentity,
      baseAttributeRatings,
      baseState,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mechanics.baseAttributeRatings.attribute_speed).toBe(70);
      expect(result.mechanics.baseAttributeRatings.attribute_burst).toBe(
        creationContent.baseline.baseAttributeRatings.attribute_burst,
      );
      expect(result.mechanics.baseState.state_body).toBe(80);
      expect(result.mechanics.baseState.state_gpa).toBe(3.4);
      expect(result.mechanics.archetypeProfile).not.toBe(creationContent.wrArchetypes[0]);
    }
    expect(baseAttributeRatings).toEqual({ attribute_speed: 70 });
    expect(baseState).toEqual({ state_body: 80, state_gpa: 3.4 });
  });

  it('returns deterministic structured failures for invalid selections and bounds', () => {
    const invalidInput = {
      archetypeId: 'archetype_wr_unknown',
      baseAttributeRatings: { attribute_speed: 100 },
      baseState: { state_gpa: 5 },
      personalityTraitIds: ['personality_quiet', 'personality_social'],
      recruitingBackgroundId: 'background_unknown',
    } as unknown as Parameters<typeof buildWrCreationMechanics>[0];

    const first = buildWrCreationMechanics(invalidInput);
    const second = buildWrCreationMechanics(invalidInput);
    expect(first).toEqual(second);
    expect(first.ok).toBe(false);
    if (!first.ok) {
      expect(first.issues).toEqual([
        { code: 'creation-content.invalid-archetype', path: 'archetypeId' },
        { code: 'creation-content.invalid-baseline', path: 'baseState.state_gpa' },
        {
          code: 'creation-content.incompatible-personality',
          path: 'personalityTraitIds',
        },
        { code: 'creation-content.invalid-background', path: 'recruitingBackgroundId' },
      ]);
    }

    const resultOutOfBounds = buildWrCreationMechanics({
      ...defaultWrCreationIdentity,
      baseAttributeRatings: { attribute_speed: 100 },
    });
    expect(resultOutOfBounds).toEqual({
      issues: [
        {
          code: 'creation-content.out-of-bounds',
          path: 'result.attributes.attribute_speed',
        },
      ],
      ok: false,
    });
  });
});

describe('appearance and content compatibility catalogs', () => {
  it('ships an explicit compatibility version in the strict manifest', () => {
    expect(CONTENT_COMPATIBILITY_VERSION).toBe(1);
    expect(contentManifest.contentVersion).toBe(CONTENT_COMPATIBILITY_VERSION);
    expect(contentManifestSchema.safeParse(contentManifest).success).toBe(true);
    expect(contentManifestSchema.safeParse({ ...contentManifest, contentVersion: 2 }).success).toBe(
      false,
    );
  });

  it('covers every PlayerAppearance field with exact cardinality and explicit none options', () => {
    expect(Object.keys(appearanceCatalog).sort()).toEqual([...APPEARANCE_FIELDS].sort());
    expect(appearanceCatalogSchema.safeParse(appearanceCatalog).success).toBe(true);
    expect(playerAppearanceSchema.safeParse(defaultWrAppearance).success).toBe(true);
    expect(contentManifest.creation.defaultAppearance).toEqual(defaultWrAppearance);
    expect(wrBodyMeasurementOptionsSchema.safeParse(wrBodyMeasurementOptions).success).toBe(true);

    for (const field of APPEARANCE_FIELDS) {
      const category = appearanceCatalog[field];
      expect(category.options, field).toHaveLength(APPEARANCE_OPTION_CARDINALITIES[field]);
      const nullOptions = category.options.filter(({ id }) => id === null);
      if (NULLABLE_APPEARANCE_FIELDS.includes(field as never)) {
        expect(nullOptions, field).toHaveLength(1);
        expect(category.options[0]?.id, field).toBeNull();
      } else {
        expect(nullOptions, field).toHaveLength(0);
      }
      expect(Object.keys(category).sort(), field).toEqual(['labelKey', 'options']);
      for (const option of category.options) {
        expect(Object.keys(option).sort(), `${field}:${String(option.id)}`).toEqual([
          'id',
          'nameKey',
        ]);
      }
    }
  });

  it('uses metric defaults inside both catalog and core persistence bounds', () => {
    expect(defaultWrCreationIdentity.heightCm).toBe(wrBodyMeasurementOptions.heightCm.defaultValue);
    expect(defaultWrCreationIdentity.weightKg).toBe(wrBodyMeasurementOptions.weightKg.defaultValue);
    expect(defaultWrCreationIdentity.heightCm).toBeGreaterThanOrEqual(HEIGHT_CM_BOUNDS.min);
    expect(defaultWrCreationIdentity.heightCm).toBeLessThanOrEqual(HEIGHT_CM_BOUNDS.max);
    expect(defaultWrCreationIdentity.weightKg).toBeGreaterThanOrEqual(WEIGHT_KG_BOUNDS.min);
    expect(defaultWrCreationIdentity.weightKg).toBeLessThanOrEqual(WEIGHT_KG_BOUNDS.max);
  });

  it('creates a valid CareerRun with every individual appearance option', () => {
    const mechanics = buildDefaultMechanics();
    let optionCount = 0;
    for (const field of APPEARANCE_FIELDS) {
      for (const option of appearanceCatalog[field].options) {
        optionCount += 1;
        const appearance = {
          ...defaultWrAppearance,
          [field]: option.id,
        } as PlayerAppearance;
        const result = createWrCareer({
          careerSeed: `appearance-${field}-${String(option.id)}`,
          identity: {
            ...defaultWrCreationIdentity,
            appearance,
            displayName: 'Catalog WR',
          },
          mechanics,
        });
        expect(result.ok, `${field}:${String(option.id)} ${JSON.stringify(result)}`).toBe(true);
        if (result.ok) {
          expect(result.career.player.appearance[field]).toBe(option.id);
          expectBoundedCareer(result.career);
        }
      }
    }
    expect(optionCount).toBe(51);
  });

  it('rejects malformed appearance prefixes, duplicates, and missing explicit none', () => {
    const invalidCatalogs = [
      {
        ...appearanceCatalog,
        bodyTypeId: {
          ...appearanceCatalog.bodyTypeId,
          options: [
            { ...appearanceCatalog.bodyTypeId.options[0], id: 'face_wrong_namespace' },
            ...appearanceCatalog.bodyTypeId.options.slice(1),
          ],
        },
      },
      {
        ...appearanceCatalog,
        faceId: {
          ...appearanceCatalog.faceId,
          options: [
            appearanceCatalog.faceId.options[0],
            appearanceCatalog.faceId.options[0],
            ...appearanceCatalog.faceId.options.slice(2),
          ],
        },
      },
      {
        ...appearanceCatalog,
        visorId: {
          ...appearanceCatalog.visorId,
          options: [
            appearanceCatalog.visorId.options[1],
            appearanceCatalog.visorId.options[2],
            appearanceCatalog.visorId.options[1],
          ],
        },
      },
    ];

    for (const appearanceCatalogValue of invalidCatalogs) {
      const issues = expectIssues(
        validateContent({
          localeResources: localeMessages,
          manifest: {
            ...contentManifest,
            creation: {
              ...contentManifest.creation,
              appearanceCatalog: appearanceCatalogValue,
            },
          },
        }),
      );
      expect(issues).toContainEqual(
        expect.objectContaining({
          code: 'content.invalid-schema',
          path: expect.stringMatching(/^manifest\.creation\.appearanceCatalog/u),
        }),
      );
    }
  });

  it('rejects a well-formed default appearance ID absent from its option catalog', () => {
    const issues = expectIssues(
      validateContent({
        localeResources: localeMessages,
        manifest: {
          ...contentManifest,
          creation: {
            ...contentManifest.creation,
            defaultAppearance: {
              ...contentManifest.creation.defaultAppearance,
              faceId: 'face_not_in_catalog',
            },
          },
        },
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'content.invalid-schema',
        path: 'manifest.creation.defaultAppearance.faceId',
      }),
    );
  });

  it('validates every appearance localization reference and ICU message', () => {
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
    const missingResources = cloneResources();
    delete missingResources['en-US']['creation.appearance.faces.oval'];
    delete missingResources['ko-KR']['creation.appearance.fields.heightCm'];
    const missingIssues = expectIssues(
      validateContent({ localeResources: missingResources, manifest: contentManifest }),
    );
    expect(missingIssues).toContainEqual(
      expect.objectContaining({
        code: 'content.missing-localization-reference',
        locale: 'en-US',
        messageKey: 'creation.appearance.faces.oval',
      }),
    );
    expect(missingIssues).toContainEqual(
      expect.objectContaining({
        code: 'content.missing-localization-reference',
        locale: 'ko-KR',
        messageKey: 'creation.appearance.fields.heightCm',
      }),
    );

    const malformedResources = cloneResources();
    malformedResources['ko-KR']['creation.appearance.faces.oval'] = '{count, plural';
    expect(
      expectIssues(
        validateContent({ localeResources: malformedResources, manifest: contentManifest }),
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: 'locale.invalid-icu-message',
        locale: 'ko-KR',
        messageKey: 'creation.appearance.faces.oval',
      }),
    );
  });
});
