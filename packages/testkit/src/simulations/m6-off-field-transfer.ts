import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import { contentManifest } from '@project-saturday/game-content/content';
import type {
  AcademicEligibilityStatus,
  DepthRoleId,
  NilOfferId,
  OffseasonCoachChangeId,
  ProgramId,
  ProgramStrengthBandId,
  RecruitTierId,
  RecruitingBackgroundId,
  RelationshipActorId,
  RngSeed,
  SkillFamilyId,
  WrArchetypeId,
} from '@project-saturday/game-core';

import {
  executeWrOffFieldCareer,
  relationshipTrackValue,
  type NilDecisionPolicy,
  type OffseasonChoicePolicy,
} from '../builders/wr-off-field-career.js';
import type {
  SeasonEventChoicePolicy,
  SeasonInjuryChoicePolicy,
  SeasonProgramSelectionPolicy,
} from '../builders/wr-season-career.js';
import type {
  CurrentProgramWeeklyActionPlan,
  GameDecisionStrategyId,
} from '../builders/wr-game-career.js';
import { formatScenarioReproduction } from '../scenario.js';

export const M6_OFF_FIELD_TRANSFER_REPORT_ID = 'm6_off_field_transfer_v1' as const;

export const M6_PRIOR_REPORT_SHA256 = Object.freeze({
  'm1-development-baseline.jsonl':
    '0c12fa5e6ac2543769dd094260c9978993eb978d771c14162cd2d08011d4f909',
  'm2-skill-build-baseline.jsonl':
    '0357b8ee1a4ae9417bfb5fe9e2165055fda32c0bd73c2ea7f072e231b489962d',
  'm3-5-skill-ecology.jsonl': '56e7006f0c6f64d9cc3d3a8bf845957889ac6881a25d2d694a2cf14cff8d18de',
  'm3-depth-baseline.jsonl': '3cb3881b9b4d24c096f7dfb2e3d2f0c0394554a9fbc43d8185deeef7b5de5256',
  'm4-game-baseline.jsonl': 'b4e4a43d86ed2d7ac8c538160c156bdfe54d22193f94a284b26cdfcad694bb11',
  'm5-season-baseline.jsonl': 'd14bd4b3e4ec0bee1dd5f78e4d2b845ff18a9a2577913ebf02a117a721897660',
} as const);

export type M6AcademicRiskId = 'academic_risk_ineligible' | 'academic_risk_safe';
export type M6RelationshipStrategyId =
  | 'relationship_strategy_coach_push'
  | 'relationship_strategy_competitor_growth'
  | 'relationship_strategy_room_leader';
export type M6RelationshipDirectionId = 'down' | 'flat' | 'up';

export interface M6OffFieldScenarioDefinition {
  readonly scenarioProfileId: string;
  readonly seed: RngSeed;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly initialGpa: number;
  readonly initialBrand: number;
  readonly academicRiskId: M6AcademicRiskId;
  readonly programSelectionPolicy: SeasonProgramSelectionPolicy;
  readonly relationshipStrategyId: M6RelationshipStrategyId;
  readonly actionPlan: CurrentProgramWeeklyActionPlan;
  readonly decisionStrategyId: GameDecisionStrategyId;
  readonly eventChoicePolicy: SeasonEventChoicePolicy;
  readonly injuryChoicePolicy: SeasonInjuryChoicePolicy;
  readonly nilDecisionPolicy: NilDecisionPolicy;
  readonly offseasonChoicePolicy: OffseasonChoicePolicy;
  readonly preferredSkillFamilyIds: readonly SkillFamilyId[];
}

const DEVELOPMENT_FIRST = Object.freeze([
  'skill_family_development',
  'skill_family_role_coach',
  'skill_family_game_day',
  'skill_family_body',
  'skill_family_mindset',
  'skill_family_life',
] as const satisfies readonly SkillFamilyId[]);
const LIFE_FIRST = Object.freeze([
  'skill_family_life',
  'skill_family_mindset',
  'skill_family_role_coach',
  'skill_family_game_day',
  'skill_family_development',
  'skill_family_body',
] as const satisfies readonly SkillFamilyId[]);
const GAME_FIRST = Object.freeze([
  'skill_family_game_day',
  'skill_family_role_coach',
  'skill_family_development',
  'skill_family_body',
  'skill_family_mindset',
  'skill_family_life',
] as const satisfies readonly SkillFamilyId[]);

