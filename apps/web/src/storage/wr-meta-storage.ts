import {
  completeWrTwoSeasonSessionAndRegistryV8,
  createEmptyMetaProfile,
  createWrMetaRegistryV1,
  createWrTwoSeasonAlumniV1,
  type CareerSessionV8,
  type WrMetaRegistryV1,
  type WrMetaRegistryEntryV1,
  type AlumniRecordV1,
  type WrTwoSeasonAlumniV1,
} from '@project-saturday/game-core';
import {
  canonicalStringify,
  META_PROFILE_STORAGE_ID,
  validateMetaSaveEnvelope,
  type WrSaveTransaction,
} from './career-persistence';
import {
  createWrAlumniEnvelopeV1,
  createWrMetaWireV1,
  decodeWrAlumniEnvelopeV1,
  decodeWrMetaManifestV1,
  decodeWrMetaWireV1,
  wrAlumniMatchesRegistryEntry,
  type WrMetaWireV1,
} from './wr-meta-wire';
import {
  CAREER_STORAGE_LOCK_NAME,
  type SaveEnvelope,
  type StorageAdapter,
  type StorageWrite,
} from './storage';

export const WR_META_SHADOW_ID = 'wr-meta:shadow-v1';
export const WR_META_INITIALIZED_ID = 'wr-meta:initialized-v1';
export const WR_ALUMNI_PREFIX = 'wr-alumni:';
export const wrMetaPageId = (revision: number, page: number) => `wr-meta:page:${revision}:${page}`;
export const WR_ALUMNI_PAGE_SIZE = 8;
export type WrAlumniPageResult =
  | {
      readonly ok: true;
      readonly registryRevision: number;
      readonly total: number;
      readonly nextOffset: number | null;
      readonly entries: readonly {
        readonly entry: WrMetaRegistryEntryV1;
        readonly alumni: AlumniRecordV1 | WrTwoSeasonAlumniV1 | null;
      }[];
    }
  | {
      readonly ok: false;
      readonly reason:
        'invalid_meta' | 'protected_meta' | 'storage_error' | 'invalid_page' | 'stale_page';
    };

/** Read-only Hub port; normal pages never replay every completed career. */
export class WrMetaPersistenceV8 {
  public constructor(
    private readonly storage: StorageAdapter,
    private readonly version: string,
  ) {
    if (typeof version !== 'string' || version.length < 1 || version.length > 64)
      throw new RangeError('WR history requires a bounded content version.');
  }
  public async loadRegistry(): Promise<LoadWrMetaRegistryResult> {
    try {
      return await this.storage.runExclusive(CAREER_STORAGE_LOCK_NAME, () =>
        loadWrMetaRegistry(this.storage, this.version),
      );
    } catch {
      return { ok: false, reason: 'storage_error' };
    }
  }
  public async loadAlumniPage(offset = 0, expectedRevision?: number): Promise<WrAlumniPageResult> {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      (expectedRevision !== undefined &&
        (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0))
    )
      return { ok: false, reason: 'invalid_page' };
    try {
      return await this.storage.runExclusive(CAREER_STORAGE_LOCK_NAME, async () => {
        const loaded = await loadWrMetaRegistry(this.storage, this.version);
        if (!loaded.ok) return loaded;
        if (expectedRevision !== undefined && expectedRevision !== loaded.registry.revision)
          return { ok: false, reason: 'stale_page' } as const;
        const total = loaded.registry.alumni.length;
        if (offset > total) return { ok: false, reason: 'invalid_page' } as const;
        const entries: Extract<WrAlumniPageResult, { ok: true }>['entries'][number][] = [];
        for (const entry of loaded.registry.alumni.slice(offset, offset + WR_ALUMNI_PAGE_SIZE)) {
          const legacy = loaded.records.find(({ alumniId }) => alumniId === entry.alumniId);
          const alumni =
            legacy !== undefined
              ? wrAlumniMatchesRegistryEntry(legacy, entry)
                ? legacy
                : null
              : (decodeWrAlumniEnvelopeV1(
                  await this.storage.get('profile', `${WR_ALUMNI_PREFIX}${entry.alumniId}`),
                  entry,
                  this.version,
                )?.alumni ?? null);
          entries.push(Object.freeze({ entry, alumni }));
        }
        return Object.freeze({
          ok: true as const,
          registryRevision: loaded.registry.revision,
          total,
          nextOffset: offset + entries.length < total ? offset + entries.length : null,
          entries: Object.freeze(entries),
        });
      });
    } catch {
      return { ok: false, reason: 'storage_error' };
    }
  }
}
type Migration = NonNullable<ReturnType<typeof createWrMetaRegistryV1>>;
type Loaded = {
  readonly ok: true;
  readonly registry: WrMetaRegistryV1;
  readonly wire: WrMetaWireV1 | null;
  readonly legacyProof: SaveEnvelope<unknown> | null;
  readonly records: Migration['records'];
  readonly recovered: boolean;
};
export type LoadWrMetaRegistryResult =
  | Loaded
  | { readonly ok: false; readonly reason: 'invalid_meta' | 'protected_meta' | 'storage_error' };

