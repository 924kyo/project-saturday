import { ATTRIBUTE_XP_PER_RATING } from '@project-saturday/game-core';

import { useAppTranslation } from '../i18n/i18n';
import { attributeNameKey } from './content';
import type { AttributeGrowth } from './growth-model';

/** Each attribute's rating, any points gained, and an XP bar toward its next point. */
export function GrowthList({ rows }: { readonly rows: readonly AttributeGrowth[] }) {
  const { t } = useAppTranslation();
  return (
    <ul className="s2-growth">
      {rows.map((row) => {
        const levels = row.ratingAfter - row.ratingBefore;
        const maxed = row.ratingAfter >= 99 && row.xpAfter === 0;
        // The bar is progress inside the current point; this week's share glows.
        const fill = maxed ? 100 : (row.xpAfter / ATTRIBUTE_XP_PER_RATING) * 100;
        const start = levels > 0 ? 0 : (row.xpBefore / ATTRIBUTE_XP_PER_RATING) * 100;
        return (
          <li className="s2-growth__row" key={row.attributeId}>
            <span className="s2-growth__name">{t(attributeNameKey(row.attributeId))}</span>
            <span className="s2-growth__rating s2-num">
              {row.ratingAfter}
              {levels > 0 && <span className="s2-growth__up">+{levels}</span>}
            </span>
            <span
              aria-hidden="true"
              className={`s2-growth__bar ${levels > 0 ? 's2-growth__bar--level' : ''}`}
            >
              <span className="s2-growth__base" style={{ width: `${start}%` }} />
              <span
                className="s2-growth__gain"
                style={{ left: `${start}%`, width: `${Math.max(0, fill - start)}%` }}
              />
            </span>
            <span className="s2-growth__xp s2-note">
              {t('v2.report.xpGain', { xp: row.gained })} ·{' '}
              {maxed
                ? t('v2.report.maxed')
                : t('v2.report.xpToNext', { xp: ATTRIBUTE_XP_PER_RATING - row.xpAfter })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
