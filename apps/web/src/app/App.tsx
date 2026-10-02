import { useEffect, useMemo, useRef, useState } from 'react';
import {
  chooseBreakthroughVNext,
  skipBreakthroughVNext,
  chooseCampVNext,
  chooseEventVNext,
  continueCampVNext,
  decideMidseasonVNext,
  chooseInjuryVNext,
  chooseSnapVNext,
  commitOffseasonVNext,
  commitProgramVNext,
  continueGameVNext,
  continueSeasonReviewVNext,
  createCareerVNext,
  type DepthRoleId,
  equipSkillVNext,
  kickoffVNext,
  nextWeekVNext,
  planWeekVNext,
  retireVNext,
  declareForDraftVNext,
  toGameDayVNext,
  type AlumniVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type AthleteNameTokensVNext,
  type PositionPlayerCreationIdentity,
  type ProgramId,
  chooseNilVNext,
} from '@project-saturday/game-core';
import { buildCareerVNextMechanics } from '@project-saturday/game-content/content';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { persistLocale } from '../i18n/locale';
import { applyNameDisplay } from '../i18n/i18n';
import { PwaUpdatePrompt } from '../pwa/PwaUpdatePrompt';
import { requestPersistentStorage, type StorageAdapter } from '../storage';
import './app.css';
import { program } from './content';
import { CreateScreen, type CreationExtras } from './CreateScreen';
import { CampScreen, MidseasonScreen } from './Development';
import { GameDayScreen } from './GameDayScreen';
import {
  clearCareerVNext,
  loadActiveSlot,
  loadAlumniVNext,
  loadCareerVNext,
  recordAlumniVNext,
  saveActiveSlot,
  saveCareerVNext,
  type CareerSlot,
} from './persistence';
import {
  PreferencesContext,
  defaultPreferences,
  loadPreferences,
  savePreferences,
  type Preferences,
} from './preferences';
import { SaveSlotsScreen } from './SaveSlots';
import { SettingsPanel } from './Settings';
import {
  dismissPrototypeNotice,
  downloadJson,
  exportPrototypeData,
  findPrototypeAlumni,
  hasPrototypeData,
  type PrototypeAlumniView,
} from './prototype';
import {
  CareerCompleteScreen,
  OffseasonScreen,
  SeasonReviewScreen,
  LegacyPanel,
} from './SeasonScreens';
import { PostGameScreen, SeasonEndScreen } from './PostGameScreen';
import { RecruitScreen } from './RecruitScreen';
import { teamStyle } from './theme';
import { GearContext } from '../career/gear';
import { LogoMark } from './ui';
import { BreakthroughScreen } from './BuildView';
import { EventScreen, InjuryScreen } from './WeeklyScene';
import { NilScreen } from './NilScene';
import { WeekScreen } from './WeekScreen';

const NO_GEAR: readonly string[] = [];

export interface AppProps {
  readonly storage: StorageAdapter;
  readonly seedFactory?: () => string;
  /** Asks the browser not to evict saved data (injectable for tests). */
  readonly requestPersistence?: () => Promise<boolean>;
}

type Command = (career: CareerVNext, mechanics: CareerVNextMechanics) => CareerVNextResult;

