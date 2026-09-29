import type {
  GameOpponentMechanicsProfile,
  GameTuningDefinition,
  KeySnapFamilyMechanicsDefinition,
  KeySnapPatternMechanicsDefinition,
  SkillMechanicsDefinition,
} from '../../src/index.js';

const TEST_SKILL_ELIGIBILITY = {
  positionIds: [],
  archetypeIds: [],
  requiredPlayerTagIds: [],
  excludedPlayerTagIds: [],
  minWeekIndex: 0,
} as const;

function fixtureSkill(
  id: 'skill_fixture_a' | 'skill_fixture_d',
  effects: SkillMechanicsDefinition['effects'],
): SkillMechanicsDefinition {
  return {
    id,
    gradeId: 'skill_grade_c',
    familyId: 'skill_family_game_day',
    baseOfferWeight: 100,
    eligibility: TEST_SKILL_ELIGIBILITY,
    behaviorWeightRules: [],
    effects,
  };
}

export const TEST_GAME_SKILLS = [
  fixtureSkill('skill_fixture_a', [{ type: 'passive_body_recovery_flat', delta: 1 }]),
  fixtureSkill('skill_fixture_d', [{ type: 'passive_body_recovery_flat', delta: 1 }]),
] as const;

export const TEST_COVERAGE_GAME_SKILLS = [
  fixtureSkill('skill_fixture_a', [
    { type: 'game_hook', hookId: 'game_hook_coverage_clue_bonus', valueMilli: 1_000 },
  ]),
  TEST_GAME_SKILLS[1],
] as const;

export const TEST_ALL_GAME_HOOK_SKILLS = [
  fixtureSkill('skill_fixture_a', [
    { type: 'game_hook', hookId: 'game_hook_coverage_clue_bonus', valueMilli: 1_000 },
    { type: 'game_hook', hookId: 'game_hook_contested_catch_success_bonus', valueMilli: 80 },
    { type: 'game_hook', hookId: 'game_hook_tipped_turnover_risk_bonus', valueMilli: 50 },
    { type: 'game_hook', hookId: 'game_hook_yac_yardage_multiplier', valueMilli: 1_200 },
    { type: 'game_hook', hookId: 'game_hook_fumble_risk_multiplier', valueMilli: 1_250 },
    { type: 'game_hook', hookId: 'game_hook_assignment_reliability_bonus', valueMilli: 40 },
    { type: 'game_hook', hookId: 'game_hook_package_snap_bonus', valueMilli: 60 },
    { type: 'game_hook', hookId: 'game_hook_pressure_composure_bonus', valueMilli: 75 },
  ]),
  TEST_GAME_SKILLS[1],
] as const;

export const TEST_GAME_TUNING = {
  drive: {
    fieldGoalBasePermille: 150,
    homeRatingBonus: 2,
    maxDriveCount: 24,
    maximumSecondsElapsed: 330,
    minimumSecondsElapsed: 75,
    ratingEdgePermillePerPoint: 6,
    touchdownBasePermille: 250,
  },
  grade: {
    baseScore: 50,
    bands: [
      { id: 'performance_grade_elite', minimumScore: 90 },
      { id: 'performance_grade_strong', minimumScore: 75 },
      { id: 'performance_grade_solid', minimumScore: 60 },
      { id: 'performance_grade_developing', minimumScore: 45 },
      { id: 'performance_grade_poor', minimumScore: 0 },
    ],
    dropPenalty: 10,
    fitDivisor: 4,
    opportunityNormalizationTarget: 4,
    receivingYardsDivisor: 10,
    receptionValue: 3,
    touchdownValue: 12,
    turnoverPenalty: 18,
  },
  growth: {
    baseAttributeXpPerOpportunity: 3,
    baseBodyCost: -8,
    confidenceDeltaByBand: {
      performance_grade_developing: -1,
      performance_grade_elite: 4,
      performance_grade_poor: -3,
      performance_grade_solid: 1,
      performance_grade_strong: 2,
    },
    fitXpDivisor: 8,
    trustDeltaByBand: {
      performance_grade_developing: -1,
      performance_grade_elite: 5,
      performance_grade_poor: -4,
      performance_grade_solid: 1,
      performance_grade_strong: 3,
    },
  },
  information: {
    diagnosticMinimumScore: 80,
    filmStudyBonus: 20,
    footballIqWeightPermille: 650,
    partialMinimumScore: 50,
    preparationWeightPermille: 350,
  },
  maxKeySnapOpportunities: 12,
  opportunityBands: [
    { minimumSnapPermille: 650, opportunityBudget: 9 },
    { minimumSnapPermille: 550, opportunityBudget: 8 },
    { minimumSnapPermille: 450, opportunityBudget: 7 },
    { minimumSnapPermille: 350, opportunityBudget: 6 },
    { minimumSnapPermille: 250, opportunityBudget: 5 },
    { minimumSnapPermille: 150, opportunityBudget: 4 },
    { minimumSnapPermille: 75, opportunityBudget: 3 },
    { minimumSnapPermille: 45, opportunityBudget: 2 },
    { minimumSnapPermille: 21, opportunityBudget: 1 },
  ],
  opportunityBoundsByDepthRank: [
    { depthRank: 1, maximumOpportunities: 10, minimumOpportunities: 6 },
    { depthRank: 2, maximumOpportunities: 8, minimumOpportunities: 4 },
    { depthRank: 3, maximumOpportunities: 6, minimumOpportunities: 2 },
    { depthRank: 4, maximumOpportunities: 4, minimumOpportunities: 1 },
    { depthRank: 5, maximumOpportunities: 2, minimumOpportunities: 0 },
    { depthRank: 6, maximumOpportunities: 2, minimumOpportunities: 0 },
    { depthRank: 7, maximumOpportunities: 2, minimumOpportunities: 0 },
    { depthRank: 8, maximumOpportunities: 2, minimumOpportunities: 0 },
  ],
  periodCount: 4,
  periodLengthSeconds: 900,
  resolution: {
    attributeWeightPermille: 250,
    bodyWeightPermille: 75,
    confidenceWeightPermille: 75,
    decisionFitWeightPermille: 250,
    matchupWeightPermille: 150,
    preparationWeightPermille: 125,
    rollMaximum: 20,
    rollMinimum: -20,
    teamContextWeightPermille: 75,
  },
  zeroOpportunityMaxSnapPermille: 20,
} as const satisfies GameTuningDefinition;

