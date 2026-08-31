import { StrictMode } from 'react';
import type { CareerRun, RngSeed, SkillId, WeeklyActionId } from '@project-saturday/game-core';
import { localeMessages, type SupportedLocale } from '@project-saturday/game-content/locales';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { i18n as I18nInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App, type CareerPersistencePort } from './App';
import {
  commitCareerActionDraft,
  createCareerFromDraft,
  createDefaultCreationDraft,
  advanceCareerWeek,
  resolveCareerNextAction,
} from './career/career-ui';
import { chooseCareerSkillBreakthrough } from './career/skill-ui';
import { createAppI18n } from './i18n/i18n';
import {
  CareerPersistence,
  CURRENT_CAREER_SAVE_VERSION,
  IndexedDbStorageAdapter,
  MemoryStorageAdapter,
  SHIPPED_CAREER_CONTENT_VERSION,
  type LoadCareerResult,
  type SaveCareerResult,
  type SaveEnvelope,
  type StorageAdapter,
  type StorageStoreName,
} from './storage';

const pwaState = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(async () => undefined),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwaState.needRefresh, pwaState.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: pwaState.updateServiceWorker,
  }),
}));

function testEnvelope(career: CareerRun): SaveEnvelope<CareerRun> {
  return {
    checksum: 'fnv1a32:00000000',
    contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    createdAt: '2026-08-31T00:00:00.000Z',
    payload: career,
    saveVersion: CURRENT_CAREER_SAVE_VERSION,
    updatedAt: '2026-08-31T00:00:00.000Z',
  };
}

function successfulSave(career: CareerRun): SaveCareerResult {
  return {
    envelope: testEnvelope(career),
    ok: true,
    prunedSnapshotCount: 0,
    retentionWarning: false,
    snapshotId: null,
  };
}

function successfulLoad(career: CareerRun, recovered = false): LoadCareerResult {
  return {
    career,
    envelope: testEnvelope(career),
    ok: true,
    recovered,
    skippedEntries: [],
    source: recovered ? 'snapshot' : 'current',
    warnings: [],
  };
}

const NOT_FOUND: LoadCareerResult = {
  ok: false,
  reason: 'career_load.not_found',
  skippedEntries: [],
  warnings: [],
};

class RecordingPersistence implements CareerPersistencePort {
  public readonly replacements: CareerRun[] = [];
  public readonly saves: CareerRun[] = [];
  public deferNextSave = false;
  public failNextSave = false;
  private deferredSaveResolver: ((result: SaveCareerResult) => void) | undefined;

  public constructor(public loadResult: LoadCareerResult) {}

  public loadCareer(): Promise<LoadCareerResult> {
    return Promise.resolve(this.loadResult);
  }

  public replaceCurrentCareer(career: CareerRun): Promise<SaveCareerResult> {
    this.replacements.push(career);
    if (this.failNextSave) {
      this.failNextSave = false;
      return Promise.resolve({ ok: false, reason: 'career_save.storage_error' });
    }
    this.loadResult = successfulLoad(career);
    return Promise.resolve(successfulSave(career));
  }

  public saveCareer(career: CareerRun): Promise<SaveCareerResult> {
    this.saves.push(career);
    if (this.deferNextSave) {
      this.deferNextSave = false;
      return new Promise((resolve) => {
        this.deferredSaveResolver = resolve;
      });
    }
    if (this.failNextSave) {
      this.failNextSave = false;
      return Promise.resolve({ ok: false, reason: 'career_save.storage_error' });
    }
    this.loadResult = successfulLoad(career);
    return Promise.resolve(successfulSave(career));
  }

  public settleDeferredSave(result: SaveCareerResult): void {
    const resolve = this.deferredSaveResolver;
    if (resolve === undefined) {
      throw new Error('No deferred career save is pending.');
    }
    this.deferredSaveResolver = undefined;
    resolve(result);
  }
}

class DeferredLocaleStorage extends MemoryStorageAdapter {
  public readonly localeWrites: SupportedLocale[] = [];
  private readonly localeWriteReleases: (() => void)[] = [];

  public override async put<T>(storeName: StorageStoreName, id: string, value: T): Promise<void> {
    const localeValue: unknown = value;
    if (
      storeName === 'settings' &&
      id === 'locale' &&
      (localeValue === 'ko-KR' || localeValue === 'en-US')
    ) {
      this.localeWrites.push(localeValue);
      await new Promise<void>((resolve) => {
        this.localeWriteReleases.push(resolve);
      });
    }
    await super.put(storeName, id, value);
  }

  public releaseNextLocaleWrite(): void {
    const release = this.localeWriteReleases.shift();
    if (release === undefined) {
      throw new Error('No deferred locale write is pending.');
    }
    release();
  }
}

function createdCareer(seed = 'app-existing-career'): CareerRun {
  const result = createCareerFromDraft(
    {
      ...createDefaultCreationDraft(),
      displayName: 'Avery Saturday',
      personalityTraitIds: ['personality_competitive', 'personality_leader'],
    },
    seed,
  );
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.career;
}

