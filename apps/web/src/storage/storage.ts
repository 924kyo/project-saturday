import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const STORAGE_DATABASE_NAME = 'project-saturday';
export const STORAGE_DATABASE_VERSION = 1;
export const CAREER_STORAGE_LOCK_NAME = 'career-save-v1';

export const STORAGE_STORE_NAMES = [
  'profile',
  'currentCareer',
  'autosaveSnapshots',
  'settings',
  'migrationMetadata',
] as const;

export type StorageStoreName = (typeof STORAGE_STORE_NAMES)[number];

export interface SaveEnvelope<T> {
  readonly saveVersion: number;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly checksum: string;
  readonly payload: T;
}

export interface StorageEntry<T> {
  readonly id: string;
  readonly value: T;
}

export interface StorageWrite<T = unknown> {
  readonly storeName: StorageStoreName;
  readonly id: string;
  readonly value: T;
}

export interface StorageDelete {
  readonly storeName: StorageStoreName;
  readonly id: string;
}

export interface StorageAdapter {
  readonly durability: 'indexed-db' | 'memory';
  get<T>(storeName: StorageStoreName, id: string): Promise<T | undefined>;
  put<T>(storeName: StorageStoreName, id: string, value: T): Promise<void>;
  /** Clear stores, delete selected records, then write in the same atomic transaction. */
  putMany(
    entries: readonly StorageWrite[],
    clearStores?: readonly StorageStoreName[],
    deletes?: readonly StorageDelete[],
  ): Promise<void>;
  list<T>(storeName: StorageStoreName): Promise<readonly StorageEntry<T>[]>;
  delete(storeName: StorageStoreName, id: string): Promise<void>;
  runExclusive<T>(lockName: string, operation: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

interface PersistedRecord {
  id: string;
  value: unknown;
}

interface ProjectSaturdayDatabase extends DBSchema {
  profile: {
    key: string;
    value: PersistedRecord;
  };
  currentCareer: {
    key: string;
    value: PersistedRecord;
  };
  autosaveSnapshots: {
    key: string;
    value: PersistedRecord;
  };
  settings: {
    key: string;
    value: PersistedRecord;
  };
  migrationMetadata: {
    key: string;
    value: PersistedRecord;
  };
}

function clonePersistedValue<T>(value: T): T {
  return structuredClone(value);
}

const fallbackLockTails = new Map<string, Promise<void>>();

async function runQueuedExclusive<T>(lockKey: string, operation: () => Promise<T>): Promise<T> {
  const previous = fallbackLockTails.get(lockKey) ?? Promise.resolve();
  const execution = previous.then(operation);
  const settled = execution.then(
    () => undefined,
    () => undefined,
  );
  fallbackLockTails.set(lockKey, settled);
  try {
    return await execution;
  } finally {
    if (fallbackLockTails.get(lockKey) === settled) {
      fallbackLockTails.delete(lockKey);
    }
  }
}

interface BrowserLockManager {
  request<T>(name: string, operation: () => Promise<T>): Promise<T>;
}

function getBrowserLockManager(): BrowserLockManager | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  return (navigator as Navigator & { readonly locks?: BrowserLockManager }).locks;
}

export class IndexedDbStorageAdapter implements StorageAdapter {
  public readonly durability = 'indexed-db' as const;
  private databasePromise: Promise<IDBPDatabase<ProjectSaturdayDatabase>> | undefined;

  public constructor(private readonly databaseName: string = STORAGE_DATABASE_NAME) {}

  public async initialize(): Promise<void> {
    await this.getDatabase();
  }

  public async get<T>(storeName: StorageStoreName, id: string): Promise<T | undefined> {
    const database = await this.getDatabase();
    const record = await database.get(storeName, id);

    return record === undefined ? undefined : clonePersistedValue(record.value as T);
  }

  public async put<T>(storeName: StorageStoreName, id: string, value: T): Promise<void> {
    const database = await this.getDatabase();
    await database.put(storeName, {
      id,
      value: clonePersistedValue(value),
    });
  }

  public async putMany(
    entries: readonly StorageWrite[],
    clearStores: readonly StorageStoreName[] = [],
    deletes: readonly StorageDelete[] = [],
  ): Promise<void> {
    if (entries.length === 0 && clearStores.length === 0 && deletes.length === 0) return;
    const snapshots = entries.map((entry) => ({
      ...entry,
      value: clonePersistedValue(entry.value),
    }));
    const deletions = deletes.map(({ storeName, id }) => ({ storeName, id }));
    const database = await this.getDatabase();
    const transaction = database.transaction(STORAGE_STORE_NAMES, 'readwrite');
    const operations: Promise<unknown>[] = [];
    try {
      for (const storeName of new Set(clearStores)) {
        operations.push(transaction.objectStore(storeName).clear());
      }
      for (const { storeName, id } of deletions) {
        operations.push(transaction.objectStore(storeName).delete(id));
      }
      for (const entry of snapshots) {
        operations.push(
          transaction.objectStore(entry.storeName).put({ id: entry.id, value: entry.value }),
        );
      }
      await Promise.all([...operations, transaction.done]);
    } catch (error) {
      // A synchronous request error must also roll back already queued clears/writes.
      try {
        transaction.abort();
      } catch {
        // The transaction may already have aborted on an asynchronous request error.
      }
      await Promise.allSettled([...operations, transaction.done]);
      throw error;
    }
  }

