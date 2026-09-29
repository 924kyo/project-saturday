import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import {
  contentManifest,
  programMechanicsDefinitions,
  skillMechanicsDefinitions,
} from '@project-saturday/game-content/content';
import type {
  AlumniRecordV1,
  DepthRoleId,
  EventChoiceId,
  EventId,
  InjuryAvailabilityId,
  InjuryChoiceId,
  InjuryOutcomeId,
  ProgramId,
  ProgramStrengthBandId,
  RecruitTierId,
  RngSeed,
  SeasonOutcomeId,
  SkillFamilyId,
  SkillId,
  WrGameStatLine,
  WrArchetypeId,
  RecruitingBackgroundId,
} from '@project-saturday/game-core';

import {
  executeWrSeasonCareer,
  type SeasonEventChoicePolicy,
  type SeasonInjuryChoicePolicy,
  type SeasonProgramSelectionPolicy,
  type SeasonSkillChoicePolicy,
  type WrSeasonWeekTrace,
} from '../builders/wr-season-career.js';
import type {
  CurrentProgramWeeklyActionPlan,
  GameDecisionStrategyId,
} from '../builders/wr-game-career.js';
import { formatScenarioReproduction } from '../scenario.js';

export const M5_SEASON_REPORT_ID = 'm5_season_vertical_slice_v1' as const;

export const M5_PRIOR_REPORT_SHA256 = Object.freeze({
  'm1-development-baseline.jsonl':
    '0c12fa5e6ac2543769dd094260c9978993eb978d771c14162cd2d08011d4f909',
  'm2-skill-build-baseline.jsonl':
    '0357b8ee1a4ae9417bfb5fe9e2165055fda32c0bd73c2ea7f072e231b489962d',
  'm3-5-skill-ecology.jsonl': '56e7006f0c6f64d9cc3d3a8bf845957889ac6881a25d2d694a2cf14cff8d18de',
  'm3-depth-baseline.jsonl': '3cb3881b9b4d24c096f7dfb2e3d2f0c0394554a9fbc43d8185deeef7b5de5256',
  'm4-game-baseline.jsonl': 'b4e4a43d86ed2d7ac8c538160c156bdfe54d22193f94a284b26cdfcad694bb11',
} as const);

export interface M5SeasonScenarioDefinition {
  readonly scenarioProfileId: string;
  readonly seed: RngSeed;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly programSelectionPolicy: SeasonProgramSelectionPolicy;
  readonly selectedProgramId?: ProgramId;
  readonly weeklyStrategyId: string;
  readonly actionPlan: CurrentProgramWeeklyActionPlan;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly eventChoicePolicy: SeasonEventChoicePolicy;
  readonly injuryChoicePolicy: SeasonInjuryChoicePolicy;
  readonly skillChoicePolicy: SeasonSkillChoicePolicy;
  readonly skillBuildId: string;
  readonly preferredSkillFamilyIds: readonly SkillFamilyId[];
}

