import {
  CONTENT_COMPATIBILITY_VERSION,
  SKILL_GRADE_IDS,
  type SKILL_FAMILY_IDS,
  type SKILL_IDS,
} from '@project-saturday/game-content';
import {
  contentManifest,
  developmentWeekConfig,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';
import {
  deriveOwnedSkillIds,
  parseCareerRun,
  setEquippedSkillSlot,
} from '@project-saturday/game-core';
import type {
  CareerRun,
  EquippedSkillIds,
  RngSeed,
  RngState,
  SkillAcquisitionRecord,
  SkillBehaviorAffinityCount,
  SkillId,
  WeeklyActionResult,
} from '@project-saturday/game-core';

import {
  executeWrSkillDevelopmentWeek,
  selectPreferredOfferedSkill,
  type ExecutedWrSkillDevelopmentWeek,
  type SkillAwareWeeklyActionPlan,
  type SkillCareerSerializationMode,
} from '../builders/wr-skill-career.js';
import { createWrCareerFixture } from '../builders/wr-career.js';
import { formatScenarioReproduction } from '../scenario.js';

export const M2_SKILL_BUILD_REPORT_ID = 'm2_skill_build_baseline_v1' as const;
export const M2_CONTROLLED_BUILD_SEED = 'm2-control-low-003' as const satisfies RngSeed;

/** Frozen M2 catalog boundary: later additive cards must not rewrite historical evidence. */
export const M2_SKILL_IDS = Object.freeze([
  'skill_route_notebook_c',
  'skill_first_step_lab_b',
  'skill_secure_hands_routine_b',
  'skill_full_route_circuit_a',
  'skill_recovery_window_c',
  'skill_late_set_engine_b',
  'skill_empty_tank_reps_a',
  'skill_compressed_recovery_s',
  'skill_one_more_rep_c',
  'skill_broad_horizon_b',
  'skill_edge_of_focus_a',
  'skill_reset_ritual_b',
  'skill_coverage_ledger_b',
  'skill_high_point_wager_a',
  'skill_open_field_dare_s',
  'skill_study_buffer_c',
  'skill_balanced_calendar_b',
  'skill_two_track_week_a',
] as const satisfies readonly (typeof SKILL_IDS)[number][]);

export const M2_SKILL_FAMILY_IDS = Object.freeze([
  'skill_family_development',
  'skill_family_game_day',
  'skill_family_body',
  'skill_family_mindset',
  'skill_family_life',
] as const satisfies readonly (typeof SKILL_FAMILY_IDS)[number][]);

const M2_SKILL_MECHANICS_DEFINITIONS = Object.freeze(
  skillMechanicsDefinitions.filter(({ id }) => M2_SKILL_IDS.some((skillId) => skillId === id)),
);

export const M2_SKILL_OFFER_SEEDS = Object.freeze([
  'm2-offer-001',
  'm2-offer-002',
  'm2-offer-003',
  'm2-offer-004',
  'm2-offer-005',
  'm2-offer-006',
  'm2-offer-007',
  'm2-offer-008',
  'm2-offer-009',
  'm2-offer-010',
  'm2-offer-011',
  'm2-offer-012',
  'm2-offer-013',
  'm2-offer-014',
  'm2-offer-015',
  'm2-offer-016',
  'm2-offer-017',
  'm2-offer-018',
  'm2-offer-019',
  'm2-offer-020',
  'm2-offer-021',
  'm2-offer-022',
  'm2-offer-023',
  'm2-offer-024',
  'm2-offer-025',
  'm2-offer-026',
  'm2-offer-027',
  'm2-offer-028',
  'm2-offer-029',
  'm2-offer-030',
  'm2-offer-031',
  'm2-offer-032',
  'm2-offer-033',
  'm2-offer-034',
  'm2-offer-035',
  'm2-offer-036',
  'm2-offer-037',
  'm2-offer-038',
  'm2-offer-039',
  'm2-offer-040',
  'm2-offer-041',
  'm2-offer-042',
  'm2-offer-043',
  'm2-offer-044',
  'm2-offer-045',
  'm2-offer-046',
  'm2-offer-047',
  'm2-offer-048',
  'm2-offer-049',
  'm2-offer-050',
  'm2-offer-051',
  'm2-offer-052',
  'm2-offer-053',
  'm2-offer-054',
  'm2-offer-055',
  'm2-offer-056',
  'm2-offer-057',
  'm2-offer-058',
  'm2-offer-059',
  'm2-offer-060',
  'm2-offer-061',
  'm2-offer-062',
  'm2-offer-063',
  'm2-offer-064',
] as const satisfies readonly RngSeed[]);

type CatalogSkillId = (typeof M2_SKILL_IDS)[number];
type CatalogSkillFamilyId = (typeof M2_SKILL_FAMILY_IDS)[number];
type CatalogSkillGradeId = (typeof SKILL_GRADE_IDS)[number];

export type M2OfferStrategyId = 'film_repeat' | 'weight_repeat';

export interface M2OfferStrategyDefinition {
  readonly strategyId: M2OfferStrategyId;
  readonly actionPlan: SkillAwareWeeklyActionPlan;
  readonly associatedSkillId: CatalogSkillId;
  readonly associatedAffinityTagId: 'action_focus_film_study' | 'action_focus_strength';
  readonly preferredSkillIds: readonly CatalogSkillId[];
}

export const M2_OFFER_STRATEGIES = Object.freeze([
  {
    strategyId: 'film_repeat',
    actionPlan: ['action_film_study', 'action_film_study', 'action_film_study'],
    associatedSkillId: 'skill_coverage_ledger_b',
    associatedAffinityTagId: 'action_focus_film_study',
    preferredSkillIds: ['skill_coverage_ledger_b'],
  },
  {
    strategyId: 'weight_repeat',
    actionPlan: ['action_weight_room', 'action_weight_room', 'action_weight_room'],
    associatedSkillId: 'skill_late_set_engine_b',
    associatedAffinityTagId: 'action_focus_strength',
    preferredSkillIds: ['skill_late_set_engine_b'],
  },
] as const satisfies readonly M2OfferStrategyDefinition[]);

const AVAILABLE_ACTION_IDS = Object.freeze(weeklyActionDefinitions.map(({ id }) => id));
const CONTROLLED_ACQUISITION_PLAN = Object.freeze([
  'action_weight_room',
  'action_weight_room',
  'action_weight_room',
] as const satisfies SkillAwareWeeklyActionPlan);
const CONTROLLED_COMPARISON_PLAN = Object.freeze([
  'action_film_study',
  'action_recovery',
  'action_study_hall',
] as const satisfies SkillAwareWeeklyActionPlan);
const CONTROLLED_TARGET_SKILL_IDS = Object.freeze([
  'skill_coverage_ledger_b',
  'skill_recovery_window_c',
] as const satisfies readonly CatalogSkillId[]);

export interface CountRatePermille {
  readonly count: number;
  readonly ratePermille: number;
}

export interface M2OfferSampleReport {
  readonly seed: RngSeed;
  readonly reproduction: string;
  readonly offeredSkillIds: readonly [SkillId, SkillId, SkillId];
  readonly selectedSkillId: SkillId;
  readonly rngBeforeAdvance: RngState;
  readonly rngAfterOffer: RngState;
  readonly rngAfterChoice: RngState;
  readonly offerRngDrawCountBefore: number;
  readonly offerRngDrawCountAfter: number;
  readonly distinctOffer: boolean;
  readonly unownedOffer: boolean;
  readonly acquisitionMatchesOffer: boolean;
  readonly choiceConsumedRng: boolean;
  readonly reloadEquivalent: boolean;
}

export interface M2OfferStrategyReport {
  readonly strategyId: M2OfferStrategyId;
  readonly actionPlan: SkillAwareWeeklyActionPlan;
  readonly associatedSkillId: CatalogSkillId;
  readonly associatedAffinityTagId: M2OfferStrategyDefinition['associatedAffinityTagId'];
  readonly careerCount: number;
  readonly offerSlotCount: number;
  readonly pickCount: number;
  readonly behaviorCounts: readonly SkillBehaviorAffinityCount[];
  readonly candidateWeights: Readonly<Record<CatalogSkillId, number>>;
  readonly offersBySkill: Readonly<Record<CatalogSkillId, CountRatePermille>>;
  readonly picksBySkill: Readonly<Record<CatalogSkillId, CountRatePermille>>;
  readonly offersByFamily: Readonly<Record<CatalogSkillFamilyId, CountRatePermille>>;
  readonly picksByFamily: Readonly<Record<CatalogSkillFamilyId, CountRatePermille>>;
  readonly offersByGrade: Readonly<Record<CatalogSkillGradeId, CountRatePermille>>;
  readonly picksByGrade: Readonly<Record<CatalogSkillGradeId, CountRatePermille>>;
  readonly samples: readonly M2OfferSampleReport[];
}

export interface M2AffinityDirectionReport {
  readonly skillId: CatalogSkillId;
  readonly favoredStrategyId: M2OfferStrategyId;
  readonly comparisonStrategyId: M2OfferStrategyId;
  readonly baseOfferWeight: number;
  readonly favoredWeight: number;
  readonly comparisonWeight: number;
  readonly favoredOfferRatePermille: number;
  readonly comparisonOfferRatePermille: number;
  readonly offerRateDeltaPermille: number;
}

export interface ControlledBuildVariantReport {
  readonly buildId: 'coverage_ledger' | 'recovery_window';
  readonly equippedSkillIds: EquippedSkillIds;
  readonly revisionBeforeActions: number;
  readonly rngBeforeActions: RngState;
  readonly bodyBeforeActions: number;
  readonly results: readonly [M2WeeklyActionResult, M2WeeklyActionResult, M2WeeklyActionResult];
  readonly passiveBodyRecovery: ExecutedWrSkillDevelopmentWeek['passiveBodyRecovery'];
  readonly finalBody: number;
  readonly finalFootballIqRating: number;
  readonly finalFootballIqXp: number;
  readonly finalRevision: number;
  readonly finalRng: RngState;
}

type M2WeeklyActionResult = Omit<WeeklyActionResult, 'practiceImpact'>;

function toM2WeeklyActionResult(result: WeeklyActionResult): M2WeeklyActionResult {
  const { practiceImpact, ...m2Result } = result;
  void practiceImpact;
  return m2Result;
}

export interface M2ControlledBuildReport {
  readonly seed: typeof M2_CONTROLLED_BUILD_SEED;
  readonly reproduction: string;
  readonly acquisitionWeekCount: 13;
  readonly acquisitionPlan: SkillAwareWeeklyActionPlan;
  readonly comparisonPlan: SkillAwareWeeklyActionPlan;
  readonly sharedAcquisitions: readonly SkillAcquisitionRecord[];
  readonly sharedOwnedSkillIds: readonly SkillId[];
  readonly sharedEquippedSkillIds: EquippedSkillIds;
  readonly sharedBody: number;
  readonly sharedRevision: number;
  readonly sharedRng: RngState;
  readonly sharedReloadEquivalent: boolean;
  readonly sourceUnmodifiedByBranching: boolean;
  readonly branchesEqualExceptLoadout: boolean;
  readonly loadoutCommandCountPerBranch: number;
  readonly variants: readonly [ControlledBuildVariantReport, ControlledBuildVariantReport];
  readonly filmAwardedXpDelta: number;
  readonly recoveryActualBodyDeltaDelta: number;
  readonly finalBodyDelta: number;
}

export interface M2SkillBuildReport {
  readonly reportId: typeof M2_SKILL_BUILD_REPORT_ID;
  readonly contentCompatibilityVersion: typeof CONTENT_COMPATIBILITY_VERSION;
  readonly contentManifestSchemaVersion: 2;
  readonly skillCatalogIds: typeof M2_SKILL_IDS;
  readonly skillCatalogCardinality: number;
  readonly offerSeeds: readonly RngSeed[];
  readonly offerSeedCount: number;
  readonly totalOfferCareers: number;
  readonly offerStrategies: readonly M2OfferStrategyReport[];
  readonly affinityDirections: readonly M2AffinityDirectionReport[];
  readonly controlledBuild: M2ControlledBuildReport;
}

export class M2SkillBuildSimulationError extends Error {
  public readonly scenarioId: string;

  public constructor(scenarioId: string, reason: string) {
    super(`scenario=${JSON.stringify(scenarioId)} reason=${reason}`);
    this.name = 'M2SkillBuildSimulationError';
    this.scenarioId = scenarioId;
  }
}

function fail(scenarioId: string, reason: string): never {
  throw new M2SkillBuildSimulationError(scenarioId, reason);
}

function ratePermille(count: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((count * 1_000) / denominator);
}

function emptyCounts<TId extends string>(ids: readonly TId[]): Record<TId, number> {
  return Object.fromEntries(ids.map((id) => [id, 0])) as Record<TId, number>;
}

function countRates<TId extends string>(
  ids: readonly TId[],
  counts: Readonly<Record<TId, number>>,
  denominator: number,
): Readonly<Record<TId, CountRatePermille>> {
  return Object.freeze(
    Object.fromEntries(
      ids.map((id) => [
        id,
        Object.freeze({ count: counts[id], ratePermille: ratePermille(counts[id], denominator) }),
      ]),
    ) as Record<TId, CountRatePermille>,
  );
}

function isCatalogSkillId(skillId: SkillId): skillId is CatalogSkillId {
  return M2_SKILL_IDS.some((catalogSkillId) => catalogSkillId === skillId);
}

function mechanicsForSkill(skillId: SkillId) {
  const definition = M2_SKILL_MECHANICS_DEFINITIONS.find(({ id }) => id === skillId);
  if (definition === undefined) {
    return fail('m2_skill_catalog', `missing_skill_definition:${skillId}`);
  }
  return definition;
}

function executeWeek(
  scenarioId: string,
  career: CareerRun,
  actionPlan: SkillAwareWeeklyActionPlan,
  preferredSkillIds: readonly SkillId[],
  serializationMode: SkillCareerSerializationMode,
): ExecutedWrSkillDevelopmentWeek {
  return executeWrSkillDevelopmentWeek({
    scenarioId,
    career,
    actionPlan,
    availableActionIds: AVAILABLE_ACTION_IDS,
    actionDefinitions: weeklyActionDefinitions,
    skillDefinitions: M2_SKILL_MECHANICS_DEFINITIONS,
    config: developmentWeekConfig,
    serializationMode,
    choicePolicy: ({ offer }) =>
      selectPreferredOfferedSkill(offer.offeredSkillIds, preferredSkillIds),
  });
}

function offerSample(
  strategy: M2OfferStrategyDefinition,
  seed: RngSeed,
): { readonly sample: M2OfferSampleReport; readonly execution: ExecutedWrSkillDevelopmentWeek } {
  const scenarioId = `m2_offer_${strategy.strategyId}`;
  const initialCareer = createWrCareerFixture({ careerSeed: seed });
  const uninterrupted = executeWeek(
    scenarioId,
    initialCareer,
    strategy.actionPlan,
    strategy.preferredSkillIds,
    'none',
  );
  const serialized = executeWeek(
    scenarioId,
    initialCareer,
    strategy.actionPlan,
    strategy.preferredSkillIds,
    'every_transition',
  );
  const breakthrough = uninterrupted.breakthrough;
  if (breakthrough === null) {
    return fail(scenarioId, 'missing_first_week_breakthrough');
  }
  const reloadEquivalent = JSON.stringify(serialized) === JSON.stringify(uninterrupted);
  const distinctOffer = new Set(breakthrough.offer.offeredSkillIds).size === 3;
  const ownedBefore = new Set(breakthrough.ownedSkillIdsBefore);
  const unownedOffer = breakthrough.offer.offeredSkillIds.every(
    (skillId) => !ownedBefore.has(skillId),
  );
  const acquisitionMatchesOffer =
    JSON.stringify(breakthrough.acquisition) ===
    JSON.stringify({ ...breakthrough.offer, selectedSkillId: breakthrough.selectedSkillId });

  return Object.freeze({
    execution: uninterrupted,
    sample: Object.freeze({
      seed,
      reproduction: formatScenarioReproduction({ scenarioId, seed }),
      offeredSkillIds: breakthrough.offer.offeredSkillIds,
      selectedSkillId: breakthrough.selectedSkillId,
      rngBeforeAdvance: breakthrough.rngBeforeAdvance,
      rngAfterOffer: breakthrough.rngAfterOffer,
      rngAfterChoice: breakthrough.rngAfterChoice,
      offerRngDrawCountBefore: breakthrough.offer.rngDrawCountBefore,
      offerRngDrawCountAfter: breakthrough.offer.rngDrawCountAfter,
      distinctOffer,
      unownedOffer,
      acquisitionMatchesOffer,
      choiceConsumedRng:
        breakthrough.rngDrawCountAfterChoice !== breakthrough.rngDrawCountBeforeChoice,
      reloadEquivalent,
    }),
  });
}

function strategyReport(
  strategy: M2OfferStrategyDefinition,
  seeds: readonly RngSeed[],
): M2OfferStrategyReport {
  const offerCounts = emptyCounts(M2_SKILL_IDS);
  const pickCounts = emptyCounts(M2_SKILL_IDS);
  const offerFamilyCounts = emptyCounts(M2_SKILL_FAMILY_IDS);
  const pickFamilyCounts = emptyCounts(M2_SKILL_FAMILY_IDS);
  const offerGradeCounts = emptyCounts(SKILL_GRADE_IDS);
  const pickGradeCounts = emptyCounts(SKILL_GRADE_IDS);
  const samples: M2OfferSampleReport[] = [];
  let behaviorCounts: readonly SkillBehaviorAffinityCount[] | null = null;
  let candidateWeights: Readonly<Record<CatalogSkillId, number>> | null = null;

  for (const seed of seeds) {
    const { execution, sample } = offerSample(strategy, seed);
    const breakthrough = execution.breakthrough;
    if (breakthrough === null) {
      return fail(strategy.strategyId, 'missing_breakthrough');
    }
    samples.push(sample);
    behaviorCounts ??= breakthrough.behaviorCounts;
    const weights = emptyCounts(M2_SKILL_IDS);
    for (const candidate of breakthrough.weightedCandidates) {
      if (!isCatalogSkillId(candidate.skillId)) {
        return fail(strategy.strategyId, `unknown_candidate:${candidate.skillId}`);
      }
      weights[candidate.skillId] = candidate.weight;
    }
    if (candidateWeights === null) {
      candidateWeights = Object.freeze(weights);
    } else if (JSON.stringify(candidateWeights) !== JSON.stringify(weights)) {
      return fail(strategy.strategyId, `seed_dependent_weights:${String(seed)}`);
    }

    for (const skillId of sample.offeredSkillIds) {
      if (!isCatalogSkillId(skillId)) {
        return fail(strategy.strategyId, `unknown_offered_skill:${skillId}`);
      }
      offerCounts[skillId] += 1;
      const mechanics = mechanicsForSkill(skillId);
      offerFamilyCounts[mechanics.familyId as CatalogSkillFamilyId] += 1;
      offerGradeCounts[mechanics.gradeId as CatalogSkillGradeId] += 1;
    }
    if (!isCatalogSkillId(sample.selectedSkillId)) {
      return fail(strategy.strategyId, `unknown_selected_skill:${sample.selectedSkillId}`);
    }
    pickCounts[sample.selectedSkillId] += 1;
    const selectedMechanics = mechanicsForSkill(sample.selectedSkillId);
    pickFamilyCounts[selectedMechanics.familyId as CatalogSkillFamilyId] += 1;
    pickGradeCounts[selectedMechanics.gradeId as CatalogSkillGradeId] += 1;
  }

  if (behaviorCounts === null || candidateWeights === null) {
    return fail(strategy.strategyId, 'empty_seed_set');
  }
  const offerSlotCount = seeds.length * 3;
  return Object.freeze({
    strategyId: strategy.strategyId,
    actionPlan: strategy.actionPlan,
    associatedSkillId: strategy.associatedSkillId,
    associatedAffinityTagId: strategy.associatedAffinityTagId,
    careerCount: seeds.length,
    offerSlotCount,
    pickCount: seeds.length,
    behaviorCounts,
    candidateWeights,
    offersBySkill: countRates(M2_SKILL_IDS, offerCounts, offerSlotCount),
    picksBySkill: countRates(M2_SKILL_IDS, pickCounts, seeds.length),
    offersByFamily: countRates(M2_SKILL_FAMILY_IDS, offerFamilyCounts, offerSlotCount),
    picksByFamily: countRates(M2_SKILL_FAMILY_IDS, pickFamilyCounts, seeds.length),
    offersByGrade: countRates(SKILL_GRADE_IDS, offerGradeCounts, offerSlotCount),
    picksByGrade: countRates(SKILL_GRADE_IDS, pickGradeCounts, seeds.length),
    samples: Object.freeze(samples),
  });
}

function affinityDirection(
  skillId: CatalogSkillId,
  favored: M2OfferStrategyReport,
  comparison: M2OfferStrategyReport,
): M2AffinityDirectionReport {
  const mechanics = mechanicsForSkill(skillId);
  const favoredWeight = favored.candidateWeights[skillId];
  const comparisonWeight = comparison.candidateWeights[skillId];
  const favoredOfferRatePermille = favored.offersBySkill[skillId].ratePermille;
  const comparisonOfferRatePermille = comparison.offersBySkill[skillId].ratePermille;
  if (favoredWeight <= comparisonWeight) {
    return fail(skillId, 'affinity_did_not_increase_weight');
  }
  if (favoredOfferRatePermille <= comparisonOfferRatePermille) {
    return fail(skillId, 'paired_offer_rate_did_not_increase');
  }
  return Object.freeze({
    skillId,
    favoredStrategyId: favored.strategyId,
    comparisonStrategyId: comparison.strategyId,
    baseOfferWeight: mechanics.baseOfferWeight,
    favoredWeight,
    comparisonWeight,
    favoredOfferRatePermille,
    comparisonOfferRatePermille,
    offerRateDeltaPermille: favoredOfferRatePermille - comparisonOfferRatePermille,
  });
}

function buildControlledSharedCareer(serializationMode: SkillCareerSerializationMode): {
  readonly career: CareerRun;
  readonly executions: readonly ExecutedWrSkillDevelopmentWeek[];
} {
  const scenarioId = 'm2_controlled_acquisition';
  let career = createWrCareerFixture({
    careerSeed: M2_CONTROLLED_BUILD_SEED,
    baseStateOverrides: { state_body: 50 },
  });
  const executions: ExecutedWrSkillDevelopmentWeek[] = [];
  for (let week = 0; week < 13; week += 1) {
    const execution = executeWeek(
      scenarioId,
      career,
      CONTROLLED_ACQUISITION_PLAN,
      CONTROLLED_TARGET_SKILL_IDS,
      serializationMode,
    );
    executions.push(execution);
    career = execution.career;
  }
  const owned = new Set(deriveOwnedSkillIds(career.player.skillState));
  for (const targetSkillId of CONTROLLED_TARGET_SKILL_IDS) {
    if (!owned.has(targetSkillId)) {
      return fail(scenarioId, `target_not_acquired:${targetSkillId}`);
    }
  }
  return Object.freeze({ career, executions: Object.freeze(executions) });
}

function roundTripCareer(career: CareerRun, scenarioId: string): CareerRun {
  const parsed = parseCareerRun(JSON.stringify(career));
  if (!parsed.ok) {
    return fail(scenarioId, parsed.reason);
  }
  return parsed.career;
}

function requireSetSlot(
  career: CareerRun,
  slotIndex: number,
  skillId: SkillId | null,
  scenarioId: string,
): CareerRun {
  const result = setEquippedSkillSlot(career, slotIndex, skillId);
  if (!result.ok) {
    return fail(scenarioId, result.reason);
  }
  return roundTripCareer(result.career, scenarioId);
}

function equipOnly(
  source: CareerRun,
  skillId: CatalogSkillId,
): { readonly career: CareerRun; readonly commandCount: number } {
  const scenarioId = `m2_controlled_loadout_${skillId}`;
  let career = source;
  let commandCount = 0;
  for (const [slotIndex, equippedSkillId] of career.player.skillState.equippedSkillIds.entries()) {
    if (equippedSkillId !== null) {
      career = requireSetSlot(career, slotIndex, null, scenarioId);
      commandCount += 1;
    }
  }
  career = requireSetSlot(career, 0, skillId, scenarioId);
  commandCount += 1;
  return Object.freeze({ career, commandCount });
}

function projectionWithoutLoadout(career: CareerRun): unknown {
  return {
    ...career,
    player: {
      ...career.player,
      skillState: { acquisitions: career.player.skillState.acquisitions },
    },
  };
}

function controlledVariant(
  buildId: ControlledBuildVariantReport['buildId'],
  career: CareerRun,
): ControlledBuildVariantReport {
  const execution = executeWeek(
    `m2_controlled_${buildId}`,
    career,
    CONTROLLED_COMPARISON_PLAN,
    [],
    'every_transition',
  );
  const footballIq = execution.career.player.attributes.mental.attribute_football_iq;
  return Object.freeze({
    buildId,
    equippedSkillIds: career.player.skillState.equippedSkillIds,
    revisionBeforeActions: career.revision,
    rngBeforeActions: career.rng,
    bodyBeforeActions: career.player.state.body,
    results: execution.actionResults.map(toM2WeeklyActionResult) as [
      M2WeeklyActionResult,
      M2WeeklyActionResult,
      M2WeeklyActionResult,
    ],
    passiveBodyRecovery: execution.passiveBodyRecovery,
    finalBody: execution.career.player.state.body,
    finalFootballIqRating: footballIq.rating,
    finalFootballIqXp: footballIq.xp,
    finalRevision: execution.career.revision,
    finalRng: execution.career.rng,
  });
}

function resultForAction(
  variant: ControlledBuildVariantReport,
  actionId: SkillAwareWeeklyActionPlan[number],
): M2WeeklyActionResult {
  const result = variant.results.find((candidate) => candidate.actionId === actionId);
  if (result === undefined) {
    return fail(variant.buildId, `missing_action_result:${actionId}`);
  }
  return result;
}

function buildControlledReport(): M2ControlledBuildReport {
  const uninterrupted = buildControlledSharedCareer('none');
  const serialized = buildControlledSharedCareer('every_transition');
  const sharedReloadEquivalent = JSON.stringify(uninterrupted) === JSON.stringify(serialized);
  const sharedCareer = uninterrupted.career;
  const sourceBeforeBranching = JSON.stringify(sharedCareer);
  const coverageSetup = equipOnly(sharedCareer, 'skill_coverage_ledger_b');
  const recoverySetup = equipOnly(sharedCareer, 'skill_recovery_window_c');
  const sourceUnmodifiedByBranching = JSON.stringify(sharedCareer) === sourceBeforeBranching;
  const branchesEqualExceptLoadout =
    JSON.stringify(projectionWithoutLoadout(coverageSetup.career)) ===
    JSON.stringify(projectionWithoutLoadout(recoverySetup.career));
  const coverage = controlledVariant('coverage_ledger', coverageSetup.career);
  const recovery = controlledVariant('recovery_window', recoverySetup.career);
  const coverageFilm = resultForAction(coverage, 'action_film_study');
  const recoveryFilm = resultForAction(recovery, 'action_film_study');
  const coverageRecovery = resultForAction(coverage, 'action_recovery');
  const recoveryRecovery = resultForAction(recovery, 'action_recovery');
  const coverageStudy = resultForAction(coverage, 'action_study_hall');
  const recoveryStudy = resultForAction(recovery, 'action_study_hall');
  const coverageFilmXp = coverageFilm.attributeXp[0]?.awardedXp ?? 0;
  const recoveryFilmXp = recoveryFilm.attributeXp[0]?.awardedXp ?? 0;

  if (!sharedReloadEquivalent) {
    return fail('m2_controlled_build', 'shared_reload_diverged');
  }
  if (!sourceUnmodifiedByBranching || !branchesEqualExceptLoadout) {
    return fail('m2_controlled_build', 'branches_are_not_controlled');
  }
  if (coverageSetup.commandCount !== recoverySetup.commandCount) {
    return fail('m2_controlled_build', 'loadout_command_count_mismatch');
  }
  if (coverageFilmXp <= recoveryFilmXp) {
    return fail('m2_controlled_build', 'coverage_did_not_increase_film_xp');
  }
  if (recoveryRecovery.actualBodyDelta <= coverageRecovery.actualBodyDelta) {
    return fail('m2_controlled_build', 'recovery_did_not_increase_body_gain');
  }
  if (
    !coverageFilm.appliedSkillEffects.some(
      ({ skillId, type }) =>
        skillId === 'skill_coverage_ledger_b' && type === 'action_xp_multiplier',
    ) ||
    recoveryFilm.appliedSkillEffects.length !== 0 ||
    coverageRecovery.appliedSkillEffects.length !== 0 ||
    !recoveryRecovery.appliedSkillEffects.some(
      ({ skillId, type }) =>
        skillId === 'skill_recovery_window_c' && type === 'action_body_delta_flat',
    ) ||
    coverageStudy.appliedSkillEffects.length !== 0 ||
    recoveryStudy.appliedSkillEffects.length !== 0
  ) {
    return fail('m2_controlled_build', 'unexpected_applied_skill_effects');
  }

  return Object.freeze({
    seed: M2_CONTROLLED_BUILD_SEED,
    reproduction: formatScenarioReproduction({
      scenarioId: 'm2_controlled_build',
      seed: M2_CONTROLLED_BUILD_SEED,
    }),
    acquisitionWeekCount: 13,
    acquisitionPlan: CONTROLLED_ACQUISITION_PLAN,
    comparisonPlan: CONTROLLED_COMPARISON_PLAN,
    sharedAcquisitions: sharedCareer.player.skillState.acquisitions,
    sharedOwnedSkillIds: deriveOwnedSkillIds(sharedCareer.player.skillState),
    sharedEquippedSkillIds: sharedCareer.player.skillState.equippedSkillIds,
    sharedBody: sharedCareer.player.state.body,
    sharedRevision: sharedCareer.revision,
    sharedRng: sharedCareer.rng,
    sharedReloadEquivalent,
    sourceUnmodifiedByBranching,
    branchesEqualExceptLoadout,
    loadoutCommandCountPerBranch: coverageSetup.commandCount,
    variants: Object.freeze([coverage, recovery] as const),
    filmAwardedXpDelta: coverageFilmXp - recoveryFilmXp,
    recoveryActualBodyDeltaDelta:
      recoveryRecovery.actualBodyDelta - coverageRecovery.actualBodyDelta,
    finalBodyDelta: recovery.finalBody - coverage.finalBody,
  });
}

export function runM2SkillBuildReport(
  seeds: readonly RngSeed[] = M2_SKILL_OFFER_SEEDS,
): M2SkillBuildReport {
  if (seeds.length === 0) {
    return fail(M2_SKILL_BUILD_REPORT_ID, 'empty_seed_set');
  }
  if (contentManifest.contentVersion !== 1) {
    return fail(M2_SKILL_BUILD_REPORT_ID, 'unexpected_content_version');
  }
  if (M2_SKILL_MECHANICS_DEFINITIONS.length !== M2_SKILL_IDS.length) {
    return fail(M2_SKILL_BUILD_REPORT_ID, 'skill_catalog_cardinality_mismatch');
  }
  const offerStrategies = M2_OFFER_STRATEGIES.map((strategy) => strategyReport(strategy, seeds));
  const film = offerStrategies.find(({ strategyId }) => strategyId === 'film_repeat');
  const weight = offerStrategies.find(({ strategyId }) => strategyId === 'weight_repeat');
  if (film === undefined || weight === undefined) {
    return fail(M2_SKILL_BUILD_REPORT_ID, 'missing_offer_strategy');
  }
  const affinityDirections = Object.freeze([
    affinityDirection('skill_coverage_ledger_b', film, weight),
    affinityDirection('skill_late_set_engine_b', weight, film),
  ]);
  const controlledBuild = buildControlledReport();

  return Object.freeze({
    reportId: M2_SKILL_BUILD_REPORT_ID,
    contentCompatibilityVersion: CONTENT_COMPATIBILITY_VERSION,
    // This is a historical M2 report field; keep its authored schema identity byte-stable.
    contentManifestSchemaVersion: 2,
    skillCatalogIds: M2_SKILL_IDS,
    skillCatalogCardinality: M2_SKILL_IDS.length,
    offerSeeds: Object.freeze([...seeds]),
    offerSeedCount: seeds.length,
    totalOfferCareers: seeds.length * offerStrategies.length,
    offerStrategies: Object.freeze(offerStrategies),
    affinityDirections,
    controlledBuild,
  });
}

export function formatM2SkillBuildReport(report: M2SkillBuildReport): string {
  return JSON.stringify(report);
}
