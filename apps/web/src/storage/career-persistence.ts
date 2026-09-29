import {
  createCareerSession,
  createEmptyMetaProfile,
  migrateCareerRunV1ToV2,
  migrateCareerRunV2ToV3,
  migrateCareerRunV3ToV4,
  migrateCareerRunV4ToV5,
  migrateCareerRunV5ToV6,
  migrateCareerRunV6ToV7,
  migrateCareerSessionV5ToV6,
  migrateCareerSessionV6ToV7,
  parseCareerSession,
  parseCareerSessionV5,
  parseCareerSessionV6,
  parseCareerSessionV7,
  parseCareerRunV1,
  parseCareerRunV2,
  parseCareerRunV3,
  parseCareerRunV4,
  parseCareerRunV7,
  parseMetaProfile,
  type CareerSession,
  type MetaProfileV1,
} from '@project-saturday/game-core';
import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';

import {
  CAREER_STORAGE_LOCK_NAME,
  type SaveEnvelope,
  type StorageAdapter,
  type StorageEntry,
  type StorageWrite,
  type StorageDelete,
} from './storage';
import { ACTIVE_CAREER_KIND_STORAGE_ID, type ActiveCareerKind } from './career-selection';

const LEGACY_CAREER_SAVE_VERSION_V1 = 1 as const;
const LEGACY_CAREER_SAVE_VERSION_V2 = 2 as const;
const LEGACY_CAREER_SAVE_VERSION_V3 = 3 as const;
const LEGACY_CAREER_SAVE_VERSION_V4 = 4 as const;
const LEGACY_CAREER_SAVE_VERSION_V5 = 5 as const;
const LEGACY_CAREER_SAVE_VERSION_V6 = 6 as const;
export const CURRENT_CAREER_SAVE_VERSION = 7 as const;
export const CURRENT_CAREER_STORAGE_ID = 'active' as const;
export const META_PROFILE_STORAGE_ID = 'meta' as const;
export const META_PROFILE_SAVE_VERSION = 1 as const;
export const CAREER_SNAPSHOT_RETENTION = 30 as const;
export const SHIPPED_CAREER_CONTENT_VERSION = String(CONTENT_COMPATIBILITY_VERSION);

export const CAREER_ENVELOPE_FAILURE_REASONS = Object.freeze([
  'envelope.invalid_shape',
  'envelope.unsupported_save_version',
  'envelope.incompatible_content',
  'envelope.invalid_timestamp',
  'envelope.checksum_mismatch',
  'envelope.unsupported_career_version',
  'envelope.invalid_career',
] as const);

export type CareerEnvelopeFailureReason = (typeof CAREER_ENVELOPE_FAILURE_REASONS)[number];

export const CAREER_SAVE_FAILURE_REASONS = Object.freeze([
  'career_save.invalid_career',
  'career_save.stale_revision',
  'career_save.conflicting_revision',
  'career_save.different_career',
  'career_save.protected_existing_save',
  'career_save.invalid_clock',
  'career_save.storage_error',
] as const);

export type CareerSaveFailureReason = (typeof CAREER_SAVE_FAILURE_REASONS)[number];
export type CareerSaveFailureStage =
  'read_current' | 'read_snapshots' | 'write_session' | 'write_current';

export type CareerLoadWarning =
  'career_load.current_unavailable' | 'career_load.snapshots_unavailable';

export interface CareerEnvelopeFailure {
  readonly store: 'currentCareer' | 'autosaveSnapshots';
  readonly id: string;
  readonly reason: CareerEnvelopeFailureReason;
}

export type ValidateCareerEnvelopeResult =
  | {
      readonly ok: true;
      readonly envelope: SaveEnvelope<CareerSession>;
    }
  | {
      readonly ok: false;
      readonly reason: CareerEnvelopeFailureReason;
    };

export type SaveCareerResult<TPayload = CareerSession> =
  | {
      readonly ok: true;
      readonly envelope: SaveEnvelope<TPayload>;
      readonly snapshotId: string | null;
      readonly prunedSnapshotCount: number;
      readonly retentionWarning: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: CareerSaveFailureReason;
      readonly stage?: CareerSaveFailureStage;
    };

export type LoadCareerResult<
  TSession extends WrStorageSession = CareerSession,
  TPayload = CareerSession,
> =
  | {
      readonly ok: true;
      readonly career: TSession['career'];
      readonly session: TSession;
      readonly envelope: SaveEnvelope<TPayload>;
      readonly source: 'current' | 'snapshot';
      readonly recovered: boolean;
      readonly skippedEntries: readonly CareerEnvelopeFailure[];
      readonly warnings: readonly CareerLoadWarning[];
    }
  | {
      readonly ok: false;
      readonly reason:
        'career_load.not_found' | 'career_load.no_valid_save' | 'career_load.storage_error';
      readonly skippedEntries: readonly CareerEnvelopeFailure[];
      readonly warnings: readonly CareerLoadWarning[];
    };

export interface CareerPersistenceOptions {
  readonly contentVersion: string;
  readonly now?: () => Date;
}

export type LoadMetaProfileResult =
  | {
      readonly ok: true;
      readonly meta: MetaProfileV1;
      readonly envelope: SaveEnvelope<MetaProfileV1> | null;
      readonly source: 'default' | 'stored';
    }
  | {
      readonly ok: false;
      readonly reason:
        'meta_load.invalid_save' | 'meta_load.protected_save' | 'meta_load.storage_error';
    };

export type SaveMetaProfileResult =
  | { readonly ok: true; readonly envelope: SaveEnvelope<MetaProfileV1> }
  | {
      readonly ok: false;
      readonly reason:
        | 'meta_save.invalid_meta'
        | 'meta_save.stale_revision'
        | 'meta_save.conflicting_revision'
        | 'meta_save.protected_existing_save'
        | 'meta_save.invalid_clock'
        | 'meta_save.storage_error';
    };

export type SaveCareerCompletionResult =
  | {
      readonly ok: true;
      readonly careerEnvelope: SaveEnvelope<CareerSession>;
      readonly metaEnvelope: SaveEnvelope<MetaProfileV1>;
      readonly snapshotId: string;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'career_completion_save.invalid_state'
        | 'career_completion_save.stale_revision'
        | 'career_completion_save.conflicting_revision'
        | 'career_completion_save.protected_existing_save'
        | 'career_completion_save.invalid_clock'
        | 'career_completion_save.storage_error';
    };