export const M6_OFF_FIELD_SCENARIOS = Object.freeze([
  {
    scenarioProfileId: 'blue_chip_safe_coach_stay_fulfill',
    seed: 'm6-off-field-001',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_blue_chip_star',
    initialGpa: 3.5,
    initialBrand: 80,
    academicRiskId: 'academic_risk_safe',
    programSelectionPolicy: 'strongest_offer',
    relationshipStrategyId: 'relationship_strategy_coach_push',
    actionPlan: ['action_film_study', 'action_extra_practice', 'action_recovery'],
    decisionStrategyId: 'best_fit',
    eventChoicePolicy: 'first',
    injuryChoicePolicy: 'play_limited',
    nilDecisionPolicy: 'accept_fulfill',
    offseasonChoicePolicy: 'stay',
    preferredSkillFamilyIds: LIFE_FIRST,
  },
  {
    scenarioProfileId: 'blue_chip_risk_competitor_transfer_default',
    seed: 'm6-off-field-002',
    archetypeId: 'archetype_wr_route_technician',
    recruitingBackgroundId: 'background_blue_chip_star',
    initialGpa: 1.95,
    initialBrand: 75,
    academicRiskId: 'academic_risk_ineligible',
    programSelectionPolicy: 'strongest_offer',
    relationshipStrategyId: 'relationship_strategy_competitor_growth',
    actionPlan: ['action_route_drills', 'action_hands_catch_work', 'action_recovery'],
    decisionStrategyId: 'risk_seeking',
    eventChoicePolicy: 'second',
    injuryChoicePolicy: 'rest',
    nilDecisionPolicy: 'accept_default',
    offseasonChoicePolicy: 'first_transfer',
    preferredSkillFamilyIds: GAME_FIRST,
  },
  {
    scenarioProfileId: 'small_town_safe_room_stay_decline',
    seed: 'm6-off-field-003',
    archetypeId: 'archetype_wr_possession_receiver',
    recruitingBackgroundId: 'background_small_town_star',
    initialGpa: 3.1,
    initialBrand: 55,
    academicRiskId: 'academic_risk_safe',
    programSelectionPolicy: 'first_offer',
    relationshipStrategyId: 'relationship_strategy_room_leader',
    actionPlan: ['action_hands_catch_work', 'action_study_hall', 'action_recovery'],
    decisionStrategyId: 'first_presented',
    eventChoicePolicy: 'alternate',
    injuryChoicePolicy: 'rest',
    nilDecisionPolicy: 'decline',
    offseasonChoicePolicy: 'stay',
    preferredSkillFamilyIds: DEVELOPMENT_FIRST,
  },
  {
    scenarioProfileId: 'late_bloomer_risk_coach_transfer_fulfill',
    seed: 'm6-off-field-004',
    archetypeId: 'archetype_wr_route_technician',
    recruitingBackgroundId: 'background_late_bloomer',
    initialGpa: 1.9,
    initialBrand: 85,
    academicRiskId: 'academic_risk_ineligible',
    programSelectionPolicy: 'first_offer',
    relationshipStrategyId: 'relationship_strategy_coach_push',
    actionPlan: ['action_film_study', 'action_extra_practice', 'action_recovery'],
    decisionStrategyId: 'best_fit',
    eventChoicePolicy: 'alternate',
    injuryChoicePolicy: 'play_limited',
    nilDecisionPolicy: 'accept_fulfill',
    offseasonChoicePolicy: 'first_transfer',
    preferredSkillFamilyIds: LIFE_FIRST,
  },
  {
    scenarioProfileId: 'under_recruited_safe_competitor_transfer_decline',
    seed: 'm6-off-field-005',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_under_recruited_athlete',
    initialGpa: 3.6,
    initialBrand: 45,
    academicRiskId: 'academic_risk_safe',
    programSelectionPolicy: 'weakest_offer',
    relationshipStrategyId: 'relationship_strategy_competitor_growth',
    actionPlan: ['action_route_drills', 'action_study_hall', 'action_recovery'],
    decisionStrategyId: 'risk_seeking',
    eventChoicePolicy: 'first',
    injuryChoicePolicy: 'rest',
    nilDecisionPolicy: 'decline',
    offseasonChoicePolicy: 'first_transfer',
    preferredSkillFamilyIds: GAME_FIRST,
  },
  {
    scenarioProfileId: 'under_recruited_risk_room_stay_default',
    seed: 'm6-off-field-006',
    archetypeId: 'archetype_wr_possession_receiver',
    recruitingBackgroundId: 'background_under_recruited_athlete',
    initialGpa: 1.92,
    initialBrand: 90,
    academicRiskId: 'academic_risk_ineligible',
    programSelectionPolicy: 'weakest_offer',
    relationshipStrategyId: 'relationship_strategy_room_leader',
    actionPlan: ['action_hands_catch_work', 'action_release_drills', 'action_recovery'],
    decisionStrategyId: 'first_presented',
    eventChoicePolicy: 'second',
    injuryChoicePolicy: 'play_limited',
    nilDecisionPolicy: 'accept_default',
    offseasonChoicePolicy: 'stay',
    preferredSkillFamilyIds: DEVELOPMENT_FIRST,
  },
] as const satisfies readonly M6OffFieldScenarioDefinition[]);

