import {
  DEFAULT_LOCALE,
  localeMessages,
  SUPPORTED_LOCALES,
  type MessageKey,
  type SupportedLocale,
} from '@project-saturday/game-content/locales';
import i18next, { type i18n, type TOptions } from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next, useTranslation } from 'react-i18next';

const resources = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, { translation: localeMessages[locale] }]),
);

export async function createAppI18n(locale: SupportedLocale): Promise<i18n> {
  const instance = i18next.createInstance();

  await instance
    .use(initReactI18next)
    .use(ICU)
    .init({
      fallbackLng: DEFAULT_LOCALE,
      initAsync: false,
      interpolation: {
        escapeValue: false,
      },
      keySeparator: false,
      lng: locale,
      resources,
      returnNull: false,
      supportedLngs: [...SUPPORTED_LOCALES],
    });

  return instance;
}

export type AppTranslate = (key: MessageKey, options?: TOptions) => string;

export function useAppTranslation(locale?: SupportedLocale): {
  readonly i18n: i18n;
  readonly t: AppTranslate;
} {
  const { i18n: instance, t } = useTranslation();
  const translate = locale === undefined ? t : instance.getFixedT(locale);

  return {
    i18n: instance,
    t: (key, options) => (options === undefined ? translate(key) : translate(key, options)),
  };
}

/**
 * M12 name display: generated names come from the roster-name keys. "original" shows them as
 * originally spelled in every language; "localized" restores each language's own rendering.
 * Typed names never pass through these keys.
 */
const isNameKey = (key: string) =>
  key.startsWith('programWorld.roster.given.') || key.startsWith('programWorld.roster.family.');

/** Each language's own name renderings, copied before any override touches the store. */
const NAME_COPIES: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [
    locale,
    Object.fromEntries(
      Object.entries(localeMessages[locale] as Readonly<Record<string, string>>).filter(([key]) =>
        isNameKey(key),
      ),
    ),
  ]),
);

export function applyNameDisplay(instance: i18n, mode: 'localized' | 'original'): void {
  const english = NAME_COPIES['en-US']!;
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === 'en-US') continue;
    const own = NAME_COPIES[locale]!;
    const names = Object.fromEntries(
      Object.keys(own).map((key) => [
        key,
        mode === 'original' ? (english[key] ?? own[key]) : own[key],
      ]),
    );
    instance.addResourceBundle(locale, 'translation', names, true, true);
  }
  // The ICU formatter memoizes compiled messages per key; drop them so the names re-read.
  (instance as unknown as { ICU?: { clearCache?: () => void } }).ICU?.clearCache?.();
}
