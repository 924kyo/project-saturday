import { describe, expect, it } from 'vitest';
import {
  CREATION_STATE_IDS as CORE_CREATION_STATE_IDS,
  PERSONALITY_TRAIT_IDS as CORE_PERSONALITY_TRAIT_IDS,
  PERSONALITY_TRAIT_INCOMPATIBILITIES as CORE_PERSONALITY_TRAIT_INCOMPATIBILITIES,
  PLAYER_ATTRIBUTE_IDS as CORE_PLAYER_ATTRIBUTE_IDS,
  RECRUITING_BACKGROUND_IDS as CORE_RECRUITING_BACKGROUND_IDS,
  WR_ARCHETYPE_IDS as CORE_WR_ARCHETYPE_IDS,
} from '@project-saturday/game-core';

import {
  contentManifest,
  creationContent,
  isCompatiblePersonalitySelection,
} from '../content/index.js';
import { localeMessages, type SupportedLocale } from '../locales/index.js';
import {
  PERSONALITY_TRAIT_IDS,
  PLAYER_ATTRIBUTE_IDS,
  PLAYER_STATE_IDS,
  RECRUITING_BACKGROUND_IDS,
  WR_ARCHETYPE_IDS,
} from '../schema/creation.js';
import {
  ContentValidationError,
  assertValidContent,
  validateContent,
  validateShippedContent,
} from './content.js';
import type { ValidationIssue, ValidationResult } from './types.js';

type MutableResources = Record<SupportedLocale, Record<string, unknown>>;

function cloneResources(): MutableResources {
  return {
    'en-US': { ...localeMessages['en-US'] },
    'ko-KR': { ...localeMessages['ko-KR'] },
  };
}

function expectIssues(result: ValidationResult): readonly ValidationIssue[] {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected content validation to fail.');
  }
  return result.issues;
}

function definition(id: string) {
  return {
    descriptionKey: 'app.subtitle',
    id,
    nameKey: 'app.title',
  };
}

function manifestWithDefinitions(definitions: readonly ReturnType<typeof definition>[]) {
  return {
    ...contentManifest,
    definitions,
  } as const;
}

