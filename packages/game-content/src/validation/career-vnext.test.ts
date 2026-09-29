import { describe, expect, it } from 'vitest';
import {
  chooseEventVNext,
  chooseInjuryVNext,
  chooseSnapVNext,
  commitProgramVNext,
  continueGameVNext,
  createCareerVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  parseCareerVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  serializeCareerVNext,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';

import {
  buildCareerVNextMechanics,
  defaultWrAppearance,
  programIdentityVNext,
} from '../content/index.js';

const identities = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
  ['position_wr', 'archetype_wr_deep_threat'],
] as const;

function identityFor(positionId: string, archetypeId: string): PositionPlayerCreationIdentity {
  return {
    displayName: 'Marcus Hale',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  } as PositionPlayerCreationIdentity;
}

function playSeason(
  identity: PositionPlayerCreationIdentity,
  seed: string,
  pickBest = false,
  injuryChoice:
    'injury_choice_rest_rehab' | 'injury_choice_play_limited' = 'injury_choice_play_limited',
  strategy: 'grind' | 'balanced' = 'grind',
) {
  const mechanics = buildCareerVNextMechanics(identity)!;
  const decisionsPerGame: number[] = [];
  const events: string[] = [];
  const injuries: string[] = [];
  let reloads = 0;
  const adopt = (result: CareerVNextResult): CareerVNext => {
    if (!result.ok) throw new Error(result.reason);
    const json = serializeCareerVNext(result.career);
    expect(json).not.toBeNull();
    const parsed = parseCareerVNext(json!);
    expect(parsed).toEqual(result.career);
    reloads += 1;
    return parsed!;
  };
  let career = adopt(createCareerVNext({ seed, identity }, mechanics));
  expect(career.recruiting.offers.length).toBe(4);
  for (const offer of career.recruiting.offers) programIdentityVNext(offer.programId);
  const offer = career.recruiting.offers.at(-1)!;
  career = adopt(commitProgramVNext(career, offer.programId, mechanics));
  // The previewed room is exactly the committed room.
  expect(career.program!.room.projection.rank).toBe(offer.preview.rank);
  const focusIds = focusDefinitionsVNext(career, mechanics).map(({ id }) => id);
  while (career.flow.type !== 'SEASON_END') {
    if (career.flow.type === 'WEEK_PLAN') {
      // Injury policy decides which drills are open; the plan uses the first three available.
      const open = focusIds.filter((id) => isFocusAvailableVNext(career, id, mechanics));
      const blocked = focusIds.find((id) => !open.includes(id));
      if (blocked !== undefined)
        expect(planWeekVNext(career, [blocked, open[0]!, open[1]!], mechanics).ok).toBe(false);
      const plan =
        strategy === 'balanced' && open.includes('action_recovery')
          ? [open[0]!, open[1]!, 'action_recovery']
          : [open[0]!, open[1]!, open[2]!];
      career = adopt(planWeekVNext(career, plan, mechanics));
    } else if (career.flow.type === 'PRACTICE_REPORT') {
      career = adopt(toGameDayVNext(career, mechanics));
    } else if (career.flow.type === 'EVENT') {
      const event = career.flow.event;
      if (event.chosenChoiceId === null) {
        expect(toGameDayVNext(career, mechanics).ok).toBe(false);
        expect(chooseEventVNext(career, 'event_choice_unknown', mechanics).ok).toBe(false);
        events.push(event.eventId);
        career = adopt(chooseEventVNext(career, event.choiceIds.at(-1)!, mechanics));
      } else career = adopt(toGameDayVNext(career, mechanics));
    } else if (career.flow.type === 'INJURY') {
      const report = career.flow.report;
      if (report.availability === null) {
        if (report.outcome === 'INJURY') injuries.push(report.injury.outcomeId);
        career = adopt(chooseInjuryVNext(career, injuryChoice, mechanics));
      } else {
        if (report.outcome === 'INJURY' && report.availability.choiceId === null)
          injuries.push(report.injury.outcomeId);
        career = adopt(toGameDayVNext(career, mechanics));
      }
    } else if (career.flow.type === 'GAME') {
      const game = career.flow.game;
      if (game.stage === 'PREGAME') {
        career = adopt(kickoffVNext(career, mechanics));
        const kicked = career.flow.type === 'GAME' ? career.flow.game : null;
        decisionsPerGame.push(kicked?.slots.length ?? 0);
      } else if (game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(career)!;
        expect(frame).not.toBeNull();
        expect(frame.result).toBeNull();
        const choice =
          pickBest && frame.kind === 'SIDELINE'
            ? ((career.flow.type === 'GAME' &&
                career.flow.game.sideline[frame.repNumber - 1]!.bestDecisionId) as string)
            : frame.decisionIds[0]!;
        expect(chooseSnapVNext(career, 'not_a_decision').ok).toBe(false);
        career = adopt(chooseSnapVNext(career, choice));
        const resolved = projectSnapBoardFrame(career)!;
        expect(resolved.result).not.toBeNull();
        if (resolved.kind === 'LIVE') {
          expect(resolved.situation.lineOfScrimmageYards).toBeGreaterThanOrEqual(0);
          expect(resolved.result!.scoreAfter.playerTeam).toBeGreaterThanOrEqual(
            resolved.situation.score.playerTeam,
          );
        }
      } else {
        career = adopt(continueGameVNext(career, mechanics));
      }
    } else if (career.flow.type === 'POST_GAME') {
      career = adopt(nextWeekVNext(career, mechanics));
    }
  }
  return { career, decisionsPerGame, reloads, events, injuries };
}

