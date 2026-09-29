import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { cbAlphaContent, qbAlphaContent, rbAlphaContent } from '@project-saturday/game-content';
import type { MessageKey } from '@project-saturday/game-content/locales';
import {
  ATTRIBUTE_XP_PER_RATING,
  projectPositionAlphaGamePreviewV2,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import { createAppI18n } from '../i18n/i18n';
import {
  CURRENT_POSITION_CASES,
  createCurrentPositionWeekFixture,
} from '../test/position-alpha-current-fixture';
import { PositionAlphaGameDay } from './PositionAlphaGameDay';
import { POSITION_ATTRIBUTE_KEYS, POSITION_STAT_FIELD_KEYS } from './position-labels';

const CATALOGS = {
  position_qb: qbAlphaContent,
  position_rb: rbAlphaContent,
  position_cb: cbAlphaContent,
};

describe.each(['ko-KR', 'en-US'] as const)('saved direct Game Day UI %s', (locale) => {
  it.each(CURRENT_POSITION_CASES)(
    '%s renders actual boundaries and forwards only explicit saved choices',
    async (positionId, archetypeId) => {
      const fixture = createCurrentPositionWeekFixture(positionId, archetypeId);
      const i18n = await createAppI18n(locale);
      const callbacks = {
        onAdvance: vi.fn(),
        onEvent: vi.fn(),
        onInjury: vi.fn(),
        onSnap: vi.fn(),
        onSettle: vi.fn(),
      };
      const view = (session: PositionAlphaSessionV2, saveFailed = false, busy = false) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaGameDay
            session={session}
            mechanics={fixture.mechanics}
            locale={locale}
            saveFailed={saveFailed}
            busy={busy}
            {...callbacks}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(fixture.initial));
      expect(screen.queryByTestId('position-game-day')).not.toBeInTheDocument();
      const phases = new Set<string>();
      const user = userEvent.setup();
      for (const session of fixture.boundaries) {
        const before = JSON.stringify(session);
        const day = session.gameDay;
        if (day.type === 'IDLE') continue;
        phases.add(day.type);
        rerender(view(session));
        const heading = screen.getByRole('heading', { level: 2 });
        await waitFor(() => expect(heading).toHaveFocus());
        expect(screen.getByTestId('position-game-day')).toHaveAttribute('data-phase', day.type);
        expect(
          screen.queryByText(/m7Direct\.|m7Ui\.|undefined|NaN|\{[a-zA-Z]+\}/),
        ).not.toBeInTheDocument();
        if (day.type === 'GAME_PREVIEW') {
          const preview = projectPositionAlphaGamePreviewV2(session, fixture.mechanics)!;
          expect(preview.opportunityCount).toBeGreaterThan(0);
          expect(
            screen.getByText(
              i18n.t('m7Direct.day.participation', { count: preview.opportunityCount }),
            ),
          ).toBeVisible();
        }
        if (day.type === 'ACTIVE_SNAP') {
          if (day.game?.game.type !== 'ACTIVE') throw new Error('Missing active game');
          const pending = day.game.game.pendingSnap;
          expect(screen.getAllByRole('button')).toHaveLength(pending.decisionIds.length);
          for (const clue of CATALOGS[positionId].clues) {
            const element = screen.queryByText(i18n.t(clue.descriptionKey as MessageKey));
            if (pending.revealedClueIds.some((id) => id === clue.id)) expect(element).toBeVisible();
            else expect(element).not.toBeInTheDocument();
          }
          const decision = CATALOGS[positionId].decisions.find(
            ({ id }) => id === pending.decisionIds[0],
          )!;
          const button = screen.getByRole('button', {
            name: i18n.t(decision.nameKey as MessageKey),
          });
          expect(button).toHaveAccessibleDescription(i18n.t(decision.descriptionKey as MessageKey));
          button.focus();
          await user.keyboard('{Enter}');
          expect(callbacks.onSnap).toHaveBeenLastCalledWith(pending.decisionIds[0]);
        } else if (day.type === 'EVENT_CHOICE') {
          const buttons = screen
            .getAllByRole('button')
            .filter((button) => !button.hasAttribute('disabled'));
          expect(buttons).toHaveLength(day.event!.choiceIds.length);
          await user.click(buttons[0]!);
          expect(callbacks.onEvent).toHaveBeenLastCalledWith(day.event!.choiceIds[0]);
        } else if (day.type === 'INJURY_CHOICE') {
          await user.click(screen.getAllByRole('button')[0]!);
          expect(callbacks.onInjury).toHaveBeenCalled();
        } else {
          await user.click(screen.getByRole('button'));
          expect(
            day.type === 'POST_GAME' ? callbacks.onSettle : callbacks.onAdvance,
          ).toHaveBeenCalled();
        }
        // A callback cannot publish state, consume RNG, or move this controlled screen itself.
        expect(screen.getByTestId('position-game-day')).toHaveAttribute('data-phase', day.type);
        expect(JSON.stringify(session)).toBe(before);
        const calls = Object.values(callbacks).map((callback) => callback.mock.calls.length);
        for (const lock of ['failed', 'busy'] as const) {
          rerender(view(session, lock === 'failed', lock === 'busy'));
          for (const button of screen.getAllByRole('button')) {
            expect(button).toBeDisabled();
            await user.click(button);
          }
          expect(Object.values(callbacks).map((callback) => callback.mock.calls.length)).toEqual(
            calls,
          );
        }
      }
      for (const required of [
        'PRACTICE_REVIEW',
        'GAME_PREVIEW',
        'ACTIVE_SNAP',
        'RESOLVED_SNAP',
        'POST_GAME',
      ])
        expect(phases.has(required)).toBe(true);
      rerender(view(fixture.postGame));
      const completed = fixture.postGame.gameDay;
      if (completed.type !== 'POST_GAME' || completed.game?.game.type !== 'COMPLETE')
        throw new Error('Missing completion');
      for (const xp of completed.game.game.growth.attributeXp) {
        expect(
          screen.getByText(
            i18n.t('m7Direct.day.xp', {
              attribute: i18n.t(POSITION_ATTRIBUTE_KEYS[xp.attributeId]!),
              xp: xp.awardedXp,
              ratingBefore: xp.ratingBefore,
              ratingAfter: xp.ratingAfter,
              progress: xp.xpAfter,
              required: ATTRIBUTE_XP_PER_RATING,
            }),
          ),
        ).toBeVisible();
      }
      await user.click(screen.getByText(i18n.t('m7Direct.day.stats')));
      for (const [field, value] of Object.entries(completed.game.game.summary.statLine)) {
        expect(POSITION_STAT_FIELD_KEYS[field]).toBeDefined();
        expect(
          screen.getByText(
            i18n.t('m7Direct.day.stat', {
              label: i18n.t(POSITION_STAT_FIELD_KEYS[field]!),
              value: new Intl.NumberFormat(locale).format(value),
            }),
          ),
        ).toBeVisible();
      }
    },
  );

  it.each(CURRENT_POSITION_CASES)(
    '%s displays real academic and injury evidence at migrated boundaries',
    async (positionId, archetypeId) => {
      const academicFixture = createCurrentPositionWeekFixture(positionId, archetypeId, {
        legacyWeeks: 5,
      });
      const academic = academicFixture.boundaries.find(
        (session) => session.gameDay.type === 'ACADEMIC_REVIEW',
      );
      if (
        !academic ||
        academic.gameDay.type !== 'ACADEMIC_REVIEW' ||
        !academic.gameDay.academics?.checkpoint
      )
        throw new Error('Missing scheduled midterm');
      const i18n = await createAppI18n(locale);
      const onAdvance = vi.fn();
      const onInjury = vi.fn();
      const view = (session: PositionAlphaSessionV2, saveFailed = false) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaGameDay
            session={session}
            mechanics={academicFixture.mechanics}
            locale={locale}
            busy={false}
            saveFailed={saveFailed}
            onAdvance={onAdvance}
            onEvent={vi.fn()}
            onInjury={onInjury}
            onSnap={vi.fn()}
            onSettle={vi.fn()}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(academic));
      const checkpoint = academic.gameDay.academics.checkpoint;
      expect(
        screen.getByText(
          i18n.t('career.offField.academics.gpa', {
            gpa: new Intl.NumberFormat(locale).format(checkpoint.gpaMilli / 1000),
          }),
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          i18n.t('career.offField.academics.thresholds', {
            eligible: new Intl.NumberFormat(locale).format(checkpoint.eligibleGpaMilli / 1000),
            warning: new Intl.NumberFormat(locale).format(checkpoint.warningGpaMilli / 1000),
          }),
        ),
      ).toBeVisible();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button'));
      expect(onAdvance).toHaveBeenCalledExactlyOnceWith();
      let injury: PositionAlphaSessionV2 | undefined;
      for (let seed = 0; seed < 8 && !injury; seed += 1) {
        injury = createCurrentPositionWeekFixture(positionId, archetypeId, {
          initialBody: 0,
          seedSuffix: `-injury-${seed}`,
        }).boundaries.find((session) => session.gameDay.type === 'INJURY_CHOICE');
      }
      if (!injury || injury.gameDay.type !== 'INJURY_CHOICE')
        throw new Error('Missing actual sampled injury');
      const before = JSON.stringify(injury);
      rerender(view(injury));
      await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus());
      expect(screen.getAllByRole('button')).toHaveLength(2);
      const rest = screen.getAllByRole('button')[0]!;
      expect(rest).toHaveAccessibleDescription();
      rest.focus();
      await user.keyboard('{Enter}');
      expect(onInjury).toHaveBeenCalledExactlyOnceWith('injury_choice_rest_rehab');
      expect(screen.getByTestId('position-game-day')).toHaveAttribute(
        'data-phase',
        'INJURY_CHOICE',
      );
      rerender(view(injury, true));
      for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
      expect(JSON.stringify(injury)).toBe(before);
      expect(screen.queryByText(/m7Direct\.|undefined|NaN|\{[a-zA-Z]+\}/)).not.toBeInTheDocument();
    },
  );

  it.each(CURRENT_POSITION_CASES)(
    '%s preserves a real zero-opportunity game without invented snaps or growth',
    async (positionId, archetypeId) => {
      const fixture = createCurrentPositionWeekFixture(positionId, archetypeId, {
        positiveOpportunity: false,
      });
      expect(fixture.boundaries.some((session) => session.gameDay.type === 'ACTIVE_SNAP')).toBe(
        false,
      );
      const day = fixture.postGame.gameDay;
      if (day.type !== 'POST_GAME' || day.game?.game.type !== 'COMPLETE')
        throw new Error('Missing zero-snap completion');
      expect(day.game.game.summary.opportunityCount).toBe(0);
      expect(day.game.game.growth.attributeXp).toEqual([]);
      const i18n = await createAppI18n(locale);
      render(
        <I18nextProvider i18n={i18n}>
          <PositionAlphaGameDay
            session={fixture.postGame}
            mechanics={fixture.mechanics}
            locale={locale}
            busy={false}
            saveFailed={false}
            onAdvance={vi.fn()}
            onEvent={vi.fn()}
            onInjury={vi.fn()}
            onSnap={vi.fn()}
            onSettle={vi.fn()}
          />
        </I18nextProvider>,
      );
      expect(screen.getByText(i18n.t('career.game.postGame.noAttributeXp'))).toBeVisible();
      const feedback = {
        position_qb: 'm7Direct.day.qbReview',
        position_rb: 'm7Direct.day.rbReview',
        position_cb: 'm7Direct.day.cbReview',
      } as const;
      expect(screen.getByText(i18n.t(feedback[positionId]))).toBeVisible();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    },
  );
});
