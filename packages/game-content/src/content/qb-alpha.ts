import {
  QB_ALPHA_CLUE_IDS,
  QB_ALPHA_FAMILY_IDS,
  type QB_ALPHA_EVENT_IDS,
  type QB_ALPHA_PATTERN_IDS,
  type QbAlphaContent,
} from '../schema/qb-alpha.js';
import type {
  QbDecisionDefinition,
  QbEventDefinition,
  QbPatternDefinition,
  QbSkillDefinition,
} from '@project-saturday/game-core';

const words = (id: string) =>
  id
    .replace(
      /^(key_snap_(?:family|decision|pattern)_qb_|game_clue_qb_|skill_qb_|event_choice_qb_|event_qb_|game_participation_qb_)/,
      '',
    )
    .replaceAll('_', '.');
const localized = (id: string, section: string) => ({
  descriptionKey: `m7Qb.${section}.${words(id)}.description`,
  nameKey: `m7Qb.${section}.${words(id)}.name`,
});

export const qbAlphaDecisions = [
  {
    id: 'key_snap_decision_qb_confirm_shell',
    familyId: 'key_snap_family_qb_pre_snap',
    playMode: 'PASS',
    completionModifierPermille: 50,
    turnoverRiskModifierPermille: -35,
    pressureResponse: 2,
    yardModifier: -1,
  },
  {
    id: 'key_snap_decision_qb_redirect_protection',
    familyId: 'key_snap_family_qb_pre_snap',
    playMode: 'PASS',
    completionModifierPermille: 10,
    turnoverRiskModifierPermille: -10,
    pressureResponse: 12,
    yardModifier: 0,
  },
  {
    id: 'key_snap_decision_qb_vary_cadence',
    familyId: 'key_snap_family_qb_pre_snap',
    playMode: 'PASS',
    completionModifierPermille: -20,
    turnoverRiskModifierPermille: 10,
    pressureResponse: 6,
    yardModifier: 4,
  },
  {
    id: 'key_snap_decision_qb_climb_pocket',
    familyId: 'key_snap_family_qb_pocket',
    playMode: 'PASS',
    completionModifierPermille: 35,
    turnoverRiskModifierPermille: -10,
    pressureResponse: 13,
    yardModifier: 1,
  },
  {
    id: 'key_snap_decision_qb_reset_platform',
    familyId: 'key_snap_family_qb_pocket',
    playMode: 'PASS',
    completionModifierPermille: 70,
    turnoverRiskModifierPermille: -25,
    pressureResponse: 3,
    yardModifier: -2,
  },
  {
    id: 'key_snap_decision_qb_escape_edge',
    familyId: 'key_snap_family_qb_pocket',
    playMode: 'SCRAMBLE',
    completionModifierPermille: 0,
    turnoverRiskModifierPermille: 20,
    pressureResponse: 8,
    yardModifier: 2,
  },
  {
    id: 'key_snap_decision_qb_take_checkdown',
    familyId: 'key_snap_family_qb_throw',
    playMode: 'PASS',
    completionModifierPermille: 140,
    turnoverRiskModifierPermille: -70,
    pressureResponse: 4,
    yardModifier: -6,
  },
  {
    id: 'key_snap_decision_qb_attack_layered_window',
    familyId: 'key_snap_family_qb_throw',
    playMode: 'PASS',
    completionModifierPermille: 10,
    turnoverRiskModifierPermille: 20,
    pressureResponse: 0,
    yardModifier: 6,
  },
  {
    id: 'key_snap_decision_qb_challenge_boundary',
    familyId: 'key_snap_family_qb_throw',
    playMode: 'PASS',
    completionModifierPermille: -90,
    turnoverRiskModifierPermille: 65,
    pressureResponse: -2,
    yardModifier: 12,
  },
  {
    id: 'key_snap_decision_qb_slide_early',
    familyId: 'key_snap_family_qb_scramble',
    playMode: 'SCRAMBLE',
    completionModifierPermille: 0,
    turnoverRiskModifierPermille: -80,
    pressureResponse: 8,
    yardModifier: -2,
  },
  {
    id: 'key_snap_decision_qb_reach_marker',
    familyId: 'key_snap_family_qb_scramble',
    playMode: 'SCRAMBLE',
    completionModifierPermille: 0,
    turnoverRiskModifierPermille: 15,
    pressureResponse: 4,
    yardModifier: 4,
  },
  {
    id: 'key_snap_decision_qb_extend_boundary',
    familyId: 'key_snap_family_qb_scramble',
    playMode: 'THROW_AWAY',
    completionModifierPermille: 0,
    turnoverRiskModifierPermille: -100,
    pressureResponse: 15,
    yardModifier: 0,
  },
] as const satisfies readonly QbDecisionDefinition[];

