import { describe, expect, it } from 'vitest';
import {
  advanceCalendarVNext,
  bestDecisionOfLook,
  breakthroughStateVNext,
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitProgramVNext,
  continueGameVNext,
  createCareerVNext,
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

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

type Play = Readonly<Record<string, unknown>>;

/** Plays one regular season, collecting every live play the kernels resolved. */
function playSeason(positionId: string, archetypeId: string, seed: string) {
  const identity = {
    displayName: 'Scene Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  } as PositionPlayerCreationIdentity;
  const mechanics = buildCareerVNextMechanics(identity)!;
  const ok = (result: CareerVNextResult): CareerVNext => {
    if (!result.ok) throw new Error(result.reason);
    return result.career;
  };
  let career = ok(createCareerVNext({ seed, identity }, mechanics));
  // The weakest offer: more live snaps sooner.
  const offer = [...career.recruiting.offers].sort((a, b) => a.programRating - b.programRating)[0]!;
  career = ok(commitProgramVNext(career, offer.programId, mechanics));
  const plays: { familyId: string; decisionId: string; play: Play }[] = [];
  const looks = new Set<string>();
  let repeatedLookInGame = false;
  for (let guard = 0; guard < 3_000 && career.flow.type !== 'SEASON_REVIEW'; guard += 1) {
    const flow = career.flow;
    if (flow.type === 'WEEK_PLAN') {
      const open = focusDefinitionsVNext(career, mechanics).filter(({ id }) =>
        isFocusAvailableVNext(career, id, mechanics),
      );
      const ids: readonly string[] = open.map(({ id }) => id);
      const drills = open.filter((entry) => 'positionId' in entry).map(({ id }) => id);
      const plan = [drills[0], 'action_film_study', 'action_recovery'].filter(
        (id): id is string => id !== undefined && ids.includes(id),
      );
      while (plan.length < 3) plan.push(ids.find((id) => !plan.includes(id))!);
      career = ok(planWeekVNext(career, plan, mechanics));
    } else if (flow.type === 'CAMP' || flow.type === 'MIDSEASON') {
      career = ok(advanceCalendarVNext(career, mechanics)!);
    } else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
      career = ok(chooseBreakthroughVNext(career, flow.offer.skillIds[0]!));
    else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
      career = ok(chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics));
    else if (flow.type === 'NIL' && flow.offer.decision === null)
      career = ok(chooseNilVNext(career, false, mechanics));
    else if (flow.type === 'INJURY' && flow.report.availability === null)
      career = ok(chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics));
    else if (flow.type === 'GAME') {
      if (flow.game.stage === 'PREGAME') {
        looks.clear();
        career = ok(kickoffVNext(career, mechanics));
      } else if (flow.game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(career, mechanics)!;
        if (frame.kind === 'LIVE' && frame.look !== null) {
          // No look may repeat inside one game (by family and look).
          if (looks.has(frame.look.lookId)) repeatedLookInGame = true;
          looks.add(frame.look.lookId);
        }
        const look =
          frame.kind === 'LIVE' && frame.look !== null
            ? mechanics.looks.looks.find(({ id }) => id === frame.look!.lookId)
            : undefined;
        // Alternate calls so every kind of decision gets resolved.
        const choice =
          frame.kind === 'SIDELINE'
            ? flow.game.sideline[frame.repNumber - 1]!.bestDecisionId
            : look !== undefined && frame.snapNumber % 2 === 0
              ? bestDecisionOfLook(look)
              : frame.decisionIds[frame.snapNumber % frame.decisionIds.length]!;
        career = ok(chooseSnapVNext(career, choice, mechanics));
        const engine = career.flow.type === 'GAME' ? career.flow.game.engine : null;
        const log = (engine?.game as { keyPlayLog?: readonly Play[] } | undefined)?.keyPlayLog;
        const last = log?.at(-1);
        if (frame.kind === 'LIVE' && last !== undefined)
          plays.push({
            familyId: String(last['familyId']),
            decisionId: String(last['decisionId']),
            play: last,
          });
      } else career = ok(continueGameVNext(career, mechanics));
    } else if (flow.type === 'POST_GAME') career = ok(nextWeekVNext(career, mechanics));
    else career = ok(toGameDayVNext(career, mechanics));
  }
  return { plays, repeatedLookInGame, career, mechanics };
}

describe('scene rules: results never contradict the scene or the call', () => {
  it('a cornerback is thrown at when the ball is already in the air, and a catch already made is a catch', () => {
    const { plays, repeatedLookInGame } = playSeason(
      'position_cb',
      'archetype_cb_press_man',
      'scene-cb',
    );
    const airborne = plays.filter(({ familyId }) => familyId === 'key_snap_family_cb_ball');
    const afterCatch = plays.filter(({ familyId }) => familyId === 'key_snap_family_cb_tackle');
    expect(airborne.length + afterCatch.length).toBeGreaterThan(0);
    for (const { play } of airborne) expect(play['playResult']).not.toBe('NO_TARGET');
    for (const { play, decisionId } of afterCatch) {
      expect(['TACKLE', 'MISSED_TACKLE', 'FORCED_FUMBLE'], decisionId).toContain(
        play['playResult'],
      );
      expect(play['interception']).toBe(0);
      expect(play['passDefended']).toBe(0);
    }
    expect(repeatedLookInGame).toBe(false);
  }, 300_000);

  it('a quarterback who slides early never breaks away for a touchdown', () => {
    const { plays, repeatedLookInGame } = playSeason(
      'position_qb',
      'archetype_qb_field_general',
      'scene-qb',
    );
    const slides = plays.filter(
      ({ decisionId }) => decisionId === 'key_snap_decision_qb_slide_early',
    );
    for (const { play } of slides) expect(play['rushingTouchdownDelta']).toBe(0);
    expect(repeatedLookInGame).toBe(false);
  }, 300_000);

  it('reports a collection state the gauge can reach', () => {
    const { career, mechanics } = playSeason('position_rb', 'archetype_rb_power_back', 'scene-rb');
    const state = breakthroughStateVNext(career, mechanics);
    expect(state.remaining).toBeGreaterThanOrEqual(0);
    expect(state.complete).toBe(state.remaining === 0);
  }, 300_000);
});
