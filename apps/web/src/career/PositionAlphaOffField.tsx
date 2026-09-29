import { useEffect, useMemo, useRef } from 'react';
import {
  projectPositionAlphaNilChoicesV2,
  type PositionAlphaNilActionV2,
  type PositionAlphaNilPlanningProjectionV2,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import { offFieldContent } from '@project-saturday/game-content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';
import { POSITION_STATE_KEYS } from './position-labels';
import { EffectList } from './OffFieldPanels';

const STATE_KEYS = { ...POSITION_STATE_KEYS, brand: 'career.player.brand' } as const;
const STATE_FIELDS = Object.keys(STATE_KEYS) as (keyof typeof STATE_KEYS)[];
const RELATIONSHIP_KEYS = {
  POSITION_COACH: 'offField.relationships.positionCoach.name',
  ROOM_LEADER: 'offField.relationships.teammateLeader.name',
  DIRECT_COMPETITOR: 'offField.relationships.directCompetitor.name',
} as const;
const ACTION_KEYS = {
  ACCEPT: 'career.offField.nil.accept',
  DECLINE: 'career.offField.nil.decline',
  FULFILL: 'career.offField.nil.fulfill',
  DEFAULT: 'career.offField.nil.default',
  EXPIRE: 'm7Direct.nil.expire',
} as const satisfies Record<PositionAlphaNilActionV2['type'], MessageKey>;

export function PositionAlphaOffField({
  session,
  mechanics,
  locale,
  busy,
  saveFailed,
  onChoose,
}: {
  readonly session: PositionAlphaSessionV2;
  readonly mechanics: PositionAlphaSessionCommandMechanics;
  readonly locale: SupportedLocale;
  readonly busy: boolean;
  readonly saveFailed: boolean;
  readonly onChoose: (action: PositionAlphaNilActionV2) => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  const projection = useMemo(
    () => projectPositionAlphaNilChoicesV2(session, mechanics),
    [session, mechanics],
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const choicePhase = projection?.choices.map(({ action }) => action.type).join('|');
  useEffect(() => {
    heading.current?.focus();
  }, [choicePhase]);
  if (projection === null) return null;
  const { current, choices } = projection;
  const blocked = busy || saveFailed;
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const funds = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  const benefitName = (id: string) =>
    t(offFieldContent.benefits.find((benefit) => benefit.id === id)!.nameKey as MessageKey);
  const consequences = (after: PositionAlphaNilPlanningProjectionV2) => (
    <ul>
      {STATE_FIELDS.filter((field) => current.playerState[field] !== after.playerState[field]).map(
        (field) => (
          <li key={field}>
            {t('m7Direct.plan.change', {
              label: t(STATE_KEYS[field]),
              before: number(current.playerState[field]),
              after: number(after.playerState[field]),
            })}
          </li>
        ),
      )}
      {after.relationships
        .filter((track, index) => track.value !== current.relationships[index]!.value)
        .map((track) => (
          <li key={track.actorId}>
            {t('m7Direct.plan.change', {
              label: t(RELATIONSHIP_KEYS[track.actorId]),
              before: current.relationships.find((before) => before.actorId === track.actorId)!
                .value,
              after: track.value,
            })}
          </li>
        ))}
      <li>
        {t('m7Direct.plan.change', {
          label: t('career.offField.effect.funds'),
          before: funds(current.state.fictionalFundsUsd),
          after: funds(after.state.fictionalFundsUsd),
        })}
      </li>
      {after.state.benefitStacks.map((stack) => (
        <li key={stack.benefitId}>
          {t('m7Direct.plan.change', {
            label: benefitName(stack.benefitId),
            before:
              current.state.benefitStacks.find((before) => before.benefitId === stack.benefitId)
                ?.quantity ?? 0,
            after: stack.quantity,
          })}
        </li>
      ))}
      <li>
        {t('m7Direct.nil.afterObligation', {
          count: after.state.activeObligation?.remainingWeeks ?? 0,
        })}
      </li>
    </ul>
  );
  return (
    <section
      className="panel"
      aria-labelledby="position-off-field-heading"
      data-testid="position-off-field"
    >
      <h2 id="position-off-field-heading" ref={heading} tabIndex={-1}>
        {t('career.offField.title')}
      </h2>
      <p>{t('m7Direct.nil.projected')}</p>
      <p>{t('career.offField.nil.funds', { value: funds(current.state.fictionalFundsUsd) })}</p>
      <p>{t('career.offField.academics.fictional')}</p>
      <dl className="ratings-grid">
        {STATE_FIELDS.map((field) => (
          <div key={field}>
            <dt>{t(STATE_KEYS[field])}</dt>
            <dd>{number(current.playerState[field])}</dd>
          </div>
        ))}
        {current.relationships.map((track) => (
          <div key={track.actorId}>
            <dt>{t(RELATIONSHIP_KEYS[track.actorId])}</dt>
            <dd>{track.value}</dd>
          </div>
        ))}
      </dl>
      {current.state.benefitStacks.map((stack) => (
        <p key={stack.benefitId}>
          {t('m7Direct.day.stat', { label: benefitName(stack.benefitId), value: stack.quantity })}
        </p>
      ))}
      {current.state.pendingOffers.map((pending) => {
        const offer = offFieldContent.nil.offers.find(({ id }) => id === pending.offerId)!;
        return (
          <article key={pending.offerId}>
            <h3>
              {t('career.offField.nil.offerTitle', { offer: t(offer.nameKey as MessageKey) })}
            </h3>
            <p>{t(offer.descriptionKey as MessageKey)}</p>
            <p>{t('career.offField.nil.expires', { week: pending.expiresAfterWeekIndex + 1 })}</p>
            <p>{t(offer.obligation.nameKey as MessageKey)}</p>
            <p>{t('career.offField.nil.duration', { count: offer.obligation.durationWeeks })}</p>
            <p>{t('m7Direct.nil.attention', { count: offer.obligation.focusCost })}</p>
            <h4>{t('career.offField.nil.weeklyEffects')}</h4>
            <EffectList effects={offer.obligation.weeklyEffects} locale={locale} t={t} />
            <h4>{t('career.offField.nil.defaultEffects')}</h4>
            <EffectList effects={offer.obligation.defaultEffects} locale={locale} t={t} />
          </article>
        );
      })}
      {current.state.activeObligation &&
        (() => {
          const obligation = current.state.activeObligation;
          const offer = offFieldContent.nil.offers.find(({ id }) => id === obligation.offerId)!;
          return (
            <article>
              <h3>{t('career.offField.nil.obligationTitle')}</h3>
              <p>{t(offer.nameKey as MessageKey)}</p>
              <p>{t('career.offField.nil.remaining', { count: obligation.remainingWeeks })}</p>
              <p>{t('m7Direct.nil.attention', { count: offer.obligation.focusCost })}</p>
            </article>
          );
        })()}
      {choices.length === 0 ? (
        <p>{t('m7Direct.nil.noDecision')}</p>
      ) : (
        <div className="choice-grid">
          {choices.map(({ action, after }) => (
            <article
              className="form-section"
              key={`${action.type}-${'offerId' in action ? action.offerId : ''}`}
            >
              <h3>{t(ACTION_KEYS[action.type])}</h3>
              <p>{t('m7Direct.nil.preview')}</p>
              {consequences(after)}
              <button
                type="button"
                className="primary-action"
                disabled={blocked}
                onClick={() => onChoose(action)}
              >
                {t(ACTION_KEYS[action.type])}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
