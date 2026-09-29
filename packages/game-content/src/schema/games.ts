import { z } from 'zod';

import { playerAttributeIdSchema } from './creation.js';
import { messageKeyFormatSchema } from './primitives.js';
import { PROGRAM_IDS, programIdSchema } from './programs.js';

export const GAME_COVERAGE_IDS = [
  'game_coverage_press_man',
  'game_coverage_off_man',
  'game_coverage_two_high_zone',
  'game_coverage_single_high_zone',
] as const;

export const GAME_LEVERAGE_IDS = [
  'game_leverage_inside',
  'game_leverage_outside',
  'game_leverage_head_up',
] as const;

export const GAME_CLUE_IDS = [
  'game_clue_press_man',
  'game_clue_off_man',
  'game_clue_two_high_zone',
  'game_clue_single_high_zone',
  'game_clue_inside_leverage',
  'game_clue_outside_leverage',
  'game_clue_head_up_leverage',
] as const;

export const KEY_SNAP_DECISION_FAMILY_IDS = [
  'key_snap_family_release',
  'key_snap_family_route',
  'key_snap_family_catch',
  'key_snap_family_yac',
] as const;

export const KEY_SNAP_DECISION_IDS = [
  'key_snap_decision_speed_release',
  'key_snap_decision_hand_clear',
  'key_snap_decision_patient_feint',
  'key_snap_decision_cross_face',
  'key_snap_decision_stack_defender',
  'key_snap_decision_settle_window',
  'key_snap_decision_secure_frame',
  'key_snap_decision_attack_high_point',
  'key_snap_decision_late_hands',
  'key_snap_decision_protect_ball',
  'key_snap_decision_cutback_lane',
  'key_snap_decision_burst_upfield',
] as const;

export const KEY_SNAP_PATTERN_IDS = [
  'key_snap_pattern_boundary_jam',
  'key_snap_pattern_reduced_split',
  'key_snap_pattern_nickel_crossface',
  'key_snap_pattern_two_high_void',
  'key_snap_pattern_seam_collision',
  'key_snap_pattern_boundary_window',
  'key_snap_pattern_pursuit_angle',
  'key_snap_pattern_closing_safety',
] as const;

export const GAME_INFORMATION_TIER_IDS = [
  'game_information_uncertain',
  'game_information_partial',
  'game_information_diagnostic',
] as const;

export const GAME_PARTICIPATION_FEEDBACK_IDS = [
  'game_participation_offensive_role',
  'game_participation_special_teams',
  'game_participation_package_reps',
  'game_participation_late_reps',
  'game_participation_sideline_learning',
  'game_participation_scout_preparation',
] as const;

export const PERFORMANCE_GRADE_BAND_IDS = [
  'performance_grade_elite',
  'performance_grade_strong',
  'performance_grade_solid',
  'performance_grade_developing',
  'performance_grade_poor',
] as const;

export const gameCoverageIdSchema = z.enum(GAME_COVERAGE_IDS);
export const gameLeverageIdSchema = z.enum(GAME_LEVERAGE_IDS);
export const gameClueIdSchema = z.enum(GAME_CLUE_IDS);
export const keySnapDecisionFamilyIdSchema = z.enum(KEY_SNAP_DECISION_FAMILY_IDS);
export const keySnapDecisionIdSchema = z.enum(KEY_SNAP_DECISION_IDS);
export const keySnapPatternIdSchema = z.enum(KEY_SNAP_PATTERN_IDS);
export const gameInformationTierIdSchema = z.enum(GAME_INFORMATION_TIER_IDS);
export const gameParticipationFeedbackIdSchema = z.enum(GAME_PARTICIPATION_FEEDBACK_IDS);
export const performanceGradeBandIdSchema = z.enum(PERFORMANCE_GRADE_BAND_IDS);

const localizedFields = {
  descriptionKey: messageKeyFormatSchema,
  nameKey: messageKeyFormatSchema,
} as const;