function firstBreakthroughCareer(
  seed = 'app-first-breakthrough',
  plan: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId] = [
    'action_film_study',
    'action_film_study',
    'action_recovery',
  ],
): CareerRun {
  const committed = commitCareerActionDraft(createdCareer(seed), plan);
  if (!committed.ok) {
    throw new Error(committed.reason);
  }
  let career = committed.career;
  for (let index = 0; index < 3; index += 1) {
    const resolved = resolveCareerNextAction(career);
    if (!resolved.ok) {
      throw new Error(resolved.reason);
    }
    career = resolved.career;
  }
  const advanced = advanceCareerWeek(career);
  if (!advanced.ok || advanced.career.phase.type !== 'SKILL_BREAKTHROUGH') {
    throw new Error(advanced.ok ? 'Expected first breakthrough.' : advanced.reason);
  }
  return advanced.career;
}

function chooseOfferedSkill(career: CareerRun, skillId: SkillId): CareerRun {
  if (
    career.phase.type !== 'SKILL_BREAKTHROUGH' ||
    !career.phase.offer.offeredSkillIds.includes(skillId)
  ) {
    throw new Error(`Expected offered skill ${skillId}.`);
  }
  const chosen = chooseCareerSkillBreakthrough(career, skillId);
  if (!chosen.ok) {
    throw new Error(chosen.reason);
  }
  return chosen.career;
}

function completeDevelopmentWeek(career: CareerRun): CareerRun {
  const committed = commitCareerActionDraft(career, [
    'action_recovery',
    'action_film_study',
    'action_recovery',
  ]);
  if (!committed.ok) {
    throw new Error(committed.reason);
  }
  let nextCareer = committed.career;
  for (let index = 0; index < 3; index += 1) {
    const resolved = resolveCareerNextAction(nextCareer);
    if (!resolved.ok) {
      throw new Error(resolved.reason);
    }
    nextCareer = resolved.career;
  }
  const advanced = advanceCareerWeek(nextCareer);
  if (!advanced.ok) {
    throw new Error(advanced.reason);
  }
  if (advanced.career.phase.type !== 'SKILL_BREAKTHROUGH') {
    return advanced.career;
  }
  const chosen = chooseCareerSkillBreakthrough(
    advanced.career,
    advanced.career.phase.offer.offeredSkillIds[0],
  );
  if (!chosen.ok) {
    throw new Error(chosen.reason);
  }
  return chosen.career;
}

function planningCareerWithTwoSkills(seed = 'app-two-skills'): CareerRun {
  let career = createdCareer(seed);
  for (let week = 0; week < 5; week += 1) {
    career = completeDevelopmentWeek(career);
  }
  if (career.phase.type !== 'PLAN_ACTIONS' || career.player.skillState.acquisitions.length !== 2) {
    throw new Error('Expected a planning career with two acquired skills.');
  }
  return career;
}

async function renderApp(
  locale: SupportedLocale,
  options: {
    readonly captureI18n?: (instance: I18nInstance) => void;
    readonly persistence?: CareerPersistencePort;
    readonly storage?: StorageAdapter;
    readonly strict?: boolean;
  } = {},
): Promise<StorageAdapter> {
  const instance = await createAppI18n(locale);
  options.captureI18n?.(instance);
  const storage = options.storage ?? new MemoryStorageAdapter();
  const app = (
    <I18nextProvider i18n={instance}>
      <App
        careerSeedFactory={stableComponentSeed}
        storage={storage}
        {...(options.persistence === undefined ? {} : { persistence: options.persistence })}
      />
    </I18nextProvider>
  );
  render(options.strict ? <StrictMode>{app}</StrictMode> : app);
  return storage;
}

function stableComponentSeed(): RngSeed {
  return 'stable-component-seed';
}

async function waitForCreation(): Promise<void> {
  await screen.findByTestId('creation-form');
}

async function chooseValidTraits(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const checkboxes = screen.getAllByRole('checkbox');
  await user.click(checkboxes[0] as HTMLElement);
  await user.click(checkboxes[2] as HTMLElement);
}

async function draftThreeActions(
  user: ReturnType<typeof userEvent.setup>,
  actionIds: readonly [string, string, string],
): Promise<void> {
  for (const actionId of actionIds) {
    await user.click(screen.getByTestId(`action-choice-${actionId}`));
  }
}

beforeEach(() => {
  pwaState.needRefresh = false;
  pwaState.setNeedRefresh.mockReset();
  pwaState.updateServiceWorker.mockReset();
});

