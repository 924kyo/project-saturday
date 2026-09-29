import { StrictMode } from 'react';
import {
  createCareerSession,
  type CareerRun,
  type CareerSession,
  type RngSeed,
  type SkillId,
  type WeeklyActionId,
} from '@project-saturday/game-core';
import { gameContent, programContent } from '@project-saturday/game-content/content';
import {
  localeMessages,
  type MessageKey,
  type SupportedLocale,
} from '@project-saturday/game-content/locales';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { i18n as I18nInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App, type CareerPersistencePort } from './App';
import {
  commitCareerActionDraft,
  commitCareerProgramChoice,
  createCareerFromDraft,
  createDefaultCreationDraft,
  advanceCareerWeek,
  prepareCareerGame,
  resolveCareerNextAction,
  startCareerGame,
} from './career/career-ui';
import { chooseCareerSkillBreakthrough } from './career/skill-ui';
import { createAppI18n } from './i18n/i18n';
import {
  ONBOARDING_SETTINGS_ID,
  completeAllOnboarding,
  type OnboardingSettings,
} from './onboarding/onboarding';
import { createTestCareer } from './test/career-fixture';
import { completeShippedGame } from './test/game-fixture';
import {
  createCompletedSeasonFixture,
  createNilDecisionFixtures,
  createSecondSeasonFixture,
  type CompletedSeasonFixture,
  type NilDecisionFixtures,
  type SecondSeasonFixture,
} from './test/season-fixture';
import {
  advancePositionAlphaFixture,
  createCompletedPositionAlphaFixture,
  createTransferredPositionAlphaSession,
  POSITION_ALPHA_TRANSFER_CASES,
} from './test/position-alpha-fixture';
import {
  CareerPersistence,
  CURRENT_CAREER_SAVE_VERSION,
  IndexedDbStorageAdapter,
  MemoryStorageAdapter,
  MetaProfilePersistence,
  POSITION_ALPHA_STORAGE_ID,
  PositionAlphaPersistence,
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

function testEnvelope(career: CareerRun): SaveEnvelope<CareerSession> {
  const session = createCareerSession(career);
  return {
    checksum: 'fnv1a32:00000000',
    contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    createdAt: '2026-08-31T00:00:00.000Z',
    payload: session,
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
  const session = createCareerSession(career);
  return {
    career,
    envelope: testEnvelope(career),
    ok: true,
    recovered,
    skippedEntries: [],
    source: recovered ? 'snapshot' : 'current',
    session,
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

class FailOnceBatchStorage extends MemoryStorageAdapter {
  public failNextBatch = false;

  public override putMany(entries: Parameters<StorageAdapter['putMany']>[0]): Promise<void> {
    if (this.failNextBatch) {
      this.failNextBatch = false;
      return Promise.reject(new Error('Injected atomic write failure.'));
    }
    return super.putMany(entries);
  }
}

let completedSeasonFixture: CompletedSeasonFixture | undefined;
let nilDecisionFixtures: NilDecisionFixtures | undefined;
let secondSeasonFixture: SecondSeasonFixture | undefined;

function completedSeason(): CompletedSeasonFixture {
  completedSeasonFixture ??= createCompletedSeasonFixture();
  return completedSeasonFixture;
}

function nilDecisions(): NilDecisionFixtures {
  nilDecisionFixtures ??= createNilDecisionFixtures();
  return nilDecisionFixtures;
}

function secondSeason(): SecondSeasonFixture {
  secondSeasonFixture ??= createSecondSeasonFixture('app-m6-offseason');
  return secondSeasonFixture;
}

function choosingCareer(seed = 'app-existing-career'): CareerRun {
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

function createdCareer(seed = 'app-existing-career'): CareerRun {
  const choosing = choosingCareer(seed);
  if (choosing.recruitingState.type !== 'CHOOSING') {
    throw new Error('Expected a recruiting shortlist.');
  }
  const committed = commitCareerProgramChoice(
    choosing,
    choosing.recruitingState.offers[0].programId,
  );
  if (!committed.ok) {
    throw new Error(committed.reason);
  }
  return committed.career;
}

function firstBreakthroughCareer(
  seed = 'app-first-breakthrough',
  plan: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId] = [
    'action_film_study',
    'action_film_study',
    'action_recovery',
  ],
): CareerRun {
  let career = createdCareer(seed);
  for (let week = 0; week < 13; week += 1) {
    const committed = commitCareerActionDraft(career, plan);
    if (!committed.ok) {
      throw new Error(committed.reason);
    }
    career = committed.career;
    for (let index = 0; index < 3; index += 1) {
      const resolved = resolveCareerNextAction(career);
      if (!resolved.ok) {
        throw new Error(resolved.reason);
      }
      career = resolved.career;
    }
    career = completeShippedGame(career);
    const advanced = advanceCareerWeek(career);
    if (!advanced.ok) {
      throw new Error(advanced.reason);
    }
    if (advanced.career.phase.type === 'SKILL_BREAKTHROUGH') {
      return advanced.career;
    }
    career = advanced.career;
  }
  throw new Error('Expected a gauge breakthrough.');
}

function completedPracticeCareer(
  seed: string,
  plan: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId] = [
    'action_extra_practice',
    'action_route_drills',
    'action_recovery',
  ],
): CareerRun {
  return completePracticeWeekFromCareer(createdCareer(seed), plan);
}

function completePracticeWeekFromCareer(
  inputCareer: CareerRun,
  plan: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId],
): CareerRun {
  const committed = commitCareerActionDraft(inputCareer, plan);
  if (!committed.ok) throw new Error(committed.reason);
  let career = committed.career;
  for (let index = 0; index < 3; index += 1) {
    const resolved = resolveCareerNextAction(career);
    if (!resolved.ok) throw new Error(resolved.reason);
    career = resolved.career;
  }
  if (career.phase.type !== 'WEEK_END') throw new Error('Expected a completed practice week.');
  return career;
}

function completedPracticeCareerWithOpportunity(): CareerRun {
  const created = createCareerFromDraft(
    {
      ...createDefaultCreationDraft(),
      displayName: 'M4 UI Athlete',
      personalityTraitIds: ['personality_competitive', 'personality_leader'],
      recruitingBackgroundId: 'background_legacy_recruit',
    },
    'm4-game-004',
  );
  if (!created.ok || created.career.recruitingState.type !== 'CHOOSING') {
    throw new Error('Expected the M4 UI recruiting fixture.');
  }
  const enrolled = commitCareerProgramChoice(created.career, 'program_high_desert_state');
  if (!enrolled.ok) throw new Error(enrolled.reason);
  let career = enrolled.career;
  for (let weekIndex = 0; weekIndex < 8; weekIndex += 1) {
    const weekEndCareer = completePracticeWeekFromCareer(career, [
      'action_extra_practice',
      'action_route_drills',
      'action_recovery',
    ]);
    const prepared = prepareCareerGame(weekEndCareer);
    if (
      prepared.ok &&
      prepared.career.phase.type === 'GAME_PREVIEW' &&
      prepared.career.phase.matchup.opportunityBudget > 0
    ) {
      return weekEndCareer;
    }
    const postGame = completeShippedGame(weekEndCareer);
    const advanced = advanceCareerWeek(postGame);
    if (!advanced.ok) throw new Error(advanced.reason);
    career = advanced.career;
    if (career.phase.type === 'SKILL_BREAKTHROUGH') {
      const chosen = chooseCareerSkillBreakthrough(career, career.phase.offer.offeredSkillIds[0]);
      if (!chosen.ok) throw new Error(chosen.reason);
      career = chosen.career;
    }
  }
  throw new Error('Expected a practice fixture with at least one key snap.');
}

function findBreakthroughCareerOffering(
  skillId: SkillId,
  seedPrefix: string,
  plan?: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId],
): CareerRun {
  for (let seedIndex = 0; seedIndex < 2_048; seedIndex += 1) {
    const career = firstBreakthroughCareer(`${seedPrefix}-${seedIndex}`, plan);
    if (
      career.phase.type === 'SKILL_BREAKTHROUGH' &&
      career.phase.offer.offeredSkillIds.includes(skillId)
    ) {
      return career;
    }
  }
  throw new Error(`Could not find a deterministic offer for ${skillId}.`);
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
  nextCareer = completeShippedGame(nextCareer);
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
  for (let week = 0; week < 13 && career.player.skillState.acquisitions.length < 2; week += 1) {
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

describe('production Career Hub', () => {
  it('honors explicit inactive selection even if a stale record remains in another namespace', async () => {
    const storage = new MemoryStorageAdapter();
    const careers = new CareerPersistence(storage, {
      contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    });
    await careers.replaceCurrentCareer(createTestCareer('inactive-wr'));
    await storage.put('settings', 'active-career-kind', 'POSITION_ALPHA');
    await renderApp('en-US', { storage });
    await waitForCreation();
    expect(screen.queryByTestId('career-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('boot-load-failed')).toBeVisible();
    cleanup();
    await storage.put('settings', 'active-career-kind', 'NONE');
    await renderApp('en-US', { storage });
    await waitForCreation();
    expect(screen.queryByTestId('career-screen')).not.toBeInTheDocument();
  });
  for (const locale of ['ko-KR', 'en-US'] as const) {
    it.each(POSITION_ALPHA_TRANSFER_CASES)(
      'continues the saved offseason and retains completed %s history in ' + locale,
      async (position, archetype) => {
        const fixture = createCompletedPositionAlphaFixture(position, archetype);
        const storage = new MemoryStorageAdapter();
        const careers = new PositionAlphaPersistence(storage);
        expect((await careers.saveSession(fixture.offseason, true)).ok).toBe(true);
        await renderApp(locale, { storage });
        const user = userEvent.setup();
        await waitFor(() => expect(screen.getByTestId('hub-open')).toBeEnabled());
        await user.click(screen.getByTestId('hub-open'));
        await user.click(screen.getByTestId('hub-continue'));
        expect(await careers.loadSession()).toMatchObject({ ok: true, session: fixture.offseason });
        cleanup();
        expect((await careers.saveSession(fixture.completed)).ok).toBe(true);
        const history = await storage.list('profile');
        await renderApp(locale, { storage });
        await waitFor(() => expect(screen.getByTestId('hub-open')).toBeEnabled());
        await user.click(screen.getByTestId('hub-open'));
        expect(screen.getByTestId('hub-continue')).toHaveTextContent(
          localeMessages[locale]['hub.review'],
        );
        expect(screen.queryByTestId('hub-abandon')).not.toBeInTheDocument();
        expect(screen.getByTestId('hub-alumni')).toHaveTextContent(
          fixture.completed.player.displayName,
        );
        await user.click(screen.getByTestId('hub-new'));
        await waitForCreation();
        expect(screen.queryByTestId('hub-confirmation')).not.toBeInTheDocument();
        expect(await storage.list('profile')).toEqual(history);
        await user.click(screen.getByTestId('hub-open'));
        expect(screen.getByTestId('hub-alumni')).toHaveTextContent(
          fixture.completed.player.displayName,
        );
      },
    );

    it(
      'reloads a career changed in another tab before permitting retirement in ' + locale,
      async () => {
        const storage = new MemoryStorageAdapter();
        const careers = new CareerPersistence(storage, {
          contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
        });
        await careers.replaceCurrentCareer(createTestCareer('first-tab'));
        await renderApp(locale, { storage });
        const user = userEvent.setup();
        await waitFor(() => expect(screen.getByTestId('hub-open')).toBeEnabled());
        const newer = createTestCareer('second-tab');
        await careers.replaceCurrentCareer(newer);
        const before = await storage.list('currentCareer');
        await user.click(screen.getByTestId('hub-open'));
        await user.click(screen.getByTestId('hub-new'));
        expect(await screen.findByTestId('hub-error')).toHaveTextContent(
          localeMessages[locale]['hub.changed'],
        );
        expect(await storage.list('currentCareer')).toEqual(before);
        await user.click(screen.getByTestId('hub-reload'));
        await waitFor(() => expect(screen.getByTestId('hub-open')).toBeEnabled());
        await user.click(screen.getByTestId('hub-open'));
        await user.click(screen.getByTestId('hub-new'));
        expect(await screen.findByTestId('hub-confirmation')).toBeVisible();
      },
    );
    it.each([['position_wr', null], ...POSITION_ALPHA_TRANSFER_CASES] as const)(
      'recovers, cancels, and retires %s without losing history/settings in ' + locale,
      async (position, archetype) => {
        const storage = new MemoryStorageAdapter();
        if (position === 'position_wr') {
          const careers = new CareerPersistence(storage, {
            contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
          });
          expect((await careers.replaceCurrentCareer(createTestCareer('hub-wr'))).ok).toBe(true);
        } else {
          const careers = new PositionAlphaPersistence(storage);
          const transferred = createTransferredPositionAlphaSession(position, archetype!);
          expect((await careers.saveSession(transferred, true)).ok).toBe(true);
          expect((await careers.saveSession(advancePositionAlphaFixture(transferred))).ok).toBe(
            true,
          );
        }
        await storage.delete(
          'currentCareer',
          position === 'position_wr' ? 'active' : POSITION_ALPHA_STORAGE_ID,
        );
        await storage.put('profile', 'history-proof', { earned: ['prior-record'] });
        await storage.put('settings', 'preference-proof', { locale });
        await renderApp(locale, { storage });
        const user = userEvent.setup();
        await waitFor(() => expect(screen.getByTestId('hub-open')).toBeEnabled());
        await user.click(screen.getByTestId('hub-open'));
        expect(screen.getByTestId('career-hub')).toHaveTextContent(
          localeMessages[locale]['hub.saved'],
        );
        expect(screen.getByTestId('career-hub')).toHaveTextContent(
          localeMessages[locale]['hub.recovered'],
        );
        const before = await storage.list('currentCareer');
        await user.click(screen.getByTestId('hub-new'));
        expect(await screen.findByTestId('hub-confirmation')).toHaveTextContent(
          localeMessages[locale]['hub.retireWarning'],
        );
        await user.click(screen.getByTestId('hub-cancel'));
        expect(await storage.list('currentCareer')).toEqual(before);
        await user.click(screen.getByTestId('hub-abandon'));
        await user.click(await screen.findByTestId('hub-confirm'));
        await waitFor(() =>
          expect(screen.getByTestId('career-hub')).toHaveTextContent(
            localeMessages[locale]['hub.empty'],
          ),
        );
        expect(await storage.list('currentCareer')).toEqual([]);
        expect(await storage.list('autosaveSnapshots')).toEqual([]);
        expect(await storage.get('profile', 'history-proof')).toEqual({ earned: ['prior-record'] });
        expect(await storage.get('settings', 'preference-proof')).toEqual({ locale });
        cleanup();
        await renderApp(locale, { storage });
        await waitForCreation();
        await user.click(screen.getByTestId('hub-open'));
        await user.click(screen.getByTestId('hub-new'));
        await waitForCreation();
      },
    );

    it(
      'retains an active run after a failed New confirmation and retries in ' + locale,
      async () => {
        const storage = new MemoryStorageAdapter();
        const careers = new CareerPersistence(storage, {
          contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
        });
        await careers.replaceCurrentCareer(createTestCareer('hub-new-retry'));
        await renderApp(locale, { storage });
        const user = userEvent.setup();
        await waitFor(() => expect(screen.getByTestId('hub-open')).toBeEnabled());
        await user.click(screen.getByTestId('hub-open'));
        await user.click(screen.getByTestId('hub-new'));
        await screen.findByTestId('hub-confirm');
        const before = await storage.list('currentCareer');
        vi.spyOn(storage, 'putMany').mockRejectedValueOnce(new Error('aborted'));
        await user.click(screen.getByTestId('hub-confirm'));
        expect(await screen.findByTestId('hub-error')).toHaveTextContent(
          localeMessages[locale]['hub.failed'],
        );
        expect(await storage.list('currentCareer')).toEqual(before);
        expect(screen.queryByTestId('creation-form')).not.toBeInTheDocument();
        await user.click(screen.getByTestId('hub-confirm'));
        await waitForCreation();
        expect(await storage.list('currentCareer')).toEqual([]);
      },
    );

    it(
      'requires two separate reset confirmations and permits cancellation in ' + locale,
      async () => {
        const storage = new MemoryStorageAdapter();
        await storage.put('profile', 'proof', { keep: true });
        await storage.put('settings', 'proof', { keep: true });
        await renderApp(locale, { storage });
        await waitForCreation();
        const user = userEvent.setup();
        await user.click(screen.getByTestId('hub-open'));
        await user.click(screen.getByTestId('hub-reset'));
        await user.click(await screen.findByTestId('hub-confirm'));
        expect(screen.getByTestId('hub-confirmation')).toHaveTextContent(
          localeMessages[locale]['hub.resetSecond'],
        );
        expect(await storage.get('profile', 'proof')).toEqual({ keep: true });
        await user.click(screen.getByTestId('hub-cancel'));
        expect(await storage.get('settings', 'proof')).toEqual({ keep: true });
        await user.click(screen.getByTestId('hub-reset'));
        await user.click(await screen.findByTestId('hub-confirm'));
        await user.click(screen.getByTestId('hub-confirm'));
        await waitFor(() =>
          expect(screen.queryByTestId('hub-confirmation')).not.toBeInTheDocument(),
        );
        expect(await storage.list('profile')).toEqual([]);
        expect(await storage.list('settings')).toEqual([
          { id: 'active-career-kind', value: 'NONE' },
        ]);
      },
    );
  }
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
    fireEvent.click(screen.getByTestId('career-nav-player'));
    expect(screen.getByText('190 lb')).toBeInTheDocument();
    await waitFor(() => expect(storage.localeWrites).toEqual(['en-US']));

    storage.releaseNextLocaleWrite();
    await waitFor(async () => expect(await storage.get('settings', 'locale')).toBe('en-US'));
    expect(storage.localeWrites).toEqual(['en-US']);
  });

  it.each(['ko-KR', 'en-US'] as const)(
    'provides five purpose-based career destinations in %s',
    async (locale) => {
      const user = userEvent.setup();
      await renderApp(locale, {
        persistence: new RecordingPersistence(
          successfulLoad(createdCareer(`navigation-${locale}`)),
        ),
      });
      await screen.findByTestId('weekly-phase');

      const navigation = screen.getByRole('navigation', {
        name: localeMessages[locale]['career.navigation.label'],
      });
      expect(within(navigation).getAllByRole('button')).toHaveLength(5);
      expect(screen.getByTestId('career-nav-week')).toHaveAttribute('aria-current', 'page');
      const strategyStatus = screen.getByTestId('weekly-strategy-status');
      expect(strategyStatus).toHaveTextContent(localeMessages[locale]['career.player.body']);
      expect(strategyStatus).toHaveTextContent(localeMessages[locale]['career.player.preparation']);
      expect(strategyStatus).toHaveTextContent(localeMessages[locale]['career.player.confidence']);

      await user.click(screen.getByTestId('career-nav-home'));
      expect(screen.getByTestId('destination-home')).toHaveTextContent(
        localeMessages[locale]['career.player.preparation'],
      );
      const roleStrip = screen.getByTestId('home-role-strip');
      expect(roleStrip).toHaveTextContent(localeMessages[locale]['career.program.depth.snaps']);
      expect(roleStrip).toHaveTextContent(localeMessages[locale]['career.program.depth.role']);
      expect(roleStrip).toHaveTextContent(localeMessages[locale]['career.player.coachTrust']);
      const homePortrait = within(screen.getByTestId('athletePortraitHome')).getByRole('img');
      expect(homePortrait).toHaveAttribute('data-hair-style', 'hair_style_close_crop');
      expect(screen.queryByTestId('weekly-phase')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('career-nav-team'));
      expect(screen.getByTestId('program-depth')).toBeVisible();
      expect(screen.queryByTestId('destination-home')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('career-nav-skills'));
      expect(screen.getByTestId('skills-empty')).toHaveTextContent(
        localeMessages[locale]['career.skills.empty'],
      );
      expect(screen.getByTestId('skill-breakthrough-gauge')).toBeVisible();
      expect(screen.getByTestId('skill-breakthrough-gauge-value')).toHaveTextContent('0 / 100');

      await user.click(screen.getByTestId('career-nav-player'));
      expect(
        screen.getByRole('heading', { name: localeMessages[locale]['career.player.profile'] }),
      ).toBeVisible();
      const playerPortrait = within(screen.getByTestId('athletePortraitPlayer')).getByRole('img');
      for (const attribute of [
        'data-body-type',
        'data-face',
        'data-hair-color',
        'data-hair-style',
        'data-skin-tone',
      ]) {
        expect(playerPortrait).toHaveAttribute(attribute, homePortrait.getAttribute(attribute));
      }
      const attributeGrid = screen.getByTestId('attribute-progress-grid');
      expect(attributeGrid.children).toHaveLength(16);
      expect(attributeGrid.querySelectorAll('[data-emphasized="true"]').length).toBeGreaterThan(0);
      expect(
        screen.getByRole('heading', {
          name: localeMessages[locale]['career.player.progression.title'],
        }),
      ).toBeVisible();
      const speedProgress = screen.getByTestId('attribute-progress-attribute_speed');
      expect(within(speedProgress).getByRole('progressbar')).toHaveAttribute(
        'aria-valuemax',
        '100',
      );
      const proficiencyList = screen.getByTestId('proficiency-progress-list');
      expect(proficiencyList.children).toHaveLength(7);
      expect(
        screen.getByRole('heading', {
          name: localeMessages[locale]['career.player.proficiency.title'],
        }),
      ).toBeVisible();
      expect(
        within(screen.getByTestId('proficiency-progress-proficiency_route_drills')).getByRole(
          'progressbar',
        ),
      ).toHaveAttribute('aria-valuemax', '1000');

      await user.click(screen.getByTestId('career-nav-week'));
      expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'PLAN_ACTIONS');
    },
  );
});

describe('contextual onboarding and help settings', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'shows and persists the first Creation guide in %s',
    async (locale) => {
      const user = userEvent.setup();
      const storage = new MemoryStorageAdapter();
      await renderApp(locale, {
        persistence: new RecordingPersistence(NOT_FOUND),
        storage,
      });
      await waitForCreation();

      const guide = screen.getByTestId('onboarding-creation');
      expect(guide).toHaveTextContent(localeMessages[locale]['onboarding.creation.title']);
      expect(guide).toHaveTextContent(localeMessages[locale]['onboarding.creation.consequence']);
      await user.click(screen.getByTestId('onboarding-complete-creation'));
      expect(screen.queryByTestId('onboarding-creation')).not.toBeInTheDocument();
      await waitFor(async () =>
        expect(
          (await storage.get<OnboardingSettings>('settings', ONBOARDING_SETTINGS_ID))
            ?.completedTopics,
        ).toEqual(['creation']),
      );
    },
  );

  it('reviews every guide from Help and replays one in its next context', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    await storage.put('settings', ONBOARDING_SETTINGS_ID, completeAllOnboarding());
    await renderApp('en-US', {
      persistence: new RecordingPersistence(successfulLoad(createdCareer('onboarding-help'))),
      storage,
    });
    await screen.findByTestId('weekly-phase');
    expect(screen.queryByTestId('onboarding-week')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('help-settings-open'));
    const help = screen.getByTestId('help-settings-panel');
    expect(help).toHaveTextContent(localeMessages['en-US']['help.intro']);
    await user.click(screen.getByTestId('help-review-team'));
    expect(screen.getByTestId('help-guide-review')).toHaveTextContent(
      localeMessages['en-US']['onboarding.team.consequence'],
    );
    await user.click(screen.getByTestId('help-replay-team'));
    expect(screen.queryByTestId('help-settings-panel')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('career-nav-team'));
    expect(screen.getByTestId('onboarding-team')).toHaveTextContent(
      localeMessages['en-US']['onboarding.team.title'],
    );
    await waitFor(async () =>
      expect(
        (await storage.get<OnboardingSettings>('settings', ONBOARDING_SETTINGS_ID))
          ?.completedTopics,
      ).toEqual(['creation', 'week', 'skills']),
    );

    await user.click(screen.getByTestId('onboarding-skip-all'));
    expect(screen.queryByTestId('onboarding-team')).not.toBeInTheDocument();
    await waitFor(async () =>
      expect(
        (await storage.get<OnboardingSettings>('settings', ONBOARDING_SETTINGS_ID))
          ?.completedTopics,
      ).toEqual(['creation', 'week', 'team', 'skills']),
    );
  });
});

