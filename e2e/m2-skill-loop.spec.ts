import { expect, test, type Page } from '@playwright/test';

import {
  createRepresentativeCareer,
  draftActions,
  expectHorizontallyWithinViewport,
  expectNoHorizontalOverflow,
  expectTouchTarget,
  readActiveCareer,
  waitForPersistedCareer,
  type AppLocale,
  type PersistedCareerInPhase,
  type PersistedWeeklyActionResult,
} from './support/career';

const FIXED_BROWSER_UUID = '00000000-0000-4000-8000-000000000009';
const FIXED_CAREER_SEED = `career-seed:${FIXED_BROWSER_UUID}`;
const FIRST_OFFER_RNG = {
  algorithm: 'xoshiro128ss-v1',
  drawCount: 3,
  state: [4241484479, 2466849236, 215527883, 665137617],
} as const;

interface SkillJourneyCase {
  readonly expectedAppliedEffectMultiplierPermille: number;
  readonly expectedAppliedEffectType: 'action_body_cost_multiplier' | 'action_xp_multiplier';
  readonly effectPercentText: string;
  readonly expectedBaseBodyDelta: number;
  readonly expectedBodyCostMultiplierPermille: number;
  readonly expectedFirstAttributeXp: {
    readonly awardedXp: number;
    readonly baseXp: number;
  };
  readonly expectedOffer: readonly [string, string, string];
  readonly expectedRequestedBodyDelta: number;
  readonly expectedXpMultiplierPermille: number;
  readonly firstWeekActionIds: readonly [string, string, string];
  readonly inventoryTitle: string;
  readonly locale: AppLocale;
  readonly loadoutLockedText: string;
  readonly otherBehaviorOffer: readonly [string, string, string];
  readonly playerName: string;
  readonly retryChoiceSave: boolean;
  readonly secondWeekActionIds: readonly [string, string, string];
  readonly selectedSkillId: string;
  readonly selectedSkillName: string;
  readonly strategy: string;
}

const SKILL_JOURNEYS = [
  {
    effectPercentText: '10%',
    expectedAppliedEffectMultiplierPermille: 1100,
    expectedAppliedEffectType: 'action_xp_multiplier',
    expectedBaseBodyDelta: -3,
    expectedBodyCostMultiplierPermille: 1000,
    expectedFirstAttributeXp: { awardedXp: 26, baseXp: 24 },
    expectedOffer: ['skill_coverage_ledger_b', 'skill_first_step_lab_b', 'skill_reset_ritual_b'],
    expectedRequestedBodyDelta: -3,
    expectedXpMultiplierPermille: 1100,
    firstWeekActionIds: ['action_film_study', 'action_film_study', 'action_film_study'],
    inventoryTitle: '스킬과 장착 슬롯',
    locale: 'ko-KR',
    loadoutLockedText: '행동 계획 단계에서만 장착 스킬을 바꿀 수 있습니다.',
    otherBehaviorOffer: [
      'skill_balanced_calendar_b',
      'skill_late_set_engine_b',
      'skill_route_notebook_c',
    ],
    playerName: '필름 빌드 토요일',
    retryChoiceSave: false,
    secondWeekActionIds: ['action_film_study', 'action_film_study', 'action_film_study'],
    selectedSkillId: 'skill_coverage_ledger_b',
    selectedSkillName: '커버리지 노트',
    strategy: 'film-heavy',
  },
  {
    effectPercentText: '15%',
    expectedAppliedEffectMultiplierPermille: 850,
    expectedAppliedEffectType: 'action_body_cost_multiplier',
    expectedBaseBodyDelta: -14,
    expectedBodyCostMultiplierPermille: 850,
    expectedFirstAttributeXp: { awardedXp: 25, baseXp: 24 },
    expectedOffer: [
      'skill_balanced_calendar_b',
      'skill_late_set_engine_b',
      'skill_route_notebook_c',
    ],
    expectedRequestedBodyDelta: -12,
    expectedXpMultiplierPermille: 1000,
    firstWeekActionIds: ['action_weight_room', 'action_recovery', 'action_weight_room'],
    inventoryTitle: 'Skills and loadout',
    locale: 'en-US',
    loadoutLockedText: 'You can change the loadout only while planning actions.',
    otherBehaviorOffer: [
      'skill_coverage_ledger_b',
      'skill_first_step_lab_b',
      'skill_reset_ritual_b',
    ],
    playerName: 'Strength Build Saturday',
    retryChoiceSave: true,
    secondWeekActionIds: ['action_weight_room', 'action_recovery', 'action_weight_room'],
    selectedSkillId: 'skill_late_set_engine_b',
    selectedSkillName: 'Late-Set Engine',
    strategy: 'strength-heavy',
  },
] as const satisfies readonly SkillJourneyCase[];

