import { useState } from 'react';
import {
  VNEXT_BREAKTHROUGH_THRESHOLD,
  VNEXT_BUILD_SLOTS,
  type CareerVNext,
} from '@project-saturday/game-core';

import { useAppTranslation } from '../i18n/i18n';
import { cardView } from './content';
import { Nameplate } from './Nameplate';
import { Panel } from './ui';

/** One card face: grade, family, what it does on Saturday and, when it has one, its weekly effect. */
export function CardFace({ id }: { readonly id: string }): React.JSX.Element {
  const { t } = useAppTranslation();
  const card = cardView(id);
  return (
    <span className="s2-card">
      <span className="s2-card__top">
        <span aria-label={t(card.gradeKey)} className="s2-card__grade" role="img">
          {card.gradeLetter}
        </span>
        <span className="s2-card__family">{t(card.familyKey)}</span>
      </span>
      <span className="s2-card__name">{t(card.nameKey)}</span>
      <span className="s2-card__desc">{t(card.descriptionKey)}</span>
      {card.weeklyKey !== null && <span className="s2-card__weekly">{t(card.weeklyKey)}</span>}
    </span>
  );
}

/** Build editor: four slots and the collection. Pick a slot, then a card (or clear the slot). */
export function BuildPanel({
  career,
  blocked,
  onEquip,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly onEquip: (slotIndex: number, skillId: string | null) => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const equipped = career.build.equippedSkillIds;
  const firstOpen = equipped.indexOf(null);
  const [slot, setSlot] = useState(firstOpen >= 0 ? firstOpen : 0);
  return (
    <div className="s2-stack" id="s2-build">
      <Panel
        aside={
          <span className="s2-effect s2-num">
            {t('v2.build.gauge', {
              value: career.athlete.breakthroughGauge,
              threshold: VNEXT_BREAKTHROUGH_THRESHOLD,
            })}
          </span>
        }
        id="s2-build-slots"
        title={t('v2.build.title')}
      >
        <p className="s2-note">{t('v2.build.help')}</p>
        <div className="s2-buildslots" role="radiogroup" aria-labelledby="s2-build-slots">
          {Array.from({ length: VNEXT_BUILD_SLOTS }, (_, index) => {
            const id = equipped[index] ?? null;
            return (
              <div
                className={`s2-buildslot ${index === slot ? 's2-buildslot--on' : ''}`}
                key={index}
              >
                <button
                  aria-checked={index === slot}
                  className="s2-buildslot__pick"
                  onClick={() => setSlot(index)}
                  role="radio"
                  type="button"
                >
                  <span className="s2-eyebrow">{t('v2.build.slot', { n: index + 1 })}</span>
                  {id === null ? (
                    <span className="s2-note">{t('v2.build.empty')}</span>
                  ) : (
                    <CardFace id={id} />
                  )}
                </button>
                {id !== null && (
                  <button
                    className="s2-chipbtn"
                    disabled={blocked}
                    onClick={() => onEquip(index, null)}
                    type="button"
                  >
                    {t('v2.build.remove')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel id="s2-build-collection" title={t('v2.build.collection')}>
        {career.build.ownedSkillIds.length === 0 ? (
          <p className="s2-note">{t('v2.build.none')}</p>
        ) : (
          <div className="s2-cardgrid">
            {career.build.ownedSkillIds.map((id) => {
              const at = equipped.indexOf(id);
              return (
                <button
                  aria-pressed={at >= 0}
                  className="s2-cardbtn"
                  disabled={blocked || at === slot}
                  key={id}
                  onClick={() => onEquip(slot, id)}
                  type="button"
                >
                  {at >= 0 && (
                    <span className="s2-effect s2-effect--up">
                      {t('v2.build.equipped', { n: at + 1 })}
                    </span>
                  )}
                  <CardFace id={id} />
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

/** The payoff moment after practice: three cards, one pick, and where it went. */
export function BreakthroughScreen({
  career,
  blocked,
  onChoose,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly onChoose: (skillId: string) => void;
  readonly onContinue: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.flow.type !== 'BREAKTHROUGH') return null;
  const offer = career.flow.offer;
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <section
        aria-labelledby="s2-breakthrough-title"
        className="s2-scene s2-scene--breakthrough"
        id="s2-breakthrough"
      >
        <p className="s2-eyebrow">{t('v2.bt.eyebrow')}</p>
        <h1 className="s2-display s2-size-h1" id="s2-breakthrough-title">
          {t('v2.bt.title')}
        </h1>
        <p className="s2-scene__body">{t('v2.bt.help')}</p>
      </section>
      {offer.chosenSkillId === null ? (
        <div className="s2-cardgrid s2-cardgrid--offer" role="group">
          {offer.skillIds.map((id) => (
            <button
              className="s2-cardbtn"
              disabled={blocked}
              key={id}
              onClick={() => onChoose(id)}
              type="button"
            >
              <CardFace id={id} />
            </button>
          ))}
        </div>
      ) : (
        <Panel id="s2-breakthrough-result" title={t('v2.evt.outcome')}>
          <div className="s2-cardgrid">
            <div className="s2-cardbtn s2-cardbtn--static">
              <CardFace id={offer.chosenSkillId} />
            </div>
          </div>
          <p className="s2-scene__choice s2-bt-note">
            {offer.slotIndex === null
              ? t('v2.bt.stored')
              : t('v2.bt.slotted', { n: offer.slotIndex + 1 })}
          </p>
        </Panel>
      )}
      {offer.chosenSkillId !== null && (
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
      )}
    </div>
  );
}
