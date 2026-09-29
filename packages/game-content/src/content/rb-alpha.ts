import type {
  RbDecisionDefinition,
  RbEventDefinition,
  RbPatternDefinition,
  RbSkillDefinition,
} from '@project-saturday/game-core';
import {
  RB_ALPHA_CLUE_IDS,
  RB_ALPHA_FAMILY_IDS,
  type RB_ALPHA_DECISION_IDS,
  type RB_ALPHA_EVENT_IDS,
  type RbAlphaContent,
} from '../schema/rb-alpha.js';

const slug = (id: string) =>
  id
    .replace(
      /^(key_snap_(?:family|decision|pattern)_rb_|game_clue_rb_|skill_rb_|event_choice_rb_|event_rb_|game_participation_rb_)/,
      '',
    )
    .replaceAll('_', '.');
const localized = (id: string, section: string) => ({
  nameKey: `m7Rb.${section}.${slug(id)}.name`,
  descriptionKey: `m7Rb.${section}.${slug(id)}.description`,
});

export const rbAlphaDecisions = [
  {
    id: 'key_snap_decision_rb_press_landmark',
    familyId: 'key_snap_family_rb_track',
    playMode: 'RUSH',
    successModifierPermille: 50,
    fumbleRiskModifierPermille: -10,
    bodyExposure: 2,
    yardModifier: 1,
  },
  {
    id: 'key_snap_decision_rb_cut_back',
    familyId: 'key_snap_family_rb_track',
    playMode: 'RUSH',
    successModifierPermille: -20,
    fumbleRiskModifierPermille: 20,
    bodyExposure: 2,
    yardModifier: 5,
  },
  {
    id: 'key_snap_decision_rb_bounce_edge',
    familyId: 'key_snap_family_rb_track',
    playMode: 'RUSH',
    successModifierPermille: -60,
    fumbleRiskModifierPermille: 25,
    bodyExposure: 1,
    yardModifier: 8,
  },
  {
    id: 'key_snap_decision_rb_finish_forward',
    familyId: 'key_snap_family_rb_contact',
    playMode: 'RUSH',
    successModifierPermille: 70,
    fumbleRiskModifierPermille: 25,
    bodyExposure: 4,
    yardModifier: 2,
  },
  {
    id: 'key_snap_decision_rb_make_miss',
    familyId: 'key_snap_family_rb_contact',
    playMode: 'RUSH',
    successModifierPermille: -20,
    fumbleRiskModifierPermille: 15,
    bodyExposure: 2,
    yardModifier: 6,
  },
  {
    id: 'key_snap_decision_rb_cover_ball',
    familyId: 'key_snap_family_rb_contact',
    playMode: 'RUSH',
    successModifierPermille: 10,
    fumbleRiskModifierPermille: -90,
    bodyExposure: 1,
    yardModifier: -2,
  },
  {
    id: 'key_snap_decision_rb_scan_inside',
    familyId: 'key_snap_family_rb_protection',
    playMode: 'PROTECTION',
    successModifierPermille: 55,
    fumbleRiskModifierPermille: 0,
    bodyExposure: 2,
    yardModifier: 0,
  },
  {
    id: 'key_snap_decision_rb_square_anchor',
    familyId: 'key_snap_family_rb_protection',
    playMode: 'PROTECTION',
    successModifierPermille: 90,
    fumbleRiskModifierPermille: 0,
    bodyExposure: 4,
    yardModifier: 0,
  },
  {
    id: 'key_snap_decision_rb_release_late',
    familyId: 'key_snap_family_rb_protection',
    playMode: 'RECEPTION',
    successModifierPermille: -40,
    fumbleRiskModifierPermille: 10,
    bodyExposure: 1,
    yardModifier: 4,
  },
  {
    id: 'key_snap_decision_rb_settle_checkdown',
    familyId: 'key_snap_family_rb_receiving',
    playMode: 'RECEPTION',
    successModifierPermille: 110,
    fumbleRiskModifierPermille: -45,
    bodyExposure: 1,
    yardModifier: -2,
  },
  {
    id: 'key_snap_decision_rb_turn_upfield',
    familyId: 'key_snap_family_rb_receiving',
    playMode: 'RECEPTION',
    successModifierPermille: 5,
    fumbleRiskModifierPermille: 25,
    bodyExposure: 3,
    yardModifier: 6,
  },
  {
    id: 'key_snap_decision_rb_secure_boundary',
    familyId: 'key_snap_family_rb_receiving',
    playMode: 'RECEPTION',
    successModifierPermille: 45,
    fumbleRiskModifierPermille: -70,
    bodyExposure: 1,
    yardModifier: 1,
  },
] as const satisfies readonly RbDecisionDefinition[];