async function installFixedCareerSeed(page: Page): Promise<void> {
  await page.addInitScript((fixedUuid) => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      configurable: true,
      value: () => fixedUuid,
    });
  }, FIXED_BROWSER_UUID);
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
        throw new DOMException('Intentional M2 Playwright save failure.', 'AbortError');
      }
      return Reflect.apply(
        originalPut,
        this,
        key === undefined ? [value] : [value, key],
      ) as IDBRequest<IDBValidKey>;
    };
  });
}

async function finishWeek(
  page: Page,
  actionIds: readonly [string, string, string],
  startingRevision: number,
): Promise<PersistedCareerInPhase<'WEEK_END'>> {
  await draftActions(page, actionIds);
  const commitButton = page.getByTestId('action-commit');
  await expect(commitButton).toBeEnabled();
  await commitButton.click();
  await waitForPersistedCareer(page, {
    actionIds,
    nextActionIndex: 0,
    phase: 'RESOLVE_ACTIONS',
    resultActionIds: [],
    revision: startingRevision + 1,
    weekIndex: 0,
  });

  const resolveButton = page.getByTestId('resolve-next');
  for (let actionIndex = 0; actionIndex < actionIds.length; actionIndex += 1) {
    await expect(resolveButton).toBeEnabled();
    await resolveButton.click();
    if (actionIndex < actionIds.length - 1) {
      await waitForPersistedCareer(page, {
        actionIds,
        nextActionIndex: actionIndex + 1,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: actionIds.slice(0, actionIndex + 1),
        revision: startingRevision + actionIndex + 2,
        weekIndex: 0,
      });
    }
  }

  return waitForPersistedCareer(page, {
    phase: 'WEEK_END',
    resultActionIds: actionIds,
    revision: startingRevision + 4,
    weekIndex: 0,
  });
}

async function openSkillLoadout(page: Page): Promise<void> {
  const loadout = page.getByTestId('skill-loadout');
  await expect(loadout).toBeVisible();
  if ((await loadout.getAttribute('open')) === null) {
    await loadout.locator('summary').click();
  }
  await expect(loadout).toHaveAttribute('open', '');
}

async function expectAppliedResult(
  result: PersistedWeeklyActionResult,
  journey: SkillJourneyCase,
  expectedSlotIndex = 1,
): Promise<void> {
  expect(result).toMatchObject({
    actionId: journey.secondWeekActionIds[0],
    actionIndex: 0,
    baseBodyDelta: journey.expectedBaseBodyDelta,
    requestedBodyDelta: journey.expectedRequestedBodyDelta,
    skillEffectAggregates: {
      bodyCostMultiplierPermille: journey.expectedBodyCostMultiplierPermille,
      xpMultiplierPermille: journey.expectedXpMultiplierPermille,
    },
    weekIndex: 1,
  });
  expect(result.attributeXp[0]).toMatchObject(journey.expectedFirstAttributeXp);
  expect(result.appliedSkillEffects).toEqual([
    {
      effectIndex: 0,
      multiplierPermille: journey.expectedAppliedEffectMultiplierPermille,
      skillId: journey.selectedSkillId,
      slotIndex: expectedSlotIndex,
      type: journey.expectedAppliedEffectType,
    },
  ]);
}

async function expectServiceWorkerControl(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker?.controller?.state ?? null), {
      timeout: 15_000,
    })
    .toBe('activated');
}

