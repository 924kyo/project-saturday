import { describe, expect, it } from 'vitest';
import {
  QB_DECISION_FAMILY_IDS,
  QB_SKILL_EFFECT_TYPES,
  createRng,
  createWorldAlphaSeason,
  getAvailableQbEventChoices,
  getPlayableAttributeIds,
  isQbEventCatalog,
  projectQbWorldAlphaResult,
  resolveNextWorldAlphaRegularRound,
  resolveQbEventChoice,
  resolveQbSnap,
  selectQbEvent,
  startQbGame,
  type ActiveQbGame,
  type CompleteQbGame,
  type PositionAttributeProgress,
  type QbGameStartInput,
  type QbPlayerGameState,
  type QbSkillDefinition,
} from '@project-saturday/game-core';

import {
  QB_ALPHA_CLUE_IDS,
  QB_ALPHA_DECISION_IDS,
  QB_ALPHA_EVENT_IDS,
  QB_ALPHA_PATTERN_IDS,
  QB_ALPHA_SKILL_IDS,
  qbAlphaContentSchema,
} from '../schema/qb-alpha.js';
import {
  qbAlphaContent,
  qbAlphaDecisions,
  qbAlphaEvents,
  qbAlphaPatterns,
  qbAlphaSkills,
} from '../content/qb-alpha.js';
import { worldAlphaMechanicsDefinition } from '../content/world-alpha-mechanics.js';
import { localeMessages } from '../locales/index.js';
import { validateShippedContent } from './content.js';

function player(rating = 70): QbPlayerGameState {
  const attributes = Object.fromEntries(
    getPlayableAttributeIds('position_qb').map((attributeId) => [attributeId, { rating, xp: 0 }]),
  ) as PositionAttributeProgress;
  return {
    id: 'player_qb_alpha_fixture',
    positionId: 'position_qb',
    attributes,
    state: { body: 76, preparation: 68, confidence: 64, coachTrust: 52 },
  };
}

function input(
  weekIndex: number,
  opportunityCount: number,
  skills: readonly QbSkillDefinition[] = [],
): QbGameStartInput {
  return {
    gameId: `game_qb_alpha_${weekIndex}`,
    weekIndex,
    playerProgramId: 'program_ember_peak_polytechnic',
    opponentProgramId: 'program_capital_commonwealth',
    isHome: true,
    opportunityCount,
    playerTeamRating: 72,
    opponentDefenseRating: 68,
    opponentOffenseRating: 69,
    player: player(),
    patterns: qbAlphaPatterns,
    decisions: qbAlphaDecisions,
    equippedSkills: skills,
    eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, pressureReductionPermille: 0 },
    rng: createRng(`qb-alpha-${weekIndex}`),
  };
}

