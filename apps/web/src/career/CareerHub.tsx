import { useEffect, useRef } from 'react';
import type { PlayerAppearance, PositionId, ProgramId } from '@project-saturday/game-core';
import { programContent, worldAlphaContent } from '@project-saturday/game-content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';
import { AthletePortrait } from './AthletePortrait';

export type HubAction = 'new' | 'abandon' | 'reset';
export interface HubAthlete {
  readonly careerId: string;
  readonly displayName: string;
  readonly appearance: PlayerAppearance;
  readonly positionId: PositionId;
  readonly programIds: readonly ProgramId[];
}
export interface CareerHubProps {
  readonly locale: SupportedLocale;
  readonly athlete: HubAthlete | null;
  readonly complete: boolean;
  readonly alumni: readonly (HubAthlete & { readonly seasonsPlayed: number })[];
  readonly busy: boolean;
  readonly saveBlocked: boolean;
  readonly lastSavedAt: string | null;
  readonly recovered: boolean;
  readonly historyUnavailable: boolean;
  readonly confirmation: { readonly action: HubAction; readonly step: 1 | 2 } | null;
  readonly error: 'storage_error' | 'changed_since_confirmation' | 'protected_history' | null;
  readonly onClose: () => void;
  readonly onRequest: (action: HubAction) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onHelp: () => void;
  readonly onReload: () => void;
}

const POSITION_KEYS = {
  position_wr: 'm7Alpha.positions.wr.name',
  position_qb: 'm7Alpha.positions.qb.name',
  position_rb: 'm7Alpha.positions.rb.name',
  position_cb: 'm7Alpha.positions.cb.name',
} as const satisfies Record<PositionId, MessageKey>;
const PROGRAMS = [...programContent.programs, ...worldAlphaContent.stagedPrograms];
const HUB_PORTRAIT_SIZE = 'compact' as const;