describe('Career VNext vertical slice core', () => {
  it.each(identities)(
    '%s plays a full regular season with Saturday decisions every week',
    (positionId, archetypeId) => {
      const identity = identityFor(positionId, archetypeId);
      const { career, decisionsPerGame, reloads } = playSeason(identity, `vnext-${positionId}`);
      expect(career.log).toHaveLength(12);
      expect(decisionsPerGame).toHaveLength(12);
      expect(Math.min(...decisionsPerGame)).toBeGreaterThanOrEqual(2);
      const record = career.log.at(-1)!.recordAfter;
      expect(record.wins + record.losses + record.ties).toBe(12);
      expect(reloads).toBeGreaterThan(60);
      expect(serializeCareerVNext(career)!.length).toBeLessThan(1_000_000);
    },
    60_000,
  );

  it('is deterministic by seed and responds to sideline reads', () => {
    const identity = identityFor('position_qb', 'archetype_qb_field_general');
    const first = playSeason(identity, 'vnext-determinism');
    const second = playSeason(identity, 'vnext-determinism');
    expect(second.career).toEqual(first.career);
    const sharp = playSeason(identity, 'vnext-determinism', true);
    const credit = (career: CareerVNext) =>
      career.log.flatMap(({ sideline }) => sideline).filter(({ grade }) => grade === 'SHARP')
        .length;
    expect(credit(sharp.career)).toBeGreaterThanOrEqual(credit(first.career));
  }, 60_000);

  it('rejects out-of-phase commands without publishing', () => {
    const identity = identityFor('position_cb', 'archetype_cb_press_man');
    const mechanics = buildCareerVNextMechanics(identity)!;
    const created = createCareerVNext({ seed: 'vnext-phase', identity }, mechanics);
    if (!created.ok) throw new Error(created.reason);
    expect(planWeekVNext(created.career, [], mechanics).ok).toBe(false);
    expect(kickoffVNext(created.career, mechanics).ok).toBe(false);
    expect(commitProgramVNext(created.career, 'program_unknown' as never, mechanics).ok).toBe(
      false,
    );
    expect(parseCareerVNext('{"model":"career_vnext","version":3}')).toBeNull();
  });
});

describe('Career VNext weekly lifecycle', () => {
  it('draws weekly events for every position and carries modifiers only into the next game', () => {
    for (const [positionId, archetypeId] of identities) {
      const { career, events } = playSeason(
        identityFor(positionId, archetypeId),
        `vnext-events-${positionId}`,
      );
      expect(events.length, positionId).toBeGreaterThan(0);
      expect(career.condition.eventHistory.map(({ eventId }) => eventId)).toEqual(events);
      expect(career.condition.nextGameModifiers).toEqual({
        clueBonus: 0,
        decisionScoreFlat: 0,
        exposureReductionPermille: 0,
      });
      // Cooldowns hold: the same event never repeats within its cooldown window.
      const weeks = new Map<string, number>();
      for (const { eventId, weekIndex } of career.condition.eventHistory) {
        const last = weeks.get(eventId);
        if (last !== undefined) expect(weekIndex - last).toBeGreaterThan(2);
        weeks.set(eventId, weekIndex);
      }
    }
  }, 120_000);

  it('caps Saturday snaps by injury availability and still gives decisions', () => {
    const seen = { injuries: 0, out: 0, limited: 0 };
    for (const [positionId, archetypeId] of identities) {
      for (const choice of ['injury_choice_rest_rehab', 'injury_choice_play_limited'] as const) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const { career, decisionsPerGame, injuries } = playSeason(
            identityFor(positionId, archetypeId),
            `vnext-injury-${positionId}-${attempt}`,
            false,
            choice,
          );
          seen.injuries += injuries.length;
          expect(Math.min(...decisionsPerGame)).toBeGreaterThanOrEqual(2);
          expect(career.condition.injuryHistory.length).toBe(injuries.length);
          for (const recap of career.log) {
            if (recap.availabilityId === 'injury_availability_out') {
              seen.out += 1;
              expect(recap.liveSnapCount).toBe(0);
            }
            if (recap.availabilityId === 'injury_availability_limited') seen.limited += 1;
          }
        }
      }
    }
    expect(seen.injuries).toBeGreaterThan(0);
    expect(seen.out + seen.limited).toBeGreaterThan(0);
  }, 300_000);

  it('makes Body the currency of ambition: grinding invites injuries, rest keeps them rare', () => {
    const rate = (strategy: 'grind' | 'balanced') => {
      let injuries = 0;
      let seasons = 0;
      for (const [positionId, archetypeId] of identities)
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const run = playSeason(
            identityFor(positionId, archetypeId),
            `vnext-body-${positionId}-${attempt}`,
            false,
            'injury_choice_rest_rehab',
            strategy,
          );
          injuries += run.injuries.length;
          seasons += 1;
        }
      return injuries / seasons;
    };
    const balanced = rate('balanced');
    const grind = rate('grind');
    expect(balanced).toBeLessThan(1);
    expect(grind).toBeGreaterThan(balanced * 2);
  }, 300_000);

  it('migrates a v1 save to the empty weekly condition', () => {
    const identity = identityFor('position_rb', 'archetype_rb_power_back');
    const { career } = playSeason(identity, 'vnext-migrate');
    // A v1 save is the same JSON without the weekly condition or recap availability.
    const v1 = JSON.parse(JSON.stringify(career)) as Record<string, unknown>;
    delete v1['condition'];
    v1['version'] = 1;
    for (const recap of v1['log'] as Record<string, unknown>[]) delete recap['availabilityId'];
    const migrated = parseCareerVNext(JSON.stringify(v1));
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(2);
    expect(migrated!.condition.injury).toBeNull();
    expect(migrated!.condition.eventHistory).toEqual([]);
    expect(
      migrated!.log.every(({ availabilityId }) => availabilityId === 'injury_availability_full'),
    ).toBe(true);
  }, 60_000);
});
