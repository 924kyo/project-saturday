import { z } from 'zod';

import { programIdSchema } from './programs.js';
import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';

export const SEASON_MODEL_IDS = ['season_v1'] as const;

export const CAMP_ROUND_IDS = [
  'season_camp_install',
  'season_camp_competition',
  'season_camp_dress_rehearsal',
] as const;

export const REGULAR_SEASON_ROUND_IDS = [
  'season_round_01',
  'season_round_02',
  'season_round_03',
  'season_round_04',
  'season_round_05',
  'season_round_06',
  'season_round_07',
  'season_round_08',
  'season_round_09',
  'season_round_10',
  'season_round_11',
  'season_round_12',
] as const;

export const POSTSEASON_ROUND_IDS = [
  'postseason_round_semifinal',
  'postseason_round_final',
] as const;

export const SEASON_OUTCOME_IDS = [
  'season_outcome_champion',
  'season_outcome_runner_up',
  'season_outcome_semifinal_exit',
  'season_outcome_regular_season_complete',
] as const;

export const STANDINGS_TIEBREAKER_IDS = [
  'standings_tiebreak_wins',
  'standings_tiebreak_head_to_head',
  'standings_tiebreak_schedule_strength',
  'standings_tiebreak_program_id',
] as const;

export const seasonModelIdSchema = z.enum(SEASON_MODEL_IDS);
export const campRoundIdSchema = z.enum(CAMP_ROUND_IDS);
export const regularSeasonRoundIdSchema = z.enum(REGULAR_SEASON_ROUND_IDS);
export const postseasonRoundIdSchema = z.enum(POSTSEASON_ROUND_IDS);
export const seasonOutcomeIdSchema = z.enum(SEASON_OUTCOME_IDS);
export const standingsTiebreakerIdSchema = z.enum(STANDINGS_TIEBREAKER_IDS);

const localizedFields = {
  descriptionKey: messageKeyFormatSchema,
  nameKey: messageKeyFormatSchema,
} as const;

export const campRoundDefinitionSchema = z
  .object({
    ...localizedFields,
    id: campRoundIdSchema,
    kind: z.literal('camp_round'),
    sequence: z.number().int().min(1).max(CAMP_ROUND_IDS.length),
  })
  .strict();

export const seasonFixtureDefinitionSchema = z
  .object({
    awayProgramId: programIdSchema,
    homeProgramId: programIdSchema,
    id: stableContentIdSchema,
    spotlight: z.boolean(),
  })
  .strict()
  .refine((fixture) => fixture.homeProgramId !== fixture.awayProgramId, {
    message: 'A season fixture cannot pair a program with itself.',
    path: ['awayProgramId'],
  });

export const regularSeasonRoundDefinitionSchema = z
  .object({
    ...localizedFields,
    fixtures: z.array(seasonFixtureDefinitionSchema).length(6),
    id: regularSeasonRoundIdSchema,
    kind: z.literal('regular_season_round'),
    weekNumber: z.number().int().min(1).max(REGULAR_SEASON_ROUND_IDS.length),
  })
  .strict();

export const seasonProgramProfileSchema = z
  .object({
    programId: programIdSchema,
    scheduleStrength: z.number().int().min(0).max(100),
    teamRating: z.number().int().min(0).max(100),
  })
  .strict();

export const standingsTuningSchema = z
  .object({
    explanationKey: messageKeyFormatSchema,
    tiebreakOrder: z.tuple([
      z.literal(STANDINGS_TIEBREAKER_IDS[0]),
      z.literal(STANDINGS_TIEBREAKER_IDS[1]),
      z.literal(STANDINGS_TIEBREAKER_IDS[2]),
      z.literal(STANDINGS_TIEBREAKER_IDS[3]),
    ]),
  })
  .strict();

export const postseasonSeedMatchupSchema = z
  .object({
    awaySeed: z.number().int().min(1).max(4),
    homeSeed: z.number().int().min(1).max(4),
  })
  .strict()
  .refine((matchup) => matchup.homeSeed !== matchup.awaySeed, {
    message: 'A postseason seed cannot play itself.',
  });

export const postseasonRoundDefinitionSchema = z
  .object({
    ...localizedFields,
    gameCount: z.number().int().min(1).max(2),
    id: postseasonRoundIdSchema,
    kind: z.literal('postseason_round'),
  })
  .strict();