for (const journey of SKILL_JOURNEYS) {
  test.describe(`M2 ${journey.strategy} skill journey (${journey.locale})`, () => {
    test.use({ locale: journey.locale });

    test('persists the shaped offer, keyboard choice, four-slot build, and applied effect', async ({
      page,
    }) => {
      await installFixedCareerSeed(page);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', journey.locale);

      const created = await createRepresentativeCareer(page, journey.locale, journey.playerName);
      expect(created).toMatchObject({
        careerSeed: FIXED_CAREER_SEED,
        lastPassiveBodyRecovery: null,
        recentWeeklyActionIds: [],
        schemaVersion: 2,
      });
      expect(created.player.skillState).toEqual({
        acquisitions: [],
        equippedSkillIds: [null, null, null, null],
      });

      await finishWeek(page, journey.firstWeekActionIds, 0);
      await page.getByTestId('advance-week').click();
      const pendingOffer = await waitForPersistedCareer(page, {
        phase: 'SKILL_BREAKTHROUGH',
        revision: 5,
        weekIndex: 1,
      });
      expect(pendingOffer.recentWeeklyActionIds).toEqual(journey.firstWeekActionIds);
      expect(pendingOffer.phase.offer).toEqual({
        offerIndex: 0,
        offeredSkillIds: journey.expectedOffer,
        rngDrawCountAfter: 3,
        rngDrawCountBefore: 0,
        weekIndex: 1,
      });
      expect(pendingOffer.phase.offer.offeredSkillIds).not.toEqual(journey.otherBehaviorOffer);
      expect(new Set(pendingOffer.phase.offer.offeredSkillIds)).toHaveProperty('size', 3);
      expect(pendingOffer.rng).toEqual(FIRST_OFFER_RNG);
      expect(pendingOffer.lastPassiveBodyRecovery).toMatchObject({
        appliedSkillEffects: [],
        baseBodyDelta: 10,
        requestedBodyDelta: 10,
        weekIndex: 0,
      });
      await expect(page.getByTestId('weekly-phase')).toHaveAttribute(
        'data-phase',
        'SKILL_BREAKTHROUGH',
      );
      await expect(page.getByTestId(`skill-card-${journey.selectedSkillId}`)).toContainText(
        journey.selectedSkillName,
      );
      await expectNoHorizontalOverflow(page);

      await page.reload();
      expect(await readActiveCareer(page)).toEqual(pendingOffer);
      await expect(page.getByTestId('weekly-phase')).toHaveAttribute(
        'data-phase',
        'SKILL_BREAKTHROUGH',
      );
      await expect(page.getByRole('radio')).toHaveCount(3);

      const selectedRadio = page.getByTestId(`skill-offer-${journey.selectedSkillId}`);
      await expectHorizontallyWithinViewport(page, selectedRadio.locator('..'));
      await expectTouchTarget(selectedRadio.locator('..'));
      await selectedRadio.focus();
      await page.keyboard.press('Space');
      await expect(selectedRadio).toBeChecked();

      if (journey.retryChoiceSave) {
        await failNextAutosaveSnapshotWrite(page);
      }
      const confirmChoice = page.getByTestId('skill-choose-confirm');
      await expectTouchTarget(confirmChoice);
      await expectHorizontallyWithinViewport(page, confirmChoice);
      await confirmChoice.focus();
      await page.keyboard.press('Enter');

      if (journey.retryChoiceSave) {
        const warning = await page.getByTestId('save-failure');
        await expect(warning).toBeVisible();
        await expect(warning).toBeFocused();
        expect(await readActiveCareer(page)).toEqual(pendingOffer);
        await expect(page.getByTestId('weekly-phase')).toHaveAttribute(
          'data-phase',
          'SKILL_BREAKTHROUGH',
        );
        await expect(page.getByTestId('skill-breakthrough')).toBeVisible();
        await expect(page.getByRole('radio')).toHaveCount(3);
        for (const radio of await page.getByRole('radio').all()) {
          await expect(radio).toBeDisabled();
        }
        await expect(page.getByTestId('skill-choose-confirm')).toBeDisabled();
        const retry = page.getByTestId('retry-save');
        await expectTouchTarget(retry);
        await retry.click();
        await expect(warning).not.toBeVisible();
      }

      const chosen = await waitForPersistedCareer(page, {
        phase: 'PLAN_ACTIONS',
        revision: 6,
        weekIndex: 1,
      });
      expect(chosen.rng).toEqual(pendingOffer.rng);
      expect(chosen.player.skillState.acquisitions).toEqual([
        { ...pendingOffer.phase.offer, selectedSkillId: journey.selectedSkillId },
      ]);
      expect(chosen.player.skillState.equippedSkillIds).toEqual([
        journey.selectedSkillId,
        null,
        null,
        null,
      ]);

      await page.reload();
      expect(await readActiveCareer(page)).toEqual(chosen);
      await openSkillLoadout(page);
      await expect(page.getByTestId('skill-loadout')).toContainText(journey.inventoryTitle);
      const slotSelects = page.getByTestId('skill-loadout').locator('select');
      await expect(slotSelects).toHaveCount(4);
      for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
        const select = page.getByTestId(`skill-slot-select-${slotIndex}`);
        await expectTouchTarget(select);
        await expectHorizontallyWithinViewport(page, select);
      }
      await expect(page.getByTestId('skill-slot-0')).toHaveAttribute(
        'data-skill-id',
        journey.selectedSkillId,
      );
      await expectNoHorizontalOverflow(page);

      await page.getByTestId('skill-slot-select-0').selectOption('');
      const cleared = await waitForPersistedCareer(page, {
        phase: 'PLAN_ACTIONS',
        revision: 7,
        weekIndex: 1,
      });
      expect(cleared.player.skillState.equippedSkillIds).toEqual([null, null, null, null]);
      const slotOneSelect = page.getByTestId('skill-slot-select-1');
      await expect(slotOneSelect).toBeEnabled();
      await slotOneSelect.selectOption(journey.selectedSkillId);
      const moved = await waitForPersistedCareer(page, {
        phase: 'PLAN_ACTIONS',
        revision: 8,
        weekIndex: 1,
      });
      expect(moved.player.skillState.equippedSkillIds).toEqual([
        null,
        journey.selectedSkillId,
        null,
        null,
      ]);
      expect(moved.rng).toEqual(chosen.rng);

      await page.reload();
      expect(await readActiveCareer(page)).toEqual(moved);
      await openSkillLoadout(page);
      await draftActions(page, journey.secondWeekActionIds);
      await page.getByTestId('action-commit').click();
      const committed = await waitForPersistedCareer(page, {
        actionIds: journey.secondWeekActionIds,
        nextActionIndex: 0,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: [],
        revision: 9,
        weekIndex: 1,
      });
      expect(committed.player.skillState.equippedSkillIds).toEqual(
        moved.player.skillState.equippedSkillIds,
      );
      for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
        await expect(page.getByTestId(`skill-slot-select-${slotIndex}`)).toBeDisabled();
      }
      await expect(page.getByText(journey.loadoutLockedText)).toBeVisible();

      await page.getByTestId('resolve-next').click();
      const afterAppliedAction = await waitForPersistedCareer(page, {
        actionIds: journey.secondWeekActionIds,
        nextActionIndex: 1,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: journey.secondWeekActionIds.slice(0, 1),
        revision: 10,
        weekIndex: 1,
      });
      const firstResult = afterAppliedAction.phase.results[0];
      if (firstResult === undefined) {
        throw new Error('Expected the first M2 result to be persisted.');
      }
      await expectAppliedResult(firstResult, journey);
      const evidence = page.getByTestId(`skill-evidence-${journey.selectedSkillId}-0`);
      await expect(evidence).toBeVisible();
      await expect(evidence).toContainText(journey.selectedSkillName);
      await expect(evidence).toContainText(journey.effectPercentText);
      await expectNoHorizontalOverflow(page);

      await page.reload();
      expect(await readActiveCareer(page)).toEqual(afterAppliedAction);
      await expect(evidence).toBeVisible();
      await expectServiceWorkerControl(page);
      await page.context().setOffline(true);
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('app-shell')).toBeVisible();
        await expect(page.getByTestId('weekly-phase')).toHaveAttribute(
          'data-phase',
          'RESOLVE_ACTIONS',
        );
        await expect(page.getByTestId(`skill-evidence-${journey.selectedSkillId}-0`)).toBeVisible();
        expect(await readActiveCareer(page)).toEqual(afterAppliedAction);
      } finally {
        await page.context().setOffline(false);
      }
    });
  });
}

