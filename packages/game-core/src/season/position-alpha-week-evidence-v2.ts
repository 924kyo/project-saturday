import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { WorldAlphaFixtureMechanics } from './world-alpha.js';
import {
  positionAlphaSourceCareerWeekIndexV2,
  type PositionAlphaCalendarSourceV2,
} from './position-alpha-calendar-v2.js';
import {
  resolvePositionAlphaBreakthroughWeekV2,
  type PositionAlphaBreakthroughWeekV2,
} from './position-alpha-breakthrough-v2.js';
import type { SkillId } from '../skills/ids.js';
import {
  attemptPositionAlphaNilWeekV2,
  replayPositionAlphaNilPlanningV2,
  type PositionAlphaNilStateV2,
  type PositionAlphaNilWeekV2,
} from './position-alpha-nil-v2.js';
import {
  replayPositionAlphaEventV2,
  positionAlphaPreparationAfterEvent,
  type PositionAlphaEventWeekV2,
  type PositionAlphaEventSourceV2,
} from './position-alpha-events-v2.js';
import {
  preparePositionAlphaAcademicsV2,
  settlePositionAlphaAcademicsV2,
  type PositionAlphaAcademicStateV2,
  type PositionAlphaAcademicSettlementV2,
} from './position-alpha-academics-v2.js';
import { createPositionPlayerProfile } from '../player/position-creation.js';
import { derivePositionOverall } from '../player/progression.js';
import { validatePositionCareerLifecycle } from './position-lifecycle.js';
import type { NewInjuryEvidence } from '../injuries/types.js';
import type { CommonPositionProficiencyUses } from '../weekly/position-focus.js';
import {
  preparePositionAlphaWeekV2,
  derivePositionAlphaRolloverV2,
  type PositionAlphaPreparationV2,
  type PositionAlphaTrainingV2,
  type PositionAlphaRolloverV2,
} from './position-alpha-focus-v2.js';
import {
  assessPositionInjuryWeek,
  validatePositionInjuryWeek,
  type PositionInjuryWeekV1,
} from './position-injury.js';
import {
  derivePositionAlphaFootballConsequences,
  resolvePositionAlphaSnap,
  startPositionAlphaGame,
  type CompletedPositionGame,
  type PositionAlphaGameContext,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaWeekSummaryV1,
} from './position-alpha-session.js';

/** Bounded replay source: no world snapshot, week history, or recursive session copy. */
export type PositionAlphaWeekSourceV2 = PositionAlphaEventSourceV2 & {
  readonly skills: {
    readonly breakthroughGauge: number;
    readonly ownedSkillIds: readonly SkillId[];
  };
  readonly training: PositionAlphaTrainingV2;
  readonly academics?: PositionAlphaAcademicStateV2;
  readonly nil?: PositionAlphaNilStateV2;
};

export interface PositionAlphaWeekSummaryV2 extends Omit<
  PositionAlphaWeekSummaryV1,
  'model' | 'actionId' | 'decisionStrategy' | 'trainingEvidence'
> {
  readonly model: 'position_alpha_week_summary_v2';
  readonly breakthrough: PositionAlphaBreakthroughWeekV2;
  readonly actionIds: PositionAlphaPreparationV2['actionIds'];
  readonly trainingEvidence: PositionAlphaPreparationV2['trainingEvidence'];
  readonly relationshipSkillGain: PositionAlphaPreparationV2['relationshipSkillGain'];
  readonly rollover: PositionAlphaRolloverV2;
  readonly sharedProficiencyUsesAfter: CommonPositionProficiencyUses;
  readonly decisionIds: readonly string[];
  readonly source: PositionAlphaWeekSourceV2;
  readonly completedGame: CompletedPositionGame;
  readonly injury: PositionInjuryWeekV1;
  readonly academics: PositionAlphaAcademicSettlementV2;
  readonly event: PositionAlphaEventWeekV2;
  readonly nil: PositionAlphaNilWeekV2;
}

