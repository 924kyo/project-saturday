import { createContext, useContext } from 'react';

import type { StorageAdapter } from '../storage';

/** Per-device display preferences (never part of a career save). */
export interface Preferences {
  /** Height and weight units, chosen by the player, independent of the language. */
  readonly units: 'metric' | 'imperial';
  /** After each snap, reveal the real look and its answer; after the game, the play-by-play review. */
  readonly playReview: boolean;
}

export const PREFERENCES_ID = 'preferences' as const;

export function defaultPreferences(locale: string): Preferences {
  // First launch only: afterwards the stored choice stands whatever the language.
  return { units: locale === 'en-US' ? 'imperial' : 'metric', playReview: true };
}

function isPreferences(value: unknown): value is Preferences {
  const entry = value as Preferences | undefined;
  return (
    typeof entry === 'object' &&
    entry !== null &&
    (entry.units === 'metric' || entry.units === 'imperial') &&
    typeof entry.playReview === 'boolean'
  );
}

export async function loadPreferences(
  storage: StorageAdapter,
  locale: string,
): Promise<Preferences> {
  try {
    const stored = await storage.get<unknown>('settings', PREFERENCES_ID);
    if (isPreferences(stored)) return stored;
  } catch {
    // Fall through to the first-launch defaults.
  }
  const initial = defaultPreferences(locale);
  await storage.put('settings', PREFERENCES_ID, initial).catch(() => undefined);
  return initial;
}

export async function savePreferences(
  storage: StorageAdapter,
  preferences: Preferences,
): Promise<void> {
  await storage.put('settings', PREFERENCES_ID, preferences);
}

export const PreferencesContext = createContext<Preferences>({
  units: 'metric',
  playReview: true,
});

export function usePreferences(): Preferences {
  return useContext(PreferencesContext);
}
