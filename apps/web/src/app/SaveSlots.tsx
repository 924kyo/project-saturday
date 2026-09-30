import { useEffect, useState } from 'react';
import type { VNextPositionId } from '@project-saturday/game-core';

import { AthletePortrait } from '../career/AthletePortrait';
import { useAppTranslation } from '../i18n/i18n';
import type { StorageAdapter } from '../storage';
import { POSITION_ABBR_KEYS, athleteName, currentOverall, key, program } from './content';
import { listCareerSlotsVNext, type CareerSlot, type CareerSlotView } from './persistence';
import { PORTRAIT } from './theme';
import { Crest } from './ui';

/**
 * Saved careers: every slot autosaves after each decision, so leaving a slot keeps it exactly where
 * it was. Starting a career in an empty slot never touches the others.
 */
export function SaveSlotsScreen({
  storage,
  activeSlot,
  hasActiveCareer,
  refresh,
  onResume,
  onNew,
  onDelete,
  onClose,
}: {
  readonly storage: StorageAdapter;
  readonly activeSlot: CareerSlot;
  readonly hasActiveCareer: boolean;
  /** Changes when a save changed, so the list re-reads. */
  readonly refresh: number;
  readonly onResume: (slot: CareerSlot) => void;
  readonly onNew: (slot: CareerSlot) => void;
  readonly onDelete: (slot: CareerSlot) => Promise<void>;
  readonly onClose: (() => void) | null;
}): React.JSX.Element {
  const { i18n, t } = useAppTranslation();
  const [slots, setSlots] = useState<readonly CareerSlotView[] | null>(null);
  const [confirm, setConfirm] = useState<CareerSlot | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void listCareerSlotsVNext(storage).then((views) => {
      if (active) setSlots(views);
    });
    return () => {
      active = false;
    };
  }, [storage, refresh, version]);
  const when = (iso: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  const full = slots !== null && slots.every(({ status }) => status !== 'empty');

  return (
    <section aria-labelledby="s2-slots-title" className="s2-stack s2-slots-screen">
      <div>
        <p className="s2-eyebrow">{t('v2.slots.eyebrow')}</p>
        <h1 className="s2-display s2-size-h1" id="s2-slots-title">
          {t('v2.slots.title')}
        </h1>
        <p className="s2-note">{t('v2.slots.help')}</p>
      </div>
      {full && (
        <p className="s2-banner" role="status">
          {t('v2.slots.full')}
        </p>
      )}
      {slots === null ? (
        <p className="s2-note" role="status">
          {t('v2.common.loading')}
        </p>
      ) : (
        <ol className="s2-saveslots">
          {slots.map((view) => {
            const playing = view.slot === activeSlot && hasActiveCareer;
            return (
              <li
                className={`s2-saveslot ${playing ? 's2-saveslot--active' : ''} s2-saveslot--${view.status}`}
                key={view.slot}
              >
                <span className="s2-saveslot__n s2-display">{view.slot}</span>
                {view.status === 'ok' || view.status === 'recovered' ? (
                  <SlotSummary view={view} when={when(view.updatedAt)} />
                ) : (
                  <p className="s2-saveslot__empty">
                    {t(view.status === 'empty' ? 'v2.slots.empty' : 'v2.slots.corrupt')}
                  </p>
                )}
                <div className="s2-saveslot__actions">
                  {confirm === view.slot ? (
                    <div
                      className="s2-row"
                      role="alertdialog"
                      aria-label={t('v2.slots.confirmDelete')}
                    >
                      <span className="s2-note">{t('v2.slots.confirmDelete')}</span>
                      <button
                        className="s2-btn s2-btn--ghost"
                        onClick={() => setConfirm(null)}
                        type="button"
                      >
                        {t('v2.common.cancel')}
                      </button>
                      <button
                        className="s2-btn s2-btn--danger"
                        onClick={() =>
                          void onDelete(view.slot).then(() => {
                            setConfirm(null);
                            setVersion(version + 1);
                          })
                        }
                        type="button"
                      >
                        {t('v2.slots.confirmDeleteAction')}
                      </button>
                    </div>
                  ) : view.status === 'empty' ? (
                    <button className="s2-btn" onClick={() => onNew(view.slot)} type="button">
                      {t('v2.slots.newHere')}
                    </button>
                  ) : (
                    <>
                      {view.status !== 'corrupt' &&
                        (playing ? (
                          <span className="s2-effect s2-effect--up">{t('v2.slots.playing')}</span>
                        ) : (
                          <button
                            className="s2-btn"
                            onClick={() => onResume(view.slot)}
                            type="button"
                          >
                            {t('v2.slots.resume')}
                          </button>
                        ))}
                      <button
                        className="s2-btn s2-btn--ghost"
                        onClick={() => setConfirm(view.slot)}
                        type="button"
                      >
                        {t('v2.slots.delete')}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {onClose !== null && (
        <div className="s2-actionbar">
          <div className="s2-actionbar__inner">
            <button className="s2-btn s2-btn--block" onClick={onClose} type="button">
              {t('v2.slots.close')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SlotSummary({
  view,
  when,
}: {
  readonly view: Extract<CareerSlotView, { career: unknown }>;
  readonly when: string;
}) {
  const { t } = useAppTranslation();
  const career = view.career;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const school = career.program === null ? null : program(career.program.programId);
  const flow = career.flow.type;
  return (
    <div className="s2-saveslot__body">
      <AthletePortrait
        appearance={career.athlete.profile.appearance}
        label={t('v2.player.portrait', { name: athleteName(t, career) })}
        size={PORTRAIT.compact}
      />
      <div className="s2-stack" style={{ gap: 2 }}>
        <p className="s2-saveslot__name">
          {athleteName(t, career)}{' '}
          <span className="s2-saveslot__pos">{t(POSITION_ABBR_KEYS[positionId])}</span>
        </p>
        <p className="s2-note">
          {flow === 'CAREER_COMPLETE'
            ? t('v2.slots.complete')
            : school === null
              ? t('v2.slots.recruiting')
              : t('v2.slots.progress', {
                  program: t(key(school.shortNameKey)),
                  season: career.season.index + 1,
                  week: career.season.weekIndex + 1,
                })}{' '}
          · {t('v2.player.ovr', { ovr: currentOverall(career) })}
        </p>
        <p className="s2-note s2-saveslot__when">
          {t('v2.slots.saved', { when })}
          {view.status === 'recovered' && (
            <>
              {' · '}
              {t('v2.slots.recovered')}
            </>
          )}
        </p>
      </div>
      {school !== null && <Crest identity={school} size={40} />}
    </div>
  );
}
