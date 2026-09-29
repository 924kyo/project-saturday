import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { compareCodeUnits } from '../player/order.js';
import { isRngState, type RngState } from '../random/rng.js';
import {
  isSkillBreakthroughSourceId,
  isSkillFamilyId,
  isSkillGradeId,
  isSkillId,
  SKILL_BREAKTHROUGH_SOURCE_IDS,
  type SkillBreakthroughSourceId,
  type SkillFamilyId,
  type SkillGradeId,
  type SkillId,
} from '../skills/ids.js';
import { sampleOfferIds, type WeightedSkillOfferCandidate } from '../skills/offers.js';
import {
  bankSkillBreakthroughProgress,
  deriveSkillBreakthroughProgressFromContext,
} from '../skills/progress.js';
import type { SkillBreakthroughProgressEvidence } from '../skills/types.js';
import {
  SKILL_BREAKTHROUGH_AFFINITY_POINTS_PER_UNIT,
  SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX,
  SKILL_BREAKTHROUGH_PROGRESS_SOURCE_POINTS_MAX,
  SKILL_OFFER_TOTAL_WEIGHT_MAX,
} from '../skills/tuning.js';
import type { PositionAlphaPreparationV2 } from './position-alpha-focus-v2.js';
import type { AddedPositionId, CompletedPositionGame } from './position-alpha-session.js';

export interface PositionSkillOfferDefinitionV2 {
  readonly id: SkillId;
  readonly positionId: AddedPositionId;
  readonly familyId: SkillFamilyId;
  readonly gradeId: SkillGradeId;
  readonly baseOfferWeight: number;
  readonly sourceId: SkillBreakthroughSourceId;
  readonly sourceWeightBonus: number;
}

export function isPositionSkillOfferDefinitionV2(
  value: unknown,
): value is PositionSkillOfferDefinitionV2 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (
    Object.keys(entry).sort().join('|') ===
      'baseOfferWeight|familyId|gradeId|id|positionId|sourceId|sourceWeightBonus' &&
    isSkillId(entry['id']) &&
    isSkillFamilyId(entry['familyId']) &&
    isSkillGradeId(entry['gradeId']) &&
    ['position_qb', 'position_rb', 'position_cb'].includes(String(entry['positionId'])) &&
    isSkillBreakthroughSourceId(entry['sourceId']) &&
    [entry['baseOfferWeight'], entry['sourceWeightBonus']].every(
      (weight) =>
        typeof weight === 'number' &&
        Number.isSafeInteger(weight) &&
        weight > 0 &&
        weight <= 1_000_000,
    )
  );
}

/** Current-only score bands follow the existing QB five-band convention; no new game grading. */
export const POSITION_ALPHA_GAUGE_GRADE_THRESHOLDS = Object.freeze({
  elite: 85,
  strong: 70,
  solid: 55,
  developing: 40,
});
function gaugeGradeBand(completed: CompletedPositionGame) {
  const score = completed.game.summary.gradeScore;
  const thresholds = POSITION_ALPHA_GAUGE_GRADE_THRESHOLDS;
  return score >= thresholds.elite
    ? ('performance_grade_elite' as const)
    : score >= thresholds.strong
      ? ('performance_grade_strong' as const)
      : score >= thresholds.solid
        ? ('performance_grade_solid' as const)
        : score >= thresholds.developing
          ? ('performance_grade_developing' as const)
          : ('performance_grade_poor' as const);
}

export function derivePositionAlphaBreakthroughProgressV2(
  input: {
    readonly careerWeekIndex: number;
    readonly progressBefore: number;
    readonly rankBefore: number;
    readonly practiceTrustBefore: number;
  },
  preparation: PositionAlphaPreparationV2,
  completed: CompletedPositionGame,
): SkillBreakthroughProgressEvidence {
  const rankAfter = preparation.room.projection.rank;
  return deriveSkillBreakthroughProgressFromContext({
    completedWeekIndex: input.careerWeekIndex + 1,
    progressBefore: input.progressBefore,
    results: preparation.trainingEvidence,
    depthUpdate: {
      movement:
        rankAfter < input.rankBefore
          ? 'PROMOTED'
          : rankAfter > input.rankBefore
            ? 'DEMOTED'
            : 'HELD',
      actualCoachTrustDelta: preparation.relationshipTrust.before - input.practiceTrustBefore,
      weeklyPracticeScore: preparation.practiceGrade.score,
    },
    game: {
      opportunityCount: completed.game.summary.opportunityCount,
      gradeBandId: gaugeGradeBand(completed),
    },
  });
}

export interface PositionAlphaWeightedOfferV2 {
  readonly model: 'position_alpha_weighted_offer_v2';
  readonly candidates: readonly WeightedSkillOfferCandidate[];
  readonly offeredSkillIds: readonly [SkillId, SkillId, SkillId] | null;
  readonly rngBefore: RngState;
  readonly rng: RngState;
}