export interface M6SegmentCount {
  readonly id: string;
  readonly careerCount: number;
}

export interface M6RelationshipDirectionReport {
  readonly actorId: RelationshipActorId;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
  readonly directionId: M6RelationshipDirectionId;
}

export interface M6OffFieldSampleReport {
  readonly scenarioId: string;
  readonly seed: RngSeed;
  readonly reproduction: string;
  readonly scenarioProfileId: string;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly recruitTierId: RecruitTierId;
  readonly academicRiskId: M6AcademicRiskId;
  readonly academicCheckpointStatusIds: readonly Exclude<AcademicEligibilityStatus, 'PENDING'>[];
  readonly relationshipStrategyId: M6RelationshipStrategyId;
  readonly relationshipDirections: readonly M6RelationshipDirectionReport[];
  readonly nilDecisionPolicy: NilDecisionPolicy;
  readonly nilOfferIds: readonly NilOfferId[];
  readonly nilAcceptedCount: number;
  readonly nilDeclinedCount: number;
  readonly nilFulfilledCount: number;
  readonly nilDefaultedCount: number;
  readonly fictionalFundsUsd: number;
  readonly offseasonChoicePolicy: OffseasonChoicePolicy;
  readonly initialProgramId: ProgramId;
  readonly selectedProgramId: ProgramId;
  readonly initialProgramStrengthBandId: ProgramStrengthBandId;
  readonly selectedProgramStrengthBandId: ProgramStrengthBandId;
  readonly programChanged: boolean;
  readonly selectedCoachChangeId: OffseasonCoachChangeId;
  readonly schemeChanged: boolean;
  readonly observedWorldCoachChangeIds: readonly OffseasonCoachChangeId[];
  readonly initialRoleId: DepthRoleId;
  readonly firstSeasonFinalRoleId: DepthRoleId;
  readonly projectedNextRoleId: DepthRoleId;
  readonly actualNextRoleId: DepthRoleId;
  readonly openingGameRoleId: DepthRoleId;
  readonly firstSeasonGamesPlayed: number;
  readonly cumulativeGamesAfterOpening: number;
  readonly completedSeasonHistoryCount: number;
  readonly totalRoundTripCount: number;
  readonly allRoundTripsEquivalent: true;
  readonly careerRngDrawCount: number;
  readonly worldRngDrawCount: number;
}

export interface M6OffFieldTransferReport {
  readonly reportId: typeof M6_OFF_FIELD_TRANSFER_REPORT_ID;
  readonly contentCompatibilityVersion: number;
  readonly contentManifestSchemaVersion: 8;
  readonly priorReportSha256: typeof M6_PRIOR_REPORT_SHA256;
  readonly scenarios: readonly M6OffFieldScenarioDefinition[];
  readonly totalCareers: number;
  readonly segments: {
    readonly recruitTier: readonly M6SegmentCount[];
    readonly archetype: readonly M6SegmentCount[];
    readonly programStrengthBand: readonly M6SegmentCount[];
    readonly academicRisk: readonly M6SegmentCount[];
    readonly relationshipStrategy: readonly M6SegmentCount[];
    readonly nilDecisionPolicy: readonly M6SegmentCount[];
    readonly offseasonChoicePolicy: readonly M6SegmentCount[];
    readonly selectedCoachChange: readonly M6SegmentCount[];
    readonly actualNextRole: readonly M6SegmentCount[];
  };
  readonly outcomes: {
    readonly transferCareerCount: number;
    readonly stayCareerCount: number;
    readonly schemeChangeCareerCount: number;
    readonly observedAcademicStatusIds: readonly Exclude<AcademicEligibilityStatus, 'PENDING'>[];
    readonly observedRelationshipDirectionIds: readonly M6RelationshipDirectionId[];
    readonly observedNilOfferIds: readonly NilOfferId[];
    readonly observedWorldCoachChangeIds: readonly OffseasonCoachChangeId[];
    readonly observedNextRoleIds: readonly DepthRoleId[];
  };
  readonly samples: readonly M6OffFieldSampleReport[];
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)].sort(compareCodeUnits));
}

