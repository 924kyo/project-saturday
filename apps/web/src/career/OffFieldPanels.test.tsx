import { localeMessages, type SupportedLocale } from '@project-saturday/game-content/locales';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../i18n/i18n';
import { createNilDecisionFixtures, type NilDecisionFixtures } from '../test/season-fixture';
import { OffFieldDecisionPanel, OffFieldOverview } from './OffFieldPanels';
import { hasBlockingOffFieldDecision } from './season-presentation';

let nilFixtures: NilDecisionFixtures | undefined;

function fixtures(): NilDecisionFixtures {
  nilFixtures ??= createNilDecisionFixtures();
  return nilFixtures;
}

async function renderLocalized(locale: SupportedLocale, element: React.ReactNode): Promise<void> {
  const i18n = await createAppI18n(locale);
  render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

describe('M6 off-field presentation', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'shows academic thresholds, football relationships, and fictional NIL state in %s',
    async (locale) => {
      await renderLocalized(
        locale,
        <OffFieldOverview detailed locale={locale} session={fixtures().offerSession} />,
      );

      const overview = screen.getByTestId('off-field-overview');
      expect(overview).toHaveTextContent(localeMessages[locale]['career.offField.academics.title']);
      expect(overview).toHaveTextContent(
        localeMessages[locale]['career.offField.relationships.title'],
      );
      expect(overview).toHaveTextContent(localeMessages[locale]['career.offField.nil.title']);
      expect(overview).toHaveTextContent(
        localeMessages[locale]['career.offField.relationships.information'].split(' ')[0]!,
      );
      expect(overview.textContent).not.toContain('{{');
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'renders an optional offer with explicit reward and commitment choices in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onDecideNilOffer = vi.fn();
      await renderLocalized(
        locale,
        <OffFieldDecisionPanel
          controlsDisabled={false}
          locale={locale}
          session={fixtures().offerSession}
          onDecideNilOffer={onDecideNilOffer}
          onResolveNilObligation={vi.fn()}
        />,
      );

      const panel = screen.getByTestId('nil-offer-decision');
      expect(panel).toHaveTextContent(localeMessages[locale]['career.offField.nil.reward']);
      expect(panel).toHaveTextContent(localeMessages[locale]['career.offField.nil.defaultEffects']);
      await user.click(
        within(panel).getByRole('button', {
          name: localeMessages[locale]['career.offField.nil.accept'],
        }),
      );
      const nil = fixtures().offerSession.career.offFieldCareerState.nil;
      if (!('bootstrapStatus' in nil)) throw new Error('Expected active NIL fixture.');
      expect(onDecideNilOffer).toHaveBeenCalledWith(nil.pendingOffers[0]!.offerId, 'ACCEPT');
      expect(hasBlockingOffFieldDecision(fixtures().offerSession)).toBe(false);
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'blocks weekly planning until the active commitment is resolved in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onResolveNilObligation = vi.fn();
      await renderLocalized(
        locale,
        <OffFieldDecisionPanel
          controlsDisabled={false}
          locale={locale}
          session={fixtures().obligationSession}
          onDecideNilOffer={vi.fn()}
          onResolveNilObligation={onResolveNilObligation}
        />,
      );

      const panel = screen.getByTestId('nil-obligation-decision');
      await user.click(
        within(panel).getByRole('button', {
          name: localeMessages[locale]['career.offField.nil.fulfill'],
        }),
      );
      expect(onResolveNilObligation).toHaveBeenCalledWith('FULFILL');
      expect(hasBlockingOffFieldDecision(fixtures().obligationSession)).toBe(true);
      expect(panel.textContent).not.toContain('{{');
    },
  );
});
