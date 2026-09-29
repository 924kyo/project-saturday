import type {
  CbDecisionDefinition,
  CbEventDefinition,
  CbPatternDefinition,
  CbSkillDefinition,
} from '@project-saturday/game-core';
import {
  CB_ALPHA_CLUE_IDS,
  CB_ALPHA_FAMILY_IDS,
  type CB_ALPHA_DECISION_IDS,
  type CB_ALPHA_EVENT_IDS,
  type CbAlphaContent,
} from '../schema/cb-alpha.js';
const slug = (id: string) =>
  id
    .replace(
      /^(key_snap_(?:family|decision|pattern)_cb_|game_clue_cb_|skill_cb_|event_choice_cb_|event_cb_|game_participation_cb_)/,
      '',
    )
    .replaceAll('_', '.');
const loc = (id: string, section: string) => ({
  nameKey: `m7Cb.${section}.${slug(id)}.name`,
  descriptionKey: `m7Cb.${section}.${slug(id)}.description`,
});
export const cbAlphaDecisions = [
  {
    id: 'key_snap_decision_cb_press_jam',
    familyId: 'key_snap_family_cb_leverage',
    mode: 'COVERAGE',
    disruptionModifierPermille: 90,
    completionRiskModifierPermille: -20,
    takeawayModifierPermille: 0,
    bodyExposure: 3,
  },
  {
    id: 'key_snap_decision_cb_shade_inside',
    familyId: 'key_snap_family_cb_leverage',
    mode: 'COVERAGE',
    disruptionModifierPermille: 45,
    completionRiskModifierPermille: -35,
    takeawayModifierPermille: 10,
    bodyExposure: 1,
  },
  {
    id: 'key_snap_decision_cb_bail_depth',
    familyId: 'key_snap_family_cb_leverage',
    mode: 'COVERAGE',
    disruptionModifierPermille: -20,
    completionRiskModifierPermille: -80,
    takeawayModifierPermille: -10,
    bodyExposure: 0,
  },
  {
    id: 'key_snap_decision_cb_mirror_release',
    familyId: 'key_snap_family_cb_coverage',
    mode: 'COVERAGE',
    disruptionModifierPermille: 70,
    completionRiskModifierPermille: -25,
    takeawayModifierPermille: 0,
    bodyExposure: 1,
  },
  {
    id: 'key_snap_decision_cb_undercut_break',
    familyId: 'key_snap_family_cb_coverage',
    mode: 'BALL',
    disruptionModifierPermille: 20,
    completionRiskModifierPermille: 55,
    takeawayModifierPermille: 90,
    bodyExposure: 1,
  },
  {
    id: 'key_snap_decision_cb_handoff_zone',
    familyId: 'key_snap_family_cb_coverage',
    mode: 'COVERAGE',
    disruptionModifierPermille: 55,
    completionRiskModifierPermille: -45,
    takeawayModifierPermille: 15,
    bodyExposure: 0,
  },
  {
    id: 'key_snap_decision_cb_play_ball',
    familyId: 'key_snap_family_cb_ball',
    mode: 'BALL',
    disruptionModifierPermille: 30,
    completionRiskModifierPermille: 65,
    takeawayModifierPermille: 120,
    bodyExposure: 2,
  },
  {
    id: 'key_snap_decision_cb_play_hands',
    familyId: 'key_snap_family_cb_ball',
    mode: 'BALL',
    disruptionModifierPermille: 95,
    completionRiskModifierPermille: -15,
    takeawayModifierPermille: 10,
    bodyExposure: 2,
  },
  {
    id: 'key_snap_decision_cb_close_catch',
    familyId: 'key_snap_family_cb_ball',
    mode: 'TACKLE',
    disruptionModifierPermille: 35,
    completionRiskModifierPermille: -40,
    takeawayModifierPermille: -20,
    bodyExposure: 2,
  },
  {
    id: 'key_snap_decision_cb_breakdown_tackle',
    familyId: 'key_snap_family_cb_tackle',
    mode: 'TACKLE',
    disruptionModifierPermille: 100,
    completionRiskModifierPermille: 0,
    takeawayModifierPermille: -30,
    bodyExposure: 2,
  },
  {
    id: 'key_snap_decision_cb_drive_boundary',
    familyId: 'key_snap_family_cb_tackle',
    mode: 'TACKLE',
    disruptionModifierPermille: 65,
    completionRiskModifierPermille: -10,
    takeawayModifierPermille: 0,
    bodyExposure: 3,
  },
  {
    id: 'key_snap_decision_cb_attack_strip',
    familyId: 'key_snap_family_cb_tackle',
    mode: 'BALL',
    disruptionModifierPermille: -30,
    completionRiskModifierPermille: 55,
    takeawayModifierPermille: 110,
    bodyExposure: 3,
  },
] as const satisfies readonly CbDecisionDefinition[];
type Did = (typeof CB_ALPHA_DECISION_IDS)[number];
const fits = (ids: readonly [Did, Did, Did], values: readonly [number, number, number]) =>
  ids.map((decisionId, i) => ({ decisionId, fit: values[i]! })) as [
    { decisionId: Did; fit: number },
    { decisionId: Did; fit: number },
    { decisionId: Did; fit: number },
  ];
