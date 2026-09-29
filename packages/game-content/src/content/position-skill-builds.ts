import type {
  SkillEffect,
  SkillMechanicsDefinition,
  PositionFocusId,
  WeeklyActionTagId,
} from '@project-saturday/game-core';
import { qbAlphaSkills } from './qb-alpha.js';
import { rbAlphaSkills } from './rb-alpha.js';
import { cbAlphaSkills } from './cb-alpha.js';
import { positionAlphaContent } from './positions.js';
import { positionCommonFocusDefinitions } from './position-focus.js';

const always = { type: 'always' } as const;
const training = { type: 'action_tags', actionTagIds: ['action_skill_training'] } as const;
const effectsByBuild = {
  film: [
    {
      type: 'action_preparation_delta_flat',
      scope: { type: 'action_ids', actionIds: ['action_film_study'] },
      condition: always,
      delta: 3,
    },
  ],
  repetition: [
    {
      type: 'action_xp_multiplier',
      scope: training,
      condition: { type: 'action_occurrence_at_least', minimumCount: 2 },
      multiplierPermille: 1250,
    },
    {
      type: 'action_body_cost_multiplier',
      scope: training,
      condition: { type: 'action_occurrence_at_least', minimumCount: 2 },
      multiplierPermille: 1100,
    },
  ],
  body: [
    {
      type: 'action_body_cost_multiplier',
      scope: training,
      condition: always,
      multiplierPermille: 900,
    },
    { type: 'passive_body_recovery_flat', delta: 2 },
  ],
  mindset: [
    {
      type: 'action_confidence_delta_flat',
      scope: { type: 'action_ids', actionIds: ['action_recovery'] },
      condition: { type: 'body_at_most', body: 60 },
      delta: 2,
    },
  ],
  role: [
    {
      type: 'action_practice_impact_flat',
      scope: training,
      condition: { type: 'plan_distinct_action_count_at_least', minimumCount: 2 },
      delta: 2,
    },
  ],
  campus: [
    {
      type: 'action_gpa_delta_milli',
      scope: { type: 'action_ids', actionIds: ['action_study_hall'] },
      condition: always,
      deltaMilli: 100,
    },
    { type: 'life_hook', hookId: 'life_hook_relationship_gain_multiplier', valueMilli: 1200 },
  ],
  nil: [{ type: 'life_hook', hookId: 'life_hook_nil_reward_multiplier', valueMilli: 1100 }],
} as const satisfies Readonly<Record<string, readonly SkillEffect[]>>;

const assignments = [
  ['skill_qb_chalkboard_echo_c', 'film'],
  ['skill_qb_rep_compounder_a', 'repetition'],
  ['skill_qb_weekly_maintenance_c', 'body'],
  ['skill_qb_short_memory_b', 'mindset'],
  ['skill_qb_command_presence_a', 'role'],
  ['skill_qb_open_office_b', 'campus'],
  ['skill_qb_shared_spotlight_s', 'nil'],
  ['skill_rb_flow_map_c', 'film'],
  ['skill_rb_rep_harvest_a', 'repetition'],
  ['skill_rb_fresh_legs_c', 'body'],
  ['skill_rb_next_play_b', 'mindset'],
  ['skill_rb_complete_back_a', 'role'],
  ['skill_rb_room_table_b', 'campus'],
  ['skill_rb_shared_credit_s', 'nil'],
  ['skill_cb_split_key_c', 'film'],
  ['skill_cb_rep_archive_a', 'repetition'],
  ['skill_cb_weekly_reset_c', 'body'],
  ['skill_cb_next_series_b', 'mindset'],
  ['skill_cb_quiet_island_a', 'role'],
  ['skill_cb_secondary_table_b', 'campus'],
  ['skill_cb_shared_stage_s', 'nil'],
] as const;
const cards = [...qbAlphaSkills, ...rbAlphaSkills, ...cbAlphaSkills];

/** Current-only supplements; the original card's Game Day/event mechanics remain literal. */
export const positionSkillBuilds = assignments.map(([skillId, buildId]) => {
  const card = cards.find(({ id }) => id === skillId)!;
  return {
    skillId,
    buildId,
    positionId: card.positionId,
    descriptionKey: `m7Build.${buildId}.description` as const,
    mechanics: {
      id: skillId,
      familyId: card.familyId,
      gradeId: card.gradeId,
      baseOfferWeight: 100,
      eligibility: {
        positionIds: [card.positionId],
        archetypeIds: [],
        requiredPlayerTagIds: [],
        excludedPlayerTagIds: [],
        minWeekIndex: 0,
      },
      behaviorWeightRules: [],
      effects: effectsByBuild[buildId],
    } satisfies SkillMechanicsDefinition,
  };
});

export const positionSkillActionTags = Object.fromEntries([
  ...positionAlphaContent.trainingActions.map((action) => [
    action.id,
    ['action_skill_training', 'action_skill_position_training'],
  ]),
  ...positionCommonFocusDefinitions.map((action) => [
    action.id,
    [...action.tagIds, ...(action.attributeXp.length === 0 ? [] : ['action_skill_training'])],
  ]),
]) as Readonly<Record<PositionFocusId, readonly WeeklyActionTagId[]>>;
