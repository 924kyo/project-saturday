import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CareerRun, RngSeed, SkillId, WeeklyActionId } from '@project-saturday/game-core';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type MessageKey,
  type SupportedLocale,
} from '@project-saturday/game-content/locales';

import { CareerScreen } from './career/CareerScreen';
import { CreationScreen } from './career/CreationScreen';
import {
  advanceCareerWeek,
  commitCareerActionDraft,
  createCareerFromDraft,
  resolveCareerNextAction,
  type CreationDraft,
  type CreationUiIssueCode,
} from './career/career-ui';
import { chooseCareerSkillBreakthrough, setCareerEquippedSkillSlot } from './career/skill-ui';
import { useAppTranslation } from './i18n/i18n';
import { persistLocale } from './i18n/locale';
import { PwaUpdatePrompt } from './pwa/PwaUpdatePrompt';
import {
  CareerPersistence,
  SHIPPED_CAREER_CONTENT_VERSION,
  requestPersistentStorage,
  type LoadCareerResult,
  type SaveCareerResult,
  type StorageAdapter,
} from './storage';

const LOCALE_LABEL_KEYS = {
  'ko-KR': 'locale.koKR',
  'en-US': 'locale.enUS',
} as const satisfies Record<SupportedLocale, MessageKey>;

const LOCALE_OPTIONS = Object.keys(LOCALE_LABEL_KEYS) as SupportedLocale[];

export interface CareerPersistencePort {
  loadCareer(): Promise<LoadCareerResult>;
  replaceCurrentCareer(career: CareerRun): Promise<SaveCareerResult>;
  saveCareer(career: CareerRun): Promise<SaveCareerResult>;
}

interface PendingSave {
  readonly career: CareerRun;
  readonly mode: 'replace' | 'save';
  readonly publication: 'after-save' | 'optimistic';
}

type BootNotice = 'load-failed' | 'no-valid-save' | 'partial-load' | 'recovered';

export interface AppProps {
  readonly careerSeedFactory?: () => RngSeed;
  readonly persistence?: CareerPersistencePort;
  readonly storage: StorageAdapter;
}

function createBrowserCareerSeed(): RngSeed {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `career-seed:${globalThis.crypto.randomUUID()}`;
  }
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const words = new Uint32Array(4);
    globalThis.crypto.getRandomValues(words);
    return `career-seed:${[...words].map((word) => word.toString(16).padStart(8, '0')).join('')}`;
  }
  return `career-seed:${Date.now().toString(36)}`;
}

