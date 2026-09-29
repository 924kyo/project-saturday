import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createStorageAdapter,
  IndexedDbStorageAdapter,
  MemoryStorageAdapter,
  requestPersistentStorage,
  STORAGE_STORE_NAMES,
  type SaveEnvelope,
  type StorageAdapter,
  type StorageStoreName,
} from './storage';

const openAdapters: StorageAdapter[] = [];
const databaseNames: string[] = [];

function uniqueDatabaseName(): string {
  const name = `project-saturday-test-${databaseNames.length}`;
  databaseNames.push(name);
  return name;
}

afterEach(async () => {
  await Promise.all(openAdapters.splice(0).map((adapter) => adapter.close()));
  await Promise.all(databaseNames.splice(0).map((name) => deleteDB(name)));
  vi.restoreAllMocks();
});

describe.each([
  ['memory', (): StorageAdapter => new MemoryStorageAdapter()],
  [
    'IndexedDB',
    (): StorageAdapter => {
      const adapter = new IndexedDbStorageAdapter(uniqueDatabaseName());
      openAdapters.push(adapter);
      return adapter;
    },
  ],
])('%s storage adapter', (_label, createAdapter) => {
  it('batches selected deletions with writes and rolls back invalid deletion requests', async () => {
    const adapter = createAdapter();
    await adapter.put('autosaveSnapshots', 'old', { revision: 1 });
    await adapter.put('autosaveSnapshots', 'other-career', { revision: 9 });
    await expect(
      adapter.putMany(
        [{ storeName: 'currentCareer', id: 'active', value: { revision: 2 } }],
        [],
        [
          { storeName: 'autosaveSnapshots', id: 'old' },
          { storeName: 'invalid-store' as StorageStoreName, id: 'invalid' },
        ],
      ),
    ).rejects.toThrow();
    expect(await adapter.get('autosaveSnapshots', 'old')).toEqual({ revision: 1 });
    expect(await adapter.get('currentCareer', 'active')).toBeUndefined();
    await adapter.putMany(
      [{ storeName: 'currentCareer', id: 'active', value: { revision: 2 } }],
      [],
      [{ storeName: 'autosaveSnapshots', id: 'old' }],
    );
    expect(await adapter.get('currentCareer', 'active')).toEqual({ revision: 2 });
    expect(await adapter.get('autosaveSnapshots', 'old')).toBeUndefined();
    expect(await adapter.get('autosaveSnapshots', 'other-career')).toEqual({ revision: 9 });
    await adapter.putMany([], [], [{ storeName: 'currentCareer', id: 'active' }]);
    expect(await adapter.get('currentCareer', 'active')).toBeUndefined();
  });

  it('round-trips, lists, isolates, and deletes versioned values', async () => {
    const adapter = createAdapter();
    const envelope: SaveEnvelope<{ readonly weekIndex: number }> = {
      saveVersion: 1,
      contentVersion: 'm0',
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
      checksum: 'test-checksum',
      payload: { weekIndex: 0 },
    };

    await adapter.put('currentCareer', 'active', envelope);
    const loaded = await adapter.get<typeof envelope>('currentCareer', 'active');
    expect(loaded).toEqual(envelope);

    if (loaded !== undefined) {
      (loaded.payload as { weekIndex: number }).weekIndex = 4;
    }
    expect(await adapter.get('currentCareer', 'active')).toEqual(envelope);

    await adapter.put('currentCareer', 'archive', envelope);
    expect((await adapter.list('currentCareer')).map((entry) => entry.id)).toEqual([
      'active',
      'archive',
    ]);

    await adapter.delete('currentCareer', 'active');
    expect(await adapter.get('currentCareer', 'active')).toBeUndefined();
  });

  it('serializes operations sharing an exclusive lock', async () => {
    const adapter = createAdapter();
    const events: string[] = [];
    let releaseFirst = (): void => undefined;
    let markFirstStarted = (): void => undefined;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = adapter.runExclusive('career-save', async () => {
      events.push('first:start');
      markFirstStarted();
      await firstGate;
      events.push('first:end');
    });
    await firstStarted;
    const second = adapter.runExclusive('career-save', async () => {
      events.push('second:start');
      events.push('second:end');
    });
    await Promise.resolve();
    expect(events).toEqual(['first:start']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });

  it('writes a cross-store batch together and snapshots all values before mutation', async () => {
    const adapter = createAdapter();
    const current = { revision: 1 };
    const snapshot = { revision: 1 };
    await adapter.putMany([
      { storeName: 'currentCareer', id: 'active', value: current },
      { storeName: 'autosaveSnapshots', id: 'snapshot-1', value: snapshot },
    ]);
    current.revision = 9;
    snapshot.revision = 9;
    await expect(adapter.get('currentCareer', 'active')).resolves.toEqual({ revision: 1 });
    await expect(adapter.get('autosaveSnapshots', 'snapshot-1')).resolves.toEqual({ revision: 1 });

    await expect(
      adapter.putMany([
        { storeName: 'currentCareer', id: 'active', value: { revision: 2 } },
        { storeName: 'autosaveSnapshots', id: 'snapshot-2', value: { invalid: () => 1 } },
      ]),
    ).rejects.toThrow();
    await expect(adapter.get('currentCareer', 'active')).resolves.toEqual({ revision: 1 });
    await expect(adapter.get('autosaveSnapshots', 'snapshot-2')).resolves.toBeUndefined();
  });

  it('atomically removes active runs and recovery while preserving history and settings', async () => {
    const adapter = createAdapter();
    for (const storeName of STORAGE_STORE_NAMES) {
      await adapter.put(storeName, 'existing', { storeName });
    }
    await adapter.putMany(
      [{ storeName: 'settings', id: 'active-career-kind', value: 'NONE' }],
      ['currentCareer', 'autosaveSnapshots'],
    );
    expect(await adapter.list('currentCareer')).toEqual([]);
    expect(await adapter.list('autosaveSnapshots')).toEqual([]);
    for (const storeName of ['profile', 'settings', 'migrationMetadata'] as const) {
      expect(await adapter.get(storeName, 'existing')).toEqual({ storeName });
    }
    expect(await adapter.get('settings', 'active-career-kind')).toBe('NONE');
  });

  it('supports a full reset with no writes and retains everything on a rejected batch', async () => {
    const adapter = createAdapter();
    for (const storeName of STORAGE_STORE_NAMES) {
      await adapter.put(storeName, 'existing', { storeName });
    }
    await expect(
      adapter.putMany(
        [{ storeName: 'profile', id: 'invalid', value: { invalid: () => 1 } }],
        STORAGE_STORE_NAMES,
      ),
    ).rejects.toThrow();
    for (const storeName of STORAGE_STORE_NAMES) {
      expect(await adapter.list(storeName)).toEqual([{ id: 'existing', value: { storeName } }]);
    }
    await adapter.putMany([], STORAGE_STORE_NAMES);
    for (const storeName of STORAGE_STORE_NAMES) expect(await adapter.list(storeName)).toEqual([]);
  });

  it('rolls back queued clears and writes if a later request is invalid', async () => {
    const adapter = createAdapter();
    await adapter.put('currentCareer', 'active', { revision: 1 });
    await expect(
      adapter.putMany(
        [
          { storeName: 'profile', id: 'new', value: { revision: 2 } },
          { storeName: 'invalid-store' as StorageStoreName, id: 'bad', value: 1 },
        ],
        ['currentCareer'],
      ),
    ).rejects.toThrow();
    expect(await adapter.get('currentCareer', 'active')).toEqual({ revision: 1 });
    expect(await adapter.get('profile', 'new')).toBeUndefined();
  });
});

describe('IndexedDB schema', () => {
  it('rolls back pruning and authoritative writes when a native delete aborts', async () => {
    const adapter = new IndexedDbStorageAdapter(uniqueDatabaseName());
    openAdapters.push(adapter);
    await adapter.put('currentCareer', 'active', { revision: 1 });
    await adapter.put('autosaveSnapshots', 'old', { revision: 0 });
    const nativeDelete = IDBObjectStore.prototype.delete;
    vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementationOnce(function (
      this: IDBObjectStore,
      key: IDBValidKey | IDBKeyRange,
    ) {
      const request = nativeDelete.call(this, key);
      this.transaction.abort();
      return request;
    });
    await expect(
      adapter.putMany(
        [{ storeName: 'currentCareer', id: 'active', value: { revision: 2 } }],
        [],
        [{ storeName: 'autosaveSnapshots', id: 'old' }],
      ),
    ).rejects.toThrow();
    expect(await adapter.get('currentCareer', 'active')).toEqual({ revision: 1 });
    expect(await adapter.get('autosaveSnapshots', 'old')).toEqual({ revision: 0 });
  });

  it('rolls back clears and writes when the native transaction aborts', async () => {
    const adapter = new IndexedDbStorageAdapter(uniqueDatabaseName());
    openAdapters.push(adapter);
    await adapter.put('currentCareer', 'active', { revision: 1 });
    const nativeClear = IDBObjectStore.prototype.clear;
    vi.spyOn(IDBObjectStore.prototype, 'clear').mockImplementationOnce(function (
      this: IDBObjectStore,
    ) {
      const request = nativeClear.call(this);
      this.transaction.abort();
      return request;
    });
    await expect(
      adapter.putMany(
        [{ storeName: 'profile', id: 'new', value: { revision: 2 } }],
        ['currentCareer'],
      ),
    ).rejects.toThrow();
    expect(await adapter.get('currentCareer', 'active')).toEqual({ revision: 1 });
    expect(await adapter.get('profile', 'new')).toBeUndefined();
  });

  it('creates every planned store', async () => {
    const adapter = new IndexedDbStorageAdapter(uniqueDatabaseName());
    openAdapters.push(adapter);
    await adapter.initialize();

    for (const storeName of STORAGE_STORE_NAMES) {
      await adapter.put(storeName, 'probe', { storeName });
      await expect(adapter.get(storeName, 'probe')).resolves.toEqual({
        storeName,
      });
    }
  });

  it('falls back to memory when IndexedDB is unavailable', async () => {
    const adapter = await createStorageAdapter({ indexedDbAvailable: false });
    openAdapters.push(adapter);

    expect(adapter.durability).toBe('memory');
  });

  it('falls back to memory when IndexedDB initialization fails', async () => {
    vi.spyOn(globalThis.indexedDB, 'open').mockImplementation(() => {
      throw new Error('IndexedDB initialization failed');
    });

    const adapter = await createStorageAdapter({
      databaseName: uniqueDatabaseName(),
    });
    openAdapters.push(adapter);

    expect(adapter.durability).toBe('memory');
  });

  it('shares the fallback exclusive lock across adapters for the same database', async () => {
    const databaseName = uniqueDatabaseName();
    const firstAdapter = new IndexedDbStorageAdapter(databaseName);
    const secondAdapter = new IndexedDbStorageAdapter(databaseName);
    openAdapters.push(firstAdapter, secondAdapter);
    const events: string[] = [];
    let releaseFirst = (): void => undefined;
    let markFirstStarted = (): void => undefined;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = firstAdapter.runExclusive('career-save', async () => {
      events.push('first');
      markFirstStarted();
      await firstGate;
    });
    await firstStarted;
    const second = secondAdapter.runExclusive('career-save', async () => {
      events.push('second');
    });
    await Promise.resolve();
    expect(events).toEqual(['first']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['first', 'second']);
  });
});

describe('persistent storage request', () => {
  it('returns the browser decision', async () => {
    await expect(requestPersistentStorage({ persist: async () => true })).resolves.toBe(true);
  });

  it('degrades safely when unsupported or rejected', async () => {
    await expect(requestPersistentStorage({})).resolves.toBe(false);
    await expect(
      requestPersistentStorage({
        persist: async () => {
          throw new Error('denied');
        },
      }),
    ).resolves.toBe(false);
  });
});
