import { CONTENT_COMPATIBILITY_VERSION, contentManifest } from '@project-saturday/game-content';
import type {
  PlayerArchetypeId,
  PositionId,
  ProgramId,
  RecruitingBackgroundId,
} from '@project-saturday/game-core';

import {
  executePositionAlphaCareer,
  type ExecutePositionAlphaCareerInput,
  type PositionDecisionStrategy,
  type PositionOffseasonPolicy,
} from '../builders/position-alpha-career.js';
import { M6_PRIOR_REPORT_SHA256 } from './m6-off-field-transfer.js';

export const M7_FOUR_POSITION_REPORT_ID = 'm7_four_position_alpha_v1' as const;
export const M7_PRIOR_REPORT_SHA256 = Object.freeze({
  ...M6_PRIOR_REPORT_SHA256,
  'm6-off-field-transfer-baseline.jsonl':
    'ce2dbfd44a317ba52370196cb4fea3a6b07c1b772bf887c2c2e1e8075b09354a',
} as const);

export type M7PositionScenarioDefinition = ExecutePositionAlphaCareerInput;

export const M7_POSITION_SCENARIOS = Object.freeze([
  {
    scenarioId: 'qb_field_general_stay',
    seed: 'm7-report-qb-field-general',
    positionId: 'position_qb',
    archetypeId: 'archetype_qb_field_general',
    recruitingBackgroundId: 'background_late_bloomer',
    initialProgramId: 'program_ember_peak_polytechnic',
    decisionStrategy: 'best_fit',
    offseasonPolicy: 'stay',
  },
  {
    scenarioId: 'qb_dual_threat_transfer',
    seed: 'm7-report-qb-dual-threat',
    positionId: 'position_qb',
    archetypeId: 'archetype_qb_dual_threat',
    recruitingBackgroundId: 'background_under_recruited_athlete',
    initialProgramId: 'program_capital_commonwealth',
    decisionStrategy: 'risk_seeking',
    offseasonPolicy: 'first_transfer',
  },
  {
    scenarioId: 'rb_power_stay',
    seed: 'm7-report-rb-power',
    positionId: 'position_rb',
    archetypeId: 'archetype_rb_power_back',
    recruitingBackgroundId: 'background_blue_chip_star',
    initialProgramId: 'program_ironwood',
    decisionStrategy: 'best_fit',
    offseasonPolicy: 'stay',
  },
  {
    scenarioId: 'rb_all_purpose_transfer',
    seed: 'm7-report-rb-all-purpose',
    positionId: 'position_rb',
    archetypeId: 'archetype_rb_all_purpose',
    recruitingBackgroundId: 'background_small_town_star',
    initialProgramId: 'program_gulf_meridian',
    decisionStrategy: 'risk_seeking',
    offseasonPolicy: 'first_transfer',
  },
  {
    scenarioId: 'cb_press_stay',
    seed: 'm7-report-cb-press',
    positionId: 'position_cb',
    archetypeId: 'archetype_cb_press_man',
    recruitingBackgroundId: 'background_legacy_recruit',
    initialProgramId: 'program_high_desert_state',
    decisionStrategy: 'best_fit',
    offseasonPolicy: 'stay',
  },
  {
    scenarioId: 'cb_ball_hawk_transfer',
    seed: 'm7-report-cb-ball-hawk',
    positionId: 'position_cb',
    archetypeId: 'archetype_cb_ball_hawk',
    recruitingBackgroundId: 'background_late_bloomer',
    initialProgramId: 'program_cascade_tech',
    decisionStrategy: 'risk_seeking',
    offseasonPolicy: 'first_transfer',
  },
] as const satisfies readonly M7PositionScenarioDefinition[]);

export interface M7PositionSampleReport {
  readonly scenarioId: string;
  readonly seed: string;
  readonly reproduction: string;
  readonly positionId: PositionId;
  readonly archetypeId: PlayerArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly recruitTierId: string;
  readonly initialProgramId: ProgramId;
  readonly selectedProgramId: ProgramId;
  readonly initialRoleId: string;
  readonly secondSeasonRoleId: string;
  readonly decisionStrategy: PositionDecisionStrategy;
  readonly offseasonPolicy: PositionOffseasonPolicy;
  readonly gameCount: number;
  readonly totalKeySnaps: number;
  readonly averageGrade: number;
  readonly injuryRiskMinimumPermille: number;
  readonly injuryRiskMaximumPermille: number;
  readonly eligibilityTagIds: readonly string[];
  readonly finalRelationshipValues: readonly number[];
  readonly lifecycleRoundTripCount: number;
  readonly careerRngDrawCount: number;
  readonly worldRngDrawCount: number;
  readonly seasonsPlayed: number;
  readonly programHistoryCount: number;
}

export interface M7SegmentCount {
  readonly id: string;
  readonly careerCount: number;
}

