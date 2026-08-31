import { describe, expect, it } from 'vitest';

import { localeMessages, type SupportedLocale } from '../locales/index.js';
import { validateLocalizationResources } from './localization.js';
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
    throw new Error('Expected localization validation to fail.');
  }
  return result.issues;
}

describe('validateLocalizationResources', () => {
  it('accepts the shipped bilingual ICU catalogs', () => {
    expect(validateLocalizationResources(localeMessages)).toEqual({
      issues: [],
      ok: true,
    });
  });

  it('allows locale-specific plural branches with the same numeric contract', () => {
    const result = validateLocalizationResources({
      'en-US': {
        'test.playerCount': '{count, plural, one {# player} other {# players}}',
      },
      'ko-KR': {
        'test.playerCount': '{count, plural, other {선수 #명}}',
      },
    });

    expect(result.ok).toBe(true);
  });

  it.each([
    ['en-US', 'app.title'],
    ['ko-KR', 'locale.label'],
  ] as const)('rejects a key missing from %s', (locale, messageKey) => {
    const resources = cloneResources();
    delete resources[locale][messageKey];

    expect(expectIssues(validateLocalizationResources(resources))).toContainEqual(
      expect.objectContaining({
        code: 'locale.missing-key',
        locale,
        messageKey,
      }),
    );
  });

  it('treats a one-locale extra key as a keyset mismatch', () => {
    const resources = cloneResources();
    resources['en-US']['app.unpaired'] = 'Unpaired';

    expect(expectIssues(validateLocalizationResources(resources))).toContainEqual(
      expect.objectContaining({
        code: 'locale.missing-key',
        locale: 'ko-KR',
        messageKey: 'app.unpaired',
      }),
    );
  });

  it('rejects blank and non-string message values', () => {
    const resources = cloneResources();
    resources['ko-KR']['app.subtitle'] = '   ';
    resources['en-US']['app.title'] = 42;
    const issues = expectIssues(validateLocalizationResources(resources));

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'locale.blank-message',
        locale: 'ko-KR',
        messageKey: 'app.subtitle',
      }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'locale.invalid-message-value',
        locale: 'en-US',
        messageKey: 'app.title',
      }),
    );
  });

  it('rejects malformed ICU messages', () => {
    const resources = cloneResources();
    resources['en-US']['app.validationSummary'] =
      '{count, plural, one {One issue} other {Many issues}';

    expect(expectIssues(validateLocalizationResources(resources))).toContainEqual(
      expect.objectContaining({
        code: 'locale.invalid-icu-message',
        locale: 'en-US',
        messageKey: 'app.validationSummary',
      }),
    );
  });

  it('rejects different interpolation variable names', () => {
    const resources = cloneResources();
    resources['en-US']['app.validationSummary'] =
      '{remaining, plural, one {# issue} other {# issues}}';

    expect(expectIssues(validateLocalizationResources(resources))).toContainEqual(
      expect.objectContaining({
        code: 'locale.interpolation-contract-mismatch',
        messageKey: 'app.validationSummary',
      }),
    );
  });

  it('rejects incompatible interpolation value kinds', () => {
    const resources = cloneResources();
    resources['en-US']['app.validationSummary'] = '{count, date, short}';

    expect(expectIssues(validateLocalizationResources(resources))).toContainEqual(
      expect.objectContaining({
        code: 'locale.interpolation-contract-mismatch',
        messageKey: 'app.validationSummary',
      }),
    );
  });

  it('rejects cardinal/ordinal and plural-offset contract mismatches', () => {
    const ordinalResources = cloneResources();
    ordinalResources['en-US']['app.validationSummary'] =
      '{count, selectordinal, other {#th issue}}';

    const offsetResources = cloneResources();
    offsetResources['en-US']['app.validationSummary'] =
      '{count, plural, offset:1 other {# issues}}';

    for (const resources of [ordinalResources, offsetResources]) {
      expect(expectIssues(validateLocalizationResources(resources))).toContainEqual(
        expect.objectContaining({
          code: 'locale.interpolation-contract-mismatch',
          messageKey: 'app.validationSummary',
        }),
      );
    }
  });

  it('rejects malformed stable message keys', () => {
    const resources = cloneResources();
    resources['en-US']['Invalid key'] = 'Invalid';
    resources['ko-KR']['Invalid key'] = '잘못된 키';

    const issues = expectIssues(validateLocalizationResources(resources));
    expect(issues.filter((issue) => issue.code === 'locale.invalid-message-key')).toHaveLength(2);
  });

  it('reports a missing required locale resource', () => {
    const resources = cloneResources();

    expect(
      expectIssues(validateLocalizationResources({ 'ko-KR': resources['ko-KR'] })),
    ).toContainEqual(
      expect.objectContaining({
        code: 'locale.missing-resource',
        locale: 'en-US',
      }),
    );
  });
});
