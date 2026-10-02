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
  depthMovementReasonVNext,
  explainGamePlaysVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextManUpVNext,
  nextWeekVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  rivalWeekVNext,
  roleStatusVNext,
  snapElapsedSecondsVNext,
  snapMomentVNext,
  toGameDayVNext,
  updatePositionRoomAfterPractice,
  VNEXT_CLOSING_DRIVE_SECONDS,
  VNEXT_NEXT_MAN_TUNING,
  VNEXT_ROLE_SNAP_WINDOWS,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type DepthRoleId,
  type PositionPlayerCreationIdentity,
  type PositionRoomContext,
  type PracticeReportVNext,
  type VNextPositionId,
} from '@project-saturday/game-core';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';
import { localeMessages } from '../locales/index.js';

const ok = (result: CareerVNextResult): CareerVNext => {
  if (!result.ok) throw new Error(result.reason);
  return result.career;
};

function identity(
  positionId: VNextPositionId = 'position_cb',
  archetypeId = 'archetype_cb_press_man',
): PositionPlayerCreationIdentity {
  return {
    displayName: 'Role Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 186,
    weightKg: 88,
  } as PositionPlayerCreationIdentity;
}

function plan(career: CareerVNext, mechanics: CareerVNextMechanics): string[] {
  const open = focusDefinitionsVNext(career, mechanics)
    .map(({ id }) => id as string)
    .filter((id) => isFocusAvailableVNext(career, id, mechanics));
  const drills = focusDefinitionsVNext(career, mechanics)
    .filter((entry) => 'positionId' in entry)
    .map(({ id }) => id as string)
    .filter((id) => open.includes(id));
  const picks = [drills[0] ?? open[0]!, 'action_film_study', 'action_recovery'].filter((id) =>
    open.includes(id),
  );
  while (picks.length < 3) picks.push(open.find((id) => !picks.includes(id))!);
  return picks;
}

/** Plays forward with default choices until `stop` holds, collecting practice reports. */
function drive(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  stop: (career: CareerVNext) => boolean,
  onReport: (
    before: CareerVNext,
    after: CareerVNext,
    report: PracticeReportVNext,
  ) => void = () => {},
): CareerVNext {
  let current = career;
  for (let guard = 0; guard < 4_000 && !stop(current); guard += 1) {
    const flow = current.flow;
    if (flow.type === 'CAMP') current = ok(advanceCalendarVNext(current, mechanics)!);
    else if (flow.type === 'MIDSEASON') current = ok(decideMidseasonVNext(current, false));
    else if (flow.type === 'WEEK_PLAN') {
      const next = ok(planWeekVNext(current, plan(current, mechanics), mechanics));
      if (next.flow.type === 'PRACTICE_REPORT') onReport(current, next, next.flow.report);
      current = next;
    } else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
      current = ok(chooseBreakthroughVNext(current, flow.offer.skillIds[0]!));
    else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
      current = ok(chooseEventVNext(current, flow.event.choiceIds[0]!, mechanics));
    else if (flow.type === 'NIL' && flow.offer.decision === null)
      current = ok(chooseNilVNext(current, false, mechanics));
    else if (flow.type === 'INJURY' && flow.report.availability === null)
      current = ok(chooseInjuryVNext(current, 'injury_choice_rest_rehab', mechanics));
    else if (flow.type === 'GAME') {
      if (flow.game.stage === 'PREGAME') current = ok(kickoffVNext(current, mechanics));
      else if (flow.game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(current, mechanics)!;
        current = ok(chooseSnapVNext(current, frame.decisionIds[0]!, mechanics));
      } else current = ok(continueGameVNext(current, mechanics));
    } else if (flow.type === 'POST_GAME') current = ok(nextWeekVNext(current, mechanics));
    else if (flow.type === 'SEASON_REVIEW' || flow.type === 'OFFSEASON') break;
    else current = ok(toGameDayVNext(current, mechanics));
  }
  return current;
}

function start(seed: string, positionId?: VNextPositionId, archetypeId?: string) {
  const id = identity(positionId, archetypeId);
  const mechanics = buildCareerVNextMechanics(id)!;
  const created = ok(createCareerVNext({ seed, identity: id }, mechanics));
  const committed = ok(
    commitProgramVNext(created, created.recruiting.offers[1]!.programId, mechanics),
  );
  return { mechanics, committed };
}

const playerOf = (room: PositionRoomContext) =>
  room.evaluations.find(({ participantId }) => participantId === room.playerId)!;