describe('load-first bilingual application shell', () => {
  it('does not expose creation until the existing-career read settles', async () => {
    let settle: ((result: LoadCareerResult) => void) | undefined;
    const persistence: CareerPersistencePort = {
      loadCareer: () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
      replaceCurrentCareer: async (career) => successfulSave(career),
      saveCareer: async (career) => successfulSave(career),
    };
    await renderApp('en-US', { persistence });

    expect(screen.getByTestId('career-loading')).toHaveTextContent(
      localeMessages['en-US']['career.boot.loading'],
    );
    expect(screen.queryByTestId('creation-form')).not.toBeInTheDocument();

    settle?.(NOT_FOUND);
    await waitForCreation();
  });

  it.each(['ko-KR', 'en-US'] as const)(
    'renders creation in %s with locale units',
    async (locale) => {
      await renderApp(locale, { persistence: new RecordingPersistence(NOT_FOUND) });
      await waitForCreation();
      const messages = localeMessages[locale];

      expect(
        screen.getByRole('heading', { level: 1, name: messages['career.creation.title'] }),
      ).toBeInTheDocument();
      expect(document.documentElement).toHaveAttribute('lang', locale);
      expect(document.title).toBe(messages['app.title']);
      expect(
        screen.getByTestId(locale === 'en-US' ? 'creation-height-feet' : 'creation-height-cm'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(locale === 'en-US' ? 'creation-weight-lb' : 'creation-weight-kg'),
      ).toBeInTheDocument();
    },
  );

  it('preserves draft identity and canonical dimensions across a locale switch', async () => {
    const user = userEvent.setup();
    await renderApp('en-US', { persistence: new RecordingPersistence(NOT_FOUND) });
    await waitForCreation();
    await user.type(screen.getByTestId('creation-name'), 'Locale WR');
    await chooseValidTraits(user);
    await user.clear(screen.getByTestId('creation-weight-lb'));
    await user.type(screen.getByTestId('creation-weight-lb'), '200');

    await user.click(screen.getByTestId('locale-ko-KR'));
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'ko-KR'));
    expect(screen.getByTestId('creation-name')).toHaveValue('Locale WR');
    expect(screen.getByTestId('creation-weight-kg')).toHaveValue(91);
    expect(
      screen.getAllByRole('checkbox').filter((checkbox) => checkbox.hasAttribute('checked')),
    ).toHaveLength(0);
    expect(
      screen.getAllByRole('checkbox').filter((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toHaveLength(2);
  });

  it.each([
    ['committed queue', 0],
    ['mid-resolution queue', 1],
  ] as const)('resumes an exact %s under StrictMode replay', async (_label, resolvedCount) => {
    const committed = commitCareerActionDraft(createdCareer(), [
      'action_route_drills',
      'action_recovery',
      'action_route_drills',
    ]);
    if (!committed.ok) {
      throw new Error(committed.reason);
    }
    let resumedCareer = committed.career;
    for (let index = 0; index < resolvedCount; index += 1) {
      const resolved = resolveCareerNextAction(resumedCareer);
      if (!resolved.ok) {
        throw new Error(resolved.reason);
      }
      resumedCareer = resolved.career;
    }
    await renderApp('en-US', {
      persistence: new RecordingPersistence(successfulLoad(resumedCareer)),
      strict: true,
    });

    const phase = await screen.findByTestId('weekly-phase');
    expect(phase).toHaveAttribute('data-phase', 'RESOLVE_ACTIONS');
    expect(screen.getByTestId('career-week')).toHaveTextContent('Week 1');
    if (resolvedCount > 0) {
      expect(
        screen.getByText(localeMessages['en-US']['career.week.result.latest']),
      ).toBeInTheDocument();
    } else {
      expect(
        screen.queryByText(localeMessages['en-US']['career.week.result.latest']),
      ).not.toBeInTheDocument();
    }
  });

  it('switches locale and persists the setting', async () => {
    const user = userEvent.setup();
    const storage = await renderApp('ko-KR', { persistence: new RecordingPersistence(NOT_FOUND) });
    await waitForCreation();
    await user.click(screen.getByTestId('locale-en-US'));

    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'en-US'));
    expect(screen.getByTestId('locale-en-US')).toHaveAttribute('aria-pressed', 'true');
    await expect(storage.get('settings', 'locale')).resolves.toBe('en-US');
  });

  it('updates copy, language metadata, selection, and units before persistence settles', async () => {
    const user = userEvent.setup();
    const storage = new DeferredLocaleStorage();
    await renderApp('ko-KR', {
      persistence: new RecordingPersistence(NOT_FOUND),
      storage,
    });
    await waitForCreation();

    await user.click(screen.getByTestId('locale-en-US'));

    expect(document.documentElement).toHaveAttribute('lang', 'en-US');
    expect(document.title).toBe(localeMessages['en-US']['app.title']);
    expect(screen.getByTestId('locale-en-US')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('locale-ko-KR')).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: localeMessages['en-US']['career.creation.title'],
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('creation-height-feet')).toBeInTheDocument();
    expect(screen.queryByTestId('creation-height-cm')).not.toBeInTheDocument();

    await waitFor(() => expect(storage.localeWrites).toEqual(['en-US']));
    await expect(storage.get('settings', 'locale')).resolves.toBeUndefined();
    storage.releaseNextLocaleWrite();
    await waitFor(async () => expect(await storage.get('settings', 'locale')).toBe('en-US'));
  });

  it('keeps provider and UI on the latest locale while an older write is in flight', async () => {
    const user = userEvent.setup();
    const storage = new DeferredLocaleStorage();
    let providerI18n: I18nInstance | undefined;
    await renderApp('ko-KR', {
      captureI18n: (instance) => {
        providerI18n = instance;
      },
      persistence: new RecordingPersistence(NOT_FOUND),
      storage,
    });
    await waitForCreation();

    await user.click(screen.getByTestId('locale-en-US'));
    await waitFor(() => expect(storage.localeWrites).toEqual(['en-US']));
    await waitFor(() => {
      expect(providerI18n?.language).toBe('en-US');
      expect(providerI18n?.resolvedLanguage).toBe('en-US');
    });

    await user.click(screen.getByTestId('locale-ko-KR'));
    expect(document.documentElement).toHaveAttribute('lang', 'ko-KR');
    expect(screen.getByTestId('locale-ko-KR')).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: localeMessages['ko-KR']['career.creation.title'],
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('creation-height-cm')).toBeInTheDocument();
    expect(screen.queryByTestId('creation-height-feet')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(providerI18n?.language).toBe('ko-KR');
      expect(providerI18n?.resolvedLanguage).toBe('ko-KR');
    });
    expect(storage.localeWrites).toEqual(['en-US']);

    storage.releaseNextLocaleWrite();
    await waitFor(() => expect(storage.localeWrites).toEqual(['en-US', 'ko-KR']));
    await waitFor(async () => expect(await storage.get('settings', 'locale')).toBe('en-US'));
    storage.releaseNextLocaleWrite();
    await waitFor(async () => expect(await storage.get('settings', 'locale')).toBe('ko-KR'));
    expect(providerI18n?.language).toBe('ko-KR');
    expect(providerI18n?.resolvedLanguage).toBe('ko-KR');
  });

  it('coalesces rapid locale requests so only the latest request is persisted', async () => {
    const storage = new DeferredLocaleStorage();
    await renderApp('ko-KR', {
      persistence: new RecordingPersistence(successfulLoad(createdCareer('rapid-locale'))),
      storage,
    });
    await screen.findByTestId('weekly-phase');

    fireEvent.click(screen.getByTestId('locale-en-US'));
    fireEvent.click(screen.getByTestId('locale-ko-KR'));
    fireEvent.click(screen.getByTestId('locale-en-US'));

    expect(document.documentElement).toHaveAttribute('lang', 'en-US');
    expect(screen.getByTestId('locale-en-US')).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('heading', {
        name: localeMessages['en-US']['career.week.plan.title'],
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('190 lb')).toBeInTheDocument();
    await waitFor(() => expect(storage.localeWrites).toEqual(['en-US']));

    storage.releaseNextLocaleWrite();
    await waitFor(async () => expect(await storage.get('settings', 'locale')).toBe('en-US'));
    expect(storage.localeWrites).toEqual(['en-US']);
  });
});

