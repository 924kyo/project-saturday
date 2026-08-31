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
