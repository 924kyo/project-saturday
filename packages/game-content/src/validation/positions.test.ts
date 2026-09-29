import {
  CB_ARCHETYPE_IDS,
  CB_ATTRIBUTE_IDS,
  POSITION_IDS,
  QB_ARCHETYPE_IDS,
  QB_ATTRIBUTE_IDS,
  RB_ARCHETYPE_IDS,
  RB_ATTRIBUTE_IDS,
  WR_ARCHETYPE_IDS,
  WR_ATTRIBUTE_IDS,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { contentManifest, positionAlphaContent, programContent } from '../content/index.js';
import { localeMessages } from '../locales/index.js';
import {
  POSITION_DEVELOPMENT_FAMILY_IDS,
  STAGED_GAME_DECISION_FAMILY_IDS,
  positionAlphaContentSchema,
} from '../schema/positions.js';
import { validateContent, validateShippedContent } from './content.js';

type Mutable<T> = T extends readonly (infer TItem)[]
  ? Mutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> }
    : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

describe('M7 staged position contract', () => {
  it('ships canonical schema-9 IDs and paired presentation without activating new careers', () => {
    expect(contentManifest.schemaVersion).toBe(9);
    expect(contentManifest.positionAlpha).toBe(positionAlphaContent);
    expect(positionAlphaContent.positions.map(({ id }) => id)).toEqual(POSITION_IDS);
    expect(positionAlphaContent.archetypes.map(({ id }) => id)).toEqual([
      ...QB_ARCHETYPE_IDS,
      ...RB_ARCHETYPE_IDS,
      ...CB_ARCHETYPE_IDS,
    ]);
    expect(positionAlphaContent.attributes.map(({ id }) => id)).toEqual([
      ...WR_ATTRIBUTE_IDS,
      ...QB_ATTRIBUTE_IDS,
      ...RB_ATTRIBUTE_IDS,
      ...CB_ATTRIBUTE_IDS,
    ]);
    expect(positionAlphaContent.developmentFamilies.map(({ id }) => id)).toEqual(
      POSITION_DEVELOPMENT_FAMILY_IDS,
    );
    expect(positionAlphaContent.gameDecisionFamilies.map(({ id }) => id)).toEqual(
      STAGED_GAME_DECISION_FAMILY_IDS,
    );
    expect(positionAlphaContent.positions[0]?.archetypeIds).toEqual(WR_ARCHETYPE_IDS);
    expect(programContent.programs).toHaveLength(12);
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
  });

  it('keeps every role visible and every position evaluation fixed-point', () => {
    for (const position of positionAlphaContent.positions) {
      expect(
        Object.values(position.depthEvaluationWeightsPermille).reduce(
          (sum, weight) => sum + weight,
          0,
        ),
      ).toBe(1_000);
      expect(
        Object.values(position.opportunityByRole).every(
          ({ feedbackBeatMinimum }) => feedbackBeatMinimum >= 1,
        ),
      ).toBe(true);
      expect(position.opportunityByRole.depth_role_reserve.interactiveSnapMinimum).toBeGreaterThan(
        0,
      );
    }
  });

  it('rejects cross-position archetype attributes and non-fixed-point evaluation weights', () => {
    const wrongAttribute = clone(positionAlphaContent);
    wrongAttribute.archetypes[0]!.priorityAttributeIds[0] = 'attribute_rb_vision';
    expect(positionAlphaContentSchema.safeParse(wrongAttribute).success).toBe(false);

    const wrongWeights = clone(contentManifest);
    wrongWeights.positionAlpha.positions[0]!.depthEvaluationWeightsPermille.talentFit += 1;
    const result = validateContent({ localeResources: localeMessages, manifest: wrongWeights });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'content.invalid-schema',
            path: expect.stringContaining(
              'manifest.positionAlpha.positions.0.depthEvaluationWeightsPermille',
            ),
          }),
        ]),
      );
    }
  });

  it('fails validation when either supported locale loses staged position copy', () => {
    const resources = {
      'en-US': { ...localeMessages['en-US'] },
      'ko-KR': { ...localeMessages['ko-KR'] },
    };
    delete (resources['en-US'] as Record<string, string>)['m7Alpha.positions.qb.name'];
    const result = validateContent({ localeResources: resources, manifest: contentManifest });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'content.missing-localization-reference',
          contentId: 'position_qb',
          locale: 'en-US',
        }),
      );
    }
  });
});
