import { describe, expect, it } from 'vitest';
import {
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitOffseasonVNext,
  commitProgramVNext,
  continueGameVNext,
  continueSeasonReviewVNext,
  createCareerVNext,
  createRng,
  declareForDraftVNext,
  runDraftVNext,
  createWorldAlphaSeason,
  createWorldVNextSeason,
  equipSkillVNext,
  focusDefinitionsVNext,
  offerCandidatesVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  parseCareerVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  serializeCareerVNext,
  toGameDayVNext,
  VNEXT_BREAKTHROUGH_THRESHOLD,
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
  ['position_lb', 'archetype_lb_run_stopper'],
  ['position_edge', 'archetype_edge_speed_rusher'],
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
  offerIndex = -1,
  /** Test-only: commit to this program regardless of offers (e.g. a peak program). */
  forcedProgramId: string | null = null,
) {
  const mechanics = buildCareerVNextMechanics(identity)!;
  const decisionsPerGame: number[] = [];
  const events: string[] = [];
  const nilOffers: string[] = [];
  const injuries: string[] = [];
  const cards: string[] = [];
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
  const offer =
    forcedProgramId === null
      ? career.recruiting.offers.at(offerIndex)!
      : { ...career.recruiting.offers[0]!, programId: forcedProgramId as never };
  if (forcedProgramId !== null)
    career = {
      ...career,
      recruiting: { ...career.recruiting, offers: [...career.recruiting.offers, offer] },
    };
  career = adopt(commitProgramVNext(career, offer.programId, mechanics));
  // The previewed room is exactly the committed room.
  if (forcedProgramId === null)
    expect(career.program!.room.projection.rank).toBe(offer.preview.rank);
  const focusIds = focusDefinitionsVNext(career, mechanics).map(({ id }) => id);
  while (career.flow.type !== 'SEASON_REVIEW') {
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
    } else if (career.flow.type === 'BREAKTHROUGH') {
      const offer = career.flow.offer;
      if (offer.chosenSkillId === null) {
        expect(new Set(offer.skillIds).size).toBe(3);
        expect(chooseBreakthroughVNext(career, 'skill_unknown').ok).toBe(false);
        const gauge = career.athlete.breakthroughGauge;
        career = adopt(chooseBreakthroughVNext(career, offer.skillIds[0]!));
        expect(career.athlete.breakthroughGauge).toBe(gauge - VNEXT_BREAKTHROUGH_THRESHOLD);
        cards.push(offer.skillIds[0]!);
      } else career = adopt(toGameDayVNext(career, mechanics));
    } else if (career.flow.type === 'NIL') {
      if (career.flow.offer.decision === null) {
        expect(toGameDayVNext(career, mechanics).ok).toBe(false);
        nilOffers.push(career.flow.offer.offerId);
        career = adopt(chooseNilVNext(career, nilOffers.length % 2 === 1, mechanics));
      } else career = adopt(toGameDayVNext(career, mechanics));
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
        const frame = projectSnapBoardFrame(career, mechanics)!;
        expect(frame).not.toBeNull();
        expect(frame.result).toBeNull();
        const choice =
          pickBest && frame.kind === 'SIDELINE'
            ? ((career.flow.type === 'GAME' &&
                career.flow.game.sideline[frame.repNumber - 1]!.bestDecisionId) as string)
            : frame.decisionIds[0]!;
        expect(chooseSnapVNext(career, 'not_a_decision', mechanics).ok).toBe(false);
        career = adopt(chooseSnapVNext(career, choice, mechanics));
        const resolved = projectSnapBoardFrame(career, mechanics)!;
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
  return { career, decisionsPerGame, reloads, events, injuries, cards, nilOffers };
}

describe('Career VNext vertical slice core', () => {
  it.each(identities)(
    '%s plays a full regular season with Saturday decisions every week',
    (positionId, archetypeId) => {
      const identity = identityFor(positionId, archetypeId);
      const { career, decisionsPerGame, reloads } = playSeason(identity, `vnext-${positionId}`);
      // Twelve regular-season games plus up to two postseason games for a top-four finish.
      expect(career.log.length).toBeGreaterThanOrEqual(12);
      expect(career.log.length).toBeLessThanOrEqual(14);
      expect(decisionsPerGame).toHaveLength(career.log.length);
      expect(career.history).toHaveLength(1);
      expect(career.flow.type === 'SEASON_REVIEW' && career.flow.review.games).toBe(
        career.log.length,
      );
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
    expect(parseCareerVNext('{"model":"career_vnext","version":4}')).toBeNull();
  });
});

describe('Career VNext weekly lifecycle', () => {
  it('draws weekly events for every position and carries modifiers only into the next game', () => {
    let lifeEvents = 0;
    for (const [positionId, archetypeId] of identities) {
      const { career, events } = playSeason(
        identityFor(positionId, archetypeId),
        `vnext-events-${positionId}`,
      );
      expect(events.length, positionId).toBeGreaterThan(0);
      lifeEvents += events.filter((id) => id.startsWith('event_life_')).length;
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
    // The shared campus-life pack fills some quiet weeks for every position.
    expect(lifeEvents).toBeGreaterThan(0);
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
    // Same band as the balance harness: rest keeps injuries near one a season at most.
    expect(balanced).toBeLessThanOrEqual(1.5);
    expect(grind).toBeGreaterThan(balanced * 1.5);
  }, 300_000);

  it('migrates v1 and v2 saves to the current version and keeps playing', () => {
    const identity = identityFor('position_rb', 'archetype_rb_power_back');
    const mechanics = buildCareerVNextMechanics(identity)!;
    const created = createCareerVNext({ seed: 'vnext-migrate', identity }, mechanics);
    if (!created.ok) throw new Error(created.reason);
    const committed = commitProgramVNext(
      created.career,
      created.career.recruiting.offers[0]!.programId,
      mechanics,
    );
    if (!committed.ok) throw new Error(committed.reason);
    // A v2 save is the same JSON without the season arc fields; v1 also lacks the weekly condition.
    const v2 = JSON.parse(JSON.stringify(committed.career)) as Record<
      string,
      Record<string, unknown>
    >;
    delete v2['history'];
    delete v2['season']!['startOverall'];
    delete v2['season']!['startRank'];
    (v2 as Record<string, unknown>)['version'] = 2;
    const v1 = JSON.parse(JSON.stringify(v2)) as Record<string, unknown>;
    delete v1['condition'];
    v1['version'] = 1;
    const fromV2 = parseCareerVNext(JSON.stringify(v2));
    expect(fromV2?.version).toBe(3);
    expect(fromV2?.history).toEqual([]);
    expect(fromV2?.season.startRank).toBe(committed.career.program!.room.projection.rank);
    const migrated = parseCareerVNext(JSON.stringify(v1));
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(3);
    const focusIds = focusDefinitionsVNext(migrated!, mechanics).map(({ id }) => id);
    expect(planWeekVNext(migrated!, [focusIds[0]!, focusIds[1]!, focusIds[2]!], mechanics).ok).toBe(
      true,
    );
    expect(migrated!.condition.injury).toBeNull();
    expect(migrated!.condition.eventHistory).toEqual([]);
    expect(
      migrated!.log.every(({ availabilityId }) => availabilityId === 'injury_availability_full'),
    ).toBe(true);
  }, 60_000);
});

describe('Career VNext build', () => {
  it('turns practice into breakthrough offers and equips the chosen card', () => {
    const perSeason: number[] = [];
    for (const [positionId, archetypeId] of identities) {
      const { career, cards } = playSeason(
        identityFor(positionId, archetypeId),
        `vnext-build-${positionId}`,
        false,
        'injury_choice_rest_rehab',
        'balanced',
      );
      perSeason.push(cards.length);
      expect(career.build.ownedSkillIds).toEqual(cards);
      const equipped = career.build.equippedSkillIds.filter((id) => id !== null);
      expect(equipped).toEqual(cards.slice(0, 4));
    }
    (
      globalThis as unknown as { process: { stdout: { write: (text: string) => void } } }
    ).process.stdout.write(
      `CARDS ${perSeason.join(',')}
`,
    );
    expect(Math.min(...perSeason)).toBeGreaterThanOrEqual(1);
  }, 120_000);

  it.each(identities)(
    '%s can equip and play every card in its catalog',
    (positionId, archetypeId) => {
      const identity = identityFor(positionId, archetypeId);
      const mechanics = buildCareerVNextMechanics(identity)!;
      const created = createCareerVNext(
        { seed: `vnext-catalog-${positionId}`, identity },
        mechanics,
      );
      if (!created.ok) throw new Error(created.reason);
      const committed = commitProgramVNext(
        created.career,
        created.career.recruiting.offers[0]!.programId,
        mechanics,
      );
      if (!committed.ok) throw new Error(committed.reason);
      const catalog = offerCandidatesVNext(committed.career, mechanics).map(
        ({ skillId }) => skillId,
      );
      expect(catalog.length).toBeGreaterThanOrEqual(12);
      const owning: CareerVNext = {
        ...committed.career,
        build: { ...committed.career.build, ownedSkillIds: catalog },
      };
      const focusIds = focusDefinitionsVNext(owning, mechanics).map(({ id }) => id);
      for (let start = 0; start < catalog.length; start += 4) {
        let career = owning;
        for (const [slot, skillId] of catalog.slice(start, start + 4).entries()) {
          const equipped = equipSkillVNext(career, slot, skillId);
          if (!equipped.ok) throw new Error(`${skillId}: ${equipped.reason}`);
          career = equipped.career;
        }
        const planned = planWeekVNext(
          career,
          [focusIds[0]!, focusIds[3]!, focusIds[5]!],
          mechanics,
        );
        if (!planned.ok)
          throw new Error(`${catalog.slice(start, start + 4).join(',')}: ${planned.reason}`);
        let next = planned.career;
        while (next.flow.type !== 'GAME') {
          const flow = next.flow;
          const step =
            flow.type === 'EVENT' && flow.event.chosenChoiceId === null
              ? chooseEventVNext(next, flow.event.choiceIds[0]!, mechanics)
              : flow.type === 'NIL' && flow.offer.decision === null
                ? chooseNilVNext(next, true, mechanics)
                : flow.type === 'INJURY' && flow.report.availability === null
                  ? chooseInjuryVNext(next, 'injury_choice_play_limited', mechanics)
                  : flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null
                    ? chooseBreakthroughVNext(next, flow.offer.skillIds[0]!)
                    : toGameDayVNext(next, mechanics);
          if (!step.ok) throw new Error(step.reason);
          next = step.career;
        }
        expect(kickoffVNext(next, mechanics).ok).toBe(true);
      }
      // Build edits are planning-only and a card occupies one slot.
      const moved = equipSkillVNext(owning, 0, catalog[0]!);
      if (!moved.ok) throw new Error(moved.reason);
      const again = equipSkillVNext(moved.career, 2, catalog[0]!);
      if (!again.ok) throw new Error(again.reason);
      expect(again.career.build.equippedSkillIds).toEqual([null, null, catalog[0], null]);
      expect(equipSkillVNext(owning, 4, catalog[0]!).ok).toBe(false);
      expect(equipSkillVNext(committed.career, 0, catalog[0]!).ok).toBe(false);
    },
    60_000,
  );

  it('makes WR cards change the Saturday: clues, reliability and package snaps', () => {
    const identity = identityFor('position_wr', 'archetype_wr_deep_threat');
    const mechanics = buildCareerVNextMechanics(identity)!;
    const created = createCareerVNext({ seed: 'vnext-wr-hooks', identity }, mechanics);
    if (!created.ok) throw new Error(created.reason);
    const committed = commitProgramVNext(
      created.career,
      created.career.recruiting.offers[0]!.programId,
      mechanics,
    );
    if (!committed.ok) throw new Error(committed.reason);
    // The same practice week for both runs; the cards are equipped only for Saturday, so the
    // comparison isolates their Game Day effects from practice and depth movement.
    const kickoff = (equipped: readonly (string | null)[]) => {
      let career: CareerVNext = committed.career;
      const focusIds = focusDefinitionsVNext(career, mechanics).map(({ id }) => id);
      const planned = planWeekVNext(career, [focusIds[0]!, focusIds[5]!, focusIds[6]!], mechanics);
      if (!planned.ok) throw new Error(planned.reason);
      career = planned.career;
      while (career.flow.type !== 'GAME') {
        const flow = career.flow;
        const step =
          flow.type === 'EVENT' && flow.event.chosenChoiceId === null
            ? chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics)
            : flow.type === 'NIL' && flow.offer.decision === null
              ? chooseNilVNext(career, true, mechanics)
              : flow.type === 'INJURY' && flow.report.availability === null
                ? chooseInjuryVNext(career, 'injury_choice_play_limited', mechanics)
                : toGameDayVNext(career, mechanics);
        if (!step.ok) throw new Error(step.reason);
        career = step.career;
      }
      career = {
        ...career,
        build: {
          ownedSkillIds: equipped.filter((id): id is string => id !== null) as never,
          equippedSkillIds: equipped as never,
        },
      };
      const started = kickoffVNext(career, mechanics);
      if (!started.ok || started.career.flow.type !== 'GAME') throw new Error('kickoff');
      return started.career.flow.game.engine!;
    };
    const plain = kickoff([null, null, null, null]);
    const built = kickoff([
      'skill_leverage_snapshot_c',
      'skill_signal_reader_a',
      'skill_coaches_key_s',
      null,
    ]);
    if (plain.game.type !== 'ACTIVE' || built.game.type !== 'ACTIVE') throw new Error('inactive');
    expect(built.game.pendingSnap.revealedClueIds.length).toBeGreaterThan(
      plain.game.pendingSnap.revealedClueIds.length,
    );
    expect(built.game.input.opportunityCount).toBe(
      Math.min(5, plain.game.input.opportunityCount + 1),
    );
  }, 60_000);
});

describe('Career VNext academics', () => {
  it.each(identities)(
    '%s sits the checkpoint game when GPA is below the floor, but still gets sideline reps',
    (positionId, archetypeId) => {
      const identity = identityFor(positionId, archetypeId);
      const mechanics = buildCareerVNextMechanics(identity)!;
      const created = createCareerVNext(
        { seed: `vnext-academic-${positionId}`, identity },
        mechanics,
      );
      if (!created.ok) throw new Error(created.reason);
      const committed = commitProgramVNext(
        created.career,
        created.career.recruiting.offers[0]!.programId,
        mechanics,
      );
      if (!committed.ok) throw new Error(committed.reason);
      const checkpoint = mechanics.academics.checkpoints[0]!.weekIndex;
      const reach = (gpa: number) => {
        let career: CareerVNext = {
          ...committed.career,
          athlete: {
            ...committed.career.athlete,
            profile: {
              ...committed.career.athlete.profile,
              state: { ...committed.career.athlete.profile.state, gpa },
            },
          },
          season: { ...committed.career.season, weekIndex: checkpoint },
        };
        const focusIds = focusDefinitionsVNext(career, mechanics).map(({ id }) => id);
        const planned = planWeekVNext(
          career,
          [focusIds[0]!, focusIds[1]!, focusIds[2]!],
          mechanics,
        );
        if (!planned.ok) throw new Error(planned.reason);
        career = planned.career;
        while (career.flow.type !== 'GAME') {
          const flow = career.flow;
          const step =
            flow.type === 'EVENT' && flow.event.chosenChoiceId === null
              ? chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics)
              : flow.type === 'NIL' && flow.offer.decision === null
                ? chooseNilVNext(career, true, mechanics)
                : flow.type === 'INJURY' && flow.report.availability === null
                  ? chooseInjuryVNext(career, 'injury_choice_play_limited', mechanics)
                  : flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null
                    ? chooseBreakthroughVNext(career, flow.offer.skillIds[0]!)
                    : toGameDayVNext(career, mechanics);
          if (!step.ok) throw new Error(step.reason);
          career = step.career;
        }
        const started = kickoffVNext(career, mechanics);
        if (!started.ok || started.career.flow.type !== 'GAME') throw new Error('kickoff');
        return started.career.flow.game;
      };
      const held = reach(1.5);
      expect(held.academicHold).toBe(true);
      expect(held.slots.filter(({ kind }) => kind === 'LIVE')).toHaveLength(0);
      expect(held.slots.length).toBeGreaterThanOrEqual(2);
      expect(reach(3.2).academicHold).toBeUndefined();
    },
  );
});

