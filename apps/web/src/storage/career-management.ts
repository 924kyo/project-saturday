import type { PositionAlphaSessionV1, PositionAlphaSessionV2 } from '@project-saturday/game-core';

import {
  canonicalStringify,
  SHIPPED_CAREER_CONTENT_VERSION,
  validateCareerSaveEnvelope,
} from './career-persistence';
import { ACTIVE_CAREER_KIND_STORAGE_ID } from './career-selection';
import {
  POSITION_ALUMNI_STORAGE_PREFIX,
  validatePositionAlphaEnvelope,
  type DecodedPositionAlphaEnvelope,
} from './position-alpha-persistence';
import { decodePositionAlphaEnvelopeV3 } from './position-alpha-persistence-v3';
import {
  CAREER_STORAGE_LOCK_NAME,
  STORAGE_STORE_NAMES,
  type SaveEnvelope,
  type StorageAdapter,
  type StorageEntry,
  type StorageStoreName,
  type StorageWrite,
} from './storage';

/** Captured when a management confirmation opens; never refreshed during a retry. */
export interface CareerManagementCheckpoint {
  readonly fingerprint: string;
}

export class CareerManagementConflict extends Error {}

function activeCareerId(snapshot: StoreSnapshot): unknown {
  const selector = snapshot
    .get('settings')
    ?.find(({ id }) => id === ACTIVE_CAREER_KIND_STORAGE_ID)?.value;
  if (selector === 'NONE') return null;
  const records = snapshot.get('currentCareer') ?? [];
  const wr = records.find(({ id }) => id === 'active');
  const position = records.find(({ id }) => id === 'position-alpha-active');
  const chosen = selector === 'POSITION_ALPHA' ? position : (wr ?? position);
  if (chosen === undefined) {
    const snapshots = snapshot.get('autosaveSnapshots') ?? [];
    const wrCandidates = snapshots
      .flatMap(({ value }) => {
        const parsed = validateCareerSaveEnvelope(value, SHIPPED_CAREER_CONTENT_VERSION);
        return parsed.ok ? [parsed.envelope] : [];
      })
      .sort(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) ||
          right.payload.career.revision - left.payload.career.revision,
      );
    const positionCandidates = snapshots
      .flatMap(({ id, value }) => {
        const parsed = id.startsWith('position-alpha:')
          ? decodePositionAlphaEnvelopeV3(value)
          : null;
        return parsed === null ? [] : [parsed];
      })
      .sort(
        (left, right) =>
          right.session.revision - left.session.revision ||
          right.envelope.updatedAt.localeCompare(left.envelope.updatedAt),
      );
    return selector === 'POSITION_ALPHA'
      ? (positionCandidates[0]?.session.lifecycle.careerId ?? null)
      : (wrCandidates[0]?.payload.career.id ??
          positionCandidates[0]?.session.lifecycle.careerId ??
          null);
  }
  const envelope = chosen.value;
  if (typeof envelope !== 'object' || envelope === null || !('payload' in envelope))
    return undefined;
  let payload = envelope.payload;
  // Identity only, not a validity claim: a corrupt current save can still be retired
  // after snapshot recovery. The full-store fingerprint protects the confirmation.
  if (
    'saveVersion' in envelope &&
    (envelope.saveVersion === 2 || envelope.saveVersion === 3) &&
    typeof payload === 'object' &&
    payload !== null &&
    'model' in payload &&
    ((envelope.saveVersion === 2 && payload.model === 'position_alpha_session_wire_v2') ||
      (envelope.saveVersion === 3 && payload.model === 'position_alpha_session_wire_v3')) &&
    'session' in payload
  )
    payload = payload.session;
  if (typeof payload !== 'object' || payload === null) return undefined;
  if (
    'career' in payload &&
    typeof payload.career === 'object' &&
    payload.career !== null &&
    'id' in payload.career
  )
    return payload.career.id;
  if (
    'lifecycle' in payload &&
    typeof payload.lifecycle === 'object' &&
    payload.lifecycle !== null &&
    'careerId' in payload.lifecycle
  )
    return payload.lifecycle.careerId;
  return 'id' in payload ? payload.id : undefined;
}

export type CareerManagementResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: 'storage_error' | 'changed_since_confirmation' | 'protected_history';
    };

type StoreSnapshot = ReadonlyMap<StorageStoreName, readonly StorageEntry<unknown>[]>;

function fingerprint(snapshot: StoreSnapshot): string {
  return canonicalStringify([...snapshot.entries()]);
}

/** Negative filter only. Every possible completion still passes the full versioned reader. */
function couldContainPositionCompletion(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || !('payload' in value)) return true;
  let payload = value.payload;
  if (typeof payload !== 'object' || payload === null) return true;
  if (
    'model' in payload &&
    (payload.model === 'position_alpha_session_wire_v2' ||
      payload.model === 'position_alpha_session_wire_v3')
  ) {
    if (!('session' in payload)) return true;
    payload = payload.session;
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('phase' in payload) ||
    typeof payload.phase !== 'object' ||
    payload.phase === null ||
    !('type' in payload.phase)
  )
    return true;
  return payload.phase.type === 'CAREER_COMPLETE';
}

export class CareerManagementPersistence {
  public constructor(private readonly storage: StorageAdapter) {}

