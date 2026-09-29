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
  parseShippedPositionAlphaSessionV3Json,
} from '@project-saturday/game-content';
import { computeSaveChecksum } from './career-persistence';
import { createCompletedPositionAlphaFixture } from '../test/position-alpha-fixture';
import { CareerManagementPersistence, CareerManagementConflict } from './career-management';
import * as pagedReader from './position-alpha-persistence-v3';
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
import {
  PositionAlphaPersistenceV3,
  decodePositionAlphaEnvelopeV3,
} from './position-alpha-persistence-v3';
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
    careerSeed: `v3-persistence-${positionId}`,
    programId: 'program_prairie_forge',
    identity,
  });
  if (!created.ok) throw new Error(created.reason);
  return {
    historical: created.session,
    current: parseShippedPositionAlphaSessionV3Json(JSON.stringify(created.session))!,
    mechanics: buildShippedPositionAlphaSessionCommandMechanics({ identity })!,
  };
}
function resign(envelope: SaveEnvelope<unknown>): SaveEnvelope<unknown> {
  const { saveVersion, contentVersion, createdAt, updatedAt, payload } = envelope;
  const fields = { saveVersion, contentVersion, createdAt, updatedAt, payload };
  return { ...fields, checksum: computeSaveChecksum(fields) };
}