function segmentCounts(values: readonly string[]): readonly M6SegmentCount[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.freeze(
    [...counts.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([id, careerCount]) => Object.freeze({ id, careerCount })),
  );
}

function relationshipDirections(
  beforeTracks: Parameters<typeof relationshipTrackValue>[0],
  afterTracks: Parameters<typeof relationshipTrackValue>[0],
): readonly M6RelationshipDirectionReport[] {
  const actorIds = beforeTracks.map(({ actorId }) => actorId);
  return Object.freeze(
    actorIds.map((actorId) => {
      const before = relationshipTrackValue(beforeTracks, actorId);
      const after = relationshipTrackValue(afterTracks, actorId);
      const delta = after - before;
      return Object.freeze({
        actorId,
        before,
        after,
        delta,
        directionId: delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat',
      });
    }),
  );
}

function runSample(scenario: M6OffFieldScenarioDefinition): M6OffFieldSampleReport {
  const scenarioId = `m6_off_field:${scenario.scenarioProfileId}`;
  const result = executeWrOffFieldCareer({
    scenarioId,
    fixture: {
      careerSeed: scenario.seed,
      displayName: 'M6 Off-field Simulation Athlete',
      archetypeId: scenario.archetypeId,
      recruitingBackgroundId: scenario.recruitingBackgroundId,
      baseStateOverrides: {
        state_brand: scenario.initialBrand,
        state_gpa: scenario.initialGpa,
      },
    },
    actionPlan: scenario.actionPlan,
    decisionStrategyId: scenario.decisionStrategyId,
    eventChoicePolicy: scenario.eventChoicePolicy,
    injuryChoicePolicy: scenario.injuryChoicePolicy,
    preferredSkillFamilyIds: scenario.preferredSkillFamilyIds,
    skillChoicePolicy: 'preferred_family',
    programSelectionPolicy: scenario.programSelectionPolicy,
    nilDecisionPolicy: scenario.nilDecisionPolicy,
    offseasonChoicePolicy: scenario.offseasonChoicePolicy,
    serializationMode: 'every_transition',
  });
  const offerDecisions = result.nilHistory.filter(
    (entry) => entry.model === 'nil_offer_decision_v1',
  );
  const obligationResolutions = result.nilHistory.filter(
    (entry) => entry.model === 'nil_obligation_resolution_v1',
  );
  const directions = relationshipDirections(
    result.relationshipTracksBeforeSeason,
    result.relationshipTracksAtDecision,
  );
  const openingWeek = result.weeks.at(-1);
  if (
    openingWeek === undefined ||
    openingWeek.seasonIndex !== 1 ||
    openingWeek.gameSummary === null
  ) {
    throw new Error(`M6 scenario ${scenario.scenarioProfileId} is missing its opening game.`);
  }
  return Object.freeze({
    scenarioId,
    seed: scenario.seed,
    reproduction: formatScenarioReproduction({ scenarioId, seed: scenario.seed }),
    scenarioProfileId: scenario.scenarioProfileId,
    archetypeId: scenario.archetypeId,
    recruitingBackgroundId: scenario.recruitingBackgroundId,
    recruitTierId: result.recruitTierId,
    academicRiskId: scenario.academicRiskId,
    academicCheckpointStatusIds: result.academicCheckpoints.map(({ statusAfter }) => statusAfter),
    relationshipStrategyId: scenario.relationshipStrategyId,
    relationshipDirections: directions,
    nilDecisionPolicy: scenario.nilDecisionPolicy,
    nilOfferIds: uniqueSorted(offerDecisions.map(({ offer }) => offer.offerId)),
    nilAcceptedCount: offerDecisions.filter(({ decisionId }) => decisionId === 'ACCEPT').length,
    nilDeclinedCount: offerDecisions.filter(({ decisionId }) => decisionId === 'DECLINE').length,
    nilFulfilledCount: obligationResolutions.filter(
      ({ resolutionId }) => resolutionId === 'FULFILL',
    ).length,
    nilDefaultedCount: obligationResolutions.filter(
      ({ resolutionId }) => resolutionId === 'DEFAULT',
    ).length,
    fictionalFundsUsd: result.fictionalFundsUsd,
    offseasonChoicePolicy: scenario.offseasonChoicePolicy,
    initialProgramId: result.initialProgramId,
    selectedProgramId: result.selectedProgramId,
    initialProgramStrengthBandId: result.initialProgramStrengthBandId,
    selectedProgramStrengthBandId: result.selectedProgramStrengthBandId,
    programChanged: result.initialProgramId !== result.selectedProgramId,
    selectedCoachChangeId: result.coachChangeId,
    schemeChanged: result.schemeChanged,
    observedWorldCoachChangeIds: uniqueSorted(result.worldCoachChangeIds),
    initialRoleId: result.initialRoleId,
    firstSeasonFinalRoleId: result.completedSeason.finalRoleId,
    projectedNextRoleId: result.projectedNextRoleId,
    actualNextRoleId: result.actualNextRoleId,
    openingGameRoleId: openingWeek.roleId,
    firstSeasonGamesPlayed: result.completedSeason.gamesPlayed,
    cumulativeGamesAfterOpening: result.session.career.gameCareerState.gamesPlayed,
    completedSeasonHistoryCount: result.session.world.completedSeasonHistory?.length ?? 0,
    totalRoundTripCount: result.totalRoundTripCount,
    allRoundTripsEquivalent: result.allRoundTripsEquivalent,
    careerRngDrawCount: result.careerRng.drawCount,
    worldRngDrawCount: result.worldRng.drawCount,
  });
}