export const M5_SEASON_SCENARIOS = Object.freeze([
  {
    scenarioProfileId: 'national_deep_qualifier_development',
    seed: 'season-career-close-1',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_blue_chip_star',
    programSelectionPolicy: 'strongest_offer',
    weeklyStrategyId: 'weekly_strategy_recovery_route',
    actionPlan: ['action_recovery', 'action_film_study', 'action_route_drills'],
    decisionStrategyId: 'best_fit',
    eventChoicePolicy: 'alternate',
    injuryChoicePolicy: 'play_limited',
    skillChoicePolicy: 'preferred_family',
    skillBuildId: 'skill_build_development_first',
    preferredSkillFamilyIds: [
      'skill_family_development',
      'skill_family_role_coach',
      'skill_family_game_day',
      'skill_family_body',
      'skill_family_mindset',
      'skill_family_life',
    ],
  },
  {
    scenarioProfileId: 'national_deep_nonqualifier_first_offer',
    seed: 'season-career-close',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_blue_chip_star',
    programSelectionPolicy: 'strongest_offer',
    weeklyStrategyId: 'weekly_strategy_recovery_route',
    actionPlan: ['action_recovery', 'action_film_study', 'action_route_drills'],
    decisionStrategyId: 'best_fit',
    eventChoicePolicy: 'first',
    injuryChoicePolicy: 'play_limited',
    skillChoicePolicy: 'first_offered',
    skillBuildId: 'skill_build_first_offered',
    preferredSkillFamilyIds: [],
  },
  {
    scenarioProfileId: 'builder_possession_life_starter_path',
    seed: 'm4-game-001',
    archetypeId: 'archetype_wr_possession_receiver',
    recruitingBackgroundId: 'background_late_bloomer',
    programSelectionPolicy: 'first_offer',
    selectedProgramId: 'program_ember_peak_polytechnic',
    weeklyStrategyId: 'weekly_strategy_route_recovery',
    actionPlan: ['action_route_drills', 'action_film_study', 'action_recovery'],
    decisionStrategyId: 'first_presented',
    eventChoicePolicy: 'second',
    injuryChoicePolicy: 'rest',
    skillChoicePolicy: 'preferred_family',
    skillBuildId: 'skill_build_life_role',
    preferredSkillFamilyIds: [
      'skill_family_life',
      'skill_family_role_coach',
      'skill_family_mindset',
      'skill_family_development',
      'skill_family_game_day',
      'skill_family_body',
    ],
  },
  {
    scenarioProfileId: 'contender_route_body_rest',
    seed: 'm4-game-002',
    archetypeId: 'archetype_wr_route_technician',
    recruitingBackgroundId: 'background_small_town_star',
    programSelectionPolicy: 'first_offer',
    selectedProgramId: 'program_cascade_tech',
    weeklyStrategyId: 'weekly_strategy_high_load',
    actionPlan: ['action_speed_work', 'action_weight_room', 'action_study_hall'],
    decisionStrategyId: 'risk_seeking',
    eventChoicePolicy: 'second',
    injuryChoicePolicy: 'rest',
    skillChoicePolicy: 'preferred_family',
    skillBuildId: 'skill_build_body_game_day',
    preferredSkillFamilyIds: [
      'skill_family_body',
      'skill_family_game_day',
      'skill_family_development',
      'skill_family_role_coach',
      'skill_family_mindset',
      'skill_family_life',
    ],
  },
  {
    scenarioProfileId: 'contender_possession_life_alternate',
    seed: 'm4-game-003',
    archetypeId: 'archetype_wr_possession_receiver',
    recruitingBackgroundId: 'background_under_recruited_athlete',
    programSelectionPolicy: 'first_offer',
    selectedProgramId: 'program_crown_sound',
    weeklyStrategyId: 'weekly_strategy_catch_campus',
    actionPlan: ['action_hands_catch_work', 'action_study_hall', 'action_recovery'],
    decisionStrategyId: 'first_presented',
    eventChoicePolicy: 'alternate',
    injuryChoicePolicy: 'rest',
    skillChoicePolicy: 'preferred_family',
    skillBuildId: 'skill_build_life_mindset',
    preferredSkillFamilyIds: [
      'skill_family_life',
      'skill_family_mindset',
      'skill_family_role_coach',
      'skill_family_game_day',
      'skill_family_development',
      'skill_family_body',
    ],
  },
  {
    scenarioProfileId: 'national_deep_role_qualifier',
    seed: 'm4-game-004',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_blue_chip_star',
    programSelectionPolicy: 'first_offer',
    selectedProgramId: 'program_gulf_meridian',
    weeklyStrategyId: 'weekly_strategy_release_film',
    actionPlan: ['action_release_drills', 'action_film_study', 'action_recovery'],
    decisionStrategyId: 'best_fit',
    eventChoicePolicy: 'first',
    injuryChoicePolicy: 'play_limited',
    skillChoicePolicy: 'preferred_family',
    skillBuildId: 'skill_build_role_game_day',
    preferredSkillFamilyIds: [
      'skill_family_role_coach',
      'skill_family_game_day',
      'skill_family_development',
      'skill_family_mindset',
      'skill_family_body',
      'skill_family_life',
    ],
  },
] as const satisfies readonly M5SeasonScenarioDefinition[]);

export interface M5SeasonSegmentCount {
  readonly id: string;
  readonly careerCount: number;
}

