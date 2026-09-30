import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../i18n/i18n';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';

const updateServiceWorker = vi.fn(async () => undefined);
const setNeedRefresh = vi.fn();
let needRefresh = true;
const LOCALE = 'en-US' as const;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

describe('PWA update prompt (M10)', () => {
  it('offers the new version and applies it only when the player chooses', async () => {
    const i18n = await createAppI18n('en-US');
    render(
      <I18nextProvider i18n={i18n}>
        <PwaUpdatePrompt locale={LOCALE} />
      </I18nextProvider>,
    );
    const banner = screen.getByRole('status');
    expect(banner).toHaveClass('s2-banner');
    const buttons = banner.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[0]!);
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(updateServiceWorker).not.toHaveBeenCalled();
    await userEvent.click(buttons[1]!);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('stays hidden while there is nothing to update', async () => {
    needRefresh = false;
    const i18n = await createAppI18n('en-US');
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <PwaUpdatePrompt locale={LOCALE} />
      </I18nextProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
