import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  enUSMessages,
  isSupportedLocale,
  koKRMessages,
  localeMessages,
} from './index.js';

describe('locale catalog API', () => {
  it('ships the same message keys in both required locales', () => {
    expect(Object.keys(enUSMessages).sort()).toEqual(Object.keys(koKRMessages).sort());
    expect(Object.keys(localeMessages).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it('uses Korean as the default authoring locale', () => {
    expect(DEFAULT_LOCALE).toBe('ko-KR');
  });

  it('narrows only exact supported locale identifiers', () => {
    expect(isSupportedLocale('ko-KR')).toBe(true);
    expect(isSupportedLocale('en-US')).toBe(true);
    expect(isSupportedLocale('en')).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});