export const seasonOutcomeDefinitionSchema = z
  .object({
    ...localizedFields,
    id: seasonOutcomeIdSchema,
    kind: z.literal('season_outcome'),
    maximumFinish: z.number().int().min(1).max(12),
    minimumFinish: z.number().int().min(1).max(12),
  })
  .strict()
  .refine((outcome) => outcome.minimumFinish <= outcome.maximumFinish, {
    message: 'Season outcome finish bounds must be ordered.',
    path: ['maximumFinish'],
  });

export const postseasonConfigSchema = z
  .object({
    outcomes: z.tuple([
      seasonOutcomeDefinitionSchema.safeExtend({ id: z.literal(SEASON_OUTCOME_IDS[0]) }),
      seasonOutcomeDefinitionSchema.safeExtend({ id: z.literal(SEASON_OUTCOME_IDS[1]) }),
      seasonOutcomeDefinitionSchema.safeExtend({ id: z.literal(SEASON_OUTCOME_IDS[2]) }),
      seasonOutcomeDefinitionSchema.safeExtend({ id: z.literal(SEASON_OUTCOME_IDS[3]) }),
    ]),
    qualifierCount: z.literal(4),
    rounds: z.tuple([
      postseasonRoundDefinitionSchema.extend({
        gameCount: z.literal(2),
        id: z.literal(POSTSEASON_ROUND_IDS[0]),
      }),
      postseasonRoundDefinitionSchema.extend({
        gameCount: z.literal(1),
        id: z.literal(POSTSEASON_ROUND_IDS[1]),
      }),
    ]),
    semifinalMatchups: z.tuple([
      postseasonSeedMatchupSchema.safeExtend({
        awaySeed: z.literal(4),
        homeSeed: z.literal(1),
      }),
      postseasonSeedMatchupSchema.safeExtend({
        awaySeed: z.literal(3),
        homeSeed: z.literal(2),
      }),
    ]),
  })
  .strict();

export const seasonContentSchema = z
  .object({
    ...localizedFields,
    campRounds: z.tuple([
      campRoundDefinitionSchema.extend({
        id: z.literal(CAMP_ROUND_IDS[0]),
        sequence: z.literal(1),
      }),
      campRoundDefinitionSchema.extend({
        id: z.literal(CAMP_ROUND_IDS[1]),
        sequence: z.literal(2),
      }),
      campRoundDefinitionSchema.extend({
        id: z.literal(CAMP_ROUND_IDS[2]),
        sequence: z.literal(3),
      }),
    ]),
    id: z.literal('season_wr_vertical_slice_v1'),
    kind: z.literal('season'),
    model: seasonModelIdSchema,
    postseason: postseasonConfigSchema,
    programProfiles: z.array(seasonProgramProfileSchema).length(12),
    regularSeasonRounds: z.array(regularSeasonRoundDefinitionSchema).length(12),
    standings: standingsTuningSchema,
  })
  .strict();

export type CampRoundDefinition = Readonly<z.infer<typeof campRoundDefinitionSchema>>;
export type PostseasonConfig = Readonly<z.infer<typeof postseasonConfigSchema>>;
export type PostseasonRoundDefinition = Readonly<z.infer<typeof postseasonRoundDefinitionSchema>>;
export type RegularSeasonRoundDefinition = Readonly<
  z.infer<typeof regularSeasonRoundDefinitionSchema>
>;
export type SeasonContent = Readonly<z.infer<typeof seasonContentSchema>>;
export type SeasonFixtureDefinition = Readonly<z.infer<typeof seasonFixtureDefinitionSchema>>;
export type SeasonModelId = Readonly<z.infer<typeof seasonModelIdSchema>>;
export type SeasonOutcomeDefinition = Readonly<z.infer<typeof seasonOutcomeDefinitionSchema>>;
export type SeasonOutcomeId = Readonly<z.infer<typeof seasonOutcomeIdSchema>>;
export type SeasonProgramProfile = Readonly<z.infer<typeof seasonProgramProfileSchema>>;
export type StandingsTiebreakerId = Readonly<z.infer<typeof standingsTiebreakerIdSchema>>;