const fits = (
  first: (typeof qbAlphaDecisions)[number]['id'],
  second: (typeof qbAlphaDecisions)[number]['id'],
  third: (typeof qbAlphaDecisions)[number]['id'],
  values: readonly [number, number, number],
) =>
  [
    { decisionId: first, fit: values[0] },
    { decisionId: second, fit: values[1] },
    { decisionId: third, fit: values[2] },
  ] as const;

const cluesFor = (patternId: (typeof QB_ALPHA_PATTERN_IDS)[number]) => {
  const prefix = `game_clue_qb_${patternId.slice('key_snap_pattern_qb_'.length)}`;
  return [
    `${prefix}_one` as `game_clue_qb_${string}`,
    `${prefix}_two` as `game_clue_qb_${string}`,
    `${prefix}_three` as `game_clue_qb_${string}`,
  ] as const;
};

export const qbAlphaPatterns = [
  {
    id: 'key_snap_pattern_qb_split_safety_alert',
    familyId: 'key_snap_family_qb_pre_snap',
    clueIds: cluesFor('key_snap_pattern_qb_split_safety_alert'),
    decisionFits: fits(
      'key_snap_decision_qb_confirm_shell',
      'key_snap_decision_qb_redirect_protection',
      'key_snap_decision_qb_vary_cadence',
      [92, 58, 70],
    ),
    attributeWeights: [
      { attributeId: 'attribute_football_iq', weightPermille: 550 },
      { attributeId: 'attribute_qb_read_progression', weightPermille: 450 },
    ],
    pressurePermille: 240,
    baseCompletionPermille: 630,
    baseTurnoverRiskPermille: 95,
    touchdownChancePermille: 150,
    baseYards: 11,
  },
  {
    id: 'key_snap_pattern_qb_pressure_surface',
    familyId: 'key_snap_family_qb_pre_snap',
    clueIds: cluesFor('key_snap_pattern_qb_pressure_surface'),
    decisionFits: fits(
      'key_snap_decision_qb_confirm_shell',
      'key_snap_decision_qb_redirect_protection',
      'key_snap_decision_qb_vary_cadence',
      [50, 94, 76],
    ),
    attributeWeights: [
      { attributeId: 'attribute_qb_read_progression', weightPermille: 600 },
      { attributeId: 'attribute_composure', weightPermille: 400 },
    ],
    pressurePermille: 490,
    baseCompletionPermille: 570,
    baseTurnoverRiskPermille: 140,
    touchdownChancePermille: 105,
    baseYards: 9,
  },
  {
    id: 'key_snap_pattern_qb_interior_squeeze',
    familyId: 'key_snap_family_qb_pocket',
    clueIds: cluesFor('key_snap_pattern_qb_interior_squeeze'),
    decisionFits: fits(
      'key_snap_decision_qb_climb_pocket',
      'key_snap_decision_qb_reset_platform',
      'key_snap_decision_qb_escape_edge',
      [95, 62, 40],
    ),
    attributeWeights: [
      { attributeId: 'attribute_qb_pocket_presence', weightPermille: 650 },
      { attributeId: 'attribute_composure', weightPermille: 350 },
    ],
    pressurePermille: 560,
    baseCompletionPermille: 560,
    baseTurnoverRiskPermille: 135,
    touchdownChancePermille: 100,
    baseYards: 8,
  },
  {
    id: 'key_snap_pattern_qb_edge_escape',
    familyId: 'key_snap_family_qb_pocket',
    clueIds: cluesFor('key_snap_pattern_qb_edge_escape'),
    decisionFits: fits(
      'key_snap_decision_qb_climb_pocket',
      'key_snap_decision_qb_reset_platform',
      'key_snap_decision_qb_escape_edge',
      [62, 55, 94],
    ),
    attributeWeights: [
      { attributeId: 'attribute_qb_pocket_presence', weightPermille: 550 },
      { attributeId: 'attribute_agility', weightPermille: 450 },
    ],
    pressurePermille: 610,
    baseCompletionPermille: 520,
    baseTurnoverRiskPermille: 150,
    touchdownChancePermille: 90,
    baseYards: 7,
  },
  {
    id: 'key_snap_pattern_qb_layered_window',
    familyId: 'key_snap_family_qb_throw',
    clueIds: cluesFor('key_snap_pattern_qb_layered_window'),
    decisionFits: fits(
      'key_snap_decision_qb_take_checkdown',
      'key_snap_decision_qb_attack_layered_window',
      'key_snap_decision_qb_challenge_boundary',
      [64, 96, 42],
    ),
    attributeWeights: [
      { attributeId: 'attribute_qb_intermediate_accuracy', weightPermille: 650 },
      { attributeId: 'attribute_qb_read_progression', weightPermille: 350 },
    ],
    pressurePermille: 270,
    baseCompletionPermille: 600,
    baseTurnoverRiskPermille: 105,
    touchdownChancePermille: 155,
    baseYards: 13,
  },
  {
    id: 'key_snap_pattern_qb_boundary_match',
    familyId: 'key_snap_family_qb_throw',
    clueIds: cluesFor('key_snap_pattern_qb_boundary_match'),
    decisionFits: fits(
      'key_snap_decision_qb_take_checkdown',
      'key_snap_decision_qb_attack_layered_window',
      'key_snap_decision_qb_challenge_boundary',
      [72, 57, 91],
    ),
    attributeWeights: [
      { attributeId: 'attribute_qb_deep_accuracy', weightPermille: 600 },
      { attributeId: 'attribute_qb_throw_power', weightPermille: 400 },
    ],
    pressurePermille: 310,
    baseCompletionPermille: 470,
    baseTurnoverRiskPermille: 145,
    touchdownChancePermille: 240,
    baseYards: 18,
  },
  {
    id: 'key_snap_pattern_qb_open_lane',
    familyId: 'key_snap_family_qb_scramble',
    clueIds: cluesFor('key_snap_pattern_qb_open_lane'),
    decisionFits: fits(
      'key_snap_decision_qb_slide_early',
      'key_snap_decision_qb_reach_marker',
      'key_snap_decision_qb_extend_boundary',
      [58, 95, 70],
    ),
    attributeWeights: [
      { attributeId: 'attribute_speed', weightPermille: 600 },
      { attributeId: 'attribute_agility', weightPermille: 400 },
    ],
    pressurePermille: 420,
    baseCompletionPermille: 500,
    baseTurnoverRiskPermille: 125,
    touchdownChancePermille: 115,
    baseYards: 7,
  },
  {
    id: 'key_snap_pattern_qb_late_spy',
    familyId: 'key_snap_family_qb_scramble',
    clueIds: cluesFor('key_snap_pattern_qb_late_spy'),
    decisionFits: fits(
      'key_snap_decision_qb_slide_early',
      'key_snap_decision_qb_reach_marker',
      'key_snap_decision_qb_extend_boundary',
      [86, 48, 92],
    ),
    attributeWeights: [
      { attributeId: 'attribute_qb_pocket_presence', weightPermille: 500 },
      { attributeId: 'attribute_composure', weightPermille: 500 },
    ],
    pressurePermille: 520,
    baseCompletionPermille: 490,
    baseTurnoverRiskPermille: 160,
    touchdownChancePermille: 80,
    baseYards: 5,
  },
] as const satisfies readonly QbPatternDefinition[];

