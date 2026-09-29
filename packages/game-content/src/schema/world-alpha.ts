import { z } from 'zod';

import { messageKeyFormatSchema, stableContentIdSchema } from './primitives.js';
import { PROGRAM_IDS } from './programs.js';

export const STAGED_PROGRAM_IDS = [
  'program_amber_coast',
  'program_ashgrove_state',
  'program_blue_ridge_institute',
  'program_copperfield',
  'program_delta_vale',
  'program_eastern_pines',
  'program_fairwind',
  'program_frostline_state',
  'program_granite_harbor',
  'program_juniper_plains',
  'program_kingsport_technical',
  'program_lantern_city',
  'program_marshland_a_and_m',
  'program_oak_river',
  'program_palisade',
  'program_quartz_hill',
  'program_rivergate',
  'program_sagebrush_university',
  'program_tidewater_polytechnic',
  'program_western_orchard',
] as const;

export const WORLD_ALPHA_PROGRAM_IDS = [...PROGRAM_IDS, ...STAGED_PROGRAM_IDS] as const;

export const WORLD_ALPHA_GROUP_IDS = [
  'world_group_foundry',
  'world_group_horizon',
  'world_group_lakes',
  'world_group_summit',
] as const;

export const WORLD_ALPHA_AGGREGATE_TIER_IDS = [
  'aggregate_tier_peak',
  'aggregate_tier_contender',
  'aggregate_tier_competitive',
  'aggregate_tier_building',
] as const;

export const WORLD_ALPHA_ROUND_IDS = [
  'world_alpha_round_01',
  'world_alpha_round_02',
  'world_alpha_round_03',
  'world_alpha_round_04',
  'world_alpha_round_05',
  'world_alpha_round_06',
  'world_alpha_round_07',
  'world_alpha_round_08',
  'world_alpha_round_09',
  'world_alpha_round_10',
  'world_alpha_round_11',
  'world_alpha_round_12',
] as const;

export const worldAlphaProgramIdSchema = z.enum(WORLD_ALPHA_PROGRAM_IDS);
export const stagedProgramIdSchema = z.enum(STAGED_PROGRAM_IDS);
export const worldAlphaGroupIdSchema = z.enum(WORLD_ALPHA_GROUP_IDS);
export const worldAlphaAggregateTierIdSchema = z.enum(WORLD_ALPHA_AGGREGATE_TIER_IDS);
export const worldAlphaRoundIdSchema = z.enum(WORLD_ALPHA_ROUND_IDS);

const localizedFields = {
  descriptionKey: messageKeyFormatSchema,
  nameKey: messageKeyFormatSchema,
} as const;

export const worldAlphaGroupDefinitionSchema = z
  .object({
    ...localizedFields,
    id: worldAlphaGroupIdSchema,
    programIds: z.array(worldAlphaProgramIdSchema).length(8),
  })
  .strict();

export const stagedProgramDefinitionSchema = z
  .object({
    ...localizedFields,
    id: stagedProgramIdSchema,
    shortNameKey: messageKeyFormatSchema,
  })
  .strict();

export const worldAlphaProgramProfileSchema = z
  .object({
    aggregateTierId: worldAlphaAggregateTierIdSchema,
    defenseRating: z.number().int().min(35).max(95),
    groupId: worldAlphaGroupIdSchema,
    id: worldAlphaProgramIdSchema,
    offenseRating: z.number().int().min(35).max(95),
    positionRatings: z
      .object({
        position_cb: z.number().int().min(35).max(95),
        position_edge: z.number().int().min(35).max(95),
        position_lb: z.number().int().min(35).max(95),
        position_qb: z.number().int().min(35).max(95),
        position_rb: z.number().int().min(35).max(95),
        position_wr: z.number().int().min(35).max(95),
      })
      .strict(),
    qbRating: z.number().int().min(35).max(95),
    rivalProgramId: worldAlphaProgramIdSchema,
  })
  .strict()
  .refine((profile) => profile.id !== profile.rivalProgramId, {
    message: 'A program cannot rival itself.',
    path: ['rivalProgramId'],
  })
  .refine((profile) => profile.qbRating === profile.positionRatings.position_qb, {
    message: 'Legacy QB rating must equal the position-owned QB rating.',
    path: ['positionRatings', 'position_qb'],
  });

export const worldAlphaFixtureSchema = z
  .object({
    awayProgramId: worldAlphaProgramIdSchema,
    homeProgramId: worldAlphaProgramIdSchema,
    id: stableContentIdSchema.refine((id) => id.startsWith('world_alpha_fixture_'), {
      message: 'World-alpha fixtures must use the world_alpha_fixture_ namespace.',
    }),
  })
  .strict()
  .refine((fixture) => fixture.awayProgramId !== fixture.homeProgramId, {
    message: 'A program cannot play itself.',
  });

export const worldAlphaRoundSchema = z
  .object({
    fixtures: z.array(worldAlphaFixtureSchema).length(16),
    id: worldAlphaRoundIdSchema,
    roundNumber: z.number().int().min(1).max(12),
  })
  .strict();

function hasExactIds(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
}

