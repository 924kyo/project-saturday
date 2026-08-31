import {
  DEFAULT_LOCALE,
  localeMessages,
  SUPPORTED_LOCALES,
} from '@project-saturday/game-content/locales';
import { describe, expect, it } from 'vitest';
import { createAppI18n } from './i18n';
import { resolveInitialLocale } from './locale';
import { MemoryStorageAdapter } from '../storage';

describe('application localization', () => {
  it.each(SUPPORTED_LOCALES)('loads %s messages from game content', async (locale) => {
    const instance = await createAppI18n(locale);

    expect(instance.t('app.title')).toBe(localeMessages[locale]['app.title']);
  });

  it('formats ICU messages at runtime', async () => {
    const instance = await createAppI18n(DEFAULT_LOCALE);
    const formatted = instance.t('app.validationSummary', { count: 2 });

    expect(formatted).toContain('2');
    expect(formatted).not.toContain('{count');
  });

  it('prefers a persisted supported locale', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.put('settings', 'locale', 'en-US');

    await expect(resolveInitialLocale(storage, ['ko-KR'])).resolves.toBe('en-US');
  });

  it('detects a supported browser language and otherwise falls back', async () => {
    const storage = new MemoryStorageAdapter();

    await expect(resolveInitialLocale(storage, ['en-GB'])).resolves.toBe('en-US');
    await expect(resolveInitialLocale(storage, ['fr-FR'])).resolves.toBe(DEFAULT_LOCALE);
  });
});
