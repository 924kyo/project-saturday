import { useEffect, useMemo, useRef, useState } from 'react';
import {
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseSnapVNext,
  commitOffseasonVNext,
  commitProgramVNext,
  continueGameVNext,
  continueSeasonReviewVNext,
  createCareerVNext,
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
  type PositionPlayerCreationIdentity,
  type ProgramId,
} from '@project-saturday/game-core';
import { buildCareerVNextMechanics } from '@project-saturday/game-content/content';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { persistLocale } from '../i18n/locale';
import { PwaUpdatePrompt } from '../pwa/PwaUpdatePrompt';
import type { StorageAdapter } from '../storage';
import './app.css';
import { program } from './content';
import { CreateScreen } from './CreateScreen';
import { GameDayScreen } from './GameDayScreen';
import {
  clearCareerVNext,
  loadAlumniVNext,
  loadCareerVNext,
  recordAlumniVNext,
  saveCareerVNext,
} from './persistence';
import {
  dismissPrototypeNotice,
  downloadJson,
  exportPrototypeData,
  findPrototypeAlumni,
  hasPrototypeData,
  type PrototypeAlumniView,
} from './prototype';
import { CareerCompleteScreen, OffseasonScreen, SeasonReviewScreen } from './SeasonScreens';
import { PostGameScreen, SeasonEndScreen } from './PostGameScreen';
import { RecruitScreen } from './RecruitScreen';
import { teamStyle } from './theme';
import { BreakthroughScreen } from './BuildView';
import { EventScreen, InjuryScreen } from './WeeklyScene';
import { WeekScreen } from './WeekScreen';

export interface AppProps {
  readonly storage: StorageAdapter;
  readonly seedFactory?: () => string;
}

type Command = (career: CareerVNext, mechanics: CareerVNextMechanics) => CareerVNextResult;

function browserSeed(): string {
  return `career-seed:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

export function App({ storage, seedFactory = browserSeed }: AppProps): React.JSX.Element {
  const { i18n, t } = useAppTranslation();
  const locale = (i18n.resolvedLanguage ?? DEFAULT_LOCALE) as SupportedLocale;
  const [career, setCareer] = useState<CareerVNext | null>(null);
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState<'corrupt' | null>(null);
  const [pending, setPending] = useState<CareerVNext | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [prototype, setPrototype] = useState(false);
  const [alumni, setAlumni] = useState<readonly AlumniVNext[]>([]);
  const [prototypeAlumni, setPrototypeAlumni] = useState<readonly PrototypeAlumniView[]>([]);
  const inFlight = useRef(false);
  const reducedMotion = useMemo(
    () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  );
  const mechanics = useMemo(
    () => (career === null ? null : buildCareerVNextMechanics(career.athlete.profile)),
    [career],
  );

  useEffect(() => {
    let active = true;
    void loadCareerVNext(storage).then((loaded) => {
      if (!active) return;
      if (loaded.status === 'ok') setCareer(loaded.career);
      if (loaded.status === 'corrupt') setNotice('corrupt');
      setBooting(false);
    });
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

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('app.title');
  }, [locale, t]);

  async function publish(next: CareerVNext): Promise<void> {
    inFlight.current = true;
    setSaving(true);
    setPending(next);
    try {
      const saved = await saveCareerVNext(storage, next);
      if (saved !== null) {
        setCareer(next);
        setPending(null);
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

  function create(identity: PositionPlayerCreationIdentity): void {
    if (inFlight.current) return;
    const built = buildCareerVNextMechanics(identity);
    if (built === null) return;
    const result = createCareerVNext({ seed: seedFactory(), identity }, built);
    if (result.ok) void publish(result.career);
  }

  async function startOver(): Promise<void> {
    await clearCareerVNext(storage);
    setCareer(null);
    setPending(null);
    setConfirmNew(false);
    setNotice(null);
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
    <div className="s2" style={style}>
      <div className="s2-shell">
        <header className="s2-topbar">
          <div className="s2-brand">
            <span aria-hidden="true" className="s2-brand__mark" />
            <span className="s2-brand__word">{t('app.title')}</span>
          </div>
          <div className="s2-topbar__actions">
            <button
              aria-label={t('v2.locale.switch')}
              className="s2-chipbtn"
              lang={locale === 'ko-KR' ? 'en-US' : 'ko-KR'}
              onClick={() => switchLocale(SUPPORTED_LOCALES.find((option) => option !== locale)!)}
              type="button"
            >
              {t(locale === 'ko-KR' ? 'v2.locale.en' : 'v2.locale.ko')}
            </button>
            {career !== null && (
              <button className="s2-chipbtn" onClick={() => setConfirmNew(true)} type="button">
                {t('v2.hub.new')}
              </button>
            )}
          </div>
        </header>

        {confirmNew && (
          <div className="s2-banner" role="alertdialog" aria-labelledby="s2-confirm-new">
            <p id="s2-confirm-new">{t('v2.hub.confirmNew')}</p>
            <div className="s2-row">
              <button
                className="s2-btn s2-btn--ghost"
                onClick={() => setConfirmNew(false)}
                type="button"
              >
                {t('v2.common.cancel')}
              </button>
              <button
                className="s2-btn s2-btn--ghost"
                onClick={() => void startOver()}
                type="button"
              >
                {t('v2.hub.confirmNewAction')}
              </button>
            </div>
          </div>
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
          ) : career === null || mechanics === null ? (
            <CreateScreen blocked={blocked} onCreate={create} />
          ) : flow === 'RECRUITING' ? (
            <RecruitScreen
              blocked={blocked}
              career={career}
              onCommit={(id: ProgramId) => run((c, m) => commitProgramVNext(c, id, m))}
              reducedMotion={reducedMotion}
            />
          ) : flow === 'WEEK_PLAN' || flow === 'PRACTICE_REPORT' ? (
            <WeekScreen
              blocked={blocked}
              career={career}
              mechanics={mechanics}
              onEquip={(slot, id) => run((c) => equipSkillVNext(c, slot, id))}
              onGameDay={() => run(toGameDayVNext)}
              onPlan={(ids) => run((c, m) => planWeekVNext(c, ids, m))}
            />
          ) : flow === 'BREAKTHROUGH' ? (
            <BreakthroughScreen
              blocked={blocked}
              career={career}
              onChoose={(id) => run((c) => chooseBreakthroughVNext(c, id))}
              onContinue={() => run(toGameDayVNext)}
            />
          ) : flow === 'EVENT' ? (
            <EventScreen
              blocked={blocked}
              career={career}
              mechanics={mechanics}
              onChoose={(id) => run((c, m) => chooseEventVNext(c, id, m))}
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
              onChoose={(id) => run((c) => chooseSnapVNext(c, id))}
              onContinue={() => run(continueGameVNext)}
              onKickoff={() => run(kickoffVNext)}
              reducedMotion={reducedMotion}
            />
          ) : flow === 'POST_GAME' ? (
            <PostGameScreen blocked={blocked} career={career} onNext={() => run(nextWeekVNext)} />
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
              onCommit={(id) => run((c, m) => commitOffseasonVNext(c, id, m))}
              onRetire={() => run((c) => retireVNext(c))}
              onDeclare={() => run((c) => declareForDraftVNext(c))}
            />
          ) : flow === 'CAREER_COMPLETE' ? (
            <CareerCompleteScreen
              alumni={alumni}
              career={career}
              onNewCareer={() => void startOver()}
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
  );
}
