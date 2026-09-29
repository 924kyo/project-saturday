import { expect, test } from '@playwright/test';

import { createCareer, playWeek, primaryAction } from './support/slice';

test.describe('career slice journey', () => {
  test('create, recruit, practice, play Saturday and reach the next week, then resume after reload', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await createCareer(page, 'Marcus Hale');
    const decisions = await playWeek(page);
    expect(decisions).toBeGreaterThanOrEqual(2);
    const week = await page.locator('.s2-nameplate .s2-eyebrow').textContent();
    await page.reload();
    await expect(page.locator('.s2-nameplate .s2-eyebrow')).toHaveText(week ?? '');
    await expect(page.locator('.s2-focusgrid')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('offline resume', () => {
  test.skip(({ isMobile }) => !isMobile, 'Offline behavior is viewport-independent.');
  test('an installed app reloads the saved Saturday while offline', async ({ page, context }) => {
    await createCareer(page, 'Offline Tester');
    await page
      .waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
        timeout: 20_000,
      })
      .catch(async () => {
        await page.reload();
        await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
          timeout: 20_000,
        });
      });
    await page.locator('.s2-panel__head .s2-chipbtn').first().click();
    await primaryAction(page).click();
    await primaryAction(page).click();
    await primaryAction(page).click();
    await expect(page.locator('.s2-scorebug')).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.s2-scorebug')).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe('true 320 px layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'Narrow layout is checked once.');
  test.use({ viewport: { width: 320, height: 720 } });
  test('no screen in the slice scrolls horizontally', async ({ page }) => {
    const overflow = async (label: string) => {
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, label).toBeLessThanOrEqual(320);
    };
    await page.goto('/');
    await expect(primaryAction(page)).toBeVisible({ timeout: 20_000 });
    await overflow('create');
    await createCareer(page, 'Narrow Screen');
    await playWeek(page, overflow);
  });
});
