import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  CareerRun,
  CareerSession,
  EventChoiceId,
  InjuryChoiceId,
  KeySnapDecisionId,
  MetaProfileV1,
  NilObligationResolutionId,
  NilOfferDecisionId,
  NilOfferId,
  PositionAlphaSessionV2,
  PositionAlphaSessionCommandMechanics,
  PositionAlphaCommandResultV2,
  PositionId,
  ProgramId,
  RngSeed,
  SkillId,
  WeeklyActionId,
} from '@project-saturday/game-core';
import {
  createCareerSession,
  createEmptyMetaProfile,
  commitPositionAlphaFocusPlanV2,
  advancePositionAlphaGameDayV2,
  resolvePositionAlphaEventV2,
  resolvePositionAlphaInjuryChoiceV2,
  resolvePositionAlphaGameDaySnapV2,
  settlePositionAlphaGameDayV2,
  beginPositionAlphaPostseasonV2,
  advancePositionAlphaPostseasonRoundV2,
  reviewPositionAlphaSeasonV2,
  commitPositionAlphaOffseasonV2,
  completePositionAlphaCareerV2,
  choosePositionAlphaSkillV2,
  equipPositionAlphaSkillV2,
  resolvePositionAlphaNilPlanningV2,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  createShippedPositionAlphaSessionV2,
} from '@project-saturday/game-content';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type MessageKey,
  type SupportedLocale,
} from '@project-saturday/game-content/locales';

import { CreationScreen } from './career/CreationScreen';
import { CareerHub, type CareerHubProps, type HubAction } from './career/CareerHub';
import {
  CareerManagementConflict,
  CareerManagementPersistence,
  type CareerManagementCheckpoint,
} from './storage/career-management';
import {
  CareerPositionSelector,
  PositionAlphaCreation,
  type PositionAlphaCreationRequest,
} from './career/PositionAlphaExperience';
import {
  advanceCareerWeek,
  beginCareerRecruiting,
  commitCareerActionDraft,
  commitCareerProgramChoice,
  createCareerFromDraft,
  prepareCareerGame,
  resolveCareerKeySnap,
  resolveCareerNextAction,
  startCareerGame,
  type CreationDraft,
  type CreationUiIssueCode,
} from './career/career-ui';
import { chooseCareerSkillBreakthrough, setCareerEquippedSkillSlot } from './career/skill-ui';
import {
  bootstrapCareerNextSeason,
  bootstrapCareerSeason,
  completeCareerSeason,
  completeShippedSeasonGameWeek,
  continueShippedSeasonWeek,
  decideCareerNilOffer,
  decideCareerOffseason,
  enterCareerSeasonReview,
  initializeCareerPostseason,
  projectCareerOffseason,
  replaceSessionCareer,
  resolveCareerNilObligation,
  resolveSeasonEventChoice,
  resolveSeasonInjuryChoice,
} from './career/season-ui';
import { useAppTranslation } from './i18n/i18n';
import { persistLocale } from './i18n/locale';
import { HelpSettingsPanel } from './onboarding/OnboardingUi';
import {
  completeAllOnboarding,
  completeOnboardingTopic,
  createDefaultOnboardingSettings,
  loadOnboardingSettings,
  persistOnboardingSettings,
  replayOnboardingTopic,
  type OnboardingSettings,
  type OnboardingTopic,
} from './onboarding/onboarding';
import { PwaUpdatePrompt } from './pwa/PwaUpdatePrompt';
import {
  CareerPersistence,
  CareerCompletionPersistence,
  MetaProfilePersistence,
  SHIPPED_CAREER_CONTENT_VERSION,
  ACTIVE_CAREER_KIND_STORAGE_ID,
  PositionAlphaPersistenceV3,
  requestPersistentStorage,
  type LoadCareerResult,
  type LoadMetaProfileResult,
  type SaveCareerCompletionResult,
  type SaveCareerResult,
  type StorageAdapter,
} from './storage';

const LOCALE_LABEL_KEYS = {
  'ko-KR': 'locale.koKR',
  'en-US': 'locale.enUS',
} as const satisfies Record<SupportedLocale, MessageKey>;

const LOCALE_OPTIONS = Object.keys(LOCALE_LABEL_KEYS) as SupportedLocale[];

