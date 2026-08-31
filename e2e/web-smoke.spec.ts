import { expect, test, type Page } from '@playwright/test';

import { createRepresentativeCareer, readActiveCareer } from './support/career';
import { readIndexedDbValue } from './support/indexed-db';

async function readPersistedLocale(page: Page): Promise<string | undefined> {
  const value = await readIndexedDbValue<unknown>(page, 'settings', 'locale');
  return typeof value === 'string' ? value : undefined;
}

test.describe('localized launch flow', () => {
  test.use({ locale: 'ko-KR' });

  test('detects Korean, switches to English, and reloads the saved locale', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ko-KR');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const koreanText = await page.getByTestId('app-shell').innerText();

    await page.getByTestId('locale-en-US').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page.getByTestId('locale-en-US')).toHaveAttribute('aria-pressed', 'true');
    const englishText = await page.getByTestId('app-shell').innerText();
    expect(englishText).not.toBe(koreanText);
    await expect.poll(() => readPersistedLocale(page)).toBe('en-US');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page.getByTestId('locale-en-US')).toHaveAttribute('aria-pressed', 'true');
  });

  test('supports keyboard locale selection without horizontal clipping', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');

    const englishLocaleButton = page.getByTestId('locale-en-US');
    await englishLocaleButton.focus();
    await expect(englishLocaleButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

test.describe('English browser locale', () => {
  test.use({ locale: 'en-US' });

  test('starts directly in English when no preference is saved', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page.getByTestId('locale-en-US')).toHaveAttribute('aria-pressed', 'true');
  });
});

test('ships a PNG-backed manifest and an offline-capable service worker', async ({
  page,
  request,
}) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as {
    icons?: readonly { src?: string; type?: string }[];
  };
  expect(manifest.icons?.some((icon) => icon.type === 'image/png' && icon.src)).toBe(true);

  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
  const persistedCareer = await createRepresentativeCareer(page, 'en-US', 'Offline Saturday');
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker?.getRegistration();
          return registration?.active?.state;
        }),
      { timeout: 15_000 },
    )
    .toBe('activated');

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller)))
    .toBe(true);
  await expect(page.getByRole('heading', { level: 1, name: 'Offline Saturday' })).toBeVisible();

  await page.context().setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Offline Saturday' })).toBeVisible();
    await expect(page.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'PLAN_ACTIONS');
    await expect.poll(async () => (await readActiveCareer(page))?.id).toBe(persistedCareer.id);
  } finally {
    await page.context().setOffline(false);
  }
});