const qbAlphaSkillRows = [
  {
    id: 'skill_qb_chalkboard_echo_c',
    familyId: 'skill_family_development',
    gradeId: 'skill_grade_c',
    effects: [{ type: 'qb_information_clue_bonus', value: 1 }],
  },
  {
    id: 'skill_qb_protection_voice_b',
    familyId: 'skill_family_role_coach',
    gradeId: 'skill_grade_b',
    effects: [
      { type: 'qb_decision_score_flat', value: 5, familyId: 'key_snap_family_qb_pre_snap' },
      { type: 'qb_grade_bonus', value: 2 },
    ],
  },
  {
    id: 'skill_qb_compact_base_c',
    familyId: 'skill_family_game_day',
    gradeId: 'skill_grade_c',
    effects: [{ type: 'qb_decision_score_flat', value: 4, familyId: 'key_snap_family_qb_pocket' }],
  },
  {
    id: 'skill_qb_layered_nerve_a',
    familyId: 'skill_family_game_day',
    gradeId: 'skill_grade_a',
    effects: [
      {
        type: 'qb_decision_score_flat',
        value: 7,
        decisionId: 'key_snap_decision_qb_attack_layered_window',
      },
      {
        type: 'qb_turnover_risk_delta_permille',
        value: 20,
        decisionId: 'key_snap_decision_qb_attack_layered_window',
      },
    ],
  },
  {
    id: 'skill_qb_escape_geometry_b',
    familyId: 'skill_family_game_day',
    gradeId: 'skill_grade_b',
    effects: [
      { type: 'qb_scramble_yards_flat', value: 3, familyId: 'key_snap_family_qb_scramble' },
    ],
  },
  {
    id: 'skill_qb_safe_harbor_b',
    familyId: 'skill_family_mindset',
    gradeId: 'skill_grade_b',
    effects: [
      {
        type: 'qb_turnover_risk_delta_permille',
        value: -45,
        decisionId: 'key_snap_decision_qb_take_checkdown',
      },
    ],
  },
  {
    id: 'skill_qb_weekly_maintenance_c',
    familyId: 'skill_family_body',
    gradeId: 'skill_grade_c',
    effects: [{ type: 'qb_body_cost_reduction', value: 3 }],
  },
  {
    id: 'skill_qb_short_memory_b',
    familyId: 'skill_family_mindset',
    gradeId: 'skill_grade_b',
    effects: [{ type: 'qb_confidence_loss_reduction', value: 2 }],
  },
  {
    id: 'skill_qb_rep_compounder_a',
    familyId: 'skill_family_development',
    gradeId: 'skill_grade_a',
    effects: [{ type: 'qb_xp_multiplier_permille', value: 250 }],
  },
  {
    id: 'skill_qb_command_presence_a',
    familyId: 'skill_family_role_coach',
    gradeId: 'skill_grade_a',
    effects: [
      { type: 'qb_grade_bonus', value: 5 },
      { type: 'qb_decision_score_flat', value: 3 },
    ],
  },
  {
    id: 'skill_qb_open_office_b',
    familyId: 'skill_family_life',
    gradeId: 'skill_grade_b',
    effects: [{ type: 'qb_event_choice_unlock', value: 1 }],
  },
  {
    id: 'skill_qb_shared_spotlight_s',
    familyId: 'skill_family_life',
    gradeId: 'skill_grade_s',
    effects: [{ type: 'qb_event_positive_multiplier_permille', value: 250 }],
  },
] as const;

