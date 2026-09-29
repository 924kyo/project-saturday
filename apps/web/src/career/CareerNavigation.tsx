import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';

export type CareerDestination = 'home' | 'week' | 'team' | 'skills' | 'player';

const CAREER_DESTINATIONS = [
  'home',
  'week',
  'team',
  'skills',
  'player',
] as const satisfies readonly CareerDestination[];

const DESTINATION_LABEL_KEYS = {
  home: 'career.navigation.home',
  week: 'career.navigation.week',
  team: 'career.navigation.team',
  skills: 'career.navigation.skills',
  player: 'career.navigation.player',
} as const satisfies Record<CareerDestination, MessageKey>;

export interface CareerNavigationProps {
  readonly activeDestination: CareerDestination;
  readonly locale: SupportedLocale;
  readonly onNavigate: (destination: CareerDestination) => void;
}

export function CareerNavigation({
  activeDestination,
  locale,
  onNavigate,
}: CareerNavigationProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);

  return (
    <nav className="career-navigation" aria-label={t('career.navigation.label')}>
      {CAREER_DESTINATIONS.map((destination) => (
        <button
          aria-current={activeDestination === destination ? 'page' : undefined}
          className="career-navigation__item"
          data-testid={`career-nav-${destination}`}
          key={destination}
          type="button"
          onClick={() => onNavigate(destination)}
        >
          <span
            aria-hidden="true"
            className={`career-navigation__icon career-navigation__icon--${destination}`}
          />
          <span>{t(DESTINATION_LABEL_KEYS[destination])}</span>
        </button>
      ))}
    </nav>
  );
}
