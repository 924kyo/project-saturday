import { describe, expect, it } from 'vitest';

import {
  DEPTH_HYSTERESIS_THRESHOLD_MILLI,
  POSITION_ROOM_RNG_DRAWS,
  createRng,
  derivePositionCoachTrustChange,
  derivePositionRecruitingProfile,
  generatePositionRoom,
  getPlayableAttributeIds,
  updatePositionRoomAfterPractice,
  type CreatedPositionPlayerProfile,
  type MultiPositionAttributeId,
  type PositionRoomGenerationConfig,
  type PositionRoomMechanics,
  type PositionRoomNamePool,
} from '../src/index.js';

const qbWeights: Partial<Record<MultiPositionAttributeId, number>> = {
  attribute_qb_throw_power: 100,
  attribute_qb_short_accuracy: 120,
  attribute_qb_intermediate_accuracy: 140,
  attribute_qb_deep_accuracy: 80,
  attribute_qb_pocket_presence: 130,
  attribute_qb_read_progression: 150,
  attribute_football_iq: 100,
  attribute_composure: 80,
  attribute_discipline: 40,
  attribute_work_ethic: 30,
  attribute_agility: 20,
  attribute_speed: 10,
};

const mechanics = {
  positionId: 'position_qb',
  archetypeIds: [
    'archetype_qb_field_general',
    'archetype_qb_gunslinger',
    'archetype_qb_dual_threat',
  ],
  recruitingAbilityWeightsPermille: Object.fromEntries(
    getPlayableAttributeIds('position_qb').map((attributeId) => [
      attributeId,
      qbWeights[attributeId] ?? 0,
    ]),
  ),
  schemeFitByArchetype: {
    archetype_qb_field_general: 88,
    archetype_qb_gunslinger: 84,
    archetype_qb_dual_threat: 90,
  },
  depthEvaluationWeightsPermille: {
    talentFit: 350,
    coachTrust: 230,
    practiceForm: 150,
    schemeFit: 120,
    experienceReadiness: 150,
  },
  opportunityByRole: {
    depth_role_starter: {
      interactiveSnapMinimum: 3,
      interactiveSnapMaximum: 5,
      feedbackBeatMinimum: 1,
    },
    depth_role_rotation: {
      interactiveSnapMinimum: 2,
      interactiveSnapMaximum: 4,
      feedbackBeatMinimum: 1,
    },
    depth_role_reserve: {
      interactiveSnapMinimum: 1,
      interactiveSnapMaximum: 2,
      feedbackBeatMinimum: 1,
    },
    depth_role_developmental: {
      interactiveSnapMinimum: 0,
      interactiveSnapMaximum: 1,
      feedbackBeatMinimum: 1,
    },
  },
  hysteresisThresholdMilli: DEPTH_HYSTERESIS_THRESHOLD_MILLI,
} as const satisfies PositionRoomMechanics;

function player(): CreatedPositionPlayerProfile {
  return {
    appearance: {
      armSleevesId: null,
      bodyTypeId: 'body_type_balanced',
      eyeBlackId: null,
      faceId: 'face_oval',
      footwearId: 'footwear_black',
      glovesId: null,
      hairColorId: 'hair_color_black',
      hairStyleId: 'hair_style_short',
      jerseyFitId: 'jersey_fit_standard',
      skinToneId: 'skin_tone_medium',
      towelId: null,
      visorId: null,
      wristTapeId: null,
    },
    archetypeId: 'archetype_qb_field_general',
    attributes: Object.fromEntries(
      getPlayableAttributeIds('position_qb').map((attributeId) => [
        attributeId,
        { rating: 60, xp: 0 },
      ]),
    ),
    displayName: 'Ari Lane',
    heightCm: 190,
    id: 'player_position_room_test',
    overall: 60,
    personalityTraitIds: ['personality_competitive', 'personality_leader'],
    positionId: 'position_qb',
    recruitingBackgroundId: 'background_blue_chip_star',
    state: {
      body: 90,
      brand: 5,
      coachTrust: 10,
      confidence: 50,
      gpa: 3,
      preparation: 50,
    },
    tagIds: ['tag_recruiting_high_expectations'],
    weightKg: 91,
  };
}

const names = {
  givenNameIds: [
    'roster_given_name_ari',
    'roster_given_name_beck',
    'roster_given_name_cai',
    'roster_given_name_drew',
    'roster_given_name_eli',
    'roster_given_name_finn',
    'roster_given_name_gray',
  ],
  familyNameIds: ['roster_family_name_lane'],
} as const satisfies PositionRoomNamePool;

const config = {
  programId: 'program_test_harbor',
  roomTalentMean: 55,
  roomTalentSpread: 8,
  trustBase: 12,
  practiceFormBase: 50,
  experienceReadinessBase: 45,
  playerCoachTrustBonus: 8,
  playerPracticeForm: 55,
  playerExperienceReadiness: 20,
} as const satisfies PositionRoomGenerationConfig;

