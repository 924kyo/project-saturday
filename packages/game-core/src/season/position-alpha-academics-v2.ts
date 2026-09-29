import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import {
  positionAlphaSourceCareerWeekIndexV2,
  type PositionAlphaCalendarSourceV2,
} from './position-alpha-calendar-v2.js';
import { isGameId, type GameId } from '../games/ids.js';
import { deriveAcademicCheckpointEvidence, initialAcademicStatus } from '../off-field/academics.js';
import { isAcademicTuning } from '../off-field/definitions.js';
import type {
  AcademicCheckpointEvidenceV1,
  AcademicGameRestrictionEvidenceV1,
  AcademicTuningDefinition,
  ActiveAcademicCareerStateV1,
} from '../off-field/types.js';

/** Activated ledger, absent from literal migration. Historical dates are not fabricated exams. */
export interface PositionAlphaAcademicStateV2 {
  readonly model: 'position_alpha_academics_v2';
  readonly activatedAtCareerWeekIndex: number;
  readonly state: ActiveAcademicCareerStateV1;
}
export interface PositionAlphaAcademicWeekV2 {
  readonly model: 'position_alpha_academic_week_v2';
  readonly weekIndex: number;
  readonly before: PositionAlphaAcademicStateV2;
  readonly checkpoint: AcademicCheckpointEvidenceV1 | null;
  readonly afterCheckpoint: PositionAlphaAcademicStateV2;
  readonly maximumOpportunities: 0 | 5;
}
export interface PositionAlphaAcademicSettlementV2 extends PositionAlphaAcademicWeekV2 {
  readonly gameRestriction: AcademicGameRestrictionEvidenceV1 | null;
  readonly afterGame: PositionAlphaAcademicStateV2;
}
export type PositionAlphaAcademicSourceV2 = PositionAlphaCalendarSourceV2 & {
  readonly academics?: PositionAlphaAcademicStateV2;
  readonly player: { readonly state: { readonly gpa: number } };
  readonly lifecycle: { readonly activeSeasonIndex: number };
};

/** Source chain is anchored by the strict aggregate reader; this function grants no RNG or rewards. */
export function preparePositionAlphaAcademicsV2(
  source: PositionAlphaAcademicSourceV2,
  preparedGpa: number,
  weekIndex: number,
  tuning: AcademicTuningDefinition,
  obligationGpaDeltaMilli = 0,
): PositionAlphaAcademicWeekV2 | null {
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(source, weekIndex);
  if (
    careerWeekIndex === null ||
    !isAcademicTuning(tuning) ||
    !Number.isInteger(weekIndex) ||
    weekIndex < 0 ||
    weekIndex > 13 ||
    !Number.isFinite(preparedGpa) ||
    preparedGpa < 0 ||
    preparedGpa > 4 ||
    !Number.isFinite(source.player.state.gpa) ||
    source.player.state.gpa < 0 ||
    source.player.state.gpa > 4 ||
    ![0, 1].includes(source.lifecycle.activeSeasonIndex)
  )
    return null;
  const termIndex = source.lifecycle.activeSeasonIndex + 1;
  const nextIndex =
    termIndex === 1
      ? tuning.checkpoints.findIndex((checkpoint) => checkpoint.weekIndex >= weekIndex)
      : -1;
  const before: PositionAlphaAcademicStateV2 = Object.hasOwn(source, 'academics')
    ? source.academics!
    : {
        model: 'position_alpha_academics_v2',
        activatedAtCareerWeekIndex: careerWeekIndex,
        state: {
          model: 'academic_v1',
          bootstrapStatus: 'ACTIVE',
          termIndex,
          eligibilityStatus: initialAcademicStatus(
            Math.round(source.player.state.gpa * 1000),
            tuning,
          ),
          nextCheckpointIndex: nextIndex === -1 ? tuning.checkpoints.length : nextIndex,
          restrictionGamesRemaining: 0,
          lastCheckpoint: null,
          checkpointHistory: [],
          lastGameRestriction: null,
          gameRestrictionHistory: [],
        },
      };
  if (
    before?.model !== 'position_alpha_academics_v2' ||
    before.state?.model !== 'academic_v1' ||
    before.state.termIndex !== termIndex
  )
    return null;
  const due = tuning.checkpoints[before.state.nextCheckpointIndex];
  if (due !== undefined && (termIndex !== 1 || due.weekIndex < weekIndex)) return null;
  let checkpoint: AcademicCheckpointEvidenceV1 | null = null;
  if (due?.weekIndex === weekIndex) {
    if (
      before.state.checkpointHistory.some(
        (entry) => entry.termIndex === termIndex && entry.checkpointId === due.id,
      )
    )
      return null;
    checkpoint = deriveAcademicCheckpointEvidence(
      {
        termIndex,
        weekIndex,
        gpaMilli: Math.round(preparedGpa * 1000),
        obligationGpaDeltaMilli,
        statusBefore: before.state.eligibilityStatus,
        restrictionGamesBefore: before.state.restrictionGamesRemaining,
      },
      tuning,
    );
    if (checkpoint === null) return null;
  }
  const afterCheckpoint =
    checkpoint === null
      ? before
      : {
          ...before,
          state: {
            ...before.state,
            eligibilityStatus: checkpoint.statusAfter,
            nextCheckpointIndex: before.state.nextCheckpointIndex + 1,
            restrictionGamesRemaining: checkpoint.restrictionGamesAfter,
            lastCheckpoint: checkpoint,
            checkpointHistory: [...before.state.checkpointHistory, checkpoint],
          },
        };
  return deepFreeze(
    cloneSerializable({
      model: 'position_alpha_academic_week_v2',
      weekIndex,
      before,
      checkpoint,
      afterCheckpoint,
      maximumOpportunities: afterCheckpoint.state.restrictionGamesRemaining > 0 ? 0 : 5,
    }),
  );
}

export function settlePositionAlphaAcademicsV2(
  week: PositionAlphaAcademicWeekV2,
  gameId: GameId,
): PositionAlphaAcademicSettlementV2 | null {
  if (!isGameId(gameId)) return null;
  const previous = week.afterCheckpoint;
  if (previous.state.gameRestrictionHistory.some((entry) => entry.gameId === gameId)) return null;
  const remaining = previous.state.restrictionGamesRemaining;
  const gameRestriction: AcademicGameRestrictionEvidenceV1 | null =
    remaining === 0
      ? null
      : {
          model: 'academic_game_restriction_v1',
          gameId,
          weekIndex: week.weekIndex,
          restrictionGamesBefore: remaining,
          restrictionGamesAfter: remaining - 1,
        };
  const afterGame =
    gameRestriction === null
      ? previous
      : {
          ...previous,
          state: {
            ...previous.state,
            restrictionGamesRemaining: gameRestriction.restrictionGamesAfter,
            lastGameRestriction: gameRestriction,
            gameRestrictionHistory: [...previous.state.gameRestrictionHistory, gameRestriction],
          },
        };
  return deepFreeze(cloneSerializable({ ...week, gameRestriction, afterGame }));
}
