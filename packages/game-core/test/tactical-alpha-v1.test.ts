import { describe, expect, it } from 'vitest';
import { createRng, nextUint32 } from '../src/random/rng.js';
import {
  prepareTacticalAlphaSnapV1,
  resolveTacticalAlphaBackgroundV1,
  resolveTacticalFieldV1,
  type TacticalFieldRequestV1,
} from '../src/games/tactical-alpha-v1.js';
import {
  isTacticalSnapContextV1,
  type TacticalSnapContextV1,
} from '../src/games/tactical-context-v1.js';

function input() {
  return {
    gameId: 'game_tactical_alpha_test' as const,
    positionId: 'position_qb' as const,
    opportunityCount: 5,
    snapIndex: 0,
    playerTeamRating: 70,
    opponentDefenseRating: 60,
    opponentOffenseRating: 65,
    score: { playerTeam: 0, opponent: 0 },
    decisionIds: ['key_snap_decision_a', 'key_snap_decision_b', 'key_snap_decision_c'] as const,
    revealedClueIds: ['game_clue_earned'] as const,
    rng: createRng('tactical-alpha-fixture'),
  };
}
function context(): TacticalSnapContextV1 {
  return {
    ...prepareTacticalAlphaSnapV1(input())!.context,
    field: {
      offense: 'PLAYER',
      lineOfScrimmageYards: 80,
      down: 4,
      distanceYards: 10,
      driveIndex: 4,
    },
    score: { playerTeam: 7, opponent: 10 },
  };
}
function request(): TacticalFieldRequestV1 {
  return {
    decisionId: 'key_snap_decision_a',
    kind: 'ADVANCE',
    yards: 6,
    touchdown: false,
    fumbleLost: false,
  };
}

