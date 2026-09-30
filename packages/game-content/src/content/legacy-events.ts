import type { WeeklyEventDefinitionV2 } from '@project-saturday/game-core';

/**
 * The legacy mentor scene (M9): an alumnus of the current program checks in. Effects are small and
 * of the same kind as any weekly scene; legacy never adds ratings. Copy takes the alumnus' {name}.
 */
export const legacyMentorContent = {
  id: 'event_legacy_mentor',
  nameKey: 'm9Legacy.event.mentor.name',
  descriptionKey: 'm9Legacy.event.mentor.description',
  weight: 100,
  cooldownWeeks: 6,
  requirements: {},
  choices: [
    {
      id: 'event_choice_legacy_mentor_commit',
      effects: {
        bodyDelta: 0,
        preparationDelta: 4,
        confidenceDelta: 2,
        coachTrustDelta: 0,
        gpaMilliDelta: 0,
        brandDelta: 0,
        gameModifiers: { clueBonus: 0, decisionScoreFlat: 1, exposureReductionPermille: 0 },
      },
    },
    {
      id: 'event_choice_legacy_mentor_protect',
      effects: {
        bodyDelta: 1,
        preparationDelta: 0,
        confidenceDelta: 4,
        coachTrustDelta: 0,
        gpaMilliDelta: 0,
        brandDelta: 0,
        gameModifiers: { clueBonus: 0, decisionScoreFlat: 0, exposureReductionPermille: 0 },
      },
    },
  ],
} as const;

export const legacyMentorEvent: WeeklyEventDefinitionV2 = {
  id: legacyMentorContent.id,
  weight: legacyMentorContent.weight,
  cooldownWeeks: legacyMentorContent.cooldownWeeks,
  requirements: legacyMentorContent.requirements,
  choices: legacyMentorContent.choices,
};
