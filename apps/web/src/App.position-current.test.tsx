import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { commitPositionAlphaFocusPlanV2 } from '@project-saturday/game-core';
import { localeMessages, type SupportedLocale } from '@project-saturday/game-content/locales';
import { App } from './App';
import { createAppI18n } from './i18n/i18n';
import {
  CURRENT_POSITION_CASES,
  createCurrentPositionWeekFixture,
} from './test/position-alpha-current-fixture';
import {
  MemoryStorageAdapter,
  PositionAlphaPersistenceV2,
  PositionAlphaPersistenceV3,
  decodePositionAlphaEnvelopeV3,
  POSITION_ALPHA_STORAGE_ID,
  type StorageAdapter,
} from './storage';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

class RecordingStorage extends MemoryStorageAdapter {
  public failNextBatch = false;
  public failedEntries: Parameters<StorageAdapter['putMany']>[0] | null = null;
  public writes = 0;
  public override putMany(...args: Parameters<StorageAdapter['putMany']>): Promise<void> {
    this.writes += 1;
    if (this.failNextBatch) {
      this.failNextBatch = false;
      this.failedEntries = args[0];
      return Promise.reject(new Error('Injected current write failure'));
    }
    return super.putMany(...args);
  }
}

async function openWeek(storage: StorageAdapter, locale: SupportedLocale) {
  const i18n = await createAppI18n(locale);
  render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App storage={storage} />
      </I18nextProvider>
    </StrictMode>,
  );
  await screen.findByTestId('position-alpha-career');
  await userEvent
    .setup()
    .click(
      within(screen.getByRole('navigation', { name: i18n.t('m7Ui.nav.label') })).getByRole(
        'button',
        { name: i18n.t('m7Ui.nav.week') },
      ),
    );
}

