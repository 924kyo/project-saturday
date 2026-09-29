import { expect, test, type Page } from '@playwright/test';

import {
  chooseFirstPendingBreakthrough,
  commitOfferedProgram,
  completeGameAndAdvanceWeek,
  continueShippedSeasonBoundary,
  expectHorizontallyWithinViewport,
  expectNoHorizontalOverflow,
  expectTouchTarget,
  fillRepresentativeCreation,
  finishShippedDevelopmentWeek,
  readActiveCareer,
  waitForCareerChange,
  waitForCareerRevision,
  waitForPersistedCareer,
  type AppLocale,
  type PersistedCareerInPhase,
} from './support/career';

const OPPORTUNITY_UUID = '00000000-0000-4000-8000-000000000000';
const PRACTICE_PLAN = ['action_extra_practice', 'action_route_drills', 'action_recovery'] as const;

const LOCALE_CASES = [
  {
    informationTitle: '스냅 정보',
    locale: 'ko-KR',
    playerName: '게임 데이 토요일',
    postGameTitle: '경기 결과',
    previewTitle: '다음 경기',
    startLabel: '경기 시작',
  },
  {
    informationTitle: 'Snap information',
    locale: 'en-US',
    playerName: 'Game Day Saturday',
    postGameTitle: 'Game result',
    previewTitle: 'Next game',
    startLabel: 'Start game',
  },
] as const satisfies readonly {
  readonly informationTitle: string;
  readonly locale: AppLocale;
  readonly playerName: string;
  readonly postGameTitle: string;
  readonly previewTitle: string;
  readonly startLabel: string;
}[];

async function installOpportunitySeed(page: Page): Promise<void> {
  await page.addInitScript((fixedUuid) => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      configurable: true,
      value: () => fixedUuid,
    });
  }, OPPORTUNITY_UUID);
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
        throw new DOMException('Intentional M4 Playwright save failure.', 'AbortError');
      }
      return Reflect.apply(
        originalPut,
        this,
        key === undefined ? [value] : [value, key],
      ) as IDBRequest<IDBValidKey>;
    };
  });
}

async function createOpportunityWeek(
  page: Page,
  locale: AppLocale,
  playerName: string,
): Promise<PersistedCareerInPhase<'WEEK_END'>> {
  await installOpportunitySeed(page);
  await page.goto('/');
  await fillRepresentativeCreation(page, locale, playerName);
  await page.locator('input[name="background"][value="background_legacy_recruit"]').check();
  await page.getByTestId('creation-submit').click();
  const choosing = await waitForPersistedCareer(page, {
    phase: 'PLAN_ACTIONS',
    revision: 1,
    weekIndex: 0,
  });
  if (choosing.recruitingState.type !== 'CHOOSING') {
    throw new Error('Expected recruiting offers for the M4 opportunity fixture.');
  }
  const programIndex = choosing.recruitingState.offers.findIndex(
    ({ programId }) => programId === 'program_northstar_college',
  );
  expect(programIndex).toBeGreaterThanOrEqual(0);
  const enrolled = await commitOfferedProgram(page, choosing, programIndex);
  let current = enrolled;
  for (let campRound = 0; campRound < 3; campRound += 1) {
    const campWeekEnd = await finishShippedDevelopmentWeek(page, current, PRACTICE_PLAN);
    current = await completeGameAndAdvanceWeek(page, campWeekEnd);
    current = await chooseFirstPendingBreakthrough(page, current);
    expect(current.phase.type).toBe('PLAN_ACTIONS');
  }
  return finishShippedDevelopmentWeek(page, current, PRACTICE_PLAN);
}

