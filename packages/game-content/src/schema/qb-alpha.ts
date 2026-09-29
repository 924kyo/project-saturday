import { z } from 'zod';

import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import { SKILL_FAMILY_IDS, SKILL_GRADE_IDS } from './skills.js';

export const QB_ALPHA_FAMILY_IDS = [
  'key_snap_family_qb_pre_snap',
  'key_snap_family_qb_pocket',
  'key_snap_family_qb_throw',
  'key_snap_family_qb_scramble',
] as const;

export const QB_ALPHA_DECISION_IDS = [
  'key_snap_decision_qb_confirm_shell',
  'key_snap_decision_qb_redirect_protection',
  'key_snap_decision_qb_vary_cadence',
  'key_snap_decision_qb_climb_pocket',
  'key_snap_decision_qb_reset_platform',
  'key_snap_decision_qb_escape_edge',
  'key_snap_decision_qb_take_checkdown',
  'key_snap_decision_qb_attack_layered_window',
  'key_snap_decision_qb_challenge_boundary',
  'key_snap_decision_qb_slide_early',
  'key_snap_decision_qb_reach_marker',
  'key_snap_decision_qb_extend_boundary',
] as const;

export const QB_ALPHA_PATTERN_IDS = [
  'key_snap_pattern_qb_split_safety_alert',
  'key_snap_pattern_qb_pressure_surface',
  'key_snap_pattern_qb_interior_squeeze',
  'key_snap_pattern_qb_edge_escape',
  'key_snap_pattern_qb_layered_window',
  'key_snap_pattern_qb_boundary_match',
  'key_snap_pattern_qb_open_lane',
  'key_snap_pattern_qb_late_spy',
] as const;

export const QB_ALPHA_CLUE_IDS = QB_ALPHA_PATTERN_IDS.flatMap((patternId) => [
  `game_clue_qb_${patternId.slice('key_snap_pattern_qb_'.length)}_one`,
  `game_clue_qb_${patternId.slice('key_snap_pattern_qb_'.length)}_two`,
  `game_clue_qb_${patternId.slice('key_snap_pattern_qb_'.length)}_three`,
]) as readonly `game_clue_qb_${string}`[];

export const QB_ALPHA_SKILL_IDS = [
  'skill_qb_chalkboard_echo_c',
  'skill_qb_protection_voice_b',
  'skill_qb_compact_base_c',
  'skill_qb_layered_nerve_a',
  'skill_qb_escape_geometry_b',
  'skill_qb_safe_harbor_b',
  'skill_qb_weekly_maintenance_c',
  'skill_qb_short_memory_b',
  'skill_qb_rep_compounder_a',
  'skill_qb_command_presence_a',
  'skill_qb_open_office_b',
  'skill_qb_shared_spotlight_s',
] as const;

export const QB_ALPHA_EVENT_IDS = [
  'event_qb_protection_meeting',
  'event_qb_backup_rep_request',
  'event_qb_receiver_timing',
  'event_qb_film_room_dispute',
  'event_qb_muddy_practice',
  'event_qb_campus_interview',
  'event_qb_tutor_overlap',
  'event_qb_sore_throwing_arm',
  'event_qb_two_minute_challenge',
  'event_qb_roommate_noise',
  'event_qb_captain_message',
  'event_qb_local_appearance',
] as const;

export const QB_ALPHA_SKILL_EFFECT_TYPES = [
  'qb_information_clue_bonus',
  'qb_decision_score_flat',
  'qb_turnover_risk_delta_permille',
  'qb_scramble_yards_flat',
  'qb_body_cost_reduction',
  'qb_confidence_loss_reduction',
  'qb_xp_multiplier_permille',
  'qb_grade_bonus',
  'qb_event_choice_unlock',
  'qb_event_positive_multiplier_permille',
] as const;

const localizedFields = {
  descriptionKey: messageKeyFormatSchema,
  nameKey: messageKeyFormatSchema,
} as const;

