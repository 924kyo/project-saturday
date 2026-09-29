import { describe, expect, it } from 'vitest';

import {
  CAREER_SCHEMA_VERSION_V7,
  CAREER_SESSION_SCHEMA_VERSION_V7,
  CB_ARCHETYPE_IDS,
  EDGE_ARCHETYPE_IDS,
  EDGE_ATTRIBUTE_IDS,
  LB_ARCHETYPE_IDS,
  LB_ATTRIBUTE_IDS,
  CB_ATTRIBUTE_IDS,
  MULTI_POSITION_ATTRIBUTE_IDS,
  PLAYER_ARCHETYPE_IDS,
  PLAYER_ATTRIBUTE_IDS,
  POSITION_IDS,
  QB_ARCHETYPE_IDS,
  QB_ATTRIBUTE_IDS,
  RB_ARCHETYPE_IDS,
  RB_ATTRIBUTE_IDS,
  WR_ARCHETYPE_IDS,
  WR_ATTRIBUTE_IDS,
  createRng,
  deriveWorldSeed,
  isCareerRunV7,
  isCareerSessionV7,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  migrateCareerSessionV5ToV6,
  migrateCareerSessionV6ToV7,
  parseCareerRun,
  parseCareerRunV6,
  parseCareerRunV7,
  parseCareerSession,
  parseCareerSessionV6,
  parseCareerSessionV7,
  validateCareerRunV6,
  validateCareerRunV7,
  validateCareerSessionV6,
  validateCareerSessionV7,
  type CareerSessionV5,
} from '../src/index.js';
import { CAREER_RUN_V3_PHASE_FIXTURE_CASES } from './fixtures/career-run-v3.js';

type DeepMutable<T> = T extends readonly (infer TItem)[]
  ? DeepMutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> }
    : T;

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

function legacyV5Session(): CareerSessionV5 {
  const v5 = migrateCareerRunV4ToV5(
    migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career),
  );
  const worldSeed = deriveWorldSeed(v5.careerSeed);
  return {
    schemaVersion: 5,
    career: v5,
    world: {
      schemaVersion: 1,
      model: 'season_v1',
      careerId: v5.id,
      worldSeed,
      rng: createRng(worldSeed),
      revision: 0,
      calendar: { type: 'PENDING' },
    },
  };
}

describe('CareerRun schema v7 compatibility checkpoint', () => {
  it('migrates exact v6 snapshots by changing only the schema marker', () => {
    for (const fixture of CAREER_RUN_V3_PHASE_FIXTURE_CASES) {
      const v5 = migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(fixture.career));
      const v6 = migrateCareerRunV5ToV6(v5);
      const before = JSON.stringify(v6);
      const v7 = migrateCareerRunV6ToV7(v6);

      expect(v7).toEqual({ ...v6, schemaVersion: CAREER_SCHEMA_VERSION_V7 });
      expect(v7.revision).toBe(v6.revision);
      expect(v7.rng).toEqual(v6.rng);
      expect(v7.phase).toEqual(v6.phase);
      expect(v7.offFieldCareerState).toEqual(v6.offFieldCareerState);
      expect(JSON.stringify(v6)).toBe(before);
      expect(validateCareerRunV6(v6)).toEqual({ ok: true, issues: [] });
      expect(validateCareerRunV7(v7)).toEqual({ ok: true, issues: [] });
      expect(isCareerRunV7(v7)).toBe(true);
      expectDeepFrozen(v7);
    }
  });

  it('keeps exact v6/v7 readers separate while the current reader converges on v7', () => {
    const v6 = migrateCareerRunV5ToV6(
      migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career)),
    );
    const v7 = migrateCareerRunV6ToV7(v6);
    expect(parseCareerRun(v6)).toEqual({ ok: true, career: v7 });
    expect(parseCareerRun(v7)).toEqual({ ok: true, career: v7 });
    expect(parseCareerRunV6(v7)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(parseCareerRunV7(v6)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
  });

  it('migrates exact v5 and v6 sessions to the same frozen v7 envelope', () => {
    const v5 = legacyV5Session();
    const v6 = migrateCareerSessionV5ToV6(v5);
    const v7 = migrateCareerSessionV6ToV7(v6);

    expect(v7.schemaVersion).toBe(CAREER_SESSION_SCHEMA_VERSION_V7);
    expect(v7.world).toEqual(v6.world);
    expect(v7.career.revision).toBe(v6.career.revision);
    expect(v7.career.rng).toEqual(v6.career.rng);
    expect(parseCareerSession(v5)).toEqual({ ok: true, session: v7 });
    expect(parseCareerSession(v6)).toEqual({ ok: true, session: v7 });
    expect(parseCareerSession(v7)).toEqual({ ok: true, session: v7 });
    expect(parseCareerSessionV6(v7).ok).toBe(false);
    expect(parseCareerSessionV7(v6).ok).toBe(false);
    expect(validateCareerSessionV6(v6)).toEqual({ ok: true, issues: [] });
    expect(validateCareerSessionV7(v7)).toEqual({ ok: true, issues: [] });
    expect(isCareerSessionV7(v7)).toBe(true);
    expectDeepFrozen(v7);
  });

  it('reserves canonical position identifiers without activating non-WR player saves', () => {
    expect(POSITION_IDS).toEqual([
      'position_wr',
      'position_qb',
      'position_rb',
      'position_cb',
      'position_lb',
      'position_edge',
    ]);
    expect(PLAYER_ARCHETYPE_IDS).toEqual([
      ...WR_ARCHETYPE_IDS,
      ...QB_ARCHETYPE_IDS,
      ...RB_ARCHETYPE_IDS,
      ...CB_ARCHETYPE_IDS,
      ...LB_ARCHETYPE_IDS,
      ...EDGE_ARCHETYPE_IDS,
    ]);
    expect(MULTI_POSITION_ATTRIBUTE_IDS).toEqual([
      ...PLAYER_ATTRIBUTE_IDS,
      ...QB_ATTRIBUTE_IDS,
      ...RB_ATTRIBUTE_IDS,
      ...CB_ATTRIBUTE_IDS,
      ...LB_ATTRIBUTE_IDS,
      ...EDGE_ATTRIBUTE_IDS,
    ]);
    expect(new Set(MULTI_POSITION_ATTRIBUTE_IDS).size).toBe(MULTI_POSITION_ATTRIBUTE_IDS.length);
    expect(PLAYER_ATTRIBUTE_IDS).toEqual(expect.arrayContaining([...WR_ATTRIBUTE_IDS]));
    expect(PLAYER_ATTRIBUTE_IDS).not.toEqual(expect.arrayContaining([...QB_ATTRIBUTE_IDS]));

    const current = migrateCareerRunV6ToV7(
      migrateCareerRunV5ToV6(
        migrateCareerRunV4ToV5(
          migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career),
        ),
      ),
    );
    const nonWr = jsonClone(current);
    nonWr.player.positionId = 'position_qb' as 'position_wr';
    expect(validateCareerRunV7(nonWr)).toEqual(
      expect.objectContaining({
        ok: false,
        issues: expect.arrayContaining([
          { code: 'invariant.invalid_id', path: 'career.player.positionId' },
        ]),
      }),
    );

    const future = jsonClone(current);
    future.schemaVersion = 8 as 7;
    expect(parseCareerRun(future)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
  });
});