describe('creation and canonical persistence', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'updates the graphical athlete identity live in %s',
    async (locale) => {
      const user = userEvent.setup();
      await renderApp(locale, { persistence: new RecordingPersistence(NOT_FOUND) });
      await waitForCreation();
      const portrait = within(screen.getByTestId('athletePortraitCreation')).getByRole('img');
      expect(portrait).toHaveAttribute('data-skin-tone', 'skin_tone_medium');
      expect(portrait).toHaveAttribute('data-hair-style', 'hair_style_close_crop');

      await user.selectOptions(
        screen.getByLabelText(localeMessages[locale]['creation.appearance.fields.skinTone']),
        'skin_tone_dark',
      );
      await user.selectOptions(
        screen.getByLabelText(localeMessages[locale]['creation.appearance.fields.hairStyle']),
        'hair_style_locs',
      );
      await user.selectOptions(
        screen.getByLabelText(localeMessages[locale]['creation.appearance.fields.gloves']),
        'gloves_accent',
      );
      expect(portrait).toHaveAttribute('data-skin-tone', 'skin_tone_dark');
      expect(portrait).toHaveAttribute('data-hair-style', 'hair_style_locs');
      expect(portrait).toHaveAttribute('data-gloves', 'gloves_accent');

      await user.type(screen.getByTestId('creation-name'), 'Live Preview');
      expect(portrait).toHaveAccessibleName(
        locale === 'ko-KR'
          ? 'Live Preview 선수의 저장된 외형'
          : 'Live Preview, saved player appearance',
      );
    },
  );

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
          name: localeMessages['en-US']['career.program.recruiting.title'],
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