async function playOpportunityGame(
  page: Page,
  localeCase: (typeof LOCALE_CASES)[number],
  retryFirstDecision: boolean,
): Promise<PersistedCareerInPhase<'POST_GAME'>> {
  const weekEnd = await createOpportunityWeek(page, localeCase.locale, localeCase.playerName);
  const preview = await continueShippedSeasonBoundary(page, weekEnd);
  expect(preview.phase.type).toBe('GAME_PREVIEW');
  if (preview.phase.type !== 'GAME_PREVIEW') throw new Error('Expected scheduled preview.');
  expect(preview.phase.matchup).toMatchObject({
    opportunityBudget: 4,
    playerProgramId: 'program_northstar_college',
  });
  await expect(page.getByTestId('game-preview')).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: localeCase.previewTitle }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.reload();
  expect(await readActiveCareer(page)).toEqual(preview);
  const start = page.getByTestId('start-game');
  await expect(start).toHaveText(localeCase.startLabel);
  await expectTouchTarget(start);
  await expectHorizontallyWithinViewport(page, start);
  await start.focus();
  await page.keyboard.press('Enter');
  let current = await waitForCareerRevision(page, preview.revision + 1);
  expect(current.phase.type).toBe('KEY_SNAP');

  let resolvedSnapCount = 0;
  while (current.phase.type === 'KEY_SNAP') {
    const snapBefore = current;
    const decisions = page.locator('[data-testid^="game-decision-"]');
    await expect(decisions).toHaveCount(3);
    await expect(page.getByTestId('game-situation')).toBeVisible();
    await expect(page.getByRole('region', { name: localeCase.informationTitle })).toBeVisible();
    for (const decision of await decisions.all()) {
      await expectTouchTarget(decision, 72);
      await expectHorizontallyWithinViewport(page, decision);
    }
    const decisionId = current.phase.pendingSnap.decisionIds[0];
    if (retryFirstDecision && resolvedSnapCount === 0) {
      await failNextAutosaveSnapshotWrite(page);
      await page.getByTestId(`game-decision-${decisionId}`).click();
      const warning = page.getByTestId('save-failure');
      await expect(warning).toBeVisible();
      await expect(warning).toBeFocused();
      expect(await readActiveCareer(page)).toEqual(snapBefore);
      await expect(page.getByTestId('game-key-snap')).toBeVisible();
      for (const lockedDecision of await decisions.all()) {
        await expect(lockedDecision).toBeDisabled();
      }
      await page.getByTestId('retry-save').click();
      current = await waitForCareerRevision(page, snapBefore.revision + 1);
      await expect(warning).not.toBeVisible();
    } else {
      await page.getByTestId(`game-decision-${decisionId}`).click();
      current = await waitForCareerRevision(page, snapBefore.revision + 1);
    }
    resolvedSnapCount += 1;
    await expectNoHorizontalOverflow(page);
  }

  expect(current.phase.type).toBe('POST_GAME');
  if (current.phase.type !== 'POST_GAME') {
    throw new Error('Expected the M4 game to reach postgame.');
  }
  expect(resolvedSnapCount).toBe(preview.phase.matchup.opportunityBudget);
  expect(current.phase.keyPlayLog).toHaveLength(preview.phase.matchup.opportunityBudget);
  expect(current.gameCareerState).toMatchObject({ gamesPlayed: 1 });
  expect(current.gameCareerState.lastGame).toEqual(current.phase.summary);
  await expect(page.getByTestId('game-post-game')).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: localeCase.postGameTitle }),
  ).toBeVisible();
  await expect(page.getByTestId('game-participation')).toBeVisible();
  await expect(page.locator('.game-stat-grid > div')).toHaveCount(6);
  await expect(page.getByTestId('game-play-log')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const savedPostGame = current;
  await page.reload();
  expect(await readActiveCareer(page)).toEqual(savedPostGame);
  await expect(page.getByTestId('game-post-game')).toBeVisible();
  return savedPostGame as PersistedCareerInPhase<'POST_GAME'>;
}

for (const localeCase of LOCALE_CASES) {
  test.describe(`M4 saved game journey (${localeCase.locale})`, () => {
    test.use({ locale: localeCase.locale });

    test('persists preview, key-snap decisions, retry, postgame, and week advance', async ({
      page,
    }) => {
      const postGame = await playOpportunityGame(page, localeCase, true);
      await page.getByTestId('advance-week').click();
      let advanced = await waitForCareerChange(page, postGame.revision);
      advanced = await chooseFirstPendingBreakthrough(page, advanced);
      expect(advanced.phase.type).toBe('PLAN_ACTIONS');
      expect(advanced.weekIndex).toBe(postGame.weekIndex + 1);
      expect(advanced.lastPassiveBodyRecovery?.weekIndex).toBe(postGame.weekIndex);
      expect(advanced.gameCareerState.lastGame).toEqual(postGame.phase.summary);
    });
  });
}

test.describe('M4 320px game-day journey', () => {
  test.use({ locale: 'en-US', viewport: { height: 760, width: 320 } });

  test('keeps preview, three semantic choices, feedback, and review inside the viewport', async ({
    page,
  }) => {
    const postGame = await playOpportunityGame(page, LOCALE_CASES[1], false);
    const advance = page.getByTestId('advance-week');
    await expectTouchTarget(advance);
    await expectHorizontallyWithinViewport(page, advance);
    await expectNoHorizontalOverflow(page);
    expect(postGame.phase.summary.keySnapCount).toBe(4);
  });
});
