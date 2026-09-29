import { COACH_TRUST_BOUNDS } from '../player/bounds.js';
import { cloneSerializable } from '../player/immutable.js';
import type { CareerRun, WrPlayer } from '../player/types.js';
import type { WeeklyActionResultV3, WeeklyActionResultV4 } from '../weekly/types.js';
import { validateRotationCatalog } from './commitment.js';
import { validateOffenseCatalog } from './recruiting.js';
import {
  COACH_TRUST_WEEKLY_SCORE_BANDS,
  DEPTH_COMPONENT_BOUNDS,
  DEPTH_EVALUATION_WEIGHTS_PERMILLE,
  DEPTH_HYSTERESIS_THRESHOLD_MILLI,
  PRACTICE_BODY_NEUTRAL_POINT,
  PRACTICE_BODY_POINTS_PER_SCORE,
  PRACTICE_CONFIDENCE_NEUTRAL_POINT,
  PRACTICE_CONFIDENCE_POINTS_PER_SCORE,
  PRACTICE_FORM_PREVIOUS_WEIGHT_PERMILLE,
  PRACTICE_FORM_WEEKLY_WEIGHT_PERMILLE,
  PRACTICE_PREPARATION_POINTS_PER_SCORE,
  PRACTICE_PREPARATION_TARGET_BY_ROLE,
  PRACTICE_WEEKLY_SCORE_BASE,
  depthRoleIdForRank,
} from './tuning.js';
import {
  RECRUIT_ABILITY_ATTRIBUTE_IDS,
  type DepthEvaluationComponents,
  type DepthEvaluationEvidence,
  type DepthEvaluationTuple,
  type DepthOrderTuple,
  type DepthUpdateEvidence,
  type DepthUpdateEvidenceV3,
  type DepthUpdateEvidenceV4,
  type ProgramCareerState,
  type RecruitingOffenseStyleDefinition,
  type RotationPolicyMechanicsDefinition,
  type SnapProjectionEvidence,
} from './types.js';

export type UpdateProgramDepthResult =
  | {
      readonly ok: true;
      readonly player: WrPlayer;
      readonly programContext: ProgramCareerState;
      readonly depthUpdate: DepthUpdateEvidence;
    }
  | {
      readonly ok: false;
      readonly reason:
        'depth.invalid_state' | 'depth.invalid_offense_catalog' | 'depth.invalid_rotation_catalog';
    };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readPlayerRating(
  player: WrPlayer,
  attributeId: (typeof RECRUIT_ABILITY_ATTRIBUTE_IDS)[number],
): number {
  switch (attributeId) {
    case 'attribute_speed':
    case 'attribute_burst':
    case 'attribute_agility':
    case 'attribute_strength':
      return player.attributes.physical[attributeId].rating;
    case 'attribute_wr_release':
    case 'attribute_wr_route_running':
    case 'attribute_wr_hands':
    case 'attribute_wr_catch_in_traffic':
      return player.attributes.wr[attributeId].rating;
  }
}

function evaluate(
  participantId: DepthEvaluationEvidence['participantId'],
  components: DepthEvaluationComponents,
): Omit<DepthEvaluationEvidence, 'rank' | 'roleId'> {
  const contributions = {
    talentFitMilli: components.talentFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.talentFit,
    coachTrustMilli: components.coachTrust * DEPTH_EVALUATION_WEIGHTS_PERMILLE.coachTrust,
    practiceFormMilli: components.practiceForm * DEPTH_EVALUATION_WEIGHTS_PERMILLE.practiceForm,
    schemeFitMilli: components.schemeFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.schemeFit,
    experienceReadinessMilli:
      components.experienceReadiness * DEPTH_EVALUATION_WEIGHTS_PERMILLE.experienceReadiness,
  };
  return {
    participantId,
    components,
    contributions,
    totalScoreMilli: Object.values(contributions).reduce((total, value) => total + value, 0),
  };
}

function projectionForRank(
  rank: number,
  policy: RotationPolicyMechanicsDefinition,
): SnapProjectionEvidence | undefined {
  const range = policy.rankSnapRanges[rank - 1];
  return range === undefined
    ? undefined
    : {
        rank,
        roleId: depthRoleIdForRank(rank),
        minSnapPermille: range.minSnapPermille,
        maxSnapPermille: range.maxSnapPermille,
      };
}

function coachTrustDelta(weeklyPracticeScore: number): number {
  return (
    COACH_TRUST_WEEKLY_SCORE_BANDS.find(({ maxScore }) => weeklyPracticeScore <= maxScore)?.delta ??
    0
  );
}

