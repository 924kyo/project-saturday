import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createEmptyMetaProfile,
  createWrMetaRegistryV1,
  parseWrAlumniRecord,
  parseWrMetaRegistryV1,
  completeWrTwoSeasonSessionAndRegistryV8,
  type WrMetaRegistryV1,
} from '@project-saturday/game-core';
import { createCompletedSeasonFixture, createWrV8TerminalFixture } from '../test/season-fixture';
import {
  computeSaveChecksum,
  canonicalStringify,
  META_PROFILE_STORAGE_ID,
  CURRENT_CAREER_STORAGE_ID,
} from './career-persistence';
import {
  MemoryStorageAdapter,
  IndexedDbStorageAdapter,
  STORAGE_STORE_NAMES,
  type SaveEnvelope,
  type StorageStoreName,
} from './storage';
import { WrCareerPersistenceV8 } from './career-persistence-v8';
import {
  loadWrMetaRegistry,
  WR_ALUMNI_PREFIX,
  WR_META_SHADOW_ID,
  wrMetaPageId,
  WrMetaPersistenceV8,
} from './wr-meta-storage';
import { createWrCareerEnvelopeV8, decodeWrCareerEnvelopeV8 } from './career-envelope-v8';
import {
  gameTuning,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
  skillMechanicsDefinitions,
} from '@project-saturday/game-content/content';
import {
  createWrMetaWireV1,
  decodeWrMetaWireV1,
  createWrAlumniEnvelopeV1,
  decodeWrAlumniEnvelopeV1,
  WR_META_PAGE_SIZE,
} from './wr-meta-wire';

