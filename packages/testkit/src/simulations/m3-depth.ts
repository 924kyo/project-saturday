import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import {
  contentManifest,
  programMechanicsDefinitions,
  skillMechanicsDefinitions,
} from '@project-saturday/game-content/content';
import type {
  DepthMovement,
  DepthRoleId,
  PersonalityTraitId,
  ProgramId,
  ProgramStrengthBandId,
  ProjectedDepthBandId,
  RecruitTierId,
  RecruitingBackgroundId,
  RngSeed,
  RngState,
  SkillId,
  SkillFamilyId,
  SnapProjectionEvidence,
  WrArchetypeId,
} from '@project-saturday/game-core';

import {
  createEnrolledWrCareerFixture,
  executeWrProgramDevelopmentWeek,
  type ProgramWeeklyActionPlan,
} from '../builders/wr-program-career.js';
import { formatScenarioReproduction } from '../scenario.js';

export const M3_DEPTH_REPORT_ID = 'm3_depth_baseline_v1' as const;
export const M3_DEPTH_WEEK_COUNT = 6 as const;
export const M3_DEPTH_SEEDS = Object.freeze([
  'm3-depth-001',
  'm3-depth-002',
  'm3-depth-003',
  'm3-depth-004',
] as const satisfies readonly RngSeed[]);

export interface M3DepthProfileDefinition {
  readonly profileId: string;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly selectedProgramId: ProgramId;
}

export const M3_DEPTH_PROFILES = Object.freeze([
  {
    profileId: 'national_deep_blue_chip',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_blue_chip_star',
    selectedProgramId: 'program_gulf_meridian',
  },
  {
    profileId: 'contender_route_small_town',
    archetypeId: 'archetype_wr_route_technician',
    recruitingBackgroundId: 'background_small_town_star',
    selectedProgramId: 'program_cascade_tech',
  },
  {
    profileId: 'builder_possession_late_bloomer',
    archetypeId: 'archetype_wr_possession_receiver',
    recruitingBackgroundId: 'background_late_bloomer',
    selectedProgramId: 'program_ember_peak_polytechnic',
  },
  {
    profileId: 'builder_deep_legacy',
    archetypeId: 'archetype_wr_deep_threat',
    recruitingBackgroundId: 'background_legacy_recruit',
    selectedProgramId: 'program_high_desert_state',
  },
  {
    profileId: 'contender_possession_under_recruited',
    archetypeId: 'archetype_wr_possession_receiver',
    recruitingBackgroundId: 'background_under_recruited_athlete',
    selectedProgramId: 'program_crown_sound',
  },
] as const satisfies readonly M3DepthProfileDefinition[]);

export interface M3DepthStrategyDefinition {
  readonly strategyId: string;
  readonly repeatedActionPlan: ProgramWeeklyActionPlan;
}

export const M3_DEPTH_STRATEGIES = Object.freeze([
  {
    strategyId: 'practice_push',
    repeatedActionPlan: ['action_extra_practice', 'action_route_drills', 'action_recovery'],
  },
  {
    strategyId: 'balanced_development',
    repeatedActionPlan: ['action_route_drills', 'action_film_study', 'action_recovery'],
  },
  {
    strategyId: 'body_risk',
    repeatedActionPlan: ['action_speed_work', 'action_weight_room', 'action_study_hall'],
  },
] as const satisfies readonly M3DepthStrategyDefinition[]);

export interface M3DepthMovementReport {
  readonly completedWeekNumber: number;
  readonly movement: DepthMovement;
  readonly neighborParticipantId: string | null;
  readonly rankBefore: number;
  readonly rankAfter: number;
  readonly roleBefore: DepthRoleId;
  readonly roleAfter: DepthRoleId;
  readonly weeklyPracticeScore: number;
  readonly practiceFormBefore: number;
  readonly practiceFormAfter: number;
  readonly coachTrustBefore: number;
  readonly requestedCoachTrustDelta: number;
  readonly actualCoachTrustDelta: number;
  readonly coachTrustAfter: number;
  readonly snapProjectionBefore: SnapProjectionEvidence;
  readonly snapProjectionAfter: SnapProjectionEvidence;
}

export interface M3DepthOscillationPair {
  readonly fromCompletedWeekNumber: number;
  readonly fromMovement: Exclude<DepthMovement, 'HELD'>;
  readonly toCompletedWeekNumber: number;
  readonly toMovement: Exclude<DepthMovement, 'HELD'>;
}

