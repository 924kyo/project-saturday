import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import {
  contentManifest,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
  programMechanicsDefinitions,
} from '@project-saturday/game-content/content';
import type {
  CompletedGameSummary,
  DepthRoleId,
  GameClueId,
  GameInformationTierId,
  GamePlayResultId,
  KeySnapDecisionFamilyId,
  KeySnapDecisionId,
  KeySnapPatternId,
  PerformanceGradeBandId,
  PersonalityTraitId,
  PostGameGrowthEvidence,
  ProgramId,
  ProgramStrengthBandId,
  RecruitingBackgroundId,
  RngSeed,
  RngState,
  SkillFamilyId,
  SkillGameHookId,
  SkillId,
  SnapProjectionEvidence,
  WrArchetypeId,
} from '@project-saturday/game-core';

import {
  advanceCompletedWrGameWeek,
  completeCurrentProgramPracticeWeek,
  executeWrShippedGame,
  type CurrentProgramWeeklyActionPlan,
  type GameDecisionStrategyId,
} from '../builders/wr-game-career.js';
import { createEnrolledWrCareerFixture } from '../builders/wr-program-career.js';
import { formatScenarioReproduction } from '../scenario.js';
import { historicalM3_5SkillMechanicsDefinitions } from './historical-m3-5-skill-catalog.js';

export const M4_GAME_REPORT_ID = 'm4_game_baseline_v1' as const;
export const M4_GAME_WEEK_COUNT = 6 as const;
export const M4_GAME_SEEDS = Object.freeze([
  'm4-game-001',
  'm4-game-002',
  'm4-game-003',
  'm4-game-004',
] as const satisfies readonly RngSeed[]);

export type M4BodyBandId = 'body_band_ready' | 'body_band_strained';
export type M4IqBandId = 'iq_band_advanced' | 'iq_band_developing';

export interface M4GameScenarioDefinition {
  readonly scenarioProfileId: string;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly selectedProgramId: ProgramId;
  readonly actionPlan: CurrentProgramWeeklyActionPlan;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly preferredSkillFamilyIds: readonly SkillFamilyId[];
}

export const M4_GAME_SCENARIOS = Object.freeze([
  {
    scenarioProfileId: 'builder_deep_practice_reader',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_legacy_recruit',
    selectedProgramId: 'program_high_desert_state',
    actionPlan: ['action_extra_practice', 'action_film_study', 'action_recovery'],
    decisionStrategyId: 'best_fit',
    preferredSkillFamilyIds: [
      'skill_family_game_day',
      'skill_family_role_coach',
      'skill_family_development',
      'skill_family_mindset',
      'skill_family_body',
      'skill_family_life',
    ],
  },
  {
    scenarioProfileId: 'builder_possession_balanced',
    archetypeId: 'archetype_wr_possession_receiver',
    recruitingBackgroundId: 'background_late_bloomer',
    selectedProgramId: 'program_ember_peak_polytechnic',
    actionPlan: ['action_route_drills', 'action_film_study', 'action_recovery'],
    decisionStrategyId: 'first_presented',
    preferredSkillFamilyIds: [
      'skill_family_development',
      'skill_family_mindset',
      'skill_family_game_day',
      'skill_family_body',
      'skill_family_role_coach',
      'skill_family_life',
    ],
  },
  {
    scenarioProfileId: 'contender_route_body_risk',
    archetypeId: 'archetype_wr_route_technician',
    recruitingBackgroundId: 'background_small_town_star',
    selectedProgramId: 'program_cascade_tech',
    actionPlan: ['action_speed_work', 'action_weight_room', 'action_study_hall'],
    decisionStrategyId: 'risk_seeking',
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
    scenarioProfileId: 'contender_possession_life',
    archetypeId: 'archetype_wr_possession_receiver',
    recruitingBackgroundId: 'background_under_recruited_athlete',
    selectedProgramId: 'program_crown_sound',
    actionPlan: ['action_hands_catch_work', 'action_study_hall', 'action_recovery'],
    decisionStrategyId: 'first_presented',
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
    scenarioProfileId: 'national_deep_film',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_blue_chip_star',
    selectedProgramId: 'program_gulf_meridian',
    actionPlan: ['action_release_drills', 'action_film_study', 'action_recovery'],
    decisionStrategyId: 'best_fit',
    preferredSkillFamilyIds: [
      'skill_family_role_coach',
      'skill_family_game_day',
      'skill_family_development',
      'skill_family_mindset',
      'skill_family_body',
      'skill_family_life',
    ],
  },
] as const satisfies readonly M4GameScenarioDefinition[]);