export const qbAlphaSkills = qbAlphaSkillRows.map((skill) => ({
  ...skill,
  positionId: 'position_qb' as const,
})) satisfies readonly QbSkillDefinition[];

const zeroModifiers = { clueBonus: 0, decisionScoreFlat: 0, pressureReductionPermille: 0 };
const effects = (
  bodyDelta: number,
  preparationDelta: number,
  confidenceDelta: number,
  coachTrustDelta: number,
  gpaMilliDelta = 0,
  brandDelta = 0,
  gameModifiers = zeroModifiers,
) => ({
  bodyDelta,
  preparationDelta,
  confidenceDelta,
  coachTrustDelta,
  gpaMilliDelta,
  brandDelta,
  gameModifiers,
});

const eventBlueprints = [
  [
    'protection_meeting',
    {},
    effects(-4, 8, 0, 3, 0, 0, {
      clueBonus: 1,
      decisionScoreFlat: 0,
      pressureReductionPermille: 80,
    }),
    effects(4, -2, 1, -1),
  ],
  [
    'backup_rep_request',
    { maxCoachTrust: 60 },
    effects(-5, 6, 2, 4),
    effects(3, 0, 0, -2),
    effects(-2, 4, 4, 5),
  ],
  ['receiver_timing', {}, effects(-6, 7, 3, 2), effects(5, -3, -1, 0), effects(-3, 5, 4, 3)],
  [
    'film_room_dispute',
    { minPreparation: 35 },
    effects(0, 4, -2, 3),
    effects(0, -4, 2, -3),
    effects(-2, 6, 3, 4),
  ],
  ['muddy_practice', { maxBody: 70 }, effects(-8, 5, 2, 4), effects(8, -5, 0, -2)],
  ['campus_interview', {}, effects(-2, -3, 4, 0, 0, 8), effects(3, 2, -1, 0, 0, -3)],
  [
    'tutor_overlap',
    {},
    effects(2, -5, -1, -1, 350),
    effects(-4, 5, 1, 2, -150),
    effects(-2, 3, 2, 1, 250),
  ],
  ['sore_throwing_arm', { maxBody: 55 }, effects(10, -4, 0, -1), effects(-7, 6, 1, 3)],
  [
    'two_minute_challenge',
    { minConfidence: 35 },
    effects(-5, 5, 6, 5, 0, 0, {
      clueBonus: 0,
      decisionScoreFlat: 4,
      pressureReductionPermille: 0,
    }),
    effects(4, -2, -2, -1),
  ],
  ['roommate_noise', {}, effects(-1, 4, -2, 0, 200), effects(6, -4, 1, 0, -100)],
  [
    'captain_message',
    { minCoachTrust: 40 },
    effects(-3, 3, 5, 4),
    effects(2, 0, -2, -1),
    effects(-4, 5, 6, 5),
  ],
  ['local_appearance', {}, effects(-4, -4, 5, 0, -100, 10), effects(4, 2, -1, 0, 100, -4)],
] as const;

