import { expect, type Page } from '@playwright/test';

/** Locale-agnostic structural driver for the rebuilt career slice. */
export const primaryAction = (page: Page) => page.locator('.s2-actionbar .s2-btn').last();

export async function createCareer(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await expect(primaryAction(page)).toBeVisible({ timeout: 20_000 });
  await primaryAction(page).click();
  await page.locator('[role=checkbox]:not([disabled])').first().click();
  await page.locator('[role=checkbox][aria-checked=false]:not([disabled])').first().click();
  await primaryAction(page).click();
  await page.locator('#s2-name').fill(name);
  await primaryAction(page).click();
  await expect(page.locator('.s2-offer')).toHaveCount(4);
  await page.locator('.s2-offer').last().click();
  await primaryAction(page).click();
  await expect(page.locator('.s2-nameplate')).toBeVisible({ timeout: 10_000 });
}

/** Passes the optional weekly scenes (midweek event, medical check); each stops only to decide. */
export async function advanceToPregame(
  page: Page,
  onScreen?: (label: string) => Promise<void>,
): Promise<void> {
  for (let guard = 0; guard < 5; guard += 1) {
    await expect(
      page.locator('#s2-pregame, #s2-breakthrough, #s2-event, #s2-nil, #s2-injury').first(),
    ).toBeVisible();
    if ((await page.locator('#s2-pregame').count()) > 0) break;
    const scene =
      (await page.locator('#s2-breakthrough').count()) > 0
        ? 'breakthrough'
        : (await page.locator('#s2-event').count()) > 0
          ? 'event'
          : (await page.locator('#s2-nil').count()) > 0
            ? 'nil'
            : 'injury';
    const choice = page.locator('.s2-choice, .s2-cardgrid--offer button.s2-cardbtn');
    if (scene === 'nil') {
      // A NIL offer: take the deal (the primary action), then continue.
      await onScreen?.(scene);
      await primaryAction(page).click();
      await expect(page.locator('main [role=status]').first()).toBeVisible();
    } else if ((await choice.count()) > 0) {
      await onScreen?.(scene);
      await choice.first().click();
    }
    await expect(primaryAction(page)).toBeEnabled();
    await onScreen?.(`${scene}-outcome`);
    await primaryAction(page).click();
    // The scene stays mounted while the save lands; wait for it to leave before re-reading.
    await expect(page.locator(`#s2-${scene}`)).toHaveCount(0);
  }
  await expect(page.locator('#s2-pregame')).toBeVisible();
}

/** Plans with the coach's plan and plays Saturday through to the next week's planner. */
export async function playWeek(
  page: Page,
  onScreen?: (label: string) => Promise<void>,
): Promise<number> {
  await page.locator('.s2-panel__head .s2-chipbtn').first().click();
  await onScreen?.('plan');
  await primaryAction(page).click();
  await expect(page.locator('.s2-grade')).toBeVisible();
  await onScreen?.('report');
  await primaryAction(page).click();
  await advanceToPregame(page, onScreen);
  await onScreen?.('pregame');
  await primaryAction(page).click();
  let decisions = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    // Each Saturday state has one explicit marker: a pending decision or the final graphic.
    await expect(page.locator('.s2-choice, #s2-final').first()).toBeVisible();
    if ((await page.locator('#s2-final').count()) > 0) break;
    await expect(page.locator('.s2-board svg[role=img]')).toBeVisible();
    if (decisions === 0) await onScreen?.('snap');
    await page.locator('.s2-choice').first().click();
    await expect(page.locator('.s2-lowerthird')).toBeVisible();
    if (decisions === 0) await onScreen?.('result');
    decisions += 1;
    await primaryAction(page).click();
    await expect(page.locator('.s2-lowerthird')).toHaveCount(0);
  }
  await onScreen?.('final');
  await primaryAction(page).click();
  await expect(page.locator('.s2-grade')).toBeVisible();
  await onScreen?.('postgame');
  await primaryAction(page).click();
  await expect(page.locator('.s2-focusgrid')).toBeVisible();
  return decisions;
}
