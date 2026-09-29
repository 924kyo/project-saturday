import { expect, test, type Page } from '@playwright/test';

import {
  completeGameAndAdvanceWeek,
  createRepresentativeCareer,
  draftActions,
  expectHorizontallyWithinViewport,
  expectNoHorizontalOverflow,
  expectTouchTarget,
  readActiveCareer,
  REPRESENTATIVE_APPEARANCE,
  REPRESENTATIVE_IDENTITY,
  waitForPersistedCareer,
  type AppLocale,
  type PersistedCareer,
  type PersistedCareerInPhase,
} from './support/career';

const FIRST_WEEK_ACTIONS = [
  'action_route_drills',
  'action_recovery',
  'action_route_drills',
] as const;
const SECOND_WEEK_ACTIONS = ['action_speed_work', 'action_study_hall', 'action_recovery'] as const;

const LOCALE_CASES = [
  {
    bodyLabel: '몸 상태',
    creationTitle: '나만의 WR을 만드세요',
    locale: 'ko-KR',
    playerName: '민준 토요일',
    routeActionName: '루트 훈련',
    weekThree: '3주차',
  },
  {
    bodyLabel: 'Body',
    creationTitle: 'Create your WR',
    locale: 'en-US',
    playerName: 'Avery Saturday',
    routeActionName: 'Route Drills',
    weekThree: 'Week 3',
  },
] as const satisfies readonly {
  readonly creationTitle: string;
  readonly bodyLabel: string;
  readonly locale: AppLocale;
  readonly playerName: string;
  readonly routeActionName: string;
  readonly weekThree: string;
}[];

async function resolveAndWait<PhaseType extends 'RESOLVE_ACTIONS' | 'WEEK_END'>(
  page: Page,
  expected: {
    readonly actionIds?: readonly string[];
    readonly nextActionIndex?: number;
    readonly phase: PhaseType;
    readonly resultActionIds: readonly string[];
    readonly revision: number;
    readonly weekIndex: number;
  },
): Promise<PersistedCareerInPhase<PhaseType>> {
  const resolveButton = page.getByTestId('resolve-next');
  await expect(resolveButton).toBeEnabled();
  await resolveButton.click();
  return waitForPersistedCareer(page, expected);
}

async function choosePendingBreakthrough(page: Page, career: PersistedCareer) {
  if (career.phase.type !== 'SKILL_BREAKTHROUGH') return career;
  const skillId = career.phase.offer.offeredSkillIds[0];
  await page.getByTestId(`skill-offer-${skillId}`).check();
  await page.getByTestId('skill-choose-confirm').click();
  return waitForPersistedCareer(page, {
    phase: 'PLAN_ACTIONS',
    revision: career.revision + 1,
    weekIndex: career.weekIndex,
  });
}

