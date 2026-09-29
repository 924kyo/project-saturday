import { describe, expect, it } from 'vitest';
import {
  copyTacticalSnapContextV1,
  isTacticalSnapContextV1,
  TACTICAL_POSITION_IDS,
  type TacticalSnapContextV1,
} from '../src/games/tactical-context-v1.js';

function context(): TacticalSnapContextV1 {
  return {
    model: 'tactical_snap_context_v1',
    gameId: 'game_tactical_fixture',
    snapIndex: 0,
    positionId: 'position_wr',
    clock: { period: 2, secondsRemaining: 120 },
    field: {
      offense: 'PLAYER',
      driveIndex: 3,
      down: 3,
      distanceYards: 7,
      lineOfScrimmageYards: 42,
    },
    score: { playerTeam: 7, opponent: 10 },
    decisionIds: ['key_snap_decision_one', 'key_snap_decision_two', 'key_snap_decision_three'],
    revealedClueIds: ['game_clue_earned'],
  };
}

describe('versioned authoritative tactical pre-snap evidence', () => {
  it.each(TACTICAL_POSITION_IDS)(
    'detaches and round-trips %s without owning caller state',
    (positionId) => {
      const source = {
        ...context(),
        positionId,
        field: {
          ...context().field,
          offense: ['position_qb', 'position_rb', 'position_wr'].includes(positionId)
            ? ('PLAYER' as const)
            : ('OPPONENT' as const),
        },
      };
      const before = JSON.stringify(source);
      const copied = copyTacticalSnapContextV1(source)!;
      expect(copied).toEqual(source);
      expect(copied).not.toBe(source);
      for (const key of ['clock', 'field', 'score', 'decisionIds', 'revealedClueIds'] as const) {
        expect(copied[key]).not.toBe(source[key]);
        expect(Object.isFrozen(copied[key])).toBe(true);
        expect(Object.isFrozen(source[key])).toBe(false);
      }
      expect(Object.isFrozen(copied)).toBe(true);
      expect(copyTacticalSnapContextV1(JSON.parse(before) as unknown)).toEqual(copied);
      expect(JSON.stringify(source)).toBe(before);
      source.field.down = 1;
      expect(copied.field.down).toBe(3);
    },
  );

  it('rejects historical absence, future tags, unknown positions and hidden evidence', () => {
    for (const bad of [
      undefined,
      null,
      0,
      [],
      {},
      { ...context(), model: 'tactical_snap_context_v2' },
      { ...context(), positionId: 'position_k' },
      { ...context(), patternId: 'hidden_pattern' },
      { ...context(), clock: { ...context().clock, finalScore: 99 } },
      { ...context(), field: { ...context().field, offense: 'OPPONENT' } },
      { ...context(), score: { ...context().score, probability: 50 } },
    ]) {
      expect(isTacticalSnapContextV1(bad)).toBe(false);
      expect(copyTacticalSnapContextV1(bad)).toBeUndefined();
    }
    for (const key of Object.keys(context())) {
      const missing: Record<string, unknown> = { ...context() };
      delete missing[key];
      expect(isTacticalSnapContextV1(missing), key).toBe(false);
    }
  });

  it('enforces playable field, clock, score and bounded snap identities', () => {
    const base = context();
    for (const value of [-1, 0, 100, NaN, Infinity, 1.5]) {
      expect(
        isTacticalSnapContextV1({ ...base, field: { ...base.field, lineOfScrimmageYards: value } }),
      ).toBe(false);
    }
    for (const [key, values] of Object.entries({
      down: [0, 5, 1.5],
      driveIndex: [-1, 201, 1.5],
      distanceYards: [0, 59, 1.5],
    })) {
      for (const value of values) {
        expect(isTacticalSnapContextV1({ ...base, field: { ...base.field, [key]: value } })).toBe(
          false,
        );
      }
    }
    for (const value of [0, 901, 1.5]) {
      expect(
        isTacticalSnapContextV1({ ...base, clock: { ...base.clock, secondsRemaining: value } }),
      ).toBe(false);
    }
    for (const value of [0, 5, 1.5]) {
      expect(isTacticalSnapContextV1({ ...base, clock: { ...base.clock, period: value } })).toBe(
        false,
      );
    }
    for (const key of ['playerTeam', 'opponent']) {
      for (const value of [-1, 201, 1.5]) {
        expect(isTacticalSnapContextV1({ ...base, score: { ...base.score, [key]: value } })).toBe(
          false,
        );
      }
    }
    for (const value of [-1, 12, 1.5])
      expect(isTacticalSnapContextV1({ ...base, snapIndex: value })).toBe(false);
    for (const value of ['game_', 'other_game', 'game_Hidden', 'game_' + 'a'.repeat(200)]) {
      expect(isTacticalSnapContextV1({ ...base, gameId: value })).toBe(false);
    }
    expect(
      isTacticalSnapContextV1({
        ...base,
        field: { ...base.field, lineOfScrimmageYards: 99, distanceYards: 1 },
      }),
    ).toBe(true);
  });

  it('retains only dense unique offered choices and earned clues, including no clues', () => {
    const base = context();
    const sparse = [...base.decisionIds];
    delete sparse[1];
    const extra = Object.assign([...base.decisionIds], { hidden: 'pattern' });
    for (const decisionIds of [
      [],
      sparse,
      extra,
      [...base.decisionIds, base.decisionIds[0]],
      [base.decisionIds[0], base.decisionIds[0], base.decisionIds[2]],
      ['display name', ...base.decisionIds.slice(1)],
    ]) {
      expect(isTacticalSnapContextV1({ ...base, decisionIds })).toBe(false);
    }
    for (const revealedClueIds of [
      [undefined],
      ['game_clue_'],
      ['game_clue_one', 'game_clue_one'],
      ['game_clue_a', 'game_clue_b', 'game_clue_c', 'game_clue_d'],
    ]) {
      expect(isTacticalSnapContextV1({ ...base, revealedClueIds })).toBe(false);
    }
    expect(copyTacticalSnapContextV1({ ...base, revealedClueIds: [] })?.revealedClueIds).toEqual(
      [],
    );
    expect(
      isTacticalSnapContextV1({
        ...base,
        revealedClueIds: ['game_clue_a', 'game_clue_b', 'game_clue_c'],
      }),
    ).toBe(true);
  });
});