export interface M5SeasonSampleReport {
  readonly scenarioId: string;
  readonly seed: RngSeed;
  readonly reproduction: string;
  readonly scenarioProfileId: string;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly recruitTierId: RecruitTierId;
  readonly selectedProgramId: ProgramId;
  readonly programStrengthBandId: ProgramStrengthBandId;
  readonly weeklyStrategyId: string;
  readonly skillBuildId: string;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly eventChoicePolicy: SeasonEventChoicePolicy;
  readonly injuryChoicePolicy: SeasonInjuryChoicePolicy;
  readonly qualifiedForPostseason: boolean;
  readonly outcomeId: SeasonOutcomeId;
  readonly initialRoleId: DepthRoleId;
  readonly finalRoleId: DepthRoleId;
  readonly observedRoleIds: readonly DepthRoleId[];
  readonly roleTransitionCount: number;
  readonly eventIds: readonly EventId[];
  readonly eventChoiceIds: readonly EventChoiceId[];
  readonly injuryOutcomeIds: readonly InjuryOutcomeId[];
  readonly injuryChoiceIds: readonly InjuryChoiceId[];
  readonly injuryAvailabilityIds: readonly InjuryAvailabilityId[];
  readonly ownedSkillIds: readonly SkillId[];
  readonly ownedSkillFamilyIds: readonly SkillFamilyId[];
  readonly equippedSkillIds: readonly (SkillId | null)[];
  readonly regularSeasonGameCount: number;
  readonly postseasonGameCount: number;
  readonly totalRoundTripCount: number;
  readonly allRoundTripsEquivalent: true;
  readonly careerRngDrawCount: number;
  readonly worldRngDrawCount: number;
  readonly cumulativeStats: WrGameStatLine;
  readonly alumni: AlumniRecordV1;
  readonly legacyOptionIds: readonly string[];
  readonly legacyFamiliarProgramCareerCount: number;
  readonly weeks: readonly WrSeasonWeekTrace[];
}

export interface M5SeasonReport {
  readonly reportId: typeof M5_SEASON_REPORT_ID;
  readonly contentCompatibilityVersion: number;
  readonly contentManifestSchemaVersion: 7;
  readonly scenarios: readonly M5SeasonScenarioDefinition[];
  readonly totalCareers: number;
  readonly totalRegularSeasonGames: number;
  readonly totalPostseasonGames: number;
  readonly priorReportSha256: typeof M5_PRIOR_REPORT_SHA256;
  readonly segments: {
    readonly recruitTier: readonly M5SeasonSegmentCount[];
    readonly archetype: readonly M5SeasonSegmentCount[];
    readonly programStrengthBand: readonly M5SeasonSegmentCount[];
    readonly weeklyStrategy: readonly M5SeasonSegmentCount[];
    readonly skillBuild: readonly M5SeasonSegmentCount[];
    readonly eventChoicePolicy: readonly M5SeasonSegmentCount[];
    readonly injuryChoicePolicy: readonly M5SeasonSegmentCount[];
    readonly initialRole: readonly M5SeasonSegmentCount[];
    readonly finalRole: readonly M5SeasonSegmentCount[];
    readonly postseason: readonly M5SeasonSegmentCount[];
    readonly outcome: readonly M5SeasonSegmentCount[];
  };
  readonly outcomes: {
    readonly qualifierCareerCount: number;
    readonly nonQualifierCareerCount: number;
    readonly careerWithEventCount: number;
    readonly careerWithInjuryCount: number;
    readonly careerWithInjuryChoiceCount: number;
    readonly observedEventIds: readonly EventId[];
    readonly observedEventChoiceIds: readonly EventChoiceId[];
    readonly observedInjuryOutcomeIds: readonly InjuryOutcomeId[];
    readonly observedInjuryChoiceIds: readonly InjuryChoiceId[];
    readonly observedRoleIds: readonly DepthRoleId[];
    readonly observedSkillFamilyIds: readonly SkillFamilyId[];
  };
  readonly samples: readonly M5SeasonSampleReport[];
}

function fail(reason: string): never {
  throw new Error(`scenario=${JSON.stringify(M5_SEASON_REPORT_ID)} reason=${reason}`);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)].sort(compareCodeUnits));
}

function segmentCounts(values: readonly string[]): readonly M5SeasonSegmentCount[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.freeze(
    [...counts.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([id, careerCount]) => Object.freeze({ id, careerCount })),
  );
}

function skillFamilyId(skillId: SkillId): SkillFamilyId {
  return (
    skillMechanicsDefinitions.find(({ id }) => id === skillId)?.familyId ??
    fail(`missing_skill:${skillId}`)
  );
}