for (const localeCase of LOCALE_CASES) {
  test.describe(`M1 bilingual career journey (${localeCase.locale})`, () => {
    test.use({ locale: localeCase.locale });

    test('creates, resolves two weeks, and reloads every authoritative phase exactly', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', localeCase.locale);
      await expect(
        page.getByRole('heading', { level: 1, name: localeCase.creationTitle }),
      ).toBeVisible();

      const created = await createRepresentativeCareer(
        page,
        localeCase.locale,
        localeCase.playerName,
      );
      expect(created.player).toMatchObject({
        appearance: REPRESENTATIVE_APPEARANCE,
        archetypeId: REPRESENTATIVE_IDENTITY.archetypeId,
        displayName: localeCase.playerName,
        heightCm: 191,
        personalityTraitIds: REPRESENTATIVE_IDENTITY.personalityTraitIds,
        recruitingBackgroundId: REPRESENTATIVE_IDENTITY.recruitingBackgroundId,
        weightKg: 95,
      });
      await expect(
        page.getByRole('heading', { level: 3, name: localeCase.routeActionName }),
      ).toBeVisible();

      const beforeDraft = await readActiveCareer(page);
      await draftActions(page, FIRST_WEEK_ACTIONS);
      expect(await readActiveCareer(page)).toEqual(beforeDraft);

      await page.getByTestId('action-commit').click();
      const committed = await waitForPersistedCareer(page, {
        actionIds: FIRST_WEEK_ACTIONS,
        nextActionIndex: 0,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: [],
        revision: 5,
        weekIndex: 0,
      });
      expect(committed.rng).toEqual(created.rng);
      await expect(page.locator('#weekly-heading')).toBeFocused();
      await expect
        .poll(() =>
          page
            .locator('#weekly-heading')
            .evaluate((element) => getComputedStyle(element).outlineStyle),
        )
        .toBe('none');

      await page.reload();
      await expect(page.getByTestId('weekly-phase')).toHaveAttribute(
        'data-phase',
        'RESOLVE_ACTIONS',
      );
      await expect(
        page.getByRole('heading', { level: 1, name: localeCase.playerName }),
      ).toBeVisible();

      const afterFirstResult = await resolveAndWait(page, {
        actionIds: FIRST_WEEK_ACTIONS,
        nextActionIndex: 1,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: FIRST_WEEK_ACTIONS.slice(0, 1),
        revision: 6,
        weekIndex: 0,
      });
      expect(afterFirstResult.phase.results).toHaveLength(1);
      expect(afterFirstResult.rng).toEqual(created.rng);

      await page.reload();
      await expect(page.getByTestId('weekly-phase')).toHaveAttribute(
        'data-phase',
        'RESOLVE_ACTIONS',
      );
      await expect(
        page.getByTestId('weekly-phase').locator('article[data-action-id="action_route_drills"]'),
      ).toHaveCount(1);

      await resolveAndWait(page, {
        actionIds: FIRST_WEEK_ACTIONS,
        nextActionIndex: 2,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: FIRST_WEEK_ACTIONS.slice(0, 2),
        revision: 7,
        weekIndex: 0,
      });
      const firstWeekEnd = await resolveAndWait(page, {
        phase: 'WEEK_END',
        resultActionIds: FIRST_WEEK_ACTIONS,
        revision: 8,
        weekIndex: 0,
      });
      expect(firstWeekEnd.phase.results).toHaveLength(3);
      await expect(page.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'WEEK_END');
      await expect(page.getByTestId('weekly-phase').locator('article[data-action-id]')).toHaveCount(
        3,
      );

      const afterFirstAdvance = await completeGameAndAdvanceWeek(page, firstWeekEnd);
      expect(afterFirstAdvance.phase.type).toBe('PLAN_ACTIONS');
      expect(afterFirstAdvance.weekIndex).toBe(1);
      expect(afterFirstAdvance.player.skillState.acquisitions).toEqual([]);
      expect(afterFirstAdvance.player.skillState.breakthroughGauge.progress).toBeGreaterThan(0);
      await page.getByTestId('career-nav-skills').click();
      await expect(page.getByTestId('skill-breakthrough-gauge')).toBeVisible();
      await page.getByTestId('career-nav-week').click();

      await draftActions(page, SECOND_WEEK_ACTIONS);
      await page.getByTestId('action-commit').click();
      await waitForPersistedCareer(page, {
        actionIds: SECOND_WEEK_ACTIONS,
        nextActionIndex: 0,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: [],
        revision: afterFirstAdvance.revision + 1,
        weekIndex: 1,
      });
      await resolveAndWait(page, {
        actionIds: SECOND_WEEK_ACTIONS,
        nextActionIndex: 1,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: SECOND_WEEK_ACTIONS.slice(0, 1),
        revision: afterFirstAdvance.revision + 2,
        weekIndex: 1,
      });
      await resolveAndWait(page, {
        actionIds: SECOND_WEEK_ACTIONS,
        nextActionIndex: 2,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: SECOND_WEEK_ACTIONS.slice(0, 2),
        revision: afterFirstAdvance.revision + 3,
        weekIndex: 1,
      });
      const secondWeekEnd = await resolveAndWait(page, {
        phase: 'WEEK_END',
        resultActionIds: SECOND_WEEK_ACTIONS,
        revision: afterFirstAdvance.revision + 4,
        weekIndex: 1,
      });

      const finalBeforeChoice = await completeGameAndAdvanceWeek(page, secondWeekEnd);
      const finalBeforeReload = await choosePendingBreakthrough(page, finalBeforeChoice);
      expect(finalBeforeReload.phase.type).toBe('PLAN_ACTIONS');
      expect(finalBeforeReload.weekIndex).toBe(2);
      expect(finalBeforeReload.rng.drawCount).toBeGreaterThan(afterFirstAdvance.rng.drawCount);

      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('lang', localeCase.locale);
      await expect(page.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'PLAN_ACTIONS');
      await expect(page.getByTestId('career-week')).toHaveText(localeCase.weekThree);
      await expect(
        page.getByRole('heading', { level: 1, name: localeCase.playerName }),
      ).toBeVisible();
      await page.getByTestId('career-nav-home').click();
      await expect(page.getByRole('meter', { name: localeCase.bodyLabel })).toHaveAttribute(
        'aria-valuenow',
        String(finalBeforeReload.player.state.body),
      );

      const finalAfterReload = await readActiveCareer(page);
      expect(finalAfterReload).toEqual(finalBeforeReload);
      expect(finalAfterReload?.player).toMatchObject({
        appearance: REPRESENTATIVE_APPEARANCE,
        archetypeId: REPRESENTATIVE_IDENTITY.archetypeId,
        attributes: finalBeforeReload.player.attributes,
        displayName: localeCase.playerName,
        personalityTraitIds: REPRESENTATIVE_IDENTITY.personalityTraitIds,
        recruitingBackgroundId: REPRESENTATIVE_IDENTITY.recruitingBackgroundId,
        state: finalBeforeReload.player.state,
        trainingProficiencyUses: finalBeforeReload.player.trainingProficiencyUses,
      });
    });
  });
}

