import { z } from 'zod';
import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import { SKILL_FAMILY_IDS, SKILL_GRADE_IDS } from './skills.js';

export const RB_ALPHA_FAMILY_IDS = [
  'key_snap_family_rb_track',
  'key_snap_family_rb_contact',
  'key_snap_family_rb_protection',
  'key_snap_family_rb_receiving',
] as const;
export const RB_ALPHA_DECISION_IDS = [
  'key_snap_decision_rb_press_landmark',
  'key_snap_decision_rb_cut_back',
  'key_snap_decision_rb_bounce_edge',
  'key_snap_decision_rb_finish_forward',
  'key_snap_decision_rb_make_miss',
  'key_snap_decision_rb_cover_ball',
  'key_snap_decision_rb_scan_inside',
  'key_snap_decision_rb_square_anchor',
  'key_snap_decision_rb_release_late',
  'key_snap_decision_rb_settle_checkdown',
  'key_snap_decision_rb_turn_upfield',
  'key_snap_decision_rb_secure_boundary',
] as const;
export const RB_ALPHA_PATTERN_IDS = [
  'key_snap_pattern_rb_flowing_front',
  'key_snap_pattern_rb_backside_fold',
  'key_snap_pattern_rb_square_contact',
  'key_snap_pattern_rb_open_field_angle',
  'key_snap_pattern_rb_inside_pressure',
  'key_snap_pattern_rb_delayed_edge',
  'key_snap_pattern_rb_flat_space',
  'key_snap_pattern_rb_option_window',
] as const;
export const RB_ALPHA_CLUE_IDS = RB_ALPHA_PATTERN_IDS.flatMap((id) =>
  ['one', 'two', 'three'].map(
    (suffix) => `game_clue_rb_${id.slice('key_snap_pattern_rb_'.length)}_${suffix}`,
  ),
) as readonly `game_clue_rb_${string}`[];
export const RB_ALPHA_SKILL_IDS = [
  'skill_rb_flow_map_c',
  'skill_rb_patient_press_b',
  'skill_rb_one_cut_a',
  'skill_rb_contact_economy_b',
  'skill_rb_two_hands_c',
  'skill_rb_pocket_guard_a',
  'skill_rb_fresh_legs_c',
  'skill_rb_next_play_b',
  'skill_rb_rep_harvest_a',
  'skill_rb_complete_back_a',
  'skill_rb_room_table_b',
  'skill_rb_shared_credit_s',
] as const;
export const RB_ALPHA_EVENT_IDS = [
  'event_rb_ball_security_challenge',
  'event_rb_protection_walkthrough',
  'event_rb_receiver_routes',
  'event_rb_goal_line_reps',
  'event_rb_sore_hips',
  'event_rb_room_rotation',
  'event_rb_tutor_session',
  'event_rb_campus_feature',
  'event_rb_film_cutup',
  'event_rb_equipment_adjustment',
  'event_rb_captain_assignment',
  'event_rb_community_clinic',
] as const;
export const RB_ALPHA_SKILL_EFFECT_TYPES = [
  'rb_information_clue_bonus',
  'rb_decision_score_flat',
  'rb_fumble_risk_delta_permille',
  'rb_explosive_chance_delta_permille',
  'rb_protection_score_flat',
  'rb_body_cost_reduction',
  'rb_confidence_loss_reduction',
  'rb_xp_multiplier_permille',
  'rb_grade_bonus',
  'rb_event_choice_unlock',
  'rb_event_positive_multiplier_permille',
] as const;

const localized = {
  nameKey: messageKeyFormatSchema,
  descriptionKey: messageKeyFormatSchema,
} as const;
const family = z.enum(RB_ALPHA_FAMILY_IDS);
const decision = z.enum(RB_ALPHA_DECISION_IDS);
const effects = z
  .object({
    bodyDelta: z.number().int().min(-30).max(30),
    preparationDelta: z.number().int().min(-30).max(30),
    confidenceDelta: z.number().int().min(-30).max(30),
    coachTrustDelta: z.number().int().min(-30).max(30),
    gpaMilliDelta: z.number().int().min(-1000).max(1000),
    brandDelta: z.number().int().min(-30).max(30),
    gameModifiers: z
      .object({
        clueBonus: z.number().int().min(0).max(2),
        decisionScoreFlat: z.number().int().min(-10).max(10),
        contactReductionPermille: z.number().int().min(0).max(250),
      })
      .strict(),
  })
  .strict();

