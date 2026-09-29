import { expect, test, type Page } from '@playwright/test';
import {
  localeMessages,
  type SupportedLocale,
} from '../packages/game-content/src/locales/index.js';
import {
  createRepresentativeRecruit,
  expectNoHorizontalOverflow,
  expectTouchTarget,
} from './support/career';
import { readIndexedDbValue } from './support/indexed-db';

async function createAthlete(
  page: Page,
  locale: SupportedLocale,
  position: string,
  name: string,
): Promise<void> {
  await page.getByTestId(`position-select-${position}`).click();
  if (position === 'position_wr') {
    await createRepresentativeRecruit(page, locale, name);
    return;
  }
  await page.getByTestId('position-alpha-name').fill(name);
  await page.getByText(localeMessages[locale]['creation.personalities.disciplined.name']).click();
  await page.getByText(localeMessages[locale]['creation.personalities.leader.name']).click();
  await page.getByRole('button', { name: localeMessages[locale]['m7Ui.creation.submit'] }).click();
  await expect(page.getByTestId('position-alpha-career')).toBeVisible();
}

async function failNextRetirement(page: Page): Promise<void> {
  await page.evaluate(() => {
    const clear = IDBObjectStore.prototype.clear;
    IDBObjectStore.prototype.clear = function (this: IDBObjectStore): IDBRequest<undefined> {
      if (this.name === 'autosaveSnapshots') {
        IDBObjectStore.prototype.clear = clear;
        throw new DOMException('Intentional retirement failure', 'AbortError');
      }
      return clear.call(this);
    };
  });
}

for (const locale of ['ko-KR', 'en-US'] as const) {
  for (const position of ['position_wr', 'position_qb', 'position_rb', 'position_cb']) {
    test(`Career Hub ${position} ${locale}: cancel, retry, offline, new run, reset`, async ({
      page,
      isMobile,
    }) => {
      test.setTimeout(90_000);
      if (isMobile) await page.setViewportSize({ width: 320, height: 760 });
      await page.goto('/');
      await page.getByTestId(`locale-${locale}`).click();
      await createAthlete(page, locale, position, `Hub ${position}`);
      const key = position === 'position_wr' ? 'active' : 'position-alpha-active';
      const before = await readIndexedDbValue(page, 'currentCareer', key);
      expect(before).toBeDefined();
      await page.getByTestId('hub-open').click();
      await expect(page.getByTestId('career-hub')).toContainText(
        localeMessages[locale]['hub.saved'],
      );
      await expectNoHorizontalOverflow(page);
      for (const id of ['hub-new', 'hub-abandon', 'hub-continue', 'hub-reset']) {
        await expectTouchTarget(page.getByTestId(id));
      }
      await page.getByTestId('hub-new').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#hub-confirm-title')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('hub-cancel')).toBeFocused();
      await page.keyboard.press('Enter');
      expect(await readIndexedDbValue(page, 'currentCareer', key)).toEqual(before);
      await page.getByTestId('hub-new').click();
      await expect(page.getByTestId('hub-confirmation')).toBeVisible();
      await failNextRetirement(page);
      await page.getByTestId('hub-confirm').click();
      await expect(page.getByTestId('hub-error')).toContainText(
        localeMessages[locale]['hub.failed'],
      );
      expect(await readIndexedDbValue(page, 'currentCareer', key)).toEqual(before);
      await page.getByTestId('hub-confirm').click();
      await expect(page.getByTestId(`position-select-${position}`)).toBeVisible();
      expect(await readIndexedDbValue(page, 'currentCareer', key)).toBeUndefined();
      // Prompt-mode workers take control on a subsequent navigation after installation.
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('creation-form')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), {
          timeout: 15_000,
        })
        .toBe(true);
      await page.context().setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('creation-form')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await createAthlete(page, locale, 'position_rb', 'Next Hub Athlete');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('position-alpha-career')).toContainText('Next Hub Athlete');
      await page.getByTestId('hub-open').click();
      await page.getByTestId('hub-reset').click();
      await page.getByTestId('hub-confirm').click();
      await expect(page.getByTestId('hub-confirmation')).toContainText(
        localeMessages[locale]['hub.resetSecond'],
      );
      expect(
        await readIndexedDbValue(page, 'currentCareer', 'position-alpha-active'),
      ).toBeDefined();
      await expectNoHorizontalOverflow(page);
      await page.getByTestId('hub-confirm').click();
      await expect(page.getByTestId('hub-confirmation')).toHaveCount(0);
      expect(
        await readIndexedDbValue(page, 'currentCareer', 'position-alpha-active'),
      ).toBeUndefined();
      expect(await readIndexedDbValue(page, 'settings', 'active-career-kind')).toBe('NONE');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('creation-form')).toBeVisible();
      await page.context().setOffline(false);
    });
  }
}