describe('Career VNext season arc', () => {
  it('plays four seasons through postseason, review, offseason and graduation', () => {
    const identity = identityFor('position_qb', 'archetype_qb_field_general');
    const mechanics = buildCareerVNextMechanics(identity)!;
    const adopt = (result: CareerVNextResult): CareerVNext => {
      if (!result.ok) throw new Error(result.reason);
      const json = serializeCareerVNext(result.career);
      if (json === null) throw new Error('serialize');
      const parsed = parseCareerVNext(json);
      expect(parsed).toEqual(result.career);
      return parsed!;
    };
    let career = adopt(createCareerVNext({ seed: 'vnext-arc', identity }, mechanics));
    career = adopt(commitProgramVNext(career, career.recruiting.offers[1]!.programId, mechanics));
    const programs: string[] = [career.program!.programId];
    let postseasonGames = 0;
    let maxBytes = 0;
    for (let guard = 0; guard < 2_000 && career.flow.type !== 'CAREER_COMPLETE'; guard += 1) {
      const flow = career.flow;
      const step: CareerVNextResult =
        flow.type === 'WEEK_PLAN'
          ? (() => {
              const open = focusDefinitionsVNext(career, mechanics)
                .map(({ id }) => id)
                .filter((id) => isFocusAvailableVNext(career, id, mechanics));
              return planWeekVNext(
                career,
                [
                  open[0]!,
                  open[1]!,
                  open.includes('action_recovery') ? 'action_recovery' : open[2]!,
                ],
                mechanics,
              );
            })()
          : flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null
            ? chooseBreakthroughVNext(career, flow.offer.skillIds[0]!)
            : flow.type === 'EVENT' && flow.event.chosenChoiceId === null
              ? chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics)
              : flow.type === 'NIL' && flow.offer.decision === null
                ? chooseNilVNext(career, true, mechanics)
                : flow.type === 'INJURY' && flow.report.availability === null
                  ? chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics)
                  : flow.type === 'GAME'
                    ? flow.game.stage === 'PREGAME'
                      ? kickoffVNext(career, mechanics)
                      : flow.game.stage === 'SNAP'
                        ? chooseSnapVNext(
                            career,
                            projectSnapBoardFrame(career, mechanics)!.decisionIds[0]!,
                            mechanics,
                          )
                        : continueGameVNext(career, mechanics)
                    : flow.type === 'POST_GAME'
                      ? nextWeekVNext(career, mechanics)
                      : flow.type === 'SEASON_REVIEW'
                        ? continueSeasonReviewVNext(career, mechanics)
                        : flow.type === 'OFFSEASON'
                          ? (() => {
                              // Stay after season one, then take the first transfer, then stay.
                              expect(flow.options).toHaveLength(4);
                              expect(flow.options[0]!.kind).toBe('STAY');
                              expect(
                                new Set(flow.options.map(({ programId }) => programId)).size,
                              ).toBe(4);
                              // Declaring opens after the junior season (season index 2).
                              const declared = declareForDraftVNext(career);
                              expect(declared.ok).toBe(career.season.index >= 2);
                              if (declared.ok && declared.career.flow.type === 'CAREER_COMPLETE') {
                                expect(declared.career.flow.alumni.ending).toBe('DECLARED');
                                expect(declared.career.flow.alumni.draft).toBeDefined();
                              }
                              const pick =
                                career.season.index === 1 ? flow.options[1]! : flow.options[0]!;
                              return commitOffseasonVNext(career, pick.programId, mechanics);
                            })()
                          : toGameDayVNext(career, mechanics);
      if (flow.type === 'POST_GAME' && flow.recap.round !== undefined) postseasonGames += 1;
      const before = career;
      career = adopt(step);
      maxBytes = Math.max(maxBytes, serializeCareerVNext(career)!.length);
      if (before.flow.type === 'OFFSEASON') {
        expect(career.season.index).toBe(before.season.index + 1);
        expect(career.season.weekIndex).toBe(0);
        expect(career.program!.room.competitors).toHaveLength(7);
        if (career.program!.programId === before.program!.programId) {
          // Seniors graduate; everyone returning is a year older.
          for (const competitor of career.program!.room.competitors) {
            const earlier = before.program!.room.competitors.find(({ id }) => id === competitor.id);
            if (earlier !== undefined) expect(competitor.classYear).toBe(earlier.classYear + 1);
          }
          expect(
            career.program!.room.competitors.some(({ id }) =>
              before.program!.room.competitors.some(
                (entry) => entry.id === id && entry.classYear === 4,
              ),
            ),
          ).toBe(false);
        } else programs.push(career.program!.programId);
      }
    }
    if (career.flow.type !== 'CAREER_COMPLETE') throw new Error('career did not complete');
    const alumni = career.flow.alumni;
    expect(career.history).toHaveLength(4);
    // Every season carries a draft projection; graduating goes through the Pro Draft.
    for (const review of career.history) {
      expect(review.draftStock!.score).toBeGreaterThanOrEqual(0);
      expect(review.draftStock!.score).toBeLessThanOrEqual(100);
    }
    expect(alumni.ending).toBe('GRADUATED');
    expect(alumni.draft!.stockScore).toBe(career.history.at(-1)!.draftStock!.score);
    expect(alumni.draft!.round === null).toBe(alumni.draft!.pick === null);
    expect(runDraftVNext(career)).toEqual(alumni.draft);
    expect(alumni.seasons).toBe(4);
    expect(alumni.programIds).toEqual(programs);
    expect(alumni.record.wins + alumni.record.losses + alumni.record.ties).toBe(48);
    // Saturdays do not end tied: overtime settles every regulation tie.
    expect(alumni.record.ties).toBe(0);
    expect(career.history.map(({ seasonIndex }) => seasonIndex)).toEqual([0, 1, 2, 3]);
    // The log holds only the final season; earlier seasons are summarized in history.
    expect(career.log.every(({ seasonIndex }) => seasonIndex === 3)).toBe(true);
    expect(postseasonGames).toBeGreaterThanOrEqual(
      career.log.filter(({ round }) => round !== undefined).length,
    );
    expect(maxBytes).toBeLessThan(1_000_000);
    (
      globalThis as unknown as { process: { stdout: { write: (text: string) => void } } }
    ).process.stdout.write(
      `ARC bytes=${maxBytes} finishes=${career.history.map(({ finish }) => finish).join(',')} ranks=${career.history.map(({ depthRank }) => depthRank.end).join(',')}\n`,
    );
  }, 300_000);

  it('plays its bracket games when the program qualifies', () => {
    const finishes: string[] = [];
    let found = false;
    for (let attempt = 0; attempt < 16 && !found; attempt += 1) {
      const identity = identityFor('position_qb', 'archetype_qb_field_general');
      const mechanics = buildCareerVNextMechanics(identity)!;
      const { career } = playSeason(
        identity,
        `vnext-playoff-${attempt}`,
        false,
        'injury_choice_rest_rehab',
        'balanced',
        0,
        ['program_ashgrove_state', 'program_delta_vale', 'program_amber_coast'][attempt % 3]!,
      );
      if (career.flow.type !== 'SEASON_REVIEW') throw new Error('review');
      const review = career.flow.review;
      finishes.push(review.finish);
      const rounds = career.log.map(({ round }) => round).filter((round) => round !== undefined);
      if (review.finish === 'MISSED') {
        expect(rounds).toEqual([]);
        continue;
      }
      found = true;
      // Seeds 1-4 have a first-round bye; the player's games are consecutive rounds that end
      // where the season finished.
      const world = career.season.world!;
      if (world.model !== 'world_vnext_season_v1' || world.postseason.type !== 'COMPLETE')
        throw new Error('conference world');
      const seed = world.postseason.qualifiers.find(
        ({ programId }) => programId === review.programId,
      )!.seed;
      const order = ['FIRST_ROUND', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL'];
      const last =
        review.finish === 'CHAMPION' || review.finish === 'RUNNER_UP' ? 'FINAL' : review.finish;
      expect(rounds).toEqual(order.slice(seed <= 4 ? 1 : 0, order.indexOf(last) + 1));
      if (review.finish === 'CHAMPION') expect(review.championProgramId).toBe(review.programId);
      expect(career.season.world!.postseason.type).toBe('COMPLETE');
      expect(continueSeasonReviewVNext(career, mechanics).ok).toBe(true);
    }
    expect(found, finishes.join(',')).toBe(true);
  }, 300_000);
});

