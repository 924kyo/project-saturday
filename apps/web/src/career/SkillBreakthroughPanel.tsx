import { useState } from 'react';
import type { SkillBreakthroughOffer, SkillId } from '@project-saturday/game-core';
import type { SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { getSkillPresentation } from './skill-ui';
import { SkillCard } from './SkillCard';

export interface SkillBreakthroughPanelProps {
  readonly controlsDisabled: boolean;
  readonly locale: SupportedLocale;
  readonly offer: SkillBreakthroughOffer;
  readonly onChoose: (skillId: SkillId) => void;
  readonly saving: boolean;
}

export function SkillBreakthroughPanel({
  controlsDisabled,
  locale,
  offer,
  onChoose,
  saving,
}: SkillBreakthroughPanelProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const [selection, setSelection] = useState<{
    readonly offerIndex: number;
    readonly skillId: SkillId | null;
  }>({ offerIndex: offer.offerIndex, skillId: null });
  const selectedSkillId = selection.offerIndex === offer.offerIndex ? selection.skillId : null;

  return (
    <div className="breakthrough-flow" data-testid="skill-breakthrough">
      <p className="breakthrough-flow__help">{t('career.skills.breakthrough.help')}</p>
      <fieldset className="skill-offer" disabled={controlsDisabled}>
        <legend>{t('career.skills.breakthrough.legend')}</legend>
        <div className="skill-offer__grid">
          {offer.offeredSkillIds.map((skillId) => {
            const presentation = getSkillPresentation(skillId);
            return (
              <label
                className="skill-offer__choice"
                data-selected={selectedSkillId === skillId}
                key={skillId}
              >
                <input
                  checked={selectedSkillId === skillId}
                  data-testid={`skill-offer-${skillId}`}
                  name={`skill-offer-${offer.offerIndex}`}
                  type="radio"
                  value={skillId}
                  onChange={() => setSelection({ offerIndex: offer.offerIndex, skillId })}
                />
                <SkillCard locale={locale} presentation={presentation} />
              </label>
            );
          })}
        </div>
      </fieldset>
      <button
        className="primary-action"
        data-testid="skill-choose-confirm"
        disabled={controlsDisabled || selectedSkillId === null}
        type="button"
        onClick={() => {
          if (selectedSkillId !== null) {
            onChoose(selectedSkillId);
          }
        }}
      >
        {saving ? t('career.skills.breakthrough.saving') : t('career.skills.breakthrough.confirm')}
      </button>
    </div>
  );
}
