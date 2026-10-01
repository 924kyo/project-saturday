import { describe, expect, it } from 'vitest';
import {
  EXECUTION_REASONS_VNEXT,
  SCENE_RULES_V2,
  SCENE_RULES_V2_TUNING,
  SCENE_RULES_VERSION,
  createRng,
  getPlayableAttributeIds,
  isUpsetWinVNext,
  outlookBandVNext,
  resolveCbSnap,
  resolveQbSnap,
  resolveRbSnap,
  selectGameHighlightsVNext,
  snapElapsedSecondsVNext,
  startCbGame,
  startQbGame,
  startRbGame,
  type ActiveCbGame,
  type ActiveQbGame,
  type ActiveRbGame,
  type PositionAttributeProgress,
  type SnapExplanationVNext,
} from '@project-saturday/game-core';
import { cbAlphaDecisions, cbAlphaPatterns } from '../content/cb-alpha.js';
import { qbAlphaDecisions, qbAlphaPatterns } from '../content/qb-alpha.js';
import { rbAlphaDecisions, rbAlphaPatterns } from '../content/rb-alpha.js';
import { localeMessages } from '../locales/index.js';

function attributes(positionId: 'position_qb' | 'position_rb' | 'position_cb') {
  return Object.fromEntries(
    getPlayableAttributeIds(positionId).map((id) => [id, { rating: 70, xp: 0 }]),
  ) as PositionAttributeProgress;
}

let gameCounter = 0;
const base = (positionId: 'position_qb' | 'position_rb' | 'position_cb', seed: string) => ({
  gameId: `game_${positionId.slice('position_'.length)}_alpha_${(gameCounter += 1)}`,
  weekIndex: 3,
  playerProgramId: 'program_ember_peak_polytechnic' as const,
  opponentProgramId: 'program_capital_commonwealth' as const,
  isHome: true,
  opportunityCount: 5,
  playerTeamRating: 72,
  opponentDefenseRating: 68,
  opponentOffenseRating: 69,
  player: {
    id: `player_${positionId}_m12`,
    positionId,
    attributes: attributes(positionId),
    state: { body: 78, preparation: 67, confidence: 63, coachTrust: 52 },
  },
  rng: createRng(`m12-${positionId}-${seed}`),
});

/** Resolves the pending snap with a chosen decision, its fit and scene rules for this one call. */
function withFit<
  T extends {
    patterns: readonly {
      id: string;
      decisionFits: readonly { decisionId: string; fit: number }[];
    }[];
    pendingSnap: { patternId: string };
  },
>(active: T, decisionId: string, fit: number, sceneRules: string | undefined): T {
  return {
    ...active,
    patterns: active.patterns.map((pattern) =>
      pattern.id !== active.pendingSnap.patternId
        ? pattern
        : {
            ...pattern,
            decisionFits: pattern.decisionFits.map((entry) =>
              entry.decisionId === decisionId ? { ...entry, fit } : entry,
            ),
          },
    ),
    input: {
      ...(active as unknown as { input: object }).input,
      ...(sceneRules === undefined ? {} : { sceneRules }),
    },
  };
}

