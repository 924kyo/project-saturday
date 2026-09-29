import type { StorageAdapter } from '../storage';

export const ONBOARDING_SETTINGS_ID = 'onboarding-v1';
export const ONBOARDING_SETTINGS_VERSION = 1;

export const ONBOARDING_TOPICS = ['creation', 'week', 'team', 'skills'] as const;

export type OnboardingTopic = (typeof ONBOARDING_TOPICS)[number];

export const CREATION_ONBOARDING_TOPIC = ONBOARDING_TOPICS[0];
export const WEEK_ONBOARDING_TOPIC = ONBOARDING_TOPICS[1];
export const TEAM_ONBOARDING_TOPIC = ONBOARDING_TOPICS[2];
export const SKILLS_ONBOARDING_TOPIC = ONBOARDING_TOPICS[3];

export interface OnboardingSettings {
  readonly completedTopics: readonly OnboardingTopic[];
  readonly version: typeof ONBOARDING_SETTINGS_VERSION;
}

export function createDefaultOnboardingSettings(): OnboardingSettings {
  return {
    completedTopics: [],
    version: ONBOARDING_SETTINGS_VERSION,
  };
}

export function parseOnboardingSettings(value: unknown): OnboardingSettings {
  if (!isRecord(value) || value['version'] !== ONBOARDING_SETTINGS_VERSION) {
    return createDefaultOnboardingSettings();
  }
  if (
    !hasExactKeys(value, ['completedTopics', 'version']) ||
    !Array.isArray(value['completedTopics'])
  ) {
    return createDefaultOnboardingSettings();
  }
  const completedTopics = value['completedTopics'];
  if (
    completedTopics.some((topic) => !isOnboardingTopic(topic)) ||
    new Set(completedTopics).size !== completedTopics.length
  ) {
    return createDefaultOnboardingSettings();
  }
  return {
    completedTopics: ONBOARDING_TOPICS.filter((topic) => completedTopics.includes(topic)),
    version: ONBOARDING_SETTINGS_VERSION,
  };
}

export async function loadOnboardingSettings(storage: StorageAdapter): Promise<OnboardingSettings> {
  try {
    return parseOnboardingSettings(await storage.get<unknown>('settings', ONBOARDING_SETTINGS_ID));
  } catch {
    return createDefaultOnboardingSettings();
  }
}

export async function persistOnboardingSettings(
  storage: StorageAdapter,
  settings: OnboardingSettings,
): Promise<void> {
  await storage.put('settings', ONBOARDING_SETTINGS_ID, settings);
}

export function isOnboardingComplete(
  settings: OnboardingSettings,
  topic: OnboardingTopic,
): boolean {
  return settings.completedTopics.includes(topic);
}

export function completeOnboardingTopic(
  settings: OnboardingSettings,
  topic: OnboardingTopic,
): OnboardingSettings {
  if (isOnboardingComplete(settings, topic)) {
    return settings;
  }
  return {
    completedTopics: ONBOARDING_TOPICS.filter(
      (candidate) => candidate === topic || settings.completedTopics.includes(candidate),
    ),
    version: ONBOARDING_SETTINGS_VERSION,
  };
}

export function completeAllOnboarding(): OnboardingSettings {
  return {
    completedTopics: [...ONBOARDING_TOPICS],
    version: ONBOARDING_SETTINGS_VERSION,
  };
}

export function replayOnboardingTopic(
  settings: OnboardingSettings,
  topic: OnboardingTopic,
): OnboardingSettings {
  if (!isOnboardingComplete(settings, topic)) {
    return settings;
  }
  return {
    completedTopics: settings.completedTopics.filter((candidate) => candidate !== topic),
    version: ONBOARDING_SETTINGS_VERSION,
  };
}

function isOnboardingTopic(value: unknown): value is OnboardingTopic {
  return typeof value === 'string' && ONBOARDING_TOPICS.some((topic) => topic === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key, index) => actualKeys[index] === key)
  );
}
