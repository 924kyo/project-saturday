import {
  CAREER_SCHEMA_VERSION,
  CAREER_SCHEMA_VERSION_V1,
  CAREER_SCHEMA_VERSION_V2,
  RECENT_WEEKLY_ACTION_ID_LIMIT,
  SKILL_ID_PREFIX,
  STABLE_DOMAIN_ID_MAX_LENGTH,
  isCareerRun,
  isCareerRunV1,
  isCareerRunV2,
  isSkillId,
  migrateCareerRunV1ToV2,
  nextUint32,
  parseCareerRun,
  parseCareerRunV1,
  parseCareerRunV2,
  validateCareerRun,
  validateCareerRunV1,
  validateCareerRunV2,
  type CareerRunV1,
  type CareerRunV2,
  type RngState,
  type SkillId,
  type SkillBreakthroughPhase,
  type WeeklyActionId,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

import {
  CAREER_RUN_V1_PHASE_FIXTURE_CASES,
  CAREER_RUN_V1_PHASE_FIXTURES,
} from './fixtures/career-run-v1.js';

type DeepMutable<T> = T extends readonly (infer TItem)[]
  ? DeepMutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
    : T;

type MutableSkillCareer = DeepMutable<CareerRunV2>;
type MutableBreakthroughPhase = DeepMutable<SkillBreakthroughPhase>;

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const nestedValue of Object.values(value)) {
    expectDeepFrozen(nestedValue);
  }
}

function phaseResultActionIds(career: CareerRunV1): readonly WeeklyActionId[] {
  return career.phase.type === 'PLAN_ACTIONS'
    ? []
    : career.phase.results.map(({ actionId }) => actionId);
}

function stripV2Fields(career: CareerRunV2): unknown {
  const legacy = jsonClone(career) as unknown as Record<string, unknown>;
  delete legacy['recentWeeklyActionIds'];
  delete legacy['lastPassiveBodyRecovery'];
  const player = legacy['player'] as Record<string, unknown>;
  delete player['skillState'];
  const phase = legacy['phase'] as Record<string, unknown>;
  if (Array.isArray(phase['results'])) {
    for (const result of phase['results']) {
      const actionResult = result as Record<string, unknown>;
      delete actionResult['baseBodyDelta'];
      delete actionResult['baseGpaDelta'];
      delete actionResult['skillEffectAggregates'];
      delete actionResult['appliedSkillEffects'];
    }
  }
  legacy['schemaVersion'] = CAREER_SCHEMA_VERSION_V1;
  return legacy;
}

function rngAfterDraws(initialRng: RngState, drawCount: number): RngState {
  let rng = initialRng;
  for (let index = 0; index < drawCount; index += 1) {
    rng = nextUint32(rng).nextRng;
  }
  return rng;
}

function validSkillBreakthroughCareer(): CareerRunV2 {
  const base = migrateCareerRunV1ToV2(CAREER_RUN_V1_PHASE_FIXTURES.plan);
  return {
    ...base,
    weekIndex: 9,
    rng: rngAfterDraws(base.rng, 9),
    recentWeeklyActionIds: [
      'action_route_drills',
      'action_recovery',
      'action_film_study',
      'action_recovery',
      'action_weight_room',
      'action_study_hall',
    ],
    phase: {
      type: 'SKILL_BREAKTHROUGH',
      offer: {
        offerIndex: 2,
        weekIndex: 9,
        offeredSkillIds: ['skill_fixture_b', 'skill_fixture_f', 'skill_fixture_g'],
        rngDrawCountBefore: 6,
        rngDrawCountAfter: 9,
      },
    },
    player: {
      ...base.player,
      skillState: {
        acquisitions: [
          {
            offerIndex: 0,
            weekIndex: 1,
            offeredSkillIds: ['skill_fixture_a', 'skill_fixture_b', 'skill_fixture_c'],
            selectedSkillId: 'skill_fixture_a',
            rngDrawCountBefore: 0,
            rngDrawCountAfter: 3,
          },
          {
            offerIndex: 1,
            weekIndex: 5,
            offeredSkillIds: ['skill_fixture_b', 'skill_fixture_d', 'skill_fixture_e'],
            selectedSkillId: 'skill_fixture_d',
            rngDrawCountBefore: 3,
            rngDrawCountAfter: 6,
          },
        ],
        equippedSkillIds: ['skill_fixture_a', 'skill_fixture_d', null, null],
      },
    },
  };
}