export function runM6OffFieldTransferReport(): M6OffFieldTransferReport {
  if (contentManifest.contentVersion !== 1 || contentManifest.schemaVersion !== 9) {
    throw new Error('M6 report content identity changed.');
  }
  const samples = M6_OFF_FIELD_SCENARIOS.map(runSample);
  return Object.freeze({
    reportId: M6_OFF_FIELD_TRANSFER_REPORT_ID,
    contentCompatibilityVersion: CONTENT_COMPATIBILITY_VERSION,
    contentManifestSchemaVersion: 8,
    priorReportSha256: M6_PRIOR_REPORT_SHA256,
    scenarios: M6_OFF_FIELD_SCENARIOS,
    totalCareers: samples.length,
    segments: Object.freeze({
      recruitTier: segmentCounts(samples.map(({ recruitTierId }) => recruitTierId)),
      archetype: segmentCounts(samples.map(({ archetypeId }) => archetypeId)),
      programStrengthBand: segmentCounts(
        samples.map(({ initialProgramStrengthBandId }) => initialProgramStrengthBandId),
      ),
      academicRisk: segmentCounts(samples.map(({ academicRiskId }) => academicRiskId)),
      relationshipStrategy: segmentCounts(
        samples.map(({ relationshipStrategyId }) => relationshipStrategyId),
      ),
      nilDecisionPolicy: segmentCounts(samples.map(({ nilDecisionPolicy }) => nilDecisionPolicy)),
      offseasonChoicePolicy: segmentCounts(
        samples.map(({ offseasonChoicePolicy }) => offseasonChoicePolicy),
      ),
      selectedCoachChange: segmentCounts(
        samples.map(({ selectedCoachChangeId }) => selectedCoachChangeId),
      ),
      actualNextRole: segmentCounts(samples.map(({ actualNextRoleId }) => actualNextRoleId)),
    }),
    outcomes: Object.freeze({
      transferCareerCount: samples.filter(({ programChanged }) => programChanged).length,
      stayCareerCount: samples.filter(({ programChanged }) => !programChanged).length,
      schemeChangeCareerCount: samples.filter(({ schemeChanged }) => schemeChanged).length,
      observedAcademicStatusIds: uniqueSorted(
        samples.flatMap(({ academicCheckpointStatusIds }) => academicCheckpointStatusIds),
      ),
      observedRelationshipDirectionIds: uniqueSorted(
        samples.flatMap(({ relationshipDirections }) =>
          relationshipDirections.map(({ directionId }) => directionId),
        ),
      ),
      observedNilOfferIds: uniqueSorted(samples.flatMap(({ nilOfferIds }) => nilOfferIds)),
      observedWorldCoachChangeIds: uniqueSorted(
        samples.flatMap(({ observedWorldCoachChangeIds }) => observedWorldCoachChangeIds),
      ),
      observedNextRoleIds: uniqueSorted(samples.map(({ actualNextRoleId }) => actualNextRoleId)),
    }),
    samples: Object.freeze(samples),
  });
}

export function formatM6OffFieldTransferReport(report: M6OffFieldTransferReport): string {
  return JSON.stringify(report);
}