const TIME = '2026-09-14T00:00:00.000Z';
const VERSION = '1';
function resign<T>(envelope: SaveEnvelope<T>): SaveEnvelope<T> {
  const fields = {
    saveVersion: envelope.saveVersion,
    contentVersion: envelope.contentVersion,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    payload: envelope.payload,
  };
  return { ...fields, checksum: computeSaveChecksum(fields) };
}
function registryFixture(count: number): WrMetaRegistryV1 {
  const empty = createWrMetaRegistryV1(createEmptyMetaProfile())!.registry;
  const registry = parseWrMetaRegistryV1({
    ...empty,
    revision: count,
    alumni: Array.from({ length: count }, (_, index) => {
      const careerId = `career_wire_${String(index).padStart(5, '0')}`;
      return {
        alumniId: `alumni_${careerId}`,
        careerId,
        recordSchemaVersion: 1,
        programIds: ['program_gulf_meridian'],
      };
    }),
  });
  if (registry === null) throw new Error('Invalid registry fixture');
  return registry;
}
describe('staged WR registry and detail wire', () => {
  it('loads only a bounded read-only history page and detects stale pagination', async () => {
    const storage = new MemoryStorageAdapter();
    const wire = createWrMetaWireV1(registryFixture(1000), VERSION, TIME, TIME)!;
    await storage.put('profile', META_PROFILE_STORAGE_ID, wire.manifest);
    for (const page of wire.pages)
      await storage.put(
        'migrationMetadata',
        wrMetaPageId(page.payload.revision, page.payload.pageIndex),
        page,
      );
    const get = vi.spyOn(storage, 'get');
    const list = vi.spyOn(storage, 'list');
    const putMany = vi.spyOn(storage, 'putMany');
    const history = new WrMetaPersistenceV8(storage, VERSION);
    const first = await history.loadAlumniPage();
    expect(first).toMatchObject({ ok: true, total: 1000, nextOffset: 8, registryRevision: 1000 });
    if (!first.ok) throw new Error(first.reason);
    expect(first.entries).toHaveLength(8);
    // Synthetic capacity references have no invented historical game records.
    expect(first.entries.every(({ alumni }) => alumni === null)).toBe(true);
    expect(
      get.mock.calls.filter(
        ([store, id]) => store === 'profile' && id.startsWith(WR_ALUMNI_PREFIX),
      ),
    ).toHaveLength(8);
    expect(list).not.toHaveBeenCalled();
    expect(putMany).not.toHaveBeenCalled();
    const second = await history.loadAlumniPage(8, first.registryRevision);
    expect(second).toMatchObject({ ok: true, total: 1000, nextOffset: 16 });
    if (!second.ok) throw new Error(second.reason);
    expect(second.entries[0]!.entry.alumniId).not.toBe(first.entries[0]!.entry.alumniId);
    expect(await history.loadAlumniPage(8, 999)).toEqual({ ok: false, reason: 'stale_page' });
    expect(await history.loadAlumniPage(-1)).toEqual({ ok: false, reason: 'invalid_page' });
    expect(await history.loadAlumniPage(1001)).toEqual({ ok: false, reason: 'invalid_page' });
  });
  it.each([0, 1, 256, 257, 1000, 8000])(
    'round-trips %i lightweight entries in bounded pages',
    (count) => {
      const source = structuredClone(registryFixture(count));
      const wire = createWrMetaWireV1(source, VERSION, TIME, TIME)!;
      expect(wire).not.toBeNull();
      expect(wire.pages).toHaveLength(Math.ceil(count / WR_META_PAGE_SIZE));
      const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
      for (const envelope of [wire.manifest, ...wire.pages])
        expect(bytes(envelope)).toBeLessThan(1_000_000);
      if (count === 8000) expect(bytes(source)).toBeGreaterThan(1_000_000);
      expect(bytes(wire.manifest)).toBeLessThan(1000);
      const copy = JSON.parse(JSON.stringify(wire)) as typeof wire;
      const loaded = decodeWrMetaWireV1(copy.manifest, copy.pages, VERSION);
      expect(loaded?.registry).toEqual(source);
      expect(loaded?.wire).toEqual(wire);
      expect(Object.isFrozen(source)).toBe(false);
      expect(Object.isFrozen(copy.manifest)).toBe(false);
      expect(Object.isFrozen(loaded?.wire)).toBe(true);
    },
  );
  it('rejects missing/reordered/duplicate/mixed/forged pages and hostile envelope tuples', () => {
    const wire = createWrMetaWireV1(registryFixture(1000), VERSION, TIME, TIME)!;
    const first = wire.pages[0]!;
    const badPages = [
      wire.pages.slice(1),
      [...wire.pages].reverse(),
      [first, first, ...wire.pages.slice(2)],
      [resign({ ...first, payload: { ...first.payload, revision: 1001 } }), ...wire.pages.slice(1)],
      [resign({ ...first, updatedAt: '2026-09-15T00:00:00.000Z' }), ...wire.pages.slice(1)],
      [
        resign({
          ...first,
          payload: { ...first.payload, entries: first.payload.entries.slice(1) },
        }),
        ...wire.pages.slice(1),
      ],
      [
        resign({
          ...first,
          payload: {
            ...first.payload,
            entries: first.payload.entries.map((entry) => ({
              ...entry,
              programIds: ['program_cascade_tech'],
            })),
          },
        }),
        ...wire.pages.slice(1),
      ],
      [resign({ ...first, payload: { ...first.payload, extra: true } }), ...wire.pages.slice(1)],
    ];
    for (const pages of badPages)
      expect(decodeWrMetaWireV1(wire.manifest, pages, VERSION)).toBeNull();
    for (const manifest of [
      null,
      { ...wire.manifest, checksum: 'fnv1a32:00000000' },
      resign({ ...wire.manifest, saveVersion: 2 }),
      resign({ ...wire.manifest, contentVersion: '2' }),
      resign({ ...wire.manifest, updatedAt: '2026-09-13T00:00:00.000Z' }),
      resign({ ...wire.manifest, createdAt: '2026-09-14' }),
      resign({ ...wire.manifest, payload: { ...wire.manifest.payload, model: 'future' } }),
      resign({ ...wire.manifest, payload: { ...wire.manifest.payload, entryCount: 999 } }),
      resign({ ...wire.manifest, payload: { ...wire.manifest.payload, pageCount: 3 } }),
      { ...wire.manifest, extra: undefined },
      resign({
        ...wire.manifest,
        payload: { ...wire.manifest.payload, padding: '한'.repeat(350_000) },
      }),
    ])
      expect(decodeWrMetaWireV1(manifest, wire.pages, VERSION)).toBeNull();
    const sparse = [...wire.pages];
    delete sparse[0];
    expect(decodeWrMetaWireV1(wire.manifest, sparse, VERSION)).toBeNull();
    const extra = Object.assign([...wire.pages], { hidden: true });
    expect(decodeWrMetaWireV1(wire.manifest, extra, VERSION)).toBeNull();
    expect(createWrMetaWireV1(registryFixture(0), '', TIME, TIME)).toBeNull();
    expect(createWrMetaWireV1(registryFixture(0), VERSION, TIME, 'invalid')).toBeNull();
  });
});

