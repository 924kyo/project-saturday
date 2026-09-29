import { describe, expect, it } from 'vitest';
import {
  advancePositionAlphaGameDayV2,
  advancePositionAlphaPostseasonRoundV2,
  beginPositionAlphaPostseasonV2,
  choosePositionAlphaSkillV2,
  commitPositionAlphaFocusPlanV2,
  commitPositionAlphaOffseasonV2,
  completePositionAlphaCareerV2,
  equipPositionAlphaSkillV2,
  migratePositionAlphaSessionV1ToV2,
  parsePositionAlphaSessionV2Json,
  serializePositionAlphaSessionV2Json,
  packJsonArchiveV1,
  unpackJsonArchiveV1,
  resolvePositionAlphaEventV2,
  resolvePositionAlphaGameDaySnapV2,
  resolvePositionAlphaInjuryChoiceV2,
  settlePositionAlphaGameDayV2,
  reviewPositionAlphaSeasonV2,
  validatePositionAlphaSessionV2,
  type PositionAlphaCommandResultV2,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  chooseShippedPositionAlphaSkill,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaWeek,
  resolveShippedPositionAlphaSeason,
  commitShippedPositionAlphaOffseason,
} from '../index.js';

const CASES = [
  ['position_qb', 'archetype_qb_field_general', 0],
  ['position_rb', 'archetype_rb_power_back', 0],
  ['position_cb', 'archetype_cb_press_man', 1],
] as const;

function reload(
  result: PositionAlphaCommandResultV2,
  mechanics: PositionAlphaSessionCommandMechanics,
) {
  if (!result.ok) throw new Error(result.reason);
  const loaded = parsePositionAlphaSessionV2Json(JSON.stringify(result.session), mechanics);
  expect(loaded).toEqual(result.session);
  if (loaded === null) throw new Error('Invalid saved boundary');
  return loaded;
}