const attributeWeightSchema = z
  .object({
    attributeId: playerAttributeIdSchema,
    weightPermille: z.number().int().min(1).max(1_000),
  })
  .strict();

export const keySnapDecisionFamilyDefinitionSchema = z
  .object({
    ...localizedFields,
    attributeWeights: z.array(attributeWeightSchema).min(2).max(4),
    decisionIds: z.tuple([
      keySnapDecisionIdSchema,
      keySnapDecisionIdSchema,
      keySnapDecisionIdSchema,
    ]),
    id: keySnapDecisionFamilyIdSchema,
    kind: z.literal('key_snap_decision_family'),
  })
  .strict()
  .superRefine((family, context) => {
    if (new Set(family.decisionIds).size !== 3) {
      context.addIssue({
        code: 'custom',
        message: 'Family decisions must be unique.',
        path: ['decisionIds'],
      });
    }
    if (
      new Set(family.attributeWeights.map(({ attributeId }) => attributeId)).size !==
      family.attributeWeights.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Family attribute weights must be unique.',
        path: ['attributeWeights'],
      });
    }
    const total = family.attributeWeights.reduce(
      (sum, { weightPermille }) => sum + weightPermille,
      0,
    );
    if (total !== 1_000) {
      context.addIssue({
        code: 'custom',
        message: 'Family attribute weights must total 1000 permille.',
        path: ['attributeWeights'],
      });
    }
  });

export const keySnapDecisionDefinitionSchema = z
  .object({
    ...localizedFields,
    familyId: keySnapDecisionFamilyIdSchema,
    id: keySnapDecisionIdSchema,
    kind: z.literal('key_snap_decision'),
  })
  .strict();

export const gameClueDefinitionSchema = z.discriminatedUnion('contextType', [
  z
    .object({
      ...localizedFields,
      contextType: z.literal('coverage'),
      coverageId: gameCoverageIdSchema,
      id: gameClueIdSchema,
      kind: z.literal('game_clue'),
    })
    .strict(),
  z
    .object({
      ...localizedFields,
      contextType: z.literal('leverage'),
      id: gameClueIdSchema,
      kind: z.literal('game_clue'),
      leverageId: gameLeverageIdSchema,
    })
    .strict(),
]);

export const gameParticipationFeedbackDefinitionSchema = z
  .object({
    ...localizedFields,
    id: gameParticipationFeedbackIdSchema,
    kind: z.literal('game_participation_feedback'),
  })
  .strict();

export const keySnapDecisionFitSchema = z
  .object({
    decisionId: keySnapDecisionIdSchema,
    fit: z.number().int().min(-30).max(30),
  })
  .strict();

export const keySnapPatternOutcomeSchema = z
  .object({
    baseCatchPermille: z.number().int().min(0).max(1_000),
    baseReceivingYards: z.number().int().min(-5).max(50),
    baseTargetPermille: z.number().int().min(0).max(1_000),
    dropRiskPermille: z.number().int().min(0).max(500),
    touchdownChancePermille: z.number().int().min(0).max(1_000),
    turnoverRiskPermille: z.number().int().min(0).max(500),
  })
  .strict()
  .refine((outcome) => outcome.baseCatchPermille <= outcome.baseTargetPermille, {
    message: 'Base catch chance cannot exceed target chance.',
    path: ['baseCatchPermille'],
  });

export const keySnapPatternDefinitionSchema = z
  .object({
    ...localizedFields,
    clueIds: z.tuple([gameClueIdSchema, gameClueIdSchema]),
    coverageId: gameCoverageIdSchema,
    decisionFits: z.tuple([
      keySnapDecisionFitSchema,
      keySnapDecisionFitSchema,
      keySnapDecisionFitSchema,
    ]),
    familyId: keySnapDecisionFamilyIdSchema,
    id: keySnapPatternIdSchema,
    kind: z.literal('key_snap_pattern'),
    leverageId: gameLeverageIdSchema,
    outcome: keySnapPatternOutcomeSchema,
  })
  .strict()
  .superRefine((pattern, context) => {
    const decisions = pattern.decisionFits.map(({ decisionId }) => decisionId);
    if (new Set(decisions).size !== decisions.length) {
      context.addIssue({
        code: 'custom',
        message: 'Pattern decisions must be unique.',
        path: ['decisionFits'],
      });
    }
    const fits = pattern.decisionFits.map(({ fit }) => fit);
    const best = Math.max(...fits);
    if (fits.filter((fit) => fit === best).length !== 1 || !fits.some((fit) => fit < 0)) {
      context.addIssue({
        code: 'custom',
        message: 'Each pattern needs one best fit and at least one poor fit.',
        path: ['decisionFits'],
      });
    }
    if (new Set(pattern.clueIds).size !== pattern.clueIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Pattern clues must be unique.',
        path: ['clueIds'],
      });
    }
  });

