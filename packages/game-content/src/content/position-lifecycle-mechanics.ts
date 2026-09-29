import type { PositionLifecycleMechanicsV1 } from '@project-saturday/game-core';

const effect = (
  coach: number,
  room: number,
  competitor: number,
): readonly [number, number, number] => Object.freeze([coach, room, competitor]);

/**
 * M7 staged lifecycle tuning. The historical WR command path does not consume
 * this catalog until the public four-position adapter is activated.
 */
export const positionLifecycleMechanics = Object.freeze({
  model: 'position_lifecycle_mechanics_v1',
  injuryExposurePermille: Object.freeze({
    position_wr: 42,
    position_qb: 34,
    position_rb: 62,
    position_cb: 48,
    position_lb: 56,
    position_edge: 58,
  }),
  relationshipActionEffects: Object.freeze({
    position_wr: Object.freeze({
      action_route_drills: effect(1, 0, 2),
      action_release_drills: effect(1, 2, 1),
      action_hands_catch_work: effect(0, 3, 0),
      action_film_study: effect(3, 0, 0),
      action_extra_practice: effect(2, 1, -1),
    }),
    position_qb: Object.freeze({
      action_film_study: effect(3, 0, 0),
      action_qb_delivery_work: effect(3, 1, 0),
      action_qb_coverage_recognition: effect(2, 1, 1),
      action_qb_pressure_movement: effect(1, 2, 2),
    }),
    position_rb: Object.freeze({
      action_film_study: effect(3, 0, 0),
      action_rb_vision_tracks: effect(2, 1, 1),
      action_rb_security_contact: effect(1, 3, -1),
      action_rb_third_down_work: effect(3, 2, 1),
    }),
    position_cb: Object.freeze({
      action_film_study: effect(3, 0, 0),
      action_cb_mirror_press: effect(2, 1, 2),
      action_cb_zone_recognition: effect(2, 2, 1),
      action_cb_tackle_recovery: effect(1, 3, -1),
    }),
    position_lb: Object.freeze({
      action_film_study: effect(3, 0, 0),
      action_lb_run_fits: effect(2, 2, 1),
      action_lb_coverage_drops: effect(3, 1, 1),
      action_lb_pressure_package: effect(1, 2, 2),
    }),
    position_edge: Object.freeze({
      action_film_study: effect(3, 0, 0),
      action_edge_get_off: effect(2, 1, 2),
      action_edge_hand_fighting: effect(1, 3, 1),
      action_edge_edge_discipline: effect(3, 1, 0),
    }),
  }),
  stayTrustRetentionPermille: 850,
  transferTrustRetentionPermille: 250,
  transferRelationshipBaseline: 50,
  shortlistSize: 3,
} as const satisfies PositionLifecycleMechanicsV1);
