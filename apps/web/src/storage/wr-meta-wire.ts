import {
  parseWrAlumniRecord,
  parseWrMetaRegistryV1,
  type AlumniRecordV1,
  type WrMetaRegistryEntryV1,
  type WrMetaRegistryV1,
  type WrTwoSeasonAlumniV1,
} from '@project-saturday/game-core';
import { canonicalStringify, computeSaveChecksum } from './career-persistence';
import type { SaveEnvelope } from './storage';

export const WR_META_PAGE_SIZE = 256;
const MAX_BYTES = 1_000_000;
type Alumni = AlumniRecordV1 | WrTwoSeasonAlumniV1;
type Header = Pick<WrMetaRegistryV1, 'revision' | 'unlockedOptionIds' | 'programFamiliarity'>;
export interface WrMetaManifestV1 extends Header {
  readonly model: 'wr_meta_manifest_v1';
  readonly entryCount: number;
  readonly pageCount: number;
  readonly registryChecksum: string;
}
export interface WrMetaPageV1 {
  readonly model: 'wr_meta_page_v1';
  readonly revision: number;
  readonly pageIndex: number;
  readonly entries: readonly WrMetaRegistryEntryV1[];
}
export interface WrAlumniDetailV1 {
  readonly model: 'wr_alumni_detail_v1';
  readonly alumni: Alumni;
}
export interface WrMetaWireV1 {
  readonly manifest: SaveEnvelope<WrMetaManifestV1>;
  readonly pages: readonly SaveEnvelope<WrMetaPageV1>[];
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: string) =>
  Object.keys(value).sort().join('|') === expected;
function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function timestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString() === value;
}
function contentVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 64;
}
/** Reject data JSON would silently discard before authenticating or cloning it. */
function jsonTree(value: unknown, depth = 0): boolean {
  if (depth > 128) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value))
    return (
      Object.keys(value).length === value.length &&
      Array.from(
        { length: value.length },
        (_, index) => Object.hasOwn(value, index) && jsonTree(value[index], depth + 1),
      ).every(Boolean)
    );
  return (
    record(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.values(value).every((child) => jsonTree(child, depth + 1))
  );
}
function seal<T>(
  payload: T,
  version: string,
  createdAt: string,
  updatedAt: string,
): SaveEnvelope<T> | null {
  if (
    !contentVersion(version) ||
    !timestamp(createdAt) ||
    !timestamp(updatedAt) ||
    createdAt > updatedAt ||
    !jsonTree(payload)
  )
    return null;
  const fields = { saveVersion: 1, contentVersion: version, createdAt, updatedAt, payload };
  const envelope = { ...fields, checksum: computeSaveChecksum(fields) };
  return new TextEncoder().encode(JSON.stringify(envelope)).byteLength < MAX_BYTES
    ? freeze(structuredClone(envelope))
    : null;
}
function open(value: unknown, version: string): SaveEnvelope<unknown> | null {
  try {
    if (
      !record(value) ||
      !jsonTree(value) ||
      !contentVersion(version) ||
      !keys(value, 'checksum|contentVersion|createdAt|payload|saveVersion|updatedAt') ||
      value['saveVersion'] !== 1 ||
      value['contentVersion'] !== version ||
      typeof value['checksum'] !== 'string' ||
      !/^fnv1a32:[0-9a-f]{8}$/.test(value['checksum'])
    )
      return null;
    const expected = seal(
      value['payload'],
      version,
      value['createdAt'] as string,
      value['updatedAt'] as string,
    );
    return expected !== null && expected.checksum === value['checksum'] ? expected : null;
  } catch {
    return null;
  }
}

/** Staged transport only; no active storage selector or writer changes. */
export function createWrMetaWireV1(
  value: WrMetaRegistryV1,
  version: string,
  createdAt: string,
  updatedAt: string,
): WrMetaWireV1 | null {
  const registry = parseWrMetaRegistryV1(value);
  if (
    registry === null ||
    !contentVersion(version) ||
    !timestamp(createdAt) ||
    !timestamp(updatedAt) ||
    createdAt > updatedAt
  )
    return null;
  const pageCount = Math.ceil(registry.alumni.length / WR_META_PAGE_SIZE);
  const manifest = seal<WrMetaManifestV1>(
    {
      model: 'wr_meta_manifest_v1',
      revision: registry.revision,
      unlockedOptionIds: registry.unlockedOptionIds,
      programFamiliarity: registry.programFamiliarity,
      entryCount: registry.alumni.length,
      pageCount,
      registryChecksum: computeSaveChecksum({
        saveVersion: 1,
        contentVersion: version,
        createdAt,
        updatedAt,
        payload: registry,
      }),
    },
    version,
    createdAt,
    updatedAt,
  );
  if (manifest === null) return null;
  const pages: SaveEnvelope<WrMetaPageV1>[] = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = seal<WrMetaPageV1>(
      {
        model: 'wr_meta_page_v1',
        revision: registry.revision,
        pageIndex,
        entries: registry.alumni.slice(
          pageIndex * WR_META_PAGE_SIZE,
          (pageIndex + 1) * WR_META_PAGE_SIZE,
        ),
      },
      version,
      createdAt,
      updatedAt,
    );
    if (page === null) return null;
    pages.push(page);
  }
  return freeze({ manifest, pages });
}

