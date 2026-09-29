import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  createShippedPositionAlphaSessionV2,
  defaultWrAppearance,
} from '@project-saturday/game-content';
import { localeMessages } from '@project-saturday/game-content/locales';
import { projectPositionAlphaPlanningV2 } from '@project-saturday/game-core';
import { createAppI18n } from '../i18n/i18n';
import { PositionAlphaFocusPlanner } from './PositionAlphaFocusPlanner';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

describe.each(['ko-KR', 'en-US'] as const)('current focus planner %s', (locale) => {
  it.each(CASES)(
    '%s presents three independent choices and exact domain consequences',
    async (positionId, archetypeId) => {
      const identity = {
        displayName: '집중 / Focus',
        positionId,
        archetypeId,
        recruitingBackgroundId: 'background_late_bloomer' as const,
        personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
        appearance: defaultWrAppearance,
        heightCm: 188,
        weightKg: 92,
      };
      const created = createShippedPositionAlphaSessionV2({
        careerSeed: `focus-ui-${positionId}`,
        programId: 'program_ember_peak_polytechnic',
        identity,
      });
      if (!created.ok) throw new Error(created.reason);
      const session = created.session;
      const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity })!;
      const onCommit = vi.fn();
      const i18n = await createAppI18n(locale);
      const view = (busy: boolean, saveFailed: boolean) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaFocusPlanner
            session={session}
            mechanics={mechanics}
            locale={locale}
            busy={busy}
            saveFailed={saveFailed}
            onCommit={onCommit}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(false, false));
      const user = userEvent.setup();
      const before = JSON.stringify(session);
      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(3);
      for (const select of selects) expect(within(select).getAllByRole('option')).toHaveLength(9);
      const commit = screen.getByRole('button', {
        name: localeMessages[locale]['career.week.commit'],
      });
      expect(commit).toBeDisabled();
      await user.tab();
      expect(selects[0]).toHaveFocus();
      const drill = mechanics.trainingActions.find((action) => action.positionId === positionId)!;
      const plan = [drill.id, 'action_film_study', 'action_study_hall'];
      for (const [index, action] of plan.entries())
        await user.selectOptions(selects[index]!, action);
      const expected = projectPositionAlphaPlanningV2(session, plan, mechanics)!.preparation!;
      expect(commit).toBeEnabled();
      expect(
        screen.getByText(i18n.t('m7Direct.plan.practice', { score: expected.practiceGrade.score })),
      ).toBeVisible();
      expect(
        screen.getByText(
          i18n.t('m7Direct.plan.change', {
            label: i18n.t('career.player.body'),
            before: session.player.state.body,
            after: expected.player.state.body,
          }),
        ),
      ).toBeVisible();
      expect(screen.getByText(localeMessages[locale]['m7Direct.plan.noProficiency'])).toBeVisible();
      await user.click(screen.getByText(localeMessages[locale]['m7Direct.plan.details']));
      expect(
        screen.getAllByText(
          new RegExp(locale === 'ko-KR' ? '다음 레이팅 진행' : 'next-rating progress'),
        ).length,
      ).toBeGreaterThan(0);
      await user.click(commit);
      expect(onCommit).toHaveBeenLastCalledWith(plan);
      for (const select of selects) await user.selectOptions(select, drill.id);
      await user.click(commit);
      expect(onCommit).toHaveBeenLastCalledWith([drill.id, drill.id, drill.id]);
      rerender(view(true, false));
      expect(commit).toBeDisabled();
      for (const select of selects) expect(select).toBeDisabled();
      rerender(view(false, true));
      expect(commit).toBeDisabled();
      await user.click(commit);
      expect(onCommit).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(session)).toBe(before);
      expect(screen.queryByText(/m7Direct\./)).not.toBeInTheDocument();
    },
  );
});