describe('program recruiting and depth publication', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'keeps the five-offer decision visible until the committed room is saved in %s',
    async (locale) => {
      const user = userEvent.setup();
      const choosing = choosingCareer(`program-choice-${locale}`);
      if (choosing.recruitingState.type !== 'CHOOSING') {
        throw new Error('Expected program offers.');
      }
      const persistence = new RecordingPersistence(successfulLoad(choosing));
      persistence.deferNextSave = true;
      await renderApp(locale, { persistence });

      const panel = await screen.findByTestId('program-recruiting');
      expect(panel).toHaveTextContent(localeMessages[locale]['career.program.recruiting.help']);
      expect(screen.getAllByRole('radio')).toHaveLength(5);
      expect(screen.getByTestId('commit-program')).toBeDisabled();
      await waitFor(() =>
        expect(
          screen.getByRole('heading', {
            name: localeMessages[locale]['career.program.recruiting.title'],
          }),
        ).toHaveFocus(),
      );
      expect(panel).toHaveTextContent(localeMessages[locale]['career.program.rating.prestige']);
      expect(panel).toHaveTextContent(
        localeMessages[locale]['career.program.recruiting.schemeFit'],
      );

      const firstRadio = screen.getAllByRole('radio')[0];
      if (firstRadio === undefined) {
        throw new Error('Expected a first program radio.');
      }
      firstRadio.focus();
      await user.keyboard(' ');
      const selectedProgramId = (firstRadio as HTMLInputElement).value;
      await user.click(screen.getByTestId('commit-program'));
      await waitFor(() => expect(persistence.saves).toHaveLength(1));
      const saved = persistence.saves[0];
      if (saved === undefined) {
        throw new Error('Expected a pending committed program save.');
      }
      expect(saved.recruitingState.type).toBe('COMMITTED');
      expect(saved.programId).toBe(selectedProgramId);
      expect(saved.rng.drawCount - choosing.rng.drawCount).toBe(35);
      expect(screen.getByTestId('program-recruiting')).toBeVisible();
      expect(screen.queryByTestId('program-depth')).not.toBeInTheDocument();
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toBeDisabled();
      }

      await act(async () => persistence.settleDeferredSave(successfulSave(saved)));
      expect(screen.queryByTestId('program-recruiting')).not.toBeInTheDocument();
      expect(
        await screen.findByRole('heading', {
          name: localeMessages[locale]['career.week.plan.title'],
        }),
      ).toHaveFocus();
      await user.click(screen.getByTestId('career-nav-team'));
      const depth = await screen.findByTestId('program-depth');
      expect(depth).toHaveTextContent(localeMessages[locale]['career.program.depth.title']);
      await user.click(screen.getByText(localeMessages[locale]['career.program.room.title']));
      expect(screen.getAllByTestId(/^depth-row-/)).toHaveLength(8);
    },
  );

  it('retries the exact program commitment without publishing or consuming another draw', async () => {
    const user = userEvent.setup();
    const choosing = choosingCareer('program-choice-retry');
    const persistence = new RecordingPersistence(successfulLoad(choosing));
    persistence.failNextSave = true;
    await renderApp('en-US', { persistence });
    await screen.findByTestId('program-recruiting');

    await user.click(screen.getAllByRole('radio')[0] as HTMLElement);
    await user.click(screen.getByTestId('commit-program'));
    const warning = await screen.findByTestId('save-failure');
    expect(warning).toHaveFocus();
    const failedCareer = persistence.saves[0];
    if (failedCareer === undefined) {
      throw new Error('Expected a failed commitment payload.');
    }
    expect(screen.getByTestId('program-recruiting')).toBeVisible();
    expect(screen.queryByTestId('program-depth')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('retry-save'));
    await waitFor(() => expect(screen.queryByTestId('program-recruiting')).not.toBeInTheDocument());
    expect(persistence.saves).toHaveLength(2);
    expect(persistence.saves[1]).toEqual(failedCareer);
    expect(persistence.saves[1]?.rng).toEqual(failedCareer.rng);
    await user.click(screen.getByTestId('career-nav-team'));
    expect(screen.getByTestId('program-depth')).toBeVisible();
  });

  it('offers a save-aware recruiting handoff for a migrated planning career', async () => {
    const user = userEvent.setup();
    const legacyPlanning = createTestCareer('legacy-planning-program-handoff');
    const persistence = new RecordingPersistence(successfulLoad(legacyPlanning));
    await renderApp('en-US', { persistence });

    expect(await screen.findByTestId('recruiting-start')).toHaveTextContent(
      localeMessages['en-US']['career.program.recruiting.startHelp'],
    );
    expect(screen.queryByTestId('weekly-phase')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('begin-recruiting'));
    await waitFor(() => expect(persistence.saves).toHaveLength(1));
    expect(persistence.saves[0]?.recruitingState.type).toBe('CHOOSING');
    expect(persistence.saves[0]?.rng).toEqual(legacyPlanning.rng);
    expect(await screen.findByTestId('program-recruiting')).toBeVisible();
  });

  it.each(['ko-KR', 'en-US'] as const)(
    'surfaces the persisted weekly depth reason and updated projection in %s',
    async (locale) => {
      const user = userEvent.setup();
      let weekEnd = commitCareerActionDraft(createdCareer(`depth-reason-${locale}`), [
        'action_extra_practice',
        'action_route_drills',
        'action_recovery',
      ]);
      if (!weekEnd.ok) {
        throw new Error(weekEnd.reason);
      }
      for (let index = 0; index < 3; index += 1) {
        weekEnd = resolveCareerNextAction(weekEnd.career);
        if (!weekEnd.ok) {
          throw new Error(weekEnd.reason);
        }
      }
      if (weekEnd.career.phase.type !== 'WEEK_END' || weekEnd.career.phase.depthUpdate === null) {
        throw new Error('Expected weekly depth evidence.');
      }
      const evidence = weekEnd.career.phase.depthUpdate;
      await renderApp(locale, {
        persistence: new RecordingPersistence(successfulLoad(weekEnd.career)),
      });

      const movement = await screen.findByTestId('depth-movement');
      const movementKey =
        evidence.movement === 'PROMOTED'
          ? 'career.program.movement.promoted'
          : evidence.movement === 'DEMOTED'
            ? 'career.program.movement.demoted'
            : 'career.program.movement.held';
      expect(movement).toHaveTextContent(localeMessages[locale][movementKey]);
      expect(movement).toHaveTextContent(String(evidence.weeklyPracticeScore));
      if ('practiceGrade' in evidence) {
        const breakdown = screen.getByTestId('practice-grade-breakdown');
        await user.click(
          within(breakdown).getByText(
            localeMessages[locale]['career.program.movement.gradeBreakdown'],
          ),
        );
        expect(breakdown).toHaveTextContent(
          localeMessages[locale]['career.program.movement.gradeFormula'],
        );
        expect(breakdown).toHaveTextContent(
          localeMessages[locale]['career.program.movement.gradeFocus'],
        );
      }
      expect(screen.queryByTestId('preparation-rollover-preview')).not.toBeInTheDocument();
      expect(screen.getByTestId('advance-week')).toHaveTextContent(
        localeMessages[locale]['career.game.preview.open'],
      );
      await user.click(screen.getByTestId('career-nav-team'));
      expect(screen.getByTestId('depth-snap-outlook')).toHaveTextContent(
        localeMessages[locale]['career.program.depth.outlookTitle'],
      );
      expect(screen.getByTestId('depth-latest-review')).toHaveTextContent(
        String(evidence.weeklyPracticeScore),
      );
      expect(screen.getByTestId('depth-opportunity')).toHaveTextContent(
        localeMessages[locale]['career.program.opportunity.factor.talentFit'],
      );
      const suggestions = within(screen.getByTestId('depth-suggestions')).getAllByRole('listitem');
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    },
  );
});