/** Authenticate a bounded manifest before requesting its individual pages. */
export function decodeWrMetaManifestV1(
  value: unknown,
  version: string,
): SaveEnvelope<WrMetaManifestV1> | null {
  const envelope = open(value, version);
  if (envelope === null || !record(envelope.payload)) return null;
  const header = envelope.payload;
  if (
    !keys(
      header,
      'entryCount|model|pageCount|programFamiliarity|registryChecksum|revision|unlockedOptionIds',
    ) ||
    header['model'] !== 'wr_meta_manifest_v1' ||
    !Number.isSafeInteger(header['entryCount']) ||
    (header['entryCount'] as number) < 0 ||
    header['pageCount'] !== Math.ceil((header['entryCount'] as number) / WR_META_PAGE_SIZE) ||
    typeof header['registryChecksum'] !== 'string' ||
    !/^fnv1a32:[0-9a-f]{8}$/.test(header['registryChecksum']) ||
    parseWrMetaRegistryV1({
      schemaVersion: 1,
      model: 'wr_meta_registry_v1',
      alumni: [],
      revision: header['revision'],
      unlockedOptionIds: header['unlockedOptionIds'],
      programFamiliarity: header['programFamiliarity'],
    }) === null
  )
    return null;
  return envelope as unknown as SaveEnvelope<WrMetaManifestV1>;
}

export function decodeWrMetaWireV1(
  manifestValue: unknown,
  pageValues: readonly unknown[],
  version: string,
): { readonly registry: WrMetaRegistryV1; readonly wire: WrMetaWireV1 } | null {
  try {
    const manifest = open(manifestValue, version);
    if (manifest === null || !record(manifest.payload)) return null;
    const header = manifest.payload;
    if (
      !keys(
        header,
        'entryCount|model|pageCount|programFamiliarity|registryChecksum|revision|unlockedOptionIds',
      ) ||
      header['model'] !== 'wr_meta_manifest_v1' ||
      !Number.isSafeInteger(header['entryCount']) ||
      (header['entryCount'] as number) < 0 ||
      header['pageCount'] !== Math.ceil((header['entryCount'] as number) / WR_META_PAGE_SIZE) ||
      !Array.isArray(pageValues) ||
      Object.keys(pageValues).length !== pageValues.length ||
      pageValues.length !== header['pageCount']
    )
      return null;
    const entries: unknown[] = [];
    const pages: SaveEnvelope<WrMetaPageV1>[] = [];
    for (const [index, value] of pageValues.entries()) {
      const page = open(value, version);
      if (page === null || !record(page.payload)) return null;
      const payload = page.payload;
      if (
        !keys(payload, 'entries|model|pageIndex|revision') ||
        payload['model'] !== 'wr_meta_page_v1' ||
        payload['pageIndex'] !== index ||
        payload['revision'] !== header['revision'] ||
        page.createdAt !== manifest.createdAt ||
        page.updatedAt !== manifest.updatedAt ||
        !Array.isArray(payload['entries']) ||
        payload['entries'].length !==
          Math.min(WR_META_PAGE_SIZE, (header['entryCount'] as number) - index * WR_META_PAGE_SIZE)
      )
        return null;
      entries.push(...payload['entries']);
      pages.push(page as unknown as SaveEnvelope<WrMetaPageV1>);
    }
    const registry = parseWrMetaRegistryV1({
      schemaVersion: 1,
      model: 'wr_meta_registry_v1',
      revision: header['revision'],
      unlockedOptionIds: header['unlockedOptionIds'],
      programFamiliarity: header['programFamiliarity'],
      alumni: entries,
    });
    return registry === null ||
      header['registryChecksum'] !==
        computeSaveChecksum({
          saveVersion: 1,
          contentVersion: version,
          createdAt: manifest.createdAt,
          updatedAt: manifest.updatedAt,
          payload: registry,
        })
      ? null
      : freeze({
          registry,
          wire: {
            manifest: manifest as unknown as SaveEnvelope<WrMetaManifestV1>,
            pages,
          },
        });
  } catch {
    return null;
  }
}

export function createWrAlumniEnvelopeV1(
  value: Alumni,
  version: string,
  createdAt: string,
  updatedAt: string,
): SaveEnvelope<WrAlumniDetailV1> | null {
  const alumni = parseWrAlumniRecord(value);
  return alumni === null
    ? null
    : seal({ model: 'wr_alumni_detail_v1', alumni }, version, createdAt, updatedAt);
}

/** Independently validate the requested detail and bind it to the authenticated registry. */
export function wrAlumniMatchesRegistryEntry(
  alumni: Alumni,
  entry: WrMetaRegistryEntryV1,
): boolean {
  return (
    jsonTree(entry) &&
    canonicalStringify(entry) ===
      canonicalStringify({
        alumniId: alumni.alumniId,
        careerId: alumni.careerId,
        recordSchemaVersion: alumni.schemaVersion,
        programIds: alumni.programIds,
      })
  );
}

export function decodeWrAlumniEnvelopeV1(
  value: unknown,
  entry: WrMetaRegistryEntryV1,
  version: string,
): { readonly alumni: Alumni; readonly envelope: SaveEnvelope<WrAlumniDetailV1> } | null {
  const envelope = open(value, version);
  if (
    envelope === null ||
    !record(envelope.payload) ||
    !keys(envelope.payload, 'alumni|model') ||
    envelope.payload['model'] !== 'wr_alumni_detail_v1'
  )
    return null;
  const alumni = parseWrAlumniRecord(envelope.payload['alumni']);
  if (alumni === null || !wrAlumniMatchesRegistryEntry(alumni, entry)) return null;
  return freeze({ alumni, envelope: envelope as SaveEnvelope<WrAlumniDetailV1> });
}