describe('paged position envelope compatibility', () => {
  it.each(CASES.flatMap((position) => [1, 2, 3].map((version) => ({ position, version }))))(
    '$position retains the exact version-$version completion proof through current saving and Hub retirement',
    async ({ position, version }) => {
      const storage = new MemoryStorageAdapter();
      const { completed } = createCompletedPositionAlphaFixture(position[0], position[1]);
      const current = parseShippedPositionAlphaSessionV3Json(JSON.stringify(completed))!;
      const persistence = new PositionAlphaPersistenceV3(storage, { now });
      const old =
        version === 1
          ? await new PositionAlphaPersistence(storage, { now }).saveSession(completed, true)
          : await (
              version === 2 ? new PositionAlphaPersistenceV2(storage, { now }) : persistence
            ).saveSession(current, true);
      if (!old.ok) throw new Error(old.reason);
      const proofId = `${POSITION_ALUMNI_STORAGE_PREFIX}${current.lifecycle.careerId}`;
      const upgraded = await persistence.saveSession(current, true);
      if (!upgraded.ok) throw new Error(upgraded.reason);
      const hub = new CareerManagementPersistence(storage);
      expect(await hub.loadPositionAlumniV2()).toEqual({
        completedSessions: [{ session: current, envelope: old.envelope }],
        invalidEntryCount: 0,
      });
      await expect(hub.checkpoint({ careerId: 'wrong-career' })).rejects.toBeInstanceOf(
        CareerManagementConflict,
      );
      expect(
        await hub.retireCurrentCareer(
          await hub.checkpoint({ careerId: current.lifecycle.careerId }),
        ),
      ).toEqual({ ok: true });
      expect(await storage.get('profile', proofId)).toEqual(old.envelope);
      expect(await storage.list('currentCareer')).toEqual([]);
      expect(await storage.list('autosaveSnapshots')).toEqual([]);
      expect(await persistence.saveSession(current)).toEqual({
        ok: false,
        reason: 'position_alpha_save.different_career',
      });
      expect((await persistence.saveSession(current, true)).ok).toBe(true);
      await storage.put('profile', proofId, { ...old.envelope, checksum: 'corrupt' });
      const before = await storage.list('currentCareer');
      expect(await hub.retireCurrentCareer(await hub.checkpoint())).toEqual({
        ok: false,
        reason: 'protected_history',
      });
      expect(await storage.list('currentCareer')).toEqual(before);
      expect((await hub.loadPositionAlumniV2()).invalidEntryCount).toBe(1);
      await storage.delete('profile', proofId);
      const currentProof = await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID);
      expect(await hub.retireCurrentCareer(await hub.checkpoint())).toEqual({ ok: true });
      expect(await storage.get('profile', proofId)).toEqual(currentProof);
    },
  );

  it('skips nonterminal v3 replay and checks identity from recovered paged records', async () => {
    const storage = new MemoryStorageAdapter();
    const { current } = fixture(CASES[0]);
    const saved = await new PositionAlphaPersistenceV3(storage, { now }).saveSession(current, true);
    if (!saved.ok) throw new Error(saved.reason);
    await storage.putMany(
      Array.from({ length: 30 }, (_, index) => ({
        storeName: 'autosaveSnapshots' as const,
        id: `position-alpha:${index}`,
        value: saved.envelope,
      })),
    );
    const hub = new CareerManagementPersistence(storage);
    const read = vi.spyOn(pagedReader, 'decodePositionAlphaEnvelopeV3');
    const checkpoint = await hub.checkpoint({ careerId: current.lifecycle.careerId });
    expect(await hub.retireCurrentCareer(checkpoint)).toEqual({ ok: true });
    expect(read).not.toHaveBeenCalled();
    await storage.put('settings', ACTIVE_CAREER_KIND_STORAGE_ID, 'POSITION_ALPHA');
    await storage.put('autosaveSnapshots', 'position-alpha:recovered', saved.envelope);
    await expect(hub.checkpoint({ careerId: current.lifecycle.careerId })).resolves.toBeDefined();
    expect(read).toHaveBeenCalled();
  });

  it('rolls native snapshot-pruning failure back and retries the exact paged write', async () => {
    const name = 'saturday-v3-pruning-retry';
    const storage = new IndexedDbStorageAdapter(name);
    adapters.push(storage);
    databases.push(name);
    const { current, mechanics } = fixture(CASES[0]);
    const persistence = new PositionAlphaPersistenceV3(storage, { now });
    const initial = await persistence.saveSession(current, true);
    if (!initial.ok) throw new Error(initial.reason);
    await storage.putMany(
      Array.from({ length: 30 }, (_, index) => ({
        storeName: 'autosaveSnapshots' as const,
        id: `position-alpha:${current.lifecycle.careerId}:000000:${index}`,
        value: initial.envelope,
      })),
    );
    const focus = commitPositionAlphaFocusPlanV2(
      current,
      ['action_recovery', 'action_film_study', 'action_study_hall'],
      mechanics,
    );
    if (!focus.ok) throw new Error(focus.reason);
    const before = await storage.list('autosaveSnapshots');
    const original = IDBObjectStore.prototype.delete;
    const fail = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(function (
      this: IDBObjectStore,
      key,
    ) {
      const request = original.call(this, key);
      if (this.name === 'autosaveSnapshots') this.transaction.abort();
      return request;
    });
    expect(await persistence.saveSession(focus.session)).toEqual({
      ok: false,
      reason: 'position_alpha_save.storage_error',
    });
    expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toEqual(initial.envelope);
    expect(await storage.list('autosaveSnapshots')).toEqual(before);
    fail.mockRestore();
    const retried = await persistence.saveSession(focus.session);
    if (!retried.ok) throw new Error(retried.reason);
    expect(decodePositionAlphaEnvelopeV3(retried.envelope)?.session).toEqual(focus.session);
    expect(await storage.list('autosaveSnapshots')).toHaveLength(30);
  });

  it.each(
    CASES.flatMap((position) => ['memory', 'indexeddb'].map((backend) => ({ position, backend }))),
  )(
    '$position $backend loads old records without writes and publishes mixed-version snapshots atomically',
    async ({ position, backend }) => {
      const name = `saturday-v3-${position[0]}`;
      const storage =
        backend === 'memory' ? new MemoryStorageAdapter() : new IndexedDbStorageAdapter(name);
      adapters.push(storage);
      if (backend === 'indexeddb') databases.push(name);
      const { historical, current, mechanics } = fixture(position);
      const legacy = new PositionAlphaPersistence(storage, { now });
      const v2 = new PositionAlphaPersistenceV2(storage, { now });
      const persistence = new PositionAlphaPersistenceV3(storage, { now });
      const old = await legacy.saveSession(historical, true);
      if (!old.ok) throw new Error(old.reason);
      const dump = () =>
        Promise.all(STORAGE_STORE_NAMES.map(async (store) => [store, await storage.list(store)]));
      const before = await dump();
      expect(await persistence.loadSession()).toMatchObject({
        ok: true,
        session: current,
        envelope: old.envelope,
      });
      expect(await dump()).toEqual(before);
      const focus = commitPositionAlphaFocusPlanV2(
        current,
        ['action_recovery', 'action_film_study', 'action_study_hall'],
        mechanics,
      );
      if (!focus.ok) throw new Error(focus.reason);
      const prior = await v2.saveSession(focus.session);
      if (!prior.ok) throw new Error(prior.reason);
      const beforeV3 = await dump();
      expect(await persistence.loadSession()).toMatchObject({
        ok: true,
        session: focus.session,
        envelope: prior.envelope,
      });
      expect(await dump()).toEqual(beforeV3);
      const advanced = advancePositionAlphaGameDayV2(focus.session, mechanics);
      if (!advanced.ok) throw new Error(advanced.reason);
      const saved = await persistence.saveSession(advanced.session);
      if (!saved.ok) throw new Error(saved.reason);
      expect(saved.envelope).toMatchObject({
        saveVersion: 3,
        createdAt: old.envelope.createdAt,
        payload: { model: 'position_alpha_session_wire_v3' },
      });
      expect(decodePositionAlphaEnvelopeV3(saved.envelope)?.session).toEqual(advanced.session);
      expect(validatePositionAlphaEnvelope(saved.envelope)).toBeNull();
      expect(decodePositionAlphaEnvelopeV2(saved.envelope)).toBeNull();
      for (const replace of [false, true]) {
        expect(await legacy.saveSession(historical, replace)).toEqual({
          ok: false,
          reason: 'position_alpha_save.conflicting_revision',
        });
        expect(await v2.saveSession(advanced.session, replace)).toEqual({
          ok: false,
          reason: 'position_alpha_save.conflicting_revision',
        });
      }
      expect(await persistence.saveSession(current)).toEqual({
        ok: false,
        reason: 'position_alpha_save.stale_revision',
      });
      expect(await persistence.saveSession(advanced.session)).toEqual({
        ok: false,
        reason: 'position_alpha_save.conflicting_revision',
      });
      const snapshots = await storage.list<SaveEnvelope<unknown>>('autosaveSnapshots');
      expect(snapshots.map(({ value }) => value.saveVersion).sort()).toEqual([1, 2]);
      expect(snapshots.find(({ value }) => value.saveVersion === 1)?.value).toEqual(old.envelope);
      expect(snapshots.find(({ value }) => value.saveVersion === 2)?.value).toEqual(prior.envelope);
      await storage.put(
        'autosaveSnapshots',
        `position-alpha:${current.lifecycle.careerId}:current`,
        saved.envelope,
      );
      await storage.put('currentCareer', POSITION_ALPHA_STORAGE_ID, {
        ...saved.envelope,
        checksum: 'corrupt',
      });
      expect(await persistence.loadSession()).toMatchObject({
        ok: true,
        source: 'snapshot',
        recovered: true,
        session: advanced.session,
        envelope: saved.envelope,
      });
      expect(await storage.get('settings', ACTIVE_CAREER_KIND_STORAGE_ID)).toBe('POSITION_ALPHA');
    },
  );

  it('detaches caller input and rejects incorrect tuples, checksums, malformed pages and future envelopes', async () => {
    const storage = new MemoryStorageAdapter();
    const { current } = fixture(CASES[0]);
    const mutable = JSON.parse(JSON.stringify(current)) as PositionAlphaSessionV2;
    const persistence = new PositionAlphaPersistenceV3(storage, { now });
    const pending = persistence.saveSession(mutable, true);
    Object.assign(mutable, { revision: 99 });
    const saved = await pending;
    if (!saved.ok) throw new Error(saved.reason);
    expect(decodePositionAlphaEnvelopeV3(saved.envelope)?.session).toEqual(current);
    const payload = saved.envelope.payload as Record<string, unknown>;
    for (const invalid of [
      null,
      {},
      { ...saved.envelope, extra: true },
      { ...saved.envelope, checksum: 'invalid' },
      resign({ ...saved.envelope, saveVersion: 2 }),
      resign({ ...saved.envelope, saveVersion: 4 }),
      resign({ ...saved.envelope, contentVersion: '999' }),
      resign({ ...saved.envelope, updatedAt: 'yesterday' }),
      resign({ ...saved.envelope, payload: current }),
      resign({ ...saved.envelope, payload: { ...payload, weekHistory: [{}] } }),
      resign({ ...saved.envelope, payload: { ...payload, padding: '한'.repeat(350_000) } }),
    ])
      expect(decodePositionAlphaEnvelopeV3(invalid)).toBeNull();
    const future = resign({ ...saved.envelope, saveVersion: 4 });
    await storage.put('currentCareer', POSITION_ALPHA_STORAGE_ID, future);
    expect(await persistence.saveSession(current, true)).toEqual({
      ok: false,
      reason: 'position_alpha_save.conflicting_revision',
    });
    expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toEqual(future);
    expect(new TextEncoder().encode(JSON.stringify(saved.envelope)).byteLength).toBeLessThan(
      1_000_000,
    );
  });
});