function browserSeed(): string {
  return `career-seed:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

export function App({
  storage,
  seedFactory = browserSeed,
  requestPersistence = requestPersistentStorage,
}: AppProps): React.JSX.Element {
  const { i18n, t } = useAppTranslation();
  const locale = (i18n.resolvedLanguage ?? DEFAULT_LOCALE) as SupportedLocale;
  const [career, setCareer] = useState<CareerVNext | null>(null);
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState<'corrupt' | 'recovered' | null>(null);
  const [pending, setPending] = useState<CareerVNext | null>(null);
  const [saving, setSaving] = useState(false);
  const [slot, setSlot] = useState<CareerSlot>(1);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(() => defaultPreferences(locale));
  const [prototype, setPrototype] = useState(false);
  const [alumni, setAlumni] = useState<readonly AlumniVNext[]>([]);
  // One seed per creation: the scouting report previews the very offers the career will get.
  const [creationSeed, setCreationSeed] = useState(seedFactory);
  const [prototypeAlumni, setPrototypeAlumni] = useState<readonly PrototypeAlumniView[]>([]);
  const inFlight = useRef(false);
  // First-launch unit defaults read the language once; later language changes never move them.
  const firstLocale = useRef<string>(locale);
  const persistenceRequested = useRef(false);
  const systemReducedMotion = useMemo(
    () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  );
  // Board motion follows the device unless the player overrides it in Settings.
  const reducedMotion =
    preferences.motion === 'off' || (preferences.motion === 'system' && systemReducedMotion);
  const mechanics = useMemo(
    () => (career === null ? null : buildCareerVNextMechanics(career.athlete.profile)),
    [career],
  );

  useEffect(() => {
    let active = true;
    void loadActiveSlot(storage)
      .then(async (opened) => ({ opened, loaded: await loadCareerVNext(storage, opened) }))
      .then(({ opened, loaded }) => {
        if (!active) return;
        setSlot(opened);
        if (loaded.status === 'ok' || loaded.status === 'recovered') setCareer(loaded.career);
        if (loaded.status === 'corrupt') setNotice('corrupt');
        if (loaded.status === 'recovered') setNotice('recovered');
        setBooting(false);
      });
    void loadPreferences(storage, firstLocale.current)
      .then((stored) => {
        if (active) setPreferences(stored);
      })
      .catch(() => undefined);
    void hasPrototypeData(storage)
      .then((found) => {
        if (active) setPrototype(found);
      })
      .catch(() => undefined);
    void loadAlumniVNext(storage)
      .then((entries) => {
        if (active) setAlumni(entries);
      })
      .catch(() => undefined);
    void findPrototypeAlumni(storage).then((entries) => {
      if (active) setPrototypeAlumni(entries);
    });
    return () => {
      active = false;
    };
  }, [storage]);

  // A finished career earns its plaque once, whenever the completed save is on screen.
  const completed = career?.flow.type === 'CAREER_COMPLETE' ? career.flow.alumni : null;
  useEffect(() => {
    if (completed === null) return;
    void recordAlumniVNext(storage, completed)
      .then(setAlumni)
      .catch(() => undefined);
  }, [completed, storage]);

  // M12: generated names follow the language, or stay as originally spelled.
  useEffect(() => {
    applyNameDisplay(i18n, preferences.nameDisplay);
  }, [i18n, preferences.nameDisplay]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('app.title');
  }, [locale, t]);

  async function publish(next: CareerVNext): Promise<void> {
    inFlight.current = true;
    setSaving(true);
    setPending(next);
    try {
      const saved = await saveCareerVNext(storage, next, undefined, slot);
      if (saved !== null) {
        setCareer(next);
        setPending(null);
        // The save is the player's only copy: once per session, after a real save (a player
        // action), ask the browser to keep it through storage pressure.
        if (!persistenceRequested.current) {
          persistenceRequested.current = true;
          void requestPersistence().catch(() => false);
        }
      }
    } catch {
      // Keep the exact next state for retry; the previous saved career stays on screen.
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function run(command: Command): void {
    if (career === null || mechanics === null || inFlight.current || pending !== null) return;
    const result = command(career, mechanics);
    if (result.ok) void publish(result.career);
  }

  function startCareer(
    identity: PositionPlayerCreationIdentity,
    nameTokens: AthleteNameTokensVNext | null,
    extras: CreationExtras,
  ): CareerVNextResult | null {
    const built = buildCareerVNextMechanics(identity);
    if (built === null) return null;
    // The Alumni Wall as it stands now becomes this career's legacy snapshot.
    return createCareerVNext(
      {
        seed: creationSeed,
        identity,
        legacy: alumni,
        ...(nameTokens === null ? {} : { nameTokens }),
        allocation: extras.allocation,
        presetId: extras.presetId,
        ...(extras.homeRegionId === null ? {} : { homeRegionId: extras.homeRegionId }),
      },
      built,
    );
  }

  function create(
    identity: PositionPlayerCreationIdentity,
    nameTokens: AthleteNameTokensVNext | null,
    extras: CreationExtras,
  ): void {
    if (inFlight.current) return;
    const result = startCareer(identity, nameTokens, extras);
    if (result?.ok !== true) return;
    setCreationSeed(seedFactory());
    void publish(result.career);
  }

  /** The first roles the real offers project, before the career exists (nothing is saved). */
  function previewFirstRoles(
    identity: PositionPlayerCreationIdentity,
    extras: CreationExtras,
  ): readonly DepthRoleId[] | null {
    const result = startCareer(identity, null, extras);
    return result?.ok === true
      ? result.career.recruiting.offers.map(({ preview }) => preview.roleId)
      : null;
  }

  /** Opens a slot: its career if it has one, creation if it is empty. */
  async function openSlot(next: CareerSlot): Promise<void> {
    if (inFlight.current) return;
    const loaded = await loadCareerVNext(storage, next);
    await saveActiveSlot(storage, next).catch(() => undefined);
    setSlot(next);
    setPending(null);
    setNotice(
      loaded.status === 'recovered' ? 'recovered' : loaded.status === 'corrupt' ? 'corrupt' : null,
    );
    setCareer(loaded.status === 'ok' || loaded.status === 'recovered' ? loaded.career : null);
    setSlotsOpen(false);
  }

  async function deleteSlot(target: CareerSlot): Promise<void> {
    await clearCareerVNext(storage, target);
    if (target === slot) {
      setCareer(null);
      setPending(null);
      setNotice(null);
    }
    setSlotsVersion((version) => version + 1);
  }

  function changePreferences(next: Preferences): void {
    setPreferences(next);
    void savePreferences(storage, next).catch(() => undefined);
  }

  function switchLocale(next: SupportedLocale): void {
    void i18n.changeLanguage(next);
    void persistLocale(storage, next);
  }

  const blocked = saving || pending !== null;
  const programId = career?.program?.programId ?? null;
  const style = programId === null ? undefined : teamStyle(program(programId));
  const flow = career?.flow.type;

  return (
    <PreferencesContext.Provider value={preferences}>
      <GearContext.Provider value={career?.shop?.equippedGearIds ?? NO_GEAR}>
        <div
          className="s2"
          data-scene={
            career === null
              ? 'create'
              : flow === 'RECRUITING'
                ? 'recruit'
                : flow === 'GAME'
                  ? 'gameday'
                  : flow === 'POST_GAME' || flow === 'SEASON_REVIEW' || flow === 'CAREER_COMPLETE'
                    ? 'story'
                    : 'locker'
          }
          style={style}
        >
          <div aria-hidden="true" className="s2-backdrop" />
          <div className="s2-shell">
            <header className="s2-topbar">
              <div className="s2-brand">
                <LogoMark />
                <span className="s2-brand__word">{t('app.title')}</span>
              </div>
              <div className="s2-topbar__actions">
                <button
                  aria-label={t('v2.locale.switch')}
                  className="s2-chipbtn"
                  lang={locale === 'ko-KR' ? 'en-US' : 'ko-KR'}
                  onClick={() =>
                    switchLocale(SUPPORTED_LOCALES.find((option) => option !== locale)!)
                  }
                  type="button"
                >
                  {t(locale === 'ko-KR' ? 'v2.locale.en' : 'v2.locale.ko')}
                </button>
                <button
                  aria-expanded={settingsOpen}
                  className="s2-chipbtn"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  type="button"
                >
                  {t('v2.settings.open')}
                </button>
                {!booting && (
                  <button
                    aria-pressed={slotsOpen}
                    className="s2-chipbtn"
                    disabled={blocked}
                    onClick={() => {
                      setSlotsVersion((version) => version + 1);
                      setSlotsOpen(!slotsOpen);
                    }}
                    type="button"
                  >
                    {t('v2.slots.open')}
                  </button>
                )}
              </div>
            </header>

            {settingsOpen && (
              <SettingsPanel
                onChange={changePreferences}
                onClose={() => setSettingsOpen(false)}
                preferences={preferences}
              />
            )}
            {prototype && (
              <div className="s2-banner s2-banner--info" role="status">
                <p>{t('v2.prototype.notice')}</p>
                <div className="s2-row">
                  <button
                    className="s2-btn s2-btn--ghost"
                    onClick={() =>
                      void exportPrototypeData(storage).then((json) =>
                        downloadJson('project-saturday-prototype.json', json),
                      )
                    }
                    type="button"
                  >
                    {t('v2.prototype.export')}
                  </button>
                  <button
                    className="s2-btn s2-btn--ghost"
                    onClick={() => {
                      setPrototype(false);
                      void dismissPrototypeNotice(storage);
                    }}
                    type="button"
                  >
                    {t('v2.prototype.dismiss')}
                  </button>
                </div>
              </div>
            )}
            {notice === 'recovered' && (
              <div className="s2-banner" role="status">
                <p>{t('v2.save.recovered')}</p>
              </div>
            )}
            {notice === 'corrupt' && (
              <div className="s2-banner" role="alert">
                <p>{t('v2.save.corrupt')}</p>
              </div>
            )}
            {pending !== null && !saving && (
              <div className="s2-banner" role="alert">
                <p>{t('v2.save.failed')}</p>
                <button
                  className="s2-btn s2-btn--ghost"
                  onClick={() => void publish(pending)}
                  type="button"
                >
                  {t('v2.save.retry')}
                </button>
              </div>
            )}

            <main aria-busy={booting || saving}>
              {booting ? (
                <p className="s2-note" role="status">
                  {t('v2.common.loading')}
                </p>
              ) : slotsOpen ? (
                <SaveSlotsScreen
                  activeSlot={slot}
                  hasActiveCareer={career !== null}
                  onClose={() => setSlotsOpen(false)}
                  onDelete={deleteSlot}
                  onNew={(target) => void openSlot(target)}
                  onResume={(target) => void openSlot(target)}
                  refresh={slotsVersion}
                  storage={storage}
                />
              ) : career === null || mechanics === null ? (
                <>
                  <CreateScreen
                    blocked={blocked}
                    onCreate={create}
                    previewFirstRoles={previewFirstRoles}
                  />
                  {alumni.length > 0 && (
                    <LegacyPanel alumni={alumni} prototypes={prototypeAlumni} />
                  )}
                </>
              ) : flow === 'RECRUITING' ? (
                <RecruitScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onCommit={(id: ProgramId) => run((c, m) => commitProgramVNext(c, id, m))}
                  reducedMotion={reducedMotion}
                />
              ) : flow === 'CAMP' ? (
                <CampScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onCamp={(ids) => run((c, m) => chooseCampVNext(c, ids, m))}
                  onContinue={() => run((c) => continueCampVNext(c))}
                />
              ) : flow === 'MIDSEASON' ? (
                <MidseasonScreen
                  blocked={blocked}
                  career={career}
                  onDecide={(accept) => run((c) => decideMidseasonVNext(c, accept))}
                />
              ) : flow === 'WEEK_PLAN' || flow === 'PRACTICE_REPORT' ? (
                <WeekScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onEquip={(slot, id) => run((c) => equipSkillVNext(c, slot, id))}
                  onRun={run}
                  onGameDay={() => run(toGameDayVNext)}
                  onPlan={(ids) => run((c, m) => planWeekVNext(c, ids, m))}
                />
              ) : flow === 'BREAKTHROUGH' ? (
                <BreakthroughScreen
                  blocked={blocked}
                  career={career}
                  onChoose={(id) => run((c) => chooseBreakthroughVNext(c, id))}
                  onContinue={() => run(toGameDayVNext)}
                  onSkip={() => run((c) => skipBreakthroughVNext(c))}
                />
              ) : flow === 'EVENT' ? (
                <EventScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onChoose={(id) => run((c, m) => chooseEventVNext(c, id, m))}
                  onContinue={() => run(toGameDayVNext)}
                />
              ) : flow === 'NIL' ? (
                <NilScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onDecide={(accept) => run((c, m) => chooseNilVNext(c, accept, m))}
                  onContinue={() => run(toGameDayVNext)}
                />
              ) : flow === 'INJURY' ? (
                <InjuryScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onChoose={(id) => run((c, m) => chooseInjuryVNext(c, id, m))}
                  onContinue={() => run(toGameDayVNext)}
                />
              ) : flow === 'GAME' ? (
                <GameDayScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onChoose={(id) => run((c, m) => chooseSnapVNext(c, id, m))}
                  onContinue={() => run(continueGameVNext)}
                  onKickoff={() => run(kickoffVNext)}
                  reducedMotion={reducedMotion}
                />
              ) : flow === 'POST_GAME' ? (
                <PostGameScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onNext={() => run(nextWeekVNext)}
                />
              ) : flow === 'SEASON_REVIEW' ? (
                <SeasonReviewScreen
                  blocked={blocked}
                  career={career}
                  onContinue={() => run(continueSeasonReviewVNext)}
                />
              ) : flow === 'OFFSEASON' ? (
                <OffseasonScreen
                  blocked={blocked}
                  career={career}
                  mechanics={mechanics}
                  onCommit={(id, programId) =>
                    run((c, m) => commitOffseasonVNext(c, id, m, programId))
                  }
                  onRetire={() => run((c) => retireVNext(c))}
                  onDeclare={() => run((c) => declareForDraftVNext(c))}
                />
              ) : flow === 'CAREER_COMPLETE' ? (
                <CareerCompleteScreen
                  alumni={alumni}
                  career={career}
                  onNewCareer={() => {
                    setSlotsVersion((version) => version + 1);
                    setSlotsOpen(true);
                  }}
                  prototypes={prototypeAlumni}
                />
              ) : (
                <SeasonEndScreen
                  blocked={blocked}
                  career={career}
                  onContinue={() => run(nextWeekVNext)}
                />
              )}
            </main>
          </div>
          <PwaUpdatePrompt locale={locale} />
        </div>
      </GearContext.Provider>
    </PreferencesContext.Provider>
  );
}