describe('independently authenticated real WR alumni and terminal saves', () => {
  let legacy: ReturnType<typeof createCompletedSeasonFixture>;
  let current: ReturnType<typeof createWrV8TerminalFixture>;
  let second: ReturnType<typeof createWrV8TerminalFixture>;
  beforeAll(() => {
    legacy = createCompletedSeasonFixture('wr-wire-legacy');
    current = createWrV8TerminalFixture();
    second = createWrV8TerminalFixture('wr-v8-next-terminal');
  }, 30_000);
  it('preserves literal legacy/current records and rejects another identity or forged source', () => {
    for (const alumni of [legacy.completedMeta.alumni[0]!, current.alumni]) {
      const original = structuredClone(alumni);
      const entry = {
        alumniId: alumni.alumniId,
        careerId: alumni.careerId,
        recordSchemaVersion: alumni.schemaVersion,
        programIds: alumni.programIds,
      };
      const envelope = createWrAlumniEnvelopeV1(original, VERSION, TIME, TIME)!;
      expect(envelope).not.toBeNull();
      expect(parseWrAlumniRecord(original)).toEqual(original);
      expect(
        decodeWrAlumniEnvelopeV1(JSON.parse(JSON.stringify(envelope)), entry, VERSION),
      ).toEqual({ alumni, envelope });
      expect(Object.isFrozen(original)).toBe(false);
      expect(
        decodeWrAlumniEnvelopeV1(envelope, { ...entry, alumniId: 'alumni_wrong' }, VERSION),
      ).toBeNull();
      expect(decodeWrAlumniEnvelopeV1(envelope, { ...entry, programIds: [] }, VERSION)).toBeNull();
      expect(
        decodeWrAlumniEnvelopeV1(
          envelope,
          { ...entry, recordSchemaVersion: entry.recordSchemaVersion === 1 ? 2 : 1 },
          VERSION,
        ),
      ).toBeNull();
      expect(
        decodeWrAlumniEnvelopeV1({ ...envelope, checksum: 'fnv1a32:00000000' }, entry, VERSION),
      ).toBeNull();
      expect(
        decodeWrAlumniEnvelopeV1(
          resign({
            ...envelope,
            payload: { ...envelope.payload, alumni: { ...alumni, seasonsPlayed: 99 } },
          }),
          entry,
          VERSION,
        ),
      ).toBeNull();
      expect(
        decodeWrAlumniEnvelopeV1(resign({ ...envelope, saveVersion: 2 }), entry, VERSION),
      ).toBeNull();
      expect(
        createWrAlumniEnvelopeV1({ ...alumni, schemaVersion: 99 } as never, VERSION, TIME, TIME),
      ).toBeNull();
    }
  });
  it.each(['memory', 'indexed-db'] as const)(
    'atomically publishes and retries actual retirement on %s',
    async (kind) => {
      const databaseName = `wr-v8-atomic-${kind}`;
      const storage =
        kind === 'memory' ? new MemoryStorageAdapter() : new IndexedDbStorageAdapter(databaseName);
      let fail = false;
      const originalPutMany = storage.putMany.bind(storage);
      // IndexedDB queues the real writes before this invalid store aborts its transaction.
      storage.putMany = (entries, clear, deletes) =>
        originalPutMany(
          fail
            ? [
                ...entries,
                {
                  storeName: 'missing-store' as StorageStoreName,
                  id: 'fault',
                  value: true,
                },
              ]
            : entries,
          clear,
          deletes,
        );
      const all = () => Promise.all(STORAGE_STORE_NAMES.map((name) => storage.list(name)));
      let tick = Date.parse(TIME);
      const writer = new WrCareerPersistenceV8(
        storage,
        {
          tuning: gameTuning,
          families: keySnapFamilyMechanicsDefinitions,
          patterns: keySnapPatternMechanicsDefinitions,
          skills: skillMechanicsDefinitions,
        },
        { contentVersion: VERSION, now: () => new Date(tick++) },
      );
      try {
        const fields = {
          saveVersion: 1,
          contentVersion: VERSION,
          createdAt: TIME,
          updatedAt: TIME,
          payload: legacy.completedMeta,
        };
        const originalMeta = { ...fields, checksum: computeSaveChecksum(fields) };
        await storage.put('profile', META_PROFILE_STORAGE_ID, originalMeta);
        const loadedLegacy = await loadWrMetaRegistry(storage, VERSION);
        expect(loadedLegacy.ok && loadedLegacy.legacyProof).toEqual(originalMeta);
        const history = new WrMetaPersistenceV8(storage, VERSION);
        const legacyPage = await history.loadAlumniPage();
        expect(legacyPage.ok && legacyPage.entries.map(({ alumni }) => alumni)).toEqual(
          legacy.completedMeta.alumni,
        );
        expect(await writer.replaceCurrentSession(current.completedSession)).toMatchObject({
          ok: false,
          reason: 'career_save.protected_existing_save',
        });
        expect(await writer.saveSession(current.reviewSession)).toMatchObject({ ok: true });
        const before = await all();
        fail = true;
        expect(await writer.saveSession(current.completedSession)).toMatchObject({
          ok: false,
          reason: 'career_save.storage_error',
          stage: 'write_session',
        });
        expect(await all()).toEqual(before);
        fail = false;
        const retirementStart = performance.now();
        expect(await writer.saveSession(current.completedSession)).toMatchObject({ ok: true });
        expect(performance.now() - retirementStart).toBeLessThan(1000);
        const expected = completeWrTwoSeasonSessionAndRegistryV8(
          current.reviewSession,
          createWrMetaRegistryV1(legacy.completedMeta)!.registry,
          1,
        );
        if (!expected.ok) throw new Error(expected.reason);
        const loaded = await loadWrMetaRegistry(storage, VERSION);
        expect(loaded.ok && loaded.registry).toEqual(expected.registry);
        expect(
          await storage.get('migrationMetadata', `wr-meta:legacy-proof:${originalMeta.checksum}`),
        ).toEqual(originalMeta);
        const details = (await storage.list('profile')).filter(({ id }) =>
          id.startsWith(WR_ALUMNI_PREFIX),
        );
        expect(details).toHaveLength(2);
        for (const entry of expected.registry.alumni) {
          const value = await storage.get('profile', `${WR_ALUMNI_PREFIX}${entry.alumniId}`);
          expect(decodeWrAlumniEnvelopeV1(value, entry, VERSION)).not.toBeNull();
        }
        const idempotent = await Promise.all([
          writer.saveSession(current.completedSession),
          writer.saveSession(current.completedSession),
        ]);
        for (const result of idempotent)
          expect(result).toMatchObject({ ok: true, snapshotId: null });
        expect(await loadWrMetaRegistry(storage, VERSION)).toEqual(loaded);
        expect(await writer.saveSession(current.reviewSession)).toMatchObject({
          ok: false,
          reason: 'career_save.stale_revision',
        });
        await storage.put('profile', META_PROFILE_STORAGE_ID, { damaged: true });
        await storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, { damaged: true });
        expect(await loadWrMetaRegistry(storage, VERSION)).toMatchObject({
          ok: true,
          recovered: true,
        });
        expect(await writer.loadCareer()).toMatchObject({
          ok: true,
          source: 'snapshot',
          session: current.completedSession,
        });
        expect(await writer.saveSession(current.completedSession)).toMatchObject({
          ok: true,
          snapshotId: null,
        });
        expect(await writer.loadCareer()).toMatchObject({ ok: true, source: 'current' });
        expect(await loadWrMetaRegistry(storage, VERSION)).toEqual(loaded);
        if (!loaded.ok || loaded.wire === null) throw new Error('Missing manifest');
        await storage.delete('profile', META_PROFILE_STORAGE_ID);
        await storage.delete('migrationMetadata', WR_META_SHADOW_ID);
        expect(await loadWrMetaRegistry(storage, VERSION)).toEqual({
          ok: false,
          reason: 'invalid_meta',
        });
        expect(await writer.saveSession(current.completedSession)).toMatchObject({
          ok: false,
          reason: 'career_save.protected_existing_save',
        });
        for (const detail of details)
          expect(await storage.get('profile', detail.id)).toEqual(detail.value);
        await storage.put('profile', META_PROFILE_STORAGE_ID, loaded.wire.manifest);
        await storage.put('migrationMetadata', WR_META_SHADOW_ID, loaded.wire.manifest);
        expect(await writer.replaceCurrentSession(second.reviewSession)).toMatchObject({
          ok: true,
        });
        expect(await writer.saveSession(second.completedSession)).toMatchObject({ ok: true });
        const next = await loadWrMetaRegistry(storage, VERSION);
        if (!next.ok || next.wire === null) throw new Error('Missing next registry');
        expect(next.registry.alumni).toHaveLength(3);
        const pageResult = await history.loadAlumniPage(0, next.registry.revision);
        expect(pageResult).toMatchObject({ ok: true, total: 3, nextOffset: null });
        expect(pageResult.ok && pageResult.entries.every(({ alumni }) => alumni !== null)).toBe(
          true,
        );
        for (const detail of details)
          expect(await storage.get('profile', detail.id)).toEqual(detail.value);
        expect(
          (await storage.list('migrationMetadata')).filter(({ id }) =>
            id.startsWith('wr-meta:page:'),
          ),
        ).toHaveLength(next.wire.pages.length);
        const pageId = wrMetaPageId(next.registry.revision, 0);
        const page = await storage.get('migrationMetadata', pageId);
        await storage.put('migrationMetadata', pageId, { damaged: true });
        const damaged = await all();
        expect(await writer.saveSession(second.completedSession)).toMatchObject({
          ok: false,
          reason: 'career_save.protected_existing_save',
        });
        expect(await all()).toEqual(damaged);
        await storage.put('migrationMetadata', pageId, page);
        const primary = await storage.get<SaveEnvelope<unknown>>(
          'profile',
          META_PROFILE_STORAGE_ID,
        );
        await storage.put('profile', META_PROFILE_STORAGE_ID, { ...primary, saveVersion: 2 });
        expect(await loadWrMetaRegistry(storage, VERSION)).toEqual({
          ok: false,
          reason: 'protected_meta',
        });
        expect(await writer.saveSession(second.completedSession)).toMatchObject({
          ok: false,
          reason: 'career_save.protected_existing_save',
        });
        expect(canonicalStringify(await storage.get('profile', details[0]!.id))).toBe(
          canonicalStringify(details[0]!.value),
        );
      } finally {
        await storage.close();
        if (kind === 'indexed-db') await deleteDB(databaseName);
      }
    },
    30_000,
  );

  it('authenticates and reloads real current review and retirement without rewriting their source', () => {
    const mechanics = {
      tuning: gameTuning,
      families: keySnapFamilyMechanicsDefinitions,
      patterns: keySnapPatternMechanicsDefinitions,
      skills: skillMechanicsDefinitions,
    };
    for (const session of [current.reviewSession, current.completedSession]) {
      const envelope = createWrCareerEnvelopeV8(session, VERSION, TIME, TIME, mechanics)!;
      expect(envelope).not.toBeNull();
      const decoded = decodeWrCareerEnvelopeV8(
        JSON.parse(JSON.stringify(envelope)),
        VERSION,
        mechanics,
      );
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) throw new Error(decoded.reason);
      expect(decoded.session).toEqual(session);
      expect(decoded.envelope).toEqual(envelope);
    }
  });
});