describe('M7 deterministic position room and depth foundation', () => {
  it('derives position-owned recruiting ability and scheme fit', () => {
    expect(derivePositionRecruitingProfile(player(), mechanics, 5)).toEqual({
      abilityScore: 60,
      backgroundModifier: 5,
      recruitScore: 65,
      recruitTierId: 'recruit_tier_national',
      schemeFit: 88,
    });
  });

  it('generates one eight-athlete room with exactly 35 deterministic draws', () => {
    const first = generatePositionRoom(
      player(),
      createRng('position-room'),
      names,
      mechanics,
      config,
    );
    const second = generatePositionRoom(
      player(),
      createRng('position-room'),
      names,
      mechanics,
      config,
    );
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.generated.rosterRngDrawCountAfter - first.generated.rosterRngDrawCountBefore).toBe(
      POSITION_ROOM_RNG_DRAWS,
    );
    expect(first.generated.context.competitors).toHaveLength(7);
    expect(
      new Set(
        first.generated.context.competitors.map(
          ({ givenNameId, familyNameId }) => `${givenNameId}|${familyNameId}`,
        ),
      ).size,
    ).toBe(7);
    expect(
      new Set(first.generated.context.competitors.map(({ givenNameId }) => givenNameId)).size,
    ).toBe(7);
    expect(first.generated.context.evaluations).toHaveLength(8);
    expect(new Set(first.generated.context.competitors.map(({ id }) => id)).size).toBe(7);
    expect(first.generated.context.projection.feedbackBeatMinimum).toBeGreaterThanOrEqual(1);
    expect(first.generated.context.adjacentExplanation.components).toHaveLength(5);
    expect(Object.isFrozen(first.generated.context)).toBe(true);
  });

  it('keeps IDs and every football input independent from the selected name catalog', () => {
    const alternateNames = {
      givenNameIds: names.givenNameIds.map(
        (id) => `${id}_alternate` as `roster_given_name_${string}`,
      ),
      familyNameIds: ['roster_family_name_alternate'],
    } as const satisfies PositionRoomNamePool;
    const baseline = generatePositionRoom(
      player(),
      createRng('position-room-name-independence'),
      names,
      mechanics,
      config,
    );
    const alternate = generatePositionRoom(
      player(),
      createRng('position-room-name-independence'),
      alternateNames,
      mechanics,
      config,
    );
    expect(baseline.ok && alternate.ok).toBe(true);
    if (!baseline.ok || !alternate.ok) return;
    const withoutNames = (competitors: typeof baseline.generated.context.competitors) =>
      JSON.stringify(competitors, (key, value: unknown) =>
        key === 'familyNameId' || key === 'givenNameId' ? undefined : value,
      );
    expect(withoutNames(alternate.generated.context.competitors)).toEqual(
      withoutNames(baseline.generated.context.competitors),
    );
    expect(
      alternate.generated.context.competitors.map(({ givenNameId }) => givenNameId),
    ).not.toEqual(baseline.generated.context.competitors.map(({ givenNameId }) => givenNameId));
  });

  it('turns Practice Grade into legible trust, one-step hysteresis, and opportunity evidence', () => {
    const generated = generatePositionRoom(
      player(),
      createRng('position-room'),
      names,
      mechanics,
      config,
    );
    if (!generated.ok) throw new Error(generated.reason);
    const before = generated.generated.context;
    const result = updatePositionRoomAfterPractice(before, player().attributes, 100, mechanics);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.evidence.practiceFormAfter).toBe(82);
    expect(result.evidence.coachTrust).toEqual({
      before: 18,
      weeklyPracticeScore: 100,
      requestedDelta: 4,
      actualDelta: 4,
      after: 22,
    });
    expect(Math.abs(result.evidence.rankAfter - result.evidence.rankBefore)).toBeLessThanOrEqual(1);
    expect(result.evidence.hysteresisThresholdMilli).toBe(2_000);
    expect(result.evidence.adjacentExplanation.neighborParticipantId).not.toBe(before.playerId);
    expect(before.playerPracticeForm).toBe(55);
  });

  it('clamps trust and rejects cross-position mechanics without mutating inputs', () => {
    expect(derivePositionCoachTrustChange(99, 100)).toEqual({
      before: 99,
      weeklyPracticeScore: 100,
      requestedDelta: 4,
      actualDelta: 1,
      after: 100,
    });
    const input = player();
    const wrong = { ...mechanics, positionId: 'position_rb' } as PositionRoomMechanics;
    expect(generatePositionRoom(input, createRng(7), names, wrong, config)).toEqual({
      ok: false,
      reason: 'position_room.invalid_input',
    });
    expect(input.state.coachTrust).toBe(10);
  });
});