/** Applies one completed committed week without consuming RNG. */
export function updateProgramDepthAfterWeek(
  career: CareerRun,
  results: readonly [
    WeeklyActionResultV3 | WeeklyActionResultV4,
    WeeklyActionResultV3 | WeeklyActionResultV4,
    WeeklyActionResultV3 | WeeklyActionResultV4,
  ],
  offenseStyleDefinitions: readonly RecruitingOffenseStyleDefinition[],
  rotationPolicyDefinitions: readonly RotationPolicyMechanicsDefinition[],
  model: 'legacy' | 'experience' = 'legacy',
): UpdateProgramDepthResult {
  if (career.recruitingState.type !== 'COMMITTED' || career.programContext === null) {
    return { ok: false, reason: 'depth.invalid_state' };
  }
  const offenseStyles = validateOffenseCatalog(offenseStyleDefinitions);
  if (offenseStyles === undefined) {
    return { ok: false, reason: 'depth.invalid_offense_catalog' };
  }
  const rotations = validateRotationCatalog(rotationPolicyDefinitions);
  if (rotations === undefined) {
    return { ok: false, reason: 'depth.invalid_rotation_catalog' };
  }
  const offenseStyle = offenseStyles.get(career.programContext.offenseStyleId);
  if (offenseStyle === undefined) {
    return { ok: false, reason: 'depth.invalid_offense_catalog' };
  }
  const rotationPolicy = rotations.get(career.programContext.rotationPolicyId);
  if (rotationPolicy === undefined) {
    return { ok: false, reason: 'depth.invalid_rotation_catalog' };
  }
  const oldPlayerIndex = career.programContext.depthOrderIds.findIndex(
    (participantId) => participantId === career.player.id,
  );
  const previousPlayerEvaluation = career.programContext.evaluations[oldPlayerIndex];
  if (
    oldPlayerIndex < 0 ||
    previousPlayerEvaluation === undefined ||
    previousPlayerEvaluation.participantId !== career.player.id
  ) {
    return { ok: false, reason: 'depth.invalid_state' };
  }

  const practiceFormBefore = career.programContext.playerPracticeForm;
  const actionImpact = results.reduce((total, result) => total + result.practiceImpact, 0);
  const bodyAfterActions = results[2].bodyAfter;
  const bodyAdjustment = Math.round(
    (bodyAfterActions - PRACTICE_BODY_NEUTRAL_POINT) / PRACTICE_BODY_POINTS_PER_SCORE,
  );
  const roleBefore = depthRoleIdForRank(oldPlayerIndex + 1);
  const currentResults = results.every((result) => 'preparationAfter' in result)
    ? (results as readonly [WeeklyActionResultV4, WeeklyActionResultV4, WeeklyActionResultV4])
    : undefined;
  if (model === 'experience' && currentResults === undefined) {
    return { ok: false, reason: 'depth.invalid_state' };
  }
  const preparationAfterFocus = currentResults?.[2].preparationAfter ?? 50;
  const preparationTarget = PRACTICE_PREPARATION_TARGET_BY_ROLE[roleBefore];
  const preparationContribution =
    model === 'experience'
      ? Math.round(
          (preparationAfterFocus - preparationTarget) / PRACTICE_PREPARATION_POINTS_PER_SCORE,
        )
      : 0;
  const confidenceAfterFocus = currentResults?.[2].confidenceAfter ?? 50;
  const confidenceContribution =
    model === 'experience'
      ? Math.round(
          (confidenceAfterFocus - PRACTICE_CONFIDENCE_NEUTRAL_POINT) /
            PRACTICE_CONFIDENCE_POINTS_PER_SCORE,
        )
      : 0;
  const weeklyPracticeScore = clamp(
    PRACTICE_WEEKLY_SCORE_BASE +
      actionImpact +
      bodyAdjustment +
      preparationContribution +
      confidenceContribution,
    DEPTH_COMPONENT_BOUNDS.min,
    DEPTH_COMPONENT_BOUNDS.max,
  );
  const practiceFormAfter = Math.round(
    (practiceFormBefore * PRACTICE_FORM_PREVIOUS_WEIGHT_PERMILLE +
      weeklyPracticeScore * PRACTICE_FORM_WEEKLY_WEIGHT_PERMILLE) /
      1_000,
  );
  const coachTrustBefore = career.player.state.coachTrust;
  const requestedCoachTrustDelta = coachTrustDelta(weeklyPracticeScore);
  const coachTrustAfter = clamp(
    coachTrustBefore + requestedCoachTrustDelta,
    COACH_TRUST_BOUNDS.min,
    COACH_TRUST_BOUNDS.max,
  );
  const playerTalentFit = Math.round(
    RECRUIT_ABILITY_ATTRIBUTE_IDS.reduce(
      (total, attributeId) =>
        total +
        readPlayerRating(career.player, attributeId) *
          offenseStyle.attributeWeightsPermille[attributeId],
      0,
    ) / 1_000,
  );
  const playerEvaluation = evaluate(career.player.id, {
    talentFit: playerTalentFit,
    coachTrust: coachTrustAfter,
    practiceForm: practiceFormAfter,
    schemeFit: offenseStyle.schemeFitByArchetype[career.player.archetypeId],
    experienceReadiness: previousPlayerEvaluation.components.experienceReadiness,
  });

  const ordered = career.programContext.evaluations.map((entry) =>
    entry.participantId === career.player.id
      ? playerEvaluation
      : {
          participantId: entry.participantId,
          components: cloneSerializable(entry.components),
          contributions: cloneSerializable(entry.contributions),
          totalScoreMilli: entry.totalScoreMilli,
        },
  );
  let nextPlayerIndex = oldPlayerIndex;
  let movement: DepthUpdateEvidence['movement'] = 'HELD';
  let neighborParticipantId: DepthUpdateEvidence['neighborParticipantId'] = null;
  const above = ordered[oldPlayerIndex - 1];
  const below = ordered[oldPlayerIndex + 1];
  if (
    above !== undefined &&
    playerEvaluation.totalScoreMilli >= above.totalScoreMilli + DEPTH_HYSTERESIS_THRESHOLD_MILLI
  ) {
    ordered[oldPlayerIndex - 1] = playerEvaluation;
    ordered[oldPlayerIndex] = above;
    nextPlayerIndex -= 1;
    movement = 'PROMOTED';
    neighborParticipantId = above.participantId;
  } else if (
    below !== undefined &&
    below.totalScoreMilli >= playerEvaluation.totalScoreMilli + DEPTH_HYSTERESIS_THRESHOLD_MILLI
  ) {
    ordered[oldPlayerIndex] = below;
    ordered[oldPlayerIndex + 1] = playerEvaluation;
    nextPlayerIndex += 1;
    movement = 'DEMOTED';
    neighborParticipantId = below.participantId;
  } else if (above !== undefined && playerEvaluation.totalScoreMilli > above.totalScoreMilli) {
    neighborParticipantId = above.participantId;
  } else if (below !== undefined && below.totalScoreMilli > playerEvaluation.totalScoreMilli) {
    neighborParticipantId = below.participantId;
  }

  const evaluations = ordered.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    roleId: depthRoleIdForRank(index + 1),
  })) as unknown as DepthEvaluationTuple;
  const depthOrderIds = evaluations.map(
    ({ participantId }) => participantId,
  ) as unknown as DepthOrderTuple;
  const rankBefore = oldPlayerIndex + 1;
  const rankAfter = nextPlayerIndex + 1;
  const snapProjectionBefore = cloneSerializable(career.programContext.projection);
  const snapProjectionAfter = projectionForRank(rankAfter, rotationPolicy);
  if (snapProjectionAfter === undefined) {
    return { ok: false, reason: 'depth.invalid_rotation_catalog' };
  }
  const legacyDepthUpdate: DepthUpdateEvidenceV3 = {
    weekIndex: career.weekIndex,
    practiceFormBefore,
    weeklyPracticeScore,
    practiceFormAfter,
    coachTrustBefore,
    requestedCoachTrustDelta,
    actualCoachTrustDelta: coachTrustAfter - coachTrustBefore,
    coachTrustAfter,
    rankBefore,
    rankAfter,
    roleBefore,
    roleAfter: depthRoleIdForRank(rankAfter),
    snapProjectionBefore,
    snapProjectionAfter,
    hysteresisThresholdMilli: DEPTH_HYSTERESIS_THRESHOLD_MILLI,
    movement,
    neighborParticipantId,
  };
  const depthUpdate: DepthUpdateEvidence =
    model === 'experience'
      ? ({
          ...legacyDepthUpdate,
          practiceGrade: {
            model: 'experience_v1',
            baseScore: PRACTICE_WEEKLY_SCORE_BASE,
            focusImpact: actionImpact,
            bodyAfterFocus: bodyAfterActions,
            bodyContribution: bodyAdjustment,
            preparationAfterFocus,
            preparationTarget,
            preparationContribution,
            confidenceAfterFocus,
            confidenceContribution,
          },
        } satisfies DepthUpdateEvidenceV4)
      : legacyDepthUpdate;
  return {
    ok: true,
    player: {
      ...cloneSerializable(career.player),
      state: {
        ...cloneSerializable(career.player.state),
        coachTrust: coachTrustAfter,
      },
    },
    programContext: {
      ...cloneSerializable(career.programContext),
      playerPracticeForm: practiceFormAfter,
      depthOrderIds,
      evaluations,
      projection: snapProjectionAfter,
      latestDepthUpdate: depthUpdate,
    },
    depthUpdate,
  };
}