test.describe('M1 320px keyboard and touch-target flow', () => {
  test.use({ locale: 'en-US', viewport: { height: 700, width: 320 } });

  test('keeps primary controls reachable through creation, resolution, and advance', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('creation-form')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const creationSubmit = page.getByTestId('creation-submit');
    await expectTouchTarget(creationSubmit);
    await expectHorizontallyWithinViewport(page, creationSubmit);

    const nameInput = page.getByTestId('creation-name');
    await nameInput.focus();
    await page.keyboard.type('Keyboard Saturday');

    const archetype = page.locator(
      'input[name="archetype"][value="archetype_wr_route_technician"]',
    );
    await archetype.focus();
    await page.keyboard.press('Space');
    await expect(archetype).toBeChecked();

    const background = page.locator('input[name="background"][value="background_late_bloomer"]');
    await background.focus();
    await page.keyboard.press('Space');
    await expect(background).toBeChecked();

    for (const personalityId of REPRESENTATIVE_IDENTITY.personalityTraitIds) {
      const personality = page.locator(`input[name="personality"][value="${personalityId}"]`);
      await personality.focus();
      await page.keyboard.press('Space');
      await expect(personality).toBeChecked();
    }

    await creationSubmit.focus();
    await expect(creationSubmit).toBeFocused();
    await page.keyboard.press('Enter');
    const choosing = await waitForPersistedCareer(page, {
      phase: 'PLAN_ACTIONS',
      revision: 1,
      weekIndex: 0,
    });
    if (choosing.recruitingState.type !== 'CHOOSING') {
      throw new Error('Expected recruiting offers after keyboard creation.');
    }
    const firstOffer = choosing.recruitingState.offers[0];
    if (firstOffer === undefined) {
      throw new Error('Expected the first recruiting offer.');
    }
    const programRadio = page.locator(
      `input[name="program-offer"][value="${firstOffer.programId}"]`,
    );
    const programOffer = programRadio.locator('..');
    await expectTouchTarget(programOffer);
    await expectHorizontallyWithinViewport(page, programOffer);
    await programRadio.focus();
    await page.keyboard.press('Space');
    await expect(programRadio).toBeChecked();
    const programCommit = page.getByTestId('commit-program');
    await expectTouchTarget(programCommit);
    await expectHorizontallyWithinViewport(page, programCommit);
    await programCommit.focus();
    await page.keyboard.press('Enter');
    await waitForPersistedCareer(page, {
      phase: 'PLAN_ACTIONS',
      revision: 4,
      weekIndex: 0,
    });
    await expectNoHorizontalOverflow(page);

    const routeAction = page.getByTestId('action-choice-action_route_drills');
    await expectTouchTarget(routeAction);
    await expectHorizontallyWithinViewport(page, routeAction);
    await routeAction.focus();
    await page.keyboard.press('Enter');

    const recoveryAction = page.getByTestId('action-choice-action_recovery');
    await recoveryAction.focus();
    await page.keyboard.press('Space');
    await routeAction.focus();
    await page.keyboard.press('Enter');
    for (const [index, actionId] of FIRST_WEEK_ACTIONS.entries()) {
      await expect(page.getByTestId(`draft-slot-${index}`)).toHaveAttribute(
        'data-action-id',
        actionId,
      );
    }

    const commit = page.getByTestId('action-commit');
    await expectTouchTarget(commit);
    await expectHorizontallyWithinViewport(page, commit);
    await commit.focus();
    await page.keyboard.press('Enter');
    await waitForPersistedCareer(page, {
      actionIds: FIRST_WEEK_ACTIONS,
      nextActionIndex: 0,
      phase: 'RESOLVE_ACTIONS',
      resultActionIds: [],
      revision: 5,
      weekIndex: 0,
    });
    await expect(page.locator('#weekly-heading')).toBeFocused();
    await expect
      .poll(() =>
        page
          .locator('#weekly-heading')
          .evaluate((element) => getComputedStyle(element).outlineStyle),
      )
      .toBe('solid');
    await expectNoHorizontalOverflow(page);

    const resolveButton = page.getByTestId('resolve-next');
    await expectTouchTarget(resolveButton);
    await expectHorizontallyWithinViewport(page, resolveButton);
    for (let resultCount = 1; resultCount <= 3; resultCount += 1) {
      await expect(resolveButton).toBeEnabled();
      await resolveButton.focus();
      await page.keyboard.press('Enter');
      await waitForPersistedCareer(page, {
        ...(resultCount < 3
          ? {
              actionIds: FIRST_WEEK_ACTIONS,
              nextActionIndex: resultCount,
              phase: 'RESOLVE_ACTIONS' as const,
            }
          : { phase: 'WEEK_END' as const }),
        resultActionIds: FIRST_WEEK_ACTIONS.slice(0, resultCount),
        revision: 5 + resultCount,
        weekIndex: 0,
      });
      if (resultCount === 1) {
        const ratingProgress = page.getByTestId('result-progress-attribute_wr_route_running');
        await expect(ratingProgress).toBeVisible();
        await expectHorizontallyWithinViewport(page, ratingProgress);
        await expect(ratingProgress.getByRole('progressbar')).toHaveAttribute(
          'aria-valuemax',
          '100',
        );
        await expect(page.getByTestId('result-proficiency-proficiency_route_drills')).toBeVisible();
      }
    }
    await expect(page.locator('#weekly-heading')).toBeFocused();
    await expectNoHorizontalOverflow(page);

    const advance = page.getByTestId('advance-week');
    await expectTouchTarget(advance);
    await expectHorizontallyWithinViewport(page, advance);
    const persistedWeekEnd = await readActiveCareer(page);
    if (persistedWeekEnd?.phase.type !== 'WEEK_END') {
      throw new Error('Expected a week-end career before the game journey.');
    }
    const afterFirstAdvance = await completeGameAndAdvanceWeek(
      page,
      persistedWeekEnd as PersistedCareerInPhase<'WEEK_END'>,
    );
    expect(afterFirstAdvance.phase.type).toBe('PLAN_ACTIONS');
    expect(afterFirstAdvance.weekIndex).toBe(1);
    await expect(page.locator('#weekly-heading')).toBeFocused();
    await expectNoHorizontalOverflow(page);
    expect(afterFirstAdvance.player.skillState.breakthroughGauge.progress).toBeGreaterThan(0);
    await page.getByTestId('career-nav-skills').click();
    const gauge = page.getByTestId('skill-breakthrough-gauge');
    await expect(gauge).toBeVisible();
    await expectHorizontallyWithinViewport(page, gauge);
    await expect(page.getByTestId('skills-empty')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
