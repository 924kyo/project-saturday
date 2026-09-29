import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  parseShippedPositionAlphaSessionV2Json,
  programContent,
} from '@project-saturday/game-content';
import type { MessageKey } from '@project-saturday/game-content/locales';
import {
  selectPositionAlphaWeekContextV2,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import { createAppI18n } from '../i18n/i18n';
import { createTransferredPositionAlphaSession } from '../test/position-alpha-fixture';
import {
  CURRENT_POSITION_CASES,
  createCurrentPositionWeekFixture,
} from '../test/position-alpha-current-fixture';
import { PositionAlphaCareerV2 } from './PositionAlphaCareerV2';
import { POSITION_ATTRIBUTE_KEYS, positionProgramNameKey } from './position-labels';

const callbacks = () => ({
  onAdvance: vi.fn(),
  onEvent: vi.fn(),
  onInjury: vi.fn(),
  onSnap: vi.fn(),
  onSettle: vi.fn(),
  onBeginPostseason: vi.fn(),
  onWorldRound: vi.fn(),
  onReview: vi.fn(),
  onCommit: vi.fn(),
  onComplete: vi.fn(),
  onHub: vi.fn(),
  onFocusPlan: vi.fn(),
  onChooseSkill: vi.fn(),
  onEquipSkill: vi.fn(),
  onNil: vi.fn(),
  onRetrySave: vi.fn(),
});

describe.each(['ko-KR', 'en-US'] as const)('current five-purpose shell %s', (locale) => {
  it.each(CURRENT_POSITION_CASES)(
    '%s preserves transferred membership, names and all attribute progress',
    async (positionId, archetypeId) => {
      const historical = createTransferredPositionAlphaSession(positionId, archetypeId);
      const session = parseShippedPositionAlphaSessionV2Json(JSON.stringify(historical))!;
      const before = JSON.stringify(session);
      const mechanics = buildShippedPositionAlphaSessionCommandMechanics({
        identity: session.player,
      })!;
      const i18n = await createAppI18n(locale);
      const commands = callbacks();
      render(
        <I18nextProvider i18n={i18n}>
          <PositionAlphaCareerV2
            {...commands}
            session={session}
            mechanics={mechanics}
            locale={locale}
            busy={false}
            saveFailed={false}
          />
        </I18nextProvider>,
      );
      const user = userEvent.setup();
      const nav = screen.getByRole('navigation', { name: i18n.t('m7Ui.nav.label') });
      const calendar = selectPositionAlphaWeekContextV2(session, mechanics)!;
      const opponent =
        calendar.fixture!.homeProgramId === session.lifecycle.currentProgramId
          ? calendar.fixture!.awayProgramId
          : calendar.fixture!.homeProgramId;
      expect(screen.getByTestId('position-week-context')).toHaveTextContent(
        i18n.t('m7Direct.shell.calendar', { season: 2, week: 1 }),
      );
      expect(screen.getByTestId('position-week-context')).toHaveTextContent(
        i18n.t(positionProgramNameKey(opponent)),
      );
      expect(within(nav).getAllByRole('button')).toHaveLength(5);
      expect(
        screen.getByRole('img', {
          name: i18n.t('career.player.portraitLabel', { name: session.player.displayName }),
        }),
      ).toBeVisible();
      await user.click(within(nav).getByRole('button', { name: i18n.t('m7Ui.nav.team') }));
      await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus());
      expect(
        screen.getByRole('heading', {
          name: i18n.t(positionProgramNameKey(session.lifecycle.currentProgramId)),
        }),
      ).toBeVisible();
      for (const athlete of session.room.competitors) {
        const given = programContent.rosterGivenNames.find(({ id }) => id === athlete.givenNameId)!;
        const family = programContent.rosterFamilyNames.find(
          ({ id }) => id === athlete.familyNameId,
        )!;
        expect(
          screen.getByText(
            i18n.t('career.program.room.competitorName', {
              given: i18n.t(given.nameKey as MessageKey),
              family: i18n.t(family.nameKey as MessageKey),
            }),
          ),
        ).toBeVisible();
      }
      await user.click(within(nav).getByRole('button', { name: i18n.t('m7Ui.nav.player') }));
      for (const id of Object.keys(session.player.attributes))
        expect(
          screen.getByRole('heading', { name: i18n.t(POSITION_ATTRIBUTE_KEYS[id]!) }),
        ).toBeVisible();
      expect(screen.getAllByRole('progressbar')).toHaveLength(
        Object.keys(session.player.attributes).length,
      );
      await user.click(within(nav).getByRole('button', { name: i18n.t('m7Ui.nav.skills') }));
      expect(screen.getAllByRole('combobox')).toHaveLength(4);
      expect(
        screen.queryByText(/m7Direct\.|m7Ui\.|undefined|NaN|\{[a-zA-Z]+\}/),
      ).not.toBeInTheDocument();
      for (const command of Object.values(commands)) expect(command).not.toHaveBeenCalled();
      expect(JSON.stringify(session)).toBe(before);
    },
  );

  it.each(CURRENT_POSITION_CASES)(
    '%s routes saved phases and locks writes without locking navigation',
    async (positionId, archetypeId) => {
      const fixture = createCurrentPositionWeekFixture(positionId, archetypeId);
      const i18n = await createAppI18n(locale);
      const commands = callbacks();
      const view = (session: PositionAlphaSessionV2, saveFailed = false, busy = false) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaCareerV2
            {...commands}
            session={session}
            mechanics={fixture.mechanics}
            locale={locale}
            busy={busy}
            saveFailed={saveFailed}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(fixture.initial));
      const user = userEvent.setup();
      const nav = screen.getByRole('navigation');
      await user.click(within(nav).getByRole('button', { name: i18n.t('m7Ui.nav.week') }));
      expect(screen.getByTestId('position-focus-planner')).toBeVisible();
      expect(screen.getAllByRole('combobox')).toHaveLength(3);
      const active = fixture.boundaries.find((session) => session.gameDay.type === 'ACTIVE_SNAP')!;
      rerender(view(active, true));
      const game = screen.getByTestId('position-game-day');
      expect(screen.queryByTestId('position-focus-planner')).not.toBeInTheDocument();
      for (const button of within(game).getAllByRole('button')) expect(button).toBeDisabled();
      await user.click(screen.getByRole('button', { name: i18n.t('career.save.retry') }));
      expect(commands.onRetrySave).toHaveBeenCalledExactlyOnceWith();
      rerender(view(active, true, true));
      expect(screen.getByRole('button', { name: i18n.t('career.save.retry') })).toBeDisabled();
      await user.click(within(nav).getByRole('button', { name: i18n.t('m7Ui.nav.team') }));
      expect(
        screen.getByRole('heading', { name: i18n.t('m7Ui.nav.team'), level: 2 }),
      ).toBeVisible();
      await user.click(within(nav).getByRole('button', { name: i18n.t('m7Ui.nav.week') }));
      expect(screen.getByTestId('position-game-day')).toHaveAttribute('data-phase', 'ACTIVE_SNAP');
      for (const [key, command] of Object.entries(commands))
        if (key !== 'onRetrySave') expect(command).not.toHaveBeenCalled();
    },
  );
});