describe('staged owning-core tactical rules', () => {
  it.each(['position_qb', 'position_rb', 'position_cb'] as const)(
    'prepares bounded %s context with exactly five distinct pre-choice draws',
    (positionId) => {
      for (let opportunityCount = 1; opportunityCount <= 5; opportunityCount += 1) {
        let lastTime = 3601;
        for (let snapIndex = 0; snapIndex < opportunityCount; snapIndex += 1) {
          const source = { ...input(), positionId, opportunityCount, snapIndex };
          const before = JSON.stringify(source);
          const prepared = prepareTacticalAlphaSnapV1(source)!;
          expect(isTacticalSnapContextV1(prepared.context)).toBe(true);
          expect(prepareTacticalAlphaSnapV1(source)).toEqual(prepared);
          let expectedRng = source.rng;
          for (let draw = 0; draw < 5; draw += 1) expectedRng = nextUint32(expectedRng).nextRng;
          expect(prepared.rng).toEqual(expectedRng);
          expect(JSON.stringify(source)).toBe(before);
          expect(Object.isFrozen(source.score)).toBe(false);
          expect(prepared.context.field.offense).toBe(
            positionId === 'position_cb' ? 'OPPONENT' : 'PLAYER',
          );
          const remaining =
            (4 - prepared.context.clock.period) * 900 + prepared.context.clock.secondsRemaining;
          expect(remaining).toBeLessThan(lastTime);
          lastTime = remaining;
          expect([0, 3, 7]).toContain(prepared.context.score.playerTeam);
          expect([0, 3, 7]).toContain(prepared.context.score.opponent);
        }
      }
    },
  );

  it('rejects invalid preparation/exhausted RNG and never creates zero-opportunity context', () => {
    const base = input();
    for (const bad of [
      { ...base, opportunityCount: 0 },
      { ...base, opportunityCount: 6 },
      { ...base, snapIndex: 5 },
      { ...base, snapIndex: -1 },
      { ...base, playerTeamRating: NaN },
      { ...base, opponentDefenseRating: 101 },
      { ...base, score: { playerTeam: 194, opponent: 0 } },
      { ...base, rng: { ...base.rng, drawCount: Number.MAX_SAFE_INTEGER - 4 } },
      { ...base, revealedClueIds: ['not_a_clue'] },
    ])
      expect(prepareTacticalAlphaSnapV1(bad as typeof base)).toBeUndefined();
    const background = resolveTacticalAlphaBackgroundV1(base)!;
    expect(background.rng.drawCount).toBe(2);
    expect(
      resolveTacticalAlphaBackgroundV1({
        ...base,
        rng: { ...base.rng, drawCount: Number.MAX_SAFE_INTEGER - 1 },
      }),
    ).toBeUndefined();
  });

  it('credits a touchdown to the goal, suppresses it on a lost fumble, and bounds non-scoring yards', () => {
    const before = context();
    const td = resolveTacticalFieldV1(before, { ...request(), touchdown: true })!;
    expect(td.ball).toEqual({ endLineYards: 100, offenseYards: 20, outcome: 'TOUCHDOWN' });
    expect(td.scoreAfter).toEqual({ playerTeam: 14, opponent: 10 });
    expect(td.possessionAfter).toBe('KICKOFF');
    expect(td.before).toEqual(before);
    expect(td.before).not.toBe(before);
    expect(Object.isFrozen(before.field)).toBe(false);
    expect(Object.isFrozen(td.before.field)).toBe(true);
    const fumble = resolveTacticalFieldV1(before, {
      ...request(),
      touchdown: true,
      fumbleLost: true,
    })!;
    expect(fumble.ball).toEqual({ endLineYards: 86, offenseYards: 6, outcome: 'FUMBLE_LOST' });
    expect(fumble.scoreAfter).toEqual(before.score);
    expect(fumble.possessionOutcome).toBe('FUMBLE_LOST');
    expect(fumble.possessionAfter).toBe('OPPONENT');
    expect(resolveTacticalFieldV1(before, { ...request(), yards: 100 })!.ball).toEqual({
      endLineYards: 99,
      offenseYards: 19,
      outcome: 'STOPPED',
    });
    const defense = {
      ...before,
      positionId: 'position_cb' as const,
      field: { ...before.field, offense: 'OPPONENT' as const },
    };
    expect(resolveTacticalFieldV1(defense, { ...request(), touchdown: true })!.scoreAfter).toEqual({
      playerTeam: 7,
      opponent: 17,
    });
  });

  it('distinguishes fourth-down stops, sacks, interception spots and untracked assignments', () => {
    const before = context();
    expect(resolveTacticalFieldV1(before, request())!.possessionOutcome).toBe('TURNOVER_ON_DOWNS');
    expect(resolveTacticalFieldV1(before, { ...request(), yards: 10 })!.possessionOutcome).toBe(
      'RETAINED',
    );
    const sack = resolveTacticalFieldV1(before, { ...request(), kind: 'SACK', yards: 0 })!;
    expect(sack.ball).toEqual({ endLineYards: 75, offenseYards: -5, outcome: 'SACK' });
    expect(sack.possessionOutcome).toBe('TURNOVER_ON_DOWNS');
    const intercepted = resolveTacticalFieldV1(before, { ...request(), kind: 'INTERCEPTION' })!;
    expect(intercepted.ball).toEqual({
      endLineYards: 86,
      offenseYards: 0,
      outcome: 'INTERCEPTION',
    });
    expect(intercepted.possessionOutcome).toBe('INTERCEPTION');
    const incomplete = resolveTacticalFieldV1(before, { ...request(), kind: 'INCOMPLETE' })!;
    expect(incomplete.ball).toEqual({ endLineYards: 80, offenseYards: 0, outcome: 'INCOMPLETE' });
    const untracked = resolveTacticalFieldV1(before, { ...request(), kind: 'UNTRACKED' })!;
    expect(untracked.ball).toEqual({
      endLineYards: null,
      offenseYards: null,
      outcome: 'UNTRACKED',
    });
    expect(untracked.possessionAfter).toBeNull();
    expect(untracked.scoreAfter).toEqual(before.score);
  });

  it('rejects unsupported requests and score overflow instead of inventing a fallback result', () => {
    for (const bad of [
      { ...request(), decisionId: 'key_snap_decision_not_offered' },
      { ...request(), kind: 'FUTURE' },
      { ...request(), yards: -1 },
      { ...request(), yards: Infinity },
      { ...request(), kind: 'INCOMPLETE', touchdown: true },
      { ...request(), kind: 'INTERCEPTION', fumbleLost: true },
      { ...request(), touchdown: undefined },
    ])
      expect(resolveTacticalFieldV1(context(), bad as TacticalFieldRequestV1)).toBeUndefined();
    expect(
      resolveTacticalFieldV1(
        { ...context(), score: { playerTeam: 194, opponent: 0 } },
        { ...request(), touchdown: true },
      ),
    ).toBeUndefined();
  });
});