const familyIdSchema = z.enum(QB_ALPHA_FAMILY_IDS);
const decisionIdSchema = z.enum(QB_ALPHA_DECISION_IDS);
const patternIdSchema = z.enum(QB_ALPHA_PATTERN_IDS);
const clueIdSchema = stableContentIdSchema.refine((id) => id.startsWith('game_clue_qb_'));

export const qbAlphaDecisionSchema = z
  .object({
    ...localizedFields,
    id: decisionIdSchema,
    familyId: familyIdSchema,
    playMode: z.enum(['PASS', 'SCRAMBLE', 'THROW_AWAY']),
    completionModifierPermille: z.number().int().min(-300).max(300),
    turnoverRiskModifierPermille: z.number().int().min(-250).max(250),
    pressureResponse: z.number().int().min(-20).max(20),
    yardModifier: z.number().int().min(-15).max(20),
  })
  .strict();

export const qbAlphaPatternSchema = z
  .object({
    ...localizedFields,
    id: patternIdSchema,
    familyId: familyIdSchema,
    clueIds: z.tuple([clueIdSchema, clueIdSchema, clueIdSchema]),
    decisionFits: z.tuple([
      z.object({ decisionId: decisionIdSchema, fit: z.number().int().min(0).max(100) }).strict(),
      z.object({ decisionId: decisionIdSchema, fit: z.number().int().min(0).max(100) }).strict(),
      z.object({ decisionId: decisionIdSchema, fit: z.number().int().min(0).max(100) }).strict(),
    ]),
    attributeWeights: z.tuple([
      z
        .object({
          attributeId: z.enum([
            'attribute_football_iq',
            'attribute_composure',
            'attribute_qb_throw_power',
            'attribute_qb_short_accuracy',
            'attribute_qb_intermediate_accuracy',
            'attribute_qb_deep_accuracy',
            'attribute_qb_pocket_presence',
            'attribute_qb_read_progression',
            'attribute_speed',
            'attribute_agility',
          ]),
          weightPermille: z.number().int().min(1).max(999),
        })
        .strict(),
      z
        .object({
          attributeId: z.enum([
            'attribute_football_iq',
            'attribute_composure',
            'attribute_qb_throw_power',
            'attribute_qb_short_accuracy',
            'attribute_qb_intermediate_accuracy',
            'attribute_qb_deep_accuracy',
            'attribute_qb_pocket_presence',
            'attribute_qb_read_progression',
            'attribute_speed',
            'attribute_agility',
          ]),
          weightPermille: z.number().int().min(1).max(999),
        })
        .strict(),
    ]),
    pressurePermille: z.number().int().min(0).max(900),
    baseCompletionPermille: z.number().int().min(100).max(950),
    baseTurnoverRiskPermille: z.number().int().min(0).max(500),
    touchdownChancePermille: z.number().int().min(0).max(500),
    baseYards: z.number().int().min(0).max(40),
  })
  .strict();

const gameModifiersSchema = z
  .object({
    clueBonus: z.number().int().min(0).max(2),
    decisionScoreFlat: z.number().int().min(-10).max(10),
    pressureReductionPermille: z.number().int().min(0).max(250),
  })
  .strict();

const eventEffectsSchema = z
  .object({
    bodyDelta: z.number().int().min(-30).max(30),
    preparationDelta: z.number().int().min(-30).max(30),
    confidenceDelta: z.number().int().min(-30).max(30),
    coachTrustDelta: z.number().int().min(-30).max(30),
    gpaMilliDelta: z.number().int().min(-1_000).max(1_000),
    brandDelta: z.number().int().min(-30).max(30),
    gameModifiers: gameModifiersSchema,
  })
  .strict();

