import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  parseShippedPositionAlphaSessionV2Json,
} from '@project-saturday/game-content';
import {
  commitPositionAlphaOffseasonV2,
  completePositionAlphaCareerV2,
  selectPositionAlphaWeekContextV2,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import { createAppI18n } from '../i18n/i18n';
import { CURRENT_POSITION_CASES } from '../test/position-alpha-current-fixture';
import { createCurrentPositionSeasonFixture } from '../test/position-alpha-season-fixture';
import { createCompletedPositionAlphaFixture } from '../test/position-alpha-fixture';
import { POSITION_CAREER_STAT_KEYS } from './position-labels';
import { PositionAlphaSeasonFlow } from './PositionAlphaSeasonFlow';

const callbacks = () => ({
  onBeginPostseason: vi.fn(),
  onWorldRound: vi.fn(),
  onReview: vi.fn(),
  onCommit: vi.fn(),
  onComplete: vi.fn(),
  onHub: vi.fn(),
});

describe.each(['ko-KR', 'en-US'] as const)('current season presentation %s', (locale) => {
  it.each(CURRENT_POSITION_CASES)(
    '%s separates world-only rounds and commits only a selected saved option',
    async (positionId, archetypeId) => {
      const fixture = createCurrentPositionSeasonFixture(positionId, archetypeId, 0, false);
      const i18n = await createAppI18n(locale);
      const handlers = callbacks();
      const view = (session: PositionAlphaSessionV2, saveFailed = false) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaSeasonFlow
            session={session}
            locale={locale}
            busy={false}
            saveFailed={saveFailed}
            {...handlers}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(fixture.reviewed));
      const user = userEvent.setup();
      let worldRounds = 0;
      const seenRevisions = new Set<number>();
      for (const boundary of fixture.boundaries) {
        if (seenRevisions.has(boundary.revision)) continue;
        seenRevisions.add(boundary.revision);
        if (
          !['SEASON_REVIEW', 'POSTSEASON_PLANNING', 'POSTSEASON_REVIEW'].includes(
            boundary.phase.type,
          )
        )
          continue;
        const before = JSON.stringify(boundary);
        rerender(view(boundary));
        if (screen.queryByTestId('position-season-flow') === null) continue;
        await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus());
        await user.click(screen.getByRole('button'));
        if (boundary.phase.type === 'SEASON_REVIEW')
          expect(handlers.onBeginPostseason).toHaveBeenCalled();
        if (boundary.phase.type === 'POSTSEASON_REVIEW')
          expect(handlers.onReview).toHaveBeenCalled();
        if (boundary.phase.type === 'POSTSEASON_PLANNING') {
          worldRounds += 1;
          expect(selectPositionAlphaWeekContextV2(boundary, fixture.mechanics)?.fixture).toBeNull();
          expect(handlers.onWorldRound).toHaveBeenCalled();
          expect(screen.getByText(i18n.t('m7Direct.season.worldOnly'))).toBeVisible();
        }
        expect(JSON.stringify(boundary)).toBe(before);
        rerender(view(boundary, true));
        expect(screen.getByRole('button')).toBeDisabled();
      }
      expect(worldRounds).toBeGreaterThan(0);
      rerender(view(fixture.reviewed));
      expect(selectPositionAlphaWeekContextV2(fixture.reviewed, fixture.mechanics)).toBeNull();
      const selected = fixture.reviewed.lifecycle.offseason!.options[1];
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      expect(screen.getByRole('button')).toBeDisabled();
      await user.click(screen.getAllByRole('radio')[1]!);
      await user.click(screen.getByRole('button'));
      expect(handlers.onCommit).toHaveBeenCalledExactlyOnceWith(selected.programId);
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      rerender(view(fixture.reviewed, true));
      for (const control of [...screen.getAllByRole('radio'), screen.getByRole('button')])
        expect(control).toBeDisabled();
      const committed = commitPositionAlphaOffseasonV2(
        fixture.reviewed,
        selected.programId,
        fixture.mechanics,
      );
      if (!committed.ok) throw new Error(committed.reason);
      expect(committed.session.lifecycle.currentProgramId).toBe(selected.programId);
      rerender(view(committed.session));
      expect(screen.queryByTestId('position-season-flow')).not.toBeInTheDocument();
    },
  );

  it.each(CURRENT_POSITION_CASES)(
    '%s retires a real current second-season review without a third program',
    async (positionId, archetypeId) => {
      const hasPlayerRound = (boundary: PositionAlphaSessionV2) => {
        const postseason = boundary.world.postseason;
        return (
          boundary.phase.type === 'POSTSEASON_PLANNING' &&
          postseason.type === 'ACTIVE' &&
          postseason.rounds[postseason.currentRoundIndex].fixtures.some(
            ({ homeProgramId, awayProgramId }) =>
              homeProgramId === boundary.world.playerProgramId ||
              awayProgramId === boundary.world.playerProgramId,
          )
        );
      };
      let fixture = createCurrentPositionSeasonFixture(positionId, archetypeId, 1);
      // Find a real qualified career without editing rankings, fixtures, or football evidence.
      for (let seed = 1; seed < 8 && !fixture.boundaries.some(hasPlayerRound); seed += 1)
        fixture = createCurrentPositionSeasonFixture(positionId, archetypeId, 1, true, seed);
      const i18n = await createAppI18n(locale);
      const handlers = callbacks();
      const view = (session: PositionAlphaSessionV2, busy = false) => (
        <I18nextProvider i18n={i18n}>
          <PositionAlphaSeasonFlow
            session={session}
            locale={locale}
            busy={busy}
            saveFailed={false}
            {...handlers}
          />
        </I18nextProvider>
      );
      const { rerender } = render(view(fixture.reviewed));
      const playerRounds = fixture.boundaries.filter(hasPlayerRound);
      expect(playerRounds.length).toBeGreaterThan(0);
      for (const boundary of playerRounds) {
        const calendar = selectPositionAlphaWeekContextV2(boundary, fixture.mechanics)!;
        expect(calendar.seasonIndex).toBe(1);
        expect([calendar.fixture!.homeProgramId, calendar.fixture!.awayProgramId]).toContain(
          boundary.lifecycle.currentProgramId,
        );
        rerender(view(boundary));
        expect(screen.queryByTestId('position-season-flow')).not.toBeInTheDocument();
      }
      rerender(view(fixture.reviewed));
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.getByText(i18n.t('m7Direct.season.retireHelp'))).toBeVisible();
      const user = userEvent.setup();
      const retire = screen.getByRole('button', { name: i18n.t('m7Direct.season.retire') });
      retire.focus();
      await user.keyboard('{Enter}');
      expect(handlers.onComplete).toHaveBeenCalledExactlyOnceWith();
      expect(handlers.onCommit).not.toHaveBeenCalled();
      rerender(view(fixture.reviewed, true));
      expect(screen.getByRole('button')).toBeDisabled();
      const completed = completePositionAlphaCareerV2(fixture.reviewed, fixture.mechanics);
      if (!completed.ok) throw new Error(completed.reason);
      expect(completed.session.lifecycle.programHistory).toEqual(
        fixture.reviewed.lifecycle.programHistory,
      );
      rerender(view(completed.session));
      await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus());
      expect(screen.getByRole('img', { name: completed.session.player.displayName })).toBeVisible();
      const totals = within(screen.getByTestId('position-alumni-totals'));
      for (const { statId, value } of completed.session.meta!.alumni[0]!.careerStats.entries)
        expect(
          totals.getByText(
            i18n.t('m7Direct.day.stat', {
              label: i18n.t(POSITION_CAREER_STAT_KEYS[statId]!),
              value: new Intl.NumberFormat(locale).format(value),
            }),
          ),
        ).toBeVisible();
      await user.click(screen.getByRole('button', { name: i18n.t('m7Direct.season.hub') }));
      expect(handlers.onHub).toHaveBeenCalledExactlyOnceWith();
      expect(screen.queryByText(/m7Direct\.|undefined|NaN|\{[a-zA-Z]+\}/)).not.toBeInTheDocument();
    },
  );

  it.each(CURRENT_POSITION_CASES)(
    '%s labels and preserves a migrated legacy final decision',
    async (positionId, archetypeId) => {
      const fixture = createCompletedPositionAlphaFixture(positionId, archetypeId);
      const session = parseShippedPositionAlphaSessionV2Json(JSON.stringify(fixture.offseason))!;
      const i18n = await createAppI18n(locale);
      const handlers = callbacks();
      render(
        <I18nextProvider i18n={i18n}>
          <PositionAlphaSeasonFlow
            session={session}
            locale={locale}
            busy={false}
            saveFailed={false}
            {...handlers}
          />
        </I18nextProvider>,
      );
      expect(screen.getByText(i18n.t('m7Direct.season.legacyFinal'))).toBeVisible();
      expect(
        screen.queryByRole('button', { name: i18n.t('m7Direct.season.retire') }),
      ).not.toBeInTheDocument();
      const user = userEvent.setup();
      await user.click(screen.getAllByRole('radio')[0]!);
      await user.click(screen.getByRole('button'));
      const selected = session.lifecycle.offseason!.options[0].programId;
      expect(handlers.onCommit).toHaveBeenCalledExactlyOnceWith(selected);
      const result = commitPositionAlphaOffseasonV2(
        session,
        selected,
        buildShippedPositionAlphaSessionCommandMechanics({ identity: session.player })!,
      );
      if (!result.ok) throw new Error(result.reason);
      expect(result.session.phase.type).toBe('CAREER_COMPLETE');
      expect(result.session.lifecycle.completedSeasons).toEqual(session.lifecycle.completedSeasons);
    },
  );
});