export const TEST_GAME_FAMILIES = [
  {
    id: 'key_snap_family_release',
    attributeWeights: [
      { attributeId: 'attribute_wr_release', weightPermille: 600 },
      { attributeId: 'attribute_burst', weightPermille: 400 },
    ],
    decisionIds: [
      'key_snap_decision_speed_release',
      'key_snap_decision_hand_clear',
      'key_snap_decision_patient_feint',
    ],
  },
  {
    id: 'key_snap_family_route',
    attributeWeights: [
      { attributeId: 'attribute_wr_route_running', weightPermille: 600 },
      { attributeId: 'attribute_agility', weightPermille: 400 },
    ],
    decisionIds: [
      'key_snap_decision_cross_face',
      'key_snap_decision_stack_defender',
      'key_snap_decision_settle_window',
    ],
  },
  {
    id: 'key_snap_family_catch',
    attributeWeights: [
      { attributeId: 'attribute_wr_hands', weightPermille: 600 },
      { attributeId: 'attribute_wr_catch_in_traffic', weightPermille: 400 },
    ],
    decisionIds: [
      'key_snap_decision_secure_frame',
      'key_snap_decision_attack_high_point',
      'key_snap_decision_late_hands',
    ],
  },
  {
    id: 'key_snap_family_yac',
    attributeWeights: [
      { attributeId: 'attribute_wr_yac', weightPermille: 600 },
      { attributeId: 'attribute_speed', weightPermille: 400 },
    ],
    decisionIds: [
      'key_snap_decision_protect_ball',
      'key_snap_decision_cutback_lane',
      'key_snap_decision_burst_upfield',
    ],
  },
] as const satisfies readonly KeySnapFamilyMechanicsDefinition[];

const TEST_PATTERN_IDS = [
  'key_snap_pattern_test_release_a',
  'key_snap_pattern_test_release_b',
  'key_snap_pattern_test_route_a',
  'key_snap_pattern_test_route_b',
  'key_snap_pattern_test_catch_a',
  'key_snap_pattern_test_catch_b',
  'key_snap_pattern_test_yac_a',
  'key_snap_pattern_test_yac_b',
] as const;

export const TEST_GAME_PATTERNS = TEST_GAME_FAMILIES.flatMap((family, familyIndex) =>
  ([0, 1] as const).map((patternIndex) => ({
    id: TEST_PATTERN_IDS[familyIndex * 2 + patternIndex]!,
    familyId: family.id,
    clueIds: ['game_clue_test_coverage', 'game_clue_test_leverage'],
    coverageId: patternIndex === 0 ? 'game_coverage_test_man' : 'game_coverage_test_zone',
    leverageId: patternIndex === 0 ? 'game_leverage_test_inside' : 'game_leverage_test_outside',
    decisionFits: family.decisionIds.map((decisionId, decisionIndex) => ({
      decisionId,
      fit: decisionIndex === patternIndex ? 24 : decisionIndex === 2 ? -8 : 6,
    })),
    outcome: {
      baseCatchPermille: 500,
      baseReceivingYards: 12,
      baseTargetPermille: 800,
      dropRiskPermille: 50,
      touchdownChancePermille: 100,
      turnoverRiskPermille: 25,
    },
  })),
) as readonly KeySnapPatternMechanicsDefinition[];

export const TEST_PLAYER_GAME_PROFILE = {
  programId: 'program_test_01',
  offenseRating: 78,
  defenseRating: 72,
  qbRating: 80,
} as const satisfies GameOpponentMechanicsProfile;

export const TEST_OPPONENT_GAME_PROFILE = {
  programId: 'program_test_02',
  offenseRating: 76,
  defenseRating: 75,
  qbRating: 74,
} as const satisfies GameOpponentMechanicsProfile;