const scoreOf = (room: PositionRoomContext, id: string) =>
  room.evaluations.find(({ participantId }) => participantId === id)!.totalScoreMilli;

describe('ROLE-01: execution factors shown are the kernel inputs', () => {
  it('names the pattern’s key attribute at the rating the game was played with', () => {
    const { mechanics, committed } = start('role-01', 'position_qb', 'archetype_qb_field_general');
    const after = drive(committed, mechanics, (career) => career.flow.type === 'POST_GAME');
    if (after.flow.type !== 'POST_GAME') throw new Error(after.flow.type);
    const recap = after.flow.recap;
    // The ratings the kernel played with: kickoff ratings, recorded in the growth evidence.
    const growth = (
      recap.engine.game as unknown as {
        growth: { attributeXp: readonly { attributeId: string; ratingBefore: number }[] };
      }
    ).growth.attributeXp;
    const kickoff = (attributeId: string) =>
      growth.find((entry) => entry.attributeId === attributeId)?.ratingBefore ??
      (after.athlete.profile.attributes as unknown as Record<string, { rating: number }>)[
        attributeId
      ]!.rating;
    const explained = explainGamePlaysVNext(
      after,
      recap.engine,
      recap.weekIndex,
      mechanics,
      recap.lookIds,
    );
    expect(explained.length).toBeGreaterThan(0);
    for (const explanation of explained) {
      const attribute = explanation.execution.attribute;
      if (attribute !== null) expect(attribute.rating).toBe(kickoff(attribute.attributeId));
      if (explanation.execution.chancePermille !== null) {
        expect(explanation.execution.chancePermille).toBeGreaterThanOrEqual(0);
        expect(explanation.execution.chancePermille).toBeLessThanOrEqual(1000);
      }
    }
  });
});