describe('M12 scene rules v2: the right read also improves execution', () => {
  it('a strip after the catch scales with the read, and a missed strip can still wrap up', () => {
    const tally = (sceneRules: string, fit: number) => {
      let attempts = 0;
      let strips = 0;
      let heldTackles = 0;
      for (let seed = 0; seed < 240; seed += 1) {
        const started = startCbGame({
          ...base('position_cb', `strip-${seed}`),
          patterns: cbAlphaPatterns,
          decisions: cbAlphaDecisions,
          equippedSkills: [],
          eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, targetReductionPermille: 0 },
        } as never);
        if (!started.ok) throw new Error(started.reason);
        let state = started.state;
        while (state.type === 'ACTIVE') {
          const active = state as ActiveCbGame;
          const family = active.pendingSnap.familyId;
          const decisionId =
            family === 'key_snap_family_cb_tackle'
              ? 'key_snap_decision_cb_attack_strip'
              : active.pendingSnap.decisionIds[0]!;
          const resolved = resolveCbSnap(
            withFit(active as never, decisionId, fit, sceneRules) as ActiveCbGame,
            decisionId,
          );
          if (!resolved.ok) throw new Error(resolved.reason);
          state = resolved.state;
          if (family === 'key_snap_family_cb_tackle') {
            attempts += 1;
            const play = state.keyPlayLog.at(-1)!;
            if (play.playResult === 'FORCED_FUMBLE') strips += 1;
            if (play.playResult === 'TACKLE') heldTackles += 1;
            expect(['TACKLE', 'MISSED_TACKLE', 'FORCED_FUMBLE']).toContain(play.playResult);
          }
        }
      }
      return { attempts, strips: strips / attempts, held: heldTackles / attempts };
    };
    const v1Sharp = tally(SCENE_RULES_VERSION, 92);
    const v2Sharp = tally(SCENE_RULES_V2, 92);
    const v2Missed = tally(SCENE_RULES_V2, 40);
    expect(v1Sharp.attempts).toBeGreaterThan(100);
    // v1: a strip either forces a fumble or misses (no held tackles).
    expect(v1Sharp.held).toBe(0);
    // v2: a right read strips more often than v1 and than a misread; a missed strip can still tackle.
    expect(v2Sharp.strips).toBeGreaterThan(v1Sharp.strips + 0.05);
    expect(v2Sharp.strips).toBeGreaterThan(v2Missed.strips);
    expect(v2Sharp.held).toBeGreaterThan(0.2);
  });

  it('a QB interception risk and an RB fumble risk follow the read under v2 only', () => {
    const qb = startQbGame({
      ...base('position_qb', 'qb'),
      patterns: qbAlphaPatterns,
      decisions: qbAlphaDecisions,
      equippedSkills: [],
      eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, pressureReductionPermille: 0 },
    } as never);
    if (!qb.ok) throw new Error(qb.reason);
    const qbActive = qb.state as ActiveQbGame;
    const qbDecision = qbActive.pendingSnap.decisionIds[0]!;
    const qbRisk = (rules: string | undefined, fit: number) => {
      const resolved = resolveQbSnap(
        withFit(qbActive as never, qbDecision, fit, rules) as ActiveQbGame,
        qbDecision,
      );
      if (!resolved.ok) throw new Error(resolved.reason);
      return resolved.state.keyPlayLog[0]!.resolution.turnoverRiskPermille;
    };
    const tuning = SCENE_RULES_V2_TUNING;
    expect(qbRisk(SCENE_RULES_VERSION, 92)).toBe(qbRisk(undefined, 92));
    expect(qbRisk(SCENE_RULES_V2, 92)).toBe(
      Math.max(0, qbRisk(SCENE_RULES_VERSION, 92) + (60 - 92) * tuning.qbTurnoverPerFitPoint),
    );
    expect(qbRisk(SCENE_RULES_V2, 40)).toBeGreaterThan(qbRisk(SCENE_RULES_V2, 92));

    const rb = startRbGame({
      ...base('position_rb', 'rb'),
      patterns: rbAlphaPatterns,
      decisions: rbAlphaDecisions,
      equippedSkills: [],
      eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, contactReductionPermille: 0 },
    } as never);
    if (!rb.ok) throw new Error(rb.reason);
    const rbActive = rb.state as ActiveRbGame;
    const rbDecision = rbActive.pendingSnap.decisionIds[0]!;
    const rbRisk = (rules: string | undefined, fit: number) => {
      const resolved = resolveRbSnap(
        withFit(rbActive as never, rbDecision, fit, rules) as ActiveRbGame,
        rbDecision,
      );
      if (!resolved.ok) throw new Error(resolved.reason);
      return resolved.state.keyPlayLog[0]!.resolution.fumbleRiskPermille;
    };
    expect(rbRisk(SCENE_RULES_V2, 40)).toBeGreaterThan(rbRisk(SCENE_RULES_V2, 92));
    expect(rbRisk(SCENE_RULES_VERSION, 40)).toBe(rbRisk(SCENE_RULES_VERSION, 92));
  });
});