export const gameOpponentProfileSchema = z
  .object({
    defenseRating: z.number().int().min(40).max(100),
    offenseRating: z.number().int().min(40).max(100),
    programId: programIdSchema,
    qbRating: z.number().int().min(40).max(100),
  })
  .strict();

const opportunityBandSchema = z
  .object({
    minimumSnapPermille: z.number().int().min(0).max(1_000),
    opportunityBudget: z.number().int().min(1).max(12),
  })
  .strict();

const opportunityBoundsByDepthRankSchema = z
  .object({
    depthRank: z.number().int().min(1).max(8),
    maximumOpportunities: z.number().int().min(0).max(12),
    minimumOpportunities: z.number().int().min(0).max(12),
  })
  .strict()
  .refine((bounds) => bounds.minimumOpportunities <= bounds.maximumOpportunities, {
    message: 'Opportunity minimum cannot exceed its maximum.',
    path: ['minimumOpportunities'],
  });

const performanceGradeBandSchema = z
  .object({
    id: performanceGradeBandIdSchema,
    minimumScore: z.number().int().min(0).max(100),
  })
  .strict();

export const gameTuningSchema = z
  .object({
    drive: z
      .object({
        fieldGoalBasePermille: z.number().int().min(0).max(1_000),
        homeRatingBonus: z.number().int().min(0).max(10),
        maxDriveCount: z.number().int().min(8).max(40),
        maximumSecondsElapsed: z.number().int().min(60).max(600),
        minimumSecondsElapsed: z.number().int().min(30).max(300),
        ratingEdgePermillePerPoint: z.number().int().min(0).max(25),
        touchdownBasePermille: z.number().int().min(0).max(1_000),
      })
      .strict(),
    grade: z
      .object({
        baseScore: z.number().int().min(0).max(100),
        bands: z.tuple([
          performanceGradeBandSchema,
          performanceGradeBandSchema,
          performanceGradeBandSchema,
          performanceGradeBandSchema,
          performanceGradeBandSchema,
        ]),
        dropPenalty: z.number().int().min(0).max(50),
        fitDivisor: z.number().int().min(1).max(20),
        opportunityNormalizationTarget: z.number().int().min(1).max(12),
        receivingYardsDivisor: z.number().int().min(1).max(50),
        receptionValue: z.number().int().min(0).max(20),
        touchdownValue: z.number().int().min(0).max(50),
        turnoverPenalty: z.number().int().min(0).max(100),
      })
      .strict(),
    growth: z
      .object({
        baseAttributeXpPerOpportunity: z.number().int().min(0).max(100),
        baseBodyCost: z.number().int().min(-30).max(0),
        confidenceDeltaByBand: z.record(
          performanceGradeBandIdSchema,
          z.number().int().min(-20).max(20),
        ),
        fitXpDivisor: z.number().int().min(1).max(30),
        trustDeltaByBand: z.record(performanceGradeBandIdSchema, z.number().int().min(-20).max(20)),
      })
      .strict(),
    information: z
      .object({
        diagnosticMinimumScore: z.number().int().min(0).max(200),
        filmStudyBonus: z.number().int().min(0).max(100),
        footballIqWeightPermille: z.number().int().min(0).max(1_000),
        partialMinimumScore: z.number().int().min(0).max(200),
        preparationWeightPermille: z.number().int().min(0).max(1_000),
      })
      .strict(),
    maxKeySnapOpportunities: z.literal(12),
    opportunityBands: z.tuple([
      opportunityBandSchema,
      opportunityBandSchema,
      opportunityBandSchema,
      opportunityBandSchema,
      opportunityBandSchema,
      opportunityBandSchema,
      opportunityBandSchema,
      opportunityBandSchema,
      opportunityBandSchema,
    ]),
    opportunityBoundsByDepthRank: z.tuple([
      opportunityBoundsByDepthRankSchema,
      opportunityBoundsByDepthRankSchema,
      opportunityBoundsByDepthRankSchema,
      opportunityBoundsByDepthRankSchema,
      opportunityBoundsByDepthRankSchema,
      opportunityBoundsByDepthRankSchema,
      opportunityBoundsByDepthRankSchema,
      opportunityBoundsByDepthRankSchema,
    ]),
    periodCount: z.literal(4),
    periodLengthSeconds: z.literal(900),
    resolution: z
      .object({
        attributeWeightPermille: z.number().int().min(0).max(1_000),
        bodyWeightPermille: z.number().int().min(0).max(1_000),
        confidenceWeightPermille: z.number().int().min(0).max(1_000),
        decisionFitWeightPermille: z.number().int().min(0).max(1_000),
        matchupWeightPermille: z.number().int().min(0).max(1_000),
        preparationWeightPermille: z.number().int().min(0).max(1_000),
        rollMaximum: z.number().int().min(1).max(100),
        rollMinimum: z.number().int().min(-100).max(-1),
        teamContextWeightPermille: z.number().int().min(0).max(1_000),
      })
      .strict(),
    zeroOpportunityMaxSnapPermille: z.number().int().min(0).max(100),
  })
  .strict()
  .superRefine((tuning, context) => {
    if (tuning.drive.minimumSecondsElapsed > tuning.drive.maximumSecondsElapsed) {
      context.addIssue({
        code: 'custom',
        message: 'Drive duration bounds are reversed.',
        path: ['drive'],
      });
    }
    if (tuning.drive.fieldGoalBasePermille + tuning.drive.touchdownBasePermille > 1_000) {
      context.addIssue({
        code: 'custom',
        message: 'Base drive scoring chances exceed 1000 permille.',
        path: ['drive'],
      });
    }
    if (tuning.information.partialMinimumScore >= tuning.information.diagnosticMinimumScore) {
      context.addIssue({
        code: 'custom',
        message: 'Information thresholds must increase.',
        path: ['information'],
      });
    }
    if (
      tuning.information.footballIqWeightPermille + tuning.information.preparationWeightPermille !==
      1_000
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Information weights must total 1000 permille.',
        path: ['information'],
      });
    }
    const resolutionTotal = [
      tuning.resolution.attributeWeightPermille,
      tuning.resolution.bodyWeightPermille,
      tuning.resolution.confidenceWeightPermille,
      tuning.resolution.decisionFitWeightPermille,
      tuning.resolution.matchupWeightPermille,
      tuning.resolution.preparationWeightPermille,
      tuning.resolution.teamContextWeightPermille,
    ].reduce((sum, weight) => sum + weight, 0);
    if (
      resolutionTotal !== 1_000 ||
      tuning.resolution.rollMinimum >= tuning.resolution.rollMaximum
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Resolution weights/draw bounds are invalid.',
        path: ['resolution'],
      });
    }
    tuning.opportunityBands.forEach((band, index) => {
      const previous = tuning.opportunityBands[index - 1];
      if (
        previous !== undefined &&
        (band.minimumSnapPermille >= previous.minimumSnapPermille ||
          band.opportunityBudget >= previous.opportunityBudget)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Opportunity bands must descend strictly.',
          path: ['opportunityBands', index],
        });
      }
    });
    tuning.opportunityBoundsByDepthRank.forEach((bounds, index) => {
      if (bounds.depthRank !== index + 1) {
        context.addIssue({
          code: 'custom',
          message: 'Opportunity depth ranks must use canonical order.',
          path: ['opportunityBoundsByDepthRank', index, 'depthRank'],
        });
      }
      if (bounds.maximumOpportunities > tuning.maxKeySnapOpportunities) {
        context.addIssue({
          code: 'custom',
          message: 'Rank opportunity maximum exceeds the global maximum.',
          path: ['opportunityBoundsByDepthRank', index, 'maximumOpportunities'],
        });
      }
    });
    tuning.grade.bands.forEach((band, index) => {
      if (band.id !== PERFORMANCE_GRADE_BAND_IDS[index]) {
        context.addIssue({
          code: 'custom',
          message: 'Grade bands must use canonical order.',
          path: ['grade', 'bands', index, 'id'],
        });
      }
      const previous = tuning.grade.bands[index - 1];
      if (previous !== undefined && band.minimumScore >= previous.minimumScore) {
        context.addIssue({
          code: 'custom',
          message: 'Grade thresholds must descend.',
          path: ['grade', 'bands', index, 'minimumScore'],
        });
      }
    });
  });

