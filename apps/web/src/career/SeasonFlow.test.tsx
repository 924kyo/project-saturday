import { createEmptyMetaProfile, type CareerSession } from '@project-saturday/game-core';
import { eventContent, injuryContent, seasonContent } from '@project-saturday/game-content/content';
import {
  localeMessages,
  type MessageKey,
  type SupportedLocale,
} from '@project-saturday/game-content/locales';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { createAppI18n } from '../i18n/i18n';
import {
  createCompletedSeasonFixture,
  createPendingSeasonFixture,
  createSecondSeasonFixture,
  createSeasonDecisionFixtures,
  type CompletedSeasonFixture,
  type SeasonDecisionFixtures,
  type SecondSeasonFixture,
} from '../test/season-fixture';
import { SeasonDecisionPanel, SeasonOverview, type SeasonDecisionPanelProps } from './SeasonFlow';
import { hasBlockingSeasonDecision } from './season-presentation';

let completedFixture: CompletedSeasonFixture | undefined;
let decisionFixtures: SeasonDecisionFixtures | undefined;
let secondSeasonFixture: SecondSeasonFixture | undefined;

function completed(): CompletedSeasonFixture {
  completedFixture ??= createCompletedSeasonFixture();
  return completedFixture;
}

function decisions(): SeasonDecisionFixtures {
  decisionFixtures ??= createSeasonDecisionFixtures();
  return decisionFixtures;
}

function secondSeason(): SecondSeasonFixture {
  secondSeasonFixture ??= createSecondSeasonFixture('season-ui-offseason');
  return secondSeasonFixture;
}

function message(locale: SupportedLocale, key: string): string {
  return localeMessages[locale][key as MessageKey];
}

