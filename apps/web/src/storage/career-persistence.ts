import {
  migrateCareerRunV1ToV2,
  migrateCareerRunV2ToV3,
  parseCareerRunV1,
  parseCareerRunV2,
  parseCareerRunV3,
  type CareerRun,
} from '@project-saturday/game-core';
import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';

import type { SaveEnvelope, StorageAdapter, StorageEntry } from './storage';

const LEGACY_CAREER_SAVE_VERSION_V1 = 1 as const;
const LEGACY_CAREER_SAVE_VERSION_V2 = 2 as const;
export const CURRENT_CAREER_SAVE_VERSION = 3 as const;
export const CURRENT_CAREER_STORAGE_ID = 'active' as const;
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
  'read_current' | 'read_snapshots' | 'write_snapshot' | 'write_current';

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
      readonly envelope: SaveEnvelope<CareerRun>;
    }
  | {
      readonly ok: false;
      readonly reason: CareerEnvelopeFailureReason;
    };

export type SaveCareerResult =
  | {
      readonly ok: true;
      readonly envelope: SaveEnvelope<CareerRun>;
      readonly snapshotId: string | null;
      readonly prunedSnapshotCount: number;
      readonly retentionWarning: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: CareerSaveFailureReason;
      readonly stage?: CareerSaveFailureStage;
    };

