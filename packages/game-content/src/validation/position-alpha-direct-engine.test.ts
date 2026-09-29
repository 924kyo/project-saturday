import { describe, expect, it } from 'vitest';
import {
  assessPositionInjuryWeek,
  resolvePositionInjuryWeekChoice,
  resolvePositionAlphaInjuryChoiceV2,
  advanceInjuryDuration,
  isPositionFocusAvailable,
  commitPositionAlphaFocusPlanV2,
  projectPositionAlphaPlanningV2,
  equipPositionAlphaSkillV2,
  choosePositionAlphaSkillV2,
  advancePositionAlphaGameDayV2,
  resolvePositionAlphaGameDaySnapV2,
  settlePositionAlphaGameDayV2,
  migratePositionAlphaSessionV1ToV2,
  parsePositionAlphaSessionV2Json,
  validatePositionAlphaSessionV2,
  type PositionAlphaCommandResultV2,
  type PositionAlphaSessionV2,
  preparePositionAlphaWeek,
  resolvePositionAlphaSnap,
  settlePositionAlphaFootballWeek,
  resolvePositionAlphaEventEffects,
  resolvePositionAlphaEventV2,
  type CompletedPositionGame,
  resolvePositionTrainingAction,
  resolveQbSnap,
  resolveRbSnap,
  resolveCbSnap,
  startPositionAlphaGame,
  type PositionAlphaGameState,
  type PositionAlphaGameContext,
  type PositionFocusId,
  selectQbEvent,
  selectRbEvent,
  selectCbEvent,
  type QbEventContext,
  type RbEventContext,
  type CbEventContext,
  type SkillId,
  derivePositionAlphaBreakthroughProgressV2,
  advancePositionAlphaSeasonClockV2,
  projectHistoricalPositionAlphaSeasonClockV2,
  preparePositionAlphaWeekV2,
  preparePositionAlphaAcademicsV2,
  attemptPositionAlphaNilWeekV2,
  POSITION_STAT_IDS,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  buildShippedPositionAlphaSessionFoundation,
  createShippedPositionAlphaSession,
  chooseShippedPositionAlphaSkill,
  resolveShippedPositionAlphaEvent,
  defaultWrAppearance,
  resolveShippedPositionAlphaWeek,
  injuryOutcomeMechanicsDefinitions,
  injuryTuning,
  resolveShippedPositionAlphaSeason,
  commitShippedPositionAlphaOffseason,
} from '../index.js';
import { positionSkillBuilds } from '../content/position-skill-builds.js';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

function fixture(
  [positionId, archetypeId]: readonly [(typeof CASES)[number][0], (typeof CASES)[number][1]],
  seedSuffix = '',
  needsCurrentSnap = false,
) {
  const identity = {
    displayName: 'Direct Athlete',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer' as const,
    personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  };
  const created = createShippedPositionAlphaSession({
    careerSeed: `direct-${positionId}${seedSuffix}`,
    programId: 'program_ember_peak_polytechnic',
    identity,
  });
  const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity });
  if (!created.ok || mechanics === null) throw new Error('Invalid direct-engine fixture');
  // Snap-interaction cases need a real positive opportunity context even while
  // developmental. Default fixtures still cover truthful zero-snap review.
  const session = needsCurrentSnap
    ? {
        ...created.session,
        lifecycle: {
          ...created.session.lifecycle,
          relationships: created.session.lifecycle.relationships.map((track) =>
            track.actorId === 'DIRECT_COMPETITOR' ? { ...track, value: 100 } : track,
          ) as unknown as typeof created.session.lifecycle.relationships,
        },
      }
    : created.session;
  const gameFixture = mechanics.world.regularSeasonRounds[0]!.fixtures.find(
    ({ homeProgramId, awayProgramId }) =>
      [homeProgramId, awayProgramId].includes(session.lifecycle.currentProgramId),
  )!;
  const actions = mechanics.trainingActions.filter((action) => action.positionId === positionId);
  return { session, mechanics, gameFixture, actions };
}

function reloadCurrent(
  result: PositionAlphaCommandResultV2,
  mechanics: NonNullable<ReturnType<typeof buildShippedPositionAlphaSessionCommandMechanics>>,
): PositionAlphaSessionV2 {
  if (!result.ok) throw new Error(result.reason);
  const restored = parsePositionAlphaSessionV2Json(JSON.stringify(result.session), mechanics);
  expect(restored).toEqual(result.session);
  return restored!;
}

