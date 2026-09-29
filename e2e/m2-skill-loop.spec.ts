import { expect, test, type Page } from '@playwright/test';

import {
  completeGameAndAdvanceWeek,
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

interface SkillJourneyCase {
  readonly expectedAdditionalAppliedEffect?: {
    readonly effectIndex: number;
    readonly effectValue: number;
    readonly effectValueType: 'delta' | 'multiplierPermille';
    readonly type:
      'action_body_cost_multiplier' | 'action_preparation_delta_flat' | 'action_xp_multiplier';
  };
  readonly browserUuid: string;
  readonly expectedAppliedEffectMultiplierPermille: number;
  readonly expectedAppliedEffectType:
    'action_body_cost_multiplier' | 'action_preparation_delta_flat' | 'action_xp_multiplier';
  readonly effectValueText: string;
  readonly effectValueType: 'delta' | 'multiplierPermille';
  readonly expectedBaseBodyDelta: number;
  readonly expectedBodyCostMultiplierPermille: number;
  readonly expectedFirstAttributeXp?: {
    readonly awardedXp: number;
    readonly baseXp: number;
  };
  readonly expectedRequestedBodyDelta: number;
  readonly expectedPreparationDeltaFlat: number;
  readonly expectedXpMultiplierPermille: number;
  readonly firstWeekActionIds: readonly [string, string, string];
  readonly inventoryTitle: string;
  readonly locale: AppLocale;
  readonly loadoutLockedText: string;
  readonly playerName: string;
  readonly retryChoiceSave: boolean;
  readonly secondWeekActionIds: readonly [string, string, string];
  readonly selectedSkillId: string;
  readonly selectedSkillName: string;
  readonly strategy: string;
}

const SKILL_JOURNEYS = [
  {
    browserUuid: '00000000-0000-4000-8000-000000000008',
    effectValueText: '15%',
    effectValueType: 'multiplierPermille',
    expectedAppliedEffectMultiplierPermille: 1150,
    expectedAppliedEffectType: 'action_xp_multiplier',
    expectedBaseBodyDelta: -8,
    expectedBodyCostMultiplierPermille: 1000,
    expectedPreparationDeltaFlat: 0,
    expectedRequestedBodyDelta: -8,
    expectedXpMultiplierPermille: 1150,
    firstWeekActionIds: ['action_film_study', 'action_film_study', 'action_film_study'],
    inventoryTitle: '스킬과 장착 슬롯',
    locale: 'ko-KR',
    loadoutLockedText: '행동 계획 단계에서만 장착 스킬을 바꿀 수 있습니다.',
    playerName: '필름 빌드 토요일',
    retryChoiceSave: false,
    secondWeekActionIds: ['action_route_drills', 'action_route_drills', 'action_route_drills'],
    selectedSkillId: 'skill_route_notebook_c',
    selectedSkillName: '루트 노트',
    strategy: 'film-heavy',
  },
  {
    browserUuid: '00000000-0000-4000-8000-000000000001',
    effectValueText: '15%',
    effectValueType: 'multiplierPermille',
    expectedAdditionalAppliedEffect: {
      effectIndex: 1,
      effectValue: 2,
      effectValueType: 'delta',
      type: 'action_preparation_delta_flat',
    },
    expectedAppliedEffectMultiplierPermille: 1150,
    expectedAppliedEffectType: 'action_xp_multiplier',
    expectedBaseBodyDelta: -8,
    expectedBodyCostMultiplierPermille: 1000,
    expectedPreparationDeltaFlat: 2,
    expectedRequestedBodyDelta: -8,
    expectedXpMultiplierPermille: 1150,
    firstWeekActionIds: ['action_weight_room', 'action_recovery', 'action_weight_room'],
    inventoryTitle: 'Skills and loadout',
    locale: 'en-US',
    loadoutLockedText: 'You can change the loadout only while planning actions.',
    playerName: 'Strength Build Saturday',
    retryChoiceSave: true,
    secondWeekActionIds: [
      'action_hands_catch_work',
      'action_hands_catch_work',
      'action_hands_catch_work',
    ],
    selectedSkillId: 'skill_catch_point_map_b',
    selectedSkillName: 'Catch-Point Map',
    strategy: 'strength-heavy',
  },
] as const satisfies readonly SkillJourneyCase[];

async function installFixedCareerSeed(page: Page, fixedUuid: string): Promise<void> {
  await page.addInitScript((fixedUuid) => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      configurable: true,
      value: () => fixedUuid,
    });
  }, fixedUuid);
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
  weekIndex: number,
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
    weekIndex,
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
        weekIndex,
      });
    }
  }

  return waitForPersistedCareer(page, {
    phase: 'WEEK_END',
    resultActionIds: actionIds,
    revision: startingRevision + 4,
    weekIndex,
  });
}

