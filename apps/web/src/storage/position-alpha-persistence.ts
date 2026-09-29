import type { PositionAlphaSessionV1, PositionAlphaSessionV2 } from '@project-saturday/game-core';
import {
  CONTENT_COMPATIBILITY_VERSION,
  parseShippedPositionAlphaSessionJson,
} from '@project-saturday/game-content';

import {
  canonicalStringify,
  computeSaveChecksum,
  type SaveChecksumFields,
} from './career-persistence';
import { ACTIVE_CAREER_KIND_STORAGE_ID, type ActiveCareerKind } from './career-selection';
export { ACTIVE_CAREER_KIND_STORAGE_ID, type ActiveCareerKind } from './career-selection';
import {
  CAREER_STORAGE_LOCK_NAME,
  type SaveEnvelope,
  type StorageAdapter,
  type StorageEntry,
} from './storage';

export const POSITION_ALPHA_SAVE_VERSION = 1 as const;
export const POSITION_ALPHA_STORAGE_ID = 'position-alpha-active' as const;
export const POSITION_ALPHA_SNAPSHOT_RETENTION = 30 as const;
export const POSITION_ALUMNI_STORAGE_PREFIX = 'position-alumni:' as const;

export type SavePositionAlphaResult<TPayload = PositionAlphaSessionV1> =
  | { readonly ok: true; readonly envelope: SaveEnvelope<TPayload> }
  | {
      readonly ok: false;
      readonly reason:
        | 'position_alpha_save.invalid_session'
        | 'position_alpha_save.stale_revision'
        | 'position_alpha_save.conflicting_revision'
        | 'position_alpha_save.different_career'
        | 'position_alpha_save.invalid_clock'
        | 'position_alpha_save.storage_error';
    };

export type LoadPositionAlphaResult<TSession = PositionAlphaSessionV1, TPayload = TSession> =
  | {
      readonly ok: true;
      readonly session: TSession;
      readonly envelope: SaveEnvelope<TPayload>;
      readonly source: 'current' | 'snapshot';
      readonly recovered: boolean;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'position_alpha_load.not_found'
        | 'position_alpha_load.no_valid_save'
        | 'position_alpha_load.storage_error';
    };

export interface PositionAlphaPersistenceOptions {
  readonly now?: () => Date;
}

export interface DecodedPositionAlphaEnvelope<TSession, TPayload> {
  readonly session: TSession;
  readonly envelope: SaveEnvelope<TPayload>;
}

export interface PreparedPositionAlphaSnapshot<TSession, TPayload> {
  readonly session: TSession;
  readonly payload: TPayload;
}

/** Version-specific validation/encoding; the transaction and ownership rules are shared. */
export interface PositionAlphaPersistenceCodec<TSession, TPayload> {
  readonly saveVersion: number;
  readonly snapshot: (
    session: TSession,
  ) => PreparedPositionAlphaSnapshot<TSession, TPayload> | null;
  readonly readEnvelope: (
    value: unknown,
  ) => DecodedPositionAlphaEnvelope<TSession, TPayload> | null;
  readonly makeEnvelope: (
    snapshot: PreparedPositionAlphaSnapshot<TSession, TPayload>,
    createdAt: string,
    updatedAt: string,
  ) => SaveEnvelope<TPayload> | null;
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

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value;
}

export function validatePositionAlphaEnvelope(
  value: unknown,
): SaveEnvelope<PositionAlphaSessionV1> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const envelope = value as Partial<SaveEnvelope<unknown>>;
  if (
    Object.keys(envelope).sort().join('|') !==
      ['checksum', 'contentVersion', 'createdAt', 'payload', 'saveVersion', 'updatedAt']
        .sort()
        .join('|') ||
    envelope.saveVersion !== POSITION_ALPHA_SAVE_VERSION ||
    envelope.contentVersion !== String(CONTENT_COMPATIBILITY_VERSION) ||
    !canonicalTimestamp(envelope.createdAt) ||
    !canonicalTimestamp(envelope.updatedAt) ||
    typeof envelope.checksum !== 'string' ||
    envelope.checksum !== computeSaveChecksum(checksumFields(envelope as SaveEnvelope<unknown>))
  ) {
    return null;
  }
  const session = parseShippedPositionAlphaSessionJson(JSON.stringify(envelope.payload));
  return session === null
    ? null
    : {
        saveVersion: POSITION_ALPHA_SAVE_VERSION,
        contentVersion: String(CONTENT_COMPATIBILITY_VERSION),
        createdAt: envelope.createdAt,
        updatedAt: envelope.updatedAt,
        checksum: envelope.checksum,
        payload: session,
      };
}

