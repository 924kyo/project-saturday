import {
  chooseShippedPositionAlphaSkill,
  commitShippedPositionAlphaOffseason,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  positionAlphaContent,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaSeason,
  resolveShippedPositionAlphaWeek,
} from '@project-saturday/game-content';
import { localeMessages, type SupportedLocale } from '@project-saturday/game-content/locales';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../i18n/i18n';
import { PositionAlphaCareer, PositionAlphaCreation } from './PositionAlphaExperience';

const QB_POSITION_ID = 'position_qb' as const;
const EN_US_LOCALE = 'en-US' as const;
const TRANSFER_CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

async function renderLocalized(locale: SupportedLocale, element: React.ReactNode): Promise<void> {
  const i18n = await createAppI18n(locale);
  render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

function sessionAfterWeek() {
  const created = createShippedPositionAlphaSession({
    careerSeed: 'm7-position-ui',
    programId: 'program_ember_peak_polytechnic',
    identity: {
      displayName: 'Purpose Player',
      positionId: QB_POSITION_ID,
      archetypeId: 'archetype_qb_field_general',
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      appearance: defaultWrAppearance,
      heightCm: 188,
      weightKg: 92,
    },
  });
  if (!created.ok) throw new Error(created.reason);
  const action = positionAlphaContent.trainingActions.find(
    ({ positionId }) => positionId === QB_POSITION_ID,
  )!;
  const resolved = resolveShippedPositionAlphaWeek(created.session, action.id, 'best_fit');
  if (!resolved.ok) throw new Error(resolved.reason);
  if (resolved.session.events.pending === null) return resolved.session;
  const settled = resolveShippedPositionAlphaEvent(
    resolved.session,
    resolved.session.events.pending.choiceIds[0]!,
  );
  if (!settled.ok) throw new Error(settled.reason);
  return settled.session;
}

function transferredSession(
  positionId: (typeof TRANSFER_CASES)[number][0],
  archetypeId: (typeof TRANSFER_CASES)[number][1],
) {
  const created = createShippedPositionAlphaSession({
    careerSeed: `m7-team-transfer-${positionId}`,
    programId: 'program_ember_peak_polytechnic',
    identity: {
      displayName: 'Transfer Player',
      positionId,
      archetypeId,
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      appearance: defaultWrAppearance,
      heightCm: 188,
      weightKg: 92,
    },
  });
  if (!created.ok) throw new Error(created.reason);
  const actions = positionAlphaContent.trainingActions.filter(
    (action) => action.positionId === positionId,
  );
  let session = created.session;
  for (let weekIndex = 0; weekIndex < 12; weekIndex += 1) {
    const resolved = resolveShippedPositionAlphaWeek(
      session,
      actions[weekIndex % actions.length]!.id,
      'best_fit',
    );
    if (!resolved.ok) throw new Error(resolved.reason);
    session = resolved.session;
    if (session.skills.offeredSkillIds !== null) {
      const chosen = chooseShippedPositionAlphaSkill(session, session.skills.offeredSkillIds[0]);
      if (!chosen.ok) throw new Error(chosen.reason);
      session = chosen.session;
    }
    if (session.events.pending !== null) {
      const settled = resolveShippedPositionAlphaEvent(
        session,
        session.events.pending.choiceIds[0],
      );
      if (!settled.ok) throw new Error(settled.reason);
      session = settled.session;
    }
  }
  const reviewed = resolveShippedPositionAlphaSeason(session, 'best_fit');
  if (!reviewed.ok) throw new Error(reviewed.reason);
  const transfer = reviewed.session.lifecycle.offseason?.options[1];
  if (transfer === undefined) throw new Error('Expected a transfer option.');
  const committed = commitShippedPositionAlphaOffseason(reviewed.session, transfer.programId);
  if (!committed.ok) throw new Error(committed.reason);
  return committed.session;
}

describe('M7 position alpha experience', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'creates a graphical persistent identity with all 32 programs in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onCreate = vi.fn();
      await renderLocalized(
        locale,
        <PositionAlphaCreation
          busy={false}
          locale={locale}
          positionId={QB_POSITION_ID}
          saveFailed={false}
          onCreate={onCreate}
        />,
      );
      expect(screen.getByText(localeMessages[locale]['m7Ui.creation.eyebrow'])).toBeVisible();
      expect(screen.getByRole('img')).toBeVisible();
      expect(
        within(screen.getByTestId('position-alpha-program')).getAllByRole('option'),
      ).toHaveLength(32);
      await user.type(screen.getByTestId('position-alpha-name'), 'Bilingual Player');
      await user.click(
        screen.getByText(localeMessages[locale]['creation.personalities.disciplined.name']),
      );
      await user.click(
        screen.getByText(localeMessages[locale]['creation.personalities.leader.name']),
      );
      await user.click(
        screen.getByRole('button', { name: localeMessages[locale]['m7Ui.creation.submit'] }),
      );
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: expect.objectContaining({
            displayName: 'Bilingual Player',
            positionId: QB_POSITION_ID,
          }),
        }),
      );
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'navigates by purpose and explains real weekly/depth/XP consequences in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onAdvanceWeek = vi.fn();
      await renderLocalized(
        locale,
        <PositionAlphaCareer
          busy={false}
          locale={locale}
          saveFailed={false}
          session={sessionAfterWeek()}
          onAdvanceWeek={onAdvanceWeek}
          onChooseSkill={vi.fn()}
          onCommitOffseason={vi.fn()}
          onEquipSkill={vi.fn()}
          onResolveEvent={vi.fn()}
          onResolveSeason={vi.fn()}
          onRetrySave={vi.fn()}
        />,
      );
      expect(screen.getByText(localeMessages[locale]['m7Ui.help.consequences'])).toBeVisible();
      await user.click(
        screen.getByRole('button', { name: localeMessages[locale]['m7Ui.nav.week'] }),
      );
      expect(screen.getByText(localeMessages[locale]['m7Ui.week.proficiency'])).toBeVisible();
      expect(screen.getByText(localeMessages[locale]['m7Ui.week.approach'])).toBeVisible();
      await user.click(
        screen.getByRole('button', { name: localeMessages[locale]['m7Ui.week.resolve'] }),
      );
      expect(onAdvanceWeek).toHaveBeenCalledWith(expect.stringMatching(/^action_qb_/u), 'best_fit');
      await user.click(
        screen.getByRole('button', { name: localeMessages[locale]['m7Ui.nav.team'] }),
      );
      expect(screen.getByText(localeMessages[locale]['m7Ui.team.depthHelp'])).toBeVisible();
      await user.click(
        screen.getByRole('button', { name: localeMessages[locale]['m7Ui.nav.player'] }),
      );
      expect(screen.getByText(localeMessages[locale]['m7Ui.player.seasonStats'])).toBeVisible();
      expect(
        screen.getAllByRole('progressbar', {
          name: localeMessages[locale]['m7Ui.player.xp'],
        }),
      ).not.toHaveLength(0);
    },
  );

  it('locks the command and exposes exact retry after a save failure', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    await renderLocalized(
      EN_US_LOCALE,
      <PositionAlphaCareer
        busy={false}
        locale={EN_US_LOCALE}
        saveFailed
        session={sessionAfterWeek()}
        onAdvanceWeek={vi.fn()}
        onChooseSkill={vi.fn()}
        onCommitOffseason={vi.fn()}
        onEquipSkill={vi.fn()}
        onResolveEvent={vi.fn()}
        onResolveSeason={vi.fn()}
        onRetrySave={retry}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: localeMessages[EN_US_LOCALE]['career.save.retry'] }),
    );
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each(TRANSFER_CASES)(
    'renders the current Team room after a %s transfer',
    async (positionId, archetypeId) => {
      const user = userEvent.setup();
      const session = transferredSession(positionId, archetypeId);
      await renderLocalized(
        EN_US_LOCALE,
        <PositionAlphaCareer
          busy={false}
          locale={EN_US_LOCALE}
          saveFailed={false}
          session={session}
          onAdvanceWeek={vi.fn()}
          onChooseSkill={vi.fn()}
          onCommitOffseason={vi.fn()}
          onEquipSkill={vi.fn()}
          onResolveEvent={vi.fn()}
          onResolveSeason={vi.fn()}
          onRetrySave={vi.fn()}
        />,
      );
      await user.click(
        screen.getByRole('button', { name: localeMessages[EN_US_LOCALE]['m7Ui.nav.team'] }),
      );
      expect(screen.getByText(localeMessages[EN_US_LOCALE]['m7Ui.team.depthHelp'])).toBeVisible();
      expect(screen.getByText(localeMessages[EN_US_LOCALE]['m7Ui.team.help'])).toBeVisible();
    },
  );
});