export interface PositionAlphaBreakthroughWeekV2 {
  readonly model: 'position_alpha_breakthrough_week_v2';
  readonly progress: SkillBreakthroughProgressEvidence;
  readonly offer: PositionAlphaWeightedOfferV2 | null;
  readonly rng: RngState;
}

export function resolvePositionAlphaBreakthroughWeekV2(
  input: Parameters<typeof derivePositionAlphaBreakthroughProgressV2>[0] & {
    readonly ownedSkillIds: readonly SkillId[];
  },
  preparation: PositionAlphaPreparationV2,
  completed: CompletedPositionGame,
  definitions: readonly PositionSkillOfferDefinitionV2[],
): PositionAlphaBreakthroughWeekV2 | null {
  if (
    !Number.isSafeInteger(input.progressBefore) ||
    input.progressBefore < 0 ||
    input.progressBefore > 160
  )
    return null;
  let progress = derivePositionAlphaBreakthroughProgressV2(input, preparation, completed);
  const offer = progress.triggeredOffer
    ? generatePositionAlphaWeightedOfferV2(
        completed.positionId,
        input.ownedSkillIds,
        progress.sources,
        definitions,
        completed.game.rng,
      )
    : null;
  if (progress.triggeredOffer && offer === null) return null;
  if (offer !== null && offer.offeredSkillIds === null) {
    const banked = bankSkillBreakthroughProgress(progress);
    // Current banking caps at 100; preserve a literal older surplus until it can be spent.
    progress = { ...banked, progressAfter: Math.max(input.progressBefore, banked.progressAfter) };
  }
  return deepFreeze(
    cloneSerializable({
      model: 'position_alpha_breakthrough_week_v2',
      progress,
      offer,
      rng: offer?.rng ?? completed.game.rng,
    }),
  );
}

/** Current offer foundation. The aggregate owns phase, threshold, acquisition and saved replay guards. */
export function generatePositionAlphaWeightedOfferV2(
  positionId: AddedPositionId,
  ownedSkillIds: readonly SkillId[],
  sources: SkillBreakthroughProgressEvidence['sources'],
  definitions: readonly PositionSkillOfferDefinitionV2[],
  rng: RngState,
): PositionAlphaWeightedOfferV2 | null {
  if (
    !isRngState(rng) ||
    !Array.isArray(definitions) ||
    !Array.isArray(ownedSkillIds) ||
    !Array.isArray(sources) ||
    !['position_qb', 'position_rb', 'position_cb'].includes(positionId)
  )
    return null;
  for (const entry of definitions) if (!isPositionSkillOfferDefinitionV2(entry)) return null;
  if (
    new Set(definitions.map(({ id }) => id)).size !== definitions.length ||
    new Set(ownedSkillIds).size !== ownedSkillIds.length
  )
    return null;
  for (const id of ownedSkillIds)
    if (
      !isSkillId(id) ||
      !definitions.some((entry) => entry.id === id && entry.positionId === positionId)
    )
      return null;
  let lastSourceIndex = -1;
  let sourcePoints = 0;
  for (const source of sources) {
    if (
      typeof source !== 'object' ||
      source === null ||
      Object.keys(source).sort().join('|') !== 'points|sourceId' ||
      !isSkillBreakthroughSourceId(source.sourceId) ||
      !Number.isSafeInteger(source.points) ||
      source.points < 1 ||
      source.points > SKILL_BREAKTHROUGH_PROGRESS_SOURCE_POINTS_MAX
    )
      return null;
    const index = SKILL_BREAKTHROUGH_SOURCE_IDS.indexOf(source.sourceId);
    if (index <= lastSourceIndex) return null;
    lastSourceIndex = index;
    sourcePoints += source.points;
  }
  if (sourcePoints > SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX) return null;
  const candidates = definitions
    .filter((entry) => entry.positionId === positionId && !ownedSkillIds.includes(entry.id))
    .sort((a, b) => compareCodeUnits(a.id, b.id))
    .map((entry) => ({
      skillId: entry.id,
      weight:
        entry.baseOfferWeight +
        entry.sourceWeightBonus *
          Math.ceil(
            (sources.find(({ sourceId }) => sourceId === entry.sourceId)?.points ?? 0) /
              SKILL_BREAKTHROUGH_AFFINITY_POINTS_PER_UNIT,
          ),
    }));
  const total = candidates.reduce((sum, { weight }) => sum + weight, 0);
  if (!Number.isSafeInteger(total) || total > SKILL_OFFER_TOTAL_WEIGHT_MAX) return null;
  const sampled = candidates.length < 3 ? null : sampleOfferIds(rng, candidates);
  if (sampled !== null && !sampled.ok) return null;
  return deepFreeze(
    cloneSerializable({
      model: 'position_alpha_weighted_offer_v2',
      candidates,
      offeredSkillIds: sampled?.offeredSkillIds ?? null,
      rngBefore: rng,
      rng: sampled?.nextRng ?? rng,
    }),
  );
}