describe('creation and canonical persistence', () => {
  it('shows localized validation and disables incompatible traits accessibly', async () => {
    const user = userEvent.setup();
    await renderApp('en-US', { persistence: new RecordingPersistence(NOT_FOUND) });
    await waitForCreation();
    await user.click(screen.getByTestId('creation-submit'));
    expect(screen.getByTestId('creation-errors')).toHaveTextContent(
      localeMessages['en-US']['career.creation.errors.name'],
    );
    expect(screen.getByTestId('creation-errors')).toHaveTextContent(
      localeMessages['en-US']['career.creation.errors.personalities'],
    );

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1] as HTMLElement);
    expect(checkboxes[5]).toBeDisabled();
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
  });

  it('creates through the explicit replacement path and stores imperial input as metric', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    await renderApp('en-US', { storage });
    await waitForCreation();
    await user.type(screen.getByTestId('creation-name'), 'Metric Persisted');
    await chooseValidTraits(user);
    await user.clear(screen.getByTestId('creation-height-feet'));
    await user.type(screen.getByTestId('creation-height-feet'), '6');
    await user.clear(screen.getByTestId('creation-height-inches'));
    await user.type(screen.getByTestId('creation-height-inches'), '2');
    await user.clear(screen.getByTestId('creation-weight-lb'));
    await user.type(screen.getByTestId('creation-weight-lb'), '200');
    await user.click(screen.getByTestId('creation-submit'));
    await screen.findByTestId('career-screen');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          name: localeMessages['en-US']['career.week.plan.title'],
        }),
      ).toHaveFocus(),
    );

    const persistence = new CareerPersistence(storage, {
      contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    });
    const loaded = await persistence.loadCareer();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.career.careerSeed).toBe('stable-component-seed');
      expect(loaded.career.player.heightCm).toBe(188);
      expect(loaded.career.player.weightKg).toBe(91);
    }
  });
});

