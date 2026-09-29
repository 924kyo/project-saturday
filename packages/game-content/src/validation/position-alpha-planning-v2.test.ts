import { describe, expect, it } from 'vitest';
import {
  commitPositionAlphaFocusPlanV2,
  advancePositionAlphaGameDayV2,
  projectPositionAlphaGamePreviewV2,
  selectPositionAlphaWeekContextV2,
  resolvePositionAlphaEventV2,
  resolvePositionAlphaInjuryChoiceV2,
  projectPositionAlphaPlanningV2,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  createShippedPositionAlphaSessionV2,
  defaultWrAppearance,
} from '../index.js';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

describe('current planning projection', () => {
  it.each(CASES)(
    '%s previews exact ordered consequences without changing caller, clock or RNG',
    (positionId, archetypeId) => {
      const identity = {
        displayName: '계획 / Planning',
        positionId,
        archetypeId,
        recruitingBackgroundId: 'background_late_bloomer' as const,
        personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
        appearance: defaultWrAppearance,
        heightCm: 188,
        weightKg: 92,
      };
      const created = createShippedPositionAlphaSessionV2({
        careerSeed: `planning-${positionId}`,
        programId: 'program_ember_peak_polytechnic',
        identity,
      });
      if (!created.ok) throw new Error(created.reason);
      const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity })!;
      const session = JSON.parse(JSON.stringify(created.session)) as PositionAlphaSessionV2;
      const before = JSON.stringify(session);
      const calendar = selectPositionAlphaWeekContextV2(session, mechanics)!;
      const fixture = mechanics.world.regularSeasonRounds[0]!.fixtures.find(
        ({ homeProgramId, awayProgramId }) =>
          [homeProgramId, awayProgramId].includes(session.lifecycle.currentProgramId),
      )!;
      expect(calendar).toEqual({ seasonIndex: 0, weekIndex: 0, fixture });
      expect(calendar.fixture).not.toBe(fixture);
      expect(Object.isFrozen(calendar.fixture)).toBe(true);
      expect(Object.keys(calendar).sort()).toEqual(['fixture', 'seasonIndex', 'weekIndex']);
      expect(
        selectPositionAlphaWeekContextV2(
          { ...session, phase: { type: 'SEASON_REVIEW', seasonIndex: 0 } },
          mechanics,
        ),
      ).toBeNull();
      for (const weekIndex of [-1, 14, 0.5])
        expect(
          selectPositionAlphaWeekContextV2(
            { ...session, phase: { type: 'WEEK_PLANNING', weekIndex } },
            mechanics,
          ),
        ).toBeNull();
      const drill = mechanics.trainingActions.find((action) => action.positionId === positionId)!;
      for (const plan of [
        [drill.id, 'action_film_study', 'action_study_hall'],
        [drill.id, drill.id, drill.id],
        ['action_recovery', 'action_recovery', 'action_recovery'],
        ['action_weight_room', 'action_speed_work', 'action_film_study'],
      ]) {
        const projection = projectPositionAlphaPlanningV2(session, plan, mechanics)!;
        const committed = commitPositionAlphaFocusPlanV2(session, plan, mechanics);
        if (!committed.ok || committed.session.gameDay.type === 'IDLE')
          throw new Error('Expected prepared plan');
        expect(projection.preparation).toEqual(committed.session.gameDay.preparation);
        expect(projectPositionAlphaPlanningV2(session, plan, mechanics)).toEqual(projection);
        expect(committed.session.careerRng).toEqual(session.careerRng);
        expect(committed.session.world.rng).toEqual(session.world.rng);
        expect(projectPositionAlphaPlanningV2(committed.session, plan, mechanics)).toBeNull();
        expect(projection.actions).toHaveLength(8);
        expect(projection.actions.every(({ available }) => available)).toBe(true);
        expect(
          projection.actions.find(({ actionId }) => actionId === 'action_recovery')?.proficiency,
        ).toBeNull();
        expect(
          projection.actions.find(({ actionId }) => actionId === 'action_study_hall')?.proficiency,
        ).toBeNull();
        expect(
          projection.actions.find(({ actionId }) => actionId === drill.id)?.proficiency,
        ).toMatchObject({
          uses: 0,
          level: 0,
          nextThreshold: mechanics.trainingConfig.proficiencyUseThresholds[1],
          usesToNextLevel: mechanics.trainingConfig.proficiencyUseThresholds[1],
          nextXpMultiplierPermille: mechanics.trainingConfig.proficiencyXpMultipliersPermille[1],
        });
        expect(Object.isFrozen(projection)).toBe(true);
      }
      for (const plan of [null, [], [drill.id], ['unknown', drill.id, drill.id]]) {
        expect(projectPositionAlphaPlanningV2(session, plan, mechanics)?.preparation).toBeNull();
        expect(commitPositionAlphaFocusPlanV2(session, plan, mechanics).ok).toBe(false);
      }
      const tuned = {
        ...mechanics,
        trainingConfig: {
          ...mechanics.trainingConfig,
          proficiencyUseThresholds: [0, 1, 3, 7, 11, 17] as const,
        },
      };
      expect(
        projectPositionAlphaPlanningV2(session, [], tuned)?.actions[0]?.proficiency?.nextThreshold,
      ).toBe(1);
      expect(JSON.stringify(session)).toBe(before);
      expect(Object.isFrozen(session)).toBe(false);
      expect(Object.isFrozen(session.training)).toBe(false);
      expect(Object.hasOwn(session, 'seasonClock')).toBe(false);
      for (const positiveOpportunity of [false, true]) {
        const source = positiveOpportunity
          ? {
              ...session,
              lifecycle: {
                ...session.lifecycle,
                relationships: session.lifecycle.relationships.map((track) =>
                  track.actorId === 'DIRECT_COMPETITOR' ? { ...track, value: 100 } : track,
                ) as unknown as typeof session.lifecycle.relationships,
              },
            }
          : session;
        const committed = commitPositionAlphaFocusPlanV2(
          source,
          ['action_film_study', 'action_recovery', 'action_study_hall'],
          mechanics,
        );
        if (!committed.ok) throw new Error(committed.reason);
        let previewSession = committed.session;
        expect(projectPositionAlphaGamePreviewV2(previewSession, mechanics)).toBeNull();
        for (let step = 0; step < 10 && previewSession.gameDay.type !== 'GAME_PREVIEW'; step += 1) {
          const day = previewSession.gameDay;
          const advanced =
            day.type === 'EVENT_CHOICE'
              ? resolvePositionAlphaEventV2(previewSession, day.event?.choiceIds[0], mechanics)
              : day.type === 'INJURY_CHOICE'
                ? resolvePositionAlphaInjuryChoiceV2(
                    previewSession,
                    'injury_choice_play_limited',
                    mechanics,
                  )
                : advancePositionAlphaGameDayV2(previewSession, mechanics);
          if (!advanced.ok) throw new Error(advanced.reason);
          previewSession = advanced.session;
        }
        const mutable = JSON.parse(JSON.stringify(previewSession)) as PositionAlphaSessionV2;
        const saved = JSON.stringify(mutable);
        const preview = projectPositionAlphaGamePreviewV2(mutable, mechanics)!;
        expect(selectPositionAlphaWeekContextV2(mutable, mechanics)).toEqual(calendar);
        expect(preview).not.toBeNull();
        expect([calendar.fixture!.homeProgramId, calendar.fixture!.awayProgramId]).toContain(
          preview.opponentProgramId,
        );
        expect(preview.isHome).toBe(
          calendar.fixture!.homeProgramId === session.lifecycle.currentProgramId,
        );
        expect(Object.keys(preview).sort()).toEqual([
          'isHome',
          'opponentProgramId',
          'opportunityCount',
          'playerProgramId',
          'playerState',
          'rank',
          'roleId',
        ]);
        const started = advancePositionAlphaGameDayV2(mutable, mechanics);
        if (
          !started.ok ||
          started.session.gameDay.type === 'IDLE' ||
          started.session.gameDay.game === null
        )
          throw new Error('Expected actual kickoff');
        const game = started.session.gameDay.game.game;
        const actual = game.type === 'ACTIVE' ? game.input : game.summary;
        expect(preview).toMatchObject({
          playerProgramId: actual.playerProgramId,
          opponentProgramId: actual.opponentProgramId,
          isHome: actual.isHome,
          opportunityCount: actual.opportunityCount,
        });
        if (positiveOpportunity) expect(preview.opportunityCount).toBeGreaterThan(0);
        else expect(preview.opportunityCount).toBe(0);
        if (game.type === 'ACTIVE')
          expect(preview.playerState).toMatchObject(game.input.player.state);
        expect(started.session.careerRng).toEqual(mutable.careerRng);
        expect(started.session.world).toEqual(mutable.world);
        expect(projectPositionAlphaGamePreviewV2(mutable, mechanics)).toEqual(preview);
        expect(JSON.stringify(mutable)).toBe(saved);
        expect(Object.isFrozen(mutable.player)).toBe(false);
        expect(Object.isFrozen(preview.playerState)).toBe(true);
        expect(projectPositionAlphaGamePreviewV2(started.session, mechanics)).toBeNull();
      }
      expect(
        projectPositionAlphaPlanningV2(
          { ...session, schemaVersion: 99 } as unknown as PositionAlphaSessionV2,
          [],
          mechanics,
        ),
      ).toBeNull();
    },
  );
});
