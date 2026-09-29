import type {
  WorldAlphaMechanicsDefinition,
  ProgramStrengthBandId,
} from '@project-saturday/game-core';

import { worldAlphaContent } from './world-alpha.js';
import { programMechanicsDefinitions } from './programs.js';

const NIL_STRENGTH_BY_AGGREGATE_TIER = {
  aggregate_tier_peak: 'program_strength_national',
  aggregate_tier_contender: 'program_strength_contender',
  aggregate_tier_competitive: 'program_strength_builder',
  aggregate_tier_building: 'program_strength_builder',
} as const satisfies Record<
  (typeof worldAlphaContent.programProfiles)[number]['aggregateTierId'],
  ProgramStrengthBandId
>;

/** Preserve the original authored bands; added programs use conservative tier-derived exposure. */
export const worldAlphaNilProgramStrengthBands = worldAlphaContent.programProfiles.map(
  (profile) => ({
    programId: profile.id,
    strengthBandId:
      programMechanicsDefinitions.find(({ id }) => id === profile.id)?.strengthBandId ??
      NIL_STRENGTH_BY_AGGREGATE_TIER[profile.aggregateTierId],
  }),
);

/** Projects the validated schema-9 catalog into the staged deterministic 32-program engine. */
export const worldAlphaMechanicsDefinition = {
  id: worldAlphaContent.id,
  groups: worldAlphaContent.groups.map(({ id, programIds }) => ({
    id,
    programIds: [...programIds],
  })),
  programProfiles: worldAlphaContent.programProfiles.map((profile) => ({
    aggregateTierId: profile.aggregateTierId,
    defenseRating: profile.defenseRating,
    groupId: profile.groupId,
    offenseRating: profile.offenseRating,
    positionRatings: { ...profile.positionRatings },
    programId: profile.id,
    rivalProgramId: profile.rivalProgramId,
  })),
  regularSeasonRounds: worldAlphaContent.regularSeasonRounds.map((round) => ({
    fixtures: round.fixtures.map((fixture) => ({ ...fixture })),
    id: round.id,
    roundNumber: round.roundNumber,
  })),
} as const satisfies WorldAlphaMechanicsDefinition;
