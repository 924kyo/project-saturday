import type {
  NilEffect,
  NilObligationResolutionId,
  NilOfferDecisionId,
  NilOfferId,
} from '@project-saturday/game-core';
import {
  deriveShippedOffFieldWeekProjection,
  offFieldContent,
} from '@project-saturday/game-content/content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import type { WrSessionSurface } from './wr-view';

export interface OffFieldOverviewProps {
  readonly locale: SupportedLocale;
  readonly session: WrSessionSurface;
  readonly detailed?: boolean;
}

export interface OffFieldDecisionPanelProps extends OffFieldOverviewProps {
  readonly controlsDisabled: boolean;
  readonly onDecideNilOffer: (offerId: NilOfferId, decisionId: NilOfferDecisionId) => void;
  readonly onResolveNilObligation: (resolutionId: NilObligationResolutionId) => void;
}

const NIL_STATE_LABEL_KEYS = {
  nil_state_body: 'career.player.body',
  nil_state_brand: 'career.player.brand',
  nil_state_coach_trust: 'career.player.coachTrust',
  nil_state_confidence: 'career.player.confidence',
  nil_state_preparation: 'career.player.preparation',
} as const satisfies Record<string, MessageKey>;

function contentMessage(t: AppTranslate, key: string): string {
  return t(key as MessageKey);
}

function signedNumber(locale: SupportedLocale, value: number): string {
  return new Intl.NumberFormat(locale, { signDisplay: 'always' }).format(value);
}

function signedPercent(locale: SupportedLocale, permille: number): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: 'always',
    style: 'percent',
  }).format(permille / 1_000);
}

function funds(locale: SupportedLocale, value: number, signed = false): string {
  return new Intl.NumberFormat(locale, {
    currency: 'USD',
    maximumFractionDigits: 0,
    signDisplay: signed ? 'always' : 'auto',
    style: 'currency',
  }).format(value);
}

function gpa(locale: SupportedLocale, valueMilli: number): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 3,
    minimumFractionDigits: 1,
  }).format(valueMilli / 1_000);
}

function relationshipName(t: AppTranslate, actorId: string): string {
  const actor = offFieldContent.relationships.actors.find(({ id }) => id === actorId);
  if (actor === undefined) throw new Error(`Missing relationship presentation for ${actorId}.`);
  return contentMessage(t, actor.nameKey);
}

function effectLabel(effect: NilEffect, locale: SupportedLocale, t: AppTranslate): string {
  if (effect.type === 'nil_integer_state_delta') {
    return t('career.offField.effect', {
      label: t(NIL_STATE_LABEL_KEYS[effect.stateId]),
      value: signedNumber(locale, effect.delta),
    });
  }
  if (effect.type === 'nil_gpa_delta_milli') {
    return t('career.offField.effect', {
      label: t('career.offField.effect.gpa'),
      value: signedNumber(locale, effect.deltaMilli / 1_000),
    });
  }
  if (effect.type === 'nil_funds_delta_usd') {
    return t('career.offField.effect', {
      label: t('career.offField.effect.funds'),
      value: funds(locale, effect.deltaUsd, true),
    });
  }
  if (effect.type === 'nil_relationship_delta') {
    return t('career.offField.effect', {
      label: t('career.offField.effect.relationship', {
        name: relationshipName(t, effect.actorId),
      }),
      value: signedNumber(locale, effect.delta),
    });
  }
  const benefit = offFieldContent.benefits.find(({ id }) => id === effect.benefitId);
  if (benefit === undefined)
    throw new Error(`Missing benefit presentation for ${effect.benefitId}.`);
  return t('career.offField.effect.benefit', {
    label: contentMessage(t, benefit.nameKey),
    value: effect.quantity,
  });
}

export function EffectList({
  effects,
  locale,
  t,
}: {
  readonly effects: readonly NilEffect[];
  readonly locale: SupportedLocale;
  readonly t: AppTranslate;
}): React.JSX.Element {
  return (
    <ul className="off-field-effects">
      {effects.map((effect, index) => (
        <li key={`${effect.type}-${index}`}>{effectLabel(effect, locale, t)}</li>
      ))}
    </ul>
  );
}

