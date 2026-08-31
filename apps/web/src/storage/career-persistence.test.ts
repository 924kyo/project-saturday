import {
  advanceDevelopmentWeek,
  chooseSkillBreakthrough,
  commitWeeklyActionPlan,
  migrateCareerRunV2ToV3,
  parseCareerRunV1,
  parseCareerRunV2,
  resolveNextWeeklyAction,
  setEquippedSkillSlot,
  type CareerRun,
  type CareerRunV1,
  type CareerRunV2,
  type WeeklyActionId,
  type WeeklyCommandResult,
} from '@project-saturday/game-core';
import {
  developmentWeekConfig,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
} from '@project-saturday/game-content/content';
import { describe, expect, it } from 'vitest';

import { createTestCareer } from '../test/career-fixture';
import {
  CAREER_SNAPSHOT_RETENTION,
  CURRENT_CAREER_SAVE_VERSION,
  CURRENT_CAREER_STORAGE_ID,
  CareerPersistence,
  SHIPPED_CAREER_CONTENT_VERSION,
  canonicalStringify,
  computeSaveChecksum,
  validateCareerSaveEnvelope,
  type SaveChecksumFields,
} from './career-persistence';
import {
  MemoryStorageAdapter,
  type SaveEnvelope,
  type StorageAdapter,
  type StorageEntry,
  type StorageStoreName,
} from './storage';

const CONTENT_VERSION = SHIPPED_CAREER_CONTENT_VERSION;
const PLAN = [
  'action_route_drills',
  'action_recovery',
  'action_study_hall',
] as const satisfies readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId];
const AVAILABLE_ACTIONS = weeklyActionDefinitions.map(({ id }) => id);

function expectTransition(result: WeeklyCommandResult): CareerRun {
  if (!result.ok) {
    throw new Error(`Weekly fixture transition failed: ${result.reason}`);
  }
  return result.career;
}

function nextTransition(career: CareerRun): CareerRun {
  if (career.phase.type === 'PLAN_ACTIONS') {
    return expectTransition(commitWeeklyActionPlan(career, PLAN, AVAILABLE_ACTIONS));
  }
  if (career.phase.type === 'WEEK_END') {
    return expectTransition(advanceDevelopmentWeek(career, developmentWeekConfig));
  }
  if (career.phase.type === 'SKILL_BREAKTHROUGH') {
    throw new Error('Weekly M1 fixture cannot advance a skill breakthrough.');
  }
  const actionId = career.phase.actionIds[career.phase.nextActionIndex];
  const definition = weeklyActionDefinitions.find(({ id }) => id === actionId);
  if (definition === undefined) {
    throw new Error(`Missing weekly fixture definition: ${actionId}`);
  }
  return expectTransition(resolveNextWeeklyAction(career, definition, developmentWeekConfig));
}

function advanceTransitions(career: CareerRun, count: number): CareerRun {
  let current = career;
  for (let index = 0; index < count; index += 1) {
    current = nextTransition(current);
  }
  return current;
}

function advancingClock(start = Date.parse('2026-08-31T00:00:00.000Z')): () => Date {
  let tick = 0;
  return () => {
    const value = new Date(start + tick * 1000);
    tick += 1;
    return value;
  };
}

function mutableEnvelope<T>(envelope: SaveEnvelope<T>): SaveEnvelope<T> {
  return structuredClone(envelope);
}

function resign<T>(envelope: SaveEnvelope<T>): SaveEnvelope<T> {
  const fields: SaveChecksumFields<T> = {
    saveVersion: envelope.saveVersion,
    contentVersion: envelope.contentVersion,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    payload: envelope.payload,
  };
  return { ...envelope, checksum: computeSaveChecksum(fields) };
}

function createLegacyCareerV2(current: CareerRun): CareerRunV2 {
  const legacy = structuredClone(current) as unknown as {
    programContext?: unknown;
    recruitingState?: unknown;
    schemaVersion: number;
    phase: {
      depthUpdate?: unknown;
      results?: Array<{ practiceImpact?: unknown }>;
    };
  };
  legacy.schemaVersion = 2;
  delete legacy.recruitingState;
  delete legacy.programContext;
  delete legacy.phase.depthUpdate;
  for (const result of legacy.phase.results ?? []) {
    delete result.practiceImpact;
  }

  const parsed = parseCareerRunV2(legacy);
  if (!parsed.ok) {
    throw new Error(`Schema-v2 career fixture failed: ${parsed.reason}`);
  }
  return parsed.career;
}

function createLegacyCareer(current: CareerRun): CareerRunV1 {
  const legacy = structuredClone(createLegacyCareerV2(current)) as unknown as {
    lastPassiveBodyRecovery?: unknown;
    schemaVersion: number;
    recentWeeklyActionIds?: unknown;
    phase: {
      results?: Array<{
        appliedSkillEffects?: unknown;
        baseBodyDelta?: unknown;
        baseGpaDelta?: unknown;
        skillEffectAggregates?: unknown;
      }>;
    };
    player: { skillState?: unknown };
  };
  legacy.schemaVersion = 1;
  delete legacy.recentWeeklyActionIds;
  delete legacy.lastPassiveBodyRecovery;
  delete legacy.player.skillState;
  for (const result of legacy.phase.results ?? []) {
    delete result.baseBodyDelta;
    delete result.baseGpaDelta;
    delete result.skillEffectAggregates;
    delete result.appliedSkillEffects;
  }

  const parsed = parseCareerRunV1(legacy);
  if (!parsed.ok) {
    throw new Error(`Legacy career fixture failed: ${parsed.reason}`);
  }
  return parsed.career;
}