export const qbAlphaEvents = eventBlueprints.map(([slug, requirements, first, second, third]) => {
  const eventId = `event_qb_${slug}` as (typeof QB_ALPHA_EVENT_IDS)[number];
  const choices = [
    { id: `event_choice_qb_${slug}_commit` as `event_choice_qb_${string}`, effects: first },
    { id: `event_choice_qb_${slug}_protect` as `event_choice_qb_${string}`, effects: second },
    ...(third === undefined
      ? []
      : [
          {
            id: `event_choice_qb_${slug}_connect` as `event_choice_qb_${string}`,
            requiresUnlockLevel: 1,
            effects: third,
          },
        ]),
  ].map((choice) => ({ ...choice, ...localized(choice.id, 'choices') }));
  return {
    id: eventId,
    ...localized(eventId, 'events'),
    weight: 100,
    cooldownWeeks: 3,
    requirements,
    choices,
  };
}) satisfies readonly QbEventDefinition[];

export const qbAlphaContent = {
  id: 'qb_alpha_vertical',
  nameKey: 'm7Qb.vertical.name',
  descriptionKey: 'm7Qb.vertical.description',
  familyIds: QB_ALPHA_FAMILY_IDS,
  decisions: qbAlphaDecisions.map((decision) => ({
    ...decision,
    ...localized(decision.id, 'decisions'),
  })),
  clues: QB_ALPHA_CLUE_IDS.map((id) => ({ id, ...localized(id, 'clues') })),
  patterns: qbAlphaPatterns.map((pattern) => ({
    ...pattern,
    ...localized(pattern.id, 'patterns'),
  })),
  skills: qbAlphaSkills.map((skill) => ({ ...skill, ...localized(skill.id, 'skills') })),
  events: qbAlphaEvents,
  participationFeedback: [
    {
      id: 'game_participation_qb_no_snaps',
      ...localized('game_participation_qb_no_snaps', 'feedback'),
    },
    {
      id: 'game_participation_qb_limited_snaps',
      ...localized('game_participation_qb_limited_snaps', 'feedback'),
    },
  ],
} as const satisfies QbAlphaContent;