export function OffFieldOverview({
  detailed = false,
  locale,
  session,
}: OffFieldOverviewProps): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  const projection = deriveShippedOffFieldWeekProjection(session);
  const academics = session.career.offFieldCareerState.academics;
  const relationships = session.career.offFieldCareerState.relationships;
  if (
    projection === null ||
    academics.bootstrapStatus !== 'ACTIVE' ||
    relationships.bootstrapStatus !== 'ACTIVE'
  ) {
    return null;
  }
  const statusId = `academic_status_${projection.academics.eligibilityStatus.toLowerCase()}`;
  const status = offFieldContent.academics.statuses.find(({ id }) => id === statusId);
  const checkpoint = offFieldContent.academics.checkpoints.find(
    ({ id }) => id === projection.academics.nextCheckpointId,
  );
  if (status === undefined) throw new Error(`Missing academic presentation for ${statusId}.`);
  return (
    <section className="off-field-overview" data-testid="off-field-overview">
      <div className="off-field-overview__heading">
        <div>
          <p className="step-mark">{t('career.offField.label')}</p>
          <h3>{t('career.offField.title')}</h3>
        </div>
        <p>{t('career.offField.help')}</p>
      </div>
      <div className="off-field-summary-grid">
        <article data-academic-status={projection.academics.eligibilityStatus}>
          <span>{t('career.offField.academics.title')}</span>
          <strong>{contentMessage(t, status.nameKey)}</strong>
          <span>
            {t('career.offField.academics.gpa', {
              gpa: gpa(locale, projection.academics.gpaMilli),
            })}
          </span>
          <small>{t('career.offField.academics.fictional')}</small>
          {detailed && (
            <>
              <small>
                {t('career.offField.academics.thresholds', {
                  eligible: gpa(locale, projection.academics.eligibleGpaMilli),
                  warning: gpa(locale, projection.academics.warningGpaMilli),
                })}
              </small>
              <small>
                {checkpoint === undefined || projection.academics.nextCheckpointWeekIndex === null
                  ? t('career.offField.academics.noCheckpoint')
                  : t('career.offField.academics.nextCheckpoint', {
                      checkpoint: contentMessage(t, checkpoint.nameKey),
                      week: projection.academics.nextCheckpointWeekIndex + 1,
                    })}
              </small>
            </>
          )}
          {projection.academics.restrictionGamesRemaining > 0 && (
            <small className="off-field-alert">
              {t('career.offField.academics.restriction', {
                count: projection.academics.restrictionGamesRemaining,
              })}
            </small>
          )}
        </article>
        <article>
          <span>{t('career.offField.relationships.title')}</span>
          <div className="relationship-values">
            {relationships.tracks.map((track) => (
              <span key={track.actorId}>
                {relationshipName(t, track.actorId)} <strong>{track.value}</strong>
              </span>
            ))}
          </div>
          {detailed && (
            <div className="relationship-football-effects">
              <small>
                {t('career.offField.relationships.coachTrust', {
                  value: signedNumber(
                    locale,
                    projection.relationships.footballEffects.coachTrustModifier,
                  ),
                })}
              </small>
              <small>
                {t('career.offField.relationships.information', {
                  value: signedNumber(
                    locale,
                    projection.relationships.footballEffects.informationScoreModifier,
                  ),
                })}
              </small>
              <small>
                {t('career.offField.relationships.snaps', {
                  value: signedPercent(
                    locale,
                    projection.relationships.footballEffects.opportunitySnapBonusPermille,
                  ),
                })}
              </small>
            </div>
          )}
        </article>
        <article>
          <span>{t('career.offField.nil.title')}</span>
          <strong>{t('career.offField.nil.brand', { value: projection.nil.brand })}</strong>
          <span>
            {t('career.offField.nil.funds', {
              value: funds(locale, projection.nil.fictionalFundsUsd),
            })}
          </span>
          <small>
            {projection.nil.activeObligation?.resolutionRequired === true
              ? t('career.offField.nil.obligationWaiting')
              : projection.nil.pendingOffer !== null
                ? t('career.offField.nil.offerWaiting')
                : t('career.offField.nil.clear')}
          </small>
        </article>
      </div>
      {detailed && (
        <p className="off-field-context-help">{t('career.offField.relationships.help')}</p>
      )}
    </section>
  );
}