function finishGame(
  initial: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
) {
  let session = initial;
  for (let step = 0; session.gameDay.type !== 'POST_GAME'; step++) {
    if (step > 24) throw new Error('Unbounded game');
    const day = session.gameDay;
    const result =
      day.type === 'EVENT_CHOICE' && day.event !== null
        ? resolvePositionAlphaEventV2(session, day.event.choiceIds[0], mechanics)
        : day.type === 'INJURY_CHOICE'
          ? resolvePositionAlphaInjuryChoiceV2(session, 'injury_choice_rest_rehab', mechanics)
          : day.type === 'ACTIVE_SNAP' && day.game?.game.type === 'ACTIVE'
            ? resolvePositionAlphaGameDaySnapV2(
                session,
                day.game.game.pendingSnap.decisionIds[0],
                mechanics,
              )
            : advancePositionAlphaGameDayV2(session, mechanics);
    if (!result.ok) throw new Error(`${result.reason} after ${day.type}`);
    session = reload(result, mechanics);
  }
  session = reload(settlePositionAlphaGameDayV2(session, mechanics), mechanics);
  expect(settlePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
  if (session.skills.offeredSkillIds !== null) {
    const rng = session.careerRng;
    session = reload(
      choosePositionAlphaSkillV2(session, session.skills.offeredSkillIds[0], mechanics),
      mechanics,
    );
    expect(session.careerRng).toEqual(rng);
  }
  return session;
}

function fixture(
  [positionId, archetypeId, seedIndex]: readonly [
    (typeof CASES)[number][0],
    (typeof CASES)[number][1],
    (typeof CASES)[number][2],
  ],
  qualifies: boolean,
  carryRestriction = false,
  currentFinalWeek = true,
  seasonIndex: 0 | 1 = 0,
) {
  const identity = {
    displayName: 'Bracket Athlete',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer' as const,
    personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  };
  const created = createShippedPositionAlphaSession({
    careerSeed: `postseason-${positionId}-${seedIndex}`,
    programId: qualifies ? 'program_ember_peak_polytechnic' : 'program_prairie_forge',
    identity,
  });
  const baseMechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity });
  if (!created.ok || baseMechanics === null) throw new Error('Invalid fixture');
  // Exercise the supported tuning boundary without changing shipped one-game discipline.
  const mechanics = carryRestriction
    ? { ...baseMechanics, academics: { ...baseMechanics.academics, restrictionGames: 2 } }
    : baseMechanics;
  let historical = created.session;
  if (seasonIndex === 1) {
    while (
      historical.phase.type !== 'SEASON_REVIEW' ||
      historical.skills.offeredSkillIds !== null ||
      historical.events.pending !== null
    ) {
      const result =
        historical.skills.offeredSkillIds !== null
          ? chooseShippedPositionAlphaSkill(historical, historical.skills.offeredSkillIds[0])
          : historical.events.pending !== null
            ? resolveShippedPositionAlphaEvent(historical, historical.events.pending.choiceIds[0])
            : resolveShippedPositionAlphaWeek(
                historical,
                mechanics.trainingActions.find((action) => action.positionId === positionId)!.id,
                'best_fit',
              );
      if (!result.ok) throw new Error(result.reason);
      historical = result.session;
    }
    const reviewed = resolveShippedPositionAlphaSeason(historical, 'best_fit');
    if (!reviewed.ok) throw new Error(reviewed.reason);
    const committed = commitShippedPositionAlphaOffseason(
      reviewed.session,
      reviewed.session.lifecycle.currentProgramId,
    );
    if (!committed.ok) throw new Error(committed.reason);
    historical = committed.session;
  }
  // Historical fixtures retain their genuine automatic v1 evidence. The final
  // regular week and every playoff decision below use only current public commands.
  while (
    historical.weekHistory.length < (currentFinalWeek ? 11 : 12) ||
    historical.skills.offeredSkillIds !== null ||
    historical.events.pending !== null
  ) {
    const result =
      historical.skills.offeredSkillIds !== null
        ? chooseShippedPositionAlphaSkill(historical, historical.skills.offeredSkillIds[0])
        : historical.events.pending !== null
          ? resolveShippedPositionAlphaEvent(historical, historical.events.pending.choiceIds[0])
          : resolveShippedPositionAlphaWeek(
              historical,
              mechanics.trainingActions.find((action) => action.positionId === positionId)!.id,
              'best_fit',
            );
    if (!result.ok) throw new Error(result.reason);
    historical = result.session;
  }
  if (carryRestriction) {
    const state = { ...historical.player.state, gpa: 0.5 };
    historical = {
      ...historical,
      player: { ...historical.player, state },
      lifecycle: { ...historical.lifecycle, playerState: state },
    };
  }
  const migrated = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
  if (!currentFinalWeek) return { session: migrated, mechanics };
  const session = finishGame(
    reload(
      commitPositionAlphaFocusPlanV2(
        migrated,
        ['action_recovery', 'action_film_study', 'action_recovery'],
        mechanics,
      ),
      mechanics,
    ),
    mechanics,
  );
  if (seasonIndex === 0)
    expect(
      session.world.rankings.find(
        ({ programId }) => programId === session.lifecycle.currentProgramId,
      )!.rank <= 4,
    ).toBe(qualifies);
  return { session, mechanics };
}

