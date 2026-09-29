import type { CareerRun } from '../player/types.js';
import { deepFreeze } from '../player/immutable.js';
import type { DepthUpdateEvidenceV4 } from '../programs/types.js';
import type { WeeklyActionResultV4 } from '../weekly/types.js';
import { WEEKLY_EXPERIENCE_VERSION_CURRENT } from '../weekly/types.js';
import type {
  SkillBreakthroughProgressEvidence,
  SkillBreakthroughProgressSource,
} from './types.js';
import {
  SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX,
  SKILL_BREAKTHROUGH_GAUGE_THRESHOLD,
} from './tuning.js';

function capSources(
  sources: readonly SkillBreakthroughProgressSource[],
): readonly SkillBreakthroughProgressSource[] {
  let remaining = SKILL_BREAKTHROUGH_PROGRESS_PER_WEEK_MAX;
  const capped: SkillBreakthroughProgressSource[] = [];
  for (const source of sources) {
    const points = Math.min(source.points, remaining);
    if (points > 0) {
      capped.push({ sourceId: source.sourceId, points });
      remaining -= points;
    }
    if (remaining === 0) {
      break;
    }
  }
  return capped;
}

function currentWeekEvidence(career: CareerRun): {
  readonly results: readonly WeeklyActionResultV4[];
  readonly depthUpdate: DepthUpdateEvidenceV4 | null;
} {
  if (
    career.weeklyExperienceVersion !== WEEKLY_EXPERIENCE_VERSION_CURRENT ||
    (career.phase.type !== 'WEEK_END' && career.phase.type !== 'POST_GAME')
  ) {
    return { results: [], depthUpdate: null };
  }
  if (career.phase.type === 'POST_GAME') {
    return career.phase.completedWeek.version === 2
      ? {
          results: career.phase.completedWeek.results,
          depthUpdate: career.phase.completedWeek.depthUpdate,
        }
      : { results: [], depthUpdate: null };
  }
  return career.phase.results.every((result) => 'preparationAfter' in result)
    ? {
        results: career.phase.results as readonly WeeklyActionResultV4[],
        depthUpdate: career.phase.depthUpdate as DepthUpdateEvidenceV4 | null,
      }
    : { results: [], depthUpdate: null };
}

export interface SkillProgressFocusEvidence {
  readonly actionId: string;
  readonly attributeXp: readonly { readonly ratingBefore: number; readonly ratingAfter: number }[];
  readonly proficiency: { readonly levelBefore: number; readonly levelAfter: number } | null;
  readonly preparationBefore: number;
  readonly preparationAfter: number;
  readonly confidenceBefore: number;
  readonly confidenceAfter: number;
  readonly baseBodyDelta: number;
  readonly bodyBefore: number;
  readonly bodyAfter: number;
  readonly gpaBefore: number;
  readonly gpaAfter: number;
}

/** Minimal authoritative evidence; callers validate the owning career, not a fabricated WR run. */
export interface SkillBreakthroughProgressContext {
  readonly completedWeekIndex: number;
  readonly progressBefore: number;
  readonly results: readonly SkillProgressFocusEvidence[];
  readonly depthUpdate: {
    readonly movement: DepthUpdateEvidenceV4['movement'];
    readonly actualCoachTrustDelta: number;
    readonly weeklyPracticeScore: number;
  } | null;
  readonly game: {
    readonly opportunityCount: number;
    readonly gradeBandId:
      | 'performance_grade_poor'
      | 'performance_grade_developing'
      | 'performance_grade_solid'
      | 'performance_grade_strong'
      | 'performance_grade_elite';
  } | null;
}

function gameDayProgressSource(
  game: SkillBreakthroughProgressContext['game'],
): SkillBreakthroughProgressSource | null {
  if (game === null) return null;
  const gameDayBaseByBand = {
    performance_grade_poor: 4,
    performance_grade_developing: 6,
    performance_grade_solid: 10,
    performance_grade_strong: 14,
    performance_grade_elite: 18,
  } as const;
  const points =
    game.opportunityCount === 0
      ? 6
      : Math.min(24, gameDayBaseByBand[game.gradeBandId] + Math.min(6, game.opportunityCount));
  return { sourceId: 'breakthrough_source_game_day', points };
}

/** Derives one bounded, zero-RNG gauge update from authoritative completed-week evidence. */
export function deriveWeeklySkillBreakthroughProgress(
  career: CareerRun,
): SkillBreakthroughProgressEvidence {
  const weekEvidence = currentWeekEvidence(career);
  return deriveSkillBreakthroughProgressFromContext({
    ...weekEvidence,
    completedWeekIndex: career.weekIndex + 1,
    progressBefore: career.player.skillState.breakthroughGauge.progress,
    game:
      career.phase.type === 'POST_GAME'
        ? {
            opportunityCount: career.phase.summary.keySnapCount,
            gradeBandId: career.phase.summary.performanceGradeBandId,
          }
        : null,
  });
}