  public async list<T>(storeName: StorageStoreName): Promise<readonly StorageEntry<T>[]> {
    const database = await this.getDatabase();
    const records = await database.getAll(storeName);

    return records
      .map((record) => ({
        id: record.id,
        value: clonePersistedValue(record.value as T),
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  public async delete(storeName: StorageStoreName, id: string): Promise<void> {
    const database = await this.getDatabase();
    await database.delete(storeName, id);
  }

  public runExclusive<T>(lockName: string, operation: () => Promise<T>): Promise<T> {
    const lockKey = `${this.databaseName}:${lockName}`;
    const browserLocks = getBrowserLockManager();
    return browserLocks === undefined
      ? runQueuedExclusive(lockKey, operation)
      : browserLocks.request(`project-saturday:${lockKey}`, operation);
  }

  public async close(): Promise<void> {
    if (this.databasePromise === undefined) {
      return;
    }

    const database = await this.databasePromise.catch(() => undefined);
    database?.close();
    this.databasePromise = undefined;
  }

  private getDatabase(): Promise<IDBPDatabase<ProjectSaturdayDatabase>> {
    this.databasePromise ??= openDB<ProjectSaturdayDatabase>(
      this.databaseName,
      STORAGE_DATABASE_VERSION,
      {
        upgrade(database): void {
          for (const storeName of STORAGE_STORE_NAMES) {
            if (!database.objectStoreNames.contains(storeName)) {
              database.createObjectStore(storeName, { keyPath: 'id' });
            }
          }
        },
      },
    );

    return this.databasePromise;
  }
}

export class MemoryStorageAdapter implements StorageAdapter {
  public readonly durability = 'memory' as const;
  private readonly stores = new Map<StorageStoreName, Map<string, unknown>>();
  private exclusiveTail: Promise<void> = Promise.resolve();

  public constructor() {
    for (const storeName of STORAGE_STORE_NAMES) {
      this.stores.set(storeName, new Map());
    }
  }

  public async get<T>(storeName: StorageStoreName, id: string): Promise<T | undefined> {
    const value = this.getStore(storeName).get(id);

    return value === undefined ? undefined : clonePersistedValue(value as T);
  }

  public async put<T>(storeName: StorageStoreName, id: string, value: T): Promise<void> {
    this.getStore(storeName).set(id, clonePersistedValue(value));
  }

  public async putMany(
    entries: readonly StorageWrite[],
    clearStores: readonly StorageStoreName[] = [],
    deletes: readonly StorageDelete[] = [],
  ): Promise<void> {
    const snapshots = entries.map((entry) => ({
      ...entry,
      store: this.getStore(entry.storeName),
      value: clonePersistedValue(entry.value),
    }));
    const storesToClear = [...new Set(clearStores)].map((name) => this.getStore(name));
    const deletions = deletes.map(({ storeName, id }) => ({ store: this.getStore(storeName), id }));
    for (const store of storesToClear) store.clear();
    for (const { store, id } of deletions) store.delete(id);
    for (const entry of snapshots) {
      entry.store.set(entry.id, entry.value);
    }
  }

  public async list<T>(storeName: StorageStoreName): Promise<readonly StorageEntry<T>[]> {
    return [...this.getStore(storeName).entries()]
      .map(([id, value]) => ({
        id,
        value: clonePersistedValue(value as T),
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  public async delete(storeName: StorageStoreName, id: string): Promise<void> {
    this.getStore(storeName).delete(id);
  }

  public runExclusive<T>(_lockName: string, operation: () => Promise<T>): Promise<T> {
    const execution = this.exclusiveTail.then(operation);
    this.exclusiveTail = execution.then(
      () => undefined,
      () => undefined,
    );
    return execution;
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }

  private getStore(storeName: StorageStoreName): Map<string, unknown> {
    const store = this.stores.get(storeName);

    if (store === undefined) {
      throw new Error(`Unknown storage store: ${storeName}`);
    }

    return store;
  }
}

export interface CreateStorageOptions {
  readonly databaseName?: string;
  readonly indexedDbAvailable?: boolean;
}

export async function createStorageAdapter(
  options: CreateStorageOptions = {},
): Promise<StorageAdapter> {
  const indexedDbAvailable =
    options.indexedDbAvailable ?? typeof globalThis.indexedDB !== 'undefined';

  if (!indexedDbAvailable) {
    return new MemoryStorageAdapter();
  }

  const adapter = new IndexedDbStorageAdapter(options.databaseName);

  try {
    await adapter.initialize();
    return adapter;
  } catch {
    await adapter.close();
    return new MemoryStorageAdapter();
  }
}

interface PersistenceStorageManager {
  persist?: () => Promise<boolean>;
}

function getBrowserStorageManager(): PersistenceStorageManager | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  return navigator.storage;
}

export async function requestPersistentStorage(
  storageManager: PersistenceStorageManager | undefined = getBrowserStorageManager(),
): Promise<boolean> {
  if (storageManager?.persist === undefined) {
    return false;
  }

  try {
    return await storageManager.persist();
  } catch {
    return false;
  }
}