export const qbAlphaContentSchema = z
  .object({
    id: z.literal('qb_alpha_vertical'),
    ...localizedFields,
    familyIds: z.array(familyIdSchema).length(4),
    decisions: z.array(qbAlphaDecisionSchema).length(12),
    clues: z.array(z.object({ id: clueIdSchema, ...localizedFields }).strict()).length(24),
    patterns: z.array(qbAlphaPatternSchema).length(8),
    skills: z
      .array(
        z
          .object({
            id: z.enum(QB_ALPHA_SKILL_IDS),
            ...localizedFields,
            familyId: z.enum(SKILL_FAMILY_IDS),
            gradeId: z.enum(SKILL_GRADE_IDS),
            positionId: z.literal('position_qb'),
            effects: z
              .array(
                z
                  .object({
                    type: z.enum(QB_ALPHA_SKILL_EFFECT_TYPES),
                    value: z.number().int().min(-500).max(500),
                    familyId: familyIdSchema.optional(),
                    decisionId: decisionIdSchema.optional(),
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
            id: z.enum(QB_ALPHA_EVENT_IDS),
            ...localizedFields,
            weight: z.number().int().min(1).max(1_000),
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
                    id: stableContentIdSchema.refine((id) => id.startsWith('event_choice_qb_')),
                    ...localizedFields,
                    requiresUnlockLevel: z.number().int().min(1).max(3).optional(),
                    effects: eventEffectsSchema,
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
      .array(z.object({ id: stableContentIdSchema, ...localizedFields }).strict())
      .length(2),
  })
  .strict()
  .superRefine((content, context) => {
    const exact = (actual: readonly string[], expected: readonly string[], path: string[]) => {
      if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
        context.addIssue({ code: 'custom', message: 'IDs must remain canonical.', path });
      }
    };
    exact(content.familyIds, QB_ALPHA_FAMILY_IDS, ['familyIds']);
    exact(
      content.decisions.map(({ id }) => id),
      QB_ALPHA_DECISION_IDS,
      ['decisions'],
    );
    exact(
      content.patterns.map(({ id }) => id),
      QB_ALPHA_PATTERN_IDS,
      ['patterns'],
    );
    exact(
      content.clues.map(({ id }) => id),
      QB_ALPHA_CLUE_IDS,
      ['clues'],
    );
    exact(
      content.skills.map(({ id }) => id),
      QB_ALPHA_SKILL_IDS,
      ['skills'],
    );
    exact(
      content.events.map(({ id }) => id),
      QB_ALPHA_EVENT_IDS,
      ['events'],
    );
    const decisionFamily = new Map(content.decisions.map(({ id, familyId }) => [id, familyId]));
    for (const familyId of QB_ALPHA_FAMILY_IDS) {
      if (content.decisions.filter((item) => item.familyId === familyId).length !== 3) {
        context.addIssue({ code: 'custom', message: 'Each family requires three decisions.' });
      }
      if (content.patterns.filter((item) => item.familyId === familyId).length !== 2) {
        context.addIssue({ code: 'custom', message: 'Each family requires two patterns.' });
      }
    }
    const allChoiceIds = content.events.flatMap(({ choices }) => choices.map(({ id }) => id));
    if (new Set(allChoiceIds).size !== allChoiceIds.length) {
      context.addIssue({ code: 'custom', message: 'QB event choice IDs must be unique.' });
    }
    for (const [index, pattern] of content.patterns.entries()) {
      if (new Set(pattern.clueIds).size !== 3) {
        context.addIssue({
          code: 'custom',
          message: 'Pattern clues must be unique.',
          path: ['patterns', index, 'clueIds'],
        });
      }
      if (pattern.attributeWeights.reduce((sum, item) => sum + item.weightPermille, 0) !== 1_000) {
        context.addIssue({
          code: 'custom',
          message: 'Attribute weights must total 1000.',
          path: ['patterns', index, 'attributeWeights'],
        });
      }
      if (
        pattern.decisionFits.some(
          ({ decisionId }) => decisionFamily.get(decisionId) !== pattern.familyId,
        )
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Pattern decisions must belong to its family.',
          path: ['patterns', index, 'decisionFits'],
        });
      }
    }
  });

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type QbAlphaContent = DeepReadonly<z.infer<typeof qbAlphaContentSchema>>;
