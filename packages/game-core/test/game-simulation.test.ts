import { describe, expect, it } from 'vitest';

import {
  advanceDevelopmentWeek,
  advanceHistoricalDevelopmentWeek,
  depthRoleIdForRank,
  DEPTH_EVALUATION_WEIGHTS_PERMILLE,
  createRng,
  deriveGameOpportunityBudget,
  deriveKeySnapInformation,
  deriveWeeklySkillBreakthroughProgress,
  isGameTuningDefinition,
  isKeySnapFamilyMechanicsDefinitionCatalog,
  isKeySnapPatternMechanicsDefinitionCatalog,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  migrateCareerRunV7ToV8,
  createCareerSession,
  parseCareerSessionV8,
  parseCareerSessionV7,
  parseCareerRunV7,
  runCareerCommandV8,
  acknowledgePostGameCareerV8,
  parseCareerRunV8,
  prepareGame,
  prepareScheduledGame,
  resolveKeySnap,
  startGame,
  validateCareerRun,
  type CareerRun,
  type DepthEvaluationTuple,
  type DepthOrderTuple,
  type DevelopmentWeekConfig,
  type GameCommandResult,
  type KeySnapPatternMechanicsDefinition,
  type KeySnapDecisionId,
  type SkillGameHookId,
  type SkillMechanicsDefinition,
  type WeeklyActionDefinition,
} from '../src/index.js';
import { CAREER_RUN_V3_PHASE_FIXTURE_CASES } from './fixtures/career-run-v3.js';
import {
  TEST_GAME_FAMILIES,
  TEST_GAME_PATTERNS,
  TEST_GAME_SKILLS,
  TEST_ALL_GAME_HOOK_SKILLS,
  TEST_COVERAGE_GAME_SKILLS,
  TEST_GAME_TUNING,
  TEST_OPPONENT_GAME_PROFILE,
  TEST_PLAYER_GAME_PROFILE,
} from './helpers/game-fixtures.js';
import { enrollTestCareer } from './helpers/enrolled-career.js';
import { createWrTacticalSnapContextV1 } from '../src/games/tactical-wr-v1.js';
import {
  advanceWrDriveEvidence,
  stageWrResolvedSnapBoundaryV1,
  matchesWrResolvedSnapBoundaryV1,
  resolveWrPlayEvidence,
  type WrSimulationCursor,
} from '../src/games/transitions.js';
import { createEmptyWrGameStatLine } from '../src/games/types.js';
import {
  createWrTacticalGameV1,
  prepareWrTacticalGameV1,
  startWrTacticalGameV1,
  chooseWrTacticalSnapV1,
  advanceWrTacticalGameV1,
  parseWrTacticalGameV1,
  isWrTacticalGameV1,
  type WrTacticalMechanicsV1,
} from '../src/games/tactical-wr-game-v1.js';
import { projectWrTacticalCareerV8 } from '../src/player/career-v8.js';
import {
  prepareGameV8,
  prepareScheduledGameV8,
  startGameV8,
  resolveKeySnapV8,
  continueResolvedSnapV8,
  type GameCommandResultV8,
} from '../src/games/commands-v8.js';

function v8CommandCareer(result: GameCommandResultV8) {
  expect(result.ok, result.ok ? undefined : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.career;
}

const WR_TACTICAL_MECHANICS: WrTacticalMechanicsV1 = {
  tuning: TEST_GAME_TUNING,
  families: TEST_GAME_FAMILIES,
  patterns: TEST_GAME_PATTERNS,
  skills: TEST_GAME_SKILLS,
};

type DeepMutable<T> = T extends readonly (infer TItem)[]
  ? DeepMutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
    : T;

const TEST_DEVELOPMENT_CONFIG = {
  bodyXpEfficiencyMinPermille: 600,
  bodyXpEfficiencyPerBodyPoint: 4,
  passiveBodyRecovery: 10,
  proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
  proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
} as const satisfies DevelopmentWeekConfig;

const TEST_WEEKLY_DEFINITIONS = [
  {
    id: 'action_recovery',
    tagIds: ['action_focus_body'],
    attributeXp: [],
    bodyDelta: 10,
    gpaDelta: 0,
    practiceImpact: 0,
    preparationDelta: 0,
    confidenceDelta: 0,
    proficiencyId: null,
  },
] as const satisfies readonly WeeklyActionDefinition[];

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

function commandCareer(result: GameCommandResult): CareerRun {
  expect(result.ok, result.ok ? undefined : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.career;
}

function weekEndCareer(
  minSnapPermille: number,
  maxSnapPermille: number,
  forceDevelopmentalRank = false,
): CareerRun {
  const fixture = CAREER_RUN_V3_PHASE_FIXTURE_CASES.find(({ name }) => name === 'weekEnd');
  if (fixture === undefined) throw new Error('Missing strict v3 week-end fixture.');
  const enrolled = enrollTestCareer(
    migrateCareerRunV6ToV7(
      migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(fixture.career))),
    ),
  );
  if (enrolled.phase.type !== 'WEEK_END' || enrolled.programContext === null) {
    throw new Error('Expected an enrolled week-end career.');
  }
  let evaluations = [...enrolled.programContext.evaluations];
  if (forceDevelopmentalRank) {
    evaluations = evaluations.map((evaluation) => {
      if (evaluation.participantId !== enrolled.player.id) return evaluation;
      const components = {
        talentFit: 0,
        coachTrust: enrolled.player.state.coachTrust,
        practiceForm: enrolled.programContext!.playerPracticeForm,
        schemeFit: 0,
        experienceReadiness: 0,
      };
      const contributions = {
        talentFitMilli: components.talentFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.talentFit,
        coachTrustMilli: components.coachTrust * DEPTH_EVALUATION_WEIGHTS_PERMILLE.coachTrust,
        practiceFormMilli: components.practiceForm * DEPTH_EVALUATION_WEIGHTS_PERMILLE.practiceForm,
        schemeFitMilli: components.schemeFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.schemeFit,
        experienceReadinessMilli:
          components.experienceReadiness * DEPTH_EVALUATION_WEIGHTS_PERMILLE.experienceReadiness,
      };
      return {
        ...evaluation,
        components,
        contributions,
        totalScoreMilli: Object.values(contributions).reduce((total, value) => total + value, 0),
      };
    });
    evaluations.sort((left, right) =>
      right.totalScoreMilli === left.totalScoreMilli
        ? left.participantId < right.participantId
          ? -1
          : left.participantId > right.participantId
            ? 1
            : 0
        : right.totalScoreMilli - left.totalScoreMilli,
    );
  }
  const rankedEvaluations = evaluations.map((evaluation, index) => ({
    ...evaluation,
    rank: index + 1,
    roleId: depthRoleIdForRank(index + 1),
  })) as unknown as DepthEvaluationTuple;
  const playerRank = rankedEvaluations.find(
    ({ participantId }) => participantId === enrolled.player.id,
  )!.rank;
  const next: CareerRun = {
    ...enrolled,
    programContext: {
      ...enrolled.programContext,
      evaluations: rankedEvaluations,
      depthOrderIds: rankedEvaluations.map(
        ({ participantId }) => participantId,
      ) as unknown as DepthOrderTuple,
      projection: {
        rank: playerRank,
        roleId: depthRoleIdForRank(playerRank),
        minSnapPermille,
        maxSnapPermille,
      },
    },
  };
  expect(validateCareerRun(next)).toEqual({ issues: [], ok: true });
  return next;
}

function prepare(
  career: CareerRun,
  skillDefinitions: readonly SkillMechanicsDefinition[] = TEST_GAME_SKILLS,
): CareerRun {
  return commandCareer(
    prepareGame(
      career,
      TEST_PLAYER_GAME_PROFILE,
      TEST_OPPONENT_GAME_PROFILE,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      skillDefinitions,
    ),
  );
}

function start(
  career: CareerRun,
  skillDefinitions: readonly SkillMechanicsDefinition[] = TEST_GAME_SKILLS,
): CareerRun {
  return commandCareer(
    startGame(career, TEST_GAME_TUNING, TEST_GAME_FAMILIES, TEST_GAME_PATTERNS, skillDefinitions),
  );
}

function resolve(
  career: CareerRun,
  decisionId: KeySnapDecisionId,
  skillDefinitions: readonly SkillMechanicsDefinition[] = TEST_GAME_SKILLS,
): CareerRun {
  return commandCareer(
    resolveKeySnap(
      career,
      decisionId,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      skillDefinitions,
    ),
  );
}

function gamePlayLog(career: CareerRun) {
  return career.phase.type === 'KEY_SNAP'
    ? career.phase.game.keyPlayLog
    : career.phase.type === 'POST_GAME'
      ? career.phase.keyPlayLog
      : [];
}

function withFootballIq(career: CareerRun, rating: number): CareerRun {
  const mutable = jsonClone(career);
  mutable.player.attributes.mental.attribute_football_iq.rating = rating;
  mutable.player.attributes.mental.attribute_football_iq.xp = 0;
  const next = mutable as unknown as CareerRun;
  expect(validateCareerRun(next)).toEqual({ issues: [], ok: true });
  return next;
}