/** Shared zero-RNG six-source arithmetic over already validated completed-week evidence. */
export function deriveSkillBreakthroughProgressFromContext(
  context: SkillBreakthroughProgressContext,
): SkillBreakthroughProgressEvidence {
  const results = context.results;
  const rawSources: SkillBreakthroughProgressSource[] = [];
  const gameDaySource = gameDayProgressSource(context.game);
  if (results.length === 3) {
    const ratingGains = results.reduce(
      (total, result) =>
        total +
        result.attributeXp.reduce(
          (subtotal, entry) => subtotal + Math.max(0, entry.ratingAfter - entry.ratingBefore),
          0,
        ),
      0,
    );
    const proficiencyGains = results.reduce(
      (total, result) =>
        total +
        (result.proficiency === null
          ? 0
          : Math.max(0, result.proficiency.levelAfter - result.proficiency.levelBefore)),
      0,
    );
    const developmentPoints = Math.min(24, ratingGains * 12 + proficiencyGains * 8);
    if (developmentPoints > 0) {
      rawSources.push({
        sourceId: 'breakthrough_source_development',
        points: developmentPoints,
      });
    }

    const depthUpdate = context.depthUpdate;
    let roleCoachPoints = 0;
    if (depthUpdate !== null) {
      if (depthUpdate.movement === 'PROMOTED') {
        roleCoachPoints += 20;
      } else if (depthUpdate.actualCoachTrustDelta > 0) {
        roleCoachPoints += Math.min(16, depthUpdate.actualCoachTrustDelta * 4);
      }
      if (depthUpdate.weeklyPracticeScore >= 75) {
        roleCoachPoints += 8;
      }
    }
    const preparationGain =
      (results.at(-1)?.preparationAfter ?? 0) - (results[0]?.preparationBefore ?? 0);
    if (preparationGain >= 12) {
      roleCoachPoints += 8;
    }
    roleCoachPoints = Math.min(28, roleCoachPoints);
    if (roleCoachPoints > 0) {
      rawSources.push({ sourceId: 'breakthrough_source_role_coach', points: roleCoachPoints });
    }

    if (gameDaySource !== null) rawSources.push(gameDaySource);

    const confidenceGain =
      (results.at(-1)?.confidenceAfter ?? 0) - (results[0]?.confidenceBefore ?? 0);
    if (confidenceGain > 0) {
      rawSources.push({
        sourceId: 'breakthrough_source_mindset',
        points: Math.min(12, confidenceGain * 2),
      });
    }

    const workloadCount = results.filter((result) => result.baseBodyDelta < 0).length;
    const usedRecovery = results.some((result) => result.actionId === 'action_recovery');
    const bodyBefore = results[0]?.bodyBefore ?? 0;
    const bodyAfter = results.at(-1)?.bodyAfter ?? 0;
    const bodyPoints =
      workloadCount >= 2 && bodyAfter >= 60
        ? 12
        : usedRecovery && bodyBefore < 60 && bodyAfter >= 60
          ? 10
          : 0;
    if (bodyPoints > 0) {
      rawSources.push({ sourceId: 'breakthrough_source_body', points: bodyPoints });
    }

    const gpaGain = (results.at(-1)?.gpaAfter ?? 0) - (results[0]?.gpaBefore ?? 0);
    if (gpaGain > 0) {
      rawSources.push({ sourceId: 'breakthrough_source_life', points: 22 });
    }
  }
  if (results.length !== 3 && gameDaySource !== null) rawSources.push(gameDaySource);

  const sources = capSources(rawSources);
  const pointsEarned = sources.reduce((total, source) => total + source.points, 0);
  const progressBefore = context.progressBefore;
  const totalProgress = progressBefore + pointsEarned;
  const triggeredOffer = totalProgress >= SKILL_BREAKTHROUGH_GAUGE_THRESHOLD;
  return deepFreeze({
    model: 'gauge_v1',
    weekIndex: context.completedWeekIndex,
    progressBefore,
    pointsEarned,
    progressAfter: triggeredOffer
      ? totalProgress - SKILL_BREAKTHROUGH_GAUGE_THRESHOLD
      : totalProgress,
    threshold: SKILL_BREAKTHROUGH_GAUGE_THRESHOLD,
    triggeredOffer,
    sources,
  });
}

/** Banks a full gauge when the current catalog cannot form a legal three-card offer. */
export function bankSkillBreakthroughProgress(
  evidence: SkillBreakthroughProgressEvidence,
): SkillBreakthroughProgressEvidence {
  return deepFreeze({
    ...evidence,
    progressAfter: Math.min(evidence.threshold, evidence.progressBefore + evidence.pointsEarned),
    triggeredOffer: false,
    sources: evidence.sources.map((source) => ({ ...source })),
  });
}
