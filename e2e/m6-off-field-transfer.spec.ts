import { expect, test, type Page } from '@playwright/test';

import {
  chooseFirstPendingBreakthrough,
  expectHorizontallyWithinViewport,
  expectNoHorizontalOverflow,
  expectTouchTarget,
  fillRepresentativeCreation,
  finishShippedDevelopmentWeek,
  readActiveSession,
  type AppLocale,
  type PersistedCareer,
  type PersistedCareerSession,
  type PersistedOffFieldCareerState,
} from './support/career';
import { readIndexedDbValue } from './support/indexed-db';

const M6_CAREER_UUID = '00000000-0000-4000-8000-000000000001';
const SAFE_PLAN = ['action_film_study', 'action_study_hall', 'action_recovery'] as const;
const RISK_PLAN = ['action_route_drills', 'action_hands_catch_work', 'action_recovery'] as const;

const POSITIVE_BRAND_CHOICE_IDS = new Set([
  'event_choice_low_profile_feature_written',
  'event_choice_campus_open_mic_join',
  'event_choice_campus_open_mic_host',
  'event_choice_bold_prediction_say_it',
  'event_choice_autograph_line_stay',
  'event_choice_ticket_requests_coordinate',
  'event_choice_donor_dinner_attend',
  'event_choice_youth_clinic_lead',
  'event_choice_camera_walk_take',
  'event_choice_campus_bridge_lead',
  'event_choice_design_request_collaborate',
]);

interface SaveEnvelope<T> {
  readonly checksum: string;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly saveVersion: number;
  readonly payload: T;
  readonly updatedAt: string;
}

interface M6Session extends PersistedCareerSession {
  readonly schemaVersion: 7;
  readonly career: PersistedCareer & {
    readonly offFieldCareerState: PersistedOffFieldCareerState;
    readonly schemaVersion: 7;
  };
}

interface JourneyPolicy {
  readonly academicRisk: 'HIGH' | 'LOW';
  readonly failAcceptedOfferSave: boolean;
  readonly locale: AppLocale;
  readonly offseasonChoice: 'STAY' | 'TRANSFER';
}

interface JourneyEvidence {
  readonly acceptedOfferCount: number;
  readonly declinedOfferCount: number;
  readonly fulfilledObligationCount: number;
  readonly initialProgramContext: NonNullable<PersistedCareer['programContext']>;
  readonly initialSession: M6Session;
  readonly reviewSession: M6Session;
}

function requireM6Session(session: PersistedCareerSession | undefined): M6Session {
  if (
    session === undefined ||
    session.schemaVersion !== 7 ||
    session.career.schemaVersion !== 7 ||
    session.career.offFieldCareerState === undefined
  ) {
    throw new Error('m6_session_missing_or_not_v6');
  }
  return session as M6Session;
}

async function readM6Session(page: Page): Promise<M6Session> {
  return requireM6Session(await readActiveSession(page));
}

function sessionMarker(session: M6Session): string {
  return [
    session.career.revision,
    session.world.revision,
    session.career.phase.type,
    session.career.offFieldCareerState.offseason.status,
  ].join(':');
}

async function waitForM6SessionChange(page: Page, previous: M6Session): Promise<M6Session> {
  const marker = sessionMarker(previous);
  await expect.poll(async () => sessionMarker(await readM6Session(page))).not.toBe(marker);
  return readM6Session(page);
}

async function readCurrentCareerEnvelope(page: Page): Promise<SaveEnvelope<M6Session> | undefined> {
  return readIndexedDbValue<SaveEnvelope<M6Session>>(page, 'currentCareer', 'active');
}

async function readMetaEnvelope(page: Page): Promise<SaveEnvelope<unknown> | undefined> {
  return readIndexedDbValue<SaveEnvelope<unknown>>(page, 'profile', 'meta');
}

async function expectCurrentSessionEnvelope(page: Page, session: M6Session): Promise<void> {
  const envelope = await readCurrentCareerEnvelope(page);
  if (envelope === undefined) throw new Error('m6_current_envelope_missing');
  expect(envelope.payload).toEqual(session);
  expect(envelope).toMatchObject({ contentVersion: '1', saveVersion: 7 });
  expect(envelope.checksum).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
  expect(envelope.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(envelope.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(envelope.createdAt.localeCompare(envelope.updatedAt)).toBeLessThanOrEqual(0);
}

async function installM6CareerSeed(page: Page): Promise<void> {
  await page.addInitScript((fixedUuid) => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      configurable: true,
      value: () => fixedUuid,
    });
  }, M6_CAREER_UUID);
}