function mutableSkillCareer(): MutableSkillCareer {
  return jsonClone(validSkillBreakthroughCareer());
}

function breakthroughPhase(career: MutableSkillCareer): MutableBreakthroughPhase {
  if (career.phase.type !== 'SKILL_BREAKTHROUGH') {
    throw new Error('Expected a skill breakthrough fixture.');
  }
  return career.phase;
}

function acquisition(career: MutableSkillCareer, index: number) {
  const record = career.player.skillState.acquisitions[index];
  if (record === undefined) {
    throw new Error(`Missing acquisition fixture at index ${index}.`);
  }
  return record;
}

interface InvalidSkillCareerCase {
  readonly name: string;
  readonly expectedPath: string;
  readonly mutate: (career: MutableSkillCareer) => void;
}

const INVALID_SKILL_CAREER_CASES: readonly InvalidSkillCareerCase[] = [
  {
    name: 'overlong recent-action history',
    expectedPath: 'career.recentWeeklyActionIds',
    mutate: (career) => {
      career.recentWeeklyActionIds.push('action_recovery');
    },
  },
  {
    name: 'sparse recent-action history',
    expectedPath: 'career.recentWeeklyActionIds.1',
    mutate: (career) => {
      delete career.recentWeeklyActionIds[1];
    },
  },
  {
    name: 'unknown recent action',
    expectedPath: 'career.recentWeeklyActionIds.0',
    mutate: (career) => {
      career.recentWeeklyActionIds[0] = 'action_unknown' as WeeklyActionId;
    },
  },
  {
    name: 'short equipped tuple',
    expectedPath: 'career.player.skillState.equippedSkillIds',
    mutate: (career) => {
      career.player.skillState.equippedSkillIds.pop();
    },
  },
  {
    name: 'sparse equipped tuple',
    expectedPath: 'career.player.skillState.equippedSkillIds.2',
    mutate: (career) => {
      delete career.player.skillState.equippedSkillIds[2];
    },
  },
  {
    name: 'duplicate equipped card',
    expectedPath: 'career.player.skillState.equippedSkillIds.1',
    mutate: (career) => {
      career.player.skillState.equippedSkillIds[1] = 'skill_fixture_a';
    },
  },
  {
    name: 'unowned equipped card',
    expectedPath: 'career.player.skillState.equippedSkillIds.1',
    mutate: (career) => {
      career.player.skillState.equippedSkillIds[1] = 'skill_fixture_unowned';
    },
  },
  {
    name: 'invalid equipped card ID',
    expectedPath: 'career.player.skillState.equippedSkillIds.1',
    mutate: (career) => {
      career.player.skillState.equippedSkillIds[1] = 'not_a_skill' as unknown as SkillId;
    },
  },
  {
    name: 'short active offer tuple',
    expectedPath: 'career.phase.offer.offeredSkillIds',
    mutate: (career) => {
      breakthroughPhase(career).offer.offeredSkillIds.pop();
    },
  },
  {
    name: 'sparse active offer tuple',
    expectedPath: 'career.phase.offer.offeredSkillIds.1',
    mutate: (career) => {
      delete breakthroughPhase(career).offer.offeredSkillIds[1];
    },
  },
  {
    name: 'duplicate active offer card',
    expectedPath: 'career.phase.offer.offeredSkillIds.1',
    mutate: (career) => {
      breakthroughPhase(career).offer.offeredSkillIds[1] = 'skill_fixture_b';
    },
  },
  {
    name: 'invalid active offer card ID',
    expectedPath: 'career.phase.offer.offeredSkillIds.0',
    mutate: (career) => {
      breakthroughPhase(career).offer.offeredSkillIds[0] = 'invalid_skill_id' as unknown as SkillId;
    },
  },
  {
    name: 'selected card absent from its offer',
    expectedPath: 'career.player.skillState.acquisitions.1.selectedSkillId',
    mutate: (career) => {
      acquisition(career, 1).selectedSkillId = 'skill_fixture_f';
    },
  },
  {
    name: 'later offer contains an already-owned card',
    expectedPath: 'career.player.skillState.acquisitions.1.offeredSkillIds.0',
    mutate: (career) => {
      acquisition(career, 1).offeredSkillIds[0] = 'skill_fixture_a';
    },
  },
  {
    name: 'duplicate selected card',
    expectedPath: 'career.player.skillState.acquisitions.1.selectedSkillId',
    mutate: (career) => {
      const second = acquisition(career, 1);
      second.offeredSkillIds[0] = 'skill_fixture_a';
      second.selectedSkillId = 'skill_fixture_a';
    },
  },
  {
    name: 'noncontiguous acquisition offer index',
    expectedPath: 'career.player.skillState.acquisitions.1.offerIndex',
    mutate: (career) => {
      acquisition(career, 1).offerIndex = 3;
    },
  },
  {
    name: 'reverse chronological acquisition weeks',
    expectedPath: 'career.player.skillState.acquisitions.1.weekIndex',
    mutate: (career) => {
      acquisition(career, 0).weekIndex = 5;
      acquisition(career, 1).weekIndex = 1;
    },
  },
  {
    name: 'non-cadence acquisition week',
    expectedPath: 'career.player.skillState.acquisitions.0.weekIndex',
    mutate: (career) => {
      acquisition(career, 0).weekIndex = 2;
    },
  },
  {
    name: 'empty acquisition RNG draw range',
    expectedPath: 'career.player.skillState.acquisitions.0.rngDrawCountAfter',
    mutate: (career) => {
      acquisition(career, 0).rngDrawCountAfter = 0;
    },
  },
  {
    name: 'overlapping acquisition RNG draw range',
    expectedPath: 'career.player.skillState.acquisitions.1.rngDrawCountAfter',
    mutate: (career) => {
      acquisition(career, 1).rngDrawCountBefore = 0;
    },
  },
  {
    name: 'acquisition RNG draw range shorter than three draws',
    expectedPath: 'career.player.skillState.acquisitions.0.rngDrawCountAfter',
    mutate: (career) => {
      acquisition(career, 0).rngDrawCountAfter = 2;
    },
  },
  {
    name: 'acquisition RNG draw beyond career RNG',
    expectedPath: 'career.player.skillState.acquisitions.1.rngDrawCountAfter',
    mutate: (career) => {
      acquisition(career, 1).rngDrawCountAfter = 10;
    },
  },
  {
    name: 'active offer index not next',
    expectedPath: 'career.phase.offer.offerIndex',
    mutate: (career) => {
      breakthroughPhase(career).offer.offerIndex = 1;
    },
  },
  {
    name: 'active offer week differs from career week',
    expectedPath: 'career.phase.offer.weekIndex',
    mutate: (career) => {
      breakthroughPhase(career).offer.weekIndex = 3;
    },
  },
  {
    name: 'active offer exists on a non-cadence career week',
    expectedPath: 'career.phase.offer.weekIndex',
    mutate: (career) => {
      career.weekIndex = 8;
      breakthroughPhase(career).offer.weekIndex = 8;
    },
  },
  {
    name: 'active offer reuses the most recent acquisition cadence week',
    expectedPath: 'career.phase.offer.weekIndex',
    mutate: (career) => {
      acquisition(career, 1).weekIndex = career.weekIndex;
    },
  },
  {
    name: 'active offer contains an owned card',
    expectedPath: 'career.phase.offer.offeredSkillIds.0',
    mutate: (career) => {
      breakthroughPhase(career).offer.offeredSkillIds[0] = 'skill_fixture_a';
    },
  },
  {
    name: 'active offer draw range overlaps acquisition history',
    expectedPath: 'career.phase.offer.rngDrawCountAfter',
    mutate: (career) => {
      breakthroughPhase(career).offer.rngDrawCountBefore = 1;
    },
  },
  {
    name: 'active offer RNG draw range shorter than three draws',
    expectedPath: 'career.phase.offer.rngDrawCountAfter',
    mutate: (career) => {
      breakthroughPhase(career).offer.rngDrawCountBefore = 7;
    },
  },
  {
    name: 'active offer draw count does not match career RNG',
    expectedPath: 'career.phase.offer.rngDrawCountAfter',
    mutate: (career) => {
      breakthroughPhase(career).offer.rngDrawCountAfter = 3;
    },
  },
  {
    name: 'unknown skill-state field',
    expectedPath: 'career.player.skillState.ownedSkillIds',
    mutate: (career) => {
      (career.player.skillState as unknown as Record<string, unknown>)['ownedSkillIds'] = [];
    },
  },
];

