import type {
  CareerPhaseV1,
  CareerRunV1,
  WeeklyActionResultV1,
  WrPlayerV1,
} from '../../src/index.js';

function deepFreezeFixture<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const nestedValue of Object.values(value)) {
    deepFreezeFixture(nestedValue);
  }
  return Object.freeze(value) as T;
}

function fixturePlayer(body: number): WrPlayerV1 {
  return {
    id: 'player_schema_v1_fixture',
    displayName: 'Schema V1 Fixture',
    positionId: 'position_wr',
    archetypeId: 'archetype_wr_route_technician',
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_competitive', 'personality_quiet'],
    appearance: {
      skinToneId: 'skin_tone_fixture',
      faceId: 'face_fixture',
      hairStyleId: 'hair_style_fixture',
      hairColorId: 'hair_color_fixture',
      bodyTypeId: 'body_type_fixture',
      eyeBlackId: null,
      armSleevesId: null,
      glovesId: 'gloves_fixture',
      visorId: null,
      wristTapeId: null,
      towelId: null,
      jerseyFitId: 'jersey_fit_fixture',
      footwearId: 'footwear_fixture',
    },
    heightCm: 188,
    weightKg: 88,
    attributes: {
      physical: {
        attribute_speed: { rating: 60, xp: 0 },
        attribute_burst: { rating: 60, xp: 0 },
        attribute_agility: { rating: 60, xp: 0 },
        attribute_strength: { rating: 60, xp: 0 },
        attribute_conditioning: { rating: 60, xp: 0 },
        attribute_durability: { rating: 60, xp: 0 },
      },
      mental: {
        attribute_football_iq: { rating: 60, xp: 0 },
        attribute_composure: { rating: 60, xp: 0 },
        attribute_discipline: { rating: 60, xp: 0 },
        attribute_work_ethic: { rating: 60, xp: 0 },
      },
      wr: {
        attribute_wr_release: { rating: 60, xp: 0 },
        attribute_wr_route_running: { rating: 60, xp: 0 },
        attribute_wr_hands: { rating: 60, xp: 0 },
        attribute_wr_catch_in_traffic: { rating: 60, xp: 0 },
        attribute_wr_yac: { rating: 60, xp: 0 },
        attribute_wr_blocking: { rating: 60, xp: 0 },
      },
    },
    state: {
      body,
      confidence: 50,
      coachTrust: 10,
      brand: 5,
      gpa: 3,
    },
    tagIds: [],
    trainingProficiencyUses: {
      proficiency_route_drills: 0,
      proficiency_release_drills: 0,
      proficiency_hands_catch_work: 0,
      proficiency_weight_room: 0,
      proficiency_speed_work: 0,
      proficiency_film_study: 0,
      proficiency_extra_practice: 0,
    },
  };
}

function recoveryResult(actionIndex: 0 | 1 | 2, bodyBefore: number): WeeklyActionResultV1 {
  return {
    actionId: 'action_recovery',
    actionIndex,
    weekIndex: 4,
    effectIds: ['effect_body_change'],
    bodyBefore,
    requestedBodyDelta: 10,
    actualBodyDelta: 10,
    bodyAfter: bodyBefore + 10,
    bodyXpEfficiencyPermille: 800,
    gpaBefore: 3,
    requestedGpaDelta: 0,
    actualGpaDelta: 0,
    gpaAfter: 3,
    attributeXp: [],
    proficiency: null,
  };
}

const RESULT_0 = recoveryResult(0, 50);
const RESULT_1 = recoveryResult(1, 60);
const RESULT_2 = recoveryResult(2, 70);
const ACTION_IDS = ['action_recovery', 'action_recovery', 'action_recovery'] as const;

function fixtureCareer(phase: CareerPhaseV1, body: number, revision: number): CareerRunV1 {
  return deepFreezeFixture({
    schemaVersion: 1,
    id: 'career_schema_v1_fixture',
    careerSeed: 'career-schema-v1-fixture',
    rng: {
      algorithm: 'xoshiro128ss-v1',
      state: [2384750088, 617392213, 2798724142, 485912099],
      drawCount: 0,
    },
    revision,
    programId: null,
    weekIndex: 4,
    phase,
    player: fixturePlayer(body),
  });
}

export const CAREER_RUN_V1_PHASE_FIXTURES = deepFreezeFixture({
  plan: fixtureCareer({ type: 'PLAN_ACTIONS' }, 50, 17),
  resolve0: fixtureCareer(
    {
      type: 'RESOLVE_ACTIONS',
      actionIds: ACTION_IDS,
      nextActionIndex: 0,
      results: [],
    },
    50,
    18,
  ),
  resolve1: fixtureCareer(
    {
      type: 'RESOLVE_ACTIONS',
      actionIds: ACTION_IDS,
      nextActionIndex: 1,
      results: [RESULT_0],
    },
    60,
    19,
  ),
  resolve2: fixtureCareer(
    {
      type: 'RESOLVE_ACTIONS',
      actionIds: ACTION_IDS,
      nextActionIndex: 2,
      results: [RESULT_0, RESULT_1],
    },
    70,
    20,
  ),
  weekEnd: fixtureCareer(
    {
      type: 'WEEK_END',
      results: [RESULT_0, RESULT_1, RESULT_2],
    },
    80,
    21,
  ),
});

export type CareerRunV1PhaseFixtureName = keyof typeof CAREER_RUN_V1_PHASE_FIXTURES;

export const CAREER_RUN_V1_PHASE_FIXTURE_CASES = deepFreezeFixture(
  Object.entries(CAREER_RUN_V1_PHASE_FIXTURES).map(([name, career]) => ({
    name: name as CareerRunV1PhaseFixtureName,
    career,
  })),
);