export function OffFieldDecisionPanel({
  controlsDisabled,
  locale,
  onDecideNilOffer,
  onResolveNilObligation,
  session,
}: OffFieldDecisionPanelProps): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  const projection = deriveShippedOffFieldWeekProjection(session);
  if (projection === null) return null;
  const obligation = projection.nil.activeObligation;
  if (obligation?.resolutionRequired === true) {
    const offer = offFieldContent.nil.offers.find(({ id }) => id === obligation.offerId);
    if (offer === undefined) throw new Error(`Missing NIL presentation for ${obligation.offerId}.`);
    return (
      <article
        aria-live="polite"
        className="off-field-decision"
        data-testid="nil-obligation-decision"
      >
        <p className="step-mark">{t('career.offField.nil.obligationWaiting')}</p>
        <h3>{t('career.offField.nil.obligationTitle')}</h3>
        <p>{t('career.offField.nil.obligationHelp')}</p>
        <div className="off-field-decision__summary">
          <strong>{contentMessage(t, offer.nameKey)}</strong>
          <span>{t('career.offField.nil.remaining', { count: obligation.remainingWeeks })}</span>
          <span>{t('career.offField.nil.focus', { count: obligation.focusCost })}</span>
        </div>
        <div className="off-field-consequence-grid">
          <div>
            <strong>{t('career.offField.nil.weeklyEffects')}</strong>
            <EffectList effects={obligation.weeklyEffects} locale={locale} t={t} />
          </div>
          <div>
            <strong>{t('career.offField.nil.defaultEffects')}</strong>
            <EffectList effects={obligation.defaultEffects} locale={locale} t={t} />
          </div>
        </div>
        <div className="off-field-decision__actions">
          <button
            className="primary-action"
            disabled={controlsDisabled}
            type="button"
            onClick={() => onResolveNilObligation('FULFILL')}
          >
            {t('career.offField.nil.fulfill')}
          </button>
          <button
            className="secondary-action"
            disabled={controlsDisabled}
            type="button"
            onClick={() => onResolveNilObligation('DEFAULT')}
          >
            {t('career.offField.nil.default')}
          </button>
        </div>
      </article>
    );
  }
  const pending = projection.nil.pendingOffer;
  if (pending === null) return null;
  const offer = offFieldContent.nil.offers.find(({ id }) => id === pending.offerId);
  if (offer === undefined) throw new Error(`Missing NIL presentation for ${pending.offerId}.`);
  return (
    <article aria-live="polite" className="off-field-decision" data-testid="nil-offer-decision">
      <p className="step-mark">{t('career.offField.nil.offerWaiting')}</p>
      <h3>{t('career.offField.nil.offerTitle', { offer: contentMessage(t, offer.nameKey) })}</h3>
      <p>{contentMessage(t, offer.descriptionKey)}</p>
      <p>{t('career.offField.nil.offerHelp')}</p>
      <div className="off-field-consequence-grid">
        <div>
          <strong>{t('career.offField.nil.reward')}</strong>
          <EffectList effects={pending.rewardEffects} locale={locale} t={t} />
        </div>
        <div>
          <strong>{t('career.offField.nil.obligation')}</strong>
          <span>{contentMessage(t, offer.obligation.nameKey)}</span>
          <span>
            {t('career.offField.nil.duration', { count: offer.obligation.durationWeeks })}
          </span>
          <span>{t('career.offField.nil.focus', { count: pending.obligationFocusCost })}</span>
        </div>
        <div>
          <strong>{t('career.offField.nil.weeklyEffects')}</strong>
          <EffectList effects={pending.obligationWeeklyEffects} locale={locale} t={t} />
        </div>
        <div>
          <strong>{t('career.offField.nil.defaultEffects')}</strong>
          <EffectList effects={pending.obligationDefaultEffects} locale={locale} t={t} />
        </div>
      </div>
      <p className="off-field-decision__defer">
        {t('career.offField.nil.expires', { week: pending.expiresAfterWeekIndex + 1 })}{' '}
        {t('career.offField.nil.defer')}
      </p>
      <div className="off-field-decision__actions">
        <button
          className="primary-action"
          disabled={controlsDisabled}
          type="button"
          onClick={() => onDecideNilOffer(pending.offerId, 'ACCEPT')}
        >
          {t('career.offField.nil.accept')}
        </button>
        <button
          className="secondary-action"
          disabled={controlsDisabled}
          type="button"
          onClick={() => onDecideNilOffer(pending.offerId, 'DECLINE')}
        >
          {t('career.offField.nil.decline')}
        </button>
      </div>
    </article>
  );
}
