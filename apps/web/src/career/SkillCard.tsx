import type { SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import type { SkillCardPresentation } from './skill-ui';

export interface SkillCardProps {
  readonly compact?: boolean;
  readonly locale: SupportedLocale;
  readonly presentation: SkillCardPresentation;
}

export function SkillCard({
  compact = false,
  locale,
  presentation,
}: SkillCardProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);

  return (
    <article
      className={`skill-card${compact ? ' skill-card--compact' : ''}`}
      data-family={presentation.familyId}
      data-grade={presentation.gradeId}
      data-testid={`skill-card-${presentation.id}`}
    >
      <div className="skill-card__badges">
        <span>{t(presentation.familyNameKey)}</span>
        <span>{t(presentation.gradeNameKey)}</span>
        {presentation.isTradeoff && (
          <span className="skill-card__tradeoff">{t('career.skills.tradeoff')}</span>
        )}
      </div>
      <h3>{t(presentation.nameKey)}</h3>
      {!compact && <p>{t(presentation.descriptionKey)}</p>}
    </article>
  );
}
