import type {
  EventChoiceId,
  EventEffect,
  EventId,
  EventMechanicsDefinition,
  EventSelectionTuning,
  EventStatePredicate,
  PlayerTagId,
} from '@project-saturday/game-core';

import type { EventCategoryId, EventContent } from '../schema/events.js';

interface AuthoredChoiceDraft {
  readonly id: EventChoiceId;
  readonly keyStem: string;
  readonly effects: readonly EventEffect[];
}

interface AuthoredEventDraft {
  readonly id: EventId;
  readonly keyStem: string;
  readonly categoryIds: readonly EventCategoryId[];
  readonly allTagIds?: readonly PlayerTagId[];
  readonly anyTagIds?: readonly PlayerTagId[];
  readonly excludedTagIds?: readonly PlayerTagId[];
  readonly statePredicates?: readonly EventStatePredicate[];
  readonly cooldownWeeks: number;
  readonly weight: number;
  readonly choices: readonly [AuthoredChoiceDraft, AuthoredChoiceDraft];
}

function state(
  stateId:
    | 'event_state_body'
    | 'event_state_preparation'
    | 'event_state_confidence'
    | 'event_state_coach_trust'
    | 'event_state_brand',
  delta: number,
): EventEffect {
  return { type: 'event_integer_state_delta', stateId, delta };
}

function gpa(deltaMilli: number): EventEffect {
  return { type: 'event_gpa_delta_milli', deltaMilli };
}

function breakthrough(points: number): EventEffect {
  return { type: 'event_breakthrough_gauge_delta', points };
}

function authoredEvent(draft: AuthoredEventDraft) {
  return {
    categoryIds: draft.categoryIds,
    choices: draft.choices.map((choice) => ({
      descriptionKey: `events.${draft.keyStem}.choices.${choice.keyStem}.description`,
      effects: choice.effects,
      id: choice.id,
      kind: 'event_choice' as const,
      nameKey: `events.${draft.keyStem}.choices.${choice.keyStem}.name`,
    })),
    cooldownWeeks: draft.cooldownWeeks,
    descriptionKey: `events.${draft.keyStem}.description`,
    id: draft.id,
    kind: 'event' as const,
    nameKey: `events.${draft.keyStem}.name`,
    requirements: {
      allTagIds: draft.allTagIds ?? [],
      anyTagIds: draft.anyTagIds ?? [],
      excludedTagIds: draft.excludedTagIds ?? [],
      statePredicates: draft.statePredicates ?? [],
    },
    weight: draft.weight,
  };
}