describe('weekly phase flow and autosave boundaries', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'shows bilingual focus tradeoffs and persisted Preparation/Confidence results in %s',
    async (locale) => {
      let result = commitCareerActionDraft(createdCareer(`weekly-tensions-${locale}`), [
        'action_film_study',
        'action_recovery',
        'action_study_hall',
      ]);
      if (!result.ok) {
        throw new Error(result.reason);
      }
      result = resolveCareerNextAction(result.career);
      if (!result.ok) {
        throw new Error(result.reason);
      }
      await renderApp(locale, {
        persistence: new RecordingPersistence(successfulLoad(result.career)),
      });

      const latest = await screen.findByTestId('latest-result');
      expect(latest).toHaveTextContent(localeMessages[locale]['career.player.preparation']);
      expect(latest).toHaveTextContent(localeMessages[locale]['career.player.confidence']);
      expect(latest).toHaveTextContent('50 → 62');
      expect(latest).toHaveTextContent('50 → 51');
    },
  );

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
      expect(screen.getByTestId('skill-breakthrough-gauge')).toHaveAttribute('data-ready', 'true');
      expect(screen.getByTestId('skill-gauge-evidence')).toBeVisible();
      expect(screen.getByTestId('skill-choose-confirm')).toBeDisabled();
      // Heading presence precedes the passive-effect focus handoff on a lazy-loaded surface.
      await waitFor(() =>
        expect(
          screen.getByRole('heading', {
            name: localeMessages[locale]['career.week.breakthrough.title'],
          }),
        ).toHaveFocus(),
      );

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

      await user.click(screen.getByTestId('career-nav-skills'));
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
    await user.click(screen.getByTestId('career-nav-skills'));
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

    await user.click(screen.getByTestId('career-nav-week'));
    await draftThreeActions(user, ['action_route_drills', 'action_recovery', 'action_study_hall']);
    await user.click(screen.getByTestId('action-commit'));
    await waitFor(() => expect(persistence.saves).toHaveLength(3));
    await user.click(screen.getByTestId('career-nav-skills'));
    expect(screen.getAllByRole('combobox')).toHaveLength(4);
    for (const select of screen.getAllByRole('combobox')) {
      expect(select).toBeDisabled();
    }
    await user.click(screen.getByText(localeMessages['en-US']['career.skills.inventory.title']));
    expect(
      screen.getByText(localeMessages['en-US']['career.skills.inventory.locked']),
    ).toBeVisible();
  });

  it.each(['ko-KR', 'en-US'] as const)(
    'explains an authoritative applied Film Study skill trace in %s',
    async (locale) => {
      const learned = chooseOfferedSkill(
        findBreakthroughCareerOffering('skill_coverage_ledger_b', 'ui-evidence'),
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

  it.each(['ko-KR', 'en-US'] as const)(
    'publishes saved preview, key snaps, and postgame evidence in %s',
    async (locale) => {
      const user = userEvent.setup();
      const weekEndCareer = completedPracticeCareerWithOpportunity();
      const persistence = new RecordingPersistence(successfulLoad(weekEndCareer));
      await renderApp(locale, { persistence });
      await screen.findByTestId('weekly-phase');

      persistence.deferNextSave = true;
      await user.click(screen.getByTestId('advance-week'));
      await waitFor(() => expect(persistence.saves).toHaveLength(1));
      const previewCareer = persistence.saves[0];
      if (previewCareer?.phase.type !== 'GAME_PREVIEW') {
        throw new Error('Expected a saved game preview.');
      }
      expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'WEEK_END');
      expect(screen.getByTestId('advance-week')).toBeDisabled();
      await act(async () => {
        persistence.settleDeferredSave(successfulSave(previewCareer));
      });
      expect(await screen.findByTestId('game-preview')).toBeVisible();
      await waitFor(() =>
        expect(
          screen.getByRole('heading', {
            name: localeMessages[locale]['career.game.preview.title'],
          }),
        ).toHaveFocus(),
      );

      persistence.deferNextSave = true;
      await user.click(screen.getByTestId('start-game'));
      await waitFor(() => expect(persistence.saves).toHaveLength(2));
      const startedCareer = persistence.saves[1];
      if (startedCareer?.phase.type !== 'KEY_SNAP') {
        throw new Error('Expected a saved key snap for the UI fixture.');
      }
      expect(screen.getByTestId('game-preview')).toBeVisible();
      expect(screen.getByTestId('start-game')).toBeDisabled();
      await act(async () => {
        persistence.settleDeferredSave(successfulSave(startedCareer));
      });

      const firstSnap = await screen.findByTestId('game-key-snap');
      const firstChoiceButtons = within(firstSnap).getAllByTestId(/^game-decision-/);
      expect(firstChoiceButtons).toHaveLength(3);
      for (const decisionId of startedCareer.phase.pendingSnap.decisionIds) {
        const presentation = gameContent.decisions.find(({ id }) => id === decisionId);
        if (presentation === undefined) throw new Error(`Missing decision ${decisionId}.`);
        expect(screen.getByTestId(`game-decision-${decisionId}`)).toHaveTextContent(
          localeMessages[locale][presentation.nameKey as MessageKey],
        );
      }

      persistence.failNextSave = true;
      await user.click(firstChoiceButtons[0] as HTMLElement);
      const warning = await screen.findByTestId('save-failure');
      await waitFor(() => expect(warning).toHaveFocus());
      const failedResolution = persistence.saves.at(-1);
      if (
        failedResolution === undefined ||
        (failedResolution.phase.type !== 'KEY_SNAP' && failedResolution.phase.type !== 'POST_GAME')
      ) {
        throw new Error('Expected a saved key-snap resolution.');
      }
      expect(screen.getByTestId('game-key-snap')).toBeVisible();
      for (const button of within(screen.getByTestId('game-key-snap')).getAllByTestId(
        /^game-decision-/,
      )) {
        expect(button).toBeDisabled();
      }

      const failedSaveCount = persistence.saves.length;
      persistence.deferNextSave = true;
      await user.click(screen.getByTestId('retry-save'));
      await waitFor(() => expect(persistence.saves).toHaveLength(failedSaveCount + 1));
      expect(persistence.saves.at(-1)).toEqual(failedResolution);
      await act(async () => {
        persistence.settleDeferredSave(successfulSave(failedResolution));
      });

      let publishedCareer = failedResolution;
      for (
        let snapIndex = 1;
        snapIndex < 12 && publishedCareer.phase.type === 'KEY_SNAP';
        snapIndex += 1
      ) {
        const decisionId = publishedCareer.phase.pendingSnap.decisionIds[0];
        const saveCount = persistence.saves.length;
        await waitFor(() =>
          expect(screen.getByTestId(`game-decision-${decisionId}`)).toBeEnabled(),
        );
        await user.click(screen.getByTestId(`game-decision-${decisionId}`));
        await waitFor(() => expect(persistence.saves).toHaveLength(saveCount + 1));
        const nextCareer = persistence.saves.at(-1);
        if (nextCareer === undefined) throw new Error('Expected the next saved game state.');
        publishedCareer = nextCareer;
        await waitFor(() => expect(document.querySelector('#weekly-heading')).toHaveFocus());
      }
      if (publishedCareer.phase.type !== 'POST_GAME') {
        throw new Error(`Expected postgame, received ${publishedCareer.phase.type}.`);
      }
      const postGamePhase = publishedCareer.phase;

      const postGame = await screen.findByTestId('game-post-game');
      expect(postGame).toHaveTextContent(String(postGamePhase.summary.performanceGradeScore));
      expect(postGame).toHaveTextContent(String(postGamePhase.summary.statLine.targets));
      expect(screen.getByTestId('game-career-record')).toBeVisible();
      const participation = gameContent.participationFeedback.find(
        ({ id }) => id === postGamePhase.summary.participationFeedbackId,
      );
      if (participation === undefined) throw new Error('Missing participation presentation.');
      expect(screen.getByTestId('game-participation')).toHaveTextContent(
        localeMessages[locale][participation.nameKey as MessageKey],
      );
      await waitFor(() =>
        expect(
          screen.getByRole('heading', {
            name: localeMessages[locale]['career.game.postGame.title'],
          }),
        ).toHaveFocus(),
      );
      await user.click(
        within(postGame).getByText(localeMessages[locale]['career.game.postGame.plays']),
      );
      expect(within(screen.getByTestId('game-play-log')).getAllByRole('listitem')).toHaveLength(
        postGamePhase.summary.keySnapCount,
      );
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'publishes truthful zero-opportunity participation in %s',
    async (locale) => {
      let previewCareer: CareerRun | null = null;
      for (let seedIndex = 0; seedIndex < 32 && previewCareer === null; seedIndex += 1) {
        const weekEnd = completedPracticeCareer(`zero-opportunity-ui-${seedIndex}`, [
          'action_speed_work',
          'action_weight_room',
          'action_study_hall',
        ]);
        const prepared = prepareCareerGame(weekEnd);
        if (prepared.ok && prepared.career.phase.type === 'GAME_PREVIEW') {
          if (prepared.career.phase.matchup.opportunityBudget === 0)
            previewCareer = prepared.career;
        }
      }
      if (previewCareer === null) throw new Error('Expected a zero-opportunity preview fixture.');
      const completed = startCareerGame(previewCareer);
      if (!completed.ok) {
        throw new Error(completed.reason);
      }
      const completedCareer = completed.career;
      if (completedCareer.phase.type !== 'POST_GAME') {
        throw new Error('Expected a zero-opportunity game to finish from start.');
      }
      const completedPhase = completedCareer.phase;
      const persistence = new RecordingPersistence(successfulLoad(previewCareer));
      const user = userEvent.setup();
      await renderApp(locale, { persistence });
      await user.click(await screen.findByTestId('start-game'));
      const postGame = await screen.findByTestId('game-post-game');
      expect(screen.queryByTestId('game-key-snap')).not.toBeInTheDocument();
      expect(persistence.saves[0]).toEqual(completedCareer);
      expect(completedPhase.summary.statLine).toEqual({
        targets: 0,
        receptions: 0,
        receivingYards: 0,
        receivingTouchdowns: 0,
        drops: 0,
        turnovers: 0,
      });
      const participation = gameContent.participationFeedback.find(
        ({ id }) => id === completedPhase.summary.participationFeedbackId,
      );
      if (participation === undefined) throw new Error('Missing zero-opportunity feedback.');
      expect(postGame).toHaveTextContent(
        localeMessages[locale][participation.nameKey as MessageKey],
      );
      expect(postGame).toHaveTextContent(
        localeMessages[locale]['career.game.postGame.noAttributeXp'],
      );
    },
  );

  it('previews and then renders persisted passive recovery skill evidence', async () => {
    const user = userEvent.setup();
    const learned = chooseOfferedSkill(
      findBreakthroughCareerOffering('skill_compressed_recovery_s', 'ui-passive', [
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
      throw new Error('Expected a week-end game checkpoint.');
    }
    const postGameCareer = completeShippedGame(weekEndCareer);
    const persistence = new RecordingPersistence(successfulLoad(postGameCareer));
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
    const loadedCareer = createdCareer();
    const persistence = new RecordingPersistence(successfulLoad(loadedCareer));
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
    expect(persistence.saves[0]?.revision).toBe(loadedCareer.revision + 1);
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
    expect(persistence.saves.map(({ revision }) => revision)).toEqual([
      loadedCareer.revision + 1,
      loadedCareer.revision + 2,
      loadedCareer.revision + 3,
      loadedCareer.revision + 4,
    ]);
    expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'WEEK_END');
    expect(
      screen.getAllByText(localeMessages['en-US']['career.week.result.proficiency']).length,
    ).toBeGreaterThan(0);
    const routeProgress = screen.getAllByTestId('result-progress-attribute_wr_route_running')[0];
    expect(routeProgress).toBeDefined();
    if (routeProgress !== undefined) {
      expect(within(routeProgress).getByRole('progressbar')).toHaveAttribute(
        'aria-valuemax',
        '100',
      );
      expect(routeProgress).toHaveTextContent(
        localeMessages['en-US']['career.week.result.breakdown'],
      );
    }
    expect(
      screen.getAllByTestId('result-proficiency-proficiency_route_drills').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', {
        name: localeMessages['en-US']['career.week.end.title'],
      }),
    ).toHaveFocus();

    await user.click(screen.getByTestId('advance-week'));
    await waitFor(() => expect(persistence.saves).toHaveLength(5));
    expect(persistence.saves[4]?.revision).toBe(loadedCareer.revision + 5);
    expect(persistence.saves[4]?.weekIndex).toBe(0);
    expect(persistence.saves[4]?.phase.type).toBe('GAME_PREVIEW');
    await screen.findByTestId('game-preview');

    await user.click(screen.getByTestId('start-game'));
    await waitFor(() => expect(persistence.saves.length).toBeGreaterThanOrEqual(6));
    for (let snapIndex = 0; snapIndex < 12; snapIndex += 1) {
      if (screen.queryByTestId('game-post-game') !== null) break;
      const snap = await screen.findByTestId('game-key-snap');
      const choice = within(snap).getAllByTestId(/^game-decision-/)[0];
      if (choice === undefined) throw new Error('Expected a key-snap decision.');
      const saveCountBefore = persistence.saves.length;
      await user.click(choice);
      await waitFor(() => expect(persistence.saves.length).toBe(saveCountBefore + 1));
      await waitFor(() => {
        expect(
          screen.queryByTestId('game-post-game') ??
            within(screen.getByTestId('game-key-snap')).getAllByTestId(/^game-decision-/)[0],
        ).toBeEnabled();
      });
    }
    expect(await screen.findByTestId('game-post-game')).toBeVisible();
    const postGameSave = persistence.saves.at(-1);
    expect(postGameSave?.phase.type).toBe('POST_GAME');
    expect(postGameSave?.gameCareerState.gamesPlayed).toBe(1);

    const saveCountBeforeAdvance = persistence.saves.length;
    await user.click(screen.getByTestId('advance-week'));
    await waitFor(() => expect(persistence.saves).toHaveLength(saveCountBeforeAdvance + 1));
    const advancedSave = persistence.saves.at(-1);
    expect(advancedSave?.weekIndex).toBe(1);
    expect(screen.getByTestId('weekly-phase')).toHaveAttribute('data-phase', 'PLAN_ACTIONS');
    expect(advancedSave?.player.skillState.acquisitions).toHaveLength(0);
    expect(advancedSave?.player.skillState.breakthroughGauge.progress).toBeGreaterThan(0);
    expect(screen.queryByTestId('skill-breakthrough')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: localeMessages['en-US']['career.week.plan.title'],
      }),
    ).toHaveFocus();
  });

  it('blocks after save failures, focuses every remounted warning, and restores on success', async () => {
    const user = userEvent.setup();
    const loadedCareer = createdCareer('save-failure');
    const persistence = new RecordingPersistence(successfulLoad(loadedCareer));
    await renderApp('en-US', { persistence });
    await screen.findByTestId('weekly-phase');
    await draftThreeActions(user, ['action_route_drills', 'action_recovery', 'action_study_hall']);
    persistence.failNextSave = true;
    await user.click(screen.getByTestId('action-commit'));

    const initialWarning = await screen.findByTestId('save-failure');
    expect(initialWarning).toHaveTextContent(localeMessages['en-US']['career.save.failed']);
    await waitFor(() => expect(initialWarning).toHaveFocus());
    expect(screen.getByTestId('resolve-next')).toBeDisabled();
    expect(persistence.saves.map(({ revision }) => revision)).toEqual([loadedCareer.revision + 1]);

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
    expect(persistence.saves.map(({ revision }) => revision)).toEqual([
      loadedCareer.revision + 1,
      loadedCareer.revision + 1,
      loadedCareer.revision + 1,
    ]);
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

describe('M5 season review, completion, and returning legacy', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'atomically completes a reviewed season and carries visible history into creation in %s',
    async (locale) => {
      const user = userEvent.setup();
      const fixture = completedSeason();
      const storage = new MemoryStorageAdapter();
      const careerPersistence = new CareerPersistence(storage, {
        contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
      });
      expect((await careerPersistence.replaceCurrentSession(fixture.reviewSession)).ok).toBe(true);

      await renderApp(locale, { storage });
      const review = await screen.findByTestId('season-review');
      expect(review.textContent).not.toContain('{{');
      await user.click(
        within(review).getByRole('button', {
          name: localeMessages[locale]['career.season.review.completeCareer'],
        }),
      );

      const completion = await screen.findByTestId('career-complete');
      expect(completion).toHaveTextContent(fixture.reviewSession.career.player.displayName);
      expect(completion).toHaveTextContent(
        localeMessages[locale]['career.season.complete.legacyHelp'],
      );
      expect(completion.textContent).not.toContain('{{');

      const reloadedCareer = await careerPersistence.loadCareer();
      expect(reloadedCareer.ok).toBe(true);
      if (!reloadedCareer.ok) return;
      expect(reloadedCareer.session).toEqual(fixture.completedSession);
      const reloadedMeta = await new MetaProfilePersistence(storage, {
        contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
      }).loadMetaProfile();
      expect(reloadedMeta.ok).toBe(true);
      if (!reloadedMeta.ok) return;
      expect(reloadedMeta.meta).toEqual(fixture.completedMeta);

      await user.click(
        within(completion).getByRole('button', {
          name: localeMessages[locale]['career.season.complete.nextCareer'],
        }),
      );
      const creationLegacy = await screen.findByTestId('creation-legacy');
      expect(creationLegacy).toHaveTextContent(fixture.reviewSession.career.player.displayName);
      expect(creationLegacy).toHaveTextContent(String(fixture.completedMeta.alumni.length));
      expect(creationLegacy.textContent).not.toContain('{');
    },
  );

  it('keeps review authoritative, focuses the failure, and retries the exact alumni transaction', async () => {
    const user = userEvent.setup();
    const fixture = completedSeason();
    const storage = new FailOnceBatchStorage();
    const careerPersistence = new CareerPersistence(storage, {
      contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    });
    expect((await careerPersistence.replaceCurrentSession(fixture.reviewSession)).ok).toBe(true);
    storage.failNextBatch = true;

    await renderApp('en-US', { storage });
    const review = await screen.findByTestId('season-review');
    const completeButton = within(review).getByRole('button', {
      name: localeMessages['en-US']['career.season.review.completeCareer'],
    });
    await user.click(completeButton);

    const warning = await screen.findByTestId('save-failure');
    await waitFor(() => expect(warning).toHaveFocus());
    expect(screen.getByTestId('season-review')).toBeVisible();
    expect(completeButton).toBeDisabled();
    expect(screen.queryByTestId('career-complete')).not.toBeInTheDocument();
    const stillReview = await careerPersistence.loadCareer();
    expect(stillReview.ok && stillReview.session).toEqual(fixture.reviewSession);

    await user.click(
      within(warning).getByRole('button', {
        name: localeMessages['en-US']['career.save.retry'],
      }),
    );
    expect(await screen.findByTestId('career-complete')).toBeVisible();
    expect((await careerPersistence.loadCareer()).ok).toBe(true);
  });
});