const CareerScreen = lazy(async () => {
  const module = await import('./career/CareerScreen');
  return { default: module.CareerScreen };
});
const PositionAlphaCareerV2 = lazy(async () => {
  const module = await import('./career/PositionAlphaCareerV2');
  return { default: module.PositionAlphaCareerV2 };
});

export interface CareerPersistencePort {
  loadCareer(): Promise<LoadCareerResult>;
  loadMetaProfile?(): Promise<LoadMetaProfileResult>;
  replaceCurrentCareer(career: CareerRun): Promise<SaveCareerResult>;
  replaceCurrentSession?(session: CareerSession): Promise<SaveCareerResult>;
  saveCompletedCareer?(
    session: CareerSession,
    meta: MetaProfileV1,
  ): Promise<SaveCareerCompletionResult>;
  saveCareer(career: CareerRun): Promise<SaveCareerResult>;
  saveSession?(session: CareerSession): Promise<SaveCareerResult>;
}

interface PendingSessionSave {
  readonly kind: 'session';
  readonly session: CareerSession;
  readonly mode: 'replace' | 'save';
  readonly publication: 'after-save' | 'optimistic';
}

interface PendingCompletionSave {
  readonly kind: 'completion';
  readonly session: CareerSession;
  readonly meta: MetaProfileV1;
  readonly publication: 'after-save';
}