describe('CareerRun schema v2 and schema-v1 migration', () => {
  it('keeps checked-in schema-v1 fixtures valid, exact, and deeply immutable in every M1 phase', () => {
    expect(CAREER_RUN_V1_PHASE_FIXTURE_CASES.map(({ name }) => name)).toEqual([
      'plan',
      'resolve0',
      'resolve1',
      'resolve2',
      'weekEnd',
    ]);

    for (const { career } of CAREER_RUN_V1_PHASE_FIXTURE_CASES) {
      expect(validateCareerRunV1(career)).toEqual({ ok: true, issues: [] });
      expect(isCareerRunV1(career)).toBe(true);
      expect(validateCareerRunV2(career).ok).toBe(false);
      expect(validateCareerRun(career).ok).toBe(false);
      expect(isCareerRun(career)).toBe(false);
      expectDeepFrozen(career);
    }
  });

  it('migrates every resumable v1 phase without changing legacy state and seeds only persisted result history', () => {
    for (const { career } of CAREER_RUN_V1_PHASE_FIXTURE_CASES) {
      const before = JSON.stringify(career);
      const migrated = migrateCareerRunV1ToV2(career);

      expect(migrated.schemaVersion).toBe(CAREER_SCHEMA_VERSION_V2);
      expect(CAREER_SCHEMA_VERSION).toBe(CAREER_SCHEMA_VERSION_V2);
      expect(stripV2Fields(migrated)).toEqual(career);
      expect(migrated.recentWeeklyActionIds).toEqual(phaseResultActionIds(career));
      expect(migrated.player.skillState).toEqual({
        acquisitions: [],
        equippedSkillIds: [null, null, null, null],
      });
      expect(migrated.lastPassiveBodyRecovery).toBeNull();
      expect(migrated.revision).toBe(career.revision);
      expect(migrated.rng).toEqual(career.rng);
      expect((stripV2Fields(migrated) as CareerRunV1).phase).toEqual(career.phase);
      expect(validateCareerRunV2(migrated)).toEqual({ ok: true, issues: [] });
      expect(isCareerRunV2(migrated)).toBe(true);
      expect(JSON.stringify(career)).toBe(before);
      expectDeepFrozen(migrated);
    }
  });

  it('clones caller-owned v1 data and produces deterministic independent migration results', () => {
    const callerOwned = jsonClone(CAREER_RUN_V1_PHASE_FIXTURES.resolve2);
    const before = jsonClone(callerOwned);
    const first = migrateCareerRunV1ToV2(callerOwned as unknown as CareerRunV1);
    const second = migrateCareerRunV1ToV2(callerOwned as unknown as CareerRunV1);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.player).not.toBe(second.player);
    expect(callerOwned).toEqual(before);
    expect(Object.isFrozen(callerOwned)).toBe(false);
    expect(Object.isFrozen(callerOwned.player)).toBe(false);
  });

  it('dispatches strict v1, strict v2, and migrating current parsers without cross-version acceptance', () => {
    const legacy = CAREER_RUN_V1_PHASE_FIXTURES.weekEnd;
    const current = migrateCareerRunV1ToV2(legacy);

    const parsedV1 = parseCareerRunV1(JSON.stringify(legacy));
    expect(parsedV1).toEqual(expect.objectContaining({ ok: true, career: legacy }));
    if (parsedV1.ok) {
      expect(parsedV1.career).not.toBe(legacy);
      expectDeepFrozen(parsedV1.career);
    }
    expect(parseCareerRunV2(legacy)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(parseCareerRunV1(current)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });

    const parsedCurrent = parseCareerRunV2(current);
    const dispatchedLegacy = parseCareerRun(legacy);
    const dispatchedCurrent = parseCareerRun(current);
    expect(parsedCurrent).toEqual({ ok: true, career: current });
    expect(dispatchedLegacy).toEqual({ ok: true, career: current });
    expect(dispatchedCurrent).toEqual({ ok: true, career: current });
    if (dispatchedLegacy.ok) {
      expectDeepFrozen(dispatchedLegacy.career);
    }

    for (const schemaVersion of [0, 3]) {
      const unsupported = jsonClone(current) as unknown as Record<string, unknown>;
      unsupported['schemaVersion'] = schemaVersion;
      expect(parseCareerRun(unsupported)).toEqual({
        ok: false,
        reason: 'career_parse.unsupported_version',
        issues: [],
      });
    }

    const missingVersion = jsonClone(current) as unknown as Record<string, unknown>;
    delete missingVersion['schemaVersion'];
    expect(parseCareerRun(missingVersion)).toEqual(
      expect.objectContaining({ ok: false, reason: 'career_parse.invalid_career' }),
    );
    const stringVersion = jsonClone(current) as unknown as Record<string, unknown>;
    stringVersion['schemaVersion'] = String(CAREER_SCHEMA_VERSION_V2);
    expect(parseCareerRun(stringVersion)).toEqual(
      expect.objectContaining({ ok: false, reason: 'career_parse.invalid_career' }),
    );
  });

  it('snapshots accessor-backed legacy input once before validation and migration', () => {
    const accessorBacked = jsonClone(CAREER_RUN_V1_PHASE_FIXTURES.weekEnd);
    let bodyReads = 0;
    Object.defineProperty(accessorBacked.player.state, 'body', {
      configurable: true,
      enumerable: true,
      get: () => {
        bodyReads += 1;
        return bodyReads === 1 ? 80 : 101;
      },
    });

    const parsed = parseCareerRun(accessorBacked);
    expect(parsed).toEqual(expect.objectContaining({ ok: true }));
    expect(bodyReads).toBe(1);
    if (parsed.ok) {
      expect(parsed.career.player.state.body).toBe(80);
      expect(parsed.career.phase).toEqual(
        migrateCareerRunV1ToV2(CAREER_RUN_V1_PHASE_FIXTURES.weekEnd).phase,
      );
      expectDeepFrozen(parsed.career);
    }
  });

  it('keeps v1 and v2 strict-key contracts separate, including the breakthrough phase', () => {
    const legacyWithV2Fields = jsonClone(CAREER_RUN_V1_PHASE_FIXTURES.plan) as unknown as Record<
      string,
      unknown
    >;
    legacyWithV2Fields['recentWeeklyActionIds'] = [];
    legacyWithV2Fields['lastPassiveBodyRecovery'] = null;
    const legacyPlayer = legacyWithV2Fields['player'] as Record<string, unknown>;
    legacyPlayer['skillState'] = { acquisitions: [], equippedSkillIds: [null, null, null, null] };
    expect(validateCareerRunV1(legacyWithV2Fields)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.unknown_field', path: 'career.recentWeeklyActionIds' },
          { code: 'invariant.unknown_field', path: 'career.lastPassiveBodyRecovery' },
          { code: 'invariant.unknown_field', path: 'career.player.skillState' },
        ]),
      }),
    );

    const incompleteV2 = jsonClone(CAREER_RUN_V1_PHASE_FIXTURES.plan) as unknown as Record<
      string,
      unknown
    >;
    incompleteV2['schemaVersion'] = CAREER_SCHEMA_VERSION_V2;
    expect(validateCareerRunV2(incompleteV2)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.missing_field', path: 'career.recentWeeklyActionIds' },
          { code: 'invariant.missing_field', path: 'career.lastPassiveBodyRecovery' },
          { code: 'invariant.missing_field', path: 'career.player.skillState' },
        ]),
      }),
    );

    const v1Breakthrough = jsonClone(CAREER_RUN_V1_PHASE_FIXTURES.plan) as unknown as Record<
      string,
      unknown
    >;
    v1Breakthrough['phase'] = validSkillBreakthroughCareer().phase;
    expect(validateCareerRunV1(v1Breakthrough)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.invalid_value', path: 'career.phase.type' },
        ]),
      }),
    );
  });

  it('rejects recent behavior whose suffix does not match persisted current-phase results', () => {
    const career = jsonClone(migrateCareerRunV1ToV2(CAREER_RUN_V1_PHASE_FIXTURES.resolve2));
    career.recentWeeklyActionIds[career.recentWeeklyActionIds.length - 1] = 'action_study_hall';

    expect(validateCareerRunV2(career)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          {
            code: 'invariant.invalid_combination',
            path: 'career.recentWeeklyActionIds',
          },
        ]),
      }),
    );
  });
});