describe('M6 offseason persistence flow', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'saves one projected program decision before publishing and bootstraps season two in %s',
    async (locale) => {
      const user = userEvent.setup();
      const fixture = secondSeason();
      const projected = fixture.projectedSession.career.offFieldCareerState.offseason;
      if (projected.status !== 'PROJECTED') throw new Error('Expected projected offseason.');
      const transferProgramId = projected.transferProjection.transferOptions[0].programId;
      const storage = new MemoryStorageAdapter();
      const careerPersistence = new CareerPersistence(storage, {
        contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
      });
      expect((await careerPersistence.replaceCurrentSession(fixture.reviewSession)).ok).toBe(true);

      await renderApp(locale, { storage });
      const entry = await screen.findByTestId('offseason-entry');
      await user.click(
        within(entry).getByRole('button', {
          name: localeMessages[locale]['career.offField.offseason.project'],
        }),
      );
      const option = await screen.findByTestId(`offseason-option-${transferProgramId}`);
      await user.click(within(option).getByRole('button'));

      const decided = await screen.findByTestId('offseason-decided');
      expect(decided).toHaveTextContent(
        localeMessages[locale]['career.offField.offseason.decidedTitle'],
      );
      const savedDecision = await careerPersistence.loadCareer();
      expect(savedDecision.ok).toBe(true);
      if (!savedDecision.ok) return;
      const savedOffseason = savedDecision.session.career.offFieldCareerState.offseason;
      expect(savedOffseason.status).toBe('DECIDED');
      if (savedOffseason.status !== 'DECIDED') return;
      expect(savedOffseason.lastDecision.selectedProgramId).toBe(transferProgramId);

      await user.click(
        within(decided).getByRole('button', {
          name: localeMessages[locale]['career.offField.offseason.startNext'],
        }),
      );
      expect(await screen.findByTestId('action-draft')).toBeVisible();
      const savedNextSeason = await careerPersistence.loadCareer();
      expect(savedNextSeason.ok).toBe(true);
      if (!savedNextSeason.ok) return;
      expect(savedNextSeason.career.seasonCareerState.bootstrapStatus).toBe('ACTIVE');
      expect(savedNextSeason.career.seasonCareerState.seasonsCompleted).toBe(1);
      expect(savedNextSeason.career.programId).toBe(transferProgramId);
      await user.click(
        screen.getByRole('button', { name: localeMessages[locale]['career.navigation.team'] }),
      );
      const transferredDepth = await screen.findByTestId('program-depth');
      const destination = programContent.programs.find(({ id }) => id === transferProgramId);
      if (destination === undefined) throw new Error('Expected destination content.');
      expect(transferredDepth).toHaveTextContent(
        localeMessages[locale][destination.shortNameKey as MessageKey],
      );
    },
  );
});

