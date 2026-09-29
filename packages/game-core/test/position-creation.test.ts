import {
  PERSONALITY_TRAIT_INCOMPATIBILITIES,
  POSITION_IDS,
  createPositionPlayerProfile,
  derivePlayerId,
  getPlayableAttributeIds,
  getPositionAttributeIds,
  type CreatePositionPlayerProfileInput,
  type PlayerArchetypeId,
  type PositionId,
  type PositionPersonalityCreationProfile,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

type Mutable<T> = T extends object ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> } : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

const archetypeByPosition = {
  position_cb: 'archetype_cb_ball_hawk',
  position_qb: 'archetype_qb_field_general',
  position_rb: 'archetype_rb_all_purpose',
  position_wr: 'archetype_wr_route_technician',
  position_lb: 'archetype_lb_run_stopper',
  position_edge: 'archetype_edge_speed_rusher',
} as const satisfies Readonly<Record<PositionId, PlayerArchetypeId>>;

function personality(
  id: 'personality_competitive' | 'personality_quiet',
  delta: number,
): PositionPersonalityCreationProfile {
  return {
    attributeModifiers: [{ attributeId: 'attribute_composure', delta }],
    grantedTagIds: [`tag_${id}`],
    id,
    incompatibleTraitIds: PERSONALITY_TRAIT_INCOMPATIBILITIES[id],
    stateModifiers: [],
  };
}

function validInput(positionId: PositionId): CreatePositionPlayerProfileInput {
  const positionAttributes = getPositionAttributeIds(positionId);
  return {
    careerSeed: `m7-position-creation-${positionId}`,
    identity: {
      appearance: {
        armSleevesId: null,
        bodyTypeId: 'body_type_balanced',
        eyeBlackId: 'eye_black_stripes',
        faceId: 'face_oval',
        footwearId: 'footwear_mid',
        glovesId: 'gloves_dark',
        hairColorId: 'hair_color_black',
        hairStyleId: 'hair_style_close_crop',
        jerseyFitId: 'jersey_fit_standard',
        skinToneId: 'skin_tone_medium',
        towelId: null,
        visorId: null,
        wristTapeId: null,
      },
      archetypeId: archetypeByPosition[positionId],
      displayName: '민준 Carter',
      heightCm: 188,
      personalityTraitIds: ['personality_quiet', 'personality_competitive'],
      positionId,
      recruitingBackgroundId: 'background_late_bloomer',
      weightKg: 91,
    },
    mechanics: {
      archetypeProfile: {
        attributeModifiers: [
          { attributeId: positionAttributes[0]!, delta: 4 },
          { attributeId: positionAttributes[1]!, delta: -2 },
        ],
        grantedTagIds: [`tag_${archetypeByPosition[positionId]}`],
        id: archetypeByPosition[positionId],
        stateModifiers: [],
      },
      backgroundProfile: {
        attributeModifiers: [
          { attributeId: 'attribute_strength', delta: 2 },
          { attributeId: 'attribute_agility', delta: -1 },
        ],
        grantedTagIds: ['tag_background_late_bloomer'],
        id: 'background_late_bloomer',
        stateModifiers: [{ delta: 2, stateId: 'state_confidence' }],
      },
      baseAttributeRatings: Object.fromEntries(
        getPlayableAttributeIds(positionId).map((attributeId) => [attributeId, 60]),
      ),
      baseState: {
        state_body: 80,
        state_brand: 10,
        state_coach_trust: 20,
        state_confidence: 50,
        state_gpa: 3.1,
      },
      personalityProfiles: [
        personality('personality_quiet', 1),
        personality('personality_competitive', -1),
      ],
    },
  };
}

describe('M7 deterministic position player profile creation', () => {
  it('builds all six strict profiles without RNG or live-career activation', () => {
    for (const positionId of POSITION_IDS) {
      const input = validInput(positionId);
      const result = createPositionPlayerProfile(input);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.player.positionId).toBe(positionId);
      expect(result.player.archetypeId).toBe(archetypeByPosition[positionId]);
      expect(result.player.id).toBe(derivePlayerId(input.careerSeed));
      expect(Object.keys(result.player.attributes)).toEqual(getPlayableAttributeIds(positionId));
      expect(result.player.personalityTraitIds).toEqual([
        'personality_competitive',
        'personality_quiet',
      ]);
      expect(result.player.state).toEqual({
        body: 80,
        brand: 10,
        coachTrust: 20,
        confidence: 52,
        gpa: 3.1,
        preparation: 50,
      });
      expect(result.player.overall).toBe(60);
      expect(Object.isFrozen(result.player)).toBe(true);
      expect(Object.isFrozen(result.player.appearance)).toBe(true);
      expect(Object.isFrozen(result.player.attributes)).toBe(true);
    }
  });

  it('canonicalizes personality mechanics independent of supplied tuple order', () => {
    const first = validInput('position_qb');
    const second = clone(first);
    second.mechanics.personalityProfiles.reverse();
    expect(createPositionPlayerProfile(first)).toEqual(createPositionPlayerProfile(second));
  });

  it('rejects an archetype from another position and cross-position modifiers', () => {
    const input = clone(validInput('position_cb'));
    input.identity.archetypeId = 'archetype_qb_gunslinger';
    input.mechanics.archetypeProfile.id = 'archetype_qb_gunslinger';
    input.mechanics.archetypeProfile.attributeModifiers[0]!.attributeId =
      'attribute_qb_throw_power';
    const result = createPositionPlayerProfile(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'position_creation.invalid_archetype_position',
            path: 'identity.archetypeId',
          }),
          expect.objectContaining({
            code: 'position_creation.invalid_modifier',
            path: 'mechanics.archetypeProfile.attributeModifiers.0',
          }),
        ]),
      );
    }
  });

  it('rejects missing baselines, extra fields, invalid appearance, and incompatible traits', () => {
    const input = clone(validInput('position_rb')) as Mutable<CreatePositionPlayerProfileInput> & {
      unexpected?: boolean;
    };
    delete (input.mechanics.baseAttributeRatings as Record<string, number>)['attribute_rb_vision'];
    (
      input.identity as Mutable<CreatePositionPlayerProfileInput['identity']> & {
        extra?: string;
      }
    ).extra = 'invalid';
    (input.identity.appearance as unknown as Record<string, unknown>)['faceId'] = 'wrong_face';
    input.identity.personalityTraitIds = ['personality_quiet', 'personality_social'];
    const result = createPositionPlayerProfile(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'position_creation.invalid_baseline',
            path: 'mechanics.baseAttributeRatings.attribute_rb_vision',
          }),
          expect.objectContaining({
            code: 'position_creation.invalid_profile',
            path: 'identity.extra',
          }),
          expect.objectContaining({
            code: 'position_creation.invalid_appearance',
            path: 'identity.appearance.faceId',
          }),
          expect.objectContaining({
            code: 'position_creation.incompatible_personality',
            path: 'identity.personalityTraitIds',
          }),
        ]),
      );
    }
  });

  it('rejects modifier overflow and returns stable sorted issue paths', () => {
    const input = clone(validInput('position_wr'));
    input.mechanics.baseAttributeRatings.attribute_wr_release = 100;
    const result = createPositionPlayerProfile(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        code: 'position_creation.out_of_bounds',
        path: 'player.attributes.attribute_wr_release',
      });
      expect(result.issues.map(({ path }) => path).sort()).toEqual(
        result.issues.map(({ path }) => path),
      );
    }
  });
});
