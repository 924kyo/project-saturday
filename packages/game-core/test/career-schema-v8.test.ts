import { describe, expect, it } from 'vitest';
import {
  CAREER_SCHEMA_VERSION,
  CAREER_SESSION_SCHEMA_VERSION,
  createCareerSession,
  migrateCareerRunV7ToV8,
  migrateCareerSessionV7ToV8,
  parseCareerRun,
  parseCareerRunV7,
  parseCareerRunV8,
  parseCareerSession,
  parseCareerSessionV7,
  parseCareerSessionV8,
  type CareerRunV7,
  type CareerSessionV7,
} from '../src/index.js';
import { CAREER_RUN_V3_PHASE_FIXTURE_CASES } from './fixtures/career-run-v3.js';

function currentCareer(index = 0): CareerRunV7 {
  const parsed = parseCareerRun(CAREER_RUN_V3_PHASE_FIXTURE_CASES[index]!.career);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.career;
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child);
}

describe('neutral unactivated WR v8 compatibility', () => {
  it.each(
    CAREER_RUN_V3_PHASE_FIXTURE_CASES.map((fixture, index) => [fixture.name, index] as const),
  )(
    'preserves the complete %s career and linked world with marker-only migration',
    (_name, index) => {
      const career = currentCareer(index);
      const session = createCareerSession(career);
      const before = JSON.stringify(session);
      const v8 = migrateCareerRunV7ToV8(career);
      const aggregate = migrateCareerSessionV7ToV8(session);
      expect(v8).toEqual({ ...career, schemaVersion: 8 });
      expect(aggregate).toEqual({ ...session, schemaVersion: 8, career: v8 });
      expect(aggregate.world).toEqual(session.world);
      expect(aggregate.career.phase).toEqual(career.phase);
      expect(aggregate.career.rng).toEqual(career.rng);
      expect(JSON.stringify(session)).toBe(before);
      expect(parseCareerRunV8(JSON.stringify(v8))).toEqual({ ok: true, career: v8 });
      expect(parseCareerSessionV8(JSON.stringify(aggregate))).toEqual({
        ok: true,
        session: aggregate,
      });
      expectDeepFrozen(v8);
      expectDeepFrozen(aggregate);
    },
  );

  it('keeps shipping aliases/readers at v7 and never migrates implicitly or twice', () => {
    const career = currentCareer();
    const session = createCareerSession(career);
    const v8 = migrateCareerRunV7ToV8(career);
    const aggregate = migrateCareerSessionV7ToV8(session);
    expect(CAREER_SCHEMA_VERSION).toBe(7);
    expect(CAREER_SESSION_SCHEMA_VERSION).toBe(7);
    expect(parseCareerRun(career)).toEqual({ ok: true, career });
    expect(parseCareerSession(session)).toEqual({ ok: true, session });
    for (const reader of [parseCareerRun, parseCareerRunV7]) expect(reader(v8).ok).toBe(false);
    for (const reader of [parseCareerSession, parseCareerSessionV7])
      expect(reader(aggregate).ok).toBe(false);
    expect(parseCareerRunV8(career).ok).toBe(false);
    expect(parseCareerSessionV8(session).ok).toBe(false);
    expect(() => migrateCareerRunV7ToV8(v8 as unknown as CareerRunV7)).toThrow('invalid_v7');
    expect(() => migrateCareerSessionV7ToV8(aggregate as unknown as CareerSessionV7)).toThrow(
      'invalid_v7',
    );
  });

  it('detaches mutable parser and migration inputs without freezing them', () => {
    const source = JSON.parse(
      JSON.stringify(createCareerSession(currentCareer())),
    ) as CareerSessionV7;
    const before = JSON.stringify(source);
    const migrated = migrateCareerSessionV7ToV8(source);
    const input = JSON.parse(JSON.stringify(migrated)) as typeof migrated;
    const parsed = parseCareerSessionV8(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.session.career.player).not.toBe(input.career.player);
    expect(parsed.session.world.rng).not.toBe(input.world.rng);
    expect(migrated.career.player).not.toBe(source.career.player);
    expect(Object.isFrozen(source.career.player)).toBe(false);
    expect(Object.isFrozen(input.world.rng)).toBe(false);
    expect(JSON.stringify(source)).toBe(before);
    expectDeepFrozen(parsed);
  });

  it('rejects malformed JSON, future/missing markers, mixed tuples and extra tactical fields', () => {
    const career = migrateCareerRunV7ToV8(currentCareer());
    const session = migrateCareerSessionV7ToV8(createCareerSession(currentCareer()));
    for (const input of [
      null,
      [],
      {},
      '{',
      { ...career, schemaVersion: 9 },
      { ...career, schemaVersion: '8' },
      { ...career, tacticalContext: {} },
      { ...career, phase: { type: 'INVALID' } },
      { ...career, player: { ...career.player, positionId: 'position_qb' } },
    ]) {
      expect(parseCareerRunV8(input).ok).toBe(false);
    }
    for (const input of [
      null,
      [],
      {},
      '{',
      { ...session, schemaVersion: 9 },
      { ...session, schemaVersion: '8' },
      { ...session, career: { ...career, schemaVersion: 7 } },
      { ...session, world: { ...session.world, schemaVersion: 2 } },
      { ...session, tacticalResult: {} },
      { ...session, world: { ...session.world, careerId: 'career_foreign' } },
      { ...session, career: { ...career, rng: { ...career.rng, drawCount: -1 } } },
    ]) {
      expect(parseCareerSessionV8(input).ok).toBe(false);
    }
  });

  it('rejects cyclic inputs without publishing partial state', () => {
    const cyclic: Record<string, unknown> = { schemaVersion: 8 };
    cyclic['self'] = cyclic;
    expect(parseCareerRunV8(cyclic).ok).toBe(false);
    expect(parseCareerSessionV8(cyclic).ok).toBe(false);
    expect(Object.isFrozen(cyclic)).toBe(false);
  });
});
