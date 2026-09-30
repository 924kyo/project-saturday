import { expect, test } from '@playwright/test';

import { advanceToPregame, createCareer, playWeek, primaryAction } from './support/slice';

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
    await expect(page.locator('.s2-grade')).toBeVisible();
    await primaryAction(page).click();
    await advanceToPregame(page);
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

// M10: weekly transitions stay responsive on a throttled phone (4× CPU via DevTools emulation).
test.describe('mobile responsiveness', () => {
  test.skip(({ isMobile }) => !isMobile, 'Throttled on the phone project only.');
  test('a full week of transitions stays under 1.5 s each at 4× CPU slowdown', async ({ page }) => {
    test.setTimeout(180_000);
    await createCareer(page, 'Tempo Tester');
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const marks: { label: string; at: number }[] = [{ label: 'start', at: Date.now() }];
    await playWeek(page, async (label) => {
      marks.push({ label, at: Date.now() });
    });
    marks.push({ label: 'next-week', at: Date.now() });
    const slowest = marks
      .slice(1)
      .map((mark, index) => ({ label: mark.label, ms: mark.at - marks[index]!.at }));
    for (const { label, ms } of slowest) expect(ms, label).toBeLessThan(1_500);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });
});

// M10: the production build is installable: a complete manifest and a controlling service worker.
test.describe('PWA installability', () => {
  test.skip(({ isMobile }) => !isMobile, 'checked once');
  test('ships an installable manifest and a service worker that takes control', async ({
    page,
    request,
  }) => {
    const manifest = (await (await request.get('/manifest.webmanifest')).json()) as {
      name: string;
      start_url: string;
      display: string;
      icons: { sizes: string; purpose: string }[];
    };
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map(({ sizes }) => sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(manifest.icons.some(({ purpose }) => purpose === 'maskable')).toBe(true);
    await page.goto('/');
    await page
      .waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 20_000 })
      .catch(async () => {
        await page.reload();
        await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
          timeout: 20_000,
        });
      });
  });
});