function runSample(scenario: M5SeasonScenarioDefinition): M5SeasonSampleReport {
  const scenarioId = `m5_season:${scenario.scenarioProfileId}`;
  const result = executeWrSeasonCareer({
    scenarioId,
    fixture: {
      careerSeed: scenario.seed,
      displayName: 'M5 Season Simulation Athlete',
      archetypeId: scenario.archetypeId,
      recruitingBackgroundId: scenario.recruitingBackgroundId,
    },
    actionPlan: scenario.actionPlan,
    decisionStrategyId: scenario.decisionStrategyId,
    eventChoicePolicy: scenario.eventChoicePolicy,
    injuryChoicePolicy: scenario.injuryChoicePolicy,
    preferredSkillFamilyIds: scenario.preferredSkillFamilyIds,
    programSelectionPolicy: scenario.programSelectionPolicy,
    ...(scenario.selectedProgramId === undefined
      ? {}
      : { selectedProgramId: scenario.selectedProgramId }),
    skillChoicePolicy: scenario.skillChoicePolicy,
    serializationMode: 'every_transition',
  });
  const observedRoleIds = uniqueSorted(
    result.weeks.flatMap(({ roleIdBefore, roleIdAfter }) => [roleIdBefore, roleIdAfter]),
  );
  const eventIds = result.weeks.flatMap(({ eventId }) => (eventId === null ? [] : [eventId]));
  const eventChoiceIds = result.weeks.flatMap(({ eventChoiceId }) =>
    eventChoiceId === null ? [] : [eventChoiceId],
  );
  const injuryChoiceIds = result.weeks.flatMap(({ injuryChoiceId }) =>
    injuryChoiceId === null ? [] : [injuryChoiceId],
  );
  const ownedSkillIds = result.alumni.ownedSkillIds;
  const regularSeasonGameCount = result.weeks.filter(
    ({ stageId, gameSummary }) => stageId === 'REGULAR_SEASON' && gameSummary !== null,
  ).length;
  const postseasonGameCount = result.weeks.filter(
    ({ stageId, gameSummary }) => stageId === 'POSTSEASON' && gameSummary !== null,
  ).length;
  return Object.freeze({
    scenarioId,
    seed: scenario.seed,
    reproduction: formatScenarioReproduction({ scenarioId, seed: scenario.seed }),
    scenarioProfileId: scenario.scenarioProfileId,
    archetypeId: scenario.archetypeId,
    recruitingBackgroundId: scenario.recruitingBackgroundId,
    recruitTierId: result.recruitTierId,
    selectedProgramId: result.selectedProgramId,
    programStrengthBandId: result.programStrengthBandId,
    weeklyStrategyId: scenario.weeklyStrategyId,
    skillBuildId: scenario.skillBuildId,
    decisionStrategyId: scenario.decisionStrategyId,
    eventChoicePolicy: scenario.eventChoicePolicy,
    injuryChoicePolicy: scenario.injuryChoicePolicy,
    qualifiedForPostseason: result.qualifiedForPostseason,
    outcomeId: result.seasonSummary.outcomeId,
    initialRoleId: result.initialRoleId,
    finalRoleId: result.finalRoleId,
    observedRoleIds,
    roleTransitionCount: result.weeks.filter(
      ({ roleIdBefore, roleIdAfter }) => roleIdBefore !== roleIdAfter,
    ).length,
    eventIds: Object.freeze(eventIds),
    eventChoiceIds: Object.freeze(eventChoiceIds),
    injuryOutcomeIds: result.alumni.injuryOutcomeIds,
    injuryChoiceIds: Object.freeze(injuryChoiceIds),
    injuryAvailabilityIds: uniqueSorted(
      result.weeks.map(({ injuryAvailabilityId }) => injuryAvailabilityId),
    ),
    ownedSkillIds,
    ownedSkillFamilyIds: Object.freeze(ownedSkillIds.map(skillFamilyId)),
    equippedSkillIds: result.alumni.equippedSkillIds,
    regularSeasonGameCount,
    postseasonGameCount,
    totalRoundTripCount: result.totalRoundTripCount,
    allRoundTripsEquivalent: result.allRoundTripsEquivalent,
    careerRngDrawCount: result.careerRng.drawCount,
    worldRngDrawCount: result.worldRng.drawCount,
    cumulativeStats: result.seasonSummary.cumulativeStats,
    // M5's checked artifact is a frozen historical report contract. The live
    // M6 career uses schema v6, while this projection retains the milestone's
    // original wire-version marker so prior-report hashes stay byte-exact.
    alumni: { ...result.alumni, careerSchemaVersion: 5 as const },
    legacyOptionIds: result.legacyVisibility.unlockedOptionIds,
    legacyFamiliarProgramCareerCount: result.legacyVisibility.familiarProgramCareerCount,
    weeks: result.weeks,
  });
}

