import { expect, test, type Locator, type Page } from '@playwright/test';

import { primaryAction } from './support/slice';

/**
 * M10 keyboard and motion gates. The keyboard journey reaches each control with Tab and activates
 * it with Enter or Space only (no pointer) from the landing screen through a resolved Saturday snap.
 * Reduced motion removes every board animation.
 */
async function tabTo(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter') {
  const handle = await target.elementHandle();
  if (handle === null) throw new Error('target missing');
  for (let presses = 0; presses < 120; presses += 1) {
    const focused = await page.evaluate((element) => document.activeElement === element, handle);
    if (focused) {
      await page.keyboard.press(key);
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error('control never received keyboard focus');
}

test('a Saturday is playable with the keyboard alone', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard journey on desktop');
  test.setTimeout(180_000);
  await page.goto('/');
  await expect(primaryAction(page)).toBeVisible({ timeout: 20_000 });
  await tabTo(page, primaryAction(page));
  await tabTo(page, page.locator('[role=checkbox]:not([disabled])').first(), 'Space');
  await tabTo(
    page,
    page.locator('[role=checkbox][aria-checked=false]:not([disabled])').first(),
    'Space',
  );
  await tabTo(page, primaryAction(page));
  await tabTo(page, page.locator('#s2-name'));
  await page.keyboard.type('Keys Only');
  await tabTo(page, primaryAction(page));
  await expect(page.locator('.s2-offer')).toHaveCount(4);
  await tabTo(page, page.locator('.s2-offer').first());
  await tabTo(page, primaryAction(page));
  await expect(page.locator('.s2-focusgrid')).toBeVisible({ timeout: 10_000 });
  await tabTo(page, page.locator('.s2-panel__head .s2-chipbtn').first());
  await tabTo(page, primaryAction(page));
  await expect(page.locator('.s2-grade')).toBeVisible();
  for (let guard = 0; guard < 8 && (await page.locator('#s2-pregame').count()) === 0; guard += 1) {
    const choice = page.locator('.s2-choice, .s2-cardgrid--offer button.s2-cardbtn');
    if ((await choice.count()) > 0 && (await page.locator('#s2-nil').count()) === 0)
      await tabTo(page, choice.first());
    await tabTo(page, primaryAction(page));
    await page.waitForTimeout(300);
  }
  await expect(page.locator('#s2-pregame')).toBeVisible();
  await tabTo(page, primaryAction(page));
  await expect(page.locator('.s2-choice').first()).toBeVisible();
  await tabTo(page, page.locator('.s2-choice').first());
  await expect(page.locator('.s2-lowerthird')).toBeVisible();
});

test.describe('reduced motion', () => {
  test('the board shows saved results without animation', async ({ page, isMobile }) => {
    test.skip(isMobile, 'checked once');
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(primaryAction(page)).toBeVisible({ timeout: 20_000 });
    await primaryAction(page).click();
    await page.locator('[role=checkbox]:not([disabled])').first().click();
    await page.locator('[role=checkbox][aria-checked=false]:not([disabled])').first().click();
    await primaryAction(page).click();
    await page.locator('#s2-name').fill('Still Tester');
    await primaryAction(page).click();
    await page.locator('.s2-offer').first().click();
    await primaryAction(page).click();
    await expect(page.locator('.s2-focusgrid')).toBeVisible({ timeout: 10_000 });
    await page.locator('.s2-panel__head .s2-chipbtn').first().click();
    await primaryAction(page).click();
    await expect(page.locator('.s2-grade')).toBeVisible();
    for (
      let guard = 0;
      guard < 8 && (await page.locator('#s2-pregame').count()) === 0;
      guard += 1
    ) {
      const choice = page.locator('.s2-choice, .s2-cardgrid--offer button.s2-cardbtn');
      if ((await choice.count()) > 0 && (await page.locator('#s2-nil').count()) === 0)
        await choice.first().click();
      await primaryAction(page).click();
      await page.waitForTimeout(300);
    }
    await primaryAction(page).click();
    await page.locator('.s2-choice').first().click();
    await expect(page.locator('.s2-lowerthird')).toBeVisible();
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      true,
    );
    const markup = await page.locator('.s2-board').first().innerHTML();
    expect(markup.match(/<animate[^>]*>/g) ?? []).toEqual([]);
  });
});