export type ValidateMetaEnvelopeResult =
  | { readonly ok: true; readonly envelope: SaveEnvelope<MetaProfileV1> }
  | {
      readonly ok: false;
      readonly reason:
        | 'envelope.invalid_shape'
        | 'envelope.unsupported_save_version'
        | 'envelope.incompatible_content'
        | 'envelope.invalid_timestamp'
        | 'envelope.checksum_mismatch'
        | 'envelope.invalid_career';
    };

type UnknownRecord = Record<string, unknown>;

export interface SaveChecksumFields<T> {
  readonly saveVersion: number;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly payload: T;
}

export interface WrStorageSession {
  readonly career: { readonly id: string; readonly revision: number };
  readonly world: { readonly revision: number };
}
export interface WrPersistenceCodec<TSession extends WrStorageSession, TPayload> {
  readonly ownsSnapshot?: (id: string) => boolean;
  readonly preservePreviousEnvelope?: boolean;
  readonly parseCareer: (
    value: TSession['career'],
  ) => { readonly ok: true; readonly career: TSession['career'] } | { readonly ok: false };
  readonly parseSession: (
    value: unknown,
  ) => { readonly ok: true; readonly session: TSession } | { readonly ok: false };
  readonly createSession: (career: TSession['career']) => TSession | null;
  readonly readEnvelope: (
    value: unknown,
    contentVersion: string,
  ) =>
    | { readonly ok: true; readonly session: TSession; readonly envelope: SaveEnvelope<TPayload> }
    | { readonly ok: false; readonly reason: CareerEnvelopeFailureReason };
  readonly makeEnvelope: (
    session: TSession,
    contentVersion: string,
    createdAt: string,
    updatedAt: string,
  ) => SaveEnvelope<TPayload> | null;
}
export type WrSaveTransaction<TSession extends WrStorageSession, TPayload> = (context: {
  readonly storage: StorageAdapter;
  readonly previous: {
    readonly session: TSession;
    readonly envelope: SaveEnvelope<TPayload>;
  } | null;
  readonly session: TSession;
  readonly envelope: SaveEnvelope<TPayload>;
  readonly idempotent: boolean;
}) => Promise<
  | {
      readonly ok: true;
      readonly writes: readonly StorageWrite[];
      readonly deletes?: readonly StorageDelete[];
    }
  | { readonly ok: false; readonly reason: CareerSaveFailureReason }