function canonicalCatalog<TId extends string>(
  entries: readonly { readonly id: TId }[],
  expectedIds: readonly TId[],
  path: string,
  context: z.RefinementCtx,
): void {
  if (new Set(entries.map(({ id }) => id)).size !== entries.length) {
    context.addIssue({ code: 'custom', message: `${path} IDs must be unique.`, path: [path] });
  }
  entries.forEach((entry, index) => {
    if (entry.id !== expectedIds[index]) {
      context.addIssue({
        code: 'custom',
        message: `${path} must use canonical ID order.`,
        path: [path, index, 'id'],
      });
    }
  });
}

export const gameContentSchema = z
  .object({
    clues: z.array(gameClueDefinitionSchema).length(GAME_CLUE_IDS.length),
    decisionFamilies: z
      .array(keySnapDecisionFamilyDefinitionSchema)
      .length(KEY_SNAP_DECISION_FAMILY_IDS.length),
    decisions: z.array(keySnapDecisionDefinitionSchema).length(KEY_SNAP_DECISION_IDS.length),
    opponentProfiles: z.array(gameOpponentProfileSchema).length(PROGRAM_IDS.length),
    participationFeedback: z
      .array(gameParticipationFeedbackDefinitionSchema)
      .length(GAME_PARTICIPATION_FEEDBACK_IDS.length),
    patterns: z.array(keySnapPatternDefinitionSchema).length(KEY_SNAP_PATTERN_IDS.length),
    tuning: gameTuningSchema,
  })
  .strict()
  .superRefine((content, context) => {
    canonicalCatalog(content.clues, GAME_CLUE_IDS, 'clues', context);
    canonicalCatalog(
      content.decisionFamilies,
      KEY_SNAP_DECISION_FAMILY_IDS,
      'decisionFamilies',
      context,
    );
    canonicalCatalog(
      content.participationFeedback,
      GAME_PARTICIPATION_FEEDBACK_IDS,
      'participationFeedback',
      context,
    );
    canonicalCatalog(content.decisions, KEY_SNAP_DECISION_IDS, 'decisions', context);
    canonicalCatalog(
      content.opponentProfiles.map((profile) => ({ id: profile.programId })),
      PROGRAM_IDS,
      'opponentProfiles',
      context,
    );
    canonicalCatalog(content.patterns, KEY_SNAP_PATTERN_IDS, 'patterns', context);

    const decisionById = new Map(content.decisions.map((decision) => [decision.id, decision]));
    const clueById = new Map(content.clues.map((clue) => [clue.id, clue]));
    const bestByFamily = new Map<string, Set<string>>();
    for (const family of content.decisionFamilies) {
      family.decisionIds.forEach((decisionId, index) => {
        if (decisionById.get(decisionId)?.familyId !== family.id) {
          context.addIssue({
            code: 'custom',
            message: 'Family decision reference is invalid.',
            path: [
              'decisionFamilies',
              content.decisionFamilies.indexOf(family),
              'decisionIds',
              index,
            ],
          });
        }
      });
    }
    for (const [patternIndex, pattern] of content.patterns.entries()) {
      const family = content.decisionFamilies.find(({ id }) => id === pattern.familyId);
      const patternDecisionIds = pattern.decisionFits.map(({ decisionId }) => decisionId);
      if (
        family === undefined ||
        patternDecisionIds.some((id, index) => id !== family.decisionIds[index])
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Pattern decisions must match its family in canonical order.',
          path: ['patterns', patternIndex, 'decisionFits'],
        });
      }
      const coverageClue = clueById.get(pattern.clueIds[0]);
      const leverageClue = clueById.get(pattern.clueIds[1]);
      if (
        coverageClue?.contextType !== 'coverage' ||
        coverageClue.coverageId !== pattern.coverageId
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Pattern coverage clue must describe its hidden coverage.',
          path: ['patterns', patternIndex, 'clueIds', 0],
        });
      }
      if (
        leverageClue?.contextType !== 'leverage' ||
        leverageClue.leverageId !== pattern.leverageId
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Pattern leverage clue must describe its hidden leverage.',
          path: ['patterns', patternIndex, 'clueIds', 1],
        });
      }
      const best = pattern.decisionFits.reduce((left, right) =>
        right.fit > left.fit ? right : left,
      ).decisionId;
      const familyBest = bestByFamily.get(pattern.familyId) ?? new Set<string>();
      familyBest.add(best);
      bestByFamily.set(pattern.familyId, familyBest);
    }
    for (const familyId of KEY_SNAP_DECISION_FAMILY_IDS) {
      const patterns = content.patterns.filter((pattern) => pattern.familyId === familyId);
      if (patterns.length !== 2 || (bestByFamily.get(familyId)?.size ?? 0) < 2) {
        context.addIssue({
          code: 'custom',
          message: 'Each family needs two patterns that reverse the best decision.',
          path: ['patterns'],
        });
      }
    }
  });

