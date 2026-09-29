import { describe, expect, it } from 'vitest';

import {
  CAREER_SCHEMA_VERSION_V5,
  CAREER_SCHEMA_VERSION_V6,
  CAREER_SCHEMA_VERSION_V7,
  createCareerSession,
  createEmptyMetaProfile,
  deriveWorldSeed,
  isCareerRunV4,
  isCareerRunV5,
  isCareerSessionV5,
  isCareerSessionV6,
  isCareerSessionV7,
  isMetaProfileV1,
  migrateCareerRunV1ToV2,
  migrateCareerRunV2ToV3,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  migrateCareerSnapshotToSession,
  parseCareerRun,
  parseCareerRunV4,
  parseCareerRunV5,
  parseCareerSession,
  parseMetaProfile,
  validateCareerRunV4,
  validateCareerRunV5,
  validateCareerSessionV5,
  validateCareerSessionV6,
  validateCareerSessionV7,
  validateMetaProfileV1,
  type CareerRunV4,
} from '../src/index.js';
import { CAREER_RUN_V1_PHASE_FIXTURES } from './fixtures/career-run-v1.js';
import { CAREER_RUN_V3_PHASE_FIXTURE_CASES } from './fixtures/career-run-v3.js';

type DeepMutable<T> = T extends readonly (infer TItem)[]
  ? DeepMutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
    : T;

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function withoutV5Fields(value: unknown): unknown {
  const legacy = jsonClone(value) as Record<string, unknown>;
  delete legacy['seasonCareerState'];
  legacy['schemaVersion'] = 4;
  return legacy;
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

describe('CareerRun schema v5 and session persistence foundation', () => {
  it('keeps strict v4 snapshots for every shipped weekly phase and migrates only the marker', () => {
    expect(CAREER_RUN_V3_PHASE_FIXTURE_CASES.map(({ name }) => name)).toEqual([
      'plan',
      'resolve0',
      'resolve1',
      'resolve2',
      'weekEnd',
      'skillBreakthrough',
    ]);
    for (const fixture of CAREER_RUN_V3_PHASE_FIXTURE_CASES) {
      const v4 = migrateCareerRunV3ToV4(fixture.career);
      const before = JSON.stringify(v4);
      expect(validateCareerRunV4(v4)).toEqual({ ok: true, issues: [] });
      expect(isCareerRunV4(v4)).toBe(true);
      const v5 = migrateCareerRunV4ToV5(v4);
      expect(v5.schemaVersion).toBe(CAREER_SCHEMA_VERSION_V5);
      expect(v5.phase).toEqual(v4.phase);
      expect(v5.revision).toBe(v4.revision);
      expect(v5.rng).toEqual(v4.rng);
      expect(v5.seasonCareerState).toEqual({
        model: 'season_v1',
        bootstrapStatus: 'PENDING',
        seasonsCompleted: 0,
        activeSeasonId: null,
        lastCompletedSeason: null,
      });
      expect(withoutV5Fields(v5)).toEqual(v4);
      expect(JSON.stringify(v4)).toBe(before);
      expect(validateCareerRunV5(v5)).toEqual({ ok: true, issues: [] });
      expectDeepFrozen(v5);
    }
  });

  it('converges v1-v6 through the current v7 parser while exact readers stay separate', () => {
    const v1 = CAREER_RUN_V1_PHASE_FIXTURES.resolve2;
    const v2 = migrateCareerRunV1ToV2(v1);
    const v3 = migrateCareerRunV2ToV3(v2);
    const v4 = migrateCareerRunV3ToV4(v3);
    const v5 = migrateCareerRunV4ToV5(v4);
    const v6 = migrateCareerRunV5ToV6(v5);
    const v7 = migrateCareerRunV6ToV7(v6);
    expect(v6.schemaVersion).toBe(CAREER_SCHEMA_VERSION_V6);
    expect(v7.schemaVersion).toBe(CAREER_SCHEMA_VERSION_V7);
    for (const snapshot of [v1, v2, v3, v4, v5, v6]) {
      expect(parseCareerRun(snapshot)).toEqual({ ok: true, career: v7 });
    }
    expect(parseCareerRunV4(v5)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(parseCareerRunV5(v4)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(isCareerRunV4(v5)).toBe(false);
    expect(isCareerRunV5(v5)).toBe(true);
  });

  it('wraps a migrated career with a linked, independently seeded pending world', () => {
    const career = migrateCareerRunV6ToV7(
      migrateCareerRunV5ToV6(
        migrateCareerRunV4ToV5(
          migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[4]!.career),
        ),
      ),
    );
    const before = JSON.stringify(career);
    const session = createCareerSession(career);
    expect(session.schemaVersion).toBe(7);
    expect(session.career).toEqual(career);
    expect(session.career).not.toBe(career);
    expect(session.world).toEqual({
      schemaVersion: 1,
      model: 'season_v1',
      careerId: career.id,
      worldSeed: deriveWorldSeed(career.careerSeed),
      rng: expect.objectContaining({ drawCount: 0 }),
      revision: 0,
      calendar: { type: 'PENDING' },
    });
    expect(session.world.rng).not.toEqual(career.rng);
    expect(JSON.stringify(career)).toBe(before);
    expect(validateCareerSessionV7(session)).toEqual({ ok: true, issues: [] });
    expect(isCareerSessionV7(session)).toBe(true);
    expect(validateCareerSessionV6(session).ok).toBe(false);
    expect(isCareerSessionV6(session)).toBe(false);
    expect(validateCareerSessionV5(session).ok).toBe(false);
    expect(isCareerSessionV5(session)).toBe(false);
    expect(parseCareerSession(JSON.stringify(session))).toEqual({ ok: true, session });
    expectDeepFrozen(session);
  });

  it('distinguishes numeric and string world-seed domains without consuming career RNG', () => {
    expect(deriveWorldSeed(42)).toBe('world_v1:number:42');
    expect(deriveWorldSeed('42')).toBe('world_v1:string:42');
    expect(deriveWorldSeed(42)).not.toBe(deriveWorldSeed('42'));
  });

  it('migrates every legacy career directly to the same pending session', () => {
    const v1 = CAREER_RUN_V1_PHASE_FIXTURES.weekEnd;
    const v2 = migrateCareerRunV1ToV2(v1);
    const v3 = migrateCareerRunV2ToV3(v2);
    const v4 = migrateCareerRunV3ToV4(v3);
    const expected = createCareerSession(
      migrateCareerRunV6ToV7(migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(v4))),
    );
    for (const snapshot of [v1, v2, v3, v4, expected.career]) {
      expect(migrateCareerSnapshotToSession(snapshot)).toEqual({
        ok: true,
        session: expected,
      });
    }
  });

  it('rejects malformed links, nested extras, and future versions', () => {
    const v4 = migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career);
    const session = jsonClone(
      createCareerSession(
        migrateCareerRunV6ToV7(migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(v4))),
      ),
    );
    session.world.careerId = 'career_wrong';
    session.world.worldSeed = 'world_v1:string:wrong';
    session.world.rng.drawCount = 1;
    const invalid = validateCareerSessionV7(session);
    expect(invalid).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.invalid_combination', path: 'session.world.careerId' },
          { code: 'invariant.invalid_combination', path: 'session.world.rng' },
          { code: 'invariant.invalid_combination', path: 'session.world.worldSeed' },
        ]),
      }),
    );

    const extra = jsonClone(
      createCareerSession(
        migrateCareerRunV6ToV7(migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(v4))),
      ),
    ) as unknown as {
      world: Record<string, unknown>;
    };
    extra.world['future'] = true;
    expect(parseCareerSession(extra)).toEqual(
      expect.objectContaining({ ok: false, reason: 'session_parse.invalid_session' }),
    );

    const future = jsonClone(
      createCareerSession(
        migrateCareerRunV6ToV7(migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(v4))),
      ),
    );
    future.schemaVersion = 8 as 7;
    expect(parseCareerSession(future)).toEqual({
      ok: false,
      reason: 'session_parse.unsupported_version',
      issues: [],
    });
  });

  it('creates, parses, freezes, and strictly protects the empty meta profile', () => {
    const meta = createEmptyMetaProfile();
    expect(validateMetaProfileV1(meta)).toEqual({ ok: true, issues: [] });
    expect(isMetaProfileV1(meta)).toBe(true);
    expect(parseMetaProfile(JSON.stringify(meta))).toEqual({ ok: true, meta });
    expectDeepFrozen(meta);

    const future = jsonClone(meta);
    future.schemaVersion = 2 as 1;
    expect(parseMetaProfile(future)).toEqual({
      ok: false,
      reason: 'session_parse.unsupported_version',
      issues: [],
    });
    const noncanonical = jsonClone(meta);
    noncanonical.unlockedOptionIds = ['unlock_z', 'unlock_a'];
    expect(validateMetaProfileV1(noncanonical)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.noncanonical_order', path: 'meta.unlockedOptionIds.1' },
        ]),
      }),
    );
  });

  it('does not freeze or mutate an invalid caller-owned v4 migration source', () => {
    const source = jsonClone(migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career));
    source.revision = -1;
    const before = jsonClone(source);
    expect(() => migrateCareerRunV4ToV5(source as unknown as CareerRunV4)).toThrow(
      'career_migration.invalid_v4',
    );
    expect(source).toEqual(before);
    expect(Object.isFrozen(source)).toBe(false);
  });
});