const fits = (
  ids: readonly [
    (typeof RB_ALPHA_DECISION_IDS)[number],
    (typeof RB_ALPHA_DECISION_IDS)[number],
    (typeof RB_ALPHA_DECISION_IDS)[number],
  ],
  values: readonly [number, number, number],
) =>
  ids.map((decisionId, index) => ({ decisionId, fit: values[index]! })) as [
    { decisionId: (typeof RB_ALPHA_DECISION_IDS)[number]; fit: number },
    { decisionId: (typeof RB_ALPHA_DECISION_IDS)[number]; fit: number },
    { decisionId: (typeof RB_ALPHA_DECISION_IDS)[number]; fit: number },
  ];
const clues = (id: string) => {
  const prefix = `game_clue_rb_${id.slice('key_snap_pattern_rb_'.length)}`;
  return [`${prefix}_one`, `${prefix}_two`, `${prefix}_three`] as [
    `game_clue_rb_${string}`,
    `game_clue_rb_${string}`,
    `game_clue_rb_${string}`,
  ];
};

export const rbAlphaPatterns = [
  {
    id: 'key_snap_pattern_rb_flowing_front',
    familyId: 'key_snap_family_rb_track',
    clueIds: clues('key_snap_pattern_rb_flowing_front'),
    decisionFits: fits(
      [
        'key_snap_decision_rb_press_landmark',
        'key_snap_decision_rb_cut_back',
        'key_snap_decision_rb_bounce_edge',
      ],
      [94, 65, 40],
    ),
    attributeWeights: [
      { attributeId: 'attribute_rb_vision', weightPermille: 650 },
      { attributeId: 'attribute_agility', weightPermille: 350 },
    ],
    contactPermille: 480,
    baseSuccessPermille: 610,
    baseFumbleRiskPermille: 80,
    explosiveChancePermille: 120,
    touchdownChancePermille: 100,
    baseYards: 5,
  },
  {
    id: 'key_snap_pattern_rb_backside_fold',
    familyId: 'key_snap_family_rb_track',
    clueIds: clues('key_snap_pattern_rb_backside_fold'),
    decisionFits: fits(
      [
        'key_snap_decision_rb_press_landmark',
        'key_snap_decision_rb_cut_back',
        'key_snap_decision_rb_bounce_edge',
      ],
      [45, 96, 70],
    ),
    attributeWeights: [
      { attributeId: 'attribute_rb_vision', weightPermille: 600 },
      { attributeId: 'attribute_burst', weightPermille: 400 },
    ],
    contactPermille: 410,
    baseSuccessPermille: 560,
    baseFumbleRiskPermille: 90,
    explosiveChancePermille: 180,
    touchdownChancePermille: 110,
    baseYards: 5,
  },
  {
    id: 'key_snap_pattern_rb_square_contact',
    familyId: 'key_snap_family_rb_contact',
    clueIds: clues('key_snap_pattern_rb_square_contact'),
    decisionFits: fits(
      [
        'key_snap_decision_rb_finish_forward',
        'key_snap_decision_rb_make_miss',
        'key_snap_decision_rb_cover_ball',
      ],
      [95, 55, 72],
    ),
    attributeWeights: [
      { attributeId: 'attribute_rb_contact_balance', weightPermille: 650 },
      { attributeId: 'attribute_strength', weightPermille: 350 },
    ],
    contactPermille: 780,
    baseSuccessPermille: 570,
    baseFumbleRiskPermille: 140,
    explosiveChancePermille: 70,
    touchdownChancePermille: 160,
    baseYards: 4,
  },
  {
    id: 'key_snap_pattern_rb_open_field_angle',
    familyId: 'key_snap_family_rb_contact',
    clueIds: clues('key_snap_pattern_rb_open_field_angle'),
    decisionFits: fits(
      [
        'key_snap_decision_rb_finish_forward',
        'key_snap_decision_rb_make_miss',
        'key_snap_decision_rb_cover_ball',
      ],
      [58, 96, 50],
    ),
    attributeWeights: [
      { attributeId: 'attribute_rb_elusiveness', weightPermille: 650 },
      { attributeId: 'attribute_agility', weightPermille: 350 },
    ],
    contactPermille: 560,
    baseSuccessPermille: 600,
    baseFumbleRiskPermille: 110,
    explosiveChancePermille: 220,
    touchdownChancePermille: 130,
    baseYards: 6,
  },
  {
    id: 'key_snap_pattern_rb_inside_pressure',
    familyId: 'key_snap_family_rb_protection',
    clueIds: clues('key_snap_pattern_rb_inside_pressure'),
    decisionFits: fits(
      [
        'key_snap_decision_rb_scan_inside',
        'key_snap_decision_rb_square_anchor',
        'key_snap_decision_rb_release_late',
      ],
      [94, 76, 35],
    ),
    attributeWeights: [
      { attributeId: 'attribute_rb_pass_protection', weightPermille: 650 },
      { attributeId: 'attribute_football_iq', weightPermille: 350 },
    ],
    contactPermille: 700,
    baseSuccessPermille: 600,
    baseFumbleRiskPermille: 0,
    explosiveChancePermille: 0,
    touchdownChancePermille: 0,
    baseYards: 0,
  },
  {
    id: 'key_snap_pattern_rb_delayed_edge',
    familyId: 'key_snap_family_rb_protection',
    clueIds: clues('key_snap_pattern_rb_delayed_edge'),
    decisionFits: fits(
      [
        'key_snap_decision_rb_scan_inside',
        'key_snap_decision_rb_square_anchor',
        'key_snap_decision_rb_release_late',
      ],
      [55, 94, 62],
    ),
    attributeWeights: [
      { attributeId: 'attribute_rb_pass_protection', weightPermille: 600 },
      { attributeId: 'attribute_composure', weightPermille: 400 },
    ],
    contactPermille: 620,
    baseSuccessPermille: 560,
    baseFumbleRiskPermille: 40,
    explosiveChancePermille: 90,
    touchdownChancePermille: 50,
    baseYards: 3,
  },
  {
    id: 'key_snap_pattern_rb_flat_space',
    familyId: 'key_snap_family_rb_receiving',
    clueIds: clues('key_snap_pattern_rb_flat_space'),
    decisionFits: fits(
      [
        'key_snap_decision_rb_settle_checkdown',
        'key_snap_decision_rb_turn_upfield',
        'key_snap_decision_rb_secure_boundary',
      ],
      [70, 96, 62],
    ),
    attributeWeights: [
      { attributeId: 'attribute_rb_receiving', weightPermille: 600 },
      { attributeId: 'attribute_burst', weightPermille: 400 },
    ],
    contactPermille: 390,
    baseSuccessPermille: 650,
    baseFumbleRiskPermille: 75,
    explosiveChancePermille: 210,
    touchdownChancePermille: 120,
    baseYards: 5,
  },
  {
    id: 'key_snap_pattern_rb_option_window',
    familyId: 'key_snap_family_rb_receiving',
    clueIds: clues('key_snap_pattern_rb_option_window'),
    decisionFits: fits(
      [
        'key_snap_decision_rb_settle_checkdown',
        'key_snap_decision_rb_turn_upfield',
        'key_snap_decision_rb_secure_boundary',
      ],
      [92, 55, 82],
    ),
    attributeWeights: [
      { attributeId: 'attribute_rb_receiving', weightPermille: 550 },
      { attributeId: 'attribute_rb_ball_security', weightPermille: 450 },
    ],
    contactPermille: 510,
    baseSuccessPermille: 620,
    baseFumbleRiskPermille: 100,
    explosiveChancePermille: 130,
    touchdownChancePermille: 90,
    baseYards: 4,
  },
] as const satisfies readonly RbPatternDefinition[];

