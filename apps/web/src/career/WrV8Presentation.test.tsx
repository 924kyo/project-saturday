import { createEmptyMetaProfile, type CareerSessionV8 } from '@project-saturday/game-core';
import { deriveShippedOffFieldWeekProjection } from '@project-saturday/game-content/content';
import { localeMessages, type SupportedLocale } from '@project-saturday/game-content/locales';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../i18n/i18n';
import { completeAllOnboarding } from '../onboarding/onboarding';
import { playWrV8Path } from '../test/wr-v8-path';
import { CareerScreen, type CareerScreenProps } from './CareerScreen';
import { GameFlow } from './GameFlow';
import { SeasonDecisionPanel, type SeasonDecisionPanelProps } from './SeasonFlow';
import { neutralWrSessionView, wrTerminalReview } from './wr-view';

interface Boundaries {
  neutralPlan?: CareerSessionV8;
  currentKeySnap?: CareerSessionV8;
  resolved?: CareerSessionV8;
  firstReview?: CareerSessionV8;
  finalReview?: CareerSessionV8;
  complete?: CareerSessionV8;
}

const boundaries: Boundaries = {};

function required<K extends keyof Boundaries>(key: K): CareerSessionV8 {
  const session = boundaries[key];
  if (session === undefined) throw new Error(`Path did not reach ${key}`);
  return session;
}

beforeAll(() => {
  const { session } = playWrV8Path({
    displayName: '토요일 선수',
    seed: 'wr-v8-presentation',
    offseason: 'transfer',
    observe(candidate) {
      const { career } = candidate;
      const phase = career.phase;
      if (
        phase.type === 'PLAN_ACTIONS' &&
        career.seasonCareerState.bootstrapStatus === 'ACTIVE' &&
        career.offFieldCareerState.academics.bootstrapStatus === 'ACTIVE'
      )
        boundaries.neutralPlan ??= candidate;
      if (phase.type === 'KEY_SNAP' && 'rulesVersion' in phase)
        boundaries.currentKeySnap ??= candidate;
      if (phase.type === 'SNAP_RESOLVED') boundaries.resolved ??= candidate;
      if (phase.type === 'SEASON_REVIEW') {
        if (career.terminalReview === undefined) boundaries.firstReview ??= candidate;
        else boundaries.finalReview ??= candidate;
      }
      if (phase.type === 'CAREER_COMPLETE') boundaries.complete = candidate;
    },
  });
  expect(session.career.phase.type).toBe('CAREER_COMPLETE');
}, 90_000);