describe('content validation', () => {
  it('ships the complete, valid M1 creation manifest without generic placeholders', () => {
    expect(contentManifest.definitions).toEqual([]);
    expect(contentManifest.creation.wrArchetypes.map(({ id }) => id)).toEqual(WR_ARCHETYPE_IDS);
    expect(contentManifest.creation.recruitingBackgrounds.map(({ id }) => id)).toEqual(
      RECRUITING_BACKGROUND_IDS,
    );
    expect(contentManifest.creation.personalityTraits.map(({ id }) => id)).toEqual(
      PERSONALITY_TRAIT_IDS,
    );
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
  });

  it('keeps every controlled creation ID exactly aligned with game-core', () => {
    expect(PLAYER_ATTRIBUTE_IDS).toEqual(CORE_PLAYER_ATTRIBUTE_IDS);
    expect(PLAYER_STATE_IDS).toEqual(CORE_CREATION_STATE_IDS);
    expect(WR_ARCHETYPE_IDS).toEqual(CORE_WR_ARCHETYPE_IDS);
    expect(RECRUITING_BACKGROUND_IDS).toEqual(CORE_RECRUITING_BACKGROUND_IDS);
    expect(PERSONALITY_TRAIT_IDS).toEqual(CORE_PERSONALITY_TRAIT_IDS);
    expect(
      Object.fromEntries(
        creationContent.personalityTraits.map(({ id, incompatibleTraitIds }) => [
          id,
          incompatibleTraitIds,
        ]),
      ),
    ).toEqual(CORE_PERSONALITY_TRAIT_INCOMPATIBILITIES);
  });

  it('accepts a valid test-only localized definition', () => {
    expect(
      validateContent({
        localeResources: localeMessages,
        manifest: manifestWithDefinitions([definition('skill_foundation_fixture')]),
      }),
    ).toEqual({ issues: [], ok: true });
  });

  it('reports strict schema failures with structured paths', () => {
    const issues = expectIssues(
      validateContent({
        localeResources: localeMessages,
        manifest: {
          creation: creationContent,
          definitions: [
            {
              ...definition('Not Valid'),
              inlineDisplayName: 'Do not allow inline copy',
            },
          ],
          schemaVersion: 2,
        },
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'content.invalid-schema',
          path: expect.stringMatching(/^manifest\.definitions\.0/),
        }),
      ]),
    );
  });

  it('rejects duplicate stable content IDs', () => {
    const issues = expectIssues(
      validateContent({
        localeResources: localeMessages,
        manifest: manifestWithDefinitions([
          definition('skill_duplicate_fixture'),
          definition('skill_duplicate_fixture'),
        ]),
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'content.duplicate-id',
        contentId: 'skill_duplicate_fixture',
        path: 'manifest.definitions.1.id',
      }),
    );
  });

  it('rejects a content key missing from both locales', () => {
    const issues = expectIssues(
      validateContent({
        localeResources: localeMessages,
        manifest: manifestWithDefinitions([
          {
            ...definition('skill_missing_copy_fixture'),
            nameKey: 'skills.missing.name',
          },
        ]),
      }),
    );

    expect(
      issues.filter(
        (issue) =>
          issue.code === 'content.missing-localization-reference' &&
          issue.messageKey === 'skills.missing.name',
      ),
    ).toHaveLength(2);
  });

  it('rejects a referenced key present in only one locale', () => {
    const resources = cloneResources();
    resources['ko-KR']['skills.oneSided.name'] = '한쪽만 있는 이름';
    const issues = expectIssues(
      validateContent({
        localeResources: resources,
        manifest: manifestWithDefinitions([
          {
            ...definition('skill_one_sided_fixture'),
            nameKey: 'skills.oneSided.name',
          },
        ]),
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'content.missing-localization-reference',
        locale: 'en-US',
        messageKey: 'skills.oneSided.name',
      }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'locale.missing-key',
        locale: 'en-US',
        messageKey: 'skills.oneSided.name',
      }),
    );
  });

  it('throws a structured aggregate error at the assertion boundary', () => {
    const input = {
      localeResources: localeMessages,
      manifest: manifestWithDefinitions([
        definition('duplicate_fixture'),
        definition('duplicate_fixture'),
      ]),
    } as const;

    expect(() => assertValidContent(input)).toThrow(ContentValidationError);
  });

  it('orders the same issues deterministically on every run', () => {
    const input = {
      localeResources: localeMessages,
      manifest: manifestWithDefinitions([
        {
          descriptionKey: 'skills.missing.description',
          id: 'skill_repeat_fixture',
          nameKey: 'skills.missing.name',
        },
        {
          descriptionKey: 'skills.missing.description',
          id: 'skill_repeat_fixture',
          nameKey: 'skills.missing.name',
        },
      ]),
    } as const;

    const result = validateContent(input);
    const issues = expectIssues(result);

    expect(
      issues.map(({ code, locale, messageKey, path }) => ({ code, locale, messageKey, path })),
    ).toEqual([
      {
        code: 'content.duplicate-id',
        locale: undefined,
        messageKey: undefined,
        path: 'manifest.definitions.1.id',
      },
      ...(['en-US', 'ko-KR'] as const).flatMap((locale) =>
        (['description', 'name'] as const).flatMap((field) =>
          [0, 1].map((index) => ({
            code: 'content.missing-localization-reference',
            locale,
            messageKey: `skills.missing.${field}`,
            path: `manifest.definitions.${index}.${field}Key`,
          })),
        ),
      ),
    ]);
  });

  it('rejects a creation category that does not have its exact required cardinality', () => {
    const result = validateContent({
      localeResources: localeMessages,
      manifest: {
        ...contentManifest,
        creation: {
          ...contentManifest.creation,
          wrArchetypes: contentManifest.creation.wrArchetypes.slice(0, 2),
        },
      },
    });

    expect(expectIssues(result)).toContainEqual(
      expect.objectContaining({
        code: 'content.invalid-schema',
        path: 'manifest.creation.wrArchetypes',
      }),
    );
  });

  it('gives every creation choice a positive and negative initialization tradeoff', () => {
    const definitions = [
      ...creationContent.wrArchetypes,
      ...creationContent.recruitingBackgrounds,
      ...creationContent.personalityTraits,
    ];

    for (const definition of definitions) {
      const deltas = [
        ...definition.attributeModifiers.map(({ delta }) => delta),
        ...definition.stateModifiers.map(({ delta }) => delta),
      ];
      expect(
        deltas.some((delta) => delta > 0),
        definition.id,
      ).toBe(true);
      expect(
        deltas.some((delta) => delta < 0),
        definition.id,
      ).toBe(true);
      expect(definition.grantedTagIds.length, definition.id).toBeGreaterThan(0);
    }
  });

  it('rejects unknown, asymmetric, self, and duplicate personality incompatibility references', () => {
    const unknownReference = contentManifest.creation.personalityTraits.map((trait) =>
      trait.id === 'personality_competitive'
        ? { ...trait, incompatibleTraitIds: ['personality_unknown'] }
        : trait,
    );
    const asymmetricReference = contentManifest.creation.personalityTraits.map((trait) =>
      trait.id === 'personality_social' ? { ...trait, incompatibleTraitIds: [] } : trait,
    );
    const selfReference = contentManifest.creation.personalityTraits.map((trait) =>
      trait.id === 'personality_competitive'
        ? { ...trait, incompatibleTraitIds: ['personality_competitive'] }
        : trait,
    );
    const duplicateReference = contentManifest.creation.personalityTraits.map((trait) =>
      trait.id === 'personality_quiet'
        ? {
            ...trait,
            incompatibleTraitIds: ['personality_social', 'personality_social'],
          }
        : trait,
    );

    for (const personalityTraits of [
      unknownReference,
      asymmetricReference,
      selfReference,
      duplicateReference,
    ]) {
      const issues = expectIssues(
        validateContent({
          localeResources: localeMessages,
          manifest: {
            ...contentManifest,
            creation: { ...contentManifest.creation, personalityTraits },
          },
        }),
      );
      expect(issues).toContainEqual(expect.objectContaining({ code: 'content.invalid-reference' }));
    }
  });

  it('accepts exactly two distinct compatible personality traits', () => {
    expect(
      isCompatiblePersonalitySelection(['personality_competitive', 'personality_leader']),
    ).toBe(true);
    expect(isCompatiblePersonalitySelection(['personality_quiet', 'personality_social'])).toBe(
      false,
    );
    expect(
      isCompatiblePersonalitySelection(['personality_competitive', 'personality_competitive']),
    ).toBe(false);
    expect(isCompatiblePersonalitySelection(['personality_competitive'])).toBe(false);
    expect(
      isCompatiblePersonalitySelection([
        'personality_competitive',
        'personality_leader',
        'personality_confident',
      ]),
    ).toBe(false);
  });

  it('rejects invalid ICU syntax in referenced creation copy', () => {
    const resources = cloneResources();
    resources['en-US']['creation.archetypes.deepThreat.description'] = '{playerName';

    expect(
      expectIssues(validateContent({ localeResources: resources, manifest: contentManifest })),
    ).toContainEqual(
      expect.objectContaining({
        code: 'locale.invalid-icu-message',
        locale: 'en-US',
        messageKey: 'creation.archetypes.deepThreat.description',
      }),
    );
  });
});
