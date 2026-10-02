import { createContext, useContext } from 'react';

import type { StorageAdapter } from '../storage';

/** Per-device display preferences (never part of a career save). */
export interface Preferences {
  /** Height and weight units, chosen by the player, independent of the language. */
  readonly units: 'metric' | 'imperial';
  /** After each snap, reveal the real look and its answer; after the game, the play-by-play review. */
  readonly playReview: boolean;
  /**
   * Board animation: follow the device's reduced-motion setting, or override it. Windows "Animation
   * effects: off" reports reduced motion, which used to stop the board with no way to turn it on.
   */
  readonly motion: 'system' | 'on' | 'off';
  /**
   * M12: generated names in the app language ("localized") or as originally spelled ("original").
   * A typed name is always shown as typed.
   */
  readonly nameDisplay: 'localized' | 'original';
}

export const PREFERENCES_ID = 'preferences' as const;

export function defaultPreferences(locale: string): Preferences {
  // First launch only: afterwards the stored choice stands whatever the language.
  return {
    units: locale === 'en-US' ? 'imperial' : 'metric',
    playReview: true,
    motion: 'system',
    nameDisplay: 'localized',
  };
}

/** Stored preferences, completed with defaults for fields added later (motion). */
function readPreferences(value: unknown): Preferences | null {
  const entry = value as Partial<Preferences> | undefined;
  if (
    typeof entry !== 'object' ||
    entry === null ||
    (entry.units !== 'metric' && entry.units !== 'imperial') ||
    typeof entry.playReview !== 'boolean'
  )
    return null;
  const motion = entry.motion === 'on' || entry.motion === 'off' ? entry.motion : 'system';
  const nameDisplay = entry.nameDisplay === 'original' ? 'original' : 'localized';
  return { units: entry.units, playReview: entry.playReview, motion, nameDisplay };
}

export async function loadPreferences(
  storage: StorageAdapter,
  locale: string,
): Promise<Preferences> {
  try {
    const stored = readPreferences(await storage.get<unknown>('settings', PREFERENCES_ID));
    if (stored !== null) return stored;
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
  motion: 'system',
  nameDisplay: 'localized',
});

export function usePreferences(): Preferences {
  return useContext(PreferencesContext);
}