export interface M3DepthSampleReport {
  readonly scenarioId: string;
  readonly seed: RngSeed;
  readonly reproduction: string;
  readonly profileId: string;
  readonly strategyId: string;
  readonly archetypeId: WrArchetypeId;
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly recruitTierId: RecruitTierId;
  readonly recruitScore: number;
  readonly selectedProgramId: ProgramId;
  readonly programStrengthBandId: ProgramStrengthBandId;
  readonly selectedOfferProjectedDepthBandId: ProjectedDepthBandId;
  readonly actionPlan: ProgramWeeklyActionPlan;
  readonly weekCount: number;
  readonly initialRank: number;
  readonly finalRank: number;
  readonly initialRoleId: DepthRoleId;
  readonly finalRoleId: DepthRoleId;
  readonly firstRotationCompletedWeekNumber: number | null;
  readonly initialCoachTrust: number;
  readonly finalCoachTrust: number;
  readonly initialPracticeForm: number;
  readonly finalPracticeForm: number;
  readonly initialSnapProjection: SnapProjectionEvidence;
  readonly finalSnapProjection: SnapProjectionEvidence;
  readonly movementCounts: Readonly<Record<DepthMovement, number>>;
  readonly movements: readonly M3DepthMovementReport[];
  readonly oscillationPairs: readonly M3DepthOscillationPair[];
  readonly acquiredSkillIds: readonly SkillId[];
  readonly acquiredSkillFamilyIds: readonly SkillFamilyId[];
  readonly primarySkillFamilyId: SkillFamilyId;
  readonly roomRngBefore: RngState;
  readonly roomRngAfter: RngState;
  readonly roomRngDrawCount: number;
  readonly finalRng: RngState;
  readonly roundTripCount: number;
  readonly allRoundTripsEquivalent: true;
}

export interface M3DepthSegmentCount {
  readonly id: string;
  readonly careerCount: number;
}

export interface M3DepthReport {
  readonly reportId: typeof M3_DEPTH_REPORT_ID;
  readonly contentCompatibilityVersion: number;
  readonly contentManifestSchemaVersion: 3;
  readonly programCatalogIds: readonly ProgramId[];
  readonly seeds: readonly RngSeed[];
  readonly seedCount: number;
  readonly profiles: readonly M3DepthProfileDefinition[];
  readonly strategies: readonly M3DepthStrategyDefinition[];
  readonly weekCountPerCareer: number;
  readonly totalCareers: number;
  readonly totalWeeks: number;
  readonly segments: {
    readonly recruitTier: readonly M3DepthSegmentCount[];
    readonly recruitingBackground: readonly M3DepthSegmentCount[];
    readonly programStrengthBand: readonly M3DepthSegmentCount[];
    readonly archetype: readonly M3DepthSegmentCount[];
    readonly strategy: readonly M3DepthSegmentCount[];
    readonly primarySkillFamily: readonly M3DepthSegmentCount[];
  };
  readonly outcomes: {
    readonly promotedCareerCount: number;
    readonly demotedCareerCount: number;
    readonly reachedRotationCareerCount: number;
    readonly oscillatingCareerCount: number;
  };
  readonly samples: readonly M3DepthSampleReport[];
}

const FIXTURE_PERSONALITIES = Object.freeze([
  'personality_competitive',
  'personality_leader',
] as const satisfies readonly [PersonalityTraitId, PersonalityTraitId]);

function fail(scenarioId: string, reason: string): never {
  throw new Error(`scenario=${JSON.stringify(scenarioId)} reason=${reason}`);
}

function segmentCounts<T>(samples: readonly T[], readId: (sample: T) => string) {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    const id = readId(sample);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Object.freeze(
    [...counts.entries()]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([id, careerCount]) => Object.freeze({ id, careerCount })),
  );
}

function isRotationRank(rank: number): boolean {
  return rank <= 4;
}

function movementReport(
  completedWeekNumber: number,
  depthUpdate: ReturnType<typeof executeWrProgramDevelopmentWeek>['depthUpdate'],
): M3DepthMovementReport {
  return Object.freeze({
    completedWeekNumber,
    movement: depthUpdate.movement,
    neighborParticipantId: depthUpdate.neighborParticipantId,
    rankBefore: depthUpdate.rankBefore,
    rankAfter: depthUpdate.rankAfter,
    roleBefore: depthUpdate.roleBefore,
    roleAfter: depthUpdate.roleAfter,
    weeklyPracticeScore: depthUpdate.weeklyPracticeScore,
    practiceFormBefore: depthUpdate.practiceFormBefore,
    practiceFormAfter: depthUpdate.practiceFormAfter,
    coachTrustBefore: depthUpdate.coachTrustBefore,
    requestedCoachTrustDelta: depthUpdate.requestedCoachTrustDelta,
    actualCoachTrustDelta: depthUpdate.actualCoachTrustDelta,
    coachTrustAfter: depthUpdate.coachTrustAfter,
    snapProjectionBefore: depthUpdate.snapProjectionBefore,
    snapProjectionAfter: depthUpdate.snapProjectionAfter,
  });
}