async function advanceUntilBreakthrough(
  page: Page,
  actionIds: readonly [string, string, string],
  startingRevision = 4,
): Promise<PersistedCareerInPhase<'SKILL_BREAKTHROUGH'>> {
  let revision = startingRevision;
  for (let weekIndex = 0; weekIndex < 13; weekIndex += 1) {
    const weekEnd = await finishWeek(page, actionIds, revision, weekIndex);
    const advanced = await completeGameAndAdvanceWeek(page, weekEnd);
    revision = advanced.revision;
    if (advanced.phase.type === 'SKILL_BREAKTHROUGH') {
      return advanced as PersistedCareerInPhase<'SKILL_BREAKTHROUGH'>;
    }
    expect(advanced.phase.type).toBe('PLAN_ACTIONS');
    expect(advanced.player.skillState.breakthroughGauge.lastProgress?.weekIndex).toBe(
      weekIndex + 1,
    );
    expect(advanced.player.skillState.acquisitions).toEqual([]);

    await page.getByTestId('career-nav-skills').click();
    await expect(page.getByTestId('skill-breakthrough-gauge')).toBeVisible();
    await expect(page.getByTestId('skill-gauge-evidence')).toBeVisible();
    await page.getByTestId('career-nav-week').click();
  }
  throw new Error('Expected a gauge-triggered breakthrough within thirteen weeks.');
}

