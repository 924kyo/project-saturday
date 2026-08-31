import type { CareerRun, SkillId } from '@project-saturday/game-core';
import type { SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { getEquippedSkillSlots, getOwnedSkillInventory } from './skill-ui';
import { SkillCard } from './SkillCard';

export interface SkillInventoryPanelProps {
  readonly career: CareerRun;
  readonly controlsDisabled: boolean;
  readonly locale: SupportedLocale;
  readonly onSetSlot: (slotIndex: number, skillId: SkillId | null) => void;
}

export function SkillInventoryPanel({
  career,
  controlsDisabled,
  locale,
  onSetSlot,
}: SkillInventoryPanelProps): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  const inventory = getOwnedSkillInventory(career);
  const slots = getEquippedSkillSlots(career);

  if (inventory.length === 0 || career.phase.type === 'SKILL_BREAKTHROUGH') {
    return null;
  }

  const planning = career.phase.type === 'PLAN_ACTIONS';

  return (
    <details className="skill-loadout" data-testid="skill-loadout">
      <summary>
        <span>{t('career.skills.inventory.title')}</span>
        <small>{t('career.skills.inventory.count', { count: inventory.length })}</small>
      </summary>
      <div className="skill-loadout__content">
        <p>{t('career.skills.inventory.help')}</p>
        {!planning && (
          <p className="skill-loadout__locked" role="status">
            {t('career.skills.inventory.locked')}
          </p>
        )}
        <div className="skill-slots">
          {slots.map((slot) => {
            const selectable = inventory.filter(
              ({ equippedSlotIndex }) =>
                equippedSlotIndex === null || equippedSlotIndex === slot.slotIndex,
            );
            return (
              <article
                className="skill-slot"
                data-skill-id={slot.skillId}
                data-testid={`skill-slot-${slot.slotIndex}`}
                key={slot.slotIndex}
              >
                <label htmlFor={`skill-slot-select-${slot.slotIndex}`}>
                  {t('career.skills.slot.label', { count: slot.slotIndex + 1 })}
                </label>
                <select
                  data-testid={`skill-slot-select-${slot.slotIndex}`}
                  disabled={!planning || controlsDisabled}
                  id={`skill-slot-select-${slot.slotIndex}`}
                  value={slot.skillId ?? ''}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    const selected = inventory.find(({ skillId }) => skillId === value);
                    if (value === '') {
                      onSetSlot(slot.slotIndex, null);
                    } else if (selected !== undefined) {
                      onSetSlot(slot.slotIndex, selected.skillId);
                    }
                  }}
                >
                  <option value="">{t('career.skills.slot.empty')}</option>
                  {selectable.map(({ presentation, skillId }) => (
                    <option key={skillId} value={skillId}>
                      {t(presentation.nameKey)} · {t(presentation.gradeNameKey)}
                    </option>
                  ))}
                </select>
                {slot.presentation === null ? (
                  <p className="skill-slot__empty">{t('career.skills.slot.open')}</p>
                ) : (
                  <SkillCard compact locale={locale} presentation={slot.presentation} />
                )}
              </article>
            );
          })}
        </div>

        <section className="owned-skills" aria-labelledby="owned-skills-heading">
          <h3 id="owned-skills-heading">{t('career.skills.inventory.owned')}</h3>
          <div className="owned-skills__grid">
            {inventory.map((entry) => (
              <article className="owned-skill" key={entry.skillId}>
                <SkillCard locale={locale} presentation={entry.presentation} />
                <p>
                  {t('career.skills.inventory.acquired', {
                    count: entry.acquiredWeekIndex,
                  })}
                  {entry.equippedSlotIndex !== null && (
                    <span>
                      {t('career.skills.inventory.equipped', {
                        count: entry.equippedSlotIndex + 1,
                      })}
                    </span>
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </details>
  );
}
