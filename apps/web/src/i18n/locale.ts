import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@project-saturday/game-content/locales';
import type { StorageAdapter } from '../storage';

const LOCALE_SETTING_ID = 'locale';

export async function resolveInitialLocale(
  storage: StorageAdapter,
  browserLanguages: readonly string[] = getBrowserLanguages(),
): Promise<SupportedLocale> {
  const storedLocale = await storage.get<unknown>('settings', LOCALE_SETTING_ID);

  if (isSupportedLocale(storedLocale)) {
    return storedLocale;
  }

  for (const browserLanguage of browserLanguages) {
    const normalizedLanguage = browserLanguage.replace('_', '-').toLowerCase();
    const matchingLocale = SUPPORTED_LOCALES.find(
      (locale) =>
        locale.toLowerCase() === normalizedLanguage ||
        locale.toLowerCase().startsWith(`${normalizedLanguage.split('-')[0]}-`),
    );

    if (matchingLocale !== undefined) {
      return matchingLocale;
    }
  }

  return DEFAULT_LOCALE;
}

export async function persistLocale(
  storage: StorageAdapter,
  locale: SupportedLocale,
): Promise<void> {
  await storage.put('settings', LOCALE_SETTING_ID, locale);
}

function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }

  return navigator.languages;
}