describe('current player-controlled postseason over the authoritative world bracket', () => {
  it.each(CASES)(
    '%s completes current season two with actual alumni and no third-season reset or draw',
    (...position) => {
      const { session: regular, mechanics } = fixture(position, false, false, true, 1);
      let session = reload(beginPositionAlphaPostseasonV2(regular, mechanics), mechanics);
      while (session.phase.type === 'POSTSEASON_PLANNING') {
        if (session.world.postseason.type !== 'ACTIVE') throw new Error('Missing bracket');
        const fixture = session.world.postseason.rounds[
          session.world.postseason.currentRoundIndex
        ].fixtures.some(({ homeProgramId, awayProgramId }) =>
          [homeProgramId, awayProgramId].includes(session.lifecycle.currentProgramId),
        );
        session = fixture
          ? finishGame(
              reload(
                commitPositionAlphaFocusPlanV2(
                  session,
                  ['action_recovery', 'action_film_study', 'action_recovery'],
                  mechanics,
                ),
                mechanics,
              ),
              mechanics,
            )
          : reload(advancePositionAlphaPostseasonRoundV2(session, mechanics), mechanics);
      }
      const reviewed = reload(reviewPositionAlphaSeasonV2(session, mechanics), mechanics);
      const mutable = JSON.parse(JSON.stringify(reviewed)) as PositionAlphaSessionV2;
      const completed = reload(completePositionAlphaCareerV2(mutable, mechanics), mechanics);
      expect(mutable).toEqual(reviewed);
      expect(Object.isFrozen(mutable.player)).toBe(false);
      expect(completed.phase).toEqual({ type: 'CAREER_COMPLETE', seasonIndex: 1 });
      expect(completed.player).toEqual(reviewed.player);
      expect(completed.lifecycle.programHistory).toEqual(reviewed.lifecycle.programHistory);
      expect(completed.lifecycle.activeSeasonIndex).toBe(1);
      expect(completed.lifecycle.offseason).toBeNull();
      for (const key of [
        'careerRng',
        'world',
        'worldHistory',
        'weekHistory',
        'postseasonHistory',
        'skills',
        'events',
        'nil',
        'academics',
        'seasonClock',
        'seasonReview',
      ] as const)
        expect(completed[key]).toEqual(reviewed[key]);
      const alumnus = completed.meta!.alumni[0]!;
      expect(alumnus.seasonSummaries).toEqual(reviewed.lifecycle.completedSeasons);
      expect(alumnus.seasonSummaries[1]!.equippedSkillIds).toHaveLength(4);
      expect(alumnus.programIds).toEqual(
        reviewed.lifecycle.programHistory.map(({ programId }) => programId),
      );
      expect(alumnus.appearance).toEqual(reviewed.player.appearance);
      expect(alumnus.endingId).toBe('career_ending_college_complete');
      for (const stat of alumnus.careerStats.entries)
        expect(stat.value).toBe(
          alumnus.seasonSummaries.reduce(
            (total, summary) =>
              total + summary.stats.entries.find(({ statId }) => statId === stat.statId)!.value,
            0,
          ),
        );
      expect(completePositionAlphaCareerV2(completed, mechanics).ok).toBe(false);
      expect(
        commitPositionAlphaOffseasonV2(reviewed, reviewed.lifecycle.currentProgramId, mechanics).ok,
      ).toBe(false);
      const wire = serializePositionAlphaSessionV2Json(completed, mechanics)!;
      expect(parsePositionAlphaSessionV2Json(wire, mechanics)).toEqual(completed);
      const noReview = Object.fromEntries(
        Object.entries(completed).filter(([key]) => key !== 'seasonReview'),
      );
      for (const invalid of [
        noReview,
        { ...completed, meta: null },
        { ...completed, meta: { ...completed.meta, alumni: [{ ...alumnus, programIds: [] }] } },
        { ...completed, lifecycle: { ...completed.lifecycle, activeSeasonIndex: 2 } },
        {
          ...completed,
          careerRng: { ...completed.careerRng, drawCount: completed.careerRng.drawCount + 1 },
        },
      ])
        expect(validatePositionAlphaSessionV2(invalid, mechanics)).toBe(false);
    },
  );
  it.each(CASES)(
    '%s can commit a migrated all-historical season without fabricating prior ledgers',
    (...position) => {
      const { session: regular, mechanics } = fixture(position, false, false, false);
      let session = reload(beginPositionAlphaPostseasonV2(regular, mechanics), mechanics);
      while (session.phase.type === 'POSTSEASON_PLANNING')
        session = reload(advancePositionAlphaPostseasonRoundV2(session, mechanics), mechanics);
      const reviewed = reload(reviewPositionAlphaSeasonV2(session, mechanics), mechanics);
      const committed = reload(
        commitPositionAlphaOffseasonV2(reviewed, reviewed.lifecycle.currentProgramId, mechanics),
        mechanics,
      );
      expect(committed.academics).toBeUndefined();
      expect(committed.nil).toBeUndefined();
      expect(committed.training.sharedProficiencyUses).toBeUndefined();
      expect(committed.seasonStart!.injury).toBeNull();
      expect(unpackJsonArchiveV1(committed.seasonStart!.priorSeason)).toEqual({
        ok: true,
        value: reviewed,
      });
      const next = finishGame(
        reload(
          commitPositionAlphaFocusPlanV2(
            committed,
            ['action_recovery', 'action_film_study', 'action_recovery'],
            mechanics,
          ),
          mechanics,
        ),
        mechanics,
      );
      expect(next.academics!.activatedAtCareerWeekIndex).toBe(14);
      expect(next.academics!.state.termIndex).toBe(2);
      expect(next.academics!.state.checkpointHistory).toEqual([]);
      expect(next.nil!.activatedAtCareerWeekIndex).toBe(14);
    },
  );
  it.each(CASES.flatMap((position) => [true, false].map((qualifies) => ({ position, qualifies }))))(
    'freezes $position / qualified=$qualifies into truthful season/build and a saved zero-reroll shortlist',
    ({ position, qualifies }) => {
      const { session: regular, mechanics } = fixture(position, qualifies);
      let session = reload(beginPositionAlphaPostseasonV2(regular, mechanics), mechanics);
      while (session.phase.type === 'POSTSEASON_PLANNING') {
        if (session.world.postseason.type !== 'ACTIVE') throw new Error('Missing bracket');
        const playerFixture = session.world.postseason.rounds[
          session.world.postseason.currentRoundIndex
        ].fixtures.some(({ homeProgramId, awayProgramId }) =>
          [homeProgramId, awayProgramId].includes(session.lifecycle.currentProgramId),
        );
        if (playerFixture) {
          const fourth = session.skills.ownedSkillIds.find(
            (id) => !session.skills.equippedSkillIds.includes(id),
          );
          if (fourth !== undefined)
            session = reload(equipPositionAlphaSkillV2(session, fourth, 3, mechanics), mechanics);
          session = finishGame(
            reload(
              commitPositionAlphaFocusPlanV2(
                session,
                ['action_recovery', 'action_film_study', 'action_recovery'],
                mechanics,
              ),
              mechanics,
            ),
            mechanics,
          );
        } else
          session = reload(advancePositionAlphaPostseasonRoundV2(session, mechanics), mechanics);
      }
      const before = JSON.stringify(session);
      const mutable = JSON.parse(before) as PositionAlphaSessionV2;
      const reviewed = reload(reviewPositionAlphaSeasonV2(mutable, mechanics), mechanics);
      expect(JSON.stringify(mutable)).toBe(before);
      expect(Object.isFrozen(mutable)).toBe(false);
      expect(Object.isFrozen(mutable.careerRng)).toBe(false);
      expect(JSON.stringify(session)).toBe(before);
      expect(reviewPositionAlphaSeasonV2(reviewed, mechanics).ok).toBe(false);
      expect(reload(reviewPositionAlphaSeasonV2(session, mechanics), mechanics)).toEqual(reviewed);
      expect(reviewed.phase).toEqual({ type: 'OFFSEASON_DECISION', seasonIndex: 0 });
      expect(completePositionAlphaCareerV2(reviewed, mechanics).ok).toBe(false);
      const summary = reviewed.lifecycle.completedSeasons.at(-1)!;
      expect(summary.ownedSkillIds).toEqual(session.skills.ownedSkillIds);
      expect(summary.equippedSkillIds).toEqual(session.skills.equippedSkillIds);
      expect(summary.equippedSkillIds).toHaveLength(4);
      expect(summary.gamesPlayed).toBe(12 + session.postseasonHistory.length);
      expect(summary.wins + summary.losses + summary.ties).toBe(summary.gamesPlayed);
      for (const stat of summary.stats.entries)
        expect(stat.value).toBe(
          [...session.weekHistory, ...session.postseasonHistory].reduce(
            (total, game) =>
              total + game.stats.entries.find(({ statId }) => statId === stat.statId)!.value,
            0,
          ),
        );
      const currentGames = [...session.weekHistory, ...session.postseasonHistory].filter(
        (game) => game.model === 'position_alpha_week_summary_v2',
      );
      expect(summary.injuryOutcomeIds).toEqual(
        currentGames.flatMap(({ injury }) =>
          injury.outcome === 'INJURY' && injury.currentInjury !== null
            ? [injury.currentInjury.outcomeId]
            : [],
        ),
      );
      expect(summary.injuryWeeksMissed).toBe(
        currentGames.filter(
          ({ injury }) => injury.availability?.availabilityId === 'injury_availability_out',
        ).length,
      );
      const options = reviewed.lifecycle.offseason!.options;
      expect(options).toHaveLength(4);
      expect(options[0]).toMatchObject({
        kind: 'STAY',
        programId: session.lifecycle.currentProgramId,
      });
      expect(new Set(options.map(({ programId }) => programId)).size).toBe(4);
      expect(reviewed.careerRng.drawCount - session.careerRng.drawCount).toBe(3);
      expect(reviewed.world).toEqual(session.world);
      expect(reviewed.seasonReview!.worldOffseason.worldRngDrawCountBefore).toBe(
        session.world.rng.drawCount,
      );
      expect(reviewed.seasonReview!.worldOffseason.worldRngDrawCountAfter).toBe(
        session.world.rng.drawCount + 96,
      );
      expect(reviewed.worldHistory.detailedSeasons[0]!.postseason).toEqual(
        session.world.postseason,
      );
      expect(reviewed.weekHistory).toEqual(session.weekHistory);
      expect(reviewed.postseasonHistory).toEqual(session.postseasonHistory);
      expect(reviewed.player).toEqual(session.player);
      expect(reviewed.nil).toEqual(session.nil);
      expect(reviewed.academics).toEqual(session.academics);
      expect(reviewed.meta).toBeNull();
      expect(JSON.stringify(reviewed).length).toBeLessThan(1_000_000);
      const packed = packJsonArchiveV1(reviewed);
      expect(packed).not.toBeNull();
      expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(reviewed).length / 2);
      const restored = unpackJsonArchiveV1(JSON.parse(JSON.stringify(packed)));
      if (!restored.ok) throw new Error('Invalid prior-season archive');
      expect(JSON.stringify(restored.value)).toBe(JSON.stringify(reviewed));
      expect(validatePositionAlphaSessionV2(restored.value, mechanics)).toBe(true);
      expect(parsePositionAlphaSessionV2Json(JSON.stringify(restored.value), mechanics)).toEqual(
        reviewed,
      );
      for (const option of options.slice(0, 2)) {
        const mutableReview = JSON.parse(JSON.stringify(reviewed)) as PositionAlphaSessionV2;
        const committed = reload(
          commitPositionAlphaOffseasonV2(mutableReview, option.programId, mechanics),
          mechanics,
        );
        expect(mutableReview).toEqual(reviewed);
        expect(Object.isFrozen(mutableReview.player)).toBe(false);
        expect(commitPositionAlphaOffseasonV2(committed, option.programId, mechanics).ok).toBe(
          false,
        );
        expect(committed.careerRng.drawCount - reviewed.careerRng.drawCount).toBe(35);
        expect(committed.world.rng).toEqual(reviewed.seasonReview!.worldOffseason.rng);
        expect(committed.world.playerProgramId).toBe(option.programId);
        expect(committed.room.programId).toBe(option.programId);
        expect(committed.seasonClock).toEqual({
          model: 'position_alpha_season_clock_v2',
          seasonIndex: 1,
          careerWeekOffset: 14,
        });
        expect(committed.seasonStart!.worldProfiles).toEqual(
          reviewed.seasonReview!.worldOffseason.programs.map(({ after }) => after),
        );
        expect(unpackJsonArchiveV1(committed.seasonStart!.priorSeason)).toEqual({
          ok: true,
          value: reviewed,
        });
        expect(committed.skills).toEqual(reviewed.skills);
        expect(committed.events).toEqual(reviewed.events);
        expect(committed.academics!.state).toEqual({
          ...reviewed.academics!.state,
          termIndex: 2,
          nextCheckpointIndex: mechanics.academics.checkpoints.length,
        });
        expect(committed.nil!.state).toEqual(reviewed.nil!.state);
        expect(committed.lifecycle.completedSeasons).toEqual(reviewed.lifecycle.completedSeasons);
        expect(committed.training.sharedProficiencyUses).toEqual(
          reviewed.training.sharedProficiencyUses,
        );
        expect(committed.player.appearance).toEqual(reviewed.player.appearance);
        for (const invalid of [
          { ...committed, seasonStart: undefined },
          { ...committed, seasonClock: { ...committed.seasonClock, careerWeekOffset: 12 } },
          { ...committed, academics: reviewed.academics },
          {
            ...committed,
            seasonStart: {
              ...committed.seasonStart,
              worldProfiles: mechanics.world.programProfiles,
            },
          },
          {
            ...committed,
            player: { ...committed.player, state: { ...committed.player.state, body: 0 } },
          },
        ])
          expect(validatePositionAlphaSessionV2(invalid, mechanics)).toBe(false);
        const next = finishGame(
          reload(
            commitPositionAlphaFocusPlanV2(
              committed,
              ['action_recovery', 'action_film_study', 'action_recovery'],
              mechanics,
            ),
            mechanics,
          ),
          mechanics,
        );
        const first = next.weekHistory[0]!;
        if (first.model !== 'position_alpha_week_summary_v2')
          throw new Error('Missing current season-two evidence');
        expect(first.source.careerRng).toEqual(committed.careerRng);
        expect(first.source.player).toEqual(committed.player);
        expect(first.injury.source.currentInjury).toEqual(committed.seasonStart!.injury);
        expect(first.academics.checkpoint).toBeNull();
        expect(first.source.seasonClock).toEqual(committed.seasonClock);
        expect(next.seasonStart).toEqual(committed.seasonStart);
        const wire = serializePositionAlphaSessionV2Json(next, mechanics);
        expect(wire).not.toBeNull();
        expect(parsePositionAlphaSessionV2Json(wire!, mechanics)).toEqual(next);
        expect(new TextEncoder().encode(wire!).byteLength).toBeLessThan(1_000_000);
        expect(new TextEncoder().encode(JSON.stringify(next)).byteLength).toBeLessThan(1_000_000);
        expect(validatePositionAlphaSessionV2({ ...next, weekHistory: [] }, mechanics)).toBe(false);
      }
      for (const invalid of [
        { ...reviewed, seasonReview: undefined },
        { ...reviewed, seasonReview: { ...reviewed.seasonReview, extra: true } },
        {
          ...reviewed,
          seasonReview: { ...reviewed.seasonReview, careerRngBefore: reviewed.careerRng },
        },
        {
          ...reviewed,
          lifecycle: {
            ...reviewed.lifecycle,
            completedSeasons: [{ ...summary, equippedSkillIds: [] }],
          },
        },
        {
          ...reviewed,
          lifecycle: {
            ...reviewed.lifecycle,
            completedSeasons: [{ ...summary, ownedSkillIds: [] }],
          },
        },
        { ...reviewed, worldHistory: { ...reviewed.worldHistory, detailedSeasons: [] } },
        {
          ...reviewed,
          lifecycle: {
            ...reviewed.lifecycle,
            offseason: {
              ...reviewed.lifecycle.offseason,
              options: options.map((option, index) =>
                index === 1 ? { ...option, comparisonScore: option.comparisonScore + 1 } : option,
              ),
            },
          },
        },
      ])
        expect(validatePositionAlphaSessionV2(invalid, mechanics)).toBe(false);
    },
  );

  it.each(CASES)(
    '%s preserves the regular-to-postseason source chain and every chosen snap across reload',
    (...position) => {
      const { session: regular, mechanics } = fixture(position, true);
      const before = JSON.stringify(regular);
      let session = reload(beginPositionAlphaPostseasonV2(regular, mechanics), mechanics);
      expect(session.careerRng).toEqual(regular.careerRng);
      expect(session.world.rng).toEqual(regular.world.rng);
      expect(beginPositionAlphaPostseasonV2(session, mechanics).ok).toBe(false);
      expect(JSON.stringify(regular)).toBe(before);
      while (session.phase.type === 'POSTSEASON_PLANNING') {
        if (session.world.postseason.type !== 'ACTIVE') throw new Error('Missing bracket');
        const roundIndex = session.world.postseason.currentRoundIndex;
        const round = session.world.postseason.rounds[roundIndex];
        const fixture = round.fixtures.find(({ homeProgramId, awayProgramId }) =>
          [homeProgramId, awayProgramId].includes(session.lifecycle.currentProgramId),
        );
        if (fixture === undefined) {
          const previous = session;
          session = reload(advancePositionAlphaPostseasonRoundV2(session, mechanics), mechanics);
          expect(session.careerRng).toEqual(previous.careerRng);
          expect(session.player).toEqual(previous.player);
          continue;
        }
        expect(advancePositionAlphaPostseasonRoundV2(session, mechanics).ok).toBe(false);
        const fourthSkill = session.skills.ownedSkillIds.find(
          (id) => !session.skills.equippedSkillIds.includes(id),
        );
        if (fourthSkill !== undefined)
          session = reload(
            equipPositionAlphaSkillV2(session, fourthSkill, 3, mechanics),
            mechanics,
          );
        const worldDrawsBefore = session.world.rng.drawCount;
        session = finishGame(
          reload(
            commitPositionAlphaFocusPlanV2(
              session,
              ['action_recovery', 'action_film_study', 'action_recovery'],
              mechanics,
            ),
            mechanics,
          ),
          mechanics,
        );
        const summary = session.postseasonHistory.at(-1)!;
        if (summary.model !== 'position_alpha_week_summary_v2')
          throw new Error('Missing direct evidence');
        expect(summary.completedGame.game.summary.gameId).toBe(
          `game_${position[0].replace('position_', '')}_alpha_0_${summary.weekIndex}`,
        );
        expect(summary.opponentProgramId).toBe(
          fixture.homeProgramId === session.lifecycle.currentProgramId
            ? fixture.awayProgramId
            : fixture.homeProgramId,
        );
        expect(summary.academics.checkpoint).toBeNull();
        expect(summary.nil.reason).toBe('SEASON_CUTOFF');
        expect(summary.nil.rng).toEqual(summary.nil.rngBefore);
        expect(summary.completedGame.game.summary.opportunityCount).toBe(
          summary.decisionIds.length,
        );
        expect(summary.source.seasonClock).toEqual(session.seasonClock);
        if (fourthSkill !== undefined)
          expect(summary.source.skills.equippedSkillIds[3]).toBe(fourthSkill);
        expect(session.world.rng.drawCount - worldDrawsBefore).toBe(roundIndex === 0 ? 2 : 0);
        expect(
          validatePositionAlphaSessionV2({ ...session, postseasonHistory: [] }, mechanics),
        ).toBe(false);
        expect(
          validatePositionAlphaSessionV2(
            {
              ...session,
              postseasonHistory: session.postseasonHistory.map((entry) =>
                entry === summary ? { ...summary, decisionIds: ['invalid'] } : entry,
              ),
            },
            mechanics,
          ),
        ).toBe(false);
      }
      expect(session.phase.type).toBe('POSTSEASON_REVIEW');
      expect(session.world.postseason.type).toBe('COMPLETE');
      expect(session.weekHistory).toEqual(regular.weekHistory);
      expect(session.postseasonHistory.length).toBeGreaterThanOrEqual(1);
      expect(
        session.postseasonHistory.reduce(
          (total, entry) =>
            total +
            (entry.model === 'position_alpha_week_summary_v2' ? entry.decisionIds.length : 0),
          0,
        ),
      ).toBeGreaterThan(0);
      expect(JSON.stringify(session).length).toBeLessThan(1_000_000);
      expect(advancePositionAlphaPostseasonRoundV2(session, mechanics).ok).toBe(false);
    },
  );

  it.each(CASES)(
    '%s advances both non-qualifying world rounds without player games, rewards or career draws',
    (...position) => {
      const { session: regular, mechanics } = fixture(position, false);
      let session = reload(beginPositionAlphaPostseasonV2(regular, mechanics), mechanics);
      for (const weekIndex of [12, 13]) {
        expect(session.phase).toEqual({ type: 'POSTSEASON_PLANNING', weekIndex });
        expect(
          commitPositionAlphaFocusPlanV2(
            session,
            ['action_recovery', 'action_recovery', 'action_recovery'],
            mechanics,
          ).ok,
        ).toBe(false);
        const previous = session;
        session = reload(advancePositionAlphaPostseasonRoundV2(session, mechanics), mechanics);
        expect(session).toEqual({
          ...previous,
          revision: previous.revision + 1,
          world: session.world,
          phase: session.phase,
        });
        expect(session.world.rng.drawCount - previous.world.rng.drawCount).toBe(
          weekIndex === 12 ? 4 : 2,
        );
      }
      expect(session.phase).toEqual({ type: 'POSTSEASON_REVIEW', seasonIndex: 0 });
      expect(session.postseasonHistory).toEqual([]);
      expect(session.careerRng).toEqual(regular.careerRng);
    },
  );

  it.each(CASES)(
    '%s consumes an existing restriction once in postseason without inventing exams or snaps',
    (...position) => {
      const { session: regular, mechanics } = fixture(position, true, true);
      expect(regular.academics!.state.restrictionGamesRemaining).toBe(1);
      const started = reload(beginPositionAlphaPostseasonV2(regular, mechanics), mechanics);
      const session = finishGame(
        reload(
          commitPositionAlphaFocusPlanV2(
            started,
            ['action_recovery', 'action_film_study', 'action_recovery'],
            mechanics,
          ),
          mechanics,
        ),
        mechanics,
      );
      const summary = session.postseasonHistory[0]!;
      if (summary.model !== 'position_alpha_week_summary_v2') throw new Error('Missing evidence');
      expect(summary.academics.checkpoint).toBeNull();
      expect(summary.academics.gameRestriction).toMatchObject({
        restrictionGamesBefore: 1,
        restrictionGamesAfter: 0,
        weekIndex: 12,
      });
      expect(summary.decisionIds).toEqual([]);
      expect(summary.opportunityCount).toBe(0);
      expect(summary.stats.entries.every(({ value }) => value === 0)).toBe(true);
      expect(summary.completedGame.game.rng).toEqual(summary.nil.rng);
      expect(session.academics!.state.checkpointHistory).toEqual(
        regular.academics!.state.checkpointHistory,
      );
      expect(session.academics!.state.restrictionGamesRemaining).toBe(0);
      expect(
        validatePositionAlphaSessionV2({ ...session, academics: regular.academics }, mechanics),
      ).toBe(false);
    },
  );
});
