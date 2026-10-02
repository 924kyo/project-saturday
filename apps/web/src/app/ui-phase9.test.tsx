import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import {
  advanceCalendarVNext,
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitProgramVNext,
  continueGameVNext,
  createCareerVNext,
  decideMidseasonVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';
import { defaultWrAppearance } from '@project-saturday/game-content';
import { buildCareerVNextMechanics } from '@project-saturday/game-content/content';
import { localeMessages } from '@project-saturday/game-content/locales';

import { createAppI18n } from '../i18n/i18n';
import { GlossaryList, Term, TermRow } from './Glossary';
import { GLOSSARY_TERMS, SNAP_TERMS } from './glossary-terms';
import { SinceLastWeek } from './SinceLastWeek';
import { SubTabs } from './SubTabs';
import { TeamPanel } from './TeamProfile';

const ok = (result: CareerVNextResult): CareerVNext => {
  if (!result.ok) throw new Error(result.reason);
  return result.career;
};
const identity = {
  displayName: 'UI Probe',
  positionId: 'position_cb',
  archetypeId: 'archetype_cb_press_man',
  recruitingBackgroundId: 'background_late_bloomer',
  personalityTraitIds: ['personality_disciplined', 'personality_leader'],
  appearance: defaultWrAppearance,
  heightCm: 186,
  weightKg: 88,
} as unknown as PositionPlayerCreationIdentity;
const mechanics = buildCareerVNextMechanics(identity)!;

function firstWeek(): CareerVNext {
  const created = ok(createCareerVNext({ seed: 'ui-9', identity }, mechanics));
  let career = ok(commitProgramVNext(created, created.recruiting.offers[1]!.programId, mechanics));
  while (career.flow.type === 'CAMP') career = ok(advanceCalendarVNext(career, mechanics)!);
  return career;
}

/** Plays the first week through Saturday and back to the next plan. */
function afterOneGame(career: CareerVNext): CareerVNext {
  let current = career;
  const plan = () => {
    const open = focusDefinitionsVNext(current, mechanics)
      .map(({ id }) => id as string)
      .filter((id) => isFocusAvailableVNext(current, id, mechanics));
    return open.slice(0, 3);
  };
  current = ok(planWeekVNext(current, plan(), mechanics));
  for (let guard = 0; guard < 200 && current.flow.type !== 'WEEK_PLAN'; guard += 1) {
    const flow = current.flow;
    if (flow.type === 'MIDSEASON') current = ok(decideMidseasonVNext(current, false));
    else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
      current = ok(chooseBreakthroughVNext(current, flow.offer.skillIds[0]!));
    else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
      current = ok(chooseEventVNext(current, flow.event.choiceIds[0]!, mechanics));
    else if (flow.type === 'NIL' && flow.offer.decision === null)
      current = ok(chooseNilVNext(current, false, mechanics));
    else if (flow.type === 'INJURY' && flow.report.availability === null)
      current = ok(chooseInjuryVNext(current, 'injury_choice_rest_rehab', mechanics));
    else if (flow.type === 'GAME') {
      if (flow.game.stage === 'PREGAME') current = ok(kickoffVNext(current, mechanics));
      else if (flow.game.stage === 'SNAP')
        current = ok(
          chooseSnapVNext(
            current,
            projectSnapBoardFrame(current, mechanics)!.decisionIds[0]!,
            mechanics,
          ),
        );
      else current = ok(continueGameVNext(current, mechanics));
    } else if (flow.type === 'POST_GAME') current = ok(nextWeekVNext(current, mechanics));
    else current = ok(toGameDayVNext(current, mechanics));
  }
  return current;
}

async function wrap(element: React.ReactNode) {
  const i18n = await createAppI18n('en-US');
  return render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

const PROBE_LABEL = 'Probe views';
const LOOK = 'look' as const;
const TABS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
] as const;

function Harness() {
  const [value, setValue] = React.useState<'a' | 'b' | 'c'>('a');
  return (
    <SubTabs id="probe" label={PROBE_LABEL} onChange={setValue} tabs={TABS} value={value}>
      <p>{value}</p>
    </SubTabs>
  );
}

describe('UI-01/UI-02: sub-tabs are a keyboard tablist', () => {
  it('moves with arrows, Home and End, with one tab stop and a labelled panel', async () => {
    const user = userEvent.setup();
    await wrap(<Harness />);
    const list = screen.getByRole('tablist', { name: 'Probe views' });
    const tabs = within(list).getAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    tabs[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Alpha' })).toHaveTextContent('a');
  });
});

describe('UI-05: the national ranking is a true Top 25', () => {
  it('lists 25 ranked programs (ten shown, the rest one click away)', async () => {
    const user = userEvent.setup();
    await wrap(<TeamPanel career={firstWeek()} mechanics={mechanics} />);
    await user.click(screen.getByRole('tab', { name: 'National' }));
    const panel = screen.getByRole('tabpanel', { name: 'National' });
    const rows = panel.querySelectorAll('.s2-schedule__row');
    expect(rows.length).toBe(25);
    // Every ranked row carries its record, folded rows included.
    for (const row of rows) expect(row.querySelector('.s2-note')?.textContent).toMatch(/\d/);
    expect(panel.querySelector('#s2-top25-more')).not.toBeNull();
  });
});

describe('UI-06: a glossary with in-place definitions', () => {
  it('defines every term in both languages and opens one by keyboard', async () => {
    for (const locale of ['en-US', 'ko-KR'] as const) {
      const messages = localeMessages[locale] as Readonly<Record<string, string>>;
      for (const term of GLOSSARY_TERMS) {
        expect(messages[`v2.glossary.${term}.name`], term).toBeTruthy();
        expect(messages[`v2.glossary.${term}.def`], term).toBeTruthy();
      }
    }
    const user = userEvent.setup();
    await wrap(
      <>
        <Term term={LOOK} />
        <GlossaryList />
      </>,
    );
    const button = screen.getByRole('button', { name: 'Look' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('note')).toHaveTextContent(/hidden; you read it from tells/);
  });
});

describe('UI-06: key terms open one definition below the row', () => {
  it('toggles a single definition and reports which term is open', async () => {
    const user = userEvent.setup();
    await wrap(<TermRow terms={SNAP_TERMS} />);
    await user.click(screen.getByRole('button', { name: 'Look' }));
    expect(screen.getByRole('note')).toHaveTextContent(/hidden; you read it from tells/);
    await user.click(screen.getByRole('button', { name: 'Tell' }));
    expect(screen.getAllByRole('note')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Tell' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Look' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Tell' }));
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('UI-03: since last week, from saved facts', () => {
  it('summarizes Saturday, the role and health after a game, and nothing before one', async () => {
    const before = firstWeek();
    const empty = await wrap(<SinceLastWeek career={before} mechanics={mechanics} />);
    expect(empty.container.querySelector('#s2-since')).toBeNull();
    empty.unmount();
    const after = afterOneGame(before);
    const last = after.log.at(-1)!;
    await wrap(<SinceLastWeek career={after} mechanics={mechanics} />);
    expect(
      screen.getByText(new RegExp(`staff grade ${last.coachGrade ?? '—'}`)),
    ).toBeInTheDocument();
    expect(screen.getByText(/Your spot:/)).toBeInTheDocument();
  });
});