function oscillationPairs(
  movements: readonly M3DepthMovementReport[],
): readonly M3DepthOscillationPair[] {
  const pairs: M3DepthOscillationPair[] = [];
  for (let index = 1; index < movements.length; index += 1) {
    const previous = movements[index - 1];
    const current = movements[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      previous.movement !== 'HELD' &&
      current.movement !== 'HELD' &&
      previous.movement !== current.movement
    ) {
      pairs.push({
        fromCompletedWeekNumber: previous.completedWeekNumber,
        fromMovement: previous.movement,
        toCompletedWeekNumber: current.completedWeekNumber,
        toMovement: current.movement,
      });
    }
  }
  return Object.freeze(pairs.map((pair) => Object.freeze(pair)));
}

function runSample(
  profile: M3DepthProfileDefinition,
  strategy: M3DepthStrategyDefinition,
  seed: RngSeed,
): M3DepthSampleReport {
  const scenarioId = `m3_depth:${profile.profileId}:${strategy.strategyId}`;
  const enrolled = createEnrolledWrCareerFixture({
    scenarioId,
    fixture: {
      careerSeed: seed,
      displayName: 'M3 Depth Simulation Athlete',
      archetypeId: profile.archetypeId,
      recruitingBackgroundId: profile.recruitingBackgroundId,
      personalityTraitIds: FIXTURE_PERSONALITIES,
    },
    selectedProgramId: profile.selectedProgramId,
    serializationMode: 'every_transition',
  });
  let career = enrolled.career;
  if (career.recruitingState.type !== 'COMMITTED' || career.programContext === null) {
    return fail(scenarioId, 'enrollment_not_committed');
  }
  const program = programMechanicsDefinitions.find(({ id }) => id === profile.selectedProgramId);
  if (program === undefined) {
    return fail(scenarioId, 'missing_program_definition');
  }
  const initialRank = career.programContext.projection.rank;
  const initialRoleId = career.programContext.projection.roleId;
  const initialCoachTrust = career.player.state.coachTrust;
  const initialPracticeForm = career.programContext.playerPracticeForm;
  const initialSnapProjection = career.programContext.projection;
  const movements: M3DepthMovementReport[] = [];
  const acquiredSkillIds: SkillId[] = [];
  let roundTripCount = enrolled.roundTripCount;

  for (let week = 0; week < M3_DEPTH_WEEK_COUNT; week += 1) {
    const executed = executeWrProgramDevelopmentWeek({
      actionPlan: strategy.repeatedActionPlan,
      career,
      scenarioId,
      serializationMode: 'every_transition',
    });
    if (Math.abs(executed.depthUpdate.rankAfter - executed.depthUpdate.rankBefore) > 1) {
      return fail(scenarioId, 'more_than_one_rank_move');
    }
    movements.push(movementReport(executed.completedWeekNumber, executed.depthUpdate));
    if (executed.selectedSkillId !== null) {
      acquiredSkillIds.push(executed.selectedSkillId);
    }
    roundTripCount += executed.roundTripCount;
    career = executed.career;
  }
  if (career.recruitingState.type !== 'COMMITTED' || career.programContext === null) {
    return fail(scenarioId, 'final_state_not_committed');
  }
  const finalRank = career.programContext.projection.rank;
  const firstRotationCompletedWeekNumber = isRotationRank(initialRank)
    ? 0
    : (movements.find(({ rankAfter }) => isRotationRank(rankAfter))?.completedWeekNumber ?? null);
  const movementCounts = Object.freeze({
    PROMOTED: movements.filter(({ movement }) => movement === 'PROMOTED').length,
    HELD: movements.filter(({ movement }) => movement === 'HELD').length,
    DEMOTED: movements.filter(({ movement }) => movement === 'DEMOTED').length,
  });
  const oscillations = oscillationPairs(movements);
  const acquiredSkillFamilyIds = acquiredSkillIds.map((skillId) => {
    const definition = skillMechanicsDefinitions.find(({ id }) => id === skillId);
    return definition?.familyId ?? fail(scenarioId, `missing_skill_definition:${skillId}`);
  });
  const primarySkillFamilyId = acquiredSkillFamilyIds[0];
  if (primarySkillFamilyId === undefined) {
    return fail(scenarioId, 'missing_primary_skill_family');
  }
  const roomRngDrawCount = enrolled.roomRngAfter.drawCount - enrolled.roomRngBefore.drawCount;
  if (roomRngDrawCount !== 35) {
    return fail(scenarioId, 'unexpected_room_rng_draw_count');
  }

  return Object.freeze({
    scenarioId,
    seed,
    reproduction: formatScenarioReproduction({ scenarioId, seed }),
    profileId: profile.profileId,
    strategyId: strategy.strategyId,
    archetypeId: profile.archetypeId,
    recruitingBackgroundId: profile.recruitingBackgroundId,
    recruitTierId: career.recruitingState.recruitTierId,
    recruitScore: career.recruitingState.recruitScore,
    selectedProgramId: profile.selectedProgramId,
    programStrengthBandId: program.strengthBandId,
    selectedOfferProjectedDepthBandId: enrolled.selectedOffer.projectedDepthBandId,
    actionPlan: strategy.repeatedActionPlan,
    weekCount: M3_DEPTH_WEEK_COUNT,
    initialRank,
    finalRank,
    initialRoleId,
    finalRoleId: career.programContext.projection.roleId,
    firstRotationCompletedWeekNumber,
    initialCoachTrust,
    finalCoachTrust: career.player.state.coachTrust,
    initialPracticeForm,
    finalPracticeForm: career.programContext.playerPracticeForm,
    initialSnapProjection,
    finalSnapProjection: career.programContext.projection,
    movementCounts,
    movements: Object.freeze(movements),
    oscillationPairs: oscillations,
    acquiredSkillIds: Object.freeze(acquiredSkillIds),
    acquiredSkillFamilyIds: Object.freeze(acquiredSkillFamilyIds),
    primarySkillFamilyId,
    roomRngBefore: enrolled.roomRngBefore,
    roomRngAfter: enrolled.roomRngAfter,
    roomRngDrawCount,
    finalRng: career.rng,
    roundTripCount,
    allRoundTripsEquivalent: true,
  });
}

