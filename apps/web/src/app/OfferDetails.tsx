import {
  notYetOfferVNext,
  offerFactsVNext,
  offerPipsVNext,
  offerReasonsVNext,
  transferMarketVNext,
  VNEXT_PROGRAM_TUNING,
  type CareerVNext,
  type CareerVNextMechanics,
  type OfferReasonVNext,
  type RecruitOfferVNext,
} from '@project-saturday/game-core';
import { profileValueKeyVNext, schemeNameKeyVNext } from '@project-saturday/game-content/content';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { key, program, ROLE_KEYS } from './content';
import { Panel } from './ui';

const REASON_KEYS = {
  reach: 'v2.offer.reason.reach',
  fit: 'v2.offer.reason.fit',
  early_role: 'v2.offer.reason.earlyRole',
  starter_leaving: 'v2.offer.reason.starterLeaving',
  open_top: 'v2.offer.reason.openTop',
  scheme: 'v2.offer.reason.scheme',
  production: 'v2.offer.reason.production',
  honors: 'v2.offer.reason.honors',
} as const satisfies Record<OfferReasonVNext['id'], MessageKey>;

const FIT_KEYS = {
  ideal: 'v2.programProfile.fit.ideal',
  neutral: 'v2.programProfile.fit.neutral',
  poor: 'v2.programProfile.fit.poor',
} as const satisfies Record<'ideal' | 'neutral' | 'poor', MessageKey>;

const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '±0');
const percent = (permille: number) => Math.round(permille / 10 - 100);

