import { expect, test, type Page } from '@playwright/test';

import {
  chooseFirstPendingBreakthrough,
  createRepresentativeCareer,
  expectHorizontallyWithinViewport,
  expectNoHorizontalOverflow,
  expectTouchTarget,
  finishShippedDevelopmentWeek,
  type AppLocale,
  type PersistedCareer,
} from './support/career';
import { readIndexedDbValue } from './support/indexed-db';

const FIRST_CAREER_UUID = '00000000-0000-4000-8000-000000000001';
const SEASON_ACTION_PLAN = ['action_route_drills', 'action_film_study', 'action_recovery'] as const;

interface RawWorldState {
  readonly revision: number;
  readonly calendar: {
    readonly type: string;
    readonly stage?: string;
    readonly postseason?: { readonly type: string };
  };
}

interface RawCareerSession {
  readonly schemaVersion: 5 | 6 | 7;
  readonly career: PersistedCareer;
  readonly world: RawWorldState;
}

interface SaveEnvelope<T> {
  readonly saveVersion: number;
  readonly payload: T;
}

interface CompletedJourney {
  readonly eventCount: number;
  readonly gameCount: number;
  readonly injuryCount: number;
  readonly postseasonInitializationCount: number;
  readonly reviewEntryCount: number;
  readonly reviewSession: RawCareerSession;
}

async function installCareerIdSequence(page: Page): Promise<void> {
  await page.addInitScript((fixedUuid) => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      configurable: true,
      value: () => fixedUuid,
    });
  }, FIRST_CAREER_UUID);
}

async function readActiveSession(page: Page): Promise<RawCareerSession> {
  const envelope = await readIndexedDbValue<SaveEnvelope<RawCareerSession>>(
    page,
    'currentCareer',
    'active',
  );
  if (envelope === undefined) throw new Error('m5_active_session_missing');
  return envelope.payload;
}

async function readMetaEnvelope(page: Page): Promise<SaveEnvelope<unknown> | undefined> {
  return readIndexedDbValue<SaveEnvelope<unknown>>(page, 'profile', 'meta');
}

function sessionMarker(session: RawCareerSession): string {
  return `${session.career.revision}:${session.world.revision}:${session.career.phase.type}`;
}

async function waitForSessionChange(
  page: Page,
  previous: RawCareerSession,
): Promise<RawCareerSession> {
  const previousMarker = sessionMarker(previous);
  await expect
    .poll(async () => sessionMarker(await readActiveSession(page)))
    .not.toBe(previousMarker);
  return readActiveSession(page);
}

async function expectServiceWorkerControl(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker?.controller?.state ?? null), {
      timeout: 15_000,
    })
    .toBe('activated');
}

async function reloadOfflineAtAuthoritativeDecision(
  page: Page,
  expectedSession: RawCareerSession,
  decisionTestId: 'season-event-choice' | 'season-injury-choice',
): Promise<void> {
  await expectServiceWorkerControl(page);
  await page.context().setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId(decisionTestId)).toBeVisible();
    expect(await readActiveSession(page)).toEqual(expectedSession);
  } finally {
    await page.context().setOffline(false);
  }
}

async function clickSeasonPanelAction(page: Page, testId: string): Promise<void> {
  const button = page.getByTestId(testId).getByRole('button');
  await expectTouchTarget(button);
  await expectHorizontallyWithinViewport(page, button);
  await button.click();
}