describe('M4 game preparation and drive simulation', () => {
  it('routes already-started migrated WR games through literal old commands until the final whistle', () => {
    for (const startingPhase of ['PREVIEW', 'KEY_SNAP'] as const) {
      let literal = prepare(weekEndCareer(450, 650));
      if (startingPhase === 'KEY_SNAP') literal = start(literal);
      let current = migrateCareerRunV7ToV8(literal);
      if (startingPhase === 'PREVIEW') {
        literal = start(literal);
        current = v8CommandCareer(startGameV8(current, WR_TACTICAL_MECHANICS));
        expect(current).toEqual(migrateCareerRunV7ToV8(literal));
      }
      while (literal.phase.type === 'KEY_SNAP') {
        const decision = literal.phase.pendingSnap.decisionIds[0];
        expect(continueResolvedSnapV8(current, WR_TACTICAL_MECHANICS).ok).toBe(false);
        literal = resolve(literal, decision);
        current = v8CommandCareer(resolveKeySnapV8(current, decision, WR_TACTICAL_MECHANICS));
        expect(current).toEqual(migrateCareerRunV7ToV8(literal));
        expect(current).not.toHaveProperty('tacticalGame');
      }
      expect(current.phase.type).toBe('POST_GAME');
      expect(parseCareerRunV8(JSON.stringify(current)).ok).toBe(true);
    }
  });

  it('prepares only new WR games under v8 and publishes one explicit resolved boundary per choice', () => {
    const source = migrateCareerRunV7ToV8(weekEndCareer(450, 650));
    const before = JSON.stringify(source);
    let current = v8CommandCareer(
      prepareGameV8(
        source,
        TEST_PLAYER_GAME_PROFILE,
        TEST_OPPONENT_GAME_PROFILE,
        WR_TACTICAL_MECHANICS,
      ),
    );
    expect(current.rng).toEqual(source.rng);
    expect(current.revision).toBe(source.revision + 1);
    expect(current.phase).toHaveProperty('rulesVersion', 'tactical_game_v1');
    expect(current.tacticalGame?.boundary.type).toBe('GAME_PREVIEW');
    expect(
      runCareerCommandV8(source, WR_TACTICAL_MECHANICS, (literal) => ({
        ok: true as const,
        career: prepare(literal),
      })),
    ).toEqual({ ok: true, career: current });
    let invoked = false;
    expect(
      runCareerCommandV8(current, WR_TACTICAL_MECHANICS, (literal) => {
        invoked = true;
        return { ok: true as const, career: literal };
      }).ok,
    ).toBe(false);
    expect(invoked).toBe(false);
    current = v8CommandCareer(startGameV8(current, WR_TACTICAL_MECHANICS));
    while (current.phase.type === 'KEY_SNAP') {
      const beforeChoice = current;
      const decision = current.phase.pendingSnap.decisionIds[0];
      current = v8CommandCareer(resolveKeySnapV8(current, decision, WR_TACTICAL_MECHANICS));
      expect(current.phase.type).toBe('SNAP_RESOLVED');
      expect(current.rng.drawCount - beforeChoice.rng.drawCount).toBe(6);
      expect(current.player).toEqual(beforeChoice.player);
      expect(current.revision).toBe(beforeChoice.revision + 1);
      expect(resolveKeySnapV8(current, decision, WR_TACTICAL_MECHANICS)).toEqual({
        ok: false,
        career: current,
        reason: 'game.invalid_phase',
      });
      const loaded = parseCareerRunV8(JSON.stringify(current), WR_TACTICAL_MECHANICS);
      if (!loaded.ok) throw new Error('Expected resolved reload.');
      const lastResult = current.tacticalGame!.lastResolvedPlay;
      current = v8CommandCareer(continueResolvedSnapV8(loaded.career, WR_TACTICAL_MECHANICS));
      expect(current.tacticalGame?.lastResolvedPlay).toEqual(lastResult);
    }
    expect(current.phase.type).toBe('POST_GAME');
    expect(current.gameCareerState.gamesPlayed).toBe(source.gameCareerState.gamesPlayed + 1);
    expect(continueResolvedSnapV8(current, WR_TACTICAL_MECHANICS).ok).toBe(false);
    const forged = { ...current, revision: current.revision + 1 };
    const rejected = startGameV8(forged, WR_TACTICAL_MECHANICS);
    expect(rejected).toEqual({ ok: false, career: forged, reason: 'game.invalid_career' });
    expect(rejected.career).toBe(forged);
    expect(JSON.stringify(source)).toBe(before);
    const beforeAck = JSON.stringify(current);
    const failed = acknowledgePostGameCareerV8(current, WR_TACTICAL_MECHANICS, () => ({
      ok: false as const,
      reason: 'test.retry',
    }));
    expect(failed).toEqual({ ok: false, career: current, reason: 'test.retry' });
    expect(failed.career).toBe(current);
    expect(
      acknowledgePostGameCareerV8(current, WR_TACTICAL_MECHANICS, (literal) => ({
        ok: true as const,
        career: literal,
      })).ok,
    ).toBe(false);
    const consume = (literal: CareerRun) => {
      expect(literal).not.toHaveProperty('tacticalGame');
      expect(literal.gameCareerState).toEqual(current.gameCareerState);
      expect(literal.player).toEqual(current.player);
      expect(literal.rng).toEqual(current.rng);
      const result = advanceDevelopmentWeek(
        literal,
        TEST_DEVELOPMENT_CONFIG,
        TEST_GAME_SKILLS,
        TEST_WEEKLY_DEFINITIONS,
      );
      return result.ok ? { ...result, auxiliary: { token: 'preserved_evidence' } } : result;
    };
    const acknowledged = acknowledgePostGameCareerV8(current, WR_TACTICAL_MECHANICS, consume);
    expect(acknowledged.ok).toBe(true);
    if (!acknowledged.ok) throw new Error(acknowledged.reason);
    expect(acknowledged.auxiliary).toEqual({ token: 'preserved_evidence' });
    expect(acknowledged.career.weekIndex).toBe(current.weekIndex + 1);
    expect(acknowledged.career.gameCareerState).toEqual(current.gameCareerState);
    expect(acknowledged.career).not.toHaveProperty('tacticalGame');
    expect(parseCareerRunV8(acknowledged.career).ok).toBe(true);
    expect(
      acknowledgePostGameCareerV8(acknowledged.career, WR_TACTICAL_MECHANICS, consume).ok,
    ).toBe(false);
    expect(JSON.stringify(current)).toBe(beforeAck);
  });

  it('preserves scheduled identity and zero-opportunity availability when preparing current WR games', () => {
    const source = migrateCareerRunV7ToV8(weekEndCareer(450, 650));
    const identity = { gameId: 'game_v8_scheduled', isHome: false } as const;
    const prepared = v8CommandCareer(
      prepareScheduledGameV8(
        source,
        identity,
        TEST_PLAYER_GAME_PROFILE,
        TEST_OPPONENT_GAME_PROFILE,
        WR_TACTICAL_MECHANICS,
        { maximumOpportunities: 0 },
      ),
    );
    if (prepared.phase.type !== 'GAME_PREVIEW') throw new Error('Expected preview.');
    expect(prepared.phase.matchup).toEqual(
      expect.objectContaining({ ...identity, opportunityBudget: 0 }),
    );
    const current = v8CommandCareer(startGameV8(prepared, WR_TACTICAL_MECHANICS));
    expect(current.phase.type).toBe('POST_GAME');
    expect(current.gameCareerState.lastGame?.statLine).toEqual(createEmptyWrGameStatLine());
    expect(current.tacticalGame?.lastResolvedPlay).toBeNull();
    const exhausted = { ...source, revision: Number.MAX_SAFE_INTEGER };
    expect(
      prepareGameV8(
        exhausted,
        TEST_PLAYER_GAME_PROFILE,
        TEST_OPPONENT_GAME_PROFILE,
        WR_TACTICAL_MECHANICS,
      ),
    ).toEqual({ ok: false, career: exhausted, reason: 'game.revision_exhausted' });
  });

  it('replays whole staged WR games through separately retained results and exactly one final growth award', () => {
    for (let seed = 0; seed < 8; seed += 1) {
      const base = withFootballIq(weekEndCareer(450, 650), seed % 2 === 0 ? 20 : 90);
      const mechanics =
        seed % 2 === 0
          ? { ...WR_TACTICAL_MECHANICS, skills: TEST_ALL_GAME_HOOK_SKILLS }
          : WR_TACTICAL_MECHANICS;
      const source = prepare(
        { ...base, rng: { ...createRng(`m7-5-wr-record-${seed}`), drawCount: base.rng.drawCount } },
        mechanics.skills,
      );
      const sourceBefore = JSON.stringify(source);
      const sourceSession = createCareerSession(source);
      const verifyV8 = (current: NonNullable<ReturnType<typeof createWrTacticalGameV1>>) => {
        const projected = projectWrTacticalCareerV8(current, mechanics);
        expect(projected).toBeDefined();
        if (projected === undefined) throw new Error('Expected current v8 projection.');
        expect(parseCareerRunV8(JSON.stringify(projected), mechanics)).toEqual({
          ok: true,
          career: projected,
        });
        expect(parseCareerRunV8(projected).ok).toBe(false);
        expect(parseCareerRunV7({ ...projected, schemaVersion: 7 }).ok).toBe(false);
        const session = {
          schemaVersion: 8 as const,
          career: projected,
          world: sourceSession.world,
        };
        expect(parseCareerSessionV8(JSON.stringify(session), mechanics)).toEqual({
          ok: true,
          session,
        });
        expect(parseCareerSessionV7(session).ok).toBe(false);
        expect(session.world.rng).toEqual(sourceSession.world.rng);
        const missing = jsonClone(projected);
        delete missing.tacticalGame;
        expect(parseCareerRunV8(missing, mechanics).ok).toBe(false);
        expect(
          parseCareerRunV8({ ...projected, revision: projected.revision + 1 }, mechanics).ok,
        ).toBe(false);
        expect(
          parseCareerSessionV8(
            { ...session, world: { ...session.world, careerId: 'career_wrong' } },
            mechanics,
          ).ok,
        ).toBe(false);
      };
      const preview = prepareWrTacticalGameV1(source, mechanics);
      if (preview === undefined) throw new Error('Expected current preview.');
      expect(preview.revision).toBe(source.revision);
      expect(preview.source.rng).toEqual(source.rng);
      verifyV8(preview);
      let record = createWrTacticalGameV1(source, mechanics);
      if (record === undefined || source.phase.type !== 'GAME_PREVIEW')
        throw new Error('Expected current kickoff.');
      expect(record.lastResolvedPlay).toBeNull();
      expect(startWrTacticalGameV1(preview, mechanics)).toEqual(record);
      expect(startWrTacticalGameV1(record, mechanics)).toBeUndefined();
      for (let snap = 0; snap < source.phase.matchup.opportunityBudget; snap += 1) {
        if (record.boundary.type !== 'KEY_SNAP') throw new Error('Expected current decision.');
        expect(parseWrTacticalGameV1(JSON.stringify(record), mechanics)).toEqual(record);
        verifyV8(record);
        expect(advanceWrTacticalGameV1(record, mechanics)).toBeUndefined();
        const previous = record;
        const decision = record.boundary.pendingSnap.decisionIds[(seed + snap) % 3]!;
        const resolved = chooseWrTacticalSnapV1(record, decision, mechanics);
        if (resolved === undefined || resolved.boundary.type !== 'SNAP_RESOLVED')
          throw new Error('Expected retained result.');
        expect(resolved).toEqual(chooseWrTacticalSnapV1(record, decision, mechanics));
        expect(resolved.revision).toBe(previous.revision + 1);
        expect(resolved.boundary.result.nextRng.drawCount - record.boundary.rng.drawCount).toBe(6);
        expect(resolved.lastResolvedPlay).toEqual(resolved.boundary.result.play);
        expect(resolved.source.player).toEqual(source.player);
        expect(chooseWrTacticalSnapV1(resolved, decision, mechanics)).toBeUndefined();
        const loaded = parseWrTacticalGameV1(JSON.stringify(resolved), mechanics);
        if (loaded === undefined) throw new Error('Expected exact resolved reload.');
        expect(loaded).toEqual(resolved);
        verifyV8(loaded);
        const next = advanceWrTacticalGameV1(loaded, mechanics);
        if (next === undefined) throw new Error('Expected continued game.');
        expect(next.lastResolvedPlay).toEqual(resolved.lastResolvedPlay);
        expect(next.revision).toBe(resolved.revision + 1);
        expect(advanceWrTacticalGameV1(resolved, mechanics)).toEqual(next);
        expectDeepFrozen(next);
        record = next;
      }
      if (record.boundary.type !== 'POST_GAME') throw new Error('Expected final.');
      expect(record.decisions).toHaveLength(source.phase.matchup.opportunityBudget);
      expect(record.boundary.completion.gameCareerState.gamesPlayed).toBe(
        source.gameCareerState.gamesPlayed + 1,
      );
      expect(record.boundary.completion.phase.growth.bodyBefore).toBe(source.player.state.body);
      expect(record.boundary.completion.player.state.body).toBe(
        record.boundary.completion.phase.growth.bodyAfter,
      );
      expect(record.boundary.completion.phase.keyPlayLog.at(-1)).toEqual(record.lastResolvedPlay);
      expect(parseWrTacticalGameV1(JSON.stringify(record), mechanics)).toEqual(record);
      verifyV8(record);
      expect(advanceWrTacticalGameV1(record, mechanics)).toBeUndefined();
      expect(
        chooseWrTacticalSnapV1(record, 'key_snap_decision_attack_high_point', mechanics),
      ).toBeUndefined();
      expect(JSON.stringify(source)).toBe(sourceBefore);
      expect(new TextEncoder().encode(JSON.stringify(record)).byteLength).toBeLessThan(1_000_000);
    }
  });

  it('rejects forged whole-game WR sources, decisions, boundaries, growth and recursive records', () => {
    const source = prepare(weekEndCareer(450, 650));
    const record = createWrTacticalGameV1(source, WR_TACTICAL_MECHANICS);
    if (record === undefined || record.boundary.type !== 'KEY_SNAP')
      throw new Error('Expected kickoff.');
    const bad = [
      { ...record, model: 'wr_tactical_game_v2' },
      { ...record, future: undefined },
      { ...record, revision: record.revision + 1 },
      { ...record, source: { ...record.source, schemaVersion: 8 } },
      { ...record, source: { ...record.source, tacticalGame: record } },
      {
        ...record,
        boundary: {
          ...record.boundary,
          context: { ...record.boundary.context, score: { playerTeam: 100, opponent: 100 } },
        },
      },
      {
        ...record,
        boundary: {
          ...record.boundary,
          rng: { ...record.boundary.rng, drawCount: record.boundary.rng.drawCount + 1 },
        },
      },
      {
        ...record,
        boundary: {
          ...record.boundary,
          pendingSnap: { ...record.boundary.pendingSnap, revealedClueIds: ['game_clue_fake'] },
        },
      },
      { ...record, decisions: new Array(1) },
      {
        ...record,
        decisions: Array.from({ length: 13 }, () => 'key_snap_decision_attack_high_point'),
      },
    ];
    for (const value of bad) expect(isWrTacticalGameV1(value, WR_TACTICAL_MECHANICS)).toBe(false);
    const resolved = chooseWrTacticalSnapV1(
      record,
      record.boundary.pendingSnap.decisionIds[0],
      WR_TACTICAL_MECHANICS,
    );
    if (resolved === undefined) throw new Error('Expected retained snap.');
    expect(isWrTacticalGameV1({ ...resolved, lastResolvedPlay: null }, WR_TACTICAL_MECHANICS)).toBe(
      false,
    );
    expect(isWrTacticalGameV1({ ...resolved, decisions: [] }, WR_TACTICAL_MECHANICS)).toBe(false);
    const mutable = JSON.parse(JSON.stringify(resolved)) as typeof resolved;
    const parsed = parseWrTacticalGameV1(mutable, WR_TACTICAL_MECHANICS);
    expect(parsed).toEqual(resolved);
    expect(Object.isFrozen(mutable.source.player)).toBe(false);
    expect(parsed?.source.player).not.toBe(mutable.source.player);
    expect(
      parseWrTacticalGameV1(' '.repeat(1_000_000) + JSON.stringify(record), WR_TACTICAL_MECHANICS),
    ).toBeUndefined();
    expect(parseWrTacticalGameV1('{', WR_TACTICAL_MECHANICS)).toBeUndefined();
    expect(createWrTacticalGameV1(start(source), WR_TACTICAL_MECHANICS)).toBeUndefined();
  });

  it('retains literal zero-opportunity WR completion and rejects double or forged growth', () => {
    const source = prepare(weekEndCareer(0, 0, true));
    const record = createWrTacticalGameV1(source, WR_TACTICAL_MECHANICS);
    const historical = start(source);
    if (record === undefined || record.boundary.type !== 'POST_GAME')
      throw new Error('Expected zero-opportunity final.');
    expect(record.boundary.rng).toEqual(historical.rng);
    expect(record.boundary.completion).toEqual({
      phase: historical.phase,
      player: historical.player,
      gameCareerState: historical.gameCareerState,
    });
    expect(record.lastResolvedPlay).toBeNull();
    expect(record.decisions).toEqual([]);
    expect(parseWrTacticalGameV1(record, WR_TACTICAL_MECHANICS)).toEqual(record);
    const forged = jsonClone(record);
    if (forged.boundary.type !== 'POST_GAME') throw new Error('Expected mutable final.');
    forged.boundary.completion.player.state.body -= 1;
    forged.boundary.completion.phase.growth.bodyAfter -= 1;
    expect(isWrTacticalGameV1(forged, WR_TACTICAL_MECHANICS)).toBe(false);
    expect(advanceWrTacticalGameV1(record, WR_TACTICAL_MECHANICS)).toBeUndefined();
  });

  it('stages current WR drives through all opportunities with real positive clocks and detached context', () => {
    const outcomes = new Set<string>();
    let goalToGo = 0;
    for (let seed = 0; seed < 64; seed += 1) {
      const base = weekEndCareer(700, 900);
      const career = prepare({
        ...base,
        rng: { ...createRng(`m7-5-wr-drive-${seed}`), drawCount: base.rng.drawCount },
      });
      if (career.phase.type !== 'GAME_PREVIEW') throw new Error('Expected preview.');
      const sourceJson = JSON.stringify(career);
      // Exercise the accepted 12-snap kernel bound and slow-drive tuning too;
      // live commands still own earned role caps before constructing this cursor.
      const budget = seed % 4 === 0 ? 12 : career.phase.matchup.opportunityBudget;
      const tuning =
        seed % 2 === 0
          ? {
              ...TEST_GAME_TUNING,
              drive: {
                ...TEST_GAME_TUNING.drive,
                minimumSecondsElapsed: 300,
                maximumSecondsElapsed: 600,
              },
            }
          : TEST_GAME_TUNING;
      expect(isGameTuningDefinition(tuning)).toBe(true);
      let cursor: WrSimulationCursor = {
        matchup: { ...career.phase.matchup, opportunityBudget: budget },
        secondsRemaining: 3600,
        driveIndex: 0,
        possessionId: seed % 2 === 0 ? 'game_possession_opponent' : 'game_possession_player_team',
        score: { playerTeam: 0, opponent: 0 },
        statLine: createEmptyWrGameStatLine(),
        keyPlayLog: [],
        gameRngDrawCountBefore: career.rng.drawCount,
      };
      let rng = career.rng;
      let finishPlayerDrive = false;
      let previousSeconds = 3601;
      for (let boundary = 0; boundary <= budget; boundary += 1) {
        const options = { rulesVersion: 'tactical_game_v1' as const, finishPlayerDrive };
        const before = JSON.stringify(cursor);
        const advanced = advanceWrDriveEvidence(
          career,
          cursor,
          rng,
          tuning,
          TEST_GAME_FAMILIES,
          TEST_GAME_PATTERNS,
          [],
          options,
        );
        expect(advanced).toEqual(
          advanceWrDriveEvidence(
            career,
            JSON.parse(before) as WrSimulationCursor,
            { ...rng },
            tuning,
            [...TEST_GAME_FAMILIES].reverse(),
            [...TEST_GAME_PATTERNS].reverse(),
            [],
            options,
          ),
        );
        expect(JSON.stringify(cursor)).toBe(before);
        expect(advanced.ok, advanced.ok ? undefined : advanced.reason).toBe(true);
        if (!advanced.ok) throw new Error(advanced.reason);
        expectDeepFrozen(advanced);
        if (advanced.type === 'FINAL') {
          expect(boundary).toBe(budget);
          expect(cursor.keyPlayLog).toHaveLength(budget);
          expect(advanced.score.playerTeam).toBeGreaterThanOrEqual(cursor.score.playerTeam);
          expect(advanced.score.opponent).toBeGreaterThanOrEqual(cursor.score.opponent);
          break;
        }
        const { game, pendingSnap, tacticalContext } = advanced;
        expect(tacticalContext).toEqual(createWrTacticalSnapContextV1(game, pendingSnap));
        if (tacticalContext === undefined) throw new Error('Missing current context.');
        const seconds = (4 - game.clock.period) * 900 + game.clock.clockSecondsRemaining;
        expect(seconds).toBeGreaterThan(0);
        expect(seconds).toBeLessThan(previousSeconds);
        previousSeconds = seconds;
        expect(game.situation.driveIndex).toBeGreaterThan(cursor.driveIndex);
        expect(game.situation.distanceYards).toBeLessThanOrEqual(100 - game.situation.yardLine);
        if (game.situation.distanceYards === 100 - game.situation.yardLine) goalToGo += 1;
        expect(game.keyPlayLog).toEqual(cursor.keyPlayLog);
        const pendingCareer: CareerRun = {
          ...career,
          rng: advanced.nextRng,
          phase: { type: 'KEY_SNAP', game, pendingSnap },
        };
        const family = TEST_GAME_FAMILIES.find(({ id }) => id === pendingSnap.familyId)!;
        const pattern = TEST_GAME_PATTERNS.find(({ id }) => id === pendingSnap.patternId)!;
        const decision = pendingSnap.decisionIds[(seed + boundary) % 3]!;
        const resolved = resolveWrPlayEvidence(
          pendingCareer,
          decision,
          pattern,
          family,
          [],
          tuning,
          tacticalContext,
        );
        expect(resolved.nextRng.drawCount - advanced.nextRng.drawCount).toBe(6);
        const { play } = resolved;
        if (play.tacticalResult === undefined) throw new Error('Missing result.');
        outcomes.add(play.tacticalResult.possessionOutcome);
        finishPlayerDrive = ['RETAINED', 'UNTRACKED'].includes(
          play.tacticalResult.possessionOutcome,
        );
        cursor = {
          matchup: game.matchup,
          secondsRemaining: seconds,
          driveIndex: game.situation.driveIndex,
          possessionId: finishPlayerDrive
            ? 'game_possession_player_team'
            : 'game_possession_opponent',
          score: play.scoreAfter,
          statLine: {
            targets: game.statLine.targets + play.targetDelta,
            receptions: game.statLine.receptions + play.receptionDelta,
            receivingYards: game.statLine.receivingYards + play.receivingYardsDelta,
            receivingTouchdowns: game.statLine.receivingTouchdowns + play.receivingTouchdownDelta,
            drops: game.statLine.drops + play.dropDelta,
            turnovers: game.statLine.turnovers + play.turnoverDelta,
          },
          keyPlayLog: [...game.keyPlayLog, play],
          gameRngDrawCountBefore: game.gameRngDrawCountBefore,
        };
        rng = resolved.nextRng;
        const staged = stageWrResolvedSnapBoundaryV1(
          pendingCareer,
          decision,
          tuning,
          TEST_GAME_FAMILIES,
          TEST_GAME_PATTERNS,
          TEST_GAME_SKILLS,
        );
        expect(staged.ok, staged.ok ? undefined : staged.reason).toBe(true);
        if (!staged.ok) throw new Error(staged.reason);
        expect(staged.boundary.play).toEqual(play);
        expect(staged.boundary.continuation).toEqual(cursor);
        expect(staged.boundary.finishPlayerDrive).toBe(finishPlayerDrive);
        expect(staged.boundary.nextRng).toEqual(rng);
        expectDeepFrozen(staged);
        expect(
          matchesWrResolvedSnapBoundaryV1(
            JSON.parse(JSON.stringify(staged.boundary)) as unknown,
            pendingCareer,
            decision,
            tuning,
            TEST_GAME_FAMILIES,
            TEST_GAME_PATTERNS,
            TEST_GAME_SKILLS,
          ),
        ).toBe(true);
        // Continue from the owning transition, not test-authored routing.
        cursor = staged.boundary.continuation;
        rng = staged.boundary.nextRng;
        finishPlayerDrive = staged.boundary.finishPlayerDrive;
      }
      expect(JSON.stringify(career)).toBe(sourceJson);
    }
    expect(goalToGo).toBeGreaterThan(0);
    for (const outcome of ['RETAINED', 'UNTRACKED', 'SCORE', 'TURNOVER_ON_DOWNS'])
      expect(outcomes.has(outcome)).toBe(true);
  });

  it('binds the retained WR result and continuation to source replay without publishing or accepting forged fields', () => {
    const career = start(prepare(weekEndCareer(450, 650)));
    if (career.phase.type !== 'KEY_SNAP') throw new Error('Expected snap.');
    const decision = career.phase.pendingSnap.decisionIds[0];
    const mutableSource = JSON.parse(JSON.stringify(career)) as CareerRun;
    const sourceBefore = JSON.stringify(mutableSource);
    const staged = stageWrResolvedSnapBoundaryV1(
      mutableSource,
      decision,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      TEST_GAME_SKILLS,
    );
    expect(staged.ok).toBe(true);
    if (!staged.ok) throw new Error(staged.reason);
    const verify = (value: unknown, source = mutableSource) =>
      matchesWrResolvedSnapBoundaryV1(
        value,
        source,
        decision,
        TEST_GAME_TUNING,
        TEST_GAME_FAMILIES,
        TEST_GAME_PATTERNS,
        TEST_GAME_SKILLS,
      );
    const { boundary } = staged;
    expect(verify(Object.fromEntries(Object.entries(boundary).reverse()))).toBe(true);
    const bad = [
      { ...boundary, future: undefined },
      { ...boundary, model: 'wr_resolved_snap_boundary_v2' },
      { ...boundary, finishPlayerDrive: !boundary.finishPlayerDrive },
      { ...boundary, nextRng: { ...boundary.nextRng, drawCount: boundary.nextRng.drawCount + 1 } },
      { ...boundary, continuation: { ...boundary.continuation, secondsRemaining: 0 } },
      { ...boundary, continuation: { ...boundary.continuation, keyPlayLog: [] } },
      {
        ...boundary,
        continuation: { ...boundary.continuation, score: { playerTeam: 199, opponent: 199 } },
      },
      { ...boundary, play: { ...boundary.play, tacticalResult: undefined } },
      {
        ...boundary,
        play: {
          ...boundary.play,
          tacticalResult: {
            ...boundary.play.tacticalResult,
            ball: { ...boundary.play.tacticalResult.ball, endLineYards: 0 },
          },
        },
      },
      {
        ...boundary,
        play: {
          ...boundary.play,
          tacticalResult: {
            ...boundary.play.tacticalResult,
            before: {
              ...boundary.play.tacticalResult.before,
              hiddenPatternId: 'key_snap_pattern_fake',
            },
          },
        },
      },
    ];
    for (const value of bad) expect(verify(value)).toBe(false);
    const sparse = jsonClone(boundary);
    delete sparse.continuation.keyPlayLog[0];
    expect(verify(sparse)).toBe(false);
    const cyclic = { ...boundary, future: {} };
    cyclic.future = cyclic;
    expect(verify(cyclic)).toBe(false);
    expect(
      verify(boundary, {
        ...mutableSource,
        rng: { ...mutableSource.rng, drawCount: mutableSource.rng.drawCount + 1 },
      }),
    ).toBe(false);
    expect(JSON.stringify(mutableSource)).toBe(sourceBefore);
    expect(Object.isFrozen(mutableSource.player)).toBe(false);
    expect(Object.isFrozen(mutableSource.rng)).toBe(false);
    expect(boundary.nextRng.drawCount - mutableSource.rng.drawCount).toBe(6);
    expect(boundary.continuation.score).toEqual(boundary.play.scoreAfter);
    const invalidDecision = stageWrResolvedSnapBoundaryV1(
      mutableSource,
      'key_snap_decision_catch_high_point',
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      TEST_GAME_SKILLS,
    );
    if (!career.phase.pendingSnap.decisionIds.includes('key_snap_decision_catch_high_point'))
      expect(invalidDecision.ok).toBe(false);
  });

  it('keeps zero-opportunity WR aggregate evidence literal under staged rules', () => {
    const career = prepare(weekEndCareer(0, 0, true));
    if (career.phase.type !== 'GAME_PREVIEW') throw new Error('Expected preview.');
    const cursor: WrSimulationCursor = {
      matchup: career.phase.matchup,
      secondsRemaining: 3600,
      driveIndex: 0,
      possessionId: career.phase.matchup.isHome
        ? 'game_possession_opponent'
        : 'game_possession_player_team',
      score: { playerTeam: 0, opponent: 0 },
      statLine: createEmptyWrGameStatLine(),
      keyPlayLog: [],
      gameRngDrawCountBefore: career.rng.drawCount,
    };
    const original = advanceWrDriveEvidence(
      career,
      cursor,
      career.rng,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      [],
    );
    expect(
      advanceWrDriveEvidence(
        career,
        cursor,
        career.rng,
        TEST_GAME_TUNING,
        TEST_GAME_FAMILIES,
        TEST_GAME_PATTERNS,
        [],
        { rulesVersion: 'tactical_game_v1', finishPlayerDrive: false },
      ),
    ).toEqual(original);
    const published = start(career);
    if (!original.ok || original.type !== 'FINAL' || published.phase.type !== 'POST_GAME')
      throw new Error('Expected final.');
    expect(original.score).toEqual(published.phase.summary.score);
    expect(original.nextRng).toEqual(published.rng);
    expect(published.phase.summary.statLine).toEqual(createEmptyWrGameStatLine());
  });

  it('stages original WR kernel tactical evidence across all choices without extra RNG or caller mutation', () => {
    const decisions = new Set<string>();
    const outcomes = new Set<string>();
    for (const iq of [20, 90]) {
      for (let seed = 0; seed < 64; seed += 1) {
        const base = withFootballIq(weekEndCareer(450, 650), iq);
        const current = jsonClone(
          start(
            prepare({
              ...base,
              rng: { ...createRng(`wr-tactical-kernel-${seed}`), drawCount: base.rng.drawCount },
            }),
          ),
        );
        if (current.phase.type !== 'KEY_SNAP') throw new Error('Expected first key snap');
        // A validated pre-decision red-zone fixture tests physical bounds, not
        // a projection moved after learning whether the play scores.
        current.phase.game.situation.yardLine = seed % 2 === 0 ? 95 : 15;
        current.phase.game.situation.distanceYards = seed % 2 === 0 ? 5 : 10;
        const career = current as unknown as CareerRun;
        expect(validateCareerRun(career).ok).toBe(true);
        if (career.phase.type !== 'KEY_SNAP') throw new Error('Expected typed key snap');
        const { game, pendingSnap } = career.phase;
        const context = createWrTacticalSnapContextV1(game, pendingSnap);
        expect(context).toBeDefined();
        if (context === undefined) throw new Error('Expected valid WR context');
        expect(context.revealedClueIds).toEqual(pendingSnap.revealedClueIds);
        expect(context).not.toHaveProperty('patternId');
        const basePattern = TEST_GAME_PATTERNS.find(({ id }) => id === pendingSnap.patternId)!;
        const family = TEST_GAME_FAMILIES.find(({ id }) => id === basePattern.familyId)!;
        // Explicit test-only high-risk fixtures exercise both turnover kinds;
        // shipped mechanics and the original/current input stay identical.
        const pattern =
          seed % 3 === 0
            ? {
                ...basePattern,
                outcome: {
                  ...basePattern.outcome,
                  baseTargetPermille: 1000,
                  baseCatchPermille: family.id === 'key_snap_family_yac' ? 1000 : 0,
                  dropRiskPermille: 0,
                  turnoverRiskPermille: 500,
                },
              }
            : basePattern;
        expect(
          isKeySnapPatternMechanicsDefinitionCatalog(
            TEST_GAME_PATTERNS.map((candidate) =>
              candidate.id === pattern.id ? pattern : candidate,
            ),
            TEST_GAME_FAMILIES,
          ),
        ).toBe(true);
        const before = JSON.stringify(career);
        for (const decisionId of pendingSnap.decisionIds) {
          decisions.add(decisionId);
          const original = resolveWrPlayEvidence(
            career,
            decisionId,
            pattern,
            family,
            [],
            TEST_GAME_TUNING,
          );
          const tactical = resolveWrPlayEvidence(
            career,
            decisionId,
            pattern,
            family,
            [],
            TEST_GAME_TUNING,
            context,
          );
          const replay = resolveWrPlayEvidence(
            JSON.parse(before) as CareerRun,
            decisionId,
            pattern,
            family,
            [],
            TEST_GAME_TUNING,
            JSON.parse(JSON.stringify(context)) as typeof context,
          );
          expect(tactical).toEqual(replay);
          expect(tactical.nextRng).toEqual(original.nextRng);
          expect(tactical.play.rngDrawCountAfter - tactical.play.rngDrawCountBefore).toBe(6);
          expect(tactical.play.resolution).toEqual(original.play.resolution);
          expect(tactical.play.appliedGameHooks).toEqual(original.play.appliedGameHooks);
          expect(original.play).not.toHaveProperty('tacticalResult');
          const field = tactical.play.tacticalResult!;
          expect(field.before).toEqual(context);
          expect(field.before).not.toBe(context);
          expect(tactical.play.scoreAfter).toEqual(field.scoreAfter);
          outcomes.add(field.ball.outcome);
          if (field.ball.outcome === 'TOUCHDOWN') {
            expect(field.ball.endLineYards).toBe(100);
            expect(tactical.play.receivingYardsDelta).toBe(
              100 - context.field.lineOfScrimmageYards,
            );
            expect(tactical.play.receivingTouchdownDelta).toBe(1);
          } else if (field.ball.outcome === 'UNTRACKED') {
            expect(field.ball.endLineYards).toBeNull();
            expect(field.possessionAfter).toBeNull();
            expect(tactical.play.targetDelta).toBe(0);
          } else {
            expect(field.ball.endLineYards).toBeLessThan(100);
            expect(field.ball.endLineYards).toBeGreaterThanOrEqual(1);
          }
          if (field.ball.outcome === 'FUMBLE_LOST') {
            expect(tactical.play.receptionDelta).toBe(1);
            expect(tactical.play.turnoverDelta).toBe(1);
            expect(tactical.play.receivingTouchdownDelta).toBe(0);
            expect(field.possessionAfter).toBe('OPPONENT');
          }
          if (field.ball.outcome === 'INTERCEPTION') {
            expect(tactical.play.receptionDelta).toBe(0);
            expect(tactical.play.receivingYardsDelta).toBe(0);
            expect(field.scoreAfter).toEqual(context.score);
          }
        }
        expect(JSON.stringify(career)).toBe(before);
        expect(Object.isFrozen(current.player.state)).toBe(false);
        expect(Object.isFrozen(current.phase.pendingSnap.revealedClueIds)).toBe(false);
      }
    }
    expect([...decisions].sort()).toEqual(
      TEST_GAME_FAMILIES.flatMap(({ decisionIds }) => [...decisionIds]).sort(),
    );
    expect([...outcomes].sort()).toEqual([
      'FUMBLE_LOST',
      'INCOMPLETE',
      'INTERCEPTION',
      'STOPPED',
      'TOUCHDOWN',
      'UNTRACKED',
    ]);
  });

  it('rejects forged or impossible WR pre-context without rolling or repairing historical facts', () => {
    const current = JSON.parse(
      JSON.stringify(start(prepare(weekEndCareer(450, 650)))),
    ) as CareerRun;
    if (current.phase.type !== 'KEY_SNAP') throw new Error('Expected active snap');
    const { game, pendingSnap } = current.phase;
    const context = createWrTacticalSnapContextV1(game, pendingSnap)!;
    expect(context).toBeDefined();
    const pattern = TEST_GAME_PATTERNS.find(({ id }) => id === pendingSnap.patternId)!;
    const family = TEST_GAME_FAMILIES.find(({ id }) => id === pattern.familyId)!;
    const before = JSON.stringify(current);
    for (const altered of [
      { ...context, score: { ...context.score, opponent: context.score.opponent + 1 } },
      { ...context, clock: { ...context.clock, secondsRemaining: 0 } },
      { ...context, field: { ...context.field, lineOfScrimmageYards: 1 } },
      { ...context, revealedClueIds: [] },
      { ...context, hiddenPattern: pendingSnap.patternId },
    ]) {
      expect(() =>
        resolveWrPlayEvidence(
          current as CareerRun,
          pendingSnap.decisionIds[0],
          pattern,
          family,
          [],
          TEST_GAME_TUNING,
          altered,
        ),
      ).toThrow('invalid_tactical_context');
    }
    expect(JSON.stringify(current)).toBe(before);
    expect(
      createWrTacticalSnapContextV1(
        { ...game, clock: { period: 4, clockSecondsRemaining: 0 } },
        pendingSnap,
      ),
    ).toBeUndefined();
    expect(
      createWrTacticalSnapContextV1(
        { ...game, situation: { ...game.situation, yardLine: 99, distanceYards: 5 } },
        pendingSnap,
      ),
    ).toBeUndefined();
    expect(
      createWrTacticalSnapContextV1(
        { ...game, situation: { ...game.situation, possessionId: 'game_possession_opponent' } },
        pendingSnap,
      ),
    ).toBeUndefined();
  });

  it('neutrally stages v8 at real preview, each active snap and post-game without rewriting evidence', () => {
    let career = prepare(weekEndCareer(450, 650));
    const phases = new Set<string>();
    for (let step = 0; step < 20; step += 1) {
      const before = JSON.stringify(career);
      const v8 = migrateCareerRunV7ToV8(career);
      expect(v8).toEqual({ ...career, schemaVersion: 8 });
      expect(v8.phase).toEqual(career.phase);
      expect(v8.rng).toEqual(career.rng);
      expect(v8.gameCareerState).toEqual(career.gameCareerState);
      expect(parseCareerRunV8(JSON.stringify(v8))).toEqual({ ok: true, career: v8 });
      expect(JSON.stringify(career)).toBe(before);
      phases.add(career.phase.type);
      if (career.phase.type === 'POST_GAME') break;
      career =
        career.phase.type === 'GAME_PREVIEW'
          ? start(career)
          : career.phase.type === 'KEY_SNAP'
            ? resolve(career, career.phase.pendingSnap.decisionIds[0])
            : career;
    }
    expect([...phases]).toEqual(['GAME_PREVIEW', 'KEY_SNAP', 'POST_GAME']);
    expect(career.phase.type).toBe('POST_GAME');
  });

  it('pins literal WR pre-tactical yardage and missing retained field context', () => {
    const base = weekEndCareer(450, 650);
    const notable: unknown[] = [];
    // Fixed pre-tactical source; the 14-yard TD from the 15 is an abstract historical result.
    {
      let career = start(
        prepare({
          ...base,
          rng: { ...createRng('m7-5-wr-history-45'), drawCount: base.rng.drawCount },
        }),
      );
      while (career.phase.type === 'KEY_SNAP') {
        const before = career.phase;
        const next = resolve(career, before.pendingSnap.decisionIds[0]);
        const restored = JSON.parse(JSON.stringify(career)) as CareerRun;
        expect(validateCareerRun(restored)).toEqual({ ok: true, issues: [] });
        expect(resolve(restored, before.pendingSnap.decisionIds[0])).toEqual(next);
        const play = gamePlayLog(next).at(-1)!;
        if (
          play.receivingTouchdownDelta === 1 &&
          before.game.situation.yardLine + play.receivingYardsDelta !== 100
        ) {
          notable.push({ clock: before.game.clock, situation: before.game.situation, play });
          break;
        }
        career = next;
      }
    }
    expect(notable).toEqual([
      {
        clock: { clockSecondsRemaining: 161, period: 1 },
        situation: {
          distanceYards: 14,
          down: 1,
          driveIndex: 3,
          possessionId: 'game_possession_player_team',
          yardLine: 15,
        },
        play: {
          appliedGameHooks: [],
          decisionFit: 24,
          decisionId: 'key_snap_decision_protect_ball',
          dropDelta: 0,
          familyId: 'key_snap_family_yac',
          keySnapId: 'key_snap_week_9_2',
          patternId: 'key_snap_pattern_test_yac_a',
          receivingTouchdownDelta: 1,
          receivingYardsDelta: 14,
          receptionDelta: 1,
          resolution: {
            attributeContributionMilli: 15000,
            attributeScore: 60,
            bodyContributionMilli: 6450,
            bodyScore: 86,
            catchChancePermille: 580,
            confidenceContributionMilli: 3750,
            confidenceScore: 50,
            decisionFitContributionMilli: 18500,
            decisionFitScore: 74,
            dropRiskPermille: 50,
            finalScore: 66,
            matchupContributionMilli: 5250,
            matchupScore: 35,
            preparationContributionMilli: 6250,
            preparationScore: 50,
            receivingYardsAfterHooks: 14,
            receivingYardsBeforeHooks: 14,
            rngRoll: 6,
            skillAdjustment: 0,
            targetChancePermille: 848,
            teamContextContributionMilli: 4575,
            teamContextScore: 61,
            touchdownChancePermille: 132,
            turnoverRiskPermille: 25,
            weightedScoreMilli: 59775,
          },
          resultId: 'game_play_result_touchdown',
          rngDrawCountAfter: 70,
          rngDrawCountBefore: 64,
          scoreAfter: { opponent: 7, playerTeam: 7 },
          scoreBefore: { opponent: 7, playerTeam: 0 },
          targetDelta: 1,
          turnoverDelta: 0,
        },
      },
    ]);
  });
  it('validates complete tuning, family, and pattern mechanics catalogs', () => {
    expect(isGameTuningDefinition(TEST_GAME_TUNING)).toBe(true);
    expect(isKeySnapFamilyMechanicsDefinitionCatalog(TEST_GAME_FAMILIES)).toBe(true);
    expect(isKeySnapPatternMechanicsDefinitionCatalog(TEST_GAME_PATTERNS, TEST_GAME_FAMILIES)).toBe(
      true,
    );
  });

  it('derives snap-midpoint budgets and clamps every rank to its role range', () => {
    const projections = [
      [1, 750, 900, 9],
      [2, 600, 800, 8],
      [3, 450, 650, 6],
      [4, 350, 550, 4],
      [5, 200, 400, 2],
      [6, 120, 300, 2],
      [7, 50, 180, 2],
      [8, 0, 20, 0],
    ] as const;
    for (const [rank, minSnapPermille, maxSnapPermille, expected] of projections) {
      expect(
        deriveGameOpportunityBudget(
          { rank, roleId: depthRoleIdForRank(rank), minSnapPermille, maxSnapPermille },
          TEST_GAME_TUNING,
        ),
        `WR${rank}`,
      ).toBe(expected);
    }
  });

  it('prepares one immutable preview with zero RNG and preserved completed-week evidence', () => {
    const career = weekEndCareer(450, 650);
    const before = JSON.stringify(career);
    const prepared = prepare(career);
    expect(prepared.phase.type).toBe('GAME_PREVIEW');
    if (prepared.phase.type !== 'GAME_PREVIEW') return;
    expect(prepared.revision).toBe(career.revision + 1);
    expect(prepared.rng).toEqual(career.rng);
    expect(prepared.phase.matchup).toEqual(
      expect.objectContaining({
        gameId: `game_week_${career.weekIndex}`,
        playerProgramId: 'program_test_01',
        opponentProgramId: 'program_test_02',
        isHome: career.weekIndex % 2 === 0,
        opportunityBudget: deriveGameOpportunityBudget(
          career.programContext!.projection,
          TEST_GAME_TUNING,
        ),
      }),
    );
    if (career.phase.type !== 'WEEK_END') return;
    expect(prepared.phase.matchup.completedWeek).toEqual({
      version: career.weeklyExperienceVersion,
      results: career.phase.results,
      depthUpdate: career.phase.depthUpdate,
    });
    expect(JSON.stringify(career)).toBe(before);
    expect(validateCareerRun(prepared)).toEqual({ issues: [], ok: true });
    expectDeepFrozen(prepared);
  });

  it('applies a scheduled availability cap without changing the depth-derived baseline', () => {
    const career = weekEndCareer(450, 650);
    const baseline = deriveGameOpportunityBudget(
      career.programContext!.projection,
      TEST_GAME_TUNING,
    );
    expect(baseline).toBeGreaterThan(1);
    const limited = commandCareer(
      prepareScheduledGame(
        career,
        { gameId: 'game_availability_limit', isHome: true },
        TEST_PLAYER_GAME_PROFILE,
        TEST_OPPONENT_GAME_PROFILE,
        TEST_GAME_TUNING,
        TEST_GAME_FAMILIES,
        TEST_GAME_PATTERNS,
        TEST_GAME_SKILLS,
        { maximumOpportunities: 1 },
      ),
    );
    expect(limited.phase.type).toBe('GAME_PREVIEW');
    if (limited.phase.type !== 'GAME_PREVIEW') return;
    expect(limited.phase.matchup.opportunityBudget).toBe(1);
    expect(career.programContext!.projection).toEqual(
      expect.objectContaining({ minSnapPermille: 450, maxSnapPermille: 650 }),
    );
    expect(validateCareerRun(limited)).toEqual({ issues: [], ok: true });
  });

  it('replays the first key snap across JSON and catalog order with bounded state', () => {
    const preview = prepare(weekEndCareer(450, 650));
    const first = startGame(
      preview,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      TEST_GAME_SKILLS,
    );
    const replay = startGame(
      JSON.parse(JSON.stringify(preview)) as CareerRun,
      TEST_GAME_TUNING,
      [...TEST_GAME_FAMILIES].reverse(),
      [...TEST_GAME_PATTERNS].reverse(),
      [...TEST_GAME_SKILLS].reverse(),
    );
    expect(first).toEqual(replay);
    const career = commandCareer(first);
    expect(career.phase.type).toBe('KEY_SNAP');
    if (career.phase.type !== 'KEY_SNAP') return;
    expect(career.phase.game.opportunitiesPresented).toBe(1);
    expect(career.phase.game.keyPlayLog).toEqual([]);
    expect(career.phase.game.clock.period).toBeGreaterThanOrEqual(1);
    expect(career.phase.game.clock.period).toBeLessThanOrEqual(4);
    expect(career.phase.game.clock.clockSecondsRemaining).toBeGreaterThanOrEqual(0);
    expect(career.phase.game.clock.clockSecondsRemaining).toBeLessThanOrEqual(900);
    expect(career.phase.game.situation.possessionId).toBe('game_possession_player_team');
    expect(career.phase.game.situation.down).toBeGreaterThanOrEqual(1);
    expect(career.phase.game.situation.down).toBeLessThanOrEqual(4);
    expect(career.phase.pendingSnap.decisionIds).toHaveLength(3);
    expect(career.phase.pendingSnap.revealedClueIds).toEqual(['game_clue_test_coverage']);
    expect(career.phase.pendingSnap.informationTierId).toBe('game_information_partial');
    expect(career.phase.pendingSnap.information.finalScore).toBe(
      career.phase.pendingSnap.informationScore,
    );
    expect(career.phase.pendingSnap.informationGameHooks).toEqual([]);
    expect(career.rng.drawCount - preview.rng.drawCount).toBeGreaterThanOrEqual(6);
    expect(validateCareerRun(career)).toEqual({ issues: [], ok: true });
    expectDeepFrozen(career);
  });

  it('finishes a zero-opportunity game with truthful participation and no fabricated stats', () => {
    const preview = prepare(weekEndCareer(0, 20, true));
    expect(preview.phase.type).toBe('GAME_PREVIEW');
    if (preview.phase.type !== 'GAME_PREVIEW') return;
    expect(preview.phase.matchup.opportunityBudget).toBe(0);
    const completed = commandCareer(
      startGame(
        preview,
        TEST_GAME_TUNING,
        TEST_GAME_FAMILIES,
        TEST_GAME_PATTERNS,
        TEST_GAME_SKILLS,
      ),
    );
    expect(completed.phase.type).toBe('POST_GAME');
    if (completed.phase.type !== 'POST_GAME') return;
    expect(completed.phase.summary.keySnapCount).toBe(0);
    expect(completed.phase.summary.statLine).toEqual({
      targets: 0,
      receptions: 0,
      receivingYards: 0,
      receivingTouchdowns: 0,
      drops: 0,
      turnovers: 0,
    });
    expect(completed.phase.summary.participationFeedbackId).not.toBe(
      'game_participation_offensive_role',
    );
    expect(completed.gameCareerState.gamesPlayed).toBe(1);
    expect(completed.gameCareerState.lastGame).toEqual(completed.phase.summary);
    expect(completed.phase.completedWeek).toEqual(preview.phase.matchup.completedWeek);
    expect(completed.phase.growth).toEqual(
      expect.objectContaining({
        requestedBodyDelta: -4,
        actualConfidenceDelta: 0,
        actualCoachTrustDelta: 0,
        attributeXp: [],
      }),
    );
    expect(completed.player.state.body).toBe(completed.phase.growth.bodyAfter);
    expect(validateCareerRun(completed)).toEqual({ issues: [], ok: true });
  });

  it('terminates bounded zero-opportunity games across literal seeds', () => {
    const base = weekEndCareer(0, 20, true);
    const results = new Set<string>();
    for (let seedIndex = 0; seedIndex < 32; seedIndex += 1) {
      const seededRng = createRng(`m4-zero-opportunity-${seedIndex}`);
      const seeded = {
        ...base,
        rng: { ...seededRng, drawCount: base.rng.drawCount },
      } satisfies CareerRun;
      expect(validateCareerRun(seeded), `seed ${seedIndex}`).toEqual({ issues: [], ok: true });
      const preview = prepare(seeded);
      const completed = commandCareer(
        startGame(
          preview,
          TEST_GAME_TUNING,
          TEST_GAME_FAMILIES,
          TEST_GAME_PATTERNS,
          TEST_GAME_SKILLS,
        ),
      );
      expect(completed.phase.type, `seed ${seedIndex}`).toBe('POST_GAME');
      if (completed.phase.type !== 'POST_GAME') continue;
      expect(completed.phase.summary.score.playerTeam, `seed ${seedIndex}`).toBeLessThanOrEqual(
        200,
      );
      expect(completed.phase.summary.score.opponent, `seed ${seedIndex}`).toBeLessThanOrEqual(200);
      expect(
        completed.rng.drawCount - preview.rng.drawCount,
        `seed ${seedIndex}`,
      ).toBeLessThanOrEqual(64);
      results.add(completed.phase.summary.resultId);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('derives IQ, Preparation, Film Study, and Coverage Ledger information without RNG', () => {
    const clueIds = TEST_GAME_PATTERNS[0]!.clueIds;
    const uncertain = deriveKeySnapInformation(40, 40, false, [], clueIds, TEST_GAME_TUNING);
    const film = deriveKeySnapInformation(40, 40, true, [], clueIds, TEST_GAME_TUNING);
    const coverage = deriveKeySnapInformation(
      40,
      40,
      false,
      [
        {
          skillId: 'skill_fixture_a',
          slotIndex: 0,
          effectIndex: 0,
          hookId: 'game_hook_coverage_clue_bonus',
          valueMilli: 1_000,
        },
      ],
      clueIds,
      TEST_GAME_TUNING,
    );
    const diagnostic = deriveKeySnapInformation(80, 80, false, [], clueIds, TEST_GAME_TUNING);

    expect(uncertain).toEqual(
      expect.objectContaining({
        informationScore: 40,
        informationTierId: 'game_information_uncertain',
        revealedClueIds: [],
      }),
    );
    expect(film).toEqual(
      expect.objectContaining({
        informationScore: 60,
        informationTierId: 'game_information_partial',
        revealedClueIds: [clueIds[0]],
      }),
    );
    expect(film?.information).toEqual(
      expect.objectContaining({ filmStudyApplied: true, filmStudyBonus: 20 }),
    );
    expect(coverage).toEqual(
      expect.objectContaining({
        informationScore: 70,
        revealedClueIds: [clueIds[0]],
        informationGameHooks: [
          expect.objectContaining({
            hookId: 'game_hook_coverage_clue_bonus',
            appliedValue: 30,
          }),
        ],
      }),
    );
    expect(diagnostic).toEqual(
      expect.objectContaining({
        informationScore: 80,
        informationTierId: 'game_information_diagnostic',
        revealedClueIds: clueIds,
      }),
    );
  });

  it('changes clue visibility with Football IQ while keeping hidden context and outcome identical', () => {
    const weekEnd = weekEndCareer(450, 650);
    const low = start(prepare(withFootballIq(weekEnd, 10)));
    const high = start(prepare(withFootballIq(weekEnd, 90)));
    expect(low.phase.type).toBe('KEY_SNAP');
    expect(high.phase.type).toBe('KEY_SNAP');
    if (low.phase.type !== 'KEY_SNAP' || high.phase.type !== 'KEY_SNAP') return;

    expect({
      patternId: low.phase.pendingSnap.patternId,
      coverageId: low.phase.pendingSnap.coverageId,
      leverageId: low.phase.pendingSnap.leverageId,
      matchupRating: low.phase.pendingSnap.matchupRating,
      rng: low.rng,
    }).toEqual({
      patternId: high.phase.pendingSnap.patternId,
      coverageId: high.phase.pendingSnap.coverageId,
      leverageId: high.phase.pendingSnap.leverageId,
      matchupRating: high.phase.pendingSnap.matchupRating,
      rng: high.rng,
    });
    expect(high.phase.pendingSnap.revealedClueIds.length).toBeGreaterThan(
      low.phase.pendingSnap.revealedClueIds.length,
    );

    const decisionId = low.phase.pendingSnap.decisionIds[0];
    const lowResolved = resolve(low, decisionId);
    const highResolved = resolve(high, decisionId);
    expect(gamePlayLog(lowResolved)[0]).toEqual(gamePlayLog(highResolved)[0]);
  });

  it('uses exactly six resolution draws and replays every boundary through the final whistle', () => {
    const weekEnd = weekEndCareer(450, 650);
    const stateBefore = weekEnd.player.state;
    let career = start(prepare(weekEnd));
    const opportunityBudget =
      career.phase.type === 'KEY_SNAP' ? career.phase.game.matchup.opportunityBudget : -1;
    let decisions = 0;
    while (career.phase.type === 'KEY_SNAP') {
      const decisionId = career.phase.pendingSnap.decisionIds[decisions % 3]!;
      const before = career;
      const resolved = resolveKeySnap(
        before,
        decisionId,
        TEST_GAME_TUNING,
        TEST_GAME_FAMILIES,
        TEST_GAME_PATTERNS,
        TEST_GAME_SKILLS,
      );
      const replay = resolveKeySnap(
        JSON.parse(JSON.stringify(before)) as CareerRun,
        decisionId,
        TEST_GAME_TUNING,
        [...TEST_GAME_FAMILIES].reverse(),
        [...TEST_GAME_PATTERNS].reverse(),
        [...TEST_GAME_SKILLS].reverse(),
      );
      expect(resolved).toEqual(replay);
      career = commandCareer(resolved);
      const play = gamePlayLog(career)[decisions]!;
      expect(play.rngDrawCountAfter - play.rngDrawCountBefore).toBe(6);
      expect(play.resolution.weightedScoreMilli).toBe(
        play.resolution.attributeContributionMilli +
          play.resolution.matchupContributionMilli +
          play.resolution.decisionFitContributionMilli +
          play.resolution.teamContextContributionMilli +
          play.resolution.bodyContributionMilli +
          play.resolution.preparationContributionMilli +
          play.resolution.confidenceContributionMilli,
      );
      expect(validateCareerRun(career)).toEqual({ issues: [], ok: true });
      expectDeepFrozen(career);
      decisions += 1;
      expect(decisions).toBeLessThanOrEqual(12);
    }

    expect(career.phase.type).toBe('POST_GAME');
    if (career.phase.type !== 'POST_GAME') return;
    expect(decisions).toBe(opportunityBudget);
    expect(career.phase.keyPlayLog).toHaveLength(opportunityBudget);
    expect(career.phase.summary.keySnapCount).toBe(opportunityBudget);
    expect(career.phase.summary.statLine).toEqual(
      career.phase.keyPlayLog.reduce(
        (stats, play) => ({
          targets: stats.targets + play.targetDelta,
          receptions: stats.receptions + play.receptionDelta,
          receivingYards: stats.receivingYards + play.receivingYardsDelta,
          receivingTouchdowns: stats.receivingTouchdowns + play.receivingTouchdownDelta,
          drops: stats.drops + play.dropDelta,
          turnovers: stats.turnovers + play.turnoverDelta,
        }),
        {
          targets: 0,
          receptions: 0,
          receivingYards: 0,
          receivingTouchdowns: 0,
          drops: 0,
          turnovers: 0,
        },
      ),
    );
    expect(career.gameCareerState.lastGame).toEqual(career.phase.summary);
    const production =
      career.phase.summary.statLine.receptions * TEST_GAME_TUNING.grade.receptionValue +
      Math.trunc(
        career.phase.summary.statLine.receivingYards / TEST_GAME_TUNING.grade.receivingYardsDivisor,
      ) +
      career.phase.summary.statLine.receivingTouchdowns * TEST_GAME_TUNING.grade.touchdownValue;
    const mistakes =
      career.phase.summary.statLine.drops * TEST_GAME_TUNING.grade.dropPenalty +
      career.phase.summary.statLine.turnovers * TEST_GAME_TUNING.grade.turnoverPenalty;
    const averageFit = Math.round(
      career.phase.keyPlayLog.reduce((total, play) => total + play.decisionFit, 0) /
        career.phase.keyPlayLog.length,
    );
    const expectedGrade = Math.min(
      100,
      Math.max(
        0,
        TEST_GAME_TUNING.grade.baseScore +
          Math.round(
            (production * TEST_GAME_TUNING.grade.opportunityNormalizationTarget) /
              career.phase.keyPlayLog.length,
          ) -
          Math.round(
            (mistakes * TEST_GAME_TUNING.grade.opportunityNormalizationTarget) /
              career.phase.keyPlayLog.length,
          ) +
          Math.trunc(averageFit / TEST_GAME_TUNING.grade.fitDivisor),
      ),
    );
    expect(career.phase.summary.performanceGradeScore).toBe(expectedGrade);
    expect(career.gameCareerState.cumulativeGradeScore).toBe(expectedGrade);
    expect(career.phase.growth.requestedBodyDelta).toBe(-8);
    expect(career.phase.growth.bodyBefore).toBe(stateBefore.body);
    expect(career.player.state).toEqual(
      expect.objectContaining({
        body: career.phase.growth.bodyAfter,
        confidence: career.phase.growth.confidenceAfter,
        coachTrust: career.phase.growth.coachTrustAfter,
      }),
    );
    expect(career.phase.growth.attributeXp.length).toBeGreaterThan(0);
    expect(career.phase.growth.attributeXp.every(({ awardedXp }) => awardedXp > 0)).toBe(true);
    expect(validateCareerRun(career)).toEqual({ issues: [], ok: true });
  });

  it('requires committed careers to close a game, then advances with bounded Game Day gauge evidence', () => {
    const weekEnd = weekEndCareer(450, 650);
    const rejected = advanceDevelopmentWeek(
      weekEnd,
      TEST_DEVELOPMENT_CONFIG,
      TEST_GAME_SKILLS,
      TEST_WEEKLY_DEFINITIONS,
    );
    expect(rejected).toEqual({ career: weekEnd, ok: false, reason: 'weekly.invalid_phase' });
    expect(rejected.career).toBe(weekEnd);

    const historical = advanceHistoricalDevelopmentWeek(
      weekEnd,
      TEST_DEVELOPMENT_CONFIG,
      TEST_GAME_SKILLS,
      TEST_WEEKLY_DEFINITIONS,
    );
    expect(historical.ok).toBe(true);

    let postGame = start(prepare(weekEnd));
    while (postGame.phase.type === 'KEY_SNAP') {
      postGame = resolve(postGame, postGame.phase.pendingSnap.decisionIds[0]);
    }
    expect(postGame.phase.type).toBe('POST_GAME');
    if (postGame.phase.type !== 'POST_GAME') return;
    const expectedProgress = deriveWeeklySkillBreakthroughProgress(postGame);
    expect(expectedProgress.sources).toContainEqual(
      expect.objectContaining({ sourceId: 'breakthrough_source_game_day' }),
    );
    expect(expectedProgress.pointsEarned).toBeLessThanOrEqual(60);

    const advanced = advanceDevelopmentWeek(
      postGame,
      TEST_DEVELOPMENT_CONFIG,
      TEST_GAME_SKILLS,
      TEST_WEEKLY_DEFINITIONS,
    );
    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    expect(advanced.career.weekIndex).toBe(postGame.weekIndex + 1);
    expect(advanced.career.player.skillState.breakthroughGauge.lastProgress).toEqual(
      expectedProgress,
    );
    expect(advanced.career.gameCareerState).toEqual(postGame.gameCareerState);
    expect(validateCareerRun(advanced.career)).toEqual({ issues: [], ok: true });
  });

  it('activates all eight M3.5 game hooks in slot/effect order across literal seeded games', () => {
    const observedFamilies = new Set<string>();
    const observedHooks = new Set<SkillGameHookId>();
    const tacticalHooks = new Set<SkillGameHookId>();
    const base = weekEndCareer(450, 650);
    for (let seedIndex = 0; seedIndex < 16; seedIndex += 1) {
      const seededRng = createRng(`m4-all-hooks-${seedIndex}`);
      const seeded = {
        ...base,
        rng: { ...seededRng, drawCount: base.rng.drawCount },
      } satisfies CareerRun;
      let career = prepare(seeded, TEST_ALL_GAME_HOOK_SKILLS);
      if (career.phase.type !== 'GAME_PREVIEW') throw new Error('Expected preview.');
      for (const hook of career.phase.matchup.opportunityGameHooks) {
        observedHooks.add(hook.hookId);
      }
      career = start(career, TEST_ALL_GAME_HOOK_SKILLS);
      while (career.phase.type === 'KEY_SNAP') {
        const pending = career.phase.pendingSnap;
        observedFamilies.add(pending.familyId);
        for (const hook of pending.informationGameHooks) observedHooks.add(hook.hookId);
        const decisionId =
          pending.familyId === 'key_snap_family_catch'
            ? 'key_snap_decision_attack_high_point'
            : pending.familyId === 'key_snap_family_yac'
              ? 'key_snap_decision_burst_upfield'
              : pending.decisionIds[0];
        const staged =
          createWrTacticalSnapContextV1(career.phase.game, pending) === undefined
            ? undefined
            : stageWrResolvedSnapBoundaryV1(
                career,
                decisionId,
                TEST_GAME_TUNING,
                TEST_GAME_FAMILIES,
                TEST_GAME_PATTERNS,
                TEST_ALL_GAME_HOOK_SKILLS,
              );
        career = resolve(career, decisionId, TEST_ALL_GAME_HOOK_SKILLS);
        if (staged !== undefined) {
          expect(staged.ok).toBe(true);
          if (!staged.ok) throw new Error(staged.reason);
          const literal = gamePlayLog(career).at(-1)!;
          expect(staged.boundary.play.resolution).toEqual(literal.resolution);
          expect(staged.boundary.play.appliedGameHooks).toEqual(literal.appliedGameHooks);
          expect(staged.boundary.play.rngDrawCountAfter).toBe(literal.rngDrawCountAfter);
          for (const hook of [
            ...staged.boundary.continuation.matchup.opportunityGameHooks,
            ...pending.informationGameHooks,
            ...staged.boundary.play.appliedGameHooks,
          ])
            tacticalHooks.add(hook.hookId);
        }
        const applied = gamePlayLog(career).at(-1)?.appliedGameHooks ?? [];
        for (const hook of applied) observedHooks.add(hook.hookId);
        expect(applied.map(({ effectIndex }) => effectIndex)).toEqual(
          [...applied.map(({ effectIndex }) => effectIndex)].sort((left, right) => left - right),
        );
      }
      expect(career.phase.type).toBe('POST_GAME');
    }
    expect([...observedFamilies].sort()).toEqual(
      [
        'key_snap_family_catch',
        'key_snap_family_release',
        'key_snap_family_route',
        'key_snap_family_yac',
      ].sort(),
    );
    expect([...observedHooks].sort()).toEqual(
      [
        'game_hook_coverage_clue_bonus',
        'game_hook_contested_catch_success_bonus',
        'game_hook_tipped_turnover_risk_bonus',
        'game_hook_yac_yardage_multiplier',
        'game_hook_fumble_risk_multiplier',
        'game_hook_assignment_reliability_bonus',
        'game_hook_package_snap_bonus',
        'game_hook_pressure_composure_bonus',
      ].sort(),
    );
    expect([...tacticalHooks].sort()).toEqual([...observedHooks].sort());
  });

  it('Coverage Ledger reveals a persisted extra clue without consuming an extra draw', () => {
    const base = weekEndCareer(450, 650);
    const without = start(prepare(base, TEST_GAME_SKILLS), TEST_GAME_SKILLS);
    const withCoverage = start(prepare(base, TEST_COVERAGE_GAME_SKILLS), TEST_COVERAGE_GAME_SKILLS);
    expect(without.phase.type).toBe('KEY_SNAP');
    expect(withCoverage.phase.type).toBe('KEY_SNAP');
    if (without.phase.type !== 'KEY_SNAP' || withCoverage.phase.type !== 'KEY_SNAP') return;
    expect(withCoverage.rng).toEqual(without.rng);
    expect(withCoverage.phase.pendingSnap.patternId).toBe(without.phase.pendingSnap.patternId);
    expect(withCoverage.phase.pendingSnap.revealedClueIds.length).toBeGreaterThan(
      without.phase.pendingSnap.revealedClueIds.length,
    );
    expect(withCoverage.phase.pendingSnap.informationGameHooks).toEqual([
      expect.objectContaining({
        hookId: 'game_hook_coverage_clue_bonus',
        appliedValue: 30,
      }),
    ]);
  });

  it('rejects tampered completed-week evidence after preview persistence', () => {
    const preview = prepare(weekEndCareer(450, 650));
    const tampered = jsonClone(preview);
    if (tampered.phase.type !== 'GAME_PREVIEW') return;
    tampered.phase.matchup.completedWeek.results[0]!.bodyAfter += 1;
    const validation = validateCareerRun(tampered);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.issues).toContainEqual(
        expect.objectContaining({
          code: 'invariant.invalid_combination',
          path: expect.stringMatching(/^career\.phase\.matchup\.completedWeek\.results\.0/u),
        }),
      );
    }
  });

  it('rejects phase/profile/catalog/revision/RNG failures without draws or mutation', () => {
    const weekEnd = weekEndCareer(450, 650);
    const invalidProfile = { ...TEST_PLAYER_GAME_PROFILE, programId: 'program_wrong' } as const;
    const invalidPrepare = prepareGame(
      weekEnd,
      invalidProfile,
      TEST_OPPONENT_GAME_PROFILE,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      TEST_GAME_SKILLS,
    );
    expect(invalidPrepare).toEqual({
      career: weekEnd,
      ok: false,
      reason: 'game.invalid_player_profile',
    });
    expect(invalidPrepare.career).toBe(weekEnd);

    const preview = prepare(weekEnd);
    const malformedPatterns = jsonClone(
      TEST_GAME_PATTERNS,
    ) as unknown as KeySnapPatternMechanicsDefinition[];
    malformedPatterns[1] = {
      ...malformedPatterns[1]!,
      familyId: 'key_snap_family_route',
    };
    const invalidStart = startGame(
      preview,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      malformedPatterns,
      TEST_GAME_SKILLS,
    );
    expect(invalidStart).toEqual({
      career: preview,
      ok: false,
      reason: 'game.invalid_pattern_definitions',
    });
    expect(invalidStart.career).toBe(preview);

    const exhausted = {
      ...preview,
      rng: { ...preview.rng, drawCount: Number.MAX_SAFE_INTEGER },
    } satisfies CareerRun;
    expect(validateCareerRun(exhausted)).toEqual({ issues: [], ok: true });
    const exhaustedResult = startGame(
      exhausted,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      TEST_GAME_SKILLS,
    );
    expect(exhaustedResult).toEqual({
      career: exhausted,
      ok: false,
      reason: 'game.rng_exhausted',
    });
    expect(exhaustedResult.career).toBe(exhausted);

    const keySnap = start(preview);
    const invalidDecision = resolveKeySnap(
      keySnap,
      'key_snap_decision_not_legal' as KeySnapDecisionId,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      TEST_GAME_SKILLS,
    );
    expect(invalidDecision).toEqual({
      career: keySnap,
      ok: false,
      reason: 'game.invalid_decision',
    });
    expect(invalidDecision.career).toBe(keySnap);
    const missingEquippedSkill = resolveKeySnap(
      keySnap,
      keySnap.phase.type === 'KEY_SNAP'
        ? keySnap.phase.pendingSnap.decisionIds[0]
        : ('key_snap_decision_not_legal' as KeySnapDecisionId),
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      [],
    );
    expect(missingEquippedSkill).toEqual({
      career: keySnap,
      ok: false,
      reason: 'game.invalid_skill_definitions',
    });
    expect(missingEquippedSkill.career).toBe(keySnap);

    const maxRevision = { ...weekEnd, revision: Number.MAX_SAFE_INTEGER } satisfies CareerRun;
    const revisionResult = prepareGame(
      maxRevision,
      TEST_PLAYER_GAME_PROFILE,
      TEST_OPPONENT_GAME_PROFILE,
      TEST_GAME_TUNING,
      TEST_GAME_FAMILIES,
      TEST_GAME_PATTERNS,
      TEST_GAME_SKILLS,
    );
    expect(revisionResult).toEqual({
      career: maxRevision,
      ok: false,
      reason: 'game.revision_exhausted',
    });
  });
});