test.describe('M2 320px full skill journey', () => {
  test.use({ locale: 'en-US', viewport: { height: 760, width: 320 } });

  test('keeps the longer English breakthrough, loadout, and effect flow reachable', async ({
    page,
  }) => {
    const journey = SKILL_JOURNEYS[1];
    await installFixedCareerSeed(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', journey.locale);
    await createRepresentativeCareer(page, journey.locale, 'Narrow Build Saturday');

    await finishWeek(page, journey.firstWeekActionIds, 0);
    const advance = page.getByTestId('advance-week');
    await expectTouchTarget(advance);
    await expectHorizontallyWithinViewport(page, advance);
    await advance.click();
    const pendingOffer = await waitForPersistedCareer(page, {
      phase: 'SKILL_BREAKTHROUGH',
      revision: 5,
      weekIndex: 1,
    });
    expect(pendingOffer.phase.offer.offeredSkillIds).toEqual(journey.expectedOffer);
    expect(pendingOffer.rng).toEqual(FIRST_OFFER_RNG);
    await expectNoHorizontalOverflow(page);

    const selectedRadio = page.getByTestId(`skill-offer-${journey.selectedSkillId}`);
    const selectedChoice = selectedRadio.locator('..');
    await expectTouchTarget(selectedChoice);
    await expectHorizontallyWithinViewport(page, selectedChoice);
    await selectedRadio.focus();
    await page.keyboard.press('Space');
    const confirm = page.getByTestId('skill-choose-confirm');
    await expectTouchTarget(confirm);
    await expectHorizontallyWithinViewport(page, confirm);
    await confirm.focus();
    await page.keyboard.press('Enter');

    const chosen = await waitForPersistedCareer(page, {
      phase: 'PLAN_ACTIONS',
      revision: 6,
      weekIndex: 1,
    });
    expect(chosen.player.skillState.equippedSkillIds).toEqual([
      journey.selectedSkillId,
      null,
      null,
      null,
    ]);
    expect(chosen.rng).toEqual(pendingOffer.rng);

    await openSkillLoadout(page);
    const loadout = page.getByTestId('skill-loadout');
    await expect(loadout).toContainText(journey.inventoryTitle);
    await expect(loadout.locator('select')).toHaveCount(4);
    for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
      const select = page.getByTestId(`skill-slot-select-${slotIndex}`);
      await expectTouchTarget(select);
      await expectHorizontallyWithinViewport(page, select);
    }
    await expectNoHorizontalOverflow(page);

    for (const actionId of new Set(journey.secondWeekActionIds)) {
      const action = page.getByTestId(`action-choice-${actionId}`);
      await expectTouchTarget(action);
      await expectHorizontallyWithinViewport(page, action);
    }
    await draftActions(page, journey.secondWeekActionIds);
    const commit = page.getByTestId('action-commit');
    await expectTouchTarget(commit);
    await expectHorizontallyWithinViewport(page, commit);
    await commit.click();
    await waitForPersistedCareer(page, {
      actionIds: journey.secondWeekActionIds,
      nextActionIndex: 0,
      phase: 'RESOLVE_ACTIONS',
      resultActionIds: [],
      revision: 7,
      weekIndex: 1,
    });
    for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
      await expect(page.getByTestId(`skill-slot-select-${slotIndex}`)).toBeDisabled();
    }
    await expect(page.getByText(journey.loadoutLockedText)).toBeVisible();

    const resolve = page.getByTestId('resolve-next');
    await expectTouchTarget(resolve);
    await expectHorizontallyWithinViewport(page, resolve);
    await resolve.click();
    const afterAppliedAction = await waitForPersistedCareer(page, {
      actionIds: journey.secondWeekActionIds,
      nextActionIndex: 1,
      phase: 'RESOLVE_ACTIONS',
      resultActionIds: journey.secondWeekActionIds.slice(0, 1),
      revision: 8,
      weekIndex: 1,
    });
    const firstResult = afterAppliedAction.phase.results[0];
    if (firstResult === undefined) {
      throw new Error('Expected the first narrow M2 result to be persisted.');
    }
    await expectAppliedResult(firstResult, journey, 0);
    const evidence = page.getByTestId(`skill-evidence-${journey.selectedSkillId}-0`);
    await expect(evidence).toContainText(journey.selectedSkillName);
    await expect(evidence).toContainText(journey.effectPercentText);
    await expectNoHorizontalOverflow(page);

    await page.reload();
    expect(await readActiveCareer(page)).toEqual(afterAppliedAction);
    await expect(page.getByTestId(`skill-evidence-${journey.selectedSkillId}-0`)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
