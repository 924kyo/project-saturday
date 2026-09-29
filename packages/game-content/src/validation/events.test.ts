import {
  beginRecruiting,
  bootstrapSeason,
  chooseSkillBreakthrough,
  commitProgramChoice,
  commitWeeklyActionPlan,
  createCareerSession,
  createWrCareer,
  isEventMechanicsDefinitionCatalog,
  parseCareerRun,
  migrateCareerRunV7ToV8,
  parseCareerRunV8,
  resolveEventChoice,
  resolveNextWeeklyAction,
  selectWeeklyEvent,
  validateCareerRun,
  type CareerSession,
  type EventMechanicsDefinition,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  buildWrCreationMechanics,
  advanceShippedCampRound,
  contentManifest,
  defaultWrCreationIdentity,
  developmentWeekConfig,
  deriveShippedEventContextTagIds,
  eventContent,
  eventMechanicsDefinitions,
  eventSelectionTuning,
  offenseStyleMechanicsDefinitions,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
  seasonMechanicsDefinition,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';
import { validateContent } from './content.js';

function expectSuccess<T extends { readonly ok: boolean }>(
  result: T,
): asserts result is T & { readonly ok: true } {
  expect(result).toEqual(expect.objectContaining({ ok: true }));
}

function createCommittedSession(seed: string): CareerSession {
  const mechanics = buildWrCreationMechanics({
    archetypeId: defaultWrCreationIdentity.archetypeId,
    personalityTraitIds: defaultWrCreationIdentity.personalityTraitIds,
    recruitingBackgroundId: defaultWrCreationIdentity.recruitingBackgroundId,
  });
  expectSuccess(mechanics);
  const created = createWrCareer({
    careerSeed: seed,
    identity: { ...defaultWrCreationIdentity, displayName: 'Event Test' },
    mechanics: mechanics.mechanics,
  });
  expectSuccess(created);
  const choosing = beginRecruiting(
    created.career,
    recruitingMechanicsConfig,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
  );
  expectSuccess(choosing);
  if (choosing.career.recruitingState.type !== 'CHOOSING') {
    throw new TypeError('Expected choosing state.');
  }
  const committed = commitProgramChoice(
    choosing.career,
    choosing.career.recruitingState.offers[0].programId,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
    rotationPolicyMechanicsDefinitions,
    rosterNameMechanicsPool,
  );
  expectSuccess(committed);
  const bootstrapped = bootstrapSeason(
    createCareerSession(committed.career),
    seasonMechanicsDefinition,
  );
  expectSuccess(bootstrapped);
  return bootstrapped.session;
}

function completeWeek(seed: string): CareerSession {
  let session = createCommittedSession(seed);
  const actionIds = ['action_recovery', 'action_film_study', 'action_route_drills'] as const;
  const committed = commitWeeklyActionPlan(
    session.career,
    actionIds,
    weeklyActionDefinitions.map(({ id }) => id),
  );
  expectSuccess(committed);
  let career = committed.career;
  for (const actionId of actionIds) {
    const definition = weeklyActionDefinitions.find(({ id }) => id === actionId)!;
    const resolved = resolveNextWeeklyAction(
      career,
      definition,
      developmentWeekConfig,
      skillMechanicsDefinitions,
      offenseStyleMechanicsDefinitions,
      rotationPolicyMechanicsDefinitions,
    );
    expectSuccess(resolved);
    career = resolved.career;
  }
  if (career.phase.type === 'SKILL_BREAKTHROUGH') {
    const chosen = chooseSkillBreakthrough(career, career.phase.offer.offeredSkillIds[0]);
    expectSuccess(chosen);
    career = chosen.career;
  }
  expect(career.phase.type).toBe('WEEK_END');
  session = { ...session, career };
  return session;
}

function reorderedDefinitions(): readonly EventMechanicsDefinition[] {
  return [...eventMechanicsDefinitions]
    .reverse()
    .map((event) => ({ ...event, choices: [...event.choices].reverse() }));
}

describe('M5 weekly event foundation', () => {
  it('ships a bilingual strict catalog and mechanics-only projection', () => {
    expect(contentManifest.schemaVersion).toBe(9);
    expect(eventContent.events).toHaveLength(57);
    expect(isEventMechanicsDefinitionCatalog(eventMechanicsDefinitions)).toBe(true);
    expect(validateContent({ manifest: contentManifest, localeResources: localeMessages })).toEqual(
      {
        issues: [],
        ok: true,
      },
    );
    for (const event of eventContent.events) {
      expect(new Set(event.categoryIds).size).toBe(event.categoryIds.length);
      expect(new Set(event.choices.map(({ effects }) => JSON.stringify(effects))).size).toBe(
        event.choices.length,
      );
      for (const locale of ['ko-KR', 'en-US'] as const) {
        const messages = localeMessages[locale] as Readonly<Record<string, string>>;
        expect(messages[event.nameKey]).toBeTruthy();
        expect(messages[event.descriptionKey]).toBeTruthy();
        for (const choice of event.choices) {
          expect(messages[choice.nameKey]).toBeTruthy();
          expect(messages[choice.descriptionKey]).toBeTruthy();
        }
      }
    }
  });

  it('records a zero-draw no-event attempt when nothing is eligible and forbids rerolls', () => {
    const session = completeWeek('event-no-eligible');
    expect(advanceShippedCampRound(session)).toEqual({
      ok: false,
      session,
      reason: 'season.invalid_phase',
    });
    const before = JSON.stringify(session.career);
    const selected = selectWeeklyEvent(
      session.career,
      { additionalTagIds: [] },
      eventMechanicsDefinitions,
      eventSelectionTuning,
    );
    expectSuccess(selected);
    expect(selected.career.rng).toEqual(session.career.rng);
    expect(selected.career.phase.type).toBe('WEEK_END');
    if (selected.career.seasonCareerState.bootstrapStatus !== 'ACTIVE') {
      throw new TypeError('Expected active event state.');
    }
    expect(selected.career.seasonCareerState.eventState.lastSelection).toEqual(
      expect.objectContaining({
        outcome: 'NO_EVENT',
        noEventReason: 'NO_ELIGIBLE_EVENT',
        rngDrawCountBefore: session.career.rng.drawCount,
        rngDrawCountAfter: session.career.rng.drawCount,
      }),
    );
    expect(JSON.stringify(session.career)).toBe(before);
    expect(
      selectWeeklyEvent(
        selected.career,
        { additionalTagIds: [] },
        eventMechanicsDefinitions,
        eventSelectionTuning,
      ),
    ).toEqual({ ok: false, career: selected.career, reason: 'event.invalid_phase' });
  });

  it('turns the equipped event-access life hook into a real exclusive event context', () => {
    const session = completeWeek('event-life-hook-access');
    const withoutHook = deriveShippedEventContextTagIds(session);
    expect(withoutHook).not.toContain('tag_skill_event_option_access');
    const career = {
      ...session.career,
      player: {
        ...session.career.player,
        skillState: {
          ...session.career.player.skillState,
          acquisitions: [
            {
              offerIndex: 0,
              weekIndex: 1,
              offeredSkillIds: [
                'skill_campus_bridge_b',
                'skill_route_notebook_c',
                'skill_first_step_lab_b',
              ],
              rngDrawCountBefore: 0,
              rngDrawCountAfter: 3,
              selectedSkillId: 'skill_campus_bridge_b',
            },
          ],
          equippedSkillIds: ['skill_campus_bridge_b', null, null, null],
        },
      },
    } as const satisfies CareerSession['career'];
    const withHookSession = { ...session, career };
    const withHook = deriveShippedEventContextTagIds(withHookSession);
    expect(withHook).toContain('tag_skill_event_option_access');

    const withoutSelection = selectWeeklyEvent(
      session.career,
      { additionalTagIds: withoutHook },
      eventMechanicsDefinitions,
      { eventChancePermille: 0 },
    );
    const withSelection = selectWeeklyEvent(
      session.career,
      { additionalTagIds: withHook },
      eventMechanicsDefinitions,
      { eventChancePermille: 0 },
    );
    expectSuccess(withoutSelection);
    expectSuccess(withSelection);
    if (
      withoutSelection.career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
      withSelection.career.seasonCareerState.bootstrapStatus !== 'ACTIVE'
    ) {
      throw new TypeError('Expected active event states.');
    }
    expect(
      withoutSelection.career.seasonCareerState.eventState.lastSelection?.eligibleEventIds,
    ).not.toContain('event_campus_bridge_roundtable');
    expect(
      withSelection.career.seasonCareerState.eventState.lastSelection?.eligibleEventIds,
    ).toContain('event_campus_bridge_roundtable');
  });

  it('uses one density draw for a miss and preserves canonical eligible ordering', () => {
    const session = completeWeek('event-density-miss');
    const selected = selectWeeklyEvent(
      session.career,
      { additionalTagIds: ['tag_season_camp'] },
      reorderedDefinitions(),
      { eventChancePermille: 0 },
    );
    expectSuccess(selected);
    if (selected.career.seasonCareerState.bootstrapStatus !== 'ACTIVE') {
      throw new TypeError('Expected active event state.');
    }
    const selection = selected.career.seasonCareerState.eventState.lastSelection;
    expect(selection).toEqual(
      expect.objectContaining({
        noEventReason: 'DENSITY_ROLL',
        rngDrawCountAfter: session.career.rng.drawCount + 1,
      }),
    );
    expect(selection?.eligibleEventIds).toContain('event_camp_install_extra_period');
    expect(selection?.eligibleEventIds).toEqual([...(selection?.eligibleEventIds ?? [])].sort());
  });

  it('selects reproducibly across catalog order and persists exact pending evidence', () => {
    const firstSession = completeWeek('event-reordered-selection');
    const secondSession = completeWeek('event-reordered-selection');
    const first = selectWeeklyEvent(
      firstSession.career,
      { additionalTagIds: ['tag_season_camp'] },
      eventMechanicsDefinitions,
      { eventChancePermille: 1_000 },
    );
    const second = selectWeeklyEvent(
      secondSession.career,
      { additionalTagIds: ['tag_season_camp'] },
      reorderedDefinitions(),
      { eventChancePermille: 1_000 },
    );
    expectSuccess(first);
    expectSuccess(second);
    expect(first.career).toEqual(second.career);
    const selectedEventId =
      first.career.phase.type === 'EVENT_CHOICE'
        ? first.career.phase.pendingEvent.eventId
        : undefined;
    const selectedDefinition = eventMechanicsDefinitions.find(({ id }) => id === selectedEventId);
    expect(selectedDefinition).toBeDefined();
    expect(first.career.phase).toEqual(
      expect.objectContaining({
        type: 'EVENT_CHOICE',
        pendingEvent: expect.objectContaining({
          eventId: selectedDefinition?.id,
          choiceIds: selectedDefinition?.choices.map(({ id }) => id).sort(),
        }),
      }),
    );
    expect(first.career.rng.drawCount).toBe(firstSession.career.rng.drawCount + 2);
    expect(parseCareerRun(JSON.stringify(first.career))).toEqual({
      ok: true,
      career: first.career,
    });
    const staged = migrateCareerRunV7ToV8(first.career);
    expect(staged.phase).toEqual(first.career.phase);
    expect(staged.rng).toEqual(first.career.rng);
    expect(parseCareerRunV8(JSON.stringify(staged))).toEqual({ ok: true, career: staged });
  });

  it('applies an allowlisted choice without RNG, records clamps and cooldown, and rejects reuse', () => {
    const session = completeWeek('event-resolve-choice');
    const campInstall = eventMechanicsDefinitions.find(
      ({ id }) => id === 'event_camp_install_extra_period',
    );
    expect(campInstall).toBeDefined();
    const selected = selectWeeklyEvent(
      session.career,
      { additionalTagIds: ['tag_season_camp'] },
      campInstall === undefined ? [] : [campInstall],
      { eventChancePermille: 1_000 },
    );
    expectSuccess(selected);
    const before = JSON.stringify(selected.career);
    const beforeDraws = selected.career.rng.drawCount;
    const resolved = resolveEventChoice(
      selected.career,
      'event_choice_camp_install_extra_reps',
      eventMechanicsDefinitions,
    );
    expectSuccess(resolved);
    expect(resolved.career.rng.drawCount).toBe(beforeDraws);
    expect(resolved.career.phase.type).toBe('WEEK_END');
    expect(resolved.career.player.state.preparation).toBe(
      Math.min(100, session.career.player.state.preparation + 8),
    );
    if (resolved.career.seasonCareerState.bootstrapStatus !== 'ACTIVE') {
      throw new TypeError('Expected active event state.');
    }
    expect(resolved.career.seasonCareerState.eventState.history.at(-1)).toEqual(
      expect.objectContaining({
        eventId: 'event_camp_install_extra_period',
        choiceId: 'event_choice_camp_install_extra_reps',
        appliedEffects: expect.arrayContaining([
          expect.objectContaining({
            type: 'event_integer_state_delta',
            stateId: 'event_state_preparation',
            requestedDelta: 8,
          }),
        ]),
      }),
    );
    expect(resolved.career.seasonCareerState.eventState.cooldowns).toContainEqual({
      eventId: 'event_camp_install_extra_period',
      eligibleAfterWeekIndex: session.career.weekIndex + 3,
    });
    expect(validateCareerRun(resolved.career)).toEqual({ issues: [], ok: true });
    expect(JSON.stringify(selected.career)).toBe(before);
    expect(
      resolveEventChoice(
        resolved.career,
        'event_choice_camp_install_extra_reps',
        eventMechanicsDefinitions,
      ),
    ).toEqual({ ok: false, career: resolved.career, reason: 'event.invalid_phase' });
  });

  it('rejects tampered persisted selection evidence', () => {
    const session = completeWeek('event-tamper');
    const selected = selectWeeklyEvent(
      session.career,
      { additionalTagIds: ['tag_season_camp'] },
      eventMechanicsDefinitions,
      { eventChancePermille: 1_000 },
    );
    expectSuccess(selected);
    const tampered = JSON.parse(JSON.stringify(selected.career)) as {
      phase: { pendingEvent: { eventId: string } };
    };
    tampered.phase.pendingEvent.eventId = 'event_tampered';
    expect(validateCareerRun(tampered).ok).toBe(false);
    expect(parseCareerRun(JSON.stringify(tampered))).toEqual(
      expect.objectContaining({ ok: false, reason: 'career_parse.invalid_career' }),
    );
  });
});
