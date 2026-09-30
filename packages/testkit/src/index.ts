export {
  SeededScenarioExecutionError,
  formatScenarioReproduction,
  runSeededScenario,
} from './scenario.js';
export type {
  SeededScenarioDefinition,
  SeededScenarioReport,
  ScenarioReproduction,
} from './scenario.js';
export { WrCareerFixtureError, createWrCareerFixture } from './builders/wr-career.js';
export type { WrCareerFixtureErrorStage, WrCareerFixtureOptions } from './builders/wr-career.js';
export { executePositionAlphaCareer } from './builders/position-alpha-career.js';
export type {
  AddedAlphaPositionId,
  ExecutePositionAlphaCareerInput,
  ExecutedPositionAlphaCareer,
  PositionDecisionStrategy,
  PositionOffseasonPolicy,
} from './builders/position-alpha-career.js';
export {
  WrProgramCareerBuilderError,
  createEnrolledWrCareerFixture,
  executeWrProgramDevelopmentWeek,
} from './builders/wr-program-career.js';
export {
  WrGameCareerBuilderError,
  advanceCompletedWrGameWeek,
  completeCurrentProgramPracticeWeek,
  executeWrShippedGame,
} from './builders/wr-game-career.js';
export { WrSeasonCareerBuilderError, executeWrSeasonCareer } from './builders/wr-season-career.js';
export {
  WrOffFieldCareerBuilderError,
  executeWrOffFieldCareer,
  relationshipTrackValue,
} from './builders/wr-off-field-career.js';
export type {
  ExecuteWrOffFieldCareerInput,
  ExecutedWrOffFieldCareer,
  M6OperationProfileSample,
  M6ProfileOperationId,
  NilDecisionPolicy,
  OffFieldCareerSerializationMode,
  OffseasonChoicePolicy,
  WrOffFieldWeekTrace,
} from './builders/wr-off-field-career.js';
export type {
  ExecuteWrSeasonCareerInput,
  ExecutedWrSeasonCareer,
  SeasonCareerSerializationMode,
  SeasonEventChoicePolicy,
  SeasonInjuryChoicePolicy,
  SeasonProgramSelectionPolicy,
  SeasonSkillChoicePolicy,
  WrSeasonWeekTrace,
} from './builders/wr-season-career.js';
export type {
  AdvanceCompletedWrGameWeekInput,
  AdvancedCompletedWrGameWeek,
  CompleteCurrentProgramPracticeWeekInput,
  CompletedCurrentProgramPracticeWeek,
  CurrentProgramWeeklyActionPlan,
  ExecuteWrShippedGameInput,
  ExecutedWrShippedGame,
  GameCareerSerializationMode,
  GameDecisionStrategyId,
  WrGameDecisionTrace,
} from './builders/wr-game-career.js';
export type {
  CreateEnrolledWrCareerFixtureInput,
  EnrolledWrCareerFixture,
  ExecuteWrProgramDevelopmentWeekInput,
  ExecutedWrProgramDevelopmentWeek,
  ProgramCareerSerializationMode,
  ProgramWeeklyActionPlan,
} from './builders/wr-program-career.js';
export {
  WrSkillCareerBuilderError,
  executeWrSkillDevelopmentWeek,
  selectPreferredOfferedSkill,
} from './builders/wr-skill-career.js';
export type {
  ExecuteWrSkillDevelopmentWeekInput,
  ExecutedSkillBreakthrough,
  ExecutedWrSkillDevelopmentWeek,
  SkillAwareWeeklyActionPlan,
  SkillCareerSerializationMode,
  SkillChoiceContext,
  SkillChoicePolicy,
} from './builders/wr-skill-career.js';
export {
  DevelopmentWeekSimulationError,
  simulateDevelopmentWeeks,
} from './simulations/development-week.js';
export type {
  CareerSerializationMode,
  DevelopmentWeekSimulationInput,
  DevelopmentWeekSimulationReport,
  DevelopmentWeekTrace,
  WeeklyActionPlan,
} from './simulations/development-week.js';
export {
  M1_DEVELOPMENT_SCENARIOS,
  M1_DEVELOPMENT_SIMULATION_REPORT_ID,
  M1_DEVELOPMENT_SIMULATION_SEEDS,
  M1_WR_AVAILABLE_ACTION_IDS,
  formatM1DevelopmentSimulationReport,
  reproductionForM1DevelopmentScenario,
  runM1DevelopmentSimulationReport,
} from './simulations/m1-development.js';
export type {
  M1DevelopmentScenarioDefinition,
  M1DevelopmentScenarioReport,
  M1DevelopmentSimulationReport,
  M1DevelopmentSimulationReportOptions,
  NumericRangeReport,
} from './simulations/m1-development.js';
export {
  M2_CONTROLLED_BUILD_SEED,
  M2_OFFER_STRATEGIES,
  M2_SKILL_FAMILY_IDS,
  M2_SKILL_IDS,
  M2_SKILL_BUILD_REPORT_ID,
  M2_SKILL_OFFER_SEEDS,
  formatM2SkillBuildReport,
  runM2SkillBuildReport,
} from './simulations/m2-skill-build.js';
export {
  M3_5_SKILL_ECOLOGY_REPORT_ID,
  M3_5_SKILL_ECOLOGY_SEED,
  M3_5_SKILL_ECOLOGY_WEEK_COUNT,
  M3_5_SKILL_STRATEGIES,
  formatM3_5SkillEcologyReport,
  runM3_5SkillEcologyReport,
} from './simulations/m3-5-skill-ecology.js';
export type {
  M3_5SkillEcologyReport,
  M3_5SkillStrategyDefinition,
  M3_5SkillStrategyId,
  M3_5SkillStrategyReport,
} from './simulations/m3-5-skill-ecology.js';
export {
  M3_DEPTH_PROFILES,
  M3_DEPTH_REPORT_ID,
  M3_DEPTH_SEEDS,
  M3_DEPTH_STRATEGIES,
  M3_DEPTH_WEEK_COUNT,
  formatM3DepthReport,
  runM3DepthReport,
} from './simulations/m3-depth.js';
export {
  M4_GAME_REPORT_ID,
  M4_GAME_SCENARIOS,
  M4_GAME_SEEDS,
  M4_GAME_WEEK_COUNT,
  formatM4GameReport,
  runM4GameReport,
} from './simulations/m4-game.js';
export {
  M5_PRIOR_REPORT_SHA256,
  M5_SEASON_REPORT_ID,
  M5_SEASON_SCENARIOS,
  formatM5SeasonReport,
  runM5SeasonReport,
} from './simulations/m5-season.js';
export {
  M6_OFF_FIELD_SCENARIOS,
  M6_OFF_FIELD_TRANSFER_REPORT_ID,
  M6_PRIOR_REPORT_SHA256,
  formatM6OffFieldTransferReport,
  runM6OffFieldTransferReport,
} from './simulations/m6-off-field-transfer.js';
export {
  M7_FOUR_POSITION_REPORT_ID,
  M7_POSITION_SCENARIOS,
  M7_PRIOR_REPORT_SHA256,
  formatM7FourPositionReport,
  runM7FourPositionReport,
} from './simulations/m7-four-position.js';
export type {
  M7FourPositionReport,
  M7PositionSampleReport,
  M7PositionScenarioDefinition,
  M7SegmentCount,
} from './simulations/m7-four-position.js';
export {
  M7_5_ROSTER_SEEDS,
  formatM7_5RosterIdentityReport,
  runM7_5RosterIdentityReport,
} from './simulations/m7-5-roster-identity.js';
export type {
  M7_5RosterIdentityReport,
  RosterIdentitySample,
} from './simulations/m7-5-roster-identity.js';
export type {
  M6AcademicRiskId,
  M6OffFieldSampleReport,
  M6OffFieldScenarioDefinition,
  M6OffFieldTransferReport,
  M6RelationshipDirectionId,
  M6RelationshipDirectionReport,
  M6RelationshipStrategyId,
  M6SegmentCount,
} from './simulations/m6-off-field-transfer.js';
export type {
  M5SeasonReport,
  M5SeasonSampleReport,
  M5SeasonScenarioDefinition,
  M5SeasonSegmentCount,
} from './simulations/m5-season.js';
export type {
  M4BodyBandId,
  M4GameDecisionReport,
  M4GameReport,
  M4GameSampleReport,
  M4GameScenarioDefinition,
  M4GameSegmentCount,
  M4GameWeekReport,
  M4IqBandId,
} from './simulations/m4-game.js';
export type {
  M3DepthMovementReport,
  M3DepthOscillationPair,
  M3DepthProfileDefinition,
  M3DepthReport,
  M3DepthSampleReport,
  M3DepthSegmentCount,
  M3DepthStrategyDefinition,
} from './simulations/m3-depth.js';
export type {
  ControlledBuildVariantReport,
  CountRatePermille,
  M2AffinityDirectionReport,
  M2ControlledBuildReport,
  M2OfferSampleReport,
  M2OfferStrategyDefinition,
  M2OfferStrategyId,
  M2OfferStrategyReport,
  M2SkillBuildReport,
} from './simulations/m2-skill-build.js';
export {
  formatM10BalanceReport,
  M10_BALANCE_POSITIONS,
  M10_BALANCE_SEEDS,
  M10_BALANCE_STRATEGIES,
  runM10BalanceCareer,
  runM10BalanceReport,
  type M10BalanceCareer,
  type M10BalanceSummary,
} from './simulations/m10-balance.js';
