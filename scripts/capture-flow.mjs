// Plays a fresh career through the UI to later screens and captures them (dev tool, not a test).
// Usage: node scripts/capture-flow.mjs [baseUrl] [outDir] [locale] [positionIndex] [targets]
//   targets: comma list of selectors to capture when first seen, e.g. "#s2-mid-focus,#s2-offprogram"
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'test-results/flow';
const locale = process.argv[4] ?? 'en-US';
const positionIndex = Number(process.argv[5] ?? 0);
const targets = (process.argv[6] ?? '#s2-mid-focus,#s2-offprogram').split(',');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 })
).newPage();
const primary = () => page.locator('.s2-actionbar .s2-btn').last();
const visible = async (selector) => (await page.locator(selector).count()) > 0;
const settle = async () => {
  await page.locator('main[aria-busy=false]').waitFor();
  await page.waitForTimeout(250);
};

await page.goto(base);
await primary().waitFor({ timeout: 20_000 });
if ((await page.locator('html').getAttribute('lang')) !== locale)
  await page.locator('.s2-topbar__actions .s2-chipbtn').first().click();
await page.locator('.s2-tile--position').nth(positionIndex).click();
await page.locator('fieldset').nth(1).locator('.s2-tile').first().click();
await primary().click();
await page.locator('fieldset').first().locator('.s2-tile').first().click();
await page.locator('[role=checkbox]:not([disabled])').first().click();
await page.locator('[role=checkbox][aria-checked=false]:not([disabled])').first().click();
await primary().click();
await page.locator('.s2-namefield .s2-btn').click();
await primary().click();
await page.locator('.s2-offer').first().click();
await primary().click();

const pending = new Set(targets);
for (let guard = 0; guard < 3_000 && pending.size > 0; guard += 1) {
  await settle();
  for (const target of [...pending])
    if (await visible(target)) {
      await page.waitForTimeout(500);
      const name = target.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
      pending.delete(target);
      console.log('captured', target, 'at step', guard);
    }
  if (pending.size === 0) break;
  if (await visible('#s2-complete')) break;
  if (await visible('#s2-camp')) {
    await page.locator('section:has(#s2-camp) .s2-panel__head .s2-chipbtn').click();
    await primary().click();
  } else if (await visible('#s2-offseason')) {
    await page.locator('.s2-offer').first().click();
    await primary().click();
  } else if (await visible('.s2-focusgroups')) {
    await page.locator('.s2-panel__head .s2-chipbtn').first().click();
    await primary().click();
  } else if (await visible('.s2-choice, .s2-cardgrid--offer button.s2-cardbtn')) {
    await page.locator('.s2-choice, .s2-cardgrid--offer button.s2-cardbtn').first().click();
  } else if (await primary().isEnabled()) {
    await primary().click();
  } else {
    // A save is landing or the screen is still mounting.
    await page.waitForTimeout(300);
  }
}
console.log('not reached:', [...pending].join(', ') || 'none');
await browser.close();