const footballDepthEvents = [
  authoredEvent({
    id: 'event_route_landmark_recalibration',
    keyStem: 'routeLandmark',
    categoryIds: ['event_category_wr', 'event_category_development'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 3,
    weight: 90,
    choices: [
      {
        id: 'event_choice_route_landmark_walkthrough',
        keyStem: 'walkthrough',
        effects: [state('event_state_preparation', 7), state('event_state_body', -4)],
      },
      {
        id: 'event_choice_route_landmark_questions',
        keyStem: 'questions',
        effects: [state('event_state_coach_trust', 4), breakthrough(6)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_release_counter_session',
    keyStem: 'releaseCounter',
    categoryIds: ['event_category_wr', 'event_category_development'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 3,
    weight: 85,
    choices: [
      {
        id: 'event_choice_release_counter_live_reps',
        keyStem: 'liveReps',
        effects: [state('event_state_preparation', 6), state('event_state_body', -6)],
      },
      {
        id: 'event_choice_release_counter_notebook',
        keyStem: 'notebook',
        effects: [breakthrough(7), state('event_state_confidence', 2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_wet_ball_machine',
    keyStem: 'wetBall',
    categoryIds: ['event_category_wr', 'event_category_game_week'],
    allTagIds: ['tag_season_regular'],
    cooldownWeeks: 4,
    weight: 75,
    choices: [
      {
        id: 'event_choice_wet_ball_high_volume',
        keyStem: 'highVolume',
        effects: [state('event_state_confidence', 6), state('event_state_body', -5)],
      },
      {
        id: 'event_choice_wet_ball_technique',
        keyStem: 'technique',
        effects: [state('event_state_preparation', 5), breakthrough(5)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_blocking_leverage_review',
    keyStem: 'blockingLeverage',
    categoryIds: ['event_category_wr', 'event_category_team'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 3,
    weight: 70,
    choices: [
      {
        id: 'event_choice_blocking_leverage_board',
        keyStem: 'board',
        effects: [state('event_state_preparation', 6), state('event_state_coach_trust', 2)],
      },
      {
        id: 'event_choice_blocking_leverage_sled',
        keyStem: 'sled',
        effects: [state('event_state_coach_trust', 5), state('event_state_body', -6)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_substitution_signal_race',
    keyStem: 'substitutionSignal',
    categoryIds: ['event_category_wr', 'event_category_depth'],
    allTagIds: ['tag_season_regular'],
    cooldownWeeks: 4,
    weight: 80,
    choices: [
      {
        id: 'event_choice_substitution_signal_quiz',
        keyStem: 'quiz',
        effects: [state('event_state_preparation', 7), breakthrough(4)],
      },
      {
        id: 'event_choice_substitution_signal_shadow',
        keyStem: 'shadow',
        effects: [state('event_state_coach_trust', 4), state('event_state_body', -3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_scout_boundary_assignment',
    keyStem: 'scoutBoundary',
    categoryIds: ['event_category_depth', 'event_category_opportunity'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_depth_rank', operatorId: 'event_predicate_gte', value: 5 },
    ],
    cooldownWeeks: 3,
    weight: 95,
    choices: [
      {
        id: 'event_choice_scout_boundary_attack',
        keyStem: 'attack',
        effects: [state('event_state_coach_trust', 6), state('event_state_body', -5)],
      },
      {
        id: 'event_choice_scout_boundary_detail',
        keyStem: 'detail',
        effects: [state('event_state_preparation', 6), breakthrough(5)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_second_unit_huddle_call',
    keyStem: 'secondUnitHuddle',
    categoryIds: ['event_category_depth', 'event_category_team'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_depth_rank', operatorId: 'event_predicate_gte', value: 3 },
    ],
    cooldownWeeks: 4,
    weight: 80,
    choices: [
      {
        id: 'event_choice_second_unit_huddle_lead',
        keyStem: 'lead',
        effects: [state('event_state_confidence', 5), state('event_state_coach_trust', 4)],
      },
      {
        id: 'event_choice_second_unit_huddle_listen',
        keyStem: 'listen',
        effects: [state('event_state_preparation', 6), breakthrough(4)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_starter_detail_standard',
    keyStem: 'starterStandard',
    categoryIds: ['event_category_depth', 'event_category_mindset'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_depth_rank', operatorId: 'event_predicate_lte', value: 2 },
    ],
    cooldownWeeks: 4,
    weight: 85,
    choices: [
      {
        id: 'event_choice_starter_standard_demand',
        keyStem: 'demand',
        effects: [state('event_state_coach_trust', 5), state('event_state_confidence', -2)],
      },
      {
        id: 'event_choice_starter_standard_encourage',
        keyStem: 'encourage',
        effects: [state('event_state_confidence', 5), state('event_state_body', -3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_red_zone_package_audition',
    keyStem: 'redZoneAudition',
    categoryIds: ['event_category_depth', 'event_category_game_week'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_depth_rank', operatorId: 'event_predicate_lte', value: 4 },
    ],
    cooldownWeeks: 5,
    weight: 70,
    choices: [
      {
        id: 'event_choice_red_zone_audition_volume',
        keyStem: 'volume',
        effects: [state('event_state_coach_trust', 6), state('event_state_body', -7)],
      },
      {
        id: 'event_choice_red_zone_audition_precision',
        keyStem: 'precision',
        effects: [state('event_state_preparation', 7), state('event_state_confidence', 2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_special_teams_lane_work',
    keyStem: 'laneWork',
    categoryIds: ['event_category_depth', 'event_category_opportunity'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_depth_rank', operatorId: 'event_predicate_gte', value: 5 },
    ],
    cooldownWeeks: 3,
    weight: 90,
    choices: [
      {
        id: 'event_choice_lane_work_commit',
        keyStem: 'commit',
        effects: [state('event_state_coach_trust', 7), state('event_state_body', -6)],
      },
      {
        id: 'event_choice_lane_work_receiver_focus',
        keyStem: 'receiverFocus',
        effects: [state('event_state_preparation', 5), state('event_state_coach_trust', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_contested_catch_vest',
    keyStem: 'catchVest',
    categoryIds: ['event_category_wr', 'event_category_body'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 75,
    choices: [
      {
        id: 'event_choice_catch_vest_contact',
        keyStem: 'contact',
        effects: [state('event_state_confidence', 6), state('event_state_body', -7)],
      },
      {
        id: 'event_choice_catch_vest_tracking',
        keyStem: 'tracking',
        effects: [state('event_state_preparation', 5), breakthrough(6)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_sideline_signal_quiz',
    keyStem: 'sidelineQuiz',
    categoryIds: ['event_category_wr', 'event_category_game_week'],
    allTagIds: ['tag_season_regular'],
    cooldownWeeks: 3,
    weight: 85,
    choices: [
      {
        id: 'event_choice_sideline_quiz_flashcards',
        keyStem: 'flashcards',
        effects: [state('event_state_preparation', 7), state('event_state_body', -2)],
      },
      {
        id: 'event_choice_sideline_quiz_teach',
        keyStem: 'teach',
        effects: [state('event_state_coach_trust', 4), breakthrough(6)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_late_rotation_rep',
    keyStem: 'lateRotationRep',
    categoryIds: ['event_category_depth', 'event_category_opportunity'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_depth_rank', operatorId: 'event_predicate_gte', value: 4 },
    ],
    cooldownWeeks: 4,
    weight: 80,
    choices: [
      {
        id: 'event_choice_late_rotation_rep_take',
        keyStem: 'take',
        effects: [state('event_state_coach_trust', 6), state('event_state_body', -5)],
      },
      {
        id: 'event_choice_late_rotation_rep_yield',
        keyStem: 'yield',
        effects: [state('event_state_body', 5), state('event_state_confidence', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_motion_alignment_correction',
    keyStem: 'motionAlignment',
    categoryIds: ['event_category_wr', 'event_category_development'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 3,
    weight: 90,
    choices: [
      {
        id: 'event_choice_motion_alignment_rehearse',
        keyStem: 'rehearse',
        effects: [state('event_state_preparation', 7), state('event_state_body', -4)],
      },
      {
        id: 'event_choice_motion_alignment_map',
        keyStem: 'map',
        effects: [breakthrough(7), state('event_state_coach_trust', 2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_scramble_drill_timing',
    keyStem: 'scrambleTiming',
    categoryIds: ['event_category_wr', 'event_category_team'],
    allTagIds: ['tag_season_regular'],
    cooldownWeeks: 4,
    weight: 75,
    choices: [
      {
        id: 'event_choice_scramble_timing_quarterback',
        keyStem: 'quarterback',
        effects: [state('event_state_preparation', 6), state('event_state_confidence', 3)],
      },
      {
        id: 'event_choice_scramble_timing_receiver',
        keyStem: 'receiver',
        effects: [state('event_state_coach_trust', 4), breakthrough(5)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_treatment_table_queue',
    keyStem: 'treatmentQueue',
    categoryIds: ['event_category_wr', 'event_category_body'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_body', operatorId: 'event_predicate_lte', value: 45 },
    ],
    cooldownWeeks: 2,
    weight: 110,
    choices: [
      {
        id: 'event_choice_treatment_queue_wait',
        keyStem: 'wait',
        effects: [state('event_state_body', 10), state('event_state_preparation', -3)],
      },
      {
        id: 'event_choice_treatment_queue_mobility',
        keyStem: 'mobility',
        effects: [state('event_state_body', 6), state('event_state_confidence', 2)],
      },
    ],
  }),
];

const identityEvents = [
  authoredEvent({
    id: 'event_competitive_challenge_board',
    keyStem: 'challengeBoard',
    categoryIds: ['event_category_personality', 'event_category_mindset'],
    allTagIds: ['tag_event_seeks_challenge'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 90,
    choices: [
      {
        id: 'event_choice_challenge_board_post',
        keyStem: 'post',
        effects: [state('event_state_confidence', 6), state('event_state_body', -4)],
      },
      {
        id: 'event_choice_challenge_board_private',
        keyStem: 'private',
        effects: [state('event_state_preparation', 5), breakthrough(5)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_low_profile_campus_feature',
    keyStem: 'lowProfileFeature',
    categoryIds: ['event_category_personality', 'event_category_media'],
    allTagIds: ['tag_event_prefers_low_profile'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 85,
    choices: [
      {
        id: 'event_choice_low_profile_feature_written',
        keyStem: 'written',
        effects: [state('event_state_brand', 5), state('event_state_confidence', 2)],
      },
      {
        id: 'event_choice_low_profile_feature_decline',
        keyStem: 'decline',
        effects: [state('event_state_preparation', 5), state('event_state_brand', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_emotional_sideline_replay',
    keyStem: 'sidelineReplay',
    categoryIds: ['event_category_personality', 'event_category_mindset'],
    allTagIds: ['tag_event_emotional_flashpoint', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 90,
    choices: [
      {
        id: 'event_choice_sideline_replay_channel',
        keyStem: 'channel',
        effects: [state('event_state_confidence', 6), state('event_state_body', -3)],
      },
      {
        id: 'event_choice_sideline_replay_debrief',
        keyStem: 'debrief',
        effects: [state('event_state_preparation', 5), state('event_state_coach_trust', 3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_routine_schedule_swap',
    keyStem: 'routineSwap',
    categoryIds: ['event_category_personality', 'event_category_development'],
    allTagIds: ['tag_event_routine_focused'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 85,
    choices: [
      {
        id: 'event_choice_routine_swap_rebuild',
        keyStem: 'rebuild',
        effects: [state('event_state_preparation', 6), breakthrough(4)],
      },
      {
        id: 'event_choice_routine_swap_protect',
        keyStem: 'protect',
        effects: [state('event_state_body', 5), state('event_state_coach_trust', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_campus_connector_open_mic',
    keyStem: 'campusOpenMic',
    categoryIds: ['event_category_personality', 'event_category_media'],
    allTagIds: ['tag_event_campus_connector', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 80,
    choices: [
      {
        id: 'event_choice_campus_open_mic_join',
        keyStem: 'join',
        effects: [state('event_state_brand', 7), state('event_state_preparation', -4)],
      },
      {
        id: 'event_choice_campus_open_mic_host',
        keyStem: 'host',
        effects: [state('event_state_brand', 5), state('event_state_confidence', 4)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_self_directed_coach_window',
    keyStem: 'selfDirectedWindow',
    categoryIds: ['event_category_personality', 'event_category_relationship'],
    allTagIds: ['tag_event_self_directed'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 85,
    choices: [
      {
        id: 'event_choice_self_directed_window_agenda',
        keyStem: 'agenda',
        effects: [state('event_state_coach_trust', 4), state('event_state_preparation', 4)],
      },
      {
        id: 'event_choice_self_directed_window_solo',
        keyStem: 'solo',
        effects: [breakthrough(7), state('event_state_confidence', 2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_high_belief_prediction',
    keyStem: 'boldPrediction',
    categoryIds: ['event_category_personality', 'event_category_media'],
    allTagIds: ['tag_event_high_self_belief', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 75,
    choices: [
      {
        id: 'event_choice_bold_prediction_say_it',
        keyStem: 'sayIt',
        effects: [state('event_state_brand', 7), state('event_state_confidence', 5)],
      },
      {
        id: 'event_choice_bold_prediction_redirect',
        keyStem: 'redirect',
        effects: [state('event_state_coach_trust', 4), state('event_state_preparation', 3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_blue_chip_autograph_line',
    keyStem: 'autographLine',
    categoryIds: ['event_category_background', 'event_category_media'],
    allTagIds: ['tag_recruiting_high_expectations'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 6,
    weight: 75,
    choices: [
      {
        id: 'event_choice_autograph_line_stay',
        keyStem: 'stay',
        effects: [state('event_state_brand', 7), state('event_state_body', -4)],
      },
      {
        id: 'event_choice_autograph_line_limit',
        keyStem: 'limit',
        effects: [state('event_state_preparation', 4), state('event_state_brand', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_late_growth_old_trainer_note',
    keyStem: 'oldTrainerNote',
    categoryIds: ['event_category_background', 'event_category_mindset'],
    allTagIds: ['tag_recruiting_late_growth'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 6,
    weight: 80,
    choices: [
      {
        id: 'event_choice_old_trainer_note_reply',
        keyStem: 'reply',
        effects: [state('event_state_confidence', 5), breakthrough(5)],
      },
      {
        id: 'event_choice_old_trainer_note_work',
        keyStem: 'work',
        effects: [state('event_state_preparation', 6), state('event_state_body', -3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_hometown_ticket_requests',
    keyStem: 'ticketRequests',
    categoryIds: ['event_category_background', 'event_category_relationship'],
    allTagIds: ['tag_recruiting_hometown_attention', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 85,
    choices: [
      {
        id: 'event_choice_ticket_requests_coordinate',
        keyStem: 'coordinate',
        effects: [state('event_state_brand', 5), state('event_state_preparation', -3)],
      },
      {
        id: 'event_choice_ticket_requests_boundary',
        keyStem: 'boundary',
        effects: [state('event_state_preparation', 5), state('event_state_confidence', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_family_legacy_archive_box',
    keyStem: 'legacyArchive',
    categoryIds: ['event_category_background', 'event_category_identity'],
    allTagIds: ['tag_recruiting_family_legacy'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 7,
    weight: 70,
    choices: [
      {
        id: 'event_choice_legacy_archive_open',
        keyStem: 'open',
        effects: [state('event_state_confidence', 5), breakthrough(7)],
      },
      {
        id: 'event_choice_legacy_archive_wait',
        keyStem: 'wait',
        effects: [state('event_state_preparation', 5), state('event_state_confidence', -1)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_prove_them_wrong_ranking_clip',
    keyStem: 'rankingClip',
    categoryIds: ['event_category_background', 'event_category_mindset'],
    allTagIds: ['tag_recruiting_prove_them_wrong', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 90,
    choices: [
      {
        id: 'event_choice_ranking_clip_pin',
        keyStem: 'pin',
        effects: [state('event_state_confidence', 6), state('event_state_body', -3)],
      },
      {
        id: 'event_choice_ranking_clip_discard',
        keyStem: 'discard',
        effects: [state('event_state_preparation', 5), breakthrough(5)],
      },
    ],
  }),
];

const programContextEvents = [
  authoredEvent({
    id: 'event_academic_standard_study_contract',
    keyStem: 'studyContract',
    categoryIds: ['event_category_program', 'event_category_academics'],
    allTagIds: ['tag_program_trait_academic_standard'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 80,
    choices: [
      {
        id: 'event_choice_study_contract_tutoring',
        keyStem: 'tutoring',
        effects: [gpa(220), state('event_state_preparation', -3)],
      },
      {
        id: 'event_choice_study_contract_calendar',
        keyStem: 'calendar',
        effects: [gpa(120), state('event_state_preparation', 3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_creative_scheme_formation_lab',
    keyStem: 'formationLab',
    categoryIds: ['event_category_program', 'event_category_wr'],
    allTagIds: ['tag_program_trait_creative_scheme'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 90,
    choices: [
      {
        id: 'event_choice_formation_lab_field',
        keyStem: 'field',
        effects: [state('event_state_preparation', 7), state('event_state_body', -4)],
      },
      {
        id: 'event_choice_formation_lab_board',
        keyStem: 'board',
        effects: [breakthrough(7), state('event_state_coach_trust', 2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_development_lab_micro_session',
    keyStem: 'microSession',
    categoryIds: ['event_category_program', 'event_category_development'],
    allTagIds: ['tag_program_trait_development_lab'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 95,
    choices: [
      {
        id: 'event_choice_micro_session_detail',
        keyStem: 'detail',
        effects: [breakthrough(8), state('event_state_body', -3)],
      },
      {
        id: 'event_choice_micro_session_feedback',
        keyStem: 'feedback',
        effects: [state('event_state_coach_trust', 4), state('event_state_preparation', 4)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_donor_market_dinner_invitation',
    keyStem: 'donorDinner',
    categoryIds: ['event_category_program', 'event_category_media'],
    allTagIds: ['tag_program_trait_donor_market', 'tag_season_regular'],
    cooldownWeeks: 6,
    weight: 75,
    choices: [
      {
        id: 'event_choice_donor_dinner_attend',
        keyStem: 'attend',
        effects: [state('event_state_brand', 8), state('event_state_preparation', -4)],
      },
      {
        id: 'event_choice_donor_dinner_decline',
        keyStem: 'decline',
        effects: [state('event_state_preparation', 5), state('event_state_brand', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_national_expectations_review',
    keyStem: 'expectationsReview',
    categoryIds: ['event_category_program', 'event_category_mindset'],
    allTagIds: ['tag_program_trait_national_expectations', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 90,
    choices: [
      {
        id: 'event_choice_expectations_review_measure',
        keyStem: 'measure',
        effects: [state('event_state_preparation', 6), state('event_state_confidence', -2)],
      },
      {
        id: 'event_choice_expectations_review_embrace',
        keyStem: 'embrace',
        effects: [state('event_state_confidence', 7), state('event_state_body', -3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_open_competition_rep_draft',
    keyStem: 'repDraft',
    categoryIds: ['event_category_program', 'event_category_depth'],
    allTagIds: ['tag_program_trait_open_competition'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 100,
    choices: [
      {
        id: 'event_choice_rep_draft_early',
        keyStem: 'early',
        effects: [state('event_state_coach_trust', 6), state('event_state_body', -5)],
      },
      {
        id: 'event_choice_rep_draft_matchup',
        keyStem: 'matchup',
        effects: [state('event_state_preparation', 6), state('event_state_confidence', 2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_patient_path_development_meeting',
    keyStem: 'patientMeeting',
    categoryIds: ['event_category_program', 'event_category_development'],
    allTagIds: ['tag_program_trait_patient_path'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 85,
    choices: [
      {
        id: 'event_choice_patient_meeting_milestones',
        keyStem: 'milestones',
        effects: [breakthrough(8), state('event_state_confidence', 2)],
      },
      {
        id: 'event_choice_patient_meeting_push',
        keyStem: 'push',
        effects: [state('event_state_coach_trust', 4), state('event_state_body', -4)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_physical_culture_finishers',
    keyStem: 'physicalFinishers',
    categoryIds: ['event_category_program', 'event_category_body'],
    allTagIds: ['tag_program_trait_physical_culture'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 90,
    choices: [
      {
        id: 'event_choice_physical_finishers_full',
        keyStem: 'full',
        effects: [state('event_state_coach_trust', 6), state('event_state_body', -8)],
      },
      {
        id: 'event_choice_physical_finishers_technical',
        keyStem: 'technical',
        effects: [state('event_state_preparation', 5), state('event_state_body', -3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_pro_workshop_cutup_session',
    keyStem: 'cutupSession',
    categoryIds: ['event_category_program', 'event_category_wr'],
    allTagIds: ['tag_program_trait_pro_workshop', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 85,
    choices: [
      {
        id: 'event_choice_cutup_session_self',
        keyStem: 'self',
        effects: [state('event_state_preparation', 7), state('event_state_confidence', -1)],
      },
      {
        id: 'event_choice_cutup_session_model',
        keyStem: 'model',
        effects: [breakthrough(7), state('event_state_confidence', 3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_quiet_focus_library_slot',
    keyStem: 'librarySlot',
    categoryIds: ['event_category_program', 'event_category_academics'],
    allTagIds: ['tag_program_trait_quiet_focus'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 80,
    choices: [
      {
        id: 'event_choice_library_slot_coursework',
        keyStem: 'coursework',
        effects: [gpa(180), state('event_state_confidence', 2)],
      },
      {
        id: 'event_choice_library_slot_playbook',
        keyStem: 'playbook',
        effects: [state('event_state_preparation', 7), gpa(-80)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_rebuild_energy_young_council',
    keyStem: 'youngCouncil',
    categoryIds: ['event_category_program', 'event_category_team'],
    allTagIds: ['tag_program_trait_rebuild_energy'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 90,
    choices: [
      {
        id: 'event_choice_young_council_speak',
        keyStem: 'speak',
        effects: [state('event_state_confidence', 5), state('event_state_coach_trust', 4)],
      },
      {
        id: 'event_choice_young_council_plan',
        keyStem: 'plan',
        effects: [state('event_state_preparation', 5), breakthrough(5)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_regional_roots_youth_clinic',
    keyStem: 'youthClinic',
    categoryIds: ['event_category_program', 'event_category_relationship'],
    allTagIds: ['tag_program_trait_regional_roots'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 6,
    weight: 75,
    choices: [
      {
        id: 'event_choice_youth_clinic_lead',
        keyStem: 'lead',
        effects: [state('event_state_brand', 6), state('event_state_body', -3)],
      },
      {
        id: 'event_choice_youth_clinic_station',
        keyStem: 'station',
        effects: [state('event_state_confidence', 4), breakthrough(4)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_spotlight_market_camera_walk',
    keyStem: 'cameraWalk',
    categoryIds: ['event_category_program', 'event_category_media'],
    allTagIds: ['tag_program_trait_spotlight_market', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 80,
    choices: [
      {
        id: 'event_choice_camera_walk_take',
        keyStem: 'take',
        effects: [state('event_state_brand', 7), state('event_state_preparation', -3)],
      },
      {
        id: 'event_choice_camera_walk_pass',
        keyStem: 'pass',
        effects: [state('event_state_preparation', 5), state('event_state_brand', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_stable_staff_shared_language',
    keyStem: 'sharedLanguage',
    categoryIds: ['event_category_program', 'event_category_development'],
    allTagIds: ['tag_program_trait_stable_staff'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 85,
    choices: [
      {
        id: 'event_choice_shared_language_archive',
        keyStem: 'archive',
        effects: [state('event_state_preparation', 6), breakthrough(5)],
      },
      {
        id: 'event_choice_shared_language_coach',
        keyStem: 'coach',
        effects: [state('event_state_coach_trust', 5), state('event_state_body', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_tempo_identity_two_minute_script',
    keyStem: 'twoMinuteScript',
    categoryIds: ['event_category_program', 'event_category_game_week'],
    allTagIds: ['tag_program_trait_tempo_identity', 'tag_season_regular'],
    cooldownWeeks: 4,
    weight: 95,
    choices: [
      {
        id: 'event_choice_two_minute_script_run',
        keyStem: 'run',
        effects: [state('event_state_preparation', 7), state('event_state_body', -5)],
      },
      {
        id: 'event_choice_two_minute_script_call',
        keyStem: 'call',
        effects: [state('event_state_coach_trust', 5), breakthrough(5)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_veteran_loyalty_receiver_tradition',
    keyStem: 'receiverTradition',
    categoryIds: ['event_category_program', 'event_category_team'],
    allTagIds: ['tag_program_trait_veteran_loyalty'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 6,
    weight: 80,
    choices: [
      {
        id: 'event_choice_receiver_tradition_join',
        keyStem: 'join',
        effects: [state('event_state_coach_trust', 4), state('event_state_confidence', 4)],
      },
      {
        id: 'event_choice_receiver_tradition_train',
        keyStem: 'train',
        effects: [state('event_state_preparation', 5), state('event_state_body', -3)],
      },
    ],
  }),
];

const lifeContextEvents = [
  authoredEvent({
    id: 'event_campus_bridge_roundtable',
    keyStem: 'campusBridgeRoundtable',
    categoryIds: ['event_category_identity', 'event_category_academics'],
    allTagIds: ['tag_skill_event_option_access'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 6,
    weight: 80,
    choices: [
      {
        id: 'event_choice_campus_bridge_lead',
        keyStem: 'lead',
        effects: [state('event_state_brand', 5), state('event_state_confidence', 3)],
      },
      {
        id: 'event_choice_campus_bridge_resource',
        keyStem: 'resource',
        effects: [gpa(120), state('event_state_preparation', 4)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_home_arrival_walk',
    keyStem: 'homeArrival',
    categoryIds: ['event_category_game_week', 'event_category_mindset'],
    allTagIds: ['tag_season_regular', 'tag_game_home'],
    cooldownWeeks: 4,
    weight: 75,
    choices: [
      {
        id: 'event_choice_home_arrival_crowd',
        keyStem: 'crowd',
        effects: [state('event_state_confidence', 6), state('event_state_preparation', -2)],
      },
      {
        id: 'event_choice_home_arrival_quiet',
        keyStem: 'quiet',
        effects: [state('event_state_preparation', 5), state('event_state_brand', -1)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_away_trip_roommate',
    keyStem: 'awayRoommate',
    categoryIds: ['event_category_game_week', 'event_category_relationship'],
    allTagIds: ['tag_season_regular', 'tag_game_away'],
    cooldownWeeks: 4,
    weight: 80,
    choices: [
      {
        id: 'event_choice_away_roommate_review',
        keyStem: 'review',
        effects: [state('event_state_preparation', 6), state('event_state_body', -2)],
      },
      {
        id: 'event_choice_away_roommate_unplug',
        keyStem: 'unplug',
        effects: [state('event_state_body', 5), state('event_state_confidence', 3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_course_project_deadline',
    keyStem: 'projectDeadline',
    categoryIds: ['event_category_academics', 'event_category_opportunity'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_gpa_milli', operatorId: 'event_predicate_lte', value: 2800 },
    ],
    cooldownWeeks: 3,
    weight: 110,
    choices: [
      {
        id: 'event_choice_project_deadline_finish',
        keyStem: 'finish',
        effects: [gpa(300), state('event_state_preparation', -5)],
      },
      {
        id: 'event_choice_project_deadline_extension',
        keyStem: 'extension',
        effects: [gpa(120), state('event_state_coach_trust', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_teammate_study_circle',
    keyStem: 'studyCircle',
    categoryIds: ['event_category_academics', 'event_category_relationship'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    cooldownWeeks: 5,
    weight: 70,
    choices: [
      {
        id: 'event_choice_study_circle_join',
        keyStem: 'join',
        effects: [gpa(160), state('event_state_confidence', 3)],
      },
      {
        id: 'event_choice_study_circle_notes',
        keyStem: 'notes',
        effects: [gpa(90), state('event_state_preparation', 3)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_recovery_van_opening',
    keyStem: 'recoveryVan',
    categoryIds: ['event_category_body', 'event_category_opportunity'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_body', operatorId: 'event_predicate_lte', value: 35 },
    ],
    cooldownWeeks: 2,
    weight: 120,
    choices: [
      {
        id: 'event_choice_recovery_van_full',
        keyStem: 'full',
        effects: [state('event_state_body', 12), state('event_state_preparation', -4)],
      },
      {
        id: 'event_choice_recovery_van_short',
        keyStem: 'short',
        effects: [state('event_state_body', 7), state('event_state_coach_trust', 2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_high_confidence_extra_call',
    keyStem: 'extraCall',
    categoryIds: ['event_category_mindset', 'event_category_wr'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_confidence', operatorId: 'event_predicate_gte', value: 75 },
    ],
    cooldownWeeks: 4,
    weight: 75,
    choices: [
      {
        id: 'event_choice_extra_call_take',
        keyStem: 'take',
        effects: [state('event_state_coach_trust', 5), state('event_state_body', -5)],
      },
      {
        id: 'event_choice_extra_call_bank',
        keyStem: 'bank',
        effects: [state('event_state_preparation', 4), state('event_state_confidence', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_low_confidence_reset_walk',
    keyStem: 'resetWalk',
    categoryIds: ['event_category_mindset', 'event_category_body'],
    anyTagIds: ['tag_season_camp', 'tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_confidence', operatorId: 'event_predicate_lte', value: 35 },
    ],
    cooldownWeeks: 2,
    weight: 115,
    choices: [
      {
        id: 'event_choice_reset_walk_teammate',
        keyStem: 'teammate',
        effects: [state('event_state_confidence', 9), state('event_state_body', -2)],
      },
      {
        id: 'event_choice_reset_walk_solo',
        keyStem: 'solo',
        effects: [state('event_state_confidence', 6), breakthrough(5)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_local_design_request',
    keyStem: 'designRequest',
    categoryIds: ['event_category_media', 'event_category_identity'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_brand', operatorId: 'event_predicate_gte', value: 35 },
    ],
    cooldownWeeks: 6,
    weight: 65,
    choices: [
      {
        id: 'event_choice_design_request_collaborate',
        keyStem: 'collaborate',
        effects: [state('event_state_brand', 7), state('event_state_preparation', -4)],
      },
      {
        id: 'event_choice_design_request_postpone',
        keyStem: 'postpone',
        effects: [state('event_state_preparation', 5), state('event_state_brand', -2)],
      },
    ],
  }),
  authoredEvent({
    id: 'event_low_preparation_install_choice',
    keyStem: 'installChoice',
    categoryIds: ['event_category_game_week', 'event_category_development'],
    allTagIds: ['tag_season_regular'],
    statePredicates: [
      { fieldId: 'event_state_preparation', operatorId: 'event_predicate_lte', value: 40 },
    ],
    cooldownWeeks: 2,
    weight: 120,
    choices: [
      {
        id: 'event_choice_install_choice_late',
        keyStem: 'late',
        effects: [state('event_state_preparation', 10), state('event_state_body', -6)],
      },
      {
        id: 'event_choice_install_choice_trim',
        keyStem: 'trim',
        effects: [state('event_state_preparation', 6), state('event_state_coach_trust', -2)],
      },
    ],
  }),
];

export const eventContent = {
  events: [
    {
      categoryIds: ['event_category_development', 'event_category_team', 'event_category_wr'],
      choices: [
        {
          descriptionKey: 'events.campInstall.choices.extraReps.description',
          effects: [
            { delta: 8, stateId: 'event_state_preparation', type: 'event_integer_state_delta' },
            { delta: 4, stateId: 'event_state_coach_trust', type: 'event_integer_state_delta' },
            { delta: -7, stateId: 'event_state_body', type: 'event_integer_state_delta' },
          ],
          id: 'event_choice_camp_install_extra_reps',
          kind: 'event_choice',
          nameKey: 'events.campInstall.choices.extraReps.name',
        },
        {
          descriptionKey: 'events.campInstall.choices.reset.description',
          effects: [
            { delta: 9, stateId: 'event_state_body', type: 'event_integer_state_delta' },
            { delta: 3, stateId: 'event_state_confidence', type: 'event_integer_state_delta' },
            { delta: -2, stateId: 'event_state_preparation', type: 'event_integer_state_delta' },
          ],
          id: 'event_choice_camp_install_reset',
          kind: 'event_choice',
          nameKey: 'events.campInstall.choices.reset.name',
        },
      ],
      cooldownWeeks: 2,
      descriptionKey: 'events.campInstall.description',
      id: 'event_camp_install_extra_period',
      kind: 'event',
      nameKey: 'events.campInstall.name',
      requirements: {
        allTagIds: ['tag_season_camp'],
        anyTagIds: [],
        excludedTagIds: [],
        statePredicates: [],
      },
      weight: 100,
    },
    {
      categoryIds: ['event_category_media', 'event_category_game_week', 'event_category_program'],
      choices: [
        {
          descriptionKey: 'events.spotlight.choices.accept.description',
          effects: [
            { delta: 8, stateId: 'event_state_brand', type: 'event_integer_state_delta' },
            { delta: 4, stateId: 'event_state_confidence', type: 'event_integer_state_delta' },
            { delta: -5, stateId: 'event_state_preparation', type: 'event_integer_state_delta' },
          ],
          id: 'event_choice_spotlight_accept',
          kind: 'event_choice',
          nameKey: 'events.spotlight.choices.accept.name',
        },
        {
          descriptionKey: 'events.spotlight.choices.decline.description',
          effects: [
            { delta: 7, stateId: 'event_state_preparation', type: 'event_integer_state_delta' },
            { delta: 3, stateId: 'event_state_coach_trust', type: 'event_integer_state_delta' },
            { delta: -2, stateId: 'event_state_brand', type: 'event_integer_state_delta' },
          ],
          id: 'event_choice_spotlight_decline',
          kind: 'event_choice',
          nameKey: 'events.spotlight.choices.decline.name',
        },
      ],
      cooldownWeeks: 4,
      descriptionKey: 'events.spotlight.description',
      id: 'event_spotlight_interview_window',
      kind: 'event',
      nameKey: 'events.spotlight.name',
      requirements: {
        allTagIds: ['tag_season_regular', 'tag_game_spotlight'],
        anyTagIds: [],
        excludedTagIds: [],
        statePredicates: [],
      },
      weight: 100,
    },
    {
      categoryIds: [
        'event_category_relationship',
        'event_category_team',
        'event_category_personality',
      ],
      choices: [
        {
          descriptionKey: 'events.teamVoice.choices.roomMessage.description',
          effects: [
            { delta: 5, stateId: 'event_state_confidence', type: 'event_integer_state_delta' },
            { delta: 5, stateId: 'event_state_coach_trust', type: 'event_integer_state_delta' },
            { delta: -3, stateId: 'event_state_body', type: 'event_integer_state_delta' },
          ],
          id: 'event_choice_team_voice_room_message',
          kind: 'event_choice',
          nameKey: 'events.teamVoice.choices.roomMessage.name',
        },
        {
          descriptionKey: 'events.teamVoice.choices.checkIns.description',
          effects: [
            { delta: 3, stateId: 'event_state_coach_trust', type: 'event_integer_state_delta' },
            { points: 8, type: 'event_breakthrough_gauge_delta' },
            { delta: 2, stateId: 'event_state_preparation', type: 'event_integer_state_delta' },
          ],
          id: 'event_choice_team_voice_check_ins',
          kind: 'event_choice',
          nameKey: 'events.teamVoice.choices.checkIns.name',
        },
      ],
      cooldownWeeks: 3,
      descriptionKey: 'events.teamVoice.description',
      id: 'event_team_voice_receiver_room',
      kind: 'event',
      nameKey: 'events.teamVoice.name',
      requirements: {
        allTagIds: ['tag_season_regular', 'tag_event_team_voice'],
        anyTagIds: [],
        excludedTagIds: [],
        statePredicates: [],
      },
      weight: 80,
    },
    ...footballDepthEvents,
    ...identityEvents,
    ...programContextEvents,
    ...lifeContextEvents,
  ],
  id: 'events_wr_vertical_slice_v1',
  model: 'event_v1',
  selectionTuning: { eventChancePermille: 650 },
} as const satisfies EventContent;

export const eventMechanicsDefinitions: readonly EventMechanicsDefinition[] =
  eventContent.events.map((event) => ({
    id: event.id,
    categoryIds: event.categoryIds,
    weight: event.weight,
    cooldownWeeks: event.cooldownWeeks,
    requirements: event.requirements,
    choices: event.choices.map((choice) => ({ id: choice.id, effects: choice.effects })),
  }));

export const eventSelectionTuning: EventSelectionTuning = eventContent.selectionTuning;