function protectedMeta(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if ('saveVersion' in value && value.saveVersion !== 1) return true;
  if (
    'payload' in value &&
    typeof value.payload === 'object' &&
    value.payload !== null &&
    'model' in value.payload &&
    value.payload.model !== 'wr_meta_manifest_v1'
  )
    return true;
  return false;
}
async function readWire(
  storage: StorageAdapter,
  value: unknown,
  version: string,
): Promise<WrMetaWireV1 | null> {
  const manifest = decodeWrMetaManifestV1(value, version);
  if (manifest === null) return null;
  const pages: unknown[] = [];
  for (let page = 0; page < manifest.payload.pageCount; page += 1) {
    const stored = await storage.get(
      'migrationMetadata',
      wrMetaPageId(manifest.payload.revision, page),
    );
    if (stored === undefined) return null;
    pages.push(stored);
  }
  return decodeWrMetaWireV1(manifest, pages, version)?.wire ?? null;
}

/** Caller holds the common career lock when this participates in a write. No alumni scan. */
export async function loadWrMetaRegistry(
  storage: StorageAdapter,
  version: string,
): Promise<LoadWrMetaRegistryResult> {
  try {
    const [current, shadow, initialized] = await Promise.all([
      storage.get('profile', META_PROFILE_STORAGE_ID),
      storage.get('migrationMetadata', WR_META_SHADOW_ID),
      storage.get('migrationMetadata', WR_META_INITIALIZED_ID),
    ]);
    if (initialized !== undefined && initialized !== 1)
      return { ok: false, reason: 'protected_meta' };
    for (const value of [current, shadow]) {
      if (
        protectedMeta(value) ||
        (typeof value === 'object' &&
          value !== null &&
          'contentVersion' in value &&
          value.contentVersion !== version)
      )
        return { ok: false, reason: 'protected_meta' };
    }
    if (current === undefined && shadow === undefined) {
      if (initialized !== undefined) return { ok: false, reason: 'invalid_meta' };
      const empty = createWrMetaRegistryV1(createEmptyMetaProfile())!;
      return { ok: true, ...empty, wire: null, legacyProof: null, recovered: false };
    }
    const legacy = current === undefined ? null : validateMetaSaveEnvelope(current, version);
    const migrated = legacy?.ok ? createWrMetaRegistryV1(legacy.envelope.payload) : null;
    const currentWire = migrated === null ? await readWire(storage, current, version) : null;
    const shadowWire = await readWire(storage, shadow, version);
    const currentRegistry =
      migrated?.registry ??
      (currentWire === null
        ? null
        : decodeWrMetaWireV1(currentWire.manifest, currentWire.pages, version)!.registry);
    const shadowRegistry =
      shadowWire === null
        ? null
        : decodeWrMetaWireV1(shadowWire.manifest, shadowWire.pages, version)!.registry;
    if (
      currentRegistry !== null &&
      shadowRegistry !== null &&
      currentRegistry.revision === shadowRegistry.revision &&
      canonicalStringify(currentRegistry) !== canonicalStringify(shadowRegistry)
    )
      return { ok: false, reason: 'protected_meta' };
    const useShadow =
      shadowRegistry !== null &&
      (currentRegistry === null || shadowRegistry.revision > currentRegistry.revision);
    const registry = useShadow ? shadowRegistry : currentRegistry;
    if (registry === null) return { ok: false, reason: 'invalid_meta' };
    return {
      ok: true,
      registry,
      wire: useShadow ? shadowWire : currentWire,
      records: migrated?.records ?? [],
      legacyProof: migrated === null ? null : (structuredClone(current) as SaveEnvelope<unknown>),
      recovered: useShadow,
    };
  } catch {
    return { ok: false, reason: 'storage_error' };
  }
}

