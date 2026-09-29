import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  advancePositionAlphaGameDayV2,
  commitPositionAlphaFocusPlanV2,
  type PositionAlphaSessionV2,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  parseShippedPositionAlphaSessionV2Json,
} from '@project-saturday/game-content';
import { createCompletedPositionAlphaFixture } from '../test/position-alpha-fixture';
import { computeSaveChecksum } from './career-persistence';
import { CareerManagementConflict, CareerManagementPersistence } from './career-management';
import {
  ACTIVE_CAREER_KIND_STORAGE_ID,
  POSITION_ALPHA_STORAGE_ID,
  POSITION_ALUMNI_STORAGE_PREFIX,
  PositionAlphaPersistence,
  validatePositionAlphaEnvelope,
} from './position-alpha-persistence';
import {
  PositionAlphaPersistenceV2,
  decodePositionAlphaEnvelopeV2,
} from './position-alpha-persistence-v2';
import * as currentEnvelopeReader from './position-alpha-persistence-v2';
import {
  IndexedDbStorageAdapter,
  MemoryStorageAdapter,
  STORAGE_STORE_NAMES,
  type SaveEnvelope,
  type StorageAdapter,
} from './storage';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;
const now = () => new Date('2026-09-14T00:00:00.000Z');
const databases: string[] = [];
const adapters: StorageAdapter[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const adapter of adapters.splice(0)) await adapter.close();
  for (const name of databases.splice(0)) await deleteDB(name);
});

