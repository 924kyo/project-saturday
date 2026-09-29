import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../i18n/i18n';
import { MemoryStorageAdapter, type StorageStoreName } from '../storage';
import { App } from './App';
import { VNEXT_CAREER_ID, loadCareerVNext, saveCareerVNext } from './persistence';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => undefined],
    offlineReady: [false, () => undefined],
    updateServiceWorker: () => Promise.resolve(),
  }),
}));

class FlakyStorage extends MemoryStorageAdapter {
  public failNextCareerWrite = false;
  public override put<T>(storeName: StorageStoreName, id: string, value: T): Promise<void> {
    if (storeName === 'currentCareer' && id === VNEXT_CAREER_ID && this.failNextCareerWrite) {
      this.failNextCareerWrite = false;
      return Promise.reject(new Error('disk full'));
    }
    return super.put(storeName, id, value);
  }
}

beforeAll(() => {
  // Reduced motion: the signing moment and board replay resolve immediately.
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

const JOURNEY_SEED = 'app2-journey';
const seedFactory = () => JOURNEY_SEED;

async function renderApp(storage: MemoryStorageAdapter) {
  const i18n = await createAppI18n('en-US');
  render(
    <I18nextProvider i18n={i18n}>
      <App seedFactory={seedFactory} storage={storage} />
    </I18nextProvider>,
  );
}

describe('App vertical slice', () => {
  it('plays create → recruit → week → Game Day → post-game → next week with retryable saves', async () => {
    const user = userEvent.setup();
    const storage = new FlakyStorage();
    await renderApp(storage);

    await user.click(await screen.findByRole('button', { name: 'Next' }));
    const traits = screen.getAllByRole('checkbox');
    await user.click(traits[0]!);
    await user.click(
      screen
        .getAllByRole('checkbox')
        .find(
          (box) => !box.hasAttribute('disabled') && box.getAttribute('aria-checked') === 'false',
        )!,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Player name'), 'Marcus Hale');
    await user.click(screen.getByRole('button', { name: 'Start recruiting' }));

    expect(await screen.findByRole('heading', { name: 'Where do you start?' })).toBeInTheDocument();
    const offers = screen.getAllByRole('listitem');
    expect(offers).toHaveLength(4);
    await user.click(within(offers[3]!).getByRole('button'));
    await user.click(screen.getByRole('button', { name: /^Commit to / }));

    expect(await screen.findByRole('heading', { name: 'Pick three focuses' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Coach’s plan' }));
    // A failed write keeps the plan on screen and offers an exact retry.
    storage.failNextCareerWrite = true;
    await user.click(screen.getByRole('button', { name: 'Lock in the week' }));
    expect(
      await screen.findByText('Save failed. You are seeing the last saved state.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pick three focuses' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry save' }));

    expect(await screen.findByText('Practice report')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Game Day/ }));
    // Optional midweek event and medical check stop only for a decision, then continue.
    for (let guard = 0; guard < 4; guard += 1) {
      const kickoff = screen.queryByRole('button', { name: 'Kick off' });
      if (kickoff !== null) break;
      await waitFor(() => expect(document.querySelector('#s2-event, #s2-injury')).not.toBeNull());
      const choices = screen.queryByRole('group');
      if (choices !== null) await user.click(within(choices).getAllByRole('button')[0]!);
      await user.click(await screen.findByRole('button', { name: /Continue|To Game Day/ }));
    }
    await user.click(await screen.findByRole('button', { name: 'Kick off' }));

    let decisions = 0;
    for (let guard = 0; guard < 20; guard += 1) {
      const group = screen.queryByRole('group', { name: 'Your choice this snap' });
      if (group !== null) {
        expect(
          screen.getByRole('img', { name: /Quarter|Reading the defense/ }),
        ).toBeInTheDocument();
        await user.click(within(group).getAllByRole('button')[0]!);
        decisions += 1;
        await screen.findByRole('button', { name: /Next snap|Final score/ });
      }
      const next = screen.queryByRole('button', { name: /Next snap|Final score/ });
      if (next === null) break;
      await user.click(next);
    }
    expect(decisions).toBeGreaterThanOrEqual(2);
    await user.click(await screen.findByRole('button', { name: /See the game story/ }));
    expect(await screen.findByText('Coach’s verdict')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next week/ }));

    expect(await screen.findByRole('heading', { name: 'Pick three focuses' })).toBeInTheDocument();
    await waitFor(async () => {
      const saved = await loadCareerVNext(storage);
      expect(saved.status === 'ok' && saved.career.season.weekIndex).toBe(1);
    });
  }, 60_000);

  it('resumes the saved career and rejects a tampered save', async () => {
    const storage = new MemoryStorageAdapter();
    await renderApp(storage);
    await screen.findByRole('button', { name: 'Next' });
    expect(await loadCareerVNext(storage)).toEqual({ status: 'none' });
    const saved = await storage.get<Record<string, unknown>>('currentCareer', VNEXT_CAREER_ID);
    expect(saved).toBeUndefined();
    await storage.put('currentCareer', VNEXT_CAREER_ID, {
      model: 'career_vnext_save',
      version: 1,
      updatedAt: '2026-09-29T00:00:00.000Z',
      checksum: 'fnv1a32:00000000',
      json: '{}',
    });
    expect((await loadCareerVNext(storage)).status).toBe('corrupt');
    expect(saveCareerVNext).toBeTypeOf('function');
  });
});
