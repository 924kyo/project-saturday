import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  localeMessages,
  type SupportedLocale,
} from '../packages/game-content/src/locales/index.js';
import { readIndexedDbValue } from './support/indexed-db';

interface CurrentEnvelope {
  readonly saveVersion: 3;
  readonly checksum: string;
  readonly payload: {
    readonly model: 'position_alpha_session_wire_v3';
    readonly session: {
      readonly revision: number;
      readonly phase: { readonly type: string };
      readonly lifecycle: {
        readonly careerId: string;
        readonly activeSeasonIndex: number;
        readonly currentProgramId: string;
        readonly completedSeasons: readonly unknown[];
      };
      readonly gameDay: { readonly type: string };
    };
  };
}
const readCurrent = (page: Page) =>
  readIndexedDbValue<CurrentEnvelope>(page, 'currentCareer', 'position-alpha-active');
const lastObservedEnvelope = new WeakMap<Page, CurrentEnvelope>();

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus || page.isClosed()) return;
  const current =
    (await readCurrent(page).catch(() => undefined)) ?? lastObservedEnvelope.get(page);
  const path = testInfo.outputPath('last-current-envelope.json');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(current ?? null));
  await testInfo.attach('last-current-envelope', {
    path,
    contentType: 'application/json',
  });
});

async function openWeek(page: Page, locale: SupportedLocale) {
  await page
    .getByRole('navigation', { name: localeMessages[locale]['m7Ui.nav.label'] })
    .getByRole('button', { name: localeMessages[locale]['m7Ui.nav.week'] })
    .click();
}
async function failNextSnapshot(page: Page, storeName = 'autosaveSnapshots') {
  await page.evaluate((targetStore) => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ): IDBRequest<IDBValidKey> {
      if (this.name === targetStore) {
        IDBObjectStore.prototype.put = put;
        throw new DOMException('Intentional current career snapshot failure', 'AbortError');
      }
      return Reflect.apply(
        put,
        this,
        key === undefined ? [value] : [value, key],
      ) as IDBRequest<IDBValidKey>;
    };
  }, storeName);
}