describe('Career VNext world compatibility (M9)', () => {
  it('finishes an M8 64-program season there, then moves to the 96-program world', () => {
    const identity = identityFor('position_cb', 'archetype_cb_press_man');
    const mechanics = buildCareerVNextMechanics(identity)!;
    const created = createCareerVNext({ seed: 'vnext-64-world', identity }, mechanics);
    if (!created.ok) throw new Error(created.reason);
    const programId = mechanics.world64.programProfiles[40]!.programId;
    let career: CareerVNext = {
      ...created.career,
      recruiting: {
        ...created.career.recruiting,
        offers: [{ ...created.career.recruiting.offers[0]!, programId }],
      },
    };
    const committed = commitProgramVNext(career, programId, mechanics);
    if (!committed.ok) throw new Error(committed.reason);
    const world64 = createWorldVNextSeason(
      mechanics.world64,
      createRng('vnext-64-world:vnext:world:0'),
      0,
      programId,
    );
    if (!world64.ok) throw new Error(world64.reason);
    expect(world64.value.worldId).toBeUndefined();
    career = { ...committed.career, season: { ...committed.career.season, world: world64.value } };
    career = parseCareerVNext(serializeCareerVNext(career)!)!;
    for (let guard = 0; guard < 2_000 && career.flow.type !== 'OFFSEASON'; guard += 1) {
      const flow = career.flow;
      const step: CareerVNextResult =
        flow.type === 'WEEK_PLAN'
          ? (() => {
              const open = focusDefinitionsVNext(career, mechanics)
                .map(({ id }) => id)
                .filter((id) => isFocusAvailableVNext(career, id, mechanics));
              return planWeekVNext(career, [open[0]!, open[1]!, open[2]!], mechanics);
            })()
          : flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null
            ? chooseBreakthroughVNext(career, flow.offer.skillIds[0]!)
            : flow.type === 'EVENT' && flow.event.chosenChoiceId === null
              ? chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics)
              : flow.type === 'NIL' && flow.offer.decision === null
                ? chooseNilVNext(career, false, mechanics)
                : flow.type === 'INJURY' && flow.report.availability === null
                  ? chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics)
                  : flow.type === 'GAME'
                    ? flow.game.stage === 'PREGAME'
                      ? kickoffVNext(career, mechanics)
                      : flow.game.stage === 'SNAP'
                        ? chooseSnapVNext(
                            career,
                            projectSnapBoardFrame(career, mechanics)!.decisionIds[0]!,
                            mechanics,
                          )
                        : continueGameVNext(career, mechanics)
                    : flow.type === 'POST_GAME'
                      ? nextWeekVNext(career, mechanics)
                      : flow.type === 'SEASON_REVIEW'
                        ? continueSeasonReviewVNext(career, mechanics)
                        : toGameDayVNext(career, mechanics);
      if (!step.ok) throw new Error(step.reason);
      career = step.career;
    }
    const world = career.season.world!;
    expect(world.model === 'world_vnext_season_v1' && world.worldId === undefined).toBe(true);
    if (career.flow.type !== 'OFFSEASON') throw new Error('offseason');
    const next = commitOffseasonVNext(career, career.flow.options[0]!.programId, mechanics);
    if (!next.ok) throw new Error(next.reason);
    const nextWorld = next.career.season.world!;
    expect(nextWorld.model === 'world_vnext_season_v1' && nextWorld.worldId).toBe(
      'world_vnext_96_program',
    );
  }, 300_000);
});