describe('version-aware Career Hub protection', () => {
  it.each(CASES.map((position) => ({ position })))(
    '$position does not replay nonterminal rolling snapshots when looking for completion proofs',
    async ({ position }) => {
      const storage = new MemoryStorageAdapter();
      const { current } = fixture(position);
      const saved = await new PositionAlphaPersistenceV2(storage, { now }).saveSession(
        current,
        true,
      );
      if (!saved.ok) throw new Error(saved.reason);
      await storage.putMany(
        Array.from({ length: 30 }, (_, index) => ({
          storeName: 'autosaveSnapshots' as const,
          id: `position-alpha:${current.lifecycle.careerId}:${index}`,
          value: saved.envelope,
        })),
      );
      await storage.put('profile', 'unrelated-history', { retained: true });
      const read = vi.spyOn(currentEnvelopeReader, 'decodePositionAlphaEnvelopeV2');
      const hub = new CareerManagementPersistence(storage);
      expect(await hub.retireCurrentCareer(await hub.checkpoint())).toEqual({ ok: true });
      expect(read).not.toHaveBeenCalled();
      expect(await storage.list('autosaveSnapshots')).toEqual([]);
      expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toBeUndefined();
      expect(await storage.get('profile', 'unrelated-history')).toEqual({ retained: true });
    },
  );

  it.each(CASES.map((position) => ({ position })))(
    '$position retires recovered current wire without resurrection and permits an explicit new run',
    async ({ position }) => {
      const storage = new MemoryStorageAdapter();
      const persistence = new PositionAlphaPersistenceV2(storage, { now });
      const hub = new CareerManagementPersistence(storage);
      const { current, mechanics } = fixture(position);
      const first = await persistence.saveSession(current, true);
      if (!first.ok) throw new Error(first.reason);
      const focus = commitPositionAlphaFocusPlanV2(
        current,
        ['action_recovery', 'action_film_study', 'action_study_hall'],
        mechanics,
      );
      if (!focus.ok) throw new Error(focus.reason);
      const next = await persistence.saveSession(focus.session);
      if (!next.ok) throw new Error(next.reason);
      const expected = { careerId: current.lifecycle.careerId };
      await expect(hub.checkpoint(expected)).resolves.toBeDefined();
      await expect(hub.checkpoint({ careerId: 'another-athlete' })).rejects.toBeInstanceOf(
        CareerManagementConflict,
      );
      await storage.put('currentCareer', POSITION_ALPHA_STORAGE_ID, {
        ...next.envelope,
        checksum: 'corrupt',
      });
      expect(await persistence.loadSession()).toMatchObject({
        ok: true,
        recovered: true,
        session: current,
      });
      await expect(hub.checkpoint(expected)).resolves.toBeDefined();
      await storage.delete('currentCareer', POSITION_ALPHA_STORAGE_ID);
      await expect(hub.checkpoint(expected)).resolves.toBeDefined();
      await storage.put('settings', 'locale', 'ko-KR');
      await storage.put('profile', 'unrelated-history', { alumni: ['prior'] });
      const profile = await storage.list('profile');
      const stale = await hub.checkpoint(expected);
      await storage.put('settings', 'locale', 'en-US');
      expect(await hub.retireCurrentCareer(stale)).toEqual({
        ok: false,
        reason: 'changed_since_confirmation',
      });
      const checkpoint = await hub.checkpoint(expected);
      const before = await storage.list('autosaveSnapshots');
      vi.spyOn(storage, 'putMany').mockRejectedValueOnce(new Error('aborted'));
      expect(await hub.retireCurrentCareer(checkpoint)).toEqual({
        ok: false,
        reason: 'storage_error',
      });
      expect(await storage.list('autosaveSnapshots')).toEqual(before);
      expect(await hub.retireCurrentCareer(checkpoint)).toEqual({ ok: true });
      expect(await persistence.loadSession()).toEqual({
        ok: false,
        reason: 'position_alpha_load.not_found',
      });
      expect(await persistence.saveSession(focus.session)).toEqual({
        ok: false,
        reason: 'position_alpha_save.different_career',
      });
      expect(await storage.list('profile')).toEqual(profile);
      expect(await storage.get('settings', 'locale')).toBe('en-US');
      expect((await persistence.saveSession(current, true)).ok).toBe(true);
      expect(await storage.list('profile')).toEqual(profile);
    },
  );

  it.each(CASES)(
    '%s protects mixed-version completion proofs and backfills the exact current wire',
    async (positionId, archetypeId) => {
      const storage = new MemoryStorageAdapter();
      const hub = new CareerManagementPersistence(storage);
      const { completed } = createCompletedPositionAlphaFixture(positionId, archetypeId);
      const legacy = await new PositionAlphaPersistence(storage, { now }).saveSession(
        completed,
        true,
      );
      if (!legacy.ok) throw new Error(legacy.reason);
      const migrated = parseShippedPositionAlphaSessionV2Json(JSON.stringify(completed))!;
      const persistence = new PositionAlphaPersistenceV2(storage, { now });
      const current = await persistence.saveSession(migrated, true);
      if (!current.ok) throw new Error(current.reason);
      const id = `${POSITION_ALUMNI_STORAGE_PREFIX}${completed.lifecycle.careerId}`;
      expect(await hub.loadPositionAlumniV2()).toEqual({
        completedSessions: [{ session: migrated, envelope: legacy.envelope }],
        invalidEntryCount: 0,
      });
      expect(
        await hub.retireCurrentCareer(
          await hub.checkpoint({ careerId: completed.lifecycle.careerId }),
        ),
      ).toEqual({ ok: true });
      expect(await storage.get('profile', id)).toEqual(legacy.envelope);
      expect((await persistence.saveSession(migrated, true)).ok).toBe(true);
      // A corrupt existing proof must not be replaced or erased by retirement.
      await storage.put('profile', id, { ...legacy.envelope, checksum: 'corrupt' });
      const dump = () =>
        Promise.all(STORAGE_STORE_NAMES.map(async (store) => [store, await storage.list(store)]));
      const before = await dump();
      expect(await hub.retireCurrentCareer(await hub.checkpoint())).toEqual({
        ok: false,
        reason: 'protected_history',
      });
      expect(await dump()).toEqual(before);
      expect((await hub.loadPositionAlumniV2()).invalidEntryCount).toBe(1);
      await storage.delete('profile', id);
      const proof = await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID);
      expect(await hub.retireCurrentCareer(await hub.checkpoint())).toEqual({ ok: true });
      expect(await storage.get('profile', id)).toEqual(proof);
      expect((await hub.loadPositionAlumniV2()).completedSessions[0]?.session).toEqual(migrated);
      expect(await hub.retireCurrentCareer(await hub.checkpoint({ careerId: null }))).toEqual({
        ok: true,
      });
      expect(await storage.get('profile', id)).toEqual(proof);
      // Profile keys must match the completed career, even for a valid wire payload.
      await storage.put('profile', `${id}-wrong`, proof);
      expect((await hub.loadPositionAlumniV2()).invalidEntryCount).toBe(1);
    },
  );
});

