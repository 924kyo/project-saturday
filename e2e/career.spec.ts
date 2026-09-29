import { expect, test, type Page } from '@playwright/test';

import { step } from './support/career';
import { primaryAction } from './support/slice';

/**
 * R5 release-boundary journeys: a full two-season life (recruit, climb, Saturdays, postseason or
 * review, offseason transfer, season two, review) for every position. Locales and viewports are
 * assigned orthogonally by default; `E2E_FULL=1` runs the full position × locale × viewport matrix.
 */
const POSITIONS = ['QB', 'RB', 'WR', 'CB'] as const;
const LOCALES = ['ko-KR', 'en-US'] as const;
const VIEWPORTS = { phone: null, narrow: { width: 320, height: 720 } } as const;

const full = process.env['E2E_FULL'] === '1';
const plan: { position: number; locale: (typeof LOCALES)[number]; narrow: boolean }[] = full
  ? POSITIONS.flatMap((_, position) =>
      LOCALES.flatMap((locale) => [false, true].map((narrow) => ({ position, locale, narrow }))),
    )
  : [
      { position: 0, locale: 'ko-KR', narrow: false },
      { position: 1, locale: 'en-US', narrow: false },
      { position: 2, locale: 'ko-KR', narrow: true },
      { position: 3, locale: 'en-US', narrow: false },
    ];

async function createInLocale(page: Page, position: number, locale: string, name: string) {
  await page.goto('/');
  await expect(primaryAction(page)).toBeVisible({ timeout: 20_000 });
  if ((await page.locator('html').getAttribute('lang')) !== locale)
    await page.locator('.s2-topbar__actions .s2-chipbtn').first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await page.locator('.s2-tiles').first().locator('.s2-tile').nth(position).click();
  await primaryAction(page).click();
  await page.locator('[role=checkbox]:not([disabled])').first().click();
  await page.locator('[role=checkbox][aria-checked=false]:not([disabled])').first().click();
  await primaryAction(page).click();
  await page.locator('#s2-name').fill(name);
  await primaryAction(page).click();
  await expect(page.locator('.s2-offer')).toHaveCount(4);
  await page.locator('.s2-offer').nth(1).click();
  await primaryAction(page).click();
  await expect(page.locator('.s2-nameplate')).toBeVisible({ timeout: 10_000 });
}

for (const entry of plan) {
  const label = `${POSITIONS[entry.position]} ${entry.locale}${entry.narrow ? ' 320px' : ''}`;
  test(`two-season career: ${label}`, async ({ page, isMobile }) => {
    // Phone journeys run on the mobile project; desktop-only journeys on desktop, 320 on mobile.
    test.skip(
      entry.narrow ? !isMobile : full ? false : (entry.position % 2 === 0) !== isMobile,
      'assigned to the other project',
    );
    test.setTimeout(600_000);
    if (entry.narrow) await page.setViewportSize(VIEWPORTS.narrow);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await createInLocale(page, entry.position, entry.locale, 'Journey Tester');
    const programAt = async () => page.locator('.s2-nameplate .s2-eyebrow').innerText();
    const firstProgram = (await programAt()).split('·')[0]!.trim();
    let reviews = 0;
    let transferred = false;
    let snaps = 0;
    for (let guard = 0; guard < 1_500 && reviews < 2; guard += 1) {
      if (entry.narrow) {
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(width, `step ${guard}`).toBeLessThanOrEqual(320);
      }
      const kind = await step(page);
      if (kind === 'snap') snaps += 1;
      if (kind === 'review') reviews += 1;
      if (kind === 'offseason') {
        await expect(page.locator('.s2-focusgrid')).toBeVisible();
        transferred = (await programAt()).split('·')[0]!.trim() !== firstProgram;
      }
      if (kind === 'complete') break;
    }
    expect(reviews).toBe(2);
    expect(transferred).toBe(true);
    expect(snaps).toBeGreaterThan(24);
    // Season two ended in an offseason decision; the career and its save are intact on reload.
    await page.reload();
    await expect(page.locator('#s2-offseason')).toBeVisible();
    // Retiring here completes the career: the plaque joins the Alumni Wall and survives reload.
    await page.locator('#s2-offseason ~ .s2-chipbtn').click();
    await page.locator('[role=alertdialog] .s2-btn--ghost').last().click();
    await expect(page.locator('#s2-complete')).toBeVisible();
    await expect(page.locator('.s2-plaque').first()).toContainText('Journey Tester');
    await page.reload();
    await expect(page.locator('.s2-plaque').first()).toContainText('Journey Tester');
    expect(errors).toEqual([]);
  });
}