function finishAcademicTestGame(
  initial: PositionAlphaSessionV2,
  mechanics: NonNullable<ReturnType<typeof buildShippedPositionAlphaSessionCommandMechanics>>,
  chooseBreakthrough = true,
): PositionAlphaSessionV2 {
  let session = initial;
  for (let step = 0; session.gameDay.type !== 'POST_GAME'; step += 1) {
    if (step > 20) throw new Error('Game did not finish');
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
    session = reloadCurrent(result, mechanics);
  }
  session = reloadCurrent(settlePositionAlphaGameDayV2(session, mechanics), mechanics);
  expect(settlePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
  if (chooseBreakthrough && session.skills.offeredSkillIds !== null)
    session = reloadCurrent(
      choosePositionAlphaSkillV2(session, session.skills.offeredSkillIds[0], mechanics),
      mechanics,
    );
  return session;
}

describe('shared direct preparation and existing snap engine', () => {
  it.each(CASES)(
    '%s binds first command and saved sources to a non-forgeable season clock',
    (positionId, archetypeId) => {
      const { session: historical, mechanics } = fixture([positionId, archetypeId]);
      const migrated = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      const before = JSON.stringify(migrated);
      expect(Object.hasOwn(migrated, 'seasonClock')).toBe(false);
      const planned = reloadCurrent(
        commitPositionAlphaFocusPlanV2(
          migrated,
          ['action_recovery', 'action_recovery', 'action_recovery'],
          mechanics,
        ),
        mechanics,
      );
      expect(planned.seasonClock).toEqual(projectHistoricalPositionAlphaSeasonClockV2(0));
      expect(planned.careerRng).toEqual(migrated.careerRng);
      expect(JSON.stringify(migrated)).toBe(before);
      expect(
        validatePositionAlphaSessionV2(
          { ...migrated, seasonClock: planned.seasonClock },
          mechanics,
        ),
      ).toBe(false);
      for (const seasonClock of [
        null,
        undefined,
        { ...planned.seasonClock, extra: true },
        advancePositionAlphaSeasonClockV2(planned.seasonClock!),
      ])
        expect(validatePositionAlphaSessionV2({ ...planned, seasonClock }, mechanics)).toBe(false);
      const settled = finishAcademicTestGame(planned, mechanics);
      const latest = settled.weekHistory.at(-1)!;
      if (latest.model !== 'position_alpha_week_summary_v2') throw new Error('Missing source');
      expect(latest.source.seasonClock).toEqual(settled.seasonClock);
      expect(
        validatePositionAlphaSessionV2(
          {
            ...settled,
            weekHistory: [{ ...latest, source: { ...latest.source, seasonClock: undefined } }],
          },
          mechanics,
        ),
      ).toBe(false);
      const legacy = JSON.parse(JSON.stringify(settled)) as PositionAlphaSessionV2;
      delete (legacy as { seasonClock?: unknown }).seasonClock;
      const legacyWeek = legacy.weekHistory[0]!;
      if (legacyWeek.model !== 'position_alpha_week_summary_v2') throw new Error('Missing source');
      delete (legacyWeek.source as { seasonClock?: unknown }).seasonClock;
      expect(validatePositionAlphaSessionV2(legacy, mechanics)).toBe(true);
      const resumed = reloadCurrent(
        commitPositionAlphaFocusPlanV2(
          legacy,
          ['action_recovery', 'action_recovery', 'action_recovery'],
          mechanics,
        ),
        mechanics,
      );
      expect(Object.hasOwn(resumed, 'seasonClock')).toBe(false);
    },
  );

  it.each(CASES)(
    '%s preserves migrated season-two dates and publishes current injury/event/NIL dates once',
    (positionId, archetypeId) => {
      const { session: initial, mechanics, actions } = fixture([positionId, archetypeId]);
      let historical = initial;
      while (
        historical.phase.type === 'WEEK_PLANNING' ||
        historical.events.pending !== null ||
        historical.skills.offeredSkillIds !== null
      ) {
        const result =
          historical.events.pending !== null
            ? resolveShippedPositionAlphaEvent(historical, historical.events.pending.choiceIds[0])
            : historical.skills.offeredSkillIds !== null
              ? chooseShippedPositionAlphaSkill(historical, historical.skills.offeredSkillIds[0])
              : resolveShippedPositionAlphaWeek(historical, actions[0]!.id, 'best_fit');
        if (!result.ok) throw new Error(result.reason);
        historical = result.session;
      }
      const reviewed = resolveShippedPositionAlphaSeason(historical, 'best_fit');
      if (!reviewed.ok) throw new Error(reviewed.reason);
      const committed = commitShippedPositionAlphaOffseason(
        reviewed.session,
        reviewed.session.lifecycle.offseason!.options[1]!.programId,
      );
      if (!committed.ok) throw new Error(committed.reason);
      const migrated = migratePositionAlphaSessionV1ToV2(committed.session, mechanics)!;
      const planned = reloadCurrent(
        commitPositionAlphaFocusPlanV2(
          migrated,
          ['action_recovery', 'action_recovery', 'action_recovery'],
          mechanics,
        ),
        mechanics,
      );
      expect(planned.seasonClock).toEqual(projectHistoricalPositionAlphaSeasonClockV2(1));
      expect(planned.lifecycle.currentProgramId).toBe(committed.session.lifecycle.currentProgramId);
      const settled = finishAcademicTestGame(planned, mechanics);
      const week = settled.weekHistory[0]!;
      if (week.model !== 'position_alpha_week_summary_v2') throw new Error('Missing source');
      expect(week.event.context.weekIndex).toBe(12);
      expect(week.nil.careerWeekIndex).toBe(12);
      expect(week.injury.source.weekIndex).toBe(12);
      expect(week.academics.before.activatedAtCareerWeekIndex).toBe(12);
      // Gauge evidence labels the completed boundary, unlike action-time dates.
      expect(week.breakthrough.progress.weekIndex).toBe(13);
      expect(settled.lifecycle.completedSeasons).toEqual(migrated.lifecycle.completedSeasons);
      expect(settled.worldHistory).toEqual(migrated.worldHistory);
      expect(settled.meta).toEqual(migrated.meta);
    },
  );

  it.each(CASES)(
    '%s uses explicit local NIL cutoff and global academic activation after a current bracket',
    (positionId, archetypeId) => {
      const { session: historical, mechanics } = fixture([positionId, archetypeId]);
      const migrated = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      const seasonClock = advancePositionAlphaSeasonClockV2(
        projectHistoricalPositionAlphaSeasonClockV2(0)!,
      )!;
      const source = {
        ...migrated,
        seasonClock,
        lifecycle: { ...migrated.lifecycle, activeSeasonIndex: 1 },
        previousStats: {
          model: 'position_stat_line_v1' as const,
          positionId,
          entries: POSITION_STAT_IDS[positionId].map((statId) => ({ statId, value: 0 })),
        },
      };
      const before = JSON.stringify(source);
      expect(
        preparePositionAlphaAcademicsV2(source, source.player.state.gpa, 0, mechanics.academics)
          ?.before.activatedAtCareerWeekIndex,
      ).toBe(14);
      expect(
        preparePositionAlphaWeekV2(
          source,
          ['action_recovery', 'action_recovery', 'action_recovery'],
          null,
          mechanics,
          0,
        ),
      ).not.toBeNull();
      for (const localWeek of [0, 7, 8, 9, 10, 11, 12, 13]) {
        const attempt = attemptPositionAlphaNilWeekV2(source, 14 + localWeek, mechanics.nil);
        expect(attempt).not.toBeNull();
        expect(attempt!.careerWeekIndex).toBe(14 + localWeek);
        expect(attempt!.reason === 'SEASON_CUTOFF').toBe(localWeek >= 9);
        if (localWeek >= 9) {
          expect(attempt!.selection).toBeNull();
          expect(attempt!.rng).toEqual(source.careerRng);
        }
      }
      for (const week of [13, 28, NaN, 14.5])
        expect(attemptPositionAlphaNilWeekV2(source, week, mechanics.nil)).toBeNull();
      expect(JSON.stringify(source)).toBe(before);
      expect(Object.isFrozen(source)).toBe(false);
      // Pure context support is not authority to invent a persisted offseason boundary.
      expect(validatePositionAlphaSessionV2(source, mechanics)).toBe(false);
    },
  );

  it.each(CASES)(
    '%s saves weighted breakthroughs and spends the threshold once before zero-draw choice',
    (positionId, archetypeId) => {
      const { session: historical, mechanics } = fixture([positionId, archetypeId]);
      const migrated = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      const initial = { ...migrated, skills: { ...migrated.skills, breakthroughGauge: 99 } };
      const planned = reloadCurrent(
        commitPositionAlphaFocusPlanV2(
          initial,
          ['action_recovery', 'action_film_study', 'action_study_hall'],
          mechanics,
        ),
        mechanics,
      );
      const offered = finishAcademicTestGame(planned, mechanics, false);
      const last = offered.weekHistory.at(-1)!;
      if (last.model !== 'position_alpha_week_summary_v2')
        throw new Error('Missing breakthrough week');
      const evidence = last.breakthrough;
      expect(evidence.progress.triggeredOffer).toBe(true);
      expect(evidence.progress.progressBefore).toBe(99);
      expect(evidence.progress.progressAfter).toBe(99 + evidence.progress.pointsEarned - 100);
      expect(offered.skills.breakthroughGauge).toBe(evidence.progress.progressAfter);
      expect(offered.skills.offeredSkillIds).toEqual(evidence.offer!.offeredSkillIds);
      expect(evidence.offer!.rngBefore).toEqual(last.completedGame.game.rng);
      expect(offered.careerRng).toEqual(evidence.rng);
      expect(evidence.rng.drawCount - last.completedGame.game.rng.drawCount).toBe(3);
      expect(
        commitPositionAlphaFocusPlanV2(
          offered,
          ['action_recovery', 'action_recovery', 'action_recovery'],
          mechanics,
        ).ok,
      ).toBe(false);
      const selected = offered.skills.offeredSkillIds![0];
      const chosen = reloadCurrent(
        choosePositionAlphaSkillV2(offered, selected, mechanics),
        mechanics,
      );
      expect(chosen.skills.breakthroughGauge).toBe(offered.skills.breakthroughGauge);
      expect(chosen.skills.breakthroughHistory.at(-1)).toEqual({ skillId: selected, weekIndex: 0 });
      expect(chosen.careerRng).toEqual(offered.careerRng);
      expect(chosen.world).toEqual(offered.world);
      expect(choosePositionAlphaSkillV2(chosen, selected, mechanics).ok).toBe(false);
      for (const corrupted of [
        {
          ...offered,
          skills: { ...offered.skills, breakthroughGauge: offered.skills.breakthroughGauge + 1 },
        },
        {
          ...offered,
          careerRng: { ...offered.careerRng, drawCount: offered.careerRng.drawCount + 1 },
        },
        {
          ...offered,
          weekHistory: [
            {
              ...last,
              breakthrough: {
                ...evidence,
                offer: {
                  ...evidence.offer!,
                  candidates: evidence.offer!.candidates.map((candidate, index) =>
                    index === 0 ? { ...candidate, weight: candidate.weight + 1 } : candidate,
                  ),
                },
              },
            },
          ],
        },
        {
          ...chosen,
          skills: { ...chosen.skills, breakthroughHistory: [{ skillId: selected, weekIndex: 1 }] },
        },
      ])
        expect(validatePositionAlphaSessionV2(corrupted, mechanics)).toBe(false);
      const following = finishAcademicTestGame(
        reloadCurrent(
          commitPositionAlphaFocusPlanV2(
            chosen,
            ['action_recovery', 'action_film_study', 'action_study_hall'],
            mechanics,
          ),
          mechanics,
        ),
        mechanics,
      );
      const second = following.weekHistory.at(-1)!;
      if (second.model !== 'position_alpha_week_summary_v2') throw new Error('Missing next week');
      expect(second.source.skills.ownedSkillIds).toEqual(chosen.skills.ownedSkillIds);
      expect(second.source.skills.breakthroughGauge).toBe(chosen.skills.breakthroughGauge);
      expect(second.source.careerRng).toEqual(chosen.careerRng);
    },
  );

  it.each(CASES)(
    '%s banks an exhausted pool without erasing migrated surplus or adding draws',
    (positionId, archetypeId) => {
      const { session: historical, mechanics } = fixture([positionId, archetypeId]);
      const ownedSkillIds = mechanics.skillIds.slice(0, -2);
      const legacy = {
        ...historical,
        skills: {
          ...historical.skills,
          breakthroughGauge: 160,
          ownedSkillIds,
          breakthroughHistory: ownedSkillIds.map((skillId) => ({ skillId, weekIndex: 0 })),
        },
      };
      const migrated = migratePositionAlphaSessionV1ToV2(legacy, mechanics)!;
      expect(migrated.skills.breakthroughGauge).toBe(160);
      const settled = finishAcademicTestGame(
        reloadCurrent(
          commitPositionAlphaFocusPlanV2(
            migrated,
            ['action_recovery', 'action_recovery', 'action_recovery'],
            mechanics,
          ),
          mechanics,
        ),
        mechanics,
      );
      const last = settled.weekHistory.at(-1)!;
      if (last.model !== 'position_alpha_week_summary_v2') throw new Error('Missing banked week');
      expect(last.breakthrough.progress.triggeredOffer).toBe(false);
      expect(last.breakthrough.progress.progressAfter).toBe(160);
      expect(last.breakthrough.offer!.candidates).toHaveLength(2);
      expect(last.breakthrough.offer!.offeredSkillIds).toBeNull();
      expect(last.breakthrough.rng).toEqual(last.completedGame.game.rng);
      expect(settled.skills.breakthroughGauge).toBe(160);
      expect(settled.skills.ownedSkillIds).toEqual(ownedSkillIds);
    },
  );

  it.each(CASES)(
    '%s maps real common-focus and completed football evidence into six-source progress',
    (positionId, archetypeId) => {
      const { session: historical, mechanics } = fixture([positionId, archetypeId]);
      const initial = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      const planned = reloadCurrent(
        commitPositionAlphaFocusPlanV2(
          initial,
          ['action_study_hall', 'action_film_study', 'action_recovery'],
          mechanics,
        ),
        mechanics,
      );
      if (planned.gameDay.type === 'IDLE') throw new Error('Missing preparation');
      const preparation = planned.gameDay.preparation;
      const settled = finishAcademicTestGame(planned, mechanics);
      const last = settled.weekHistory.at(-1)!;
      if (last.model !== 'position_alpha_week_summary_v2')
        throw new Error('Missing completed football');
      const before = JSON.stringify({ preparation, completed: last.completedGame });
      const progress = derivePositionAlphaBreakthroughProgressV2(
        {
          careerWeekIndex: 0,
          progressBefore: 95,
          rankBefore: initial.room.projection.rank,
          practiceTrustBefore: initial.player.state.coachTrust,
        },
        preparation,
        last.completedGame,
      );
      expect(progress.weekIndex).toBe(1);
      expect(progress.progressBefore).toBe(95);
      expect(progress.triggeredOffer).toBe(true);
      expect(progress.pointsEarned).toBeLessThanOrEqual(60);
      expect(progress.progressAfter).toBe(95 + progress.pointsEarned - 100);
      expect(
        progress.sources.some(
          ({ sourceId, points }) => sourceId === 'breakthrough_source_life' && points > 0,
        ),
      ).toBe(true);
      expect(
        progress.sources.some(({ sourceId }) => sourceId === 'breakthrough_source_development'),
      ).toBe(false);
      const summary = last.completedGame.game.summary;
      const gamePoints =
        summary.opportunityCount === 0
          ? 6
          : Math.min(
              24,
              (summary.gradeScore >= 85
                ? 18
                : summary.gradeScore >= 70
                  ? 14
                  : summary.gradeScore >= 55
                    ? 10
                    : summary.gradeScore >= 40
                      ? 6
                      : 4) + Math.min(6, summary.opportunityCount),
            );
      expect(
        progress.sources.find(({ sourceId }) => sourceId === 'breakthrough_source_game_day')
          ?.points,
      ).toBe(gamePoints);
      expect(JSON.stringify({ preparation, completed: last.completedGame })).toBe(before);
      expect(JSON.parse(JSON.stringify(progress))).toEqual(progress);
    },
  );

  it.each(CASES)(
    '%s saves fourth-slot positive relationship gains without repeating trust at settlement',
    (positionId, archetypeId) => {
      const { session: historical, mechanics, actions } = fixture([positionId, archetypeId]);
      const migrated = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      const skillId = positionSkillBuilds.find(
        (entry) => entry.positionId === positionId && entry.buildId === 'campus',
      )!.skillId;
      const equipped: PositionAlphaSessionV2 = {
        ...migrated,
        skills: {
          ...migrated.skills,
          ownedSkillIds: [skillId],
          equippedSkillIds: [null, null, null, skillId],
          breakthroughHistory: [{ weekIndex: 0, skillId }],
        },
      };
      // RB/CB include an authored competitor loss; QB supplies a zero track.
      const action =
        actions.find((entry) =>
          mechanics.lifecycle.relationshipActionEffects[positionId]![entry.id]!.includes(-1),
        ) ?? actions[0]!;
      const plan = [action.id, action.id, 'action_film_study'];
      const plain = reloadCurrent(
        commitPositionAlphaFocusPlanV2(migrated, plan, mechanics),
        mechanics,
      );
      const before = JSON.stringify(equipped);
      const boosted = reloadCurrent(
        commitPositionAlphaFocusPlanV2(equipped, plan, mechanics),
        mechanics,
      );
      if (plain.gameDay.type === 'IDLE' || boosted.gameDay.type === 'IDLE')
        throw new Error('Missing relationship preparation');
      const preparation = boosted.gameDay.preparation;
      expect(preparation.relationshipSkillGain.multiplierPermille).toBe(1200);
      expect(preparation.relationshipSkillGain.appliedSkillEffects).toHaveLength(1);
      expect(preparation.relationshipSkillGain.appliedSkillEffects[0]).toMatchObject({
        skillId,
        slotIndex: 3,
        hookId: 'life_hook_relationship_gain_multiplier',
        valueMilli: 1200,
      });
      expect(preparation.relationships.changes.map(({ requestedDelta }) => requestedDelta)).toEqual(
        plain.gameDay.preparation.relationships.changes.map(({ requestedDelta }) =>
          requestedDelta > 0 ? Math.ceil(requestedDelta * 1.2) : requestedDelta,
        ),
      );
      expect(boosted.careerRng).toEqual(equipped.careerRng);
      expect(boosted.world).toEqual(equipped.world);
      expect(boosted.player).toEqual(equipped.player);
      expect(JSON.stringify(equipped)).toBe(before);
      expect(
        validatePositionAlphaSessionV2(
          {
            ...boosted,
            gameDay: {
              ...boosted.gameDay,
              preparation: {
                ...preparation,
                relationshipSkillGain: {
                  ...preparation.relationshipSkillGain,
                  multiplierPermille: 1000,
                },
              },
            },
          },
          mechanics,
        ),
      ).toBe(false);
      const settled = finishAcademicTestGame(boosted, mechanics);
      const last = settled.weekHistory.at(-1)!;
      if (last.model !== 'position_alpha_week_summary_v2')
        throw new Error('Missing current history');
      expect(last.relationshipSkillGain).toEqual(preparation.relationshipSkillGain);
      expect(last.relationships).toEqual(preparation.relationships);
      expect(settled.player.state.coachTrust).toBe(
        last.completedGame.game.nextPlayer.state.coachTrust,
      );
      expect(
        validatePositionAlphaSessionV2(
          {
            ...settled,
            weekHistory: [
              {
                ...last,
                relationshipSkillGain: {
                  ...last.relationshipSkillGain,
                  appliedSkillEffects: [],
                },
              },
            ],
          },
          mechanics,
        ),
      ).toBe(false);
    },
  );

  it.each(CASES)(
    '%s persists four-slot weekly build effects and applies passive recovery once',
    (positionId, archetypeId) => {
      const {
        session: historical,
        mechanics,
        actions,
      } = fixture([positionId, archetypeId], '-weekly-build', true);
      const migrated = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      const ids = ['film', 'repetition', 'body', 'campus'].map(
        (buildId) =>
          positionSkillBuilds.find(
            (entry) => entry.positionId === positionId && entry.buildId === buildId,
          )!.skillId,
      );
      const state = { ...migrated.player.state, body: 60, preparation: 50, gpa: 2.25 };
      const session: PositionAlphaSessionV2 = {
        ...migrated,
        player: { ...migrated.player, state },
        lifecycle: { ...migrated.lifecycle, playerState: state },
        training: {
          ...migrated.training,
          state: { ...migrated.training.state, body: 60, preparation: 50 },
        },
        skills: {
          ...migrated.skills,
          ownedSkillIds: ids,
          equippedSkillIds: [ids[0]!, ids[1]!, ids[2]!, ids[3]!],
          breakthroughHistory: ids.map((skillId) => ({ weekIndex: 0, skillId })),
        },
      };
      expect(validatePositionAlphaSessionV2(session, mechanics)).toBe(true);
      const before = JSON.stringify(session);
      const planned = reloadCurrent(
        commitPositionAlphaFocusPlanV2(
          session,
          [actions[0]!.id, actions[0]!.id, 'action_study_hall'],
          mechanics,
        ),
        mechanics,
      );
      if (planned.gameDay.type === 'IDLE') throw new Error('Missing prepared build');
      const evidence = planned.gameDay.preparation.trainingEvidence;
      expect(evidence[0].skillEffects!.aggregates.xpMultiplierPermille).toBe(1000);
      expect(evidence[0].skillEffects!.aggregates.bodyCostMultiplierPermille).toBe(900);
      expect(evidence[1].skillEffects!.aggregates.xpMultiplierPermille).toBe(1250);
      expect(evidence[1].skillEffects!.aggregates.bodyCostMultiplierPermille).toBe(1000);
      expect(evidence[2].skillEffects!.aggregates.gpaDeltaMilli).toBe(100);
      expect(evidence[2].skillEffects!.appliedSkillEffects[0]!.slotIndex).toBe(3);
      expect(evidence[2].attributeXp).toEqual([]);
      expect(planned.careerRng).toEqual(session.careerRng);
      const tampered = structuredClone(planned);
      if (tampered.gameDay.type === 'IDLE') throw new Error('Missing prepared build');
      const altered = {
        ...tampered,
        gameDay: {
          ...tampered.gameDay,
          preparation: {
            ...tampered.gameDay.preparation,
            trainingEvidence: evidence.map((entry, index) =>
              index === 1
                ? {
                    ...entry,
                    skillEffects: {
                      ...entry.skillEffects,
                      aggregates: { ...entry.skillEffects!.aggregates, xpMultiplierPermille: 1000 },
                    },
                  }
                : entry,
            ),
          },
        },
      };
      expect(validatePositionAlphaSessionV2(altered, mechanics)).toBe(false);
      const settled = finishAcademicTestGame(planned, mechanics);
      const last = settled.weekHistory.at(-1)!;
      if (last.model !== 'position_alpha_week_summary_v2')
        throw new Error('Missing current build history');
      expect(last.trainingEvidence).toEqual(evidence);
      expect(last.rollover.requestedBodyRecovery).toBe(12);
      expect(last.rollover.passiveRecovery.appliedSkillEffects).toEqual([
        {
          type: 'passive_body_recovery_flat',
          skillId: ids[2],
          slotIndex: 2,
          effectIndex: 1,
          delta: 2,
        },
      ]);
      expect(settled.player.state.body).toBe(last.rollover.bodyAfter);
      expect(last.source.skills.equippedSkillIds).toEqual(ids);
      expect(JSON.stringify(session)).toBe(before);
      expect(
        validatePositionAlphaSessionV2(
          {
            ...settled,
            weekHistory: [{ ...last, rollover: { ...last.rollover, requestedBodyRecovery: 10 } }],
          },
          mechanics,
        ),
      ).toBe(false);
    },
  );

  it.each(CASES)(
    '%s consumes relationship opportunity context in real engines without exceeding any role',
    (positionId, archetypeId) => {
      const { session, mechanics, gameFixture } = fixture([positionId, archetypeId]);
      for (const [minimum, maximum] of [
        [0, 1],
        [1, 2],
        [2, 4],
        [3, 5],
      ]) {
        const context = {
          ...session,
          room: {
            ...session.room,
            projection: {
              ...session.room.projection,
              interactiveSnapMinimum: minimum!,
              interactiveSnapMaximum: maximum!,
            },
          },
        };
        const before = JSON.stringify(context);
        for (const modifier of [-100, -50, -49, 0, 49, 50, 100]) {
          const expected = Math.min(
            maximum!,
            Math.max(
              minimum!,
              Math.floor((minimum! + maximum!) / 2) +
                (modifier <= -50 ? -1 : modifier >= 50 ? 1 : 0),
            ),
          );
          let current = startPositionAlphaGame(
            { ...context, relationshipOpportunitySnapBonusPermille: modifier },
            gameFixture,
            0,
            mechanics,
          )!;
          expect(current.game.rng).toEqual(session.careerRng);
          while (current.game.type === 'ACTIVE')
            current = resolvePositionAlphaSnap(current, current.game.pendingSnap.decisionIds[0])!;
          expect(current.game.summary.opportunityCount).toBe(expected);
          expect(current.game.rng.drawCount - session.careerRng.drawCount).toBe(expected * 6);
          if (expected === 0) {
            expect(current.game.growth.attributeXp).toHaveLength(0);
            expect(current.game.summary.participationFeedbackId).toMatch(/review/);
          }
          const restricted = startPositionAlphaGame(
            { ...context, relationshipOpportunitySnapBonusPermille: modifier },
            gameFixture,
            0,
            mechanics,
            null,
            0,
          )!;
          expect(restricted.game.type).toBe('COMPLETE');
          expect(restricted.game.rng).toEqual(session.careerRng);
        }
        let historical = startPositionAlphaGame(context, gameFixture, 0, mechanics)!;
        while (historical.game.type === 'ACTIVE')
          historical = resolvePositionAlphaSnap(
            historical,
            historical.game.pendingSnap.decisionIds[0],
          )!;
        expect(historical.game.summary.opportunityCount).toBe(maximum);
        for (const modifier of [-101, 101, 0.5, NaN, undefined])
          expect(
            startPositionAlphaGame(
              {
                ...context,
                relationshipOpportunitySnapBonusPermille: modifier,
              } as unknown as PositionAlphaGameContext,
              gameFixture,
              0,
              mechanics,
            ),
          ).toBeNull();
        expect(JSON.stringify(context)).toBe(before);
      }
    },
  );

  it.each(CASES)(
    '%s saves opportunity provenance for both injury workload and actual football',
    (positionId, archetypeId) => {
      const { session: historical, mechanics } = fixture([positionId, archetypeId]);
      for (const competitorValue of [25, 50, 75]) {
        const initial = {
          ...historical,
          lifecycle: {
            ...historical.lifecycle,
            relationships: historical.lifecycle.relationships.map((track) =>
              track.actorId === 'DIRECT_COMPETITOR' ? { ...track, value: competitorValue } : track,
            ) as unknown as typeof historical.lifecycle.relationships,
          },
        };
        const neutral = migratePositionAlphaSessionV1ToV2(initial, mechanics)!;
        const prepared = reloadCurrent(
          commitPositionAlphaFocusPlanV2(
            neutral,
            ['action_recovery', 'action_recovery', 'action_recovery'],
            mechanics,
          ),
          mechanics,
        );
        const day = prepared.gameDay;
        if (day.type === 'IDLE') throw new Error('Missing preparation');
        const opportunity = day.preparation.opportunity;
        expect(opportunity.relationshipBonusPermille).toBe((competitorValue - 50) * 2);
        expect(prepared.careerRng).toEqual(neutral.careerRng);
        expect(prepared.room).toEqual(neutral.room);
        expect(
          validatePositionAlphaSessionV2(
            {
              ...prepared,
              gameDay: {
                ...day,
                preparation: {
                  ...day.preparation,
                  opportunity: { ...opportunity, baseline: opportunity.baseline + 1 },
                },
              },
            },
            mechanics,
          ),
        ).toBe(false);
        const settled = finishAcademicTestGame(prepared, mechanics);
        const last = settled.weekHistory.at(-1)!;
        if (last.model !== 'position_alpha_week_summary_v2')
          throw new Error('Missing current summary');
        expect(last.injury.source.workloadSnapPermille).toBe(
          opportunity.projectedOpportunities * 180,
        );
        expect(last.opportunityCount).toBe(
          Math.min(
            opportunity.projectedOpportunities,
            last.injury.availability!.opportunityCap,
            last.academics.maximumOpportunities,
          ),
        );
        expect(last.completedGame.game.rng.drawCount - last.nil.rng.drawCount).toBe(
          last.opportunityCount * 6,
        );
        expect(settled.world.rng.drawCount - neutral.world.rng.drawCount).toBe(30);
      }
    },
  );

  it.each(CASES)(
    '%s saves canonical event selection, requires its choice, and binds effects to football history',
    (positionId, archetypeId) => {
      const covered = new Set<string>();
      for (let trial = 0; trial < 24 && covered.size < 2; trial += 1) {
        const { session: initial, mechanics } = fixture(
          [positionId, archetypeId],
          `-event-${trial}`,
          true,
        );
        const neutral = migratePositionAlphaSessionV1ToV2(initial, mechanics)!;
        const catalog =
          positionId === 'position_qb'
            ? mechanics.qb.skills
            : positionId === 'position_rb'
              ? mechanics.rb.skills
              : mechanics.cb.skills;
        const eventSkillId = catalog.find(({ effects }) =>
          effects.some(({ type }) => type.endsWith('event_positive_multiplier_permille')),
        )!.id as SkillId;
        const migrated: PositionAlphaSessionV2 = {
          ...neutral,
          skills: {
            ...neutral.skills,
            ownedSkillIds: [eventSkillId],
            equippedSkillIds: [null, null, null, eventSkillId],
            breakthroughHistory: [{ weekIndex: 0, skillId: eventSkillId }],
          },
        };
        const planned = reloadCurrent(
          commitPositionAlphaFocusPlanV2(
            migrated,
            ['action_recovery', 'action_film_study', 'action_study_hall'],
            mechanics,
          ),
          mechanics,
        );
        const sourceJson = JSON.stringify(planned);
        let current = reloadCurrent(advancePositionAlphaGameDayV2(planned, mechanics), mechanics);
        const day = current.gameDay;
        if (day.type === 'IDLE' || day.event === null) throw new Error('Missing event attempt');
        const event = day.event;
        const selected = event.afterEvents.pending !== null;
        const branch = selected ? 'selected' : 'chance_miss';
        if (covered.has(branch)) continue;
        covered.add(branch);
        const raw =
          positionId === 'position_qb'
            ? selectQbEvent(
                event.context as QbEventContext,
                mechanics.qb.events,
                450,
                planned.careerRng,
              )
            : positionId === 'position_rb'
              ? selectRbEvent(
                  event.context as RbEventContext,
                  mechanics.rb.events,
                  450,
                  planned.careerRng,
                )
              : selectCbEvent(
                  event.context as CbEventContext,
                  mechanics.cb.events,
                  450,
                  planned.careerRng,
                );
        expect(event.selection).toEqual(raw.evidence);
        expect(event.rng).toEqual(raw.rng);
        expect(
          advancePositionAlphaGameDayV2(planned, {
            ...mechanics,
            qb: { ...mechanics.qb, events: [...mechanics.qb.events].reverse() },
            rb: { ...mechanics.rb, events: [...mechanics.rb.events].reverse() },
            cb: { ...mechanics.cb, events: [...mechanics.cb.events].reverse() },
          }),
        ).toEqual({ ok: true, session: current });
        expect(event.selection.rngDrawCountAfter - event.selection.rngDrawCountBefore).toBe(
          selected ? 2 : 1,
        );
        expect(event.context.weekIndex).toBe(0);
        expect(event.context.gpaMilli).toBe(Math.round(day.preparation.player.state.gpa * 1000));
        expect(event.context.contextTags).toEqual([...new Set(event.context.contextTags)].sort());
        expect(current.world).toEqual(planned.world);
        expect(current.player).toEqual(planned.player);
        expect(JSON.stringify(planned)).toBe(sourceJson);
        for (const edited of [
          { ...event, extra: true },
          { ...event, choiceIds: [...event.choiceIds, 'missing'] },
          { ...event, context: { ...event.context, weekIndex: 1 } },
          {
            ...event,
            selection: { ...event.selection, totalWeight: event.selection.totalWeight + 1 },
          },
          { ...event, rng: { ...event.rng, drawCount: event.rng.drawCount + 1 } },
          {
            ...event,
            afterState: { ...event.afterState, confidence: event.afterState.confidence + 1 },
          },
        ])
          expect(
            validatePositionAlphaSessionV2(
              { ...current, gameDay: { ...day, event: edited } },
              mechanics,
            ),
          ).toBe(false);
        if (selected) {
          expect(day.type).toBe('EVENT_CHOICE');
          expect(day.injury).toBeNull();
          expect(advancePositionAlphaGameDayV2(current, mechanics).ok).toBe(false);
          expect(settlePositionAlphaGameDayV2(current, mechanics).ok).toBe(false);
          expect(resolvePositionAlphaEventV2(current, 'missing', mechanics).ok).toBe(false);
          const before = JSON.stringify(current);
          const caller = current;
          const choiceId = event.choiceIds[0]!;
          const effects = resolvePositionAlphaEventEffects(
            { ...planned, ...day.preparation, events: event.afterEvents },
            choiceId,
            mechanics,
          )!;
          const resolved = resolvePositionAlphaEventV2(current, choiceId, mechanics);
          expect(
            resolvePositionAlphaEventV2(
              JSON.parse(before) as PositionAlphaSessionV2,
              choiceId,
              mechanics,
            ),
          ).toEqual(resolved);
          current = reloadCurrent(resolved, mechanics);
          expect(JSON.stringify(caller)).toBe(before);
          expect(current.gameDay.type).toBe('EVENT_RESOLVED');
          if (current.gameDay.type === 'IDLE' || current.gameDay.event === null)
            throw new Error('Missing resolution');
          expect(current.gameDay.event.afterState).toEqual(effects.player.state);
          expect(current.gameDay.event.afterEvents).toEqual(effects.events);
          expect(current.gameDay.event.resolution?.choiceId).toBe(choiceId);
          expect(current.gameDay.event.resolution?.appliedSkillIds).toContain(eventSkillId);
          expect(current.gameDay.event.resolution!.positiveMultiplierPermille).toBeGreaterThan(
            1000,
          );
          expect(current.careerRng).toEqual(event.rng);
          expect(resolvePositionAlphaEventV2(current, choiceId, mechanics).ok).toBe(false);
          current = reloadCurrent(advancePositionAlphaGameDayV2(current, mechanics), mechanics);
        } else {
          expect(['GAME_PREVIEW', 'INJURY_CHOICE']).toContain(day.type);
          expect(event.choiceIds).toEqual([]);
          expect(event.resolution).toBeNull();
          expect(resolvePositionAlphaEventV2(current, 'missing', mechanics).ok).toBe(false);
        }
        if (current.gameDay.type === 'IDLE') throw new Error('Expected injury boundary');
        expect(current.gameDay.injury!.source.rng).toEqual(event.rng);
        expect(current.gameDay.injury!.source.body).toBe(current.gameDay.event!.afterState.body);
        if (current.gameDay.type === 'INJURY_CHOICE')
          current = reloadCurrent(
            resolvePositionAlphaInjuryChoiceV2(current, 'injury_choice_play_limited', mechanics),
            mechanics,
          );
        current = reloadCurrent(advancePositionAlphaGameDayV2(current, mechanics), mechanics);
        if (current.gameDay.type !== 'ACTIVE_SNAP' || current.gameDay.game?.game.type !== 'ACTIVE')
          throw new Error('Expected active football with event effects');
        expect(current.gameDay.game.game.input.eventModifiers.clueBonus).toBe(
          current.gameDay.event!.afterEvents.nextGameModifiers.clueBonus,
        );
        expect(current.gameDay.game.game.input.eventModifiers.decisionScoreFlat).toBe(
          current.gameDay.event!.afterEvents.nextGameModifiers.decisionScoreFlat,
        );
        const settled = finishAcademicTestGame(current, mechanics);
        const history = settled.weekHistory[0]!;
        if (history.model !== 'position_alpha_week_summary_v2')
          throw new Error('Missing rich history');
        expect(history.source.previousStats.entries.every(({ value }) => value === 0)).toBe(true);
        expect(history.event.selection).toEqual(event.selection);
        expect(settled.events.history.length).toBe(selected ? 1 : 0);
        expect(settled.events.nextGameModifiers).toEqual({
          clueBonus: 0,
          decisionScoreFlat: 0,
          exposureReductionPermille: 0,
        });
        const editedSource = {
          ...history.source,
          previousStats: {
            ...history.source.previousStats,
            entries: history.source.previousStats.entries.map((entry, index) =>
              index === 0 ? { ...entry, value: entry.value + 1 } : entry,
            ),
          },
        };
        expect(
          validatePositionAlphaSessionV2(
            { ...settled, weekHistory: [{ ...history, source: editedSource }] },
            mechanics,
          ),
        ).toBe(false);
        expect(
          validatePositionAlphaSessionV2(
            { ...settled, events: { ...settled.events, history: [], recentEvents: [] } },
            mechanics,
          ),
        ).toBe(!selected);
      }
      expect(covered).toEqual(new Set(['selected', 'chance_miss']));
    },
  );
  it.each(CASES)(
    '%s persists a zero-draw empty eligible pool without an event acknowledgement',
    (positionId, archetypeId) => {
      const { session: initial, mechanics: base } = fixture([positionId, archetypeId]);
      const requirements = { requiredContextTags: ['test_unavailable_context'] };
      const mechanics = {
        ...base,
        qb: { ...base.qb, events: base.qb.events.map((event) => ({ ...event, requirements })) },
        rb: { ...base.rb, events: base.rb.events.map((event) => ({ ...event, requirements })) },
        cb: { ...base.cb, events: base.cb.events.map((event) => ({ ...event, requirements })) },
      };
      const migrated = migratePositionAlphaSessionV1ToV2(initial, mechanics)!;
      const planned = reloadCurrent(
        commitPositionAlphaFocusPlanV2(
          migrated,
          ['action_recovery', 'action_recovery', 'action_recovery'],
          mechanics,
        ),
        mechanics,
      );
      const caller = JSON.parse(JSON.stringify(planned)) as PositionAlphaSessionV2;
      const before = JSON.stringify(caller);
      const reviewed = reloadCurrent(advancePositionAlphaGameDayV2(caller, mechanics), mechanics);
      expect(JSON.stringify(caller)).toBe(before);
      expect(Object.isFrozen(caller.careerRng)).toBe(false);
      expect(Object.isFrozen(caller.events.recentEvents)).toBe(false);
      if (reviewed.gameDay.type === 'IDLE' || reviewed.gameDay.event === null)
        throw new Error('Missing no-event record');
      const event = reviewed.gameDay.event;
      expect(event.selection).toEqual({
        eligibleEventIds: [],
        chancePermille: 450,
        totalWeight: 0,
        rngDrawCountBefore: planned.careerRng.drawCount,
        rngDrawCountAfter: planned.careerRng.drawCount,
      });
      expect(event.rng).toEqual(planned.careerRng);
      expect(event.afterState).toEqual(reviewed.gameDay.preparation.player.state);
      expect(event.afterEvents).toEqual(planned.events);
      expect(['GAME_PREVIEW', 'INJURY_CHOICE']).toContain(reviewed.gameDay.type);
      expect(resolvePositionAlphaEventV2(reviewed, 'missing', mechanics).ok).toBe(false);
      expect(reviewed.gameDay.injury!.source.rng).toEqual(event.rng);
      const settled = finishAcademicTestGame(reviewed, mechanics);
      expect(settled.events.history).toEqual([]);
    },
  );
  it.each(CASES)(
    '%s validates publication without freezing the caller or overflowing revision',
    (positionId, archetypeId) => {
      const { session: initial, mechanics } = fixture([positionId, archetypeId]);
      const migrated = migratePositionAlphaSessionV1ToV2(initial, mechanics)!;
      const source = JSON.parse(JSON.stringify(migrated)) as PositionAlphaSessionV2;
      const before = JSON.stringify(source);
      const result = commitPositionAlphaFocusPlanV2(
        source,
        ['action_recovery', 'action_film_study', 'action_study_hall'],
        mechanics,
      );
      const published = reloadCurrent(result, mechanics);
      expect(JSON.stringify(source)).toBe(before);
      expect(Object.isFrozen(source.player.state)).toBe(false);
      expect(Object.isFrozen(source.training.attributes)).toBe(false);
      expect(Object.isFrozen(source.lifecycle.relationships)).toBe(false);
      expect(Object.isFrozen(published.player.state)).toBe(true);
      expect(published.player).not.toBe(source.player);
      expect(
        commitPositionAlphaFocusPlanV2(
          { ...source, revision: Number.MAX_SAFE_INTEGER },
          ['action_recovery', 'action_recovery', 'action_recovery'],
          mechanics,
        ).ok,
      ).toBe(false);
      expect(
        commitPositionAlphaFocusPlanV2(
          { ...source, player: { ...source.player, state: { ...source.player.state, gpa: 9 } } },
          ['action_recovery', 'action_recovery', 'action_recovery'],
          mechanics,
        ).ok,
      ).toBe(false);
    },
  );
  it.each(CASES)(
    '%s makes Study Hall change a saved due checkpoint and consumes restriction once',
    (positionId, archetypeId) => {
      const { session: initial, mechanics: baseMechanics } = fixture([positionId, archetypeId]);
      // Isolate the academic decision from separate contextual-event GPA effects.
      const mechanics = {
        ...baseMechanics,
        qb: {
          ...baseMechanics.qb,
          events: baseMechanics.qb.events.map((event) => ({
            ...event,
            choices: event.choices.map((choice) => ({
              ...choice,
              effects: { ...choice.effects, gpaMilliDelta: 0 },
            })),
          })),
        },
        rb: {
          ...baseMechanics.rb,
          events: baseMechanics.rb.events.map((event) => ({
            ...event,
            choices: event.choices.map((choice) => ({
              ...choice,
              effects: { ...choice.effects, gpaMilliDelta: 0 },
            })),
          })),
        },
        cb: {
          ...baseMechanics.cb,
          events: baseMechanics.cb.events.map((event) => ({
            ...event,
            choices: event.choices.map((choice) => ({
              ...choice,
              effects: { ...choice.effects, gpaMilliDelta: 0 },
            })),
          })),
        },
      };
      const lowGpaState = { ...initial.player.state, gpa: 1.9 };
      const source = {
        ...initial,
        player: { ...initial.player, state: lowGpaState },
        lifecycle: { ...initial.lifecycle, playerState: lowGpaState },
      };
      let session = migratePositionAlphaSessionV1ToV2(source, mechanics)!;
      expect(session).not.toBeNull();
      expect(Object.hasOwn(session, 'academics')).toBe(false);
      for (let week = 0; week < 5; week += 1) {
        session = finishAcademicTestGame(
          reloadCurrent(
            commitPositionAlphaFocusPlanV2(
              session,
              ['action_recovery', 'action_recovery', 'action_recovery'],
              mechanics,
            ),
            mechanics,
          ),
          mechanics,
        );
        expect(session.academics!.state.checkpointHistory).toHaveLength(0);
      }
      const branchSource = session;
      const before = JSON.stringify(branchSource);
      for (const studyCount of [0, 1, 3]) {
        const plan = Array.from({ length: 3 }, (_, index) =>
          index < studyCount ? 'action_study_hall' : 'action_recovery',
        );
        const planned = reloadCurrent(
          commitPositionAlphaFocusPlanV2(branchSource, plan, mechanics),
          mechanics,
        );
        const reviewed = reloadCurrent(
          advancePositionAlphaGameDayV2(planned, mechanics),
          mechanics,
        );
        expect(reviewed.gameDay.type).toBe('ACADEMIC_REVIEW');
        const day = reviewed.gameDay;
        if (day.type === 'IDLE' || day.academics === null)
          throw new Error('Missing academic evidence');
        const checkpoint = day.academics.checkpoint!;
        expect(checkpoint.checkpointId).toBe('academic_checkpoint_midterm');
        expect(checkpoint.gpaMilli).toBe(1900 + studyCount * 150);
        expect(checkpoint.statusAfter).toBe(
          studyCount === 0 ? 'INELIGIBLE' : studyCount === 1 ? 'WARNING' : 'ELIGIBLE',
        );
        expect(day.academics.maximumOpportunities).toBe(studyCount === 0 ? 0 : 5);
        expect(reviewed.careerRng).toEqual(planned.careerRng);
        expect(reviewed.world).toEqual(branchSource.world);
        expect(day.injury).toBeNull();
        expect(resolvePositionAlphaGameDaySnapV2(reviewed, 'missing', mechanics).ok).toBe(false);
        expect(
          validatePositionAlphaSessionV2(
            {
              ...reviewed,
              gameDay: {
                ...day,
                academics: {
                  ...day.academics,
                  checkpoint: { ...checkpoint, gpaMilli: checkpoint.gpaMilli + 1 },
                },
              },
            },
            mechanics,
          ),
        ).toBe(false);
        expect(
          validatePositionAlphaSessionV2(
            { ...reviewed, gameDay: { ...day, type: 'GAME_PREVIEW' } },
            mechanics,
          ),
        ).toBe(false);
        const settled = finishAcademicTestGame(reviewed, mechanics);
        const last = settled.weekHistory.at(-1)!;
        if (last.model !== 'position_alpha_week_summary_v2')
          throw new Error('Missing current summary');
        expect(last.academics.checkpoint).toEqual(checkpoint);
        expect(settled.academics).toEqual(last.academics.afterGame);
        expect(settled.academics!.state.restrictionGamesRemaining).toBe(0);
        expect(settled.academics!.state.checkpointHistory).toHaveLength(1);
        if (studyCount === 0) {
          expect(last.opportunityCount).toBe(0);
          expect(last.injury.source.workloadSnapPermille).toBe(0);
          expect(last.completedGame.game.rng).toEqual(last.injury.rng);
          expect(last.completedGame.game.growth.attributeXp).toHaveLength(0);
          expect(last.academics.gameRestriction).toEqual({
            model: 'academic_game_restriction_v1',
            gameId: last.completedGame.game.summary.gameId,
            weekIndex: 5,
            restrictionGamesBefore: 1,
            restrictionGamesAfter: 0,
          });
        } else expect(last.academics.gameRestriction).toBeNull();
        expect(
          validatePositionAlphaSessionV2(
            {
              ...settled,
              academics: {
                ...settled.academics,
                state: { ...settled.academics!.state, restrictionGamesRemaining: 1 },
              },
            },
            mechanics,
          ),
        ).toBe(false);
      }
      expect(JSON.stringify(branchSource)).toBe(before);
    },
  );

  it.each(CASES)(
    '%s activates after a historical checkpoint without rewriting or retroactive penalties',
    (positionId, archetypeId) => {
      const { session: initial, mechanics, actions } = fixture([positionId, archetypeId]);
      let historical = initial;
      for (let week = 0; week < 7; week += 1) {
        const advanced = resolveShippedPositionAlphaWeek(historical, actions[0]!.id, 'best_fit');
        if (!advanced.ok) throw new Error(advanced.reason);
        historical = advanced.session;
        if (historical.events.pending !== null) {
          const chosen = resolveShippedPositionAlphaEvent(
            historical,
            historical.events.pending.choiceIds[0],
          );
          if (!chosen.ok) throw new Error(chosen.reason);
          historical = chosen.session;
        }
        if (historical.skills.offeredSkillIds !== null) {
          const chosen = chooseShippedPositionAlphaSkill(
            historical,
            historical.skills.offeredSkillIds[0],
          );
          if (!chosen.ok) throw new Error(chosen.reason);
          historical = chosen.session;
        }
      }
      const migrated = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      expect(Object.hasOwn(migrated, 'academics')).toBe(false);
      const planned = reloadCurrent(
        commitPositionAlphaFocusPlanV2(
          migrated,
          ['action_study_hall', 'action_film_study', 'action_recovery'],
          mechanics,
        ),
        mechanics,
      );
      const next = finishAcademicTestGame(planned, mechanics);
      expect(next.weekHistory.slice(0, 7)).toEqual(historical.weekHistory);
      expect(next.academics!.activatedAtCareerWeekIndex).toBe(7);
      expect(next.academics!.state.nextCheckpointIndex).toBe(1);
      expect(next.academics!.state.checkpointHistory).toHaveLength(0);
      expect(next.academics!.state.gameRestrictionHistory).toHaveLength(0);
    },
  );
  it.each(CASES)(
    '%s uses bounded relationship information without free clues or RNG',
    (positionId, archetypeId) => {
      const { session, mechanics, gameFixture } = fixture([positionId, archetypeId]);
      const context: PositionAlphaGameContext = {
        ...session,
        player: {
          ...session.player,
          state: { ...session.player.state, preparation: 60 },
          attributes: Object.fromEntries(
            Object.keys(session.player.attributes).map((id) => [id, { rating: 60, xp: 0 }]),
          ),
        },
        room: {
          ...session.room,
          projection: { ...session.room.projection, interactiveSnapMaximum: 1 },
        },
        skills: { equippedSkillIds: [null, null, null, null] },
      };
      const before = JSON.stringify(context);
      const historical = startPositionAlphaGame(context, gameFixture, 0, mechanics)!;
      if (historical.game.type !== 'ACTIVE') throw new Error('Missing historical snap');
      expect(
        Object.hasOwn(
          historical.game.pendingSnap.information,
          'relationshipInformationScoreModifier',
        ),
      ).toBe(false);
      for (const modifier of [-6, 0, 6]) {
        const current = startPositionAlphaGame(
          { ...context, relationshipInformationScoreModifier: modifier },
          gameFixture,
          0,
          mechanics,
        )!;
        if (current.game.type !== 'ACTIVE') throw new Error('Missing current snap');
        expect(current.game.rng).toEqual(session.careerRng);
        expect(current.game.pendingSnap.information.finalScore).toBe(60 + modifier);
        expect(current.game.pendingSnap.information.relationshipInformationScoreModifier).toBe(
          modifier,
        );
        expect(current.game.pendingSnap.revealedClueIds).toHaveLength(modifier === 6 ? 2 : 1);
        const restored = JSON.parse(JSON.stringify(current)) as PositionAlphaGameState;
        const decision = current.game.pendingSnap.decisionIds[0];
        const resolved = resolvePositionAlphaSnap(current, decision)!;
        expect(resolvePositionAlphaSnap(restored, decision)).toEqual(resolved);
        expect(resolved.game.rng.drawCount - session.careerRng.drawCount).toBe(6);
      }
      for (const modifier of [-7, 7, 0.5, Number.NaN, undefined]) {
        expect(
          startPositionAlphaGame(
            {
              ...context,
              relationshipInformationScoreModifier: modifier,
            } as unknown as PositionAlphaGameContext,
            gameFixture,
            0,
            mechanics,
          ),
        ).toBeNull();
      }
      expect(JSON.stringify(context)).toBe(before);
    },
  );
  it.each(CASES)(
    '%s composes rest/limited availability with actual depth-owned snap limits',
    (positionId, archetypeId) => {
      const { session, mechanics, gameFixture, actions } = fixture([positionId, archetypeId]);
      const preparation = preparePositionAlphaWeek(
        session,
        actions.slice(0, 3).map(({ id }) => id),
        mechanics,
      );
      if (preparation === null) throw new Error('Invalid prepared injury fixture');
      const definition = injuryOutcomeMechanicsDefinitions.find(
        ({ id }) => id === 'injury_outcome_burst_limit',
      )!;
      const injuryMechanics = {
        lifecycle: mechanics.lifecycle,
        outcomes: injuryOutcomeMechanicsDefinitions,
        tuning: injuryTuning,
      };
      const injury = assessPositionInjuryWeek(
        {
          positionId,
          weekIndex: 0,
          body: preparation.player.state.body,
          confidence: preparation.player.state.confidence,
          coachTrust: preparation.player.state.coachTrust,
          durability: preparation.player.attributes.attribute_durability!.rating,
          workloadSnapPermille: 300,
          recentTrainingLoad: 20,
          rng: session.careerRng,
          currentInjury: {
            outcomeId: definition.id,
            severityId: definition.severityId,
            startedWeekIndex: 0,
            originalDurationWeeks: definition.durationWeeks,
            remainingWeeks: definition.durationWeeks,
            defaultAvailabilityId: definition.availabilityId,
            opportunityCap: definition.opportunityCap,
          },
        },
        injuryMechanics,
      );
      if (injury === null) throw new Error('Invalid injury fixture');
      for (const choiceId of ['injury_choice_rest_rehab', 'injury_choice_play_limited'] as const) {
        const chosen = resolvePositionInjuryWeekChoice(injury, choiceId, injuryMechanics);
        if (chosen?.availability === null || chosen === null)
          throw new Error('Invalid injury choice');
        const availability = chosen.availability;
        const player = {
          ...preparation.player,
          state: {
            ...preparation.player.state,
            body: availability.bodyAfter,
            confidence: availability.confidenceAfter,
            coachTrust: availability.coachTrustAfter,
          },
        };
        for (const roleMaximum of [0, 1, 2, 4, 5]) {
          const context = {
            ...session,
            ...preparation,
            player,
            careerRng: chosen.rng,
            room: {
              ...preparation.room,
              projection: { ...preparation.room.projection, interactiveSnapMaximum: roleMaximum },
            },
          };
          const before = JSON.stringify(context);
          let game = startPositionAlphaGame(context, gameFixture, 0, mechanics, availability);
          if (game === null) throw new Error('Invalid availability-constrained game');
          const expectedCount = Math.min(roleMaximum, availability.opportunityCap);
          const startDrawCount = game.game.rng.drawCount;
          expect(startDrawCount).toBe(chosen.rng.drawCount);
          while (game.game.type === 'ACTIVE') {
            const next = resolvePositionAlphaSnap(game, game.game.pendingSnap.decisionIds[0]!);
            if (next === null) throw new Error('Invalid constrained snap');
            game = next;
          }
          expect(game.game.summary.opportunityCount).toBe(expectedCount);
          expect(game.game.rng.drawCount - startDrawCount).toBe(expectedCount * 6);
          for (const modifier of [-100, 0, 100]) {
            const currentContext = {
              ...context,
              relationshipOpportunitySnapBonusPermille: modifier,
              room: {
                ...context.room,
                projection: { ...context.room.projection, interactiveSnapMinimum: 0 },
              },
            };
            const projected = Math.min(
              roleMaximum,
              Math.max(0, Math.floor(roleMaximum / 2) + Math.sign(modifier)),
            );
            let current = startPositionAlphaGame(
              currentContext,
              gameFixture,
              0,
              mechanics,
              availability,
            )!;
            while (current.game.type === 'ACTIVE')
              current = resolvePositionAlphaSnap(current, current.game.pendingSnap.decisionIds[0])!;
            expect(current.game.summary.opportunityCount).toBe(
              Math.min(projected, availability.opportunityCap),
            );
            expect(current.game.rng.drawCount - chosen.rng.drawCount).toBe(
              Math.min(projected, availability.opportunityCap) * 6,
            );
          }
          if (expectedCount === 0) {
            expect(game.game.summary.participationFeedbackId).toMatch(/review/);
            expect(game.game.nextPlayer.attributes).toEqual(player.attributes);
          }
          expect(JSON.stringify(context)).toBe(before);
          expect(
            startPositionAlphaGame(context, gameFixture, 0, mechanics, {
              ...availability,
              opportunityCap: -1,
            }),
          ).toBeNull();
          expect(
            startPositionAlphaGame(context, gameFixture, 0, mechanics, {
              ...availability,
              bodyAfter: availability.bodyAfter + 1,
            }),
          ).toBeNull();
        }
      }
    },
  );
  it.each(CASES)(
    '%s applies a fourth-slot Life skill through the shared event resolver',
    (positionId, archetypeId) => {
      const { session, mechanics } = fixture([positionId, archetypeId]);
      const catalog =
        mechanics[positionId === 'position_qb' ? 'qb' : positionId === 'position_rb' ? 'rb' : 'cb'];
      const skill = catalog.skills.find(({ effects }) =>
        effects.some(({ type }) => type.endsWith('event_positive_multiplier_permille')),
      )!;
      let changed = 0;
      for (const event of catalog.events) {
        const choiceId = event.choices[0]!.id;
        const context = {
          ...session,
          events: {
            ...session.events,
            pending: { eventId: event.id, choiceIds: [choiceId], weekIndex: 0 },
          },
        };
        const before = JSON.stringify(context);
        const empty = resolvePositionAlphaEventEffects(
          { ...context, skills: { equippedSkillIds: [null, null, null, null] } },
          choiceId,
          mechanics,
        );
        const fourth = resolvePositionAlphaEventEffects(
          { ...context, skills: { equippedSkillIds: [null, null, null, skill.id] } },
          choiceId,
          mechanics,
        );
        const first = resolvePositionAlphaEventEffects(
          { ...context, skills: { equippedSkillIds: [skill.id, null, null, null] } },
          choiceId,
          mechanics,
        );
        expect(fourth).not.toBeNull();
        expect(fourth).toEqual(first);
        if (JSON.stringify(fourth) !== JSON.stringify(empty)) changed += 1;
        expect(JSON.stringify(context)).toBe(before);
        expect(resolvePositionAlphaEventEffects(context, 'missing', mechanics)).toBeNull();
      }
      expect(changed).toBeGreaterThan(0);
    },
  );
  it.each(
    CASES.flatMap(([positionId, archetypeId]) =>
      ['BALANCED', 'DEVELOPMENT', 'PREPARATION'].map(
        (strategy) => [positionId, archetypeId, strategy] as const,
      ),
    ),
  )(
    '%s / %s / %s completes twelve saved games with distinct weekly strategy and bounded history',
    (positionId, archetypeId, strategy) => {
      const { session: initial, mechanics, actions } = fixture([positionId, archetypeId]);
      let session = migratePositionAlphaSessionV1ToV2(initial, mechanics)!;
      let sawRelationshipTrustEffect = false;
      let checkedInjuryPreview = false;
      const apply = (result: PositionAlphaCommandResultV2) => {
        if (!result.ok) throw new Error(result.reason);
        expect(result.session.revision).toBe(session.revision + 1);
        const reloaded = parsePositionAlphaSessionV2Json(JSON.stringify(result.session), mechanics);
        expect(reloaded).toEqual(result.session);
        session = reloaded!;
      };
      for (let weekIndex = 0; weekIndex < 12; weekIndex += 1) {
        const prior = session.weekHistory.at(-1);
        const expectedInjury =
          prior?.model === 'position_alpha_week_summary_v2' && prior.injury.currentInjury !== null
            ? advanceInjuryDuration(
                prior.injury.currentInjury,
                prior.injury.availability!.recoveryCreditWeeks,
              )
            : null;
        expect(session.phase).toEqual({ type: 'WEEK_PLANNING', weekIndex });
        const intended: readonly PositionFocusId[] =
          strategy === 'DEVELOPMENT'
            ? [actions[0]!.id, 'action_weight_room', 'action_recovery']
            : strategy === 'PREPARATION'
              ? [actions[1]!.id, 'action_film_study', 'action_recovery']
              : [
                  actions[weekIndex % actions.length]!.id,
                  weekIndex % 3 === 0 ? 'action_study_hall' : 'action_film_study',
                  'action_recovery',
                ];
        const actionIds = intended.map((id) =>
          isPositionFocusAvailable(id, expectedInjury, mechanics.focusInjuryPolicies)
            ? id
            : 'action_film_study',
        );
        const beforePlanning = session;
        const preview =
          !checkedInjuryPreview && expectedInjury !== null
            ? projectPositionAlphaPlanningV2(session, actionIds, mechanics)
            : null;
        if (preview !== null) {
          checkedInjuryPreview = true;
          expect(preview.currentInjury).toEqual(expectedInjury);
          for (const action of preview.actions)
            expect(action.available).toBe(
              isPositionFocusAvailable(
                action.actionId as PositionFocusId,
                expectedInjury,
                mechanics.focusInjuryPolicies,
              ),
            );
        }
        apply(commitPositionAlphaFocusPlanV2(session, actionIds, mechanics));
        const prepared = (() => {
          const day = session.gameDay;
          if (day.type !== 'PRACTICE_REVIEW') throw new Error('Missing preparation');
          return day.preparation;
        })();
        if (preview !== null) expect(preview.preparation).toEqual(prepared);
        expect(session.careerRng).toEqual(beforePlanning.careerRng);
        expect(session.lifecycle).toEqual(beforePlanning.lifecycle);
        expect(prepared.relationships.changes.map(({ valueBefore }) => valueBefore)).toEqual(
          beforePlanning.lifecycle.relationships.map(({ value }) => value),
        );
        expect(prepared.relationshipTrust.after).toBe(
          Math.min(
            100,
            Math.max(
              0,
              prepared.relationshipTrust.before + prepared.relationships.coachTrustModifier,
            ),
          ),
        );
        expect(prepared.player.state.coachTrust).toBe(prepared.relationshipTrust.after);
        expect(prepared.room.playerCoachTrust).toBe(prepared.relationshipTrust.after);
        if (prepared.relationshipTrust.actualDelta !== 0) sawRelationshipTrustEffect = true;
        if (weekIndex === 0)
          expect(
            validatePositionAlphaSessionV2(
              {
                ...session,
                gameDay: {
                  ...session.gameDay,
                  preparation: {
                    ...prepared,
                    relationshipTrust: {
                      ...prepared.relationshipTrust,
                      after: prepared.relationshipTrust.after + 1,
                    },
                  },
                },
              },
              mechanics,
            ),
          ).toBe(false);
        while (session.gameDay.type !== 'POST_GAME') {
          if (session.gameDay.type === 'EVENT_CHOICE' && session.gameDay.event !== null) {
            const rng = session.careerRng;
            expect(advancePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
            apply(
              resolvePositionAlphaEventV2(session, session.gameDay.event.choiceIds[0], mechanics),
            );
            expect(session.careerRng).toEqual(rng);
          } else if (
            session.gameDay.type === 'ACTIVE_SNAP' &&
            session.gameDay.game?.game.type === 'ACTIVE'
          ) {
            expect(
              session.gameDay.game.game.pendingSnap.information
                .relationshipInformationScoreModifier,
            ).toBe(prepared.relationships.informationScoreModifier);
            const ids = session.gameDay.game.game.pendingSnap.decisionIds;
            apply(
              resolvePositionAlphaGameDaySnapV2(session, ids[weekIndex % ids.length], mechanics),
            );
          } else if (session.gameDay.type === 'INJURY_CHOICE') {
            const before = session.careerRng;
            expect(advancePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
            expect(
              validatePositionAlphaSessionV2(
                { ...session, gameDay: { ...session.gameDay, type: 'GAME_PREVIEW' } },
                mechanics,
              ),
            ).toBe(false);
            expect(resolvePositionAlphaGameDaySnapV2(session, 'missing', mechanics).ok).toBe(false);
            apply(
              resolvePositionAlphaInjuryChoiceV2(
                session,
                weekIndex % 2 === 0 ? 'injury_choice_rest_rehab' : 'injury_choice_play_limited',
                mechanics,
              ),
            );
            expect(session.careerRng).toEqual(before);
          } else apply(advancePositionAlphaGameDayV2(session, mechanics));
        }
        const beforeSettlement = session;
        apply(settlePositionAlphaGameDayV2(session, mechanics));
        expect(session.world.rng.drawCount - beforeSettlement.world.rng.drawCount).toBe(30);
        expect(session.world.completedRegularSeasonRoundCount).toBe(weekIndex + 1);
        expect(session.weekHistory).toHaveLength(weekIndex + 1);
        const latest = session.weekHistory.at(-1)!;
        expect(latest.model).toBe('position_alpha_week_summary_v2');
        if (latest.model === 'position_alpha_week_summary_v2') {
          expect(latest.actionIds).toEqual(actionIds);
          expect(session.training.sharedProficiencyUses).toBeDefined();
          expect(session.player.state.body).toBe(latest.rollover.bodyAfter);
          expect(session.player.state.preparation).toBe(latest.rollover.preparationAfter);
          expect(session.training.sharedProficiencyUses).toEqual(latest.sharedProficiencyUsesAfter);
          expect(
            validatePositionAlphaSessionV2(
              {
                ...session,
                training: {
                  ...session.training,
                  sharedProficiencyUses: {
                    ...session.training.sharedProficiencyUses,
                    proficiency_film_study:
                      session.training.sharedProficiencyUses!.proficiency_film_study + 1,
                  },
                },
              },
              mechanics,
            ),
          ).toBe(false);
          expect(latest.injury.source.currentInjury).toEqual(expectedInjury);
          expect(latest.injury.source.rng).toEqual(latest.event.rng);
          expect(latest.injury.source.weekIndex).toBe(weekIndex);
          expect(latest.injury.source.coachTrust).toBe(latest.event.afterState.coachTrust);
          expect(latest.relationships).toEqual(prepared.relationships);
          expect(session.lifecycle.relationships).toEqual(prepared.relationships.tracksAfter);
          if (weekIndex === 11)
            expect(
              validatePositionAlphaSessionV2(
                {
                  ...session,
                  lifecycle: {
                    ...session.lifecycle,
                    relationships: session.lifecycle.relationships.map((track, index) =>
                      index === 0
                        ? { ...track, value: track.value === 100 ? 99 : track.value + 1 }
                        : track,
                    ),
                  },
                },
                mechanics,
              ),
            ).toBe(false);
          expect(session.player.state.coachTrust).toBe(
            latest.completedGame.game.nextPlayer.state.coachTrust,
          );
          expect(latest.injuryExposure).toEqual(latest.injury.exposure);
          expect(latest.opportunityCount).toBeLessThanOrEqual(
            latest.injury.availability!.opportunityCap,
          );
          expect(latest.nil.rngBefore).toEqual(latest.injury.rng);
          expect(latest.completedGame.game.rng.drawCount - latest.nil.rng.drawCount).toBe(
            latest.opportunityCount * 6,
          );
          expect(
            resolvePositionAlphaInjuryChoiceV2(session, 'injury_choice_rest_rehab', mechanics).ok,
          ).toBe(false);
          expect(Object.keys(latest.source).sort()).toEqual([
            ...(weekIndex === 0 ? [] : ['academics']),
            'careerRng',
            'events',
            'lifecycle',
            ...(weekIndex === 0 ? [] : ['nil']),
            'player',
            'previousStats',
            'room',
            'seasonClock',
            'skills',
            'training',
          ]);
        }
        if (session.skills.offeredSkillIds !== null) {
          const selected = session.skills.offeredSkillIds[0];
          expect(projectPositionAlphaPlanningV2(session, actionIds, mechanics)).toBeNull();
          const rng = session.careerRng;
          const world = session.world;
          expect(choosePositionAlphaSkillV2(session, 'missing', mechanics).ok).toBe(false);
          apply(choosePositionAlphaSkillV2(session, selected, mechanics));
          expect(session.careerRng).toEqual(rng);
          expect(session.world).toEqual(world);
          expect(choosePositionAlphaSkillV2(session, selected, mechanics).ok).toBe(false);
        }
      }
      expect(session.phase.type).toBe('SEASON_REVIEW');
      expect(sawRelationshipTrustEffect).toBe(true);
      expect(session.player.state.gpa).toBe(
        Math.round(
          (initial.player.state.gpa +
            session.weekHistory.reduce(
              (sum, week) =>
                week.model === 'position_alpha_week_summary_v2'
                  ? sum +
                    week.trainingEvidence.reduce(
                      (total, action) => total + action.actualGpaDelta,
                      0,
                    ) +
                    week.event.afterState.gpa -
                    week.trainingEvidence[2].gpaAfter
                  : sum,
              0,
            )) *
            1000,
        ) / 1000,
      );
      if (strategy === 'DEVELOPMENT')
        expect(session.training.sharedProficiencyUses!.proficiency_weight_room).toBeGreaterThan(0);
      else expect(session.training.sharedProficiencyUses!.proficiency_weight_room).toBe(0);
      if (strategy === 'PREPARATION')
        expect(
          session.training.sharedProficiencyUses!.proficiency_film_study,
        ).toBeGreaterThanOrEqual(12);
      expect(session.skills.ownedSkillIds.length).toBeGreaterThanOrEqual(4);
      expect(session.skills.ownedSkillIds.length).toBeLessThanOrEqual(6);
      expect(new TextEncoder().encode(JSON.stringify(session)).byteLength).toBeLessThan(1_000_000);
      expect(
        commitPositionAlphaFocusPlanV2(
          session,
          actions.slice(0, 3).map(({ id }) => id),
          mechanics,
        ).ok,
      ).toBe(false);
      expect(settlePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
    },
  );
  it.each(CASES)(
    '%s shares once-only football settlement with the historical weekly command',
    (positionId, archetypeId) => {
      const { session, mechanics, actions, gameFixture } = fixture([positionId, archetypeId]);
      const actionId = actions[0]!.id;
      const preparation = preparePositionAlphaWeek(
        session,
        [actionId, actionId, actionId],
        mechanics,
      )!;
      let direct = startPositionAlphaGame(
        { ...session, ...preparation },
        gameFixture,
        0,
        mechanics,
      )!;
      while (direct.game.type === 'ACTIVE') {
        direct = resolvePositionAlphaSnap(direct, direct.game.pendingSnap.decisionIds.at(-1)!)!;
      }
      const completed = direct as CompletedPositionGame;
      const before = JSON.stringify({ session, preparation, completed });
      const settlement = settlePositionAlphaFootballWeek(
        session,
        preparation,
        completed,
        mechanics,
      );
      expect(settlement).not.toBeNull();
      if (settlement === null) return;
      const historical = resolveShippedPositionAlphaWeek(session, actionId, 'risk_seeking');
      if (!historical.ok) throw new Error(historical.reason);
      for (const key of ['player', 'room', 'training', 'lifecycle', 'world'] as const)
        expect(settlement[key]).toEqual(historical.session[key]);
      const summary = historical.session.weekHistory[0]!;
      expect(settlement.stats).toEqual(summary.stats);
      expect(settlement.relationships).toEqual(summary.relationships);
      expect(settlement.injuryExposure).toEqual(summary.injuryExposure);
      expect(settlement.eligibility).toEqual(summary.eligibility);
      expect(settlement.gaugePoints).toBe(summary.breakthroughGaugePoints);
      expect(settlement.world.rng.drawCount - session.world.rng.drawCount).toBe(30);
      expect(
        settlePositionAlphaFootballWeek(historical.session, preparation, completed, mechanics),
      ).toBeNull();
      expect(JSON.stringify({ session, preparation, completed })).toBe(before);
      expect(Object.isFrozen(settlement.player.state)).toBe(true);
    },
  );
  it.each(CASES)(
    '%s persists fourth-slot moves and clears only before focus commitment',
    (positionId, archetypeId) => {
      const { session: initial, mechanics, actions } = fixture([positionId, archetypeId], '', true);
      let historical = initial;
      while (historical.skills.ownedSkillIds.length === 0 || historical.events.pending !== null) {
        if (historical.skills.offeredSkillIds !== null) {
          const chosen = chooseShippedPositionAlphaSkill(
            historical,
            historical.skills.offeredSkillIds[0],
          );
          if (!chosen.ok) throw new Error(chosen.reason);
          historical = chosen.session;
        } else if (historical.events.pending !== null) {
          const event = resolveShippedPositionAlphaEvent(
            historical,
            historical.events.pending.choiceIds[0],
          );
          if (!event.ok) throw new Error(event.reason);
          historical = event.session;
        } else {
          const week = resolveShippedPositionAlphaWeek(historical, actions[0]!.id, 'risk_seeking');
          if (!week.ok) throw new Error(week.reason);
          historical = week.session;
        }
      }
      const session = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      const skillId = session.skills.ownedSkillIds[0]!;
      const before = JSON.stringify(session);
      const moved = equipPositionAlphaSkillV2(session, skillId, 3, mechanics);
      if (!moved.ok) throw new Error(moved.reason);
      expect(moved.session.skills.equippedSkillIds).toEqual([null, null, null, skillId]);
      expect(moved.session.careerRng).toEqual(session.careerRng);
      expect(moved.session.world).toEqual(session.world);
      expect(moved.session.skills.ownedSkillIds).toEqual(session.skills.ownedSkillIds);
      expect(parsePositionAlphaSessionV2Json(JSON.stringify(moved.session), mechanics)).toEqual(
        moved.session,
      );
      const cleared = equipPositionAlphaSkillV2(moved.session, null, 3, mechanics);
      if (!cleared.ok) throw new Error(cleared.reason);
      expect(cleared.session.skills.equippedSkillIds).toEqual([null, null, null, null]);
      for (const slot of [-1, 4, 0.5, '3', null])
        expect(equipPositionAlphaSkillV2(session, skillId, slot, mechanics).ok).toBe(false);
      expect(equipPositionAlphaSkillV2(session, 'skill_missing', 3, mechanics).ok).toBe(false);
      const committed = commitPositionAlphaFocusPlanV2(
        moved.session,
        actions.slice(0, 3).map(({ id }) => id),
        mechanics,
      );
      if (!committed.ok) throw new Error(committed.reason);
      expect(equipPositionAlphaSkillV2(committed.session, null, 3, mechanics).ok).toBe(false);
      let current = committed.session;
      while (
        [
          'PRACTICE_REVIEW',
          'ACADEMIC_REVIEW',
          'EVENT_CHOICE',
          'EVENT_RESOLVED',
          'INJURY_CHOICE',
          'GAME_PREVIEW',
        ].includes(current.gameDay.type)
      ) {
        const advanced =
          current.gameDay.type === 'EVENT_CHOICE' && current.gameDay.event !== null
            ? resolvePositionAlphaEventV2(current, current.gameDay.event.choiceIds[0], mechanics)
            : current.gameDay.type === 'INJURY_CHOICE'
              ? resolvePositionAlphaInjuryChoiceV2(current, 'injury_choice_play_limited', mechanics)
              : advancePositionAlphaGameDayV2(current, mechanics);
        if (!advanced.ok) throw new Error(advanced.reason);
        current = advanced.session;
      }
      if (current.gameDay.type !== 'ACTIVE_SNAP' || current.gameDay.game?.game.type !== 'ACTIVE')
        throw new Error('Expected active built game');
      expect(current.gameDay.game.game.equippedSkills.map(({ id }) => id)).toEqual([skillId]);
      expect(equipPositionAlphaSkillV2(current, null, 3, mechanics).ok).toBe(false);
      while (current.gameDay.type !== 'POST_GAME') {
        const day = current.gameDay;
        const result =
          day.type === 'ACTIVE_SNAP' && day.game?.game.type === 'ACTIVE'
            ? resolvePositionAlphaGameDaySnapV2(
                current,
                day.game.game.pendingSnap.decisionIds[0],
                mechanics,
              )
            : advancePositionAlphaGameDayV2(current, mechanics);
        if (!result.ok) throw new Error(result.reason);
        current = result.session;
      }
      const settled = settlePositionAlphaGameDayV2(current, mechanics);
      if (!settled.ok) throw new Error(settled.reason);
      expect(settled.session.weekHistory.slice(0, historical.weekHistory.length)).toEqual(
        historical.weekHistory,
      );
      const latest = settled.session.weekHistory.at(-1)!;
      expect(latest.model).toBe('position_alpha_week_summary_v2');
      if (latest.model === 'position_alpha_week_summary_v2')
        expect(latest.source.skills.equippedSkillIds).toEqual([null, null, null, skillId]);
      expect(parsePositionAlphaSessionV2Json(JSON.stringify(settled.session), mechanics)).toEqual(
        settled.session,
      );
      expect(JSON.stringify(session)).toBe(before);
    },
  );
  it.each(CASES)(
    '%s saves every direct boundary with strict replay validation and no duplicated rewards',
    (positionId, archetypeId) => {
      const {
        session: historical,
        mechanics,
        actions,
      } = fixture([positionId, archetypeId], '', true);
      let session = migratePositionAlphaSessionV1ToV2(historical, mechanics)!;
      const start = JSON.stringify(session);
      const types = new Set<string>();
      function accept(result: PositionAlphaCommandResultV2): void {
        if (!result.ok) throw new Error(result.reason);
        expect(result.session.revision).toBe(session.revision + 1);
        expect(result.session.world).toEqual(historical.world);
        expect(result.session.lifecycle).toEqual(historical.lifecycle);
        expect(result.session.weekHistory).toEqual(historical.weekHistory);
        expect(result.session.player).toEqual(historical.player);
        expect(result.session.skills).toEqual(session.skills);
        expect(Object.isFrozen(result.session.gameDay)).toBe(true);
        const serialized = JSON.stringify(result.session);
        const parsed = parsePositionAlphaSessionV2Json(serialized, mechanics);
        expect(parsed).toEqual(result.session);
        if (parsed === null) throw new Error('Reload rejected');
        session = parsed;
        types.add(session.gameDay.type);
        const reordered: unknown = JSON.parse(
          JSON.stringify(session.gameDay),
          (_key, value: unknown) =>
            value !== null && typeof value === 'object' && !Array.isArray(value)
              ? Object.fromEntries(Object.entries(value).reverse())
              : value,
        );
        expect(validatePositionAlphaSessionV2({ ...session, gameDay: reordered }, mechanics)).toBe(
          true,
        );
        expect(
          validatePositionAlphaSessionV2(
            { ...session, gameDay: { ...session.gameDay, extra: true } },
            mechanics,
          ),
        ).toBe(false);
        expect(
          validatePositionAlphaSessionV2(
            { ...session, phase: { type: 'WEEK_PLANNING', weekIndex: 0 } },
            mechanics,
          ),
        ).toBe(false);
        const foundation = buildShippedPositionAlphaSessionFoundation({
          identity: historical.player,
        })!;
        expect(parsePositionAlphaSessionV2Json(serialized, foundation)).toBeNull();
        if (session.gameDay.type !== 'IDLE') {
          const day = session.gameDay;
          if (day.injury !== null) {
            expect(
              validatePositionAlphaSessionV2(
                { ...session, gameDay: { ...day, injury: null } },
                mechanics,
              ),
            ).toBe(false);
            expect(
              validatePositionAlphaSessionV2(
                {
                  ...session,
                  gameDay: {
                    ...day,
                    injury: {
                      ...day.injury,
                      source: { ...day.injury.source, body: day.injury.source.body + 1 },
                    },
                  },
                },
                mechanics,
              ),
            ).toBe(false);
          }
          for (const gameDay of [
            {
              ...day,
              preparation: {
                ...day.preparation,
                practiceGrade: {
                  ...day.preparation.practiceGrade,
                  score: day.preparation.practiceGrade.score + 1,
                },
              },
            },
            {
              ...day,
              preparation: { ...day.preparation, actionIds: day.preparation.actionIds.slice(0, 2) },
            },
            { ...day, decisionIds: [...day.decisionIds, 'invalid'] },
            { ...day, decisionIds: Array.from({ length: 6 }, () => 'invalid') },
            { ...day, rngBefore: { ...day.rngBefore, drawCount: day.rngBefore.drawCount + 1 } },
            { ...day, type: 'IDLE' },
          ])
            expect(validatePositionAlphaSessionV2({ ...session, gameDay }, mechanics)).toBe(false);
          if (day.game !== null) {
            expect(
              validatePositionAlphaSessionV2(
                {
                  ...session,
                  gameDay: {
                    ...day,
                    game: { ...day.game, game: { ...day.game.game, extra: true } },
                  },
                },
                mechanics,
              ),
            ).toBe(false);
            expect(
              validatePositionAlphaSessionV2(
                {
                  ...session,
                  careerRng: { ...session.careerRng, drawCount: session.careerRng.drawCount + 1 },
                },
                mechanics,
              ),
            ).toBe(false);
          }
        }
      }
      const selected = actions.slice(0, 3).map(({ id }) => id);
      const caller = JSON.parse(start) as PositionAlphaSessionV2;
      expect(commitPositionAlphaFocusPlanV2(caller, selected, mechanics)).toEqual(
        commitPositionAlphaFocusPlanV2(session, selected, mechanics),
      );
      expect(JSON.stringify(caller)).toBe(start);
      expect(Object.isFrozen(caller.player)).toBe(false);
      const committed = commitPositionAlphaFocusPlanV2(session, selected, mechanics);
      expect(JSON.stringify(session)).toBe(start);
      accept(committed);
      expect(session.careerRng).toEqual(historical.careerRng);
      expect(commitPositionAlphaFocusPlanV2(session, selected, mechanics).ok).toBe(false);
      expect(resolvePositionAlphaGameDaySnapV2(session, 'missing', mechanics).ok).toBe(false);
      accept(advancePositionAlphaGameDayV2(session, mechanics));
      const hasEvent = session.gameDay.type === 'EVENT_CHOICE';
      if (session.gameDay.type === 'EVENT_CHOICE' && session.gameDay.event !== null) {
        expect(advancePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
        accept(resolvePositionAlphaEventV2(session, session.gameDay.event.choiceIds[0], mechanics));
        accept(advancePositionAlphaGameDayV2(session, mechanics));
      }
      const hasInjuryChoice = session.gameDay.type === 'INJURY_CHOICE';
      if (session.gameDay.type === 'INJURY_CHOICE') {
        expect(advancePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
        expect(resolvePositionAlphaInjuryChoiceV2(session, 'missing', mechanics).ok).toBe(false);
        accept(
          resolvePositionAlphaInjuryChoiceV2(session, 'injury_choice_play_limited', mechanics),
        );
      }
      const gameStartDrawCount = session.careerRng.drawCount;
      accept(advancePositionAlphaGameDayV2(session, mechanics));
      let played = 0;
      while (session.gameDay.type === 'ACTIVE_SNAP') {
        const day = session.gameDay;
        if (day.game === null || day.game.game.type !== 'ACTIVE')
          throw new Error('Missing saved active snap');
        const decisionId = day.game.game.pendingSnap.decisionIds[0]!;
        const before = JSON.stringify(session);
        expect(advancePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
        expect(resolvePositionAlphaGameDaySnapV2(session, 'missing', mechanics).ok).toBe(false);
        const resolved = resolvePositionAlphaGameDaySnapV2(session, decisionId, mechanics);
        expect(
          resolvePositionAlphaGameDaySnapV2(
            JSON.parse(before) as PositionAlphaSessionV2,
            decisionId,
            mechanics,
          ),
        ).toEqual(resolved);
        expect(JSON.stringify(session)).toBe(before);
        accept(resolved);
        expect(resolvePositionAlphaGameDaySnapV2(session, decisionId, mechanics).ok).toBe(false);
        played += 1;
        expect(session.careerRng.drawCount - gameStartDrawCount).toBe(played * 6);
        accept(advancePositionAlphaGameDayV2(session, mechanics));
      }
      expect(played).toBeGreaterThan(0);
      const beforeSettlement = JSON.stringify(session);
      const settled = settlePositionAlphaGameDayV2(session, mechanics);
      if (!settled.ok) throw new Error(settled.reason);
      expect(settled.session.revision).toBe(session.revision + 1);
      expect(settled.session.phase).toEqual({ type: 'WEEK_PLANNING', weekIndex: 1 });
      expect(settled.session.gameDay.type).toBe('IDLE');
      expect(settled.session.world.rng.drawCount - session.world.rng.drawCount).toBe(30);
      expect(settled.session.careerRng).toEqual(session.careerRng);
      expect(settled.session.weekHistory[0]!.model).toBe('position_alpha_week_summary_v2');
      expect(parsePositionAlphaSessionV2Json(JSON.stringify(settled.session), mechanics)).toEqual(
        settled.session,
      );
      expect(settlePositionAlphaGameDayV2(settled.session, mechanics).ok).toBe(false);
      expect(
        settlePositionAlphaGameDayV2(
          JSON.parse(beforeSettlement) as PositionAlphaSessionV2,
          mechanics,
        ),
      ).toEqual(settled);
      expect(JSON.stringify(session)).toBe(beforeSettlement);
      const history = settled.session.weekHistory[0]!;
      for (const entry of [
        { ...history, extra: true },
        { ...history, gameGrade: history.gameGrade + 1 },
        { ...history, opponentScore: history.opponentScore + 1 },
        { ...history, breakthroughGaugePoints: history.breakthroughGaugePoints + 1 },
        { ...history, trainingEvidence: history.trainingEvidence.slice(0, 2) },
        { ...history, decisionIds: ['missing'] },
      ])
        expect(
          validatePositionAlphaSessionV2({ ...settled.session, weekHistory: [entry] }, mechanics),
        ).toBe(false);
      expect(commitPositionAlphaFocusPlanV2(settled.session, selected, mechanics).ok).toBe(true);
      expect(types).toEqual(
        new Set([
          'PRACTICE_REVIEW',
          'GAME_PREVIEW',
          'ACTIVE_SNAP',
          'RESOLVED_SNAP',
          'POST_GAME',
          ...(hasEvent ? ['EVENT_CHOICE', 'EVENT_RESOLVED'] : []),
          ...(hasInjuryChoice ? ['INJURY_CHOICE'] : []),
        ]),
      );
      expect(advancePositionAlphaGameDayV2(session, mechanics).ok).toBe(false);
      expect(commitPositionAlphaFocusPlanV2(session, selected, mechanics).ok).toBe(false);
    },
  );

  it.each(CASES)(
    '%s accepts three ordered focuses without RNG and preserves repeated-action history',
    (positionId, archetypeId) => {
      const { session, mechanics, actions } = fixture([positionId, archetypeId]);
      const before = JSON.stringify(session);
      const ids = actions.slice(0, 3).map(({ id }) => id);
      const prepared = preparePositionAlphaWeek(session, ids, mechanics);
      expect(prepared).not.toBeNull();
      if (prepared === null) return;
      let training = session.training;
      const evidence = [];
      for (const action of actions.slice(0, 3)) {
        const result = resolvePositionTrainingAction(training, action, mechanics.trainingConfig);
        if (!result.ok) throw new Error('Training failed');
        training = result.next;
        evidence.push(result.evidence);
      }
      expect(prepared.actionIds).toEqual(ids);
      expect(prepared.trainingEvidence).toEqual(evidence);
      expect(prepared.training).toEqual(training);
      expect(Object.isFrozen(prepared.trainingEvidence)).toBe(true);
      expect(JSON.stringify(session)).toBe(before);
      const repeated = preparePositionAlphaWeek(session, [ids[0], ids[0], ids[0]], mechanics)!;
      const historical = resolveShippedPositionAlphaWeek(session, ids[0], 'risk_seeking');
      if (!historical.ok) throw new Error(historical.reason);
      expect(historical.session.weekHistory[0]!.trainingEvidence).toEqual(
        repeated.trainingEvidence,
      );
      expect(historical.session.weekHistory[0]!.practiceGrade).toEqual(repeated.practiceGrade);
      for (const invalid of [
        null,
        [],
        ids.slice(0, 2),
        [...ids, ids[0]],
        [ids[0], 'missing', ids[2]],
        [ids[0], 1, ids[2]],
      ]) {
        expect(preparePositionAlphaWeek(session, invalid, mechanics)).toBeNull();
        expect(JSON.stringify(session)).toBe(before);
      }
    },
  );

  it.each(CASES)(
    '%s resolves only supplied decisions and retains exact underlying engine evidence after JSON reload',
    (positionId, archetypeId) => {
      const { session, mechanics, gameFixture } = fixture([positionId, archetypeId]);
      const before = JSON.stringify(session);
      const context = {
        ...session,
        room: {
          ...session.room,
          projection: { ...session.room.projection, interactiveSnapMaximum: 5 },
        },
      };
      let current = startPositionAlphaGame(context, gameFixture, 0, mechanics)!;
      expect(current.game.type).toBe('ACTIVE');
      let played = 0;
      while (current.game.type === 'ACTIVE') {
        const serialized = JSON.stringify(current);
        const decisionId =
          current.game.pendingSnap.decisionIds[
            played % current.game.pendingSnap.decisionIds.length
          ]!;
        const raw =
          current.positionId === 'position_qb' && current.game.type === 'ACTIVE'
            ? resolveQbSnap(current.game, decisionId)
            : current.positionId === 'position_rb' && current.game.type === 'ACTIVE'
              ? resolveRbSnap(current.game, decisionId)
              : current.positionId === 'position_cb' && current.game.type === 'ACTIVE'
                ? resolveCbSnap(current.game, decisionId)
                : null;
        if (raw === null || !raw.ok) throw new Error('Raw decision failed');
        expect(resolvePositionAlphaSnap(current, 'missing')).toBeNull();
        expect(resolvePositionAlphaSnap(current, null)).toBeNull();
        const result = resolvePositionAlphaSnap(current, decisionId)!;
        expect(result.game).toEqual(raw.state);
        expect(
          resolvePositionAlphaSnap(JSON.parse(serialized) as PositionAlphaGameState, decisionId),
        ).toEqual(result);
        expect(JSON.stringify(current)).toBe(serialized);
        const last = result.game.keyPlayLog.at(-1)!;
        expect(last.decisionId).toBe(decisionId);
        expect(last.rngDrawCountAfter - last.rngDrawCountBefore).toBe(6);
        expect(Object.isFrozen(result.game.keyPlayLog)).toBe(true);
        played += 1;
        current = result;
      }
      expect(played).toBe(5);
      expect(resolvePositionAlphaSnap(current, 'missing')).toBeNull();
      expect(JSON.stringify(session)).toBe(before);
      expect(current.game.rng.drawCount - session.careerRng.drawCount).toBe(30);
    },
  );

  it.each(CASES)(
    '%s passes a fourth-slot build and leaves zero-opportunity feedback truthful',
    (positionId, archetypeId) => {
      const { session, mechanics, gameFixture } = fixture([positionId, archetypeId]);
      const catalog =
        mechanics[positionId === 'position_qb' ? 'qb' : positionId === 'position_rb' ? 'rb' : 'cb']
          .skills;
      const context = {
        ...session,
        room: {
          ...session.room,
          projection: { ...session.room.projection, interactiveSnapMaximum: 5 },
        },
      };
      const start = (slots: readonly ((typeof catalog)[number]['id'] | null)[]) =>
        startPositionAlphaGame(
          { ...context, skills: { equippedSkillIds: slots } },
          gameFixture,
          0,
          mechanics,
        );
      const fourth = start([null, null, null, catalog[0]!.id])!;
      expect(fourth).toEqual(start([catalog[0]!.id, null, null, null]));
      expect(fourth).not.toEqual(start([null, null, null, null]));
      const full = start(catalog.slice(0, 4).map(({ id }) => id))!;
      if (full.game.type !== 'ACTIVE') throw new Error('Expected active full build');
      expect(full.game.equippedSkills).toHaveLength(4);
      expect(start([catalog[0]!.id, catalog[0]!.id])).toBeNull();
      expect(start(catalog.slice(0, 5).map(({ id }) => id))).toBeNull();
      const bench = startPositionAlphaGame(
        {
          ...context,
          room: {
            ...context.room,
            projection: { ...context.room.projection, interactiveSnapMaximum: 0 },
          },
        },
        gameFixture,
        0,
        mechanics,
      )!;
      expect(bench.game.type).toBe('COMPLETE');
      if (bench.game.type !== 'COMPLETE') return;
      expect(bench.game.summary.opportunityCount).toBe(0);
      expect(bench.game.keyPlayLog).toEqual([]);
      expect(bench.game.rng).toEqual(session.careerRng);
      expect(bench.game.summary.participationFeedbackId).toMatch(/review$/);
      const unrelated = mechanics.world.regularSeasonRounds[0]!.fixtures.find(
        (entry) => entry !== gameFixture,
      )!;
      expect(startPositionAlphaGame(context, unrelated, 0, mechanics)).toBeNull();
    },
  );
});