function withRevision(career: CareerRun, revision: number): CareerRun {
  const revised = structuredClone(career) as unknown as { revision: number };
  revised.revision = revision;
  return revised as unknown as CareerRun;
}

function createSignedEnvelope<T>(
  payload: T,
  saveVersion: number,
  updatedAt: string,
  createdAt = '2026-08-31T00:00:00.000Z',
  contentVersion = CONTENT_VERSION,
): SaveEnvelope<T> {
  const fields: SaveChecksumFields<T> = {
    saveVersion,
    contentVersion,
    createdAt,
    updatedAt,
    payload,
  };
  return { ...fields, checksum: computeSaveChecksum(fields) };
}

class FaultingStorageAdapter implements StorageAdapter {
  public readonly durability = 'memory' as const;
  public failCurrentGet = false;
  public failSnapshotList = false;
  public failSnapshotPut = false;
  public failCurrentPut = false;
  public failDelete = false;
  public readonly trace: string[] = [];

  public constructor(private readonly delegate: StorageAdapter) {}

  public async get<T>(storeName: StorageStoreName, id: string): Promise<T | undefined> {
    this.trace.push(`get:${storeName}`);
    if (storeName === 'currentCareer' && this.failCurrentGet) {
      throw new Error('current get failed');
    }
    return this.delegate.get<T>(storeName, id);
  }

  public put<T>(storeName: StorageStoreName, id: string, value: T): Promise<void> {
    this.trace.push(`put:${storeName}`);
    if (storeName === 'autosaveSnapshots' && this.failSnapshotPut) {
      return Promise.reject(new Error('snapshot put failed'));
    }
    if (storeName === 'currentCareer' && this.failCurrentPut) {
      return Promise.reject(new Error('current put failed'));
    }
    return this.delegate.put(storeName, id, value);
  }

  public list<T>(storeName: StorageStoreName): Promise<readonly StorageEntry<T>[]> {
    this.trace.push(`list:${storeName}`);
    if (storeName === 'autosaveSnapshots' && this.failSnapshotList) {
      return Promise.reject(new Error('snapshot list failed'));
    }
    return this.delegate.list<T>(storeName);
  }

  public delete(storeName: StorageStoreName, id: string): Promise<void> {
    this.trace.push(`delete:${storeName}`);
    if (this.failDelete) {
      return Promise.reject(new Error('delete failed'));
    }
    return this.delegate.delete(storeName, id);
  }

  public runExclusive<T>(lockName: string, operation: () => Promise<T>): Promise<T> {
    return this.delegate.runExclusive(lockName, operation);
  }

  public close(): Promise<void> {
    return this.delegate.close();
  }
}

describe('canonical save integrity', () => {
  it('sorts keys by code units and hashes Unicode bytes deterministically', () => {
    expect(canonicalStringify({ z: 1, a: '한', nested: { b: false, a: null } })).toBe(
      '{"a":"한","nested":{"a":null,"b":false},"z":1}',
    );

    const first = computeSaveChecksum({
      saveVersion: 1,
      contentVersion: CONTENT_VERSION,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
      payload: { b: 2, a: '한' },
    });
    const reordered = computeSaveChecksum({
      payload: { a: '한', b: 2 },
      updatedAt: '2026-08-31T00:00:00.000Z',
      createdAt: '2026-08-31T00:00:00.000Z',
      contentVersion: CONTENT_VERSION,
      saveVersion: 1,
    });
    expect(first).toBe(reordered);
    expect(first).toBe('fnv1a32:61c819df');
  });

  it('rejects non-JSON numbers, sparse arrays, and cycles', () => {
    expect(() => canonicalStringify(Number.NaN)).toThrow(TypeError);
    expect(() => canonicalStringify(new Array(1))).toThrow(TypeError);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => canonicalStringify(cyclic)).toThrow(TypeError);
  });
});

