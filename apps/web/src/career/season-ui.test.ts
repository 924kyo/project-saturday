import { createEmptyMetaProfile, validateCareerSession } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  createCompletedSeasonFixture,
  createPendingSeasonFixture,
  createSeasonDecisionFixtures,
} from '../test/season-fixture';
import {
  bootstrapCareerSeason,
  completeCareerSeason,
  enterCareerSeasonReview,
  initializeCareerPostseason,
  resolveSeasonEventChoice,
  resolveSeasonInjuryChoice,
} from './season-ui';

describe('season UI command adapter', () => {
  it('bootstraps only the saved aggregate and retains a valid camp boundary', () => {
    const source = createPendingSeasonFixture('season-ui-bootstrap-command');
    const result = bootstrapCareerSeason(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(source.career.seasonCareerState.bootstrapStatus).toBe('PENDING');
    expect(result.session.career.seasonCareerState.bootstrapStatus).toBe('ACTIVE');
    expect(result.session.world.calendar.type).toBe('ACTIVE');
    expect(validateCareerSession(result.session).ok).toBe(true);
  });

  it('continues an event choice through the next saved decision or calendar boundary', () => {
    const source = createSeasonDecisionFixtures().eventSession;
    if (source.career.phase.type !== 'EVENT_CHOICE') throw new Error('Expected event fixture.');
    const result = resolveSeasonEventChoice(source, source.career.phase.pendingEvent.choiceIds[0]!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(source.career.phase.type).toBe('EVENT_CHOICE');
    expect(result.session.career.phase.type).not.toBe('EVENT_CHOICE');
    expect(validateCareerSession(result.session).ok).toBe(true);
  });

  it('continues an injury choice without leaving a stale pending decision', () => {
    const source = createSeasonDecisionFixtures().injurySession;
    const result = resolveSeasonInjuryChoice(source, 'injury_choice_rest_rehab');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(source.career.phase.type).toBe('INJURY_CHOICE');
    expect(result.session.career.phase.type).not.toBe('INJURY_CHOICE');
    expect(validateCareerSession(result.session).ok).toBe(true);
  });

  it('adapts postseason, review, and completion without inventing UI state', () => {
    const fixture = createCompletedSeasonFixture();
    const initialized = initializeCareerPostseason(fixture.postseasonPendingSession);
    expect(initialized.ok).toBe(true);
    const reviewed = enterCareerSeasonReview(fixture.postseasonCompleteSession);
    expect(reviewed).toEqual({ ok: true, session: fixture.reviewSession });
    const completed = completeCareerSeason(fixture.reviewSession, createEmptyMetaProfile());
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.session).toEqual(fixture.completedSession);
    expect(completed.meta).toEqual(fixture.completedMeta);
    expect(completed.alumni).toEqual(fixture.completedMeta.alumni[0]);
  });
});
