import { expect, type Page } from '@playwright/test';

import { primaryAction } from './slice';

/**
 * Release-boundary career driver: plays the real UI one command at a time. Every command waits for
 * the saved revision to advance, so the driver never races the save that follows a click.
 */
export async function savedRevision(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolveValue, reject) => {
        const request = globalThis.indexedDB.open('project-saturday');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('currentCareer', 'readonly');
          const get = tx.objectStore('currentCareer').get('career-vnext');
          get.onsuccess = () => {
            const envelope = get.result?.value as { json?: string } | undefined;
            resolveValue(
              envelope?.json === undefined
                ? -1
                : (JSON.parse(envelope.json) as { revision: number }).revision,
            );
          };
          get.onerror = () => reject(get.error);
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

async function visible(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
}

export type CareerStep =
  'plan' | 'offseason' | 'choice' | 'snap' | 'continue' | 'review' | 'complete';

/** Performs exactly one saved command and reports which screen it acted on. */
export async function step(page: Page): Promise<CareerStep> {
  await expect(page.locator('main[aria-busy=false]')).toBeVisible();
  if (await visible(page, '#s2-complete')) return 'complete';
  const before = await savedRevision(page);
  let kind: CareerStep;
  if (await visible(page, '.s2-focusgrid')) {
    await page.locator('.s2-panel__head .s2-chipbtn').first().click();
    kind = 'plan';
  } else if (await visible(page, '#s2-offseason')) {
    // Take the first transfer so every journey covers a program change.
    await page.locator('.s2-offer').nth(1).click();
    kind = 'offseason';
  } else if (await visible(page, '.s2-choice, .s2-cardgrid--offer button.s2-cardbtn')) {
    kind = (await visible(page, '.s2-board')) ? 'snap' : 'choice';
    await page.locator('.s2-choice, .s2-cardgrid--offer button.s2-cardbtn').first().click();
    await expect.poll(() => savedRevision(page)).toBeGreaterThan(before);
    return kind;
  } else {
    kind = (await visible(page, '#s2-review')) ? 'review' : 'continue';
  }
  await expect(primaryAction(page)).toBeEnabled();
  await primaryAction(page).click();
  await expect.poll(() => savedRevision(page), { timeout: 15_000 }).toBeGreaterThan(before);
  return kind;
}
