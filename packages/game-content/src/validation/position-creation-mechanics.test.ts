import {
  POSITION_IDS,
  createPositionPlayerProfile,
  type PlayerArchetypeId,
  type PositionId,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  buildPositionCreationMechanics,
  buildWrCreationMechanics,
  defaultWrAppearance,
  positionAlphaContent,
} from '../content/index.js';
import { positionAlphaContentSchema } from '../schema/positions.js';

type Mutable<T> = T extends object ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> } : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

const archetypesByPosition = Object.fromEntries(
  positionAlphaContent.positions.map(({ id, archetypeIds }) => [id, archetypeIds]),
) as unknown as Readonly<Record<PositionId, readonly PlayerArchetypeId[]>>;

describe('M7 position creation content adapter', () => {
  it('builds and core-validates every position/archetype/background combination', () => {
    for (const positionId of POSITION_IDS) {
      for (const archetypeId of archetypesByPosition[positionId]) {
        for (const recruitingBackgroundId of [
          'background_blue_chip_star',
          'background_late_bloomer',
          'background_small_town_star',
          'background_legacy_recruit',
          'background_under_recruited_athlete',
        ] as const) {
          const built = buildPositionCreationMechanics({
            archetypeId,
            personalityTraitIds: ['personality_competitive', 'personality_leader'],
            positionId,
            recruitingBackgroundId,
          });
          expect(built.ok).toBe(true);
          if (!built.ok) continue;
          const created = createPositionPlayerProfile({
            careerSeed: `m7-content-${positionId}-${archetypeId}-${recruitingBackgroundId}`,
            identity: {
              appearance: defaultWrAppearance,
              archetypeId,
              displayName: 'M7 Alpha',
              heightCm: 188,
              personalityTraitIds: ['personality_competitive', 'personality_leader'],
              positionId,
              recruitingBackgroundId,
              weightKg: 91,
            },
            mechanics: built.mechanics,
          });
          expect(created.ok).toBe(true);
        }
      }
    }
  });

  it('preserves the exact verified WR creation mechanics projection', () => {
    for (const archetypeId of archetypesByPosition.position_wr) {
      for (const recruitingBackgroundId of [
        'background_blue_chip_star',
        'background_late_bloomer',
        'background_small_town_star',
        'background_legacy_recruit',
        'background_under_recruited_athlete',
      ] as const) {
        const input = {
          archetypeId: archetypeId as
            | 'archetype_wr_deep_threat'
            | 'archetype_wr_route_technician'
            | 'archetype_wr_possession_receiver',
          personalityTraitIds: ['personality_competitive', 'personality_leader'] as const,
          recruitingBackgroundId,
        };
        const historical = buildWrCreationMechanics(input);
        const staged = buildPositionCreationMechanics({ ...input, positionId: 'position_wr' });
        expect(historical.ok).toBe(true);
        expect(staged.ok).toBe(true);
        if (historical.ok && staged.ok) {
          expect(staged.mechanics).toEqual(historical.mechanics);
        }
      }
    }
  });

  it('rejects cross-position mechanics and incomplete baselines in schema validation', () => {
    const crossPosition = clone(positionAlphaContent);
    (
      crossPosition.creationMechanics.archetypeProfiles[3]!
        .attributeModifiers[0] as unknown as Record<string, unknown>
    )['attributeId'] = 'attribute_rb_vision';
    expect(positionAlphaContentSchema.safeParse(crossPosition).success).toBe(false);

    const missingBaseline = clone(positionAlphaContent);
    delete (
      missingBaseline.creationMechanics.baselines[2]!.baseAttributeRatings as Record<string, number>
    )['attribute_rb_vision'];
    expect(positionAlphaContentSchema.safeParse(missingBaseline).success).toBe(false);
  });

  it('rejects mismatched archetypes and incompatible personalities with stable paths', () => {
    expect(
      buildPositionCreationMechanics({
        archetypeId: 'archetype_cb_ball_hawk',
        personalityTraitIds: ['personality_quiet', 'personality_social'],
        positionId: 'position_qb',
        recruitingBackgroundId: 'background_blue_chip_star',
      }),
    ).toEqual({
      issues: [
        {
          code: 'position-creation-content.invalid-archetype',
          path: 'archetypeId',
        },
        {
          code: 'position-creation-content.incompatible-personality',
          path: 'personalityTraitIds',
        },
      ],
      ok: false,
    });
  });
});
