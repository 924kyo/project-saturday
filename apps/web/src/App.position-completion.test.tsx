import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { completePositionAlphaCareerV2 } from '@project-saturday/game-core';
import { App } from './App';
import { createAppI18n } from './i18n/i18n';
import { CURRENT_POSITION_CASES } from './test/position-alpha-current-fixture';
import { createCurrentPositionSeasonFixture } from './test/position-alpha-season-fixture';
import {
  CareerManagementPersistence,
  MemoryStorageAdapter,
  PositionAlphaPersistenceV2,
  PositionAlphaPersistenceV3,
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

class CompletionFailureStorage extends MemoryStorageAdapter {
  public failNextBatch = false;
  public override putMany(...args: Parameters<StorageAdapter['putMany']>): Promise<void> {
    if (this.failNextBatch) {
      this.failNextBatch = false;
      return Promise.reject(new Error('Injected completion failure'));
    }
    return super.putMany(...args);
  }
}

describe.each(['ko-KR', 'en-US'] as const)('current completion to Career Hub %s', (locale) => {
  it.each(CURRENT_POSITION_CASES)(
    '%s retries exact retirement, archives actual alumni and starts another run without reset',
    async (positionId, archetypeId) => {
      const fixture = createCurrentPositionSeasonFixture(positionId, archetypeId, 1, false);
      const expected = completePositionAlphaCareerV2(fixture.reviewed, fixture.mechanics);
      if (!expected.ok) throw new Error(expected.reason);
      const storage = new CompletionFailureStorage();
      const persistence = new PositionAlphaPersistenceV3(storage);
      expect(
        (await new PositionAlphaPersistenceV2(storage).saveSession(fixture.reviewed, true)).ok,
      ).toBe(true);
      const i18n = await createAppI18n(locale);
      render(
        <I18nextProvider i18n={i18n}>
          <App storage={storage} />
        </I18nextProvider>,
      );
      await screen.findByTestId('position-alpha-career');
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: i18n.t('m7Ui.nav.week') }));
      storage.failNextBatch = true;
      await user.click(screen.getByRole('button', { name: i18n.t('m7Direct.season.retire') }));
      await screen.findByTestId('position-alpha-save-failure');
      const prior = await persistence.loadSession();
      expect(prior.ok && prior.session).toEqual(fixture.reviewed);
      expect(
        (await new CareerManagementPersistence(storage).loadPositionAlumniV2()).completedSessions,
      ).toHaveLength(0);
      await user.click(screen.getByRole('button', { name: i18n.t('career.save.retry') }));
      await screen.findByRole('button', { name: i18n.t('m7Direct.season.hub') });
      const saved = await persistence.loadSession();
      expect(saved.ok && saved.session).toEqual(expected.session);
      const archiveKey = `position-alumni:${expected.session.lifecycle.careerId}`;
      const archive = await storage.get('profile', archiveKey);
      expect(archive).toBeDefined();
      await user.click(screen.getByRole('button', { name: i18n.t('m7Direct.season.hub') }));
      expect(
        within(await screen.findByTestId('hub-alumni')).getByText(
          expected.session.player.displayName,
        ),
      ).toBeVisible();
      storage.failNextBatch = true;
      await user.click(screen.getByTestId('hub-new'));
      await screen.findByTestId('hub-error');
      expect(screen.getByRole('alertdialog')).toHaveAccessibleName(i18n.t('hub.completedNew'));
      expect(screen.getByText(i18n.t('hub.completedNewDescription'))).toBeVisible();
      expect(screen.queryByText(i18n.t('hub.retireWarning'))).not.toBeInTheDocument();
      expect(await storage.get('profile', archiveKey)).toEqual(archive);
      expect((await persistence.loadSession()).ok).toBe(true);
      await user.click(screen.getByTestId('hub-confirm'));
      await screen.findByTestId('position-select-position_qb');
      await waitFor(async () =>
        expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toBeUndefined(),
      );
      expect(await storage.get('profile', archiveKey)).toEqual(archive);
      const history = await new CareerManagementPersistence(storage).loadPositionAlumniV2();
      expect(history.invalidEntryCount).toBe(0);
      expect(history.completedSessions[0]?.session).toEqual(expected.session);
    },
  );
});