async function renderLocalized(locale: SupportedLocale, element: React.ReactNode) {
  const i18n = await createAppI18n(locale);
  return render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

function panelProps(
  session: CareerSessionV8,
  locale: SupportedLocale,
  overrides: Partial<SeasonDecisionPanelProps> = {},
): SeasonDecisionPanelProps {
  return {
    busy: false,
    controlsDisabled: false,
    locale,
    meta: createEmptyMetaProfile(),
    onBootstrapSeason: vi.fn(),
    onBootstrapNextSeason: vi.fn(),
    onChooseEvent: vi.fn(),
    onChooseInjury: vi.fn(),
    onCompleteCareer: vi.fn(),
    onDecideOffseason: vi.fn(),
    onEnterSeasonReview: vi.fn(),
    onInitializePostseason: vi.fn(),
    onProjectOffseason: vi.fn(),
    onStartNextCareer: vi.fn(),
    session,
    ...overrides,
  };
}

function screenProps(session: CareerSessionV8, locale: SupportedLocale): CareerScreenProps {
  const noop = vi.fn();
  return {
    busy: false,
    career: session.career,
    session,
    meta: createEmptyMetaProfile(),
    locale,
    onboardingSettings: completeAllOnboarding(),
    onAdvance: noop,
    onBeginRecruiting: noop,
    onChooseProgram: noop,
    onChooseGameDecision: noop,
    onContinueSnap: noop,
    onChooseEvent: noop,
    onChooseInjury: noop,
    onChooseSkill: noop,
    onCommit: noop,
    onCompleteOnboarding: noop,
    onCompleteCareer: noop,
    onDecideNilOffer: noop,
    onDecideOffseason: noop,
    onEnterSeasonReview: noop,
    onInitializePostseason: noop,
    onBootstrapNextSeason: noop,
    onBootstrapSeason: noop,
    onPrepareGame: noop,
    onProjectOffseason: noop,
    onResolve: noop,
    onResolveNilObligation: noop,
    onSetSkillSlot: noop,
    onSkipAllOnboarding: noop,
    onStartGame: noop,
    onStartNextCareer: noop,
    saveBlocked: false,
    seasonFlowEnabled: true,
  };
}

describe('read-only WR v8 presentation surfaces', () => {
  it('projects off-field state for neutral and current-rules v8 sessions without a v7 writer', () => {
    const neutral = required('neutralPlan');
    const view = neutralWrSessionView(neutral);
    expect(view?.schemaVersion).toBe(7);
    expect(deriveShippedOffFieldWeekProjection(neutral)).toEqual(
      deriveShippedOffFieldWeekProjection(view!),
    );
    const current = required('currentKeySnap');
    expect(neutralWrSessionView(current)).toBeNull();
    const projection = deriveShippedOffFieldWeekProjection(current);
    expect(projection?.weekIndex).toBe(current.career.weekIndex);
    const forged = {
      ...current,
      career: { ...current.career, revision: current.career.revision + 1 },
    };
    expect(deriveShippedOffFieldWeekProjection(forged)).toBeNull();
  });

  it.each(['ko-KR', 'en-US'] as const)(
    'shows the saved resolved snap and requires an explicit continuation in %s',
    async (locale) => {
      const user = userEvent.setup();
      const session = required('resolved');
      const phase = session.career.phase;
      if (phase.type !== 'SNAP_RESOLVED') throw new Error('Expected a resolved snap');
      const onContinueSnap = vi.fn();
      await renderLocalized(
        locale,
        <GameFlow
          career={session.career}
          controlsDisabled={false}
          locale={locale}
          onChooseDecision={vi.fn()}
          onContinueSnap={onContinueSnap}
          onStartGame={vi.fn()}
        />,
      );
      const surface = screen.getByTestId('game-snap-resolved');
      expect(surface).toHaveTextContent(String(phase.result.play.scoreAfter.playerTeam));
      expect(surface).toHaveTextContent(localeMessages[locale]['career.game.resolved.help']);
      expect(within(surface).getByRole('status')).toHaveAttribute(
        'data-result',
        phase.result.play.resultId,
      );
      expect(onContinueSnap).not.toHaveBeenCalled();
      await user.click(screen.getByTestId('continue-snap'));
      expect(onContinueSnap).toHaveBeenCalledOnce();
      cleanup();
      await renderLocalized(
        locale,
        <GameFlow
          career={session.career}
          controlsDisabled={false}
          locale={locale}
          onChooseDecision={vi.fn()}
          onStartGame={vi.fn()}
        />,
      );
      expect(screen.getByTestId('continue-snap')).toBeDisabled();
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'renders the neutral first-season review identically to its marker-only view in %s',
    async (locale) => {
      const session = required('firstReview');
      const view = neutralWrSessionView(session);
      if (view === null) throw new Error('First review should be neutral');
      await renderLocalized(locale, <SeasonDecisionPanel {...panelProps(session, locale)} />);
      const current = screen.getByTestId('season-review').textContent;
      cleanup();
      const i18n = await createAppI18n(locale);
      render(
        <I18nextProvider i18n={i18n}>
          <SeasonDecisionPanel {...panelProps(session, locale)} session={view} />
        </I18nextProvider>,
      );
      expect(screen.getByTestId('season-review').textContent).toBe(current);
      expect(screen.queryByTestId('season-review-final')).toBeNull();
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'presents both retained seasons and an explicit retirement in %s',
    async (locale) => {
      const user = userEvent.setup();
      const session = required('finalReview');
      const review = wrTerminalReview(session.career)!;
      const onCompleteCareer = vi.fn();
      const onProjectOffseason = vi.fn();
      await renderLocalized(
        locale,
        <SeasonDecisionPanel
          {...panelProps(session, locale, { onCompleteCareer, onProjectOffseason })}
        />,
      );
      const panel = screen.getByTestId('season-review-final');
      expect(screen.queryByTestId('offseason-entry')).toBeNull();
      for (const season of review.seasons) {
        const section = within(panel).getByTestId(`final-review-season-${season.seasonIndex}`);
        expect(section).toHaveTextContent(String(season.summary.gamesPlayed));
        expect(section).toHaveTextContent(String(season.summary.cumulativeStats.receivingYards));
      }
      expect(review.seasons[0].programId).not.toBe(review.seasons[1].programId);
      expect(within(panel).getByTestId('final-review-totals')).toHaveTextContent(
        String(review.careerTotals.cumulativeStats.receivingYards),
      );
      await user.click(within(panel).getByTestId('retire-career'));
      expect(onCompleteCareer).toHaveBeenCalledOnce();
      expect(onProjectOffseason).not.toHaveBeenCalled();
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'shows the completed two-season athlete from retained evidence in %s',
    async (locale) => {
      const session = required('complete');
      const review = wrTerminalReview(session.career)!;
      await renderLocalized(locale, <SeasonDecisionPanel {...panelProps(session, locale)} />);
      const current = screen.getByTestId('career-complete-current');
      expect(current).toHaveTextContent(String(review.careerTotals.cumulativeStats.receivingYards));
      expect(current).toHaveTextContent(
        localeMessages[locale]['career.season.complete.seasons'].replace('{count}', '2'),
      );
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'renders every career destination for current v8 boundaries in %s',
    async (locale) => {
      const user = userEvent.setup();
      for (const key of ['currentKeySnap', 'resolved', 'finalReview', 'complete'] as const) {
        const session = required(key);
        await renderLocalized(locale, <CareerScreen {...screenProps(session, locale)} />);
        for (const destination of ['home', 'week', 'team', 'skills', 'player'] as const) {
          const tab = screen.queryByTestId(`career-nav-${destination}`);
          if (tab === null) continue;
          await user.click(tab);
          expect(document.body.textContent).not.toBe('');
        }
        cleanup();
      }
    },
    30_000,
  );
});