/** Re-derive retirement under the same lock and return only an atomic write set. */
export function wrCompletionTransaction(
  version: string,
): WrSaveTransaction<CareerSessionV8, unknown> {
  return async ({ storage, previous, session, envelope, idempotent }) => {
    const fail = () => ({
      ok: false as const,
      reason: 'career_save.protected_existing_save' as const,
    });
    const completion = session.career.terminalCompletion;
    const review = session.career.terminalReview;
    if (completion === undefined || review === undefined || previous === null) return fail();
    const loaded = await loadWrMetaRegistry(storage, version);
    if (!loaded.ok)
      return loaded.reason === 'storage_error'
        ? { ok: false, reason: 'career_save.storage_error' }
        : fail();
    const alumni = createWrTwoSeasonAlumniV1(review, completion.contentVersion);
    if (alumni === null) return fail();
    if (idempotent) {
      const entry = loaded.registry.alumni.find(({ alumniId }) => alumniId === alumni.alumniId);
      if (entry === undefined) return fail();
      const stored = await storage.get('profile', `${WR_ALUMNI_PREFIX}${alumni.alumniId}`);
      const decoded = decodeWrAlumniEnvelopeV1(stored, entry, version);
      if (decoded === null || canonicalStringify(decoded.alumni) !== canonicalStringify(alumni))
        return fail();
      return {
        ok: true,
        writes:
          loaded.wire !== null
            ? [
                {
                  storeName: 'profile',
                  id: META_PROFILE_STORAGE_ID,
                  value: loaded.wire.manifest,
                },
                {
                  storeName: 'migrationMetadata',
                  id: WR_META_SHADOW_ID,
                  value: loaded.wire.manifest,
                },
                { storeName: 'migrationMetadata', id: WR_META_INITIALIZED_ID, value: 1 },
              ]
            : [],
      };
    }
    const expected = completeWrTwoSeasonSessionAndRegistryV8(
      previous.session,
      loaded.registry,
      completion.contentVersion,
    );
    if (
      !expected.ok ||
      canonicalStringify(expected.session) !== canonicalStringify(session) ||
      canonicalStringify(expected.alumni) !== canonicalStringify(alumni)
    )
      return fail();
    const createdAt =
      loaded.wire?.manifest.createdAt ?? loaded.legacyProof?.createdAt ?? envelope.updatedAt;
    const updatedAt = new Date(
      Math.max(
        Date.parse(envelope.updatedAt),
        Date.parse(
          loaded.wire?.manifest.updatedAt ?? loaded.legacyProof?.updatedAt ?? envelope.updatedAt,
        ) + 1,
      ),
    ).toISOString();
    const wire = createWrMetaWireV1(expected.registry, version, createdAt, updatedAt);
    if (wire === null) return fail();
    const writes: StorageWrite[] = [
      { storeName: 'profile', id: META_PROFILE_STORAGE_ID, value: wire.manifest },
      { storeName: 'migrationMetadata', id: WR_META_SHADOW_ID, value: wire.manifest },
      { storeName: 'migrationMetadata', id: WR_META_INITIALIZED_ID, value: 1 },
      ...wire.pages.map((page) => ({
        storeName: 'migrationMetadata' as const,
        id: wrMetaPageId(page.payload.revision, page.payload.pageIndex),
        value: page,
      })),
    ];
    for (const record of [...loaded.records, alumni]) {
      const id = `${WR_ALUMNI_PREFIX}${record.alumniId}`;
      const existing = await storage.get('profile', id);
      const entry = expected.registry.alumni.find(({ alumniId }) => alumniId === record.alumniId);
      if (entry === undefined) return fail();
      if (existing !== undefined) {
        const decoded = decodeWrAlumniEnvelopeV1(existing, entry, version);
        if (decoded === null || canonicalStringify(decoded.alumni) !== canonicalStringify(record))
          return fail();
      } else {
        const detail = createWrAlumniEnvelopeV1(record, version, updatedAt, updatedAt);
        if (detail === null) return fail();
        writes.push({ storeName: 'profile', id, value: detail });
      }
    }
    if (loaded.legacyProof !== null) {
      const id = `wr-meta:legacy-proof:${loaded.legacyProof.checksum}`;
      const existing = await storage.get('migrationMetadata', id);
      if (
        existing !== undefined &&
        canonicalStringify(existing) !== canonicalStringify(loaded.legacyProof)
      )
        return fail();
      if (existing === undefined)
        writes.push({ storeName: 'migrationMetadata', id, value: loaded.legacyProof });
    }
    const deletes =
      loaded.wire?.pages
        .filter((page) => page.payload.revision !== expected.registry.revision)
        .map((page) => ({
          storeName: 'migrationMetadata' as const,
          id: wrMetaPageId(page.payload.revision, page.payload.pageIndex),
        })) ?? [];
    return { ok: true, writes, deletes };
  };
}
