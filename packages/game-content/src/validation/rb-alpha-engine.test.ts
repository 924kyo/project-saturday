import { describe, expect, it } from 'vitest';
import {
  RB_DECISION_FAMILY_IDS,
  RB_SKILL_EFFECT_TYPES,
  createRng,
  createWorldAlphaSeason,
  getAvailableRbEventChoices,
  getPlayableAttributeIds,
  isRbEventCatalog,
  projectRbWorldAlphaResult,
  resolveNextWorldAlphaRegularRound,
  resolveRbEventChoice,
  resolveRbSnap,
  selectRbEvent,
  startRbGame,
  type ActiveRbGame,
  type CompleteRbGame,
  type PositionAttributeProgress,
  type RbGameStartInput,
  type RbPlayerGameState,
  type RbSkillDefinition,
} from '@project-saturday/game-core';
import {
  rbAlphaContent,
  rbAlphaDecisions,
  rbAlphaEvents,
  rbAlphaPatterns,
  rbAlphaSkills,
} from '../content/rb-alpha.js';
import { worldAlphaMechanicsDefinition } from '../content/world-alpha-mechanics.js';
import { localeMessages } from '../locales/index.js';
import {
  RB_ALPHA_CLUE_IDS,
  RB_ALPHA_DECISION_IDS,
  RB_ALPHA_EVENT_IDS,
  RB_ALPHA_PATTERN_IDS,
  RB_ALPHA_SKILL_IDS,
  rbAlphaContentSchema,
} from '../schema/rb-alpha.js';
import { validateShippedContent } from './content.js';

function player(rating = 70): RbPlayerGameState {
  return {
    id: 'player_rb_alpha_fixture',
    positionId: 'position_rb',
    attributes: Object.fromEntries(
      getPlayableAttributeIds('position_rb').map((id) => [id, { rating, xp: 0 }]),
    ) as PositionAttributeProgress,
    state: { body: 78, preparation: 67, confidence: 63, coachTrust: 52 },
  };
}

function input(
  weekIndex: number,
  opportunities: number,
  skills: readonly RbSkillDefinition[] = [],
): RbGameStartInput {
  return {
    gameId: `game_rb_alpha_${weekIndex}`,
    weekIndex,
    playerProgramId: 'program_ember_peak_polytechnic',
    opponentProgramId: 'program_capital_commonwealth',
    isHome: true,
    opportunityCount: opportunities,
    playerTeamRating: 72,
    opponentDefenseRating: 68,
    opponentOffenseRating: 69,
    player: player(),
    patterns: rbAlphaPatterns,
    decisions: rbAlphaDecisions,
    equippedSkills: skills,
    eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, contactReductionPermille: 0 },
    rng: createRng(`rb-alpha-${weekIndex}`),
  };
}

function finish(startInput: RbGameStartInput): CompleteRbGame {
  const started = startRbGame(startInput);
  expect(started.ok).toBe(true);
  if (!started.ok) throw new Error(started.reason);
  let state = started.state;
  while (state.type === 'ACTIVE') {
    const active = state as ActiveRbGame;
    const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
    const decision = [...pattern.decisionFits].sort((a, b) => b.fit - a.fit)[0]!;
    const resolved = resolveRbSnap(active, decision.decisionId);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error(resolved.reason);
    state = resolved.state;
  }
  return state;
}

const eventContext = {
  weekIndex: 7,
  body: 50,
  preparation: 60,
  confidence: 60,
  coachTrust: 55,
  gpaMilli: 2_800,
  brand: 20,
  contextTags: ['context_rb_room'],
  recentEvents: [],
} as const;

