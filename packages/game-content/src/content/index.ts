export { appearanceCatalog, defaultWrAppearance, wrBodyMeasurementOptions } from './appearance.js';
export {
  buildWrCreationMechanics,
  defaultWrCreationIdentity,
  type BuildWrCreationMechanicsInput,
  type BuildWrCreationMechanicsIssue,
  type BuildWrCreationMechanicsIssueCode,
  type BuildWrCreationMechanicsResult,
} from './creation-mechanics.js';
export {
  offenseStyleMechanicsDefinitions,
  programContent,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
} from './programs.js';
export { creationContent, isCompatiblePersonalitySelection } from './creation.js';
export {
  gameContent,
  gameOpponentMechanicsProfiles,
  gameTuning,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
} from './games.js';
export {
  prepareNextShippedGame,
  resolveShippedKeySnap,
  selectNextGameProfiles,
  startShippedGame,
  type NextGameProfiles,
} from './game-adapter.js';
export { contentManifest } from './manifest.js';
export { eventContent, eventMechanicsDefinitions, eventSelectionTuning } from './events.js';
export {
  deriveShippedEventContextTagIds,
  resolveShippedEventChoice,
  selectShippedWeeklyEvent,
  type EventSessionCommandResult,
} from './event-adapter.js';
export {
  assessShippedWeeklyInjury,
  resolveShippedInjuryChoice,
  type InjurySessionCommandResult,
} from './injury-adapter.js';
export { injuryContent, injuryOutcomeMechanicsDefinitions, injuryTuning } from './injuries.js';
export { offFieldContent, offFieldMechanicsCatalog } from './off-field.js';
export { positionAlphaContent } from './positions.js';
export {
  buildPositionCreationMechanics,
  positionCreationArchetypeIds,
  positionCreationPersonalityIds,
  type BuildPositionCreationMechanicsInput,
  type BuildPositionCreationMechanicsIssue,
  type BuildPositionCreationMechanicsIssueCode,
  type BuildPositionCreationMechanicsResult,
} from './position-creation-mechanics.js';
export {
  buildPositionRoomMechanics,
  positionRoomMechanicsPositionIds,
} from './position-room-mechanics.js';
export { positionLifecycleMechanics } from './position-lifecycle-mechanics.js';
export {
  buildShippedPositionAlphaSessionFoundation,
  buildShippedPositionAlphaSessionCommandMechanics,
  chooseShippedPositionAlphaSkill,
  commitShippedPositionAlphaOffseason,
  createShippedPositionAlphaSession,
  parseShippedPositionAlphaSessionJson,
  createShippedPositionAlphaSessionV2,
  parseShippedPositionAlphaSessionV2Json,
  serializeShippedPositionAlphaSessionV2Json,
  parseShippedPositionAlphaSessionV3Json,
  serializeShippedPositionAlphaSessionV3Json,
  equipShippedPositionAlphaSkill,
  resolveShippedPositionAlphaWeek,
  resolveShippedPositionAlphaSeason,
  resolveShippedPositionAlphaEvent,
  type ShippedPositionAlphaSessionResult,
} from './position-alpha-session.js';
export { worldAlphaContent } from './world-alpha.js';
export {
  qbAlphaContent,
  qbAlphaDecisions,
  qbAlphaEvents,
  qbAlphaPatterns,
  qbAlphaSkills,
} from './qb-alpha.js';
export {
  rbAlphaContent,
  rbAlphaDecisions,
  rbAlphaEvents,
  rbAlphaPatterns,
  rbAlphaSkills,
} from './rb-alpha.js';
export {
  cbAlphaContent,
  cbAlphaDecisions,
  cbAlphaEvents,
  cbAlphaPatterns,
  cbAlphaSkills,
} from './cb-alpha.js';
export { worldAlphaMechanicsDefinition } from './world-alpha-mechanics.js';
export {
  bootstrapShippedOffFieldSystems,
  attemptShippedWeeklyNilOffer,
  decideShippedNilOffer,
  deriveShippedOffFieldWeekProjection,
  expireShippedNilOffers,
  resolveShippedAcademicCheckpoint,
  resolveShippedNilObligation,
  resolveShippedWeeklyRelationships,
  settleShippedCompletedWeekOffField,
  prepareShippedOffFieldPlanningBoundary,
  selectShippedNilOffer,
  type OffFieldSessionCommandResult,
  type ShippedOffFieldWeekProjection,
} from './off-field-adapter.js';
export {
  seasonContent,
  seasonMechanicsDefinition,
  seasonProgramMechanicsProfiles,
  seasonSchedule,
  seasonTwoMechanicsDefinition,
} from './seasons.js';
export {
  advanceShippedCampRound,
  bootstrapShippedNextSeason,
  bootstrapShippedSeason,
  completeShippedCareer,
  completeShippedPostseasonRound,
  completeShippedRegularSeasonRound,
  deriveShippedLegacyVisibility,
  decideShippedOffseason,
  enterShippedSeasonReview,
  initializeShippedPostseason,
  offseasonProgramMechanicsProfiles,
  prepareNextShippedPostseasonGame,
  prepareNextShippedSeasonGame,
  projectShippedOffseason,
} from './season-adapter.js';
export { skillMechanicsDefinitions, skills } from './skills.js';
export {
  developmentWeekConfig,
  getAvailableWeeklyActionEntries,
  weeklyActionDefinitions,
  weeklyActions,
  type AvailableWeeklyActionEntry,
} from './weekly-actions.js';
export { positionFocusInjuryPolicies, positionCommonFocusDefinitions } from './position-focus.js';
export { positionSkillBuilds, positionSkillActionTags } from './position-skill-builds.js';
export { isValidShippedWrSession, shippedWrTacticalMechanicsV1 } from './wr-tactical-mechanics.js';
export {
  buildCareerVNextMechanics,
  programIdentitiesVNext,
  programIdentityVNext,
  type ProgramIdentityVNext,
} from './vnext.js';
export { defenderCatalog, edgeContent, lbContent, type DefenderContent } from './defenders.js';
export {
  addedPrograms96VNext,
  addedProgramsVNext,
  conferenceIdentitiesVNext,
  conferenceIdentityVNext,
  worldVNext96MechanicsDefinition,
  worldVNextMechanicsDefinition,
} from './world-vnext.js';
export { lifeEventContent, lifeEventMechanics } from './life-events.js';