export function CareerHub(props: CareerHubProps): React.JSX.Element {
  const { t } = useAppTranslation(props.locale);
  const heading = useRef<HTMLHeadingElement>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    confirmationHeading.current?.focus();
  }, [props.confirmation]);
  const blocked = props.busy || props.saveBlocked;
  const confirmation = props.confirmation;
  const identity = (athlete: HubAthlete): React.JSX.Element => (
    <div className="hub-athlete">
      <AthletePortrait
        appearance={athlete.appearance}
        label={t('career.player.portraitLabel', { name: athlete.displayName })}
        size={HUB_PORTRAIT_SIZE}
      />
      <div>
        <h3>{athlete.displayName}</h3>
        <p>{t(POSITION_KEYS[athlete.positionId])}</p>
        {athlete.programIds.map((id) => {
          const program = PROGRAMS.find((entry) => entry.id === id);
          return program === undefined ? null : <p key={id}>{t(program.nameKey as MessageKey)}</p>;
        })}
      </div>
    </div>
  );
  return (
    <main className="career-hub" data-testid="career-hub" aria-labelledby="hub-title">
      <header>
        <h1 ref={heading} id="hub-title" tabIndex={-1}>
          {t('hub.title')}
        </h1>
        <p>{t('hub.intro')}</p>
      </header>
      <section className="panel" aria-labelledby="hub-summary-title">
        <h2 id="hub-summary-title">{t('hub.summary')}</h2>
        {props.athlete === null ? <p>{t('hub.empty')}</p> : identity(props.athlete)}
      </section>
      <section className="panel" aria-labelledby="hub-save-title">
        <h2 id="hub-save-title">{t('hub.saveTitle')}</h2>
        <p role="status">
          {t(
            props.busy
              ? 'hub.saving'
              : props.saveBlocked
                ? 'hub.unsaved'
                : props.lastSavedAt === null
                  ? 'hub.noSave'
                  : 'hub.saved',
          )}
        </p>
        {props.lastSavedAt !== null && (
          <p>
            {t('hub.lastSave', {
              time: new Intl.DateTimeFormat(props.locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(props.lastSavedAt)),
            })}
          </p>
        )}
        {props.recovered && <p>{t('hub.recovered')}</p>}
      </section>
      {props.error !== null && (
        <p role="alert" data-testid="hub-error">
          {t(
            props.error === 'changed_since_confirmation'
              ? 'hub.changed'
              : props.error === 'protected_history'
                ? 'hub.protected'
                : 'hub.failed',
          )}
        </p>
      )}
      {props.error === 'changed_since_confirmation' && (
        <button
          type="button"
          className="button"
          data-testid="hub-reload"
          disabled={props.busy}
          onClick={props.onReload}
        >
          {t('career.save.reload')}
        </button>
      )}
      {confirmation === null ? (
        <div className="hub-actions">
          <button
            type="button"
            className="button button--primary"
            data-testid="hub-continue"
            disabled={props.busy}
            onClick={props.onClose}
          >
            {t(
              props.athlete === null ? 'hub.close' : props.complete ? 'hub.review' : 'hub.continue',
            )}
          </button>
          <button
            type="button"
            className="button"
            data-testid="hub-new"
            disabled={blocked}
            onClick={() => props.onRequest('new')}
          >
            {t('hub.new')}
          </button>
          {props.athlete !== null && !props.complete && (
            <button
              type="button"
              className="button button--quiet"
              data-testid="hub-abandon"
              disabled={blocked}
              onClick={() => props.onRequest('abandon')}
            >
              {t('hub.abandon')}
            </button>
          )}
          <button type="button" className="button button--quiet" onClick={props.onHelp}>
            {t('hub.settings')}
          </button>
        </div>
      ) : (
        <section
          className="panel hub-confirmation"
          role="alertdialog"
          aria-labelledby="hub-confirm-title"
          aria-describedby="hub-confirm-description"
          data-testid="hub-confirmation"
        >
          <h2 ref={confirmationHeading} id="hub-confirm-title" tabIndex={-1}>
            {t(
              confirmation.action === 'reset'
                ? confirmation.step === 1
                  ? 'hub.reset'
                  : 'hub.resetSecond'
                : confirmation.action === 'new'
                  ? props.complete
                    ? 'hub.completedNew'
                    : 'hub.confirmNew'
                  : 'hub.confirmAbandon',
            )}
          </h2>
          <p id="hub-confirm-description">
            {t(
              confirmation.action === 'reset'
                ? 'hub.resetWarning'
                : confirmation.action === 'new' && props.complete
                  ? 'hub.completedNewDescription'
                  : 'hub.retireWarning',
            )}
          </p>
          <div className="hub-actions">
            <button
              type="button"
              className="button"
              data-testid="hub-cancel"
              disabled={props.busy}
              onClick={props.onCancel}
            >
              {t('hub.cancel')}
            </button>
            <button
              type="button"
              className="button button--primary"
              data-testid="hub-confirm"
              disabled={
                blocked ||
                props.error === 'changed_since_confirmation' ||
                props.error === 'protected_history'
              }
              onClick={props.onConfirm}
            >
              {t(
                props.error === 'storage_error'
                  ? 'hub.retry'
                  : confirmation.action === 'reset' && confirmation.step === 2
                    ? 'hub.resetFinal'
                    : 'hub.confirm',
              )}
            </button>
          </div>
        </section>
      )}
      <section className="panel" aria-labelledby="hub-alumni-title" data-testid="hub-alumni">
        <h2 id="hub-alumni-title">{t('hub.alumni')}</h2>
        <p>{t('hub.legacy')}</p>
        {props.historyUnavailable && <p role="status">{t('hub.historyUnavailable')}</p>}
        {props.alumni.length === 0 ? (
          <p>{t('hub.noAlumni')}</p>
        ) : (
          props.alumni.map((alumnus) => (
            <article key={alumnus.careerId}>
              {identity(alumnus)}
              <p>{t('hub.seasons', { count: alumnus.seasonsPlayed })}</p>
            </article>
          ))
        )}
      </section>
      {confirmation === null && (
        <section className="panel hub-reset" aria-label={t('hub.reset')}>
          <p>{t('hub.resetWarning')}</p>
          <button
            type="button"
            className="button button--quiet"
            data-testid="hub-reset"
            disabled={blocked}
            onClick={() => props.onRequest('reset')}
          >
            {t('hub.reset')}
          </button>
        </section>
      )}
    </main>
  );
}
