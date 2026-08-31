import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './App';
import { createAppI18n } from './i18n/i18n';
import { resolveInitialLocale } from './i18n/locale';
import { createStorageAdapter } from './storage';
import './styles.css';

async function bootstrap(): Promise<void> {
  const rootElement = document.querySelector<HTMLElement>('#root');

  if (rootElement === null) {
    throw new Error('Missing application root element.');
  }

  const storage = await createStorageAdapter();
  const locale = await resolveInitialLocale(storage);
  const i18n = await createAppI18n(locale);

  createRoot(rootElement).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App storage={storage} />
      </I18nextProvider>
    </StrictMode>,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
});
