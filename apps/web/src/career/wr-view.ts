import type {
  CareerRun,
  CareerRunV8,
  CareerSession,
  CareerSessionV8,
  WrTacticalGameV1,
  WrTwoSeasonReviewV1,
} from '@project-saturday/game-core';

/** Presentation accepts both saved versions; commands and historical parsers stay versioned. */
export type WrCareerSurface = CareerRun | CareerRunV8;
export type WrSessionSurface = CareerSession | CareerSessionV8;
export type WrResolvedSnapSurface = Extract<
  CareerRunV8['phase'],
  { readonly type: 'SNAP_RESOLVED' }
>['result'];

function isNeutralCareer(career: WrCareerSurface): boolean {
  if (career.schemaVersion === 7) return true;
  return (
    career.tacticalGame === undefined &&
    career.terminalReview === undefined &&
    career.terminalCompletion === undefined &&
    !('rulesVersion' in career.phase)
  );
}

/**
 * Marker-only v7 view of a record that holds no current tactical/terminal evidence. Returns null
 * rather than stripping any current field; callers must render current records explicitly.
 */
export function neutralWrSessionView(session: WrSessionSurface): CareerSession | null {
  if (session.schemaVersion === 7) return session;
  if (!isNeutralCareer(session.career)) return null;
  return {
    ...session,
    schemaVersion: 7,
    career: {
      ...session.career,
      schemaVersion: 7,
      phase: session.career.phase as CareerRun['phase'],
    },
  };
}

export function wrTacticalGame(career: WrCareerSurface): WrTacticalGameV1 | null {
  return career.schemaVersion === 8 ? (career.tacticalGame ?? null) : null;
}

export function wrResolvedSnap(career: WrCareerSurface): WrResolvedSnapSurface | null {
  return career.phase.type === 'SNAP_RESOLVED' ? career.phase.result : null;
}

/** Retained source-validated second-season review; absent for historical one-season careers. */
export function wrTerminalReview(career: WrCareerSurface): WrTwoSeasonReviewV1 | null {
  return career.schemaVersion === 8 ? (career.terminalReview ?? null) : null;
}
