import { enUSMessages } from './en-US.js';
import { koKRMessages, type MessageKey } from './ko-KR.js';

export { enUSMessages } from './en-US.js';
export { koKRMessages, type MessageKey } from './ko-KR.js';

export const SUPPORTED_LOCALES = ['ko-KR', 'en-US'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type LocaleMessages = Readonly<Record<MessageKey, string>>;

export const DEFAULT_LOCALE: SupportedLocale = 'ko-KR';

export const localeMessages = {
  'en-US': enUSMessages,
  'ko-KR': koKRMessages,
} as const satisfies Readonly<Record<SupportedLocale, LocaleMessages>>;

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALES.some((locale) => locale === value);
}
