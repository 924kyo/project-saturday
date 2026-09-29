import { expect, test, type Page } from '@playwright/test';
import {
  localeMessages,
  type SupportedLocale,
} from '../packages/game-content/src/locales/index.js';

import { readIndexedDbValue } from './support/indexed-db';

interface PositionEnvelope {
  readonly saveVersion: 3;
  readonly checksum: string;
  readonly payload: {
    readonly model: 'position_alpha_session_wire_v3';
    readonly session: {
      readonly revision: number;
      readonly player: { readonly displayName: string; readonly positionId: string };
      readonly world: { readonly programRecords: readonly unknown[] };
      readonly skills: { readonly breakthroughGauge: number };
      readonly gameDay: { readonly type: string };
    };
  };
}

async function readPositionEnvelope(page: Page): Promise<PositionEnvelope | undefined> {
  return readIndexedDbValue<PositionEnvelope>(page, 'currentCareer', 'position-alpha-active');
}

test.describe('M7 added-position production shell', () => {
  for (const locale of ['ko-KR', 'en-US'] as const satisfies readonly SupportedLocale[]) {
    for (const positionId of ['position_qb', 'position_rb', 'position_cb'] as const) {
      test(`creates, plays, saves, reloads, and explains a ${positionId} career in ${locale}`, async ({
        page,
      }) => {
        const messages = localeMessages[locale];
        await page.goto('/');
        await page.getByTestId(`locale-${locale}`).click();
        await page.getByTestId(`position-select-${positionId}`).click();
        await expect(page.getByTestId('position-alpha-creation')).toBeVisible();
        await page.getByTestId('position-alpha-name').fill(`M7 ${locale} ${positionId}`);
        await page.getByText(messages['creation.personalities.disciplined.name']).click();
        await page.getByText(messages['creation.personalities.leader.name']).click();
        await page.getByRole('button', { name: messages['m7Ui.creation.submit'] }).click();

        await expect(page.getByTestId('position-alpha-career')).toBeVisible();
        await expect
          .poll(async () => (await readPositionEnvelope(page))?.payload.session.player.positionId)
          .toBe(positionId);
        const created = await readPositionEnvelope(page);
        expect(created).toMatchObject({ saveVersion: 3 });
        expect(created?.checksum).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
        expect(created?.payload.session.world.programRecords).toHaveLength(32);

        await page.getByRole('button', { name: messages['m7Ui.nav.week'] }).click();
        const planner = page.getByTestId('position-focus-planner');
        for (const [index, id] of [
          'action_film_study',
          'action_recovery',
          'action_study_hall',
        ].entries())
          await planner.getByRole('combobox').nth(index).selectOption(id);
        await planner.getByRole('button', { name: messages['career.week.commit'] }).click();
        await expect
          .poll(async () => (await readPositionEnvelope(page))?.payload.session.revision ?? -1)
          .toBeGreaterThan(0);
        await expect(page.getByTestId('position-game-day')).toHaveAttribute(
          'data-phase',
          'PRACTICE_REVIEW',
        );
        for (let step = 0; step < 50; step += 1) {
          const before = await readPositionEnvelope(page);
          if (before?.payload.session.gameDay.type === 'IDLE') break;
          const panel = page.getByTestId('position-game-day');
          await panel.getByRole('button').first().click();
          await expect
            .poll(async () => (await readPositionEnvelope(page))?.payload.session.revision ?? -1)
            .toBeGreaterThan(before!.payload.session.revision);
        }
        expect((await readPositionEnvelope(page))?.payload.session.gameDay.type).toBe('IDLE');
        const played = await readPositionEnvelope(page);

        await page.reload();
        await expect(page.getByTestId('position-alpha-career')).toContainText(
          `M7 ${locale} ${positionId}`,
        );
        expect(await readPositionEnvelope(page)).toEqual(played);
        await page.getByRole('button', { name: messages['m7Ui.nav.skills'] }).click();
        await expect(
          page.getByRole('progressbar', { name: messages['career.skills.gauge.title'] }),
        ).toBeVisible();
        await expect(page.getByText(messages['m7Direct.skills.help'])).toBeVisible();
      });
    }
  }

  test('contains the purpose shell at a true 320 px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto('/');
    await page.getByTestId('locale-ko-KR').click();
    await page.getByTestId('position-select-position_rb').click();
    await page.getByTestId('position-alpha-name').fill('Narrow RB');
    await page
      .getByText(localeMessages['ko-KR']['creation.personalities.disciplined.name'])
      .click();
    await page.getByText(localeMessages['ko-KR']['creation.personalities.leader.name']).click();
    await page
      .getByRole('button', { name: localeMessages['ko-KR']['m7Ui.creation.submit'] })
      .click();
    await expect(page.getByTestId('position-alpha-career')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole('navigation', { name: localeMessages['ko-KR']['m7Ui.nav.label'] }),
    ).toBeVisible();
    for (const key of [
      'm7Ui.nav.week',
      'm7Ui.nav.team',
      'm7Ui.nav.skills',
      'm7Ui.nav.player',
    ] as const) {
      await page
        .getByRole('navigation')
        .getByRole('button', { name: localeMessages['ko-KR'][key] })
        .click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBeLessThanOrEqual(1);
    }
  });
});