async function playFullSeasonToReview(
  page: Page,
  locale: AppLocale,
  playerName: string,
  narrowViewport: boolean,
): Promise<CompletedJourney> {
  await installCareerIdSequence(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await page.evaluate(() => navigator.serviceWorker?.ready.then(() => true));
  await page.reload();
  await expectServiceWorkerControl(page);
  const created = await createRepresentativeCareer(page, locale, playerName);
  expect(created.careerSeed).toBe(`career-seed:${FIRST_CAREER_UUID}`);

  let current = await readActiveSession(page);
  let eventCount = 0;
  let gameCount = 0;
  let injuryCount = 0;
  let postseasonInitializationCount = 0;
  let reviewEntryCount = 0;
  let reloadedEvent = false;
  let reloadedInjury = false;

  for (let transitionCount = 0; transitionCount < 180; transitionCount += 1) {
    await expect(page.getByTestId('season-overview')).toBeVisible();
    if (narrowViewport) await expectNoHorizontalOverflow(page);

    switch (current.career.phase.type) {
      case 'PLAN_ACTIONS': {
        if (await page.getByTestId('postseason-initialize').isVisible()) {
          const before = current;
          await clickSeasonPanelAction(page, 'postseason-initialize');
          current = await waitForSessionChange(page, before);
          postseasonInitializationCount += 1;
          break;
        }
        if (await page.getByTestId('season-review-entry').isVisible()) {
          const before = current;
          await clickSeasonPanelAction(page, 'season-review-entry');
          current = await waitForSessionChange(page, before);
          reviewEntryCount += 1;
          break;
        }
        const weekEnd = await finishShippedDevelopmentWeek(
          page,
          current.career,
          SEASON_ACTION_PLAN,
        );
        current = await readActiveSession(page);
        expect(current.career).toEqual(weekEnd);
        break;
      }
      case 'SKILL_BREAKTHROUGH': {
        const before = current;
        await chooseFirstPendingBreakthrough(page, current.career);
        current = await waitForSessionChange(page, before);
        break;
      }
      case 'WEEK_END': {
        const before = current;
        const advance = page.getByTestId('advance-week');
        await expectTouchTarget(advance);
        await advance.click();
        current = await waitForSessionChange(page, before);
        break;
      }
      case 'EVENT_CHOICE': {
        eventCount += 1;
        await expect(page.getByTestId('season-event-choice')).toBeVisible();
        if (!reloadedEvent) {
          await reloadOfflineAtAuthoritativeDecision(page, current, 'season-event-choice');
          reloadedEvent = true;
        }
        const choiceId = current.career.phase.pendingEvent.choiceIds[0];
        if (choiceId === undefined) throw new Error('m5_event_choice_missing');
        const choice = page.getByTestId(`season-event-choice-${choiceId}`);
        await expectTouchTarget(choice);
        await expectHorizontallyWithinViewport(page, choice);
        const before = current;
        await choice.click();
        current = await waitForSessionChange(page, before);
        break;
      }
      case 'INJURY_CHOICE': {
        injuryCount += 1;
        const pendingInjury = current.career.phase.pendingInjury;
        await expect(page.getByTestId('season-injury-choice')).toBeVisible();
        if (!reloadedInjury) {
          const beforeReload = current;
          await page.reload();
          await expect(page.getByTestId('season-injury-choice')).toBeVisible();
          expect(await readActiveSession(page)).toEqual(beforeReload);
          current = beforeReload;
          reloadedInjury = true;
        }
        const choiceId = pendingInjury.choiceIds[0];
        if (choiceId === undefined) throw new Error('m5_injury_choice_missing');
        const choice = page.getByTestId(`season-injury-choice-${choiceId}`);
        await expectTouchTarget(choice);
        await expectHorizontallyWithinViewport(page, choice);
        const before = current;
        await choice.click();
        current = await waitForSessionChange(page, before);
        break;
      }
      case 'GAME_PREVIEW': {
        gameCount += 1;
        await expect(page.getByTestId('game-preview')).toBeVisible();
        const start = page.getByTestId('start-game');
        await expectTouchTarget(start);
        await expectHorizontallyWithinViewport(page, start);
        const before = current;
        await start.click();
        current = await waitForSessionChange(page, before);
        break;
      }
      case 'KEY_SNAP': {
        const decisions = page.locator('[data-testid^="game-decision-"]');
        await expect(decisions).toHaveCount(3);
        const decisionId = current.career.phase.pendingSnap.decisionIds[0];
        const decision = page.getByTestId(`game-decision-${decisionId}`);
        await expectTouchTarget(decision, 72);
        await expectHorizontallyWithinViewport(page, decision);
        const before = current;
        await decision.click();
        current = await waitForSessionChange(page, before);
        break;
      }
      case 'POST_GAME': {
        await expect(page.getByTestId('game-post-game')).toBeVisible();
        await expect(page.getByTestId('game-participation')).toBeVisible();
        const before = current;
        const advance = page.getByTestId('advance-week');
        await expectTouchTarget(advance);
        await advance.click();
        current = await waitForSessionChange(page, before);
        break;
      }
      case 'SEASON_REVIEW':
        await expect(page.getByTestId('season-review')).toBeVisible();
        expect(eventCount).toBeGreaterThan(0);
        expect(injuryCount).toBeGreaterThan(0);
        expect(gameCount).toBeGreaterThanOrEqual(12);
        expect(postseasonInitializationCount).toBe(1);
        expect(reviewEntryCount).toBe(1);
        return {
          eventCount,
          gameCount,
          injuryCount,
          postseasonInitializationCount,
          reviewEntryCount,
          reviewSession: current,
        };
      case 'CAREER_COMPLETE':
        throw new Error('m5_career_completed_before_review_assertion');
      case 'RESOLVE_ACTIONS':
        throw new Error('m5_development_helper_left_partial_resolution');
    }
  }
  throw new Error('m5_full_season_transition_limit_exceeded');
}

async function expectM6OffseasonHandoff(page: Page, journey: CompletedJourney): Promise<void> {
  const profileBefore = await readMetaEnvelope(page);
  await expect(page.getByTestId('season-review')).toBeVisible();
  const offseasonEntry = page.getByTestId('offseason-entry');
  await expect(offseasonEntry).toBeVisible();
  const project = offseasonEntry.getByRole('button');
  await expectTouchTarget(project);
  await expectHorizontallyWithinViewport(page, project);
  expect(await readActiveSession(page)).toEqual(journey.reviewSession);
  expect(journey.reviewSession.schemaVersion).toBe(7);
  expect(journey.reviewSession.career.offFieldCareerState?.offseason.status).toBe('NOT_STARTED');
  expect(await readMetaEnvelope(page)).toEqual(profileBefore);
  await page.reload();
  await expect(page.getByTestId('offseason-entry')).toBeVisible();
  expect(await readActiveSession(page)).toEqual(journey.reviewSession);
  expect(await readMetaEnvelope(page)).toEqual(profileBefore);
  await expectNoHorizontalOverflow(page);
}

for (const locale of ['ko-KR', 'en-US'] as const satisfies readonly AppLocale[]) {
  test.describe(`M5 full season to M6 handoff (${locale})`, () => {
    test.use({ locale });

    test('plays every week, resolves events and injury, and preserves the review at the offseason handoff', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const journey = await playFullSeasonToReview(
        page,
        locale,
        `${locale} Season Saturday`,
        false,
      );
      await expectM6OffseasonHandoff(page, journey);
    });
  });
}

test.describe('M5 320px full season journey', () => {
  test.use({ locale: 'en-US', viewport: { height: 760, width: 320 } });

  test('keeps the complete event, injury, game, review, and offseason handoff reachable', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'One native 320px journey is sufficient.',
    );
    test.setTimeout(120_000);
    const journey = await playFullSeasonToReview(page, 'en-US', 'Narrow Season Saturday', true);
    await expectM6OffseasonHandoff(page, journey);
  });
});