describe('Career VNext world compatibility (M8)', () => {
  it('finishes a pre-M8 season on the 32-program world, then moves to the conference world', () => {
    const identity = identityFor('position_rb', 'archetype_rb_power_back');
    const mechanics = buildCareerVNextMechanics(identity)!;
    const created = createCareerVNext({ seed: 'vnext-legacy-world', identity }, mechanics);
    if (!created.ok) throw new Error(created.reason);
    // An alpha-world program, as a pre-M8 save would hold, with that season's alpha world.
    const programId = mechanics.legacyWorld.programProfiles[5]!.programId;
    let career: CareerVNext = {
      ...created.career,
      recruiting: {
        ...created.career.recruiting,
        offers: [{ ...created.career.recruiting.offers[0]!, programId }],
      },
    };
    const committed = commitProgramVNext(career, programId, mechanics);
    if (!committed.ok) throw new Error(committed.reason);
    const legacy = createWorldAlphaSeason(
      mechanics.legacyWorld,
      createRng('vnext-legacy-world:vnext:world:0'),
      0,
      programId,
    );
    if (!legacy.ok) throw new Error(legacy.reason);
    career = { ...committed.career, season: { ...committed.career.season, world: legacy.value } };
    const json = serializeCareerVNext(career);
    expect(json).not.toBeNull();
    career = parseCareerVNext(json!)!;
    const opponents: string[] = [];
    for (let guard = 0; guard < 2_000 && career.flow.type !== 'OFFSEASON'; guard += 1) {
      const flow = career.flow;
      if (flow.type === 'GAME' && flow.game.stage === 'PREGAME') {
        const fixture = mechanics.legacyWorld.regularSeasonRounds
          .find(({ roundNumber }) => roundNumber === career.season.weekIndex + 1)
          ?.fixtures.find(
            ({ homeProgramId, awayProgramId }) =>
              homeProgramId === programId || awayProgramId === programId,
          );
        if (fixture !== undefined)
          opponents.push(
            fixture.homeProgramId === programId ? fixture.awayProgramId : fixture.homeProgramId,
          );
      }
      const step: CareerVNextResult =
        flow.type === 'WEEK_PLAN'
          ? (() => {
              const open = focusDefinitionsVNext(career, mechanics)
                .map(({ id }) => id)
                .filter((id) => isFocusAvailableVNext(career, id, mechanics));
              return planWeekVNext(career, [open[0]!, open[1]!, open[2]!], mechanics);
            })()
          : flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null
            ? chooseBreakthroughVNext(career, flow.offer.skillIds[0]!)
            : flow.type === 'EVENT' && flow.event.chosenChoiceId === null
              ? chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics)
              : flow.type === 'NIL' && flow.offer.decision === null
                ? chooseNilVNext(career, true, mechanics)
                : flow.type === 'INJURY' && flow.report.availability === null
                  ? chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics)
                  : flow.type === 'GAME'
                    ? flow.game.stage === 'PREGAME'
                      ? kickoffVNext(career, mechanics)
                      : flow.game.stage === 'SNAP'
                        ? chooseSnapVNext(
                            career,
                            projectSnapBoardFrame(career, mechanics)!.decisionIds[0]!,
                            mechanics,
                          )
                        : continueGameVNext(career, mechanics)
                    : flow.type === 'POST_GAME'
                      ? nextWeekVNext(career, mechanics)
                      : flow.type === 'SEASON_REVIEW'
                        ? continueSeasonReviewVNext(career, mechanics)
                        : toGameDayVNext(career, mechanics);
      if (!step.ok) throw new Error(step.reason);
      career = step.career;
    }
    // The season ran on the alpha schedule and bracket.
    expect(opponents).toHaveLength(12);
    expect(career.season.world!.model).toBe('world_alpha_season_v1');
    expect(['CHAMPION', 'RUNNER_UP', 'SEMIFINAL', 'MISSED']).toContain(career.history[0]!.finish);
    if (career.flow.type !== 'OFFSEASON') throw new Error('offseason');
    const next = commitOffseasonVNext(career, career.flow.options[0]!.programId, mechanics);
    if (!next.ok) throw new Error(next.reason);
    expect(next.career.season.world!.model).toBe('world_vnext_season_v1');
    expect(serializeCareerVNext(next.career)).not.toBeNull();
  }, 300_000);
});

