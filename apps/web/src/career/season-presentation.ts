import { deriveShippedOffFieldWeekProjection } from '@project-saturday/game-content/content';
import type { WrSessionSurface } from './wr-view';

export function hasBlockingOffFieldDecision(session: WrSessionSurface): boolean {
  return (
    deriveShippedOffFieldWeekProjection(session)?.nil.activeObligation?.resolutionRequired === true
  );
}

export function hasBlockingSeasonDecision(session: WrSessionSurface): boolean {
  const phase = session.career.phase;
  if (
    phase.type === 'EVENT_CHOICE' ||
    phase.type === 'INJURY_CHOICE' ||
    phase.type === 'SEASON_REVIEW' ||
    phase.type === 'CAREER_COMPLETE'
  ) {
    return true;
  }
  if (phase.type !== 'PLAN_ACTIONS') return false;
  if (session.career.seasonCareerState.bootstrapStatus === 'PENDING') {
    return session.career.recruitingState.type === 'COMMITTED';
  }
  return (
    session.world.calendar.type === 'ACTIVE' &&
    session.world.calendar.stage === 'POSTSEASON' &&
    session.world.calendar.postseason.type !== 'ACTIVE'
  );
}
