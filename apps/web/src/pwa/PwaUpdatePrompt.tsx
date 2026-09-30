import { useRegisterSW } from 'virtual:pwa-register/react';
import type { SupportedLocale } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';

export interface PwaUpdatePromptProps {
  readonly locale: SupportedLocale;
}

export function PwaUpdatePrompt({ locale }: PwaUpdatePromptProps): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  // A new version waits for the player: updating reloads the app shell; saves live in IndexedDB,
  // separate from the service-worker caches, so an update never touches the career.
  return (
    <aside className="s2-banner" role="status" aria-live="polite">
      <p>{t('pwa.updateAvailable')}</p>
      <div className="s2-row">
        <button
          className="s2-btn s2-btn--ghost"
          type="button"
          onClick={() => setNeedRefresh(false)}
        >
          {t('pwa.dismissAction')}
        </button>
        <button className="s2-btn" type="button" onClick={() => void updateServiceWorker(true)}>
          {t('pwa.updateAction')}
        </button>
      </div>
    </aside>
  );
}