function makeEnvelope(
  session: PositionAlphaSessionV1,
  createdAt: string,
  updatedAt: string,
): SaveEnvelope<PositionAlphaSessionV1> {
  const fields = {
    saveVersion: POSITION_ALPHA_SAVE_VERSION,
    contentVersion: String(CONTENT_COMPATIBILITY_VERSION),
    createdAt,
    updatedAt,
    payload: session,
  } as const;
  return { ...fields, checksum: computeSaveChecksum(fields) };
}

function snapshotId(
  envelope: SaveEnvelope<unknown>,
  session: PositionAlphaSessionV1 | PositionAlphaSessionV2,
): string {
  return `position-alpha:${session.lifecycle.careerId}:${String(session.revision).padStart(6, '0')}:${envelope.updatedAt}`;
}

export class PositionAlphaPersistenceEngine<
  TSession extends PositionAlphaSessionV1 | PositionAlphaSessionV2,
  TPayload,
> {
  private readonly now: () => Date;

  public constructor(
    private readonly storage: StorageAdapter,
    private readonly codec: PositionAlphaPersistenceCodec<TSession, TPayload>,
    options: PositionAlphaPersistenceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
  }

  public saveSession(
    session: TSession,
    replace = false,
  ): Promise<SavePositionAlphaResult<TPayload>> {
    const prepared = this.codec.snapshot(session);
    if (prepared === null) {
      return Promise.resolve({ ok: false, reason: 'position_alpha_save.invalid_session' });
    }
    const snapshot = prepared.session;
    return this.storage.runExclusive(CAREER_STORAGE_LOCK_NAME, async () => {
      try {
        const activeKind = await this.storage.get<ActiveCareerKind>(
          'settings',
          ACTIVE_CAREER_KIND_STORAGE_ID,
        );
        if (!replace && (activeKind === 'NONE' || activeKind === 'WR')) {
          return { ok: false, reason: 'position_alpha_save.different_career' } as const;
        }
        const timestamp = this.now();
        if (!Number.isFinite(timestamp.valueOf())) {
          return { ok: false, reason: 'position_alpha_save.invalid_clock' } as const;
        }
        const updatedAt = timestamp.toISOString();
        const stored = await this.storage.get<unknown>('currentCareer', POSITION_ALPHA_STORAGE_ID);
        if (
          typeof stored === 'object' &&
          stored !== null &&
          'saveVersion' in stored &&
          typeof stored.saveVersion === 'number' &&
          stored.saveVersion > this.codec.saveVersion
        )
          return { ok: false, reason: 'position_alpha_save.conflicting_revision' } as const;
        const current = stored === undefined ? null : this.codec.readEnvelope(stored);
        if (current !== null && !replace) {
          if (current.session.lifecycle.careerId !== snapshot.lifecycle.careerId) {
            return { ok: false, reason: 'position_alpha_save.different_career' } as const;
          }
          if (snapshot.revision < current.session.revision) {
            return { ok: false, reason: 'position_alpha_save.stale_revision' } as const;
          }
          if (snapshot.revision === current.session.revision) {
            return { ok: false, reason: 'position_alpha_save.conflicting_revision' } as const;
          }
        }
        const createdAt = replace || current === null ? updatedAt : current.envelope.createdAt;
        const envelope = this.codec.makeEnvelope(prepared, createdAt, updatedAt);
        if (envelope === null)
          return { ok: false, reason: 'position_alpha_save.invalid_session' } as const;
        let archiveAlreadyPresent = false;
        if (snapshot.phase.type === 'CAREER_COMPLETE') {
          const archived = await this.storage.get<unknown>(
            'profile',
            `${POSITION_ALUMNI_STORAGE_PREFIX}${snapshot.lifecycle.careerId}`,
          );
          if (archived !== undefined) {
            const validArchive = this.codec.readEnvelope(archived);
            if (
              validArchive === null ||
              canonicalStringify(validArchive.session) !== canonicalStringify(snapshot)
            ) {
              return { ok: false, reason: 'position_alpha_save.conflicting_revision' } as const;
            }
            archiveAlreadyPresent = true;
          }
        }
        const writes = [
          {
            storeName: 'currentCareer' as const,
            id: POSITION_ALPHA_STORAGE_ID,
            value: envelope,
          },
          {
            storeName: 'settings' as const,
            id: ACTIVE_CAREER_KIND_STORAGE_ID,
            value: 'POSITION_ALPHA' satisfies ActiveCareerKind,
          },
          ...(snapshot.phase.type === 'CAREER_COMPLETE' && !archiveAlreadyPresent
            ? [
                {
                  storeName: 'profile' as const,
                  id: `${POSITION_ALUMNI_STORAGE_PREFIX}${snapshot.lifecycle.careerId}`,
                  value: envelope,
                },
              ]
            : []),
          ...(current === null
            ? []
            : [
                {
                  storeName: 'autosaveSnapshots' as const,
                  id: snapshotId(current.envelope, current.session),
                  value: current.envelope,
                },
              ]),
        ];
        const snapshotIds = new Set(
          (await this.storage.list<unknown>('autosaveSnapshots'))
            .filter(({ id }) => id.startsWith(`position-alpha:${snapshot.lifecycle.careerId}:`))
            .map(({ id }) => id),
        );
        for (const write of writes)
          if (write.storeName === 'autosaveSnapshots') snapshotIds.add(write.id);
        const deletes = [...snapshotIds]
          .sort((left, right) => right.localeCompare(left))
          .slice(POSITION_ALPHA_SNAPSHOT_RETENTION)
          .map((id) => ({ storeName: 'autosaveSnapshots' as const, id }));
        const deletedIds = new Set(deletes.map(({ id }) => id));
        await this.storage.putMany(
          writes.filter(
            ({ storeName, id }) => storeName !== 'autosaveSnapshots' || !deletedIds.has(id),
          ),
          [],
          deletes,
        );
        return { ok: true, envelope } as const;
      } catch {
        return { ok: false, reason: 'position_alpha_save.storage_error' } as const;
      }
    });
  }

  public async loadSession(): Promise<LoadPositionAlphaResult<TSession, TPayload>> {
    try {
      const currentValue = await this.storage.get<unknown>(
        'currentCareer',
        POSITION_ALPHA_STORAGE_ID,
      );
      const current = currentValue === undefined ? null : this.codec.readEnvelope(currentValue);
      if (current !== null) {
        return {
          ok: true,
          session: current.session,
          envelope: current.envelope,
          source: 'current',
          recovered: false,
        };
      }
      const snapshots = await this.storage.list<unknown>('autosaveSnapshots');
      const valid = snapshots
        .filter(({ id }) => id.startsWith('position-alpha:'))
        .map((entry): StorageEntry<DecodedPositionAlphaEnvelope<TSession, TPayload>> | null => {
          const envelope = this.codec.readEnvelope(entry.value);
          return envelope === null ? null : { id: entry.id, value: envelope };
        })
        .filter(
          (entry): entry is StorageEntry<DecodedPositionAlphaEnvelope<TSession, TPayload>> =>
            entry !== null,
        )
        .sort(
          (left, right) =>
            right.value.session.revision - left.value.session.revision ||
            right.value.envelope.updatedAt.localeCompare(left.value.envelope.updatedAt),
        );
      const recovered = valid[0]?.value;
      if (recovered !== undefined) {
        return {
          ok: true,
          session: recovered.session,
          envelope: recovered.envelope,
          source: 'snapshot',
          recovered: true,
        };
      }
      return {
        ok: false,
        reason:
          currentValue === undefined &&
          snapshots.every(({ id }) => !id.startsWith('position-alpha:'))
            ? 'position_alpha_load.not_found'
            : 'position_alpha_load.no_valid_save',
      };
    } catch {
      return { ok: false, reason: 'position_alpha_load.storage_error' };
    }
  }
}

const legacyCodec: PositionAlphaPersistenceCodec<PositionAlphaSessionV1, PositionAlphaSessionV1> = {
  saveVersion: POSITION_ALPHA_SAVE_VERSION,
  snapshot: (session) => {
    const snapshot = parseShippedPositionAlphaSessionJson(JSON.stringify(session));
    return snapshot === null ? null : { session: snapshot, payload: snapshot };
  },
  readEnvelope: (value) => {
    const envelope = validatePositionAlphaEnvelope(value);
    return envelope === null ? null : { session: envelope.payload, envelope };
  },
  makeEnvelope: (snapshot, createdAt, updatedAt) =>
    makeEnvelope(snapshot.payload, createdAt, updatedAt),
};

/** Literal v1 writer retained for historical tooling and compatibility regression fixtures. */
export class PositionAlphaPersistence extends PositionAlphaPersistenceEngine<
  PositionAlphaSessionV1,
  PositionAlphaSessionV1
> {
  public constructor(storage: StorageAdapter, options: PositionAlphaPersistenceOptions = {}) {
    super(storage, legacyCodec, options);
  }
}
