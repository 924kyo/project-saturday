import type { PlayerAppearance, VNextPositionId } from '@project-saturday/game-core';

import { AthletePortrait } from '../career/AthletePortrait';
import { useAppTranslation } from '../i18n/i18n';
import { POSITION_ABBR_KEYS, backgrounds, key } from './content';
import { PORTRAIT } from './theme';

/** Background id → the card's series plate (a trading-card "edition" band on the bottom edge). */
const SERIES: Readonly<Record<string, string>> = {
  background_blue_chip_star: 'gold',
  background_legacy_recruit: 'violet',
  background_small_town_star: 'cyan',
  background_late_bloomer: 'green',
  background_under_recruited_athlete: 'ember',
};

export interface TradingCardProps {
  readonly name: string;
  readonly positionId: VNextPositionId | null;
  /** The play style (archetype) name key, shown under the position. */
  readonly styleKey: string | null;
  readonly backgroundId: string | null;
  readonly appearance: PlayerAppearance;
  readonly overall: number | null;
  readonly overallLabel: string;
  readonly ratings: readonly { readonly label: string; readonly value: number }[];
  /** Optional program crest or mark in the card's corner. */
  readonly badge?: React.ReactNode;
  readonly className?: string;
  readonly ariaLabel: string;
}

/** The athlete as a collectible card: overall, position and style, portrait, name, series plate. */
export function TradingCard(props: TradingCardProps): React.JSX.Element {
  const { t } = useAppTranslation();
  const background = backgrounds.find(({ id }) => id === props.backgroundId) ?? null;
  const series = background === null ? null : (SERIES[background.id] ?? 'gold');
  return (
    <aside
      aria-label={props.ariaLabel}
      className={`s2-playercard s2-tcard ${props.className ?? ''}`}
      data-series={series ?? undefined}
    >
      <div className="s2-playercard__top">
        <div>
          <p className="s2-display s2-playercard__ovr s2-num">{props.overall ?? '—'}</p>
          <p className="s2-eyebrow">{props.overallLabel}</p>
        </div>
        <div className="s2-tcard__role">
          <p className="s2-display s2-playercard__pos">
            {props.positionId === null ? '—' : t(POSITION_ABBR_KEYS[props.positionId])}
          </p>
          {props.styleKey !== null && (
            <p className="s2-display s2-tcard__style">{t(key(props.styleKey))}</p>
          )}
          {props.badge}
        </div>
      </div>
      <AthletePortrait
        appearance={props.appearance}
        label={t('v2.player.portrait', { name: props.name })}
        size={PORTRAIT.profile}
      />
      {props.name !== '' && <p className="s2-display s2-playercard__name">{props.name}</p>}
      {props.ratings.length > 0 && (
        <div className="s2-ratings">
          {props.ratings.map(({ label, value }) => (
            <div key={label}>
              <span>{label}</span>
              <strong className="s2-num">{value}</strong>
            </div>
          ))}
        </div>
      )}
      {background !== null && (
        <p className="s2-tcard__series">
          <span className="s2-tcard__foil" aria-hidden="true" />
          <span>{t(key(background.nameKey))}</span>
        </p>
      )}
    </aside>
  );
}
