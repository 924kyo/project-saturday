import {
  POSITION_IDS,
  createPositionPlayerProfile,
  createRng,
  derivePositionRecruitingProfile,
  generatePositionRoom,
  getPlayableAttributeIds,
  type PlayerArchetypeId,
  type PositionId,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  buildPositionCreationMechanics,
  buildPositionRoomMechanics,
  defaultWrAppearance,
  positionAlphaContent,
  programContent,
  rosterNameMechanicsPool,
} from '../content/index.js';
import { positionAlphaContentSchema } from '../schema/positions.js';

type Mutable<T> = T extends readonly (infer TItem)[]
  ? Mutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> }
    : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

const archetypesByPosition = Object.fromEntries(
  positionAlphaContent.positions.map(({ id, archetypeIds }) => [id, archetypeIds]),
) as unknown as Readonly<Record<PositionId, readonly PlayerArchetypeId[]>>;

function createdPlayer(positionId: PositionId, archetypeId: PlayerArchetypeId) {
  const built = buildPositionCreationMechanics({
    archetypeId,
    personalityTraitIds: ['personality_competitive', 'personality_leader'],
    positionId,
    recruitingBackgroundId: 'background_blue_chip_star',
  });
  if (!built.ok) throw new Error(`Missing creation mechanics for ${positionId}.`);
  const created = createPositionPlayerProfile({
    careerSeed: `position-room-${positionId}`,
    identity: {
      appearance: defaultWrAppearance,
      archetypeId,
      displayName: 'Position Room',
      heightCm: 188,
      personalityTraitIds: ['personality_competitive', 'personality_leader'],
      positionId,
      recruitingBackgroundId: 'background_blue_chip_star',
      weightKg: 91,
    },
    mechanics: built.mechanics,
  });
  if (!created.ok) throw new Error(`Invalid created player for ${positionId}.`);
  return created.player;
}

describe('M7 position room content adapter', () => {
  it('core-validates recruiting and an eight-athlete room for all four positions', () => {
    for (const positionId of POSITION_IDS) {
      const archetypeId = archetypesByPosition[positionId][0]!;
      const player = createdPlayer(positionId, archetypeId);
      const mechanics = buildPositionRoomMechanics(positionId);
      expect(mechanics).toBeDefined();
      if (mechanics === undefined) continue;
      const recruiting = derivePositionRecruitingProfile(player, mechanics, 0);
      expect(recruiting).toEqual(
        expect.objectContaining({
          schemeFit: mechanics.schemeFitByArchetype[archetypeId],
        }),
      );
      const room = generatePositionRoom(
        player,
        createRng(`position-room-content-${positionId}`),
        rosterNameMechanicsPool,
        mechanics,
        {
          programId: 'program_ember_peak_polytechnic',
          roomTalentMean: 58,
          roomTalentSpread: 15,
          trustBase: 18,
          practiceFormBase: 52,
          experienceReadinessBase: 45,
          playerCoachTrustBonus: 8,
          playerPracticeForm: 52,
          playerExperienceReadiness: 20,
        },
      );
      expect(room.ok).toBe(true);
      if (room.ok) {
        expect(room.generated.context.positionId).toBe(positionId);
        expect(room.generated.context.depthOrderIds).toHaveLength(8);
        expect(room.generated.context.projection.feedbackBeatMinimum).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('keeps the staged WR balanced ability projection equal to the shipped balanced style', () => {
    const player = createdPlayer('position_wr', 'archetype_wr_deep_threat');
    const mechanics = buildPositionRoomMechanics('position_wr');
    if (mechanics === undefined) throw new Error('Missing WR mechanics.');
    const profile = derivePositionRecruitingProfile(player, mechanics, 0);
    const balanced = programContent.offenseStyles.find(
      ({ id }) => id === 'offense_style_balanced_tempo',
    )!;
    const expected = Math.round(
      Object.entries(balanced.attributeWeightsPermille).reduce(
        (total, [attributeId, weight]) =>
          total + player.attributes[attributeId as keyof typeof player.attributes]!.rating * weight,
        0,
      ) / 1_000,
    );
    expect(profile?.abilityScore).toBe(expected);
  });

  it('requires exact position-owned recruiting weights and archetype fit keys', () => {
    const missingWeight = clone(positionAlphaContent);
    delete (missingWeight.positions[1]!.recruitingAbilityWeightsPermille as Record<string, number>)[
      'attribute_qb_read_progression'
    ];
    expect(positionAlphaContentSchema.safeParse(missingWeight).success).toBe(false);

    const crossFit = clone(positionAlphaContent);
    (crossFit.positions[2]!.schemeFitByArchetype as Record<string, number>)[
      'archetype_qb_field_general'
    ] = 80;
    expect(positionAlphaContentSchema.safeParse(crossFit).success).toBe(false);
    expect(buildPositionRoomMechanics('position_te' as never)).toBeUndefined();
  });

  it('defines exactly 16 recruiting inputs and 1,000 permille for every position', () => {
    for (const position of positionAlphaContent.positions) {
      expect(Object.keys(position.recruitingAbilityWeightsPermille).sort()).toEqual(
        [...getPlayableAttributeIds(position.id)].sort(),
      );
      expect(
        Object.values(position.recruitingAbilityWeightsPermille).reduce(
          (sum, weight) => sum + weight,
          0,
        ),
      ).toBe(1_000);
      expect(Object.keys(position.schemeFitByArchetype).sort()).toEqual(
        [...position.archetypeIds].sort(),
      );
    }
  });
});