export function App({
  careerSeedFactory = createBrowserCareerSeed,
  persistence: injectedPersistence,
  storage,
}: AppProps): React.JSX.Element {
  const { i18n } = useAppTranslation();
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(() =>
    isSupportedLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LOCALE,
  );
  const { t } = useAppTranslation(activeLocale);
  const latestLocaleRequestRef = useRef(0);
  const latestRequestedLocaleRef = useRef(activeLocale);
  const localePersistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const defaultPersistence = useMemo(
    () =>
      new CareerPersistence(storage, {
        contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
      }),
    [storage],
  );
  const persistence = injectedPersistence ?? defaultPersistence;
  const [booting, setBooting] = useState(true);
  const [bootNotice, setBootNotice] = useState<BootNotice | null>(null);
  const [career, setCareer] = useState<CareerRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [creationIssues, setCreationIssues] = useState<readonly CreationUiIssueCode[]>([]);
  const [commandFailed, setCommandFailed] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const saveWarningRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    document.documentElement.lang = activeLocale;
    document.title = t('app.title');
  }, [activeLocale, t]);

  useEffect(() => {
    let active = true;
    void persistence.loadCareer().then((result) => {
      if (!active) {
        return;
      }
      if (result.ok) {
        setCareer(result.career);
        setBootNotice(
          result.recovered ? 'recovered' : result.warnings.length > 0 ? 'partial-load' : null,
        );
      } else if (result.reason === 'career_load.not_found') {
        setCareer(null);
      } else {
        setCareer(null);
        setBootNotice(
          result.reason === 'career_load.no_valid_save' ? 'no-valid-save' : 'load-failed',
        );
      }
      setBooting(false);
    });
    return () => {
      active = false;
    };
  }, [persistence]);

  useEffect(() => {
    if (pendingSave !== null && !busy) {
      saveWarningRef.current?.focus();
    }
  }, [busy, pendingSave]);

  function selectLocale(locale: SupportedLocale): void {
    const requestId = latestLocaleRequestRef.current + 1;
    latestLocaleRequestRef.current = requestId;
    latestRequestedLocaleRef.current = locale;
    setActiveLocale(locale);
    void (async () => {
      await i18n.changeLanguage(locale);
      if (requestId !== latestLocaleRequestRef.current) {
        await i18n.changeLanguage(latestRequestedLocaleRef.current);
      }
    })().catch((error: unknown) => {
      console.error(error);
    });
    localePersistenceQueueRef.current = localePersistenceQueueRef.current
      .then(async () => {
        if (requestId !== latestLocaleRequestRef.current) {
          return;
        }
        await persistLocale(storage, locale);
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    void requestPersistentStorage();
  }

  function applyLoadResult(result: LoadCareerResult): void {
    if (result.ok) {
      setCareer(result.career);
      setPendingSave(null);
      setCommandFailed(false);
      setBootNotice(
        result.recovered ? 'recovered' : result.warnings.length > 0 ? 'partial-load' : null,
      );
      return;
    }
    setBootNotice(result.reason === 'career_load.no_valid_save' ? 'no-valid-save' : 'load-failed');
  }

  async function reloadCareer(): Promise<void> {
    setBusy(true);
    const result = await persistence.loadCareer();
    applyLoadResult(result);
    setBusy(false);
  }

  async function savePending(pending: PendingSave): Promise<void> {
    setBusy(true);
    const result =
      pending.mode === 'replace'
        ? await persistence.replaceCurrentCareer(pending.career)
        : await persistence.saveCareer(pending.career);
    if (result.ok) {
      if (pending.publication === 'after-save') {
        setCareer(pending.career);
      }
      setPendingSave(null);
      setCommandFailed(false);
      setBootNotice(null);
      void requestPersistentStorage();
    } else {
      setPendingSave(pending);
    }
    setBusy(false);
  }

  function persistTransition(
    nextCareer: CareerRun,
    publication: PendingSave['publication'] = 'optimistic',
  ): void {
    const nextPending = { career: nextCareer, mode: 'save' as const, publication };
    setCommandFailed(false);
    if (publication === 'optimistic') {
      setCareer(nextCareer);
    }
    setPendingSave(nextPending);
    void savePending(nextPending);
  }

  function createCareer(draft: CreationDraft): void {
    setCreationIssues([]);
    const result = createCareerFromDraft(draft, careerSeedFactory());
    if (!result.ok) {
      setCreationIssues(result.issues);
      return;
    }
    const nextPending = {
      career: result.career,
      mode: 'replace' as const,
      publication: 'optimistic' as const,
    };
    setCareer(result.career);
    setPendingSave(nextPending);
    void savePending(nextPending);
  }

  function commitDraft(draft: readonly WeeklyActionId[]): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = commitCareerActionDraft(career, draft);
    if (result.ok) {
      persistTransition(result.career);
    } else {
      setCommandFailed(true);
    }
  }

  function resolveAction(): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = resolveCareerNextAction(career);
    if (result.ok) {
      persistTransition(result.career);
    } else {
      setCommandFailed(true);
    }
  }

  function advanceWeek(): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = advanceCareerWeek(career);
    if (result.ok) {
      persistTransition(result.career);
    } else {
      setCommandFailed(true);
    }
  }

  function chooseSkill(skillId: SkillId): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = chooseCareerSkillBreakthrough(career, skillId);
    if (result.ok) {
      persistTransition(result.career, 'after-save');
    } else {
      setCommandFailed(true);
    }
  }

  function setSkillSlot(slotIndex: number, skillId: SkillId | null): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = setCareerEquippedSkillSlot(career, slotIndex, skillId);
    if (result.ok) {
      persistTransition(result.career);
    } else {
      setCommandFailed(true);
    }
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <span>{t('app.title')}</span>
        </div>
        <div className="locale-switcher" role="group" aria-label={t('locale.label')}>
          {LOCALE_OPTIONS.map((locale) => (
            <button
              key={locale}
              className="locale-switcher__button"
              type="button"
              aria-pressed={activeLocale === locale}
              data-testid={`locale-${locale}`}
              onClick={() => selectLocale(locale)}
            >
              {t(LOCALE_LABEL_KEYS[locale])}
            </button>
          ))}
        </div>
      </header>

      <div className="system-notices">
        {storage.durability === 'memory' && (
          <aside className="storage-warning" data-testid="storage-warning" role="alert">
            <span className="storage-warning__signal" aria-hidden="true" />
            <p>{t('storage.degradedWarning')}</p>
          </aside>
        )}
        {bootNotice !== null && (
          <aside className="system-message" role="status" data-testid={`boot-${bootNotice}`}>
            {t(
              bootNotice === 'recovered'
                ? 'career.boot.recovered'
                : bootNotice === 'partial-load'
                  ? 'career.boot.partialLoad'
                  : bootNotice === 'no-valid-save'
                    ? 'career.boot.noValidSave'
                    : 'career.boot.loadFailed',
            )}
          </aside>
        )}
        {pendingSave !== null && !busy && (
          <aside
            ref={saveWarningRef}
            className="save-warning"
            data-testid="save-failure"
            role="alert"
            tabIndex={-1}
          >
            <p>{t('career.save.failed')}</p>
            <div>
              <button
                className="button button--primary"
                data-testid="retry-save"
                type="button"
                onClick={() => void savePending(pendingSave)}
              >
                {t('career.save.retry')}
              </button>
              <button
                className="button button--quiet"
                data-testid="reload-career"
                type="button"
                onClick={() => void reloadCareer()}
              >
                {t('career.save.reload')}
              </button>
            </div>
          </aside>
        )}
        {commandFailed && (
          <aside className="save-warning" role="alert">
            <p>{t('career.command.failed')}</p>
          </aside>
        )}
      </div>

      {booting ? (
        <main className="boot-screen" data-testid="career-loading" aria-live="polite">
          <div className="loading-mark" aria-hidden="true" />
          <p>{t('career.boot.loading')}</p>
        </main>
      ) : career === null ? (
        <CreationScreen
          busy={busy}
          issues={creationIssues}
          locale={activeLocale}
          onCreate={createCareer}
        />
      ) : (
        <CareerScreen
          key={career.id}
          busy={busy}
          career={career}
          locale={activeLocale}
          saveBlocked={pendingSave !== null}
          onAdvance={advanceWeek}
          onChooseSkill={chooseSkill}
          onCommit={commitDraft}
          onResolve={resolveAction}
          onSetSkillSlot={setSkillSlot}
        />
      )}

      <PwaUpdatePrompt locale={activeLocale} />
    </div>
  );
}
