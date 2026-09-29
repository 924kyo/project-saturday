import {
  POSITION_TRAINING_ACTION_IDS,
  POSITION_TRAINING_PROFICIENCY_IDS,
  createPositionPlayerProfile,
  createPositionTrainingProficiencyUses,
  getPositionAttributeIds,
  resolvePositionTrainingAction,
  type PlayerArchetypeId,
  type PositionTrainingActionDefinition,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  buildPositionCreationMechanics,
  defaultWrAppearance,
  developmentWeekConfig,
  positionAlphaContent,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';
import { validateContent } from './content.js';
import { contentManifest } from '../content/manifest.js';

function mechanicsDefinition(
  definition: (typeof positionAlphaContent.trainingActions)[number],
): PositionTrainingActionDefinition {
  return {
    attributeXp: definition.attributeXp,
    bodyDelta: definition.bodyDelta,
    breakthroughGaugePoints: definition.breakthroughGaugePoints,
    confidenceDelta: definition.confidenceDelta,
    developmentFamilyId: definition.developmentFamilyId,
    id: definition.id,
    positionId: definition.positionId,
    practiceImpact: definition.practiceImpact,
    preparationDelta: definition.preparationDelta,
    proficiencyId: definition.proficiencyId,
  };
}

describe('M7 staged position training content', () => {
  it('ships exact action/proficiency order and covers all six attributes per added position', () => {
    expect(positionAlphaContent.trainingActions.map(({ id }) => id)).toEqual(
      POSITION_TRAINING_ACTION_IDS,
    );
    expect(positionAlphaContent.trainingProficiencies.map(({ id }) => id)).toEqual(
      POSITION_TRAINING_PROFICIENCY_IDS,
    );
    for (const positionId of ['position_qb', 'position_rb', 'position_cb'] as const) {
      const actions = positionAlphaContent.trainingActions.filter(
        (action) => action.positionId === positionId,
      );
      expect(actions).toHaveLength(3);
      expect(
        new Set(
          actions.flatMap(({ attributeXp }) => attributeXp.map(({ attributeId }) => attributeId)),
        ),
      ).toEqual(new Set(getPositionAttributeIds(positionId)));
      expect(new Set(actions.map(({ bodyDelta }) => bodyDelta)).size).toBe(3);
      expect(new Set(actions.map(({ preparationDelta }) => preparationDelta)).size).toBe(3);
    }
  });

  it('core-resolves every staged action from its validated created profile', () => {
    for (const positionId of ['position_qb', 'position_rb', 'position_cb'] as const) {
      const archetypeId = positionAlphaContent.positions.find(({ id }) => id === positionId)!
        .archetypeIds[0] as PlayerArchetypeId;
      const built = buildPositionCreationMechanics({
        archetypeId,
        personalityTraitIds: ['personality_competitive', 'personality_leader'],
        positionId,
        recruitingBackgroundId: 'background_blue_chip_star',
      });
      if (!built.ok) throw new Error('fixture');
      const created = createPositionPlayerProfile({
        careerSeed: `m7-training-${positionId}`,
        identity: {
          appearance: defaultWrAppearance,
          archetypeId,
          displayName: 'Training Alpha',
          heightCm: 188,
          personalityTraitIds: ['personality_competitive', 'personality_leader'],
          positionId,
          recruitingBackgroundId: 'background_blue_chip_star',
          weightKg: 91,
        },
        mechanics: built.mechanics,
      });
      if (!created.ok) throw new Error('fixture');
      for (const definition of positionAlphaContent.trainingActions.filter(
        (action) => action.positionId === positionId,
      )) {
        expect(
          resolvePositionTrainingAction(
            {
              attributes: created.player.attributes,
              positionId,
              proficiencyUses: createPositionTrainingProficiencyUses(positionId),
              state: created.player.state,
            },
            mechanicsDefinition(definition),
            developmentWeekConfig,
          ).ok,
        ).toBe(true);
      }
    }
  });

  it('fails when one locale loses an action or proficiency explanation', () => {
    const resources = {
      'en-US': { ...localeMessages['en-US'] },
      'ko-KR': { ...localeMessages['ko-KR'] },
    };
    delete (resources['en-US'] as Record<string, string>)[
      'm7Alpha.training.rbThirdDown.description'
    ];
    const result = validateContent({ localeResources: resources, manifest: contentManifest });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'content.missing-localization-reference',
          contentId: 'action_rb_third_down_work',
          locale: 'en-US',
        }),
      );
    }
  });
});