function explanation(
  overrides: Partial<{
    verdict: SnapExplanationVNext['execution']['verdict'];
    team: SnapExplanationVNext['situation']['team'];
    leverage: number;
  }>,
): SnapExplanationVNext {
  return {
    read: {
      quality: 'SHARP',
      basis: 'EXACT',
      seenTells: 2,
      totalTells: 3,
      bestDecisionId: null,
      ambiguousLookNameKey: null,
      nextTellKey: null,
    },
    execution: {
      verdict: overrides.verdict ?? 'WON',
      reasonId: null,
      chancePermille: null,
      executionScore: null,
      attribute: null,
    },
    situation: { kind: 'STOP', team: overrides.team ?? 'WON', yards: 0, distance: 2, down: 1 },
    leverage: overrides.leverage ?? 30,
  };
}

describe('M12 post-game story picks', () => {
  it('credits a defender’s breakups in a comfortable win (regression W6)', () => {
    // Snaps: S1 11-yard catch allowed on 3rd & 2, S2 PBU on 1st & 2, S3 10-yard catch on 4th & 14,
    // S4 missed tackle on 4th & 13, S5 PBU on 4th & 2.
    const plays = [
      explanation({ verdict: 'LOST', team: 'LOST', leverage: 52 }),
      explanation({ verdict: 'WON', team: 'WON', leverage: 30 }),
      explanation({ verdict: 'LOST', team: 'WON', leverage: 49 }),
      explanation({ verdict: 'LOST', team: 'WON', leverage: 47 }),
      explanation({ verdict: 'WON', team: 'WON', leverage: 75 }),
    ];
    const picks = selectGameHighlightsVNext(plays);
    expect(picks.playOfGame).toBe(4);
    expect(picks.turningPoint).toBeNull();
    expect(picks.defining).toContain(4);
    expect(picks.defining.length).toBe(3);
  });

  it('never calls a short gain that lost the down a play of the game', () => {
    // A 5-yard slide on 3rd & 14: the run itself came off, but the down was lost.
    const picks = selectGameHighlightsVNext([
      explanation({ verdict: 'WON', team: 'LOST', leverage: 40 }),
      explanation({ verdict: 'LOST', team: 'LOST', leverage: 30 }),
    ]);
    expect(picks.playOfGame).toBeNull();
    expect(picks.turningPoint).toBe(0);
  });
});

describe('M12 pregame line, clock and copy', () => {
  it('spreads the pregame line over five bands and calls an upset only against the line', () => {
    expect(outlookBandVNext(62)).toBe('HEAVY_FAVORITE');
    expect(outlookBandVNext(56)).toBe('FAVORITE');
    expect(outlookBandVNext(52)).toBe('TOSS_UP');
    expect(outlookBandVNext(47)).toBe('UNDERDOG');
    expect(outlookBandVNext(43)).toBe('HEAVY_UNDERDOG');
    const stakes = (band: 'TOSS_UP' | 'UNDERDOG') => ({ band, playerRank: null, opponentRank: 9 });
    expect(isUpsetWinVNext(true, stakes('TOSS_UP'))).toBe(false);
    expect(isUpsetWinVNext(true, stakes('UNDERDOG'))).toBe(true);
    // Pre-M12 recaps keep the ranked rule.
    expect(isUpsetWinVNext(true, { playerRank: null, opponentRank: 9 })).toBe(true);
  });

  it('re-times key snaps per game while keeping them in order', () => {
    const patterns = new Set<string>();
    for (let game = 0; game < 30; game += 1) {
      const times = [0, 1, 2, 3].map((index) =>
        snapElapsedSecondsVNext(`g${game}:${index}`, index, 4),
      );
      for (let index = 1; index < times.length; index += 1)
        expect(times[index]!).toBeGreaterThan(times[index - 1]!);
      patterns.add(times.join(','));
      // Same seed, same clock.
      expect(snapElapsedSecondsVNext(`g${game}:0`, 0, 4)).toBe(times[0]);
    }
    expect(patterns.size).toBeGreaterThan(25);
  });

  it('has copy for every execution reason in both languages', () => {
    for (const reason of EXECUTION_REASONS_VNEXT)
      for (const locale of ['en-US', 'ko-KR'] as const)
        expect(
          (localeMessages[locale] as Record<string, string>)[`v2.exec.${reason}`],
          `${locale} v2.exec.${reason}`,
        ).toBeTruthy();
  });
});