export interface M4GameDecisionReport {
  readonly familyId: KeySnapDecisionFamilyId;
  readonly patternId: KeySnapPatternId;
  readonly decisionId: KeySnapDecisionId;
  readonly decisionFit: number;
  readonly informationTierId: GameInformationTierId;
  readonly informationScore: number;
  readonly revealedClueIds: readonly GameClueId[];
  readonly resultId: GamePlayResultId;
  readonly receivingYardsDelta: number;
  readonly hookIds: readonly SkillGameHookId[];
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
}

export interface M4GameWeekReport {
  readonly weekNumber: number;
  readonly reproduction: string;
  readonly roleId: DepthRoleId;
  readonly depthRank: number;
  readonly snapProjection: SnapProjectionEvidence;
  readonly bodyBeforeGame: number;
  readonly bodyBandId: M4BodyBandId;
  readonly footballIqRating: number;
  readonly iqBandId: M4IqBandId;
  readonly preparationBeforeGame: number;
  readonly confidenceBeforeGame: number;
  readonly usedFilmStudy: boolean;
  readonly equippedSkillIds: readonly SkillId[];
  readonly skillBuildSignature: string;
  readonly opportunityBudget: number;
  readonly opponentProgramId: ProgramId;
  readonly summary: CompletedGameSummary;
  readonly growth: PostGameGrowthEvidence;
  readonly decisions: readonly M4GameDecisionReport[];
  readonly informationTierCounts: Readonly<Record<GameInformationTierId, number>>;
  readonly hookIds: readonly SkillGameHookId[];
  readonly hookApplicationCount: number;
  readonly gameRngDrawCount: number;
  readonly roundTripCount: number;
  readonly selectedSkillIdAfterGame: SkillId | null;
}

export interface M4GameSampleReport {
  readonly scenarioId: string;
  readonly seed: RngSeed;
  readonly reproduction: string;
  readonly scenarioProfileId: string;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly selectedProgramId: ProgramId;
  readonly programStrengthBandId: ProgramStrengthBandId;
  readonly actionPlan: CurrentProgramWeeklyActionPlan;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly preferredSkillFamilyIds: readonly SkillFamilyId[];
  readonly games: readonly M4GameWeekReport[];
  readonly acquiredSkillIds: readonly SkillId[];
  readonly acquiredSkillFamilyIds: readonly SkillFamilyId[];
  readonly finalRng: RngState;
  readonly totalRoundTripCount: number;
  readonly allRoundTripsEquivalent: true;
}

export interface M4GameSegmentCount {
  readonly id: string;
  readonly gameCount: number;
}

export interface M4GameReport {
  readonly reportId: typeof M4_GAME_REPORT_ID;
  readonly contentCompatibilityVersion: number;
  readonly contentManifestSchemaVersion: 4;
  readonly seeds: readonly RngSeed[];
  readonly scenarios: readonly M4GameScenarioDefinition[];
  readonly weekCountPerCareer: number;
  readonly totalCareers: number;
  readonly totalGames: number;
  readonly programCatalogIds: readonly ProgramId[];
  readonly familyCatalogIds: readonly KeySnapDecisionFamilyId[];
  readonly patternCatalogIds: readonly KeySnapPatternId[];
  readonly segments: {
    readonly depthRole: readonly M4GameSegmentCount[];
    readonly archetype: readonly M4GameSegmentCount[];
    readonly programStrengthBand: readonly M4GameSegmentCount[];
    readonly bodyBand: readonly M4GameSegmentCount[];
    readonly iqBand: readonly M4GameSegmentCount[];
    readonly filmStudy: readonly M4GameSegmentCount[];
    readonly decisionStrategy: readonly M4GameSegmentCount[];
    readonly skillBuild: readonly M4GameSegmentCount[];
    readonly informationTier: readonly M4GameSegmentCount[];
  };
  readonly outcomes: {
    readonly zeroOpportunityGameCount: number;
    readonly hookedGameCount: number;
    readonly hookApplicationCount: number;
    readonly minimumGradeScore: number;
    readonly maximumGradeScore: number;
    readonly observedRoleIds: readonly DepthRoleId[];
    readonly observedFamilyIds: readonly KeySnapDecisionFamilyId[];
    readonly observedHookIds: readonly SkillGameHookId[];
    readonly observedGradeBandIds: readonly PerformanceGradeBandId[];
  };
  readonly samples: readonly M4GameSampleReport[];
}