export type LoadCareerResult =
  | {
      readonly ok: true;
      readonly career: CareerRun;
      readonly envelope: SaveEnvelope<CareerRun>;
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

type UnknownRecord = Record<string, unknown>;

export interface SaveChecksumFields<T> {
  readonly saveVersion: number;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly payload: T;
}

interface ValidCandidate {
  readonly id: string;
  readonly source: 'current' | 'snapshot';
  readonly envelope: SaveEnvelope<CareerRun>;
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

  let career: CareerRun;
  if (snapshot['saveVersion'] === CURRENT_CAREER_SAVE_VERSION) {
    const parsed = parseCareerRunV3(snapshot['payload']);
    if (!parsed.ok) {
      return envelopeFailure(
        parsed.reason === 'career_parse.unsupported_version'
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    }
    career = parsed.career;
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
      career = migrateCareerRunV2ToV3(parsed.career);
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
      career = migrateCareerRunV2ToV3(migrateCareerRunV1ToV2(parsed.career));
    } catch {
      return envelopeFailure('envelope.invalid_career');
    }
  }

  let normalizedEnvelope: SaveEnvelope<CareerRun>;
  try {
    normalizedEnvelope = createEnvelope(
      career,
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
  career: CareerRun,
  contentVersion: string,
  createdAt: string,
  updatedAt: string,
): SaveEnvelope<CareerRun> {
  const fields: SaveChecksumFields<CareerRun> = {
    saveVersion: CURRENT_CAREER_SAVE_VERSION,
    contentVersion,
    createdAt,
    updatedAt,
    payload: career,
  };
  return Object.freeze({
    ...fields,
    checksum: computeSaveChecksum(fields),
  });
}

function snapshotId(career: CareerRun, updatedAt: string): string {
  return `${career.id}:${String(career.revision).padStart(16, '0')}:${updatedAt}`;
}

function compareCandidates(left: ValidCandidate, right: ValidCandidate): number {
  const timestampOrder = compareCodeUnits(right.envelope.updatedAt, left.envelope.updatedAt);
  if (timestampOrder !== 0) {
    return timestampOrder;
  }
  const revisionOrder = right.envelope.payload.revision - left.envelope.payload.revision;
  if (revisionOrder !== 0) {
    return revisionOrder;
  }
  if (left.source !== right.source) {
    return left.source === 'current' ? -1 : 1;
  }
  return compareCodeUnits(right.id, left.id);
}

const CAREER_PERSISTENCE_LOCK_NAME = 'career-save-v1';

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

function validatedSnapshotCandidates(
  entries: readonly StorageEntry<unknown>[],
  contentVersion: string,
): {
  readonly candidates: readonly ValidCandidate[];
  readonly failures: readonly CareerEnvelopeFailure[];
} {
  const candidates: ValidCandidate[] = [];
  const failures: CareerEnvelopeFailure[] = [];
  for (const entry of entries) {
    const validation = validateCareerSaveEnvelope(entry.value, contentVersion);
    if (validation.ok) {
      candidates.push({ id: entry.id, source: 'snapshot', envelope: validation.envelope });
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

export class CareerPersistence {
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
      throw new RangeError('Career persistence requires a bounded content version.');
    }
    this.contentVersion = options.contentVersion;
    this.now = options.now ?? (() => new Date());
  }

  public saveCareer(career: CareerRun): Promise<SaveCareerResult> {
    return this.enqueueSave(career, false);
  }

  /** Explicitly replaces another, unreadable, or future/content-incompatible active career. */
  public replaceCurrentCareer(career: CareerRun): Promise<SaveCareerResult> {
    return this.enqueueSave(career, true);
  }

  public async loadCareer(): Promise<LoadCareerResult> {
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

  private enqueueSave(career: CareerRun, allowReplacement: boolean): Promise<SaveCareerResult> {
    const parsedCareer = parseCareerRunV3(career);
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

  private async performLoad(): Promise<LoadCareerResult> {
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

    const candidates: ValidCandidate[] = [];
    if (!currentReadFailed && currentValue !== undefined) {
      const validation = validateCareerSaveEnvelope(currentValue, this.contentVersion);
      if (validation.ok) {
        candidates.push({
          id: CURRENT_CAREER_STORAGE_ID,
          source: 'current',
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

    const snapshots = validatedSnapshotCandidates(snapshotEntries, this.contentVersion);
    candidates.push(...snapshots.candidates);
    skippedEntries.push(...snapshots.failures);

    candidates.sort(compareCandidates);
    const selected = candidates[0];
    if (selected !== undefined) {
      return Object.freeze({
        ok: true,
        career: selected.envelope.payload,
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
    if (currentValue === undefined && snapshotEntries.length === 0) {
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
    careerSnapshot: CareerRun,
    allowReplacement: boolean,
  ): Promise<SaveCareerResult> {
    let currentValue: unknown;
    let snapshotEntries: readonly StorageEntry<unknown>[];
    try {
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

    const snapshotValidation = validatedSnapshotCandidates(snapshotEntries, this.contentVersion);
    const candidates = [...snapshotValidation.candidates];
    const currentValidation = validateCareerSaveEnvelope(currentValue, this.contentVersion);
    if (currentValue !== undefined) {
      if (currentValidation.ok) {
        candidates.push({
          id: CURRENT_CAREER_STORAGE_ID,
          source: 'current',
          envelope: currentValidation.envelope,
        });
      } else if (
        !allowReplacement &&
        (isProtectedEnvelopeFailure(currentValidation.reason) ||
          !candidates.some(({ envelope }) => envelope.payload.id === careerSnapshot.id))
      ) {
        return Object.freeze({ ok: false, reason: 'career_save.protected_existing_save' });
      }
    }

    candidates.sort(compareCandidates);
    const latestGlobal = candidates[0];
    const sameCareer = candidates
      .filter(({ envelope }) => envelope.payload.id === careerSnapshot.id)
      .sort(compareCandidates)[0];
    if (
      !allowReplacement &&
      latestGlobal !== undefined &&
      latestGlobal.envelope.payload.id !== careerSnapshot.id
    ) {
      return Object.freeze({ ok: false, reason: 'career_save.different_career' });
    }
    if (!allowReplacement && sameCareer !== undefined) {
      const existingRevision = sameCareer.envelope.payload.revision;
      if (existingRevision > careerSnapshot.revision) {
        return Object.freeze({ ok: false, reason: 'career_save.stale_revision' });
      }
      if (existingRevision === careerSnapshot.revision) {
        if (
          canonicalStringify(sameCareer.envelope.payload) !== canonicalStringify(careerSnapshot)
        ) {
          return Object.freeze({ ok: false, reason: 'career_save.conflicting_revision' });
        }
        if (
          !currentValidation.ok ||
          currentValidation.envelope.payload.id !== careerSnapshot.id ||
          canonicalStringify(currentValidation.envelope.payload) !==
            canonicalStringify(careerSnapshot)
        ) {
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
    const envelope = createEnvelope(careerSnapshot, this.contentVersion, createdAt, updatedAt);
    const nextSnapshotId = snapshotId(careerSnapshot, updatedAt);

    try {
      await this.storage.put('autosaveSnapshots', nextSnapshotId, envelope);
    } catch {
      return Object.freeze({
        ok: false,
        reason: 'career_save.storage_error',
        stage: 'write_snapshot',
      });
    }
    try {
      await this.storage.put('currentCareer', CURRENT_CAREER_STORAGE_ID, envelope);
    } catch {
      return Object.freeze({
        ok: false,
        reason: 'career_save.storage_error',
        stage: 'write_current',
      });
    }

    const afterWrite = new Map(snapshotEntries.map((entry) => [entry.id, entry]));
    afterWrite.set(nextSnapshotId, { id: nextSnapshotId, value: envelope });
    const classified = validatedSnapshotCandidates([...afterWrite.values()], this.contentVersion);
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