>;
interface ValidCandidate<TSession extends WrStorageSession, TPayload> {
  readonly id: string;
  readonly source: 'current' | 'snapshot';
  readonly session: TSession;
  readonly envelope: SaveEnvelope<TPayload>;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalSerialize(value: unknown, ancestors: Set<object>): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON requires finite numbers.');
    }
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    throw new TypeError('Canonical JSON requires JSON-compatible values.');
  }
  if (ancestors.has(value)) {
    throw new TypeError('Canonical JSON does not support cycles.');
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new TypeError('Canonical JSON does not support sparse arrays.');
        }
        items.push(canonicalSerialize(value[index], ancestors));
      }
      return `[${items.join(',')}]`;
    }

    const record = value as UnknownRecord;
    const keys = Object.keys(record).sort(compareCodeUnits);
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalSerialize(record[key], ancestors)}`)
      .join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalStringify(value: unknown): string {
  return canonicalSerialize(value, new Set());
}

export function computeSaveChecksum(fields: SaveChecksumFields<unknown>): string {
  const bytes = new TextEncoder().encode(canonicalStringify(fields));
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function checksumFields<T>(envelope: SaveEnvelope<T>): SaveChecksumFields<T> {
  return {
    saveVersion: envelope.saveVersion,
    contentVersion: envelope.contentVersion,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    payload: envelope.payload,
  };
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function envelopeFailure(reason: CareerEnvelopeFailureReason): ValidateCareerEnvelopeResult {
  return Object.freeze({ ok: false, reason });
}

export function validateCareerSaveEnvelope(
  value: unknown,
  expectedContentVersion: string,
): ValidateCareerEnvelopeResult {
  if (!isRecord(value)) {
    return envelopeFailure('envelope.invalid_shape');
  }
  const expectedKeys = [
    'saveVersion',
    'contentVersion',
    'createdAt',
    'updatedAt',
    'checksum',
    'payload',
  ];
  if (
    Object.keys(value).length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(value, key))
  ) {
    return envelopeFailure('envelope.invalid_shape');
  }
  let snapshot: UnknownRecord;
  try {
    const cloned: unknown = structuredClone(value);
    if (!isRecord(cloned)) {
      return envelopeFailure('envelope.invalid_shape');
    }
    snapshot = cloned;
  } catch {
    return envelopeFailure('envelope.invalid_shape');
  }

  if (
    snapshot['saveVersion'] !== CURRENT_CAREER_SAVE_VERSION &&
    snapshot['saveVersion'] !== LEGACY_CAREER_SAVE_VERSION_V6 &&
    snapshot['saveVersion'] !== LEGACY_CAREER_SAVE_VERSION_V5 &&
    snapshot['saveVersion'] !== LEGACY_CAREER_SAVE_VERSION_V4 &&
    snapshot['saveVersion'] !== LEGACY_CAREER_SAVE_VERSION_V3 &&
    snapshot['saveVersion'] !== LEGACY_CAREER_SAVE_VERSION_V2 &&
    snapshot['saveVersion'] !== LEGACY_CAREER_SAVE_VERSION_V1
  ) {
    return envelopeFailure('envelope.unsupported_save_version');
  }
  if (snapshot['contentVersion'] !== expectedContentVersion) {
    return envelopeFailure('envelope.incompatible_content');
  }
  if (
    !isCanonicalIsoTimestamp(snapshot['createdAt']) ||
    !isCanonicalIsoTimestamp(snapshot['updatedAt']) ||
    snapshot['createdAt'] > snapshot['updatedAt']
  ) {
    return envelopeFailure('envelope.invalid_timestamp');
  }
  if (
    typeof snapshot['checksum'] !== 'string' ||
    !/^fnv1a32:[0-9a-f]{8}$/.test(snapshot['checksum'])
  ) {
    return envelopeFailure('envelope.invalid_shape');
  }

  const uncheckedEnvelope = snapshot as unknown as SaveEnvelope<unknown>;
  let expectedChecksum: string;
  try {
    expectedChecksum = computeSaveChecksum(checksumFields(uncheckedEnvelope));
  } catch {
    return envelopeFailure('envelope.invalid_shape');
  }
  if (snapshot['checksum'] !== expectedChecksum) {
    return envelopeFailure('envelope.checksum_mismatch');
  }

  let session: CareerSession;
  if (snapshot['saveVersion'] === CURRENT_CAREER_SAVE_VERSION) {
    const parsed = parseCareerSessionV7(snapshot['payload']);
    if (!parsed.ok) {
      return envelopeFailure(
        parsed.reason === 'session_parse.unsupported_version' ||
          parsed.issues.some(
            ({ code, path }) =>
              code === 'invariant.invalid_schema_version' &&
              path === 'session.career.schemaVersion',
          )
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    }
    session = parsed.session;
  } else if (snapshot['saveVersion'] === LEGACY_CAREER_SAVE_VERSION_V6) {
    const parsed = parseCareerSessionV6(snapshot['payload']);
    if (!parsed.ok) {
      return envelopeFailure(
        parsed.reason === 'session_parse.unsupported_version'
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    }
    try {
      session = migrateCareerSessionV6ToV7(parsed.session);
    } catch {
      return envelopeFailure('envelope.invalid_career');
    }
  } else if (snapshot['saveVersion'] === LEGACY_CAREER_SAVE_VERSION_V5) {
    const parsed = parseCareerSessionV5(snapshot['payload']);
    if (!parsed.ok) {
      return envelopeFailure(
        parsed.reason === 'session_parse.unsupported_version'
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    }
    try {
      session = migrateCareerSessionV6ToV7(migrateCareerSessionV5ToV6(parsed.session));
    } catch {
      return envelopeFailure('envelope.invalid_career');
    }
  } else if (snapshot['saveVersion'] === LEGACY_CAREER_SAVE_VERSION_V4) {
    const parsed = parseCareerRunV4(snapshot['payload']);
    if (!parsed.ok) {
      return envelopeFailure(
        parsed.reason === 'career_parse.unsupported_version'
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    }
    try {
      session = createCareerSession(
        migrateCareerRunV6ToV7(migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(parsed.career))),
      );
    } catch {
      return envelopeFailure('envelope.invalid_career');
    }
  } else if (snapshot['saveVersion'] === LEGACY_CAREER_SAVE_VERSION_V3) {
    const parsed = parseCareerRunV3(snapshot['payload']);
    if (!parsed.ok) {
      return envelopeFailure(
        parsed.reason === 'career_parse.unsupported_version'
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    }
    try {
      session = createCareerSession(
        migrateCareerRunV6ToV7(
          migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(parsed.career))),
        ),
      );
    } catch {
      return envelopeFailure('envelope.invalid_career');
    }
  } else if (snapshot['saveVersion'] === LEGACY_CAREER_SAVE_VERSION_V2) {
    const parsed = parseCareerRunV2(snapshot['payload']);
    if (!parsed.ok) {
      return envelopeFailure(
        parsed.reason === 'career_parse.unsupported_version'
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    }
    try {
      session = createCareerSession(
        migrateCareerRunV6ToV7(
          migrateCareerRunV5ToV6(
            migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(migrateCareerRunV2ToV3(parsed.career))),
          ),
        ),
      );
    } catch {
      return envelopeFailure('envelope.invalid_career');
    }
  } else {
    const parsed = parseCareerRunV1(snapshot['payload']);
    if (!parsed.ok) {
      return envelopeFailure(
        parsed.reason === 'career_parse.unsupported_version'
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    }
    try {
      session = createCareerSession(
        migrateCareerRunV6ToV7(
          migrateCareerRunV5ToV6(
            migrateCareerRunV4ToV5(
              migrateCareerRunV3ToV4(migrateCareerRunV2ToV3(migrateCareerRunV1ToV2(parsed.career))),
            ),
          ),
        ),
      );
    } catch {
      return envelopeFailure('envelope.invalid_career');
    }
  }

  let normalizedEnvelope: SaveEnvelope<CareerSession>;
  try {
    normalizedEnvelope = createEnvelope(
      session,
      expectedContentVersion,
      snapshot['createdAt'],
      snapshot['updatedAt'],
    );
  } catch {
    return envelopeFailure('envelope.invalid_career');
  }

  return Object.freeze({
    ok: true,
    envelope: normalizedEnvelope,
  });
}

function createEnvelope(
  session: CareerSession,
  contentVersion: string,
  createdAt: string,
  updatedAt: string,
): SaveEnvelope<CareerSession> {
  const fields: SaveChecksumFields<CareerSession> = {
    saveVersion: CURRENT_CAREER_SAVE_VERSION,
    contentVersion,
    createdAt,
    updatedAt,
    payload: session,
  };
  return Object.freeze({
    ...fields,
    checksum: computeSaveChecksum(fields),
  });
}

function createMetaEnvelope(
  meta: MetaProfileV1,
  contentVersion: string,
  createdAt: string,
  updatedAt: string,
): SaveEnvelope<MetaProfileV1> {
  const fields: SaveChecksumFields<MetaProfileV1> = {
    saveVersion: META_PROFILE_SAVE_VERSION,
    contentVersion,
    createdAt,
    updatedAt,
    payload: meta,
  };
  return Object.freeze({ ...fields, checksum: computeSaveChecksum(fields) });
}

export function validateMetaSaveEnvelope(
  value: unknown,
  expectedContentVersion: string,
): ValidateMetaEnvelopeResult {
  if (!isRecord(value)) return Object.freeze({ ok: false, reason: 'envelope.invalid_shape' });
  let snapshot: UnknownRecord;
  try {
    const cloned: unknown = structuredClone(value);
    if (!isRecord(cloned)) {
      return Object.freeze({ ok: false, reason: 'envelope.invalid_shape' });
    }
    snapshot = cloned;
  } catch {
    return Object.freeze({ ok: false, reason: 'envelope.invalid_shape' });
  }
  const expectedKeys = [
    'saveVersion',
    'contentVersion',
    'createdAt',
    'updatedAt',
    'checksum',
    'payload',
  ];
  if (
    Object.keys(snapshot).length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(snapshot, key))
  ) {
    return Object.freeze({ ok: false, reason: 'envelope.invalid_shape' });
  }
  if (snapshot['saveVersion'] !== META_PROFILE_SAVE_VERSION) {
    return Object.freeze({ ok: false, reason: 'envelope.unsupported_save_version' });
  }
  if (snapshot['contentVersion'] !== expectedContentVersion) {
    return Object.freeze({ ok: false, reason: 'envelope.incompatible_content' });
  }
  if (
    !isCanonicalIsoTimestamp(snapshot['createdAt']) ||
    !isCanonicalIsoTimestamp(snapshot['updatedAt']) ||
    snapshot['createdAt'] > snapshot['updatedAt']
  ) {
    return Object.freeze({ ok: false, reason: 'envelope.invalid_timestamp' });
  }
  if (
    typeof snapshot['checksum'] !== 'string' ||
    !/^fnv1a32:[0-9a-f]{8}$/.test(snapshot['checksum'])
  ) {
    return Object.freeze({ ok: false, reason: 'envelope.invalid_shape' });
  }
  const unchecked = snapshot as unknown as SaveEnvelope<unknown>;
  let expectedChecksum: string;
  try {
    expectedChecksum = computeSaveChecksum(checksumFields(unchecked));
  } catch {
    return Object.freeze({ ok: false, reason: 'envelope.invalid_shape' });
  }
  if (snapshot['checksum'] !== expectedChecksum) {
    return Object.freeze({ ok: false, reason: 'envelope.checksum_mismatch' });
  }
  const parsed = parseMetaProfile(snapshot['payload']);
  if (!parsed.ok) {
    return Object.freeze({
      ok: false,
      reason:
        parsed.reason === 'session_parse.unsupported_version'
          ? 'envelope.unsupported_save_version'
          : 'envelope.invalid_career',
    });
  }
  return Object.freeze({
    ok: true,
    envelope: createMetaEnvelope(
      parsed.meta,
      expectedContentVersion,
      snapshot['createdAt'],
      snapshot['updatedAt'],
    ),
  });
}

function snapshotId(session: WrStorageSession, updatedAt: string): string {
  return `${session.career.id}:${String(session.career.revision).padStart(16, '0')}:${updatedAt}`;
}

function compareCandidates<TSession extends WrStorageSession, TPayload>(
  left: ValidCandidate<TSession, TPayload>,
  right: ValidCandidate<TSession, TPayload>,
): number {
  const timestampOrder = compareCodeUnits(right.envelope.updatedAt, left.envelope.updatedAt);
  if (timestampOrder !== 0) {
    return timestampOrder;
  }
  const revisionOrder = right.session.career.revision - left.session.career.revision;
  if (revisionOrder !== 0) {
    return revisionOrder;
  }
  if (left.source !== right.source) {
    return left.source === 'current' ? -1 : 1;
  }
  return compareCodeUnits(right.id, left.id);
}

const CAREER_PERSISTENCE_LOCK_NAME = CAREER_STORAGE_LOCK_NAME;

function freezeFailures(
  failures: readonly CareerEnvelopeFailure[],
): readonly CareerEnvelopeFailure[] {
  return Object.freeze(failures.map((entry) => Object.freeze({ ...entry })));
}

function isProtectedEnvelopeFailure(reason: CareerEnvelopeFailureReason): boolean {
  return (
    reason === 'envelope.unsupported_save_version' ||
    reason === 'envelope.incompatible_content' ||
    reason === 'envelope.unsupported_career_version'
  );
}

function isPrunableCorruptSnapshot(reason: CareerEnvelopeFailureReason): boolean {
  return !isProtectedEnvelopeFailure(reason);
}

function validatedSnapshotCandidates<TSession extends WrStorageSession, TPayload>(
  entries: readonly StorageEntry<unknown>[],
  contentVersion: string,
  codec: WrPersistenceCodec<TSession, TPayload>,
): {
  readonly candidates: readonly ValidCandidate<TSession, TPayload>[];
  readonly failures: readonly CareerEnvelopeFailure[];
} {
  const candidates: ValidCandidate<TSession, TPayload>[] = [];
  const failures: CareerEnvelopeFailure[] = [];
  for (const entry of entries) {
    if (codec.ownsSnapshot !== undefined && !codec.ownsSnapshot(entry.id)) continue;
    const validation = codec.readEnvelope(entry.value, contentVersion);
    if (validation.ok) {
      candidates.push({
        id: entry.id,
        source: 'snapshot',
        session: validation.session,
        envelope: validation.envelope,
      });
    } else {
      failures.push({
        id: entry.id,
        store: 'autosaveSnapshots',
        reason: validation.reason,
      });
    }
  }
  return { candidates, failures };
}

export class WrCareerPersistenceEngine<TSession extends WrStorageSession, TPayload> {
  private readonly contentVersion: string;
  private readonly now: () => Date;
  private writeTail: Promise<void> = Promise.resolve();

  public constructor(
    private readonly storage: StorageAdapter,
    options: CareerPersistenceOptions,
    private readonly codec: WrPersistenceCodec<TSession, TPayload>,
  ) {
    if (
      typeof options.contentVersion !== 'string' ||
      options.contentVersion.length < 1 ||
      options.contentVersion.length > 64
    ) {
      throw new RangeError('Career persistence requires a bounded content version.');
    }
    this.contentVersion = options.contentVersion;
    this.now = options.now ?? (() => new Date());
  }

  public saveCareer(career: TSession['career']): Promise<SaveCareerResult<TPayload>> {
    return this.enqueueSave(career, false);
  }

  public saveSession(session: TSession): Promise<SaveCareerResult<TPayload>> {
    return this.enqueueSessionSave(session, false);
  }

  /** Explicitly replaces another, unreadable, or future/content-incompatible active career. */
  public replaceCurrentCareer(career: TSession['career']): Promise<SaveCareerResult<TPayload>> {
    return this.enqueueSave(career, true);
  }

  /** Explicitly replaces the active aggregate, including its linked world state. */
  public replaceCurrentSession(session: TSession): Promise<SaveCareerResult<TPayload>> {
    return this.enqueueSessionSave(session, true);
  }

  public async loadCareer(): Promise<LoadCareerResult<TSession, TPayload>> {
    await this.writeTail;
    try {
      return await this.storage.runExclusive(CAREER_PERSISTENCE_LOCK_NAME, () =>
        this.performLoad(),
      );
    } catch {
      return Object.freeze({
        ok: false,
        reason: 'career_load.storage_error',
        skippedEntries: [],
        warnings: [],
      });
    }
  }

  private enqueueSave(
    career: TSession['career'],
    allowReplacement: boolean,
  ): Promise<SaveCareerResult<TPayload>> {
    const parsedCareer = this.codec.parseCareer(career);
    if (!parsedCareer.ok) {
      return Promise.resolve(
        Object.freeze({ ok: false, reason: 'career_save.invalid_career' as const }),
      );
    }
    const careerSnapshot = parsedCareer.career;
    const save = this.writeTail
      .then(() =>
        this.storage.runExclusive(CAREER_PERSISTENCE_LOCK_NAME, () =>
          this.performSave(careerSnapshot, allowReplacement),
        ),
      )
      .catch(() =>
        Object.freeze({
          ok: false as const,
          reason: 'career_save.storage_error' as const,
        }),
      );
    this.writeTail = save.then(
      () => undefined,
      () => undefined,
    );
    return save;
  }

  protected enqueueSessionSave(
    session: TSession,
    allowReplacement: boolean,
    transaction?: WrSaveTransaction<TSession, TPayload>,
  ): Promise<SaveCareerResult<TPayload>> {
    const parsed = this.codec.parseSession(session);
    if (!parsed.ok) {
      return Promise.resolve(
        Object.freeze({ ok: false, reason: 'career_save.invalid_career' as const }),
      );
    }
    const sessionSnapshot = parsed.session;
    const save = this.writeTail
      .then(() =>
        this.storage.runExclusive(CAREER_PERSISTENCE_LOCK_NAME, () =>
          this.performSave(sessionSnapshot.career, allowReplacement, sessionSnapshot, transaction),
        ),
      )
      .catch(() =>
        Object.freeze({ ok: false as const, reason: 'career_save.storage_error' as const }),
      );
    this.writeTail = save.then(
      () => undefined,
      () => undefined,
    );
    return save;
  }

  private async performLoad(): Promise<LoadCareerResult<TSession, TPayload>> {
    const warnings: CareerLoadWarning[] = [];
    const skippedEntries: CareerEnvelopeFailure[] = [];
    let currentValue: unknown;
    let snapshotEntries: readonly StorageEntry<unknown>[] = [];
    let currentReadFailed = false;
    let snapshotReadFailed = false;

    try {
      currentValue = await this.storage.get('currentCareer', CURRENT_CAREER_STORAGE_ID);
    } catch {
      currentReadFailed = true;
      warnings.push('career_load.current_unavailable');
    }
    try {
      snapshotEntries = await this.storage.list('autosaveSnapshots');
    } catch {
      snapshotReadFailed = true;
      warnings.push('career_load.snapshots_unavailable');
    }

    const candidates: ValidCandidate<TSession, TPayload>[] = [];
    if (!currentReadFailed && currentValue !== undefined) {
      const validation = this.codec.readEnvelope(currentValue, this.contentVersion);
      if (validation.ok) {
        candidates.push({
          id: CURRENT_CAREER_STORAGE_ID,
          source: 'current',
          session: validation.session,
          envelope: validation.envelope,
        });
      } else {
        skippedEntries.push({
          id: CURRENT_CAREER_STORAGE_ID,
          store: 'currentCareer',
          reason: validation.reason,
        });
      }
    }

    const snapshots = validatedSnapshotCandidates(snapshotEntries, this.contentVersion, this.codec);
    candidates.push(...snapshots.candidates);
    skippedEntries.push(...snapshots.failures);

    candidates.sort(compareCandidates);
    const selected = candidates[0];
    if (selected !== undefined) {
      return Object.freeze({
        ok: true,
        career: selected.session.career,
        session: selected.session,
        envelope: selected.envelope,
        source: selected.source,
        recovered: selected.source === 'snapshot',
        skippedEntries: freezeFailures(skippedEntries),
        warnings: Object.freeze(warnings),
      });
    }

    if (currentReadFailed || snapshotReadFailed) {
      return Object.freeze({
        ok: false,
        reason: 'career_load.storage_error',
        skippedEntries: freezeFailures(skippedEntries),
        warnings: Object.freeze(warnings),
      });
    }
    if (
      currentValue === undefined &&
      snapshotEntries.every(
        ({ id }) => this.codec.ownsSnapshot !== undefined && !this.codec.ownsSnapshot(id),
      )
    ) {
      return Object.freeze({
        ok: false,
        reason: 'career_load.not_found',
        skippedEntries: freezeFailures(skippedEntries),
        warnings: Object.freeze(warnings),
      });
    }
    return Object.freeze({
      ok: false,
      reason: 'career_load.no_valid_save',
      skippedEntries: freezeFailures(skippedEntries),
      warnings: Object.freeze(warnings),
    });
  }

  private async performSave(
    careerSnapshot: TSession['career'],
    allowReplacement: boolean,
    suppliedSession?: TSession,
    transaction?: WrSaveTransaction<TSession, TPayload>,
  ): Promise<SaveCareerResult<TPayload>> {
    let currentValue: unknown;
    let snapshotEntries: readonly StorageEntry<unknown>[];
    try {
      const activeKind = await this.storage.get<ActiveCareerKind>(
        'settings',
        ACTIVE_CAREER_KIND_STORAGE_ID,
      );
      if (!allowReplacement && (activeKind === 'NONE' || activeKind === 'POSITION_ALPHA')) {
        return Object.freeze({ ok: false, reason: 'career_save.different_career' });
      }
      currentValue = await this.storage.get('currentCareer', CURRENT_CAREER_STORAGE_ID);
    } catch {
      return Object.freeze({
        ok: false,
        reason: 'career_save.storage_error',
        stage: 'read_current',
      });
    }
    try {
      snapshotEntries = await this.storage.list('autosaveSnapshots');
    } catch {
      return Object.freeze({
        ok: false,
        reason: 'career_save.storage_error',
        stage: 'read_snapshots',
      });
    }

    const snapshotValidation = validatedSnapshotCandidates(
      snapshotEntries,
      this.contentVersion,
      this.codec,
    );
    const candidates = [...snapshotValidation.candidates];
    const currentValidation = this.codec.readEnvelope(currentValue, this.contentVersion);
    if (currentValue !== undefined) {
      if (currentValidation.ok) {
        candidates.push({
          id: CURRENT_CAREER_STORAGE_ID,
          source: 'current',
          session: currentValidation.session,
          envelope: currentValidation.envelope,
        });
      } else if (
        !allowReplacement &&
        (isProtectedEnvelopeFailure(currentValidation.reason) ||
          !candidates.some(({ session }) => session.career.id === careerSnapshot.id))
      ) {
        return Object.freeze({ ok: false, reason: 'career_save.protected_existing_save' });
      }
    }

    candidates.sort(compareCandidates);
    const latestGlobal = candidates[0];
    const sameCareer = candidates
      .filter(({ session }) => session.career.id === careerSnapshot.id)
      .sort(compareCandidates)[0];
    if (
      !allowReplacement &&
      latestGlobal !== undefined &&
      latestGlobal.session.career.id !== careerSnapshot.id
    ) {
      return Object.freeze({ ok: false, reason: 'career_save.different_career' });
    }
    if (!allowReplacement && sameCareer !== undefined) {
      const existingRevision = sameCareer.session.career.revision;
      const existingWorldRevision = sameCareer.session.world.revision;
      const incomingWorldRevision = suppliedSession?.world.revision;
      if (
        existingRevision > careerSnapshot.revision ||
        (incomingWorldRevision !== undefined && existingWorldRevision > incomingWorldRevision)
      ) {
        return Object.freeze({ ok: false, reason: 'career_save.stale_revision' });
      }
      if (
        existingRevision === careerSnapshot.revision &&
        (incomingWorldRevision === undefined || existingWorldRevision === incomingWorldRevision)
      ) {
        if (
          canonicalStringify(
            suppliedSession === undefined ? sameCareer.session.career : sameCareer.session,
          ) !== canonicalStringify(suppliedSession ?? careerSnapshot)
        ) {
          return Object.freeze({ ok: false, reason: 'career_save.conflicting_revision' });
        }
        const restoreCurrent =
          !currentValidation.ok ||
          currentValidation.session.career.id !== careerSnapshot.id ||
          canonicalStringify(
            suppliedSession === undefined
              ? currentValidation.session.career
              : currentValidation.session,
          ) !== canonicalStringify(suppliedSession ?? careerSnapshot);
        if (transaction !== undefined) {
          const extra = await transaction({
            storage: this.storage,
            previous: sameCareer,
            session: sameCareer.session,
            envelope: sameCareer.envelope,
            idempotent: true,
          });
          if (!extra.ok) return extra;
          try {
            await this.storage.putMany(
              [
                ...extra.writes,
                ...(restoreCurrent
                  ? [
                      {
                        storeName: 'currentCareer' as const,
                        id: CURRENT_CAREER_STORAGE_ID,
                        value: sameCareer.envelope,
                      },
                    ]
                  : []),
              ],
              [],
              extra.deletes,
            );
          } catch {
            return Object.freeze({
              ok: false,
              reason: 'career_save.storage_error',
              stage: 'write_current',
            });
          }
        } else if (restoreCurrent) {
          try {
            await this.storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, sameCareer.envelope);
          } catch {
            return Object.freeze({
              ok: false,
              reason: 'career_save.storage_error',
              stage: 'write_current',
            });
          }
        }
        return Object.freeze({
          ok: true,
          envelope: sameCareer.envelope,
          snapshotId: null,
          prunedSnapshotCount: 0,
          retentionWarning: false,
        });
      }
    }

    let now: Date;
    try {
      now = this.now();
    } catch {
      return Object.freeze({ ok: false, reason: 'career_save.invalid_clock' });
    }
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      return Object.freeze({ ok: false, reason: 'career_save.invalid_clock' });
    }
    const latestTimestampMs =
      latestGlobal === undefined
        ? Number.NEGATIVE_INFINITY
        : Date.parse(latestGlobal.envelope.updatedAt);
    const updatedAtDate = new Date(Math.max(now.getTime(), latestTimestampMs + 1));
    if (!Number.isFinite(updatedAtDate.getTime())) {
      return Object.freeze({ ok: false, reason: 'career_save.invalid_clock' });
    }
    const updatedAt = updatedAtDate.toISOString();
    const createdAt =
      !allowReplacement && sameCareer !== undefined ? sameCareer.envelope.createdAt : updatedAt;
    const sessionSnapshot =
      suppliedSession ??
      (!allowReplacement && sameCareer !== undefined
        ? Object.freeze({
            ...sameCareer.session,
            career: careerSnapshot,
          })
        : this.codec.createSession(careerSnapshot));
    const parsedSession = this.codec.parseSession(sessionSnapshot);
    if (!parsedSession.ok) {
      return Object.freeze({ ok: false, reason: 'career_save.invalid_career' });
    }
    const envelope = this.codec.makeEnvelope(
      parsedSession.session,
      this.contentVersion,
      createdAt,
      updatedAt,
    );
    if (envelope === null)
      return Object.freeze({ ok: false, reason: 'career_save.invalid_career' });
    const nextSnapshotId = snapshotId(parsedSession.session, updatedAt);
    const extra =
      transaction === undefined
        ? { ok: true as const, writes: [] }
        : await transaction({
            storage: this.storage,
            previous: sameCareer ?? null,
            session: parsedSession.session,
            envelope,
            idempotent: false,
          });
    if (!extra.ok) return extra;

    let previousProof =
      this.codec.preservePreviousEnvelope && currentValidation.ok
        ? {
            id: snapshotId(currentValidation.session, currentValidation.envelope.updatedAt),
            value: currentValidation.envelope,
          }
        : null;
    if (previousProof !== null) {
      const proofId = previousProof.id;
      const existing = snapshotEntries.find(({ id }) => id === proofId);
      if (
        existing !== undefined &&
        (!this.codec.readEnvelope(existing.value, this.contentVersion).ok ||
          canonicalStringify(existing.value) !== canonicalStringify(previousProof.value))
      )
        previousProof = {
          ...previousProof,
          id: `${previousProof.id}:original:${previousProof.value.saveVersion}:${previousProof.value.checksum}`,
        };
    }
    try {
      await this.storage.putMany(
        [
          ...extra.writes,
          ...(previousProof === null
            ? []
            : [{ storeName: 'autosaveSnapshots' as const, ...previousProof }]),
          { storeName: 'autosaveSnapshots', id: nextSnapshotId, value: envelope },
          { storeName: 'currentCareer', id: CURRENT_CAREER_STORAGE_ID, value: envelope },
          {
            storeName: 'settings',
            id: ACTIVE_CAREER_KIND_STORAGE_ID,
            value: 'WR' satisfies ActiveCareerKind,
          },
        ],
        [],
        'deletes' in extra ? extra.deletes : undefined,
      );
    } catch {
      return Object.freeze({
        ok: false,
        reason: 'career_save.storage_error',
        stage: 'write_session',
      });
    }

    const afterWrite = new Map(snapshotEntries.map((entry) => [entry.id, entry]));
    if (previousProof !== null) afterWrite.set(previousProof.id, previousProof);
    afterWrite.set(nextSnapshotId, { id: nextSnapshotId, value: envelope });
    const classified = validatedSnapshotCandidates(
      [...afterWrite.values()],
      this.contentVersion,
      this.codec,
    );
    const deletionIds = new Set(
      classified.failures
        .filter(({ reason }) => isPrunableCorruptSnapshot(reason))
        .map(({ id }) => id),
    );
    const validNewestFirst = [...classified.candidates].sort(compareCandidates);
    for (const candidate of validNewestFirst.slice(CAREER_SNAPSHOT_RETENTION)) {
      deletionIds.add(candidate.id);
    }

    let prunedSnapshotCount = 0;
    let retentionWarning = false;
    for (const id of [...deletionIds].sort(compareCodeUnits)) {
      try {
        await this.storage.delete('autosaveSnapshots', id);
        prunedSnapshotCount += 1;
      } catch {
        retentionWarning = true;
      }
    }

    return Object.freeze({
      ok: true,
      envelope,
      snapshotId: nextSnapshotId,
      prunedSnapshotCount,
      retentionWarning,
    });
  }
}

const legacyWrCodec: WrPersistenceCodec<CareerSession, CareerSession> = {
  parseCareer: parseCareerRunV7,
  parseSession: parseCareerSession,
  createSession: createCareerSession,
  readEnvelope: (value, contentVersion) => {
    const parsed = validateCareerSaveEnvelope(value, contentVersion);
    return parsed.ok ? { ...parsed, session: parsed.envelope.payload } : parsed;
  },
  makeEnvelope: createEnvelope,
};

/** Literal shipping v7 facade; the versioned codec seam does not select new rules. */
export class CareerPersistence extends WrCareerPersistenceEngine<CareerSession, CareerSession> {
  public constructor(storage: StorageAdapter, options: CareerPersistenceOptions) {
    super(storage, options, legacyWrCodec);
  }
}

const META_PERSISTENCE_LOCK_NAME = CAREER_PERSISTENCE_LOCK_NAME;

export class MetaProfilePersistence {
  private readonly contentVersion: string;
  private readonly now: () => Date;
  private writeTail: Promise<void> = Promise.resolve();

  public constructor(
    private readonly storage: StorageAdapter,
    options: CareerPersistenceOptions,
  ) {
    if (
      typeof options.contentVersion !== 'string' ||
      options.contentVersion.length < 1 ||
      options.contentVersion.length > 64
    ) {
      throw new RangeError('Meta persistence requires a bounded content version.');
    }
    this.contentVersion = options.contentVersion;
    this.now = options.now ?? (() => new Date());
  }

  public async loadMetaProfile(): Promise<LoadMetaProfileResult> {
    await this.writeTail;
    try {
      return await this.storage.runExclusive(META_PERSISTENCE_LOCK_NAME, async () => {
        const value = await this.storage.get('profile', META_PROFILE_STORAGE_ID);
        if (value === undefined) {
          return Object.freeze({
            ok: true as const,
            meta: createEmptyMetaProfile(),
            envelope: null,
            source: 'default' as const,
          });
        }
        const validation = validateMetaSaveEnvelope(value, this.contentVersion);
        if (!validation.ok) {
          return Object.freeze({
            ok: false as const,
            reason:
              validation.reason === 'envelope.unsupported_save_version' ||
              validation.reason === 'envelope.incompatible_content'
                ? ('meta_load.protected_save' as const)
                : ('meta_load.invalid_save' as const),
          });
        }
        return Object.freeze({
          ok: true as const,
          meta: validation.envelope.payload,
          envelope: validation.envelope,
          source: 'stored' as const,
        });
      });
    } catch {
      return Object.freeze({ ok: false, reason: 'meta_load.storage_error' });
    }
  }

  public saveMetaProfile(meta: MetaProfileV1): Promise<SaveMetaProfileResult> {
    const parsed = parseMetaProfile(meta);
    if (!parsed.ok) {
      return Promise.resolve(Object.freeze({ ok: false, reason: 'meta_save.invalid_meta' }));
    }
    const snapshot = parsed.meta;
    const save = this.writeTail
      .then(() =>
        this.storage.runExclusive(META_PERSISTENCE_LOCK_NAME, () => this.performSave(snapshot)),
      )
      .catch(() =>
        Object.freeze({ ok: false as const, reason: 'meta_save.storage_error' as const }),
      );
    this.writeTail = save.then(
      () => undefined,
      () => undefined,
    );
    return save;
  }

  private async performSave(meta: MetaProfileV1): Promise<SaveMetaProfileResult> {
    let current: unknown;
    try {
      current = await this.storage.get('profile', META_PROFILE_STORAGE_ID);
    } catch {
      return Object.freeze({ ok: false, reason: 'meta_save.storage_error' });
    }
    let existing: SaveEnvelope<MetaProfileV1> | undefined;
    if (current !== undefined) {
      const validation = validateMetaSaveEnvelope(current, this.contentVersion);
      if (!validation.ok) {
        if (
          validation.reason === 'envelope.unsupported_save_version' ||
          validation.reason === 'envelope.incompatible_content'
        ) {
          return Object.freeze({ ok: false, reason: 'meta_save.protected_existing_save' });
        }
        return Object.freeze({ ok: false, reason: 'meta_save.storage_error' });
      }
      existing = validation.envelope;
      if (existing.payload.revision > meta.revision) {
        return Object.freeze({ ok: false, reason: 'meta_save.stale_revision' });
      }
      if (existing.payload.revision === meta.revision) {
        if (canonicalStringify(existing.payload) !== canonicalStringify(meta)) {
          return Object.freeze({ ok: false, reason: 'meta_save.conflicting_revision' });
        }
        return Object.freeze({ ok: true, envelope: existing });
      }
    }
    let now: Date;
    try {
      now = this.now();
    } catch {
      return Object.freeze({ ok: false, reason: 'meta_save.invalid_clock' });
    }
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      return Object.freeze({ ok: false, reason: 'meta_save.invalid_clock' });
    }
    const minimumTime = existing === undefined ? now.getTime() : Date.parse(existing.updatedAt) + 1;
    const updatedAtDate = new Date(Math.max(now.getTime(), minimumTime));
    if (!Number.isFinite(updatedAtDate.getTime())) {
      return Object.freeze({ ok: false, reason: 'meta_save.invalid_clock' });
    }
    const updatedAt = updatedAtDate.toISOString();
    const envelope = createMetaEnvelope(
      meta,
      this.contentVersion,
      existing?.createdAt ?? updatedAt,
      updatedAt,
    );
    try {
      await this.storage.put('profile', META_PROFILE_STORAGE_ID, envelope);
    } catch {
      return Object.freeze({ ok: false, reason: 'meta_save.storage_error' });
    }
    return Object.freeze({ ok: true, envelope });
  }
}

export class CareerCompletionPersistence {
  private readonly contentVersion: string;
  private readonly now: () => Date;
  private writeTail: Promise<void> = Promise.resolve();

  public constructor(
    private readonly storage: StorageAdapter,
    options: CareerPersistenceOptions,
  ) {
    if (
      typeof options.contentVersion !== 'string' ||
      options.contentVersion.length < 1 ||
      options.contentVersion.length > 64
    ) {
      throw new RangeError('Career completion persistence requires a bounded content version.');
    }
    this.contentVersion = options.contentVersion;
    this.now = options.now ?? (() => new Date());
  }

  public saveCompletedCareer(
    session: CareerSession,
    meta: MetaProfileV1,
  ): Promise<SaveCareerCompletionResult> {
    const parsedSession = parseCareerSession(session);
    const parsedMeta = parseMetaProfile(meta);
    if (
      !parsedSession.ok ||
      !parsedMeta.ok ||
      parsedSession.session.career.phase.type !== 'CAREER_COMPLETE' ||
      parsedSession.session.career.seasonCareerState.bootstrapStatus !== 'COMPLETE' ||
      !parsedMeta.meta.alumni.some(({ careerId }) => careerId === parsedSession.session.career.id)
    ) {
      return Promise.resolve(
        Object.freeze({ ok: false, reason: 'career_completion_save.invalid_state' }),
      );
    }
    const sessionSnapshot = parsedSession.session;
    const metaSnapshot = parsedMeta.meta;
    const save = this.writeTail
      .then(() =>
        this.storage.runExclusive(CAREER_PERSISTENCE_LOCK_NAME, () =>
          this.performSave(sessionSnapshot, metaSnapshot),
        ),
      )
      .catch(() =>
        Object.freeze({
          ok: false as const,
          reason: 'career_completion_save.storage_error' as const,
        }),
      );
    this.writeTail = save.then(
      () => undefined,
      () => undefined,
    );
    return save;
  }

  private async performSave(
    session: CareerSession,
    meta: MetaProfileV1,
  ): Promise<SaveCareerCompletionResult> {
    let currentValue: unknown;
    let metaValue: unknown;
    try {
      const activeKind = await this.storage.get<ActiveCareerKind>(
        'settings',
        ACTIVE_CAREER_KIND_STORAGE_ID,
      );
      if (activeKind === 'NONE' || activeKind === 'POSITION_ALPHA') {
        return Object.freeze({
          ok: false,
          reason: 'career_completion_save.protected_existing_save',
        });
      }
      [currentValue, metaValue] = await Promise.all([
        this.storage.get('currentCareer', CURRENT_CAREER_STORAGE_ID),
        this.storage.get('profile', META_PROFILE_STORAGE_ID),
      ]);
    } catch {
      return Object.freeze({ ok: false, reason: 'career_completion_save.storage_error' });
    }
    const current = validateCareerSaveEnvelope(currentValue, this.contentVersion);
    if (!current.ok) {
      return Object.freeze({
        ok: false,
        reason:
          currentValue !== undefined && isProtectedEnvelopeFailure(current.reason)
            ? 'career_completion_save.protected_existing_save'
            : 'career_completion_save.storage_error',
      });
    }
    const existingMeta =
      metaValue === undefined
        ? undefined
        : validateMetaSaveEnvelope(metaValue, this.contentVersion);
    if (existingMeta !== undefined && !existingMeta.ok) {
      return Object.freeze({
        ok: false,
        reason:
          existingMeta.reason === 'envelope.unsupported_save_version' ||
          existingMeta.reason === 'envelope.incompatible_content'
            ? 'career_completion_save.protected_existing_save'
            : 'career_completion_save.storage_error',
      });
    }
    if (current.envelope.payload.career.id !== session.career.id) {
      return Object.freeze({
        ok: false,
        reason: 'career_completion_save.protected_existing_save',
      });
    }
    const priorCareerRevision = current.envelope.payload.career.revision;
    const priorMetaRevision = existingMeta?.ok ? existingMeta.envelope.payload.revision : 0;
    if (priorCareerRevision > session.career.revision || priorMetaRevision > meta.revision) {
      return Object.freeze({ ok: false, reason: 'career_completion_save.stale_revision' });
    }
    if (
      priorCareerRevision + 1 !== session.career.revision ||
      priorMetaRevision + 1 !== meta.revision
    ) {
      return Object.freeze({ ok: false, reason: 'career_completion_save.conflicting_revision' });
    }

    let now: Date;
    try {
      now = this.now();
    } catch {
      return Object.freeze({ ok: false, reason: 'career_completion_save.invalid_clock' });
    }
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      return Object.freeze({ ok: false, reason: 'career_completion_save.invalid_clock' });
    }
    const latestStoredTimestamp = Math.max(
      Date.parse(current.envelope.updatedAt),
      existingMeta?.ok ? Date.parse(existingMeta.envelope.updatedAt) : Number.NEGATIVE_INFINITY,
    );
    const updatedAtDate = new Date(Math.max(now.getTime(), latestStoredTimestamp + 1));
    if (!Number.isFinite(updatedAtDate.getTime())) {
      return Object.freeze({ ok: false, reason: 'career_completion_save.invalid_clock' });
    }
    const updatedAt = updatedAtDate.toISOString();
    const careerEnvelope = createEnvelope(
      session,
      this.contentVersion,
      current.envelope.createdAt,
      updatedAt,
    );
    const metaEnvelope = createMetaEnvelope(
      meta,
      this.contentVersion,
      existingMeta?.ok ? existingMeta.envelope.createdAt : updatedAt,
      updatedAt,
    );
    const nextSnapshotId = snapshotId(session, updatedAt);
    try {
      await this.storage.putMany([
        { storeName: 'autosaveSnapshots', id: nextSnapshotId, value: careerEnvelope },
        { storeName: 'currentCareer', id: CURRENT_CAREER_STORAGE_ID, value: careerEnvelope },
        { storeName: 'profile', id: META_PROFILE_STORAGE_ID, value: metaEnvelope },
        {
          storeName: 'settings',
          id: ACTIVE_CAREER_KIND_STORAGE_ID,
          value: 'WR' satisfies ActiveCareerKind,
        },
      ]);
    } catch {
      return Object.freeze({ ok: false, reason: 'career_completion_save.storage_error' });
    }
    return Object.freeze({
      ok: true,
      careerEnvelope,
      metaEnvelope,
      snapshotId: nextSnapshotId,
    });
  }
}
