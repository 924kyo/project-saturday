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
});

describe('IndexedDB schema', () => {
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