export function runM5SeasonReport(): M5SeasonReport {
  if (contentManifest.contentVersion !== 1 || contentManifest.schemaVersion !== 9) {
    return fail('unexpected_content_identity');
  }
  if (programMechanicsDefinitions.length !== 12 || skillMechanicsDefinitions.length !== 40) {
    return fail('unexpected_catalog_identity');
  }
  const samples = M5_SEASON_SCENARIOS.map(runSample);
  return Object.freeze({
    reportId: M5_SEASON_REPORT_ID,
    contentCompatibilityVersion: CONTENT_COMPATIBILITY_VERSION,
    contentManifestSchemaVersion: 7,
    scenarios: M5_SEASON_SCENARIOS,
    totalCareers: samples.length,
    totalRegularSeasonGames: samples.reduce(
      (total, sample) => total + sample.regularSeasonGameCount,
      0,
    ),
    totalPostseasonGames: samples.reduce((total, sample) => total + sample.postseasonGameCount, 0),
    priorReportSha256: M5_PRIOR_REPORT_SHA256,
    segments: Object.freeze({
      recruitTier: segmentCounts(samples.map(({ recruitTierId }) => recruitTierId)),
      archetype: segmentCounts(samples.map(({ archetypeId }) => archetypeId)),
      programStrengthBand: segmentCounts(
        samples.map(({ programStrengthBandId }) => programStrengthBandId),
      ),
      weeklyStrategy: segmentCounts(samples.map(({ weeklyStrategyId }) => weeklyStrategyId)),
      skillBuild: segmentCounts(samples.map(({ skillBuildId }) => skillBuildId)),
      eventChoicePolicy: segmentCounts(samples.map(({ eventChoicePolicy }) => eventChoicePolicy)),
      injuryChoicePolicy: segmentCounts(
        samples.map(({ injuryChoicePolicy }) => injuryChoicePolicy),
      ),
      initialRole: segmentCounts(samples.map(({ initialRoleId }) => initialRoleId)),
      finalRole: segmentCounts(samples.map(({ finalRoleId }) => finalRoleId)),
      postseason: segmentCounts(
        samples.map(({ qualifiedForPostseason }) =>
          qualifiedForPostseason ? 'postseason_qualified' : 'postseason_not_qualified',
        ),
      ),
      outcome: segmentCounts(samples.map(({ outcomeId }) => outcomeId)),
    }),
    outcomes: Object.freeze({
      qualifierCareerCount: samples.filter(({ qualifiedForPostseason }) => qualifiedForPostseason)
        .length,
      nonQualifierCareerCount: samples.filter(
        ({ qualifiedForPostseason }) => !qualifiedForPostseason,
      ).length,
      careerWithEventCount: samples.filter(({ eventIds }) => eventIds.length > 0).length,
      careerWithInjuryCount: samples.filter(({ injuryOutcomeIds }) => injuryOutcomeIds.length > 0)
        .length,
      careerWithInjuryChoiceCount: samples.filter(
        ({ injuryChoiceIds }) => injuryChoiceIds.length > 0,
      ).length,
      observedEventIds: uniqueSorted(samples.flatMap(({ eventIds }) => eventIds)),
      observedEventChoiceIds: uniqueSorted(samples.flatMap(({ eventChoiceIds }) => eventChoiceIds)),
      observedInjuryOutcomeIds: uniqueSorted(
        samples.flatMap(({ injuryOutcomeIds }) => injuryOutcomeIds),
      ),
      observedInjuryChoiceIds: uniqueSorted(
        samples.flatMap(({ injuryChoiceIds }) => injuryChoiceIds),
      ),
      observedRoleIds: uniqueSorted(samples.flatMap(({ observedRoleIds }) => observedRoleIds)),
      observedSkillFamilyIds: uniqueSorted(
        samples.flatMap(({ ownedSkillFamilyIds }) => ownedSkillFamilyIds),
      ),
    }),
    samples: Object.freeze(samples),
  });
}

export function formatM5SeasonReport(report: M5SeasonReport): string {
  return JSON.stringify(report);
}
