// Captures the main screens of a fresh career for visual review (dev tool, not a test).
// Usage: node scripts/capture-screens.mjs [baseUrl] [outDir] [locale] [positionIndex 0-5]
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'test-results/screens';
const locale = process.argv[4] ?? 'ko-KR';
const positionIndex = Number(process.argv[5] ?? 0);
mkdirSync(out, { recursive: true });

const viewports = {
  desktop: { width: 1366, height: 860 },
  phone: { width: 390, height: 844 },
};

const browser = await chromium.launch();
for (const [label, viewport] of Object.entries(viewports)) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const shot = async (name) => {
    await page.waitForTimeout(700);
    await page.screenshot({
      path: path.join(out, `${label}-${name}.png`),
      fullPage: name !== 'snap',
    });
  };
  const primary = () => page.locator('.s2-actionbar .s2-btn').last();
  await page.goto(base);
  await primary().waitFor({ timeout: 20_000 });
  if ((await page.locator('html').getAttribute('lang')) !== locale)
    await page.locator('.s2-topbar__actions .s2-chipbtn').first().click();
  await shot('create');
  // Creation starts empty: pick a position, a style, a background and two traits.
  await page.locator('.s2-tile--position').nth(positionIndex).click();
  await page.locator('fieldset').nth(1).locator('.s2-tile').first().click();
  await shot('create-role');
  await primary().click();
  await page.locator('fieldset').first().locator('.s2-tile').first().click();
  await page.locator('[role=checkbox]:not([disabled])').first().click();
  await page.locator('[role=checkbox][aria-checked=false]:not([disabled])').first().click();
  await primary().click();
  await page.locator('.s2-namefield .s2-btn').click();
  await shot('create-look');
  await primary().click();
  await page.locator('.s2-offer').first().waitFor();
  await page.locator('.s2-offer').first().click();
  await shot('recruit');
  await primary().click();
  await page.locator('.s2-focusgroups').waitFor({ timeout: 10_000 });
  await page.locator('.s2-panel__head .s2-chipbtn').first().click();
  await shot('week');
  for (const [index, tab] of ['build', 'team', 'profile'].entries()) {
    await page
      .locator('[role=tab]')
      .nth(index + 1)
      .click();
    await shot(`tab-${tab}`);
  }
  await page.locator('[role=tab]').nth(0).click();
  await page.locator('.s2-panel__head .s2-chipbtn').first().click();
  await primary().click();
  await page.locator('.s2-grade').waitFor();
  await shot('report');
  await primary().click();
  for (let guard = 0; guard < 8; guard += 1) {
    const screen = page.locator('#s2-pregame, #s2-event, #s2-nil, #s2-injury, #s2-breakthrough');
    await screen.first().waitFor();
    if ((await page.locator('#s2-pregame').count()) > 0) break;
    await shot(`scene-${guard}`);
    const choice = page.locator('.s2-choice, .s2-cardgrid--offer button.s2-cardbtn');
    if ((await choice.count()) > 0 && (await page.locator('#s2-nil').count()) === 0)
      await choice.first().click();
    await page.waitForTimeout(400);
    await primary().click();
    await page.waitForTimeout(600);
  }
  await page.locator('#s2-pregame').waitFor();
  await shot('pregame');
  await primary().click();
  let snap = 0;
  for (let guard = 0; guard < 12; guard += 1) {
    await page.locator('.s2-choice, #s2-final').first().waitFor();
    if ((await page.locator('#s2-final').count()) > 0) break;
    await shot(`snap-${snap}`);
    await page.locator('.s2-choice').first().click();
    await page.locator('.s2-lowerthird').waitFor();
    await page.waitForTimeout(1800);
    await shot(`result-${snap}`);
    snap += 1;
    await primary().click();
  }
  await shot('final');
  await primary().click();
  await page.locator('.s2-grade').waitFor();
  await shot('postgame');
  await context.close();
}
await browser.close();
console.log(`saved to ${out}`);