describe('schema-v2 skill-state and breakthrough invariants', () => {
  it('keeps the skill-ID prefix and stable-ID length/grammar boundaries explicit', () => {
    const maximumLengthId = `${SKILL_ID_PREFIX}${'a'.repeat(
      STABLE_DOMAIN_ID_MAX_LENGTH - SKILL_ID_PREFIX.length,
    )}`;
    const overlongId = `${maximumLengthId}a`;

    expect(SKILL_ID_PREFIX).toBe('skill_');
    expect(isSkillId('skill_a')).toBe(true);
    expect(isSkillId('skill_route_master_2')).toBe(true);
    expect(isSkillId(maximumLengthId)).toBe(true);
    for (const invalid of [
      SKILL_ID_PREFIX,
      overlongId,
      'Skill_route_master',
      'skill__route_master',
      'skill-route-master',
      'ability_route_master',
      '',
      null,
      1,
    ]) {
      expect(isSkillId(invalid)).toBe(false);
    }
  });

  it('accepts a strict active offer, including a previously unselected re-offer', () => {
    const career = validSkillBreakthroughCareer();
    expect(career.recentWeeklyActionIds).toHaveLength(RECENT_WEEKLY_ACTION_ID_LIMIT);
    expect(validateCareerRunV2(career)).toEqual({ ok: true, issues: [] });
    expect(validateCareerRun(career)).toEqual({ ok: true, issues: [] });
    expect(isCareerRunV2(career)).toBe(true);
    expect(isCareerRun(career)).toBe(true);
    expect(career.player.skillState.acquisitions[0]?.offeredSkillIds).toContain('skill_fixture_b');
    expect(career.player.skillState.acquisitions[1]?.offeredSkillIds).toContain('skill_fixture_b');
    if (career.phase.type === 'SKILL_BREAKTHROUGH') {
      expect(career.phase.offer.offeredSkillIds).toContain('skill_fixture_b');
    }
  });

  it.each(INVALID_SKILL_CAREER_CASES)('rejects $name', ({ expectedPath, mutate }) => {
    const career = mutableSkillCareer();
    mutate(career);

    const first = validateCareerRunV2(career);
    const replay = validateCareerRunV2(career);
    expect(first).toEqual(replay);
    expect(first.ok).toBe(false);
    if (!first.ok) {
      expect(first.issues.map(({ path }) => path)).toContain(expectedPath);
      expectDeepFrozen(first);
    }
  });
});
