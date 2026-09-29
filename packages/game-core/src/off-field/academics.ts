import { deepFreeze } from '../player/immutable.js';
import { isAcademicTuning } from './definitions.js';
import type {
  AcademicCheckpointEvidenceV1,
  AcademicEligibilityStatus,
  AcademicTuningDefinition,
} from './types.js';

export function initialAcademicStatus(
  gpaMilli: number,
  tuning: AcademicTuningDefinition,
): Exclude<AcademicEligibilityStatus, 'PENDING'> {
  return gpaMilli >= tuning.eligibleGpaMilli ? 'ELIGIBLE' : 'WARNING';
}

export interface AcademicCheckpointInput {
  readonly termIndex: number;
  readonly weekIndex: number;
  readonly gpaMilli: number;
  readonly obligationGpaDeltaMilli: number;
  readonly statusBefore: Exclude<AcademicEligibilityStatus, 'PENDING'>;
  readonly restrictionGamesBefore: number;
}

/** Shared fictional eligibility arithmetic; calendar/duplicate guards belong to the owning command. */
export function deriveAcademicCheckpointEvidence(
  input: AcademicCheckpointInput,
  tuning: AcademicTuningDefinition,
): AcademicCheckpointEvidenceV1 | null {
  if (
    !isAcademicTuning(tuning) ||
    !Number.isSafeInteger(input.termIndex) ||
    input.termIndex < 1 ||
    !Number.isSafeInteger(input.weekIndex) ||
    input.weekIndex < 0 ||
    !Number.isInteger(input.gpaMilli) ||
    input.gpaMilli < 0 ||
    input.gpaMilli > 4000 ||
    !Number.isInteger(input.obligationGpaDeltaMilli) ||
    Math.abs(input.obligationGpaDeltaMilli) > 1000 ||
    !['ELIGIBLE', 'WARNING', 'INELIGIBLE'].includes(input.statusBefore) ||
    !Number.isInteger(input.restrictionGamesBefore) ||
    input.restrictionGamesBefore < 0 ||
    input.restrictionGamesBefore > 3
  )
    return null;
  const checkpoint = tuning.checkpoints.find(({ weekIndex }) => weekIndex === input.weekIndex);
  if (checkpoint === undefined) return null;
  const statusAfter =
    input.gpaMilli >= tuning.eligibleGpaMilli
      ? 'ELIGIBLE'
      : input.gpaMilli >= tuning.warningGpaMilli
        ? 'WARNING'
        : 'INELIGIBLE';
  const requestedRestrictionGames = statusAfter === 'INELIGIBLE' ? tuning.restrictionGames : 0;
  const restrictionGamesAfter = Math.max(input.restrictionGamesBefore, requestedRestrictionGames);
  return deepFreeze({
    model: 'academic_checkpoint_v1',
    checkpointId: checkpoint.id,
    termIndex: input.termIndex,
    weekIndex: input.weekIndex,
    gpaMilli: input.gpaMilli,
    obligationGpaDeltaMilli: input.obligationGpaDeltaMilli,
    eligibleGpaMilli: tuning.eligibleGpaMilli,
    warningGpaMilli: tuning.warningGpaMilli,
    statusBefore: input.statusBefore,
    statusAfter,
    restrictionGamesBefore: input.restrictionGamesBefore,
    requestedRestrictionGames,
    actualRestrictionGames: restrictionGamesAfter - input.restrictionGamesBefore,
    restrictionGamesAfter,
  });
}
