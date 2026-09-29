import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { offFieldContent } from '@project-saturday/game-content';
import type { MessageKey } from '@project-saturday/game-content/locales';
import {
  projectPositionAlphaNilChoicesV2,
  resolvePositionAlphaNilPlanningV2,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import { createAppI18n } from '../i18n/i18n';
import {
  CURRENT_POSITION_CASES,
  createCurrentPositionWeekFixture,
} from '../test/position-alpha-current-fixture';
import { PositionAlphaOffField } from './PositionAlphaOffField';

describe.each(['ko-KR', 'en-US'] as const)('current off-field planning %s', (locale) => {
  it.each(CURRENT_POSITION_CASES)(
    '%s previews and saves an offer and obligation without stale player state',
    async (positionId, archetypeId) => {
      const offerId = 'nil_offer_youth_route_clinic';
      const fixture = createCurrentPositionWeekFixture(positionId, archetypeId, {
        nilOfferId: offerId,
      });
      const offered = fixture.next;
      expect(offered.nil!.state.pendingOffers[0]!.offerId).toBe(offerId);
      const i18n = await createAppI18n(locale);
      const onChoose = vi.fn();
      const view = (session: PositionAlphaSessionV2, busy = false, saveFailed = false) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaOffField
            session={session}
            mechanics={fixture.mechanics}
            locale={locale}
            busy={busy}
            saveFailed={saveFailed}
            onChoose={onChoose}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(offered));
      const before = JSON.stringify(offered);
      const offer = offFieldContent.nil.offers.find(({ id }) => id === offerId)!;
      expect(
        screen.getByRole('heading', {
          name: i18n.t('career.offField.nil.offerTitle', {
            offer: i18n.t(offer.nameKey as MessageKey),
          }),
        }),
      ).toBeVisible();
      expect(
        screen.getByText(i18n.t('m7Direct.nil.attention', { count: offer.obligation.focusCost })),
      ).toBeVisible();
      expect(screen.getByText(i18n.t('career.offField.nil.weeklyEffects'))).toBeVisible();
      expect(screen.getByText(i18n.t('career.offField.nil.defaultEffects'))).toBeVisible();
      const user = userEvent.setup();
      const acceptButton = screen.getByRole('button', {
        name: i18n.t('career.offField.nil.accept'),
      });
      acceptButton.focus();
      await user.keyboard('{Enter}');
      expect(onChoose).toHaveBeenCalledExactlyOnceWith({ type: 'ACCEPT', offerId });
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(JSON.stringify(offered)).toBe(before);
      // Until persistence publishes the exact command result, the saved offer remains visible and locked.
      rerender(view(offered, false, true));
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeDisabled();
        await user.click(button);
      }
      expect(onChoose).toHaveBeenCalledTimes(1);
      const result = resolvePositionAlphaNilPlanningV2(
        offered,
        { type: 'ACCEPT', offerId },
        fixture.mechanics,
      );
      if (!result.ok) throw new Error(result.reason);
      const accepted = result.session;
      expect(accepted.player).toEqual(offered.player);
      rerender(view(accepted));
      await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus());
      const current = projectPositionAlphaNilChoicesV2(accepted, fixture.mechanics)!;
      expect(current.current.relationships).not.toEqual(accepted.lifecycle.relationships);
      for (const track of current.current.relationships) {
        const keys = {
          POSITION_COACH: 'offField.relationships.positionCoach.name',
          ROOM_LEADER: 'offField.relationships.teammateLeader.name',
          DIRECT_COMPETITOR: 'offField.relationships.directCompetitor.name',
        } as const;
        expect(
          screen.getByText(i18n.t(keys[track.actorId]), { selector: 'dt' }).nextElementSibling,
        ).toHaveTextContent(String(track.value));
      }
      expect(
        screen.getByText(
          i18n.t('career.offField.nil.funds', {
            value: new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(current.current.state.fictionalFundsUsd),
          }),
        ),
      ).toBeVisible();
      expect(
        screen.queryByRole('button', { name: i18n.t('career.offField.nil.accept') }),
      ).not.toBeInTheDocument();
      for (const choice of current.choices) {
        expect(
          screen.getAllByText(
            i18n.t('m7Direct.nil.afterObligation', {
              count: choice.after.state.activeObligation?.remainingWeeks ?? 0,
            }),
          ).length,
        ).toBeGreaterThan(0);
      }
      await user.click(screen.getByRole('button', { name: i18n.t('career.offField.nil.fulfill') }));
      expect(onChoose).toHaveBeenLastCalledWith({ type: 'FULFILL' });
      rerender(view(accepted, true));
      for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
      const fulfilled = resolvePositionAlphaNilPlanningV2(
        accepted,
        { type: 'FULFILL' },
        fixture.mechanics,
      );
      if (!fulfilled.ok) throw new Error(fulfilled.reason);
      rerender(view(fulfilled.session));
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText(i18n.t('m7Direct.nil.noDecision'))).toBeVisible();
      expect(screen.queryByText(/m7Direct\.|undefined|NaN|\{[a-zA-Z]+\}/)).not.toBeInTheDocument();
      rerender(view(fixture.postGame));
      expect(screen.queryByTestId('position-off-field')).not.toBeInTheDocument();
    },
  );
});