export const rbAlphaContentSchema = z
  .object({
    id: z.literal('rb_alpha_vertical'),
    ...localized,
    familyIds: z.array(family).length(4),
    decisions: z
      .array(
        z
          .object({
            id: decision,
            familyId: family,
            ...localized,
            playMode: z.enum(['RUSH', 'RECEPTION', 'PROTECTION']),
            successModifierPermille: z.number().int().min(-300).max(300),
            fumbleRiskModifierPermille: z.number().int().min(-250).max(250),
            bodyExposure: z.number().int().min(0).max(8),
            yardModifier: z.number().int().min(-10).max(15),
          })
          .strict(),
      )
      .length(12),
    clues: z
      .array(
        z
          .object({
            id: stableContentIdSchema.refine((id) => id.startsWith('game_clue_rb_')),
            ...localized,
          })
          .strict(),
      )
      .length(24),
    patterns: z
      .array(
        z
          .object({
            id: z.enum(RB_ALPHA_PATTERN_IDS),
            familyId: family,
            ...localized,
            clueIds: z.tuple([z.string(), z.string(), z.string()]),
            decisionFits: z.tuple([
              z.object({ decisionId: decision, fit: z.number().int().min(0).max(100) }).strict(),
              z.object({ decisionId: decision, fit: z.number().int().min(0).max(100) }).strict(),
              z.object({ decisionId: decision, fit: z.number().int().min(0).max(100) }).strict(),
            ]),
            attributeWeights: z.tuple([
              z
                .object({
                  attributeId: stableContentIdSchema,
                  weightPermille: z.number().int().min(1).max(999),
                })
                .strict(),
              z
                .object({
                  attributeId: stableContentIdSchema,
                  weightPermille: z.number().int().min(1).max(999),
                })
                .strict(),
            ]),
            contactPermille: z.number().int().min(0).max(900),
            baseSuccessPermille: z.number().int().min(100).max(950),
            baseFumbleRiskPermille: z.number().int().min(0).max(500),
            explosiveChancePermille: z.number().int().min(0).max(500),
            touchdownChancePermille: z.number().int().min(0).max(500),
            baseYards: z.number().int().min(0).max(30),
          })
          .strict(),
      )
      .length(8),
    skills: z
      .array(
        z
          .object({
            id: z.enum(RB_ALPHA_SKILL_IDS),
            ...localized,
            familyId: z.enum(SKILL_FAMILY_IDS),
            gradeId: z.enum(SKILL_GRADE_IDS),
            positionId: z.literal('position_rb'),
            effects: z
              .array(
                z
                  .object({
                    type: z.enum(RB_ALPHA_SKILL_EFFECT_TYPES),
                    value: z.number().int().min(-500).max(500),
                    familyId: family.optional(),
                    decisionId: decision.optional(),
                  })
                  .strict(),
              )
              .min(1)
              .max(3),
          })
          .strict(),
      )
      .length(12),
    events: z
      .array(
        z
          .object({
            id: z.enum(RB_ALPHA_EVENT_IDS),
            ...localized,
            weight: z.number().int().min(1).max(1000),
            cooldownWeeks: z.number().int().min(0).max(12),
            requirements: z
              .object({
                minBody: z.number().int().min(0).max(100).optional(),
                maxBody: z.number().int().min(0).max(100).optional(),
                minPreparation: z.number().int().min(0).max(100).optional(),
                maxPreparation: z.number().int().min(0).max(100).optional(),
                minConfidence: z.number().int().min(0).max(100).optional(),
                maxConfidence: z.number().int().min(0).max(100).optional(),
                minCoachTrust: z.number().int().min(0).max(100).optional(),
                maxCoachTrust: z.number().int().min(0).max(100).optional(),
                requiredContextTags: z.array(stableContentIdSchema).optional(),
                excludedContextTags: z.array(stableContentIdSchema).optional(),
              })
              .strict(),
            choices: z
              .array(
                z
                  .object({
                    id: stableContentIdSchema.refine((id) => id.startsWith('event_choice_rb_')),
                    ...localized,
                    requiresUnlockLevel: z.number().int().min(1).max(3).optional(),
                    effects,
                  })
                  .strict(),
              )
              .min(2)
              .max(3),
          })
          .strict(),
      )
      .length(12),
    participationFeedback: z
      .array(z.object({ id: stableContentIdSchema, ...localized }).strict())
      .length(2),
  })
  .strict()
  .superRefine((content, context) => {
    const exact = (actual: readonly string[], expected: readonly string[], path: string[]) => {
      if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))
        context.addIssue({ code: 'custom', message: 'IDs must remain canonical.', path });
    };
    exact(content.familyIds, RB_ALPHA_FAMILY_IDS, ['familyIds']);
    exact(
      content.decisions.map(({ id }) => id),
      RB_ALPHA_DECISION_IDS,
      ['decisions'],
    );
    exact(
      content.patterns.map(({ id }) => id),
      RB_ALPHA_PATTERN_IDS,
      ['patterns'],
    );
    exact(
      content.clues.map(({ id }) => id),
      RB_ALPHA_CLUE_IDS,
      ['clues'],
    );
    exact(
      content.skills.map(({ id }) => id),
      RB_ALPHA_SKILL_IDS,
      ['skills'],
    );
    exact(
      content.events.map(({ id }) => id),
      RB_ALPHA_EVENT_IDS,
      ['events'],
    );
    const byDecision = new Map(content.decisions.map(({ id, familyId }) => [id, familyId]));
    for (const familyId of RB_ALPHA_FAMILY_IDS) {
      if (
        content.decisions.filter((item) => item.familyId === familyId).length !== 3 ||
        content.patterns.filter((item) => item.familyId === familyId).length !== 2
      )
        context.addIssue({
          code: 'custom',
          message: 'Each RB family requires three decisions and two patterns.',
        });
    }
    for (const [index, pattern] of content.patterns.entries()) {
      if (
        new Set(pattern.clueIds).size !== 3 ||
        pattern.attributeWeights.reduce((sum, item) => sum + item.weightPermille, 0) !== 1000 ||
        pattern.decisionFits.some(
          ({ decisionId }) => byDecision.get(decisionId) !== pattern.familyId,
        )
      )
        context.addIssue({
          code: 'custom',
          message: 'Malformed RB pattern references or weights.',
          path: ['patterns', index],
        });
    }
    const choiceIds = content.events.flatMap(({ choices }) => choices.map(({ id }) => id));
    if (new Set(choiceIds).size !== choiceIds.length)
      context.addIssue({ code: 'custom', message: 'RB event choice IDs must be unique.' });
  });

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type RbAlphaContent = DeepReadonly<z.infer<typeof rbAlphaContentSchema>>;