async function openSkillLoadout(page: Page): Promise<void> {
  await page.getByTestId('career-nav-skills').click();
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
  expectedWeekIndex = 1,
): Promise<void> {
  expect(result).toMatchObject({
    actionId: journey.secondWeekActionIds[0],
    actionIndex: 0,
    baseBodyDelta: journey.expectedBaseBodyDelta,
    requestedBodyDelta: journey.expectedRequestedBodyDelta,
    skillEffectAggregates: {
      bodyCostMultiplierPermille: journey.expectedBodyCostMultiplierPermille,
      preparationDeltaFlat: journey.expectedPreparationDeltaFlat,
      xpMultiplierPermille: journey.expectedXpMultiplierPermille,
    },
    weekIndex: expectedWeekIndex,
  });
  if (journey.expectedFirstAttributeXp !== undefined) {
    expect(result.attributeXp[0]).toMatchObject(journey.expectedFirstAttributeXp);
  }
  const expectedAppliedEffects = [
    {
      effectIndex: 0,
      [journey.effectValueType]: journey.expectedAppliedEffectMultiplierPermille,
      skillId: journey.selectedSkillId,
      slotIndex: expectedSlotIndex,
      type: journey.expectedAppliedEffectType,
    },
  ];
  if (journey.expectedAdditionalAppliedEffect !== undefined) {
    expectedAppliedEffects.push({
      effectIndex: journey.expectedAdditionalAppliedEffect.effectIndex,
      [journey.expectedAdditionalAppliedEffect.effectValueType]:
        journey.expectedAdditionalAppliedEffect.effectValue,
      skillId: journey.selectedSkillId,
      slotIndex: expectedSlotIndex,
      type: journey.expectedAdditionalAppliedEffect.type,
    });
  }
  expect(result.appliedSkillEffects).toEqual(expectedAppliedEffects);
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
      await installFixedCareerSeed(page, journey.browserUuid);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', journey.locale);

      const created = await createRepresentativeCareer(page, journey.locale, journey.playerName);
      expect(created).toMatchObject({
        careerSeed: `career-seed:${journey.browserUuid}`,
        lastPassiveBodyRecovery: null,
        programId: 'program_northstar_college',
        recruitingState: { type: 'COMMITTED' },
        recentWeeklyActionIds: [],
        schemaVersion: 7,
      });
      expect(created.programContext).not.toBeNull();
      expect(created.player.skillState).toEqual({
        acquisitions: [],
        breakthroughGauge: {
          lastProgress: null,
          model: 'gauge_v1',
          progress: 0,
          threshold: 100,
        },
        equippedSkillIds: [null, null, null, null],
      });

      const pendingOffer = await advanceUntilBreakthrough(page, journey.firstWeekActionIds);
      expect(pendingOffer.recentWeeklyActionIds.slice(-3)).toEqual(journey.firstWeekActionIds);
      expect(new Set(pendingOffer.phase.offer.offeredSkillIds)).toHaveProperty('size', 3);
      expect(pendingOffer.phase.offer.offeredSkillIds).toContain(journey.selectedSkillId);
      expect(pendingOffer.phase.offer.trigger).toEqual(
        pendingOffer.player.skillState.breakthroughGauge.lastProgress,
      );
      expect(pendingOffer.phase.offer.trigger).toMatchObject({
        threshold: 100,
        triggeredOffer: true,
        weekIndex: pendingOffer.weekIndex,
      });
      expect(pendingOffer.phase.offer.trigger?.pointsEarned).toBeGreaterThan(0);
      expect(pendingOffer.phase.offer.trigger?.sources.length).toBeGreaterThan(0);
      expect(pendingOffer.lastPassiveBodyRecovery).toMatchObject({
        appliedSkillEffects: [],
        baseBodyDelta: 10,
        requestedBodyDelta: 10,
        weekIndex: pendingOffer.weekIndex - 1,
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
        revision: pendingOffer.revision + 1,
        weekIndex: pendingOffer.weekIndex,
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
        revision: chosen.revision + 1,
        weekIndex: chosen.weekIndex,
      });
      expect(cleared.player.skillState.equippedSkillIds).toEqual([null, null, null, null]);
      const slotOneSelect = page.getByTestId('skill-slot-select-1');
      await expect(slotOneSelect).toBeEnabled();
      await slotOneSelect.selectOption(journey.selectedSkillId);
      const moved = await waitForPersistedCareer(page, {
        phase: 'PLAN_ACTIONS',
        revision: cleared.revision + 1,
        weekIndex: cleared.weekIndex,
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
      await page.getByTestId('career-nav-week').click();
      await draftActions(page, journey.secondWeekActionIds);
      await page.getByTestId('action-commit').click();
      const committed = await waitForPersistedCareer(page, {
        actionIds: journey.secondWeekActionIds,
        nextActionIndex: 0,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: [],
        revision: moved.revision + 1,
        weekIndex: moved.weekIndex,
      });
      expect(committed.player.skillState.equippedSkillIds).toEqual(
        moved.player.skillState.equippedSkillIds,
      );
      await openSkillLoadout(page);
      for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
        await expect(page.getByTestId(`skill-slot-select-${slotIndex}`)).toBeDisabled();
      }
      await expect(page.getByText(journey.loadoutLockedText)).toBeVisible();

      await page.getByTestId('career-nav-week').click();
      await page.getByTestId('resolve-next').click();
      const afterAppliedAction = await waitForPersistedCareer(page, {
        actionIds: journey.secondWeekActionIds,
        nextActionIndex: 1,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: journey.secondWeekActionIds.slice(0, 1),
        revision: committed.revision + 1,
        weekIndex: committed.weekIndex,
      });
      const firstResult = afterAppliedAction.phase.results[0];
      if (firstResult === undefined) {
        throw new Error('Expected the first M2 result to be persisted.');
      }
      await expectAppliedResult(firstResult, journey, 1, moved.weekIndex);
      const evidence = page.getByTestId(`skill-evidence-${journey.selectedSkillId}-0`);
      await expect(evidence).toBeVisible();
      await expect(evidence).toContainText(journey.selectedSkillName);
      await expect(evidence).toContainText(journey.effectValueText);
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
    await installFixedCareerSeed(page, journey.browserUuid);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', journey.locale);
    await createRepresentativeCareer(page, journey.locale, 'Narrow Build Saturday');

    const pendingOffer = await advanceUntilBreakthrough(page, journey.firstWeekActionIds);
    expect(pendingOffer.phase.offer.offeredSkillIds).toContain(journey.selectedSkillId);
    await expect(page.getByTestId('skill-breakthrough-gauge')).toHaveAttribute(
      'data-ready',
      'true',
    );
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
      revision: pendingOffer.revision + 1,
      weekIndex: pendingOffer.weekIndex,
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

    await page.getByTestId('career-nav-week').click();
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
      revision: chosen.revision + 1,
      weekIndex: chosen.weekIndex,
    });
    await openSkillLoadout(page);
    for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
      await expect(page.getByTestId(`skill-slot-select-${slotIndex}`)).toBeDisabled();
    }
    await expect(page.getByText(journey.loadoutLockedText)).toBeVisible();

    await page.getByTestId('career-nav-week').click();
    const resolve = page.getByTestId('resolve-next');
    await expectTouchTarget(resolve);
    await expectHorizontallyWithinViewport(page, resolve);
    await resolve.click();
    const afterAppliedAction = await waitForPersistedCareer(page, {
      actionIds: journey.secondWeekActionIds,
      nextActionIndex: 1,
      phase: 'RESOLVE_ACTIONS',
      resultActionIds: journey.secondWeekActionIds.slice(0, 1),
      revision: chosen.revision + 2,
      weekIndex: chosen.weekIndex,
    });
    const firstResult = afterAppliedAction.phase.results[0];
    if (firstResult === undefined) {
      throw new Error('Expected the first narrow M2 result to be persisted.');
    }
    await expectAppliedResult(firstResult, journey, 0, chosen.weekIndex);
    const evidence = page.getByTestId(`skill-evidence-${journey.selectedSkillId}-0`);
    await expect(evidence).toContainText(journey.selectedSkillName);
    await expect(evidence).toContainText(journey.effectValueText);
    await expectNoHorizontalOverflow(page);

    await page.reload();
    expect(await readActiveCareer(page)).toEqual(afterAppliedAction);
    await expect(page.getByTestId(`skill-evidence-${journey.selectedSkillId}-0`)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
