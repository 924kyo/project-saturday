import { describe, expect, it } from 'vitest';

import {
  CAREER_SCHEMA_VERSION_V6,
  CAREER_SESSION_SCHEMA_VERSION_V6,
  CAREER_SESSION_SCHEMA_VERSION_V7,
  createRng,
  deriveWorldSeed,
  isCareerRunV5,
  isCareerRunV6,
  isCareerSessionV5,
  isCareerSessionV6,
  isCareerSessionV7,
  migrateCareerRunV1ToV2,
  migrateCareerRunV2ToV3,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  migrateCareerSessionV5ToV6,
  migrateCareerSessionV6ToV7,
  parseCareerRun,
  parseCareerRunV5,
  parseCareerRunV6,
  parseCareerSession,
  parseCareerSessionV5,
  validateCareerRunV5,
  validateCareerRunV6,
  validateCareerSessionV5,
  validateCareerSessionV6,
  validateCareerSessionV7,
  type CareerRunV5,
  type CareerSessionV5,
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

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

function legacyV5Plan(): CareerRunV5 {
  return migrateCareerRunV4ToV5(
    migrateCareerRunV3ToV4(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career),
  );
}

function pendingV5Session(career: CareerRunV5): CareerSessionV5 {
  const worldSeed = deriveWorldSeed(career.careerSeed);
  return {
    schemaVersion: 5,
    career,
    world: {
      schemaVersion: 1,
      model: 'season_v1',
      careerId: career.id,
      worldSeed,
      rng: createRng(worldSeed),
      revision: 0,
      calendar: { type: 'PENDING' },
    },
  };
}

describe('CareerRun schema v6 persistence skeleton', () => {
  it('migrates every legacy weekly phase by adding only frozen neutral M6 state', () => {
    for (const fixture of CAREER_RUN_V3_PHASE_FIXTURE_CASES) {
      const v5 = migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(fixture.career));
      const before = JSON.stringify(v5);
      const v6 = migrateCareerRunV5ToV6(v5);

      expect(v6.schemaVersion).toBe(CAREER_SCHEMA_VERSION_V6);
      expect(v6.phase).toEqual(v5.phase);
      expect(v6.revision).toBe(v5.revision);
      expect(v6.rng).toEqual(v5.rng);
      expect(v6.seasonCareerState).toEqual(v5.seasonCareerState);
      expect(v6.offFieldCareerState).toEqual({
        model: 'off_field_v1',
        academics: {
          model: 'academic_v1',
          bootstrapStatus: 'PENDING',
          termIndex: 0,
          eligibilityStatus: 'PENDING',
          lastCheckpoint: null,
          checkpointHistory: [],
        },
        relationships: {
          model: 'relationships_v1',
          bootstrapStatus: 'PENDING',
          tracks: [],
          history: [],
        },
        nil: {
          model: 'nil_v1',
          fictionalFundsUsd: 0,
          pendingOffers: [],
          activeObligation: null,
          history: [],
        },
        offseason: {
          model: 'offseason_v1',
          status: 'NOT_STARTED',
          completedDecisionCount: 0,
          lastDecision: null,
        },
        programHistory: [],
      });
      expect(JSON.stringify(v5)).toBe(before);
      expect(validateCareerRunV5(v5)).toEqual({ ok: true, issues: [] });
      expect(validateCareerRunV6(v6)).toEqual({ ok: true, issues: [] });
      expect(isCareerRunV5(v6)).toBe(false);
      expect(isCareerRunV6(v6)).toBe(true);
      expectDeepFrozen(v6);
    }
  });

  it('converges exact v1-v6 readers without changing revisions or RNG evidence', () => {
    const v1 = CAREER_RUN_V1_PHASE_FIXTURES.weekEnd;
    const v2 = migrateCareerRunV1ToV2(v1);
    const v3 = migrateCareerRunV2ToV3(v2);
    const v4 = migrateCareerRunV3ToV4(v3);
    const v5 = migrateCareerRunV4ToV5(v4);
    const v6 = migrateCareerRunV5ToV6(v5);
    const v7 = migrateCareerRunV6ToV7(v6);

    for (const snapshot of [v1, v2, v3, v4, v5, v6]) {
      expect(parseCareerRun(snapshot)).toEqual({ ok: true, career: v7 });
    }
    expect(parseCareerRunV5(v6)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(parseCareerRunV6(v5)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    expect(v6.revision).toBe(v1.revision);
    expect(v6.rng).toEqual(v1.rng);
  });

  it('migrates an exact v5 session while preserving the world domain literally', () => {
    const legacy = pendingV5Session(legacyV5Plan());
    expect(validateCareerSessionV5(legacy)).toEqual({ ok: true, issues: [] });
    expect(isCareerSessionV5(legacy)).toBe(true);
    expect(parseCareerSessionV5(JSON.stringify(legacy))).toEqual({ ok: true, session: legacy });

    const migrated = migrateCareerSessionV5ToV6(legacy);
    const current = migrateCareerSessionV6ToV7(migrated);
    expect(migrated.schemaVersion).toBe(CAREER_SESSION_SCHEMA_VERSION_V6);
    expect(migrated.world).toEqual(legacy.world);
    expect(migrated.world).not.toBe(legacy.world);
    expect(migrated.career.revision).toBe(legacy.career.revision);
    expect(migrated.career.rng).toEqual(legacy.career.rng);
    expect(current.schemaVersion).toBe(CAREER_SESSION_SCHEMA_VERSION_V7);
    expect(current.world).toEqual(legacy.world);
    expect(parseCareerSession(legacy)).toEqual({ ok: true, session: current });
    expect(parseCareerSession(migrated)).toEqual({ ok: true, session: current });
    expect(validateCareerSessionV6(migrated)).toEqual({ ok: true, issues: [] });
    expect(isCareerSessionV6(migrated)).toBe(true);
    expect(validateCareerSessionV7(current)).toEqual({ ok: true, issues: [] });
    expect(isCareerSessionV7(current)).toBe(true);
    expectDeepFrozen(migrated);
  });

  it('rejects malformed neutral state and future career or session versions', () => {
    const valid = migrateCareerRunV5ToV6(legacyV5Plan());
    const malformed = jsonClone(valid) as unknown as {
      offFieldCareerState: {
        academics: Record<string, unknown>;
        relationships: { tracks: unknown[] };
      };
    };
    malformed.offFieldCareerState.academics['future'] = true;
    malformed.offFieldCareerState.relationships.tracks.push({
      actorId: 'relationship_actor_future',
    });
    const validation = validateCareerRunV6(malformed);
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.issues).toEqual(
        expect.arrayContaining([
          {
            code: 'invariant.unknown_field',
            path: 'career.offFieldCareerState.academics.future',
          },
          {
            code: 'invariant.invalid_value',
            path: 'career.offFieldCareerState.relationships.tracks',
          },
        ]),
      );
    }

    const futureCareer = jsonClone(valid);
    futureCareer.schemaVersion = 8 as 6;
    expect(parseCareerRun(futureCareer)).toEqual({
      ok: false,
      reason: 'career_parse.unsupported_version',
      issues: [],
    });
    const futureSession = jsonClone(migrateCareerSessionV5ToV6(pendingV5Session(legacyV5Plan())));
    futureSession.schemaVersion = 8 as 6;
    expect(parseCareerSession(futureSession)).toEqual({
      ok: false,
      reason: 'session_parse.unsupported_version',
      issues: [],
    });
  });
});