const FIXTURE_PERSONALITIES = Object.freeze([
  'personality_competitive',
  'personality_leader',
] as const satisfies readonly [PersonalityTraitId, PersonalityTraitId]);

function fail(scenarioId: string, reason: string): never {
  throw new Error(`scenario=${JSON.stringify(scenarioId)} reason=${reason}`);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function bodyBand(body: number): M4BodyBandId {
  return body >= 60 ? 'body_band_ready' : 'body_band_strained';
}

function iqBand(rating: number): M4IqBandId {
  return rating >= 54 ? 'iq_band_advanced' : 'iq_band_developing';
}

function equippedSkillIds(equippedIds: readonly (SkillId | null)[]): readonly SkillId[] {
  return Object.freeze(equippedIds.filter((skillId): skillId is SkillId => skillId !== null));
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)].sort(compareCodeUnits));
}

function segmentCounts(values: readonly string[]): readonly M4GameSegmentCount[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.freeze(
    [...counts.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([id, gameCount]) => Object.freeze({ id, gameCount })),
  );
}

function runSample(scenario: M4GameScenarioDefinition, seed: RngSeed): M4GameSampleReport {
  const scenarioId = `m4_game:${scenario.scenarioProfileId}`;
  const enrolled = createEnrolledWrCareerFixture({
    scenarioId,
    fixture: {
      careerSeed: seed,
      displayName: 'M4 Game Simulation Athlete',
      archetypeId: scenario.archetypeId,
      recruitingBackgroundId: scenario.recruitingBackgroundId,
      personalityTraitIds: FIXTURE_PERSONALITIES,
    },
    selectedProgramId: scenario.selectedProgramId,
    serializationMode: 'every_transition',
  });
  const program = programMechanicsDefinitions.find(({ id }) => id === scenario.selectedProgramId);
  if (program === undefined) return fail(scenarioId, 'missing_program_definition');
  let career = enrolled.career;
  let totalRoundTripCount = enrolled.roundTripCount;
  const games: M4GameWeekReport[] = [];

  for (let weekIndex = 0; weekIndex < M4_GAME_WEEK_COUNT; weekIndex += 1) {
    const practice = completeCurrentProgramPracticeWeek({
      actionPlan: scenario.actionPlan,
      career,
      scenarioId,
      serializationMode: 'every_transition',
      skillDefinitions: historicalM3_5SkillMechanicsDefinitions,
    });
    career = practice.career;
    totalRoundTripCount += practice.roundTripCount;
    if (career.programContext === null || career.phase.type !== 'WEEK_END') {
      return fail(scenarioId, 'missing_pregame_state');
    }
    const roleId = career.programContext.projection.roleId;
    const depthRank = career.programContext.projection.rank;
    const snapProjection = career.programContext.projection;
    const bodyBeforeGame = career.player.state.body;
    const footballIqRating = career.player.attributes.mental.attribute_football_iq.rating;
    const preparationBeforeGame = career.player.state.preparation;
    const confidenceBeforeGame = career.player.state.confidence;
    const usedFilmStudy = career.phase.results.some(
      ({ actionId }) => actionId === 'action_film_study',
    );
    const skillsBeforeGame = equippedSkillIds(career.player.skillState.equippedSkillIds);
    const game = executeWrShippedGame({
      career,
      decisionStrategyId: scenario.decisionStrategyId,
      scenarioId,
      serializationMode: 'every_transition',
    });
    career = game.career;
    totalRoundTripCount += game.roundTripCount;
    const decisionReports = game.decisions.map(({ informationGameHooks, ...decision }) => {
      const hookIds = uniqueSorted([
        ...informationGameHooks.map(({ hookId }) => hookId),
        ...decision.play.appliedGameHooks.map(({ hookId }) => hookId),
      ]);
      return Object.freeze({
        familyId: decision.familyId,
        patternId: decision.patternId,
        decisionId: decision.decisionId,
        decisionFit: decision.play.decisionFit,
        informationTierId: decision.informationTierId,
        informationScore: decision.information.finalScore,
        revealedClueIds: decision.revealedClueIds,
        resultId: decision.play.resultId,
        receivingYardsDelta: decision.play.receivingYardsDelta,
        hookIds,
        rngDrawCountBefore: decision.play.rngDrawCountBefore,
        rngDrawCountAfter: decision.play.rngDrawCountAfter,
      });
    });
    const allHookIds = [
      ...game.matchup.opportunityGameHooks.map(({ hookId }) => hookId),
      ...game.decisions.flatMap(({ informationGameHooks }) =>
        informationGameHooks.map(({ hookId }) => hookId),
      ),
      ...game.keyPlayLog.flatMap(({ appliedGameHooks }) =>
        appliedGameHooks.map(({ hookId }) => hookId),
      ),
    ];
    const tierCounts = Object.freeze({
      game_information_uncertain: game.decisions.filter(
        ({ informationTierId }) => informationTierId === 'game_information_uncertain',
      ).length,
      game_information_partial: game.decisions.filter(
        ({ informationTierId }) => informationTierId === 'game_information_partial',
      ).length,
      game_information_diagnostic: game.decisions.filter(
        ({ informationTierId }) => informationTierId === 'game_information_diagnostic',
      ).length,
    });
    const advanced = advanceCompletedWrGameWeek({
      career,
      preferredSkillFamilyIds: scenario.preferredSkillFamilyIds,
      scenarioId,
      serializationMode: 'every_transition',
      skillDefinitions: historicalM3_5SkillMechanicsDefinitions,
    });
    career = advanced.career;
    totalRoundTripCount += advanced.roundTripCount;
    games.push(
      Object.freeze({
        weekNumber: weekIndex + 1,
        reproduction: `${formatScenarioReproduction({ scenarioId, seed })} week=${weekIndex + 1}`,
        roleId,
        depthRank,
        snapProjection,
        bodyBeforeGame,
        bodyBandId: bodyBand(bodyBeforeGame),
        footballIqRating,
        iqBandId: iqBand(footballIqRating),
        preparationBeforeGame,
        confidenceBeforeGame,
        usedFilmStudy,
        equippedSkillIds: skillsBeforeGame,
        skillBuildSignature:
          skillsBeforeGame.length === 0 ? 'skill_build_empty' : skillsBeforeGame.join('+'),
        opportunityBudget: game.matchup.opportunityBudget,
        opponentProgramId: game.matchup.opponentProgramId,
        summary: game.summary,
        growth: game.growth,
        decisions: Object.freeze(decisionReports),
        informationTierCounts: tierCounts,
        hookIds: uniqueSorted(allHookIds),
        hookApplicationCount: allHookIds.length,
        gameRngDrawCount: game.summary.gameRngDrawCountAfter - game.summary.gameRngDrawCountBefore,
        roundTripCount: practice.roundTripCount + game.roundTripCount + advanced.roundTripCount,
        selectedSkillIdAfterGame: advanced.selectedSkillId,
      }),
    );
  }

  const acquiredSkillIds = career.player.skillState.acquisitions.map(
    ({ selectedSkillId }) => selectedSkillId,
  );
  const acquiredSkillFamilyIds = acquiredSkillIds.map((skillId) => {
    const skill = historicalM3_5SkillMechanicsDefinitions.find(({ id }) => id === skillId);
    return skill?.familyId ?? fail(scenarioId, `missing_skill_definition:${skillId}`);
  });
  return Object.freeze({
    scenarioId,
    seed,
    reproduction: formatScenarioReproduction({ scenarioId, seed }),
    scenarioProfileId: scenario.scenarioProfileId,
    archetypeId: scenario.archetypeId,
    recruitingBackgroundId: scenario.recruitingBackgroundId,
    selectedProgramId: scenario.selectedProgramId,
    programStrengthBandId: program.strengthBandId,
    actionPlan: scenario.actionPlan,
    decisionStrategyId: scenario.decisionStrategyId,
    preferredSkillFamilyIds: scenario.preferredSkillFamilyIds,
    games: Object.freeze(games),
    acquiredSkillIds: Object.freeze(acquiredSkillIds),
    acquiredSkillFamilyIds: Object.freeze(acquiredSkillFamilyIds),
    finalRng: career.rng,
    totalRoundTripCount,
    allRoundTripsEquivalent: true,
  });
}