type DeepReadonly<T> = T extends readonly (infer TItem)[]
  ? readonly DeepReadonly<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
    : T;

export type GameCoverageId = (typeof GAME_COVERAGE_IDS)[number];
export type GameLeverageId = (typeof GAME_LEVERAGE_IDS)[number];
export type GameClueId = (typeof GAME_CLUE_IDS)[number];
export type KeySnapDecisionFamilyId = (typeof KEY_SNAP_DECISION_FAMILY_IDS)[number];
export type KeySnapDecisionId = (typeof KEY_SNAP_DECISION_IDS)[number];
export type KeySnapPatternId = (typeof KEY_SNAP_PATTERN_IDS)[number];
export type GameInformationTierId = (typeof GAME_INFORMATION_TIER_IDS)[number];
export type GameParticipationFeedbackId = (typeof GAME_PARTICIPATION_FEEDBACK_IDS)[number];
export type PerformanceGradeBandId = (typeof PERFORMANCE_GRADE_BAND_IDS)[number];
export type GameTuning = DeepReadonly<z.infer<typeof gameTuningSchema>>;
export type GameOpponentProfile = DeepReadonly<z.infer<typeof gameOpponentProfileSchema>>;
export type KeySnapDecisionFamilyDefinition = DeepReadonly<
  z.infer<typeof keySnapDecisionFamilyDefinitionSchema>
>;
export type KeySnapDecisionDefinition = DeepReadonly<
  z.infer<typeof keySnapDecisionDefinitionSchema>
>;
export type GameClueDefinition = DeepReadonly<z.infer<typeof gameClueDefinitionSchema>>;
export type GameParticipationFeedbackDefinition = DeepReadonly<
  z.infer<typeof gameParticipationFeedbackDefinitionSchema>
>;
export type KeySnapPatternDefinition = DeepReadonly<z.infer<typeof keySnapPatternDefinitionSchema>>;
export type GameContent = DeepReadonly<z.infer<typeof gameContentSchema>>;
