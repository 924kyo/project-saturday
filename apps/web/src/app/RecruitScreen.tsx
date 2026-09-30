import { useState, type CSSProperties } from 'react';
import type {
  CareerVNext,
  ProgramId,
  RecruitOfferVNext,
  VNextPositionId,
} from '@project-saturday/game-core';

import { AthletePortrait } from '../career/AthletePortrait';
import { PORTRAIT } from './theme';
import { useAppTranslation } from '../i18n/i18n';
import { CLASS_YEAR_KEYS, POSITION_ABBR_KEYS, key, program, familiarNames } from './content';
import { Crest } from './ui';

function pitchKey(offer: RecruitOfferVNext) {
  if (offer.preview.rank <= 2) return 'v2.recruit.pitch.early' as const;
  if (offer.programRating >= 74) return 'v2.recruit.pitch.contender' as const;
  if (offer.preview.rank >= 6) return 'v2.recruit.pitch.climb' as const;
  return 'v2.recruit.pitch.build' as const;
}

function pips(value: number): React.JSX.Element {
  return (
    <span aria-hidden="true" className="s2-pip-row">
      {[1, 2, 3, 4, 5].map((index) => (
        <span className={`s2-pip ${index <= value ? 's2-pip--on' : ''}`} key={index} />
      ))}
    </span>
  );
}

export function RecruitScreen({
  career,
  blocked,
  reducedMotion,
  onCommit,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly reducedMotion: boolean;
  readonly onCommit: (programId: ProgramId) => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const [selected, setSelected] = useState<ProgramId | null>(null);
  const [signing, setSigning] = useState<ProgramId | null>(null);
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const abbr = t(POSITION_ABBR_KEYS[positionId]);

  function commit(): void {
    if (selected === null || blocked) return;
    setSigning(selected);
    window.setTimeout(() => onCommit(selected), reducedMotion ? 0 : 1600);
  }

  const signingIdentity = signing === null ? null : program(signing);
  return (
    <section aria-labelledby="s2-recruit-title" className="s2-stack">
      <div className="s2-row" style={{ alignItems: 'center' }}>
        <AthletePortrait
          appearance={career.athlete.profile.appearance}
          label={t('v2.player.portrait', { name: career.athlete.profile.displayName })}
          size={PORTRAIT.compact}
        />
        <div>
          <p className="s2-eyebrow">{t('v2.recruit.eyebrow')}</p>
          <h1 className="s2-display s2-size-h1" id="s2-recruit-title">
            {t('v2.recruit.title')}
          </h1>
          <p className="s2-note">
            {t('v2.recruit.help', { count: career.recruiting.offers.length })}
          </p>
        </div>
      </div>
      <div className="s2-offers" role="list">
        {career.recruiting.offers.map((offer) => {
          const identity = program(offer.programId);
          const strength = Math.max(1, Math.min(5, Math.round((offer.programRating - 50) / 7)));
          const playing = Math.max(1, 6 - Math.ceil(offer.preview.rank / 1.6));
          return (
            <div key={offer.programId} role="listitem">
              <button
                aria-pressed={selected === offer.programId}
                className="s2-offer"
                onClick={() => setSelected(offer.programId)}
                style={{ '--c1': identity.primary, '--c2': identity.secondary } as CSSProperties}
                type="button"
              >
                <span className="s2-offer__top">
                  <Crest identity={identity} size={64} />
                  <span>
                    <span className="s2-display s2-offer__name">
                      {t(key(identity.shortNameKey))}
                    </span>
                    <br />
                    <span className="s2-offer__pitch">{t(pitchKey(offer))}</span>
                  </span>
                </span>
                <span className="s2-offer__path">
                  <span className="s2-display s2-offer__rank s2-num">
                    {abbr}
                    {offer.preview.rank}
                  </span>
                  <span>
                    <strong>
                      {offer.preview.playersAhead === 0
                        ? t('v2.recruit.pathTop')
                        : t('v2.recruit.pathAhead', { count: offer.preview.playersAhead })}
                    </strong>
                    <br />
                    <span className="s2-note">
                      {t('v2.recruit.starterClass', {
                        year: t(CLASS_YEAR_KEYS[offer.preview.starterClassYear]),
                      })}
                    </span>
                  </span>
                </span>
                <span className="s2-note">{t(key(identity.descriptionKey))}</span>
                {familiarNames(career, offer.programId) !== null && (
                  <span className="s2-effect s2-effect--up">
                    {t('v2.legacy.familiar', { names: familiarNames(career, offer.programId)! })}
                  </span>
                )}
                <span className="s2-pips">
                  <span>
                    {t('v2.recruit.strength')}
                    {pips(strength)}
                  </span>
                  <span>
                    {t('v2.recruit.playingTime')}
                    {pips(playing)}
                  </span>
                  <span>
                    {t('v2.recruit.snaps')}
                    <br />
                    <strong className="s2-num">
                      {t('v2.recruit.snapRange', {
                        min: offer.preview.opportunity.interactiveSnapMinimum,
                        max: offer.preview.opportunity.interactiveSnapMaximum,
                      })}
                    </strong>
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner">
          <button
            className="s2-btn s2-btn--block"
            disabled={selected === null || blocked || signing !== null}
            onClick={commit}
            type="button"
          >
            {selected === null
              ? t('v2.recruit.pick')
              : t('v2.recruit.commit', { program: t(key(program(selected).shortNameKey)) })}
          </button>
        </div>
      </div>
      {signingIdentity !== null && (
        <div
          aria-live="assertive"
          className="s2-signing"
          role="status"
          style={{ '--c1': signingIdentity.primary } as CSSProperties}
        >
          <Crest identity={signingIdentity} size={160} />
          <p className="s2-eyebrow" style={{ color: '#fff' }}>
            {t('v2.recruit.signed')}
          </p>
          <p className="s2-display s2-size-hero s2-tone-light">
            {career.athlete.profile.displayName}
          </p>
          <p className="s2-display" style={{ fontSize: 28, color: signingIdentity.secondary }}>
            {t(key(signingIdentity.nameKey))}
          </p>
        </div>
      )}
    </section>
  );
}