export function runM4GameReport(seeds: readonly RngSeed[] = M4_GAME_SEEDS): M4GameReport {
  if (seeds.length === 0) return fail(M4_GAME_REPORT_ID, 'empty_seed_set');
  if (contentManifest.contentVersion !== 1 || contentManifest.schemaVersion !== 9) {
    return fail(M4_GAME_REPORT_ID, 'unexpected_content_identity');
  }
  const samples = M4_GAME_SCENARIOS.flatMap((scenario) =>
    seeds.map((seed) => runSample(scenario, seed)),
  );
  const gameRows = samples.flatMap((sample) => sample.games.map((game) => ({ sample, game })));
  const decisions = gameRows.flatMap(({ game }) => game.decisions);
  const grades = gameRows.map(({ game }) => game.summary.performanceGradeScore);
  const informationTiers = decisions.map(({ informationTierId }) => informationTierId);
  return Object.freeze({
    reportId: M4_GAME_REPORT_ID,
    contentCompatibilityVersion: CONTENT_COMPATIBILITY_VERSION,
    contentManifestSchemaVersion: 4,
    seeds: Object.freeze([...seeds]),
    scenarios: M4_GAME_SCENARIOS,
    weekCountPerCareer: M4_GAME_WEEK_COUNT,
    totalCareers: samples.length,
    totalGames: gameRows.length,
    programCatalogIds: Object.freeze(programMechanicsDefinitions.map(({ id }) => id)),
    familyCatalogIds: Object.freeze(keySnapFamilyMechanicsDefinitions.map(({ id }) => id)),
    patternCatalogIds: Object.freeze(keySnapPatternMechanicsDefinitions.map(({ id }) => id)),
    segments: Object.freeze({
      depthRole: segmentCounts(gameRows.map(({ game }) => game.roleId)),
      archetype: segmentCounts(gameRows.map(({ sample }) => sample.archetypeId)),
      programStrengthBand: segmentCounts(
        gameRows.map(({ sample }) => sample.programStrengthBandId),
      ),
      bodyBand: segmentCounts(gameRows.map(({ game }) => game.bodyBandId)),
      iqBand: segmentCounts(gameRows.map(({ game }) => game.iqBandId)),
      filmStudy: segmentCounts(
        gameRows.map(({ game }) =>
          game.usedFilmStudy ? 'film_study_used' : 'film_study_not_used',
        ),
      ),
      decisionStrategy: segmentCounts(gameRows.map(({ sample }) => sample.decisionStrategyId)),
      skillBuild: segmentCounts(gameRows.map(({ game }) => game.skillBuildSignature)),
      informationTier: segmentCounts(informationTiers),
    }),
    outcomes: Object.freeze({
      zeroOpportunityGameCount: gameRows.filter(({ game }) => game.opportunityBudget === 0).length,
      hookedGameCount: gameRows.filter(({ game }) => game.hookApplicationCount > 0).length,
      hookApplicationCount: gameRows.reduce(
        (total, { game }) => total + game.hookApplicationCount,
        0,
      ),
      minimumGradeScore: Math.min(...grades),
      maximumGradeScore: Math.max(...grades),
      observedRoleIds: uniqueSorted(gameRows.map(({ game }) => game.roleId)),
      observedFamilyIds: uniqueSorted(decisions.map(({ familyId }) => familyId)),
      observedHookIds: uniqueSorted(gameRows.flatMap(({ game }) => game.hookIds)),
      observedGradeBandIds: uniqueSorted(
        gameRows.map(({ game }) => game.summary.performanceGradeBandId),
      ),
    }),
    samples: Object.freeze(samples),
  });
}

export function formatM4GameReport(report: M4GameReport): string {
  return JSON.stringify(report);
}