describe('Career VNext NIL (M8)', () => {
  it('brings NIL offers from Saturday brand; accepted deals pay, then cost practice time', () => {
    let offers = 0;
    let accepted = 0;
    let fulfilled = 0;
    let funds = 0;
    for (const [positionId, archetypeId] of identities) {
      const identity = identityFor(positionId, archetypeId);
      const { career, nilOffers } = playSeason(identity, `vnext-nil-${positionId}`, true);
      offers += nilOffers.length;
      const nil = career.nil;
      if (nil === undefined) continue;
      accepted += nil.history.filter(({ outcome }) => outcome === 'ACCEPTED').length;
      fulfilled += nil.history.filter(({ outcome }) => outcome === 'FULFILLED').length;
      funds += nil.fundsUsd;
      // Each offer is offered once a career.
      expect(
        new Set(
          nil.history
            .filter(({ outcome }) => outcome !== 'FULFILLED')
            .map(({ offerId }) => offerId),
        ).size,
      ).toBe(nil.history.filter(({ outcome }) => outcome !== 'FULFILLED').length);
      expect(nil.lockerRoom).toBeGreaterThanOrEqual(0);
      expect(nil.lockerRoom).toBeLessThanOrEqual(100);
    }
    expect(offers).toBeGreaterThan(0);
    expect(accepted).toBeGreaterThan(0);
    expect(fulfilled).toBeGreaterThan(0);
    expect(funds).toBeGreaterThan(0);
  }, 300_000);
});