/** Pips with their value in the accessible name (REC-06). */
export function OfferPips({
  offer,
}: {
  readonly offer: Pick<RecruitOfferVNext, 'programRating' | 'preview'>;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const pips = offerPipsVNext(offer);
  const row = (value: number, label: string) => (
    <span aria-label={label} className="s2-pip-row" role="img">
      {[1, 2, 3, 4, 5].map((index) => (
        <span className={`s2-pip ${index <= value ? 's2-pip--on' : ''}`} key={index} />
      ))}
    </span>
  );
  return (
    <>
      <span>
        {t('v2.recruit.strength')}
        {row(pips.strength, t('v2.recruit.strengthAria', { value: pips.strength }))}
      </span>
      <span>
        {t('v2.recruit.playingTime')}
        {row(pips.playingTime, t('v2.recruit.playingAria', { value: pips.playingTime }))}
      </span>
    </>
  );
}

/** What the school offers beyond its strength, and why it called (REC-01, REC-03). */
export function OfferProfile({
  career,
  offer,
  mechanics,
  stay = false,
}: {
  readonly career: CareerVNext;
  readonly offer: RecruitOfferVNext;
  readonly mechanics: CareerVNextMechanics;
  /** The athlete's own school in the offseason: no offer, so no reasons to call. */
  readonly stay?: boolean;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const facts = offerFactsVNext(career, offer, mechanics);
  const reasons = offerReasonsVNext(career, offer, mechanics);
  return (
    <span className="s2-offer__facts">
      {facts.schemeId !== null && facts.fit !== null && (
        <span className="s2-offer__fact">
          <span className="s2-eyebrow">{t('v2.offer.label.scheme')}</span>
          <span>
            {t('v2.offer.facts.scheme', {
              scheme: t(key(schemeNameKeyVNext(facts.schemeId))),
              fit: t(FIT_KEYS[facts.fit]),
            })}
          </span>
        </span>
      )}
      {facts.previousSchemeId !== null && facts.schemeId !== null && (
        <span className="s2-offer__fact s2-offer__fact--wide s2-effect">
          {t('v2.offer.facts.coordinator', {
            from: t(key(schemeNameKeyVNext(facts.previousSchemeId))),
            to: t(key(schemeNameKeyVNext(facts.schemeId))),
          })}
        </span>
      )}
      {facts.developmentTierId !== null && (
        <span className="s2-offer__fact">
          <span className="s2-eyebrow">{t('v2.offer.label.development')}</span>
          <span>{t(key(profileValueKeyVNext('development', facts.developmentTierId)))}</span>
        </span>
      )}
      {facts.exposureTierId !== null && (
        <span className="s2-offer__fact">
          <span className="s2-eyebrow">{t('v2.offer.label.exposure')}</span>
          <span>{t(key(profileValueKeyVNext('exposure', facts.exposureTierId)))}</span>
        </span>
      )}
      {facts.academicSupportId !== null && (
        <span className="s2-offer__fact">
          <span className="s2-eyebrow">{t('v2.offer.label.academics')}</span>
          <span>{t(key(profileValueKeyVNext('academics', facts.academicSupportId)))}</span>
        </span>
      )}
      {facts.nilMarketId !== null && (
        <span className="s2-offer__fact">
          <span className="s2-eyebrow">{t('v2.offer.label.nilMarket')}</span>
          <span>{t(key(profileValueKeyVNext('nilMarket', facts.nilMarketId)))}</span>
        </span>
      )}
      <span className="s2-offer__fact s2-offer__fact--wide s2-note">
        {t('v2.offer.facts.starter', { count: facts.starterSeasonsLeft })}
      </span>
      {!stay && (
        <span className="s2-offer__fact s2-offer__fact--wide">
          <span className="s2-eyebrow">{t('v2.offer.whyTitle')}</span>
          <span className="s2-offer__tags">
            {reasons.map((reason) => (
              <span className="s2-tag" key={reason.id}>
                {t(
                  REASON_KEYS[reason.id],
                  reason.id === 'production'
                    ? { grade: reason.grade }
                    : reason.id === 'honors'
                      ? { count: reason.count }
                      : {},
                )}
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

/** How the profile values work, with the real multipliers. */
export function ProfileHelp(): React.JSX.Element {
  const { t } = useAppTranslation();
  const xp = VNEXT_PROGRAM_TUNING.developmentXpPermille;
  return (
    <p className="s2-note">
      {t('v2.offer.profileHelp', {
        elite: signed(percent(xp.development_elite)),
        standard: signed(percent(xp.development_standard)),
      })}
    </p>
  );
}

/** The nearest school that did not call, and the gap to close (REC-03). */
export function NotYetOffer({
  career,
  offers,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly offers: readonly RecruitOfferVNext[];
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const notYet = notYetOfferVNext(career, offers, mechanics);
  if (notYet === null) return null;
  return (
    <p className="s2-note" id="s2-not-yet">
      {t(notYet.measure === 'recruit_score' ? 'v2.offer.notYetRecruit' : 'v2.offer.notYetMarket', {
        program: t(key(program(notYet.programId).shortNameKey)),
        rating: notYet.programRating,
        needed: notYet.needed,
        current: notYet.current,
      })}
    </p>
  );
}

/** What the transfer market reads, term by term (REC-05). */
export function TransferMarket({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const market = transferMarketVNext(career, mechanics);
  if (market === null) return null;
  return (
    <Panel id="s2-market" title={t('v2.off.market.title')}>
      <ul className="s2-list">
        <li>{t('v2.off.market.ability', { ability: market.ability, term: market.abilityTerm })}</li>
        <li>
          {t('v2.off.market.awards', { count: market.awards, term: signed(market.awardTerm) })}
        </li>
        <li>
          {t('v2.off.market.role', {
            role: t(ROLE_KEYS[market.roleId]),
            term: signed(market.roleTerm),
          })}
        </li>
        <li>
          {market.averageGrade === null
            ? t('v2.off.market.noGrade', { term: signed(market.gradeTerm) })
            : t('v2.off.market.grade', {
                grade: market.averageGrade,
                term: signed(market.gradeTerm),
              })}
        </li>
        <li>{t('v2.off.market.exposure', { term: signed(market.exposureTerm) })}</li>
        <li>
          <strong>{t('v2.off.market.total', { target: market.target })}</strong>
        </li>
      </ul>
      <p className="s2-note">{t('v2.off.market.help')}</p>
      <ProfileHelp />
    </Panel>
  );
}
