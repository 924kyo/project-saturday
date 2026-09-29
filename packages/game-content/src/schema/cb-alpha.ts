import { z } from 'zod';
import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import { SKILL_FAMILY_IDS, SKILL_GRADE_IDS } from './skills.js';
export const CB_ALPHA_FAMILY_IDS = [
  'key_snap_family_cb_leverage',
  'key_snap_family_cb_coverage',
  'key_snap_family_cb_ball',
  'key_snap_family_cb_tackle',
] as const;
export const CB_ALPHA_DECISION_IDS = [
  'key_snap_decision_cb_press_jam',
  'key_snap_decision_cb_shade_inside',
  'key_snap_decision_cb_bail_depth',
  'key_snap_decision_cb_mirror_release',
  'key_snap_decision_cb_undercut_break',
  'key_snap_decision_cb_handoff_zone',
  'key_snap_decision_cb_play_ball',
  'key_snap_decision_cb_play_hands',
  'key_snap_decision_cb_close_catch',
  'key_snap_decision_cb_breakdown_tackle',
  'key_snap_decision_cb_drive_boundary',
  'key_snap_decision_cb_attack_strip',
] as const;
export const CB_ALPHA_PATTERN_IDS = [
  'key_snap_pattern_cb_split_release',
  'key_snap_pattern_cb_vertical_stem',
  'key_snap_pattern_cb_crossing_exchange',
  'key_snap_pattern_cb_zone_flood',
  'key_snap_pattern_cb_high_point',
  'key_snap_pattern_cb_late_window',
  'key_snap_pattern_cb_open_field_catch',
  'key_snap_pattern_cb_boundary_finish',
] as const;
export const CB_ALPHA_CLUE_IDS = CB_ALPHA_PATTERN_IDS.flatMap((id) =>
  ['one', 'two', 'three'].map(
    (s) => `game_clue_cb_${id.slice('key_snap_pattern_cb_'.length)}_${s}`,
  ),
) as readonly `game_clue_cb_${string}`[];
export const CB_ALPHA_SKILL_IDS = [
  'skill_cb_split_key_c',
  'skill_cb_patient_feet_b',
  'skill_cb_route_thief_a',
  'skill_cb_ball_window_b',
  'skill_cb_secure_finish_c',
  'skill_cb_boundary_force_a',
  'skill_cb_weekly_reset_c',
  'skill_cb_next_series_b',
  'skill_cb_rep_archive_a',
  'skill_cb_quiet_island_a',
  'skill_cb_secondary_table_b',
  'skill_cb_shared_stage_s',
] as const;
export const CB_ALPHA_EVENT_IDS = [
  'event_cb_release_study',
  'event_cb_receiver_challenge',
  'event_cb_tackle_circuit',
  'event_cb_ball_drill',
  'event_cb_sore_shoulders',
  'event_cb_secondary_rotation',
  'event_cb_tutor_overlap',
  'event_cb_campus_interview',
  'event_cb_opponent_cutup',
  'event_cb_weather_practice',
  'event_cb_captain_checkin',
  'event_cb_youth_camp',
] as const;
export const CB_ALPHA_SKILL_EFFECT_TYPES = [
  'cb_information_clue_bonus',
  'cb_decision_score_flat',
  'cb_completion_risk_delta_permille',
  'cb_takeaway_chance_delta_permille',
  'cb_tackle_score_flat',
  'cb_body_cost_reduction',
  'cb_confidence_loss_reduction',
  'cb_xp_multiplier_permille',
  'cb_grade_bonus',
  'cb_event_choice_unlock',
  'cb_event_positive_multiplier_permille',
] as const;
const l = { nameKey: messageKeyFormatSchema, descriptionKey: messageKeyFormatSchema } as const;
const family = z.enum(CB_ALPHA_FAMILY_IDS);
const decision = z.enum(CB_ALPHA_DECISION_IDS);
const eventEffects = z
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
        targetReductionPermille: z.number().int().min(0).max(250),
      })
      .strict(),
  })
  .strict();