const skillRows = [
  {
    id: 'skill_rb_flow_map_c',
    familyId: 'skill_family_development',
    gradeId: 'skill_grade_c',
    effects: [{ type: 'rb_information_clue_bonus', value: 1 }],
  },
  {
    id: 'skill_rb_patient_press_b',
    familyId: 'skill_family_game_day',
    gradeId: 'skill_grade_b',
    effects: [
      {
        type: 'rb_decision_score_flat',
        value: 5,
        decisionId: 'key_snap_decision_rb_press_landmark',
      },
    ],
  },
  {
    id: 'skill_rb_one_cut_a',
    familyId: 'skill_family_game_day',
    gradeId: 'skill_grade_a',
    effects: [
      {
        type: 'rb_explosive_chance_delta_permille',
        value: 90,
        decisionId: 'key_snap_decision_rb_cut_back',
      },
      {
        type: 'rb_fumble_risk_delta_permille',
        value: 20,
        decisionId: 'key_snap_decision_rb_cut_back',
      },
    ],
  },
  {
    id: 'skill_rb_contact_economy_b',
    familyId: 'skill_family_body',
    gradeId: 'skill_grade_b',
    effects: [{ type: 'rb_body_cost_reduction', value: 3 }],
  },
  {
    id: 'skill_rb_two_hands_c',
    familyId: 'skill_family_mindset',
    gradeId: 'skill_grade_c',
    effects: [
      {
        type: 'rb_fumble_risk_delta_permille',
        value: -55,
        decisionId: 'key_snap_decision_rb_cover_ball',
      },
    ],
  },
  {
    id: 'skill_rb_pocket_guard_a',
    familyId: 'skill_family_role_coach',
    gradeId: 'skill_grade_a',
    effects: [
      { type: 'rb_protection_score_flat', value: 8, familyId: 'key_snap_family_rb_protection' },
      { type: 'rb_grade_bonus', value: 3 },
    ],
  },
  {
    id: 'skill_rb_fresh_legs_c',
    familyId: 'skill_family_body',
    gradeId: 'skill_grade_c',
    effects: [{ type: 'rb_body_cost_reduction', value: 2 }],
  },
  {
    id: 'skill_rb_next_play_b',
    familyId: 'skill_family_mindset',
    gradeId: 'skill_grade_b',
    effects: [{ type: 'rb_confidence_loss_reduction', value: 2 }],
  },
  {
    id: 'skill_rb_rep_harvest_a',
    familyId: 'skill_family_development',
    gradeId: 'skill_grade_a',
    effects: [{ type: 'rb_xp_multiplier_permille', value: 250 }],
  },
  {
    id: 'skill_rb_complete_back_a',
    familyId: 'skill_family_role_coach',
    gradeId: 'skill_grade_a',
    effects: [
      { type: 'rb_grade_bonus', value: 5 },
      { type: 'rb_decision_score_flat', value: 3 },
    ],
  },
  {
    id: 'skill_rb_room_table_b',
    familyId: 'skill_family_life',
    gradeId: 'skill_grade_b',
    effects: [{ type: 'rb_event_choice_unlock', value: 1 }],
  },
  {
    id: 'skill_rb_shared_credit_s',
    familyId: 'skill_family_life',
    gradeId: 'skill_grade_s',
    effects: [{ type: 'rb_event_positive_multiplier_permille', value: 250 }],
  },
] as const;
export const rbAlphaSkills = skillRows.map((item) => ({
  ...item,
  positionId: 'position_rb' as const,
})) satisfies readonly RbSkillDefinition[];