function finish(startInput: QbGameStartInput, chooseBest = true): CompleteQbGame {
  const started = startQbGame(startInput);
  expect(started.ok).toBe(true);
  if (!started.ok) throw new Error(started.reason);
  let state = started.state;
  while (state.type === 'ACTIVE') {
    const active = state as ActiveQbGame;
    const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
    const choice = [...pattern.decisionFits].sort((left, right) =>
      chooseBest ? right.fit - left.fit : left.fit - right.fit,
    )[0]!;
    const resolved = resolveQbSnap(active, choice.decisionId);
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
  contextTags: ['context_qb_room'],
  recentEvents: [],
} as const;

describe('M7 staged quarterback vertical', () => {
  it('stages current context before all families and retains exact earned information after each choice', () => {
    const seenFamilies = new Set<string>();
    const seenDecisions = new Set<string>();
    for (let week = 0; week < 8; week += 1) {
      for (let choice = 0; choice < 3; choice += 1) {
        const source: QbGameStartInput = {
          ...input(week, 2),
          rulesVersion: 'tactical_game_v1',
          player: player(week % 2 === 0 ? 20 : 90),
        };
        const sourceJson = JSON.stringify(source);
        const start = startQbGame(source);
        if (!start.ok || start.state.type !== 'ACTIVE') throw new Error('Expected tactical QB');
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
        const resolved = resolveQbSnap(active, selected);
        if (!resolved.ok) throw new Error(resolved.reason);
        const restored = JSON.parse(JSON.stringify(active)) as ActiveQbGame;
        expect(resolveQbSnap(restored, selected)).toEqual(resolved);
        expect(Object.isFrozen(restored.input.player)).toBe(false);
        const play = resolved.state.keyPlayLog[0]!;
        expect(play.tacticalResult!.before).toEqual(before);
        expect(play.tacticalResult!.before).not.toBe(before);
        expect(play.tacticalResult!.decisionId).toBe(selected);
        expect(play.rngDrawCountAfter - play.rngDrawCountBefore).toBe(6);
        expect(play.rngDrawCountBefore).toBe(active.rng.drawCount);
        if (resolved.state.type !== 'ACTIVE') throw new Error('Expected next QB snap');
        expect(resolved.state.pendingSnap.tacticalContext!.snapIndex).toBe(1);
        expect(play.tacticalResult!.before.snapIndex).toBe(0);
        expect(resolved.state.rng.drawCount - play.rngDrawCountAfter).toBe(5);
      }
    }
    expect(seenFamilies).toEqual(new Set(QB_DECISION_FAMILY_IDS));
    expect(seenDecisions).toEqual(new Set(QB_ALPHA_DECISION_IDS));
  });

  it('keeps current touchdowns and field/score/possession evidence coherent with six resolution draws', () => {
    const outcomes = new Set<string>();
    for (let week = 0; week < 64; week += 1) {
      const game = finish({ ...input(week, 5), rulesVersion: 'tactical_game_v1' });
      expect(game.summary.rulesVersion).toBe('tactical_game_v1');
      expect(game.rng.drawCount).toBe(5 * 11 + 2);
      for (const play of game.keyPlayLog) {
        const result = play.tacticalResult!;
        outcomes.add(result.ball.outcome);
        expect(play.rngDrawCountAfter - play.rngDrawCountBefore).toBe(6);
        expect(result.before.score.playerTeam).toBeLessThanOrEqual(game.summary.playerTeamScore);
        expect(result.before.score.opponent).toBeLessThanOrEqual(game.summary.opponentScore);
        const touchdowns = play.passingTouchdownDelta + play.rushingTouchdownDelta;
        expect(result.scoreAfter.playerTeam - result.before.score.playerTeam).toBe(touchdowns * 7);
        expect(result.scoreAfter.opponent).toBe(result.before.score.opponent);
        expect(result.ball.endLineYards).toBeGreaterThanOrEqual(1);
        expect(result.ball.endLineYards).toBeLessThanOrEqual(100);
        if (touchdowns > 0) {
          expect(result.ball.endLineYards).toBe(100);
          expect(play.passingYardsDelta + play.rushingYardsDelta).toBe(
            100 - result.before.field.lineOfScrimmageYards,
          );
          expect(play.fumbleDelta).toBe(0);
          expect(result.possessionAfter).toBe('KICKOFF');
        } else expect(result.ball.endLineYards).toBeLessThan(100);
        if (play.fumbleDelta > 0 || play.interceptionDelta > 0)
          expect(result.possessionAfter).toBe('OPPONENT');
      }
    }
    expect(outcomes).toEqual(
      new Set(['STOPPED', 'TOUCHDOWN', 'FUMBLE_LOST', 'SACK', 'INCOMPLETE', 'INTERCEPTION']),
    );
    const zero = finish({ ...input(0, 0), rulesVersion: 'tactical_game_v1' });
    expect(zero.rng).toEqual(input(0, 0).rng);
    expect(zero.keyPlayLog).toEqual([]);
    expect(zero.growth.attributeXp).toEqual([]);
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
      expect(startQbGame({ ...input(0, 2), rulesVersion } as unknown as QbGameStartInput).ok).toBe(
        false,
      );
    }
    const started = startQbGame({ ...input(0, 2), rulesVersion: 'tactical_game_v1' });
    if (!started.ok || started.state.type !== 'ACTIVE') throw new Error('Expected QB');
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
      } as unknown as ActiveQbGame;
      expect(resolveQbSnap(altered, active.pendingSnap.decisionIds[0]).ok).toBe(false);
    }
    expect(
      startQbGame({
        ...input(0, 5),
        rulesVersion: 'tactical_game_v1',
        rng: { ...createRng(1), drawCount: Number.MAX_SAFE_INTEGER - 56 },
      }).ok,
    ).toBe(false);
  });
  it('pins the literal pre-tactical touchdown/fumble contract', () => {
    // Literal input/seed: qb-alpha-45. This old abstract fumble does not prove a lost ball.
    const startInput = input(45, 5);
    const game = finish(startInput);
    expect(finish(JSON.parse(JSON.stringify(startInput)) as QbGameStartInput)).toEqual(game);
    expect(game.keyPlayLog[0]).toEqual({
      appliedSkillIds: [],
      decisionFit: 95,
      decisionId: 'key_snap_decision_qb_reach_marker',
      familyId: 'key_snap_family_qb_scramble',
      fumbleDelta: 1,
      interceptionDelta: 0,
      passingTouchdownDelta: 0,
      passingYardsDelta: 0,
      patternId: 'key_snap_pattern_qb_open_lane',
      playResult: 'SCRAMBLE',
      resolution: {
        attributeContributionMilli: 21000,
        attributeScore: 70,
        bodyContributionMilli: 6080,
        completionChancePermille: 572,
        completionRoll: 423,
        confidenceContributionMilli: 3200,
        decisionContributionMilli: 19000,
        decisionFit: 95,
        eventAdjustment: 0,
        executionRoll: 115,
        finalScore: 68,
        matchupContributionMilli: 6400,
        matchupScore: 32,
        preparationContributionMilli: 4760,
        pressureChancePermille: 360,
        pressureRoll: 875,
        skillAdjustment: 0,
        teamContextContributionMilli: 7200,
        touchdownChancePermille: 139,
        touchdownRoll: 6,
        turnoverRiskPermille: 140,
        turnoverRoll: 101,
        weightedScoreMilli: 67640,
        yardVariation: -3,
      },
      rngDrawCountAfter: 6,
      rngDrawCountBefore: 0,
      rushingTouchdownDelta: 1,
      rushingYardsDelta: 8,
      sackDelta: 0,
      snapIndex: 0,
    });
  });
  it('ships exact original density, strict schema, complete paired copy, and live effect families', () => {
    expect(qbAlphaContentSchema.safeParse(qbAlphaContent).success).toBe(true);
    expect(qbAlphaContent.decisions.map(({ id }) => id)).toEqual(QB_ALPHA_DECISION_IDS);
    expect(qbAlphaContent.patterns.map(({ id }) => id)).toEqual(QB_ALPHA_PATTERN_IDS);
    expect(qbAlphaContent.clues.map(({ id }) => id)).toEqual(QB_ALPHA_CLUE_IDS);
    expect(qbAlphaContent.skills.map(({ id }) => id)).toEqual(QB_ALPHA_SKILL_IDS);
    expect(qbAlphaContent.events.map(({ id }) => id)).toEqual(QB_ALPHA_EVENT_IDS);
    expect(isQbEventCatalog(qbAlphaEvents)).toBe(true);
    expect(
      new Set(qbAlphaSkills.flatMap(({ effects }) => effects.map(({ type }) => type))),
    ).toEqual(new Set(QB_SKILL_EFFECT_TYPES));
    expect(new Set(qbAlphaContent.patterns.map(({ familyId }) => familyId))).toEqual(
      new Set(QB_DECISION_FAMILY_IDS),
    );
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
    for (const locale of ['ko-KR', 'en-US'] as const) {
      const messages: Readonly<Record<string, string>> = localeMessages[locale];
      expect(messages[qbAlphaContent.nameKey]).toBeTruthy();
      for (const item of [
        ...qbAlphaContent.decisions,
        ...qbAlphaContent.patterns,
        ...qbAlphaContent.clues,
        ...qbAlphaContent.skills,
        ...qbAlphaContent.events,
        ...qbAlphaContent.events.flatMap(({ choices }) => choices),
      ]) {
        expect(messages[item.nameKey]).toBeTruthy();
        expect(messages[item.descriptionKey]).toBeTruthy();
      }
    }
  });

  it('uses zero RNG for signal review and exactly six recorded draws for every assigned snap', () => {
    const inactive = finish(input(0, 0));
    expect(inactive.summary.participationFeedbackId).toBe('game_participation_qb_signal_review');
    expect(inactive.summary.gameRngDrawCountAfter).toBe(inactive.summary.gameRngDrawCountBefore);
    expect(inactive.growth.requestedBodyDelta).toBe(-2);

    const active = finish(input(0, 5));
    expect(active.keyPlayLog).toHaveLength(5);
    expect(active.summary.gameRngDrawCountAfter - active.summary.gameRngDrawCountBefore).toBe(30);
    for (const play of active.keyPlayLog) {
      expect(play.rngDrawCountAfter - play.rngDrawCountBefore).toBe(6);
      expect(play.resolution.weightedScoreMilli).toBe(
        play.resolution.attributeContributionMilli +
          play.resolution.decisionContributionMilli +
          play.resolution.matchupContributionMilli +
          play.resolution.bodyContributionMilli +
          play.resolution.preparationContributionMilli +
          play.resolution.confidenceContributionMilli +
          play.resolution.teamContextContributionMilli,
      );
    }
  });

  it('reaches all eight patterns and preserves replay when catalogs are reordered', () => {
    const first = finish(input(0, 5));
    const second = finish(input(5, 5));
    expect(
      new Set([...first.keyPlayLog, ...second.keyPlayLog].map(({ patternId }) => patternId)),
    ).toEqual(new Set(QB_ALPHA_PATTERN_IDS));
    const baseline = finish(input(2, 4));
    const reordered = finish({
      ...input(2, 4),
      patterns: [...qbAlphaPatterns].reverse(),
      decisions: [...qbAlphaDecisions].reverse(),
    });
    expect(reordered).toEqual(baseline);
  });

  it('makes information, decision quality, progression, role, and Body skills observable', () => {
    const clueSkill = qbAlphaSkills.find(({ id }) => id === 'skill_qb_chalkboard_echo_c')!;
    const plainStart = startQbGame(input(1, 1));
    const informedStart = startQbGame(input(1, 1, [clueSkill]));
    expect(plainStart.ok && plainStart.state.type === 'ACTIVE').toBe(true);
    expect(informedStart.ok && informedStart.state.type === 'ACTIVE').toBe(true);
    if (
      !plainStart.ok ||
      plainStart.state.type !== 'ACTIVE' ||
      !informedStart.ok ||
      informedStart.state.type !== 'ACTIVE'
    )
      throw new Error('Expected active QB starts.');
    expect(informedStart.state.pendingSnap.information.clueCount).toBe(
      plainStart.state.pendingSnap.information.clueCount + 1,
    );

    const body = qbAlphaSkills.find(({ id }) => id === 'skill_qb_weekly_maintenance_c')!;
    const xp = qbAlphaSkills.find(({ id }) => id === 'skill_qb_rep_compounder_a')!;
    const command = qbAlphaSkills.find(({ id }) => id === 'skill_qb_command_presence_a')!;
    const plain = finish(input(3, 3));
    const built = finish(input(3, 3, [body, xp, command]));
    expect(built.growth.requestedBodyDelta).toBeGreaterThan(plain.growth.requestedBodyDelta);
    expect(built.growth.attributeXp.reduce((sum, item) => sum + item.awardedXp, 0)).toBeGreaterThan(
      plain.growth.attributeXp.reduce((sum, item) => sum + item.awardedXp, 0),
    );
    expect(built.summary.gradeScore).toBeGreaterThan(plain.summary.gradeScore);
    expect(built.growth.coachTrustAfter).toBeGreaterThanOrEqual(plain.growth.coachTrustAfter);
  });

  it('selects events canonically and makes unlock and positive-outcome skills change choices', () => {
    const first = selectQbEvent(eventContext, qbAlphaEvents, 1_000, createRng('qb-event'));
    const reordered = selectQbEvent(
      eventContext,
      [...qbAlphaEvents].reverse(),
      1_000,
      createRng('qb-event'),
    );
    expect(first).toEqual(reordered);
    expect(first.evidence.rngDrawCountAfter - first.evidence.rngDrawCountBefore).toBe(2);

    const event = qbAlphaEvents.find(({ choices }) => choices.length === 3)!;
    const unlock = qbAlphaSkills.find(({ id }) => id === 'skill_qb_open_office_b')!;
    const amplifier = qbAlphaSkills.find(({ id }) => id === 'skill_qb_shared_spotlight_s')!;
    expect(getAvailableQbEventChoices(event, [])).toHaveLength(2);
    expect(getAvailableQbEventChoices(event, [unlock])).toHaveLength(3);
    const positiveChoice = event.choices.find(({ id }) => id.endsWith('_connect'))!;
    const base = resolveQbEventChoice(eventContext, event, positiveChoice.id, [unlock]);
    const amplified = resolveQbEventChoice(eventContext, event, positiveChoice.id, [
      unlock,
      amplifier,
    ]);
    expect(amplified.evidence.positiveMultiplierPermille).toBe(1_250);
    expect(
      Object.values(amplified.evidence.appliedEffects)
        .filter((value): value is number => typeof value === 'number' && value > 0)
        .reduce((sum, value) => sum + value, 0),
    ).toBeGreaterThan(
      Object.values(base.evidence.appliedEffects)
        .filter((value): value is number => typeof value === 'number' && value > 0)
        .reduce((sum, value) => sum + value, 0),
    );
  });

  it('feeds a completed QB result into the 32-program round without consuming player-fixture world RNG', () => {
    const created = createWorldAlphaSeason(
      worldAlphaMechanicsDefinition,
      createRng('qb-world'),
      0,
      'program_ember_peak_polytechnic',
    );
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.reason);
    const fixture = worldAlphaMechanicsDefinition.regularSeasonRounds[0]!.fixtures.find(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === 'program_ember_peak_polytechnic' ||
        awayProgramId === 'program_ember_peak_polytechnic',
    )!;
    const game = finish({
      ...input(0, 3),
      playerProgramId: 'program_ember_peak_polytechnic',
      opponentProgramId:
        fixture.homeProgramId === 'program_ember_peak_polytechnic'
          ? fixture.awayProgramId
          : fixture.homeProgramId,
      isHome: fixture.homeProgramId === 'program_ember_peak_polytechnic',
    });
    const projected = projectQbWorldAlphaResult(game.summary, fixture);
    expect(projected.ok).toBe(true);
    if (!projected.ok) throw new Error(projected.reason);
    const before = created.value.rng.drawCount;
    const resolved = resolveNextWorldAlphaRegularRound(
      created.value,
      worldAlphaMechanicsDefinition,
      projected.result,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error(resolved.reason);
    expect(resolved.value.state.rng.drawCount - before).toBe(30);
    expect(
      resolved.value.state.regularSeasonResults[0]!.fixtureResults.find(
        (result) => result?.fixtureId === fixture.id,
      ),
    ).toEqual(projected.result);
  });

  it('rejects invalid decisions without drawing or mutating the active game', () => {
    const started = startQbGame(input(0, 2));
    expect(started.ok).toBe(true);
    if (!started.ok || started.state.type !== 'ACTIVE') throw new Error('Expected active game.');
    const active: ActiveQbGame = started.state;
    const before = structuredClone(active);
    expect(resolveQbSnap(active, 'key_snap_decision_qb_not_available')).toEqual({
      ok: false,
      reason: 'qb_game.invalid_decision',
    });
    expect(active).toEqual(before);
  });
});