  public checkpoint(expected?: {
    readonly careerId: string | null;
  }): Promise<CareerManagementCheckpoint> {
    return this.storage.runExclusive(CAREER_STORAGE_LOCK_NAME, async () => {
      const snapshot = await this.readStores();
      if (expected !== undefined && activeCareerId(snapshot) !== expected.careerId) {
        throw new CareerManagementConflict('Active career changed before confirmation.');
      }
      return { fingerprint: fingerprint(snapshot) };
    });
  }

  /** Called only after explicit confirmation, or for an already completed run. */
  public retireCurrentCareer(
    checkpoint: CareerManagementCheckpoint,
  ): Promise<CareerManagementResult> {
    return this.apply(checkpoint, false);
  }

  /** The UI must obtain two separate confirmations before calling this operation. */
  public resetAllData(checkpoint: CareerManagementCheckpoint): Promise<CareerManagementResult> {
    return this.apply(checkpoint, true);
  }

  public async loadPositionAlumni(): Promise<{
    readonly completedSessions: readonly SaveEnvelope<PositionAlphaSessionV1>[];
    readonly invalidEntryCount: number;
  }> {
    const entries = await this.storage.list<unknown>('profile');
    const completedSessions: SaveEnvelope<PositionAlphaSessionV1>[] = [];
    let invalidEntryCount = 0;
    for (const entry of entries) {
      if (!entry.id.startsWith(POSITION_ALUMNI_STORAGE_PREFIX)) continue;
      const envelope = validatePositionAlphaEnvelope(entry.value);
      if (
        envelope === null ||
        envelope.payload.phase.type !== 'CAREER_COMPLETE' ||
        entry.id !== `${POSITION_ALUMNI_STORAGE_PREFIX}${envelope.payload.lifecycle.careerId}`
      ) {
        invalidEntryCount += 1;
      } else {
        completedSessions.push(envelope);
      }
    }
    return { completedSessions, invalidEntryCount };
  }

  private async readStores(): Promise<StoreSnapshot> {
    const entries = await Promise.all(
      STORAGE_STORE_NAMES.map(async (name) => [name, await this.storage.list(name)] as const),
    );
    return new Map(entries);
  }

  /** Current Hub view; never rewrites the original versioned alumni proof. */
  public async loadPositionAlumniV2(): Promise<{
    readonly completedSessions: readonly DecodedPositionAlphaEnvelope<
      PositionAlphaSessionV2,
      unknown
    >[];
    readonly invalidEntryCount: number;
  }> {
    const completedSessions: DecodedPositionAlphaEnvelope<PositionAlphaSessionV2, unknown>[] = [];
    let invalidEntryCount = 0;
    for (const entry of await this.storage.list<unknown>('profile')) {
      if (!entry.id.startsWith(POSITION_ALUMNI_STORAGE_PREFIX)) continue;
      const decoded = decodePositionAlphaEnvelopeV3(entry.value);
      if (
        decoded === null ||
        decoded.session.phase.type !== 'CAREER_COMPLETE' ||
        entry.id !== `${POSITION_ALUMNI_STORAGE_PREFIX}${decoded.session.lifecycle.careerId}`
      ) {
        invalidEntryCount += 1;
      } else completedSessions.push(decoded);
    }
    return { completedSessions, invalidEntryCount };
  }

  private async apply(
    checkpoint: CareerManagementCheckpoint,
    reset: boolean,
  ): Promise<CareerManagementResult> {
    try {
      return await this.storage.runExclusive(CAREER_STORAGE_LOCK_NAME, async () => {
        const snapshot = await this.readStores();
        if (fingerprint(snapshot) !== checkpoint.fingerprint) {
          return { ok: false, reason: 'changed_since_confirmation' } as const;
        }
        const writes: StorageWrite[] = [
          { storeName: 'settings', id: ACTIVE_CAREER_KIND_STORAGE_ID, value: 'NONE' },
        ];
        if (!reset) {
          // Keep the exact versioned completion proof, including its already-earned meta.
          // This also retains completions saved before the dedicated alumni namespace existed.
          const archived = new Map<
            string,
            DecodedPositionAlphaEnvelope<PositionAlphaSessionV2, unknown>
          >();
          for (const { value } of [
            ...(snapshot.get('currentCareer') ?? []),
            ...(snapshot.get('autosaveSnapshots') ?? []),
          ]) {
            // A rolling pre-completion snapshot cannot contain an earned alumni proof.
            // Avoid replaying up to thirty complete careers just to discover that fact.
            if (!couldContainPositionCompletion(value)) continue;
            const decoded = decodePositionAlphaEnvelopeV3(value);
            if (decoded?.session.phase.type !== 'CAREER_COMPLETE') continue;
            const id = `${POSITION_ALUMNI_STORAGE_PREFIX}${decoded.session.lifecycle.careerId}`;
            const existing = (snapshot.get('profile') ?? []).find((entry) => entry.id === id);
            const pending = archived.get(id);
            if (existing !== undefined || pending !== undefined) {
              const saved =
                existing === undefined ? pending : decodePositionAlphaEnvelopeV3(existing.value);
              if (
                saved == null ||
                canonicalStringify(saved.session) !== canonicalStringify(decoded.session)
              ) {
                return { ok: false, reason: 'protected_history' } as const;
              }
            } else {
              archived.set(id, decoded);
            }
          }
          for (const [id, value] of archived)
            writes.push({ storeName: 'profile', id, value: value.envelope });
        }
        await this.storage.putMany(
          writes,
          reset ? STORAGE_STORE_NAMES : ['currentCareer', 'autosaveSnapshots'],
        );
        return { ok: true } as const;
      });
    } catch {
      return { ok: false, reason: 'storage_error' };
    }
  }
}