export function preparePositionAlphaNilWeekV2(
  source: PositionAlphaWeekSourceV2,
  preparation: PositionAlphaPreparationV2,
  event: PositionAlphaEventWeekV2,
  injury: PositionInjuryWeekV1,
  weekIndex: number,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaNilWeekV2 | null {
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(source, weekIndex);
  if (careerWeekIndex === null) return null;
  const effective = positionAlphaPreparationAfterEvent(preparation, event);
  if (effective === null) return null;
  const context = positionAlphaGameContextAfterInjury(
    { ...source, events: event.afterEvents },
    effective,
    injury,
  );
  if (context === null) return null;
  return attemptPositionAlphaNilWeekV2(
    {
      ...source,
      ...context,
      events: event.afterEvents,
      lifecycle: {
        ...source.lifecycle,
        relationships: preparation.relationships
          .tracksAfter as typeof source.lifecycle.relationships,
      },
    },
    careerWeekIndex,
    mechanics.nil,
  );
}

/** Current pregame inputs use actual prepared state and the established exposure projection. */
export function assessPositionAlphaPreparedInjury(
  source: PositionAlphaGameContext & PositionAlphaCalendarSourceV2,
  preparation: PositionAlphaPreparationV2,
  currentInjury: NewInjuryEvidence | null,
  weekIndex: number,
  mechanics: PositionAlphaSessionCommandMechanics,
  maximumOpportunities = 5,
): PositionInjuryWeekV1 | null {
  // Existing unclocked staged evidence keeps its literal local injury dates.
  const injuryWeekIndex = Object.hasOwn(source, 'seasonClock')
    ? positionAlphaSourceCareerWeekIndexV2(source, weekIndex)
    : weekIndex;
  if (injuryWeekIndex === null) return null;
  return assessPositionInjuryWeek(
    {
      positionId: source.player.positionId,
      weekIndex: injuryWeekIndex,
      body: preparation.player.state.body,
      confidence: preparation.player.state.confidence,
      coachTrust: preparation.player.state.coachTrust,
      durability: preparation.player.attributes.attribute_durability!.rating,
      workloadSnapPermille:
        Math.min(maximumOpportunities, preparation.opportunity.projectedOpportunities) * 180,
      recentTrainingLoad: Math.max(
        0,
        preparation.trainingEvidence[0].bodyBefore - preparation.trainingEvidence[2].bodyAfter,
      ),
      currentInjury,
      rng: source.careerRng,
    },
    { lifecycle: mechanics.lifecycle, ...mechanics.injuries },
  );
}

export function positionAlphaGameContextAfterInjury(
  source: PositionAlphaGameContext,
  preparation: PositionAlphaPreparationV2,
  injury: PositionInjuryWeekV1,
): PositionAlphaGameContext | null {
  const availability = injury.availability;
  if (availability === null) return null;
  return {
    ...source,
    ...preparation,
    player: {
      ...preparation.player,
      state: {
        ...preparation.player.state,
        body: availability.bodyAfter,
        confidence: availability.confidenceAfter,
        coachTrust: availability.coachTrustAfter,
      },
    },
    careerRng: injury.rng,
    relationshipInformationScoreModifier: preparation.relationships.informationScoreModifier,
    relationshipOpportunitySnapBonusPermille: preparation.opportunity.relationshipBonusPermille,
  };
}

export function equalPositionAlphaEvidence(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((entry: unknown, index) => equalPositionAlphaEvidence(entry, right[index]))
    );
  if (!isRecord(left) || !isRecord(right)) return false;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && equalPositionAlphaEvidence(left[key], right[key]),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positionAlphaWeekSourceFields(
  session: PositionAlphaWeekSourceV2,
): PositionAlphaWeekSourceV2 {
  return {
    player: session.player,
    room: session.room,
    training: session.training,
    lifecycle: session.lifecycle,
    careerRng: session.careerRng,
    skills: {
      equippedSkillIds: session.skills.equippedSkillIds,
      breakthroughGauge: session.skills.breakthroughGauge,
      ownedSkillIds: session.skills.ownedSkillIds,
    },
    events: session.events,
    previousStats: session.previousStats,
    ...(Object.hasOwn(session, 'academics') ? { academics: session.academics! } : {}),
    ...(Object.hasOwn(session, 'nil') ? { nil: session.nil! } : {}),
    ...(Object.hasOwn(session, 'seasonClock') ? { seasonClock: session.seasonClock! } : {}),
  };
}

export function createPositionAlphaWeekSourceV2(
  session: PositionAlphaWeekSourceV2,
): PositionAlphaWeekSourceV2 {
  return deepFreeze(cloneSerializable(positionAlphaWeekSourceFields(session)));
}

function derivePositionAlphaWeekSummaryV2(
  source: PositionAlphaWeekSourceV2,
  preparation: PositionAlphaPreparationV2,
  completed: CompletedPositionGame,
  decisionIds: readonly string[],
  mechanics: PositionAlphaSessionCommandMechanics,
  injury: PositionInjuryWeekV1,
  event: PositionAlphaEventWeekV2,
  nil: PositionAlphaNilWeekV2,
): PositionAlphaWeekSummaryV2 | null {
  const weekIndex = completed.game.summary.weekIndex;
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(source, weekIndex);
  if (careerWeekIndex === null) return null;
  const academicWeek = preparePositionAlphaAcademicsV2(
    source,
    preparation.player.state.gpa,
    weekIndex,
    mechanics.academics,
    preparation.nilObligationGpaDeltaMilli,
  );
  if (academicWeek === null) return null;
  const academics = settlePositionAlphaAcademicsV2(academicWeek, completed.game.summary.gameId);
  if (
    academics === null ||
    completed.game.summary.opportunityCount > academics.maximumOpportunities
  )
    return null;
  const effectivePreparation = positionAlphaPreparationAfterEvent(preparation, event);
  if (effectivePreparation === null) return null;
  const nilPlanning = replayPositionAlphaNilPlanningV2(source, careerWeekIndex, mechanics.nil);
  if (nilPlanning === null) return null;
  const consequences = derivePositionAlphaFootballConsequences(
    {
      ...source,
      player: { ...source.player, state: nilPlanning.playerState },
      lifecycle: {
        ...source.lifecycle,
        playerState: nilPlanning.playerState,
        relationships: nilPlanning.relationships,
      },
    },
    effectivePreparation,
    completed,
    weekIndex,
    mechanics,
    preparation.relationships,
    preparation.relationshipSkillGain.multiplierPermille,
  );
  if (consequences === null) return null;
  const rollover = derivePositionAlphaRolloverV2(
    consequences.player.state,
    mechanics.trainingConfig,
    source.skills.equippedSkillIds,
    mechanics.skillBuilds,
    careerWeekIndex,
  );
  if (rollover === null) return null;
  const breakthrough = resolvePositionAlphaBreakthroughWeekV2(
    {
      careerWeekIndex,
      progressBefore: source.skills.breakthroughGauge,
      ownedSkillIds: source.skills.ownedSkillIds,
      rankBefore: source.room.projection.rank,
      practiceTrustBefore: nilPlanning.playerState.coachTrust,
    },
    preparation,
    completed,
    mechanics.skillOffers,
  );
  if (breakthrough === null) return null;
  // Replay reads this borrowed readonly record; publication detaches it below.
  return {
    model: 'position_alpha_week_summary_v2',
    weekIndex,
    actionIds: preparation.actionIds,
    trainingEvidence: preparation.trainingEvidence,
    practiceGrade: preparation.practiceGrade,
    depthRankBefore: source.room.projection.rank,
    depthRankAfter: preparation.room.projection.rank,
    roleId: preparation.room.projection.roleId,
    opportunityCount: completed.game.summary.opportunityCount,
    opponentProgramId: completed.game.summary.opponentProgramId,
    isHome: completed.game.summary.isHome,
    playerTeamScore: completed.game.summary.playerTeamScore,
    opponentScore: completed.game.summary.opponentScore,
    resultId: completed.game.summary.resultId,
    gameGrade: completed.game.summary.gradeScore,
    breakthroughGaugePoints: breakthrough.progress.pointsEarned,
    breakthrough,
    participationFeedbackId: completed.game.summary.participationFeedbackId,
    stats: consequences.stats,
    relationships: consequences.relationships,
    relationshipSkillGain: preparation.relationshipSkillGain,
    injuryExposure: injury.exposure,
    eligibility: consequences.eligibility,
    source: positionAlphaWeekSourceFields(source),
    decisionIds,
    completedGame: completed,
    injury,
    academics,
    event,
    nil,
    rollover,
    sharedProficiencyUsesAfter: preparation.training.sharedProficiencyUses,
  };
}

export function createPositionAlphaWeekSummaryV2(
  ...args: Parameters<typeof derivePositionAlphaWeekSummaryV2>
): PositionAlphaWeekSummaryV2 | null {
  const summary = derivePositionAlphaWeekSummaryV2(...args);
  return summary === null ? null : deepFreeze(cloneSerializable(summary));
}

/** Validate current history by replay; old compact histories are never upgraded or fabricated. */
export function validatePositionAlphaWeekSummaryV2(
  value: unknown,
  weekIndex: number,
  mechanics: PositionAlphaSessionCommandMechanics,
  postseasonFixture?: WorldAlphaFixtureMechanics,
): value is PositionAlphaWeekSummaryV2 {
  try {
    if (
      !isRecord(value) ||
      value['model'] !== 'position_alpha_week_summary_v2' ||
      value['weekIndex'] !== weekIndex ||
      !isRecord(value['source']) ||
      !Array.isArray(value['decisionIds']) ||
      value['decisionIds'].length > 5 ||
      value['decisionIds'].some((id: unknown) => typeof id !== 'string')
    )
      return false;
    const source = value['source'] as unknown as PositionAlphaWeekSourceV2;
    if (
      !equalPositionAlphaEvidence(source, positionAlphaWeekSourceFields(source)) ||
      source.skills.equippedSkillIds.length !== 4 ||
      !Array.isArray(source.skills.ownedSkillIds) ||
      new Set(source.skills.ownedSkillIds).size !== source.skills.ownedSkillIds.length ||
      source.skills.ownedSkillIds.some((id) => !mechanics.skillIds.includes(id)) ||
      source.skills.equippedSkillIds.some(
        (id) => id !== null && !source.skills.ownedSkillIds.includes(id),
      )
    )
      return false;
    if (
      !validatePositionCareerLifecycle(source.lifecycle) ||
      source.lifecycle.offseason !== null ||
      source.player.id !== source.lifecycle.playerId ||
      source.player.positionId !== source.lifecycle.positionId ||
      source.room.playerId !== source.player.id ||
      source.room.programId !== source.lifecycle.currentProgramId ||
      !equalPositionAlphaEvidence(source.player.state, source.lifecycle.playerState) ||
      !equalPositionAlphaEvidence(source.training.attributes, source.player.attributes) ||
      !equalPositionAlphaEvidence(source.training.state, {
        body: source.player.state.body,
        preparation: source.player.state.preparation,
        confidence: source.player.state.confidence,
      })
    )
      return false;
    const identity = {
      appearance: source.player.appearance,
      archetypeId: source.player.archetypeId,
      displayName: source.player.displayName,
      heightCm: source.player.heightCm,
      personalityTraitIds: source.player.personalityTraitIds,
      positionId: source.player.positionId,
      recruitingBackgroundId: source.player.recruitingBackgroundId,
      weightKg: source.player.weightKg,
    };
    const created = createPositionPlayerProfile({
      identity,
      mechanics: mechanics.creation,
      careerSeed: source.lifecycle.careerSeed,
      playerId: source.player.id,
    });
    const overall = derivePositionOverall(source.player.positionId, source.player.attributes);
    if (
      !created.ok ||
      !overall.ok ||
      overall.overall !== source.player.overall ||
      !equalPositionAlphaEvidence(source.player, {
        ...identity,
        id: source.player.id,
        attributes: source.player.attributes,
        overall: source.player.overall,
        state: source.player.state,
        tagIds: created.player.tagIds,
      })
    )
      return false;
    const injury = value['injury'];
    if (
      !validatePositionInjuryWeek(injury, {
        lifecycle: mechanics.lifecycle,
        ...mechanics.injuries,
      }) ||
      injury.availability === null
    )
      return false;
    const preparation = preparePositionAlphaWeekV2(
      source,
      value['actionIds'],
      injury.source.currentInjury,
      mechanics,
      weekIndex,
    );
    if (preparation === null) return false;
    const academics = preparePositionAlphaAcademicsV2(
      source,
      preparation.player.state.gpa,
      weekIndex,
      mechanics.academics,
      preparation.nilObligationGpaDeltaMilli,
    );
    if (academics === null) return false;
    if (!isRecord(value['event'])) return false;
    const event = replayPositionAlphaEventV2(
      source,
      preparation,
      weekIndex,
      value['event']['selectedChoiceId'],
      mechanics,
    );
    if (event === null || !equalPositionAlphaEvidence(event, value['event'])) return false;
    const effectivePreparation = positionAlphaPreparationAfterEvent(preparation, event);
    if (effectivePreparation === null) return false;
    const assessed = assessPositionAlphaPreparedInjury(
      { ...source, careerRng: event.rng },
      effectivePreparation,
      injury.source.currentInjury,
      weekIndex,
      mechanics,
      academics.maximumOpportunities,
    );
    if (assessed === null || !equalPositionAlphaEvidence(assessed.source, injury.source))
      return false;
    const gameContext = positionAlphaGameContextAfterInjury(
      { ...source, events: event.afterEvents },
      effectivePreparation,
      injury,
    );
    if (gameContext === null) return false;
    const nil = preparePositionAlphaNilWeekV2(
      source,
      preparation,
      event,
      injury,
      weekIndex,
      mechanics,
    );
    if (nil === null || !equalPositionAlphaEvidence(nil, value['nil'])) return false;
    const fixture =
      postseasonFixture ??
      mechanics.world.regularSeasonRounds
        .find(({ roundNumber }) => roundNumber === weekIndex + 1)
        ?.fixtures.find(
          ({ homeProgramId, awayProgramId }) =>
            homeProgramId === source.lifecycle.currentProgramId ||
            awayProgramId === source.lifecycle.currentProgramId,
        );
    if (fixture === undefined) return false;
    let game = startPositionAlphaGame(
      { ...gameContext, careerRng: nil.rng },
      fixture,
      weekIndex,
      mechanics,
      injury.availability,
      academics.maximumOpportunities,
    );
    for (const id of value['decisionIds']) {
      if (game === null) return false;
      game = resolvePositionAlphaSnap(game, id);
    }
    if (game === null || game.game.type !== 'COMPLETE') return false;
    const expected = derivePositionAlphaWeekSummaryV2(
      source,
      preparation,
      game as CompletedPositionGame,
      value['decisionIds'] as string[],
      mechanics,
      injury,
      event,
      nil,
    );
    return expected !== null && equalPositionAlphaEvidence(expected, value);
  } catch {
    return false;
  }
}
