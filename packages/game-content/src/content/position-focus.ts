import {
  COMMON_POSITION_FOCUS_IDS,
  type PositionFocusInjuryPolicies,
  type CommonPositionFocusId,
} from '@project-saturday/game-core';
import { weeklyActionDefinitions } from './weekly-actions.js';

/** Authored workload classification, never inferred from a translated drill label. */
export const positionFocusInjuryPolicies = Object.freeze({
  action_weight_room: 'HIGH_LOAD',
  action_speed_work: 'HIGH_LOAD',
  action_film_study: 'SAFE',
  action_recovery: 'SAFE',
  action_study_hall: 'SAFE',
  action_qb_delivery_work: 'TECHNICAL',
  action_qb_coverage_recognition: 'TECHNICAL',
  action_qb_pressure_movement: 'HIGH_LOAD',
  action_rb_vision_tracks: 'TECHNICAL',
  action_rb_security_contact: 'HIGH_LOAD',
  action_rb_third_down_work: 'TECHNICAL',
  action_cb_mirror_press: 'HIGH_LOAD',
  action_cb_zone_recognition: 'TECHNICAL',
  action_cb_tackle_recovery: 'HIGH_LOAD',
  action_wr_route_craft: 'TECHNICAL',
  action_wr_separation: 'HIGH_LOAD',
  action_wr_catch_point: 'TECHNICAL',
} as const satisfies PositionFocusInjuryPolicies);

/** Reuse shipped common mechanics and paired presentation IDs without a second tuning table. */
export const positionCommonFocusDefinitions = weeklyActionDefinitions.filter(
  (
    definition,
  ): definition is (typeof weeklyActionDefinitions)[number] & {
    readonly id: CommonPositionFocusId;
  } => COMMON_POSITION_FOCUS_IDS.includes(definition.id as CommonPositionFocusId),
);
