import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { localeMessages } from '../packages/game-content/dist/locales/index.js';

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
  await expect(page.getByTestId('locale-ko-KR')).toBeVisible({ timeout: 20_000 });
  assert.equal(new URL(page.url()).hostname, 'tauri.localhost');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('locale-ko-KR')).toBeVisible();
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
          const get = tx.objectStore('currentCareer').get('position-alpha-active');
          get.onsuccess = () => resolveValue(get.result?.value);
          get.onerror = () => reject(get.error);
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

async function create(locale, position, name) {
  const messages = localeMessages[locale];
  await page.getByTestId(`locale-${locale}`).click();
  await page.getByTestId(`position-select-${position}`).click();
  await page.getByTestId('position-alpha-name').fill(name);
  await page.getByText(messages['creation.personalities.disciplined.name']).click();
  await page.getByText(messages['creation.personalities.leader.name']).click();
  await page.getByTestId('position-alpha-program').selectOption('program_ember_peak_polytechnic');
  await page.getByRole('button', { name: messages['m7Ui.creation.submit'] }).click();
  await expect(page.getByTestId('position-alpha-career')).toBeVisible();
  await expect.poll(readCurrent).toBeTruthy();
  report.checks.push(`Create ${position} ${locale} using production UI`);
}

try {
  await launch();
  await create('ko-KR', 'position_rb', '데스크톱 검증 선수');
  const messages = localeMessages['ko-KR'];
  const nav = page.getByRole('navigation', { name: messages['m7Ui.nav.label'] });
  for (const destination of ['home', 'week', 'team', 'skills', 'player']) {
    await nav.getByRole('button', { name: messages[`m7Ui.nav.${destination}`] }).click();
    await expect(page.getByTestId('position-alpha-career')).toBeVisible();
  }
  report.checks.push('Home/Week/Team/Skills/Player navigation');
  await nav.getByRole('button', { name: messages['m7Ui.nav.week'] }).click();
  let resolvedSnap = false;
  let completedGame = false;
  for (let command = 0; command < 100 && !completedGame; command += 1) {
    const before = await readCurrent();
    const game = page.getByTestId('position-game-day');
    const offers = page.getByRole('region', {
      name: messages['m7Ui.skills.breakthrough'],
      exact: true,
    });
    const event = page.getByTestId('position-pending-event');
    const nil = page.getByTestId('position-off-field');
    const planner = page.getByTestId('position-focus-planner');
    if (await game.isVisible()) {
      console.log(`Desktop game step: ${before.payload.session.gameDay.type}`);
      if (before.payload.session.gameDay.type === 'ACTIVE_SNAP') resolvedSnap = true;
      if (before.payload.session.gameDay.type === 'POST_GAME' && resolvedSnap) {
        completedGame = true;
        await page.screenshot({ path: join(output, 'ko-game-day.png'), fullPage: true });
        break;
      }
      await game.getByRole('button').first().click();
    } else if (await offers.isVisible()) await offers.getByRole('button').first().click();
    else if (await event.isVisible()) await event.getByRole('button').first().click();
    else if (await nil.getByRole('button').count()) await nil.getByRole('button').first().click();
    else if (await planner.isVisible()) {
      for (const [index, id] of [
        'action_rb_vision_tracks',
        'action_rb_third_down_work',
        command % 2 === 0 ? 'action_recovery' : 'action_study_hall',
      ].entries()) {
        await planner.getByRole('combobox').nth(index).selectOption(id);
      }
      await planner.getByRole('button', { name: messages['career.week.commit'] }).click();
    } else {
      const season = page.getByTestId('position-season-flow');
      if (await season.getByRole('radio').count()) await season.getByRole('radio').first().check();
      await season.getByRole('button').first().click();
    }
    await expect
      .poll(async () => (await readCurrent())?.payload.session.revision ?? -1)
      .toBeGreaterThan(before.payload.session.revision);
  }
  assert.ok(completedGame && resolvedSnap, 'A real key-snap game completes');
  report.checks.push('Real RB key snaps and post-game in offline packaged app');
  const saved = await readCurrent();
  await writeFile(join(output, 'before-relaunch.json'), JSON.stringify(saved, null, 2));
  await stop();
  await launch();
  await expect(page.getByTestId('position-alpha-career')).toBeVisible();
  assert.deepEqual(
    await readCurrent(),
    saved,
    'Entire envelope and RNG unchanged after process exit',
  );
  report.checks.push('Exact full save envelope survives process exit and offline relaunch');
  await page.getByTestId('hub-open').click();
  await expect(page.getByTestId('career-hub')).toBeVisible();
  await page.getByTestId('hub-continue').click();
  await expect(page.getByTestId('position-alpha-career')).toBeVisible();
  await page.getByTestId('hub-open').click();
  await page.getByTestId('hub-new').click();
  await page.getByTestId('hub-cancel').click();
  assert.deepEqual(await readCurrent(), saved);
  await page.getByTestId('hub-new').click();
  await page.getByTestId('hub-confirm').click();
  await expect(page.getByTestId('position-select-position_rb')).toBeVisible();
  await create('en-US', 'position_cb', 'Desktop Second Career');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await page.screenshot({ path: join(output, 'en-second-career.png'), fullPage: true });
  await page.getByTestId('hub-open').click();
  await page.getByTestId('hub-abandon').click();
  await page.getByTestId('hub-confirm').click();
  await expect.poll(readCurrent).toBeUndefined();
  report.checks.push('Career Hub Continue, cancel, New Career, en-US CB creation and Abandon');
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
