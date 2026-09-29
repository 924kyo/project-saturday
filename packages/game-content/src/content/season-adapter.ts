import {
  advanceSeasonCampRound,
  bootstrapNextSeason,
  bootstrapSeason,
  completeCareer,
  completePostseasonRound,
  completeRegularSeasonRound,
  decideOffseason,
  deriveLegacyVisibility,
  enterSeasonReview,
  initializePostseason,
  preparePostseasonGame,
  prepareSeasonGame,
  projectOffseason,
  type CompleteCareerResult,
  type CareerSession,
  type LegacyVisibilityV1,
  type MetaProfileV1,
  type OffseasonProgramMechanicsProfile,
  type ProgramId,
  type SeasonCommandResult,
} from '@project-saturday/game-core';

import { CONTENT_COMPATIBILITY_VERSION } from '../schema/content.js';
import {
  gameTuning,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
} from './games.js';
import {
  offenseStyleMechanicsDefinitions,
  programContent,
  programMechanicsDefinitions,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
} from './programs.js';
import {
  seasonMechanicsDefinition,
  seasonProgramMechanicsProfiles,
  seasonTwoMechanicsDefinition,
} from './seasons.js';
import { skillMechanicsDefinitions } from './skills.js';
import { offFieldMechanicsCatalog } from './off-field.js';
import { developmentWeekConfig, weeklyActionDefinitions } from './weekly-actions.js';

const seasonWeekMechanics = {
  developmentWeekConfig,
  skillDefinitions: skillMechanicsDefinitions,
  weeklyActionDefinitions,
} as const;

const seasonGameMechanics = {
  tuning: gameTuning,
  familyDefinitions: keySnapFamilyMechanicsDefinitions,
  patternDefinitions: keySnapPatternMechanicsDefinitions,
  skillDefinitions: skillMechanicsDefinitions,
  offFieldDefinitions: offFieldMechanicsCatalog,
} as const;

const offenseStyleIds = programContent.offenseStyles.map(({ id }) => id);

export const offseasonProgramMechanicsProfiles: readonly OffseasonProgramMechanicsProfile[] =
  programContent.programs.map((program) => {
    const styleIndex = offenseStyleIds.indexOf(program.offenseStyleId);
    const schemeShiftOffenseStyleId = offenseStyleIds[(styleIndex + 1) % offenseStyleIds.length]!;
    const seasonProfile = seasonProgramMechanicsProfiles.find(
      ({ programId }) => programId === program.id,
    );
    if (styleIndex < 0 || seasonProfile === undefined) {
      throw new TypeError(`Missing offseason mechanics for ${program.id}.`);
    }
    return {
      programId: program.id,
      offenseStyleId: program.offenseStyleId,
      schemeShiftOffenseStyleId,
      rotationPolicyId: program.rotationPolicyId,
      roomTalentMean: program.roomProfile.talentMean,
      programOutlook: seasonProfile.teamRating,
      playerDevelopment: program.ratings.playerDevelopment,
      nilPower: program.ratings.nilPower,
      academics: program.ratings.academics,
    };
  });

const offseasonProjectionMechanics = {
  offFieldDefinitions: offFieldMechanicsCatalog,
  programProfiles: offseasonProgramMechanicsProfiles,
  offenseStyleDefinitions: offenseStyleMechanicsDefinitions,
  rotationPolicyDefinitions: rotationPolicyMechanicsDefinitions,
} as const;

const offseasonDecisionMechanics = {
  ...offseasonProjectionMechanics,
  programDefinitions: programMechanicsDefinitions,
  rosterNamePool: rosterNameMechanicsPool,
} as const;

export function bootstrapShippedSeason(session: CareerSession): SeasonCommandResult {
  return bootstrapSeason(session, seasonMechanicsDefinition);
}

export function bootstrapShippedNextSeason(session: CareerSession): SeasonCommandResult {
  return bootstrapNextSeason(session, seasonTwoMechanicsDefinition);
}

export function advanceShippedCampRound(session: CareerSession): SeasonCommandResult {
  return advanceSeasonCampRound(session, seasonWeekMechanics);
}

export function prepareNextShippedSeasonGame(session: CareerSession): SeasonCommandResult {
  return prepareSeasonGame(session, seasonGameMechanics);
}

export function completeShippedRegularSeasonRound(session: CareerSession): SeasonCommandResult {
  return completeRegularSeasonRound(session, seasonWeekMechanics);
}

export function initializeShippedPostseason(session: CareerSession): SeasonCommandResult {
  return initializePostseason(session);
}

export function prepareNextShippedPostseasonGame(session: CareerSession): SeasonCommandResult {
  return preparePostseasonGame(session, seasonGameMechanics);
}

export function completeShippedPostseasonRound(session: CareerSession): SeasonCommandResult {
  return completePostseasonRound(session, seasonWeekMechanics);
}

export function enterShippedSeasonReview(session: CareerSession): SeasonCommandResult {
  return enterSeasonReview(session);
}

export function projectShippedOffseason(session: CareerSession): SeasonCommandResult {
  return projectOffseason(session, offseasonProjectionMechanics);
}

export function decideShippedOffseason(
  session: CareerSession,
  selectedProgramId: string,
): SeasonCommandResult {
  return decideOffseason(session, selectedProgramId, offseasonDecisionMechanics);
}

export function completeShippedCareer(
  session: CareerSession,
  meta: MetaProfileV1,
): CompleteCareerResult {
  return completeCareer(session, meta, CONTENT_COMPATIBILITY_VERSION);
}

export function deriveShippedLegacyVisibility(
  meta: MetaProfileV1,
  programId: ProgramId,
): LegacyVisibilityV1 {
  return deriveLegacyVisibility(meta, programId);
}
