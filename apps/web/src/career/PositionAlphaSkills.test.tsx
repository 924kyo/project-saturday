import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  parseShippedPositionAlphaSessionV2Json,
  positionSkillBuilds,
  resolveShippedPositionAlphaEvent,
} from '@project-saturday/game-content';
import { localeMessages } from '@project-saturday/game-content/locales';
import {
  equipPositionAlphaSkillV2,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import { createAppI18n } from '../i18n/i18n';
import {
  advancePositionAlphaFixture,
  createTransferredPositionAlphaSession,
  POSITION_ALPHA_TRANSFER_CASES,
} from '../test/position-alpha-fixture';
import { PositionAlphaSkills } from './PositionAlphaSkills';
import { createCurrentPositionWeekFixture } from '../test/position-alpha-current-fixture';

describe.each(['ko-KR', 'en-US'] as const)('current skill UI %s', (locale) => {
  it.each(POSITION_ALPHA_TRANSFER_CASES)(
    '%s displays real current source evidence and locks an in-flight build',
    async (positionId, archetypeId) => {
      const fixture = createCurrentPositionWeekFixture(positionId, archetypeId);
      const latest = fixture.next.weekHistory.at(-1)!;
      if (latest.model !== 'position_alpha_week_summary_v2')
        throw new Error('Missing actual current week');
      expect(latest.breakthrough.progress.sources.length).toBeGreaterThan(0);
      expect(fixture.boundaries.some((value) => value.gameDay.type === 'ACTIVE_SNAP')).toBe(true);
      const i18n = await createAppI18n(locale);
      const view = (session: PositionAlphaSessionV2) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaSkills
            session={session}
            locale={locale}
            busy={false}
            saveFailed={false}
            onEquip={vi.fn()}
            onChoose={vi.fn()}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(fixture.next));
      await userEvent.setup().click(
        screen.getByText(
          i18n.t('career.skills.gauge.latestEvidence', {
            count: latest.breakthrough.progress.weekIndex + 1,
          }),
        ),
      );
      for (const source of latest.breakthrough.progress.sources)
        expect(
          screen.getAllByText(
            new RegExp(
              i18n
                .t('career.skills.gauge.points', { count: source.points })
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            ),
          ).length,
        ).toBeGreaterThan(0);
      rerender(view(fixture.postGame));
      for (const slot of screen.getAllByRole('combobox')) expect(slot).toBeDisabled();
      expect(
        screen.getByText(localeMessages[locale]['career.skills.inventory.locked']),
      ).toBeVisible();
    },
  );
  it.each(POSITION_ALPHA_TRANSFER_CASES)(
    '%s displays all four slots, current effects and an unchanged saved offer',
    async (positionId, archetypeId) => {
      const historical = createTransferredPositionAlphaSession(positionId, archetypeId);
      const session = parseShippedPositionAlphaSessionV2Json(JSON.stringify(historical))!;
      const before = JSON.stringify(session);
      const mechanics = buildShippedPositionAlphaSessionCommandMechanics({
        identity: session.player,
      })!;
      const i18n = await createAppI18n(locale);
      const onEquip = vi.fn();
      const onChoose = vi.fn();
      const view = (value: PositionAlphaSessionV2, saveFailed = false) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaSkills
            session={value}
            locale={locale}
            busy={false}
            saveFailed={saveFailed}
            onEquip={onEquip}
            onChoose={onChoose}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(session));
      const user = userEvent.setup();
      const slots = screen.getAllByRole('combobox');
      expect(slots).toHaveLength(4);
      expect(slots[3]).toHaveValue('');
      const skillId = session.skills.ownedSkillIds[0]!;
      await user.selectOptions(slots[3]!, skillId);
      expect(onEquip).toHaveBeenLastCalledWith(skillId, 3);
      // Only a successful owning command/publication changes the controlled slot display.
      expect(slots[3]).toHaveValue('');
      const equipped = equipPositionAlphaSkillV2(session, skillId, 3, mechanics);
      if (!equipped.ok) throw new Error(equipped.reason);
      rerender(view(equipped.session));
      expect(slots[3]).toHaveValue(skillId);
      expect(equipped.session.skills.equippedSkillIds.filter((id) => id === skillId)).toHaveLength(
        1,
      );
      await user.selectOptions(slots[3]!, '');
      expect(onEquip).toHaveBeenLastCalledWith(null, 3);
      await user.click(
        screen.getByText(localeMessages[locale]['m7Ui.skills.build'], { selector: 'summary' }),
      );
      for (const supplement of positionSkillBuilds.filter(({ skillId: id }) =>
        session.skills.ownedSkillIds.includes(id),
      )) {
        expect(screen.getByText(localeMessages[locale][supplement.descriptionKey])).toBeVisible();
      }
      rerender(view(equipped.session, true));
      for (const slot of slots) expect(slot).toBeDisabled();
      let pending = historical;
      for (let index = 0; index < 12 && pending.skills.offeredSkillIds === null; index += 1) {
        if (pending.events.pending !== null) {
          const resolved = resolveShippedPositionAlphaEvent(
            pending,
            pending.events.pending.choiceIds[0]!,
          );
          if (!resolved.ok) throw new Error(resolved.reason);
          pending = resolved.session;
        }
        pending = advancePositionAlphaFixture(pending);
      }
      if (pending.skills.offeredSkillIds === null) throw new Error('Expected saved offer');
      const migrated = parseShippedPositionAlphaSessionV2Json(JSON.stringify(pending))!;
      rerender(view(migrated));
      expect(
        screen.getByRole('heading', { name: localeMessages[locale]['m7Ui.skills.breakthrough'] }),
      ).toBeVisible();
      const choices = screen.getAllByRole('button');
      expect(choices).toHaveLength(3);
      for (const slot of screen.getAllByRole('combobox')) expect(slot).toBeDisabled();
      choices[0]!.focus();
      await user.keyboard('{Enter}');
      expect(onChoose).toHaveBeenCalledExactlyOnceWith(pending.skills.offeredSkillIds[0]);
      expect(screen.getAllByRole('button')).toHaveLength(3);
      rerender(view(migrated, true));
      for (const choice of screen.getAllByRole('button')) expect(choice).toBeDisabled();
      expect(JSON.stringify(session)).toBe(before);
      expect(screen.queryByText(/m7Direct\./)).not.toBeInTheDocument();
    },
  );
});