describe('career save schema migration', () => {
  it.each([
    ['PLAN_ACTIONS', 0],
    ['RESOLVE_ACTIONS', 1],
    ['RESOLVE_ACTIONS', 2],
    ['RESOLVE_ACTIONS', 3],
    ['WEEK_END', 4],
  ])('migrates a checksum-valid v1 %s phase fixture at transition %i', (phaseType, count) => {
    const current = advanceTransitions(createTestCareer(`legacy-phase-${count}`), count);
    expect(current.phase.type).toBe(phaseType);
    const legacy = createLegacyCareer(current);
    const rawEnvelope = createSignedEnvelope(legacy, 1, `2026-08-31T00:00:0${count}.000Z`);

    const validation = validateCareerSaveEnvelope(rawEnvelope, CONTENT_VERSION);
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }
    expect(validation.envelope).toEqual(
      expect.objectContaining({
        saveVersion: CURRENT_CAREER_SAVE_VERSION,
        contentVersion: CONTENT_VERSION,
        createdAt: rawEnvelope.createdAt,
        updatedAt: rawEnvelope.updatedAt,
        payload: expect.objectContaining({
          schemaVersion: 3,
          id: legacy.id,
          revision: legacy.revision,
          rng: legacy.rng,
          phase: expect.objectContaining({ type: legacy.phase.type }),
          programContext: null,
          recruitingState: { type: 'NOT_STARTED' },
        }),
      }),
    );
    expect(createLegacyCareer(validation.envelope.payload)).toEqual(legacy);
    expect(validation.envelope.payload.player.skillState).toEqual({
      acquisitions: [],
      equippedSkillIds: [null, null, null, null],
    });
    expect(validation.envelope.checksum).toBe(
      computeSaveChecksum({
        saveVersion: validation.envelope.saveVersion,
        contentVersion: validation.envelope.contentVersion,
        createdAt: validation.envelope.createdAt,
        updatedAt: validation.envelope.updatedAt,
        payload: validation.envelope.payload,
      }),
    );
  });

  it.each([
    ['PLAN_ACTIONS', 0],
    ['RESOLVE_ACTIONS', 1],
    ['RESOLVE_ACTIONS', 2],
    ['RESOLVE_ACTIONS', 3],
    ['WEEK_END', 4],
  ])('migrates a checksum-valid v2 %s phase fixture exactly at transition %i', (phaseType, count) => {
    const current = advanceTransitions(createTestCareer(`schema-v2-phase-${count}`), count);
    expect(current.phase.type).toBe(phaseType);
    const legacy = createLegacyCareerV2(current);
    const rawEnvelope = createSignedEnvelope(legacy, 2, `2026-08-31T00:01:0${count}.000Z`);

    const validation = validateCareerSaveEnvelope(rawEnvelope, CONTENT_VERSION);
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }
    expect(validation.envelope).toEqual(
      expect.objectContaining({
        saveVersion: CURRENT_CAREER_SAVE_VERSION,
        contentVersion: CONTENT_VERSION,
        createdAt: rawEnvelope.createdAt,
        updatedAt: rawEnvelope.updatedAt,
        payload: migrateCareerRunV2ToV3(legacy),
      }),
    );
  });

  it('migrates a checksum-valid v2 skill breakthrough without changing its pending offer', () => {
    const weekEnd = advanceTransitions(createTestCareer('schema-v2-breakthrough'), 4);
    const breakthrough = expectTransition(
      advanceDevelopmentWeek(
        weekEnd,
        developmentWeekConfig,
        skillMechanicsDefinitions,
        weeklyActionDefinitions,
      ),
    );
    expect(breakthrough.phase.type).toBe('SKILL_BREAKTHROUGH');
    const legacy = createLegacyCareerV2(breakthrough);
    const rawEnvelope = createSignedEnvelope(legacy, 2, '2026-08-31T00:01:05.000Z');

    const validation = validateCareerSaveEnvelope(rawEnvelope, CONTENT_VERSION);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.envelope.payload).toEqual(migrateCareerRunV2ToV3(legacy));
      expect(validation.envelope.payload.phase).toEqual(breakthrough.phase);
    }
  });

  it('accepts only the exact v1, v2, and v3 envelope/career tuples', () => {
    const current = createTestCareer('exact-version-tuples');
    const legacyV2 = createLegacyCareerV2(current);
    const legacyV1 = createLegacyCareer(current);

    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(current, CURRENT_CAREER_SAVE_VERSION, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV2, 2, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV1, 1, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ).ok,
    ).toBe(true);
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV2, CURRENT_CAREER_SAVE_VERSION, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_career_version' });
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(current, 2, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_career_version' });
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(legacyV1, 1, '2026-08-31T00:00:01.000Z', undefined, 'future-content'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.incompatible_content' });
    expect(
      validateCareerSaveEnvelope(
        createSignedEnvelope(current, 4, '2026-08-31T00:00:01.000Z'),
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_save_version' });
  });

  it('checks each original v1/v2 checksum before parsing or chaining migrations', () => {
    const current = createTestCareer('legacy-checksum-first');
    for (const [saveVersion, payload] of [
      [1, createLegacyCareer(current)],
      [2, createLegacyCareerV2(current)],
    ] as const) {
      const rawEnvelope = createSignedEnvelope(
        payload,
        saveVersion,
        `2026-08-31T00:00:0${saveVersion}.000Z`,
      );
      const tampered = structuredClone(rawEnvelope) as unknown as SaveEnvelope<{
        schemaVersion: number;
      }>;
      tampered.payload.schemaVersion = 99;

      expect(validateCareerSaveEnvelope(tampered, CONTENT_VERSION)).toEqual({
        ok: false,
        reason: 'envelope.checksum_mismatch',
      });
    }
  });

  it('ranks and recovers mixed v1/v2/v3 candidates by original timestamps and revisions', async () => {
    const storage = new MemoryStorageAdapter();
    const base = createTestCareer('mixed-ranking');
    const current = withRevision(base, 9);
    const newerV1 = createLegacyCareer(withRevision(base, 3));
    const newestV2 = createLegacyCareerV2(withRevision(base, 5));
    await storage.put(
      'currentCareer',
      CURRENT_CAREER_STORAGE_ID,
      { ...createSignedEnvelope(current, 3, '2026-08-31T00:00:01.000Z'), checksum: 'bad' },
    );
    await storage.put(
      'autosaveSnapshots',
      'newer-v1',
      createSignedEnvelope(newerV1, 1, '2026-08-31T00:00:02.000Z'),
    );
    await storage.put(
      'autosaveSnapshots',
      'newest-v2',
      createSignedEnvelope(newestV2, 2, '2026-08-31T00:00:03.000Z'),
    );
    await storage.put(
      'autosaveSnapshots',
      'older-v3',
      createSignedEnvelope(current, 3, '2026-08-31T00:00:01.500Z'),
    );

    const persistence = new CareerPersistence(storage, { contentVersion: CONTENT_VERSION });
    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        recovered: true,
        career: expect.objectContaining({ schemaVersion: 3, revision: 5 }),
        skippedEntries: [
          {
            id: CURRENT_CAREER_STORAGE_ID,
            reason: 'envelope.invalid_shape',
            store: 'currentCareer',
          },
        ],
      }),
    );

    const tiedV1 = createLegacyCareer(withRevision(base, 10));
    await storage.put(
      'autosaveSnapshots',
      'tied-higher-revision-v1',
      createSignedEnvelope(tiedV1, 1, '2026-08-31T00:00:01.500Z'),
    );
    await storage.delete('autosaveSnapshots', 'newer-v1');
    await storage.delete('autosaveSnapshots', 'newest-v2');
    const tiedLoad = await persistence.loadCareer();
    expect(tiedLoad).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        career: expect.objectContaining({ revision: 10 }),
      }),
    );
  });

  it('does not eagerly rewrite v1/v2 loads and upgrades each on the next committed save', async () => {
    for (const legacyVersion of [1, 2] as const) {
      const memory = new MemoryStorageAdapter();
      const storage = new FaultingStorageAdapter(memory);
      const current = createTestCareer(`lazy-v${legacyVersion}-upgrade`);
      const legacy =
        legacyVersion === 1 ? createLegacyCareer(current) : createLegacyCareerV2(current);
      const rawEnvelope = createSignedEnvelope(
        legacy,
        legacyVersion,
        `2026-08-31T00:00:0${legacyVersion}.000Z`,
        '2026-08-30T00:00:00.000Z',
      );
      await memory.put('currentCareer', CURRENT_CAREER_STORAGE_ID, rawEnvelope);
      const persistence = new CareerPersistence(storage, {
        contentVersion: CONTENT_VERSION,
        now: () => new Date('2026-08-31T00:00:03.000Z'),
      });

      const loaded = await persistence.loadCareer();
      expect(loaded).toEqual(
        expect.objectContaining({
          ok: true,
          source: 'current',
          envelope: expect.objectContaining({ saveVersion: 3 }),
          career: expect.objectContaining({ schemaVersion: 3 }),
        }),
      );
      expect(storage.trace).toEqual(['get:currentCareer', 'list:autosaveSnapshots']);
      expect(await memory.get('currentCareer', CURRENT_CAREER_STORAGE_ID)).toEqual(rawEnvelope);
      if (!loaded.ok) {
        continue;
      }

      const saved = await persistence.saveCareer(withRevision(loaded.career, loaded.career.revision + 1));
      expect(saved).toEqual(
        expect.objectContaining({
          ok: true,
          envelope: expect.objectContaining({
            saveVersion: 3,
            createdAt: rawEnvelope.createdAt,
            payload: expect.objectContaining({ schemaVersion: 3 }),
          }),
        }),
      );
      const upgraded = await memory.get<SaveEnvelope<CareerRun>>(
        'currentCareer',
        CURRENT_CAREER_STORAGE_ID,
      );
      expect(upgraded).toEqual(expect.objectContaining({ saveVersion: 3 }));
      expect(upgraded?.payload.schemaVersion).toBe(3);
    }
  });

  it('counts valid v1/v2/v3 snapshots together for thirty-save retention', async () => {
    const storage = new MemoryStorageAdapter();
    const base = createTestCareer('mixed-retention');
    for (let revision = 0; revision < CAREER_SNAPSHOT_RETENTION; revision += 1) {
      const current = withRevision(base, revision);
      const saveVersion = (revision % 3) + 1;
      const payload =
        saveVersion === 1
          ? createLegacyCareer(current)
          : saveVersion === 2
            ? createLegacyCareerV2(current)
            : current;
      await storage.put(
        'autosaveSnapshots',
        `mixed-${String(revision).padStart(2, '0')}`,
        createSignedEnvelope(
          payload,
          saveVersion,
          `2026-08-31T00:00:${String(revision).padStart(2, '0')}.000Z`,
        ),
      );
    }
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T00:01:00.000Z'),
    });

    const saved = await persistence.saveCareer(withRevision(base, CAREER_SNAPSHOT_RETENTION));
    expect(saved).toEqual(expect.objectContaining({ ok: true, prunedSnapshotCount: 1 }));
    const snapshots =
      await storage.list<SaveEnvelope<CareerRun | CareerRunV1 | CareerRunV2>>(
        'autosaveSnapshots',
      );
    expect(snapshots).toHaveLength(CAREER_SNAPSHOT_RETENTION);
    expect(snapshots.some(({ id }) => id === 'mixed-00')).toBe(false);
    expect(snapshots.filter(({ value }) => value.saveVersion === 1)).toHaveLength(9);
    expect(snapshots.filter(({ value }) => value.saveVersion === 2)).toHaveLength(10);
    expect(snapshots.filter(({ value }) => value.saveVersion === 3)).toHaveLength(11);
  });
});

