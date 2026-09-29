import { describe, expect, it } from 'vitest';

import { MemoryStorageAdapter } from '../storage';
import {
  ONBOARDING_SETTINGS_ID,
  completeAllOnboarding,
  completeOnboardingTopic,
  createDefaultOnboardingSettings,
  isOnboardingComplete,
  loadOnboardingSettings,
  parseOnboardingSettings,
  persistOnboardingSettings,
  replayOnboardingTopic,
} from './onboarding';

describe('onboarding settings', () => {
  it('orders unique completed topics canonically and rejects malformed records', () => {
    expect(
      parseOnboardingSettings({ completedTopics: ['skills', 'creation'], version: 1 }),
    ).toEqual({ completedTopics: ['creation', 'skills'], version: 1 });
    expect(
      parseOnboardingSettings({ completedTopics: ['creation', 'creation'], version: 1 }),
    ).toEqual(createDefaultOnboardingSettings());
    expect(parseOnboardingSettings({ completedTopics: ['league'], version: 1 })).toEqual(
      createDefaultOnboardingSettings(),
    );
    expect(parseOnboardingSettings({ completedTopics: [], extra: true, version: 1 })).toEqual(
      createDefaultOnboardingSettings(),
    );
  });

  it('completes, skips, and replays without mutating prior settings', () => {
    const initial = createDefaultOnboardingSettings();
    const completed = completeOnboardingTopic(initial, 'team');
    const all = completeAllOnboarding();
    const replayed = replayOnboardingTopic(all, 'week');

    expect(initial.completedTopics).toEqual([]);
    expect(completed.completedTopics).toEqual(['team']);
    expect(isOnboardingComplete(completed, 'team')).toBe(true);
    expect(all.completedTopics).toEqual(['creation', 'week', 'team', 'skills']);
    expect(replayed.completedTopics).toEqual(['creation', 'team', 'skills']);
  });

  it('persists independently in the settings store and falls back for invalid data', async () => {
    const storage = new MemoryStorageAdapter();
    const settings = completeOnboardingTopic(createDefaultOnboardingSettings(), 'creation');
    await persistOnboardingSettings(storage, settings);

    await expect(loadOnboardingSettings(storage)).resolves.toEqual(settings);
    await storage.put('settings', ONBOARDING_SETTINGS_ID, { completedTopics: [], version: 99 });
    await expect(loadOnboardingSettings(storage)).resolves.toEqual(
      createDefaultOnboardingSettings(),
    );
  });
});