describe('M7.5 current-program recovery routing', () => {
  it.each(POSITION_ALPHA_TRANSFER_CASES)(
    'renders the recovered current Team room after a %s transfer',
    async (positionId, archetypeId) => {
      const storage = new MemoryStorageAdapter();
      const transferred = createTransferredPositionAlphaSession(
        positionId,
        archetypeId,
        'app-team-recovery',
      );
      const persistence = new PositionAlphaPersistence(storage, {
        now: () => new Date('2026-09-01T12:00:00.000Z'),
      });
      expect((await persistence.saveSession(transferred, true)).ok).toBe(true);
      expect((await persistence.saveSession(advancePositionAlphaFixture(transferred))).ok).toBe(
        true,
      );
      const current = await storage.get<Record<string, unknown>>(
        'currentCareer',
        POSITION_ALPHA_STORAGE_ID,
      );
      await storage.put('currentCareer', POSITION_ALPHA_STORAGE_ID, {
        ...current,
        checksum: 'fnv1a32:00000000',
      });

      await renderApp('en-US', { storage });
      expect(await screen.findByTestId('position-alpha-career')).toBeVisible();
      await userEvent
        .setup()
        .click(screen.getByRole('button', { name: localeMessages['en-US']['m7Ui.nav.team'] }));
      expect(screen.getByText(localeMessages['en-US']['m7Ui.team.depthHelp'])).toBeVisible();
      expect(screen.getByText(localeMessages['en-US']['m7Direct.shell.roomHelp'])).toBeVisible();
      cleanup();
    },
  );
});

