import { describe, expect, it } from 'vitest';

import {
  commitShippedPositionAlphaOffseason,
  chooseShippedPositionAlphaSkill,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  equipShippedPositionAlphaSkill,
  parseShippedPositionAlphaSessionJson,
  positionAlphaContent,
  resolveShippedPositionAlphaSeason,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaWeek,
} from '../index.js';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

function create(positionId: (typeof CASES)[number][0], archetypeId: (typeof CASES)[number][1]) {
  return createShippedPositionAlphaSession({
    careerSeed: `m7-production-session-${positionId}`,
    programId: 'program_ember_peak_polytechnic',
    identity: {
      displayName: 'Saturday Alpha',
      positionId,
      archetypeId,
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      appearance: defaultWrAppearance,
      heightCm: 188,
      weightKg: 92,
    },
  });
}

describe('M7 production position-session foundation', () => {
  it.each(CASES)('creates and strictly round-trips %s', (positionId, archetypeId) => {
    const result = create(positionId, archetypeId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session).toMatchObject({
      schemaVersion: 1,
      model: 'position_alpha_session_v1',
      contentSchemaVersion: 9,
      revision: 0,
      phase: { type: 'WEEK_PLANNING', weekIndex: 0 },
      player: { positionId },
      lifecycle: {
        positionId,
        currentProgramId: 'program_ember_peak_polytechnic',
      },
      world: {
        seasonIndex: 0,
        playerProgramId: 'program_ember_peak_polytechnic',
        completedRegularSeasonRoundCount: 0,
      },
    });
    expect(result.session.careerRng.drawCount).toBe(35);
    expect(result.session.world.programRecords).toHaveLength(32);
    expect(parseShippedPositionAlphaSessionJson(JSON.stringify(result.session))).toEqual(
      result.session,
    );
    expect(Object.isFrozen(result.session)).toBe(true);
  });

  it('rejects WR, future schemas, cross-position state, and added keys', () => {
    const valid = create('position_qb', 'archetype_qb_field_general');
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;
    expect(
      createShippedPositionAlphaSession({
        careerSeed: 'wr-not-on-new-wire',
        programId: 'program_ember_peak_polytechnic',
        identity: {
          ...valid.session.player,
          positionId: 'position_wr' as never,
          archetypeId: 'archetype_wr_deep_threat',
        },
      }),
    ).toEqual({ ok: false, reason: 'position_alpha_session.invalid_input' });
    for (const changed of [
      { ...valid.session, schemaVersion: 2 },
      { ...valid.session, future: true },
      {
        ...valid.session,
        training: { ...valid.session.training, positionId: 'position_rb' },
      },
      {
        ...valid.session,
        lifecycle: { ...valid.session.lifecycle, currentProgramId: 'program_ironwood' },
      },
    ]) {
      expect(parseShippedPositionAlphaSessionJson(JSON.stringify(changed))).toBeNull();
    }
  });

  it.each(CASES)(
    'executes a deterministic full regular season for %s',
    (positionId, archetypeId) => {
      const created = create(positionId, archetypeId);
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      let session = created.session;
      const actions = positionAlphaContent.trainingActions.filter(
        (action) => action.positionId === positionId,
      );
      expect(actions).toHaveLength(3);
      for (let weekIndex = 0; weekIndex < 12; weekIndex += 1) {
        const before = session;
        const resolved = resolveShippedPositionAlphaWeek(
          session,
          actions[weekIndex % actions.length]!.id,
          weekIndex % 2 === 0 ? 'best_fit' : 'risk_seeking',
        );
        expect(resolved.ok).toBe(true);
        expect(session).toBe(before);
        if (!resolved.ok) return;
        session = resolved.session;
        if (session.skills.offeredSkillIds !== null) {
          const chosen = chooseShippedPositionAlphaSkill(
            session,
            session.skills.offeredSkillIds[0],
          );
          expect(chosen.ok).toBe(true);
          if (!chosen.ok) return;
          session = chosen.session;
        }
        if (session.events.pending !== null) {
          const event = resolveShippedPositionAlphaEvent(
            session,
            session.events.pending.choiceIds[0],
          );
          expect(event.ok).toBe(true);
          if (!event.ok) return;
          session = event.session;
        }
        expect(parseShippedPositionAlphaSessionJson(JSON.stringify(session))).toEqual(session);
        expect(session.weekHistory).toHaveLength(weekIndex + 1);
        expect(session.world.completedRegularSeasonRoundCount).toBe(weekIndex + 1);
      }
      expect(session.phase).toEqual({ type: 'SEASON_REVIEW', seasonIndex: 0 });
      expect(session.revision).toBeGreaterThan(12);
      expect(session.weekHistory.every(({ stats }) => stats.positionId === positionId)).toBe(true);
      expect(
        session.weekHistory.every(
          ({ relationships, injuryExposure, eligibility }) =>
            relationships.positionId === positionId &&
            injuryExposure.positionId === positionId &&
            eligibility.positionId === positionId,
        ),
      ).toBe(true);
    },
  );

  it('rejects an unavailable weekly command without mutation and replays exactly', () => {
    const left = create('position_qb', 'archetype_qb_field_general');
    const right = create('position_qb', 'archetype_qb_field_general');
    expect(left.ok && right.ok).toBe(true);
    if (!left.ok || !right.ok) return;
    const snapshot = JSON.stringify(left.session);
    expect(
      resolveShippedPositionAlphaWeek(left.session, 'weekly_action_rb_gap_read', 'best_fit'),
    ).toEqual({ ok: false, reason: 'position_alpha_session.invalid_command' });
    expect(JSON.stringify(left.session)).toBe(snapshot);
    const action = positionAlphaContent.trainingActions.find(
      ({ positionId }) => positionId === 'position_qb',
    )!;
    expect(resolveShippedPositionAlphaWeek(left.session, action.id, 'best_fit')).toEqual(
      resolveShippedPositionAlphaWeek(right.session, action.id, 'best_fit'),
    );
  });

  it('creates deterministic three-card breakthroughs and equips the chosen build without rerolls', () => {
    const left = create('position_qb', 'archetype_qb_field_general');
    const right = create('position_qb', 'archetype_qb_field_general');
    expect(left.ok && right.ok).toBe(true);
    if (!left.ok || !right.ok) return;
    const action = positionAlphaContent.trainingActions.find(
      ({ positionId }) => positionId === 'position_qb',
    )!;
    let leftSession = left.session;
    let rightSession = right.session;
    while (leftSession.skills.offeredSkillIds === null) {
      const nextLeft = resolveShippedPositionAlphaWeek(leftSession, action.id, 'best_fit');
      const nextRight = resolveShippedPositionAlphaWeek(rightSession, action.id, 'best_fit');
      expect(nextLeft).toEqual(nextRight);
      expect(nextLeft.ok).toBe(true);
      if (!nextLeft.ok || !nextRight.ok) return;
      leftSession = nextLeft.session;
      rightSession = nextRight.session;
      if (leftSession.events.pending !== null && rightSession.events.pending !== null) {
        const nextEventLeft = resolveShippedPositionAlphaEvent(
          leftSession,
          leftSession.events.pending.choiceIds[0],
        );
        const nextEventRight = resolveShippedPositionAlphaEvent(
          rightSession,
          rightSession.events.pending.choiceIds[0],
        );
        expect(nextEventLeft).toEqual(nextEventRight);
        expect(nextEventLeft.ok).toBe(true);
        if (!nextEventLeft.ok || !nextEventRight.ok) return;
        leftSession = nextEventLeft.session;
        rightSession = nextEventRight.session;
      }
    }
    expect(leftSession.skills.offeredSkillIds).toHaveLength(3);
    expect(new Set(leftSession.skills.offeredSkillIds)).toHaveProperty('size', 3);
    expect(leftSession.skills.breakthroughGauge).toBeGreaterThanOrEqual(100);
    const snapshot = JSON.stringify(leftSession);
    expect(chooseShippedPositionAlphaSkill(leftSession, 'skill_qb_not_offered')).toEqual({
      ok: false,
      reason: 'position_alpha_session.invalid_command',
    });
    expect(JSON.stringify(leftSession)).toBe(snapshot);
    const selected = leftSession.skills.offeredSkillIds[1];
    const chosen = chooseShippedPositionAlphaSkill(leftSession, selected);
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    expect(chosen.session.skills).toMatchObject({
      ownedSkillIds: [selected],
      equippedSkillIds: [selected, null, null],
      offeredSkillIds: null,
    });
    const moved = equipShippedPositionAlphaSkill(chosen.session, selected, 2);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.session.skills.equippedSkillIds).toEqual([null, null, selected]);
    expect(parseShippedPositionAlphaSessionJson(JSON.stringify(moved.session))).toEqual(
      moved.session,
    );
  });

  it.each(CASES)(
    'completes two saved seasons and alumni history for %s',
    (positionId, archetypeId) => {
      const created = create(positionId, archetypeId);
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const actions = positionAlphaContent.trainingActions.filter(
        (action) => action.positionId === positionId,
      );
      let session = created.session;
      for (let seasonIndex = 0; seasonIndex < 2; seasonIndex += 1) {
        for (let weekIndex = 0; weekIndex < 12; weekIndex += 1) {
          const resolved = resolveShippedPositionAlphaWeek(
            session,
            actions[weekIndex % actions.length]!.id,
            weekIndex % 2 === 0 ? 'best_fit' : 'risk_seeking',
          );
          expect(resolved.ok).toBe(true);
          if (!resolved.ok) return;
          session = resolved.session;
          if (session.skills.offeredSkillIds !== null) {
            const chosen = chooseShippedPositionAlphaSkill(
              session,
              session.skills.offeredSkillIds[0],
            );
            expect(chosen.ok).toBe(true);
            if (!chosen.ok) return;
            session = chosen.session;
          }
          if (session.events.pending !== null) {
            const event = resolveShippedPositionAlphaEvent(
              session,
              session.events.pending.choiceIds[0],
            );
            expect(event.ok).toBe(true);
            if (!event.ok) return;
            session = event.session;
          }
        }
        const reviewed = resolveShippedPositionAlphaSeason(session, 'best_fit');
        expect(reviewed.ok).toBe(true);
        if (!reviewed.ok) return;
        session = reviewed.session;
        expect(session.phase).toEqual({ type: 'OFFSEASON_DECISION', seasonIndex });
        expect(session.lifecycle.completedSeasons).toHaveLength(seasonIndex + 1);
        expect(session.worldHistory.detailedSeasons).toHaveLength(seasonIndex + 1);
        expect(parseShippedPositionAlphaSessionJson(JSON.stringify(session))).toEqual(session);
        const option = session.lifecycle.offseason?.options[seasonIndex === 0 ? 1 : 0];
        expect(option).toBeDefined();
        if (option === undefined) return;
        const committed = commitShippedPositionAlphaOffseason(session, option.programId);
        expect(committed.ok).toBe(true);
        if (!committed.ok) return;
        session = committed.session;
        expect(parseShippedPositionAlphaSessionJson(JSON.stringify(session))).toEqual(session);
      }
      expect(session.phase).toEqual({ type: 'CAREER_COMPLETE', seasonIndex: 1 });
      expect(session.meta?.alumni).toHaveLength(1);
      expect(session.meta?.alumni[0]?.positionId).toBe(positionId);
      expect(session.meta?.alumni[0]?.seasonSummaries).toHaveLength(2);
    },
  );
});
