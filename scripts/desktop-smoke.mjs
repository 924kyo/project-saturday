import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

/**
 * Packaged desktop smoke for the Career VNext app: offline launch, creation, the four week tabs, a
 * full Saturday, exact save survival across process exit, and a second career in the other locale.
 * Selectors are structural (locale-agnostic), like the browser journey driver in e2e/support.
 */
// Test-only WebView2/CDP environment; never enable debugging in the shipping wrapper.
const executable = resolve(
  'apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/project-saturday.exe',
);
const output = resolve('test-results/desktop-snapshot');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(output, 'webview-profile-'));
const port = 19375;
let child;
let browser;
let page;
const errors = [];
const report = { executable, profile, checks: [], errors };
const primary = () => page.locator('.s2-actionbar .s2-btn').last();

async function launch() {
  child = spawn(executable, [], {
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --proxy-server=http://127.0.0.1:9 --proxy-bypass-list=<-loopback>`,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
  });
  child.on('error', (error) => errors.push(String(error)));
  child.stderr.on('data', (data) => console.error(data.toString()));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Desktop exited: ${child.exitCode}`);
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1000 });
      break;
    } catch {
      await delay(250);
    }
  }
  assert.ok(browser, 'WebView2 exposes the test-only connection');
  const context = browser.contexts()[0];
  await expect.poll(() => context.pages().length).toBeGreaterThan(0);
  page = context.pages()[0];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.locator('.s2-shell main')).toBeVisible({ timeout: 20_000 });
  assert.equal(new URL(page.url()).hostname, 'tauri.localhost');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.s2-shell main')).toBeVisible({ timeout: 20_000 });
  report.checks.push('Packaged offline launch/reload, no Vite server');
}

async function stop() {
  if (browser) await browser.close().catch(() => {});
  browser = undefined;
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  child = undefined;
}

async function readCurrent() {
  return page.evaluate(
    () =>
      new Promise((resolveValue, reject) => {
        const request = globalThis.indexedDB.open('project-saturday');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('currentCareer', 'readonly');
          const get = tx.objectStore('currentCareer').get('career-vnext');
          get.onsuccess = () => resolveValue(get.result?.value);
          get.onerror = () => reject(get.error);
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

async function useLocale(locale) {
  if ((await page.locator('html').getAttribute('lang')) !== locale)
    await page.locator('.s2-topbar__actions .s2-chipbtn').first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
}

async function create(locale, positionIndex, name) {
  await useLocale(locale);
  await expect(primary()).toBeVisible({ timeout: 20_000 });
  await page.locator('.s2-tiles').first().locator('.s2-tile').nth(positionIndex).click();
  await primary().click();
  await page.locator('[role=checkbox]:not([disabled])').first().click();
  await page.locator('[role=checkbox][aria-checked=false]:not([disabled])').first().click();
  await primary().click();
  await page.locator('#s2-name').fill(name);
  await primary().click();
  await expect(page.locator('.s2-offer')).toHaveCount(4);
  await page.locator('.s2-offer').last().click();
  await primary().click();
  await expect(page.locator('.s2-nameplate')).toBeVisible({ timeout: 10_000 });
  await expect.poll(readCurrent).toBeTruthy();
  report.checks.push(`Create position #${positionIndex} in ${locale} through the production UI`);
}

async function playWeek() {
  await page.locator('.s2-panel__head .s2-chipbtn').first().click();
  await primary().click();
  await expect(page.locator('.s2-grade')).toBeVisible();
  await primary().click();
  for (let guard = 0; guard < 4; guard += 1) {
    await expect(
      page.locator('#s2-pregame, #s2-breakthrough, #s2-event, #s2-injury').first(),
    ).toBeVisible();
    if ((await page.locator('#s2-pregame').count()) > 0) break;
    const scene = (await page.locator('#s2-breakthrough').count())
      ? '#s2-breakthrough'
      : (await page.locator('#s2-event').count())
        ? '#s2-event'
        : '#s2-injury';
    const choice = page.locator('.s2-choice, .s2-cardgrid--offer button.s2-cardbtn');
    if (await choice.count()) await choice.first().click();
    await expect(primary()).toBeEnabled();
    await primary().click();
    await expect(page.locator(scene)).toHaveCount(0);
  }
  await primary().click();
  let decisions = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    await expect(page.locator('.s2-choice, #s2-final').first()).toBeVisible();
    if (await page.locator('#s2-final').count()) break;
    await page.locator('.s2-choice').first().click();
    await expect(page.locator('.s2-lowerthird')).toBeVisible();
    decisions += 1;
    await primary().click();
    await expect(page.locator('.s2-lowerthird')).toHaveCount(0);
  }
  await page.screenshot({ path: join(output, 'ko-final.png'), fullPage: true });
  await primary().click();
  await expect(page.locator('.s2-grade')).toBeVisible();
  await primary().click();
  await expect(page.locator('.s2-focusgrid')).toBeVisible();
  return decisions;
}

try {
  await launch();
  await create('ko-KR', 1, '데스크톱 검증 선수');
  for (const [index, id] of [
    [1, '#s2-build'],
    [2, '#s2-team'],
    [3, '#s2-profile'],
  ]) {
    await page.locator('.s2-tab').nth(index).click();
    await expect(page.locator(id)).toBeVisible();
  }
  await page.locator('.s2-tab').first().click();
  report.checks.push('This week / Build / Team / Profile tabs');
  const decisions = await playWeek();
  assert.ok(decisions >= 2, 'A Saturday offers at least two decisions');
  report.checks.push(`A full Saturday with ${decisions} decisions in the offline packaged app`);
  const saved = await readCurrent();
  await writeFile(join(output, 'before-relaunch.json'), JSON.stringify(saved, null, 2));
  await stop();
  await launch();
  await expect(page.locator('.s2-focusgrid')).toBeVisible();
  assert.deepEqual(await readCurrent(), saved, 'Exact save envelope unchanged after process exit');
  report.checks.push('Exact save envelope survives process exit and offline relaunch');
  // New career: cancel keeps the save, confirm clears it.
  const topbar = page.locator('.s2-topbar__actions .s2-chipbtn');
  await topbar.last().click();
  await page.locator('[role=alertdialog] .s2-btn--ghost').first().click();
  assert.deepEqual(await readCurrent(), saved);
  await topbar.last().click();
  await page.locator('[role=alertdialog] .s2-btn--ghost').last().click();
  await expect.poll(readCurrent).toBeUndefined();
  await create('en-US', 3, 'Desktop Second Career');
  await page.screenshot({ path: join(output, 'en-second-career.png'), fullPage: true });
  report.checks.push('New career cancel/confirm and an en-US CB creation');
  assert.deepEqual(errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = String(error);
  if (page && !page.isClosed()) {
    await writeFile(join(output, 'failure-body.txt'), await page.locator('body').innerText()).catch(
      () => {},
    );
    await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await stop();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