const clues = (id: string) => {
  const p = `game_clue_cb_${id.slice('key_snap_pattern_cb_'.length)}`;
  return [`${p}_one`, `${p}_two`, `${p}_three`] as [
    `game_clue_cb_${string}`,
    `game_clue_cb_${string}`,
    `game_clue_cb_${string}`,
  ];
};
export const cbAlphaPatterns = [
  {
    id: 'key_snap_pattern_cb_split_release',
    familyId: 'key_snap_family_cb_leverage',
    clueIds: clues('key_snap_pattern_cb_split_release'),
    decisionFits: fits(
      [
        'key_snap_decision_cb_press_jam',
        'key_snap_decision_cb_shade_inside',
        'key_snap_decision_cb_bail_depth',
      ],
      [92, 74, 45],
    ),
    attributeWeights: [
      { attributeId: 'attribute_cb_press', weightPermille: 600 },
      { attributeId: 'attribute_agility', weightPermille: 400 },
    ],
    targetPermille: 470,
    baseDisruptionPermille: 580,
    baseCompletionRiskPermille: 520,
    takeawayChancePermille: 70,
    touchdownRiskPermille: 90,
    baseYardsAllowed: 9,
  },
  {
    id: 'key_snap_pattern_cb_vertical_stem',
    familyId: 'key_snap_family_cb_leverage',
    clueIds: clues('key_snap_pattern_cb_vertical_stem'),
    decisionFits: fits(
      [
        'key_snap_decision_cb_press_jam',
        'key_snap_decision_cb_shade_inside',
        'key_snap_decision_cb_bail_depth',
      ],
      [50, 60, 95],
    ),
    attributeWeights: [
      { attributeId: 'attribute_cb_man_coverage', weightPermille: 550 },
      { attributeId: 'attribute_speed', weightPermille: 450 },
    ],
    targetPermille: 520,
    baseDisruptionPermille: 500,
    baseCompletionRiskPermille: 470,
    takeawayChancePermille: 90,
    touchdownRiskPermille: 170,
    baseYardsAllowed: 16,
  },
  {
    id: 'key_snap_pattern_cb_crossing_exchange',
    familyId: 'key_snap_family_cb_coverage',
    clueIds: clues('key_snap_pattern_cb_crossing_exchange'),
    decisionFits: fits(
      [
        'key_snap_decision_cb_mirror_release',
        'key_snap_decision_cb_undercut_break',
        'key_snap_decision_cb_handoff_zone',
      ],
      [62, 45, 96],
    ),
    attributeWeights: [
      { attributeId: 'attribute_cb_zone_coverage', weightPermille: 600 },
      { attributeId: 'attribute_football_iq', weightPermille: 400 },
    ],
    targetPermille: 560,
    baseDisruptionPermille: 550,
    baseCompletionRiskPermille: 540,
    takeawayChancePermille: 85,
    touchdownRiskPermille: 100,
    baseYardsAllowed: 10,
  },
  {
    id: 'key_snap_pattern_cb_zone_flood',
    familyId: 'key_snap_family_cb_coverage',
    clueIds: clues('key_snap_pattern_cb_zone_flood'),
    decisionFits: fits(
      [
        'key_snap_decision_cb_mirror_release',
        'key_snap_decision_cb_undercut_break',
        'key_snap_decision_cb_handoff_zone',
      ],
      [55, 90, 68],
    ),
    attributeWeights: [
      { attributeId: 'attribute_cb_zone_coverage', weightPermille: 550 },
      { attributeId: 'attribute_cb_recovery_technique', weightPermille: 450 },
    ],
    targetPermille: 610,
    baseDisruptionPermille: 520,
    baseCompletionRiskPermille: 560,
    takeawayChancePermille: 110,
    touchdownRiskPermille: 120,
    baseYardsAllowed: 12,
  },
  {
    id: 'key_snap_pattern_cb_high_point',
    familyId: 'key_snap_family_cb_ball',
    clueIds: clues('key_snap_pattern_cb_high_point'),
    decisionFits: fits(
      [
        'key_snap_decision_cb_play_ball',
        'key_snap_decision_cb_play_hands',
        'key_snap_decision_cb_close_catch',
      ],
      [94, 72, 48],
    ),
    attributeWeights: [
      { attributeId: 'attribute_cb_ball_skills', weightPermille: 650 },
      { attributeId: 'attribute_composure', weightPermille: 350 },
    ],
    targetPermille: 760,
    baseDisruptionPermille: 540,
    baseCompletionRiskPermille: 490,
    takeawayChancePermille: 180,
    touchdownRiskPermille: 200,
    baseYardsAllowed: 17,
  },
  {
    id: 'key_snap_pattern_cb_late_window',
    familyId: 'key_snap_family_cb_ball',
    clueIds: clues('key_snap_pattern_cb_late_window'),
    decisionFits: fits(
      [
        'key_snap_decision_cb_play_ball',
        'key_snap_decision_cb_play_hands',
        'key_snap_decision_cb_close_catch',
      ],
      [58, 95, 76],
    ),
    attributeWeights: [
      { attributeId: 'attribute_cb_ball_skills', weightPermille: 550 },
      { attributeId: 'attribute_cb_recovery_technique', weightPermille: 450 },
    ],
    targetPermille: 690,
    baseDisruptionPermille: 590,
    baseCompletionRiskPermille: 520,
    takeawayChancePermille: 130,
    touchdownRiskPermille: 110,
    baseYardsAllowed: 11,
  },
  {
    id: 'key_snap_pattern_cb_open_field_catch',
    familyId: 'key_snap_family_cb_tackle',
    clueIds: clues('key_snap_pattern_cb_open_field_catch'),
    decisionFits: fits(
      [
        'key_snap_decision_cb_breakdown_tackle',
        'key_snap_decision_cb_drive_boundary',
        'key_snap_decision_cb_attack_strip',
      ],
      [95, 70, 40],
    ),
    attributeWeights: [
      { attributeId: 'attribute_cb_tackling', weightPermille: 650 },
      { attributeId: 'attribute_agility', weightPermille: 350 },
    ],
    targetPermille: 820,
    baseDisruptionPermille: 620,
    baseCompletionRiskPermille: 690,
    takeawayChancePermille: 60,
    touchdownRiskPermille: 90,
    baseYardsAllowed: 8,
  },
  {
    id: 'key_snap_pattern_cb_boundary_finish',
    familyId: 'key_snap_family_cb_tackle',
    clueIds: clues('key_snap_pattern_cb_boundary_finish'),
    decisionFits: fits(
      [
        'key_snap_decision_cb_breakdown_tackle',
        'key_snap_decision_cb_drive_boundary',
        'key_snap_decision_cb_attack_strip',
      ],
      [70, 94, 58],
    ),
    attributeWeights: [
      { attributeId: 'attribute_cb_tackling', weightPermille: 550 },
      { attributeId: 'attribute_strength', weightPermille: 450 },
    ],
    targetPermille: 780,
    baseDisruptionPermille: 580,
    baseCompletionRiskPermille: 650,
    takeawayChancePermille: 90,
    touchdownRiskPermille: 70,
    baseYardsAllowed: 7,
  },
] as const satisfies readonly CbPatternDefinition[];
const skillRows = [
  {
    id: 'skill_cb_split_key_c',
    familyId: 'skill_family_development',
    gradeId: 'skill_grade_c',
    effects: [{ type: 'cb_information_clue_bonus', value: 1 }],
  },
  {
    id: 'skill_cb_patient_feet_b',
    familyId: 'skill_family_game_day',
    gradeId: 'skill_grade_b',
    effects: [
      { type: 'cb_decision_score_flat', value: 5, familyId: 'key_snap_family_cb_leverage' },
    ],
  },
  {
    id: 'skill_cb_route_thief_a',
    familyId: 'skill_family_game_day',
    gradeId: 'skill_grade_a',
    effects: [
      {
        type: 'cb_takeaway_chance_delta_permille',
        value: 90,
        decisionId: 'key_snap_decision_cb_undercut_break',
      },
      {
        type: 'cb_completion_risk_delta_permille',
        value: 35,
        decisionId: 'key_snap_decision_cb_undercut_break',
      },
    ],
  },
  {
    id: 'skill_cb_ball_window_b',
    familyId: 'skill_family_game_day',
    gradeId: 'skill_grade_b',
    effects: [
      { type: 'cb_takeaway_chance_delta_permille', value: 70, familyId: 'key_snap_family_cb_ball' },
    ],
  },
  {
    id: 'skill_cb_secure_finish_c',
    familyId: 'skill_family_role_coach',
    gradeId: 'skill_grade_c',
    effects: [{ type: 'cb_tackle_score_flat', value: 6, familyId: 'key_snap_family_cb_tackle' }],
  },
  {
    id: 'skill_cb_boundary_force_a',
    familyId: 'skill_family_role_coach',
    gradeId: 'skill_grade_a',
    effects: [
      { type: 'cb_tackle_score_flat', value: 8, decisionId: 'key_snap_decision_cb_drive_boundary' },
      { type: 'cb_grade_bonus', value: 3 },
    ],
  },
  {
    id: 'skill_cb_weekly_reset_c',
    familyId: 'skill_family_body',
    gradeId: 'skill_grade_c',
    effects: [{ type: 'cb_body_cost_reduction', value: 3 }],
  },
  {
    id: 'skill_cb_next_series_b',
    familyId: 'skill_family_mindset',
    gradeId: 'skill_grade_b',
    effects: [{ type: 'cb_confidence_loss_reduction', value: 2 }],
  },
  {
    id: 'skill_cb_rep_archive_a',
    familyId: 'skill_family_development',
    gradeId: 'skill_grade_a',
    effects: [{ type: 'cb_xp_multiplier_permille', value: 250 }],
  },
  {
    id: 'skill_cb_quiet_island_a',
    familyId: 'skill_family_mindset',
    gradeId: 'skill_grade_a',
    effects: [
      { type: 'cb_completion_risk_delta_permille', value: -45 },
      { type: 'cb_grade_bonus', value: 4 },
    ],
  },
  {
    id: 'skill_cb_secondary_table_b',
    familyId: 'skill_family_life',
    gradeId: 'skill_grade_b',
    effects: [{ type: 'cb_event_choice_unlock', value: 1 }],
  },
  {
    id: 'skill_cb_shared_stage_s',
    familyId: 'skill_family_life',
    gradeId: 'skill_grade_s',
    effects: [{ type: 'cb_event_positive_multiplier_permille', value: 250 }],
  },
] as const;
export const cbAlphaSkills = skillRows.map((x) => ({
  ...x,
  positionId: 'position_cb' as const,
})) satisfies readonly CbSkillDefinition[];
const neutral = { clueBonus: 0, decisionScoreFlat: 0, targetReductionPermille: 0 };
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
const rows = [
  [
    'release_study',
    {},
    effect(-3, 7, 1, 3, 0, 0, { clueBonus: 1, decisionScoreFlat: 0, targetReductionPermille: 0 }),
    effect(3, -3, 0, -1),
  ],
  ['receiver_challenge', {}, effect(-5, 5, 4, 3), effect(4, -2, -1, 0), effect(-2, 5, 5, 4)],
  ['tackle_circuit', {}, effect(-6, 5, 2, 4), effect(5, -3, 0, -2), effect(-2, 4, 4, 5)],
  ['ball_drill', {}, effect(-4, 6, 3, 2), effect(3, -2, -1, 0)],
  ['sore_shoulders', { maxBody: 60 }, effect(10, -4, 0, -1), effect(-6, 5, 1, 3)],
  [
    'secondary_rotation',
    { maxCoachTrust: 65 },
    effect(-3, 4, 2, 4),
    effect(2, -2, -1, -2),
    effect(-2, 5, 4, 5),
  ],
  ['tutor_overlap', {}, effect(2, -4, 0, -1, 350), effect(-3, 5, 1, 2, -150)],
  ['campus_interview', {}, effect(-2, -3, 4, 0, 0, 8), effect(3, 2, -1, 0, 0, -3)],
  [
    'opponent_cutup',
    { minPreparation: 30 },
    effect(-2, 7, 1, 3, 0, 0, { clueBonus: 1, decisionScoreFlat: 0, targetReductionPermille: 50 }),
    effect(3, -3, 0, -1),
  ],
  ['weather_practice', {}, effect(-5, 4, 2, 2), effect(5, -2, -1, -1)],
  [
    'captain_checkin',
    { minConfidence: 35 },
    effect(-4, 4, 5, 4),
    effect(2, -1, -2, -1),
    effect(-3, 5, 6, 5),
  ],
  ['youth_camp', {}, effect(-4, -3, 5, 1, -100, 9), effect(4, 2, -1, 0, 100, -3)],
] as const;
export const cbAlphaEvents = rows.map(([name, requirements, first, second, third]) => {
  const id = `event_cb_${name}` as (typeof CB_ALPHA_EVENT_IDS)[number];
  const choices = [
    { id: `event_choice_cb_${name}_commit` as `event_choice_cb_${string}`, effects: first },
    { id: `event_choice_cb_${name}_protect` as `event_choice_cb_${string}`, effects: second },
    ...(third
      ? [
          {
            id: `event_choice_cb_${name}_connect` as `event_choice_cb_${string}`,
            requiresUnlockLevel: 1,
            effects: third,
          },
        ]
      : []),
  ].map((c) => ({ ...c, ...loc(c.id, 'choices') }));
  return { id, ...loc(id, 'events'), weight: 100, cooldownWeeks: 3, requirements, choices };
}) satisfies readonly CbEventDefinition[];
export const cbAlphaContent = {
  id: 'cb_alpha_vertical',
  nameKey: 'm7Cb.vertical.name',
  descriptionKey: 'm7Cb.vertical.description',
  familyIds: CB_ALPHA_FAMILY_IDS,
  decisions: cbAlphaDecisions.map((x) => ({ ...x, ...loc(x.id, 'decisions') })),
  clues: CB_ALPHA_CLUE_IDS.map((id) => ({ id, ...loc(id, 'clues') })),
  patterns: cbAlphaPatterns.map((x) => ({ ...x, ...loc(x.id, 'patterns') })),
  skills: cbAlphaSkills.map((x) => ({ ...x, ...loc(x.id, 'skills') })),
  events: cbAlphaEvents,
  participationFeedback: [
    {
      id: 'game_participation_cb_scout_review',
      ...loc('game_participation_cb_scout_review', 'feedback'),
    },
    { id: 'game_participation_cb_coverage', ...loc('game_participation_cb_coverage', 'feedback') },
  ],
} as const satisfies CbAlphaContent;