export const worldAlphaContentSchema = z
  .object({
    descriptionKey: messageKeyFormatSchema,
    groups: z.array(worldAlphaGroupDefinitionSchema).length(4),
    id: z.literal('world_alpha_32_program'),
    nameKey: messageKeyFormatSchema,
    programProfiles: z.array(worldAlphaProgramProfileSchema).length(32),
    regularSeasonRounds: z.array(worldAlphaRoundSchema).length(12),
    stagedPrograms: z.array(stagedProgramDefinitionSchema).length(20),
  })
  .strict()
  .superRefine((content, context) => {
    if (
      !hasExactIds(
        content.groups.map(({ id }) => id),
        WORLD_ALPHA_GROUP_IDS,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Groups must use canonical ID order.',
        path: ['groups'],
      });
    }
    if (
      !hasExactIds(
        content.stagedPrograms.map(({ id }) => id),
        STAGED_PROGRAM_IDS,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Staged programs must use canonical ID order.',
        path: ['stagedPrograms'],
      });
    }
    if (
      !hasExactIds(
        content.programProfiles.map(({ id }) => id),
        WORLD_ALPHA_PROGRAM_IDS,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Program profiles must use canonical ID order.',
        path: ['programProfiles'],
      });
    }
    if (
      !hasExactIds(
        content.regularSeasonRounds.map(({ id }) => id),
        WORLD_ALPHA_ROUND_IDS,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Rounds must use canonical ID order.',
        path: ['regularSeasonRounds'],
      });
    }

    const groupByProgram = new Map<string, string>();
    for (const [groupIndex, group] of content.groups.entries()) {
      if (new Set(group.programIds).size !== 8) {
        context.addIssue({
          code: 'custom',
          message: 'Each group must contain eight unique programs.',
          path: ['groups', groupIndex, 'programIds'],
        });
      }
      for (const programId of group.programIds) {
        if (groupByProgram.has(programId)) {
          context.addIssue({
            code: 'custom',
            message: `${programId} appears in more than one group.`,
            path: ['groups', groupIndex, 'programIds'],
          });
        }
        groupByProgram.set(programId, group.id);
      }
    }
    if (groupByProgram.size !== 32) {
      context.addIssue({
        code: 'custom',
        message: 'Groups must cover all 32 programs.',
        path: ['groups'],
      });
    }

    const profileById = new Map(content.programProfiles.map((profile) => [profile.id, profile]));
    for (const [index, profile] of content.programProfiles.entries()) {
      if (groupByProgram.get(profile.id) !== profile.groupId) {
        context.addIssue({
          code: 'custom',
          message: `${profile.id} profile must match its authored group.`,
          path: ['programProfiles', index, 'groupId'],
        });
      }
      const rival = profileById.get(profile.rivalProgramId);
      if (rival?.rivalProgramId !== profile.id) {
        context.addIssue({
          code: 'custom',
          message: `${profile.id} rivalry must be reciprocal.`,
          path: ['programProfiles', index, 'rivalProgramId'],
        });
      }
    }

    const opponentsByProgram = new Map(
      WORLD_ALPHA_PROGRAM_IDS.map((programId) => [programId, [] as string[]]),
    );
    const fixtureIds = new Set<string>();
    for (const [roundIndex, round] of content.regularSeasonRounds.entries()) {
      if (round.roundNumber !== roundIndex + 1) {
        context.addIssue({
          code: 'custom',
          message: 'Round numbers must remain canonical.',
          path: ['regularSeasonRounds', roundIndex, 'roundNumber'],
        });
      }
      const appearances = new Set<string>();
      for (const [fixtureIndex, fixture] of round.fixtures.entries()) {
        if (fixtureIds.has(fixture.id)) {
          context.addIssue({
            code: 'custom',
            message: 'Fixture IDs must be globally unique.',
            path: ['regularSeasonRounds', roundIndex, 'fixtures', fixtureIndex, 'id'],
          });
        }
        fixtureIds.add(fixture.id);
        for (const programId of [fixture.homeProgramId, fixture.awayProgramId]) {
          if (appearances.has(programId)) {
            context.addIssue({
              code: 'custom',
              message: `${programId} appears more than once in a round.`,
              path: ['regularSeasonRounds', roundIndex, 'fixtures'],
            });
          }
          appearances.add(programId);
        }
        opponentsByProgram.get(fixture.homeProgramId)?.push(fixture.awayProgramId);
        opponentsByProgram.get(fixture.awayProgramId)?.push(fixture.homeProgramId);
        const sameGroup =
          groupByProgram.get(fixture.homeProgramId) === groupByProgram.get(fixture.awayProgramId);
        if (roundIndex < 7 !== sameGroup) {
          context.addIssue({
            code: 'custom',
            message: 'Rounds 1-7 must be same-group and rounds 8-12 cross-group.',
            path: ['regularSeasonRounds', roundIndex, 'fixtures', fixtureIndex],
          });
        }
      }
      if (appearances.size !== 32) {
        context.addIssue({
          code: 'custom',
          message: 'Every round must schedule every program exactly once.',
          path: ['regularSeasonRounds', roundIndex, 'fixtures'],
        });
      }
    }

    for (const [programId, opponents] of opponentsByProgram) {
      if (opponents.length !== 12 || new Set(opponents).size !== 12) {
        context.addIssue({
          code: 'custom',
          message: `${programId} must have 12 unique opponents.`,
          path: ['regularSeasonRounds'],
        });
      }
      const sameGroupCount = opponents.filter(
        (opponentId) => groupByProgram.get(opponentId) === groupByProgram.get(programId),
      ).length;
      if (sameGroupCount !== 7) {
        context.addIssue({
          code: 'custom',
          message: `${programId} must have exactly seven same-group opponents.`,
          path: ['regularSeasonRounds'],
        });
      }
    }
  });

type DeepReadonly<T> = T extends readonly (infer TItem)[]
  ? readonly DeepReadonly<TItem>[]
  : T extends object
    ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
    : T;

export type WorldAlphaContent = DeepReadonly<z.infer<typeof worldAlphaContentSchema>>;