export const cbAlphaContentSchema = z
  .object({
    id: z.literal('cb_alpha_vertical'),
    ...l,
    familyIds: z.array(family).length(4),
    decisions: z
      .array(
        z
          .object({
            id: decision,
            familyId: family,
            ...l,
            mode: z.enum(['COVERAGE', 'BALL', 'TACKLE']),
            disruptionModifierPermille: z.number().int().min(-300).max(300),
            completionRiskModifierPermille: z.number().int().min(-250).max(250),
            takeawayModifierPermille: z.number().int().min(-250).max(250),
            bodyExposure: z.number().int().min(0).max(8),
          })
          .strict(),
      )
      .length(12),
    clues: z
      .array(
        z
          .object({
            id: stableContentIdSchema.refine((id) => id.startsWith('game_clue_cb_')),
            ...l,
          })
          .strict(),
      )
      .length(24),
    patterns: z
      .array(
        z
          .object({
            id: z.enum(CB_ALPHA_PATTERN_IDS),
            familyId: family,
            ...l,
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
            targetPermille: z.number().int().min(0).max(950),
            baseDisruptionPermille: z.number().int().min(0).max(950),
            baseCompletionRiskPermille: z.number().int().min(0).max(950),
            takeawayChancePermille: z.number().int().min(0).max(500),
            touchdownRiskPermille: z.number().int().min(0).max(500),
            baseYardsAllowed: z.number().int().min(0).max(40),
          })
          .strict(),
      )
      .length(8),
    skills: z
      .array(
        z
          .object({
            id: z.enum(CB_ALPHA_SKILL_IDS),
            ...l,
            familyId: z.enum(SKILL_FAMILY_IDS),
            gradeId: z.enum(SKILL_GRADE_IDS),
            positionId: z.literal('position_cb'),
            effects: z
              .array(
                z
                  .object({
                    type: z.enum(CB_ALPHA_SKILL_EFFECT_TYPES),
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
            id: z.enum(CB_ALPHA_EVENT_IDS),
            ...l,
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
                    id: stableContentIdSchema.refine((id) => id.startsWith('event_choice_cb_')),
                    ...l,
                    requiresUnlockLevel: z.number().int().min(1).max(3).optional(),
                    effects: eventEffects,
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
      .array(z.object({ id: stableContentIdSchema, ...l }).strict())
      .length(2),
  })
  .strict()
  .superRefine((content, ctx) => {
    const exact = (a: readonly string[], e: readonly string[], path: string[]) => {
      if (a.length !== e.length || a.some((id, i) => id !== e[i]))
        ctx.addIssue({ code: 'custom', message: 'IDs must remain canonical.', path });
    };
    exact(content.familyIds, CB_ALPHA_FAMILY_IDS, ['familyIds']);
    exact(
      content.decisions.map(({ id }) => id),
      CB_ALPHA_DECISION_IDS,
      ['decisions'],
    );
    exact(
      content.patterns.map(({ id }) => id),
      CB_ALPHA_PATTERN_IDS,
      ['patterns'],
    );
    exact(
      content.clues.map(({ id }) => id),
      CB_ALPHA_CLUE_IDS,
      ['clues'],
    );
    exact(
      content.skills.map(({ id }) => id),
      CB_ALPHA_SKILL_IDS,
      ['skills'],
    );
    exact(
      content.events.map(({ id }) => id),
      CB_ALPHA_EVENT_IDS,
      ['events'],
    );
    const by = new Map(content.decisions.map(({ id, familyId }) => [id, familyId]));
    for (const f of CB_ALPHA_FAMILY_IDS)
      if (
        content.decisions.filter((x) => x.familyId === f).length !== 3 ||
        content.patterns.filter((x) => x.familyId === f).length !== 2
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Each CB family requires three decisions and two patterns.',
        });
    for (const [i, p] of content.patterns.entries())
      if (
        new Set(p.clueIds).size !== 3 ||
        p.attributeWeights.reduce((s, x) => s + x.weightPermille, 0) !== 1000 ||
        p.decisionFits.some(({ decisionId }) => by.get(decisionId) !== p.familyId)
      )
        ctx.addIssue({ code: 'custom', message: 'Malformed CB pattern.', path: ['patterns', i] });
    const choices = content.events.flatMap((e) => e.choices.map(({ id }) => id));
    if (new Set(choices).size !== choices.length)
      ctx.addIssue({ code: 'custom', message: 'CB event choices must be unique.' });
  });
type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type CbAlphaContent = DeepReadonly<z.infer<typeof cbAlphaContentSchema>>;
