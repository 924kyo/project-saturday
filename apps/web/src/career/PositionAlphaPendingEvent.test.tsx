import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  chooseShippedPositionAlphaSkill,
  parseShippedPositionAlphaSessionV2Json,
  buildShippedPositionAlphaSessionCommandMechanics,
} from '@project-saturday/game-content';
import { resolvePositionAlphaEventV2 } from '@project-saturday/game-core';
import { createAppI18n } from '../i18n/i18n';
import {
  advancePositionAlphaFixture,
  createTransferredPositionAlphaSession,
  POSITION_ALPHA_TRANSFER_CASES,
} from '../test/position-alpha-fixture';
import { PositionAlphaPendingEvent } from './PositionAlphaPendingEvent';

describe.each(['ko-KR', 'en-US'] as const)('preserved pending event UI %s', (locale) => {
  it.each(POSITION_ALPHA_TRANSFER_CASES)(
    '%s retains saved choices and waits for successful publication',
    async (positionId, archetypeId) => {
      let historical = createTransferredPositionAlphaSession(positionId, archetypeId);
      for (let week = 0; week < 12 && historical.events.pending === null; week += 1) {
        if (historical.skills.offeredSkillIds !== null) {
          const chosen = chooseShippedPositionAlphaSkill(
            historical,
            historical.skills.offeredSkillIds[0],
          );
          if (!chosen.ok) throw new Error(chosen.reason);
          historical = chosen.session;
        }
        historical = advancePositionAlphaFixture(historical);
      }
      if (historical.events.pending === null) throw new Error('Missing real historical event');
      const session = parseShippedPositionAlphaSessionV2Json(JSON.stringify(historical))!;
      const before = JSON.stringify(session);
      const i18n = await createAppI18n(locale);
      const onChoose = vi.fn();
      const view = (value = session, saveFailed = false, busy = false) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaPendingEvent
            session={value}
            locale={locale}
            saveFailed={saveFailed}
            busy={busy}
            onChoose={onChoose}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view());
      await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus());
      const choices = screen.getAllByRole('button');
      expect(choices).toHaveLength(historical.events.pending.choiceIds.length);
      for (const choice of choices) {
        expect(choice).toHaveAccessibleName();
        expect(choice).toHaveAccessibleDescription();
      }
      const user = userEvent.setup();
      choices[0]!.focus();
      await user.keyboard('{Enter}');
      expect(onChoose).toHaveBeenCalledExactlyOnceWith(historical.events.pending.choiceIds[0]);
      for (const lock of ['failure', 'busy'] as const) {
        rerender(view(session, lock === 'failure', lock === 'busy'));
        for (const choice of screen.getAllByRole('button')) {
          expect(choice).toBeDisabled();
          await user.click(choice);
        }
      }
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(session)).toBe(before);
      const resolved = resolvePositionAlphaEventV2(
        session,
        historical.events.pending.choiceIds[0]!,
        buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player })!,
      );
      if (!resolved.ok) throw new Error(resolved.reason);
      expect(resolved.session.careerRng).toEqual(session.careerRng);
      expect(resolved.session.world).toEqual(session.world);
      rerender(view(resolved.session));
      expect(screen.queryByTestId('position-pending-event')).not.toBeInTheDocument();
    },
  );
});