describe('ROLE-03 and ROLE-06: role security and why the chart moved', () => {
  it('classifies the margin by the hysteresis rule and names the deciding component', () => {
    const { mechanics, committed } = start('role-03');
    const threshold = mechanics.room.hysteresisThresholdMilli;
    let demotions = 0;
    let promotions = 0;
    const seen = new Set<string>();
    drive(
      committed,
      mechanics,
      () => false,
      (before, after, report) => {
        const status = roleStatusVNext(before.program!.room, mechanics)!;
        seen.add(status.status);
        const room = before.program!.room;
        const below = room.evaluations[playerOf(room).rank];
        if (below !== undefined) {
          const margin = playerOf(room).totalScoreMilli - below.totalScoreMilli;
          expect(status.status).toBe(
            margin >= threshold ? 'SECURE' : margin >= 0 ? 'CONTESTED' : 'AT_RISK',
          );
          expect(status.pointsToLose).toBeCloseTo(
            Math.max(0, Math.ceil((margin + threshold) / 100) / 10),
            5,
          );
        }
        const depth = report.depth;
        if (depth.movement === 'DEMOTED') {
          demotions += 1;
          // The movement rule: whoever passed needs a lead of at least the margin afterwards.
          const room = after.program!.room;
          expect(
            scoreOf(room, depth.neighborParticipantId!) - playerOf(room).totalScoreMilli,
          ).toBeGreaterThanOrEqual(threshold);
        }
        if (depth.movement === 'PROMOTED') promotions += 1;
        // The report's reason is the updated room's own largest lead.
        expect(report.movementReason ?? null).toEqual(
          depthMovementReasonVNext(after.program!.room, depth),
        );
        if (depth.movement !== 'HELD') expect(report.movementReason).toBeDefined();
      },
    );
    expect(promotions + demotions).toBeGreaterThan(0);
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('ROLE-04: credible promotion and demotion (controlled)', () => {
  const { mechanics, committed } = start('role-04');
  const room0 = committed.program!.room;
  const attributes = committed.athlete.profile.attributes;

  /** Weeks of the same practice score, with the room practicing too, until the role changes. */
  function weeksUntil(
    room: PositionRoomContext,
    score: number,
    moved: 'PROMOTED' | 'DEMOTED',
    limit = 12,
  ): number | null {
    let current = room;
    for (let week = 1; week <= limit; week += 1) {
      current = rivalWeekVNext(current, 'role-04', 0, week, mechanics.room);
      const updated = updatePositionRoomAfterPractice(current, attributes, score, mechanics.room);
      if (!updated.ok) throw new Error(updated.reason);
      if (updated.evidence.movement === moved) return week;
      current = updated.context;
    }
    return null;
  }

  /** The same room with the athlete placed at `rank` and trust `trust`. */
  function placed(rank: number, trust: number): PositionRoomContext {
    const player = playerOf(room0);
    const others = room0.evaluations.filter((entry) => entry !== player);
    const order = [...others.slice(0, rank - 1), player, ...others.slice(rank - 1)];
    return {
      ...room0,
      playerCoachTrust: trust,
      depthOrderIds: order.map(({ participantId }) => participantId),
      evaluations: order.map((entry, index) => ({ ...entry, rank: index + 1 })),
    };
  }

  it('bad practice demotes a starter within a few weeks; trust buffers it', () => {
    const low = weeksUntil(placed(1, 40), 15, 'DEMOTED');
    const high = weeksUntil(placed(1, 95), 15, 'DEMOTED');
    expect(low).not.toBeNull();
    expect(low!).toBeLessThanOrEqual(8);
    expect(high === null || high > low!).toBe(true);
  });

  it('good practice promotes a backup within a few weeks', () => {
    const weeks = weeksUntil(placed(3, 50), 95, 'PROMOTED');
    expect(weeks).not.toBeNull();
    expect(weeks!).toBeLessThanOrEqual(6);
  });

  it('a missed game hands the snaps, the trust and the experience to the next man up', () => {
    const room = placed(1, 70);
    const next = nextManUpVNext(room, mechanics.room);
    const below = room.evaluations[1]!;
    const competitorBefore = room.competitors.find(({ id }) => id === below.participantId)!;
    const competitorAfter = next.competitors.find(({ id }) => id === below.participantId)!;
    expect(competitorAfter.coachTrust).toBe(
      Math.min(100, competitorBefore.coachTrust + VNEXT_NEXT_MAN_TUNING.trust),
    );
    expect(competitorAfter.experienceReadiness).toBe(
      Math.min(100, competitorBefore.experienceReadiness + VNEXT_NEXT_MAN_TUNING.experience),
    );
    expect(scoreOf(next, below.participantId)).toBeGreaterThan(below.totalScoreMilli);
    // The athlete keeps the slot until practice decides it.
    expect(playerOf(next).rank).toBe(1);
  });
});

describe('ROLE-05: role-aware snap moments', () => {
  it('starters close the game, rotation plays the middle, reserves get late packages', () => {
    const roles: DepthRoleId[] = [
      'depth_role_starter',
      'depth_role_rotation',
      'depth_role_reserve',
      'depth_role_developmental',
    ];
    for (const roleId of roles)
      for (const count of [1, 2, 3, 5])
        for (let seed = 0; seed < 60; seed += 1) {
          const times = Array.from({ length: count }, (_, index) =>
            snapElapsedSecondsVNext(`moment-${seed}-${index}`, index, count, roleId),
          );
          // In order, inside the game.
          for (let index = 1; index < count; index += 1)
            expect(times[index]!).toBeGreaterThan(times[index - 1]!);
          const [from, to] = VNEXT_ROLE_SNAP_WINDOWS[roleId];
          if (roleId === 'depth_role_starter') {
            if (count > 1) {
              expect(times.at(-1)!).toBeGreaterThanOrEqual(3600 - VNEXT_CLOSING_DRIVE_SECONDS);
              expect(snapMomentVNext(roleId, count - 1, count)).toBe('CLOSING_DRIVE');
            }
          } else
            for (const time of times) {
              expect(time).toBeGreaterThanOrEqual(from - 1);
              expect(time).toBeLessThanOrEqual(to);
            }
        }
    expect(snapMomentVNext('depth_role_rotation', 0, 2)).toBe('ROTATION_SERIES');
    expect(snapMomentVNext('depth_role_reserve', 0, 1)).toBe('LATE_PACKAGE');
  });

  it('ships the involvement, status and reason copy in both languages', () => {
    for (const locale of ['en-US', 'ko-KR'] as const) {
      const messages = localeMessages[locale] as Readonly<Record<string, string>>;
      for (const key of [
        'v2.pregame.involvement.starter',
        'v2.pregame.involvement.rotation',
        'v2.pregame.involvement.reserve',
        'v2.pregame.involvement.developmental',
        'v2.roleStatus.secure',
        'v2.roleStatus.contested',
        'v2.roleStatus.atRisk',
        'v2.report.reason.yours',
        'v2.report.reason.theirs',
        'v2.report.reason.rivalForm',
      ])
        expect(messages[key], key).toBeTruthy();
    }
  });
});
