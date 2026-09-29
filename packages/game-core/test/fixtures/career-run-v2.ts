import type {
  CareerPhaseV2,
  CareerRunV2,
  WeeklyActionResultV2,
  WrPlayerV2,
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

function fixturePlayer(body: number): WrPlayerV2 {
  return {
    id: 'player_schema_v2_fixture',
    displayName: 'Schema V2 Fixture',
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
    skillState: {
      acquisitions: [
        {
          offerIndex: 0,
          weekIndex: 1,
          offeredSkillIds: ['skill_fixture_a', 'skill_fixture_b', 'skill_fixture_c'],
          selectedSkillId: 'skill_fixture_a',
          rngDrawCountBefore: 0,
          rngDrawCountAfter: 3,
        },
        {
          offerIndex: 1,
          weekIndex: 5,
          offeredSkillIds: ['skill_fixture_d', 'skill_fixture_e', 'skill_fixture_f'],
          selectedSkillId: 'skill_fixture_d',
          rngDrawCountBefore: 3,
          rngDrawCountAfter: 6,
        },
      ],
      equippedSkillIds: ['skill_fixture_a', 'skill_fixture_d', null, null],
    },
  };
}

function recoveryResult(actionIndex: 0 | 1 | 2, bodyBefore: number): WeeklyActionResultV2 {
  return {
    actionId: 'action_recovery',
    actionIndex,
    weekIndex: 9,
    effectIds: ['effect_body_change'],
    bodyBefore,
    baseBodyDelta: 10,
    requestedBodyDelta: 12,
    actualBodyDelta: 12,
    bodyAfter: bodyBefore + 12,
    bodyXpEfficiencyPermille: 800,
    gpaBefore: 3,
    baseGpaDelta: 0,
    requestedGpaDelta: 0,
    actualGpaDelta: 0,
    gpaAfter: 3,
    attributeXp: [],
    proficiency: null,
    skillEffectAggregates: {
      xpMultiplierPermille: 1000,
      bodyCostMultiplierPermille: 1000,
      bodyDeltaFlat: 2,
      gpaDeltaMilli: 0,
    },
    appliedSkillEffects: [
      {
        type: 'action_body_delta_flat',
        skillId: 'skill_fixture_a',
        slotIndex: 0,
        effectIndex: 0,
        delta: 2,
      },
    ],
  };
}

const RESULT_0 = recoveryResult(0, 50);
const RESULT_1 = recoveryResult(1, 62);
const RESULT_2 = recoveryResult(2, 74);
const ACTION_IDS = ['action_recovery', 'action_recovery', 'action_recovery'] as const;

function fixtureCareer(phase: CareerPhaseV2, body: number, revision: number): CareerRunV2 {
  return deepFreezeFixture({
    schemaVersion: 2,
    id: 'career_schema_v2_fixture',
    careerSeed: 'career-schema-v2-fixture',
    rng: {
      algorithm: 'xoshiro128ss-v1',
      state: [1322460889, 107581708, 2852879607, 1205629718],
      drawCount: 9,
    },
    revision,
    programId: null,
    weekIndex: 9,
    recentWeeklyActionIds: [
      'action_recovery',
      'action_recovery',
      'action_recovery',
      'action_recovery',
      'action_recovery',
      'action_recovery',
    ],
    lastPassiveBodyRecovery: {
      weekIndex: 8,
      bodyBefore: 40,
      baseBodyDelta: 10,
      requestedBodyDelta: 12,
      actualBodyDelta: 12,
      bodyAfter: 52,
      appliedSkillEffects: [
        {
          type: 'passive_body_recovery_flat',
          skillId: 'skill_fixture_a',
          slotIndex: 0,
          effectIndex: 1,
          delta: 2,
        },
      ],
    },
    phase,
    player: fixturePlayer(body),
  });
}

export const CAREER_RUN_V2_PHASE_FIXTURES = deepFreezeFixture({
  plan: fixtureCareer({ type: 'PLAN_ACTIONS' }, 50, 30),
  resolve0: fixtureCareer(
    { type: 'RESOLVE_ACTIONS', actionIds: ACTION_IDS, nextActionIndex: 0, results: [] },
    50,
    31,
  ),
  resolve1: fixtureCareer(
    { type: 'RESOLVE_ACTIONS', actionIds: ACTION_IDS, nextActionIndex: 1, results: [RESULT_0] },
    62,
    32,
  ),
  resolve2: fixtureCareer(
    {
      type: 'RESOLVE_ACTIONS',
      actionIds: ACTION_IDS,
      nextActionIndex: 2,
      results: [RESULT_0, RESULT_1],
    },
    74,
    33,
  ),
  weekEnd: fixtureCareer({ type: 'WEEK_END', results: [RESULT_0, RESULT_1, RESULT_2] }, 86, 34),
  skillBreakthrough: fixtureCareer(
    {
      type: 'SKILL_BREAKTHROUGH',
      offer: {
        offerIndex: 2,
        weekIndex: 9,
        offeredSkillIds: ['skill_fixture_b', 'skill_fixture_g', 'skill_fixture_h'],
        rngDrawCountBefore: 6,
        rngDrawCountAfter: 9,
      },
    },
    50,
    35,
  ),
});

export type CareerRunV2PhaseFixtureName = keyof typeof CAREER_RUN_V2_PHASE_FIXTURES;

export const CAREER_RUN_V2_PHASE_FIXTURE_CASES = deepFreezeFixture(
  Object.entries(CAREER_RUN_V2_PHASE_FIXTURES).map(([name, career]) => ({
    name: name as CareerRunV2PhaseFixtureName,
    career,
  })),
);