async function expectServiceWorkerControl(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker?.controller?.state ?? null), {
      timeout: 15_000,
    })
    .toBe('activated');
}

async function reloadOffline(page: Page, expectedSession: M6Session): Promise<void> {
  await expectServiceWorkerControl(page);
  await page.context().setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-shell')).toBeVisible();
    expect(await readM6Session(page)).toEqual(expectedSession);
  } finally {
    await page.context().setOffline(false);
  }
}

async function failNextAutosaveSnapshotWrite(page: Page): Promise<void> {
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function patchedPut(
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ): IDBRequest<IDBValidKey> {
      if (this.name === 'autosaveSnapshots') {
        IDBObjectStore.prototype.put = originalPut;
        throw new DOMException('Intentional M6 atomic save failure.', 'AbortError');
      }
      return Reflect.apply(
        originalPut,
        this,
        key === undefined ? [value] : [value, key],
      ) as IDBRequest<IDBValidKey>;
    };
  });
}

async function clickDecisionButton(
  page: Page,
  surfaceTestId: string,
  index: number,
): Promise<void> {
  const button = page.getByTestId(surfaceTestId).getByRole('button').nth(index);
  await expectTouchTarget(button);
  await expectHorizontallyWithinViewport(page, button);
  await button.click();
}

async function createM6Career(
  page: Page,
  locale: AppLocale,
  playerName: string,
): Promise<M6Session> {
  await installM6CareerSeed(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await page.evaluate(() => navigator.serviceWorker?.ready.then(() => true));
  await page.reload();
  await expectServiceWorkerControl(page);
  await fillRepresentativeCreation(page, locale, playerName);
  await page.locator('input[name="personality"][value="personality_leader"]').uncheck();
  await page.locator('input[name="personality"][value="personality_social"]').check();
  await page.getByTestId('creation-submit').click();
  await expect
    .poll(async () => {
      const session = await readActiveSession(page);
      if (
        session === undefined ||
        session.schemaVersion !== 7 ||
        session.career.schemaVersion !== 7 ||
        session.career.offFieldCareerState === undefined
      ) {
        return null;
      }
      return session.career.recruitingState.type;
    })
    .toBe('CHOOSING');
  const choosing = await readM6Session(page);
  if (choosing.career.recruitingState.type !== 'CHOOSING') {
    throw new Error('m6_recruiting_offers_missing');
  }
  const selectedOffer = choosing.career.recruitingState.offers[0];
  if (selectedOffer === undefined) throw new Error('m6_first_recruiting_offer_missing');
  await page.locator(`input[name="program-offer"][value="${selectedOffer.programId}"]`).check();
  await page.getByTestId('commit-program').click();
  await expect
    .poll(async () => {
      const session = await readM6Session(page);
      return {
        academicBootstrap: session.career.offFieldCareerState.academics.bootstrapStatus,
        programId: session.career.programId,
        recruitingType: session.career.recruitingState.type,
        revision: session.career.revision,
        seasonBootstrap: session.career.seasonCareerState.bootstrapStatus,
      };
    })
    .toEqual({
      academicBootstrap: 'ACTIVE',
      programId: selectedOffer.programId,
      recruitingType: 'COMMITTED',
      revision: choosing.career.revision + 3,
      seasonBootstrap: 'ACTIVE',
    });
  const enrolled = await readM6Session(page);
  expect(enrolled.career.careerSeed).toBe(`career-seed:${M6_CAREER_UUID}`);
  expect(enrolled.career.seasonCareerState.bootstrapStatus).toBe('ACTIVE');
  expect(enrolled.career.offFieldCareerState.academics.bootstrapStatus).toBe('ACTIVE');
  expect(enrolled.career.offFieldCareerState.relationships.bootstrapStatus).toBe('ACTIVE');
  expect(enrolled.career.offFieldCareerState.nil.bootstrapStatus).toBe('ACTIVE');
  expect(await readCurrentCareerEnvelope(page)).toMatchObject({ saveVersion: 7 });
  return enrolled;
}

function chooseEventChoiceId(career: PersistedCareer): string {
  if (career.phase.type !== 'EVENT_CHOICE') throw new Error('m6_event_choice_not_pending');
  return (
    career.phase.pendingEvent.choiceIds.find((choiceId) =>
      POSITIVE_BRAND_CHOICE_IDS.has(choiceId),
    ) ?? career.phase.pendingEvent.choiceIds[0]!
  );
}

async function decidePendingNilOffer(
  page: Page,
  current: M6Session,
  policy: JourneyPolicy,
  evidence: { accepted: number; declined: number; failedSaveUsed: boolean },
): Promise<M6Session> {
  const nil = current.career.offFieldCareerState.nil;
  const pending = nil.pendingOffers[0];
  if (pending === undefined) return current;
  await expect(page.getByTestId('nil-offer-decision')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const shouldAccept = policy.academicRisk === 'LOW' && evidence.accepted === 0;
  if (!shouldAccept) {
    await clickDecisionButton(page, 'nil-offer-decision', 1);
    const declined = await waitForM6SessionChange(page, current);
    evidence.declined += 1;
    expect(declined.career.offFieldCareerState.nil.history.at(-1)).toMatchObject({
      decisionId: 'DECLINE',
      model: 'nil_offer_decision_v1',
      offer: { offerId: pending.offerId },
    });
    return declined;
  }

  const fundsBefore = nil.fictionalFundsUsd;
  const historyCountBefore = nil.history.length;
  if (policy.failAcceptedOfferSave && !evidence.failedSaveUsed) {
    const envelopeBeforeFailure = await readCurrentCareerEnvelope(page);
    await failNextAutosaveSnapshotWrite(page);
    await clickDecisionButton(page, 'nil-offer-decision', 0);
    const warning = page.getByTestId('save-failure');
    await expect(warning).toBeVisible();
    await expect(warning).toBeFocused();
    expect(await readM6Session(page)).toEqual(current);
    expect(await readCurrentCareerEnvelope(page)).toEqual(envelopeBeforeFailure);
    await expect(page.getByTestId('nil-offer-decision').getByRole('button').nth(0)).toBeDisabled();
    await page.getByTestId('retry-save').click();
    await expect(warning).not.toBeVisible();
    evidence.failedSaveUsed = true;
  } else {
    await clickDecisionButton(page, 'nil-offer-decision', 0);
  }

  const accepted = await waitForM6SessionChange(page, current);
  const acceptedNil = accepted.career.offFieldCareerState.nil;
  evidence.accepted += 1;
  expect(acceptedNil.history).toHaveLength(historyCountBefore + 1);
  expect(acceptedNil.history.at(-1)).toMatchObject({
    decisionId: 'ACCEPT',
    model: 'nil_offer_decision_v1',
    offer: { offerId: pending.offerId },
  });
  expect(acceptedNil.activeObligation).toMatchObject({ offerId: pending.offerId });
  expect(acceptedNil.pendingOffers).toHaveLength(0);
  expect(acceptedNil.fictionalFundsUsd).toBeGreaterThanOrEqual(fundsBefore);
  return accepted;
}

async function resolveDueNilObligation(
  page: Page,
  current: M6Session,
  fulfilledCount: { value: number },
): Promise<M6Session> {
  const obligation = current.career.offFieldCareerState.nil.activeObligation;
  if (obligation === null || obligation.lastResolvedWeekIndex === current.career.weekIndex) {
    return current;
  }
  await expect(page.getByTestId('nil-obligation-decision')).toBeVisible();
  await expect(page.getByTestId('action-commit')).toHaveCount(0);
  await clickDecisionButton(page, 'nil-obligation-decision', 0);
  const fulfilled = await waitForM6SessionChange(page, current);
  fulfilledCount.value += 1;
  expect(fulfilled.career.offFieldCareerState.nil.history.at(-1)).toMatchObject({
    model: 'nil_obligation_resolution_v1',
    offerId: obligation.offerId,
    resolutionId: 'FULFILL',
  });
  return fulfilled;
}

async function playPreparedGame(page: Page, current: M6Session): Promise<M6Session> {
  expect(current.career.phase.type).toBe('GAME_PREVIEW');
  await page.getByTestId('start-game').click();
  current = await waitForM6SessionChange(page, current);
  let snapCount = 0;
  while (current.career.phase.type === 'KEY_SNAP') {
    const decisionId = current.career.phase.pendingSnap.decisionIds[0];
    await page.getByTestId(`game-decision-${decisionId}`).click();
    current = await waitForM6SessionChange(page, current);
    snapCount += 1;
    if (snapCount > 12) throw new Error('m6_key_snap_limit_exceeded');
  }
  expect(current.career.phase.type).toBe('POST_GAME');
  return current;
}

async function playSeasonToReview(page: Page, policy: JourneyPolicy): Promise<JourneyEvidence> {
  const initialSession = await createM6Career(page, policy.locale, `${policy.locale} M6 Saturday`);
  if (initialSession.career.programContext === null) throw new Error('m6_program_context_missing');
  const initialProgramContext = initialSession.career.programContext;
  const nilEvidence = { accepted: 0, declined: 0, failedSaveUsed: false };
  const fulfilled = { value: 0 };
  const actionPlan = policy.academicRisk === 'LOW' ? SAFE_PLAN : RISK_PLAN;
  let current = initialSession;

  for (let transitionCount = 0; transitionCount < 260; transitionCount += 1) {
    if (transitionCount % 6 === 0) await expectNoHorizontalOverflow(page);
    switch (current.career.phase.type) {
      case 'PLAN_ACTIONS': {
        const afterObligation = await resolveDueNilObligation(page, current, fulfilled);
        if (afterObligation !== current) {
          current = afterObligation;
          break;
        }
        const afterOffer = await decidePendingNilOffer(page, current, policy, nilEvidence);
        if (afterOffer !== current) {
          current = afterOffer;
          break;
        }
        if (await page.getByTestId('postseason-initialize').isVisible()) {
          const before = current;
          await clickDecisionButton(page, 'postseason-initialize', 0);
          current = await waitForM6SessionChange(page, before);
          break;
        }
        if (await page.getByTestId('season-review-entry').isVisible()) {
          const before = current;
          await clickDecisionButton(page, 'season-review-entry', 0);
          current = await waitForM6SessionChange(page, before);
          break;
        }
        const weekEnd = await finishShippedDevelopmentWeek(page, current.career, actionPlan);
        current = await readM6Session(page);
        expect(current.career).toEqual(weekEnd);
        break;
      }
      case 'SKILL_BREAKTHROUGH': {
        const before = current;
        await chooseFirstPendingBreakthrough(page, current.career);
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'WEEK_END': {
        const before = current;
        await page.getByTestId('advance-week').click();
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'EVENT_CHOICE': {
        const choiceId = chooseEventChoiceId(current.career);
        const before = current;
        await page.getByTestId(`season-event-choice-${choiceId}`).click();
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'INJURY_CHOICE': {
        const choiceId = current.career.phase.pendingInjury.choiceIds[0];
        if (choiceId === undefined) throw new Error('m6_injury_choice_missing');
        const before = current;
        await page.getByTestId(`season-injury-choice-${choiceId}`).click();
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'GAME_PREVIEW':
        current = await playPreparedGame(page, current);
        break;
      case 'KEY_SNAP':
      case 'RESOLVE_ACTIONS':
        throw new Error(`m6_unexpected_partial_phase:${current.career.phase.type}`);
      case 'POST_GAME': {
        const before = current;
        await page.getByTestId('advance-week').click();
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'SEASON_REVIEW':
        expect(nilEvidence.accepted + nilEvidence.declined).toBeGreaterThan(0);
        if (policy.academicRisk === 'LOW') {
          expect(nilEvidence.accepted).toBe(1);
          expect(fulfilled.value).toBeGreaterThan(0);
          if (policy.failAcceptedOfferSave) expect(nilEvidence.failedSaveUsed).toBe(true);
        } else {
          expect(nilEvidence.declined).toBeGreaterThan(0);
        }
        return {
          acceptedOfferCount: nilEvidence.accepted,
          declinedOfferCount: nilEvidence.declined,
          fulfilledObligationCount: fulfilled.value,
          initialProgramContext,
          initialSession,
          reviewSession: current,
        };
      case 'CAREER_COMPLETE':
        throw new Error('m6_career_completed_instead_of_offseason_review');
    }
  }
  throw new Error('m6_full_season_transition_limit_exceeded');
}

async function inspectOffFieldConsequences(
  page: Page,
  policy: JourneyPolicy,
  review: M6Session,
): Promise<void> {
  const academics = review.career.offFieldCareerState.academics;
  expect(academics.checkpointHistory).toHaveLength(2);
  if (policy.academicRisk === 'LOW') {
    expect(review.career.player.state.gpa).toBeGreaterThanOrEqual(3.5);
    expect(academics.checkpointHistory.every(({ statusAfter }) => statusAfter === 'ELIGIBLE')).toBe(
      true,
    );
  } else {
    expect(review.career.player.state.gpa).toBeLessThan(3.5);
  }

  const tracks = review.career.offFieldCareerState.relationships.tracks;
  expect(tracks).toHaveLength(3);
  expect(tracks.some(({ value }) => value !== 50)).toBe(true);
  await page.getByTestId('career-nav-team').click();
  const overview = page.getByTestId('off-field-overview');
  await expect(overview).toBeVisible();
  for (const track of tracks) await expect(overview).toContainText(String(track.value));
  await expectNoHorizontalOverflow(page);
  await page.getByTestId('career-nav-week').click();
}

async function completeOffseason(
  page: Page,
  policy: JourneyPolicy,
  journey: JourneyEvidence,
): Promise<M6Session> {
  let current = journey.reviewSession;
  const review = page.getByTestId('season-review');
  await expect(review).toBeVisible();
  await expect(review.getByRole('img')).toBeVisible();
  const metaBefore = await readMetaEnvelope(page);
  await expectCurrentSessionEnvelope(page, current);

  await reloadOffline(page, current);
  await expect(page.getByTestId('offseason-entry')).toBeVisible();
  await clickDecisionButton(page, 'offseason-entry', 0);
  current = await waitForM6SessionChange(page, current);
  const offseason = current.career.offFieldCareerState.offseason;
  expect(offseason.status).toBe('PROJECTED');
  if (offseason.status !== 'PROJECTED') throw new Error('m6_offseason_projection_missing');
  await expect(page.getByTestId('offseason-board')).toBeVisible();
  await expect(page.locator('[data-testid^="offseason-option-"]')).toHaveCount(4);
  await expectNoHorizontalOverflow(page);

  const selectedProgramId =
    policy.offseasonChoice === 'STAY'
      ? offseason.transferProjection.stayOption.programId
      : offseason.transferProjection.transferOptions[0].programId;
  const projectedSession = current;
  await clickDecisionButton(page, `offseason-option-${selectedProgramId}`, 0);
  current = await waitForM6SessionChange(page, projectedSession);
  const decided = current.career.offFieldCareerState.offseason;
  expect(decided.status).toBe('DECIDED');
  if (decided.status !== 'DECIDED') throw new Error('m6_offseason_decision_missing');
  expect(decided.lastDecision.kind).toBe(policy.offseasonChoice);
  expect(decided.lastDecision.selectedProgramId).toBe(selectedProgramId);
  expect(current.career.programId).toBe(selectedProgramId);
  await expect(page.getByTestId('offseason-decided')).toBeVisible();

  const savedDecision = current;
  await page.reload();
  await expect(page.getByTestId('offseason-decided')).toBeVisible();
  expect(await readM6Session(page)).toEqual(savedDecision);
  await clickDecisionButton(page, 'offseason-decided', 0);
  current = await waitForM6SessionChange(page, savedDecision);
  expect(current.career.phase.type).toBe('PLAN_ACTIONS');
  expect(current.career.seasonCareerState.bootstrapStatus).toBe('ACTIVE');
  expect(current.career.seasonCareerState.seasonsCompleted).toBe(1);
  expect(current.world.completedSeasonHistory).toHaveLength(1);
  expect(current.career.offFieldCareerState.programHistory).toHaveLength(
    policy.offseasonChoice === 'TRANSFER' ? 2 : 1,
  );
  expect(await readMetaEnvelope(page)).toEqual(metaBefore);

  if (policy.offseasonChoice === 'TRANSFER') {
    expect(current.career.programId).not.toBe(journey.initialSession.career.programId);
    expect(current.career.programContext?.programId).toBe(selectedProgramId);
    expect(current.career.programContext?.depthOrderIds).not.toEqual(
      journey.initialProgramContext.depthOrderIds,
    );
    expect(current.career.programContext?.competitors.map(({ id }) => id)).not.toEqual(
      journey.initialProgramContext.competitors.map(({ id }) => id),
    );
    await page.getByTestId('career-nav-team').click();
    await expect(page.getByTestId('program-depth')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await reloadOffline(page, current);
    await page.getByTestId('career-nav-team').click();
    await expect(page.getByTestId('program-depth')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('career-nav-week').click();
  } else {
    expect(current.career.programId).toBe(journey.initialSession.career.programId);
  }
  return current;
}

async function playNextSeasonOpeningGame(page: Page, starting: M6Session): Promise<M6Session> {
  const gamesBefore = starting.career.gameCareerState.gamesPlayed;
  let current = starting;
  for (let transitionCount = 0; transitionCount < 80; transitionCount += 1) {
    switch (current.career.phase.type) {
      case 'PLAN_ACTIONS': {
        const nil = current.career.offFieldCareerState.nil;
        if (
          nil.activeObligation !== null &&
          nil.activeObligation.lastResolvedWeekIndex !== current.career.weekIndex
        ) {
          current = await resolveDueNilObligation(page, current, { value: 0 });
          break;
        }
        if (nil.pendingOffers.length > 0) {
          await clickDecisionButton(page, 'nil-offer-decision', 1);
          current = await waitForM6SessionChange(page, current);
          break;
        }
        const weekEnd = await finishShippedDevelopmentWeek(page, current.career, SAFE_PLAN);
        current = await readM6Session(page);
        expect(current.career).toEqual(weekEnd);
        break;
      }
      case 'SKILL_BREAKTHROUGH': {
        const before = current;
        await chooseFirstPendingBreakthrough(page, current.career);
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'WEEK_END': {
        const before = current;
        await page.getByTestId('advance-week').click();
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'EVENT_CHOICE': {
        const before = current;
        const choiceId = chooseEventChoiceId(current.career);
        await page.getByTestId(`season-event-choice-${choiceId}`).click();
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'INJURY_CHOICE': {
        const before = current;
        const choiceId = current.career.phase.pendingInjury.choiceIds[0]!;
        await page.getByTestId(`season-injury-choice-${choiceId}`).click();
        current = await waitForM6SessionChange(page, before);
        break;
      }
      case 'GAME_PREVIEW':
        current = await playPreparedGame(page, current);
        break;
      case 'POST_GAME': {
        expect(current.career.gameCareerState.gamesPlayed).toBe(gamesBefore + 1);
        const completedGame = current;
        await page.getByTestId('advance-week').click();
        current = await waitForM6SessionChange(page, completedGame);
        expect(current.career.gameCareerState.gamesPlayed).toBe(gamesBefore + 1);
        expect(current.career.seasonCareerState.seasonsCompleted).toBe(1);
        await expectNoHorizontalOverflow(page);
        return current;
      }
      case 'KEY_SNAP':
      case 'RESOLVE_ACTIONS':
      case 'SEASON_REVIEW':
      case 'CAREER_COMPLETE':
        throw new Error(`m6_unexpected_next_season_phase:${current.career.phase.type}`);
    }
  }
  throw new Error('m6_next_season_opening_limit_exceeded');
}

async function runM6Journey(page: Page, policy: JourneyPolicy): Promise<void> {
  const journey = await playSeasonToReview(page, policy);
  await inspectOffFieldConsequences(page, policy, journey.reviewSession);
  const nextSeason = await completeOffseason(page, policy, journey);
  const afterOpening = await playNextSeasonOpeningGame(page, nextSeason);
  await expectCurrentSessionEnvelope(page, afterOpening);
}

const LOCALE_CASES = [
  {
    academicRisk: 'LOW',
    failAcceptedOfferSave: true,
    locale: 'ko-KR',
    offseasonChoice: 'STAY',
  },
  {
    academicRisk: 'HIGH',
    failAcceptedOfferSave: false,
    locale: 'en-US',
    offseasonChoice: 'TRANSFER',
  },
] as const satisfies readonly JourneyPolicy[];

for (const policy of LOCALE_CASES) {
  test.describe(`M6 off-field and offseason journey (${policy.locale}, ${policy.academicRisk})`, () => {
    test.use({ locale: policy.locale });

    test('persists NIL, academics, relationships, offseason choice, and season-two play', async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await runM6Journey(page, policy);
    });
  });
}

test.describe('M6 true 320px off-field and transfer journey', () => {
  test.use({ locale: 'ko-KR', viewport: { height: 760, width: 320 } });

  test('keeps every decision and the transferred season-two opening inside the viewport', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'One native 320px journey is sufficient.',
    );
    test.setTimeout(180_000);
    await runM6Journey(page, {
      academicRisk: 'LOW',
      failAcceptedOfferSave: false,
      locale: 'ko-KR',
      offseasonChoice: 'TRANSFER',
    });
  });
});