describe('career persistence', () => {
  it('snapshots caller-owned career data before saveCareer returns', async () => {
    type MutableCareerIdentity = {
      player: { displayName: string };
    };
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const mutableCareer = structuredClone(
      createTestCareer('caller-owned-snapshot'),
    ) as unknown as MutableCareerIdentity;
    const originalDisplayName = mutableCareer.player.displayName;

    const save = persistence.saveCareer(mutableCareer as unknown as CareerRun);
    mutableCareer.player.displayName = 'Mutated after saveCareer';

    expect((await save).ok).toBe(true);
    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(
      expect.objectContaining({
        ok: true,
        career: expect.objectContaining({
          player: expect.objectContaining({
            displayName: originalDisplayName,
          }),
        }),
      }),
    );
  });

  it('writes snapshot before current, preserves timestamps, and reloads a frozen exact career', async () => {
    const memory = new MemoryStorageAdapter();
    const storage = new FaultingStorageAdapter(memory);
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const initial = createTestCareer();

    const savedInitial = await persistence.saveCareer(initial);
    expect(savedInitial.ok).toBe(true);
    expect(storage.trace).toEqual([
      'get:currentCareer',
      'list:autosaveSnapshots',
      'put:autosaveSnapshots',
      'put:currentCareer',
    ]);
    if (!savedInitial.ok) {
      return;
    }
    expect(validateCareerSaveEnvelope(savedInitial.envelope, CONTENT_VERSION).ok).toBe(true);
    expect(savedInitial.envelope.createdAt).toBe('2026-08-31T00:00:00.000Z');

    const next = nextTransition(initial);
    const savedNext = await persistence.saveCareer(next);
    expect(savedNext.ok).toBe(true);
    if (!savedNext.ok) {
      return;
    }
    expect(savedNext.envelope.createdAt).toBe(savedInitial.envelope.createdAt);
    expect(savedNext.envelope.updatedAt).toBe('2026-08-31T00:00:01.000Z');

    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'current',
        recovered: false,
        career: next,
      }),
    );
    if (loaded.ok) {
      expect(Object.isFrozen(loaded.career)).toBe(true);
      expect(Object.isFrozen(loaded.career.phase)).toBe(true);
      expect(loaded.career.rng).toEqual(next.rng);
    }
  });

  it('round-trips every resumable development phase including queue, index, results, and RNG', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    let career = createTestCareer('phase-round-trip');
    const expectedPhases = [
      'PLAN_ACTIONS',
      'RESOLVE_ACTIONS',
      'RESOLVE_ACTIONS',
      'RESOLVE_ACTIONS',
      'WEEK_END',
      'PLAN_ACTIONS',
    ] as const;

    for (const [index, expectedPhase] of expectedPhases.entries()) {
      expect(career.phase.type).toBe(expectedPhase);
      const saved = await persistence.saveCareer(career);
      expect(saved.ok).toBe(true);
      const loaded = await persistence.loadCareer();
      expect(loaded.ok).toBe(true);
      if (loaded.ok) {
        expect(loaded.career).toEqual(career);
        expect(loaded.career.rng).toEqual(career.rng);
        expect(loaded.career.phase).toEqual(career.phase);
      }
      if (index < expectedPhases.length - 1) {
        career = nextTransition(career);
      }
    }
  });

  it('round-trips an exact pending breakthrough, choice, and planning loadout commands', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    let career = advanceTransitions(createTestCareer('skill-phase-round-trip'), 4);
    if (career.phase.type !== 'WEEK_END') {
      throw new Error('Expected a completed development week.');
    }
    const advanced = advanceDevelopmentWeek(
      career,
      developmentWeekConfig,
      skillMechanicsDefinitions,
      weeklyActionDefinitions,
    );
    if (!advanced.ok || advanced.career.phase.type !== 'SKILL_BREAKTHROUGH') {
      throw new Error(advanced.ok ? 'Expected a pending breakthrough.' : advanced.reason);
    }
    career = advanced.career;
    if (career.phase.type !== 'SKILL_BREAKTHROUGH') {
      throw new Error('Expected a narrowed pending breakthrough.');
    }
    const pendingRng = career.rng;
    const pendingOffer = career.phase.offer;

    expect((await persistence.saveCareer(career)).ok).toBe(true);
    const loadedOffer = await persistence.loadCareer();
    expect(loadedOffer.ok).toBe(true);
    if (!loadedOffer.ok || loadedOffer.career.phase.type !== 'SKILL_BREAKTHROUGH') {
      return;
    }
    expect(loadedOffer.career.phase.offer).toEqual(pendingOffer);
    expect(loadedOffer.career.rng).toEqual(pendingRng);

    const selectedSkillId = loadedOffer.career.phase.offer.offeredSkillIds[0];
    const chosen = chooseSkillBreakthrough(loadedOffer.career, selectedSkillId);
    if (!chosen.ok) {
      throw new Error(chosen.reason);
    }
    expect(chosen.career.rng).toEqual(pendingRng);
    expect((await persistence.saveCareer(chosen.career)).ok).toBe(true);
    const loadedChoice = await persistence.loadCareer();
    expect(loadedChoice.ok).toBe(true);
    if (!loadedChoice.ok) {
      return;
    }
    expect(loadedChoice.career).toEqual(chosen.career);
    expect(loadedChoice.career.player.skillState.equippedSkillIds).toEqual([
      selectedSkillId,
      null,
      null,
      null,
    ]);

    const cleared = setEquippedSkillSlot(loadedChoice.career, 0, null);
    if (!cleared.ok) {
      throw new Error(cleared.reason);
    }
    const moved = setEquippedSkillSlot(cleared.career, 2, selectedSkillId);
    if (!moved.ok) {
      throw new Error(moved.reason);
    }
    expect((await persistence.saveCareer(moved.career)).ok).toBe(true);
    const loadedLoadout = await persistence.loadCareer();
    expect(loadedLoadout.ok).toBe(true);
    if (loadedLoadout.ok) {
      expect(loadedLoadout.career).toEqual(moved.career);
      expect(loadedLoadout.career.rng).toEqual(pendingRng);
      expect(loadedLoadout.career.player.skillState.equippedSkillIds).toEqual([
        null,
        null,
        selectedSkillId,
        null,
      ]);
    }
  });

  it('continues identically after a mid-resolution save and reload', async () => {
    const uninterruptedStart = advanceTransitions(createTestCareer('reload-equivalence'), 2);
    const reloadStart = advanceTransitions(createTestCareer('reload-equivalence'), 2);
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    expect((await persistence.saveCareer(reloadStart)).ok).toBe(true);
    const loaded = await persistence.loadCareer();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    const uninterruptedFinal = advanceTransitions(uninterruptedStart, 3);
    const reloadedFinal = advanceTransitions(loaded.career, 3);
    expect(reloadedFinal).toEqual(uninterruptedFinal);
    expect(reloadedFinal.rng).toEqual(uninterruptedFinal.rng);
  });

  it('selects a newer valid snapshot when current is corrupt or an interrupted current write is older', async () => {
    const memory = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(memory, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const initial = createTestCareer('snapshot-recovery');
    const next = nextTransition(initial);
    expect((await persistence.saveCareer(initial)).ok).toBe(true);
    const nextSave = await persistence.saveCareer(next);
    expect(nextSave.ok).toBe(true);

    const current = await memory.get<SaveEnvelope<CareerRun>>(
      'currentCareer',
      CURRENT_CAREER_STORAGE_ID,
    );
    expect(current).toBeDefined();
    if (current === undefined) {
      return;
    }
    await memory.put('currentCareer', CURRENT_CAREER_STORAGE_ID, {
      ...current,
      checksum: 'fnv1a32:00000000',
    });
    await memory.put('autosaveSnapshots', 'future-corrupt', {
      ...current,
      updatedAt: '2099-01-01T00:00:00.000Z',
    });

    const recoveredCorruption = await persistence.loadCareer();
    expect(recoveredCorruption).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        recovered: true,
        career: next,
        skippedEntries: expect.arrayContaining([
          expect.objectContaining({ reason: 'envelope.checksum_mismatch' }),
        ]),
      }),
    );

    const third = nextTransition(next);
    const faulting = new FaultingStorageAdapter(memory);
    faulting.failCurrentPut = true;
    const interrupted = await new CareerPersistence(faulting, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T00:00:10.000Z'),
    }).saveCareer(third);
    expect(interrupted).toEqual({
      ok: false,
      reason: 'career_save.storage_error',
      stage: 'write_current',
    });
    const recoveredInterruptedWrite = await persistence.loadCareer();
    expect(recoveredInterruptedWrite).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        career: third,
      }),
    );
    expect(await persistence.saveCareer(next)).toEqual({
      ok: false,
      reason: 'career_save.stale_revision',
    });
  });

  it('recovers an interrupted replacement and ranks cross-career snapshots by global save time', async () => {
    const memory = new MemoryStorageAdapter();
    const firstCareer = withRevision(createTestCareer('long-first-career'), 20);
    const secondCareer = nextTransition(createTestCareer('short-second-career'));
    const firstPersistence = new CareerPersistence(memory, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T05:00:00.000Z'),
    });
    expect((await firstPersistence.saveCareer(firstCareer)).ok).toBe(true);

    const interruptedStorage = new FaultingStorageAdapter(memory);
    interruptedStorage.failCurrentPut = true;
    const replacement = await new CareerPersistence(interruptedStorage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T04:00:00.000Z'),
    }).replaceCurrentCareer(secondCareer);
    expect(replacement).toEqual({
      ok: false,
      reason: 'career_save.storage_error',
      stage: 'write_current',
    });

    const recoveredWithOldCurrent = await firstPersistence.loadCareer();
    expect(recoveredWithOldCurrent).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        career: secondCareer,
      }),
    );
    if (recoveredWithOldCurrent.ok) {
      expect(recoveredWithOldCurrent.envelope.updatedAt).toBe('2026-08-31T05:00:00.001Z');
    }

    await memory.delete('currentCareer', CURRENT_CAREER_STORAGE_ID);
    const recoveredWithoutCurrent = await firstPersistence.loadCareer();
    expect(recoveredWithoutCurrent).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        career: secondCareer,
      }),
    );
    expect(firstCareer.revision).toBeGreaterThan(secondCareer.revision);
  });

  it('clamps clock rollback to a monotonic global save timestamp', async () => {
    const storage = new MemoryStorageAdapter();
    const initial = createTestCareer('clock-rollback');
    const firstPersistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T10:00:00.000Z'),
    });
    const firstSave = await firstPersistence.saveCareer(initial);
    expect(firstSave.ok).toBe(true);
    if (!firstSave.ok) {
      return;
    }

    const rollbackPersistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T09:00:00.000Z'),
    });
    const secondSave = await rollbackPersistence.saveCareer(nextTransition(initial));
    expect(secondSave.ok).toBe(true);
    if (!secondSave.ok) {
      return;
    }
    expect(secondSave.envelope.createdAt).toBe(firstSave.envelope.createdAt);
    expect(secondSave.envelope.updatedAt).toBe('2026-08-31T10:00:00.001Z');
    expect(validateCareerSaveEnvelope(secondSave.envelope, CONTENT_VERSION).ok).toBe(true);

    const thirdSave = await rollbackPersistence.saveCareer(advanceTransitions(initial, 2));
    expect(thirdSave).toEqual(
      expect.objectContaining({
        ok: true,
        envelope: expect.objectContaining({ updatedAt: '2026-08-31T10:00:00.002Z' }),
      }),
    );
  });

  it('uses deterministic envelope failure ordering and never accepts mismatched data', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const saved = await persistence.saveCareer(createTestCareer('envelope-validation'));
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    const valid = saved.envelope;

    expect(
      validateCareerSaveEnvelope(
        { ...valid, saveVersion: 4, contentVersion: 'wrong', checksum: 'broken' },
        CONTENT_VERSION,
      ),
    ).toEqual({ ok: false, reason: 'envelope.unsupported_save_version' });
    expect(
      validateCareerSaveEnvelope({ ...valid, contentVersion: 'wrong' }, CONTENT_VERSION),
    ).toEqual({ ok: false, reason: 'envelope.incompatible_content' });
    expect(
      validateCareerSaveEnvelope({ ...valid, updatedAt: 'not-a-time' }, CONTENT_VERSION),
    ).toEqual({ ok: false, reason: 'envelope.invalid_timestamp' });
    expect(
      validateCareerSaveEnvelope({ ...valid, checksum: 'fnv1a32:00000000' }, CONTENT_VERSION),
    ).toEqual({ ok: false, reason: 'envelope.checksum_mismatch' });
    expect(validateCareerSaveEnvelope({ ...valid, extra: true }, CONTENT_VERSION)).toEqual({
      ok: false,
      reason: 'envelope.invalid_shape',
    });

    const unsupportedCareer = mutableEnvelope(valid) as unknown as SaveEnvelope<{
      schemaVersion: number;
    }>;
    unsupportedCareer.payload.schemaVersion = 4;
    expect(validateCareerSaveEnvelope(resign(unsupportedCareer), CONTENT_VERSION)).toEqual({
      ok: false,
      reason: 'envelope.unsupported_career_version',
    });

    const invalidCareer = mutableEnvelope(valid);
    const mutablePayload = invalidCareer.payload as unknown as {
      player: { state: { body: number } };
    };
    mutablePayload.player.state.body = 101;
    expect(validateCareerSaveEnvelope(resign(invalidCareer), CONTENT_VERSION)).toEqual({
      ok: false,
      reason: 'envelope.invalid_career',
    });
  });

  it('captures accessor-backed envelopes exactly once before checksum and payload validation', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const saved = await persistence.saveCareer(createTestCareer('envelope-accessor'));
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }

    const accessorEnvelope = { ...saved.envelope } as Record<string, unknown>;
    let payloadReads = 0;
    Object.defineProperty(accessorEnvelope, 'payload', {
      enumerable: true,
      get: () => {
        payloadReads += 1;
        return payloadReads === 1 ? saved.envelope.payload : { schemaVersion: 99 };
      },
    });
    expect(validateCareerSaveEnvelope(accessorEnvelope, CONTENT_VERSION).ok).toBe(true);
    expect(payloadReads).toBe(1);
  });

  it('keeps exactly thirty newest snapshots', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const career = createTestCareer('retention');
    let lastResult;
    for (let index = 0; index <= CAREER_SNAPSHOT_RETENTION; index += 1) {
      lastResult = await persistence.saveCareer(withRevision(career, index));
      expect(lastResult.ok).toBe(true);
    }

    const snapshots = await storage.list('autosaveSnapshots');
    expect(snapshots).toHaveLength(CAREER_SNAPSHOT_RETENTION);
    expect(lastResult).toEqual(expect.objectContaining({ ok: true, prunedSnapshotCount: 1 }));
    const revisions = snapshots
      .map(({ value }) => (value as SaveEnvelope<CareerRun>).payload.revision)
      .sort((left, right) => left - right);
    expect(revisions[0]).toBe(1);
    expect(revisions.at(-1)).toBe(CAREER_SNAPSHOT_RETENTION);
  });

  it('deletes corrupt snapshots before retention and preserves protected future snapshots outside the limit', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const career = createTestCareer('classified-retention');
    const first = await persistence.saveCareer(career);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    await storage.put('autosaveSnapshots', 'corrupt-future-time', {
      ...first.envelope,
      updatedAt: '2099-01-01T00:00:00.000Z',
    });
    await storage.put('autosaveSnapshots', 'protected-future-content', {
      ...first.envelope,
      contentVersion: 'future-content',
    });

    for (let index = 0; index < CAREER_SNAPSHOT_RETENTION; index += 1) {
      expect((await persistence.saveCareer(withRevision(career, index + 1))).ok).toBe(true);
    }

    const entries = await storage.list('autosaveSnapshots');
    expect(entries.some(({ id }) => id === 'corrupt-future-time')).toBe(false);
    expect(entries.some(({ id }) => id === 'protected-future-content')).toBe(true);
    const compatibleValid = entries.filter(
      ({ value }) => validateCareerSaveEnvelope(value, CONTENT_VERSION).ok,
    );
    expect(compatibleValid).toHaveLength(CAREER_SNAPSHOT_RETENTION);
    expect(entries).toHaveLength(CAREER_SNAPSHOT_RETENTION + 1);
  });

  it('serializes concurrent saves and rejects stale or conflicting revisions', async () => {
    const persistence = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    const revisionZero = createTestCareer('save-order');
    const revisionOne = nextTransition(revisionZero);
    const revisionTwo = nextTransition(revisionOne);
    const concurrent = await Promise.all([
      persistence.saveCareer(revisionZero),
      persistence.saveCareer(revisionOne),
      persistence.saveCareer(revisionTwo),
    ]);
    expect(concurrent.every(({ ok }) => ok)).toBe(true);
    const loaded = await persistence.loadCareer();
    expect(loaded).toEqual(expect.objectContaining({ ok: true, career: revisionTwo }));

    expect(await persistence.saveCareer(revisionOne)).toEqual({
      ok: false,
      reason: 'career_save.stale_revision',
    });
    const conflicting = structuredClone(revisionTwo) as {
      player: { displayName: string };
    } & CareerRun;
    conflicting.player.displayName = '다른 Player';
    expect(await persistence.saveCareer(conflicting)).toEqual({
      ok: false,
      reason: 'career_save.conflicting_revision',
    });
  });

  it('serializes separate persistence instances against the same storage lock', async () => {
    const storage = new MemoryStorageAdapter();
    const initial = createTestCareer('cross-instance-lock');
    const setup = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    expect((await setup.saveCareer(initial)).ok).toBe(true);

    const firstBranch = expectTransition(commitWeeklyActionPlan(initial, PLAN, AVAILABLE_ACTIONS));
    const secondPlan = ['action_speed_work', 'action_film_study', 'action_recovery'] as const;
    const secondBranch = expectTransition(
      commitWeeklyActionPlan(initial, secondPlan, AVAILABLE_ACTIONS),
    );
    const firstInstance = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T02:00:00.000Z'),
    });
    const secondInstance = new CareerPersistence(storage, {
      contentVersion: CONTENT_VERSION,
      now: () => new Date('2026-08-31T02:00:00.000Z'),
    });
    const results = await Promise.all([
      firstInstance.saveCareer(firstBranch),
      secondInstance.saveCareer(secondBranch),
    ]);

    expect(results.filter(({ ok }) => ok)).toHaveLength(1);
    expect(results).toContainEqual({
      ok: false,
      reason: 'career_save.conflicting_revision',
    });
    const loaded = await setup.loadCareer();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect([firstBranch, secondBranch]).toContainEqual(loaded.career);
    }
  });

  it('protects future/content-incompatible current data unless replacement is explicit', async () => {
    for (const protectedEnvelope of [
      (valid: SaveEnvelope<CareerRun>) => ({ ...valid, saveVersion: 4 }),
      (valid: SaveEnvelope<CareerRun>) => ({ ...valid, contentVersion: 'future-content' }),
      (valid: SaveEnvelope<CareerRun>) => {
        const futureCareer = mutableEnvelope(valid) as unknown as SaveEnvelope<{
          schemaVersion: number;
        }>;
        futureCareer.payload.schemaVersion = 4;
        return resign(futureCareer);
      },
    ]) {
      const storage = new MemoryStorageAdapter();
      const initial = createTestCareer('protected-current');
      const persistence = new CareerPersistence(storage, {
        contentVersion: CONTENT_VERSION,
        now: advancingClock(),
      });
      const saved = await persistence.saveCareer(initial);
      expect(saved.ok).toBe(true);
      if (!saved.ok) {
        continue;
      }
      await storage.put(
        'currentCareer',
        CURRENT_CAREER_STORAGE_ID,
        protectedEnvelope(saved.envelope),
      );
      const next = nextTransition(initial);
      expect(await persistence.saveCareer(next)).toEqual({
        ok: false,
        reason: 'career_save.protected_existing_save',
      });
      expect((await persistence.replaceCurrentCareer(next)).ok).toBe(true);
      expect((await persistence.loadCareer()).ok).toBe(true);
    }
  });

  it('reports storage stages, retains recoverable snapshots, and degrades reads explicitly', async () => {
    const memory = new MemoryStorageAdapter();
    const first = createTestCareer('storage-failures');
    const second = nextTransition(first);
    const basePersistence = new CareerPersistence(memory, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(),
    });
    expect((await basePersistence.saveCareer(first)).ok).toBe(true);

    const snapshotFailure = new FaultingStorageAdapter(memory);
    snapshotFailure.failSnapshotPut = true;
    expect(
      await new CareerPersistence(snapshotFailure, {
        contentVersion: CONTENT_VERSION,
        now: advancingClock(),
      }).saveCareer(second),
    ).toEqual({
      ok: false,
      reason: 'career_save.storage_error',
      stage: 'write_snapshot',
    });

    await memory.put('autosaveSnapshots', 'corrupt-retention-entry', { broken: true });
    const retentionFailure = new FaultingStorageAdapter(memory);
    retentionFailure.failDelete = true;
    const retained = await new CareerPersistence(retentionFailure, {
      contentVersion: CONTENT_VERSION,
      now: advancingClock(Date.parse('2026-08-31T01:00:00.000Z')),
    }).saveCareer(second);
    expect(retained).toEqual(expect.objectContaining({ ok: true, retentionWarning: true }));

    const currentUnavailable = new FaultingStorageAdapter(memory);
    currentUnavailable.failCurrentGet = true;
    const snapshotLoad = await new CareerPersistence(currentUnavailable, {
      contentVersion: CONTENT_VERSION,
    }).loadCareer();
    expect(snapshotLoad).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'snapshot',
        warnings: ['career_load.current_unavailable'],
      }),
    );

    const snapshotsUnavailable = new FaultingStorageAdapter(memory);
    snapshotsUnavailable.failSnapshotList = true;
    const currentLoad = await new CareerPersistence(snapshotsUnavailable, {
      contentVersion: CONTENT_VERSION,
    }).loadCareer();
    expect(currentLoad).toEqual(
      expect.objectContaining({
        ok: true,
        source: 'current',
        warnings: ['career_load.snapshots_unavailable'],
      }),
    );
  });

  it('distinguishes empty storage from invalid-only storage and rejects invalid saves', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new CareerPersistence(storage, { contentVersion: CONTENT_VERSION });
    expect(await persistence.loadCareer()).toEqual({
      ok: false,
      reason: 'career_load.not_found',
      skippedEntries: [],
      warnings: [],
    });

    await storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, { saveVersion: 99 });
    expect(await persistence.loadCareer()).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'career_load.no_valid_save',
        skippedEntries: [
          {
            id: CURRENT_CAREER_STORAGE_ID,
            store: 'currentCareer',
            reason: 'envelope.invalid_shape',
          },
        ],
      }),
    );

    const invalid = structuredClone(createTestCareer('invalid-save')) as {
      player: { state: { body: number } };
    } & CareerRun;
    invalid.player.state.body = 101;
    expect(await persistence.saveCareer(invalid)).toEqual({
      ok: false,
      reason: 'career_save.invalid_career',
    });
    expect(await storage.list('autosaveSnapshots')).toHaveLength(0);
  });

  it('returns a stable failure when the injected clock throws or is invalid', async () => {
    const career = createTestCareer('clock-failure');
    const throwingClock = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: () => {
        throw new Error('clock failed');
      },
    });
    expect(await throwingClock.saveCareer(career)).toEqual({
      ok: false,
      reason: 'career_save.invalid_clock',
    });

    const invalidClock = new CareerPersistence(new MemoryStorageAdapter(), {
      contentVersion: CONTENT_VERSION,
      now: () => new Date(Number.NaN),
    });
    expect(await invalidClock.saveCareer(career)).toEqual({
      ok: false,
      reason: 'career_save.invalid_clock',
    });
  });
});