describe('weekly phase flow and autosave boundaries', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'offers one keyboard-selectable saved breakthrough in %s and opens four loadout slots',
    async (locale) => {
      const user = userEvent.setup();
      const pendingCareer = firstBreakthroughCareer(`breakthrough-${locale}`);
      const persistence = new RecordingPersistence(successfulLoad(pendingCareer));
      persistence.deferNextSave = true;
      await renderApp(locale, { persistence });

      const breakthrough = await screen.findByTestId('skill-breakthrough');
      expect(breakthrough).toHaveTextContent(
        localeMessages[locale]['career.skills.breakthrough.help'],
      );
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      expect(screen.getByTestId('skill-choose-confirm')).toBeDisabled();
      expect(
        screen.getByRole('heading', {
          name: localeMessages[locale]['career.week.breakthrough.title'],
        }),
      ).toHaveFocus();

      const firstRadio = screen.getAllByRole('radio')[0];
      if (firstRadio === undefined) {
        throw new Error('Expected a first offered skill radio.');
      }
      firstRadio.focus();
      await user.keyboard(' ');
      expect(firstRadio).toBeChecked();
      const selectedSkillId = (firstRadio as HTMLInputElement).value;
      const rngBeforeChoice = pendingCareer.rng;
      const confirm = screen.getByTestId('skill-choose-confirm');
      confirm.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => expect(persistence.saves).toHaveLength(1));
      const saved = persistence.saves[0];
      if (saved === undefined) {
        throw new Error('Expected the pending breakthrough choice save.');
      }
      expect(saved?.phase.type).toBe('PLAN_ACTIONS');
      expect(saved?.rng).toEqual(rngBeforeChoice);
      expect(saved?.player.skillState.acquisitions[0]?.selectedSkillId).toBe(selectedSkillId);
      expect(saved?.player.skillState.equippedSkillIds).toEqual([
        selectedSkillId,
        null,
        null,
        null,
      ]);
      expect(screen.getByTestId('weekly-phase')).toHaveAttribute(
        'data-phase',
        'SKILL_BREAKTHROUGH',
      );
      expect(screen.getByTestId('skill-breakthrough')).toBeVisible();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toBeDisabled();
      }
      expect(screen.getByTestId('skill-choose-confirm')).toBeDisabled();

      await act(async () => {
        persistence.settleDeferredSave(successfulSave(saved));
      });
      await waitFor(() =>
        expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'PLAN_ACTIONS'),
      );

      await user.click(screen.getByText(localeMessages[locale]['career.skills.inventory.title']));
      expect(screen.getAllByRole('combobox')).toHaveLength(4);
      expect(screen.getByTestId('skill-slot-0')).toHaveAttribute('data-skill-id', selectedSkillId);
    },
  );

  it('retries the exact breakthrough choice after a save failure without another RNG draw', async () => {
    const user = userEvent.setup();
    const pendingCareer = firstBreakthroughCareer('breakthrough-save-retry');
    const persistence = new RecordingPersistence(successfulLoad(pendingCareer));
    persistence.failNextSave = true;
    await renderApp('en-US', { persistence });
    await screen.findByTestId('skill-breakthrough');

    const selectedSkillId =
      pendingCareer.phase.type === 'SKILL_BREAKTHROUGH'
        ? pendingCareer.phase.offer.offeredSkillIds[0]
        : undefined;
    if (selectedSkillId === undefined) {
      throw new Error('Expected a pending skill offer.');
    }
    await user.click(screen.getByTestId(`skill-offer-${selectedSkillId}`));
    await user.click(screen.getByTestId('skill-choose-confirm'));

    const warning = await screen.findByTestId('save-failure');
    expect(warning).toHaveFocus();
    expect(persistence.saves).toHaveLength(1);
    const failedCareer = persistence.saves[0];
    if (failedCareer === undefined) {
      throw new Error('Expected the failed breakthrough choice career.');
    }
    expect(failedCareer?.rng).toEqual(pendingCareer.rng);
    expect(failedCareer?.player.skillState.acquisitions).toHaveLength(1);
    expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'SKILL_BREAKTHROUGH');
    expect(screen.getByTestId('skill-breakthrough')).toBeVisible();
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
    expect(screen.getByTestId('skill-choose-confirm')).toBeDisabled();

    persistence.deferNextSave = true;
    await user.click(screen.getByTestId('retry-save'));
    await waitFor(() => expect(persistence.saves).toHaveLength(2));
    expect(screen.queryByTestId('save-failure')).not.toBeInTheDocument();
    expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'SKILL_BREAKTHROUGH');
    expect(screen.getByTestId('skill-choose-confirm')).toBeDisabled();
    expect(persistence.saves).toHaveLength(2);
    expect(persistence.saves[1]).toEqual(failedCareer);
    await act(async () => {
      persistence.settleDeferredSave(successfulSave(failedCareer));
    });
    await waitFor(() =>
      expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'PLAN_ACTIONS'),
    );
    expect(screen.queryByTestId('skill-breakthrough')).not.toBeInTheDocument();
  });

  it('autosaves deliberate four-slot loadout changes and locks them outside planning', async () => {
    const user = userEvent.setup();
    const loadedCareer = planningCareerWithTwoSkills('loadout-command-flow');
    const persistence = new RecordingPersistence(successfulLoad(loadedCareer));
    const firstSkillId = loadedCareer.player.skillState.acquisitions[0]?.selectedSkillId;
    if (firstSkillId === undefined) {
      throw new Error('Expected a first owned skill.');
    }
    await renderApp('en-US', { persistence });
    await screen.findByTestId('weekly-phase');
    await user.click(screen.getByText(localeMessages['en-US']['career.skills.inventory.title']));

    const slotSelects = screen.getAllByRole('combobox');
    expect(slotSelects).toHaveLength(4);
    await user.selectOptions(slotSelects[0] as HTMLSelectElement, '');
    await waitFor(() => expect(persistence.saves).toHaveLength(1));
    expect(persistence.saves[0]?.player.skillState.equippedSkillIds[0]).toBeNull();
    await waitFor(() => expect(slotSelects[1]).toBeEnabled());

    await user.selectOptions(slotSelects[1] as HTMLSelectElement, firstSkillId);
    await waitFor(() => expect(persistence.saves).toHaveLength(2));
    expect(persistence.saves[1]?.player.skillState.equippedSkillIds).toEqual([
      null,
      firstSkillId,
      null,
      null,
    ]);
    expect(persistence.saves.map(({ revision }) => revision)).toEqual([
      loadedCareer.revision + 1,
      loadedCareer.revision + 2,
    ]);

    await draftThreeActions(user, ['action_route_drills', 'action_recovery', 'action_study_hall']);
    await user.click(screen.getByTestId('action-commit'));
    await waitFor(() => expect(persistence.saves).toHaveLength(3));
    expect(screen.getAllByRole('combobox')).toHaveLength(4);
    for (const select of screen.getAllByRole('combobox')) {
      expect(select).toBeDisabled();
    }
    expect(
      screen.getByText(localeMessages['en-US']['career.skills.inventory.locked']),
    ).toBeVisible();
  });

  it.each(['ko-KR', 'en-US'] as const)(
    'explains an authoritative applied Film Study skill trace in %s',
    async (locale) => {
      const learned = chooseOfferedSkill(
        firstBreakthroughCareer('ui-evidence-1'),
        'skill_coverage_ledger_b',
      );
      const committed = commitCareerActionDraft(learned, [
        'action_film_study',
        'action_recovery',
        'action_recovery',
      ]);
      if (!committed.ok) {
        throw new Error(committed.reason);
      }
      const resolved = resolveCareerNextAction(committed.career);
      if (!resolved.ok) {
        throw new Error(resolved.reason);
      }
      const result =
        resolved.career.phase.type === 'RESOLVE_ACTIONS'
          ? resolved.career.phase.results[0]
          : undefined;
      expect(result?.appliedSkillEffects).toEqual([
        {
          effectIndex: 0,
          multiplierPermille: 1100,
          skillId: 'skill_coverage_ledger_b',
          slotIndex: 0,
          type: 'action_xp_multiplier',
        },
      ]);

      await renderApp(locale, {
        persistence: new RecordingPersistence(successfulLoad(resolved.career)),
      });
      const evidence = await screen.findByTestId('skill-evidence-skill_coverage_ledger_b-0');
      expect(evidence).toHaveTextContent(localeMessages[locale]['skills.coverageLedgerB.name']);
      expect(evidence).toHaveTextContent('+10%');
      expect(
        screen.getByText(localeMessages[locale]['career.skills.effects.applied']),
      ).toBeInTheDocument();
    },
  );

  it('previews and then renders persisted passive recovery skill evidence', async () => {
    const user = userEvent.setup();
    const learned = chooseOfferedSkill(
      firstBreakthroughCareer('ui-passive-30', [
        'action_recovery',
        'action_weight_room',
        'action_weight_room',
      ]),
      'skill_compressed_recovery_s',
    );
    const committed = commitCareerActionDraft(learned, [
      'action_weight_room',
      'action_weight_room',
      'action_weight_room',
    ]);
    if (!committed.ok) {
      throw new Error(committed.reason);
    }
    let weekEndCareer = committed.career;
    for (let index = 0; index < 3; index += 1) {
      const resolved = resolveCareerNextAction(weekEndCareer);
      if (!resolved.ok) {
        throw new Error(resolved.reason);
      }
      weekEndCareer = resolved.career;
    }
    if (weekEndCareer.phase.type !== 'WEEK_END') {
      throw new Error('Expected a week-end passive recovery preview.');
    }
    const persistence = new RecordingPersistence(successfulLoad(weekEndCareer));
    await renderApp('en-US', { persistence });

    const preview = await screen.findByTestId('passive-recovery-preview');
    expect(preview).toHaveTextContent(localeMessages['en-US']['skills.compressedRecoveryS.name']);
    expect(preview).toHaveTextContent('-6');
    await user.click(screen.getByTestId('advance-week'));
    await waitFor(() => expect(persistence.saves).toHaveLength(1));

    const applied = screen.getByTestId('passive-recovery-applied');
    expect(applied).toHaveTextContent(localeMessages['en-US']['skills.compressedRecoveryS.name']);
    expect(applied).toHaveTextContent('-6');
    expect(persistence.saves[0]?.lastPassiveBodyRecovery?.appliedSkillEffects).toEqual([
      {
        delta: -6,
        effectIndex: 1,
        skillId: 'skill_compressed_recovery_s',
        slotIndex: 0,
        type: 'passive_body_recovery_flat',
      },
    ]);
  });

  it('supports keyboard drafting and commit through semantic buttons', async () => {
    const user = userEvent.setup();
    const persistence = new RecordingPersistence(successfulLoad(createdCareer('keyboard-flow')));
    await renderApp('en-US', { persistence });
    await screen.findByTestId('weekly-phase');
    expect(
      screen.getAllByText(localeMessages['en-US']['career.week.preview']).length,
    ).toBeGreaterThan(0);

    const actionButton = screen.getByTestId('action-choice-action_route_drills');
    actionButton.focus();
    for (let count = 0; count < 3; count += 1) {
      await user.keyboard('{Enter}');
    }
    expect(
      within(screen.getByTestId('action-draft'))
        .getAllByRole('listitem')
        .map((slot) => slot.dataset['actionId']),
    ).toEqual(['action_route_drills', 'action_route_drills', 'action_route_drills']);

    const commitButton = screen.getByTestId('action-commit');
    commitButton.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(persistence.saves).toHaveLength(1));
    expect(persistence.saves[0]?.phase.type).toBe('RESOLVE_ACTIONS');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          name: localeMessages['en-US']['career.week.resolve.title'],
        }),
      ).toHaveFocus(),
    );
  });

  it('keeps draft clicks local, preserves duplicate order, and saves every authoritative revision', async () => {
    const user = userEvent.setup();
    const persistence = new RecordingPersistence(successfulLoad(createdCareer()));
    await renderApp('en-US', { persistence });
    await screen.findByTestId('weekly-phase');

    await draftThreeActions(user, [
      'action_route_drills',
      'action_route_drills',
      'action_recovery',
    ]);
    expect(persistence.saves).toHaveLength(0);
    const draft = screen.getByTestId('action-draft');
    expect(
      within(draft)
        .getAllByRole('listitem')
        .map((slot) => slot.dataset['actionId']),
    ).toEqual(['action_route_drills', 'action_route_drills', 'action_recovery']);

    await user.click(screen.getByTestId('action-commit'));
    await waitFor(() => expect(persistence.saves).toHaveLength(1));
    expect(persistence.saves[0]?.revision).toBe(1);
    expect(persistence.saves[0]?.phase).toMatchObject({
      actionIds: ['action_route_drills', 'action_route_drills', 'action_recovery'],
      type: 'RESOLVE_ACTIONS',
    });

    for (const expectedSaveCount of [2, 3, 4]) {
      await user.click(screen.getByTestId('resolve-next'));
      await waitFor(() => expect(persistence.saves).toHaveLength(expectedSaveCount));
      if (expectedSaveCount < 4) {
        const latestResult = screen.getByTestId('latest-result');
        expect(latestResult).toHaveAttribute('aria-atomic', 'true');
        expect(latestResult).toHaveAttribute('aria-live', 'polite');
        expect(latestResult).toHaveAttribute('role', 'status');
        await waitFor(() => expect(document.activeElement).toBe(latestResult));
      }
    }
    expect(persistence.saves.map(({ revision }) => revision)).toEqual([1, 2, 3, 4]);
    expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'WEEK_END');
    expect(
      screen.getAllByText(localeMessages['en-US']['career.week.result.proficiency']).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', {
        name: localeMessages['en-US']['career.week.end.title'],
      }),
    ).toHaveFocus();

    await user.click(screen.getByTestId('advance-week'));
    await waitFor(() => expect(persistence.saves).toHaveLength(5));
    expect(persistence.saves[4]?.revision).toBe(5);
    expect(persistence.saves[4]?.weekIndex).toBe(1);
    expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'SKILL_BREAKTHROUGH');
    const breakthroughCareer = persistence.saves[4];
    if (breakthroughCareer?.phase.type !== 'SKILL_BREAKTHROUGH') {
      throw new Error('Expected first-week skill breakthrough.');
    }
    const selectedSkillId = breakthroughCareer.phase.offer.offeredSkillIds[0];
    const breakthroughRng = breakthroughCareer.rng;
    await user.click(screen.getByTestId(`skill-offer-${selectedSkillId}`));
    await user.click(screen.getByTestId('skill-choose-confirm'));
    await waitFor(() => expect(persistence.saves).toHaveLength(6));
    expect(persistence.saves[5]?.revision).toBe(6);
    expect(persistence.saves[5]?.rng).toEqual(breakthroughRng);
    expect(persistence.saves[5]?.player.skillState.acquisitions[0]?.selectedSkillId).toBe(
      selectedSkillId,
    );
    expect(persistence.saves[5]?.player.skillState.equippedSkillIds).toEqual([
      selectedSkillId,
      null,
      null,
      null,
    ]);
    expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'PLAN_ACTIONS');
    expect(
      screen.getByRole('heading', {
        name: localeMessages['en-US']['career.week.plan.title'],
      }),
    ).toHaveFocus();
  });

  it('blocks after save failures, focuses every remounted warning, and restores on success', async () => {
    const user = userEvent.setup();
    const persistence = new RecordingPersistence(successfulLoad(createdCareer('save-failure')));
    await renderApp('en-US', { persistence });
    await screen.findByTestId('weekly-phase');
    await draftThreeActions(user, ['action_route_drills', 'action_recovery', 'action_study_hall']);
    persistence.failNextSave = true;
    await user.click(screen.getByTestId('action-commit'));

    const initialWarning = await screen.findByTestId('save-failure');
    expect(initialWarning).toHaveTextContent(localeMessages['en-US']['career.save.failed']);
    await waitFor(() => expect(initialWarning).toHaveFocus());
    expect(screen.getByTestId('resolve-next')).toBeDisabled();
    expect(persistence.saves.map(({ revision }) => revision)).toEqual([1]);

    persistence.deferNextSave = true;
    await user.click(screen.getByTestId('retry-save'));
    await waitFor(() => expect(persistence.saves).toHaveLength(2));
    expect(screen.queryByTestId('save-failure')).not.toBeInTheDocument();
    await act(async () => {
      persistence.settleDeferredSave({ ok: false, reason: 'career_save.storage_error' });
    });

    const retryWarning = await screen.findByTestId('save-failure');
    await waitFor(() => expect(retryWarning).toHaveFocus());
    expect(screen.getByTestId('resolve-next')).toBeDisabled();

    await user.click(screen.getByTestId('retry-save'));
    await waitFor(() => expect(screen.queryByTestId('save-failure')).not.toBeInTheDocument());
    expect(persistence.saves.map(({ revision }) => revision)).toEqual([1, 1, 1]);
    expect(screen.getByTestId('resolve-next')).toBeEnabled();
    expect(
      screen.getByRole('heading', {
        name: localeMessages['en-US']['career.week.resolve.title'],
      }),
    ).toHaveFocus();
  });

  it('surfaces snapshot recovery, preserves the phase, and clears the notice after saving', async () => {
    const user = userEvent.setup();
    const persistence = new RecordingPersistence(successfulLoad(createdCareer('recovered'), true));
    await renderApp('ko-KR', {
      persistence,
    });
    expect(await screen.findByTestId('boot-recovered')).toHaveTextContent(
      localeMessages['ko-KR']['career.boot.recovered'],
    );
    expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'PLAN_ACTIONS');

    await draftThreeActions(user, ['action_route_drills', 'action_recovery', 'action_study_hall']);
    await user.click(screen.getByTestId('action-commit'));
    await waitFor(() => expect(persistence.saves).toHaveLength(1));
    expect(screen.queryByTestId('boot-recovered')).not.toBeInTheDocument();
  });
});

describe('preserved platform notices', () => {
  it('presents the localized service-worker update decision', async () => {
    pwaState.needRefresh = true;
    const user = userEvent.setup();
    await renderApp('en-US', { persistence: new RecordingPersistence(NOT_FOUND) });
    await waitForCreation();
    expect(screen.getByText(localeMessages['en-US']['pwa.updateAvailable'])).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: localeMessages['en-US']['pwa.updateAction'] }),
    );
    expect(pwaState.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('warns when storage is session-only and hides it for IndexedDB durability', async () => {
    await renderApp('ko-KR', { persistence: new RecordingPersistence(NOT_FOUND) });
    await waitForCreation();
    expect(screen.getByTestId('storage-warning')).toHaveTextContent(
      localeMessages['ko-KR']['storage.degradedWarning'],
    );

    const durable = new IndexedDbStorageAdapter('app-career-ui-durable-test');
    await renderApp('ko-KR', {
      persistence: new RecordingPersistence(NOT_FOUND),
      storage: durable,
    });
    await waitFor(() => expect(screen.getAllByTestId('creation-form')).toHaveLength(2));
    expect(screen.getAllByTestId('storage-warning')).toHaveLength(1);
    await durable.close();
  });
});