export function runM3DepthReport(seeds: readonly RngSeed[] = M3_DEPTH_SEEDS): M3DepthReport {
  if (seeds.length === 0) {
    return fail(M3_DEPTH_REPORT_ID, 'empty_seed_set');
  }
  if (contentManifest.contentVersion !== 1) {
    return fail(M3_DEPTH_REPORT_ID, 'unexpected_content_version');
  }
  const samples = M3_DEPTH_PROFILES.flatMap((profile) =>
    M3_DEPTH_STRATEGIES.flatMap((strategy) =>
      seeds.map((seed) => runSample(profile, strategy, seed)),
    ),
  );
  return Object.freeze({
    reportId: M3_DEPTH_REPORT_ID,
    contentCompatibilityVersion: CONTENT_COMPATIBILITY_VERSION,
    // This is a historical M3 report field; keep its authored schema identity byte-stable.
    contentManifestSchemaVersion: 3,
    programCatalogIds: Object.freeze(programMechanicsDefinitions.map(({ id }) => id)),
    seeds: Object.freeze([...seeds]),
    seedCount: seeds.length,
    profiles: M3_DEPTH_PROFILES,
    strategies: M3_DEPTH_STRATEGIES,
    weekCountPerCareer: M3_DEPTH_WEEK_COUNT,
    totalCareers: samples.length,
    totalWeeks: samples.length * M3_DEPTH_WEEK_COUNT,
    segments: Object.freeze({
      recruitTier: segmentCounts(samples, ({ recruitTierId }) => recruitTierId),
      recruitingBackground: segmentCounts(
        samples,
        ({ recruitingBackgroundId }) => recruitingBackgroundId,
      ),
      programStrengthBand: segmentCounts(
        samples,
        ({ programStrengthBandId }) => programStrengthBandId,
      ),
      archetype: segmentCounts(samples, ({ archetypeId }) => archetypeId),
      strategy: segmentCounts(samples, ({ strategyId }) => strategyId),
      primarySkillFamily: segmentCounts(
        samples,
        ({ primarySkillFamilyId }) => primarySkillFamilyId,
      ),
    }),
    outcomes: Object.freeze({
      promotedCareerCount: samples.filter(({ movementCounts }) => movementCounts.PROMOTED > 0)
        .length,
      demotedCareerCount: samples.filter(({ movementCounts }) => movementCounts.DEMOTED > 0).length,
      reachedRotationCareerCount: samples.filter(
        ({ firstRotationCompletedWeekNumber }) => firstRotationCompletedWeekNumber !== null,
      ).length,
      oscillatingCareerCount: samples.filter(({ oscillationPairs: pairs }) => pairs.length > 0)
        .length,
    }),
    samples: Object.freeze(samples),
  });
}

export function formatM3DepthReport(report: M3DepthReport): string {
  return JSON.stringify(report);
}