export interface M7FourPositionReport {
  readonly reportId: typeof M7_FOUR_POSITION_REPORT_ID;
  readonly contentCompatibilityVersion: number;
  readonly contentManifestSchemaVersion: number;
  readonly priorReportSha256: typeof M7_PRIOR_REPORT_SHA256;
  readonly historicalWrEvidence: {
    readonly positionId: 'position_wr';
    readonly reportFile: 'm6-off-field-transfer-baseline.jsonl';
    readonly sha256: string;
  };
  readonly positionsCovered: readonly PositionId[];
  readonly scenarios: readonly M7PositionScenarioDefinition[];
  readonly samples: readonly M7PositionSampleReport[];
  readonly segments: {
    readonly position: readonly M7SegmentCount[];
    readonly archetype: readonly M7SegmentCount[];
    readonly background: readonly M7SegmentCount[];
    readonly initialProgram: readonly M7SegmentCount[];
    readonly recruitTier: readonly M7SegmentCount[];
    readonly initialRole: readonly M7SegmentCount[];
    readonly secondSeasonRole: readonly M7SegmentCount[];
    readonly decisionStrategy: readonly M7SegmentCount[];
    readonly offseasonPolicy: readonly M7SegmentCount[];
  };
}

function segmentCounts(ids: readonly string[]): readonly M7SegmentCount[] {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, careerCount]) => ({ id, careerCount }));
}

export function runM7FourPositionReport(): M7FourPositionReport {
  const samples = M7_POSITION_SCENARIOS.map((scenario): M7PositionSampleReport => {
    const result = executePositionAlphaCareer(scenario);
    const alumnus = result.meta.alumni[0]!;
    return Object.freeze({
      scenarioId: result.scenarioId,
      seed: result.seed,
      reproduction: `report=${M7_FOUR_POSITION_REPORT_ID};scenario=${result.scenarioId};seed=${JSON.stringify(result.seed)}`,
      positionId: result.positionId,
      archetypeId: result.archetypeId,
      recruitingBackgroundId: result.recruitingBackgroundId,
      recruitTierId: result.recruitTierId,
      initialProgramId: result.initialProgramId,
      selectedProgramId: result.selectedProgramId,
      initialRoleId: result.initialRoleId,
      secondSeasonRoleId: result.secondSeasonRoleId,
      decisionStrategy: result.decisionStrategy,
      offseasonPolicy: result.offseasonPolicy,
      gameCount: result.gameCount,
      totalKeySnaps: result.totalKeySnaps,
      averageGrade: result.averageGrade,
      injuryRiskMinimumPermille: result.injuryRiskMinimumPermille,
      injuryRiskMaximumPermille: result.injuryRiskMaximumPermille,
      eligibilityTagIds: result.eligibilityTagIds,
      finalRelationshipValues: result.relationshipValues,
      lifecycleRoundTripCount: result.lifecycleRoundTripCount,
      careerRngDrawCount: result.careerRngDrawCount,
      worldRngDrawCount: result.worldRngDrawCount,
      seasonsPlayed: alumnus.seasonsPlayed,
      programHistoryCount: result.lifecycle.programHistory.length,
    });
  });
  return Object.freeze({
    reportId: M7_FOUR_POSITION_REPORT_ID,
    contentCompatibilityVersion: CONTENT_COMPATIBILITY_VERSION,
    contentManifestSchemaVersion: contentManifest.schemaVersion,
    priorReportSha256: M7_PRIOR_REPORT_SHA256,
    historicalWrEvidence: {
      positionId: 'position_wr' as const,
      reportFile: 'm6-off-field-transfer-baseline.jsonl' as const,
      sha256: M7_PRIOR_REPORT_SHA256['m6-off-field-transfer-baseline.jsonl'],
    },
    positionsCovered: ['position_qb', 'position_rb', 'position_wr', 'position_cb'] as const,
    scenarios: M7_POSITION_SCENARIOS,
    samples,
    segments: {
      position: segmentCounts(samples.map(({ positionId }) => positionId)),
      archetype: segmentCounts(samples.map(({ archetypeId }) => archetypeId)),
      background: segmentCounts(
        samples.map(({ recruitingBackgroundId }) => recruitingBackgroundId),
      ),
      initialProgram: segmentCounts(samples.map(({ initialProgramId }) => initialProgramId)),
      recruitTier: segmentCounts(samples.map(({ recruitTierId }) => recruitTierId)),
      initialRole: segmentCounts(samples.map(({ initialRoleId }) => initialRoleId)),
      secondSeasonRole: segmentCounts(samples.map(({ secondSeasonRoleId }) => secondSeasonRoleId)),
      decisionStrategy: segmentCounts(samples.map(({ decisionStrategy }) => decisionStrategy)),
      offseasonPolicy: segmentCounts(samples.map(({ offseasonPolicy }) => offseasonPolicy)),
    },
  });
}

export function formatM7FourPositionReport(report: M7FourPositionReport): string {
  return JSON.stringify(report);
}