function fixture([positionId, archetypeId]: (typeof CASES)[number]) {
  const identity = {
    displayName: '저장 / Persistence',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer' as const,
    personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  };
  const created = createShippedPositionAlphaSession({
    careerSeed: `v2-persistence-${positionId}`,
    programId: 'program_prairie_forge',
    identity,
  });
  if (!created.ok) throw new Error(created.reason);
  return {
    historical: created.session,
    mechanics: buildShippedPositionAlphaSessionCommandMechanics({ identity })!,
    current: parseShippedPositionAlphaSessionV2Json(JSON.stringify(created.session))!,
  };
}

function resign(envelope: SaveEnvelope<unknown>): SaveEnvelope<unknown> {
  const { saveVersion, contentVersion, createdAt, updatedAt, payload } = envelope;
  const fields = { saveVersion, contentVersion, createdAt, updatedAt, payload };
  return { ...fields, checksum: computeSaveChecksum(fields) };
}

describe('explicit current position persistence codec', () => {
  it('keeps pruning inside the save transaction and retries an identical unpublished payload', async () => {
    const name = 'saturday-v2-pruning-rollback';
    const storage = new IndexedDbStorageAdapter(name);
    databases.push(name);
    adapters.push(storage);
    const { current, mechanics } = fixture(CASES[0]);
    const persistence = new PositionAlphaPersistenceV2(storage, { now });
    const saved = await persistence.saveSession(current, true);
    if (!saved.ok) throw new Error(saved.reason);
    await storage.putMany([
      ...Array.from({ length: 30 }, (_, index) => ({
        storeName: 'autosaveSnapshots' as const,
        id: `position-alpha:${current.lifecycle.careerId}:000000:2020-${String(index).padStart(3, '0')}`,
        value: saved.envelope,
      })),
      { storeName: 'autosaveSnapshots', id: 'another-career', value: { retained: true } },
    ]);
    const before = await storage.list('autosaveSnapshots');
    const focused = commitPositionAlphaFocusPlanV2(
      current,
      ['action_film_study', 'action_recovery', 'action_study_hall'],
      mechanics,
    );
    if (!focused.ok) throw new Error(focused.reason);
    vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementationOnce(() => {
      throw new DOMException('Injected pruning failure', 'AbortError');
    });
    expect(await persistence.saveSession(focused.session)).toEqual({
      ok: false,
      reason: 'position_alpha_save.storage_error',
    });
    expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toEqual(saved.envelope);
    expect(await storage.list('autosaveSnapshots')).toEqual(before);
    const retried = await persistence.saveSession(focused.session);
    expect(retried.ok).toBe(true);
    expect(await persistence.loadSession()).toMatchObject({ ok: true, session: focused.session });
    const after = await storage.list('autosaveSnapshots');
    expect(after.filter(({ id }) => id.startsWith('position-alpha:'))).toHaveLength(30);
    expect(await storage.get('autosaveSnapshots', 'another-career')).toEqual({ retained: true });
  });

  it.each(
    CASES.flatMap((position) =>
      (['memory', 'indexed-db'] as const).map((kind) => ({ position, kind })),
    ),
  )(
    '$position / $kind preserves v1 bytes, migrates without writes and recovers mixed-version snapshots',
    async ({ position, kind }) => {
      const name = `saturday-v2-codec-${position[0]}`;
      const storage =
        kind === 'memory' ? new MemoryStorageAdapter() : new IndexedDbStorageAdapter(name);
      if (kind === 'indexed-db') databases.push(name);
      adapters.push(storage);
      const { historical, current, mechanics } = fixture(position);
      const legacy = new PositionAlphaPersistence(storage, { now });
      const first = await legacy.saveSession(historical, true);
      if (!first.ok) throw new Error(first.reason);
      const persistence = new PositionAlphaPersistenceV2(storage, { now });
      const loaded = await persistence.loadSession();
      expect(loaded).toMatchObject({
        ok: true,
        source: 'current',
        recovered: false,
        session: current,
        envelope: first.envelope,
      });
      expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toEqual(first.envelope);
      expect(await storage.list('autosaveSnapshots')).toEqual([]);
      const focus = commitPositionAlphaFocusPlanV2(
        current,
        ['action_recovery', 'action_film_study', 'action_study_hall'],
        mechanics,
      );
      if (!focus.ok) throw new Error(focus.reason);
      const saved = await persistence.saveSession(focus.session);
      if (!saved.ok) throw new Error(saved.reason);
      expect(saved.envelope).toMatchObject({
        saveVersion: 2,
        createdAt: first.envelope.createdAt,
        payload: { model: 'position_alpha_session_wire_v2' },
      });
      expect(validatePositionAlphaEnvelope(saved.envelope)).toBeNull();
      expect(decodePositionAlphaEnvelopeV2(saved.envelope)?.session).toEqual(focus.session);
      expect(await legacy.saveSession(historical, true)).toEqual({
        ok: false,
        reason: 'position_alpha_save.conflicting_revision',
      });
      expect(await persistence.saveSession(current)).toEqual({
        ok: false,
        reason: 'position_alpha_save.stale_revision',
      });
      expect(await persistence.saveSession(focus.session)).toEqual({
        ok: false,
        reason: 'position_alpha_save.conflicting_revision',
      });
      const advanced = advancePositionAlphaGameDayV2(focus.session, mechanics);
      if (!advanced.ok) throw new Error(advanced.reason);
      expect((await persistence.saveSession(advanced.session)).ok).toBe(true);
      expect(await persistence.loadSession()).toMatchObject({
        ok: true,
        session: advanced.session,
      });
      const snapshots = await storage.list<SaveEnvelope<unknown>>('autosaveSnapshots');
      expect(snapshots.map(({ value }) => value.saveVersion).sort()).toEqual([1, 2]);
      expect(snapshots.find(({ value }) => value.saveVersion === 1)!.value).toEqual(first.envelope);
      const stored = await storage.get<SaveEnvelope<unknown>>(
        'currentCareer',
        POSITION_ALPHA_STORAGE_ID,
      );
      await storage.put('currentCareer', POSITION_ALPHA_STORAGE_ID, {
        ...stored,
        checksum: 'invalid',
      });
      expect(await persistence.loadSession()).toMatchObject({
        ok: true,
        session: focus.session,
        source: 'snapshot',
        recovered: true,
      });
      expect(await storage.get('settings', ACTIVE_CAREER_KIND_STORAGE_ID)).toBe('POSITION_ALPHA');
    },
  );

  it.each(CASES)(
    '%s preserves the exact older alumni proof when explicitly upgrading a completed current record',
    async (positionId, archetypeId) => {
      const storage = new MemoryStorageAdapter();
      const { completed } = createCompletedPositionAlphaFixture(positionId, archetypeId);
      const legacy = await new PositionAlphaPersistence(storage, { now }).saveSession(
        completed,
        true,
      );
      if (!legacy.ok) throw new Error(legacy.reason);
      const migrated = parseShippedPositionAlphaSessionV2Json(JSON.stringify(completed))!;
      const saved = await new PositionAlphaPersistenceV2(storage, { now }).saveSession(
        migrated,
        true,
      );
      expect(saved.ok).toBe(true);
      expect(
        await storage.get(
          'profile',
          `${POSITION_ALUMNI_STORAGE_PREFIX}${completed.lifecycle.careerId}`,
        ),
      ).toEqual(legacy.envelope);
      expect(await new PositionAlphaPersistenceV2(storage).loadSession()).toMatchObject({
        ok: true,
        session: migrated,
        envelope: { saveVersion: 2 },
      });
      expect(migrated.meta).toEqual(completed.meta);
    },
  );

  it('isolates mutable input, rejects malformed/future/edited wire and protects newer writers', async () => {
    const storage = new MemoryStorageAdapter();
    const { current } = fixture(CASES[0]);
    const mutable = JSON.parse(JSON.stringify(current)) as PositionAlphaSessionV2;
    const pending = new PositionAlphaPersistenceV2(storage, { now }).saveSession(mutable, true);
    Object.assign(mutable, { revision: 99 });
    const saved = await pending;
    if (!saved.ok) throw new Error(saved.reason);
    expect(decodePositionAlphaEnvelopeV2(saved.envelope)?.session).toEqual(current);
    const badPayload: unknown = { model: 'position_alpha_session_wire_v2' };
    for (const invalid of [
      null,
      {},
      { ...saved.envelope, extra: true },
      { ...saved.envelope, checksum: 'invalid' },
      resign({ ...saved.envelope, saveVersion: 3 }),
      resign({ ...saved.envelope, contentVersion: '999' }),
      resign({ ...saved.envelope, updatedAt: 'yesterday' }),
      resign({ ...saved.envelope, payload: current }),
      resign({ ...saved.envelope, payload: badPayload }),
    ])
      expect(decodePositionAlphaEnvelopeV2(invalid)).toBeNull();
    const future = resign({ ...saved.envelope, saveVersion: 3 });
    await storage.put('currentCareer', POSITION_ALPHA_STORAGE_ID, future);
    expect(
      await new PositionAlphaPersistenceV2(storage, { now }).saveSession(current, true),
    ).toEqual({ ok: false, reason: 'position_alpha_save.conflicting_revision' });
    expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toEqual(future);
    expect(new TextEncoder().encode(JSON.stringify(saved.envelope)).byteLength).toBeLessThan(
      1_000_000,
    );
  });

  it('leaves failed writes untouched and retries the same payload without reopening a retired run', async () => {
    const storage = new MemoryStorageAdapter();
    const { current } = fixture(CASES[0]);
    let fail = true;
    const writes: unknown[] = [];
    const wrapped: StorageAdapter = {
      durability: storage.durability,
      get: storage.get.bind(storage),
      put: storage.put.bind(storage),
      list: storage.list.bind(storage),
      delete: storage.delete.bind(storage),
      close: storage.close.bind(storage),
      runExclusive: storage.runExclusive.bind(storage),
      putMany: async (entries, stores) => {
        writes.push(entries);
        if (fail) throw new Error('injected');
        await storage.putMany(entries, stores);
      },
    };
    const persistence = new PositionAlphaPersistenceV2(wrapped, { now });
    expect(await persistence.saveSession(current, true)).toEqual({
      ok: false,
      reason: 'position_alpha_save.storage_error',
    });
    expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toBeUndefined();
    expect(await storage.get('settings', ACTIVE_CAREER_KIND_STORAGE_ID)).toBeUndefined();
    fail = false;
    expect((await persistence.saveSession(current, true)).ok).toBe(true);
    expect(writes[1]).toEqual(writes[0]);
    await storage.put('settings', ACTIVE_CAREER_KIND_STORAGE_ID, 'NONE');
    expect(await persistence.saveSession(current)).toEqual({
      ok: false,
      reason: 'position_alpha_save.different_career',
    });
  });
});