type PendingSave = PendingSessionSave | PendingCompletionSave;

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
  const defaultPersistence = useMemo((): CareerPersistencePort => {
    const options = {
      contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    } as const;
    const careerPersistence = new CareerPersistence(storage, options);
    const metaPersistence = new MetaProfilePersistence(storage, options);
    const completionPersistence = new CareerCompletionPersistence(storage, options);
    return {
      loadCareer: () => careerPersistence.loadCareer(),
      loadMetaProfile: () => metaPersistence.loadMetaProfile(),
      replaceCurrentCareer: (career) => careerPersistence.replaceCurrentCareer(career),
      replaceCurrentSession: (session) => careerPersistence.replaceCurrentSession(session),
      saveCareer: (career) => careerPersistence.saveCareer(career),
      saveCompletedCareer: (session, meta) =>
        completionPersistence.saveCompletedCareer(session, meta),
      saveSession: (session) => careerPersistence.saveSession(session),
    };
  }, [storage]);
  const persistence = injectedPersistence ?? defaultPersistence;
  const positionPersistence = useMemo(() => new PositionAlphaPersistenceV3(storage), [storage]);
  const careerManagement = useMemo(() => new CareerManagementPersistence(storage), [storage]);
  const seasonFlowEnabled =
    persistence.loadMetaProfile !== undefined &&
    persistence.replaceCurrentSession !== undefined &&
    persistence.saveSession !== undefined &&
    persistence.saveCompletedCareer !== undefined;
  const [booting, setBooting] = useState(true);
  const [bootReloadNonce, setBootReloadNonce] = useState(0);
  const [bootNotice, setBootNotice] = useState<BootNotice | null>(null);
  const [session, setSession] = useState<CareerSession | null>(null);
  const [positionSession, setPositionSession] = useState<PositionAlphaSessionV2 | null>(null);
  const positionMechanics = useMemo(
    () =>
      positionSession === null
        ? null
        : buildShippedPositionAlphaSessionCommandMechanics({ identity: positionSession.player }),
    [positionSession],
  );
  const positionPendingRef = useRef<PositionAlphaSessionV2 | null>(null);
  const positionSaveInFlightRef = useRef(false);
  const [selectedCreationPositionId, setSelectedCreationPositionId] =
    useState<PositionId>('position_wr');
  const [pendingPositionSession, setPendingPositionSession] =
    useState<PositionAlphaSessionV2 | null>(null);
  const [positionSaveFailed, setPositionSaveFailed] = useState(false);
  const [meta, setMeta] = useState<MetaProfileV1>(createEmptyMetaProfile);
  const career = session?.career ?? null;
  const [busy, setBusy] = useState(false);
  const [creationIssues, setCreationIssues] = useState<readonly CreationUiIssueCode[]>([]);
  const [commandFailed, setCommandFailed] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [hubConfirmation, setHubConfirmation] = useState<{
    readonly action: HubAction;
    readonly step: 1 | 2;
    readonly checkpoint: CareerManagementCheckpoint;
  } | null>(null);
  const [hubError, setHubError] = useState<CareerHubProps['error']>(null);
  const [positionAlumni, setPositionAlumni] = useState<CareerHubProps['alumni']>([]);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const hubOperationRef = useRef(false);
  const hubHistoryRequestRef = useRef(0);
  const [onboardingSettings, setOnboardingSettings] = useState<OnboardingSettings>(
    createDefaultOnboardingSettings,
  );
  const onboardingSettingsRef = useRef(onboardingSettings);
  const onboardingPersistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveWarningRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    document.documentElement.lang = activeLocale;
    document.title = t('app.title');
  }, [activeLocale, t]);

  useEffect(() => {
    let active = true;
    const metaLoad = persistence.loadMetaProfile?.() ?? Promise.resolve(null);
    const positionLoad =
      injectedPersistence === undefined
        ? positionPersistence.loadSession()
        : Promise.resolve({
            ok: false as const,
            reason: 'position_alpha_load.not_found' as const,
          });
    const activeKindLoad =
      injectedPersistence === undefined
        ? storage.get<string>('settings', ACTIVE_CAREER_KIND_STORAGE_ID)
        : Promise.resolve(undefined);
    void Promise.all([
      persistence.loadCareer(),
      metaLoad,
      loadOnboardingSettings(storage),
      positionLoad,
      activeKindLoad,
    ]).then(([result, loadedMeta, loadedOnboarding, loadedPosition, activeCareerKind]) => {
      if (!active) {
        return;
      }
      onboardingSettingsRef.current = loadedOnboarding;
      setOnboardingSettings(loadedOnboarding);
      if (loadedMeta?.ok) {
        setMeta(loadedMeta.meta);
      }
      if (loadedMeta !== null && !loadedMeta.ok) setHistoryUnavailable(true);
      if (activeCareerKind === 'NONE') {
        setSession(null);
        setPositionSession(null);
        setLastSavedAt(null);
        setBootNotice(null);
        setBooting(false);
        return;
      }
      const usePosition =
        activeCareerKind === 'POSITION_ALPHA' ||
        (activeCareerKind === undefined && !result.ok && loadedPosition.ok);
      if (usePosition) {
        setSession(null);
        setPositionSession(loadedPosition.ok ? loadedPosition.session : null);
        setLastSavedAt(loadedPosition.ok ? loadedPosition.envelope.updatedAt : null);
        setBootNotice(
          loadedPosition.ok
            ? loadedPosition.recovered
              ? 'recovered'
              : null
            : loadedPosition.reason === 'position_alpha_load.no_valid_save'
              ? 'no-valid-save'
              : 'load-failed',
        );
      } else {
        setPositionSession(null);
        setSession(result.ok ? result.session : null);
        setLastSavedAt(result.ok ? result.envelope.updatedAt : null);
        setBootNotice(
          result.ok
            ? result.recovered
              ? 'recovered'
              : result.warnings.length > 0
                ? 'partial-load'
                : null
            : result.reason === 'career_load.no_valid_save'
              ? 'no-valid-save'
              : result.reason === 'career_load.not_found'
                ? null
                : 'load-failed',
        );
      }
      setBooting(false);
    });
    return () => {
      active = false;
    };
  }, [bootReloadNonce, injectedPersistence, persistence, positionPersistence, storage]);

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

  function publishOnboardingSettings(nextSettings: OnboardingSettings): void {
    onboardingSettingsRef.current = nextSettings;
    setOnboardingSettings(nextSettings);
    onboardingPersistenceQueueRef.current = onboardingPersistenceQueueRef.current
      .then(() => persistOnboardingSettings(storage, nextSettings))
      .catch((error: unknown) => {
        console.error(error);
      });
    void requestPersistentStorage();
  }

  function completeOnboarding(topic: OnboardingTopic): void {
    publishOnboardingSettings(completeOnboardingTopic(onboardingSettingsRef.current, topic));
  }

  function skipAllOnboarding(): void {
    publishOnboardingSettings(completeAllOnboarding());
  }

  function replayOnboarding(topic: OnboardingTopic): void {
    publishOnboardingSettings(replayOnboardingTopic(onboardingSettingsRef.current, topic));
  }

  function replayAllOnboarding(): void {
    publishOnboardingSettings(createDefaultOnboardingSettings());
  }

  function applyLoadResult(result: LoadCareerResult): void {
    if (result.ok) {
      setLastSavedAt(result.envelope.updatedAt);
      setSession(result.session);
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
    if (pending.kind === 'completion') {
      if (persistence.saveCompletedCareer === undefined) {
        setCommandFailed(true);
        setBusy(false);
        return;
      }
      const result = await persistence.saveCompletedCareer(pending.session, pending.meta);
      if (result.ok) {
        setLastSavedAt(result.careerEnvelope.updatedAt);
        setSession(pending.session);
        setMeta(pending.meta);
        setPendingSave(null);
        setCommandFailed(false);
        setBootNotice(null);
        void requestPersistentStorage();
      } else {
        setPendingSave(pending);
      }
      setBusy(false);
      return;
    }
    const result =
      pending.mode === 'replace'
        ? persistence.replaceCurrentSession === undefined
          ? await persistence.replaceCurrentCareer(pending.session.career)
          : await persistence.replaceCurrentSession(pending.session)
        : persistence.saveSession === undefined
          ? await persistence.saveCareer(pending.session.career)
          : await persistence.saveSession(pending.session);
    if (result.ok) {
      setLastSavedAt(result.envelope.updatedAt);
      if (pending.publication === 'after-save') {
        setSession(pending.session);
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

  function persistSessionTransition(
    nextSession: CareerSession,
    publication: PendingSave['publication'] = 'optimistic',
    mode: PendingSessionSave['mode'] = 'save',
  ): void {
    const nextPending: PendingSessionSave = {
      kind: 'session',
      session: nextSession,
      mode,
      publication,
    };
    setCommandFailed(false);
    if (publication === 'optimistic') {
      setSession(nextSession);
    }
    setPendingSave(nextPending);
    void savePending(nextPending);
  }

  function persistCareerTransition(
    nextCareer: CareerRun,
    publication: PendingSessionSave['publication'] = 'optimistic',
  ): void {
    if (session === null) return;
    const replaced = replaceSessionCareer(session, nextCareer);
    if (!replaced.ok) {
      setCommandFailed(true);
      return;
    }
    persistSessionTransition(replaced.session, publication);
  }

  function persistSeasonResult(
    result: ReturnType<typeof continueShippedSeasonWeek>,
    publication: PendingSessionSave['publication'] = 'after-save',
  ): void {
    if (result.ok) {
      persistSessionTransition(result.session, publication);
    } else {
      setCommandFailed(true);
    }
  }

  async function persistPositionAlphaSession(
    nextSession: PositionAlphaSessionV2,
    replace: boolean,
  ): Promise<void> {
    if (positionSaveInFlightRef.current) return;
    positionSaveInFlightRef.current = true;
    positionPendingRef.current = nextSession;
    setBusy(true);
    setPendingPositionSession(nextSession);
    setPositionSaveFailed(false);
    try {
      const result = await positionPersistence.saveSession(nextSession, replace);
      if (result.ok) {
        setPositionSession(nextSession);
        setLastSavedAt(result.envelope.updatedAt);
        setPendingPositionSession(null);
        positionPendingRef.current = null;
        setPositionSaveFailed(false);
        setBootNotice(null);
        void requestPersistentStorage();
      } else {
        setPositionSaveFailed(true);
      }
    } catch {
      // Lock acquisition can reject before the storage engine's transaction catch.
      setPositionSaveFailed(true);
    } finally {
      positionSaveInFlightRef.current = false;
      setBusy(false);
    }
  }

  function createPositionAlphaCareer(request: PositionAlphaCreationRequest): void {
    if (busy || positionPendingRef.current !== null || hubOperationRef.current) return;
    const created = createShippedPositionAlphaSessionV2({
      ...request,
      careerSeed: careerSeedFactory(),
    });
    if (!created.ok) {
      setPositionSaveFailed(true);
      return;
    }
    void persistPositionAlphaSession(created.session, true);
  }

  function dispatchPositionCommand(
    command: (
      source: PositionAlphaSessionV2,
      mechanics: PositionAlphaSessionCommandMechanics,
    ) => PositionAlphaCommandResultV2,
  ): void {
    if (
      positionSession === null ||
      positionMechanics === null ||
      busy ||
      hubOperationRef.current ||
      positionPendingRef.current !== null
    )
      return;
    const resolved = command(positionSession, positionMechanics);
    if (!resolved.ok) {
      setCommandFailed(true);
      return;
    }
    setCommandFailed(false);
    void persistPositionAlphaSession(resolved.session, false);
  }

  function retryPositionAlphaSave(): void {
    if (pendingPositionSession === null || busy) return;
    void persistPositionAlphaSession(
      pendingPositionSession,
      positionSession === null || pendingPositionSession.revision === 0,
    );
  }

  function createCareer(draft: CreationDraft): void {
    setCreationIssues([]);
    const result = createCareerFromDraft(draft, careerSeedFactory());
    if (!result.ok) {
      setCreationIssues(result.issues);
      return;
    }
    const nextSession = createCareerSession(result.career);
    persistSessionTransition(nextSession, 'optimistic', 'replace');
  }

  function commitDraft(draft: readonly WeeklyActionId[]): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = commitCareerActionDraft(career, draft);
    if (result.ok) {
      persistCareerTransition(result.career);
    } else {
      setCommandFailed(true);
    }
  }

  function beginRecruiting(): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = beginCareerRecruiting(career);
    if (result.ok) {
      persistCareerTransition(result.career, 'after-save');
    } else {
      setCommandFailed(true);
    }
  }

  function chooseProgram(programId: ProgramId): void {
    if (career === null || session === null || pendingSave !== null) {
      return;
    }
    const result = commitCareerProgramChoice(career, programId);
    if (result.ok) {
      if (!seasonFlowEnabled) {
        persistCareerTransition(result.career, 'after-save');
        return;
      }
      const replaced = replaceSessionCareer(session, result.career);
      if (!replaced.ok) {
        setCommandFailed(true);
        return;
      }
      persistSeasonResult(bootstrapCareerSeason(replaced.session));
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
      persistCareerTransition(result.career);
    } else {
      setCommandFailed(true);
    }
  }

  function advanceWeek(): void {
    if (career === null || session === null || pendingSave !== null) {
      return;
    }
    if (
      career.phase.type === 'POST_GAME' &&
      career.seasonCareerState.bootstrapStatus === 'ACTIVE'
    ) {
      persistSeasonResult(completeShippedSeasonGameWeek(session));
      return;
    }
    const result = advanceCareerWeek(career);
    if (result.ok) {
      persistCareerTransition(
        result.career,
        career.phase.type === 'POST_GAME' ? 'after-save' : 'optimistic',
      );
    } else {
      setCommandFailed(true);
    }
  }

  function prepareGame(): void {
    if (career === null || session === null || pendingSave !== null) {
      return;
    }
    if (career.phase.type === 'WEEK_END' && career.seasonCareerState.bootstrapStatus === 'ACTIVE') {
      persistSeasonResult(continueShippedSeasonWeek(session));
      return;
    }
    const result = prepareCareerGame(career);
    if (result.ok) {
      persistCareerTransition(result.career, 'after-save');
    } else {
      setCommandFailed(true);
    }
  }

  function startGame(): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = startCareerGame(career);
    if (result.ok) {
      persistCareerTransition(result.career, 'after-save');
    } else {
      setCommandFailed(true);
    }
  }

  function chooseGameDecision(decisionId: KeySnapDecisionId): void {
    if (career === null || pendingSave !== null) {
      return;
    }
    const result = resolveCareerKeySnap(career, decisionId);
    if (result.ok) {
      persistCareerTransition(result.career, 'after-save');
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
      persistCareerTransition(result.career, 'after-save');
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
      persistCareerTransition(result.career);
    } else {
      setCommandFailed(true);
    }
  }

  function bootstrapSeason(): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(bootstrapCareerSeason(session));
  }

  function chooseEvent(choiceId: EventChoiceId): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(resolveSeasonEventChoice(session, choiceId));
  }

  function chooseInjury(choiceId: InjuryChoiceId): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(resolveSeasonInjuryChoice(session, choiceId));
  }

  function initializePostseason(): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(initializeCareerPostseason(session));
  }

  function enterSeasonReview(): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(enterCareerSeasonReview(session));
  }

  function decideNilOffer(offerId: NilOfferId, decisionId: NilOfferDecisionId): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(decideCareerNilOffer(session, offerId, decisionId));
  }

  function resolveNilObligation(resolutionId: NilObligationResolutionId): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(resolveCareerNilObligation(session, resolutionId));
  }

  function projectOffseason(): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(projectCareerOffseason(session));
  }

  function decideOffseason(programId: ProgramId): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(decideCareerOffseason(session, programId));
  }

  function bootstrapNextSeason(): void {
    if (session === null || pendingSave !== null) return;
    persistSeasonResult(bootstrapCareerNextSeason(session));
  }

  function completeSeasonCareer(): void {
    if (session === null || pendingSave !== null) return;
    const completed = completeCareerSeason(session, meta);
    if (!completed.ok) {
      setCommandFailed(true);
      return;
    }
    const pending: PendingCompletionSave = {
      kind: 'completion',
      session: completed.session,
      meta: completed.meta,
      publication: 'after-save',
    };
    setCommandFailed(false);
    setPendingSave(pending);
    void savePending(pending);
  }

  function startNextCareer(): void {
    void requestHubAction('new');
  }

  async function loadHubHistory(): Promise<void> {
    const requestId = ++hubHistoryRequestRef.current;
    try {
      const history = await careerManagement.loadPositionAlumniV2();
      if (requestId !== hubHistoryRequestRef.current) return;
      setPositionAlumni(
        history.completedSessions.flatMap(({ session: completed }) => completed.meta?.alumni ?? []),
      );
      if (history.invalidEntryCount > 0) setHistoryUnavailable(true);
    } catch {
      if (requestId === hubHistoryRequestRef.current) setHistoryUnavailable(true);
    }
  }

  async function performHubAction(
    action: HubAction,
    checkpoint: CareerManagementCheckpoint,
  ): Promise<void> {
    const result =
      action === 'reset'
        ? await careerManagement.resetAllData(checkpoint)
        : await careerManagement.retireCurrentCareer(checkpoint);
    if (!result.ok) {
      setHubError(result.reason);
      return;
    }
    setSession(null);
    setPositionSession(null);
    setPendingSave(null);
    setPendingPositionSession(null);
    positionPendingRef.current = null;
    setPositionSaveFailed(false);
    setCreationIssues([]);
    setCommandFailed(false);
    setBootNotice(null);
    setLastSavedAt(null);
    setHubConfirmation(null);
    setHubError(null);
    if (action === 'reset') {
      hubHistoryRequestRef.current += 1;
      setMeta(createEmptyMetaProfile());
      setPositionAlumni([]);
      setHistoryUnavailable(false);
      const settings = createDefaultOnboardingSettings();
      onboardingSettingsRef.current = settings;
      setOnboardingSettings(settings);
      setSelectedCreationPositionId('position_wr');
      // Reset leaves no saved preferences; use the supported default in memory too.
      setActiveLocale(DEFAULT_LOCALE);
      latestRequestedLocaleRef.current = DEFAULT_LOCALE;
      await i18n.changeLanguage(DEFAULT_LOCALE);
    } else {
      await loadHubHistory();
    }
    setHubOpen(action !== 'new');
  }

  async function requestHubAction(action: HubAction): Promise<void> {
    if (
      busy ||
      hubOperationRef.current ||
      pendingSave !== null ||
      positionPendingRef.current !== null
    )
      return;
    if (action === 'new' && session === null && positionSession === null) {
      setHubOpen(false);
      return;
    }
    hubOperationRef.current = true;
    setBusy(true);
    setHubError(null);
    try {
      await Promise.all([localePersistenceQueueRef.current, onboardingPersistenceQueueRef.current]);
      const checkpoint = await careerManagement.checkpoint(
        action === 'reset' || injectedPersistence !== undefined
          ? undefined
          : { careerId: positionSession?.lifecycle.careerId ?? career?.id ?? null },
      );
      const complete =
        positionSession !== null
          ? positionSession.phase.type === 'CAREER_COMPLETE'
          : career?.phase.type === 'CAREER_COMPLETE';
      setHubConfirmation({ action, step: 1, checkpoint });
      if (action === 'new' && complete) await performHubAction(action, checkpoint);
      else setHubOpen(true);
    } catch (error) {
      setHubOpen(true);
      setHubError(
        error instanceof CareerManagementConflict ? 'changed_since_confirmation' : 'storage_error',
      );
    } finally {
      hubOperationRef.current = false;
      setBusy(false);
    }
  }

  async function confirmHubAction(): Promise<void> {
    if (hubConfirmation === null || busy || hubOperationRef.current) return;
    if (hubConfirmation.action === 'reset' && hubConfirmation.step === 1) {
      setHubConfirmation({ ...hubConfirmation, step: 2 });
      return;
    }
    hubOperationRef.current = true;
    setBusy(true);
    try {
      await performHubAction(hubConfirmation.action, hubConfirmation.checkpoint);
    } finally {
      hubOperationRef.current = false;
      setBusy(false);
    }
  }

  const hubAthlete: CareerHubProps['athlete'] =
    positionSession !== null
      ? {
          ...positionSession.lifecycle,
          programIds: [positionSession.lifecycle.currentProgramId],
        }
      : career === null
        ? null
        : {
            ...career.player,
            careerId: career.id,
            programIds: career.programId === null ? [] : [career.programId],
          };
  const hubAlumni = [
    ...new Map(
      [...meta.alumni, ...positionAlumni, ...(positionSession?.meta?.alumni ?? [])].map(
        (alumnus) => [alumnus.careerId, alumnus],
      ),
    ).values(),
  ];

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <span>{t('app.title')}</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="help-settings-button"
            data-testid="hub-open"
            aria-expanded={hubOpen}
            disabled={booting || busy || hubConfirmation !== null}
            onClick={() => {
              setHubOpen((current) => !current);
              void loadHubHistory();
            }}
          >
            {t('hub.title')}
          </button>
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
          <button
            aria-controls="help-settings-panel"
            aria-expanded={helpOpen}
            className="help-settings-button"
            data-testid="help-settings-open"
            type="button"
            onClick={() => setHelpOpen((current) => !current)}
          >
            {t('help.open')}
          </button>
        </div>
      </header>

      {helpOpen && (
        <HelpSettingsPanel
          locale={activeLocale}
          onClose={() => setHelpOpen(false)}
          onReplayAll={replayAllOnboarding}
          onReplayTopic={replayOnboarding}
        />
      )}

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
      ) : hubOpen ? (
        <CareerHub
          locale={activeLocale}
          athlete={hubAthlete}
          complete={
            positionSession !== null
              ? positionSession.phase.type === 'CAREER_COMPLETE'
              : career?.phase.type === 'CAREER_COMPLETE'
          }
          alumni={hubAlumni}
          busy={busy}
          saveBlocked={pendingSave !== null || pendingPositionSession !== null}
          lastSavedAt={lastSavedAt}
          recovered={bootNotice === 'recovered'}
          historyUnavailable={historyUnavailable}
          confirmation={hubConfirmation}
          error={hubError}
          onClose={() => setHubOpen(false)}
          onRequest={(action) => void requestHubAction(action)}
          onConfirm={() => void confirmHubAction()}
          onCancel={() => {
            setHubConfirmation(null);
            setHubError(null);
          }}
          onHelp={() => setHelpOpen(true)}
          onReload={() => {
            setHubConfirmation(null);
            setHubError(null);
            setHubOpen(false);
            setBooting(true);
            setBootReloadNonce((value) => value + 1);
          }}
        />
      ) : positionSession !== null ? (
        <Suspense
          fallback={
            <main className="boot-screen" data-testid="position-career-loading" aria-live="polite">
              <div className="loading-mark" aria-hidden="true" />
              <p>{t('career.boot.loading')}</p>
            </main>
          }
        >
          <PositionAlphaCareerV2
            busy={busy}
            locale={activeLocale}
            saveFailed={positionSaveFailed}
            session={positionSession}
            mechanics={positionMechanics!}
            onFocusPlan={(ids) =>
              dispatchPositionCommand((source, mechanics) =>
                commitPositionAlphaFocusPlanV2(source, ids, mechanics),
              )
            }
            onAdvance={() => dispatchPositionCommand(advancePositionAlphaGameDayV2)}
            onEvent={(id) =>
              dispatchPositionCommand((source, mechanics) =>
                resolvePositionAlphaEventV2(source, id, mechanics),
              )
            }
            onInjury={(id) =>
              dispatchPositionCommand((source, mechanics) =>
                resolvePositionAlphaInjuryChoiceV2(source, id, mechanics),
              )
            }
            onSnap={(id) =>
              dispatchPositionCommand((source, mechanics) =>
                resolvePositionAlphaGameDaySnapV2(source, id, mechanics),
              )
            }
            onSettle={() => dispatchPositionCommand(settlePositionAlphaGameDayV2)}
            onChooseSkill={(id) =>
              dispatchPositionCommand((source, mechanics) =>
                choosePositionAlphaSkillV2(source, id, mechanics),
              )
            }
            onEquipSkill={(id, slot) =>
              dispatchPositionCommand((source, mechanics) =>
                equipPositionAlphaSkillV2(source, id, slot, mechanics),
              )
            }
            onNil={(action) =>
              dispatchPositionCommand((source, mechanics) =>
                resolvePositionAlphaNilPlanningV2(source, action, mechanics),
              )
            }
            onBeginPostseason={() => dispatchPositionCommand(beginPositionAlphaPostseasonV2)}
            onWorldRound={() => dispatchPositionCommand(advancePositionAlphaPostseasonRoundV2)}
            onReview={() => dispatchPositionCommand(reviewPositionAlphaSeasonV2)}
            onCommit={(id) =>
              dispatchPositionCommand((source, mechanics) =>
                commitPositionAlphaOffseasonV2(source, id, mechanics),
              )
            }
            onComplete={() => dispatchPositionCommand(completePositionAlphaCareerV2)}
            onHub={() => {
              setHubOpen(true);
              void loadHubHistory();
            }}
            onRetrySave={retryPositionAlphaSave}
          />
        </Suspense>
      ) : session === null ? (
        <>
          <CareerPositionSelector
            blocked={busy || pendingPositionSession !== null}
            locale={activeLocale}
            selectedPositionId={selectedCreationPositionId}
            onSelect={(positionId) => {
              if (busy || positionPendingRef.current !== null) return;
              setSelectedCreationPositionId(positionId);
              setCreationIssues([]);
              setPositionSaveFailed(false);
            }}
          />
          {selectedCreationPositionId === 'position_wr' ? (
            <CreationScreen
              busy={busy}
              issues={creationIssues}
              latestAlumnusName={meta.alumni.at(-1)?.displayName ?? null}
              legacyAlumniCount={meta.alumni.length}
              locale={activeLocale}
              onboardingSettings={onboardingSettings}
              onCompleteOnboarding={completeOnboarding}
              onCreate={createCareer}
              onSkipAllOnboarding={skipAllOnboarding}
            />
          ) : (
            <PositionAlphaCreation
              key={selectedCreationPositionId}
              busy={busy}
              locale={activeLocale}
              positionId={selectedCreationPositionId}
              saveFailed={positionSaveFailed}
              saveBlocked={pendingPositionSession !== null}
              {...(pendingPositionSession === null
                ? {}
                : { pendingName: pendingPositionSession.player.displayName })}
              onRetrySave={retryPositionAlphaSave}
              onCreate={createPositionAlphaCareer}
            />
          )}
        </>
      ) : (
        <Suspense
          fallback={
            <main className="boot-screen" data-testid="career-screen-loading" aria-live="polite">
              <div className="loading-mark" aria-hidden="true" />
              <p>{t('career.boot.loading')}</p>
            </main>
          }
        >
          <CareerScreen
            key={session.career.id}
            busy={busy}
            career={session.career}
            locale={activeLocale}
            meta={meta}
            onboardingSettings={onboardingSettings}
            session={session}
            seasonFlowEnabled={seasonFlowEnabled}
            saveBlocked={pendingSave !== null}
            onAdvance={advanceWeek}
            onBeginRecruiting={beginRecruiting}
            onBootstrapNextSeason={bootstrapNextSeason}
            onBootstrapSeason={bootstrapSeason}
            onChooseEvent={chooseEvent}
            onChooseProgram={chooseProgram}
            onChooseGameDecision={chooseGameDecision}
            onChooseInjury={chooseInjury}
            onChooseSkill={chooseSkill}
            onCommit={commitDraft}
            onCompleteCareer={completeSeasonCareer}
            onCompleteOnboarding={completeOnboarding}
            onDecideNilOffer={decideNilOffer}
            onDecideOffseason={decideOffseason}
            onEnterSeasonReview={enterSeasonReview}
            onInitializePostseason={initializePostseason}
            onPrepareGame={prepareGame}
            onProjectOffseason={projectOffseason}
            onResolve={resolveAction}
            onResolveNilObligation={resolveNilObligation}
            onSetSkillSlot={setSkillSlot}
            onSkipAllOnboarding={skipAllOnboarding}
            onStartGame={startGame}
            onStartNextCareer={startNextCareer}
          />
        </Suspense>
      )}

      <PwaUpdatePrompt locale={activeLocale} />
    </div>
  );
}