describe.each(['ko-KR', 'en-US'] as const)('current App publication %s', (locale) => {
  it.each(CURRENT_POSITION_CASES)(
    '%s retries failed initial creation without rerolling or accepting a changed draft',
    async (positionId) => {
      const storage = new RecordingStorage();
      const seed = vi.fn(() => 'initial-current-save-retry');
      const i18n = await createAppI18n(locale);
      render(
        <I18nextProvider i18n={i18n}>
          <App storage={storage} careerSeedFactory={seed} />
        </I18nextProvider>,
      );
      const user = userEvent.setup();
      await user.click(await screen.findByTestId(`position-select-${positionId}`));
      await user.type(screen.getByTestId('position-alpha-name'), 'Pending athlete');
      await user.click(screen.getByText(i18n.t('creation.personalities.disciplined.name')));
      await user.click(screen.getByText(i18n.t('creation.personalities.leader.name')));
      storage.failNextBatch = true;
      await user.click(screen.getByRole('button', { name: i18n.t('m7Ui.creation.submit') }));
      const warning = await screen.findByTestId('position-creation-save-pending');
      await waitFor(() => expect(warning).toHaveFocus());
      expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toBeUndefined();
      expect(screen.queryByTestId('position-alpha-career')).not.toBeInTheDocument();
      expect(screen.getByTestId('position-alpha-name')).toBeDisabled();
      expect(screen.getByTestId('position-select-position_wr')).toBeDisabled();
      expect(screen.getByRole('button', { name: i18n.t('m7Ui.creation.submit') })).toBeDisabled();
      const failed = storage.failedEntries!.find(
        (entry) => entry.storeName === 'currentCareer' && entry.id === POSITION_ALPHA_STORAGE_ID,
      )!.value as { readonly payload: unknown; readonly checksum: string };
      await user.click(within(warning).getByRole('button', { name: i18n.t('career.save.retry') }));
      expect(await screen.findByTestId('position-alpha-career')).toHaveTextContent(
        'Pending athlete',
      );
      const saved = await storage.get<{ payload: unknown; checksum: string }>(
        'currentCareer',
        POSITION_ALPHA_STORAGE_ID,
      );
      expect(saved?.payload).toEqual(failed.payload);
      // Retry timestamps legitimately change the signed envelope, never the saved athlete/RNG.
      expect(decodePositionAlphaEnvelopeV3(saved)).not.toBeNull();
      expect(seed).toHaveBeenCalledTimes(1);
    },
  );

  it.each(CURRENT_POSITION_CASES)(
    '%s saves only explicit direct phases and reloads their exact evidence',
    async (positionId, archetypeId) => {
      const fixture = createCurrentPositionWeekFixture(positionId, archetypeId);
      const seen = new Set<string>();
      const user = userEvent.setup();
      for (const [index, source] of fixture.boundaries.entries()) {
        const day = source.gameDay;
        if (day.type === 'IDLE' || seen.has(day.type)) continue;
        seen.add(day.type);
        const expected = fixture.boundaries[index + 1]!;
        const storage = new RecordingStorage();
        const persistence = new PositionAlphaPersistenceV3(storage);
        // Preserve literal v2 input; loading must not eagerly rewrite it.
        expect((await new PositionAlphaPersistenceV2(storage).saveSession(source, true)).ok).toBe(
          true,
        );
        const writes = storage.writes;
        await openWeek(storage, locale);
        const panel = screen.getByTestId('position-game-day');
        expect(panel).toHaveAttribute('data-phase', day.type);
        expect(storage.writes).toBe(writes);
        const buttons = within(panel).getAllByRole('button');
        // The bounded fixture chose each first actual decision and the first injury option (rest).
        await user.click(buttons[0]!);
        await waitFor(async () => {
          const loaded = await persistence.loadSession();
          expect(loaded.ok && loaded.session).toEqual(expected);
        });
        expect(storage.writes).toBe(writes + 1);
        const envelope = await storage.get<{ saveVersion: number }>(
          'currentCareer',
          POSITION_ALPHA_STORAGE_ID,
        );
        expect(envelope?.saveVersion).toBe(3);
        cleanup();
        await openWeek(storage, locale);
        if (expected.gameDay.type !== 'IDLE')
          expect(screen.getByTestId('position-game-day')).toHaveAttribute(
            'data-phase',
            expected.gameDay.type,
          );
        else expect(screen.queryByTestId('position-game-day')).not.toBeInTheDocument();
        expect(storage.writes).toBe(writes + 1);
        cleanup();
      }
      expect(seen.has('ACTIVE_SNAP')).toBe(true);
      expect(seen.has('POST_GAME')).toBe(true);
    },
  );

  it.each(CURRENT_POSITION_CASES)(
    '%s keeps the focus source visible on failure and retries the identical session once',
    async (positionId, archetypeId) => {
      const fixture = createCurrentPositionWeekFixture(positionId, archetypeId);
      const storage = new RecordingStorage();
      const persistence = new PositionAlphaPersistenceV3(storage);
      expect((await persistence.saveSession(fixture.initial, true)).ok).toBe(true);
      const ids = ['action_film_study', 'action_recovery', 'action_study_hall'];
      const expected = commitPositionAlphaFocusPlanV2(fixture.initial, ids, fixture.mechanics);
      expect(expected.ok).toBe(true);
      await openWeek(storage, locale);
      const user = userEvent.setup();
      const planner = screen.getByTestId('position-focus-planner');
      for (const [index, select] of within(planner).getAllByRole('combobox').entries())
        await user.selectOptions(select, ids[index]!);
      storage.failNextBatch = true;
      const writes = storage.writes;
      const commit = within(planner).getByRole('button', {
        name: localeMessages[locale]['career.week.commit'],
      });
      act(() => {
        fireEvent.click(commit);
        fireEvent.click(commit);
      });
      const warning = await screen.findByTestId('position-alpha-save-failure');
      expect(screen.getByTestId('position-focus-planner')).toBeVisible();
      expect(commit).toBeDisabled();
      const unchanged = await persistence.loadSession();
      expect(unchanged.ok && unchanged.session).toEqual(fixture.initial);
      expect(storage.writes).toBe(writes + 1);
      const retry = within(warning).getByRole('button', {
        name: localeMessages[locale]['career.save.retry'],
      });
      act(() => {
        fireEvent.click(retry);
        fireEvent.click(retry);
      });
      await screen.findByTestId('position-game-day');
      const saved = await persistence.loadSession();
      expect(saved.ok && saved.session).toEqual(expected.ok && expected.session);
      expect(storage.writes).toBe(writes + 2);
      expect(screen.queryByTestId('position-alpha-save-failure')).not.toBeInTheDocument();
    },
  );
});