for (const locale of ['ko-KR', 'en-US'] as const) {
  for (const position of ['position_qb', 'position_rb', 'position_cb'] as const) {
    test(`current ${position} ${locale}: two seasons, ${locale === 'ko-KR' ? 'Stay' : 'transfer'}, offline, retry and alumni`, async ({
      page,
    }, testInfo) => {
      // A complete two-season UI workflow, not a per-command performance allowance.
      // The measured QB baseline is 3.4 minutes; snap counts and browser scheduling vary.
      test.setTimeout(480_000);
      const messages = localeMessages[locale];
      const name = `${locale} ${position} career`;
      const fixedUuid = `77777777-7777-4777-8777-${String(
        ['position_qb', 'position_rb', 'position_cb'].indexOf(position) +
          (locale === 'ko-KR' ? 1 : 4),
      ).padStart(12, '0')}`;
      await page.addInitScript((uuid) => {
        Object.defineProperty(Crypto.prototype, 'randomUUID', {
          configurable: true,
          value: () => uuid,
        });
      }, fixedUuid);
      testInfo.annotations.push({ type: 'career-seed', description: `career-seed:${fixedUuid}` });
      await page.goto('/');
      await page.getByTestId(`locale-${locale}`).click();
      await page.getByTestId(`position-select-${position}`).click();
      await page.getByTestId('position-alpha-name').fill(name);
      await page.getByText(messages['creation.personalities.disciplined.name']).click();
      await page.getByText(messages['creation.personalities.leader.name']).click();
      await page
        .getByTestId('position-alpha-program')
        .selectOption('program_ember_peak_polytechnic');
      await failNextSnapshot(page, 'currentCareer');
      await page.getByRole('button', { name: messages['m7Ui.creation.submit'] }).click();
      await expect(page.getByTestId('position-creation-save-pending')).toBeVisible();
      expect(await readCurrent(page)).toBeUndefined();
      await expect(page.getByTestId('position-alpha-name')).toBeDisabled();
      await page.getByRole('button', { name: messages['career.save.retry'] }).click();
      await expect(page.getByTestId('position-alpha-career')).toBeVisible();
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect
        .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
        .toBe(true);
      await page.context().setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openWeek(page, locale);
      let failedFocus = false;
      let offseasonChoices = 0;
      let maxEnvelopeBytes = 0;
      let selectedProgramId: string | null = null;
      const reloads = new Set<string>();
      const phases = new Set<string>();
      let complete: CurrentEnvelope | undefined;
      for (let command = 0; command < 900; command += 1) {
        const before = await readCurrent(page);
        expect(before?.saveVersion).toBe(3);
        lastObservedEnvelope.set(page, before!);
        expect(before?.payload.model).toBe('position_alpha_session_wire_v3');
        const envelopeBytes = Buffer.byteLength(JSON.stringify(before), 'utf8');
        expect(envelopeBytes).toBeLessThan(1_000_000);
        maxEnvelopeBytes = Math.max(maxEnvelopeBytes, envelopeBytes);
        const current = before!.payload.session;
        phases.add(current.phase.type);
        if (current.phase.type === 'CAREER_COMPLETE') {
          complete = before;
          break;
        }
        const reloadKey = `${current.lifecycle.activeSeasonIndex}/${current.gameDay.type}/${current.phase.type}`;
        if (!reloads.has(reloadKey)) {
          reloads.add(reloadKey);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await openWeek(page, locale);
          expect(await readCurrent(page)).toEqual(before);
        }
        const game = page.getByTestId('position-game-day');
        const offers = page.getByRole('region', {
          name: messages['m7Ui.skills.breakthrough'],
          exact: true,
        });
        const event = page.getByTestId('position-pending-event');
        const nil = page.getByTestId('position-off-field');
        const planner = page.getByTestId('position-focus-planner');
        const season = page.getByTestId('position-season-flow');
        if (await game.isVisible()) await game.getByRole('button').first().click();
        else if (await offers.isVisible()) await offers.getByRole('button').first().click();
        else if (await event.isVisible()) await event.getByRole('button').first().click();
        else if (await nil.getByRole('button').count())
          await nil.getByRole('button').first().click();
        else if (await planner.isVisible()) {
          for (const [index, id] of [
            'action_film_study',
            'action_recovery',
            'action_study_hall',
          ].entries())
            await planner.getByRole('combobox').nth(index).selectOption(id);
          if (!failedFocus) await failNextSnapshot(page);
          await planner.getByRole('button', { name: messages['career.week.commit'] }).click();
          if (!failedFocus) {
            await expect(page.getByTestId('position-alpha-save-failure')).toBeVisible();
            expect(await readCurrent(page)).toEqual(before);
            await expect(
              planner.getByRole('button', { name: messages['career.week.commit'] }),
            ).toBeDisabled();
            await page.getByRole('button', { name: messages['career.save.retry'] }).click();
            failedFocus = true;
          }
        } else {
          await expect(season).toBeVisible();
          const radios = season.getByRole('radio');
          if (await radios.count()) {
            const choice = radios.nth(locale === 'ko-KR' ? 0 : 1);
            selectedProgramId = await choice.inputValue();
            await choice.check();
            offseasonChoices += 1;
          }
          await season.getByRole('button').first().click();
        }
        await expect
          .poll(async () => (await readCurrent(page))?.payload.session.revision ?? -1)
          .toBeGreaterThan(current.revision);
        if (selectedProgramId !== null) {
          expect((await readCurrent(page))?.payload.session.lifecycle.currentProgramId).toBe(
            selectedProgramId,
          );
          await page.getByRole('button', { name: messages['m7Ui.nav.team'] }).click();
          await expect(page.getByText(messages['m7Direct.shell.roomHelp'])).toBeVisible();
          await openWeek(page, locale);
          selectedProgramId = null;
        }
      }
      expect(complete).toBeDefined();
      testInfo.annotations.push({
        type: 'peak-envelope-bytes',
        description: String(maxEnvelopeBytes),
      });
      expect(failedFocus).toBe(true);
      expect(offseasonChoices).toBe(1);
      expect(phases.has('POSTSEASON_PLANNING')).toBe(true);
      expect(complete!.payload.session.lifecycle.completedSeasons).toHaveLength(2);
      expect(complete!.payload.session.lifecycle.activeSeasonIndex).toBe(1);
      const archiveId = `position-alumni:${complete!.payload.session.lifecycle.careerId}`;
      const archive = await readIndexedDbValue(page, 'profile', archiveId);
      expect(archive).toEqual(complete);
      await page.getByRole('button', { name: messages['m7Direct.season.hub'] }).click();
      await expect(page.getByTestId('hub-alumni')).toContainText(name);
      const newCareerStartedAt = performance.now();
      await page.getByTestId('hub-new').click();
      await expect(page.getByTestId('position-select-position_qb')).toBeVisible();
      testInfo.annotations.push({
        type: 'completed-new-career-ms',
        description: String(Math.round(performance.now() - newCareerStartedAt)),
      });
      expect(await readIndexedDbValue(page, 'profile', archiveId)).toEqual(archive);
      expect(await readCurrent(page)).toBeUndefined();
    });
  }
}