function panelProps(
  session: CareerSession,
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

async function renderLocalized(locale: SupportedLocale, element: React.ReactNode): Promise<void> {
  const i18n = await createAppI18n(locale);
  render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

describe('saved season presentation', () => {
  it.each(['ko-KR', 'en-US'] as const)(
    'presents the pending calendar bootstrap and invokes its command in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onBootstrapSeason = vi.fn();
      const session = createPendingSeasonFixture(`season-bootstrap-${locale}`);
      await renderLocalized(
        locale,
        <>
          <SeasonOverview locale={locale} session={session} />
          <SeasonDecisionPanel {...panelProps(session, locale, { onBootstrapSeason })} />
        </>,
      );

      expect(screen.getByTestId('season-overview')).toHaveTextContent(
        message(locale, seasonContent.nameKey),
      );
      const bootstrap = screen.getByTestId('season-bootstrap');
      expect(bootstrap).toHaveTextContent(localeMessages[locale]['career.season.bootstrap.help']);
      await user.click(
        within(bootstrap).getByRole('button', {
          name: localeMessages[locale]['career.season.bootstrap.action'],
        }),
      );
      expect(onBootstrapSeason).toHaveBeenCalledOnce();
      expect(hasBlockingSeasonDecision(session)).toBe(true);
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'renders contextual event copy, exact effects, and stable choice IDs in %s',
    async (locale) => {
      const user = userEvent.setup();
      const session = decisions().eventSession;
      if (session.career.phase.type !== 'EVENT_CHOICE') throw new Error('Expected event fixture.');
      const phase = session.career.phase;
      const onChooseEvent = vi.fn();
      const event = eventContent.events.find(({ id }) => id === phase.pendingEvent.eventId);
      if (event === undefined) throw new Error('Expected event content.');
      await renderLocalized(
        locale,
        <SeasonDecisionPanel {...panelProps(session, locale, { onChooseEvent })} />,
      );

      const panel = screen.getByTestId('season-event-choice');
      expect(panel).toHaveTextContent(message(locale, event.nameKey));
      expect(panel).toHaveTextContent(message(locale, event.descriptionKey));
      expect(within(panel).getAllByRole('button')).toHaveLength(event.choices.length);
      expect(panel.textContent).not.toContain('{{');
      const choiceId = phase.pendingEvent.choiceIds[0];
      await user.click(screen.getByTestId(`season-event-choice-${choiceId}`));
      expect(onChooseEvent).toHaveBeenCalledWith(choiceId);
      expect(hasBlockingSeasonDecision(session)).toBe(true);
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'renders bounded injury availability and both saved choices in %s',
    async (locale) => {
      const user = userEvent.setup();
      const session = decisions().injurySession;
      if (session.career.phase.type !== 'INJURY_CHOICE') {
        throw new Error('Expected injury fixture.');
      }
      const phase = session.career.phase;
      const onChooseInjury = vi.fn();
      const outcome = injuryContent.outcomes.find(({ id }) => id === phase.pendingInjury.outcomeId);
      if (outcome === undefined) throw new Error('Expected injury content.');
      await renderLocalized(
        locale,
        <SeasonDecisionPanel {...panelProps(session, locale, { onChooseInjury })} />,
      );

      const panel = screen.getByTestId('season-injury-choice');
      expect(panel).toHaveTextContent(message(locale, outcome.nameKey));
      expect(panel).toHaveTextContent(String(outcome.opportunityCap));
      expect(within(panel).getAllByRole('button')).toHaveLength(2);
      expect(panel.textContent).not.toContain('{{');
      const choiceId = phase.pendingInjury.choiceIds[1];
      await user.click(screen.getByTestId(`season-injury-choice-${choiceId}`));
      expect(onChooseInjury).toHaveBeenCalledWith(choiceId);
      expect(hasBlockingSeasonDecision(session)).toBe(true);
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'presents postseason initialization and review entry as explicit commands in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onInitializePostseason = vi.fn();
      const pending = completed().postseasonPendingSession;
      await renderLocalized(
        locale,
        <SeasonDecisionPanel {...panelProps(pending, locale, { onInitializePostseason })} />,
      );
      await user.click(within(screen.getByTestId('postseason-initialize')).getByRole('button'));
      expect(onInitializePostseason).toHaveBeenCalledOnce();

      const onEnterSeasonReview = vi.fn();
      const complete = completed().postseasonCompleteSession;
      await renderLocalized(
        locale,
        <SeasonDecisionPanel {...panelProps(complete, locale, { onEnterSeasonReview })} />,
      );
      const entries = screen.getAllByTestId('season-review-entry');
      await user.click(within(entries.at(-1)!).getByRole('button'));
      expect(onEnterSeasonReview).toHaveBeenCalledOnce();
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'shows the complete player season review and preserved portrait in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onCompleteCareer = vi.fn();
      const session = completed().reviewSession;
      await renderLocalized(
        locale,
        <SeasonDecisionPanel {...panelProps(session, locale, { onCompleteCareer })} />,
      );

      const review = screen.getByTestId('season-review');
      expect(within(review).getByRole('img')).toHaveAttribute(
        'aria-label',
        expect.stringContaining(session.career.player.displayName),
      );
      expect(review).toHaveTextContent(localeMessages[locale]['career.season.review.receiving']);
      expect(review.textContent).not.toContain('{{');
      await user.click(
        within(review).getByRole('button', {
          name: localeMessages[locale]['career.season.review.completeCareer'],
        }),
      );
      expect(onCompleteCareer).toHaveBeenCalledOnce();
      expect(hasBlockingSeasonDecision(session)).toBe(true);
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'compares saved stay and transfer projections before one explicit choice in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onDecideOffseason = vi.fn();
      const session = secondSeason().projectedSession;
      await renderLocalized(
        locale,
        <SeasonDecisionPanel {...panelProps(session, locale, { onDecideOffseason })} />,
      );

      const board = screen.getByTestId('offseason-board');
      expect(within(board).getAllByTestId(/^offseason-option-/)).toHaveLength(4);
      expect(board).toHaveTextContent(localeMessages[locale]['career.offField.offseason.stay']);
      expect(board).toHaveTextContent(localeMessages[locale]['career.offField.offseason.transfer']);
      const offseason = session.career.offFieldCareerState.offseason;
      if (offseason.status !== 'PROJECTED') throw new Error('Expected projected fixture.');
      const transfer = offseason.transferProjection.transferOptions[0];
      await user.click(
        within(screen.getByTestId(`offseason-option-${transfer.programId}`)).getByRole('button'),
      );
      expect(onDecideOffseason).toHaveBeenCalledWith(transfer.programId);
      expect(board.textContent).not.toContain('{{');
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'shows the saved actual role and starts season two through an explicit command in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onBootstrapNextSeason = vi.fn();
      await renderLocalized(
        locale,
        <SeasonDecisionPanel
          {...panelProps(secondSeason().decisionSession, locale, { onBootstrapNextSeason })}
        />,
      );

      const decided = screen.getByTestId('offseason-decided');
      expect(decided).toHaveTextContent(
        localeMessages[locale]['career.offField.offseason.decidedTitle'],
      );
      await user.click(
        within(decided).getByRole('button', {
          name: localeMessages[locale]['career.offField.offseason.startNext'],
        }),
      );
      expect(onBootstrapNextSeason).toHaveBeenCalledOnce();
      expect(decided.textContent).not.toContain('{{');
    },
  );

  it.each(['ko-KR', 'en-US'] as const)(
    'shows alumni history, bounded legacy, and explicit next-career action in %s',
    async (locale) => {
      const user = userEvent.setup();
      const onStartNextCareer = vi.fn();
      const fixture = completed();
      await renderLocalized(
        locale,
        <SeasonDecisionPanel
          {...panelProps(fixture.completedSession, locale, {
            meta: fixture.completedMeta,
            onStartNextCareer,
          })}
        />,
      );

      const completion = screen.getByTestId('career-complete');
      expect(completion).toHaveTextContent(fixture.completedSession.career.player.displayName);
      expect(completion).toHaveTextContent(
        localeMessages[locale]['career.season.complete.legacyHelp'],
      );
      expect(completion.textContent).not.toContain('{{');
      await user.click(
        within(completion).getByRole('button', {
          name: localeMessages[locale]['career.season.complete.nextCareer'],
        }),
      );
      expect(onStartNextCareer).toHaveBeenCalledOnce();
      expect(hasBlockingSeasonDecision(fixture.completedSession)).toBe(true);
    },
  );
});