describe('M6 weekly off-field persistence flow', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'saves NIL acceptance and requires the due commitment before weekly planning in %s',
    async (locale) => {
      const user = userEvent.setup();
      const storage = new MemoryStorageAdapter();
      const careerPersistence = new CareerPersistence(storage, {
        contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
      });
      expect((await careerPersistence.replaceCurrentSession(nilDecisions().offerSession)).ok).toBe(
        true,
      );

      await renderApp(locale, { storage });
      const offer = await screen.findByTestId('nil-offer-decision');
      await user.click(
        within(offer).getByRole('button', {
          name: localeMessages[locale]['career.offField.nil.accept'],
        }),
      );

      const obligation = await screen.findByTestId('nil-obligation-decision');
      expect(screen.queryByTestId('action-draft')).not.toBeInTheDocument();
      await user.click(
        within(obligation).getByRole('button', {
          name: localeMessages[locale]['career.offField.nil.fulfill'],
        }),
      );

      expect(await screen.findByTestId('action-draft')).toBeVisible();
      expect(screen.queryByTestId('nil-obligation-decision')).not.toBeInTheDocument();
      const saved = await careerPersistence.loadCareer();
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;
      const nil = saved.career.offFieldCareerState.nil;
      if (!('bootstrapStatus' in nil)) throw new Error('Expected active NIL state.');
      expect(nil.history.at(-1)?.model).toBe('nil_obligation_resolution_v1');
    },
  );

  it('keeps the pending NIL offer authoritative when its save fails and retries the exact choice', async () => {
    const user = userEvent.setup();
    const storage = new FailOnceBatchStorage();
    const careerPersistence = new CareerPersistence(storage, {
      contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    });
    expect((await careerPersistence.replaceCurrentSession(nilDecisions().offerSession)).ok).toBe(
      true,
    );
    storage.failNextBatch = true;

    await renderApp('en-US', { storage });
    const offer = await screen.findByTestId('nil-offer-decision');
    await user.click(
      within(offer).getByRole('button', {
        name: localeMessages['en-US']['career.offField.nil.accept'],
      }),
    );

    const warning = await screen.findByTestId('save-failure');
    await waitFor(() => expect(warning).toHaveFocus());
    expect(screen.getByTestId('nil-offer-decision')).toBeVisible();
    expect(screen.queryByTestId('nil-obligation-decision')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('nil-offer-decision')).getByRole('button', {
        name: localeMessages['en-US']['career.offField.nil.accept'],
      }),
    ).toBeDisabled();

    await user.click(
      within(warning).getByRole('button', {
        name: localeMessages['en-US']['career.save.retry'],
      }),
    );
    expect(await screen.findByTestId('nil-obligation-decision')).toBeVisible();
    expect(screen.queryByTestId('nil-offer-decision')).not.toBeInTheDocument();
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
