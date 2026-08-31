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

  return (
    <aside className="update-prompt" aria-live="polite">
      <p>{t('pwa.updateAvailable')}</p>
      <div className="update-prompt__actions">
        <button
          className="button button--primary"
          type="button"
          onClick={() => void updateServiceWorker(true)}
        >
          {t('pwa.updateAction')}
        </button>
        <button
          className="button button--quiet"
          type="button"
          onClick={() => setNeedRefresh(false)}
        >
          {t('pwa.dismissAction')}
        </button>
      </div>
    </aside>
  );
}
