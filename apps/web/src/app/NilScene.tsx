import {
  chooseNilVNext,
  VNEXT_NIL_TUNING,
  type CareerVNext,
  type CareerVNextMechanics,
  type NilEffect,
} from '@project-saturday/game-core';

import { useAppTranslation } from '../i18n/i18n';
import { key } from './content';
import { Nameplate } from './Nameplate';
import { nilCategoryNameKey, nilEffectChips, nilOfferText, withDelta } from './nil';
import { Panel } from './ui';

function EffectChips({
  chips,
}: {
  readonly chips: readonly { readonly text: string; readonly value: number }[];
}): React.JSX.Element {
  return (
    <span className="s2-effects">
      {chips.map((chip) => (
        <span
          className={`s2-effect ${chip.value > 0 ? 's2-effect--up' : chip.value < 0 ? 's2-effect--down' : ''}`}
          key={chip.text}
        >
          {chip.text}
        </span>
      ))}
    </span>
  );
}

/** A NIL offer: the deal, what it costs in practice time, and a real accept/decline decision. */
export function NilScreen({
  career,
  mechanics,
  blocked,
  onDecide,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly blocked: boolean;
  readonly onDecide: (accept: boolean) => void;
  readonly onContinue: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.flow.type !== 'NIL') return null;
  const scene = career.flow.offer;
  const text = nilOfferText(scene.offerId);
  const offer = mechanics.nil.catalog.nilOffers.find(({ id }) => id === scene.offerId);
  if (offer === undefined) return null;
  // The command is pure, so accepting against the current save previews the exact reward.
  const preview = chooseNilVNext(career, true, mechanics);
  const reward: readonly NilEffect[] =
    preview.ok && preview.career.flow.type === 'NIL'
      ? preview.career.flow.offer.applied.map(({ effect, actualDelta }) =>
          withDelta(effect, actualDelta),
        )
      : offer.rewardEffects;
  const penalty = VNEXT_NIL_TUNING.practicePenaltyPerFocus * offer.obligation.focusCost;
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <section aria-labelledby="s2-nil-title" className="s2-scene" id="s2-nil">
        <p className="s2-eyebrow">
          {t('v2.nil.eyebrow')} · {t(nilCategoryNameKey(text.categoryId))}
        </p>
        <h1 className="s2-display s2-size-h1" id="s2-nil-title">
          {t(key(text.nameKey))}
        </h1>
        <p className="s2-scene__body">{t(key(text.descriptionKey))}</p>
      </section>
      <div className="s2-grid-2">
        <Panel id="s2-nil-deal" title={t('v2.nil.reward')}>
          <EffectChips chips={nilEffectChips(t, reward)} />
        </Panel>
        <Panel id="s2-nil-obligation" title={t('v2.nil.obligation')}>
          <p>
            <strong>{t(key(text.obligation.nameKey))}</strong>
          </p>
          <p className="s2-note">{t(key(text.obligation.descriptionKey))}</p>
          <p className="s2-note s2-num" style={{ marginTop: 8 }}>
            {t('v2.nil.cost', { weeks: offer.obligation.durationWeeks, penalty })}
          </p>
          <EffectChips chips={nilEffectChips(t, offer.obligation.weeklyEffects)} />
        </Panel>
      </div>
      {scene.decision === null ? (
        <div className="s2-actionbar">
          <div className="s2-actionbar__inner s2-row">
            <button
              className="s2-btn s2-btn--ghost"
              disabled={blocked}
              onClick={() => onDecide(false)}
              type="button"
            >
              {t('v2.nil.decline')}
            </button>
            <button
              className="s2-btn s2-btn--block"
              disabled={blocked}
              onClick={() => onDecide(true)}
              type="button"
            >
              {t('v2.nil.accept')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="s2-note" role="status">
            {t(scene.decision === 'ACCEPTED' ? 'v2.nil.accepted' : 'v2.nil.declined')}
          </p>
          <div className="s2-actionbar">
            <div className="s2-actionbar__inner">
              <button
                className="s2-btn s2-btn--block"
                disabled={blocked}
                onClick={onContinue}
                type="button"
              >
                {t('v2.evt.continue')} <span className="s2-btn__arrow">→</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
