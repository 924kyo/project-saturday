import { describe, expect, it } from 'vitest';
import {
  CB_DECISION_FAMILY_IDS,
  CB_SKILL_EFFECT_TYPES,
  createRng,
  createWorldAlphaSeason,
  getAvailableCbEventChoices,
  getPlayableAttributeIds,
  isCbEventCatalog,
  projectCbWorldAlphaResult,
  resolveCbEventChoice,
  resolveCbSnap,
  resolveNextWorldAlphaRegularRound,
  selectCbEvent,
  startCbGame,
  type ActiveCbGame,
  type CbGameStartInput,
  type CbPlayerGameState,
  type CbSkillDefinition,
  type CompleteCbGame,
  type PositionAttributeProgress,
} from '@project-saturday/game-core';
import {
  cbAlphaContent,
  cbAlphaDecisions,
  cbAlphaEvents,
  cbAlphaPatterns,
  cbAlphaSkills,
} from '../content/cb-alpha.js';
import { worldAlphaMechanicsDefinition } from '../content/world-alpha-mechanics.js';
import { localeMessages } from '../locales/index.js';
import {
  CB_ALPHA_CLUE_IDS,
  CB_ALPHA_DECISION_IDS,
  CB_ALPHA_EVENT_IDS,
  CB_ALPHA_PATTERN_IDS,
  CB_ALPHA_SKILL_IDS,
  cbAlphaContentSchema,
} from '../schema/cb-alpha.js';
import { validateShippedContent } from './content.js';
function player(rating = 70): CbPlayerGameState {
  return {
    id: 'player_cb_alpha_fixture',
    positionId: 'position_cb',
    attributes: Object.fromEntries(
      getPlayableAttributeIds('position_cb').map((id) => [id, { rating, xp: 0 }]),
    ) as PositionAttributeProgress,
    state: { body: 78, preparation: 67, confidence: 63, coachTrust: 52 },
  };
}
function input(
  week: number,
  opportunities: number,
  skills: readonly CbSkillDefinition[] = [],
): CbGameStartInput {
  return {
    gameId: `game_cb_alpha_${week}`,
    weekIndex: week,
    playerProgramId: 'program_ember_peak_polytechnic',
    opponentProgramId: 'program_capital_commonwealth',
    isHome: true,
    opportunityCount: opportunities,
    playerTeamRating: 72,
    opponentOffenseRating: 69,
    opponentDefenseRating: 68,
    player: player(),
    patterns: cbAlphaPatterns,
    decisions: cbAlphaDecisions,
    equippedSkills: skills,
    eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, targetReductionPermille: 0 },
    rng: createRng(`cb-alpha-${week}`),
  };
}
function finish(startInput: CbGameStartInput): CompleteCbGame {
  const started = startCbGame(startInput);
  expect(started.ok).toBe(true);
  if (!started.ok) throw new Error(started.reason);
  let state = started.state;
  while (state.type === 'ACTIVE') {
    const active = state as ActiveCbGame;
    const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
    const decision = [...pattern.decisionFits].sort((a, b) => b.fit - a.fit)[0]!;
    const result = resolveCbSnap(active, decision.decisionId);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    state = result.state;
  }
  return state;
}
const eventContext = {
  weekIndex: 7,
  body: 50,
  preparation: 60,
  confidence: 60,
  coachTrust: 55,
  gpaMilli: 2800,
  brand: 20,
  contextTags: ['context_cb_room'],
  recentEvents: [],
} as const;
describe('M7 staged cornerback vertical', () => {
  it('retains current defensive field outcomes and stops a made tackle before a touchdown', () => {
    const outcomes = new Set<string>();
    let madeTackles = 0;
    for (let week = 0; week < 64; week += 1) {
      const game = finish({ ...input(week, 5), rulesVersion: 'tactical_game_v1' });
      expect(game.rng.drawCount).toBe(57);
      expect(game.summary.rulesVersion).toBe('tactical_game_v1');
      for (const play of game.keyPlayLog) {
        const result = play.tacticalResult!;
        outcomes.add(result.ball.outcome);
        expect(play.rngDrawCountAfter - play.rngDrawCountBefore).toBe(6);
        expect(result.before.field.offense).toBe('OPPONENT');
        expect(result.scoreAfter.opponent - result.before.score.opponent).toBe(
          play.touchdownAllowed * 7,
        );
        expect(result.scoreAfter.playerTeam).toBe(result.before.score.playerTeam);
        if (!play.targeted) {
          expect(result.ball).toEqual({
            endLineYards: null,
            offenseYards: null,
            outcome: 'UNTRACKED',
          });
          expect(result.possessionAfter).toBeNull();
          expect(play.yardsAllowed + play.touchdownAllowed + play.tackle).toBe(0);
        } else if (play.completionAllowed === 1) {
          expect(play.yardsAllowed).toBe(result.ball.offenseYards);
          expect(result.ball.endLineYards).toBe(
            result.before.field.lineOfScrimmageYards + play.yardsAllowed,
          );
          if (play.touchdownAllowed === 1) {
            expect(result.ball.endLineYards).toBe(100);
            expect(play.tackle).toBe(0);
          } else expect(result.ball.endLineYards).toBeLessThan(100);
        }
        if (play.tackle === 1) {
          madeTackles += 1;
          expect(play.touchdownAllowed).toBe(0);
        }
        if (play.interception === 1) {
          expect(result.possessionAfter).toBe('PLAYER');
          expect(result.ball.offenseYards).toBe(0);
        }
      }
      const last = game.keyPlayLog.at(-1)!.tacticalResult!;
      expect([0, 3, 7]).toContain(game.summary.playerTeamScore - last.scoreAfter.playerTeam);
      expect([0, 3, 7]).toContain(game.summary.opponentScore - last.scoreAfter.opponent);
    }
    expect(madeTackles).toBeGreaterThan(0);
    expect(outcomes).toEqual(
      new Set(['STOPPED', 'TOUCHDOWN', 'INTERCEPTION', 'INCOMPLETE', 'UNTRACKED']),
    );
    const zero = finish({ ...input(0, 0), rulesVersion: 'tactical_game_v1' });
    expect(zero.rng).toEqual(input(0, 0).rng);
    expect(zero.keyPlayLog).toEqual([]);
    expect(zero.growth.attributeXp).toEqual([]);
  });
  it('stages current context before all families and retains exact earned information after each choice', () => {
    const seenFamilies = new Set<string>();
    const seenDecisions = new Set<string>();
    for (let week = 0; week < 8; week += 1) {
      for (let choice = 0; choice < 3; choice += 1) {
        const source: CbGameStartInput = {
          ...input(week, 2),
          rulesVersion: 'tactical_game_v1',
          player: player(week % 2 === 0 ? 20 : 90),
        };
        const sourceJson = JSON.stringify(source);
        const start = startCbGame(source);
        if (!start.ok || start.state.type !== 'ACTIVE') throw new Error('Expected tactical CB');
        const active = start.state;
        const before = active.pendingSnap.tacticalContext!;
        expect(before.gameId).toBe(source.gameId);
        expect(before.decisionIds).toEqual(active.pendingSnap.decisionIds);
        expect(before.revealedClueIds).toEqual(active.pendingSnap.revealedClueIds);
        expect(before.revealedClueIds.length).toBe(week % 2 === 0 ? 0 : 2);
        expect(active.rng.drawCount - source.rng.drawCount).toBe(5);
        expect(Object.isFrozen(source.player)).toBe(false);
        expect(JSON.stringify(source)).toBe(sourceJson);
        const selected = active.pendingSnap.decisionIds[choice]!;
        seenFamilies.add(active.pendingSnap.familyId);
        seenDecisions.add(selected);
        const resolved = resolveCbSnap(active, selected);
        if (!resolved.ok) throw new Error(resolved.reason);
        const restored = JSON.parse(JSON.stringify(active)) as ActiveCbGame;
        expect(resolveCbSnap(restored, selected)).toEqual(resolved);
        expect(Object.isFrozen(restored.input.player)).toBe(false);
        const play = resolved.state.keyPlayLog[0]!;
        expect(play.tacticalResult!.before).toEqual(before);
        expect(play.tacticalResult!.before).not.toBe(before);
        expect(play.tacticalResult!.decisionId).toBe(selected);
        expect(play.rngDrawCountAfter - play.rngDrawCountBefore).toBe(6);
        expect(play.rngDrawCountBefore).toBe(active.rng.drawCount);
        if (resolved.state.type !== 'ACTIVE') throw new Error('Expected next CB snap');
        expect(resolved.state.pendingSnap.tacticalContext!.snapIndex).toBe(1);
        expect(play.tacticalResult!.before.snapIndex).toBe(0);
        expect(resolved.state.rng.drawCount - play.rngDrawCountAfter).toBe(5);
      }
    }
    expect(seenFamilies).toEqual(new Set(CB_DECISION_FAMILY_IDS));
    expect(seenDecisions).toEqual(new Set(CB_ALPHA_DECISION_IDS));
  });

  it('rejects missing/future tactical selection or altered pending identity and earned clues', () => {
    for (const opportunities of [1, 5]) {
      const exact = finish({
        ...input(0, opportunities),
        rulesVersion: 'tactical_game_v1',
        rng: { ...createRng(1), drawCount: Number.MAX_SAFE_INTEGER - (opportunities * 11 + 2) },
      });
      expect(exact.rng.drawCount).toBe(Number.MAX_SAFE_INTEGER);
    }
    for (const rulesVersion of [undefined, 'tactical_game_v2']) {
      expect(startCbGame({ ...input(0, 2), rulesVersion } as unknown as CbGameStartInput).ok).toBe(
        false,
      );
    }
    const started = startCbGame({ ...input(0, 2), rulesVersion: 'tactical_game_v1' });
    if (!started.ok || started.state.type !== 'ACTIVE') throw new Error('Expected CB');
    const active = started.state;
    const context = active.pendingSnap.tacticalContext!;
    for (const tacticalContext of [
      undefined,
      { ...context, snapIndex: 1 },
      { ...context, revealedClueIds: [] },
      { ...context, gameId: 'game_wrong' },
    ]) {
      const altered = {
        ...active,
        pendingSnap: { ...active.pendingSnap, tacticalContext },
      } as unknown as ActiveCbGame;
      expect(resolveCbSnap(altered, active.pendingSnap.decisionIds[0]).ok).toBe(false);
    }
    expect(
      startCbGame({
        ...input(0, 5),
        rulesVersion: 'tactical_game_v1',
        rng: { ...createRng(1), drawCount: Number.MAX_SAFE_INTEGER - 56 },
      }).ok,
    ).toBe(false);
  });
  it('pins the literal pre-tactical touchdown/tackle contract', () => {
    // Literal input/seed: cb-alpha-0. The old tackle flag is not a saved stop-before-goal location.
    const startInput = input(0, 5);
    const game = finish(startInput);
    expect(finish(JSON.parse(JSON.stringify(startInput)) as CbGameStartInput)).toEqual(game);
    expect(game.keyPlayLog[0]).toEqual({
      appliedSkillIds: [],
      bodyExposure: 4,
      completionAllowed: 1,
      decisionFit: 94,
      decisionId: 'key_snap_decision_cb_drive_boundary',
      familyId: 'key_snap_family_cb_tackle',
      interception: 0,
      missedTackle: 0,
      passDefended: 0,
      patternId: 'key_snap_pattern_cb_boundary_finish',
      playResult: 'TACKLE',
      resolution: {
        attributeScore: 70,
        completionRiskPermille: 550,
        completionRoll: 383,
        decisionFit: 94,
        disruptionChancePermille: 725,
        eventAdjustment: 0,
        executionRoll: 469,
        finalScore: 70,
        matchupScore: 31,
        releaseRoll: 28,
        skillAdjustment: 0,
        takeawayChancePermille: 90,
        takeawayRoll: 844,
        targetChancePermille: 780,
        targetRoll: 115,
        touchdownRiskPermille: 70,
        yardVariation: 0,
      },
      rngDrawCountAfter: 6,
      rngDrawCountBefore: 0,
      snapIndex: 0,
      tackle: 1,
      targeted: true,
      touchdownAllowed: 1,
      yardsAllowed: 4,
    });
  });
  it('ships exact validated bilingual density and all live effect types', () => {
    expect(cbAlphaContentSchema.safeParse(cbAlphaContent).success).toBe(true);
    expect(cbAlphaContent.decisions.map(({ id }) => id)).toEqual(CB_ALPHA_DECISION_IDS);
    expect(cbAlphaContent.patterns.map(({ id }) => id)).toEqual(CB_ALPHA_PATTERN_IDS);
    expect(cbAlphaContent.clues.map(({ id }) => id)).toEqual(CB_ALPHA_CLUE_IDS);
    expect(cbAlphaContent.skills.map(({ id }) => id)).toEqual(CB_ALPHA_SKILL_IDS);
    expect(cbAlphaContent.events.map(({ id }) => id)).toEqual(CB_ALPHA_EVENT_IDS);
    expect(isCbEventCatalog(cbAlphaEvents)).toBe(true);
    expect(
      new Set(cbAlphaSkills.flatMap(({ effects }) => effects.map(({ type }) => type))),
    ).toEqual(new Set(CB_SKILL_EFFECT_TYPES));
    expect(new Set(cbAlphaPatterns.map(({ familyId }) => familyId))).toEqual(
      new Set(CB_DECISION_FAMILY_IDS),
    );
    expect(validateShippedContent()).toEqual({ ok: true, issues: [] });
    for (const locale of ['ko-KR', 'en-US'] as const) {
      const messages: Readonly<Record<string, string>> = localeMessages[locale];
      for (const d of [
        ...cbAlphaContent.decisions,
        ...cbAlphaContent.patterns,
        ...cbAlphaContent.clues,
        ...cbAlphaContent.skills,
        ...cbAlphaContent.events,
        ...cbAlphaContent.events.flatMap(({ choices }) => choices),
      ]) {
        expect(messages[d.nameKey]).toBeTruthy();
        expect(messages[d.descriptionKey]).toBeTruthy();
      }
    }
  });
  it('uses zero draws for scout review and six per coverage snap', () => {
    const zero = finish(input(0, 0));
    expect(zero.summary.participationFeedbackId).toBe('game_participation_cb_scout_review');
    expect(zero.summary.gameRngDrawCountAfter).toBe(zero.summary.gameRngDrawCountBefore);
    expect(zero.summary.statLine).toEqual({
      coverageSnaps: 0,
      targets: 0,
      completionsAllowed: 0,
      yardsAllowed: 0,
      touchdownsAllowed: 0,
      passesDefended: 0,
      interceptions: 0,
      tackles: 0,
      missedTackles: 0,
    });
    const played = finish(input(0, 5));
    expect(played.summary.gameRngDrawCountAfter - played.summary.gameRngDrawCountBefore).toBe(30);
    expect(played.keyPlayLog.every((p) => p.rngDrawCountAfter - p.rngDrawCountBefore === 6)).toBe(
      true,
    );
    expect(played.summary.statLine.coverageSnaps).toBe(5);
  });
  it('reaches every leverage/coverage/ball/tackle pattern and replays reordered content', () => {
    const a = finish(input(0, 5));
    const b = finish(input(5, 5));
    expect(new Set([...a.keyPlayLog, ...b.keyPlayLog].map(({ patternId }) => patternId))).toEqual(
      new Set(CB_ALPHA_PATTERN_IDS),
    );
    const baseline = finish(input(2, 4));
    expect(
      finish({
        ...input(2, 4),
        patterns: [...cbAlphaPatterns].reverse(),
        decisions: [...cbAlphaDecisions].reverse(),
      }),
    ).toEqual(baseline);
  });
  it('makes information, risk/takeaway, tackle, Body, XP, grade, and role skills observable', () => {
    const clue = cbAlphaSkills.find(({ id }) => id === 'skill_cb_split_key_c')!;
    const plainStart = startCbGame(input(1, 1));
    const informed = startCbGame(input(1, 1, [clue]));
    if (
      !plainStart.ok ||
      plainStart.state.type !== 'ACTIVE' ||
      !informed.ok ||
      informed.state.type !== 'ACTIVE'
    )
      throw new Error('Expected active CB games.');
    expect(informed.state.pendingSnap.information.clueCount).toBe(
      plainStart.state.pendingSnap.information.clueCount + 1,
    );
    const body = cbAlphaSkills.find(({ id }) => id === 'skill_cb_weekly_reset_c')!;
    const xp = cbAlphaSkills.find(({ id }) => id === 'skill_cb_rep_archive_a')!;
    const grade = cbAlphaSkills.find(({ id }) => id === 'skill_cb_quiet_island_a')!;
    const plain = finish(input(3, 4));
    const built = finish(input(3, 4, [body, xp, grade]));
    expect(built.growth.requestedBodyDelta).toBeGreaterThan(plain.growth.requestedBodyDelta);
    expect(built.growth.attributeXp.reduce((s, x) => s + x.awardedXp, 0)).toBeGreaterThan(
      plain.growth.attributeXp.reduce((s, x) => s + x.awardedXp, 0),
    );
    expect(built.summary.gradeScore).toBeGreaterThan(plain.summary.gradeScore);
    const thief = cbAlphaSkills.find(({ id }) => id === 'skill_cb_route_thief_a')!;
    const started = startCbGame(input(1, 1, [thief]));
    if (!started.ok || started.state.type !== 'ACTIVE') throw new Error('Expected coverage snap.');
    const result = resolveCbSnap(started.state, 'key_snap_decision_cb_undercut_break');
    if (!result.ok || result.state.type !== 'COMPLETE')
      throw new Error('Expected undercut result.');
    expect(result.state.keyPlayLog[0]!.resolution.takeawayChancePermille).toBeGreaterThan(
      cbAlphaPatterns.find(({ id }) => id === result.state.keyPlayLog[0]!.patternId)!
        .takeawayChancePermille,
    );
  });
  it('selects events canonically and applies unlocked/amplified choices', () => {
    const selected = selectCbEvent(eventContext, cbAlphaEvents, 1000, createRng('cb-event'));
    expect(
      selectCbEvent(eventContext, [...cbAlphaEvents].reverse(), 1000, createRng('cb-event')),
    ).toEqual(selected);
    expect(selected.evidence.rngDrawCountAfter - selected.evidence.rngDrawCountBefore).toBe(2);
    const event = cbAlphaEvents.find(({ choices }) => choices.length === 3)!;
    const unlock = cbAlphaSkills.find(({ id }) => id === 'skill_cb_secondary_table_b')!;
    const boost = cbAlphaSkills.find(({ id }) => id === 'skill_cb_shared_stage_s')!;
    expect(getAvailableCbEventChoices(event, [])).toHaveLength(2);
    expect(getAvailableCbEventChoices(event, [unlock])).toHaveLength(3);
    const choice = event.choices.find(({ id }) => id.endsWith('_connect'))!;
    const base = resolveCbEventChoice(eventContext, event, choice.id, [unlock]);
    const amplified = resolveCbEventChoice(eventContext, event, choice.id, [unlock, boost]);
    expect(amplified.evidence.positiveMultiplierPermille).toBe(1250);
    expect(amplified.nextContext.coachTrust).toBeGreaterThan(base.nextContext.coachTrust);
  });
  it('hands the CB score to the world without player-fixture draws', () => {
    const created = createWorldAlphaSeason(
      worldAlphaMechanicsDefinition,
      createRng('cb-world'),
      0,
      'program_ember_peak_polytechnic',
    );
    if (!created.ok) throw new Error(created.reason);
    const fixture = worldAlphaMechanicsDefinition.regularSeasonRounds[0]!.fixtures.find(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === 'program_ember_peak_polytechnic' ||
        awayProgramId === 'program_ember_peak_polytechnic',
    )!;
    const game = finish({
      ...input(0, 3),
      opponentProgramId:
        fixture.homeProgramId === 'program_ember_peak_polytechnic'
          ? fixture.awayProgramId
          : fixture.homeProgramId,
      isHome: fixture.homeProgramId === 'program_ember_peak_polytechnic',
    });
    const projected = projectCbWorldAlphaResult(game.summary, fixture);
    if (!projected.ok) throw new Error(projected.reason);
    const resolved = resolveNextWorldAlphaRegularRound(
      created.value,
      worldAlphaMechanicsDefinition,
      projected.result,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error(resolved.reason);
    expect(resolved.value.worldRngDrawCountAfter - resolved.value.worldRngDrawCountBefore).toBe(30);
  });
  it('rejects invalid choices without draws or mutation', () => {
    const started = startCbGame(input(0, 2));
    if (!started.ok || started.state.type !== 'ACTIVE') throw new Error('Expected active CB game.');
    const before = structuredClone(started.state);
    expect(resolveCbSnap(started.state, 'key_snap_decision_cb_unavailable')).toEqual({
      ok: false,
      reason: 'cb_game.invalid_decision',
    });
    expect(started.state).toEqual(before);
  });
});