describe('M7 staged running back vertical', () => {
  it('retains current rushing/receiving physics without inventing ball outcomes on protection snaps', () => {
    const outcomes = new Set<string>();
    for (let week = 0; week < 64; week += 1) {
      const game = finish({ ...input(week, 5), rulesVersion: 'tactical_game_v1' });
      expect(game.rng.drawCount).toBe(57);
      expect(game.summary.rulesVersion).toBe('tactical_game_v1');
      for (const play of game.keyPlayLog) {
        const result = play.tacticalResult!;
        outcomes.add(result.ball.outcome);
        expect(play.rngDrawCountAfter - play.rngDrawCountBefore).toBe(6);
        expect(result.scoreAfter.playerTeam - result.before.score.playerTeam).toBe(
          play.touchdownDelta * 7,
        );
        expect(result.scoreAfter.opponent).toBe(result.before.score.opponent);
        if (play.playResult.startsWith('PROTECTION')) {
          expect(result.ball).toEqual({
            endLineYards: null,
            offenseYards: null,
            outcome: 'UNTRACKED',
          });
          expect(result.possessionAfter).toBeNull();
          expect(play.yardsDelta + play.touchdownDelta + play.fumbleDelta).toBe(0);
        } else {
          expect(play.yardsDelta).toBe(result.ball.offenseYards);
          expect(result.ball.endLineYards).toBe(
            result.before.field.lineOfScrimmageYards + play.yardsDelta,
          );
          if (play.touchdownDelta === 1) {
            expect(result.ball.endLineYards).toBe(100);
            expect(play.fumbleDelta).toBe(0);
            expect(result.possessionAfter).toBe('KICKOFF');
          } else expect(result.ball.endLineYards).toBeLessThan(100);
          if (play.fumbleDelta === 1) expect(result.possessionAfter).toBe('OPPONENT');
        }
      }
      const last = game.keyPlayLog.at(-1)!.tacticalResult!;
      expect([0, 3, 7]).toContain(game.summary.playerTeamScore - last.scoreAfter.playerTeam);
      expect([0, 3, 7]).toContain(game.summary.opponentScore - last.scoreAfter.opponent);
    }
    expect(outcomes).toEqual(new Set(['STOPPED', 'TOUCHDOWN', 'FUMBLE_LOST', 'UNTRACKED']));
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
        const source: RbGameStartInput = {
          ...input(week, 2),
          rulesVersion: 'tactical_game_v1',
          player: player(week % 2 === 0 ? 20 : 90),
        };
        const sourceJson = JSON.stringify(source);
        const start = startRbGame(source);
        if (!start.ok || start.state.type !== 'ACTIVE') throw new Error('Expected tactical RB');
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
        const resolved = resolveRbSnap(active, selected);
        if (!resolved.ok) throw new Error(resolved.reason);
        const restored = JSON.parse(JSON.stringify(active)) as ActiveRbGame;
        expect(resolveRbSnap(restored, selected)).toEqual(resolved);
        expect(Object.isFrozen(restored.input.player)).toBe(false);
        const play = resolved.state.keyPlayLog[0]!;
        expect(play.tacticalResult!.before).toEqual(before);
        expect(play.tacticalResult!.before).not.toBe(before);
        expect(play.tacticalResult!.decisionId).toBe(selected);
        expect(play.rngDrawCountAfter - play.rngDrawCountBefore).toBe(6);
        expect(play.rngDrawCountBefore).toBe(active.rng.drawCount);
        if (resolved.state.type !== 'ACTIVE') throw new Error('Expected next RB snap');
        expect(resolved.state.pendingSnap.tacticalContext!.snapIndex).toBe(1);
        expect(play.tacticalResult!.before.snapIndex).toBe(0);
        expect(resolved.state.rng.drawCount - play.rngDrawCountAfter).toBe(5);
      }
    }
    expect(seenFamilies).toEqual(new Set(RB_DECISION_FAMILY_IDS));
    expect(seenDecisions).toEqual(new Set(RB_ALPHA_DECISION_IDS));
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
      expect(startRbGame({ ...input(0, 2), rulesVersion } as unknown as RbGameStartInput).ok).toBe(
        false,
      );
    }
    const started = startRbGame({ ...input(0, 2), rulesVersion: 'tactical_game_v1' });
    if (!started.ok || started.state.type !== 'ACTIVE') throw new Error('Expected RB');
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
      } as unknown as ActiveRbGame;
      expect(resolveRbSnap(altered, active.pendingSnap.decisionIds[0]).ok).toBe(false);
    }
    expect(
      startRbGame({
        ...input(0, 5),
        rulesVersion: 'tactical_game_v1',
        rng: { ...createRng(1), drawCount: Number.MAX_SAFE_INTEGER - 56 },
      }).ok,
    ).toBe(false);
  });
  it('pins the literal pre-tactical touchdown/fumble contract', () => {
    // Literal input/seed: rb-alpha-28. Do not add a recovery/endpoint narrative to this log.
    const startInput = input(28, 5);
    const game = finish(startInput);
    expect(finish(JSON.parse(JSON.stringify(startInput)) as RbGameStartInput)).toEqual(game);
    expect(game.keyPlayLog[3]).toEqual({
      appliedSkillIds: [],
      bodyExposure: 5,
      decisionFit: 95,
      decisionId: 'key_snap_decision_rb_finish_forward',
      familyId: 'key_snap_family_rb_contact',
      fumbleDelta: 1,
      patternId: 'key_snap_pattern_rb_square_contact',
      playResult: 'RUSH',
      resolution: {
        attributeScore: 70,
        contactChancePermille: 780,
        contactRoll: 70,
        decisionFit: 95,
        eventAdjustment: 0,
        executionRoll: 167,
        explosiveChancePermille: 70,
        explosiveRoll: 580,
        finalScore: 71,
        fumbleRiskPermille: 210,
        matchupScore: 32,
        outcomeRoll: 424,
        skillAdjustment: 0,
        successChancePermille: 644,
        touchdownChancePermille: 160,
        turnoverRoll: 90,
        yardVariation: 2,
      },
      rngDrawCountAfter: 24,
      rngDrawCountBefore: 18,
      snapIndex: 3,
      touchdownDelta: 1,
      yardsDelta: 6,
    });
  });
  it('ships exact validated bilingual density and every declared live effect', () => {
    expect(rbAlphaContentSchema.safeParse(rbAlphaContent).success).toBe(true);
    expect(rbAlphaContent.decisions.map(({ id }) => id)).toEqual(RB_ALPHA_DECISION_IDS);
    expect(rbAlphaContent.patterns.map(({ id }) => id)).toEqual(RB_ALPHA_PATTERN_IDS);
    expect(rbAlphaContent.clues.map(({ id }) => id)).toEqual(RB_ALPHA_CLUE_IDS);
    expect(rbAlphaContent.skills.map(({ id }) => id)).toEqual(RB_ALPHA_SKILL_IDS);
    expect(rbAlphaContent.events.map(({ id }) => id)).toEqual(RB_ALPHA_EVENT_IDS);
    expect(isRbEventCatalog(rbAlphaEvents)).toBe(true);
    expect(
      new Set(rbAlphaSkills.flatMap(({ effects }) => effects.map(({ type }) => type))),
    ).toEqual(new Set(RB_SKILL_EFFECT_TYPES));
    expect(new Set(rbAlphaPatterns.map(({ familyId }) => familyId))).toEqual(
      new Set(RB_DECISION_FAMILY_IDS),
    );
    expect(validateShippedContent()).toEqual({ ok: true, issues: [] });
    for (const locale of ['ko-KR', 'en-US'] as const) {
      const messages: Readonly<Record<string, string>> = localeMessages[locale];
      for (const definition of [
        ...rbAlphaContent.decisions,
        ...rbAlphaContent.patterns,
        ...rbAlphaContent.clues,
        ...rbAlphaContent.skills,
        ...rbAlphaContent.events,
        ...rbAlphaContent.events.flatMap(({ choices }) => choices),
      ]) {
        expect(messages[definition.nameKey]).toBeTruthy();
        expect(messages[definition.descriptionKey]).toBeTruthy();
      }
    }
  });

  it('uses zero draws for assignment review and exactly six for every played snap', () => {
    const zero = finish(input(0, 0));
    expect(zero.summary.participationFeedbackId).toBe('game_participation_rb_assignment_review');
    expect(zero.summary.gameRngDrawCountAfter).toBe(zero.summary.gameRngDrawCountBefore);
    expect(zero.summary.statLine).toEqual({
      carries: 0,
      rushingYards: 0,
      rushingTouchdowns: 0,
      receptions: 0,
      receivingYards: 0,
      receivingTouchdowns: 0,
      protectionAssignments: 0,
      protectionWins: 0,
      fumbles: 0,
    });
    const played = finish(input(0, 5));
    expect(played.summary.gameRngDrawCountAfter - played.summary.gameRngDrawCountBefore).toBe(30);
    expect(
      played.keyPlayLog.every((play) => play.rngDrawCountAfter - play.rngDrawCountBefore === 6),
    ).toBe(true);
    expect(played.keyPlayLog.some(({ playResult }) => playResult.startsWith('PROTECTION_'))).toBe(
      true,
    );
  });

  it('reaches all track/contact/protection/receiving patterns and replays across catalog order', () => {
    const first = finish(input(0, 5));
    const second = finish(input(5, 5));
    expect(
      new Set([...first.keyPlayLog, ...second.keyPlayLog].map(({ patternId }) => patternId)),
    ).toEqual(new Set(RB_ALPHA_PATTERN_IDS));
    const baseline = finish(input(2, 4));
    expect(
      finish({
        ...input(2, 4),
        patterns: [...rbAlphaPatterns].reverse(),
        decisions: [...rbAlphaDecisions].reverse(),
      }),
    ).toEqual(baseline);
  });

  it('makes vision, ball security, protection, explosion, Body, XP, and role value observable', () => {
    const clue = rbAlphaSkills.find(({ id }) => id === 'skill_rb_flow_map_c')!;
    const plainStart = startRbGame(input(1, 1));
    const clueStart = startRbGame(input(1, 1, [clue]));
    if (
      !plainStart.ok ||
      plainStart.state.type !== 'ACTIVE' ||
      !clueStart.ok ||
      clueStart.state.type !== 'ACTIVE'
    )
      throw new Error('Expected active RB games.');
    expect(clueStart.state.pendingSnap.information.clueCount).toBe(
      plainStart.state.pendingSnap.information.clueCount + 1,
    );
    const body = rbAlphaSkills.find(({ id }) => id === 'skill_rb_contact_economy_b')!;
    const xp = rbAlphaSkills.find(({ id }) => id === 'skill_rb_rep_harvest_a')!;
    const complete = rbAlphaSkills.find(({ id }) => id === 'skill_rb_complete_back_a')!;
    const plain = finish(input(3, 4));
    const built = finish(input(3, 4, [body, xp, complete]));
    expect(built.growth.requestedBodyDelta).toBeGreaterThan(plain.growth.requestedBodyDelta);
    expect(built.growth.attributeXp.reduce((sum, row) => sum + row.awardedXp, 0)).toBeGreaterThan(
      plain.growth.attributeXp.reduce((sum, row) => sum + row.awardedXp, 0),
    );
    expect(built.summary.gradeScore).toBeGreaterThan(plain.summary.gradeScore);
    const oneCut = rbAlphaSkills.find(({ id }) => id === 'skill_rb_one_cut_a')!;
    const cutStart = startRbGame(input(0, 1, [oneCut]));
    if (!cutStart.ok || cutStart.state.type !== 'ACTIVE') throw new Error('Expected cutback snap.');
    const cut = resolveRbSnap(cutStart.state, 'key_snap_decision_rb_cut_back');
    expect(cut.ok).toBe(true);
    if (!cut.ok || cut.state.type !== 'COMPLETE') throw new Error('Expected completed cutback.');
    expect(cut.state.keyPlayLog[0]!.resolution.explosiveChancePermille).toBeGreaterThan(
      rbAlphaPatterns.find(({ id }) => id === cut.state.keyPlayLog[0]!.patternId)!
        .explosiveChancePermille,
    );
    expect(cut.state.keyPlayLog[0]!.resolution.fumbleRiskPermille).toBeGreaterThan(0);
  });

  it('selects events canonically and applies build-unlocked and amplified choices', () => {
    const selected = selectRbEvent(eventContext, rbAlphaEvents, 1_000, createRng('rb-event'));
    expect(
      selectRbEvent(eventContext, [...rbAlphaEvents].reverse(), 1_000, createRng('rb-event')),
    ).toEqual(selected);
    expect(selected.evidence.rngDrawCountAfter - selected.evidence.rngDrawCountBefore).toBe(2);
    const event = rbAlphaEvents.find(({ choices }) => choices.length === 3)!;
    const unlock = rbAlphaSkills.find(({ id }) => id === 'skill_rb_room_table_b')!;
    const boost = rbAlphaSkills.find(({ id }) => id === 'skill_rb_shared_credit_s')!;
    expect(getAvailableRbEventChoices(event, [])).toHaveLength(2);
    expect(getAvailableRbEventChoices(event, [unlock])).toHaveLength(3);
    const choice = event.choices.find(({ id }) => id.endsWith('_connect'))!;
    const base = resolveRbEventChoice(eventContext, event, choice.id, [unlock]);
    const amplified = resolveRbEventChoice(eventContext, event, choice.id, [unlock, boost]);
    expect(amplified.evidence.positiveMultiplierPermille).toBe(1_250);
    expect(amplified.nextContext.coachTrust).toBeGreaterThan(base.nextContext.coachTrust);
  });

  it('hands the detailed RB score to the 32-program round with no player-fixture world draws', () => {
    const created = createWorldAlphaSeason(
      worldAlphaMechanicsDefinition,
      createRng('rb-world'),
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
    const projected = projectRbWorldAlphaResult(game.summary, fixture);
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

  it('rejects unavailable choices without mutation or draws', () => {
    const started = startRbGame(input(0, 2));
    if (!started.ok || started.state.type !== 'ACTIVE') throw new Error('Expected active RB game.');
    const before = structuredClone(started.state);
    expect(resolveRbSnap(started.state, 'key_snap_decision_rb_unavailable')).toEqual({
      ok: false,
      reason: 'rb_game.invalid_decision',
    });
    expect(started.state).toEqual(before);
  });
});
