import { skillMechanicsDefinitions } from '@project-saturday/game-content/content';
import type {
  SkillEffectType,
  SkillId,
  SkillMechanicsDefinition,
} from '@project-saturday/game-core';

/**
 * Catalog shipped with the M3.5 and M4 deterministic report baselines.
 *
 * Later milestones may expand live skills without silently rewriting the
 * historical reports that gate regressions in those completed milestones.
 */
export const HISTORICAL_M3_5_SKILL_IDS = Object.freeze([
  'skill_route_notebook_c',
  'skill_first_step_lab_b',
  'skill_secure_hands_routine_b',
  'skill_full_route_circuit_a',
  'skill_recovery_window_c',
  'skill_late_set_engine_b',
  'skill_empty_tank_reps_a',
  'skill_compressed_recovery_s',
  'skill_one_more_rep_c',
  'skill_broad_horizon_b',
  'skill_edge_of_focus_a',
  'skill_reset_ritual_b',
  'skill_coverage_ledger_b',
  'skill_high_point_wager_a',
  'skill_open_field_dare_s',
  'skill_study_buffer_c',
  'skill_balanced_calendar_b',
  'skill_two_track_week_a',
  'skill_assignment_echo_c',
  'skill_clean_install_b',
  'skill_package_memory_b',
  'skill_quiet_checkin_c',
  'skill_trust_window_a',
  'skill_signal_reader_a',
  'skill_coaches_key_s',
  'skill_composure_anchor_b',
  'skill_campus_bridge_b',
] as const satisfies readonly SkillId[]);

export const HISTORICAL_M3_5_SKILL_EFFECT_TYPES = Object.freeze([
  'action_xp_multiplier',
  'action_body_cost_multiplier',
  'action_body_delta_flat',
  'action_gpa_delta_milli',
  'action_preparation_delta_flat',
  'action_confidence_delta_flat',
  'action_practice_impact_flat',
  'passive_body_recovery_flat',
  'game_hook',
  'life_hook',
] as const satisfies readonly SkillEffectType[]);

export const historicalM3_5SkillMechanicsDefinitions: readonly SkillMechanicsDefinition[] =
  Object.freeze(
    HISTORICAL_M3_5_SKILL_IDS.map((skillId) => {
      const definition = skillMechanicsDefinitions.find(({ id }) => id === skillId);
      if (definition === undefined) {
        throw new Error(`Historical M3.5 skill definition is missing: ${skillId}`);
      }
      return Object.freeze({
        ...definition,
        effects: Object.freeze(
          definition.effects.filter(
            (effect) =>
              effect.type !== 'injury_risk_multiplier' &&
              !(
                effect.type === 'life_hook' &&
                effect.hookId === 'life_hook_relationship_gain_multiplier'
              ),
          ),
        ),
      });
    }),
  );