const neutral = { clueBonus: 0, decisionScoreFlat: 0, contactReductionPermille: 0 };
const effect = (
  bodyDelta: number,
  preparationDelta: number,
  confidenceDelta: number,
  coachTrustDelta: number,
  gpaMilliDelta = 0,
  brandDelta = 0,
  gameModifiers = neutral,
) => ({
  bodyDelta,
  preparationDelta,
  confidenceDelta,
  coachTrustDelta,
  gpaMilliDelta,
  brandDelta,
  gameModifiers,
});
const eventRows = [
  [
    'ball_security_challenge',
    {},
    effect(-4, 6, 2, 3, 0, 0, { clueBonus: 0, decisionScoreFlat: 3, contactReductionPermille: 40 }),
    effect(4, -2, 0, -1),
  ],
  ['protection_walkthrough', {}, effect(-5, 7, 1, 5), effect(3, -3, 0, -2), effect(-2, 5, 3, 5)],
  ['receiver_routes', {}, effect(-5, 6, 3, 2), effect(4, -2, -1, 0), effect(-2, 4, 4, 3)],
  ['goal_line_reps', { minCoachTrust: 40 }, effect(-7, 5, 5, 5), effect(5, -3, -1, -2)],
  ['sore_hips', { maxBody: 60 }, effect(10, -4, 0, -1), effect(-6, 5, 2, 3)],
  [
    'room_rotation',
    { maxCoachTrust: 65 },
    effect(-3, 4, 2, 4),
    effect(2, -2, -1, -2),
    effect(-2, 5, 4, 5),
  ],
  ['tutor_session', {}, effect(2, -4, 0, -1, 350), effect(-3, 5, 1, 2, -150)],
  ['campus_feature', {}, effect(-2, -3, 4, 0, 0, 8), effect(3, 2, -1, 0, 0, -3)],
  [
    'film_cutup',
    { minPreparation: 30 },
    effect(-2, 7, 1, 3, 0, 0, { clueBonus: 1, decisionScoreFlat: 0, contactReductionPermille: 0 }),
    effect(3, -3, 0, -1),
  ],
  ['equipment_adjustment', {}, effect(-1, 3, 2, 1), effect(4, -1, -1, 0)],
  [
    'captain_assignment',
    { minConfidence: 35 },
    effect(-4, 4, 5, 4),
    effect(2, -1, -2, -1),
    effect(-3, 5, 6, 5),
  ],
  ['community_clinic', {}, effect(-4, -3, 5, 1, -100, 9), effect(4, 2, -1, 0, 100, -3)],
] as const;
export const rbAlphaEvents = eventRows.map(([name, requirements, first, second, third]) => {
  const id = `event_rb_${name}` as (typeof RB_ALPHA_EVENT_IDS)[number];
  const choices = [
    { id: `event_choice_rb_${name}_commit` as `event_choice_rb_${string}`, effects: first },
    { id: `event_choice_rb_${name}_protect` as `event_choice_rb_${string}`, effects: second },
    ...(third
      ? [
          {
            id: `event_choice_rb_${name}_connect` as `event_choice_rb_${string}`,
            requiresUnlockLevel: 1,
            effects: third,
          },
        ]
      : []),
  ].map((choice) => ({ ...choice, ...localized(choice.id, 'choices') }));
  return { id, ...localized(id, 'events'), weight: 100, cooldownWeeks: 3, requirements, choices };
}) satisfies readonly RbEventDefinition[];

export const rbAlphaContent = {
  id: 'rb_alpha_vertical',
  nameKey: 'm7Rb.vertical.name',
  descriptionKey: 'm7Rb.vertical.description',
  familyIds: RB_ALPHA_FAMILY_IDS,
  decisions: rbAlphaDecisions.map((item) => ({ ...item, ...localized(item.id, 'decisions') })),
  clues: RB_ALPHA_CLUE_IDS.map((id) => ({ id, ...localized(id, 'clues') })),
  patterns: rbAlphaPatterns.map((item) => ({ ...item, ...localized(item.id, 'patterns') })),
  skills: rbAlphaSkills.map((item) => ({ ...item, ...localized(item.id, 'skills') })),
  events: rbAlphaEvents,
  participationFeedback: [
    {
      id: 'game_participation_rb_assignment_review',
      ...localized('game_participation_rb_assignment_review', 'feedback'),
    },
    {
      id: 'game_participation_rb_offense',
      ...localized('game_participation_rb_offense', 'feedback'),
    },
  ],
} as const satisfies RbAlphaContent;
